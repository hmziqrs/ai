// Smoke probe for a web or fullstack app: it installs the dependencies, runs the build, check, typecheck,
// lint and test scripts that exist, starts `bun run start` on a free port, and fetches the page. The app's
// own tests and the acceptance gate judge behaviour; this probe judges that the app builds, runs its
// checks, boots and serves an HTML page. Run from the repository root:
//   bun harness/zcode/scripts/probe-app.mjs --app <dir>             probe a local checkout
//   bun harness/zcode/scripts/probe-app.mjs --gh-repo <owner/name>  probe a fresh clone of the default branch
//   bun harness/zcode/scripts/probe-app.mjs --self-test             reference app and two injected faults
// Exit 0 when every check passes, 1 when a check fails, 2 when the app cannot be probed.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REFERENCE = join(HERE, "fixtures", "todo-web");
const CHECK_SCRIPTS = ["build", "check", "typecheck", "lint", "test"];
const FAULTS = { "build-fails": "script build", "page-500": "page served" };

class ProbeError extends Error {}
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

function freePort() {
  const server = Bun.serve({ port: 0, fetch: () => new Response(null) });
  const port = server.port;
  server.stop(true);
  return port;
}

function runScript(dir, name, env) {
  const run = spawnSync("bun", ["run", name], { cwd: dir, env, encoding: "utf8", timeout: 600000 });
  return { exitCode: run.status, out: `${run.stdout || ""}${run.stderr || ""}`.trim() };
}

// Starts `bun run start`, waits for the first answer, then checks the page twice, a second apart.
async function servePage(dir, env) {
  const port = freePort();
  const child = spawn("bun", ["run", "start"], {
    cwd: dir, detached: true, env: { ...env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (chunk) => { log += chunk.toString("utf8"); });
  child.stderr.on("data", (chunk) => { log += chunk.toString("utf8"); });
  const stop = () => {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
  };
  const fetchPage = async () => {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) });
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
  };
  try {
    let first = null;
    for (let i = 0; i < 60 && first === null; i++) {
      if (child.exitCode !== null) break;
      first = await fetchPage().catch(() => null);
      if (first === null) await sleep(500);
    }
    if (first === null) return { ok: false, detail: `no answer on port ${port}; output: ${log.slice(-400)}` };
    await sleep(2000);
    const second = await fetchPage().catch(() => null);
    const html = /<!doctype html|<html/i.test(first.body);
    const ok = first.status === 200 && html && first.type.includes("text/html") && second !== null && second.status === 200;
    return { ok, detail: `status ${first.status}, type ${first.type}, html ${html}, second ${second ? second.status : "none"}` };
  } finally {
    stop();
  }
}

export async function probe(dir, { env = {} } = {}) {
  const results = [];
  const check = (name, pass, detail = "") => {
    results.push({ name, pass: Boolean(pass), detail: pass ? "" : detail });
    return Boolean(pass);
  };
  const manifest = join(dir, "package.json");
  if (!existsSync(manifest)) throw new ProbeError(`no package.json in ${dir}`);
  const pkg = JSON.parse(readFileSync(manifest, "utf8"));
  const scripts = pkg.scripts ?? {};
  const merged = { ...process.env, ...env };
  check("start script", typeof scripts.start === "string", "package.json has no start script");
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  if (deps.length > 0 && !existsSync(join(dir, "node_modules"))) {
    const install = spawnSync("bun", ["install"], { cwd: dir, encoding: "utf8", timeout: 600000, env: merged });
    check("bun install", install.status === 0, `bun install exited ${install.status}: ${(install.stderr || "").trim().slice(-400)}`);
  }
  for (const name of CHECK_SCRIPTS) {
    if (typeof scripts[name] !== "string") continue;
    const run = runScript(dir, name, merged);
    check(`script ${name}`, run.exitCode === 0, `bun run ${name} exited ${run.exitCode}: ${run.out.slice(-400)}`);
  }
  if (typeof scripts.start === "string") {
    const page = await servePage(dir, merged).catch((error) => ({ ok: false, detail: String(error) }));
    check("page served", page.ok, page.detail);
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
  const clean = await probe(REFERENCE);
  const broken = clean.filter((r) => !r.pass);
  if (broken.length > 0) {
    for (const r of broken) console.log(`FAIL reference ${r.name}: ${r.detail}`);
    return 1;
  }
  let missed = 0;
  for (const [fault, expected] of Object.entries(FAULTS)) {
    const failed = (await probe(REFERENCE, { env: { FAULT: fault } })).filter((r) => !r.pass).map((r) => r.name);
    if (failed.includes(expected)) console.log(`fault ${fault}: detected by ${expected}`);
    else {
      console.log(`fault ${fault}: MISSED, want ${expected} to fail, failed [${failed.join(", ")}]`);
      missed++;
    }
  }
  if (missed > 0) return 1;
  console.log(`app probe self-test: reference passes ${clean.length} checks; ${Object.keys(FAULTS).length} faults detected`);
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
    clone = mkdtempSync(join(tmpdir(), "app-probe-clone-"));
    dir = join(clone, "app");
    const cloned = spawnSync("gh", ["repo", "clone", repo, dir, "--", "--depth", "1"], { encoding: "utf8", timeout: 120000 });
    if (cloned.status !== 0) throw new ProbeError(`gh repo clone failed: ${(cloned.stderr || "").trim().slice(-400)}`);
  }
  try {
    return report(await probe(dir), flag("--json"));
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
