        if (step.kind === "unit-tests") {
          phase("Run requested unit tests");
          const checked = await observePhase(area,cwd,step,round,false,"Assess recorded unit-test assertions and actual exit codes.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
