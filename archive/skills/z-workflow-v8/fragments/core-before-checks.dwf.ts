
  await anchors();
  const configuratorPersona = await v8Persona(input.skillRoot + "/personas/configurator.md", "pro", "read-only");
  const configurator = v8Agent(configuratorPersona, "V8 configurator", "Read-only configuration. Inspect only necessary task sources and supplied instructions. Do not read engine/helper/API sources or other workflow directories. Return configuration data only; no scripts, edits, Git mutations, tests, nested agents or workflows.");
  const configurationPrompt = [
    "Configure one thin per-area pipeline for this task. Return RunPlan only. Task: " + input.task,
    "Repository: " + input.repoRoot + "\nInstruction paths: " + JSON.stringify(input.instructionPaths),
    "RunPlan: {sharedContract:string,areas:AreaPlan[],setup:CommandPlan[],assembly:CommandPlan[],blockers:string[],notes:string[]}. Keep sharedContract, assignments and notes brief; reference the task instead of rewriting it or producing implementation pseudocode.",
    "Selected pieces: " + JSON.stringify(input.pieces) + ". Configure every selected verification kind in area.phases; unselected kinds are rejected. Mode: " + input.mode,
    "Use actual agent definitions (.zcode/agents/*.md or supplied personas), never .agents/skills/*/SKILL.md. All command owners including setup/assembly must be nonempty unique exact declared area IDs, never engine/global. Fix every instance of a named schema error using existing facts. Account for dependency-generated tracked files in ownedPaths and avoid unrooted data/ ignore patterns.",
    "An area may set role:'verify' to consume finished implementation areas through dependsOn, merge them into its own worktree, assemble/start a preview then perform requested browser/audit/device checks without any writer. Own only its separate evidence/helpers namespace, and do not assign repair authority to verify areas: report actionable defects instead. Put independent local unit tests/audits on their owning area so they start as soon as it is assembled, while unrelated writers continue. Integrated QA/audit verification areas depend on all actual app inputs; no cyclic phase dependencies.",
    "Each phase uses a selected kind (unit-tests, audit, browser, native-vision, mobile-vision), commands, optional personaPath, instructions citing explicit authority, and cleanup commands. Browser/device checks require a persona, exclusive resource, owned start/readiness/capture commands and cleanup that succeeds even after failure. Browser actors receive already-running loopback preview, isolated session, criteria/viewports and ignored evidence path. Native/mobile capture releases its device before separate Flash HIGH interpretation. No infrastructure stage is silently assumed; required helper scripts must be assigned to an implementation owner. Honor selection round policies and repair scope.",
    "Planning-only: return the requested compact plan in notes, with areas/setup/assembly empty. No mutation or writer dispatch. The planning piece reuses this one clean-context configurator; it is not a second planning handoff.",
    "AreaPlan: {id,title,personaPath (absolute specialist file),role?:'implement'|'verify',ownedPaths (safe relative files/directories, disjoint; directory trailing slash accepted),dependsOn (area IDs genuinely required BEFORE implementation),instructions,setup:CommandPlan[],assembly:CommandPlan[],phases?:AreaPhase[]}.",
    "CommandPlan: {tool:string,args:string[],owners:string[]}; name existing setup/build commands, no inline eval code, shell programs, Git, nested workflows or cwd arguments. Test runners, HTTP assertions, CRUD/persistence smokes and browser probes are checks even without test files; never relabel them assembly. Include them only in expressly authorized optional phases. Honor explicit user overrides of TASK.md/project check requirements.",
    "AreaPhase: {id,kind:'unit-tests'|'audit'|'browser'|'native-vision'|'mobile-vision',commands:CommandPlan[],personaPath?:string,instructions?:string,dependsOn?:string[],resource?:string,fixFindings?:boolean,cleanup?:CommandPlan[]}. Optional test/vision/audit phases MUST cite explicit user/project authorization in instructions; omit by default. Set fixFindings true ONLY with explicit authorized fixes, also cited there. Phase dependencies delay only that phase, not implementation. Resources name actual exclusive capture/device steps; release before separate image judgment. Read-only phase actors report findings, never edit source.",
    "Implementation dependsOn must reflect missing implementation inputs, never a later check/build. Agree the API/types in sharedContract so independent writers start together. A project-wide check/build that needs both areas belongs in global assembly, not an implementation dependency. Do not make frontend wait for backend merely because svelte-check or a build covers both.",
    "Every area and candidate have separate worktrees. Area setup runs before its writer, concurrently with other areas: declare required dependency/tool setup there so installed types are available during implementation. RunPlan.setup prepares the merged candidate before integration assembly. Never share writable node_modules. Setup failures stop only their consumers. Do not put the same setup command in assembly; if the task changes dependencies, declare its appropriate post-edit resolution command and owned lockfile explicitly. Use frozen lockfile setup when compatible with the task.",
    "The engine owns setup, dependency installation, project-wide checking/building and optional checks. Writers own implementation only; do not tell them to run any of those commands. Mandatory framework compiler assistance on changed files is implementation tooling, not an extra clean round. No HTTP/CRUD/persistence smokes or ad hoc inline programs in a writer task. Explicit scope overrides persona/skill check recommendations.",
    "Each area implements, immediately runs its assembly and authorized phases, and completes independently; do not impose a whole-app barrier. Global assembly only for a real integration join. Minimal scope, persistent specialist per area, no plan review."
  ].join("\n");
  let plan: RunPlan | undefined;
  let configurationError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const proposed = await guardWrites(configuratorPersona, input.repoRoot, async () => await configurator.ask<RunPlan>(configurationPrompt + (configurationError ? "\nCorrect only the invalid configuration fields in your previous RunPlan. Keep the same task scope and independent areas; no fresh exploration or plan review. Validator: " + configurationError : "")));
    try { v8ValidatePlan(proposed, input); plan = proposed; break; }
    catch (error) {
      configurationError = error instanceof Error ? error.message : String(error);
      report({ area: "configuration", step: "validation", status: attempt === 0 ? "retrying" : "blocked", message: configurationError });
    }
  }
  await anchors();
  if (!plan) return { status: "incomplete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: ["Invalid configuration after one correction: " + configurationError], notes: [], callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
  if (input.mode === "plan" || plan.blockers.length || !plan.areas.length) return { status: plan.blockers.length ? "incomplete" : "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: plan.blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
  phase("Run each ready area through its own phases");
  await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", branch, candidate, input.baseCommit]));
  for (const area of plan.areas) completed.set(area.id, new Promise<AreaResult>((resolve) => resolveArea.set(area.id, resolve)));
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
      if (!v8Owns(area, path)) throw new Error("Changed path outside ownership: " + path);
      paths.push(path);
      if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
        const original = chunks[++i];
        if (!v8Owns(area, original)) throw new Error("Rename source outside ownership: " + original);
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
      await gitAt(cwd, ["commit", "-m", "V8: " + area.id + " revision " + (revisions.get(area.id) ?? 0)]);
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
      if (Array.isArray(work?.changedPaths) && work.changedPaths.some((path) => typeof path === "string" && !v8Owns(area, path))) throw new Error("Actor reported unsafe changed path");
      try { v8ValidateWork(work); }
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
  const runCommandsRaw = async (commands: CommandPlan[], cwd: string): Promise<string> => {
    for (const command of commands) {
      const out = await execute(cwd, command.tool, command.args);
      if (out.exitCode !== 0) return JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
    }
    return "";
  };
  const runCommands = async (commands: CommandPlan[], cwd: string, resource?: string): Promise<string> => {
    if (!resource) return await runCommandsRaw(commands, cwd);
    const next = (resourceTails.get(resource) ?? Promise.resolve()).then(async () => await runCommandsRaw(commands, cwd));
    resourceTails.set(resource, next.catch(() => undefined)); return await next;
  };
  const assembleArea = async (area: AreaPlan, cwd: string, commands: CommandPlan[], step: string, resource?: string): Promise<string> => {
    for (;;) {
      event(area.id, step, "running");
      const error = await runCommands(commands, cwd, resource);
      if (!error) { event(area.id, step, "ready"); return ""; }
      const before = await fingerprint(area, cwd);
      const work = await askWork(area, cwd, "Correct only this blocking required assembly failure, in your owned paths at " + cwd + ". No audits, tests, unrelated fixes, Git or nested workflows. Return AreaWork.\n" + error);
      if (work.blockers.length) return v8BlockerText(work);
      if (await fingerprint(area, cwd) === before) {
        const retry = await runCommands(commands, cwd, resource);
        if (!retry) { event(area.id, step, "ready"); return ""; }
        return "No changed progress correcting assembly: " + retry;
      }
    }
  };
  const waitDependencies = async (ids: string[], cwd: string): Promise<string> => {
    const dependencies = await Promise.all(ids.map((id) => completed.get(id)!));
    const blocked = dependencies.find((result) => result.status !== "ready");
    if (blocked) return "Dependency blocked: " + blocked.id;
    for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
    return "";
  };
  const pieceRounds = new Map<string, number>();
  const phaseContexts = new Map<string, { persona: Persona; actor: Agent }>();
  const runAreaPhases = async (area: AreaPlan, cwd: string, result: AreaResult): Promise<void> => {
    let index = 0;
    while (index < (area.phases ?? []).length) {
      const step = area.phases![index];
      const selection = input.pieces.find((piece) => piece.name === step.kind)!;
      const roundKey = area.id + ":" + step.id;
      const round = (pieceRounds.get(roundKey) ?? 0) + 1; pieceRounds.set(roundKey, round);
      report({area:area.id,piece:step.kind,round,authorization:selection.authorization});
        const dependencyError = await waitDependencies(step.dependsOn ?? [], cwd);
        if (dependencyError) throw new Error(dependencyError);
        event(area.id, step.id, "running");
        let commandError = "";
        let phaseProblems: string[] = [];
