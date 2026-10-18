// cleanup: removes what finished autopilot work leaves behind in the checkout and on GitHub. A
// run-owned worktree under .zflow/worktrees and a local or remote wf/ branch go only when the
// branch's pull request is merged or closed and the branch still points at that PR's head (or, for
// a local branch, at a commit the head contains). Everything else is kept and reported with a
// reason. Task cycles and setup already clean up after their own merges; this sweep catches what a
// crash, a failed lane closed later, or an older kit left. Exit 0 when the sweep ran (kept items
// are not errors), 1 when git or GitHub could not be read, 2 for usage errors.
//   bun cleanup.ts --repo <root> --gh-repo <owner/name> --login <builder> [--dry-run]
import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { loadKit, realWorld } from "./lib/kit.ts";

export interface Pr { number: number; state: string; head: string; headSha: string }
export interface GitResult { exitCode: number; stdout: string; stderr: string }

export interface CleanupDeps {
  git(root: string, args: string[]): GitResult;
  /** Every pull request with its head branch and head commit; null when GitHub cannot be read. */
  prs(): Promise<Pr[] | null>;
  /** Deletes a remote wf/ branch while it points at sha; returns the kit's outcome. */
  deleteRemote(branch: string, sha: string): Promise<string>;
}

export interface CleanupReport {
  ok: boolean;
  error: string;
  dryRun: boolean;
  removed: { worktrees: string[]; local: string[]; remote: string[] };
  kept: { item: string; reason: string }[];
}

const WF = /^wf\/[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
const SHA = /^[0-9a-f]{40}$/;

function lines(text: string): string[] {
  return text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
}

// The newest pull request per head branch.
function byHead(prs: Pr[]): Map<string, Pr> {
  const map = new Map<string, Pr>();
  for (const pr of [...prs].sort((a, b) => a.number - b.number)) map.set(pr.head, pr);
  return map;
}

// True when commit `tip` is the PR head or inside it. The head may be a commit GitHub made with
// update-branch, so it is fetched from the PR ref when it is not local.
function containedIn(deps: CleanupDeps, root: string, tip: string, pr: Pr): boolean {
  if (tip === pr.headSha) return true;
  if (deps.git(root, ["cat-file", "-e", `${pr.headSha}^{commit}`]).exitCode !== 0) {
    deps.git(root, ["fetch", "--quiet", "--no-tags", "origin", `refs/pull/${pr.number}/head`]);
  }
  return deps.git(root, ["merge-base", "--is-ancestor", tip, pr.headSha]).exitCode === 0;
}

export async function sweep(rootArg: string, deps: CleanupDeps, dryRun: boolean): Promise<CleanupReport> {
  // git reports real paths (macOS /var is /private/var), so the checkout is compared by its real path.
  const root = realpathSync(resolve(rootArg));
  const report: CleanupReport = { ok: true, error: "", dryRun, removed: { worktrees: [], local: [], remote: [] }, kept: [] };
  const fail = (error: string): CleanupReport => ({ ...report, ok: false, error });
  const keep = (item: string, reason: string): void => {
    report.kept.push({ item, reason });
  };

  const prs = await deps.prs();
  if (prs === null) return fail("pull requests could not be read");
  const heads = byHead(prs);
  if (!dryRun) deps.git(root, ["worktree", "prune"]);

  // Run-owned worktrees, by branch.
  const listing = deps.git(root, ["worktree", "list", "--porcelain"]);
  if (listing.exitCode !== 0) return fail("git worktree list failed");
  const owned = resolve(root, ".zflow", "worktrees") + sep;
  const worktreeOf = new Map<string, string>();
  let path = "";
  for (const line of listing.stdout.split("\n")) {
    if (line.startsWith("worktree ")) path = line.slice("worktree ".length);
    if (line.startsWith("branch refs/heads/") && path.startsWith(owned)) worktreeOf.set(line.slice("branch refs/heads/".length), path);
  }

  const refs = deps.git(root, ["for-each-ref", "--format=%(refname:short) %(objectname)", "refs/heads/wf/"]);
  if (refs.exitCode !== 0) return fail("git for-each-ref failed");
  const remoteList = deps.git(root, ["ls-remote", "--heads", "origin", "refs/heads/wf/*"]);
  if (remoteList.exitCode !== 0) return fail("git ls-remote failed");
  const remote = new Map<string, string>();
  for (const line of lines(remoteList.stdout)) {
    const [sha, ref] = line.split(/\s+/);
    if (SHA.test(sha) && ref.startsWith("refs/heads/")) remote.set(ref.slice("refs/heads/".length), sha);
  }

  for (const line of lines(refs.stdout)) {
    const [branch, tip] = line.split(" ");
    if (!WF.test(branch) || !SHA.test(tip)) continue;
    const pr = heads.get(branch);
    if (pr === undefined) {
      keep(branch, "no pull request has this branch as its head");
      continue;
    }
    if (pr.state === "OPEN") {
      keep(branch, `pull request #${pr.number} is open`);
      continue;
    }
    if (!containedIn(deps, root, tip, pr)) {
      keep(branch, `local commit ${tip.slice(0, 7)} is not in pull request #${pr.number}'s head`);
      continue;
    }
    const wt = worktreeOf.get(branch);
    if (wt !== undefined) {
      if (!dryRun && deps.git(root, ["worktree", "remove", wt]).exitCode !== 0) {
        keep(wt, "the worktree has uncommitted changes; the worktree and its local branch stay");
        continue;
      }
      report.removed.worktrees.push(wt);
    }
    if (!dryRun && deps.git(root, ["update-ref", "-d", `refs/heads/${branch}`, tip]).exitCode !== 0) {
      keep(branch, "the local branch moved while the sweep ran");
      continue;
    }
    report.removed.local.push(branch);
  }

  // Remote wf/ branches of finished pull requests, whether or not this checkout has them.
  for (const [branch, sha] of remote) {
    if (!WF.test(branch)) continue;
    const pr = heads.get(branch);
    if (pr === undefined || pr.state === "OPEN") continue;
    if (sha !== pr.headSha) {
      keep(`origin/${branch}`, `it moved past pull request #${pr.number}'s head`);
      continue;
    }
    const outcome = dryRun ? "deleted" : await deps.deleteRemote(branch, sha);
    if (outcome === "deleted" || outcome === "absent") report.removed.remote.push(branch);
    else keep(`origin/${branch}`, `delete returned ${outcome}`);
  }
  return report;
}

function parseArgs(argv: string[]): { repo: string; ghRepo: string; login: string; dryRun: boolean } | string {
  const value = (name: string): string | null => {
    const i = argv.indexOf(name);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const repo = value("--repo");
  const ghRepo = value("--gh-repo");
  const login = value("--login");
  if (repo === null || ghRepo === null || login === null) return "--repo, --gh-repo and --login are required";
  if (!/^[\w.-]+\/[\w.-]+$/.test(ghRepo)) return "--gh-repo must be owner/name";
  return { repo, ghRepo, login, dryRun: argv.includes("--dry-run") };
}

function realGit(root: string, args: string[]): GitResult {
  const proc = Bun.spawnSync(["git", "-C", root, ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  return { exitCode: proc.exitCode ?? 1, stdout: proc.stdout.toString(), stderr: proc.stderr.toString() };
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (typeof args === "string") {
    process.stderr.write(`cleanup: ${args}\nusage: bun cleanup.ts --repo <root> --gh-repo <owner/name> --login <builder> [--dry-run]\n`);
    return 2;
  }
  const kit = loadKit().makeGithubKit({
    repo: args.ghRepo, login: args.login, instance: "cleanup", prdIssue: 0, dryRun: args.dryRun,
    claimTtlSeconds: 60, attemptCap: 4, requiredChecks: [], writeRoot: resolve(args.repo, ".shipflow", "gh"),
    pollSeconds: 1, maxPolls: 1, assignee: "",
  });
  const deps: CleanupDeps = {
    git: realGit,
    async prs() {
      const run = await realWorld.run("gh", ["pr", "list", "-R", args.ghRepo, "--state", "all", "--limit", "1000", "--json", "number,state,headRefName,headRefOid"]);
      if (run.exitCode !== 0) return null;
      const data: unknown = JSON.parse(run.stdout);
      if (!Array.isArray(data)) return null;
      return data.map((p) => ({ number: Number(p.number), state: String(p.state), head: String(p.headRefName), headSha: String(p.headRefOid) }));
    },
    async deleteRemote(branch, sha) {
      return (await kit.deleteBranch(branch, sha)).outcome;
    },
  };
  const report = await sweep(args.repo, deps, args.dryRun);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  return report.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
