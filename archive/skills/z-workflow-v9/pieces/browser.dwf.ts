        if (step.kind === "browser") {
          phase("Smoke-test the web app");
          const checked = await observePhase(area,cwd,step,round,false,"Use agent-browser to perform requested journeys on the already-ready isolated preview; save evidence in ignored paths.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
