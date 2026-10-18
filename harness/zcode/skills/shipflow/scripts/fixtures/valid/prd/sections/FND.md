---
id: FND
title: Foundations
milestone: M0
depends_on: []
reference_archetypes: [arch:home, arch:not-found]
---
# FND Foundations

Foundations for every later section: a scaffolded app with CI, a design system built from measured tokens, the shared shell, the data layer, the test and parity harness, and the SEO metadata helpers. Nothing here is visitor-facing content; it makes the later sections buildable and measurable.

## FND-1 Scaffold and CI

Story: As a maintainer, I clone the repository, run one command and get a building app with every CI gate.
Evidence: arch:home

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-1.AC1 | Given a clean checkout, when the maintainer runs the install and build commands, then the app builds with no manual steps. | tests/acceptance/fnd/scaffold.spec.ts |
| FND-1.AC2 | Given a pull request, when CI runs, then lint, type check, unit tests and acceptance tests run and block the merge on failure. | tests/acceptance/fnd/ci-gates.spec.ts |
| FND-1.AC3 | Given a production build, when the initial JavaScript is measured, then it stays within the bundle budget. | bundle:initial-js |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-1.1 | Scaffold the app with build, lint and test scripts | src/app | | FND-1.AC1 | tests/acceptance/fnd/scaffold.spec.ts | S | |
| FND-1.2 | CI workflow that runs every gate on pull requests | src/tooling | FND-1.1 | FND-1.AC2 | tests/acceptance/fnd/ci-gates.spec.ts | S | |
| FND-1.3 | Bundle budget check on the production build | src/tooling | FND-1.1 | FND-1.AC3 | tests/acceptance/fnd/bundle-budget.spec.ts | S | |

## FND-2 Design system from measured tokens

Story: As a developer, I build pages from one token set measured from the reference, so colour, type and spacing match.
Depends on: FND-1
Evidence: arch:home

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-2.AC1 | Given the measured colour, type and spacing values, when the design system builds, then every token is defined once in the theme and exported to components. | tests/acceptance/fnd/tokens.spec.ts |
| FND-2.AC2 | Given the button, badge and table primitives, when they render in the light and dark themes, then text contrast meets WCAG 2.2 AA. | axe:design-system |
| FND-2.AC3 | Given the 390, 768 and 1440 px breakpoints, when the primitives render, then the layout matches the parity baseline within the visual-diff threshold. | tests/parity/design-system.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-2.1 | Token file generated from measured values | src/theme | FND-1.1 | FND-2.AC1 | tests/acceptance/fnd/tokens.spec.ts | S | |
| FND-2.2 | Contrast-checked colour pairs for light and dark themes | src/theme | FND-2.1 | FND-2.AC2 | tests/acceptance/fnd/contrast.spec.ts | S | |
| FND-2.3 | Button, badge and table primitives | components/ui | FND-2.1 | FND-2.AC3 | tests/parity/design-system.spec.ts | M | |

## FND-3 App shell (header, nav, footer, routing, 404)

Story: As a visitor, every page shares the same header, navigation and footer, and an unknown path gets a helpful 404 page.
Depends on: FND-1, FND-2
Evidence: arch:home, arch:not-found

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-3.AC1 | Given any route, when the page loads, then the header, primary navigation and footer render with the structure of the reference. | tests/parity/app-shell.spec.ts |
| FND-3.AC2 | Given an unknown path, when a visitor opens it, then a 404 page renders with status 404 and a link back to the home page. | tests/acceptance/fnd/not-found.spec.ts |
| FND-3.AC3 | Given the primary navigation, when a keyboard user moves through it, then every link is reachable in tab order with a visible focus ring. | axe:app-shell |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-3.1 | Root layout with header, navigation and footer | components/shell | FND-2.3 | FND-3.AC1 | tests/parity/app-shell.spec.ts | M | |
| FND-3.2 | Route table and 404 page | routes/root | FND-3.1 | FND-3.AC2 | tests/acceptance/fnd/not-found.spec.ts | S | |
| FND-3.3 | Keyboard navigation and focus styles in the shell | components/shell | FND-3.1 | FND-3.AC3 | tests/acceptance/fnd/shell-keyboard.spec.ts | S | |

## FND-4 Data layer (schema, migrations, seed import)

Story: As a maintainer, I migrate the schema and import seed data without duplicates, so every later feature reads the same ranked data.
Depends on: FND-1
Evidence: arch:model-directory

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-4.AC1 | Given an empty database, when the migrations run, then the models, benchmarks, scores, categories and votes tables exist with the keys from the data model. | tests/acceptance/fnd/migrations.spec.ts |
| FND-4.AC2 | Given the seed file, when the import runs twice, then row counts stay the same and no model appears twice. | tests/acceptance/fnd/seed-idempotent.spec.ts |
| FND-4.AC3 | Given seed data, when the score query runs, then it returns each model with its latest score per benchmark. | tests/acceptance/fnd/score-query.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-4.1 | Schema and first migration | server/db | FND-1.1 | FND-4.AC1 | tests/acceptance/fnd/migrations.spec.ts | M | |
| FND-4.2 | Typed repository for models and scores | server/db | FND-4.1 | FND-4.AC3 | tests/acceptance/fnd/score-query.spec.ts | S | |
| FND-4.3 | Idempotent seed import | server/seed | FND-4.1 | FND-4.AC2 | tests/acceptance/fnd/seed-idempotent.spec.ts | S | |

## FND-5 Test and parity harness

Story: As a maintainer, I add acceptance and parity specs without extra wiring, and CI fails on serious accessibility violations.
Depends on: FND-1
Evidence: arch:home

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-5.AC1 | Given the acceptance suite layout, when a new spec is added under tests/acceptance, then the runner picks it up without extra configuration. | tests/acceptance/fnd/runner.spec.ts |
| FND-5.AC2 | Given a reference snapshot, when the parity harness runs, then it reports structural and layout differences for each viewport. | tests/parity/harness.spec.ts |
| FND-5.AC3 | Given a built page, when axe runs in CI, then any serious violation fails the build. | axe:ci-gate |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-5.1 | Acceptance test runner configuration | src/tooling | FND-1.1 | FND-5.AC1 | tests/acceptance/fnd/runner.spec.ts | S | |
| FND-5.2 | Parity harness with per-viewport diff | src/tooling | FND-5.1 | FND-5.AC2 | tests/parity/harness.spec.ts | M | |
| FND-5.3 | Axe gate in CI | src/tooling | FND-5.1, FND-1.2 | FND-5.AC3 | tests/acceptance/fnd/axe-gate.spec.ts | S | |

## FND-6 SEO and metadata

Story: As a search engine crawler, I find a unique title, description, canonical URL, sitemap entry and structured data on every public page.
Depends on: FND-3
Evidence: arch:home

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| FND-6.AC1 | Given any public page, when the head renders, then it has a unique title, a meta description and a canonical URL derived from the route. | tests/acceptance/fnd/metadata.spec.ts |
| FND-6.AC2 | Given the site, when the sitemap is requested, then every public route appears once with a last-modified date. | tests/acceptance/fnd/sitemap.spec.ts |
| FND-6.AC3 | Given a public entity page, when the head renders, then a JSON-LD block describes the entity and passes the SEO basics check. | lighthouse:seo-basics |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| FND-6.1 | Metadata helper for title, description and canonical URL | src/seo | FND-3.1 | FND-6.AC1 | tests/acceptance/fnd/metadata.spec.ts | S | |
| FND-6.2 | Sitemap generated from the route table | server/seo | FND-3.2 | FND-6.AC2 | tests/acceptance/fnd/sitemap.spec.ts | S | |
| FND-6.3 | JSON-LD helper for entity pages | src/seo | FND-6.1 | FND-6.AC3 | tests/acceptance/fnd/jsonld.spec.ts | S | |
