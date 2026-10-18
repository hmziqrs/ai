# Autopilot test playbook

This playbook is for the repository owner. Run it in the ZCode desktop app, driven through Claude remote control, and on github.com. Every step is a prompt you send, a dialog you answer, or a GitHub web action. You never type a terminal command, write JSON, YAML or credentials, or edit a file, because the harness generates every artifact.

The check scripts run without live GitHub (check-github-kit mocks `gh`). Only a live run shows whether the app keeps a session-wide workflow allowance, whether a settled run wakes the session, what the permission hook receives, whether a stopped run resumes after a restart, how GitHub answers real rate limits, and whether a ruleset and merge train hold.

Order: S1 first, since it decides how the rest is driven; then S2 to S6; then R1 to R4. A failed criterion does not stop the playbook: record it, write the design change it implies, and continue unless the next step depends on it. Results feed back into `research/harness/zcode/autopilot-design.md`. Nothing here measures cost or usage; S5 measures time and rounds only.

## Before you start

Send these in the ZCode desktop app, in the hmziqrs/ai checkout, unless a step says otherwise.

1. "Show my gh login, its token scopes and the gh version." Pass: admin on the scratch repositories with the `repo` and `project` scopes. gh 2.94 or newer names the sub-issue and dependency flags; older versions use REST.
2. "Run these check scripts in this checkout. Report each name, exit code and last line. Change no file: check-personas.mjs, check-github-kit.mjs, check-shipflow-planning.mjs, check-autopilot.mjs, check-autopilot-e2e.mjs."
3. "Run check-personas.mjs on a copy of this checkout without .git, .zcode, .zflow, research and harness/zcode/agents/z-web-spec-auditor.md. Leave the original unchanged."
4. Pass: all five exit 0. A failing script is a blocker before S1: record its name and last line.
5. On github.com, create private repositories autopilot-scratch-personal and, in a new Free organisation, autopilot-scratch-org, each with a README.
6. Open autopilot-scratch-personal in the ZCode desktop app, connect Claude remote control, and record the ZCode version from the About dialog.

## S1: Unattended chaining on a scratch repository

Goal: one session chains runs with no user turn; one workflow allowance suppresses later dialogs (D16); the permission hook's records are captured; the design 8.1 unknowns are settled.

Setup: autopilot-scratch-personal is open in ZCode; note the permission mode as the app shows it.

Steps:
1. "Initialize this project for Shipflow autopilot." Confirm the plan, then start a new session, since agents load at session start.
2. "Set up Shipflow autopilot for this repository, dry run first, and show me the plan." Check that GitHub shows no new issue, label or Project.
3. "Set up Shipflow autopilot for this repository." Confirm; step 8 reads the charter this writes.
4. "Run the S1 chain probe: ten runs in sequence. Each appends its number to .shipflow/s1/chain.txt and returns it. Launch the next run only after the previous run's completion notification."
5. When the workflow-creation dialog appears, choose the option for the rest of this session; record its text and buttons; send no other message during the chain.
6. Read the app's context indicator after runs 1, 5 and 10.
7. "Show the PermissionRequest and PreToolUse lines of .shipflow/policy.log for this session, with tool, agent, decision, rule and suggestion keys."
8. "Run the S1 protected-path probe: a subagent named implement-probe writes prd/probe-a.md, and a subagent named prd-probe writes prd/probe-b.md. Report each outcome and rule."
9. "Run the S1 hook probe: one run performs one GitHub kit write, a gh issue edit on the PRD issue that leaves its text unchanged." Then repeat step 7.
10. After the chain ends, send "Check the chain status again in 10 minutes and report it", send nothing for 15 minutes, and note whether a new turn started on its own.
11. "Run the S1 resume probe: ten runs as in step 4, each sleeping 60 seconds first." Stop run 4 with the app's stop control, quit ZCode, reopen the project, and send "Resume the stopped S1 probe run once."

What to record: permission mode and app version; allowance text and buttons; later workflow dialogs; owner messages during the chain; seconds from run 1's notification to run 2's start; PermissionRequest count, tool names and suggestion keys; outcome and rule of both probe writes; whether the gh issue edit was denied and whether a log line names it; context percentages; idle wake (yes or no, and minutes); stop reason and resume outcome.

Pass criteria:
- Run 2 started within 60 seconds of run 1's notification; ten runs had zero owner messages and zero workflow dialogs after the allowance.
- implement-probe denied by rule protected-path; prd-probe allowed; both lines in the policy log.
- The gh issue edit was not blocked. Per the owner's rule it is neither blocked nor logged; a log line naming it is recorded as a finding.
- Context below 60 percent after run 10, the restart threshold in references/dispatch.md.
- Idle wake recorded; "no" keeps nudges manual, as dispatch.md assumes.
- The stopped run completed after one resume, or the release path in references/failure-policy.md is recorded as the fallback.

```
### S1 results
Date: <yyyy-mm-dd>. ZCode: <app version>, permission mode <mode>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Prompts sent: <numbered, exact text>. Recorded values: <What to record fields>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## S2: GitHub primitives on a personal repository and a free organisation

Goal: setup, reconcile, Project, ruleset and publication work live at 50-issue scale on both owner types, with the gh path and rate-limit behaviour recorded (design 6.5 and 15 S2).

Setup: run the steps on autopilot-scratch-personal, then on autopilot-scratch-org after sending "Initialize this project for Shipflow autopilot" there. The harness generates the test PRD.

Steps, once per repository:
1. "Set up Shipflow autopilot for this repository, dry run first, and show me the plan." Check that GitHub shows no new object.
2. "Set up Shipflow autopilot for this repository." Record the report's ok, warnings and Project URL. Send the same prompt again and expect every file up to date.
3. "Write a three-level test PRD for this repository with 50 tasks and dependencies between them, then lint it." Approve it in the dialog.
4. "Publish the approved test PRD as a dry run and list the planned operations." Then "Publish the approved test PRD", recording created and updated counts and any rate-limit wait.
5. "Publish the approved test PRD again and report what changes." Expect nothing.
6. On github.com, check Labels, Milestones, the pinned PRD issue, the Project item count, and Settings, Rules, Rulesets.
7. "Verify Project membership of the PRD issue and every task, and report the count and any missing item."
8. "Report the gh version and whether sub-issue and dependency links used the flag path or REST."

What to record: owner type; setup warnings; ruleset state; dry-run and publication counts; rate-limit waits; Project item count; label and milestone counts; gh path.

Pass criteria:
- Both dry runs created no object; both second runs changed nothing.
- All 50 tree issues exist across three levels, with every dependency linked.
- Project item count equals the tree issues plus the PRD issue, and verification agrees.
- Every rate-limit wait ended with the run completing; no run reported "issue sync failed".
- The personal repository shows the ruleset warning if the free plan blocks rulesets; the organisation shows autopilot-main created or updated.
- Flag and REST paths give the same link set, or the path used is recorded.

```
### S2 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Prompts sent: <numbered, exact text>. Recorded values: <What to record fields>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## S3: Site recon on two reference sites

Goal: archetypes, data model and journeys from recon match a manual check of two public sites (design 15 S3).

Setup: choose two public https reference sites. For each, write a manual checklist in plain text listing page types, entities and three user journeys, and keep both in the S3 results block.

Steps:
1. "Run site recon on reference site 1, the https address in the S3 results block. In-scope public pages only; respect robots.txt and crawl limits; no forms and no sign-in. Produce the discovery pack."
2. The same prompt for reference site 2.
3. "Report robots.txt decisions, rate limits and any crawl limit reached, per site."
4. Compare each discovery pack with its checklist row by row, recording matches, misses and extras.

What to record: per site, manual and discovered counts of page types and entities; matches, misses and extras; journeys captured out of three; the robots and crawl report lines.

Pass criteria (proposed starting values; S3 sets the design target):
- At least 90 percent of manual page types found on each site, and at least 90 percent of discovered types confirmed by the owner.
- All three manual journeys present with their steps, on both sites.
- Every manual entity found; every extra entity has a stated reason.
- The report states zero form submissions and zero sign-in attempts.

```
### S3 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>. Reference sites: <https address 1>, <https address 2>.
Prompts sent: <numbered, exact text>. Recorded values: <What to record fields>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## S4: Parity noise and sensitivity

Goal: the parity check is stable when the reference is compared with itself (noise) and fails a deliberately changed copy (sensitivity) (design 15 S4).

Setup: reference site 1 is the parity reference. On github.com, in autopilot-scratch-personal, create the branch parity-changed and change one visible heading of a copy of the reference page in the web editor.

Steps:
1. "Run the parity check of the reference against itself 10 times. Report each score, the spread, and any check that changed result between runs."
2. "Run the parity check of the unchanged copy against the reference once."
3. "Run the parity check of the parity-changed branch against the reference 3 times. Report each score and failing check."
4. On github.com, record whether parity failed on the parity-changed workflow run or pull request.

What to record: the 10 self-scores and their spread; flipped checks; the unchanged score; the 3 changed scores; failing check names; GitHub's parity state.

Pass criteria (proposed starting values; S4 sets the target):
- Self-comparison: 10 of 10 runs complete, spread at most 1 point, zero flipped checks.
- The unchanged copy passes.
- The changed copy fails 3 of 3 runs, and a failing check names the edited heading.
- GitHub shows parity failed on the changed branch.

```
### S4 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Prompts sent: <numbered, exact text>. Recorded values: <What to record fields>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## S5: Cycle behaviour, template against planner-authored

Goal: elapsed time and rounds of one size S task cycle on GLM-5.3 and GLM-5.3-Flash, standard template against planner-authored (design 15 S5). Time and rounds only: no cost, usage or token figure appears anywhere.

Setup: pick one size S task from the S2 PRD and record its issue number N. Model ids: account:zai-individual-coding-plan/GLM-5.3 and account:zai-individual-coding-plan/GLM-5.3-Flash, chosen in the session's model picker.

Steps (four cells; reset between cells):
1. Model GLM-5.3: "Run one task cycle for issue N with the standard task cycle template. Report elapsed time, rounds, retries, review verdict and final gate result."
2. Reset: "Release issue N to ready." On github.com, close any pull request the cycle left open, unmerged.
3. Model GLM-5.3-Flash: send step 1, then reset as in step 2.
4. Model GLM-5.3: "Run one task cycle for issue N with the workflow planner authoring the cycle instead of the template. Report the same figures."
5. Model GLM-5.3-Flash: send step 4, then reset.

What to record per cell: model id; mode; start and end times in minutes from the run list; rounds; retries; review verdict and finding count; final state; owner messages sent after the prompt.

Pass criteria:
- All four cells have numeric minutes and rounds, with zero owner messages after each prompt.
- Each cell ends in a defined state.
- A written decision names the default template model and the planner's minutes and rounds difference.
- No cost, token or usage field appears in the record.

```
### S5 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model id per cell>. Owner: <personal or free organisation>, repository <name>, task issue <N>.
Prompts sent: <numbered, exact text>. Recorded values: <per cell: mode, minutes, rounds, retries, verdict, state>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## S6: Merge path, ruleset and merge train

Goal: the ruleset, required checks, the ai-review status and the merge train work on the chosen owner, including one update-branch re-pin (design 6.6 and 15 S6). Autopilot merges rest on checks and ai-review; the supervised approval path is covered in R2.

Setup: choose the owner, the free organisation (recommended in design 6.6) or the personal repository, and record it. Pick two size S tasks from the S2 PRD, A and B.

Steps:
1. "Run task cycles for issues A and B in shadow mode. Open their pull requests, do not merge them, and report the numbers and reviewed commit SHAs."
2. On github.com, open Settings, Rules, Rulesets, autopilot-main; record the targets, rules and required status checks.
3. In the web editor, try to commit an edit to a safe file on the default branch, such as the README. Expect a refusal; if the commit is accepted, record a failure and stop S6.
4. On each pull request, record the states of ci, acceptance, parity and ai-review.
5. "Run the merge train for pull requests A and B, in that order. Report update-branch calls, checks waited on, merge results and merge commit SHAs."
6. On github.com, check that main has both squash commits in order with linear history.

What to record: owner choice; rules and required checks; direct-commit outcome; each pull request's check and status states; update-branch and re-pin counts; merge SHAs; policy log lines for merges.

Pass criteria:
- The direct commit was refused.
- Required checks are exactly ci, acceptance, parity and ai-review.
- ai-review is a success status on each reviewed head before its merge.
- Exactly one update-branch call and one re-pin, both on pull request B.
- Both merges used the reviewed SHA, and main's history is linear.
- The policy log shows no force push and no rejected push.

```
### S6 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>, pull requests <A number> and <B number>.
Prompts sent: <numbered, exact text>. Recorded values: <rules, checks, direct-commit outcome, SHAs, re-pins>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## R1: Local planning, then separately authorised publication

Goal: a full upfront plan from a two-line idea, a scoped feature plan, niche requirements reviewed, no GitHub write before confirmation, and Project membership verified (build prompt Phase 6; design 15 R1).

Setup: three inputs: your two-line niche idea, and reference sites 1 and 2 from S3. Each published project gets its own new repository on github.com. Record GitHub's issue, label, milestone, Project and branch counts before step 1.

Steps:
1. Send "Write a detailed PRD for this two-line idea, with the full task breakdown upfront. Planning only: no GitHub writes, no implementation. Idea:" and paste your two lines after it.
2. Send the same planning prompt for reference site 1, then for reference site 2, using their S3 addresses.
3. "Plan only the first feature in the reference site 1 PRD. Read its dependencies; do not expand sibling tasks."
4. "List the niche requirements that need my decision. Mark each one reviewed or open."
5. Read the overview, features and detailed task list in the app, and grade them on the sheet below.
6. Before confirming, ask "List every GitHub write you made in this session"; check that GitHub's counts are unchanged.
7. "Publish the approved plan to GitHub and create its Project." Answer the confirmation dialog.
8. "Verify Project membership of every published issue and report the count," then count the Project items on github.com.
9. "Confirm no implementation ran after publication: list runs started and branches created." On github.com, check that no wf/ branch or pull request exists.

Steps 6 to 9 run for each published project. What to record: GitHub counts before and after; sibling task hashes before and after step 3; reviewed and open niche requirements; grades; Project membership count.

Pass criteria:
- The two-line idea yields an overview, features and a detailed task list with ids, dependencies and criteria; both reference plans have all four levels.
- The scoped plan leaves sibling task hashes unchanged.
- Every niche requirement is reviewed or open; none is silently assumed.
- GitHub counts are unchanged before confirmation, for each project.
- Project membership count equals the published issues, and the app's verification agrees.
- No wf/ branch or pull request exists after publication; no grade is below 3 without a listed design change.

PRD grading sheet. Scale: 1 unusable, 3 usable after edits, 5 ready to publish. Grade each cell and put the evidence in Notes.

| Criterion | Overview | Sections | Features | Tasks | Overall | Notes (file, section, task id) |
|---|---|---|---|---|---|---|
| Coverage | | | | | | |
| Testability | | | | | | |
| Consistency with the data model | | | | | | |
| Feasibility and order | | | | | | |
| Scope discipline | | | | | | |
| Assumptions quality | | | | | | |

| What the critics missed | Where | Severity | Design change |
|---|---|---|---|
| | | | |
| | | | |

```
### R1 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Prompts sent: <numbered, exact text>. Recorded values: <GitHub counts before and after, grades, membership count>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## R2: Implementation-only shadow mode

Goal: implementation resumes in a new session from GitHub state without regenerating the PRD; missing or blocked planning returns needs-plan; a session allowance cannot advance a plan-only request; pause and selected scope work (build prompt Phase 6; design 15 R2).

Setup: the reference site 1 project from R1 is published in autopilot-scratch-org. Record now the sha256 of prd/prd.md and the PRD issue body hash. Make milestone M0 decomposed and ready, M2 planned at overview only, and M3 a milestone whose only open task carries the label state:blocked (add it on github.com).

Steps:
1. "Implement only the published tasks A and B of milestone M0 in shadow mode. Open pull requests and do not merge them."
2. Start a new session in the project and send "Continue Shipflow implementation in shadow mode for milestone M0. Report the sha256 of prd/prd.md and the PRD issue body hash." Expect runs only for the other M0 tasks.
3. "Implement the published tasks of milestone M2." Expect needs-plan.
4. "Implement the published tasks of milestone M3." Expect needs-plan for blocked planning.
5. In a session where the workflow allowance is already granted, send "Write a detailed plan for the feature Password reset in milestone M0. Plan only: do not implement, publish or open pull requests."
6. On github.com, add the label autopilot:paused to the PRD issue and send "Implement the next published task in shadow mode." Expect no run; remove the label and send it again.
7. Supervised cycles stop at an open pull request and are never merged by the cycle. Review such a pull request on github.com and merge it there, or send "Merge the reviewed PR 12". One identity cannot approve its own pull request, so that merge is your act, not an approval.
8. On github.com, confirm that every pull request from the shadow runs is open and none is merged.

What to record: decision action and reason for steps 1 to 4 and 6; PRD hashes before and after step 2; run ids launched per step; wf/ branches before and after step 5; pull request states after step 8; any supervised merge, recorded separately.

Pass criteria:
- PRD file and PRD issue body hashes are unchanged in the new session; nothing was regenerated.
- Step 2 launches runs only for the other M0 tasks.
- Steps 3 and 4 return needs-plan with the milestone id and launch zero runs.
- Step 5 launches zero implementation runs and creates zero wf/ branches.
- While paused, zero runs; after the label is removed, the next run starts.
- No pull request is merged by a shadow run.

```
### R2 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Prompts sent: <numbered, exact text>. Recorded values: <decision actions, PRD hashes, run ids, branch and pull request states>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## R3: Small-site autopilot

Goal: full autopilot on a small site of 10 or fewer archetypes in the ZCode app, with no human turn after the start prompt (design 15 R3; D15 automatic approval for an explicit small end-to-end request).

Setup: a reference site with 10 or fewer archetypes (record the count), and a new repository autopilot-r3 in autopilot-scratch-org.

Steps:
1. "Initialize this project for Shipflow autopilot." Confirm, then start a new session.
2. "Set up Shipflow autopilot for this repository with automatic approval, the detailed task list upfront, and three lanes." Confirm.
3. "Build this small project end-to-end from the reference site in the R3 results block, with automatic PRD approval and three lanes."
4. Answer only the workflow-allowance dialog, if it appears, with the session option. Send nothing else until the session reports done or stops with a status line.
5. If the session stops, send "Continue the project" once and record it as an intervention.
6. When the session reports done, send "Run the project audit and report the done checks."
7. On github.com, check main's checks, the ruleset, the release tag and the final report.

What to record: each dialog (text and count); owner interventions after step 3; stall issues opened; final open, done, blocked and failed counts; policy log denies by rule.

Pass criteria:
- Zero owner interventions after step 3; the allowance dialog is counted separately.
- Every non-dropped task is closed and all L3 checks are green on main.
- Parity meets design 10: 95 percent overall and 90 percent per archetype.
- No p0 or p1 bug is open, and every merged pull request had required checks and ai-review green.
- The release tag and final report exist.

```
### R3 results
Date: <yyyy-mm-dd>. ZCode: <app version>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>, site archetypes <count>.
Prompts sent: <numbered, exact text>. Recorded values: <What to record fields>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```

## R4: One prompt to a built backend, no owner input

Goal: the two autopilot systems work together from one simple prompt in one session. PRD creation turns a short app description into a PRD and tasks; implementation then builds and merges them, with no owner input (D14 composed delivery; D15 automatic approval for an explicit small end-to-end request; D17 prompt-only). Claude remote control drives the ZCode app in the owner's place. A black-box probe judges the result, not the session's own report. R4 can also run before S1 as a smoke test of the whole path.

The app is a backend-only to-do API with email login. Its dummy mailer sends no email: it prints each login code to the terminal, where the probe reads it.

Repository preparation, once per repository and outside the measured run:
1. The global core in `~/.zcode/` matches this checkout (`install.md`, Global Core).
2. A new private repository autopilot-todo-e2e with a README exists, and a fresh clone of it is open in the ZCode desktop app with Full access.
3. "Initialize this project for Shipflow autopilot from the hmziqrs/ai checkout at <path of this checkout>. It is a Bun TypeScript backend with no UI. Install without asking me to confirm."
4. "Set up Shipflow autopilot for this repository with automatic PRD approval, the detailed task list upfront and two lanes. Show the dry run, then apply it without asking me."
5. Trust the two policy hooks when ZCode lists them as pending review (INSTALL.md section 3).

The measured run:
1. Open one new session in the project and send the build prompt below unchanged. It is the only prompt of the run.
2. Driver rules, until the session's final report, 12 nudges or 8 hours:
   - When the session is idle (turn ended, no active run, last message not a final report) for 10 minutes, send "Continue end-to-end delivery." and count it as a nudge.
   - Workflow-creation dialog: choose the option for the rest of the session. Any other dialog or question: answer "Use your recommended option and continue without asking me." Record the text of each.
   - Never edit a file in the project, write to GitHub, merge, or approve a pull request. Judge progress by reading GitHub, the app's run list and `.shipflow/`.
3. In this checkout, run `bun harness/zcode/scripts/probe-todo-backend.mjs --self-test`, then `bun harness/zcode/scripts/probe-todo-backend.mjs --gh-repo <owner>/autopilot-todo-e2e`. The self-test shows that the probe passes a reference app and fails each of six injected faults. The real probe clones the default branch, installs it, runs `bun test`, starts the app twice on one database, reads every login code from the app's stdout and checks each behaviour over HTTP. The PRD picks exact status codes and field names, so the probe accepts the reasonable choices (for example 401 or 403, `done` or `completed`).
4. Read GitHub: the PRD issue's labels; open and closed task issues; each merged pull request with its merge method and the `ci` and `ai-review` states on its head; open `stop-the-line` or `autopilot stalled` issues; open `wf/` pull requests; the `autopilot-main` ruleset or the setup warning.
5. Read `.shipflow/policy.log` in the clone the app used, and count denies by rule.

Build prompt:

```
Build a simple to-do app backend end-to-end with Shipflow autopilot: create the PRD from this description, then implement it. Use automatic PRD approval and no human review, merge each task when its checks pass, and do not ask me anything.

The app: Bun and TypeScript, backend only, no frontend. Users log in with their email and a one-time code, and a successful login returns a bearer token. No real email is sent: a dummy mailer prints each code to the terminal as MAIL to=<email> code=<code>. Logged-in users can create, list, update, complete and delete their own to-dos. Data is stored in SQLite.

Keep these names so the app can be tested from outside: routes POST /auth/request, POST /auth/verify, POST /auth/logout, GET and POST /todos, PATCH and DELETE /todos/:id, and GET /health. bun run start serves on PORT, DB_PATH sets the database file, and LOGIN_CODE_TTL_SECONDS sets how long a code lives.
```

What to record: app version and permission mode; the preparation prompts and their minutes; each driver message in the measured run with its time; dialog texts; runs launched, with name, status and minutes, from the run list; the PRD's feature and task counts; merged pull requests, retries and failed cycles; the probe output; the step 4 reads; policy denies by rule; minutes from the build prompt to the final report.

Pass criteria:
- The measured run has exactly one prompt; every other driver message is a nudge or a dialog answer from the rules.
- A PRD with features, tasks and acceptance criteria exists, was generated by the run, and covers the description.
- The probe passes every check on the default branch, `bun test` included.
- Every task issue is closed by a merged pull request, and the PRD issue carries `kickoff:done`.
- Every merge was a squash merge with `ci` and `ai-review` successful on the merged head.
- No `stop-the-line` or `autopilot stalled` issue is open, and no `wf/` pull request is left open.
- The policy log has no force-push or merge-outside-kit deny.
- More than three nudges is a finding for dispatch chaining (`references/dispatch.md`), not a failure.

```
### R4 results
Date: <yyyy-mm-dd>. ZCode: <app version>, permission mode <mode>. gh: <version>. Models: <model ids>. Owner: <personal or free organisation>, repository <name>.
Preparation: <prompts and minutes>. Driver messages in the run: <numbered, time and exact text>. Recorded values: <What to record fields>. Probe: <passed>/<total>, failed checks <names>. Pass or fail per criterion: <criterion: pass or fail, value>.
Surprises: <text>. Design changes proposed: <design section: change>.
```
