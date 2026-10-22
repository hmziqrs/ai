        if (step.kind === "native-vision") {
          phase("Inspect the native app visually");
          const checked = await observePhase(area,cwd,step,round,true,"Interpret actual native-window images; no browser substitute.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
