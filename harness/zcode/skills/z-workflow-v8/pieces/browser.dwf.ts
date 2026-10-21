        if (step.kind === "browser") {
          phase("Smoke-test the web app");
        let release = (): void => {};
        let released = false;
        let cleaned = false;
        if (step.resource) {
          const predecessor = resourceTails.get(step.resource) ?? Promise.resolve();
          resourceTails.set(step.resource, new Promise<void>((resolve) => { release = resolve; }));
          await predecessor;
        }
        try {
        
        commandError = "";
        commandError = await runCommands(step.commands, cwd);
        phaseProblems = commandError ? [commandError] : [];
        if (step.personaPath && !commandError) {
          const key = area.id + ":" + step.id;
          let context = phaseContexts.get(key);
          if (!context) {
            const persona = await v8Persona(step.personaPath, "pro", "read-only");
            context = { persona, actor: v8Agent(persona, "V8 " + area.id + " " + step.id, "Read-only. No edits, Git, agents, workflows or automatic fixes. Engine commands handle authorized evidence outputs. Exclusive capture commands already finished; image judgment owns no device lock.") };
            phaseContexts.set(key, context);
          }
          const finding = await guardWrites(context.persona, cwd, async () => await context!.actor.ask<PhaseWork>("Use agent-browser with dispatched isolated session and already-running loopback preview; requested journeys/viewports only, no external navigation, no source edits or server lifecycle changes. Save evidence only in ignored paths and close the browser session on failure too.\nRun only this authorized " + step.kind + " phase in " + cwd + ". " + step.instructions + "\nTask: " + input.task + "\nShared contract: " + plan.sharedContract + "\nReturn PhaseWork with concrete summary, blockers and findings."));
          if (finding.blockers.length) throw new Error(finding.blockers.join("\n"));
          report({area:area.id,piece:step.kind,round,...finding});
          phaseProblems.push(...finding.findings);

        }
        } finally {
          try {
            if (!cleaned) { const cleanupError = await runCommands(step.cleanup ?? [], cwd); if (cleanupError) throw new Error("Required cleanup failed: " + cleanupError); }
          } finally { if (!released) release(); }
        }
        }
