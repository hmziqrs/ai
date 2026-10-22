        if (step.kind === "mobile-vision") {
          phase("Inspect the mobile app visually");
          const checked = await observePhase(area,cwd,step,round,true,"Interpret actual mobile-device images; no web substitute.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
