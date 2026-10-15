---
name: z-flashflow
description: >-
  All-flash one-launch parallel chain — the fast, cheap z-flow variant. One
  zflow-engine chain launch with modelProfile=flash runs every area as its
  own state machine (plan, implement, vision, judge, looping per area until
  clean or honestly stopped); flash judgment is compensated mechanically by
  objective gates, fresh blind judges, per-finding confirmers, and the
  code-enforced POLICY. Use for speed- and cost-sensitive multi-area work;
  hand off to z-proflow when a complex area stalls. Trigger phrases: flash
  workflow, cheap orchestration, all-flash loop, fast iterate-until-clean.
---

# z-flashflow

Real work only — trivial one-file edits are cheaper done directly; these rules
bind only runs started under this skill (siblings run their own).

## Coordinator discipline (main agent = chain coordinator)

The main thread makes ONE launch and relays the report. The whole chain —
plan, implement, vision, judge, fix rounds, merges — runs inside that single
workflow; never relaunch to fix (AmendWorkflow revises a wrong run reusing
its finished work; ResumeWorkflowRun continues a stopped one). Between prep
and the report the coordinator holds nothing: results live in the run's
typed return, board, and report artifact, and evidence under `.zflow/evidence/`.

| Coordinator DOES | Coordinator NEVER |
|---|---|
| Survey once: areas (contention, paths, gates, skills, complexity, dependsOn), baseline gates, baseSha, repoRoot | Read raw evidence — diffs, gate dumps, screenshots |
| ONE CreateWorkflow: zflow-engine, mode=chain, modelProfile=flash | Relaunch implement/judge as separate rounds |
| Relay the run's report at the end | Edit project source, run git, judge findings |

## Model profile — flash everywhere, by design

`modelProfile=flash` pins every role — planner, reviewer, implementer,
Committer, judge, confirmer, capture, auditor — to the flash model. Flash
judgment is compensated mechanically, in code: gates and size numstats run
as world.run with no model; judges are fresh and blind each round; every
judge finding needs a separate confirmer's reproduction; POLICY exits
(clean / shrink-to-continue / stagnation / cap) are loop conditions in the
script. Depth beyond flash surfaces as an escalation (the bridge below) or
a cross-flow hand-off — never a mid-run model swap.

## Launch (once)

prep (coordinator): build areas[] — name, contention (terminal/web/desktop/
  mobile), paths, excludedPaths, skills, gates {tool,args[]}, complexity,
  dependsOn, budget. Non-mutating gates from the engine allowlist (npm, pnpm,
  yarn, bun, cargo, make, go, python3, pytest, git; npx refuses — wrap in a
  Makefile target or package script). Slice under the size budget (~400 lines
  / ~10 files per area). Run every gate once yourself; record baseline reds
  and OMIT those gates. Record baseSha (git rev-parse HEAD), repoRoot (git
  rev-parse --show-toplevel), agentsMd; gitignore .zflow/; clean stale
  zflow/* branches/worktrees and untracked files under worktree areas' paths.

launch (once): CreateWorkflow saved zflow-engine — mode="chain",
  modelProfile="flash", task, areas, agentsMd, baseSha, repoRoot,
  maxLines/maxFiles (per-area budget optional), commit. No subagent_model.
  No maxRounds unless the user caps. The run does
  the rest; its completion notification carries the typed return.

stop → relay the run's report: per-area terminal states, commits, merges,
  gates, findings fixed vs deferred, evidence paths.

## Conventions

- Never claim clean while a gate is red; baseline reds get zero fix rounds
  and ride the report from the baseline record.
- Size-budgeted small commits: one logical unit ≤400 changed lines / ≤10
  files, one commit per green round, `fix:` on fix rounds, explicit paths,
  never `git add -A`/`--no-verify`/push. The engine's Committer owns git.
- AGENTS.md binds every subagent (agentsMd arg); every skill it requires is
  read on top of the routed skills.
- Fresh judges never judge fixes they inspired; flash judges never soften
  findings — false positives are absorbed by confirmers.
- Unverified stays unverified; half-done work stays on disk, listed, never
  claimed clean. Evidence by path, never inlined; evidence dir gitignored.
- Skills are matched by capability against the session's available-skills
  list; a gap is noted, not a blocker.

## Fallback lanes

- **Escalation bridge (depth mid-run)**: a blocked subagent escalates — only
  it parks while the run carries on; resolve via Agent-tool subagents of any
  tier. ONE escalation per area carrying ALL its evidence; cap 3.
- **Cross-flow hand-off to z-proflow**: a complex-tagged area stagnating, or
  a judge repeatedly contradicting green gates → let the run stop honestly,
  report, and relaunch as the sibling flow. Never nest.
- **Interactive desktop lane**: computer-use/browser-use plugins are
  main-thread-only; in-run capture uses agent-browser (web, one session per
  area), ocu (desktop), or simctl/adb device capture (mobile) — desktop and
  mobile serialize through the single-worker device lane.
