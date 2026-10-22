---
name: z-workflow-v9
description: >-
  Run ZCode tasks through a dedicated Flash HIGH preparation author and maintained
  source pieces. Supports per-area parallel work and requested planning, plan audit,
  tests, implementation audits, browser/TUI checks and web/native/mobile vision.
---

# z-workflow-v9

Select V9 when requested. It is an independent experiment; preserve V8 and older releases.
The coordinator delegates one typed plan and source assembly to `workflow-author-v9`
(Flash HIGH). The run consumes that plan directly: no second configurator rediscovers it.
Maintained source is concatenated unchanged, with literal phase labels and concrete ask
interfaces. No saved standing workflows, runtime imports, callback registries or authored engines.

## Coordinate

1. Send the original brief, absolute workspace and this skill's absolute directory to the
   installed `workflow-author-v9` Agent. Include known instruction paths; do not write a
   detailed TASK.md or explore project/engine source first. Natural short prompts are sufficient.
   The author's [contract](references/authoring.md) contains the schema/catalog and its one
   deterministic preflight command. If the agent is not discovered, start a new ZCode session.
2. While it prepares, load the current ZCode `dynamic-workflows` launch contract once. Its
   examples do not authorize extra reviews. Do not inspect compiler/engine internals or repeat
   the author's probes. If a prerequisite is blocked, perform only an authorized concrete remedy;
   preserve user edits and isolated project scope. Give the author the diagnostic, not a new plan.
3. Use returned `scriptPath` in CreateWorkflow, following the separate confirmation flow even
   with Full access. Preserve preview-only requests: show the assembled phases without starting
   a run. Plan-only mode has no writers, worktrees or implementation gates. Compiler diagnostics
   mean no workflow started; report/recover narrowly under the current contract.
4. On completion, use recorded evidence and captured HEAD/full branch ref to guard ordinary
   fast-forward delivery to the original checkout. No reset/clean/force/push/deploy. Changed anchors,
   failed required checks or dirty candidate retain the result for review. Do not rerun successful
   gates or demand a cold build. Report actual outcome, elapsed preparation/execution separately,
   pieces, effective models, evidence and unmet requirements briefly. Never promise speed unmeasured.

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
before image judgment. Lifecycle cleanup runs on failure too. The runtime tools remain shared;
persona tool lists are intended authority, not a claimed sandbox.

Bun, Git and the skill's pinned TypeScript dependency are required. Installation uses regular
files in `~/.zcode/skills/z-workflow-v9/` and `~/.zcode/agents/workflow-author-v9.md`; niche
personas remain project-local. The copied v4 persona kit is byte-identical to canonical.
Reusable fixes require a new numbered release; preserve task-owned diagnostics rather than
rewriting installed helpers during a run. Installing this skill does not authorize a benchmark.
