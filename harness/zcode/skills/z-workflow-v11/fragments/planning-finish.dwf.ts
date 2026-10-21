  return { status: "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: [], notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp(), retainedBranches: [] };
}
const v11Result = await runV11(INPUT);
report({ ...v11Result, personas: personaReport(), personaFindings });
return v11Result;
