---
name: prd-authoring
description: Use when writing or amending a product requirements document that agents will build from, with levels, stable IDs, Given/When/Then acceptance criteria, and lint and critic gates.
---

# PRD Authoring for Agent-Built Products

Grow a requirements document top-down, from a one-line goal to tasks an agent can finish in one cycle. Planning, tracker publication and implementation can run separately or together, as the prompt requests. Expand one level per stage and keep delivery status out of the spec.

## When to Use

Use this skill to draft a PRD from an idea, expand one section or feature, decompose selected tasks, or amend a plan during delivery. Local planning needs no tracker credentials, execution configuration, scaffold or executable tests. A request for a plan does not authorize publication or implementation.

## 1. The Staged Pipeline

Each stage expands exactly one level. When a gate fails, rerun only that stage.

| Stage | Input | Output | Owner | Gate before the next stage |
|---|---|---|---|---|
| S0 Scope | Prompt and existing files | Requested phases, scope, detail level and milestones | User direction | Work matches the request |
| S1 Evidence | Reference site or domain requirements | Discovery pack or sourced research and assumptions | Recon/research specialists | Requested behaviors are covered |
| S2 Overview (level 0) | Goal and evidence | `prd/prd.md` | Author | Overview lint and critics |
| S3 Sections (levels 1-2) | Overview and section evidence | Sections, features, criteria and data contracts | Author per requested section | Section lint and cross-section consistency |
| S4 Executable tests | Approved criteria and runnable scaffold | Acceptance and parity specs | Independent test author | Verified against scaffold/reference where possible; implementation preparation only |
| S5 Task planning (level 3) | Selected features, code or architecture assumptions | Fine-grained tasks, dependencies, criteria and check paths | Author | DAG, size and coverage lint for the selected scope |

Stage identifiers describe outputs. They do not force S4 before S5: writing a plan names
checks without implementing them. An overview-only request stops at S2; a detailed PRD can
run S1-S3-S5 and stop before tracker publication or any product code.

Select scope (project, section, feature or milestone) and depth (overview, sections, features
or tasks) from the prompt. Read parent context and dependencies but expand only the selected
scope. Return paths, ids, hashes or a commit, a readable overview, task/dependency summary,
assumptions and decisions for review. Reuse this handoff in a later session. If the owner
asks to confirm first, only their reply authorizes the next requested phase.


**Why errors are cheap at the top.** An error caught at the overview costs one revision; the same error found after task breakdown costs dozens. Later stages see only what they need: a section writer reads the overview and its own discovery slice, and a task writer reads one feature and the code it touches.

## 2. Task planning depth

- **Upfront:** when asked for a detailed whole-product PRD and task list, decompose every
  requested feature now. Include goals, areas, dependencies, criteria, named checks and size.
  In an empty project, mark candidate paths and architecture as assumptions. Recheck those
  assumptions against current code before later implementation.
- **Rolling:** when the user chooses progressive delivery, plan the first two milestones,
  then decompose each next milestone when its predecessor is about 70% done.
- **Selected scope:** a section or feature can be decomposed independently of its siblings.
  Keep stable ids, explicit dependency references and criterion coverage. Split a feature
  that needs more than eight tasks rather than dropping necessary detail.

A short prompt does not imply a small product. Complex or niche requirements call for human
review of the plan and unresolved intent questions. An explicit small-project end-to-end
request can authorize planning, publication and implementation with automatic approval.

## 3. Levels and Size Rules

| Level | Name | What it is | Size rule | Tracker item |
|---|---|---|---|---|
| 0 | Root | Vision, users, journeys, scope, NFR budgets, architecture, milestones, section index, done definition | One per product | Pinned item plus the root document |
| 1 | Section | A capability area a user would name, plus Foundations | 4-10 per product; 2-8 features each | Epic |
| 2 | Feature | One user-observable behavior you can demo | 3-10 acceptance criteria; 2-8 tasks | Sub-item of its section |
| 3 | Task | One agent cycle: one area, one PR | At most about 10 files and 300 changed lines; names its tests | Sub-item of its feature |

A fourth level is a smell: the feature should be a section, or the tasks should be cut differently. Lint rejects any id deeper than a task. Section/feature counts are recommendations; do not invent scope to pad a small project.

## 4. Identifiers

| Kind | Form | Example |
|---|---|---|
| Section | 2-4 uppercase letters | `LB` |
| Feature | `<CODE>-<n>` | `LB-2` |
| Task | `<feature>.<n>` | `LB-2.4` |
| Acceptance criterion | `<feature>.AC<n>` | `LB-2.AC3` |
| Assumption | `A-<nnn>` | `A-017` |
| Decision record | `ADR-<nnn>` | `ADR-003` |
| Journey | `J<n>` | `J1` |
| Discovery id | `arch:<slug>`, `journey:<slug>`, `int:<slug>`; slug is `[a-z0-9-]+` | `arch:leaderboard` |

- Never reuse or renumber an id. A new item takes the next free number.
- Dropped items stay in their file: a feature gets `Status: dropped`, and a task's Notes cell starts with `dropped`. A replaced feature gets `Status: superseded by LB-4, LB-5`. The tracker closes the item as not planned.

## 5. Templates

Files: `prd/prd.md` (root), `prd/sections/<CODE>.md`, `prd/data-model.md`, `prd/design-system.md`, `prd/decisions/ADR-<nnn>-<slug>.md`, `prd/assumptions.md`, and `prd/index.json` (generated, never hand-edited). Recon output lives in `discovery/`. `tests/acceptance/` and `tests/parity/` are protected.

### 5.1 Root `prd/prd.md`

```markdown
---
id: PRD
title: <product title>
reference: ["<reference URL>"]
captured: <YYYY-MM-DD>
parity_target: {structure: true, layout: true, interactions: true, brand: false, content: false}
milestones: [M0, M1, M2, M3]
---
# <product title>

## Summary
<3-5 sentences: what it is, for whom, the reference and its capture date. Parity covers structure, layout and interactions, never brand or content.>

## Users and journeys
| Journey | Steps | Features |
|---|---|---|
| J1 <journey name> | <step>, <step>, <step> | <feature ids> |

## Scope
<In, out and later, one line each.>

## NFR budgets
<LCP, CLS and INP; zero serious axe violations at WCAG 2.2 AA; SEO and security baseline; browser and viewport matrix.>

## Architecture
<stack, hosting, data store, auth; link each ADR-<nnn> file>

## Milestones
| Milestone | Goal |
|---|---|
| M0 | Foundations |
| M1 | Core read paths |
| M2 | Interactions and accounts |
| M3 | Parity polish and NFR |

## Sections
| Code | Section | Milestone | Depends on | Covers | Purpose |
|---|---|---|---|---|---|
| <CODE> | <section title> | <M0-M3> | <section codes> | <discovery ids> | <one line> |

## Glossary
- **<term>**: <meaning>

## Done definition
<conditions that make the product finished>
```

### 5.2 Section File `prd/sections/<CODE>.md`, with One Feature Block

```markdown
---
id: <CODE>
title: <section title>
milestone: <M0-M3>
depends_on: [<section codes>]
reference_archetypes: [arch:<slug>]
---
# <CODE> <section title>

<Purpose paragraph: the capability area in two or three sentences.>

## <CODE>-<n> <feature title>
Story: As a <role>, I <action>, so that <outcome>.
Milestone: <M0-M3>
Depends on: <feature or task ids>
Evidence: arch:<slug>, int:<slug>, journey:<slug>

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| <CODE>-<n>.AC1 | Given <context>, when <action>, then <one observable result>. | tests/acceptance/<area>/<name>.spec.ts |

### UI states
- Loading, empty and error: <what the user sees in each>
### Data contract
<Entities and fields read and written, named as in data-model.md.>
### Edge cases
- <case> (covered by AC<n>)
### Out of scope
- <behavior this feature excludes>
### Tasks
<Task table from 5.3; optional until the milestone is decomposed.>
```

### 5.3 Task Table Inside `### Tasks`

```markdown
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| <CODE>-<n>.1 | <one sentence> | <relative path> | <task ids> | <CODE>-<n>.AC1 | <relative test path> | S | <evidence ids, gotchas> |
```

### 5.4 Assumptions `prd/assumptions.md`

```markdown
# Assumptions
| ID | Assumption | Confidence | Evidence | Affects |
|---|---|---|---|---|
| A-001 | Sign-in uses email plus GitHub OAuth | medium | login page shows both buttons (arch:sign-in) | AUTH-1 |
```

## 6. Writing Acceptance Criteria

- Write Given, when, then, in that order, as in [Fowler's GivenWhenThen](https://martinfowler.com/bliki/GivenWhenThen.html).
- One observable behavior per criterion. If the "then" joins two outcomes with "and" and each could pass alone, split it.
- Name the check: a relative test path, or `parity:`, `lighthouse:`, `axe:` or `bundle:` followed by a name. A reviewer must answer pass or fail from the text alone.

- Good: `LB-1.AC2`: Given two models with equal scores, when the leaderboard renders, then both show the same rank number. Check: `tests/acceptance/lb/ties.spec.ts`.
- Good: `LB-1.AC4`: Given 100 seeded models, when `/leaderboard` loads, then Largest Contentful Paint is within the LCP budget in the NFR section. Check: `lighthouse:leaderboard-lcp`.
- Bad: `LB-3.AC1`: "The sort feels intuitive and the table loads fast." Fails: "intuitive" and "fast" have no measure, the text has no Given/when/then, and there is no check. Rewrite: "Given the table is sorted by score, when the visitor activates the Model header, then rows reorder by model name and the header carries `aria-sort="ascending"`." Check: `tests/acceptance/lb/sort.spec.ts`.
- Bad: `LB-2.AC2`: "Category tabs work correctly." Fails: "correctly" names no observable result, and no check exists. Rewrite: "Given an unknown category in the URL, when the page loads, then the response is 404." Check: `tests/acceptance/lb/unknown-category.spec.ts`.

## 7. Task Blocks

- **Goal:** one sentence. **Area:** one area per task, as relative paths: one cycle, one PR.
- **Size:** `S` is up to 150 changed lines, `M` up to 300. `L` is not allowed; split the task.
- **Satisfies:** criteria of this task's own feature only. Every criterion of the feature must appear in at least one task.
- **Tests:** the acceptance or parity specs that must pass. New unit tests are expected alongside them.
- **Depends on:** task ids in the same milestone or an earlier one, never a later one.
- **No steps.** Never write implementation steps. The cycle's planner writes them against the live code.
- **Empty repository.** The first M0 task scaffolds the project and wires every check script CI runs, each with at least one passing test, so the required checks are green from the first merge. Every other task depends on it. The check scripts are `typecheck` (plus `build` and `lint` when the stack has them), `test`, and `test:acceptance`.

**Good**
```markdown
| LB-1.2 | Ranking rules for ties and missing scores | server/domain/ranking | FND-4.2 | LB-1.AC2 | tests/unit/lb/ranking.spec.ts | S | |
```

**Bad**
```markdown
| LB-1.2 | 1. Create ranking.ts. 2. Sort by score. 3. Handle ties. 4. Export it. | server/ | LB-9.1 | LB-1.AC2, LB-3.AC1 | | L | |
```

The bad row has implementation steps, a vague area, a dependency on a task in M3, a criterion from another feature, no tests, and size `L`.

## 8. Status Never Lives in the PRD

- The PRD says what; the tracker says where the build stands. A status word (not started, in progress, done, blocked) or a checkbox in the PRD turns the spec into a status board. The PRD may carry only scope decisions: `dropped` and `superseded by`.
- Builders read `prd/` but never write it. Acceptance and parity tests are protected the same way; an agent that cannot edit the spec cannot win by rewriting it.

## 9. Lint Checklist

Each gate runs the rows of its stage and every row above it (`s5` includes task rules). Each problem prints as `ERROR <id> <rule> <reason>`; WARN lines do not block. With no lint script, check each row by hand.

| Rule | Stage | Check |
|---|---|---|
| `frontmatter` | s2 | Root front matter has every field; the nine `##` headings exist in order; section files have `id`, `title`, `milestone`; file name equals `id` |
| `id-format` | s2 | Section codes match `^[A-Z]{2,4}$`; feature `<CODE>-<n>`; task `<feature>.<n>`; criterion `<feature>.AC<n>`; assumption `A-<nnn>`; journey `J<n>` |
| `id-duplicate` | s2 | No id appears twice across sections, features, tasks, criteria, assumptions and journeys |
| `depth` | s2 | No id deeper than a task; no `####` feature or task heading; no task table outside a feature |
| `milestone-unknown` | s2 | Every section, feature and task milestone is in the root list |
| `section-index` | s3 | Every section file is listed in the root Sections table, and every listed code has a file |
| `ac-count` | s3 | Each active feature has 3 to 10 criteria |
| `ac-format` | s3 | Each criterion contains Given, when, then, in that order (case-insensitive) |
| `ac-check` | s3 | Check is `tests/<relative path>`, or `parity:`, `lighthouse:`, `axe:` or `bundle:` plus a name |
| `story` | s3 | Each active feature has a non-empty Story |
| `evidence` | s3 | With a non-empty `reference`, each active feature has Evidence ids, and each exists in the discovery manifest |
| `assumption-format` | s3 | Assumption ids are well formed; confidence is `low`, `medium` or `high` |
| `dep-unresolved` | s3 | Every section, feature and task dependency resolves to an existing id (tasks: task ids only) |
| `dep-cycle` | s3 | Sections, features and tasks each form an acyclic graph; report one cycle as `a -> b -> a` |
| `coverage` | s3 | Covered discovery ids divided by total is at least 0.95. Root Covers count at s2; feature Evidence and section `reference_archetypes` at s3. Each miss is a WARN, and falling below target is also an ERROR. Skipped without a reference |
| `section-size` | s3 | WARN: 4 to 10 sections; 2 to 8 features per section |
| `stale-index` | s3 | WARN: `prd/index.json` differs from a fresh build |
| `dep-forward-milestone` | s5 | No task depends on a task in a later milestone; no feature depends on a later feature |
| `task-scope` | s5 | An explicitly selected feature exists and is active |
| `task-fields` | s5 | Each active task has Goal, at least one Area path, Satisfies and Tests; paths are valid relative paths |
| `task-size` | s5 | Size is `S` or `M`; `L` or empty is an error |
| `task-satisfies` | s5 | Every Satisfies id is a criterion of the task's own feature |
| `task-count` | s5 | In each selected feature or decomposed milestone, each active feature has 2 to 8 active tasks |
| `ac-uncovered` | s5 | In each selected feature or decomposed milestone, every criterion of an active feature appears in some active task's Satisfies |

## 10. Critic Rubrics

Use five fresh critic agents, one rubric each. Critics read the stage's files and the discovery pack, never the author's notes. Each asks what would break, not whether the PRD is good.

- **Completeness (against the evidence):** (1) Which archetype, journey or interaction maps to no feature? (2) Which reference behavior has no criterion? (3) Which data-reading feature lacks loading, empty or error states?
- **Testability:** (1) Which "then" cannot be observed by a test? (2) Which check is missing or names no test? (3) Which criterion uses "fast", "intuitive" or "correct" without a measure?
- **Consistency (data model against features):** (1) Which entity has two names, or a field that `data-model.md` does not define? (2) Which shared component has two specifications? (3) Which dependency points at a feature that does not provide its data?
- **Feasibility and order:** (1) Which task depends on a later milestone, or covers more than one area? (2) Which NFR budget can the architecture not meet? (3) Which external service has no adapter, mock or test double?
- **Scope (no gold plating):** (1) Which feature is in neither the goal nor the parity target? (2) Which feature copies brand or content the parity target excludes? (3) Which section serves no journey, or has more than 10 features?

Each finding uses this format; severity is `high` (the build would ship the wrong product or cannot be checked), `medium` (a builder must guess) or `low` (wording):

| ID | Severity | What breaks | Evidence |
|---|---|---|---|
| F-1 | high | Clicking a model name has no criterion, so the detail link can ship broken. | LB-1.AC3 missing; journey:sort-by-score, step 3 |

**Revision.** The author revises from the high and medium findings, then lint and critics rerun with fresh context. Stop at zero high findings, after two rounds in a row without fewer high findings, or after three rounds. Each leftover finding becomes an assumption (section 11) and the gate passes with it logged. Lint errors are never logged; fix them.

## 11. Assumption Logging

- Every gap becomes `A-<nnn>` with confidence (`low`, `medium` or `high`), evidence and affected ids. Log ordinary assumptions and continue. For complex or niche requirements, bring questions that change product intent to the owner before implementation begins. Never renumber: an assumption proven wrong gets a new id citing the old one.

## 12. Review Gates and PRD Changes

The owner reviews the local PRD and task list before any implementation begins. Plan-only
requests stop after that review.

A reference URL informs evidence, not authority. Local planning does not open a PR or require
a remote approval. User confirmation can authorize publishing that reviewed version;
publication alone does not authorize implementation. After publication, repository review
rules still apply. A session's tool permission is separate from product approval.

**PRD changes** are edits gated by the same lint and critics. Raise one for an uncovered parity gap, a task split that changes scope, or repeated failures that expose an ambiguity. A change that touches the overview (vision, scope, stack) or adds more than 10% new features goes back to the owner before it is accepted.

## 13. The No-Reference Variant

- S1 becomes research: comparable products from web search, plus domain conventions, each with its source link. Each gap becomes an assumption. Set `reference: []` and every `parity_target` key to `false`; the evidence and coverage rules are then skipped.
- S4 writes journey tests derived from the acceptance criteria, in place of parity specs. The scope critic measures against the goal. Prefer `human` for uncertain or niche requirements. An explicit small end-to-end request can still use `auto`.

## 14. Worked Example: LLM Benchmark Site

Input: a reference URL and the goal "an exact same website". Structure, layout and interactions are the parity target; brand and content are not.

| Code | Section | Milestone | Depends on | Covers | Purpose |
|---|---|---|---|---|---|
| FND | Foundations | M0 | | arch:not-found | Scaffold, CI, design system, app shell, data layer, test setup, SEO metadata |
| AUTH | Accounts | M2 | FND | arch:sign-in | Sign up, sign in, sessions, profile, roles |
| LB | Leaderboards | M1 | FND | arch:leaderboard, arch:category-leaderboard, journey:sort-by-score | Ranked model tables |
| MDL | Models and benchmarks | M1 | FND | arch:model-directory, arch:model-detail, arch:benchmark-page | Model directory, detail and benchmark pages |
| CMP | Compare | M2 | LB, MDL | arch:compare, int:compare-picker | Side-by-side model comparison |
| FRM | Forum | M2 | AUTH | arch:forum-thread | Threads, replies, votes, moderation |
| INFO | Static pages | M1 | FND | arch:static-page | About, methodology, FAQ, legal pages |

Feature LB-1 in `prd/sections/LB.md`:

```markdown
## LB-1 Overall leaderboard
Story: As a visitor, I see every model ranked by overall score.
Milestone: M1
Depends on: FND-4
Evidence: arch:leaderboard, int:leaderboard-sort, journey:sort-by-score

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-1.AC1 | Given seed data, when a visitor opens `/leaderboard`, then rank, model, organization, score, 95% CI, votes and license show, sorted by score descending. | tests/acceptance/lb/leaderboard.spec.ts |
| LB-1.AC2 | Given two models with equal scores, when the leaderboard renders, then both show the same rank number. | tests/acceptance/lb/ties.spec.ts |
| LB-1.AC3 | Given a leaderboard row, when the visitor activates the model name, then that model's detail page opens. | tests/acceptance/lb/links.spec.ts |
| LB-1.AC4 | Given 100 seeded models, when `/leaderboard` loads, then Largest Contentful Paint is within the LCP budget in the NFR section. | lighthouse:leaderboard-lcp |
| LB-1.AC5 | Given seed data, when `/leaderboard` renders at 1440, 768 and 390 px, then the leaderboard region matches the parity baseline and static chrome is within the visual-diff threshold. | parity:leaderboard |
### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-1.1 | Leaderboard API endpoint and query | server/api/leaderboard | FND-4.2 | LB-1.AC1 | tests/acceptance/lb/leaderboard-api.spec.ts | S | |
| LB-1.2 | Ranking rules for ties and missing scores | server/domain/ranking | FND-4.2 | LB-1.AC2 | tests/unit/lb/ranking.spec.ts | S | |
| LB-1.3 | Leaderboard table component | components/leaderboard | FND-2.3 | LB-1.AC1 | tests/unit/lb/leaderboard-table.spec.ts | M | |
| LB-1.4 | Route and page composition | routes/leaderboard | LB-1.1, LB-1.2, LB-1.3, FND-3.2 | LB-1.AC1, LB-1.AC3, LB-1.AC5 | tests/acceptance/lb/leaderboard.spec.ts, tests/parity/leaderboard.aria.yml | S | |
| LB-1.5 | Performance pass to the LCP budget | components/leaderboard | LB-1.4 | LB-1.AC4 | tests/acceptance/lb/leaderboard-perf.spec.ts | S | Runs lighthouse:leaderboard-lcp |
```

UI states, data contract, edge cases and out of scope follow section 5.2 and are omitted here. In rolling mode, tasks exist initially for M0 and M1; AUTH and CMP (M2) keep their criteria until M1 is at least 70% done. In upfront mode, decompose those features now as well.

## Grounded in

- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents): the protected-spec precedent, a feature list where only the `passes` flag is editable (section 8).
- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps): the planner keeps specs at product level, so errors do not cascade into tasks (sections 1 and 2).
- [ccpm, Claude Code PM](https://github.com/automazeio/ccpm): a PRD-to-tracker reference.
- [How to use GitHub as long-term memory for coding agents](https://meshintelligence.substack.com/p/how-to-use-github-as-long-term-memory): the tracker holds progress while the PRD holds intent (section 8).
- Martin Fowler, [GivenWhenThen](https://martinfowler.com/bliki/GivenWhenThen.html): the acceptance criterion form (section 6).
