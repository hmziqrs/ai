import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// V13 engine tests: the maintained zflow-engine.dwf.ts runs unmodified against a mocked
// platform facade and real git, in throwaway repositories. world.run's cwd is a scratch
// directory OUTSIDE the fixture repo, so only the engine's own -C/--prefix anchoring can
// make its commands land in the right place.

const ENGINE_SOURCE = await readFile(join(import.meta.dir, "..", "zflow-engine.dwf.ts"), "utf8");
// The engine body carries top-level `return` statements (its refusals), so it is wrapped
// in an async function before transpiling — the same shape the platform compiles.
const executable = new Bun.Transpiler({ loader: "ts" }).transformSync(
  "async function __v13main() {\n" + ENGINE_SOURCE + "\n}\n",
);

const PRO_ID = "account:zai-individual-coding-plan/GLM-5.3";
const FLASH_ID = "account:zai-individual-coding-plan/GLM-5.3-Flash";

type AskHandler = (name: string, prompt: string) => unknown;
interface Run {
  result: Promise<any>;
  asks: string[];
  prompts: { name: string; prompt: string }[];
  models: Map<string, string | undefined>;
  phases: string[];
  commands: string[];
  reports: { item: any; tag?: string }[];
  logs: string[];
  artifacts: { id: string; content: string; opts: any }[];
}

function mockChannel() {
  const queue: unknown[] = [];
  let closed = false;
  let wakeup: (() => void) | null = null;
  const ping = () => { const w = wakeup; wakeup = null; w?.(); };
  return {
    send(item: unknown) { if (closed) throw new Error("ChannelClosed"); queue.push(item); ping(); },
    close() { closed = true; ping(); },
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          for (;;) {
            if (queue.length > 0) return { done: false, value: queue.shift() };
            if (closed) return { done: true, value: undefined };
            await new Promise<void>((r) => { wakeup = r; });
          }
        },
      };
    },
  };
}

interface Fixture {
  repoRoot: string;
  scratch: string;
  paths: string[];
  git: (args: string[], cwd?: string) => string;
  writeInRepo: (path: string, content: string) => Promise<void>;
}

const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });

async function fixture(withAgentsMd = false): Promise<Fixture> {
  const directory = await mkdtemp(join(tmpdir(), "zv13-engine-test-")); temporary.push(directory);
  const repoRoot = join(directory, "repo");
  await mkdir(repoRoot);
  const scratch = await mkdtemp(join(tmpdir(), "zv13-engine-scratch-")); temporary.push(scratch);
  const paths: string[] = [repoRoot, scratch];
  const git = (args: string[], cwd?: string) => {
    const out = Bun.spawnSync({ cmd: ["git", ...args], cwd: cwd ?? repoRoot, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
    if (out.exitCode !== 0) throw new Error("git " + args.join(" ") + " → " + out.stderr.toString());
    return out.stdout.toString();
  };
  git(["init", "-b", "main"]);
  git(["config", "user.email", "fixture@example.invalid"]);
  git(["config", "user.name", "Engine fixture"]);
  if (withAgentsMd) await writeFile(join(repoRoot, "AGENTS.md"), "# fixture rules\nBe honest.\n");
  await writeFile(join(repoRoot, "README.md"), "seed\n");
  await writeFile(join(repoRoot, ".gitignore"), ".zflow/\n");
  git(["add", "README.md", ".gitignore", ...(withAgentsMd ? ["AGENTS.md"] : [])]);
  git(["commit", "-m", "seed"]);
  return {
    repoRoot, scratch, paths, git,
    writeInRepo: async (path, content) => { await mkdir(join(repoRoot, path, ".."), { recursive: true }); await writeFile(join(repoRoot, path), content); },
  };
}

function runEngine(input: Record<string, unknown>, fx: Fixture, onAsk: AskHandler): Run {
  const run: Run = { result: null as unknown as Promise<any>, asks: [], prompts: [], models: new Map(), phases: [], commands: [], reports: [], logs: [], artifacts: [] };
  const fn = new Function("args", "model", "agent", "phase", "channel", "future", "world", "files", "artifact", "report", "log", executable + "\nreturn __v13main();");
  const worktreeOf = (prompt: string): string | undefined => /your git worktree at (\S+?) —/.exec(prompt)?.[1];
  run.result = fn(
    input,
    (id: string) => ({ id }),
    (name: string, persona?: { system?: string; model?: { id: string } }) => {
      run.asks.push(name);
      run.models.set(name, persona?.model?.id);
      return {
        ask: async (prompt: string) => {
          run.prompts.push({ name, prompt });
          return await onAsk(name, prompt);
        },
      };
    },
    (name: string) => { run.phases.push(name); },
    (_name: string) => mockChannel(),
    async (body: () => Promise<unknown>) => await body(),
    {
      run: async (cmd: string, argv: string[]) => {
        run.commands.push([cmd, ...argv].join(" "));
        const out = Bun.spawnSync({ cmd: [cmd, ...argv], cwd: fx.scratch, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
        return { exitCode: out.exitCode, stdout: out.stdout.toString(), stderr: out.stderr.toString() };
      },
    },
    {
      read: async (path: string) => await readFile(join(fx.repoRoot, path), "utf8"),
      glob: async (pattern: string) => {
        const root = pattern.replace(/\/\*$/, "");
        try { return (await readdir(join(fx.repoRoot, root))).map((entry) => root + "/" + entry); } catch { return []; }
      },
    },
    {
      board: () => {},
      markdown: async (id: string, content: string, opts: any) => { run.artifacts.push({ id, content, opts }); return { id, version: 1 }; },
    },
    (item: unknown, tag?: string) => { run.reports.push({ item, tag }); },
    (message: string) => { run.logs.push(message); },
  );
  return run;
}

const baseArgs = (fx: Fixture, areas: unknown[], extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  mode: "chain", task: "Implement a tiny fixture area", areas,
  baseSha: fx.git(["rev-parse", "HEAD"]).trim(), repoRoot: fx.repoRoot, agentsMd: "",
  ...extra,
});

const terminalArea = (extra: Record<string, unknown> = {}) => ({
  name: "api", contention: "terminal", paths: ["src/api"], excludedPaths: [], skills: [],
  gates: [], complexity: "straightforward", dependsOn: [], ...extra,
});

function worktreeOfPrompt(prompt: string): string {
  const match = /your git worktree at (\S+?) —/.exec(prompt);
  if (!match) throw new Error("implementer prompt names no worktree:\n" + prompt);
  return match[1];
}
async function implementerWrites(prompt: string, path: string, content = "implemented\n") {
  const worktree = worktreeOfPrompt(prompt);
  await mkdir(join(worktree, path, ".."), { recursive: true });
  await writeFile(join(worktree, path), content);
  return { summary: "wrote " + path, changedFiles: [path], notes: "", skipped: [] };
}

describe("V13 zflow engine (v2.2 line)", () => {
  test("static discipline: the engine never pushes, resets, force-cleans or verifies-bypasses", () => {
    for (const forbidden of ["[\"push\"", "[\"reset\"", "[\"clean\"", "[\"checkout\"", "\"--force\"", "\"--no-verify\"", "Date.now", "Math.random", "process.", "fetch("]) {
      expect(ENGINE_SOURCE.includes(forbidden), forbidden).toBe(false);
    }
    expect(ENGINE_SOURCE.match(/phase\("/g)).toHaveLength(6);
  });

  test("an invalid mode refuses before any ask or command", async () => {
    const fx = await fixture();
    const run = runEngine({ ...baseArgs(fx, [terminalArea()]), mode: "implement" }, fx, () => { throw new Error("no ask expected"); });
    const result = await run.result;
    expect(result.conclusion).toContain("Refused to start");
    expect(result.findings).toEqual([]);
    expect(run.asks).toEqual([]);
    expect(run.commands).toEqual([]);
  });

  test("empty areas refuse without worktrees", async () => {
    const fx = await fixture();
    const run = runEngine(baseArgs(fx, []), fx, () => { throw new Error("no ask expected"); });
    const result = await run.result;
    expect(result.conclusion).toContain("Refused to start: areas must be a non-empty array");
    expect(fx.git(["worktree", "list"])).not.toContain("_integration");
  });

  test("a terminal area plans, implements in the integration worktree, and settles clean without writing the checkout", async () => {
    const fx = await fixture();
    const run = runEngine(baseArgs(fx, [terminalArea()]), fx, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module under src/api.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name === "Committer") throw new Error("no commit without gates");
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "clean" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(result.conclusion).toContain("Chain finished clean: 1 of 1 area(s)");
    const head = fx.git(["rev-parse", "HEAD"]).trim();
    expect(fx.git(["status", "--porcelain"])).toBe("");
    expect(fx.git(["rev-parse", "HEAD"]).trim()).toBe(head);
    expect(fx.git(["worktree", "list"])).toContain("_integration-");
    const branches = fx.git(["branch", "--list", "zflow/*"]);
    expect(branches).toContain("integration");
    expect(branches).not.toContain("/api");
    expect(run.models.get("planner-api")).toBe(PRO_ID);
    expect(run.artifacts.filter((a) => a.id === "report")).toHaveLength(1);
    expect(run.artifacts[0].opts.primary).toBe(true);
    const report = run.artifacts[0].content;
    expect(report).toContain("The engine did not write your checkout");
    expect(report).toContain("z-workflow Step 6");
  });

  test("green gates let the script commit the area's work on the integration branch", async () => {
    const fx = await fixture();
    const run = runEngine(baseArgs(fx, [terminalArea({ gates: [{ tool: "git", args: ["log", "-1"] }] })]), fx, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name === "Committer") return { message: "feat: add fixture module" };
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "clean" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(result.conclusion).toContain("Chain finished clean");
    expect(result.verified.join(" ")).toContain("commits");
    const integration = fx.git(["worktree", "list"]).split("\n").find((l) => l.includes("_integration-"))!.split(" ")[0];
    expect(fx.git(["log", "--format=%s", "-1"], integration).trim()).toBe("feat: add fixture module");
    expect(run.commands.some((c) => c.includes(" add src/api/index.ts") || c.includes(" add \"src/api/index.ts\""))).toBe(true);
    expect(fx.git(["status", "--porcelain"])).toBe("");
  });

  test("a red gate becomes a verified HIGH finding and stagnation stops honestly after three rounds", async () => {
    const fx = await fixture();
    const run = runEngine(baseArgs(fx, [terminalArea({ gates: [{ tool: "git", args: ["rev-parse", "--verify", "NO-SUCH-REF"] }] })]), fx, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "the gate itself fails" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(result.conclusion).toContain("Chain finished: 0 of 1 area(s) clean");
    expect(result.conclusion).not.toContain("clean:");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].status).toBe("verified");
    expect(result.findings[0].severity).toBe("high");
    expect(result.findings[0].what).toContain("still red");
    expect(run.asks.filter((n) => n.startsWith("implementer-api"))).toHaveLength(3);
    expect(run.asks.filter((n) => n.startsWith("judge-api"))).toHaveLength(3);
    expect(fx.git(["status", "--porcelain"])).toBe("");
    const branches = fx.git(["branch", "--list", "zflow/*"]);
    expect(branches).toContain("integration");
    expect(branches).not.toContain("/api");
  });

  test("mutating gates are refused before execution and never run", async () => {
    const fx = await fixture();
    const run = runEngine(baseArgs(fx, [terminalArea({ gates: [{ tool: "bun", args: ["run", "fix", "--write"] }] })]), fx, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "clean" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(run.commands.some((c) => c.includes("--write"))).toBe(false);
    const report = run.artifacts[0].content;
    expect(report).toContain("mutating gates are not allowed");
    expect(result.verified.join(" ")).not.toContain("bun run fix --write");
  });

  test("a web area captures through flash, keeps vision findings unconfirmed and deferred, and merges its branch", async () => {
    const fx = await fixture();
    const webArea = { name: "web", contention: "web", paths: ["src/web"], excludedPaths: [], skills: [], gates: [{ tool: "git", args: ["log", "-1"] }], complexity: "straightforward", dependsOn: [] };
    const run = runEngine(baseArgs(fx, [webArea]), fx, (name, prompt) => {
      if (name === "planner-web") return "Add a web fixture.";
      if (name === "plan-reviewer-web") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-web")) return implementerWrites(prompt, "src/web/index.ts");
      if (name === "Committer") return { message: "feat: add web fixture" };
      if (name.startsWith("capture-web")) return { lane: "web", evidencePaths: [".zflow/evidence/web-r1-web-1.png"], notes: "claimed but not landed" };
      if (name.startsWith("vision-audit-web")) return { verdict: "button misaligned on the seed page", findings: [{ where: "src/web", what: "button misaligned", evidence: ".zflow/evidence/web-r1-web-1.png", severity: "medium" }] };
      if (name.startsWith("judge-web")) return { findings: [], overallNote: "code and gates look fine; pixels are not mine" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(run.models.get("capture-web-r1")).toBe(FLASH_ID);
    expect(run.models.get("vision-audit-web-r1")).toBe(FLASH_ID);
    expect(run.models.get("judge-web-r0")).toBe(PRO_ID);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].status).toBe("unconfirmed");
    expect(result.findings[0].severity).toBe("medium");
    expect(result.conclusion).toContain("1 unconfirmed vision finding(s)");
    expect(result.conclusion).toContain("1 of 1 area(s) clean");
    const tag = fx.git(["rev-parse", "--short=8", "HEAD"]).trim();
    expect(fx.git(["branch", "--list", "zflow/*"])).toContain("zflow/" + tag + "/web");
    expect(fx.git(["worktree", "list"])).not.toContain(tag + "-web");
    expect(fx.git(["status", "--porcelain"])).toBe("");
  });

  test("vision: false compiles the vision phase away and runs non-terminal areas from code and gates only", async () => {
    const fx = await fixture();
    const webArea = { name: "web", contention: "web", paths: ["src/web"], excludedPaths: [], skills: [], gates: [], complexity: "straightforward", dependsOn: [] };
    const run = runEngine(baseArgs(fx, [webArea], { vision: false }), fx, (name, prompt) => {
      if (name === "planner-web") return "Add a web fixture.";
      if (name === "plan-reviewer-web") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-web")) return implementerWrites(prompt, "src/web/index.ts");
      if (name.startsWith("judge-web")) return { findings: [], overallNote: "clean from code" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(run.phases).not.toContain("Capture and audit the visual evidence for each UI area");
    expect(run.asks.some((n) => n.startsWith("capture-"))).toBe(false);
    expect(result.conclusion).toContain("Chain finished clean");
    expect(result.notCovered.join(" ")).toContain("no capture and no pixel/AX evidence");
  });

  test("a present AGENTS.md is injected into every ask; a missing one is reported in notCovered", async () => {
    const fx = await fixture(true);
    const run = runEngine({ ...baseArgs(fx, [terminalArea()]), agentsMd: "AGENTS.md" }, fx, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "clean" };
      throw new Error("unexpected ask: " + name);
    });
    const result = await run.result;
    expect(result.conclusion).toContain("Chain finished clean");
    for (const prompt of run.prompts) {
      if (prompt.name === "plan-reviewer-api" || prompt.name.startsWith("judge-api")) {
        expect(prompt.prompt).toContain("Read AGENTS.md first");
      }
    }
    expect(result.notCovered.join(" ")).not.toContain("AGENTS.md");

    const fx2 = await fixture(false);
    const run2 = runEngine({ ...baseArgs(fx2, [terminalArea()]), agentsMd: "AGENTS.md" }, fx2, (name, prompt) => {
      if (name === "planner-api") return "Add a fixture module.";
      if (name === "plan-reviewer-api") return { verdict: "sound", problems: [] };
      if (name.startsWith("implementer-api")) return implementerWrites(prompt, "src/api/index.ts");
      if (name.startsWith("judge-api")) return { findings: [], overallNote: "clean" };
      throw new Error("unexpected ask: " + name);
    });
    const result2 = await run2.result;
    expect(result2.notCovered.join(" ")).toContain("AGENTS.md: not found or empty");
  });
});
