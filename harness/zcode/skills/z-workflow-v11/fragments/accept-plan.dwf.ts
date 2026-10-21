  await anchors();
  const plan = input.plan;
  try { v11ValidatePlan(plan, input); }
  catch (error) { return { status: "incomplete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: ["Invalid prepared plan: " + String(error)], notes: [], callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp(), retainedBranches: [] }; }
  report({ area: "configuration", step: "prepared-plan", status: "ready", sharedContract: plan.sharedContract, areas: plan.areas.map((area) => ({id:area.id,domain:area.domain ?? "",dependsOn:area.dependsOn,ownedPaths:area.ownedPaths})), notes:plan.notes });
  if (plan.blockers.length) return { status: "incomplete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: plan.blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp(), retainedBranches: [] };
