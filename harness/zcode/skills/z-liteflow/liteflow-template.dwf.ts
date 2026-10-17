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

// persona-kit:start v3
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

const PERSONA_SNAPSHOT_PY = String.raw`import hashlib
import json
import os
import stat
import subprocess
import sys

EXCLUDED = [".", ":(exclude)research", ":(exclude)research/**"]
MAX_SUBMODULE_DEPTH = 8

def git(repo, *args, allow_failure=False):
    result = subprocess.run(["git", *args], cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode and not allow_failure:
        raise RuntimeError("git " + " ".join(args[:3]) + " failed: " + result.stderr.decode("utf-8", "replace")[:300])
    return result

def repo_snapshot(repo, depth=0):
    if depth > MAX_SUBMODULE_DEPTH:
        raise RuntimeError("submodule nesting exceeds the snapshot limit")
    status = git(repo, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none", "--", *EXCLUDED).stdout
    head_result = git(repo, "rev-parse", "--verify", "HEAD", allow_failure=True)
    head = head_result.stdout.strip() if head_result.returncode == 0 else b"<unborn>"
    staged = git(repo, "diff", "--cached", "--binary", "--", *EXCLUDED).stdout
    entries = git(repo, "ls-files", "--stage", "-z", "--", *EXCLUDED).stdout
    others = git(repo, "ls-files", "--others", "--exclude-standard", "-z", "--", *EXCLUDED).stdout
    index = {}
    paths = set()
    for entry in entries.split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, object_id, stage = metadata.split(b" ", 2)
        path = os.fsdecode(raw_path)
        index[path] = (mode.decode("ascii"), object_id.decode("ascii"), stage.decode("ascii"))
        paths.add(path)
    paths.update(os.fsdecode(path) for path in others.split(b"\0") if path)
    files = []
    for path in sorted(paths, key=os.fsencode):
        full = os.path.join(repo, path)
        try:
            info = os.lstat(full)
        except FileNotFoundError:
            files.append([path, "missing", index.get(path)])
            continue
        mode = index.get(path)
        if stat.S_ISLNK(info.st_mode):
            files.append([path, "symlink", os.readlink(full), stat.S_IMODE(info.st_mode), mode])
        elif mode is not None and mode[0] == "160000":
            if not stat.S_ISDIR(info.st_mode):
                files.append([path, "gitlink-uninitialized", mode])
            else:
                nested = git(full, "rev-parse", "--show-toplevel", allow_failure=True)
                if nested.returncode != 0 or os.path.realpath(os.fsdecode(nested.stdout.strip())) != os.path.realpath(full):
                    files.append([path, "gitlink-uninitialized", mode])
                else:
                    files.append([path, "gitlink", mode, repo_snapshot(full, depth + 1)])
        elif stat.S_ISREG(info.st_mode):
            digest = hashlib.sha256()
            flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            fd = os.open(full, flags)
            try:
                current = os.fstat(fd)
                if not stat.S_ISREG(current.st_mode):
                    raise RuntimeError("file type changed while fingerprinting " + repr(path))
                while True:
                    chunk = os.read(fd, 1024 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
            finally:
                os.close(fd)
            files.append([path, "file", digest.hexdigest(), stat.S_IMODE(info.st_mode), mode])
        else:
            files.append([path, "other", info.st_mode, info.st_rdev, mode])
    return [status.hex(), head.decode("ascii", "replace"), staged.hex(), files]

snapshot = json.dumps(repo_snapshot(os.path.abspath(sys.argv[1])), ensure_ascii=True, separators=(",", ":")).encode("ascii")
print(hashlib.sha256(snapshot).hexdigest())
`;

async function personaSnapshot(dir: string): Promise<string> {
  const result = await world.run("python3", ["-c", PERSONA_SNAPSHOT_PY, dir]);
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
// persona-kit:end v3

function changedPaths(z: string): string[] {
  const entries = z.split(String.fromCharCode(0));
  const paths: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.length < 4) continue;
    paths.push(entry.slice(3));
    if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
      const source = entries[++i];
      if (source === undefined || source === "") throw new Error("Incomplete rename/copy in git status");
      paths.push(source);
    }
  }
  return [...new Set(paths)];
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

const implPersona = IMPLEMENTER_PERSONA === "" ? undefined : await loadPersona(IMPLEMENTER_PERSONA, { tier: "pro", access: "write" });
const judgePersona = JUDGE_PERSONA === "" ? undefined : await loadPersona(JUDGE_PERSONA, { tier: "pro", access: "read-only" });
if ((IMPLEMENTER_PERSONA !== "" && implPersona === undefined) || (JUDGE_PERSONA !== "" && judgePersona === undefined)) {
  return {
    conclusion: "Stopped because a configured persona could not be validated.",
    findings: personaFindings,
    verified,
    notCovered: ["No implementation or review ran because persona validation failed."],
  };
}

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
