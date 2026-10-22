// zflow-v7: fixed per-area pipeline; task configuration is data, never authored code.
interface RunInput {
  repoRoot: string; task: string; baseCommit: string; branchRef: string;
  startedAt: string; skillRoot: string; instructionPaths: string[];
}
interface CommandPlan { tool: string; args: string[]; owners: string[] }
interface AreaPhase {
  id: string; kind: "assembly" | "test" | "vision" | "audit";
  commands: CommandPlan[]; personaPath?: string; instructions?: string;
  dependsOn?: string[]; resource?: string; fixFindings?: boolean;
}
interface AreaPlan {
  id: string; title: string; personaPath: string; ownedPaths: string[];
  dependsOn: string[]; instructions: string; setup: CommandPlan[]; assembly: CommandPlan[]; phases?: AreaPhase[];
}
interface RunPlan { sharedContract: string; areas: AreaPlan[]; setup: CommandPlan[]; assembly: CommandPlan[]; blockers: string[]; notes: string[] }
interface WorkBlocker { kind: "input" | "permission" | "environment" | "implementation"; detail: string }
interface AreaWork {
  status: "implemented" | "blocked"; changedPaths: string[]; summary: string;
  blockers: WorkBlocker[]; observations: string[];
}
interface PhaseWork { summary: string; blockers: string[]; findings: string[] }
interface AreaResult { id: string; status: "ready" | "blocked"; branch: string; worktree: string; commit: string; summary: string; blockers: string[]; findings: string[]; observations: string[] }
interface RunResult { status: "complete" | "incomplete"; candidateBranch: string; candidateWorktree: string; candidateCommit: string; areas: AreaResult[]; blockers: string[]; notes: string[]; callerStartedAt: string; firstImplementationAt: string; completedAt: string }

function v7SafePath(path: string): boolean {
  return typeof path === "string" && path !== "" && !path.startsWith("/") && !path.includes("\\") &&
    !/[\x00-\x1f\x7f]/.test(path) && path.split("/").every((p) => p !== "" && p !== "." && p !== ".." && p.toLowerCase() !== ".git");
}
function v7Owns(area: AreaPlan, path: string): boolean {
  return v7SafePath(path) && area.ownedPaths.some((root) => path === root || path.startsWith(root + "/"));
}
function v7Require(condition: boolean, field: string, message: string): void {
  if (!condition) throw new Error(field + ": " + message);
}
function v7Strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function v7ValidatePlan(plan: RunPlan): void {
  v7Require(!!plan && typeof plan === "object" && !Array.isArray(plan), "RunPlan", "expected an object");
  v7Require(typeof plan.sharedContract === "string", "sharedContract", "expected a string");
  v7Require(Array.isArray(plan.areas), "areas", "expected an array");
  v7Require(v7Strings(plan.blockers), "blockers", "expected a string array");
  v7Require(v7Strings(plan.notes), "notes", "expected a string array");
  const ids = new Set<string>();
  for (const [index, area] of plan.areas.entries()) {
    const field = "areas[" + index + "]";
    v7Require(!!area && typeof area === "object" && !Array.isArray(area), field, "expected an area object");
    v7Require(typeof area.id === "string" && /^[a-z][a-z0-9-]*$/.test(area.id) && !ids.has(area.id), field + ".id", "expected a unique lowercase area ID");
    ids.add(area.id);
    v7Require(typeof area.personaPath === "string" && area.personaPath.startsWith("/"), field + ".personaPath", "expected an absolute specialist path");
    v7Require(typeof area.title === "string" && !!area.title.trim(), field + ".title", "expected a nonblank string");
    v7Require(typeof area.instructions === "string" && !!area.instructions.trim(), field + ".instructions", "expected a nonblank string");
    v7Require(Array.isArray(area.ownedPaths) && area.ownedPaths.length > 0, field + ".ownedPaths", "expected nonempty relative file/directory paths");
    area.ownedPaths = area.ownedPaths.map((path, pathIndex) => {
      // A single trailing slash is ordinary directory notation, not a traversal.
      const normalized = typeof path === "string" ? path.replace(/\/$/, "") : path;
      v7Require(v7SafePath(normalized), field + ".ownedPaths[" + pathIndex + "]", "unsafe relative path " + JSON.stringify(path));
      return normalized;
    });
    v7Require(v7Strings(area.dependsOn), field + ".dependsOn", "expected area IDs as a string array");
    v7Require(area.phases === undefined || Array.isArray(area.phases), field + ".phases", "expected an array");
    const phaseIds = new Set<string>();
    for (const [phaseIndex, step] of (area.phases ?? []).entries()) {
      const phaseField = field + ".phases[" + phaseIndex + "]";
      v7Require(!!step && typeof step === "object" && !Array.isArray(step), phaseField, "expected a phase object");
      v7Require(typeof step.id === "string" && /^[a-z][a-z0-9-]*$/.test(step.id) && !phaseIds.has(step.id), phaseField + ".id", "expected a unique lowercase phase ID");
      phaseIds.add(step.id);
      v7Require(["assembly", "test", "vision", "audit"].includes(step.kind), phaseField + ".kind", "unsupported phase kind");
      v7Require(step.personaPath === undefined || (typeof step.personaPath === "string" && step.personaPath.startsWith("/")), phaseField + ".personaPath", "expected an absolute path");
      v7Require(step.instructions === undefined || typeof step.instructions === "string", phaseField + ".instructions", "expected a string");
      if (step.kind !== "assembly" || step.fixFindings || step.personaPath) v7Require(typeof step.instructions === "string" && !!step.instructions.trim(), phaseField + ".instructions", "cite explicit check/fix authorization and actor instructions");
      v7Require(step.fixFindings === undefined || typeof step.fixFindings === "boolean", phaseField + ".fixFindings", "expected a boolean");
      v7Require(step.resource === undefined || (typeof step.resource === "string" && /^[a-z][a-z0-9-]*$/.test(step.resource)), phaseField + ".resource", "expected an exclusive resource ID");
      v7Require(step.dependsOn === undefined || v7Strings(step.dependsOn), phaseField + ".dependsOn", "expected area IDs as a string array");
    }
  }
  const checkCommands = (commands: CommandPlan[], field: string, assembly: boolean): void => {
    v7Require(Array.isArray(commands), field, "expected a command array");
    for (const [index, command] of commands.entries()) {
      const commandField = field + "[" + index + "]";
      v7Require(!!command && typeof command === "object" && !Array.isArray(command), commandField, "expected a command object");
      v7Require(typeof command.tool === "string" && /^[A-Za-z0-9_./+-]+$/.test(command.tool) && !/(^|\/)git$/.test(command.tool), commandField + ".tool", "expected an executable other than Git");
      v7Require(v7Strings(command.args) && command.args.every((arg) => !arg.includes("\0")), commandField + ".args", "expected string arguments without NUL");
      v7Require(v7Strings(command.owners) && command.owners.length > 0 && new Set(command.owners).size === command.owners.length && command.owners.every((id) => ids.has(id)), commandField + ".owners", "expected unique known area IDs");
      // Assembly is data naming existing setup/build commands, not newly authored check code.
      if (assembly) {
        const executable = command.tool.split("/").pop()!;
        const inlineCode = /^(?:bun|node|deno|python[0-9.]*)$/.test(executable) && command.args.some((arg) => /^(?:-e|-p|-c|--eval|--print|--command)(?:=|$)|^-[epc].+/.test(arg));
        const shell = /^(?:sh|bash|zsh|fish|dash)$/.test(executable);
        const testRunner = /^(?:bun|deno|cargo|go)$/.test(executable) && command.args[0] === "test";
        v7Require(!inlineCode && !shell && !testRunner, commandField, "assembly accepts setup/build commands, not inline scripts, shell programs or test runners; explicitly authorized checks belong in optional phases");
      }
    }
  };
  for (let i = 0; i < plan.areas.length; i++) {
    const area = plan.areas[i];
    checkCommands(area.setup, "areas[" + i + "].setup", true);
    checkCommands(area.assembly, "areas[" + i + "].assembly", true);
    for (const [index, step] of (area.phases ?? []).entries()) checkCommands(step.commands, "areas[" + i + "].phases[" + index + "].commands", step.kind === "assembly");
    for (let j = 0; j < i; j++) for (const a of area.ownedPaths) for (const b of plan.areas[j].ownedPaths) {
      if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/")) throw new Error("Overlapping ownership: " + area.id + "/" + plan.areas[j].id + " at " + a + "/" + b);
    }
  }
  checkCommands(plan.setup, "setup", true);
  checkCommands(plan.assembly, "assembly", true);
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => {
    if (!ids.has(id)) throw new Error("Unknown dependency: " + id);
    if (visiting.has(id)) throw new Error("Dependency cycle: " + id);
    if (visited.has(id)) return;
    visiting.add(id);
    const area = plan.areas.find((a) => a.id === id)!;
    for (const dependency of [...area.dependsOn, ...(area.phases ?? []).flatMap((p) => p.dependsOn ?? [])]) visit(dependency);
    visiting.delete(id); visited.add(id);
  };
  for (const area of plan.areas) visit(area.id);
}

function v7ValidateWork(work: AreaWork): void {
  v7Require(!!work && typeof work === "object" && !Array.isArray(work), "AreaWork", "expected an object");
  v7Require(work.status === "implemented" || work.status === "blocked", "AreaWork.status", "expected implemented or blocked");
  v7Require(v7Strings(work.changedPaths), "AreaWork.changedPaths", "expected a string array");
  v7Require(typeof work.summary === "string" && !!work.summary.trim(), "AreaWork.summary", "expected a brief concrete result");
  v7Require(v7Strings(work.observations), "AreaWork.observations", "put deferred checks, assumptions and residual risks here");
  v7Require(Array.isArray(work.blockers), "AreaWork.blockers", "expected actionable blocker objects, not observations or prose strings");
  for (const blocker of work.blockers) {
    v7Require(!!blocker && typeof blocker === "object" && !Array.isArray(blocker) &&
      ["input", "permission", "environment", "implementation"].includes(blocker.kind) &&
      typeof blocker.detail === "string" && !!blocker.detail.trim(), "AreaWork.blockers", "each blocker needs kind and a concrete unmet requirement in detail; deferred engine checks are observations");
  }
  v7Require(work.status === "blocked" ? work.blockers.length > 0 : work.blockers.length === 0,
    "AreaWork.status/blockers", "implemented requires empty blockers; blocked requires an actionable unmet requirement");
}
function v7BlockerText(work: AreaWork): string {
  return work.blockers.map((blocker) => blocker.kind + ": " + blocker.detail).join("\n");
}

async function runV7(input: RunInput): Promise<RunResult> {
  let gitTail: Promise<unknown> = Promise.resolve();
  const resourceTails = new Map<string, Promise<unknown>>();
  const serializeGit = async <T>(work: () => Promise<T>): Promise<T> => {
    const next = gitTail.then(work); gitTail = next.catch(() => undefined); return await next;
  };
  const execute = async (cwd: string, tool: string, argv: string[]): Promise<WorldRunResult> =>
    await world.run("sh", ["-c", 'cd "$1" && shift && exec "$@"', "sh", cwd, tool, ...argv], { timeoutMs: 300000 });
  const checked = async (cwd: string, tool: string, argv: string[]): Promise<string> => {
    const out = await execute(cwd, tool, argv);
    if (out.exitCode !== 0) throw new Error(tool + " " + argv.slice(0, 3).join(" ") + ": " + (out.stderr + out.stdout).slice(-12000));
    return out.stdout;
  };
  const gitAt = async (cwd: string, argv: string[]): Promise<string> => await checked(cwd, "git", argv);
  const token = input.baseCommit.slice(0, 8) + "-" + input.startedAt.replace(/[^a-zA-Z0-9]/g, "");
  const prefix = "z-v7/" + token;
  const root = input.repoRoot + "-zv7-" + token;
  const candidate = root + "-candidate";
  const branch = prefix + "/candidate";
  let firstImplementationAt = "";
  let firstStamp: Promise<string> | undefined;
  const timestamp = async (): Promise<string> => {
    const out = await world.run("date", ["-u", "+%Y-%m-%dT%H:%M:%SZ"]);
    if (out.exitCode !== 0) throw new Error("Could not record run timestamp: " + out.stderr);
    return out.stdout.trim();
  };
  const completed = new Map<string, Promise<AreaResult>>();
  const resolveArea = new Map<string, (result: AreaResult) => void>();
  const contexts = new Map<string, Agent>();
  const results = new Map<string, AreaResult>();
  const revisions = new Map<string, number>();
  const observations = new Map<string, string[]>();
  const event = (area: string, step: string, status: string): void => {
    report({ area, step, revision: revisions.get(area) ?? 0, status });
  };
  const anchors = async (): Promise<void> => {
    const head = (await gitAt(input.repoRoot, ["rev-parse", "HEAD"])).trim();
    const ref = (await gitAt(input.repoRoot, ["symbolic-ref", "-q", "HEAD"])).trim();
    const status = await gitAt(input.repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (head !== input.baseCommit || ref !== input.branchRef || status !== "") throw new Error("Checkout anchors changed; no worktree mutation performed");
  };
  phase("Configure the area pipeline");
  await anchors();
  const configuratorPersona = await v7Persona(input.skillRoot + "/personas/configurator.md", "pro", "read-only");
  const configurator = v7Agent(configuratorPersona, "V7 configurator", "Read-only configuration. Inspect only necessary task sources and supplied instructions. Do not read engine/helper/API sources or other workflow directories. Return configuration data only; no scripts, edits, Git mutations, tests, nested agents or workflows.");
  const configurationPrompt = [
    "Configure one thin per-area pipeline for this task. Return RunPlan only. Task: " + input.task,
    "Repository: " + input.repoRoot + "\nInstruction paths: " + JSON.stringify(input.instructionPaths),
    "RunPlan: {sharedContract:string,areas:AreaPlan[],setup:CommandPlan[],assembly:CommandPlan[],blockers:string[],notes:string[]}. Keep sharedContract, assignments and notes brief; reference the task instead of rewriting it or producing implementation pseudocode.",
    "AreaPlan: {id,title,personaPath (absolute specialist file),ownedPaths (safe relative files/directories, disjoint; directory trailing slash accepted),dependsOn (area IDs genuinely required BEFORE implementation),instructions,setup:CommandPlan[],assembly:CommandPlan[],phases?:AreaPhase[]}.",
    "CommandPlan: {tool:string,args:string[],owners:string[]}; name existing setup/build commands, no inline eval code, shell programs, Git, nested workflows or cwd arguments. Test runners, HTTP assertions, CRUD/persistence smokes and browser probes are checks even without test files; never relabel them assembly. Include them only in expressly authorized optional phases. Honor explicit user overrides of TASK.md/project check requirements.",
    "AreaPhase: {id,kind:'assembly'|'test'|'vision'|'audit',commands:CommandPlan[],personaPath?:string,instructions?:string,dependsOn?:string[],resource?:string,fixFindings?:boolean}. Optional test/vision/audit phases MUST cite explicit user/project authorization in instructions; omit by default. Set fixFindings true ONLY with explicit authorized fixes, also cited there. Phase dependencies delay only that phase, not implementation. Resources name actual exclusive capture/device steps; release before separate image judgment. Read-only phase actors report findings, never edit source.",
    "Implementation dependsOn must reflect missing implementation inputs, never a later check/build. Agree the API/types in sharedContract so independent writers start together. A project-wide check/build that needs both areas belongs in global assembly, not an implementation dependency. Do not make frontend wait for backend merely because svelte-check or a build covers both.",
    "Every area and candidate have separate worktrees. Area setup runs before its writer, concurrently with other areas: declare required dependency/tool setup there so installed types are available during implementation. RunPlan.setup prepares the merged candidate before integration assembly. Never share writable node_modules. Setup failures stop only their consumers. Do not put the same setup command in assembly; if the task changes dependencies, declare its appropriate post-edit resolution command and owned lockfile explicitly. Use frozen lockfile setup when compatible with the task.",
    "The engine owns setup, dependency installation, project-wide checking/building and optional checks. Writers own implementation only; do not tell them to run any of those commands. Mandatory framework compiler assistance on changed files is implementation tooling, not an extra clean round. No HTTP/CRUD/persistence smokes or ad hoc inline programs in a writer task. Explicit scope overrides persona/skill check recommendations.",
    "Each area implements, immediately runs its assembly and authorized phases, and completes independently; do not impose a whole-app barrier. Global assembly only for a real integration join. Minimal scope, persistent specialist per area, no plan review."
  ].join("\n");
  let plan: RunPlan | undefined;
  let configurationError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const proposed = await guardWrites(configuratorPersona, input.repoRoot, async () => await configurator.ask<RunPlan>(configurationPrompt + (configurationError ? "\nCorrect only the invalid configuration fields in your previous RunPlan. Keep the same task scope and independent areas; no fresh exploration or plan review. Validator: " + configurationError : "")));
    try { v7ValidatePlan(proposed); plan = proposed; break; }
    catch (error) {
      configurationError = error instanceof Error ? error.message : String(error);
      report({ area: "configuration", step: "validation", status: attempt === 0 ? "retrying" : "blocked", message: configurationError });
    }
  }
  await anchors();
  if (!plan) return { status: "incomplete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: ["Invalid configuration after one correction: " + configurationError], notes: [], callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
  if (plan.blockers.length || !plan.areas.length) return { status: plan.blockers.length ? "incomplete" : "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: plan.blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
  phase("Run each ready area through its own phases");
  await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", branch, candidate, input.baseCommit]));
  for (const area of plan.areas) completed.set(area.id, new Promise<AreaResult>((resolve) => resolveArea.set(area.id, resolve)));
  const merge = async (cwd: string, commit: string): Promise<void> => {
    const out = await execute(cwd, "git", ["merge", "--no-edit", "--no-ff", commit]);
    if (out.exitCode === 0) return;
    const pending = await execute(cwd, "git", ["rev-parse", "-q", "--verify", "MERGE_HEAD"]);
    if (pending.exitCode === 0) await gitAt(cwd, ["merge", "--abort"]);
    throw new Error("Run-owned merge failed; partial work retained: " + (out.stderr + out.stdout).slice(-12000));
  };
  const statusPaths = async (area: AreaPlan, cwd: string): Promise<string[]> => {
    const raw = await gitAt(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    const chunks = raw.split("\0"); const paths: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const entry = chunks[i]; if (!entry) continue;
      const path = entry.slice(3);
      if (!v7Owns(area, path)) throw new Error("Changed path outside ownership: " + path);
      paths.push(path);
      if (entry.slice(0, 2).includes("R") || entry.slice(0, 2).includes("C")) {
        const original = chunks[++i];
        if (!v7Owns(area, original)) throw new Error("Rename source outside ownership: " + original);
        paths.push(original);
      }
    }
    return [...new Set(paths)];
  };
  const fingerprint = async (area: AreaPlan, cwd: string): Promise<string> => {
    const paths = await statusPaths(area, cwd);
    const diff = await gitAt(cwd, ["diff", "HEAD", "--binary"]);
    const hashes: string[] = [];
    for (const path of paths) {
      const out = await execute(cwd, "git", ["hash-object", "--", path]);
      hashes.push(path + ":" + (out.exitCode === 0 ? out.stdout.trim() : "<deleted>"));
    }
    return diff + JSON.stringify(hashes);
  };
  const commitArea = async (area: AreaPlan, cwd: string): Promise<string> => await serializeGit(async () => {
    const paths = await statusPaths(area, cwd);
    if (paths.length) {
      await gitAt(cwd, ["add", "--", ...paths]);
      await gitAt(cwd, ["commit", "-m", "V7: " + area.id + " revision " + (revisions.get(area.id) ?? 0)]);
    }
    return (await gitAt(cwd, ["rev-parse", "HEAD"])).trim();
  });
  const workContract = "Return AreaWork only: {status:'implemented'|'blocked',changedPaths:string[],summary:string,blockers:{kind:'input'|'permission'|'environment'|'implementation',detail:string}[],observations:string[]}. Summary is a brief result, not a file-by-file report, repeated task, version inventory or check transcript. Implemented means owned implementation is finished and blockers is empty. Blocked means an actual unmet requirement prevents completing implementation; name it concretely. Engine checks not yet run, excluded tests, assumptions and residual risks belong in observations and do not block implementation. Setup/assembly/optional checks belong to the engine; do not run or repeat them yourself. Batch independent source reads; use prepared local types. No audits, tests, HTTP/CRUD smokes, source eval programs, Git, nested agents or workflows. Mandatory framework compiler assistance is limited to edited files; do not repeat passed compiler checks on unchanged files.";
  const askWork = async (area: AreaPlan, cwd: string, prompt: string): Promise<AreaWork> => {
    revisions.set(area.id, (revisions.get(area.id) ?? 0) + 1);
    event(area.id, "implementation", "running");
    if (!firstStamp) firstStamp = timestamp();
    firstImplementationAt = await firstStamp;
    const actor = contexts.get(area.id)!;
    let feedback = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const work = await actor.ask<AreaWork>(attempt === 0 ? prompt + "\n" + workContract :
        "Correct only the completion report from your previous response using facts already available. No tools, file edits, new exploration, rechecks or longer report. Classify deferred engine checks and residual risks as observations; retain genuine unmet requirements as blockers. " + workContract + "\nValidator: " + feedback);
      // Actual write ownership is checked even if the reported result is malformed.
      await statusPaths(area, cwd);
      if (Array.isArray(work?.changedPaths) && work.changedPaths.some((path) => typeof path === "string" && !v7Owns(area, path))) throw new Error("Actor reported unsafe changed path");
      try { v7ValidateWork(work); }
      catch (error) {
        feedback = error instanceof Error ? error.message : String(error);
        event(area.id, "completion-report", attempt === 0 ? "clarifying" : "blocked");
        if (attempt === 0) continue;
        throw new Error("Invalid completion report after one clarification: " + feedback);
      }
      const notes = observations.get(area.id)!;
      for (const observation of work.observations) if (!notes.includes(observation)) notes.push(observation);
      return work;
    }
    throw new Error("No valid completion report");
  };
  const runCommandsRaw = async (commands: CommandPlan[], cwd: string): Promise<string> => {
    for (const command of commands) {
      const out = await execute(cwd, command.tool, command.args);
      if (out.exitCode !== 0) return JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
    }
    return "";
  };
  const runCommands = async (commands: CommandPlan[], cwd: string, resource?: string): Promise<string> => {
    if (!resource) return await runCommandsRaw(commands, cwd);
    const next = (resourceTails.get(resource) ?? Promise.resolve()).then(async () => await runCommandsRaw(commands, cwd));
    resourceTails.set(resource, next.catch(() => undefined)); return await next;
  };
  const assembleArea = async (area: AreaPlan, cwd: string, commands: CommandPlan[], step: string, resource?: string): Promise<string> => {
    for (;;) {
      event(area.id, step, "running");
      const error = await runCommands(commands, cwd, resource);
      if (!error) { event(area.id, step, "ready"); return ""; }
      const before = await fingerprint(area, cwd);
      const work = await askWork(area, cwd, "Correct only this blocking required assembly failure, in your owned paths at " + cwd + ". No audits, tests, unrelated fixes, Git or nested workflows. Return AreaWork.\n" + error);
      if (work.blockers.length) return v7BlockerText(work);
      if (await fingerprint(area, cwd) === before) {
        const retry = await runCommands(commands, cwd, resource);
        if (!retry) { event(area.id, step, "ready"); return ""; }
        return "No changed progress correcting assembly: " + retry;
      }
    }
  };
  const waitDependencies = async (ids: string[], cwd: string): Promise<string> => {
    const dependencies = await Promise.all(ids.map((id) => completed.get(id)!));
    const blocked = dependencies.find((result) => result.status !== "ready");
    if (blocked) return "Dependency blocked: " + blocked.id;
    for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
    return "";
  };
  const phaseContexts = new Map<string, { persona: Persona; actor: Agent }>();
  const runAreaPhases = async (area: AreaPlan, cwd: string, result: AreaResult): Promise<void> => {
    let index = 0;
    while (index < (area.phases ?? []).length) {
      const step = area.phases![index];
        const dependencyError = await waitDependencies(step.dependsOn ?? [], cwd);
        if (dependencyError) throw new Error(dependencyError);
        event(area.id, step.id, "running");
        const phaseCommands = async (): Promise<string> => await runCommands(step.commands, cwd, step.resource);
        let commandError = "";
        if (step.kind === "assembly") commandError = await assembleArea(area, cwd, step.commands, step.id, step.resource);
        else commandError = await phaseCommands();
        const phaseProblems: string[] = commandError ? [commandError] : [];
        if (step.personaPath) {
          const key = area.id + ":" + step.id;
          let context = phaseContexts.get(key);
          if (!context) {
            const persona = await v7Persona(step.personaPath, step.kind === "vision" ? "flash" : "pro", "read-only");
            context = { persona, actor: v7Agent(persona, "V7 " + area.id + " " + step.id, "Read-only. No edits, Git, agents, workflows or automatic fixes. Engine commands handle authorized evidence outputs. Exclusive capture commands already finished; image judgment owns no device lock.") };
            phaseContexts.set(key, context);
          }
          const finding = await guardWrites(context.persona, cwd, async () => await context!.actor.ask<PhaseWork>("Run only this authorized " + step.kind + " phase in " + cwd + ". " + step.instructions + "\nTask: " + input.task + "\nShared contract: " + plan.sharedContract + "\nReturn PhaseWork with concrete summary, blockers and findings."));
          if (finding.blockers.length) throw new Error(finding.blockers.join("\n"));
          if (step.fixFindings) phaseProblems.push(...finding.findings);
          else result.findings.push(...finding.findings);
        }
        if (phaseProblems.length) {
          if (!step.fixFindings) throw new Error("Requested phase failed without authorized repairs: " + phaseProblems.join("\n"));
          const before = await fingerprint(area, cwd);
          const fixed = await askWork(area, cwd, "Apply only the explicitly authorized fixes for phase " + step.id + " in " + cwd + ". Authorization and instructions: " + step.instructions + "\nFindings: " + phaseProblems.join("\n") + "\nOwned paths only; return AreaWork. No Git, workflows, unrelated fixes or checks.");
          if (fixed.blockers.length) throw new Error(v7BlockerText(fixed));
          if (await fingerprint(area, cwd) === before && (!commandError || await runCommands(step.commands, cwd, step.resource))) throw new Error("No changed progress on authorized phase findings");
          const correctedAssembly = await assembleArea(area, cwd, area.assembly, "assembly");
          if (correctedAssembly) throw new Error(correctedAssembly);
          result.findings = []; index = 0; continue;
        }
        event(area.id, step.id, "ready");
        index += 1;
    }
  };
  const tasks = plan.areas.map(async (area): Promise<AreaResult> => {
    const cwd = root + "-" + area.id;
    const notes: string[] = []; observations.set(area.id, notes);
    const result: AreaResult = { id: area.id, status: "blocked", branch: prefix + "/" + area.id, worktree: cwd, commit: "", summary: "", blockers: [], findings: [], observations: notes };
    try {
      const dependencies = await Promise.all(area.dependsOn.map((id) => completed.get(id)!));
      const blocked = dependencies.find((dependency) => dependency.status !== "ready");
      if (blocked) throw new Error("Dependency blocked: " + blocked.id);
      await serializeGit(async () => await gitAt(input.repoRoot, ["worktree", "add", "-b", result.branch, cwd, input.baseCommit]));
      for (const dependency of dependencies) await serializeGit(async () => await merge(cwd, dependency.commit));
      event(area.id, "setup", "running");
      const setupError = await runCommands(area.setup, cwd);
      if (setupError) throw new Error("Required setup failed before implementation: " + setupError);
      await statusPaths(area, cwd);
      event(area.id, "setup", "ready");
      const persona = await v7Persona(area.personaPath, "pro", "write");
      contexts.set(area.id, v7Agent(persona, "V7 implementer " + area.id, "Work only in " + cwd + ". Own only " + JSON.stringify(area.ownedPaths) + ". Never touch the user checkout or other worktrees. No Git, agents, workflows, audits, tests, screenshots or source discovery outside assigned needs. The engine has prepared this worktree and owns all setup/install and assembly/check commands. Do not run them. Use installed APIs/types; no source eval or smoke programs. Required framework compiler assistance for edited files is allowed once per changed revision. Return a brief structured AreaWork with observations separate from genuine blockers."));
      const work = await askWork(area, cwd, "Implement your area completely. Task: " + input.task + "\nShared contract: " + plan.sharedContract + "\nArea: " + area.title + "\n" + area.instructions + "\nInstruction files: " + JSON.stringify(input.instructionPaths) + "\nWorktree: " + cwd + "\nOwned paths: " + JSON.stringify(area.ownedPaths) + "\nReturn AreaWork; do not run assembly or QA.");
      result.summary = work.summary;
      if (work.blockers.length) throw new Error(v7BlockerText(work));
      const assemblyError = await assembleArea(area, cwd, area.assembly, "assembly");
      if (assemblyError) throw new Error(assemblyError);
      await runAreaPhases(area, cwd, result);
      result.commit = await commitArea(area, cwd);
      await serializeGit(async () => await merge(candidate, result.commit));
      result.status = "ready";
      event(area.id, "complete", "ready");
    } catch (error) {
      result.blockers.push(error instanceof Error ? error.message : String(error));
      event(area.id, "complete", "blocked");
    }
    results.set(area.id, result); resolveArea.get(area.id)!(result); return result;
  });
  const areas = await Promise.all(tasks);
  const blockers = areas.flatMap((area) => area.blockers.map((problem) => area.id + ": " + problem));
  phase("Assemble the integration candidate");
  if (!blockers.length) {
    event("candidate", "setup", "running");
    const setupError = await runCommands(plan.setup, candidate);
    if (setupError) blockers.push("Required candidate setup failed: " + setupError);
    else event("candidate", "setup", "ready");
    let globalIndex = 0;
    while (!blockers.length && globalIndex < plan.assembly.length) {
      const command = plan.assembly[globalIndex];
      for (;;) {
        const out = await execute(candidate, command.tool, command.args);
        if (out.exitCode === 0) break;
        const candidateDirty = await gitAt(candidate, ["status", "--porcelain=v1", "--untracked-files=all"]);
        if (candidateDirty) { blockers.push("Integrated assembly changed source before failing; retained for explicit ownership correction: " + candidateDirty); break; }
        const error = JSON.stringify(command) + "\n" + (out.stderr + out.stdout).slice(-18000);
        const candidateHead = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
        const unchangedOwners = new Set<string>();
        const corrections = await Promise.all(command.owners.map(async (id): Promise<string> => {
          const area = plan.areas.find((entry) => entry.id === id)!;
          const result = results.get(id)!;
          try {
            await serializeGit(async () => await merge(result.worktree, candidateHead));
            const before = await fingerprint(area, result.worktree);
            const fixed = await askWork(area, result.worktree, "Correct only your owned contribution to this blocking integrated assembly failure in " + result.worktree + ". Other named owners correct their disjoint paths concurrently. No audits, tests, Git or unrelated fixes.\n" + error + "\nReturn AreaWork.");
            if (fixed.blockers.length) return id + ": " + v7BlockerText(fixed);
            if (await fingerprint(area, result.worktree) === before) { unchangedOwners.add(id); return ""; }
            const localError = await assembleArea(area, result.worktree, area.assembly, "assembly");
            if (localError) return id + ": " + localError;
            result.commit = await commitArea(area, result.worktree);
            await serializeGit(async () => await merge(candidate, result.commit));
            return "";
          } catch (error) { return id + ": " + (error instanceof Error ? error.message : String(error)); }
        }));
        blockers.push(...corrections.filter((problem) => problem !== ""));
        if (blockers.length) break;
        if (unchangedOwners.size === command.owners.length) {
          const retry = await execute(candidate, command.tool, command.args);
          if (retry.exitCode !== 0) blockers.push("No changed progress correcting integrated assembly: " + (retry.stderr + retry.stdout).slice(-18000));
          break;
        }
        // Changed revisions invalidate only their own and consuming areas' requested evidence.
        const affected = new Set(command.owners);
        for (let size = -1; size !== affected.size;) {
          size = affected.size;
          for (const area of plan.areas) {
            const dependencies = [...area.dependsOn, ...(area.phases ?? []).flatMap((step) => step.dependsOn ?? [])];
            if (dependencies.some((id) => affected.has(id))) affected.add(area.id);
          }
        }
        const refreshed = new Map<string, Promise<string>>();
        const refresh = (id: string): Promise<string> => {
          const existing = refreshed.get(id); if (existing) return existing;
          const area = plan.areas.find((entry) => entry.id === id)!;
          const dependencies = [...area.dependsOn, ...(area.phases ?? []).flatMap((step) => step.dependsOn ?? [])].filter((entry) => affected.has(entry));
          const next = (async (): Promise<string> => {
            const failures = await Promise.all(dependencies.map(refresh));
            if (failures.some((error) => error !== "")) return id + ": upstream evidence refresh blocked";
            const result = results.get(id)!;
            try {
              const head = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
              await serializeGit(async () => await merge(result.worktree, head));
              result.findings = []; event(id, "evidence", "invalidated");
              const error = await assembleArea(area, result.worktree, area.assembly, "assembly");
              if (error) return id + ": " + error;
              await runAreaPhases(area, result.worktree, result);
              result.commit = await commitArea(area, result.worktree);
              await serializeGit(async () => await merge(candidate, result.commit));
              return "";
            } catch (error) { result.status = "blocked"; return id + ": " + String(error); }
          })();
          refreshed.set(id, next); return next;
        };
        blockers.push(...(await Promise.all([...affected].map(refresh))).filter((problem) => problem !== ""));
        globalIndex = -1; // earlier integrated evidence also refers to the old candidate revision
        break;
      }
      if (blockers.length) break;
      globalIndex += 1;
    }
  }
  const candidateCommit = (await gitAt(candidate, ["rev-parse", "HEAD"])).trim();
  const candidateStatus = await gitAt(candidate, ["status", "--porcelain=v1", "--untracked-files=all"]);
  if (candidateStatus) blockers.push("Integrated assembly changed tracked/untracked files; retained for explicit ownership correction: " + candidateStatus);
  try { await anchors(); } catch (error) { blockers.push("Delivery anchors changed; candidate retained: " + String(error)); }
  return { status: blockers.length ? "incomplete" : "complete", candidateBranch: branch, candidateWorktree: candidate, candidateCommit, areas, blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
}

const v7Result = await runV7(INPUT);
const v7Completion = { ...v7Result, personas: personaReport(), personaFindings };
report(v7Completion);
return v7Completion;
