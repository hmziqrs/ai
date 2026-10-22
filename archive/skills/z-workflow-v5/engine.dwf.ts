// zflow-v5: fixed per-area pipeline; task configuration is data, never authored code.
interface RunInput {
  repoRoot: string; task: string; baseCommit: string; branchRef: string;
  startedAt: string; skillRoot: string; instructionPaths: string[];
}
interface CommandPlan { tool: string; args: string[]; owners: string[] }
interface AreaPhase {
  id: string; kind: "assembly" | "test" | "vision" | "audit";
  commands: CommandPlan[]; personaPath?: string; instructions?: string;
  dependsOn?: string[]; resource?: string; fixFindings?: boolean;
}
interface AreaPlan {
  id: string; title: string; personaPath: string; ownedPaths: string[];
  dependsOn: string[]; instructions: string; assembly: CommandPlan[]; phases?: AreaPhase[];
}
interface RunPlan { sharedContract: string; areas: AreaPlan[]; assembly: CommandPlan[]; blockers: string[]; notes: string[] }
interface AreaWork { changedPaths: string[]; summary: string; blockers: string[] }
interface PhaseWork { summary: string; blockers: string[]; findings: string[] }
interface AreaResult { id: string; status: "ready" | "blocked"; branch: string; worktree: string; commit: string; summary: string; blockers: string[]; findings: string[] }
interface RunResult { status: "complete" | "incomplete"; candidateBranch: string; candidateWorktree: string; candidateCommit: string; areas: AreaResult[]; blockers: string[]; notes: string[]; callerStartedAt: string; firstImplementationAt: string; completedAt: string }

function v5SafePath(path: string): boolean {
  return typeof path === "string" && path !== "" && !path.startsWith("/") && !path.includes("\\") &&
    !/[\x00-\x1f\x7f]/.test(path) && path.split("/").every((p) => p !== "" && p !== "." && p !== ".." && p.toLowerCase() !== ".git");
}
function v5Owns(area: AreaPlan, path: string): boolean {
  return v5SafePath(path) && area.ownedPaths.some((root) => path === root || path.startsWith(root + "/"));
}
function v5ValidatePlan(plan: RunPlan): void {
  if (!plan || !Array.isArray(plan.areas) || typeof plan.sharedContract !== "string" || !Array.isArray(plan.blockers) || !Array.isArray(plan.notes)) throw new Error("Invalid RunPlan");
  const ids = new Set<string>();
  for (const area of plan.areas) {
    if (!/^[a-z][a-z0-9-]*$/.test(area.id) || ids.has(area.id)) throw new Error("Invalid or duplicate area ID: " + area.id);
    ids.add(area.id);
    if (!area.personaPath.startsWith("/") || !area.title.trim() || !area.instructions.trim() || !Array.isArray(area.ownedPaths) || !area.ownedPaths.length || area.ownedPaths.some((p) => !v5SafePath(p))) throw new Error("Invalid area: " + area.id);
    if (!Array.isArray(area.dependsOn) || !Array.isArray(area.assembly)) throw new Error("Invalid area dependencies/assembly: " + area.id);
    const phaseIds = new Set<string>();
    for (const step of area.phases ?? []) {
      if (!/^[a-z][a-z0-9-]*$/.test(step.id) || phaseIds.has(step.id) || !["assembly", "test", "vision", "audit"].includes(step.kind)) throw new Error("Invalid phase in " + area.id);
      phaseIds.add(step.id);
      if (step.personaPath !== undefined && !step.personaPath.startsWith("/")) throw new Error("Phase persona path must be absolute");
      if (step.kind !== "assembly" && !step.instructions?.trim()) throw new Error("Optional phase requires instructions citing its user/project authorization");
      if (step.fixFindings && !step.instructions?.trim()) throw new Error("Phase fixes require explicit authorization in instructions");
      if (step.personaPath && !step.instructions?.trim()) throw new Error("Phase actor requires instructions");
      if (step.resource !== undefined && !/^[a-z][a-z0-9-]*$/.test(step.resource)) throw new Error("Invalid exclusive resource");
    }
  }
  const checkCommands = (commands: CommandPlan[]): void => {
    if (!Array.isArray(commands)) throw new Error("Invalid command list");
    for (const command of commands) {
      if (!/^[A-Za-z0-9_./+-]+$/.test(command.tool) || /(^|\/)git$/.test(command.tool) || !Array.isArray(command.args) || command.args.some((s) => typeof s !== "string" || s.includes("\0")) || !Array.isArray(command.owners) || !command.owners.length || command.owners.some((id) => !ids.has(id))) throw new Error("Invalid command or owners");
    }
  };
  for (let i = 0; i < plan.areas.length; i++) {
    const area = plan.areas[i];
    checkCommands(area.assembly);
    for (const step of area.phases ?? []) checkCommands(step.commands);
    for (let j = 0; j < i; j++) for (const a of area.ownedPaths) for (const b of plan.areas[j].ownedPaths) {
      if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/")) throw new Error("Overlapping ownership: " + area.id + "/" + plan.areas[j].id);
    }
  }
  checkCommands(plan.assembly);
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => {
    if (!ids.has(id)) throw new Error("Unknown dependency: " + id);
    if (visiting.has(id)) throw new Error("Dependency cycle: " + id);
    if (visited.has(id)) return;
    visiting.add(id);
    const area = plan.areas.find((a) => a.id === id)!;
    for (const dependency of [...area.dependsOn, ...(area.phases ?? []).flatMap((p) => p.dependsOn ?? [])]) visit(dependency);
    visiting.delete(id); visited.add(id);
  };
  for (const area of plan.areas) visit(area.id);
}

async function runV5(input: RunInput): Promise<RunResult> {
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
  const prefix = "z-v5/" + token;
  const root = input.repoRoot + "-zv5-" + token;
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
  const contexts = new Map<string, Agent>();
  const results = new Map<string, AreaResult>();
  const revisions = new Map<string, number>();
  const event = (area: string, step: string, status: string): void => {
    report({ area, step, revision: revisions.get(area) ?? 0, status });
  };
  const anchors = async (): Promise<void> => {
    const head = (await gitAt(input.repoRoot, ["rev-parse", "HEAD"])).trim();
    const ref = (await gitAt(input.repoRoot, ["symbolic-ref", "-q", "HEAD"])).trim();
    const status = await gitAt(input.repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (head !== input.baseCommit || ref !== input.branchRef || status !== "") throw new Error("Checkout anchors changed; no worktree mutation performed");
  };
  phase("Configure the area pipeline");
  await anchors();
  const configuratorPersona = await v5Persona(input.skillRoot + "/personas/configurator.md", "pro", "read-only");
  const configurator = v5Agent(configuratorPersona, "V5 configurator", "Read-only configuration. Inspect only necessary task sources and supplied instructions. Do not read engine/helper/API sources or other workflow directories. Return configuration data only; no scripts, edits, Git mutations, tests, nested agents or workflows.");
  const plan = await guardWrites(configuratorPersona, input.repoRoot, async () => await configurator.ask<RunPlan>([
    "Configure one thin per-area pipeline for this task. Return RunPlan only. Task: " + input.task,
    "Repository: " + input.repoRoot + "\nInstruction paths: " + JSON.stringify(input.instructionPaths),
    "RunPlan: {sharedContract:string,areas:AreaPlan[],assembly:CommandPlan[],blockers:string[],notes:string[]}.",
    "AreaPlan: {id,title,personaPath (absolute specialist file),ownedPaths (safe relative files/directories, disjoint),dependsOn (area IDs required BEFORE implementation),instructions,assembly:CommandPlan[],phases?:AreaPhase[]}.",
    "CommandPlan: {tool:string,args:string[],owners:string[]}; no shell strings, Git, nested workflows or cwd arguments. Use only requested/necessary assembly commands; dependency setup is in scope when required, isolated per worktree. Never share a writable node_modules symlink.",
    "AreaPhase: {id,kind:'assembly'|'test'|'vision'|'audit',commands:CommandPlan[],personaPath?:string,instructions?:string,dependsOn?:string[],resource?:string,fixFindings?:boolean}. Optional test/vision/audit phases MUST cite explicit user/project authorization in instructions; omit by default. Set fixFindings true ONLY with explicit authorized fixes, also cited there. Phase dependencies delay only that phase, not implementation. Resources name actual exclusive capture/device steps; release before separate image judgment. Read-only phase actors report findings, never edit source.",
    "Each area implements, immediately runs its assembly and authorized phases, and completes independently; do not impose a whole-app barrier. Global assembly only for a real integration join. Include required dependency installation before assembly rather than assuming node_modules exists. Minimal scope, persistent specialist per area, no plan review."
  ].join("\n")));
  v5ValidatePlan(plan);
  await anchors();
  if (plan.blockers.length || !plan.areas.length) return { status: plan.blockers.length ? "incomplete" : "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: plan.blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
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
      if (!v5Owns(area, path)) throw new Error("Changed path outside ownership: " + path);
      paths.push(path);
      if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
        const original = chunks[++i];
        if (!v5Owns(area, original)) throw new Error("Rename source outside ownership: " + original);
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
      await gitAt(cwd, ["commit", "-m", "V5: " + area.id + " revision " + (revisions.get(area.id) ?? 0)]);
    }
    return (await gitAt(cwd, ["rev-parse", "HEAD"])).trim();
  });
  const askWork = async (area: AreaPlan, cwd: string, prompt: string): Promise<AreaWork> => {
    revisions.set(area.id, (revisions.get(area.id) ?? 0) + 1);
    event(area.id, "implementation", "running");
    if (!firstStamp) firstStamp = timestamp();
    firstImplementationAt = await firstStamp;
    const work = await contexts.get(area.id)!.ask<AreaWork>(prompt);
    if (!Array.isArray(work.changedPaths) || work.changedPaths.some((path) => !v5Owns(area, path))) throw new Error("Actor reported unsafe changed path");
    await statusPaths(area, cwd);
    return work;
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
      if (work.blockers.length) return work.blockers.join("\n");
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
  const phaseContexts = new Map<string, { persona: Persona; actor: Agent }>();
  const runAreaPhases = async (area: AreaPlan, cwd: string, result: AreaResult): Promise<void> => {
    let index = 0;
    while (index < (area.phases ?? []).length) {
      const step = area.phases![index];
        const dependencyError = await waitDependencies(step.dependsOn ?? [], cwd);
        if (dependencyError) throw new Error(dependencyError);
        event(area.id, step.id, "running");
        const phaseCommands = async (): Promise<string> => await runCommands(step.commands, cwd, step.resource);
        let commandError = "";
        if (step.kind === "assembly") commandError = await assembleArea(area, cwd, step.commands, step.id, step.resource);
        else commandError = await phaseCommands();
        const phaseProblems: string[] = commandError ? [commandError] : [];
        if (step.personaPath) {
          const key = area.id + ":" + step.id;
          let context = phaseContexts.get(key);
          if (!context) {
            const persona = await v5Persona(step.personaPath, step.kind === "vision" ? "flash" : "pro", "read-only");
            context = { persona, actor: v5Agent(persona, "V5 " + area.id + " " + step.id, "Read-only. No edits, Git, agents, workflows or automatic fixes. Engine commands handle authorized evidence outputs. Exclusive capture commands already finished; image judgment owns no device lock.") };
            phaseContexts.set(key, context);
          }
          const finding = await guardWrites(context.persona, cwd, async () => await context!.actor.ask<PhaseWork>("Run only this authorized " + step.kind + " phase in " + cwd + ". " + step.instructions + "\nTask: " + input.task + "\nShared contract: " + plan.sharedContract + "\nReturn PhaseWork with concrete summary, blockers and findings."));
          if (finding.blockers.length) throw new Error(finding.blockers.join("\n"));
          if (step.fixFindings) phaseProblems.push(...finding.findings);
          else result.findings.push(...finding.findings);
        }
        if (phaseProblems.length) {
          if (!step.fixFindings) throw new Error("Requested phase failed without authorized repairs: " + phaseProblems.join("\n"));
          const before = await fingerprint(area, cwd);
          const fixed = await askWork(area, cwd, "Apply only the explicitly authorized fixes for phase " + step.id + " in " + cwd + ". Authorization and instructions: " + step.instructions + "\nFindings: " + phaseProblems.join("\n") + "\nOwned paths only; return AreaWork. No Git, workflows, unrelated fixes or checks.");
          if (fixed.blockers.length) throw new Error(fixed.blockers.join("\n"));
          if (await fingerprint(area, cwd) === before && (!commandError || await runCommands(step.commands, cwd, step.resource))) throw new Error("No changed progress on authorized phase findings");
          const correctedAssembly = await assembleArea(area, cwd, area.assembly, "assembly");
          if (correctedAssembly) throw new Error(correctedAssembly);
          result.findings = []; index = 0; continue;
        }
        event(area.id, step.id, "ready");
        index += 1;
    }
  };
  const tasks = plan.areas.map(async (area): Promise<AreaResult> => {
    const cwd = root + "-" + area.id;
    const result: AreaResult = { id: area.id, status: "blocked", branch: prefix + "/" + area.id, worktree: cwd, commit: "", summary: "", blockers: [], findings: [] };
    try {
      const dependencies = await Promise.all(area.dependsOn.map((id) => completed.get(id)!));
      const blocked = dependencies.find((dependency) => dependency.status !== "ready");
      if (blocked) throw new Error("Dependency blocked: " + blocked.id);
      await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", result.branch, cwd, input.baseCommit]));
      for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
      const persona = await v5Persona(area.personaPath, "pro", "write");
      contexts.set(area.id, v5Agent(persona, "V5 implementer " + area.id, "Work only in " + cwd + ". Own only " + JSON.stringify(area.ownedPaths) + ". Never touch the user checkout or other worktrees. No Git, agents, workflows, audits, tests, screenshots or source discovery outside assigned needs. Required dependency installation in this worktree is allowed; never share node_modules by symlink. The fixed engine runs assembly. Return concrete changedPaths, summary and blockers."));
      const work = await askWork(area, cwd, "Implement your area completely. Task: " + input.task + "\nShared contract: " + plan.sharedContract + "\nArea: " + area.title + "\n" + area.instructions + "\nInstruction files: " + JSON.stringify(input.instructionPaths) + "\nWorktree: " + cwd + "\nOwned paths: " + JSON.stringify(area.ownedPaths) + "\nReturn AreaWork; do not run assembly or QA.");
      result.summary = work.summary;
      if (work.blockers.length) throw new Error(work.blockers.join("\n"));
      const assemblyError = await assembleArea(area, cwd, area.assembly, "assembly");
      if (assemblyError) throw new Error(assemblyError);
      await runAreaPhases(area, cwd, result);
      result.commit = await commitArea(area, cwd);
      await serializeGit(async () => await merge(candidate, result.commit));
      result.status = "ready";
      event(area.id, "complete", "ready");
    } catch (error) {
      result.blockers.push(error instanceof Error ? error.message : String(error));
      event(area.id, "complete", "blocked");
    }
    results.set(area.id, result); resolveArea.get(area.id)!(result); return result;
  });
  const areas = await Promise.all(tasks);
  const blockers = areas.flatMap((area) => area.blockers.map((problem) => area.id + ": " + problem));
  phase("Assemble the integration candidate");
  if (!blockers.length) {
    let globalIndex = 0;
    while (globalIndex < plan.assembly.length) {
      const command = plan.assembly[globalIndex];
      for (;;) {
        const out = await execute(candidate, command.tool, command.args);
        if (out.exitCode === 0) break;
        const candidateDirty = await gitAt(candidate, ["status", "--porcelain=v1", "--untracked-files=all"]);
        if (candidateDirty) { blockers.push("Integrated assembly changed source before failing; retained for explicit ownership correction: " + candidateDirty); break; }
        const error = JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
        const candidateHead = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
        const unchangedOwners = new Set<string>();
        const corrections = await Promise.all(command.owners.map(async (id): Promise<string> => {
          const area = plan.areas.find((entry) => entry.id === id)!;
          const result = results.get(id)!;
          try {
            await serializeGit(async () => await merge(result.worktree, candidateHead));
            const before = await fingerprint(area, result.worktree);
            const fixed = await askWork(area, result.worktree, "Correct only your owned contribution to this blocking integrated assembly failure in " + result.worktree + ". Other named owners correct their disjoint paths concurrently. No audits, tests, Git or unrelated fixes.\n" + error + "\nReturn AreaWork.");
            if (fixed.blockers.length) return id + ": " + fixed.blockers.join("\n");
            if (await fingerprint(area, result.worktree) === before) { unchangedOwners.add(id); return ""; }
            const localError = await assembleArea(area, result.worktree, area.assembly, "assembly");
            if (localError) return id + ": " + localError;
            result.commit = await commitArea(area, result.worktree);
            await serializeGit(async () => await merge(candidate, result.commit));
            return "";
          } catch (error) { return id + ": " + (error instanceof Error ? error.message : String(error)); }
        }));
        blockers.push(...corrections.filter((problem) => problem !== ""));
        if (blockers.length) break;
        if (unchangedOwners.size === command.owners.length) {
          const retry = await execute(candidate, command.tool, command.args);
          if (retry.exitCode !== 0) blockers.push("No changed progress correcting integrated assembly: " + (retry.stderr + retry.stdout).slice(-18000));
          break;
        }
        // Changed revisions invalidate only their own and consuming areas' requested evidence.
        const affected = new Set(command.owners);
        for (let size = -1; size !== affected.size;) {
          size = affected.size;
          for (const area of plan.areas) {
            const dependencies = [...area.dependsOn, ...(area.phases ?? []).flatMap((step) => step.dependsOn ?? [])];
            if (dependencies.some((id) => affected.has(id))) affected.add(area.id);
          }
        }
        const refreshed = new Map<string, Promise<string>>();
        const refresh = (id: string): Promise<string> => {
          const existing = refreshed.get(id); if (existing) return existing;
          const area = plan.areas.find((entry) => entry.id === id)!;
          const dependencies = [...area.dependsOn, ...(area.phases ?? []).flatMap((step) => step.dependsOn ?? [])].filter((entry) => affected.has(entry));
          const next = (async (): Promise<string> => {
            const failures = await Promise.all(dependencies.map(refresh));
            if (failures.some((error) => error !== "")) return id + ": upstream evidence refresh blocked";
            const result = results.get(id)!;
            try {
              const head = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
              await serializeGit(async () => await merge(result.worktree, head));
              result.findings = []; event(id, "evidence", "invalidated");
              const error = await assembleArea(area, result.worktree, area.assembly, "assembly");
              if (error) return id + ": " + error;
              await runAreaPhases(area, result.worktree, result);
              result.commit = await commitArea(area, result.worktree);
              await serializeGit(async () => await merge(candidate, result.commit));
              return "";
            } catch (error) { result.status = "blocked"; return id + ": " + String(error); }
          })();
          refreshed.set(id, next); return next;
        };
        blockers.push(...(await Promise.all([...affected].map(refresh))).filter((problem) => problem !== ""));
        globalIndex = -1; // earlier integrated evidence also refers to the old candidate revision
        break;
      }
      if (blockers.length) break;
      globalIndex += 1;
    }
  }
  const candidateCommit = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
  const candidateStatus = await gitAt(candidate, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (candidateStatus) blockers.push("Integrated assembly changed tracked/untracked files; retained for explicit ownership correction: " + candidateStatus);
  try { await anchors(); } catch (error) { blockers.push("Delivery anchors changed; candidate retained: " + String(error)); }
  return { status: blockers.length ? "incomplete" : "complete", candidateBranch: branch, candidateWorktree: candidate, candidateCommit, areas, blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
}

const v5Result = await runV5(INPUT);
const v5Completion = { ...v5Result, personas: personaReport(), personaFindings };
report(v5Completion);
return v5Completion;
