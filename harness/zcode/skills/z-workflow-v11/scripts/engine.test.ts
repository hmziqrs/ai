import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import { composeLibrary, normalizeSelection } from "./compose.ts";
const selections = normalizeSelection(["unit-tests", "tui-tests", "audit", "browser", "web-vision", "native-vision", "mobile-vision"].map(name => ({name,authorization:"Fixture explicit scope"})));
const source = (await composeLibrary(join(import.meta.dir, ".."), selections)).source
  .replace(/const v11Result = await runV11\(INPUT\);[\s\S]*$/, "");
const executable = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });

function git(cwd: string, args: string[]) {
  const out = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  if (out.exitCode) throw new Error(out.stderr.toString());
  return out.stdout.toString().trim();
}
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "zv11-engine-test-")); temporary.push(directory);
  const repo = join(directory, "repo"); await mkdir(repo);
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "fixture@example.invalid"]);
  git(repo, ["config", "user.name", "Engine fixture"]);
  await writeFile(join(repo, "README.md"), "seed\n");
  await writeFile(join(repo, ".gitignore"), ".zcode/workflow-drafts/\n");
  git(repo, ["add", "README.md", ".gitignore"]); git(repo, ["commit", "-m", "seed"]);
  return { repoRoot: repo, task: "Implement a tiny fixture", baseCommit: git(repo, ["rev-parse", "HEAD"]), branchRef: "refs/heads/main", startedAt: "2026-10-20T10:00:00.000Z", skillRoot: "/fixture/skill", instructionPaths: [], requirements: { minimumAreas: 1 } };
}
function area(id: string, extra: Record<string, unknown> = {}) {
  return { id, title: id, personaPath: "/fixture/" + id + ".md", ownedPaths: [id], dependsOn: [], instructions: "Implement " + id, setup: [], assembly: [], ...extra };
}
function plan(areas: unknown[], extra: Record<string, unknown> = {}) {
  return { sharedContract: "Independent paths", areas, setup: [], assembly: [], blockers: [], notes: [], ...extra };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
async function write(cwd: string, path: string, content = "implemented\n") {
  await mkdir(dirname(join(cwd, path)), { recursive: true }); await writeFile(join(cwd, path), content);
}
function retained(result: any, note: string): string[] {
  return (result.retainedBranches ?? []).filter((entry: string) => entry.endsWith(note)).map((entry: string) => entry.slice(0, -note.length - 1));
}
function leftoverWorktrees(repoRoot: string): string[] {
  return readdirSync(dirname(repoRoot)).filter((entry) => entry.includes("-zv11-"));
}
interface MockOptions {
  configure?: (count: number, prompt: string) => unknown;
  implement?: (id: string, cwd: string, prompt: string, count: number) => Promise<any>;
  probe?: (cwd: string, args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  inspect?: (name: string, prompt: string) => Promise<{ summary: string; blockers: string[]; findings: string[] }>;
}
function harness(manifest: unknown, options: MockOptions = {}) {
  const events: any[] = []; const calls: string[] = []; const counts = new Map<string, number>();
  const configurationPrompts: string[] = [];
  const world = { run: async (tool: string, argv: string[]) => {
    if (tool === "date") return { exitCode: 0, stdout: "2026-10-20T10:01:00Z\n", stderr: "" };
    expect(tool).toBe("sh"); expect(argv.slice(0, 3)).toEqual(["-c", 'cd "$1" && shift && exec "$@"', "sh"]);
    const cwd = argv[3], command = argv[4], args = argv.slice(5);
    calls.push(command + " " + args.join(" "));
    if (command === "bun" && args[2]?.endsWith("/scripts/run-command.ts")) {
      const innerTool=args[3],innerArgs=JSON.parse(args[4]),tag=args[5];
      calls.push(innerTool + " " + innerArgs.join(" "));
      let out:any;
      if(innerTool === "probe") out=await options.probe?.(cwd,innerArgs) ?? {exitCode:0,stdout:"",stderr:""};
      else { const child=Bun.spawnSync({cmd:[innerTool,...innerArgs],cwd,stdout:"pipe",stderr:"pipe"});out={exitCode:child.exitCode,stdout:child.stdout.toString(),stderr:child.stderr.toString()}; }
      await write(cwd,".zcode/workflow-drafts/v11-evidence/"+tag+".jsonl",JSON.stringify({...out,tool:innerTool,args:innerArgs})+"\n");
      return out;
    }
    if (command === "probe") return options.probe?.(cwd, args) ?? { exitCode: 0, stdout: "", stderr: "" };
    const out = Bun.spawnSync({ cmd: [command, ...args], cwd, stdout: "pipe", stderr: "pipe" });
    return { exitCode: out.exitCode, stdout: out.stdout.toString(), stderr: out.stderr.toString() };
  } };
  const v11Agent = (_persona: unknown, name: string, rules: string) => ({ ask: async (prompt: string) => {
    calls.push("ask " + name);
    if (name === "V11 configurator") { configurationPrompts.push(prompt); return options.configure ? options.configure(configurationPrompts.length, prompt) : manifest; }
    if (!name.startsWith("V11 implementer ")) return options.inspect?.(name, prompt) ?? { summary: "Requested check", blockers: [], findings: [] };
    const id = name.slice("V11 implementer ".length), cwd = rules.match(/^Work only in (.*?)\. Own only/)![1];
    const count = (counts.get(id) ?? 0) + 1; counts.set(id, count);
    if (options.implement) return await options.implement(id, cwd, prompt, count);
    await write(cwd, id + "/result.txt"); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
  } });
  const runtime = new Function("world", "v11Persona", "v11Agent", "phase", "report", "guardWrites", "future", executable + "\nreturn { runV11, v11ValidatePlan, v11ValidateWork }; ")(
    world, async (path: string, tier: string, access: string) => ({ path, tier, access }), v11Agent, () => {}, (event: unknown) => events.push(event), async (_persona: unknown, cwd: string, work: () => Promise<unknown>) => {
      const before = git(cwd, ["diff", "HEAD"]) + git(cwd, ["status", "--porcelain", "--untracked-files=all"]) + git(cwd, ["rev-parse", "HEAD"]);
      const result = await work();
      if (before !== git(cwd, ["diff", "HEAD"]) + git(cwd, ["status", "--porcelain", "--untracked-files=all"]) + git(cwd, ["rev-parse", "HEAD"])) throw new Error("Read-only guard detected writes");
      return result;
    }, async <T,>(body: () => Promise<T>): Promise<T> => await body());
  const addInput = (input: any, suppliedManifest: any = manifest) => {
    const phases = (Array.isArray(suppliedManifest?.areas) ? suppliedManifest.areas : []).flatMap((area: any) => Array.isArray(area?.phases) ? area.phases.filter(Boolean) : []);
    const names = [...new Set(phases.map((phase: any) => phase.kind))] as string[];
    return {...input,plan:suppliedManifest,mode:input.mode ?? "execute",pieces:input.pieces ?? names.map(name=>({name,authorization:"Fixture user requested",mode:"until-clean",rounds:1,fixFindings:phases.some((phase:any)=>phase.kind===name&&phase.fixFindings)}))};
  };
  return { ...runtime, runV11:(input:any)=>runtime.runV11(addInput(input)), v11ValidatePlan:(plan:any)=>runtime.v11ValidatePlan(plan,addInput({},plan)), events, calls, counts, configurationPrompts };
}

describe("V11 per-area static engine", () => {
  test("a dependent starts as soon as its parent commits, while the parent's lane audit still runs", async () => {
    const input = await fixture(); const auditStarted = deferred(), auditDone = deferred(); let uiStarted = false;
    const runtime = harness(plan([
      area("api", { phases: [{ id: "audit-api", kind: "audit", personaPath: "/fixture/audit.md", instructions: "User requested per-lane audit" }] }),
      area("ui", { dependsOn: ["api"] })
    ]), {
      implement: async (id, cwd) => {
        if (id === "ui") { uiStarted = true; auditDone.resolve(); }
        await write(cwd, id + "/result.txt"); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
      },
      inspect: async (name) => {
        if (name.includes("audit-api")) { auditStarted.resolve(); await auditDone.promise; }
        return { summary: "Lane audit clean", blockers: [], findings: [] };
      }
    });
    const running = runtime.runV11(input);
    await auditStarted.promise;               // api's audit is running...
    expect(uiStarted).toBe(false);            // ...ui waits for api's COMMIT, not this ask
    await new Promise<void>((done) => { const t = setInterval(() => { if (runtime.counts.get("ui")) { clearInterval(t); done(); } }, 5); });
    expect(uiStarted).toBe(true);             // ui started while the audit is still parked on auditDone
    const result = await running;
    expect(result.status).toBe("complete"); expect(result.areas.every((a: any) => a.status === "ready")).toBe(true);
  });

  test("each area's setup precedes its writer without holding independent areas", async () => {
    const input = await fixture(), slowSetup = deferred(), fastWriter = deferred();
    const runtime = harness(plan([
      area("api", { setup: [{tool: "probe", args: ["api-setup"], owners: ["api"]}] }),
      area("ui", { setup: [{tool: "probe", args: ["ui-setup"], owners: ["ui"]}] })
    ]), {
      probe: async (cwd, args) => {
        if (args[0] === "api-setup") await slowSetup.promise;
        await write(cwd, args[0].startsWith("api") ? "api/prepared.txt" : "ui/prepared.txt");
        return {exitCode: 0, stdout: "", stderr: ""};
      },
      implement: async (id, cwd) => {
        expect(await readFile(join(cwd, id + "/prepared.txt"), "utf8")).toBe("implemented\n");
        if (id === "ui") fastWriter.resolve();
        await write(cwd, id + "/result.txt");
        return {status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: []};
      }
    });
    const running = runtime.runV11(input);
    await fastWriter.promise;
    expect(runtime.counts.get("api")).toBeUndefined();
    slowSetup.resolve();
    expect((await running).status).toBe("complete");
  });

  test("failed setup blocks only its area before creating its implementer", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", {setup: [{tool: "probe", args: [], owners: ["api"]}]}), area("ui")]), {
      probe: async () => ({exitCode: 1, stdout: "", stderr: "package registry unreachable"})
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete");
    expect(result.blockers.join()).toContain("Required setup failed before implementation");
    expect(runtime.counts.get("api")).toBeUndefined();
    expect(result.areas.find((area: any) => area.id === "ui").status).toBe("ready");
  });

  test("candidate setup consumes the merged output and precedes integrated assembly", async () => {
    const input = await fixture(); let prepared = false;
    const runtime = harness(plan([area("api"), area("ui")], {
      setup: [{tool: "probe", args: ["candidate-setup"], owners: ["api", "ui"]}],
      assembly: [{tool: "probe", args: ["build"], owners: ["api", "ui"]}]
    }), {probe: async (cwd, args) => {
      expect(await readFile(join(cwd, "api/result.txt"), "utf8")).toBe("implemented\n");
      expect(await readFile(join(cwd, "ui/result.txt"), "utf8")).toBe("implemented\n");
      if (args[0] === "candidate-setup") prepared = true;
      else expect(prepared).toBe(true);
      return {exitCode: 0, stdout: "", stderr: ""};
    }});
    expect((await runtime.runV11(input)).status).toBe("complete");
  });

  test("deferred engine checks in observations never block or trigger another ask", async () => {
    const input = await fixture(); let assemblies = 0;
    const runtime = harness(plan([area("ui", {assembly: [{tool: "probe", args: [], owners: ["ui"]}]})]), {
      implement: async (_id, cwd) => {
        await write(cwd, "ui/result.txt");
        return {status: "implemented", changedPaths: ["ui/result.txt"], summary: "UI implemented", blockers: [], observations: ["Type-check deferred to engine assembly"]};
      },
      probe: async () => { assemblies++; return {exitCode: 0, stdout: "", stderr: ""}; }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("complete");
    expect(runtime.counts.get("ui")).toBe(1);
    expect(assemblies).toBe(1);
    expect(result.areas[0].observations).toEqual(["Type-check deferred to engine assembly"]);
  });

  test("the V6 prose blocker is clarified locally without code or check repetition", async () => {
    const input = await fixture(); let assemblies = 0;
    const runtime = harness(plan([area("ui", {assembly: [{tool: "probe", args: [], owners: ["ui"]}]})]), {
      implement: async (_id, cwd, prompt, count) => {
        if (count === 1) {
          await write(cwd, "ui/result.txt");
          return {changedPaths: ["ui/result.txt"], summary: "UI implemented", blockers: ["None blocking implementation. Type-check deferred to engine assembly"]};
        }
        expect(prompt).toContain("No tools, file edits, new exploration, rechecks");
        return {status: "implemented", changedPaths: ["ui/result.txt"], summary: "UI implemented", blockers: [], observations: ["Type-check deferred to engine"]};
      },
      probe: async () => { assemblies++; return {exitCode: 0, stdout: "", stderr: ""}; }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("complete");
    expect(runtime.counts.get("ui")).toBe(2);
    expect(assemblies).toBe(1);
    expect(runtime.events).toContainEqual(expect.objectContaining({area: "ui", step: "completion-report", status: "clarifying"}));
    expect(runtime.events.filter((event: any) => event.area === "ui" && event.step === "implementation")).toHaveLength(1);
  });

  test("valid genuine blockers are preserved while malformed reports stop after one clarification", async () => {
    for (const malformed of [false, true]) {
      const input = await fixture();
      const runtime = harness(plan([area("api")]), {implement: async (_id, cwd) => {
        await write(cwd, "api/partial.txt");
        return malformed ? {status: "implemented", changedPaths: [], summary: "Contradiction", observations: [], blockers: [{kind: "input", detail: "Missing actual input"}]} :
          {status: "blocked", changedPaths: ["api/partial.txt"], summary: "Partial work retained", observations: [], blockers: [{kind: "permission", detail: "User authorization required for external dependency"}]};
      }});
      const result = await runtime.runV11(input);
      expect(result.status).toBe("incomplete");
      expect(runtime.counts.get("api")).toBe(malformed ? 2 : 1);
      expect(result.blockers.join()).toContain(malformed ? "Invalid completion report after one clarification" : "permission: User authorization required");
      expect(runtime.calls.some((call) => call.startsWith("git add --"))).toBe(false);
      expect(git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateBranch])).not.toContain("api/partial.txt");
    }
  });

  test("the failed V5 directory notation normalizes without a model retry or lost dotfiles", async () => {
    const input = await fixture();
    const manifest = plan([
      area("backend", { ownedPaths: ["src/lib/server/", "src/routes/api/", "README.md", ".gitignore"] }),
      area("frontend", { ownedPaths: ["src/routes/+page.svelte", "src/routes/+layout.svelte", "src/app.css", "src/lib/todo.ts", "src/lib/components/"] })
    ]);
    const runtime = harness(manifest, {
      implement: async (id, cwd) => {
        const path = id === "backend" ? "src/lib/server/api.ts" : "src/lib/components/Todo.svelte";
        await write(cwd, path); return { status: "implemented", observations: [], changedPaths: [path], summary: "done", blockers: [] };
      }
    });
    expect((await runtime.runV11(input)).status).toBe("complete");
    expect(runtime.configurationPrompts).toHaveLength(0);
    expect(manifest.areas[0].ownedPaths).toContain(".gitignore");
    expect(manifest.areas[0].ownedPaths).toContain("src/lib/server");
    expect(manifest.areas[1].ownedPaths).toContain("src/lib/components");
  });

  test("normalization preserves traversal rejection and ownership conflict detection", () => {
    const runtime = harness(null);
    for (const path of ["/src/", "../src/", "src/../api/", "src//api/", "src//", "./src/", "src/.git/", "src/\\api/", "src/\u0000/"]) {
      expect(() => runtime.v11ValidatePlan(plan([area("api", { ownedPaths: [path] })]))).toThrow("ownedPaths[0]");
    }
    expect(() => runtime.v11ValidatePlan(plan([area("api", { ownedPaths: ["src/"] }), area("ui", { ownedPaths: ["src/ui/"] })]))).toThrow("Overlapping ownership");
    expect(() => runtime.v11ValidatePlan(plan([area("api", { ownedPaths: [".gitignore", ".github/workflows/"] }), area("ui")]))).not.toThrow();
  });

  test("prepared data dispatches writers without a redundant configurator ask", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api")]));
    expect((await runtime.runV11(input)).status).toBe("complete");
    expect(runtime.configurationPrompts).toHaveLength(0);
    expect(runtime.counts.get("api")).toBe(1);
    expect(runtime.calls.some((c) => c.includes("configurator"))).toBe(false);
  });

  test("repeated invalid shape stops with a field diagnostic and no product mutations", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { dependsOn: null })]));
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete");
    expect(result.blockers.join()).toContain("areas[0].dependsOn");
    expect(runtime.configurationPrompts).toHaveLength(0);
    expect(runtime.calls.some((call) => call.startsWith("git worktree") || call.startsWith("ask V11 implementer"))).toBe(false);
    expect(git(input.repoRoot, ["status", "--porcelain"])).toBe("");
  });

  test("invalid JSON field types report their field instead of a JavaScript TypeError", () => {
    const runtime = harness(null);
    for (const [manifest, field] of [
      [null, "RunPlan"], [plan([null]), "areas[0]"], [plan([area("api", { title: false })]), "title"],
      [plan([area("api", { ownedPaths: [null] })]), "ownedPaths[0]"],
      [plan([area("api", { phases: {} })]), "phases"],
      [plan([area("api", { phases: [null] })]), "phases[0]"],
      [plan([area("api", { assembly: [null] })]), "assembly[0]"],
      [plan([area("api", { assembly: [{ tool: "bun", args: [], owners: ["api", "api"] }] })]), "owners"]
    ] as const) expect(() => runtime.v11ValidatePlan(manifest)).toThrow(field);
  });

  test("inline smokes and test runners cannot hide inside assembly but opt-in phases allow them", () => {
    const runtime = harness(null);
    for (const [tool, args] of [["bun", ["--bun", "-e", "await fetch('/api/todos')"]], ["node", ["--eval=assert(false)"]], ["sh", ["-c", "bun test"]], ["bun", ["test"]]] as [string, string[]][]) {
      const command = { tool, args, owners: ["api"] };
      expect(() => runtime.v11ValidatePlan(plan([area("api", { assembly: [command] })]))).toThrow("assembly accepts setup/build commands");
      expect(() => runtime.v11ValidatePlan(plan([area("api", { phases: [{ id: "requested", kind: "unit-tests", commands: [command], instructions: "User explicitly requested API tests" }] }), area("ui")]))).not.toThrow();
    }
    expect(() => runtime.v11ValidatePlan(plan([area("api", { assembly: [{ tool: "bun", args: ["install", "--frozen-lockfile"], owners: ["api"] }] }), area("ui")], { assembly: [{ tool: "bun", args: ["run", "build"], owners: ["api"] }] }))).not.toThrow();
  });

  test("an area enters its requested next phase while its sibling still implements", async () => {
    const input = await fixture(), siblingStarted = deferred(), nextPhase = deferred(), releaseSibling = deferred();
    const runtime = harness(plan([
      area("ui", { phases: [{ id: "visual", kind: "native-vision", commands: [{ tool: "probe", args: ["capture"], owners: ["ui"] }], instructions: "User explicitly requested screenshots", personaPath: "/fixture/vision.md", resource: "browser", cleanup: [{tool:"probe",args:["cleanup"],owners:["ui"]}] }] }),
      area("api")
    ]), {
      implement: async (id, cwd) => {
        if (id === "api") { siblingStarted.resolve(); await releaseSibling.promise; }
        else await siblingStarted.promise;
        await write(cwd, id + "/result.txt"); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
      },
      probe: async () => { nextPhase.resolve(); return { exitCode: 0, stdout: "captured", stderr: "" }; }
    });
    const running = runtime.runV11(input);
    await nextPhase.promise;
    expect(runtime.events.some((event: any) => event.area === "api" && event.step === "complete")).toBe(false);
    releaseSibling.resolve();
    const result = await running;
    expect(result.status).toBe("complete");
    expect(runtime.events.findIndex((event: any) => event.area === "ui" && event.step === "visual")).toBeLessThan(runtime.events.findIndex((event: any) => event.area === "api" && event.step === "complete"));
    expect(git(input.repoRoot, ["rev-parse", "HEAD"])).toBe(input.baseCommit);
    expect(git(input.repoRoot, ["status", "--porcelain"])).toBe("");
  });

  test("implementation dependencies consume the committed parent result", async () => {
    const input = await fixture(); let consumed = false;
    const runtime = harness(plan([area("api"), area("ui", { dependsOn: ["api"] })]), {
      implement: async (id, cwd) => {
        if (id === "ui") consumed = (await readFile(join(cwd, "api/result.txt"), "utf8")) === "api";
        await write(cwd, id + "/result.txt", id); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
      }
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(consumed).toBe(true);
  });

  test("unknown dependencies, cycles and overlapping ownership reject before writes", async () => {
    const input = await fixture();
    for (const areas of [
      [area("api", { dependsOn: ["missing"] })],
      [area("api", { phases: [{ id: "test", kind: "unit-tests", commands: [], instructions: "User requested", dependsOn: ["ui"] }] }), area("ui", { dependsOn: ["api"] })],
      [area("api", { ownedPaths: ["src"] }), area("ui", { ownedPaths: ["src/ui"] })]
    ]) {
      const runtime = harness(plan(areas));
      const result = await runtime.runV11(input);
      expect(result.status).toBe("incomplete");
      expect(result.blockers.join()).toContain("Invalid prepared plan");
      expect(runtime.configurationPrompts).toHaveLength(0);
      expect(runtime.calls.some((call) => call.startsWith("git worktree"))).toBe(false);
    }
  });

  test("parallel-by-default floor: one writer needs an explicit single-lane requirement", async () => {    const single = harness(plan([area("api")]));
    const rejected = await single.runV11({ ...await fixture(), requirements: undefined });
    expect(rejected.status).toBe("incomplete");
    expect(rejected.blockers.join()).toContain("at least 2 implementation areas");
    expect(single.calls.some((call) => call.startsWith("git worktree"))).toBe(false);
    expect((await single.runV11({ ...await fixture(), requirements: { minimumAreas: 1 } })).status).toBe("complete");
    const pair = harness(plan([area("api"), area("ui")]));
    expect((await pair.runV11({ ...await fixture(), requirements: undefined })).status).toBe("complete");
    const raised = await pair.runV11({ ...await fixture(), requirements: { minimumAreas: 3 } });
    expect(raised.status).toBe("incomplete");
    expect(raised.blockers.join()).toContain("at least 3 implementation areas");
    const blocked = await harness(plan([area("solo")], { blockers: ["No viable parallel seam"] })).runV11({ ...await fixture(), requirements: undefined });
    expect(blocked.status).toBe("incomplete");
    expect(blocked.blockers.join()).toContain("No viable parallel seam");
  });

  test("an audit phase may omit the commands key; it normalizes to an empty array", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { phases: [{ id: "review", kind: "audit", personaPath: "/fixture/audit.md", instructions: "User requested read-only audit" }] }), area("ui")]));
    expect((await runtime.runV11(input)).status).toBe("complete");
    const raw = plan([area("api", { phases: [{ id: "review", kind: "audit", personaPath: "/fixture/audit.md", instructions: "User requested read-only audit" }] }), area("ui")]);
    expect(raw.areas[0].phases[0].commands).toBeUndefined();
    runtime.v11ValidatePlan(raw);
    expect(Array.isArray(raw.areas[0].phases[0].commands)).toBe(true);
    expect(raw.areas[0].phases[0].commands).toHaveLength(0);
  });

  test("a blocked area leaves independent work complete and recoverable from branches", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui")]), {
      implement: async (id, cwd) => {
        if (id === "api") return { status: "blocked", observations: [], changedPaths: [], summary: "blocked", blockers: [{kind: "input", detail: "Missing service"}] };
        await write(cwd, "ui/result.txt"); return { status: "implemented", observations: [], changedPaths: ["ui/result.txt"], summary: "done", blockers: [] };
      }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete"); expect(result.areas.find((area: any) => area.id === "ui").status).toBe("ready");
    expect(git(input.repoRoot, ["show", result.candidateBranch + ":ui/result.txt"])).toBe("implemented");
    expect(retained(result, "(delivery reference)")).toHaveLength(1);
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
  });

  test("blocked area work is auto-committed and its unmerged branch retained on teardown", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui")]), {
      implement: async (id, cwd) => {
        if (id === "api") { await write(cwd, "api/partial.txt", "half done\n"); return { status: "blocked", observations: [], changedPaths: ["api/partial.txt"], summary: "blocked mid-work", blockers: [{kind: "input", detail: "Missing service"}] }; }
        await write(cwd, "ui/result.txt"); return { status: "implemented", observations: [], changedPaths: ["ui/result.txt"], summary: "done", blockers: [] };
      }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete");
    const api = result.areas.find((area: any) => area.id === "api");
    expect(git(input.repoRoot, ["show", api.branch + ":api/partial.txt"])).toBe("half done");
    expect(retained(result, "(unmerged work retained)")).toContain(api.branch);
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
  });

  test("successful teardown deletes merged area branches and keeps the candidate delivery reference", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui")]));
    const result = await runtime.runV11(input);
    expect(result.status).toBe("complete");
    expect(retained(result, "(delivery reference)")).toEqual([result.candidateBranch]);
    expect(git(input.repoRoot, ["branch", "--list", "z-v11/*"])).toBe(result.candidateBranch);
    expect(git(input.repoRoot, ["rev-parse", result.candidateBranch])).toBe(result.candidateCommit);
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
    let registryLeft = ""; try { registryLeft = (await readFile(join(input.repoRoot, ".zcode/workflow-drafts/worktrees.jsonl"), "utf8")).trim(); } catch { }
    expect(registryLeft).toBe("");
  });

  test("dependency-blocked areas advertise no phantom worktree or branch", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui", { dependsOn: ["api"] })]), {
      implement: async (id) => id === "api"
        ? { status: "blocked", observations: [], changedPaths: [], summary: "blocked", blockers: [{kind: "input", detail: "Missing service"}] }
        : { status: "implemented", observations: [], changedPaths: [], summary: "done", blockers: [] }
    });
    const result = await runtime.runV11(input);
    const ui = result.areas.find((area: any) => area.id === "ui");
    expect(ui.status).toBe("blocked"); expect(ui.worktree).toBe(""); expect(ui.branch).toBe("");
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
  });

  test("a mid-run engine failure still tears down every created worktree", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api")], { assembly: [{ tool: "probe", args: ["vanish"], owners: ["api"] }] }), {
      probe: async (cwd, args) => {
        if (args[0] === "vanish") await rm(cwd, { recursive: true, force: true });
        return { exitCode: 0, stdout: "", stderr: "" };
      }
    });
    await expect(runtime.runV11(input)).rejects.toThrow();
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
    expect(git(input.repoRoot, ["worktree", "list"])).not.toContain("-zv11-");
  });

  test("required assembly failure returns to the same persistent owner without QA", async () => {
    const input = await fixture(); let attempts = 0;
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: ["build"], owners: ["api"] }] })]), {
      implement: async (_id, cwd, _prompt, count) => {
        await write(cwd, "api/result.txt", String(count)); return { status: "implemented", observations: [], changedPaths: ["api/result.txt"], summary: "done", blockers: [] };
      },
      probe: async () => ({ exitCode: ++attempts === 1 ? 1 : 0, stdout: "", stderr: "compiler failure" })
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
    expect(runtime.calls.filter((call) => call.startsWith("ask V11 ")).every((call) => call === "ask V11 configurator" || call === "ask V11 implementer api")).toBe(true);
  });

  test("a repeated correction with no changed progress stops incomplete", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: [], owners: ["api"] }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "unresolved" })
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete"); expect(runtime.counts.get("api")).toBe(2); expect(result.blockers.join()).toContain("No changed progress");
  });

  test("an environment-only correction is retried before declaring no progress", async () => {
    const input = await fixture(); let ready = false;
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: ["needs-dependency"], owners: ["api"] }] })]), {
      implement: async (_id, cwd, _prompt, count) => {
        if (count === 1) await write(cwd, "api/result.txt");
        else ready = true; // represents installing an ignored dependency, no source diff
        return { status: "implemented", observations: [], changedPaths: count === 1 ? ["api/result.txt"] : [], summary: "prepared", blockers: [] };
      },
      probe: async () => ({ exitCode: ready ? 0 : 1, stdout: "", stderr: "dependency missing" })
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
  });

  test("unsafe declared or actual changed paths are never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api")]), {
      implement: async (_id, cwd) => {
        await write(cwd, "outside.txt"); return { status: "implemented", observations: [], changedPaths: ["../outside.txt"], summary: "unsafe", blockers: [] };
      }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete"); expect(runtime.calls.some((call) => call.startsWith("git add --"))).toBe(false);
    expect(result.blockers.join()).toMatch(/outside ownership|unsafe changed path/);
    expect(git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateBranch])).not.toContain("outside.txt");
  });

  test("an opt-in check failure is reported without unauthorized fixes", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api", { phases: [{ id: "test", kind: "unit-tests", commands: [{ tool: "probe", args: [], owners: ["api"] }], instructions: "User requested tests, no fixes" }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "assertion failed" })
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete"); expect(runtime.counts.get("api")).toBe(1); expect(result.blockers.join()).toContain("without authorized repairs");
  });

  test("planning-only manifests return notes without writers or worktrees", async () => {
    const input = {...await fixture(),mode:"plan"}; const runtime = harness(plan([], { notes: ["A thin requested plan"] }));
    const result = await runtime.runV11(input);
    expect(result.status).toBe("complete"); expect(result.notes).toEqual(["A thin requested plan"]);
    expect(runtime.calls.some((call) => call.startsWith("git worktree") || call.startsWith("ask V11 implementer"))).toBe(false);
  });

  test("integrated assembly routes disjoint owners concurrently", async () => {
    const input = await fixture(), bothFixing = deferred(); let fixing = 0, attempts = 0;
    const runtime = harness(plan([area("api"), area("ui")], { assembly: [{ tool: "probe", args: ["join"], owners: ["api", "ui"] }] }), {
      implement: async (id, cwd, _prompt, count) => {
        if (count > 1) { if (++fixing === 2) bothFixing.resolve(); await bothFixing.promise; }
        await write(cwd, id + "/result.txt", String(count)); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: "done", blockers: [] };
      },
      probe: async () => ({ exitCode: ++attempts === 1 ? 1 : 0, stdout: "", stderr: "join failed" })
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(fixing).toBe(2);
  });

  test("authorized phase fixes invalidate earlier requested evidence in that area", async () => {
    const input = await fixture(); let firstChecks = 0, repairChecks = 0;
    const runtime = harness(plan([area("api", { phases: [
      { id: "earlier", kind: "unit-tests", commands: [{ tool: "probe", args: ["earlier"], owners: ["api"] }], instructions: "User requested these tests" },
      { id: "later", kind: "unit-tests", commands: [{ tool: "probe", args: ["later"], owners: ["api"] }], instructions: "User requested these tests and fixes", fixFindings: true }
    ] })]), {
      implement: async (_id, cwd, _prompt, count) => { await write(cwd, "api/result.txt", String(count)); return { status: "implemented", observations: [], changedPaths: ["api/result.txt"], summary: "done", blockers: [] }; },
      probe: async (_cwd, args) => {
        if (args[0] === "earlier") firstChecks++; else repairChecks++;
        return { exitCode: args[0] === "later" && repairChecks === 1 ? 1 : 0, stdout: "", stderr: "requested correction" };
      }
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(firstChecks).toBe(2); expect(repairChecks).toBe(2);
  });

  test("global source corrections refresh dependent requested evidence", async () => {
    const input = await fixture(); let joined = 0, uiChecks = 0;
    const runtime = harness(plan([area("api"), area("ui", { dependsOn: ["api"], phases: [
      { id: "consumer", kind: "unit-tests", commands: [{ tool: "probe", args: ["ui"], owners: ["ui"] }], instructions: "User requested consumer tests" }
    ] })], { assembly: [{ tool: "probe", args: ["join"], owners: ["api"] }] }), {
      implement: async (id, cwd, _prompt, count) => { await write(cwd, id + "/result.txt", String(count)); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: "done", blockers: [] }; },
      probe: async (_cwd, args) => {
        if (args[0] === "ui") uiChecks++; else joined++;
        return { exitCode: args[0] === "join" && joined === 1 ? 1 : 0, stdout: "", stderr: "join failure" };
      }
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(uiChecks).toBe(2); expect(runtime.counts.get("ui")).toBe(1);
  });

  test("device resource locks release before image judgment", async () => {
    const input = await fixture(), secondCapture = deferred(); let captures = 0, active = 0, maxActive = 0;
    const runtime = harness(plan(["api", "ui"].map((id) => area(id, { phases: [{ id: "visual", kind: "native-vision", commands: [{ tool: "probe", args: [], owners: [id] }], personaPath: "/fixture/vision.md", instructions: "User requested capture and visual assessment", resource: "browser", cleanup: [{tool:"true",args:[],owners:[id]}] }] }))), {
      probe: async () => {
        active++; maxActive = Math.max(active, maxActive); await Promise.resolve(); active--;
        if (++captures === 2) secondCapture.resolve();
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      inspect: async () => { await secondCapture.promise; return { summary: "Reviewed", blockers: [], findings: [] }; }
    });
    expect((await runtime.runV11(input)).status).toBe("complete"); expect(maxActive).toBe(1); expect(captures).toBe(2);
  });

  test("read-only phase source mutations are guarded and never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { phases: [{ id: "audit", kind: "audit", commands: [], personaPath: "/fixture/audit.md", instructions: "User requested read-only review" }] })]), {
      inspect: async (_name, prompt) => {
        const cwd = prompt.match(/phase in (.*?)\. /)![1];
        await write(cwd, "api/unauthorized.txt"); return { summary: "Changed source", findings: [], blockers: [] };
      }
    });
    const result = await runtime.runV11(input);
    expect(result.status).toBe("incomplete"); expect(result.blockers.join()).toContain("Read-only guard detected writes");
    const candidateTree = git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateBranch]);
    expect(candidateTree).not.toContain("unauthorized.txt");
    expect(candidateTree).toContain("api/result.txt");
  });
});

test('V11 honors an explicitly fixed number of audit rounds without a fourth clean pass',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'audit',authorization:'User requests exactly three static audit passes',mode:'rounds',rounds:3}])};let audits=0;
 const runtime=harness(plan([area('api',{phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested three static audit passes'}]})]),{inspect:async()=>{audits++;return {summary:'Audit complete',blockers:[],findings:[]};}});
 expect((await runtime.runV11(input)).status).toBe('complete');expect(audits).toBe(3);
});
test('V11 until-clean audit returns concrete fixes to its persistent owner and stops on the first clean pass',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'audit',authorization:'User requests audit and fixes until clean',mode:'until-clean',fixFindings:true}])};let audits=0;
 const runtime=harness(plan([area('api',{phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested defect fixes until clean',fixFindings:true}]})]),{
  implement:async(_id,cwd,_prompt,count)=>{await write(cwd,'api/result.txt','revision '+count);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Implemented',blockers:[],observations:[]};},
  inspect:async()=>({summary:'Scoped audit',blockers:[],findings:++audits===1?['api/result.txt:1 concrete wrong result']:[]})
 });expect((await runtime.runV11(input)).status).toBe('complete');expect(audits).toBe(2);expect(runtime.counts.get('api')).toBe(2);
});
test('V11 verification area consumes both implementations without dispatching a source writer',async()=>{
 const input=await fixture();let inspected=false;
 const runtime=harness(plan([area('api'),area('ui'),area('joined-check',{role:'verify',dependsOn:['api','ui'],phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/auditor.md',instructions:'User requested independent integrated audit'}]})]),{inspect:async(_name,prompt)=>{
  const cwd=prompt.match(/phase in (.*?)\. /)![1];expect(await readFile(join(cwd,'api/result.txt'),'utf8')).toContain('implemented');expect(await readFile(join(cwd,'ui/result.txt'),'utf8')).toContain('implemented');inspected=true;return {summary:'Audit read both areas',blockers:[],findings:[]};
 }});expect((await runtime.runV11(input)).status).toBe('complete');expect(inspected).toBe(true);expect(runtime.counts.has('joined-check')).toBe(false);
});
test('V11 browser lifecycle cleanup executes even if the read-only evaluator fails',async()=>{
 const input=await fixture();const lifecycle:string[]=[];
 const runtime=harness(plan([area('ui',{phases:[{id:'smoke',kind:'browser',commands:[{tool:'probe',args:['start'],owners:['ui']}],cleanup:[{tool:'probe',args:['stop'],owners:['ui']}],resource:'isolated-browser',personaPath:'/fixture/qa.md',instructions:'User explicitly requested isolated agent-browser smoke'}]})]),{
  probe:async(_cwd,args)=>{lifecycle.push(args[0]);return {exitCode:0,stdout:'',stderr:''};},inspect:async()=>{throw new Error('Browser unavailable');}
 });expect((await runtime.runV11(input)).status).toBe('incomplete');expect(lifecycle).toEqual(['start','stop']);
});

test('a corrected test failure after the last permitted pass is never reported verified',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User permits one test pass and one correction only',mode:'once',fixFindings:true}])};
 const runtime=harness(plan([area('api',{phases:[{id:'test',kind:'unit-tests',commands:[{tool:'probe',args:[],owners:['api']}],instructions:'User single pass with correction',fixFindings:true}]})]),{
  probe:async()=>({exitCode:1,stdout:'',stderr:'test failed'}),
  implement:async(_id,cwd,_p,n)=>{await write(cwd,'api/result.txt','revision '+n);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Implemented',blockers:[],observations:[]};}
 });const result=await runtime.runV11(input);expect(result.status).toBe('incomplete');expect(result.blockers.join()).toContain('unverified');
});

test('a successful incremental gate is supplied as evidence without repeating it for judgment',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User tests'}])};let commands=0;
 const runtime=harness(plan([area('api',{phases:[{id:'tests',kind:'unit-tests',commands:[{tool:'probe',args:['test'],owners:['api']}],personaPath:'/fixture/test.md',instructions:'User requested tests'}]})]),{
 probe:async()=>{commands++;return {exitCode:0,stdout:'incremental, all assertions passed',stderr:''};},inspect:async(_name,prompt)=>{const cwd=prompt.match(/phase in (.*?)\. /)![1];const log=await readFile(join(cwd,'.zcode/workflow-drafts/v11-evidence/tests.jsonl'),'utf8');expect(JSON.parse(log).exitCode).toBe(0);expect(log).toContain('incremental, all assertions passed');expect(prompt).toContain('Do not demand cold builds');return {summary:'Actual tests passed',blockers:[],findings:[]};}});
 expect((await runtime.runV11(input)).status).toBe('complete');expect(commands).toBe(1);
});
test('TUI checks and web image interpretation are distinct lifecycle pieces',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'tui-tests',authorization:'User PTY tests'},{name:'web-vision',authorization:'User visual web review'}])};const lifecycle:string[]=[];const actors:string[]=[];
 const runtime=harness(plan([area('app',{phases:['tui-tests','web-vision'].map(kind=>({id:kind,kind,commands:[{tool:'probe',args:[kind],owners:['app']}],cleanup:[{tool:'probe',args:['cleanup-'+kind],owners:['app']}],resource:'owned-terminal-browser',personaPath:'/fixture/check.md',instructions:'User explicitly asked for this check'}))})]),{probe:async(_cwd,args)=>{lifecycle.push(args[0]);return {exitCode:0,stdout:'evidence.png',stderr:''};},inspect:async(name)=>{actors.push(name);return {summary:'Checked actual evidence',blockers:[],findings:[]};}});
 expect((await runtime.runV11(input)).status).toBe('complete');expect(actors).toEqual(['V11 app tui-tests','V11 app web-vision']);expect(lifecycle).toEqual(['tui-tests','cleanup-tui-tests','web-vision','cleanup-web-vision']);
});
test('source correction cannot quietly repeat a once-only earlier check',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User once-only tests'},{name:'audit',authorization:'User audit and fixes until clean',mode:'until-clean',fixFindings:true}])};let tests=0;
 const runtime=harness(plan([area('api',{phases:[{id:'unit',kind:'unit-tests',commands:[{tool:'probe',args:[],owners:['api']}],instructions:'User once tests'},{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/reviewer.md',instructions:'User until-clean audit with fixes',fixFindings:true}]})]),{probe:async()=>{tests++;return {exitCode:0,stdout:'pass',stderr:''};},inspect:async()=>({summary:'Concrete defect',blockers:[],findings:['api/result.txt:1 incorrect value']}),implement:async(_id,cwd,_prompt,n)=>{await write(cwd,'api/result.txt','revision '+n);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Changed source',blockers:[],observations:[]};}});
 const r=await runtime.runV11(input);expect(r.status).toBe('incomplete');expect(r.blockers.join()).toContain('budget exhausted');expect(tests).toBe(1);
});

