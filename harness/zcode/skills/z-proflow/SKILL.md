---
name: z-proflow
description: >-
  z-workflow on the pro model only, with no vision: the same triage, dials, author, git
  safety, approval, and merge question, but every role runs on GLM-5.3, no Flash model is
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
| Step 1, explore | Explorers use the `Explore` agent or `general-pro`, never a Flash agent. |
| Step 2, shape | Dispatch `workflow-author` (pro) and put `profile: pro` in the brief. |
| Model matrix | Every `model()` literal in the script is `account:zai-individual-coding-plan/GLM-5.3` (a `$level` suffix is allowed). No Flash literal may appear. Tracers, confirmers, and citation checkers run on pro. |
| Pillar 3 (one flash role) | Does not apply. |
| Vision phase | Absent: no screenshots, no capture, no image reading by any agent. |
| Visible requirements | Checked by commands where possible (for example `agent-browser get text`, `is visible`, or a computed-style `eval`, which read the page without screenshots); anything left is listed under notCovered as "not checked visually". |
| Final report | States that every model was pro and that no visual check ran. |

Before launch, check the script with one command, for example
`grep -c 'Flash' <script>` (must print 0) and a search for `screenshot` (must find none),
and include the result with the command set. A Flash literal or a screenshot step goes
back to the author.

## Rules that do not change

Everything else is z-workflow: Area definition, the signals and dials (except Vision),
the complexity budget, git rules, "Allow only this time" approval, the merge question, the
stop rule, confirmers when risk is medium or high, and honest reporting.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: the workflow this skill follows.
- `harness/zcode/agents/workflow-author.md`: the pro author and its `profile` rule.
