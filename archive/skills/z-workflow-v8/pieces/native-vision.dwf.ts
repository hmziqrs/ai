        if (step.kind === "native-vision") {
          phase("Inspect the native app visually");
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
        const cleanupError = await runCommands(step.cleanup ?? [], cwd); cleaned = true;
        release(); released = true;
        if (cleanupError) throw new Error("Required cleanup failed: " + cleanupError);
        if (step.personaPath && !commandError) {
          const key = area.id + ":" + step.id;
          let context = phaseContexts.get(key);
          if (!context) {
            const persona = await v8Persona(step.personaPath, "flash", "read-only");
            context = { persona, actor: v8Agent(persona, "V8 " + area.id + " " + step.id, "Read-only. No edits, Git, agents, workflows or automatic fixes. Engine commands handle authorized evidence outputs. Exclusive capture commands already finished; image judgment owns no device lock.") };
            phaseContexts.set(key, context);
          }
          const finding = await guardWrites(context.persona, cwd, async () => await context!.actor.ask<PhaseWork>("Interpret the actual native-app images against requested acceptance criteria. Capture has released the desktop before interpretation. Missing images or image capability are blockers; never invent a visual pass.\nRun only this authorized " + step.kind + " phase in " + cwd + ". " + step.instructions + "\nTask: " + input.task + "\nShared contract: " + plan.sharedContract + "\nReturn PhaseWork with concrete summary, blockers and findings."));
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
