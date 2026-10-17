---
name: shipflow
description: >-
  Framework-agnostic GitHub issue pipeline as a profile of z-workflow: each cycle takes one
  pipeline:ready issue through a fresh planner-written script (claim, plan, parallel
  specialist lanes, baseline gates, fresh judges, security audit, evidence, publication, PR,
  policy-coded merge, close-out) with no saved engine. Runs only when the user explicitly
  authorizes working a labelled issue queue.
---

# shipflow

Shipflow is `z-workflow` applied to a GitHub issue queue. One cycle is one issue and one
fresh z-workflow run, always on the COMPLEX path because the issue text is off-repo
material. There is no saved engine: every cycle script is written new by the
`workflow-planner` and `workflow-author` chain, reviewed, and launched through the normal
approval dialog. The main agent is the composer-coordinator under Pillar 9; it loops over
cycles holding only issue numbers, labels, counts, refs, paths and exit codes.

What Shipflow overrides in z-workflow: the run publishes exactly one run-owned branch, opens
a PR, may merge it remotely under a coded policy, mutates GitHub labels and comments, and
skips Step 6. Everything else (Area definition, signals, dials, budget, git rules, fresh
eyes, stop rule, evidence labels, persona kit) is z-workflow unchanged.

Install per project with [INSTALL.md](INSTALL.md). Cycle-script contract:
[references/cycle-contract.md](references/cycle-contract.md). Planner brief extension:
[references/brief-extension.md](references/brief-extension.md). Gate discovery:
[references/gates.md](references/gates.md). Role checklists:
[references/review-checklists.md](references/review-checklists.md).

## When to Use

Use it only when the user explicitly asks to work the labelled queue (`shipflow`, "work the
queue", "run the pipeline:ready issues"). Never start a cycle unasked, never in the
background, and never with "Always allow in this session". For one issue the user describes
in chat, use `z-workflow` instead. Shipflow needs the project install (labels, pin issue,
`.zcode/shipflow.json`, the four queue agents) to have passed its verification checks.

## Coordinator loop (one iteration per cycle)

The coordinator never reads issue titles, bodies, comments or file contents. Each step below
returns compact data only.

1. **Stop checks.** Dispatch `z-queue-sentinel` (Agent tool) with the repo, pin issue and
   repo root. Stop the loop when it reports `pipeline:paused` on the pin issue, zero
   `pipeline:ready` issues, or an open `pipeline:watchdog` issue the user has not cleared.
   Relay its stale-claim rows; never act on them unasked.
2. **Pick by number only.** Run
   `gh issue list -R <repo> -l pipeline:ready --state open --search "sort:created-asc" --json number -q '.[0].number'`.
   The output is one integer. Nothing else about the issue enters the main thread.
3. **Anchors and config.** Capture `repoRoot`, `baseCommit`, `baseBranch`, `agentsMd` as in
   z-workflow Step 0, and the Shipflow config values with one `jq -r` call over
   `<repoRoot>/.zcode/shipflow.json` (`repo`, `pinIssue`, `tier`, `dryRun`, `commit`,
   `sizeBudget`, `mergeMethods`). Trigger is COMPLEX, reason "issue text is off-repo".
4. **Plan.** Dispatch `workflow-planner` (`workflow-planner-flash` when `tier` is `flash`)
   with the issue number, repo, anchors, the dynamic-workflows contract path, this skill's
   folder path, and the instruction to fill the `shipflow` brief extension
   ([references/brief-extension.md](references/brief-extension.md)) and to have the author
   write a script meeting [references/cycle-contract.md](references/cycle-contract.md).
5. **Not actionable.** When the brief's `triage.verdict` is not `actionable`, launch no
   workflow. Write the brief's `triage.question` to `<repoRoot>/.shipflow/triage-<N>.md`
   (git-ignored), then dispatch `z-gh-operator` with exactly these ops on that issue:
   comment with that body file, `label-remove pipeline:ready`, `label-add pipeline:backlog`.
   Relay its op rows and go to the next iteration. This is not a failed cycle.
6. **Pre-flight.** Run z-workflow Step 4 in full with the REVIEW dial forced on: snippet and
   parser rehearsal, persona-kit drift check, command-set extraction, budget check, and a
   fresh `workflow-author` REVIEW. Also check the cycle contract's required phases in order
   (one `grep -c` per phase literal) and the refusal list in
   [references/gates.md](references/gates.md). Defects go back to the author; the
   coordinator never edits script logic.
7. **Approve.** Show the command set grouped as: gates (with baseline results), read-only git,
   git mutations (one `git fetch origin <defaultBranch>` only when the brief says
   `defaultHead` is missing locally, worktree add, `add -N`, commit, merge into
   integration), GitHub mutations
   (each `gh issue edit`, `gh issue comment`, `gh pr create`, and the merge argv the steward
   may run), publication (the single push refspec), capture and preview commands, plus
   signals, dials, band, model per role, persona paths with sha256, and `dryRun`/`commit`.
   Choose "Allow only this time".
8. **Launch** one `CreateWorkflow` named `zflow-shipflow-<N>`. Do not poll.
9. **Relay** the CycleReport: outcome, PR URL, reviewed SHA, gates, findings with labels,
   evidence paths, personas, notCovered, report path.
10. **Count.** Outcomes `failed` and `refused` add one to the consecutive-failure counter;
    `merged` resets it; `open`, `released` and `dry-run` leave it unchanged. Two in a row
    stops the loop.

z-workflow Step 6 (local fast-forward into the user's checkout) is skipped: a cycle's
delivery is the remote PR, and the user's checkout is never written.

## Overrides of z-workflow

| z-workflow step | Shipflow override |
|---|---|
| Step 0, triage | Trigger always COMPLEX. Signals measured by the planner as usual; `R` is at least `medium` because the cycle changes a shared remote. |
| Step 1, explore | The planner also fills the `shipflow` extension: untrusted issue data with hash and `updatedAt`, triage verdict, default branch and head, merge methods, required checks, protection, leftover branch and PR, pin issue, labels, gates with baselines. |
| Step 2, shape | Always a per-area pipeline (pattern 10) with gated verifier loops (9), a counted feedback loop (12) from cross-area findings back to owning lanes, and the cycle contract phases. Lanes run in parallel; each writing area gets its own worktree. |
| Step 3, author | Script follows [references/cycle-contract.md](references/cycle-contract.md). Persona kit pasted unchanged. |
| Step 4, pre-flight | REVIEW dial forced on. Contract-phase check and gate refusal check added. |
| Step 5, approve | Two extra command groups: GitHub mutations and publication. |
| Step 6, delivery | Skipped. Delivery is the PR and, under policy, the remote merge. |
| Git rules | One exception: the publication push in the D5 form below. Everything else in z-workflow's forbidden list stays forbidden. |
| Final report | CycleReport (a superset of the z-workflow report) written to `.shipflow/cycle-<N>.md`. |

## Role map

| Old queue role | Now |
|---|---|
| scout | `explore-flash` (dispatched by the planner) |
| issue-triage | planner `triage` verdict; `z-github-project-manager` read-only when board or dependency judgement is needed; `z-gh-operator` for the label and comment |
| task-planner | `workflow-planner` |
| plan-auditor | `workflow-author` REVIEW, plus the plan-attack dial when `R` = high |
| per-stack implementer and reviewer | the area's `z-*` specialist from `harness/zcode/skills/z-workflow/references/specialists.md`; review is a fresh read-only instance of the same file |
| perf-engineer | `z-rust-perf-engineer`, the stack's specialist, or `general-pro` |
| qa-writer, fixer | the area implementer (tests belong to the area; `test-quality-tdd-agents` skill) |
| copywriter | `general-pro` with the `antislop-copy` skill |
| browser-tester | script `world.run` capture; `general-flash` capture driver only for a long-running server |
| vision-judge | `general-flash` blind vision auditor, then command checks |
| security-audit, injection-auditor | `z-security-auditor` |
| pr-reviewer | fresh `general-pro` cross-area judge with the PR-body drift check |
| gh-ops | `z-gh-operator` |
| pr-merger | `z-pr-merge-steward` |
| queue-monitor | `z-queue-sentinel` |

## Authority and git

- **Workspace.** All writing happens in run-owned worktrees under
  `<repoRoot>/.zflow/worktrees/`, created from the measured default-branch head. The
  integration branch is `wf/shipflow-<N>`; parallel writing areas use
  `wf/shipflow-<N>-<area>` and merge into it through the serialized git chain. The user's
  checkout and current branch are never touched. Documented exemption: the cycle report
  `<repoRoot>/.shipflow/cycle-<N>.md`, requirement, comment and PR body files under
  `.shipflow/`, and
  evidence under `<repoRoot>/.zflow/evidence/`, all git-ignored.
- **Publication (the only push).**
  `git -C <integration-wt> push origin refs/heads/wf/shipflow-<N>:refs/heads/wf/shipflow-<N>`,
  once, through the git chain, after review. No `-f`, no `--force*`, no other refspec. A
  rejected push ends the cycle `open` or `failed` with the stderr tail; it is never retried
  with other flags.
- **GitHub mutations** go through `z-gh-operator` with an exact op list; the script re-reads
  with `gh issue view`/`gh pr view` and only that re-read counts as verified. PR bodies and
  comments pass through `--body-file`, never inline text.
- **Merge** is decided by script code (the predicate in the cycle contract) and executed by
  `z-pr-merge-steward` in `merge` mode with `--match-head-commit <reviewedSha>`. A PR the
  same account authored stays open "awaiting review"; nothing self-approves.
- **dryRun** claims and comments, skips publication, PR and merge, never sets
  `pipeline:done`, restores `pipeline:ready`, and reports outcome `dry-run`. **commit=false**
  leaves work uncommitted in the run worktrees, opens no PR, and reports outcome `open`.

## Evidence and runtime coverage

Labels are z-workflow's: verified (a command in this run produced it), judged, unconfirmed.
A confirmer's reproduction makes a finding verified and a fix target that loops back to the
owning implementer. When `V` is `web`, the lane captures by `world.run` (a blocking Bun
helper that starts the preview on port 0 and stops it in `finally`), then a blind flash
vision audit, then command checks. When `V` is `desktop` or `mobile`, captures go through one
single-worker device lane with `z-native-device-verifier`. Every preview or device session
the cycle started is stopped in the cleanup phase, which runs even after a failure. Web
evidence never stands in for native behaviour; uncovered surfaces go to `notCovered`.

## Stop rules

Stop the loop when: the queue is empty; the user stops; the pin issue carries
`pipeline:paused`; two consecutive cycles end `failed` or `refused`; the planner cannot
produce a brief twice for the same issue; or the watchdog has opened an issue. Inside a
cycle, every loop uses the z-workflow stop rule with the dial round cap. The watchdog only
notifies; it never relaunches anything.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: Pillars 1-9, Steps 0-6, git rules, Vision phase,
  persona kit, evidence labels.
- `harness/zcode/skills/z-workflow/persona-kit.dwf.ts` and
  `harness/zcode/skills/z-workflow/references/specialists.md`.
- `harness/zcode/agents/workflow-planner.md`, `harness/zcode/agents/workflow-author.md`.
- `harness/zcode/agents/z-gh-operator.md`, `harness/zcode/agents/z-pr-merge-steward.md`,
  `harness/zcode/agents/z-queue-sentinel.md`, `harness/zcode/agents/z-security-auditor.md`,
  `harness/zcode/agents/z-native-device-verifier.md`.
- `harness/zcode/skills/z-proflow/SKILL.md` and `harness/zcode/skills/z-tauri-workflow/SKILL.md`:
  how a profile overrides z-workflow.
- The retired saved queue (`harness/zcode/workflows/shipflow-queue.dwf.ts` in git history):
  label state machine, optimistic claim, retry lane, size budget, merge policy and cycle
  report, reused as knowledge only.
