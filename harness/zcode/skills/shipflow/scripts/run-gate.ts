// run-gate: runs the charter gates for CI and lanes (spec section 3). A gate the charter does not
// pin is detected from the working directory's manifests (lib/detect.ts). Exit 0 when every gate
// passes, or for parity when the charter names no reference site; 1 when a gate fails, times out
// or is not configured; 2 for usage or charter errors.
import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadCharter, protectedRule, type Charter } from "./lib/charter.ts";
import { effectiveSettings, type EffectiveGates, type GateEntry } from "./lib/detect.ts";

const USAGE =
  "usage: bun run-gate.ts [--charter autopilot.yaml] --gate l1|unit|acceptance|parity|protected [--tests a,b] [--base <sha>] [--branch <name>] [--log-dir .shipflow/gates]\n";
const VALUE_FLAGS = new Set(["--charter", "--gate", "--tests", "--base", "--branch", "--log-dir"]);
const GATES = ["l1", "unit", "acceptance", "parity", "protected"] as const;
const SUITE_GATES = new Set<string>(["acceptance", "parity"]);
const DEFAULT_CHARTER = "autopilot.yaml";
const DEFAULT_LOG_DIR = ".shipflow/gates";
const TAIL_LINES = 5;
const TAIL_LINE_LIMIT = 300;
const MS_PER_MINUTE = 60_000;
// A gate that ignores SIGTERM is killed after this grace period, so a timeout always ends.
const KILL_GRACE_MS = 5_000;

type Gate = (typeof GATES)[number];

type SuiteGate = "l1" | "unit" | "acceptance" | "parity";

export interface CliOptions {
  charter: string;
  gate: Gate;
  tests: string[] | null;
  base: string | null;
  branch: string | null;
  logDir: string;
}

export type ParsedArgs = { kind: "run"; options: CliOptions } | { kind: "help" } | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (!arg.startsWith("--")) return { kind: "usage", message: `unexpected argument ${arg}` };
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (!VALUE_FLAGS.has(name)) return { kind: "usage", message: `unknown flag ${name}` };
    const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
    if (value === undefined || (eq < 0 && value.startsWith("--"))) {
      return { kind: "usage", message: `${name} needs a value` };
    }
    values.set(name, value);
  }

  const gate = values.get("--gate");
  if (gate === undefined) return { kind: "usage", message: "--gate is required" };
  if (!(GATES as readonly string[]).includes(gate)) {
    return { kind: "usage", message: `--gate must be one of ${GATES.join(", ")}, found ${gate}` };
  }

  let tests: string[] | null = null;
  const testsText = values.get("--tests");
  if (testsText !== undefined) {
    if (!SUITE_GATES.has(gate)) return { kind: "usage", message: "--tests applies to --gate acceptance or parity" };
    tests = testsText.split(",").map((t) => t.trim());
    // A path starting with "-" would be read by the test runner as one of its flags.
    if (tests.some((t) => t === "" || t.startsWith("-"))) {
      return { kind: "usage", message: "--tests takes comma-separated paths that do not start with -" };
    }
  }

  const base = values.get("--base") ?? null;
  const branch = values.get("--branch") ?? null;
  if (gate === "protected") {
    if (base === null) return { kind: "usage", message: "--base is required for --gate protected" };
    if (branch === null) return { kind: "usage", message: "--branch is required for --gate protected" };
  }

  return {
    kind: "run",
    options: {
      charter: resolve(values.get("--charter") ?? DEFAULT_CHARTER),
      gate: gate as Gate,
      tests,
      base,
      branch,
      logDir: resolve(values.get("--log-dir") ?? DEFAULT_LOG_DIR),
    },
  };
}

export interface GateOutcome {
  name: string;
  passed: boolean;
  reason: string;
  tail: string[];
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logFileName(gate: string, name: string): string {
  return `${gate}-${name.replace(/[^A-Za-z0-9._-]/g, "_")}.log`;
}

function logTail(logPath: string): string[] {
  const ansi = /\x1b\[[0-9;?]*[A-Za-z]/g;
  return readFileSync(logPath, "utf8")
    .split("\n")
    .map((line) => line.replace(ansi, "").trimEnd())
    .filter((line) => line !== "")
    .slice(-TAIL_LINES)
    .map((line) => line.slice(0, TAIL_LINE_LIMIT));
}

// Output goes straight to the log file (no pipes), so a verbose gate cannot fill memory and the
// timeout still ends even when the gate spawned children that keep the parent's descriptors open.
export async function runCommand(entry: GateEntry, argv: string[], logPath: string): Promise<GateOutcome> {
  const fd = openSync(logPath, "w");
  let result: { passed: boolean; reason: string };
  try {
    result = await execute(entry, argv, fd, logPath);
  } finally {
    closeSync(fd);
  }
  return {
    name: entry.name,
    passed: result.passed,
    reason: result.reason,
    tail: result.passed ? [] : logTail(logPath),
  };
}

async function execute(
  entry: GateEntry,
  argv: string[],
  fd: number,
  logPath: string,
): Promise<{ passed: boolean; reason: string }> {
  let proc: Bun.Subprocess;
  try {
    proc = Bun.spawn([entry.tool, ...argv], { stdin: "ignore", stdout: fd, stderr: fd });
  } catch (error) {
    appendFileSync(logPath, `could not start ${entry.tool}: ${messageOf(error)}\n`);
    return { passed: false, reason: `could not start ${entry.tool}` };
  }

  let timedOut = false;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const limitTimer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGTERM");
    killTimer = setTimeout(() => proc.kill("SIGKILL"), KILL_GRACE_MS);
  }, entry.timeout_minutes * MS_PER_MINUTE);
  await proc.exited;
  clearTimeout(limitTimer);
  clearTimeout(killTimer);

  if (timedOut) return { passed: false, reason: "timeout" };
  if (proc.exitCode === 0) return { passed: true, reason: "" };
  return {
    passed: false,
    reason: proc.exitCode !== null ? `exit ${proc.exitCode}` : `exit signal ${proc.signalCode}`,
  };
}

// The effective lists already hold the charter or detected entries; an empty list means not configured.
export function gateEntries(gates: EffectiveGates, gate: SuiteGate): GateEntry[] {
  return gates[gate];
}

export async function runSuite(
  gate: SuiteGate,
  entries: GateEntry[],
  tests: string[] | null,
  logDir: string,
): Promise<GateOutcome[]> {
  const outcomes: GateOutcome[] = [];
  for (const entry of entries) {
    const argv = SUITE_GATES.has(gate) ? [...entry.args, ...(tests ?? [])] : [...entry.args];
    outcomes.push(await runCommand(entry, argv, resolve(logDir, logFileName(gate, entry.name))));
  }
  return outcomes;
}

export async function changedPaths(base: string): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  // --no-renames keeps the old name of a moved file in the list, so moving a protected file out of
  // its prefix is still seen. -z keeps paths with quotes or non-ASCII bytes unquoted, so prefixes match.
  const proc = Bun.spawn(["git", "diff", "--name-only", "-z", "--no-renames", `${base}...HEAD`], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, error: err.trim() || `git diff exit ${code}` };
  return { ok: true, paths: out.split("\0").filter((p) => p !== "") };
}

export function protectedFindings(
  charter: Charter,
  paths: string[],
  branch: string,
): { checked: number; allowed: number; errors: string[] } {
  let checked = 0;
  const errors: string[] = [];
  for (const path of paths) {
    const rule = protectedRule(charter, path);
    if (rule === null) continue;
    checked++;
    if (!rule.branches.test(branch)) errors.push(`ERROR ${path} protected path changed on ${branch}`);
  }
  return { checked, allowed: checked - errors.length, errors };
}

function summaryLines(gate: string, outcomes: GateOutcome[]): string[] {
  const passed = outcomes.filter((o) => o.passed).length;
  const lines = [`gate ${gate}: ${passed}/${outcomes.length} passed`];
  for (const outcome of outcomes) {
    if (outcome.passed) continue;
    lines.push(`ERROR ${outcome.name} ${outcome.reason}`);
    for (const line of outcome.tail) lines.push(`  ${line}`);
  }
  return lines;
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`run-gate: ${parsed.message}\n${USAGE}`);
    return 2;
  }
  const { options } = parsed;

  const loaded = loadCharter(options.charter);
  if (loaded.charter === null || loaded.errors.length > 0) {
    for (const error of loaded.errors) process.stderr.write(`run-gate: ${error}\n`);
    return 2;
  }
  const charter = loaded.charter;

  if (options.gate === "protected") {
    const { base, branch } = options;
    if (base === null || branch === null) return 2;
    if (charter.protected.length === 0) {
      process.stdout.write("gate protected: not configured\n");
      return 1;
    }
    const changed = await changedPaths(base);
    if (!changed.ok) {
      process.stderr.write(`run-gate: git diff failed: ${changed.error}\n`);
      return 2;
    }
    const result = protectedFindings(charter, changed.paths, branch);
    const lines = [`gate protected: ${result.allowed}/${result.checked} passed`, ...result.errors];
    process.stdout.write(`${lines.join("\n")}\n`);
    return result.errors.length > 0 ? 1 : 0;
  }

  // Gate argv runs in the working directory, so detection reads the manifests from there too.
  const gates = effectiveSettings(charter, process.cwd()).gates;
  const entries = gateEntries(gates, options.gate);
  if (entries.length === 0) {
    // Parity (L4) compares the build with a reference site; a charter that names none has nothing
    // to compare, so the gate does not apply. Every other gate with no entries is never green.
    if (options.gate === "parity" && charter.reference.length === 0) {
      process.stdout.write("gate parity: not applicable, the charter names no reference site\n");
      return 0;
    }
    process.stdout.write(`gate ${options.gate}: not configured\n`);
    return 1;
  }
  mkdirSync(options.logDir, { recursive: true });
  const outcomes = await runSuite(options.gate, entries, options.tests, options.logDir);
  process.stdout.write(`${summaryLines(options.gate, outcomes).join("\n")}\n`);
  return outcomes.every((o) => o.passed) ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
