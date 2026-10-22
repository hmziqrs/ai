  const runAreaPhases = async (area: AreaPlan, cwd: string, result: AreaResult): Promise<void> => {
    let index = 0;
    while (index < (area.phases ?? []).length) {
      const step = area.phases![index];
      const selection = input.pieces.find((piece) => piece.name === step.kind)!;
      const roundKey = area.id + ":" + step.id;
      const usedRounds = pieceRounds.get(roundKey) ?? 0;
      if (selection.mode !== "until-clean" && usedRounds >= (selection.mode === "rounds" ? selection.rounds : 1)) throw new Error("Requested check budget exhausted after source changed; follow-up authorization required: " + step.id);
      const round = usedRounds + 1; pieceRounds.set(roundKey, round);
      report({area:area.id,piece:step.kind,round,authorization:selection.authorization});
        const dependencyError = await waitDependencies(step.dependsOn ?? [], cwd);
        if (dependencyError) throw new Error(dependencyError);
        event(area.id, step.id, "running");
        let commandError = "";
        let phaseProblems: string[] = [];
