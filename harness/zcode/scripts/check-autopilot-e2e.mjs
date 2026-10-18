// End-to-end phase-separation checker for the autopilot scripts (autopilot-scripts-spec section 9
// items 1-5, with the section 7 item 8 template rehearsals: a merged lane, a shadow lane and a
// protected-path lane). Real git runs in temporary repositories with a bare origin; GitHub is the
// shared FakeGitHub; the task-cycle template is transpiled and run with stub facade globals.
// Run from the repository root: bun harness/zcode/scripts/check-autopilot-e2e.mjs
import assert from "node:assert/strict";
import {
  appendFileSync,
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { FakeGitHub, LOGIN, OWNER, argPair, isPrMerge, labelsOf, stateLabels } from "./lib/fake-github.mjs";
import { expandHome, loadCharter } from "../skills/shipflow/scripts/lib/charter.ts";
import { effectiveSettings } from "../skills/shipflow/scripts/lib/detect.ts";
import { loadKit } from "../skills/shipflow/scripts/lib/kit.ts";
import { buildIndex, itemHash, parsePrd, readProject } from "../skills/shipflow/scripts/lib/prd.ts";
import {
  applyReconcile,
  planReconcile,
  projectMembers,
  projectStates,
  publishProject,
  readExisting,
} from "../skills/shipflow/scripts/reconcile.ts";
import { buildDecideInput, decide } from "../skills/shipflow/scripts/snapshot.ts";
import {
  buildConfig,
  buildLanes,
  fillTemplate,
  loadBaseIndex,
  resolveBase,
  verifyFilled,
} from "../skills/shipflow/scripts/fill-cycle.ts";

const SHIPFLOW = join(import.meta.dir, "..", "skills", "shipflow");
const SCRIPTS = join(SHIPFLOW, "scripts");
const TEMPLATE_PATH = join(SHIPFLOW, "task-cycle-template.dwf.ts");
const FIXTURE = join(SCRIPTS, "fixtures", "valid");
const BUN = process.execPath;
const SPECIALIST = "z-svelte-engineer";
const PROJECT_TITLE = "site-e2e";
const STATUS_FIELD = "PVTSSF_status";
const STATUS_OPTIONS = ["Backlog", "Ready", "In progress", "In review", "Blocked", "Done"];
const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "autopilot e2e",
  GIT_AUTHOR_EMAIL: "e2e@example.invalid",
  GIT_COMMITTER_NAME: "autopilot e2e",
  GIT_COMMITTER_EMAIL: "e2e@example.invalid",
};

// The charter the checker runs under: the template shape of templates/autopilot.yaml, with the
// repository and gates made runnable here. prd_issue 0 until the PRD issue exists (publication).
const CHARTER_TEXT = `version: 1
project: ${PROJECT_TITLE}
repo: acme/site
base_branch: main
reference: []
parity_target: {structure: true, layout: true, interactions: true, brand: false, content: false}
stack: auto
milestones: [M0, M1, M2, M3]
prd_approval: human
review_window_hours: 24
task_breakdown: upfront
limits:
  max_parallel_lanes: 3
  task_attempts: 4
  task_timeout_minutes: 90
  wall_clock_days: 14
  page_cap: 400
tiers:
  first_attempt: pro
authority:
  push: ["refs/heads/wf/*"]
  merge: {method: squash, via: [merge_queue, merge_train], requires: [ai-review]}
  github: [issues, sub_issues, dependencies, labels, pull_requests, checks]
  deploy: preview_only
  network_allow: [github.com, api.github.com]
identities: {builder: {login: "${LOGIN}"}, reviewer: null}
dispatcher: {instance: e2e-1, prd_issue: 0}
capabilities: {}
gates:
  l1:
    - {name: build, tool: sh, args: ["-c", "exit 0"], timeout_minutes: 1}
  unit:
    - {name: unit, tool: sh, args: ["-c", "exit 0"], timeout_minutes: 1}
  acceptance: {name: acceptance, tool: sh, args: ["-c", "exit 0"], timeout_minutes: 1}
  parity: {name: parity, tool: sh, args: ["-c", "exit 0"], timeout_minutes: 1}
preview: null
areas:
  - {prefix: "src/", specialist: ${SPECIALIST}, ui: false}
security_paths: ["server/auth/", "package.json", "bun.lock"]
protected:
  - {prefix: "prd/", agents: "^(prd|plan)-", branches: "^wf/prd-v[0-9]+$"}
  - {prefix: "tests/acceptance/", agents: "^test-author-", branches: "^wf/test-"}
  - {prefix: "tests/parity/", agents: "^test-author-", branches: "^wf/test-"}
  - {prefix: "discovery/", agents: "^recon-", branches: "^wf/recon-"}
  - {prefix: ".github/", agents: "^$", branches: "^$"}
  - {prefix: "autopilot.yaml", agents: "^$", branches: "^$"}
hooks:
  log: .shipflow/policy.log
  deny_agent_gh_writes: true
  auto_approve_tools: []
pause: "label autopilot:paused on the PRD issue"
notify: [github-issue]
`;

// A stub specialist: valid frontmatter, a supported model, and a body the loader can read.
const PERSONA_TEXT = `---
name: ${SPECIALIST}
description: Stub specialist for the autopilot end-to-end checker.
model: account:zai-individual-coding-plan/GLM-5.3
tools: [read, write, edit]
---
You implement one lane of the autopilot task cycle inside the lane worktree. This stub exists only so that the checker can load a persona.
`;

// Areas must hold tracked files, so that an untracked file inside them is listed by name in git status.
const BASE_FILES = {
  "src/app/README.md": "Application area folder for the checker.\n",
  "src/tooling/README.md": "Tooling area folder for the checker.\n",
  "src/theme/README.md": "Theme area folder for the checker.\n",
};

// Every check is one assertion; the count is printed on success.
const tally = { count: 0 };
function expectEqual(label, actual, expected) {
  assert.deepEqual(actual, expected, label);
  tally.count += 1;
}
function expectTrue(label, condition) {
  assert.ok(condition, label);
  tally.count += 1;
}

function run(cmd, args, env = process.env) {
  const proc = Bun.spawnSync({ cmd: [cmd, ...args], env, stdout: "pipe", stderr: "pipe" });
  return { exitCode: proc.exitCode, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() };
}

function git(args) {
  return run("git", args, GIT_ENV);
}

function gitOk(args) {
  const result = git(args);
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

// Creates a temporary repository directory, a bare origin, the PRD fixture and the charter,
// and pushes the base commit (main) to origin. Returns the paths.
function buildSite(scratch) {
  const origin = join(scratch, "origin.git");
  const root = join(scratch, "site");
  gitOk(["init", "-q", "--bare", "-b", "main", origin]);
  mkdirSync(root, { recursive: true });
  cpSync(FIXTURE, root, { recursive: true });
  for (const [path, text] of Object.entries(BASE_FILES)) {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  writeFileSync(join(root, "autopilot.yaml"), CHARTER_TEXT);
  gitOk(["-C", root, "init", "-q", "-b", "main"]);
  gitOk(["-C", root, "add", "-A"]);
  gitOk(["-C", root, "commit", "-q", "-m", "base: PRD fixture, charter and area folders"]);
  gitOk(["-C", root, "remote", "add", "origin", origin]);
  gitOk(["-C", root, "push", "-q", "origin", "main"]);
  const agents = join(root, ".zcode", "agents");
  mkdirSync(agents, { recursive: true });
  writeFileSync(join(agents, `${SPECIALIST}.md`), PERSONA_TEXT);
  return { origin, root };
}

// The charter as the dispatcher reads it. prdIssue is the PRD issue number the dispatcher knows:
// 0 before publication, the published number afterwards.
function charterAt(root, prdIssue) {
  const loaded = loadCharter(join(root, "autopilot.yaml"));
  if (loaded.charter === null) throw new Error(`charter: ${loaded.errors.join("; ")}`);
  return { ...loaded.charter, dispatcher: { ...loaded.charter.dispatcher, prd_issue: prdIssue } };
}

function newFake() {
  const fake = new FakeGitHub();
  const options = STATUS_OPTIONS.map((name, index) => ({ id: `opt${index}`, name }));
  fake.addProject(OWNER, PROJECT_TITLE, [{ id: STATUS_FIELD, name: "Status", options }]);
  return fake;
}

function kitConfig(state, charter, dryRun) {
  return {
    repo: charter.repo,
    login: charter.identities.builder.login,
    instance: charter.dispatcher.instance,
    prdIssue: charter.dispatcher.prd_issue,
    dryRun,
    claimTtlSeconds: 2 * charter.limits.task_timeout_minutes * 60,
    attemptCap: charter.limits.task_attempts,
    requiredChecks: [...charter.authority.merge.requires],
    writeRoot: join(state.root, ".zflow", "kit"),
    pollSeconds: 1,
    maxPolls: 3,
    assignee: "",
  };
}

function makeKit(world, state, charter, dryRun) {
  mkdirSync(join(state.root, ".zflow", "kit"), { recursive: true });
  return loadKit(world).makeGithubKit(kitConfig(state, charter, dryRun));
}

// The persona resolver of fill-cycle: the project's agents folder first, then the user's.
function personaResolver(root) {
  return (name) => {
    for (const path of [join(root, ".zcode", "agents", `${name}.md`), expandHome(`~/.zcode/agents/${name}.md`)]) {
      if (existsSync(path)) return path;
    }
    return null;
  };
}

// Git argv that the template must never run, by the spec's rules: no destructive reset, clean,
// checkout of paths, branch deletion, force of any kind, or a push outside refs/heads/wf/*.
function forbiddenGit(args) {
  const rest = args[0] === "-C" ? args.slice(2) : args;
  const [sub, ...flags] = rest;
  if (sub === "clean") return "clean";
  if (sub === "reset" && flags.includes("--hard")) return "reset --hard";
  if (sub === "checkout" && flags.includes("--")) return "checkout --";
  if (sub === "branch" && flags.some((arg) => arg === "-D" || arg === "--delete")) return "branch -D";
  if (flags.some((arg) => arg === "-f" || arg === "--force" || arg.startsWith("--force-"))) return "--force";
  if (sub === "push") {
    const specs = flags.filter((arg) => arg !== "origin" && !arg.startsWith("-"));
    if (specs.length === 0) return "push without an explicit refspec";
    for (const spec of specs) {
      if (spec.startsWith("+")) return "forced refspec";
      const [src, dst = src] = spec.split(":");
      const wf = /^refs\/heads\/wf\/[^:]+$/;
      if (!wf.test(src) || !wf.test(dst)) return `push refspec outside refs/heads/wf/*: ${spec}`;
    }
  }
  return null;
}

// The branch a push names, when the call is a push of a wf/* branch.
function pushedBranch(rest) {
  if (rest[0] !== "push") return null;
  const spec = rest.find((arg) => arg.includes(":"));
  if (spec === undefined) return null;
  return spec.split(":")[1].replace(/^refs\/heads\//, "");
}

// Runs one git call. A successful push of a wf/* branch is mirrored into the fake, as the lane's
// pull request head, so that prFacts, postStatus and mergeTrain see the pushed commit.
function gitRun(fake, state, args) {
  state.gitLog.push(args.join(" "));
  const reason = forbiddenGit(args);
  if (reason !== null) {
    state.forbidden.push(`${reason} (git ${args.join(" ")})`);
    return { exitCode: 1, stdout: "", stderr: `checker refuses: ${reason}` };
  }
  const result = git(args);
  const rest = args[0] === "-C" ? args.slice(2) : args;
  const branch = pushedBranch(rest);
  if (branch !== null && result.exitCode === 0) {
    const dir = args[0] === "-C" ? args[1] : state.root;
    const sha = gitOk(["-C", dir, "rev-parse", `refs/heads/${branch}`]);
    fake.setBranch(branch, sha);
    fake.addCommit(sha, [state.baseSha]);
  }
  return result;
}

// GitHub closes the issue named by "Closes #N" when the pull request merges. The fake does not model
// that keyword, so the checker closes the lane's issue here, from the pull request head branch.
async function ghRun(fake, state, args) {
  const result = await fake.run("gh", args);
  if (result.exitCode === 0 && args[0] === "pr" && args[1] === "merge") {
    const head = fake.prs.get(Number(args[2]))?.head;
    const issue = state.issueByBranch.get(head);
    if (issue !== undefined) fake.issues.get(issue).state = "CLOSED";
  }
  return result;
}

// bun runs for real, except the two scripts the template starts from its lanes: the reviewer post
// (answered with exit 0; the lanes here use the commit status) and the preview (not started here).
function bunRun(args) {
  if (args[0] !== undefined && args[0].endsWith("/post-review.ts")) return { exitCode: 0, stdout: "", stderr: "" };
  if (args[0] !== undefined && args[0].endsWith("/preview.ts")) {
    return { exitCode: 1, stdout: "", stderr: "preview is not started by this checker" };
  }
  return run(BUN, args);
}

// The world the template and the kit see: gh and date and sleep through the fake, git and sh, cat,
// shasum and bun for real. Any other command is refused, as the template's command set requires.
function makeWorld(fake, state) {
  return {
    async run(cmd, args = []) {
      if (cmd === "gh") return ghRun(fake, state, args);
      if (cmd === "date" || cmd === "sleep") return fake.run(cmd, args);
      if (cmd === "bun") return bunRun(args);
      if (cmd === "git") return gitRun(fake, state, args);
      if (cmd === "sh" || cmd === "cat" || cmd === "shasum") return run(cmd, args);
      return { exitCode: 127, stdout: "", stderr: `checker does not run ${cmd}` };
    },
  };
}

// The lane's implementer. Contract answers are typed; the implementation round writes one file in
// the lane's area (or, in protected mode, a PRD file, which the purity check must flag).
function writeLaneChange(id, state) {
  const wt = join(state.worktreeRoot, id);
  if (state.mode === "protected") {
    appendFileSync(join(wt, "prd", "prd.md"), "\nAn edit made by the checker's implementer stub.\n");
    return;
  }
  mkdirSync(join(wt, dirname(state.feature.path)), { recursive: true });
  writeFileSync(join(wt, state.feature.path), `${state.feature.line}\n`);
}

async function answer(name, text, state) {
  state.asks.push(name);
  if (name.startsWith("contract-")) return { accepted: true, problems: [] };
  if (name.startsWith("judge-")) return { findings: [] };
  if (name.startsWith("trace-")) {
    return { rows: [{ criterion: state.satisfies[0], path: state.feature.path, quote: state.feature.line }] };
  }
  if (name.startsWith("implement-")) {
    if (text.includes("State your plan as JSON")) {
      const criteria = state.satisfies.map((id) => ({ id, how: `implemented in ${state.feature.path}` }));
      return { criteria, tests: [], files: [state.feature.path], risks: [] };
    }
    if (text.startsWith("Implement the contract you stated")) {
      writeLaneChange(name.slice("implement-".length), state);
      return "implemented the contract";
    }
    return "no further change";
  }
  throw new Error(`checker stub has no answer for agent ${name}`);
}

// Evaluates the filled template with the facade globals injected: the same transpile-and-run
// route the template's smoke test used. The template is one function body, so top-level return works.
async function runTemplate(filled, world, state) {
  const wrapped = `export async function __script(world, agent, model, phase, future, artifact, report, log, files, git) {\n${filled}\n}\n`;
  const transpiler = new Bun.Transpiler({ loader: "ts", target: "bun" });
  const js = transpiler.transformSync(wrapped).replace(/^export\s+/gm, "");
  const script = new Function(`${js}\nreturn __script;`)();
  const artifact = {
    markdown: async (id, content) => {
      state.artifacts.push({ id, content });
      return { id, version: 1 };
    },
    file: async () => {
      throw new Error("the template publishes markdown only");
    },
    chart() {},
    table() {},
    metrics() {},
    board() {},
  };
  const agent = (name) => ({ ask: (instructions) => answer(String(name), String(instructions), state) });
  return script(
    world,
    agent,
    (id) => id,
    (name) => state.phases.push(name),
    (body) => body(),
    artifact,
    () => {},
    (message) => state.logs.push(String(message)),
    {},
    {},
  );
}

// Reads the issues the way the dispatcher's fill does, through the kit given the world.
async function readFacts(kit, numbers) {
  const facts = [];
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

// The fill core of fill-cycle.ts main(): facts, base index, lanes, CycleConfig, filled text, verify.
// The kit reads through the given world, so the checker's fake answers every read.
async function fillFor(world, state, charter, issues, options) {
  const kit = makeKit(world, state, charter, true);
  const facts = await readFacts(kit, issues);
  const index = await loadBaseIndex(state.root, state.baseSha);
  const settings = effectiveSettings(charter, state.root);
  const built = buildLanes(
    facts,
    { charter, settings, index, promote: [], persona: personaResolver(state.root) },
    loadKit(world).kitParseMachineBlock,
  );
  const config = buildConfig({
    root: state.root,
    charter,
    baseSha: state.baseSha,
    slug: options.slug,
    flags: { dryRun: false, shadow: options.shadow === true, supervised: false, requireApproval: false },
    release: [],
    promote: [],
    lanes: built.lanes.map((item) => item.lane),
    securityPersona: "",
    qaPersona: "",
    scriptsDir: SCRIPTS,
  });
  const template = readFileSync(TEMPLATE_PATH, "utf8");
  const filled = fillTemplate(template, config);
  return {
    lanes: built.lanes,
    refused: built.refused,
    config,
    filled,
    verify: verifyFilled(template, filled),
  };
}

// The dispatcher's snapshot and decision: buildDecideInput and decide over the kit snapshot.
async function decideFor(world, state, charter, mode) {
  const kit = makeKit(world, state, charter, true);
  const snap = await kit.snapshot({ withPromotable: true });
  if (!snap.ok) throw new Error(`snapshot failed: ${snap.error}`);
  const model = parsePrd(readProject(state.root));
  return decide(buildDecideInput(snap, charter, model, { mode, activeRun: false, auditDue: false }));
}

// Fills one issue, checks the fill, and runs the template on it. Returns the lane result and the
// full template result. The lane's pull request head is tied to its issue for the close emulation.
async function runLane(world, state, charter, { issue, mode, shadow, slug, feature }) {
  const fill = await fillFor(world, state, charter, [issue], { shadow, slug });
  if (fill.lanes.length !== 1) throw new Error(`fill ${slug}: expected one lane, refused ${JSON.stringify(fill.refused)}`);
  const lane = fill.lanes[0].lane;
  state.issueByBranch.set(lane.branch, lane.issue);
  state.worktreeRoot = fill.config.worktreeRoot;
  state.mode = mode;
  state.feature = feature;
  state.satisfies = lane.satisfies;
  mkdirSync(fill.config.worktreeRoot, { recursive: true });
  mkdirSync(fill.config.evidenceDir, { recursive: true });
  const result = await runTemplate(fill.filled, world, state);
  return { fill, lane, laneResult: result.lanes[0], result };
}

// Item 1, plan only: prd-lint at s2, s3 and s5 and with --emit-index, on a copy of the fixture. A gh
// shim on PATH records any gh call; the repository must gain no commit and no branch.
function planOnlyChecks(scratch) {
  const repo = join(scratch, "plan");
  mkdirSync(repo, { recursive: true });
  cpSync(FIXTURE, repo, { recursive: true });
  gitOk(["-C", repo, "init", "-q", "-b", "main"]);
  gitOk(["-C", repo, "add", "-A"]);
  gitOk(["-C", repo, "commit", "-q", "-m", "fixture"]);
  const headBefore = gitOk(["-C", repo, "rev-parse", "HEAD"]);
  const refsBefore = gitOk(["-C", repo, "for-each-ref", "--format=%(refname)", "refs/heads"]);
  const shim = join(scratch, "shim");
  const ghLog = join(scratch, "gh-calls.log");
  mkdirSync(shim, { recursive: true });
  writeFileSync(join(shim, "gh"), `#!/bin/sh\necho "$*" >> "${ghLog}"\nexit 1\n`);
  chmodSync(join(shim, "gh"), 0o755);
  const env = { ...process.env, PATH: `${shim}:${process.env.PATH ?? ""}` };
  const lint = (args) => run(BUN, [join(SCRIPTS, "prd-lint.ts"), "--repo", repo, ...args], env);
  for (const stage of ["s2", "s3", "s5"]) {
    expectEqual(`plan: prd-lint --stage ${stage} exits 0`, lint(["--stage", stage]).exitCode, 0);
  }
  expectEqual("plan: prd-lint --emit-index exits 0", lint(["--stage", "s5", "--emit-index"]).exitCode, 0);
  expectTrue("plan: the emitted index exists", existsSync(join(repo, "prd", "index.json")));
  expectEqual("plan: zero gh calls", existsSync(ghLog) ? readFileSync(ghLog, "utf8") : "", "");
  expectEqual("plan: no new commit", gitOk(["-C", repo, "rev-parse", "HEAD"]), headBefore);
  expectEqual("plan: no new branch", gitOk(["-C", repo, "for-each-ref", "--format=%(refname)", "refs/heads"]), refsBefore);
}

// Items 4 and 5 before publication: an empty repository dispatches a kickoff, implementation with
// nothing published needs a plan, and fill refuses an issue that was never published.
async function beforePublicationChecks(state, charterPre) {
  const fake = newFake();
  const world = makeWorld(fake, state);
  const kickoff = await decideFor(world, state, charterPre, "dispatch");
  expectEqual("dispatch on an empty repository returns kickoff", kickoff.action, "kickoff");
  const plan = await decideFor(world, state, charterPre, "implement");
  expectEqual("implement with nothing published returns needs-plan", plan.action, "needs-plan");
  const refused = await fillFor(world, state, charterPre, [2], { slug: "unpublished" });
  expectEqual("fill refuses an unpublished issue", { lanes: refused.lanes.length, refused: refused.refused.length }, { lanes: 0, refused: 1 });
  expectTrue("the refusal names the unreadable issue", refused.refused[0].reason.startsWith("view failed"));
  const planned = newFake();
  planned.addIssue(1, { title: "PRD", labels: ["kickoff:done"] });
  const withoutTasks = await decideFor(makeWorld(planned, state), state, charterAt(state.root, 1), "implement");
  expectEqual("implement with a PRD but no published tasks never returns an implementation action", withoutTasks.action, "needs-plan");
  expectEqual("dispatch reads took no GitHub mutation", planned.mutations.length, 0);
}

// Item 2, publish only: reconcile through planReconcile, readExisting and applyReconcile, then the
// project. Only issues, labels, milestones, links, blockers and project items may change.
async function publishChecks(state, fake, charterPre) {
  const world = makeWorld(fake, state);
  const kit = makeKit(world, state, charterPre, false);
  const model = parsePrd(readProject(state.root));
  const index = buildIndex(model);
  const milestones = model.root?.milestones ?? [];
  const before = await readExisting(kit);
  expectEqual("publish starts from an empty repository", before, []);
  const ops = planReconcile(index, before, { prdIssue: 0, includeTasks: true, milestones });
  // The kit fixes its PRD issue at construction; the kickoff hand-off rebuilds it with the new number.
  const kitFor = (prdIssue) => makeKit(world, state, charterAt(state.root, prdIssue), false);
  const applied = await applyReconcile(ops, index, kit, { prdIssue: 0, model, existing: before, paceMs: 0, kitFor });
  expectEqual("publish applies every reconcile op", applied.results.filter((r) => r.outcome === "failed").map((r) => `${r.op} ${r.id}`), []);
  const numbers = applied.numbers;
  state.numbers = numbers;
  const members = projectMembers(index, numbers, true);
  const project = await publishProject(kit, charterPre.project, members, projectStates(index, numbers, new Map(), true));
  expectTrue(`publish verifies the project (${project.reason})`, project.ok);

  const after = await readExisting(kit);
  const byId = new Map(after.map((issue) => [issue.block?.id, issue]));
  const active = index.items.filter((item) => item.status === "active");
  const tasks = active.filter((item) => item.kind === "task");
  expectEqual("every active PRD item is one issue", active.filter((item) => !byId.has(item.id)).map((item) => item.id), []);
  const parentMismatch = active
    .filter((item) => item.kind !== "epic" && item.parent !== "" && byId.get(item.id)?.parent !== numbers.get(item.parent))
    .map((item) => item.id);
  expectEqual("every non-epic item sits under its parent issue", parentMismatch, []);
  const blockerMismatch = tasks.filter((item) => {
    const want = item.dependsOn.map((id) => numbers.get(id)).filter((n) => n !== undefined).sort((a, b) => a - b);
    return JSON.stringify(byId.get(item.id)?.blockedBy ?? []) !== JSON.stringify(want);
  }).map((item) => item.id);
  expectEqual("task blockers match depends_on", blockerMismatch, []);
  const notBacklog = tasks
    .filter((item) => JSON.stringify(stateLabels(fake, numbers.get(item.id))) !== JSON.stringify(["state:backlog"]))
    .map((item) => item.id);
  expectEqual("every task carries state:backlog", notBacklog, []);
  const projectItems = fake.projects.get(OWNER)[0].items;
  expectEqual(
    "the project holds every published issue",
    projectItems.map((item) => item.issue).sort((a, b) => a - b),
    [...members].sort((a, b) => a - b),
  );
  expectEqual("the project holds the PRD plus every active item", members.length, active.length + 1);
  const taskNumbers = new Set(tasks.map((item) => numbers.get(item.id)));
  const statusMismatch = projectItems
    .filter((item) => taskNumbers.has(item.issue) && item.fieldValues[STATUS_FIELD] !== "opt0")
    .map((item) => item.issue);
  expectEqual("every task's project Status is Backlog", statusMismatch, []);
  expectEqual("the PRD is issue 1 and carries kickoff:done", [numbers.get("PRD"), labelsOf(fake, 1).has("kickoff:done")], [1, true]);
  expectEqual("publish opened no PR and merged nothing", fake.executed.filter((argv) => argv[1] === "pr").length, 0);
  expectEqual("publish ran no git command, so no commit or push", state.gitLog.length, 0);
  const again = planReconcile(index, await readExisting(kit), { prdIssue: 1, includeTasks: true, milestones });
  expectEqual("a second plan is empty beyond ensure-labels and ensure-milestones", again.filter((op) => op.op !== "ensure-labels" && op.op !== "ensure-milestones"), []);
}

// Item 5, together: after publication the dispatcher returns task-cycles for the first M0 task.
async function afterPublicationChecks(state, fake, charterPost) {
  const decision = await decideFor(makeWorld(fake, state), state, charterPost, "dispatch");
  expectEqual(
    "dispatch after publication returns task-cycles for FND-1.1",
    { action: decision.action, issues: decision.issues },
    { action: "task-cycles", issues: [state.numbers.get("FND-1.1")] },
  );
}

// The single change each rehearsal lane makes, inside its area (protected mode writes prd/prd.md).
const MERGED_FEATURE = { path: "src/app/feature.ts", line: "export const feature = 1;" };
const SHADOW_FEATURE = { path: "src/tooling/feature.ts", line: "export const tooling = 2;" };
const PROTECTED_FEATURE = { path: "src/tooling/worker.ts", line: "export const worker = 3;" };

function newState(site) {
  return {
    root: site.root,
    origin: site.origin,
    baseSha: "",
    numbers: new Map(),
    gitLog: [],
    forbidden: [],
    issueByBranch: new Map(),
    worktreeRoot: "",
    mode: "feature",
    feature: null,
    satisfies: [],
    asks: [],
    phases: [],
    logs: [],
    artifacts: [],
  };
}

// The state label of every issue, for the before and after comparison.
function stateMap(fake) {
  return new Map([...fake.issues.keys()].map((number) => [number, stateLabels(fake, number).join(",")]));
}

// Item 3, implement only, from the published fake state with a fresh kit: promote the unblocked M0
// task, let the implement decision name it, and take it through the template to merged (section 7
// item 8). Then the shadow and protected-path rehearsals, and the needs-publish refusal (item 4).
async function implementChecks(state, fake, charterPost) {
  const world = makeWorld(fake, state);
  const n = (id) => state.numbers.get(id);
  fake.setBranch("main", state.baseSha);
  fake.addCommit(state.baseSha, []);
  const kit = makeKit(world, state, charterPost, false);
  const promoted = await kit.promoteReady({ milestones: ["M0"] });
  expectEqual("promoteReady marks only FND-1.1 ready (no open blocker)", promoted.promoted, [n("FND-1.1")]);
  const decision = await decideFor(world, state, charterPost, "implement");
  expectEqual(
    "implement decision names the ready M0 task",
    { action: decision.action, issues: decision.issues },
    { action: "task-cycles", issues: [n("FND-1.1")] },
  );

  const issuesBefore = fake.issues.size;
  const statesBefore = stateMap(fake);
  const prdBefore = gitOk(["--git-dir", state.origin, "rev-parse", "refs/heads/main:prd"]);
  const merged = await runLane(world, state, charterPost, {
    issue: n("FND-1.1"), mode: "feature", shadow: false, slug: "merged-lane", feature: MERGED_FEATURE,
  });
  const lane = merged.laneResult;
  expectEqual("merged lane: outcome is merged", lane.outcome, "merged");
  expectEqual("merged lane: the issue ends state:done", stateLabels(fake, n("FND-1.1")), ["state:done"]);
  const statesAfter = stateMap(fake);
  expectEqual(
    "implement only: only the lane's issue changed state",
    [...statesAfter.keys()].filter((number) => statesAfter.get(number) !== statesBefore.get(number)),
    [n("FND-1.1")],
  );
  expectEqual("implement only: no issue was created", fake.issues.size, issuesBefore);
  const pushed = gitOk(["--git-dir", state.origin, "rev-parse", `refs/heads/${lane.branch}`]);
  expectEqual("the lane's commit is on wf/FND-1.1 in origin", pushed, lane.reviewedSha);
  expectEqual("the lane's commit sits directly on the base commit", gitOk(["--git-dir", state.origin, "rev-parse", `refs/heads/${lane.branch}^`]), state.baseSha);
  const pr = fake.prs.get(lane.pr);
  expectEqual("the PR head is the pushed commit", pr?.headSha, pushed);
  expectEqual("the merge used --match-head-commit with the pushed sha", fake.executed.filter(isPrMerge).map((argv) => argPair(argv, "--match-head-commit", pushed)), [true]);
  expectEqual("the PR is merged with the reported merge commit", [pr?.state, lane.mergeSha], ["MERGED", pr?.mergeCommit]);
  expectTrue("the ai-review status is posted on the reviewed commit", pr.rollup.some((entry) => entry.context === "ai-review" && entry.state === "SUCCESS"));
  expectEqual("the merged lane reports no findings", lane.findings, []);
  expectEqual("no forbidden git argv ran in the template", state.forbidden, []);
  expectEqual("origin main's prd tree is unchanged", gitOk(["--git-dir", state.origin, "rev-parse", "refs/heads/main:prd"]), prdBefore);

  // Expected from the PRD itself: M0 tasks whose only dependency is FND-1.1, which has now closed.
  const index = buildIndex(parsePrd(readProject(state.root)));
  const dependants = index.items
    .filter((item) => item.kind === "task" && item.milestone === "M0" && item.id !== "FND-1.1")
    .filter((item) => item.dependsOn.length > 0 && item.dependsOn.every((id) => id === "FND-1.1"))
    .map((item) => n(item.id))
    .sort((a, b) => a - b);
  const unblocked = await kit.promoteReady({ milestones: ["M0"] });
  expectEqual(
    "once FND-1.1 is closed, every M0 task whose only dependency it was becomes ready",
    [...unblocked.promoted].sort((a, b) => a - b),
    dependants,
  );
  expectTrue("the expected dependants include FND-1.2, FND-1.3 and FND-2.1", [n("FND-1.2"), n("FND-1.3"), n("FND-2.1")].every((number) => dependants.includes(number)));

  const tampered = n("FND-2.1");
  const original = fake.issues.get(tampered).body;
  expectTrue("the task body carries a prd_hash line", /prd_hash: [0-9a-f]+/.test(original));
  fake.issues.get(tampered).body = original.replace(/prd_hash: [0-9a-f]+/, `prd_hash: ${itemHash("a task plan changed after publication")}`);
  const stale = await fillFor(world, state, charterPost, [tampered], { slug: "stale-plan" });
  fake.issues.get(tampered).body = original;
  expectEqual("fill refuses a task whose prd_hash differs from the base PRD", stale.refused.map((item) => item.reason), ["needs-publish FND-2.1 plan changed since publication"]);

  const mergesBeforeShadow = fake.executed.filter(isPrMerge).length;
  const shadow = await runLane(world, state, charterPost, {
    issue: n("FND-1.2"), mode: "feature", shadow: true, slug: "shadow-lane", feature: SHADOW_FEATURE,
  });
  const shadowPr = fake.prs.get(shadow.laneResult.pr);
  expectEqual("shadow lane: outcome is shadow", shadow.laneResult.outcome, "shadow");
  expectEqual("shadow lane: the issue waits in state:review", stateLabels(fake, n("FND-1.2")), ["state:review"]);
  expectEqual(
    "shadow lane: the PR is open on wf/FND-1.2 with the ai-review status",
    [shadowPr?.state, shadowPr?.head, shadowPr?.rollup.some((entry) => entry.context === "ai-review")],
    ["OPEN", "wf/FND-1.2", true],
  );
  expectEqual("shadow lane: no merge argv ran", fake.executed.filter(isPrMerge).length, mergesBeforeShadow);

  const protectedRun = await runLane(world, state, charterPost, {
    issue: n("FND-1.3"), mode: "protected", shadow: false, slug: "protected-lane", feature: PROTECTED_FEATURE,
  });
  const failed = protectedRun.laneResult;
  expectEqual("protected lane: outcome is failed", failed.outcome, "failed");
  expectTrue(
    "protected lane: a finding names prd/prd.md as a protected path changed",
    failed.findings.some((finding) => finding.where === "prd/prd.md" && finding.what === "protected path changed"),
  );
  expectEqual("protected lane: the issue is released to state:ready", stateLabels(fake, n("FND-1.3")), ["state:ready"]);
  expectEqual("protected lane: nothing was pushed", gitOk(["--git-dir", state.origin, "for-each-ref", "--format=%(refname)", "refs/heads/wf/FND-1.3"]), "");
  expectEqual("protected lane: origin main's prd tree is unchanged", gitOk(["--git-dir", state.origin, "rev-parse", "refs/heads/main:prd"]), prdBefore);
  expectEqual("protected lane: no PR was opened", [...fake.prs.values()].some((item) => item.head === "wf/FND-1.3"), false);
  expectEqual("no forbidden git argv ran in any rehearsal", state.forbidden, []);
}

async function main() {
  const scratch = mkdtempSync(join(tmpdir(), "autopilot-e2e-"));
  try {
    planOnlyChecks(scratch);
    const site = buildSite(scratch);
    const charterPre = charterAt(site.root, 0);
    expectEqual("charter parses with no errors", loadCharter(join(site.root, "autopilot.yaml")).errors, []);
    const state = newState(site);
    state.baseSha = await resolveBase(site.root, "main");
    await beforePublicationChecks(state, charterPre);
    const fake = newFake();
    await publishChecks(state, fake, charterPre);
    const charterPost = charterAt(site.root, 1);
    await afterPublicationChecks(state, fake, charterPost);
    await implementChecks(state, fake, charterPost);
    console.log(`Autopilot end-to-end validation passed: ${tally.count} checks.`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
