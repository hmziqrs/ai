---
name: z-gpui-workflow
description: >-
  Thin one-launch chain skill for real GPUI (gpui-kit) Rust desktop work: a
  single zflow-engine chain launch runs every GPUI area as its own state
  machine — pro implement and judge in-run, flash vision capturing through
  the ocu device lane (AX text + decoded PNGs) for pixel design audits,
  small commits, DAG merges, and a code-enforced POLICY loop. Use for
  multi-area GPUI tasks needing iterate-until-clean with visual
  verification. Trigger phrases: gpui workflow, gpui orchestration, gpui
  sub-agents, gpui iterate-until-clean, fine-grained GPUI loop.
---

# z-gpui-workflow

**The main agent is a chain coordinator, not an implementer.** It slices the
task into GPUI areas, makes ONE launch, and relays the report; the whole
chain runs inside that single workflow. Never relaunch to fix (AmendWorkflow
revises, ResumeWorkflowRun continues a stopped run; never nest). Trivial
one-file edits don't need this skill. Sibling flows run under their own
rules.

## Models — balanced profile, in-engine

Pro where quality is only checkable by judgment — architecture,
entity/state ownership, audit verdicts. Flash where a model runs and its
output is objectively checkable — capture and image reading; gates and git
state run model-free in script (world.run). One launch pins it all:
planner/reviewer/implementer/Committer/judge/confirmer on pro; capture and
vision audit on flash. AX structural checks are tier-blind text — the pro
judge reads the .txt evidence directly; pixel judgment happens only in the
flash vision lane or a batched escalation.

## Launch (once)

prep (coordinator): slice into areas — fine-grained by decree: one entity
  family, one component, or one screen region per area; split any slice
  over ~4 files, over the size budget (~400 changed lines / ~10 files;
  per-area `budget` tunes it), or mixing kinds. Contention: every
  design/styling/render area with visible output is `desktop` (ocu capture
  through the single-worker device lane); the rest `terminal`. Gates:
  non-mutating, existing repo tooling, right manifest dir — `cargo fmt
  --check`, `clippy -- -D warnings`, `--manifest-path` where the workspace
  needs it (the engine absolutizes a gate's own manifest path). Baseline
  gates once; record and OMIT pre-existing reds. Record baseSha, repoRoot,
  agentsMd; gitignore .zflow/; clean stale zflow/* branches/worktrees and
  untracked files under desktop areas' paths.

launch (once): CreateWorkflow saved zflow-engine — mode="chain", task,
  areas, agentsMd, baseSha, repoRoot, maxLines/maxFiles (per-area budget
  optional), commit. No subagent_model. No maxRounds unless the user caps.
  In-run per area: plan → implement
  (desktop areas in their own worktrees) → flash vision (ocu AX snapshot +
  decoded PNG under .zflow/evidence/, one capture at a time through the
  device lane; the auditor reports measured differences — px offsets, hex
  deltas, font-size deltas, missing/extra elements — against the task; name
  the relevant gpui-kit design-guide criteria in the task text so they reach
  the auditor — the engine routes area.skills to the planner and implementer
  asks, not to the vision auditor) → pro judge + confirmer per finding → fix rounds
  while findings shrink → merge into the integration worktree along dependsOn →
  area worktrees removed, branches kept.

stop → relay the run's typed return + report: per-area terminal states,
  commits, merges, gate status, findings fixed vs deferred, degraded or
  skipped vision stated plainly (an area routed `terminal` that should have
  been `desktop` gets no capture — say so in the report).

## POLICY — in-run, code-enforced, never model-judged

Clean = zero open findings + gates green (worktree areas also merge into the
integration worktree).
Rework = findings strictly shrinking → fresh implementer each round; vision
re-shoots the same states so rounds stay comparable. Stop = two
non-shrinking rounds or the user's cap → honest report. A round over its
size budget is a HIGH verified finding — split the area, never commit big.
Never claim clean while a gate is red; never claim a screen verified that
was not shot and audited this run.

## Approval and merge

- Launch through the approval dialog with "Allow only this time". Never pick "Always allow
  in this session" for a run that commits or merges.
- Pass `runTag` (the first 8 characters of `baseSha` by default; a new tag when
  `zflow/<tag>/*` branches from an earlier run already exist).
- The engine never writes the user's checkout. Terminal areas work in the run's
  integration worktree; other areas work in their own worktrees and merge into it. The
  result lands on `zflow/<runTag>/integration`; area worktrees are removed after a clean
  merge (never `--force`) and every branch is kept.
- After the run, show the integration branch, its diff stat against `baseSha`, and the gate
  results, then ask with AskUserQuestion. Without a yes, stop and report the branch. On a
  yes, check that the checkout is clean, merge with one command, check the exit code, and
  run `git merge --abort` on a conflict.

## Conventions

- Size-budgeted small commits: ≤400 changed lines / ≤10 files, one commit
  per green round, `fix:` on fix rounds, explicit paths, never
  `--no-verify`/`git add -A`/push; match repo log style. The Committer owns
  git.
- AGENTS.md binds every subagent (agentsMd + baseSha args); its required
  skills ride on top of the routed skills.
- Skills are dynamic: matched by capability against the session's
  available-skills list; a gap is noted, not a blocker.
- Skill menu by area kind: state/entities, render/views, actions/focus,
  app-wiring → gpui-kit + rust-best-practices; design/styling →
  gpui-kit-design-guides (normative — follow its referenced guides) + the
  same pair; tests → gpui-kit (test reference primary) + rust-testing. A
  skill page is the door, not the room.

## Fallback lanes

- **Mid-run eyes in a pro role** (a judge re-examining pixel detail): the
  escalation bridge, batched — ONE escalation per area carrying ALL its
  screenshots; resolve with a flash Agent-tool subagent; cap 3 per ask.
- **Interactive desktop lane**: the computer-use plugin, main thread only —
  never inside runs. If ocu or the app launch fails, the run marks vision
  degraded for that area and says so — never invent substitutes.
