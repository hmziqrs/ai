---
name: z-workflow-v10
description: >-
  Parallel-first ZCode build workflow: a Flash HIGH preparation author splits the
  brief into concurrent writer lanes by default, the engine runs them in isolated
  worktrees with guaranteed teardown, and audits/tests/vision stay opt-in pieces.
---

# z-workflow-v10

Select V10 when requested. It is an independent experiment built on V9's engine; preserve V9
and every older release. The coordinator delegates one typed plan and source assembly to
`workflow-author-v10` (Flash HIGH). The run consumes that plan directly: no second configurator
rediscovers it. Maintained source is concatenated unchanged, with literal phase labels and
concrete ask interfaces. No saved standing workflows, runtime imports, callback registries or
authored engines.

## Priorities

- Complete the requested scope fast through parallel lanes by default: the author splits work
  along real ownership seams (parallel-by-default floor of 2 writer areas; typically 3-6 for
  multi-feature briefs) and a thin scaffold owner is the only blocking bootstrap for new apps.
- Audits, unit tests and vision are opt-in pieces with explicit authorization. Default posture
  is no plan-audit, no tests, no audits — only what the user requested. Nothing is enabled by
  stack detection.
- Never promise speed unmeasured; report elapsed preparation/execution separately.

## Coordinate

1. Send the original brief, absolute workspace and this skill's absolute directory to the
   installed `workflow-author-v10` Agent. Include known instruction paths and any lane
   preferences; do not write a detailed TASK.md or explore project/engine source first. Natural
   short prompts are sufficient. The author's [contract](references/authoring.md) contains the
   schema/catalog and its one deterministic preflight command. If the agent is not discovered,
   start a new ZCode session (agent discovery reads `~/.zcode/agents/` at session start).
2. While it prepares, load the current ZCode `dynamic-workflows` launch contract once. Its
   examples do not authorize extra reviews. Do not inspect compiler/engine internals or repeat
   the author's probes. If a prerequisite is blocked, perform only an authorized concrete remedy;
   preserve user edits and isolated project scope. Give the author the diagnostic, not a new plan.
3. Use returned `scriptPath` in CreateWorkflow, following the separate confirmation flow even
   with Full access. Preserve preview-only requests: show the assembled phases without starting
   a run. Plan-only mode has no writers, worktrees or implementation gates. Compiler diagnostics
   mean no workflow started; report/recover narrowly under the current contract.
4. On completion, use recorded evidence and captured HEAD/full branch ref to guard ordinary
   fast-forward delivery to the original checkout — delivery needs only the recorded candidate
   branch/commit, never a surviving worktree. No reset/clean/force/push/deploy. Changed anchors,
   failed required checks or a dirty candidate retain the result for review. Do not rerun
   successful gates or demand a cold build. Report actual outcome, elapsed preparation/execution
   separately, pieces, effective models, evidence, retained branches and unmet requirements
   briefly.

## Scope and execution

Optional pieces are selected from user intent before submission. Nothing extra is enabled by
stack detection. [Authoring contract](references/authoring.md) defines exact fields and examples.

- `planning` names the requested thin plan; otherwise the kernel accepts the prepared work data.
- `plan-audit` is an independent Pro HIGH review BEFORE any implementation/worktree setup.
  It is distinct from schema validation and implementation review.
- `unit-tests`, `tui-tests`, `audit` and `browser` are separate behavior/review pieces.
- `web-vision`, `native-vision`, `mobile-vision` capture real images and use Flash HIGH judgment.
  Text snapshots, test exits and screenshot existence alone are not visual judgments.

Default requested review policy is one pass. Fixed rounds/until-clean and repairs require
explicit authority. Findings without repair authority stop incomplete. Plan findings corrected
with a final permitted pass are reported corrected but not re-audited. Do not invent another
clean pass. A changed source revision invalidates affected evidence; exhausted finite check
budgets require explicit follow-up instead of quietly executing more rounds. No automatic MAX.

The author defines disjoint source owners and real dependencies. Independent area pipelines
start concurrently and advance through their own checks; there is no global phase barrier.
An explicitly requested plan audit is a deliberate preimplementation gate. Shared Git, PTY,
browser/device and writers serialize only where necessary. Verification areas consume actual
implementation commits without becoming product writers. Device capture releases its lock
before image judgment. The runtime tools remain shared; persona tool lists are intended
authority, not a claimed sandbox.

## Worktree hygiene

The engine tears down every worktree it creates — on success, incomplete and mid-run failure
alike — in a guaranteed finally phase. Before removal, a dirty worktree is auto-committed to
its area branch so blocked work stays recoverable; area branches already contained in the
candidate are deleted, the candidate branch is always kept as the delivery reference, and any
branch still holding recoverable work is reported in `retainedBranches`. Every created worktree
is also recorded in `<repoRoot>/.zcode/workflow-drafts/worktrees.jsonl` (persistent, git-ignored);
teardown removes entries as it reclaims each worktree. A run stopped or killed mid-flight skips
engine teardown — reclaim exactly the registered worktrees afterwards with
`bun <skillRoot>/scripts/cleanup-worktrees.ts <repoRoot>` (`--dry-run` supported; only registry
entries with V10-shaped paths and branches are ever touched). Per-worktree engine command
evidence (ignored JSONL under `.zcode/workflow-drafts/v10-evidence/`) is disposable; the run
journal and repo-root evidence namespaces remain authoritative. Dependency-blocked areas report
no phantom worktree paths.

Bun, Git and the skill's pinned TypeScript dependency are required. Installation uses regular
files in `~/.zcode/skills/z-workflow-v10/` and `~/.zcode/agents/workflow-author-v10.md`; niche
personas remain project-local. The copied v4 persona kit is byte-identical to canonical.
Reusable fixes require a new numbered release; preserve task-owned diagnostics rather than
rewriting installed helpers during a run. Installing this skill does not authorize a benchmark.
