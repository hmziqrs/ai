---
name: z-workflow
description: >-
  Fresh-per-task dynamic workflow composer: a scout reads the task and repo, the
  workflow-author agent picks the shape from the dynamic-workflow catalogue and writes a
  new script for this use case only, a fresh reviewer audits it, and one CreateWorkflow
  run executes it with phase barriers, parallel fan-out inside each phase, and a mixed
  pro/flash model matrix. Use for features, multi-area changes, audits, research,
  refactors with strict quality bars, or any time the user names a workflow.
---

# z-workflow

The main agent is the **composer-coordinator**. It triages the task, dispatches a scout
and the workflow-author, reviews the script, launches one run, and relays the report.
Every run gets a script written for that use case. Nothing is reused from a template
unless the user names a saved workflow.

## Pillars

1. **Fresh per use case.** The shape and script come from the brief, never from an old
   run or a fixed chain. Copy rules and helpers from this skill, never a previous topology.
2. **Scale to the task.** Triage decides the workflow's size before any script exists.
   A one-file change gets a one-phase run. A cross-domain auth change gets the full chain.
3. **Phase = barrier.** A phase starts only when the previous phase's `Promise.all` has
   resolved. Inside a phase, everything runs in parallel: fan-out per area or per item,
   and per-item chains when one item's next step needs only that item.
4. **Mixed models.** Pro for judgment, flash for checkable output, no model for mechanical
   gates and git. The matrix is pinned per role with `model()` literals.
5. **Fresh eyes and honest gates.** Plans, drafts, and audits go to a fresh subagent that
   never saw the authoring. Mechanical checks are `world.run` with literal commands. Nonzero
   exits are values the script reads, never ignored.
6. **Bounded and honest.** Every loop has a round cap and a stagnation rule. Unverified
   stays unverified in the report.

## Step 0 — triage (main agent, no subagent)

The user named a workflow, so a workflow runs. Triage only sets its size.

| Tier | Signal | Run shape |
|---|---|---|
| S (small) | one area, up to about 3 files, no security or data-model change | Phases: implement, gate, fresh judge. Round cap 2. |
| M (medium) | 2 to 4 areas in one domain, or more than 3 files | Plan, implement, gate, judge, fix loop per area, in parallel. Round cap 3. |
| L (large) | multi-domain, auth, data migration, public API, or the user asks for strict bars | Full chain below, with a planner per area, a fresh plan attack, a judge panel, and per-finding confirmers. Round cap 5. |

Any tier can carry a visual check. Add a capture phase only when a UI area is in scope.
Round caps are always explicit. An unbounded loop is never authored.

## Step 1 — scout (fresh read-only subagent)

Send ONE read-only scout (Agent tool, Explore) with the task verbatim. The scout returns
this brief as data, not chat:

```ts
interface WorkflowBrief {
  /** code | research | draft | mixed: the shape of the work. */
  workKind: "code" | "research" | "draft" | "mixed";
  /** S | M | L from triage, adjusted by what the scout found. */
  size: "S" | "M" | "L";
  /** low | high: high for auth, data, public API, money, or security-sensitive code. */
  risk: "low" | "high";
  /** The task, verbatim. */
  task: string;
  /** Absolute repo root (the one anchor every other path is relative to); "" when none. */
  repoRoot: string;
  /** AGENTS.md path relative to repoRoot that binds subagents; "" when none. */
  agentsMd: string;
  /** Files the task touches or must read, relative to repoRoot. */
  files: string[];
  /** Areas the work divides into, each with its files and whether it has a UI. */
  areas: { name: string; files: string[]; hasUI: boolean }[];
  /** Mechanical checks the repo already has, as literal {tool, args[]}, non-mutating. */
  gates: { tool: string; args: string[] }[];
  /** What could make the run fail or lie. */
  risks: string[];
}
```

Verify what must be exact (repoRoot, agentsMd, baseSha, each gate's exit code) with one
command each. Scout claims are data to check, not facts.

## Step 2 — shape (workflow-author, AUTHOR mode)

Dispatch the workflow-author with the verbatim task and the brief. It returns a
TopologyPlan (defined in `harness/zcode/agents/workflow-author.md`). Use the catalogue
below to pick shapes; the author must name the pattern numbers it used.

| Use case | Shapes (dynamic-workflows patterns.md) |
|---|---|
| Change across several areas | 1 fan-out per area, 3 planner↔reviewer per area, 9 gated verifier loop, 4 judge panel |
| Review changed files | 2 changed-file review sweep, plus per-finding confirmers |
| Research a question | 7 bounded discovery, 10 per-item search→cite-check, 8 salvage by report |
| Triage flaky tests | 10 per-item pipeline, 9 gated loop on the test command |
| Migrate call sites | 1 fan-out, 9 gate on the build and tests |
| Prove or verify against a checker | 5 loop until approved, 9 gate on the checker |
| Shape unknown until discovery | 14 growth by tail holes, 15 stage shaped by discovery |
| Route cheap work to flash | 13 model routing |
| Back-edge from a late stage to an early one | 12 feedback loop with a counted close (justify it: it crosses phases) |
| Streaming items between stages | 11 streaming pipeline (justify it: it crosses phases) |
| Fallback when a step fails | 16 remedy the plan could not enumerate |

Phase rules for every plan:

- Each phase ends in one join (`await Promise.all(...)`). The join reason is the phase
  itself. Name it in the TopologyPlan.
- Parallel width inside a phase is the number of independent items. Never serialize
  independent items inside a phase.
- A per-item chain inside a single fan-out stays inside one phase. Example: review a file,
  then confirm each of its findings, all in one fan-out. This is allowed and preferred.
- Cross-phase pipelining (11 or 12) is the only exception. The plan must name it and say
  why a barrier would be wrong.

## Step 3 — author the script fresh

1. Load the **dynamic-workflows** skill with the Skill tool before writing or submitting
   anything. CreateWorkflow refuses to submit until it is loaded in this session. The
   workflow-author reads the same file by path.
2. The workflow-author writes the full script from the TopologyPlan. It is a new file each
   time, named `zflow-<task-slug>`. It is never copied from an older run.
3. The script follows the dynamic-workflows contract (section 16.3 of its SKILL.md):
   `phase()` markers, typed `ask<T>()` results with JSDoc on each field, literal `world.run`
   commands, literal `model()` ids, no `import`, `Date.now`, `Math.random`, `fetch`, `fs`, or
   nested workflows.
4. Gates follow the strongest tier the task implies, and each runs at least once before
   the final `return`.

## Step 4 — pre-flight (before any launch)

- **Snippet check.** For each piece of fixed logic (gate-argument building, parsers,
  refusal rules), run EvalWorkflowSnippet. It is synchronous, has no subagents, and persists
  nothing.
- **Fresh review.** Dispatch a second fresh workflow-author in REVIEW mode with the script
  text only. Fix every compile-blocking and topology finding, then rerun the review on the
  new text. Contract-shape findings are fixed or listed for the user.
- Launch only after the review passes.

## Step 5 — launch and watch

- ONE CreateWorkflow call with the inline `script` and a `name`. Add `max_concurrency` or
  `subagent_model` only when the user asks for them.
- The user confirms the script in the dialog. Do not poll. Completion arrives as a
  notification.
- If a subagent escalates, answer it with ResolveWorkflowQuestion, or ask the user with
  AskUserQuestion first. If the script is wrong, use AmendWorkflow with the file path. Never
  relaunch. ResumeWorkflowRun continues a stopped run unchanged.
- When a hole is reached, write its body from the findings so far and FillWorkflowHole.

## Model matrix

| Role | Tier | Why |
|---|---|---|
| Planner, plan reviewer, implementer, judge, confirmer, committer | pro | Quality is judged, not checked. |
| Search, capture, citation check, triage | flash | Output is checkable. |
| Gates, git state, file reads, size checks | none | `world.run`, `files.*`, `git.*` in script. |

Pin every role with a `model()` literal. Use the provider ids already used in this repo's
engine until the open question on ids is settled (see Grounded in).

## Git and commits

- Default: leave changes on disk and report them. Commit only when the user asks.
- When committing, commit through `world.run` with explicit paths. Never `git add -A`,
  `--no-verify`, or push unless asked.
- Subagents never run git mutations. The script does, in one serialized section.

## Honesty and evidence

- Each subagent prompt tells it to read `agentsMd` first when the repo has one.
- Verified and unverified findings keep their labels. Nothing is silently dropped.
- Evidence (screenshots, logs) is written by a `world.run` command under `.zflow/evidence/`.
  Its paths go in the report. The script never inlines file contents.
- Half-done work stays on disk and is listed in notCovered.

## Final report (coordinator relays)

From the run's WorkflowReport: `conclusion`, `findings` with status labels, `verified`,
and `notCovered`. Add the phase trace (which phases ran, with barrier joins), the model
per role, the round count per area, changed paths, and artifact paths. Name every
pattern number the plan used.

## Grounded in

- Platform contract: the `dynamic-workflows` skill, `SKILL.md` (§1 entry gate, §2 topology,
  §8 phases, §12 anti-patterns, §13 lifecycle, §14 escalation, §15 holes, §16.1
  CreateWorkflow, §16.2 facade, §16.3 compile rules, §16.4 AmendWorkflow, §16.6
  EvalWorkflowSnippet). Load it with the Skill tool.
- Catalogue: the `dynamic-workflows` skill's `patterns.md` (16 shapes) and `examples.md`
  (7 worked scripts).
- Subagent definition: `harness/zcode/agents/workflow-author.md`.
- Repo rules: `ai/AGENTS.md` (skill folder naming and harness kit layout).
- Open question: model ids. The engine pins `account:zai-individual-coding-plan/GLM-5.3`,
  while `AGENTS.md` names `glm-5.3` against the `zai` providers. Verify with ListModels before
  first use.
