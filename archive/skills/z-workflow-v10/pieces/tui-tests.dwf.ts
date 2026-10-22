        if (step.kind === "tui-tests") {
          phase("Exercise the TUI interactively");
          const checked = await observePhase(area,cwd,step,round,false,"Assess actual tui-use PTY assertions/snapshots, never piped stdin or unit tests as a substitute.");
          commandError=checked.commandError;phaseProblems=checked.phaseProblems;
        }
