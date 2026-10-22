---
name: z-proflow
description: >-
  z-workflow on the pro model only, with no vision: the same triage, dials, author, git
  safety, approval, and Step 6 merge, but every role runs on GLM-5.3, no Flash model is
  used anywhere, and no screenshot is captured or read. Visible requirements are checked by
  commands or reported as not covered. Runs only when the user asks for it.
---

# z-proflow

z-proflow is z-workflow with two changes: every role runs on the pro model, and the vision
phase is off. It is for work where review quality matters more than cost or speed, and
where nothing needs to be judged from pixels. Everything else follows z-workflow unchanged.

## When to Use

Use it when the user asks for z-proflow, or for judgment-heavy work (architecture,
concurrency, security-sensitive code, tricky refactors) with no visual requirement. If the
task's main requirement is visual, say that z-proflow does not look at the screen and
suggest z-workflow; run z-proflow only if the user still wants it.

## How to run it

Load and follow `z-workflow` (its `SKILL.md`, from this session's skills) step by step,
with these overrides:

| z-workflow step | z-proflow override |
|---|---|
| Step 0, triage | Measure the visible-surface signal `V` as usual, but force the Vision dial off. |
| Step 1, explore | The planner is `workflow-planner` (pro); explorers it dispatches use the `Explore` agent or `general-pro`, never a Flash agent. |
| Step 2, shape | The planner dispatches `workflow-author` with `profile: pro` in the brief; on the planner's brief-only fallback the coordinator dispatches it with `profile: pro`. |
| Model matrix | Every instantiated agent uses `account:zai-individual-coding-plan/GLM-5.3` (a `$level` suffix is allowed). Every `loadPersona` call forces `tier: "pro"`. The unchanged persona kit may declare both tiers. Tracers, confirmers, and citation checkers run on pro. |
| Pillar 3 (one flash role) | Does not apply. |
| Vision phase | Absent: no screenshots, no capture, no image reading by any agent. |
| Visible requirements | Checked by commands where possible (for example `agent-browser get text`, `is visible`, or a computed-style `eval`, which read the page without screenshots); anything left is listed under notCovered as "not checked visually". |
| Final report | States that every model was pro and that no visual check ran. |

Before launch, inspect every agent constructor and persona load: require pro model selections
and explicit `tier: "pro"`, with no capture, screenshot, or image-reading stage. Exempt only
the unchanged marked persona-kit block's shared model declarations. Include this check with
the command set; any Flash selection or visual stage goes back to the author.

## Rules that do not change

Everything else is z-workflow: Area definition, the signals and dials (except Vision),
the complexity budget, git rules, "Allow only this time" approval, the Step 6 merge, the
stop rule, confirmers when risk is medium or high, and honest reporting.

Checkout delivery follows Step 6 without another prompt for eligible clean low/medium-risk
runs: verify the original destination branch and base HEAD, require a clean checkout,
fast-forward the completed result, then rerun all gates. High risk or review-first requires
approval; no-merge/read-only work is never delivered automatically.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: the workflow this skill follows.
- `harness/zcode/agents/workflow-author.md`: the pro author and its `profile` rule.
