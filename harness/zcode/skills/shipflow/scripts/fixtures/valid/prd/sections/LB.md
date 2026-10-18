---
id: LB
title: Leaderboards
milestone: M1
depends_on: [FND]
reference_archetypes: [arch:leaderboard, arch:category-leaderboard]
---
# LB Leaderboards

Ranked model tables: the overall leaderboard, category tabs, sort, filter and search, score details, and the last-updated and methodology links shown above each table.

## LB-1 Overall leaderboard

Story: As a visitor, I see every model ranked by overall score.
Depends on: FND-4
Evidence: arch:leaderboard, int:leaderboard-sort, journey:sort-by-score

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-1.AC1 | Given seed data, when a visitor opens /leaderboard, then rank, model, organisation, score, 95% CI, votes and licence show, sorted by score descending. | tests/acceptance/lb/leaderboard.spec.ts |
| LB-1.AC2 | Given two models with equal scores, when the leaderboard renders, then both models share one rank number. | tests/acceptance/lb/ranking.spec.ts |
| LB-1.AC3 | Given a model row, when a visitor activates the model name, then the browser opens that model's detail page. | tests/acceptance/lb/model-links.spec.ts |
| LB-1.AC4 | Given 100 rows of seed data, when the leaderboard loads, then the LCP stays within budget with rows paginated or virtualised. | lighthouse:leaderboard-lcp |
| LB-1.AC5 | Given the reference viewports 1440, 768 and 390 px, when the leaderboard renders, then the aria snapshot matches tests/parity/leaderboard.aria.yml and the static chrome is within the visual-diff threshold. | tests/parity/leaderboard.spec.ts |

### UI states
Loading shows a skeleton table with the same row height as the final table. An empty result says that no models have scores yet. An error shows a retry button that repeats the request.

### Edge cases
A model without a score sorts last and shows no rank number. Scores with fewer than 30 votes are flagged by LB-4.

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-1.1 | Leaderboard API endpoint and query | server/api/leaderboard | FND-4.2 | LB-1.AC1 | tests/acceptance/lb/leaderboard-api.spec.ts | S | |
| LB-1.2 | Ranking rules for ties and missing scores | server/domain/ranking | FND-4.2 | LB-1.AC2 | tests/acceptance/lb/ranking.spec.ts | S | |
| LB-1.3 | Leaderboard table component | components/leaderboard | FND-2.3 | LB-1.AC1, LB-1.AC3 | tests/acceptance/lb/leaderboard.spec.ts, tests/acceptance/lb/model-links.spec.ts | M | |
| LB-1.4 | Route and page composition | routes/leaderboard | LB-1.1, LB-1.2, LB-1.3, FND-3.2 | LB-1.AC1, LB-1.AC3, LB-1.AC5 | tests/parity/leaderboard.spec.ts | S | |
| LB-1.5 | Performance pass to the LCP budget | components/leaderboard | LB-1.4 | LB-1.AC4 | tests/acceptance/lb/leaderboard-perf.spec.ts | S | |

## LB-2 Category leaderboards

Story: As a visitor, I switch between text, coding, vision and math leaderboards with a link I can share.
Depends on: LB-1
Evidence: arch:category-leaderboard, int:category-tabs, journey:switch-category

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-2.AC1 | Given the leaderboard page, when a visitor selects the coding tab, then the URL becomes /leaderboard/coding and the table shows coding scores only. | tests/acceptance/lb/category-tabs.spec.ts |
| LB-2.AC2 | Given an unknown category in the URL, when a visitor opens it, then the response is a 404 page. | tests/acceptance/lb/category-404.spec.ts |
| LB-2.AC3 | Given the category tab list, when a keyboard user moves with the arrow keys, then the selection follows the WAI-ARIA tabs pattern. | axe:category-tabs |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-2.1 | Category route and tabs following the tab pattern | routes/leaderboard | LB-1.4 | LB-2.AC1, LB-2.AC3 | tests/acceptance/lb/category-tabs.spec.ts | S | |
| LB-2.2 | Category filter in the leaderboard API | server/api/leaderboard | LB-1.1 | LB-2.AC2 | tests/acceptance/lb/category-404.spec.ts | S | |
| LB-2.3 | Empty and error states for a category | components/leaderboard | LB-1.3 | LB-2.AC1 | tests/acceptance/lb/category-states.spec.ts | S | |

## LB-3 Sort, filter, search

Story: As a visitor, I sort, filter and search the table, and the view stays in the URL so I can share it.
Depends on: LB-1
Evidence: int:leaderboard-sort, int:leaderboard-filter, int:leaderboard-search

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-3.AC1 | Given the leaderboard table, when a visitor activates a column header, then the table sorts by that column and the header carries aria-sort. | tests/acceptance/lb/sort.spec.ts |
| LB-3.AC2 | Given the organisation and licence filters, when a visitor selects one, then only matching models remain and the count updates. | tests/acceptance/lb/filters.spec.ts |
| LB-3.AC3 | Given a search query, when the visitor types and pauses for 300 ms, then results update once and the query is written to the URL. | tests/acceptance/lb/search.spec.ts |
| LB-3.AC4 | Given a sort, a filter and a search, when the visitor opens the copied URL in a new tab, then the same view renders. | tests/acceptance/lb/url-state.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-3.1 | Sortable headers with aria-sort | components/leaderboard | LB-1.3 | LB-3.AC1 | tests/acceptance/lb/sort.spec.ts | S | |
| LB-3.2 | Organisation and licence filters | components/leaderboard | LB-1.3 | LB-3.AC2 | tests/acceptance/lb/filters.spec.ts | S | |
| LB-3.3 | Debounced search with URL state | routes/leaderboard | LB-1.4 | LB-3.AC3 | tests/acceptance/lb/search.spec.ts | M | |
| LB-3.4 | Combined view state in the URL | routes/leaderboard | LB-3.1, LB-3.2, LB-3.3 | LB-3.AC4 | tests/acceptance/lb/url-state.spec.ts | S | |

## LB-4 Score details

Story: As a visitor, I read the confidence interval and vote count behind each score, and I can tell when a score rests on few votes.
Depends on: LB-1
Evidence: arch:leaderboard, int:score-tooltip

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-4.AC1 | Given a score cell, when a visitor hovers or focuses it, then a tooltip shows the 95% CI and the vote count. | tests/acceptance/lb/score-tooltip.spec.ts |
| LB-4.AC2 | Given an open score tooltip, when a keyboard user presses Escape, then the tooltip closes and focus returns to the score cell. | axe:score-tooltip |
| LB-4.AC3 | Given a model with fewer than 30 votes, when its score renders, then a low-sample marker appears next to the score. | tests/acceptance/lb/low-sample.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-4.1 | Score tooltip with hover and focus | components/leaderboard | LB-1.3 | LB-4.AC1, LB-4.AC2 | tests/acceptance/lb/score-tooltip.spec.ts | S | |
| LB-4.2 | Low-sample marker from the vote count | components/leaderboard | LB-4.1 | LB-4.AC3 | tests/acceptance/lb/low-sample.spec.ts | S | |

## LB-5 Last-updated and methodology links

Story: As a visitor, I see when the leaderboard was last updated and can jump to the methodology section.
Depends on: LB-1
Evidence: arch:leaderboard

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| LB-5.AC1 | Given seed data with an update time, when the leaderboard renders, then the header shows the last-updated date in ISO and local format. | tests/acceptance/lb/last-updated.spec.ts |
| LB-5.AC2 | Given the last-updated line, when a visitor selects the methodology link, then the about page opens at the methodology anchor. | tests/acceptance/lb/methodology-link.spec.ts |
| LB-5.AC3 | Given no update time in the data, when the leaderboard renders, then the line reads "Last updated: unknown" and no date appears. | tests/acceptance/lb/last-updated-empty.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| LB-5.1 | Last-updated line from the data timestamp | components/leaderboard | LB-1.4 | LB-5.AC1, LB-5.AC3 | tests/acceptance/lb/last-updated.spec.ts, tests/acceptance/lb/last-updated-empty.spec.ts | S | |
| LB-5.2 | Methodology link to the about page anchor | routes/leaderboard | LB-5.1, INFO-1.2 | LB-5.AC2 | tests/acceptance/lb/methodology-link.spec.ts | S | |
