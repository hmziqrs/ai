interface HighAttempt {
  round: number;
  criterion: string;
  evidence: string;
  failed: boolean;
  completed: boolean;
  correction: boolean;
  thinking: "high";
}

interface MaxEvidence {
  authorization: string;
  problem: string;
  attempts: HighAttempt[];
  reasoningLimited: boolean;
}

const v9Escalations: MaxEvidence[] = [];

function v9MaxAllowed(evidence: MaxEvidence): boolean {
  return typeof evidence.authorization === "string" && evidence.authorization.trim() !== "" &&
    evidence.problem.trim() !== "" && evidence.reasoningLimited &&
    evidence.attempts.length >= 2 &&
    new Set(evidence.attempts.map((a) => a.round)).size >= 2 &&
    evidence.attempts.every((a) => a.completed && a.correction && a.thinking === "high" && a.failed && a.criterion === evidence.problem && a.evidence.trim() !== "");
}

async function v9Persona(path: string, tier: "pro" | "flash", access: "read-only" | "write", options?: { thinking?: "low" | "high"; maxEvidence?: MaxEvidence }): Promise<Persona> {
  const maxEvidence = options?.maxEvidence;
  const thinking = options?.thinking ?? "high";
  if (thinking === "low" && (tier !== "flash" || access !== "read-only" || maxEvidence)) throw new Error("LOW is only for bounded read-only Flash retrieval, not implementation or MAX");
  if (maxEvidence && tier !== "pro") throw new Error("Only a responsible Pro problem-solving role may escalate; Flash evidence roles stay high");
  if (maxEvidence && !v9MaxAllowed(maxEvidence)) throw new Error("Max requires two evidenced unsuccessful high attempts on the same reasoning problem");
  if (maxEvidence) {
    const usedRounds = v9Escalations.filter((entry) => entry.problem === maxEvidence.problem)
      .flatMap((entry) => entry.attempts.map((attempt) => attempt.round));
    const freshAttempts = maxEvidence.attempts.filter((attempt) => !usedRounds.includes(attempt.round));
    if (new Set(freshAttempts.map((attempt) => attempt.round)).size < 2) {
      throw new Error("Another MAX selection requires two new completed failed HIGH corrections, not reused evidence");
    }
  }
  const original = await loadPersona(path, { tier, access });
  if (!original) throw new Error("Required v9 persona unavailable: " + path);
  const base = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
  const modelId = base + (maxEvidence ? "$max" : "$" + thinking);
  const selected = PERSONA_MODELS[modelId];
  if (!selected) throw new Error("Unsupported v9 model: " + modelId);
  const persona = { ...original, modelId, model: selected, note: original.note + "; v9 explicitly selects " + modelId };
  const index = personaLoaded.indexOf(original);
  if (index >= 0) personaLoaded[index] = persona;
  if (maxEvidence) v9Escalations.push(maxEvidence);
  return persona;
}

function v9Agent(persona: Persona, name: string, rules: string): Agent {
  const ownership = persona.access === "write" ? "\nCommand ownership for every implementation/correction: the engine runs setup/install, project-wide check/build and optional test/QA/browser/device commands. Do not run those, create inline eval/smoke programs, or duplicate engine gates. Read source and installed types; batch independent retrieval. Framework-required compiler assistance for files you changed is allowed, with no repeated clean pass on unchanged files. Explicit run scope overrides broader persona or skill check recommendations. Completion reports are brief; deferred engine checks and residual risks are observations, not blockers." : "";
  return personaAgent(persona, name, rules + ownership + "\nFollow z-workflow-v9 policy for this run. Do not invoke agents or workflows. Do not perform Git mutations. Use only assigned paths and commands. Persona tool declarations describe intended authority; runtime tools are shared, so obey this explicit restriction.");
}
