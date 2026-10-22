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
    `${executable}\nreturn { v2Persona, v2Agent, v2Escalations };`)(load, models, loaded, createAgent);
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

describe("v2 actual persona selection and authority", () => {
  test("source MAX is replaced by Pro HIGH, retaining expertise and fingerprint", async () => {
    const h = harness();
    const persona = await h.v2Persona("/domain.md", "pro", "read-only");
    expect(persona.model).toBe(h.models[`${pro}$high`]);
    expect(persona.modelId).toBe(`${pro}$high`);
    expect(persona.body).toContain("Domain expertise");
    expect(persona.sha256).toBe("source-persona-sha256");
    expect(h.loaded).toEqual([persona]);
    expect(h.v2Escalations).toEqual([]);
  });

  test("explicit Flash tier selects Flash HIGH despite Pro source", async () => {
    const h = harness();
    const persona = await h.v2Persona("/domain.md", "flash", "read-only");
    expect(persona.modelId).toBe(`${flash}$high`);
    expect(persona.model).toBe(h.models[`${flash}$high`]);
    expect(h.requests).toEqual([{ path: "/domain.md", tier: "flash", access: "read-only" }]);
  });

  test("read-only authority remains read-only through agent construction", async () => {
    const h = harness();
    const persona = await h.v2Persona("/domain.md", "pro", "read-only");
    const agent = h.v2Agent(persona, "fresh-review-3", "Inspect only /worktree/src");
    expect(agent.persona.access).toBe("read-only");
    expect(agent.name).toBe("fresh-review-3");
    expect(agent.rules).toContain("Inspect only /worktree/src");
    expect(agent.rules).toContain("Do not perform Git mutations");
    expect(agent.rules).toContain("Do not invoke agents or workflows");
  });

  test("scoped writer selection is preserved rather than silently downgraded", async () => {
    const h = harness();
    const persona = await h.v2Persona("/domain.md", "pro", "write");
    expect(persona.access).toBe("write");
    expect(h.requests[0].access).toBe("write");
  });

  test("a missing persona blocks dispatch", async () => {
    const h = harness();
    await expect(h.v2Persona("/missing.md", "pro", "read-only")).rejects.toThrow("Required v2 persona unavailable");
    expect(h.loaded).toEqual([]);
    expect(h.v2Escalations).toEqual([]);
  });

  test("unsupported selected model blocks instead of silently falling back", async () => {
    const h = harness();
    delete h.models[`${pro}$high`];
    await expect(h.v2Persona("/domain.md", "pro", "read-only")).rejects.toThrow("Unsupported v2 model");
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
      await expect(h.v2Persona("/domain.md", "pro", "write", evidence)).rejects.toThrow();
      expect(h.v2Escalations).toEqual([]);
      expect(h.loaded.some((p: any) => p.note.includes("v2 explicitly selects"))).toBe(false);
    });
  }

  test("two completed failed HIGH corrections permit targeted Pro MAX and record actual selection", async () => {
    const h = harness();
    const evidence = eligible();
    const high = await h.v2Persona("/domain.md", "pro", "write");
    const max = await h.v2Persona("/domain.md", "pro", "write", evidence);
    const nextTask = await h.v2Persona("/next-domain.md", "pro", "write");
    expect(high.modelId).toBe(`${pro}$high`);
    expect(max.modelId).toBe(`${pro}$max`);
    expect(max.model).toBe(h.models[`${pro}$max`]);
    expect(nextTask.modelId).toBe(`${pro}$high`);
    expect(h.loaded.map((p: any) => p.modelId)).toEqual([`${pro}$high`, `${pro}$max`, `${pro}$high`]);
    expect(h.v2Escalations).toEqual([evidence]);
    expect(h.v2Escalations[0].attempts.map((a: any) => a.evidence)).toEqual([
      "/evidence/restart-correction-1.log", "/evidence/restart-correction-2.log",
    ]);
  });

  test("Flash remains HIGH even with otherwise eligible escalation evidence", async () => {
    const h = harness();
    await expect(h.v2Persona("/domain.md", "flash", "read-only", eligible())).rejects.toThrow("Flash evidence roles stay high");
    expect(h.requests).toEqual([]);
    expect(h.v2Escalations).toEqual([]);
  });
});

const preparationSource = readFileSync(resolve(import.meta.dir, "../preparation-template.dwf.ts"), "utf8");
const preparationExecutable = new Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync(`async function executePreparation() {\n${preparationSource}\n}`);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function preparationHarness(reviewRounds: any[][], options: { synthesisBlocked?: boolean; sourceChangesAfterAuthor?: boolean } = {}) {
  const root = resolve(import.meta.dir, "..");
  const draftPath = "/tmp/zflow-v2-test/execution.dwf.ts";
  const calls: { name: string; model: string; instance: number; prompt: string }[] = [];
  const actors: { name: string; model: string; instance: number; system: string }[] = [];
  const events: string[] = [];
  const reports: any[] = [];
  const commands: { tool: string; args: string[] }[] = [];
  let scoutsStarted = 0;
  let releaseScouts!: () => void;
  const scoutsGate = new Promise<void>((resolve) => { releaseScouts = resolve; });
  let authored = false;
  let reviews = 0;
  const fixturePaths = ["explorer", "synthesizer", "author", "reviewer"].map((name) => `${root}/personas/${name}.md`);
  const brief = {
    goal: "Build a single-user no-auth todo app",
    acceptance: [{ id: "sqlite-persistence", criterion: "todos survive restart", check: "restart the backend and list todos" }],
    dispositions: [
      { scout: "source", finding: "SvelteKit UI and Elysia backend", status: "accepted", reason: "requested stack" },
      { scout: "checks", finding: "SQLite restart persistence", status: "accepted", reason: "acceptance" },
    ],
    personas: [], visualScenarios: [{ state: "todo list", viewport: "1280x800", check: "create and complete" }],
    lanes: [{ name: "todos", owns: ["src", "server"], dependsOn: [], persona: "/domain.md", skills: [], gate: "bun test" }],
    sharedContracts: ["Todo id, title, completed"], gates: ["bun test"], visible: true, findings: [],
    blockers: options.synthesisBlocked ? ["required SQLite runtime missing"] : [],
  };
  const world = {
    async run(tool: string, argv: string[]) {
      commands.push({ tool, args: argv });
      if (tool === "cat" && fixturePaths.includes(argv[0])) {
        return { exitCode: 0, stdout: readFileSync(argv[0], "utf8"), stderr: "" };
      }
      if (tool === "shasum" && fixturePaths.includes(argv[2])) {
        return { exitCode: 0, stdout: `${"a".repeat(64)}  ${argv[2]}\n`, stderr: "" };
      }
      if (tool === "bun" && argv.includes("--eval")) {
        return { exitCode: 0, stdout: `${options.sourceChangesAfterAuthor && authored ? "c".repeat(64) : "b".repeat(64)}\n`, stderr: "" };
      }
      if (tool === "bun" && argv.includes(`${root}/scripts/check-script.ts`)) {
        return { exitCode: 0, stdout: "script compiled and validated", stderr: "" };
      }
      if (tool === "git" && argv.includes("check-ignore")) return { exitCode: 0, stdout: "", stderr: "" };
      throw new Error(`Unexpected preparation command: ${tool} ${JSON.stringify(argv)}`);
    },
  };
  function createAgent(name: string, config: { model: string; system: string }) {
    const instance = actors.length;
    actors.push({ name, model: config.model, system: config.system, instance });
    return {
      async ask(prompt: string) {
        calls.push({ name, model: config.model, instance, prompt });
        events.push(`ask:${name}`);
        if (name.startsWith("Explore ")) {
          scoutsStarted += 1;
          if (scoutsStarted === 2) releaseScouts();
          await scoutsGate;
          events.push(`scout-complete:${name}`);
          return {
            scope: name, evidence: [`/repo/evidence/${name}.log`], findings: [`finding from ${name}`],
            paths: ["/repo/src"], skills: [], personas: [], acceptance: ["restart persistence"],
            commands: ["bun test"], unknowns: [],
          };
        }
        if (name === "Synthesize preparation findings") return brief;
        if (name === "Author execution workflow" || name.startsWith("Resolve blocked script problem ")) {
          authored = true;
          return { scriptPath: draftPath, plan: "One isolated task lane with independent fresh review", commands: [], blockers: [], nextApproach: "Check and correct the specific incompatible facade API" };
        }
        if (name.startsWith("Review execution script round ")) {
          const findings = reviewRounds[reviews];
          if (!findings) throw new Error(`Unplanned review round ${reviews + 1}`);
          reviews += 1;
          return { findings, blockers: [] };
        }
        throw new Error(`Unexpected actor: ${name}`);
      },
    };
  }
  const run = new AsyncFunction("args", "model", "agent", "world", "phase", "future", "report", `${preparationExecutable}\nreturn await executePreparation();`);
  const result = run(
    { task: "Build SvelteKit + Elysia Bun + SQLite single-user no-auth todo app", repoRoot: "/repo", baseCommit: "base", baseBranch: "refs/heads/main", skillRoot: root, draftPath, platformContract: "/platform/SKILL.md", scopes: ["source", "checks"] },
    (id: string) => id,
    createAgent,
    world,
    (name: string) => { events.push(`phase:${name}`); },
    async (work: () => Promise<unknown>) => await work(),
    (value: unknown) => { reports.push(value); },
  );
  return { result, calls, actors, events, reports, commands, draftPath };
}

function issue(id: string) {
  return { id, problem: `Script violates ${id}`, evidence: `/evidence/${id}-review.log`, reasoningLimited: true };
}

describe("actual preparation template orchestration", () => {
  test("parallel scouts feed complete synthesis, persistent HIGH author escalates only after two same-criterion corrections", async () => {
    const h = preparationHarness([[issue("A")], [issue("B")], [issue("B")], [issue("B")], []]);
    const result = await h.result;
    expect(result.status).toBe("ready");
    expect(result.scriptPath).toBe(h.draftPath);
    expect(result.preparationRounds).toBe(5);

    const exploreCalls = h.calls.filter((call) => call.name.startsWith("Explore "));
    expect(exploreCalls).toHaveLength(2);
    expect(exploreCalls.every((call) => call.model === `${flash}$high`)).toBe(true);
    const secondScoutStart = h.events.indexOf("ask:Explore 2");
    expect(secondScoutStart).toBeLessThan(h.events.indexOf("scout-complete:Explore 1"));
    expect(secondScoutStart).toBeLessThan(h.events.indexOf("scout-complete:Explore 2"));
    expect(h.events.indexOf("ask:Synthesize preparation findings")).toBeGreaterThan(h.events.indexOf("scout-complete:Explore 2"));
    const synthesis = h.calls.find((call) => call.name === "Synthesize preparation findings")!;
    expect(synthesis.prompt).toContain("finding from Explore 1");
    expect(synthesis.prompt).toContain("finding from Explore 2");

    const authors = h.calls.filter((call) => call.name === "Author execution workflow" || call.name.startsWith("Resolve blocked script problem "));
    expect(authors.map((call) => call.model)).toEqual([`${pro}$high`, `${pro}$high`, `${pro}$high`, `${pro}$high`, `${pro}$max`]);
    expect(new Set(authors.slice(0, 4).map((call) => call.instance)).size).toBe(1);
    expect(authors[4].instance).not.toBe(authors[0].instance);
    expect(authors.every((call) => call.prompt.includes("finding from Explore 1") && call.prompt.includes("finding from Explore 2"))).toBe(true);

    expect(result.escalations).toHaveLength(1);
    expect(result.escalations[0].problem).toBe("B");
    expect(result.escalations[0].attempts.map((a: any) => a.round)).toEqual([3, 4]);
    expect(result.escalations[0].attempts.every((a: any) => a.completed && a.correction && a.failed && a.thinking === "high")).toBe(true);
    expect(result.escalations[0].attempts.every((a: any) => a.criterion === "B")).toBe(true);
    expect(result.escalations[0].attempts.some((a: any) => a.round === 2)).toBe(false);
    const reviewers = h.calls.filter((call) => call.name.startsWith("Review execution script round "));
    expect(reviewers).toHaveLength(5);
    expect(new Set(reviewers.map((call) => call.instance)).size).toBe(5);
    expect(reviewers.every((call) => call.model === `${pro}$high`)).toBe(true);
    expect(h.reports.filter((report) => report.stage === "script validation").map((report) => report.thinking)).toEqual(["high", "high", "high", "high", "max"]);
    expect(result.personas.some((row: string) => row.includes(`${pro}$max`))).toBe(true);
  }, 5000);

  test("synthesis prerequisite blocker returns incomplete without launching an author", async () => {
    const h = preparationHarness([], { synthesisBlocked: true });
    const result = await h.result;
    expect(result.status).toBe("blocked");
    expect(result.scriptPath).toBe("");
    expect(result.brief.blockers).toEqual(["required SQLite runtime missing"]);
    expect(h.calls.some((call) => call.name.includes("Author") || call.name.includes("Review"))).toBe(false);
    expect(result.escalations).toEqual([]);
  }, 5000);

  test("author source mutation detection prevents validation and ready output", async () => {
    const h = preparationHarness([[]], { sourceChangesAfterAuthor: true });
    await expect(h.result).rejects.toThrow("Draft author changed protected source");
    expect(h.calls.filter((call) => call.name.startsWith("Review execution"))).toEqual([]);
    expect(h.commands.some((command) => command.args.some((arg) => arg.endsWith("/scripts/check-script.ts")))).toBe(false);
    expect(h.reports.some((report) => report.stage === "preparation complete")).toBe(false);
  }, 5000);
});
