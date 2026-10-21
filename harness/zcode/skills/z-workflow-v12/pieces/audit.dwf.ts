        if (step.kind === "audit") {
          phase("Audit implementation");
          const checked = await observePhase(area,cwd,step,round,false,"Independently audit changed implementation against requested scope; concrete file:line defects only.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
