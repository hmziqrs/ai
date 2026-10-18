// Autopilot component checker. Covers the charter, run-time detection, the hook policy, the gate
// runner, the review poster, the preview server, fill-cycle, setup (offline and against the fake
// GitHub with a real temporary repository and bare origin), template drift, and an optional type-check.
// Run: bun harness/zcode/scripts/check-autopilot.mjs
// The type-check runs when TSC is set (the path to tsc.js or its bin shim); otherwise it is skipped.
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { loadCharter, parseCharter } from "../skills/shipflow/scripts/lib/charter.ts";
import { detectAreas, detectGates, detectPreview, effectiveSettings } from "../skills/shipflow/scripts/lib/detect.ts";
import { loadKit } from "../skills/shipflow/scripts/lib/kit.ts";
import { buildIndex, parsePrd, readProject } from "../skills/shipflow/scripts/lib/prd.ts";
import { evaluate } from "../skills/shipflow/hooks/policy.ts";
import { buildJwt, capSummary, dryRunPlan, postReview } from "../skills/shipflow/scripts/post-review.ts";
import { protectedFindings } from "../skills/shipflow/scripts/run-gate.ts";
import { buildConfig, buildLanes, fillTemplate, loadBaseIndex, parseArgs as parseFillArgs, planHashCheck, resolveBase, runGit, verifyFilled } from "../skills/shipflow/scripts/fill-cycle.ts";
import { appendIgnores, ciWorkflowFor, generateCharter, mergeZcodeConfig, parseArgs as parseSetupArgs, realGit, runSetup } from "../skills/shipflow/scripts/setup.ts";
import { FakeGitHub, NOW, REPO, REQUIRED } from "./lib/fake-github.mjs";

const skill = resolve(import.meta.dirname, "../skills/shipflow");
const scriptsDir = join(skill, "scripts");
const hooksPolicy = join(skill, "hooks/policy.ts");
const runGateCli = join(scriptsDir, "run-gate.ts");
const previewCli = join(scriptsDir, "preview.ts");
const fillCli = join(scriptsDir, "fill-cycle.ts");
const postReviewCli = join(scriptsDir, "post-review.ts");
const templateCharter = join(skill, "templates/autopilot.yaml");
const templateFile = join(skill, "task-cycle-template.dwf.ts");
const hooksJsonFile = join(skill, "hooks/hooks.json");
const kitCanonical = join(skill, "github-kit.dwf.ts");
const personaCanonical = resolve(import.meta.dirname, "../skills/z-workflow/persona-kit.dwf.ts");
const fixtureRoot = join(scriptsDir, "fixtures/valid");
const skillDocument = "/Applications/ZCode.app/Contents/Resources/glm/packages/bundled-skills/skills/dynamic-workflows/SKILL.md";

// Git identity for the temporary repositories this checker creates and for the setup commits they receive.
Object.assign(process.env, {
  GIT_AUTHOR_NAME: "autopilot check", GIT_AUTHOR_EMAIL: "check@example.invalid",
  GIT_COMMITTER_NAME: "autopilot check", GIT_COMMITTER_EMAIL: "check@example.invalid",
});

const decoder = new TextDecoder();
const text = (bytes) => decoder.decode(bytes);
const readText = (path) => readFileSync(path, "utf8");
const jsonOf = (value) => JSON.stringify(value);

// Runs a command and returns its exit code and output as text. Never throws on a non-zero exit.
function sync(cmd, options = {}) {
  const run = Bun.spawnSync(cmd, { stdout: "pipe", stderr: "pipe", ...options });
  return { code: run.exitCode, out: text(run.stdout), err: text(run.stderr) };
}

// A Bun CLI from this checker, with the flags the CLI tests use everywhere.
function bunCli(script, args, options = {}) {
  return sync([process.execPath, "--no-env-file", "--no-config", script, ...args], options);
}

// A hook process, started exactly as the merged .zcode/config.json starts it.
function hookProcess(project, stdin) {
  return sync(
    [process.execPath, "--no-env-file", "--config=/dev/null", hooksPolicy, "--project", project],
    { cwd: project, stdin: Buffer.from(stdin) },
  );
}

function git(cwd, args) {
  return sync(["git", "-C", cwd, ...args]);
}

function gitOk(cwd, args) {
  const run = git(cwd, args);
  assert.equal(run.code, 0, `git ${args.join(" ")} in ${cwd}: ${run.err.trim()}`);
  return run.out;
}

const tempRoots = [];
function tempDir(label) {
  const dir = mkdtempSync(join(tmpdir(), `autopilot-${label}-`));
  tempRoots.push(dir);
  return dir;
}

function writeTree(root, files) {
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

// A repository with one commit on main, pushed to a bare origin that lives next to it.
function repoWithOrigin(label, files) {
  const base = tempDir(label);
  const origin = join(base, "origin.git");
  const work = join(base, "work");
  gitOk(base, ["init", "--bare", "-q", "-b", "main", origin]);
  mkdirSync(work, { recursive: true });
  gitOk(work, ["init", "-q", "-b", "main"]);
  gitOk(work, ["config", "commit.gpgsign", "false"]);
  writeTree(work, files);
  gitOk(work, ["add", "-A"]);
  gitOk(work, ["commit", "-q", "-m", "initial"]);
  gitOk(work, ["remote", "add", "origin", origin]);
  gitOk(work, ["push", "-q", "origin", "main"]);
  return { base, origin, work };
}

function charterText(edit = null) {
  const template = readText(templateCharter);
  if (edit === null) return template;
  const { find, replace } = edit;
  assert.ok(template.includes(find), `charter template lacks the mutation target ${find}`);
  return template.replace(find, replace);
}

function loadedTemplate() {
  const loaded = parseCharter(readText(templateCharter));
  assert.deepEqual(loaded.errors, []);
  return loaded.charter;
}

// Everything a check failure needs: each failed check is recorded, the run continues, and the
// summary lists every failure with its name (which carries the spec section).
let checks = 0;
const failures = [];
async function check(name, run) {
  try {
    await run();
    checks += 1;
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const TINY_SERVER = [
  'Bun.serve({ port: Number(process.env.PORT), fetch: () => new Response("preview ok") });',
  "",
].join("\n");

const FREE_PORT_PROBE = () => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response("") });
  const port = probe.port;
  probe.stop(true);
  return port;
};


// 1. Charter (spec section 1 and the D17 charter values).
async function charterChecks() {
  await check("charter (spec 1, D17): the template parses clean with reviewer null, gates {}, preview null, areas []", () => {
    const loaded = parseCharter(readText(templateCharter));
    assert.deepEqual(loaded.errors, []);
    const c = loaded.charter;
    assert.equal(c.identities.reviewer, null);
    assert.deepEqual(c.gates, {});
    assert.equal(c.preview, null);
    assert.deepEqual(c.areas, []);
    assert.deepEqual(c.capabilities, {});
  });

  const mutations = [
    { key: "repo", find: "repo: acme/llm-board", replace: "repo: acme" },
    { key: "prd_approval", find: "prd_approval: human", replace: "prd_approval: always" },
    { key: "authority.merge.requires", find: "requires: [ci, acceptance, parity, ai-review]", replace: "requires: []" },
    { key: "areas[0].specialist", find: "areas: []", replace: 'areas: [{prefix: "src/", specialist: "Svelte", ui: true}]' },
    { key: "protected[0].agents", find: 'agents: "^(prd|plan)-"', replace: 'agents: "^(prd|plan-"' },
    { key: "typo_key", find: "notify: [github-issue]", replace: "notify: [github-issue]\ntypo_key: 1" },
    { key: "limits.max_parallel_lanes", find: "max_parallel_lanes: 3", replace: "max_parallel_lanes: -3" },
    { key: "tiers.first_attempt", find: "first_attempt: pro", replace: "first_attempt: ultra" },
    { key: "gates.l1[0].tool", find: "gates: {}", replace: "gates: {l1: [{name: build, args: [run, build], timeout_minutes: 10}]}" },
    { key: "dispatcher.prd_issue", find: "prd_issue: 1}", replace: "prd_issue: -1}" },
  ];
  for (const mutation of mutations) {
    await check(`charter (spec 1): a bad ${mutation.key} is refused with an error that names it`, () => {
      const loaded = parseCharter(charterText(mutation));
      assert.equal(loaded.charter, null);
      assert.ok(
        loaded.errors.some((error) => error.startsWith(`${mutation.key}:`)),
        `errors were ${jsonOf(loaded.errors)}`,
      );
    });
  }

  await check("charter (spec 1, D17): a reviewer object without key_path still errors", () => {
    const loaded = parseCharter(charterText({
      find: "reviewer: null", replace: 'reviewer: {app_id: "1234567", installation_id: "89012345"}',
    }));
    assert.ok(loaded.errors.some((error) => error.startsWith("identities.reviewer.key_path:")), jsonOf(loaded.errors));
  });
  await check("charter (spec 1, D17): a complete reviewer object parses clean", () => {
    const loaded = parseCharter(charterText({
      find: "reviewer: null",
      replace: 'reviewer: {app_id: "1234567", installation_id: "89012345", key_path: "~/k.pem"}',
    }));
    assert.deepEqual(loaded.errors, []);
  });
}

// 2. Detection (D17 section 2): exact gates, preview and areas for four manifest shapes.
const gate = (name, args, tool = "bun", timeout = 15) => ({ name, tool, args, timeout_minutes: timeout });

function bunProjectDir() {
  const dir = tempDir("detect-bun");
  writeTree(dir, {
    "package.json": jsonOf({
      scripts: {
        build: "exit 0", check: "exit 0", lint: "exit 0", "lint:fix": "eslint --fix .", test: "exit 0",
        "test:e2e": "exit 0", "test:parity": "playwright test --update-snapshots",
      },
    }),
    "bun.lock": "",
    "src/index.ts": "",
  });
  return dir;
}

function cargoProjectDir() {
  const dir = tempDir("detect-cargo");
  writeTree(dir, {
    "Cargo.toml": '[package]\nname = "api"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\naxum = "0.7"\n',
    "src/main.rs": "fn main() {}\n",
  });
  return dir;
}

function pythonProjectDir() {
  const dir = tempDir("detect-py");
  writeTree(dir, {
    "pyproject.toml":
      '[project]\nname = "svc"\nversion = "0.1.0"\ndependencies = ["fastapi>=0.110"]\n\n' +
      '[project.optional-dependencies]\ndev = ["pytest>=8", "pytest-cov", "ruff>=0.5"]\n\n' +
      "[tool.pytest.ini_options]\ntestpaths = [\"tests\"]\n",
    "src/svc/__init__.py": "",
  });
  return dir;
}

function svelteProjectDir() {
  const dir = tempDir("detect-svelte");
  writeTree(dir, {
    "package.json": jsonOf({
      scripts: { dev: "vite dev", build: "vite build", preview: "vite preview" },
      devDependencies: { svelte: "^5.0.0", "@sveltejs/kit": "^2.0.0" },
    }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
    "src/app.html": "",
    "server/api.ts": "",
  });
  return dir;
}

async function detectChecks() {
  const bun = bunProjectDir();
  await check("detect (D17 section 2): a bun project gives the exact l1, unit, acceptance and parity gates", () => {
    const g = detectGates(bun);
    assert.deepEqual(g.l1, [gate("build", ["run", "build"]), gate("check", ["run", "check"]), gate("lint", ["run", "lint"])]);
    assert.deepEqual(g.unit, [gate("test", ["run", "test"])]);
    assert.deepEqual(g.acceptance, gate("test:e2e", ["run", "test:e2e"], "bun", 30));
    assert.equal(g.parity, null);
  });
  await check("detect (D17 section 2): a bun project lists the mutating parity script as skipped and never runs it", () => {
    assert.deepEqual(detectGates(bun).sources, [
      "package.json:build", "package.json:check", "package.json:lint", "package.json:test",
      "package.json:test:e2e", "skipped mutating test:parity",
    ]);
  });
  await check("detect (D17 section 2): a bun project without a preview or dev script has no preview and no areas", () => {
    assert.equal(detectPreview(bun), null);
    assert.deepEqual(detectAreas(bun), []);
  });

  const cargo = cargoProjectDir();
  await check("detect (D17 section 2): a Cargo project with axum gives fmt, clippy and test gates", () => {
    const g = detectGates(cargo);
    assert.deepEqual(g.l1, [
      gate("fmt", ["fmt", "--check"], "cargo"),
      gate("clippy", ["clippy", "--all-targets", "--", "-D", "warnings"], "cargo"),
    ]);
    assert.deepEqual(g.unit, [gate("test", ["test"], "cargo")]);
    assert.deepEqual(g.sources, ["Cargo.toml:fmt", "Cargo.toml:clippy", "Cargo.toml:test"]);
    assert.equal(detectPreview(cargo), null);
  });
  await check("detect (D17 section 2): a Cargo project with axum gets one src/ area for z-axum-engineer, not ui", () => {
    assert.deepEqual(detectAreas(cargo), [
      { prefix: "src/", specialist: "z-axum-engineer", ui: false, source: "Cargo.toml:axum" },
    ]);
  });

  const python = pythonProjectDir();
  await check("detect (D17 section 2): a pyproject with pytest and ruff gives ruff and pytest gates", () => {
    const g = detectGates(python);
    assert.deepEqual(g.l1, [gate("ruff", ["check"], "ruff")]);
    assert.deepEqual(g.unit, [gate("pytest", [], "pytest")]);
    assert.deepEqual(g.sources, ["pyproject.toml:ruff", "pyproject.toml:pytest"]);
    assert.equal(g.acceptance, null);
    assert.equal(g.parity, null);
    assert.equal(detectPreview(python), null);
    assert.deepEqual(detectAreas(python), []);
  });

  const svelte = svelteProjectDir();
  await check("detect (D17 section 2): a svelte project with pnpm gives the build gate through pnpm", () => {
    const g = detectGates(svelte);
    assert.deepEqual(g.l1, [gate("build", ["run", "build"], "pnpm")]);
    assert.deepEqual(g.unit, []);
    assert.equal(g.acceptance, null);
    assert.equal(g.parity, null);
  });
  await check("detect (D17 section 2): a svelte project previews through pnpm and the preview script", () => {
    assert.deepEqual(detectPreview(svelte), { tool: "pnpm", args: ["run", "preview", "--", "--port"], timeout_minutes: 2 });
  });
  await check("detect (D17 section 2): a svelte project gets src/ as ui and server/ as not ui, both z-svelte-engineer", () => {
    assert.deepEqual(detectAreas(svelte), [
      { prefix: "src/", specialist: "z-svelte-engineer", ui: true, source: "package.json:svelte" },
      { prefix: "server/", specialist: "z-svelte-engineer", ui: false, source: "package.json:svelte" },
    ]);
  });

  const charter = loadedTemplate();
  await check("detect (D17 section 2): effectiveSettings on an unpinned charter equals detection", () => {
    const effective = effectiveSettings(charter, bun);
    const detected = detectGates(bun);
    assert.deepEqual(effective.gates.l1, detected.l1);
    assert.deepEqual(effective.gates.unit, detected.unit);
    assert.deepEqual(effective.gates.acceptance, detected.acceptance ? [detected.acceptance] : []);
    assert.deepEqual(effective.gates.parity, []);
    assert.deepEqual(effective.gates.sources, detected.sources);
    assert.equal(effective.preview, null);
    assert.deepEqual(effective.areas, []);
  });
  await check("detect (D17 section 2): a pinned charter value wins per group and detection fills the rest", () => {
    const pinnedGate = gate("pinned", ["run", "pinned-l1"]);
    const pinnedPreview = { tool: "node", args: ["serve.js"], timeout_minutes: 1 };
    const pinned = {
      ...charter,
      gates: { l1: [pinnedGate] },
      preview: pinnedPreview,
      areas: [{ prefix: "app/", specialist: "z-rust-engineer", ui: false }],
    };
    const effective = effectiveSettings(pinned, bun);
    assert.deepEqual(effective.gates.l1, [pinnedGate]);
    assert.deepEqual(effective.gates.sources.slice(0, 1), ["charter:gates.l1"]);
    assert.deepEqual(effective.gates.unit, detectGates(bun).unit);
    assert.deepEqual(effective.preview, pinnedPreview);
    assert.deepEqual(effective.areas, [{ prefix: "app/", specialist: "z-rust-engineer", ui: false, source: "charter" }]);
  });
}


// 3. Hook policy (spec section 6). Each row runs under both PreToolUse and PermissionRequest; the
// example charter has no auto-approved tools, so the expected verdict is the same for both events.
const HOOK_CASES = [
  // force-push
  { name: "force-push: --force on a push", tool: "Bash", input: { command: "git push --force origin wf/a" }, deny: "force-push" },
  { name: "force-push: -f after an assignment prefix", tool: "Bash", input: { command: "FOO=1 git push -f origin wf/a" }, deny: "force-push" },
  { name: "force-push: a plus-prefixed refspec", tool: "Bash", input: { command: "git push origin +wf/a:refs/heads/wf/a" }, deny: "force-push" },
  { name: "force-push: --force-with-lease", tool: "Bash", input: { command: "git push --force-with-lease origin HEAD:refs/heads/wf/a" }, deny: "force-push" },
  { name: "force-push: a delete refspec", tool: "Bash", input: { command: "git push origin :wf/a" }, deny: "force-push" },
  { name: "force-push: bundled short flags -fu", tool: "Bash", input: { command: "git push -fu origin HEAD:refs/heads/wf/a" }, deny: "force-push" },
  { name: "force-push: --mirror", tool: "Bash", input: { command: "git push --mirror origin" }, deny: "force-push" },
  // push-refspec
  { name: "push-refspec: a bare git push", tool: "Bash", input: { command: "git push" }, deny: "push-refspec" },
  { name: "push-refspec: a remote without a refspec", tool: "Bash", input: { command: "git push origin" }, deny: "push-refspec" },
  { name: "push-refspec: a push to main", tool: "Bash", input: { command: "git push origin main" }, deny: "push-refspec" },
  { name: "push-refspec: a workflow branch pushed onto main", tool: "Bash", input: { command: "git push origin wf/a:main" }, deny: "push-refspec" },
  { name: "push-refspec: git -C in front of a push to main", tool: "Bash", input: { command: "git -C x push origin main" }, deny: "push-refspec" },
  { name: "push-refspec: --tags", tool: "Bash", input: { command: "git push --tags origin" }, deny: "push-refspec" },
  // allowed pushes
  { name: "push allowed: HEAD to a full workflow ref", tool: "Bash", input: { command: "git push origin HEAD:refs/heads/wf/x" }, deny: null },
  { name: "push allowed: a workflow branch to itself", tool: "Bash", input: { command: "git push origin wf/LB-1:wf/LB-1" }, deny: null },
  { name: "push allowed: git -C then a workflow destination", tool: "Bash", input: { command: "git -C x push origin HEAD:wf/y" }, deny: null },
  // merge-outside-kit
  { name: "merge-outside-kit: gh pr merge", tool: "Bash", input: { command: "gh pr merge 12 --squash" }, deny: "merge-outside-kit" },
  { name: "merge-outside-kit: gh -R before pr merge", tool: "Bash", input: { command: "gh -R acme/site pr merge 12 --squash" }, deny: "merge-outside-kit" },
  // ruleset-or-secret
  { name: "ruleset-or-secret: POST to rulesets", tool: "Bash", input: { command: "gh api -X POST repos/acme/site/rulesets --input ruleset.json" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: PUT to branch protection", tool: "Bash", input: { command: "gh api -X PUT repos/acme/site/branches/main/protection" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: gh secret set", tool: "Bash", input: { command: "gh secret set TOKEN --body x" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: gh variable set", tool: "Bash", input: { command: "gh variable set NAME --body x" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: gh ruleset create", tool: "Bash", input: { command: "gh ruleset create" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: gh repo edit", tool: "Bash", input: { command: "gh repo edit --visibility public" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: gh auth login", tool: "Bash", input: { command: "gh auth login" }, deny: "ruleset-or-secret" },
  { name: "ruleset-or-secret: POST to repository hooks", tool: "Bash", input: { command: "gh api -X POST repos/acme/site/hooks -f url=https://ci.example.invalid/x" }, deny: "ruleset-or-secret" },
  // gh-write-outside-kit
  { name: "gh-write-outside-kit: gh issue create", tool: "Bash", input: { command: "gh issue create --title x --body y" }, deny: "gh-write-outside-kit" },
  { name: "gh-write-outside-kit: gh pr comment", tool: "Bash", input: { command: "gh pr comment 3 --body hello" }, deny: "gh-write-outside-kit" },
  { name: "gh-write-outside-kit: gh label create", tool: "Bash", input: { command: "gh label create ready --color ffffff --description x" }, deny: "gh-write-outside-kit" },
  { name: "gh-write-outside-kit: implicit POST through gh api -f", tool: "Bash", input: { command: "gh api repos/acme/site/issues/1/labels -f labels[]=x" }, deny: "gh-write-outside-kit" },
  { name: "gh read allowed: gh api GET on issues", tool: "Bash", input: { command: "gh api repos/acme/site/issues" }, deny: null },
  { name: "gh read allowed: gh issue list", tool: "Bash", input: { command: "gh issue list --state open" }, deny: null },
  // git-destructive
  { name: "git-destructive: reset --hard", tool: "Bash", input: { command: "git reset --hard HEAD~1" }, deny: "git-destructive" },
  { name: "git-destructive: clean -fd", tool: "Bash", input: { command: "git clean -fd" }, deny: "git-destructive" },
  { name: "git-destructive: checkout -- path", tool: "Bash", input: { command: "git checkout -- src/a.ts" }, deny: "git-destructive" },
  { name: "git-destructive: branch -D", tool: "Bash", input: { command: "git branch -D wf/a" }, deny: "git-destructive" },
  { name: "git-destructive: rebase", tool: "Bash", input: { command: "git rebase main" }, deny: "git-destructive" },
  { name: "git-destructive: stash drop", tool: "Bash", input: { command: "git stash drop" }, deny: "git-destructive" },
  // git-mutation (subagents only)
  { name: "git-mutation: a subagent commits", tool: "Bash", input: { command: "git commit -m x" }, agent: "implement-LB-1.4", deny: "git-mutation" },
  { name: "git-mutation: a subagent stages", tool: "Bash", input: { command: "git add -- src/a.ts" }, agent: "implement-LB-1.4", deny: "git-mutation" },
  { name: "git-mutation: a subagent reads status", tool: "Bash", input: { command: "git status" }, agent: "implement-LB-1.4", deny: null },
  { name: "git-mutation: the owner session may commit", tool: "Bash", input: { command: "git commit -m x" }, agent: null, deny: null },
  // host-not-allowed
  { name: "host-not-allowed: curl to an unlisted host", tool: "Bash", input: { command: "curl https://evil.example.invalid/x" }, deny: "host-not-allowed" },
  { name: "host allowed: curl to api.github.com", tool: "Bash", input: { command: "curl https://api.github.com/user" }, deny: null },
  { name: "host allowed: curl to a subdomain of an allowed host", tool: "Bash", input: { command: "curl https://objects.registry.npmjs.org/x" }, deny: null },
  { name: "host allowed: curl to 127.0.0.1", tool: "Bash", input: { command: "curl http://127.0.0.1:4300/" }, deny: null },
  { name: "host-not-allowed: WebFetch to a look-alike host", tool: "WebFetch", input: { url: "https://bench.example.evil.example.invalid/" }, deny: "host-not-allowed" },
  { name: "host-not-allowed: WebFetch with a file scheme", tool: "WebFetch", input: { url: "file:///etc/hosts" }, deny: "host-not-allowed" },
  { name: "host allowed: WebFetch to a reference host", tool: "WebFetch", input: { url: "https://bench.example/page" }, deny: null },
  { name: "host allowed: WebFetch to localhost", tool: "WebFetch", input: { url: "http://localhost:4300/" }, deny: null },
  // protected-path
  { name: "protected-path: Write to prd/ without a matching agent", tool: "Write", input: { file_path: "prd/prd.md" }, deny: "protected-path" },
  { name: "protected path allowed: Write to prd/ by a prd agent", tool: "Write", input: { file_path: "prd/prd.md" }, agent: "prd-author", deny: null },
  { name: "protected-path: Edit of acceptance tests by an implementer", tool: "Edit", input: { file_path: "tests/acceptance/a.spec.ts" }, agent: "implement-LB-1", deny: "protected-path" },
  { name: "protected path allowed: Edit of acceptance tests by a test author", tool: "Edit", input: { file_path: "tests/acceptance/a.spec.ts" }, agent: "test-author-LB-1", deny: null },
  { name: "protected-path: .github/ is never agent-writable", tool: "Write", input: { file_path: ".github/workflows/ci.yml" }, agent: "prd-x", deny: "protected-path" },
  { name: "protected-path: the charter itself", tool: "Write", input: { file_path: "autopilot.yaml" }, deny: "protected-path" },
  { name: "protected-path: ApplyPatch Update File under prd/", tool: "ApplyPatch", input: { patch: "*** Begin Patch\n*** Update File: prd/sections/LB.md\n@@\n-a\n+b\n*** End Patch" }, deny: "protected-path" },
  { name: "protected path allowed: ApplyPatch on src/", tool: "ApplyPatch", input: { patch: "*** Begin Patch\n*** Add File: src/a.ts\n+export {};\n*** End Patch" }, deny: null },
  { name: "protected-path: an upper-case PRD path is still protected", tool: "Write", input: { file_path: "PRD/prd.md" }, deny: "protected-path" },
  { name: "protected-path: NotebookEdit under tests/parity/", tool: "NotebookEdit", input: { notebook_path: "tests/parity/x.ipynb" }, deny: "protected-path" },
  { name: "protected path allowed: a path outside the project is not this policy's", tool: "Write", input: { file_path: "/Users/hmziq/elsewhere/prd/prd.md" }, deny: null },
  { name: "protected path allowed: Write to src/", tool: "Write", input: { file_path: "src/a.ts" }, deny: null },
  // policy-error (fail closed)
  { name: "policy-error: a Bash call without a command", tool: "Bash", input: {}, deny: "policy-error" },
  { name: "policy-error: a Write call without a file path", tool: "Write", input: { content: "x" }, deny: "policy-error" },
  { name: "policy-error: an ApplyPatch without a file header", tool: "ApplyPatch", input: { patch: "hello" }, deny: "policy-error" },
  { name: "policy-error: tool_input that is not an object", tool: "Bash", input: "git status", deny: "policy-error" },
  // pass
  { name: "pass: a quoted push inside echo is text", tool: "Bash", input: { command: 'echo "git push --force origin main; ok"' }, deny: null },
  { name: "pass: a quoted git push piped to cat", tool: "Bash", input: { command: 'echo "git push" | cat' }, deny: null },
  { name: "pass: a plain listing", tool: "Bash", input: { command: "ls -la" }, deny: null },
  { name: "force-push: a force push behind env and bash -c", tool: "Bash", input: { command: "env FOO=1 bash -c 'git push --force origin wf/a'" }, deny: "force-push" },
];

async function hookChecks() {
  const charter = loadedTemplate();
  const project = tempDir("hooks-eval");
  for (const row of HOOK_CASES) {
    await check(`hooks (spec 6): ${row.name} under both events`, () => {
      for (const event of ["PreToolUse", "PermissionRequest"]) {
        const input = { hook_event_name: event, tool_name: row.tool, tool_input: row.input, permission_mode: "default" };
        if (row.agent !== undefined && row.agent !== null) input.agent_type = row.agent;
        const verdict = evaluate(input, charter, project);
        const expected = row.deny === null ? "pass" : "deny";
        assert.equal(verdict.decision, expected, `${event}: ${jsonOf(verdict)}`);
        if (row.deny !== null) assert.equal(verdict.rule, row.deny, `${event}: ${jsonOf(verdict)}`);
      }
    });
  }

  await check("hooks (spec 6): an unsupported hook event is refused as policy-error", () => {
    const verdict = evaluate({ hook_event_name: "Stop", tool_name: "Bash", tool_input: { command: "ls" } }, charter, project);
    assert.equal(verdict.decision, "deny");
    assert.equal(verdict.rule, "policy-error");
  });
  await check("hooks (spec 6): a missing tool_name is refused as policy-error", () => {
    const verdict = evaluate({ hook_event_name: "PreToolUse", tool_input: { command: "ls" } }, charter, project);
    assert.equal(verdict.rule, "policy-error");
  });

  const autoCharter = { ...charter, hooks: { ...charter.hooks, auto_approve_tools: ["WebFetch", "Bash"] } };
  const request = (tool, input, event = "PermissionRequest") => ({
    hook_event_name: event, tool_name: tool, tool_input: input, permission_suggestions: [{ type: "addRules" }],
  });
  await check("hooks (spec 6): an auto-approved tool is allowed on PermissionRequest only", () => {
    assert.deepEqual(evaluate(request("WebFetch", { url: "https://bench.example/x" }), autoCharter, project),
      { decision: "allow", rule: "auto-approve", reason: "WebFetch is listed in hooks.auto_approve_tools" });
    assert.equal(evaluate(request("WebFetch", { url: "https://bench.example/x" }, "PreToolUse"), autoCharter, project).decision, "pass");
  });
  await check("hooks (spec 6): a deny outranks auto-approve", () => {
    const verdict = evaluate(request("WebFetch", { url: "https://evil.example.invalid/" }), autoCharter, project);
    assert.equal(verdict.decision, "deny");
    assert.equal(verdict.rule, "host-not-allowed");
    const push = evaluate(request("Bash", { command: "git push --force origin wf/a" }), autoCharter, project);
    assert.equal(push.rule, "force-push");
  });
  await check("hooks (spec 6): a tool outside the auto list still passes on PermissionRequest", () => {
    assert.equal(evaluate(request("Bash", { command: "git status" }), { ...charter, hooks: { ...charter.hooks, auto_approve_tools: ["WebFetch"] } }, project).decision, "pass");
  });
}

// 3b. The hook as ZCode runs it: real processes, stdin JSON, the log file, and the registration file.
function hookLog(project) {
  const file = join(project, ".shipflow", "policy.log");
  return { file, lines: () => (existsSync(file) ? readText(file).split("\n").filter((line) => line !== "") : []) };
}

function runHook(project, payload) {
  const log = hookLog(project);
  const before = log.lines().length;
  const run = hookProcess(project, jsonOf(payload));
  return { ...run, added: log.lines().slice(before).map((line) => JSON.parse(line)) };
}

async function hookCliChecks() {
  await check("hooks (spec 6, D17): hooks.json registers PreToolUse and PermissionRequest with the autopilot policy message", () => {
    const registration = JSON.parse(readText(hooksJsonFile));
    assert.equal(registration.hooks.enabled, true);
    for (const event of ["PreToolUse", "PermissionRequest"]) {
      const entries = registration.hooks.events[event];
      assert.ok(entries.length > 0, `${event} has no entries`);
      for (const entry of entries) {
        const hook = entry.hooks[0];
        assert.equal(hook.statusMessage, "autopilot policy");
        assert.equal(hook.command, "bun");
        assert.ok(hook.args.some((arg) => arg.endsWith("/.zcode/skills/shipflow/hooks/policy.ts")));
      }
    }
  });

  const project = tempDir("hooks-cli");
  writeTree(project, { "autopilot.yaml": charterText() });
  const reading = { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git status" }, agent_type: "implement-LB-1", permission_mode: "default" };
  await check("hooks (spec 6): the real CLI passes a read-only subagent command and logs one line", () => {
    const run = runHook(project, reading);
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "");
    assert.equal(run.added.length, 1);
    assert.equal(run.added[0].decision, "pass");
    assert.equal(run.added[0].agent, "implement-LB-1");
    assert.equal(run.added[0].summary, "git status");
  });
  await check("hooks (spec 6): the real CLI denies a force push with exit 2 and the reason on stderr", () => {
    const run = runHook(project, {
      hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git push --force origin wf/a" }, permission_mode: "default",
    });
    assert.equal(run.code, 2);
    assert.match(run.err, /autopilot policy \(force-push\)/);
    assert.equal(run.added.length, 1);
    assert.equal(run.added[0].decision, "deny");
    assert.equal(run.added[0].rule, "force-push");
  });
  await check("hooks (spec 6): the real CLI passes a PermissionRequest that no rule covers and logs the suggestion keys", () => {
    const run = runHook(project, {
      hook_event_name: "PermissionRequest", tool_name: "Bash", tool_input: { command: "git push origin HEAD:refs/heads/wf/x" },
      permission_suggestions: [{ type: "addRules", rules: [] }],
    });
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "");
    assert.deepEqual(run.added[0].suggestions, [["type", "rules"]]);
  });
  await check("hooks (spec 6): the real CLI long command logs a 200-character summary and no full command", () => {
    const long = `echo ${"x".repeat(300)}`;
    const run = runHook(project, { ...reading, tool_input: { command: long } });
    assert.equal(run.code, 0);
    assert.equal(run.added.length, 1);
    assert.equal(run.added[0].summary.length, 200);
    assert.ok(!readText(hookLog(project).file).includes(long));
  });

  const autoProject = tempDir("hooks-auto");
  writeTree(autoProject, { "autopilot.yaml": charterText({ find: "auto_approve_tools: []", replace: 'auto_approve_tools: ["WebFetch"]' }) });
  await check("hooks (spec 6): the real CLI auto-approves a listed tool with the exact PermissionRequest allow JSON", () => {
    const run = runHook(autoProject, {
      hook_event_name: "PermissionRequest", tool_name: "WebFetch", tool_input: { url: "https://bench.example/x" },
      permission_suggestions: [{ type: "addRules" }],
    });
    assert.equal(run.code, 0, run.err);
    assert.deepEqual(JSON.parse(run.out), {
      hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } },
    });
    assert.equal(run.added[0].decision, "allow");
    assert.equal(run.added[0].rule, "auto-approve");
  });

  const brokenProject = tempDir("hooks-broken");
  writeTree(brokenProject, { "autopilot.yaml": charterText({ find: "version: 1", replace: "version: 2" }) });
  await check("hooks (spec 6): a broken charter fails closed with policy-error and logs to the default log", () => {
    const run = runHook(brokenProject, reading);
    assert.equal(run.code, 2);
    assert.match(run.err, /autopilot policy \(policy-error\)/);
    assert.equal(run.added.length, 1);
    assert.equal(run.added[0].rule, "policy-error");
    assert.equal(run.added[0].decision, "deny");
  });
}

// 4. Gate runner (spec section 3): detected gates with passing and failing scripts, pinned gates, and
// the protected gate in a real repository.
async function gateChecks() {
  const project = tempDir("gates");
  writeTree(project, {
    "package.json": jsonOf({
      scripts: { build: "exit 0", check: "echo broken && exit 1", lint: "exit 0", test: "exit 0", "test:e2e": "exit 0" },
    }),
    "bun.lock": "",
    "autopilot.yaml": charterText(),
  });
  const detected = (gateName) => bunCli(runGateCli, ["--charter", "autopilot.yaml", "--gate", gateName, "--log-dir", "logs"], { cwd: project });

  await check("run-gate (spec 3): the detected l1 gate reports 2/3 passed, names the failing check and tails its log", () => {
    const run = detected("l1");
    const lines = run.out.split("\n");
    assert.equal(run.code, 1);
    assert.equal(lines[0], "gate l1: 2/3 passed");
    assert.ok(lines.includes("ERROR check exit 1"), run.out);
    assert.ok(lines.includes("  broken"), run.out);
    assert.ok(existsSync(join(project, "logs", "l1-check.log")));
  });
  await check("run-gate (spec 3): the detected unit gate passes with 1/1", () => {
    const run = detected("unit");
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "gate unit: 1/1 passed\n");
  });
  await check("run-gate (spec 3): the detected acceptance gate runs with its 30-minute entry", () => {
    const run = detected("acceptance");
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "gate acceptance: 1/1 passed\n");
  });
  await check("run-gate (spec 3): an undetected parity gate is not configured, which is never green", () => {
    const run = detected("parity");
    assert.equal(run.code, 1);
    assert.equal(run.out, "gate parity: not configured\n");
  });

  const pinned = tempDir("gates-pinned");
  writeTree(pinned, {
    "autopilot.yaml": charterText({
      find: "gates: {}",
      replace: 'gates: {l1: [{name: ok, tool: "true", args: [], timeout_minutes: 1}, {name: bad, tool: "false", args: [], timeout_minutes: 1}]}',
    }),
  });
  await check("run-gate (spec 3): pinned gates true and false report 1/2 passed and exit 1", () => {
    const run = bunCli(runGateCli, ["--charter", "autopilot.yaml", "--gate", "l1", "--log-dir", "logs"], { cwd: pinned });
    assert.equal(run.code, 1);
    assert.equal(run.out.split("\n")[0], "gate l1: 1/2 passed");
    assert.ok(run.out.includes("ERROR bad exit 1"), run.out);
  });

  const repo = tempDir("gates-protected");
  const charterDir = tempDir("gates-charter");
  writeTree(charterDir, { "autopilot.yaml": charterText() });
  gitOk(repo, ["init", "-q", "-b", "main"]);
  gitOk(repo, ["config", "commit.gpgsign", "false"]);
  writeTree(repo, { "prd/prd.md": "v1\n", "src/a.ts": "a\n" });
  gitOk(repo, ["add", "-A"]);
  gitOk(repo, ["commit", "-q", "-m", "base"]);
  const base = gitOk(repo, ["rev-parse", "HEAD"]).trim();
  gitOk(repo, ["checkout", "-q", "-b", "wf/LB-1.4"]);
  writeTree(repo, { "prd/prd.md": "v2\n", "src/a.ts": "b\n" });
  gitOk(repo, ["commit", "-q", "-am", "change prd"]);
  const protectedRun = (branch) => bunCli(runGateCli, [
    "--charter", join(charterDir, "autopilot.yaml"), "--gate", "protected", "--base", base, "--branch", branch,
  ], { cwd: repo });

  await check("run-gate (spec 3): the protected gate refuses a prd/ change on wf/LB-1.4", () => {
    const run = protectedRun("wf/LB-1.4");
    assert.equal(run.code, 1);
    assert.equal(run.out, "gate protected: 0/1 passed\nERROR prd/prd.md protected path changed on wf/LB-1.4\n");
  });
  await check("run-gate (spec 3): the protected gate allows a prd/ change on wf/prd-v2", () => {
    const run = protectedRun("wf/prd-v2");
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "gate protected: 1/1 passed\n");
  });
}

// 5. Review poster (spec section 5): the App JWT, the two requests, token secrecy and key permissions.
async function reviewChecks() {
  const dir = tempDir("review");
  const pair = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const keyPath = join(dir, "reviewer.pem");
  writeFileSync(keyPath, pair.privateKey);
  chmodSync(keyPath, 0o600);
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const now = NOW;
  const opts = {
    repo: REPO, sha, conclusion: "success", summary: "Review summary: pass", title: "AI review",
    appId: "1234567", installationId: "89012345", keyPath,
  };

  await check("post-review (spec 5): buildJwt is RS256, verifies with the public key and carries the claims", () => {
    const [header, payload, signature] = buildJwt("1234567", pair.privateKey, now).split(".");
    assert.deepEqual(JSON.parse(Buffer.from(header, "base64url").toString()), { alg: "RS256", typ: "JWT" });
    assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url").toString()), { iat: now - 60, exp: now + 540, iss: "1234567" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    verifier.end();
    assert.equal(verifier.verify(pair.publicKey, Buffer.from(signature, "base64url")), true);
  });

  const stub = (responses) => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      const next = responses.shift();
      return new Response(jsonOf(next.body), { status: next.status ?? 200, headers: { "content-type": "application/json" } });
    };
    return { calls, fetchImpl };
  };

  await check("post-review (spec 5): postReview sends the token request then the check run, and never returns the token", async () => {
    const { calls, fetchImpl } = stub([{ body: { token: "ghs_STUBTOKEN" } }, { body: { id: 42 }, status: 201 }]);
    const result = await postReview(opts, fetchImpl);
    assert.deepEqual(result, { ok: true, checkRunId: 42, error: null });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, "https://api.github.com/app/installations/89012345/access_tokens");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization.split(".").length, 3);
    assert.equal(calls[1].url, `https://api.github.com/repos/${REPO}/check-runs`);
    assert.equal(calls[1].init.method, "POST");
    assert.equal(calls[1].init.headers.Authorization, "Bearer ghs_STUBTOKEN");
    assert.equal(calls[1].init.headers.Accept, "application/vnd.github+json");
    assert.equal(calls[1].init.headers["X-GitHub-Api-Version"], "2022-11-28");
    const body = JSON.parse(calls[1].init.body);
    assert.equal(body.name, "ai-review");
    assert.equal(body.head_sha, sha);
    assert.equal(body.status, "completed");
    assert.equal(body.conclusion, "success");
    assert.deepEqual(body.output, { title: "AI review", summary: "Review summary: pass" });
    assert.ok(!jsonOf(result).includes("ghs_STUBTOKEN"));
  });
  await check("post-review (spec 5): a refused token request reports the HTTP status without the app JWT", async () => {
    const { calls, fetchImpl } = stub([{ body: { message: "Bad credentials" }, status: 401 }]);
    const result = await postReview(opts, fetchImpl);
    assert.equal(result.ok, false);
    assert.equal(calls.length, 1);
    const jwt = calls[0].init.headers.Authorization.replace("Bearer ", "");
    assert.match(result.error, /HTTP 401/);
    assert.ok(!result.error.includes(jwt));
  });
  await check("post-review (spec 5): the summary is capped at 65000 characters", () => {
    assert.equal(capSummary("a".repeat(70000)).length, 65000);
    const plan = dryRunPlan({ ...opts, summary: "b".repeat(70000) });
    assert.equal(plan.requests[1].body.output.summary.length, 65000);
    assert.ok(!jsonOf(plan).includes("BEGIN PRIVATE KEY"));
  });

  const loose = join(dir, "loose.pem");
  writeFileSync(loose, pair.privateKey);
  chmodSync(loose, 0o644);
  const summaryFile = join(dir, "summary.md");
  writeFileSync(summaryFile, "summary\n");
  const cliArgs = (key, extra = []) => [
    "--gh-repo", REPO, "--sha", sha, "--conclusion", "success", "--summary-file", summaryFile,
    "--app-id", "1234567", "--installation-id", "89012345", "--key", key, ...extra,
  ];
  await check("post-review (spec 5): a 0644 key file is refused with exit 2 and no request is made", async () => {
    const { calls, fetchImpl } = stub([]);
    const result = await postReview({ ...opts, keyPath: loose }, fetchImpl);
    assert.equal(result.ok, false);
    assert.match(result.error, /key file permissions too open/);
    assert.equal(calls.length, 0);
    const run = bunCli(postReviewCli, cliArgs(loose));
    assert.equal(run.code, 2);
    assert.match(run.err, /permissions too open/);
  });
  await check("post-review (spec 5): the dry run prints both requests with no token, JWT or key material", () => {
    const run = bunCli(postReviewCli, cliArgs(keyPath, ["--dry-run"]));
    assert.equal(run.code, 0, run.err);
    assert.match(run.out, /access_tokens/);
    assert.match(run.out, /check-runs/);
    assert.ok(!run.out.includes("PRIVATE KEY"));
  });
}

// 6. Preview (spec section 4): a real Bun server started and stopped through the CLI.
async function previewChecks() {
  const dir = tempDir("preview");
  writeTree(dir, {
    "server.ts": TINY_SERVER,
    "autopilot.yaml": charterText({ find: "preview: null", replace: 'preview: {tool: "bun", args: ["server.ts"], timeout_minutes: 1}' }),
  });
  const port = FREE_PORT_PROBE();
  const evidence = join(dir, "evidence");
  const charterPath = join(dir, "autopilot.yaml");
  let started = null;
  try {
    await check("preview (spec 4): start answers over HTTP from the pinned Bun server and reports the URL and pid", async () => {
      const run = bunCli(previewCli, ["start", "--dir", dir, "--port", String(port), "--evidence", evidence, "--charter", charterPath]);
      assert.equal(run.code, 0, `${run.out}${run.err}`);
      started = JSON.parse(run.out.trim());
      assert.equal(started.ok, true);
      assert.equal(started.url, `http://127.0.0.1:${port}/`);
      assert.equal(typeof started.pid, "number");
      assert.equal(await (await fetch(started.url)).text(), "preview ok");
    });
    await check("preview (spec 4): the credentials file is mode 0600 and holds a generated user and password", () => {
      assert.ok(started !== null, "start did not succeed");
      assert.equal(statSync(started.credentialsFile).mode & 0o777, 0o600);
      const credentials = JSON.parse(readText(started.credentialsFile));
      assert.match(credentials.user, /^autopilot-[0-9a-f]{8}$/);
      assert.ok(credentials.password.length >= 32);
    });
    await check("preview (spec 4): stop terminates the server and the port stops answering", async () => {
      assert.ok(started !== null, "start did not succeed");
      const run = bunCli(previewCli, ["stop", "--pid", String(started.pid), "--port", String(port)]);
      assert.equal(run.code, 0, run.out);
      assert.equal(run.out.trim(), '{"ok":true,"stopped":true}');
      await assert.rejects(fetch(`http://127.0.0.1:${port}/`));
      started = null;
    });
    await check("preview (spec 4): a worktree with no preview command exits 1 and starts nothing", () => {
      const bare = tempDir("preview-none");
      writeTree(bare, { "autopilot.yaml": charterText() });
      const run = bunCli(previewCli, [
        "start", "--dir", bare, "--port", String(FREE_PORT_PROBE()), "--evidence", join(bare, "evidence"),
        "--charter", join(bare, "autopilot.yaml"),
      ]);
      assert.equal(run.code, 1);
      assert.equal(run.out.trim(), '{"ok":false,"error":"no preview command"}');
    });
  } finally {
    if (started !== null) {
      try {
        process.kill(-started.pid, "SIGKILL");
      } catch {
        // The process group has already exited.
      }
    }
  }
}

// 7. fill-cycle (spec section 2 and section 8): the real template, real PRD fixture and real base commit.
function machineBody(task, area, hash = task.hash) {
  return [
    `# ${task.title}`, "", "Fixture task for the fill checks.", "", "```autopilot",
    `id: ${task.id}`, "kind: task", `parent: ${task.parent}`, `prd: ${task.file}#${task.anchor}`,
    `prd_hash: ${hash}`, `area: [${area.join(", ")}]`, "depends_on: []", "satisfies: []", "tests: []",
    `size: S`, `milestone: ${task.milestone || "M0"}`, "budget: {files: 10, lines: 150}", "```", "",
  ].join("\n");
}

async function fillChecks() {
  const prdFiles = readProject(fixtureRoot);
  const index = buildIndex(parsePrd(prdFiles));
  const tasks = index.items.filter((item) => item.kind === "task" && item.status === "active");
  await check("fill-cycle (spec 2): the PRD fixture has at least six active tasks to fill from", () => {
    assert.ok(tasks.length >= 6, `found ${tasks.length}`);
  });
  if (tasks.length < 6) return;

  const files = {
    "package.json": jsonOf({ scripts: { dev: "vite dev", build: "vite build" }, devDependencies: { svelte: "^5.0.0" } }),
    "bun.lock": "",
    "src/app.html": "",
    "server/api/scores.ts": "",
    "tests/acceptance/lb/leaderboard.spec.ts": "",
    ".zcode/agents/z-svelte-engineer.md": "# z-svelte-engineer\n",
    "autopilot.yaml": charterText(),
    ...Object.fromEntries(prdFiles),
  };
  const { work } = repoWithOrigin("fill", files);
  const specs = [
    { n: 11, task: tasks[0], area: ["src/routes/leaderboard"] },
    { n: 12, task: tasks[1], area: ["server/api/scores"] },
    { n: 13, task: tasks[2], area: ["tests/acceptance/lb/leaderboard"] },
    { n: 14, task: tasks[3], area: ["src/routes/leaderboard/detail"] },
    { n: 15, task: tasks[4], area: ["docs/guide"] },
    { n: 16, task: tasks[5], area: ["src/routes/other"], hash: "000000" },
  ];
  const fake = new FakeGitHub();
  for (const spec of specs) {
    fake.addIssue(spec.n, {
      title: `Task ${spec.task.id}`, body: machineBody(spec.task, spec.area, spec.hash ?? spec.task.hash),
      labels: ["kind:task", "state:ready", "attempt:1", "prio:p1"], milestone: "M0",
    });
  }
  const kitModule = loadKit(fake);
  const kit = kitModule.makeGithubKit({
    repo: REPO, login: "llm-board-bot", instance: "mac-1", prdIssue: 1, dryRun: true, claimTtlSeconds: 7200,
    attemptCap: 4, requiredChecks: [...REQUIRED], writeRoot: join(work, ".zflow", "kit"), pollSeconds: 1, maxPolls: 1, assignee: "",
  });
  const facts = [];
  for (const spec of specs) {
    const view = await kit.viewIssue(spec.n);
    const state = kit.stateOf(view.labels);
    facts.push({
      number: spec.n, error: view.ok ? "" : view.error, open: view.state === "OPEN", state: state.state,
      stateCount: state.count, attempt: kit.attemptOf(view.labels), body: view.body,
    });
  }
  const charter = loadCharter(join(work, "autopilot.yaml")).charter;
  const baseSha = await resolveBase(work, charter.base_branch, runGit);
  const baseIndex = await loadBaseIndex(work, baseSha, runGit);
  const settings = effectiveSettings(charter, work);
  const persona = (name) => (existsSync(join(work, ".zcode", "agents", `${name}.md`))
    ? join(work, ".zcode", "agents", `${name}.md`) : null);
  const built = buildLanes(facts, { charter, settings, index: baseIndex, promote: [], persona }, kitModule.kitParseMachineBlock);

  await check("fill-cycle (spec 2, 8): two independent issues become lanes and the rest are refused with their reasons", () => {
    assert.deepEqual(built.lanes.map((b) => b.lane.issue), [11, 12, 13]);
    const reasons = Object.fromEntries(built.refused.map((r) => [r.issue, r.reason]));
    assert.match(reasons[14], /^areas overlap lane /);
    assert.equal(reasons[15], "no specialist for docs/guide");
    assert.match(reasons[16], /^needs-publish /);
  });
  await check("fill-cycle (spec 2): a lane gets its specialist, the security and ui flags, and a test-lane branch", () => {
    const [ui, security, test] = built.lanes.map((b) => b.lane);
    assert.equal(ui.kind, "task");
    assert.equal(ui.branch, `wf/${tasks[0].id}`);
    assert.equal(ui.ui, true);
    assert.equal(ui.previewPort, 4300);
    assert.equal(ui.tier, "pro");
    assert.equal(security.security, true);
    assert.equal(security.ui, false);
    assert.equal(security.previewPort, 0);
    assert.equal(test.kind, "test");
    assert.equal(test.branch, `wf/test-${tasks[2].id}`);
    assert.equal(built.lanes[0].specialist, "z-svelte-engineer");
  });
  await check("fill-cycle (spec 2): the judge is the same specialist as the implementer", () => {
    for (const { lane } of built.lanes) assert.equal(lane.judge, lane.implementer);
  });
  await check("fill-cycle (spec 2): a missing specialist persona refuses every lane that needs it", () => {
    const none = buildLanes(facts.slice(0, 3), { charter, settings, index: baseIndex, promote: [], persona: () => null }, kitModule.kitParseMachineBlock);
    assert.equal(none.lanes.length, 0);
    for (const refusal of none.refused) assert.equal(refusal.reason, "persona z-svelte-engineer is not installed");
  });
  await check("fill-cycle (spec 8): planHashCheck refuses a changed plan with needs-publish and passes a current one", () => {
    const stale = planHashCheck({ id: tasks[0].id, prd_hash: "000000" }, baseIndex);
    assert.equal(stale.ok, false);
    assert.match(stale.reason, /^needs-publish .* plan changed since publication$/);
    assert.deepEqual(planHashCheck({ id: tasks[0].id, prd_hash: tasks[0].hash }, baseIndex), { ok: true });
  });

  const config = buildConfig({
    root: work, charter, baseSha, slug: "fill-check",
    flags: { dryRun: true, shadow: false, supervised: true },
    release: [], promote: [], lanes: built.lanes.map((b) => b.lane),
    securityPersona: "", qaPersona: "", scriptsDir,
  });
  const template = readText(templateFile);
  const filled = fillTemplate(template, config);
  const out = join(work, "out", "filled.dwf.ts");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, filled);

  await check("fill-cycle (spec 2): the filled config carries the lanes, the reviewer null and the charter repo", () => {
    assert.equal(config.reviewer, null);
    assert.equal(config.ghRepo, "acme/llm-board");
    assert.match(filled, /"issue": 11/);
    assert.deepEqual(config.requiredChecks, ["ci", "acceptance", "parity", "ai-review"]);
  });
  await check("fill-cycle (spec 2): the filled template verifies against the template", () => {
    assert.deepEqual(verifyFilled(template, filled), { ok: true, line: 0 });
  });
  await check("fill-cycle (spec 2): --verify exits 0 on the filled copy", () => {
    const run = bunCli(fillCli, ["--verify", out]);
    assert.equal(run.code, 0, run.err);
    assert.equal(run.out, "");
  });
  await check("fill-cycle (spec 2): a one-byte edit outside the fill region fails verification", () => {
    const at = filled.indexOf("persona-kit:start");
    assert.ok(at > filled.indexOf("// fill:end"), "the persona block must follow the fill region");
    const edited = `${filled.slice(0, at)}q${filled.slice(at + 1)}`;
    const verdict = verifyFilled(template, edited);
    assert.equal(verdict.ok, false);
    assert.ok(verdict.line > 0);
    const editedFile = join(work, "out", "edited.dwf.ts");
    writeFileSync(editedFile, edited);
    const run = bunCli(fillCli, ["--verify", editedFile]);
    assert.equal(run.code, 1);
    assert.match(run.err, /^ERROR drift line \d+$/m);
  });
  await check("fill-cycle (spec 2): a one-byte edit above the fill region fails verification on line 1", () => {
    const edited = filled.replace("// Autopilot", "// autopilot");
    assert.notEqual(edited, filled);
    assert.deepEqual(verifyFilled(template, edited), { ok: false, line: 1 });
  });
}

// 8. setup, offline (D17 section 3): charter generation, config merge, CI branch, ignore rules.
async function setupOfflineChecks() {
  const inputs = {
    repo: REPO, baseBranch: "main", login: "builder-bot", prdIssue: 7, lockfile: "bun.lock", defaultInstance: "mac-1",
    overrides: { references: ["https://bench.example/x"], approval: null, breakdown: null, lanes: null, instance: null },
  };
  await check("setup offline (D17 section 3): a generated charter parses clean with the D17 defaults and the reference host", () => {
    const loaded = parseCharter(generateCharter(inputs, null));
    assert.deepEqual(loaded.errors, []);
    const c = loaded.charter;
    assert.equal(c.repo, REPO);
    assert.equal(c.dispatcher.prd_issue, 7);
    assert.ok(c.authority.network_allow.includes("bench.example"));
    assert.ok(c.security_paths.includes("bun.lock"));
    assert.equal(c.identities.reviewer, null);
    assert.deepEqual(c.gates, {});
    assert.equal(c.preview, null);
    assert.deepEqual(c.areas, []);
    assert.deepEqual(c.parity_target, { structure: true, layout: true, interactions: true, brand: false, content: false });
  });

  const existingText = charterText({ find: "project: llm-board", replace: "project: my-board" })
    .replace("max_parallel_lanes: 3", "max_parallel_lanes: 5");
  await check("setup offline (D17 section 3): an existing charter keeps its values and its builder login", () => {
    const kept = parseCharter(generateCharter({ ...inputs, overrides: { ...inputs.overrides, references: null } }, existingText));
    assert.deepEqual(kept.errors, []);
    assert.equal(kept.charter.project, "my-board");
    assert.equal(kept.charter.limits.max_parallel_lanes, 5);
    assert.equal(kept.charter.identities.builder.login, "llm-board-bot");
    assert.ok(kept.charter.authority.network_allow.includes("bench.example"));
  });
  await check("setup offline (D17 section 3): flags override the kept values", () => {
    const overridden = parseCharter(generateCharter({
      ...inputs, overrides: { ...inputs.overrides, approval: "auto", lanes: 6, instance: "mac-2" },
    }, existingText));
    assert.deepEqual(overridden.errors, []);
    assert.equal(overridden.charter.prd_approval, "auto");
    assert.equal(overridden.charter.limits.max_parallel_lanes, 6);
    assert.equal(overridden.charter.dispatcher.instance, "mac-2");
  });

  const hooksJson = readText(hooksJsonFile);
  const existingConfig = jsonOf({
    theme: "dark",
    hooks: {
      enabled: false,
      events: {
        PreToolUse: [
          { matcher: "Read", hooks: [{ type: "process", command: "echo", statusMessage: "mine" }] },
          { matcher: "Bash", hooks: [{ type: "process", command: "old", statusMessage: "autopilot policy" }] },
        ],
      },
    },
  });
  await check("setup offline (D17 section 3): mergeZcodeConfig keeps unrelated keys and replaces only the autopilot entries", () => {
    const merged = JSON.parse(mergeZcodeConfig(existingConfig, hooksJson));
    assert.equal(merged.theme, "dark");
    assert.equal(merged.hooks.enabled, true);
    const pre = merged.hooks.events.PreToolUse;
    assert.ok(pre.some((entry) => entry.hooks[0].statusMessage === "mine"));
    assert.ok(!pre.some((entry) => entry.hooks[0].command === "old"));
    const autopilot = pre.filter((entry) => entry.hooks[0].statusMessage === "autopilot policy");
    assert.deepEqual(autopilot, JSON.parse(hooksJson).hooks.events.PreToolUse);
    assert.ok(merged.hooks.events.PermissionRequest.length > 0);
  });
  await check("setup offline (D17 section 3): mergeZcodeConfig run twice gives identical output", () => {
    const once = mergeZcodeConfig(existingConfig, hooksJson);
    assert.equal(mergeZcodeConfig(once, hooksJson), once);
    const fresh = mergeZcodeConfig(null, hooksJson);
    assert.equal(mergeZcodeConfig(fresh, hooksJson), fresh);
  });

  const ciTemplate = readText(join(skill, "templates/ci.yml"));
  await check("setup offline (D17 section 3): ciWorkflowFor rewrites the push branch and refuses a name that is not a ref", () => {
    const rewritten = ciWorkflowFor(ciTemplate, "trunk");
    assert.ok(rewritten.includes("    branches: [trunk]"));
    assert.ok(!rewritten.includes("    branches: [main]"));
    assert.throws(() => ciWorkflowFor(ciTemplate, "bad branch"));
  });
  await check("setup offline (D17 section 3): appendIgnores adds the autopilot rules once and keeps existing lines", () => {
    const first = appendIgnores(null);
    assert.equal(first, ".shipflow/\n.zflow/\n");
    assert.equal(appendIgnores(first), first);
    const existing = appendIgnores("node_modules/\n.shipflow/");
    assert.equal(existing, "node_modules/\n.shipflow/\n.zflow/\n");
    assert.equal(appendIgnores(existing), existing);
  });
}

// 9. setup against the fake GitHub and a real repository with a bare origin (D17 sections 3 and 5).
// The fake interprets the kit's gh argv. Two adapters bridge what the fake cannot express: a branch
// that exists only in the origin is made known to the fake before a PR opens, and a merged PR lands
// on the origin's main (the fake keeps its own merge record) so --sync-checkout has a real target.
function mirrorRefs(fake, work) {
  for (const line of gitOk(work, ["ls-remote", "origin"]).split("\n")) {
    const [sha, ref] = line.split("\t");
    if (ref === undefined || !ref.startsWith("refs/heads/")) continue;
    fake.setBranch(ref.slice("refs/heads/".length), sha);
    if (!fake.commits.has(sha)) {
      fake.addCommit(sha, gitOk(work, ["rev-list", "--parents", "-n", "1", sha]).trim().split(" ").slice(1));
    }
  }
}

function setupWorld(fake, work) {
  return {
    async run(cmd, args = []) {
      if (cmd === "gh" && args[0] === "pr" && args[1] === "create") mirrorRefs(fake, work);
      if (cmd === "gh" && args[0] === "pr" && args[1] === "merge") {
        const sha = args[args.indexOf("--match-head-commit") + 1];
        const result = await fake.run(cmd, args);
        if (result.exitCode === 0) {
          gitOk(work, ["push", "-q", "origin", `${sha}:refs/heads/main`]);
          mirrorRefs(fake, work);
        }
        return result;
      }
      return fake.run(cmd, args);
    },
  };
}

const setupDeps = (world) => ({ world, git: realGit, now: () => NOW, hostname: "mac-1" });

// The options the CLI would build, so the checker runs with the current option shape.
function parsedRun(argv) {
  const parsed = parseSetupArgs(argv);
  assert.equal(parsed.kind, "run", parsed.kind === "usage" ? parsed.message : "help was requested");
  return parsed.options;
}

function cloneOf(origin, label) {
  const dir = join(tempDir(label), "checkout");
  const run = sync(["git", "clone", "-q", origin, dir]);
  assert.equal(run.code, 0, run.err);
  return dir;
}

async function setupFakeChecks() {
  const { work, origin } = repoWithOrigin("setup", {
    "package.json": jsonOf({ scripts: { dev: "vite dev", build: "vite build" }, devDependencies: { svelte: "^5.0.0" } }),
    "bun.lock": "",
    "src/app.html": "",
  });
  const checkoutA = cloneOf(origin, "sync-a");
  const checkoutB = cloneOf(origin, "sync-b");
  const fake = new FakeGitHub();
  const owner = REPO.split("/")[0];
  const applyArgv = ["--repo", work, "--gh-repo", REPO, "--reference", "https://bench.example", "--instance", "mac-1"];
  let first = null;

  await check("setup (D17 section 5): the first run merges the setup PR and reports labels, milestones, PRD, Project and ruleset", async () => {
    first = await runSetup(parsedRun(applyArgv), setupDeps(setupWorld(fake, work)));
    assert.equal(first.exitCode, 0, jsonOf(first.report));
    const report = first.report;
    assert.equal(report.ok, true);
    assert.equal(report.merged, true);
    assert.deepEqual(report.milestones.created, ["M0", "M1", "M2", "M3"]);
    assert.ok(report.labels.created.length > 0);
    assert.ok(report.prdIssue > 0);
    assert.equal(report.project.number, 1);
    assert.equal(report.ruleset, "created");
    assert.deepEqual(report.warnings, []);
  });
  await check("setup (D17 section 5): the PRD issue is pinned, carries kind:prd and sits in the Project", () => {
    assert.ok(first !== null && first.exitCode === 0, "the first run did not complete");
    const prd = fake.issues.get(first.report.prdIssue);
    assert.equal(prd.pinned, true);
    assert.ok(prd.labels.has("kind:prd"));
    assert.equal(prd.title, "[PRD] site");
    assert.ok(fake.projectFor(owner, 1).items.some((item) => item.issue === prd.number));
  });
  await check("setup (D17 section 5): the setup branch reached origin with the expected files and its PR merged", () => {
    assert.ok(first !== null && first.exitCode === 0, "the first run did not complete");
    const branch = `wf/setup-${NOW}`;
    assert.equal(gitOk(origin, ["for-each-ref", "--format=%(refname)", "refs/heads/wf/"]).trim(), `refs/heads/${branch}`);
    const files = gitOk(origin, ["ls-tree", "-r", "--name-only", branch]).split("\n");
    for (const path of ["autopilot.yaml", ".github/workflows/autopilot-ci.yml", ".gitignore", ".zcode/config.json"]) {
      assert.ok(files.includes(path), `setup branch lacks ${path}`);
    }
    assert.equal(fake.prs.get(first.report.pr.number).state, "MERGED");
    assert.ok(gitOk(origin, ["ls-tree", "-r", "--name-only", "main"]).split("\n").includes("autopilot.yaml"));
  });
  await check("setup (D17 section 5): the autopilot ruleset exists once under the name in the template", () => {
    const name = JSON.parse(readText(join(skill, "templates/ruleset-main.json"))).name;
    assert.equal(fake.rulesets.size, 1);
    assert.equal([...fake.rulesets.values()][0].name, name);
  });
  await check("setup (D17 section 5): a second run reports files up to date and creates nothing", async () => {
    const issues = fake.issues.size;
    const prs = fake.prs.size;
    const projects = fake.projects.get(owner).length;
    const before = fake.mutations.length;
    const second = await runSetup(parsedRun(applyArgv), setupDeps(setupWorld(fake, work)));
    assert.equal(second.exitCode, 0, jsonOf(second.report));
    assert.equal(second.report.files.status, "up to date");
    assert.deepEqual(second.report.labels.created, []);
    assert.deepEqual(second.report.milestones.created, []);
    assert.equal(second.report.pr, null);
    assert.equal(fake.issues.size, issues);
    assert.equal(fake.prs.size, prs);
    assert.equal(fake.projects.get(owner).length, projects);
    assert.equal(fake.rulesets.size, 1);
    const creations = fake.mutations.slice(before).filter((argv) => argv.some((token) => ["create", "merge", "POST"].includes(token)));
    assert.deepEqual(creations, []);
  });
  await check("setup --sync-checkout (D17 section 3): identical untracked files move to the backup and the checkout fast-forwards", async () => {
    for (const path of ["autopilot.yaml", ".github/workflows/autopilot-ci.yml"]) {
      mkdirSync(dirname(join(checkoutA, path)), { recursive: true });
      writeFileSync(join(checkoutA, path), gitOk(origin, ["show", `main:${path}`]));
    }
    const run = await runSetup(parsedRun(["--repo", checkoutA, "--gh-repo", REPO, "--sync-checkout"]), setupDeps(setupWorld(fake, work)));
    assert.equal(run.exitCode, 0, jsonOf(run.report));
    assert.deepEqual(run.report.sync.moved, [".github/workflows/autopilot-ci.yml", "autopilot.yaml"]);
    assert.equal(run.report.sync.newHead, gitOk(origin, ["rev-parse", "main"]).trim());
    assert.ok(existsSync(join(run.report.sync.backup, "autopilot.yaml")));
    assert.equal(gitOk(checkoutA, ["ls-files", "autopilot.yaml"]).trim(), "autopilot.yaml");
  });
  await check("setup --sync-checkout (D17 section 3): a differing untracked file is refused and nothing moves", async () => {
    writeFileSync(join(checkoutB, "autopilot.yaml"), "version: 1\nproject: mine\n");
    const headBefore = gitOk(checkoutB, ["rev-parse", "HEAD"]).trim();
    const run = await runSetup(parsedRun(["--repo", checkoutB, "--gh-repo", REPO, "--sync-checkout"]), setupDeps(setupWorld(fake, work)));
    assert.equal(run.exitCode, 1);
    assert.match(run.report.error, /refusing: untracked files differ from origin\/main \(autopilot\.yaml\)/);
    assert.equal(readText(join(checkoutB, "autopilot.yaml")), "version: 1\nproject: mine\n");
    assert.equal(gitOk(checkoutB, ["rev-parse", "HEAD"]).trim(), headBefore);
  });
  await check("setup (D17 section 3): setup refuses without admin access with exit 2 and makes no GitHub write", async () => {
    const plain = new FakeGitHub();
    plain.repo.permissions = { admin: false };
    const run = await runSetup(parsedRun(applyArgv), setupDeps(setupWorld(plain, work)));
    assert.equal(run.exitCode, 2);
    assert.match(run.report.error, /has no admin access/);
    assert.equal(plain.mutations.length, 0);
  });
}

// 9b. The setup-generated protected rules, judged by the run-gate protected logic, and the fill-cycle flags.
function overridesFor(partial = {}) {
  return {
    references: null, approval: null, breakdown: null, lanes: null, attempts: null, timeoutMinutes: null,
    pageCap: null, firstAttempt: null, instance: null, gates: {}, areas: undefined, preview: undefined,
    reviewer: undefined, ...partial,
  };
}

async function setupProtectedChecks() {
  const generated = generateCharter({
    repo: REPO, baseBranch: "main", login: "builder-bot", prdIssue: 7, lockfile: "", defaultInstance: "mac-1",
    overrides: overridesFor(),
  }, null);
  const charter = parseCharter(generated).charter;
  await check("setup (D17 section 3, run-gate protected logic): a setup-generated charter allows autopilot.yaml on wf/setup-123 and refuses it on wf/LB-1.4", () => {
    assert.ok(charter !== null, "the generated charter does not parse");
    assert.deepEqual(protectedFindings(charter, ["autopilot.yaml"], "wf/setup-123"), { checked: 1, allowed: 1, errors: [] });
    assert.deepEqual(protectedFindings(charter, [".github/workflows/autopilot-ci.yml"], "wf/setup-123").errors, []);
    const refused = protectedFindings(charter, ["autopilot.yaml"], "wf/LB-1.4");
    assert.deepEqual(refused, {
      checked: 1, allowed: 0, errors: ["ERROR autopilot.yaml protected path changed on wf/LB-1.4"],
    });
  });
}

async function fillFlagChecks() {
  const charter = loadedTemplate();
  const inputs = (flags) => ({
    root: "/repo", charter, baseSha: "0".repeat(40), slug: "flags", release: [], promote: [], lanes: [],
    flags: { dryRun: false, shadow: false, supervised: false, requireApproval: false, ...flags },
    securityPersona: "", qaPersona: "", scriptsDir,
  });
  await check("fill-cycle (spec 2, current flags): --supervised fills a shadow run that does not wait for approval", () => {
    const config = buildConfig(inputs({ supervised: true }));
    assert.equal(config.shadow, true);
    assert.equal(config.requireApproval, false);
  });
  await check("fill-cycle (spec 2, current flags): --require-approval asks for approval without shadowing", () => {
    const config = buildConfig(inputs({ requireApproval: true }));
    assert.equal(config.requireApproval, true);
    assert.equal(config.shadow, false);
  });
  await check("fill-cycle (spec 2, current flags): a plain fill runs live with no approval wait", () => {
    const config = buildConfig(inputs({}));
    assert.equal(config.shadow, false);
    assert.equal(config.requireApproval, false);
  });
  await check("fill-cycle (spec 2, current flags): the CLI parses --supervised and --require-approval as separate flags", () => {
    const base = ["--repo", "/repo", "--charter", "/repo/autopilot.yaml", "--issues", "11", "--slug", "run-1", "--out", "/repo/out/filled.dwf.ts"];
    const both = parseFillArgs([...base, "--supervised", "--require-approval"]);
    assert.equal(both.kind, "fill");
    assert.equal(both.options.supervised, true);
    assert.equal(both.options.requireApproval, true);
    const supervised = parseFillArgs([...base, "--supervised"]);
    assert.equal(supervised.options.requireApproval, false);
  });
}

// 10. Template drift (spec section 7 item 3): the template copies its kit blocks verbatim, keeps one
// fill region, and carries every phase literal that the task-cycle contract names.
const PHASES = [
  "Release and promote", "Claim and orient", "Prepare worktree", "Baseline checks", "Done contract",
  "Implement and verify", "Independent review", "Publish", "Merge", "Close out", "Report",
];

function blockBetween(text, startMarker, endMarker) {
  const lines = text.split("\n");
  const starts = lines.flatMap((line, index) => (line.trimEnd() === startMarker ? [index] : []));
  const ends = lines.flatMap((line, index) => (line.trimEnd() === endMarker ? [index] : []));
  assert.equal(starts.length, 1, `${startMarker} must appear exactly once, found ${starts.length}`);
  assert.equal(ends.length, 1, `${endMarker} must appear exactly once, found ${ends.length}`);
  assert.ok(ends[0] > starts[0], `${endMarker} must follow ${startMarker}`);
  return lines.slice(starts[0], ends[0] + 1).join("\n");
}

async function templateDriftChecks() {
  const template = readText(templateFile);
  await check("template drift (spec 7, item 3): the persona-kit block is byte-identical to z-workflow/persona-kit.dwf.ts", () => {
    const canonical = blockBetween(readText(personaCanonical), "// persona-kit:start v4", "// persona-kit:end v4");
    assert.equal(blockBetween(template, "// persona-kit:start v4", "// persona-kit:end v4"), canonical);
  });
  await check("template drift (spec 7, item 3): the GitHub-kit block is byte-identical to shipflow/github-kit.dwf.ts", () => {
    const canonical = blockBetween(readText(kitCanonical), "// github-kit:start v1", "// github-kit:end v1");
    assert.equal(blockBetween(template, "// github-kit:start v1", "// github-kit:end v1"), canonical);
  });
  await check("template drift (spec 7, item 3): each fill marker appears exactly once and the start precedes the end", () => {
    const lines = template.split("\n");
    const count = (marker) => lines.filter((line) => line.trimEnd() === marker).length;
    assert.equal(count("// fill:start"), 1);
    assert.equal(count("// fill:end"), 1);
    assert.ok(lines.indexOf("// fill:start") < lines.indexOf("// fill:end"));
  });
  await check("template drift (spec 7, item 3): the eleven phase literals of the task-cycle contract are present as phase(\"...\") calls", () => {
    assert.equal(PHASES.length, 11);
    for (const name of PHASES) assert.ok(template.includes(`phase("${name}")`), `missing phase("${name}")`);
    const literals = new Set([...template.matchAll(/phase\("([^"]+)"\)/g)].map((match) => match[1]));
    assert.deepEqual([...literals].sort(), [...PHASES].sort());
  });
}

// 11. Type-check (spec section 7, item 9). The facade is taken from the dynamic-workflows skill between
// its facade-dts markers. The kit block is compiled as a script; the template is compiled inside a function
// body, as the runtime compiles a workflow script.
function facadeFrom(skillText) {
  const match = /<!-- facade-dts:start -->\s*```ts\n([\s\S]*?)```\s*<!-- facade-dts:end -->/.exec(skillText);
  assert.ok(match !== null, "the facade-dts markers were not found in the dynamic-workflows skill");
  return match[1];
}

function compileWith(tscPath, dir, name, file) {
  writeFileSync(join(dir, `${name}.tsconfig.json`), jsonOf({
    compilerOptions: {
      target: "ESNext", module: "ESNext", moduleResolution: "bundler", noEmit: true, strict: true,
      skipLibCheck: true, types: [], lib: ["ESNext"],
    },
    files: ["facade.d.ts", file],
  }));
  const run = sync([process.execPath, tscPath, "-p", join(dir, `${name}.tsconfig.json`)]);
  assert.equal(run.code, 0, `tsc reported errors for ${name}:\n${run.out}${run.err}`);
}

async function typeCheckChecks(tscPath) {
  const dir = tempDir("typecheck");
  const facade = facadeFrom(readText(skillDocument));
  await check("type-check (spec 7, item 9): the facade declarations are extracted from the dynamic-workflows skill", () => {
    assert.match(facade, /declare function phase\(name: string\): void;/);
  });
  await check("type-check (spec 7, item 9): the GitHub kit block compiles against the facade", () => {
    writeFileSync(join(dir, "facade.d.ts"), facade);
    writeFileSync(join(dir, "kit.ts"), `${blockBetween(readText(kitCanonical), "// github-kit:start v1", "// github-kit:end v1")}\n`);
    compileWith(tscPath, dir, "kit", "kit.ts");
  });
  await check("type-check (spec 7, item 9): the task-cycle template compiles against the facade inside a function body", () => {
    writeFileSync(join(dir, "facade.d.ts"), facade);
    writeFileSync(join(dir, "template.ts"), `async function __script() {\n${readText(templateFile)}\n}\n`);
    compileWith(tscPath, dir, "template", "template.ts");
  });
}

// The runner: every section runs even when an earlier one fails; temporary directories are removed.
async function section(name, run) {
  try {
    await run();
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  await section("charter", charterChecks);
  await section("detection", detectChecks);
  await section("hook policy", hookChecks);
  await section("hook CLI", hookCliChecks);
  await section("gate runner", gateChecks);
  await section("review poster", reviewChecks);
  await section("preview", previewChecks);
  await section("fill-cycle", fillChecks);
  await section("fill-cycle flags", fillFlagChecks);
  await section("setup offline", setupOfflineChecks);
  await section("setup protected rules", setupProtectedChecks);
  await section("setup against the fake GitHub", setupFakeChecks);
  await section("template drift", templateDriftChecks);
  const tscPath = process.env.TSC;
  if (tscPath) {
    await section("type-check", () => typeCheckChecks(tscPath));
  } else {
    console.log("type-check skipped: set TSC=<path to tsc.js>");
  }
} finally {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAILED ${failure}`);
  console.error(`Autopilot validation failed: ${failures.length} failing section or check(s), ${checks} checks passed.`);
  process.exitCode = 1;
} else {
  console.log(`Autopilot validation passed: ${checks} checks.`);
}
