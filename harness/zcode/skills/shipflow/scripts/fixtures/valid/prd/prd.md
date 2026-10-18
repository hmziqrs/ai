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
This project rebuilds the structure, layout and interactions of the benchmark site at https://bench.example, captured on 2026-10-18. The site ranks language models per category, shows model and benchmark detail pages, compares models side by side, and hosts a moderated forum for signed-in members. Parity covers structure, layout and interactions only; brand, copy and data are invented for this fixture. Every name, number and URL here is invented, and the domain bench.example is a reserved example domain.

## Users and journeys
| Journey | Steps | Features |
|---|---|---|
| J1 Find the best coding model | open leaderboard, switch to coding tab, open model detail | LB-1, LB-2, MDL-2 |
| J2 Compare two models | open compare page, pick two models, read the side-by-side table | CMP-1, CMP-2 |
| J3 Read and answer a thread | open forum, open a thread, post a reply | FRM-1, FRM-2, FRM-3 |
| J4 Create an account | open sign-in, sign up with email, land on settings | AUTH-1, AUTH-3 |
| J5 Import scores | sign in as admin, upload a CSV of scores, review the imported models | AUTH-4, MDL-4 |

## Scope
In scope for v1: overall and category leaderboards with sort, filter and search; model directory, model detail and benchmark pages; side-by-side comparison with shareable URL state; accounts with member and admin roles; a moderated forum; static about, FAQ and legal pages; admin import of scores.

Out of scope for v1: live benchmark runs, provider API keys, paid tiers.

Later: email notifications and a public read API.

## NFR budgets
- Performance: LCP under 2.5 s on the mid-range phone profile, CLS under 0.1 and INP under 200 ms on the leaderboard and compare pages.
- Accessibility: zero serious axe violations and WCAG 2.2 AA on every page in the browser matrix.
- SEO basics: unique title and description per page, canonical URLs, a sitemap, and JSON-LD on entity pages.
- Security baseline: CSRF protection on every form, session cookies with HttpOnly and SameSite=Lax, and a role check on every admin route.
- Browser and viewport matrix: the two most recent releases of three invented browsers (Browser Alpha, Browser Beta, Browser Gamma) at 1440, 768 and 390 px.

## Architecture
The stack, hosting target and data store are recorded in ADR-001. The app is a statically typed web app with server-rendered routes, a relational data store behind a migration tool, and session-based auth with an OAuth adapter that has a development mock. The design system is described in design-system.md and the entity model in data-model.md. Assumptions the team filled in are listed in assumptions.md.

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
| FND | Foundations | M0 | | arch:home, arch:not-found | Scaffold, CI, design system, shell, data layer, harnesses, SEO |
| LB | Leaderboards | M1 | FND | arch:leaderboard, arch:category-leaderboard, journey:sort-by-score, journey:switch-category | Ranked model tables |
| MDL | Models and benchmarks | M1 | FND | arch:model-directory, arch:model-detail, arch:benchmark-detail, arch:admin-models, journey:open-model-detail, journey:admin-import-scores | Model directory, detail and benchmark pages, admin score entry |
| INFO | Static pages | M1 | FND | arch:static-page | About, FAQ and legal pages |
| AUTH | Accounts | M2 | FND | arch:sign-in, arch:account-settings, journey:sign-up | Sign-up, sessions, profile and roles |
| CMP | Compare | M2 | LB, MDL | arch:compare, journey:compare-two-models | Side-by-side model comparison |
| FRM | Forum | M2 | AUTH | arch:forum-index, arch:forum-thread, journey:read-thread, journey:post-reply | Threads, replies, votes and moderation |

## Glossary
- **Model**: a language model entry with an organisation, a licence and scores.
- **Benchmark**: a named evaluation with a published scoring scale.
- **Category**: a grouping of benchmarks, for example text, coding, vision or math.
- **Thread**: a forum discussion inside one category.
- **Confidence interval (CI)**: the 95% interval around a benchmark score.

## Done definition
The project is done when every non-dropped feature in M0 to M3 has its acceptance criteria passing, every task issue is closed, the parity and accessibility checks in NFR budgets pass on the browser matrix, and the audit reports no open gap against the reference.
