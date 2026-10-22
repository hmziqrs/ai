---
name: z-workflow-v4
description: >-
  Use when the user requests z-workflow-v4. Fast standalone ZCode execution with
  parallel per-area state machines, a delegated thin plan, minimal main-thread context,
  and complete requested scope. Plan audits, product audits, QA and tests are opt-in.
---

# z-workflow-v4

## Three hard rules

1. **Parallelization per area state machine.** Start each area's ready work immediately.
   Wait only for an actual input, overlapping write, Git mutation or exclusive device.
   Independent implementation and authorized fixes stay parallel; never put every area
   behind a shared plan, review or testing barrier merely for convenience.
2. **Keep the main thread small.** Delegate source inspection, thin planning, authoring and
   implementation. The coordinator keeps only task/permissions, anchors, paths, states,
   missing decisions and compact reports. It launches, routes and delivers; it does not
   re-explore source or duplicate workers' work.
3. **Speed and completeness over perfection.** Finish the requested behavior and hand off
   the result. Do not manufacture polish, extra requirements, audits or repair campaigns.
   Report what was actually assembled and what was not checked. Completeness means the
   user's scope is delivered, not that the agent has proved the absence of every bug.

V4 is independent of original/V2/V3 policy. It owns its local personas, references, canonical
kit copy and model helper. No inherited router, review ladder, saved engine or fixed task
template. Load ZCode's current `dynamic-workflows` contract for API/compile/lifecycle rules;
its example review pipelines do not override the user's explicit V4 scope policy. Follow
applicable project instructions and actual tool permissions. Bun and Git are runtime needs.

## Thin preparation, then implement

- The coordinator captures absolute repo root, HEAD/full branch ref, dirty status, verbatim
  task, instruction paths and delivery preference, then delegates. It does not inspect app
  source/manifests, inventory dependencies or pre-plan the implementation for the author.
  Assign one persistent local [author](personas/author.md) on Pro HIGH. Its compact plan is
  deliverables, owners/paths, the necessary shared contract and actual dependency edges;
  it can live in the dispatch/report, without a separate plan document.
  **Do not audit, critique or approve the plan. Start implementation.**
- The author reads only enough shared facts to dispatch independent areas. Reuse supplied
  contracts, scaffold and known facts; resolve a concrete uncertainty instead of repeating
  a full inventory. Implementers inspect their own source and relevant framework references.
  No implementation pseudocode, separate planner/writer handoff or orchestration design phase.
- Optional [Flash scout](personas/explorer.md) handles a consequential bounded lookup at
  LOW; independent questions start together. Author consumes all returned findings. No
  mandatory scout, inventory, PRD or framework migration. HIGH is for analysis, not retrieval.
- Use native Agent if its documented arguments support the selected persona and explicit
  thinking. Otherwise write a fresh preparation **body** with one author ask and a returned
  draft path. Assemble it with the command below; do not recreate the kit or a preparation
  supervisor. If a compiler defect requires another ask, amend this workflow with targeted
  feedback to the same author, retaining its settled work. Do not invent Agent arguments
  or assume prompt text overrides MAX defaults.
- Bootstrap once if the project is empty; reuse an existing runnable scaffold. Agree only
  the shared contract needed to let independent consumers proceed. Derive areas from the
  stack: web API/UI, native logic/views, platform integration, or independent modules.
- Read [execution](references/execution.md) when authoring; resolve required expertise via
  [specialists](references/specialists.md). Add further stages/architecture only when the
  user explicitly requests them. Ordinary dependencies and safe file ownership still apply.
- Give the author absolute paths to V4's own [API facade](references/platform-facade.d.ts)
  and execution reference. A skill loaded by the coordinator is not automatically available
  in a subagent's context. Use these local references directly; do not search sibling workflow
  skills for API documentation or examples. For a missing live API detail, pass its actual
  bundled reference path or the relevant excerpt instead of sending the author to discover it.
- Write only the task-specific body in a run-owned draft directory. Mechanically attach the
  unchanged local helpers and check the result with one command:
  `bun --no-env-file --config=/dev/null <skillRoot>/scripts/assemble-script.ts <body.ts> <workflow.dwf.ts>`.
  It copies source bytes and invokes the existing checker once; it cannot plan or execute
  work. Do not read/retype helper or checker implementations merely to assemble a draft.
  Submit the resulting file with `CreateWorkflow({ path: <workflow.dwf.ts>, ... })` through
  the normal permission flow; accept the author's successful check without repeating it.
  Do not read the script back and reproduce it inline. Fix exact compiler
  defects in the body, reassemble and resubmit, without plan review or blanket regeneration.

## Execution policy

Each area advances independently: `ready → implementing → assembling → done`. An actual
missing input is `waiting`; an unresolved execution failure is `blocked`. An area becoming
ready starts without waiting for others' unrelated stages. Integration consumes compatible
outputs, serializes Git, and returns requested cross-area wiring to its owners. The exact
mechanics, scope of checks and failure handling are in the execution reference.

**Default: no product tests, QA, screenshots, audits, tracers, judges, confirmers or bug hunts.**
A thin plan is followed by implementation and assembly, not a newly named verification phase.
Run the build/package command needed to produce a requested runnable artifact; do not treat
that as permission to add unit suites, browser walks, matrices or production smoke campaigns.
If the user specifically requests checks, run that scope concurrently where independent.
An explicit applicable project-mandated check is reported and followed; do not invent one.

Do not fix incidental bugs unless requested. Correct your own blocking compile/wiring mistakes
as part of completing the original assignment; an app that cannot assemble is not a finished
implementation. A known failure of an expressly requested feature cannot be silently marked
done: finish that feature or report it incomplete. Independent areas continue while one is
blocked. Other observations go in the handoff, without starting a repair loop or broadening
ownership. Audit/test-only requests report findings and do not become implementation tasks.

Pro HIGH performs authoring and implementation. Flash LOW is explicitly selected only for
bounded read-only retrieval; use Flash HIGH when actual analysis is needed. No role inherits
MAX. Use the unchanged local [persona kit](persona-kit.dwf.ts) and
[model helper](model-policy.dwf.ts): `v4Persona(path, tier, access, options?)`, then `v4Agent`.
Options `{thinking: "low"}` are restricted to read-only Flash. MAX is optional only for a
user-authorized reasoning correction after two completed unsuccessful HIGH corrections on
that same criterion, with evidence and authorization recorded. Never create correction rounds
just to qualify for MAX, and never use it for missing tools, permissions or external inputs.

## Handoff

Stop after the requested work is assembled/integrated and any expressly requested checks
have run. No mandatory second clean pass. Reuse existing evidence when inputs are unchanged;
committing alone does not invalidate it. Keep partial work and report actual blockers.
Completion is scope-based, not a promise of perfection: distinguish implemented, assembled,
explicitly checked, untested and deferred observations. No estimated durations or deadlines.
Record actual preparation/first-runnable/completion times when useful or requested, starting
at the user request rather than a later script stamp. Include coordinator preparation and
cancelled attempts; distinguish waiting from actor execution. Keep full logs in run artifacts.

Preserve the user's checkout and use the execution reference's guarded delivery. Do not push,
weaken protections to make a check pass, delete work, deploy or publish without authorization.
Return delivered paths/branch, assembly result, requested checks and failures, known deferred
observations, actual selected models/thinking and work retained. Do not launch follow-up
workflows or monitor another session without the user's instruction.
