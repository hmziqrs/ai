# The Website Specification (specification.website) — Consolidated Research Report

This report merges the eleven distilled sections produced by this run (`.zflow/evidence/specweb/distilled/*.md`) into one audit reference for consumer-facing websites — public marketing, content, and self-service surfaces. The evidence corpus is 182 pages fetched from specification.website into `.zflow/evidence/specweb/<category>/` (foundations 20, seo 14, accessibility 30, security 23, well-known 13, agent-readiness 22, performance 26, privacy 7, resilience 9, i18n 13, meta 5). The run's command-decided category status records zero fetch failures, zero uncovered pages, and zero unverified quotes for every category, so **no requirement below is marked `[citation unconfirmed]`**. As an independent check, every one of the 807 quotes carried by the distilled sections was re-verified for this report by fixed-string grep against the exact local source file its block cites — 807/807 matched (method and counts in §6).

## 1. Executive summary

specification.website — "The Website Specification", by Joost de Valk (code MIT, content CC-BY-4.0) — answers one question for consumer-facing sites: *what should a website have?* It publishes 177 spec pages organised into ten categories (Foundations, SEO, Accessibility, Security, Well-Known URIs, Agent Readiness, Performance, Privacy, Resilience, Internationalisation), each page one checkable practice tagged with a status: **Required** ("the platform breaks without it" — 36 items), **Recommended** ("a modern site should do it" — 87), **Optional** (context-dependent — 48), or **Avoid** ("if a site does one of these, flag it" — 6). Status counts re-verified for this report by grep over the local `meta/checklist.md` mirror: 36/87/48/6 = 177. The site's own skill file warns auditors never to silently upgrade a recommended item to required.

What it demands of a consumer-facing site, by category:

- **Foundations** — every HTML document opens with the doctype, declares a valid BCP 47 `lang`, UTF-8 charset within 1024 bytes, a viewport that never disables zoom, exactly one non-empty `<title>`, a self-referencing canonical, a unique meta description, full OG/Twitter card metadata that survives real unfurlers (WhatsApp's 300 KB image cap, Slackbot's 32 KB head window), the complete icon set, colour-scheme declaration, and — where feeds exist — discoverable, valid, self-identifying feeds with WebSub push.
- **SEO** — the crawlability contract: RFC 9309 robots.txt with a Sitemap directive and no blanket disallow or blocked CSS/JS; XML sitemaps (plus index, image, and video extensions) listing only live canonical URLs; lowercase, hyphenated, shallow URLs with enforced trailing-slash and case canonicalisation; 301/308 permanence with ≤3-hop chains; primary content and metadata server-rendered with real `<a href>` links; hard 404/410 for missing pages; explicit per-page indexing policy; one `<h1>` outlines; descriptive internal linking without orphans; JSON-LD that mirrors visible content (never fabricated ratings); breadcrumbs mirrored in BreadcrumbList; IndexNow change pings.
- **Accessibility** — WCAG 2.2 AA as the bar: 4.5:1/3:1 contrast (text and non-text), alt text on every image, programmatically associated labels, full keyboard operability without traps, visible ≥3:1 focus indicators never obscured by sticky chrome, skip links, one `<main>` with named landmarks, ARIA only where native elements cannot serve, descriptive link text, named icon buttons, text errors tied to inputs and announced, live-region status messages, paste-allowed authentication with password-manager support, reduced-motion respect, synchronised captions and transcripts, real table markup, 24×24 CSS px targets, single-pointer alternatives to dragging, and 16px mobile inputs with correct types.
- **Security** — HTTPS with TLS 1.2/1.3 only (ECDHE, EMS, modern hardening), 301 HTTP→HTTPS on every hostname, complete chains, HSTS max-age=63072000 with includeSubDomains (preload discouraged), zero mixed content, an enforcing CSP with nonce + strict-dynamic and no standalone unsafe-inline, nosniff, frame-ancestors, COOP/CORP, Referrer- and Permissions-Policy, SRI on every third-party script, Secure/HttpOnly/SameSite cookies with `__Host-` session names, security.txt, and DNS-side assurances (CAA, RPKI, DNSSEC, DANE).
- **Well-Known URIs** — site metadata served at the exact IANA-registered `/.well-known/` paths over HTTPS without auth walls: change-password redirects for account sites, webauthn origins for multi-origin passkeys, OIDC/OAuth discovery documents with exact-match issuers, truthful gpc.json, an RFC 9727 api-catalog Linkset, webfinger, Apple/Android app association files, nodeinfo pointers, and traffic-advice with its exact media type.
- **Agent Readiness** — main content and JSON-LD in the initial HTML, llms.txt advertised with rel="describedby", markdown source endpoints with content negotiation, explicit per-agent AI crawler rules in robots.txt, Content Signals and TDMRep consistency, stable implementation-free URLs with permanent redirects and 410s for deletions, full-content feeds, IANA-registered Link headers on HTML and non-HTML alike, and the emerging conventions (MCP server cards, A2A agent cards, Agent Skills discovery, DNS-AID, ARD, NLWeb, WebMCP, OKF, Schemamap) as low-severity opt-ins.
- **Performance** — Core Web Vitals at the 75th percentile of real users (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1); AVIF/WebP images with srcset, explicit dimensions, lazy below the fold but never the LCP; preconnect/preload hints kept to ~5; immutable fingerprinted caching vs short-lived HTML with stale-if-error; ETag/304 revalidation; brotli/gzip on all text; self-hosted subset WOFF2 with font-display; ~14KB inline critical CSS; defer/async/module script loading with SRI; HTTP/2+ with Alt-Svc; BFCache eligibility (no unload listeners, no no-store HTML); moderate speculation rules that never touch side-effect URLs.
- **Privacy** — a privacy policy naming controller, data categories, purposes, GDPR lawful bases, recipients and transfer safeguards, retention, and rights; prior opt-in consent for all non-essential storage (equal-prominence one-click reject, no pre-ticks, no implied consent, stored consent records); Global Privacy Control honoured for every sender; audited, self-hosted, consent-gated third-party scripts; cookieless aggregate analytics; and minimal form collection.
- **Resilience** — 404s that are real 404s with navigation and a way forward (localised per locale), 503 + Retry-After maintenance pages with no external dependencies, 429 throttling, core content working without JavaScript, versioned service-worker offline fallbacks with a kill switch, installable manifests, status pages on separate infrastructure, Deprecation/Sunset signalling, Redirect-By attribution, and dual-stack IPv6 that serves the identical site.
- **Internationalisation** — one locale URL pattern sitewide, reciprocal self-referential BCP 47 hreflang clusters with x-default, fully localised head and structured data (including alt text and per-locale OG images), a hard ban on IP/Accept-Language redirects, endonym-labelled flag-free language switchers linked to equivalent pages, `dir="rtl"` on the root with logical CSS properties and mirrored directional icons, script-aware CJK line breaking, locale-formatted server-rendered values with timezones, CLDR plural rules, and paired IDN/A-label domains.

The site's own audit model is status-first: pull the checklist filtered to `status: "required"` and verify each item, adding `recommended` for deeper audits; the `audit_url` MCP prompt generates per-URL plans. Every requirement in §2 pairs a verbatim quote from the spec page with a read-only verification method — curl, dig, openssl, axe/Lighthouse, SSL Labs/Internet.nl, DevTools emulation, or crawl exports — so an auditor without site access can score each one.

## 2. Spec-category requirements (deduplicated across categories)

Deduplication policy applied to the eleven distilled sections:

1. The **meta** section's 98 items restate the category requirements quoting `meta/checklist.md` instead of the spec pages themselves. They are folded into each category's "Checklist status" line below (Required/Avoid pages named first) and are **not** repeated as separate requirements — this removes the only literal duplication across the distilled sections. Their 98 quotes were still grep-verified against `meta/checklist.md` (§6).
2. Where two different spec pages in different categories describe the **same checkable practice**, both entries are retained — each carries its own page quote, source path, and verification nuance — and they are cross-linked in the overlap map below so an auditor audits each practice **once** and never double-counts findings.
3. One severity scale is used throughout (§3). Each entry keeps exactly the severity its category distillation assigned; nothing was upgraded or downgraded in synthesis, and no entry carries `[citation unconfirmed]` because the run's command-decided status lists zero unverified quotes for every category.

Cross-category overlap map (audit each row once):

| Practice | Entries that cover it |
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

### 2.1 Foundations — 67 requirements

Document correctness every page needs before anything else: doctype, language, encoding, viewport, title/description/canonical, favicons, colour scheme, Open Graph, feeds, and the CSS/Popover build-technique pages.

Checklist status (`meta/checklist.md`): **Required** — Doctype, html lang, meta charset, meta viewport, title · **Recommended** — meta description, canonical URL, favicons and app icons, meta color-scheme, Open Graph.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### F-01 — Doctype as the first bytes of every page
Severity: high · Source: `.zflow/evidence/specweb/foundations/doctype.md`
Quote: > Every HTML document must start with <!doctype html> as its first line. This opts the browser into standards mode; without it, you get quirks mode and broken layout.
Verify: `curl -s https://example.com/ | head -c 20` — output must begin with `<!doctype html>` (case-insensitive); in DevTools, `document.compatMode` must return `"CSS1Compat"`, not `"BackCompat"`.

#### F-02 — Doctype on error pages and secondary surfaces
Severity: medium · Source: `.zflow/evidence/specweb/foundations/doctype.md`
Quote: - Sending the doctype only on some pages — error pages, print views, and embedded iframes need it too.
Verify: `curl -s https://example.com/nonexistent-page-test | head -c 20` still starts with `<!doctype html>`.

#### F-03 — Valid BCP 47 lang on `<html>`
Severity: high · Source: `.zflow/evidence/specweb/foundations/html-lang.md`
Quote: > Set a valid BCP 47 language tag on the <html> element so screen readers, translators, search engines, and browsers know what language the page is in.
Verify: `curl -s https://example.com/ | grep -oiE '<html[^>]*lang="[^"]+"'` returns a well-formed BCP 47 tag; run an axe or Lighthouse accessibility audit, which flags missing or invalid `lang`.

#### F-04 — lang matches the actual content language
Severity: medium · Source: `.zflow/evidence/specweb/foundations/html-lang.md`
Quote: - View source: confirm `<html lang="...">` is present and matches the actual content language.
Verify: Fetch each locale's HTML (`curl -s https://example.com/fr/ | grep -oi 'lang="[^"]*"' | head -1`) and confirm the tag matches the visible content language of that page.

#### F-05 — RTL pages pair lang with dir
Severity: medium · Source: `.zflow/evidence/specweb/foundations/html-lang.md`
Quote: For right-to-left scripts (Arabic, Hebrew), pair `lang` with `dir`:
Verify: On pages whose `lang` is an RTL language (ar, he, fa, ur), `curl -s <url> | grep -oE '<html[^>]*>'` shows `dir="rtl"`.

#### F-06 — UTF-8 declared within the first 1024 bytes
Severity: high · Source: `.zflow/evidence/specweb/foundations/meta-charset.md`
Quote: > Declare UTF-8 as the document character encoding in the first 1024 bytes of the HTML, so browsers parse text correctly before they hit any non-ASCII content.
Verify: `curl -s https://example.com/ | head -c 1024 | grep -i '<meta charset'` finds the declaration; DevTools `document.characterSet` returns `"UTF-8"`.

#### F-07 — Charset first in head, before title
Severity: medium · Source: `.zflow/evidence/specweb/foundations/meta-charset.md`
Quote: Put the charset declaration as the very first child of `<head>`, before `<title>` or any other tag that could contain non-ASCII text:
Verify: `curl -s https://example.com/ | grep -oE '<meta charset[^>]*>|<title' | head -2` lists the meta charset before the title.

#### F-08 — Content-Type header agrees on UTF-8
Severity: medium · Source: `.zflow/evidence/specweb/foundations/meta-charset.md`
Quote: Also set the HTTP `Content-Type` header on the response. The header takes precedence over the meta tag, so if they conflict, the header wins:
Verify: `curl -sI https://example.com/ | grep -i '^content-type:'` shows `charset=utf-8`.

#### F-09 — Viewport tag on every page
Severity: high · Source: `.zflow/evidence/specweb/foundations/meta-viewport.md`
Quote: <meta name="viewport" content="width=device-width, initial-scale=1" />
Verify: `curl -s https://example.com/ | grep -i 'name="viewport"'` returns the tag containing `width=device-width, initial-scale=1`; Lighthouse flags a missing viewport tag.

#### F-10 — Never disable pinch-zoom
Severity: high · Source: `.zflow/evidence/specweb/foundations/meta-viewport.md`
Quote: `user-scalable=no` and `maximum-scale=1` prevent users from pinch-zooming. For anyone with low vision who needs to magnify text — and that is a significant fraction of users — this turns a usable page into an unusable one. It also fails WCAG 1.4.4. There is no good reason to disable zoom on a content site.
Verify: `curl -s https://example.com/ | grep -iE 'user-scalable *= *no|maximum-scale'` returns nothing; pinch-to-zoom works on a real phone; Lighthouse flags zoom-disabling viewports.

#### F-11 — Exactly one non-empty title in head
Severity: high · Source: `.zflow/evidence/specweb/foundations/title.md`
Quote: > Every HTML document must have exactly one non-empty <title> element inside <head>. It names the page for browsers, search engines, screen readers, social previews, and AI agents. It is not the same thing as the page's <h1>.
Verify: `curl -s https://example.com/ | grep -ic '<title'` equals 1 and the element contains non-whitespace text inside `<head>`.

#### F-12 — Title rendered server-side, not via JS
Severity: medium · Source: `.zflow/evidence/specweb/foundations/title.md`
Quote: - Titles set in JavaScript after first paint — search crawlers and social scrapers may not run JS.
Verify: `curl -s https://example.com/ | grep -i '<title'` shows the full title in the raw response with no JS executed.

#### F-13 — Titles unique per page, page-specific part first
Severity: medium · Source: `.zflow/evidence/specweb/foundations/title.md`
Quote: - **One per page, unique per page.** Two pages with the same title is a quality signal that they are duplicates.
Verify: Crawl a sample of pages and compare `<title>` values — any duplicate is a failure; spot-check that the unique part precedes the site name.

#### F-14 — One non-empty description, 120–160 characters
Severity: medium · Source: `.zflow/evidence/specweb/foundations/meta-description.md`
Quote: - **120–160 characters** is the sweet spot. Google typically truncates around 920 pixels on desktop, roughly 155–160 characters.
Verify: `curl -s https://example.com/ | grep -i 'name="description"'` returns a non-empty description; measure its content length (roughly 120–160 chars).

#### F-15 — Descriptions unique per page
Severity: low · Source: `.zflow/evidence/specweb/foundations/meta-description.md`
Quote: - **One per page.** Two pages with the same description is a duplicate-content signal.
Verify: Crawl a sample of pages, hash each description content, and flag any duplicates.

#### F-16 — Self-referencing canonical on every public page
Severity: medium · Source: `.zflow/evidence/specweb/foundations/canonical-url.md`
Quote: Put a **self-referencing canonical** on every public HTML page. Even pages without duplicates benefit: it removes ambiguity for query-string variants and short-circuits any scraper that copies the page.
Verify: `curl -s https://example.com/page | grep -i 'rel="canonical"'` returns exactly one tag whose href equals the page's clean URL, present in the raw HTML without JS.

#### F-17 — Canonical is absolute and scheme-matched
Severity: medium · Source: `.zflow/evidence/specweb/foundations/canonical-url.md`
Quote: - **Use absolute URLs.** Include the scheme (`https://`) and host. Relative canonicals are allowed by the spec but more error-prone; absolute is the safer default.
Verify: Extract the canonical href and confirm it starts with `https://` and its host matches the host actually serving the page.

#### F-18 — Tracking parameters stripped from canonical
Severity: medium · Source: `.zflow/evidence/specweb/foundations/canonical-url.md`
Quote: - **Strip tracking parameters** from the canonical. The canonical of `/page?utm_source=newsletter` is `/page`.
Verify: `curl -s 'https://example.com/page?utm_source=test' | grep -i 'rel="canonical"'` points at the parameter-free URL.

#### F-19 — Pagination canonicalises to itself
Severity: medium · Source: `.zflow/evidence/specweb/foundations/canonical-url.md`
Quote: - Canonicalising paginated archives (`?page=2`) to page 1. Each pagination page is distinct content; let them index normally.
Verify: `curl -s 'https://example.com/blog?page=2' | grep -i 'rel="canonical"'` keeps `?page=2` in the href.

#### F-20 — Canonical target returns 200 directly
Severity: medium · Source: `.zflow/evidence/specweb/foundations/canonical-url.md`
Quote: - Crawl the site and list canonical targets. Every target should return 200 OK, not a redirect.
Verify: `curl -sI <canonical-href>` (without `-L`) returns `HTTP/... 200`.

#### F-21 — Full icon set wired in head
Severity: medium · Source: `.zflow/evidence/specweb/foundations/favicons.md`
Quote: > Ship an SVG favicon, an ICO fallback at /favicon.ico, an apple-touch-icon, and a maskable PWA icon. Five files cover every browser and home-screen surface.
Verify: `curl -s https://example.com/ | grep -iE 'rel="icon"|apple-touch-icon|rel="manifest"'` shows the link tags, and each referenced URL returns 200.

#### F-22 — /favicon.ico returns 200 at the root
Severity: medium · Source: `.zflow/evidence/specweb/foundations/favicons.md`
Quote: Even with explicit `<link rel="icon">` tags, browsers and crawlers still request `/favicon.ico` from the site root. Always serve a real ICO at that path. A 404 there shows up in every server log forever.
Verify: `curl -sI https://example.com/favicon.ico` returns 200.

#### F-23 — apple-touch-icon is a 180×180 PNG
Severity: low · Source: `.zflow/evidence/specweb/foundations/favicons.md`
Quote: 3. **`/apple-touch-icon.png`** — 180×180 PNG used by iOS when the user adds the site to their home screen. iOS does not honour the SVG favicon for home screens.
Verify: Download the file referenced by `rel="apple-touch-icon"` and check with `file` or `sips -g pixelWidth -g pixelHeight` that it is a 180×180 PNG.

#### F-24 — Maskable manifest icon declared
Severity: low · Source: `.zflow/evidence/specweb/foundations/favicons.md`
Quote: { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
Verify: `curl -s https://example.com/site.webmanifest | grep -i maskable` shows a maskable icon entry with sizes 512x512.

#### F-25 — Light and dark theme-color via media
Severity: low · Source: `.zflow/evidence/specweb/foundations/theme-color.md`
Quote: > Tints the browser chrome and OS surfaces to match your brand. Use the media attribute to ship one colour for light mode and another for dark mode.
Verify: `curl -s https://example.com/ | grep -i 'name="theme-color"'` returns tags with `media="(prefers-color-scheme: light)"` and `media="(prefers-color-scheme: dark)"`.

#### F-26 — theme-color is opaque
Severity: low · Source: `.zflow/evidence/specweb/foundations/theme-color.md`
Quote: - Putting hex values with alpha (`#0b1020aa`). Browsers ignore the alpha channel; use an opaque colour.
Verify: Inspect each theme-color content value — none is an 8-digit hex (#RRGGBBAA).

#### F-27 — color-scheme in both meta and CSS
Severity: low · Source: `.zflow/evidence/specweb/foundations/color-scheme.md`
Quote: Ship both. The meta tag takes effect before any stylesheet parses, so it prevents the white flash dark-mode users would otherwise see during page load. The CSS property is the authoritative source once styles arrive, and lets you scope schemes to subtrees if you ever need to.
Verify: `curl -s https://example.com/ | grep -i 'name="color-scheme"'` returns the meta tag, and the stylesheet contains a `color-scheme` declaration on `:root`; DevTools `getComputedStyle(document.documentElement).colorScheme` returns the set value.

#### F-28 — Never use "only dark"
Severity: low · Source: `.zflow/evidence/specweb/foundations/color-scheme.md`
Quote: The valid values for the `content` attribute are `normal`, `light`, `dark`, `light dark`, `dark light`, and `only light`. List the preferred scheme first; the others are acceptable fallbacks. `only dark` is explicitly not allowed by the HTML spec — there is no way to forbid light mode, because forcing a page into dark mode the page wasn't built for produces unreadable contrast.
Verify: `curl -s https://example.com/ | grep -i 'only dark'` returns nothing.

#### F-29 — Core OG tags with property= syntax
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: > Open Graph tags control how pages look when shared on social platforms and chat apps. Set og:title, og:description, og:image, og:url, and og:type on every page.
Verify: `curl -s https://example.com/ | grep -i 'property="og:'` returns all five core tags; `curl -s https://example.com/ | grep -i 'name="og:'` returns none.

#### F-30 — og:image on a stable, controlled HTTPS URL
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - **Host it on a stable, branded URL you control.** Serve `og:image` from your own domain (or a branded asset subdomain), not a third-party image host or a signed CDN URL that expires. Platforms cache the card and re-fetch the image later, so the URL has to stay put and stay public: the crawler fetches with no cookies, so a login wall, hotlink/referer protection, or bot blocking makes the image silently disappear from the preview.
Verify: `curl -sI <og:image-url>` returns HTTPS 200 directly (not a redirect to a login page), and the image host matches the site's own domain.

#### F-31 — og:image under 300 KB
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - File size under 5 MB across most platforms, but **WhatsApp drops the preview entirely if the image is over 300 KB** — and WhatsApp is one of the most-used unfurlers on the planet. Treat 300 KB as the real ceiling.
Verify: `curl -sI <og:image-url> | grep -i content-length` shows ≤ 300000 bytes (or `curl -s <og:image-url> | wc -c`).

#### F-32 — og:image is PNG/JPEG/WebP, never AVIF
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - **Format: PNG or JPEG is the safe universal choice.** WebP is now accepted by virtually every modern unfurler (Facebook, LinkedIn, Discord, iMessage, Slack, Mastodon, Bluesky, X, WhatsApp) and is a good pick when you need to stay under WhatsApp's 300 KB cap on a denser image. AVIF is *not* yet safe — only Facebook, Threads, Pinterest, and WhatsApp render AVIF previews today; the rest will silently drop them. If your CMS auto-converts uploads to AVIF, force the `og:image` URL to stay PNG/JPEG/WebP.
Verify: `curl -sI <og:image-url> | grep -i '^content-type:'` is `image/png`, `image/jpeg`, or `image/webp` — not `image/avif`.

#### F-33 — og:image dimensions declared and correct
Severity: low · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - Declare `og:image:width` and `og:image:height`. Some platforms refuse to use images they cannot pre-size.
Verify: Compare the declared dimensions with the actual file (`sips -g pixelWidth -g pixelHeight` after download); confirm the image is 1200 px wide at a 1.91:1 or 16:9 ratio.

#### F-34 — twitter:card summary_large_image
Severity: low · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: If you skip the Twitter Card tags, X will fall back to your OG tags, which is fine. The one extra value worth adding is `twitter:card` set to `summary_large_image` so the preview shows the full-width image instead of a small thumbnail.
Verify: `curl -s https://example.com/ | grep -i 'twitter:card'` returns `summary_large_image`.

#### F-35 — og:url matches canonical
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - `og:url` that does not match the canonical URL. The two should agree.
Verify: Extract `og:url` and the `link[rel=canonical]` href from the same page response and compare — they must be equal.

#### F-36 — OG tags within the first 32 KB
Severity: medium · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: - Burying OG tags below 32 KB of inline CSS or scripts in the `<head>`. Slackbot only fetches the first 32 KB with a `Range` request; meta tags past that cut-off are never seen and the link silently fails to unfurl. Put OG tags near the top of `<head>`, above any large inline blocks.
Verify: `curl -s -r 0-32767 https://example.com/ | grep -c 'property="og:'` equals the count from a full page fetch.

#### F-37 — og:locale on multilingual pages
Severity: low · Source: `.zflow/evidence/specweb/foundations/open-graph.md`
Quote: **Locale tags for multilingual sites.** If your page has translated versions, declare them with `og:locale` (this page) and `og:locale:alternate` (every other locale). Use the underscored `language_TERRITORY` form, not the BCP 47 hyphenated form used by `lang` and `hreflang`:
Verify: On pages with translated versions, `curl -s <url> | grep -i 'og:locale'` returns underscored values (e.g. `en_GB`), one per locale.

#### F-38 — Feed announced with rel="alternate"
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-discovery.md`
Quote: > If your site publishes a feed — RSS, Atom, or JSON Feed — announce it in <head> with <link rel="alternate">. Feed readers, agents, and browsers discover it without guessing the URL.
Verify: `curl -s https://example.com/ | grep -i 'rel="alternate"'` returns each declared feed with a title attribute.

#### F-39 — Correct feed MIME type
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-discovery.md`
Quote: - Using `type="text/xml"` or `application/xml` for an RSS feed. Some readers ignore it.
Verify: Inspect the `type` attribute of each feed alternate link; it must match the format actually served at the href.

#### F-40 — Feed URL reachable and valid
Severity: medium · Source: `.zflow/evidence/specweb/foundations/feed-discovery.md`
Quote: - Linking to a feed that 404s, redirects, or fails validation. Run `https://validator.w3.org/feed/` on every feed URL before shipping.
Verify: `curl -sI <feed-url>` returns 200 directly; paste the URL into https://validator.w3.org/feed/ and expect a clean pass.

#### F-41 — atom:link rel="self" self-identification
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-hygiene.md`
Quote: - **`atom:link rel="self"`** must point at the canonical URL of the feed itself. Both feed validators flag its absence as a warning.
Verify: `curl -s https://example.com/feed.xml | grep -i 'rel="self"'` returns a self-link whose href equals the feed URL fetched.

#### F-42 — Stable per-item GUID
Severity: medium · Source: `.zflow/evidence/specweb/foundations/feed-hygiene.md`
Quote: - **`<guid isPermaLink="true">`** is the simplest correct form when the URL never changes. If the URL is unstable, use `isPermaLink="false"` with a tag URI: `<guid isPermaLink="false">tag:example.com,2026:post/123</guid>`. Once chosen, **the GUID for an item must never change** — that is the identifier readers key off.
Verify: Fetch the feed twice around a deploy and diff `<guid>` values per item — none may change for the same post.

#### F-43 — Declared update cadence
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-hygiene.md`
Quote: - **`sy:updatePeriod`** accepts `hourly`, `daily`, `weekly`, `monthly`, `yearly`. `sy:updateFrequency` is a positive integer (count per period). A site updating twice a day declares `<sy:updatePeriod>daily</sy:updatePeriod><sy:updateFrequency>2</sy:updateFrequency>`.
Verify: `curl -s <feed-url> | grep -i 'sy:update'` returns valid values consistent with the site's real publishing rhythm.

#### F-44 — Consistent feed dates
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-hygiene.md`
Quote: - Mismatched dates — `pubDate` newer than `lastBuildDate`, or per-item timestamps in the future. Some aggregators silently drop the item.
Verify: Parse the feed and compare dates: every pubDate ≤ lastBuildDate and ≤ current time.

#### F-45 — RFC 5005 paging on archive feeds
Severity: low · Source: `.zflow/evidence/specweb/foundations/feed-hygiene.md`
Quote: - **Paging headers (RFC 5005)** keep archive feeds usable. Without `rel="next"`/`rel="prev"`, anything past the first page is invisible to readers that follow links.
Verify: `curl -s <feed-url> | grep -i 'rel="next"'` returns the next-page link on paged archive feeds.

#### F-46 — Native popover for non-blocking overlays
Severity: low · Source: `.zflow/evidence/specweb/foundations/popover-api.md`
Quote: > Replace ARIA-puzzled JavaScript modals, menus, and tooltips with a native top-layer primitive that the browser opens, closes, and accessibility-wires for you.
Verify: Inspect the DOM for `popover`/`popovertarget` usage; pressing Escape closes an auto popover, clicking outside dismisses it, and focus returns to the trigger.

#### F-47 — Manual popovers have a dismiss control
Severity: medium · Source: `.zflow/evidence/specweb/foundations/popover-api.md`
Quote: - **`popover="manual"` without a dismiss control.** The user has no way out. Auto is the default for a reason.
Verify: For every `[popover="manual"]` element in the DOM, confirm a close control exists (e.g. a button with `popovertargetaction="hide"`).

#### F-48 — Popover triggers are real buttons
Severity: medium · Source: `.zflow/evidence/specweb/foundations/popover-api.md`
Quote: - **Not testing focus return.** When a popover closes, focus must return to the trigger. The browser does this for you — but only if your trigger is a real `<button>`, not a `<div>` with an onClick.
Verify: DOM query `[popovertarget]` — every match is a `<button>`; close a popover and observe focus lands back on the trigger.

#### F-49 — No duplicate ARIA on popovers
Severity: low · Source: `.zflow/evidence/specweb/foundations/popover-api.md`
Quote: - **Duplicating ARIA.** Don't add `role="dialog"` or `aria-modal` to a popover. The accessibility tree already reflects the right semantics.
Verify: DOM query `[popover][role="dialog"], [popover][aria-modal]` returns nothing.

#### F-50 — Blocking flows use dialog, not popover
Severity: low · Source: `.zflow/evidence/specweb/foundations/popover-api.md`
Quote: - **Reaching for `popover` when you mean `<dialog>`.** Confirmations, sign-in flows, and anything that must block the rest of the page belong in `<dialog showModal()>`. Popovers are non-blocking.
Verify: Open a confirmation or sign-in flow and confirm in DevTools that it is a `<dialog>` element, not a popover.

#### F-51 — Advertise hub and self on feeds
Severity: low · Source: `.zflow/evidence/specweb/foundations/websub.md`
Quote: > If you publish a feed, advertise a WebSub hub with rel="hub" and rel="self" so subscribers are pushed each update instead of polling for it. Cuts latency to seconds and removes most of the crawl traffic your feed attracts.
Verify: `curl -sI https://example.com/feed.xml | grep -i '^link:'` shows both `rel="hub"` and `rel="self"`.

#### F-52 — rel="self" is the canonical, redirect-free topic URL
Severity: low · Source: `.zflow/evidence/specweb/foundations/websub.md`
Quote: `rel="self"` must be the topic's canonical URL — the one you would give in a [`rel="canonical"`](/spec/foundations/canonical-url/) — because that is the identity subscribers key their subscription on. If it disagrees with the URL you actually serve the feed at, subscriptions land on the wrong topic. In HTML, put the link elements in `<head>`; the spec is explicit that `<body>` is unsafe, because injected markup could redirect subscriptions to an attacker's hub.
Verify: Fetch the `rel="self"` URL directly with `curl -sI` — it returns 200, not a redirect; in HTML pages the link elements sit inside `<head>`.

#### F-53 — Hub actually pinged on publish
Severity: low · Source: `.zflow/evidence/specweb/foundations/websub.md`
Quote: **2. Notify the hub when you publish.** This is the step people forget. The hub has no way to know your feed changed unless you tell it, so your publish flow must ping the hub on every update. A hub that is never pinged delivers nothing.
Verify: Subscribe a test callback to the topic and publish a post — the callback must receive the `hub.challenge` verification GET and then a content POST on the next publish.

#### F-54 — Static fallback behind @supports
Severity: low · Source: `.zflow/evidence/specweb/foundations/anchor-positioning.md`
Quote: - **Making it the only mechanism.** Until anchor positioning is universally available, keep a usable static fallback for browsers without support rather than leaving the overlay unpositioned.
Verify: View the shipped stylesheet for `@supports (anchor-name: ...)` gating; in a browser without support, the overlay is still reachable and usable in its static position.

#### F-55 — position-try-fallbacks declared
Severity: low · Source: `.zflow/evidence/specweb/foundations/anchor-positioning.md`
Quote: - **No fallbacks.** An anchored element with a single fixed side will overflow the viewport near screen edges. Provide `position-try-fallbacks`.
Verify: Inspect the CSS of anchored elements for `position-try-fallbacks`; scroll the trigger near a viewport edge and confirm the overlay flips rather than clipping.

#### F-56 — Anchored elements are positioned
Severity: low · Source: `.zflow/evidence/specweb/foundations/anchor-positioning.md`
Quote: - **Forgetting to position the element.** `position-anchor` and `anchor()` only apply to an element with `position: absolute` or `fixed`. Without it, nothing moves.
Verify: Check computed styles of anchored elements — `position-anchor` is always paired with `position: absolute` or `fixed`.

#### F-57 — balance on headings, pretty on prose
Severity: low · Source: `.zflow/evidence/specweb/foundations/text-wrap.md`
Quote: > Let the browser break headings and body copy intelligently with text-wrap: balance and pretty — no orphaned words, no manual line breaks, no layout shift.
Verify: In DevTools run `getComputedStyle(document.querySelector('h1')).textWrap` (expect `balance`) and on a body paragraph (expect `pretty`); or grep the shipped CSS for `text-wrap`.

#### F-58 — pretty scoped to prose, not universal
Severity: low · Source: `.zflow/evidence/specweb/foundations/text-wrap.md`
Quote: Unlike `balance`, `pretty` is not free: it deliberately trades layout speed for typography, running a slower algorithm with no line cap, so the cost scales with how much text it touches. That is a fine trade for genuine body copy, but think before blanket-applying it to every text node on the page — scope it to your prose containers rather than a bare `*` or `p` selector across the whole document.
Verify: Grep the shipped CSS — `text-wrap: pretty` is attached to prose containers, not a universal selector.

#### F-59 — No manual <br> break hacks in headings
Severity: low · Source: `.zflow/evidence/specweb/foundations/text-wrap.md`
Quote: - **Keeping old `<br>` hacks.** Manual breaks fight the browser's balancing and produce double breaks at some widths. Remove them once you adopt `text-wrap`.
Verify: DOM query `h1 br, h2 br, h3 br` returns nothing on content pages.

#### F-60 — Default layout plus wrapper-based containers
Severity: low · Source: `.zflow/evidence/specweb/foundations/container-queries.md`
Quote: Treat it as progressive enhancement: write a sensible single-column default, then enhance at larger container widths. No `@supports` gate is needed — unsupported browsers ignore the `@container` block and keep the default. Prefer `inline-size` unless you genuinely need both axes; `container-type: size` requires the container to have a known block size or its box collapses, exactly as with [`contain: size`](/spec/performance/css-containment/).
Verify: DevTools shows query-container badges on ancestor wrappers; with `@container` unsupported (or viewing the default layout), a usable fallback renders.

#### F-61 — container-type: size needs a known block size
Severity: medium · Source: `.zflow/evidence/specweb/foundations/container-queries.md`
Quote: - **`container-type: size` without a fixed height.** With no known block size the box collapses to zero in the contained axis.
Verify: Grep the shipped CSS for `container-type: size` and confirm each matched element also has an explicit height/block size.

#### F-62 — command/commandfor only on buttons
Severity: medium · Source: `.zflow/evidence/specweb/foundations/invoker-commands.md`
Quote: - **Putting `command`/`commandfor` on a non-button.** They only work on `<button>`. A `<div>` with these attributes does nothing and is not keyboard-operable.
Verify: DOM query `[commandfor]:not(button)` returns nothing; activate a command button with Enter/Space and the target responds.

#### F-63 — Custom commands have a listener
Severity: low · Source: `.zflow/evidence/specweb/foundations/invoker-commands.md`
Quote: - **Custom command without a listener.** A `--name` command does nothing on its own; you must handle the `command` event on the target.
Verify: Activate a `--`-prefixed command button and observe the target reacts (a `command` event listener fires on the target).

#### F-64 — request-close for cancel-capable dialogs
Severity: low · Source: `.zflow/evidence/specweb/foundations/invoker-commands.md`
Quote: - **Forgetting `request-close`.** For dialogs that should run cancel behaviour and fire the `cancel` event, prefer `request-close` over `close`.
Verify: Inspect dialog close buttons' `command` attribute — flows with cancel logic use `request-close`.

#### F-65 — Record format: v=FORSALE1, one pair per record
Severity: low · Source: `.zflow/evidence/specweb/foundations/for-sale-dns.md`
Quote: - **The version tag is mandatory** and case-sensitive: every record starts `v=FORSALE1;`. It exists so a processor can tell a real `_for-sale` record from an unrelated `TXT` record that a DNS wildcard happened to expand into that name.
Verify: `dig +short TXT _for-sale.example.com` — every returned string begins `v=FORSALE1;` and contains at most one tag=value pair.

#### F-66 — TTL at or below 3600
Severity: low · Source: `.zflow/evidence/specweb/foundations/for-sale-dns.md`
Quote: - **Keep the TTL at 3600 seconds or less.** A stale record advertising a price you have withdrawn, or a domain you already sold, is worse than no record.
Verify: `dig TXT _for-sale.example.com | grep _for-sale` shows a TTL ≤ 3600.

#### F-67 — Record absent unless genuinely for sale
Severity: medium · Source: `.zflow/evidence/specweb/foundations/for-sale-dns.md`
Quote: - **Remove it when the domain is no longer for sale.** The convention has no "not for sale" value; absence is the only way to say no.
Verify: `dig +short TXT _for-sale.<domain>` returns nothing for domains not actively for sale; on a live, not-for-sale consumer site an existing record is a failure.

### 2.2 SEO — 77 requirements

The crawlability and indexability contract: robots.txt, XML sitemaps and their extensions, URL structure, redirects, server-side rendering, soft-404 discipline, indexing policy, headings, internal linking, JSON-LD, breadcrumbs, IndexNow.

Checklist status (`meta/checklist.md`): **Required** — redirects, meta robots / X-Robots-Tag, heading hierarchy · **Avoid** — soft 404s · **Recommended** — robots.txt, XML sitemaps, URL structure, server-side rendering, internal linking, structured data (JSON-LD), breadcrumbs.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### SEO-01 — robots.txt served correctly at the root
Severity: high · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: It must be reachable at exactly `/robots.txt` on the host, served as `text/plain`, and returned with a `200 OK`. A `404` is interpreted as "no restrictions"; a `5xx` is interpreted as "crawl nothing" by most crawlers.
Verify: `curl -sI https://site/robots.txt` — expect status 200 and `Content-Type: text/plain`.

#### SEO-02 — Sitemap directive in robots.txt
Severity: medium · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: - The `Sitemap:` directive is the canonical way to point crawlers at your sitemap when they have not been told another way.
Verify: `curl -s https://site/robots.txt | grep -i '^Sitemap:'` — expect at least one line with an absolute sitemap URL.

#### SEO-03 — robots.txt size limit
Severity: low · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: - Keep the file under 500 KiB. Google truncates above that.
Verify: `curl -s https://site/robots.txt | wc -c` — expect a value below 512000.

#### SEO-04 — no site-wide Disallow on production
Severity: high · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: - `Disallow: /` accidentally left over from staging. This blocks the entire site.
Verify: `curl -s https://site/robots.txt | grep -iE 'Disallow: */$'` — expect no match under any `User-agent` group.

#### SEO-05 — CSS and JS not blocked
Severity: medium · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: - Blocking CSS and JS. Google needs to render the page to rank it.
Verify: Read robots.txt Disallow rules and confirm none match `.css`/`.js` asset paths; `curl -sI -A "Googlebot" <sampled asset URL>` returns 200.

#### SEO-06 — no Noindex line in robots.txt
Severity: medium · Source: `.zflow/evidence/specweb/seo/robots-txt.md`
Quote: - Adding a `Noindex:` line to robots.txt to keep a page out of search. It was never part of the standard, Google stopped honouring the unofficial version in September 2019, and unsupported lines are silently ignored. robots.txt governs crawling, not indexing: to deindex a page, let it be crawled and serve `noindex` in a meta robots tag or `X-Robots-Tag`.
Verify: `curl -s https://site/robots.txt | grep -i '^Noindex:'` — expect no match.

#### SEO-07 — sitemap fetchable with correct content type
Severity: medium · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - Fetch the sitemap directly. Confirm `Content-Type: application/xml` and a `200 OK`.
Verify: `curl -sI https://site/sitemap.xml` — expect 200 and `Content-Type: application/xml`.

#### SEO-08 — absolute, same-host URLs in sitemap
Severity: medium · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - **URL must be absolute.** Include the scheme and host. The sitemap must live on the same host as the URLs it lists, with limited exceptions.
Verify: `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>'` — every value starts with `https://site` (scheme+host matching the serving host).

#### SEO-09 — sitemap size and URL limits
Severity: medium · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - **One sitemap, 50,000 URLs and 50 MB uncompressed maximum.** Past that, split into multiple sitemaps and add a [sitemap index](/spec/seo/sitemap-index/).
Verify: `curl -s https://site/sitemap.xml | grep -c '<url>'` ≤ 50000 and uncompressed size ≤ 50 MB (`curl -s ... | wc -c`, gunzipping first if served as `.xml.gz`).

#### SEO-10 — sitemap lists only live canonical URLs
Severity: high · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - Including URLs that return 3xx, 4xx, or 5xx — crawlers will drop trust in the whole sitemap.
Verify: Loop `curl -s -o /dev/null -w '%{http_code} %{url}\n'` over the sitemap's `<loc>` URLs — all must be 200; spot-check each page's `<link rel="canonical">` equals its sitemap URL.

#### SEO-11 — honest lastmod in ISO 8601
Severity: low · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - **Set `<lastmod>` honestly.** Use ISO 8601 / W3C date format. Google uses it as a hint when scheduling recrawls; touching it on every deploy degrades that signal.
Verify: Extract `<lastmod>` values and validate against W3C date syntax (`\d{4}-\d{2}-\d{2}` prefix or full datetime); flag entries whose lastmod equals the fetch/deploy date across the whole file.

#### SEO-12 — correct content type for gzip sitemap
Severity: low · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: - **Gzip is allowed.** Serve as `application/xml` (`.xml`) or `application/x-gzip` (`.xml.gz`).
Verify: `curl -sI https://site/sitemap.xml.gz` — expect `Content-Type: application/x-gzip`; the plain `.xml` variant must return `application/xml`.

#### SEO-13 — no XSL stylesheet on sitemaps
Severity: low · Source: `.zflow/evidence/specweb/seo/xml-sitemaps.md`
Quote: ## Do not attach an XSL stylesheet
Verify: `curl -s https://site/sitemap.xml | head -5 | grep -i 'xml-stylesheet'` — expect no match.

#### SEO-14 — index structure and resolvable children
Severity: medium · Source: `.zflow/evidence/specweb/seo/sitemap-index.md`
Quote: - Fetch the index URL. Confirm the root element is `<sitemapindex>` and each child resolves to a valid sitemap.
Verify: `curl -s https://site/sitemap-index.xml | head -3` shows the `<sitemapindex>` root; `xmllint --noout` each child URL and confirm it parses as a urlset.

#### SEO-15 — child sitemaps on the same host
Severity: medium · Source: `.zflow/evidence/specweb/seo/sitemap-index.md`
Quote: - Every child sitemap must be on the same host as the index, with limited cross-host exceptions.
Verify: `curl -s https://site/sitemap-index.xml | grep -o '<loc>[^<]*</loc>'` — every child URL's host equals the index URL's host.

#### SEO-16 — index lastmod reflects newest child entry
Severity: low · Source: `.zflow/evidence/specweb/seo/sitemap-index.md`
Quote: - `<lastmod>` on the index entry should reflect the newest `<lastmod>` inside the child sitemap. This lets crawlers skip refetching unchanged sections.
Verify: Fetch a child sitemap, compute `max(<lastmod>)`, and compare it to the index entry's `<lastmod>` — they must match.

#### SEO-17 — index child-count and size caps
Severity: low · Source: `.zflow/evidence/specweb/seo/sitemap-index.md`
Quote: - Up to **50,000 child sitemaps** per index, and the index itself is capped at 50 MB uncompressed.
Verify: `curl -s https://site/sitemap-index.xml | grep -c '<sitemap>'` ≤ 50000 and `curl -s ... | wc -c` ≤ 52428800.

#### SEO-18 — namespace declarations present
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Forgetting the `xmlns:image` or `xmlns:video` namespace declaration on `<urlset>`.
Verify: `curl -s https://site/sitemap.xml | head -5 | grep -o 'xmlns:image="[^"]*"'` — namespace present whenever `<image:image>` elements are used (same for `xmlns:video`).

#### SEO-19 — image URLs reachable with image content type
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Test that each `<image:loc>` returns `200 OK` with an image `Content-Type`.
Verify: `curl -sI <image:loc URL>` for each entry — expect 200 and a `image/*` Content-Type.

#### SEO-20 — image count cap per URL entry
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Up to **1,000 images per `<url>` entry**.
Verify: Parse the sitemap and count `<image:image>` children per `<url>` — each ≤ 1000.

#### SEO-21 — video entry required fields
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Each `<video:video>` needs `thumbnail_loc`, `title`, `description`, and one of `content_loc` or `player_loc`.
Verify: `xmllint --shell` or a grep over each `<video:video>` block confirming all required children are present; validate against Google's video sitemap XSD.

#### SEO-22 — video title and description length caps
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Keep titles under 100 characters and descriptions under 2,048.
Verify: Extract `video:title` and `video:description` text lengths from the sitemap — title < 100 chars, description < 2048 chars.

#### SEO-23 — listed images actually used on the page
Severity: low · Source: `.zflow/evidence/specweb/seo/image-sitemaps.md`
Quote: - Listing images that are not actually used on the page in `<loc>`. Crawlers cross-check.
Verify: `curl -s <page loc>` and confirm each `<image:loc>` URL appears among the page's `img` `src`/`srcset` values.

#### SEO-24 — lowercase paths enforced by 301
Severity: medium · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **Lowercase only.** RFC 3986 says the path is case-sensitive, so `/About` and `/about` are different URLs. Pick lowercase and enforce a 301 redirect for any uppercase variant.
Verify: `curl -sI https://site/ABOUT` (uppercased variant of a real path) — expect 301 with a lowercase `Location`.

#### SEO-25 — hyphens, not underscores, in slugs
Severity: low · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **Hyphens, not underscores.** Search engines tokenise on hyphens but not underscores. `web-security` reads as two words; `web_security` reads as one.
Verify: `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>' | grep -E '[a-z]_[a-z]'` — expect no underscore-separated paths.

#### SEO-26 — shallow URL nesting
Severity: low · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **Avoid deep nesting.** Aim for three or fewer path segments after the host. Deep URLs (`/section/sub/sub/sub/post`) signal low priority and are hard to refactor.
Verify: Count path segments per sitemap URL (`awk -F/ '{print NF-4}'` on the loc values) — flag pages deeper than 3 segments.

#### SEO-27 — consistent trailing slash enforced by 301
Severity: medium · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **Pick trailing-slash or no-trailing-slash and stick with it.** Both work; mixing creates duplicate-content risk. Use a 301 to enforce the chosen form.
Verify: `curl -sI https://site/page/` and `curl -sI https://site/page` — exactly one form returns 200 and the other returns 301 to it.

#### SEO-28 — canonical URLs strip query parameters
Severity: medium · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **Query parameters are for filters, not content.** Canonical content should have a clean path. Parameters are fine for sort order, pagination, and tracking, but the canonical link should strip them.
Verify: `curl -s 'https://site/page?utm_source=x&sort=price' | grep -o '<link rel="canonical"[^>]*>'` — the href has no query string and no session/tracking parameter.

#### SEO-29 — ASCII-only URLs
Severity: low · Source: `.zflow/evidence/specweb/seo/url-structure.md`
Quote: - **ASCII where possible.** Modern browsers handle IDNs and percent-encoded UTF-8 fine, but non-ASCII URLs break in older tooling, copy-paste, and email clients.
Verify: `curl -s https://site/sitemap.xml | grep -P '[^\x00-\x7F]'` — expect no non-ASCII bytes in loc values.

#### SEO-30 — permanent moves use 301/308
Severity: high · Source: `.zflow/evidence/specweb/seo/redirects.md`
Quote: - **URL has moved for good → 301 (or 308 if the method matters).**
Verify: `curl -sI https://site/old-url` — known permanent moves return 301/308 with the new `Location`, not 302.

#### SEO-31 — HTTP to HTTPS via 301
Severity: high · Source: `.zflow/evidence/specweb/seo/redirects.md`
Quote: - **HTTPS upgrade → 301** from `http://` to `https://`.
Verify: `curl -sI http://site/` — expect 301 with an `https://` `Location`.

#### SEO-32 — redirect chains at most three hops
Severity: medium · Source: `.zflow/evidence/specweb/seo/redirects.md`
Quote: - Chains longer than three hops. Google stops following after about ten; users feel the latency long before that.
Verify: `curl -sIL -o /dev/null -w '%{num_redirects}\n' https://site/old-url` — hop count ≤ 3.

#### SEO-33 — no redirect loops
Severity: high · Source: `.zflow/evidence/specweb/seo/redirects.md`
Quote: - Redirect loops (`A → B → A`).
Verify: `curl -sIL --max-redirs 10 https://site/<suspect-url>` — the fetch terminates without a "maximum redirections exceeded" error.

#### SEO-34 — redirects at the HTTP layer, not meta-refresh or JS
Severity: medium · Source: `.zflow/evidence/specweb/seo/redirects.md`
Quote: - Redirect at the edge (web server, CDN, or origin) — not with `<meta http-equiv="refresh">` or JavaScript. Crawlers handle HTTP redirects reliably; meta-refresh and JS redirects are slower and ambiguous.
Verify: `curl -sI https://site/old-url` shows a 3xx; `curl -s https://site/old-page | grep -iE 'http-equiv=.refresh.'` — no meta-refresh used as the redirect mechanism.

#### SEO-35 — content and metadata in the initial HTML
Severity: high · Source: `.zflow/evidence/specweb/seo/server-side-rendering.md`
Quote: - Render primary content and `<head>` metadata server-side, by whichever method fits: SSR for per-request content, static generation for stable content, prerendering for a fixed URL set.
Verify: `curl -s https://site/ | grep -iE '<title|rel="canonical"|og:'` — title, canonical and OG tags present in raw HTML; main copy visible with JavaScript disabled in DevTools.

#### SEO-36 — real anchor links in served markup
Severity: high · Source: `.zflow/evidence/specweb/seo/server-side-rendering.md`
Quote: - Put real `<a href>` links in the markup so crawlers can follow them; do not rely on click handlers for navigation.
Verify: `curl -s https://site/ | grep -c '<a href'` — navigation anchors present in the server HTML; with JavaScript disabled the navigation still works.

#### SEO-37 — same content for crawlers and users (no cloaking)
Severity: high · Source: `.zflow/evidence/specweb/seo/server-side-rendering.md`
Quote: - **Cloaking by accident.** Serving crawlers a different rendered output from users risks quality penalties and broken trust. Render the same content for everyone.
Verify: `diff <(curl -s -A "Mozilla/5.0" https://site/page) <(curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://site/page)` — no materially different content.

#### SEO-38 — nonexistent URLs return 404 or 410
Severity: high · Source: `.zflow/evidence/specweb/seo/soft-404.md`
Quote: - `curl -sI https://example.com/this-does-not-exist` should return `404` or `410`, not `200` and not `302`.
Verify: `curl -sI https://site/this-does-not-exist-<random>` — expect 404 or 410.

#### SEO-39 — missing pages not redirected to the home page
Severity: medium · Source: `.zflow/evidence/specweb/seo/soft-404.md`
Quote: - **Do not redirect missing pages to the home page.** That is the worst of both worlds — Google treats it as a soft 404 anyway, and users get no signal about what went wrong.
Verify: `curl -sI https://site/nonexistent-<random>` — no `Location` header pointing at `/` or the homepage.

#### SEO-40 — explicit, correct indexing policy per page
Severity: high · Source: `.zflow/evidence/specweb/seo/meta-robots.md`
Quote: Public pages are required to be indexable; non-public pages are required to be non-indexable. Either way, the policy must be explicit and correct.
Verify: `curl -s https://site/<key-page> | grep -i 'name="robots"'` — no noindex on public pages; `curl -sI` shows no `X-Robots-Tag: noindex`; thank-you/cart/account pages do carry noindex.

#### SEO-41 — staging environments carry noindex
Severity: high · Source: `.zflow/evidence/specweb/seo/meta-robots.md`
Quote: - **Staging and preview environments.** Forgetting `noindex` on a `staging.example.com` is a top-five SEO mistake. Once Google indexes a staging URL, it competes with production.
Verify: `curl -sI https://staging.site/ | grep -i 'x-robots-tag'` or `curl -s https://staging.site/ | grep -i 'name="robots"'` — noindex present on the staging host.

#### SEO-42 — X-Robots-Tag for non-HTML resources
Severity: medium · Source: `.zflow/evidence/specweb/seo/meta-robots.md`
Quote: **Use `X-Robots-Tag` for non-HTML.** Cloudflare, Nginx, Apache, and CDN edge config can all set it per-path. Required for PDFs you don't want indexed.
Verify: `curl -sI https://site/files/sample.pdf | grep -i 'x-robots-tag'` — header set on non-HTML resources that should not be indexed.

#### SEO-43 — no robots.txt Disallow combined with noindex
Severity: medium · Source: `.zflow/evidence/specweb/seo/meta-robots.md`
Quote: **Don't combine `robots.txt: Disallow` with `noindex`.** If a URL is disallowed in robots.txt, crawlers never fetch it — and therefore never see the `noindex`. The page can still be indexed from external links, with no snippet. To truly de-index, allow crawl and serve `noindex`.
Verify: Cross-check robots.txt Disallow paths against pages that serve `noindex` (meta robots or X-Robots-Tag) — the two sets must not overlap.

#### SEO-44 — exactly one h1 per page
Severity: medium · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **One `<h1>` per page.** HTML5 once described a document-outline algorithm in which each nested sectioning element (`<section>`, `<article>`) reset the heading scope, so `<h1>` could be reused everywhere. No browser or screen reader ever implemented it, nesting multiple `<h1>`s that way is now non-conforming, and the browser default that shrank a sectioned `<h1>` was removed from the spec in 2025. Use a single `<h1>` that matches the page title.
Verify: `curl -s https://site/page | grep -o '<h1[^>]*>' | wc -l` — exactly 1 on every audited page.

#### SEO-45 — no skipped heading levels
Severity: medium · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **Do not skip levels.** Go `h1 → h2 → h3`, never `h1 → h3`. Levels can decrease by any amount on the way back up (`h3 → h2` is fine).
Verify: Run axe or Lighthouse (heading-order rule); or extract the `grep -oE '<h[1-6]'` sequence from the HTML and assert no upward jump greater than +1.

#### SEO-46 — visual headings use real heading tags
Severity: medium · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **Visual headings need real heading tags.** A `<div class="heading">` is invisible to assistive tech. A `<p>` styled to look like an `<h2>` is invisible to search engines.
Verify: Inspect the DOM/CSS (axe, WAVE, or DevTools) for large-font standalone text not wrapped in an heading element.

#### SEO-47 — headings under 70 characters
Severity: low · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **Keep headings short.** They are anchors, not paragraphs. Aim for under 70 characters.
Verify: Extract heading text lengths via a DOM parser — each under 70 characters.

#### SEO-48 — no empty headings
Severity: low · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **No heading without a section under it.** Every heading should have content. An `<h2>` followed immediately by another `<h2>` with nothing between them is a smell.
Verify: Run axe/Lighthouse (empty-heading flags) or parse the DOM for consecutive heading elements with no intervening content.

#### SEO-49 — title and subtitle form one heading
Severity: low · Source: `.zflow/evidence/specweb/seo/heading-hierarchy.md`
Quote: - **A title and its subtitle are one heading, not two.** Marking up a strapline as a second heading (`<h1>` followed by an `<h2>` tagline) adds a phantom level to the outline. Wrap the single `<h1>`–`<h6>` and one or more `<p>` subtitles in `<hgroup>`, which groups them without contributing a heading of its own.
Verify: View-source: the `<h1>` is not immediately followed by an `<h2>` used as a tagline; subtitles are `<p>` inside `<hgroup>`.

#### SEO-50 — descriptive anchor text
Severity: medium · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - **Use descriptive anchor text.** "XML sitemap spec" is good. "Click here" tells the user and the crawler nothing.
Verify: Crawl with Screaming Frog and review the anchor-text report for generic anchors ("click here", "read more", "learn more").

#### SEO-51 — links point at canonical destinations
Severity: medium · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - **Link to the canonical URL** of the destination, not a redirect. Every link to a redirect costs a hop.
Verify: Sample internal `<a href>` values with `curl -s -o /dev/null -w '%{http_code}' <href>` — destinations return 200, not 301.

#### SEO-52 — no orphan pages
Severity: medium · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - **Avoid orphan pages.** Every URL in the sitemap should be reachable from at least one other page through normal navigation, not just from the sitemap itself.
Verify: Crawl the site (Screaming Frog/Sitebulb) and diff the sitemap URL list against pages with ≥ 1 inlink — the orphan-pages report must be empty.

#### SEO-53 — content pages link to related content
Severity: low · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - **Link to topically related content.** Each article should link to two to five other relevant pages on the site. A page with zero outbound internal links is an orphan from the crawler's perspective even if it links inwards.
Verify: From a crawl export, count contextual internal links per content page (excluding repeated nav/footer) — expect 2–5.

#### SEO-54 — link depth within three clicks
Severity: low · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - **Keep link depth shallow.** Pages more than three clicks from the home page get crawled and updated less often.
Verify: Screaming Frog crawl-depth column (or equivalent) — flag pages deeper than 3 clicks from `/`.

#### SEO-55 — no nofollow on internal links
Severity: low · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - Using `rel="nofollow"` on internal links to "sculpt" ranking signals or save crawl budget. Google treats nofollow as a hint, not an instruction, so nofollowed pages can still be crawled and indexed through your sitemap or other links. It is not a crawl-control lever: to keep your own pages out of the crawl, Google's guidance is a robots.txt `disallow`, not `nofollow`.
Verify: `curl -s https://site/page | grep -c 'rel="nofollow"'` applied to internal links — expect 0.

#### SEO-56 — no links to staging or preview hosts
Severity: medium · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - Linking to staging or preview URLs by accident.
Verify: Crawl hrefs and run `grep -E 'staging\.|\.dev\.|preview\.|localhost'` over the link export — expect no matches.

#### SEO-57 — no massive footer link blocks
Severity: low · Source: `.zflow/evidence/specweb/seo/internal-linking.md`
Quote: - Hundreds of footer links to every page on the site. Dilutes the signal and clutters screen-reader rotors.
Verify: Count `<a>` elements inside `<footer>` from the crawl export — not in the hundreds.

#### SEO-58 — JSON-LD structured data present
Severity: medium · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: Structured data is a set of machine-readable statements that describe what a page is about, using the shared vocabulary at [schema.org](https://schema.org/). The recommended serialisation is JSON-LD: a `<script type="application/ld+json">` block inside `<head>` (or, less commonly, `<body>`).
Verify: `curl -s https://site/page | grep -c 'application/ld+json'` ≥ 1; validate the block in validator.schema.org.

#### SEO-59 — JSON-LD mirrors visible content
Severity: high · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **Mirror what is visible on the page.** Do not declare facts in JSON-LD that the page does not state. Google calls this "out of sync" data and ignores or penalises it.
Verify: Compare JSON-LD fields (price, availability, dates, author) against the rendered page text — every declared fact appears visibly.

#### SEO-60 — no fabricated ratings or reviews
Severity: high · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - Fabricating `aggregateRating` or `Review` to win stars. Google detects this and removes the rich result, sometimes the whole site's eligibility.
Verify: Where JSON-LD contains `aggregateRating`/`Review`, confirm visible review content (matching count/score) exists on the page.

#### SEO-61 — absolute URLs inside JSON-LD
Severity: low · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **Use absolute URLs** in `@id`, `url`, `image`, and `sameAs`.
Verify: Parse the JSON-LD block — every `@id`, `url`, `image`, `sameAs` value starts with `http(s)://`.

#### SEO-62 — ISO 8601 dates in JSON-LD
Severity: low · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **Keep dates in ISO 8601.**
Verify: Parse `datePublished`/`dateModified` values with an ISO 8601 parser (`date -Iseconds` / moment.iso) — all valid.

#### SEO-63 — WebSite entity on the home page
Severity: low · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **`WebSite`** — site-wide, on the home page. Include `url` and `name`, and `potentialAction` for sitelinks search if appropriate.
Verify: `curl -s https://site/ | grep -o '"@type": *"WebSite"'` — present with `url` and `name` populated.

#### SEO-64 — Organization/Person identity with sameAs
Severity: low · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **`Organization`** or **`Person`** — for the publisher and authors. Include `sameAs` arrays pointing at verified profiles.
Verify: Parse home-page JSON-LD for `@type: Organization`/`Person` and a non-empty `sameAs` array of profile URLs.

#### SEO-65 — Article markup on article pages
Severity: medium · Source: `.zflow/evidence/specweb/seo/structured-data.md`
Quote: - **`Article`** or **`BlogPosting`** — for articles, with `headline`, `datePublished`, `dateModified`, `author`, `image`.
Verify: On article URLs, extract JSON-LD `@type: Article`/`BlogPosting` and confirm all five fields; run Google's Rich Results Test.

#### SEO-66 — breadcrumb trail in labelled nav
Severity: medium · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Wrap the trail in `<nav aria-label="Breadcrumb">`.** The label is what screen readers announce. "Breadcrumb" is the conventional value.
Verify: `curl -s https://site/page | grep -c 'nav aria-label="Breadcrumb"'` ≥ 1 on pages with a trail.

#### SEO-67 — breadcrumb uses an ordered list
Severity: low · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Use an ordered list (`<ol>`).** Order is part of the meaning.
Verify: `curl -s https://site/page | grep -A3 'aria-label="Breadcrumb"'` — the trail is `<ol><li>…` structure.

#### SEO-68 — current page marked and not a link
Severity: medium · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Each item except the last is a link to its level.** The last item is the current page, marked `aria-current="page"`. It should not be a link.
Verify: `curl -s https://site/page | grep 'aria-current="page"'` — present, and its `<li>` contains no `<a>` element.

#### SEO-69 — BreadcrumbList JSON-LD matches visible trail
Severity: medium · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Match the visible trail to the JSON-LD exactly.** Same items, same order, same names, same URLs.
Verify: Extract the `BreadcrumbList` itemListElement names/urls and diff against the rendered trail; confirm with Google's Rich Results Test.

#### SEO-70 — separator via CSS, not a literal character
Severity: low · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Use a CSS separator (`::before`), not a literal `›` character in the markup.** Avoids the separator being announced as part of the link.
Verify: `curl -s https://site/page | grep -c '›'` — no literal separator characters inside breadcrumb link text.

#### SEO-71 — trail anchored at Home
Severity: low · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Anchor breadcrumbs at "Home".** Some sites omit Home, but including it makes the JSON-LD more useful and matches what Google displays.
Verify: First breadcrumb item (visible and in JSON-LD) is "Home" linking to the site root.

#### SEO-72 — trail three to five levels
Severity: low · Source: `.zflow/evidence/specweb/seo/breadcrumbs.md`
Quote: - **Keep them short.** Three to five levels is normal; ten levels suggests the URL structure is too deep.
Verify: Count trail items per page — 3–5; flag trails approaching 10.

#### SEO-73 — key file hosted at site root
Severity: low · Source: `.zflow/evidence/specweb/seo/indexnow.md`
Quote: 2. **Host the key file at the site root.** `https://example.com/<key>.txt`, served as `text/plain`, body equal to the key.
Verify: `curl -sI https://site/<key>.txt` → 200 `text/plain`; `curl -s https://site/<key>.txt` body equals the key.

#### SEO-74 — key file returns 200 directly
Severity: low · Source: `.zflow/evidence/specweb/seo/indexnow.md`
Quote: - Hosting the key file at the wrong path or behind redirects. The key file must return 200 directly.
Verify: `curl -sI https://site/<key>.txt` — status is 200 (not 301/302/404).

#### SEO-75 — key format 8–128 allowed characters
Severity: low · Source: `.zflow/evidence/specweb/seo/indexnow.md`
Quote: 1. **Generate a key.** 8 to 128 characters, `[a-zA-Z0-9-]`. Pick one and reuse it indefinitely.
Verify: Fetch the key file and validate the body against `^[a-zA-Z0-9-]{8,128}$`.

#### SEO-76 — submissions limited to changes, max 10,000 URLs
Severity: low · Source: `.zflow/evidence/specweb/seo/indexnow.md`
Quote: 4. **Limit volume.** Up to 10,000 URLs per request. Do not send the entire sitemap on every cron tick — submit only what changed since the last call.
Verify: Not observable externally without logs; review the integration's submission logs or Bing Webmaster Tools "URL Submission" history for batch sizes and change-only payloads.

#### SEO-77 — deletions submitted too
Severity: low · Source: `.zflow/evidence/specweb/seo/indexnow.md`
Quote: 5. **Send deletions too.** A 404 or 410 should also be submitted; that is how participating engines learn to drop URLs quickly.
Verify: Not observable externally; confirm 404/410 URLs appear in the IndexNow submission logs / Bing Webmaster Tools URL Submission history.

### 2.3 Accessibility — 88 requirements

WCAG 2.2 AA as the working bar: contrast, alt text, form labels and errors, keyboard operability, focus visibility and non-obscuring, skip links and landmarks, ARIA discipline, link and button names, status messages, accessible authentication, reduced motion, captions, tables, target size, dragging alternatives, mobile inputs.

Checklist status (`meta/checklist.md`): **Required** — colour contrast, image alt text, form labels, keyboard navigation, visible focus indicators, skip links, semantic HTML and landmarks, descriptive link text, accessible form errors, document and parts language, reduced motion, captions and transcripts, accessible data tables, touch target size · **Avoid** — empty links and buttons, accessibility overlays · **Recommended** — focus not obscured, status messages, accessible authentication, redundant entry, consistent help, mobile-friendly form inputs.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### A1 — Body text contrast meets WCAG AA minimum
Severity: high · Source: `.zflow/evidence/specweb/accessibility/color-contrast.md`
Quote: - **1.4.3 Contrast (Minimum) — AA.** Body text needs at least **4.5:1**. Large text (18pt, or 14pt bold) needs **3:1**.
Verify: Run axe DevTools or Lighthouse accessibility audit on every key template (home, product, pricing, checkout) and review `color-contrast` failures; spot-check reported pairs (especially text over gradients/images) with a contrast checker.

#### A2 — Non-text UI elements meet 3:1 contrast
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/color-contrast.md`
Quote: - **1.4.11 Non-text Contrast — AA.** Meaningful UI components (input borders, focus rings, icon-only buttons) and graphics needed to understand the content need at least **3:1** against adjacent colours.
Verify: axe DevTools `non-text-contrast` rule on interactive components; manually sample icon-only-button glyph vs button fill with a contrast checker (automation misses gradients).

#### A3 — Enhanced (AAA) contrast targets
Severity: low · Source: `.zflow/evidence/specweb/accessibility/color-contrast.md`
Quote: - **1.4.6 Contrast (Enhanced) — AAA.** Body text **7:1**, large text **4.5:1**.
Verify: Check muted/body text design tokens with a WCAG contrast checker against the shipped backgrounds; report as enhancement, not conformance floor.

#### A4 — Text over images keeps contrast
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/color-contrast.md`
Quote: - Text laid over a busy image with no scrim or solid block behind it.
Verify: Screenshot hero/banner sections and sample foreground text against the lightest and darkest background areas under it with a contrast checker; axe misses text-on-image cases, so spot-check by hand.

#### A5 — contrast-color() ships with a fallback colour
Severity: low · Source: `.zflow/evidence/specweb/accessibility/contrast-color.md`
Quote: - **Shipping it with no fallback.** Without a plain `color` declaration first, older browsers fall back to the default text colour, which may be illegible on your background.
Verify: `curl -s <site-css-url> | grep -n -B3 'contrast-color('` — confirm a plain color declaration or `@supports` guard precedes each use.

#### A6 — contrast-color() result verified on mid-tone backgrounds
Severity: low · Source: `.zflow/evidence/specweb/accessibility/contrast-color.md`
Quote: - **Mid-tone backgrounds.** Against a mid-tone such as a royal blue (`#2277d3`), neither black nor white reliably clears AA for small text. The function still returns one of them; it does not guarantee a readable pair. Keep input colours light or dark, or verify the result.
Verify: Inspect the computed `color` in DevTools on elements using it and check the pair with a contrast checker; toggle dark mode / change the dynamic colour and re-check.

#### A7 — Forced-colours mode restores lost boundaries
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/forced-colors.md`
Quote: - **Restore lost boundaries.** Where a control or container was defined by `box-shadow` or background colour alone, add a `border` or `outline` inside `@media (forced-colors: active)`.
Verify: Chrome/Edge DevTools → Rendering panel → "Emulate CSS media feature forced-colors: active", reload; every control and container must keep a visible boundary. Also `curl -s <css> | grep 'forced-colors: active'` to confirm the site ships forced-colours-aware styles.

#### A8 — No state signalled by colour alone (forced-colours safe)
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/forced-colors.md`
Quote: - Conveying state (selected, error, disabled) through colour that forced mode discards, with no border, icon, or text fallback.
Verify: With forced-colors emulated (DevTools Rendering panel), confirm each state carries a non-colour cue; grayscale screenshot of error/selected states as a second check.

#### A9 — Every img has an alt attribute
Severity: high · Source: `.zflow/evidence/specweb/accessibility/image-alt-text.md`
Quote: The `alt` attribute on `<img>` provides a text alternative for an image. Screen readers announce it, browsers display it when the image fails to load, and crawlers use it to understand the content. An `alt` is required on every `<img>`; the *value* depends on what the image does on the page.
Verify: `curl -s <page> | grep -o '<img[^>]*>' | grep -v 'alt='` — any output is a failure; axe `image-alt` rule on every template.

#### A10 — Decorative images use empty alt
Severity: low · Source: `.zflow/evidence/specweb/accessibility/image-alt-text.md`
Quote: **Decorative images** — purely visual, add no information. Use an empty alt so assistive tech skips them.
Verify: Screen-reader pass (decorative images should be silent); review decorative flourishes in source for `alt=""` rather than descriptive text that interrupts reading flow.

#### A11 — Functional image alt describes the action
Severity: high · Source: `.zflow/evidence/specweb/accessibility/image-alt-text.md`
Quote: **Functional images** — act as a link or button. Describe the action, not the picture.
Verify: `curl -s <page> | grep -oE '<a [^>]*>\s*<img[^>]*>'` and read each alt; axe `link-name` rule flags image links with no useful name.

#### A12 — Alt text avoids "image of" and file names
Severity: low · Source: `.zflow/evidence/specweb/accessibility/image-alt-text.md`
Quote: - **Don't say "image of"** or "photo of". The screen reader already announces "graphic".
Verify: `curl -s <page> | grep -o 'alt="[^"]*"' | grep -iE 'image of|photo of|DSC_|\.jpg|\.png|\.svg'` — any hit is a fail.

#### A13 — Every form control has an associated label
Severity: high · Source: `.zflow/evidence/specweb/accessibility/form-labels.md`
Quote: > Every form control needs a programmatically associated label. A placeholder is not a label, and an unlabelled input is unusable for screen-reader and voice-control users.
Verify: Run axe on the newsletter, contact, search, and checkout forms (`label` rule flags missing associations); `curl -s <form> | grep -o '<input[^>]*>'` and confirm each has a matching label id or aria-label. Inspect the browser accessibility panel — "Name" must be set.

#### A14 — Checkbox/radio groups are named
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/form-labels.md`
Quote: - **Every checkbox and radio button** needs its own label, and the group needs a name from `<fieldset>`/`<legend>` or `role="group"` with `aria-labelledby`.
Verify: View source of any radio/checkbox group (newsletter preferences, checkout options) for fieldset/legend or role="group" + aria-labelledby around it.

#### A15 — Required fields state so in text
Severity: low · Source: `.zflow/evidence/specweb/accessibility/form-labels.md`
Quote: - **Required fields** should say so in the label (or in instructions), not only with an asterisk and colour.
Verify: Inspect required inputs' labels for a text cue (e.g. "required") beyond `*`; screen-reader pass announces requiredness.

#### A16 — Full keyboard operability, no traps
Severity: high · Source: `.zflow/evidence/specweb/accessibility/keyboard-navigation.md`
Quote: > Every interactive element on the page must be reachable and operable with a keyboard alone, in a logical order, with no traps that hold focus.
Verify: Unplug the mouse and walk every interactive feature on each template; open every dialog, menu, and dropdown and press Escape/Tab to confirm focus is managed and never trapped.

#### A17 — No positive tabindex
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/keyboard-navigation.md`
Quote: - **Never use positive `tabindex`** — it overrides DOM order and creates surprises.
Verify: `curl -s <page> | grep -oE 'tabindex="[1-9][0-9]*"'` — any hit fails.

#### A18 — Focus managed on view changes
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/keyboard-navigation.md`
Quote: Manage focus on view changes. When a dialog opens, move focus into it and trap it inside until it closes; then return focus to the element that opened it. Single-page navigations should move focus to the main heading of the new view.
Verify: Keyboard-only walkthrough of modal flows (newsletter modal, cookie settings, cart drawer) watching `document.activeElement` in the DevTools console at each step.

#### A19 — Visible focus indicator always
Severity: high · Source: `.zflow/evidence/specweb/accessibility/focus-indicators.md`
Quote: > Whenever a control receives keyboard focus, the page must show a clear, high-contrast indicator. Removing focus outlines without a replacement is a top accessibility failure.
Verify: Tab through every page template and confirm the focused control is obvious; `curl -s <css> | grep -nE 'outline:\s*(none|0)'` — each hit needs a matching replacement `:focus-visible` rule.

#### A20 — Focus indicator contrast ≥ 3:1
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/focus-indicators.md`
Quote: - **Contrast at least 3:1** against the adjacent colour, both focused and unfocused (1.4.11).
Verify: Focus a control, sample the ring colour vs its surroundings with a contrast checker; two-tone rings pass on any background.

#### A21 — Focus indicator ≥ 2px thick with offset
Severity: low · Source: `.zflow/evidence/specweb/accessibility/focus-indicators.md`
Quote: - **At least 2 CSS pixels thick** to meet 2.4.13's enclosed-area minimum.
Verify: Inspect computed `outline-width`/`outline-offset` in DevTools on focused elements across templates.

#### A22 — Focused control not hidden behind sticky content
Severity: high · Source: `.zflow/evidence/specweb/accessibility/focus-not-obscured.md`
Quote: > A focused control must not be hidden behind a sticky header, cookie banner, or chat widget. WCAG 2.2 added this as a separate criterion because a perfect focus ring is worthless if something is sitting on top of it.
Verify: Tab every template top-to-bottom watching the focus ring the whole way — desktop, narrow viewport, 200% zoom, and with the cookie banner showing; scroll to mid-page first, where failures cluster. Purely visual check; no tooling does it.

#### A23 — scroll-padding reserves the sticky-header strip
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/focus-not-obscured.md`
Quote: **Reserve the sticky area in the scroll container.** When focus moves off-screen, the browser scrolls the element into view — and by default it stops as soon as the element touches the viewport edge, which is exactly where your sticky header lives. `scroll-padding-top` on the scrolling element tells the browser to treat that strip as unusable:
Verify: DevTools computed `scroll-padding-top` on `html`/root when the site has a sticky header; `curl -s <css> | grep -n 'scroll-padding'` confirms it ships.

#### A24 — Cookie banners modal or out of the way
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/focus-not-obscured.md`
Quote: **Make banners modal or make them get out of the way.** A cookie banner that is non-modal and sticky is the canonical failure: focus can travel to the content behind it and end up underneath it. Either make it a true modal — trap focus inside it, and mark the rest [`inert`](/spec/accessibility/inert-attribute/) so focus cannot reach the obscured content in the first place — or ensure it does not overlap focusable content. See [cookie consent](/spec/privacy/cookie-consent/).
Verify: Fresh visit with the banner shown, then Tab — focus must never land on content hidden beneath the banner.

#### A25 — Skip link is the first focusable element
Severity: high · Source: `.zflow/evidence/specweb/accessibility/skip-links.md`
Quote: > A 'skip to main content' link as the first focusable element lets keyboard and screen-reader users jump past repeated navigation on every page.
Verify: Load the page, press Tab once — the skip link must appear; `curl -s <page> | grep -i 'skip.to'` and confirm the target id exists. Check every template, not only the homepage.

#### A26 — Skip link moves focus into main
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/skip-links.md`
Quote: - **`tabindex="-1"`** on `<main>` ensures focus actually moves to it when the link is followed; some browsers otherwise just scroll the page.
Verify: Press Enter on the skip link and check `document.activeElement` in the DevTools console is the main element, not just a scroll; view source for `display: none` on the skip link (a fail).

#### A27 — Background content inert while overlay open
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/inert-attribute.md`
Quote: > When an overlay is open, the content behind it should be unreachable — not just dimmed. The inert attribute removes a subtree from tab order and the accessibility tree at once, replacing fragile focus-trap JavaScript.
Verify: Open each overlay and press Tab repeatedly — focus must cycle only within the active region and never reach a background control; with a screen reader, background landmarks should not be announced.

#### A28 — aria-hidden alone not used for background content
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/inert-attribute.md`
Quote: - Using `aria-hidden` alone for background content — it hides from screen readers but leaves elements focusable, so keyboard focus still escapes.
Verify: Close each overlay and Tab through the page to confirm the background is interactive again (no stranded inert); inspect open-state DOM for inert on the background rather than aria-hidden-only.

#### A29 — Exactly one main landmark per page
Severity: high · Source: `.zflow/evidence/specweb/accessibility/semantic-html.md`
Quote: - **Exactly one `<main>` per page.** Two mains break the landmark list.
Verify: `curl -s <page> | grep -c '<main'` — must equal 1; axe region/landmark rules flag pages with no main.

#### A30 — Duplicate landmarks named
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/semantic-html.md`
Quote: - **Name every duplicate landmark** with `aria-label` or `aria-labelledby`. A page with two `<nav>` blocks needs each one named ("Primary", "Footer", "In page").
Verify: `curl -s <page> | grep -o '<nav[^>]*>'` — every nav beyond the first must carry a name; the devtools accessibility-tree landmark list should show distinct names.

#### A31 — Heading outline without skipped levels
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/semantic-html.md`
Quote: - **Headings form an outline.** Use one `<h1>`, then `<h2>` for sections, `<h3>` for sub-sections. Do not skip levels.
Verify: axe `heading-order` rule, or `curl -s <page> | grep -o '<h[1-6]'` and check the sequence never jumps a level.

#### A32 — Lists use real list markup
Severity: low · Source: `.zflow/evidence/specweb/accessibility/semantic-html.md`
Quote: - **Lists are lists.** Wrap navigation items in `<ul>`; screen readers announce "list, six items".
Verify: View nav/footer source for `ul`/`li` structure rather than bare divs/spans.

#### A33 — Native HTML before ARIA
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/aria-usage.md`
Quote: > ARIA can make custom widgets accessible, but the first rule of ARIA is don't use ARIA. Reach for a native HTML element first; add ARIA only when nothing native fits.
Verify: `curl -s <page> | grep -oE '<(div|span)[^>]*role="(button|link|checkbox|tab)"'` — each hit is a candidate that should have been a native element; axe flags redundant/misused roles.

#### A34 — Interactive ARIA controls keyboard-operable
Severity: high · Source: `.zflow/evidence/specweb/accessibility/aria-usage.md`
Quote: 3. **All interactive ARIA controls must be keyboard-operable.** A `role="button"` div without Space/Enter handlers is broken.
Verify: For every element carrying `role="button"` (or similar), focus it with Tab and activate with Enter and Space; both must work.

#### A35 — No aria-hidden/presentation on focusable elements
Severity: high · Source: `.zflow/evidence/specweb/accessibility/aria-usage.md`
Quote: 4. **Don't set `role="presentation"` or `aria-hidden="true"` on focusable elements.** You will hide controls from the very users who need them.
Verify: axe `aria-hidden-focus` rule; or DOM query for `[aria-hidden="true"]` subtrees containing links/buttons/inputs.

#### A36 — ARIA states updated by script
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/aria-usage.md`
Quote: - ARIA states (`aria-expanded`, `aria-checked`) never updated by JavaScript when the UI changes.
Verify: Toggle each disclosure/menu/toggle button and inspect its `aria-expanded`/`aria-pressed` in DevTools before and after — it must match the visual state.

#### A37 — Native semantics not overridden
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/aria-usage.md`
Quote: 2. **Don't change native semantics.** Never write `<h1 role="button">`. If you need a button, use a `<button>`.
Verify: `curl -s <page> | grep -oE '<(h[1-6]|nav|button|ul|table)[^>]*role='` — hits are suspect; check against the ARIA-in-HTML element table.

#### A38 — Link text describes destination
Severity: high · Source: `.zflow/evidence/specweb/accessibility/link-text.md`
Quote: > Every link's text must describe where it goes. 'Click here' and 'read more' fail screen-reader users who scan a page by jumping from link to link.
Verify: `curl -s <page> | grep -oiE '>(click here|read more|learn more|here)<'` — generic anchors are fails; screen-reader link-list shortcut should show entries that make sense out of context.

#### A39 — Repeated card links get unique accessible names
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/link-text.md`
Quote: For repeated "Read more" patterns on a card list, give each link a unique accessible name — the card heading is the easiest source:
Verify: Open the accessibility tree or a link list on a card grid; identical names pointing at different destinations are fails. Two links with the same text to different destinations is also a fail.

#### A40 — Download links indicate file type
Severity: low · Source: `.zflow/evidence/specweb/accessibility/link-text.md`
Quote: - **Indicate file type and language changes** when relevant: "Annual report (PDF, 2.4 MB)".
Verify: `curl -s <page> | grep -oE '<a [^>]*href="[^"]*\.(pdf|docx?|zip|xlsx?)"[^>]*>[^<]*'` — link text should name the format.

#### A41 — Every link and button has an accessible name
Severity: high · Source: `.zflow/evidence/specweb/accessibility/empty-links-buttons.md`
Quote: > A link or button with no accessible name is invisible to screen readers and unreachable for voice control. Icon-only controls without a label are the usual culprit.
Verify: axe `button-name` and `link-name` rules on every template (high-confidence findings); inspect icon-only controls in the browser accessibility panel — Name must be populated.

#### A42 — title attribute is not sufficient labelling
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/empty-links-buttons.md`
Quote: **Tooltip-only labelling is not enough.** A `title` attribute does not produce a reliable accessible name in every browser and assistive tech combination. Use `aria-label` or visible text instead.
Verify: `curl -s <page> | grep -oE '<(button|a )[^>]*title="[^"]*"[^>]*>'` and check each hit also has text content or aria-label.

#### A43 — Decorative SVGs inside buttons aria-hidden
Severity: low · Source: `.zflow/evidence/specweb/accessibility/empty-links-buttons.md`
Quote: - Mark the SVG inside the button `aria-hidden="true"` and `focusable="false"` so the icon is not double-announced.
Verify: Inspect icon-button markup: `<svg aria-hidden="true" focusable="false">` inside the button.

#### A44 — Form errors identified in text
Severity: high · Source: `.zflow/evidence/specweb/accessibility/form-errors.md`
Quote: - **Identify the error in text.** "Email is required" — not just a red border.
Verify: Submit each public form (contact, checkout, signup) with deliberately bad data and read the rendered errors; test in grayscale to confirm the error state is visible without colour.

#### A45 — Errors associated via aria-invalid/aria-describedby
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/form-errors.md`
Quote: - **Set `aria-invalid="true"`** on the field — and remove it when the user corrects the value.
Verify: After a failed submit, inspect each invalid input: `aria-invalid="true"` present and `aria-describedby` points at the error node's id; tabbing to the field with a screen reader reads the error with the label.

#### A46 — Dynamic errors announced
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/form-errors.md`
Quote: - **Announce dynamically inserted errors.** Use `role="alert"` (assertive) or a live region (`aria-live="polite"`) so screen readers hear the change — see [status messages](/spec/accessibility/status-messages/) for the mechanics.
Verify: With a screen reader running, submit bad data and confirm the error is spoken without hunting for it; DOM contains the alert/live region before the message appears.

#### A47 — Error copy explains the fix
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/form-errors.md`
Quote: - **Tell the user how to fix it.** "Enter a date in the format DD/MM/YYYY", not "Invalid date".
Verify: Read the rendered error copy on failed submissions of public forms; generic one-word errors fail.

#### A48 — Errors not colour-only
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/form-errors.md`
Quote: - **Don't rely on colour alone.** Pair red with an icon, a word ("Error"), or a heavier border.
Verify: Grayscale screenshot of the errored form — invalid fields must be identifiable without colour.

#### A49 — Status changes exposed via live regions
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/status-messages.md`
Quote: > When something succeeds, fails or changes without moving focus — a result count, a saved confirmation, a progress update — assistive technology has to be told. Expose it through a live region, or announce it with ariaNotify().
Verify: With a screen reader, perform the action (filter a list, add to basket, save) keeping focus still — the message should be heard; `curl -s <page> | grep -E 'role="(status|alert|log)"|aria-live'` on interactive listing pages.

#### A50 — Live-region container in initial HTML
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/status-messages.md`
Quote: Render the container in the initial HTML, empty, and write into it afterwards:
Verify: View initial page source (`curl -s`) — the `role="status"`/`aria-live` element must exist before the first update; a `display: none` region will not be in the accessibility tree.

#### A51 — role="alert" reserved for errors
Severity: low · Source: `.zflow/evidence/specweb/accessibility/status-messages.md`
Quote: - **`role="alert"`** — assertive. It interrupts whatever the screen reader is saying. Reserve it for errors and genuinely time-critical information.
Verify: Grep the rendered DOM for `role="alert"` — every hit should be an error or time-critical message, not a routine confirmation.

#### A52 — Paste allowed in credential and OTP fields
Severity: high · Source: `.zflow/evidence/specweb/accessibility/accessible-authentication.md`
Quote: - **Allow paste** into every field, including password and one-time-code inputs. Blocking paste forces manual transcription — the exact thing the criterion forbids.
Verify: On the login/ signup/ 2FA pages, attempt paste into password and code fields; `curl -s <page> | grep -iE 'onpaste|paste.*prevent|preventDefault'` for blockers.

#### A53 — Password-manager support via autocomplete tokens
Severity: high · Source: `.zflow/evidence/specweb/accessibility/accessible-authentication.md`
Quote: - **Support password managers.** Use proper `<input type="password">` fields with `autocomplete="current-password"` (or `new-password` when setting one) so managers fill and store credentials. Don't break this with custom widgets.
Verify: `curl -s <login-url> | grep -o '<input[^>]*type="password"[^>]*>'` — must include the autocomplete token; log in using only a password manager as a live check.

#### A54 — OTP fields marked one-time-code
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/accessible-authentication.md`
Quote: - **Let the platform handle OTPs.** Mark the field `autocomplete="one-time-code"` so the OS can offer the SMS code automatically instead of making the user read and retype it.
Verify: Inspect the 2FA/verification input markup for `autocomplete="one-time-code"`.

#### A55 — CAPTCHA not the only gate
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/accessible-authentication.md`
Quote: - **If you must use a CAPTCHA, don't make it the only gate.** Offer an alternative that isn't a puzzle, or use a non-interactive challenge.
Verify: Walk signup/login/contact flows and check any image puzzle has an alternative route (email link, audio, non-interactive challenge).

#### A56 — No redundant re-entry in multi-step flows
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/redundant-entry.md`
Quote: > Don't make people re-type information they already gave you in the same process. Auto-populate it, or let them pick it from what they entered a step ago.
Verify: Walk checkout/signup end to end noting any value typed more than once; trigger a late validation error and confirm earlier entries survive.

#### A57 — Correct autocomplete tokens on repeated fields
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/redundant-entry.md`
Quote: - **Lean on the platform.** Mark fields with the correct [`autocomplete`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete) tokens (`email`, `name`, `street-address`, `postal-code`) so the browser can fill repeated fields itself.
Verify: `curl -s <form-url> | grep -o 'autocomplete="[^"]*"'` and compare tokens against each field's purpose (also enables autofill for WCAG 1.3.5).

#### A58 — Help mechanisms in consistent relative order
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/consistent-help.md`
Quote: > If you offer help — a contact link, a phone number, a chat widget, an FAQ — put it in the same relative place on every page that has it. Moving it around is the failure.
Verify: `curl -s` several templates (home, product, checkout, login, 404) and compare the help affordance's DOM position relative to surrounding landmarks; Tab through pages in sequence — reached at the same relative point.

#### A59 — html lang declares page language
Severity: high · Source: `.zflow/evidence/specweb/accessibility/document-language.md`
Quote: > Set the page's primary language on <html lang> and mark any inline content in a different language with its own lang attribute, so screen readers pronounce it correctly.
Verify: `curl -s <page> | grep -o '<html[^>]*lang="[^"]*"'` — non-empty and matching the actual content language; axe `html-has-lang` / `html-lang-valid`.

#### A60 — lang uses valid BCP 47 tags
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/document-language.md`
Quote: - **Use BCP 47 tags.** `en`, `en-GB`, `pt-BR` — not `english` or `EN_GB`.
Verify: Read the lang value from the html tag and validate against the BCP 47 syntax; `lang=""` counts as missing.

#### A61 — Foreign-language passages marked with lang
Severity: low · Source: `.zflow/evidence/specweb/accessibility/document-language.md`
Quote: - Inline quotations in another language with no marker, mispronounced by every screen reader.
Verify: Review quoted foreign-language passages in page copy for a lang attribute on the wrapping element.

#### A62 — prefers-reduced-motion respected
Severity: high · Source: `.zflow/evidence/specweb/accessibility/reduced-motion.md`
Quote: > Respect the user's `prefers-reduced-motion` setting. Decorative animation, parallax, and autoplay can trigger vestibular distress, migraines, and seizures.
Verify: Chrome DevTools → Command menu → "Emulate CSS prefers-reduced-motion: reduce", reload — decorative animation should stop; `curl -s <css-urls> | grep -c 'prefers-reduced-motion'` to confirm the media query ships.

#### A63 — Motion >5s has pause/stop/hide
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/reduced-motion.md`
Quote: WCAG 2.2.2 Pause, Stop, Hide (Level A) requires that any moving, blinking, scrolling, or auto-updating content lasting more than five seconds can be paused or stopped. WCAG 2.3.3 (Level AAA) goes further: motion triggered by interaction must be disableable unless essential to the function.
Verify: Identify carousels, marquees, tickers, and background video on marketing pages; look for a visible pause control that is not hidden behind hover (touch devices).

#### A64 — Nothing flashes more than 3 times per second
Severity: high · Source: `.zflow/evidence/specweb/accessibility/reduced-motion.md`
Quote: - Confirm no content flashes more than three times in any one-second window.
Verify: Observe hero animations, video loops, and transition effects for >3 flashes per second (seizure risk, WCAG 2.3.1).

#### A65 — Autoplay video gated on reduced motion
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/reduced-motion.md`
Quote: Autoplaying background video should be gated on `prefers-reduced-motion: no-preference`, or shipped as a static poster image by default.
Verify: With reduce emulated, confirm hero background videos do not autoplay; view source for `autoplay` video elements and check for a matchMedia gate or poster default.

#### A66 — No third-party accessibility overlays
Severity: high · Source: `.zflow/evidence/specweb/accessibility/accessibility-overlays.md`
Quote: - Search the page source for known overlay scripts (`acsbapp.com`, `userway.org`, `equalweb.com`, `audioeye.com`). Remove them.
Verify: `curl -s <page> | grep -E 'acsbapp\.com|userway\.org|equalweb\.com|audioeye\.com'` — any hit fails.

#### A67 — Video provides synchronised captions
Severity: high · Source: `.zflow/evidence/specweb/accessibility/captions-and-transcripts.md`
Quote: For self-hosted video, attach a WebVTT caption file using the HTML5 `<track>` element with `kind="captions"`:
Verify: `curl -s <video-page> | grep -o '<track[^>]*kind="captions"'` on self-hosted video; on YouTube/Vimeo embeds open the player and check for uploaded (not auto) captions; play with sound off and follow from captions alone.

#### A68 — Audio content has an on-page transcript
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/captions-and-transcripts.md`
Quote: For audio-only content, publish a full transcript on the same page as the player — not behind a download link.
Verify: On episode pages, confirm transcript text is in the page DOM (`curl -s <episode> | grep -i transcript` or grep a quoted passage).

#### A69 — Meaningful visuals have audio description
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/captions-and-transcripts.md`
Quote: If visuals carry meaning the dialogue does not (an unspoken demo, a chart, an on-screen face), either record a version with descriptive narration baked in, add a `kind="descriptions"` track, or provide a media alternative in text.
Verify: Play the video with the screen off — if it cannot be followed from the soundtrack, check for a descriptions track or text alternative.

#### A70 — Track kind is captions, not subtitles
Severity: low · Source: `.zflow/evidence/specweb/accessibility/captions-and-transcripts.md`
Quote: - Setting `kind="subtitles"` when you mean `kind="captions"`.
Verify: Inspect `<track>` kind attributes and the VTT content for speaker labels and sound cues; validate the .vtt at a WebVTT validator.

#### A71 — Data tables use th + scope + caption
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/data-tables.md`
Quote: > Tabular data must use real <table> markup with a caption, header cells, and scope attributes so screen readers can announce row and column relationships.
Verify: `curl -s <page> | grep -A4 '<table'` — look for `<th` and `scope=`; axe flags missing th/scope and layout tables; screen-reader check announces row/column headers per cell.

#### A72 — No layout tables
Severity: low · Source: `.zflow/evidence/specweb/accessibility/data-tables.md`
Quote: - Using `<table>` for page layout or for form field alignment. Use CSS Grid or Flexbox instead.
Verify: Disable CSS — a layout table reads as nonsense top-to-bottom; axe layout-table heuristics.

#### A73 — Scrollable table wrappers are focusable
Severity: low · Source: `.zflow/evidence/specweb/accessibility/data-tables.md`
Quote: - Setting `overflow-x: auto` on a `<div>` with no `tabindex` — mouse users can scroll, keyboard users cannot.
Verify: At a narrow viewport, Tab to the wide-table region and arrow-scroll it; inspect the wrapper for `tabindex="0"` and `aria-label`/`role="region"`.

#### A74 — Interactive targets ≥ 24×24 CSS px
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/touch-target-size.md`
Quote: > Interactive controls must be large enough to tap or click reliably. WCAG 2.2 sets a 24×24 CSS px minimum, with 44×44 CSS px as the enhanced target.
Verify: DevTools-inspect computed width/height (bounding box) of buttons, checkboxes, and icon links at mobile layout — both ≥24px, aim 44; axe DevTools / Lighthouse flag WCAG 2.5.8 failures.

#### A75 — Sub-24px targets need 24px spacing
Severity: low · Source: `.zflow/evidence/specweb/accessibility/touch-target-size.md`
Quote: If a target genuinely must be smaller than 24 CSS px — for example, a dense data table — WCAG 2.5.8 allows it as long as a **24 px diameter circle around the target's centre does not overlap any other target**. The spacing alone satisfies the criterion.
Verify: For dense control clusters (share/like/bookmark button rows), measure centre-to-centre spacing — each target's 24px circle must not touch a neighbour's.

#### A76 — Dragging has a single-pointer alternative
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/dragging-movements.md`
Quote: > Anything you can drag must also work with a single pointer that never drags. Sliders, sortable lists, and drag-to-pan maps each need a click or tap alternative.
Verify: For each slider, sortable list, map, and carousel, complete the task using only single clicks/taps (press and release in one spot); keyboard support alone does not discharge this.

#### A77 — Carousels have prev/next buttons
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/dragging-movements.md`
Quote: - **Carousels.** Provide previous / next buttons; do not rely on swipe alone.
Verify: Inspect carousel markup for visible prev/next button controls; confirm alternatives are ≥24×24 px and visible without hover.

#### A78 — Drop zones have a file-input alternative
Severity: low · Source: `.zflow/evidence/specweb/accessibility/dragging-movements.md`
Quote: - **Drop targets.** Offer a click-to-select, then click-to-place flow, or a plain file input beside the drag-and-drop zone.
Verify: Inspect upload zones (support forms, avatar upload) for an `<input type="file">` alternative.

#### A79 — Collapsed content reachable by find-in-page
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/hidden-until-found.md`
Quote: > Use hidden="until-found" for collapsible content so that browser find-in-page, assistive tech, and search engines can still reach the text and auto-expand it.
Verify: In Chrome/Edge, Ctrl/Cmd+F a phrase that lives inside a collapsed FAQ panel — it should auto-expand and scroll; view source for `hidden="until-found"` or `<details>`.

#### A80 — No content-visibility: hidden substitute
Severity: low · Source: `.zflow/evidence/specweb/accessibility/hidden-until-found.md`
Quote: - Substituting `content-visibility: hidden` in author CSS as a "CSS equivalent" of the attribute. It is not — author-applied `content-visibility: hidden` hides content from find-in-page and screen readers in exactly the way the attribute is meant to avoid.
Verify: `curl -s <css> | grep -n 'content-visibility:\s*hidden'` on collapse-panel styles — hits are the wrong mechanism.

#### A81 — beforematch syncs widget state
Severity: low · Source: `.zflow/evidence/specweb/accessibility/hidden-until-found.md`
Quote: - Forgetting to update `aria-expanded` and the visual chevron state in the `beforematch` handler. The panel opens but the button still claims it is collapsed.
Verify: Trigger a find-in-page match on a collapsed panel, then inspect the toggle button's `aria-expanded` — it must read true.

#### A82 — Input text ≥ 16px, no zoom suppression
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/mobile-form-inputs.md`
Quote: > On a phone, the right input type, inputmode, and enterkeyhint summon the correct on-screen keyboard and a useful Enter key. Keep input text at 16px or larger so iOS Safari doesn't zoom on focus.
Verify: DevTools computed `font-size` on inputs/selects/textareas ≥16px; `curl -s <page> | grep -o '<meta name="viewport"[^>]*>'` — must not contain `maximum-scale=1`.

#### A83 — Correct input types and inputmode on mobile
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/mobile-form-inputs.md`
Quote: - `type="number"` for phone numbers, PINs, or card numbers. It strips leading zeros and adds a spinner. Use `type="tel"` or `inputmode="numeric"`.
Verify: Inspect checkout/contact forms: tel fields use `type="tel"` or `inputmode="numeric"`, email fields `type="email"`; focus each field on a real phone and confirm the keyboard layout and Enter-key label match the data.

#### A84 — Native interactive elements over div click handlers
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/native-interactive-elements.md`
Quote: > Prefer native HTML interactive elements — <button>, <a>, <details>/<summary>, <dialog> — over divs with click handlers. You get keyboard support, focus management, and assistive-tech semantics for free.
Verify: `curl -s <page> | grep -cE '<div[^>]*(onclick|role="button")'` — hits are replacement candidates; keyboard-test each (reachable, operable, named).

#### A85 — Non-submit buttons declare type="button"
Severity: low · Source: `.zflow/evidence/specweb/accessibility/native-interactive-elements.md`
Quote: - **Forgetting `type="button"` inside a `<form>`.** A bare `<button>` defaults to `type="submit"` and submits the form on click.
Verify: Inspect non-submit buttons in form markup for `type="button"`; click them and confirm no accidental submission.

#### A86 — No a href="#" as a button
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/native-interactive-elements.md`
Quote: - **`<a href="#" onclick>` as a button.** Pollutes browser history, breaks middle-click and "open in new tab", and announces as a link in screen readers.
Verify: `curl -s <page> | grep -oE '<a [^>]*href="#"[^>]*>'` — hits with click behaviour are fails.

#### A87 — Invalid styling uses :user-invalid
Severity: low · Source: `.zflow/evidence/specweb/accessibility/css-state-selectors.md`
Quote: **Prefer `:user-invalid` over `:invalid`.** `:invalid` matches the moment the page loads, so every required-but-empty field renders red before the user has typed a character. `:user-invalid` waits for interaction or submission:
Verify: Reload a form with required fields — nothing should be red until interaction; `curl -s <css> | grep -n ':invalid'` vs `:user-invalid` on error styles.

#### A88 — Invalid state not colour-only
Severity: medium · Source: `.zflow/evidence/specweb/accessibility/css-state-selectors.md`
Quote: - Relying on colour alone for invalid state. Add an icon or text; the visual state must not be the only signal.
Verify: Grayscale screenshot of an interacted-with errored form — invalid fields must be identifiable without colour; confirm the accessible error message (`aria-invalid` + announced text) exists independently of the CSS state.

### 2.4 Security — 98 requirements

Transport and document hardening: CSP, TLS 1.2/1.3 with modern hardening, HSTS, mixed content, reporting endpoints, security.txt, nosniff, frame protection, Fetch Metadata, cross-origin isolation, Referrer-/Permissions-Policy, SRI, digest fields, Trusted Types, cookie attributes, Clear-Site-Data, and DNS-side assurances (CAA, RPKI, DNSSEC, DANE).

Checklist status (`meta/checklist.md`): **Required** — HTTPS and TLS, HSTS, X-Content-Type-Options, clickjacking protection, cookie attributes · **Avoid** — X-XSS-Protection · **Recommended** — TLS configuration hardening, mixed content, Content Security Policy, security.txt, Referrer-Policy, Permissions-Policy, Subresource Integrity.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### S1 — Serve a Content-Security-Policy response header on every HTML page.
Severity: high · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - `curl -sI https://example.com | grep -i content-security-policy` should return the header.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy` returns a policy on the homepage and inner templates.

#### S2 — Use default-src 'self' as the fallback fetch directive.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **`default-src 'self'`** — fallback for all fetch directives. Allow your own origin by default.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the policy contains `default-src 'self'` (or every fetch directive is explicitly enumerated); run the header through Google CSP Evaluator (csp-evaluator.withgoogle.com).

#### S3 — Control script-src with a per-response nonce plus 'strict-dynamic'.
Severity: high · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **`script-src`** — controls JavaScript. Use a per-response nonce; the `strict-dynamic` keyword lets a trusted script load further trusted scripts.
Verify: `curl -sI https://SITE/` twice — `script-src` contains a `'nonce-…'` token and `'strict-dynamic'`, and the nonce value differs between the two responses.

#### S4 — Generate a fresh nonce per response and embed it in every inline script tag.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: Generate a fresh nonce per response and embed it in every inline `<script>` tag.
Verify: Fetch the same page twice with `curl -s https://SITE/`; extract the nonce from the CSP header and from inline `<script nonce=…>` tags — header and tags agree per response and change across responses.

#### S5 — Never ship 'unsafe-inline' or 'unsafe-eval' in script-src unless guarded by a nonce with 'strict-dynamic'.
Severity: high · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **`unsafe-inline` or `unsafe-eval` standing alone.** As above, `'unsafe-inline'` only degrades safely with a nonce and `'strict-dynamic'` beside it; by itself it neutralises the protection, and `'unsafe-eval'` re-enables `eval()`. Use nonces or hashes.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy`, parse `script-src` — flag `unsafe-inline`/`unsafe-eval` unless `'strict-dynamic'` and a nonce are present; Google CSP Evaluator flags the same.

#### S6 — Do not use wildcard script-src such as * or https: alone.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **Wildcards like `script-src *` or `https:` alone.** Almost as bad as no policy at all.
Verify: Parse the deployed CSP header's `script-src` for `*` or a bare `https:` source; csp-evaluator.withgoogle.com reports wildcard weaknesses.

#### S7 — Set object-src 'none'.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **`object-src 'none'`** — kills Flash and plugin embeds.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `object-src 'none'`.

#### S8 — Set base-uri 'none'.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **`base-uri 'none'`** — blocks `<base>` tag injection attacks.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `base-uri 'none'`.

#### S9 — Switch from Content-Security-Policy-Report-Only to enforcing; do not ship report-only forever.
Severity: medium · Source: `.zflow/evidence/specweb/security/content-security-policy.md`
Quote: - **Shipping a report-only policy forever.** Use `Content-Security-Policy-Report-Only` to test, then switch to enforcing.
Verify: `curl -sI https://SITE/` — production pages carry `Content-Security-Policy` (enforcing), not only `Content-Security-Policy-Report-Only`.

#### S10 — Serve every page over HTTPS using TLS 1.2/1.3 only; disable SSL, TLS 1.0 and 1.1.
Severity: high · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - TLS 1.3 enabled, TLS 1.2 enabled, everything older disabled.
Verify: Qualys SSL Labs test (ssllabs.com/ssltest) protocols section shows only TLS 1.2/1.3 enabled; `openssl s_client -connect SITE:443 -tls1_1` fails the handshake.

#### S11 — Redirect every plain-HTTP request to HTTPS with a 301.
Severity: high · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: Redirect every HTTP request to HTTPS with a 301:
Verify: `curl -sI http://SITE/path` returns `301` with a `Location: https://…` header.

#### S12 — Serve the HTTP-to-HTTPS redirect on every hostname owned, including apex, www, and legacy subdomains.
Severity: medium · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: Serve the same redirect on every hostname you own, including the apex, `www`, and any legacy subdomains. After HTTPS works, add [HSTS](/spec/security/hsts/) so browsers stop trying HTTP at all.
Verify: `curl -sI http://example.com` and `curl -sI http://www.example.com` (plus known subdomains from crt.sh) each return a 301 to https.

#### S13 — Hold a valid CA-issued certificate covering both apex and www (no self-signed certificates in production).
Severity: high · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - A valid certificate on `www.example.com` but not the apex `example.com`, or vice versa.
Verify: `curl -vI https://example.com` and `curl -vI https://www.example.com` both complete the TLS handshake with no certificate errors; SSL Labs shows a publicly trusted, unexpired cert.

#### S14 — Serve the complete certificate chain, including the intermediate.
Severity: high · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - A complete certificate chain — serve the intermediate, not just the leaf.
Verify: `openssl s_client -connect SITE:443 -showcerts` lists the leaf plus intermediate; SSL Labs reports no chain issues.

#### S15 — Enable OCSP stapling.
Severity: medium · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - OCSP stapling on.
Verify: `openssl s_client -connect SITE:443 -status` reports an OCSP response status of successful.

#### S16 — Use ECDHE key exchange only, on TLS 1.2 as well as 1.3.
Severity: medium · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - ECDHE key exchange only, on TLS 1.2 as well as 1.3.
Verify: `openssl s_client -connect SITE:443 -tls1_2` shows a negotiated cipher beginning with ECDHE; SSL Labs cipher-suites section confirms no static/finit-field groups.

#### S17 — Do not carry DHE or RSA key-exchange suites in the TLS 1.2 configuration.
Severity: medium · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - Carrying `DHE` or RSA key exchange suites in a TLS 1.2 configuration written before July 2026. Both are now `MUST NOT`.
Verify: SSL Labs (or testssl.sh) lists all negotiated TLS 1.2 suites — none uses DHE or RSA key exchange.

#### S18 — Offer hybrid post-quantum key agreement X25519MLKEM768 on TLS 1.3.
Severity: low · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - Hybrid post-quantum key agreement offered on TLS 1.3 — `X25519MLKEM768`.
Verify: SSL Labs handshake details (or a current browser's DevTools security panel) show the TLS 1.3 negotiated group as X25519MLKEM768, not plain x25519.

#### S19 — Score A or A+ on the Qualys SSL Labs test.
Severity: medium · Source: `.zflow/evidence/specweb/security/https-tls.md`
Quote: - Run the [Qualys SSL Labs test](https://www.ssllabs.com/ssltest/) and aim for an A or A+.
Verify: Run ssllabs.com/ssltest against the domain and read the overall grade.

#### S20 — Turn TLS compression off.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **TLS compression off.** TLS-level compression leaks the contents of encrypted records through their length, which the CRIME attack used to recover session cookies. RFC 9325 says deployments **SHOULD NOT** support it. TLS 1.3 removed it entirely. This is separate from HTTP compression; see [compression](/spec/performance/compression/) for the related BREACH caveat.
Verify: Internet.nl website test HTTPS section reports TLS compression disabled; testssl.sh shows the same.

#### S21 — Support secure renegotiation but disable client-initiated renegotiation.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **Secure renegotiation on, client-initiated renegotiation off.** TLS 1.2 servers must support the `renegotiation_info` extension (RFC 5746), which fixes the 2009 plaintext injection attack; RFC 9325 makes it a **MUST**. Separately, disable renegotiation initiated by the client: it gives nothing to a website and lets a single client force repeated expensive handshakes, a cheap denial-of-service lever. TLS 1.3 has no renegotiation at all.
Verify: Internet.nl or testssl.sh renegotiation checks: secure renegotiation supported, client-initiated renegotiation rejected.

#### S22 — Keep 0-RTT off, or accept only replay-safe idempotent requests in early data.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **0-RTT off, or only for replay-safe requests.** TLS 1.3 early data (0-RTT) lets a returning client send its first request before the handshake finishes, but that data can be replayed by an attacker (RFC 9846, section 8). RFC 9325 says not to use it unless the application profile makes replay safe. For HTTP, RFC 8470 is that profile: only accept idempotent requests such as `GET` in early data, mark them with the `Early-Data: 1` header towards the origin, and answer `425 Too Early` for anything that changes state. If you cannot enforce that, leave 0-RTT off.
Verify: Internet.nl reports 0-RTT status; where a CDN accepts early data for POSTs, confirm the origin checks `Early-Data` or answers `425 Too Early`.

#### S23 — Enable Extended Main Secret for TLS 1.2.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **Extended Main Secret on (TLS 1.2).** The extension originally specified as "Extended Master Secret" (RFC 7627) binds the session keys to the whole handshake transcript, defeating the triple-handshake attack. RFC 9325 makes support a **MUST** for TLS 1.2. RFC 9846 renamed it "Extended Main Secret" and obsoleted RFC 7627 without changing how it works, so tools may use either name.
Verify: `openssl s_client -connect SITE:443 -tls1_2` (recent OpenSSL) reports Extended Main Secret used; Internet.nl lists it.

#### S24 — On TLS 1.2, use server cipher order or offer only strong (AEAD over ECDHE) suites.
Severity: low · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **Server cipher order on TLS 1.2, or only strong suites.** If the server offers a mix of strong and weaker suites, configure it to choose from its own preference list rather than the client's, with AEAD suites (`AES-GCM`, `ChaCha20-Poly1305`) over `ECDHE` first; otherwise an old or misconfigured client can steer the connection to the weakest suite you allow. The alternative is to offer only strong suites, in which case the order no longer matters. That is the approach the Mozilla "Intermediate" profile takes: it turns server preference off because every suite it lists is strong, and Internet.nl accepts that too. On TLS 1.3 every defined suite is strong, so the same reasoning applies.
Verify: SSL Labs "cipher order" and suite list for TLS 1.2 — either server preference is on or every suite is AEAD+ECDHE.

#### S25 — Use SHA-256 or stronger for the TLS 1.2 key-exchange signature; never SHA-1 or MD5.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **SHA-2 for the key-exchange signature.** In TLS 1.2 the server signs its key exchange parameters, and the hash for that signature is negotiated. SHA-1 and MD5 there **MUST NOT** be used (RFC 9155, cited by RFC 9325); offer SHA-256 or stronger only.
Verify: Internet.nl key-exchange hash check, or SSL Labs handshake signature algorithm for simulated TLS 1.2 clients.

#### S26 — Use certificate keys of adequate size: RSA at least 2048 bits or ECDSA on P-256 or larger.
Severity: medium · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **Certificate key of adequate size.** RSA keys of at least 2048 bits (RFC 9325 requires this), or ECDSA on P-256 or a larger curve. ECDSA P-256 is smaller and faster; many sites serve both an ECDSA and an RSA certificate and let the client choose.
Verify: SSL Labs certificate section reports the public key size/curve.

#### S27 — Serve a certificate chain signed with SHA-256 or stronger (no SHA-1 intermediates).
Severity: low · Source: `.zflow/evidence/specweb/security/tls-configuration.md`
Quote: - **Certificate signed with SHA-256 or stronger.** Publicly trusted CAs no longer issue SHA-1-signed certificates, so this mostly catches internal CAs, very old certificates, and SHA-1 intermediates left in a chain.
Verify: `openssl s_client -connect SITE:443 -showcerts` — every chain element's signature algorithm is SHA-256+; SSL Labs reports it.

#### S28 — Send Strict-Transport-Security with max-age=63072000 and includeSubDomains on HTTPS responses (max-age must not be 0).
Severity: high · Source: `.zflow/evidence/specweb/security/hsts.md`
Quote: Strict-Transport-Security: max-age=63072000; includeSubDomains
Verify: `curl -sI https://SITE/ | grep -i strict-transport-security` returns `max-age=63072000; includeSubDomains` (and max-age is not 0).

#### S29 — Omit the preload directive; do not submit the domain to the HSTS preload list.
Severity: low · Source: `.zflow/evidence/specweb/security/hsts.md`
Quote: - **`preload`** — opts in to the browser preload list. **No longer recommended** for most sites — the list's own operator now advises against it (see below), so leave it off unless you have a specific reason.
Verify: Header contains no `preload`; hstspreload.org does not list the domain.

#### S30 — Only set includeSubDomains when every subdomain works over HTTPS.
Severity: medium · Source: `.zflow/evidence/specweb/security/hsts.md`
Quote: - **Setting `includeSubDomains` without auditing subdomains.** Every subdomain — including internal tools, staging, and legacy services — must work over HTTPS. If `dev.example.com` is HTTP-only, you have just broken it.
Verify: Enumerate subdomains (crt.sh / DNS) and `curl -I https://<sub>.SITE` for each — all must succeed over HTTPS while the header carries includeSubDomains.

#### S31 — Serve every subresource over HTTPS — an HTTPS page must load nothing over plain HTTP.
Severity: high · Source: `.zflow/evidence/specweb/security/mixed-content.md`
Quote: > An HTTPS page that loads any subresource over HTTP is mixed content. Serve every subresource over HTTPS, and send the upgrade-insecure-requests CSP directive as a safety net.
Verify: `curl -s https://SITE/ | grep -oE '(src|href)="http://[^"]+"'` returns nothing (repeat for CSS files); browser DevTools console shows no mixed-content warnings.

#### S32 — Send the upgrade-insecure-requests CSP directive as a safety net.
Severity: medium · Source: `.zflow/evidence/specweb/security/mixed-content.md`
Quote: 2. **Send `upgrade-insecure-requests` as a safety net.** This CSP directive tells the browser to rewrite every `http://` subresource request (and same-origin navigation) to `https://` before it is sent:
Verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep upgrade-insecure-requests` matches.

#### S33 — Use explicit https:// subresource URLs, never protocol-relative // URLs.
Severity: low · Source: `.zflow/evidence/specweb/security/mixed-content.md`
Quote: - Using protocol-relative URLs (`//example.com/x.js`) and calling it solved; current guidance is explicit `https://`.
Verify: `curl -s https://SITE/ | grep -E '(src|href)="//'` returns nothing.

#### S34 — Send Reporting-Endpoints on HTML responses naming at least a default endpoint.
Severity: low · Source: `.zflow/evidence/specweb/security/reporting-endpoints.md`
Quote: 1. Send `Reporting-Endpoints` on HTML responses, naming at least a `default` endpoint and any policy-specific ones you need.
Verify: `curl -sI https://SITE/ | grep -i reporting-endpoints` returns a well-formed header that defines a `default=` endpoint.

#### S35 — Do not use the deprecated Report-To header or CSP report-uri.
Severity: low · Source: `.zflow/evidence/specweb/security/reporting-endpoints.md`
Quote: - **Using the deprecated `Report-To` header or CSP `report-uri`.** Migrate to `Reporting-Endpoints` plus `report-to`.
Verify: `curl -sI https://SITE/` shows no `Report-To` header, and the CSP uses `report-to` (not `report-uri`).

#### S36 — Publish /.well-known/security.txt over HTTPS returning 200 with Content-Type text/plain (the well-known path, not /security.txt).
Severity: low · Source: `.zflow/evidence/specweb/security/security-txt.md`
Quote: Create the file at `/.well-known/security.txt`. Serve it over HTTPS with `Content-Type: text/plain; charset=utf-8`.
Verify: `curl -sI https://SITE/.well-known/security.txt` returns 200 with `Content-Type: text/plain`; validate the file at securitytxt.org.

#### S37 — Include the required Contact field with a monitored contact URI.
Severity: low · Source: `.zflow/evidence/specweb/security/security-txt.md`
Quote: - **`Contact:`** — required. One or more `mailto:`, `https:`, or `tel:` URIs. Use a monitored mailbox or form.
Verify: `curl -s https://SITE/.well-known/security.txt | grep '^Contact:'` shows a mailto/https/tel URI.

#### S38 — Include a required, unexpired Expires field set roughly a year out.
Severity: low · Source: `.zflow/evidence/specweb/security/security-txt.md`
Quote: - **`Expires:`** — required. ISO 8601 timestamp. Set it to roughly a year out and update it before it lapses.
Verify: `curl -s https://SITE/.well-known/security.txt | grep '^Expires:'` — an ISO 8601 date in the future; securitytxt.org validator passes.

#### S39 — Send X-Content-Type-Options: nosniff on every response.
Severity: medium · Source: `.zflow/evidence/specweb/security/x-content-type-options.md`
Quote: Send the header on every response. Most web servers and CDNs let you set it globally; there is no reason to be selective.
Verify: `curl -sI https://SITE/ | grep -i x-content-type-options` prints `X-Content-Type-Options: nosniff` on HTML, assets, and API responses; securityheaders.com confirms.

#### S40 — The header value must be exactly the single token nosniff.
Severity: low · Source: `.zflow/evidence/specweb/security/x-content-type-options.md`
Quote: - **Multiple values.** The header takes one token, `nosniff`. Anything else is ignored or rejected.
Verify: Parse the header value from `curl -sI` — it equals `nosniff` exactly, with no additional tokens.

#### S41 — Pair nosniff with correct Content-Type labels on every response.
Severity: low · Source: `.zflow/evidence/specweb/security/x-content-type-options.md`
Quote: Pair `nosniff` with correct `Content-Type` headers on every response. The directive only helps if your server actually labels responses properly. JavaScript files must be served as `application/javascript` (or `text/javascript`), CSS as `text/css`, JSON as `application/json`, and so on.
Verify: `curl -sI https://SITE/app.js`, `/styles.css`, `/api.json` — Content-Type matches the file type.

#### S42 — Set CSP frame-ancestors, defaulting to 'none', as the clickjacking defence.
Severity: medium · Source: `.zflow/evidence/specweb/security/frame-ancestors.md`
Quote: Content-Security-Policy: frame-ancestors 'none'
Verify: `curl -sI https://SITE/ | grep -i frame-ancestors` shows the directive; a test page on another origin with `<iframe src="https://SITE">` refuses to load.

#### S43 — Also send X-Frame-Options (DENY or SAMEORIGIN) as the legacy fallback alongside CSP.
Severity: low · Source: `.zflow/evidence/specweb/security/frame-ancestors.md`
Quote: - **Setting only `X-Frame-Options`.** Modern policies, including allow-lists, live in CSP. Set both for now.
Verify: `curl -sI https://SITE/ | grep -i x-frame-options` returns DENY or SAMEORIGIN in addition to frame-ancestors.

#### S44 — Send the anti-framing headers on every HTML response, including login, signup, and OAuth screens.
Severity: medium · Source: `.zflow/evidence/specweb/security/frame-ancestors.md`
Quote: Send the headers on every HTML response. Send them even on pages that "wouldn't make sense" framed; attackers will frame anything that performs an authenticated action.
Verify: `curl -sI` on homepage, /login, /signup, /password-reset — each carries frame-ancestors and/or X-Frame-Options.

#### S45 — Do not use the unsupported X-Frame-Options ALLOW-FROM value.
Severity: low · Source: `.zflow/evidence/specweb/security/frame-ancestors.md`
Quote: - **`ALLOW-FROM`.** Deprecated and unsupported. Use `frame-ancestors`.
Verify: Parse the X-Frame-Options value — it is not ALLOW-FROM.

#### S46 — Enforce a resource isolation policy that rejects remaining non-exempt cross-site requests with 403.
Severity: medium · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: 5. Reject the remaining non-exempt cross-site requests, normally with `403`.
Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: no-cors' -H 'Sec-Fetch-Dest: image'` returns 403.

#### S47 — Do not block cross-site navigations outright — ordinary inbound links must keep working.
Severity: medium · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: - **Blocking `cross-site` navigations outright.** Every inbound link from another site is `Sec-Fetch-Site: cross-site` with `Sec-Fetch-Mode: navigate`. Block those and your site becomes unreachable from search results.
Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/ -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document'` returns the page's normal response code.

#### S48 — Allow a cross-site navigation only when the method is GET, mode is navigate, and dest is neither object nor embed.
Severity: medium · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: 4. For cross-site requests, allow a navigation only when **all three** conditions hold: the method is `GET`, `Sec-Fetch-Mode` is `navigate`, and `Sec-Fetch-Dest` is neither `object` nor `embed`.
Verify: Repeat the curl probe with `-H 'Sec-Fetch-Dest: object'` then `embed` — both rejected; with `document` — allowed.

#### S49 — Absent Sec-Fetch headers must not bypass the endpoint's existing authentication and CSRF checks.
Severity: medium · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: - **Treating missing headers as proof of safety.** Use the endpoint's existing CSRF and authentication checks when metadata is absent; many non-browser clients omit it.
Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings` with no Sec-Fetch headers still returns an auth redirect/401/403, not the authenticated page.

#### S50 — Add Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest to Vary on cacheable responses the policy changes.
Severity: low · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: When the policy changes a cacheable response, include the request fields it uses in `Vary`, as the [W3C deployment guidance](https://www.w3.org/TR/fetch-metadata/#vary) explains. For the policy above, append `Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest` to any existing `Vary` fields on allowed and denied responses. Otherwise a cache can reuse an allowed response for a request the policy would reject, or serve a cached denial to a legitimate visitor.
Verify: `curl -sI` an allowed and a denied response — the `Vary` field lists the three Sec-Fetch headers.

#### S51 — Never require Sec-Fetch-User in the policy.
Severity: low · Source: `.zflow/evidence/specweb/security/fetch-metadata.md`
Quote: - **Requiring `Sec-Fetch-User`.** Safari does not send it. A rule that demands it locks out Safari users entirely.
Verify: Policy/config review shows no Sec-Fetch-User condition; observable as the site remaining functional in Safari.

#### S52 — Send COOP and CORP on every HTML response as a baseline.
Severity: medium · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: Send COOP and CORP on every HTML response as a baseline:
Verify: `curl -sI https://SITE/ | grep -iE 'cross-origin-(opener|resource)-policy'` returns both headers.

#### S53 — Set Cross-Origin-Opener-Policy to same-origin.
Severity: medium · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: Cross-Origin-Opener-Policy: same-origin
Verify: `curl -sI https://SITE/ | grep -i cross-origin-opener-policy` shows `same-origin` (or `same-origin-allow-popups` where popup flows exist).

#### S54 — Set Cross-Origin-Resource-Policy to same-site.
Severity: medium · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: Cross-Origin-Resource-Policy: same-site
Verify: `curl -sI https://SITE/ | grep -i cross-origin-resource-policy` shows `same-site` (or `cross-origin` for genuinely public embeddable assets).

#### S55 — Relax COOP to same-origin-allow-popups on pages that rely on OAuth or payment pop-ups.
Severity: low · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: If your site relies on OAuth or payment pop-ups, relax COOP to `same-origin-allow-popups` so the pop-up flow keeps working while isolated pages stay protected.
Verify: On pages that open popup flows, `curl -sI` shows `Cross-Origin-Opener-Policy: same-origin-allow-popups` and the popup flow completes in a browser.

#### S56 — Add COEP require-corp only when isolation-gated APIs are actually needed.
Severity: low · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: Only add `Cross-Origin-Embedder-Policy: require-corp` if you actually need `SharedArrayBuffer` or other isolation-gated APIs — it forces every cross-origin subresource to opt in, which often breaks third-party embeds until each one sends CORP or CORS. Treat full isolation as opt-in, not a default.
Verify: `curl -sI https://SITE/ | grep -i cross-origin-embedder-policy` — COEP absent unless the site uses SharedArrayBuffer etc.; where present, DevTools `self.crossOriginIsolated` is true.

#### S57 — Serve CORP cross-origin on assets meant to be hot-linked by others.
Severity: low · Source: `.zflow/evidence/specweb/security/cross-origin-isolation.md`
Quote: - **Serving CORP `same-origin` on assets meant to be hot-linked** (a public CDN, embeddable widget). Use `cross-origin` for genuinely public resources.
Verify: `curl -sI https://cdn.SITE/public-asset` shows `Cross-Origin-Resource-Policy: cross-origin` for resources other sites legitimately embed.

#### S58 — Send Referrer-Policy: strict-origin-when-cross-origin on HTML responses.
Severity: medium · Source: `.zflow/evidence/specweb/security/referrer-policy.md`
Quote: Referrer-Policy: strict-origin-when-cross-origin
Verify: `curl -sI https://SITE/ | grep -i referrer-policy` shows `strict-origin-when-cross-origin`.

#### S59 — Set the header explicitly rather than relying on browser defaults.
Severity: low · Source: `.zflow/evidence/specweb/security/referrer-policy.md`
Quote: - **Relying on the browser default.** Different browsers historically used different defaults. Be explicit.
Verify: Spot-check `curl -sI` across HTML templates (home, article, product) — the header is present on each, not only some.

#### S60 — Use a stricter policy (same-origin or no-referrer) on pages with sensitive URLs such as password reset and account settings.
Severity: medium · Source: `.zflow/evidence/specweb/security/referrer-policy.md`
Quote: Use a stricter policy (`same-origin` or `no-referrer`) on pages with sensitive URLs — password reset, account settings, internal tools.
Verify: `curl -sI https://SITE/password-reset | grep -i referrer-policy` shows `same-origin`/`no-referrer`, or the page carries `<meta name="referrer" content="no-referrer">`.

#### S61 — Never use the unsafe-url policy.
Severity: medium · Source: `.zflow/evidence/specweb/security/referrer-policy.md`
Quote: - **`unsafe-url`** — always sends the full URL. Avoid.
Verify: Parse the Referrer-Policy value from `curl -sI` — it must not be `unsafe-url`.

#### S62 — Send Permissions-Policy on every HTML response, denying features the site does not use.
Severity: medium · Source: `.zflow/evidence/specweb/security/permissions-policy.md`
Quote: Send the header on every HTML response. Start by denying everything you do not use:
Verify: `curl -sI https://SITE/ | grep -i permissions-policy` returns a header with empty allow-lists for unused features.

#### S63 — Disable camera, microphone, geolocation, and payment when the site does not use them.
Severity: medium · Source: `.zflow/evidence/specweb/security/permissions-policy.md`
Quote: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Verify: Parse the header for `camera=()`, `microphone=()`, `geolocation=()`, `payment=()` unless the feature is genuinely used; check effective policy at permissionspolicy.com.

#### S64 — Use the Permissions-Policy structured syntax, not the legacy Feature-Policy header.
Severity: low · Source: `.zflow/evidence/specweb/security/permissions-policy.md`
Quote: - **Using the older `Feature-Policy` syntax.** Permissions-Policy uses structured headers with `()` lists, not space-separated origins.
Verify: `curl -sI https://SITE/ | grep -iE 'permissions-policy|feature-policy'` — Permissions-Policy with `()` lists present, no Feature-Policy header.

#### S65 — Do not allow * to make an iframe work — scope allowances to the specific origin.
Severity: low · Source: `.zflow/evidence/specweb/security/permissions-policy.md`
Quote: - **Allowing `*` to "fix" a broken iframe.** Narrow it to the specific origin instead.
Verify: Parse the header for any `=*` allowance (none expected); embedded iframes' `allow` attributes name only the features they need.

#### S66 — Give every third-party script and stylesheet an integrity attribute (SHA-384 of the exact file) plus crossorigin="anonymous".
Severity: medium · Source: `.zflow/evidence/specweb/security/subresource-integrity.md`
Quote: For every external script or stylesheet, compute a SHA-384 hash of the exact file content and include it in the `integrity` attribute. Add `crossorigin="anonymous"` so the browser sends a CORS request and can verify the response without credentials.
Verify: `curl -s https://SITE/ | grep -oE '<(script|link)[^>]+(src|href)="https?://[^"]+"[^>]*>'` — every third-party tag carries both `integrity="sha384-…"` and `crossorigin="anonymous"`.

#### S67 — Pin third-party assets to immutable versioned URLs, never a "latest" CDN URL.
Severity: low · Source: `.zflow/evidence/specweb/security/subresource-integrity.md`
Quote: - **Pinning to a "latest" CDN URL.** The hash and the URL must match a specific immutable version. Use `/widget@1.2.3/widget.js`, never `/widget/widget.js`.
Verify: Inspect third-party URLs in the HTML for version segments; re-fetching the URL later returns byte-identical content.

#### S68 — Ship Integrity-Policy-Report-Only as a site-wide tripwire for unhashed scripts.
Severity: low · Source: `.zflow/evidence/specweb/security/subresource-integrity.md`
Quote: Integrity-Policy-Report-Only: blocked-destinations=(script), endpoints=(integrity-endpoint)
Verify: `curl -sI https://SITE/ | grep -i integrity-policy` returns the report-only header naming blocked destinations and an endpoint.

#### S69 — If digest fields are emitted, use sha-256 or sha-512 — the only Active IANA algorithms — never md5 or sha-1.
Severity: low · Source: `.zflow/evidence/specweb/security/digest-fields.md`
Quote: Hash the body and emit the field. Use `sha-256` or `sha-512`, the only algorithms the [IANA registry](https://www.iana.org/assignments/http-digest-hash-alg/http-digest-hash-alg.xhtml) marks `Active`.
Verify: `curl -sI https://SITE/data.json | grep -iE '^(content|repr)-digest'` — the algorithm token is sha-256 or sha-512.

#### S70 — Emit digests on machine-readable endpoints clients act on, and ensure they match the bytes received.
Severity: low · Source: `.zflow/evidence/specweb/security/digest-fields.md`
Quote: Spend the effort where a client will act on it: JSON APIs, file downloads, and machine-readable endpoints that agents fetch and cache. Browsers do not automatically validate `Content-Digest` or `Repr-Digest`; `Unencoded-Digest` has separate, limited browser support.
Verify: `curl -sS -D h.txt -o body https://SITE/data.json`; `grep -i '^content-digest' h.txt`; `echo "sha-256=:$(openssl dgst -sha256 -binary body | openssl base64 -A):"` — the two lines match byte for byte, with and without `Accept-Encoding: gzip`.

#### S71 — Enable require-trusted-types-for 'script' with an explicit trusted-types policy allowlist.
Severity: medium · Source: `.zflow/evidence/specweb/security/trusted-types.md`
Quote: Content-Security-Policy: require-trusted-types-for 'script'; trusted-types escape
Verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep "require-trusted-types-for"`; in DevTools on the live page, `document.body.innerHTML = '<img src=x>'` throws a TypeError.

#### S72 — Deploy Trusted Types in report-only mode first, then switch to enforcing.
Severity: low · Source: `.zflow/evidence/specweb/security/trusted-types.md`
Quote: 1. **Deploy in report-only first** so you can find every sink your code touches without breaking the page:
Verify: Rollout artifacts show `Content-Security-Policy-Report-Only` with the directives before the enforcing header appears in `curl -sI`.

#### S73 — Name the allowed policies in the trusted-types directive.
Severity: low · Source: `.zflow/evidence/specweb/security/trusted-types.md`
Quote: - **Omitting `trusted-types`.** Without the allowlist, code can create a policy of any name, including a malicious one; name your policies explicitly.
Verify: Parse the CSP header — a `trusted-types` directive with explicit policy names accompanies `require-trusted-types-for 'script'`.

#### S74 — The default policy must sanitise input (e.g. DOMPurify), not pass it through unchanged.
Severity: medium · Source: `.zflow/evidence/specweb/security/trusted-types.md`
Quote: - **A pass-through default policy** that returns its input unchanged — it satisfies the type check while re-opening the exact hole you closed.
Verify: On a live search/results page, inject markup with an event handler into a reflected parameter (e.g. `?q=<img src=x onerror=1>`) — the handler is stripped in the rendered DOM; the policy definition in shipped JS calls a sanitiser.

#### S75 — Send no X-XSS-Protection header at all — delete it.
Severity: low · Source: `.zflow/evidence/specweb/security/x-xss-protection.md`
Quote: Delete the header.
Verify: `curl -sI https://SITE/ | grep -i x-xss-protection` returns nothing (check through the full CDN/WAF chain, not just origin).

#### S76 — If a checklist forces the header to be present, its only acceptable value is 0 — never 1 or 1; mode=block.
Severity: low · Source: `.zflow/evidence/specweb/security/x-xss-protection.md`
Quote: Removing it entirely is better than setting `X-XSS-Protection: 0`. The zero value existed to switch off a filter that no longer exists; sending it now just documents that you once had to think about this. If a compliance checklist insists the header be present with a specific value, `0` is the only value to give it — never `1` or `1; mode=block`.
Verify: Parse the X-XSS-Protection value if present — it must be `0`, not `1` or `1; mode=block`.

#### S77 — Confirm the replacement landed: a CSP whose script-src has no 'unsafe-inline'.
Severity: medium · Source: `.zflow/evidence/specweb/security/x-xss-protection.md`
Quote: - Confirm the replacement actually landed: the response carries a `Content-Security-Policy` whose `script-src` has no `'unsafe-inline'`.
Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the script-src directive carries no standalone `'unsafe-inline'`.

#### S78 — Set Secure, HttpOnly (where possible), and an explicit SameSite on every cookie.
Severity: high · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: Set these attributes on every cookie unless you have a specific reason not to.
Verify: `curl -sI https://SITE/ | grep -i set-cookie` — each Set-Cookie carries Secure, HttpOnly (unless JS must read it), and SameSite; DevTools → Application → Cookies shows the same per row.

#### S79 — Every cookie that carries identity must have the Secure attribute.
Severity: high · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: - **`Secure`** — sent only over HTTPS. Mandatory on any cookie that carries identity. Required for `SameSite=None`.
Verify: Inspect all Set-Cookie headers (curl plus DevTools after sign-in) — session/auth cookies all carry `Secure`.

#### S80 — Every session cookie must be HttpOnly.
Severity: high · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: - **`HttpOnly`** — not exposed to `document.cookie`. Use on every session cookie. Skip it on cookies your JavaScript genuinely needs to read (preferences, A/B test bucket).
Verify: Signed in, run `document.cookie` in DevTools console — the session cookie is absent; DevTools cookie table shows HttpOnly ticked.

#### S81 — Use the __Host- prefix for session cookies.
Severity: medium · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: Use `__Host-` for session cookies whenever you can. It blocks subdomain takeover from rewriting the session cookie.
Verify: Inspect Set-Cookie after sign-in — the session cookie name starts `__Host-`.

#### S82 — __Host- cookies must be Secure, Path=/, and carry no Domain attribute.
Severity: low · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: - **`__Host-`** — name starts with `__Host-`, the cookie must be `Secure`, must have `Path=/`, and must not have a `Domain` attribute. Pins the cookie to the exact host.
Verify: Parse the `__Host-` Set-Cookie header — attributes are exactly Secure, Path=/, no Domain; the browser accepts it.

#### S83 — Any SameSite=None cookie must also carry Secure.
Severity: medium · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: - **`SameSite=None` without `Secure`.** Modern browsers reject the cookie outright.
Verify: Parse every Set-Cookie with `SameSite=None` — each also carries `Secure`; DevTools shows the cookie actually stored.

#### S84 — Always set an explicit Path and a Max-Age or Expires on cookies.
Severity: low · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: Always set an explicit `Path`, `Max-Age` or `Expires`, and a sensible value length. Avoid `Domain=example.com` unless you really need the cookie on subdomains.
Verify: Parse Set-Cookie headers — Path and Max-Age/Expires present; Domain absent unless subdomain sharing is intended.

#### S85 — Do not treat SameSite as complete CSRF defence — pair it with CSRF tokens or a Sec-Fetch-Site check, and keep state changes out of GET.
Severity: medium · Source: `.zflow/evidence/specweb/security/cookie-attributes.md`
Quote: - **Treating `SameSite` as a complete CSRF defence.** It is defence in depth, not a replacement for anti-CSRF tokens. `SameSite=Lax` still sends the cookie on top-level GET navigations, so a state-changing request reachable by `GET` and triggered from another site keeps the session attached; and `SameSite` keys on the registered domain, not the origin, so it trusts every subdomain. Pair it with per-request CSRF tokens or a `Sec-Fetch-Site` check for state-changing endpoints.
Verify: View source of authenticated forms — CSRF token fields present; state-changing endpoints reject cross-site requests (see the Fetch-Metadata curl probe) and are not reachable by plain GET.

#### S86 — Send Clear-Site-Data on the sign-out response, listing the data types to clear.
Severity: low · Source: `.zflow/evidence/specweb/security/clear-site-data.md`
Quote: Send the header on the response that confirms the sign-out — the `/logout` redirect or its landing page — listing the data types you actually want gone:
Verify: `curl -sI https://SITE/logout | grep -i clear-site-data` shows the header with quoted tokens; after sign-out, DevTools → Application shows cookies and storage empty.

#### S87 — Never send Clear-Site-Data site-wide — only on the exact responses that should clear data.
Severity: medium · Source: `.zflow/evidence/specweb/security/clear-site-data.md`
Quote: Scope it to the exact responses that should clear data. Never send it site-wide: a stray `Clear-Site-Data` on every response wipes the user's session on each request.
Verify: `curl -sI https://SITE/` and other normal pages — the header is absent everywhere except the sign-out flow.

#### S88 — Clear-Site-Data values must be quoted tokens.
Severity: low · Source: `.zflow/evidence/specweb/security/clear-site-data.md`
Quote: - **Omitting the quotes.** `Clear-Site-Data: cookies` is invalid; the value must be `"cookies"`.
Verify: Parse the header — every directive is a double-quoted token such as `"cache", "cookies", "storage"`.

#### S89 — Publish at least one CAA record at the domain apex restricting which CAs may issue.
Severity: medium · Source: `.zflow/evidence/specweb/security/caa-records.md`
Quote: Add CAA records at the apex of your domain. They cover all subdomains unless overridden.
Verify: `dig CAA example.com +short` returns one or more records.

#### S90 — Set issuewild explicitly so wildcard issuance does not silently inherit the issue tag.
Severity: low · Source: `.zflow/evidence/specweb/security/caa-records.md`
Quote: - **Forgetting `issuewild`.** Without it, issuance of wildcards inherits the `issue` tag, which may be more permissive than you intend.
Verify: `dig CAA example.com +short` includes an `issuewild` entry (e.g. `issuewild ";"` when wildcards are not used).

#### S91 — Include an iodef contact for CA incident reports.
Severity: low · Source: `.zflow/evidence/specweb/security/caa-records.md`
Quote: - **`iodef`** — an email or URL where CAs report failed checks (Incident Object Description Exchange Format).
Verify: `dig CAA example.com +short` includes an `iodef "mailto:…"` record.

#### S92 — The prefixes holding the site's servers must be RPKI-valid (covered by a ROA with matching origin ASN).
Severity: medium · Source: `.zflow/evidence/specweb/security/rpki.md`
Quote: 2. Check their RPKI status in the same tool. You want **valid** for every one.
Verify: Look up the site's A/AAAA addresses on stat.ripe.net — RPKI validation status reads "valid"; the Internet.nl website test RPKI section agrees.

#### S93 — Check the name servers and MX hosts' prefixes too, not just the web server.
Severity: low · Source: `.zflow/evidence/specweb/security/rpki.md`
Quote: - **Checking only the web server.** The name servers and mail servers are in other prefixes, often run by other providers.
Verify: Resolve NS and MX targets, look up each address's prefix on RIPEstat — every one is RPKI-valid.

#### S94 — If DNSSEC is deployed, the full chain must validate: signed zone plus DS record at the parent.
Severity: low · Source: `.zflow/evidence/specweb/security/dnssec.md`
Quote: 4. **Verify the chain.** Use `dig +dnssec` or [Verisign DNSSEC Debugger](https://dnssec-analyzer.verisignlabs.com/) to confirm every signature validates and the `DS` at the parent matches.
Verify: `dig +dnssec example.com` returns RRSIG records with the `ad` flag; Verisign DNSSEC Debugger or DNSViz shows a green chain to the root.

#### S95 — Use DNSSEC algorithm 13 (ECDSA P-256 with SHA-256) as the modern default.
Severity: low · Source: `.zflow/evidence/specweb/security/dnssec.md`
Quote: Algorithm 13 (ECDSA P-256 with SHA-256) is the recommended modern default; it is small, fast, and widely supported.
Verify: `dig DNSKEY example.com +short` — the KSK (flag 257) uses algorithm 13.

#### S96 — A signed zone must also publish the DS record — signing without DS provides no protection.
Severity: low · Source: `.zflow/evidence/specweb/security/dnssec.md`
Quote: - **Signing the zone but never publishing the `DS`.** Resolvers ignore the signatures — no protection.
Verify: Verisign DNSSEC Debugger shows a DS at the parent zone matching the child's KSK.

#### S97 — A TLSA record for HTTPS is only meaningful in a DNSSEC-signed zone; without DNSSEC, do not bother.
Severity: low · Source: `.zflow/evidence/specweb/security/dane.md`
Quote: 1. **Sign the zone with DNSSEC** and confirm the chain validates. Without this, stop.
Verify: `dig +dnssec TLSA _443._tcp.www.SITE` — if records exist, confirm the zone's DNSSEC chain validates (ad flag / DNSViz); if the zone is unsigned, no TLSA should be published.

#### S98 — Publish TLSA at _443._tcp. plus the exact hostname clients connect to.
Severity: low · Source: `.zflow/evidence/specweb/security/dane.md`
Quote: - **Publishing `TLSA` for the wrong name.** It belongs at `_443._tcp.` plus the exact host name clients connect to, for each host name.
Verify: `dig +dnssec TLSA _443._tcp.www.example.com` returns the record with the `ad` flag from a validating resolver, for each served hostname.

### 2.5 Well-Known URIs — 45 requirements

IANA-registered metadata under /.well-known/: general serving rules plus per-file contracts for change-password, webauthn, OpenID/OAuth discovery, gpc.json, api-catalog, webfinger, AASA, assetlinks, nodeinfo, and traffic-advice.

Numbering preserved from the distilled section (items 1–45), prefixed `WK-` for uniqueness.

Checklist status (`meta/checklist.md`): **Recommended** — well-known overview, api-catalog.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### WK-1 — Well-known resources must be served under the /.well-known/ prefix with the leading dot, at the exact spec-defined name
Severity: medium · Source: `.zflow/evidence/specweb/well-known/well-known-overview.md`
Quote: - Publishing under `/well-known/` (no leading dot). The spec requires `/.well-known/`.
Verify: For each well-known resource the site exposes, `curl -sI https://example.com/.well-known/<name>` returns the document, and probing the dot-less `/well-known/<name>` variant (`curl -s -o /dev/null -w '%{http_code}' https://example.com/well-known/<name>`) is not the canonical location; compare the name spelling against the IANA well-known registry.

#### WK-2 — Well-known resources must be served over HTTPS on the canonical host
Severity: medium · Source: `.zflow/evidence/specweb/well-known/well-known-overview.md`
Quote: - Serve the resource over **HTTPS** on the canonical host.
Verify: `curl -sI https://example.com/.well-known/<name>` returns 200 with a valid certificate; the plain-HTTP request `curl -sI http://example.com/.well-known/<name>` upgrades/redirects to HTTPS.

#### WK-3 — Well-known resources must pass through CDN, firewall, and auth middleware — no login wall, no user-agent blocking
Severity: medium · Source: `.zflow/evidence/specweb/well-known/well-known-overview.md`
Quote: - Allow your CDN, firewall and authentication middleware to pass through. A well-known URI behind a login wall is invisible.
Verify: From a network outside the site's own (read-only probe, no cookies): `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (compatible; auditor)' https://example.com/.well-known/<name>` returns 200, not 401/403/429.

#### WK-4 — Only IANA-registered names may be published under /.well-known/
Severity: low · Source: `.zflow/evidence/specweb/well-known/well-known-overview.md`
Quote: - **Do not invent new names.** If you need a new well-known URI, register it via the IETF process described in RFC 8615 §3.
Verify: Enumerate the site's well-known paths (Link headers, HTML references, common-probe list) and cross-check each name against https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml.

#### WK-5 — Each well-known resource must be served with the Content-Type its spec defines
Severity: medium · Source: `.zflow/evidence/specweb/well-known/well-known-overview.md`
Quote: - Set the **correct Content-Type** (often `application/json`, sometimes plain text or JSON variants like `application/jrd+json`).
Verify: `curl -sI https://example.com/.well-known/<name> | grep -i '^content-type:'` returns the spec's media type, not text/html.

#### WK-6 — Sites with user accounts must serve a 302/303 redirect at /.well-known/change-password
Severity: medium · Source: `.zflow/evidence/specweb/well-known/change-password.md`
Quote: Serve an HTTP **302** (or **303**) redirect from `/.well-known/change-password` to your actual change-password page.
Verify: `curl -sI https://example.com/.well-known/change-password` shows status 302 or 303 with a `Location:` header.

#### WK-7 — The redirect destination must be the change-password page, not the forgot-password reset or sign-up flow
Severity: medium · Source: `.zflow/evidence/specweb/well-known/change-password.md`
Quote: - The destination must be the page where a logged-in user can **change their existing password** — not the password reset flow for forgotten passwords, and not the sign-up page.
Verify: `loc=$(curl -sI https://example.com/.well-known/change-password | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')` then inspect the URL path and `curl -sL "$loc" | grep -iE 'forgot|reset|sign-?up|create.account'` — the destination must not be the reset or registration page.

#### WK-8 — Sites with user accounts must not return 404 at /.well-known/change-password
Severity: medium · Source: `.zflow/evidence/specweb/well-known/change-password.md`
Quote: - Do not return **404**. A 404 tells password managers the feature is not supported.
Verify: `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/change-password` is not 404 for sites that have a login flow.

#### WK-9 — Sites using passkeys across multiple origins must publish /.well-known/webauthn as application/json with a full-origins array
Severity: medium · Source: `.zflow/evidence/specweb/well-known/webauthn.md`
Quote: - Include an `origins` array of the full origins (scheme + host) allowed to use this RP ID's passkeys.
Verify: `curl -sI https://example.com/.well-known/webauthn` shows 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/webauthn | jq -e '.origins | type == "array" and all(.[]; test("^https?://"))'` returns true.

#### WK-10 — /.well-known/webauthn must be fetchable without credentials and without a Referer header
Severity: medium · Source: `.zflow/evidence/specweb/well-known/webauthn.md`
Quote: - The browser fetches it **without credentials and without a `Referer` header**, so do not gate it behind cookies, authentication, or a WAF rule that blocks header-less requests.
Verify: `curl -s -o /dev/null -w '%{http_code}' -H 'Cookie:' -H 'Referer:' https://example.com/.well-known/webauthn` returns 200 (curl sends no Referer by default, matching the browser's fetch).

#### WK-11 — The webauthn origins array must not list more than five distinct registrable domains, important origins first
Severity: low · Source: `.zflow/evidence/specweb/well-known/webauthn.md`
Quote: - Listing more registrable domains than the browser will honour. Implementations cap the number of distinct registrable domains processed (five in current browsers) — order the array so the important origins come first.
Verify: `curl -s https://example.com/.well-known/webauthn | jq '[.origins[] | capture("^https?://(?<h>[^/]+)").h] | unique | length'` is ≤ 5.

#### WK-12 — OIDC providers must publish a valid openid-configuration JSON with the required endpoints
Severity: high · Source: `.zflow/evidence/specweb/well-known/openid-configuration.md`
Quote: The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint` and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; `curl -sI` the same URL shows `Content-Type: application/json`.

#### WK-13 — The openid-configuration issuer must exactly match the URL clients use, with no trailing slash
Severity: high · Source: `.zflow/evidence/specweb/well-known/openid-configuration.md`
Quote: - The `issuer` value must **exactly match** the URL clients use, including scheme and absence of trailing slash. Mismatches are the single most common cause of "invalid issuer" errors.
Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -r .issuer` equals the advertised issuer URL exactly (string compare; flag any trailing slash, port, or casing difference).

#### WK-14 — The openid-configuration jwks_uri must be reachable and return current signing keys
Severity: high · Source: `.zflow/evidence/specweb/well-known/openid-configuration.md`
Quote: - The `jwks_uri` must be reachable and return current signing keys.
Verify: `curl -s "$(curl -s https://login.example.com/.well-known/openid-configuration | jq -r .jwks_uri)" | jq -e '.keys | length > 0'` returns true.

#### WK-15 — openid-configuration must set a minutes-to-hours Cache-Control, not days
Severity: low · Source: `.zflow/evidence/specweb/well-known/openid-configuration.md`
Quote: - Set `Cache-Control` sensibly — minutes to hours, not days. Clients re-fetch on errors.
Verify: `curl -sI https://login.example.com/.well-known/openid-configuration | grep -i cache-control` shows a max-age in the minutes-to-hours range (≤ 86400, not multi-day values).

#### WK-16 — Plain OAuth 2.0 authorization servers must publish valid metadata with issuer, endpoints, and jwks_uri
Severity: high · Source: `.zflow/evidence/specweb/well-known/oauth-authorization-server.md`
Quote: The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
Verify: `curl -s https://login.example.com/.well-known/oauth-authorization-server | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; issuer string-compares exactly to the advertised issuer URL.

#### WK-17 — Path-bearing issuers must serve oauth-authorization-server with the well-known segment inserted before the path (RFC 8414)
Severity: medium · Source: `.zflow/evidence/specweb/well-known/oauth-authorization-server.md`
Quote: The one rule that trips people up: for an issuer that has a **path component**, RFC 8414 _inserts_ the well-known segment before the path — issuer `https://example.com/tenant1` → `https://example.com/.well-known/oauth-authorization-server/tenant1` — whereas OIDC _appends_ it (`https://example.com/tenant1/.well-known/openid-configuration`). Get this wrong and multi-tenant clients cannot find you.
Verify: For issuer `https://example.com/tenant1`, `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/oauth-authorization-server/tenant1` returns 200 with valid JSON.

#### WK-18 — OAuth-protected APIs must publish resource metadata with resource and authorization_servers
Severity: medium · Source: `.zflow/evidence/specweb/well-known/oauth-protected-resource.md`
Quote: The response should be valid JSON with at least `resource` and `authorization_servers`. Trigger a `401` from the resource and confirm the `WWW-Authenticate` header carries a `resource_metadata` link back to this document.
Verify: `curl -s https://api.example.com/.well-known/oauth-protected-resource | jq -e '.resource and (.authorization_servers | length > 0)'` returns true; the document is fetchable unauthenticated.

#### WK-19 — 401 responses from a protected resource must carry WWW-Authenticate with a resource_metadata pointer
Severity: medium · Source: `.zflow/evidence/specweb/well-known/oauth-protected-resource.md`
Quote: - On a `401`, set `WWW-Authenticate` with a `resource_metadata` parameter pointing at this URL, so discovery works without out-of-band configuration.
Verify: `curl -si https://api.example.com/ | grep -i '^www-authenticate:'` includes `resource_metadata="https://api.example.com/.well-known/oauth-protected-resource"` (send the request without a token to trigger the 401).

#### WK-20 — gpc.json, if published, must be 200 application/json with a top-level object containing a boolean gpc member
Severity: medium · Source: `.zflow/evidence/specweb/well-known/gpc-json.md`
Quote: Serve the document at exactly `/.well-known/gpc.json` on the canonical host, over HTTPS, with `Content-Type: application/json`. A different media type leaves your support status unknown, which defeats the point.
Verify: `curl -sI https://example.com/.well-known/gpc.json` returns 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/gpc.json | jq -e 'type == "object" and (.gpc | type == "boolean")'` returns true.

#### WK-21 — gpc: true may only be published if the site actually honours Sec-GPC: 1 opt-outs
Severity: high · Source: `.zflow/evidence/specweb/well-known/gpc-json.md`
Quote: - **Only publish `"gpc": true` if it is true.** Process `Sec-GPC: 1` first; publish second.
Verify: `curl -sI -H 'Sec-GPC: 1' https://example.com/` — compare against a request without the header; the GPC response must not set advertising or data-broker cookies/tags (inspect `Set-Cookie` and third-party beacon URLs in the body).

#### WK-22 — gpc.json lastUpdate must be an RFC 3339 date that reflects the last review, not years stale
Severity: low · Source: `.zflow/evidence/specweb/well-known/gpc-json.md`
Quote: - **Set `lastUpdate` to the day the statement was last reviewed**, and revisit it when your data practices change.
Verify: `curl -s https://example.com/.well-known/gpc.json | jq -r .lastUpdate` matches `^\d{4}-\d{2}-\d{2}` (or full timestamp) and is not years in the past relative to the audit date.

#### WK-23 — api-catalog must be served as application/linkset+json with a valid Linkset body
Severity: low · Source: `.zflow/evidence/specweb/well-known/api-catalog.md`
Quote: **Serve a Linkset.** RFC 9727 requires the response body to be a valid [Linkset](https://www.rfc-editor.org/rfc/rfc9264). The media type is `application/linkset+json`. Set the `Content-Type` accordingly — most static hosts default to `application/octet-stream` for files without an extension.
Verify: `curl -sI https://example.com/.well-known/api-catalog | grep -i '^content-type:'` shows `application/linkset+json`; `curl -s https://example.com/.well-known/api-catalog | jq -e '.linkset | type == "array" and all(.[]; has("anchor"))'` returns true.

#### WK-24 — The api-catalog must be advertised via a Link header with rel="api-catalog"
Severity: low · Source: `.zflow/evidence/specweb/well-known/api-catalog.md`
Quote: **Advertise it.** Add the catalogue to your HTTP `Link` header on every response:
Verify: `curl -sI https://example.com/ | grep -i '^link:'` contains `</.well-known/api-catalog>; rel="api-catalog"` (or the absolute-URL equivalent with `type="application/linkset+json"`).

#### WK-25 — api-catalog relation names must come from the IANA Link Relations registry
Severity: low · Source: `.zflow/evidence/specweb/well-known/api-catalog.md`
Quote: - Inventing relation names. Use only those in the [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
Verify: `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | keys[]' | sort -u | grep -v '^anchor$'` — every listed relation appears in the IANA registry at https://www.iana.org/assignments/link-relations/link-relations.xhtml.

#### WK-26 — Every URL the api-catalog points at must return 200 from the same origin
Severity: low · Source: `.zflow/evidence/specweb/well-known/api-catalog.md`
Quote: - Every URL the catalogue points at returns `200` from the same origin.
Verify: Extract hrefs with `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | to_entries[] | select(.key != "anchor") | .value[].href'` and fetch each: `curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' -L "$href"` — all 200 and same-origin.

#### WK-27 — Federated sites must answer WebFinger queries with application/jrd+json
Severity: medium · Source: `.zflow/evidence/specweb/well-known/webfinger.md`
Quote: Accept GET requests with a `resource` query parameter. Return `application/jrd+json`.
Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^content-type:'` shows `application/jrd+json`.

#### WK-28 — WebFinger must answer on the host matching the acct: handle's domain
Severity: medium · Source: `.zflow/evidence/specweb/well-known/webfinger.md`
Quote: - Serve over **HTTPS**, and respond on the host that matches the right-hand side of the `acct:` URI. A query for `joost@example.com` must be answered by `example.com`, not `social.example.com`.
Verify: For a known handle `user@example.com`, `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger?resource=acct:user@example.com"` returns 200 directly on the apex host (a redirect to a subdomain host or failure is a miss).

#### WK-29 — WebFinger must return 400 for missing/malformed resource parameters and 404 for unknown resources
Severity: low · Source: `.zflow/evidence/specweb/well-known/webfinger.md`
Quote: - Return `404` for unknown resources, `400` for a missing or malformed `resource` parameter.
Verify: `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger"` (no resource parameter) returns 400; a query for a non-existent account returns 404.

#### WK-30 — WebFinger responses must set Access-Control-Allow-Origin: *
Severity: low · Source: `.zflow/evidence/specweb/well-known/webfinger.md`
Quote: - Set permissive `Access-Control-Allow-Origin: *` so browser-based clients can fetch the response.
Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^access-control-allow-origin:'` shows `*`.

#### WK-31 — AASA must be served at the exact extension-less path with Content-Type application/json
Severity: medium · Source: `.zflow/evidence/specweb/well-known/apple-app-site-association.md`
Quote: - The path is **exactly** `/.well-known/apple-app-site-association` with **no `.json` extension**.
Verify: `curl -sI https://example.com/.well-known/apple-app-site-association` returns 200 with `Content-Type: application/json` at the extension-less path; Apple's App Search API Validation Tool (https://search.developer.apple.com/appsearch-validation-tool/) reports the file loaded.

#### WK-32 — AASA must return 200 directly over HTTPS with no redirect
Severity: medium · Source: `.zflow/evidence/specweb/well-known/apple-app-site-association.md`
Quote: - The response must be served over **HTTPS** with a valid certificate. No redirects: respond with `200` directly.
Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/apple-app-site-association` shows status 200 and redirects=0.

#### WK-33 — AASA must be reachable by Apple's CDN fetcher (no WAF/UA blocking, no challenge pages)
Severity: medium · Source: `.zflow/evidence/specweb/well-known/apple-app-site-association.md`
Quote: - Apple fetches the file through its own CDN (`app-site-association.cdn-apple.com`). Allow that user agent through your WAF.
Verify: `curl -s -o /dev/null -w '%{http_code}' -A 'app-site-association.cdn-apple.com' https://example.com/.well-known/apple-app-site-association` returns 200 (not 403/429 and not a challenge/interstitial page).

#### WK-34 — AASA must be valid JSON under 128 KB
Severity: medium · Source: `.zflow/evidence/specweb/well-known/apple-app-site-association.md`
Quote: - Keep the JSON **valid** and under Apple's size limit (currently 128 KB).
Verify: `curl -s https://example.com/.well-known/apple-app-site-association | tee /tmp/aasa.json | jq -e . > /dev/null && wc -c < /tmp/aasa.json` — jq exits 0 and the byte count is < 131072.

#### WK-35 — AASA applinks must use the modern components key, not only the legacy paths key
Severity: low · Source: `.zflow/evidence/specweb/well-known/apple-app-site-association.md`
Quote: - Using only `paths` (the old key) without `components`. Modern iOS versions prefer `components`; ship both during migration.
Verify: `curl -s https://example.com/.well-known/apple-app-site-association | jq '.applinks.details[] | has("components")'` returns true for every detail entry.

#### WK-36 — assetlinks.json must be served at the exact .json path with 200, application/json, no redirect
Severity: medium · Source: `.zflow/evidence/specweb/well-known/assetlinks-json.md`
Quote: - The path is **exactly** `/.well-known/assetlinks.json`. The `.json` extension is required here (unlike Apple's [AASA](/spec/well-known/apple-app-site-association/), which has no extension).
Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/assetlinks.json` shows 200/0, and `curl -sI` the same URL shows `Content-Type: application/json`; `curl -s ... | jq -e 'type == "array"'` confirms the JSON-array shape.

#### WK-37 — assetlinks.json must carry SHA-256 fingerprints for every release signing certificate including Play App Signing
Severity: medium · Source: `.zflow/evidence/specweb/well-known/assetlinks-json.md`
Quote: - The `sha256_cert_fingerprints` must include the SHA-256 of the signing certificate of every release variant — including the Play App Signing key, not just your upload key.
Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.sha256_cert_fingerprints[]'` lists at least one 32-octet colon-separated SHA-256 per entry (presence/format is externally checkable; matching the true release key is owner-side via `adb shell pm get-app-links <package>`).

#### WK-38 — Every relevant Android package, including beta/staging, must have its own assetlinks entry
Severity: low · Source: `.zflow/evidence/specweb/well-known/assetlinks-json.md`
Quote: - Declare every relevant app, including any beta or staging packages.
Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.package_name'` and compare against every package the site links to (Play Store links on the site's app/download pages); flag missing packages.

#### WK-39 — /.well-known/nodeinfo must be a links pointer, not the NodeInfo document itself
Severity: low · Source: `.zflow/evidence/specweb/well-known/nodeinfo.md`
Quote: - Returning the NodeInfo document directly from `/.well-known/nodeinfo`. The well-known URI is a pointer; the document lives elsewhere.
Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -e '.links | length > 0'` returns true and the body has no top-level `software` key; `curl -sI` shows `Content-Type: application/json`.

#### WK-40 — NodeInfo documents must use schema 2.0 or 2.1 (older versions deprecated)
Severity: low · Source: `.zflow/evidence/specweb/well-known/nodeinfo.md`
Quote: - Support at least one of the current schema versions (2.0 or 2.1). Older versions (1.0, 1.1) are deprecated.
Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -r '.links[].rel'` includes `http://nodeinfo.diaspora.software/ns/schema/2.0` or `.../2.1`, and fetching that href returns `"version": "2.0"` or `"2.1"` via jq.

#### WK-41 — NodeInfo responses must set permissive CORS
Severity: low · Source: `.zflow/evidence/specweb/well-known/nodeinfo.md`
Quote: - Set permissive CORS (`Access-Control-Allow-Origin: *`) so browser-based dashboards can read it.
Verify: `curl -sI https://example.com/.well-known/nodeinfo | grep -i '^access-control-allow-origin:'` shows `*`.

#### WK-42 — traffic-advice, if published, must use Content-Type application/trafficadvice+json exactly
Severity: low · Source: `.zflow/evidence/specweb/well-known/traffic-advice.md`
Quote: - **`Content-Type: application/trafficadvice+json` is mandatory.** Any other value (including `application/json`) is treated as no advice and the proxy uses its default.
Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^content-type:'` shows exactly `application/trafficadvice+json`.

#### WK-43 — traffic-advice cache freshness must sit between 10 minutes and 48 hours
Severity: low · Source: `.zflow/evidence/specweb/well-known/traffic-advice.md`
Quote: - **Cache lifetime.** The spec suggests a minimum freshness of 10 minutes and a maximum of 48 hours; agents default to 30 minutes when no `Cache-Control` is set. Pick a value short enough that posture changes propagate within an operationally reasonable window.
Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^cache-control:'` — the max-age value is between 600 and 172800 seconds.

#### WK-44 — traffic-advice body must be a JSON array of user_agent entries with disallow or fraction 0–1
Severity: low · Source: `.zflow/evidence/specweb/well-known/traffic-advice.md`
Quote: Confirm `Content-Type: application/trafficadvice+json` and a sensible `Cache-Control`. The body should parse as a JSON array; each entry should have a string `user_agent` and one of `disallow: true` or a numeric `fraction` between 0 and 1.
Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -e 'type == "array" and all(.[]; (.user_agent | type == "string") and ((.disallow == true) or ((.fraction // -1) >= 0 and (.fraction // 2) <= 1)))'` returns true.

#### WK-45 — traffic-advice entries must be ordered broadest match first
Severity: low · Source: `.zflow/evidence/specweb/well-known/traffic-advice.md`
Quote: - **Match ordering.** List the broadest advice first (`"prefetch-proxy"`), then narrower per-implementer exceptions. A proxy walks its own identity list and takes the earliest match.
Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -r '.[].user_agent'` — the generic `"prefetch-proxy"` (or `"*"`) entry appears before any implementer-specific brand entry.

### 2.6 Agent Readiness — 107 requirements

Making the site legible to AI agents and LLMs: initial-HTML content, llms.txt and markdown source endpoints, per-agent crawler rules, Content Signals, TDMRep, stable URLs, structured data, feeds, Link headers, and the emerging discovery conventions (MCP, A2A, Agent Skills, DNS-AID, ARD, NLWeb, WebMCP, OKF, Schemamap).

Numbering preserved from the distilled section (items 1–107), prefixed `AR-`.

Checklist status (`meta/checklist.md`): **Required** — stable URLs · **Recommended** — agent readiness overview, llms.txt, Markdown source endpoints, robots.txt for AI crawlers, structured data for agents, machine-readable formats, HTTP Link headers for discovery, Agent Skills discovery.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### AR-1 — Main content must be in the initial HTML
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/agent-readiness-overview.md`
Quote: - Fetch a key page with `curl` and confirm the main content is in the initial HTML.
Verify: Pick a distinctive phrase visible only in the rendered main content, then `curl -s <page-url> | grep -F '<phrase>'` — the phrase must appear in the raw HTML; if it only appears after JS runs (check in a headless browser), the site fails.

#### AR-2 — robots.txt must name AI crawlers explicitly
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/agent-readiness-overview.md`
Quote: - Check `/robots.txt` lists the crawlers you intend to allow or block.
Verify: `curl -s https://example.com/robots.txt` and confirm named AI user-agents (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Google-Extended, Applebot-Extended, PerplexityBot, CCBot, Bytespider) appear with their own rules rather than only a `*` wildcard.

#### AR-3 — /llms.txt served at the root
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: - Fetch `https://example.com/llms.txt` and confirm a `200` with markdown content.
Verify: `curl -sI https://example.com/llms.txt` returns 200 with `Content-Type: text/markdown` or `text/plain`, and `curl -s https://example.com/llms.txt` returns a markdown body.

#### AR-4 — /llms.txt advertised with rel="describedby"
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: - Confirm the relation is actually advertised: `curl -sI https://example.com/ | grep -i '^link:'` should show `rel="describedby"`, or the same relation should appear in the HTML head.
Verify: `curl -sI https://example.com/ | grep -i '^link:'` shows `rel="describedby"`, or `curl -s https://example.com/ | grep 'rel="describedby"'` finds the `<link>` in `<head>`.

#### AR-5 — /llms.txt structure: H1 name plus blockquote summary
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: Start with `# Site name` on the first line. Follow with a `> blockquote` summary.
Verify: `curl -s https://example.com/llms.txt | head -5` — the first non-empty line starts with `# ` and the next starts with `> `.

#### AR-6 — /llms.txt groups canonical links under ## sections
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: Use `##` headings to group links. Links should point to canonical pages.
Verify: Inspect `curl -s https://example.com/llms.txt` for `##` sections; extract links with `grep -oE '\]\([^)]+\)'` and spot-check they resolve 200 and match the canonical (rel="canonical") URL of the target page.

#### AR-7 — /llms.txt stays short
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: Keep it under a few hundred lines. If you want full content, see [/llms-full.txt](/spec/agent-readiness/llms-full-txt/).
Verify: `curl -s https://example.com/llms.txt | wc -l` — under roughly 300 lines.

#### AR-8 — /llms.txt linked for humans
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: Link to it from your homepage or footer so humans can find it too.
Verify: `curl -s https://example.com/ | grep -c 'llms.txt'` returns at least 1.

#### AR-9 — /llms.txt points at markdown source, advertised with rel="alternate"
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: Point at markdown source where you publish it. v2 accepts either URL shape — `page.md` or `page.html.md` — so use whichever your routing already produces, and advertise it with `rel="alternate"; type="text/markdown"`.
Verify: `curl -s https://example.com/llms.txt | grep -E '\.md'` lists markdown URLs, and `curl -s <page> | grep 'rel="alternate"' | grep 'text/markdown'` shows the per-page advertisement.

#### AR-10 — /llms.txt links must not be stale
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
Quote: - Letting it drift. A stale `llms.txt` is worse than none — it teaches models wrong things.
Verify: Extract every URL from /llms.txt and run `curl -s -o /dev/null -w '%{http_code}' <url>` on each — all must return 2xx or 3xx.

#### AR-11 — /llms-full.txt kept to a usable size
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
Quote: - Fetch the file and check the size. Anything over a couple of megabytes is suspect.
Verify: `curl -s https://example.com/llms-full.txt | wc -c` — well under ~2,000,000 bytes.

#### AR-12 — /llms-full.txt served as real markdown
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
Quote: - Serve as `text/markdown` or `text/plain`. Set sensible cache headers — this file changes on every doc update.
Verify: `curl -sI https://example.com/llms-full.txt` shows a text content type, and `curl -s https://example.com/llms-full.txt | head -1` starts with `#`, not `<`.

#### AR-13 — /llms-full.txt sections carry their source URL
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
Quote: - Separate sections with `---` and clear `#` headings. Include the page URL near each heading so agents can cite it.
Verify: Inspect the body: `grep -c '^---$'` matches section count and each heading block contains an absolute URL (`grep -A2 '^# '`).

#### AR-14 — .md suffix returns markdown source
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - `curl -i https://example.com/docs/getting-started.md` returns `200` with `Content-Type: text/markdown; charset=utf-8`.
Verify: Run exactly `curl -sI https://example.com/docs/getting-started.md` on sample content pages and check status 200 plus the markdown content type.

#### AR-15 — Accept: text/markdown negotiation works
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - `curl -i -H 'Accept: text/markdown' https://example.com/docs/getting-started/` returns Markdown with `Content-Location` and `Vary: Accept`.
Verify: Run the quoted curl and confirm the response body is markdown and the headers include `Content-Location` and `Vary: Accept`.

#### AR-16 — HTML response carries Vary: Accept
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - The HTML response to the same URL also carries `Vary: Accept`.
Verify: `curl -sI https://example.com/docs/getting-started/` shows `Vary` containing `Accept`.

#### AR-17 — Markdown source advertised in <head>
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - View source on any page — there is a `<link rel="alternate" type="text/markdown" …>` in `<head>`.
Verify: `curl -s <page-url> | grep 'rel="alternate"' | grep 'text/markdown'` returns the link tag.

#### AR-18 — .md body matches the rendered HTML
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - The `.md` body contains the same headings, paragraphs, and code blocks as the rendered HTML, with frontmatter at the top.
Verify: Compare `curl -s <page>.md | grep '^#'` against the rendered page's headings, and grep the .md body for template artefacts (`grep -E '\{\{|_shortcode'` should find nothing).

#### AR-19 — .md and HTML share one access policy
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: - Putting the `.md` behind authentication while the HTML is public. The two representations must have the same access policy.
Verify: `curl -s -o /dev/null -w '%{http_code}' <page>.md` returns 200 (or the same status as the HTML page), never 401/403 or a login redirect.

#### AR-20 — Markdown frontmatter carries page metadata
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: Include a YAML frontmatter block with the page's metadata so agents get structured context alongside the prose: `title`, `url` (the canonical HTML URL), `updated`, `sources`, `licence`.
Verify: `curl -s <page>.md | head -20` begins with `---` and the frontmatter contains at least `title` and `url`.

#### AR-21 — X-Markdown-Tokens size hint
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
Quote: **Hint the size.** Add an `X-Markdown-Tokens` response header carrying a rough token-count estimate for the body (any reasonable tokeniser — `tiktoken`'s `cl100k_base` is a fine default). The header is not a registered standard, but a growing number of agent-friendly sites ship it because it lets a caller decide whether to inline the page into a prompt, summarise it first, or skip it for a smaller one — without downloading the body. Recompute it whenever the Markdown changes; do not invent the number.
Verify: `curl -sI <page>.md | grep -i 'x-markdown-tokens'`; when present, tokenise the body with tiktoken cl100k_base and confirm the value is the same order of magnitude (not invented).

#### AR-22 — Explicit per-agent AI crawler rules
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
Quote: A blanket `Disallow: /` blocks everyone, including search. Naming agents lets you make precise decisions: allow retrieval bots so your content can be cited live, block training bots if you do not want to feed model weights, or the reverse.
Verify: `curl -s https://example.com/robots.txt` contains at least one dedicated group for a named AI crawler (e.g. `User-agent: GPTBot`, `User-agent: ClaudeBot`, `User-agent: Google-Extended`) with an explicit Allow/Disallow.

#### AR-23 — No accidental blanket wildcard disallow
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
Quote: - Blocking `*` and forgetting that this also blocks Google.
Verify: Parse `curl -s https://example.com/robots.txt`: a `User-agent: *` group followed by `Disallow: /` is a failure unless the site is deliberately unlisted (confirm intent, e.g. a login-gated staging surface).

#### AR-24 — Each public subdomain has its own robots.txt
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
Quote: - Decisions are per-host. A subdomain needs its own robots.txt.
Verify: For each public subdomain (blog., docs., shop.), `curl -sI https://<subdomain>.example.com/robots.txt` returns 200.

#### AR-25 — OpenAI agents controlled individually
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
Quote: - Blocking only `GPTBot` and assuming no OpenAI surface can see your site — `OAI-SearchBot` and `ChatGPT-User` are separate.
Verify: Inspect robots.txt groups: where any OpenAI user-agent appears, all three (GPTBot, OAI-SearchBot, ChatGPT-User) have explicit rules matching the intended policy.

#### AR-26 — Content-Signal directive published
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/content-signals.md`
Quote: Content-Signal: search=yes, ai-input=yes, ai-train=no
Verify: `curl -s https://example.com/robots.txt | grep -i 'content-signal'` returns a well-formed directive line.

#### AR-27 — Directive spelled singular and placed in a group
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/content-signals.md`
Quote: - Spelling: `Content-Signal:` (singular). Not `Content-Signals:`.
Verify: `curl -s /robots.txt | grep -i 'content-signals:'` must be empty, and the `Content-Signal:` line must appear after a `User-agent:` line within its group.

#### AR-28 — Deployed key names used
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/content-signals.md`
Quote: - Writing the IETF draft's labels (`train-ai`, `ai-use`) in a `Content-Signal` directive. Nothing reads those; the deployed directive uses `ai-train` and `ai-input`.
Verify: `curl -s /robots.txt | grep -i 'content-signal'` — keys are limited to `search`, `ai-input`, `ai-train`.

#### AR-29 — Values limited to yes/no
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/content-signals.md`
Quote: - Inventing values beyond `yes` / `no`. The vocabulary is small on purpose.
Verify: Parse the directive line: every `<key>=<value>` pair matches `(search|ai-input|ai-train)=(yes|no)`.

#### AR-30 — No contradiction with Disallow
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/content-signals.md`
Quote: - Conflicting with `Disallow:`. If you `Disallow: /` for a bot, that bot was never going to fetch the page to read your `Content-Signal:`. They contradict; pick one.
Verify: For each robots.txt group containing a Content-Signal line, confirm the same group has no full `Disallow: /`.

#### AR-31 — TDM reservation declared machine-readably
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: > Declare in machine-readable form whether you reserve the right to object to text and data mining, using the `tdm-reservation` HTTP header, a `<meta>` element, or `/.well-known/tdmrep.json`. Its force is legal, not technical.
Verify: `curl -sI https://example.com/ | grep -i tdm-`, or `curl -s https://example.com/ | grep 'tdm-reservation'`, or `curl -s https://example.com/.well-known/tdmrep.json` — at least one is present.

#### AR-32 — Reservation value must be integer 1 or 0
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: - Using `true`, `yes`, or `reserved` as the value. Only the integers `1` and `0` are valid; anything else means agents treat the field as unset, so a malformed reservation is the same as no reservation.
Verify: Inspect the header/meta/JSON value — it must match exactly `1` or `0` (no `true`, `yes`, `reserved`).

#### AR-33 — Header form covers non-HTML assets
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: - Fetch a non-HTML asset — an image, a PDF — and confirm the header is present there too. That is the coverage the `<meta>` form cannot give you.
Verify: `curl -sI <site-image-or-pdf-url> | grep -i tdm-` returns the header.

#### AR-34 — tdm-policy accompanies a reservation of 1
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: **Set `tdm-policy` whenever you set `tdm-reservation: 1`.** A bare reservation tells a would-be licensee that the answer is no, without telling them who to ask.
Verify: Wherever tdm-reservation is 1, a `tdm-policy` URL is present and `curl -s -o /dev/null -w '%{http_code}' <policy-url>` returns 2xx.

#### AR-35 — TDMRep consistent with other AI signals
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: **Keep it consistent with everything else you publish.** A `tdm-reservation: 1` next to a permissive content licence, or next to `Content-Signal: ai-train=yes`, is a contradiction someone will eventually have to resolve — probably not in your favour.
Verify: Compare the tdm-reservation value with the robots.txt Content-Signal ai-train value and any published content licence — they must not contradict.

#### AR-36 — tdmrep.json is a valid array
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
Quote: - If you publish `/.well-known/tdmrep.json`, confirm it parses as a JSON array and that every entry has a `location` and an integer `tdm-reservation`.
Verify: `curl -s https://example.com/.well-known/tdmrep.json | jq .` — output is an array; every entry has `location` and integer `tdm-reservation`.

#### AR-37 — Unsigned traffic must not be blocked by default
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/web-bot-auth.md`
Quote: - Blocking unsigned traffic as a default. The standard is opt-in for bots; legitimate non-signing clients (including most browsers) will be locked out.
Verify: `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (Macintosh)' https://example.com/` and a plain `curl -sI https://example.com/` both return 2xx/3xx without a bot-verification wall or 403.

#### AR-38 — /auth.md readable without credentials
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/auth-md.md`
Quote: Serve public Markdown over HTTPS at `/auth.md`, without a login wall. Link to it from integration documentation and the protocol's `agent_auth.skill` metadata field.
Verify: `curl -s https://example.com/auth.md` returns 200 with a markdown body, not a 30x to a login page.

#### AR-39 — auth.md endpoints match live metadata
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/auth-md.md`
Quote: Fetch `/auth.md` without credentials and confirm it returns readable Markdown rather than a login page. Compare every documented endpoint and scope with live metadata.
Verify: Extract documented endpoints from auth.md and diff them against `curl -s https://example.com/.well-known/oauth-authorization-server | jq .` (and the protected-resource metadata).

#### AR-40 — No implementation details in URLs
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - **Avoid implementation details.** No `/wp-content/`, `/index.php`, `.aspx`, or `?id=42`. These leak the stack and break when you switch it.
Verify: Extract URLs from the sitemap and homepage links, then `grep -E '\.php|\.aspx|\?id=|/wp-content/'` — no matches.

#### AR-41 — Kebab-case slugs with one trailing-slash style
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - **Use kebab-case slugs.** Lowercase, hyphens between words, no trailing slashes mixed with non-trailing slashes — pick one and enforce it.
Verify: Inspect sitemap URLs for lowercase-hyphen patterns and confirm trailing-slash presence is uniform across all listed URLs.

#### AR-42 — One canonical host over HTTPS
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - **Pick a canonical host.** `www.` or no-`www.`, HTTPS only, one path style. Redirect the rest.
Verify: `curl -sI http://example.com/`, `curl -sI https://www.example.com/` (and the apex counterpart) each return 301/308 to the canonical HTTPS host; plain HTTP never returns 200 directly.

#### AR-43 — Moved URLs redirect permanently
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - Issue a `301 Moved Permanently` (or `308` to preserve the method) from the old URL to the new one.
Verify: For known old URLs (from prior sitemaps or the Wayback Machine), `curl -sI <old-url>` returns 301/308 with a Location that resolves 200.

#### AR-44 — No redirect chains
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - Avoid chains: redirect `A` directly to `C`, not `A` to `B` to `C`.
Verify: `curl -sIL -o /dev/null -w '%{num_redirects}\n' <url>` on moved/host-variant URLs — at most 1 hop after the initial request.

#### AR-45 — No mass redirect to the homepage
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - Never redirect everything to the homepage. That is worse than a 404 — it tells crawlers the page intentionally still exists.
Verify: Request retired URLs (from old sitemaps or inbound-link reports): the Location header must not be `/` or the homepage; expect 404/410 instead.

#### AR-46 — Deleted content returns 410
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: For deletions, a clean `410 Gone` is more honest than a soft 404 or a homepage redirect.
Verify: Spot-check known-removed URLs: `curl -s -o /dev/null -w '%{http_code}' <removed-url>` returns 410 (or an honest 404), not a 200 homepage or a redirect to it.

#### AR-47 — Canonical URLs free of session/tracking parameters
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - Adding session IDs, tracking parameters, or A/B variants to canonical URLs.
Verify: `curl -s <page> | grep 'rel="canonical"'` — the canonical URL contains no `utm_`, session, or variant query parameters; same check on sitemap URLs.

#### AR-48 — Trailing-slash variants must not serve different content
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
Quote: - Letting trailing slashes serve different content from non-trailing slashes.
Verify: `diff <(curl -s https://example.com/page) <(curl -s https://example.com/page/)` — identical bodies, or one form 301-redirects to the other.

#### AR-49 — JSON-LD embedded in the page
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: Structured data is a machine-readable description of what a page is about, embedded in the page itself. The dominant vocabulary is [schema.org](https://schema.org/), and the recommended syntax is JSON-LD: a `<script type="application/ld+json">` block inside `<head>`.
Verify: `curl -s <page-url> | grep -c 'application/ld+json'` returns at least 1 and the block contains `"@context": "https://schema.org"`.

#### AR-50 — JSON-LD present before JavaScript executes
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Fetch the HTML and confirm the JSON-LD is present before JavaScript executes.
Verify: `curl -s <page-url> | grep 'application/ld+json'` finds the markup in the raw, un-JS'd response.

#### AR-51 — Markup mirrors visible content
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Mirror what is visible on the page. Schema for content that does not appear violates Google's guidelines and trains agents to mistrust your markup.
Verify: Extract headline, author, and offer/price fields from the JSON-LD (`curl -s <page> | grep -A20 'application/ld+json'`) and confirm each appears in the rendered page a browser shows.

#### AR-52 — Specific schema.org types per page kind
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Using `@type: "WebPage"` for everything. Pick a specific type.
Verify: `curl -s <page> | grep '"@type"'` — the primary type is specific to the page kind, not `WebPage`.

#### AR-53 — Stable @id URIs reused across pages
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Reuse `@id` URIs so agents can link entities across pages.
Verify: Extract `"@id"` values for the organization/author node from several pages (`curl -s <page1> <page2> | grep '"@id"'`) — the same entity carries the same @id everywhere.

#### AR-54 — No inflated ratings
Severity: high · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Inflating `AggregateRating` with fake reviews. Both search engines and agents penalise this when caught.
Verify: Compare the ratingValue/reviewCount in the JSON-LD with the reviews actually visible on the page; counts or stars that cannot be seen on-page fail.

#### AR-55 — Markup metadata stays current
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Leaving stale `datePublished` or `author` after a CMS migration.
Verify: Compare JSON-LD datePublished/author with the visible byline and date on the same page — they must agree.

#### AR-56 — Markup validates
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Run the page through [validator.schema.org](https://validator.schema.org/) and Google's Rich Results Test.
Verify: Submit key page URLs to validator.schema.org — zero errors for the embedded JSON-LD.

#### AR-57 — JSON-LD preferred over Microdata/RDFa
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
Quote: - Use JSON-LD over Microdata or RDFa. Easier to write, easier to keep in sync.
Verify: `curl -s <page> | grep -c 'itemscope='` returns 0 (or microdata is clearly supplementary) while a JSON-LD block is present.

#### AR-58 — XML sitemap published
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - **Sitemap.** Every site should have one — see [XML sitemaps](/spec/seo/xml-sitemaps/).
Verify: `curl -sI https://example.com/sitemap.xml` (or the sitemap index referenced by the robots.txt `Sitemap:` line) returns 200 with XML content.

#### AR-59 — RSS/Atom feed at a discoverable URL
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - **A feed.** Publish RSS 2.0 or Atom at a discoverable URL such as `/feed`, `/feed.xml`, or `/rss.xml`.
Verify: `curl -sI https://example.com/feed.xml` (trying /feed and /rss.xml as fallbacks) returns 200 with an RSS/Atom XML body.

#### AR-60 — Feeds linked from <head>
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: <link rel="alternate" type="application/rss+xml" title="Blog" href="/feed.xml">
Verify: `curl -s <page> | grep 'rel="alternate"' | grep -E 'rss|atom|json'` returns the feed link(s).

#### AR-61 — Feed items carry full content
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - Truncating feed items to a one-line teaser. If you want agents to quote you fairly, give them the full content.
Verify: `curl -s /feed.xml` item descriptions/content:encoded contain full paragraphs matching the article body, not truncated teasers.

#### AR-62 — Absolute URLs in feed items
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - Mixing absolute and relative URLs inside feed items. Use absolute everywhere.
Verify: Parse the feed and check every `<link>`, `<guid>`, and inline href starts with `https://` (or `http://`).

#### AR-63 — Feed timestamps update with content
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - Forgetting to update `pubDate` or `date_published`, so readers think nothing has changed.
Verify: Compare the newest feed item's timestamp against the most recently published/updated page date — they must match.

#### AR-64 — Feeds validate
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: - Validate RSS at [validator.w3.org/feed](https://validator.w3.org/feed/).
Verify: Submit the feed URL at validator.w3.org/feed — no validation errors.

#### AR-65 — Vary: Accept on every negotiated representation
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
Quote: **Content negotiation.** Powerful, but easy to misuse. Always set `Vary: Accept` on every representation, otherwise caches will pin the wrong one for every subsequent visitor. When the formats are very different (HTML vs JSON), distinct URLs are usually simpler.
Verify: `curl -sI` each representation of a negotiated URL — both responses carry `Vary` containing `Accept`.

#### AR-66 — Link header on the homepage advertising resources
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: > Use the HTTP Link header to advertise machine-readable resources — llms.txt, sitemap, api-catalog, RSS — directly in the response. Agents that never parse your HTML can still find what they need.
Verify: `curl -sI https://example.com/ | grep -i '^link'` lists at least one advertised relation (agent-readiness validators check exactly this).

#### AR-67 — Only IANA-registered relation types
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: - Inventing a custom `rel`. Crawlers ignore it. Use IANA-registered relations only.
Verify: Extract every `rel=` value from the Link header and check each against the IANA Link Relations Registry (iana.org/assignments/link-relations/).

#### AR-68 — Link header syntax: angle brackets, comma separation
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: - Wrapping URLs in quotes. Per RFC 8288, the URI goes inside `<>` angle brackets, not quotes.
Verify: Inspect the raw Link header: targets match `"<...>"` and multiple entries are separated by commas; an RFC 8288 parse-and-render tool reports no syntax errors.

#### AR-69 — Link headers on non-HTML responses too
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: - Sending `Link` only on HTML responses. Defeats the "HTML-free" point — agents looking at your `/api/users.json` get nothing.
Verify: `curl -sI <json-or-asset-url> | grep -i '^link'` returns the header for public non-HTML endpoints.

#### AR-70 — Link headers consistent with HTML <head>
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: - Sending `Link` headers that contradict the HTML `<link rel>` entries. The headers and the HTML should be consistent — they describe the same site.
Verify: Cross-check every rel in the homepage head against the Link header: same relations point at the same targets.

#### AR-71 — Link entries self-describing with type and title
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/link-headers.md`
Quote: **Include `type` and `title`.** They are optional in the header but make the link self-describing without an extra fetch.
Verify: `curl -sI https://example.com/ | grep -i '^link'` — entries carry `type="..."` (and ideally `title="..."`).

#### AR-72 — MCP server card published and linked
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
Quote: - **Publish a server card.** Ship `/.well-known/mcp/server-card.json` describing the server's name, version, transport, endpoint URL, capabilities, tools, and prompts. Add a `Link: </.well-known/mcp/server-card.json>; rel="mcp"` header on your main site so the card is discoverable without guessing the path — see [HTTP Link headers](/spec/agent-readiness/link-headers/) and [`/.well-known/api-catalog`](/spec/well-known/api-catalog/).
Verify: `curl -sI https://example.com/.well-known/mcp/server-card.json` returns 200 JSON, and `curl -sI https://example.com/ | grep -i 'rel="mcp"'` shows the advertisement.

#### AR-73 — Tool annotations must be truthful
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
Quote: - Annotations that lie. Marking a write tool `readOnlyHint: true` is worse than omitting the hint — clients trust it and skip the confirmation a destructive call deserves.
Verify: With the MCP Inspector, run tools/list and compare each tool's annotations (readOnlyHint, destructiveHint, openWorldHint) against the observed effect of a call.

#### AR-74 — OAuth 2.1 for user-data tools, no long-lived keys
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
Quote: - Use OAuth 2.1 (the MCP spec aligns with it) for any tool that touches user data. Never accept long-lived API keys in tool calls.
Verify: Inspect the server card and tool input schemas (MCP Inspector tools/list): user-data tools reference an OAuth flow, and no tool input schema contains a static api-key parameter.

#### AR-75 — Tools declare outputSchema and return structured content
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
Quote: - **Return structured output, not just prose.** Since the 2025-06-18 revision a tool can declare an `outputSchema` and return a matching `structuredContent` object next to the human-readable text.
Verify: MCP Inspector tools/list shows `outputSchema` on tools, and a sample call returns a `structuredContent` object.

#### AR-76 — No deprecated capabilities advertised
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
Quote: Watch the [deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) for the things the protocol *has* scheduled for removal — Roots, Sampling, Logging and Dynamic Client Registration are all Deprecated as of 2026-07-28.
Verify: Inspect the server card / server/discover response: the deprecated capabilities are absent from the advertised capability set.

#### AR-77 — agent-card.json served as JSON
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
Quote: - `curl https://your-site.example/.well-known/agent-card.json` returns 200 with `Content-Type: application/json` and parses as JSON.
Verify: Run the quoted curl and pipe the body through `jq .` — both succeed.

#### AR-78 — Card points only at live endpoints
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
Quote: - Publishing a card that points at a URL that 404s. Discovery validators check the URI; runtime agents check the endpoint. Both matter.
Verify: `curl -s -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage","params":{}}' <supportedInterfaces[0].url>` returns a JSON-RPC response, not 404 or an HTML error page.

#### AR-79 — Card capabilities are honest
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
Quote: - **Be honest about capabilities.** If you do not support streaming, set `capabilities.streaming` to `false`. The same goes for `pushNotifications` and `extendedAgentCard`. Lying here breaks clients that probe before they call.
Verify: Where the card declares `streaming: true`, a `SendStreamingMessage` JSON-RPC call must succeed; unimplemented capabilities must be false.

#### AR-80 — Canonical card filename
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
Quote: - Mixing up `agent-card.json` with `agent.json`. The canonical filename is `agent-card.json` — pick it, do not invent a redirect.
Verify: `curl -sI https://example.com/.well-known/agent-card.json` returns 200 directly (not a redirect from an `agent.json` path).

#### AR-81 — Skills index published with v0.2.0 $schema
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Publish `/.well-known/agent-skills/index.json` with `$schema` set to `https://schemas.agentskills.io/discovery/0.2.0/schema.json` and a `skills` array. Each entry needs `name`, `type`, `description`, `url`, and `digest`.
Verify: `curl -s https://example.com/.well-known/agent-skills/index.json | jq '.$schema, (.skills | length)'` — schema matches the v0.2.0 URI and skills is non-empty with all five fields per entry.

#### AR-82 — Skills hosted as text/markdown
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Host each skill at `/.well-known/agent-skills/<name>/SKILL.md`. Serve as `text/markdown`.
Verify: For each index entry, `curl -sI <skill-url>` returns 200 with `Content-Type: text/markdown`.

#### AR-83 — SKILL.md frontmatter constraints
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Author one or more `SKILL.md` files. Each MUST start with YAML frontmatter containing `name` (lowercase, hyphens, 1–64 chars) and `description` (≤1024 chars, written so an agent can decide whether to load the full body).
Verify: Parse each SKILL.md frontmatter: name matches `^[a-z0-9-]{1,64}$` and description length is ≤1024 characters.

#### AR-84 — Digest matches the artefact bytes
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Compute the digest as `sha256:<hex>` over the raw bytes of the artefact. Recompute and update the index every time the artefact changes.
Verify: `curl -s <skill-url> | shasum -a 256` and compare with the index digest — they must be equal.

#### AR-85 — Skills files served with open CORS
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Serve both files with CORS open (`Access-Control-Allow-Origin: *`) so browser-based agents can fetch them.
Verify: `curl -sI https://example.com/.well-known/agent-skills/index.json | grep -i 'access-control-allow-origin'` returns `*` (same for a SKILL.md URL).

#### AR-86 — Skills index advertised via Link header
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
Quote: - Advertise the index in [`/.well-known/api-catalog`](/spec/well-known/api-catalog/) and as a [`Link`](/spec/agent-readiness/link-headers/) header: `rel="agent-skills"; type="application/json"`.
Verify: `curl -sI https://example.com/ | grep -i 'rel="agent-skills"'` returns the advertisement.

#### AR-87 — _index._agents record in ServiceMode
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
Quote: - `dig +short HTTPS _index._agents.example.com` returns a record beginning with `1 example.com.`.
Verify: Run `dig +short HTTPS _index._agents.<domain>` — the answer begins with `1 <hostname>.` (priority ≥ 1, not AliasMode priority 0) and includes alpn/port.

#### AR-88 — DNS-AID records DNSSEC-signed
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
Quote: - `dig +dnssec +cd HTTPS _index._agents.example.com` returns an `RRSIG` line — confirming DNSSEC is signing the answer.
Verify: Run `dig +dnssec +cd HTTPS _index._agents.<domain>` — an RRSIG record appears in the answer; `dig +short DS <domain>` returns at least one DS record.

#### AR-89 — Records on the canonical domain
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
Quote: **Advertise on the canonical domain, not the platform's vendor subdomain.** Records on `your-site.netlify.app` or `your-project.pages.dev` don't help agents that already know your real domain.
Verify: Run the dig queries against the site's registered apex domain (the one in the canonical URL), not `*.netlify.app`/`*.pages.dev`/`*.vercel.app`.

#### AR-90 — ai-catalog.json valid with specVersion and entries
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
Quote: - `curl -s https://example.com/.well-known/ai-catalog.json | jq .` returns valid JSON with `specVersion` and `entries`.
Verify: Run the quoted command — jq parses the document and both fields are present.

#### AR-91 — Catalog entry URLs resolve to the declared media type
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
Quote: - Each entry `url` resolves to a document of the declared `mediaType`.
Verify: `curl -sI <entry-url>` for each entry — returns 200 and the Content-Type matches the declared mediaType (mcp-server-card+json, a2a-agent-card+json, agentskill+zip, ai-catalog+json).

#### AR-92 — Catalog advertised via Agentmap and Link rel
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
Quote: - The `Agentmap:` line is present in `robots.txt` and the `ai-catalog` `Link` rel is on the homepage response.
Verify: `curl -s https://example.com/robots.txt | grep -i '^agentmap:'` and `curl -sI https://example.com/ | grep -i 'rel="ai-catalog"'` both succeed.

#### AR-93 — Entries emit both mediaType and type
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
Quote: The two diverged, so the safe move is to emit **both** field names with the same value plus `representativeQueries` — that validates under either spec, since both require consumers to preserve unknown keys.
Verify: `curl -s /.well-known/ai-catalog.json | jq '.entries[] | {mediaType, type}'` — both keys present and equal on every entry.

#### AR-94 — NLWeb endpoint advertised
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/nlweb.md`
Quote: - **Advertise it.** Add `<link rel="nlweb" href="/ask">` to `<head>` and a matching `Link: </ask>; rel="nlweb"` HTTP header.
Verify: `curl -s https://example.com/ | grep 'rel="nlweb"'` and `curl -sI https://example.com/ | grep -i nlweb` both return the advertisement.

#### AR-95 — /ask returns JSON with cited sources
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/nlweb.md`
Quote: - `curl 'https://example.com/ask?query=what+do+you+do'` returns a JSON body with an `answer` field and a `sources` array of URLs into your own site.
Verify: Run the quoted curl, confirm JSON (not HTML) with `answer` and `sources`, then spot-check that each source URL returns 200 and supports the answer.

#### AR-96 — Tool bundle not downloaded without the API
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/webmcp.md`
Quote: - **Feature-detect before you download, not just before you register.** The obvious shape — ship the tool bundle on every page, check `modelContext` at the top, return early when it is missing — puts the check inside the thing it is meant to guard. Every visitor pays for a script that today almost none of them can use. Put the detection in a few inline bytes and inject the bundle only when the API is present. If it is absent, do nothing — never throw.
Verify: Load the page in a browser without the API and watch the network panel — no request for the tool bundle is made at all (not a request whose script returns early).

#### AR-97 — WebMCP tools honour site access controls
Severity: medium · Source: `.zflow/evidence/specweb/agent-readiness/webmcp.md`
Quote: - Registering tools that bypass the site's own access controls. A WebMCP tool runs as the logged-in user; treat it like any other JavaScript-callable action and apply the same authorisation checks server-side.
Verify: Invoke an account-scoped tool's underlying endpoint unauthenticated (`curl -s -o /dev/null -w '%{http_code}' <endpoint>`) — it must fail exactly as the direct site action does.

#### AR-98 — Annotations honest, never explicitly false
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/webmcp.md`
Quote: - Treating annotations as cosmetic. `readOnlyHint` and `consequentialHint` change agent behaviour; declare them honestly, and never declare a hint as `: false` — omission already means `false`.
Verify: In a supporting browser, inspect registered tools' annotations (`readOnlyHint`, `consequentialHint`, `untrustedContentHint`) — no hint is explicitly false and declared values match observed tool behaviour.

#### AR-99 — Every OKF concept has a non-empty type
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
Quote: - Every non-index, non-log `.md` parses as YAML front matter with a non-empty `type`.
Verify: Iterate the published bundle (or fetch `/okf.tar.gz` and extract), parse each concept's frontmatter, and confirm `type` is present and non-empty.

#### AR-100 — Only the root index.md carries front matter
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
Quote: - `index.md` files carry no front matter (except the root's `okf_version`), and that version matches the field shapes the concepts actually use.
Verify: Check each `index.md` for a `---` front-matter block (only the root has one, declaring `okf_version`), and confirm the declared version matches the fields the concepts emit (0.2 uses `generated.at`/`sources`, not `timestamp`/`# Citations`).

#### AR-101 — Bundle reachable from a discovery surface
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
Quote: - The bundle is reachable from at least one discovery surface (AI Catalog entry, `llms.txt`, or a `Link` header).
Verify: Grep the ai-catalog entries, /llms.txt body, and homepage Link headers for the bundle URL — at least one contains it.

#### AR-102 — Per-resource .jsonld endpoint with CORS
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - `curl -sI https://example.com/articles/foo.jsonld` returns `200` with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.
Verify: Run the quoted curl on sample resource URLs and check status plus both headers.

#### AR-103 — schemamap index parses and lists live URLs
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - `curl -s https://example.com/schemamap.xml | xmllint --noout -` parses cleanly. Every `<jsonld>` URL it lists fetches with `200`.
Verify: Run the quoted xmllint check, then `curl -s /schemamap.xml | grep -oE '<jsonld>[^<]+'` and fetch each listed URL — all return 200.

#### AR-104 — .jsonld graph identical to the embedded JSON-LD
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - Compare the `.jsonld` body to the `<script type="application/ld+json">` block on the same page — the graph (after sorting keys) should be identical.
Verify: `diff <(curl -s <page>.jsonld | jq -S .) <(curl -s <page> | extract-ldjson-script | jq -S .)` — no differences.

#### AR-105 — Schemamap discovery links in <head>
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - Fetch the page HTML and confirm both `<link rel="alternate" type="application/ld+json">` and `<link rel="schemamap">` are present in `<head>`.
Verify: `curl -s <page> | grep -E 'rel="schemamap"|rel="alternate" type="application/ld\+json"'` returns both link tags.

#### AR-106 — Index lists only real schema.org types
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - **Inventing `@type` values to fill the index.** Only list real, valid schema.org types.
Verify: Extract `<type>` values from the index and confirm each is a documented type on schema.org and appears in the referenced page's JSON-LD.

#### AR-107 — Unregistered rel stays out of the HTTP Link header
Severity: low · Source: `.zflow/evidence/specweb/agent-readiness/schemamap.md`
Quote: - **In HTML `<head>` only.** Ship `rel="schemamap"` in the page — that link tag *is* the proposal under test. Do not add it to the global HTTP `Link` header until the relation is registered.
Verify: `curl -sI https://example.com/ | grep -i 'rel="schemamap"'` returns nothing while the homepage HTML does contain the link tag.

### 2.7 Performance — 81 requirements

Field-measured speed (Core Web Vitals at the 75th percentile) and the payload disciplines behind it: images, lazy loading, resource hints, cache-control, validators, Vary/No-Vary-Search, compression, fonts, critical CSS, script loading, HTTP/2+, BFCache, speculation rules, and CSS rendering performance.

Numbering preserved from the distilled section (Requirements 1–81), prefixed `P-`.

Checklist status (`meta/checklist.md`): **Required** — Core Web Vitals, image optimisation, Cache-Control, compression · **Avoid** — HTTP/1.1 workarounds · **Recommended** — lazy loading, preload, prefetch, preconnect, conditional requests, web font loading, critical CSS, script loading, HTTP/2 and HTTP/3, back/forward cache.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### P-1 — Core Web Vitals field thresholds
Severity: high · Source: `.zflow/evidence/specweb/performance/core-web-vitals.md`
Quote: > Core Web Vitals measure loading, responsiveness, and visual stability. Hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile of real users.
Verify: Open the site in PageSpeed Insights (https://pagespeed.web.dev) and read the field data section (CrUX, 75th percentile, mobile and desktop), or query the CrUX API for the origin; all three metrics must show "Good".

#### P-2 — Keep INP responsive
Severity: medium · Source: `.zflow/evidence/specweb/performance/core-web-vitals.md`
Quote: **INP** — break up long JavaScript tasks, defer non-critical work, and avoid heavy work in event handlers. Inside a long task, `await scheduler.yield()` between chunks so the browser can process input — the continuation runs at boosted priority, so your work finishes before other queued tasks. To schedule new low-priority work, use `scheduler.postTask(fn, {priority: 'background'})` or `requestIdleCallback`. Audit third-party scripts.
Verify: In Chrome DevTools → Performance, record clicking primary interactive elements (nav, search, filters, form submit) and check for long tasks >50ms on the main thread and the INP insight; PageSpeed Insights field INP on interaction-heavy pages (forms, search results), not only the homepage.

#### P-3 — Modern image formats
Severity: high · Source: `.zflow/evidence/specweb/performance/image-optimization.md`
Quote: **Use a modern format.** Both AVIF and WebP beat JPEG and PNG by 25–50% at equivalent quality, and AVIF is the smaller of the two. Encode AVIF first: it reached Baseline widely available on 25 July 2026, so it is no longer the risky new format you bolt on behind WebP. The remaining trade-off is time, not support — AVIF encodes far more slowly, which matters for user uploads and large batch jobs, but not for a build step that runs once.
Verify: curl -s -H 'Accept: image/avif,image/webp' -o /dev/null -w '%{content_type}\n' on the hero/major image URLs (expect image/avif or image/webp), or run Lighthouse and confirm the "Serve images in next-gen formats" audit passes.

#### P-4 — Responsive image sizes
Severity: medium · Source: `.zflow/evidence/specweb/performance/image-optimization.md`
Quote: **Serve responsive sizes.** Generate the same image at several widths and let `srcset` plus `sizes` pick the right one. A 4000px image in a 400px slot wastes ~99% of the bytes.
Verify: curl -s <page-url> | grep -o '<img[^>]*>' — main content images carry srcset="…" and sizes="…" attributes.

#### P-5 — Explicit image dimensions
Severity: high · Source: `.zflow/evidence/specweb/performance/image-optimization.md`
Quote: **Always set `width` and `height`.** The browser computes the aspect ratio and reserves the slot, preventing CLS when the image loads.
Verify: curl -s <page-url> | grep -o '<img[^>]*>' — every tag includes width= and height= attributes.

#### P-6 — Keep the picture fallback chain
Severity: low · Source: `.zflow/evidence/specweb/performance/image-optimization.md`
Quote: Keep the `<picture>` chain anyway. "Widely available" describes browser versions released over the past two and a half years, not the ones actually installed, and a fallback costs one line:
Verify: curl -s <page-url> | grep -c 'type="image/avif"' is >0 while a JPEG <img> fallback remains inside the <picture> element.

#### P-7 — Image size budget
Severity: medium · Source: `.zflow/evidence/specweb/performance/image-optimization.md`
Quote: - DevTools → Network → Img. Sort by size. Anything over 200KB needs a second look.
Verify: For each significant image: curl -sI <image-url> | grep -i content-length — values above ~200000 bytes fail the budget.

#### P-8 — Lazy-load off-screen media
Severity: medium · Source: `.zflow/evidence/specweb/performance/lazy-loading.md`
Quote: **Default off-screen images to lazy.** Anything below the fold — gallery thumbnails, author avatars, embedded tweets, YouTube embeds — should be `loading="lazy"`.
Verify: curl -s <page-url> | grep -o '<img[^>]*>' — images after the first screenful carry loading="lazy"; Lighthouse "Offscreen images" audit supports.

#### P-9 — LCP image loads eagerly
Severity: high · Source: `.zflow/evidence/specweb/performance/lazy-loading.md`
Quote: **Keep the LCP image eager.** The hero image, the article lead, the product photo — these must not be lazy-loaded. Browsers honour `loading="lazy"` even when the image is just below the fold on a small viewport, and the LCP cost is significant. When in doubt, use `loading="eager"` (or omit the attribute) for above-the-fold images.
Verify: Identify the hero/LCP image in view source (curl -s <page-url>) and confirm it lacks loading="lazy"; the Lighthouse audit "Largest Contentful Paint image was lazily loaded" must not fire.

#### P-10 — decoding="async" on images
Severity: low · Source: `.zflow/evidence/specweb/performance/lazy-loading.md`
Quote: **Add `decoding="async"` to all images.** It has no downside and helps with main-thread responsiveness.
Verify: curl -s <page-url> | grep -o '<img[^>]*>' | grep -c 'decoding="async"' — present on the page's images.

#### P-11 — Lazy-load third-party iframes
Severity: medium · Source: `.zflow/evidence/specweb/performance/lazy-loading.md`
Quote: **Lazy-load iframes by default.** YouTube and map embeds pull hundreds of kilobytes of JavaScript on every page view. `loading="lazy"` on the iframe defers all of it.
Verify: curl -s <page-url> | grep -o '<iframe[^>]*>' — each third-party embed iframe carries loading="lazy".

#### P-12 — Lazy-load below-the-fold video
Severity: low · Source: `.zflow/evidence/specweb/performance/lazy-loading.md`
Quote: **Lazy-load below-the-fold video.** Combine `loading="lazy"` with `preload="none"` (or `preload="metadata"` if you need the poster frame) so neither the video bytes nor its metadata are fetched until the user reaches it. In older browsers without `loading="lazy"` support, `preload` alone still gives you most of the win.
Verify: curl -s <page-url> | grep -o '<video[^>]*>' — below-the-fold videos pair loading="lazy" with preload="none" or preload="metadata".

#### P-13 — Preload the LCP image
Severity: medium · Source: `.zflow/evidence/specweb/performance/preload-prefetch-preconnect.md`
Quote: **Preload the LCP image.** If your LCP is a hero image, preload it. Combine with `fetchpriority="high"` so it jumps the queue. Do not preload images that already appear early in the HTML — the preload scanner finds them anyway.
Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*as="image"[^>]*>' — the LCP image URL is preloaded and carries fetchpriority="high".

#### P-14 — Preload critical fonts with crossorigin
Severity: medium · Source: `.zflow/evidence/specweb/performance/preload-prefetch-preconnect.md`
Quote: **Preload critical fonts — selectively.** Fonts requested from inside CSS are discovered late, so preloading shortens the path: `as="font" type="font/woff2" crossorigin`. The `crossorigin` attribute is mandatory even for same-origin fonts. The preload competes with critical CSS for bandwidth though, so reserve it for fonts that style above-the-fold text, and always pair with `font-display: swap` or `optional` — see [Web font loading](/spec/performance/font-loading/) for the full tradeoff.
Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*woff2[^>]*>' — the font preload includes as="font", type="font/woff2" and crossorigin; DevTools Network must not show the font fetched twice.

#### P-15 — Preconnect to third-party origins
Severity: medium · Source: `.zflow/evidence/specweb/performance/preload-prefetch-preconnect.md`
Quote: **Preconnect to third-party origins.** If you load images from a CDN, fonts from Google, or analytics from a third party, preconnect saves the TCP+TLS handshake (~100–300ms). Use `crossorigin` for resources fetched with CORS (fonts, fetch, modules).
Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preconnect"[^>]*>' and cross-check each hinted origin against resources the page actually loads (DevTools Network); Lighthouse "Preconnect to required origins" audit.

#### P-16 — Pair dns-prefetch with preconnect
Severity: low · Source: `.zflow/evidence/specweb/performance/preload-prefetch-preconnect.md`
Quote: **Use dns-prefetch as a fallback.** Older browsers and proxies sometimes ignore preconnect. Pair it with dns-prefetch:
Verify: curl -s <page-url> | grep -c 'rel="dns-prefetch"' — dns-prefetch hints appear alongside preconnect for key third-party origins.

#### P-17 — Prefetch the next likely page
Severity: low · Source: `.zflow/evidence/specweb/performance/preload-prefetch-preconnect.md`
Quote: **Prefetch the next likely page.** On a landing page, prefetch the obvious next step. The fetch happens at low priority and won't interfere with the current page.
Verify: curl -s <page-url> | grep -oE 'rel="prefetch"|type="speculationrules"' — the obvious next step (next article, first search result, main CTA target) is prefetched.

#### P-18 — Repeat Early Hints Link headers on the final response
Severity: low · Source: `.zflow/evidence/specweb/performance/early-hints.md`
Quote: - Repeat the same `Link` headers on the final response, so clients that ignore `103` still get the hint.
Verify: curl -sI <page-url> | grep -i '^link:' — the final 200 response itself carries the rel=preload/preconnect Link headers.

#### P-19 — 103 only over HTTP/2 or later
Severity: low · Source: `.zflow/evidence/specweb/performance/early-hints.md`
Quote: - Only send `103` over **HTTP/2 or later**. Some HTTP/1.1 intermediaries mishandle informational responses, so most clients act on Early Hints only over [HTTP/2 or HTTP/3](/spec/performance/http3/).
Verify: curl -sI --http1.1 <page-url> must show no 103 block; 103 may only appear with curl -sI --http2 <page-url>.

#### P-20 — Fingerprinted assets cached immutably
Severity: high · Source: `.zflow/evidence/specweb/performance/cache-control.md`
Quote: Cache-Control: public, max-age=31536000, immutable
Verify: curl -sI <hashed-asset-url> (e.g. https://example.com/app.4f3a2b.js) | grep -i cache-control — includes public, max-age=31536000 and immutable.

#### P-21 — HTML uses short or no caching
Severity: high · Source: `.zflow/evidence/specweb/performance/cache-control.md`
Quote: Cache-Control: public, max-age=0, must-revalidate
Verify: curl -sI <page-url> | grep -i cache-control — HTML shows max-age=0, must-revalidate (or no-store for highly dynamic pages), never max-age=31536000.

#### P-22 — Personalised responses are private
Severity: high · Source: `.zflow/evidence/specweb/performance/cache-control.md`
Quote: **Per-user content — private.** Anything personalised needs `private` to prevent shared caches from leaking one user's data to another.
Verify: curl -sI with a session cookie against a personalised endpoint — Cache-Control includes private; publicly cacheable responses contain no per-user data.

#### P-23 — stale-if-error for resilience
Severity: medium · Source: `.zflow/evidence/specweb/performance/cache-control.md`
Quote: **Survive origin failures — `stale-if-error`.** Defined in RFC 5861, this directive tells shared caches and browsers to keep serving the last good copy when a revalidation request fails — a 5xx from the origin, a timeout, or a connection error. It turns a backend outage into stale-but-working pages instead of error pages:
Verify: curl -sI <sitemap-or-feed-url> | grep -i cache-control — the responses relied on include stale-if-error=<seconds>.

#### P-24 — Never combine stale-if-error with must-revalidate
Severity: low · Source: `.zflow/evidence/specweb/performance/cache-control.md`
Quote: Note that `stale-if-error` is overridden by `must-revalidate` (RFC 9111 forbids serving stale once a `must-revalidate` response is stale), so don't combine the two on the same response.
Verify: curl -sI <url> | grep -i cache-control — must not contain both stale-if-error and must-revalidate on the same response.

#### P-25 — Vary lists exactly what was branched on
Severity: medium · Source: `.zflow/evidence/specweb/performance/vary.md`
Quote: **List exactly what you branched on — no more, no less.** If the server chose this body by reading `Accept-Encoding`, list `Accept-Encoding`. If it did not read `Accept-Language`, do not list it because the site happens to be translated.
Verify: curl -sI -H 'Accept-Encoding: br' <url> and again without the header — where the body differs by encoding, Vary includes Accept-Encoding; fields the server ignores must not be listed.

#### P-26 — Vary on every representation including the default
Severity: medium · Source: `.zflow/evidence/specweb/performance/vary.md`
Quote: **Set it on every representation, including the default.** A cache that stored the HTML response *without* `Vary: Accept` will happily reuse it for a request that asked for Markdown. Both branches of a negotiation need the header, not just the interesting one.
Verify: curl -sI -H 'Accept: text/markdown' <page-url> and curl -sI <page-url> — both responses carry the same Vary header.

#### P-27 — No Vary: Cookie on public pages
Severity: medium · Source: `.zflow/evidence/specweb/performance/vary.md`
Quote: **Treat `Vary: Cookie` on a public page as a bug report.** It nearly always means personalisation has leaked into a document that should have been cacheable. Either mark the response `private`, or move the personal fragment to a separate client-side request and keep the page shared.
Verify: curl -sI <public-page-url> | grep -i '^vary' — Cookie must not be listed on a page intended to be publicly cacheable.

#### P-28 — Avoid Vary: User-Agent
Severity: medium · Source: `.zflow/evidence/specweb/performance/vary.md`
Quote: **Avoid `Vary: User-Agent`.** The one context where it is conventionally sanctioned is serving separate mobile markup from a single URL, and it costs you most of your shared caching to do it. Responsive markup removes the need entirely.
Verify: curl -sI <page-url> | grep -i '^vary' — User-Agent must not appear on a responsive site.

#### P-29 — Justify Vary fields beyond two
Severity: low · Source: `.zflow/evidence/specweb/performance/vary.md`
Quote: - Scan your responses for `Vary` values listing more than two fields. Each one should trace to a branch that genuinely exists in the server code.
Verify: curl -sI across the site's key URLs and count the comma-separated fields in Vary — more than two fields is a flag to investigate.

#### P-30 — Validator on every cacheable response
Severity: medium · Source: `.zflow/evidence/specweb/performance/conditional-requests.md`
Quote: > Send a validator — ETag or Last-Modified — on every cacheable response, and honour If-None-Match / If-Modified-Since so unchanged resources return an empty 304 instead of the full body.
Verify: curl -sI <cacheable-url> | grep -iE '^(etag|last-modified)' — at least one validator is present.

#### P-31 — Conditional GET returns 304
Severity: medium · Source: `.zflow/evidence/specweb/performance/conditional-requests.md`
Quote: - Re-request with it: `curl -s -o /dev/null -w "%{http_code}" -H 'If-None-Match: "…"' https://example.com/asset.js` — expect `304`.
Verify: V=$(curl -sI <url> | grep -i '^etag' | tr -d '\r' | sed 's/^[Ee][Tt][Aa][Gg]: //'); then curl -s -o /dev/null -w '%{http_code}\n' -H "If-None-Match: $V" <url> — must print 304.

#### P-32 — Weak ETags for negotiated content
Severity: low · Source: `.zflow/evidence/specweb/performance/conditional-requests.md`
Quote: - **Use weak ETags (`W/"…"`) for negotiated content.** A weak validator means "semantically equivalent", which is correct when the same URL is served gzip to one client and brotli to another. Pair with a correct `Vary` so caches do not cross the wires — see [compression](/spec/performance/compression/).
Verify: curl -sI -H 'Accept-Encoding: gzip' <url> and curl -sI -H 'Accept-Encoding: br' <url> — ETags on the negotiated representations begin with W/".

#### P-33 — Stable validators
Severity: low · Source: `.zflow/evidence/specweb/performance/conditional-requests.md`
Quote: - **Keep the validator stable across identical bytes.** It must not change on every request (e.g. derived from a timestamp), or revalidation never short-circuits.
Verify: Two sequential curl -sI requests seconds apart to an unchanged URL — the ETag value is identical both times.

#### P-34 — No-Vary-Search for tracking parameters
Severity: medium · Source: `.zflow/evidence/specweb/performance/no-vary-search.md`
Quote: - **List the tracking parameters you actually receive.** UTMs are the universal set. Add `gclid`, `fbclid`, `msclkid`, `mc_cid`, `mc_eid`, and anything else your analytics pipeline adds and your application logic does not consume.
Verify: curl -sI <page-url> | grep -i '^no-vary-search' — the header lists the tracking parameters the site receives.

#### P-35 — No-Vary-Search includes key-order
Severity: low · Source: `.zflow/evidence/specweb/performance/no-vary-search.md`
Quote: - **Add `key-order` unless ordering matters.** It almost never does for query strings, and it catches the common case where the same parameters arrive in different orders.
Verify: curl -sI <page-url> | grep -i '^no-vary-search' — the value includes the key-order token.

#### P-36 — No-Vary-Search must not list response-changing parameters
Severity: low · Source: `.zflow/evidence/specweb/performance/no-vary-search.md`
Quote: - Listing a parameter that does change the response. Adding `page` or `sort` to `params=` collapses different pages into one cached entry. Use `except=` to be safe when in doubt.
Verify: Read the No-Vary-Search value from curl -sI <page-url> — parameters such as page, sort, or q must not appear inside params=(…).

#### P-37 — Brotli preferred, gzip fallback
Severity: high · Source: `.zflow/evidence/specweb/performance/compression.md`
Quote: > Compress text responses with brotli where supported, gzip everywhere else. zstd is emerging. Don't compress already-compressed media.
Verify: curl -sI -H 'Accept-Encoding: br, gzip' <text-url> | grep -i content-encoding — br (or gzip) is returned; identity/absent fails. Lighthouse "Enable text compression" audit.

#### P-38 — Compress all text types
Severity: medium · Source: `.zflow/evidence/specweb/performance/compression.md`
Quote: **Compress all text.** HTML, CSS, JS, JSON, SVG, XML, plain text, and most fonts (WOFF2 is already compressed; WOFF is not).
Verify: For each text type (document, CSS file, JS file, JSON endpoint, SVG): curl -sI -H 'Accept-Encoding: br, gzip' <url> | grep -i content-encoding returns an encoding.

#### P-39 — Vary: Accept-Encoding on compressed responses
Severity: medium · Source: `.zflow/evidence/specweb/performance/compression.md`
Quote: **Set [`Vary: Accept-Encoding`](/spec/performance/vary/).** Tells CDNs to keep a separate cache entry per encoding. Without it, gzip clients may receive a brotli body they can't decode.
Verify: curl -sI -H 'Accept-Encoding: br' <url> | grep -i '^vary' — includes Accept-Encoding whenever Content-Encoding is set; verify what leaves the edge, not just the origin.

#### P-40 — No double compression of media
Severity: low · Source: `.zflow/evidence/specweb/performance/compression.md`
Quote: **Don't double-compress.** Images (JPEG, PNG, WebP, AVIF), video, fonts (WOFF2), and zip files are already compressed. Re-encoding wastes CPU and often grows the file.
Verify: curl -sI <image-or-woff2-url> | grep -i content-encoding — empty for image, video, and WOFF2 responses.

#### P-41 — Never use deflate
Severity: low · Source: `.zflow/evidence/specweb/performance/compression.md`
Quote: - **deflate** — avoid. Ambiguity between raw deflate and zlib wrapping has bitten implementations for decades.
Verify: curl -sI -H 'Accept-Encoding: gzip, deflate, br' <url> | grep -i content-encoding — the negotiated encoding is never deflate.

#### P-42 — Self-host fonts
Severity: medium · Source: `.zflow/evidence/specweb/performance/font-loading.md`
Quote: **Self-host.** Third-party font services add a DNS lookup, TLS handshake, and a second domain to track. Download the WOFF2 files and serve them from your origin.
Verify: curl -s <page-url> | grep -oE 'fonts\.(googleapis|gstatic)\.com|use\.typekit\.(com|net)|cdn\.fonts\.net' — no third-party font origins; font requests go to the site's own origin.

#### P-43 — WOFF2 only
Severity: low · Source: `.zflow/evidence/specweb/performance/font-loading.md`
Quote: **Use WOFF2 only.** All modern browsers support it. WOFF2 is pre-compressed (do not gzip), 30% smaller than WOFF, and 50% smaller than TTF.
Verify: DevTools → Network filtered to Font (or inspect CSS @font-face src): all font requests are .woff2 / Content-Type font/woff2; no .woff, .ttf, or .otf.

#### P-44 — font-display set on every face
Severity: medium · Source: `.zflow/evidence/specweb/performance/font-loading.md`
Quote: **Set `font-display`.** `swap` shows the fallback immediately and swaps when the custom font arrives. `optional` is stricter: if the font isn't cached and ready within ~100ms, the fallback is used permanently — best for CLS. Avoid `block`, which causes FOIT.
Verify: curl -s <css-url> | grep -A8 '@font-face' | grep font-display — every face declares swap or optional; Lighthouse "Ensure text remains visible during webfont load" passes.

#### P-45 — Subset fonts
Severity: low · Source: `.zflow/evidence/specweb/performance/font-loading.md`
Quote: **Subset to what you use.** Google Fonts' default Latin subset covers most English-language sites. If your content is English only, drop Cyrillic, Greek, and Vietnamese subsets — that can halve the file. Tools: `pyftsubset`, `glyphhanger`, `subfont`.
Verify: DevTools → Network font transfer sizes — a Latin text face ships tens of KB in WOFF2, not a 100KB+ multi-script file.

#### P-46 — Fallback font metric overrides
Severity: low · Source: `.zflow/evidence/specweb/performance/font-loading.md`
Quote: **Match metrics to reduce shift.** Use `size-adjust`, `ascent-override`, and `descent-override` on the fallback `@font-face` so the swap doesn't reflow the layout.
Verify: curl -s <css-url> | grep -E 'size-adjust|ascent-override|descent-override' — present on the fallback @font-face declarations.

#### P-47 — Inline critical CSS under ~14KB
Severity: medium · Source: `.zflow/evidence/specweb/performance/critical-css.md`
Quote: **Inline in `<head>`.** Keep the inlined CSS under ~14KB (one TCP slow-start window) so it fits in the first packet.
Verify: curl -s <page-url> and measure the inline <style> block in <head> (≈14KB or less); Lighthouse "Render-blocking requests" insight shows no blocking stylesheet for first paint.

#### P-48 — Non-critical CSS loaded asynchronously
Severity: medium · Source: `.zflow/evidence/specweb/performance/critical-css.md`
Quote: **Load the rest asynchronously.** The `preload` + `onload` swap shown above is the standard pattern. A `<noscript>` fallback covers browsers with JavaScript disabled.
Verify: View source (curl -s <page-url>): non-critical stylesheet uses <link rel="preload" as="style" onload="this.rel='stylesheet'"> plus <noscript><link rel="stylesheet" href="/site.css"></noscript>.

#### P-49 — No third-party render-blocking CSS
Severity: medium · Source: `.zflow/evidence/specweb/performance/critical-css.md`
Quote: **Don't block on third-party CSS.** Webfont providers, analytics dashboards, and chat widgets that drop a stylesheet in `<head>` add an unknown origin to your critical path. Self-host or load asynchronously.
Verify: curl -s <page-url> | grep -o '<link[^>]*rel="stylesheet"[^>]*>' — no third-party-origin stylesheets load render-blocking in head.

#### P-50 — No bare blocking scripts
Severity: high · Source: `.zflow/evidence/specweb/performance/script-loading.md`
Quote: > Choose the right script-loading attribute for every <script>: defer for app code, async for independent third-party, type=module for modern code. Bare <script> in <head> is always wrong.
Verify: curl -s <page-url> | grep -oE '<script[^>]*\bsrc=[^>]*>' — every external script tag carries defer, async, or type="module"; Lighthouse "Render-blocking requests" lists zero scripts.

#### P-51 — Third-party async scripts carry SRI
Severity: medium · Source: `.zflow/evidence/specweb/performance/script-loading.md`
Quote: **Use `async` for independent third-party.** Analytics, A/B tooling, chat widgets — anything that doesn't depend on your code or DOM order. Always pair with [Subresource Integrity](/spec/security/subresource-integrity/) and `crossorigin="anonymous"` so a compromised CDN cannot ship modified code to your visitors:
Verify: curl -s <page-url> | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>' — third-party scripts include integrity="sha384-…" and crossorigin="anonymous".

#### P-52 — modulepreload for critical module dependencies
Severity: low · Source: `.zflow/evidence/specweb/performance/script-loading.md`
Quote: **Preload module dependencies.** Modules fetched via `import` are discovered lazily — preload them so the browser starts fetching during initial parse:
Verify: curl -s <page-url> | grep 'rel="modulepreload"' — critical imported modules (router, store) are preloaded ahead of the module entry point.

#### P-53 — Drop the nomodule shim
Severity: low · Source: `.zflow/evidence/specweb/performance/script-loading.md`
Quote: **Drop the legacy `nomodule` shim.** Every shipping browser in 2026 supports `type="module"`. The `nomodule` fallback was useful in 2018; it now ships a second bundle for users who don't exist.
Verify: curl -s <page-url> | grep -c 'nomodule' — expect 0 (no second legacy bundle shipped).

#### P-54 — Serve over HTTP/2 at minimum
Severity: medium · Source: `.zflow/evidence/specweb/performance/http3.md`
Quote: > Serve over HTTP/2 at minimum and HTTP/3 where you can. Multiplexing eliminates head-of-line blocking; QUIC removes TCP handshake delays.
Verify: curl -sI -o /dev/null -w '%{http_version}\n' <page-url> — prints 2 or 3, never 1.1.

#### P-55 — One origin for static assets
Severity: medium · Source: `.zflow/evidence/specweb/performance/http3.md`
Quote: **Keep one origin.** HTTP/2 and HTTP/3 reward consolidation. Splitting assets across `cdn1`, `cdn2`, `assets.` forces new connections; on a single origin everything reuses the same one.
Verify: curl -s <page-url> | grep -oE 'https?://[A-Za-z0-9.-]+' | sort -u — one primary asset origin; no cdn1/cdn2/assets shard hostnames.

#### P-56 — Advertise HTTP/3 via Alt-Svc
Severity: low · Source: `.zflow/evidence/specweb/performance/http3.md`
Quote: **Verify `Alt-Svc`.** If you've enabled HTTP/3 but `Alt-Svc` isn't set, browsers will never upgrade. Most edge providers add it automatically.
Verify: curl -sI <page-url> | grep -i 'alt-svc' — advertises h3=":443"; corroborate reachability with curl --http3 -I <page-url> or an HTTP/3 probe site (http3check.net).

#### P-57 — Drop image sprites
Severity: low · Source: `.zflow/evidence/specweb/performance/http1-workarounds.md`
Quote: - **Sprites** force every page to download every icon, including ones it never shows, and bust the whole sheet when one icon changes. Individual images, inline SVG, or an icon font are smaller and cache better.
Verify: Inventory the page's assets (curl the HTML and CSS): no single large sprite.png/icons.png sliced via background-position; icons are inline SVG or individual images.

#### P-58 — Few, well-sized JS bundles
Severity: low · Source: `.zflow/evidence/specweb/performance/http1-workarounds.md`
Quote: - Check that critical CSS is inline in the HTML and that JS ships as a small number of bundles, not one monolith and not a swarm of modules.
Verify: DevTools → Network JS filter (or count script srcs in the HTML): a handful of bundles, not one giant file or hundreds of tiny module requests.

#### P-59 — Speculation Rules with moderate eagerness
Severity: medium · Source: `.zflow/evidence/specweb/performance/speculation-rules.md`
Quote: `eagerness` ranges from `conservative` (only on hover/touch) to `eager` (as soon as the rule is parsed). `moderate` is the sensible default — Chromium triggers on hover-with-intent and pointerdown.
Verify: curl -s <page-url> | grep -A6 'speculationrules' — a rules block exists and eagerness is moderate or conservative; Chrome DevTools → Application → Speculative loads shows the rules matching.

#### P-60 — Never speculate on side-effect URLs
Severity: medium · Source: `.zflow/evidence/specweb/performance/speculation-rules.md`
Quote: **Don't speculate on URLs with side effects.** Logout endpoints, "delete" actions, payment flows. Use `urls`/`href_matches` carefully and exclude them.
Verify: Read the speculationrules JSON in view source — logout/delete/payment endpoints are not matched by any prefetch or prerender rule.

#### P-61 — Analytics wait for prerenderingchange
Severity: low · Source: `.zflow/evidence/specweb/performance/speculation-rules.md`
Quote: **Handle JavaScript correctly.** Prerendered pages run their JS in a hidden, non-active context. Wait for the [`prerenderingchange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerenderingchange_event) event before running analytics, starting media, or anything user-visible:
Verify: View source / delivered JS: analytics init is guarded by a document.prerendering check with a prerenderingchange listener, not executed on script load.

#### P-62 — Prerender targets must not be no-store
Severity: low · Source: `.zflow/evidence/specweb/performance/speculation-rules.md`
Quote: - Conflicting `Cache-Control: no-store` headers on the target page. Browsers refuse to prerender no-store responses by design.
Verify: curl -sI <prerender-target-url> | grep -i cache-control — no no-store on pages matched by prerender rules.

#### P-63 — At most ~5 resource hints in head
Severity: medium · Source: `.zflow/evidence/specweb/performance/resource-hints.md`
Quote: - More than ~5 hints in the head. Each one competes for bandwidth.
Verify: curl -s <page-url> | grep -coE 'rel="(preload|prefetch|preconnect|modulepreload|dns-prefetch)"' — count is ~5 or fewer.

#### P-64 — No redundant preloads
Severity: low · Source: `.zflow/evidence/specweb/performance/resource-hints.md`
Quote: - Preloading the same resource that is already referenced by a `<link rel="stylesheet">` higher in the head. The preload scanner finds it; the hint is noise.
Verify: Load the page in Chrome and watch the console for "<link rel=preload> was preloaded using link preload but not used within a few seconds"; compare preload hrefs against stylesheets already early in head.

#### P-65 — Cross-document view transitions opt-in
Severity: low · Source: `.zflow/evidence/specweb/performance/view-transitions.md`
Quote: When the user navigates from page A to page B and both pages have this rule, the browser captures A, replaces it with B, and cross-fades. No JavaScript required.
Verify: curl -s <main-css-url> | grep -A2 '@view-transition' — declares navigation: auto; navigate between two site pages in Chrome and observe the cross-fade.

#### P-66 — View transitions respect reduced motion
Severity: medium · Source: `.zflow/evidence/specweb/performance/view-transitions.md`
Quote: - Ignoring `prefers-reduced-motion`. People with vestibular disorders should not be motion-tested for a route change.
Verify: curl -s <css-url> | grep -B3 -A6 'prefers-reduced-motion' — view-transition pseudo-elements get animation: none; DevTools → Rendering → emulate prefers-reduced-motion and confirm the transition disappears entirely.

#### P-67 — View transitions stay 150–250ms
Severity: low · Source: `.zflow/evidence/specweb/performance/view-transitions.md`
Quote: **Keep transitions short** — 150–250ms. Longer feels sluggish; shorter feels like a flash.
Verify: DevTools → Animations panel records the view transition timing — duration falls in the 150–250ms range.

#### P-68 — No unload listeners (BFCache)
Severity: medium · Source: `.zflow/evidence/specweb/performance/bfcache.md`
Quote: **Never listen for `unload`.** This is the single most common disqualifier. Use `pagehide` for cleanup and `visibilitychange` for "user left the tab" semantics. Both fire reliably and neither blocks BFCache.
Verify: curl -s <page-url> | grep -cE "addEventListener\(['"]unload" — expect 0; Lighthouse "Page prevented back/forward cache restoration" audit passes, and DevTools → Application → Back/forward cache test lists no unload-related disqualifier.

#### P-69 — No Cache-Control: no-store on HTML (BFCache)
Severity: medium · Source: `.zflow/evidence/specweb/performance/bfcache.md`
Quote: **Do not set `Cache-Control: no-store` on HTML.** All major browsers refuse to cache `no-store` responses for BFCache. `no-cache` is fine — it forces revalidation on a real navigation, but the page is still eligible to be restored from memory on back/forward. See [Cache-Control](/spec/performance/cache-control/).
Verify: curl -sI <page-url> | grep -i cache-control — HTML is not no-store; manual back-navigation smoke test shows no network request for the page.

#### P-70 — Handle BFCache restore
Severity: low · Source: `.zflow/evidence/specweb/performance/bfcache.md`
Quote: **Handle the restore.** The `pageshow` event fires with `event.persisted === true` when the page comes back from BFCache. Treat it as "I was frozen — re-sync":
Verify: View source / delivered JS: a pageshow listener checks event.persisted and re-fires analytics or refreshes state on restore.

#### P-71 — content-visibility with contain-intrinsic-size
Severity: low · Source: `.zflow/evidence/specweb/performance/visibility-aware-rendering.md`
Quote: **`content-visibility` on long, repeating sections.** Always pair it with `contain-intrinsic-size` so the browser can reserve layout space for the skipped subtree:
Verify: curl -s <css-url> | grep -B2 -A2 'content-visibility' — long sections declare content-visibility: auto and a matching contain-intrinsic-size value.

#### P-72 — Intersection Observer over scroll listeners
Severity: low · Source: `.zflow/evidence/specweb/performance/visibility-aware-rendering.md`
Quote: **Intersection Observer** is a Web API that fires a callback when an element crosses a configurable threshold relative to the viewport (or another scroll root). It replaces hand-rolled `scroll` and `resize` listeners that ran on every frame.
Verify: Search the delivered JS for addEventListener('scroll' and addEventListener('resize' driving lazy/reveal logic — each hit is a candidate that should be an IntersectionObserver or loading="lazy".

#### P-73 — contain: content on self-enclosed components
Severity: low · Source: `.zflow/evidence/specweb/performance/css-containment.md`
Quote: Apply `contain: content` to self-enclosed components — cards, sidebars, widgets, repeated list items — where children stay within the box and have predictable sizing:
Verify: curl -s <css-url> | grep 'contain:' — repeated component selectors declare contain: content (or layout paint style).

#### P-74 — Scroll-driven animations in CSS
Severity: low · Source: `.zflow/evidence/specweb/performance/scroll-driven-animations.md`
Quote: > Drive CSS animations from scroll position or element visibility with `scroll-timeline` and `view-timeline`, replacing JS scroll-listener libraries with compositor-thread animation.
Verify: Where scroll effects exist, inspect the delivered CSS for animation-timeline: scroll()/view() and confirm no JS scroll-listener library (rAF + scroll pattern) is doing the same job.

#### P-75 — Animate compositor properties only
Severity: low · Source: `.zflow/evidence/specweb/performance/scroll-driven-animations.md`
Quote: - **Animating layout properties** (`width`, `height`, `top`, `margin`) instead of `transform` and `opacity`. The compositor win disappears the moment the browser has to relayout on every frame.
Verify: Inspect delivered CSS keyframes — animated properties are transform/opacity/filter, never width/height/top/margin.

#### P-76 — Scroll-driven animations honour reduced motion
Severity: medium · Source: `.zflow/evidence/specweb/performance/scroll-driven-animations.md`
Quote: - **Forgetting `prefers-reduced-motion`.** Scroll-driven motion is exactly the kind that triggers vestibular issues. Always provide an opt-out.
Verify: curl -s <css-url> | grep -A3 'prefers-reduced-motion' — scroll-driven animations are set to none under reduce; DevTools → Rendering toggle makes the motion disappear, not merely shorten.

#### P-77 — scrollbar-gutter: stable at the root
Severity: low · Source: `.zflow/evidence/specweb/performance/scrollbar-gutter.md`
Quote: > Use scrollbar-gutter: stable to reserve scrollbar space and stop horizontal layout shift between pages or states that overflow vs. don't.
Verify: curl -s <css-url> | grep 'scrollbar-gutter' — stable is set on :root; on a classic-scrollbar system (Windows), open a short and a tall page in the same window and confirm element x-positions are identical.

#### P-78 — Dynamic viewport units instead of 100vh
Severity: medium · Source: `.zflow/evidence/specweb/performance/dynamic-viewport-units.md`
Quote: > On mobile, 100vh is taller than the screen because it ignores the browser's collapsing toolbar. Use dvh, svh, and lvh to size full-height elements to the viewport that is actually visible.
Verify: curl -s <css-url> | grep -n '100vh' — full-height sections use 100svh/100dvh (100vh at most as a legacy fallback line); on a real phone the hero's bottom edge is not hidden behind the URL bar.

#### P-79 — svh for must-always-fit elements
Severity: low · Source: `.zflow/evidence/specweb/performance/dynamic-viewport-units.md`
Quote: - For an element that must **always fit** on first paint — a landing hero, a login screen, a modal — use `svh`. It is the conservative choice that never overflows, in any toolbar state.
Verify: Inspect CSS for hero/login/modal sizing — min-height: 100svh (or max-height: …dvh for overlays), not 100vh alone.

#### P-80 — Vary on Available-Dictionary when using dictionary transport
Severity: low · Source: `.zflow/evidence/specweb/performance/compression-dictionary-transport.md`
Quote: **Always vary on `Available-Dictionary`.** A cache that ignores it will hand a dictionary-compressed body to a client that lacks the dictionary, which cannot decode it.
Verify: curl -sI <url> | grep -i '^vary' — includes Available-Dictionary whenever Use-As-Dictionary or Content-Encoding: dcb/dcz is in play.

#### P-81 — Server-Timing free of infrastructure detail
Severity: low · Source: `.zflow/evidence/specweb/performance/server-timing.md`
Quote: - **Leaking infrastructure detail.** The header is visible to anyone. Internal service names, query counts, and host identifiers are an information-disclosure surface; the [spec warns about this](https://www.w3.org/TR/server-timing/#privacy-and-security). Send coarse labels publicly, or gate richer metrics behind authentication.
Verify: curl -sI <page-url> | grep -i '^server-timing' — metric names/descriptions are coarse (db, cache, edge) with no internal hostnames, SQL text, or version strings.

### 2.8 Privacy — 51 requirements

GDPR-grade data practices observable from the outside: privacy-policy disclosures, prior opt-in cookie consent, Global Privacy Control, third-party script discipline, Storage Access API, privacy-respecting analytics, and data minimisation.

Checklist status (`meta/checklist.md`): **Required** — privacy policy, cookie consent · **Recommended** — Global Privacy Control, third-party scripts, privacy-respecting analytics, data minimisation.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### PRV-01 — Privacy policy names the controller with a postal address and privacy contact
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Identity of the controller**, including a postal address and a contact for privacy questions. If you have a Data Protection Officer, name them.
Verify: Fetch the privacy policy page (e.g. `curl -s https://example.com/privacy/`) and check the text for a legal/entity name, a postal address, and a privacy contact (email or form); a named DPO if applicable.

#### PRV-02 — Categories of personal data are disclosed
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Categories of personal data** you process — account data, usage data, payment data, contact data, technical identifiers like IP addresses.
Verify: `curl -s https://example.com/privacy/ | grep -iE "usage data|payment data|IP address|account data|contact data"` — confirm at least the categories actually in use on the site are named.

#### PRV-03 — A purpose is stated for each data category
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Purposes** for each category — running the service, billing, marketing, analytics, security, legal compliance.
Verify: Read the policy body (fetch with `curl -s`) and confirm each disclosed data category is tied to at least one named purpose, not a single undifferentiated "we use data" statement.

#### PRV-04 — Lawful basis stated per purpose
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Lawful basis** under GDPR Article 6 for each purpose: consent, contract, legal obligation, vital interests, public task, or legitimate interests. If you rely on legitimate interests, say what they are.
Verify: `curl -s https://example.com/privacy/ | grep -iE "legal basis|lawful basis|legitimate interest"` and confirm each named purpose maps to a basis; any "legitimate interests" claim is accompanied by what the interest is.

#### PRV-05 — Recipients/processors named and non-EU/UK transfers flagged with safeguard
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Recipients and processors** — payment providers, hosting, email, analytics, customer support tools. List by name or category, and indicate transfers outside the EU/UK with the safeguard used (SCCs, adequacy decision).
Verify: `curl -s https://example.com/privacy/ | grep -iE "hosting|payment provider|email service|analytics"` for named/category recipients, and `grep -iE "standard contractual|SCC|adequacy"` for the transfer safeguard; a bare "we may share data with partners" line fails.

#### PRV-06 — Retention periods or criteria disclosed
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Retention periods** for each category, or the criteria used to determine them.
Verify: `curl -s https://example.com/privacy/ | grep -iE "retain|retention|how long|delete.*after"` — confirm a period or criterion appears per category, not absent entirely.

#### PRV-07 — Data-subject rights listed, including complaint to a supervisory authority
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Rights** — access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority.
Verify: `curl -s https://example.com/privacy/ | grep -icE "erasure|rectification|portability"` — the rights enumeration (or equivalents like "right to be forgotten") must be present.

#### PRV-08 — Cookie/tracking disclosure present
Severity: medium · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **Cookies and tracking**, either inline or by linking to a separate cookie notice.
Verify: `curl -s https://example.com/privacy/ | grep -iE "cookie"` — confirm either an inline cookies section or a link to a dedicated cookie notice page.

#### PRV-09 — Visible "last updated" date at the top of the policy
Severity: low · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: - **A "last updated" date** that is visible at the top of the page.
Verify: `curl -s https://example.com/privacy/ | grep -iE "last updated|updated on|last revised"` and confirm the date appears near the top of the rendered page (inspect the first content block in the HTML body).

#### PRV-10 — Policy linked from the footer of every page, not behind a login
Severity: high · Source: `.zflow/evidence/specweb/privacy/privacy-policy.md`
Quote: Link to the policy from the footer of every page. Do not put it behind a login.
Verify: On the homepage and key public pages run `curl -s https://example.com/<page> | grep -io 'href="[^"]*privacy[^"]*"'` (footer link present), then `curl -sI https://example.com/privacy/` expecting HTTP 200 without an auth redirect.

#### PRV-11 — Non-essential device storage requires prior opt-in consent (EU/UK)
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: > In the EU and UK, non-essential cookies and similar storage require freely given, informed, specific, and unambiguous opt-in consent before they are set.
Verify: Fresh browser profile (no stored state), load the homepage without clicking anything: `document.cookie` and DevTools → Application → Local Storage contain no analytics/ad entries, and the network panel shows no tracking requests; also `curl -sI https://example.com/` and inspect `Set-Cookie` for non-essential cookies on the first response.

#### PRV-12 — Consent rule covers all storage technologies, not just cookies
Severity: medium · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: This applies to cookies, but also to localStorage, sessionStorage, IndexedDB, fingerprinting, and pixel trackers. The technology does not matter; the storage and access do.
Verify: On a first visit with no interaction, check DevTools → Application → Local Storage / IndexedDB for analytics keys (e.g. `_hjSessionUser`, amplitude/gtag IDs) and the network panel for pixel image requests (`/collect`, `/tr?id=`), all of which must be absent before consent.

#### PRV-13 — Only strictly necessary storage is exempt from consent
Severity: medium · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Strictly necessary cookies do not need consent.** Session cookies for login, shopping carts, security tokens, and load balancing are exempt. Analytics, advertising, social embeds, and A/B testing are not.
Verify: Classify every cookie/storage key and third-party request observed pre-consent against the exempt list; any analytics/ad/social/A/B item appearing before consent is a failure of PRV-11 and this classification.

#### PRV-14 — No non-essential cookies or tracking scripts before the user accepts
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Set no non-essential cookies before the user accepts.** This includes Google Analytics, Meta Pixel, Hotjar, YouTube embeds, and most "marketing" tags.
Verify: `curl -s https://example.com/ | grep -E "googletagmanager|google-analytics|gtag|connect\.facebook\.net|static\.hotjar\.com|youtube-nocookie|youtube\.com/embed"` — matches must be consent-gated (injected only after choice), e.g. absent from initial HTML for client-side gating; in a clean browser, no such requests fire before the consent click.

#### PRV-15 — "Accept" and "reject" given equal prominence
Severity: medium · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Give "accept" and "reject" equal prominence.** Same size, same colour weight, same number of clicks. A bright green "Accept all" next to a grey "Manage preferences" is non-compliant.
Verify: Open the banner in a browser, screenshot it, and compare the accept/reject controls (size, contrast, style) in the same dialog; a DOM check confirms both an accept and a reject control exist as siblings in the banner.

#### PRV-16 — Rejecting is one click, as easy as accepting
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Rejecting must be as easy as accepting.** One click. Not a maze of toggles.
Verify: Load the site, observe the banner, and confirm a "Reject all" control completes rejection with one click — not hidden behind "Manage preferences".

#### PRV-17 — Reject means reject: no tracking, no fingerprinting fallback, no default-on legitimate-interests toggle
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Reject means reject.** No tracking cookies, no fingerprinting fallback, no "legitimate interests" toggle that is on by default.
Verify: Click "Reject all", reload and browse: `document.cookie` has no tracking cookies and the network panel shows no tracker requests; open the preferences pane and confirm no non-essential or legitimate-interests purpose is pre-enabled.

#### PRV-18 — Purposes are specific categories users can choose between
Severity: medium · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Be specific about purposes.** "Analytics" and "marketing" are categories users can choose between; "improving your experience" is not.
Verify: Open the banner's preferences view and confirm per-purpose toggles labelled with concrete categories (analytics, marketing/advertising, functional).

#### PRV-19 — Persistent footer link to reopen the banner
Severity: medium · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Let users change their mind.** A persistent link in the footer to reopen the banner.
Verify: `curl -s https://example.com/ | grep -iE "cookie settings|cookie preferences|manage cookies|consent"` — a footer link/control that reopens the banner must exist on public pages; click it in a browser to confirm the banner reopens.

#### PRV-20 — Banner does not re-ask on every visit
Severity: low · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - **Re-ask only when the purposes change**, not every visit.
Verify: Accept or reject, then reload and navigate between pages in the same profile: the banner must not render again while the stored consent persists.

#### PRV-21 — Consent choice is stored as a record
Severity: low · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: The banner is not the consent record. Store the user's choice — what they consented to, when, and which version of the notice they saw.
Verify: After choosing, inspect DevTools → Application → Cookies/Local Storage for a consent entry containing purpose state and a timestamp/version (e.g. OneTrust/CookieYes/Cookiebot consent keys).

#### PRV-22 — No pre-ticked boxes or toggles for non-essential purposes
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - Pre-ticked boxes for any non-essential purpose. The CJEU ruled this invalid in *Planet49* (2019).
Verify: Open the banner's preferences/details view and inspect the default state of every non-essential purpose toggle — all must be off; also inspect the markup (`curl -s | grep -i 'checked'`) for pre-checked consent checkboxes.

#### PRV-23 — No "by using this site you agree" implied consent
Severity: high · Source: `.zflow/evidence/specweb/privacy/cookie-consent.md`
Quote: - "By using this site you agree" — implied consent is not valid consent under GDPR.
Verify: `curl -s https://example.com/ | grep -iE "by using this site|by continuing (to use|to browse)|continued use"` — no such implied-consent claim may serve as the consent mechanism.

#### PRV-24 — GPC signal suppresses advertising trackers, retargeting pixels, and data-broker tags
Severity: medium · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: - **Do not load advertising trackers**, retargeting pixels, or data-broker tags.
Verify: Compare `curl -s -H "Sec-GPC: 1" https://example.com/` against `curl -s https://example.com/` (server-injected tracker markup should differ), and in a GPC-enabled browser (Firefox with global privacy control on, or DuckDuckGo/Brave) confirm the network panel shows no ad-tech/data-broker requests.

#### PRV-25 — GPC means no sale or sharing of personal information
Severity: medium · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: - **Do not sell or share** personal information as those terms are defined under the user's applicable law.
Verify: With GPC active (browser signal or `curl -H "Sec-GPC: 1"`), verify no third-party ad/data-broker requests carrying identifiers occur (network panel) — the observable proxy for sale/share — and that the site does not expose a "do not sell" state contradicting the signal.

#### PRV-26 — GPC suppresses consent-banner "accept" defaults
Severity: low · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: - **Suppress consent-banner "accept" defaults** — the user has already expressed a preference.
Verify: Load the site in a GPC-enabled browser, open the banner/preferences, and confirm tracking purposes are not pre-accepted or pre-enabled.

#### PRV-27 — GPC honouring disclosed in the privacy policy
Severity: low · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: - **Disclose your behaviour** in the privacy policy: state that you honour GPC and what that means in practice.
Verify: `curl -s https://example.com/privacy/ | grep -iE "global privacy control|GPC"` — a statement of GPC handling must be present.

#### PRV-28 — Machine-readable GPC support resource at /.well-known/gpc.json
Severity: low · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: Once the signal is actually processed, you can say so in machine-readable form by publishing a [GPC support resource at `/.well-known/gpc.json`](/spec/well-known/gpc-json/). That file declares the origin's position for tooling that wants to ask without visiting; it is a declaration, not an implementation, so publish it second.
Verify: `curl -s https://example.com/.well-known/gpc.json` — when the site honours GPC, this returns valid JSON declaring the origin's GPC position (a missing file only fails if GPC is otherwise honoured).

#### PRV-29 — GPC processed for every user who sends it, regardless of state/region
Severity: medium · Source: `.zflow/evidence/specweb/privacy/global-privacy-control.md`
Quote: - Honouring GPC only for users who identify themselves as Californian. The signal does not include a state, and the AG has been clear: process it for any user who sends it.
Verify: Send `curl -s -H "Sec-GPC: 1"` (and load in a GPC browser) from any region with no location signals (no geo cookies/params) and confirm tracker suppression applies identically.

#### PRV-30 — Every third-party domain the pages contact is audited
Severity: low · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Audit what you have.** Use the network panel, or a tool like Request Map, to list every domain your pages contact. Most sites are surprised.
Verify: Generate a Request Map (requestmap.com) or WebPageTest third-party report for the homepage and key templates; every contacted domain should be identifiable and justifiable (no mystery trackers).

#### PRV-31 — Fonts, JavaScript libraries, and icon sets are self-hosted
Severity: low · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Self-host where you can.** Fonts, JavaScript libraries, and icon sets rarely need to come from a CDN. Self-hosting eliminates a third-party contact entirely and is often faster.
Verify: `curl -s https://example.com/ | grep -oE "(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|use\.fontawesome\.com)[^\"']*)*" | sort -u` — expect no hits (or only consent-gated ones) when assets are self-hosted.

#### PRV-32 — Non-essential third-party scripts deferred or consent-gated
Severity: medium · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Defer or gate the rest.** Anything that is not essential to first render should load after user interaction, or only after consent for non-essential storage.
Verify: Load a public page in a clean browser with no interaction: the network panel shows no chat widgets, A/B testers, session-replay, or marketing tags on first paint.

#### PRV-33 — Content Security Policy with a script-src allowlist
Severity: medium · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Use a Content Security Policy.** A `script-src` allowlist prevents a compromised page from loading scripts you did not approve. See `security/content-security-policy`.
Verify: `curl -sI https://example.com/ | grep -i content-security-policy` (also check `<meta http-equiv="Content-Security-Policy">` in `curl -s` output) — a policy must exist and its `script-src` must list specific sources; `script-src *` (or an absent directive with `default-src *`) fails.

#### PRV-34 — Subresource Integrity on third-party scripts
Severity: low · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Use Subresource Integrity** for any script you must load from a third party where the URL is stable. An SRI hash ensures the file has not changed since you audited it. See `security/subresource-integrity`.
Verify: `curl -s https://example.com/ | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>'` — every cross-origin script tag in the initial HTML should include `integrity="sha384-…"`.

#### PRV-35 — Referrer-Policy of strict-origin-when-cross-origin or stricter
Severity: medium · Source: `.zflow/evidence/specweb/privacy/third-party-scripts.md`
Quote: - **Set a Referrer-Policy** of `strict-origin-when-cross-origin` or stricter. It trims the URL carried in the `Referer` header the browser sends when it fetches a third-party resource, so a pixel or image endpoint sees your origin rather than the full path and query string.
Verify: `curl -sI https://example.com/ | grep -i referrer-policy` — value must be one of `strict-origin-when-cross-origin`, `no-referrer`, `same-origin`, or `strict-origin`; `unsafe-url`/`origin-when-cross-origin` or a missing header fails.

#### PRV-36 — Storage Access API used only by embedded cross-site content, never first-party pages
Severity: low · Source: `.zflow/evidence/specweb/privacy/storage-access-api.md`
Quote: - Reach for it only when embedded content genuinely needs its own unpartitioned cookies — SSO, federated identity, a signed-in widget. A first-party site setting its own cookies never needs it.
Verify: `curl -s https://example.com/ | grep -c "requestStorageAccess"` — first-party markup/scripts must show 0 usages; any hit must be inside a cross-site `<iframe>` embed's own script.

#### PRV-37 — requestStorageAccess() called only inside a user-gesture handler
Severity: low · Source: `.zflow/evidence/specweb/privacy/storage-access-api.md`
Quote: - From the embed, call `hasStorageAccess()`; if it is false, call `requestStorageAccess()` inside a click or tap handler — it requires transient activation (a user gesture). Await the promise, load the credentialed view on success, and degrade gracefully on rejection.
Verify: Fetch the embed's script (`curl -s <script-url>`) and confirm `requestStorageAccess()` is invoked within a user-event handler, not at top level; on the live page, no storage-access prompt appears without a click.

#### PRV-38 — Cookies used in the cross-site flow are SameSite=None; Secure over HTTPS
Severity: low · Source: `.zflow/evidence/specweb/privacy/storage-access-api.md`
Quote: - Cookies must be `SameSite=None; Secure` to travel cross-site (see [cookie attributes](/spec/security/cookie-attributes/)), and the whole flow works only in a secure (HTTPS) context.
Verify: `curl -sI https://<embedded-provider>/login | grep -i set-cookie` — the embedded provider's cookies show `SameSite=None; Secure`; the embedding page is served over HTTPS (`curl -sI https://example.com/` succeeds, no TLS errors).

#### PRV-39 — Embedding page does not block storage access via Permissions-Policy or sandbox
Severity: low · Source: `.zflow/evidence/specweb/privacy/storage-access-api.md`
Quote: - The embedding page must permit it: an `allow-storage-access-by-user-activation` sandbox token on a sandboxed iframe, and no `storage-access` [Permissions-Policy](/spec/security/permissions-policy/) blocking it.
Verify: `curl -sI https://example.com/ | grep -i permissions-policy` — must not contain `storage-access=()`; `curl -s https://example.com/ | grep -oE '<iframe[^>]*sandbox="[^"]*"'` — any sandboxed embed needing storage access includes the `allow-storage-access-by-user-activation` token.

#### PRV-40 — Analytics runs without cookies or persistent client identifiers
Severity: medium · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Measure without cookies.** Use a daily-rotating hash of IP + user-agent + a site salt to estimate uniques. Drop the raw IP before it hits disk.
Verify: Load a page and inspect the analytics endpoint in the network panel: its responses set no `Set-Cookie` and the page stores no analytics cookies/localStorage keys (e.g. no `_ga`/`_hj*`); the tool in page source is a cookieless pattern (Plausible, Fathom, self-hosted Matomo without cookies, Cloudflare Web Analytics).

#### PRV-41 — Aggregation at write time rather than per-visitor event storage
Severity: low · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Aggregate at write time.** Store counts per page per day, not individual events with timestamps, unless you genuinely need them.
Verify: Check the analytics vendor's public data-model documentation for aggregate-only storage (read-only, documentation-level check); tools storing raw per-visitor event streams fail unless a necessity is documented.

#### PRV-42 — Any kept IP data is anonymised
Severity: low · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Anonymise the IP** at the edge if any IP is kept. The last octet of an IPv4 (or the last 80 bits of an IPv6) is enough to break linkability and still keep country-level geo.
Verify: For self-hosted Matomo, open its public privacy settings or docs and confirm "Anonymize IP" is enabled; for hosted tools, confirm IP truncation in the vendor's documentation (documentation-level check).

#### PRV-43 — Analytics data kept in the relevant jurisdiction (EU-hosted for EU traffic)
Severity: medium · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Keep data in the relevant jurisdiction.** For EU traffic, that means an EU-hosted analytics endpoint and an EU sub-processor list.
Verify: Identify the analytics hostname in page source, resolve it (`dig +short analytics.example.com`), and geo-locate the result (e.g. `curl -s ipinfo.io/<ip>`); check the vendor's published sub-processor list for EU processing.

#### PRV-44 — Short analytics retention (about ninety days of aggregates)
Severity: low · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Set a short retention.** Ninety days of daily aggregates answers most product questions. Raw events should be even shorter.
Verify: Check the stated retention in the privacy policy (`curl -s https://example.com/privacy/ | grep -iA2 analytic`) and/or the vendor's documented default retention; anything open-ended ("indefinitely") fails.

#### PRV-45 — Analytics tooling documented in the privacy policy
Severity: medium · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: - **Document it.** The privacy policy should name the analytics tool, the data collected, the retention period, and the legal basis.
Verify: Cross-reference the analytics script found in page source with `curl -s https://example.com/privacy/ | grep -iE "plausible|fathom|matomo|cloudflare web analytics|google analytics"` — the tool actually loaded must be named with data, retention, and basis.

#### PRV-46 — Ad-tech-grade analytics isolated behind explicit consent
Severity: medium · Source: `.zflow/evidence/specweb/privacy/analytics-privacy.md`
Quote: If you must use ad-tech-grade analytics for marketing attribution, isolate it behind explicit consent and treat it as a separate system from product analytics.
Verify: In a clean browser before any consent click, no GA4/ads-grade measurement requests fire (network panel); after accepting "marketing"/"analytics" consent they may — the pre-consent network log is the observable check.

#### PRV-47 — Every public form field has a named purpose
Severity: medium · Source: `.zflow/evidence/specweb/privacy/data-minimization.md`
Quote: **Collection.** Walk through every form and every API. For each field, name the purpose. Drop anything that fails the test.
Verify: Enumerate inputs on each public form (`curl -s https://example.com/<form-page> | grep -oE '<(input|select|textarea)[^>]*name="[^"]*"'`) and justify each field against the form's function; unexplainable fields (e.g. date of birth on a service with no age requirement) fail.

#### PRV-48 — Newsletter signup collects only an email address
Severity: medium · Source: `.zflow/evidence/specweb/privacy/data-minimization.md`
Quote: - A newsletter signup needs an email address. It does not need a name, a phone number, or a job title.
Verify: Inspect the newsletter form markup (`curl -s https://example.com/ | grep -iA8 -B2 "newsletter"`) — only the email input (plus a consent checkbox where required) should be present.

#### PRV-49 — Contact form collects only what is needed to reply
Severity: low · Source: `.zflow/evidence/specweb/privacy/data-minimization.md`
Quote: - A contact form needs a way to reply. If you reply by email, you do not need a phone number.
Verify: `curl -s https://example.com/contact | grep -ioE 'name="(tel|phone)[^"]*"'` — a phone field on an email-reply contact form fails.

#### PRV-50 — No delivery address demanded for digital downloads
Severity: low · Source: `.zflow/evidence/specweb/privacy/data-minimization.md`
Quote: - A delivery address is necessary to deliver a physical product. It is not necessary to download a PDF.
Verify: Walk the public download flow read-only and confirm no address fields appear; `curl -s https://example.com/<download-page> | grep -icE "address"`.

#### PRV-51 — Country dropdown instead of full address when only country matters
Severity: low · Source: `.zflow/evidence/specweb/privacy/data-minimization.md`
Quote: - Use a country dropdown instead of asking for a full address when only country matters for tax or compliance.
Verify: Inspect checkout/tax-related public forms: a `<select>` of countries with no street/city/postcode fields when country is the only requirement.

### 2.9 Resilience — 34 requirements

Behaviour under failure: error and maintenance pages with correct statuses, graceful degradation without JavaScript, offline support, PWA manifest, monitoring/status separation, deprecation signalling, Redirect-By, and IPv6.

Checklist status (`meta/checklist.md`): **Required** — custom error pages · **Recommended** — maintenance pages and 503, graceful degradation, web app manifest, monitoring and uptime, IPv6 reachability.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### R01 — Missing URLs must return HTTP 404, never 200
Severity: high · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - Return HTTP status `404`. Verify with `curl -I https://example.com/does-not-exist`.
Verify: `curl -sI https://example.com/<random-unused-path>` — the status line must be 404 (follow no redirects); the body must be the site's custom error page, not a 200 "page not found" message.

#### R02 — Unknown URLs must not redirect to the homepage
Severity: medium · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - Redirecting all unknown URLs to the homepage with a `302`. Search engines flag this as a soft 404 too.
Verify: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://example.com/<random-unused-path>` — expect 404 with an empty redirect_url, not a 3xx pointing at `/`.

#### R03 — The 404 page offers a way forward
Severity: medium · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - Offer a search box, a link to the homepage, and links to the most visited sections.
Verify: `curl -s https://example.com/<random-unused-path>` — the returned HTML must contain a homepage link and a search form or popular-section links (e.g. `grep -Ei 'href="(/|https://example\.com/)"|<form'`).

#### R04 — The 404 page keeps site navigation
Severity: low · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - Keep navigation, header, and footer so the user can carry on browsing.
Verify: `curl -s https://example.com/<random-unused-path> | grep -Ei '<nav|<header|<footer'` — the same chrome as normal pages must be present.

#### R05 — The 404 message renders without a heavy JS bundle
Severity: low · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - A 404 page that loads a heavy JavaScript bundle before showing the message.
Verify: `curl -s https://example.com/<random-unused-path> | grep -i 'not found\|could not find'` — the "not found" wording must appear in the raw HTML with scripting disabled/unloaded.

#### R06 — Server errors return 500 and leak no implementation details
Severity: high · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: - Acknowledge the failure in one sentence. Do not show stack traces, framework names, or environment variables.
Verify: Observable on any 5xx response the audit happens to receive: `curl -s <erroring-url>` must not contain stack traces, file paths, SQL, or debug output (`grep -Ei 'traceback|exception|\.php|Warning:|at /'`). A polite read-only audit cannot force a 500.

#### R07 — Multilingual sites serve a localized 404
Severity: low · Source: `.zflow/evidence/specweb/resilience/error-pages.md`
Quote: **Localise error pages too.** On a multilingual site, the 404 a French visitor lands on should be in French — the URL prefix (`/fr/this-page-does-not-exist`) already tells the server which locale to render. Match the page's `lang` attribute, translate the heading and copy, and keep the search box and home link pointed at the same locale.
Verify: `curl -s https://example.com/fr/<random-unused-path> | grep 'lang="fr"'` — heading and copy in French, home link and search pointed at `/fr/`.

#### R08 — Planned downtime returns 503, never 200
Severity: medium · Source: `.zflow/evidence/specweb/resilience/maintenance-pages.md`
Quote: - `curl -I https://example.com/` returns `HTTP/2 503` and a `Retry-After` header.
Verify: During a maintenance window (or whenever the site currently serves its maintenance page): `curl -sI https://example.com/` must return 503, not 200. Not observable while the site is up.

#### R09 — 503 responses carry Retry-After
Severity: medium · Source: `.zflow/evidence/specweb/resilience/maintenance-pages.md`
Quote: - `Retry-After` header: either an integer number of seconds (`Retry-After: 1800`) or an HTTP date (`Retry-After: Wed, 29 May 2026 14:00:00 GMT`). Use the form that matches your confidence in the ETA.
Verify: On any 503 response: `curl -sI https://example.com/ | grep -i '^retry-after:'` — value must be seconds or an HTTP-date.

#### R10 — The maintenance page is self-contained
Severity: low · Source: `.zflow/evidence/specweb/resilience/maintenance-pages.md`
Quote: - Body: a single HTML page that loads no external dependencies, no analytics, and no fonts from CDNs that may also be down.
Verify: When the maintenance body is served: `curl -s https://example.com/ | grep -Ei '<(script|link|img)[^>]+(src|href)="https?://'` — no cross-origin subresources.

#### R11 — Rate limiting uses 429 with Retry-After
Severity: low · Source: `.zflow/evidence/specweb/resilience/maintenance-pages.md`
Quote: - A rate-limited client receives `HTTP/2 429` with `Retry-After`, not a `503` or a silent drop.
Verify: Observable only if the auditor is actually throttled: the response must be 429 carrying Retry-After; a polite read-only audit cannot force throttling without abusing the site.

#### R12 — Core content and navigation work without JavaScript
Severity: high · Source: `.zflow/evidence/specweb/resilience/graceful-degradation.md`
Quote: - Deliver core content and navigation in the initial HTML. Use real `<a href>` links and real `<form action>` so both function before any script runs.
Verify: `curl -s https://example.com/ | grep -i '<h1'` — the main heading and body copy must be in the server HTML (not an empty `<div id="root">`); reload in a browser with JavaScript disabled (DevTools) and confirm content and primary nav still render and work.

#### R13 — Visible content is not gated behind JavaScript
Severity: medium · Source: `.zflow/evidence/specweb/resilience/graceful-degradation.md`
Quote: - Never gate visible content behind a successful `fetch`. If a script reveals or hydrates content, ensure that content is present and readable without it.
Verify: `curl -s https://example.com/<content-page>` — the article/body text must be present in the raw HTML and not cloaked by inline `display:none`/`hidden` awaiting script.

#### R14 — Menus, accordions, dialogs operable natively
Severity: low · Source: `.zflow/evidence/specweb/resilience/graceful-degradation.md`
Quote: - Keep menus, accordions, and dialogs operable with native elements (`<details>`, `<dialog>`) or CSS where you can.
Verify: With JavaScript disabled in a browser, open the primary menu/accordion — it must expand; in HTML, controls are native (`grep -c '<details\|<dialog'`) or the nav links are plain `<a href>` elements reachable without a script.

#### R15 — Service worker serves a cached offline fallback page
Severity: low · Source: `.zflow/evidence/specweb/resilience/offline-support.md`
Quote: > A service worker can serve a cached offline fallback page when the network fails, keeping the site usable on flaky connections and turning hard failures into graceful ones.
Verify: Find the worker URL in the page source, then `curl -s https://example.com/sw.js` — it must contain a `navigate`-mode fetch handler and a precached offline URL; DevTools → Network → "Offline" + reload renders the fallback; Lighthouse's PWA audit reports the offline behaviour.

#### R16 — Cache names are versioned and old caches cleaned
Severity: low · Source: `.zflow/evidence/specweb/resilience/offline-support.md`
Quote: Always include a version string in the cache name and clean up old caches on `activate`, or you'll ship stale code on the next deploy.
Verify: `curl -s https://example.com/sw.js | grep -iE "cache|activate"` — a versioned cache name (e.g. `v1`) and old-cache deletion logic on activate.

#### R17 — The shipped worker has a kill switch
Severity: low · Source: `.zflow/evidence/specweb/resilience/offline-support.md`
Quote: - Ship a `?sw=off` kill switch that unregisters the worker, in case you need to disable it in production.
Verify: `curl -s https://example.com/sw.js | grep -i 'unregister\|sw=off'` — the worker (or the page that registers it) must implement an unregister path.

#### R18 — Manifest linked from the HTML head
Severity: medium · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: Serve it at `/site.webmanifest` or `/manifest.webmanifest` and link it from the page:
Verify: `curl -s https://example.com/ | grep -i 'rel="manifest'"` — a manifest link must exist and its href must fetch successfully.

#### R19 — Manifest carries the installability fields
Severity: low · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: Required fields for installability in Chromium browsers:
Verify: `curl -s https://example.com/manifest.webmanifest | jq` — `name` or `short_name`, `start_url`, and `display` must be present and parse.

#### R20 — Icons: 192px, 512px, and a maskable variant
Severity: low · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: - `icons` — at least one 192×192 and one 512×512 PNG. Add a separate icon with `"purpose": "maskable"` so Android can apply its adaptive icon mask without cropping content.
Verify: `curl -s https://example.com/manifest.webmanifest | jq '.icons'` — check the sizes/purpose entries; fetch each icon URL (`curl -sI`) for 200 + `image/png`; visually test the maskable icon at maskable.app/editor.

#### R21 — theme_color and background_color set
Severity: low · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: - `theme_color` and `background_color` — the first themes the OS chrome, the second paints the splash screen before the page loads.
Verify: `curl -s https://example.com/manifest.webmanifest | jq '.theme_color, .background_color'` — both must be non-null colour values.

#### R22 — start_url resolves to a live page
Severity: medium · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: - `start_url` pointing to a 404 because someone changed the URL structure.
Verify: Extract `start_url` from the manifest, then `curl -sI https://example.com<start_url>` — must return 200.

#### R23 — Manifest served with the correct content type
Severity: medium · Source: `.zflow/evidence/specweb/resilience/pwa-manifest.md`
Quote: - `curl -I https://example.com/site.webmanifest` returns `200` and `application/manifest+json`.
Verify: `curl -sI https://example.com/site.webmanifest` — status 200 and a `content-type: application/manifest+json` header.

#### R24 — Status page on a separate host
Severity: low · Source: `.zflow/evidence/specweb/resilience/monitoring-uptime.md`
Quote: Run the status page on a different host and a different DNS provider from the main site. Common pattern: `status.example.com` resolved through a CDN-fronted static site, with the status records stored at a third-party provider (Statuspage, Instatus, BetterStack, or a static site you update manually). The point is that when the primary site is unreachable, the status page must not be unreachable too.
Verify: `dig +short status.example.com` vs `dig +short example.com` — different addresses; `dig +short NS status-domain` vs the main domain shows separate DNS.

#### R25 — RUM/error beacons post same-origin
Severity: low · Source: `.zflow/evidence/specweb/resilience/monitoring-uptime.md`
Quote: A RUM script is still a script sending visitor data to someone, so it falls under the same rules as any [third-party script](/spec/privacy/third-party-scripts/). Two habits keep it honest. Scrub before sending: drop cookies, request headers and bodies, query strings and user identifiers in the client, so personal data never leaves the browser. And post to a same-origin endpoint that forwards to the collector, rather than to the collector's domain: `connect-src` stays `'self'`, the vendor never sees the visitor's IP address, and the forwarder can enforce its own limits. A forwarder is an open relay unless you make it otherwise: pin a single destination, check the `Origin`, cap the body size and the request rate, and accept only the event types you expect.
Verify: Load a page in a browser with the network panel open (read-only): any error/vitals beacon must target the site's own origin, not a collector's domain; the page's CSP `connect-src` should not need the vendor origin.

#### R26 — Deprecated resources announce Deprecation/Sunset headers
Severity: low · Source: `.zflow/evidence/specweb/resilience/deprecation-and-sunset.md`
Quote: The `Sunset` date **must not be earlier** than the `Deprecation` date. Pair either header with a `Link`: `rel="deprecation"` points to human documentation about the change, `rel="sunset"` to a retirement or migration policy, and `rel="successor-version"` to the replacement.
Verify: For each known deprecated/legacy endpoint: `curl -sI <url> | grep -iE 'deprecation|sunset|link'` — both dates present, ordered correctly, with a rel link.

#### R27 — Retired URLs return 410 or 404, not 200
Severity: low · Source: `.zflow/evidence/specweb/resilience/deprecation-and-sunset.md`
Quote: Confirm `Deprecation` carries a date, `Sunset` is not earlier, and a `rel="deprecation"` or `rel="successor-version"` link is present. On a fully retired URL, confirm the status is `410`/`404`, not `200`.
Verify: `curl -sI <retired-url>` — status must be 410 or 404; a 200 on a retired resource fails this check.

#### R28 — Deprecation value is a date, not a boolean
Severity: low · Source: `.zflow/evidence/specweb/resilience/deprecation-and-sunset.md`
Quote: - Using a bare `Deprecation: true`. The value is a structured-field date, not a boolean.
Verify: `curl -sI <deprecated-url> | grep -i '^deprecation:'` — the value is `@<unix-seconds>` or an HTTP-date, not `true`.

#### R29 — Redirects are signed with Redirect-By
Severity: low · Source: `.zflow/evidence/specweb/resilience/redirect-by.md`
Quote: On every redirect your software issues, set a `Redirect-By` response header whose value names the component responsible. Keep the value to a stable product or service name, the thing a maintainer would recognise, and emit it alongside the `Location` header.
Verify: `curl -sI <url-known-to-redirect> | grep -i 'redirect-by'` — the header must appear next to `Location`; follow chains with `curl -sIL` and confirm each hop is signed.

#### R30 — Redirect-By value leaks no infrastructure detail
Severity: low · Source: `.zflow/evidence/specweb/resilience/redirect-by.md`
Quote: **Leaking detail into the value.** Name the software, not its version, its file path, or the internal rule that matched. `Redirect-By: WordPress` is useful; `Redirect-By: WordPress 6.5.2 via wp-content/plugins/acme/redirects.php:214` hands an attacker a fingerprint for free. Attribution should identify the layer, not describe your infrastructure.
Verify: Inspect every `Redirect-By`/`X-Redirect-By` value in the redirect chain: it must not contain version strings, `.php`/file paths, or rule identifiers.

#### R31 — AAAA records published for apex and www
Severity: medium · Source: `.zflow/evidence/specweb/resilience/ipv6.md`
Quote: 2. **Publish `AAAA` records** for every name that has an `A` record: the apex, `www`, and any other host name that serves the site.
Verify: `dig +short AAAA example.com` and `dig +short AAAA www.example.com` — both must return addresses.

#### R32 — The IPv6 address actually answers
Severity: high · Source: `.zflow/evidence/specweb/resilience/ipv6.md`
Quote: 3. **Make sure the server listens on IPv6.** The web server, the firewall, and any load balancer all need to accept connections on ports 80 and 443 over IPv6, with the same certificate.
Verify: `curl -6 -sI https://example.com/` from an IPv6-capable network — the request must complete with a valid certificate and the expected status; a timeout or TLS failure next to a published AAAA fails this check.

#### R33 — IPv6 and IPv4 serve the same site
Severity: medium · Source: `.zflow/evidence/specweb/resilience/ipv6.md`
Quote: 4. **Serve the same site on both.** The same content, the same redirects (HTTP to HTTPS, apex to `www` or the reverse), the same security headers. Internet.nl compares the two responses and flags differences.
Verify: Compare `curl -6 -sI https://example.com/` with `curl -4 -sI https://example.com/` — same status, redirects, and headers; or run the Internet.nl website test, whose IPv6 section flags differences.

#### R34 — Authoritative name servers reachable over IPv6
Severity: low · Source: `.zflow/evidence/specweb/resilience/ipv6.md`
Quote: 5. **Use name servers with IPv6.** Managed DNS providers almost all publish `AAAA` records for their name servers; check that yours do, and that at least two of them are reachable over IPv6.
Verify: `dig +short NS example.com`, then for each name server `dig +short AAAA <ns>` — at least two must return addresses (Internet.nl checks this too).

### 2.10 Internationalisation — 61 requirements

Multilingual correctness: one URL pattern, reciprocal BCP 47 hreflang, fully localised metadata, no automatic locale redirects, lang/translate discipline, endonym language switchers, RTL and bidi, CJK line breaking, locale-aware formatting, plural rules, and IDN.

Numbering preserved from the distilled section (items 1–61), prefixed `I18N-`.

Checklist status (`meta/checklist.md`): **Required** — lang attribute on inline content · **Avoid** — automatic IP-based language redirects · **Recommended** — international URL structure, hreflang, localised page metadata, language switcher.

All quotes in this section grep-verified against their cited source files during this report's synthesis run.

#### I18N-1 — Single locale URL pattern sitewide
Severity: medium · Source: `.zflow/evidence/specweb/i18n/international-url-structure.md`
Quote: > Pick a single URL pattern for multilingual or multi-regional content — country-code top-level domain, subdomain, or subdirectory — and stick with it. Optionally localise the slugs too.
Verify: Enumerate locale entry URLs from the hreflang cluster or XML sitemap (`curl -s https://example.com/sitemap.xml | grep -o '<loc>[^<]*</loc>'`); every locale URL must use the same one of `example.de` / `de.example.com` / `example.com/de/` — a mix such as `/de/` plus `fr.example.com` fails.

#### I18N-2 — No query-parameter locale
Severity: medium · Source: `.zflow/evidence/specweb/i18n/international-url-structure.md`
Quote: - Using a query parameter (`?lang=de`, `?country=de`) as the locale identifier. Search engines treat it as the same URL.
Verify: `curl -s https://example.com/sitemap.xml | grep -E '(loc|href)="[^"]*(\?|&)(lang|loc|country|locale)='` plus the same grep over crawled page HTML return no locale-carrying query URLs.

#### I18N-3 — Consistent slug localisation
Severity: low · Source: `.zflow/evidence/specweb/i18n/international-url-structure.md`
Quote: - **Localise the slug where it adds clarity.** `/about/` to `/sobre/` is helpful for Spanish readers; `/api/v1/` is not worth translating. Consistency matters more than translation: localise all slugs in a section, or none.
Verify: Crawl one locale's navigation (`curl -s https://example.com/de/` then follow nav links) and list slugs — a section mixing `/de/about/` and `/de/uber-uns/` fails.

#### I18N-4 — hreflang values are valid BCP 47
Severity: high · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - **Use BCP 47 codes.** Language only (`en`, `de`), or language plus region (`en-GB`, `pt-BR`). Region alone (`hreflang="GB"`) is invalid. Script subtags are allowed where they disambiguate, e.g. `zh-Hans` and `zh-Hant`.
Verify: `curl -s https://example.com/ | grep -o 'hreflang="[^"]*"' | sort -u` — validate each value against the IANA language-subtag registry; region-only values such as `UK`, `GB`, `EU` fail.

#### I18N-5 — Self-referential hreflang
Severity: high · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - **Self-reference.** Every page must list itself among its alternates.
Verify: For each URL in a locale cluster, `curl -s <url> | grep 'rel="alternate"'` must include an entry whose href equals the page's own URL.

#### I18N-6 — Reciprocal hreflang links
Severity: high · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - **Reciprocal links.** If page A points to page B, page B must point back to page A. One-way links are ignored.
Verify: Fetch every URL of a cluster with curl; for each alternate listed on A, confirm A's URL appears in that alternate's own alternate list (Google Search Console's "no return tags" error report exposes the same failure).

#### I18N-7 — x-default entry present
Severity: medium · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - **`x-default`.** Add a `hreflang="x-default"` entry for the URL shown when no other alternate matches the user's locale. This is typically a language picker or the default-region homepage.
Verify: `curl -s <locale-url> | grep 'hreflang="x-default"'` (or the sitemap equivalent per cluster) returns an entry on a multi-locale site.

#### I18N-8 — One hreflang delivery method
Severity: medium · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - **Pick one delivery method.** Use HTML `<link>` for static pages, the HTTP `Link` header for non-HTML resources such as PDFs, and the XML sitemap for sites with many alternates — mixing them on the same URL set creates conflicts.
Verify: For a sampled URL compare `curl -sI <url> | grep -i '^link:.*alternate'`, `curl -s <url> | grep 'rel="alternate" hreflang'`, and its sitemap `<url>` entry — only one mechanism should carry the cluster, or all carry byte-identical sets.

#### I18N-9 — Alternates resolve without redirect or 404
Severity: high · Source: `.zflow/evidence/specweb/i18n/hreflang.md`
Quote: - Pointing alternates at URLs that redirect or 404.
Verify: For each alternate href in a cluster run `curl -sI -o /dev/null -w '%{http_code} %{redirect_url}\n' <alternate-url>` — any 301/302/404 result fails.

#### I18N-10 — Head strings translated per locale
Severity: high · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: > Translate every visible string in the head and in structured data — title, meta description, Open Graph fields, JSON-LD names and descriptions, image alt text — not just the body. A localised body with English metadata is a half-translation.
Verify: `curl -s https://example.com/fr/ | grep -E '<title>|name="description"'` — title and description are French; a `site:example.com/fr/` SERP spot-check shows French titles and snippets only.

#### I18N-11 — Open Graph fields translated
Severity: medium · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - `<meta property="og:title">`, `og:description`, `og:site_name`, `og:image:alt`.
Verify: `curl -s <locale-url> | grep 'property="og:'` — og:title/og:description/og:image:alt values match the page locale; the Facebook Sharing Debugger card for the locale URL shows the translated strings.

#### I18N-12 — og:locale set per page with alternates
Severity: medium · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - `og:locale` set to this page's locale, `og:locale:alternate` listing the others. Open Graph uses underscored tags (`fr_FR`), unlike BCP 47 elsewhere — that mismatch is OGP's quirk.
Verify: `curl -s <locale-url> | grep 'og:locale'` — the French page emits `content="fr_FR"` (not a template-leftover `en_US`) plus alternates for the other locales.

#### I18N-13 — Twitter Card fields translated
Severity: low · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - `twitter:title`, `twitter:description`, `twitter:image:alt`.
Verify: `curl -s <locale-url> | grep 'name="twitter:'` — card fields match the page's locale wherever Twitter metadata is emitted.

#### I18N-14 — JSON-LD translated with inLanguage
Severity: medium · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - JSON-LD `name`, `description`, `headline`, `articleSection`, and `inLanguage` (BCP 47, matching the page).
Verify: Run each locale URL through Google's Rich Results Test (or extract `curl -s <locale-url> | sed -n '/application\/ld+json/,/<\/script>/p'`) — `inLanguage` equals the page's lang and name/description are in the page language.

#### I18N-15 — Image alt text translated
Severity: medium · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - `alt` text on every `<img>` — translated, not left in the source language.
Verify: `curl -s https://example.com/es/ | grep -o 'alt="[^"]*"'` — no source-language (e.g. English) alt strings on the Spanish page.

#### I18N-16 — application-name and PWA manifest localised
Severity: low · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - `<meta name="application-name">` and any PWA manifest `name` / `short_name`.
Verify: `curl -s <locale-url> | grep 'application-name'` and fetch the referenced manifest — the name/short_name values match the page locale.

#### I18N-17 — Per-locale Open Graph image
Severity: low · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: - The Open Graph image itself when it contains text — render a per-locale variant rather than reusing one English card.
Verify: Compare `curl -s <de-url> | grep 'og:image'` against the en page — differing og:image URLs; download both images and confirm any text on them matches each locale.

#### I18N-18 — BCP 47 everywhere except og:locale
Severity: medium · Source: `.zflow/evidence/specweb/i18n/localised-metadata.md`
Quote: Set the matching [`lang` on `<html>`](/spec/foundations/html-lang/) so assistive tech and crawlers know which language the metadata is in. Use BCP 47 in `lang`, `hreflang`, and `inLanguage` (`fr-FR`); the underscored form (`fr_FR`) only applies to `og:locale`.
Verify: Compare `curl -s <url> | grep -o '<html[^>]*lang="[^"]*"'` (hyphenated) with `grep -o 'og:locale" content="[^"]*"'` (underscored) — crossed conventions (underscored lang or hyphenated og:locale) fail.

#### I18N-19 — Sitemap declares the xhtml namespace
Severity: medium · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - **Declare the namespace.** Add `xmlns:xhtml="http://www.w3.org/1999/xhtml"` on the root `<urlset>`.
Verify: `curl -s https://example.com/sitemap.xml | head -10 | grep 'xmlns:xhtml="http://www.w3.org/1999/xhtml"'` — present whenever `xhtml:link` entries exist.

#### I18N-20 — Complete alternate group per url entry
Severity: high · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - **Group all alternates inside each `<url>`.** Every `<url>` entry lists every alternate URL in the group, including itself. The bidirectional rule still applies: if A lists B, B must list A.
Verify: Parse the sitemap with `xmllint --xpath '//*[local-name()="url"]' sitemap.xml`; for a sampled entry, its set of `xhtml:link` hrefs equals the full cluster found on every member URL, and each member's entry lists it back.

#### I18N-21 — Sitemap self-reference
Severity: high · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - **Self-reference always.** Each URL must include a `<xhtml:link>` pointing at itself with its own `hreflang`. Omitting it invalidates the entire cluster.
Verify: For each `<url>` entry, one `<xhtml:link>` href equals its own `<loc>` value (xmllint or grep per entry).

#### I18N-22 — x-default in each sitemap cluster
Severity: medium · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - **Add `x-default`.** Point it at the language selector or the default-region landing page.
Verify: `curl -s https://example.com/sitemap.xml | grep -c 'hreflang="x-default"'` is at least the number of clusters; each sampled `<url>` entry contains one x-default link.

#### I18N-23 — Sitemap hreflang tags are BCP 47
Severity: medium · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - **Use BCP 47 tags.** Language (`en`, `de`), or language plus region (`en-GB`, `pt-BR`). Never a country code on its own.
Verify: `curl -s https://example.com/sitemap.xml | grep -o 'hreflang="[^"]*"' | sort -u` — validate each tag against BCP 47; bare `GB`/`UK`/`US` values fail.

#### I18N-24 — Clusters not split across sitemap files
Severity: low · Source: `.zflow/evidence/specweb/i18n/sitemap-hreflang.md`
Quote: - Splitting a language cluster across multiple sitemap files — keep all alternates of a URL inside the same `<url>` entry.
Verify: Fetch the sitemap index and every child sitemap; each `<url>` entry contains its complete alternate set, with no member of a cluster carrying a partial set in another file.

#### I18N-25 — No automatic locale redirects
Severity: high · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: > Automatically redirecting visitors to a locale based on IP geolocation or Accept-Language is an anti-pattern. It traps users in the wrong language, breaks search crawlers, and breaks shared links. Let users choose.
Verify: `curl -sI -H "Accept-Language: de" https://example.com/` — and the same request from a foreign-IP VPN exit — returns 200 (optionally with a suggestion banner), never a 301/302 to `/de/`.

#### I18N-26 — Localised URLs honour the URL unconditionally
Severity: high · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: - Localised URLs (`/de/`, `/fr-ca/`) must serve their declared content unconditionally to every visitor and every crawler. The URL is the contract.
Verify: Open a localised URL through a VPN exit in another country and via plain curl — content matches the URL's locale in both cases, not the requester's location.

#### I18N-27 — Accept-Language must not change a localised URL
Severity: high · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: - `curl -H "Accept-Language: de" https://example.com/en/pricing` must return the English page.
Verify: Compare `curl -s -H "Accept-Language: de" https://example.com/en/pricing` with a plain `curl -s https://example.com/en/pricing` — byte-identical English content both times.

#### I18N-28 — Crawlers get localised pages with 200
Severity: high · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: - `curl -A "Googlebot" https://example.com/de/pricing` must return the German page, with `200 OK` and no redirect.
Verify: `curl -sI -A "Googlebot" https://example.com/de/` returns `200 OK` (not 301/302 to an IP-mapped locale) and the body is German.

#### I18N-29 — Suggestions are banners, never redirects
Severity: medium · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: - On first visit, it is acceptable to show a **non-blocking banner** suggesting another locale based on detected hints ("This page is also available in Deutsch — switch?"). Never auto-redirect.
Verify: Fetch the root URL with a mismatched Accept-Language: the response stays 200 and any suggestion is dismissible banner markup — no 3xx status and no script-driven navigation to another locale.

#### I18N-30 — Persist only explicit choices
Severity: low · Source: `.zflow/evidence/specweb/i18n/avoid-auto-geo-redirects.md`
Quote: - Persist the user's *explicit* choice in a cookie, `localStorage`, or account preference — but only after they have picked. Do not persist a guess.
Verify: `curl -sI -H "Accept-Language: de" https://example.com/` on a fresh session — the response sets no locale-preference cookie (no lang/locale value in `Set-Cookie`) absent user interaction.

#### I18N-31 — lang on foreign-language passages
Severity: high · Source: `.zflow/evidence/specweb/i18n/lang-attribute.md`
Quote: > Mark passages, phrases, and inline elements that differ from the document language with a lang attribute. WCAG 3.1.2 requires it so assistive tech can switch pronunciation.
Verify: On pages containing foreign-language quotes or phrases, the fetched HTML shows `lang="xx"` on those `<span>`/`<blockquote>`/`<q>` elements; the W3C i18n checker (or a screen-reader spot check) confirms per-part language switching.

#### I18N-32 — Valid BCP 47 lang values
Severity: medium · Source: `.zflow/evidence/specweb/i18n/lang-attribute.md`
Quote: - Using invalid codes like `lang="english"` or `lang="UK"`. Use `en` or `en-GB`.
Verify: `curl -s <url> | grep -o 'lang="[^"]*"' | sort -u` — validate each value against the IANA subtag registry; the W3C HTML validator flags invalid ones.

#### I18N-33 — Script subtags where they disambiguate
Severity: low · Source: `.zflow/evidence/specweb/i18n/lang-attribute.md`
Quote: - **Mark scripts when relevant.** `zh-Hans` vs `zh-Hant` matters for font selection. `ja-Latn` distinguishes romanised Japanese from kanji.
Verify: On Chinese pages, `grep -o 'lang="zh[^"]*"'` — where the site serves both scripts, tags distinguish Hans/Hant instead of emitting bare `zh` for both.

#### I18N-34 — translate="no" on untranslatable content
Severity: low · Source: `.zflow/evidence/specweb/i18n/translate-attribute.md`
Quote: > The translate attribute marks content that automatic translation systems must leave alone — brand names, code, and identifiers. Use translate="no" so Google Translate and the browser's built-in translation don't mangle terms that have no localised form.
Verify: `curl -s <locale-url> | grep 'translate="no"'` — present on elements wrapping brand names, `<code>` snippets, and reference IDs in body copy.

#### I18N-35 — Never translate="no" on html or body
Severity: medium · Source: `.zflow/evidence/specweb/i18n/translate-attribute.md`
Quote: - **Putting `translate="no"` on `<html>` or `<body>`.** That opts the whole page out of translation — exactly what most multilingual readers do not want. Mark spans, not pages.
Verify: `curl -s <url> | grep -E '<(html|body)[^>]*translate="no"'` returns nothing.

#### I18N-36 — Options labelled in their own language
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Label each option in its own language.** "Deutsch", not "German". "日本語", not "Japanese". "Français", not "French". W3C is explicit about this: users who can't read the current page need the link in their own language.
Verify: `curl -s <url> | grep -A20 'aria-label="Language"'` — labels are endonyms (Deutsch, 日本語, العربية); exonyms like "German" or "Japanese" fail.

#### I18N-37 — lang/hreflang on each switcher link
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Mark each link with `lang` (and `hreflang`).** Screen readers switch voice on `lang`, so the option is announced correctly even when the surrounding page is in another language.
Verify: Inspect switcher anchors in the fetched HTML — each carries `lang` (ideally also `hreflang`) for its target locale.

#### I18N-38 — No flags as language indicators
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Don't use flags for languages.** Spanish is not Spain. Arabic is not any single country. English is neither the UK nor the US. Use flags only when you genuinely mean a country (a regional storefront, a shipping selector).
Verify: Inspect the switcher markup (`curl -s <url>`) for flag `<img>` elements or flag emoji paired with language links — flags on language options fail; country-level storefront or shipping selectors are exempt.

#### I18N-39 — Switcher discoverable without hover or JS
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Make it discoverable.** Visible without hover, in or near the header or the footer. Not buried inside a hamburger menu or hidden behind an icon-only button.
Verify: `curl -s <url>` (no JS execution) already contains the language links in header/footer HTML; a rendered check confirms they are visible without hover and not icon-only.

#### I18N-40 — Stored preference never overrides explicit URL
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Persist the choice.** When a user picks a locale, remember it (cookie, `localStorage`, account preference) and honour it on return — but never override an explicit URL. `/de/` always serves German.
Verify: Send the site's saved English-preference cookie while requesting `/de/` via curl — German content must still be served.

#### I18N-41 — Switch to the equivalent page
Severity: medium · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Link to the equivalent page, not the locale homepage.** If a user switches language from `/pricing/`, they should land on `/de/pricing/`, not `/de/`.
Verify: From a deep page such as `/pricing/`, resolve the switcher's other-locale link — it targets the translated path (`/de/pricing/`), not the locale root.

#### I18N-42 — Current locale indicated
Severity: low · Source: `.zflow/evidence/specweb/i18n/language-switcher.md`
Quote: - **Indicate the current locale.** Mark it with `aria-current="true"` (or style it as non-interactive) so screen-reader users know where they are.
Verify: `curl -s <url> | grep 'aria-current'` — the switcher marks the active locale (or visibly disables its link).

#### I18N-43 — dir="rtl" on the html element
Severity: high · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: **Set direction on `<html>`.** Use `dir="rtl"` on the root for RTL locales. Set `dir="auto"` on user-generated content (comments, messages) so the browser picks direction from the first strong character.
Verify: `curl -s https://example.com/ar/ | grep -o '<html[^>]*>'` — the tag carries both `lang="ar"` (or he/fa/ur) and `dir="rtl"`.

#### I18N-44 — Direction not set only on body
Severity: medium · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: - Setting `dir="rtl"` only on `<body>` — flexbox, grid, and form widgets read it from `<html>`.
Verify: `curl -s <rtl-url> | grep -E '<(html|body)[^>]*dir='` — `dir` appears on `<html>`; a `dir` on `<body>` with no `dir` on `<html>` fails.

#### I18N-45 — dir="auto" on free-form inputs
Severity: medium · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: This matters even when the interface itself is English-only and never localised. A reader on an `en-US` system can still type Arabic into a comment box, chat field, or note editor; `dir="auto"` on every free-form text input and `<textarea>` lets each value flow correctly regardless of the surrounding UI. Leave constrained fields (email, telephone, URL, numeric) alone.
Verify: On pages with comment/message forms, `curl -s <url> | grep -E '<textarea|<input'` — free-form fields carry `dir="auto"`; email/tel/url inputs do not.

#### I18N-46 — CSS logical properties instead of left/right
Severity: medium · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: **Use CSS logical properties, not physical ones.** Replace `left`/`right` with `inline-start`/`inline-end`, and `top`/`bottom` with `block-start`/`block-end`. The same stylesheet then works in both directions:
Verify: Fetch the stylesheet(s) (`curl -s <css-url>`); compare counts of `margin-left|margin-right|padding-left|text-align:\s*(left|right)` versus `*-inline-start|*-inline-end` — RTL pages must not depend on duplicated `[dir="rtl"]` physical-property overrides.

#### I18N-47 — Directional icons mirrored in RTL
Severity: medium · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: **Mirror directional icons.** Arrows, chevrons, back buttons, progress bars, and breadcrumbs should mirror in RTL. Use `transform: scaleX(-1)` or supply mirrored SVGs. Do not mirror logos, photos, numerals, or media controls (play stays a right-pointing triangle universally).
Verify: Screenshot an RTL page (e.g. Playwright) next to its LTR equivalent — back arrows/chevrons/breadcrumbs are mirrored; logo and play button are unchanged.

#### I18N-48 — bdi around unknown-direction strings
Severity: low · Source: `.zflow/evidence/specweb/i18n/rtl-support.md`
Quote: - **`<bdi>`** — short for "bidi isolation". Wraps a fragment whose direction is unknown so it does not break the surrounding paragraph's bidi algorithm. Use for usernames, titles, and any embedded foreign-language string inside running text: `Mentioned by <bdi>@محمد</bdi> in the thread`.
Verify: On pages rendering usernames or UGC references inside running text, `curl -s <url> | grep '<bdi'` wraps those values.

#### I18N-49 — writing-mode paired with text-orientation
Severity: low · Source: `.zflow/evidence/specweb/i18n/writing-modes.md`
Quote: `writing-mode` sets the axis along which lines stack. `horizontal-tb` is the default. `vertical-rl` produces the traditional top-down, right-to-left columns used in Japanese and Traditional Chinese publishing. `vertical-lr` is used for Mongolian and some Manchu typesetting. Combine it with `text-orientation: mixed | upright | sideways` so Latin glyphs and digits inside a vertical CJK run render correctly.
Verify: On pages with vertical text, `curl -s <css-url> | grep -E 'writing-mode|text-orientation'` — every `writing-mode: vertical-*` rule is paired with an explicit `text-orientation`.

#### I18N-50 — lang present on CJK/Thai content
Severity: medium · Source: `.zflow/evidence/specweb/i18n/writing-modes.md`
Quote: Pair every styling rule with the correct `lang` on the containing element. Browsers use [`lang`](/spec/i18n/lang-attribute/) to pick the right line-break dictionary; CSS alone is not enough.
Verify: `curl -s https://example.com/ja/ | grep -o '<html[^>]*lang="[^"]*"'` — lang is present and correct on ja/zh/th pages (and on CJK/Thai sub-sections within pages of another language).

#### I18N-51 — Script-correct line-break rules
Severity: medium · Source: `.zflow/evidence/specweb/i18n/writing-modes.md`
Quote: Use `line-break: strict` for Japanese — it enforces the publisher conventions described in JIS X 4051. Use `word-break: keep-all` for CJK so breaks fall only between Han characters, never inside a compound. For Thai, lean on `line-break: auto` and the browser's ICU-based segmentation; do not force `break-all`.
Verify: Fetch the CSS served to ja/zh/th pages — `grep -E 'line-break|word-break'` shows strict/keep-all (auto for Thai); a global `word-break: break-all` applied to CJK/Thai text containers fails.

#### I18N-52 — Locale-formatted dates, numbers, currency
Severity: medium · Source: `.zflow/evidence/specweb/i18n/locale-content.md`
Quote: > Dates, numbers, currency, and units should be formatted in the user's locale. Use Intl APIs in the browser and the same locale data server-side so output matches expectations.
Verify: Spot-check rendered prices and dates per locale (`curl -s https://example.com/de/preisliste | grep -E '[0-9][.,][0-9]'`): de shows `1.299,50 €`, en-GB `£1,299.50`, en-US `$1,299.50` — no cross-locale format bleed.

#### I18N-53 — One locale resolved per request, URL wins over headers
Severity: medium · Source: `.zflow/evidence/specweb/i18n/locale-content.md`
Quote: **Pick the locale once, use it everywhere.** Resolve a single locale string per request (e.g. `en-GB`) from, in order: a user preference, a URL segment or subdomain (`/en-gb/`), the `Accept-Language` header, and a sensible default. Store it on the request and pass it to every formatter.
Verify: Compare `curl -s https://example.com/en-gb/pricing` with `curl -s -H "Accept-Language: fr-FR" https://example.com/en-gb/pricing` — identical output; the URL's locale determines formatting, headers do not.

#### I18N-54 — Formatted values in server-rendered HTML
Severity: medium · Source: `.zflow/evidence/specweb/i18n/locale-content.md`
Quote: **Format on the server too.** Send pre-formatted strings in initial HTML so users without JavaScript still see the right output, and so the page does not flash with a server-formatted value being rewritten on hydration. Most languages have an ICU binding: `Intl` in Node and Deno, `babel.dates` in Python, `java.text.MessageFormat` in Java, `NumberFormatter` in PHP.
Verify: `curl -s <locale-url>` (no JS execution) already contains locale-formatted dates and prices; a headless-browser load shows no format-rewrite flash.

#### I18N-55 — Dates always carry a timezone
Severity: low · Source: `.zflow/evidence/specweb/i18n/locale-content.md`
Quote: - Dates and times — always with a timezone, and prefer `dateStyle`/`timeStyle` over manual patterns.
Verify: Inspect visible datetimes and JSON-LD (e.g. Event `startDate`/`endDate`) on locale pages — a timezone or offset is present or unambiguous, never a bare wall-clock time.

#### I18N-56 — Language vs locale not conflated
Severity: low · Source: `.zflow/evidence/specweb/i18n/locale-content.md`
Quote: - Treating language and locale as the same. `en` is a language; `en-GB` is a locale. Use the locale for formatting.
Verify: Pages declaring `lang="en-GB"` render day-month-year dates (`29 May 2026`) while `en-US` renders month-day-year — formatting follows the regional tag, not a generic `en`.

#### I18N-57 — CLDR plural categories, not English-only logic
Severity: medium · Source: `.zflow/evidence/specweb/i18n/plural-rules.md`
Quote: > Most languages don't pluralise like English. Use CLDR plural categories — zero, one, two, few, many, other — via Intl.PluralRules instead of hard-coded 'item' vs 'items' logic.
Verify: On ru/ar/pl/ro locale pages that show counts (cart, search results, inbox), check plural agreement — "5 файлов" not "5 файла" in Russian; Arabic distinguishes its six forms.

#### I18N-58 — Ordinals use ordinal rules
Severity: low · Source: `.zflow/evidence/specweb/i18n/plural-rules.md`
Quote: Use `Intl.PluralRules` with `{ type: "ordinal" }` for "1st / 2nd / 3rd / 4th" — these follow a different CLDR rule set from cardinals. Pair the result with `Intl.NumberFormat` so digits are rendered for the locale too (Arabic-Indic digits in `ar-EG`, Latin digits in `ar-SA`).
Verify: On locale pages with ordinal displays (rankings, steps, positions), ordinal forms follow the target language's rules and digits are locale-appropriate (Arabic-Indic on ar-EG, Latin on ar-SA).

#### I18N-59 — IDN and ASCII fallback 301-paired
Severity: low · Source: `.zflow/evidence/specweb/i18n/idn-support.md`
Quote: - Register both the IDN and an ASCII fallback, and `301` between them so links and analytics consolidate.
Verify: `curl -sI https://xn--mnchen-3ya.de/` returns 301 with a Location pointing at the Unicode host — consistently one direction, never both directions redirecting to each other.

#### I18N-60 — Certificate covers the A-label form
Severity: medium · Source: `.zflow/evidence/specweb/i18n/idn-support.md`
Quote: - Get a TLS certificate that covers both forms. Modern CAs handle this automatically when you submit the A-label (`xn--…`); verify the certificate's `dNSName` SAN entries include the encoded form.
Verify: `echo | openssl s_client -connect xn--mnchen-3ya.de:443 -servername xn--mnchen-3ya.de 2>/dev/null | openssl x509 -noout -text | grep 'DNS:'` — the SAN list includes the `xn--` A-label.

#### I18N-61 — One canonical form across IDN variants
Severity: low · Source: `.zflow/evidence/specweb/i18n/idn-support.md`
Quote: - Set `<link rel="canonical">` to one form (typically the Unicode form) so search engines pick a single representation.
Verify: Fetch both domain forms with curl — both pages carry the same single canonical URL.

## 3. Severity model — one scale, three levels

Every requirement in §2 carries exactly one of three severities, carried over unchanged from the category distillations, which share a single scale. For a consumer-facing (public marketing / content / self-service) site the levels mean:

- **high** — the platform breaks, a user group is excluded, or the site takes on security or legal exposure. Concretely: the document-rendering floor is missing (doctype, charset, viewport, title); a WCAG Level A failure blocks users (contrast, labels, keyboard operability, focus visibility, captions); the transport or session layer is unsafe (no HTTPS/HSTS, weak cookie attributes, neutralised CSP); consent law is violated (tracking before opt-in, pre-ticked boxes, implied consent); search visibility is structurally broken (site-wide disallow, soft 404s, cloaking, fabricated reviews); or Core Web Vitals fail at the 75th percentile. Maps to the checklist's **Required** ("the platform breaks without it") and — inverted — to **Avoid** items, where the item's *presence* is the high-severity finding.
- **medium** — the site still works, but it loses reach, trust, speed, or compliance quality that a modern consumer site is expected to have: canonical and sitemap hygiene, security headers beyond the floor, caching and compression, agent-readiness surfaces, GPC handling, maintenance-page semantics, localised metadata. Maps to the checklist's **Recommended** ("a modern site should do it").
- **low** — context-dependent polish or emerging conventions: quality debt rather than breakage. Favicons detail, feed paging, WebSub ping discipline, TDMRep/DNS-AID/ARD-class conventions, account-conditional well-knowns, optional manifest fields. Maps to the checklist's **Optional** and to Recommended items that are pure build technique (Popover API, anchor positioning, container queries, and the like).

Two refinements carried from the distillation: dead-weight Avoid items (an X-XSS-Protection header still being sent, HTTP/1.1-era workarounds like sprites and sharding) are graded medium rather than high, because their presence is waste plus mild stack fingerprinting rather than active harm; and per site-skill.md's "Statuses — the contract" (via the meta checklist notes), an auditor must never silently upgrade a recommended item to required — this report follows that contract.

## 4. Skills and services specification.website itself publishes

1. **Agent Skill — `specification-website` (type skill-md).** Served at `/.well-known/agent-skills/specification-website/SKILL.md`, sha256 digest `7070db105de9efc80aecd3cf5ccf3c232da7116dd182f022ea20e38631127dcd` (per the site's agent-skills index, mirrored locally at `.zflow/evidence/specweb/meta/agent-skills-index.json`). Its purpose: query and apply The Website Specification — deciding what a site should have, whether something is required, and how to audit a URL — with answers backed by primary sources (`meta/site-skill.md`). An auditor loads this skill (or reads the local mirror) before an audit so category and status decisions match the source of truth.
2. **MCP server — `specification-website` v0.2.0 "The Website Specification"** (vendor Joost de Valk; MIT code / CC-BY-4.0 content; server card mirrored at `.zflow/evidence/specweb/meta/mcp-server-card.json`):
   - **Endpoint:** `https://mcp.specification.website/mcp` — transport `http` (stateless Streamable HTTP with wide-open CORS, per `meta/site-skill.md`).
   - **Authentication:** none.
   - **Protocol:** protocolVersion 2026-07-28 (supported: 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26).
   - **Capabilities:** tools + prompts (resources: false; logging: true).
   - **Tools:** `search`, `list_topics`, `get_topic`, `get_checklist`, `get_categories`, `get_changes`. **Prompt:** `audit_url`.
   - **How an auditor should use it:** `get_checklist` filtered to `status: "required"` sets the audit bar, adding `recommended` for deeper audits (the site's documented workflow); the `audit_url` prompt generates a per-URL audit plan; `search`/`get_topic` pull the primary-source page behind any requirement in §2; `get_changes` catches spec updates between audits. With no authentication and open CORS it can drive read-only audit automation directly.
3. **OKF bundle — Open Knowledge Format, okf_version 0.2.** An index of the same 177 checks across the 10 categories, with a `references/` directory mirroring every cited external standard and `log.md` as the change log; content CC BY 4.0; canonical pages at `https://specification.website/spec/` (`meta/okf-index.md`). Use it when an audit must run offline or cite the external standards themselves. (Note: the local evidence files never name the tarball `okf.tar.gz` — that filename comes from the task brief, not from the fetched evidence.)
4. **The checklist itself** (mirrored at `meta/checklist.md`): 177 checkbox items — 36 Required / 87 Recommended / 48 Optional / 6 Avoid, counts re-verified by grep during this synthesis — each linking to its spec page. It is the canonical answer to "what is the audit bar", and §2's per-category status lines are derived from it.

## 5. Related-skills cross-reference (installed skills an auditor routes to)

The §2 verification methods are read-only checks; these installed skills execute the ones a shell cannot:

| Skill | Route to it for | Representative requirements |
|---|---|---|
| **seo-audit** | A full pass over category §2.2: robots.txt, sitemaps, redirect chains, canonicals, indexing policy, headings, structured data, soft 404s | SEO-01–SEO-77 |
| **programmatic-seo** | At-scale / template-driven SEO work: URL-structure policy, sitemap index + image/video extensions and caps, internal-linking graphs, IndexNow pipelines | SEO-09, SEO-14–SEO-23, SEO-24–SEO-29, SEO-50–SEO-57, SEO-73–SEO-77 |
| **agent-browser** | Browser-driven read-only auditing of the interactive surface: axe runs per template, keyboard walkthroughs, focus tracking, overlay and banner behaviour | A1–A88, PRV-11–PRV-23 |
| **playwright-testing** | Scripted, repeatable audit regression: RTL/LTR screenshot diffs (the i18n section names Playwright explicitly), prerender and BFCache eligibility, consent-banner state machines | I18N-47, P-59–P-62, P-68–P-70, PRV-11–PRV-23 |
| **web-gui-tester** | Guided GUI flow testing on real journeys: multi-step checkout/signup (redundant entry), drag alternatives, cookie-banner interaction paths | A52–A57, A76–A78, PRV-15–PRV-19 |
| **control-browser** | Ad-hoc live browser control with DevTools emulation: prefers-reduced-motion, forced-colors, offline, zoom, cookie/storage inspection before consent | A7, A62–A65, R15, PRV-11–PRV-14 |
| **react-doctor** | When the audited site is a React app and §2 findings need code-level fixes: long-task/INP break-up, SSR/hydration of titles and content, dialog focus management, unload-listener removal | P-2, SEO-35, F-12, A18, P-68 |

Everything else in §2 is verifiable from a shell (`curl`, `dig`, `openssl`, `xmllint`, `jq`) or a free scanner (PageSpeed Insights, SSL Labs, Internet.nl, validator.schema.org, validator.w3.org/feed) and needs no skill.

## 6. Coverage appendix

Pages fetched per category, fetch failures, pages not distilled, and citation counts. The first three columns come from the run's command-decided category status handed to this synthesis step; the citation columns come from this report's independent re-verification.

| Category | Pages fetched | Fetch failures | Pages not distilled | Requirements distilled | Quotes re-verified (this run) | Unverified quotes |
|---|---|---|---|---|---|---|
| foundations | 20 | 0 | 0 | 67 | 67 | 0 |
| seo | 14 | 0 | 0 | 77 | 77 | 0 |
| accessibility | 30 | 0 | 0 | 88 | 88 | 0 |
| security | 23 | 0 | 0 | 98 | 98 | 0 |
| well-known | 13 | 0 | 0 | 45 | 45 | 0 |
| agent-readiness | 22 | 0 | 0 | 107 | 107 | 0 |
| performance | 26 | 0 | 0 | 81 | 81 | 0 |
| privacy | 7 | 0 | 0 | 51 | 51 | 0 |
| resilience | 9 | 0 | 0 | 34 | 34 | 0 |
| i18n | 13 | 0 | 0 | 61 | 61 | 0 |
| meta | 5 | 0 | 0 | 98 (folded into §2 status lines) | 98 | 0 |
| **Total** | **182** | **0** | **0** | **807 blocks → 709 deduplicated requirements** | **807** | **0** |

Citation verification method (run during this synthesis): a parser read every block of every distilled section and checked each quote, after normalisation (strip the distillation's wrapping quotes/backticks; try both the markdown-escaped and unescaped angle-bracket forms, since `meta/checklist.md` itself stores `\<`/`\>` escapes), for fixed-string presence in the exact source file the block cites. Command run: `python3 /tmp/specweb_gen.py`. Result: 709/709 category quotes and 98/98 meta quotes matched — consistent with the run's command-decided zero-unverified status. Checklist status counts (36/87/48/6 of 177) re-verified separately with `grep -oE '— (Required|Recommended|Optional|Avoid)$' meta/checklist.md | sort | uniq -c`.

Distillation scope notes (why some fetched spec pages contribute no standalone requirements — by design, per the meta checklist notes):

- All 36 Required and all 6 Avoid checklist items are included in §2.
- Recommended items included are those observable on public consumer surfaces. Excluded Recommended items are build-technique topics (Popover API, anchor positioning, text-wrap, container queries, invoker commands, inert, ARIA-first-rule, CSS state selectors, native interactive elements, forced-colors, hidden-until-found, dragging movements, speculation rules, view transitions, visibility-aware rendering, CSS containment, scroll-driven animations, scrollbar-gutter, dynamic viewport units, resource-hints overview, theme-color, feed discovery/hygiene, sitemap index, image sitemaps, Vary, No-Vary-Search, Early Hints, compression dictionary transport, Server-Timing, Reporting API, Fetch Metadata, COOP/COEP/CORP, Trusted Types, digest fields, Clear-Site-Data, DNS CAA, RPKI, DNSSEC, DANE, Redirect-By, Deprecation/Sunset) — consult `meta/checklist.md` when the target site's context makes them relevant. (Several of these do appear in §2 where the category distillation judged them observable: the exclusion list is the meta checklist's own scope note, retained verbatim for transparency.)
- Optional items are conditional on site features and were excluded from requirements: account/auth well-knowns (change-password, webauthn, openid-configuration, oauth-authorization-server, oauth-protected-resource, gpc.json), storage access, feed/WebSub items, and emerging agent conventions (llms-full.txt, Content Signals, TDMRep, Web Bot Auth, auth.md, MCP tool discovery, A2A cards, DNS-AID, ARD, NLWeb, WebMCP, OKF bundle, Schemamap) — the checklist states the condition under which each applies; severity would be low. (The category distillations did include read-only-checkable subsets of these — e.g. WK-6–WK-22, AR-3–AR-107, PRV-36–PRV-39 — marked with their conditions in the requirement text.)
- Privacy scope note (from the privacy distillation): internal/backend practices not externally verifiable by a read-only auditor were excluded — server log redaction, scheduled retention enforcement, GPC opt-out records — with documentation-level fallbacks noted on PRV-41/PRV-42.

---

Generated by the research-synthesizer step of this run from `.zflow/evidence/specweb/distilled/` (11 sections, 807 blocks) and the local page corpus under `.zflow/evidence/specweb/`. Severity values and citation statuses are the run's; this step's only independent claims are the 807/807 quote re-verification and the 36/87/48/6 checklist count re-verification documented above.
