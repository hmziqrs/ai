/* zcode-workflow
description: "zflow chain engine: one parameterized chain node - implement, vision, or judge - over a set of task areas, with allowlisted gate dispatch, serialized git commits drafted by a shared Committer agent, a script-enforced per-area size budget (one commit per green round, never a multi-round union commit), AGENTS.md injected into every spawned subagent, independently confirmed findings, a live status board, and a primary markdown report."
whenToUse: "Launched by a zflow chain coordinator once per chain node (implement, vision, or judge) over a set of task areas. The launcher picks the tier for the node and must set subagent_model to the tier matching the tier argument; the script never pins models."
args:
  mode:
    type: string
    description: "Behavior switch: implement, vision, or judge."
    required: true
  tier:
    type: string
    description: "flash or pro - behavior switch only. vision assumes native image reading on flash; judge escalates image needs on pro. The launcher must set subagent_model to the matching tier."
    required: true
  task:
    type: string
    description: "The user's task, verbatim."
    required: true
  areas:
    type: json
    description: "Array of areas: { name, paths, excludedPaths, skills (absolute SKILL.md paths), gates: [{ tool, args }], complexity: straightforward|complex, hasUI, dependsOn, lane }. lane is optional (\"web\" or \"desktop\") and overrides vision-mode routing; without it the engine falls back to a URL heuristic over the task text. Gate tools must be non-mutating (no --fix/--write) and one of: npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git (read-only subcommands only: status, log, diff, show, rev-parse, ls-files, check-ignore, describe, shortlog, blame)."
    required: true
  evidence:
    type: json
    description: "Evidence paths (screenshots, AX text) from earlier rounds, for judge and vision modes."
    required: false
  findings:
    type: json
    description: "Prior-round findings (fix rounds). implement attaches the confirmed (verified) ones to the fix ask as fix targets, and the unconfirmed ones as labelled context only; judge uses the round numbers only, never the content, to stay blind."
    required: false
  maxRounds:
    type: number
    description: "Round cap enforced in code (stagnation + cap); default 3."
    required: false
    default: 3
  commit:
    type: boolean
    description: "implement mode only. Default true: each green round is committed (one commit per green round, size-budgeted). When false, commits are skipped entirely — work stays on disk, uncommitted, and the report says so."
    required: false
    default: true
  agentsMd:
    type: string
    description: "Path to the repo's AGENTS.md, injected into every spawned subagent's ask: its hard rules bind the task, and every skill it requires is read and followed too (inherited on top of the routing-map skills). Default \"AGENTS.md\"; an empty string disables the injection."
    required: false
    default: "AGENTS.md"
  baseSha:
    type: string
    description: "The chain's starting commit sha, recorded by the coordinator at prep (git rev-parse HEAD). When present, judge asks carry per-area numstat vs this base as size evidence: an area over its budget is a HIGH finding regardless of correctness."
    required: false
  maxLines:
    type: number
    description: "Default size budget: max changed lines per commit and per uncommitted area delta, measured by the script via git numstat. An area over budget is a red (size) round — shrink it or split the area; two consecutive size-red rounds stop the area. Per-area budget overrides this."
    required: false
    default: 400
  maxFiles:
    type: number
    description: "Default size budget: max changed files per commit and per uncommitted area delta. Per-area budget overrides this."
    required: false
    default: 10
*/

// zflow-engine: the single workflow behind the z-*flow skill ports (contract: harness/zcode/workflows/zflow-SPEC.md).
//
// One saved workflow, launched once per chain node. The coordinator (the main agent running the
// skill) calls CreateWorkflow per node, sets `subagent_model` to the node's tier, and passes the
// args above. Cross-node state is this run's typed WorkflowReport return; evidence lives in files
// under .zflow/evidence/. Platform facts this script relies on (SPEC section 1): one run = one
// model (tier is behavior only), no nesting, agent-browser and ocu are driven by subagents with
// Bash, world.run commands are compile-time literals with runtime values in the args arrays.

// ---------------------------------------------------------------------------
// Types. Every field carries JSDoc: it is the field description the subagent reads.
// ---------------------------------------------------------------------------

/** A non-mutating check command attached to an area, e.g. { tool: "npm", args: ["test"] }. */
interface GateSpec {
  /** Command name; must be in the engine's allowlist (npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git). */
  tool: string;
  /** Fixed argv for the command, runtime values included; never a shell string. */
  args: string[];
}

/** One area of the task, as routed in by the chain coordinator. */
interface AreaSpec {
  /** Short unique area name; keys subagent names, evidence files, and chain hand-offs. */
  name: string;
  /** Workspace-relative paths in this area's scope. */
  paths: string[];
  /** Paths this area must never touch. */
  excludedPaths: string[];
  /** Absolute SKILL.md paths the implementer must read and follow. */
  skills: string[];
  /** Non-mutating gate commands; the script dispatches them through the allowlist switch. */
  gates: GateSpec[];
  /** Routing hint from the coordinator; complex areas get more careful asks. */
  complexity: "straightforward" | "complex";
  /** True when the area has a UI surface vision mode can capture. */
  hasUI: boolean;
  /** Optional vision-lane override: "web" (agent-browser) or "desktop" (ocu); when absent, vision mode falls back to a URL heuristic over the task text. */
  lane?: "web" | "desktop";
  /** Names of areas that must finish before this one starts. */
  dependsOn: string[];
  /** Optional per-area size budget overriding the run's maxLines/maxFiles: this area's commits and uncommitted deltas must stay within it, or the round goes red with reason "size". */
  budget?: { maxLines: number; maxFiles: number };
}

/** The dynamic-workflows Finding convention; the shape every mode reports and returns. */
interface Finding {
  /** Workspace-relative path, with a line when it applies: "src/a.ts:42". */
  where: string;
  /** One sentence: what is wrong, or what was found. */
  what: string;
  /** What showed it: the lines read, the command and its output, or the evidence path that proves it. */
  evidence: string;
  /** "verified" when an independent confirmer or a deterministic gate confirmed it; "unconfirmed" otherwise. */
  status: "verified" | "unconfirmed";
  /** How much it matters. Reserve "high" for data loss, a crash, or a wrong result. */
  severity: "low" | "medium" | "high";
}

/** A Finding plus the chain keys the coordinator needs for fix rounds. */
interface EngineFinding extends Finding {
  /** Area name the finding belongs to. */
  area: string;
  /** 1-based engine round the finding landed in. */
  round: number;
}

/** What one implementer hands back after a round of work. */
interface AreaWork {
  /** One or two sentences: what was done this round. */
  summary: string;
  /** Exact workspace-relative paths changed this round. */
  changedFiles: string[];
  /** Anything worth carrying into the report (blocked parts, surprises). */
  notes: string;
  /** Things deliberately left undone, each with a reason. */
  skipped: string[];
}

/** Result of one gate command, as executed by the script (never by a subagent). */
interface GateOutcome {
  /** The gate's tool name. */
  tool: string;
  /** The full command line as run, for the report. */
  argv: string;
  /** False when the gate was skipped or could not run at all. */
  ran: boolean;
  /** Process exit code; -1 when the gate never ran. */
  exitCode: number;
  /** Tail of the failing output, empty on success, or the reason it did not run. */
  failure: string;
}

/** Result of one git mutation, as executed by the script. */
interface GitResult {
  /** False when git could not be spawned at all. */
  ran: boolean;
  /** Process exit code; -1 when git never ran. */
  exitCode: number;
  /** Tail of git's output, for the report. */
  output: string;
}

/** A commit message drafted by the Committer agent. */
interface CommitDraft {
  /** The full commit message: a subject line under 72 characters, optionally a blank line and a short body. */
  message: string;
}

/** What a fresh judge reports for one area. */
interface JudgeFindings {
  /** Each problem found, with where/what/evidence. Empty when the area looks complete. */
  findings: Finding[];
  /** Two or three sentences: the overall state of this area. */
  overallNote: string;
}

/** What a confirmer reports about one finding. */
interface Confirmation {
  /** True only when the confirmer reproduced the finding itself from the evidence. */
  reproduced: boolean;
  /** One sentence: what was checked and what was seen. */
  note: string;
}

/** What an evidence-capture subagent reports for one area. */
interface CaptureResult {
  /** Capture lane used, as instructed: web (agent-browser) or desktop (ocu). */
  lane: "web" | "desktop";
  /** Exact paths of evidence files written this round. */
  evidencePaths: string[];
  /** Path of the AX text snapshot when one was saved. */
  axTextPath?: string;
  /** One or two sentences: what was captured and anything that failed. */
  notes: string;
}

/** What the vision auditor reports for one area's evidence. */
interface VisionAudit {
  /** Two or three sentences: what the evidence shows overall. */
  verdict: string;
  /** Problems the evidence shows, each with where/what/evidence. */
  findings: Finding[];
}

/** One card on the status board. */
interface AreaStatus {
  /** Stable card key: the area name within this run. */
  key: string;
  /** Area name shown on the card. */
  name: string;
  /** Column the card sits in; "unverified" is for areas with no gates declared — neither passed nor failed. */
  status: "working" | "passed" | "unverified" | "failed";
  /** One line: what happened to this area. */
  note: string;
  /** The engine round this status is from. */
  round: number;
}

/** Everything the script knows about one area when the implement fan-out settles. */
interface AreaOutcome {
  /** Area name. */
  area: string;
  /** True when every gate ran and exited 0 on the last round. */
  gatesGreen: boolean;
  /** Final-round gate outcomes. */
  gates: GateOutcome[];
  /** Gate rounds used (1-based). */
  rounds: number;
  /** True when the loop stopped because two rounds passed without improvement. */
  stagnated: boolean;
  /** The implementer's final summary. */
  summary: string;
  /** The implementer's notes worth carrying (blocked parts, surprises); "" when there were none. */
  notes: string;
  /** Short sha of this area's most recent commit, parsed from git commit stdout; "" when no commit was made or the sha could not be parsed. One commit is made per green round — the full list is commitShas. */
  commitSha: string;
  /** Short shas of this area's commits, one per green round, in commit order; empty when none was made. */
  commitShas: string[];
  /** Files the implementer changed, minus excludedPaths. */
  changedFiles: string[];
  /** Things the implementer deliberately left undone. */
  skipped: string[];
  /** Commit outcome note (per-round notes, or made/skipped/failed); empty when the area had nothing committable. */
  commitNote: string;
  /** True when the area stopped because it stayed over its size budget — the coordinator splits it, it is not a gates problem. */
  overBudget: boolean;
  /** One-line size summary of the last script-measured delta ("6 file(s), +120/−40 — budget 400 lines / 10 files"); "" when nothing was measured. */
  sizeNote: string;
  /** Final-round red gates as findings. */
  findings: EngineFinding[];
  /** Error that cost this area, when one did. */
  error?: string;
}

/** Per-area result of the judge fan-out. */
interface JudgeAreaResult {
  /** Area name. */
  area: string;
  /** The judge's overall note. */
  overallNote: string;
  /** Gates the script ran for this area. */
  gates: GateOutcome[];
  /** Judge findings with confirmation status applied; nothing is dropped. */
  findings: EngineFinding[];
}

/** Per-area result of the vision fan-out. */
interface VisionAreaResult {
  /** Area name. */
  area: string;
  /** Capture lane used. */
  lane: "web" | "desktop";
  /** Evidence paths that were audited. */
  evidence: string[];
  /** True only when the evidence was confirmed on disk by the script's own glob. */
  onDisk: boolean;
  /** The auditor's overall verdict. */
  verdict: string;
  /** Audit findings; all unconfirmed — they carry into the next implement round as advisory context, and a re-shoot verifies them; no judge sits between. */
  findings: EngineFinding[];
}

/** Per-area control data the implement-mode typed return carries for the chain coordinator. */
interface ImplementAreaHandoff {
  /** Area name. */
  area: string;
  /** Files this run changed for the area: every in-run round unioned, excludedPaths applied. */
  changedFiles: string[];
  /** The implementer's final summary for the area. */
  summary: string;
  /** Short sha of the area's most recent commit, parsed from git commit stdout; "" when no commit was made or the sha could not be parsed. One commit is made per green round — the full list is commitShas. */
  commitSha: string;
  /** Short shas of this area's commits, one per green round, in commit order; empty when none was made. */
  commitShas: string[];
  /** The implementer's notes worth carrying (blocked parts, surprises); "" when there were none. */
  notes: string;
}

/** Per-area control data the vision-mode typed return carries for the chain coordinator. */
interface VisionAreaHandoff {
  /** Area name. */
  area: string;
  /** Capture lane used: the area's explicit lane when it declared one, else the URL heuristic's choice. */
  lane: "web" | "desktop";
  /** The auditor's verdict on this area's evidence. */
  verdict: string;
  /** Exact evidence paths audited for this area — paths, never counts; empty when nothing landed on disk. */
  evidence: string[];
}

/** The run's handoff, in the dynamic-workflows report shape. */
interface WorkflowReport {
  /** Two or three sentences answering what the user asked for. */
  conclusion: string;
  /** Everything the run found standing, each keyed by area and round; empty when nothing stands. */
  findings: EngineFinding[];
  /** What the run checked and how: the commands it ran, the files it covered. */
  verified: string[];
  /** What the run did not look at or could not check, and why. */
  notCovered: string[];
  /** Per-area control data for the coordinator: implement returns ImplementAreaHandoff[], vision returns VisionAreaHandoff[]; every area appears, clean/zero-finding ones included. Judge returns omit it. */
  areas?: ImplementAreaHandoff[] | VisionAreaHandoff[];
}

// ---------------------------------------------------------------------------
// Shared constants and small helpers.
// ---------------------------------------------------------------------------

/** Gate timeout: real build/test suites are allowed to be slow. */
const GATE_TIMEOUT_MS = 900_000;
/** Evidence directory, per the SPEC; capture agents create it if needed. */
const EVIDENCE_DIR = ".zflow/evidence";
/** git subcommands a gate may run: read-only ones only; any other git gate is treated as mutating and never runs. */
const READ_ONLY_GIT_SUBCOMMANDS = [
  "status", "log", "diff", "show", "rev-parse", "ls-files", "check-ignore", "describe", "shortlog", "blame",
];

/** Default size budget: the largest diff one commit — or one area's uncommitted delta — may carry. Tune per run via maxLines/maxFiles, per area via AreaSpec.budget. */
const DEFAULT_MAX_LINES = 400;
const DEFAULT_MAX_FILES = 10;

/** Keep only the string entries of an unknown array; every non-string entry is recorded as a parse problem instead of being silently dropped. */
function stringArray(raw: unknown, problems: string[], label: string): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => {
    if (typeof x === "string") return true;
    problems.push(`${label}: non-string entry ${JSON.stringify(x)} dropped`);
    return false;
  });
}

/** Parse one area's optional size budget; malformed budgets become problems, never crashes. */
function parseBudget(raw: unknown, problems: string[], label: string): { maxLines: number; maxFiles: number } | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") {
    problems.push(`${label}: budget is not an object — ignored, the run's default budget applies`);
    return undefined;
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.maxLines !== "number" || typeof b.maxFiles !== "number" || b.maxLines < 1 || b.maxFiles < 1) {
    problems.push(`${label}: budget needs numeric maxLines and maxFiles ≥ 1 — ignored, the run's default budget applies`);
    return undefined;
  }
  return { maxLines: Math.floor(b.maxLines), maxFiles: Math.floor(b.maxFiles) };
}

/** Last ~1200 characters of a command's output, whitespace-trimmed. */
function tail(text: string): string {
  const clean = text.trim();
  return clean.length <= 1200 ? clean : clean.slice(clean.length - 1200);
}

/** Short commit sha from git commit stdout (the "[branch a1b2c3d] subject" line); "" when no sha can be found there. */
function shortSha(commitOutput: string): string {
  const m = /\[[^\]\s]+\s+([0-9a-f]{7,40})\]/.exec(commitOutput);
  return m === null ? "" : m[1];
}

/** True when a gate would mutate the tree (an auto-fix flag, or a git gate whose first non-flag token is outside the read-only allowlist); such gates never run. */
function gateIsMutating(tool: string, gateArgs: string[]): boolean {
  if (gateArgs.some((a) => a === "--fix" || a === "--write")) return true;
  if (tool !== "git") return false;
  const firstNonFlag = gateArgs.find((a) => !a.startsWith("-")) ?? "";
  return !READ_ONLY_GIT_SUBCOMMANDS.includes(firstNonFlag);
}

// ---------------------------------------------------------------------------
// Gate dispatch: a literal-command allowlist switch. The tool and its args come
// from `areas` at runtime and ride in the args array; the command names are
// compile-time literals the user approved, never interpolated.
// ---------------------------------------------------------------------------

/** Fold a finished world.run into a GateOutcome. */
function gateDone(tool: string, argv: string, r: { exitCode: number; stdout: string; stderr: string }): GateOutcome {
  const failureText = r.exitCode === 0 ? "" : tail(r.stderr.length > 0 ? r.stderr : r.stdout);
  return { tool, argv, ran: true, exitCode: r.exitCode, failure: failureText };
}

/** Run one gate through the allowlist. Skipped and unspawnable gates return as values, never throw. */
async function runGate(tool: string, gateArgs: string[]): Promise<GateOutcome> {
  const argv = [tool, ...gateArgs].join(" ");
  if (gateIsMutating(tool, gateArgs)) {
    return { tool, argv, ran: false, exitCode: -1, failure: "skipped: mutating gates (--fix/--write, or a git subcommand outside the read-only allowlist) are not allowed" };
  }
  try {
    switch (tool) {
      case "npm":
        return gateDone(tool, argv, await world.run("npm", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "pnpm":
        return gateDone(tool, argv, await world.run("pnpm", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "yarn":
        return gateDone(tool, argv, await world.run("yarn", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "bun":
        return gateDone(tool, argv, await world.run("bun", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "cargo":
        return gateDone(tool, argv, await world.run("cargo", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "make":
        return gateDone(tool, argv, await world.run("make", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "go":
        return gateDone(tool, argv, await world.run("go", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "python3":
        return gateDone(tool, argv, await world.run("python3", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "pytest":
        return gateDone(tool, argv, await world.run("pytest", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "npx":
        return gateDone(tool, argv, await world.run("npx", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      case "git":
        return gateDone(tool, argv, await world.run("git", gateArgs, { timeoutMs: GATE_TIMEOUT_MS }));
      default:
        return { tool, argv, ran: false, exitCode: -1, failure: `skipped: "${tool}" is not in the engine's gate allowlist` };
    }
  } catch (error) {
    return { tool, argv, ran: false, exitCode: -1, failure: `did not run: ${String(error)}` };
  }
}

/** Run every gate of one area, in declared order. */
async function runAllGates(area: AreaSpec): Promise<GateOutcome[]> {
  const out: GateOutcome[] = [];
  for (const gate of area.gates) {
    out.push(await runGate(gate.tool, gate.args));
  }
  return out;
}

/** One line describing a gate outcome, for asks and reports. */
function describeGate(g: GateOutcome): string {
  const state = g.ran ? `exit ${g.exitCode}` : "did not run";
  return `- ${g.argv} → ${state}${g.failure === "" ? "" : ` — ${g.failure}`}`;
}

/** A red gate as a verified finding: the exit code is the confirmation. */
function gateFinding(area: AreaSpec, round: number, g: GateOutcome): EngineFinding {
  return {
    where: area.paths.length > 0 ? area.paths[0] : area.name,
    what: `Area gate is still red: ${g.argv}`,
    evidence: `${g.argv} exited ${g.exitCode}${g.failure === "" ? "" : ` — ${g.failure}`}`,
    status: "verified",
    severity: "high",
    area: area.name,
    round,
  };
}

/** An over-budget diff as a verified finding: the numstat numbers are the confirmation. */
function sizeFinding(area: AreaSpec, round: number, s: { files: number; added: number; deleted: number }, budget: { maxLines: number; maxFiles: number }): EngineFinding {
  return {
    where: area.paths.length > 0 ? area.paths[0] : area.name,
    what: `Area over size budget: ${s.files} file(s), +${s.added}/−${s.deleted} against a budget of ${budget.maxLines} lines / ${budget.maxFiles} files — split the area, do not commit big`,
    evidence: `script-run git diff --numstat measured ${s.files} file(s), +${s.added}/−${s.deleted} against the budget`,
    status: "verified",
    severity: "high",
    area: area.name,
    round,
  };
}

// ---------------------------------------------------------------------------
// Git discipline: mutations only through world.run("git", ...), serialized by
// the script, explicit paths only, never --no-verify, never push.
// ---------------------------------------------------------------------------

/** Serialized git queue tail; every mutation waits for the previous one. */
let gitChain: Promise<unknown> = Promise.resolve();

/** Run one git operation at a time; concurrent areas queue here. */
function serializedGit<T>(op: () => Promise<T>): Promise<T> {
  const run = gitChain.then(op, op);
  gitChain = run.then(() => undefined, () => undefined);
  return run;
}

/** Execute one git argv array, turning spawn failures into values. */
async function gitRun(gitArgs: string[]): Promise<GitResult> {
  try {
    const r = await world.run("git", gitArgs);
    return { ran: true, exitCode: r.exitCode, output: tail(`${r.stdout}\n${r.stderr}`) };
  } catch (error) {
    return { ran: false, exitCode: -1, output: String(error) };
  }
}

/** Parse `git diff --numstat` output: one row per changed file as "added<TAB>deleted<TAB>path" ("-" for binary), summed. */
function parseNumstat(output: string): { files: number; added: number; deleted: number } {
  let files = 0;
  let added = 0;
  let deleted = 0;
  for (const line of output.split("\n")) {
    const m = /^(\d+|-)\t(\d+|-)\t/.exec(line.trim());
    if (m === null) continue;
    files += 1;
    added += m[1] === "-" ? 0 : parseInt(m[1], 10);
    deleted += m[2] === "-" ? 0 : parseInt(m[2], 10);
  }
  return { files, added, deleted };
}

/** The script's own size measurement of an uncommitted delta vs a base sha — never trusted to an agent. Untracked files are intent-added first (explicit paths, serialized queue) so new work is counted; a pre-chain dirty file the implementer also touches counts toward the budget, which is the conservative direction. */
async function measureSize(files: string[], base: string): Promise<{ files: number; added: number; deleted: number }> {
  const others = await gitRun(["ls-files", "--others", "--exclude-standard", "--", ...files]);
  const untracked = others.output.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (others.ran && others.exitCode === 0 && untracked.length > 0) {
    await serializedGit(() => gitRun(["add", "--intent-to-add", "--", ...untracked]));
  }
  const numstat = await gitRun(["diff", "--numstat", base, "--", ...files]);
  return parseNumstat(numstat.output);
}

/** Per-area diff size vs the chain's starting sha — the blind judge's size evidence. Untracked files are intent-added first so committed-or-not work is counted. */
async function numstatVsBase(base: string, area: AreaSpec): Promise<{ files: number; added: number; deleted: number }> {
  const spec = area.paths.length > 0 ? ["--", ...area.paths] : [];
  const others = await gitRun(["ls-files", "--others", "--exclude-standard", ...spec]);
  const untracked = others.output.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (others.ran && others.exitCode === 0 && untracked.length > 0) {
    await serializedGit(() => gitRun(["add", "--intent-to-add", "--", ...untracked]));
  }
  const numstat = await gitRun(["diff", "--numstat", base, ...spec]);
  return parseNumstat(numstat.output);
}

// ---------------------------------------------------------------------------
// AGENTS.md injection: every spawned subagent's ask carries the repo's hard
// rules and inherits the skills AGENTS.md requires, on top of routing-map
// skills. The path rides the ask; the subagent reads the file itself.
// ---------------------------------------------------------------------------

/** The AGENTS.md line every spawned subagent's ask carries; empty when the arg disabled it or the file was not found (recorded in notCovered, never silent). */
function agentsMdLine(): string {
  if (agentsMdPath === "" || !agentsMdLoaded) return "";
  return `Read ${agentsMdPath} first — the repo's hard rules bind this task, and every skill it requires you must read and follow too (on top of any skills named here).`;
}

// ---------------------------------------------------------------------------
// Personas. Each says what the actor does, forbids what it must not do, and
// makes escalating cheaper than faking.
// ---------------------------------------------------------------------------

const IMPLEMENTER_PERSONA = {
  system:
    "You implement one area of a larger task with the smallest coherent change that completes it. " +
    "Read the skill files you are given and follow them. Change only what the task needs; respect every exclusion you are told about. " +
    "The script runs the area gates and the git commits after you hand off — do not run the gates, do not run git. " +
    "Report exactly which files you changed and what you did; never paste whole files back. " +
    "If your instructions are impossible to satisfy, escalate and say so plainly rather than leaving half-done work unreported.",
};

const COMMITTER_PERSONA = {
  system:
    "You draft commit messages and nothing else. From the task, the area summary, and the exact file list you are given, " +
    "you write one conventional commit message: a subject line under 72 characters, then a short body only when it earns one. " +
    "You never edit files, never run git, never commit — the script does. Return the message text only.",
};

const CONFIRMER_PERSONA = {
  system:
    "You confirm or refute a single finding by reproducing it from its evidence alone; you read the files it names with your own tools. " +
    "You never edit any file, and you never re-run checks the script already ran — their results are handed to you. " +
    "reproduced is true only when you saw the problem yourself; when you cannot, say exactly what blocked you.",
};

const CAPTURE_PERSONA = {
  system:
    "You drive evidence-capture CLIs (agent-browser, ocu) exactly as instructed and write evidence files at the exact paths given. " +
    "You capture evidence; you never fix, patch, or improve anything you see. " +
    "If a tool is missing, not on PATH, or fails, report that plainly — never claim a capture that did not land. " +
    "If your instructions are impossible (no such app, no such URL), escalate and say so.",
};

/** A judge persona, adapted to the run's tier for image evidence. */
function judgePersona(tier: string): { system: string } {
  return {
    system:
      "You are a fresh judge: you have never seen this work, and you owe its authors nothing. " +
      "Judge the current state of the code against the task and hunt for failures — wrong, missing, half-done, or misleading work. " +
      "Report only findings you can show evidence for; do not pad, do not approve, do not edit any file. " +
      (tier === "flash"
        ? "You read PNG images natively with your Read tool; open screenshots when they are part of the evidence."
        : "You are image-blind: reading a PNG returns no visual content. Read text evidence (AX snapshots) as files. " +
          "If a pixel check is unavoidable, escalate ONCE carrying every screenshot path for this area — never guess what an image shows.") +
      " If you cannot judge something, say so instead of guessing.",
  };
}

/** A vision-audit persona, adapted to the run's tier for image evidence. */
function auditPersona(tier: string): { system: string } {
  return {
    system:
      "You audit visual evidence against the task and report what it shows: broken layouts, wrong states, missing screens, misleading UI. " +
      "Every finding names the evidence file that shows it. You never edit any file. " +
      (tier === "flash"
        ? "You read PNG images natively with your Read tool; open each screenshot and judge the pixels, including exact colors when they matter."
        : "You are image-blind: reading a PNG returns no visual content. Audit the AX text snapshots as files. " +
          "If a pixel check is unavoidable, escalate ONCE carrying every screenshot path for this area — never guess what an image shows."),
  };
}

// ---------------------------------------------------------------------------
// Ask builders. Narrow asks: paths and descriptions, never file contents.
// ---------------------------------------------------------------------------

/** The initial (or fix-round) ask for one area's implementer. Fix targets are confirmed findings only; unconfirmed ones ride along labelled as context. */
function implementAsk(area: AreaSpec, task: string, fixTargets: EngineFinding[], advisory: EngineFinding[], round: number, budget: { maxLines: number; maxFiles: number }): string {
  return [
    `Implement the area "${area.name}" of this task.`,
    `Task (verbatim): ${task}`,
    area.paths.length > 0 ? `Scope paths: ${area.paths.join(", ")}` : "Scope paths: the whole workspace",
    area.excludedPaths.length > 0 ? `Never touch: ${area.excludedPaths.join(", ")}` : "",
    area.skills.length > 0 ? `Read and follow these skill files first: ${area.skills.join(", ")}` : "",
    agentsMdLine(),
    `Size budget: this area's rounds must stay within ${budget.maxLines} changed lines across ${budget.maxFiles} files (the script measures each round with git numstat). If the area cannot be completed within one budget-sized round, finish one coherent slice within budget and note the split the coordinator needs to make.`,
    area.complexity === "complex" ? "The coordinator routed this area as complex: be deliberate, and check the edges before handing off." : "",
    area.dependsOn.length > 0 ? `These areas finished before you started: ${area.dependsOn.join(", ")}` : "",
    fixTargets.length > 0
      ? `This is a fix round (round ${round}). Fix exactly these confirmed findings, nothing more:\n${JSON.stringify(fixTargets)}`
      : "",
    advisory.length > 0
      ? `These prior findings stayed unconfirmed — a confirmer could not reproduce them. They are context only, never fix targets; mention them in your notes only if you observe them yourself:\n${JSON.stringify(advisory)}`
      : "",
    "Make the smallest coherent change that completes this area. Do not run the area gates — the script runs them after you. Do not run git — the script commits.",
  ].filter((line) => line !== "").join("\n");
}

/** The ask that sends a red round back to the same implementer: red gates, an over-budget diff, or both. */
function fixAsk(area: AreaSpec, task: string, gates: GateOutcome[], budget: { maxLines: number; maxFiles: number }, size?: { files: number; added: number; deleted: number }): string {
  const red = gates.filter((g) => !(g.ran && g.exitCode === 0)).map(describeGate);
  const over = size !== undefined && (size.added + size.deleted > budget.maxLines || size.files > budget.maxFiles);
  return [
    red.length > 0
      ? `The gates for "${area.name}" are still red. Fix the failures with the smallest coherent change.`
      : `The gates for "${area.name}" are green, but the area's uncommitted diff is over its size budget.`,
    `Task (verbatim): ${task}`,
    red.length > 0 ? `Red gates:\n${red.join("\n")}` : "",
    over && size !== undefined
      ? `Size budget: at most ${budget.maxLines} changed lines across ${budget.maxFiles} files; this round measures ${size.files} file(s), +${size.added}/−${size.deleted}. Shrink the change to budget or report exactly how the coordinator should split this area — do not grow it further.`
      : "",
    agentsMdLine(),
    "Do not run the gates yourself — the script re-runs them after you hand off. Do not run git.",
  ].filter((line) => line !== "").join("\n");
}

/** The blind judge's ask for one area, with the script-measured size evidence vs the chain's start. */
function judgeAsk(area: AreaSpec, task: string, evidencePaths: string[], round: number, size?: { files: number; added: number; deleted: number }, budget?: { maxLines: number; maxFiles: number }): string {
  return [
    `Judge the current state of area "${area.name}" (round ${round}). You have not seen this work before.`,
    `Task (verbatim): ${task}`,
    area.paths.length > 0 ? `Paths in scope: ${area.paths.join(", ")}` : "Paths in scope: the whole workspace",
    area.excludedPaths.length > 0 ? `Out of scope: ${area.excludedPaths.join(", ")}` : "",
    evidencePaths.length > 0 ? `Evidence from earlier rounds: ${evidencePaths.join(", ")}` : "",
    agentsMdLine(),
    size !== undefined && budget !== undefined
      ? `Size evidence vs the chain's start (script-run git numstat): ${size.files} file(s), +${size.added}/−${size.deleted}. This area's budget: ≤${budget.maxLines} changed lines / ≤${budget.maxFiles} files. An area whose diff exceeds its budget is a HIGH finding regardless of correctness — if these numbers exceed it, report that finding (where: the area's first path; what: over size budget; evidence: these numbers).`
      : "",
    "Find what is wrong, missing, or half-done relative to the task. Each finding needs a where (path, with a line when it applies), a one-sentence what, and evidence showing it.",
    "Do not edit any file. Do not run the area gates — the script runs them itself after you.",
  ].filter((line) => line !== "").join("\n");
}

/** The confirmer's ask for one judge finding. */
function confirmerAsk(finding: Finding, gateNotes: string): string {
  return [
    "Reproduce this finding from its evidence alone; read the files it names. Do not edit anything.",
    `Finding:\n${JSON.stringify(finding)}`,
    agentsMdLine(),
    gateNotes.length > 0
      ? `The script already ran this area's gates — do not re-run them:\n${gateNotes}`
      : "This area declares no gates; confirm from code and text evidence alone.",
    "reproduced is true only if you saw the problem yourself.",
  ].filter((line) => line !== "").join("\n");
}

/** The capture ask for the web lane (agent-browser with an isolated session). */
function captureAskWeb(area: AreaSpec, round: number, url: string, priorEvidence: string[]): string {
  const session = `zflow-${area.name}`;
  return [
    `Capture visual evidence for the web UI of area "${area.name}", round ${round}.`,
    `Use the agent-browser CLI with an isolated session named "${session}":`,
    url.length > 0
      ? `  agent-browser --session ${session} open ${url}`
      : "  No web URL was found in the task text — if you cannot identify the web UI to capture from the task, escalate rather than guessing.",
    `  agent-browser --session ${session} screenshot ${EVIDENCE_DIR}/${area.name}-r${round}-web-1.png`,
    `  agent-browser --session ${session} close`,
    `Capture the page states this area cares about (up to 3 screenshots, numbered -web-1, -web-2, -web-3).`,
    priorEvidence.length > 0
      ? `Prior-round shots for this area — capture the same states again so the rounds are comparable: ${priorEvidence.join(", ")}`
      : "",
    `Create ${EVIDENCE_DIR} first. You may also save a structure snapshot via "agent-browser --session ${session} snapshot -i --json" to ${EVIDENCE_DIR}/${area.name}-r${round}-ax.json.`,
    agentsMdLine(),
    "Always close the session when you are done.",
    "Return the exact paths you wrote. Do not fix anything you see — you only capture evidence.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** The capture ask for the desktop lane (ocu: AX text plus decoded pixel PNG). */
function captureAskDesktop(area: AreaSpec, task: string, round: number, priorEvidence: string[]): string {
  return [
    `Capture desktop evidence for area "${area.name}", round ${round}. The desktop application to audit is named in the task text; identify it from there.`,
    `Task (verbatim): ${task}`,
    "Use the ocu CLI:",
    `  ocu snapshot "<app name>" — save the accessibility text snapshot to ${EVIDENCE_DIR}/${area.name}-r${round}-ax.txt`,
    `  ocu call get_app_state --args '{"app":"<app name>","include_screenshot":true}' — the JSON reply contains a base64-encoded PNG; find the field holding it and decode it to a file (for example jq -r on the field, piped through base64 -d) at ${EVIDENCE_DIR}/${area.name}-r${round}-desktop.png`,
    priorEvidence.length > 0
      ? `Prior-round shots for this area — capture the same states again so the rounds are comparable: ${priorEvidence.join(", ")}`
      : "",
    `Create ${EVIDENCE_DIR} first. Inspect the JSON to find the base64 field; never invent a screenshot.`,
    agentsMdLine(),
    "If ocu or the application is unavailable, say so plainly and return whatever you did capture.",
    "Return the exact paths you wrote. Do not fix anything you see — you only capture evidence.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** The vision auditor's ask for one area's evidence: this round's shots, prior-round shots, and the prior round's findings for comparison. */
function auditAsk(
  area: AreaSpec,
  task: string,
  evidencePaths: string[],
  priorEvidence: string[],
  priorFindings: EngineFinding[],
  round: number,
  captureNotes: string,
): string {
  return [
    `Audit the visual evidence for area "${area.name}", round ${round}, against the task.`,
    `Task (verbatim): ${task}`,
    evidencePaths.length > 0
      ? `Evidence files: ${evidencePaths.join(", ")}`
      : "Evidence files: none were captured — say exactly that in your verdict.",
    priorEvidence.length > 0 ? `Prior-round evidence for this area (compare against it): ${priorEvidence.join(", ")}` : "",
    priorFindings.length > 0
      ? `Prior-round audit findings for this area — advisory context; this re-shoot is their check, no judge sits between: ${JSON.stringify(priorFindings)}`
      : "",
    `Capture notes: ${captureNotes}`,
    agentsMdLine(),
    "Report what the evidence shows is wrong or missing: each finding needs a where (the evidence path, or the code path it implicates), a one-sentence what, and evidence naming the file that shows it. Also give an overall verdict.",
    "Do not edit any file.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// ---------------------------------------------------------------------------
// Argument parsing. The host validates declared types; the script narrows the
// values and refuses invalid launches honestly instead of guessing.
// ---------------------------------------------------------------------------

/** Parse the areas JSON defensively; malformed entries become problems, never crashes. */
function parseAreas(raw: unknown): { areas: AreaSpec[]; problems: string[] } {
  const areas: AreaSpec[] = [];
  const problems: string[] = [];
  if (!Array.isArray(raw)) {
    problems.push("areas is not an array");
    return { areas, problems };
  }
  const seen = new Set<string>();
  raw.forEach((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      problems.push(`areas[${i}] is not an object`);
      return;
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.name !== "string" || e.name.length === 0) {
      problems.push(`areas[${i}] has no usable name`);
      return;
    }
    if (seen.has(e.name)) {
      problems.push(`duplicate area name "${e.name}" dropped (subagent names must be unique)`);
      return;
    }
    seen.add(e.name);
    const gates: GateSpec[] = [];
    if (Array.isArray(e.gates)) {
      e.gates.forEach((g, gi) => {
        if (typeof g !== "object" || g === null) {
          problems.push(`${e.name}: gates[${gi}] is not an object`);
          return;
        }
        const go = g as Record<string, unknown>;
        if (typeof go.tool !== "string" || go.tool.length === 0) {
          problems.push(`${e.name}: gates[${gi}] has no tool`);
          return;
        }
        gates.push({ tool: go.tool, args: stringArray(go.args, problems, `${e.name}: gates[${gi}].args`) });
      });
    }
    const lane = e.lane === "web" || e.lane === "desktop" ? e.lane : undefined;
    if (e.lane !== undefined && lane === undefined) {
      problems.push(`${e.name}: lane ${JSON.stringify(e.lane)} is not "web" or "desktop" — ignored, vision falls back to the URL heuristic`);
    }
    areas.push({
      name: e.name,
      paths: stringArray(e.paths, problems, `${e.name}: paths`),
      excludedPaths: stringArray(e.excludedPaths, problems, `${e.name}: excludedPaths`),
      skills: stringArray(e.skills, problems, `${e.name}: skills`),
      gates,
      complexity: e.complexity === "complex" ? "complex" : "straightforward",
      hasUI: e.hasUI === true,
      lane,
      dependsOn: stringArray(e.dependsOn, problems, `${e.name}: dependsOn`),
      budget: parseBudget(e.budget, problems, `${e.name}: budget`),
    });
  });
  breakCycles(areas, problems);
  return { areas, problems };
}

/** Drop unknown deps (noting them) and break dependency cycles in place, so the fan-out can never deadlock. */
function breakCycles(areas: AreaSpec[], problems: string[]): void {
  const names = new Set(areas.map((a) => a.name));
  for (const area of areas) {
    const unknown = area.dependsOn.filter((d) => !names.has(d));
    if (unknown.length > 0) {
      problems.push(`${area.name}: dependsOn names no such area (${unknown.join(", ")}) — ignored`);
    }
    area.dependsOn = area.dependsOn.filter((d) => names.has(d));
  }
  const resolved = new Set<string>();
  let progress = true;
  while (progress) {
    progress = false;
    for (const area of areas) {
      if (resolved.has(area.name)) continue;
      if (area.dependsOn.every((d) => resolved.has(d))) {
        resolved.add(area.name);
        progress = true;
      }
    }
  }
  for (const area of areas) {
    if (resolved.has(area.name)) continue;
    problems.push(`${area.name}: dependsOn cycle (${area.dependsOn.join(", ")}) — running it without waiting`);
    area.dependsOn = [];
  }
}

/** Parse prior-round findings; malformed entries are skipped, never crash the run. */
function parseFindings(raw: unknown): EngineFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: EngineFinding[] = [];
  raw.forEach((entry) => {
    if (typeof entry !== "object" || entry === null) return;
    const o = entry as Record<string, unknown>;
    if (typeof o.where !== "string" || typeof o.what !== "string") return;
    out.push({
      where: o.where,
      what: o.what,
      evidence: typeof o.evidence === "string" ? o.evidence : "",
      status: o.status === "verified" ? "verified" : "unconfirmed",
      severity: o.severity === "high" || o.severity === "medium" ? o.severity : "low",
      area: typeof o.area === "string" ? o.area : "",
      round: typeof o.round === "number" ? o.round : 1,
    });
  });
  return out;
}

/** Extract a web URL from the task or area routing; the fallback vision-lane heuristic, not a routing decision in itself. */
function webUrl(task: string, area: AreaSpec): string | undefined {
  const m = /(https?:\/\/[^\s"'()]+)/.exec(`${task} ${area.name} ${area.paths.join(" ")}`);
  return m === null ? undefined : m[0];
}

/** One card for the status board. */
function statusCard(name: string, round: number, status: "working" | "passed" | "unverified" | "failed", note: string): AreaStatus {
  return { key: name, name, status, note, round };
}

/** The honest refusal when the chain has already spent its round budget. */
function capReachedReport(mode: string, round: number, maxRounds: number): WorkflowReport {
  return {
    conclusion:
      `Refused to run ${mode} round ${round}: the round cap is ${maxRounds}. Nothing ran in this node; ` +
      "the chain coordinator must decide whether the cap should rise.",
    findings: [],
    verified: [],
    notCovered: [`everything — the round cap (${maxRounds}) was already reached before this node started`],
  };
}

// ---------------------------------------------------------------------------
// Arguments in, board declared, then one branch per mode.
// ---------------------------------------------------------------------------

const mode = typeof args.mode === "string" ? args.mode : "";
if (mode !== "implement" && mode !== "judge" && mode !== "vision") {
  return {
    conclusion: `Refused to start: mode must be "implement", "judge", or "vision" (got ${JSON.stringify(mode)}). Nothing ran.`,
    findings: [],
    verified: [],
    notCovered: ["everything — the engine was launched with an invalid mode"],
  };
}
const tier = typeof args.tier === "string" ? args.tier : "";
if (tier !== "flash" && tier !== "pro") {
  return {
    conclusion: `Refused to start: tier must be "flash" or "pro" (got ${JSON.stringify(tier)}). Nothing ran.`,
    findings: [],
    verified: [],
    notCovered: ["everything — the engine was launched with an invalid tier"],
  };
}
const task = typeof args.task === "string" ? args.task : "";
if (task.length === 0) {
  return {
    conclusion: "Refused to start: task must be a non-empty string. Nothing ran.",
    findings: [],
    verified: [],
    notCovered: ["everything — the engine was launched without a task"],
  };
}
const parsedAreas = parseAreas(args.areas);
const areas = parsedAreas.areas;
const problems = parsedAreas.problems;
const evidence = stringArray(args.evidence, problems, "evidence");
const prior = parseFindings(args.findings);
const maxRounds = Math.max(1, Math.floor(typeof args.maxRounds === "number" ? args.maxRounds : 3));
const round = prior.length > 0 ? Math.max(...prior.map((f) => f.round)) + 1 : 1;
// commit defaults to true; only an explicit false skips the implement-mode commit phase.
const doCommit = args.commit !== false;
// Size budget: the script measures diffs itself (git numstat) — an agent never vouches for its own size.
const maxLines = Math.max(1, Math.floor(typeof args.maxLines === "number" ? args.maxLines : DEFAULT_MAX_LINES));
const maxFiles = Math.max(1, Math.floor(typeof args.maxFiles === "number" ? args.maxFiles : DEFAULT_MAX_FILES));
// AGENTS.md: its path rides every spawned subagent's ask; the file must exist for the injection to be honest.
const agentsMdPath = typeof args.agentsMd === "string" ? args.agentsMd : "AGENTS.md";
let agentsMdLoaded = false;
if (agentsMdPath !== "") {
  try {
    const text = await files.read(agentsMdPath);
    agentsMdLoaded = text.trim().length > 0;
  } catch {
    agentsMdLoaded = false;
  }
}
// The chain's starting sha, recorded by the coordinator at prep; judge size evidence is measured against it.
const baseSha = typeof args.baseSha === "string" ? args.baseSha.trim() : "";

if (areas.length === 0) {
  return {
    conclusion: `No usable areas to process (${problems.length > 0 ? problems.join("; ") : "areas is empty"}). Nothing ran.`,
    findings: [],
    verified: [],
    notCovered: ["everything — no usable areas were routed to this node"],
  };
}

// The watcher's view: one card per area, moving columns as the run decides.
artifact.board("status", {
  title: "Areas by status",
  key: "key",
  status: "status",
  columns: ["working", "passed", "unverified", "failed"],
  cardTitle: "name",
  detail: [
    { field: "note", label: "Note" },
    { field: "round", label: "Round" },
  ],
});

// ===========================================================================
// IMPLEMENT: one implementer per area (routing order, deps chained per item),
// gates through the allowlist switch, fix rounds on the same implementer,
// then one serialized commit phase with the shared Committer.
// ===========================================================================

if (mode === "implement") {
  if (round > maxRounds) return capReachedReport("implement", round, maxRounds);

  phase("Implement each area and run its checks");
  log(`implementing ${areas.length} area(s) on round ${round} (cap ${maxRounds})`);
  const byName = new Map(areas.map((a) => [a.name, a] as const));
  const running = new Map<string, Promise<AreaOutcome>>();

  // Commits happen per green round inside each area's loop — one shared Committer, one serialized
  // git queue, one commit per green round (never a multi-round union commit), each within the
  // area's size budget. A fix round is defined by confirmed findings — unconfirmed ones never
  // drive fix semantics. commit=false skips every commit: work stays on disk, and the report says so.
  const fixRound = prior.some((f) => f.status === "verified");
  const committer = doCommit ? agent("Committer", COMMITTER_PERSONA) : undefined;
  // The repo's own recent history, so the Committer can match its message style.
  const recentLog = await gitRun(["log", "--oneline", "-10"]);
  const logBlock =
    recentLog.ran && recentLog.exitCode === 0 && recentLog.output.trim().length > 0
      ? recentLog.output.trim()
      : "(no usable git log output — draft from the task and file list alone)";
  const commitFailures: string[] = [];

  // One commit per green round: the shared Committer drafts, the script mutates git — explicit
  // paths only, serialized, never --no-verify, never push. Returns the commit's short sha ("" when
  // git failed; the round's work then stays on disk, uncommitted) and a one-line note for the report.
  const commitRound = async (
    area: AreaSpec,
    roundNo: number,
    files: string[],
    summary: string,
  ): Promise<{ sha: string; note: string }> => {
    if (committer === undefined) throw new Error("commit phase disabled (commit=false)");
    const draft = await committer.ask<CommitDraft>(
      [
        `Draft one commit message for area "${area.name}", round ${roundNo}, of this task.`,
        `Task: ${task}`,
        `What was done this round: ${summary}`,
        `Files (exact paths, in this order): ${files.join(", ")}`,
        fixRound ? "This is a fix round; start the subject with \"fix: \"." : "This is an implementation round; match the repo's conventional style.",
        `Recent commits in this repo (match their style):\n${logBlock}`,
        agentsMdLine(),
        "Return the message only.",
      ]
        .filter((line) => line !== "")
        .join("\n"),
    );
    // Runtime guard: the type says string, but a malformed reply must fall through to the
    // fallback, not throw on .trim() before the fallback can run.
    const draftText = typeof draft.message === "string" ? draft.message.trim() : "";
    let message = draftText;
    if (message === "") message = `${area.name} r${roundNo}: ${task.slice(0, 60)}`;
    if (fixRound && !message.startsWith("fix:")) message = `fix: ${message}`;
    const add = await serializedGit(() => gitRun(["add", ...files]));
    let note = `r${roundNo}: git add (${files.join(", ")}) → ${add.ran ? `exit ${add.exitCode}` : "did not run"}`;
    if (!(add.ran && add.exitCode === 0)) {
      note += ` — ${add.output}`;
      return { sha: "", note };
    }
    const commit = await serializedGit(() => gitRun(["commit", "-m", message, "--", ...files]));
    note += `; git commit ("${message}") → ${commit.ran ? `exit ${commit.exitCode}` : "did not run"}`;
    if (commit.ran && commit.exitCode !== 0) note += ` — ${commit.output}`;
    let sha = "";
    if (commit.ran && commit.exitCode === 0) {
      // The short sha rides the typed return (ImplementAreaHandoff.commitShas); it comes from commit stdout.
      sha = shortSha(commit.output);
      note += sha === "" ? " — commit sha could not be parsed from git's output" : `; sha ${sha}`;
    }
    return { sha, note };
  };

  const runArea = (area: AreaSpec): Promise<AreaOutcome> => {
    const started = running.get(area.name);
    if (started !== undefined) return started;
    const promise = (async (): Promise<AreaOutcome> => {
      for (const dep of area.dependsOn) {
        const depArea = byName.get(dep);
        if (depArea !== undefined) await runArea(depArea);
      }
      report(statusCard(area.name, round, "working", "implementation under way"), "status");
      try {
        // One implementer per area, reused across every round of this run.
        const implementer = agent(`implementer-${area.name}`, IMPLEMENTER_PERSONA);
        const areaPrior = prior.filter((f) => f.area === area.name || f.area === "");
        // Only confirmed findings are fix targets; unconfirmed ones stay labelled context (unverified stays unverified).
        const fixTargets = areaPrior.filter((f) => f.status === "verified");
        const advisory = areaPrior.filter((f) => f.status === "unconfirmed");
        // Size budget: the per-area override when the coordinator set one, else the run's defaults.
        const budget = area.budget ?? { maxLines, maxFiles };
        let work: AreaWork | undefined;
        // Every round's changed files, first-seen order, exclusions applied: what the report and handoff carry.
        const changedUnion: string[] = [];
        // Same union for skipped items: an earlier round's left-undone list must survive later rounds.
        const skippedUnion: string[] = [];
        // Files changed since this area's last commit: the per-round commit set and the size gate's subject.
        // Cleared when a green round commits; red rounds let it accumulate so the budget bounds uncommitted work.
        let pendingFiles: string[] = [];
        const commitShas: string[] = [];
        const areaCommitNotes: string[] = [];
        const sizeFindings: EngineFinding[] = [];
        let gates: GateOutcome[] = [];
        let gatesGreen = false;
        let stagnated = false;
        let overBudget = false;
        let roundsUsed = 0;
        let prevFailing = Number.MAX_SAFE_INTEGER;
        let stagnantRun = 0;
        let sizeStall = 0;
        let lastSize: { files: number; added: number; deleted: number } | undefined;
        let lastOver = false;
        for (let r = 1; r <= maxRounds; r++) {
          roundsUsed = r;
          const ask = r === 1 ? implementAsk(area, task, fixTargets, advisory, round, budget) : fixAsk(area, task, gates, budget, lastSize);
          work = await implementer.ask<AreaWork>(ask);
          for (const p of work.changedFiles) {
            if (area.excludedPaths.includes(p)) continue;
            if (!changedUnion.includes(p)) changedUnion.push(p); // earlier rounds' files stay in the reported set
            if (!pendingFiles.includes(p)) pendingFiles.push(p); // uncommitted work accumulates only across red rounds
          }
          for (const s of work.skipped) {
            if (!skippedUnion.includes(s)) skippedUnion.push(s); // earlier rounds' skipped items stay visible
          }
          gates = await runAllGates(area);
          const failing = gates.filter((g) => !(g.ran && g.exitCode === 0)).length;
          // Size gate: the script measures the uncommitted delta itself (git numstat vs this round's start sha).
          const head = await gitRun(["rev-parse", "HEAD"]);
          const roundStartSha = head.ran && head.exitCode === 0 ? head.output.split("\n")[0].trim() : "";
          lastSize = roundStartSha !== "" && pendingFiles.length > 0 ? await measureSize(pendingFiles, roundStartSha) : undefined;
          lastOver = lastSize !== undefined && (lastSize.added + lastSize.deleted > budget.maxLines || lastSize.files > budget.maxFiles);
          log(
            `${area.name}: round ${r}, ${failing} of ${gates.length} gate(s) red` +
              (lastSize !== undefined
                ? `, size ${lastSize.files} file(s) +${lastSize.added}/−${lastSize.deleted} (budget ${budget.maxLines} lines / ${budget.maxFiles} files)${lastOver ? " — OVER BUDGET" : ""}`
                : ""),
          );
          if (gates.length === 0) break; // no gates declared: nothing to gate rounds on, and the engine commits only gate-verified areas
          if (failing === 0 && !lastOver) {
            gatesGreen = true;
            // One commit per green round — this round's delta only, never a multi-round union commit.
            if (doCommit && pendingFiles.length > 0) {
              try {
                const done = await commitRound(area, r, pendingFiles, work.summary);
                areaCommitNotes.push(done.note);
                if (done.sha !== "") {
                  commitShas.push(done.sha);
                  pendingFiles = []; // committed: the next round's size gate measures only new work
                } else {
                  commitFailures.push(`${area.name}: round ${r} commit failed — its green work stays on disk, uncommitted`);
                }
              } catch (error) {
                const note = `round ${r} commit not made — ${String(error)}; its green work stays on disk, uncommitted`;
                areaCommitNotes.push(note);
                commitFailures.push(`${area.name}: ${note}`);
                log(`${area.name}: ${note}`);
              }
            }
            break;
          }
          if (lastOver && lastSize !== undefined) {
            // Over budget is a red round in its own right: verified finding, shrink-or-split ask, stall-counted exit.
            overBudget = true;
            const f = sizeFinding(area, round, lastSize, budget);
            sizeFindings.push(f);
            report(f);
            sizeStall = sizeStall + 1;
          } else {
            sizeStall = 0;
          }
          stagnantRun = failing < prevFailing ? 0 : stagnantRun + 1;
          prevFailing = failing;
          if (stagnantRun >= 2 || sizeStall >= 2) {
            stagnated = stagnantRun >= 2; // two rounds without a shrinking failure count — or two consecutive over-budget rounds: stop, report honestly
            break;
          }
        }
        const changed = changedUnion;
        const finalFindings = [...gates.filter((g) => g.ran && g.exitCode !== 0).map((g) => gateFinding(area, round, g)), ...sizeFindings];
        for (const f of finalFindings) report(f);
        const sizeNote =
          lastSize === undefined
            ? ""
            : `${lastSize.files} file(s), +${lastSize.added}/−${lastSize.deleted} — budget ${budget.maxLines} lines / ${budget.maxFiles} files${lastOver ? " — OVER BUDGET" : ""}`;
        let commitNote = areaCommitNotes.join("; ");
        if (commitNote === "" && pendingFiles.length > 0 && gates.length > 0) {
          commitNote = doCommit
            ? "not committed — gates still red or over size budget; work stays on disk, uncommitted"
            : "skipped (commit=false) — work stays on disk, uncommitted";
        }
        report(
          statusCard(
            area.name,
            round,
            gates.length === 0 ? "unverified" : gatesGreen ? "passed" : "failed",
            gates.length === 0
              ? "unverified (no gates declared)"
              : gatesGreen
                ? "all gates green"
                : stagnated
                  ? "stopped: two rounds without improvement"
                  : overBudget
                    ? "stopped: over size budget two rounds — split the area"
                    : "stopped: round cap reached",
          ),
          "status",
        );
        return {
          area: area.name,
          gatesGreen,
          gates,
          rounds: roundsUsed,
          stagnated,
          summary: work?.summary ?? "no summary reported",
          notes: work?.notes ?? "",
          commitSha: commitShas.length > 0 ? commitShas[commitShas.length - 1] : "",
          commitShas,
          changedFiles: changed,
          skipped: skippedUnion,
          commitNote,
          overBudget,
          sizeNote,
          findings: finalFindings,
        };
      } catch (error) {
        report(statusCard(area.name, round, "failed", `area errored: ${String(error)}`), "status");
        return {
          area: area.name,
          gatesGreen: false,
          gates: [],
          rounds: 0,
          stagnated: false,
          summary: "",
          notes: "",
          commitSha: "",
          commitShas: [],
          changedFiles: [],
          skipped: [],
          commitNote: "",
          overBudget: false,
          sizeNote: "",
          findings: [],
          error: String(error),
        };
      }
    })();
    running.set(area.name, promise);
    return promise;
  };

  const outcomes = await Promise.all(areas.map(runArea));

  const green = outcomes.filter((o) => o.gatesGreen);
  const errored = outcomes.filter((o) => o.error !== undefined);
  const gateless = outcomes.filter((o) => o.gates.length === 0 && o.error === undefined);
  const red = outcomes.filter((o) => o.gates.length > 0 && !o.gatesGreen);
  const allFindings = outcomes.flatMap((o) => o.findings);
  const notCovered: string[] = [...problems, ...commitFailures];
  if (agentsMdPath !== "" && !agentsMdLoaded) notCovered.push(`${agentsMdPath}: not found or empty — the repo's hard rules were not injected into subagent asks`);
  for (const o of outcomes) {
    if (o.commitNote.startsWith("skipped")) notCovered.push(`${o.area}: ${o.commitNote}`);
    for (const g of o.gates) {
      if (!g.ran) notCovered.push(`${o.area}: gate ${g.argv} did not run — ${g.failure}`);
    }
    if (o.error !== undefined) {
      notCovered.push(`${o.area}: area errored — ${o.error}`);
    } else if (o.gates.length > 0 && !o.gatesGreen) {
      notCovered.push(
        `${o.area}: still red after ${o.rounds} round(s)${o.stagnated ? " (stopped: no improvement for two rounds)" : ""} — half-done work is on disk, never claimed clean`,
      );
    }
    if (o.gates.length === 0) notCovered.push(`${o.area}: unverified (no gates declared) — its work is unverified by commands`);
    for (const s of o.skipped) notCovered.push(`${o.area}: left undone — ${s}`);
    if (o.notes.trim().length > 0) notCovered.push(`${o.area}: implementer notes — ${o.notes.trim()}`);
  }

  await artifact.markdown(
    "report",
    [
      `# zflow implement — round ${round} of at most ${maxRounds}`,
      "",
      `Task: ${task}`,
      `Tier: ${tier}. Areas: ${areas.length} (${green.length} green, ${red.length} red, ${gateless.length} unverified — no gates declared${errored.length > 0 ? `, ${errored.length} errored` : ""}). ${outcomes.reduce((n, o) => n + o.commitShas.length, 0)} commit(s) — one per green round, size-budgeted.`,
      "",
      "## Areas",
      ...outcomes.flatMap((o) => [
        `### ${o.area} — ${o.error !== undefined ? "errored" : o.gatesGreen ? "all gates green" : o.gates.length === 0 ? "unverified (no gates declared)" : o.overBudget ? "gates red / over size budget" : "gates red"}`,
        `- Rounds used: ${o.rounds}${o.stagnated ? " (stopped early: two rounds without improvement)" : o.overBudget && !o.gatesGreen ? " (stopped early: over size budget two rounds — split the area)" : ""}`,
        `- Summary: ${o.summary}`,
        ...(o.notes.trim().length > 0 ? [`- Notes: ${o.notes.trim()}`] : []),
        ...o.gates.map((g) => `- Gate ${g.argv}: ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` — ${g.failure}`}`),
        ...(o.sizeNote !== "" ? [`- Size: ${o.sizeNote}`] : []),
        o.changedFiles.length > 0 ? `- Changed: ${o.changedFiles.join(", ")}` : "- No file changes reported",
        o.commitNote !== ""
          ? `- Commit: ${o.commitNote}`
          : o.gates.length === 0
            ? "- Not committed (no gates declared — the engine commits only gate-verified areas)"
            : "- Not committed (red gates keep their work on disk)",
        ...(o.error !== undefined ? [`- Error: ${o.error}`] : []),
      ]),
      "",
      "## Findings still standing",
      ...(allFindings.length > 0
        ? allFindings.map((f) => `- **${f.where}** (${f.severity}, ${f.status}): ${f.what}\n  - ${f.evidence}`)
        : ["- none"]),
      "",
      "## Not covered",
      ...(notCovered.length > 0 ? notCovered.map((n) => `- ${n}`) : ["- nothing notable"]),
    ].join("\n"),
    {
      title: `zflow implement report — round ${round}`,
      description: `Per-area gate results, commits, and standing findings for ${areas.length} area(s).`,
      primary: true,
    },
  );

  const handoffs: ImplementAreaHandoff[] = outcomes.map((o) => ({
    area: o.area,
    changedFiles: o.changedFiles,
    summary: o.summary,
    commitSha: o.commitSha,
    commitShas: o.commitShas,
    notes: o.notes,
  }));

  const sizeStopped = outcomes.filter((o) => o.overBudget && !o.gatesGreen);
  const result: WorkflowReport = {
    conclusion:
      areas.length - green.length === 0
        ? `Implemented all ${areas.length} area(s) with every gate green on round ${round}; ${outcomes.reduce((n, o) => n + o.commitShas.length, 0)} size-budgeted commit(s) made — one per green round. ${allFindings.length} finding(s) stand.`
        : `${green.length} of ${areas.length} area(s) finished with all gates green; ${red.length} still red after their round budgets — their half-done work stays on disk and is listed, never claimed clean${sizeStopped.length > 0 ? `; ${sizeStopped.length} stopped over their size budget — split them before relaunching` : ""}; ${gateless.length} unverified (no gates declared)${errored.length > 0 ? `; ${errored.length} errored during implementation` : ""}. ${outcomes.reduce((n, o) => n + o.commitShas.length, 0)} size-budgeted commit(s) made — one per green round.`,
    findings: allFindings,
    areas: handoffs,
    verified: [
      ...outcomes.flatMap((o) => o.gates.filter((g) => g.ran).map((g) => `${g.argv} → exit ${g.exitCode} (area ${o.area})`)),
      ...outcomes.flatMap((o) => (o.commitShas.length > 0 ? [`${o.area}: ${o.commitNote}`] : [])),
    ],
    notCovered,
  };
  return result;
}

// ===========================================================================
// VISION: web areas through agent-browser sessions, desktop areas through ocu
// (AX text plus base64-decoded pixel PNGs), evidence under .zflow/evidence/,
// then a tier-aware audit of what landed.
// ===========================================================================

if (mode === "vision") {
  if (round > maxRounds) return capReachedReport("vision", round, maxRounds);

  const uiAreas = areas.filter((a) => a.hasUI);
  const skippedAreas = areas.filter((a) => !a.hasUI).map((a) => `${a.name}: no UI surface declared — vision does not apply`);
  if (uiAreas.length === 0) {
    return {
      conclusion: `No UI areas to capture: ${skippedAreas.join("; ")}. Nothing ran.`,
      findings: [],
      verified: [],
      notCovered: [...skippedAreas, ...problems],
    };
  }

  phase("Capture and audit the visual evidence for each UI area");
  log(`capturing evidence for ${uiAreas.length} UI area(s) on round ${round}`);
  const visionResults = await Promise.all(
    uiAreas.map(async (area): Promise<VisionAreaResult> => {
      report(statusCard(area.name, round, "working", "capturing evidence"), "status");
      // Lane: the area's explicit lane when the coordinator set one, else the URL heuristic.
      const url = webUrl(task, area);
      const lane: "web" | "desktop" = area.lane ?? (url === undefined ? "desktop" : "web");
      try {
        // Prior-round evidence for THIS area only, anchored to its file prefix so sibling areas' shots never leak in.
        const priorForArea = evidence.filter((p) => p.startsWith(`${EVIDENCE_DIR}/${area.name}-r`));
        const priorFindings = prior.filter((f) => f.area === area.name);
        const capture = await agent(`capture-${area.name}-r${round}`, CAPTURE_PERSONA).ask<CaptureResult>(
          lane === "web"
            ? captureAskWeb(area, round, url ?? "", priorForArea)
            : captureAskDesktop(area, task, round, priorForArea),
        );
        // The filesystem is the truth: onDisk comes from the script's own glob, never the agent's claim.
        const landed = (await files.glob(`${EVIDENCE_DIR}/*`)).filter((p) =>
          p.startsWith(`${EVIDENCE_DIR}/${area.name}-r${round}-`),
        );
        const onDisk = landed.length > 0;
        const toAudit = onDisk ? landed : capture.evidencePaths; // audited anyway; the auditor reports what it cannot read
        const audit = await agent(`vision-audit-${area.name}-r${round}`, auditPersona(tier)).ask<VisionAudit>(
          auditAsk(area, task, toAudit, priorForArea, priorFindings, round, capture.notes),
        );
        const findings: EngineFinding[] = audit.findings.map((f) => ({
          ...f,
          status: "unconfirmed", // advisory context for the next implement round; a re-shoot verifies it — vision never self-confirms
          area: area.name,
          round,
        }));
        for (const f of findings) report(f);
        report(
          statusCard(
            area.name,
            round,
            onDisk ? "passed" : "failed",
            onDisk
              ? `${landed.length} evidence file(s) confirmed on disk and audited`
              : `no evidence found on disk${capture.evidencePaths.length > 0 ? ` (agent claimed: ${capture.evidencePaths.join(", ")})` : ""}`,
          ),
          "status",
        );
        return { area: area.name, lane, evidence: toAudit, onDisk, verdict: audit.verdict, findings };
      } catch (error) {
        report(statusCard(area.name, round, "failed", `capture or audit errored: ${String(error)}`), "status");
        return { area: area.name, lane, evidence: [], onDisk: false, verdict: `errored: ${String(error)}`, findings: [] };
      }
    }),
  );

  const allFindings = visionResults.flatMap((r) => r.findings);
  const captured = visionResults.filter((r) => r.onDisk);
  const notCovered: string[] = [...problems, ...skippedAreas];
  if (agentsMdPath !== "" && !agentsMdLoaded) notCovered.push(`${agentsMdPath}: not found or empty — the repo's hard rules were not injected into subagent asks`);
  for (const r of visionResults) {
    if (!r.onDisk) notCovered.push(`${r.area}: no evidence confirmed on disk — nothing this run can vouch for was audited`);
  }
  if (tier === "pro") {
    notCovered.push("pixel content of screenshots: this run's tier is image-blind; pixels were readable only if the auditor escalated for them");
  }
  if (allFindings.length > 0) {
    notCovered.push(
      "independent confirmation of the vision findings: none exists in this run — pixel findings carry into the next implement round as advisory context and are verified by re-shoot",
    );
  }

  await artifact.markdown(
    "report",
    [
      `# zflow vision — round ${round}`,
      "",
      `Task: ${task}`,
      `Tier: ${tier} (${tier === "flash" ? "reads pixels natively" : "image-blind; pixel checks only via escalation"}).`,
      `UI areas: ${visionResults.length} (${captured.length} with evidence on disk).`,
      "",
      "## UI areas",
      ...visionResults.flatMap((r) => [
        `### ${r.area} (${r.lane})`,
        `- Evidence: ${r.evidence.length > 0 ? r.evidence.join(", ") : "none"}`,
        `- Verdict: ${r.verdict}`,
        ...(r.findings.length > 0
          ? r.findings.map((f) => `- **${f.where}** (${f.severity}, ${f.status}): ${f.what}\n  - ${f.evidence}`)
          : ["- no findings from the evidence"]),
      ]),
      "",
      "## Not covered",
      ...(notCovered.length > 0 ? notCovered.map((n) => `- ${n}`) : ["- nothing notable"]),
    ].join("\n"),
    {
      title: `zflow vision report — round ${round}`,
      description: `What the screenshots and AX snapshots show for ${visionResults.length} UI area(s); findings carry into the next implement round as advisory context and are verified by re-shoot.`,
      primary: true,
    },
  );

  const handoffs: VisionAreaHandoff[] = visionResults.map((r) => ({
    area: r.area,
    lane: r.lane,
    verdict: r.verdict,
    evidence: r.evidence,
  }));

  const result: WorkflowReport = {
    conclusion:
      `Captured and audited evidence for ${captured.length} of ${visionResults.length} UI area(s) on round ${round}: ` +
      `${allFindings.length} finding(s), all unconfirmed — they carry into the next implement round as advisory context, and a re-shoot verifies them.`,
    findings: allFindings,
    areas: handoffs,
    verified: visionResults
      .filter((r) => r.onDisk)
      .map((r) => `${r.area}: evidence confirmed on disk and audited — ${r.evidence.join(", ")}`),
    notCovered,
  };
  return result;
}

// ===========================================================================
// JUDGE: a fresh blind judge per area, gates run once by the script as an
// independent signal, every judge finding confirmed by a separate confirmer;
// unconfirmed findings are labelled, never dropped.
// ===========================================================================

if (round > maxRounds) return capReachedReport("judge", round, maxRounds);

phase("Audit each area with a fresh judge and confirm what is real");
log(`judging ${areas.length} area(s) on round ${round} with fresh judges`);
const judgeResults = await Promise.all(
  areas.map(async (area): Promise<JudgeAreaResult> => {
    report(statusCard(area.name, round, "working", "audit under way"), "status");
    try {
      const persona = judgePersona(tier);
      // Evidence is per-area, anchored to this area's file prefix: one area's screenshots never leak into another's ask.
      const areaEvidence = evidence.filter((p) => p.startsWith(`${EVIDENCE_DIR}/${area.name}-r`));
      // Size evidence, measured by the script vs the chain's start: the blind judge cannot flag
      // magnitude drift it was never shown. No baseSha, no numbers — the line is dropped honestly.
      const size = baseSha !== "" ? await numstatVsBase(baseSha, area) : undefined;
      const budget = area.budget ?? { maxLines, maxFiles };
      const judged = await agent(`judge-${area.name}-r${round}`, persona).ask<JudgeFindings>(
        judgeAsk(area, task, areaEvidence, round, size, budget),
      );
      // Gates run once, by the script, after the blind judge has spoken.
      const gates = await runAllGates(area);
      const gateNotes = gates.map(describeGate).join("\n");
      const fromGates = gates.filter((g) => g.ran && g.exitCode !== 0).map((g) => gateFinding(area, round, g));
      for (const f of fromGates) report(f);
      const confirmed = await Promise.all(
        judged.findings.map(async (f, i): Promise<EngineFinding> => {
          const check = await agent(`confirmer-${area.name}-r${round}-${i}`, CONFIRMER_PERSONA).ask<Confirmation>(
            confirmerAsk(f, gateNotes),
          );
          const ef: EngineFinding = {
            ...f,
            status: check.reproduced ? "verified" : "unconfirmed",
            area: area.name,
            round,
          };
          report(ef); // published the moment its status is known
          return ef;
        }),
      );
      const findings = [...fromGates, ...confirmed];
      report(
        statusCard(
          area.name,
          round,
          gates.length === 0 ? "unverified" : fromGates.length > 0 ? "failed" : "passed", // never claim clean while a gate is red; no gates = unverified
          gates.length === 0
            ? "unverified (no gates declared)"
            : `${confirmed.length} judge finding(s) (${findings.filter((f) => f.status === "verified").length} verified), ${fromGates.length} red gate(s)`,
        ),
        "status",
      );
      return { area: area.name, overallNote: judged.overallNote, gates, findings };
    } catch (error) {
      report(statusCard(area.name, round, "failed", `audit errored: ${String(error)}`), "status");
      return { area: area.name, overallNote: `errored: ${String(error)}`, gates: [], findings: [] };
    }
  }),
);

const allFindings = judgeResults.flatMap((r) => r.findings);
const verifiedCount = allFindings.filter((f) => f.status === "verified").length;
const unconfirmedCount = allFindings.length - verifiedCount;
const redGates = judgeResults.flatMap((r) => r.gates.filter((g) => g.ran && g.exitCode !== 0));
const notCovered: string[] = [...problems];
if (agentsMdPath !== "" && !agentsMdLoaded) notCovered.push(`${agentsMdPath}: not found or empty — the repo's hard rules were not injected into subagent asks`);
for (const r of judgeResults) {
  for (const g of r.gates) {
    if (!g.ran) notCovered.push(`${r.area}: gate ${g.argv} did not run — ${g.failure}`);
  }
  if (r.gates.length === 0) notCovered.push(`${r.area}: unverified (no gates declared) — judged on code and text evidence only`);
}
if (tier === "pro") {
  notCovered.push("pixel content of screenshots: the judge tier is image-blind; pixels were readable only if a judge escalated for them");
}

await artifact.markdown(
  "report",
  [
    `# zflow judge — round ${round} of at most ${maxRounds}`,
    "",
    `Task: ${task}`,
    `Tier: ${tier}. Areas judged: ${judgeResults.length}. Findings: ${allFindings.length} ` +
      `(${verifiedCount} verified, ${unconfirmedCount} unconfirmed — kept and labelled, never dropped).`,
    "",
    "## Areas",
    ...judgeResults.flatMap((r) => [
      `### ${r.area}`,
      `- Judge's note: ${r.overallNote}`,
      ...r.gates.map((g) => `- Gate ${g.argv}: ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` — ${g.failure}`}`),
      ...(r.findings.length > 0
        ? r.findings.map((f) => `- **${f.where}** (${f.severity}, ${f.status}): ${f.what}\n  - ${f.evidence}`)
        : ["- no findings"]),
    ]),
    "",
    "## Not covered",
    ...(notCovered.length > 0 ? notCovered.map((n) => `- ${n}`) : ["- nothing notable"]),
  ].join("\n"),
  {
    title: `zflow judge report — round ${round}`,
    description: `Confirmed and unconfirmed findings across ${judgeResults.length} area(s); verified counts feed the chain's loop policy.`,
    primary: true,
  },
);

const result: WorkflowReport = {
  conclusion:
    allFindings.length === 0
      ? `Judged all ${judgeResults.length} area(s) on round ${round}: no findings stood, and every gate that ran was green.`
      : `Judged ${judgeResults.length} area(s) on round ${round}: ${allFindings.length} finding(s) — ${verifiedCount} verified, ` +
        `${unconfirmedCount} unconfirmed (kept and labelled) — plus ${redGates.length} red gate(s). High+medium verified counts drive the chain's fix rounds.`,
  findings: allFindings,
  verified: [
    ...judgeResults.flatMap((r) => r.gates.filter((g) => g.ran).map((g) => `${g.argv} → exit ${g.exitCode} (area ${r.area})`)),
    `${verifiedCount} of ${allFindings.length} finding(s) reproduced by a separate confirmer subagent`,
  ],
  notCovered,
};
return result;
