---
name: z-workflow-v3
description: >-
  Use when the user requests z-workflow-v3. Standalone ZCode workflow for fast working
  results: compact Pro HIGH planning, parallel specialist implementation and corrections,
  concurrent verification and selective rechecks. Flash HIGH gathers evidence; targeted
  MAX requires two failed HIGH corrections. Retains original and V2 for comparison.
---

# z-workflow-v3

Optimize time to a runnable result and time from a demonstrated defect to its verified
fix. This folder owns its policy, personas, model helper and reference copies. Never load
another workflow's policies, author persona, router or engines. The external runtime is
ZCode's current `dynamic-workflows` platform API. Bun and Git are required for helpers.

## Prepare only what unlocks execution

1. Load the session's actual `dynamic-workflows` skill before submission. Read its facade,
   compile, typed-output and lifecycle requirements; bundled [API snapshot](references/platform-contract.md)
   and [patterns](references/patterns.md) are offline aids, not authority over a newer API.
   Read [execution](references/execution.md) and resolve [specialists](references/specialists.md).
2. Capture task text, absolute repo root, HEAD, full branch ref, dirty status, applicable
   instructions and delivery preference with compact commands. Keep task-source exploration
   delegated; the coordinator may inspect control data, scripts and reports. Respect project
   research restrictions, including exclusion of `research/` from unauthorized discovery.
3. Assign one persistent local [author](personas/author.md), Pro HIGH, to gather necessary
   facts, resolve specialists, plan and write one fresh execution script. The author combines
   synthesis and planning; do not dispatch separate planner/synthesizer/plan-attack roles.
   For independent consequential unknowns, dispatch bounded local [Flash scouts](personas/explorer.md)
   together. Pass every scout report to the author. No mandatory scout count, full-repo survey,
   PRD, exhaustive requirement trace, or small/complex router. A clear spec with a working
   scaffold needs little discovery. Bootstrap an empty project once before dependent writers.
4. Dispatch preparation through native Agent only if its actual supported arguments allow
   the selected persona body and explicit HIGH. Do not assume the source persona or a prompt
   overrides an inherited MAX setting. Otherwise author a minimal fresh preparation workflow
   using this folder's persona kit/model helper: needed scouts concurrently, then one author.
   No saved preparation template. Typed preparation output stays narrow: scriptPath, planPath,
   commands, blockers and notes; full evidence lives at artifact paths, not in huge schemas.
5. The compact plan states acceptance checks, lanes/owned paths, shared interface contracts,
   real dependencies, verification resources and delivery. Derive lanes from the actual stack:
   API/UI, domain/views, engine/platform integration, or independent modules. Stabilize only
   shared contracts needed by consumers; implement compatible lanes concurrently immediately.
6. Tooling is installed once with this skill (`bun install --frozen-lockfile` in its folder).
   The checker uses the local pinned TypeScript and does not fetch dependencies during a run.
   Run `bun test` in the skill folder for its discoverable behavior/checker tests.
   Mechanically check the actual authored draft with `bun --no-env-file --config=/dev/null
   <skillRoot>/scripts/check-script.ts <draft>` and current platform analysis. Return diagnostics
   to the same author. An additional fresh Pro HIGH script review is justified by unresolved
   authority/topology risk or platform requirements, not automatically by file count. If used,
   combine plan and script review; repeat only to resolve concrete blocking findings. No panels.

No arbitrary audit/correction round cap. This does not mandate repeated reviews: once a
criterion passes, it stays passed until a relevant change invalidates its evidence.

## Launch and execute

Show actual commands, write scopes, persona models/thinking, lanes, joins and required checks.
Launch the fresh execution script via CreateWorkflow using the platform's normal permission
flow. Do not add an approval beyond that flow without a concrete requirement. Use its actual
amend/resume mechanisms for corrections; preserve work/evidence and never relaunch to hide
failures. Receive completion notifications; do not repeatedly poll or cancel pending calls.

The [execution contract](references/execution.md) defines the core graph:

- Start independent implementation lanes together; persistent Pro HIGH domain implementers.
- Integrate as soon as compatible slices are ready; serialize Git and conflicting writers only.
- On a frozen integrated candidate, start independent gates, API checks, browser/device QA and
  one focused fresh Pro HIGH code/UI review concurrently as their individual inputs exist.
- Collect material findings in one ledger. Dispatch disjoint corrections together; rerun
  invalidated checks and obtain fresh independent judgment only where the change needs it.
- Finish when required checks cover the final result and zero material findings remain.

Use Flash HIGH for bounded exploration, targeted log/evidence lookup and blind visual
observations when useful; no ceremonial Flash tracer per lane/round. Pro HIGH owns synthesis,
implementation and judgments. Use `v3Persona(path, tier, access, evidence?)` and `v3Agent`
from the local [model helper](model-policy.dwf.ts), pasted unchanged after the unchanged local
[persona kit](persona-kit.dwf.ts). Never inherit a specialist's MAX setting. MAX is optional
only for one reasoning-limited criterion after two distinct completed, failed HIGH correction
attempts on that same criterion; initial implementation, review, interrupted work and tooling
failures do not count. Record the changed approach/check/evidence for both attempts. Missing
permissions, tools or information require the specific missing prerequisite, not MAX.

## Completion and measurement

Required runtime and visual checks cannot be replaced by static review or a disclaimer.
Use task-relevant visual evidence for changed visible behavior; one combined reviewer can
judge code and UI. Add a blind Flash visual observation only when it adds independent visual
information, concurrently with checks that do not consume that observation. Do not add a
separate visual-verdict actor after the combined reviewer. Native shared devices serialize;
independent web test lanes use separate ports, browser sessions and databases.

Stop incomplete on an external blocker, no viable corrective approach, cancellation or
runtime exhaustion. Repeated failure demands a changed diagnosis, not blind retries. Report
partial results and unresolved material uncertainty. Cosmetic suggestions outside scope may
be deferred explicitly; do not invent polish gates or widen the request.

Preserve the user's checkout. Follow the execution contract's run-owned worktrees and guarded
fast-forward delivery; never push. Report completion/incomplete, requirement outcomes, real
commands/exit codes, findings/dispositions, screenshots, actual persona models/thinking,
MAX evidence if any, source revision tested, run branches/artifacts and delivery status.
Persist report/timing data inside the workspace. The coordinator writes any user-authorized
external report copy after execution, as specified in the execution contract; actors do not
need parent-directory write authority.
Measure preparation, first execution, first runnable result, verification and correction
elapsed time separately; include actor work versus waiting where available. Count actual
asks, repeated checks, amendments and dependency waits. Do not call wall time model thinking.

For this experiment's rationale and an isolated comparison procedure, read
[design evidence](references/design-evidence.md) only when evaluating the workflow.
