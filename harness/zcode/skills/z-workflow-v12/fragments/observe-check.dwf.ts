  const observePhase = async (area: AreaPlan, cwd: string, step: AreaPhase, round: number, visual: boolean, purpose: string): Promise<{commandError:string;phaseProblems:string[]}> => {
    let release = (): void => {};
    let released = false;
    let cleaned = false;
    let commandError = "";
    const phaseProblems:string[] = [];
    if (step.resource) {
      const predecessor=resourceTails.get(step.resource)??Promise.resolve();
      resourceTails.set(step.resource,new Promise<void>((resolve)=>{release=resolve;}));
      await predecessor;
    }
    try {
      commandError=await runCommands(step.commands,cwd,undefined,step.id);
      if(commandError) phaseProblems.push(commandError);
      if(visual) {
        const cleanupError=await runCommands(step.cleanup??[],cwd,undefined,step.id);cleaned=true;
        release();released=true;
        if(cleanupError)throw new Error("Required cleanup failed: "+cleanupError);
      }
      if(step.personaPath&&!commandError) {
        const key=area.id+":"+step.id;
        let context=phaseContexts.get(key);
        if(!context) {
          const persona=await v12Persona(step.personaPath,visual?"flash":"pro","read-only");
          context={persona,actor:v12Agent(persona,"V12 "+area.id+" "+step.id,"Read-only assigned evidence judgment. No edits, Git, agents, workflows, duplicate commands or automatic fixes. Engine owns lifecycle; image capture releases its resource before judgment.")};
          phaseContexts.set(key,context);
        }
        const finding=await guardWrites(context.persona,cwd,async()=>await context!.actor.ask<PhaseWork>(purpose+"\nRun only this authorized "+step.kind+" phase in "+cwd+". "+step.instructions+"\nIf commands are declared, read their actual engine records (already executed; do not rerun): "+cwd+"/.zcode/workflow-drafts/v12-evidence/"+step.id+".jsonl\nSuccessful exit codes are valid evidence, including incremental builds. Do not demand cold builds or clear caches without an explicit request. Missing images or image capability block visual review; never invent a pass.\nTask: "+input.task+"\nShared contract: "+plan.sharedContract+"\nReturn PhaseWork with concrete summary, blockers and findings."));
        if(finding.blockers.length)throw new Error(finding.blockers.join("\n"));
        report({area:area.id,piece:step.kind,round,...finding});
        phaseProblems.push(...finding.findings);
      }
    } finally {
      try {if(!cleaned){const error=await runCommands(step.cleanup??[],cwd,undefined,step.id);if(error)throw new Error("Required cleanup failed: "+error);}}
      finally {if(!released)release();}
    }
    return {commandError,phaseProblems};
  };
