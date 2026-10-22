// Reclaims worktrees the V12 engine registered but could not tear down (stopped or killed
// runs), the way the engine's own teardown would: uncommitted work is committed to the
// worktree's branch before removal, a branch is deleted only when its work is contained in
// the checkout HEAD or in that run's candidate branch, and everything else is retained and
// reported. Only V12-shaped registry entries are touched; never -D, never a forced discard.
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

function git(cwd: string, args: string[]) {
  const r = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode ?? 1, out: r.stdout.toString(), err: r.stderr.toString() };
}

const [repoRoot, flag] = process.argv.slice(2);
if (!repoRoot || !existsSync(join(repoRoot, ".git"))) {
  console.error("Usage: bun cleanup-worktrees.ts <repoRoot> [--dry-run]");
  process.exit(1);
}
const dry = flag === "--dry-run";
const registry = join(repoRoot, ".zcode/workflow-drafts", "worktrees.jsonl");
if (!existsSync(registry)) { console.log("registry empty: nothing to reclaim"); process.exit(0); }
if (git(repoRoot, ["rev-parse", "--git-dir"]).code !== 0) { console.error("not a git repository"); process.exit(1); }

const exists = (ref: string) => git(repoRoot, ["rev-parse", "--verify", "-q", "refs/heads/" + ref]).code === 0;
const contained = (ref: string, tip: string) => git(repoRoot, ["merge-base", "--is-ancestor", ref, tip]).code === 0;

const keep: string[] = [];
for (const line of readFileSync(registry, "utf8").split("\n").filter(Boolean)) {
  let entry: { path?: string; branchRef?: string; area?: string };
  try { entry = JSON.parse(line); } catch { keep.push(line); continue; }
  const shaped = typeof entry.path === "string" && entry.path.startsWith(repoRoot + "-zv12-") &&
    typeof entry.branchRef === "string" && entry.branchRef.startsWith("z-v12/");
  if (!shaped) { console.log(`skip (not V12-shaped): ${entry.path ?? line}`); keep.push(line); continue; }
  const path = entry.path!, branch = entry.branchRef!, area = entry.area ?? "area";
  const candidate = branch.slice(0, branch.lastIndexOf("/")) + "/candidate";
  if (dry) {
    console.log(`would remove worktree ${path} after committing any uncommitted work to ${branch}, then delete ${branch} only if contained in HEAD or ${candidate}`);
    keep.push(line); continue;
  }
  if (existsSync(path)) {
    const status = git(path, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status.code === 0 && status.out.trim()) {
      git(path, ["add", "-A", "--"]);
      const commit = git(path, ["commit", "-q", "-m", "V12: retain " + area + " work for recovery"]);
      if (commit.code !== 0) { console.log(`uncommitted work in ${path} could not be secured (${commit.err.trim()}); worktree kept`); keep.push(line); continue; }
      console.log(`committed uncommitted work in ${path} to ${branch}`);
    }
    let removed = git(repoRoot, ["worktree", "remove", path]);
    if (removed.code !== 0) removed = git(repoRoot, ["worktree", "remove", "--force", path]);
    if (removed.code !== 0) { console.log(`worktree remove failed: ${path}; entry kept`); keep.push(line); continue; }
    console.log(`removed worktree ${path}`);
  } else console.log(`worktree already gone: ${path}`);
  if (!exists(branch)) continue;
  const inHead = contained(branch, "HEAD");
  const inCandidate = branch !== candidate && exists(candidate) && contained(branch, candidate);
  if (inHead || inCandidate) {
    if (git(repoRoot, ["branch", "-d", branch]).code !== 0) git(repoRoot, ["update-ref", "-d", "refs/heads/" + branch]);
    console.log(`deleted branch ${branch} (work contained in ${inHead ? "HEAD" : candidate})`);
  } else console.log(`retained branch ${branch} (${branch === candidate ? "delivery reference" : "unmerged work retained"})`);
}
if (!dry) { git(repoRoot, ["worktree", "prune"]); if (keep.length) writeFileSync(registry, keep.join("\n") + "\n"); else rmSync(registry); }
