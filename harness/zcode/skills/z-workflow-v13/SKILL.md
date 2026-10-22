---
name: z-workflow-v13
description: >-
  Use when the user requests z-workflow-v13. The historical zflow v2.2 parallel-chain
  engine, revived: one launch runs every area as its own state machine (plan, implement,
  vision, judge) over channels with a counted close, contention decides topology, and the
  engine never writes the user's checkout. The coordinator classifies areas, prepares one
  launch, and delivers by guarded fast-forward only.
---

# z-workflow-v13

Select V13 when requested. It revives the zflow v2.2 engine — recovered from this repo's
git history — as an independent opt-in experiment on the maintained-engine exception.
The engine is maintained and tested once; each run supplies validated JSON data. There is
no per-task author, no configurator, no plan audit and no saved-workflow registration.
Preserve V12 and every older release; do not inherit their routers, model policies, round
caps or references. The [engine SPEC](zflow-SPEC.md) is the contract; the engine source is
ground truth.

## Step 1 — brief and signals

Load the current ZCode `dynamic-workflows` skill for its launch contract once; do not copy
its example pipelines into the task. Take the user's task verbatim. Survey the repo
yourself — it is the coordinator's only exploration: measure which checks decide the task
(package.json scripts, Makefile targets, CI config, the README's verify line), find the
real seams where independent work can proceed without a writer, and record whether the
task names a dev-server URL (it overrides the deterministic capture port for web areas).
Pro-only flows pass `vision: false` and are judged from code and gates.

## Step 2 — classify areas by contention

Every area needs `name`, `contention` (`terminal` | `web` | `desktop` | `mobile`), scope
`paths`/`excludedPaths`, `skills` (absolute SKILL.md paths the actors must read), `gates`
(`{tool, args[]}` from the strongest checks Step 1 measured; allowlist: git, make, go,
pnpm, npm, yarn, bun, cargo, python3, pytest — non-mutating, no `--fix`/`--write`),
optional per-area `budget` and real `dependsOn` (only where an area consumes another's
output). Classification rules the engine enforces:

| contention | the area | what the engine runs |
| --- | --- | --- |
| `terminal` | backend, CLI, any non-visual work verifiable by commands | parallel state machine in the run's integration worktree; commits serialize through the git queue |
| `web` | browser UI | its own worktree, deterministic port (4100 + index among sorted web areas), isolated `agent-browser` session; captures concurrent |
| `desktop` | desktop GUI, game, hardware-bound UI | worktree for implementation; the whole device phase serializes through the single-worker device lane (ocu) |
| `mobile` | app on one simulator/emulator | worktree for build; the whole device phase serializes through the same lane (xcodebuild/simctl, gradle/adb, flutter) |

Classify from real dependency and device contention, not file counts. Add a `.zflow/` rule
to the repo's `.gitignore` (committed) if it is missing — preparation refuses without it.

## Step 3 — prepare the launch

Write a request JSON under the run-owned `.zcode/workflow-drafts/` directory containing
`repoRoot` (absolute), `task` (verbatim), `areas`, and optional `baseSha`, `runTag`,
`modelProfile` (`balanced` default — pro judgment, flash capture/audit; `flash` labels
every verdict `judged`, never `verified`), `vision`, `commit`, `maxRounds`, `maxLines`,
`maxFiles`, `agentsMd`. Then run:

`bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request.json>`

It validates the request and area shapes, requires a clean checked-out branch, captures
the delivery anchors (HEAD, branch ref), defaults `baseSha`/`runTag`/`repoRoot`, refuses
stale `zflow/<runTag>` branches or worktrees and unignored `.zflow/` state, checks the
engine against the vendored facade once, and prints the launch JSON. No model call, no
product work. A refusal gets its printed remedy — fix the data, never the engine.

## Step 4 — launch once

Submit ONE `CreateWorkflow` call with `path` set to the printed `scriptPath` and `args`
set to the printed `args`, with the printed `name`. Follow the normal confirmation flow;
compiler diagnostics mean nothing started — return to Step 3. Never relaunch to fix:
`AmendWorkflow` revises a run reusing finished work, `ResumeWorkflowRun` continues a
stopped one. The engine pins its models in-script per `modelProfile`; pass no
`subagent_model` and no `max_concurrency` unless the user asks for a width limit.

## Step 5 — relay the report honestly

The engine settles every area clean, stops on stagnation or the round cap, and blocks
dependents of a failed dependency — unfinished work stays on disk, never claimed clean.
Report the conclusion, per-area states, standing findings with their statuses, gates
actually run, evidence paths under `.zflow/evidence/`, commits, and deferred unconfirmed
vision findings. Under the flash profile a clean area is flash-judged; say so. With
`commit: false` nothing was committed or merged — work sits in the run's worktrees.

## Step 6 — guarded fast-forward delivery (after the run)

The engine never writes the user's checkout; the result is committed on
`zflow/<runTag>/integration` (worktree `.zflow/worktrees/_integration-<runTag>`). Deliver
only when: all areas and gates finished clean, no standing findings remain, `commit` was
true, the run reported the checkout anchors, and the risk is not high or review-first
(those need explicit approval). Then re-verify the anchors — same HEAD, same branch,
clean status — and fast-forward only:

`git -C <repoRoot> merge --ff-only zflow/<runTag>/integration`

then rerun every task gate in the user's checkout. Never reset, clean, force, push or
deploy; never merge with any anchor changed or any finding standing — hand the user the
ff-only command plus the reason instead. Every `zflow/<runTag>/*` branch is kept for
inspection; merged area worktrees are already removed by the engine.

## Install and discipline

Requires Bun and Git. Install as regular files in `~/.zcode/skills/z-workflow-v13/` (no
new agent definitions; no session restart needed for agents), then run
`bun install --frozen-lockfile` in the destination once for the pinned checker dependency.
The installed engine and this repo's copy must stay byte-identical (`diff -q` after every
change is the no-drift rule); engine edits update the engine, this skill and the
[SPEC](zflow-SPEC.md) together. Reusable behavior changes require a new numbered release.
Installing this skill does not authorize a benchmark or promote it over older versions.
