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
  // Engine artifacts: files an engine-run command regenerates in a worktree (lockfiles for
  // every stack, generated sources). They are never the agent's doing, so they never trip the
  // ownership gate; a lane commits one only when it owns it, and the candidate integrates
  // them once. Any known lockfile basename at any directory level is always an artifact.
  const LOCKFILE_BASENAMES = new Set(["bun.lock", "bun.lockb", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "cargo.lock", "go.sum", "uv.lock", "poetry.lock", "gemfile.lock", "composer.lock", "flake.lock", "pubspec.lock", "podfile.lock", "package.resolved", "mix.lock", "packages.lock.json", "gradle.lockfile"]);
  const lockfileBasename = (path: string): boolean => { const name = path.split("/").pop(); return name !== undefined && LOCKFILE_BASENAMES.has(name.toLowerCase()); };
  // A manifest an engine command rewrites alongside its lockfile (go mod tidy, cargo, ...) is
  // integrated with it, so delivery never carries a lockfile that disagrees with its manifest.
  const MANIFEST_BASENAMES = new Set(["package.json", "go.mod", "cargo.toml", "pyproject.toml", "gemfile", "composer.json", "flake.nix", "pubspec.yaml", "podfile", "package.swift", "mix.exs", "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts"]);
  const dependencyFile = (path: string): boolean => { const name = path.split("/").pop(); return lockfileBasename(path) || (name !== undefined && MANIFEST_BASENAMES.has(name.toLowerCase())); };
  const engineArtifacts = new Map<string, Set<string>>();
  const isArtifact = (cwd: string, path: string): boolean => engineArtifacts.get(cwd)?.has(path) === true || lockfileBasename(path);
  const parseStatusEntries = (raw: string): Map<string, string> => {
    const entries = new Map<string, string>();
    const chunks = raw.split("\0");
    for (let i = 0; i < chunks.length; i++) {
      const entry = chunks[i]; if (!entry) continue;
      entries.set(entry.slice(3), entry);
      if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
        const original = chunks[++i];
        if (original !== undefined && !entries.has(original)) entries.set(original, entry);
      }
    }
    return entries;
  };
  const dirtyEntries = async (cwd: string): Promise<Map<string, string>> =>
    parseStatusEntries(await gitAt(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]));
  // Records which dirty paths an engine-run command created or changed. Snapshots are taken
  // by the caller, inline, before and after the command — never through a wrapper closure:
  // function-valued indirection around world.run is the "callback registry" shape the platform
  // graph analyzer stalls on (V8-era lesson), so engine commands stay plain sequential calls.
  const recordArtifacts = (cwd: string, before: Map<string, string>, after: Map<string, string>): void => {
    const artifacts = engineArtifacts.get(cwd) ?? new Set<string>();
    engineArtifacts.set(cwd, artifacts);
    for (const [path, entry] of after) if (before.get(path) !== entry) artifacts.add(path);
  };
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
  // Teardown is total: it never throws, so a finally caller can rely on it. Dirty agent work is
  // committed first so blocked work stays recoverable from its branch; unowned engine artifacts
  // are derived files and are discarded with the worktree (no recovery commit, no noise
  // branch). Worktrees are removed and pruned. Branch reclamation belongs to the "Deliver and
  // clean up" phase, not teardown.
  const cleanupWorktrees = async (): Promise<string[]> => {
    const retained: string[] = [];
    while (createdWorktrees.length) {
      const worktree = createdWorktrees.pop()!;
      try {
        const dirty = await execute(worktree.path, "git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
        // Agent work is recoverable, including owned files an engine command once touched;
        // only unowned derived artifacts are left to vanish with the worktree.
        const owner = input.plan.areas.find((entry) => entry.id === worktree.area);
        const recoverable = dirty.exitCode === 0 ? [...parseStatusEntries(dirty.stdout).keys()].filter((path) => !isArtifact(worktree.path, path) || (owner !== undefined && v12Owns(owner, path))) : [];
        if (recoverable.length) {
          await gitAt(worktree.path, ["add", "--", ...recoverable]);
          await gitAt(worktree.path, ["commit", "-m", "V12: retain " + worktree.area + " work for recovery"]);
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
