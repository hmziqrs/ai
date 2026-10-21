// Reclaims worktrees/branches the V12 engine registered but could not tear down
// (stopped or killed runs). Only registry entries are touched, and only when the
// entry is V12-shaped (path sibling "-zv12-<token>-", branch under "z-v12/").
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

function git(cwd: string, args: string[]) {
  const r = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  return { code: r.exitCode ?? 1, out: r.stdout.toString() };
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

const keep: string[] = [];
for (const line of readFileSync(registry, "utf8").split("\n").filter(Boolean)) {
  let entry: { path?: string; branchRef?: string };
  try { entry = JSON.parse(line); } catch { keep.push(line); continue; }
  const shaped = typeof entry.path === "string" && entry.path.startsWith(repoRoot + "-zv12-") &&
    typeof entry.branchRef === "string" && entry.branchRef.startsWith("z-v12/");
  if (!shaped) { console.log(`skip (not V12-shaped): ${entry.path ?? line}`); keep.push(line); continue; }
  if (dry) { console.log(`would remove worktree ${entry.path} and branch ${entry.branchRef}`); keep.push(line); continue; }
  console.log(git(repoRoot, ["worktree", "remove", "--force", entry.path!]).code === 0
    ? `removed worktree ${entry.path}` : `worktree remove failed: ${entry.path}`);
  git(repoRoot, ["branch", "-D", entry.branchRef!]);
}
if (!dry) { git(repoRoot, ["worktree", "prune"]); if (keep.length) writeFileSync(registry, keep.join("\n") + "\n"); else rmSync(registry); }
