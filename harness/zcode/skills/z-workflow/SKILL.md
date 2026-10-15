---
name: z-workflow
description: >-
  Single-run parallel chain orchestration for complex multi-phase tasks: one
  zflow-engine chain-mode launch runs every area as its own state machine —
  plan, implement, vision, judge at per-area rounds — on a topology picked by what
  the area contends on: parallel in the shared checkout, parallel in its own
  git worktree with a deterministic port and browser session, or serialized
  through the desktop capture lane — use for new features, multi-domain
  changes, refactors with strict quality bars, or any time the user mentions
  orchestration, sub-agents, auditors, vision testing, or iterate-until-clean
  flows.
---

# z-workflow

The main agent is the **chain coordinator**: classify the areas, make ONE launch, relay the
report. The whole chain runs as one `zflow-engine` launch in `mode=chain` via CreateWorkflow
`saved`: stages are futures, areas flow between them through channels, and each area carries
its own round number, findings, and terminal state — areas sit at different stages and rounds
at once, and every area loops until clean or honestly stopped. Never relaunch to fix:
AmendWorkflow revises a wrong run reusing its finished work; ResumeWorkflowRun continues a
stopped one. Never nest another flow inside a run. Evidence lives under `.zflow/evidence/`,
read by the run — never inlined.

## Contention decides the topology

Classify every area at prep and record it as `contention`. Do not classify by layer or
convenience — classify by what the area contends on:

| contention | the area | topology the engine runs |
|---|---|---|
| `terminal` | backend, CLI, any non-visual work verifiable by commands | parallel state machine in the shared checkout; commits serialize through the engine's git queue |
| `web` | browser UI — tree, port, and browser are all virtualizable | parallel in its OWN git worktree (`.zflow/worktrees/<area>`, branch `zflow/<area>`) + deterministic port (4100 + index among this run's web areas, sorted) + isolated `agent-browser --session zflow-<area>` — as many concurrent browsers as web areas |
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

Flash where output is objectively checkable — vision capture and audit, gates, git state; pro
where quality is only checkable by judgment. Every role is pinned in the engine at launch with
full `providerId/modelId` ids.

| Role (subagent name) | Model |
|---|---|
| planner-<area>, plan-reviewer-<area>, implementer-<area>-r<N>, Committer, judge-<area>-r<N>, confirmer-<area>-r<N>-<i> | pro (`account:zai-individual-coding-plan/GLM-5.3`) |
| capture-<area>-r<N>, vision-audit-<area>-r<N> | flash (`account:zai-individual-coding-plan/GLM-5.3-Flash`) — all vision work is flash |
| Mechanical gates, size measurement, worktrees, merges, git mutations | no model — `world.run` in script |

z-workflow launches `mode=chain` and passes NO `subagent_model` and NO `max_concurrency`
(only when the user asks for a width limit). Pin only providers that serve foreground subagent
turns (the individual coding plan does).

## Chain blueprint

```
prep (coordinator): build areas[] — name, contention (table above), paths, excludedPaths,
  skills (absolute SKILL.md paths matched against THIS session's skills list; if none fits,
  route bare and note the gap), gates, complexity, dependsOn, optional per-area budget
  ({maxLines, maxFiles}). Gates are non-mutating (no --fix/--write), shaped {tool, args[]}
  (e.g. {"tool":"make","args":["-f","zflow-smoke/Makefile","site-check"]}), and limited to
  the engine's allowlist — npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, git. Wrap
  other repo tools in a Makefile target or a python3 script path; `npx` gates refuse, and
  `python3 -m module` breaks (the engine absolutizes the first argument). Slice under the
  size budget: a slice predicted over ~400 changed lines / ~10 files splits into separate
  areas ordered by dependsOn, sized for the whole chain. Record the AGENTS.md path (pass
  agentsMd: "" when the repo has none) and baseSha (git rev-parse HEAD); gitignore .zflow/
  (evidence AND worktrees). Run every area's gates once yourself (Bash, exit code + last
  error line only); record pre-existing reds as the gate baseline and OMIT those gates from
  areas[].gates — they stay in the baseline record for the report.

launch (coordinator, once): CreateWorkflow saved zflow-engine with mode="chain", task, areas,
  agentsMd, baseSha, repoRoot (git rev-parse --show-toplevel — the engine anchors every
  command to it; without it the engine guesses and may refuse), maxLines/maxFiles or
  per-area budgets, commit (default true); maxRounds only when the user sets a cap;
  modelProfile stays "balanced" (pro judgment + flash vision) unless an all-flash run is
  wanted ("flash" — every role on flash; z-flashflow and z-liteflow route this way).
  No subagent_model.

in-run (per area, independent): plan — a pro planner per area drafts the build plan, a fresh
  reviewer attacks it, one revision pass; implement — pro, one ask per chain round, worktree
  when the contention class needs one, gates run by the script after the ask, one commit per
  green round; vision — flash, only for web/desktop areas: dev server on the area's port
  (web) or app from the worktree (desktop), evidence under .zflow/evidence/, desktop areas
  one at a time through the lane; judge — fresh blind pro judge per area plus a confirmer
  per finding, gates and a size numstat re-run by the script; POLICY (below) loops the area
  or stops it. Channels carry areas between stages with a counted close — the run ends
  exactly when every area reaches a terminal state.
stop → relay the engine's report: primary markdown, status board, typed return.
```

## POLICY — per-area exit rules, enforced in the engine script

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
5. Never claim clean while a non-baseline gate is red; baseline reds get zero fix rounds and
   are reported from the baseline record.
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
work (implement returns plus `git status`); user-left items.
