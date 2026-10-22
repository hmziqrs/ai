  let gitTail: Promise<unknown> = Promise.resolve();
  const resourceTails = new Map<string, Promise<unknown>>();
  const serializeGit = async <T>(work: () => Promise<T>): Promise<T> => {
    const next = gitTail.then(work); gitTail = next.catch(() => undefined); return await next;
  };
  const execute = async (cwd: string, tool: string, argv: string[]): Promise<WorldRunResult> =>
    await world.run("sh", ["-c", 'cd "$1" && shift && exec "$@"', "sh", cwd, tool, ...argv], { timeoutMs: 300000 });
  const checked = async (cwd: string, tool: string, argv: string[]): Promise<string> => {
    const out = await execute(cwd, tool, argv);
    if (out.exitCode !== 0) throw new Error(tool + " " + argv.slice(0, 3).join(" ") + ": " + (out.stderr + out.stdout).slice(-12000));
    return out.stdout;
  };
  const gitAt = async (cwd: string, argv: string[]): Promise<string> => await checked(cwd, "git", argv);
  const token = input.baseCommit.slice(0, 8) + "-" + input.startedAt.replace(/[^a-zA-Z0-9]/g, "");
  const prefix = "z-v12/" + token;
  const root = input.repoRoot + "-zv12-" + token;
  const candidate = root + "-candidate";
  const branch = prefix + "/candidate";
  let firstImplementationAt = "";
  let firstStamp: Promise<string> | undefined;
  const timestamp = async (): Promise<string> => {
    const out = await world.run("date", ["-u", "+%Y-%m-%dT%H:%M:%SZ"]);
    if (out.exitCode !== 0) throw new Error("Could not record run timestamp: " + out.stderr);
    return out.stdout.trim();
  };
  const completed = new Map<string, Promise<AreaResult>>();
  const resolveArea = new Map<string, (result: AreaResult) => void>();
  const committed = new Map<string, Promise<AreaResult>>();
  const resolveCommitted = new Map<string, (result: AreaResult) => void>();
  const contexts = new Map<string, Agent>();
  const results = new Map<string, AreaResult>();
  const revisions = new Map<string, number>();
  const observations = new Map<string, string[]>();
  const event = (area: string, step: string, status: string, evidence?: string): void => {
    const item = { area, step, revision: revisions.get(area) ?? 0, status };
    if (evidence === undefined) report(item);
    else report({ ...item, evidence });
  };
  const anchors = async (): Promise<void> => {
    const head = (await gitAt(input.repoRoot, ["rev-parse", "HEAD"])).trim();
    const ref = (await gitAt(input.repoRoot, ["symbolic-ref", "-q", "HEAD"])).trim();
    const status = await gitAt(input.repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (head !== input.baseCommit || ref !== input.branchRef || status !== "") throw new Error("Checkout anchors changed; no worktree mutation performed");
  };
  const createdWorktrees: { path: string; branchRef: string; area: string }[] = [];
  // Persistent registry: survives stopped/killed runs so cleanup-worktrees.ts reclaims exactly
  // these entries. Best-effort writes; entries are removed as teardown reclaims each worktree.
  const registryFile = input.repoRoot + "/.zcode/workflow-drafts/worktrees.jsonl";
  const registryEntry = (worktree: { path: string; branchRef: string; area: string }): string => JSON.stringify(worktree);
  const registryAdd = async (worktree: { path: string; branchRef: string; area: string }): Promise<void> => {
    await execute(input.repoRoot, "sh", ["-c", "printf '%s\\n' \"$1\" >>\"$2\"", "sh", registryEntry(worktree), registryFile]);
  };
  const registryRemove = async (worktree: { path: string; branchRef: string; area: string }): Promise<void> => {
    await execute(input.repoRoot, "sh", ["-c", "grep -Fvx \"$1\" \"$2\" >\"$2.part\" || true; mv \"$2.part\" \"$2\"", "sh", registryEntry(worktree), registryFile]);
  };
  // Teardown is total: it never throws, so a finally caller can rely on it. Dirty worktrees are
  // committed first so blocked work stays recoverable from its branch; worktrees are removed and
  // pruned. Branch reclamation belongs to the "Deliver and clean up" phase, not teardown.
  const cleanupWorktrees = async (): Promise<string[]> => {
    const retained: string[] = [];
    while (createdWorktrees.length) {
      const worktree = createdWorktrees.pop()!;
      try {
        const dirty = await execute(worktree.path, "git", ["status", "--porcelain=v1", "--untracked-files=all"]);
        if (dirty.exitCode === 0 && dirty.stdout.trim()) {
          await gitAt(worktree.path, ["add", "-A", "--"]);
          await gitAt(worktree.path, ["commit", "-m", "V12: retain " + worktree.area + " work for recovery", "--allow-empty"]);
        }
        let removed = await execute(input.repoRoot, "git", ["worktree", "remove", worktree.path]);
        if (removed.exitCode !== 0) removed = await execute(input.repoRoot, "git", ["worktree", "remove", "--force", worktree.path]);
        if (removed.exitCode !== 0) { retained.push(worktree.branchRef + " (worktree kept: remove failed)"); continue; }
        await registryRemove(worktree);
      } catch (error) {
        retained.push(worktree.branchRef + " (cleanup failed: " + String(error).slice(0, 200) + ")");
      }
    }
    try { await gitAt(input.repoRoot, ["worktree", "prune"]); } catch { }
    return retained;
  };
