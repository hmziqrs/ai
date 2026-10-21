import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";

const root = join(import.meta.dir, "..");
const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });

function git(cwd: string, args: string[]) {
  const r = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode) throw new Error(r.stderr.toString());
  return r.stdout.toString().trim();
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "zv12-cleanup-")); dirs.push(dir);
  const repo = join(dir, "repo"); await mkdir(repo);
  git(repo, ["init", "-q", "-b", "main"]); git(repo, ["config", "user.email", "c@x"]); git(repo, ["config", "user.name", "c"]);
  await writeFile(join(repo, ".gitignore"), ".zcode/workflow-drafts/\n"); await writeFile(join(repo, "README.md"), "seed\n");
  git(repo, ["add", "."]); git(repo, ["commit", "-q", "-m", "seed"]);
  return { dir, repo, registry: join(repo, ".zcode/workflow-drafts", "worktrees.jsonl"), drafts: join(repo, ".zcode/workflow-drafts") };
}
function run(repo: string, flag?: string) {
  const r = Bun.spawnSync({ cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(root, "scripts/cleanup-worktrees.ts"), repo, ...(flag ? [flag] : [])], stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode, text: r.stdout.toString() + r.stderr.toString() };
}

test("reclaims only registered V12 worktrees; foreign worktrees and junk entries survive", async () => {
  const { dir, repo, registry, drafts } = await fixture(); await mkdir(drafts, { recursive: true });
  const engineWt = join(dir, basename(repo) + "-zv12-abc12345-20261021T120000000Z-api");
  const humanWt = join(dir, "human-experiment");
  git(repo, ["worktree", "add", "-q", "-b", "z-v12/abc12345-20261021T120000000Z/api", engineWt]);
  git(repo, ["worktree", "add", "-q", "-b", "human-branch", humanWt]);
  await writeFile(registry, [
    JSON.stringify({ path: engineWt, branchRef: "z-v12/abc12345-20261021T120000000Z/api", area: "api" }),
    JSON.stringify({ path: "/tmp/not-ours", branchRef: "main", area: "junk" }),
  ].join("\n") + "\n");

  const result = run(repo);
  expect(result.code).toBe(0);
  expect(result.text).toContain("removed worktree");
  expect(result.text).toContain("skip (not V12-shaped): /tmp/not-ours");
  expect(git(repo, ["worktree", "list"])).not.toContain("-zv12-");
  expect(git(repo, ["worktree", "list"])).toContain("human-experiment");
  expect(git(repo, ["branch", "--list", "z-v12/*"])).toBe("");
  expect(git(repo, ["branch", "--list", "human-branch"])).not.toBe("");
  const remaining = (await Bun.file(registry).text()).trim();
  expect(remaining).toContain("/tmp/not-ours");
  expect(remaining).not.toContain("-zv12-");
});

test("dry-run removes nothing and reports what it would do", async () => {
  const { dir, repo, registry, drafts } = await fixture(); await mkdir(drafts, { recursive: true });
  const engineWt = join(dir, basename(repo) + "-zv12-def67890-20261021T120000000Z-ui");
  git(repo, ["worktree", "add", "-q", "-b", "z-v12/def67890-20261021T120000000Z/ui", engineWt]);
  await writeFile(registry, JSON.stringify({ path: engineWt, branchRef: "z-v12/def67890-20261021T120000000Z/ui", area: "ui" }) + "\n");
  const result = run(repo, "--dry-run");
  expect(result.code).toBe(0);
  expect(result.text).toContain("would remove worktree");
  expect(git(repo, ["worktree", "list"])).toContain("-zv12-");
  expect(git(repo, ["branch", "--list", "z-v12/*"])).not.toBe("");
});

test("missing registry is a clean no-op", async () => {
  const { repo } = await fixture();
  const result = run(repo);
  expect(result.code).toBe(0);
  expect(result.text).toContain("registry empty");
});
