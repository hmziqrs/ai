// Black-box acceptance probe for the R4 backend in harness/zcode/skills/shipflow/references/
// test-playbook.md: a to-do API with email login whose dummy mailer prints
// "MAIL to=<email> code=<code>" to the terminal. The probe starts the app with `bun run start`,
// reads each login code from the app's stdout, checks every contract rule over HTTP, restarts the
// app to check persistence, and runs the app's own `bun test`. Run from the repository root:
//   bun harness/zcode/scripts/probe-todo-backend.mjs --app <dir>             probe a local checkout
//   bun harness/zcode/scripts/probe-todo-backend.mjs --gh-repo <owner/name>  probe a fresh clone of
//                                                                            the default branch
//   bun harness/zcode/scripts/probe-todo-backend.mjs --self-test             reference app, faults
// Options: --skip-tests skips `bun test`; --json prints the summary as JSON.
// Exit 0 when every check passes, 1 when a check fails, 2 when the app cannot be probed.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REFERENCE = join(HERE, "fixtures", "todo-backend");
const CODE_TTL_SECONDS = 2;
const MAIL_LINE = /MAIL\b[^\n]*?\bto=(\S+)[^\n]*?\bcode=(\d{6})\b/;
const USER_A = "probe-a@example.test";
const USER_B = "probe-b@example.test";

// Each fault in the reference app, and the probe check that must fail because of it.
const FAULTS = {
  "silent-mailer": "mail-printed",
  "reusable-code": "verify-reused-code",
  "no-expiry": "code-expiry",
  "logout-noop": "token-after-logout",
  "cross-user": "isolation-patch",
  "memory-db": "persistence",
};

class ProbeError extends Error {}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function freePort() {
  const server = Bun.serve({ port: 0, fetch: () => new Response(null) });
  const port = server.port;
  server.stop(true);
  return port;
}

// One app process. Its stdout and stderr are kept as lines; mail() scans for a new MAIL line.
class App {
  constructor(dir, env) {
    this.dir = dir;
    this.env = env;
    this.lines = [];
    this.port = freePort();
  }

  async start() {
    this.child = spawn("bun", ["run", "start"], {
      cwd: this.dir,
      detached: true,
      env: { ...process.env, ...this.env, PORT: String(this.port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let partial = "";
    const take = (chunk) => {
      const text = partial + chunk.toString("utf8");
      const parts = text.split("\n");
      partial = parts.pop() ?? "";
      this.lines.push(...parts);
    };
    this.child.stdout.on("data", take);
    this.child.stderr.on("data", take);
    this.exited = new Promise((done) => this.child.on("exit", (code) => done(code)));
    for (let i = 0; i < 100; i++) {
      const res = await this.call("GET", "/health").catch(() => null);
      if (res && res.status === 200) return true;
      if (this.child.exitCode !== null) break;
      await sleep(200);
    }
    return false;
  }

  async stop() {
    if (!this.child || this.child.exitCode !== null) return;
    try {
      process.kill(-this.child.pid, "SIGTERM");
    } catch {
      return;
    }
    const exited = await Promise.race([this.exited.then(() => true), sleep(3000).then(() => false)]);
    if (!exited) {
      try {
        process.kill(-this.child.pid, "SIGKILL");
      } catch {}
    }
  }

  async call(method, path, { token, body } = {}) {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(`http://127.0.0.1:${this.port}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {}
    return { status: res.status, json, text };
  }

  // The code from the first MAIL line for this email printed after line index `from`.
  async mail(email, from, timeoutMs = 3000) {
    for (let waited = 0; waited <= timeoutMs; waited += 50) {
      for (let i = from; i < this.lines.length; i++) {
        const match = MAIL_LINE.exec(this.lines[i]);
        if (match && match[1] === email) return match[2];
      }
      await sleep(50);
    }
    return null;
  }

  tail(count = 20) {
    return this.lines.slice(-count).join("\n");
  }
}

function prepare(dir) {
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) throw new ProbeError(`no package.json in ${dir}`);
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  if (!pkg.scripts || !pkg.scripts.start) throw new ProbeError("package.json has no start script");
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  if (deps.length > 0 && !existsSync(join(dir, "node_modules"))) {
    const install = spawnSync("bun", ["install"], { cwd: dir, encoding: "utf8", timeout: 300000 });
    if (install.status !== 0) throw new ProbeError(`bun install failed: ${(install.stderr || "").trim().slice(-400)}`);
  }
}

// Runs every check against the app in `dir`. Returns the list of { name, pass, detail }.
export async function probe(dir, { env = {}, skipTests = false } = {}) {
  prepare(dir);
  const scratch = mkdtempSync(join(tmpdir(), "todo-probe-"));
  const appEnv = { ...env, DB_PATH: join(scratch, "probe.sqlite"), LOGIN_CODE_TTL_SECONDS: String(CODE_TTL_SECONDS) };
  const results = [];
  const check = (name, pass, detail = "") => {
    results.push({ name, pass: Boolean(pass), detail: pass ? "" : detail });
    return Boolean(pass);
  };
  const got = (res) => `got ${res.status} ${res.text.slice(0, 160)}`;

  let app = new App(dir, appEnv);
  try {
    if (!(await app.start())) throw new ProbeError(`app did not answer GET /health on port ${app.port}\n${app.tail()}`);
    check("health", true);

    const login = async (email) => {
      const from = app.lines.length;
      const res = await app.call("POST", "/auth/request", { body: { email } });
      if (res.status !== 202) return null;
      const code = await app.mail(email, from);
      if (!code) return null;
      const verified = await app.call("POST", "/auth/verify", { body: { email, code } });
      return verified.status === 200 && typeof verified.json?.token === "string" ? verified.json.token : null;
    };

    let res = await app.call("POST", "/auth/request", { body: { email: "not-an-email" } });
    check("request-bad-email", res.status === 400, `want 400, ${got(res)}`);

    let from = app.lines.length;
    res = await app.call("POST", "/auth/request", { body: { email: USER_A } });
    check("request-code", res.status === 202, `want 202, ${got(res)}`);
    const codeA = await app.mail(USER_A, from);
    check("mail-printed", codeA !== null, `no "MAIL to=${USER_A} code=<6 digits>" line on stdout; last lines:\n${app.tail(5)}`);

    const wrong = String((Number(codeA ?? "0") + 1) % 1000000).padStart(6, "0");
    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: wrong } });
    check("verify-wrong-code", res.status === 401, `want 401, ${got(res)}`);

    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: codeA ?? "" } });
    const tokenA = res.status === 200 && typeof res.json?.token === "string" ? res.json.token : null;
    check("verify-code", tokenA !== null, `want 200 with a token, ${got(res)}`);
    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: codeA ?? "" } });
    check("verify-reused-code", codeA !== null && res.status === 401, `want 401, ${got(res)}`);

    res = await app.call("GET", "/todos");
    check("todos-no-token", res.status === 401, `want 401, ${got(res)}`);
    res = await app.call("GET", "/todos", { token: "not-a-real-token" });
    check("todos-bad-token", res.status === 401, `want 401, ${got(res)}`);

    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "buy milk" } });
    const first = res.json;
    check(
      "create-todo",
      res.status === 201 && first?.id !== undefined && first?.title === "buy milk" && first?.done === false,
      `want 201 {id,title:"buy milk",done:false}, ${got(res)}`,
    );
    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "" } });
    check("create-empty-title", res.status === 400, `want 400, ${got(res)}`);
    res = await app.call("POST", "/todos", { token: tokenA, body: {} });
    check("create-missing-title", res.status === 400, `want 400, ${got(res)}`);
    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "walk dog" } });
    check("create-second-todo", res.status === 201 && res.json?.title === "walk dog", `want 201, ${got(res)}`);

    res = await app.call("GET", "/todos", { token: tokenA });
    const titles = Array.isArray(res.json) ? res.json.map((t) => t.title) : null;
    check(
      "list-todos",
      res.status === 200 && JSON.stringify(titles) === JSON.stringify(["buy milk", "walk dog"]),
      `want 200 ["buy milk","walk dog"] oldest first, ${got(res)}`,
    );

    const id = first?.id;
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenA, body: { done: true } });
    check("patch-done", res.status === 200 && res.json?.done === true, `want 200 done:true, ${got(res)}`);
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenA, body: { title: "buy oat milk" } });
    check(
      "patch-title",
      res.status === 200 && res.json?.title === "buy oat milk" && res.json?.done === true,
      `want 200 title updated and done kept, ${got(res)}`,
    );

    const tokenB = await login(USER_B);
    check("login-second-user", tokenB !== null, "second user could not log in");
    res = await app.call("GET", "/todos", { token: tokenB });
    check("isolation-list", res.status === 200 && Array.isArray(res.json) && res.json.length === 0, `want 200 [], ${got(res)}`);
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenB, body: { done: false } });
    check("isolation-patch", res.status === 404, `want 404 for another user's todo, ${got(res)}`);
    res = await app.call("DELETE", `/todos/${id}`, { token: tokenB });
    check("isolation-delete", res.status === 404, `want 404 for another user's todo, ${got(res)}`);

    res = await app.call("DELETE", `/todos/${id}`, { token: tokenA });
    check("delete-todo", res.status === 204, `want 204, ${got(res)}`);
    res = await app.call("DELETE", `/todos/${id}`, { token: tokenA });
    check("delete-again", res.status === 404, `want 404, ${got(res)}`);
    res = await app.call("PATCH", "/todos/999999", { token: tokenA, body: { done: true } });
    check("unknown-id", res.status === 404, `want 404, ${got(res)}`);
    res = await app.call("GET", "/todos", { token: tokenA });
    const left = Array.isArray(res.json) ? res.json.map((t) => t.title) : null;
    check("list-after-delete", JSON.stringify(left) === JSON.stringify(["walk dog"]), `want ["walk dog"], ${got(res)}`);

    res = await app.call("POST", "/auth/logout", { token: tokenB });
    check("logout", res.status === 204, `want 204, ${got(res)}`);
    res = await app.call("GET", "/todos", { token: tokenB });
    check("token-after-logout", tokenB !== null && res.status === 401, `want 401 after logout, ${got(res)}`);

    from = app.lines.length;
    await app.call("POST", "/auth/request", { body: { email: USER_B } });
    const late = await app.mail(USER_B, from);
    await sleep(CODE_TTL_SECONDS * 1000 + 600);
    res = await app.call("POST", "/auth/verify", { body: { email: USER_B, code: late ?? "" } });
    check("code-expiry", late !== null && res.status === 401, `want 401 after LOGIN_CODE_TTL_SECONDS=${CODE_TTL_SECONDS}, ${got(res)}`);

    await app.stop();
    app = new App(dir, appEnv);
    if (!(await app.start())) throw new ProbeError(`app did not restart on the same DB_PATH\n${app.tail()}`);
    check("restart", true);
    const again = await login(USER_A);
    res = await app.call("GET", "/todos", { token: again });
    const kept = Array.isArray(res.json) ? res.json.map((t) => t.title) : null;
    check("persistence", JSON.stringify(kept) === JSON.stringify(["walk dog"]), `want ["walk dog"] after restart, ${got(res)}`);
  } finally {
    await app.stop();
    rmSync(scratch, { recursive: true, force: true });
  }

  if (!skipTests) {
    const tests = spawnSync("bun", ["test"], { cwd: dir, encoding: "utf8", timeout: 600000 });
    const out = `${tests.stdout || ""}${tests.stderr || ""}`.trim();
    check("unit-tests", tests.status === 0, `bun test exited ${tests.status}: ${out.slice(-600)}`);
  }
  return results;
}

function report(results, asJson) {
  const failed = results.filter((r) => !r.pass);
  if (asJson) {
    console.log(JSON.stringify({ ok: failed.length === 0, total: results.length, failed: failed.length, results }, null, 2));
  } else {
    for (const r of results) console.log(r.pass ? `PASS ${r.name}` : `FAIL ${r.name}: ${r.detail}`);
    console.log(`${results.length - failed.length}/${results.length} checks passed`);
  }
  return failed.length === 0 ? 0 : 1;
}

async function selfTest() {
  const clean = await probe(REFERENCE, { skipTests: true });
  const broken = clean.filter((r) => !r.pass);
  if (broken.length > 0) {
    for (const r of broken) console.log(`FAIL reference ${r.name}: ${r.detail}`);
    return 1;
  }
  let missed = 0;
  for (const [fault, expected] of Object.entries(FAULTS)) {
    const results = await probe(REFERENCE, { skipTests: true, env: { TODO_REFERENCE_FAULT: fault } });
    const failed = results.filter((r) => !r.pass).map((r) => r.name);
    if (failed.includes(expected)) {
      console.log(`fault ${fault}: detected by ${expected}`);
    } else {
      console.log(`fault ${fault}: MISSED, want ${expected} to fail, failed [${failed.join(", ")}]`);
      missed++;
    }
  }
  if (missed > 0) return 1;
  console.log(`probe self-test: reference passes ${clean.length} checks; ${Object.keys(FAULTS).length} faults detected`);
  return 0;
}

async function main(argv) {
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  if (flag("--self-test")) return selfTest();
  const app = value("--app");
  const repo = value("--gh-repo");
  if (!app === !repo) throw new ProbeError("pass exactly one of --app <dir> or --gh-repo <owner/name>");
  let dir = app ? resolve(app) : null;
  let clone = null;
  if (repo) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new ProbeError(`--gh-repo must be owner/name, got ${repo}`);
    clone = mkdtempSync(join(tmpdir(), "todo-probe-clone-"));
    dir = join(clone, "app");
    const cloned = spawnSync("gh", ["repo", "clone", repo, dir, "--", "--depth", "1"], { encoding: "utf8", timeout: 120000 });
    if (cloned.status !== 0) throw new ProbeError(`gh repo clone failed: ${(cloned.stderr || "").trim().slice(-400)}`);
    const head = spawnSync("git", ["-C", dir, "log", "-1", "--format=%h %s"], { encoding: "utf8" });
    console.log(`probing ${repo} at ${(head.stdout || "").trim()}`);
  }
  try {
    return report(await probe(dir, { skipTests: flag("--skip-tests") }), flag("--json"));
  } finally {
    if (clone) rmSync(clone, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof ProbeError ? `probe: ${error.message}` : error);
      process.exit(2);
    },
  );
}
