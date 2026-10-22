import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, isAbsolute, join, resolve, sep } from "node:path";

// V13 run preparation: validate the request, capture delivery anchors, and print the
// exact CreateWorkflow arguments for the one zflow-engine launch. No model call, no
// product work, no launch file — the engine is launched from this skill's directory via
// CreateWorkflow `path`, so the maintained bytes are what runs.
//
// Usage: bun --no-env-file --config=/dev/null prepare-run.ts <request.json>

const GATE_TOOLS = new Set(["git", "make", "go", "pnpm", "npm", "yarn", "bun", "cargo", "python3", "pytest"]);
const CONTENTIONS = new Set(["terminal", "web", "desktop", "mobile"]);

async function prepare() {
  const [requestArg, ...extra] = process.argv.slice(2);
  if (!requestArg || extra.length) throw new Error("Usage: bun --no-env-file --config=/dev/null prepare-run.ts <request.json>");
  const skillRoot = await realpath(resolve(import.meta.dir, ".."));
  const requestPath = await realpath(resolve(requestArg));
  if (!(await lstat(requestPath)).isFile()) throw new Error("Request must be a regular JSON file");

  const request: unknown = JSON.parse(await readFile(requestPath, "utf8"));
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Request must be a JSON object");
  const fields = request as Record<string, unknown>;
  const allowed = new Set(["repoRoot", "task", "areas", "baseSha", "runTag", "modelProfile", "vision", "commit", "maxRounds", "maxLines", "maxFiles", "agentsMd"]);
  const unknown = Object.keys(fields).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw new Error("Request has unsupported fields: " + unknown.join(", "));

  if (typeof fields.repoRoot !== "string" || !isAbsolute(fields.repoRoot)) throw new Error("repoRoot must be an absolute path");
  const repoRoot = await realpath(fields.repoRoot);
  if (!(await lstat(repoRoot)).isDirectory()) throw new Error("repoRoot must be a directory");
  if (typeof fields.task !== "string" || !fields.task.trim()) throw new Error("task must be a nonblank string");

  if (!Array.isArray(fields.areas) || fields.areas.length === 0) throw new Error("areas must be a non-empty array");
  const names = new Set<string>();
  for (const entry of fields.areas) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("each area must be a JSON object");
    const area = entry as Record<string, unknown>;
    if (typeof area.name !== "string" || !area.name.trim()) throw new Error("area.name must be a nonblank string");
    if (names.has(area.name)) throw new Error("duplicate area name: " + area.name);
    names.add(area.name);
    if (area.contention !== undefined && !CONTENTIONS.has(String(area.contention))) {
      throw new Error(`area ${area.name}: contention must be terminal | web | desktop | mobile`);
    }
    for (const list of ["paths", "excludedPaths", "dependsOn"] as const) {
      if (area[list] !== undefined && (!Array.isArray(area[list]) || (area[list] as unknown[]).some((p) => typeof p !== "string"))) {
        throw new Error(`area ${area.name}: ${list} must be an array of strings`);
      }
    }
    for (const dep of (area.dependsOn as string[] | undefined) ?? []) {
      if (!names.has(dep) && !fields.areas.some((other) => (other as Record<string, unknown>).name === dep)) {
        throw new Error(`area ${area.name}: dependsOn names no such area (${dep})`);
      }
    }
    if (area.skills !== undefined) {
      if (!Array.isArray(area.skills) || area.skills.some((p) => typeof p !== "string")) throw new Error(`area ${area.name}: skills must be an array of strings`);
      for (const skill of area.skills as string[]) {
        if (!isAbsolute(skill)) throw new Error(`area ${area.name}: skill paths must be absolute (${skill})`);
        await realpath(skill); // throws when missing — a launch would ask subagents to read a nonexistent file
      }
    }
    if (area.gates !== undefined) {
      if (!Array.isArray(area.gates)) throw new Error(`area ${area.name}: gates must be an array`);
      for (const gate of area.gates) {
        if (!gate || typeof gate !== "object" || typeof (gate as Record<string, unknown>).tool !== "string") throw new Error(`area ${area.name}: each gate needs a tool`);
        const tool = (gate as Record<string, unknown>).tool as string;
        if (!GATE_TOOLS.has(tool)) throw new Error(`area ${area.name}: gate tool "${tool}" is not in the anchored allowlist`);
        const args = (gate as Record<string, unknown>).args ?? [];
        if (!Array.isArray(args) || args.some((a) => typeof a !== "string")) throw new Error(`area ${area.name}: gate args must be an array of strings`);
        if (args.some((a) => a === "--fix" || a === "--write")) throw new Error(`area ${area.name}: gates are non-mutating — remove --fix/--write from "${tool}"`);
      }
    }
    if (area.budget !== undefined) {
      const budget = area.budget as Record<string, unknown>;
      if (typeof budget.maxLines !== "number" || typeof budget.maxFiles !== "number" || budget.maxLines < 1 || budget.maxFiles < 1) {
        throw new Error(`area ${area.name}: budget needs positive maxLines and maxFiles`);
      }
    }
  }

  if (fields.modelProfile !== undefined && fields.modelProfile !== "balanced" && fields.modelProfile !== "flash") throw new Error("modelProfile must be balanced or flash");
  for (const flag of ["vision", "commit"] as const) {
    if (fields[flag] !== undefined && typeof fields[flag] !== "boolean") throw new Error(flag + " must be a boolean");
  }
  for (const [field, minimum] of [["maxRounds", 0], ["maxLines", 1], ["maxFiles", 1]] as const) {
    if (fields[field] !== undefined && (typeof fields[field] !== "number" || fields[field] < minimum || !Number.isInteger(fields[field]))) {
      throw new Error(field + " must be an integer >= " + minimum);
    }
  }
  if (fields.agentsMd !== undefined && typeof fields.agentsMd !== "string") throw new Error("agentsMd must be a string (empty string disables)");

  const gitEnvironment = { ...process.env };
  for (const key of Object.keys(gitEnvironment)) if (key.startsWith("GIT_")) delete gitEnvironment[key];
  gitEnvironment.GIT_OPTIONAL_LOCKS = "0";
  const git = (...args: string[]) => {
    const result = Bun.spawnSync({
      cmd: ["git", "--no-optional-locks", "-c", "core.fsmonitor=false", "-C", repoRoot, ...args],
      env: gitEnvironment,
      stdin: "ignore", stdout: "pipe", stderr: "pipe",
    });
    if (result.exitCode !== 0) throw new Error("Git validation failed: " + result.stderr.toString().trim());
    return result.stdout.toString().trim();
  };
  if (git("rev-parse", "--is-inside-work-tree") !== "true" || await realpath(git("rev-parse", "--show-toplevel")) !== repoRoot) throw new Error("repoRoot must be the top-level Git worktree directory");
  let branchRef: string;
  try { branchRef = git("symbolic-ref", "--quiet", "HEAD"); }
  catch { throw new Error("A checked-out branch is required; detached HEAD is not supported (Step 6 delivery fast-forwards a branch)"); }
  if (!branchRef.startsWith("refs/heads/")) throw new Error("A checked-out branch is required; detached HEAD is not supported");
  const baseCommit = git("rev-parse", "--verify", "HEAD");
  if (git("status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none")) {
    throw new Error("Worktree must be clean, including all untracked files, before preparation — Step 6 delivery needs the recorded anchors");
  }
  for (const runPath of [".zflow/worktrees/probe", ".zflow/evidence/probe"]) {
    const ignored = Bun.spawnSync({ cmd: ["git", "--no-optional-locks", "-C", repoRoot, "check-ignore", "--quiet", "--", runPath], env: gitEnvironment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    if (ignored.exitCode !== 0) {
      throw new Error("The engine writes run-owned state under .zflow/ — add a \".zflow/\" rule to " + repoRoot + "'s .gitignore, commit it, and rerun (" + runPath + " is not ignored)");
    }
  }
  const baseSha = typeof fields.baseSha === "string" && fields.baseSha.trim() !== "" ? fields.baseSha.trim() : baseCommit;
  if (baseSha !== baseCommit) {
    const reachable = Bun.spawnSync({ cmd: ["git", "--no-optional-locks", "-C", repoRoot, "merge-base", "--is-ancestor", baseSha, baseCommit], env: gitEnvironment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    if (reachable.exitCode !== 0) throw new Error("baseSha must be an ancestor of the current HEAD");
  }
  const runTag = typeof fields.runTag === "string" && fields.runTag.trim() !== "" ? fields.runTag.trim().replace(/[^A-Za-z0-9._-]/g, "-") : baseSha.slice(0, 8);
  const staleBranch = Bun.spawnSync({ cmd: ["git", "--no-optional-locks", "-C", repoRoot, "rev-parse", "--verify", "--quiet", "zflow/" + runTag + "/integration"], env: gitEnvironment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const staleWorktree = await lstat(join(repoRoot, ".zflow", "worktrees", "_integration-" + runTag)).then(() => true, () => false);
  if (staleBranch.exitCode === 0 || staleWorktree) {
    throw new Error(`Stale zflow/${runTag} branches or worktrees exist — pass a new runTag in the request (the engine refuses to create over them)`);
  }

  const args: Record<string, unknown> = { mode: "chain", task: fields.task, areas: fields.areas, baseSha, runTag, repoRoot };
  if (fields.modelProfile !== undefined) args.modelProfile = fields.modelProfile;
  if (fields.vision !== undefined) args.vision = fields.vision;
  if (fields.commit !== undefined) args.commit = fields.commit;
  if (fields.maxRounds !== undefined) args.maxRounds = fields.maxRounds;
  if (fields.maxLines !== undefined) args.maxLines = fields.maxLines;
  if (fields.maxFiles !== undefined) args.maxFiles = fields.maxFiles;
  if (fields.agentsMd !== undefined) args.agentsMd = fields.agentsMd;

  const checked = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(skillRoot, "scripts", "check-script.ts"), join(skillRoot, "zflow-engine.dwf.ts")],
    cwd: skillRoot,
    stdin: "ignore", stdout: "inherit", stderr: "inherit",
  });
  if ((checked.exitCode ?? 1) !== 0) throw new Error("Engine facade check failed — fix the engine before launching");

  console.log(JSON.stringify({
    scriptPath: join(skillRoot, "zflow-engine.dwf.ts"),
    name: "zflow-" + basename(repoRoot) + "-" + runTag,
    args,
    anchors: { baseCommit, branchRef, runTag },
  }, null, 2));
}

try {
  await prepare();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
