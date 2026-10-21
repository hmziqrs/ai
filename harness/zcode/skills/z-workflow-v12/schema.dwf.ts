// zflow-v12: fixed per-area pipeline; task configuration is data, never authored code.
interface RunInput {
  repoRoot: string; task: string; baseCommit: string; branchRef: string;
  startedAt: string; skillRoot: string; instructionPaths: string[];
  mode: "execute" | "plan"; pieces: PieceSelection[]; plan: RunPlan; workspaceRoot?: string;
  requirements?: { minimumAreas?: number; areaCounts?: Record<string, number> };
}
interface PieceSelection { name:string;authorization:string;mode:"once"|"rounds"|"until-clean";rounds:number;fixFindings:boolean }
interface CommandPlan { tool: string; args: string[]; owners: string[] }
interface AreaPhase {
  id: string; kind: "unit-tests" | "tui-tests" | "audit" | "browser" | "web-vision" | "native-vision" | "mobile-vision";
  commands: CommandPlan[]; personaPath?: string; instructions?: string;
  dependsOn?: string[]; resource?: string; fixFindings?: boolean; cleanup?: CommandPlan[];
}
interface AreaPlan {
  id: string; title: string; personaPath: string; domain?: string; ownedPaths: string[]; role?: "implement" | "verify";
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
interface RunResult { status: "complete" | "incomplete"; candidateBranch: string; candidateWorktree: string; candidateCommit: string; areas: AreaResult[]; blockers: string[]; notes: string[]; callerStartedAt: string; firstImplementationAt: string; completedAt: string; retainedBranches: string[] }

function v12SafePath(path: string): boolean {
  return typeof path === "string" && path !== "" && !path.startsWith("/") && !path.includes("\\") &&
    !/[\x00-\x1f\x7f]/.test(path) && path.split("/").every((p) => p !== "" && p !== "." && p !== ".." && p.toLowerCase() !== ".git");
}
// Engine command gates (install/build) regenerate dependency lockfiles; they belong to the
// owner of the manifest that generates them, so they never trip the ownership guard.
const LOCKFILES: Record<string, readonly string[]> = {
  "package.json": ["bun.lock", "bun.lockb", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
  "cargo.toml": ["cargo.lock"], "go.mod": ["go.sum"], "pyproject.toml": ["uv.lock", "poetry.lock"],
  "gemfile": ["gemfile.lock"], "composer.json": ["composer.lock"], "flake.nix": ["flake.lock"],
};
function v12Owns(area: AreaPlan, path: string): boolean {
  return v12SafePath(path) && (
    area.ownedPaths.some((root) => path === root || path.startsWith(root + "/")) ||
    area.ownedPaths.some((root) => LOCKFILES[root.toLowerCase()]?.includes(path) === true)
  );
}
function v12Require(condition: boolean, field: string, message: string): void {
  if (!condition) throw new Error(field + ": " + message);
}
function v12Strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}
function v12ValidatePlan(plan: RunPlan, input: RunInput): void {
  v12Require(!!plan && typeof plan === "object" && !Array.isArray(plan), "RunPlan", "expected an object");
  v12Require(typeof plan.sharedContract === "string", "sharedContract", "expected a string");
  v12Require(Array.isArray(plan.areas), "areas", "expected an array");
  v12Require(v12Strings(plan.blockers), "blockers", "expected a string array");
  v12Require(v12Strings(plan.notes), "notes", "expected a string array");
  const ids = new Set<string>();
  const allPhaseIds = new Set<string>();
  for (const [index, area] of plan.areas.entries()) {
    const field = "areas[" + index + "]";
    v12Require(!!area && typeof area === "object" && !Array.isArray(area), field, "expected an area object");
    v12Require(typeof area.id === "string" && /^[a-z][a-z0-9-]*$/.test(area.id) && !ids.has(area.id), field + ".id", "expected a unique lowercase area ID");
    ids.add(area.id);
    v12Require(area.domain === undefined || (typeof area.domain === "string" && /^[a-z][a-z0-9-]*$/.test(area.domain)), field + ".domain", "expected a lowercase domain label");
    v12Require(typeof area.personaPath === "string" && area.personaPath.startsWith("/"), field + ".personaPath", "expected an absolute specialist path");
    v12Require(typeof area.title === "string" && !!area.title.trim(), field + ".title", "expected a nonblank string");
    v12Require(typeof area.instructions === "string" && !!area.instructions.trim(), field + ".instructions", "expected a nonblank string");
    v12Require(Array.isArray(area.ownedPaths) && area.ownedPaths.length > 0, field + ".ownedPaths", "expected nonempty relative file/directory paths");
    area.ownedPaths = area.ownedPaths.map((path, pathIndex) => {
      // A single trailing slash is ordinary directory notation, not a traversal.
      const normalized = typeof path === "string" ? path.replace(/\/$/, "") : path;
      v12Require(v12SafePath(normalized), field + ".ownedPaths[" + pathIndex + "]", "unsafe relative path " + JSON.stringify(path));
      return normalized;
    });
    v12Require(v12Strings(area.dependsOn), field + ".dependsOn", "expected area IDs as a string array");
    v12Require(area.phases === undefined || Array.isArray(area.phases), field + ".phases", "expected an array");
    const phaseIds = new Set<string>();
    for (const [phaseIndex, step] of (area.phases ?? []).entries()) {
      const phaseField = field + ".phases[" + phaseIndex + "]";
      v12Require(!!step && typeof step === "object" && !Array.isArray(step), phaseField, "expected a phase object");
      v12Require(typeof step.id === "string" && /^[a-z][a-z0-9-]*$/.test(step.id) && !phaseIds.has(step.id), phaseField + ".id", "expected a unique lowercase phase ID");
      phaseIds.add(step.id);
      allPhaseIds.add(step.id);
      v12Require(["unit-tests", "tui-tests", "audit", "browser", "web-vision", "native-vision", "mobile-vision"].includes(step.kind) && input.pieces.some((piece) => piece.name === step.kind), phaseField + ".kind", "unsupported phase kind");
      v12Require(step.personaPath === undefined || (typeof step.personaPath === "string" && step.personaPath.startsWith("/")), phaseField + ".personaPath", "expected an absolute path");
      v12Require(step.instructions === undefined || typeof step.instructions === "string", phaseField + ".instructions", "expected a string");
      if (true) v12Require(typeof step.instructions === "string" && !!step.instructions.trim(), phaseField + ".instructions", "cite explicit check/fix authorization and actor instructions");
      v12Require(step.fixFindings === undefined || typeof step.fixFindings === "boolean", phaseField + ".fixFindings", "expected a boolean");
      v12Require(step.resource === undefined || (typeof step.resource === "string" && /^[a-z][a-z0-9-]*$/.test(step.resource)), phaseField + ".resource", "expected an exclusive resource ID");
      v12Require(step.dependsOn === undefined || v12Strings(step.dependsOn), phaseField + ".dependsOn", "expected area IDs as a string array");
    }
  }
  const checkCommands = (commands: CommandPlan[], field: string, assembly: boolean): void => {
    v12Require(Array.isArray(commands), field, "expected a command array");
    for (const [index, command] of commands.entries()) {
      const commandField = field + "[" + index + "]";
      v12Require(!!command && typeof command === "object" && !Array.isArray(command), commandField, "expected a command object");
      v12Require(typeof command.tool === "string" && /^[A-Za-z0-9_./+-]+$/.test(command.tool) && !/(^|\/)git$/.test(command.tool), commandField + ".tool", "expected an executable other than Git");
      v12Require(v12Strings(command.args) && command.args.every((arg) => !arg.includes("\0")), commandField + ".args", "expected string arguments without NUL");
      v12Require(v12Strings(command.owners) && command.owners.length > 0 && new Set(command.owners).size === command.owners.length && command.owners.every((id) => ids.has(id)), commandField + ".owners", "expected unique known area IDs");
      // Assembly is data naming existing setup/build commands, not newly authored check code.
      if (assembly) {
        const executable = command.tool.split("/").pop()!;
        const inlineCode = /^(?:bun|node|deno|python[0-9.]*)$/.test(executable) && command.args.some((arg) => /^(?:-e|-p|-c|--eval|--print|--command)(?:=|$)|^-[epc].+/.test(arg));
        const shell = /^(?:sh|bash|zsh|fish|dash)$/.test(executable);
        const testRunner = /^(?:bun|deno|cargo|go)$/.test(executable) && command.args[0] === "test";
        v12Require(!inlineCode && !shell && !testRunner, commandField, "assembly accepts setup/build commands, not inline scripts, shell programs or test runners; explicitly authorized checks belong in optional phases");
      }
    }
  };
  for (let i = 0; i < plan.areas.length; i++) {
    const area = plan.areas[i];
    checkCommands(area.setup, "areas[" + i + "].setup", true);
    checkCommands(area.assembly, "areas[" + i + "].assembly", true);
    for (const [index, step] of (area.phases ?? []).entries()) {
      // An audit phase may legitimately have no commands (persona judgment only); a missing
      // commands key normalizes to an empty array so the omission cannot fail assembly.
      if (step.commands === undefined) step.commands = [];
      checkCommands(step.commands, "areas[" + i + "].phases[" + index + "].commands", false);
      if (step.kind !== "audit") v12Require(step.commands.length > 0, "phase.commands", "requested behavior/capture checks need executable commands, not an empty pass; assign a committed helper script to a writer/helper owner area as its deliverable and reference it here");
      v12Require(step.cleanup === undefined || Array.isArray(step.cleanup), "areas[" + i + "].phases[" + index + "].cleanup", "cleanup is a CommandPlan[] array like {tool,args,owners}, never a string");
      checkCommands(step.cleanup ?? [], "areas[" + i + "].phases[" + index + "].cleanup", false);
      const selection = input.pieces.find((piece) => piece.name === step.kind)!;
      if (step.fixFindings && !selection.fixFindings) throw new Error("Unapproved repairs in " + step.id);
      if (step.kind === "browser" || step.kind === "tui-tests" || step.kind === "web-vision" || step.kind === "native-vision" || step.kind === "mobile-vision") {
        v12Require(!!step.personaPath && !!step.resource && (step.cleanup ?? []).length > 0, "phase lifecycle", "interactive/vision phases need persona, resource and owned cleanup commands");
      }
      if (step.kind !== "unit-tests") v12Require(!!step.personaPath, "phase.personaPath", "judgment needs a real specialist persona");
    }
    v12Require(area.role === undefined || ["implement", "verify"].includes(area.role), "area.role", "implement or verify only");
    if (area.role === "verify") v12Require((area.phases ?? []).length > 0, "area.phases", "verification areas need requested checks");
    for (let j = 0; j < i; j++) for (const a of area.ownedPaths) for (const b of plan.areas[j].ownedPaths) {
      if (a === b || a.startsWith(b + "/") || b.startsWith(a + "/")) throw new Error("Overlapping ownership: " + area.id + "/" + plan.areas[j].id + " at " + a + "/" + b);
    }
  }
  checkCommands(plan.setup, "setup", true);
  checkCommands(plan.assembly, "assembly", true);
  if (input.mode !== "plan") for (const selection of input.pieces) {
    if (selection.name !== "planning" && !plan.areas.some((area) => (area.phases ?? []).some((step) => step.kind === selection.name))) throw new Error("Requested piece omitted from configuration: " + selection.name);
  }
  if (input.mode === "plan") v12Require(plan.areas.length === 0 && plan.setup.length === 0 && plan.assembly.length === 0, "plan-only", "return the plan in notes without writers or commands");
  if (input.mode === "execute" && !plan.blockers.length) v12Require(plan.areas.some((a) => a.role !== "verify"), "areas", "execution needs an implementation owner or a concrete blocker");
  const writers = plan.areas.filter((a) => a.role !== "verify");
  if (input.mode !== "plan" && !plan.blockers.length) v12Require(writers.length >= (input.requirements?.minimumAreas ?? 2), "areas", "parallel-by-default execution needs at least " + (input.requirements?.minimumAreas ?? 2) + " implementation areas; split along real ownership seams, or set requirements.minimumAreas explicitly (with a justification note) when the task genuinely has one lane; verification areas do not count");
  for (const [domain, count] of Object.entries(input.requirements?.areaCounts ?? {})) if (input.mode !== "plan" && !plan.blockers.length) v12Require(writers.filter((a) => a.domain === domain).length >= count, "requirements.areaCounts." + domain, "not enough implementation owners in this domain");
  for (const a of plan.areas) {
    if (a.role === "verify") v12Require(!(a.phases ?? []).some((s) => s.fixFindings), "verify.fixFindings", "read-only verification cannot authorize product edits — drop role:'verify' from this area so it may hold the authorized repairs, or remove fixFindings and report findings only");
    if (input.pieces.some((s) => s.name === "audit" && s.mode !== "until-clean")) v12Require((a.phases ?? []).filter((s) => s.kind === "audit").length <= 1, "audit scope", "one audit step per area per requested round, not duplicate audits");
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (id: string): void => {
    if (!ids.has(id)) throw new Error("Unknown dependency: " + id + (allPhaseIds.has(id) ? " — phase dependsOn accepts area IDs only; phases run in their array order within an area, so order sibling checks by position instead" : ""));
    if (visiting.has(id)) throw new Error("Dependency cycle: " + id);
    if (visited.has(id)) return;
    visiting.add(id);
    const area = plan.areas.find((a) => a.id === id)!;
    for (const dependency of [...area.dependsOn, ...(area.phases ?? []).flatMap((p) => p.dependsOn ?? [])]) visit(dependency);
    visiting.delete(id); visited.add(id);
  };
  for (const area of plan.areas) visit(area.id);
}

function v12ValidateWork(work: AreaWork): void {
  v12Require(!!work && typeof work === "object" && !Array.isArray(work), "AreaWork", "expected an object");
  v12Require(work.status === "implemented" || work.status === "blocked", "AreaWork.status", "expected implemented or blocked");
  v12Require(v12Strings(work.changedPaths), "AreaWork.changedPaths", "expected a string array");
  v12Require(typeof work.summary === "string" && !!work.summary.trim(), "AreaWork.summary", "expected a brief concrete result");
  v12Require(v12Strings(work.observations), "AreaWork.observations", "put deferred checks, assumptions and residual risks here");
  v12Require(Array.isArray(work.blockers), "AreaWork.blockers", "expected actionable blocker objects, not observations or prose strings");
  for (const blocker of work.blockers) {
    v12Require(!!blocker && typeof blocker === "object" && !Array.isArray(blocker) &&
      ["input", "permission", "environment", "implementation"].includes(blocker.kind) &&
      typeof blocker.detail === "string" && !!blocker.detail.trim(), "AreaWork.blockers", "each blocker needs kind and a concrete unmet requirement in detail; deferred engine checks are observations");
  }
  v12Require(work.status === "blocked" ? work.blockers.length > 0 : work.blockers.length === 0,
    "AreaWork.status/blockers", "implemented requires empty blockers; blocked requires an actionable unmet requirement");
}
function v12BlockerText(work: AreaWork): string {
  return work.blockers.map((blocker) => blocker.kind + ": " + blocker.detail).join("\n");
}

