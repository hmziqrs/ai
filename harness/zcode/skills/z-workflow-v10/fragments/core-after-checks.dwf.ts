
        if (phaseProblems.length) {
          if (!step.fixFindings) throw new Error("Requested phase failed without authorized repairs: " + phaseProblems.join("\n"));
          if (area.role === "verify") throw new Error("Verification found owned implementation defects requiring owner-scoped follow-up: " + phaseProblems.join("\n"));
          const before = await fingerprint(area, cwd);
          const fixed = await askWork(area, cwd, "Apply only the explicitly authorized fixes for phase " + step.id + " in " + cwd + ". Authorization and instructions: " + step.instructions + "\nFindings: " + phaseProblems.join("\n") + "\nOwned paths only; return AreaWork. No Git, workflows, unrelated fixes or checks.");
          if (fixed.blockers.length) throw new Error(v10BlockerText(fixed));
          if (await fingerprint(area, cwd) === before && (!commandError || await runCommands(step.commands, cwd, step.resource))) throw new Error("No changed progress on authorized phase findings");
          const correctedAssembly = await assembleArea(area, cwd, area.assembly, "assembly");
          if (correctedAssembly) throw new Error(correctedAssembly);
          if (selection.mode === "once" || (selection.mode === "rounds" && round >= selection.rounds)) {
            if (step.kind !== "audit") throw new Error("Correction made after the last authorized check; result remains unverified");
            result.observations.push("Corrected but not re-audited: " + phaseProblems.join("; ")); index += 1; continue;
          }
          result.findings = []; index = 0; continue;
        }
        event(area.id, step.id, "ready");
        if (selection.mode === "rounds" && round < selection.rounds) continue;
        index += 1;
    }
  };
  const tasks = plan.areas.map(async (area): Promise<AreaResult> => {
    const cwd = root + "-" + area.id;
    const notes: string[] = []; observations.set(area.id, notes);
    const result: AreaResult = { id: area.id, status: "blocked", branch: "", worktree: "", commit: "", summary: "", blockers: [], findings: [], observations: notes };
    try {
      const dependencies = await Promise.all(area.dependsOn.map((id) => completed.get(id)!));
      const blocked = dependencies.find((dependency) => dependency.status !== "ready");
      if (blocked) throw new Error("Dependency blocked: " + blocked.id);
      result.branch = prefix + "/" + area.id;
      await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", result.branch, cwd, input.baseCommit]));
      result.worktree = cwd;
      createdWorktrees.push({ path: cwd, branchRef: result.branch, area: area.id });
      await registryAdd({ path: cwd, branchRef: result.branch, area: area.id });
      for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
      event(area.id, "setup", "running");
      const setupError = await runCommands(area.setup, cwd);
      if (setupError) throw new Error("Required setup failed before implementation: " + setupError);
      await statusPaths(area, cwd);
      event(area.id, "setup", "ready");
      if (area.role !== "verify") {
      const persona = await v10Persona(area.personaPath, "pro", "write");
      contexts.set(area.id, v10Agent(persona, "V10 implementer " + area.id, "Work only in " + cwd + ". Own only " + JSON.stringify(area.ownedPaths) + ". Never touch the user checkout or other worktrees. No Git, agents, workflows, audits, test execution, screenshots or source discovery outside assigned needs. Author assigned test files and lifecycle helpers; the engine executes them. The engine has prepared this worktree and owns all setup/install and assembly/check commands. Do not run them. Use installed APIs/types; no source eval or smoke programs. Required framework compiler assistance for edited files is allowed once per changed revision. Return a brief structured AreaWork with observations separate from genuine blockers."));
      const work = await askWork(area, cwd, "Implement your area completely. Task: " + input.task + "\nShared contract: " + plan.sharedContract + "\nArea: " + area.title + "\n" + area.instructions + "\nInstruction files: " + JSON.stringify(input.instructionPaths) + "\nWorktree: " + cwd + "\nOwned paths: " + JSON.stringify(area.ownedPaths) + "\nReturn AreaWork; do not run assembly or QA.");
      result.summary = work.summary;
      if (work.blockers.length) throw new Error(v10BlockerText(work));
      }
      const assemblyError = area.role === "verify" ? await runCommands(area.assembly, cwd) : await assembleArea(area, cwd, area.assembly, "assembly");
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
    event("candidate", "setup", "running");
    const setupError = await runCommands(plan.setup, candidate);
    if (setupError) blockers.push("Required candidate setup failed: " + setupError);
    else event("candidate", "setup", "ready");
    let globalIndex = 0;
    while (!blockers.length && globalIndex < plan.assembly.length) {
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
            if (fixed.blockers.length) return id + ": " + v10BlockerText(fixed);
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
  result.status = blockers.length ? "incomplete" : "complete";
  result.candidateCommit = candidateCommit;
  result.areas = areas;
  result.blockers = blockers;
  result.firstImplementationAt = firstImplementationAt;
  result.completedAt = await timestamp();
  return result;
  };
  // Teardown always runs, including on failure: the engine tail reports through `result`,
  // cleanupWorktrees is total (never throws), and an engine failure rethrows after cleanup.
  let failed = false; let failure: unknown;
  await runEngine().catch((error) => { failed = true; failure = error; });
  result.retainedBranches.push(...await cleanupWorktrees());
  if (failed) throw failure;
  return result;
}

const v10Result = await runV10(INPUT);
const v10Completion = { ...v10Result, personas: personaReport(), personaFindings };
report(v10Completion);
return v10Completion;
