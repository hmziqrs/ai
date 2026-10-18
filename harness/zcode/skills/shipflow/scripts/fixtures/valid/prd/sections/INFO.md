---
id: INFO
title: Static pages
milestone: M1
depends_on: [FND]
reference_archetypes: [arch:static-page]
---
# INFO Static pages

Static content pages: the about and methodology page, the FAQ, and the legal pages. All of them use the shell and the metadata helpers, and all text is written for this project.

## INFO-1 About and methodology

Story: As a visitor, I read what the benchmark measures and how scores are computed.
Depends on: FND-3
Evidence: arch:static-page

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| INFO-1.AC1 | Given the about page, when a visitor opens /about, then it renders the methodology sections with stable anchors. | tests/acceptance/info/about.spec.ts |
| INFO-1.AC2 | Given the methodology anchor, when a visitor follows a link with the methodology hash, then the heading takes focus and scrolls into view. | tests/acceptance/info/methodology-anchor.spec.ts |
| INFO-1.AC3 | Given the about page, when axe runs, then no serious violations are reported. | axe:about |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| INFO-1.1 | About page content from the static content store | routes/about | FND-3.2 | INFO-1.AC1 | tests/acceptance/info/about.spec.ts | S | |
| INFO-1.2 | Stable heading anchors and focus on hash | components/content | INFO-1.1 | INFO-1.AC2 | tests/acceptance/info/methodology-anchor.spec.ts | S | |
| INFO-1.3 | Accessibility pass on the about page | routes/about | INFO-1.1 | INFO-1.AC3 | tests/acceptance/info/about-a11y.spec.ts | S | |

## INFO-2 FAQ

Story: As a visitor, I find answers to common questions on one page and filter them by a word.
Depends on: FND-3
Evidence: arch:static-page

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| INFO-2.AC1 | Given the FAQ content, when a visitor opens /faq, then each question is a heading with its answer in the region below it. | tests/acceptance/info/faq.spec.ts |
| INFO-2.AC2 | Given a long answer, when a visitor reads it on a 390 px viewport, then the text wraps without horizontal page scroll. | tests/parity/faq-layout.spec.ts |
| INFO-2.AC3 | Given the FAQ search box, when a visitor types a word, then only questions containing that word stay visible. | tests/acceptance/info/faq-search.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| INFO-2.1 | FAQ route and content model | routes/faq | FND-3.2 | INFO-2.AC1 | tests/acceptance/info/faq.spec.ts | S | |
| INFO-2.2 | Responsive answer layout | components/content | INFO-2.1 | INFO-2.AC2 | tests/parity/faq-layout.spec.ts | S | |
| INFO-2.3 | Client-side question filter | components/content | INFO-2.1 | INFO-2.AC3 | tests/acceptance/info/faq-search.spec.ts | S | |

## INFO-3 Legal pages (own content)

Story: As a visitor, I read the terms, privacy notice and licence for this site.
Depends on: FND-3
Evidence: arch:static-page

### Acceptance criteria
| ID | Criterion | Check |
|---|---|---|
| INFO-3.AC1 | Given the legal index, when a visitor opens /legal, then links to terms, privacy notice and licence appear in that order. | tests/acceptance/info/legal-index.spec.ts |
| INFO-3.AC2 | Given a legal page, when it renders, then the last-updated date appears in the page header. | tests/acceptance/info/legal-pages.spec.ts |
| INFO-3.AC3 | Given the sitemap, when it is generated, then each legal page appears once with its canonical URL. | tests/acceptance/info/legal-sitemap.spec.ts |

### Tasks
| Task | Goal | Area | Depends on | Satisfies | Tests | Size | Notes |
|---|---|---|---|---|---|---|---|
| INFO-3.1 | Legal index and page routes | routes/legal | FND-3.2 | INFO-3.AC1 | tests/acceptance/info/legal-index.spec.ts | S | |
| INFO-3.2 | Legal page template with last-updated header | components/content | INFO-3.1 | INFO-3.AC2 | tests/acceptance/info/legal-pages.spec.ts | S | |
| INFO-3.3 | Legal pages in the sitemap and canonical set | server/seo | INFO-3.1, FND-6.2 | INFO-3.AC3 | tests/acceptance/info/legal-sitemap.spec.ts | S | |
