/* zcode-workflow
description: Prepare a standalone Z workflow v2 execution script
args:
  task:
    type: string
    required: true
  repoRoot:
    type: string
    required: true
  baseCommit:
    type: string
    required: true
  baseBranch:
    type: string
    required: true
  skillRoot:
    type: string
    required: true
  draftPath:
    type: string
    required: true
  platformContract:
    type: string
    required: true
  scopes:
    type: json
    default: []
*/
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


interface HighAttempt {
  round: number;
  criterion: string;
  evidence: string;
  failed: boolean;
  completed: boolean;
  correction: boolean;
  thinking: "high";
}

interface MaxEvidence {
  problem: string;
  attempts: HighAttempt[];
  reasoningLimited: boolean;
}

const v2Escalations: MaxEvidence[] = [];

function v2MaxAllowed(evidence: MaxEvidence): boolean {
  return evidence.problem.trim() !== "" && evidence.reasoningLimited &&
    evidence.attempts.length >= 2 &&
    new Set(evidence.attempts.map((a) => a.round)).size >= 2 &&
    evidence.attempts.every((a) => a.completed && a.correction && a.thinking === "high" && a.failed && a.criterion === evidence.problem && a.evidence.trim() !== "");
}

async function v2Persona(path: string, tier: "pro" | "flash", access: "read-only" | "write", maxEvidence?: MaxEvidence): Promise<Persona> {
  if (maxEvidence && tier !== "pro") throw new Error("Only a responsible Pro problem-solving role may escalate; Flash evidence roles stay high");
  const original = await loadPersona(path, { tier, access });
  if (!original) throw new Error("Required v2 persona unavailable: " + path);
  if (maxEvidence && !v2MaxAllowed(maxEvidence)) throw new Error("Max requires two evidenced unsuccessful high attempts on the same reasoning problem");
  const base = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
  const modelId = base + (maxEvidence ? "$max" : "$high");
  const selected = PERSONA_MODELS[modelId];
  if (!selected) throw new Error("Unsupported v2 model: " + modelId);
  const persona = { ...original, modelId, model: selected, note: original.note + "; v2 explicitly selects " + modelId };
  const index = personaLoaded.indexOf(original);
  if (index >= 0) personaLoaded[index] = persona;
  if (maxEvidence) v2Escalations.push(maxEvidence);
  return persona;
}

function v2Agent(persona: Persona, name: string, rules: string): Agent {
  return personaAgent(persona, name, rules + "\nFollow z-workflow-v2 policy for this run. Do not invoke agents or workflows. Do not perform Git mutations. Use only assigned paths and commands. Persona tool declarations describe intended authority; runtime tools are shared, so obey this explicit restriction.");
}


interface ScoutResult {
  scope: string;
  evidence: string[];
  findings: string[];
  paths: string[];
  skills: string[];
  personas: string[];
  acceptance: string[];
  commands: string[];
  unknowns: string[];
}
interface Brief {
  goal: string;
  acceptance: { id: string; criterion: string; check: string }[];
  dispositions: { scout: string; finding: string; status: "accepted" | "rejected" | "unresolved"; reason: string }[];
  personas: { role: string; path: string; sha256: string; access: "read-only" | "write"; reason: string }[];
  visualScenarios: { state: string; viewport: string; check: string }[];
  lanes: { name: string; owns: string[]; dependsOn: string[]; persona: string; skills: string[]; gate: string }[];
  sharedContracts: string[];
  gates: string[];
  visible: boolean;
  findings: string[];
  blockers: string[];
}
interface Draft {
  scriptPath: string;
  plan: string;
  commands: string[];
  blockers: string[];
  nextApproach: string;
}
interface ScriptReview {
  findings: { id: string; problem: string; evidence: string; reasoningLimited: boolean }[];
  blockers: string[];
}
function argument(name: string): string {
  const value = args[name];
  if (typeof value !== "string" || value.trim() === "") throw new Error("Missing string argument " + name);
  return value;
}
phase("Load preparation personas");
const TASK = argument("task");
const REPO = argument("repoRoot");
const BASE = argument("baseCommit");
const BRANCH = argument("baseBranch");
const ROOT = argument("skillRoot");
const DRAFT = argument("draftPath");
const CONTRACT = argument("platformContract");
if (args.scopes !== undefined && (!Array.isArray(args.scopes) || !args.scopes.every((s) => typeof s === "string" && s.trim() !== ""))) throw new Error("scopes must be nonempty strings");
const scopes: string[] = Array.isArray(args.scopes) ? args.scopes as string[] : [];
if (scopes.length === 0) scopes.push("Source structure, stack and domain personas", "Acceptance criteria, verification commands and visible behavior");
if (!DRAFT.startsWith("/") || DRAFT.split("/").includes("..") || !DRAFT.endsWith(".dwf.ts")) throw new Error("Draft must be an absolute .dwf.ts path with no traversal");
if (DRAFT.startsWith(REPO + "/")) {
  if (!DRAFT.startsWith(REPO + "/.zcode/workflow-drafts/")) throw new Error("An in-repository draft must use the dedicated workflow-drafts directory");
  const ignored = await world.run("git", ["-C", REPO, "check-ignore", "--quiet", "--", DRAFT]);
  if (ignored.exitCode !== 0) throw new Error("In-repository draft must be ignored; use an external run-owned draft instead");
}
const [explorer, synthesizer, authorPersona, reviewPersona] = await Promise.all([
  v2Persona(ROOT + "/personas/explorer.md", "flash", "read-only"),
  v2Persona(ROOT + "/personas/synthesizer.md", "pro", "read-only"),
  v2Persona(ROOT + "/personas/author.md", "pro", "write"),
  v2Persona(ROOT + "/personas/reviewer.md", "pro", "read-only"),
]);
const common = "Task: " + TASK + "\nRepository: " + REPO + "\nBase: " + BASE + "\nDestination branch: " + BRANCH + "\nV2 root: " + ROOT;
const before = await personaSnapshot(REPO);
const scouts = await future(async () => {
  phase("Parallel Flash exploration");
  // JOIN: synthesis needs the complete evidence set; each independent scout starts before awaiting the set.
  return await Promise.all(scopes.map((scope, index) => v2Agent(explorer, "Explore " + String(index + 1), "Read-only exploration. Return a complete report including negative results and search scope in evidence. No writes, no subprocess agents. Exclude research/ from discovery. Read project instructions and relevant local specialist routing. Scope: " + scope).ask<ScoutResult>(common + "\nYour distinct exploration question: " + scope + "\nReturn all consequential findings with command/path evidence, relevant specialist paths and required skill paths; don't rewrite the task or design workflow code.")));
});
if (await personaSnapshot(REPO) !== before) throw new Error("Preparation exploration changed source state; stop without restoring files");
const brief = await future(async () => {
  phase("Pro synthesis");
  return await guardWrites(synthesizer, REPO, () => v2Agent(synthesizer, "Synthesize preparation findings", "Read-only. Consume every scout report, preserve contradictions and unknowns, resolve only consequential uncertainty with targeted checks. Read " + ROOT + "/references/policies.md and " + ROOT + "/references/specialists.md. Shared API contracts precede consumers; independent ownership proceeds in parallel.").ask<Brief>(common + "\nComplete scout evidence: " + JSON.stringify(scouts)));
});
report({ stage: "synthesis", scouts, brief });
if (brief.blockers.length > 0) {
  report({ stage: "preparation", status: "blocked", blockers: brief.blockers });
  return { status: "blocked", brief, scouts, scriptPath: "", personas: personaReport(), escalations: v2Escalations };
}
const highAuthor = v2Agent(authorPersona, "Author execution workflow", "Write only " + DRAFT + ". Read local execution.md and policies.md plus relevant platform facade/compile rules at " + CONTRACT + ". Paste " + ROOT + "/persona-kit.dwf.ts unchanged and then " + ROOT + "/model-policy.dwf.ts unchanged. Use v2Persona and v2Agent for every execution role; correct domain persona with explicit authority, high default, fresh judges, persistent implementers, no round cap. Never load another workflow skill or old planner/author policy.");
const attempts: Record<string, HighAttempt[]> = {};
let feedback = "";
let pendingMax: MaxEvidence | undefined;
let maxAuthor: Agent | undefined;
let round = 0;
let targetedCriteria: string[] = [];
let lastMaxProblem = "";
let draft: Draft = { scriptPath: DRAFT, plan: "", commands: [], blockers: [], nextApproach: "" };
while (true) {
  round += 1;
  const isMax = pendingMax !== undefined;
  const correctedCriteria = targetedCriteria.slice();
  if (pendingMax) {
    lastMaxProblem = pendingMax.problem;
    const p = await v2Persona(ROOT + "/personas/author.md", "pro", "write", pendingMax);
    maxAuthor = v2Agent(p, "Resolve blocked script problem " + String(round), "Write only " + DRAFT + ". Resolve only the evidenced blocked problem. Read local policies/execution and the draft. No unrelated redesign. Evidence: " + JSON.stringify(pendingMax));
  }
  const selected = isMax && maxAuthor ? maxAuthor : highAuthor;
  draft = await future(async () => {
    phase("Author and correct execution script");
    return await selected.ask<Draft>(common + "\nPlatform contract: " + CONTRACT + "\nRequired output path: " + DRAFT + "\nBrief: " + JSON.stringify(brief) + "\nFull scout findings: " + JSON.stringify(scouts) + "\nCorrection feedback: " + feedback + "\nReturn actual script path, compact topology, complete executable command set, external blockers, and nextApproach (a concrete alternative if this revision still fails). Keep the file current; don't return script text.");
  });
  if (await personaSnapshot(REPO) !== before) throw new Error("Draft author changed protected source; stop without restoring");
  if (draft.scriptPath !== DRAFT || draft.blockers.length > 0) return { status: "blocked", brief, draft, personas: personaReport(), escalations: v2Escalations };
  const check = await future(async () => {
    phase("Strict script validation");
    return await world.run("bun", ["--no-env-file", "--config=/dev/null", ROOT + "/scripts/check-script.ts", DRAFT]);
  });
  let findings: { id: string; problem: string; evidence: string; reasoningLimited: boolean }[] = [];
  if (check.exitCode !== 0) findings.push({ id: "script-compilation", problem: "Execution script must compile against the workflow facade", evidence: check.stdout + check.stderr, reasoningLimited: false });
  if (check.exitCode === 0) {
    const review = await future(async () => {
      phase("Independent script review");
      return await guardWrites(reviewPersona, REPO, () => v2Agent(reviewPersona, "Review execution script round " + String(round), "Read-only. Read " + DRAFT + " and local policies.md/execution.md. Review actual script for task coverage, parallelism, explicit persona authority, high defaults and two-failure max eligibility, uncapped productive correction loops, real gates, required vision, Git safety, API compatibility. Report actionable material defects only, no stylistic wishes. IDs must identify stable violated criteria independent of wording; use the same ID when the same criterion is still failing. Do not see author reasoning.").ask<ScriptReview>(common + "\nAcceptance and contracts: " + JSON.stringify(brief) + "\nScript path: " + DRAFT));
    });
    if (review.blockers.length > 0) return { status: "blocked", brief, draft, blockers: review.blockers, personas: personaReport() };
    findings = review.findings;
  }
  report({ stage: "script validation", round, thinking: isMax ? "max" : "high", findings });
  if (findings.length === 0) break;
  if (isMax) {
    attempts[lastMaxProblem] = [];
    if (draft.nextApproach.trim() === "") return { status: "blocked", reason: "Max correction failed and the author has no viable next approach", findings, scriptPath: DRAFT, personas: personaReport(), escalations: v2Escalations };
  }
  pendingMax = undefined;
  for (const finding of findings) {
    const rows = attempts[finding.id] ?? [];
    if (!isMax && correctedCriteria.includes(finding.id)) rows.push({ round, criterion: finding.id, evidence: finding.evidence, failed: true, completed: true, thinking: "high", correction: true });
    attempts[finding.id] = rows;
    const candidate = { problem: finding.id, attempts: rows, reasoningLimited: finding.reasoningLimited };
    if (!isMax && !pendingMax && v2MaxAllowed(candidate)) pendingMax = candidate;
  }
  targetedCriteria = findings.map((finding) => finding.id);
  // Environmental/mechanical failures are not reasoning failures. After two repeated failures,
  // request a changed diagnosis; an explicit unresolved external blocker ends incomplete above.
  feedback = JSON.stringify({ findings, priorFailedHighAttempts: attempts, requirement: "Correct evidenced defects. After repeated failure change approach or name an external blocker; never blindly repeat." });
}
report({ stage: "preparation complete", scriptPath: DRAFT, rounds: round, personas: personaReport(), escalations: v2Escalations });
return { status: "ready", scriptPath: DRAFT, brief, scouts, plan: draft.plan, commands: draft.commands, preparationRounds: round, personas: personaReport(), escalations: v2Escalations };
