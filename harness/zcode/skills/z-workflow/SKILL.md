---
name: z-workflow
description: >-
  Flexible single-run orchestration: a fresh root sub-agent scouts the task and repo,
  the coordinator composes exactly the phases the work needs — the zflow-engine chain
  for code (plan, implement, vision, judge per area on a contention-picked topology),
  a plan-search-cite-audit-write pipeline for research, or draft-review-revise for
  prose — one workflow launch end to end; use for new features, multi-domain changes,
  research audits, documentation, refactors with strict quality bars, or any time the
  user mentions orchestration, sub-agents, auditors, vision testing, or
  iterate-until-clean flows.
---

# z-workflow

The main agent is the **composer-coordinator**: scout with a fresh root sub-agent,
compose the pipeline the task actually needs, make ONE launch, relay the report. The
phases follow the work — code runs the zflow-engine chain below; research runs
plan → search → cite-audit → write; prose runs draft → fresh review → revise. Nothing
is bent to fit a fixed loop. Never relaunch to fix: AmendWorkflow revises a wrong run
reusing its finished work; ResumeWorkflowRun continues a stopped one. Never nest
another flow inside a run. Evidence lives under `.zflow/evidence/`, read by the run —
never inlined.

## Step 1 — root sub-agent (always first)

Never explore on the main thread beyond dispatch: the main thread carries the
conversation's context; a fresh sub-agent reads the repo without that bloat and
returns better results. Send ONE read-only scout (Agent tool — Explore, or
general-flash with an explicit read-only instruction) carrying the task verbatim. It
returns this brief — data, not chat:

```ts
interface WorkflowBrief {
  /** The shape of work this task is. */
  workKind: "code" | "research" | "draft" | "mixed";
  /** The task, verbatim. */
  task: string;
  /** Absolute repo root; "" when there is none. */
  repoRoot: string;
  /** Absolute AGENTS.md path that binds subagents; "" when the repo has none. */
  agentsMd: string;
  /** Files the task touches (code) or must read (research/draft), absolute. */
  files: string[];
  /** Skills, docs, configs worth attaching — absolute paths that exist. */
  resources: string[];
  /** Repo rules that constrain the run (from AGENTS.md, README, CI). */
  instructions: string[];
  /** Mechanical checks the repo already has, {tool, args[]}, non-mutating. */
  gates: { tool: string; args: string[] }[];
  /** Proposed phase list for this task, in order, minimal. */
  suggestedPhases: string[];
  /** What could make this run fail or lie. */
  risks: string[];
}
```

Verify mechanically what must be exact — repoRoot, agentsMd, baseSha — one command
each. Scout claims are data to check, not truth to trust.

## Step 2 — compose the pipeline

| Brief says | Pipeline | Launch |
|---|---|---|
| `code` | the zflow-engine chain (everything below) | CreateWorkflow `saved: zflow-engine`, mode="chain", areas[] built from the brief |
| `research` | plan → search → cite-audit → write | inline CreateWorkflow script |
| `draft` | draft → fresh review → revise | inline CreateWorkflow script |
| `mixed` | stages from `suggestedPhases`; an unknown tail ends in a hole | inline CreateWorkflow script |

Rules for composed (inline) pipelines:

- Load the **dynamic-workflows** skill BEFORE writing any script; it is the authoring
  contract — required phases, typed results, fresh eyes on every plan and draft,
  world.run for mechanical checks, holes for unknown shape, bounded loops.
- Multi-stage pipelines are ARCHITECTED by the **workflow-author** agent:
  dispatch it (AUTHOR mode) with the brief and task, and write the inline script
  from its TopologyPlan — per-item chains by default, annotated joins only where the
  next stage truly needs every item, parallelization first. Then dispatch a SECOND
  fresh workflow-author (REVIEW mode) to audit the script's topology, and fix what
  it flags before launching. No script launches without passing that review.
- **Research**: plan decomposes the questions; search fans out one fresh subagent per
  question (web and/or repo reads); cite-audit is a fresh blind judge whose only job
  is "does every claim carry a real source"; write assembles the report.
  Sourced-or-silent — citations are to research what gates are to code.
- **Draft**: the reviewer never saw the draft; ask what would break it, never whether
  it is good.
- Cut every stage the task does not need; add the one it does. Any deviation from
  `suggestedPhases` gets one line of reason at launch.

## Step 3 — launch and relay

ONE CreateWorkflow call — saved for code, inline script otherwise. Do not poll; the
completion notification arrives on its own. Relay conclusion, verified, and notCovered
honestly.

## Contention decides the topology (code pipeline)

Classify every area at prep and record it as `contention`. Do not classify by layer or
convenience — classify by what the area contends on:

| contention | the area | topology the engine runs |
|---|---|---|
| `terminal` | backend, CLI, any non-visual work verifiable by commands | parallel state machine in the shared checkout; commits serialize through the engine's git queue |
| `web` | browser UI — tree, port, and browser are all virtualizable | parallel in its OWN git worktree (`.zflow/worktrees/<area>`, branch `zflow/<area>`) + deterministic port (4100 + index among this run's web areas, sorted — overridden when the task names a dev-server URL) + isolated `agent-browser --session zflow-<area>` — as many concurrent browsers as web areas |
| `desktop` | desktop GUI, game, hardware-bound UI — one screen, one app instance, one capture | implement parallel in a worktree; launch and capture serialize through the engine's single-worker device lane (one area at a time; parallel capture is never faked) |
| `mobile` | app on one iOS simulator or Android emulator — the device itself is the contended surface | implement/build parallel in a worktree; the whole device phase (boot, install, launch, capture, teardown) serializes through the same single-worker device lane — exactly one simulator/emulator at a time |

A worktree area's branch merges back into the shared checkout along the `dependsOn` DAG when
the area finishes clean, and the engine then removes the merged worktree and branch itself;
a failed merge rolls back, and the branch plus worktree are left for manual merge and listed
honestly. A dependent area does not start implementing until its dependencies finish with
their work visible in the shared checkout; a dependency that ends any other way blocks its
dependents with an honest note. Areas that stop for any other reason (stagnation, cap, error)
keep their worktree and branch — delete those before rerunning, and clean untracked files
under worktree areas' paths in the main checkout first: a merge refuses when it would
overwrite an untracked file, and that refusal is what you see.

The engine anchors every command to `repoRoot` (npm `--prefix`, pnpm/make/go/git `-C`,
yarn/bun `--cwd`, cargo `--manifest-path`, python3/pytest via an absolute script path) —
never trust any tool's cwd. npx gates refuse honestly; wrap such checks in a Makefile target.

## Role-model matrix

Flash where a model runs and its output is objectively checkable — vision capture and audit;
mechanical gates, size measurement, and git state run model-free in script (world.run). Pro
where quality is only checkable by judgment. Every role is pinned in the engine at launch with
full `providerId/modelId` ids.

| Role (subagent name) | Model |
|---|---|
| planner-<area>, plan-reviewer-<area>, implementer-<area>-r<N>, Committer, judge-<area>-r<N>, confirmer-<area>-r<N>-<i> | pro (`account:zai-individual-coding-plan/GLM-5.3`) |
| capture-<area>-r<N>, vision-audit-<area>-r<N> | flash (`account:zai-individual-coding-plan/GLM-5.3-Flash`) — all vision work is flash |
| Mechanical gates, size measurement, worktrees, merges, git mutations | no model — `world.run` in script |

z-workflow launches `mode=chain` and passes NO `subagent_model`; a width limit, when the
user asks for one, is a CreateWorkflow `max_concurrency` setting, not an engine arg. Pin only
providers that serve foreground subagent turns (the individual coding plan does).

## Chain blueprint

```
prep (coordinator): build areas[] FROM the root brief — name, contention (table above),
  paths, excludedPaths, skills (absolute SKILL.md paths matched against THIS session's
  skills list; if none fits, route bare and note the gap), gates, complexity, dependsOn,
  optional per-area budget ({maxLines, maxFiles}). Gates are non-mutating (no --fix/--write),
  shaped {tool, args[]} (e.g. {"tool":"make","args":["-f","zflow-smoke/Makefile","site-check"]}),
  and limited to the engine's allowlist — npm, pnpm, yarn, bun, cargo, make, go, python3,
  pytest, git. Wrap other repo tools in a Makefile target or a python3 script path; `npx`
  gates refuse, and `python3 -m module` breaks (the engine absolutizes the first argument).
  Slice under the size budget: a slice predicted over ~400 changed lines / ~10 files splits
  into separate areas ordered by dependsOn, sized for the whole chain. Take repoRoot and
  agentsMd from the verified brief (agentsMd: "" when the repo has none) and baseSha
  (git rev-parse HEAD); gitignore .zflow/ (evidence AND worktrees). Run every area's gates
  once yourself (Bash, exit code + last error line only); record pre-existing reds as the
  gate baseline and OMIT those gates from areas[].gates — they stay in the baseline record
  for the report.

launch (coordinator, once): CreateWorkflow saved zflow-engine with mode="chain", task, areas,
  agentsMd, baseSha, repoRoot (the verified brief value — the engine anchors every command
  to it; without it the engine guesses and may refuse), maxLines/maxFiles or per-area
  budgets, commit (default true); maxRounds only when the user sets a cap; modelProfile
  stays "balanced" (pro judgment + flash vision) unless an all-flash run is wanted
  ("flash" — every role on flash; z-flashflow and z-liteflow route this way).
  No subagent_model.

in-run (per area, independent): plan — a pro planner per area drafts the build plan, a fresh
  reviewer attacks it, one revision pass; implement — pro, one ask per chain round, worktree
  when the contention class needs one, gates run by the script after the ask, one commit per
  green round; vision — flash, for every non-terminal area (web, desktop, mobile): dev server on the
  area's port (web — a dev-server URL named in the task overrides it), app from the worktree
  (desktop), or device capture via simctl/adb (mobile); evidence under .zflow/evidence/;
  desktop and mobile areas one at a time through the device lane; judge — fresh blind pro judge per area plus a confirmer
  per finding, gates and a size numstat re-run by the script; POLICY (below) loops the area
  or stops it. Channels carry areas between stages with a counted close — the run ends
  exactly when every area reaches a terminal state.
stop → relay the engine's report: primary markdown, status board, typed return.
```

## POLICY — per-area exit rules (engine-enforced; baseline handling is coordinator-side)

Loop conditions live in the engine script; models never judge them:

1. Latest judge return for the area has zero findings of ANY status and every non-baseline
   gate that ran is green → stop clean. Its unconfirmed vision findings are deferred to the
   user — labelled, never silently dropped. A worktree area's clean also merges its branch.
2. Two consecutive rounds whose open findings do not strictly shrink → stop that area;
   report honestly what passes, what fails, and a diagnosis.
3. Rounds are unbounded by default — each area loops until clean or its stagnation rule stops
   it; maxRounds caps the loop only when the user sets one, and reaching that cap stops the
   area with the same honest report.
4. Otherwise the area continues only while its findings strictly shrink.
5. Never claim clean while a non-baseline gate is red; baseline reds (recorded at prep and
   omitted from areas[].gates — the engine has no baseline machinery and never sees them)
   get zero fix rounds and are reported from the coordinator's baseline record.
6. Size budget, enforced at the judge by a script-run numstat against the area's measuring
   base (baseSha for shared-checkout areas, the worktree's branch point for isolated ones).
   Over-budget is a HIGH verified finding regardless of correctness — split the area, never
   commit big.

## Conventions

- **Commits**: ≤400 changed lines / ≤10 files per commit; one commit per green round,
  never one commit folding rounds; fix rounds commit separately (`fix:`); explicit paths only;
  never `git add -A`, `--no-verify`, or push. Git mutations run only inside the engine — the
  coordinator and implementers never touch git. `commit=false` leaves everything on disk and
  worktree areas never merge, so areas depending on a worktree area are blocked honestly —
  prefer re-scoping over running a merge-dependent chain with commit=false.
- **AGENTS.md binds every subagent**: pass `agentsMd` and `baseSha` at launch; every spawned
  role reads it first, and every skill it requires is read on top of the routed skills.
- **Gates re-run at every judge round for every area**; a script-run red overrides a claimed
  green.
- **Fresh judges never judge fixes they inspired**: judges are fresh and blind each round;
  fixers are fresh implementers each round, re-entering through the findings.
- **Vision never self-confirms**: vision findings are unconfirmed; only findings the blind
  judge plus a confirmer reproduced become fix targets. Evidence is screenshots plus AX text —
  console and network errors count only when visible in it.
- **Honesty**: verified/unconfirmed labels preserved, nothing dropped; unverified stays
  unverified; half-done work stays on disk (worktree branches included), listed in the report.

## Fallback lanes

- **Escalation bridge**: a blocked subagent escalates; only it parks while its area's chain
  and every other area carry on. Resolve via Agent-tool subagents of any tier (general-flash
  for pixel reads). Batch ONE escalation per area carrying ALL its screenshots; cap 3.
- **Interactive desktop**: computer-use / browser-use plugins are main-thread-only, never
  inside a run; in-run capture uses `ocu` (AX text + decoded PNGs) through the desktop lane.
- **Pin failure**: a provider that stops serving foreground turns fails the run loudly at that
  subagent; fix the pin in the engine and AmendWorkflow.

## Final report (coordinator relays)

From the engine's typed return plus artifacts: per-area terminal state (clean, stagnated,
capped, blocked, merge-failed, errored) with rounds spent; approved plans (approach per area);
the role-model matrix above; gate status per area; baseline reds; findings fixed vs deferred;
changed
paths and commit shas per area; worktree/merge state per area (unmerged branches left for
manual merge are listed, never hidden); evidence paths (`.zflow/evidence/` listing); half-done
work (implement returns plus `git status`); user-left items. For composed pipelines, relay
the WorkflowReport fields the same way: conclusion, findings with status labels, verified,
notCovered.
