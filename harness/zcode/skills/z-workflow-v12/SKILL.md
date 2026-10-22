---
name: z-workflow-v12
description: >-
  Parallel-first build workflow: a Flash HIGH author initializes an uninitialized project
  pre-workflow (git baseline plus thin scaffold), then splits the brief into concurrent
  writer lanes; the engine runs isolated worktrees with guaranteed teardown, guarded
  fast-forward delivery and z-v12 branch reclamation; audits, tests and vision stay opt-in.
---

# z-workflow-v12

Select V12 when requested. An independent experiment on V11's engine; preserve V11 and older
releases. The coordinator delegates one typed plan and source assembly to
`workflow-author-v12` (Flash HIGH); the run consumes it directly — no second configurator, no
saved engines. Parallel lanes by default (floor of 2 writer areas, typically 3-6 for
multi-feature briefs); never promise speed unmeasured. Audits, unit tests and vision are
opt-in with explicit authorization; stack detection enables nothing — the default posture is
no tests, no audits.

## Coordinate

1. Send the original brief, absolute workspace and this skill's absolute directory to the
   installed `workflow-author-v12` agent, plus known instruction paths and lane preferences;
   no detailed TASK.md, no exploring project/engine source first. The author's
   [contract](references/authoring.md) holds the schema, catalog and its one preflight
   command; when preflight reports the workspace uninitialized, the author itself performs
   the user-authorized bootstrap before assembling the run. If the agent is not discovered,
   start a new ZCode session (agents load at session start).
2. While it prepares, load the current ZCode `dynamic-workflows` launch contract once (its
   examples authorize no extra reviews); do not inspect engine internals or repeat the
   author's probes. A blocked prerequisite gets only an authorized concrete remedy — give
   the author the diagnostic, not a new plan.
3. Use the returned `scriptPath` in CreateWorkflow, following the separate confirmation flow
   even with Full access. Preserve preview-only requests; plan-only mode has no writers,
   worktrees or gates. Compiler diagnostics mean no workflow started.
4. On completion the engine has already attempted delivery: anchors re-verified (same
   HEAD/branch, clean), checkout fast-forwarded to the candidate commit, `z-v12/*` branches
   reclaimed (contained deleted; candidate kept only while retained; unmerged work reported).
   Report `delivery.status`/`detail`, `retainedBranches`, blockers, per-area findings, the
   selected pieces and effective models, the evidence recorded, and elapsed preparation and
   execution separately; for `retained`, give the manual command
   `git merge --ff-only <candidateCommit>` plus the reason. Never reset/clean/force/push,
   rerun successful gates or demand a cold build.

## Pieces and review policy

Pieces are selected from user intent before submission (fields in the
[authoring contract](references/authoring.md)): `planning`; `unit-tests`, `tui-tests`,
`audit`, `browser`; `web-vision`/`native-vision`/`mobile-vision` (real captured images judged
by Flash HIGH — text snapshots, test exits and screenshot existence alone are not visual
judgments). Plan checking is the author's preparation-time self-check — no plan-audit
workflow round.

Default review policy is one pass; fixed rounds/until-clean and repairs need explicit
authority. Judgment findings never veto finished work: without `fixFindings` they are
reported on area results and a completed run still delivers; a phase whose commands exit
nonzero blocks as a hard failure. A changed source revision invalidates affected evidence;
exhausted finite budgets require explicit follow-up; no automatic MAX.

Each lane runs two stages: stage A (implement + gates + commit) resolves an immutable
committed snapshot the moment source lands, so dependents fan out immediately and never
observe a later stage-B outcome; stage B (the lane's read-only phases) streams concurrently
via future() and gates only the final result. Lanes with repair authority gate as one stage.

## Worktree hygiene

The engine tears down every worktree it creates (success, incomplete and mid-run failure
alike), auto-committing dirty ones so blocked work stays recoverable, and records each in
`<repoRoot>/.zcode/workflow-drafts/worktrees.jsonl` (git-ignored). A stopped or
killed run skips engine teardown — reclaim the registered worktrees with
`bun <skillRoot>/scripts/cleanup-worktrees.ts <repoRoot>` (`--dry-run`; V12-shaped entries
only): it commits any uncommitted work to the worktree's branch first and deletes a branch
only when its work is contained in HEAD or that run's candidate, retaining the rest.

Requires Bun and Git; install as regular files in `~/.zcode/skills/z-workflow-v12/` and
`~/.zcode/agents/workflow-author-v12.md`, then `bun install --frozen-lockfile` in the
destination. Niche personas stay project-local; the copied v4 persona kit is byte-identical
to canonical. Reusable fixes require a new numbered release. Installing this skill does not
authorize a benchmark; restart the session to load the author.
