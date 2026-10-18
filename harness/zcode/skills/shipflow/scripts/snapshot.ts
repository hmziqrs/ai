import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadCharter, type Charter } from "./lib/charter.ts";
import { naturalCompare, parsePrd, readProject, type PrdModel } from "./lib/prd.ts";

export interface DecideItem {
  issue: number;
  id: string;
  /** Machine block kind; a bug is dispatched ahead of tasks and outside the milestone window. */
  kind?: string;
  milestone: string;
  area: string[];
  prio: string;
  createdAt: string;
  criticalPath: number;
}

export interface DecideMilestone {
  name: string;
  total: number;
  done: number;
  hasTasks: boolean;
}

export interface DecideInput {
  mode: "dispatch" | "implement";
  activeRun: boolean;
  paused: boolean;
  kickoffStage: "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "done";
  prdApproval: "auto" | "window" | "human";
  prdAwaitingApproval: boolean;
  stopTheLine: number[];
  untriaged: number[];
  staleClaims: number[];
  review: number[];
  ready: DecideItem[];
  promotable: DecideItem[];
  blocked: number[];
  openTasks: number;
  milestones: DecideMilestone[];
  auditDue: boolean;
  projectDone: boolean;
  lanes: number;
  taskBreakdown: "rolling" | "upfront";
}

export interface Decision {
  action:
    | "busy"
    | "paused"
    | "kickoff"
    | "m0-only"
    | "wait-approval"
    | "needs-plan"
    | "fix-main"
    | "triage"
    | "advance"
    | "decompose"
    | "task-cycles"
    | "unblock"
    | "audit"
    | "finish"
    | "idle";
  issues: number[];
  release: number[];
  promote: number[];
  stage: string;
  milestone: string;
  reason: string;
}

// One row of the kit snapshot's tasks list (github-kit-spec section 4 with delta items 4 and 9).
export interface SnapshotTask {
  issue: number;
  id: string;
  kind: string;
  state: string;
  milestone: string;
  area: string[];
  prio: string;
  attempt: number;
  size: string;
  flags: string[];
  createdAt: string;
}

export interface KitSnapshot {
  ok: boolean;
  error: string;
  repo: string;
  now: number;
  paused: boolean;
  counts: Record<string, number>;
  tasks: SnapshotTask[];
  stopTheLine: number[];
  staleClaims: number[];
  promotable: number[];
  openPrs: { pr: number; head: string; isDraft: boolean }[];
  invalid: { issue: number; errors: string[] }[];
  /** New reports with no machine block and no kind label; absent in snapshots from older kits. */
  untriaged?: number[];
  kickoffStage: string;
  prdIssueOpen: boolean;
}

export interface DecideFlags {
  mode: "dispatch" | "implement";
  activeRun: boolean;
  auditDue: boolean;
}

const KICKOFF_STAGES: readonly string[] = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "done"];
const PRD_BRANCH = /^wf\/prd-v[0-9]+$/;
const DECOMPOSE_GATE = 0.7;

function decision(
  action: Decision["action"],
  reason: string,
  parts: { issues?: number[]; release?: number[]; promote?: number[]; stage?: string; milestone?: string } = {},
): Decision {
  return {
    action,
    issues: parts.issues ?? [],
    release: parts.release ?? [],
    promote: parts.promote ?? [],
    stage: parts.stage ?? "",
    milestone: parts.milestone ?? "",
    reason,
  };
}

const ascending = (xs: number[]): number[] => [...xs].sort((a, b) => a - b);

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function fraction(m: DecideMilestone): number {
  return m.total > 0 ? m.done / m.total : 0;
}

function fullyDone(m: DecideMilestone): boolean {
  return m.total > 0 && m.done >= m.total;
}

// Index of the lowest milestone that is not fully done; the last one when all are done.
function currentIndex(milestones: DecideMilestone[]): number {
  const i = milestones.findIndex((m) => !fullyDone(m));
  return i === -1 ? milestones.length - 1 : i;
}

// Rule 8 gate: a milestone at or above 70% (fully done counts) unlocks the next one when that
// one has no tasks yet. Every adjacent pair is checked, so a gate that finished between two runs
// still decomposes the milestone after it.
function decomposeTarget(milestones: DecideMilestone[]): string | null {
  for (let i = 0; i + 1 < milestones.length; i++) {
    if (!milestones[i + 1].hasTasks && fraction(milestones[i]) >= DECOMPOSE_GATE) {
      return milestones[i + 1].name;
    }
  }
  return null;
}

function candidatesOf(input: DecideInput): DecideItem[] {
  const ready = new Set(input.ready.map((c) => c.issue));
  return [...input.ready, ...input.promotable.filter((c) => !ready.has(c.issue))];
}

// Picked issues that come from the promotable list (they are promoted in the launched run).
function promotedIn(input: DecideInput, picked: DecideItem[]): number[] {
  const ready = new Set(input.ready.map((c) => c.issue));
  const promotable = new Set(input.promotable.map((c) => c.issue));
  return picked.filter((c) => promotable.has(c.issue) && !ready.has(c.issue)).map((c) => c.issue);
}

export function decide(input: DecideInput): Decision {
  if (input.activeRun) return decision("busy", "a run is active");
  if (input.paused) {
    return decision("paused", "PRD issue is paused");
  }
  if (input.prdAwaitingApproval && input.prdApproval === "human") {
    return decision("wait-approval", "PRD PR waits for human approval");
  }
  if (input.kickoffStage !== "done") {
    if (input.mode === "implement") {
      return decision("needs-plan", "finish planning and publication before implementation", { stage: input.kickoffStage });
    }
    return decision("kickoff", "kickoff stage still to run", { stage: input.kickoffStage });
  }
  if (input.prdAwaitingApproval && input.prdApproval === "window") {
    const m0 = candidatesOf(input).filter((c) => c.milestone === "M0");
    const picked = pickNonOverlapping(m0, input.lanes);
    return decision("m0-only", "PRD review window: only M0 runs", {
      issues: picked.map((c) => c.issue),
      promote: promotedIn(input, picked),
      milestone: "M0",
    });
  }
  if (input.stopTheLine.length > 0) {
    return decision("fix-main", "stop-the-line issues are open", { issues: ascending(input.stopTheLine) });
  }
  const release = ascending(input.staleClaims);
  // New reports, bugs above all, enter the queue before more work is claimed.
  if (input.untriaged.length > 0) {
    return decision("triage", "new issues need triage", { issues: ascending(input.untriaged), release });
  }
  if (input.review.length > 0) {
    return decision("advance", "PRs in review need advancing", { issues: ascending(input.review), release });
  }
  if (input.mode === "dispatch" && input.taskBreakdown === "rolling") {
    const next = decomposeTarget(input.milestones);
    if (next !== null) return decision("decompose", "next milestone needs its tasks", { release, milestone: next });
  }
  const curIdx = currentIndex(input.milestones);
  const scoped = candidatesOf(input).filter((c) => {
    if (c.kind === "bug") return true;
    const rank = input.milestones.findIndex((m) => m.name === c.milestone);
    return rank >= 0 && rank <= curIdx;
  });
  const picked = pickNonOverlapping(scoped, input.lanes);
  if (picked.length > 0) {
    return decision("task-cycles", "ready tasks in the current milestone", {
      issues: picked.map((c) => c.issue),
      release,
      promote: promotedIn(input, picked),
    });
  }
  if (input.openTasks > 0 && input.blocked.length > 0) {
    if (input.mode === "implement") {
      return decision("needs-plan", "blocked tasks need a planning decision", { issues: ascending(input.blocked) });
    }
    return decision("unblock", "open tasks are blocked and none is ready", {
      issues: ascending(input.blocked),
      release,
    });
  }
  if (input.auditDue) return decision("audit", "periodic audit is due", { release });
  const missingPlan = input.milestones.find((m) => !m.hasTasks);
  if (input.mode === "implement" && missingPlan !== undefined) {
    return decision("needs-plan", "remaining milestones have no published task plan", { milestone: missingPlan.name });
  }
  if (input.projectDone) return decision("finish", "every task is done", { release });
  if (release.length > 0) {
    return decision("task-cycles", "housekeeping: release stale claims", { release });
  }
  return decision("idle", "nothing to dispatch", { release });
}

export function pickNonOverlapping(candidates: DecideItem[], k: number): DecideItem[] {
  const picked: DecideItem[] = [];
  for (const c of [...candidates].sort(byDispatchOrder)) {
    if (picked.length >= k) break;
    if (picked.some((p) => areasOverlap(p.area, c.area))) continue;
    picked.push(c);
  }
  return picked;
}

const isBug = (c: DecideItem): number => (c.kind === "bug" ? 0 : 1);

function byDispatchOrder(a: DecideItem, b: DecideItem): number {
  return (
    isBug(a) - isBug(b) ||
    naturalCompare(a.milestone, b.milestone) ||
    b.criticalPath - a.criticalPath ||
    prioRank(a.prio) - prioRank(b.prio) ||
    compareText(a.createdAt, b.createdAt) ||
    a.issue - b.issue
  );
}

// p0 first, p3 and below after it, an empty priority last.
function prioRank(prio: string): number {
  if (prio === "") return 9;
  const match = /^p([0-9])$/.exec(prio);
  return match ? Number(match[1]) : 8;
}

function areasOverlap(xs: string[], ys: string[]): boolean {
  return xs.some((x) => ys.some((y) => pathsOverlap(x, y)));
}

function pathsOverlap(x: string, y: string): boolean {
  const a = x.replace(/\/+$/, "");
  const b = y.replace(/\/+$/, "");
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

// Longest chain of not-done dependents, counting the task itself. A task with no open dependent
// has 1; a task whose dependent chain holds two open tasks has 3. Done tasks break the chain.
export function criticalPaths(model: PrdModel, doneIds: Set<string>): Map<string, number> {
  const active = model.tasks.filter((t) => t.status === "active");
  const known = new Set(active.map((t) => t.id));
  const dependents = new Map<string, string[]>();
  for (const t of active) {
    for (const dep of t.dependsOn) {
      if (!known.has(dep)) continue;
      dependents.set(dep, [...(dependents.get(dep) ?? []), t.id]);
    }
  }
  const memo = new Map<string, number>();
  const onPath = new Set<string>();
  const length = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    // Dependency cycles are a lint error (dep-cycle); never recurse forever on one.
    if (onPath.has(id)) return 1;
    onPath.add(id);
    let longest = 0;
    for (const next of dependents.get(id) ?? []) {
      if (!doneIds.has(next)) longest = Math.max(longest, length(next));
    }
    onPath.delete(id);
    memo.set(id, longest + 1);
    return longest + 1;
  };
  return new Map(active.map((t) => [t.id, length(t.id)]));
}

const stateName = (task: SnapshotTask): string => task.state.replace(/^state:/, "");
const prioName = (task: SnapshotTask): string => task.prio.replace(/^prio:/, "");

// Pure: turns the kit snapshot, the charter and the PRD model into the decide input.
export function buildDecideInput(
  snap: KitSnapshot,
  charter: Charter,
  model: PrdModel,
  flags: DecideFlags,
): DecideInput {
  if (!KICKOFF_STAGES.includes(snap.kickoffStage)) {
    throw new Error("snapshot kickoff stage is not a known stage");
  }
  const kickoffStage = snap.kickoffStage as DecideInput["kickoffStage"];
  const open = snap.tasks.filter((t) => stateName(t) !== "done");
  const openIds = new Set(open.map((t) => t.id));
  const activeTasks = model.tasks.filter((t) => t.status === "active");
  // The snapshot lists open issues only, so a PRD task without an open issue counts as done.
  const doneIds = new Set(activeTasks.map((t) => t.id).filter((id) => !openIds.has(id)));
  const paths = criticalPaths(model, doneIds);
  const byIssue = new Map(snap.tasks.map((t) => [t.issue, t]));
  const withState = (name: string): SnapshotTask[] => snap.tasks.filter((t) => stateName(t) === name);
  const item = (t: SnapshotTask): DecideItem => ({
    issue: t.issue,
    id: t.id,
    kind: t.kind,
    milestone: t.milestone,
    area: [...t.area],
    prio: prioName(t),
    createdAt: t.createdAt,
    criticalPath: paths.get(t.id) ?? 1,
  });
  const milestones: DecideMilestone[] = charter.milestones.map((name) => {
    const tasks = activeTasks.filter((t) => t.milestone === name);
    const ids = new Set(tasks.map((t) => t.id));
    const unfinished = open.filter((t) => ids.has(t.id)).length;
    return {
      name,
      total: tasks.length,
      done: Math.max(0, tasks.length - unfinished),
      hasTasks: tasks.length > 0,
    };
  });
  const promotable = snap.promotable.flatMap((n) => {
    const t = byIssue.get(n);
    return t ? [item(t)] : [];
  });
  return {
    mode: flags.mode,
    activeRun: flags.activeRun,
    paused: snap.paused,
    kickoffStage,
    prdApproval: charter.prd_approval,
    prdAwaitingApproval: snap.openPrs.some((p) => PRD_BRANCH.test(p.head)),
    stopTheLine: [...snap.stopTheLine],
    untriaged: [...(snap.untriaged ?? [])],
    staleClaims: [...snap.staleClaims],
    review: withState("review").map((t) => t.issue),
    ready: withState("ready").map((t) => item(t)),
    promotable,
    blocked: withState("blocked").map((t) => t.issue),
    openTasks: open.length,
    milestones,
    auditDue: flags.auditDue,
    projectDone: open.length === 0 && (snap.untriaged ?? []).length === 0 && kickoffStage === "done",
    lanes: charter.limits.max_parallel_lanes,
    taskBreakdown: charter.task_breakdown,
  };
}

const USAGE = [
  "usage: bun snapshot.ts --repo <root> --charter <autopilot.yaml> [--json-in <snapshot.json>]",
  "         [--gh-repo OWNER/NAME --login <builder> --prd-issue <n>] [--active-run <id>]",
  "         [--mode implement|dispatch] [--audit-due]",
].join("\n");

const VALUE_FLAGS = new Set([
  "--repo",
  "--charter",
  "--json-in",
  "--gh-repo",
  "--login",
  "--prd-issue",
  "--active-run",
  "--mode",
]);
const SWITCH_FLAGS = new Set(["--audit-due"]);

class UsageError extends Error {}

export interface Args {
  mode: "dispatch" | "implement";
  repo: string;
  charter: string;
  jsonIn: string | null;
  ghRepo: string | null;
  login: string | null;
  prdIssue: number | null;
  activeRun: boolean;
  auditDue: boolean;
}

export function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (SWITCH_FLAGS.has(flag)) {
      switches.add(flag);
    } else if (VALUE_FLAGS.has(flag)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new UsageError(`${flag} needs a value`);
      values.set(flag, value);
      i++;
    } else {
      throw new UsageError(`unknown argument ${flag}`);
    }
  }
  const repo = values.get("--repo");
  const charter = values.get("--charter");
  if (repo === undefined || charter === undefined) throw new UsageError("--repo and --charter are required");
  const mode = values.get("--mode") ?? "implement";
  if (mode !== "implement" && mode !== "dispatch") {
    throw new UsageError("--mode must be implement or dispatch");
  }
  const prd = values.get("--prd-issue");
  if (prd !== undefined && !/^[1-9][0-9]*$/.test(prd)) throw new UsageError("--prd-issue must be a positive integer");
  return {
    mode,
    repo: resolve(repo),
    charter: resolve(charter),
    jsonIn: values.get("--json-in") ?? null,
    ghRepo: values.get("--gh-repo") ?? null,
    login: values.get("--login") ?? null,
    prdIssue: prd === undefined ? null : Number(prd),
    activeRun: values.has("--active-run"),
    auditDue: switches.has("--audit-due"),
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// Null when the value is a usable kit snapshot; otherwise the reason (a kit error text is passed on).
function snapshotProblem(value: unknown): string | null {
  if (!isRecord(value) || typeof value.ok !== "boolean") return "snapshot is not a kit snapshot";
  if (!value.ok) return typeof value.error === "string" && value.error !== "" ? value.error : "kit snapshot failed";
  const lists = ["stopTheLine", "staleClaims", "promotable", "tasks", "openPrs", "invalid"];
  const complete =
    lists.every((key) => Array.isArray(value[key])) &&
    isRecord(value.counts) &&
    typeof value.repo === "string" &&
    typeof value.paused === "boolean" &&
    typeof value.kickoffStage === "string" &&
    typeof value.prdIssueOpen === "boolean";
  return complete ? null : "snapshot is missing kit fields";
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`cannot read ${path} as JSON`);
  }
}

interface KitModuleLike {
  loadKit: () => {
    makeGithubKit: (cfg: Record<string, unknown>) => {
      snapshot: (opts: { withPromotable: boolean }) => Promise<unknown>;
    };
  };
}

// Live path: the kit with dryRun true, so the snapshot can never mutate GitHub.
async function liveSnapshot(args: Args, charter: Charter, ghRepo: string, login: string, prdIssue: number): Promise<unknown> {
  const kitModule = (await import("./lib/kit.ts")) as KitModuleLike;
  const kit = kitModule.loadKit().makeGithubKit({
    repo: ghRepo,
    login,
    instance: charter.dispatcher.instance,
    prdIssue,
    dryRun: true,
    claimTtlSeconds: charter.limits.task_timeout_minutes * 2 * 60,
    attemptCap: charter.limits.task_attempts,
    requiredChecks: charter.authority.merge.requires,
    writeRoot: resolve(args.repo, ".shipflow"),
    pollSeconds: 1,
    maxPolls: 1,
    assignee: "",
  });
  return kit.snapshot({ withPromotable: true });
}

// Output carries ids, counts, labels and the decision only; every field is mapped explicitly, so
// no other snapshot field (a title or body) can leak through.
function summarize(snap: KitSnapshot, input: DecideInput) {
  return {
    repo: snap.repo,
    counts: Object.fromEntries(Object.entries(snap.counts).sort(([a], [b]) => compareText(a, b))),
    paused: input.paused,
    mode: input.mode,
    kickoffStage: input.kickoffStage,
    prdIssueOpen: snap.prdIssueOpen,
    prdAwaitingApproval: input.prdAwaitingApproval,
    openTasks: input.openTasks,
    stopTheLine: ascending(input.stopTheLine),
    untriaged: ascending(input.untriaged),
    staleClaims: ascending(input.staleClaims),
    promotable: ascending(snap.promotable),
    invalid: snap.invalid.map((i) => i.issue),
    milestones: input.milestones.map(({ name, total, done, hasTasks }) => ({ name, total, done, hasTasks })),
    tasks: snap.tasks.map((t) => ({
      issue: t.issue,
      id: t.id,
      kind: t.kind,
      state: stateName(t),
      milestone: t.milestone,
      prio: prioName(t),
      attempt: t.attempt,
      size: t.size,
      flags: [...t.flags],
    })),
  };
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`ERROR usage ${errorText(err)}\n${USAGE}\n`);
    return 2;
  }
  if (args.jsonIn === null && (args.ghRepo === null || args.login === null || args.prdIssue === null)) {
    process.stderr.write(`ERROR usage live mode needs --gh-repo, --login and --prd-issue, or --json-in\n${USAGE}\n`);
    return 2;
  }
  const loaded = loadCharter(args.charter);
  if (loaded.charter === null) {
    for (const line of loaded.errors) process.stderr.write(`ERROR charter ${line}\n`);
    return 2;
  }
  const charter = loaded.charter;
  let raw: unknown;
  try {
    raw =
      args.jsonIn !== null
        ? readJson(args.jsonIn)
        : await liveSnapshot(args, charter, args.ghRepo ?? "", args.login ?? "", args.prdIssue ?? 0);
  } catch (err) {
    process.stderr.write(`ERROR snapshot ${errorText(err)}\n`);
    return 2;
  }
  const problem = snapshotProblem(raw);
  if (problem !== null) {
    process.stderr.write(`ERROR snapshot ${problem}\n`);
    return 2;
  }
  const snap = raw as KitSnapshot;
  let input: DecideInput;
  try {
    const model = parsePrd(readProject(args.repo));
    input = buildDecideInput(snap, charter, model, {
      mode: args.mode,
      activeRun: args.activeRun,
      auditDue: args.auditDue,
    });
  } catch (err) {
    process.stderr.write(`ERROR snapshot ${errorText(err)}\n`);
    return 2;
  }
  process.stdout.write(`${JSON.stringify({ snapshot: summarize(snap, input), decision: decide(input) })}\n`);
  return 0;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
