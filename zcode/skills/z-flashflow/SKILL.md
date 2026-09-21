---
name: z-flashflow
description: >-
  All-flash multi-workflow chain — the fast, cheap z-flow variant. Every
  zflow-engine run (implement, vision, judge) is pinned to GLM-5.3-Flash
  via subagent_model; the main agent is a thin chain coordinator holding
  only compact control data between runs. Flash judgment is compensated
  mechanically — objective gates, fresh blind judges, fix rounds, and
  POLICY exits enforced in code. Use for speed- and cost-sensitive
  multi-area work; hand off to z-proflow when a complex area stalls.
  Trigger phrases: flash workflow, cheap orchestration, all-flash loop,
  fast iterate-until-clean.
---

# z-flashflow

Real work only — trivial one-file edits are cheaper done directly; these
rules bind only runs started under this skill (siblings run their own).

## Coordinator discipline (main agent = chain coordinator)

The main thread is a thin sequencer — context degrades reasoning, and an
orchestrator that reads diffs, gate dumps, and screenshots becomes a
worse judge downstream. Route it, don't read it: after a red gate,
relaunch the fix round.

| Coordinator DOES | Coordinator NEVER |
|---|---|
| Hold compact control data between runs: task verbatim, routing map (areas, paths, gates, skills, complexity, dependsOn, hasUI, lane), last round's findings summary, gate verdict lines, per-area changed paths + summaries + notes, commit shas, round + stagnation counters, evidence paths | Read raw evidence — diffs, full gate output, screenshots, finding detail live in run returns and `.zflow/evidence/` |
| Run the survey-time gate baseline once, before node 1: one exit-code verdict line per declared gate; a baseline-red gate is dropped from that area's launch gates and reported as a pre-existing red | Run gates once the chain has started — gating belongs to the runs |
| Launch `zflow-engine` runs (CreateWorkflow, validated args); chain on completion notifications; Amend/Resume to re-run or continue | Edit project source, config, tests, or docs itself |
| Count rounds and shrinking findings; apply POLICY between runs | Judge findings — fresh blind judges inside judge runs do that |
| Write the final report from the last run's WorkflowReport | Run git mutations — the engine's Committer agent owns them |

## Tier matrix — flash everywhere, by design

One workflow run = ONE model, so tier purity is per run. The coordinator
pins `subagent_model` to the flash model (GLM-5.3-Flash row from
ListModels) at every launch — the script cannot pin models itself.

| Work | Where | Why |
|---|---|---|
| Sequencing, launches, between-run POLICY counts | Main agent (host model) | Control data is compact; sequencing is all it does |
| Implementation — straightforward AND complex | implement run, tier=flash | Gates + fix loop catch failures objectively |
| Mechanical gates | `world.run` inside runs (literal-command allowlist, non-mutating) | Objective truth, no model |
| Pixel vision (web + desktop) | vision run, tier=flash | Flash reads PNGs natively and can pixel-sample measured deltas |
| Code audit + verdicts | judge run, tier=flash | Fresh blind judges; over-flagging absorbed by confirmation + fix rounds |
| Commits | shared named "Committer" agent inside implement runs | Verifiable via `git log` |
| Exit decisions (POLICY) | Loop conditions in code inside each run + coordinator counts | Models cannot misjudge exit conditions |
| Depth beyond flash mid-run | Escalation bridge (batched) — see fallback lanes | Only the blocked run parks |

## Chain blueprint

ONE saved `zflow-engine` workflow, launched once per node, all flash-pinned:

1. **`mode=implement tier=flash`** — one implementer agent per area
   (`implementer-<area>`), routing-map order; independent areas run
   concurrently (chain per-item, join once), dependencies chain. Gates
   via the literal-command allowlist. Green areas commit via the
   Committer agent (explicit paths, one logical unit, after gates pass).
   Returns per-area changed paths, summaries, notes, gate verdict lines,
   the short commit sha per successful commit, findings, notCovered —
   every area included, clean or not; the report artifact carries the rest.
   Dependent areas are told only which areas finished, so cut boundaries
   so dependents need no sibling interface notes.
2. **`mode=vision tier=flash`** — ONCE, after all areas are clean, never
   per-area: a backend-first order must not screenshot UI that doesn't
   exist yet, or phantom FAILs feed fix rounds. Skip — noting so in the
   report — only when the routing map marks no UI areas (decided at
   survey, not mid-run). Web: `agent-browser --session zflow-<area>`;
   desktop: `ocu` (AX text + decoded pixel PNGs). Each round's capture
   agent re-derives its shot list; comparability comes from the prior
   round passed back in — prior shots to the capture ask, prior shots +
   prior auditor findings to the audit ask — and from the re-shoot
   (pixel findings have no independent confirmer). Evidence to
   `.zflow/evidence/<area>-r<n>-*.png`; returns per-area verdicts +
   exact paths.
3. **`mode=judge tier=flash`** — fresh blind judge per area
   (`judge-<area>-r<round>`), never one that inspired the fixes it
   judges; every finding confirmed by a separate confirmer, and gates
   add their own verified findings; unconfirmed labelled, never dropped.
4. **POLICY loop** — enforced in code inside each run and by the
   coordinator's counters between runs; `maxRounds` default 3:
   - All areas complete + gates green + zero open findings → stop, report.
   - Findings strictly shrinking → fix round: relaunch `mode=implement`
     (fresh contexts; context survives only in-run or via AmendWorkflow
     — fixes ride the args); re-run vision with prior evidence, re-judge.
   - Two stagnant rounds → stop; report honestly what passes, what fails, why. No run loops forever.

## Preserved conventions

- Never claim clean while a gate is red. A gate red at the survey baseline is dropped from the launch gates and reported as a pre-existing red — no run burns fix rounds on it.
- Small commits, one logical unit each — that makes a finding cheap to
  revert. Fix rounds commit separately (`fix: ...`). Explicit paths only;
  never `git add -A`; never `--no-verify`; never push. Match repo style
  (`git log --oneline -10`) first.
- Fresh auditors never judge fixes they inspired; flash judges never
  soften findings — false positives are absorbed by confirmation + re-audit.
- Unverified stays unverified — a check that could not actually be examined is labelled so, never narrated as reviewed.
- Half-done work stays on disk and is listed in the report; revert only on request.
- Gates must be non-mutating (no --fix/--write) and must exist in the
  repo's tooling — a hallucinated gate fails forever.
- Skills are matched by capability against the session's available-skills
  list, never hardcoded; record absolute SKILL.md paths per area; a gap
  is noted, not a blocker.
- Evidence dir gitignored from round 1; evidence referenced by path, never inlined.

## Fallback lanes

- **Escalation bridge, batched (mid-run vision or depth):** a blocked run
  escalates — only it parks; the coordinator resolves via Agent-tool
  subagents of any tier. ONE escalation per area carrying ALL its
  evidence; cap 3 per ask. Rare here — flash reads pixels natively.
- **Cross-flow hand-off to z-proflow:** a complex-tagged area stalled two
  fix rounds with no shrinking findings, or a judge repeatedly
  contradicting green gates → stop cleanly, report honestly, finish the
  run, relaunch as the sibling flow. Never nest.
- **Interactive desktop lane:** the official computer-use/browser-use
  plugins are session-bound to the main thread — never used inside
  workflow runs. In-run lanes are `agent-browser` (web) and `ocu`
  (desktop); the main-thread plugin is the interactive fallback only.
