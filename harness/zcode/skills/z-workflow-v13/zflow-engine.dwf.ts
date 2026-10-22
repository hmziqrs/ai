/* zcode-workflow
description: "zflow engine: the parallel chain — one launch, everything in-run.
  Every area its own state machine (plan, implement, vision, judge, looping per
  area until clean or honestly stopped) over channels with a counted close, so
  areas sit at different stages and rounds at once. Contention decides topology:
  terminal areas run parallel in the run's integration worktree; web areas each in their
  own git worktree with a deterministic port and isolated browser session (a
  dev-server URL named in the task overrides the port); desktop and mobile areas
  implement in worktrees but serialize the whole device phase through a
  single-worker device lane. Worktree branches merge into a run-owned
  integration worktree (branch zflow/<runTag>/integration) along the dependsOn
  DAG; merged worktrees are removed without --force and every branch is kept.
  The engine never writes the user's checkout. The coordinator delivers a clean
  committed result under z-workflow Step 6's guarded fast-forward policy. Models per profile:
  balanced (default) pins pro judgment + flash capture/audit; flash pins every
  role on flash, and flash verdicts are labelled judged, never verified. All commands anchor to repoRoot (git/make/go/pnpm
  via -C, npm via --prefix, yarn/bun via --cwd, cargo via a gate's own honored
  manifest path; python3/pytest via absolute path; npx refuses honestly); fresh
  judges with a confirmer per finding; gates re-run by the script;
  script-enforced size budgets; AGENTS.md injection; implementer notes surfaced
  in the report; live status board and a primary markdown report. commit=false
  skips every commit and merge."
whenToUse: Launched by a zflow chain coordinator with mode=chain, a task, and
  areas classified by contention (terminal, web, desktop, or mobile) — one
  launch per chain, never relaunching to fix (AmendWorkflow revises,
  ResumeWorkflowRun continues). This is the only zflow engine. The launcher
  passes no subagent_model and no max_concurrency unless the user asks for a
  width limit; models are pinned in-script per modelProfile.
args:
  agentsMd:
    type: string
    description: Repo hard-rules file injected into every spawned subagent's ask;
      empty string disables.
    required: false
    default: AGENTS.md
  areas:
    type: json
    description: "AreaSpec array: name, contention (terminal | web | desktop |
      mobile), paths, excludedPaths, skills, gates ({tool, args[]}), complexity,
      dependsOn, optional budget ({maxLines, maxFiles}). hasUI/lane fields are
      ignored with a recorded warning."
    required: true
    default: null
  baseSha:
    type: string
    description: Chain's starting commit sha; terminal areas' judge size
      evidence is measured against it (worktree areas measure against their
      branch point).
    required: false
    default: ""
  runTag:
    type: string
    description: Unique tag for this run's branches (zflow/<runTag>/<area> and
      zflow/<runTag>/integration). Defaults to the first 8 characters of
      baseSha, else "run". Pass a new tag when an earlier run's branches exist.
    required: false
    default: ""
  commit:
    type: boolean
    description: False skips every commit and every worktree merge; all work stays
      on disk and worktree dependents are blocked honestly.
    required: false
    default: true
  maxFiles:
    type: number
    description: "Run-level default size budget: max changed files."
    required: false
    default: 10
  maxLines:
    type: number
    description: "Run-level default size budget: max changed lines."
    required: false
    default: 400
  maxRounds:
    type: number
    description: Optional per-area round cap. Default unbounded — every area loops
      until clean, stagnation, or this cap.
    required: false
    default: 0
  mode:
    type: string
    description: Chain mode — the full per-area parallel loop.
    required: false
    default: chain
  modelProfile:
    type: string
    description: "balanced (default): pro judgment roles + flash capture/audit.
      flash: every role on flash — judgment compensated mechanically by gates,
      confirmers, and the in-run POLICY."
    required: false
    default: balanced
  vision:
    type: boolean
    description: "False compiles the run with NO vision phase at all — the capture
      and audit stage is absent from the phase graph, no flash lane exists, and
      non-terminal areas are judged from code and gates only (the report says so
      under notCovered). Pro-only flows launch with vision: false."
    required: false
    default: true
  repoRoot:
    type: string
    description: Absolute repo root. world.run's cwd is not the workspace root for
      saved runs — pass git rev-parse --show-toplevel from prep; when empty the
      engine tries to discover it itself.
    required: false
    default: ""
  task:
    type: string
    description: The verbatim task embedded in every subagent ask; a dev-server URL
      named here overrides the deterministic capture port for web areas.
    required: true
*/
// zflow-engine — the parallel chain. Every area is its own state machine
// (plan → implement → vision → judge, looping per area until clean or honestly
// stopped) flowing through channels between stage futures with a counted close:
// areas sit at different stages and rounds at once, and the run ends exactly
// when every area reaches a terminal state.
//
// Invariants:
// - world.run's cwd is not the workspace root — every command anchors to
//   repoRoot (passed by the coordinator; git/make/go/pnpm via -C, npm via
//   --prefix, yarn/bun via --cwd, cargo via --manifest-path, python3/pytest
//   via an absolute first path; npx refuses honestly).
// - The chain first creates a run-owned integration worktree under
//   <repoRoot>/.zflow/worktrees/_integration-<runTag> on branch
//   zflow/<runTag>/integration. Terminal areas work and commit there. Other
//   areas get worktrees lazily at implement entry (after deps merged), branched
//   from the integration HEAD as zflow/<runTag>/<area>, and merge back into it.
//   The user's checkout is never written. A clean merge removes the area
//   worktree (never --force); every branch is kept.
// - One implementer ask per chain round; gate failures drive judge findings
//   and rework rounds. Rounds are bounded by stagnation or the user's
//   maxRounds cap.
// - Desktop and mobile captures serialize through a single-worker device lane
//   (one screen, one AX tree, one simulator/emulator at a time); web captures
//   run concurrently, one isolated browser session and port per area.
// - Stale zflow/<runTag>/* branches/worktrees make creation fail loudly (pass a
//   new runTag); a merge that conflicts with the integration worktree is
//   aborted there — both are reported honestly, never forced.
// - Report cleanliness counts settle results, never standing findings alone.
// Node modes are not part of this engine; the z-*flow ports run their own
// node workflow.

// ---------------------------------------------------------------------------
// Types.
// ---------------------------------------------------------------------------

interface AreaSpec {
  name: string;
  contention: "terminal" | "web" | "desktop" | "mobile";
  paths: string[];
  excludedPaths: string[];
  skills: string[];
  gates: { tool: string; args: string[] }[];
  complexity: "straightforward" | "complex";
  dependsOn: string[];
  budget?: { maxLines: number; maxFiles: number };
}

interface GateOutcome {
  tool: string;
  argv: string;
  ran: boolean;
  exitCode: number;
  failure: string;
}

interface EF {
  where: string;
  what: string;
  evidence: string;
  /** verified: a command or a pro confirmer reproduced it; judged: only a flash confirmer did; unconfirmed: nobody reproduced it. */
  status: "verified" | "judged" | "unconfirmed";
  severity: "low" | "medium" | "high";
  area: string;
  round: number;
}

interface JudgeFindings {
  findings: { where: string; what: string; evidence: string; severity: "low" | "medium" | "high" }[];
  overallNote: string;
}

interface Confirmation {
  reproduced: boolean;
  note: string;
}

interface AreaWork {
  summary: string;
  changedFiles: string[];
  notes: string;
  skipped: string[];
}

interface Item {
  area: AreaSpec;
  rounds: number;
  plan?: string;
  port?: number;
  worktree?: string;
  branch?: string;
  wtBase?: string;
  gates: GateOutcome[];
  commitShas: string[];
  changedFiles: string[];
  skipped: string[];
  workSummary?: string;
  workNotes?: string;
  evidence: string[];
  visionOpen: EF[];
  carry: EF[];
  standing: EF[];
  lastOpen: number;
  nonShrinking: number;
  settledOk?: boolean;
  settle: (ok: boolean) => void;
}

// ---------------------------------------------------------------------------
// Arguments and validation. Invalid launches refuse honestly, nothing runs.
// ---------------------------------------------------------------------------

const mode = typeof args.mode === "string" ? args.mode : "";
if (mode !== "chain") {
  return {
    conclusion: `Refused to start: this engine runs mode "chain" only (got ${JSON.stringify(mode)}). Nothing ran.`,
    findings: [],
    verified: [],
    notCovered: ["everything — the engine was launched with an invalid mode"],
  };
}
const task = typeof args.task === "string" ? args.task : "";
if (task.length === 0) {
  return { conclusion: "Refused to start: task must be a non-empty string. Nothing ran.", findings: [], verified: [], notCovered: ["everything — no task"] };
}
const rawAreas: unknown = args.areas;
if (!Array.isArray(rawAreas) || rawAreas.length === 0) {
  return { conclusion: "Refused to start: areas must be a non-empty array. Nothing ran.", findings: [], verified: [], notCovered: ["everything — no areas"] };
}
const problems: string[] = [];
const seenNames = new Set<string>();
const areas: AreaSpec[] = [];
for (const entry of rawAreas) {
  if (typeof entry !== "object" || entry === null) continue;
  const e = entry as Record<string, unknown>;
  if (typeof e.name !== "string" || e.name.length === 0) {
    problems.push("an area has no usable name — dropped");
    continue;
  }
  if (seenNames.has(e.name)) {
    problems.push(`duplicate area name "${e.name}" dropped`);
    continue;
  }
  seenNames.add(e.name);
  const strArr = (v: unknown, label: string): string[] => {
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => {
      if (typeof x === "string") return true;
      problems.push(`${e.name}: ${label} non-string entry dropped`);
      return false;
    });
  };
  const gates: { tool: string; args: string[] }[] = [];
  if (Array.isArray(e.gates)) {
    e.gates.forEach((g, gi) => {
      if (typeof g !== "object" || g === null || typeof (g as Record<string, unknown>).tool !== "string") {
        problems.push(`${e.name}: gates[${gi}] has no tool — dropped`);
        return;
      }
      gates.push({ tool: (g as Record<string, unknown>).tool as string, args: strArr((g as Record<string, unknown>).args, `gates[${gi}].args`) });
    });
  }
  const contention = e.contention === "web" || e.contention === "desktop" || e.contention === "mobile" ? e.contention : "terminal";
  if (e.contention !== undefined && e.contention !== "terminal" && e.contention !== "web" && e.contention !== "desktop" && e.contention !== "mobile") {
    problems.push(`${e.name}: contention ${JSON.stringify(e.contention)} invalid — defaulted to terminal`);
  }
  let budget: { maxLines: number; maxFiles: number } | undefined = undefined;
  if (typeof e.budget === "object" && e.budget !== null) {
    const b = e.budget as Record<string, unknown>;
    if (typeof b.maxLines === "number" && typeof b.maxFiles === "number" && b.maxLines >= 1 && b.maxFiles >= 1) {
      budget = { maxLines: Math.floor(b.maxLines), maxFiles: Math.floor(b.maxFiles) };
    } else {
      problems.push(`${e.name}: budget invalid — run defaults apply`);
    }
  }
  areas.push({
    name: e.name,
    contention,
    paths: strArr(e.paths, "paths"),
    excludedPaths: strArr(e.excludedPaths, "excludedPaths"),
    skills: strArr(e.skills, "skills"),
    gates,
    complexity: e.complexity === "complex" ? "complex" : "straightforward",
    dependsOn: strArr(e.dependsOn, "dependsOn"),
    budget,
  });
}
for (const e of rawAreas) {
  if (typeof e !== "object" || e === null) continue;
  const o = e as Record<string, unknown>;
  if (typeof o.name === "string" && (o.hasUI !== undefined || o.lane !== undefined)) {
    problems.push(`${o.name}: hasUI/lane are not area fields, ignored — classify the area with contention: "terminal" | "web" | "desktop" | "mobile"`);
  }
}
if (areas.length === 0) {
  return { conclusion: `No usable areas (${problems.join("; ")}). Nothing ran.`, findings: [], verified: [], notCovered: ["everything — no usable areas"] };
}
// Drop unknown deps and break cycles so the fan-out can never deadlock.
const areaNames = new Set(areas.map((a) => a.name));
for (const a of areas) {
  const unknown = a.dependsOn.filter((d) => !areaNames.has(d));
  if (unknown.length > 0) problems.push(`${a.name}: dependsOn names no such area (${unknown.join(", ")}) — ignored`);
  a.dependsOn = a.dependsOn.filter((d) => areaNames.has(d));
}
const resolved = new Set<string>();
let progress = true;
while (progress) {
  progress = false;
  for (const a of areas) {
    if (resolved.has(a.name)) continue;
    if (a.dependsOn.every((d) => resolved.has(d))) {
      resolved.add(a.name);
      progress = true;
    }
  }
}
for (const a of areas) {
  if (resolved.has(a.name)) continue;
  problems.push(`${a.name}: dependsOn cycle (${a.dependsOn.join(", ")}) — running without waiting`);
  a.dependsOn = [];
}

const modelProfile = args.modelProfile === "flash" ? "flash" : "balanced";
const visionEnabled = args.vision !== false;
if (!visionEnabled && areas.some((a) => a.contention !== "terminal")) {
  problems.push("vision disabled by launch arg (vision: false) — non-terminal area(s) get no capture and no pixel/AX evidence; judges see code and gates only");
}
const doCommit = args.commit !== false;
const rawMaxRounds = typeof args.maxRounds === "number" ? args.maxRounds : 0;
const maxRounds = rawMaxRounds >= 1 ? Math.floor(rawMaxRounds) : Number.POSITIVE_INFINITY;
const maxLines = Math.max(1, Math.floor(typeof args.maxLines === "number" ? args.maxLines : 400));
const maxFiles = Math.max(1, Math.floor(typeof args.maxFiles === "number" ? args.maxFiles : 10));
const agentsMdPath = typeof args.agentsMd === "string" ? args.agentsMd : "AGENTS.md";
const baseSha = typeof args.baseSha === "string" ? args.baseSha.trim() : "";
let ROOT = typeof args.repoRoot === "string" ? args.repoRoot.trim() : "";
const rawTag = typeof args.runTag === "string" && args.runTag.trim() !== "" ? args.runTag.trim() : baseSha !== "" ? baseSha.slice(0, 8) : "run";
const RUN_TAG = rawTag.replace(/[^A-Za-z0-9._-]/g, "-");
/** The run-owned integration worktree and its branch; "" until created. */
let INT = "";
let INT_BRANCH = "";

// The board is the watcher's live view; cards move as areas settle.
artifact.board("status", {
  title: "Areas by status",
  key: "key",
  status: "status",
  columns: ["working", "passed", "failed"],
  cardTitle: "name",
  detail: [
    { field: "note", label: "Note" },
    { field: "round", label: "Round" },
  ],
});

const EVIDENCE_DIR = ".zflow/evidence";
const webNames = areas.filter((a) => a.contention === "web").map((a) => a.name).sort();
const portOf = new Map<string, number>(webNames.map((n, i) => [n, 4100 + i] as const));
const PRO_MODEL = model("account:zai-individual-coding-plan/GLM-5.3");
const FLASH_MODEL = model("account:zai-individual-coding-plan/GLM-5.3-Flash");
/** Judgment roles run pro in the balanced profile and flash in the all-flash profile; capture and audit are always flash. */
const JUDGE_MODEL = modelProfile === "flash" ? FLASH_MODEL : PRO_MODEL;

let agentsLoaded = false;
if (agentsMdPath !== "") {
  try {
    agentsLoaded = (await files.read(agentsMdPath)).trim().length > 0;
  } catch {
    agentsLoaded = false;
  }
}
function agentsLine(): string {
  if (agentsMdPath === "" || !agentsLoaded) return "";
  return `Read ${agentsMdPath} first — the repo's hard rules bind this task, and every skill it requires you must read and follow too.`;
}

// ---------------------------------------------------------------------------
// Anchored command helpers. world.run's cwd is not trustworthy; ROOT is.
// ---------------------------------------------------------------------------

let gitQueue: Promise<unknown> = Promise.resolve();
function serializedGit<T>(op: () => Promise<T>): Promise<T> {
  const p = gitQueue.then(op, op);
  gitQueue = p.then(() => undefined, () => undefined);
  return p;
}

async function gitRun(gitArgs: string[], wt?: string): Promise<{ ran: boolean; exitCode: number; output: string }> {
  try {
    const anchor = wt ?? (ROOT === "" ? undefined : ROOT);
    const full = anchor === undefined ? gitArgs : ["-C", anchor, ...gitArgs];
    const r = await world.run("git", full);
    const out = `${r.stdout}\n${r.stderr}`.trim();
    return { ran: true, exitCode: r.exitCode, output: out.length <= 900 ? out : out.slice(out.length - 900) };
  } catch (error) {
    return { ran: false, exitCode: -1, output: String(error) };
  }
}

/** Tool argv anchored to ROOT (shared checkout) or an area worktree; undefined = refuse. */
function anchoredArgv(tool: string, gateArgs: string[], wt?: string): string[] | undefined {
  const anchor = wt ?? ROOT;
  if (anchor === "") return gateArgs.length > 0 && gateArgs[0].startsWith("/") ? gateArgs : undefined;
  const first = gateArgs[0] ?? "";
  const absFirst = first !== "" && !first.startsWith("/") ? `${anchor}/${first}` : first;
  switch (tool) {
    case "git":
    case "make":
    case "go":
    case "pnpm":
      return ["-C", anchor, ...gateArgs];
    case "npm":
      return ["--prefix", anchor, ...gateArgs];
    case "yarn":
    case "bun":
      return ["--cwd", anchor, ...gateArgs];
    case "cargo": {
      // A gate may name its own manifest (workspace or subdir builds) — absolutize
      // it instead of appending a second root manifest, which cargo would win.
      const idx = gateArgs.indexOf("--manifest-path");
      if (idx >= 0 && idx + 1 < gateArgs.length) {
        const v = gateArgs[idx + 1];
        const abs = v !== "" && !v.startsWith("/") ? `${anchor}/${v}` : v;
        return [...gateArgs.slice(0, idx + 1), abs, ...gateArgs.slice(idx + 2)];
      }
      return [...gateArgs, "--manifest-path", `${anchor}/Cargo.toml`];
    }
    case "python3":
    case "pytest":
      return [absFirst, ...gateArgs.slice(1)];
    default:
      return undefined;
  }
}

async function runGate(tool: string, gateArgs: string[], wt?: string): Promise<GateOutcome> {
  const argv = [tool, ...gateArgs].join(" ");
  if (gateArgs.some((a) => a === "--fix" || a === "--write")) {
    return { tool, argv, ran: false, exitCode: -1, failure: "skipped: mutating gates are not allowed" };
  }
  const runArgs = anchoredArgv(tool, gateArgs, wt);
  if (runArgs === undefined) {
    return { tool, argv, ran: false, exitCode: -1, failure: `skipped: "${tool}" has no safe anchored form (or is not in the allowlist)` };
  }
  try {
    let r: { exitCode: number; stdout: string; stderr: string };
    if (tool === "npm") r = await world.run("npm", runArgs, { timeoutMs: 900_000 });
    else if (tool === "pnpm") r = await world.run("pnpm", runArgs, { timeoutMs: 900_000 });
    else if (tool === "yarn") r = await world.run("yarn", runArgs, { timeoutMs: 900_000 });
    else if (tool === "bun") r = await world.run("bun", runArgs, { timeoutMs: 900_000 });
    else if (tool === "cargo") r = await world.run("cargo", runArgs, { timeoutMs: 900_000 });
    else if (tool === "make") r = await world.run("make", runArgs, { timeoutMs: 900_000 });
    else if (tool === "go") r = await world.run("go", runArgs, { timeoutMs: 900_000 });
    else if (tool === "python3") r = await world.run("python3", runArgs, { timeoutMs: 900_000 });
    else if (tool === "pytest") r = await world.run("pytest", runArgs, { timeoutMs: 900_000 });
    else if (tool === "git") r = await world.run("git", runArgs, { timeoutMs: 900_000 });
    else {
      return { tool, argv, ran: false, exitCode: -1, failure: `skipped: "${tool}" is not in the gate allowlist` };
    }
    const failureText = r.exitCode === 0 ? "" : (r.stderr.length > 0 ? r.stderr : r.stdout).trim().slice(-600);
    return { tool, argv, ran: true, exitCode: r.exitCode, failure: failureText };
  } catch (error) {
    return { tool, argv, ran: false, exitCode: -1, failure: `did not run: ${String(error)}` };
  }
}

async function runAllGates(area: AreaSpec, wt?: string): Promise<GateOutcome[]> {
  const out: GateOutcome[] = [];
  for (const g of area.gates) {
    out.push(await runGate(g.tool, g.args, wt));
  }
  return out;
}

function gateNotes(gates: GateOutcome[]): string {
  return gates
    .map((g) => `- ${g.argv} → ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` — ${g.failure}`}`)
    .join("\n");
}

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

// ---------------------------------------------------------------------------
// Committer, commits, merges, lanes.
// ---------------------------------------------------------------------------

const committer = agent("Committer", {
  system:
    "You draft commit messages and nothing else: one conventional commit, subject under 72 characters, " +
    "short body only when it earns one. Never edit files, never run git. Return the message text only.",
  model: JUDGE_MODEL,
});
let logBlock = "(no git log available)";

function shortSha(output: string): string {
  const m = /\[[^\]\s]+\s+([0-9a-f]{7,40})\]/.exec(output);
  return m === null ? "" : m[1];
}

async function commitRound(it: Item, files: string[], summary: string): Promise<{ sha: string; note: string }> {
  const fixRound = it.rounds > 0 && it.carry.length > 0;
  const draft = await committer.ask<{ message: string }>(
    [
      `Draft one commit message for area "${it.area.name}", round ${it.rounds + 1}, of this task.`,
      `Task: ${task}`,
      `What was done: ${summary}`,
      `Files: ${files.join(", ")}`,
      fixRound ? "This is a fix round; start the subject with \"fix: \"." : "Match the repo's conventional style.",
      `Recent commits:\n${logBlock}`,
      agentsLine(),
      "Return the message only.",
    ]
      .filter((l) => l !== "")
      .join("\n"),
  );
  let message = typeof draft.message === "string" ? draft.message.trim() : "";
  if (message === "") message = `${it.area.name}: ${summary.slice(0, 60)}`;
  if (fixRound && !message.startsWith("fix:")) message = `fix: ${message}`;
  const add = await serializedGit(() => gitRun(["add", ...files], it.worktree));
  if (!(add.ran && add.exitCode === 0)) return { sha: "", note: `git add failed — ${add.output.slice(0, 220)}` };
  const commit = await serializedGit(() => gitRun(["commit", "-m", message, "--", ...files], it.worktree));
  const sha = commit.ran && commit.exitCode === 0 ? shortSha(commit.output) : "";
  return { sha, note: `commit ("${message}") → ${commit.ran ? `exit ${commit.exitCode}` : "did not run"}${sha === "" ? "" : `; sha ${sha}`}` };
}

const mergePromises = new Map<string, Promise<boolean>>();
const mergedAreas: string[] = [];
function mergeRun(it: Item): Promise<boolean> {
  const existing = mergePromises.get(it.area.name);
  if (existing !== undefined) return existing;
  const p = (async (): Promise<boolean> => {
    await Promise.all(
      it.area.dependsOn.map((d) => {
        const dep = mergePromises.get(d);
        return dep === undefined ? Promise.resolve(true) : dep;
      }),
    );
    const m = await serializedGit(() => gitRun(["merge", "--no-edit", it.branch ?? ""], INT));
    if (!(m.ran && m.exitCode === 0)) {
      const ab = await serializedGit(() => gitRun(["merge", "--abort"], INT));
      if (!(ab.ran && ab.exitCode === 0)) log(`${it.area.name}: merge --abort exited ${ab.exitCode} — ${ab.output.slice(0, 160)}`);
      return false;
    }
    mergedAreas.push(it.area.name);
    // The merged area worktree is spent: remove it, never with --force. The branch is
    // kept so the user can inspect it; refusals are logged and the worktree stays.
    if (it.worktree !== undefined && it.worktree !== INT) {
      const rm = await serializedGit(() => gitRun(["worktree", "remove", it.worktree!]));
      if (!(rm.ran && rm.exitCode === 0)) log(`${it.area.name}: merged worktree kept — ${rm.output.slice(0, 160)}`);
    }
    return true;
  })();
  mergePromises.set(it.area.name, p);
  return p;
}

let desktopLaneTail: Promise<unknown> = Promise.resolve();
function desktopLane<T>(op: () => Promise<T>): Promise<T> {
  const p = desktopLaneTail.then(op, op);
  desktopLaneTail = p.then(() => undefined, () => undefined);
  return p;
}

async function visionOne(it: Item): Promise<void> {
  const name = it.area.name;
  const round = it.rounds + 1;
  const doCapture = async (): Promise<void> => {
    const port = it.port ?? 4100;
    const url = `http://localhost:${port}`;
    const webAsk = [
      `Capture visual evidence for the web UI of area "${name}" (round ${round}).`,
      "Use the agent-browser CLI with an isolated session named " + `"zflow-${name}":`,
      `  Prefer the repo's own dev command and any dev-server URL named by the task. For static files only, use a Bun inline TypeScript server rooted at ${it.worktree} on loopback port ${port}, confined to that root. Disable project config/environment-file autoloading and wait until ${url} answers.`,
      `  agent-browser --session zflow-${name} open ${url}`,
      `  agent-browser --session zflow-${name} screenshot ${EVIDENCE_DIR}/${name}-r${round}-web-1.png`,
      `  agent-browser --session zflow-${name} close`,
      "  Then kill the dev server you started.",
      agentsLine(),
      `Create ${EVIDENCE_DIR} first if needed. Return the exact paths you wrote. Do not fix anything you see — you only capture evidence.`,
    ].join("\n");
    const desktopAsk = [
      `Capture desktop evidence for area "${name}" (round ${round}). Identify the app from the task text.`,
      `The application build (if any) lives in this area's worktree at ${it.worktree} — build and launch it from there when the task expects the built app on screen; shut it down when done.`,
      `If no real application window exists to capture, say so plainly and return no evidence — never invent a screenshot. You may try \`ocu snapshot "<app>"\` to check.`,
      agentsLine(),
      "Return what you did.",
    ].join("\n");
    const mobileAsk = [
      `Capture visual evidence for the mobile app of area "${name}" (round ${round}). Identify the platform (iOS simulator or Android emulator) from the task text.`,
      `The app project lives in this area's worktree at ${it.worktree} — build the app from there using the project's own build command (xcodebuild, gradle, or flutter build as the project dictates).`,
      "Device exclusivity: exactly ONE device at a time. If a simulator/emulator is already booted, reuse it; otherwise boot exactly one (`xcrun simctl boot <udid>` from `xcrun simctl list devices`, or `emulator -avd <name>`), and shut down only what you started when done.",
      "Install and launch the built app on that device, then capture the app's main states as screenshots (xcrun simctl io <udid> screenshot <path>, or adb exec-out screencap -p > <path>):",
      `  ${EVIDENCE_DIR}/${name}-r${round}-mobile-1.png (number further shots -mobile-2, -mobile-3, up to 3)`,
      `If no device, no toolchain, or no buildable app exists, say so plainly and return no evidence — never invent a screenshot.`,
      agentsLine(),
      `Create ${EVIDENCE_DIR} first if needed. Return the exact paths you wrote. Do not fix anything you see — you only capture evidence.`,
    ].join("\n");
    const captureAsk =
      it.area.contention === "web" ? webAsk : it.area.contention === "mobile" ? mobileAsk : desktopAsk;
    const capture = await agent(`capture-${name}-r${round}`, {
      system:
        "You drive evidence-capture CLIs (agent-browser, ocu, simctl, adb, emulator) exactly as instructed and write evidence files at the exact paths given. " +
        "You capture evidence; you never fix anything. If a tool is missing or fails, report that plainly — never claim a capture that did not land. " +
        "If your instructions are impossible, escalate and say so.",
      model: FLASH_MODEL,
    }).ask<{ lane: string; evidencePaths: string[]; notes: string }>(captureAsk);
    const landed = (await files.glob(`${EVIDENCE_DIR}/*`)).filter((p) => p.startsWith(`${EVIDENCE_DIR}/${name}-r${round}-`));
    const toAudit = landed.length > 0 ? landed : capture.evidencePaths;
    const audit = await agent(`vision-audit-${name}-r${round}`, {
      system:
        "You audit visual evidence against the task and report what it shows. Every finding names the evidence file that shows it. " +
        "You read PNG images natively with your Read tool; open each screenshot and judge the pixels. Never edit any file.",
      model: FLASH_MODEL,
    }).ask<{ verdict: string; findings: { where: string; what: string; evidence: string; severity: "low" | "medium" | "high" }[] }>(
      [
        `Audit the visual evidence for area "${name}" (round ${round}) against the task.`,
        `Task: ${task}`,
        toAudit.length > 0 ? `Evidence files: ${toAudit.join(", ")}` : "Evidence files: none were captured — say exactly that in your verdict.",
        `Capture notes: ${capture.notes}`,
        agentsLine(),
        "Report what the evidence shows is wrong or missing (where/what/evidence each) plus an overall verdict. Do not edit any file.",
      ].join("\n"),
    );
    it.evidence = Array.from(new Set([...it.evidence, ...toAudit]));
    it.visionOpen = audit.findings.map((f) => ({ ...f, status: "unconfirmed" as const, area: name, round }));
    for (const f of it.visionOpen) report(f);
    log(`${name}: vision r${round} — ${landed.length} file(s) on disk, ${it.visionOpen.length} unconfirmed finding(s)`);
  };
  // Device lane: one screen, one AX tree, one simulator/emulator — desktop and
  // mobile captures queue here; web captures run concurrently (one browser
  // session and port per area).
  if (it.area.contention === "desktop" || it.area.contention === "mobile") {
    await desktopLane(doCapture);
  } else {
    await doCapture();
  }
}

// ---------------------------------------------------------------------------
// The chain: channels, counted close, stages, POLICY, report.
// ---------------------------------------------------------------------------

async function runChain(): Promise<{ conclusion: string; findings: EF[]; verified: string[]; notCovered: string[] }> {
  phase("Seed the first stage");
  const impl = channel<Item>("implement");
  const vision = channel<Item>("vision");
  const judgeCh = channel<Item>("judge");
  const settled = new Map<string, Promise<boolean>>();
  const resolvers = new Map<string, (ok: boolean) => void>();
  const finalItems: Item[] = [];
  const blockedAreas: string[] = [];
  const notCovered: string[] = [...problems];
  if (agentsMdPath !== "" && !agentsLoaded) notCovered.push(`${agentsMdPath}: not found or empty — repo hard rules were not injected into asks`);
  const commitFailures: string[] = [];
  let open = 0;
  let closed = false;
  const closeAll = (): void => {
    if (closed) return;
    closed = true;
    impl.close();
    vision.close();
    judgeCh.close();
  };
  const endWork = (): void => {
    open -= 1;
    if (open <= 0) closeAll();
  };

  for (const area of areas) {
    let settle!: (ok: boolean) => void;
    const done = new Promise<boolean>((res) => {
      settle = res;
    });
    settled.set(area.name, done);
    resolvers.set(area.name, settle);
    open += 1; // every unit opens up front: a dependent's unit stays open while it waits
  }

  const planStage = future(async () => {
    phase("Plan each area, attack the plans, revise once");
    if (ROOT === "") {
      const top = await gitRun(["rev-parse", "--show-toplevel"]);
      if (top.ran && top.exitCode === 0) ROOT = top.output.split("\n")[0].trim();
    }
    log(`repo root: ${ROOT === "" ? "(unresolved — commands stay cwd-relative)" : ROOT}`);
    const recent = await gitRun(["log", "--oneline", "-10"]);
    if (recent.ran && recent.exitCode === 0 && recent.output.trim().length > 0) logBlock = recent.output.trim();
    const intPath = `${ROOT === "" ? "" : `${ROOT}/`}.zflow/worktrees/_integration-${RUN_TAG}`;
    const intBranch = `zflow/${RUN_TAG}/integration`;
    const addInt = await serializedGit(() => gitRun(["worktree", "add", "-b", intBranch, intPath, "HEAD"]));
    if (addInt.ran && addInt.exitCode === 0) {
      INT = intPath;
      INT_BRANCH = intBranch;
      log(`integration worktree ${intPath} on branch ${intBranch}; the user's checkout is not written`);
    } else {
      notCovered.push(`integration worktree ${intPath} could not be created — ${addInt.output.slice(0, 220)}. No area runs without it: remove the stale worktree/branch or pass a new runTag, then rerun.`);
    }
    await Promise.all(
      areas.map(async (area) => {
        const depOks = await Promise.all(
          area.dependsOn.map((d) => {
            const dep = settled.get(d);
            return dep === undefined ? Promise.resolve(true) : dep;
          }),
        );
        const failedDep = area.dependsOn.find((d, i) => depOks[i] !== true);
        if (failedDep !== undefined) {
          const res = resolvers.get(area.name);
          if (res !== undefined) res(false);
          blockedAreas.push(area.name);
          report({ key: area.name, name: area.name, status: "failed", note: `blocked: dependency "${failedDep}" did not finish with visible work`, round: 0 }, "status");
          endWork();
          return;
        }
        const planner = agent(`planner-${area.name}`, {
          system:
            "You plan one area of a larger task as an ordered build plan. Read the repo rules and the code in scope before planning. " +
            "Never edit files, never run git or checks. If planning is impossible, escalate and say so.",
          model: JUDGE_MODEL,
        });
        let plan = await planner.ask<string>(
          [
            `Plan area "${area.name}" (${area.contention}) of this task — one sentence: the approach the implementer will build.`,
            `Task (verbatim): ${task}`,
            `Scope paths: ${area.paths.join(", ")}`,
            area.skills.length > 0 ? `Read these skill files first: ${area.skills.join(", ")}` : "",
            area.dependsOn.length > 0 ? `These areas finished before this one: ${area.dependsOn.join(", ")}` : "",
            agentsLine(),
            "Reply with the one-sentence approach only.",
          ]
            .filter((l) => l !== "")
            .join("\n"),
        );
        const review = await agent(`plan-reviewer-${area.name}`, {
          system:
            "You attack a plan you did not write: what breaks it, what it misses, where its file list is wrong. " +
            "Read the files it names before judging. Never edit. verdict is \"revise\" only when a real problem exists.",
          model: JUDGE_MODEL,
        }).ask<{ verdict: "sound" | "revise"; problems: string[] }>(
          [
            `Attack this plan for area "${area.name}": "${plan}"`,
            `Task: ${task}`,
            `Scope paths: ${area.paths.join(", ")}`,
            agentsLine(),
            "Reply with verdict \"sound\" and no problems, or \"revise\" and exactly one problem sentence.",
          ]
            .filter((l) => l !== "")
            .join("\n"),
        );
        if (review.verdict === "revise" && review.problems.length > 0) {
          plan = await planner.ask<string>(`Revise the plan for "${area.name}" against: ${review.problems[0]} Reply with the revised one sentence only.`);
        }
        report({ area: area.name, approach: plan, planVerdict: review.verdict });
        impl.send({ area, rounds: 0, plan, port: portOf.get(area.name), gates: [], commitShas: [], changedFiles: [], skipped: [], evidence: [], visionOpen: [], carry: [], standing: [], lastOpen: Number.MAX_SAFE_INTEGER, nonShrinking: 0, settle: resolvers.get(area.name)! });
      }),
    );
  });

  const implStage = future(async () => {
    phase("Implement each area and run its checks");
    const tasks: Promise<void>[] = [];
    for await (const it of impl) {
      tasks.push(
        future(async () => {
          try {
            report({ key: it.area.name, name: it.area.name, status: "working", note: `implementation under way (${it.area.contention})`, round: it.rounds }, "status");
            if (INT === "") {
              notCovered.push(`${it.area.name}: not run — the integration worktree does not exist, and areas never write the user's checkout.`);
              finalItems.push(it);
              it.settle(false);
              endWork();
              return;
            }
            if (it.area.contention === "terminal" && it.worktree === undefined) {
              it.worktree = INT;
              log(`${it.area.name}: works in the integration worktree ${INT}`);
            }
            if (it.area.contention !== "terminal" && it.worktree === undefined) {
              const wt = `${ROOT === "" ? "" : `${ROOT}/`}.zflow/worktrees/${RUN_TAG}-${it.area.name}`;
              const branch = `zflow/${RUN_TAG}/${it.area.name}`;
              const addWt = await serializedGit(() => gitRun(["worktree", "add", "-b", branch, wt, "HEAD"], INT));
              if (addWt.ran && addWt.exitCode === 0) {
                it.worktree = wt;
                it.branch = branch;
                const base = await gitRun(["rev-parse", "HEAD"], wt);
                it.wtBase = base.ran && base.exitCode === 0 ? base.output.split("\n")[0].trim() : "";
                log(`${it.area.name}: worktree ${wt} on branch ${branch}`);
              } else {
                notCovered.push(`${it.area.name}: worktree creation failed — ${addWt.output.slice(0, 220)}. Delete stale branch/worktree ${branch} and clean untracked files in the area's paths, then rerun.`);
                finalItems.push(it);
                it.settle(false);
                endWork();
                return;
              }
            }
            const implementer = agent(`implementer-${it.area.name}-r${it.rounds}`, {
              system:
                "You implement one area with the smallest coherent change that completes it. " +
                "When your area runs in a git worktree, do all work there and never touch the main checkout. " +
                "The script runs the gates and the git commits after you hand off — do not run gates, do not run git. " +
                "If your instructions are impossible, escalate and say so plainly.",
              model: JUDGE_MODEL,
            });
            const work = await implementer.ask<AreaWork>(
              [
                `Implement the area "${it.area.name}" (${it.area.contention}) of this task.`,
                `Task (verbatim): ${task}`,
                it.plan !== undefined ? `Approved plan — follow it; deviate only where findings force it, and say so in your notes: ${it.plan}` : "",
                it.worktree !== undefined ? `Working tree: your git worktree at ${it.worktree} — do ALL work inside it, never the main checkout.` : "",
                it.port !== undefined ? `Dev port: this area's UI is served on the deterministic port ${it.port} — keep it reachable at http://localhost:${it.port}.` : "",
                it.area.paths.length > 0 ? `Scope paths: ${it.area.paths.join(", ")} — touch nothing outside them.` : "Scope: the whole workspace.",
                it.area.excludedPaths.length > 0 ? `Never touch: ${it.area.excludedPaths.join(", ")}` : "",
                it.area.skills.length > 0 ? `Read and follow these skill files first: ${it.area.skills.join(", ")}` : "",
                it.rounds > 0 && it.carry.length > 0 ? `This is a fix round. Fix exactly these confirmed findings, nothing more:\n${JSON.stringify(it.carry)}` : "",
                agentsLine(),
                "Make the smallest coherent change that completes the area. Do not run the gates — the script runs them after you. Do not run git — the script commits.",
                "Return: summary (1-2 sentences), changedFiles (exact repo-root-relative paths created or changed — include a pre-existing deliverable you verified correct), notes, skipped.",
              ]
                .filter((l) => l !== "")
                .join("\n"),
            );
            for (const p of work.changedFiles) {
              if (it.area.excludedPaths.includes(p)) continue;
              if (!it.changedFiles.includes(p)) it.changedFiles.push(p);
            }
            for (const s of work.skipped) {
              if (!it.skipped.includes(s)) it.skipped.push(s);
            }
            it.workSummary = work.summary;
            it.workNotes = work.notes;
            it.gates = await runAllGates(it.area, it.worktree);
            const red = it.gates.filter((g) => !(g.ran && g.exitCode === 0)).length;
            log(`${it.area.name}: round ${it.rounds + 1} — ${it.gates.length - red} of ${it.gates.length} gate(s) green`);
            if (doCommit && it.gates.length > 0 && red === 0 && work.changedFiles.length > 0) {
              try {
                const done = await commitRound(it, work.changedFiles, work.summary);
                if (done.sha !== "") it.commitShas.push(done.sha);
                else commitFailures.push(`${it.area.name}: ${done.note}`);
              } catch (error) {
                commitFailures.push(`${it.area.name}: commit error — ${String(error)}`);
              }
            }
            if (visionEnabled && it.area.contention !== "terminal") vision.send(it);
            else judgeCh.send(it);
          } catch (error) {
            finalItems.push(it);
            it.settle(false);
            report({ key: it.area.name, name: it.area.name, status: "failed", note: `implement errored: ${String(error)}`, round: it.rounds }, "status");
            endWork();
          }
        }),
      );
    }
    await Promise.all(tasks);
  });

  const visionStage = future(async () => {
    if (visionEnabled) phase("Capture and audit the visual evidence for each UI area");
    const tasks: Promise<void>[] = [];
    for await (const it of vision) {
      tasks.push(
        future(async () => {
          report({ key: it.area.name, name: it.area.name, status: "working", note: "capturing evidence", round: it.rounds }, "status");
          try {
            await visionOne(it);
          } catch (error) {
            notCovered.push(`${it.area.name}: capture or audit errored (round ${it.rounds + 1}) — ${String(error)}`);
          }
          judgeCh.send(it);
        }),
      );
    }
    await Promise.all(tasks);
  });

  const judgeStage = future(async () => {
    phase("Audit each area with a fresh judge and confirm what is real");
    const tasks: Promise<void>[] = [];
    for await (const it of judgeCh) {
      tasks.push(
        future(async () => {
          const name = it.area.name;
          const budget = it.area.budget ?? { maxLines, maxFiles };
          try {
            const judged = await agent(`judge-${name}-r${it.rounds}`, {
              system:
                "You are a fresh judge: you have never seen this work and owe its authors nothing. " +
                "Hunt for failures — wrong, missing, half-done, or misleading work. Report only findings you can show evidence for; " +
                "do not pad, do not approve, do not edit any file. You are image-blind: read text evidence (AX snapshots) as files. " +
                "If you cannot judge something, say so instead of guessing.",
              model: JUDGE_MODEL,
            }).ask<JudgeFindings>(
              [
                `Judge the current state of area "${name}" (round ${it.rounds + 1}). You have not seen this work before.`,
                `Task (verbatim): ${task}`,
                it.worktree !== undefined ? `The area's code lives in its own git worktree at ${it.worktree} — read the scoped paths there.` : "",
                it.area.paths.length > 0 ? `Paths in scope: ${it.area.paths.join(", ")}` : "",
                it.evidence.length > 0 ? `Evidence paths: ${it.evidence.join(", ")}` : "",
                agentsLine(),
                "Report each finding as where (path), what (one sentence), evidence (what shows it), severity. Empty findings when nothing real stands. Also give overallNote.",
              ]
                .filter((l) => l !== "")
                .join("\n"),
            );
            it.gates = await runAllGates(it.area, it.worktree);
            const notes = gateNotes(it.gates);
            const fromGates: EF[] = it.gates
              .filter((g) => g.ran && g.exitCode !== 0)
              .map((g) => ({
                where: it.area.paths[0] ?? name,
                what: `Area gate is still red: ${g.argv}`,
                evidence: `${g.argv} exited ${g.exitCode}${g.failure === "" ? "" : ` — ${g.failure}`}`,
                status: "verified" as const,
                severity: "high" as const,
                area: name,
                round: it.rounds,
              }));
            for (const f of fromGates) report(f);
            // Size evidence, measured by the script vs the area's base — never trusted to an agent.
            const sizeBase = it.wtBase !== undefined && it.wtBase !== "" ? it.wtBase : baseSha;
            if (sizeBase !== "") {
              const numstat = await gitRun(["diff", "--numstat", sizeBase, "--", ...it.area.paths], it.worktree);
              const size = parseNumstat(numstat.output);
              if (size.added + size.deleted > budget.maxLines || size.files > budget.maxFiles) {
                const f: EF = {
                  where: it.area.paths[0] ?? name,
                  what: `Area over size budget: ${size.files} file(s), +${size.added}/−${size.deleted} against ${budget.maxLines} lines / ${budget.maxFiles} files — split the area, never commit big`,
                  evidence: `script-run git diff --numstat vs ${sizeBase.slice(0, 10)}: ${size.files} file(s), +${size.added}/−${size.deleted}`,
                  status: "verified",
                  severity: "high",
                  area: name,
                  round: it.rounds,
                };
                report(f);
                fromGates.push(f);
              }
            }
            const confirmed = await Promise.all(
              judged.findings.map(async (f, i): Promise<EF> => {
                const check = await agent(`confirmer-${name}-r${it.rounds}-${i}`, {
                  system:
                    "You confirm or refute a single finding by reproducing it from its evidence alone; read the files it names. " +
                    "Never edit anything, never re-run checks the script already ran. reproduced is true only if you saw the problem yourself.",
                  model: JUDGE_MODEL,
                }).ask<Confirmation>(
                  [
                    "Reproduce this finding from its evidence alone; read the files it names. Do not edit anything.",
                    it.worktree !== undefined ? `The area's code lives in its worktree at ${it.worktree} — read the finding's paths there.` : "",
                    `Finding:\n${JSON.stringify(f)}`,
                    agentsLine(),
                    notes.length > 0 ? `The script already ran this area's gates — do not re-run them:\n${notes}` : "",
                    "reproduced is true only if you saw the problem yourself.",
                  ]
                    .filter((l) => l !== "")
                    .join("\n"),
                );
                const ef: EF = { ...f, status: check.reproduced ? (modelProfile === "flash" ? "judged" : "verified") : "unconfirmed", area: name, round: it.rounds };
                report(ef);
                return ef;
              }),
            );
            const open = [...fromGates, ...confirmed];
            it.standing = open;
            log(`${name}: judged r${it.rounds + 1} — ${open.length} open finding(s)`);
            if (open.length === 0) {
              finalItems.push(it);
              if (it.worktree !== undefined && it.branch !== undefined) {
                if (!doCommit) {
                  it.settledOk = false;
                  it.settle(false);
                  report({ key: name, name, status: "failed", note: `clean, but commit=false leaves its work uncommitted in worktree ${it.worktree} — dependents were blocked from building on it`, round: it.rounds }, "status");
                } else {
                  const merged = await mergeRun(it);
                  it.settledOk = merged;
                  it.settle(merged);
                  if (!merged) notCovered.push(`${name}: merge of ${it.branch} into ${INT_BRANCH} refused (conflict with work already integrated) and aborted; branch and worktree ${it.worktree} kept for review`);
                  report({ key: name, name, status: merged ? "passed" : "failed", note: merged ? `clean — branch ${it.branch} merged back` : `merge of ${it.branch} failed — left for manual merge`, round: it.rounds }, "status");
                }
              } else {
                it.settledOk = true;
                it.settle(true);
                report({ key: name, name, status: "passed", note: "clean — zero open findings, gates green", round: it.rounds }, "status");
              }
              endWork();
              return;
            }
            it.nonShrinking = open.length >= it.lastOpen ? it.nonShrinking + 1 : 0;
            it.lastOpen = open.length;
            if (maxRounds !== Number.POSITIVE_INFINITY && it.rounds + 1 >= maxRounds) {
              finalItems.push(it);
              it.settle(false);
              report({ key: name, name, status: "failed", note: `round cap ${maxRounds} reached with ${open.length} finding(s) standing — never claimed clean`, round: it.rounds }, "status");
              endWork();
              return;
            }
            if (it.nonShrinking >= 2) {
              finalItems.push(it);
              it.settle(false);
              report({ key: name, name, status: "failed", note: `stagnation: two rounds without shrinking findings — ${open.length} still stand, never claimed clean`, round: it.rounds }, "status");
              endWork();
              return;
            }
            it.carry = open;
            impl.send({ ...it, rounds: it.rounds + 1, visionOpen: [] });
          } catch (error) {
            finalItems.push(it);
            it.standing = [
              { where: it.area.paths[0] ?? name, what: "Judge step errored, so this area is unverified — never counted clean", evidence: String(error), status: "unconfirmed", severity: "high", area: name, round: it.rounds },
            ];
            report(it.standing[0]);
            it.settle(false);
            report({ key: name, name, status: "failed", note: `judge errored: ${String(error)}`, round: it.rounds }, "status");
            endWork();
          }
        }),
      );
    }
    await Promise.all(tasks);
  });

  await Promise.all([planStage, implStage, visionStage, judgeStage, ...Array.from(settled.values())]);
  phase("Collect the final state and publish the report");
  const head = await gitRun(["rev-parse", "HEAD"], INT === "" ? undefined : INT);
  const log2 = await gitRun(["log", "--oneline", "-12"], INT === "" ? undefined : INT);
  if (INT !== "") notCovered.push(`Your checkout is untouched. The result is on ${INT_BRANCH} (worktree ${INT}). The coordinator applies z-workflow Step 6 only after all areas and gates are clean, no findings remain, and commit=true; otherwise no automatic delivery.`);
  if (modelProfile === "flash") notCovered.push("Judges and confirmers ran on Flash (modelProfile=flash): their findings are labelled judged, and an area's clean means gates green with no Flash-judged findings, not a pro review.");
  const cleanCount = finalItems.filter((i) => i.settledOk === true).length;
  const standingAll = finalItems.flatMap((i) => i.standing);
  const deferredVision = finalItems.flatMap((i) => (i.settledOk === true ? i.visionOpen : []));
  const commits = finalItems.reduce((n, i) => n + i.commitShas.length, 0);
  await artifact.markdown(
    "report",
    [
      "# zflow chain report",
      "",
      `Task: ${task}`,
      `Areas: ${finalItems.length + blockedAreas.length} — ${cleanCount} clean, ${finalItems.length - cleanCount} stopped with findings or merge failures, ${blockedAreas.length} blocked. Commits: ${commits}. Head ${head.output.trim().slice(0, 7)}.`,
      "",
      "## Areas",
      ...finalItems.flatMap((i) => [
        `### ${i.area.name} — ${i.settledOk === true ? (modelProfile === "flash" ? "clean (flash-judged)" : "clean") : i.standing.length > 0 ? `${i.standing.length} standing` : "stopped"} (${i.area.contention}${i.worktree !== undefined ? ", worktree" : ""}${i.port !== undefined ? `, port ${i.port}` : ""})`,
        `- Rounds: ${i.rounds + 1}; commits: ${i.commitShas.join(", ") || "none"}`,
        `- Summary: ${i.workSummary ?? "none"}`,
        ...(i.workNotes !== undefined && i.workNotes.trim().length > 0 ? [`- Notes: ${i.workNotes.trim().slice(0, 300)}`] : []),
        ...i.gates.map((g) => `- Gate ${g.argv}: ${g.ran ? `exit ${g.exitCode}` : "did not run"}${g.failure === "" ? "" : ` — ${g.failure.slice(0, 200)}`}`),
        ...(i.changedFiles.length > 0 ? [`- Changed: ${i.changedFiles.join(", ")}`] : []),
        ...(i.evidence.length > 0 ? [`- Evidence: ${i.evidence.join(", ")}`] : []),
        ...(i.skipped.length > 0 ? i.skipped.map((s) => `- Left undone: ${s}`) : []),
        ...(i.standing.length > 0 ? i.standing.map((f) => `- Standing (${f.severity}, ${f.status}): ${f.what} — ${f.evidence.slice(0, 200)}`) : []),
      ]),
      ...(blockedAreas.length > 0 ? ["", "## Blocked", ...blockedAreas.map((b) => `- **${b}**: dependency did not finish with visible work`)] : []),
      ...(deferredVision.length > 0 ? ["", "## Unconfirmed vision findings (deferred to the user)", ...deferredVision.map((f) => `- **${f.where}** (${f.severity}): ${f.what} — ${f.evidence.slice(0, 200)}`)] : []),
      "",
      ...(INT !== "" ? ["## Integration", `- Branch ${INT_BRANCH}, worktree ${INT}`, `- Merged areas: ${mergedAreas.join(", ") || "none"}`, "- The engine did not write your checkout. The coordinator follows z-workflow Step 6; commit=false or any incomplete work/open finding prevents automatic delivery.", ""] : []),
      "## Recent git history",
      ...log2.output.split("\n").map((l) => `- ${l}`),
    ].join("\n"),
    { title: "zflow chain report", description: `Per-area terminal states, commits, merges, gates, and standing findings across ${finalItems.length + blockedAreas.length} areas.`, primary: true },
  );
  return {
    conclusion:
      standingAll.length === 0 && deferredVision.length === 0 && cleanCount === finalItems.length && blockedAreas.length === 0
        ? `Chain finished clean: ${cleanCount} of ${finalItems.length} area(s), ${commits} size-budgeted commit(s), ${deferredVision.length} unconfirmed vision finding(s) deferred to the user.`
        : `Chain finished: ${cleanCount} of ${finalItems.length} area(s) clean; ${standingAll.length} standing finding(s); ${deferredVision.length} unconfirmed vision finding(s); ${blockedAreas.length} blocked; ${commits} commit(s) — unfinished work is on disk and listed, never claimed clean.`,
    findings: [...standingAll, ...deferredVision],
    verified: [
      ...finalItems.flatMap((i) => i.gates.filter((g) => g.ran).map((g) => `${g.argv} → exit ${g.exitCode} (area ${i.area.name})`)),
      ...finalItems.flatMap((i) => (i.commitShas.length > 0 ? [`${i.area.name}: commits ${i.commitShas.join(", ")}`] : [])),
      ...mergedAreas.map((k) => `${k}: branch merged into ${INT_BRANCH}`),
    ],
    notCovered: Array.from(new Set([...notCovered, ...commitFailures])),
  };
}

return await runChain();
