---
name: z-workflow
description: >-
  Multi-workflow chain orchestration for complex multi-phase tasks: pro
  implement and judge runs with a flash run-level vision node chained
  between rounds, looping per POLICY until clean or honestly stopped.
  Use for new features, multi-domain changes, refactors with strict
  quality bars — or any time the user mentions orchestration,
  sub-agents, auditors, vision testing, or iterate-until-clean flows.
---

# z-workflow

The main agent is the **chain coordinator** — a thin sequencer. Each workflow run is a tier-pure chain node
over `zflow-engine.dwf.ts`, launched via `CreateWorkflow` with ONE `subagent_model` per run. Between runs it
holds only compact control data: task, `areas`, merged findings (round + counts), gate baseline, commit shas,
evidence paths; diffs, gate logs, screenshots stay under `.zflow/evidence/` — read by runs, never inlined.

## When to use

Complex, multi-phase work: new features, multi-domain changes, refactors with strict quality bars; iterate-until-clean
with visual verification. Triggers: "orchestration", "sub-agents", "auditors", "vision testing", "iterate-until-clean".
Trivial one-file edits are cheaper done directly; small tasks → sibling z-liteflow, all-flash → z-flashflow — never
cross-apply; hand off by finishing the run and relaunching the sibling (no nesting); boundary holds to the final report.

## Tier matrix

**Flash where output is objectively checkable — gates, git state, screenshots; pro where quality is only checkable by judgment.** One run = one model; tier by chaining.

| Work | Tier / lane | Where |
|---|---|---|
| Implementation — all areas, complex or straightforward | pro (`subagent_model` = GLM-5.3) | implement run |
| Vision capture — web `agent-browser`, desktop `ocu` | flash (GLM-5.3-Flash) | vision run |
| Judge — blind audit + confirmer agents; never sees vision findings' content | pro | judge run |
| Mechanical gates | no model — `world.run` in script; coordinator Bash once at prep | runs + prep |
| Commit messages (mutations via `world.run("git", …)`) | named "Committer" agent | inside runs |
| Mid-run pixel reads needed by a pro run | escalation bridge → flash via main agent | batched |
| Interactive desktop hand-driving | main-thread computer-use plugin | fallback only |

## Chain blueprint

```
prep (coordinator): build areas[] — paths, excludedPaths, skills (absolute SKILL.md paths matched
  against THIS session's skills list; if none fits, route bare and note the gap), gates
  (non-mutating: no --fix/--write; must exist in repo tooling — a hallucinated gate fails
  forever), complexity, hasUI, dependsOn. Gitignore .zflow/. Then run every area's gates
  once yourself (Bash, exit code + last error line only); record pre-existing reds as the
  gate baseline and OMIT those gates from areas[].gates at every launch — they stay in the
  baseline record for POLICY + report, never riding findings= (the engine cannot detect
  pre-existing reds: its first gate runs only AFTER an implementer ask).

per round (1 .. maxRounds, default 3) — EVERY launch carries findings= — NEVER a union
of all returns: the LATEST judge return's findings, plus vision findings never yet put
before a judge (same-round vision reaches its judge via evidence=, below); baseline-red
gate findings never ride — they live in the baseline record. A finding the latest judge
no longer reports is retired; shrink tests stay coherent; one chain round = one engine
round. round = max(findings round) + 1 for EVERY mode — omit findings= and the node
re-runs as round 1: judges stall at -r1, vision evidence collides at -r1-*, the cap
never fires. Plus evidence= (paths from your own .zflow/evidence/ listing; judge and
vision re-audit priors). Round 1 implement/vision: none — the round-1 judge may carry
that round's vision evidence paths (findings= stays empty, so it runs as round 1).
  1. [zflow-engine mode=implement tier=pro] → gate results, red-gate findings, skipped
     items; per-area summary, changed paths, and the short commit sha (on success) all
     ride the typed return — clean areas included. implementer-<area> per area, areas
     order, deps chained in-run.
  2. [zflow-engine mode=vision tier=flash] → verdict + findings (EXACT evidence paths
     per area in the return). RUN-LEVEL: one pass over the whole UI, after implement,
     never per-area (never shoot a UI that doesn't exist yet); skip iff no area has
     hasUI — note it.
  3. [zflow-engine mode=judge tier=pro] → confirmed findings, fixes needed;
     fresh blind judge-<area>-r<round> per area
  ↑ fix rounds: relaunch the cycle — same implementer NAMES, fresh context each launch (re-entry via findings
    material; unconfirmed = labelled advisory context, never fix targets); failed vision re-shot (the engine
    feeds prior evidence into its capture + audit asks — the comparability; no checklist); separate fix: commits.
stop → coordinator writes the final report.
```

**Data sourcing between runs**: per-area changed paths, summaries, and short commit shas ride the
implement typed return; exact evidence paths ride the vision typed return (still pass them via
evidence=); half-done work from `git status`; blocked parts survive as summary/skipped — re-enter
still-open ones as unconfirmed advisory findings (POLICY 1); report artifacts are the fuller record.

The coordinator sets `subagent_model` per launch (the engine cannot pin models; `tier` is behavior-only); ResumeWorkflowRun continues a stopped run, AmendWorkflow re-runs reusing work.

## POLICY — exit rules, enforced in code

Exit conditions are loop conditions — engine script inside each run (inner fix loop, stagnation, cap), coordinator between rounds (items below) — so models never judge them.

1. All areas complete, all non-baseline gates green, zero open findings of ANY status (an unconfirmed vision FAIL must be confirmed by a judge round over the same evidence, or explicitly deferred to the user) → stop, report clean.
2. Two consecutive rounds with open non-baseline findings or non-baseline red gates not shrinking → stop; report honestly what passes, what fails, and a diagnosis.
3. maxRounds (default 3) reached → stop; same honest report.
4. Otherwise continue only while findings strictly shrink.
5. Never claim clean while a non-baseline gate is red; baseline reds (probed at prep, omitted from areas[].gates at every launch, never merged into findings=) are pre-existing — burn no fix rounds on them; the engine never runs them, so they hold no area red and block no commit: report them from the baseline record, don't fight them.

## Preserved conventions

- **Commit discipline**: small commits, one logical unit each — cheap revert is the point. Commit after gates pass; fix
  rounds commit separately (`fix:`); explicit paths only, never `git add -A`; match `git log` style; never `--no-verify`;
  never push. Mutations run inside the engine via serialized `world.run("git", …)` — coordinator and implementers never touch git.
- **Gates re-run for every area touched so far** each round; fixes regress earlier passes; claimed green vs red in-script run: red wins.
- **Fresh auditors never judge fixes they inspired** — judges fresh and blind each round; fixers are the original implementers (same named agents — context survives within a run only; every fresh CreateWorkflow launch starts empty).
- **Vision findings are never self-confirmed** — the vision node stamps every finding `unconfirmed`; the judge
  is blind to their content (round numbers only) but receives their evidence PATHS and can re-derive them. Only
  judge + confirmer reproduced findings become fix targets; a re-derived-nowhere vision FAIL blocks a clean exit
  (POLICY 1); console/network errors count; comparability rides on evidence= — the engine has no checklist.
- **Honesty**: unconfirmed findings labelled, never dropped; unverified stays unverified — a pro run that cannot view
  pixels says so and marks those items unverified; half-done work stays on disk, listed in the report.

## Fallback lanes

- **Escalation bridge (mid-run vision needs).** A blocked subagent escalates; only it parks; the main agent resolves via
  Agent-tool subagents of any tier (general-pro, general-flash). Batch ONE escalation per area carrying ALL its screenshots; cap 3.
- **Interactive desktop lane.** Official computer-use / browser-use plugins are session-bound host bridges — NOT usable inside
  workflow runs. Interactive desktop hand-driving is the MAIN THREAD's lane, between runs; `ocu` (AX text + decoded PNGs) is the in-run lane.

## Final report (coordinator)

From the last judge run's typed return plus the run's artifacts (final markdown report primary, status board alongside):
rounds spent, gate status per category, baseline reds, findings fixed vs deferred, changed paths (implement returns, per shas held),
evidence paths (.zflow/evidence/ listing), half-done work (git status), user-left items — and the `subagent_model` per node.
