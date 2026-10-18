---
name: shipflow
description: >-
  Autopilot: PRD-driven autonomous delivery on GitHub as a profile of z-workflow, with modes
  setup, plan, publish, implement, kickoff, dispatch, audit and supervised. GitHub mechanics are tested code (the GitHub kit),
  the standard task cycle is a pre-tested template, and policy is enforced by GitHub rulesets
  and ZCode hooks. Runs only when the user explicitly asks for one of its modes.
---

# shipflow (autopilot)

Shipflow can set up a repository, plan a product, publish its tasks, implement approved tasks,
or compose those phases for an end-to-end request. A one-line prompt can request any of these.
The requested phase and detail level decide the work, not prompt length. Five rules shape it:

- The owner only prompts (D17). The harness generates every artifact: the charter, discovery,
  PRD, tasks, issues, the Project, labels, milestones, the ruleset, CI and hook configuration.
  Fixture JSON in this skill is test data for the check scripts, never owner input.
- Local PRD files hold an unpublished plan. After publication, GitHub holds delivery state:
  issues, sub-issues, labels, pull requests, checks and comments.
- Code does the mechanics. The GitHub kit claims, transitions, reconciles and merges, and the
  snapshot picks the next action. Agents judge: they write, critique, implement and review,
  and a command must confirm each verdict before it counts.
- The main thread never mutates GitHub and never reads issue bodies. Every GitHub write
  happens inside a bounded run, through the kit, or in the owner's setup run (Mode: setup).
- No saved engines. Each run is written for its job. The only reusable code is pasted and
  drift-checked: the persona kit, the GitHub kit, z-liteflow's template and the task-cycle
  template.

## When to Use

Map the user's intent to a mode; exact trigger phrases are not required. A request for a
PRD does not authorize publication or implementation. Reuse an existing session-wide
workflow allowance within the requested scope. For a single coding task without PRD or
queue work, use `z-workflow`.

| Mode | Trigger phrases | Needs installed (INSTALL.md) |
|---|---|---|
| `setup` | "Set up autopilot for this repository"; "change the review mode to auto" (re-runs setup) | `z-project-init` with Shipflow and a `gh` login with admin on the repository |
| `plan` | "Write a detailed PRD", "expand this section", "plan tasks for LB-2" | `prd-authoring`; local prompt/files. No GitHub account, Project, delivery charter or executable tests required |
| `publish` | "Create GitHub issues and a Project from this approved plan" | Reviewed local PRD/task files; GitHub access and publication helpers |
| `implement` | "Implement these published tasks", "build the approved plan now" | Delivery install, charter and existing approved/published tasks |
| `kickoff` | "Plan and publish this project" | Planning and publication prerequisites; stops before implementation |
| `dispatch` | "Build this small project end-to-end", "continue end-to-end delivery" | Explicit authority for all requested phases; delivery installation before building |
| `audit` | "Audit the delivered project" | Delivery install and requested audit scope |
| `supervised` | `shipflow supervised`, "work the queue with per-cycle review" | Repository and labels; per-cycle product review |

These modes are the workflow contract. The GitHub kit, reconciler, snapshot, fill-cycle, setup
and helper scripts now exist; the task-cycle template is being added. Check prerequisites before
a delivery launch and report missing pieces. GUI behaviour and live GitHub are verified by the
owner's test playbook (`references/test-playbook.md`), not by these docs; never claim that
publication, Project sync or unattended delivery was tested from these docs.

## Independent phases

- `plan` accepts project, section, feature or milestone scope and overview, section, feature or
  task detail. A detailed whole-project PRD includes the overview, sections, features,
  fine-grained tasks, dependencies, criteria and named checks. Use `task_breakdown: upfront`
  for that request; rolling breakdown remains an option for ongoing delivery.
- Run only missing prerequisites. Reuse existing parent context and stable ids. Proposed paths
  in an empty project are assumptions; recheck them against live code before implementation.
- Return a review handoff with file paths and hashes (or a commit), a readable overview,
  task/dependency summary and unresolved decisions. Do not write GitHub issues, publish a PR,
  create a Project, implement code or scaffold tests during planning-only work.
- `publish` uses the reviewed version after the user authorizes publication. It creates or
  links the requested GitHub Project, syncs epics/features/tasks and dependencies, and verifies
  Project membership. It ends with links and a sync report. Project-sync failure means partial
  publication, not success. Publication alone does not start implementation.
- `implement` uses existing approved tasks without rebuilding the PRD. For explicitly named
  issues, have the author write a run limited to those ids; do not start a whole-queue loop.
  For implementation of the published queue, snapshot uses `--mode implement`. Missing planning, missing publication, blocked tasks needing scope
  decisions or an undecomposed milestone return `needs-plan`. An old plan is checked against
  current code; changes to intent return for review. Independent test authors prepare
  executable acceptance tests before implementers start.
- `dispatch` passes `--mode dispatch` only when the prompt authorizes composed delivery. It
  can plan, publish and implement without another human turn for a small, clear project with
  `prd_approval: auto`. Complex or niche requirements use human review at the requested
  handoffs. A reference URL does not grant publication or implementation authority.
- Workflow permission is separate from PRD approval. Session-wide permission never overrides
  a planning-only stop or a requested human review. See design decisions D13-D17 (section 0.1).


## What lives here

Paths are relative to the installed folder, `.zcode/skills/shipflow/` in the project.

| Path | Purpose |
|---|---|
| `SKILL.md`, `INSTALL.md` | This contract; the per-project install and its verification table |
| `github-kit.dwf.ts` | GitHub mechanics: claim, transitions, reconcile writes, merge train; pasted unchanged into runs |
| `task-cycle-template.dwf.ts` | Pre-tested standard task cycle; `fill-cycle.ts` fills only its marked region |
| `scripts/prd-lint.ts` | Lints the PRD at stage s2, s3 or s5; `--emit-index` writes `prd/index.json` |
| `scripts/reconcile.ts` | Plans and applies the PRD-to-GitHub sync through the kit; `--labels-only` prepares a repository |
| `scripts/setup.ts` | Owner-invoked setup (Mode: setup); `--sync-checkout` updates the owner's checkout after a merged setup |
| `scripts/snapshot.ts` | Dispatcher JSON of ids and counts, plus the `decide()` decision |
| `scripts/fill-cycle.ts` | Fills the task-cycle template for chosen issues; `--verify` detects drift |
| `scripts/run-gate.ts` | Runs charter gates in CI and locally; `--gate protected` checks protected paths |
| `scripts/preview.ts` | Starts and stops one lane's preview server |
| `scripts/post-review.ts` | Optional: posts `ai-review` as a check run when a reviewer App is configured; the default is a commit status posted through the kit |
| `scripts/lib/prd.ts`, `lib/kit.ts`, `lib/charter.ts` | PRD parser and lint rules; kit loader; charter parser and lookups |
| `scripts/lib/detect.ts` | Detects gates, preview and areas from manifests when the charter leaves them empty |
| `scripts/fixtures/` | Valid PRD project, one violation per lint rule, saved GitHub inputs |
| `hooks/policy.ts`, `hooks/hooks.json` | ZCode PreToolUse and PermissionRequest policy, and the block merged into the project config |
| `templates/autopilot.yaml` | Example of the charter `setup.ts` generates |
| `templates/ruleset-main.json`, `ci.yml`, `watchdog.yml` | Branch ruleset; CI workflow (jobs `ci`, `acceptance`, `parity`); notify-only stall check on a GitHub Actions schedule |
| `references/*.md` | Operating references, listed in section 11 |

## Coordinator rules

The main thread is the composer-coordinator (z-workflow Pillar 9). It holds only ids, counts,
paths, exit codes and run results. It never mutates GitHub and never reads issue bodies, PRD
text or code. Its one exception is the owner's setup run (Mode: setup).

- It runs only `bun scripts/snapshot.ts`, `bun scripts/fill-cycle.ts` and its `--verify`, the
  drift checks in `references/dispatch.md`, read-only `gh` queries that print numbers or label
  names, `CreateWorkflow`, and Agent dispatch of `workflow-planner` or `workflow-author` for a
  bespoke run. It runs `bun scripts/setup.ts` only for an explicit setup prompt, as in Mode: setup.
- The scripts read bodies; their output is ids, counts, paths and exit codes.
- Load the `dynamic-workflows` skill before any `CreateWorkflow` (z-workflow Step 3).
- One active run per project. Never poll; completion arrives as a notification.
- Pass each run's script unchanged. A defect goes back to the author, never into a coordinator
  edit.
- Start a fresh session per milestone, or when context passes about 60% (`references/dispatch.md`).
  Resume unpublished planning from the local files and review handoff; published delivery
  state is on GitHub.

## Mode: setup

`scripts/setup.ts` runs only on an explicit setup prompt ("Set up autopilot for this repository";
"change the review mode to auto"), with the owner's `gh` login, which needs admin access. It is
the one owner-invoked GitHub mutation on the main thread. Run it with `--dry-run` first to show
the plan (reads happen, writes are only planned), then for real. In order:

1. Generates `autopilot.yaml` from the prompt and repository inspection, keeping values already on the default branch.
2. Confirms or creates the labels and milestones.
3. Finds or creates the PRD issue (`kind:prd`) and pins it.
4. Finds or creates the GitHub Project; a failure is a warning.
5. Opens one setup PR with the generated and installed harness files, and merges it through the kit.
6. Applies the autopilot ruleset from `templates/ruleset-main.json`; a re-run waits for its checks first. `ai-review` stays a commit-status context; setup adds an `integration_id` to it only when a reviewer App is configured.

The prompt maps to flags: `--reference`, `--approval`, `--breakdown`, `--lanes`, `--project-title`,
`--instance`, `--no-ruleset`. Re-running with new options is how the owner changes a setting.
`--sync-checkout` fast-forwards the owner's default-branch checkout after a merged setup. Untracked
files identical to, or regenerable into, the merged version move to `.zflow/setup-backup/`; a
differing file stops the sync and nothing moves. Planning (`plan`) needs no setup.

## Mode: kickoff

Kickoff composes `plan` and `publish`, then stops. Follow the independent-phase rules above.
Each requested stage is a bounded run with its own gate. The same stages can run separately.

| Stage | Output | Who | Gate |
|---|---|---|---|
| S1 Recon | Scoped discovery pack or research and assumptions | Recon specialist and summariser | Evidence covers requested scope |
| S2 Overview | `prd/prd.md` | `z-product-owner` in PRD mode | `prd-lint.ts --stage s2`; critics |
| S3 Sections | Sections, features, Given/When/Then criteria | Scoped PRD writers and cross-section review | `prd-lint.ts --stage s3`; critics |
| S5 Tasks | Fine-grained task rows for the requested scope | `z-product-owner` in PLAN mode | `--stage s5 --decomposed <milestones>` or `--stage s5 --features <ids>` |
| S6 Publish | Approved plan on GitHub plus Project view | Reconciler and Project-sync run | Repeated sync changes nothing; verify links and membership |
| S4 Acceptance preparation | Executable acceptance/parity tests against a scaffold | Independent test authors | Runs only with implementation authorization; checks assert the criteria |

Stage identifiers are stable names, not mandatory numerical order. A planning request can do
S1-S3-S5 and stop. Named test paths are enough for a plan; S4 needs a runnable scaffold and
belongs to implementation preparation. Scope-limited work reads dependencies but does not
expand sibling task lists. Do not pad a small product to meet recommended section counts.

- Recon honours `robots.txt`, rate limits and execution crawl limits; no form submission or sign-in.
- Critics stop at zero high findings, two rounds without improvement, or three rounds. Log open
  findings. In human-review mode, unresolved intent questions go to the owner before publication.
- Default to `human` for a plan/review request or niche/complex requirements. Use `auto` when
  the owner authorizes a small end-to-end build. `window` is an explicit asynchronous-review
  option within already-authorized delivery; it cannot advance a planning-only request.
- Local drafts need no remote issue or kickoff label. After publication, `kickoff:S<n>` can
  track remaining execution preparation. A successful S6 ends kickoff; it does not authorize S4.
- Discovery ids support expansions; gaps go into `prd/assumptions.md` with confidence and evidence.

## Mode: dispatch

Dispatch composes phases only within an end-to-end request. Implementation-only uses the same
turn with `--mode implement`; the helper defaults to that mode. Each turn:

1. Run `bun scripts/snapshot.ts --repo <root> --gh-repo <owner/name> --login <builder> --prd-issue <n> --charter autopilot.yaml --mode <dispatch|implement>`. It prints `{ snapshot, decision }`: ids and counts only.
2. Act on `decision.action`. Pass `decision.release` (stale claims, released first) and `decision.promote` (backlog issues moved to ready first) to the launched run.
3. When nothing launches, end the turn with a one-line status.

| `decision.action` | Launch |
|---|---|
| `task-cycles` | `fill-cycle.ts --repo <root> --charter autopilot.yaml --issues <list> [--release <list>] [--promote <list>] --slug <slug> --out <path>`, then `--verify <path>`, then `CreateWorkflow` with that `path` |
| `m0-only` | The same, limited to M0 issues, while the PRD window is open |
| `kickoff` | The stage in `decision.stage`; `S0` stops with "install incomplete" |
| `decompose` | A PLAN run by `z-product-owner` for `decision.milestone`; reconcile syncs the new tasks |
| `fix-main` | A bespoke fix run for the stop-the-line issues; merges stay paused until `main` is green |
| `advance` | A bespoke run on the `state:review` issues: rebase, fix findings, re-run checks |
| `unblock` | A bespoke run that splits, spikes or proposes a PRD change for the blocked tasks |
| `audit`, `finish` | Audit mode, below |
| `busy`, `paused`, `wait-approval`, `needs-plan`, `idle` | No launch; end the turn with a one-line status |

- **Approval.** The owner reports that allowing workflow creation once for the session suppresses later workflow dialogs. Reuse that allowance within the requested phases and charter; a new session may need its own allowance. S1 records installed-version behavior and chaining. PRD approval and per-cycle review are separate choices. The optional AXTree fallback is documented in `references/dispatch.md`; no helper is shipped.
- **Drift checks** run before every launch: `fill-cycle.ts --verify`, and `diff` of the persona-kit and GitHub-kit copies against their canonical files.
- **Chaining.** A run's return value wakes the session, and the next turn launches the next run with no user turn. No timer is assumed; spike S1 decides. An idle session resumes on a nudge through remote control or the next message.
- **Stopped or errored runs.** `ResumeWorkflowRun` once. If that fails, the next run releases the claim through the kit (`references/failure-policy.md`).

## Mode: audit

Audit is a bespoke run, started by the decision (`audit`) or on request. It runs in this order
(design 10):

1. Full L3 to L5 on `main`: acceptance, parity, NFR budgets, dependency and secret scans, run through `run-gate.ts`. A red result opens a `stop-the-line` issue.
2. Parity per archetype and the coverage matrix (`parity-testing` skill; [references/verification-ladder.md](references/verification-ladder.md)).
3. Gaps become `kind:bug` issues for regressions, or a PRD-change PR by `z-product-owner` for behaviour no feature covers. PRD changes pass the same lint and critics gate on `wf/prd-v<n>` and are tagged `prd-v<n>` on merge.
4. Janitor tasks from metrics: duplication, file size, lint warnings, coverage.
5. Retro: mine attempt journals (`readJournal`) for recurring failure signatures and propose `AGENTS.md` or skill updates as PRs.
6. `finish` once the project is done. `decide()` checks the cheap part (no open tasks, kickoff done). The finish run checks the full definition (design 10): every non-dropped task closed; L3 green on `main`; parity meets the target (design 10 suggests 95% overall, at least 90% per archetype); L5 budgets met; no open `p0` or `p1` bug. Then it tags a release and writes the final report.

## Mode: supervised

Supervised is the approval-per-cycle queue for human-written `state:ready` issues. It keeps the
previous shipflow loop: one issue per cycle, a planner-written script on the COMPLEX path, the
product review on every cycle when requested, and one push of `wf/shipflow-<N>`. It uses the `state:*` labels,
with claims and merges through the kit. The coordinator never reads issue titles, bodies,
comments or file contents; each step returns compact data only. One iteration per cycle:

1. **Stop checks.** Run the same `snapshot.ts` command as dispatch. Stop when the PRD issue carries `autopilot:paused`, no `state:ready` issue exists, an `autopilot stalled` or `stop-the-line` issue is open and uncleared, or the planner fails to produce a brief twice for the same issue. Relay stale-claim ids; never act on them unasked.
2. **Pick by number only.** `gh issue list -R <repo> -l state:ready --state open --search "sort:created-asc" --json number -q '.[0].number'`. The output is one integer.
3. **Anchors and charter.** Capture `repoRoot`, `baseCommit`, `baseBranch` and `agentsMd` as in z-workflow Step 0. Read `repo`, `dispatcher.prd_issue` and `tiers.first_attempt` from `autopilot.yaml` with one `bun` command that prints only those three values. The trigger is COMPLEX, reason "issue text is off-repo".
4. **Plan.** Dispatch `workflow-planner` (`workflow-planner-flash` when `tiers.first_attempt` is `flash`) with the issue number, repo, anchors, charter path, the dynamic-workflows contract path and this skill's folder. It fills the `shipflow` brief extension and has the author write a script that meets [references/cycle-contract.md](references/cycle-contract.md).
5. **Not actionable.** When `triage.verdict` is not `actionable`, the main thread launches no GitHub-writing step. It writes `triage.question` to `<repoRoot>/.shipflow/triage-<N>.md` (git-ignored) and launches one bespoke triage run that posts the file with the kit's `comment`, then calls `transition(N, "ready", "blocked")`. `backlog` is not reachable from `ready`, so the owner's answer moves the issue on. Re-read with `gh issue view <N> -R <repo> --json labels` and go to the next iteration. This is not a failed cycle.
6. **Pre-flight.** z-workflow Step 4 in full with the REVIEW dial forced on: snippet and parser rehearsal, persona-kit and GitHub-kit drift checks, command-set extraction, size-budget check, and a fresh `workflow-author` REVIEW. Check the cycle-contract phases in order (one `grep -c` per phase literal) and the refusals in [references/gates.md](references/gates.md). Defects go back to the author; the coordinator never edits script logic.
7. **Approve.** Show the command set grouped as: gates with baseline results; read-only git; git mutations (`worktree add`, `add -N`, `commit`, the one push below); GitHub mutations (the kit's exact argv: claim comment and label edit, `transition`, `openPr`, the `postStatus` argv for `ai-review`); publication; capture and preview commands; persona paths with sha256; signals, dials, band and model per role; `dryRun` and `shadow`. Choose "Allow only this time".
8. **Launch** one `CreateWorkflow` named `zflow-shipflow-<N>`. Do not poll.
9. **Relay** the CycleReport: outcome, PR URL, reviewed SHA, gates, findings with labels, evidence paths, personas, notCovered, report path.
10. **Count.** `failed` and `refused` add one to the consecutive-failure counter; `merged` resets it; `open`, `released`, `shadow` and `dry-run` leave it unchanged. Two in a row stops the loop.

Supervised rules:

- **Claims.** `claim(n, { requireBlock: false })`, so issues without a machine block can be claimed; the nonce uses `issue-<N>`.
- **Merge.** The cycle ends `open` with the PR awaiting the owner. The builder login authors every PR, and GitHub does not let an author approve their own PR, so the cycle asks for no approval. The owner merges in GitHub, or prompts the harness to merge the reviewed PR. That prompt starts a bounded merge run: kit `mergeTrain(pr, { reviewedSha, base, maxUpdates, requireApproval: false, onRepin })`, pinned to the `reviewedSha` in `.shipflow/cycle-<N>.md` and started only after the owner's explicit merge prompt. `requireApproval: true` stays for a team where another person reviews. Nothing self-approves.
- **Publication.** Exactly one `git -C <integration-wt> push origin refs/heads/wf/shipflow-<N>:refs/heads/wf/shipflow-<N>`, after review. A rejected push ends the cycle `open` or `failed` with the stderr tail, never retried with other flags.
- **Evidence.** Web captures run through `world.run` (a blocking Bun helper that starts the preview on port 0 and stops it in `finally`), then a blind flash vision audit, then command checks. Desktop and mobile captures use one single-worker lane with `z-native-device-verifier`. Every preview started is stopped in cleanup, even after a failure.
- **Step 6 skipped.** The remote PR is the delivery; the user's checkout is never written.

### Overrides of z-workflow

| z-workflow step | Supervised override |
|---|---|
| Step 0, triage | Trigger always COMPLEX. `R` is at least `medium` because the cycle changes a shared remote. |
| Step 1, explore | The planner also fills the `shipflow` extension: untrusted issue data with hash and `updatedAt`, triage verdict, default branch and head, merge methods, required checks, protection, leftover branch and PR, pin issue, labels, gates with baselines. |
| Step 2, shape | Per-area pipeline with gated verifier loops, a counted feedback loop from cross-area findings back to the owning lanes, and the cycle-contract phases. Each writing area gets its own worktree. |
| Step 3, author | Script follows `references/cycle-contract.md`. The persona kit and GitHub kit are pasted unchanged. |
| Step 4, pre-flight | REVIEW dial forced on; contract-phase and gate-refusal checks added. |
| Step 5, approve | Two extra command groups: GitHub mutations (kit argv) and publication. |
| Step 6, delivery | Skipped. Delivery is the PR and, in autopilot, the remote merge. |
| Git rules | One exception: the single publication push above. |
| Final report | CycleReport, a superset of the z-workflow report, written to `.shipflow/cycle-<N>.md`. |

### Role map

| Old queue role | Now |
|---|---|
| scout | `explore-flash`, dispatched by the planner |
| issue-triage | Planner triage verdict; the kit's `comment` and `transition`; `z-product-owner` in TRIAGE mode (read-only) when board or dependency judgement is needed |
| task-planner | `workflow-planner` |
| plan-auditor | `workflow-author` REVIEW, plus the plan-attack dial when `R` is high |
| per-stack implementer and reviewer | The area's `z-*` specialist from `harness/zcode/skills/z-workflow/references/specialists.md`; review is a fresh read-only instance of the same file |
| perf-engineer | `z-rust-perf-engineer`, the stack's specialist, or `general-pro` |
| qa-writer, fixer | The area implementer; tests belong to the area (`test-quality-tdd-agents`) |
| copywriter | `general-pro` with `antislop-copy` |
| browser-tester, vision-judge | `z-qa-evaluator` on the preview (judged); `general-flash` blind vision auditor, then command checks |
| security-audit, injection-auditor | `z-security-auditor` |
| pr-reviewer | Fresh `general-pro` cross-area judge with the PR-body drift check |
| gh-ops, pr-merger | The GitHub kit: its ops functions and the merge train |
| queue-monitor | `scripts/snapshot.ts` |

## Authority and git

- **Workspace.** Writing happens only in run-owned worktrees under `<repoRoot>/.zflow/worktrees/`, on `wf/<task-id>` (lanes), `wf/test-<task-id>` (test authors), `wf/prd-v<n>`, `wf/recon-<n>`, or the supervised `wf/shipflow-<N>`. The user's checkout and current branch are never written.
- **Pushes.** Non-force pushes of `refs/heads/wf/*` only, through the git chain, within the charter's `authority.push`. Never `main`; never `-f`, `--force*`, `--mirror`, a `+` refspec or another destination. `hooks/policy.ts` enforces this.
- **Merges.** Only the kit's `mergeTrain`, pinned to the reviewed SHA (`gh pr merge --squash --match-head-commit`). `gh pr merge` anywhere else is denied by the hook. Supervised merges run only in the bounded merge run after the owner's merge prompt (Mode: supervised). Merges are serialized, and nothing self-approves.
- **GitHub writes** happen only inside runs, through kit ops with an exact argv list. The main thread writes nothing, except the owner's setup run (Mode: setup).
- **Exempt writes.** `.zflow/` and `.shipflow/`, both git-ignored. Protected paths (`prd/`, `tests/acceptance/`, `tests/parity/`, `discovery/`, `.github/`, `autopilot.yaml`) change only through the agent names and branches the charter allows.
- **Still forbidden.** `checkout --` or `restore` on any path, `reset --hard`, `clean`, `worktree remove --force`, `branch -D`, `rebase`, `stash`, `add -A`, `--no-verify`, and any mutation of the user's checkout or of a branch that is not run-owned.

## Safety layers

| Layer (design 12, outermost first) | Where it lives here |
|---|---|
| 1. Sandbox and network allowlist | Set up by the owner: a dedicated machine or user account; `authority.network_allow` enforced by `hooks/policy.ts` |
| 2. Owner's `gh` login | The owner's own `gh` login with the scopes it already has (`repo`, `project`). Claims are comment nonces (design 6.4), so one login can serve several dispatchers. An optional reviewer App (`post-review.ts`, key at mode 0600) is hardening only, when the owner asks for it (design 6.6) |
| 3. Server ruleset and merge train | `templates/ruleset-main.json`; `mergeTrain` in `github-kit.dwf.ts` |
| 4. ZCode hooks | `hooks/policy.ts` and `hooks/hooks.json`: force pushes, ruleset and secret edits, merges outside the kit, protected paths, hosts |
| 5. Kit policy code | Claim rules, transitions, the merge predicate; the protected-path check in `run-gate.ts` |
| 6. Execution limits | Retry caps, task timeouts, scoped parallel lanes; `autopilot:paused` stops new delivery runs |
| 7. Audit trail | GitHub events, attempt journals as comments, `.shipflow/policy.log` |

## References

- [references/prd-format.md](references/prd-format.md): PRD files, lint rules, `index.json`, IDs, lint and reconcile commands.
- [references/github-state.md](references/github-state.md): labels, machine block, state machine, claims, readiness, sub-issues and dependencies, merge path, trust.
- [references/verification-ladder.md](references/verification-ladder.md): L1 to L6, protected paths, parity checks, output hygiene, the CI template.
- [references/charter.md](references/charter.md): `autopilot.yaml` keys, validation, enforcement layers, how to change the charter.
- [references/failure-policy.md](references/failure-policy.md): signal, response and owning component; attempt journal fields.
- [references/dispatch.md](references/dispatch.md): the dispatcher turn, decision table, chaining, context rules, drift checks.
- [references/cycle-contract.md](references/cycle-contract.md): required phases, merge predicate rows, CycleReport and report path.
- [references/brief-extension.md](references/brief-extension.md): the `shipflow` extension (supervised) and the `autopilot` extension (bespoke autopilot runs).
- [references/gates.md](references/gates.md): gate discovery for supervised mode, charter gates for autopilot, the refusal list.
- [references/review-checklists.md](references/review-checklists.md): checklists for `z-qa-evaluator`, the PRD critics and the test author.
- [references/test-playbook.md](references/test-playbook.md): where each test kind lives, which gate runs it, and how test authors and implementers use it.

## Grounded in

- Autopilot design, `research/harness/zcode/autopilot-design.md`: owner decisions D13-D17 in section 0.1 (2026-10-18), independent entry points in 4.0a, and sections 0, 2, 3, 4.0, 4.6, 6.4 (claims by comment nonce), 6.6 (identity, D17), 8 (dispatch, task cycle, parallelism), 10 (audit), 12 (charter and safety), 13 (decisions D2, D3, D5, D6, D10, D11, D12) and its Sources.
- `harness/zcode/skills/shipflow/scripts/setup.ts` (Mode: setup) and `scripts/lib/detect.ts` (run-time gate, preview and area detection).
- `harness/zcode/skills/z-workflow/SKILL.md` (Pillars 1-9, Steps 0-6, git rules, Vision phase), with `persona-kit.dwf.ts` and `references/specialists.md` in the same folder.
- `harness/zcode/skills/shipflow/github-kit.dwf.ts` (the GitHub kit) and `scripts/snapshot.ts` (the decision).
- `harness/zcode/agents/workflow-planner.md`, `workflow-author.md`, `z-product-owner.md`, `z-qa-evaluator.md`, `z-security-auditor.md`.
- ZCode bundled guides `dynamic-workflows` and `diagnosing-hooks` (local, in the app bundle).
- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents); [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps); [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler); [Long-running Claude for scientific computing](https://www.anthropic.com/research/long-running-Claude); [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system).
- GitHub docs, [REST sub-issues](https://docs.github.com/en/rest/issues/sub-issues) and [REST issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies); GitHub changelog, [Merge queue generally available](https://github.blog/changelog/2023-07-12-pull-request-merge-queue-is-now-generally-available/).
