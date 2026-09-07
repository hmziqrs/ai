---
name: z-liteflow
description: >-
  Lightweight ZCode orchestration loop for small, single-domain tasks — the
  little sibling of z-workflow. GLM 5.3 Flash implementation agents, a fresh
  read-only Flash auditor each round, and fix rounds until the auditor says
  clean, the 3-audit-round cap is reached (infinite only if the user
  asks), or the run stalls. No router, no state file, no committer, no
  vision by default (a quick visual check can be requested). Use for
  quick features, small refactors, bug fixes, and small commit requests
  that fit one implementer — anything multi-domain, multi-phase, or
  vision-heavy belongs to z-workflow instead.
---

# z-liteflow

**Hard rule — the main thread scopes, spawns, verifies gates, classifies,
reports. It never writes product code.** That one separation is the entire
point of this flow; everything else from z-workflow is stripped. No state
file, no router, no committer — a small task doesn't need the machinery,
and the main thread can hold normal context because the loop is short.

These rules bind runs started under this skill. And they have a floor: if
the task is a one-liner with no audit value, skip the loop, do it directly,
and say so.

| Main thread DOES | Main thread NEVER |
|---|---|
| Read task-relevant files to scope; run gates for baseline and verification | Edit/create/delete any project file |
| Spawn the implementer (`general-flash`) and a fresh auditor (`explore-flash`) each round | Fix code to make an audit pass — that's a fix round's job |
| Classify findings: blocker/major → fix round; nit/false positive → report | Audit its own implementer's work |
| Commit, only if asked and the loop ended clean (see Commits) | Run vision unless the user asks for it |

## Model routing

Every spawned agent is GLM 5.3 Flash, by design — pinned through the
custom sub-agent types, not inherited from the main thread. The main
thread is the session's host model doing sequencing and classification.
Small diffs are exactly where the cheap model implements and audits well
enough — and where its failures are cheap to catch. If the task turns out
to need depth, that's the escalation signal (see Escalation), not a model
swap mid-loop.

| Work | Model |
|---|---|
| Scoping, gate verification, classification, loop control | Main thread (host model) |
| Implementation + fix rounds | `general-flash` (GLM 5.3 Flash) |
| Audit | `explore-flash` (GLM 5.3 Flash), fresh agent every round |
| Vision (only if the user asks) | `general-flash` (GLM 5.3 Flash) |

The custom types are user-scope agents (~/.zcode/agents/). The built-ins
`general-purpose` / `Explore` inherit the host model instead, so they are
the fallback, not the default. If the custom types are absent from the
session's available agent-type list, dispatch the built-ins in matching
pairs — `general-purpose` wherever `general-flash` is named, `Explore`
for the auditor — and stamp `Model: GLM 5.3 Flash` as the first line of
every prompt (resume messages included), noting in the report that model
assignment was requested-but-unverified.

## The loop

```
Scope (main thread) ──► Baseline gate run ──► Implementer (general-flash)
   ──► Your gate re-run ─┬─ red ── counts as this round's verdict ──┐
                         └─ green ─► Auditor (explore-flash, fresh) │
                                       ├── clean ─────────► Report  │
                                       └── blocker/major ───────────┤
                                                                    ▼
                          Fix round (general-flash: resumed implementer
                          or fresh fixer + findings)
   ──► fixer self-runs gates ──► your re-run ──► FRESH audit of the
   full change ─┬─ clean ────────────────────────────► Report
                └─ findings + rounds left + progress ─► Fix round
   cap reached or stalled ─────────────────────────────► Report honestly
```

Three exits only: clean → Report; cap or stall → honest Report; nothing
else terminates a run.

## Phase 1 — Scope (main thread)

Scoping is done when you can fill the Phase 2 template — nothing more:

- **Allowed paths**: the files in play, including files the task requires
  *creating* (e.g. the new test file — name its location explicitly).
- **Gate commands**: from the repo's actual tooling (package.json scripts,
  Makefile, cargo targets) — non-mutating variants where available
  (`--check` forms). If the repo has no quick gates, say so and run in
  **audit-only mode**: the auditor's task-conformance check is the
  done-criterion, and the report must state that no mechanical gates
  existed.
- **Baseline**: run the gates yourself now, before spawning anyone. A gate
  red before the change is a pre-existing baseline failure — note it; done
  means "no NEW failures", never "all green at any cost".
- **At most one skill** for the implementer, verified against the session's
  available-skills list before naming it.

If scoping outgrows this — multiple domains, API seams, schema changes,
mobile + backend — go to Escalation before spawning anyone.

## Phase 2 — Implement (GLM 5.3 Flash)

Dispatch to a `general-flash` agent — the type pins the model; the stamp
below matters only on built-in fallback.

```text
Model: GLM 5.3 Flash

You are implementing <task> in <repo path>.
Load this skill first, if listed: <absolute SKILL.md path or "none">.
Scope: touch only <allowed paths>. If you need anything outside them —
including files that don't exist yet — STOP and report that instead of
sprawling.
Done means: <gate commands, or "no gates — implement to spec"> all pass,
or match the pre-existing baseline (<baseline failures or "none">). Never
leave a gate red that wasn't red before.
Never make gates green by weakening or deleting tests or gate config; if a
test seems wrong, report it. If a gate hangs (watch mode), find its CI
mode or report the hang.
Do not commit. Report: changed paths (created + modified), gate results,
anything punted.
```

If the implementer reports it cannot get gates green beyond baseline, stop
the loop — there is no point auditing code that doesn't run. Report the
blocker.

## Phase 3 — Verify, then Audit

**Verify first:** run the gates yourself. Your run outranks every claim —
if the implementer said green and your run is red, red wins. A red run IS
that round's audit verdict (one blocker: "gates red: <commands>"); skip
the auditor and go straight to the fix round.

**Audit:** run `git status --short` yourself (if it errors — not a git
repo — paste that), then spawn a fresh `explore-flash` agent every round
— never one judging fixes it inspired — and paste the status output into
its prompt. The `Model:` stamp below matters only on built-in fallback:

```text
Model: GLM 5.3 Flash

Read-only audit in <repo path>. The task was: <task verbatim>.
The change so far spans: <cumulative changed paths — from the implementer
AND every fixer report so far>. Allowed scope was <allowed paths>;
anything changed outside it is a finding — check the orchestrator's
git status --short output pasted here: <status output, "clean", or "not
a git repo">.
Judge the change against the task itself, plus repo conventions (skim
AGENTS.md / CLAUDE.md / CONTRIBUTING.md if present, else the neighboring
code's style). Run no command that modifies anything — Read, Grep, Glob
and read-only git only. Do not run gates, tests, builds, installs, or
formatters; the orchestrator has already run the gates.
Report ONLY: severity (blocker/major/nit), file:line, what is wrong, why
it matters. "Clean" means no blocker or major findings — list nits
separately under a NITS line. No praise, no summaries of what the code
does right.
```

Every audit pass covers the FULL cumulative change, not the latest delta —
fresh auditors have no memory, so give them the whole picture.

You classify before routing: blocker/major → fix round. Nit or false
positive → note in the final report. Flash auditors over-flag;
classification is your job, not a rubber stamp.

## Phase 4 — Fix rounds

Prefer resuming the implementer via `SendMessage` (it knows its own code);
the resume message is the findings list plus "fix, re-run the gates,
report changed paths". If resume is unavailable or the original went
sideways, spawn a fresh fixer (`general-flash`): the full Phase 2 template
plus the findings list. After every fix: your own gate re-run (same red-verdict
rule), then a FRESH audit of the full cumulative change — never the
fixer's word that it's fixed.

## Termination

A round = one audit verdict (the auditor's, or your red gate run) plus its
fix round. Default cap: **3 rounds**.

- Clean verdict — no blocker or major, gates green or at baseline → done,
  report.
- Cap reached with blocker/major findings open → stop; report honestly
  what passed, what still fails, and your diagnosis. Never claim clean
  while a gate is newly red or a blocker stands.
- **Stall rule (both modes):** progress means a round ends with a new
  minimum count of open blocker/major findings. Two consecutive rounds
  without a new minimum → stop and report. This catches oscillation
  (3 → 2 → 3 → 2 never sets a new minimum twice). In capped mode it can
  end a run early; when the user opted into infinite (cap removed), it is
  the only exit besides clean.

## Vision (only if the user asks)

Runs once, after the audit loop ends clean — never per fix round. Its
FAILs are blockers: they open fix rounds under the same cap and stall
rule, and after each vision fix the failed screens are re-shot with the
same checklist. The vision agent (dispatch as `general-flash`) owns app
lifecycle — it starts the dev server if the checklist needs one and stops it
after. Checklist derives from the task; evidence saves to
`/tmp/z-liteflow/<task-slug>/` with stable names; skill by runtime from the harness's built-in plugins — web →
`browser-use` control-browser, desktop → `computer-use`, Android →
`android-emulator` android-dev, iOS → `ios-simulator` ios-dev). Say in
the report when vision was skipped (the default) or run.

## Commits

Only when the user asks **and** the loop ended clean. If the user asks for
a commit while findings stand, state them and get an explicit go-ahead
first — never commit known-broken code silently. The main thread may run
git directly: there are no parallel streams, so nothing races the index.
Match `git log --oneline -5` style; an empty log means a fresh repo —
default to conventional `feat:` / `fix:`. Stage explicit paths. Never
`--no-verify` — a hook rejection is a finding; report it. Never push
unless asked.

## Report

What was asked; changed paths (created + modified); audit rounds spent;
gate status — including baseline reds, and audit-only mode if no gates
existed; findings fixed vs. noted-as-nits; vision status; the
model-verification caveat if you fell back to built-ins with stamped
prompts instead of the custom types; anything punted or open.

## Escalation

Stop and say the task outgrew liteflow when: the scope outgrows this flow
(multi-domain, API seams, schema changes, mobile + backend), the
implementer reports bigger-than-scoped, or the cap arrives with blockers
standing. The first case is z-workflow's home turf — say so. The others
are the user's call, not an automatic hand-off: a stalled run stays
stopped, reported honestly. Half-done edits stay on disk, listed in the
report; revert only on request.
