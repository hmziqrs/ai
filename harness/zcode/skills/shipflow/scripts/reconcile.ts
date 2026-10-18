// PRD -> GitHub reconciler (design 6.5). planReconcile is pure: it maps the PRD index and the
// existing issue list to an ordered op list. applyReconcile runs that list through the GitHub kit.
// The CLI plans, prints one OP line per op, and applies the plan unless --dry-run is given.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadCharter, type Charter } from "./lib/charter.ts";
import { loadKit, type KitModule } from "./lib/kit.ts";
import {
  buildIndex,
  lintPrd,
  naturalCompare,
  parsePrd,
  readProject,
  type LintIssue,
  type PrdIndex,
  type PrdIndexItem,
  type PrdModel,
} from "./lib/prd.ts";

export interface ExistingIssue {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: string[];
  block: { id: string; prd_hash: string } | null;
  parent: number;
  blockedBy: number[];
}

export interface ReconcileOp {
  op:
    | "ensure-labels"
    | "ensure-milestones"
    | "create"
    | "update-body"
    | "close-not-planned"
    | "link-parent"
    | "add-blocked-by"
    | "remove-blocked-by"
    | "kickoff-done";
  id: string;
  detail: string;
}

export interface PlanOptions {
  prdIssue: number;
  labelsOnly?: boolean;
  includeTasks?: boolean;
  milestones?: string[];
}

export interface ApplyOptions {
  prdIssue: number; // the number the passed kit was built with
  model: PrdModel;
  existing: ExistingIssue[];
  paceMs: number;
  // The kit fixes its PRD issue at construction and refuses the kickoff stage for 0. The hand-off
  // uses a kit built with the number this run resolved (a PRD created here, or a found one).
  kitFor?: (prdIssue: number) => KitInstance;
}

export interface ApplyResult {
  op: string;
  id: string;
  outcome: "done" | "failed" | "skipped" | "dry-run";
  detail: string;
}

// The methods of the kit instance (makeGithubKit's return value) that this file calls.
export interface KitInstance {
  findings: { where: string; what: string; evidence: string }[];
  ensureLabels(extra: string[]): Promise<{ created: string[]; failed: string[] }>;
  ensureMilestones(names: string[]): Promise<{ created: string[]; failed: string[] }>;
  createIssue(opts: {
    title: string;
    body: string;
    labels: string[];
    milestone: string;
    parent: number;
    blockedBy: number[];
  }): Promise<{ outcome: string; number: number }>;
  updateBody(n: number, body: string): Promise<{ outcome: string }>;
  closeNotPlanned(n: number): Promise<{ outcome: string }>;
  addSubIssue(parent: number, child: number): Promise<{ outcome: string }>;
  addBlockedBy(n: number, blocker: number): Promise<{ outcome: string }>;
  removeBlockedBy(n: number, blocker: number): Promise<{ outcome: string }>;
  listIssues(state: "open" | "all"): Promise<{
    ok: boolean;
    issues: { number: number; title: string; state: string; labels: string[]; body: string }[];
  }>;
  listSubIssues(parent: number): Promise<{ ok: boolean; items: { number: number }[] }>;
  listBlockedBy(n: number): Promise<{ ok: boolean; items: { number: number }[] }>;
  setKickoffStage(stage: string): Promise<{ outcome: string }>;
  repoInfo(): Promise<{ ok: boolean; ownerLogin: string }>;
  projectEnsure(owner: string, title: string): Promise<{ outcome: string; number: number; id: string; url: string }>;
  projectAdd(owner: string, number: number, issues: number[]): Promise<{ added: number[]; present: number[]; failed: number[] }>;
  projectVerify(owner: string, number: number, issues: number[]): Promise<{ ok: boolean; missing: number[] }>;
  projectSyncStatus(
    owner: string,
    number: number,
    projectId: string,
    states: { issue: number; state: string }[],
  ): Promise<{ updated: number[]; unchanged: number[]; skipped: string }>;
}

interface MachineBlock {
  id: string;
  kind: string;
  parent: string;
  prd: string;
  prd_hash: string;
  area: string[];
  depends_on: string[];
  satisfies: string[];
  tests: string[];
  size: string;
  milestone: string;
  budget: { files: number; lines: number } | null;
}

interface ParsedBlock {
  id: string;
  kind: string;
  prd_hash: string;
}

type Outcome = ApplyResult["outcome"];

const CONTAINER_KINDS: ReadonlySet<string> = new Set(["prd", "epic", "feature"]);
const TASK_ID = /^[A-Z]{2,4}-[0-9]+\.[0-9]+$/;
const SECTION_OF = /^([A-Z]{2,4})-/;
const RATE_LIMIT = /secondary rate limit/i;
const RATE_LIMIT_WAIT_MS = 60_000;
const TITLE_TAG: Record<string, string> = { epic: "Epic", feature: "Feature", task: "Task" };
const SUMMARY_ORDER = [
  "create",
  "update-body",
  "close-not-planned",
  "link-parent",
  "add-blocked-by",
  "remove-blocked-by",
  "ensure-labels",
  "ensure-milestones",
  "kickoff-done",
];

let kitHelpers: KitModule | undefined;

// Block parsing and rendering come from the kit module. Loading it never calls the world, so one
// lazily loaded copy serves every pure call in this file.
function helpers(): KitModule {
  kitHelpers ??= loadKit();
  return kitHelpers;
}

function existingById(existing: ExistingIssue[]): Map<string, ExistingIssue> {
  const byId = new Map<string, ExistingIssue>();
  for (const issue of [...existing].sort((a, b) => a.number - b.number)) {
    if (issue.block && !byId.has(issue.block.id)) byId.set(issue.block.id, issue);
  }
  return byId;
}

function sortedByBlockId(existing: ExistingIssue[]): ExistingIssue[] {
  return existing
    .filter((issue) => issue.block !== null)
    .sort((a, b) => naturalCompare(a.block?.id ?? "", b.block?.id ?? "") || a.number - b.number);
}

function sectionCode(taskId: string): string {
  return SECTION_OF.exec(taskId)?.[1] ?? "";
}

function areaLabels(items: PrdIndexItem[]): string[] {
  const labels = new Set<string>();
  for (const item of items) {
    if (item.kind === "task" && item.status === "active") {
      labels.add(`area:${sectionCode(item.id).toLowerCase()}`);
    }
  }
  return [...labels].sort(naturalCompare);
}

function createLabels(item: PrdIndexItem): string[] {
  if (item.kind !== "task") return [`kind:${item.kind}`];
  return [
    "kind:task",
    "state:backlog",
    `size:${item.size ?? ""}`,
    "prio:p2",
    `area:${sectionCode(item.id).toLowerCase()}`,
  ];
}

function issueTitle(item: PrdIndexItem): string {
  return `[${TITLE_TAG[item.kind]}] ${item.id} ${item.title}`;
}

function blockFor(item: PrdIndexItem): MachineBlock {
  return {
    id: item.id,
    kind: item.kind,
    parent: item.parent,
    prd: `${item.file}#${item.anchor}`,
    prd_hash: item.hash,
    area: item.area ?? [],
    depends_on: item.dependsOn,
    satisfies: item.satisfies ?? [],
    tests: item.tests ?? [],
    size: item.size ?? "",
    milestone: item.milestone,
    budget: item.kind === "task" ? { files: 10, lines: item.size === "M" ? 300 : 150 } : null,
  };
}

// A PRD line that would open a second machine block is indented, so the kit parser keeps one block.
function safeLine(line: string): string {
  return line.trimEnd() === "```autopilot" ? ` ${line}` : line;
}

function withBlock(block: MachineBlock, human: string[]): string {
  const head = String(helpers().kitRenderMachineBlock(block)).replace(/\n+$/, "");
  return `${head}\n\n${human.map(safeLine).join("\n")}\n`;
}

function renderItemBody(item: PrdIndexItem, index: PrdIndex, model: PrdModel): string {
  const lines: string[] = [];
  if (item.kind === "feature") {
    const story = model.features.find((feature) => feature.id === item.id)?.story ?? "";
    lines.push(`Story: ${story}`, "", "Acceptance criteria:");
    const acs = model.acs
      .filter((ac) => ac.feature === item.id)
      .sort((a, b) => naturalCompare(a.id, b.id));
    for (const ac of acs) lines.push(`- ${ac.id}: ${ac.text} (check: ${ac.check})`);
  } else if (item.kind === "task") {
    lines.push(`Goal: ${item.title}`);
  } else {
    lines.push("Features:");
    for (const feature of index.items) {
      if (feature.parent === item.id && feature.kind === "feature" && feature.status === "active") {
        lines.push(`- ${feature.id} ${feature.title} (${feature.milestone})`);
      }
    }
  }
  lines.push("", `PRD: ${item.file}#${item.anchor}`);
  return withBlock(blockFor(item), lines);
}

function renderRootBody(root: NonNullable<PrdIndex["root"]>, index: PrdIndex): string {
  const block: MachineBlock = {
    id: "PRD",
    kind: "prd",
    parent: "",
    prd: "prd/prd.md",
    prd_hash: root.hash,
    area: [],
    depends_on: [],
    satisfies: [],
    tests: [],
    size: "",
    milestone: "",
    budget: null,
  };
  const lines = [`# ${root.title}`, "", "Sections:"];
  for (const section of index.items) {
    if (section.kind === "epic") lines.push(`- ${section.id} ${section.title} (${section.milestone})`);
  }
  lines.push("", "PRD: prd/prd.md");
  return withBlock(block, lines);
}

interface Blocker {
  id: string;
  number: number; // 0 when the blocker has no issue yet (it is created in this run)
}

// The task's dependsOn ids that have an issue now or will have one after this run.
function desiredBlockers(
  task: PrdIndexItem,
  itemById: Map<string, PrdIndexItem>,
  current: Map<string, ExistingIssue>,
): Blocker[] {
  const out: Blocker[] = [];
  for (const id of [...task.dependsOn].sort(naturalCompare)) {
    const blocker = itemById.get(id);
    const found = current.get(id);
    if (!found && (!blocker || blocker.status !== "active")) continue;
    out.push({ id, number: found?.number ?? 0 });
  }
  return out;
}

function rootOps(rootHash: string, current: Map<string, ExistingIssue>, prdIssue: number): ReconcileOp[] {
  const found = current.get("PRD");
  if (!found) return prdIssue === 0 ? [{ op: "create", id: "PRD", detail: "kind:prd" }] : [];
  const was = found.block?.prd_hash ?? "";
  if (was === rootHash) return [];
  return [{ op: "update-body", id: "PRD", detail: `prd_hash ${was || "none"} -> ${rootHash}` }];
}

// Plan order: ensure-labels, ensure-milestones; then per item depth-first (PRD root, sections,
// features, tasks) create or update-body; then link-parent; then blocked-by changes; then
// close-not-planned; kickoff-done (the PRD hand-off) is always last. Details carry the ids apply
// needs (a blocker id, or "#n" for a number).
export function planReconcile(index: PrdIndex, existing: ExistingIssue[], opts: PlanOptions): ReconcileOp[] {
  const includeTasks = opts.includeTasks ?? true;
  const milestones = opts.milestones ?? index.root?.milestones ?? [];
  const items = index.items.filter((item) => includeTasks || item.kind !== "task");
  const itemById = new Map(index.items.map((item) => [item.id, item] as const));
  const current = existingById(existing);
  const areas = opts.labelsOnly ? [] : areaLabels(items);
  const ops: ReconcileOp[] = [
    { op: "ensure-labels", id: "labels", detail: areas.join(" ") || "none" },
    { op: "ensure-milestones", id: "milestones", detail: milestones.join(" ") || "none" },
  ];
  if (opts.labelsOnly) return ops;

  if (index.root) ops.push(...rootOps(index.root.hash, current, opts.prdIssue));
  for (const item of items) {
    if (item.status !== "active") continue;
    const found = current.get(item.id);
    if (!found) {
      ops.push({ op: "create", id: item.id, detail: createLabels(item).join(" ") });
      continue;
    }
    const was = found.block?.prd_hash ?? "";
    if (was !== item.hash) {
      ops.push({ op: "update-body", id: item.id, detail: `prd_hash ${was || "none"} -> ${item.hash}` });
    }
  }

  for (const item of items) {
    if (item.status !== "active" || item.kind === "epic") continue;
    const child = current.get(item.id);
    const parent = current.get(item.parent);
    if (!child || !parent || child.parent !== parent.number) {
      ops.push({ op: "link-parent", id: item.id, detail: item.parent });
    }
  }

  for (const task of index.items) {
    if (task.kind !== "task" || task.status !== "active" || !includeTasks) continue;
    const found = current.get(task.id);
    const have = found ? found.blockedBy : [];
    const want = desiredBlockers(task, itemById, current);
    const wanted = new Set(want.map((blocker) => blocker.number).filter((n) => n > 0));
    for (const blocker of want) {
      if (blocker.number === 0 || !have.includes(blocker.number)) {
        ops.push({ op: "add-blocked-by", id: task.id, detail: blocker.id });
      }
    }
    for (const n of [...have].sort((a, b) => a - b)) {
      if (!wanted.has(n)) ops.push({ op: "remove-blocked-by", id: task.id, detail: `#${n}` });
    }
  }

  for (const issue of sortedByBlockId(existing)) {
    const id = issue.block?.id ?? "";
    if (id === "PRD" || issue.state !== "OPEN") continue;
    if (!includeTasks && TASK_ID.test(id)) continue;
    const item = itemById.get(id);
    if (!item) {
      ops.push({ op: "close-not-planned", id, detail: `#${issue.number} not in PRD` });
    } else if (item.status === "dropped") {
      ops.push({ op: "close-not-planned", id, detail: `#${issue.number} dropped in PRD` });
    }
  }
  // Implement-only runs refuse work until the PRD issue carries kickoff:done. A PRD issue created by
  // this plan has no labels yet, so it always needs the op.
  const prd = current.get("PRD");
  const prdPresent = opts.prdIssue > 0 || prd !== undefined || index.root !== null;
  const handedOff = prd?.labels.includes("kickoff:done") ?? false;
  if (includeTasks && prdPresent && !handedOff) {
    ops.push({ op: "kickoff-done", id: "PRD", detail: "kickoff:done" });
  }
  return ops;
}

type ListedIssue = Awaited<ReturnType<KitInstance["listIssues"]>>["issues"][number];
interface MachineRead {
  id: string;
  kind: string;
  prd_hash: string;
}

// Live read (clarification 5): one issue list; the machine block of each body; sub-issue lists of
// every prd, epic and feature issue (each child's parent); blocked-by lists of every task issue.
// Issues without a parseable machine block are left out, so the plan never touches them.
export async function readExisting(kit: KitInstance): Promise<ExistingIssue[]> {
  const listed = await kit.listIssues("all");
  if (!listed.ok) throw new Error("cannot list issues");
  const blocks: { issue: ListedIssue; block: MachineRead }[] = [];
  for (const issue of [...listed.issues].sort((a, b) => a.number - b.number)) {
    const block: MachineRead | null = helpers().kitParseMachineBlock(issue.body).block ?? null;
    if (block !== null) blocks.push({ issue, block });
  }
  const parentOf = new Map<number, number>();
  const blockedBy = new Map<number, number[]>();
  for (const { issue, block } of blocks) {
    if (CONTAINER_KINDS.has(block.kind)) {
      const subs = await kit.listSubIssues(issue.number);
      if (!subs.ok) throw new Error(`cannot list sub-issues of #${issue.number}`);
      for (const sub of subs.items) parentOf.set(sub.number, issue.number);
    } else if (block.kind === "task") {
      const deps = await kit.listBlockedBy(issue.number);
      if (!deps.ok) throw new Error(`cannot list blockers of #${issue.number}`);
      blockedBy.set(issue.number, deps.items.map((item) => item.number).sort((a, b) => a - b));
    }
  }
  return blocks.map(({ issue, block }) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state.toUpperCase() === "OPEN" ? "OPEN" : "CLOSED",
    labels: [...issue.labels].sort(naturalCompare),
    block: { id: block.id, prd_hash: block.prd_hash },
    parent: parentOf.get(issue.number) ?? 0,
    blockedBy: blockedBy.get(issue.number) ?? [],
  }));
}

// A saved list for --existing, in the ExistingIssue shape. Anything else is refused, never guessed.
export function readExistingFile(path: string): ExistingIssue[] {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`cannot read ${path} as JSON`);
  }
  if (!Array.isArray(value)) throw new Error(`${path} is not a JSON array`);
  return value.map((row: unknown, index: number) => {
    if (!isExistingIssue(row)) throw new Error(`${path} entry ${index} is not an existing issue`);
    return row;
  });
}

function isExistingIssue(row: unknown): row is ExistingIssue {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  const block = r.block as Record<string, unknown> | null;
  const blockOk =
    block === null ||
    (typeof block === "object" && typeof block.id === "string" && typeof block.prd_hash === "string");
  return (
    Number.isInteger(r.number) &&
    typeof r.title === "string" &&
    (r.state === "OPEN" || r.state === "CLOSED") &&
    Array.isArray(r.labels) &&
    blockOk &&
    typeof r.parent === "number" &&
    Array.isArray(r.blockedBy)
  );
}

export interface ApplyRun {
  results: ApplyResult[];
  numbers: Map<string, number>; // item id -> issue number, for existing and created issues
}

interface Applier {
  kit: KitInstance;
  kitPrd: number; // the PRD issue number the current kit was built with
  kitFor: ((prdIssue: number) => KitInstance) | undefined;
  index: PrdIndex;
  model: PrdModel;
  items: Map<string, PrdIndexItem>;
  numbers: Map<string, number>;
  paceMs: number;
  mutated: boolean;
}

interface CreateSpec {
  title: string;
  body: string;
  labels: string[];
  milestone: string;
  parent: number;
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));
const names = (detail: string): string[] => (detail === "none" ? [] : detail.split(" ").filter((s) => s !== ""));
const numberRef = (detail: string): number => Number(/^#([0-9]+)/.exec(detail)?.[1] ?? 0);

// Kit outcomes mapped to apply outcomes. Anything unrecognised counts as a failure.
function mapOutcome(raw: string): Outcome {
  if (raw === "created" || raw === "done" || raw === "linked" || raw === "removed") return "done";
  if (raw === "exists" || raw === "absent") return "skipped";
  if (raw === "dry-run") return "dry-run";
  return "failed";
}

// Paces every mutation after the first. A failed mutation whose stderr names a secondary rate limit
// waits 60 s and runs once more. The kit records a failed mutation as a finding whose evidence is
// the first 300 characters of stderr, so the new findings are what the retry reads.
async function mutate<T>(a: Applier, call: () => Promise<T>, failed: (result: T) => boolean): Promise<T> {
  if (a.mutated && a.paceMs > 0) await sleep(a.paceMs);
  a.mutated = true;
  const before = a.kit.findings.length;
  const first = await call();
  const limited = a.kit.findings.slice(before).some((finding) => RATE_LIMIT.test(finding.evidence));
  if (!failed(first) || !limited) return first;
  await sleep(RATE_LIMIT_WAIT_MS);
  return call();
}

// A new PRD issue carries the root body. Sections are top-level epics, so they get no parent.
function createSpec(a: Applier, id: string): CreateSpec | null {
  if (id === "PRD") {
    const root = a.index.root;
    if (root === null) return null;
    return {
      title: `[PRD] ${root.title}`,
      body: renderRootBody(root, a.index),
      labels: ["kind:prd"],
      milestone: "",
      parent: 0,
    };
  }
  const item = a.items.get(id);
  if (item === undefined) return null;
  const parent = item.kind === "epic" ? 0 : a.numbers.get(item.parent);
  if (parent === undefined) return null;
  return {
    title: issueTitle(item),
    body: renderItemBody(item, a.index, a.model),
    labels: createLabels(item),
    milestone: item.milestone,
    parent,
  };
}

function bodyFor(a: Applier, id: string): string | null {
  if (id === "PRD") return a.index.root === null ? null : renderRootBody(a.index.root, a.index);
  const item = a.items.get(id);
  return item === undefined ? null : renderItemBody(item, a.index, a.model);
}

async function applyOp(a: Applier, op: ReconcileOp): Promise<ApplyResult> {
  const result = (outcome: Outcome, detail: string): ApplyResult => ({ op: op.op, id: op.id, outcome, detail });
  const kit = a.kit;
  const failedCall = (r: { outcome: string }): boolean => r.outcome === "failed";
  switch (op.op) {
    case "ensure-labels": {
      const r = await mutate(a, () => kit.ensureLabels(names(op.detail)), (x) => x.failed.length > 0);
      if (r.failed.length > 0) return result("failed", `not created: ${r.failed.join(" ")}`);
      return result("done", `created ${r.created.length}`);
    }
    case "ensure-milestones": {
      const r = await mutate(a, () => kit.ensureMilestones(names(op.detail)), (x) => x.failed.length > 0);
      if (r.failed.length > 0) return result("failed", `not created: ${r.failed.join(" ")}`);
      return result("done", `created ${r.created.length}`);
    }
    case "create": {
      const spec = createSpec(a, op.id);
      if (spec === null) return result("failed", "parent not resolved");
      const r = await mutate(a, () => kit.createIssue({ ...spec, blockedBy: [] }), failedCall);
      if (r.outcome === "created") a.numbers.set(op.id, r.number);
      return result(mapOutcome(r.outcome), r.outcome === "created" ? `#${r.number}` : "");
    }
    case "update-body": {
      const n = a.numbers.get(op.id) ?? 0;
      const body = bodyFor(a, op.id);
      if (n === 0 || body === null) return result("failed", "issue not resolved");
      const r = await mutate(a, () => kit.updateBody(n, body), failedCall);
      return result(mapOutcome(r.outcome), `#${n}`);
    }
    case "close-not-planned": {
      const n = numberRef(op.detail);
      if (n === 0) return result("failed", "issue number missing");
      const r = await mutate(a, () => kit.closeNotPlanned(n), failedCall);
      return result(mapOutcome(r.outcome), `#${n}`);
    }
    case "link-parent": {
      const child = a.numbers.get(op.id) ?? 0;
      const parent = a.numbers.get(op.detail) ?? 0;
      if (child === 0 || parent === 0) return result("failed", "issue not resolved");
      const r = await mutate(a, () => kit.addSubIssue(parent, child), failedCall);
      return result(mapOutcome(r.outcome), `#${child} under #${parent}`);
    }
    case "add-blocked-by": {
      const n = a.numbers.get(op.id) ?? 0;
      const blocker = a.numbers.get(op.detail) ?? 0;
      if (n === 0 || blocker === 0) return result("failed", "issue not resolved");
      const r = await mutate(a, () => kit.addBlockedBy(n, blocker), failedCall);
      return result(mapOutcome(r.outcome), `#${n} blocked by #${blocker}`);
    }
    case "remove-blocked-by": {
      const n = a.numbers.get(op.id) ?? 0;
      const blocker = numberRef(op.detail);
      if (n === 0 || blocker === 0) return result("failed", "issue not resolved");
      const r = await mutate(a, () => kit.removeBlockedBy(n, blocker), failedCall);
      return result(mapOutcome(r.outcome), `#${n} unblocked from #${blocker}`);
    }
    case "kickoff-done": {
      const prd = a.numbers.get(op.id) ?? 0;
      if (prd === 0) return result("failed", "PRD issue not resolved");
      if (prd !== a.kitPrd) {
        if (a.kitFor === undefined) {
          return result("failed", `#${prd} kickoff:done needs opts.kitFor: the kit was built for PRD issue ${a.kitPrd}`);
        }
        a.kit = a.kitFor(prd);
        a.kitPrd = prd;
      }
      const r = await mutate(a, () => a.kit.setKickoffStage("done"), failedCall);
      return result(mapOutcome(r.outcome), `#${prd} ${op.detail}`);
    }
  }
  return result("failed", "unknown op");
}

// Applies a plan in its order through the kit. Numbers resolve as issues are created or found, so a
// parent or blocker created earlier in the run is linked by its number. A failed op does not stop
// the run; each failure is reported on its own result.
export async function applyReconcile(
  ops: ReconcileOp[],
  index: PrdIndex,
  kit: KitInstance,
  opts: ApplyOptions,
): Promise<ApplyRun> {
  const numbers = new Map<string, number>();
  for (const [id, issue] of existingById(opts.existing)) numbers.set(id, issue.number);
  if (opts.prdIssue > 0 && !numbers.has("PRD")) numbers.set("PRD", opts.prdIssue);
  const a: Applier = {
    kit,
    kitPrd: opts.prdIssue,
    kitFor: opts.kitFor,
    index,
    model: opts.model,
    items: new Map(index.items.map((item) => [item.id, item] as const)),
    numbers,
    paceMs: opts.paceMs,
    mutated: false,
  };
  const results: ApplyResult[] = [];
  for (const op of ops) {
    // The hand-off runs only after every earlier op succeeded; a failed op already fails the run.
    if (op.op === "kickoff-done" && results.some((r) => r.outcome === "failed")) {
      results.push({ op: op.op, id: op.id, outcome: "skipped", detail: "not run: an earlier op failed" });
      continue;
    }
    results.push(await applyOp(a, op));
  }
  return { results, numbers };
}

export interface ProjectResult {
  ok: boolean;
  reason: string;
  title: string;
  number: number;
  url: string;
  members: number;
  statusUpdated: number;
  skipped: string;
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const refs = (numbers: number[]): string => numbers.map((n) => `#${n}`).join(", ");
// Kit skip notes that report a failed read, edit or membership rather than a missing view value.
const PROJECT_FAILURE = /unreadable|failed|not in the project/;

// The PRD issue plus every active item the plan covers. Dropped items are never added.
export function projectMembers(index: PrdIndex, numbers: Map<string, number>, includeTasks: boolean): number[] {
  const ids = index.items
    .filter((item) => item.status === "active" && (includeTasks || item.kind !== "task"))
    .map((item) => item.id);
  if (index.root !== null) ids.unshift("PRD");
  const found = ids.map((id) => numbers.get(id) ?? 0).filter((n) => n > 0);
  return [...new Set(found)].sort((a, b) => a - b);
}

// The Status value of each planned task is its state label after the run: a new task starts in
// backlog, an existing task keeps the state label it has (a task without one is left out).
export function projectStates(
  index: PrdIndex,
  numbers: Map<string, number>,
  existing: Map<string, ExistingIssue>,
  includeTasks: boolean,
): { issue: number; state: string }[] {
  const out: { issue: number; state: string }[] = [];
  for (const item of index.items) {
    if (item.kind !== "task" || item.status !== "active" || !includeTasks) continue;
    const issue = numbers.get(item.id);
    if (issue === undefined) continue;
    const found = existing.get(item.id);
    const label = found === undefined ? "state:backlog" : found.labels.find((l) => l.startsWith("state:"));
    if (label !== undefined) out.push({ issue, state: label.slice("state:".length) });
  }
  return out.sort((a, b) => a.issue - b.issue);
}

// Project publication after a successful issue sync: owner, project, membership, verification, then
// the Status field. Views are never created, edited or deleted. A failed step returns ok false with
// the reason; the caller turns that into the partial-publication summary.
export async function publishProject(
  kit: KitInstance,
  title: string,
  members: number[],
  states: { issue: number; state: string }[],
): Promise<ProjectResult> {
  const fail = (reason: string, number = 0, url = ""): ProjectResult => ({
    ok: false,
    reason,
    title,
    number,
    url,
    members: members.length,
    statusUpdated: 0,
    skipped: "",
  });
  try {
    const info = await kit.repoInfo();
    if (!info.ok || info.ownerLogin === "") return fail("repository facts unavailable");
    const owner = info.ownerLogin;
    const project = await kit.projectEnsure(owner, title);
    if (project.outcome === "failed" || project.number === 0) {
      return fail(`project "${title}" could not be found or created`);
    }
    const { number, url } = project;
    const added = await kit.projectAdd(owner, number, members);
    if (added.failed.length > 0) return fail(`could not add ${refs(added.failed)} to the project`, number, url);
    const verified = await kit.projectVerify(owner, number, members);
    if (!verified.ok) return fail(`not project members: ${refs(verified.missing)}`, number, url);
    const sync = await kit.projectSyncStatus(owner, number, project.id, states);
    // The kit joins its skip notes with "; ". A failed read, edit or membership is a failed step; a
    // missing Status field or option only leaves that view value unsynced and is shown as a warning.
    const notes = sync.skipped.split("; ").filter((part) => part !== "");
    const failures = notes.filter((part) => PROJECT_FAILURE.test(part));
    if (failures.length > 0) return fail(`Status not synced: ${failures.join("; ")}`, number, url);
    return {
      ok: true,
      reason: "",
      title,
      number,
      url,
      members: members.length,
      statusUpdated: sync.updated.length,
      skipped: notes.join("; "),
    };
  } catch (err) {
    return fail(errorText(err));
  }
}

const USAGE = [
  "usage: bun reconcile.ts --repo <root> --prd-issue <n|0> [--gh-repo OWNER/NAME --login <builder>]",
  "         [--existing <issues.json>] [--charter <autopilot.yaml>] [--project <title>]",
  "         [--dry-run] [--labels-only] [--pace-ms 1000] [--json]",
].join("\n");

const VALUE_FLAGS = new Set([
  "--repo",
  "--gh-repo",
  "--login",
  "--prd-issue",
  "--existing",
  "--charter",
  "--project",
  "--pace-ms",
]);
const SWITCH_FLAGS = new Set(["--dry-run", "--labels-only", "--json"]);

class UsageError extends Error {}

export interface Args {
  repo: string;
  ghRepo: string; // "" when not given
  login: string; // "" when not given
  prdIssue: number;
  dryRun: boolean;
  labelsOnly: boolean;
  existing: string | null;
  charter: string | null;
  project: string | null;
  paceMs: number;
  json: boolean;
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
  const prd = values.get("--prd-issue");
  if (repo === undefined || prd === undefined) throw new UsageError("--repo and --prd-issue are required");
  if (!/^(0|[1-9][0-9]*)$/.test(prd)) throw new UsageError("--prd-issue must be 0 or a positive integer");
  const pace = values.get("--pace-ms") ?? "1000";
  if (!/^[0-9]+$/.test(pace)) throw new UsageError("--pace-ms must be a non-negative integer");
  const project = values.get("--project") ?? null;
  if (project !== null && project.trim() === "") throw new UsageError("--project must name a Project");
  const args: Args = {
    repo: resolve(repo),
    ghRepo: values.get("--gh-repo") ?? "",
    login: values.get("--login") ?? "",
    prdIssue: Number(prd),
    dryRun: switches.has("--dry-run"),
    labelsOnly: switches.has("--labels-only"),
    existing: values.has("--existing") ? resolve(values.get("--existing") ?? "") : null,
    charter: values.has("--charter") ? resolve(values.get("--charter") ?? "") : null,
    project,
    paceMs: Number(pace),
    json: switches.has("--json"),
  };
  if (args.ghRepo !== "" && !helpers().kitValidRepo(args.ghRepo)) {
    throw new UsageError("--gh-repo must be OWNER/NAME");
  }
  // Only a live read or an apply needs the kit, and the kit needs the repo and the builder login.
  const needsKit = !args.dryRun || (args.existing === null && !args.labelsOnly);
  if (needsKit && (args.ghRepo === "" || args.login === "")) {
    throw new UsageError("--gh-repo and --login are required unless --dry-run with --existing or --labels-only");
  }
  return args;
}

interface Report {
  warnings: string[];
  ops: ReconcileOp[];
  errors: string[];
  results: ApplyResult[];
  project: ProjectResult | null;
  summary: string;
}

const EMPTY_INDEX: PrdIndex = { version: 1, root: null, items: [], acs: [] };
const lintLine = (issue: LintIssue): string =>
  `${issue.level === "error" ? "ERROR" : "WARN"} ${issue.id} ${issue.rule} ${issue.reason}`;
const uniqueSorted = (values: string[]): string[] => [...new Set(values)].sort(naturalCompare);

function summaryOf(ops: ReconcileOp[]): string {
  const counts = new Map<string, number>();
  for (const op of ops) counts.set(op.op, (counts.get(op.op) ?? 0) + 1);
  const parts = SUMMARY_ORDER.filter((name) => counts.has(name)).map((name) => `${counts.get(name)} ${name}`);
  return `reconcile: ${ops.length} ops (${parts.join(", ")})`;
}

// Text: warnings, one OP line per planned op, errors, then the summary. Json: the whole report.
function emit(report: Report, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }
  const lines = [
    ...report.warnings,
    ...report.ops.map((op) => `OP ${op.op} ${op.id} ${op.detail}`),
    ...report.errors,
    report.summary,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

interface PrdCheck {
  errors: string[]; // non-empty refuses the plan
  index: PrdIndex;
  includeTasks: boolean;
  warnings: string[];
}

// Clarification 4: the s3 lint must have zero errors before anything is planned. Tasks are planned
// only when the s5 lint has zero errors as well; otherwise the plan covers the root, sections and
// features, and the s5 errors are shown as warnings so the skip has a visible reason.
function checkPrd(model: PrdModel): PrdCheck {
  if (model.root === null) {
    return {
      errors: ["ERROR prd/prd.md frontmatter root missing"],
      index: EMPTY_INDEX,
      includeTasks: false,
      warnings: [],
    };
  }
  const s3 = lintPrd(model, { stage: "s3", coverageTarget: 0.95, decomposed: null });
  if (s3.errors.length > 0) {
    return { errors: s3.errors.map(lintLine), index: EMPTY_INDEX, includeTasks: false, warnings: [] };
  }
  const s5 = lintPrd(model, { stage: "s5", coverageTarget: 0.95, decomposed: null });
  const includeTasks = s5.errors.length === 0;
  const warnings = s5.warnings.map(lintLine);
  if (!includeTasks) {
    warnings.push(...s5.errors.map((issue) => lintLine({ ...issue, level: "warn" })));
    warnings.push("WARN PRD tasks skipped: s5 lint errors");
  }
  return { errors: [], index: buildIndex(model), includeTasks, warnings };
}

// The kit is loaded from the canonical block. dryRun true allows reads only. Body files for
// --body-file go under <repo>/.shipflow/gh, the same place snapshot.ts uses.
function makeKit(args: Args, charter: Charter | null, dryRun: boolean, prdIssue = args.prdIssue): KitInstance {
  return loadKit().makeGithubKit({
    repo: args.ghRepo,
    login: args.login,
    instance: "reconcile",
    prdIssue,
    dryRun,
    claimTtlSeconds: 60,
    attemptCap: charter?.limits.task_attempts ?? 4,
    requiredChecks: charter?.authority.merge.requires ?? [],
    writeRoot: resolve(args.repo, ".shipflow"),
    pollSeconds: 1,
    maxPolls: 1,
    assignee: "",
  }) as KitInstance;
}

async function run(args: Args): Promise<number> {
  const loaded = args.charter === null ? null : loadCharter(args.charter);
  if (loaded !== null && loaded.charter === null) {
    for (const line of loaded.errors) process.stderr.write(`ERROR charter ${line}\n`);
    return 2;
  }
  const charter = loaded?.charter ?? null;
  const model = parsePrd(readProject(args.repo));
  // The Project is published only after an apply of issues; --project overrides the charter title.
  const title = args.labelsOnly ? null : (args.project ?? charter?.project ?? null);
  const milestones = uniqueSorted([...(charter?.milestones ?? []), ...(model.root?.milestones ?? [])]);
  const needsKit = !args.dryRun || (args.existing === null && !args.labelsOnly);
  const kit = needsKit ? makeKit(args, charter, args.dryRun) : null;
  const report: Report = { warnings: [], ops: [], errors: [], results: [], project: null, summary: "" };
  const finish = (code: number): number => {
    emit(report, args.json);
    return code;
  };

  let index = EMPTY_INDEX;
  let includeTasks = true;
  let existing: ExistingIssue[] = [];
  if (!args.labelsOnly) {
    const check = checkPrd(model);
    report.warnings = check.warnings;
    if (check.errors.length > 0) {
      report.errors = check.errors;
      report.summary = "ERROR PRD reconcile lint errors";
      return finish(1);
    }
    index = check.index;
    includeTasks = check.includeTasks;
    existing = args.existing !== null ? readExistingFile(args.existing) : await readExisting(kit as KitInstance);
  }

  report.ops = planReconcile(index, existing, {
    prdIssue: args.prdIssue,
    labelsOnly: args.labelsOnly,
    includeTasks,
    milestones,
  });
  if (args.dryRun) {
    report.summary = summaryOf(report.ops);
    return finish(0);
  }

  const live = kit as KitInstance;
  const applyRun = await applyReconcile(report.ops, index, live, {
    prdIssue: args.prdIssue,
    model,
    existing,
    paceMs: args.paceMs,
    kitFor: (prdIssue: number) => makeKit(args, charter, false, prdIssue),
  });
  report.results = applyRun.results;
  const failed = applyRun.results.filter((r) => r.outcome === "failed");
  report.errors = failed.map((r) => `ERROR ${r.id} ${r.op} ${r.detail}`);
  if (failed.length > 0) {
    report.summary = `reconcile: issue sync failed: ${failed.length} of ${report.ops.length} ops`;
    return finish(1);
  }
  const applied = applyRun.results.filter((r) => r.outcome === "done").length;
  const inPlace = applyRun.results.filter((r) => r.outcome === "skipped").length;
  report.summary = `reconcile: applied ${applied} ops, ${inPlace} already in place`;
  if (title === null) return finish(0);

  const project = await publishProject(
    live,
    title,
    projectMembers(index, applyRun.numbers, includeTasks),
    projectStates(index, applyRun.numbers, existingById(existing), includeTasks),
  );
  report.project = project;
  if (project.skipped !== "") report.warnings.push(`WARN PRD project status skipped: ${project.skipped}`);
  if (!project.ok) {
    report.summary = `reconcile: partial publication: ${project.reason}`;
    return finish(1);
  }
  report.summary = `reconcile: project "${title}" #${project.number} verified, ${project.members} members, ${project.statusUpdated} status updated`;
  return finish(0);
}

export async function main(argv: string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`ERROR usage ${errorText(err)}\n${USAGE}\n`);
    return 2;
  }
  try {
    return await run(args);
  } catch (err) {
    process.stderr.write(`ERROR reconcile ${errorText(err)}\n`);
    return 2;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
