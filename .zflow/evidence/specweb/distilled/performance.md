# Performance — distilled audit requirements

Distilled from the performance section of specification.website (26 pages).
Each block: requirement, exact one-line source quote, source path, read-only verification method, severity.

## Requirement 1 — Core Web Vitals field thresholds
- **Requirement:** The site must meet Core Web Vitals field thresholds at the 75th percentile of real users: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.
- **Quote:** "> Core Web Vitals measure loading, responsiveness, and visual stability. Hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile of real users."
- **Source:** .zflow/evidence/specweb/performance/core-web-vitals.md
- **Verify:** Open the site in PageSpeed Insights (https://pagespeed.web.dev) and read the field data section (CrUX, 75th percentile, mobile and desktop), or query the CrUX API for the origin; all three metrics must show "Good".
- **Severity:** high

## Requirement 2 — Keep INP responsive
- **Requirement:** Long JavaScript tasks must be broken up and heavy work kept out of event handlers so interactions stay responsive (INP ≤ 200ms).
- **Quote:** "**INP** — break up long JavaScript tasks, defer non-critical work, and avoid heavy work in event handlers. Inside a long task, `await scheduler.yield()` between chunks so the browser can process input — the continuation runs at boosted priority, so your work finishes before other queued tasks. To schedule new low-priority work, use `scheduler.postTask(fn, {priority: 'background'})` or `requestIdleCallback`. Audit third-party scripts."
- **Source:** .zflow/evidence/specweb/performance/core-web-vitals.md
- **Verify:** In Chrome DevTools → Performance, record clicking primary interactive elements (nav, search, filters, form submit) and check for long tasks >50ms on the main thread and the INP insight; PageSpeed Insights field INP on interaction-heavy pages (forms, search results), not only the homepage.
- **Severity:** medium

## Requirement 3 — Modern image formats
- **Requirement:** Images must be served in a modern format (AVIF preferred, WebP fallback) instead of raw JPEG/PNG.
- **Quote:** "**Use a modern format.** Both AVIF and WebP beat JPEG and PNG by 25–50% at equivalent quality, and AVIF is the smaller of the two. Encode AVIF first: it reached Baseline widely available on 25 July 2026, so it is no longer the risky new format you bolt on behind WebP. The remaining trade-off is time, not support — AVIF encodes far more slowly, which matters for user uploads and large batch jobs, but not for a build step that runs once."
- **Source:** .zflow/evidence/specweb/performance/image-optimization.md
- **Verify:** curl -s -H 'Accept: image/avif,image/webp' -o /dev/null -w '%{content_type}\n' on the hero/major image URLs (expect image/avif or image/webp), or run Lighthouse and confirm the "Serve images in next-gen formats" audit passes.
- **Severity:** high

## Requirement 4 — Responsive image sizes
- **Requirement:** Content images must be served at multiple widths via srcset and sizes so each device downloads an appropriately sized file.
- **Quote:** "**Serve responsive sizes.** Generate the same image at several widths and let `srcset` plus `sizes` pick the right one. A 4000px image in a 400px slot wastes ~99% of the bytes."
- **Source:** .zflow/evidence/specweb/performance/image-optimization.md
- **Verify:** curl -s <page-url> | grep -o '<img[^>]*>' — main content images carry srcset="…" and sizes="…" attributes.
- **Severity:** medium

## Requirement 5 — Explicit image dimensions
- **Requirement:** Every img element must declare explicit width and height attributes so the browser reserves the aspect-ratio slot and avoids CLS.
- **Quote:** "**Always set `width` and `height`.** The browser computes the aspect ratio and reserves the slot, preventing CLS when the image loads."
- **Source:** .zflow/evidence/specweb/performance/image-optimization.md
- **Verify:** curl -s <page-url> | grep -o '<img[^>]*>' — every tag includes width= and height= attributes.
- **Severity:** high

## Requirement 6 — Keep the picture fallback chain
- **Requirement:** Where AVIF is served, the picture/source chain must retain WebP and JPEG fallbacks for older installed browsers.
- **Quote:** "Keep the `<picture>` chain anyway. "Widely available" describes browser versions released over the past two and a half years, not the ones actually installed, and a fallback costs one line:"
- **Source:** .zflow/evidence/specweb/performance/image-optimization.md
- **Verify:** curl -s <page-url> | grep -c 'type="image/avif"' is >0 while a JPEG <img> fallback remains inside the <picture> element.
- **Severity:** low

## Requirement 7 — Image size budget
- **Requirement:** No page should ship images whose transfer size exceeds ~200KB without deliberate optimisation.
- **Quote:** "- DevTools → Network → Img. Sort by size. Anything over 200KB needs a second look."
- **Source:** .zflow/evidence/specweb/performance/image-optimization.md
- **Verify:** For each significant image: curl -sI <image-url> | grep -i content-length — values above ~200000 bytes fail the budget.
- **Severity:** medium

## Requirement 8 — Lazy-load off-screen media
- **Requirement:** Below-the-fold images and embeds must use native loading="lazy".
- **Quote:** "**Default off-screen images to lazy.** Anything below the fold — gallery thumbnails, author avatars, embedded tweets, YouTube embeds — should be `loading="lazy"`."
- **Source:** .zflow/evidence/specweb/performance/lazy-loading.md
- **Verify:** curl -s <page-url> | grep -o '<img[^>]*>' — images after the first screenful carry loading="lazy"; Lighthouse "Offscreen images" audit supports.
- **Severity:** medium

## Requirement 9 — LCP image loads eagerly
- **Requirement:** The LCP/hero image must load eagerly and must never be lazy-loaded.
- **Quote:** "**Keep the LCP image eager.** The hero image, the article lead, the product photo — these must not be lazy-loaded. Browsers honour `loading="lazy"` even when the image is just below the fold on a small viewport, and the LCP cost is significant. When in doubt, use `loading="eager"` (or omit the attribute) for above-the-fold images."
- **Source:** .zflow/evidence/specweb/performance/lazy-loading.md
- **Verify:** Identify the hero/LCP image in view source (curl -s <page-url>) and confirm it lacks loading="lazy"; the Lighthouse audit "Largest Contentful Paint image was lazily loaded" must not fire.
- **Severity:** high

## Requirement 10 — decoding="async" on images
- **Requirement:** Images should carry decoding="async" so decoding happens off the main thread.
- **Quote:** "**Add `decoding="async"` to all images.** It has no downside and helps with main-thread responsiveness."
- **Source:** .zflow/evidence/specweb/performance/lazy-loading.md
- **Verify:** curl -s <page-url> | grep -o '<img[^>]*>' | grep -c 'decoding="async"' — present on the page's images.
- **Severity:** low

## Requirement 11 — Lazy-load third-party iframes
- **Requirement:** Third-party iframes (video and map embeds) must be loading="lazy" by default.
- **Quote:** "**Lazy-load iframes by default.** YouTube and map embeds pull hundreds of kilobytes of JavaScript on every page view. `loading="lazy"` on the iframe defers all of it."
- **Source:** .zflow/evidence/specweb/performance/lazy-loading.md
- **Verify:** curl -s <page-url> | grep -o '<iframe[^>]*>' — each third-party embed iframe carries loading="lazy".
- **Severity:** medium

## Requirement 12 — Lazy-load below-the-fold video
- **Requirement:** Below-the-fold video must combine loading="lazy" with preload="none" (or preload="metadata" when a poster frame is needed).
- **Quote:** "**Lazy-load below-the-fold video.** Combine `loading="lazy"` with `preload="none"` (or `preload="metadata"` if you need the poster frame) so neither the video bytes nor its metadata are fetched until the user reaches it. In older browsers without `loading="lazy"` support, `preload` alone still gives you most of the win."
- **Source:** .zflow/evidence/specweb/performance/lazy-loading.md
- **Verify:** curl -s <page-url> | grep -o '<video[^>]*>' — below-the-fold videos pair loading="lazy" with preload="none" or preload="metadata".
- **Severity:** low

## Requirement 13 — Preload the LCP image
- **Requirement:** The LCP image should be preloaded with fetchpriority="high" when it is not already discovered early in the HTML.
- **Quote:** "**Preload the LCP image.** If your LCP is a hero image, preload it. Combine with `fetchpriority="high"` so it jumps the queue. Do not preload images that already appear early in the HTML — the preload scanner finds them anyway."
- **Source:** .zflow/evidence/specweb/performance/preload-prefetch-preconnect.md
- **Verify:** curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*as="image"[^>]*>' — the LCP image URL is preloaded and carries fetchpriority="high".
- **Severity:** medium

## Requirement 14 — Preload critical fonts with crossorigin
- **Requirement:** Critical above-the-fold fonts should be preloaded as as="font" type="font/woff2" with crossorigin, which is mandatory even for same-origin fonts.
- **Quote:** "**Preload critical fonts — selectively.** Fonts requested from inside CSS are discovered late, so preloading shortens the path: `as="font" type="font/woff2" crossorigin`. The `crossorigin` attribute is mandatory even for same-origin fonts. The preload competes with critical CSS for bandwidth though, so reserve it for fonts that style above-the-fold text, and always pair with `font-display: swap` or `optional` — see [Web font loading](/spec/performance/font-loading/) for the full tradeoff."
- **Source:** .zflow/evidence/specweb/performance/preload-prefetch-preconnect.md
- **Verify:** curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*woff2[^>]*>' — the font preload includes as="font", type="font/woff2" and crossorigin; DevTools Network must not show the font fetched twice.
- **Severity:** medium

## Requirement 15 — Preconnect to third-party origins
- **Requirement:** The head should preconnect to third-party origins the page will definitely request from (CDN, font host, analytics).
- **Quote:** "**Preconnect to third-party origins.** If you load images from a CDN, fonts from Google, or analytics from a third party, preconnect saves the TCP+TLS handshake (~100–300ms). Use `crossorigin` for resources fetched with CORS (fonts, fetch, modules)."
- **Source:** .zflow/evidence/specweb/performance/preload-prefetch-preconnect.md
- **Verify:** curl -s <page-url> | grep -o '<link[^>]*rel="preconnect"[^>]*>' and cross-check each hinted origin against resources the page actually loads (DevTools Network); Lighthouse "Preconnect to required origins" audit.
- **Severity:** medium

## Requirement 16 — Pair dns-prefetch with preconnect
- **Requirement:** preconnect should be paired with a dns-prefetch fallback for older browsers and proxies.
- **Quote:** "**Use dns-prefetch as a fallback.** Older browsers and proxies sometimes ignore preconnect. Pair it with dns-prefetch:"
- **Source:** .zflow/evidence/specweb/performance/preload-prefetch-preconnect.md
- **Verify:** curl -s <page-url> | grep -c 'rel="dns-prefetch"' — dns-prefetch hints appear alongside preconnect for key third-party origins.
- **Severity:** low

## Requirement 17 — Prefetch the next likely page
- **Requirement:** The next likely navigation should be prefetched at low priority (link rel="prefetch" or Speculation Rules).
- **Quote:** "**Prefetch the next likely page.** On a landing page, prefetch the obvious next step. The fetch happens at low priority and won't interfere with the current page."
- **Source:** .zflow/evidence/specweb/performance/preload-prefetch-preconnect.md
- **Verify:** curl -s <page-url> | grep -oE 'rel="prefetch"|type="speculationrules"' — the obvious next step (next article, first search result, main CTA target) is prefetched.
- **Severity:** low

## Requirement 18 — Repeat Early Hints Link headers on the final response
- **Requirement:** When 103 Early Hints is used, the same Link headers must be repeated on the final 200 response.
- **Quote:** "- Repeat the same `Link` headers on the final response, so clients that ignore `103` still get the hint."
- **Source:** .zflow/evidence/specweb/performance/early-hints.md
- **Verify:** curl -sI <page-url> | grep -i '^link:' — the final 200 response itself carries the rel=preload/preconnect Link headers.
- **Severity:** low

## Requirement 19 — 103 only over HTTP/2 or later
- **Requirement:** 103 Early Hints must only be sent over HTTP/2 or later.
- **Quote:** "- Only send `103` over **HTTP/2 or later**. Some HTTP/1.1 intermediaries mishandle informational responses, so most clients act on Early Hints only over [HTTP/2 or HTTP/3](/spec/performance/http3/)."
- **Source:** .zflow/evidence/specweb/performance/early-hints.md
- **Verify:** curl -sI --http1.1 <page-url> must show no 103 block; 103 may only appear with curl -sI --http2 <page-url>.
- **Severity:** low

## Requirement 20 — Fingerprinted assets cached immutably
- **Requirement:** Fingerprinted (content-hashed) assets must be served with Cache-Control: public, max-age=31536000, immutable.
- **Quote:** "Cache-Control: public, max-age=31536000, immutable"
- **Source:** .zflow/evidence/specweb/performance/cache-control.md
- **Verify:** curl -sI <hashed-asset-url> (e.g. https://example.com/app.4f3a2b.js) | grep -i cache-control — includes public, max-age=31536000 and immutable.
- **Severity:** high

## Requirement 21 — HTML uses short or no caching
- **Requirement:** HTML responses must use short or no caching (e.g. public, max-age=0, must-revalidate), never a long max-age.
- **Quote:** "Cache-Control: public, max-age=0, must-revalidate"
- **Source:** .zflow/evidence/specweb/performance/cache-control.md
- **Verify:** curl -sI <page-url> | grep -i cache-control — HTML shows max-age=0, must-revalidate (or no-store for highly dynamic pages), never max-age=31536000.
- **Severity:** high

## Requirement 22 — Personalised responses are private
- **Requirement:** Personalised responses must be marked Cache-Control: private so shared caches cannot leak one user's data to another.
- **Quote:** "**Per-user content — private.** Anything personalised needs `private` to prevent shared caches from leaking one user's data to another."
- **Source:** .zflow/evidence/specweb/performance/cache-control.md
- **Verify:** curl -sI with a session cookie against a personalised endpoint — Cache-Control includes private; publicly cacheable responses contain no per-user data.
- **Severity:** high

## Requirement 23 — stale-if-error for resilience
- **Requirement:** Short-lived cacheable responses (pages, feeds, sitemaps, JSON endpoints) should carry stale-if-error so origin failures serve stale-but-working pages.
- **Quote:** "**Survive origin failures — `stale-if-error`.** Defined in RFC 5861, this directive tells shared caches and browsers to keep serving the last good copy when a revalidation request fails — a 5xx from the origin, a timeout, or a connection error. It turns a backend outage into stale-but-working pages instead of error pages:"
- **Source:** .zflow/evidence/specweb/performance/cache-control.md
- **Verify:** curl -sI <sitemap-or-feed-url> | grep -i cache-control — the responses relied on include stale-if-error=<seconds>.
- **Severity:** medium

## Requirement 24 — Never combine stale-if-error with must-revalidate
- **Requirement:** A response must not combine stale-if-error with must-revalidate, since must-revalidate forbids serving stale.
- **Quote:** "Note that `stale-if-error` is overridden by `must-revalidate` (RFC 9111 forbids serving stale once a `must-revalidate` response is stale), so don't combine the two on the same response."
- **Source:** .zflow/evidence/specweb/performance/cache-control.md
- **Verify:** curl -sI <url> | grep -i cache-control — must not contain both stale-if-error and must-revalidate on the same response.
- **Severity:** low

## Requirement 25 — Vary lists exactly what was branched on
- **Requirement:** Vary must list exactly the request headers the server branched on when choosing the representation — no more, no less.
- **Quote:** "**List exactly what you branched on — no more, no less.** If the server chose this body by reading `Accept-Encoding`, list `Accept-Encoding`. If it did not read `Accept-Language`, do not list it because the site happens to be translated."
- **Source:** .zflow/evidence/specweb/performance/vary.md
- **Verify:** curl -sI -H 'Accept-Encoding: br' <url> and again without the header — where the body differs by encoding, Vary includes Accept-Encoding; fields the server ignores must not be listed.
- **Severity:** medium

## Requirement 26 — Vary on every representation including the default
- **Requirement:** Every representation of a negotiated resource, including the default one, must carry the Vary header.
- **Quote:** "**Set it on every representation, including the default.** A cache that stored the HTML response *without* `Vary: Accept` will happily reuse it for a request that asked for Markdown. Both branches of a negotiation need the header, not just the interesting one."
- **Source:** .zflow/evidence/specweb/performance/vary.md
- **Verify:** curl -sI -H 'Accept: text/markdown' <page-url> and curl -sI <page-url> — both responses carry the same Vary header.
- **Severity:** medium

## Requirement 27 — No Vary: Cookie on public pages
- **Requirement:** Vary: Cookie on an otherwise public page signals leaked personalisation and must be fixed by marking the response private or moving the personal fragment client-side.
- **Quote:** "**Treat `Vary: Cookie` on a public page as a bug report.** It nearly always means personalisation has leaked into a document that should have been cacheable. Either mark the response `private`, or move the personal fragment to a separate client-side request and keep the page shared."
- **Source:** .zflow/evidence/specweb/performance/vary.md
- **Verify:** curl -sI <public-page-url> | grep -i '^vary' — Cookie must not be listed on a page intended to be publicly cacheable.
- **Severity:** medium

## Requirement 28 — Avoid Vary: User-Agent
- **Requirement:** Vary: User-Agent must not be used on responsive sites because it fragments the cache.
- **Quote:** "**Avoid `Vary: User-Agent`.** The one context where it is conventionally sanctioned is serving separate mobile markup from a single URL, and it costs you most of your shared caching to do it. Responsive markup removes the need entirely."
- **Source:** .zflow/evidence/specweb/performance/vary.md
- **Verify:** curl -sI <page-url> | grep -i '^vary' — User-Agent must not appear on a responsive site.
- **Severity:** medium

## Requirement 29 — Justify Vary fields beyond two
- **Requirement:** Vary values listing more than two fields must each trace to a branch that genuinely exists in server code.
- **Quote:** "- Scan your responses for `Vary` values listing more than two fields. Each one should trace to a branch that genuinely exists in the server code."
- **Source:** .zflow/evidence/specweb/performance/vary.md
- **Verify:** curl -sI across the site's key URLs and count the comma-separated fields in Vary — more than two fields is a flag to investigate.
- **Severity:** low

## Requirement 30 — Validator on every cacheable response
- **Requirement:** Every cacheable response must carry a validator — an ETag or Last-Modified.
- **Quote:** "> Send a validator — ETag or Last-Modified — on every cacheable response, and honour If-None-Match / If-Modified-Since so unchanged resources return an empty 304 instead of the full body."
- **Source:** .zflow/evidence/specweb/performance/conditional-requests.md
- **Verify:** curl -sI <cacheable-url> | grep -iE '^(etag|last-modified)' — at least one validator is present.
- **Severity:** medium

## Requirement 31 — Conditional GET returns 304
- **Requirement:** A re-request carrying the current validator must return 304 Not Modified with an empty body for unchanged resources.
- **Quote:** "- Re-request with it: `curl -s -o /dev/null -w "%{http_code}" -H 'If-None-Match: "…"' https://example.com/asset.js` — expect `304`."
- **Source:** .zflow/evidence/specweb/performance/conditional-requests.md
- **Verify:** V=$(curl -sI <url> | grep -i '^etag' | tr -d '\r' | sed 's/^[Ee][Tt][Aa][Gg]: //'); then curl -s -o /dev/null -w '%{http_code}\n' -H "If-None-Match: $V" <url> — must print 304.
- **Severity:** medium

## Requirement 32 — Weak ETags for negotiated content
- **Requirement:** Content-negotiated responses (gzip vs brotli variants) should use weak ETags (W/"…").
- **Quote:** "- **Use weak ETags (`W/"…"`) for negotiated content.** A weak validator means "semantically equivalent", which is correct when the same URL is served gzip to one client and brotli to another. Pair with a correct `Vary` so caches do not cross the wires — see [compression](/spec/performance/compression/)."
- **Source:** .zflow/evidence/specweb/performance/conditional-requests.md
- **Verify:** curl -sI -H 'Accept-Encoding: gzip' <url> and curl -sI -H 'Accept-Encoding: br' <url> — ETags on the negotiated representations begin with W/".
- **Severity:** low

## Requirement 33 — Stable validators
- **Requirement:** Validators must be stable across identical response bytes and must not be regenerated per request.
- **Quote:** "- **Keep the validator stable across identical bytes.** It must not change on every request (e.g. derived from a timestamp), or revalidation never short-circuits."
- **Source:** .zflow/evidence/specweb/performance/conditional-requests.md
- **Verify:** Two sequential curl -sI requests seconds apart to an unchanged URL — the ETag value is identical both times.
- **Severity:** low

## Requirement 34 — No-Vary-Search for tracking parameters
- **Requirement:** Pages should send No-Vary-Search listing the tracking parameters they receive (utm_*, gclid, fbclid, msclkid, …) so cache and prefetch hits survive campaign URLs.
- **Quote:** "- **List the tracking parameters you actually receive.** UTMs are the universal set. Add `gclid`, `fbclid`, `msclkid`, `mc_cid`, `mc_eid`, and anything else your analytics pipeline adds and your application logic does not consume."
- **Source:** .zflow/evidence/specweb/performance/no-vary-search.md
- **Verify:** curl -sI <page-url> | grep -i '^no-vary-search' — the header lists the tracking parameters the site receives.
- **Severity:** medium

## Requirement 35 — No-Vary-Search includes key-order
- **Requirement:** No-Vary-Search should include the key-order token unless parameter order matters.
- **Quote:** "- **Add `key-order` unless ordering matters.** It almost never does for query strings, and it catches the common case where the same parameters arrive in different orders."
- **Source:** .zflow/evidence/specweb/performance/no-vary-search.md
- **Verify:** curl -sI <page-url> | grep -i '^no-vary-search' — the value includes the key-order token.
- **Severity:** low

## Requirement 36 — No-Vary-Search must not list response-changing parameters
- **Requirement:** No-Vary-Search must not list parameters that change the response (page, sort), or different pages collapse into one cache entry.
- **Quote:** "- Listing a parameter that does change the response. Adding `page` or `sort` to `params=` collapses different pages into one cached entry. Use `except=` to be safe when in doubt."
- **Source:** .zflow/evidence/specweb/performance/no-vary-search.md
- **Verify:** Read the No-Vary-Search value from curl -sI <page-url> — parameters such as page, sort, or q must not appear inside params=(…).
- **Severity:** low

## Requirement 37 — Brotli preferred, gzip fallback
- **Requirement:** Text responses must be compressed — brotli where the client supports it, gzip everywhere else.
- **Quote:** "> Compress text responses with brotli where supported, gzip everywhere else. zstd is emerging. Don't compress already-compressed media."
- **Source:** .zflow/evidence/specweb/performance/compression.md
- **Verify:** curl -sI -H 'Accept-Encoding: br, gzip' <text-url> | grep -i content-encoding — br (or gzip) is returned; identity/absent fails. Lighthouse "Enable text compression" audit.
- **Severity:** high

## Requirement 38 — Compress all text types
- **Requirement:** All text response types — HTML, CSS, JS, JSON, SVG, XML, plain text — must be compressed.
- **Quote:** "**Compress all text.** HTML, CSS, JS, JSON, SVG, XML, plain text, and most fonts (WOFF2 is already compressed; WOFF is not)."
- **Source:** .zflow/evidence/specweb/performance/compression.md
- **Verify:** For each text type (document, CSS file, JS file, JSON endpoint, SVG): curl -sI -H 'Accept-Encoding: br, gzip' <url> | grep -i content-encoding returns an encoding.
- **Severity:** medium

## Requirement 39 — Vary: Accept-Encoding on compressed responses
- **Requirement:** Compressed responses must set Vary: Accept-Encoding so caches keep entries per encoding.
- **Quote:** "**Set [`Vary: Accept-Encoding`](/spec/performance/vary/).** Tells CDNs to keep a separate cache entry per encoding. Without it, gzip clients may receive a brotli body they can't decode."
- **Source:** .zflow/evidence/specweb/performance/compression.md
- **Verify:** curl -sI -H 'Accept-Encoding: br' <url> | grep -i '^vary' — includes Accept-Encoding whenever Content-Encoding is set; verify what leaves the edge, not just the origin.
- **Severity:** medium

## Requirement 40 — No double compression of media
- **Requirement:** Already-compressed media (JPEG, PNG, WebP, AVIF, video, WOFF2, zip) must not be re-compressed.
- **Quote:** "**Don't double-compress.** Images (JPEG, PNG, WebP, AVIF), video, fonts (WOFF2), and zip files are already compressed. Re-encoding wastes CPU and often grows the file."
- **Source:** .zflow/evidence/specweb/performance/compression.md
- **Verify:** curl -sI <image-or-woff2-url> | grep -i content-encoding — empty for image, video, and WOFF2 responses.
- **Severity:** low

## Requirement 41 — Never use deflate
- **Requirement:** Content-Encoding: deflate must never be used.
- **Quote:** "- **deflate** — avoid. Ambiguity between raw deflate and zlib wrapping has bitten implementations for decades."
- **Source:** .zflow/evidence/specweb/performance/compression.md
- **Verify:** curl -sI -H 'Accept-Encoding: gzip, deflate, br' <url> | grep -i content-encoding — the negotiated encoding is never deflate.
- **Severity:** low

## Requirement 42 — Self-host fonts
- **Requirement:** Web fonts must be self-hosted from the site's own origin rather than loaded from third-party font services.
- **Quote:** "**Self-host.** Third-party font services add a DNS lookup, TLS handshake, and a second domain to track. Download the WOFF2 files and serve them from your origin."
- **Source:** .zflow/evidence/specweb/performance/font-loading.md
- **Verify:** curl -s <page-url> | grep -oE 'fonts\.(googleapis|gstatic)\.com|use\.typekit\.(com|net)|cdn\.fonts\.net' — no third-party font origins; font requests go to the site's own origin.
- **Severity:** medium

## Requirement 43 — WOFF2 only
- **Requirement:** Fonts must be served as WOFF2 only.
- **Quote:** "**Use WOFF2 only.** All modern browsers support it. WOFF2 is pre-compressed (do not gzip), 30% smaller than WOFF, and 50% smaller than TTF."
- **Source:** .zflow/evidence/specweb/performance/font-loading.md
- **Verify:** DevTools → Network filtered to Font (or inspect CSS @font-face src): all font requests are .woff2 / Content-Type font/woff2; no .woff, .ttf, or .otf.
- **Severity:** low

## Requirement 44 — font-display set on every face
- **Requirement:** Every @font-face must set font-display: swap or optional — never block (or default auto), which causes invisible text.
- **Quote:** "**Set `font-display`.** `swap` shows the fallback immediately and swaps when the custom font arrives. `optional` is stricter: if the font isn't cached and ready within ~100ms, the fallback is used permanently — best for CLS. Avoid `block`, which causes FOIT."
- **Source:** .zflow/evidence/specweb/performance/font-loading.md
- **Verify:** curl -s <css-url> | grep -A8 '@font-face' | grep font-display — every face declares swap or optional; Lighthouse "Ensure text remains visible during webfont load" passes.
- **Severity:** medium

## Requirement 45 — Subset fonts
- **Requirement:** Fonts must be subset to the scripts the site actually uses.
- **Quote:** "**Subset to what you use.** Google Fonts' default Latin subset covers most English-language sites. If your content is English only, drop Cyrillic, Greek, and Vietnamese subsets — that can halve the file. Tools: `pyftsubset`, `glyphhanger`, `subfont`."
- **Source:** .zflow/evidence/specweb/performance/font-loading.md
- **Verify:** DevTools → Network font transfer sizes — a Latin text face ships tens of KB in WOFF2, not a 100KB+ multi-script file.
- **Severity:** low

## Requirement 46 — Fallback font metric overrides
- **Requirement:** The fallback @font-face should declare size-adjust, ascent-override, and descent-override so the font swap does not reflow the layout.
- **Quote:** "**Match metrics to reduce shift.** Use `size-adjust`, `ascent-override`, and `descent-override` on the fallback `@font-face` so the swap doesn't reflow the layout."
- **Source:** .zflow/evidence/specweb/performance/font-loading.md
- **Verify:** curl -s <css-url> | grep -E 'size-adjust|ascent-override|descent-override' — present on the fallback @font-face declarations.
- **Severity:** low

## Requirement 47 — Inline critical CSS under ~14KB
- **Requirement:** The CSS needed for above-the-fold content must be inlined in a style tag in head and kept under ~14KB.
- **Quote:** "**Inline in `<head>`.** Keep the inlined CSS under ~14KB (one TCP slow-start window) so it fits in the first packet."
- **Source:** .zflow/evidence/specweb/performance/critical-css.md
- **Verify:** curl -s <page-url> and measure the inline <style> block in <head> (≈14KB or less); Lighthouse "Render-blocking requests" insight shows no blocking stylesheet for first paint.
- **Severity:** medium

## Requirement 48 — Non-critical CSS loaded asynchronously
- **Requirement:** Non-critical CSS must be loaded asynchronously via the preload + onload pattern with a noscript stylesheet fallback.
- **Quote:** "**Load the rest asynchronously.** The `preload` + `onload` swap shown above is the standard pattern. A `<noscript>` fallback covers browsers with JavaScript disabled."
- **Source:** .zflow/evidence/specweb/performance/critical-css.md
- **Verify:** View source (curl -s <page-url>): non-critical stylesheet uses <link rel="preload" as="style" onload="this.rel='stylesheet'"> plus <noscript><link rel="stylesheet" href="/site.css"></noscript>.
- **Severity:** medium

## Requirement 49 — No third-party render-blocking CSS
- **Requirement:** No third-party stylesheet (font provider, chat widget, analytics dashboard) may sit render-blocking in head.
- **Quote:** "**Don't block on third-party CSS.** Webfont providers, analytics dashboards, and chat widgets that drop a stylesheet in `<head>` add an unknown origin to your critical path. Self-host or load asynchronously."
- **Source:** .zflow/evidence/specweb/performance/critical-css.md
- **Verify:** curl -s <page-url> | grep -o '<link[^>]*rel="stylesheet"[^>]*>' — no third-party-origin stylesheets load render-blocking in head.
- **Severity:** medium

## Requirement 50 — No bare blocking scripts
- **Requirement:** Every external script must carry defer, async, or type="module"; a bare <script src> in head is always wrong.
- **Quote:** "> Choose the right script-loading attribute for every <script>: defer for app code, async for independent third-party, type=module for modern code. Bare <script> in <head> is always wrong."
- **Source:** .zflow/evidence/specweb/performance/script-loading.md
- **Verify:** curl -s <page-url> | grep -oE '<script[^>]*\bsrc=[^>]*>' — every external script tag carries defer, async, or type="module"; Lighthouse "Render-blocking requests" lists zero scripts.
- **Severity:** high

## Requirement 51 — Third-party async scripts carry SRI
- **Requirement:** Independent third-party scripts loaded with async must also carry Subresource Integrity (integrity) and crossorigin="anonymous".
- **Quote:** "**Use `async` for independent third-party.** Analytics, A/B tooling, chat widgets — anything that doesn't depend on your code or DOM order. Always pair with [Subresource Integrity](/spec/security/subresource-integrity/) and `crossorigin="anonymous"` so a compromised CDN cannot ship modified code to your visitors:"
- **Source:** .zflow/evidence/specweb/performance/script-loading.md
- **Verify:** curl -s <page-url> | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>' — third-party scripts include integrity="sha384-…" and crossorigin="anonymous".
- **Severity:** medium

## Requirement 52 — modulepreload for critical module dependencies
- **Requirement:** Critical ES module dependencies discovered via import should be preloaded with link rel="modulepreload".
- **Quote:** "**Preload module dependencies.** Modules fetched via `import` are discovered lazily — preload them so the browser starts fetching during initial parse:"
- **Source:** .zflow/evidence/specweb/performance/script-loading.md
- **Verify:** curl -s <page-url> | grep 'rel="modulepreload"' — critical imported modules (router, store) are preloaded ahead of the module entry point.
- **Severity:** low

## Requirement 53 — Drop the nomodule shim
- **Requirement:** The legacy nomodule fallback bundle should be dropped.
- **Quote:** "**Drop the legacy `nomodule` shim.** Every shipping browser in 2026 supports `type="module"`. The `nomodule` fallback was useful in 2018; it now ships a second bundle for users who don't exist."
- **Source:** .zflow/evidence/specweb/performance/script-loading.md
- **Verify:** curl -s <page-url> | grep -c 'nomodule' — expect 0 (no second legacy bundle shipped).
- **Severity:** low

## Requirement 54 — Serve over HTTP/2 at minimum
- **Requirement:** The site must be served over HTTP/2 at minimum, HTTP/3 where possible.
- **Quote:** "> Serve over HTTP/2 at minimum and HTTP/3 where you can. Multiplexing eliminates head-of-line blocking; QUIC removes TCP handshake delays."
- **Source:** .zflow/evidence/specweb/performance/http3.md
- **Verify:** curl -sI -o /dev/null -w '%{http_version}\n' <page-url> — prints 2 or 3, never 1.1.
- **Severity:** medium

## Requirement 55 — One origin for static assets
- **Requirement:** Static assets should be served from a single origin; domain sharding must be dropped.
- **Quote:** "**Keep one origin.** HTTP/2 and HTTP/3 reward consolidation. Splitting assets across `cdn1`, `cdn2`, `assets.` forces new connections; on a single origin everything reuses the same one."
- **Source:** .zflow/evidence/specweb/performance/http3.md
- **Verify:** curl -s <page-url> | grep -oE 'https?://[A-Za-z0-9.-]+' | sort -u — one primary asset origin; no cdn1/cdn2/assets shard hostnames.
- **Severity:** medium

## Requirement 56 — Advertise HTTP/3 via Alt-Svc
- **Requirement:** When HTTP/3 is enabled, the Alt-Svc header must be advertised so browsers upgrade.
- **Quote:** "**Verify `Alt-Svc`.** If you've enabled HTTP/3 but `Alt-Svc` isn't set, browsers will never upgrade. Most edge providers add it automatically."
- **Source:** .zflow/evidence/specweb/performance/http3.md
- **Verify:** curl -sI <page-url> | grep -i 'alt-svc' — advertises h3=":443"; corroborate reachability with curl --http3 -I <page-url> or an HTTP/3 probe site (http3check.net).
- **Severity:** low

## Requirement 57 — Drop image sprites
- **Requirement:** Image sprite sheets must be dropped in favour of individual images or inline SVG.
- **Quote:** "- **Sprites** force every page to download every icon, including ones it never shows, and bust the whole sheet when one icon changes. Individual images, inline SVG, or an icon font are smaller and cache better."
- **Source:** .zflow/evidence/specweb/performance/http1-workarounds.md
- **Verify:** Inventory the page's assets (curl the HTML and CSS): no single large sprite.png/icons.png sliced via background-position; icons are inline SVG or individual images.
- **Severity:** low

## Requirement 58 — Few, well-sized JS bundles
- **Requirement:** JS should ship as a small number of bundles — neither one monolith nor a swarm of tiny modules.
- **Quote:** "- Check that critical CSS is inline in the HTML and that JS ships as a small number of bundles, not one monolith and not a swarm of modules."
- **Source:** .zflow/evidence/specweb/performance/http1-workarounds.md
- **Verify:** DevTools → Network JS filter (or count script srcs in the HTML): a handful of bundles, not one giant file or hundreds of tiny module requests.
- **Severity:** low

## Requirement 59 — Speculation Rules with moderate eagerness
- **Requirement:** Same-origin navigations should be accelerated with a script type="speculationrules" block using moderate (or conservative) eagerness, never eager on every link.
- **Quote:** "`eagerness` ranges from `conservative` (only on hover/touch) to `eager` (as soon as the rule is parsed). `moderate` is the sensible default — Chromium triggers on hover-with-intent and pointerdown."
- **Source:** .zflow/evidence/specweb/performance/speculation-rules.md
- **Verify:** curl -s <page-url> | grep -A6 'speculationrules' — a rules block exists and eagerness is moderate or conservative; Chrome DevTools → Application → Speculative loads shows the rules matching.
- **Severity:** medium

## Requirement 60 — Never speculate on side-effect URLs
- **Requirement:** Prefetch/prerender rules must exclude URLs with side effects such as logout, delete, and payment flows.
- **Quote:** "**Don't speculate on URLs with side effects.** Logout endpoints, "delete" actions, payment flows. Use `urls`/`href_matches` carefully and exclude them."
- **Source:** .zflow/evidence/specweb/performance/speculation-rules.md
- **Verify:** Read the speculationrules JSON in view source — logout/delete/payment endpoints are not matched by any prefetch or prerender rule.
- **Severity:** medium

## Requirement 61 — Analytics wait for prerenderingchange
- **Requirement:** Analytics and other user-visible work on prerendered pages must wait for the prerenderingchange event instead of firing on script load.
- **Quote:** "**Handle JavaScript correctly.** Prerendered pages run their JS in a hidden, non-active context. Wait for the [`prerenderingchange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerenderingchange_event) event before running analytics, starting media, or anything user-visible:"
- **Source:** .zflow/evidence/specweb/performance/speculation-rules.md
- **Verify:** View source / delivered JS: analytics init is guarded by a document.prerendering check with a prerenderingchange listener, not executed on script load.
- **Severity:** low

## Requirement 62 — Prerender targets must not be no-store
- **Requirement:** Pages targeted by prerender rules must not send Cache-Control: no-store, which browsers refuse to prerender.
- **Quote:** "- Conflicting `Cache-Control: no-store` headers on the target page. Browsers refuse to prerender no-store responses by design."
- **Source:** .zflow/evidence/specweb/performance/speculation-rules.md
- **Verify:** curl -sI <prerender-target-url> | grep -i cache-control — no no-store on pages matched by prerender rules.
- **Severity:** low

## Requirement 63 — At most ~5 resource hints in head
- **Requirement:** The head should contain at most about five resource hints, since each competes for bandwidth.
- **Quote:** "- More than ~5 hints in the head. Each one competes for bandwidth."
- **Source:** .zflow/evidence/specweb/performance/resource-hints.md
- **Verify:** curl -s <page-url> | grep -coE 'rel="(preload|prefetch|preconnect|modulepreload|dns-prefetch)"' — count is ~5 or fewer.
- **Severity:** medium

## Requirement 64 — No redundant preloads
- **Requirement:** Resources already referenced early in the head must not also be preloaded — the preload scanner finds them and the hint is noise.
- **Quote:** "- Preloading the same resource that is already referenced by a `<link rel="stylesheet">` higher in the head. The preload scanner finds it; the hint is noise."
- **Source:** .zflow/evidence/specweb/performance/resource-hints.md
- **Verify:** Load the page in Chrome and watch the console for "<link rel=preload> was preloaded using link preload but not used within a few seconds"; compare preload hrefs against stylesheets already early in head.
- **Severity:** low

## Requirement 65 — Cross-document view transitions opt-in
- **Requirement:** Cross-document navigations should opt into the shared transition via the @view-transition { navigation: auto } CSS rule on both pages.
- **Quote:** "When the user navigates from page A to page B and both pages have this rule, the browser captures A, replaces it with B, and cross-fades. No JavaScript required."
- **Source:** .zflow/evidence/specweb/performance/view-transitions.md
- **Verify:** curl -s <main-css-url> | grep -A2 '@view-transition' — declares navigation: auto; navigate between two site pages in Chrome and observe the cross-fade.
- **Severity:** low

## Requirement 66 — View transitions respect reduced motion
- **Requirement:** View transitions must honour prefers-reduced-motion by disabling the animation.
- **Quote:** "- Ignoring `prefers-reduced-motion`. People with vestibular disorders should not be motion-tested for a route change."
- **Source:** .zflow/evidence/specweb/performance/view-transitions.md
- **Verify:** curl -s <css-url> | grep -B3 -A6 'prefers-reduced-motion' — view-transition pseudo-elements get animation: none; DevTools → Rendering → emulate prefers-reduced-motion and confirm the transition disappears entirely.
- **Severity:** medium

## Requirement 67 — View transitions stay 150–250ms
- **Requirement:** View transition durations should be kept between 150ms and 250ms.
- **Quote:** "**Keep transitions short** — 150–250ms. Longer feels sluggish; shorter feels like a flash."
- **Source:** .zflow/evidence/specweb/performance/view-transitions.md
- **Verify:** DevTools → Animations panel records the view transition timing — duration falls in the 150–250ms range.
- **Severity:** low

## Requirement 68 — No unload listeners (BFCache)
- **Requirement:** The page must not register unload listeners, the single most common BFCache disqualifier.
- **Quote:** "**Never listen for `unload`.** This is the single most common disqualifier. Use `pagehide` for cleanup and `visibilitychange` for "user left the tab" semantics. Both fire reliably and neither blocks BFCache."
- **Source:** .zflow/evidence/specweb/performance/bfcache.md
- **Verify:** curl -s <page-url> | grep -cE "addEventListener\(['"]unload" — expect 0; Lighthouse "Page prevented back/forward cache restoration" audit passes, and DevTools → Application → Back/forward cache test lists no unload-related disqualifier.
- **Severity:** medium

## Requirement 69 — No Cache-Control: no-store on HTML (BFCache)
- **Requirement:** HTML must not be served with Cache-Control: no-store, which all major browsers refuse to restore from BFCache.
- **Quote:** "**Do not set `Cache-Control: no-store` on HTML.** All major browsers refuse to cache `no-store` responses for BFCache. `no-cache` is fine — it forces revalidation on a real navigation, but the page is still eligible to be restored from memory on back/forward. See [Cache-Control](/spec/performance/cache-control/)."
- **Source:** .zflow/evidence/specweb/performance/bfcache.md
- **Verify:** curl -sI <page-url> | grep -i cache-control — HTML is not no-store; manual back-navigation smoke test shows no network request for the page.
- **Severity:** medium

## Requirement 70 — Handle BFCache restore
- **Requirement:** A pageshow handler must re-sync analytics and stale UI when the page is restored from BFCache (event.persisted === true).
- **Quote:** "**Handle the restore.** The `pageshow` event fires with `event.persisted === true` when the page comes back from BFCache. Treat it as "I was frozen — re-sync":"
- **Source:** .zflow/evidence/specweb/performance/bfcache.md
- **Verify:** View source / delivered JS: a pageshow listener checks event.persisted and re-fires analytics or refreshes state on restore.
- **Severity:** low

## Requirement 71 — content-visibility with contain-intrinsic-size
- **Requirement:** Long, repeating page sections should use content-visibility: auto paired with contain-intrinsic-size so off-screen rendering work is skipped without scrollbar jank.
- **Quote:** "**`content-visibility` on long, repeating sections.** Always pair it with `contain-intrinsic-size` so the browser can reserve layout space for the skipped subtree:"
- **Source:** .zflow/evidence/specweb/performance/visibility-aware-rendering.md
- **Verify:** curl -s <css-url> | grep -B2 -A2 'content-visibility' — long sections declare content-visibility: auto and a matching contain-intrinsic-size value.
- **Severity:** low

## Requirement 72 — Intersection Observer over scroll listeners
- **Requirement:** Lazy and visibility-driven behaviour must use Intersection Observer (or native loading="lazy"), not hand-rolled scroll and resize listeners.
- **Quote:** "**Intersection Observer** is a Web API that fires a callback when an element crosses a configurable threshold relative to the viewport (or another scroll root). It replaces hand-rolled `scroll` and `resize` listeners that ran on every frame."
- **Source:** .zflow/evidence/specweb/performance/visibility-aware-rendering.md
- **Verify:** Search the delivered JS for addEventListener('scroll' and addEventListener('resize' driving lazy/reveal logic — each hit is a candidate that should be an IntersectionObserver or loading="lazy".
- **Severity:** low

## Requirement 73 — contain: content on self-enclosed components
- **Requirement:** Self-enclosed components (cards, sidebar widgets, feed items) should declare contain: content so reflow and repaint stay isolated.
- **Quote:** "Apply `contain: content` to self-enclosed components — cards, sidebars, widgets, repeated list items — where children stay within the box and have predictable sizing:"
- **Source:** .zflow/evidence/specweb/performance/css-containment.md
- **Verify:** curl -s <css-url> | grep 'contain:' — repeated component selectors declare contain: content (or layout paint style).
- **Severity:** low

## Requirement 74 — Scroll-driven animations in CSS
- **Requirement:** Scroll-linked effects should be implemented as CSS scroll-driven animations (animation-timeline with scroll()/view()) rather than JS scroll-listener libraries.
- **Quote:** "> Drive CSS animations from scroll position or element visibility with `scroll-timeline` and `view-timeline`, replacing JS scroll-listener libraries with compositor-thread animation."
- **Source:** .zflow/evidence/specweb/performance/scroll-driven-animations.md
- **Verify:** Where scroll effects exist, inspect the delivered CSS for animation-timeline: scroll()/view() and confirm no JS scroll-listener library (rAF + scroll pattern) is doing the same job.
- **Severity:** low

## Requirement 75 — Animate compositor properties only
- **Requirement:** Animations must target transform and opacity (compositor-only properties), not layout properties like width, height, top, or margin.
- **Quote:** "- **Animating layout properties** (`width`, `height`, `top`, `margin`) instead of `transform` and `opacity`. The compositor win disappears the moment the browser has to relayout on every frame."
- **Source:** .zflow/evidence/specweb/performance/scroll-driven-animations.md
- **Verify:** Inspect delivered CSS keyframes — animated properties are transform/opacity/filter, never width/height/top/margin.
- **Severity:** low

## Requirement 76 — Scroll-driven animations honour reduced motion
- **Requirement:** Scroll-driven animations must provide a prefers-reduced-motion opt-out that removes the motion.
- **Quote:** "- **Forgetting `prefers-reduced-motion`.** Scroll-driven motion is exactly the kind that triggers vestibular issues. Always provide an opt-out."
- **Source:** .zflow/evidence/specweb/performance/scroll-driven-animations.md
- **Verify:** curl -s <css-url> | grep -A3 'prefers-reduced-motion' — scroll-driven animations are set to none under reduce; DevTools → Rendering toggle makes the motion disappear, not merely shorten.
- **Severity:** medium

## Requirement 77 — scrollbar-gutter: stable at the root
- **Requirement:** The root should declare scrollbar-gutter: stable to prevent horizontal layout shift between pages with and without overflow.
- **Quote:** "> Use scrollbar-gutter: stable to reserve scrollbar space and stop horizontal layout shift between pages or states that overflow vs. don't."
- **Source:** .zflow/evidence/specweb/performance/scrollbar-gutter.md
- **Verify:** curl -s <css-url> | grep 'scrollbar-gutter' — stable is set on :root; on a classic-scrollbar system (Windows), open a short and a tall page in the same window and confirm element x-positions are identical.
- **Severity:** low

## Requirement 78 — Dynamic viewport units instead of 100vh
- **Requirement:** Full-height mobile elements must be sized with svh/dvh instead of 100vh, which is taller than the visible viewport when the browser toolbar shows.
- **Quote:** "> On mobile, 100vh is taller than the screen because it ignores the browser's collapsing toolbar. Use dvh, svh, and lvh to size full-height elements to the viewport that is actually visible."
- **Source:** .zflow/evidence/specweb/performance/dynamic-viewport-units.md
- **Verify:** curl -s <css-url> | grep -n '100vh' — full-height sections use 100svh/100dvh (100vh at most as a legacy fallback line); on a real phone the hero's bottom edge is not hidden behind the URL bar.
- **Severity:** medium

## Requirement 79 — svh for must-always-fit elements
- **Requirement:** Elements that must always fit on first paint (landing hero, login screen, modal) should use svh, the conservative unit that never overflows.
- **Quote:** "- For an element that must **always fit** on first paint — a landing hero, a login screen, a modal — use `svh`. It is the conservative choice that never overflows, in any toolbar state."
- **Source:** .zflow/evidence/specweb/performance/dynamic-viewport-units.md
- **Verify:** Inspect CSS for hero/login/modal sizing — min-height: 100svh (or max-height: …dvh for overlays), not 100vh alone.
- **Severity:** low

## Requirement 80 — Vary on Available-Dictionary when using dictionary transport
- **Requirement:** If Compression Dictionary Transport is used, Vary must include Available-Dictionary so caches never hand a dictionary-compressed body to a client that cannot decode it.
- **Quote:** "**Always vary on `Available-Dictionary`.** A cache that ignores it will hand a dictionary-compressed body to a client that lacks the dictionary, which cannot decode it."
- **Source:** .zflow/evidence/specweb/performance/compression-dictionary-transport.md
- **Verify:** curl -sI <url> | grep -i '^vary' — includes Available-Dictionary whenever Use-As-Dictionary or Content-Encoding: dcb/dcz is in play.
- **Severity:** low

## Requirement 81 — Server-Timing free of infrastructure detail
- **Requirement:** Server-Timing values must use coarse public labels and must not leak internal service names, query counts, or host identifiers.
- **Quote:** "- **Leaking infrastructure detail.** The header is visible to anyone. Internal service names, query counts, and host identifiers are an information-disclosure surface; the [spec warns about this](https://www.w3.org/TR/server-timing/#privacy-and-security). Send coarse labels publicly, or gate richer metrics behind authentication."
- **Source:** .zflow/evidence/specweb/performance/server-timing.md
- **Verify:** curl -sI <page-url> | grep -i '^server-timing' — metric names/descriptions are coarse (db, cache, edge) with no internal hostnames, SQL text, or version strings.
- **Severity:** low
