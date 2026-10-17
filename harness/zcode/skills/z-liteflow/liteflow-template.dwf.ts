// z-liteflow template: one area, one lane, one run-owned worktree.
// The coordinator fills in the six constants below and changes nothing else.

const TASK = "<the task, verbatim>";
const REPO = "<absolute repo root>";
const BASE = "<base commit sha>";
const SLUG = "<short-task-slug>";
/** Every file the task may change, relative to REPO. */
const FILES: string[] = ["<path>"];
/** The repo's own gate, run inside the worktree. */
const GATE = { tool: "<tool>", args: ["<arg>"] };
/** 2 for 1-3 changed files, 3 for 4-5. */
const CAP = 2;

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

function result(r: WorldRunResult): { code: number; out: string } {
  return { code: r.exitCode, out: (r.stdout + "\n" + r.stderr).trim().slice(-2000) };
}
async function git(args: string[]): Promise<{ code: number; out: string }> {
  return result(await world.run("git", args));
}
/** Runs the gate inside the worktree: the shell text is a literal, the paths are arguments. */
async function gateInWorktree(): Promise<{ code: number; out: string }> {
  return result(await world.run("sh", ["-c", 'cd "$1" && shift && exec "$@"', "sh", WT, GATE.tool, ...GATE.args]));
}

/** Paths in a `git status --porcelain -z` listing, read per entry, never trimmed as a whole. */
function changedPaths(z: string): string[] {
  return z.split("\u0000").filter((e) => e.length > 3).map((e) => e.slice(3));
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

const implementer = agent("implementer-" + SLUG, {
  model: PRO,
  system:
    "You implement one small change with the smallest coherent edit. Work only inside " + WT +
    ", never in " + REPO + ". Never run git. Never edit an existing test to make it pass. " +
    "If the instructions are impossible, escalate and say so; never fake a pass.",
});

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
  const outside = status.code === 0 ? changedPaths(status.out).filter((p) => !FILES.includes(p)) : ["git status exit " + String(status.code)];
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
  const verdict = await agent("judge-" + SLUG + "-r" + String(round), {
    model: PRO,
    system: "You are a fresh judge who has never seen this work. Report only real problems you can show evidence for. Never edit files.",
  }).ask<Verdict>(
    "Task: " + TASK + "\nJudge the change in " + WT + " (read the files there; new files may be untracked).\n" +
      "Gate (" + GATE.tool + " " + GATE.args.join(" ") + ") exit " + String(gate.code) + ".\n" +
      (unmatched.length > 0 ? "Requirements the tracer could not tie to a line:\n" + JSON.stringify(unmatched) + "\n" : "") +
      "Diff against the base (may be cut):\n" + diff.out,
  );

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
} else if (pending.out === "") {
  notCovered.push("No change was staged, so nothing was committed.");
} else {
  const c = await git(["-C", WT, "commit", "-m", SLUG + ": " + TASK.slice(0, 60)]);
  committed = c.code === 0;
  if (committed) verified.push("committed on " + BRANCH + " in " + WT);
  else report.push({ where: WT, what: "git commit failed", evidence: c.out, status: "verified" });
}
const userAfter = await git(["-C", REPO, "status", "--porcelain", "-z"]);
if (userAfter.out !== userBefore.out) {
  report.push({ where: REPO, what: "The user's checkout changed during the run", evidence: JSON.stringify(userAfter.out), status: "verified" });
} else {
  verified.push("the user's checkout is unchanged (git status before and after)");
}

report.push(...open);
await artifact.markdown(
  "report",
  [
    "# z-liteflow report",
    "",
    "Task: " + TASK,
    "Rounds: " + String(rounds) + " of " + String(CAP) + "; open findings: " + String(open.length),
    "Branch: " + BRANCH + " in " + WT + (committed ? " (committed)" : " (not committed)"),
    "Merging into your checkout is a separate step: the coordinator asks you first.",
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
  notCovered: [...notCovered, "Merging " + BRANCH + " into the user's checkout needs the user's yes."],
};
