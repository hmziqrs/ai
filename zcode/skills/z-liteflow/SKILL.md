---
name: z-liteflow
description: >-
  Lightweight chain for small, single-domain tasks — the little sibling of
  z-workflow. A flash implement node and a flash judge node looping
  between runs per finding, plus an optional flash vision node. Use for
  quick features, small refactors, bug fixes, and commit requests that fit
  one implementer; multi-domain, multi-phase, or vision-heavy work belongs
  to z-workflow.
---

# z-liteflow

**Hard rule — the main agent is the chain coordinator: it scopes, launches
nodes, routes between runs, reports. It never writes product code — one
disclosed exception: a one-liner with no audit value skips the chain
entirely; the coordinator makes that edit itself and says so in the
report.** Evidence lives under `.zflow/evidence/`.

## Tier matrix — all flash, by design

| Work | Tier / model |
|---|---|
| Scoping, baseline gate pass + record, between-run routing, report; hand commits — only when the user asked AND the loop ended clean | Main agent (coordinator, host model) |
| Implement + gate fix loop (`implementer-<area>`) | implement node — launcher pins `subagent_model` = GLM-5.3-Flash |
| Audit: fresh blind `judge-<area>-r<round>` + per-finding `confirmer-*` | judge node — GLM-5.3-Flash, fresh every round |
| Vision, only if the user asks | vision node — GLM-5.3-Flash reads PNGs natively |

Small diffs are where the cheap model is good enough and its failures are
cheap to catch. One run = one model: if flash depth falls short, finish the
run and relaunch as the sibling flow — never a mid-run model swap.

## Chain blueprint

```
[coordinator: scope + baseline gate run]
 → implement node: mode=implement tier=flash (subagent_model: GLM-5.3-Flash)
   implementer-<area> implements → SCRIPT re-runs gates (world.run, literal
   allowlist) → red gates back to the SAME implementer; capped, stagnation-checked
 → judge node: mode=judge tier=flash (subagent_model: GLM-5.3-Flash)
   fresh blind judge-<area>-r<round> → script re-runs gates → EVERY finding
   reproduced by a separate confirmer → return: verified/unconfirmed
 ⇄ loop BETWEEN runs, on each judge return: verified high/medium findings
   (= blocker/major) → relaunch implement with findings arg (verified are
   fix targets, unconfirmed labelled context; "fix:" prefix) → judge again
 → optional (user asks; loop clean): vision node mode=vision tier=flash —
   web `agent-browser --session zflow-<area>`, desktop `ocu`; evidence →
   .zflow/evidence/<area>-r<n>-*.png; findings → advisory context in the
   next implement round, verified by re-shoot (no independent confirmer)
[coordinator: report]
```

Launch each node with `CreateWorkflow` (saved `zflow-engine`, args `{mode,
tier, task, areas, evidence?, findings?, commit?, maxRounds}`). Between
runs the coordinator holds ONLY: task, areas + gates, baseline record,
round number, verified high/medium counts, evidence paths — never file bodies.

### Scope (coordinator, before any launch)

- **Allowed paths** — files in play, incl. ones the task requires creating,
  named explicitly. **At most one skill**, verified against the session's
  available-skills list.
- **Gates** from the repo's tooling, non-mutating variants (`--check`
  forms). No gates? **Audit-only mode**: the judge judges gateless areas on
  code and text evidence alone — the done-criterion; the report must state
  no mechanical gates existed.
- **Baseline** — a gate pass BEFORE the first launch; the engine has NO
  baseline concept (a declared red gate spends budget and blocks
  green/commits). Record every pre-existing red and OMIT those gates from
  `areas[].gates` at every launch — the baseline record carries them into
  POLICY and the report: never silently, never claimed clean.

### POLICY — exit conditions enforced in code and on typed returns

- **In-run (implement node)** — gate rounds capped at `maxRounds`
  (default 3); two rounds without a shrinking red-gate count → the area
  stops, red, work on disk.
- **Between runs (coordinator)** — a chain round = one judge verdict plus
  its fix relaunch; cap 3 chain rounds. **Clean** = judge returns zero
  findings, every gate green → report. **Stall** = each round must end at
  a new minimum of verified high/medium findings; two judge rounds without
  a new minimum → stop, report honestly (catches 3→2→3→2). **Cap reached**
  with verified findings standing → report what passed, what fails, why.

Classification is in-run: the judge proposes, the confirmer reproduces —
only verified findings become fix targets; low/unconfirmed stay labelled
in the report, never dropped (flash over-flags; the confirmer filters).
The coordinator acts only on typed returns, between runs — no mid-run
channel (escalation is reserved here for image needs). The script runs
the gates, never the agents; a red gate is itself a finding.

## Conventions

- Never make gates green by weakening or deleting tests or gate config; a
  wrong-looking test is a finding, reported.
- Fresh judge every round — never one judging fixes it inspired. Never
  claim clean while a gate is newly red or a verified finding stands.
- Unverified stays unverified; half-done work stays on disk and is listed
  in the report; revert only on request.
- **Commits** — the engine's commit phase (`commit`, default true) commits
  each gates-green area: explicit paths, Committer-drafted, `fix:` on fix
  rounds, never `--no-verify`, never push; red or gateless areas get none.
  Liteflow passes `commit: false` on every launch — loop cleanliness is
  never known in advance — so the warranted commit is the coordinator's
  hand (audit-only's only route): only when the user asked AND the loop
  ended clean; explicit paths, log style, never push.

## Fallback lanes

- **Mid-run vision needs** — flash reads PNGs natively, so in-run image
  checks are native here; if a run still cannot see pixels it needs, ONE
  escalation per area carrying ALL its screenshots (cap 3 per ask).
- **Interactive desktop lane** — the official computer-use / browser-use
  plugins are session-bound and NOT usable inside workflow runs; they stay
  the main agent's interactive lane only. Nodes use `agent-browser` (web)
  or `ocu` (desktop) via Bash.
- **Outgrew liteflow** — multi-domain, API seams, schema changes, mobile +
  backend, or cap reached with blockers standing: finish the run, relaunch
  as the sibling flow (z-workflow's home turf). No nesting; a stalled run
  stays stopped, reported honestly; further hand-off is the user's call.

## Report

What was asked; changed paths; rounds spent; gate status incl. baseline
reds and audit-only mode; findings fixed vs. unconfirmed/low; commits
(the coordinator's hand, on request); vision status; anything open.
