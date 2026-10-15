---
name: z-proflow
description: >-
  Depth-first one-launch parallel chain — all-pro judgment, no router. One
  zflow-engine chain launch (balanced profile: pro planning, implementation,
  judging; flash only for pixel capture/audit when UI areas exist) runs every
  area as its own state machine with gates, fresh blind judges, per-finding
  confirmers, and code-enforced POLICY exits. ocu AX-tree structural audits
  ride the judge's evidence; pixel verification belongs to the flash vision
  lane. Use when depth beats speed on multi-area work. Trigger phrases: pro
  workflow, max-depth orchestration, main-tier loop, depth-first
  iterate-until-clean.
---

# z-proflow

Real multi-area work where judgment-heavy implementation and audit verdicts
need main-tier depth — complex concurrency, architecture, subtle bugs and
straightforward areas alike (gates + fresh judges are the backstop). Trivial
one-file edits are cheaper done directly. Siblings run under their own
rules — never cross-apply: z-workflow (mixed tiers), z-flashflow (all-flash,
fast), z-liteflow (small single-domain).

## Model profile — pro judgment, one launch

One launch, default `modelProfile=balanced`: planner, reviewer, implementer,
Committer, judge, and confirmer all run pro; capture and vision audit run
flash (pro is image-blind — pixel judgment happens only in that lane or a
batched escalation). The coordinator surveys once at init and builds the
areas list itself — no router: one tier means nothing to route.

| Work | Lane |
|---|---|
| Coordination (survey, ONE launch, final report) | Host model, main thread |
| Implementation, planning, judging, confirming | pro, pinned in-engine |
| Mechanical gates + size numstats | world.run — no model |
| Pixel vision | flash capture/audit lane (or none, when all areas are terminal) |
| AX structural checks | pro judge reads the .txt evidence (tier-blind text) |

## Launch (once)

prep (coordinator): survey the repo; build areas[] — name, contention
  (terminal/web/desktop/mobile), paths, excludedPaths, skills (absolute
  SKILL.md paths matched live against the session's available-skills list —
  never hardcoded; a gap is noted), gates ({tool, args[]} — at least one per
  area; engine allowlist: npm, pnpm, yarn, bun, cargo, make, go, python3,
  pytest, git; npx refuses — wrap in a Makefile target; non-mutating; a
  cargo gate's own --manifest-path is honored and absolutized), complexity,
  dependsOn, budget. Slice under the size budget (~400 changed lines / ~10
  files per area). Baseline gates once; record and OMIT pre-existing reds.
  Record baseSha, repoRoot, agentsMd; gitignore .zflow/; clean stale
  zflow/* branches/worktrees and untracked files under worktree areas' paths.

launch (once): CreateWorkflow saved zflow-engine — mode="chain", task,
  areas, agentsMd, baseSha, repoRoot, maxLines/maxFiles (per-area budget
  optional), commit. No subagent_model. No maxRounds unless the user caps.
  Never relaunch to fix — AmendWorkflow revises a wrong run reusing its
  finished work; ResumeWorkflowRun continues a stopped one. The run loops each area internally:
  plan → implement → (vision for non-terminal areas) → judge → fix rounds
  while findings shrink → clean/stagnation/cap stop; worktree branches merge
  along the dependsOn DAG and clean themselves up.

stop → relay the run's typed return + report artifact: per-area terminal
  states, rounds, gates, commits and merges, findings fixed vs deferred,
  half-done work listed. Add the one thing only the coordinator knows:
  which profile the run used.

## POLICY — in-run, code-enforced, never model-judged

Clean = zero open findings + gates green (worktree areas also merge). Rework
= findings strictly shrinking → fresh implementer each round. Stop = two
non-shrinking rounds or the user's cap → honest report. A round over its
size budget is a HIGH verified finding — split the area, never commit big.
Gate failures become verified findings automatically; a red gate skips
nothing and counts toward stagnation. Never claim clean while a gate is red.

## Conventions

- Size-budgeted small commits: ≤400 changed lines / ≤10 files, one commit
  per green round, `fix:` on fix rounds, explicit paths, never `git add -A`/
  `--no-verify`/push; match repo log style. The engine's Committer owns all
  git; implementers never touch it.
- AGENTS.md binds every subagent (agentsMd + baseSha args); its required
  skills ride on top of the routed skills.
- Fresh auditors never judge fixes they inspired. Baseline reds get zero
  fix rounds. Unverified stays unverified; half-done work stays on disk,
  listed; revert only on request.

## Fallback lanes

- **Mid-run vision** (a pro judge hits pixels it must see): the escalation
  bridge, batched — ONE escalation per area carrying ALL its screenshots;
  resolve with a flash Agent-tool subagent; cap 3 per ask. Never swap models
  mid-run.
- **Pixel/design verification wholesale**: let the run finish, relaunch
  z-workflow as the sibling flow (cross-flow hand-off — no nesting).
  Speed/cost-dominated work with objectively checkable failures →
  z-flashflow, the same way.
- **Desktop automation**: in-run capture is ocu via the device lane (AX
  text is tier-blind — fine for pro structural checks); pixel PNGs decode
  to files for the flash lane. The computer-use plugin is the MAIN THREAD's
  interactive lane only.
- **Stall**: two rounds without shrinking findings → the run stops itself;
  report what is done and what is open.
