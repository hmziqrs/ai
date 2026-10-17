---
name: z-liteflow
description: >-
  Light z-workflow for small, single-area tasks: the coordinator fills in one pre-tested
  script (implement, gate, flash tracer, fresh pro judge, round cap 2 or 3) and launches it,
  with no explorers, no workflow-author, and no pre-launch review, so it starts fast. Work
  lands on a run-owned branch; merging into the user's checkout needs a yes. Anything bigger
  hands off to z-workflow. Runs only when the user asks for it.
---

# z-liteflow

z-liteflow is z-workflow for small work, tuned to start fast and never grow complex. It
keeps z-workflow's safety rules (run-owned worktree, safe git, approval, merge question,
honest labels) and drops the parts that make a run slow to start: per-area explorers, the
workflow-author loop, and the pre-launch REVIEW. Instead of authoring a script, the
coordinator fills six constants in `liteflow-template.dwf.ts` (next to this file) and
launches it.

## When to Use

Use it only when every check below passes. Measure them with commands, as in z-workflow
Step 0.

| Check | Liteflow limit | Otherwise |
|---|---|---|
| Areas (z-workflow Area definition) | exactly 1 | hand off to z-workflow |
| Changed files | 1 to 5 | hand off to z-workflow |
| Risk | low, or medium only for edits to existing tests the task allows | hand off to z-workflow |
| Uncertainty | low (the task fixes the behaviour and API) | hand off to z-workflow |
| Visible surface | none (no capture or vision phase in liteflow) | hand off to z-workflow |
| Gate | the repo has one command that checks the change | hand off to z-workflow |

A hand-off is a sentence to the user naming the failed check, not a silent upgrade.

## The run (fixed shape)

One lane in one run-owned worktree at `<repo>.wf-<slug>` (a sibling folder, so the user's
checkout gets no `.zflow/` files), on branch `wf/<slug>`, branched from the base commit.
Per round:

1. **Implementer** (pro, one agent kept across rounds) makes the change, or fixes the last
   round's open findings.
2. **Purity check** (no model): `git status --porcelain -z` in the worktree; any changed path
   outside the allowed files is a verified finding.
3. **Gate** (no model): the repo's own command, run inside the worktree.
4. **Tracer** (flash, new each round): one row per requirement with an exact line; the
   script greps every quote, and only unmatched rows go to the judge.
5. **Judge** (pro, new each round): reads the diff, the gate result, and unmatched rows.
   Its findings are labelled judged.

Stop rule as in z-workflow: zero open findings, two rounds without the open count dropping,
or the cap (2 for 1 to 3 files, 3 for 4 to 5). After the loop the script stages only the
allowed files, makes one commit on `wf/<slug>`, and compares the user's `git status` before
and after the run; any difference is a verified finding.

Asks per round: 3 (implementer, tracer, judge). Roles: 3. Worktrees: 1.

## Coordinator steps

1. **Measure** the checks above. Verify `repoRoot`, the base commit (`git rev-parse HEAD`),
   and the gate (run it once; it must exit 0 on the base). Never edit the user's checkout
   to make the run work: no `.gitignore` edits, no helper files, no commits. A gate that
   needs a helper means the task is not a liteflow task.
2. **Fill the template.** Read `liteflow-template.dwf.ts` from this skill's folder and
   replace only the six constants: `TASK` (verbatim), `REPO`, `BASE`, `SLUG` (short,
   lowercase, unique: no existing `wf/<slug>` branch), `FILES` (every file the task may
   change), `GATE` (`{tool, args}`, the repo's own command), and `CAP`. Change nothing else.
3. **Show the command set** before launch: `git` (worktree add, status, grep, diff, add,
   commit in the run worktree only) and the gate command, with the worktree path and branch.
4. **Launch** with CreateWorkflow (inline script, `name: "zflow-lite-<slug>"`). Approve with
   "Allow only this time", never "Always allow".
5. **Merge question.** Show the branch, `git diff --stat <base> wf/<slug>`, and the gate
   result, then ask with AskUserQuestion. Without a yes, stop and report the branch. On a
   yes, check that the checkout is clean, merge with one command, check the exit code, and
   run `git merge --abort` on a conflict. Never copy the diff into the checkout by hand.

## Rules carried from z-workflow

- Safe git only: no `checkout --`, `reset --hard`, `clean`, `--force`, `branch -D`, `push`,
  `stash`, `rebase`, `add -A`, or `--no-verify`. Every git call's exit code is read.
- Labels: verified (a command showed it), judged (a judge said so), unconfirmed. A judge's
  word never becomes verified.
- Never weaken or delete a test or gate to make it green; a wrong-looking test is a finding.
- The coordinator never edits the filled script's logic. If the template itself is wrong,
  stop, report it, and run the task with z-workflow instead.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: Area definition, signals, stop rule, git
  rules, approval, merge question, labels.
- `liteflow-template.dwf.ts` in this folder: the script, type-checked against the
  `dynamic-workflows` facade (§16.2) with `tsc --strict`.
- Run evidence: the static engine's flash-profile runs, the z-workflow spec-s run (280
  lines for a one-lane task), and the persona probe `dwfrun-ee616ce6`.
