---
name: z-workflow-v7
description: >-
  Use when the user requests z-workflow-v7. A maintained flat ZFlow engine runs independent
  area pipelines with early setup, persistent HIGH specialists and local completion recovery.
  Product audits, QA, tests and vision are opt-in.
---

# z-workflow-v7

V7 is an independent numbered experiment. Its engine consumes task data; no model writes
per-task orchestration code. Preserve original/V2/V3/V4/V5/V6 and use a new number for later
behavior changes. The local persona kit stays byte-identical to the canonical v4 kit.

## Three priorities

1. **Parallel per-area state machines.** Each area's setup, implementation, assembly and
   requested phases advance independently. Wait only for real inputs, conflicting writers,
   serialized Git or exclusive devices. No global phase admission barrier or native
   channel/future consumers. The earlier channel restoration stalled ZCode's analyzer.
2. **Small main thread.** The coordinator supplies task/instruction paths, launches and
   delivers. One delegated configurator gathers the minimal shared facts. Persistent
   specialists inspect their own areas; the coordinator does not duplicate exploration.
3. **Speed and completeness over perfection.** Finish and assemble the requested output.
   Audits, QA, tests, screenshots, vision and incidental fixes require explicit scope.
   Correcting own blocking implementation mistakes remains part of completing the task.
   No complexity classification, estimates, plan audit or mandatory extra clean rounds.

## Launch

1. Load ZCode's current `dynamic-workflows` skill for the CreateWorkflow contract. Its
   example audit chains do not expand this task. Write request JSON under the project's
   ignored `.zcode/workflow-drafts/`: absolute `repoRoot`, verbatim `task`, absolute
   `instructionPaths`, and optional `startedAt` using the actual user-message timestamp
   when available. A later clock reading must be labeled launcher start, not user request.
2. Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request.json> <run.dwf.ts>`.
   It captures clean HEAD/full branch ref, inserts JSON into unchanged engine/helpers and
   checks the file once. It executes no model or product work. Bun and Git are required.
3. Submit `CreateWorkflow` with `path` pointing at the prepared file. Follow the harness's
   permission flow; Full access may still leave CreateWorkflow under `tool.alwaysAsk`.
   Distinguish waiting for approval from execution/compilation in timing reports. Do not
   emit the source inline, inspect engine internals to fill task data, use SaveWorkflow,
   read another workflow version or generate replacement orchestration.
4. The engine's local [configurator](personas/configurator.md) returns one thin RunPlan.
   Ready areas start within the same run; no author handoff, plan review or approval stage.

The reusable engine/helper exception applies only to explicitly selected V7 runs. Keep
runtime copies in run-owned drafts, not a retired legacy workflow installation path.

## Configuration and execution

Gather only enough facts for deliverables, specialist paths, disjoint ownership, a small
shared contract, actual dependencies and necessary commands. Reuse scaffolds/contracts.
Assignments reference the task rather than restating it. Batch independent retrieval.
Do not split writing areas merely to raise agent count; shared files retain one owner.
For planning-only requests return the thin plan in notes with no writers or worktrees.

`AreaPlan.setup` prepares that area's own worktree **before** its implementer starts;
other areas continue while it runs. Install required dependencies there so the writer can
read installed types/APIs. `RunPlan.setup` prepares the merged candidate before integrated
assembly. Never share writable node_modules. When the requested task changes dependencies,
declare the appropriate post-edit resolution command and lockfile ownership explicitly.
Setup failures stop affected work without a speculative model correction campaign.

Implementation dependencies are genuinely missing implementation inputs. A project-wide
check/build belongs at integration and does not delay an independent writer. Each area
advances through local assembly and only its authorized optional phases. Resources cover
actual exclusive capture; release the device before separate image interpretation.

The engine owns setup/install, project-wide check/build and optional test/QA/device commands.
This division applies to initial work and corrections. Writers read/edit assigned source;
framework-required compiler assistance on edited files is allowed during implementation.
Do not repeat passed checks without a source change or recheck while clarifying a report.
HTTP/CRUD/persistence smokes are tests even without test files. Explicit user exclusions
supersede broader persona/skill recommendations. Agent runtime tools are shared: these are
explicit actor instructions, not a claimed per-agent tool sandbox. Assembly validation
rejects inline programs, shell wrappers and direct test runners.

## Completion and local recovery

Writers return brief structured AreaWork: `status` (`implemented` or `blocked`),
`changedPaths`, `summary`, `blockers` (`{kind,detail}` objects), and `observations`.
A blocker is a concrete unmet input, permission, environment or implementation requirement
preventing completion. Deferred engine checks, excluded tests, assumptions and residual
risks are observations. The engine runs assembly before deciding that an area is ready.

Ordinary implemented results require no review/confirmation ask. A malformed or contradictory
completion report gets one format/classification clarification in the same actor: no tools,
edits, exploration or repeated checks. A second invalid report ends that area incomplete.
Genuine blockers remain blockers; never discard one using a string-matching heuristic.
Configuration similarly normalizes harmless directory slashes and gets one targeted schema
correction on invalid fields, before writers. These are error recovery, not plan audits.

Required assembly corrections return to the persistent owner. Independent corrections stay
concurrent. Stop incomplete on an external blocker, no viable correction or no changed
progress; no numeric product correction cap or mandatory extra clean round. Preserve partial
work. The [engine contract](references/engine-contract.md) covers ownership and Git invariants.

For an unexpected local engine error, inspect recorded results and use AmendWorkflow with
an authorized run-owned repair, preserving unchanged ask prefixes for cached replay. Leave
installed numbered skills unchanged; reusable fixes belong in the next version.

## Models and delivery

Configuration and implementation use Pro HIGH with appropriate project/domain personas.
Requested image interpretation uses Flash HIGH. Bounded read-only Flash LOW retrieval is
optional. MAX is never automatic: the local helper requires explicit correction scope and
two completed failed HIGH corrections on the same reasoning criterion. No new global agents.

The engine returns a clean integration candidate; the coordinator alone may deliver with
an ordinary guarded fast-forward after checking destination HEAD/full branch ref and both
worktrees' cleanliness. Respect review-first/no-merge instructions. No reset, clean, force,
push or deploy. Do not repeat successful gates for delivery.

Report a brief outcome from engine evidence: actual timings, model selections, implemented
scope, checks actually run, observations and retained incomplete work. Write the detailed
report once; do not ask every worker to repeat file inventories or task requirements.
Do not launch extra benchmarks or monitor other sessions unless the user requests it.
