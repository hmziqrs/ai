import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const source = (await readFile(join(import.meta.dir, "../engine.dwf.ts"), "utf8"))
  .replace(/const v5Result = await runV5\(INPUT\);[\s\S]*$/, "");
const executable = new Bun.Transpiler({ loader: "ts" }).transformSync(source);
const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });

function git(cwd: string, args: string[]) {
  const out = Bun.spawnSync({ cmd: ["git", ...args], cwd, stdout: "pipe", stderr: "pipe" });
  if (out.exitCode) throw new Error(out.stderr.toString());
  return out.stdout.toString().trim();
}
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "zv5-engine-test-")); temporary.push(directory);
  const repo = join(directory, "repo"); await mkdir(repo);
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "fixture@example.invalid"]);
  git(repo, ["config", "user.name", "Engine fixture"]);
  await writeFile(join(repo, "README.md"), "seed\n");
  git(repo, ["add", "README.md"]); git(repo, ["commit", "-m", "seed"]);
  return { repoRoot: repo, task: "Implement a tiny fixture", baseCommit: git(repo, ["rev-parse", "HEAD"]), branchRef: "refs/heads/main", startedAt: "2026-10-20T10:00:00.000Z", skillRoot: "/fixture/skill", instructionPaths: [] };
}
function area(id: string, extra: Record<string, unknown> = {}) {
  return { id, title: id, personaPath: "/fixture/" + id + ".md", ownedPaths: [id], dependsOn: [], instructions: "Implement " + id, assembly: [], ...extra };
}
function plan(areas: unknown[], extra: Record<string, unknown> = {}) {
  return { sharedContract: "Independent paths", areas, assembly: [], blockers: [], notes: [], ...extra };
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
async function write(cwd: string, path: string, content = "implemented\n") {
  await mkdir(dirname(join(cwd, path)), { recursive: true }); await writeFile(join(cwd, path), content);
}
interface MockOptions {
  implement?: (id: string, cwd: string, prompt: string, count: number) => Promise<{ changedPaths: string[]; summary: string; blockers: string[] }>;
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
    if (command === "probe") return options.probe?.(cwd, args) ?? { exitCode: 0, stdout: "", stderr: "" };
    const out = Bun.spawnSync({ cmd: [command, ...args], cwd, stdout: "pipe", stderr: "pipe" });
    return { exitCode: out.exitCode, stdout: out.stdout.toString(), stderr: out.stderr.toString() };
  } };
  const v5Agent = (_persona: unknown, name: string, rules: string) => ({ ask: async (prompt: string) => {
    calls.push("ask " + name);
    if (name === "V5 configurator") return manifest;
    if (!name.startsWith("V5 implementer ")) return options.inspect?.(name, prompt) ?? { summary: "Requested check", blockers: [], findings: [] };
    const id = name.slice("V5 implementer ".length), cwd = rules.match(/^Work only in (.*?)\. Own only/)![1];
    const count = (counts.get(id) ?? 0) + 1; counts.set(id, count);
    if (options.implement) return await options.implement(id, cwd, prompt, count);
    await write(cwd, id + "/result.txt"); return { changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
  } });
  const runtime = new Function("world", "v5Persona", "v5Agent", "phase", "report", "guardWrites", executable + "\nreturn { runV5, v5ValidatePlan }; ")(
    world, async (path: string, tier: string, access: string) => ({ path, tier, access }), v5Agent, () => {}, (event: unknown) => events.push(event), async (_persona: unknown, cwd: string, work: () => Promise<unknown>) => {
      const before = git(cwd, ["diff", "HEAD"]) + git(cwd, ["status", "--porcelain", "--untracked-files=all"]) + git(cwd, ["rev-parse", "HEAD"]);
      const result = await work();
      if (before !== git(cwd, ["diff", "HEAD"]) + git(cwd, ["status", "--porcelain", "--untracked-files=all"]) + git(cwd, ["rev-parse", "HEAD"])) throw new Error("Read-only guard detected writes");
      return result;
    });
  return { ...runtime, events, calls, counts };
}

describe("V5 per-area static engine", () => {
  test("an area enters its requested next phase while its sibling still implements", async () => {
    const input = await fixture(), siblingStarted = deferred(), nextPhase = deferred(), releaseSibling = deferred();
    const runtime = harness(plan([
      area("ui", { phases: [{ id: "visual", kind: "vision", commands: [{ tool: "probe", args: ["capture"], owners: ["ui"] }], instructions: "User explicitly requested screenshots", personaPath: "/fixture/vision.md", resource: "browser" }] }),
      area("api")
    ]), {
      implement: async (id, cwd) => {
        if (id === "api") { siblingStarted.resolve(); await releaseSibling.promise; }
        else await siblingStarted.promise;
        await write(cwd, id + "/result.txt"); return { changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
      },
      probe: async () => { nextPhase.resolve(); return { exitCode: 0, stdout: "captured", stderr: "" }; }
    });
    const running = runtime.runV5(input);
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
        await write(cwd, id + "/result.txt", id); return { changedPaths: [id + "/result.txt"], summary: id, blockers: [] };
      }
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(consumed).toBe(true);
  });

  test("unknown dependencies, cycles and overlapping ownership reject before writes", async () => {
    const input = await fixture();
    for (const areas of [
      [area("api", { dependsOn: ["missing"] })],
      [area("api", { phases: [{ id: "test", kind: "test", commands: [], instructions: "User requested", dependsOn: ["ui"] }] }), area("ui", { dependsOn: ["api"] })],
      [area("api", { ownedPaths: ["src"] }), area("ui", { ownedPaths: ["src/ui"] })]
    ]) {
      const runtime = harness(plan(areas)); await expect(runtime.runV5(input)).rejects.toThrow();
      expect(runtime.calls.some((call) => call.startsWith("git worktree"))).toBe(false);
    }
  });

  test("a blocked area leaves independent work complete and retained", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api"), area("ui")]), {
      implement: async (id, cwd) => {
        if (id === "api") return { changedPaths: [], summary: "blocked", blockers: ["Missing service"] };
        await write(cwd, "ui/result.txt"); return { changedPaths: ["ui/result.txt"], summary: "done", blockers: [] };
      }
    });
    const result = await runtime.runV5(input);
    expect(result.status).toBe("incomplete"); expect(result.areas.find((area: any) => area.id === "ui").status).toBe("ready");
    expect(await readFile(join(result.candidateWorktree, "ui/result.txt"), "utf8")).toBe("implemented\n");
  });

  test("required assembly failure returns to the same persistent owner without QA", async () => {
    const input = await fixture(); let attempts = 0;
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: ["build"], owners: ["api"] }] })]), {
      implement: async (_id, cwd, _prompt, count) => {
        await write(cwd, "api/result.txt", String(count)); return { changedPaths: ["api/result.txt"], summary: "done", blockers: [] };
      },
      probe: async () => ({ exitCode: ++attempts === 1 ? 1 : 0, stdout: "", stderr: "compiler failure" })
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
    expect(runtime.calls.filter((call) => call.startsWith("ask V5 ")).every((call) => call === "ask V5 configurator" || call === "ask V5 implementer api")).toBe(true);
  });

  test("a repeated correction with no changed progress stops incomplete", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: [], owners: ["api"] }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "unresolved" })
    });
    const result = await runtime.runV5(input);
    expect(result.status).toBe("incomplete"); expect(runtime.counts.get("api")).toBe(2); expect(result.blockers.join()).toContain("No changed progress");
  });

  test("an environment-only correction is retried before declaring no progress", async () => {
    const input = await fixture(); let ready = false;
    const runtime = harness(plan([area("api", { assembly: [{ tool: "probe", args: ["needs-dependency"], owners: ["api"] }] })]), {
      implement: async (_id, cwd, _prompt, count) => {
        if (count === 1) await write(cwd, "api/result.txt");
        else ready = true; // represents installing an ignored dependency, no source diff
        return { changedPaths: count === 1 ? ["api/result.txt"] : [], summary: "prepared", blockers: [] };
      },
      probe: async () => ({ exitCode: ready ? 0 : 1, stdout: "", stderr: "dependency missing" })
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(runtime.counts.get("api")).toBe(2);
  });

  test("unsafe declared or actual changed paths are never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api")]), {
      implement: async (_id, cwd) => {
        await write(cwd, "outside.txt"); return { changedPaths: ["../outside.txt"], summary: "unsafe", blockers: [] };
      }
    });
    const result = await runtime.runV5(input);
    expect(result.status).toBe("incomplete"); expect(runtime.calls.some((call) => call.startsWith("git add"))).toBe(false);
    expect(result.blockers.join()).toContain("unsafe changed path");
  });

  test("an opt-in check failure is reported without unauthorized fixes", async () => {
    const input = await fixture(); const runtime = harness(plan([area("api", { phases: [{ id: "test", kind: "test", commands: [{ tool: "probe", args: [], owners: ["api"] }], instructions: "User requested tests, no fixes" }] })]), {
      probe: async () => ({ exitCode: 1, stdout: "", stderr: "assertion failed" })
    });
    const result = await runtime.runV5(input);
    expect(result.status).toBe("incomplete"); expect(runtime.counts.get("api")).toBe(1); expect(result.blockers.join()).toContain("without authorized repairs");
  });

  test("planning-only manifests return notes without writers or worktrees", async () => {
    const input = await fixture(); const runtime = harness(plan([], { notes: ["A thin requested plan"] }));
    const result = await runtime.runV5(input);
    expect(result.status).toBe("complete"); expect(result.notes).toEqual(["A thin requested plan"]);
    expect(runtime.calls.some((call) => call.startsWith("git worktree") || call.startsWith("ask V5 implementer"))).toBe(false);
  });

  test("integrated assembly routes disjoint owners concurrently", async () => {
    const input = await fixture(), bothFixing = deferred(); let fixing = 0, attempts = 0;
    const runtime = harness(plan([area("api"), area("ui")], { assembly: [{ tool: "probe", args: ["join"], owners: ["api", "ui"] }] }), {
      implement: async (id, cwd, _prompt, count) => {
        if (count > 1) { if (++fixing === 2) bothFixing.resolve(); await bothFixing.promise; }
        await write(cwd, id + "/result.txt", String(count)); return { changedPaths: [id + "/result.txt"], summary: "done", blockers: [] };
      },
      probe: async () => ({ exitCode: ++attempts === 1 ? 1 : 0, stdout: "", stderr: "join failed" })
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(fixing).toBe(2);
  });

  test("authorized phase fixes invalidate earlier requested evidence in that area", async () => {
    const input = await fixture(); let firstChecks = 0, repairChecks = 0;
    const runtime = harness(plan([area("api", { phases: [
      { id: "earlier", kind: "test", commands: [{ tool: "probe", args: ["earlier"], owners: ["api"] }], instructions: "User requested these tests" },
      { id: "later", kind: "test", commands: [{ tool: "probe", args: ["later"], owners: ["api"] }], instructions: "User requested these tests and fixes", fixFindings: true }
    ] })]), {
      implement: async (_id, cwd, _prompt, count) => { await write(cwd, "api/result.txt", String(count)); return { changedPaths: ["api/result.txt"], summary: "done", blockers: [] }; },
      probe: async (_cwd, args) => {
        if (args[0] === "earlier") firstChecks++; else repairChecks++;
        return { exitCode: args[0] === "later" && repairChecks === 1 ? 1 : 0, stdout: "", stderr: "requested correction" };
      }
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(firstChecks).toBe(2); expect(repairChecks).toBe(2);
  });

  test("global source corrections refresh dependent requested evidence", async () => {
    const input = await fixture(); let joined = 0, uiChecks = 0;
    const runtime = harness(plan([area("api"), area("ui", { dependsOn: ["api"], phases: [
      { id: "consumer", kind: "test", commands: [{ tool: "probe", args: ["ui"], owners: ["ui"] }], instructions: "User requested consumer tests" }
    ] })], { assembly: [{ tool: "probe", args: ["join"], owners: ["api"] }] }), {
      implement: async (id, cwd, _prompt, count) => { await write(cwd, id + "/result.txt", String(count)); return { changedPaths: [id + "/result.txt"], summary: "done", blockers: [] }; },
      probe: async (_cwd, args) => {
        if (args[0] === "ui") uiChecks++; else joined++;
        return { exitCode: args[0] === "join" && joined === 1 ? 1 : 0, stdout: "", stderr: "join failure" };
      }
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(uiChecks).toBe(2); expect(runtime.counts.get("ui")).toBe(1);
  });

  test("device resource locks release before image judgment", async () => {
    const input = await fixture(), secondCapture = deferred(); let captures = 0, active = 0, maxActive = 0;
    const runtime = harness(plan(["api", "ui"].map((id) => area(id, { phases: [{ id: "visual", kind: "vision", commands: [{ tool: "probe", args: [], owners: [id] }], personaPath: "/fixture/vision.md", instructions: "User requested capture and visual assessment", resource: "browser" }] }))), {
      probe: async () => {
        active++; maxActive = Math.max(active, maxActive); await Promise.resolve(); active--;
        if (++captures === 2) secondCapture.resolve();
        return { exitCode: 0, stdout: "", stderr: "" };
      },
      inspect: async () => { await secondCapture.promise; return { summary: "Reviewed", blockers: [], findings: [] }; }
    });
    expect((await runtime.runV5(input)).status).toBe("complete"); expect(maxActive).toBe(1); expect(captures).toBe(2);
  });

  test("read-only phase source mutations are guarded and never staged", async () => {
    const input = await fixture();
    const runtime = harness(plan([area("api", { phases: [{ id: "audit", kind: "audit", commands: [], personaPath: "/fixture/audit.md", instructions: "User requested read-only review" }] })]), {
      inspect: async (_name, prompt) => {
        const cwd = prompt.match(/phase in (.*?)\. /)![1];
        await write(cwd, "api/unauthorized.txt"); return { summary: "Changed source", findings: [], blockers: [] };
      }
    });
    const result = await runtime.runV5(input);
    expect(result.status).toBe("incomplete"); expect(result.blockers.join()).toContain("Read-only guard detected writes");
    expect(runtime.calls.some((call) => call.startsWith("git add"))).toBe(false);
  });
});
