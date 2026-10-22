
        // Hard failures (phase commands exited nonzero) block exactly as before. Judgment
        // findings without repair authority never veto finished work: they are reported on
        // the area result and the phase completes (verify areas follow the same rule).
        const judgmentFindings = commandError ? [] : phaseProblems;
        if (commandError && !step.fixFindings) throw new Error("Requested phase failed without authorized repairs: " + commandError);
        if (phaseProblems.length && step.fixFindings) {
          if (area.role === "verify") throw new Error("Verification found owned implementation defects requiring owner-scoped follow-up: " + phaseProblems.join("\n"));
          const before = await fingerprint(area, cwd);
          const fixed = await askWork(area, cwd, "Apply only the explicitly authorized fixes for phase " + step.id + " in " + cwd + ". Authorization and instructions: " + step.instructions + "\nFindings: " + phaseProblems.join("\n"));
          if (fixed.blockers.length) throw new Error(v12BlockerText(fixed));
          if (await fingerprint(area, cwd) === before && (!commandError || await runCommands(step.commands, cwd, step.resource))) throw new Error("No changed progress on authorized phase findings");
          const correctedAssembly = await assembleArea(area, cwd, area.assembly, "assembly");
          if (correctedAssembly) throw new Error(correctedAssembly);
          if (selection.mode === "once" || (selection.mode === "rounds" && round >= selection.rounds)) {
            if (step.kind !== "audit") throw new Error("Correction made after the last authorized check; result remains unverified");
            result.observations.push("Corrected but not re-audited: " + phaseProblems.join("; ")); index += 1; continue;
          }
          result.findings = []; index = 0; continue;
        }
        for (const finding of judgmentFindings) if (!result.findings.includes(finding)) result.findings.push(finding);
        event(area.id, step.id, "ready");
        if (selection.mode === "rounds" && round < selection.rounds) continue;
        index += 1;
    }
  };
  const tasks = plan.areas.map((area): Promise<AreaResult> => {
    const cwd = root + "-" + area.id;
    const notes: string[] = []; observations.set(area.id, notes);
    const result: AreaResult = { id: area.id, status: "blocked", branch: "", worktree: "", commit: "", summary: "", blockers: [], findings: [], observations: notes };
    // Two-stage lanes: stage A (implement + gates + commit) resolves the committed promise so
    // dependents fan out immediately. Read-only lane checks stream in stage B via future(),
    // concurrent with dependents; a lane with repair authority (fixFindings) gates instead,
    // because dependents must build against its final source.
    const streaming = (area.phases ?? []).length > 0 && !(area.phases ?? []).some((step) => step.fixFindings);
    const implementStage = (async (): Promise<AreaResult> => {
    try {
      const dependencies = await Promise.all(area.dependsOn.map((id) => committed.get(id)!));
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
      const persona = await v12Persona(area.personaPath, "pro", "write");
      contexts.set(area.id, v12Agent(persona, "V12 implementer " + area.id, "Work only in " + cwd + ". Own only " + JSON.stringify(area.ownedPaths) + ". Never touch the user checkout or other worktrees. No audits, screenshots or source discovery outside assigned needs. Author assigned test files and lifecycle helpers; the engine executes them."));
      const work = await askWork(area, cwd, "Implement your area completely. Task: " + input.task + "\nShared contract: " + plan.sharedContract + "\nArea: " + area.title + "\n" + area.instructions + "\nInstruction files: " + JSON.stringify(input.instructionPaths) + "\nWorktree: " + cwd + "\nOwned paths: " + JSON.stringify(area.ownedPaths));
      result.summary = work.summary;
      if (work.blockers.length) throw new Error(v12BlockerText(work));
      }
      const assemblyError = area.role === "verify" ? await runCommands(area.assembly, cwd) : await assembleArea(area, cwd, area.assembly, "assembly");
      if (assemblyError) throw new Error(assemblyError);
      if (!streaming) await runAreaPhases(area, cwd, result);
      result.commit = await commitArea(area, cwd);
      await serializeGit(async () => await merge(candidate, result.commit));
      result.status = "ready";
      if (streaming) event(area.id, "committed", "ready"); else event(area.id, "complete", "ready");
    } catch (error) {
      result.blockers.push(error instanceof Error ? error.message : String(error));
      event(area.id, "complete", "blocked");
    }
    // Dependents receive an immutable snapshot taken at commit time: stage-B outcomes can
    // never retroactively change what a dependent lane sees. The completed promise still
    // resolves with the live final result.
    const snapshot: AreaResult = Object.freeze({ ...result, blockers: [...result.blockers], findings: [...result.findings], observations: [...result.observations] });
    results.set(area.id, result); resolveCommitted.get(area.id)!(snapshot); return result;
    })();
    if (!streaming) { implementStage.then((r) => resolveArea.get(area.id)!(r)); return implementStage; }
    return future(async (): Promise<AreaResult> => {
      const base = await implementStage;
      if (base.status === "ready") {
        try {
          await runAreaPhases(area, cwd, result);
          event(area.id, "complete", "ready");
        } catch (error) {
          result.status = "blocked";
          result.blockers.push(error instanceof Error ? error.message : String(error));
          event(area.id, "complete", "blocked");
        }
      }
      resolveArea.get(area.id)!(result);
      return result;
    });
  });
  const areas = await Promise.all(tasks);
  const blockers = areas.flatMap((area) => area.blockers.map((problem) => area.id + ": " + problem));
  // Settles the candidate's engine artifacts when they are its only dirt: dependency files
  // (lockfiles and the manifests an engine command rewrote with them) are committed, since
  // installs depend on them — this is how the merged manifests' correct lockfile lands in
  // delivery; other derived files (build output, generated sources) are reported and left
  // uncommitted to vanish with the worktree, as in a developer's clean checkout. Returns the
  // dirty listing to report when any dirt is not an engine artifact.
  const settleArtifacts = async (): Promise<string> => await serializeGit(async () => {
    const dirty = await dirtyEntries(candidate);
    if (!dirty.size) return "";
    if ([...dirty.keys()].some((path) => !isArtifact(candidate, path))) return [...dirty.values()].join("\n");
    const dependencies = [...dirty.keys()].filter((path) => dependencyFile(path));
    const derived = [...dirty.keys()].filter((path) => !dependencyFile(path));
    if (derived.length) event("candidate", "derived-artifacts", "uncommitted", derived.join(", "));
    if (!dependencies.length) return "";
    await gitAt(candidate, ["add", "--", ...dependencies]);
    await gitAt(candidate, ["commit", "-m", "V12: integrate engine-generated dependency files"]);
    return "";
  });
  phase("Assemble the integration candidate");
  if (!blockers.length) {
    event("candidate", "setup", "running");
    const setupError = await runCommands(plan.setup, candidate);
    if (setupError) blockers.push("Required candidate setup failed: " + setupError);
    else { event("candidate", "setup", "ready"); await settleArtifacts(); }
    let globalIndex = 0;
    while (!blockers.length && globalIndex < plan.assembly.length) {
      const command = plan.assembly[globalIndex];
      for (;;) {
        const before = await dirtyEntries(candidate);
        const out = await execute(candidate, command.tool, command.args);
        recordArtifacts(candidate, before, await dirtyEntries(candidate));
        if (out.exitCode === 0) { await settleArtifacts(); break; }
        const failingDirt = await settleArtifacts();
        if (failingDirt) { blockers.push("Integrated assembly changed source before failing; retained for explicit ownership correction: " + failingDirt); break; }
        const error = JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
        const candidateHead = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
        const unchangedOwners = new Set<string>();
        const corrections = await Promise.all(command.owners.map(async (id): Promise<string> => {
          const area = plan.areas.find((entry) => entry.id === id)!;
          const result = results.get(id)!;
          try {
            await serializeGit(async () => await merge(result.worktree, candidateHead));
            const before = await fingerprint(area, result.worktree);
            const fixed = await askWork(area, result.worktree, "Correct only your owned contribution to this blocking integrated assembly failure in " + result.worktree + ". Other named owners correct their disjoint paths concurrently.\n" + error);
            if (fixed.blockers.length) return id + ": " + v12BlockerText(fixed);
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
          const retryBefore = await dirtyEntries(candidate);
          const retry = await execute(candidate, command.tool, command.args);
          recordArtifacts(candidate, retryBefore, await dirtyEntries(candidate));
          if (retry.exitCode !== 0) blockers.push("No changed progress correcting integrated assembly: " + (retry.stderr + retry.stdout).slice(-18000));
          else await settleArtifacts();
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
  const candidateDirt = await settleArtifacts();
  const candidateCommit = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
  if (candidateDirt) blockers.push("Integrated assembly changed tracked/untracked files; retained for explicit ownership correction: " + candidateDirt);
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
  const teardownRetained = await cleanupWorktrees();
  if (failed) throw failure;
  phase("Deliver and clean up");
  // Final engine phase: guarded fast-forward delivery into the user's checkout, then
  // z-v12/* branch reclamation. The ff-only merge is the only write ever made to the
  // checkout; every refusal outcome retains the candidate branch instead.
  const checkoutHead = async (): Promise<string> => {
    try { return (await gitAt(input.repoRoot, ["rev-parse", "HEAD"])).trim(); }
    catch { return input.baseCommit; }
  };
  if (result.status !== "complete") {
    const summary = result.blockers.slice(0, 3).join("; ").slice(0, 600);
    result.delivery = { status: "retained", detail: "run incomplete: " + (summary || "unmet requirements"), checkoutCommit: await checkoutHead() };
  } else try {
    await anchors();
    await serializeGit(async () => await gitAt(input.repoRoot, ["merge", "--ff-only", result.candidateCommit]));
    const head = await checkoutHead();
    if (head !== result.candidateCommit) throw new Error("checkout HEAD is " + head + " after fast-forward, expected " + result.candidateCommit);
    result.delivery = { status: "delivered", detail: "fast-forwarded " + input.branchRef + " to " + result.candidateCommit, checkoutCommit: head };
  } catch (error) {
    result.delivery = { status: "retained", detail: "guarded delivery refused: " + (error instanceof Error ? error.message : String(error)).slice(0, 600), checkoutCommit: await checkoutHead() };
  }
  // Branch reclamation, regardless of delivery outcome and limited to refs/heads/z-v12/:
  // delete every contained branch (ancestor of the checkout HEAD, or of the retained
  // candidate while it stays the delivery reference), keep the candidate itself only
  // while it is not contained in HEAD, retain everything else as unmerged work.
  const candidateKept = result.delivery.status !== "delivered";
  const sweep: string[] = [];
  try {
    const inUse = new Set((await gitAt(input.repoRoot, ["worktree", "list", "--porcelain"])).split("\n")
      .filter((line) => line.startsWith("branch refs/heads/z-v12/")).map((line) => line.slice("branch refs/heads/".length)));
    const refs = (await gitAt(input.repoRoot, ["for-each-ref", "--format=%(refname:short)", "refs/heads/z-v12/"])).split("\n").map((line) => line.trim()).filter(Boolean);
    const ancestorOf = async (ref: string, tip: string): Promise<boolean> =>
      (await execute(input.repoRoot, "git", ["merge-base", "--is-ancestor", ref, tip])).exitCode === 0;
    for (const ref of refs) {
      if (inUse.has(ref)) { sweep.push(ref + " (in use by a live worktree)"); continue; }
      if (candidateKept && ref === branch) { sweep.push(ref + " (delivery reference)"); continue; }
      if (!await ancestorOf(ref, "HEAD") && !(candidateKept && await ancestorOf(ref, branch))) { sweep.push(ref + " (unmerged work retained)"); continue; }
      // -d only accepts branches merged into HEAD; the ancestry check above carries the
      // same safety for retained-candidate branches, so fall back to plumbing, never -D.
      const del = await execute(input.repoRoot, "git", ["branch", "-d", ref]);
      if (del.exitCode !== 0) {
        const plumbing = await execute(input.repoRoot, "git", ["update-ref", "-d", "refs/heads/" + ref]);
        if (plumbing.exitCode !== 0) sweep.push(ref + " (delete failed)");
      }
    }
  } catch (error) {
    sweep.push("(branch reclamation failed: " + (error instanceof Error ? error.message : String(error)).slice(0, 300) + ")");
  }
  result.retainedBranches = [...sweep, ...teardownRetained];
  v12ValidateDelivery(result.delivery);
  return result;
}

const v12Result = await runV12(INPUT);
const v12Completion = { ...v12Result, personas: personaReport(), personaFindings };
report(v12Completion);
return v12Completion;
