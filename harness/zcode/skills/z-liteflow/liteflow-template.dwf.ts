// z-liteflow template: one area, one lane, one run-owned worktree.
// The coordinator fills in the constants below (six required, two optional persona paths)
// and changes nothing else. The persona-kit block further down is a verbatim copy of
// z-workflow/persona-kit.dwf.ts; the drift check compares it with that file.

const TASK: string = "<the task, verbatim>";
const REPO: string = "<absolute repo root>";
const BASE: string = "<base commit sha>";
const SLUG: string = "<short-task-slug>";
/** Every file the task may change, relative to REPO. */
const FILES: string[] = ["<path>"];
/** The repo's own gate, run inside the worktree. */
const GATE = { tool: "<tool>", args: ["<arg>"] };
/** 2 for 1-3 changed files, 3 for 4-5. */
const CAP: number = 2;
/** Optional: absolute path of an agent file whose body drives the implementer. "" = built-in. */
const IMPLEMENTER_PERSONA: string = "";
/** Optional: absolute path of an agent file whose body drives the judge. "" = built-in. */
const JUDGE_PERSONA: string = "";

const WT = REPO + ".wf-" + SLUG;
const BRANCH = "wf/" + SLUG;
const PRO = model("account:zai-individual-coding-plan/GLM-5.3");
const FLASH = model("account:zai-individual-coding-plan/GLM-5.3-Flash");

interface Finding {
  /** File (and line) the finding is about. */
  where: string;
  /** One sentence: what is wrong. */
  what: string;
  /** The command output, quote, or verdict that shows it. */
  evidence: string;
  /** verified: a command showed it; judged: a judge said so; unconfirmed: nothing reproduced it. */
  status: "verified" | "judged" | "unconfirmed";
}

interface TraceRow {
  /** One requirement from the task, quoted. */
  requirement: string;
  /** Path of the file that meets it, relative to the worktree. */
  path: string;
  /** An exact line from that file that shows it is met. */
  quote: string;
}

interface Trace {
  /** One row per requirement in the task. */
  rows: TraceRow[];
}

interface Verdict {
  /** Real problems only, each with evidence you saw. Empty when the work is right. */
  findings: { where: string; what: string; evidence: string }[];
}

const report: Finding[] = [];
const verified: string[] = [];
const notCovered: string[] = [];

/** `raw` is stdout exactly as printed: parse it. `out` is trimmed stdout + stderr: show it. */
function result(r: WorldRunResult): { code: number; out: string; raw: string } {
  return { code: r.exitCode, out: (r.stdout + "\n" + r.stderr).trim().slice(-2000), raw: r.stdout };
}
async function git(args: string[]): Promise<{ code: number; out: string; raw: string }> {
  return result(await world.run("git", args));
}
/** Runs the gate inside the worktree: the shell text is a literal, the paths are arguments. */
async function gateInWorktree(): Promise<{ code: number; out: string; raw: string }> {
  return result(await world.run("sh", ["-c", 'cd "$1" && shift && exec "$@"', "sh", WT, GATE.tool, ...GATE.args]));
}

// persona-kit:start v2
// Canonical source: z-workflow/persona-kit.dwf.ts. Paste this block unchanged, from the
// start marker to the end marker, into any workflow script that wants specialist
// subagents built from agent files. Scripts cannot import, so the block is copied; the
// drift check in z-workflow's SKILL.md compares its sha256 with the canonical file.
//
// Use:
//   const reviewer = await loadPersona("/abs/path/agents/svelte-review.md");
//   if (reviewer !== undefined) {
//     const v = await guardWrites(reviewer, WT, () =>
//       personaAgent(reviewer, "svelte-review-r1", RUN_RULES).ask<Verdict>("..."));
//   }
//   ... findings: [...yourFindings, ...personaFindings], report lines: personaReport()
//
// Verified behaviour (probe dwfrun-ee616ce6): the body becomes the system prompt and is
// followed; the frontmatter model is honoured; tools: is NOT enforced inside workflows
// (every subagent gets every tool), so read-only personas are guarded by git status;
// AGENTS.md is injected automatically. The $level suffix compiles; its effect on reasoning
// effort is not observable, so treat it as unverified.

/** Every model a persona may resolve to. model() takes literals only, so all are declared. */
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

/** Tools that can change files; a persona listing none of them (and not "*") is read-only. */
const PERSONA_WRITE_TOOLS = ["*", "write", "edit", "multiedit", "notebookedit", "bash"];

interface Persona {
  /** Frontmatter name, or the file name when the field is missing. */
  name: string;
  /** The path the persona was loaded from. */
  path: string;
  /** sha256 of the file as loaded. */
  sha256: string;
  /** The body after the frontmatter: the system prompt. */
  system: string;
  /** The model key used, with its $level when present. */
  modelId: string;
  /** The declared model for that key. */
  model: ModelRef;
  /** Tools listed in the frontmatter (advisory only inside workflows). */
  tools: string[];
  /** True when the listed tools cannot change files; guardWrites then checks for changes. */
  readOnly: boolean;
  /** Empty, or what the kit changed (for example a model forced by the run's profile). */
  note: string;
}

interface PersonaFinding {
  /** File or directory the finding is about. */
  where: string;
  /** One sentence: what happened. */
  what: string;
  /** The command output that shows it. */
  evidence: string;
  /** Kit findings come from commands, so they are verified. */
  status: "verified";
}

/** Findings the kit recorded; add them to the run's findings. */
const personaFindings: PersonaFinding[] = [];
/** Every persona that loaded; personaReport() lists them. */
const personaLoaded: Persona[] = [];

function personaField(front: string[], key: string): string {
  for (const line of front) {
    if (line.startsWith(key + ":")) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function personaToolList(raw: string): string[] {
  return raw.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter((t) => t !== "");
}

/**
 * Load an agent file as a persona. `tier` forces the model family for the run's profile
 * ("pro" for z-proflow, "flash" for z-flashflow), keeping the file's $level; "any" keeps
 * the file's model. Returns undefined, with a finding, when the file is missing, empty,
 * has no frontmatter or body, or names a model the kit does not declare.
 */
async function loadPersona(path: string, opts?: { tier?: "any" | "pro" | "flash" }): Promise<Persona | undefined> {
  const tier = opts?.tier ?? "any";
  const read = await world.run("cat", [path]);
  if (read.exitCode !== 0 || read.stdout.trim() === "") {
    personaFindings.push({ where: path, what: "Persona file could not be read; that role did not run", evidence: "cat exit " + String(read.exitCode) + ": " + read.stderr.slice(0, 200), status: "verified" });
    return undefined;
  }
  const lines = read.stdout.split("\n");
  const end = lines[0].trim() === "---" ? lines.indexOf("---", 1) : -1;
  const body = end > 0 ? lines.slice(end + 1).join("\n").trim() : "";
  if (end <= 0 || body === "") {
    personaFindings.push({ where: path, what: "Persona file has no frontmatter or no body; that role did not run", evidence: "first line " + JSON.stringify(lines[0]) + ", closing marker " + String(end), status: "verified" });
    return undefined;
  }
  const front = lines.slice(1, end);
  const fileModel = personaField(front, "model");
  const level = personaField(front, "thoughtLevel");
  let base = fileModel;
  let note = "";
  if (tier !== "any") {
    const forced = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
    if (base !== forced) {
      note = "model forced from " + (base === "" ? "(none)" : base) + " to " + forced + " by the run's " + tier + " profile";
      base = forced;
    }
  }
  const key = level === "" ? base : base + "$" + level;
  const ref = PERSONA_MODELS[key];
  if (ref === undefined) {
    personaFindings.push({ where: path, what: "Persona names a model the kit does not declare; that role did not run", evidence: "wanted " + JSON.stringify(key) + "; declared: " + Object.keys(PERSONA_MODELS).join(", "), status: "verified" });
    return undefined;
  }
  const sum = await world.run("shasum", ["-a", "256", path]);
  const tools = personaToolList(personaField(front, "tools"));
  const persona: Persona = {
    name: personaField(front, "name") || path.split("/").pop() || path,
    path,
    sha256: sum.exitCode === 0 ? sum.stdout.split(" ")[0] : "shasum exit " + String(sum.exitCode),
    system: body,
    modelId: key,
    model: ref,
    tools,
    readOnly: tools.length > 0 && !tools.some((t) => PERSONA_WRITE_TOOLS.includes(t.toLowerCase())),
    note,
  };
  personaLoaded.push(persona);
  return persona;
}

/**
 * A subagent driven by the persona. `name` must be unique in the run (add the round).
 * `rules` are the run's own rules for this role (worktree path, never run git, escalate
 * when impossible); they follow the persona body, so the run's rules come last.
 */
function personaAgent(p: Persona, name: string, rules?: string): Agent {
  const system = rules === undefined || rules.trim() === "" ? p.system : p.system + "\n\n## Rules for this run\n" + rules.trim();
  return agent(name, { system, model: p.model });
}

/** NUL, the separator of `git status -z`. Built from its code so retyping cannot mangle it. */
const PERSONA_NUL = String.fromCharCode(0);

function personaStatusEntries(z: string): string[] {
  return z.split(PERSONA_NUL).filter((e) => e.length > 3);
}

/**
 * Run `work` and, when the persona is read-only, compare `git status --porcelain -z` in
 * `dir` before and after; any new change is a finding. Use it only while no other writer
 * runs in `dir`, or another writer's changes will be reported as the persona's.
 */
async function guardWrites<T>(p: Persona, dir: string, work: () => PromiseLike<T>): Promise<T> {
  if (!p.readOnly) return await work();
  const before = await world.run("git", ["-C", dir, "status", "--porcelain", "-z"]);
  const result = await work();
  const after = await world.run("git", ["-C", dir, "status", "--porcelain", "-z"]);
  if (before.exitCode !== 0 || after.exitCode !== 0) {
    personaFindings.push({ where: dir, what: "Read-only guard could not run git status for " + p.name, evidence: "exit " + String(before.exitCode) + "/" + String(after.exitCode), status: "verified" });
    return result;
  }
  const was = personaStatusEntries(before.stdout);
  const changed = personaStatusEntries(after.stdout).filter((e) => !was.includes(e)).map((e) => e.slice(3));
  if (changed.length > 0) {
    personaFindings.push({ where: dir, what: "Read-only persona " + p.name + " changed files: " + changed.join(", "), evidence: "git status --porcelain -z before and after its asks", status: "verified" });
  }
  return result;
}

/** One line per loaded persona, for the report and the pre-launch command set. */
function personaReport(): string[] {
  return personaLoaded.map((p) => p.name + ": " + p.path + " sha256 " + p.sha256 + ", model " + p.modelId + (p.readOnly ? ", read-only (guarded)" : "") + (p.note === "" ? "" : "; " + p.note));
}
// persona-kit:end v2

/** Paths in a `git status --porcelain -z` listing, read per entry, never trimmed as a whole. */
function changedPaths(z: string): string[] {
  return z.split(PERSONA_NUL).filter((e) => e.length > 3).map((e) => e.slice(3));
}

phase("Create the run-owned worktree");
const userBefore = await git(["-C", REPO, "status", "--porcelain", "-z"]);
const add = await git(["-C", REPO, "worktree", "add", "-b", BRANCH, WT, BASE]);
if (add.code !== 0) {
  return {
    conclusion: "Stopped before any work: the run-owned worktree could not be created.",
    findings: [{ where: WT, what: "git worktree add failed", evidence: add.out, status: "verified" as const }],
    verified: [],
    notCovered: ["Everything: no work was started. Remove the stale branch " + BRANCH + " or pick a new slug."],
  };
}

const IMPLEMENTER_RULES =
  "You implement one small change with the smallest coherent edit. Work only inside " + WT +
  ", never in " + REPO + ". Never run git. Never edit an existing test to make it pass. " +
  "If the instructions are impossible, escalate and say so; never fake a pass.";
const JUDGE_RULES =
  "You are a fresh judge who has never seen this work. Report only real problems you can show evidence for. Never edit files.";

const implPersona = IMPLEMENTER_PERSONA === "" ? undefined : await loadPersona(IMPLEMENTER_PERSONA, { tier: "pro" });
const judgePersona = JUDGE_PERSONA === "" ? undefined : await loadPersona(JUDGE_PERSONA, { tier: "pro" });
if (IMPLEMENTER_PERSONA !== "" && implPersona === undefined) notCovered.push("Implementer persona did not load; the built-in implementer ran instead.");
if (JUDGE_PERSONA !== "" && judgePersona === undefined) notCovered.push("Judge persona did not load; the built-in judge ran instead.");

const implementer = implPersona !== undefined
  ? personaAgent(implPersona, "implementer-" + SLUG, IMPLEMENTER_RULES)
  : agent("implementer-" + SLUG, { model: PRO, system: IMPLEMENTER_RULES });

let feedback = "";
let prevOpen = -1;
let stalls = 0;
let open: Finding[] = [];
let rounds = 0;

for (let round = 1; round <= CAP; round += 1) {
  rounds = round;
  phase("Implement and check the change");
  await implementer.ask(
    "Task: " + TASK + "\nWork in the worktree " + WT + ". Files you may change: " + FILES.join(", ") + ".\n" +
      (feedback === "" ? "Make the change." : "Fix these open problems from the last round:\n" + feedback),
  );

  const status = await git(["-C", WT, "status", "--porcelain", "-z"]);
  const outside = status.code === 0 ? changedPaths(status.raw).filter((p) => !FILES.includes(p)) : ["git status exit " + String(status.code)];
  const gate = await gateInWorktree();

  const trace = await agent("tracer-" + SLUG + "-r" + String(round), {
    model: FLASH,
    system: "You map task requirements to exact lines in files. You never edit files and never run commands that change files.",
  }).ask<Trace>(
    "Task: " + TASK + "\nRead the changed files in " + WT + " (" + FILES.join(", ") + "). Give one row per requirement with an exact line that meets it.",
  );
  const unmatched: TraceRow[] = [];
  let matched = 0;
  for (const row of trace.rows) {
    const g = await git(["-C", WT, "grep", "-n", "-F", "--untracked", row.quote, "--", row.path]);
    if (g.code === 0) matched += 1;
    else unmatched.push(row);
  }

  const diff = await git(["-C", WT, "diff", BASE]);
  const judgeAsk =
    "Task: " + TASK + "\nJudge the change in " + WT + " (read the files there; new files may be untracked).\n" +
    "Gate (" + GATE.tool + " " + GATE.args.join(" ") + ") exit " + String(gate.code) + ".\n" +
    (unmatched.length > 0 ? "Requirements the tracer could not tie to a line:\n" + JSON.stringify(unmatched) + "\n" : "") +
    "Diff against the base (may be cut):\n" + diff.out;
  const judgeName = "judge-" + SLUG + "-r" + String(round);
  const verdict = judgePersona !== undefined
    ? await guardWrites(judgePersona, WT, () => personaAgent(judgePersona, judgeName, JUDGE_RULES).ask<Verdict>(judgeAsk))
    : await agent(judgeName, { model: PRO, system: JUDGE_RULES }).ask<Verdict>(judgeAsk);

  open = [
    ...verdict.findings.map((f) => ({ ...f, status: "judged" as const })),
    ...outside.map((p) => ({ where: p, what: "Changed outside the allowed files", evidence: "git status --porcelain -z in the worktree", status: "verified" as const })),
    ...(gate.code === 0 ? [] : [{ where: GATE.tool, what: "The gate is red", evidence: gate.out, status: "verified" as const }]),
  ];
  if (gate.code === 0) verified.push("round " + String(round) + ": gate " + GATE.tool + " " + GATE.args.join(" ") + " exit 0 in the worktree");
  verified.push("round " + String(round) + ": " + String(matched) + "/" + String(trace.rows.length) + " traced requirement lines found by git grep");

  if (open.length === 0) break;
  if (prevOpen >= 0 && open.length >= prevOpen) stalls += 1;
  else stalls = 0;
  prevOpen = open.length;
  if (stalls >= 2) break;
  feedback = JSON.stringify(open);
}

phase("Commit on the run branch and check the user's checkout");
const toAdd = FILES.filter((p) => p !== "");
const staged = await git(["-C", WT, "add", "--", ...toAdd]);
const pending = await git(["-C", WT, "diff", "--cached", "--name-only"]);
let committed = false;
if (staged.code !== 0) {
  report.push({ where: WT, what: "git add failed", evidence: staged.out, status: "verified" });
} else if (pending.raw.trim() === "") {
  notCovered.push("No change was staged, so nothing was committed.");
} else {
  const c = await git(["-C", WT, "commit", "-m", SLUG + ": " + TASK.slice(0, 60)]);
  committed = c.code === 0;
  if (committed) verified.push("committed on " + BRANCH + " in " + WT);
  else report.push({ where: WT, what: "git commit failed", evidence: c.out, status: "verified" });
}
const userAfter = await git(["-C", REPO, "status", "--porcelain", "-z"]);
if (userAfter.raw !== userBefore.raw) {
  report.push({ where: REPO, what: "The user's checkout changed during the run", evidence: JSON.stringify(userAfter.raw), status: "verified" });
} else {
  verified.push("the user's checkout is unchanged (git status before and after)");
}

report.push(...open);
report.push(...personaFindings);
await artifact.markdown(
  "report",
  [
    "# z-liteflow report",
    "",
    "Task: " + TASK,
    "Rounds: " + String(rounds) + " of " + String(CAP) + "; open findings: " + String(open.length),
    "Branch: " + BRANCH + " in " + WT + (committed ? " (committed)" : " (not committed)"),
    "The coordinator fast-forwards this branch into your checkout when the run is clean and your checkout is unchanged (z-workflow Step 6); otherwise it asks.",
    ...(personaLoaded.length > 0 ? ["", "## Personas", ...personaReport().map((l) => "- " + l)] : []),
    "",
    "## Findings",
    ...(report.length === 0 ? ["- none"] : report.map((f) => "- (" + f.status + ") " + f.where + ": " + f.what)),
  ].join("\n"),
  { title: "z-liteflow report", primary: true },
);

return {
  conclusion:
    open.length === 0
      ? "Done in " + String(rounds) + " round(s): gate green, no open findings, work on " + BRANCH + "."
      : "Stopped after " + String(rounds) + " round(s) with " + String(open.length) + " open finding(s); work is on " + BRANCH + ".",
  findings: report,
  verified,
  notCovered: [...notCovered, "Merging " + BRANCH + " into the user's checkout is the coordinator's Step 6: fast-forward when clean, otherwise ask."],
};
