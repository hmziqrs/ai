  return { status: "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: [], notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp(), retainedBranches: [] };
}
const v12Result = await runV12(INPUT);
report({ ...v12Result, personas: personaReport(), personaFindings });
return v12Result;
