import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const prepareRun = join(import.meta.dir, "prepare-run.ts");
const temporary: string[] = [];
afterEach(async () => { for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true }); });

interface Fixture { repoRoot: string; git: (args: string[]) => string; request: (fields: Record<string, unknown>) => string }

async function fixture(): Promise<Fixture> {
  const directory = await mkdtemp(join(tmpdir(), "zv13-prepare-test-")); temporary.push(directory);
  const repoRoot = join(directory, "repo");
  await mkdir(repoRoot);
  const git = (args: string[]) => {
    const out = Bun.spawnSync({ cmd: ["git", ...args], cwd: repoRoot, stdout: "pipe", stderr: "pipe", stdin: "ignore" });
    if (out.exitCode !== 0) throw new Error("git " + args.join(" ") + " → " + out.stderr.toString());
    return out.stdout.toString().trim();
  };
  git(["init", "-b", "main"]);
  git(["config", "user.email", "fixture@example.invalid"]);
  git(["config", "user.name", "Prepare fixture"]);
  await writeFile(join(repoRoot, "README.md"), "seed\n");
  await writeFile(join(repoRoot, "AGENTS.md"), "# prepare fixture rules\n");
  await writeFile(join(repoRoot, ".gitignore"), ".zflow/\n");
  git(["add", "."]); git(["commit", "-m", "seed"]);
  return {
    repoRoot, git,
    request: (fields) => {
      const path = join(directory, "request-" + Math.random().toString(36).slice(2) + ".json");
      writeFileSync(path, JSON.stringify(fields));
      temporary.push(path);
      return path;
    },
  };
}

function prepare(requestPath: string) {
  const out = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", prepareRun, requestPath],
    cwd: join(import.meta.dir, ".."),
    stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  return { code: out.exitCode, stdout: out.stdout.toString(), stderr: out.stderr.toString() };
}

const area = (name: string, extra: Record<string, unknown> = {}) => ({ name, contention: "terminal", paths: ["src/" + name], ...extra });

describe("V13 prepare-run", () => {
  test("a clean request prints the one-launch arguments and delivery anchors", async () => {
    const fx = await fixture();
    const head = fx.git(["rev-parse", "HEAD"]);
    const out = prepare(fx.request({ repoRoot: fx.repoRoot, task: "Do the thing", areas: [area("api")] }));
    expect(out.code).toBe(0);
    // stdout carries the checker's pass line before the launch JSON.
    const launched = JSON.parse(out.stdout.slice(out.stdout.indexOf("{")));
    expect(launched.scriptPath.endsWith("zflow-engine.dwf.ts")).toBe(true);
    expect(launched.args.mode).toBe("chain");
    expect(launched.args.baseSha).toBe(head);
    expect(launched.args.runTag).toBe(head.slice(0, 8));
    expect(launched.args.repoRoot).toBe(realpathSync(fx.repoRoot));
    expect(launched.args.agentsMd).toBe(join(realpathSync(fx.repoRoot), "AGENTS.md"));
    expect(launched.anchors.branchRef).toBe("refs/heads/main");
    expect(launched.anchors.baseCommit).toBe(head);
  });

  test("unsupported fields, dirty checkouts, and detached HEAD refuse with the reason", async () => {
    const fx = await fixture();
    expect(prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")], pieces: [] })).stderr).toContain("unsupported fields");
    await writeFile(join(fx.repoRoot, "dirty.txt"), "uncommitted\n");
    expect(prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")] })).stderr).toContain("must be clean");
    fx.git(["checkout", "--quiet", "--detach", "HEAD"]);
    expect(prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")] })).stderr).toContain("detached HEAD");
  });

  test("an unignored .zflow refuses with the remedy, and the committed rule clears it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "zv13-prepare-test-")); temporary.push(directory);
    const repoRoot = join(directory, "repo");
    await mkdir(repoRoot);
    const git = (args: string[]) => { const o = Bun.spawnSync({ cmd: ["git", ...args], cwd: repoRoot, stdout: "pipe", stderr: "pipe", stdin: "ignore" }); if (o.exitCode) throw new Error(o.stderr.toString()); return o.stdout.toString().trim(); };
    git(["init", "-b", "main"]); git(["config", "user.email", "f@e.invalid"]); git(["config", "user.name", "f"]);
    await writeFile(join(repoRoot, "README.md"), "seed\n");
    git(["add", "."]); git(["commit", "-m", "seed"]);
    const request = (fields: Record<string, unknown>) => { const p = join(directory, "r.json"); writeFileSync(p, JSON.stringify(fields)); return p; };
    const refusal = prepare(request({ repoRoot, task: "t", areas: [area("api")] }));
    expect(refusal.code).toBe(1);
    expect(refusal.stderr).toContain(".zflow/");
    expect(refusal.stderr).toContain(".gitignore");
    await writeFile(join(repoRoot, ".gitignore"), ".zflow/\n");
    git(["add", "."]); git(["commit", "-m", "ignore engine state"]);
    expect(prepare(request({ repoRoot, task: "t", areas: [area("api")] })).code).toBe(0);
  });

  test("stale runTag branches and worktrees refuse with the runTag remedy", async () => {
    const fx = await fixture();
    const head = fx.git(["rev-parse", "HEAD"]);
    const tag = head.slice(0, 8);
    fx.git(["branch", "zflow/" + tag + "/integration"]);
    expect(prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")] })).stderr).toContain("new runTag");
    const fresh = prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")], runTag: "second-attempt" }));
    expect(fresh.code).toBe(0);
    expect(JSON.parse(fresh.stdout.slice(fresh.stdout.indexOf("{"))).args.runTag).toBe("second-attempt");
  });

  test("area validation: duplicates, unknown deps, unallowlisted or mutating gates, missing skills", async () => {
    const fx = await fixture();
    const skill = join(fx.repoRoot, "SKILL.md");
    await writeFile(skill, "# s\n");
    fx.git(["add", "SKILL.md"]);
    fx.git(["commit", "-m", "skill"]); // preparation requires the checkout clean, untracked files included
    const cases: [Record<string, unknown>, string][] = [
      [{ areas: [area("api"), area("api")] }, "duplicate area name"],
      [{ areas: [area("api", { dependsOn: ["ui"] })] }, "no such area"],
      [{ areas: [area("api", { gates: [{ tool: "curl", args: [] }] })] }, "allowlist"],
      [{ areas: [area("api", { gates: [{ tool: "bun", args: ["run", "fix", "--fix"] }] })] }, "non-mutating"],
      [{ areas: [area("api", { skills: ["relative.md"] })] }, "absolute"],
      [{ areas: [area("api", { skills: [join(fx.repoRoot, "missing.md")] })] }, "ENOENT"],
      [{ areas: [{ name: "", contention: "terminal" }] }, "nonblank"],
      [{ areas: [area("api", { contention: "gpu" })] }, "contention"],
      [{ areas: [area("api", { budget: { maxLines: 0, maxFiles: 1 } })] }, "positive"],
      [{}, "areas"],
    ];
    for (const [fields, message] of cases) {
      const out = prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", ...fields }));
      expect(out.code, JSON.stringify(fields)).toBe(1);
      expect(out.stderr, JSON.stringify(fields)).toContain(message);
    }
    const withSkill = prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api", { skills: [skill] })] }));
    expect(withSkill.code).toBe(0);
    expect((JSON.parse(withSkill.stdout.slice(withSkill.stdout.indexOf("{"))).args.areas[0].skills as string[])[0]).toBe(skill);
  });

  test("the engine facade check runs as part of preparation", async () => {
    const fx = await fixture();
    const out = prepare(fx.request({ repoRoot: fx.repoRoot, task: "t", areas: [area("api")] }));
    // The checker prints its pass line to the inherited stdout before the launch JSON.
    expect(out.stdout).toContain("Strict facade check passed");
    expect(out.stdout).toContain("\"scriptPath\"");
  });
});
