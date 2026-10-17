---
name: z-workflow
description: >-
  Parallel dynamic-workflow composer: for small work the workflow-author reads the task
  itself, for larger work the workflow-planner gathers the facts (goals, files, signals,
  specialists) and dispatches the workflow-author, which picks the shape from the
  dynamic-workflow catalogue and writes a fresh script whose areas run as independent
  pipelines (implement, gate, judge) with pro and flash subagents in one run. Joins are
  used only where a whole-set step needs every area. Runs only when the user explicitly
  asks for a workflow (z-workflow, or a saved workflow by name); never start one unasked.
---

# z-workflow

The main agent is the **composer-coordinator**. It captures the repo anchors, decides
small-or-complex from the task text, dispatches the workflow-planner or the
workflow-author, shows the user what the script will run, launches one run, and relays
the report. Every run gets a script written for that use case.
Nothing is reused from a template unless the user names a saved workflow.

## Pillars

1. **Parallel by default.** Each area is its own pipeline. Areas never wait for each other
   unless an edge says so.
2. **Joins are explicit.** A join is an `await` on a set of lanes that a named whole-set step
   needs: a merge into the run's integration worktree, a cross-area check, a final report, or
   a task rule that says "all plans before any implementation". A join without a reason is a
   finding.
3. **At least one flash role.** Any run with two or more asks includes at least one flash role
   from the allowed list (see Model matrix). Flash never decides pass or fail. Pins are
   `model()` literals per role. The pillar is checked by counting flash actors in the run.
   Profile skills override this pillar: z-flashflow runs every role on Flash, and
   z-proflow runs every role on pro with no vision.
4. **Scale to measured signals.** Size is a spectrum. Triage measures areas, changed files,
   risk, and uncertainty, and each dial of the run follows its own signal (Step 0).
5. **Fresh eyes and honest gates.** Judges are new agents every round. Gates are `world.run`
   with literal commands; a nonzero exit is a value the script reads.
6. **Bounded and honest.** Every loop uses the one stop rule below. Only command-backed
   results are labelled verified.
7. **Never destroy, never surprise.** Scripts never run destructive git and never touch the
   user's checkout; runs launch only through the approval dialog. The coordinator merges a
   clean eligible result by fast-forward under Step 6; high risk and review-first need approval.
8. **Proportionate.** The run's machinery matches the task, not the rule set. The dials set a
   complexity budget (Step 0). Going over it needs a written reason in the plan. The smallest
   shape that meets the rules wins.
9. **Clean coordinator context.** The coordinator's context holds only compact control
   data: the task text, repo anchors, signals and dials, briefs, plans, scripts, and
   command outputs that are a count, ref, path list, or exit code. It never reads file
   contents, never fetches URLs, and never builds inventories; all fact-gathering lives
   in the workflow-planner or the workflow-author. The main thread stays small so the
   session stays long-running.

## Definitions

- **Area**: a unit of behaviour that can be built, gated, and judged on its own. A
  feature's code, its tests, and its docs are one area, because the tests and docs depend on
  the code's API. Directories are not areas. Two pieces are separate areas only when neither
  needs the other's output to be written or checked, for example two unrelated modules. When
  in doubt, merge them into one area.
- **Fresh**: a judge or confirmer is a new `agent()` with a name unique to its area and round
  (`judge-${area}-r${round}`). It has never seen the implementer's reasoning or an earlier
  round's verdict text. Reusing one agent across rounds is a topology finding.
- **Verified**: a result whose evidence a `world.run` command produced in this run: a gate's
  exit code, a grep match of a quoted `file:line`, or a confirmer's reproduction command. A
  judge verdict alone is **judged**, not verified. A finding no command reproduced is
  **unconfirmed**. These three labels are the only status labels.
- **Reproduced**: a confirmer marks a finding reproduced only by running a command whose
  output shows the defect. Reading code and agreeing is not reproduction.
- **Stop rule** (every loop): stop when open findings reach zero, or when the
  open count does not drop for two consecutive rounds, or at the round cap. "Does not drop"
  means the open count after round r is greater than or equal to the count after round r-1.

## Step 0 — triage (coordinator triggers; planner or author measures)

The coordinator does two things only (Pillar 9): capture the repo anchors — `repoRoot`,
`baseCommit` (`git rev-parse HEAD`), `baseBranch` (`git symbolic-ref --quiet HEAD`),
`agentsMd` — with compact-output commands, and set the **trigger** from the task text and
the paths it names, without reading file contents or fetching anything. The trigger is
**SMALL** when the task is one area, low uncertainty, and repo-local; it is **COMPLEX**
otherwise, including any task whose material lives off-repo (websites, external docs,
remote inventories). Misfires self-correct: an author that finds the work not small stops
and says so, and the coordinator escalates to the planner; a planner that finds the work
small returns a minimal brief and says so.

Size is a spectrum, not three boxes. The signals are measured by the workflow-author
(SMALL) or the workflow-planner (COMPLEX), and each dial of the run
is set from the signal that drives it. Dials move independently: a three-file change with a
security angle gets heavy review and a single lane; a twelve-file mechanical rename gets
several lanes and light review.

### Signals (measured by the planner or author, written into the brief with the command that produced each)

| Signal | How it is measured | Values |
|---|---|---|
| Areas `A` | the Area definition applied to the task | 1, 2, 3, ... |
| Changed files `F` | one command over the declared files, for example `git -C <repoRoot> ls-files -- <files...> \| wc -l`, plus the new files the task names | 1, 2, 3, ... |
| Risk `R` | the task text and the touched paths | `low`, `medium`, `high` |
| Uncertainty `U` | whether the task fixes the behaviour and the API | `low` (spec given), `high` (shape to be discovered) |
| Visible surface `V` | whether a changed file renders on screen (HTML, CSS, a UI component, a desktop or mobile view) or the task states something visible | `none`, `web`, `desktop`, `mobile` |

Risk levels:
- `low`: new code behind a stated spec; nothing existing changes behaviour.
- `medium`: changes the behaviour of existing code, error paths, input handling, a CLI or
  file-format contract, shared utilities, or edits to existing tests.
  Additive changes stay `low`: a new function, a new subcommand, a new section, or a new
  file that leaves every existing behaviour unchanged, even when it touches a contract file
  such as a CLI dispatcher. Rate by what existing callers would notice, not by which file
  changes.
- `high`: the touched code handles auth, data or schema migration, a public API, money, or
  secrets, or is otherwise security-sensitive. A task that asks for an audit turns on the
  Auditor dial; it does not raise risk by itself. Rate risk by what the code does, not by
  the words in the task.

### Dials (each set by its own signal)

| Dial | Rule |
|---|---|
| Lanes | one per area (`A`) |
| Worktrees | 1 when `A` = 1 or areas never write at the same time; otherwise one per writing area plus 1 integration |
| Exploration | direct when the trigger is SMALL; on COMPLEX the planner explores directly when `A` = 1 and fans out one read-only explorer per area otherwise |
| Plan stage | only when `U` = high, or `F` >= 9, or `R` = high |
| Plan attack | only when `R` = high |
| Round cap | `F` 1-3: 2; `F` 4-8: 3; `F` 9-15: 4; `F` >= 16 or `R` = high: 5 |
| Judges per lane per round | 1 fresh judge; 2 when `R` = medium or `F` >= 9; a panel of 3 when `R` = high |
| Confirmers | only when `R` >= medium; a judge's finding is a fix target only after a command reproduces it |
| Flash tracer | one per lane per round whenever the run has two or more asks |
| Auditor | only when the task asks for an audit; a separate pro agent with read-only access, one per audit topic |
| Pre-launch REVIEW | when `R` >= medium, or the budget below exceeds 6 asks per round |
| Vision | on when `V` is not `none`: capture, flash vision audit, and command checks per lane per round (see Vision phase) |

### Band label (for reporting only)

The band is a label for the dial settings, never an input to them:

| Band | Typical signals |
|---|---|
| S | `A` = 1, `F` <= 3, `R` = low |
| S-M | `A` = 1, `F` <= 3, `R` = medium; or `F` 4-5 with `R` = low |
| M | `A` <= 3, `F` <= 8, `R` <= medium |
| M-L | `F` 9-15, or `A` = 4, or `R` = high with `F` <= 8 |
| L | `F` >= 16, `A` >= 5, or `R` = high with `F` >= 9 |

Write the four signals, the dial values, and the band into the brief.

### Complexity budget

The budget follows the dials, not the band:

- **Asks per round** = per lane (1 implementer + tracer + judges + confirmers + 1 vision
  auditor when Vision is on) + 1 cross-area
  judge when `A` >= 2 + auditors.
- **Distinct roles**: one per dial that is on. A role is one `agent()` name pattern
  (`judge-${area}-r${round}` counts once).
- **Script length**: about 300 lines for one lane with safe git, gate, tracer, and judge
  (measured: 280 to 430 across the first four dial runs), plus about 100 per extra lane.
  Extra dials add asks, not much code. Length is a soft target: flag it above 1.5 times the
  target. Asks per round, roles, and worktrees are the hard budget. Lanes share one lane
  function; a copy-pasted lane body is a proportion defect.
- **Gate**: the task's own command. A smoke check is added only for a stated requirement the
  gate cannot check, and it stays under about 20 lines.

Anything over the computed budget needs a one-line reason per item in the plan's `budget`
field. REVIEW and the coordinator flag any unjustified overage.

## Step 1 — explore (delegated; never on the main thread)

- **SMALL: direct.** No scout and no planner are dispatched. The coordinator passes the
  verbatim task and the anchors only. The workflow-author reads the files it needs with
  its own Read, Glob, and Grep tools and measures the signals itself.
- **COMPLEX: the workflow-planner.** Dispatch one `workflow-planner` (Agent tool;
  `workflow-planner-flash` in z-flashflow) with the verbatim task, the anchors, the
  trigger reasons, the resolved dynamic-workflows contract path, and this skill's folder
  path. The planner measures the signals, explores the repo and any off-repo material,
  may fan out read-only explorers per area (split by the Area definition, never the
  directory layout) and merge them itself, resolves specialists, fills the
  `WorkflowBrief` below, then dispatches the workflow-author itself and returns the
  brief, the TopologyPlan, and the script together. If the planner returns only a brief
  (its author-dispatch fallback), the coordinator dispatches the author with it,
  unchanged.

```ts
interface WorkflowBrief {
  /** code | research | draft | mixed: the shape of the work. */
  workKind: "code" | "research" | "draft" | "mixed";
  /** Band label for reporting only: S | S-M | M | M-L | L. */
  band: "S" | "S-M" | "M" | "M-L" | "L";
  /** Dial values from Step 0, each with the signal that set it. */
  dials: { name: string; value: string; drivenBy: string }[];
  /** Uncertainty: low when the task fixes behaviour and API, high otherwise. */
  uncertainty: "low" | "high";
  /** low | medium | high, from Step 0. */
  risk: "low" | "medium" | "high";
  /** The risk signals found, each with where it was seen. Empty when risk is low. */
  riskSignals: string[];
  /** Measured counts and the command that produced them. */
  counts: { areas: number; changedFiles: number; command: string };
  /** The task, verbatim. */
  task: string;
  /** Absolute repo root, verified with a command. The script's only repo anchor. */
  repoRoot: string;
  /** Base commit the run starts from, verified with git rev-parse. */
  baseCommit: string;
  /** Full refs/heads/... destination captured before launch; empty when detached. */
  baseBranch: string;
  /** AGENTS.md path relative to repoRoot that binds subagents; "" when none. */
  agentsMd: string;
  /** Whether the task text asks for commits on the user's branch. */
  commitsRequested: boolean;
  /** Per area: its files, whether it has a UI, and what it contends on. */
  areas: {
    name: string;
    files: string[];
    hasUI: boolean;
    /** terminal: shared-checkout work | web | desktop | mobile */
    contention: "terminal" | "web" | "desktop" | "mobile";
    /** Area names whose output this area needs before it can implement. */
    dependsOn: string[];
    skills: string[];
  }[];
  acceptance: { area: string; requirement: string; check: string; evidence: string[] }[];
  personas: { area: string; role: string; path: string; access: "read-only" | "write"; reason: string }[];
  /** Mechanical checks the repo already has, as literal {tool, args[]}, non-mutating. */
  gates: { tool: string; args: string[] }[];
  /** What could make the run fail or lie. */
  risks: string[];
}
```

Verify what must be exact (repoRoot, baseCommit, baseBranch, agentsMd, each gate's exit code, the counts)
with one command each — inside the planner's or author's dispatch, never on the main
thread. Explorer claims are data to check, not facts.

Specialists are resolved before authoring using [Specialist routing](references/specialists.md)
and the session's discovered agent descriptions — by the planner (COMPLEX) or the author
(SMALL); the coordinator relays the resolved paths and never resolves them itself. Record
absolute paths and explicit authority
in `personas`; the user need not name a file. Validate required skill availability and list
missing expertise. Select only roles justified by the task, independently of review depth.

## Step 2 — shape (workflow-author, AUTHOR mode)

Resolve the platform-contract path first: take the `dynamic-workflows` entry's `file:` path
from this session's available-skills index. On the COMPLEX path the planner has already
dispatched the author with the complete brief and that path, resolving dial mismatches
itself; the coordinator receives the TopologyPlan together with the script. Otherwise
dispatch the workflow-author with the verbatim task and that absolute path, plus: on
SMALL, the anchors only (repoRoot, baseCommit, baseBranch, agentsMd), since the author
measures the signals and sets the dials itself; on the planner's brief-only fallback, the
planner's brief unchanged.
The author returns a TopologyPlan (defined in `harness/zcode/agents/workflow-author.md`)
naming the pattern numbers it used. If the author's dials differ from the brief's, stop and
resolve the signals before going on. The planner already retried mismatches itself (at most
two retries); if a mismatch is still named, dispatch a fresh `workflow-planner` with that
mismatch and the current brief, never by the coordinator reading the material itself.

Shape rules for every plan:

- **Work kind determines stages.** Research uses discovery, source checking and synthesis;
  audits use inspection and confirmation; drafts use writing and review. Include code gates,
  capture, commits and merges only when the requested deliverable needs them.
- **One area, one lane, one worktree.** A one-area code change runs in a single run-owned worktree on
  `wf/<slug>`: implement, gate, trace, fresh judge, looped by the stop rule. No integration
  worktree, no merges, no per-round checkpoint commits, and no join other than the final
  report. The script makes one commit on `wf/<slug>` at the end so Step 6 has a branch to
  merge.
- **Pipeline is the default edge.** Each area is a lane. A stage starts as soon as its own
  input is ready. Lanes start together and are not awaited in sequence.
- **A join needs a reason from this list only:** (a) a merge of parallel work into the run's
  integration worktree, (b) a whole-set check across areas (dedupe, consistency, ranking),
  (c) the final report, (d) a rule in the task text that requires every plan before any
  implementation. Any other join is a finding.
- **Parallel writers need workspaces.** When two or more areas write code at the same time,
  each area works in its own run-owned worktree on a `wf/<slug>/<area>` branch, and merges go
  through one serialized git lane into a run-owned `wf/<slug>/integration` worktree. Areas
  that never write concurrently may share one run-owned worktree.
- **Exclusive resources serialize.** A desktop or mobile capture uses one single-worker lane.
  Web areas run in parallel, each with its own dev-server port and browser session.
- **Dependencies are per edge.** An area that `dependsOn` another awaits only that area's
  merge or plan, never the whole run.
- **Whole-set steps are not streamed per item.** A dedupe, ranking, or consistency check
  runs once after its join, never once per arriving item.

| Use case | Shapes (dynamic-workflows patterns.md) |
|---|---|
| Change in one area | 9 gated verifier loop, one lane |
| Change across several areas | 10 per-item pipeline (one lane per area), 9 gated verifier loop, 4 judge panel (when the judge dial is 3), 3 planner↔reviewer (when the plan dial is on) |
| Review changed files | 2 changed-file review sweep, plus per-finding confirmers |
| Research a question | 7 bounded discovery, 10 per-item search→cite-check, 8 salvage by report |
| Triage flaky tests | 10 per-item pipeline, 9 gated loop on the test command |
| Migrate call sites | 1 fan-out, 9 gate on the build and tests |
| Shape unknown until discovery | 14 growth by tail holes, 15 stage shaped by discovery |
| Route cheap work to flash | 13 model routing |
| Back-edge from a late stage to an early one | 12 feedback loop with a counted close (name it as a crossing edge) |
| Streaming items between stages | 11 streaming pipeline (name it as a crossing edge) |

## Step 3 — author the script

1. Load the **dynamic-workflows** skill with the Skill tool before submitting anything.
   CreateWorkflow refuses to submit until it is loaded in this session.
2. The workflow-author writes the script from the TopologyPlan, new each time, never copied
   from an older run. The coordinator passes the author's script text unchanged. The
   coordinator never writes script logic: a defect goes back to the author, which returns a
   revised script or an exact patch. The coordinator applies that patch verbatim (Edit on
   the run's draft file), then a fresh REVIEW when the REVIEW dial is on, then launch or
   AmendWorkflow. A coordinator-written change is a finding.
3. Script rules (binding; the platform contract wins on any conflict):
   - Phase names are string literals. `phase("...")` goes at the head of a stage's future, one
     per stage, never inside a per-item callback. Every phase contains at least one `ask` or
     `world.run`, as the §16.2 facade states, even though a publish-only phase may compile.
   - Lanes are futures started together, one per area. The author does not `await` a lane
     before starting the next one.
   - Each join is one `await Promise.all(...)` (or an `await` on named lanes) with a comment
     `// JOIN: <reason>` that gives its reason from the list above.
   - `const REPO` is set from the brief's `repoRoot`, passed as a script argument or literal
     taken from the brief. Never the cwd, never a path from an older run.
   - Each role is a named `agent()` with a `model()` literal. Names are unique per area and,
     for judges and confirmers, per round.
   - Loops use a literal round cap and the stop rule. Feedback carries forward. Never an
     unbounded `while`.
   - Gates are `world.run` with literal commands. A nonzero exit is a value the script reads.
   - Command output is parsed per line without trimming the whole output first. `git status`
     uses `--porcelain -z` (NUL-separated, path after the 3-character status) or
     `git diff --name-only` plus `git ls-files --others --exclude-standard`. Trimming the
     whole porcelain output eats the first line's leading space and corrupts the first path
     (`app.js` became `pp.js`, `README.md` became `EADME.md` in two separate runs).
   - A finding that names a path is labelled verified only when that exact path exists in the
     command output it came from.
   - The script stays within the computed complexity budget, or the plan's `budget` field says
     why it does not.
   - No `import`, `Date.now`, `Math.random`, `fetch`, `fs`, or nested workflows.
   - Deliverable: one primary markdown artifact and the final `{conclusion, findings,
     verified, notCovered}` return.

## Git rules for generated scripts

- **Allowed git**: read-only commands (`status`, `diff`, `log`, `rev-parse`, `ls-files`,
  `show`), `worktree add` for run-owned worktrees, `commit` and `merge` on run-owned `wf/*`
  branches inside run-owned worktrees, and `worktree remove` without `--force`.
- **Forbidden git**: `checkout --` or `restore` on any path, `reset --hard`, `clean`,
  `worktree remove --force`, `branch -D`, `push`, `rebase`, `stash`, `add -A`, `--no-verify`,
  and any mutation of the user's checkout or current branch.
- **Every git call checks its exit code.** A nonzero exit is recorded in findings and stops
  that lane's git chain. A merge with a nonzero exit runs `git merge --abort` in that
  worktree and records the conflict; it never retries with a strategy flag.
- **Purity checks report, never restore.** A check that finds edits outside an area's paths
  lists them as findings with the paths. It never reverts them.
- **Worktree cleanup**: remove a worktree only after its lane reports `merged` (in a
  one-area run: after the final commit succeeded), without `--force`. A lane that did not merge keeps its worktree. All `wf/*` branches are kept.
- **Commits**: commits on run-owned `wf/*` branches are the transport for merges and are
  allowed. A one-area run makes exactly one, at the end; a multi-area run makes one per lane
  before its merge, not one per round. The script never commits on the user's branch; the
  run's commits reach it only through the coordinator's fast-forward in Step 6.
- Git mutations go through one serialized chain, for example
  `gitTail = gitTail.then(() => world.run("git", ["-C", wt, "merge", "--no-ff", branch]))`,
  followed by an exit-code check. Read-only git and file reads may run in parallel.
- Subagents never run git mutations. The script does, through the chain.

## Step 4 — pre-flight

- **Snippet check.** For fixed logic (gate-argument building, parsers, refusal rules), run
  EvalWorkflowSnippet. It is synchronous, has no subagents, and persists nothing.
- **Parser rehearsal.** Run every output parser in EvalWorkflowSnippet against real output
  from a scratch worktree in the state the run will see: one unstaged modification, one
  untracked file, and a path whose first character would be lost to a stray trim. A parser
  that names a path not in the output goes back to the author.
- **Persona kit drift check.** When the script carries the persona-kit block, run the
  drift check from "Specialist agents in workflows"; any output goes back to the author.
- **Command set.** Extract every `world.run` call from the script (tool and args template)
  and check each against the git rules. Any forbidden command goes back to the author.
- **Budget check.** Count the script's lines, distinct `agent()` roles, asks per round, and
  worktrees with one command (for example `wc -l` and `grep -c`), and compare them with the
  computed budget. An overage without a reason in the plan's `budget` field goes back to the
  author as a defect. Report the counts with the command set in Step 5.
- **Fresh REVIEW, when the REVIEW dial is on.** Dispatch a second fresh
  workflow-author in REVIEW mode with the script text, the TopologyPlan, and the resolved
  contract path. Every compile-blocking, topology, and safety finding goes back to the author;
  the revised script gets a new REVIEW. Otherwise the in-run judges are the review.

## Step 5 — approve, launch, and watch

- **Show the command set first.** Before CreateWorkflow, list for the user every command the
  script can run (tool and args template), grouped as gates, read-only git, and git
  mutations, plus the signals, dials, band, and model per role.
- **Approval is the gate.** Every workflow launches through the approval dialog. The dialog
  appears in every permission mode, including Full access, unless "Always allow in this
  session" was chosen earlier in the session. Never pick that option, or "always allow", for
  a workflow that runs any git mutation; choose "Allow only this time". If an earlier
  workflow in this session was always-allowed, stop and ask the user before launching.
- ONE CreateWorkflow call with the inline `script` and `name: "zflow-<task-slug>"`. Add
  `max_concurrency` or `subagent_model` only when the user asks for them.
- Do not poll. Completion arrives as a notification.
- If a subagent escalates, answer with ResolveWorkflowQuestion, or ask the user first with
  AskUserQuestion. If the script is wrong, send the defect to the author, get a fresh REVIEW,
  then AmendWorkflow with the revised file path. Never relaunch. ResumeWorkflowRun continues
  a stopped run unchanged.
- When a hole is reached, obtain its continuation from the workflow-author using the
  findings so far, then pass the supplied body unchanged to FillWorkflowHole.

## Step 6 — merge into the user's checkout (after the run)

The coordinator owns checkout delivery; workflow scripts merge only into run-owned
worktrees. This step applies to successful local writing runs, including profiles and
opt-in Rustflow implementation. Read-only work has no checkout merge. A run with committing
or delivery disabled leaves its result for review. An explicit "don't merge" also leaves
the destination branch untouched; do not ask to override it.

Before launch, record the checkout's `HEAD` and full branch ref with
`git -C <repo> symbolic-ref --quiet HEAD`. Detached HEAD disables automatic delivery.
The final result is the run-owned branch (`wf/<slug>` or `wf/<slug>/integration`), or the
explicit saved engine's integration branch. Finish every lane before delivery, require the
result worktree clean with all intended changes committed, and rerun every task gate on
that combined committed result. Per-lane gate results alone do not establish integration safety.

The coordinator fast-forwards **without asking** only for low/medium-risk work when the
user has not requested review first, and every command check below passes in order:

| Check | Command | Must show |
|---|---|---|
| The run ended clean | the run report and recorded gate results | zero open findings, every lane complete, every required gate green |
| The checkout is clean | `git -C <repo> status --porcelain` | exit 0 and empty output |
| The destination branch is unchanged | `git -C <repo> symbolic-ref --quiet HEAD` | exit 0 and the captured full branch ref |
| The checkout commit is unchanged | `git -C <repo> rev-parse HEAD` | exit 0 and the captured base commit |
| Delivery is a fast-forward | `git -C <repo> merge --ff-only <result-branch>` | exit 0 |
| The delivered checkout passes | every task gate, scoped to `<repo>` | every gate exits 0 |

Stop at the first failure. Never merge while lanes are still writing or between fix rounds.
If a pre-merge check fails, keep the branches/worktrees and report the exact failed check;
ask before any alternative integration. High-risk work and an explicit review-first request
also require approval before merging, after the result and evidence are ready. Approval does
not permit force, resets, bypassed gates or an unreviewed conflict resolution.

If post-merge gates fail, report that delivery occurred, old/new HEAD and failing commands.
Do not merge again or automatically undo it. Never push, delete run branches, or copy files
into the checkout by hand. Report the destination branch, result branch, old/new HEAD,
diff stat, gate results and whether delivery happened, was declined or was blocked.

## Vision phase (when the Vision dial is on)

The vision phase checks what the user will see, which gates and unit tests cannot. It runs
inside the lane after the gate, every round, and uses all three model tiers on purpose:

1. **Capture (no model when possible).** The script captures with `world.run`, for example
   `agent-browser --session <lane> open file://<worktree>/<page>`, then
   `agent-browser --session <lane> screenshot <worktree>/.zflow/evidence/<lane>-r<round>-<n>.png`,
   then `close`. A `file://` URL works only for a page with no module scripts and no `fetch`;
   browsers refuse ES modules over `file://`, so the page renders empty and the screenshot
   lies. A page that needs HTTP is served inside ONE blocking `world.run`, for example a
   `bun --eval` TypeScript helper that starts a local server on port 0, awaits the
   `agent-browser` subprocesses asynchronously, then closes the browser and server in
   `finally`. Do not use synchronous subprocesses while that server needs its event loop.
   The capture records the HTTP status of the page and its scripts, and a capture whose page
   loaded no scripts or rendered no content is a finding. Only when capture needs a
   long-running dev server, a desktop app, or a device does a flash capture driver do it,
   and desktop and mobile captures go through one single-worker lane. A capture that
   wrote no file is a finding, never a pass.
2. **Vision audit (flash).** A fresh `vision-audit-<lane>-r<round>` agent reads the PNGs and
   returns one row per visible requirement stated in the task: the requirement, what the
   screenshot shows, the evidence path, and `met`, `not met`, or `cannot tell`. It never
   decides pass or fail and never edits files.
   **The audit is blind.** Its ask carries only the screenshot paths, the viewport, and the
   requirement text copied from the task. Never put measured values (colours, contrast,
   boxes, text content), code, file contents, or the coordinator's expectations into it: a
   primed auditor repeats the numbers instead of reading the image, and the run can no
   longer tell whether vision works. Command measurements run after the audit, never before
   it is asked.
3. **Command check (no model).** Every `not met` or `cannot tell` row gets a command that
   decides it, written by the script from the requirement: `agent-browser eval` for computed
   styles or contrast, `agent-browser is visible <sel>`, `agent-browser get box <sel>` for
   layout and overlap, `agent-browser get text <sel>` for content. A row a command reproduces
   is **verified** and becomes a fix target. A row no command reproduces stays
   **unconfirmed**: it goes to the implementer as a hint and into the report, never into the
   stop count.
   Run the same commands for `met` rows too, and record every row where the blind audit and
   the command disagree as a vision-reliability finding in the report. A command result
   decides the row either way.
   Screenshots stay on this machine. Agents and the coordinator read them with the local
   Read tool; never send evidence to a remote image-analysis tool or URL.
4. **Judge (pro).** The lane's fresh judge gets the screenshot paths and the audit rows with
   their command results, along with the diff. Pro reads images too; a judge's own visual
   finding is labelled judged.

The run's model mix is checked from its actors: pro only for implementer, judge, planner,
attacker, auditor, and writer roles; flash only for the roles in the Model matrix; and no
model for capture and command checks when they can run as `world.run`.

## Specialist agents in workflows (persona kit)

A workflow cannot call an agent by name: `agent()` takes only a system prompt and a model.
It can load an agent file at run time and use its body as the prompt. Every workflow does
this through one shared, tested block: `persona-kit.dwf.ts` in this skill's folder.

1. Paste the canonical block, from `// persona-kit:start v4` to `// persona-kit:end v4`,
   unchanged into the script. Workflow scripts cannot import it.
2. Load each selected file with `loadPersona(path, { tier, access })`. Use `tier: "pro"`
   in z-proflow, `"flash"` in z-flashflow, and `"any"` elsewhere. Set `access: "write"`
   only for scoped implementation or evidence capture; reviewers, planners and auditors use
   `"read-only"` even when the file lists Bash. Missing or invalid personas block that role.
3. Create `personaAgent(p, uniqueName, RUN_RULES)`. Pass worktree and scope rules explicitly;
   never grant Git mutations or external writes through a domain assignment.
4. Wrap every read-only ask in `guardWrites(p, worktree, () => ...)`, with no simultaneous
   writer in that worktree. Guard errors block progress; retain findings even if an ask throws.
5. Include `personaFindings` in run findings and `personaReport()` in the report. List each
   path, sha256, access and selected model with the command set before launch. Include the
   loader's `cat`/`shasum` and guard's `bun --eval` commands in that set.

The kit validates the declared model before profile overrides. Model selection uses the
file's `model` and `thoughtLevel` among declared GLM variants. The reasoning effect of the
`$level` suffix remains unverified. `tools` metadata is advisory inside workflows; explicit
access controls the prompt and change detection. Fingerprints detect source, index and HEAD
changes outside ignored paths and `research/`; they do not prevent writes or prove absence
of external effects. Bun and Git are required for the guard. The Bun helper disables project config and
`.env` autoloading and refuses filenames it cannot decode losslessly. Report uncovered
surfaces; never call this a sandbox. Agent files must follow the project rules and required
skills in addition to the run's instructions.

**Drift check.** Before launching any script that carries the block, prove the copy is
unchanged against the active `persona-kit.dwf.ts` (using `<repo>/.zcode/skills/z-workflow/persona-kit.dwf.ts` when the project was initialized with `z-project-init`, otherwise `~/.zcode/skills/z-workflow/persona-kit.dwf.ts`); the command must print nothing:

```bash
KIT="<repo>/.zcode/skills/z-workflow/persona-kit.dwf.ts"
[ -f "$KIT" ] || KIT="$HOME/.zcode/skills/z-workflow/persona-kit.dwf.ts"
diff <(sed -n '/^\/\/ persona-kit:start/,/^\/\/ persona-kit:end/p' "$KIT") <(sed -n '/^\/\/ persona-kit:start/,/^\/\/ persona-kit:end/p' <script>)
```

A changed kit is fixed in `persona-kit.dwf.ts` first (with a new version marker), then
re-pasted everywhere that carries it, including the z-liteflow template and Shipflow queue.

## Model matrix

| Role | Tier | Rule |
|---|---|---|
| Implementer, judge verdict, reviewer, planner, plan attacker, auditor, writer, committer | pro | Quality is judged, not checked. |
| Confirmer | pro, or flash only when a command decides the finding | The command, not the model, makes the call. |
| Requirement tracer | flash | One row per requirement with a `file:line` quote. The script greps each quote; the pro judge sees only unmatched rows. |
| Citation checker | flash | Existence and exact quote match only. |
| Gate-log classifier | flash | Sorts failures into categories; never decides pass or fail. |
| Read-only explorer | flash | Search and listing only. |
| Vision auditor | flash | Reads screenshots and returns one row per stated visible requirement; never decides pass or fail. |
| Capture driver | flash, only when capture needs a long-running server or a device | Runs capture commands exactly as told; never fixes anything. |
| Gates, git, file reads, size checks | none | `world.run`, `files.*`, `git.*` in script. |

Flash is never a judge. Evidence: the verification campaign `dwfrun-d14998c7` found that
flash judges passed properties with no independent check. Flash is fit for checkable output:
the plain-r citation checker ran on flash and finished. A code run meets pillar 3 with a
requirement tracer; a research run with a citation checker.

Use the provider ids already in this repo's engine until the open question on ids is settled
(see Grounded in).

## Review rules for judges (inside the run)

- A judge sees the area's diff, spec, and any unmatched tracer rows, never the implementer's
  reasoning.
- When the confirmer dial is on, a finding becomes a fix target only after a fresh confirmer
  reproduces it by command; unreproduced findings stay unconfirmed and are reported, never
  silently dropped. When it is off, judge findings are fix targets labelled judged.
- An area is clean when it has zero open findings and every gate is green. Otherwise the stop
  rule ends its loop.

## Honesty and evidence

- Each subagent prompt tells it to read `agentsMd` first when the repo has one.
- Findings keep their labels (verified, judged, unconfirmed). Nothing is silently dropped.
- Evidence (screenshots, logs) is written by a `world.run` command under `.zflow/evidence/`.
  Its paths go in the report.
- Gate output may be inlined in findings, trimmed to the failing lines. Source and document
  file contents are never inlined; pass paths.
- Half-done work stays on disk and appears in notCovered.

## Final report (coordinator relays)

From the run's WorkflowReport: `conclusion`, `findings` with status labels, `verified`, and
`notCovered`. Add the measured signals, dial values, and band, the budget counts (script lines,
roles, asks per round, worktrees) against the computed budget, the lane trace (stages per area, joins with
their reasons), the planning actor (planner or author-direct) with its fallback state if
any, the model per role with the flash count, the round count and stop reason per
area, the `wf/*` branches and worktrees left, changed paths, and artifact paths. Name every
pattern number the plan used.

## Grounded in

- Platform contract: the `dynamic-workflows` skill, `SKILL.md`. Sections: §1 entry gate, §2
  topology, §3 fresh eyes, §7 pipelining and streaming, §8 phases, §12 anti-patterns, §13
  lifecycle, §14 escalation, §15 holes, §16.1 CreateWorkflow, §16.2 facade, §16.3 compile
  rules, §16.4 AmendWorkflow, §16.6 EvalWorkflowSnippet.
- Catalogue: the same skill's `patterns.md` (16 shapes), and `examples.md` (7 worked scripts).
- Parallel design reference: `harness/zcode/workflows/zflow-engine.dwf.ts` (per-area lanes on
  channels and futures, serialized git, single-worker device lane) and `zflow-SPEC.md`. The
  engine's pattern is reused as knowledge, not as a fixed template.
- Subagent definitions: `harness/zcode/agents/workflow-author.md` and
  `harness/zcode/agents/workflow-planner.md` (with its flash variant).
- Repo rules: `ai/AGENTS.md` (skill folder naming and harness kit layout).
- Run evidence behind these rules: plain-s, plain-m, plain-r, and the pending plain-l script
  (destructive git, hard-coded repo, mislabelled tier), and campaign `dwfrun-d14998c7`.
- Open question: model ids. The engine pins `account:zai-individual-coding-plan/GLM-5.3`,
  while `AGENTS.md` names `glm-5.3` against the `zai` providers. Verify with ListModels before
  first use.
