import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import { composeLibrary, normalizeSelection } from "./compose.ts";
const selections = normalizeSelection(["unit-tests", "tui-tests", "audit", "browser", "web-vision", "native-vision", "mobile-vision"].map(name => ({name,authorization:"Fixture explicit scope"})));
const source = (await composeLibrary(join(import.meta.dir, ".."), selections)).source
  .replace(/const v12Result = await runV12\(INPUT\);[\s\S]*$/, "");
const executable = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });

function git(cwd: string, args: string[]) {
  const out = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  if (out.exitCode) throw new Error(out.stderr.toString());
  return out.stdout.toString().trim();
}
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "zv12-engine-test-")); temporary.push(directory);
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
  return readdirSync(dirname(repoRoot)).filter((entry) => entry.includes("-zv12-"));
}
interface MockOptions {
  implement?: (id: string, cwd: string, prompt: string, count: number) => Promise<any>;
  probe?: (cwd: string, args: string[]) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  inspect?: (name: string, prompt: string) => Promise<{ summary: string; blockers: string[]; findings: string[] }>;
}
function harness(manifest: unknown, options: MockOptions = {}) {
  const events: any[] = []; const calls: string[] = []; const counts = new Map<string, number>();
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
      await write(cwd,".zcode/workflow-drafts/v12-evidence/"+tag+".jsonl",JSON.stringify({...out,tool:innerTool,args:innerArgs})+"\n");
      return out;
    }
    if (command === "probe") return options.probe?.(cwd, args) ?? { exitCode: 0, stdout: "", stderr: "" };
    const out = Bun.spawnSync({ cmd: [command, ...args], cwd, stdout: "pipe", stderr: "pipe" });
    return { exitCode: out.exitCode, stdout: out.stdout.toString(), stderr: out.stderr.toString() };
  } };
  const v12Agent = (_persona: unknown, name: string, rules: string) => ({ ask: async (prompt: string) => {
    calls.push("ask " + name);
    if (!name.startsWith("V12 implementer ")) return options.inspect?.(name, prompt) ?? { summary: "Requested check", blockers: [], findings: [] };
    const id = name.slice("V12 implementer ".length), cwd = rules.match(/^Work only in (.*?)\. Own only/)![1];
    const count = (counts.get(id) ?? 0) + 1; counts.set(id, count);
    if (options.implement) return await options.implement(id, cwd, prompt, count);
    await write(cwd, id + "/result.txt"); return { status: "implemented", observations: [], changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
  } });
  // v12Persona/v12Agent are declared by this skill's trimmed HIGH-only model-policy helper.
  const runtime = new Function("world", "v12Persona", "v12Agent", "phase", "report", "guardWrites", "future", executable + "\nreturn { runV12, v12ValidatePlan, v12ValidateWork }; ")(
    world, async (path: string, tier: string, access: string) => ({ path, tier, access }), v12Agent, () => {}, (event: unknown) => events.push(event), async (_persona: unknown, cwd: string, work: () => Promise<unknown>) => {
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
  return { ...runtime, runV12:(input:any)=>runtime.runV12(addInput(input)), v12ValidatePlan:(plan:any)=>runtime.v12ValidatePlan(plan,addInput({},plan)), events, calls, counts };
}

describe("V12 per-area static engine", () => {
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
    const running = runtime.runV12(input);
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
    const running = runtime.runV12(input);
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
    const result = await runtime.runV12(input);
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
    expect((await runtime.runV12(input)).status).toBe("complete");
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
    const result = await runtime.runV12(input);
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
    const result = await runtime.runV12(input);
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
      const result = await runtime.runV12(input);
      expect(result.status).toBe("incomplete");
      expect(runtime.counts.get("api")).toBe(malformed ? 2 : 1);
      expect(result.blockers.join()).toContain(malformed ? "Invalid completion report after one clarification" : "permission: User authorization required");
      // Blocked/malformed areas never get a lane revision commit (teardown's separate recovery
      // commit may legitimately stage the same owned files for its retain branch).
      expect(runtime.calls.some((call) => call.startsWith("git commit -m V12: api revision"))).toBe(false);
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
    expect((await runtime.runV12(input)).status).toBe("complete");
    expect(manifest.areas[0].ownedPaths).toContain(".gitignore");
    expect(manifest.areas[0].ownedPaths).toContain("src/lib/server");
    expect(manifest.areas[1].ownedPaths).toContain("src/lib/components");
  });

  test("normalization preserves traversal rejection and ownership conflict detection", () => {
    const runtime = harness(null);
    for (const path of ["/src/", "../src/", "src/../api/", "src//api/", "src//", "./src/", "src/.git/", "src/\\api/", "src/\u0000/"]) {
      expect(() => runtime.v12ValidatePlan(plan([area("api", { ownedPaths: [path] })]))).toThrow("ownedPaths[0]");
    }
    expect(() => runtime.v12ValidatePlan(plan([area("api", { ownedPaths: ["src/"] }), area("ui", { ownedPaths: ["src/ui/"] })]))).toThrow("Overlapping ownership");
    expect(() => runtime.v12ValidatePlan(plan([area("api", { ownedPaths: [".gitignore", ".github/workflows/"] }), area("ui")]))).not.toThrow();
  });

  test("repeated invalid shape stops with a field diagnostic and no product mutations", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { dependsOn: null })]));
    const result = await runtime.runV12(input);
    expect(result.status).toBe("incomplete");
    expect(result.blockers.join()).toContain("areas[0].dependsOn");
    expect(runtime.calls.some((call) => call.startsWith("git worktree") || call.startsWith("ask V12 implementer"))).toBe(false);
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
    ] as const) expect(() => runtime.v12ValidatePlan(manifest)).toThrow(field);
  });

  test("inline smokes and test runners cannot hide inside assembly but opt-in phases allow them", () => {
    const runtime = harness(null);
    for (const [tool, args] of [["bun", ["--bun", "-e", "await fetch('/api/todos')"]], ["node", ["--eval=assert(false)"]], ["sh", ["-c", "bun test"]], ["bun", ["test"]]] as [string, string[]][]) {
      const command = { tool, args, owners: ["api"] };
      expect(() => runtime.v12ValidatePlan(plan([area("api", { assembly: [command] })]))).toThrow("assembly accepts setup/build commands");
      expect(() => runtime.v12ValidatePlan(plan([area("api", { phases: [{ id: "requested", kind: "unit-tests", commands: [command], instructions: "User explicitly requested API tests" }] }), area("ui")]))).not.toThrow();
    }
    expect(() => runtime.v12ValidatePlan(plan([area("api", { assembly: [{ tool: "bun", args: ["install", "--frozen-lockfile"], owners: ["api"] }] }), area("ui")], { assembly: [{ tool: "bun", args: ["run", "build"], owners: ["api"] }] }))).not.toThrow();
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
    const running = runtime.runV12(input);
    await nextPhase.promise;
    expect(runtime.events.some((event: any) => event.area === "api" && event.step === "complete")).toBe(false);
    releaseSibling.resolve();
    const result = await running;
    expect(result.status).toBe("complete");
    expect(runtime.events.findIndex((event: any) => event.area === "ui" && event.step === "visual")).toBeLessThan(runtime.events.findIndex((event: any) => event.area === "api" && event.step === "complete"));
    expect(git(input.repoRoot, ["rev-parse", "HEAD"])).toBe(result.candidateCommit);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(consumed).toBe(true);
  });

  test("unknown dependencies, cycles and overlapping ownership reject before writes", async () => {
    const input = await fixture();
    for (const areas of [
      [area("api", { dependsOn: ["missing"] })],
      [area("api", { phases: [{ id: "test", kind: "unit-tests", commands: [], instructions: "User requested", dependsOn: ["ui"] }] }), area("ui", { dependsOn: ["api"] })],
      [area("api", { ownedPaths: ["src"] }), area("ui", { ownedPaths: ["src/ui"] })]
    ]) {
      const runtime = harness(plan(areas));
      const result = await runtime.runV12(input);
      expect(result.status).toBe("incomplete");
      expect(result.blockers.join()).toContain("Invalid prepared plan");
      expect(runtime.calls.some((call) => call.startsWith("git worktree"))).toBe(false);
    }
  });

  test("engine-generated lockfiles belong to the manifest owner and never block the lane", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { ownedPaths: ["package.json", "src"] }), area("ui", { ownedPaths: ["ui"] })]), {
      implement: async (id, cwd) => {
        if (id === "api") { await write(cwd, "package.json", "{}\n"); await write(cwd, "bun.lock", "lockfile-by-install\n"); }
        await write(cwd, id === "api" ? "src/result.txt" : "ui/result.txt");
        return { status: "implemented", observations: [], changedPaths: [], summary: id, blockers: [] };
      }
    });
    const result = await runtime.runV12(input);
    expect(result.status).toBe("complete");
    const tree = git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateCommit]);
    expect(tree).toContain("bun.lock");
    expect(tree).toContain("package.json");
  });

  test("parallel-by-default floor: one writer needs an explicit single-lane requirement", async () => {    const single = harness(plan([area("api")]));
    const rejected = await single.runV12({ ...await fixture(), requirements: undefined });
    expect(rejected.status).toBe("incomplete");
    expect(rejected.blockers.join()).toContain("at least 2 implementation areas");
    expect(single.calls.some((call) => call.startsWith("git worktree"))).toBe(false);
    expect((await single.runV12({ ...await fixture(), requirements: { minimumAreas: 1 } })).status).toBe("complete");
    const pair = harness(plan([area("api"), area("ui")]));
    expect((await pair.runV12({ ...await fixture(), requirements: undefined })).status).toBe("complete");
    const raised = await pair.runV12({ ...await fixture(), requirements: { minimumAreas: 3 } });
    expect(raised.status).toBe("incomplete");
    expect(raised.blockers.join()).toContain("at least 3 implementation areas");
    const blocked = await harness(plan([area("solo")], { blockers: ["No viable parallel seam"] })).runV12({ ...await fixture(), requirements: undefined });
    expect(blocked.status).toBe("incomplete");
    expect(blocked.blockers.join()).toContain("No viable parallel seam");
  });

  test("an audit phase may omit the commands key; it normalizes to an empty array", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { phases: [{ id: "review", kind: "audit", personaPath: "/fixture/audit.md", instructions: "User requested read-only audit" }] }), area("ui")]));
    expect((await runtime.runV12(input)).status).toBe("complete");
    const raw = plan([area("api", { phases: [{ id: "review", kind: "audit", personaPath: "/fixture/audit.md", instructions: "User requested read-only audit" }] }), area("ui")]);
    expect(raw.areas[0].phases[0].commands).toBeUndefined();
    runtime.v12ValidatePlan(raw);
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
    const result = await runtime.runV12(input);
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
    const result = await runtime.runV12(input);
    expect(result.status).toBe("incomplete");
    const api = result.areas.find((area: any) => area.id === "api");
    expect(git(input.repoRoot, ["show", api.branch + ":api/partial.txt"])).toBe("half done");
    expect(retained(result, "(unmerged work retained)")).toContain(api.branch);
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
  });

  test("a successful run delivers by fast-forward and reclaims every z-v12 branch", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui")]));
    const result = await runtime.runV12(input);
    expect(result.status).toBe("complete");
    expect(result.delivery.status).toBe("delivered");
    expect(result.delivery.detail).toBe("fast-forwarded refs/heads/main to " + result.candidateCommit);
    expect(result.delivery.checkoutCommit).toBe(result.candidateCommit);
    expect(git(input.repoRoot, ["rev-parse", "HEAD"])).toBe(result.candidateCommit);
    expect(git(input.repoRoot, ["status", "--porcelain"])).toBe("");
    expect(git(input.repoRoot, ["branch", "--list", "z-v12/*"])).toBe("");
    expect(result.retainedBranches).toEqual([]);
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
    const result = await runtime.runV12(input);
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
    await expect(runtime.runV12(input)).rejects.toThrow();
    expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
    expect(git(input.repoRoot, ["worktree", "list"])).not.toContain("-zv12-");
  });

  test("required assembly failure returns to the same persistent owner without QA", async () => {
    const input = await fixture(); let attempts = 0;
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: ["build"], owners: ["api"] }] })]), {
      implement: async (_id, cwd, _prompt, count) => {
        await write(cwd, "api/result.txt", String(count)); return { status: "implemented", observations: [], changedPaths: ["api/result.txt"], summary: "done", blockers: [] };
      },
      probe: async () => ({ exitCode: ++attempts === 1 ? 1 : 0, stdout: "", stderr: "compiler failure" })
    });
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
    expect(runtime.calls.filter((call) => call.startsWith("ask V12 ")).every((call) => call === "ask V12 implementer api")).toBe(true);
  });

  test("a repeated correction with no changed progress stops incomplete", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: [], owners: ["api"] }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "unresolved" })
    });
    const result = await runtime.runV12(input);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
  });

  test("unsafe declared or actual changed paths are never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api")]), {
      implement: async (_id, cwd) => {
        await write(cwd, "outside.txt"); return { status: "implemented", observations: [], changedPaths: ["../outside.txt"], summary: "unsafe", blockers: [] };
      }
    });
    const result = await runtime.runV12(input);
    expect(result.status).toBe("incomplete");
    // The unsafe write is never staged into a lane revision commit; only teardown's recovery
    // commit secures it on the retained api branch for review.
    expect(runtime.calls.some((call) => call.startsWith("git commit -m V12: api revision"))).toBe(false);
    expect(result.blockers.join()).toMatch(/outside ownership|unsafe changed path/);
    expect(git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateBranch])).not.toContain("outside.txt");
  });

  test("an opt-in check failure is reported without unauthorized fixes", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api", { phases: [{ id: "test", kind: "unit-tests", commands: [{ tool: "probe", args: [], owners: ["api"] }], instructions: "User requested tests, no fixes" }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "assertion failed" })
    });
    const result = await runtime.runV12(input);
    expect(result.status).toBe("incomplete"); expect(runtime.counts.get("api")).toBe(1); expect(result.blockers.join()).toContain("without authorized repairs");
  });

  test("planning-only manifests return notes without writers, worktrees or delivery", async () => {
    const input = {...await fixture(),mode:"plan"}; const runtime = harness(plan([], { notes: ["A thin requested plan"] }));
    const result = await runtime.runV12(input);
    expect(result.status).toBe("complete"); expect(result.notes).toEqual(["A thin requested plan"]);
    expect(result.delivery).toEqual({ status: "skipped", detail: "plan-only", checkoutCommit: input.baseCommit });
    expect(git(input.repoRoot, ["rev-parse", "HEAD"])).toBe(input.baseCommit);
    expect(git(input.repoRoot, ["branch", "--list", "z-v12/*"])).toBe("");
    expect(runtime.calls.some((call) => call.startsWith("git worktree") || call.startsWith("ask V12 implementer"))).toBe(false);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(fixing).toBe(2);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(firstChecks).toBe(2); expect(repairChecks).toBe(2);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(uiChecks).toBe(2); expect(runtime.counts.get("ui")).toBe(1);
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
    expect((await runtime.runV12(input)).status).toBe("complete"); expect(maxActive).toBe(1); expect(captures).toBe(2);
  });

  test("read-only phase source mutations are guarded and never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { phases: [{ id: "audit", kind: "audit", commands: [], personaPath: "/fixture/audit.md", instructions: "User requested read-only review" }] })]), {
      inspect: async (_name, prompt) => {
        const cwd = prompt.match(/phase in (.*?)\. /)![1];
        await write(cwd, "api/unauthorized.txt"); return { summary: "Changed source", findings: [], blockers: [] };
      }
    });
    const result = await runtime.runV12(input);
    expect(result.status).toBe("incomplete"); expect(result.blockers.join()).toContain("Read-only guard detected writes");
    const candidateTree = git(input.repoRoot, ["ls-tree", "-r", "--name-only", result.candidateBranch]);
    expect(candidateTree).not.toContain("unauthorized.txt");
    expect(candidateTree).toContain("api/result.txt");
  });
});

test('V12 honors an explicitly fixed number of audit rounds without a fourth clean pass',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'audit',authorization:'User requests exactly three static audit passes',mode:'rounds',rounds:3}])};let audits=0;
 const runtime=harness(plan([area('api',{phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested three static audit passes'}]})]),{inspect:async()=>{audits++;return {summary:'Audit complete',blockers:[],findings:[]};}});
 expect((await runtime.runV12(input)).status).toBe('complete');expect(audits).toBe(3);
});
test('V12 until-clean audit returns concrete fixes to its persistent owner and stops on the first clean pass',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'audit',authorization:'User requests audit and fixes until clean',mode:'until-clean',fixFindings:true}])};let audits=0;
 const runtime=harness(plan([area('api',{phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested defect fixes until clean',fixFindings:true}]})]),{
  implement:async(_id,cwd,_prompt,count)=>{await write(cwd,'api/result.txt','revision '+count);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Implemented',blockers:[],observations:[]};},
  inspect:async()=>({summary:'Scoped audit',blockers:[],findings:++audits===1?['api/result.txt:1 concrete wrong result']:[]})
 });expect((await runtime.runV12(input)).status).toBe('complete');expect(audits).toBe(2);expect(runtime.counts.get('api')).toBe(2);
});
test('V12 verification area consumes both implementations without dispatching a source writer',async()=>{
 const input=await fixture();let inspected=false;
 const runtime=harness(plan([area('api'),area('ui'),area('joined-check',{role:'verify',dependsOn:['api','ui'],phases:[{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/auditor.md',instructions:'User requested independent integrated audit'}]})]),{inspect:async(_name,prompt)=>{
  const cwd=prompt.match(/phase in (.*?)\. /)![1];expect(await readFile(join(cwd,'api/result.txt'),'utf8')).toContain('implemented');expect(await readFile(join(cwd,'ui/result.txt'),'utf8')).toContain('implemented');inspected=true;return {summary:'Audit read both areas',blockers:[],findings:[]};
 }});expect((await runtime.runV12(input)).status).toBe('complete');expect(inspected).toBe(true);expect(runtime.counts.has('joined-check')).toBe(false);
});
test('V12 browser lifecycle cleanup executes even if the read-only evaluator fails',async()=>{
 const input=await fixture();const lifecycle:string[]=[];
 const runtime=harness(plan([area('ui',{phases:[{id:'smoke',kind:'browser',commands:[{tool:'probe',args:['start'],owners:['ui']}],cleanup:[{tool:'probe',args:['stop'],owners:['ui']}],resource:'isolated-browser',personaPath:'/fixture/qa.md',instructions:'User explicitly requested isolated agent-browser smoke'}]})]),{
  probe:async(_cwd,args)=>{lifecycle.push(args[0]);return {exitCode:0,stdout:'',stderr:''};},inspect:async()=>{throw new Error('Browser unavailable');}
 });expect((await runtime.runV12(input)).status).toBe('incomplete');expect(lifecycle).toEqual(['start','stop']);
});

test('a corrected test failure after the last permitted pass is never reported verified',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User permits one test pass and one correction only',mode:'once',fixFindings:true}])};
 const runtime=harness(plan([area('api',{phases:[{id:'test',kind:'unit-tests',commands:[{tool:'probe',args:[],owners:['api']}],instructions:'User single pass with correction',fixFindings:true}]})]),{
  probe:async()=>({exitCode:1,stdout:'',stderr:'test failed'}),
  implement:async(_id,cwd,_p,n)=>{await write(cwd,'api/result.txt','revision '+n);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Implemented',blockers:[],observations:[]};}
 });const result=await runtime.runV12(input);expect(result.status).toBe('incomplete');expect(result.blockers.join()).toContain('unverified');
});

test('a successful incremental gate is supplied as evidence without repeating it for judgment',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User tests'}])};let commands=0;
 const runtime=harness(plan([area('api',{phases:[{id:'tests',kind:'unit-tests',commands:[{tool:'probe',args:['test'],owners:['api']}],personaPath:'/fixture/test.md',instructions:'User requested tests'}]})]),{
 probe:async()=>{commands++;return {exitCode:0,stdout:'incremental, all assertions passed',stderr:''};},inspect:async(_name,prompt)=>{const cwd=prompt.match(/phase in (.*?)\. /)![1];const log=await readFile(join(cwd,'.zcode/workflow-drafts/v12-evidence/tests.jsonl'),'utf8');expect(JSON.parse(log).exitCode).toBe(0);expect(log).toContain('incremental, all assertions passed');expect(prompt).toContain('Do not demand cold builds');return {summary:'Actual tests passed',blockers:[],findings:[]};}});
 expect((await runtime.runV12(input)).status).toBe('complete');expect(commands).toBe(1);
});
test('TUI checks and web image interpretation are distinct lifecycle pieces',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'tui-tests',authorization:'User PTY tests'},{name:'web-vision',authorization:'User visual web review'}])};const lifecycle:string[]=[];const actors:string[]=[];
 const runtime=harness(plan([area('app',{phases:['tui-tests','web-vision'].map(kind=>({id:kind,kind,commands:[{tool:'probe',args:[kind],owners:['app']}],cleanup:[{tool:'probe',args:['cleanup-'+kind],owners:['app']}],resource:'owned-terminal-browser',personaPath:'/fixture/check.md',instructions:'User explicitly asked for this check'}))})]),{probe:async(_cwd,args)=>{lifecycle.push(args[0]);return {exitCode:0,stdout:'evidence.png',stderr:''};},inspect:async(name)=>{actors.push(name);return {summary:'Checked actual evidence',blockers:[],findings:[]};}});
 expect((await runtime.runV12(input)).status).toBe('complete');expect(actors).toEqual(['V12 app tui-tests','V12 app web-vision']);expect(lifecycle).toEqual(['tui-tests','cleanup-tui-tests','web-vision','cleanup-web-vision']);
});
test('source correction cannot quietly repeat a once-only earlier check',async()=>{
 const input={...await fixture(),pieces:normalizeSelection([{name:'unit-tests',authorization:'User once-only tests'},{name:'audit',authorization:'User audit and fixes until clean',mode:'until-clean',fixFindings:true}])};let tests=0;
 const runtime=harness(plan([area('api',{phases:[{id:'unit',kind:'unit-tests',commands:[{tool:'probe',args:[],owners:['api']}],instructions:'User once tests'},{id:'audit',kind:'audit',commands:[],personaPath:'/fixture/reviewer.md',instructions:'User until-clean audit with fixes',fixFindings:true}]})]),{probe:async()=>{tests++;return {exitCode:0,stdout:'pass',stderr:''};},inspect:async()=>({summary:'Concrete defect',blockers:[],findings:['api/result.txt:1 incorrect value']}),implement:async(_id,cwd,_prompt,n)=>{await write(cwd,'api/result.txt','revision '+n);return {status:'implemented',changedPaths:['api/result.txt'],summary:'Changed source',blockers:[],observations:[]};}});
 const r=await runtime.runV12(input);expect(r.status).toBe('incomplete');expect(r.blockers.join()).toContain('budget exhausted');expect(tests).toBe(1);
});


test('V12 judgment findings without repair authority are reported and never veto delivery',async()=>{
 const input=await fixture();
 const runtime=harness(plan([
  area('app',{phases:[{id:'review',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested read-only audit'}]}),
  area('joined-check',{role:'verify',dependsOn:['app'],ownedPaths:['evidence'],phases:[{id:'joined',kind:'audit',commands:[],personaPath:'/fixture/audit.md',instructions:'User requested integrated audit'}]})
 ]),{inspect:async(name)=>({summary:'Reviewed',blockers:[],findings:[name+': src/lint.md:1 minor style issue']})});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.areas.every((a:any)=>a.status==='ready')).toBe(true);
 expect(result.areas.find((a:any)=>a.id==='app').findings.join()).toContain('minor style issue');
 expect(result.areas.find((a:any)=>a.id==='joined-check').findings.join()).toContain('minor style issue');
 expect(runtime.events).toContainEqual(expect.objectContaining({area:'app',step:'review',status:'ready'}));
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['rev-parse','HEAD'])).toBe(result.candidateCommit);
 expect(git(input.repoRoot,['branch','--list','z-v12/*'])).toBe('');
 expect(leftoverWorktrees(input.repoRoot)).toHaveLength(0);
});
test('V12 a phase command failure without repair authority blocks the area and retains the candidate',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('api',{phases:[{id:'gate',kind:'unit-tests',commands:[{tool:'probe',args:[],owners:['api']}],instructions:'User requested tests, no fixes'}]})]),{
  probe:async()=>({exitCode:1,stdout:'',stderr:'assertion failed'})});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('incomplete');
 expect(result.areas.find((a:any)=>a.id==='api').status).toBe('blocked');
 expect(result.blockers.join()).toContain('without authorized repairs');
 expect(result.delivery.status).toBe('retained');
 expect(git(input.repoRoot,['rev-parse','HEAD'])).toBe(input.baseCommit);
 const branches=git(input.repoRoot,['branch','--list','z-v12/*']);
 expect(branches).toContain(result.candidateBranch);
 expect(branches).not.toContain(result.areas.find((a:any)=>a.id==='api').branch);
 expect(retained(result,'(delivery reference)')).toEqual([result.candidateBranch]);
});
test('V12 an upstream stage-B hard failure after commit never blocks a dependent that checks later',async()=>{
 const input=await fixture();const upstreamFailed=deferred();let dependentChecked=false;
 const runtime=harness(plan([
  area('api',{phases:[{id:'gate',kind:'unit-tests',commands:[{tool:'probe',args:['fail'],owners:['api']}],instructions:'User requested tests'}]}),
  area('ui',{dependsOn:['api'],phases:[{id:'check',kind:'unit-tests',commands:[{tool:'probe',args:['ok'],owners:['ui']}],instructions:'User requested tests',dependsOn:['api']}]})
 ]),{
  implement:async(id,cwd)=>{if(id==='ui')await upstreamFailed.promise;await write(cwd,id+'/result.txt');return {status:'implemented',observations:[],changedPaths:[id+'/result.txt'],summary:id,blockers:[]};},
  probe:async(_cwd,args)=>args[0]==='fail'?(upstreamFailed.resolve(),{exitCode:1,stdout:'',stderr:'gate failed'}):(dependentChecked=true,{exitCode:0,stdout:'',stderr:''})});
 const result=await runtime.runV12(input);
 expect(dependentChecked).toBe(true);
 expect(result.areas.find((a:any)=>a.id==='api').status).toBe('blocked');
 expect(result.areas.find((a:any)=>a.id==='ui').status).toBe('ready');
 expect(result.blockers.join()).toContain('api:');
});
test('V12 a checkout commit landing mid-run retains delivery with the anchors reason and no merge',async()=>{
 const input=await fixture();let foreign='';
 const runtime=harness(plan([area('api')]),{
  implement:async()=>{if(!foreign){git(input.repoRoot,['commit','--allow-empty','-m','foreign edit']);foreign=git(input.repoRoot,['rev-parse','HEAD']);}return {status:'implemented',observations:[],changedPaths:[],summary:'done',blockers:[]};}});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('incomplete');
 expect(result.blockers.join()).toContain('anchors');
 expect(result.delivery.status).toBe('retained');
 expect(result.delivery.detail).toContain('anchors');
 expect(git(input.repoRoot,['rev-parse','HEAD'])).toBe(foreign);
 expect(git(input.repoRoot,['rev-parse','HEAD'])).not.toBe(result.candidateCommit);
 expect(git(input.repoRoot,['branch','--list','z-v12/*'])).toContain('candidate');
});
test('V12 branch reclamation is scoped to z-v12 and reclaims stale contained branches only',async()=>{
 const input=await fixture();
 git(input.repoRoot,['branch','z-v12/old-run/stale-contained']);
 git(input.repoRoot,['checkout','-q','-b','z-v12/old-run/stale-unmerged']);
 await writeFile(join(input.repoRoot,'stale.txt'),'old work\n');
 git(input.repoRoot,['add','stale.txt']);git(input.repoRoot,['commit','-m','stale']);
 git(input.repoRoot,['checkout','-q','main']);
 git(input.repoRoot,['branch','z-v11/keep']);
 const runtime=harness(plan([area('api')]));
 const result=await runtime.runV12(input);
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['branch','--list','z-v12/*'])).toBe('z-v12/old-run/stale-unmerged');
 expect(retained(result,'(unmerged work retained)')).toEqual(['z-v12/old-run/stale-unmerged']);
 expect(git(input.repoRoot,['branch','--list','z-v11/*'])).toContain('z-v11/keep');
});

test('engine artifacts from lane installs never block lanes and integrate once at the candidate',async()=>{
 const input=await fixture();
 await writeFile(join(input.repoRoot,'package.json'),JSON.stringify({name:'root',workspaces:['apps/*']})+'\n');
 git(input.repoRoot,['add','package.json']);git(input.repoRoot,['commit','-m','root workspace manifest, no lockfile']);
 input.baseCommit=git(input.repoRoot,['rev-parse','HEAD']);
 const runtime=harness(plan(['backend','web-shell','browser-helper'].map((id)=>area(id,{setup:[{tool:'probe',args:['install'],owners:[id]}]})),{
  setup:[{tool:'probe',args:['install'],owners:['backend']}]
 }),{probe:async(cwd,args)=>{
  if(args[0]==='install')await write(cwd,'bun.lock','lockfile generated in '+cwd+'\n');
  return {exitCode:0,stdout:'',stderr:''};
 }});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.areas.every((lane:any)=>lane.status==='ready')).toBe(true);
 for(const lane of result.areas)expect(git(input.repoRoot,['ls-tree','-r','--name-only',lane.commit])).not.toContain('bun.lock');
 expect(git(input.repoRoot,['log','--format=%s',result.candidateCommit])).toContain('V12: integrate engine-generated dependency files');
 expect(git(input.repoRoot,['ls-tree','-r','--name-only',result.candidateCommit])).toContain('bun.lock');
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['show','HEAD:bun.lock'])).toContain('lockfile generated in');
 expect(git(input.repoRoot,['branch','--list','z-v12/*'])).toBe('');
 expect(result.retainedBranches).toEqual([]);
 expect(git(input.repoRoot,['log','--all','--format=%s'])).not.toContain('work for recovery');
});

test('teardown retains nothing for a lockfile-only lane but keeps real gate violations for review',async()=>{
 const input=await fixture();
 const runtime=harness(plan([
  area('api',{setup:[{tool:'probe',args:['install'],owners:['api']}]}),
  area('rogue',{setup:[{tool:'probe',args:['install'],owners:['rogue']}]}),
  area('ui')
 ]),{
  probe:async(cwd,args)=>{if(args[0]==='install')await write(cwd,'bun.lock','derived lockfile\n');return {exitCode:0,stdout:'',stderr:''};},
  implement:async(id,cwd)=>{
   if(id==='api')return {status:'blocked',observations:[],changedPaths:[],summary:'blocked before writing work',blockers:[{kind:'input',detail:'Missing service'}]};
   if(id==='rogue'){await write(cwd,'outside.txt','agent-written, never owned\n');return {status:'implemented',observations:[],changedPaths:[],summary:'wrote outside ownership',blockers:[]};}
   await write(cwd,'ui/result.txt');return {status:'implemented',observations:[],changedPaths:['ui/result.txt'],summary:'done',blockers:[]};
  }});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('incomplete');
 const api=result.areas.find((lane:any)=>lane.id==='api'),rogue=result.areas.find((lane:any)=>lane.id==='rogue');
 expect(api.status).toBe('blocked');expect(rogue.status).toBe('blocked');
 expect(rogue.blockers.join()).toContain('Changed path outside ownership: outside.txt');
 expect(git(input.repoRoot,['log','--all','--format=%s'])).not.toContain('V12: retain api work for recovery');
 expect(retained(result,'(unmerged work retained)')).not.toContain(api.branch);
 expect(git(input.repoRoot,['show',rogue.branch+':outside.txt'])).toBe('agent-written, never owned');
 expect(retained(result,'(unmerged work retained)')).toContain(rogue.branch);
});

test('a non-artifact unowned write during an ask still throws at the ownership gate',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('api')]),{implement:async(_id,cwd)=>{
  await write(cwd,'rogue.txt');return {status:'implemented',observations:[],changedPaths:[],summary:'wrote an unowned file',blockers:[]};
 }});
 const result=await runtime.runV12(input);
 expect(result.status).toBe('incomplete');
 expect(result.areas[0].blockers.join()).toContain('Changed path outside ownership: rogue.txt');
});

test('lockfile churn during an assembly correction is not changed progress',async()=>{
 const input=await fixture();
 await writeFile(join(input.repoRoot,'bun.lock'),'baseline lockfile\n');
 git(input.repoRoot,['add','bun.lock']);git(input.repoRoot,['commit','-m','baseline lockfile']);
 input.baseCommit=git(input.repoRoot,['rev-parse','HEAD']);
 let installs=0;
 const runtime=harness(plan([area('api',{ownedPaths:['src'],assembly:[{tool:'probe',args:['install'],owners:['api']}]})]),{
  probe:async(cwd)=>{await write(cwd,'bun.lock','regenerated '+(++installs)+'\n');return {exitCode:1,stdout:'',stderr:'install failed'};},
  implement:async(_id,cwd)=>{await write(cwd,'src/result.txt');return {status:'implemented',observations:[],changedPaths:['src/result.txt'],summary:'done',blockers:[]};}
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('incomplete');
 expect(runtime.counts.get('api')).toBe(2);
 expect(result.blockers.join()).toContain('No changed progress');
});

test('a lockfile regenerated by the final integrated gate is integrated and delivered',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('app')],{assembly:[{tool:'probe',args:['build'],owners:['app']}]}),{
  probe:async(cwd,args)=>{if(args[0]==='build')await write(cwd,'bun.lock','final lockfile\n');return {exitCode:0,stdout:'',stderr:''};}
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['log','--format=%s',result.candidateCommit])).toContain('V12: integrate engine-generated dependency files');
 expect(git(input.repoRoot,['show','HEAD:bun.lock'])).toBe('final lockfile');
 expect(git(input.repoRoot,['status','--porcelain'])).toBe('');
});

test('non-lockfile derived output from the integrated gate is tolerated, reported and never delivered',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('app')],{assembly:[{tool:'probe',args:['build'],owners:['app']}]}),{
  probe:async(cwd,args)=>{if(args[0]==='build'){await write(cwd,'dist/out.js','built\n');await write(cwd,'bun.lock','lock\n');}return {exitCode:0,stdout:'',stderr:''};}
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.delivery.status).toBe('delivered');
 const tree=git(input.repoRoot,['ls-tree','-r','--name-only','HEAD']);
 expect(tree).toContain('bun.lock');
 expect(tree).not.toContain('dist/out.js');
 expect(git(input.repoRoot,['status','--porcelain'])).toBe('');
 expect(runtime.events).toContainEqual(expect.objectContaining({area:'candidate',step:'derived-artifacts',status:'uncommitted',evidence:'dist/out.js'}));
});

test('an owned file an assembly command rewrote still counts as progress when the agent fixes it',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('api',{ownedPaths:['src'],assembly:[{tool:'probe',args:['format'],owners:['api']}]})]),{
  probe:async(cwd)=>{
   const current=await Bun.file(join(cwd,'src/formatted.ts')).text().catch(()=>'');
   if(current.includes('AGENT-FIX'))return {exitCode:0,stdout:'',stderr:''};
   await write(cwd,'src/formatted.ts','ENGINE-FORMATTED\n');return {exitCode:1,stdout:'',stderr:'format check failed'};
  },
  implement:async(_id,cwd,_prompt,count)=>{
   if(count===1){await write(cwd,'src/app.ts');return {status:'implemented',observations:[],changedPaths:['src/app.ts'],summary:'done',blockers:[]};}
   await write(cwd,'src/formatted.ts','AGENT-FIX\n');return {status:'implemented',observations:[],changedPaths:['src/formatted.ts'],summary:'fixed',blockers:[]};
  }
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['show','HEAD:src/formatted.ts'])).toBe('AGENT-FIX');
});

test('a manifest rewritten with its lockfile by the integrated gate is integrated as one dependency state',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('app')],{assembly:[{tool:'probe',args:['tidy'],owners:['app']}]}),{
  probe:async(cwd,args)=>{if(args[0]==='tidy'){await write(cwd,'go.mod','module app\n\nrequire x v1\n');await write(cwd,'go.sum','x v1 h1:abc\n');}return {exitCode:0,stdout:'',stderr:''};}
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.delivery.status).toBe('delivered');
 expect(git(input.repoRoot,['show','HEAD:go.mod'])).toContain('require x v1');
 expect(git(input.repoRoot,['show','HEAD:go.sum'])).toBe('x v1 h1:abc');
 expect(git(input.repoRoot,['status','--porcelain'])).toBe('');
});

test('an unowned lockfile written during an ask is dropped visibly, never delivered',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('api',{ownedPaths:['src']})]),{
  implement:async(_id,cwd)=>{await write(cwd,'src/result.txt');await write(cwd,'evil/bun.lock','smuggled\n');return {status:'implemented',observations:[],changedPaths:['src/result.txt'],summary:'done',blockers:[]};}
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(git(input.repoRoot,['ls-tree','-r','--name-only','HEAD'])).not.toContain('evil/bun.lock');
 expect(runtime.events).toContainEqual(expect.objectContaining({area:'api',step:'artifact-write',status:'dropped',evidence:'evil/bun.lock'}));
});

test('a sloppily reported changedPaths never kills a lane that wrote nothing wrong',async()=>{
 const input=await fixture();
 const runtime=harness(plan([area('api',{ownedPaths:['src']})]),{
  implement:async(_id,cwd)=>{
   await write(cwd,'src/result.txt');
   return {status:'implemented',observations:[],changedPaths:[cwd+'/src/result.txt','./src/other.txt','not-ours.txt'],summary:'done',blockers:[]};
  }
 });
 const result=await runtime.runV12(input);
 expect(result.status).toBe('complete');
 expect(result.delivery.status).toBe('delivered');
 expect(result.blockers.join()).not.toContain('Actor reported unsafe changed path');
 expect(runtime.events).toContainEqual(expect.objectContaining({area:'api',step:'completion-report',status:'normalized'}));
 expect(git(input.repoRoot,['show','HEAD:src/result.txt'])).toBe('implemented');
});
