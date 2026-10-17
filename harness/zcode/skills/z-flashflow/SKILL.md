---
name: z-flashflow
description: >-
  z-workflow on Flash only: the same triage, dials, planner, author, git safety, approval, and guarded automatic
  fast-forward, but every model in the run (planner, explorers, workflow-author, implementers, judges,
  tracers, vision) is GLM-5.3-Flash and no pro model is used anywhere. Judge verdicts are
  labelled judged, never verified. Runs only when the user asks for it.
---

# z-flashflow

z-flashflow is z-workflow with one change: no pro model anywhere. It is the cheapest and
fastest full workflow, for tasks where gates and commands can check most of the result.
Everything else, including the dials, the complexity budget, the git rules, the vision
phase, and the Step 6 merge, follows z-workflow unchanged.

## When to Use

Use it when the user asks for z-flashflow, or for a fast, cheap run of a task whose result
is mostly checkable by commands (tests, builds, greps, computed-style checks). For work
where quality can only be judged by review (architecture, security, subtle concurrency),
say that a Flash judge cannot be relied on there and suggest z-workflow or z-proflow; run
z-flashflow only if the user still wants it.

## How to run it

Load and follow `z-workflow` (its `SKILL.md`, from this session's skills) step by step,
with these overrides:

| z-workflow step | z-flashflow override |
|---|---|
| Step 1, explore | The planner is `workflow-planner-flash`; explorers it dispatches use the `explore-flash` agent, never `Explore` or a pro agent. |
| Step 2, shape | The planner dispatches the `workflow-author-flash` agent (not `workflow-author`) with `profile: flash` in the brief; on the planner's brief-only fallback the coordinator dispatches it with `profile: flash`. |
| Step 4, REVIEW | When the REVIEW dial is on, the fresh reviewer is also `workflow-author-flash`. |
| Model matrix | Every instantiated agent uses `account:zai-individual-coding-plan/GLM-5.3-Flash` (a `$level` suffix is allowed). Every `loadPersona` call forces `tier: "flash"`. The unchanged persona kit may declare both tiers. |
| Pillar 3 (one flash role) | Satisfied by every role. |
| Labels | Judge and confirmer findings are labelled judged, never verified. Only commands (gates, greps, purity checks, computed-style checks) produce verified results. |
| Final report | States that every model was Flash and lists the judged findings separately from the verified ones. |

Before launch, inspect every agent constructor and persona load: require Flash model
selections and explicit `tier: "flash"`. Exempt only the unchanged marked persona-kit
block's shared model declarations. Include this check with the command set; any pro
selection goes back to the author.

## Rules that do not change

Everything else is z-workflow: Area definition, the four signals and the dials, the
complexity budget, the vision phase (capture by command, blind Flash audit, command check
per row), git rules, "Allow only this time" approval, the Step 6 merge, the stop rule,
and honest reporting. Checkout delivery follows Step 6: a complete clean low/medium-risk
run may fast-forward automatically only into the captured destination branch at its unchanged
base HEAD, followed by all gates. High risk or review-first requires approval; an explicit
no-merge request and read-only runs never merge.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: the workflow this skill follows.
- `harness/zcode/agents/workflow-planner-flash.md`: the Flash planner.
- `harness/zcode/agents/workflow-author-flash.md`: the Flash author.
- Verification campaign `dwfrun-d14998c7`: Flash judges passed properties with no
  independent check, which is why their verdicts stay judged.
