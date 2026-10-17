---
name: z-flashflow
description: >-
  z-workflow on Flash only: the same triage, dials, author, git safety, approval, and merge
  question, but every model in the run (explorers, workflow-author, implementers, judges,
  tracers, vision) is GLM-5.3-Flash and no pro model is used anywhere. Judge verdicts are
  labelled judged, never verified. Runs only when the user asks for it.
---

# z-flashflow

z-flashflow is z-workflow with one change: no pro model anywhere. It is the cheapest and
fastest full workflow, for tasks where gates and commands can check most of the result.
Everything else, including the dials, the complexity budget, the git rules, the vision
phase, and the merge question, follows z-workflow unchanged.

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
| Step 1, explore | Explorers use the `explore-flash` agent, never `Explore` or a pro agent. |
| Step 2, shape | Dispatch the `workflow-author-flash` agent (not `workflow-author`) and put `profile: flash` in the brief. |
| Step 4, REVIEW | When the REVIEW dial is on, the fresh reviewer is also `workflow-author-flash`. |
| Model matrix | Every `model()` literal in the script is `account:zai-individual-coding-plan/GLM-5.3-Flash` (a `$level` suffix is allowed). No pro literal may appear. |
| Pillar 3 (one flash role) | Satisfied by every role. |
| Labels | Judge and confirmer findings are labelled judged, never verified. Only commands (gates, greps, purity checks, computed-style checks) produce verified results. |
| Final report | States that every model was Flash and lists the judged findings separately from the verified ones. |

Before launch, check the script with one command, for example
`grep -c -E 'GLM-5\.3(\$[a-z]+)?"' <script>` (pro literals, must print 0) plus a count of Flash literals, and include
the result with the command set. A pro literal in the script goes back to the author.

## Rules that do not change

Everything else is z-workflow: Area definition, the four signals and the dials, the
complexity budget, the vision phase (capture by command, blind Flash audit, command check
per row), git rules, "Allow only this time" approval, the merge question, the stop rule,
and honest reporting.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: the workflow this skill follows.
- `harness/zcode/agents/workflow-author-flash.md`: the Flash author.
- Verification campaign `dwfrun-d14998c7`: Flash judges passed properties with no
  independent check, which is why their verdicts stay judged.
