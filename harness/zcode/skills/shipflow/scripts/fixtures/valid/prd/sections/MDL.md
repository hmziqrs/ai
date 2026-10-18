---
id: MDL
title: Models and benchmarks
milestone: M1
depends_on: [FND]
reference_archetypes: [arch:model-directory, arch:benchmark-detail]
---
# MDL Models and benchmarks

Model and benchmark data pages: the model directory, model detail pages, benchmark pages, and the admin form that adds and edits models and scores with CSV and JSON import.

## MDL-1 Model directory

Story: As a visitor, I browse every model in one paged list with its organisation, licence and benchmark count.
Depends on: FND-4
Evidence: arch:model-directory

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| MDL-1.AC1 | Given seeded models, when a visitor opens /models, then each card shows name, organisation, licence and benchmark count. | tests/acceptance/mdl/directory.spec.ts |
| MDL-1.AC2 | Given more than 50 models, when the visitor reaches the end of the list, then the next page loads and each page holds 50 models. | tests/acceptance/mdl/directory-paging.spec.ts |
| MDL-1.AC3 | Given an organisation with no models, when its filter is chosen, then the empty state explains that no models are listed yet. | tests/acceptance/mdl/directory-empty.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| MDL-1.1 | Directory query with pagination | server/api/models | FND-4.2 | MDL-1.AC2 | tests/acceptance/mdl/directory-paging.spec.ts | S | |
| MDL-1.2 | Model card component | components/models | FND-2.3 | MDL-1.AC1 | tests/acceptance/mdl/directory.spec.ts | S | |
| MDL-1.3 | Directory route with empty state | routes/models | MDL-1.1, MDL-1.2, FND-3.2 | MDL-1.AC1, MDL-1.AC3 | tests/acceptance/mdl/directory-empty.spec.ts | S | |

## MDL-2 Model detail page

Story: As a visitor, I open a model and read its licence and its score on every benchmark in one page.
Depends on: MDL-1
Evidence: arch:model-detail, journey:open-model-detail

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| MDL-2.AC1 | Given a model slug, when a visitor opens /models/:slug, then the page shows the model header, its licence and its score per benchmark. | tests/acceptance/mdl/model-detail.spec.ts |
| MDL-2.AC2 | Given a slug that matches no model, when a visitor opens the page, then the response is 404 with a link back to the directory. | tests/acceptance/mdl/model-404.spec.ts |
| MDL-2.AC3 | Given a model with scores on three benchmarks, when the page renders, then each benchmark name links to its benchmark page. | tests/acceptance/mdl/model-links.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| MDL-2.1 | Model detail query with scores by benchmark | server/api/models | FND-4.2 | MDL-2.AC1 | tests/acceptance/mdl/model-detail.spec.ts | M | |
| MDL-2.2 | Detail route and not-found handling | routes/models | MDL-2.1, FND-3.2 | MDL-2.AC2 | tests/acceptance/mdl/model-404.spec.ts | S | |
| MDL-2.3 | Benchmark links in the score table | components/models | MDL-2.2 | MDL-2.AC3 | tests/acceptance/mdl/model-links.spec.ts | S | |

## MDL-3 Benchmark pages

Story: As a visitor, I read what a benchmark measures and see every model ranked on it.
Depends on: MDL-2
Evidence: arch:benchmark-detail

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| MDL-3.AC1 | Given a benchmark slug, when a visitor opens /benchmarks/:slug, then the page shows the description, the scoring scale and a ranked list of models. | tests/acceptance/mdl/benchmark-detail.spec.ts |
| MDL-3.AC2 | Given a benchmark with no scored models, when the page renders, then the ranked list is replaced by a note that no scores are published yet. | tests/acceptance/mdl/benchmark-empty.spec.ts |
| MDL-3.AC3 | Given the benchmark page, when a screen reader reads it, then the scoring scale is available as text and not only as a chart. | axe:benchmark-page |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| MDL-3.1 | Benchmark query and ranked list | server/api/benchmarks | FND-4.2 | MDL-3.AC1, MDL-3.AC2 | tests/acceptance/mdl/benchmark-detail.spec.ts, tests/acceptance/mdl/benchmark-empty.spec.ts | M | |
| MDL-3.2 | Benchmark route and description block | routes/benchmarks | MDL-3.1, FND-3.2 | MDL-3.AC1, MDL-3.AC3 | tests/acceptance/mdl/benchmark-a11y.spec.ts | S | |

## MDL-4 Admin add/edit model and scores, with CSV/JSON import

Story: As an admin, I add or edit a model and its scores, and I import a CSV or JSON file of scores.
Milestone: M2
Depends on: AUTH-4
Evidence: arch:admin-models, int:admin-csv-import, journey:admin-import-scores

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| MDL-4.AC1 | Given an admin on the model form, when they save a new model, then the model appears in the directory and the leaderboard on the next read. | tests/acceptance/mdl/admin-model.spec.ts |
| MDL-4.AC2 | Given a CSV file with one invalid row, when an admin imports it, then the import is rejected with the row number and no rows are written. | tests/acceptance/mdl/admin-import.spec.ts |
| MDL-4.AC3 | Given a valid JSON score file, when an admin imports it twice, then the second import updates existing scores and creates no duplicates. | tests/acceptance/mdl/admin-import-idempotent.spec.ts |
