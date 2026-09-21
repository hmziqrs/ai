---
name: z-proflow
description: >-
  Depth-first multi-workflow chain — all-pro, no router, no pixel vision.
  The main agent is a thin chain coordinator; every workflow node runs the
  pro tier (GLM-5.3) via zflow-engine with subagent_model pinned to pro,
  with gates, fresh blind judges, and code-enforced POLICY exit rules as
  the mechanical backstop. ocu AX-tree structural audits are allowed
  (text is tier-blind); pixel verification is not — it belongs to
  z-workflow's flash vision node. Use when depth beats speed on
  multi-area work. Trigger phrases: pro workflow, max-depth orchestration,
  main-tier loop, depth-first iterate-until-clean.
---

# z-proflow

## When to use

Real multi-area work where judgment-heavy implementation and audit verdicts
need main-tier depth — complex concurrency, architecture, subtle bugs and
straightforward areas alike (one tier everywhere; gates + fix loop are the
backstop). Trivial one-file edits are cheaper done directly. Siblings run
under their own rules — never cross-apply: z-workflow (mixed tiers,
vision), z-flashflow (all-flash, fast), z-liteflow (small single-domain),
z-gpui-workflow (GPUI desktop). Once a z-proflow chain starts, the
boundary holds until the final report.

## Tier matrix (one model per run — subagent_model is run-wide)

| Work | Lane | Why |
|---|---|---|
| Coordination (init survey, launches, between-run checks, final report) | Host model, main thread | Survey output is compact control data; sequencing is all it does |
| Implementation — complex AND straightforward | pro run: zflow-engine `mode=implement`, `tier=pro`, `subagent_model` = pro | Depth-first by design; one tier everywhere |
| Mechanical gates | `world.run` literal-command allowlist — no model | Objective truth |
| Committer | shared named "Committer" agent inside the pro run | Verifiable via `git log` |
| Judge (audit + verdicts) | pro run: `mode=judge`, `tier=pro`; fresh blind `judge-<area>-r<round>` per area | Rule judgment needs depth |
| Decider (continue/stop) | none — POLICY is loop conditions in code | Models cannot misjudge exit conditions |
| Pixel vision | none — hand off (fallback lanes) | The pro tier is image-blind |

No router: one tier means nothing to route — the coordinator surveys once at
init and builds the areas list itself.

## Chain blueprint

Between runs the coordinator holds ONLY compact control data: the
areas/routing map, per-area verdict lines, commit shas, round + stagnation
counters. Evidence never transits the coordinator — it lives in files under
`.zflow/evidence/` and in each run's typed return.

1. **Init + survey** (coordinator): survey the repo and extract project
   rules (AGENTS.md / CLAUDE.md / CONTRIBUTING.md); build `areas[]` — name,
   paths, excludedPaths, skills (absolute SKILL.md paths, matched live
   against the session's available-skills list — never hardcoded; if
   nothing fits, route without a skill and note the gap), gates
   (`{tool, args[]}` — at least one per area (zero gates never go green
   and never commit); tool must be in the engine's literal-command
   allowlist — npm, pnpm, yarn, bun, cargo, make, go, python3, pytest,
   npx, git (read-only subcommands only); anything off-allowlist is
   skipped-and-red forever — no round can turn it green, so its area
   never commits; correct it at launch (swap the tool or drop the
   gate), never mid-chain; non-mutating (no `--fix`/`--write`); must
   exist in repo tooling), complexity, hasUI, dependsOn.
2. **Implement node**: `CreateWorkflow` zflow-engine `mode=implement
   tier=pro`. One `implementer-<area>` per area in routing-map order,
   dependencies chained per-item; the SCRIPT runs each area's gates in
   code after the implementer hands off — implementers run neither the
   gates nor git; the Committer commits only areas that went green.
   Round-1 housekeeping: gitignore `.zflow/`.
3. **Judge node**: zflow-engine `mode=judge tier=pro` — fresh blind judge
   per area; every finding confirmed by a separate confirmer agent or a
   world.run gate; unconfirmed findings are labelled, never dropped.
4. **POLICY loop** — enforced in code inside each run and by the
   coordinator between runs, never by model judgment:
   - all areas complete + all gates green + zero open findings → stop;
   - findings strictly shrinking → continue;
   - two consecutive rounds with no meaningful progress (open findings or
     failing gates not shrinking) → stop, report honestly;
   - round cap: `maxRounds` (default 3). Never claim clean while a gate is red.
5. **Fix rounds**: relaunch the implement node with `findings=` (prior
   round's array); the engine REUSES the named `implementer-<area>` agent —
   it still knows its own code. Then judge node again on the affected
   scope; fix work commits separately (`fix:`).
6. **Final report** (coordinator): expand the last run's WorkflowReport
   typed return / markdown report artifact (primary deliverable). Add the
   one thing only the coordinator knows: which tier each run was pinned
   to — where a pin was requested but unverifiable, say "unverified",
   never guess.

## Conventions (preserved from the original flow)

- Small commits, one logical unit each — cheap revert is the point; never
  one mega-commit at the end.
- The Committer owns ALL git mutations; implementers never touch git.
  Explicit paths only, never `git add -A`. Commit after gates pass, not
  before. Match repo style (`git log --oneline -10`; conventional `feat:`/
  `fix:` in a fresh repo). Never `--no-verify` — a hook rejection is
  reported verbatim and routed to a fix round. Never push unless asked.
- Fresh auditors never judge fixes they inspired.
- Gate failures skip the judge and go straight to a fix round — but red
  gates count toward the stagnation counter; no run loops forever.
- A gate that was red before the chain began is recorded as pre-existing
  baseline; don't burn fix rounds on it.
- Unverified stays unverified. Half-done work stays on disk and is listed
  in the report; revert only on request.

## Fallback lanes

- **Mid-run vision** (a pro run hits pixels it must see): the blocked
  subagent escalates — escalation bridge, BATCHED: one escalation per area
  carrying ALL its screenshots; the coordinator resolves it with a
  flash-tier Agent-tool subagent (`general-flash`). Cap: 3 escalations per
  ask. Never swap the run's model mid-run — subagent_model is run-wide.
- **Pixel/design verification wholesale**: finish the run, relaunch
  z-workflow as the sibling flow (cross-flow hand-off — no nesting).
  Speed/cost-dominated work with objectively checkable failures →
  z-flashflow, the same way.
- **Desktop automation**: inside runs, `ocu` via subagent Bash — AX
  trees come back as text (tier-blind: fine for pro structural checks);
  pixel PNGs decode to files for a flash lane, never for pro to "look
  at". The official computer-use plugin is the MAIN THREAD's interactive
  desktop lane only — its transport is session-bound and cannot run
  inside a workflow.
- **Stall**: two fix rounds with no shrinking findings on the same issue →
  stop cleanly; report what is done and what is open.
