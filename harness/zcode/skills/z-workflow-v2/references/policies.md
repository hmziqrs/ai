# V2 policies

These policies are owned by this skill. They apply to preparation and execution. Read the
local execution contract for script structure and gates; load the actual platform contract
for API signatures and compilation rules.

## Models, personas, and authority

| Work | Tier | Default thinking | Authority |
|---|---|---|---|
| Exploration, tracing, citation checking, log classification | Flash | HIGH | Read-only |
| Blind visual findings | Flash | HIGH | Read-only |
| Capture driver when commands alone cannot capture | Flash | HIGH | Scoped evidence capture |
| Synthesis and execution planning | Pro | HIGH | Read-only |
| Script author | Pro | HIGH | Run draft files only |
| Implementation | Pro | HIGH | Assigned run-owned worktree paths |
| Independent review and final verdict | Pro | HIGH | Read-only |
| Gates, captures where possible, Git, fingerprints | No model | — | Explicit command scope |

Load the local persona kit block unchanged into every script that needs agent personas.
Paste the local [model policy helper](../model-policy.dwf.ts) unchanged after the kit.
Use `v2Persona(absolutePath, tier, access, maxEvidence?)` then
`v2Agent(persona, uniqueName, rules)`. Tier is explicit (`flash` or `pro`); HIGH overrides
the source persona's `thoughtLevel`. The optional MAX evidence object is valid only under
the rule below. Report the actual selected model and source sha256. Never call an agent by
its file name alone, hand-write another persona loader, or silently substitute a missing
persona. Local preparation personas live in `../personas/`; domain assignments use
[specialist rules](specialists.md).

Read-only tools metadata is advisory, not a sandbox. Every read-only ask uses
`guardWrites` against its designated workspace while no writer is active there. Guard
failures are findings even when an ask throws. Fingerprints cover source/index/HEAD while
excluding ignored paths and restricted research material; report these limits. Capture
writes receive explicit evidence-directory and device/server authority, not source edits.
Preparation author writes receive explicit draft-directory authority, not repository edits.
Domain personas never authorize Git mutations, external messages, deployment, or publication.

## Evidence-based MAX escalation

Never choose MAX based on anticipated complexity, risk, task size, or role prestige.
Exploration and routine work stay HIGH. For one blocked reasoning problem:

1. Record the failed acceptance criterion and its reproducible evidence.
2. Complete a targeted HIGH correction attempt and rerun that criterion. Record what changed,
   actual model/thinking, check command/result, and evidence path.
3. Complete a second HIGH correction attempt against the **same** criterion and record its
   failed result. Initial implementation or review alone does not count as a correction.
4. Diagnose whether the blocker is missing input, tools, permissions, or an external service.
   Those blockers return incomplete; extra thinking cannot resolve them.
5. Only then may the responsible Pro actor use MAX for that problem, carrying both attempt
   records. Unrelated lanes remain HIGH. Record whether MAX helped; return subsequent work
   to HIGH. A MAX attempt that produces no viable next action is incomplete with the blocker,
   not permission for a repeating escalation loop.

Two HIGH failures are an escalation threshold, never a review-round cap. If HIGH is making
progress, continue HIGH. Track attempts by stable criterion ID, not total rounds or unrelated
findings. The same reasoning rule applies to author corrections and execution corrections.

## Parallelism and context

Bound each exploration question and give scouts disjoint evidence responsibilities where
possible. Launch independent scouts together. Each returns findings, absolute locations or
URLs, relevant excerpts, command results, searched scope, negative results, conflicts,
unknowns, and proposed acceptance checks. Preserve all reports; synthesis cites them and
marks each accepted, rejected with reason, or unresolved. Never drop a report to shorten the
brief or let the coordinator re-explore it.

A synthesis is an evidence-backed execution brief, not an automatic PRD. The same Pro
script author handles all revisions. Execution implementers also persist per lane. Each
review round creates new Pro reviewer actors with unique round names and no implementer
reasoning or previous review verdicts. They receive requirements, actual diff, and evidence.
A review may inspect the current finding ledger for regression scope without inheriting a
prior verdict as authority.

Independent area pipelines run as soon as their own inputs are ready. Name each dependency
edge and every join's actual consumer. Cross-area integration, whole-result checks, and
final reporting justify joins; convenience alone does not. Writers on separate independent
areas get separate worktrees. Serialize Git mutation, shared-file writers, exclusive devices,
and any read-only guard against a workspace being written. Distinct web lanes use separate
ports/browser sessions. Use the platform's structured channels/futures only as documented.

## Findings, progress, and completion

Each finding has a stable ID, requirement/criterion, materiality, evidence, label
(`verified`, `judged`, or `unconfirmed`), owner, and resolution check. A command establishes
`verified`; a model verdict establishes `judged`; an unsupported claim stays `unconfirmed`.
Do not hide dismissed claims: preserve the dismissal reason and evidence.

There is no fixed audit, implementation, or author-correction round limit. Success means
zero unresolved **material** findings, required gates pass on the final integrated result,
required visual rows are resolved, and every required deliverable exists. A material
unconfirmed concern needs investigation or a reasoned evidence-backed disposition before
success; it cannot be excluded just by relabeling it. Cosmetic suggestions outside scope
may be explicitly deferred without preventing success.

Repeated failures trigger a diagnosis: change approach or split the problem; consider
criterion-specific MAX only when eligible. Missing prerequisites, no viable corrective
approach, user cancellation, or runtime/resource exhaustion end **incomplete**, retaining
all work and exact blockers. Never count an interrupted attempt as a completed HIGH failure.

## Scope and helpers

Follow project instructions, including research access restrictions. Do not enumerate,
search, or read `research/` unless the task authorizes relevant research access. All helpers
use Bun through `world.run`, pass data as arguments, and disable project configuration and
`.env` autoload for read-only checks. No secret contents in outputs. Follow the actual
platform's API and lifecycle rules; platform availability is a prerequisite, not a reason
to fall back to another workflow skill.
