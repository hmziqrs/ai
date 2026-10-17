---
name: web-spec-audit
description: Audit consumer-facing websites against The Website Specification (specification.website) — offline per-category checklists for foundations, SEO, accessibility, security, well-known URIs, agent readiness, performance, privacy, resilience, and i18n, with a severity model, cross-category overlap map, and read-only verification commands. Load for any website audit or standards check; pair with the specification-website skill for live spec lookups.
---

## What this is

Offline audit checklists distilled from The Website Specification (specification.website, by Joost de Valk), which answers one question for consumer-facing sites: *what should a website have?* The spec's content is CC BY 4.0 and its code is MIT; these checklists carry that attribution, and the canonical spec pages live under `https://specification.website/spec/`.

The checklists are built from a grep-cited research corpus kept at `.zflow/evidence/specweb/`: 182 spec pages fetched into `<category>/` folders, distilled per category, and consolidated in `research-report.md`, which holds a verbatim source quote for every entry. All 807 quotes were re-verified by fixed-string grep against the exact local source file each entry cites, and the fetch run recorded zero fetch failures, zero uncovered pages, and zero unverified quotes for every category.

The live spec is the source of truth when reachable; these references are the offline fallback for planning and scoring. The audit bar comes from the corpus and the spec's statuses, never from personal taste.

Scope is the consumer-facing web: public marketing sites, content and publication sites, and self-service surfaces. Admin dashboards, internal tools, back-office consoles, authenticated line-of-business apps, and APIs as products are out of scope — do not audit them, and never half-apply consumer checks to them.

Many entries are conditional: feeds, accounts, passkeys, OIDC, multiple locales, mobile apps, or a published MCP server each gate their own block. When the condition is unmet, record the check as not-applicable with its unmet condition — never score it pass or fail.

The z-web-spec-auditor agent walks these checklists; its evidence rules, severity scale, output format, and safety language match this skill, so the two never diverge on what a finding means.

## The bar

The spec's status contract over 177 topics, counts re-verified by grep over the local `meta/checklist.md` mirror (36/87/48/6 = 177):

- **Required** — 36 items: "the platform breaks without it".
- **Recommended** — 87 items: "a modern site should do it".
- **Optional** — 48 items: context-dependent.
- **Avoid** — 6 items: "if a site does one of these, flag it".

Set the bar required-first and lead fixes with Required items; add Recommended for deeper audits; pull Optional entries only when the target site's context triggers their condition; check Avoid entries always — an Avoid item's *presence* is itself the finding.

Never silently upgrade a recommended item to required, in severity or wording. That contract comes from the site's own skill file and holds for every finding.

## Audit workflow

1. **Confirm the target.** It must be a consumer-facing public website; fix the canonical host (one HTTPS origin — AR-42) before sampling anything else.
2. **Plan.** When the specification-website MCP server is reachable (`https://mcp.specification.website/mcp` — stateless, no authentication, read-only tools), run its `audit_url` prompt for the per-URL plan and pull `get_checklist` filtered to `status:"required"` (add `recommended` for a deeper audit). Otherwise walk these references in category order.
3. **Sample.** Select and list in the report:
   - the homepage;
   - one page per major template;
   - one page per locale, on multilingual sites;
   - sitewide probes: robots.txt, sitemap, well-known URIs;
   - a real 404 URL;
   - one redirect chain;
   - DNS and TLS at the host level.
4. **Walk each category reference** (table below). Run each entry's verification command yourself and record one finding per failed check, carrying the entry ID.
5. **Respect conditions.** Record conditional blocks as not-applicable with their unmet conditions; never score them, never force a feature the site does not have.
6. **Deduplicate.** Audit each overlap-map row once, file a single finding, and cross-reference the other entry IDs.

## Severity model

One scale, three levels, carried unchanged from the corpus. For a consumer-facing site the levels mean:

- **high** — the platform breaks, a user group is excluded, or the site takes on security or legal exposure: the document-rendering floor is missing (doctype, charset, viewport, title); a WCAG Level A failure blocks users (contrast, labels, keyboard operability, focus visibility, captions); the transport or session layer is unsafe (no HTTPS/HSTS, weak cookie attributes, neutralised CSP); consent law is violated (tracking before opt-in, pre-ticked boxes, implied consent); search visibility is structurally broken (site-wide disallow, soft 404s, cloaking, fabricated reviews); or Core Web Vitals fail at the 75th percentile. Maps to Required items missing — and, inverted, to Avoid items present.
- **medium** — the site still works, but it loses reach, trust, speed, or compliance quality that a modern consumer site is expected to have: canonical and sitemap hygiene, security headers beyond the floor, caching and compression, agent-readiness surfaces, GPC handling, maintenance-page semantics, localised metadata. Maps to Recommended.
- **low** — context-dependent polish or emerging conventions, quality debt rather than breakage: favicons detail, feed paging, WebSub ping discipline, TDMRep/DNS-AID/ARD-class conventions, account-conditional well-knowns, optional manifest fields. Maps to Optional and to Recommended items that are pure build technique.

Two refinements: dead-weight Avoid items (an X-XSS-Protection header still being sent, HTTP/1.1-era workarounds like sprites and domain sharding) grade medium rather than high — waste plus mild stack fingerprinting, not active harm; and an auditor must never silently upgrade a recommended item to required (see The bar).

## Cross-category overlaps

Where spec pages in different categories describe the same checkable practice, audit the practice once, file one finding, cross-reference the other entry IDs, and never double-count. File the finding under the category whose reference you are walking:

| Practice (audit once) | Entries that cover it |
|---|---|
| HTTP→HTTPS 301 on every hostname | SEO-31, S11, S12 (AR-42 for the canonical-host framing) |
| Missing URLs return 404/410, never 200 or a homepage redirect | SEO-38, SEO-39, R01, R02, AR-45, AR-46, R27 |
| Permanent moves 301/308, chains flattened | SEO-30, SEO-32, AR-43, AR-44 |
| One trailing-slash form, same content both ways | SEO-27, AR-41, AR-48 |
| Main content server-rendered in the initial HTML | SEO-35, SEO-36, AR-1, R12, R13 |
| Valid BCP 47 `lang` on `<html>` | F-03, F-04, A59, A60, I18N-32 |
| Inline foreign-language content carries `lang` | A61, I18N-31 |
| Heading outline: one h1, no skips, real tags | SEO-44, SEO-45, SEO-46, A31 |
| Referrer-Policy strict-origin-when-cross-origin | S58, PRV-35 |
| SRI + crossorigin on third-party scripts | S66, S67, PRV-34, P-51 |
| CSP present and restrictive | S1–S9, PRV-33 |
| No blanket robots.txt Disallow | SEO-04, AR-23 |
| Sitemap published, valid, canonical-URLs-only | SEO-07–SEO-12, AR-58 |
| Manifest icons and theme colours | F-21, F-24, F-25, R20, R21 |
| Reduced motion respected across all motion | A62, A65, P-66, P-76 |
| RTL: `dir` on `<html>`, not body | F-05, I18N-43, I18N-44 |
| og:locale underscored form | F-37, I18N-12, I18N-18 |
| Viewport never disables zoom | F-10, A82 |
| Mixed content eliminated | S31, S32, S33 |

## Safety rules

Auditing is strictly read-only — GET/HEAD requests against the target, nothing that changes state:

- No form submissions, no authentication, no account creation, no comment posts, no consent commits (never record a consent choice), and no side-effect URLs — including `/logout`, since many servers process HEAD like GET.
- Interactive journeys (checkout, signup, password flows) are walked observe-and-abort: fill and advance the steps, but never execute the final submit.
- Anything verifiable only after a state change — the order confirmation, redundant entry across a finished flow, the sign-out response — is labelled unconfirmed, never run.
- Be polite: a read-only audit never forces a 5xx or floods for a 429 to observe error handling; record those only if they occur naturally, and say so.

If the public surface cannot be audited read-only, stop and escalate rather than widening scope, guessing a verdict, or weakening a check.

## Output format

Report findings, not narratives. Each finding carries:

- **entry ID + title** — the spec entry (for example `S28 — HSTS`) or a descriptive title for a compound finding, plus cross-referenced overlap entry IDs.
- **severity** — high, medium, or low per the severity model.
- **evidence** — the exact command plus its observed output (status codes, header lines, matched lines), `file:line` for a corpus or capture citation, or the spec page behind a status decision. No evidence, no finding.
- **observed defect and remediation** — what the site actually does versus what the entry requires, and the concrete change phrased against the entry's requirement text.
- **one status label** — **verified** (a command reproduced it this audit), **judged** (reasoning over fetched source, headers, or captures only — no direct measurement), or **unconfirmed** (could not check; say what blocked you).

Commands are evidence: quote them verbatim with the output observed, including the HTTP status and relevant header lines. Never report a check that was not run — a missing observation is reported as not run with the reason, never as a pass.

End with a roll-up: the audit bar used (required-only or required+recommended), the sampled URLs, counts by severity and status, checks not run with the reason, and conditional blocks recorded as not-applicable with their unmet conditions.

## Per-category references

Each reference lives at `references/<category>.md` relative to this skill's folder. Every entry carries its severity and the spec-page slug, so any finding can be looked up against the live spec.

| Reference | Scope | Entries |
|---|---|---|
| `references/foundations.md` | Document floor (doctype, lang, charset, viewport, title), metadata, icons, feeds | 67 |
| `references/seo.md` | Crawlability: robots.txt, sitemaps, URL structure, redirects, rendering, indexing, headings, structured data | 77 |
| `references/accessibility.md` | WCAG 2.2 AA: contrast, labels, keyboard, focus, landmarks, media, targets | 88 |
| `references/security.md` | TLS, HSTS, CSP, security headers, cookies, SRI, security.txt, DNS assurances | 98 |
| `references/well-known.md` | IANA-registered `/.well-known/` resources, mostly conditional on site features | 45 |
| `references/agent-readiness.md` | AI-crawler rules, llms.txt, markdown endpoints, Link headers, agent conventions | 107 |
| `references/performance.md` | Core Web Vitals, images, caching, compression, fonts, script loading, BFCache | 81 |
| `references/privacy.md` | Privacy policy, consent, GPC, third-party scripts, analytics, form minimisation | 51 |
| `references/resilience.md` | Error pages, no-JS fallback, service worker, manifest installability, status page, IPv6 | 34 |
| `references/i18n.md` | Locale URLs, hreflang, localisation, RTL, formatting, IDN | 61 |
| **Total** | 807 quote blocks corpus-wide | **807 blocks → 709 deduplicated entries** |

The corpus total of 807 quote blocks includes 98 meta-checklist restatements folded into the category status lines; the ten references carry the 709 deduplicated entries.

**Deep references:** `references/deep/<category>.md` holds the verbatim spec pages for each of the ten categories, and `references/deep/checklist.md` holds the site's own checklist. Load them when a check fails, when remediation needs the full rule text or cited standards, or when working offline. They are a 2026-10-17 snapshot — check deltas via the specification-website skill (`get_changes`) before a fresh audit.

## Pairing

- **specification-website skill** — live lookups against the source of truth: `search` and `get_topic` pull the primary-source page behind any entry, `audit_url` generates per-URL audit plans, and `get_changes` reports spec deltas.
- **MDN MCP** — how-it-works and Baseline context for the web-platform features entries reference (Popover API, container queries, speculation rules, and the like).

Installed skills to route to when a check needs more than a shell:

| Skill | Route to it for | Representative requirements |
|---|---|---|
| seo-audit | Full SEO-category pass: robots.txt, sitemaps, redirect chains, canonicals, indexing policy, headings, structured data, soft 404s | SEO-01–SEO-77 |
| programmatic-seo | At-scale, template-driven SEO: URL-structure policy, sitemap index + image/video extensions and caps, internal-linking graphs, IndexNow pipelines | SEO-09, SEO-14–SEO-23, SEO-24–SEO-29, SEO-50–SEO-57, SEO-73–SEO-77 |
| agent-browser | Browser-driven read-only auditing of the interactive surface: axe runs per template, keyboard walkthroughs, focus tracking, overlay and banner behaviour | A1–A88, PRV-11–PRV-23 |
| playwright-testing | Scripted, repeatable audit regression: RTL/LTR screenshot diffs, prerender and BFCache eligibility, consent-banner state machines (never commit a consent choice) | I18N-47, P-59–P-62, P-68–P-70, PRV-11–PRV-23 |
| web-gui-tester | Guided GUI flows on real journeys — multi-step checkout/signup (redundant entry), drag alternatives, cookie-banner interaction paths, walked observe-and-abort | A52–A57, A76–A78, PRV-15–PRV-19 |
| react-doctor | When the audited site is a React app and findings need code-level fixes: long-task/INP break-up, SSR/hydration of titles and content, dialog focus management, unload-listener removal | P-2, SEO-35, F-12, A18, P-68 |

Everything else is verifiable from a shell (`curl`, `dig`, `openssl`, `xmllint`, `jq`) or a free scanner (PageSpeed Insights, SSL Labs, Internet.nl, validator.schema.org, validator.w3.org/feed) and needs no skill.

## Staying current

The checklists mirror the corpus as of 2026-10-17; the status counts (36/87/48/6 over 177) and the 807 quote blocks were re-verified against it at that date. Record the corpus date in the report so the next audit knows which delta to pull.

Before a fresh audit, check the delta through the specification-website skill — `get_changes` or the changelog RSS — and re-score any entry whose status or text moved.

A status promotion (recommended → required, or optional → recommended) can flip a passing site to a failing one: an entry that passed last audit may now be a Required miss.
