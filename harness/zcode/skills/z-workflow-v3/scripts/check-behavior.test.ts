import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const helperSource = readFileSync(resolve(import.meta.dir, "../model-policy.dwf.ts"), "utf8");
const executable = new Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync(helperSource);
const pro = "account:zai-individual-coding-plan/GLM-5.3";
const flash = "account:zai-individual-coding-plan/GLM-5.3-Flash";

function harness() {
  const loaded: any[] = [];
  const requests: any[] = [];
  const models = Object.fromEntries([pro, flash].flatMap((base) =>
    ["high", "max"].map((thinking) => [`${base}$${thinking}`, { selected: `${base}$${thinking}` }])));
  const load = async (path: string, options: any) => {
    requests.push({ path, ...options });
    if (path === "/missing.md") return null;
    const persona = {
      path,
      sha256: "source-persona-sha256",
      access: options.access,
      body: "Domain expertise; source declared max thinking",
      note: "loaded source",
      modelId: `${pro}$max`,
      model: models[`${pro}$max`],
    };
    loaded.push(persona);
    return persona;
  };
  const createAgent = (persona: any, name: string, rules: string) => ({ persona, name, rules });
  const api = new Function("loadPersona", "PERSONA_MODELS", "personaLoaded", "personaAgent",
    `${executable}\nreturn { v3Persona, v3Agent, v3Escalations };`)(load, models, loaded, createAgent);
  return { ...api, loaded, requests, models };
}

function attempt(round: number, overrides: Record<string, unknown> = {}) {
  return {
    round,
    criterion: "sqlite-restart-persistence",
    evidence: `/evidence/restart-correction-${round}.log`,
    failed: true,
    completed: true,
    correction: true,
    thinking: "high",
    ...overrides,
  };
}

function eligible(overrides: Record<string, unknown> = {}) {
  return {
    problem: "sqlite-restart-persistence",
    attempts: [attempt(1), attempt(2)],
    reasoningLimited: true,
    ...overrides,
  };
}

describe("v3 actual persona selection and authority", () => {
  test("source MAX is replaced by Pro HIGH, retaining expertise and fingerprint", async () => {
    const h = harness();
    const persona = await h.v3Persona("/domain.md", "pro", "read-only");
    expect(persona.model).toBe(h.models[`${pro}$high`]);
    expect(persona.modelId).toBe(`${pro}$high`);
    expect(persona.body).toContain("Domain expertise");
    expect(persona.sha256).toBe("source-persona-sha256");
    expect(h.loaded).toEqual([persona]);
    expect(h.v3Escalations).toEqual([]);
  });

  test("explicit Flash tier selects Flash HIGH despite Pro source", async () => {
    const h = harness();
    const persona = await h.v3Persona("/domain.md", "flash", "read-only");
    expect(persona.modelId).toBe(`${flash}$high`);
    expect(persona.model).toBe(h.models[`${flash}$high`]);
    expect(h.requests).toEqual([{ path: "/domain.md", tier: "flash", access: "read-only" }]);
  });

  test("read-only authority remains read-only through agent construction", async () => {
    const h = harness();
    const persona = await h.v3Persona("/domain.md", "pro", "read-only");
    const agent = h.v3Agent(persona, "fresh-review-3", "Inspect only /worktree/src");
    expect(agent.persona.access).toBe("read-only");
    expect(agent.name).toBe("fresh-review-3");
    expect(agent.rules).toContain("Inspect only /worktree/src");
    expect(agent.rules).toContain("Do not perform Git mutations");
    expect(agent.rules).toContain("Do not invoke agents or workflows");
  });

  test("scoped writer selection is preserved rather than silently downgraded", async () => {
    const h = harness();
    const persona = await h.v3Persona("/domain.md", "pro", "write");
    expect(persona.access).toBe("write");
    expect(h.requests[0].access).toBe("write");
  });

  test("a missing persona blocks dispatch", async () => {
    const h = harness();
    await expect(h.v3Persona("/missing.md", "pro", "read-only")).rejects.toThrow("Required v3 persona unavailable");
    expect(h.loaded).toEqual([]);
    expect(h.v3Escalations).toEqual([]);
  });

  test("unsupported selected model blocks instead of silently falling back", async () => {
    const h = harness();
    delete h.models[`${pro}$high`];
    await expect(h.v3Persona("/domain.md", "pro", "read-only")).rejects.toThrow("Unsupported v3 model");
  });
});

describe("criterion-specific MAX escalation", () => {
  const disallowed = [
    ["zero correction attempts", eligible({ attempts: [] })],
    ["only one HIGH correction", eligible({ attempts: [attempt(1)] })],
    ["initial implementation is counted as a correction", eligible({ attempts: [attempt(1, { correction: false }), attempt(2)] })],
    ["interrupted correction", eligible({ attempts: [attempt(1), attempt(2, { completed: false })] })],
    ["unrelated failed criterion", eligible({ attempts: [attempt(1), attempt(2, { criterion: "css-overflow" })] })],
    ["duplicate round", eligible({ attempts: [attempt(1), attempt(1)] })],
    ["missing tool rather than reasoning failure", eligible({ reasoningLimited: false })],
    ["one correction actually passed", eligible({ attempts: [attempt(1), attempt(2, { failed: false })] })],
    ["no concrete correction evidence", eligible({ attempts: [attempt(1), attempt(2, { evidence: " " })] })],
    ["one attempt used another thinking level", eligible({ attempts: [attempt(1), attempt(2, { thinking: "max" })] })],
    ["blank problem identifier", eligible({ problem: " " })],
  ] as const;

  for (const [name, evidence] of disallowed) {
    test(`blocks MAX for ${name}`, async () => {
      const h = harness();
      await expect(h.v3Persona("/domain.md", "pro", "write", evidence)).rejects.toThrow();
      expect(h.v3Escalations).toEqual([]);
      expect(h.loaded.some((p: any) => p.note.includes("v3 explicitly selects"))).toBe(false);
    });
  }

  test("two completed failed HIGH corrections permit targeted Pro MAX and record actual selection", async () => {
    const h = harness();
    const evidence = eligible();
    const high = await h.v3Persona("/domain.md", "pro", "write");
    const max = await h.v3Persona("/domain.md", "pro", "write", evidence);
    const nextTask = await h.v3Persona("/next-domain.md", "pro", "write");
    expect(high.modelId).toBe(`${pro}$high`);
    expect(max.modelId).toBe(`${pro}$max`);
    expect(max.model).toBe(h.models[`${pro}$max`]);
    expect(nextTask.modelId).toBe(`${pro}$high`);
    expect(h.loaded.map((p: any) => p.modelId)).toEqual([`${pro}$high`, `${pro}$max`, `${pro}$high`]);
    expect(h.v3Escalations).toEqual([evidence]);
    expect(h.v3Escalations[0].attempts.map((a: any) => a.evidence)).toEqual([
      "/evidence/restart-correction-1.log", "/evidence/restart-correction-2.log",
    ]);
  });

  test("Flash remains HIGH even with otherwise eligible escalation evidence", async () => {
    const h = harness();
    await expect(h.v3Persona("/domain.md", "flash", "read-only", eligible())).rejects.toThrow("Flash evidence roles stay high");
    expect(h.requests).toEqual([]);
    expect(h.v3Escalations).toEqual([]);
  });
});


describe("MAX evidence cannot be recycled", () => {
  test("same pair cannot select MAX twice", async () => {
    const h = harness();
    await h.v3Persona("/domain.md", "pro", "write", eligible());
    await expect(h.v3Persona("/domain.md", "pro", "write", eligible())).rejects.toThrow("two new");
    expect(h.v3Escalations).toHaveLength(1);
  });
  test("one new correction is insufficient after MAX", async () => {
    const h = harness();
    await h.v3Persona("/domain.md", "pro", "write", eligible());
    await expect(h.v3Persona("/domain.md", "pro", "write", eligible({attempts: [attempt(2), attempt(3)]}))).rejects.toThrow("two new");
  });
  test("two new HIGH corrections allow targeted MAX again and normal selection stays HIGH", async () => {
    const h = harness();
    await h.v3Persona("/domain.md", "pro", "write", eligible());
    const next = await h.v3Persona("/domain.md", "pro", "write", eligible({attempts: [attempt(3), attempt(4)]}));
    expect(next.modelId).toBe(`${pro}$max`);
    const high = await h.v3Persona("/domain.md", "pro", "write");
    expect(high.modelId).toBe(`${pro}$high`);
    expect(h.v3Escalations).toHaveLength(2);
  });
});
