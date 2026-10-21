        if (step.kind === "web-vision") {
          phase("Inspect the web app visually");
          const checked = await observePhase(area,cwd,step,round,true,"Interpret actual web screenshot images against visual acceptance criteria.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
