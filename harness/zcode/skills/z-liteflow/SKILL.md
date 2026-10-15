---
name: z-liteflow
description: >-
  Lightweight one-launch chain for small, single-domain tasks — the little
  sibling of z-workflow. One zflow-engine chain launch with modelProfile=flash
  runs the area's full loop (plan, implement, judge, fix rounds) in a single
  workflow; commit at hand-off stays the coordinator's call. Use for quick
  features, small refactors, bug fixes, and commit requests that fit one
  implementer; multi-domain, multi-phase, or vision-heavy work belongs to
  z-workflow.
---

# z-liteflow

**Hard rule — the main agent is the chain coordinator: it scopes, makes ONE
launch, relays the report. It never writes product code — one disclosed
exception: a one-liner with no audit value skips the chain entirely; the
coordinator makes that edit itself and says so in the report.** Evidence
lives under `.zflow/evidence/`.

## Model profile — all flash, by design

One launch, `modelProfile=flash`: every role on the flash model, judgment
compensated mechanically by script-run gates, fresh blind judges,
per-finding confirmers, and in-run POLICY. Small diffs are where the cheap
model is good enough and its failures are cheap to catch. If flash depth
falls short, the run stops honestly (stagnation) and the work hands off to
a sibling flow — never a mid-run model swap.

## Launch (once)

```
[coordinator: scope + baseline gate run]
 → ONE CreateWorkflow: zflow-engine mode=chain modelProfile=flash commit=false
   The run does everything per area: plan → implement → gates (world.run,
   anchored allowlist) → fresh blind judge + confirmer per finding → fix
   rounds while findings shrink → stagnation/cap stop. Work stays on disk.
[coordinator: relay report; hand commits only when the user asked AND the
 loop ended clean — one commit per area, keyed to the scope list, within
 budget; never one end-of-chain blob]
```

### Scope (coordinator, before the launch)

- **Allowed paths** — files in play, named explicitly; typically ONE area.
  **At most one skill**, verified against the session's available-skills
  list. If the predicted diff exceeds the size budget (~400 changed lines /
  ~10 files), the task does not fit liteflow — hand off to a sibling flow.
- **Gates** from the repo's tooling, non-mutating, engine-allowlisted. No
  gates? **Audit-only mode**: the judge judges gateless areas on code and
  text evidence alone — the done-criterion; the report must state no
  mechanical gates existed.
- **Baseline** — a gate pass BEFORE the launch; record pre-existing reds and
  OMIT those gates from `areas[].gates` — the baseline record carries them
  into the report: never silently, never claimed clean.
- Record `baseSha` (git rev-parse HEAD), `repoRoot` (git rev-parse
  --show-toplevel), `agentsMd` (default AGENTS.md; "" when the repo has
  none); gitignore `.zflow/`.
- `commit: false` — loop cleanliness is never known in advance, so the
  warranted commits are the coordinator's hand at hand-off: explicit paths,
  log style, never push.

### POLICY — in-run, code-enforced

Clean = judge returns zero findings and gates green → the run stops itself.
Rework = findings strictly shrinking → fix rounds inside the run (fresh
implementer each round, riding the findings). Stop = two non-shrinking
rounds or the user's maxRounds cap → honest report of what passes and why.
Only verified findings become fix targets; low/unconfirmed stay labelled in
the report, never dropped (flash over-flags; the confirmer filters).

## Conventions

- Never make gates green by weakening or deleting tests or gate config; a
  wrong-looking test is a finding, reported.
- Fresh judge every round — never one judging fixes it inspired. Never claim
  clean while a gate is red or a verified finding stands.
- Unverified stays unverified; half-done work stays on disk, listed; revert
  only on request.
- AGENTS.md binds every subagent (agentsMd arg); its required skills ride on
  top of the scoped skill (not a routing choice — they don't count against
  the one-skill cap).

## Fallback lanes

- **Mid-run eyes** — flash reads PNGs natively, so in-run image checks are
  native; if a run still cannot see pixels it needs, ONE escalation per area
  carrying ALL its screenshots (cap 3 per ask).
- **Interactive desktop lane** — computer-use/browser-use plugins are
  main-thread-only; in-run capture uses agent-browser (web) or ocu (desktop,
  device lane).
- **Outgrew liteflow** — multi-domain, API seams, schema changes, or cap
  reached with blockers standing: let the run stop honestly, relaunch as the
  sibling flow (z-workflow's home turf). No nesting.
