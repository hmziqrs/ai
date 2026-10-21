  if (input.mode === "plan") return { status: "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: [], notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp(), retainedBranches: [] };
  phase("Run each ready area through its own phases");
  await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", branch, candidate, input.baseCommit]));
  createdWorktrees.push({ path: candidate, branchRef: branch, area: "candidate" });
  await registryAdd({ path: candidate, branchRef: branch, area: "candidate" });
  const result: RunResult = { status: "incomplete", candidateBranch: branch, candidateWorktree: candidate, candidateCommit: "", areas: [], blockers: [], notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: "", retainedBranches: [] };
  // The engine tail lives in one inner function closed by core-after-checks; teardown wraps the
  // call (catch-based, never a long try/finally span: the platform graph projector overflows on
  // those, as V8's composition notes warned for callback registries).
  const runEngine = async (): Promise<RunResult> => {
  for (const area of plan.areas) {
    committed.set(area.id, new Promise<AreaResult>((resolve) => resolveCommitted.set(area.id, resolve)));
    completed.set(area.id, new Promise<AreaResult>((resolve) => resolveArea.set(area.id, resolve)));
  }
  const merge = async (cwd: string, commit: string): Promise<void> => {
    const out = await execute(cwd, "git", ["merge", "--no-edit", "--no-ff", commit]);
    if (out.exitCode === 0) return;
    const pending = await execute(cwd, "git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]);
    if (pending.exitCode === 0) await gitAt(cwd, ["merge", "--abort"]);
    throw new Error("Run-owned merge failed; partial work retained: " + (out.stderr + out.stdout).slice(-12000));
  };
  const statusPaths = async (area: AreaPlan, cwd: string): Promise<string[]> => {
    const raw = await gitAt(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const chunks = raw.split("\0"); const paths: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const entry = chunks[i]; if (!entry) continue;
      const path = entry.slice(3);
      if (!v12Owns(area, path)) throw new Error("Changed path outside ownership: " + path);
      paths.push(path);
      if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
        const original = chunks[++i];
        if (!v12Owns(area, original)) throw new Error("Rename source outside ownership: " + original);
        paths.push(original);
      }
    }
    return [...new Set(paths)];
  };
  const fingerprint = async (area: AreaPlan, cwd: string): Promise<string> => {
    const paths = await statusPaths(area, cwd);
    const diff = await gitAt(cwd, ["diff", "HEAD", "--binary"]);
    const hashes: string[] = [];
    for (const path of paths) {
      const out = await execute(cwd, "git", ["hash-object", "--", path]);
      hashes.push(path + ":" + (out.exitCode === 0 ? out.stdout.trim() : "<deleted>"));
    }
    return diff + JSON.stringify(hashes);
  };
  const commitArea = async (area: AreaPlan, cwd: string): Promise<string> => await serializeGit(async () => {
    const paths = await statusPaths(area, cwd);
    if (paths.length) {
      await gitAt(cwd, ["add", "--", ...paths]);
      await gitAt(cwd, ["commit", "-m", "V12: " + area.id + " revision " + (revisions.get(area.id) ?? 0)]);
    }
    return (await gitAt(cwd, ["rev-parse", "HEAD"])).trim();
  });
  const workContract = "Return AreaWork only: {status:'implemented'|'blocked',changedPaths:string[],summary:string,blockers:{kind:'input'|'permission'|'environment'|'implementation',detail:string}[],observations:string[]}. Summary is a brief result, not a file-by-file report, repeated task, version inventory or check transcript. Implemented means owned implementation is finished and blockers is empty. Blocked means an actual unmet requirement prevents completing implementation; name it concretely. Engine checks not yet run, excluded tests, assumptions and residual risks belong in observations and do not block implementation. Setup/assembly/optional checks belong to the engine; do not run or repeat them yourself. Batch independent source reads; use prepared local types. No audits, test execution, HTTP/CRUD smokes, source eval programs, Git, nested agents or workflows. Mandatory framework compiler assistance is limited to edited files; do not repeat passed compiler checks on unchanged files.";
  const askWork = async (area: AreaPlan, cwd: string, prompt: string): Promise<AreaWork> => {
    revisions.set(area.id, (revisions.get(area.id) ?? 0) + 1);
    event(area.id, "implementation", "running");
    if (!firstStamp) firstStamp = timestamp();
    firstImplementationAt = await firstStamp;
    const actor = contexts.get(area.id)!;
    let feedback = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const work = await actor.ask<AreaWork>(attempt === 0 ? prompt + "\n" + workContract :
        "Correct only the completion report from your previous response using facts already available. No tools, file edits, new exploration, rechecks or longer report. Classify deferred engine checks and residual risks as observations; retain genuine unmet requirements as blockers. " + workContract + "\nValidator: " + feedback);
      // Actual write ownership is checked even if the reported result is malformed.
      await statusPaths(area, cwd);
      if (Array.isArray(work?.changedPaths) && work.changedPaths.some((path) => typeof path === "string" && !v12Owns(area, path))) throw new Error("Actor reported unsafe changed path");
      try { v12ValidateWork(work); }
      catch (error) {
        feedback = error instanceof Error ? error.message : String(error);
        event(area.id, "completion-report", attempt === 0 ? "clarifying" : "blocked");
        if (attempt === 0) continue;
        throw new Error("Invalid completion report after one clarification: " + feedback);
      }
      const notes = observations.get(area.id)!;
      for (const observation of work.observations) if (!notes.includes(observation)) notes.push(observation);
      return work;
    }
    throw new Error("No valid completion report");
  };
  const runCommandsRaw = async (commands: CommandPlan[], cwd: string, evidenceTag: string): Promise<string> => {
    for (const command of commands) {
      const out = await execute(cwd, "bun", ["--no-env-file", "--config=/dev/null", input.skillRoot + "/scripts/run-command.ts", command.tool, JSON.stringify(command.args), evidenceTag]);
      if (out.exitCode !== 0) return JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
    }
    return "";
  };
  const runCommands = async (commands: CommandPlan[], cwd: string, resource?: string, evidenceTag: string = "gates"): Promise<string> => {
    if (!resource) return await runCommandsRaw(commands, cwd, evidenceTag);
    const next = (resourceTails.get(resource) ?? Promise.resolve()).then(async () => await runCommandsRaw(commands, cwd, evidenceTag));
    resourceTails.set(resource, next.catch(() => undefined)); return await next;
  };
  const assembleArea = async (area: AreaPlan, cwd: string, commands: CommandPlan[], step: string, resource?: string): Promise<string> => {
    for (;;) {
      event(area.id, step, "running");
      const error = await runCommands(commands, cwd, resource);
      if (!error) { event(area.id, step, "ready"); return ""; }
      const before = await fingerprint(area, cwd);
      const work = await askWork(area, cwd, "Correct only this blocking required assembly failure, in your owned paths at " + cwd + ". No audits, tests, unrelated fixes, Git or nested workflows. Return AreaWork.\n" + error);
      if (work.blockers.length) return v12BlockerText(work);
      if (await fingerprint(area, cwd) === before) {
        const retry = await runCommands(commands, cwd, resource);
        if (!retry) { event(area.id, step, "ready"); return ""; }
        return "No changed progress correcting assembly: " + retry;
      }
    }
  };
  const waitDependencies = async (ids: string[], cwd: string): Promise<string> => {
    const dependencies = await Promise.all(ids.map((id) => committed.get(id)!));
    const blocked = dependencies.find((result) => result.status !== "ready");
    if (blocked) return "Dependency blocked: " + blocked.id;
    for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
    return "";
  };
  const pieceRounds = new Map<string, number>();
  const phaseContexts = new Map<string, { persona: Persona; actor: Agent }>();
