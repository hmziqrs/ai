# SEO — distilled audit requirements

Distilled from the specification.website `seo` section (14 pages under `.zflow/evidence/specweb/seo/`).
Each block states one checkable practice for a consumer-facing website, with an exact quote from the
source page, the source path, a read-only verification method for a live site, and a suggested severity.

## robots.txt

### SEO-01 — robots.txt served correctly at the root
- **Requirement:** The site must serve `robots.txt` at exactly `/robots.txt`, returning `200 OK` with `Content-Type: text/plain` (not 404, not 5xx).
- **Quote:** It must be reachable at exactly `/robots.txt` on the host, served as `text/plain`, and returned with a `200 OK`. A `404` is interpreted as "no restrictions"; a `5xx` is interpreted as "crawl nothing" by most crawlers.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** `curl -sI https://site/robots.txt` — expect status 200 and `Content-Type: text/plain`.
- **Severity:** high

### SEO-02 — Sitemap directive in robots.txt
- **Requirement:** robots.txt must include a `Sitemap:` directive pointing crawlers at the site's sitemap URL.
- **Quote:** - The `Sitemap:` directive is the canonical way to point crawlers at your sitemap when they have not been told another way.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** `curl -s https://site/robots.txt | grep -i '^Sitemap:'` — expect at least one line with an absolute sitemap URL.
- **Severity:** medium

### SEO-03 — robots.txt size limit
- **Requirement:** robots.txt must stay under 500 KiB in size.
- **Quote:** - Keep the file under 500 KiB. Google truncates above that.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** `curl -s https://site/robots.txt | wc -c` — expect a value below 512000.
- **Severity:** low

### SEO-04 — no site-wide Disallow on production
- **Requirement:** Production robots.txt must not contain a blanket `Disallow: /` rule that blocks the entire site.
- **Quote:** - `Disallow: /` accidentally left over from staging. This blocks the entire site.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** `curl -s https://site/robots.txt | grep -iE 'Disallow: */$'` — expect no match under any `User-agent` group.
- **Severity:** high

### SEO-05 — CSS and JS not blocked
- **Requirement:** robots.txt must not disallow the CSS and JavaScript assets pages need to render.
- **Quote:** - Blocking CSS and JS. Google needs to render the page to rank it.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** Read robots.txt Disallow rules and confirm none match `.css`/`.js` asset paths; `curl -sI -A "Googlebot" <sampled asset URL>` returns 200.
- **Severity:** medium

### SEO-06 — no Noindex line in robots.txt
- **Requirement:** robots.txt must not contain a `Noindex:` line (unsupported and silently ignored; deindexing belongs in meta robots / X-Robots-Tag).
- **Quote:** - Adding a `Noindex:` line to robots.txt to keep a page out of search. It was never part of the standard, Google stopped honouring the unofficial version in September 2019, and unsupported lines are silently ignored. robots.txt governs crawling, not indexing: to deindex a page, let it be crawled and serve `noindex` in a meta robots tag or `X-Robots-Tag`.
- **Source:** `.zflow/evidence/specweb/seo/robots-txt.md`
- **Verify:** `curl -s https://site/robots.txt | grep -i '^Noindex:'` — expect no match.
- **Severity:** medium

## XML sitemaps

### SEO-07 — sitemap fetchable with correct content type
- **Requirement:** The XML sitemap must be fetchable directly and return `200 OK` with `Content-Type: application/xml` (or `application/x-gzip` for a `.xml.gz` file).
- **Quote:** - Fetch the sitemap directly. Confirm `Content-Type: application/xml` and a `200 OK`.
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** `curl -sI https://site/sitemap.xml` — expect 200 and `Content-Type: application/xml`.
- **Severity:** medium

### SEO-08 — absolute, same-host URLs in sitemap
- **Requirement:** Every `<loc>` entry in the sitemap must be an absolute URL including scheme and host, on the same host that serves the sitemap.
- **Quote:** - **URL must be absolute.** Include the scheme and host. The sitemap must live on the same host as the URLs it lists, with limited exceptions.
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>'` — every value starts with `https://site` (scheme+host matching the serving host).
- **Severity:** medium

### SEO-09 — sitemap size and URL limits
- **Requirement:** A single sitemap must contain at most 50,000 URLs and 50 MB uncompressed; beyond that it must be split and referenced from a sitemap index.
- **Quote:** - **One sitemap, 50,000 URLs and 50 MB uncompressed maximum.** Past that, split into multiple sitemaps and add a [sitemap index](/spec/seo/sitemap-index/).
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** `curl -s https://site/sitemap.xml | grep -c '<url>'` ≤ 50000 and uncompressed size ≤ 50 MB (`curl -s ... | wc -c`, gunzipping first if served as `.xml.gz`).
- **Severity:** medium

### SEO-10 — sitemap lists only live canonical URLs
- **Requirement:** Every URL listed in the sitemap must return a 2xx response and be the canonical version of the page — no 3xx, 4xx, or 5xx entries.
- **Quote:** - Including URLs that return 3xx, 4xx, or 5xx — crawlers will drop trust in the whole sitemap.
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** Loop `curl -s -o /dev/null -w '%{http_code} %{url}\n'` over the sitemap's `<loc>` URLs — all must be 200; spot-check each page's `<link rel="canonical">` equals its sitemap URL.
- **Severity:** high

### SEO-11 — honest lastmod in ISO 8601
- **Requirement:** `<lastmod>` values must use the ISO 8601 / W3C date format and change only when the page content actually changes (not on every deploy).
- **Quote:** - **Set `<lastmod>` honestly.** Use ISO 8601 / W3C date format. Google uses it as a hint when scheduling recrawls; touching it on every deploy degrades that signal.
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** Extract `<lastmod>` values and validate against W3C date syntax (`\d{4}-\d{2}-\d{2}` prefix or full datetime); flag entries whose lastmod equals the fetch/deploy date across the whole file.
- **Severity:** low

### SEO-12 — correct content type for gzip sitemap
- **Requirement:** A gzip-compressed sitemap must be served as `application/x-gzip` with a `.xml.gz` extension; a plain sitemap as `application/xml`.
- **Quote:** - **Gzip is allowed.** Serve as `application/xml` (`.xml`) or `application/x-gzip` (`.xml.gz`).
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** `curl -sI https://site/sitemap.xml.gz` — expect `Content-Type: application/x-gzip`; the plain `.xml` variant must return `application/xml`.
- **Severity:** low

### SEO-13 — no XSL stylesheet on sitemaps
- **Requirement:** Sitemaps must not carry an `<?xml-stylesheet?>` processing instruction pointing at an XSLT stylesheet (native XSLT is being removed from browsers).
- **Quote:** ## Do not attach an XSL stylesheet
- **Source:** `.zflow/evidence/specweb/seo/xml-sitemaps.md`
- **Verify:** `curl -s https://site/sitemap.xml | head -5 | grep -i 'xml-stylesheet'` — expect no match.
- **Severity:** low

## Sitemap index files

### SEO-14 — index structure and resolvable children
- **Requirement:** A sitemap index must use `<sitemapindex>` as its root element and every child `<loc>` must resolve to a valid sitemap.
- **Quote:** - Fetch the index URL. Confirm the root element is `<sitemapindex>` and each child resolves to a valid sitemap.
- **Source:** `.zflow/evidence/specweb/seo/sitemap-index.md`
- **Verify:** `curl -s https://site/sitemap-index.xml | head -3` shows the `<sitemapindex>` root; `xmllint --noout` each child URL and confirm it parses as a urlset.
- **Severity:** medium

### SEO-15 — child sitemaps on the same host
- **Requirement:** Every child sitemap listed in a sitemap index must be hosted on the same host as the index.
- **Quote:** - Every child sitemap must be on the same host as the index, with limited cross-host exceptions.
- **Source:** `.zflow/evidence/specweb/seo/sitemap-index.md`
- **Verify:** `curl -s https://site/sitemap-index.xml | grep -o '<loc>[^<]*</loc>'` — every child URL's host equals the index URL's host.
- **Severity:** medium

### SEO-16 — index lastmod reflects newest child entry
- **Requirement:** The `<lastmod>` on each index entry must reflect the newest `<lastmod>` inside that child sitemap.
- **Quote:** - `<lastmod>` on the index entry should reflect the newest `<lastmod>` inside the child sitemap. This lets crawlers skip refetching unchanged sections.
- **Source:** `.zflow/evidence/specweb/seo/sitemap-index.md`
- **Verify:** Fetch a child sitemap, compute `max(<lastmod>)`, and compare it to the index entry's `<lastmod>` — they must match.
- **Severity:** low

### SEO-17 — index child-count and size caps
- **Requirement:** A sitemap index must list at most 50,000 child sitemaps and itself stay under 50 MB uncompressed.
- **Quote:** - Up to **50,000 child sitemaps** per index, and the index itself is capped at 50 MB uncompressed.
- **Source:** `.zflow/evidence/specweb/seo/sitemap-index.md`
- **Verify:** `curl -s https://site/sitemap-index.xml | grep -c '<sitemap>'` ≤ 50000 and `curl -s ... | wc -c` ≤ 52428800.
- **Severity:** low

## Image and video sitemap extensions

### SEO-18 — namespace declarations present
- **Requirement:** Sitemaps using image or video extensions must declare the `xmlns:image` / `xmlns:video` namespace on `<urlset>`.
- **Quote:** - Forgetting the `xmlns:image` or `xmlns:video` namespace declaration on `<urlset>`.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** `curl -s https://site/sitemap.xml | head -5 | grep -o 'xmlns:image="[^"]*"'` — namespace present whenever `<image:image>` elements are used (same for `xmlns:video`).
- **Severity:** low

### SEO-19 — image URLs reachable with image content type
- **Requirement:** Every `<image:loc>` URL must return `200 OK` with an image `Content-Type` — no redirects or 404s.
- **Quote:** - Test that each `<image:loc>` returns `200 OK` with an image `Content-Type`.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** `curl -sI <image:loc URL>` for each entry — expect 200 and a `image/*` Content-Type.
- **Severity:** low

### SEO-20 — image count cap per URL entry
- **Requirement:** Each `<url>` entry must list at most 1,000 `<image:image>` elements.
- **Quote:** - Up to **1,000 images per `<url>` entry**.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** Parse the sitemap and count `<image:image>` children per `<url>` — each ≤ 1000.
- **Severity:** low

### SEO-21 — video entry required fields
- **Requirement:** Each `<video:video>` entry must include `thumbnail_loc`, `title`, `description`, and one of `content_loc` or `player_loc`.
- **Quote:** - Each `<video:video>` needs `thumbnail_loc`, `title`, `description`, and one of `content_loc` or `player_loc`.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** `xmllint --shell` or a grep over each `<video:video>` block confirming all required children are present; validate against Google's video sitemap XSD.
- **Severity:** low

### SEO-22 — video title and description length caps
- **Requirement:** Video sitemap titles must stay under 100 characters and descriptions under 2,048.
- **Quote:** - Keep titles under 100 characters and descriptions under 2,048.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** Extract `video:title` and `video:description` text lengths from the sitemap — title < 100 chars, description < 2048 chars.
- **Severity:** low

### SEO-23 — listed images actually used on the page
- **Requirement:** Images declared via `<image:image>` must be images the page in `<loc>` actually loads.
- **Quote:** - Listing images that are not actually used on the page in `<loc>`. Crawlers cross-check.
- **Source:** `.zflow/evidence/specweb/seo/image-sitemaps.md`
- **Verify:** `curl -s <page loc>` and confirm each `<image:loc>` URL appears among the page's `img` `src`/`srcset` values.
- **Severity:** low

## URL structure

### SEO-24 — lowercase paths enforced by 301
- **Requirement:** URL paths must be lowercase, with uppercase variants 301-redirected to the lowercase canonical form.
- **Quote:** - **Lowercase only.** RFC 3986 says the path is case-sensitive, so `/About` and `/about` are different URLs. Pick lowercase and enforce a 301 redirect for any uppercase variant.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** `curl -sI https://site/ABOUT` (uppercased variant of a real path) — expect 301 with a lowercase `Location`.
- **Severity:** medium

### SEO-25 — hyphens, not underscores, in slugs
- **Requirement:** Word separators in URL path segments must be hyphens, not underscores.
- **Quote:** - **Hyphens, not underscores.** Search engines tokenise on hyphens but not underscores. `web-security` reads as two words; `web_security` reads as one.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** `curl -s https://site/sitemap.xml | grep -o '<loc>[^<]*</loc>' | grep -E '[a-z]_[a-z]'` — expect no underscore-separated paths.
- **Severity:** low

### SEO-26 — shallow URL nesting
- **Requirement:** URLs should use three or fewer path segments after the host.
- **Quote:** - **Avoid deep nesting.** Aim for three or fewer path segments after the host. Deep URLs (`/section/sub/sub/sub/post`) signal low priority and are hard to refactor.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** Count path segments per sitemap URL (`awk -F/ '{print NF-4}'` on the loc values) — flag pages deeper than 3 segments.
- **Severity:** low

### SEO-27 — consistent trailing slash enforced by 301
- **Requirement:** The site must pick one trailing-slash form and 301-redirect the other form to it — never serve both at 200.
- **Quote:** - **Pick trailing-slash or no-trailing-slash and stick with it.** Both work; mixing creates duplicate-content risk. Use a 301 to enforce the chosen form.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** `curl -sI https://site/page/` and `curl -sI https://site/page` — exactly one form returns 200 and the other returns 301 to it.
- **Severity:** medium

### SEO-28 — canonical URLs strip query parameters
- **Requirement:** Canonical links must point at clean parameter-free paths; filter, tracking, and session parameters must not appear in canonical URLs.
- **Quote:** - **Query parameters are for filters, not content.** Canonical content should have a clean path. Parameters are fine for sort order, pagination, and tracking, but the canonical link should strip them.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** `curl -s 'https://site/page?utm_source=x&sort=price' | grep -o '<link rel="canonical"[^>]*>'` — the href has no query string and no session/tracking parameter.
- **Severity:** medium

### SEO-29 — ASCII-only URLs
- **Requirement:** URLs should be ASCII-only, avoiding non-ASCII characters in paths.
- **Quote:** - **ASCII where possible.** Modern browsers handle IDNs and percent-encoded UTF-8 fine, but non-ASCII URLs break in older tooling, copy-paste, and email clients.
- **Source:** `.zflow/evidence/specweb/seo/url-structure.md`
- **Verify:** `curl -s https://site/sitemap.xml | grep -P '[^\x00-\x7F]'` — expect no non-ASCII bytes in loc values.
- **Severity:** low

## Redirects

### SEO-30 — permanent moves use 301/308
- **Requirement:** A URL that has moved for good must return 301 (or 308 when the request method matters), never a 302/307.
- **Quote:** - **URL has moved for good → 301 (or 308 if the method matters).**
- **Source:** `.zflow/evidence/specweb/seo/redirects.md`
- **Verify:** `curl -sI https://site/old-url` — known permanent moves return 301/308 with the new `Location`, not 302.
- **Severity:** high

### SEO-31 — HTTP to HTTPS via 301
- **Requirement:** Plain-`http://` requests must 301-redirect to the `https://` equivalent.
- **Quote:** - **HTTPS upgrade → 301** from `http://` to `https://`.
- **Source:** `.zflow/evidence/specweb/seo/redirects.md`
- **Verify:** `curl -sI http://site/` — expect 301 with an `https://` `Location`.
- **Severity:** high

### SEO-32 — redirect chains at most three hops
- **Requirement:** Redirect chains must not exceed three hops; A → B → C must be flattened to A → C wherever both rules are controlled.
- **Quote:** - Chains longer than three hops. Google stops following after about ten; users feel the latency long before that.
- **Source:** `.zflow/evidence/specweb/seo/redirects.md`
- **Verify:** `curl -sIL -o /dev/null -w '%{num_redirects}\n' https://site/old-url` — hop count ≤ 3.
- **Severity:** medium

### SEO-33 — no redirect loops
- **Requirement:** The site must contain no redirect loops (A → B → A).
- **Quote:** - Redirect loops (`A → B → A`).
- **Source:** `.zflow/evidence/specweb/seo/redirects.md`
- **Verify:** `curl -sIL --max-redirs 10 https://site/<suspect-url>` — the fetch terminates without a "maximum redirections exceeded" error.
- **Severity:** high

### SEO-34 — redirects at the HTTP layer, not meta-refresh or JS
- **Requirement:** Redirects must be issued at the web server / CDN / origin as HTTP 3xx — not via `<meta http-equiv="refresh">` or JavaScript.
- **Quote:** - Redirect at the edge (web server, CDN, or origin) — not with `<meta http-equiv="refresh">` or JavaScript. Crawlers handle HTTP redirects reliably; meta-refresh and JS redirects are slower and ambiguous.
- **Source:** `.zflow/evidence/specweb/seo/redirects.md`
- **Verify:** `curl -sI https://site/old-url` shows a 3xx; `curl -s https://site/old-page | grep -iE 'http-equiv=.refresh.'` — no meta-refresh used as the redirect mechanism.
- **Severity:** medium

## Server-side rendering

### SEO-35 — content and metadata in the initial HTML
- **Requirement:** Primary content and `<head>` metadata (title, canonical, Open Graph) must be present in the initial server response, not assembled client-side by JavaScript.
- **Quote:** - Render primary content and `<head>` metadata server-side, by whichever method fits: SSR for per-request content, static generation for stable content, prerendering for a fixed URL set.
- **Source:** `.zflow/evidence/specweb/seo/server-side-rendering.md`
- **Verify:** `curl -s https://site/ | grep -iE '<title|rel="canonical"|og:'` — title, canonical and OG tags present in raw HTML; main copy visible with JavaScript disabled in DevTools.
- **Severity:** high

### SEO-36 — real anchor links in served markup
- **Requirement:** Navigation and internal links must be real `<a href>` elements in the served markup, not click handlers.
- **Quote:** - Put real `<a href>` links in the markup so crawlers can follow them; do not rely on click handlers for navigation.
- **Source:** `.zflow/evidence/specweb/seo/server-side-rendering.md`
- **Verify:** `curl -s https://site/ | grep -c '<a href'` — navigation anchors present in the server HTML; with JavaScript disabled the navigation still works.
- **Severity:** high

### SEO-37 — same content for crawlers and users (no cloaking)
- **Requirement:** The server must return the same rendered output to crawlers and users — no user-agent-dependent content differences.
- **Quote:** - **Cloaking by accident.** Serving crawlers a different rendered output from users risks quality penalties and broken trust. Render the same content for everyone.
- **Source:** `.zflow/evidence/specweb/seo/server-side-rendering.md`
- **Verify:** `diff <(curl -s -A "Mozilla/5.0" https://site/page) <(curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" https://site/page)` — no materially different content.
- **Severity:** high

## Soft 404s

### SEO-38 — nonexistent URLs return 404 or 410
- **Requirement:** A request for a nonexistent URL must return `404` or `410` — never `200` (soft 404) and never `302`.
- **Quote:** - `curl -sI https://example.com/this-does-not-exist` should return `404` or `410`, not `200` and not `302`.
- **Source:** `.zflow/evidence/specweb/seo/soft-404.md`
- **Verify:** `curl -sI https://site/this-does-not-exist-<random>` — expect 404 or 410.
- **Severity:** high

### SEO-39 — missing pages not redirected to the home page
- **Requirement:** Missing pages must not be redirected to the home page; they must return 404/410 so users and crawlers see the loss.
- **Quote:** - **Do not redirect missing pages to the home page.** That is the worst of both worlds — Google treats it as a soft 404 anyway, and users get no signal about what went wrong.
- **Source:** `.zflow/evidence/specweb/seo/soft-404.md`
- **Verify:** `curl -sI https://site/nonexistent-<random>` — no `Location` header pointing at `/` or the homepage.
- **Severity:** medium

## Meta robots and X-Robots-Tag

### SEO-40 — explicit, correct indexing policy per page
- **Requirement:** Public pages must be indexable; non-public pages (staging, thin, transactional, private) must be non-indexable via meta robots or `X-Robots-Tag` — no leftover `noindex` on production public pages.
- **Quote:** Public pages are required to be indexable; non-public pages are required to be non-indexable. Either way, the policy must be explicit and correct.
- **Source:** `.zflow/evidence/specweb/seo/meta-robots.md`
- **Verify:** `curl -s https://site/<key-page> | grep -i 'name="robots"'` — no noindex on public pages; `curl -sI` shows no `X-Robots-Tag: noindex`; thank-you/cart/account pages do carry noindex.
- **Severity:** high

### SEO-41 — staging environments carry noindex
- **Requirement:** Staging and preview hosts must serve `noindex` (meta robots tag or site-wide `X-Robots-Tag`).
- **Quote:** - **Staging and preview environments.** Forgetting `noindex` on a `staging.example.com` is a top-five SEO mistake. Once Google indexes a staging URL, it competes with production.
- **Source:** `.zflow/evidence/specweb/seo/meta-robots.md`
- **Verify:** `curl -sI https://staging.site/ | grep -i 'x-robots-tag'` or `curl -s https://staging.site/ | grep -i 'name="robots"'` — noindex present on the staging host.
- **Severity:** high

### SEO-42 — X-Robots-Tag for non-HTML resources
- **Requirement:** Non-HTML resources that must stay out of the index (e.g. PDFs) must be controlled with an `X-Robots-Tag` HTTP header.
- **Quote:** **Use `X-Robots-Tag` for non-HTML.** Cloudflare, Nginx, Apache, and CDN edge config can all set it per-path. Required for PDFs you don't want indexed.
- **Source:** `.zflow/evidence/specweb/seo/meta-robots.md`
- **Verify:** `curl -sI https://site/files/sample.pdf | grep -i 'x-robots-tag'` — header set on non-HTML resources that should not be indexed.
- **Severity:** medium

### SEO-43 — no robots.txt Disallow combined with noindex
- **Requirement:** URLs that need deindexing must not also be `Disallow`ed in robots.txt — crawling must be allowed so crawlers can see the `noindex`.
- **Quote:** **Don't combine `robots.txt: Disallow` with `noindex`.** If a URL is disallowed in robots.txt, crawlers never fetch it — and therefore never see the `noindex`. The page can still be indexed from external links, with no snippet. To truly de-index, allow crawl and serve `noindex`.
- **Source:** `.zflow/evidence/specweb/seo/meta-robots.md`
- **Verify:** Cross-check robots.txt Disallow paths against pages that serve `noindex` (meta robots or X-Robots-Tag) — the two sets must not overlap.
- **Severity:** medium

## Heading hierarchy

### SEO-44 — exactly one h1 per page
- **Requirement:** Each page must have exactly one `<h1>`, matching the page title — not one `<h1>` per section.
- **Quote:** - **One `<h1>` per page.** HTML5 once described a document-outline algorithm in which each nested sectioning element (`<section>`, `<article>`) reset the heading scope, so `<h1>` could be reused everywhere. No browser or screen reader ever implemented it, nesting multiple `<h1>`s that way is now non-conforming, and the browser default that shrank a sectioned `<h1>` was removed from the spec in 2025. Use a single `<h1>` that matches the page title.
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** `curl -s https://site/page | grep -o '<h1[^>]*>' | wc -l` — exactly 1 on every audited page.
- **Severity:** medium

### SEO-45 — no skipped heading levels
- **Requirement:** Heading levels must not skip upward (never `h1 → h3`); decreasing by any amount is allowed.
- **Quote:** - **Do not skip levels.** Go `h1 → h2 → h3`, never `h1 → h3`. Levels can decrease by any amount on the way back up (`h3 → h2` is fine).
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** Run axe or Lighthouse (heading-order rule); or extract the `grep -oE '<h[1-6]'` sequence from the HTML and assert no upward jump greater than +1.
- **Severity:** medium

### SEO-46 — visual headings use real heading tags
- **Requirement:** Text presented visually as a heading must use real `<h1>`–`<h6>` elements — not styled `<div>`, `<span>`, or `<p>`.
- **Quote:** - **Visual headings need real heading tags.** A `<div class="heading">` is invisible to assistive tech. A `<p>` styled to look like an `<h2>` is invisible to search engines.
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** Inspect the DOM/CSS (axe, WAVE, or DevTools) for large-font standalone text not wrapped in an heading element.
- **Severity:** medium

### SEO-47 — headings under 70 characters
- **Requirement:** Heading text should stay under 70 characters.
- **Quote:** - **Keep headings short.** They are anchors, not paragraphs. Aim for under 70 characters.
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** Extract heading text lengths via a DOM parser — each under 70 characters.
- **Severity:** low

### SEO-48 — no empty headings
- **Requirement:** Every heading must have content beneath it — no `<h2>` immediately followed by another heading with nothing between.
- **Quote:** - **No heading without a section under it.** Every heading should have content. An `<h2>` followed immediately by another `<h2>` with nothing between them is a smell.
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** Run axe/Lighthouse (empty-heading flags) or parse the DOM for consecutive heading elements with no intervening content.
- **Severity:** low

### SEO-49 — title and subtitle form one heading
- **Requirement:** A page title and its subtitle must be one heading — the strapline marked up as `<p>` inside `<hgroup>`, not as an extra `<h2>`/`<h3>` level.
- **Quote:** - **A title and its subtitle are one heading, not two.** Marking up a strapline as a second heading (`<h1>` followed by an `<h2>` tagline) adds a phantom level to the outline. Wrap the single `<h1>`–`<h6>` and one or more `<p>` subtitles in `<hgroup>`, which groups them without contributing a heading of its own.
- **Source:** `.zflow/evidence/specweb/seo/heading-hierarchy.md`
- **Verify:** View-source: the `<h1>` is not immediately followed by an `<h2>` used as a tagline; subtitles are `<p>` inside `<hgroup>`.
- **Severity:** low

## Internal linking

### SEO-50 — descriptive anchor text
- **Requirement:** Internal link anchor text must describe the destination — no "click here" or "read more" as the only anchor text.
- **Quote:** - **Use descriptive anchor text.** "XML sitemap spec" is good. "Click here" tells the user and the crawler nothing.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Crawl with Screaming Frog and review the anchor-text report for generic anchors ("click here", "read more", "learn more").
- **Severity:** medium

### SEO-51 — links point at canonical destinations
- **Requirement:** Internal links must point directly at the canonical URL of the destination, not at a redirect.
- **Quote:** - **Link to the canonical URL** of the destination, not a redirect. Every link to a redirect costs a hop.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Sample internal `<a href>` values with `curl -s -o /dev/null -w '%{http_code}' <href>` — destinations return 200, not 301.
- **Severity:** medium

### SEO-52 — no orphan pages
- **Requirement:** Every URL in the sitemap must be reachable from at least one other page through normal navigation, not only from the sitemap.
- **Quote:** - **Avoid orphan pages.** Every URL in the sitemap should be reachable from at least one other page through normal navigation, not just from the sitemap itself.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Crawl the site (Screaming Frog/Sitebulb) and diff the sitemap URL list against pages with ≥ 1 inlink — the orphan-pages report must be empty.
- **Severity:** medium

### SEO-53 — content pages link to related content
- **Requirement:** Each article/content page should link to two to five other relevant pages on the site.
- **Quote:** - **Link to topically related content.** Each article should link to two to five other relevant pages on the site. A page with zero outbound internal links is an orphan from the crawler's perspective even if it links inwards.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** From a crawl export, count contextual internal links per content page (excluding repeated nav/footer) — expect 2–5.
- **Severity:** low

### SEO-54 — link depth within three clicks
- **Requirement:** Pages should be reachable within three clicks of the home page.
- **Quote:** - **Keep link depth shallow.** Pages more than three clicks from the home page get crawled and updated less often.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Screaming Frog crawl-depth column (or equivalent) — flag pages deeper than 3 clicks from `/`.
- **Severity:** low

### SEO-55 — no nofollow on internal links
- **Requirement:** Internal links must not carry `rel="nofollow"` to sculpt ranking signals or save crawl budget.
- **Quote:** - Using `rel="nofollow"` on internal links to "sculpt" ranking signals or save crawl budget. Google treats nofollow as a hint, not an instruction, so nofollowed pages can still be crawled and indexed through your sitemap or other links. It is not a crawl-control lever: to keep your own pages out of the crawl, Google's guidance is a robots.txt `disallow`, not `nofollow`.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** `curl -s https://site/page | grep -c 'rel="nofollow"'` applied to internal links — expect 0.
- **Severity:** low

### SEO-56 — no links to staging or preview hosts
- **Requirement:** Production pages must not contain links to staging or preview URLs.
- **Quote:** - Linking to staging or preview URLs by accident.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Crawl hrefs and run `grep -E 'staging\.|\.dev\.|preview\.|localhost'` over the link export — expect no matches.
- **Severity:** medium

### SEO-57 — no massive footer link blocks
- **Requirement:** The footer must not contain hundreds of links to every page on the site.
- **Quote:** - Hundreds of footer links to every page on the site. Dilutes the signal and clutters screen-reader rotors.
- **Source:** `.zflow/evidence/specweb/seo/internal-linking.md`
- **Verify:** Count `<a>` elements inside `<footer>` from the crawl export — not in the hundreds.
- **Severity:** low

## Structured data (JSON-LD)

### SEO-58 — JSON-LD structured data present
- **Requirement:** Pages must carry schema.org structured data as a JSON-LD `<script type="application/ld+json">` block in the served HTML.
- **Quote:** Structured data is a set of machine-readable statements that describe what a page is about, using the shared vocabulary at [schema.org](https://schema.org/). The recommended serialisation is JSON-LD: a `<script type="application/ld+json">` block inside `<head>` (or, less commonly, `<body>`).
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** `curl -s https://site/page | grep -c 'application/ld+json'` ≥ 1; validate the block in validator.schema.org.
- **Severity:** medium

### SEO-59 — JSON-LD mirrors visible content
- **Requirement:** Facts declared in JSON-LD must be stated visibly on the page — no out-of-sync data.
- **Quote:** - **Mirror what is visible on the page.** Do not declare facts in JSON-LD that the page does not state. Google calls this "out of sync" data and ignores or penalises it.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** Compare JSON-LD fields (price, availability, dates, author) against the rendered page text — every declared fact appears visibly.
- **Severity:** high

### SEO-60 — no fabricated ratings or reviews
- **Requirement:** Pages must not declare `aggregateRating` or `Review` markup that has no visible counterpart on the page.
- **Quote:** - Fabricating `aggregateRating` or `Review` to win stars. Google detects this and removes the rich result, sometimes the whole site's eligibility.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** Where JSON-LD contains `aggregateRating`/`Review`, confirm visible review content (matching count/score) exists on the page.
- **Severity:** high

### SEO-61 — absolute URLs inside JSON-LD
- **Requirement:** URLs used in JSON-LD `@id`, `url`, `image`, and `sameAs` must be absolute.
- **Quote:** - **Use absolute URLs** in `@id`, `url`, `image`, and `sameAs`.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** Parse the JSON-LD block — every `@id`, `url`, `image`, `sameAs` value starts with `http(s)://`.
- **Severity:** low

### SEO-62 — ISO 8601 dates in JSON-LD
- **Requirement:** Dates in JSON-LD must use ISO 8601 format.
- **Quote:** - **Keep dates in ISO 8601.**
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** Parse `datePublished`/`dateModified` values with an ISO 8601 parser (`date -Iseconds` / moment.iso) — all valid.
- **Severity:** low

### SEO-63 — WebSite entity on the home page
- **Requirement:** The home page should declare a site-wide `WebSite` entity including `url` and `name`.
- **Quote:** - **`WebSite`** — site-wide, on the home page. Include `url` and `name`, and `potentialAction` for sitelinks search if appropriate.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** `curl -s https://site/ | grep -o '"@type": *"WebSite"'` — present with `url` and `name` populated.
- **Severity:** low

### SEO-64 — Organization/Person identity with sameAs
- **Requirement:** The publisher should be declared as `Organization` or `Person` with `sameAs` arrays pointing at verified profiles.
- **Quote:** - **`Organization`** or **`Person`** — for the publisher and authors. Include `sameAs` arrays pointing at verified profiles.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** Parse home-page JSON-LD for `@type: Organization`/`Person` and a non-empty `sameAs` array of profile URLs.
- **Severity:** low

### SEO-65 — Article markup on article pages
- **Requirement:** Article/blog pages should declare `Article` or `BlogPosting` with `headline`, `datePublished`, `dateModified`, `author`, and `image`.
- **Quote:** - **`Article`** or **`BlogPosting`** — for articles, with `headline`, `datePublished`, `dateModified`, `author`, `image`.
- **Source:** `.zflow/evidence/specweb/seo/structured-data.md`
- **Verify:** On article URLs, extract JSON-LD `@type: Article`/`BlogPosting` and confirm all five fields; run Google's Rich Results Test.
- **Severity:** medium

## Breadcrumbs

### SEO-66 — breadcrumb trail in labelled nav
- **Requirement:** The visible breadcrumb trail must be wrapped in `<nav aria-label="Breadcrumb">`.
- **Quote:** - **Wrap the trail in `<nav aria-label="Breadcrumb">`.** The label is what screen readers announce. "Breadcrumb" is the conventional value.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** `curl -s https://site/page | grep -c 'nav aria-label="Breadcrumb"'` ≥ 1 on pages with a trail.
- **Severity:** medium

### SEO-67 — breadcrumb uses an ordered list
- **Requirement:** The breadcrumb trail must be an ordered list (`<ol>`) of items.
- **Quote:** - **Use an ordered list (`<ol>`).** Order is part of the meaning.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** `curl -s https://site/page | grep -A3 'aria-label="Breadcrumb"'` — the trail is `<ol><li>…` structure.
- **Severity:** low

### SEO-68 — current page marked and not a link
- **Requirement:** The last breadcrumb item must be the current page marked `aria-current="page"` and must not be a link.
- **Quote:** - **Each item except the last is a link to its level.** The last item is the current page, marked `aria-current="page"`. It should not be a link.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** `curl -s https://site/page | grep 'aria-current="page"'` — present, and its `<li>` contains no `<a>` element.
- **Severity:** medium

### SEO-69 — BreadcrumbList JSON-LD matches visible trail
- **Requirement:** The `BreadcrumbList` JSON-LD must exactly match the visible trail — same items, order, names, and URLs.
- **Quote:** - **Match the visible trail to the JSON-LD exactly.** Same items, same order, same names, same URLs.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** Extract the `BreadcrumbList` itemListElement names/urls and diff against the rendered trail; confirm with Google's Rich Results Test.
- **Severity:** medium

### SEO-70 — separator via CSS, not a literal character
- **Requirement:** Breadcrumb separators must be added with CSS (`::before`), not as literal `›` characters inside the markup.
- **Quote:** - **Use a CSS separator (`::before`), not a literal `›` character in the markup.** Avoids the separator being announced as part of the link.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** `curl -s https://site/page | grep -c '›'` — no literal separator characters inside breadcrumb link text.
- **Severity:** low

### SEO-71 — trail anchored at Home
- **Requirement:** The breadcrumb trail should start at "Home".
- **Quote:** - **Anchor breadcrumbs at "Home".** Some sites omit Home, but including it makes the JSON-LD more useful and matches what Google displays.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** First breadcrumb item (visible and in JSON-LD) is "Home" linking to the site root.
- **Severity:** low

### SEO-72 — trail three to five levels
- **Requirement:** Breadcrumb trails should stay within three to five levels.
- **Quote:** - **Keep them short.** Three to five levels is normal; ten levels suggests the URL structure is too deep.
- **Source:** `.zflow/evidence/specweb/seo/breadcrumbs.md`
- **Verify:** Count trail items per page — 3–5; flag trails approaching 10.
- **Severity:** low

## IndexNow

### SEO-73 — key file hosted at site root
- **Requirement:** The IndexNow key file must be hosted at the site root as `<key>.txt`, served as `text/plain` with the key as its body.
- **Quote:** 2. **Host the key file at the site root.** `https://example.com/<key>.txt`, served as `text/plain`, body equal to the key.
- **Source:** `.zflow/evidence/specweb/seo/indexnow.md`
- **Verify:** `curl -sI https://site/<key>.txt` → 200 `text/plain`; `curl -s https://site/<key>.txt` body equals the key.
- **Severity:** low

### SEO-74 — key file returns 200 directly
- **Requirement:** The IndexNow key file must return 200 directly — not hosted at a wrong path or behind redirects.
- **Quote:** - Hosting the key file at the wrong path or behind redirects. The key file must return 200 directly.
- **Source:** `.zflow/evidence/specweb/seo/indexnow.md`
- **Verify:** `curl -sI https://site/<key>.txt` — status is 200 (not 301/302/404).
- **Severity:** low

### SEO-75 — key format 8–128 allowed characters
- **Requirement:** The IndexNow key must be 8 to 128 characters from `[a-zA-Z0-9-]`.
- **Quote:** 1. **Generate a key.** 8 to 128 characters, `[a-zA-Z0-9-]`. Pick one and reuse it indefinitely.
- **Source:** `.zflow/evidence/specweb/seo/indexnow.md`
- **Verify:** Fetch the key file and validate the body against `^[a-zA-Z0-9-]{8,128}$`.
- **Severity:** low

### SEO-76 — submissions limited to changes, max 10,000 URLs
- **Requirement:** IndexNow submissions must contain at most 10,000 URLs per request and only URLs changed since the last call — not the entire sitemap on every tick.
- **Quote:** 4. **Limit volume.** Up to 10,000 URLs per request. Do not send the entire sitemap on every cron tick — submit only what changed since the last call.
- **Source:** `.zflow/evidence/specweb/seo/indexnow.md`
- **Verify:** Not observable externally without logs; review the integration's submission logs or Bing Webmaster Tools "URL Submission" history for batch sizes and change-only payloads.
- **Severity:** low

### SEO-77 — deletions submitted too
- **Requirement:** URL deletions (404/410 results) must also be submitted to IndexNow so participating engines drop URLs quickly.
- **Quote:** 5. **Send deletions too.** A 404 or 410 should also be submitted; that is how participating engines learn to drop URLs quickly.
- **Source:** `.zflow/evidence/specweb/seo/indexnow.md`
- **Verify:** Not observable externally; confirm 404/410 URLs appear in the IndexNow submission logs / Bing Webmaster Tools URL Submission history.
- **Severity:** low
