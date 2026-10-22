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
  problem: string;
  attempts: HighAttempt[];
  reasoningLimited: boolean;
}

const v3Escalations: MaxEvidence[] = [];

function v3MaxAllowed(evidence: MaxEvidence): boolean {
  return evidence.problem.trim() !== "" && evidence.reasoningLimited &&
    evidence.attempts.length >= 2 &&
    new Set(evidence.attempts.map((a) => a.round)).size >= 2 &&
    evidence.attempts.every((a) => a.completed && a.correction && a.thinking === "high" && a.failed && a.criterion === evidence.problem && a.evidence.trim() !== "");
}

async function v3Persona(path: string, tier: "pro" | "flash", access: "read-only" | "write", maxEvidence?: MaxEvidence): Promise<Persona> {
  if (maxEvidence && tier !== "pro") throw new Error("Only a responsible Pro problem-solving role may escalate; Flash evidence roles stay high");
  if (maxEvidence && !v3MaxAllowed(maxEvidence)) throw new Error("Max requires two evidenced unsuccessful high attempts on the same reasoning problem");
  if (maxEvidence) {
    const usedRounds = v3Escalations.filter((entry) => entry.problem === maxEvidence.problem)
      .flatMap((entry) => entry.attempts.map((attempt) => attempt.round));
    const freshAttempts = maxEvidence.attempts.filter((attempt) => !usedRounds.includes(attempt.round));
    if (new Set(freshAttempts.map((attempt) => attempt.round)).size < 2) {
      throw new Error("Another MAX selection requires two new completed failed HIGH corrections, not reused evidence");
    }
  }
  const original = await loadPersona(path, { tier, access });
  if (!original) throw new Error("Required v3 persona unavailable: " + path);
  const base = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
  const modelId = base + (maxEvidence ? "$max" : "$high");
  const selected = PERSONA_MODELS[modelId];
  if (!selected) throw new Error("Unsupported v3 model: " + modelId);
  const persona = { ...original, modelId, model: selected, note: original.note + "; v3 explicitly selects " + modelId };
  const index = personaLoaded.indexOf(original);
  if (index >= 0) personaLoaded[index] = persona;
  if (maxEvidence) v3Escalations.push(maxEvidence);
  return persona;
}

function v3Agent(persona: Persona, name: string, rules: string): Agent {
  return personaAgent(persona, name, rules + "\nFollow z-workflow-v3 policy for this run. Do not invoke agents or workflows. Do not perform Git mutations. Use only assigned paths and commands. Persona tool declarations describe intended authority; runtime tools are shared, so obey this explicit restriction.");
}
