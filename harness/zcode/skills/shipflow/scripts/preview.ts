// preview: starts and stops the QA preview server in its own process group (spec section 4).
// start exits 0 once the preview answers over HTTP, 1 when it does not (the group is killed), and
// 2 for usage or charter errors. stop exits 0 when the group and the port are both gone, 1 otherwise.
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chmodSync, closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadCharter } from "./lib/charter.ts";
import { effectiveSettings } from "./lib/detect.ts";

const USAGE =
  "usage: bun preview.ts start --dir <worktree> --port <n> --evidence <dir> [--charter <path>]\n" +
  "       bun preview.ts stop --pid <n> --port <n>\n";
const START_FLAGS = new Set(["--dir", "--port", "--evidence", "--charter"]);
const STOP_FLAGS = new Set(["--pid", "--port"]);
const CHARTER_FILE = "autopilot.yaml";
const CREDENTIALS_FILE = "preview-credentials.json";
const LOG_FILE = "preview.log";
const HTTP_TIMEOUT_MS = 1_000;
const POLL_MS = 250;
const MS_PER_MINUTE = 60_000;
const STOP_GRACE_MS = 10_000;
const KILL_WAIT_MS = 2_000;

export interface StartOptions {
  dir: string;
  port: number;
  evidence: string;
  charter: string;
}

export interface StopOptions {
  pid: number;
  port: number;
}

export type ParsedArgs =
  | { kind: "start"; options: StartOptions }
  | { kind: "stop"; options: StopOptions }
  | { kind: "help" }
  | { kind: "usage"; message: string };

function readFlags(argv: string[], allowed: Set<string>): { values: Map<string, string>; error: string | null } {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) return { values, error: `unexpected argument ${arg}` };
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (!allowed.has(name)) return { values, error: `unknown flag ${name}` };
    const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
    if (value === undefined || (eq < 0 && value.startsWith("--"))) {
      return { values, error: `${name} needs a value` };
    }
    values.set(name, value);
  }
  return { values, error: null };
}

function parseInteger(text: string | undefined, min: number, max: number): number | null {
  if (text === undefined || !/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value >= min && value <= max ? value : null;
}

const PORT_MAX = 65535;

export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  if (command === undefined || command === "--help" || command === "-h") return { kind: "help" };

  if (command === "start") {
    const { values, error } = readFlags(rest, START_FLAGS);
    if (error !== null) return { kind: "usage", message: error };
    const dir = values.get("--dir");
    if (dir === undefined) return { kind: "usage", message: "--dir is required" };
    const port = parseInteger(values.get("--port"), 1, PORT_MAX);
    if (port === null) return { kind: "usage", message: "--port takes a number from 1 to 65535" };
    const evidence = values.get("--evidence");
    if (evidence === undefined) return { kind: "usage", message: "--evidence is required" };
    const worktree = resolve(dir);
    return {
      kind: "start",
      options: {
        dir: worktree,
        port,
        evidence: resolve(evidence),
        charter: resolve(values.get("--charter") ?? join(worktree, CHARTER_FILE)),
      },
    };
  }

  if (command === "stop") {
    const { values, error } = readFlags(rest, STOP_FLAGS);
    if (error !== null) return { kind: "usage", message: error };
    const pid = parseInteger(values.get("--pid"), 1, Number.MAX_SAFE_INTEGER);
    if (pid === null) return { kind: "usage", message: "--pid takes a positive integer" };
    const port = parseInteger(values.get("--port"), 1, PORT_MAX);
    if (port === null) return { kind: "usage", message: "--port takes a number from 1 to 65535" };
    return { kind: "stop", options: { pid, port } };
  }

  return { kind: "usage", message: `unknown command ${command}` };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

// Any HTTP status counts as an answer: the preview is up even when its root path is not found.
export async function answers(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    await response.body?.cancel().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

// The group id of a detached child is its pid, so signalling -pid reaches the server and its children.
function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    // The group is already gone.
  }
}

function groupAlive(pid: number): boolean {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function waitForGroupExit(pid: number, limitMs: number): Promise<void> {
  const deadline = Date.now() + limitMs;
  while (groupAlive(pid) && Date.now() < deadline) await sleep(POLL_MS);
}

function randomUser(): string {
  return `autopilot-${randomBytes(4).toString("hex")}`;
}

function randomPassword(): string {
  return randomBytes(24).toString("base64url");
}

// Kills whatever the failed start left running, then reports it.
function startFailure(error: string, pid: number | null): number {
  if (pid !== null) signalGroup(pid, "SIGKILL");
  process.stdout.write(`${JSON.stringify({ ok: false, error, pid })}\n`);
  return 1;
}

export async function runStart(options: StartOptions): Promise<number> {
  const loaded = loadCharter(options.charter);
  if (loaded.charter === null || loaded.errors.length > 0) {
    for (const error of loaded.errors) process.stderr.write(`preview: ${error}\n`);
    return 2;
  }
  // The command is the charter's preview when pinned, else detected in the worktree (lib/detect.ts).
  const preview = effectiveSettings(loaded.charter, options.dir).preview;
  if (preview === null) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: "no preview command" })}\n`);
    return 1;
  }
  const { tool, args, timeout_minutes: timeoutMinutes } = preview;

  if (await answers(options.port)) {
    return startFailure(`port ${options.port} already answers`, null);
  }

  mkdirSync(options.evidence, { recursive: true });
  const credentialsFile = join(options.evidence, CREDENTIALS_FILE);
  const user = randomUser();
  const password = randomPassword();
  // The mode is applied on create only, so chmod also tightens a file left by an earlier run.
  writeFileSync(credentialsFile, `${JSON.stringify({ user, password }, null, 2)}\n`, { mode: 0o600 });
  chmodSync(credentialsFile, 0o600);

  const logFd = openSync(join(options.evidence, LOG_FILE), "w");
  // Written by event callbacks; a bare let would be narrowed to its initial value at the checks below.
  const state: { spawnError: string | null; exited: boolean } = { spawnError: null, exited: false };
  let child: ChildProcess;
  try {
    child = spawn(tool, [...args, String(options.port)], {
      cwd: options.dir,
      env: {
        ...process.env,
        PORT: String(options.port),
        AUTOPILOT_TEST_USER: user,
        AUTOPILOT_TEST_PASSWORD: password,
      },
      detached: true,
      stdio: ["ignore", logFd, logFd],
    });
  } catch (error) {
    closeSync(logFd);
    return startFailure(`could not start ${tool}: ${messageOf(error)}`, null);
  }
  closeSync(logFd);
  child.on("error", (error) => {
    state.spawnError = messageOf(error);
  });
  child.once("exit", () => {
    state.exited = true;
  });
  child.unref();
  const pid = child.pid ?? null;

  const deadline = Date.now() + timeoutMinutes * MS_PER_MINUTE;
  const url = `http://127.0.0.1:${options.port}/`;
  for (;;) {
    if (state.spawnError !== null) {
      return startFailure(`could not start ${tool}: ${state.spawnError}`, pid);
    }
    if (state.exited) {
      return startFailure("preview process exited before it answered; see preview.log", pid);
    }
    if (await answers(options.port)) break;
    if (Date.now() >= deadline) {
      return startFailure(`no HTTP answer within ${timeoutMinutes} minutes; see preview.log`, pid);
    }
    await sleep(POLL_MS);
  }

  process.stdout.write(`${JSON.stringify({ ok: true, url, pid, credentialsFile })}\n`);
  return 0;
}

export async function runStop(options: StopOptions): Promise<number> {
  signalGroup(options.pid, "SIGTERM");
  await waitForGroupExit(options.pid, STOP_GRACE_MS);
  if (groupAlive(options.pid)) {
    signalGroup(options.pid, "SIGKILL");
    await waitForGroupExit(options.pid, KILL_WAIT_MS);
  }
  const stopped = !groupAlive(options.pid) && !(await answers(options.port));
  process.stdout.write(`${JSON.stringify({ ok: stopped, stopped })}\n`);
  return stopped ? 0 : 1;
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`preview: ${parsed.message}\n${USAGE}`);
    return 2;
  }
  return parsed.kind === "start" ? runStart(parsed.options) : runStop(parsed.options);
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
