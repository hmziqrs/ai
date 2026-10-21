  phase("Audit the plan before implementation");
  const planAudit = input.pieces.find((piece) => piece.name === "plan-audit")!;
  const reviewerPersona = await v9Persona(input.skillRoot + "/personas/plan-auditor.md", "pro", "read-only");
  const reviewer = v9Agent(reviewerPersona, "V9 plan auditor", "Read-only independent plan review. No implementation, commands, tests, edits, Git, agents or workflows. Return only concrete omissions, invalid dependencies, unsafe ownership or unmet requested scope. Do not demand perfection, more phases or extra clean rounds.");
  let planRound = 0;
  let planRepairer: Agent | undefined;
  for (;;) {
    planRound += 1;
    const judged = await guardWrites(reviewerPersona, input.repoRoot, async () => await reviewer.ask<PhaseWork>("Audit the proposed plan before ANY implementation/worktree setup. Task: " + input.task + "\nAuthority: " + planAudit.authorization + "\nPlan: " + JSON.stringify(plan) + "\nReturn {summary:string,blockers:string[],findings:string[]}; findings must name concrete requirements, area IDs and fixes, not speculative enhancements."));
    v9Require(!!judged && typeof judged.summary === "string" && v9Strings(judged.blockers) && v9Strings(judged.findings), "plan audit result", "expected summary, blockers and findings");
    report({area:"plan",piece:"plan-audit",round:planRound,...judged});
    if (judged.blockers.length) return { status:"incomplete",candidateBranch:"",candidateWorktree:"",candidateCommit:"",areas:[],blockers:judged.blockers,notes:plan.notes,callerStartedAt:input.startedAt,firstImplementationAt,completedAt:await timestamp() };
    if (judged.findings.length) {
      if (!planAudit.fixFindings) return { status:"incomplete",candidateBranch:"",candidateWorktree:"",candidateCommit:"",areas:[],blockers:judged.findings,notes:plan.notes,callerStartedAt:input.startedAt,firstImplementationAt,completedAt:await timestamp() };
      const before = JSON.stringify(plan);
      const repairPersona = await v9Persona(input.skillRoot + "/personas/workflow-author-v9.md", "flash", "read-only");
      if (!planRepairer) planRepairer = v9Agent(repairPersona, "V9 plan correction", "Correct only the supplied plan data for authorized findings. No code, scripts, edits, tool commands, Git, workflows or agents. Use existing facts and the typed contract supplied in references/authoring.md if needed.");
      const corrected = await guardWrites(repairPersona, input.repoRoot, async () => await planRepairer!.ask<RunPlan>("Return corrected RunPlan data only. Task: " + input.task + "\nCurrent plan: " + before + "\nFindings: " + JSON.stringify(judged.findings) + "\nAuthority: " + planAudit.authorization + "\nContract: " + input.skillRoot + "/references/authoring.md\nPreserve selected pieces and all scope; no new exploration. Correct fields in the existing RunPlan shape."));
      v9ValidatePlan(corrected, input);
      if (JSON.stringify(corrected) === before) return { status:"incomplete",candidateBranch:"",candidateWorktree:"",candidateCommit:"",areas:[],blockers:["No changed progress correcting plan findings"],notes:plan.notes,callerStartedAt:input.startedAt,firstImplementationAt,completedAt:await timestamp() };
      Object.assign(plan, corrected);
      if (plan.blockers.length) return { status:"incomplete",candidateBranch:"",candidateWorktree:"",candidateCommit:"",areas:[],blockers:plan.blockers,notes:plan.notes,callerStartedAt:input.startedAt,firstImplementationAt,completedAt:await timestamp() };
      if (planAudit.mode === "once" || (planAudit.mode === "rounds" && planRound >= planAudit.rounds)) { plan.notes.push("Plan findings corrected with explicit authority; final revision was not re-audited."); break; }
    } else if (planAudit.mode !== "rounds" || planRound >= planAudit.rounds) break;
  }
  await anchors();
