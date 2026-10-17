/* zcode-workflow
description: "Shipflow queue cycle: claims one pipeline:ready issue, re-triages it, plans areas, implements them through allowlisted gates with size-budgeted commits, captures browser and vision evidence on the preview, opens a PR, audits the diff, merges only when code-verified POLICY passes, swaps the queue labels, and writes the .shipflow cycle report the watchdog watches. One cycle per run - the coordinator provides the loop."
whenToUse: "Launched by the shipflow coordinator once per pipeline:ready issue. Text personas use the pro or flash profile; vision keeps its file-declared model. Assumes the shipflow label set."
args:
  issueNumber:
    type: number
    description: "The pipeline:ready issue this cycle claims."
    required: true
  repo:
    type: string
    description: "The project repository as OWNER/NAME, passed to gh."
    required: true
  tier:
    type: string
    description: "flash or pro - profile for text personas in this cycle; vision uses its file-declared model."
    required: true
  task:
    type: string
    description: "The issue title and body, verbatim."
    required: true
  areas:
    type: json
    description: "The planner's area array when the coordinator has one (a retry), or [] to plan in-run. Per area: name, paths, excludedPaths, specialist (discovered z-* agent basename), named domain skill paths, gates [{tool, args}], complexity straightforward|complex, hasUI, dependsOn, budget {maxLines, maxFiles}. Gate tools non-mutating, from: npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git (read-only subcommands only). Audited in-run either way."
    required: true
  agentsMd:
    type: string
    description: "Path to the project's AGENTS.md, injected into every spawned ask. Default AGENTS.md; empty string disables."
    required: false
    default: "AGENTS.md"
  agentDir:
    type: string
    description: "Optional absolute path to the checked workspace's local agent definitions. Default: <git workspace root>/.zcode/agents."
    required: false
  repoRoot:
    type: string
    description: "Optional absolute path to the checked git workspace root. Default: discover from the current directory."
    required: false
  baseSha:
    type: string
    description: "The cycle's starting sha; audit and size evidence measure against it. Recorded from HEAD at claim when omitted."
    required: false
  maxRounds:
    type: number
    description: "Gate/fix round cap per area, enforced in code. Default 3."
    required: false
    default: 3
  commit:
    type: boolean
    description: "Default true: one size-budgeted commit per green round, drafted by the Committer, executed by the script. False leaves work on disk, uncommitted; the report says so."
    required: false
    default: true
  dryRun:
    type: boolean
    description: "Full cycle except PR create and merge; the report says the PR steps were skipped."
    required: false
    default: false
*/

// ---- Types. JSDoc on every field: it is the field description the subagent reads. ----

/** One planned area of the issue (the task-planner's shape). */
interface AreaSpec {
  /** Short unique name; keys subagent names and hand-offs. */
  name: string;
  /** Workspace-relative paths in scope. */
  paths: string[];
  /** Paths this area must never touch. */
  excludedPaths: string[];
  /** Absolute SKILL.md paths the implementer reads and follows. */
  skills: string[];
  /** Non-mutating gates { tool (allowlisted), args }; dispatched through the allowlist switch. */
  gates: { tool: string; args: string[] }[];
  /** Routing hint; complex areas get more careful asks. */
  complexity: "straightforward" | "complex";
  /** True when the area has a UI surface the preview can show. */
  hasUI: boolean;
  /** Areas routed before this one (the planner emits ordered siblings). */
  dependsOn: string[];
  specialist: string;
  /** Optional per-area size budget overriding the run defaults (400 lines / 10 files). */
  budget?: { maxLines: number; maxFiles: number };
}

/** The dynamic-workflows Finding convention. */
interface Finding { /** Workspace-relative path, with a line when it applies: "src/a.ts:42". */ where: string; /** One sentence: what is wrong, or what was found. */ what: string; /** What showed it: the lines read, the command and its output, or the evidence path that proves it. */ evidence: string; /** Only command evidence is verified; agent assessments remain judged or unconfirmed. */ status: "verified" | "judged" | "unconfirmed"; /** How much it matters: high = blocker, medium = major, low = nit. */ severity: "low" | "medium" | "high"; }

/** One gate command's outcome, as executed by the script (never by a subagent). */
interface GateOutcome { /** Tool name. */ tool: string; /** Full command line as run. */ argv: string; /** False when skipped or could not run. */ ran: boolean; /** Exit code; -1 when it never ran. */ exitCode: number; /** Failure tail, or why it did not run. */ failure: string; }

/** What one implementer hands back after a round. */
interface AreaWork { /** One or two sentences: what was done this round. */ summary: string; /** Exact workspace-relative paths changed this round. */ changedFiles: string[]; /** Blocked parts, surprises; "" when none. */ notes: string; /** Left undone, each with a reason. */ skipped: string[]; }

/** gh-ops claim result: the optimistic claim, re-read to verify the win. */
interface ClaimResult { /** True only when the re-read shows pipeline:claimed won the race. */ claimed: boolean; /** The repo's default branch from gh repo view; "" when unreadable. */ defaultBranch: string; /** Resulting URLs/numbers and anything that failed. */ note: string; }

/** The triage gate's re-validation of the claimed issue. */
interface TriageVerdict { /** True only when the issue is actionable by this cycle. */ actionable: boolean; /** Why; when not actionable, the exact question to comment. */ reason: string; }

/** The task-planner's output. */
interface PlannedAreas { /** The areas array; parsed defensively by the script. */ areas: unknown; /** The planner's stated assumptions. */ assumptions: string; }

/** The plan-auditor's verdict. */
interface PlanAudit { /** proceed runs implement; fix-plan re-plans. */ verdict: "proceed" | "fix-plan"; /** Itemized reasons, one per problem. */ reasons: string[]; }

/** A commit message drafted by the Committer. */
interface CommitDraft { /** Full message: subject under 72 characters, short body only when earned. */ message: string; }

/** What gh-ops reports about the started preview. */
interface PreviewInfo { /** The serving URL; "" when no preview could be started. */ url: string; /** The command used and anything worth noting. */ notes: string; }

/** The vision judge's pixel verdicts. */
interface VisionJudgement { /** One verdict per screenshot. */ perImage: { /** Screenshot path judged. */ path: string; /** pass or fail. */ verdict: "pass" | "fail"; /** The pixels or regions that decided it. */ why: string; }[]; /** Overall note. */ notes: string; }

/** What an audit or blind review reports. */
interface AuditFindings { /** Findings, each with where/what/evidence. */ findings: Finding[]; /** The checklist run (security) or the reviewer's overall note. */ note: string; }

/** What a confirmer reports about one finding. */
interface Confirmation { /** True only when reproduced from the evidence alone. */ reproduced: boolean; /** What was checked and seen. */ note: string; }

/** The PR title and body gh-ops drafted; the script creates the PR itself. */
interface PrDraft { /** PR title. */ title: string; /** PR body markdown. */ body: string; }
interface PrReviewState { headRefOid: string; isDraft: boolean; reviewDecision: string; }

/** What the script knows about one area when the gates phase settles. */
interface AreaOutcome { /** Area name. */ area: string; /** True when every gate ran and exited 0 on the final round. */ gatesGreen: boolean; /** Final-round gate outcomes. */ gates: GateOutcome[]; /** True when the area declared no gates - unverified, never claimed clean. */ gateless: boolean; /** Sha(s) of this area's commits (at most one: the green round that ends its loop). */ commitShas: string[]; }

/** The cycle's handoff: the report shape plus the queue keys the coordinator polls. */
interface CycleReport {
  /** Two or three sentences: what this cycle did and how it ended. */
  conclusion: string;
  /** The issue number this cycle claimed. */
  issue: number;
  /** How the cycle ended: merged, open, released, failed, or refused (nothing ran). */
  verdict: "merged" | "open" | "released" | "failed" | "refused";
  /** Short shas of the cycle's commits, one per green round. */
  commits: string[];
  /** The PR URL when one was created; "" otherwise. */
  prUrl: string;
  /** Findings standing at the end, each with evidence and status. */
  findings: Finding[];
  /** Every gate command the cycle ran, with its outcome. */
  gates: GateOutcome[];
  /** Evidence file paths captured this cycle. */
  evidence: string[];
  /** What the cycle checked and how. */
  verified: string[];
  /** What the cycle did not check, and why. */
  notCovered: string[];
}

// ---- Constants and helpers. ----

const GATE_TIMEOUT_MS = 900_000; // real build/test suites are allowed to be slow
const EVIDENCE_DIR = ".zflow/evidence"; // plan section 3 conventions
const CYCLE_DIR = ".shipflow"; // the watchdog heartbeat directory
const READ_ONLY_GIT_SUBCOMMANDS = ["status", "log", "diff", "show", "rev-parse", "ls-files", "check-ignore", "describe", "shortlog", "blame"];
const DEFAULT_MAX_LINES = 400;
const DEFAULT_MAX_FILES = 10;

/** Join ask lines, dropping empties. */
const msg = (parts: string[]): string => parts.filter((p) => p !== "").join("\n");

/** Keep only the string entries of an unknown array; non-strings become problems, never silent drops. */
function stringArray(raw: unknown, problems: string[], label: string): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => {
    if (typeof x === "string") return true;
    problems.push(`${label}: non-string entry dropped`);
    return false;
  });
}

/** Last ~1200 characters of a command's output, trimmed. */
function tail(text: string): string {
  const clean = text.trim();
  return clean.length <= 1200 ? clean : clean.slice(clean.length - 1200);
}

/** Short commit sha from git commit stdout ("[branch a1b2c3d] subject"); "" when absent. */
function shortSha(output: string): string {
  const m = /\[[^\]\s]+\s+([0-9a-f]{7,40})\]/.exec(output);
  return m === null ? "" : m[1];
}

/** True when a gate would mutate the tree (--fix/--write, or a non-read-only git subcommand); such gates never run. */
function gateIsMutating(tool: string, gateArgs: string[]): boolean {
  if (gateArgs.some((a) => a === "--fix" || a === "--write")) return true;
  if (tool !== "git") return false;
  return !READ_ONLY_GIT_SUBCOMMANDS.includes(gateArgs.find((a) => !a.startsWith("-")) ?? "");
}

/** Parse `git diff --numstat` output: "added<TAB>deleted<TAB>path" rows ("-" for binary), summed. */
function parseNumstat(output: string): { files: number; added: number; deleted: number } {
  let files = 0, added = 0, deleted = 0;
  for (const line of output.split("\n")) {
    const m = /^(\d+|-)\t(\d+|-)\t/.exec(line.trim());
    if (m === null) continue;
    files += 1;
    added += m[1] === "-" ? 0 : parseInt(m[1], 10);
    deleted += m[2] === "-" ? 0 : parseInt(m[2], 10);
  }
  return { files, added, deleted };
}

/** Parse an unknown value into areas; malformed entries become problems, never crashes. */
function parseAreas(raw: unknown): { areas: AreaSpec[]; problems: string[] } {
  const areas: AreaSpec[] = [];
  const problems: string[] = [];
  if (!Array.isArray(raw)) {
    problems.push("areas is not an array");
    return { areas, problems };
  }
  const seen = new Set<string>();
  for (const entry of raw) {
    const e = typeof entry === "object" && entry !== null ? entry as Record<string, unknown> : undefined;
    if (e === undefined || typeof e.name !== "string" || e.name === "") {
      problems.push("an areas entry has no usable name - dropped");
      continue;
    }
    if (seen.has(e.name)) {
      problems.push(`duplicate area name "${e.name}" dropped (subagent names must be unique)`);
      continue;
    }
    seen.add(e.name);
    const gates: { tool: string; args: string[] }[] = [];
    if (Array.isArray(e.gates)) {
      for (const g of e.gates) {
        const go = typeof g === "object" && g !== null ? g as Record<string, unknown> : undefined;
        if (go === undefined || typeof go.tool !== "string" || go.tool === "") problems.push(`${e.name}: a gate has no tool - dropped`);
        else gates.push({ tool: go.tool, args: stringArray(go.args, problems, `${e.name}: gate args`) });
      }
    }
    const b = typeof e.budget === "object" && e.budget !== null ? e.budget as Record<string, unknown> : undefined;
    const budget = b !== undefined && typeof b.maxLines === "number" && Number.isFinite(b.maxLines) && typeof b.maxFiles === "number" && Number.isFinite(b.maxFiles) && b.maxLines >= 1 && b.maxFiles >= 1
      ? { maxLines: Math.floor(b.maxLines), maxFiles: Math.floor(b.maxFiles) }
      : undefined;
    if (b !== undefined && budget === undefined) problems.push(`${e.name}: budget needs numeric maxLines/maxFiles >= 1 - ignored`);
    areas.push({
      name: e.name,
      paths: stringArray(e.paths, problems, `${e.name}: paths`),
      excludedPaths: stringArray(e.excludedPaths, problems, `${e.name}: excludedPaths`),
      skills: stringArray(e.skills, problems, `${e.name}: skills`),
      gates,
      complexity: e.complexity === "complex" ? "complex" : "straightforward",
      hasUI: e.hasUI === true,
      dependsOn: stringArray(e.dependsOn, problems, `${e.name}: dependsOn`),
      specialist: typeof e.specialist === "string" ? e.specialist : "",
      budget,
    });
  }
  return { areas, problems };
}

// Git mutations use explicit paths, no bypass flags, no push, and serialized execution.

/** Serialized git queue tail; every mutation waits for the previous one. */
let gitChain: Promise<unknown> = Promise.resolve();

/** Run one git operation at a time. */
function serializedGit<T>(op: () => Promise<T>): Promise<T> {
  const run = gitChain.then(op, op);
  gitChain = run.then(() => undefined, () => undefined);
  return run;
}

/** Execute one git argv array, turning spawn failures into values. */
async function gitRun(gitArgs: string[]): Promise<{ ran: boolean; exitCode: number; output: string }> {
  try {
    const r = await world.run("git", ["-C", workspaceRoot, ...gitArgs]);
    return { ran: true, exitCode: r.exitCode, output: tail(`${r.stdout}\n${r.stderr}`) };
  } catch (error) {
    return { ran: false, exitCode: -1, output: String(error) };
  }
}

/** The script's own size measurement of an uncommitted delta vs a base sha - never trusted to an agent. Untracked files are intent-added first so new work is counted. */
async function measureSize(files: string[], base: string): Promise<{ files: number; added: number; deleted: number }> {
  const others = await gitRun(["ls-files", "--others", "--exclude-standard", "--", ...files]);
  const untracked = others.output.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (others.ran && others.exitCode === 0 && untracked.length > 0) await serializedGit(() => gitRun(["add", "--intent-to-add", "--", ...untracked]));
  return parseNumstat((await gitRun(["diff", "--numstat", base, "--", ...files])).output);
}

/** The AGENTS.md read-first line every spawned ask carries; empty when disabled or missing (recorded in notCovered, never silent). */
function agentsMdLine(): string {
  if (agentsMdPath === "" || !agentsMdLoaded) return "";
  return `Read ${agentsMdPath} first - the project's hard rules bind this task, and every skill it requires you must read and follow too (on top of any skills named here). Use ${workspaceRoot} as the working directory for every local file or repository operation.`;
}

// persona-kit:start v4
const PERSONA_MODELS: Record<string, ModelRef> = {
  "account:zai-individual-coding-plan/GLM-5.3": model("account:zai-individual-coding-plan/GLM-5.3"),
  "account:zai-individual-coding-plan/GLM-5.3$low": model("account:zai-individual-coding-plan/GLM-5.3$low"),
  "account:zai-individual-coding-plan/GLM-5.3$high": model("account:zai-individual-coding-plan/GLM-5.3$high"),
  "account:zai-individual-coding-plan/GLM-5.3$max": model("account:zai-individual-coding-plan/GLM-5.3$max"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash": model("account:zai-individual-coding-plan/GLM-5.3-Flash"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$low": model("account:zai-individual-coding-plan/GLM-5.3-Flash$low"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$high": model("account:zai-individual-coding-plan/GLM-5.3-Flash$high"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$max": model("account:zai-individual-coding-plan/GLM-5.3-Flash$max"),
};

interface Persona {
  name: string;
  path: string;
  sha256: string;
  system: string;
  modelId: string;
  model: ModelRef;
  tools: string[];
  access: "read-only" | "write";
  note: string;
}

interface PersonaFinding {
  where: string;
  what: string;
  evidence: string;
  status: "verified";
}

const personaFindings: PersonaFinding[] = [];
const personaLoaded: Persona[] = [];

function personaField(front: string[], key: string): string {
  for (const line of front) {
    if (line.startsWith(key + ":")) return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

function personaToolList(raw: string): string[] {
  return raw.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^['"]|['"]$/g, "")).filter((t) => t !== "");
}

function personaFailure(path: string, what: string, evidence: string): undefined {
  personaFindings.push({ where: path, what, evidence, status: "verified" });
  return undefined;
}

async function loadPersona(path: string, opts?: { tier?: "any" | "pro" | "flash"; access?: "read-only" | "write" }): Promise<Persona | undefined> {
  const tier = opts?.tier ?? "any";
  const access = opts?.access ?? "read-only";
  if (!["any", "pro", "flash"].includes(tier) || !["read-only", "write"].includes(access)) {
    return personaFailure(path, "Persona authority or tier is invalid; that role did not run", "tier=" + tier + ", access=" + access);
  }
  const read = await world.run("cat", [path]);
  if (read.exitCode !== 0 || read.stdout.trim() === "") {
    return personaFailure(path, "Persona file could not be read; that role did not run", "cat exit " + String(read.exitCode) + ": " + read.stderr.slice(0, 200));
  }
  const lines = read.stdout.split("\n");
  const end = lines[0].trim() === "---" ? lines.indexOf("---", 1) : -1;
  const body = end > 0 ? lines.slice(end + 1).join("\n").trim() : "";
  if (end <= 0 || body === "") {
    return personaFailure(path, "Persona file has no frontmatter or body; that role did not run", "first line " + JSON.stringify(lines[0]) + ", closing marker " + String(end));
  }
  const front = lines.slice(1, end);
  const fileModel = personaField(front, "model");
  const level = personaField(front, "thoughtLevel");
  if (fileModel === "" || !["", "low", "high", "max"].includes(level)) {
    return personaFailure(path, "Persona model or thought level is missing or invalid; that role did not run", "model=" + JSON.stringify(fileModel) + ", thoughtLevel=" + JSON.stringify(level));
  }
  const fileKey = level === "" ? fileModel : fileModel + "$" + level;
  if (PERSONA_MODELS[fileKey] === undefined) {
    return personaFailure(path, "Persona declares an unsupported model; that role did not run", "model key " + JSON.stringify(fileKey));
  }
  let base = fileModel;
  let note = "";
  if (tier !== "any") {
    const forced = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
    if (base !== forced) {
      note = "model forced from " + base + " to " + forced + " by the run's " + tier + " profile";
      base = forced;
    }
  }
  const key = level === "" ? base : base + "$" + level;
  const ref = PERSONA_MODELS[key];
  if (ref === undefined) {
    return personaFailure(path, "Persona model is unsupported by the selected profile; that role did not run", "model key " + JSON.stringify(key));
  }
  const sum = await world.run("shasum", ["-a", "256", path]);
  const digest = sum.stdout.trim().match(/^([a-fA-F0-9]{64})\s/);
  if (sum.exitCode !== 0 || digest === null) {
    return personaFailure(path, "Persona file hash could not be verified; that role did not run", "shasum exit " + String(sum.exitCode) + ": " + sum.stdout.slice(0, 200) + sum.stderr.slice(0, 200));
  }
  const confirmed = await world.run("cat", [path]);
  if (confirmed.exitCode !== 0 || confirmed.stdout !== read.stdout) {
    return personaFailure(path, "Persona changed while loading; that role did not run", "initial and confirmed file contents differ");
  }
  const tools = personaToolList(personaField(front, "tools"));
  const persona: Persona = {
    name: personaField(front, "name") || path.split("/").pop() || path,
    path,
    sha256: digest[1],
    system: body,
    modelId: key,
    model: ref,
    tools,
    access,
    note,
  };
  personaLoaded.push(persona);
  return persona;
}

function personaAgent(p: Persona, name: string, rules?: string): Agent {
  const restrictions = p.access === "read-only" ? "This role is read-only. Do not create, edit, delete, or otherwise change files, Git state, external services, or other external state, even if your persona or available tools suggest otherwise." : "";
  const tail = [rules?.trim() ?? "", restrictions].filter((s) => s !== "").join("\n\n");
  const system = tail === "" ? p.system : p.system + "\n\n## Rules for this run\n" + tail;
  return agent(name, { system, model: p.model });
}

const PERSONA_SNAPSHOT_TS = String.raw`import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readlinkSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const excluded = [".", ":(exclude)research", ":(exclude)research/**"];
const buffer = Buffer.allocUnsafe(1024 * 1024);

function git(repo: string, args: string[], allowFailure = false) {
  const result = Bun.spawnSync({ cmd: ["git", ...args], cwd: repo, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0 && !allowFailure) {
    throw new Error("git " + args.slice(0, 3).join(" ") + " failed: " + result.stderr.toString().slice(0, 300));
  }
  return result;
}

function records(data: Buffer): Buffer[] {
  const values: Buffer[] = [];
  let start = 0;
  for (let end = data.indexOf(0); end !== -1; end = data.indexOf(0, start)) {
    if (end > start) values.push(data.subarray(start, end));
    start = end + 1;
  }
  return values;
}

function pathText(raw: Buffer): string {
  const text = raw.toString("utf8");
  if (!Buffer.from(text).equals(raw)) throw new Error("Cannot fingerprint a non-UTF-8 filename");
  return text;
}

function repoSnapshot(repo: string, depth = 0): unknown[] {
  if (depth > 8) throw new Error("submodule nesting exceeds the snapshot limit");
  const status = git(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none", "--", ...excluded]).stdout;
  const head = git(repo, ["rev-parse", "--verify", "HEAD"], true);
  const staged = git(repo, ["diff", "--cached", "--binary", "--", ...excluded]).stdout;
  const entries = git(repo, ["ls-files", "--stage", "-z", "--", ...excluded]).stdout;
  const others = git(repo, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...excluded]).stdout;
  const index = new Map<string, string[]>();
  const paths = new Set<string>();
  for (const entry of records(entries)) {
    const tab = entry.indexOf(9);
    if (tab === -1) throw new Error("Malformed git index entry");
    const path = pathText(entry.subarray(tab + 1));
    index.set(path, entry.subarray(0, tab).toString("ascii").split(" "));
    paths.add(path);
  }
  for (const path of records(others)) paths.add(pathText(path));
  const files: unknown[] = [];
  for (const path of [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
    const full = join(repo, path);
    const mode = index.get(path) ?? null;
    let info;
    try {
      info = lstatSync(full);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || (error.code !== "ENOENT" && error.code !== "ENOTDIR")) throw error;
      files.push([path, "missing", mode]);
      continue;
    }
    if (info.isSymbolicLink()) {
      files.push([path, "symlink", readlinkSync(full, { encoding: "buffer" }).toString("hex"), info.mode & 0o7777, mode]);
    } else if (mode?.[0] === "160000") {
      const nested = info.isDirectory() ? git(full, ["rev-parse", "--show-toplevel"], true) : undefined;
      const nestedRoot = nested?.stdout.toString("utf8").replace(/\r?\n$/, "");
      if (nested?.exitCode !== 0 || !nestedRoot || realpathSync(nestedRoot) !== realpathSync(full)) {
        files.push([path, "gitlink-uninitialized", mode]);
      } else {
        files.push([path, "gitlink", mode, repoSnapshot(full, depth + 1)]);
      }
    } else if (info.isFile()) {
      const digest = createHash("sha256");
      const fd = openSync(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        if (!fstatSync(fd).isFile()) throw new Error("File type changed while fingerprinting " + JSON.stringify(path));
        for (let length = readSync(fd, buffer, 0, buffer.length, null); length > 0; length = readSync(fd, buffer, 0, buffer.length, null)) {
          digest.update(buffer.subarray(0, length));
        }
      } finally {
        closeSync(fd);
      }
      files.push([path, "file", digest.digest("hex"), info.mode & 0o7777, mode]);
    } else {
      files.push([path, "other", info.mode, info.rdev, mode]);
    }
  }
  return [status.toString("hex"), head.exitCode === 0 ? head.stdout.toString("ascii").trim() : "<unborn>", staged.toString("hex"), files];
}

const root = process.argv[1];
if (!root) throw new Error("Repository path is required");
console.log(createHash("sha256").update(JSON.stringify(repoSnapshot(resolve(root)))).digest("hex"));
`;

async function personaSnapshot(dir: string): Promise<string> {
  const result = await world.run("bun", ["--no-env-file", "--config=/dev/null", "--eval", PERSONA_SNAPSHOT_TS, "--", dir]);
  const digest = result.stdout.trim();
  if (result.exitCode !== 0 || !/^[a-fA-F0-9]{64}$/.test(digest)) {
    throw new Error("repository snapshot failed: " + result.stderr.slice(0, 300) + result.stdout.slice(0, 100));
  }
  return digest;
}

async function guardWrites<T>(p: Persona, dir: string, work: () => PromiseLike<T>): Promise<T> {
  if (p.access === "write") return await work();
  let before: string;
  try {
    before = await personaSnapshot(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    personaFindings.push({ where: dir, what: "Read-only guard could not establish a baseline for " + p.name, evidence: message, status: "verified" });
    throw error;
  }
  let result!: T;
  let workError: unknown;
  let workFailed = false;
  let guardFailed = false;
  try {
    result = await work();
  } catch (error) {
    workFailed = true;
    workError = error;
  } finally {
    try {
      const after = await personaSnapshot(dir);
      if (after !== before) {
        personaFindings.push({ where: dir, what: "Read-only persona " + p.name + " changed repository state", evidence: "HEAD, index, status, tracked/untracked nonignored file bytes, file mode, symlink target, or submodule state changed (research/ is excluded)", status: "verified" });
        guardFailed = true;
        if (!workFailed) workError = new Error("Read-only persona changed repository state");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      personaFindings.push({ where: dir, what: "Read-only guard could not verify the final state for " + p.name, evidence: message, status: "verified" });
      guardFailed = true;
      if (!workFailed) workError = error;
    }
  }
  if (workFailed || guardFailed) throw workError;
  return result;
}

function personaReport(): string[] {
  return personaLoaded.map((p) => p.name + ": " + p.path + " sha256 " + p.sha256 + ", model " + p.modelId + ", " + p.access + (p.note === "" ? "" : "; " + p.note));
}
// persona-kit:end v4

const COMMITTER_PERSONA = { system:
  "You draft commit messages and nothing else. From the task, the area summary, and the exact file list, write one conventional commit message: a subject under 72 characters, then a short body only when it earns one. You never edit files, never run git, never commit - the script does. Return the message text only." };

const CONFIRMER_PERSONA = { system:
  "You confirm or refute a single finding by reproducing it from its evidence alone; you read the files it names with your own tools. You never edit any file, and you never re-run checks the script already ran - their results are handed to you. reproduced is true only when you saw the problem yourself; when you cannot, say exactly what blocked you." };

// ---- Gate dispatch: a literal-command allowlist switch. Tool and args come from the areas at runtime and
// ride in the args array; command names are compile-time literals, never interpolated (SPEC 1.7). ----

/** Fold a finished world.run into a GateOutcome; a nonzero exit is a value the loop branches on. */
function gateDone(tool: string, argv: string, r: { exitCode: number; stdout: string; stderr: string }): GateOutcome {
  const failureText = r.exitCode === 0 ? "" : tail(r.stderr.length > 0 ? r.stderr : r.stdout);
  return { tool, argv, ran: true, exitCode: r.exitCode, failure: failureText };
}

async function runFromWorkspace(tool: string, argv: string[], timeoutMs: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await world.run("sh", ["-c", 'cd "$1" && shift && exec "$@"', "shipflow", workspaceRoot, tool, ...argv], { timeoutMs });
}

/** Run one gate through the allowlist. Skipped and unspawnable gates return as values, never throw. */
async function runGate(tool: string, gateArgs: string[]): Promise<GateOutcome> {
  const argv = [tool, ...gateArgs].join(" ");
  if (gateIsMutating(tool, gateArgs)) return { tool, argv, ran: false, exitCode: -1, failure: "skipped: mutating gates (--fix/--write, or a git subcommand outside the read-only allowlist) are not allowed" };
  try {
    switch (tool) {
      case "npm": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "pnpm": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "yarn": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "bun": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "cargo": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "make": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "go": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "python3": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "pytest": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "npx": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      case "git": return gateDone(tool, argv, await runFromWorkspace(tool, gateArgs, GATE_TIMEOUT_MS));
      default: return { tool, argv, ran: false, exitCode: -1, failure: `skipped: "${tool}" is not in the cycle's gate allowlist` };
    }
  } catch (error) {
    return { tool, argv, ran: false, exitCode: -1, failure: `did not run: ${String(error)}` };
  }
}

/** Run every gate of one area, in declared order. */
async function runAllGates(area: AreaSpec): Promise<GateOutcome[]> {
  const out: GateOutcome[] = [];
  for (const gate of area.gates) out.push(await runGate(gate.tool, gate.args));
  return out;
}

/** A red gate as a verified finding: the exit code is the confirmation. */
function gateFinding(area: AreaSpec, g: GateOutcome): Finding {
  return { where: area.paths.length > 0 ? area.paths[0] : area.name, what: `Area gate is still red: ${g.argv}`, evidence: `${g.argv} exited ${g.exitCode}${g.failure === "" ? "" : ` - ${g.failure}`}`, status: "verified", severity: "high" };
}

/** An over-budget diff as a verified finding: the numstat numbers are the confirmation. */
function sizeFinding(area: AreaSpec, s: { files: number; added: number; deleted: number }, budget: { maxLines: number; maxFiles: number }): Finding {
  return { where: area.paths.length > 0 ? area.paths[0] : area.name, what: `Area over size budget: ${s.files} file(s), +${s.added}/-${s.deleted} against ${budget.maxLines} lines / ${budget.maxFiles} files - split the area, do not commit big`, evidence: `script-run git diff --numstat measured ${s.files} file(s), +${s.added}/-${s.deleted} against the budget`, status: "verified", severity: "high" };
}

// ---- Ask builders for the looped asks (single-use asks are inlined at call sites). ----

/** The initial ask for one area's implementer. */
function implementAsk(area: AreaSpec, task: string, issueNumber: number, budget: { maxLines: number; maxFiles: number }): string {
  return msg([
    `Implement the area "${area.name}" of issue #${issueNumber}.`,
    `Issue (verbatim):\n${task}`,
    area.paths.length > 0 ? `Scope paths: ${area.paths.join(", ")}` : "Scope paths: the whole workspace",
    area.excludedPaths.length > 0 ? `Never touch: ${area.excludedPaths.join(", ")}` : "",
    area.skills.length > 0 ? `Read and follow these skill files first: ${area.skills.join(", ")}` : "",
    `Size budget: stay within ${budget.maxLines} changed lines across ${budget.maxFiles} files (the script measures each round with git numstat); if the area cannot fit one budget-sized round, finish one coherent slice and note the split needed.`,
    area.complexity === "complex" ? "This area is routed complex: be deliberate, and check the edges before handing off." : "",
    area.dependsOn.length > 0 ? `These areas finished before you started: ${area.dependsOn.join(", ")}` : "",
    agentsMdLine(),
    "Do not run the gates - the script runs them after you. Do not run git - the script commits. Report exactly which files you changed; never paste whole files back.",
  ]);
}

/** The ask that sends a red round back to the same implementer (SPEC 1.10: named-agent reuse). */
function fixAsk(area: AreaSpec, task: string, gates: GateOutcome[], budget: { maxLines: number; maxFiles: number }, size?: { files: number; added: number; deleted: number }): string {
  const red = gates.filter((g) => !(g.ran && g.exitCode === 0)).map((g) => `- ${g.argv} -> ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` - ${g.failure}`}`);
  const over = size !== undefined && (size.added + size.deleted > budget.maxLines || size.files > budget.maxFiles);
  return msg([
    red.length > 0 ? `The gates for "${area.name}" are still red. Fix the failures with the smallest coherent change.` : `The gates for "${area.name}" are green, but the area's uncommitted diff is over its size budget.`,
    `Issue (verbatim):\n${task}`,
    red.length > 0 ? `Red gates:\n${red.join("\n")}` : "",
    over && size !== undefined ? `Size budget: at most ${budget.maxLines} changed lines across ${budget.maxFiles} files; this round measures ${size.files} file(s), +${size.added}/-${size.deleted}. Shrink the change to budget or report exactly how the coordinator should split this area.` : "",
    agentsMdLine(),
    "Do not run the gates yourself - the script re-runs them after you hand off. Do not run git.",
  ]);
}

/** The confirmer's ask for one audit finding. */
function confirmerAsk(finding: Finding, gateNotes: string): string {
  return msg([
    "Reproduce this finding from its evidence alone; read the files it names. Do not edit anything.",
    `Use ${workspaceRoot} as the working directory for local file and repository commands.`,
    `Finding:\n${JSON.stringify(finding)}`,
    agentsMdLine(),
    gateNotes.length > 0 ? `The script already ran the cycle's gates - do not re-run them:\n${gateNotes}` : "Confirm from code and text evidence alone.",
    "reproduced is true only if you saw the problem yourself.",
  ]);
}

// ---- Arguments in, then the cycle: Claim, Triage, Plan, Implement, Gates, Preview, Browser, Vision, PR, Audit, Merge, Cleanup, Report. ----

const issueNumber = typeof args.issueNumber === "number" && Number.isFinite(args.issueNumber) ? Math.floor(args.issueNumber) : 0;
const repo = typeof args.repo === "string" ? args.repo.trim() : "";
const tier = typeof args.tier === "string" ? args.tier : "";
const task = typeof args.task === "string" ? args.task : "";
const dryRun = args.dryRun === true;
const doCommit = args.commit !== false;
const maxRounds = Math.max(1, Math.floor(typeof args.maxRounds === "number" && Number.isFinite(args.maxRounds) ? args.maxRounds : 3));
const agentsMdPath = typeof args.agentsMd === "string" ? args.agentsMd : "AGENTS.md";
const agentDirArg = typeof args.agentDir === "string" ? args.agentDir.trim() : "";
const baseShaArg = typeof args.baseSha === "string" ? args.baseSha.trim() : "";
const repoRootArg = typeof args.repoRoot === "string" ? args.repoRoot.trim() : "";

/** The honest bail-out when nothing can or should run; nothing was claimed. */
const bail = (verdict: CycleReport["verdict"], reason: string): CycleReport => ({
  conclusion: `Issue #${issueNumber}: ${reason} Nothing else ran.`,
  issue: issueNumber, verdict, commits: [], prUrl: "", findings: [], gates: [], evidence: [], verified: [],
  notCovered: [`everything - ${reason}`],
});
if (issueNumber < 1) return bail("refused", "refused to start: issueNumber must be a positive number.");
if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) return bail("refused", `refused to start: repo must be OWNER/NAME (got ${JSON.stringify(repo)}).`);
if (tier !== "flash" && tier !== "pro") return bail("refused", `refused to start: tier must be "flash" or "pro" (got ${JSON.stringify(tier)}).`);
if (task.length === 0) return bail("refused", "refused to start: task must be a non-empty string.");

if (repoRootArg !== "" && !repoRootArg.startsWith("/")) return bail("refused", "refused to start: repoRoot must be an absolute path.");
const workspaceCheck = await world.run("git", ["-C", repoRootArg === "" ? "." : repoRootArg, "rev-parse", "--show-toplevel"]);
if (workspaceCheck.exitCode !== 0 || workspaceCheck.stdout.trim() === "") return bail("refused", "refused to start: could not validate the checked git workspace root.");
const workspaceRoot = workspaceCheck.stdout.trim();
if (!workspaceRoot.startsWith("/")) return bail("refused", "refused to start: git returned a non-absolute workspace root.");
const agentDir = agentDirArg === "" ? workspaceRoot + "/.zcode/agents" : agentDirArg;
if (!agentDir.startsWith("/")) return bail("refused", "refused to start: agentDir must be an absolute path.");
const agentListing = await world.run("ls", ["-1", agentDir]);
if (agentListing.exitCode !== 0) return bail("refused", `refused to start: local agent directory could not be listed (${tail(agentListing.stderr)}).`);
const availableAgents = new Set(agentListing.stdout.split("\n").map((name) => name.trim()).filter((name) => name !== ""));

const personaBail = (reason: string): CycleReport => ({
  ...bail("refused", reason),
  findings: personaFindings.map((f) => ({ where: f.where, what: f.what, evidence: f.evidence, status: "verified" as const, severity: "high" as const })),
});
const loadRequiredPersona = async (file: string, access: "read-only" | "write", modelTier: "any" | "pro" | "flash" = tier): Promise<Persona | undefined> => {
  if (!availableAgents.has(file)) {
    personaFindings.push({ where: agentDir + "/" + file, what: "Required persona file is missing; the cycle did not run", evidence: "agent directory listing did not contain " + file, status: "verified" });
    return undefined;
  }
  return await loadPersona(agentDir + "/" + file, { tier: modelTier, access });
};
const basePersonaSpecs = [
  ["gh-ops", "shipflow-gh-ops.md", "write", tier],
  ["issue-triage", "shipflow-issue-triage.md", "read-only", tier],
  ["task-planner", "shipflow-task-planner.md", "read-only", tier],
  ["plan-auditor", "shipflow-plan-auditor.md", "read-only", tier],
  ["browser-tester", "shipflow-browser-tester.md", "write", tier],
  ["vision-judge", "shipflow-vision-judge.md", "read-only", "any"],
  ["security-audit", "shipflow-security-audit.md", "read-only", tier],
  ["injection-auditor", "shipflow-injection-auditor.md", "read-only", tier],
] as const;
const basePersonas: Record<string, Persona> = {};
for (const [key, file, access, modelTier] of basePersonaSpecs) {
  const persona = await loadRequiredPersona(file, access, modelTier);
  if (persona === undefined) return personaBail(`refused to start: required persona ${file} failed validation.`);
  basePersonas[key] = persona;
}

let agentsMdLoaded = false;
if (agentsMdPath !== "") {
  try {
    agentsMdLoaded = (await files.read(agentsMdPath)).trim().length > 0;
  } catch {
    agentsMdLoaded = false;
  }
}

/** Everything the closing report needs, accumulated as the cycle runs. */
const cycle: { commits: string[]; prUrl: string; findings: Finding[]; gates: GateOutcome[]; evidence: string[]; verified: string[]; notCovered: string[] } = {
  commits: [], prUrl: "", findings: [], gates: [], evidence: [], verified: [], notCovered: [],
};
let readOnlyGuardFailed = false;
if (agentsMdPath !== "" && !agentsMdLoaded) cycle.notCovered.push(`${agentsMdPath}: not found or empty - the project's hard rules were not injected into subagent asks`);

const ghOps = personaAgent(basePersonas["gh-ops"], "gh-ops", "Perform only the exact operations stated in the current ask. Never merge or edit an issue body.");
const branch = `shipflow/issue-${issueNumber}`;
const areaOutcomes: AreaOutcome[] = []; // filled by the gates phase, read by the close-out
const workByArea = new Map<string, AreaWork>(); // each area's last implementer hand-back
let browserSessionStarted = false; // set just before the browser ask; cleanup closes the session even when that flow fails

// The watcher's view: one card per area, moving columns as the run decides.
artifact.board("status", {
  title: `Issue #${issueNumber} areas by status`,
  key: "key",
  status: "status",
  columns: ["working", "passed", "unverified", "failed"],
  cardTitle: "name",
  detail: [{ field: "note", label: "Note" }],
});

/** The shared close-out: POLICY-decided label swap, honest comment, then the cycle report file the watchdog watches. Called exactly once per run. */
const closeCycle = async (verdict: CycleReport["verdict"], label: "done" | "failed" | "backlog", reason: string, doneNote: string): Promise<CycleReport> => {
  // Plan section 6, Cleanup: close the session's browser. Best-effort and non-fatal - a failed
  // browser flow must not leak the shipflow-<issue> session, and a close failure must not mask
  // the outcome. agent-browser is a literal command here, the same pattern as git and gh.
  if (browserSessionStarted) {
    try {
      const closed = await world.run("agent-browser", ["--session", `shipflow-${issueNumber}`, "close"]);
      if (closed.exitCode === 0) cycle.verified.push(`agent-browser session shipflow-${issueNumber} closed by cleanup`);
      else cycle.notCovered.push(`cleanup close of browser session shipflow-${issueNumber} exited ${closed.exitCode} - close not confirmed (usually: nothing left to close)`);
    } catch (error) {
      cycle.notCovered.push(`browser session shipflow-${issueNumber} not closed by cleanup (${String(error)})`);
    }
  }
  cycle.findings.push(...personaFindings.map((f) => ({ where: f.where, what: f.what, evidence: f.evidence, status: "verified" as const, severity: "high" as const })));
  phase("Clean up the queue labels and comment the outcome");
  const body = label === "backlog" ? `claim released - ${reason}` : label === "done" ? `cycle done - ${doneNote}` : `cycle failed - ${reason}`;
  try {
    const cleaned = await ghOps.ask<string>(msg([
      `Close out the shipflow cycle for issue #${issueNumber} of ${repo}. Exact operations:`,
      `1. gh issue comment ${issueNumber} -R ${repo} --body "shipflow: ${body}"`,
      `2. gh issue edit ${issueNumber} -R ${repo} --remove-label pipeline:claimed --add-label pipeline:${label}`,
      "Never edit the issue body; never merge; every resulting URL goes in the result.",
      agentsMdLine(),
    ]));
    cycle.notCovered.push(`GitHub cleanup report: ${tail(cleaned)}`);
  } catch (error) {
    cycle.notCovered.push(`GitHub cleanup did not complete: ${String(error)}`);
  }

  phase("Write the cycle report the watchdog watches");
  const cyclePath = `${CYCLE_DIR}/cycle-${issueNumber}.md`;
  const reportMd = msg([
    `# Shipflow cycle - issue #${issueNumber} (${verdict})`,
    "",
    `Repo: ${repo}. Branch: ${branch}. Tier: ${tier}${dryRun ? " (dry-run: PR create/merge skipped)" : ""}.`,
    `PR: ${cycle.prUrl === "" ? "none" : cycle.prUrl}. Commits: ${cycle.commits.length === 0 ? "none" : cycle.commits.join(", ")}.`,
    "",
    "## Areas",
    ...(areaOutcomes.length > 0
      ? areaOutcomes.flatMap((o) => [
          `### ${o.area} - ${o.gateless ? "unverified (no gates declared)" : o.gatesGreen ? "all gates green" : "gates red"}`,
          ...o.gates.map((g) => `- Gate ${g.argv}: ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` - ${g.failure}`}`),
        ])
      : ["- none planned"]),
    "",
    "## Findings",
    ...(cycle.findings.length > 0 ? cycle.findings.map((f) => `- **${f.where}** (${f.severity}, ${f.status}): ${f.what}\n  - ${f.evidence}`) : ["- none"]),
    "",
    "## Not covered",
    ...(cycle.notCovered.length > 0 ? cycle.notCovered.map((n) => `- ${n}`) : ["- nothing notable"]),
    "",
    "## Personas",
    ...personaReport().map((line) => `- ${line}`),
  ]);
  let reportWritten = false;
  try {
    await ghOps.ask<string>(msg([
      `Write the shipflow cycle report file the watchdog cron watches. Write exactly this content to ${cyclePath} (create the ${CYCLE_DIR} directory if needed; change nothing else):`,
      reportMd,
      agentsMdLine(),
    ]));
    reportWritten = true;
  } catch (error) {
    cycle.notCovered.push(`cycle report write did not complete: ${String(error)}`);
  }
  try {
    await artifact.file("cycle", cyclePath, { title: `Shipflow cycle - issue #${issueNumber}`, description: `Verdict, gates, commits, and standing findings; ${CYCLE_DIR}/cycle-${issueNumber}.md is the watchdog heartbeat.`, primary: true });
  } catch {
    try {
      await ghOps.ask<string>(msg([
        `${cyclePath} is missing or unreadable. Write exactly this content to that path, then say what you did:`,
        reportMd,
        agentsMdLine(),
      ]));
      await artifact.file("cycle", cyclePath, { title: `Shipflow cycle - issue #${issueNumber}`, description: "Verdict, gates, commits, and standing findings.", primary: true });
    } catch (error) {
      if (!reportWritten) cycle.notCovered.push(`cycle report fallback write did not complete: ${String(error)}`);
      cycle.notCovered.push(`cycle report artifact not attached (${cyclePath} still unreadable after the rewrite) - the watchdog must read it from the tree`);
    }
  }
  const closeOutFailures = cycle.notCovered.filter((entry) => entry.startsWith("GitHub cleanup did not complete") || entry.startsWith("cycle report write did not complete") || entry.startsWith("cycle report fallback write did not complete") || entry.startsWith("cycle report artifact not attached"));
  return {
    conclusion: `Issue #${issueNumber}: ${verdict === "merged" ? "merged - every gate green, audits attached, no open high/medium findings, stable reviewed head, approval present, budget held." : verdict === "open" ? `PR left open - ${reason}` : verdict === "released" ? `released back to pipeline:backlog - ${reason}` : `cycle failed - ${reason}`} ${cycle.commits.length} commit(s) made; ${cycle.findings.length} finding(s) stand; evidence: ${cycle.evidence.length === 0 ? "none" : cycle.evidence.join(", ")}.${closeOutFailures.length === 0 ? "" : ` Close-out failures: ${closeOutFailures.join("; ")}`}`,
    issue: issueNumber, verdict, commits: cycle.commits, prUrl: cycle.prUrl, findings: cycle.findings,
    gates: cycle.gates, evidence: cycle.evidence, verified: cycle.verified, notCovered: cycle.notCovered,
  };
};

// CLAIM: optimistic claim verified by re-read, then the cycle branch.

phase("Claim the issue and branch for this cycle");
const claim = await ghOps.ask<ClaimResult>(msg([
  `Claim issue #${issueNumber} of ${repo} for the shipflow cycle. Exact operations, in order:`,
  `1. gh repo view ${repo} --json defaultBranchRef -q .defaultBranchRef.name - returned as defaultBranch ("main" if unreadable).`,
  `2. gh issue edit ${issueNumber} -R ${repo} --add-assignee @me`,
  `3. gh issue edit ${issueNumber} -R ${repo} --add-label pipeline:claimed --remove-label pipeline:ready`,
  `4. gh issue view ${issueNumber} -R ${repo} --json labels -q '.labels[].name' - re-read to verify the swap won; if pipeline:claimed is absent you lost the race: release silently (remove your assignee, touch nothing else) and return claimed=false.`,
  "Every op's resulting URL or number goes in the result. Never force-push, never edit the issue body, never merge.",
  agentsMdLine(),
]));
if (!claim.claimed) return bail("released", "lost the claim race - released silently.");
const defaultBranch = claim.defaultBranch.trim().length > 0 ? claim.defaultBranch.trim() : "main";
cycle.notCovered.push(`claim report: ${claim.note}`);
// A leftover branch (a failed, open, or dry-run cycle - the branch deletes only on a successful
// merge) means this is a retry: the designed recovery lane (plan section 1 - one cycle per run,
// the coordinator relaunches). Verify-then-reuse; create fresh only when absent.
const branchExists = await gitRun(["rev-parse", "--verify", branch]);
if (branchExists.ran && branchExists.exitCode === 0) {
  const reused = await gitRun(["checkout", branch]);
  if (!(reused.ran && reused.exitCode === 0)) return closeCycle("failed", "failed", `branch ${branch} already exists but could not be checked out for the retry: ${reused.output}`, "");
  cycle.verified.push(`retry lane: reused existing branch ${branch} (leftover from an earlier cycle; its commits and tree state carry over)`);
} else {
  const branchFromDefault = await gitRun(["checkout", "-b", branch, defaultBranch]);
  if (!(branchFromDefault.ran && branchFromDefault.exitCode === 0)) {
    const fromHead = await gitRun(["checkout", "-b", branch]);
    if (!(fromHead.ran && fromHead.exitCode === 0)) return closeCycle("failed", "failed", `could not create branch ${branch}: ${branchFromDefault.output}`, "");
    cycle.notCovered.push(`branch created from HEAD, not ${defaultBranch} (${tail(branchFromDefault.output)})`);
  }
}
const headBase = await gitRun(["rev-parse", "HEAD"]);
const base = baseShaArg !== "" ? baseShaArg : headBase.ran && headBase.exitCode === 0 ? headBase.output.split("\n")[0].trim() : "";
if (base === "") cycle.notCovered.push("base sha unavailable - audit diffs and size evidence degrade");

phase("Re-validate that the issue is actionable");
const triageAgent = personaAgent(basePersonas["issue-triage"], "issue-triage", "Do not comment, label, close, assign, or otherwise mutate GitHub. Read the issue and linked repro only; report actionability and any exact missing-information question.");
let triage: TriageVerdict;
try {
  triage = await guardWrites(basePersonas["issue-triage"], workspaceRoot, () => triageAgent.ask<TriageVerdict>(msg([
  `Re-validate that issue #${issueNumber} is actionable by this autonomous cycle.`,
  `Issue (title and body, verbatim):\n${task}`,
  "actionable=true only when the task is clear, reproducible, and in scope for the project's charter. When information is missing, give the exact question the cycle should comment - it then releases the claim.",
  agentsMdLine(),
  ])));
} catch (error) {
  cycle.notCovered.push(`issue triage did not complete under its read-only guard: ${String(error)}`);
  return closeCycle("failed", "failed", "issue triage read-only guard failed", "");
}
if (!triage.actionable) return closeCycle("released", "backlog", `triage: ${triage.reason}`, "");
cycle.notCovered.push(`triage assessment: ${triage.reason}`);

phase("Plan the issue into areas and audit the plan");
const planner = personaAgent(basePersonas["task-planner"], "task-planner", "Plan each area with its source-domain specialist field. Choose a discovered canonical z-* agent based on the actual files and domain, never infer the specialist from hasUI alone.");
const planInto = (extra: string): string => msg([
  `Turn issue #${issueNumber} into the areas[] this cycle will run on.`,
  `Issue (verbatim):\n${task}`,
  `Slice under budget (~400 changed lines / ~10 files; over -> ordered siblings linked by dependsOn). Every area gets at least one non-mutating gate from this repo's real tooling, tool in the allowlist (npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git read-only). Assign complexity and hasUI. Choose each specialist by actual source domain from this discovered z-* catalog: ${[...availableAgents].filter((name) => /^z-[a-z0-9-]+\.md$/.test(name)).map((name) => name.slice(0, -3)).join(", ")}. Include the absolute paths of the specialist's named domain skills in skills; never derive specialist from hasUI or leave generic skill-discovery instructions.`,
  "Return the areas array (name, paths, excludedPaths, specialist, skills, gates [{tool, args}], complexity, hasUI, dependsOn, optional budget {maxLines, maxFiles}) plus your assumptions.",
  extra,
  agentsMdLine(),
]);
let parsed = parseAreas(args.areas);
let planned = parsed.areas;
let planNote = "coordinator-supplied plan";
if (planned.length === 0) {
  let firstPlan: PlannedAreas;
  try {
    firstPlan = await guardWrites(basePersonas["task-planner"], workspaceRoot, () => planner.ask<PlannedAreas>(planInto("")));
  } catch (error) {
    cycle.notCovered.push(`task planner did not complete under its read-only guard: ${String(error)}`);
    return closeCycle("failed", "failed", "task planner read-only guard failed", "");
  }
  parsed = parseAreas(firstPlan.areas);
  planned = parsed.areas;
  planNote = `task-planner plan (assumptions: ${firstPlan.assumptions})`;
}
for (let attempt = 0; attempt <= 2; attempt++) {
  let audit: PlanAudit;
  try {
    audit = await guardWrites(basePersonas["plan-auditor"], workspaceRoot, () => personaAgent(basePersonas["plan-auditor"], `plan-auditor-a${attempt}`, "Audit only. Do not modify files or GitHub.").ask<PlanAudit>(msg([
    `Audit this areas[] plan before implement burns rounds on it - the artifact, not its author's confidence.`,
    `Issue (verbatim):\n${task}`,
    `Plan (${planNote}):\n${JSON.stringify(planned)}`,
    `Check: every area has paths, at least one allowlisted non-mutating gate, a complexity, hasUI, and a specialist matching actual source domain from this discovered catalog: ${[...availableAgents].filter((name) => /^z-[a-z0-9-]+\.md$/.test(name)).map((name) => name.slice(0, -3)).join(", ")}. Budgets sum sane; dependsOn acyclic; gate commands exist in this repo's tooling.`,
    'verdict = "proceed" or "fix-plan", reasons itemized. You never edit anything.',
    agentsMdLine(),
    ])));
  } catch (error) {
    cycle.notCovered.push(`plan auditor did not complete under its read-only guard: ${String(error)}`);
    return closeCycle("failed", "failed", "plan auditor read-only guard failed", "");
  }
  if (audit.verdict === "proceed") {
    cycle.notCovered.push(`plan audit assessment: proceeded on attempt ${attempt + 1} (${planNote})`);
    break;
  }
  if (attempt === 2) return closeCycle("failed", "failed", `plan audit still fix-plan after two re-plans: ${audit.reasons.join("; ")}`, "");
  let replanned: PlannedAreas;
  try {
    replanned = await guardWrites(basePersonas["task-planner"], workspaceRoot, () => planner.ask<PlannedAreas>(planInto(`The plan auditor returned fix-plan. Fix every item and return the whole areas array again:\n${audit.reasons.join("\n")}`)));
  } catch (error) {
    cycle.notCovered.push(`task planner did not complete under its read-only guard: ${String(error)}`);
    return closeCycle("failed", "failed", "task planner read-only guard failed", "");
  }
  parsed = parseAreas(replanned.areas);
  planned = parsed.areas;
  planNote = "re-planned";
}
cycle.notCovered.push(...parsed.problems);
if (planned.length === 0) return closeCycle("failed", "failed", "no usable areas after planning", "");
const areaPersonas: Record<string, { implementer: Persona; reviewer: Persona }> = {};
for (const area of planned) {
  if (!/^z-[a-z0-9-]+$/.test(area.specialist) || !availableAgents.has(area.specialist + ".md")) {
    personaFindings.push({ where: area.name, what: "Area specialist is missing or outside the discovered z-* agent catalog; the cycle stopped before implementation", evidence: "specialist=" + JSON.stringify(area.specialist), status: "verified" });
    return closeCycle("failed", "failed", `invalid specialist for area ${area.name}`, "");
  }
  const file = area.specialist + ".md";
  const implementerPersona = await loadRequiredPersona(file, "write");
  const reviewerPersona = await loadRequiredPersona(file, "read-only");
  if (implementerPersona === undefined || reviewerPersona === undefined) {
    return closeCycle("failed", "failed", `specialist persona ${file} failed validation`, "");
  }
  areaPersonas[area.name] = { implementer: implementerPersona, reviewer: reviewerPersona };
}

phase("Implement each planned area, then run its gates until green or capped");
log(`issue #${issueNumber}: running ${planned.length} planned area(s)`);
const committer = doCommit ? agent("Committer", COMMITTER_PERSONA) : undefined;
for (const area of planned) {
  report({ key: area.name, name: area.name, status: "working", note: "implementation under way" }, "status");
  const implementer = personaAgent(areaPersonas[area.name].implementer, `implementer-${area.name}`, `Implement only area ${area.name}. Work only inside ${workspaceRoot}. Follow the stated area paths and excluded paths; never run git or the gates. If impossible, escalate; do not fake results.`);
  const budget = area.budget ?? { maxLines: DEFAULT_MAX_LINES, maxFiles: DEFAULT_MAX_FILES };
  const first = await implementer.ask<AreaWork>(implementAsk(area, task, issueNumber, budget));
  let pending = first.changedFiles.filter((p) => !area.excludedPaths.includes(p));
  let summary = first.summary;
  let gates: GateOutcome[] = [];
  let green = false;
  let over = false;
  const shas: string[] = [];
  const sizeFindings: Finding[] = [];
  for (let r = 1; r <= maxRounds && area.gates.length > 0; r++) {
    gates = await runAllGates(area);
    const failing = gates.filter((g) => !(g.ran && g.exitCode === 0)).length;
    const head = await gitRun(["rev-parse", "HEAD"]);
    const roundStart = head.ran && head.exitCode === 0 ? head.output.split("\n")[0].trim() : "";
    const size = roundStart !== "" && pending.length > 0 ? await measureSize(pending, roundStart) : undefined;
    over = size !== undefined && (size.added + size.deleted > budget.maxLines || size.files > budget.maxFiles);
    log(`issue #${issueNumber} - ${area.name}: round ${r}, ${failing} of ${gates.length} gate(s) red${over ? " - OVER BUDGET" : ""}`);
    if (failing === 0 && !over) {
      green = true;
      if (doCommit && committer !== undefined && pending.length > 0) {
        try {
          const draft = await committer.ask<CommitDraft>(msg([
            `Draft one commit message for area "${area.name}", round ${r}, of issue #${issueNumber}.`,
            `Task: ${task}`,
            `What was done this round: ${summary}`,
            `Files (exact paths, in this order): ${pending.join(", ")}`,
            "Match the repo's conventional commit style (read its log). Return the message only.",
            agentsMdLine(),
          ]));
          const message = typeof draft.message === "string" && draft.message.trim() !== "" ? draft.message.trim() : `${area.name}: issue #${issueNumber}`;
          const add = await serializedGit(() => gitRun(["add", "--", ...pending]));
          const commit = add.ran && add.exitCode === 0 ? await serializedGit(() => gitRun(["commit", "-m", message, "--", ...pending])) : undefined;
          const sha = commit !== undefined && commit.ran && commit.exitCode === 0 ? shortSha(commit.output) : "";
          if (sha !== "") shas.push(sha);
          else cycle.notCovered.push(`${area.name}: round ${r} commit failed (${commit === undefined ? `git add failed: ${add.output}` : commit.output}) - its green work stays on disk, uncommitted`);
        } catch (error) {
          cycle.notCovered.push(`${area.name}: round ${r} commit not made - ${String(error)}`);
        }
      }
      break;
    }
    if (over && size !== undefined) {
      const f = sizeFinding(area, size, budget);
      sizeFindings.push(f);
      report(f);
    }
    if (r < maxRounds) {
      const fix = await implementer.ask<AreaWork>(fixAsk(area, task, gates, budget, size));
      summary = fix.summary;
      for (const p of fix.changedFiles) if (!area.excludedPaths.includes(p) && !pending.includes(p)) pending.push(p);
    }
  }
  const standing = [...gates.filter((g) => g.ran && g.exitCode !== 0).map((g) => gateFinding(area, g)), ...sizeFindings];
  for (const f of standing) report(f);
  for (const s of first.skipped) cycle.notCovered.push(`${area.name}: left undone - ${s}`);
  if (first.notes.trim().length > 0) cycle.notCovered.push(`${area.name}: implementer notes - ${first.notes.trim()}`);
  if (gates.length === 0) cycle.notCovered.push(`${area.name}: unverified (no gates declared) - merge POLICY blocks on it`);
  else if (!green) cycle.notCovered.push(`${area.name}: still red after ${maxRounds} round(s) - half-done work is on disk, never claimed clean`);
  if (over) cycle.notCovered.push(`${area.name}: over its size budget - split it before relaunching`);
  if (!doCommit && pending.length > 0) cycle.notCovered.push(`${area.name}: commit=false - work stays on disk, uncommitted`);
  workByArea.set(area.name, { summary, changedFiles: pending, notes: first.notes, skipped: first.skipped });
  areaOutcomes.push({ area: area.name, gatesGreen: green, gates, gateless: gates.length === 0, commitShas: shas });
  cycle.gates.push(...gates);
  cycle.commits.push(...shas);
  cycle.findings.push(...standing);
  cycle.verified.push(...gates.filter((g) => g.ran).map((g) => `${g.argv} -> exit ${g.exitCode} (area ${area.name})`));
  report({ key: area.name, name: area.name, status: gates.length === 0 ? "unverified" : green ? "passed" : "failed", note: gates.length === 0 ? "unverified (no gates declared)" : green ? "all gates green" : "gates red after its rounds" }, "status");
}

if (planned.every((a) => !a.hasUI)) {
  cycle.notCovered.push("no UI areas - preview, browser, and vision evidence not captured");
} else {
  phase("Start the preview for the UI areas");
  const preview = await ghOps.ask<PreviewInfo>(msg([
    `Start this project's preview for issue #${issueNumber} so the cycle can drive it headlessly.`,
    `Use ${workspaceRoot} as the working directory. Discover the dev or build command from the repo's own files (package.json scripts, Makefile, Cargo.toml) - never invent one. Run it through an allowlisted tool only: npm, pnpm, yarn, bun, cargo, make, go, or npx. Start it in the background so it stays up, wait until it serves, verify with a request before reporting.`,
    'Return url (the serving URL; "" when no preview could be started) and notes (the command used, anything that failed). Never guess a URL.',
    agentsMdLine(),
  ]));
  if (preview.url === "") {
    cycle.notCovered.push(`no preview URL (${preview.notes}) - browser and vision evidence not captured`);
  } else {
    cycle.notCovered.push(`preview report: ${preview.notes}`);
    phase("Drive the preview and capture browser evidence");
    browserSessionStarted = true; // cleanup closes the shipflow-<issue> session even when this flow fails
    // This cycle's evidence namespace mirrors the engine's -r<n> convention (zflow-SPEC section 3:
    // evidence to .zflow/evidence/<area>-r<n>-*.png). The attempt index counts earlier cycles' shots
    // for this issue, so a retried issue never sweeps an earlier attempt's screenshots into its own
    // vision judgement. No Date.now - the counter is derived from the filesystem, per script hygiene.
    let attempt = 1;
    for (const prior of await files.glob(`${EVIDENCE_DIR}/issue-${issueNumber}-r*-*.png`)) {
      const m = /-r(\d+)-/.exec(prior);
      if (m !== null) attempt = Math.max(attempt, parseInt(m[1], 10) + 1);
    }
    try {
      await personaAgent(basePersonas["browser-tester"], "browser-tester", "Drive only the issue preview and capture the requested evidence. Keep the browser session open only as needed; report exact files created.").ask<string>(msg([
      `Drive the preview of issue #${issueNumber} headlessly and record evidence. agent-browser CLI ONLY - no MCP browser or computer-use plugins. Always use the session flag for isolation. Flow, in order:`,
      `  agent-browser --session shipflow-${issueNumber} open ${preview.url}`,
      `  agent-browser --session shipflow-${issueNumber} snapshot -i --json   - assert the states the issue names against the snapshot text`,
      `  agent-browser --session shipflow-${issueNumber} screenshot ${EVIDENCE_DIR}/issue-${issueNumber}-r${attempt}-1.png   (up to 3, numbered -1..-3)`,
      `  agent-browser --session shipflow-${issueNumber} close`,
      `Create ${EVIDENCE_DIR} first. Never type secrets. A failed flow still closes the session and reports the snapshot text it got. Return the exact screenshot paths and what the snapshots asserted.`,
      agentsMdLine(),
      ]));
    } catch (error) {
      cycle.notCovered.push(`browser tester did not complete: ${String(error)}`);
      return closeCycle("failed", "failed", "browser tester failed", "");
    }
    // The filesystem is the truth: evidence counts only when the script's own glob sees it.
    const shots = (await files.glob(`${EVIDENCE_DIR}/issue-${issueNumber}-r${attempt}-*.png`)).sort();
    cycle.evidence = shots;
    if (shots.length === 0) {
      cycle.notCovered.push("no browser evidence on disk - the browser tester's report stands unverified");
    } else {
      cycle.verified.push(`browser evidence found on disk: ${shots.join(", ")}`);
      phase("Judge the screenshots against the stated expectations");
      let vision: VisionJudgement;
      try {
        vision = await guardWrites(basePersonas["vision-judge"], workspaceRoot, () => personaAgent(basePersonas["vision-judge"], "vision-judge", "Judge the provided screenshots against the issue's explicit expectations. Do not inspect source, DOM, or command-check results before making the visual judgement.").ask<VisionJudgement>(msg([
        `Give pixel verdicts on the screenshots captured for issue #${issueNumber}. Expected states come from the issue - compare against the stated expectation, never an assumed one.`,
        `Issue (verbatim):\n${task}`,
        `Screenshots: ${shots.join(", ")}`,
        "Inspect the screenshot pixels directly. Keep this visual judgement blind to source, DOM, and command-check results; report separate evidence only when a separate pixel check is explicitly requested.",
        "One verdict per image: pass or fail, plus the pixels or regions that decided it; cite the screenshot path per verdict.",
        agentsMdLine(),
        ])));
      } catch (error) {
        cycle.notCovered.push(`vision judge did not complete under its read-only guard: ${String(error)}`);
        return closeCycle("failed", "failed", "vision judge read-only guard failed", "");
      }
      for (const v of vision.perImage) {
        if (v.verdict === "fail") {
          const f: Finding = { where: v.path, what: `Screenshot fails its stated expectation: ${v.why}`, evidence: `vision judge: ${v.why}`, status: "judged", severity: "medium" };
          cycle.findings.push(f);
          report(f);
        }
      }
    }
  }
}

// PR: gh-ops drafts, the script creates - gh is a literal allowlisted command here, the same pattern as
// git in the engine. dryRun skips create and merge (POLICY in code, not model taste).

let prNum = "";
let reviewedPrHead = "";
let localHeadMatchedReview = false;
if (dryRun) {
  cycle.notCovered.push("dry-run: PR create and merge skipped by design");
} else if (cycle.commits.length === 0) {
  cycle.notCovered.push(doCommit ? "no commits to put in a PR - nothing green was committed" : "commit=false: no commits, so no PR");
} else {
  phase("Open the pull request");
  const draft = await ghOps.ask<PrDraft>(msg([
    `Draft the pull request for issue #${issueNumber} on branch ${branch} (base ${defaultBranch}).`,
    `Title: conventional style, referencing the issue (#${issueNumber}). Body markdown: what the cycle changed (per-area summaries below), the gates that ran and their outcomes, and the evidence paths.`,
    `Per-area summaries:\n${areaOutcomes.map((o) => `- ${o.area}: ${workByArea.get(o.area)?.summary ?? ""}`).join("\n")}`,
    `Gates:\n${cycle.gates.map((g) => `- ${g.argv} -> ${g.ran ? `exit ${g.exitCode}` : "did not run"}`).join("\n") || "- none declared"}`,
    cycle.evidence.length > 0 ? `Evidence: ${cycle.evidence.join(", ")}` : "",
    "Return title and body only - the script creates the PR itself.",
    agentsMdLine(),
  ]));
  const created = await world.run("gh", ["pr", "create", "--repo", repo, "--head", branch, "--base", defaultBranch, "--title", draft.title, "--body", draft.body]);
  if (created.exitCode === 0) {
    cycle.prUrl = created.stdout.trim().split("\n").filter((l) => l.length > 0).pop() ?? "";
    const m = /pull\/(\d+)/.exec(cycle.prUrl);
    prNum = m === null ? "" : m[1];
    cycle.verified.push(`gh pr create -> ${cycle.prUrl}`);
    if (prNum !== "") {
      const openedState = await world.run("gh", ["pr", "view", prNum, "--repo", repo, "--json", "headRefOid,isDraft,reviewDecision"]);
      if (openedState.exitCode === 0) {
        try {
          const parsedState = JSON.parse(openedState.stdout) as PrReviewState;
          reviewedPrHead = typeof parsedState.headRefOid === "string" ? parsedState.headRefOid : "";
        } catch {
          reviewedPrHead = "";
        }
      }
      if (reviewedPrHead === "") cycle.notCovered.push("PR head could not be captured before review; merge will be blocked");
      else cycle.verified.push(`review baseline PR head ${reviewedPrHead}`);
    }
  } else {
    cycle.notCovered.push(`PR create failed (exit ${created.exitCode}): ${tail(created.stderr.length > 0 ? created.stderr : created.stdout)}`);
  }
}

if (prNum !== "") {
  const localReviewHead = await gitRun(["rev-parse", "HEAD"]);
  localHeadMatchedReview = reviewedPrHead !== "" && localReviewHead.ran && localReviewHead.exitCode === 0 && localReviewHead.output.trim() === reviewedPrHead;
  if (!localHeadMatchedReview) cycle.notCovered.push(`local HEAD did not match the reviewed PR head before audits (local ${localReviewHead.output.trim() || "unavailable"}, PR ${reviewedPrHead})`);
  if (!localHeadMatchedReview) return closeCycle("open", "failed", "local HEAD did not match the captured PR head before audits", "");
}

phase("Audit the diff with security, injection, and blind area reviewers");
const diffScope = `The cycle's diff is branch ${branch} vs ${base === "" ? "the round-start shas" : base} - run "git diff" yourself, read-only, from ${workspaceRoot}, to read it.`;
const confirmerGuard = { ...basePersonas["plan-auditor"], name: "finding-confirmer" };
const confirmFindings = async (owner: string, findings: Finding[]): Promise<Finding[]> =>
  Promise.all(findings.map(async (f, i): Promise<Finding> => {
    try {
      const check = await guardWrites(confirmerGuard, workspaceRoot, () => agent(`confirmer-${owner}-${i}`, CONFIRMER_PERSONA).ask<Confirmation>(confirmerAsk(f, cycle.gates.map((g) => `- ${g.argv} -> ${g.ran ? `exit ${g.exitCode}` : "did not run"}`).join("\n"))));
      const assessed: Finding = { ...f, status: check.reproduced ? "judged" : "unconfirmed" };
      report(assessed);
      return assessed;
    } catch (error) {
      readOnlyGuardFailed = true;
      cycle.notCovered.push(`confirmer ${owner}-${i} did not complete under its read-only guard: ${String(error)}`);
      const blocked: Finding = { ...f, status: "unconfirmed" };
      report(blocked);
      return blocked;
    }
  }));
const audits = await Promise.all([
  (async (): Promise<{ key: string; note: string; findings: Finding[] }> => {
    let sec: AuditFindings;
    try {
      sec = await guardWrites(basePersonas["security-audit"], workspaceRoot, () => personaAgent(basePersonas["security-audit"], "security-audit", "Audit only. Do not alter files or perform external operations.").ask<AuditFindings>(msg([
      `Security-audit the cycle's diff for issue #${issueNumber}.`,
      diffScope,
      "Check authz on every new route/command; input validation at boundaries; secret handling (no keys in code, logs, or config); dependency additions justified. Bind data values through the driver's parameter API. When SQL syntax requires a dynamic identifier, validate it against a fixed allowlist before constructing the statement.",
      'Findings: blocker->high, major->medium, nit->low, with a CWE-style category in the evidence. Read-only. A clean audit says "no findings" with the checklist you ran - never silently empty.',
      agentsMdLine(),
      ])));
    } catch (error) {
      readOnlyGuardFailed = true;
      cycle.notCovered.push(`security audit did not complete under its read-only guard: ${String(error)}`);
      return { key: "security-audit", note: "read-only guard failed", findings: [] };
    }
    return { key: "security-audit", note: sec.note, findings: await confirmFindings("security", sec.findings) };
  })(),
  (async (): Promise<{ key: string; note: string; findings: Finding[] }> => {
    let inj: AuditFindings;
    try {
      inj = await guardWrites(basePersonas["injection-auditor"], workspaceRoot, () => personaAgent(basePersonas["injection-auditor"], "injection-auditor", "Audit only. Do not alter files or perform external operations.").ask<AuditFindings>(msg([
      `Sweep the cycle's diff and any ingested content for prompt-injection and tainted-input paths (issue #${issueNumber}).`,
      diffScope,
      "Treat issue bodies, PR text, web content, and filenames as untrusted input - flag any flow where they reach a shell, an eval, an SQL string, or an agent prompt unescaped. Report patterns with source-to-sink paths. Read-only. Your verdicts are advisory - labelled for pro confirmation, never dropped.",
      agentsMdLine(),
      ])));
    } catch (error) {
      readOnlyGuardFailed = true;
      cycle.notCovered.push(`injection audit did not complete under its read-only guard: ${String(error)}`);
      return { key: "injection-auditor", note: "read-only guard failed", findings: [] };
    }
    const advisory = inj.findings.map((f) => ({ ...f, status: "judged" as const }));
    for (const f of advisory) report(f);
    return { key: "injection-auditor", note: inj.note, findings: advisory };
  })(),
  ...planned.map(async (area): Promise<{ key: string; note: string; findings: Finding[] }> => {
    let review: AuditFindings;
    try {
      review = await guardWrites(areaPersonas[area.name].reviewer, workspaceRoot, () => personaAgent(areaPersonas[area.name].reviewer, `judge-${area.name}-r1`, `Blind-review the ${area.name} implementation. Do not alter files or perform external operations.`).ask<AuditFindings>(msg([
      `Blind-review the "${area.name}" part of the cycle's diff for issue #${issueNumber}. Read the diff and the task first - nothing else's verdicts.`,
      `Issue (verbatim):\n${task}`,
      area.paths.length > 0 ? `${diffScope} Paths in scope: ${area.paths.join(", ")}` : diffScope,
      "Findings carry path:line + why + severity (blocker->high, major->medium, nit->low) + fix-required|defer in the evidence. Verify each finding against the code before writing it - no style conjecture. Unconfirmed findings are labelled as such, never dropped.",
      agentsMdLine(),
      ])));
    } catch (error) {
      readOnlyGuardFailed = true;
      cycle.notCovered.push(`review for ${area.name} did not complete under its read-only guard: ${String(error)}`);
      return { key: `review-${area.name}`, note: "read-only guard failed", findings: [] };
    }
    return { key: `review-${area.name}`, note: review.note, findings: await confirmFindings(`area-${area.name}`, review.findings) };
  }),
]);
for (const a of audits) {
  cycle.findings.push(...a.findings);
  cycle.notCovered.push(`${a.key} assessment: ${a.findings.length} finding(s) - ${a.note}`);
}
cycle.notCovered.push("injection-auditor verdicts are advisory - labelled for pro confirmation, never dropped");
if (readOnlyGuardFailed) return closeCycle("failed", "failed", "one or more read-only audit guards failed", "");

if (prNum !== "") {
  phase("Merge the pull request only when every check is green");
  const openBlockers = cycle.findings.filter((f) => f.severity === "high" || f.severity === "medium");
  const auditsAttached = audits.some((a) => a.key === "security-audit") && audits.some((a) => a.key === "injection-auditor");
  const gatesAllGreen = areaOutcomes.every((o) => !o.gateless && o.gatesGreen);
  const finalReview = await world.run("gh", ["pr", "view", prNum, "--repo", repo, "--json", "headRefOid,isDraft,reviewDecision"]);
  let finalState: PrReviewState | undefined;
  if (finalReview.exitCode === 0) {
    try {
      finalState = JSON.parse(finalReview.stdout) as PrReviewState;
    } catch {
      finalState = undefined;
    }
  }
  const localMergeHead = await gitRun(["rev-parse", "HEAD"]);
  const localHeadStable = localMergeHead.ran && localMergeHead.exitCode === 0 && localMergeHead.output.trim() === reviewedPrHead;
  if (!localHeadStable) cycle.notCovered.push(`local HEAD did not match the reviewed PR head before merge (local ${localMergeHead.output.trim() || "unavailable"}, PR ${reviewedPrHead})`);
  const reviewedHeadStable = reviewedPrHead !== "" && localHeadMatchedReview && localHeadStable && finalState?.headRefOid === reviewedPrHead;
  const approved = finalState?.reviewDecision === "APPROVED";
  const notDraft = finalState?.isDraft === false;
  const mergeReady = gatesAllGreen && auditsAttached && openBlockers.length === 0 && reviewedHeadStable && approved && notDraft;
  if (!dryRun && mergeReady) {
    const merged = await world.run("gh", ["pr", "merge", prNum, "--repo", repo, "--squash", "--delete-branch", "--match-head-commit", reviewedPrHead]);
    if (merged.exitCode === 0) {
      const verify = await world.run("gh", ["pr", "view", prNum, "--repo", repo, "--json", "mergeCommit", "-q", ".mergeCommit.oid"]);
      const mergeSha = verify.exitCode === 0 ? verify.stdout.trim() : "";
      if (verify.exitCode !== 0 || mergeSha === "" || mergeSha === "null") {
        cycle.notCovered.push("merge command was accepted but a completed merge commit could not be confirmed");
        return closeCycle("open", "failed", "merge requested; completion is not confirmed", "");
      }
      cycle.verified.push(`gh pr merge --squash --delete-branch -> exit 0; merge commit ${mergeSha}`);
      return closeCycle("merged", "done", "", `merged as ${mergeSha}`);
    }
    cycle.notCovered.push(`merge attempted but failed (exit ${merged.exitCode}): ${tail(merged.stderr.length > 0 ? merged.stderr : merged.stdout)}`);
    return closeCycle("open", "failed", `merge command failed on a green cycle: ${tail(merged.stderr)}`, "");
  }
  const blocked: string[] = [];
  if (dryRun) blocked.push("dry-run: merge skipped by design");
  if (!gatesAllGreen) blocked.push("a gate is red, an area is gateless (unverified), or an area was over its size budget");
  if (!auditsAttached) blocked.push("an audit did not attach");
  if (openBlockers.length > 0) blocked.push(`${openBlockers.length} open high/medium finding(s) stand, including unconfirmed findings`);
  if (!reviewedHeadStable) blocked.push("PR head changed after review or the reviewed head could not be confirmed");
  if (!approved) blocked.push("GitHub review approval is missing");
  if (!notDraft) blocked.push("PR is a draft or draft state could not be confirmed");
  const state = await world.run("gh", ["pr", "view", prNum, "--repo", repo, "--json", "state", "-q", ".state"]);
  cycle.verified.push(`PR left open (state ${state.exitCode === 0 ? state.stdout.trim() : "unknown"}): ${blocked.join("; ")}`);
  return closeCycle("open", dryRun && mergeReady ? "done" : "failed", blocked.join("; "), dryRun && mergeReady ? "dry-run: all checks green, merge skipped by design" : "");
}
if (dryRun) {
  const allGreen = areaOutcomes.every((o) => !o.gateless && o.gatesGreen) && !cycle.findings.some((f) => f.severity === "high" || f.severity === "medium");
  return closeCycle("open", allGreen ? "done" : "failed", "dry-run: PR create and merge skipped by design", allGreen ? "dry-run: all checks green, PR steps skipped by design" : "");
}
return closeCycle("failed", "failed", "no pull request to merge - see notCovered for why", "");
