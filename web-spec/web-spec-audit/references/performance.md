# Performance — 81 audit checks

Field-measured speed (Core Web Vitals at the 75th percentile) and the payload disciplines behind it: images, lazy loading, resource hints, cache-control, validators, Vary/No-Vary-Search, compression, fonts, critical CSS, script loading, HTTP/2+, BFCache, speculation rules, and CSS rendering performance.

Source: [The Website Specification](https://specification.website/spec/performance/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.7, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/performance/&lt;slug&gt;/.

Checklist status (`meta/checklist.md`): **Required** — Core Web Vitals, image optimisation, Cache-Control, compression · **Avoid** — HTTP/1.1 workarounds · **Recommended** — lazy loading, preload, prefetch, preconnect, conditional requests, web font loading, critical CSS, script loading, HTTP/2 and HTTP/3, back/forward cache.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

---

- **P-1 — Core Web Vitals field thresholds** (high · `core-web-vitals`)
  Verify: Open the site in PageSpeed Insights (https://pagespeed.web.dev) and read the field data section (CrUX, 75th percentile, mobile and desktop), or query the CrUX API for the origin; all three metrics must show "Good".

- **P-2 — Keep INP responsive** (medium · `core-web-vitals`)
  Verify: In Chrome DevTools → Performance, record clicking primary interactive elements (nav, search, filters — never a final form submit) and check for long tasks >50ms on the main thread and the INP insight; PageSpeed Insights field INP on interaction-heavy pages (forms, search results), not only the homepage.

- **P-3 — Modern image formats** (high · `image-optimization`)
  Verify: curl -s -H 'Accept: image/avif,image/webp' -o /dev/null -w '%{content_type}\n' on the hero/major image URLs (expect image/avif or image/webp), or run Lighthouse and confirm the "Serve images in next-gen formats" audit passes.

- **P-4 — Responsive image sizes** (medium · `image-optimization`)
  Verify: curl -s <page-url> | grep -o '<img[^>]*>' — main content images carry srcset="…" and sizes="…" attributes.

- **P-5 — Explicit image dimensions** (high · `image-optimization`)
  Verify: curl -s <page-url> | grep -o '<img[^>]*>' — every tag includes width= and height= attributes.

- **P-6 — Keep the picture fallback chain** (low · `image-optimization`)
  Verify: curl -s <page-url> | grep -c 'type="image/avif"' is >0 while a JPEG <img> fallback remains inside the <picture> element.

- **P-7 — Image size budget** (medium · `image-optimization`)
  Verify: For each significant image: curl -sI <image-url> | grep -i content-length — values above ~200000 bytes fail the budget.

- **P-8 — Lazy-load off-screen media** (medium · `lazy-loading`)
  Verify: curl -s <page-url> | grep -o '<img[^>]*>' — images after the first screenful carry loading="lazy"; Lighthouse "Offscreen images" audit supports.

- **P-9 — LCP image loads eagerly** (high · `lazy-loading`)
  Verify: Identify the hero/LCP image in view source (curl -s <page-url>) and confirm it lacks loading="lazy"; the Lighthouse audit "Largest Contentful Paint image was lazily loaded" must not fire.

- **P-10 — decoding="async" on images** (low · `lazy-loading`)
  Verify: curl -s <page-url> | grep -o '<img[^>]*>' | grep -c 'decoding="async"' — present on the page's images.

- **P-11 — Lazy-load third-party iframes** (medium · `lazy-loading`)
  Verify: curl -s <page-url> | grep -o '<iframe[^>]*>' — each third-party embed iframe carries loading="lazy".

- **P-12 — Lazy-load below-the-fold video** (low · `lazy-loading`)
  Verify: curl -s <page-url> | grep -o '<video[^>]*>' — below-the-fold videos pair loading="lazy" with preload="none" or preload="metadata".

- **P-13 — Preload the LCP image** (medium · `preload-prefetch-preconnect`)
  Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*as="image"[^>]*>' — the LCP image URL is preloaded and carries fetchpriority="high".

- **P-14 — Preload critical fonts with crossorigin** (medium · `preload-prefetch-preconnect`)
  Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preload"[^>]*woff2[^>]*>' — the font preload includes as="font", type="font/woff2" and crossorigin; DevTools Network must not show the font fetched twice.

- **P-15 — Preconnect to third-party origins** (medium · `preload-prefetch-preconnect`)
  Verify: curl -s <page-url> | grep -o '<link[^>]*rel="preconnect"[^>]*>' and cross-check each hinted origin against resources the page actually loads (DevTools Network); Lighthouse "Preconnect to required origins" audit.

- **P-16 — Pair dns-prefetch with preconnect** (low · `preload-prefetch-preconnect`)
  Verify: curl -s <page-url> | grep -c 'rel="dns-prefetch"' — dns-prefetch hints appear alongside preconnect for key third-party origins.

- **P-17 — Prefetch the next likely page** (low · `preload-prefetch-preconnect`)
  Verify: curl -s <page-url> | grep -oE 'rel="prefetch"|type="speculationrules"' — the obvious next step (next article, first search result, main CTA target) is prefetched.

- **P-18 — Repeat Early Hints Link headers on the final response** (low · `early-hints`)
  Verify: curl -sI <page-url> | grep -i '^link:' — the final 200 response itself carries the rel=preload/preconnect Link headers.

- **P-19 — 103 only over HTTP/2 or later** (low · `early-hints`)
  Verify: curl -sI --http1.1 <page-url> must show no 103 block; 103 may only appear with curl -sI --http2 <page-url>.

- **P-20 — Fingerprinted assets cached immutably** (high · `cache-control`)
  Verify: curl -sI <hashed-asset-url> (e.g. https://example.com/app.4f3a2b.js) | grep -i cache-control — includes public, max-age=31536000 and immutable.

- **P-21 — HTML uses short or no caching** (high · `cache-control`)
  Verify: curl -sI <page-url> | grep -i cache-control — HTML shows max-age=0, must-revalidate (or no-store for highly dynamic pages), never max-age=31536000.

- **P-22 — Personalised responses are private** (high · `cache-control`)
  Verify: curl -sI with a session cookie against a personalised endpoint — Cache-Control includes private; publicly cacheable responses contain no per-user data.

- **P-23 — stale-if-error for resilience** (medium · `cache-control`)
  Verify: curl -sI <sitemap-or-feed-url> | grep -i cache-control — the responses relied on include stale-if-error=<seconds>.

- **P-24 — Never combine stale-if-error with must-revalidate** (low · `cache-control`)
  Verify: curl -sI <url> | grep -i cache-control — must not contain both stale-if-error and must-revalidate on the same response.

- **P-25 — Vary lists exactly what was branched on** (medium · `vary`)
  Verify: curl -sI -H 'Accept-Encoding: br' <url> and again without the header — where the body differs by encoding, Vary includes Accept-Encoding; fields the server ignores must not be listed.

- **P-26 — Vary on every representation including the default** (medium · `vary`)
  Verify: curl -sI -H 'Accept: text/markdown' <page-url> and curl -sI <page-url> — both responses carry the same Vary header.

- **P-27 — No Vary: Cookie on public pages** (medium · `vary`)
  Verify: curl -sI <public-page-url> | grep -i '^vary' — Cookie must not be listed on a page intended to be publicly cacheable.

- **P-28 — Avoid Vary: User-Agent** (medium · `vary`)
  Verify: curl -sI <page-url> | grep -i '^vary' — User-Agent must not appear on a responsive site.

- **P-29 — Justify Vary fields beyond two** (low · `vary`)
  Verify: curl -sI across the site's key URLs and count the comma-separated fields in Vary — more than two fields is a flag to investigate.

- **P-30 — Validator on every cacheable response** (medium · `conditional-requests`)
  Verify: curl -sI <cacheable-url> | grep -iE '^(etag|last-modified)' — at least one validator is present.

- **P-31 — Conditional GET returns 304** (medium · `conditional-requests`)
  Verify: V=$(curl -sI <url> | grep -i '^etag' | tr -d '\r' | sed 's/^[Ee][Tt][Aa][Gg]: //'); then curl -s -o /dev/null -w '%{http_code}\n' -H "If-None-Match: $V" <url> — must print 304.

- **P-32 — Weak ETags for negotiated content** (low · `conditional-requests`)
  Verify: curl -sI -H 'Accept-Encoding: gzip' <url> and curl -sI -H 'Accept-Encoding: br' <url> — ETags on the negotiated representations begin with W/".

- **P-33 — Stable validators** (low · `conditional-requests`)
  Verify: Two sequential curl -sI requests seconds apart to an unchanged URL — the ETag value is identical both times.

- **P-34 — No-Vary-Search for tracking parameters** (medium · `no-vary-search`)
  Verify: curl -sI <page-url> | grep -i '^no-vary-search' — the header lists the tracking parameters the site receives.

- **P-35 — No-Vary-Search includes key-order** (low · `no-vary-search`)
  Verify: curl -sI <page-url> | grep -i '^no-vary-search' — the value includes the key-order token.

- **P-36 — No-Vary-Search must not list response-changing parameters** (low · `no-vary-search`)
  Verify: Read the No-Vary-Search value from curl -sI <page-url> — parameters such as page, sort, or q must not appear inside params=(…).

- **P-37 — Brotli preferred, gzip fallback** (high · `compression`)
  Verify: curl -sI -H 'Accept-Encoding: br, gzip' <text-url> | grep -i content-encoding — br (or gzip) is returned; identity/absent fails. Lighthouse "Enable text compression" audit.

- **P-38 — Compress all text types** (medium · `compression`)
  Verify: For each text type (document, CSS file, JS file, JSON endpoint, SVG): curl -sI -H 'Accept-Encoding: br, gzip' <url> | grep -i content-encoding returns an encoding.

- **P-39 — Vary: Accept-Encoding on compressed responses** (medium · `compression`)
  Verify: curl -sI -H 'Accept-Encoding: br' <url> | grep -i '^vary' — includes Accept-Encoding whenever Content-Encoding is set; verify what leaves the edge, not just the origin.

- **P-40 — No double compression of media** (low · `compression`)
  Verify: curl -sI <image-or-woff2-url> | grep -i content-encoding — empty for image, video, and WOFF2 responses.

- **P-41 — Never use deflate** (low · `compression`)
  Verify: curl -sI -H 'Accept-Encoding: gzip, deflate, br' <url> | grep -i content-encoding — the negotiated encoding is never deflate.

- **P-42 — Self-host fonts** (medium · `font-loading`)
  Verify: curl -s <page-url> | grep -oE 'fonts\.(googleapis|gstatic)\.com|use\.typekit\.(com|net)|cdn\.fonts\.net' — no third-party font origins; font requests go to the site's own origin.

- **P-43 — WOFF2 only** (low · `font-loading`)
  Verify: DevTools → Network filtered to Font (or inspect CSS @font-face src): all font requests are .woff2 / Content-Type font/woff2; no .woff, .ttf, or .otf.

- **P-44 — font-display set on every face** (medium · `font-loading`)
  Verify: curl -s <css-url> | grep -A8 '@font-face' | grep font-display — every face declares swap or optional; Lighthouse "Ensure text remains visible during webfont load" passes.

- **P-45 — Subset fonts** (low · `font-loading`)
  Verify: DevTools → Network font transfer sizes — a Latin text face ships tens of KB in WOFF2, not a 100KB+ multi-script file.

- **P-46 — Fallback font metric overrides** (low · `font-loading`)
  Verify: curl -s <css-url> | grep -E 'size-adjust|ascent-override|descent-override' — present on the fallback @font-face declarations.

- **P-47 — Inline critical CSS under ~14KB** (medium · `critical-css`)
  Verify: curl -s <page-url> and measure the inline <style> block in <head> (≈14KB or less); Lighthouse "Render-blocking requests" insight shows no blocking stylesheet for first paint.

- **P-48 — Non-critical CSS loaded asynchronously** (medium · `critical-css`)
  Verify: View source (curl -s <page-url>): non-critical stylesheet uses <link rel="preload" as="style" onload="this.rel='stylesheet'"> plus <noscript><link rel="stylesheet" href="/site.css"></noscript>.

- **P-49 — No third-party render-blocking CSS** (medium · `critical-css`)
  Verify: curl -s <page-url> | grep -o '<link[^>]*rel="stylesheet"[^>]*>' — no third-party-origin stylesheets load render-blocking in head.

- **P-50 — No bare blocking scripts** (high · `script-loading`)
  Verify: curl -s <page-url> | grep -oE '<script[^>]*\bsrc=[^>]*>' — every external script tag carries defer, async, or type="module"; Lighthouse "Render-blocking requests" lists zero scripts.

- **P-51 — Third-party async scripts carry SRI** (medium · `script-loading`)
  Verify: curl -s <page-url> | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>' — third-party scripts include integrity="sha384-…" and crossorigin="anonymous".

- **P-52 — modulepreload for critical module dependencies** (low · `script-loading`)
  Verify: curl -s <page-url> | grep 'rel="modulepreload"' — critical imported modules (router, store) are preloaded ahead of the module entry point.

- **P-53 — Drop the nomodule shim** (low · `script-loading`)
  Verify: curl -s <page-url> | grep -c 'nomodule' — expect 0 (no second legacy bundle shipped).

- **P-54 — Serve over HTTP/2 at minimum** (medium · `http3`)
  Verify: curl -sI -o /dev/null -w '%{http_version}\n' <page-url> — prints 2 or 3, never 1.1.

- **P-55 — One origin for static assets** (medium · `http3`)
  Verify: curl -s <page-url> | grep -oE 'https?://[A-Za-z0-9.-]+' | sort -u — one primary asset origin; no cdn1/cdn2/assets shard hostnames.

- **P-56 — Advertise HTTP/3 via Alt-Svc** (low · `http3`)
  Verify: curl -sI <page-url> | grep -i 'alt-svc' — advertises h3=":443"; corroborate reachability with curl --http3 -I <page-url> or an HTTP/3 probe site (http3check.net).

- **P-57 — Drop image sprites** (low · `http1-workarounds`)
  Verify: Inventory the page's assets (curl the HTML and CSS): no single large sprite.png/icons.png sliced via background-position; icons are inline SVG or individual images.

- **P-58 — Few, well-sized JS bundles** (low · `http1-workarounds`)
  Verify: DevTools → Network JS filter (or count script srcs in the HTML): a handful of bundles, not one giant file or hundreds of tiny module requests.

- **P-59 — Speculation Rules with moderate eagerness** (medium · `speculation-rules`)
  Verify: curl -s <page-url> | grep -A6 'speculationrules' — a rules block exists and eagerness is moderate or conservative; Chrome DevTools → Application → Speculative loads shows the rules matching.

- **P-60 — Never speculate on side-effect URLs** (medium · `speculation-rules`)
  Verify: Read the speculationrules JSON in view source — logout/delete/payment endpoints are not matched by any prefetch or prerender rule.

- **P-61 — Analytics wait for prerenderingchange** (low · `speculation-rules`)
  Verify: View source / delivered JS: analytics init is guarded by a document.prerendering check with a prerenderingchange listener, not executed on script load.

- **P-62 — Prerender targets must not be no-store** (low · `speculation-rules`)
  Verify: curl -sI <prerender-target-url> | grep -i cache-control — no no-store on pages matched by prerender rules.

- **P-63 — At most ~5 resource hints in head** (medium · `resource-hints`)
  Verify: curl -s <page-url> | grep -coE 'rel="(preload|prefetch|preconnect|modulepreload|dns-prefetch)"' — count is ~5 or fewer.

- **P-64 — No redundant preloads** (low · `resource-hints`)
  Verify: Load the page in Chrome and watch the console for "<link rel=preload> was preloaded using link preload but not used within a few seconds"; compare preload hrefs against stylesheets already early in head.

- **P-65 — Cross-document view transitions opt-in** (low · `view-transitions`)
  Verify: curl -s <main-css-url> | grep -A2 '@view-transition' — declares navigation: auto; navigate between two site pages in Chrome and observe the cross-fade.

- **P-66 — View transitions respect reduced motion** (medium · `view-transitions`)
  Verify: curl -s <css-url> | grep -B3 -A6 'prefers-reduced-motion' — view-transition pseudo-elements get animation: none; DevTools → Rendering → emulate prefers-reduced-motion and confirm the transition disappears entirely.

- **P-67 — View transitions stay 150–250ms** (low · `view-transitions`)
  Verify: DevTools → Animations panel records the view transition timing — duration falls in the 150–250ms range.

- **P-68 — No unload listeners (BFCache)** (medium · `bfcache`)
  Verify: curl -s <page-url> | grep -cE "addEventListener\(['"]unload" — expect 0; Lighthouse "Page prevented back/forward cache restoration" audit passes, and DevTools → Application → Back/forward cache test lists no unload-related disqualifier.

- **P-69 — No Cache-Control: no-store on HTML (BFCache)** (medium · `bfcache`)
  Verify: curl -sI <page-url> | grep -i cache-control — HTML is not no-store; manual back-navigation smoke test shows no network request for the page.

- **P-70 — Handle BFCache restore** (low · `bfcache`)
  Verify: View source / delivered JS: a pageshow listener checks event.persisted and re-fires analytics or refreshes state on restore.

- **P-71 — content-visibility with contain-intrinsic-size** (low · `visibility-aware-rendering`)
  Verify: curl -s <css-url> | grep -B2 -A2 'content-visibility' — long sections declare content-visibility: auto and a matching contain-intrinsic-size value.

- **P-72 — Intersection Observer over scroll listeners** (low · `visibility-aware-rendering`)
  Verify: Search the delivered JS for addEventListener('scroll' and addEventListener('resize' driving lazy/reveal logic — each hit is a candidate that should be an IntersectionObserver or loading="lazy".

- **P-73 — contain: content on self-enclosed components** (low · `css-containment`)
  Verify: curl -s <css-url> | grep 'contain:' — repeated component selectors declare contain: content (or layout paint style).

- **P-74 — Scroll-driven animations in CSS** (low · `scroll-driven-animations`)
  Verify: Where scroll effects exist, inspect the delivered CSS for animation-timeline: scroll()/view() and confirm no JS scroll-listener library (rAF + scroll pattern) is doing the same job.

- **P-75 — Animate compositor properties only** (low · `scroll-driven-animations`)
  Verify: Inspect delivered CSS keyframes — animated properties are transform/opacity/filter, never width/height/top/margin.

- **P-76 — Scroll-driven animations honour reduced motion** (medium · `scroll-driven-animations`)
  Verify: curl -s <css-url> | grep -A3 'prefers-reduced-motion' — scroll-driven animations are set to none under reduce; DevTools → Rendering toggle makes the motion disappear, not merely shorten.

- **P-77 — scrollbar-gutter: stable at the root** (low · `scrollbar-gutter`)
  Verify: curl -s <css-url> | grep 'scrollbar-gutter' — stable is set on :root; on a classic-scrollbar system (Windows), open a short and a tall page in the same window and confirm element x-positions are identical.

- **P-78 — Dynamic viewport units instead of 100vh** (medium · `dynamic-viewport-units`)
  Verify: curl -s <css-url> | grep -n '100vh' — full-height sections use 100svh/100dvh (100vh at most as a legacy fallback line); on a real phone the hero's bottom edge is not hidden behind the URL bar.

- **P-79 — svh for must-always-fit elements** (low · `dynamic-viewport-units`)
  Verify: Inspect CSS for hero/login/modal sizing — min-height: 100svh (or max-height: …dvh for overlays), not 100vh alone.

- **P-80 — Vary on Available-Dictionary when using dictionary transport** (low · `compression-dictionary-transport`)
  Verify: curl -sI <url> | grep -i '^vary' — includes Available-Dictionary whenever Use-As-Dictionary or Content-Encoding: dcb/dcz is in play.

- **P-81 — Server-Timing free of infrastructure detail** (low · `server-timing`)
  Verify: curl -sI <page-url> | grep -i '^server-timing' — metric names/descriptions are coarse (db, cache, edge) with no internal hostnames, SQL text, or version strings.
