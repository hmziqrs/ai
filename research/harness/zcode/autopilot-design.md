# Autopilot: autonomous PRD-driven delivery with GitHub as the source of truth

Date: 2026-10-18. Status: design proposal for discussion; nothing here is implemented yet.
It builds on `zflow-migration-plan.md` in this folder. If adopted, it reverses four of that
plan's decisions for autonomous mode; section 13 lists them.

The goal: give the harness one reference website and a one-line intent ("build me the same
site"). From there, agents run discovery, PRD, task breakdown, implementation, testing,
review, and merge with no blocking human input. GitHub (repository plus issues) holds
every piece of project state.

## 0. Short answers

### Should the GitHub agents be merged?

Yes, and the cut should go one step further. Today there are four GitHub-facing agents:

| Agent | What it does | Judgement involved |
|---|---|---|
| `z-github-project-manager` | Triage, dependency order, milestones, op plans (read-only) | Yes |
| `z-gh-operator` | Executes an exact list of `gh` label, assignee, comment and PR-create commands | None |
| `z-pr-merge-steward` | Reads merge-readiness facts; runs one merge pinned to a reviewed SHA | None |
| `z-queue-sentinel` | Counts issues per label, claim ages, pause flag | None |

The split came from least privilege: the agent that decides never acts, the agent that acts
never decides, and the riskiest act (merge) gets its own narrow agent. In practice it buys
little:

- **The limits are only prompt text.** Every one of these agents has `Bash`, so "may not
  merge" is a sentence in the prompt.
- **Three of the four exercise no judgement.** An LLM told to "run exactly this list of
  `gh` commands" is a slower and less reliable `world.run`.

Recommendation:

- **One agent owns project-state judgement.** That covers the PRD, backlog decomposition,
  triage, priorities, and issue and PR text. Rename `z-github-project-manager` to
  `z-product-owner` and give it modes (section 11).
- **Every mechanical operation becomes tested code.** The operations:
  - claim and release
  - label transitions
  - sub-issue and dependency writes
  - PR creation
  - the merge-readiness predicate
  - the merge itself
  - the queue snapshot

  They become `github-kit.dwf.ts`, pasted unchanged into run scripts the way the persona
  kit is, with mocked tests. The deleted `check-shipflow.mjs` tested exactly this kind of
  policy code.
- **Merge safety moves server-side.** A branch ruleset with required checks enforces it,
  plus a merge queue where GitHub offers one. A server rule cannot be talked out of its
  policy; an agent can.
- **Delete `z-gh-operator`, `z-pr-merge-steward` and `z-queue-sentinel`.** Keep
  `z-security-auditor`: it is a reviewer, not a GitHub agent.

### What was the PR merge steward for?

It existed because z-workflow says "Flash never decides" and merge policy must be code. It
wrapped `gh pr view --json ...` and `gh pr merge --match-head-commit <sha>` so that a Flash
agent could report the facts and a script could decide. The merge policy itself lived in
the script all along. With a ruleset and the kit, the agent adds nothing.

### Is end-to-end development with no human input feasible?

Yes, for building and testing against an objective oracle. Section 1 has the evidence:

- Anthropic's C compiler: 16 parallel agents and about 2,000 sessions, with no human-written
  code.
- The planner/generator/evaluator harness: hours per app, not weeks.
- The long-running harness that built a claude.ai clone from a 200+ item feature list.

Every one of them rests on three things:

1. State kept outside the model.
2. An independent, near-perfect verifier.
3. Plain code that dispatches small, bounded units of work.

And every one fails in the same three ways:

1. Agents grade their own work too kindly.
2. Agents optimise whatever the verifier checks, even when the verifier checks the wrong
   thing.
3. Vague tasks produce unmergeable work.

The design is built around those three pillars and those three failures. A website clone
fits well, because the reference site is an oracle, the way GCC was for the compiler.

A human is needed at kickoff to accept the charter: budget, authority and credentials
(section 12). Whether the owner also approves the PRD is a charter setting (section 4.6).
The recommendation is a non-blocking review window when there is a reference site, and a
required approval when there is none. Beyond that nothing blocks on a person. People can
still steer asynchronously through GitHub, and someone should look at the result before
relying on it.

## 1. What the evidence says

| Source | Finding | Consequence here |
|---|---|---|
| Anthropic, *Effective harnesses for long-running agents* (Nov 2025) | The initializer writes a 200+ item feature list, all failing at first. Coding agents may only flip a `passes` flag; JSON was chosen because the model is less likely to rewrite it. The initializer also writes a progress file, an `init.sh`, and the first commit. Coding agents take one feature per session and test end to end in a browser as a user would. Observed failures: one-shotting, declaring victory early, marking features done without an e2e check. | The machine PRD index is JSON and is protected. A task is one cycle. Every cycle orients, verifies and commits. Acceptance means browser e2e. |
| Anthropic, *Harness design for long-running application development* (Mar 2026) | There are three agents: planner, generator and evaluator. The planner keeps the spec at product level so spec errors do not cascade. Generator and evaluator agree on a done contract before coding. The evaluator uses Playwright, hard thresholds and a few-shot calibrated rubric. Self-evaluation is lenient. Load-bearing parts were found by removing one at a time. | Separate evaluator agent, done contracts, PRD detail rules, calibrated rubric, and ablation as models improve. |
| Anthropic, *Building a C compiler with a team of parallel Claudes* (Feb 2026) | A bash loop with one container per agent and a shared git repo. Tasks are claimed with lock files. The verifier has to be nearly perfect. GCC served as the oracle. Test output is kept short and logged to files, and a `--fast` sampled suite runs during iteration. Specialised agents handled dedup, performance, docs and design critique. The author warns against assuming a job is done because tests pass. | Claims through GitHub instead of lock files, the reference site as oracle, output hygiene, janitor roles, and heavy investment in verifiers. |
| Anthropic, *Long-running Claude for scientific computing* (Mar 2026) | A plan file, a test oracle, and a progress log that records failed approaches with reasons. A commit after every unit of work. A Ralph loop that re-asks "does this really meet spec" to counter early stopping, with an iteration cap and a completion signal. | An attempt journal that records failed approaches, an explicit project done definition, and caps. |
| Anthropic, *How we built our multi-agent research system* (2025) | Orchestrator plus workers. Many times the tokens of a single chat. Effort scaled to the task. Subagent briefs need an objective, an output format and boundaries. | Fan out only where work is truly parallel; brief quality is the lever. |
| Ralph loop (Huntley, 2025) and community reports | A bash loop that re-feeds one prompt to one agent with a fresh context each time. The spec and plan files are its memory, and it does one task per iteration. It needs a real PRD. Workflow graphs have since replaced it inside a unit of work. | Two ideas carry over: a fresh context per run, and state kept in files and GitHub. The outer layer is a dispatcher (8.1), not a prompt loop. |
| ccpm (Claude Code PM) and "GitHub as long-term memory" write-ups | PRD to epic to task files to GitHub epic plus sub-issues. The issue body is the executing session's only context: files, acceptance criteria and size. Closed equals done. | The issue body carries everything a cycle needs; the issue state is the truth. |
| GitHub Agentic Workflows (gh-aw) | Agents in Actions are read-only by default; writes go through sanitised "safe outputs". | GitHub mutations go only through the kit, which plays the role of our safe outputs. |
| Practitioner counter-evidence | A week-long build turned out to be "faking it", and subagent compliance checks did not catch it. Vague issues rarely produce mergeable changes. | An objective oracle, plus a PRD lint that rejects untestable acceptance criteria. |
| GitHub docs and changelog | Sub-issues REST: `POST /repos/{o}/{r}/issues/{n}/sub_issues` with the numeric `sub_issue_id`. Dependencies REST: `POST .../issues/{n}/dependencies/blocked_by` with a numeric `issue_id`. Both warn about secondary rate limits. `gh` 2.94+ adds `--parent`, `--blocked-by`, `--blocking` and `--type`. Issue types are organisation-level only. Merge queue covers org-owned public repos and Enterprise Cloud. | The reconciler is paced and uses ids, not numbers. Local `gh` is 2.92, so upgrade it or use `gh api`. Labels stand in for types on personal repos. A merge train fills in where there is no merge queue. |
| ZCode on this machine (CLI 0.16.9 help, bundled guides) | Headless `zcode -p`, with `--mode` set to build, edit, plan, yolo or guarded (yolo is the default for `-p`), `--workflow-mode onDemand\|alwaysOn`, a `--target` session goal, `--resume`, `--json`, and `--browser-use headless`. Hooks: SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, Stop. Workflow contract: the user approves a run's command set at confirmation; runs are recorded and resumable. | A headless dispatcher plus hook-enforced policy is possible inside ZCode. Spike S1 must confirm how headless mode treats the confirmation step. |

Claude Code shipped a similar "a script orchestrates subagents" feature in May 2026
(reported, not checked against Anthropic's docs). Reports also say it takes no mid-run
human input. That supports the shape used here: runs are autonomous units, and the
dispatcher lives outside them.

## 2. Principles

1. **State outside the model.** GitHub and the repository hold everything. Each run starts
   by reading them, and nothing important lives only in a context window.
2. **Plain dispatcher, bounded runs.** The dispatcher is plain code that starts a run on a
   schedule or a GitHub event. Intelligence lives inside bounded workflow runs, each one
   shaped for the project's state at the moment it starts.
3. **Oracle first, opinions second.** Command-backed checks decide. Agent verdicts add
   findings; they never wave work through.
4. **The builder never grades itself.** The test author is not the implementer, and the
   judge is not the builder. The spec and the acceptance tests are protected paths.
5. **Policy is code.** It is enforced by GitHub server rules and by ZCode hooks, never by
   prompt text.
6. **One task, one cycle, one PR.** Failure splits the work; it never repeats the same
   attempt.
7. **Never block on a person.** Gaps become logged assumptions, and owners can steer
   asynchronously.
8. **Budgets and stop rules are explicit** and enforced in code.
9. **Everything is idempotent and resumable**, keyed by stable IDs.
10. **Use the simplest harness that works.** Re-test each component's value when the model
    changes.

## 3. Shape

```
 ONCE (kickoff)                          REPEATING (until done, paused, or out of budget)
 +-------------------------------+       +------------------------------------------------+
 | charter (owner, once)         |       | DISPATCHER: code, outside any model            |
 | recon -> discovery pack       |       |   on schedule or GitHub event: read GitHub     |
 | PRD -> lint, critics, approve | ----> |   -> choose action -> one bounded run          |
 | decompose -> acceptance tests |  Git  |                                                |
 | reconcile PRD -> GitHub       |  Hub  | RUN: dynamic workflow, K parallel task lanes   |
 +-------------------------------+ <---- |   claim -> implement -> verify -> PR -> merge  |
                                         | AUDIT (periodic): parity + NFR + retro         |
                                         |   -> gap issues, PRD-change PRs, AGENTS.md PRs |
                                         +------------------------------------------------+
```

How a human team's process maps to agents:

| Human practice | Agent equivalent |
|---|---|
| User research, competitor teardown | Recon of the reference site (section 5) |
| PM writes the PRD | `z-product-owner`, PRD mode |
| PRD review meeting | PRD lint and fresh critic agents, plus the owner when the approval mode asks (4.6) |
| Tech design, ADRs | Foundations section and ADRs, plus an architecture critic |
| Backlog grooming, estimation | Decomposition, sizing, dependency DAG |
| Sprint planning | The dispatch policy (8.2), plus rolling-wave task breakdown (4.0) |
| Stand-up | The GitHub snapshot |
| Development | `z-*` specialists in worktree lanes |
| Code review | Fresh judges, security audit |
| QA | Acceptance tests, parity tests, skeptical evaluator |
| Release | The done check, then tag and report |
| Retrospective | Audit mines attempt journals and proposes AGENTS.md and skill updates by PR |

## 4. The PRD

### 4.0 From one line to tasks

The PRD grows top-down. The one-line goal becomes an overview page, the page becomes
sections, sections become features, and features become tasks. Three rules shape each step:

1. **Every expansion rests on evidence, not invention.** With a reference site, recon runs
   before any PRD writing, and each level cites the discovery items it covers. Without a
   reference, the product owner first researches comparable products and conventions, and
   every gap becomes a logged assumption.
2. **One level at a time, with a gate between levels.** An error caught at the overview page
   costs one revision; the same error found after task breakdown costs dozens. Each stage
   expands exactly one level, and the next stage starts only when the gate passes.
3. **Tasks are written late (rolling wave).**
   - Sections and features with acceptance criteria are written for the whole product up
     front.
   - Tasks are written up front only for the first two milestones.
   - Each later milestone is broken into tasks when the previous one is about 70% done,
     against the code that exists by then.

   Task detail written weeks ahead, for code that does not exist yet, goes stale. This is
   what human teams call rolling-wave planning.

| Stage | Input | Output | Who | Parallel by | Gate before the next stage |
|---|---|---|---|---|---|
| S0 Charter | One-line goal and reference URL | `autopilot.yaml`: budget, authority, PRD approval mode | Owner, once (defaults offered) | none | Owner accepts the charter |
| S1 Recon | Reference site | Discovery pack (section 5) | `explore-flash` per route cluster, plus a pro summariser | Route cluster | Every archetype captured; every recorded journey replays on the reference |
| S2 Overview page (level 0) | Goal and discovery pack | `prd.md`: summary, users, top journeys, scope, NFR budgets, stack ADR, design-system draft, and a section index with one purpose paragraph per section | `z-product-owner`, PRD mode | none | Lint and critics: every archetype and journey maps to a section; scope matches the parity target |
| S3 Sections into features (levels 1-2) | Overview page plus that section's slice of the discovery pack | `sections/<CODE>.md`: features with story, acceptance criteria, UI states, data contract, edge cases | One `z-product-owner` per section | Section | Lint and critics per section, then one cross-section pass for data-model, shared-component and dependency consistency. **PRD v1 is complete here; approval follows (4.6).** |
| S4 Acceptance tests | Acceptance criteria and recorded journeys | Protected acceptance and parity specs | Area specialist as test author | Feature | Every test fails on the empty scaffold, so it asserts something. Where the reference shows the behaviour read-only, the test passes against the reference, so the test itself is right. |
| S5 Tasks (level 3), rolling wave | Features of the next milestone plus the live code | Task blocks: area, dependencies, tests, size | `z-product-owner`, PLAN mode, reading the code | Feature | DAG lint: acyclic, every task S or M, every acceptance criterion covered by at least one task |
| S6 Publish | PRD and `index.json` | GitHub tree: epics, features, tasks, dependencies, labels, milestones | Reconciler (code) | none | A second reconcile changes nothing |

Each stage is a separate bounded run, and later stages see only what they need. A section
writer reads the overview page and its own slice of discovery, not the whole pack. A task
writer reads one feature and the code it touches. That keeps every context small, and it
keeps the PRD at product level, where errors stay cheap (the planner rule in section 1).

**Without a reference site** (an original product), the pipeline is the same with three
changes:
- S1 becomes research: comparable products through web search, plus conventions for the
  domain.
- Parity tests do not exist, so L4 is replaced by journey tests derived from the acceptance
  criteria.
- The PRD approval default becomes `human` (4.6), because nothing but the owner can judge
  intent.

### 4.1 Three levels under a root

| Level | Name | What it is | Size rule | GitHub object |
|---|---|---|---|---|
| 0 | Root | Vision, users, scope, NFR budgets, milestones, section index, project done definition | One per project | Pinned issue `[PRD]` plus a Project board |
| 1 | Section | A capability area a user would name (Auth, Leaderboards, Compare, Forum), plus Foundations | 4-10 per product; 2-8 features each | Top-level epic issue |
| 2 | Feature | One user-observable behaviour you can demo | 3-10 acceptance criteria; 2-8 tasks | Sub-issue of its section |
| 3 | Task | One agent cycle: one area, one PR | At most about 10 files and 300 changed lines; named tests | Sub-issue of its feature |

A fourth level is a smell. It means a feature should be a section, or tasks should be cut
differently. The PRD lint rejects depth above three.

### 4.2 Files

```
prd/
  prd.md                     root
  sections/<CODE>.md         one section with its features and tasks
  data-model.md              entities, fields, relations
  design-system.md           tokens and components measured from the reference
  decisions/ADR-<n>-*.md     architecture decisions
  assumptions.md             gaps the system filled, each with confidence and evidence
  index.json                 generated machine index: ids, parents, deps, AC ids, test ids, hashes
discovery/                   recon output: manifest, archetypes, journeys, screenshots (Git LFS)
tests/acceptance/            acceptance tests, written before implementation (protected)
tests/parity/                reference-parity specs and baselines (protected)
```

Status never lives in the PRD: the PRD says *what*, GitHub says *where we are*. An agent
that cannot edit the spec cannot win by rewriting it. This is the same reasoning as
Anthropic's JSON feature list, where only the `passes` flag was editable.

### 4.3 Identifiers

- **Sections:** a code of 2-4 letters, such as `LB`.
- **Features and tasks:** `LB-2` is a feature and `LB-2.4` a task in it.
- **Acceptance criteria:** `LB-2.AC3`.
- **Assumptions and decisions:** `A-017` and `ADR-003`.

IDs are never reused or renumbered. A dropped item stays in `index.json` as `dropped`, and
its issue is closed as not planned.

### 4.4 Templates

**Root (`prd.md`):**
1. Summary in 3-5 sentences, plus the reference: URLs, capture date, and the parity target.
   The target is structure, layout and interactions, never brand or content.
2. Users and the top five journeys end to end. Each journey links the features it crosses.
3. Scope: in, out, and later.
4. NFR budgets:
   - Performance: LCP, CLS and INP.
   - Accessibility: zero serious axe violations, WCAG 2.2 AA.
   - SEO basics and a security baseline.
   - A browser and viewport matrix.
5. Architecture summary, linking the ADRs: stack, hosting target, data store, auth approach.
6. Milestones:
   - M0 foundations
   - M1 core read paths
   - M2 interactions and accounts
   - M3 parity polish and NFR
7. Section index.
8. Glossary.
9. Project done definition (section 10).

**Section file:** YAML front matter (`id`, `title`, `milestone`, `depends_on`,
`reference_archetypes`), a purpose paragraph, then feature blocks.

**Feature block:** story, reference evidence, acceptance criteria in Given/When/Then form,
UI states (loading, empty, error), data contract, edge cases, out of scope, then task blocks.

**Task block:**

| Field | Content |
|---|---|
| Goal | One sentence |
| Area | Paths |
| Depends on | Task IDs |
| Satisfies | Acceptance criterion IDs |
| Tests | Acceptance or parity tests that must pass; new unit tests are expected |
| Size | S (up to 150 lines) or M (up to 300). L is a lint error that forces a split. |
| Notes | Reference evidence, gotchas |

A task carries no step-by-step implementation plan. The cycle's planner writes that against
the live code. This follows the planner rule above: product-level specs do not cascade
their errors.

### 4.5 Worked example: an LLM benchmark site

Input: a reference URL and "I want an exact same website". Kickoff could produce:

| Code | Section | Features (level 2) | Depends on |
|---|---|---|---|
| FND | Foundations | FND-1 Scaffold and CI; FND-2 Design system from measured tokens; FND-3 App shell (header, nav, footer, routing, 404); FND-4 Data layer (schema, migrations, seed import); FND-5 Test and parity harness; FND-6 SEO and metadata | none |
| AUTH | Accounts | AUTH-1 Sign up and sign in (email, OAuth behind an adapter with a dev mock); AUTH-2 Sessions and protected routes; AUTH-3 Profile and settings; AUTH-4 Roles (member, admin) | FND |
| LB | Leaderboards | LB-1 Overall leaderboard; LB-2 Category leaderboards; LB-3 Sort, filter, search; LB-4 Score details (confidence interval, votes, tooltips); LB-5 Last-updated and methodology links | FND |
| MDL | Models and benchmarks | MDL-1 Model directory; MDL-2 Model detail page; MDL-3 Benchmark pages; MDL-4 Admin add/edit model and scores, with CSV/JSON import | FND; AUTH-4 for MDL-4 |
| CMP | Compare | CMP-1 Model picker (search, add up to N); CMP-2 Side-by-side table; CMP-3 Charts; CMP-4 Shareable URL state; CMP-5 Add more models in place | LB-1, MDL-2 |
| FRM | Forum | FRM-1 Categories and thread list; FRM-2 Thread view; FRM-3 Post and reply (signed in); FRM-4 Votes; FRM-5 Moderation (report, hide, lock) | AUTH |
| INFO | Static pages | INFO-1 About and methodology; INFO-2 FAQ; INFO-3 Legal pages (own content) | FND-3 |

One section expanded, `LB`:

**LB-1 Overall leaderboard.** As a visitor, I see every model ranked by overall score.

| ID | Acceptance criterion |
|---|---|
| LB-1.AC1 | Given seed data, `/leaderboard` shows rank, model, organisation, score, 95% CI, votes and licence, sorted by score descending. |
| LB-1.AC2 | Models with equal scores share a rank number. |
| LB-1.AC3 | Each model name links to its detail page. |
| LB-1.AC4 | 100 rows render within the LCP budget, paginated or virtualised as the reference does. |
| LB-1.AC5 | The leaderboard region's aria snapshot matches `tests/parity/leaderboard.aria.yml`, and static chrome is within the visual-diff threshold at 1440, 768 and 390 px. |

| Task | Area | Depends on | Tests | Size |
|---|---|---|---|---|
| LB-1.1 Leaderboard API endpoint and query | `server/api/leaderboard` | FND-4.2 | API contract test | S |
| LB-1.2 Ranking rules (ties, missing scores) | `server/domain/ranking` | FND-4.2 | Unit/property tests; AC2 | S |
| LB-1.3 Leaderboard table component | `components/leaderboard` | FND-2.3 | Unit tests; AC1 | M |
| LB-1.4 Route and page composition | `routes/leaderboard` | LB-1.1, LB-1.2, LB-1.3, FND-3.2 | AC1, AC3, AC5 | S |
| LB-1.5 Performance pass to budget | `components/leaderboard` | LB-1.4 | AC4 (Lighthouse) | S |

**LB-2 Category leaderboards.** Tabs for text, coding, vision and math, each deep-linkable.
- Acceptance: switching a tab updates the URL; an unknown category gives a 404; tabs follow
  the WAI-ARIA keyboard pattern.
- Tasks:
  - LB-2.1 Category route and tabs.
  - LB-2.2 Category filter in the API.
  - LB-2.3 Empty and error states.

**LB-3 Sort, filter, search.** Tasks:
- LB-3.1 Sortable headers with `aria-sort`.
- LB-3.2 Filters by organisation and licence.
- LB-3.3 Debounced search with URL state.
- LB-3.4 Combined state in the URL, so views are shareable.

Issue tree that the reconciler creates (numbers illustrative):

```
#1   [PRD] LLM benchmark site                    pinned, lists sections
#10  [Epic] LB Leaderboards                      kind:epic
#11    [Feature] LB-1 Overall leaderboard        sub-issue of #10
#12      [Task] LB-1.1 Leaderboard API           sub-issue of #11, blocked by FND-4.2
#13      [Task] LB-1.2 Ranking rules             sub-issue of #11, blocked by FND-4.2
#14      [Task] LB-1.3 Leaderboard table         sub-issue of #11, blocked by FND-2.3
#15      [Task] LB-1.4 Route and page            sub-issue of #11, blocked by #12 #13 #14
```

Sections are top-level epics; the pinned PRD issue lists them. That keeps GitHub nesting at
three levels.

### 4.6 The PRD gate and who approves the PRD

The lint and critics run at every stage gate in 4.0, each applying the rules for that
stage's level. The task rules, for example, apply from S5 on.

**Deterministic lint (`prd-lint`):**
- IDs are unique and well formed, and depth is at most 3.
- Every feature has 3 or more acceptance criteria, and each criterion names a test or a
  parity check.
- Every task has an area, dependencies, tests, and a size of S or M.
- Dependencies resolve and form an acyclic graph, and no task depends on a later milestone.
- Coverage: every discovered archetype, journey and interaction maps to at least one
  feature. The target is 95%, and the misses are listed.

**Critics** are fresh pro agents, each with one rubric, and each is asked what would break
rather than whether it is good:
- Completeness, against the discovery pack.
- Testability.
- Consistency between the data model and the features.
- Feasibility and order.
- Scope: no gold plating beyond the parity target.

The product owner revises. The revision rounds stop at zero high findings, at two rounds
without improvement, or at three rounds. Anything left becomes an `assumption` issue.

**Who approves the PRD.** PRD v1 is the overview page plus sections and features with
acceptance criteria. It is complete after S3. It always lands as a PR to `prd/` carrying
two checks, `prd-lint` and `prd-review` (the critics). What happens next is the charter
setting `prd_approval`:

| Mode | What happens | Default for |
|---|---|---|
| `auto` | The PR merges as soon as both checks pass; the owner is notified | Lights-out runs and re-runs of a proven setup |
| `window` | Work continues while the PR is open: acceptance tests, the first tasks, and M0 foundations. The PR merges itself after the window (default 24 hours) unless the owner requests changes, and the owner can approve early. A requested change re-runs only the affected stages. | Projects with a reference site |
| `human` | Building waits until the owner approves the PR (code-owner review on `prd/`) | Projects without a reference site |

**Recommendation: put a human on the PRD whenever one is available, and nowhere else.**
- **With a reference site, use `window`.** The reference defines intent well enough for the
  critics to check coverage. The window adds a cheap safety net and never blocks.
- **Without a reference, use `human`.** Nothing but the owner can judge intent.
- **Why the PRD and not the code.** A wrong spec cascades into every task, which is why
  Anthropic's planner keeps specs at product level. The published long-running work also
  puts most of its effort into the plan and success criteria.
- **Why it is realistic.** A PRD is a short read, under an hour by my estimate. Reviewing
  hundreds of PRs is not realistic, so the merge path relies on checks.

On approval or merge, the PRD is tagged `prd-v1`.

### 4.7 The PRD keeps evolving

The PRD changes only through PRD-change PRs written by the product owner. Triggers:
- Parity gaps that no feature covers.
- A task split that changes scope.
- Repeated failures that expose an ambiguity.
- Comments from the repository owner or collaborators.

The same lint and critics gate the PR. Amendments merge on `auto`, with one exception. A
PRD-change PR that adds more than 10% new features, or touches the overview page (vision,
scope, stack), uses the kickoff approval mode. On merge the reconciler syncs GitHub and the
tag increments (`prd-v2`, and so on).

## 5. Discovery (reference site to discovery pack)

These steps run read-only and in parallel by route cluster:

1. **Crawl.** Honour `robots.txt` and rate-limit. Start from `sitemap.xml` and same-origin
   links in the nav, footer and content, and stop at the charter's page cap.
2. **Cluster into archetypes.** Group by URL pattern (`/models/:slug`) and DOM-skeleton
   similarity, and keep 2-3 instances of each.
3. **Capture each instance:**
   - Full-page screenshots at 1440, 768 and 390 px.
   - A Playwright aria snapshot.
   - Computed design tokens: colours, type scale, spacing, radii, shadows.
   - Links and meta tags.
4. **Infer the data model.** Record XHR/fetch JSON responses as candidate entities and fields
   for `data-model.md`. Fall back to parsing tables and the DOM.
5. **Probe interactions.** Only safe actions: navigate, tabs, sort, filter, paginate, open a
   modal, hover. Record the aria snapshot before and after each one as a replayable journey.
   Never submit forms and never sign in.
6. **Gated areas.** Infer them from the public surface (login fields, OAuth buttons, "new
   post" buttons) plus conventions. Each inference becomes an assumption with a confidence.
7. **Output.** The discovery pack plus a parity spec. Per archetype it lists the aria regions
   to match, the screenshot regions to diff, masks for dynamic content, and the journeys to
   replay.

**Boundary.** "Exact same website" means the same information architecture, layout,
components, interactions and behaviour. It does not mean copying logos, brand assets, or
copyrighted text and data. The content inventory lists them for replacement with original
or seed content, which also keeps the clone shippable.

**Agents.**
- One `explore-flash` or `general-flash` per route cluster, with a headless browser
  (`agent-browser --session`, or zcode's `--browser-use headless`).
- One pro summariser that merges the pack. It checks claims by file existence and counts.

## 6. GitHub as the state machine

### 6.1 Mapping

| Project concept | GitHub object |
|---|---|
| PRD root | Pinned `[PRD]` issue, plus a Project (v2) board as a derived view |
| Section | Epic issue (`kind:epic`, or issue type `Epic` in an organisation) |
| Feature | Sub-issue of its section |
| Task | Sub-issue of its feature |
| Dependency | Native "blocked by" relationship |
| Delivery phase | Milestone (M0-M3) |
| Assumption | Issue with `kind:assumption`; open means unconfirmed, closed means accepted. It never blocks work. |
| Work in progress | Branch `wf/<task-id>` and a PR that says `Closes #N` |
| Gate results | Check runs: `ci`, `acceptance`, `parity`, `ai-review` |
| Memory per task | Attempt journal as issue comments: what was tried, what failed, why |
| Spec versions | Tags `prd-v<n>` |

### 6.2 Labels are the canonical machine state

```
kind:prd|epic|feature|task|bug|assumption|spike|chore
state:backlog|ready|claimed|review|blocked|done|failed
size:S|M     prio:p0|p1|p2|p3     attempt:1..4     area:<name>
autopilot:paused (on the PRD issue)   needs-capability   flaky   stop-the-line
```

Labels are canonical because one REST query answers "what is ready", they work on any
repository, and there is no second store to drift. Project fields (Status, Section,
Priority, Size, Attempts, Parity score, Cost) form a view that the reconciler regenerates
from labels.

### 6.3 Machine block in every issue body

````
```autopilot
id: LB-1.4
kind: task
parent: LB-1
prd: prd/sections/LB.md#lb-14-route-and-page-composition
prd_hash: 3f9c1a
area: [src/routes/leaderboard]
depends_on: [LB-1.1, LB-1.2, LB-1.3, FND-3.2]
satisfies: [LB-1.AC1, LB-1.AC3, LB-1.AC5]
tests: [tests/acceptance/lb/leaderboard.spec.ts, tests/parity/leaderboard.spec.ts]
size: S
budget: {files: 10, lines: 300}
```
````

The kit parses only this block and treats everything else in the body as untrusted text.
The body hash is recorded at claim time. A change after the claim releases the task.

### 6.4 Task state machine

```
backlog --(all blocked-by closed)--> ready --(claim + verified re-read)--> claimed
claimed --(PR opened)--> review --(merged)--> done
review  --(checks red or review findings)--> claimed, attempt+1
claimed --(stale claim TTL)--> ready, attempt+1
any     --(attempt cap reached)--> blocked (needs-research or needs-capability)
attempt >= 3 --(product owner splits)--> parent keeps the history; new tasks enter backlog
```

**Claim protocol (kit).** The kit adds the builder identity as assignee and swaps
`state:ready` for `state:claimed`, then re-reads the issue. The claim wins only if the
builder is the sole assignee and the label reads `state:claimed`; a loser undoes its own
change. Claims expire after twice the task timeout.

### 6.5 Reconciler (PRD to GitHub)

- Performs idempotent upserts keyed by PRD ID, which is held in both the machine block and
  the title prefix.
- Creates in order: sections, then features (with parent), then tasks, then dependencies,
  then labels.
- Updates a body only when its hash changes.
- Closes dropped items as not planned.
- Never changes `state:*` labels except to set `state:backlog` on new issues.
- Paced to stay under secondary rate limits.
- Uses `gh` 2.94+ flags, or `gh api` against the sub-issue and dependency REST endpoints,
  which take numeric ids rather than issue numbers.

### 6.6 Merge path and identities

**Ruleset on `main`:**
- No direct pushes, no force pushes, no deletion.
- Required checks: `ci`, `acceptance`, `parity`, `ai-review`.
- Linear history.
- Branch must be up to date when there is no merge queue.

**Merge queue where available** (org-owned public repos, Enterprise Cloud). Otherwise the
kit runs a merge train, one merge at a time:

1. `gh pr update-branch`.
2. Wait for the required checks.
3. `gh pr merge --squash --match-head-commit <reviewedSha>`.
4. Confirm the merge commit exists.

**Two GitHub Apps:**
- *builder*: contents, issues and pull requests write; no admin.
- *reviewer*: checks write, plus PR review comments. It posts `ai-review` from the run's
  independent review stage.

This gives GitHub-visible separation of duties without requiring a human approval in the
ruleset.

**Recommendation.** Host autopilot projects in a free GitHub organisation. That unlocks
issue types, org-level app installation, and merge queue for public repositories.

## 7. Verification ladder

| Level | Check | Written by | When | Evidence label | Effect |
|---|---|---|---|---|---|
| L1 | Build, typecheck, lint, format check | Foundations (FND-1) | Every cycle and CI | Verified | Blocks merge |
| L2 | Unit and integration tests for the change | Implementer, test-first | Cycle and CI | Verified | Blocks merge |
| L3 | Acceptance e2e per criterion (Playwright) | Test author, before implementation; protected | Affected tests in the cycle, all in CI | Verified | Blocks merge |
| L4 | Reference parity: aria-snapshot structure match, pixel diff of static chrome with masks, journey replay | Recon plus test author; protected | Touched routes per cycle, everything nightly | Verified | Blocks merge for touched routes |
| L5 | NFR budgets: Lighthouse, axe, bundle size, dependency audit, secret scan | Foundations | Nightly and before release | Verified | A red nightly opens a stop-the-line issue |
| L6 | Independent evaluation: skeptical QA agent on a preview with a calibrated rubric and hard thresholds; vision parity judge; code judge; security audit | `z-qa-evaluator`, fresh specialist, `z-security-auditor` | Every cycle | Judged; verified once a command reproduces it | High and medium findings block |

**Protected paths:** `prd/`, `tests/acceptance/`, `tests/parity/`, `discovery/`, the CI
configuration, and ruleset scripts.
- A cycle diff that touches one fails `ai-review` through a script check, not a judgement.
- Only PRD-change PRs and test-author tasks may touch these paths, and each has its own
  reviewers.

**Parity checks:**
- Compare the clone with a versioned capture of the reference, not the live site;
  recapture on demand.
- Same viewport, fonts loaded, animations disabled, dynamic regions masked.
- Aria-snapshot structure is the main verified signal, because it holds up when content
  differs.
- Pixels are compared only for static chrome; a vision judge rates overall look as judged
  evidence.
- Parity score per archetype = passing checks / all checks.

**Output hygiene** (from the C compiler work):
- Runners print a summary plus one `ERROR <id> <reason>` line per failure, and full logs go
  to files.
- A sampled `--fast` suite runs while iterating, and the full suite runs at the gate.

## 8. Execution

### 8.1 Dispatcher

The outer layer is a dispatcher, not a loop that re-feeds a prompt.

**Why anything sits outside the workflow at all.** Workflow graphs replaced the Ralph-style
prompt loop inside a unit of work: a run is a planned graph of subagents with its own
fan-out, joins and stop rules. But one run cannot carry a multi-week project:
- **Runs are bounded.** Caps and the session that owns a run limit it. ZCode's contract
  rejects unbounded loops, and a run that hits a cap dies rather than finishing.
- **A run's graph is fixed at launch,** while project state keeps changing: new failures,
  PRD amendments, owner comments. A run started now should be shaped by the state now.
- **Recovery and budgets need a stable home.** Crash recovery and daily budgets need
  something that lives in no context window.

**What it does.** The dispatcher is a small piece of code. It wakes on a schedule (every few
minutes) or on a GitHub event: a task became ready, a PR's checks finished, `main` went
red. It reads the snapshot, applies the dispatch policy (8.2), and launches one bounded
workflow run whose graph fits the current state. It keeps at most one active run per
project; the run itself carries the parallel lanes.

**How it differs from a Ralph loop.** Ralph re-feeds one prompt to one agent and trusts the
agent to choose the next thing. Here code chooses the next thing from the GitHub state
machine, and the run is a planned graph with verifiers, not a single agent.

**Runtime.** launchd, systemd or a small Bun process starts one headless session per
dispatch:

```
zcode -p "<dispatch prompt>" --cwd <repo> --workflow-mode onDemand --mode guarded --json
```

Each session starts with a fresh context; state comes from GitHub, never from a previous
session. `--target` goal mode is an alternative to evaluate in S1.

**Sandbox.**
- A dedicated machine, VM or user account.
- Only the builder app's token.
- Network egress only to GitHub, package registries, the reference host and the model API.

**Local policy.** ZCode `PreToolUse` and `PermissionRequest` hooks implement the charter.
They deny, and log every decision for:
- force pushes;
- pushes to `main`;
- ruleset or secret edits;
- `gh pr merge` outside the kit;
- writes to protected paths by task kinds not allowed to touch them;
- hosts outside the allowlist.

**Unknowns, settled by spike S1:**
- Does headless `-p` pass the workflow command-set confirmation, or route it through
  `PermissionRequest`?
- Does `-p` wait for the background run to settle?
- Does a killed run resume?

### 8.2 Dispatch policy

```
dispatch():                              # runs on a schedule or a GitHub event
  s = snapshot()                         # kit: gh queries, ids and counts only
  if s.activeRun:                        return "busy"                               # one run per project
  if s.paused or s.budgetExhausted:      return "paused"
  if s.kickoffStage < S6:                return launch(kickoff(s.kickoffStage))      # 4.0, gated stage by stage
  if s.prdAwaitingApproval:              return launch(m0Only(s))                    # window mode; human mode waits
  if s.stopTheLine:                      return launch(fixMain(s.redRun))
  release(s.staleClaims)
  if s.prsNeedingWork:                   return launch(advance(s.prsNeedingWork))    # rebase, fix findings
  if s.nextMilestoneNeedsTasks:          return launch(decompose(s.nextMilestone))   # rolling wave, 4.0
  promote(s.backlogWithClosedDeps)       # backlog -> ready
  batch = pickNonOverlapping(s.ready, K, by=(milestone, criticalPath desc, prio, age))
  if batch:                              return launch(taskCycles(batch))
  if s.blockedOnly:                      return launch(unblock(s.blocked))           # split, spike, re-plan
  if s.auditDue:                         return launch(audit())
  if s.projectDone:                      return finish()                             # tag, final report
  return "idle"
```

### 8.3 Task cycle (one lane in a run)

0. **Orient (kit).** Read:
   - the task block;
   - the PRD excerpt: the feature, its acceptance criteria, a section summary;
   - the referenced ADRs;
   - the attempt journal;
   - how to run the app.

   Then create a worktree on `wf/<task-id>` from `main`.
1. **Claim (kit).**
2. **Baseline.** Run L1 plus the affected L3 and L4 checks on the base commit. Record
   anything already red so it is excluded and reported.
3. **Done contract.** The implementer states its plan and which criteria and tests it will
   satisfy, and the evaluator checks that against the criteria. This is cheap and catches
   misreadings before any code is written.
4. **Implement** with L2 tests. Loop until L1-L4 are green for the task's scope, or the stop
   rule fires.
5. **Independent review:**
   - A fresh specialist judge.
   - `z-security-auditor` when the diff touches auth, input boundaries, data access or
     dependencies.
   - `z-qa-evaluator` on a preview for UI features.
   - Confirmers reproduce each finding by command.
6. **Publish.** Push `wf/<task-id>` without force, then open the PR: `Closes #N`, the
   acceptance checklist, and an evidence summary.
7. **Server checks** run, and the reviewer identity posts `ai-review`.
8. **Merge** through the queue or the train, pinned to the reviewed SHA.
9. **Close-out:**
   - A journal comment: what changed, what was learned, which approaches failed.
   - Label updates.
   - The cost.

### 8.4 Parallelism

- K lanes per run; start with K = 3.
- Two tasks with overlapping `area` never run together.
- M0 foundations run in sequence. After M0, sections run in parallel.
- Merges are always serialised.

### 8.5 Owner decision: fresh script per run, or a template for the standard cycle

- **Option A (strict D1).** The planner and author write every run. Each run pays the
  planner/author overhead, and cycles repeat hundreds of times.
- **Option B (recommended).** The standard task cycle is a pre-tested template, as with
  z-liteflow, filled per run with task ids, areas, specialists and gates. The planner and
  author write bespoke scripts only for non-standard runs: kickoff, foundations, audits,
  re-plans, and stop-the-line fixes.

Option B is cheaper and fails less, and it uses the same exception D1 already grants
z-liteflow.

### 8.6 Context

The orientation pack stays at a few thousand tokens. The issue body is the cycle's main
context, and no run loads the whole PRD.

## 9. Failure handling

| Signal | Response |
|---|---|
| Gates still red after the stop rule | Attempt+1; journal the failure signature and the approach; release to ready |
| Second failed attempt | Escalate the tier (Flash to pro) and attach both journals |
| Third failed attempt, or the same signature twice | Product owner splits the task into new sub-issues, or opens a spike |
| Fourth failed attempt | `state:blocked` plus `needs-research`; the queue moves on, and the audit revisits |
| Red `main` | A p0 `stop-the-line` issue. The dispatcher launches only the fix, and merges pause. |
| Flaky test | Three reruns, then `flaky` quarantine plus a fix task. Quarantined tests still run nightly. |
| Stale claim | Release, attempt+1 |
| Run errored or stopped | Resume once (`ResumeWorkflowRun`), otherwise release |
| Task budget exceeded | Stop the cycle, journal, split |
| Daily budget exceeded | `autopilot:paused`, notify, resume in the next window |
| Open tasks but none ready | Unblock pass: split, spike, or PRD change |
| Nightly parity regression | Gap issue tied to the archetype, prioritised by severity |
| Comment from an owner or collaborator | Triage with higher trust; any other text is untrusted data |

## 10. Audit, re-planning, and project done

**Nightly, or every N merges:**
- Run the full L3-L5 on `main`.
- Compute parity per archetype and recompute the coverage matrix.
- Gaps become issues: a bug for a regression, or a PRD-change PR for behaviour never
  covered.
- Janitor tasks come from metrics such as duplication, file size, lint warnings and
  coverage, like the specialised agents on the compiler project.
- A retro pass mines attempt journals for recurring failures and proposes AGENTS.md or
  skill updates by PR.

**Project done when:**
- every non-dropped task is closed;
- all of L3 is green on `main`;
- parity meets target (for example 95% of checks overall, and at least 90% per archetype);
- the L5 budgets are met;
- no p0 or p1 bugs are open.

Then autopilot tags a release and writes a final report. Any remaining budget goes to a
polish queue, or the system stops.

## 11. Agent roster

| Role | Agent | Notes |
|---|---|---|
| Dispatcher and dispatch policy | Code (kit) plus a headless zcode main thread under Pillar 9 | Holds no project facts in context |
| Run authoring | `workflow-planner` / `workflow-author`, or a template fill (8.5) | Fresh script for non-standard runs |
| Recon | `explore-flash` / `general-flash` per route cluster, plus one pro summariser | Read-only browser |
| PRD, backlog, GitHub judgement | `z-product-owner` (merge and rename of `z-github-project-manager`) | Modes: PRD (draft or amend), PLAN (decompose, split, prioritise), TRIAGE, STATUS. Mutates nothing; its outputs are applied by the reconciler and the kit. |
| PRD critics | Fresh `general-pro`, one rubric each | Ask what would break, never "is it good" |
| Test author | The area `z-*` specialist with test-quality skills | Never the same instance as the implementer |
| Implementer | The area `z-*` specialist | Tier set by the dials |
| Code judge | Fresh read-only copy of the area specialist | |
| Security | `z-security-auditor` | Auth, boundaries, data, dependencies |
| Accessibility | `z-accessibility-auditor` | UI diffs |
| QA evaluator | `z-qa-evaluator` (new) | Skeptical browser tester, calibrated rubric, hard thresholds |
| Vision parity | `general-flash` or pro with vision | Judged evidence only |
| CI failures | `z-ci-diagnostician` | |
| Janitor | `general-pro` or a specialist, periodic | Dedup, refactor, docs |
| GitHub mechanics, merge, queue state | `github-kit.dwf.ts` (code) | Replaces three agents |

## 12. Autonomy charter and safety

The human approves the charter once. Everything later is enforced by code.

```yaml
# autopilot.yaml
project: llm-board
reference: ["https://<reference-site>"]
parity_target: {structure: true, layout: true, interactions: true, brand: false, content: false}
stack: auto                      # architect decides through an ADR unless pinned
milestones: [M0, M1, M2, M3]
prd_approval: window             # auto | window | human (4.6); human is the default without a reference
review_window_hours: 24
task_breakdown: rolling          # tasks written for M0-M1 at kickoff, later milestones at ~70% of the previous
budgets:
  usd_per_day: 50
  usd_total: 1500
  max_parallel_lanes: 3
  task_attempts: 4
  wall_clock_days: 14
authority:
  push: ["refs/heads/wf/*"]      # never main, never force
  merge: {method: squash, via: [merge_queue, merge_train], requires: [ci, acceptance, parity, ai-review]}
  github: [issues, sub_issues, dependencies, labels, pull_requests, checks]
  deploy: preview_only
  network_allow: [github.com, api.github.com, registry.npmjs.org, "<reference host>", "<model api>"]
capabilities:                    # missing ones are mocked behind adapters and labelled needs-capability
  oauth_github: missing
  email_smtp: missing
  database: sqlite-local
pause: "label autopilot:paused on the PRD issue"
notify: [github-issue]           # notify only; never waits for an answer
```

**Enforcement layers, outermost first:**
1. Sandbox and network allowlist.
2. Scoped app tokens.
3. The server ruleset and merge queue or train.
4. ZCode hooks.
5. Kit policy code.
6. Budget breakers.
7. A full audit trail, because every action is a GitHub event.

**What a human does once:**
- Approve the charter.
- Create and install the two GitHub Apps.
- Provide credentials or accept mocks.
- Start the dispatcher.

Any time later, they can add the pause label, comment, or edit the PRD by PR.

## 13. Changes to the migration plan's decisions (if adopted)

| Decision | Today | Autopilot mode |
|---|---|---|
| D2 | Every cycle passes the approval dialog; no unattended mode | The charter, hooks and server rules replace per-cycle approval. The approval-per-cycle flow survives as "supervised mode". |
| D3 | Four new agents | Only `z-security-auditor` stays. The kit plus `z-product-owner` replace the other three, and `z-qa-evaluator` is added. |
| D5 | One push of `wf/shipflow-<N>` per cycle | Non-force pushes of `refs/heads/wf/*` under the charter; `main` is protected server-side |
| D6 | Merge requires `reviewDecision` APPROVED | Required checks, including `ai-review` from a separate identity, with the merge pinned to the reviewed SHA |
| D10 | `pipeline:*` labels | `state:*` and `kind:*` namespaces (owner may keep `pipeline:*`) |
| New D11 | none | GitHub mechanics live in `github-kit.dwf.ts`, a pasted and tested block like the persona kit |
| New D12 | none | Standard task cycle as a pre-tested template (owner decision, section 8.5) |

This also answers the migration plan's open questions:
- Unattended mode: yes, through the charter.
- Merge approver: the reviewer app's check.
- Policy kit: yes.

## 14. Implementation backlog

1. **Agents:**
   - Add `z-product-owner` (replacing `z-github-project-manager`) and `z-qa-evaluator`.
   - Delete `z-gh-operator`, `z-pr-merge-steward` and `z-queue-sentinel`.
   - Update `specialists.md`, `z-project-init`, `install.md`, `README.md` and `llms.txt`.
2. **Shipflow becomes autopilot.** Restructure `harness/zcode/skills/shipflow/` around four
   modes: `kickoff`, `dispatch`, `audit` and `supervised`. Contents:
   - `SKILL.md`.
   - `references/prd-format.md`, `github-state.md`, `verification-ladder.md`, `charter.md`
     and `failure-policy.md`.
   - `github-kit.dwf.ts`, and `task-cycle-template.dwf.ts` if D12 is adopted.
   - `scripts/prd-lint.ts`, `reconcile.ts` and `snapshot.ts`.
   - `dispatcher/`: the dispatch script, launchd/systemd units, and the hook policy.
   - `templates/`: CI workflow, ruleset JSON, charter example.
3. **Cross-harness category skills:**
   - `product/prd-authoring`: templates, ID rules, acceptance-criteria style, critic
     rubrics.
   - `product/site-recon`: crawl, archetypes, capture, journeys, boundary.
   - `testing/parity-testing`: aria snapshots, masked visual diff, journey replay, scoring.
4. **Tests:** `scripts/check-github-kit.mjs` (mocked `gh`), plus `prd-lint` and reconciler
   fixtures.

## 15. Rollout and spikes

| Spike | Question | Passes when |
|---|---|---|
| S1 | Headless autonomy in ZCode | `zcode -p ... --workflow-mode onDemand --mode guarded` (then `yolo`) runs a trivial workflow with no click. We know what `PermissionRequest` sees, whether `-p` waits for the run, and whether a killed run resumes. |
| S2 | GitHub primitives | `gh` upgraded to 2.94+, or the REST fallback works. A 3-level tree of 50 issues with dependencies is created idempotently without hitting rate limits. Personal-repo vs organisation limits are recorded. |
| S3 | Recon quality | On two reference sites, archetypes, data model and journeys match a manual check |
| S4 | Parity harness | Reference against itself is stable across runs (noise), and a deliberately changed page fails (sensitivity) |
| S5 | Cycle economics | Measured cost and time of one task cycle on GLM-5.3 pro and Flash, with planner/author overhead compared to the template |
| S6 | Merge path | Ruleset, required checks, two app identities and the merge train work on the chosen repository owner |

Then:

| Step | Scope | Human role |
|---|---|---|
| R1 | Kickoff only (PRD and issues, no build) on two reference sites | The only human review: grade the PRD once to calibrate the critics |
| R2 | Supervised cycles on 20 tasks in shadow mode (PRs opened, never merged) | None |
| R3 | Full autopilot on a small site of 10 or fewer archetypes | None |
| R4 | The LLM benchmark site | None |
| R5 | Hardening: multiple dispatchers, janitor, budgets, retro pass | None |

## 16. Risks and open questions

**Risks:**
1. **The verifier is the ceiling.** Weak acceptance or parity tests get gamed. This is
   where most of the effort should go.
2. **Visual noise.** Fonts, data and animation differ between clone and reference. Lean on
   structure, and compare pixels only for static chrome.
3. **Cost.** Expect hundreds of cycles; budgets and Flash lanes for mechanical work keep it
   bounded.
4. **Model behaviour.** The published results above use Claude models. GLM-5.3's
   long-horizon behaviour has to be measured in R1-R3.
5. **Legal.** Keep the brand and content boundary, honour robots and terms, and rate-limit
   recon.
6. **Personal-account limits.** Issue types and merge queue need an organisation, so an
   organisation is recommended.
7. **Headless semantics.** If S1 fails, fallback runtimes are Claude Code headless or
   GitHub Agentic Workflows. The skills and kits stay the same, and only the dispatcher changes.
8. **Autonomous code security.** Mitigated by security audits on sensitive diffs, a
   dependency allowlist, and no secrets in the sandbox.

**Open questions for the owner:**
- PRD approval default: `window` with a reference and `human` without one (4.6)? Or
  `auto` everywhere?
- Keep the name Shipflow, or rename to autopilot?
- Adopt D12 (the cycle template)?
- Organisation or personal repositories?
- Pinned stack, or architect's choice?
- Budget ceilings?
- Which small reference site to use for R3?

## Sources

- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Anthropic, [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- Anthropic, [Long-running Claude for scientific computing](https://www.anthropic.com/research/long-running-Claude)
- Anthropic, [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- InfoQ, [Anthropic designs three-agent harness](https://www.infoq.com/news/2026/04/anthropic-three-agent-harness-ai/)
- Geoffrey Huntley, [Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/)
- [ccpm, Claude Code PM](https://github.com/automazeio/ccpm)
- [How to use GitHub as long-term memory for coding agents](https://meshintelligence.substack.com/p/how-to-use-github-as-long-term-memory)
- GitHub, [Agentic Workflows (gh-aw)](https://github.github.com/gh-aw/)
- GitHub docs, [REST sub-issues](https://docs.github.com/en/rest/issues/sub-issues) and [REST issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies)
- GitHub changelog, [Manage sub-issues, types, and dependencies from GitHub CLI](https://github.blog/changelog/2026-06-10-manage-sub-issues-types-and-dependencies-from-github-cli/)
- GitHub changelog, [Merge queue generally available](https://github.blog/changelog/2023-07-12-pull-request-merge-queue-is-now-generally-available/)
- Practitioner reports: [I built an app entirely with Claude Code](https://pub.towardsai.net/i-built-an-app-entirely-with-claude-code-this-is-what-i-learnt-6874082e85f0), [AI-first workflow from issue to PR](https://dev.to/victorsaly/ai-first-development-workflow-from-issue-creation-to-pull-request-with-github-copilot-1cb8)
- Reported Claude Code dynamic workflows launch (secondary): [The Neuron explainer](https://theneuron.ai/explainer-articles/claude-code-dynamic-workflows-explained-claude-can-now-build-its-own-workflow-around-a-task)
- Local: `zcode --help` (CLI 0.16.9); ZCode bundled guides `diagnosing-hooks` and `dynamic-workflows`
