
  await anchors();
  const configuratorPersona = await v8Persona(input.skillRoot + "/personas/configurator.md", "pro", "read-only");
  const configurator = v8Agent(configuratorPersona, "V8 configurator", "Read-only configuration. Inspect only necessary task sources and supplied instructions. Do not read engine/helper/API sources or other workflow directories. Return configuration data only; no scripts, edits, Git mutations, tests, nested agents or workflows.");
  const configurationPrompt = [
    "Configure one thin per-area pipeline for this task. Return RunPlan only. Task: " + input.task,
    "Repository: " + input.repoRoot + "\nInstruction paths: " + JSON.stringify(input.instructionPaths),
    "RunPlan: {sharedContract:string,areas:AreaPlan[],setup:CommandPlan[],assembly:CommandPlan[],blockers:string[],notes:string[]}. Keep sharedContract, assignments and notes brief; reference the task instead of rewriting it or producing implementation pseudocode.",
    "Selected pieces: " + JSON.stringify(input.pieces) + ". Configure every selected verification kind in area.phases; unselected kinds are rejected. Mode: " + input.mode,
    "Use actual agent definitions (.zcode/agents/*.md or supplied personas), never .agents/skills/*/SKILL.md. All command owners including setup/assembly must be nonempty unique exact declared area IDs, never engine/global. Fix every instance of a named schema error using existing facts. Account for dependency-generated tracked files in ownedPaths and avoid unrooted data/ ignore patterns.",
    "An area may set role:'verify' to consume finished implementation areas through dependsOn, merge them into its own worktree, assemble/start a preview then perform requested browser/audit/device checks without any writer. Own only its separate evidence/helpers namespace, and do not assign repair authority to verify areas: report actionable defects instead. Put independent local unit tests/audits on their owning area so they start as soon as it is assembled, while unrelated writers continue. Integrated QA/audit verification areas depend on all actual app inputs; no cyclic phase dependencies.",
    "Each phase uses a selected kind (unit-tests, audit, browser, native-vision, mobile-vision), commands, optional personaPath, instructions citing explicit authority, and cleanup commands. Browser/device checks require a persona, exclusive resource, owned start/readiness/capture commands and cleanup that succeeds even after failure. Browser actors receive already-running loopback preview, isolated session, criteria/viewports and ignored evidence path. Native/mobile capture releases its device before separate Flash HIGH interpretation. No infrastructure stage is silently assumed; required helper scripts must be assigned to an implementation owner. Honor selection round policies and repair scope.",
    "Planning-only: return the requested compact plan in notes, with areas/setup/assembly empty. No mutation or writer dispatch. The planning piece reuses this one clean-context configurator; it is not a second planning handoff.",
    "AreaPlan: {id,title,personaPath (absolute specialist file),role?:'implement'|'verify',ownedPaths (safe relative files/directories, disjoint; directory trailing slash accepted),dependsOn (area IDs genuinely required BEFORE implementation),instructions,setup:CommandPlan[],assembly:CommandPlan[],phases?:AreaPhase[]}.",
    "CommandPlan: {tool:string,args:string[],owners:string[]}; name existing setup/build commands, no inline eval code, shell programs, Git, nested workflows or cwd arguments. Test runners, HTTP assertions, CRUD/persistence smokes and browser probes are checks even without test files; never relabel them assembly. Include them only in expressly authorized optional phases. Honor explicit user overrides of TASK.md/project check requirements.",
    "AreaPhase: {id,kind:'unit-tests'|'audit'|'browser'|'native-vision'|'mobile-vision',commands:CommandPlan[],personaPath?:string,instructions?:string,dependsOn?:string[],resource?:string,fixFindings?:boolean,cleanup?:CommandPlan[]}. Optional test/vision/audit phases MUST cite explicit user/project authorization in instructions; omit by default. Set fixFindings true ONLY with explicit authorized fixes, also cited there. Phase dependencies delay only that phase, not implementation. Resources name actual exclusive capture/device steps; release before separate image judgment. Read-only phase actors report findings, never edit source.",
    "Implementation dependsOn must reflect missing implementation inputs, never a later check/build. Agree the API/types in sharedContract so independent writers start together. A project-wide check/build that needs both areas belongs in global assembly, not an implementation dependency. Do not make frontend wait for backend merely because svelte-check or a build covers both.",
    "Every area and candidate have separate worktrees. Area setup runs before its writer, concurrently with other areas: declare required dependency/tool setup there so installed types are available during implementation. RunPlan.setup prepares the merged candidate before integration assembly. Never share writable node_modules. Setup failures stop only their consumers. Do not put the same setup command in assembly; if the task changes dependencies, declare its appropriate post-edit resolution command and owned lockfile explicitly. Use frozen lockfile setup when compatible with the task.",
    "The engine owns setup, dependency installation, project-wide checking/building and optional checks. Writers own implementation only; do not tell them to run any of those commands. Mandatory framework compiler assistance on changed files is implementation tooling, not an extra clean round. No HTTP/CRUD/persistence smokes or ad hoc inline programs in a writer task. Explicit scope overrides persona/skill check recommendations.",
    "Each area implements, immediately runs its assembly and authorized phases, and completes independently; do not impose a whole-app barrier. Global assembly only for a real integration join. Minimal scope, persistent specialist per area, no plan review."
  ].join("\n");
  let plan: RunPlan | undefined;
  let configurationError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const proposed = await guardWrites(configuratorPersona, input.repoRoot, async () => await configurator.ask<RunPlan>(configurationPrompt + (configurationError ? "\nCorrect only the invalid configuration fields in your previous RunPlan. Keep the same task scope and independent areas; no fresh exploration or plan review. Validator: " + configurationError : "")));
    try { v8ValidatePlan(proposed, input); plan = proposed; break; }
    catch (error) {
      configurationError = error instanceof Error ? error.message : String(error);
      report({ area: "configuration", step: "validation", status: attempt === 0 ? "retrying" : "blocked", message: configurationError });
    }
  }
  await anchors();
  if (!plan) return { status: "incomplete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: ["Invalid configuration after one correction: " + configurationError], notes: [], callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };
  if (input.mode === "plan" || plan.blockers.length || !plan.areas.length) return { status: plan.blockers.length ? "incomplete" : "complete", candidateBranch: "", candidateWorktree: "", candidateCommit: "", areas: [], blockers: plan.blockers, notes: plan.notes, callerStartedAt: input.startedAt, firstImplementationAt, completedAt: await timestamp() };

  throw new Error("Planning-only source cannot dispatch implementation");
}

const v8Result = await runV8(INPUT);
const v8Completion = { ...v8Result, personas: personaReport(), personaFindings };
report(v8Completion);
return v8Completion;
