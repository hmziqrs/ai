# PRD format

The PRD is the project specification on disk: a root, sections, features, acceptance criteria and tasks. It says what to build and never where the work stands; GitHub holds the status (`github-state.md`).

Implemented by `scripts/lib/prd.ts` (parser, lint rules, index builder) and `scripts/prd-lint.ts` (CLI). The rule ids and output lines below are the ones the code emits. How to write a good PRD is the `prd-authoring` skill's job; this file says what the linter accepts. Design rationale is cited as "design N".

Local planning can run before GitHub setup and can stop after an overview, selected sections,
features or detailed tasks. Named checks are planning data; executable acceptance tests belong
to later implementation preparation. Publication and building each require the user's requested
next phase (design 0.1, D14-D15; design 4.0a).

## Files

| Path | Role | Checked by |
|---|---|---|
| `prd/prd.md` | Root: summary, journeys, scope, milestones, section index, done definition | `prd-lint` root rules |
| `prd/sections/<CODE>.md` | One section with its features, criteria and tasks | `prd-lint` section rules |
| `prd/assumptions.md` | Gaps the system filled, each with confidence and evidence | `assumption-format` |
| `prd/decisions/ADR-<nnn>-<slug>.md` | Architecture decisions | none (free text) |
| `prd/data-model.md`, `prd/design-system.md` | Entities and relations; tokens and components | none (free text) |
| `prd/index.json` | Generated index of ids, parents, dependencies, criteria and hashes | written by `--emit-index`; `stale-index` warns on drift |
| `discovery/manifest.json` | Reference-site recon output (`site-recon` skill) | ids read by `prd-lint` |

Only the PRD agents on a `wf/prd-v<n>` branch may change `prd/` (charter `protected`). Status never lives in the PRD (design 4.2).

## Root: `prd/prd.md`

```markdown
---
id: PRD
title: LLM benchmark site
reference: ["https://bench.example"]
captured: 2026-10-18
parity_target: {structure: true, layout: true, interactions: true, brand: false, content: false}
milestones: [M0, M1, M2, M3]
---
# LLM benchmark site

## Summary
Three to five sentences on what the product is and who uses it.
```

Front matter is YAML (`Bun.YAML.parse`):

| Field | Rule | Rule id |
|---|---|---|
| `id` | Exactly `PRD` | `frontmatter` |
| `title` | Non-empty | `frontmatter` |
| `reference` | List of URLs; `[]` for a product with no reference site | `frontmatter` |
| `milestones` | Non-empty list of `M<n>` values | `frontmatter` |
| `parity_target` | Non-empty map from name to `true` or `false` | `frontmatter` |
| `captured` | Date; not checked | none |

Required `##` headings, in this order: Summary, Users and journeys, Scope, NFR budgets, Architecture, Milestones, Sections, Glossary, Done definition. A missing or out-of-order heading is a `frontmatter` error. Scope, NFR budgets, Architecture, Glossary and Done definition are free text.

Root tables the linter reads:

| Heading | Columns | Notes |
|---|---|---|
| Users and journeys | `Journey`, `Features` | `Journey` starts with `J<n>`; `Features` is a comma-separated list of feature ids. Journeys are coverage targets. |
| Sections | `Code`, `Section`, `Milestone`, `Depends on`, `Covers` | One row per section file. `Covers` lists archetype and journey ids (coverage at S2). A `Purpose` column may be added; it is ignored. |
| Milestones | `Milestone`, `Goal` | Free text. Lint checks the front matter list, not this table. |

## Section files: `prd/sections/<CODE>.md`

Front matter: `id` (must equal the file name), `title` and `milestone` (required), plus optional `depends_on` and `reference_archetypes` lists. The body is an `# <CODE> <Title>` heading, a purpose paragraph, then one `##` heading per feature.

Feature elements:

| Element | Rule | Rule id |
|---|---|---|
| Heading | `## <CODE>-<n> <title>`. A `####` heading that names a feature or task is an error. | `id-format`, `depth` |
| `Story:` | Required and non-empty; one behaviour a user can observe | `story` |
| `Milestone:` | Optional; defaults to the section's milestone | `milestone-unknown` |
| `Depends on:` | Comma-separated feature or task ids | `dep-unresolved` |
| `Evidence:` | Discovery ids. Required when the root `reference` is non-empty. | `evidence` |
| `Status:` | Optional: `dropped`, or `superseded by <ids>`. Any other value is a `parse` error. | `parse` |
| `### Acceptance criteria` | Table `ID`, `Criterion`, `Check`; three to ten criteria per active feature | `ac-count`, `ac-format`, `ac-check` |
| `### Tasks` | Optional until the feature's milestone is decomposed; table of eight columns (below) | `task-*`, `task-count` |

Key lines are read only directly under the feature heading, before its first `###`. Keys match case-insensitively.

Criterion ids are `<CODE>-<n>.AC<n>`. The `Criterion` text must contain Given, when, then in that order. `Check` is `tests/<path>` or `<tool>:<name>`, where the tool is `parity`, `lighthouse`, `axe` or `bundle`.

Task table columns: `Task`, `Goal`, `Area`, `Depends on`, `Satisfies`, `Tests`, `Size`, `Notes`. Task ids are `<feature>.<n>`. `Area` and `Tests` are comma-separated relative paths (no leading `/`, no `..`). `Satisfies` lists criteria of the same feature. `Size` is `S` or `M`. A `Notes` cell that starts with `dropped` drops the task. A task's milestone is its feature's milestone.

Example feature with its criteria and tasks:

```markdown
## LB-1 Overall leaderboard

Story: As a visitor, I see every model ranked by overall score.
Depends on: FND-4
Evidence: arch:leaderboard, journey:sort-by-score

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-1.AC1 | Given seed data, when a visitor opens /leaderboard, then rows are sorted by score descending | tests/acceptance/lb/leaderboard.spec.ts |
| LB-1.AC2 | Given a tie on score, when the table renders, then tied rows are ordered by model name | tests/acceptance/lb/ties.spec.ts |
| LB-1.AC3 | Given no seed data, when a visitor opens /leaderboard, then an empty state explains why | tests/acceptance/lb/empty.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-1.1 | Leaderboard API endpoint and query | server/api/leaderboard | FND-4.2 | LB-1.AC1 | tests/acceptance/lb/leaderboard-api.spec.ts | S | |
| LB-1.2 | Ranking rules with tie-break | server/lib/ranking | | LB-1.AC2 | tests/acceptance/lb/ties-unit.spec.ts | S | |
| LB-1.3 | Empty-state component | components/leaderboard | | LB-1.AC3 | tests/acceptance/lb/empty.spec.ts | S | |
```

## Assumptions: `prd/assumptions.md`

| ID | Assumption | Confidence | Evidence | Affects |
|---|---|---|---|---|
| A-001 | Sign-in uses email plus GitHub OAuth | medium | login page shows both buttons (arch:sign-in) | AUTH-1 |

`ID` is `A-<nnn>`. `Confidence` is `low`, `medium` or `high` (`assumption-format`). In automatic delivery, ordinary assumptions are informational. In a complex/niche plan or requested review, questions that change intent go to the owner before publication or implementation. An unpublished assumption needs no GitHub issue.

## Discovery manifest: `discovery/manifest.json`

Produced by the `site-recon` skill. Lint reads only the `id` of each entry in `archetypes`, `journeys` and `interactions`:

```json
{
  "version": 1,
  "reference": "https://bench.example",
  "captured": "2026-10-18",
  "archetypes": [{ "id": "arch:leaderboard", "pattern": "/leaderboard", "instances": ["/leaderboard"] }],
  "journeys": [{ "id": "journey:sort-by-score", "archetype": "arch:leaderboard", "file": "discovery/journeys/sort-by-score.json" }],
  "interactions": [{ "id": "int:leaderboard-sort", "archetype": "arch:leaderboard", "kind": "sort" }]
}
```

Each entry needs a string `id`; a list that is missing or not an array is a `parse` error. Invalid JSON is also a `parse` error, and when the root `reference` is non-empty the coverage rule then reports the manifest as missing.

## Identifiers

| Item | Form | Example | Notes |
|---|---|---|---|
| Section | `[A-Z]{2,4}` | `LB` | File `prd/sections/LB.md` |
| Feature | `<CODE>-<n>` | `LB-2` | Sub-issue of its section |
| Task | `<feature>.<n>` | `LB-2.4` | Sub-issue of its feature |
| Acceptance criterion | `<feature>.AC<n>` | `LB-2.AC3` | Named in a task's `Satisfies` |
| Journey | `J<n>` | `J1` | Root Users and journeys table |
| Milestone | `M<n>` | `M1` | Root front matter list |
| Assumption | `A-<nnn>` | `A-017` | Row in `prd/assumptions.md` |
| Decision | `ADR-<nnn>` | `ADR-003` | File name only; not linted |
| Discovery | `arch:<slug>`, `journey:<slug>`, `int:<slug>` | `arch:leaderboard` | Slug `[a-z0-9-]+` |

IDs are never reused or renumbered. A dropped item stays in `index.json` with `status: dropped`, and its GitHub issue is closed as not planned (design 4.3).

## Size rules

| Level | Count rule | Rule id | Severity |
|---|---|---|---|
| Sections | 4 to 10 per product | `section-size` | WARN |
| Features | 2 to 8 per section | `section-size` | WARN |
| Criteria | 3 to 10 per active feature | `ac-count` | ERROR |
| Tasks | 2 to 8 per active feature in decomposed milestones | `task-count` | ERROR |
| Task size | `S` or `M`; a larger task is split | `task-size` | ERROR |

Task budgets (about 10 files and 300 changed lines, design 4.1) are carried in the task's machine block (`github-state.md`).

## Lint: `prd-lint.ts`

Commands:

```
bun .zcode/skills/shipflow/scripts/prd-lint.ts --repo . --stage s2
bun .zcode/skills/shipflow/scripts/prd-lint.ts --repo . --stage s5 --decomposed M0,M1
bun .zcode/skills/shipflow/scripts/prd-lint.ts --repo . --stage s5 --features LB-1,LB-2
bun .zcode/skills/shipflow/scripts/prd-lint.ts --repo . --stage s3 --emit-index --json
```

| Flag | Default | Meaning |
|---|---|---|
| `--repo <root>` | required | Project root that contains `prd/`; must be a directory |
| `--stage s2`, `s3` or `s5` | required | Highest stage to check. Every lower stage's rules also run. |
| `--coverage-target <0-1>` | `0.95` | Minimum covered share of discovery ids |
| `--decomposed M0,M1` | every milestone with a task | Milestones whose features must have 2 to 8 tasks (`task-count`, `ac-uncovered`); ignored as an inferred scope when `--features` is explicit |
| `--features LB-1,LB-2` | off | Feature-level task completeness at s5. Mutually exclusive with `--decomposed`. Other feature task lists need not be complete; dependency, criteria and task validity still apply globally. Missing/inactive ids fail. |
| `--emit-index` | off | Write `prd/index.json` when there are zero errors |
| `--json` | off | One JSON object instead of text lines |
| `--help`, `-h` | | Print usage and exit 0 |

The kickoff stages use the same names: S2 runs `--stage s2`, S3 runs `--stage s3`, and S5 runs `--stage s5` with the milestones decomposed so far.

| Exit code | Meaning |
|---|---|
| 0 | No errors (warnings may exist) |
| 1 | At least one ERROR; with `--emit-index`, the index is not written |
| 2 | Usage error (unknown flag, bad value) or `--repo` is not a directory |

Text output is one summary line, then one line per issue in natural id order:

```
prd-lint s3: 1 errors, 1 warnings, coverage 38/40
ERROR LB-1 ac-count has 2 acceptance criteria (expected 3-10)
WARN FND section-size 1 active features (expected 2-8)
```

JSON output has the keys `stage`, `summary`, `errors`, `warnings` (each item `level`, `id`, `rule`, `reason`, `file`), `coverage` (`covered`, `total`, `ratio`, `misses`) and `indexWritten`.

A rule runs at its stage and at every higher stage. `parse` is not in the stage table: every stage emits it for malformed structure.

| Rule | Stage | Check |
|---|---|---|
| `frontmatter` | s2 | Root front matter fields and the nine `##` headings in order; section front matter has `id`, `title` and `milestone`; section `id` equals the file name |
| `id-format` | s2 | Section code `^[A-Z]{2,4}$`; feature `<CODE>-<n>` with the file's code; task `<feature>.<n>`; criterion `<feature>.AC<n>`; assumption `A-<nnn>`; journey `J<n>`; discovery ids by prefix and slug |
| `id-duplicate` | s2 | No section, feature, task, criterion, assumption or journey id appears twice |
| `depth` | s2 | No id deeper than a task; no `####` heading naming a feature or task; no task table outside a feature's Tasks section |
| `milestone-unknown` | s2 | Every section, feature and task milestone is in the root `milestones` list |
| `coverage` | s2 (archetypes, journeys); s3 and up (adds interactions) | Each uncovered discovery id is a WARN; coverage below `--coverage-target` is also one ERROR. Skipped when there is no manifest and the root `reference` is empty. |
| `section-index` | s3 | Every section file is in the root Sections table, and every listed code has a file |
| `ac-count` | s3 | Each active feature has 3 to 10 criteria |
| `ac-format` | s3 | Each criterion text contains Given, when, then in that order (case-insensitive) |
| `ac-check` | s3 | `Check` is `tests/<path>` or `<tool>:<name>` with tool `parity`, `lighthouse`, `axe` or `bundle` |
| `story` | s3 | Each active feature has a non-empty Story |
| `evidence` | s3 | With a non-empty root `reference`, each active feature has Evidence, and every Evidence id is in the manifest |
| `assumption-format` | s3 | Assumption id `A-<nnn>`; confidence `low`, `medium` or `high` |
| `dep-unresolved` | s3 | Every section, feature and task dependency names an existing id (task dependencies name tasks) |
| `dep-cycle` | s3 | Sections, features and tasks form acyclic graphs; reported as `cycle a -> b -> a` |
| `dep-forward-milestone` | s5 | No feature depends on a feature, and no task on a task, in a later milestone |
| `task-scope` | s5 | An explicitly selected feature exists and is active |
| `task-fields` | s5 | Each active task has Goal, Area, Satisfies and Tests; Area and Tests are valid relative paths |
| `task-size` | s5 | Size is `S` or `M` |
| `task-satisfies` | s5 | Every Satisfies id is a criterion of the task's own feature |
| `task-count` | s5 | In each selected feature or decomposed milestone, each active feature has 2 to 8 active tasks |
| `ac-uncovered` | s5 | In each selected feature or decomposed milestone, every criterion of an active feature is satisfied by some active task |
| `section-size` (WARN) | s3 | 4 to 10 sections; 2 to 8 active features per section |
| `stale-index` (WARN) | s3 | `prd/index.json` exists and differs from a rebuilt index |
| `parse` | any | Structure the model cannot read: a table missing a required column, a disallowed feature `Status`, invalid YAML or JSON |

## Index: `prd/index.json`

Written only by `--emit-index`, and only with zero errors. It is pretty-printed (two-space indent, trailing newline), never edited by hand, and the same PRD always produces the same bytes:

```json
{
  "version": 1,
  "root": { "id": "PRD", "title": "LLM benchmark site", "milestones": ["M0", "M1"], "hash": "5d0be3a9f217" },
  "items": [
    { "id": "LB", "kind": "epic", "parent": "PRD", "title": "Leaderboards", "milestone": "M1", "dependsOn": ["FND"], "file": "prd/sections/LB.md", "anchor": "lb-leaderboards", "hash": "9b2e7d41c0a6", "status": "active" },
    { "id": "LB-1", "kind": "feature", "parent": "LB", "title": "Overall leaderboard", "milestone": "M1", "dependsOn": ["FND-4"], "acs": ["LB-1.AC1", "LB-1.AC2", "LB-1.AC3"], "evidence": ["arch:leaderboard", "journey:sort-by-score"], "file": "prd/sections/LB.md", "anchor": "lb-1-overall-leaderboard", "hash": "c7a41e02d9f3", "status": "active" },
    { "id": "LB-1.1", "kind": "task", "parent": "LB-1", "title": "Leaderboard API endpoint and query", "milestone": "M1", "dependsOn": ["FND-4.2"], "area": ["server/api/leaderboard"], "satisfies": ["LB-1.AC1"], "tests": ["tests/acceptance/lb/leaderboard-api.spec.ts"], "size": "S", "file": "prd/sections/LB.md", "anchor": "lb-1-overall-leaderboard", "hash": "2f08c6b1e4a7", "status": "active" }
  ],
  "acs": [{ "id": "LB-1.AC1", "feature": "LB-1", "check": "tests/acceptance/lb/leaderboard.spec.ts" }]
}
```

Item order: sections in the root Sections table order; under each section, its features, and under each feature, its tasks, each group in natural id order (depth first). Dropped items stay, with `status: "dropped"`. `acs` lists every criterion in natural id order.

Lint warns with `stale-index` when an existing `prd/index.json` differs from a rebuilt one. Rerun with `--emit-index` to refresh it.

## Hashes

`itemHash` is the first 12 hex characters of the SHA-256 of the text, with CRLF normalized and trailing spaces and tabs removed from each line. It covers:

| Item | Hashed text |
|---|---|
| Section | Front matter plus the purpose paragraph |
| Feature | From its heading through the line before `### Tasks`, criteria included |
| Task | Its table row |
| Root | The parsed root fields (id, title, reference, milestones, parity target, journeys, sections, headings) |

The reconciler compares these hashes with the `prd_hash` in each issue's machine block to decide when an issue body changes (`github-state.md`).

## Authoring

Write sections with the `prd-authoring` skill; its five critic rubrics are the ones the S3 critics apply. Lint is the floor: a PRD that lints clean can still be vague, and the critics judge that part.
