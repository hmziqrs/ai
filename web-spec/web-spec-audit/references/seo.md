# SEO — 77 audit checks

The crawlability and indexability contract: robots.txt, XML sitemaps and their extensions, URL structure, redirects, server-side rendering, soft-404 discipline, indexing policy, headings, internal linking, JSON-LD, breadcrumbs, IndexNow.

Source: [The Website Specification](https://specification.website/spec/seo/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.2, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/seo/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — redirects, meta robots / X-Robots-Tag, heading hierarchy · **Avoid** — soft 404s · **Recommended** — robots.txt, XML sitemaps, URL structure, server-side rendering, internal linking, structured data (JSON-LD), breadcrumbs.

Severity legend:

- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

- **SEO-01 — robots.txt served correctly at the root** (high · `robots-txt`)
  Verify: `curl -sI https://site/robots.txt` — expect status 200 and `Content-Type: text/plain`.
- **SEO-02 — Sitemap directive in robots.txt** (medium · `robots-txt`)
  Verify: `curl -s https://site/robots.txt | grep -i '^Sitemap:'` — expect at least one line with an absolute sitemap URL.
- **SEO-03 — robots.txt size limit** (low · `robots-txt`)
  Verify: `curl -s https://site/robots.txt | wc -c` — expect a value below 512000.
- **SEO-04 — no site-wide Disallow on production** (high · `robots-txt`)
  Verify: `curl -s https://site/robots.txt | grep -iE 'Disallow: */$'` — expect no match under any `User-agent` group.
- **SEO-05 — CSS and JS not blocked** (medium · `robots-txt`)
  Verify: Read robots.txt Disallow rules and confirm none match `.css`/`.js` asset paths; `curl -sI -A "Googlebot" <sampled asset URL>` returns 200.
- **SEO-06 — no Noindex line in robots.txt** (medium · `robots-txt`)
  Verify: `curl -s https://site/robots.txt | grep -i '^Noindex:'` — expect no match.
- **SEO-07 — sitemap fetchable with correct content type** (medium · `xml-sitemaps`)
  Verify: `curl -sI https://site/sitemap.xml` — expect 200 and `Content-Type: application/xml`.
- **SEO-08 — absolute, same-host URLs in sitemap** (medium · `xml-sitemaps`)
  Verify: `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>'` — every value starts with `https://site` (scheme+host matching the serving host).
- **SEO-09 — sitemap size and URL limits** (medium · `xml-sitemaps`)
  Verify: `curl -s https://site/sitemap.xml | grep -c '<url>'` ≤ 50000 and uncompressed size ≤ 50 MB (`curl -s ... | wc -c`, gunzipping first if served as `.xml.gz`).
- **SEO-10 — sitemap lists only live canonical URLs** (high · `xml-sitemaps`)
  Verify: Loop `curl -s -o /dev/null -w '%{http_code} %{url}\n'` over the sitemap's `<loc>` URLs — all must be 200; spot-check each page's `<link rel="canonical">` equals its sitemap URL.
- **SEO-11 — honest lastmod in ISO 8601** (low · `xml-sitemaps`)
  Verify: Extract `<lastmod>` values and validate against W3C date syntax (`\d{4}-\d{2}-\d{2}` prefix or full datetime); flag entries whose lastmod equals the fetch/deploy date across the whole file.
- **SEO-12 — correct content type for gzip sitemap** (low · `xml-sitemaps`)
  Verify: `curl -sI https://site/sitemap.xml.gz` — expect `Content-Type: application/x-gzip`; the plain `.xml` variant must return `application/xml`.
- **SEO-13 — no XSL stylesheet on sitemaps** (low · `xml-sitemaps`)
  Verify: `curl -s https://site/sitemap.xml | head -5 | grep -i 'xml-stylesheet'` — expect no match.
- **SEO-14 — index structure and resolvable children** (medium · `sitemap-index`)
  Verify: `curl -s https://site/sitemap-index.xml | head -3` shows the `<sitemapindex>` root; `xmllint --noout` each child URL and confirm it parses as a urlset.
- **SEO-15 — child sitemaps on the same host** (medium · `sitemap-index`)
  Verify: `curl -s https://site/sitemap-index.xml | grep -o '<loc>[^<]*</loc>'` — every child URL's host equals the index URL's host.
- **SEO-16 — index lastmod reflects newest child entry** (low · `sitemap-index`)
  Verify: Fetch a child sitemap, compute `max(<lastmod>)`, and compare it to the index entry's `<lastmod>` — they must match.
- **SEO-17 — index child-count and size caps** (low · `sitemap-index`)
  Verify: `curl -s https://site/sitemap-index.xml | grep -c '<sitemap>'` ≤ 50000 and `curl -s ... | wc -c` ≤ 52428800.
- **SEO-18 — namespace declarations present** (low · `image-sitemaps`)
  Verify: `curl -s https://site/sitemap.xml | head -5 | grep -o 'xmlns:image="[^"]*"'` — namespace present whenever `<image:image>` elements are used (same for `xmlns:video`).
- **SEO-19 — image URLs reachable with image content type** (low · `image-sitemaps`)
  Verify: `curl -sI <image:loc URL>` for each entry — expect 200 and a `image/*` Content-Type.
- **SEO-20 — image count cap per URL entry** (low · `image-sitemaps`)
  Verify: Parse the sitemap and count `<image:image>` children per `<url>` — each ≤ 1000.
- **SEO-21 — video entry required fields** (low · `image-sitemaps`)
  Verify: `xmllint --shell` or a grep over each `<video:video>` block confirming all required children are present; validate against Google's video sitemap XSD.
- **SEO-22 — video title and description length caps** (low · `image-sitemaps`)
  Verify: Extract `video:title` and `video:description` text lengths from the sitemap — title < 100 chars, description < 2048 chars.
- **SEO-23 — listed images actually used on the page** (low · `image-sitemaps`)
  Verify: `curl -s <page loc>` and confirm each `<image:loc>` URL appears among the page's `img` `src`/`srcset` values.
- **SEO-24 — lowercase paths enforced by 301** (medium · `url-structure`)
  Verify: `curl -sI https://site/ABOUT` (uppercased variant of a real path) — expect 301 with a lowercase `Location`.
- **SEO-25 — hyphens, not underscores, in slugs** (low · `url-structure`)
  Verify: `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>' | grep -E '[a-z]_[a-z]'` — expect no underscore-separated paths.
- **SEO-26 — shallow URL nesting** (low · `url-structure`)
  Verify: Count path segments per sitemap URL (`awk -F/ '{print NF-4}'` on the loc values) — flag pages deeper than 3 segments.
- **SEO-27 — consistent trailing slash enforced by 301** (medium · `url-structure`)
  Verify: `curl -sI https://site/page/` and `curl -sI https://site/page` — exactly one form returns 200 and the other returns 301 to it.
- **SEO-28 — canonical URLs strip query parameters** (medium · `url-structure`)
  Verify: `curl -s 'https://site/page?utm_source=x&sort=price' | grep -o '<link rel="canonical"[^>]*>'` — the href has no query string and no session/tracking parameter.
- **SEO-29 — ASCII-only URLs** (low · `url-structure`)
  Verify: `curl -s https://site/sitemap.xml | grep -P '[^\x00-\x7F]'` — expect no non-ASCII bytes in loc values.
- **SEO-30 — permanent moves use 301/308** (high · `redirects`)
  Verify: `curl -sI https://site/old-url` — known permanent moves return 301/308 with the new `Location`, not 302.
- **SEO-31 — HTTP to HTTPS via 301** (high · `redirects`)
  Verify: `curl -sI http://site/` — expect 301 with an `https://` `Location`.
- **SEO-32 — redirect chains at most three hops** (medium · `redirects`)
  Verify: `curl -sIL -o /dev/null -w '%{num_redirects}\n' https://site/old-url` — hop count ≤ 3.
- **SEO-33 — no redirect loops** (high · `redirects`)
  Verify: `curl -sIL --max-redirs 10 https://site/<suspect-url>` — the fetch terminates without a "maximum redirections exceeded" error.
- **SEO-34 — redirects at the HTTP layer, not meta-refresh or JS** (medium · `redirects`)
  Verify: `curl -sI https://site/old-url` shows a 3xx; `curl -s https://site/old-page | grep -iE 'http-equiv=.refresh.'` — no meta-refresh used as the redirect mechanism.
- **SEO-35 — content and metadata in the initial HTML** (high · `server-side-rendering`)
  Verify: `curl -s https://site/ | grep -iE '<title|rel="canonical"|og:'` — title, canonical and OG tags present in raw HTML; main copy visible with JavaScript disabled in DevTools.
- **SEO-36 — real anchor links in served markup** (high · `server-side-rendering`)
  Verify: `curl -s https://site/ | grep -c '<a href'` — navigation anchors present in the server HTML; with JavaScript disabled the navigation still works.
- **SEO-37 — same content for crawlers and users (no cloaking)** (high · `server-side-rendering`)
  Verify: `diff <(curl -s -A "Mozilla/5.0" https://site/page) <(curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://site/page)` — no materially different content.
- **SEO-38 — nonexistent URLs return 404 or 410** (high · `soft-404`)
  Verify: `curl -sI https://site/this-does-not-exist-<random>` — expect 404 or 410.
- **SEO-39 — missing pages not redirected to the home page** (medium · `soft-404`)
  Verify: `curl -sI https://site/nonexistent-<random>` — no `Location` header pointing at `/` or the homepage.
- **SEO-40 — explicit, correct indexing policy per page** (high · `meta-robots`)
  Verify: `curl -s https://site/<key-page> | grep -i 'name="robots"'` — no noindex on public pages; `curl -sI` shows no `X-Robots-Tag: noindex`; thank-you/cart/account pages do carry noindex.
- **SEO-41 — staging environments carry noindex** (high · `meta-robots`)
  Verify: `curl -sI https://staging.site/ | grep -i 'x-robots-tag'` or `curl -s https://staging.site/ | grep -i 'name="robots"'` — noindex present on the staging host.
- **SEO-42 — X-Robots-Tag for non-HTML resources** (medium · `meta-robots`)
  Verify: `curl -sI https://site/files/sample.pdf | grep -i 'x-robots-tag'` — header set on non-HTML resources that should not be indexed.
- **SEO-43 — no robots.txt Disallow combined with noindex** (medium · `meta-robots`)
  Verify: Cross-check robots.txt Disallow paths against pages that serve `noindex` (meta robots or X-Robots-Tag) — the two sets must not overlap.
- **SEO-44 — exactly one h1 per page** (medium · `heading-hierarchy`)
  Verify: `curl -s https://site/page | grep -o '<h1[^>]*>' | wc -l` — exactly 1 on every audited page.
- **SEO-45 — no skipped heading levels** (medium · `heading-hierarchy`)
  Verify: Run axe or Lighthouse (heading-order rule); or extract the `grep -oE '<h[1-6]'` sequence from the HTML and assert no upward jump greater than +1.
- **SEO-46 — visual headings use real heading tags** (medium · `heading-hierarchy`)
  Verify: Inspect the DOM/CSS (axe, WAVE, or DevTools) for large-font standalone text not wrapped in an heading element.
- **SEO-47 — headings under 70 characters** (low · `heading-hierarchy`)
  Verify: Extract heading text lengths via a DOM parser — each under 70 characters.
- **SEO-48 — no empty headings** (low · `heading-hierarchy`)
  Verify: Run axe/Lighthouse (empty-heading flags) or parse the DOM for consecutive heading elements with no intervening content.
- **SEO-49 — title and subtitle form one heading** (low · `heading-hierarchy`)
  Verify: View-source: the `<h1>` is not immediately followed by an `<h2>` used as a tagline; subtitles are `<p>` inside `<hgroup>`.
- **SEO-50 — descriptive anchor text** (medium · `internal-linking`)
  Verify: Crawl with Screaming Frog and review the anchor-text report for generic anchors ("click here", "read more", "learn more").
- **SEO-51 — links point at canonical destinations** (medium · `internal-linking`)
  Verify: Sample internal `<a href>` values with `curl -s -o /dev/null -w '%{http_code}' <href>` — destinations return 200, not 301.
- **SEO-52 — no orphan pages** (medium · `internal-linking`)
  Verify: Crawl the site (Screaming Frog/Sitebulb) and diff the sitemap URL list against pages with ≥ 1 inlink — the orphan-pages report must be empty.
- **SEO-53 — content pages link to related content** (low · `internal-linking`)
  Verify: From a crawl export, count contextual internal links per content page (excluding repeated nav/footer) — expect 2–5.
- **SEO-54 — link depth within three clicks** (low · `internal-linking`)
  Verify: Screaming Frog crawl-depth column (or equivalent) — flag pages deeper than 3 clicks from `/`.
- **SEO-55 — no nofollow on internal links** (low · `internal-linking`)
  Verify: `curl -s https://site/page | grep -c 'rel="nofollow"'` applied to internal links — expect 0.
- **SEO-56 — no links to staging or preview hosts** (medium · `internal-linking`)
  Verify: Crawl hrefs and run `grep -E 'staging\.|\.dev\.|preview\.|localhost'` over the link export — expect no matches.
- **SEO-57 — no massive footer link blocks** (low · `internal-linking`)
  Verify: Count `<a>` elements inside `<footer>` from the crawl export — not in the hundreds.
- **SEO-58 — JSON-LD structured data present** (medium · `structured-data`)
  Verify: `curl -s https://site/page | grep -c 'application/ld+json'` ≥ 1; validate the block in validator.schema.org.
- **SEO-59 — JSON-LD mirrors visible content** (high · `structured-data`)
  Verify: Compare JSON-LD fields (price, availability, dates, author) against the rendered page text — every declared fact appears visibly.
- **SEO-60 — no fabricated ratings or reviews** (high · `structured-data`)
  Verify: Where JSON-LD contains `aggregateRating`/`Review`, confirm visible review content (matching count/score) exists on the page.
- **SEO-61 — absolute URLs inside JSON-LD** (low · `structured-data`)
  Verify: Parse the JSON-LD block — every `@id`, `url`, `image`, `sameAs` value starts with `http(s)://`.
- **SEO-62 — ISO 8601 dates in JSON-LD** (low · `structured-data`)
  Verify: Parse `datePublished`/`dateModified` values with an ISO 8601 parser (`date -Iseconds` / moment.iso) — all valid.
- **SEO-63 — WebSite entity on the home page** (low · `structured-data`)
  Verify: `curl -s https://site/ | grep -o '"@type": *"WebSite"'` — present with `url` and `name` populated.
- **SEO-64 — Organization/Person identity with sameAs** (low · `structured-data`)
  Verify: Parse home-page JSON-LD for `@type: Organization`/`Person` and a non-empty `sameAs` array of profile URLs.
- **SEO-65 — Article markup on article pages** (medium · `structured-data`)
  Verify: On article URLs, extract JSON-LD `@type: Article`/`BlogPosting` and confirm all five fields; run Google's Rich Results Test.
- **SEO-66 — breadcrumb trail in labelled nav** (medium · `breadcrumbs`)
  Verify: `curl -s https://site/page | grep -c 'nav aria-label="Breadcrumb"'` ≥ 1 on pages with a trail.
- **SEO-67 — breadcrumb uses an ordered list** (low · `breadcrumbs`)
  Verify: `curl -s https://site/page | grep -A3 'aria-label="Breadcrumb"'` — the trail is `<ol><li>…` structure.
- **SEO-68 — current page marked and not a link** (medium · `breadcrumbs`)
  Verify: `curl -s https://site/page | grep 'aria-current="page"'` — present, and its `<li>` contains no `<a>` element.
- **SEO-69 — BreadcrumbList JSON-LD matches visible trail** (medium · `breadcrumbs`)
  Verify: Extract the `BreadcrumbList` itemListElement names/urls and diff against the rendered trail; confirm with Google's Rich Results Test.
- **SEO-70 — separator via CSS, not a literal character** (low · `breadcrumbs`)
  Verify: `curl -s https://site/page | grep -c '›'` — no literal separator characters inside breadcrumb link text.
- **SEO-71 — trail anchored at Home** (low · `breadcrumbs`)
  Verify: First breadcrumb item (visible and in JSON-LD) is "Home" linking to the site root.
- **SEO-72 — trail three to five levels** (low · `breadcrumbs`)
  Verify: Count trail items per page — 3–5; flag trails approaching 10.
- **SEO-73 — key file hosted at site root** (low · `indexnow`)
  Verify: `curl -sI https://site/<key>.txt` → 200 `text/plain`; `curl -s https://site/<key>.txt` body equals the key.
- **SEO-74 — key file returns 200 directly** (low · `indexnow`)
  Verify: `curl -sI https://site/<key>.txt` — status is 200 (not 301/302/404).
- **SEO-75 — key format 8–128 allowed characters** (low · `indexnow`)
  Verify: Fetch the key file and validate the body against `^[a-zA-Z0-9-]{8,128}$`.
- **SEO-76 — submissions limited to changes, max 10,000 URLs** (low · `indexnow`)
  Verify: Not observable externally without logs; review the integration's submission logs or Bing Webmaster Tools "URL Submission" history for batch sizes and change-only payloads.
- **SEO-77 — deletions submitted too** (low · `indexnow`)
  Verify: Not observable externally; confirm 404/410 URLs appear in the IndexNow submission logs / Bing Webmaster Tools URL Submission history.
