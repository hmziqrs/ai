// zflow-v8: fixed per-area pipeline; task configuration is data, never authored code.
interface RunInput {
  repoRoot: string; task: string; baseCommit: string; branchRef: string;
  startedAt: string; skillRoot: string; instructionPaths: string[];
  mode: "execute" | "plan"; pieces: PieceSelection[];
}
interface PieceSelection { name:string;authorization:string;mode:"once"|"rounds"|"until-clean";rounds:number;fixFindings:boolean }
interface CommandPlan { tool: string; args: string[]; owners: string[] }
interface AreaPhase {
  id: string; kind: "unit-tests" | "audit" | "browser" | "native-vision" | "mobile-vision";
  commands: CommandPlan[]; personaPath?: string; instructions?: string;
  dependsOn?: string[]; resource?: string; fixFindings?: boolean; cleanup?: CommandPlan[];
}
interface AreaPlan {
  id: string; title: string; personaPath: string; ownedPaths: string[]; role?: "implement" | "verify";
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

function v8SafePath(path: string): boolean {
  return typeof path === "string" && path !== "" && !path.startsWith("/") && !path.includes("\\") &&
    !/[\x00-\x1f\x7f]/.test(path) && path.split("/").every((p) => p !== "" && p !== "." && p !== ".." && p.toLowerCase() !== ".git");
}
function v8Owns(area: AreaPlan, path: string): boolean {
  return v8SafePath(path) && area.ownedPaths.some((root) => path === root || path.startsWith(root + "/"));
}
function v8Require(condition: boolean, field: string, message: string): void {
  if (!condition) throw new Error(field + ": " + message);
}
function v8Strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function v8ValidatePlan(plan: RunPlan, input: RunInput): void {
  v8Require(!!plan && typeof plan === "object" && !Array.isArray(plan), "RunPlan", "expected an object");
  v8Require(typeof plan.sharedContract === "string", "sharedContract", "expected a string");
  v8Require(Array.isArray(plan.areas), "areas", "expected an array");
  v8Require(v8Strings(plan.blockers), "blockers", "expected a string array");
  v8Require(v8Strings(plan.notes), "notes", "expected a string array");
  const ids = new Set<string>();
  for (const [index, area] of plan.areas.entries()) {
    const field = "areas[" + index + "]";
    v8Require(!!area && typeof area === "object" && !Array.isArray(area), field, "expected an area object");
    v8Require(typeof area.id === "string" && /^[a-z][a-z0-9-]*$/.test(area.id) && !ids.has(area.id), field + ".id", "expected a unique lowercase area ID");
    ids.add(area.id);
    v8Require(typeof area.personaPath === "string" && area.personaPath.startsWith("/"), field + ".personaPath", "expected an absolute specialist path");
    v8Require(typeof area.title === "string" && !!area.title.trim(), field + ".title", "expected a nonblank string");
    v8Require(typeof area.instructions === "string" && !!area.instructions.trim(), field + ".instructions", "expected a nonblank string");
    v8Require(Array.isArray(area.ownedPaths) && area.ownedPaths.length > 0, field + ".ownedPaths", "expected nonempty relative file/directory paths");
    area.ownedPaths = area.ownedPaths.map((path, pathIndex) => {
      // A single trailing slash is ordinary directory notation, not a traversal.
      const normalized = typeof path === "string" ? path.replace(/\/$/, "") : path;
      v8Require(v8SafePath(normalized), field + ".ownedPaths[" + pathIndex + "]", "unsafe relative path " + JSON.stringify(path));
      return normalized;
    });
    v8Require(v8Strings(area.dependsOn), field + ".dependsOn", "expected area IDs as a string array");
    v8Require(area.phases === undefined || Array.isArray(area.phases), field + ".phases", "expected an array");
    const phaseIds = new Set<string>();
    for (const [phaseIndex, step] of (area.phases ?? []).entries()) {
      const phaseField = field + ".phases[" + phaseIndex + "]";
      v8Require(!!step && typeof step === "object" && !Array.isArray(step), phaseField, "expected a phase object");
      v8Require(typeof step.id === "string" && /^[a-z][a-z0-9-]*$/.test(step.id) && !phaseIds.has(step.id), phaseField + ".id", "expected a unique lowercase phase ID");
      phaseIds.add(step.id);
      v8Require(input.pieces.some((piece) => piece.name === step.kind), phaseField + ".kind", "unsupported phase kind");
      v8Require(step.personaPath === undefined || (typeof step.personaPath === "string" && step.personaPath.startsWith("/")), phaseField + ".personaPath", "expected an absolute path");
      v8Require(step.instructions === undefined || typeof step.instructions === "string", phaseField + ".instructions", "expected a string");
      if (true) v8Require(typeof step.instructions === "string" && !!step.instructions.trim(), phaseField + ".instructions", "cite explicit check/fix authorization and actor instructions");
      v8Require(step.fixFindings === undefined || typeof step.fixFindings === "boolean", phaseField + ".fixFindings", "expected a boolean");
      v8Require(step.resource === undefined || (typeof step.resource === "string" && /^[a-z][a-z0-9-]*$/.test(step.resource)), phaseField + ".resource", "expected an exclusive resource ID");
      v8Require(step.dependsOn === undefined || v8Strings(step.dependsOn), phaseField + ".dependsOn", "expected area IDs as a string array");
    }
  }
  const checkCommands = (commands: CommandPlan[], field: string, assembly: boolean): void => {
    v8Require(Array.isArray(commands), field, "expected a command array");
    for (const [index, command] of commands.entries()) {
      const commandField = field + "[" + index + "]";
      v8Require(!!command && typeof command === "object" && !Array.isArray(command), commandField, "expected a command object");
      v8Require(typeof command.tool === "string" && /^[A-Za-z0-9_./+-]+$/.test(command.tool) && !/(^|\/)git$/.test(command.tool), commandField + ".tool", "expected an executable other than Git");
      v8Require(v8Strings(command.args) && command.args.every((arg) => !arg.includes("\0")), commandField + ".args", "expected string arguments without NUL");
      v8Require(v8Strings(command.owners) && command.owners.length > 0 && new Set(command.owners).size === command.owners.length && command.owners.every((id) => ids.has(id)), commandField + ".owners", "expected unique known area IDs");
      // Assembly is data naming existing setup/build commands, not newly authored check code.
      if (assembly) {
        const executable = command.tool.split("/").pop()!;
        const inlineCode = /^(?:bun|node|deno|python[0-9.]*)$/.test(executable) && command.args.some((arg) => /^(?:-e|-p|-c|--eval|--print|--command)(?:=|$)|^-[epc].+/.test(arg));
        const shell = /^(?:sh|bash|zsh|fish|dash)$/.test(executable);
        const testRunner = /^(?:bun|deno|cargo|go)$/.test(executable) && command.args[0] === "test";
        v8Require(!inlineCode && !shell && !testRunner, commandField, "assembly accepts setup/build commands, not inline scripts, shell programs or test runners; explicitly authorized checks belong in optional phases");
      }
    }
  };
  for (let i = 0; i < plan.areas.length; i++) {
    const area = plan.areas[i];
    checkCommands(area.setup, "areas[" + i + "].setup", true);
    checkCommands(area.assembly, "areas[" + i + "].assembly", true);
    for (const [index, step] of (area.phases ?? []).entries()) {
      checkCommands(step.commands, "areas[" + i + "].phases[" + index + "].commands", false);
      checkCommands(step.cleanup ?? [], "areas[" + i + "].phases[" + index + "].cleanup", false);
      const selection = input.pieces.find((piece) => piece.name === step.kind)!;
      if (step.fixFindings && !selection.fixFindings) throw new Error("Unapproved repairs in " + step.id);
      if (step.kind === "browser" || step.kind === "native-vision" || step.kind === "mobile-vision") {
        v8Require(!!step.personaPath && !!step.resource && (step.cleanup ?? []).length > 0, "phase lifecycle", "browser/device phases need persona, resource and owned cleanup commands");
      }
      if (step.kind !== "unit-tests") v8Require(!!step.personaPath, "phase.personaPath", "judgment needs a real specialist persona");
    }
    v8Require(area.role === undefined || ["implement", "verify"].includes(area.role), "area.role", "implement or verify only");
    if (area.role === "verify") v8Require((area.phases ?? []).length > 0, "area.phases", "verification areas need requested checks");
    for (let j = 0; j < i; j++) for (const a of area.ownedPaths) for (const b of plan.areas[j].ownedPaths) {
      if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/")) throw new Error("Overlapping ownership: " + area.id + "/" + plan.areas[j].id + " at " + a + "/" + b);
    }
  }
  checkCommands(plan.setup, "setup", true);
  checkCommands(plan.assembly, "assembly", true);
  if (input.mode !== "plan") for (const selection of input.pieces) {
    if (selection.name !== "planning" && !plan.areas.some((area) => (area.phases ?? []).some((step) => step.kind === selection.name))) throw new Error("Requested piece omitted from configuration: " + selection.name);
  }
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

function v8ValidateWork(work: AreaWork): void {
  v8Require(!!work && typeof work === "object" && !Array.isArray(work), "AreaWork", "expected an object");
  v8Require(work.status === "implemented" || work.status === "blocked", "AreaWork.status", "expected implemented or blocked");
  v8Require(v8Strings(work.changedPaths), "AreaWork.changedPaths", "expected a string array");
  v8Require(typeof work.summary === "string" && !!work.summary.trim(), "AreaWork.summary", "expected a brief concrete result");
  v8Require(v8Strings(work.observations), "AreaWork.observations", "put deferred checks, assumptions and residual risks here");
  v8Require(Array.isArray(work.blockers), "AreaWork.blockers", "expected actionable blocker objects, not observations or prose strings");
  for (const blocker of work.blockers) {
    v8Require(!!blocker && typeof blocker === "object" && !Array.isArray(blocker) &&
      ["input", "permission", "environment", "implementation"].includes(blocker.kind) &&
      typeof blocker.detail === "string" && !!blocker.detail.trim(), "AreaWork.blockers", "each blocker needs kind and a concrete unmet requirement in detail; deferred engine checks are observations");
  }
  v8Require(work.status === "blocked" ? work.blockers.length > 0 : work.blockers.length === 0,
    "AreaWork.status/blockers", "implemented requires empty blockers; blocked requires an actionable unmet requirement");
}
function v8BlockerText(work: AreaWork): string {
  return work.blockers.map((blocker) => blocker.kind + ": " + blocker.detail).join("\n");
}

async function runV8(input: RunInput): Promise<RunResult> {
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
  const prefix = "z-v8/" + token;
  const root = input.repoRoot + "-zv8-" + token;
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
