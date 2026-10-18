// Black-box acceptance probe for the R4 backend in harness/zcode/skills/shipflow/references/
// test-playbook.md: a to-do API with email login whose dummy mailer prints
// "MAIL to=<email> code=<code>" to the terminal. The probe starts the app with `bun run start`,
// reads each login code from the app's stdout, checks each behaviour over HTTP, restarts the app to
// check persistence, and runs the app's own `bun test`. The PRD chooses exact status codes and
// field names, so each check accepts the reasonable choices (401 or 403, done or completed, a bare
// or wrapped body). Run from the repository root:
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
const MAIL_LINE = /MAIL\b[^\n]*?\bto=(\S+)[^\n]*?\bcode=([A-Za-z0-9-]+)/;
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

// Status classes a PRD may reasonably choose; the probe checks behaviour, not one exact contract.
const OK = (status) => status >= 200 && status < 300;
const one = (...codes) => (status) => codes.includes(status);
const INVALID = one(400, 422);
const DENIED = one(400, 401, 403);
const UNAUTHORIZED = one(401, 403);
const HIDDEN = one(403, 404);
const GONE = one(404, 410);

// A token under the usual names, at the top level or under `data`.
function tokenOf(json) {
  for (const box of [json, json?.data]) {
    for (const key of ["token", "accessToken", "access_token", "sessionToken"]) {
      if (typeof box?.[key] === "string" && box[key] !== "") return box[key];
    }
  }
  return null;
}

// A to-do object, bare or wrapped in `todo` or `data`.
function todoOf(json) {
  for (const box of [json?.todo, json?.data, json]) {
    if (box && typeof box === "object" && !Array.isArray(box) && "title" in box) return box;
  }
  return null;
}

// A to-do list, bare or wrapped in `todos`, `data` or `items`.
function listOf(json) {
  for (const box of [json, json?.todos, json?.data, json?.items]) {
    if (Array.isArray(box)) return box;
  }
  return null;
}

// A different code of the same shape, for the wrong-code check.
function wrongCode(code) {
  if (/^\d+$/.test(code)) return String((Number(code) + 1) % 10 ** code.length).padStart(code.length, "0");
  return `${code}x`;
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
      if (!OK(res.status)) return null;
      const code = await app.mail(email, from);
      if (!code) return null;
      return tokenOf((await app.call("POST", "/auth/verify", { body: { email, code } })).json);
    };
    const titles = async (token) => {
      const list = listOf((await app.call("GET", "/todos", { token })).json);
      return list === null ? null : list.map((t) => t.title).sort();
    };

    let res = await app.call("POST", "/auth/request", { body: { email: "not-an-email" } });
    check("request-bad-email", INVALID(res.status), `want 400 or 422, ${got(res)}`);

    let from = app.lines.length;
    res = await app.call("POST", "/auth/request", { body: { email: USER_A } });
    check("request-code", OK(res.status), `want 2xx, ${got(res)}`);
    const codeA = await app.mail(USER_A, from);
    check("mail-printed", codeA !== null, `no "MAIL to=${USER_A} code=<code>" line on stdout; last lines:\n${app.tail(5)}`);

    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: wrongCode(codeA ?? "000000") } });
    check("verify-wrong-code", DENIED(res.status), `want 400, 401 or 403, ${got(res)}`);

    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: codeA ?? "" } });
    const tokenA = OK(res.status) ? tokenOf(res.json) : null;
    check("verify-code", tokenA !== null, `want 2xx with a token, ${got(res)}`);
    res = await app.call("POST", "/auth/verify", { body: { email: USER_A, code: codeA ?? "" } });
    check("verify-reused-code", codeA !== null && DENIED(res.status), `want 400, 401 or 403, ${got(res)}`);

    res = await app.call("GET", "/todos");
    check("todos-no-token", UNAUTHORIZED(res.status), `want 401 or 403, ${got(res)}`);
    res = await app.call("GET", "/todos", { token: "not-a-real-token" });
    check("todos-bad-token", UNAUTHORIZED(res.status), `want 401 or 403, ${got(res)}`);

    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "buy milk" } });
    const first = todoOf(res.json);
    const doneKey = first !== null && "completed" in first && !("done" in first) ? "completed" : "done";
    check(
      "create-todo",
      OK(res.status) && first?.id !== undefined && first?.title === "buy milk" && first?.[doneKey] === false,
      `want 2xx with {id, title:"buy milk", done or completed false}, ${got(res)}`,
    );
    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "" } });
    check("create-empty-title", INVALID(res.status), `want 400 or 422, ${got(res)}`);
    res = await app.call("POST", "/todos", { token: tokenA, body: {} });
    check("create-missing-title", INVALID(res.status), `want 400 or 422, ${got(res)}`);
    res = await app.call("POST", "/todos", { token: tokenA, body: { title: "walk dog" } });
    check("create-second-todo", OK(res.status) && todoOf(res.json)?.title === "walk dog", `want 2xx, ${got(res)}`);

    let listed = await titles(tokenA);
    check("list-todos", JSON.stringify(listed) === JSON.stringify(["buy milk", "walk dog"]), `want both titles, got ${JSON.stringify(listed)}`);

    const id = first?.id;
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenA, body: { [doneKey]: true } });
    let after = listOf((await app.call("GET", "/todos", { token: tokenA })).json)?.find((t) => t.id === id);
    check("patch-done", OK(res.status) && after?.[doneKey] === true, `want 2xx and ${doneKey} true, ${got(res)}`);
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenA, body: { title: "buy oat milk" } });
    after = listOf((await app.call("GET", "/todos", { token: tokenA })).json)?.find((t) => t.id === id);
    check(
      "patch-title",
      OK(res.status) && after?.title === "buy oat milk" && after?.[doneKey] === true,
      `want 2xx, title updated and ${doneKey} kept, ${got(res)}`,
    );

    const tokenB = await login(USER_B);
    check("login-second-user", tokenB !== null, "second user could not log in");
    listed = await titles(tokenB);
    check("isolation-list", Array.isArray(listed) && listed.length === 0, `want an empty list, got ${JSON.stringify(listed)}`);
    res = await app.call("PATCH", `/todos/${id}`, { token: tokenB, body: { [doneKey]: false } });
    check("isolation-patch", HIDDEN(res.status), `want 403 or 404 for another user's todo, ${got(res)}`);
    res = await app.call("DELETE", `/todos/${id}`, { token: tokenB });
    check("isolation-delete", HIDDEN(res.status), `want 403 or 404 for another user's todo, ${got(res)}`);

    res = await app.call("DELETE", `/todos/${id}`, { token: tokenA });
    check("delete-todo", OK(res.status), `want 2xx, ${got(res)}`);
    res = await app.call("DELETE", `/todos/${id}`, { token: tokenA });
    check("delete-again", GONE(res.status), `want 404 or 410, ${got(res)}`);
    res = await app.call("PATCH", "/todos/999999", { token: tokenA, body: { [doneKey]: true } });
    check("unknown-id", GONE(res.status), `want 404 or 410, ${got(res)}`);
    listed = await titles(tokenA);
    check("list-after-delete", JSON.stringify(listed) === JSON.stringify(["walk dog"]), `want ["walk dog"], got ${JSON.stringify(listed)}`);

    res = await app.call("POST", "/auth/logout", { token: tokenB });
    check("logout", OK(res.status), `want 2xx, ${got(res)}`);
    res = await app.call("GET", "/todos", { token: tokenB });
    check("token-after-logout", tokenB !== null && UNAUTHORIZED(res.status), `want 401 or 403 after logout, ${got(res)}`);

    from = app.lines.length;
    await app.call("POST", "/auth/request", { body: { email: USER_B } });
    const late = await app.mail(USER_B, from);
    await sleep(CODE_TTL_SECONDS * 1000 + 600);
    res = await app.call("POST", "/auth/verify", { body: { email: USER_B, code: late ?? "" } });
    check("code-expiry", late !== null && DENIED(res.status), `want 400, 401 or 403 after LOGIN_CODE_TTL_SECONDS=${CODE_TTL_SECONDS}, ${got(res)}`);

    await app.stop();
    app = new App(dir, appEnv);
    if (!(await app.start())) throw new ProbeError(`app did not restart on the same DB_PATH\n${app.tail()}`);
    check("restart", true);
    listed = await titles(await login(USER_A));
    check("persistence", JSON.stringify(listed) === JSON.stringify(["walk dog"]), `want ["walk dog"] after restart, got ${JSON.stringify(listed)}`);
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
