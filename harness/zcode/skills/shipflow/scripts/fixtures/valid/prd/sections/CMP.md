---
id: CMP
title: Compare
milestone: M2
depends_on: [LB, MDL]
reference_archetypes: [arch:compare]
---
# CMP Compare

Side-by-side comparison of models: a model picker, a comparison table, a chart, shareable URL state, and adding models in place.

## CMP-1 Model picker

Story: As a visitor, I search for models and add up to four of them to a comparison.
Depends on: LB-1, MDL-2
Evidence: arch:compare, int:model-picker, journey:compare-two-models

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| CMP-1.AC1 | Given the compare page, when a visitor types in the picker, then matching models appear within one second and each shows its organisation. | tests/acceptance/cmp/picker.spec.ts |
| CMP-1.AC2 | Given four models already selected, when a visitor tries to add a fifth, then the picker stays closed and a message says the limit is four. | tests/acceptance/cmp/picker-limit.spec.ts |
| CMP-1.AC3 | Given the picker, when a keyboard user opens it, then the combobox follows the WAI-ARIA combobox pattern. | axe:model-picker |

## CMP-2 Side-by-side table

Story: As a visitor, I read the scores of the selected models in one table.
Depends on: CMP-1
Evidence: arch:compare, journey:compare-two-models

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| CMP-2.AC1 | Given two selected models, when the table renders, then each benchmark row shows both scores and marks the better one. | tests/acceptance/cmp/table.spec.ts |
| CMP-2.AC2 | Given a benchmark missing for one model, when the table renders, then that cell reads n/a and is not counted as zero. | tests/acceptance/cmp/missing-score.spec.ts |
| CMP-2.AC3 | Given the table on a 390 px viewport, when it renders, then the first column stays visible while the other columns scroll sideways. | tests/parity/compare-table.spec.ts |

## CMP-3 Charts

Story: As a visitor, I see the selected models' scores as a bar chart.
Depends on: CMP-2
Evidence: int:compare-chart

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| CMP-3.AC1 | Given selected models, when the chart renders, then one bar per model per benchmark appears with its value in text. | tests/acceptance/cmp/chart.spec.ts |
| CMP-3.AC2 | Given the chart, when a user switches to the table view, then the same numbers appear in the table and the chart leaves the DOM. | tests/acceptance/cmp/chart-toggle.spec.ts |
| CMP-3.AC3 | Given the chart colours, when contrast is measured, then each series meets the 3:1 non-text contrast ratio. | axe:compare-chart |

## CMP-4 Shareable URL state

Story: As a visitor, I copy the URL and open the same comparison somewhere else.
Depends on: CMP-2
Evidence: arch:compare

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| CMP-4.AC1 | Given selected models, when the selection changes, then the URL lists the model slugs in selection order. | tests/acceptance/cmp/url-state.spec.ts |
| CMP-4.AC2 | Given a URL with unknown slugs, when the page opens, then the unknown slugs are dropped and the rest load. | tests/acceptance/cmp/url-unknown.spec.ts |
| CMP-4.AC3 | Given a URL with five slugs, when the page opens, then only the first four load and the URL is rewritten to match. | tests/acceptance/cmp/url-limit.spec.ts |

## CMP-5 Add more models in place

Story: As a visitor, I add a model to the comparison without leaving the table.
Depends on: CMP-1
Evidence: int:model-picker

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| CMP-5.AC1 | Given the comparison table, when a visitor adds a model from the inline picker, then a new column appears and the scroll position is kept. | tests/acceptance/cmp/add-inline.spec.ts |
| CMP-5.AC2 | Given the inline picker, when a visitor removes a model, then its column disappears and the URL state updates. | tests/acceptance/cmp/remove-inline.spec.ts |
| CMP-5.AC3 | Given a model already in the comparison, when the visitor tries to add it again, then the picker shows it as already added and nothing changes. | tests/acceptance/cmp/add-duplicate.spec.ts |
