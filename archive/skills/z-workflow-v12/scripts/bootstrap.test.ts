import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

function git(cwd: string, args: string[]) {
  const r = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
}
let fixtureHome: string | undefined;
async function home() {
  if (!fixtureHome) {
    fixtureHome = await mkdtemp(join(tmpdir(), "zv12-bootstrap-home-")); dirs.push(fixtureHome);
    await writeFile(join(fixtureHome, ".gitconfig"), "[user]\n\tname = Bootstrap Fixture\n\temail = fixture@example.invalid\n");
  }
  return fixtureHome;
}
async function homeWith(gitconfig: string) {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-home-")); dirs.push(dir);
  await writeFile(join(dir, ".gitconfig"), gitconfig);
  return dir;
}
async function run(workspace: string, homeDir?: string) {
  const r = await Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(root, "scripts/bootstrap.ts"), workspace],
    env: { PATH: process.env.PATH, HOME: homeDir ?? await home() }, stdout: "pipe", stderr: "pipe", stdin: "ignore",
  });
  return { code: r.exitCode, text: r.stdout.toString() + r.stderr.toString() };
}
const IDENTITY = "[user]\n\tname = Bootstrap Fixture\n\temail = fixture@example.invalid\n";
// bootstrap strips GIT_* from its environment, so a machine-level /etc/gitconfig cannot be
// suppressed from here; derive the expectations that depend on it instead of assuming none.
const systemConfig = (key: string) => { const r = Bun.spawnSync({ cmd: ["git", "config", "--system", "--get", key], stdout: "pipe", stderr: "pipe" }); return r.exitCode === 0 ? r.stdout.toString().trim() : ""; };
const DEFAULT_BRANCH = systemConfig("init.defaultBranch") || "main";
const SYSTEM_IDENTITY = systemConfig("user.email") !== "";

test("a non-git directory with user files is initialized, preserved and committed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await writeFile(join(dir, "notes.md"), "user content\n");
  await mkdir(join(dir, "src"));
  await writeFile(join(dir, "src", "main.ts"), "export {};\n");
  const result = await run(dir);
  expect(result.code).toBe(0);
  const data = JSON.parse(result.text);
  expect(data.initialized).toBe(true);
  expect(data.gitignoreTouched).toBe(true);
  expect(data.repoRoot).toBe(await realpath(dir));
  expect(data.branchRef).toBe("refs/heads/" + DEFAULT_BRANCH);
  expect(data.baseCommit).toBe(git(dir, ["rev-parse", "HEAD"]));
  expect(git(dir, ["show", "HEAD:notes.md"])).toBe("user content");
  expect(git(dir, ["show", "HEAD:src/main.ts"])).toBe("export {};");
  expect(git(dir, ["check-ignore", "-q", ".zcode/workflow-drafts/probe.json"])).toBe("");
  expect(git(dir, ["log", "--format=%s", "HEAD"])).toBe("V12: initialize project baseline");
});

test("an unborn-HEAD repo with a user file gets a baseline commit preserving it", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "trunk"]);
  await writeFile(join(dir, "existing.txt"), "kept as found\n");
  const result = await run(dir);
  expect(result.code).toBe(0);
  const data = JSON.parse(result.text);
  expect(data.initialized).toBe(true);
  expect(data.branchRef).toBe("refs/heads/trunk");
  expect(git(dir, ["show", "HEAD:existing.txt"])).toBe("kept as found");
  expect(git(dir, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
});

test("a repo with existing commits is refused with state untouched", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "fixture@example.invalid"]);
  git(dir, ["config", "user.name", "Fixture"]);
  await writeFile(join(dir, "README.md"), "seed\n");
  git(dir, ["add", "."]); git(dir, ["commit", "-q", "-m", "seed"]);
  const head = git(dir, ["rev-parse", "HEAD"]);
  const result = await run(dir);
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("already initialized; V12 bootstrap only targets uninitialized checkouts");
  expect(git(dir, ["rev-parse", "HEAD"])).toBe(head);
  expect(git(dir, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
});

test("a detached HEAD is refused as a coordinator remedy", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "fixture@example.invalid"]);
  git(dir, ["config", "user.name", "Fixture"]);
  await writeFile(join(dir, "README.md"), "seed\n");
  git(dir, ["add", "."]); git(dir, ["commit", "-q", "-m", "seed"]);
  git(dir, ["checkout", "-q", "--detach"]);
  const result = await run(dir);
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("detached HEAD requires a coordinator remedy");
  expect(git(dir, ["status", "--porcelain"])).toBe("");
});

test("gitignore append preserves existing bytes and never duplicates the drafts line", async () => {
  const missing = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(missing);
  git(missing, ["init", "-q", "-b", "main"]);
  await writeFile(join(missing, ".gitignore"), "node_modules/");
  let result = await run(missing);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.text).gitignoreTouched).toBe(true);
  expect(await readFile(join(missing, ".gitignore"), "utf8")).toBe("node_modules/\n.zcode/workflow-drafts/\n");
  const present = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(present);
  git(present, ["init", "-q", "-b", "main"]);
  await writeFile(join(present, ".gitignore"), "node_modules/\n.zcode/workflow-drafts/\ndist/\n");
  result = await run(present);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.text).gitignoreTouched).toBe(false);
  expect(await readFile(join(present, ".gitignore"), "utf8")).toBe("node_modules/\n.zcode/workflow-drafts/\ndist/\n");
  expect((await readFile(join(present, ".gitignore"), "utf8")).split("\n").filter((line) => line === ".zcode/workflow-drafts/")).toHaveLength(1);
});

test("after bootstrap the checkout is clean, on a branch, with drafts ignored", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await mkdir(join(dir, "deep", "nested"), { recursive: true });
  await writeFile(join(dir, "deep", "nested", "leaf.txt"), "leaf\n");
  await writeFile(join(dir, "top.txt"), "top\n");
  const result = await run(dir);
  expect(result.code).toBe(0);
  expect(git(dir, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
  expect(git(dir, ["symbolic-ref", "HEAD"])).toBe("refs/heads/" + DEFAULT_BRANCH);
  expect(git(dir, ["check-ignore", "-q", ".zcode/workflow-drafts/probe.json"])).toBe("");
  const tree = git(dir, ["ls-tree", "-r", "--name-only", "HEAD"]);
  expect(tree).toContain("deep/nested/leaf.txt");
  expect(tree).toContain("top.txt");
});

test("a configured init.defaultBranch is honored for a non-git workspace", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await writeFile(join(dir, "app.txt"), "app\n");
  const result = await run(dir, await homeWith(IDENTITY + "[init]\n\tdefaultBranch = trunk\n"));
  expect(result.code).toBe(0);
  expect(JSON.parse(result.text).branchRef).toBe("refs/heads/trunk");
  expect(git(dir, ["symbolic-ref", "HEAD"])).toBe("refs/heads/trunk");
});

test("a broader existing ignore pattern already covering drafts is left untouched", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  await writeFile(join(dir, ".gitignore"), ".zcode/\n");
  const result = await run(dir);
  expect(result.code).toBe(0);
  expect(JSON.parse(result.text).gitignoreTouched).toBe(false);
  expect(await readFile(join(dir, ".gitignore"), "utf8")).toBe(".zcode/\n");
  expect(git(dir, ["check-ignore", "-q", ".zcode/workflow-drafts/probe.json"])).toBe("");
});

test("a CRLF gitignore without a trailing newline keeps its bytes and gains one LF-terminated line", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  await writeFile(join(dir, ".gitignore"), "*.log\r");
  const result = await run(dir);
  expect(result.code).toBe(0);
  expect(await readFile(join(dir, ".gitignore"), "utf8")).toBe("*.log\r\n.zcode/workflow-drafts/\n");
});

test.skipIf(SYSTEM_IDENTITY)("a missing Git identity surfaces Git's own error and leaves HEAD unborn", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await writeFile(join(dir, "app.txt"), "app\n");
  const result = await run(dir, await homeWith("[user]\n\tuseConfigOnly = true\n"));
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("baseline commit failed");
  expect(result.text).toMatch(/identity unknown|Please tell me who you are|user\.name|user\.email/);
  expect(Bun.spawnSync({ cmd: ["git", "rev-parse", "--verify", "HEAD"], cwd: dir, stdout: "pipe", stderr: "pipe" }).exitCode).not.toBe(0);
});

test("an empty workspace whose drafts are already ignored globally still gets a baseline commit", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  const home = await homeWith(IDENTITY);
  await writeFile(join(home, "excludes"), ".zcode/workflow-drafts/\n");
  await writeFile(join(home, ".gitconfig"), IDENTITY + "[core]\n\texcludesFile = " + join(home, "excludes") + "\n");
  const result = await run(dir, home);
  expect(result.code).toBe(0);
  const data = JSON.parse(result.text);
  expect(data.gitignoreTouched).toBe(false);
  expect(data.baseCommit).toBe(git(dir, ["rev-parse", "HEAD"]));
  expect(git(dir, ["ls-tree", "-r", "--name-only", "HEAD"])).toBe("");
});

test("unignored dependency directories are refused by name, then accepted once ignored", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await writeFile(join(dir, "index.js"), "// app\n");
  await mkdir(join(dir, "node_modules", "left-pad"), { recursive: true });
  await writeFile(join(dir, "node_modules", "left-pad", "index.js"), "module.exports = 1;\n");
  await mkdir(join(dir, "packages", "web", "node_modules", "dep"), { recursive: true });
  await writeFile(join(dir, "packages", "web", "node_modules", "dep", "index.js"), "module.exports = 2;\n");
  await mkdir(join(dir, "packages", "web", "src"), { recursive: true });
  await writeFile(join(dir, "packages", "web", "src", "main.js"), "// web\n");
  let result = await run(dir);
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("unignored dependency/build directories would enter the baseline: node_modules/, packages/web/node_modules/");
  expect(Bun.spawnSync({ cmd: ["git", "rev-parse", "--verify", "HEAD"], cwd: dir, stdout: "pipe", stderr: "pipe" }).exitCode).not.toBe(0);
  // the partial init (repo + drafts ignore) is resumed after the author adds the ignore rule
  await writeFile(join(dir, ".gitignore"), (await readFile(join(dir, ".gitignore"), "utf8")) + "node_modules/\n");
  result = await run(dir);
  expect(result.code).toBe(0);
  const tree = git(dir, ["ls-tree", "-r", "--name-only", "HEAD"]);
  expect(tree).toContain("index.js");
  expect(tree).toContain("packages/web/src/main.js");
  expect(tree).not.toContain("node_modules");
});

test("a Cargo target directory is refused only beside a root Cargo.toml", async () => {
  const rust = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(rust);
  await writeFile(join(rust, "Cargo.toml"), "[package]\nname = \"app\"\n");
  await mkdir(join(rust, "target", "debug"), { recursive: true });
  await writeFile(join(rust, "target", "debug", "app"), "binary\n");
  let result = await run(rust);
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("unignored dependency/build directories would enter the baseline: target/");
  const plain = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(plain);
  await mkdir(join(plain, "target"));
  await writeFile(join(plain, "target", "goals.md"), "source, not a build dir\n");
  result = await run(plain);
  expect(result.code).toBe(0);
  expect(git(plain, ["ls-tree", "-r", "--name-only", "HEAD"])).toContain("target/goals.md");
});

test("embedded repositories (with or without commits) are refused, and the partial init resumes once resolved", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  await writeFile(join(dir, "top.txt"), "top\n");
  await mkdir(join(dir, "child"));
  git(join(dir, "child"), ["init", "-q", "-b", "main"]);
  await writeFile(join(dir, "child", "inner.txt"), "inner\n");
  await mkdir(join(dir, "vendored"));
  git(join(dir, "vendored"), ["init", "-q", "-b", "main"]);
  await writeFile(join(dir, "vendored", "lib.txt"), "lib\n");
  git(join(dir, "vendored"), ["add", "."]);
  git(join(dir, "vendored"), ["-c", "user.name=f", "-c", "user.email=f@example.invalid", "commit", "-q", "-m", "seed"]);
  let result = await run(dir);
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("embedded Git repositories cannot be baselined (gitlink or unindexable): child/, vendored/");
  expect(Bun.spawnSync({ cmd: ["git", "rev-parse", "--verify", "HEAD"], cwd: dir, stdout: "pipe", stderr: "pipe" }).exitCode).not.toBe(0);
  expect(await readFile(join(dir, "child", "inner.txt"), "utf8")).toBe("inner\n");
  await rm(join(dir, "child", ".git"), { recursive: true, force: true });
  await rm(join(dir, "vendored", ".git"), { recursive: true, force: true });
  result = await run(dir);
  expect(result.code).toBe(0);
  const tree = git(dir, ["ls-tree", "-r", "--name-only", "HEAD"]);
  expect(tree).toContain("child/inner.txt");
  expect(tree).toContain("vendored/lib.txt");
  expect(git(dir, ["ls-tree", "HEAD"])).not.toContain("160000");
});

test("a nested directory inside an initialized repository is refused as already initialized", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zv12-bootstrap-")); dirs.push(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["config", "user.email", "fixture@example.invalid"]);
  git(dir, ["config", "user.name", "Fixture"]);
  await writeFile(join(dir, "README.md"), "seed\n");
  git(dir, ["add", "."]); git(dir, ["commit", "-q", "-m", "seed"]);
  await mkdir(join(dir, "packages", "app"), { recursive: true });
  const result = await run(join(dir, "packages", "app"));
  expect(result.code).not.toBe(0);
  expect(result.text).toContain("already initialized; V12 bootstrap only targets uninitialized checkouts");
  expect(git(dir, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
});
