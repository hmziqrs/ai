// V12 model policy: every v12 persona runs at HIGH. LOW and MAX selection are structurally
// absent from this helper, so no run can escalate or de-escalate on its own.
async function v12Persona(path: string, tier: "pro" | "flash", access: "read-only" | "write"): Promise<Persona> {
  const original = await loadPersona(path, { tier, access });
  if (!original) throw new Error("Required v12 persona unavailable: " + path);
  const modelId = (tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash") + "$high";
  const selected = PERSONA_MODELS[modelId];
  if (!selected) throw new Error("Unsupported v12 model: " + modelId);
  const persona = { ...original, modelId, model: selected, note: original.note + "; v12 explicitly selects " + modelId };
  const index = personaLoaded.indexOf(original);
  if (index >= 0) personaLoaded[index] = persona;
  return persona;
}

function v12Agent(persona: Persona, name: string, rules: string): Agent {
  // Standing ownership rules for writers; each prohibition appears in exactly one place
  // across these rules, the per-ask work contract and the shared suffix below.
  const ownership = persona.access === "write" ? "\nCommand ownership: the engine runs setup/install, project-wide checks/builds and optional test/QA/browser/device commands; do not run those, create inline eval/smoke programs, or duplicate engine gates. Read source and installed types; batch independent retrieval. Framework-required compiler assistance is limited to files you changed, with no repeated pass on unchanged files. Explicit run scope overrides broader persona or skill check recommendations. Deferred engine checks and residual risks are observations, not blockers." : "";
  return personaAgent(persona, name, rules + ownership + "\nFollow z-workflow-v12 policy for this run. Do not invoke agents or workflows. Do not perform Git mutations. Use only assigned paths and commands. Persona tool declarations describe intended authority; runtime tools are shared, so obey this explicit restriction.");
}
