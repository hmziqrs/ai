// Fills the pre-tested task-cycle template for one dispatch, and verifies a filled copy against it.
// Filling replaces only the lines between the fill markers; verifying compares every other line.
// The only side effect is one optional `git fetch origin <base>`. The PRD and GitHub are never written.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { areaFor, expandHome, loadCharter, type Charter } from "./lib/charter.ts";
import { effectiveSettings, type EffectiveSettings, type GateEntry } from "./lib/detect.ts";
import { loadKit, realWorld } from "./lib/kit.ts";
import { buildIndex, parsePrd, type PrdIndex } from "./lib/prd.ts";

export interface CycleGate {
  name: string;
  tool: string;
  args: string[];
  timeoutMs: number;
}

// Field order is the emitted order of the filled JSON. Keep it in step with task-cycle-spec section 2.
export interface CycleLane {
  issue: number;
  id: string;
  kind: "task" | "test";
  branch: string;
  area: string[];
  tests: string[];
  satisfies: string[];
  prd: string;
  /** Raw issue text of a bug lane (capped); empty for PRD tasks, whose spec is the PRD excerpt. */
  spec: string;
  roundCap: number;
  budget: { files: number; lines: number };
  tier: "pro" | "flash";
  implementer: string;
  judge: string;
  security: boolean;
  ui: boolean;
  gates: CycleGate[];
  checks: CycleGate[];
  previewPort: number;
}

export interface CycleConfig {
  repoRoot: string;
  ghRepo: string;
  baseBranch: string;
  baseSha: string;
  prdIssue: number;
  login: string;
  instance: string;
  dryRun: boolean;
  shadow: boolean;
  requireApproval: boolean;
  claimTtlSeconds: number;
  attemptCap: number;
  requiredChecks: string[];
  pollSeconds: number;
  maxPolls: number;
  worktreeRoot: string;
  evidenceDir: string;
  scriptsDir: string;
  securityPersona: string;
  qaPersona: string;
  reviewer: { appId: string; installationId: string; keyPath: string } | null;
  protectedPaths: string[];
  testAuthorPaths: string[];
  /** Milestone a bug filed by the cycle goes under: the charter's first milestone. */
  bugMilestone: string;
  release: number[];
  promote: number[];
  lanes: CycleLane[];
}

// The machine block as the kit parses it.
export interface MachineBlock {
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

export interface ParsedBlock {
  block: MachineBlock | null;
  errors: string[];
  unknownKeys: string[];
}

export type BlockParser = (body: string) => ParsedBlock;

// One issue as the dispatcher reads it: the kit's view plus its label helpers.
export interface IssueFacts {
  number: number;
  error: string;
  open: boolean;
  state: string;
  stateCount: number;
  attempt: number;
  body: string;
}

export interface Refusal {
  issue: number;
  reason: string;
}

export interface LaneInputs {
  charter: Charter;
  settings: EffectiveSettings;
  index: PrdIndex;
  promote: number[];
  // Absolute path of <name>.md from the project's agents folder or the user's; null when neither has it.
  persona: (name: string) => string | null;
}

export interface BuiltLane {
  lane: CycleLane;
  specialist: string;
}

export interface ConfigInputs {
  root: string;
  charter: Charter;
  baseSha: string;
  slug: string;
  flags: { dryRun: boolean; shadow: boolean; supervised: boolean; requireApproval: boolean };
  release: number[];
  promote: number[];
  lanes: CycleLane[];
  securityPersona: string;
  qaPersona: string;
  scriptsDir: string;
}

export type HashCheck = { ok: true } | { ok: false; reason: string };

export interface FillOptions {
  repo: string;
  charter: string;
  issues: number[];
  release: number[];
  promote: number[];
  slug: string;
  out: string;
  dryRun: boolean;
  shadow: boolean;
  supervised: boolean;
  requireApproval: boolean;
}

export type ParsedArgs =
  | { kind: "fill"; options: FillOptions }
  | { kind: "verify"; file: string }
  | { kind: "help" }
  | { kind: "usage"; message: string };

export interface GitResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type GitRunner = (args: string[]) => Promise<GitResult>;

// The kit members this script uses; the kit itself returns them loosely typed.
interface KitView {
  ok: boolean;
  state: string;
  labels: string[];
  body: string;
  error: string;
}

interface Kit {
  viewIssue(n: number): Promise<KitView>;
  stateOf(labels: string[]): { state: string; count: number };
  attemptOf(labels: string[]): number;
}

type Outcome = { ok: true; built: BuiltLane } | { ok: false; reason: string };

const USAGE =
  "usage: bun fill-cycle.ts --repo <root> --charter <path> --issues 12,13 [--release 9] [--promote 14] --slug <run-slug> --out <path> [--dry-run] [--shadow] [--supervised] [--require-approval]\n" +
  "       bun fill-cycle.ts --verify <filled.dwf.ts>\n";
const TEMPLATE_FILE = join(import.meta.dir, "..", "task-cycle-template.dwf.ts");
const FILL_START = "// fill:start";
const FILL_END = "// fill:end";
const CYCLE_PREFIX = "const CYCLE: CycleConfig = ";
const VALUE_FLAGS = new Set(["--repo", "--charter", "--issues", "--release", "--promote", "--slug", "--out", "--verify"]);
const BOOLEAN_FLAGS = new Set(["--dry-run", "--shadow", "--supervised", "--require-approval"]);
const ISSUE_NUMBER = /^[1-9][0-9]*$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;
const HEX_SHA = /^[0-9a-f]{40}$/;
// A test-author agent name; a protected rule accepts test lanes when its agents regex matches it.
const TEST_AUTHOR_PROBE = "test-author-x";
const SECURITY_PERSONA = "z-security-auditor";
const QA_PERSONA = "z-qa-evaluator";
const ACCEPTANCE_PREFIX = "tests/acceptance/";
const PARITY_PREFIX = "tests/parity/";
const PREVIEW_PORT_BASE = 4300;
const DEFAULT_BUDGET_FILES = 10;
const POLL_SECONDS = 20;
const MAX_POLLS = 45;
const MINUTE_MS = 60_000;

function usage(message: string): ParsedArgs {
  return { kind: "usage", message };
}

// "" is an empty list. Otherwise comma-separated positive integers, each listed once.
function issueList(text: string, name: string): number[] {
  if (text.trim() === "") return [];
  const numbers: number[] = [];
  for (const token of text.split(",")) {
    const digits = token.trim();
    if (!ISSUE_NUMBER.test(digits)) throw new Error(`${name} takes comma-separated issue numbers, found "${token}"`);
    const n = Number(digits);
    if (numbers.includes(n)) throw new Error(`${name} lists #${n} twice`);
    numbers.push(n);
  }
  return numbers;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { kind: "help" };
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (VALUE_FLAGS.has(name)) {
      const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || (eq < 0 && value.startsWith("--"))) return usage(`${name} needs a value`);
      if (values.has(name)) return usage(`${name} is given twice`);
      values.set(name, value);
    } else if (BOOLEAN_FLAGS.has(name) && eq < 0) {
      flags.add(name);
    } else {
      return usage(`unknown argument ${arg}`);
    }
  }

  const verify = values.get("--verify");
  if (verify !== undefined) {
    if (values.size > 1 || flags.size > 0) return usage("--verify takes no other arguments");
    return { kind: "verify", file: verify };
  }
  const get = (name: string): string => values.get(name) ?? "";
  for (const name of ["--repo", "--charter", "--slug", "--out"]) {
    if (get(name) === "") return usage(`${name} is required`);
  }
  if (!values.has("--issues")) return usage("--issues is required (it may be empty with --release or --promote)");
  if (!SLUG.test(get("--slug"))) return usage("--slug takes lowercase letters, digits and hyphens");

  let issues: number[];
  let release: number[];
  let promote: number[];
  try {
    issues = issueList(get("--issues"), "--issues");
    release = issueList(get("--release"), "--release");
    promote = issueList(get("--promote"), "--promote");
  } catch (err) {
    return usage(err instanceof Error ? err.message : String(err));
  }
  const shared = release.find((n) => issues.includes(n) || promote.includes(n));
  if (shared !== undefined) return usage(`#${shared} is in --release and in --issues or --promote`);
  if (issues.length === 0 && release.length === 0 && promote.length === 0) {
    return usage("nothing to fill: --issues is empty and --release and --promote are empty");
  }
  return {
    kind: "fill",
    options: {
      repo: get("--repo"),
      charter: get("--charter"),
      issues,
      release,
      promote,
      slug: get("--slug"),
      out: get("--out"),
      dryRun: flags.has("--dry-run"),
      shadow: flags.has("--shadow"),
      supervised: flags.has("--supervised"),
      requireApproval: flags.has("--require-approval"),
    },
  };
}

function trimSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

// True when `prefix` names `path` itself or one of its parent directories. Matching happens at "/"
// boundaries, so "tests/acceptance" does not cover "tests/acceptance-old/x.ts".
function covers(prefix: string, path: string): boolean {
  const base = trimSlash(prefix);
  const target = trimSlash(path);
  return base === "" || target === base || target.startsWith(`${base}/`);
}

// Two area paths overlap when either covers the other.
function overlaps(a: string, b: string): boolean {
  return covers(a, b) || covers(b, a);
}

// The area entry for a path, by longest prefix. A trailing slash makes a directory path match its prefix.
function areaOf(inputs: LaneInputs, path: string) {
  return areaFor({ ...inputs.charter, areas: inputs.settings.areas }, `${trimSlash(path)}/`);
}

function toGate(entry: GateEntry, extra: string[] = []): CycleGate {
  return { name: entry.name, tool: entry.tool, args: [...entry.args, ...extra], timeoutMs: entry.timeout_minutes * MINUTE_MS };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function splitLines(text: string): string[] {
  return text.split("\n");
}

function lineIndexes(lines: string[], marker: string): number[] {
  return lines.flatMap((line, i) => (line.trimEnd() === marker ? [i] : []));
}

// The one start line and the one end line, in order. Throws when either is missing, repeated or reversed.
function fillMarkers(lines: string[], label: string): { start: number; end: number } {
  const starts = lineIndexes(lines, FILL_START);
  const ends = lineIndexes(lines, FILL_END);
  if (starts.length !== 1 || ends.length !== 1 || ends[0] <= starts[0]) {
    throw new Error(`${label} must hold ${FILL_START} and ${FILL_END} exactly once each, start first`);
  }
  return { start: starts[0], end: ends[0] };
}

// Replaces the lines strictly between the markers with one CYCLE statement; every other line is kept.
export function fillTemplate(templateText: string, config: CycleConfig): string {
  const lines = splitLines(templateText);
  const { start, end } = fillMarkers(lines, "template");
  const statement = `${CYCLE_PREFIX}${JSON.stringify(config, null, 2)};`;
  return [...lines.slice(0, start + 1), statement, ...lines.slice(end)].join("\n");
}

// The region must be exactly one `const CYCLE: CycleConfig = <JSON object>;` statement.
function isCycleStatement(region: string[]): boolean {
  const text = region.join("\n");
  if (!text.startsWith(CYCLE_PREFIX) || !text.endsWith(";")) return false;
  try {
    const value: unknown = JSON.parse(text.slice(CYCLE_PREFIX.length, -1));
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

// Index of the first differing element, or -1 when the arrays are equal. When one is a prefix of the
// other, the index where the shorter one ends.
function firstDifference(a: string[], b: string[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    if (a[i] !== b[i]) return i;
  }
  return a.length === b.length ? -1 : n;
}

// Compares a filled copy with the template outside the fill region, and checks the region itself.
// `line` is the 1-based line of the filled copy where the first difference is. A filled copy without
// its markers is reported at line 1, because nothing else can be located.
export function verifyFilled(templateText: string, filledText: string): { ok: boolean; line: number } {
  const template = splitLines(templateText);
  const t = fillMarkers(template, "template");
  const filled = splitLines(filledText);
  let f: { start: number; end: number };
  try {
    f = fillMarkers(filled, "filled copy");
  } catch {
    return { ok: false, line: 1 };
  }
  const before = firstDifference(template.slice(0, t.start + 1), filled.slice(0, f.start + 1));
  if (before !== -1) return { ok: false, line: before + 1 };
  if (!isCycleStatement(filled.slice(f.start + 1, f.end))) return { ok: false, line: f.start + 2 };
  const after = firstDifference(template.slice(t.end), filled.slice(f.end));
  if (after !== -1) return { ok: false, line: f.end + after + 1 };
  return { ok: true, line: 0 };
}

// The machine block's prd_hash must equal the hash of the same item in the base branch's PRD index.
// A dropped item cannot be built (needs-plan). A missing or changed item needs a new publication.
export function planHashCheck(block: { id: string; prd_hash: string }, index: PrdIndex): HashCheck {
  const item = index.items.find((candidate) => candidate.id === block.id);
  if (item !== undefined && item.status === "dropped") {
    return { ok: false, reason: `needs-plan ${block.id} item is dropped from the PRD` };
  }
  if (item === undefined || block.prd_hash !== item.hash) {
    return { ok: false, reason: `needs-publish ${block.id} plan changed since publication` };
  }
  return { ok: true };
}

function refuse(reason: string): Outcome {
  return { ok: false, reason };
}

// Protected rules that touch a path: the path lies inside the rule's prefix, or contains that prefix.
function touchedRules(charter: Charter, path: string): Charter["protected"] {
  return charter.protected.filter((rule) => overlaps(rule.prefix, path));
}

function acceptsTestAuthor(rule: Charter["protected"][number]): boolean {
  return new RegExp(rule.agents).test(TEST_AUTHOR_PROBE);
}

// A test lane may write only where its paths sit inside test-author rules, and no other rule touches them.
function isTestLane(charter: Charter, area: string[]): boolean {
  return area.every((path) => {
    const touched = touchedRules(charter, path);
    return touched.some((rule) => covers(rule.prefix, path)) && touched.every(acceptsTestAuthor);
  });
}

function buildOne(facts: IssueFacts, inputs: LaneInputs, parseBlock: BlockParser, accepted: BuiltLane[]): Outcome {
  const { charter, settings } = inputs;
  if (facts.error !== "") return refuse(`view failed: ${facts.error}`);
  if (!facts.open) return refuse("issue is not open");
  const parsed = parseBlock(facts.body);
  if (parsed.block === null) return refuse(parsed.errors.join("; ") || "invalid machine block");
  const block = parsed.block;
  if (parsed.unknownKeys.length > 0) return refuse(`unknown machine block key ${parsed.unknownKeys.join(", ")}`);
  // A bug is filed by the kit, not planned: it has no PRD item, so no PRD path or hash to check.
  const isBug = block.kind === "bug";
  if (block.kind !== "task" && !isBug) return refuse(`kind ${block.kind} is not a task or bug`);
  if (facts.stateCount !== 1) return refuse(`${facts.stateCount} state labels, expected one`);
  const wanted = inputs.promote.includes(facts.number) ? ["ready", "backlog"] : ["ready"];
  if (!wanted.includes(facts.state)) return refuse(`state ${facts.state} is not ${wanted.join(" or ")}`);
  if (!isBug) {
    const hash = planHashCheck(block, inputs.index);
    if (!hash.ok) return refuse(hash.reason);
  }
  if (accepted.some((built) => built.lane.id === block.id)) return refuse(`duplicate task id ${block.id}`);
  if (!isBug && block.prd === "") return refuse("machine block has no prd");
  if (block.area.length === 0) return refuse("task area must not be empty");
  if (block.size !== "S" && block.size !== "M") return refuse(`size must be S or M, found "${block.size}"`);

  const testLane = isTestLane(charter, block.area);
  if (!testLane) {
    const guarded = block.area.find((path) => touchedRules(charter, path).length > 0);
    if (guarded !== undefined) {
      return refuse(`area ${guarded} is under protected prefix ${touchedRules(charter, guarded)[0].prefix}`);
    }
  }

  const areaPath = block.area[0];
  const match = areaOf(inputs, areaPath);
  if (match === null) return refuse(`no specialist for ${areaPath}`);
  const implementer = inputs.persona(match.specialist);
  if (implementer === null) return refuse(`persona ${match.specialist} is not installed`);

  const security = block.area.some((path) => charter.security_paths.some((guard) => overlaps(guard, path)));
  const ui = block.area.some((path) => areaOf(inputs, path)?.ui === true);
  if (ui && settings.preview === null) return refuse("no preview command for a ui lane");

  const acceptanceTests = block.tests.filter((path) => covers(ACCEPTANCE_PREFIX, path));
  const parityTests = block.tests.filter((path) => covers(PARITY_PREFIX, path));
  if (acceptanceTests.length > 0 && settings.gates.acceptance.length === 0) {
    return refuse(`no acceptance gate configured for ${acceptanceTests.join(", ")}`);
  }
  if (parityTests.length > 0 && settings.gates.parity.length === 0) {
    return refuse(`no parity gate configured for ${parityTests.join(", ")}`);
  }
  const gates = [...settings.gates.l1, ...settings.gates.unit].map((entry) => toGate(entry));
  const checks: CycleGate[] = [
    ...(acceptanceTests.length > 0 ? settings.gates.acceptance.map((entry) => toGate(entry, acceptanceTests)) : []),
    ...(parityTests.length > 0 ? settings.gates.parity.map((entry) => toGate(entry, parityTests)) : []),
  ];

  const clash = accepted.find((built) => built.lane.area.some((a) => block.area.some((p) => overlaps(a, p))));
  if (clash !== undefined) return refuse(`areas overlap lane ${clash.lane.id} (#${clash.lane.issue})`);

  const lane: CycleLane = {
    issue: facts.number,
    id: block.id,
    kind: testLane ? "test" : "task",
    branch: testLane ? `wf/test-${block.id}` : `wf/${block.id}`,
    area: [...block.area],
    tests: [...block.tests],
    satisfies: [...block.satisfies],
    prd: isBug ? "" : block.prd,
    spec: isBug ? facts.body.slice(0, 8000) : "",
    roundCap: block.size === "S" ? 2 : 3,
    budget: block.budget ?? { files: DEFAULT_BUDGET_FILES, lines: block.size === "S" ? 150 : 300 },
    tier: facts.attempt >= 2 ? "pro" : charter.tiers.first_attempt,
    implementer,
    // The judge is a fresh read-only copy of the same specialist.
    judge: implementer,
    security,
    ui,
    gates,
    checks,
    previewPort: ui ? PREVIEW_PORT_BASE + accepted.length : 0,
  };
  return { ok: true, built: { lane, specialist: match.specialist } };
}

// Turns the read issues into lanes, in the order given. An issue that cannot run is refused with its
// reason. A lane whose areas overlap an earlier lane is refused, so two lanes never touch the same paths.
export function buildLanes(
  issues: IssueFacts[],
  inputs: LaneInputs,
  parseBlock: BlockParser,
): { lanes: BuiltLane[]; refused: Refusal[] } {
  const lanes: BuiltLane[] = [];
  const refused: Refusal[] = [];
  for (const facts of issues) {
    const outcome = buildOne(facts, inputs, parseBlock, lanes);
    if (outcome.ok) lanes.push(outcome.built);
    else refused.push({ issue: facts.number, reason: outcome.reason });
  }
  return { lanes, refused };
}

// The CycleConfig the template reads. Keys are emitted in this order, so the filled file is deterministic.
export function buildConfig(inputs: ConfigInputs): CycleConfig {
  const { root, charter } = inputs;
  const testAuthorPaths = charter.protected
    .filter((rule) => acceptsTestAuthor(rule))
    .map((rule) => rule.prefix);
  const reviewer = charter.identities.reviewer;
  return {
    repoRoot: root,
    ghRepo: charter.repo,
    baseBranch: charter.base_branch,
    baseSha: inputs.baseSha,
    prdIssue: charter.dispatcher.prd_issue,
    login: charter.identities.builder.login,
    instance: charter.dispatcher.instance,
    dryRun: inputs.flags.dryRun,
    // Supervised cycles stop at an open PR for the owner to merge; one identity cannot approve its own PR.
    shadow: inputs.flags.shadow || inputs.flags.supervised,
    requireApproval: inputs.flags.requireApproval,
    claimTtlSeconds: 2 * charter.limits.task_timeout_minutes * 60,
    attemptCap: charter.limits.task_attempts,
    requiredChecks: [...charter.authority.merge.requires],
    pollSeconds: POLL_SECONDS,
    maxPolls: MAX_POLLS,
    worktreeRoot: join(root, ".zflow", "worktrees"),
    evidenceDir: join(root, ".zflow", "evidence", inputs.slug),
    scriptsDir: inputs.scriptsDir,
    securityPersona: inputs.securityPersona,
    qaPersona: inputs.qaPersona,
    reviewer:
      reviewer === null
        ? null
        : { appId: reviewer.app_id, installationId: reviewer.installation_id, keyPath: expandHome(reviewer.key_path) },
    protectedPaths: charter.protected.map((rule) => rule.prefix),
    testAuthorPaths,
    bugMilestone: charter.milestones[0] ?? "",
    release: inputs.release,
    promote: inputs.promote,
    lanes: inputs.lanes,
  };
}

// The one git runner: argv only, never a shell, output as text.
export async function runGit(args: string[]): Promise<GitResult> {
  const proc = Bun.spawn(["git", ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { exitCode, stdout, stderr };
}

// The base commit: origin's head of the base branch. It is fetched once when this clone lacks it.
export async function resolveBase(root: string, base: string, git: GitRunner = runGit): Promise<string> {
  const remote = await git(["-C", root, "ls-remote", "origin", `refs/heads/${base}`]);
  if (remote.exitCode !== 0) throw new Error(`git ls-remote origin ${base} failed: ${remote.stderr.trim()}`);
  const sha = remote.stdout.trim().split(/\s+/)[0] ?? "";
  if (!HEX_SHA.test(sha)) throw new Error(`origin has no branch ${base}`);
  if ((await git(["-C", root, "cat-file", "-e", sha])).exitCode === 0) return sha;
  const fetched = await git(["-C", root, "fetch", "origin", base]);
  if (fetched.exitCode !== 0) throw new Error(`git fetch origin ${base} failed: ${fetched.stderr.trim()}`);
  if ((await git(["-C", root, "cat-file", "-e", sha])).exitCode !== 0) {
    throw new Error(`commit ${sha} is still missing after fetch`);
  }
  return sha;
}

// The PRD index as the base commit publishes it: every prd/ file and the discovery manifest, parsed the
// way prd-lint parses the working tree. Reads only; the commit is named, so a moving branch cannot skew it.
export async function loadBaseIndex(root: string, sha: string, git: GitRunner = runGit): Promise<PrdIndex> {
  const listed = await git(["-C", root, "ls-tree", "-r", "-z", "--name-only", sha, "--", "prd", "discovery/manifest.json"]);
  if (listed.exitCode !== 0) throw new Error(`git ls-tree failed: ${listed.stderr.trim()}`);
  const paths = listed.stdout.split("\0").filter((path) => path !== "").sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const files = new Map<string, string>();
  for (const path of paths) {
    const shown = await git(["-C", root, "show", `${sha}:${path}`]);
    if (shown.exitCode !== 0) throw new Error(`git show ${path} failed: ${shown.stderr.trim()}`);
    files.set(path, shown.stdout);
  }
  return buildIndex(parsePrd(files));
}

// Reads each issue through the kit (dryRun, so only reads run). A failed read is kept as a fact, so
// the refusal names the issue rather than aborting the whole fill.
async function readIssues(kit: Kit, numbers: number[]): Promise<IssueFacts[]> {
  const facts: IssueFacts[] = [];
  for (const number of numbers) {
    const view = await kit.viewIssue(number);
    if (!view.ok) {
      facts.push({ number, error: view.error || "issue could not be read", open: false, state: "", stateCount: 0, attempt: 1, body: "" });
      continue;
    }
    const state = kit.stateOf(view.labels);
    facts.push({
      number,
      error: "",
      open: view.state === "OPEN",
      state: state.state,
      stateCount: state.count,
      attempt: kit.attemptOf(view.labels),
      body: view.body,
    });
  }
  return facts;
}

// The persona for a name: the project's agents folder first, then the user's. Null when neither has it.
function personaResolver(root: string): (name: string) => string | null {
  return (name) => {
    for (const path of [join(root, ".zcode", "agents", `${name}.md`), expandHome(`~/.zcode/agents/${name}.md`)]) {
      if (existsSync(path)) return path;
    }
    return null;
  };
}

async function fillCli(options: FillOptions): Promise<number> {
  const root = resolve(options.repo);
  const loaded = loadCharter(resolve(options.charter));
  if (loaded.charter === null) {
    for (const error of loaded.errors) process.stderr.write(`ERROR ${error}\n`);
    return 2;
  }
  const charter = loaded.charter;
  const outPath = resolve(options.out);
  let template: string;
  try {
    template = readFileSync(TEMPLATE_FILE, "utf8");
  } catch (err) {
    process.stderr.write(`fill-cycle: cannot read the template: ${errorMessage(err)}\n`);
    return 2;
  }
  try {
    const baseSha = await resolveBase(root, charter.base_branch);
    const settings = effectiveSettings(charter, root);
    const persona = personaResolver(root);
    let result: { lanes: BuiltLane[]; refused: Refusal[] } = { lanes: [], refused: [] };
    if (options.issues.length > 0) {
      const kitModule = loadKit(realWorld);
      const kit = kitModule.makeGithubKit({
        repo: charter.repo,
        login: charter.identities.builder.login,
        instance: charter.dispatcher.instance,
        prdIssue: charter.dispatcher.prd_issue,
        dryRun: true,
        claimTtlSeconds: 2 * charter.limits.task_timeout_minutes * 60,
        attemptCap: charter.limits.task_attempts,
        requiredChecks: [...charter.authority.merge.requires],
        writeRoot: join(root, ".zflow", "kit"),
        pollSeconds: POLL_SECONDS,
        maxPolls: MAX_POLLS,
        assignee: "",
      }) as Kit;
      const facts = await readIssues(kit, options.issues);
      const index = await loadBaseIndex(root, baseSha);
      result = buildLanes(
        facts,
        { charter, settings, index, promote: options.promote, persona },
        kitModule.kitParseMachineBlock as BlockParser,
      );
    }
    const { lanes, refused } = result;
    const config = buildConfig({
      root,
      charter,
      baseSha,
      slug: options.slug,
      flags: { dryRun: options.dryRun, shadow: options.shadow, supervised: options.supervised, requireApproval: options.requireApproval },
      release: options.release,
      promote: options.promote,
      lanes: lanes.map((built) => built.lane),
      securityPersona: persona(SECURITY_PERSONA) ?? "",
      qaPersona: persona(QA_PERSONA) ?? "",
      scriptsDir: import.meta.dir,
    });
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, fillTemplate(template, config));
    for (const item of refused) process.stderr.write(`ERROR #${item.issue} ${item.reason}\n`);
    const summary = {
      out: outPath,
      baseSha,
      lanes: lanes.map(({ lane, specialist }) => ({
        issue: lane.issue,
        id: lane.id,
        specialist,
        tier: lane.tier,
        ui: lane.ui,
        security: lane.security,
      })),
      refused,
    };
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return options.issues.length > 0 && lanes.length === 0 ? 1 : 0;
  } catch (err) {
    process.stderr.write(`fill-cycle: ${errorMessage(err)}\n`);
    return 2;
  }
}

function verifyCli(file: string): number {
  let template: string;
  let filled: string;
  try {
    template = readFileSync(TEMPLATE_FILE, "utf8");
    filled = readFileSync(file, "utf8");
  } catch (err) {
    process.stderr.write(`fill-cycle: ${errorMessage(err)}\n`);
    return 2;
  }
  try {
    const result = verifyFilled(template, filled);
    if (result.ok) return 0;
    process.stderr.write(`ERROR drift line ${result.line}\n`);
    return 1;
  } catch (err) {
    process.stderr.write(`fill-cycle: template: ${errorMessage(err)}\n`);
    return 2;
  }
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`fill-cycle: ${parsed.message}\n${USAGE}`);
    return 2;
  }
  if (parsed.kind === "verify") return verifyCli(parsed.file);
  return fillCli(parsed.options);
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
