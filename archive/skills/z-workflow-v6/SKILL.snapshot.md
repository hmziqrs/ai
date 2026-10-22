---
name: z-workflow-v6
description: >-
  Use when the user requests z-workflow-v6. A pretested ZFlow engine consumes task data:
  one delegated configurator, persistent specialists and independent per-area state machines.
  Ready areas advance across phases without waiting for unrelated areas. Audits and QA are opt-in.
---

# z-workflow-v6

V6 uses the verified flat per-area scheduler as an independent opt-in experiment.
The engine is maintained and tested once; each run supplies data. No per-task script author,
generated scheduler, plan audit or saved-workflow registration. Original/V2/V3/V4/V5 stay unchanged. New engine/policy changes get a new numbered version.
Each area runs in one awaited async task and advances through only its selected phases.
There are no channel consumers or concurrent feedback queues. Backend areas omit visual
phases when they have no visual assignment. Do not recreate seven phase labels as scheduler
loops: the historical channel restoration stalled ZCode during CreateWorkflow analysis.

## Three priorities

1. **Per-area state machines.** Start ready work and advance that area immediately. Area A
   may be checking while B implements and C corrects. Await only a declared input, conflicting
   writer, Git mutation or exclusive device. A final join is for delivery, not stage admission.
2. **Small main thread.** The coordinator passes the task and instruction paths, prepares one
   launch file, launches and delivers. Source discovery and compact task configuration belong
   to the delegated configurator. Do not duplicate its exploration.
3. **Speed and completeness over perfection.** Implement and assemble the requested output.
   Tests, QA, vision, screenshots, audits and incidental bug fixes require explicit scope.
   Completing own blocking implementation mistakes remains part of the requested work.

## Launch

1. Load the current ZCode `dynamic-workflows` skill for its CreateWorkflow tool contract.
   Do not copy its example audit pipelines into this task. Write a small request JSON file
   under the project's run-owned `.zcode/workflow-drafts/` directory containing:
   `repoRoot` (absolute), `task` (verbatim), `instructionPaths` (absolute paths), and optional
   `startedAt` (the actual user-request timestamp when available). No plan or source inventory.
2. Run:
   `bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request.json> <run.dwf.ts>`.
   It captures clean checkout anchors, copies the unchanged local engine/helpers, inserts only
   JSON data and checks the launch file once. It performs no model call or product work.
   A missing timestamp means launcher start, not the original user request.
3. Submit `CreateWorkflow` using `path` pointing at that launch file and a descriptive name.
   Follow the normal permission flow. Do not echo the script inline, read its implementation
   to fill the request, register it with SaveWorkflow, or generate replacement TypeScript.
If a launched run errors in engine code, inspect its recorded failure and completed results.
For an authorized local repair, use `AmendWorkflow` with the run-owned draft and preserve
unchanged ask prefixes so completed work can replay from cache. Do not rerun the entire task
or weaken validation. Keep installed/versioned skills unchanged; propose fixes in the next
numbered version.

4. The engine delegates exploration/configuration to the local
   [configurator](personas/configurator.md), which returns one compact typed manifest.
   This happens inside the same run. It then starts ready specialist areas; no second
   preparation workflow, author handoff, plan review or main-thread approval of the plan.

The fixed engine and local model policy are the V6 exception to the fresh-script rule.
Keep the engine inside this skill, not at the retired `.zcode/workflows/zflow-engine.dwf.ts`
path. Runtime artifacts are run-owned copies, not new reusable engines.

## Task configuration

Only discover facts needed to identify deliverables, specialist paths, ownership, a minimal
shared contract, real dependencies and requested assembly/check commands. An existing
scaffold and task-supplied API contract are inputs to reuse. Implementers inspect their own
area code and relevant framework skills. No file-count router, speculative architecture,
full inventory, separate plan document or implementation pseudocode.
For a planning-only task, the configurator returns its plan without starting writing areas.

Area transitions and optional checks are data handled by the maintained engine. An area's
next requested phase begins when its own inputs exist, even while another area implements.
Declare additional dependencies only for the phase that actually needs them. Backend API
checks and frontend work can overlap; browser work waits for a backend only if it consumes it.
Independent fixes stay concurrent. A shared build waits for its actual contributing areas.

No checks are inferred from words such as "complete" or "polished". Preserve explicit project
requirements and user overrides. A request for an audit alone produces findings, not repairs.
Optional phases must name their authority and concrete resource needs. Use separate capture
and image-reading steps so an image-reading model does not hold an exclusive device.

Configuration normalizes a single trailing directory slash, then checks exact fields and
ownership overlap. A malformed manifest gets one targeted correction using the same actor;
a second invalid result returns incomplete before any worktree or writer. This is schema
recovery, not a plan audit. Valid .gitignore and .github paths remain allowed. Assembly names
existing setup/build commands; inline scripts, shell programs and direct test runners belong
in explicitly authorized optional phases. HTTP/CRUD/persistence smokes count as tests.

## Models and ownership

Configuration and implementation use Pro HIGH with the correct local/domain personas.
Requested image interpretation uses Flash HIGH. No automatic MAX or speed-based model
downgrade. Bounded read-only Flash LOW retrieval is optional, never an extra mandatory stage.
The local model helper retains the requirement for explicit correction scope and two failed,
completed HIGH corrections on the same reasoning criterion before any targeted MAX selection.

One persistent implementer owns each writing area, including its blocking corrections.
Engine code owns Git and integration; actors do not spawn agents/workflows or mutate Git.
Concurrent writers use separate worktrees and writable local dependency/generated-file
locations. Do not share an entire node_modules directory through a symlink. Shared manifests
have one owner. Serialize only the resource actually contested, not every downstream phase.

## Completion

The engine retains partial work and returns a run-owned integration candidate. No numeric
correction cap and no mandatory extra clean pass: stop incomplete on an external blocker,
no viable correction or no changed progress. Do not repeat unchanged successful checks.
The [engine contract](references/engine-contract.md) covers validation, state and delivery.

The coordinator alone may fast-forward the result after writers finish, the candidate is
complete/clean, and the user's checkout remains clean at the captured HEAD and full branch
ref. Respect no-merge/review-first instructions. Never reset, clean, force, push or deploy.
Report implemented/assembled work, checks actually run, deferred observations, retained paths,
models and actual timings. No estimates or claim that every possible bug has been eliminated.
Deliver the ready candidate before optional analysis. Use the returned evidence for a concise
completion report; do not inspect other runs to choose a report format or repeat passed gates.
Do not launch further benchmarks or monitor another session unless the user asks.
