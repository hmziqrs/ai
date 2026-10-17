# Performance — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/performance/. Assembled from the local evidence corpus (.zflow/evidence/specweb/performance/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## bfcache
Source: https://specification.website/spec/performance/bfcache/

---
title: "Back/forward cache (BFCache)"
category: performance
status: recommended
url: https://specification.website/spec/performance/bfcache/
updated: "2026-05-29T16:40:22.000Z"
sources:
  - title: "WHATWG HTML — Navigation and session history"
    url: "https://html.spec.whatwg.org/multipage/nav-history-apis.html"
    publisher: "WHATWG"
  - title: "web.dev — Back/forward cache"
    url: "https://web.dev/articles/bfcache"
    publisher: "Google"
  - title: "MDN — bfcache"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/bfcache"
    publisher: "MDN"
  - title: "Chrome for Developers — Test back/forward cache in DevTools"
    url: "https://developer.chrome.com/docs/devtools/application/back-forward-cache"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Back/forward cache (BFCache)

> Keep pages BFCache-eligible so back/forward navigation restores them instantly from memory, with no reload, no hydration, and no repaint.

## What it is

When the user navigates away from a page, the browser may snapshot the whole thing — DOM, JavaScript heap, scroll position, in-flight timers — into memory. On back or forward navigation, that snapshot is restored. No network request. No HTML parse. No script execution. No paint beyond compositing the existing frame.

Chrome, Firefox, and Safari all ship a BFCache (Safari has had it the longest, as "page cache"). The eligibility rules differ in the corners but the broad shape is the same: pages that look like they can be safely frozen and thawed are cached; pages that hold open connections, listen for `unload`, or are explicitly marked uncacheable are not.

This page is mostly about *not breaking* a feature you get for free.

## Why it matters

- **It is the fastest navigation the platform has.** A BFCache restore is faster than a prerendered page, faster than a service-worker cache hit, faster than anything you can build. The frame is already composited.
- **It feeds Core Web Vitals.** Field metrics count BFCache restores. A site that ships BFCache-eligible pages reports better LCP, CLS, and INP at the 75th percentile than an otherwise-identical site that disqualifies itself.
- **It costs nothing if you don't break it.** Most of the work is removing legacy patterns — an old `unload` listener, a blanket `Cache-Control: no-store` — not adding new code.

## How to implement

**Never listen for `unload`.** This is the single most common disqualifier. Use `pagehide` for cleanup and `visibilitychange` for "user left the tab" semantics. Both fire reliably and neither blocks BFCache.

**Do not set `Cache-Control: no-store` on HTML.** All major browsers refuse to cache `no-store` responses for BFCache. `no-cache` is fine — it forces revalidation on a real navigation, but the page is still eligible to be restored from memory on back/forward. See [Cache-Control](/spec/performance/cache-control/).

**Close stateful connections in `pagehide`.** Open IndexedDB transactions, WebSockets, and `BroadcastChannel`s can block eligibility or get torn down on eviction. Close them when the page hides; reopen them in `pageshow` if the page is restored.

**Handle the restore.** The `pageshow` event fires with `event.persisted === true` when the page comes back from BFCache. Treat it as "I was frozen — re-sync":

```js
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  // Restored from BFCache — re-run analytics, refresh stale UI, restart polling.
  window.dataLayer?.push({ event: "bfcache_restore" });
});
```

**Watch `window.opener` and same-origin iframes.** A page that holds a live reference to another window, or that contains a same-origin iframe with its own disqualifiers, may inherit ineligibility.

## Common mistakes

- A single `addEventListener("unload", ...)` anywhere on the page — often from a legacy analytics shim or a third-party widget. One listener disqualifies the whole document.
- `Cache-Control: no-store` applied site-wide to "be safe". It silently turns off the fastest navigation the browser has.
- Running analytics only on `DOMContentLoaded`. BFCache restores skip it, so session metrics under-report back navigations. Send a pageview on `pageshow` when `persisted` is true.
- Assuming the cache is permanent. Browsers evict aggressively under memory pressure and after a timeout (Chrome currently caps around 10 minutes). Design for "usually instant", not "always instant".
- Third-party scripts that register their own `unload` handler. Audit them; some vendors offer a `pagehide`-based mode.

## Verification

- Chrome DevTools → **Application** → **Back/forward cache** → **Test back/forward cache** runs an eligibility check on the current page and lists every disqualifying reason by name.
- The [`NotRestoredReasons` API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/notRestoredReasons) on `PerformanceNavigationTiming` reports why a back/forward navigation was *not* served from BFCache. Send it from real-user monitoring to find disqualifiers you can't reproduce locally.
- Lighthouse flags **"Page prevented back/forward cache restoration"** as a discrete audit, with the failure reason.
- Manual smoke test: load the page, navigate to any other origin, hit back. If you see a network request in DevTools, BFCache did not restore.
---

## cache-control
Source: https://specification.website/spec/performance/cache-control/

---
title: "Cache-Control headers"
category: performance
status: required
url: https://specification.website/spec/performance/cache-control/
updated: "2026-08-01T00:00:00.000Z"
sources:
  - title: "RFC 9111 — HTTP Caching"
    url: "https://www.rfc-editor.org/rfc/rfc9111"
    publisher: "IETF"
  - title: "RFC 5861 — HTTP Cache-Control Extensions for Stale Content"
    url: "https://www.rfc-editor.org/rfc/rfc5861"
    publisher: "IETF"
  - title: "MDN — Cache-Control"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control"
    publisher: "MDN"
  - title: "MDN — HTTP caching"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching"
    publisher: "MDN"
  - title: "MDN — Vary"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Cache-Control headers

> Cache-Control tells browsers and CDNs how long to keep a response. Use immutable + max-age=31536000 for fingerprinted assets and short or no-cache for HTML.

## What it is

`Cache-Control` is an HTTP response header that governs how, where, and for how long a response may be stored and reused. It is defined in RFC 9111 and replaces the older `Expires` and `Pragma` headers.

```http
Cache-Control: public, max-age=31536000, immutable
```

Key directives:

- `public` — any cache may store it (CDN, proxy, browser).
- `private` — only the user's browser may store it.
- `no-cache` — store, but revalidate before reuse.
- `no-store` — do not store at all.
- `max-age=<seconds>` — fresh for this many seconds.
- `s-maxage=<seconds>` — same, but only for shared caches (CDNs).
- `immutable` — promise that the body will never change, so the browser can skip revalidation.
- `stale-while-revalidate=<seconds>` — serve stale while fetching a fresh copy in the background.
- `stale-if-error=<seconds>` — keep serving the cached copy when the origin returns an error or is unreachable.

## Why it matters

A correct cache policy is the cheapest possible performance win. Repeat visitors download nothing for cached assets. CDNs absorb traffic before it reaches your origin. Without it, every page view re-fetches the same CSS, JS, and images. With it, the second visit can be near-instant.

`no-cache` is also a privacy tool: it forces revalidation of HTML so users see your latest content, while still allowing 304s.

## How to implement

**Fingerprinted assets — cache forever.** If the URL contains a content hash (`app.4f3a2b.js`), the body cannot change. Cache aggressively:

```http
Cache-Control: public, max-age=31536000, immutable
```

`immutable` matters: without it, Firefox revalidates on reload even with `max-age` set.

**HTML — short or no cache.** Pages change often and rarely have fingerprinted URLs. Use:

```http
Cache-Control: public, max-age=0, must-revalidate
```

or, for highly dynamic pages:

```http
Cache-Control: no-store
```

Pair with a validator so revalidation is cheap — see [conditional requests](/spec/performance/conditional-requests/).

**Per-user content — private.** Anything personalised needs `private` to prevent shared caches from leaking one user's data to another.

**Set [`Vary`](/spec/performance/vary/) correctly.** If the response varies by `Accept-Encoding` or `Accept-Language`, set `Vary` accordingly. Missing `Vary` causes a CDN to serve gzip to a client that asked for brotli.

**Survive origin failures — `stale-if-error`.** Defined in RFC 5861, this directive tells shared caches and browsers to keep serving the last good copy when a revalidation request fails — a 5xx from the origin, a timeout, or a connection error. It turns a backend outage into stale-but-working pages instead of error pages:

```http
Cache-Control: public, max-age=3600, stale-while-revalidate=86400, stale-if-error=604800
```

Here the edge keeps responding from cache for up to a week while you fix the origin. It is the cheapest resilience measure there is; pair it with [maintenance pages](/spec/resilience/maintenance-pages/) for planned downtime and [graceful degradation](/spec/resilience/graceful-degradation/) so a cached page still works if its scripts do not. This site sends `stale-if-error` on its short-lived content responses — the per-page Markdown mirrors, the JSON-LD graphs, and the sitemaps.

Note that `stale-if-error` is overridden by `must-revalidate` (RFC 9111 forbids serving stale once a `must-revalidate` response is stale), so don't combine the two on the same response.

## Common mistakes

- No `Cache-Control` at all. Browsers then use heuristic caching, which is unpredictable.
- `max-age=31536000` on HTML. Users get stale pages and you can't fix bugs without changing the URL.
- `no-cache` mistaken for "do not cache". It only means "revalidate first". Use `no-store` to actually prevent storage.
- Missing `Vary: Accept-Encoding` when serving brotli/gzip via a CDN.
- Fingerprinted URL without `immutable` — Firefox will still revalidate on reload.

## Verification

- `curl -I https://example.com/app.4f3a2b.js` — confirm `Cache-Control` is set.
- `curl -I https://example.com/sitemap-index.xml` — confirm the responses you rely on carry `stale-if-error`.
- DevTools → Network → Size column shows "(memory cache)" or "(disk cache)" for cached resources.
- Webhint and Lighthouse flag inefficient cache policy.
---

## compression-dictionary-transport
Source: https://specification.website/spec/performance/compression-dictionary-transport/

---
title: "Compression Dictionary Transport"
category: performance
status: optional
url: https://specification.website/spec/performance/compression-dictionary-transport/
updated: "2026-06-10T00:00:00.000Z"
sources:
  - title: "RFC 9842 — Compression Dictionary Transport"
    url: "https://www.rfc-editor.org/rfc/rfc9842.html"
    publisher: "IETF"
  - title: "MDN — Compression Dictionary Transport"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Compression_dictionary_transport"
    publisher: "MDN"
  - title: "MDN — Use-As-Dictionary"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Use-As-Dictionary"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Compression Dictionary Transport

> Use a previously served response, or a dedicated dictionary, as a Brotli/Zstandard dictionary so updated assets compress to a fraction of their size. Pure progressive enhancement over ordinary compression.

## What it is

Ordinary [compression](/spec/performance/compression/) (gzip, brotli, zstd) shrinks each response against a small built-in dictionary. Compression Dictionary Transport, standardised as [RFC 9842](https://www.rfc-editor.org/rfc/rfc9842.html), lets the server nominate a *custom* dictionary — usually an earlier version of the same resource — so the next response only has to encode what actually changed.

A response advertises that it may serve as a dictionary:

```http
Use-As-Dictionary: match="/app/*.js"
Content-Encoding: br
```

On a later request the browser sends the dictionary's hash, and the server replies with a dictionary-compressed body:

```http
Request:
Available-Dictionary: :pZGm1Av0IEBKARczz7exkNYsZb8LzaMrV7J32a2fFG4=:
Accept-Encoding: dcb, dcz, br, gzip

Response:
Content-Encoding: dcb
Vary: Accept-Encoding, Available-Dictionary
```

The two new content codings are `dcb` (Dictionary-Compressed Brotli) and `dcz` (Dictionary-Compressed Zstandard).

## Why it matters

Most deploys change a few lines in a large bundle. Against the previous build as a dictionary, the diff can compress an order of magnitude smaller than a standalone brotli pass — bytes for what changed, not the whole file. It is also pure progressive enhancement: a client that does not send `Available-Dictionary` simply receives the normal `br` or `gzip` response, so there is no fallback path to maintain and nothing breaks.

## How to implement

**Pick a dictionary strategy.** Either let a versioned asset act as the dictionary for its own successor (`match` on the URL pattern), or ship a small dedicated dictionary referenced by a `<link rel="compression-dictionary">`.

**Scope it with `match` / `match-dest`.** Restrict each dictionary to the URL patterns and request destinations it actually helps, so the browser never offers an irrelevant dictionary.

**Always vary on `Available-Dictionary`.** A cache that ignores it will hand a dictionary-compressed body to a client that lacks the dictionary, which cannot decode it.

**Lean on your CDN.** This is server- and edge-layer behaviour; most sites enable it at the CDN rather than hand-rolling the headers.

## Common mistakes

- Omitting `Available-Dictionary` from `Vary`, poisoning shared caches with undecodable bodies.
- Treating it as a substitute for ordinary compression. It is a layer on top — keep brotli/gzip on for the first, dictionary-less request.
- Over-broad `match` patterns that nominate dictionaries the browser can never use, wasting a round of negotiation.

## Verification

- `curl -H "Accept-Encoding: dcb, dcz, br" -H "Available-Dictionary: :<hash>:" -I https://example.com/app.js` — check for `Content-Encoding: dcb`.
- DevTools → Network → response headers: look for `Use-As-Dictionary` on the seed response and `dcb`/`dcz` on the follow-up.
- Browser support is still limited (Chromium-led); confirm your real audience benefits before investing in dedicated dictionaries.
---

## compression
Source: https://specification.website/spec/performance/compression/

---
title: "Compression (gzip, brotli, zstd)"
category: performance
status: required
url: https://specification.website/spec/performance/compression/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 7932 — Brotli Compressed Data Format"
    url: "https://www.rfc-editor.org/rfc/rfc7932"
    publisher: "IETF"
  - title: "MDN — Accept-Encoding"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Accept-Encoding"
    publisher: "MDN"
  - title: "MDN — Content-Encoding"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Encoding"
    publisher: "MDN"
  - title: "RFC 8878 — Zstandard Compression"
    url: "https://www.rfc-editor.org/rfc/rfc8878"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Compression (gzip, brotli, zstd)

> Compress text responses with brotli where supported, gzip everywhere else. zstd is emerging. Don't compress already-compressed media.

## What it is

HTTP content encoding compresses response bodies on the server and decompresses them in the browser. The client advertises supported algorithms in `Accept-Encoding`; the server picks one and announces it in `Content-Encoding`.

```http
Request:
Accept-Encoding: br, gzip, zstd

Response:
Content-Encoding: br
Vary: Accept-Encoding
```

The common algorithms:

- **gzip** — universally supported since the late 1990s. Good ratio, fast.
- **brotli (br)** — Google, standardised as RFC 7932. 15–25% smaller than gzip for text. Supported by all modern browsers.
- **zstd** — RFC 8878. Comparable ratio to brotli with faster decompression. Supported by Chrome 123+, Firefox 126+, and Safari 26.3+ (earlier Safari cannot decode Zstandard responses).
- **deflate** — avoid. Ambiguity between raw deflate and zlib wrapping has bitten implementations for decades.

## Why it matters

Text resources — HTML, CSS, JavaScript, JSON, SVG, XML — compress to 20–30% of their original size. On a 200KB JavaScript bundle, that is 140KB saved per request, multiplied by every user. Compression is one of the cheapest performance wins available, and a Lighthouse audit failure if missing.

## How to implement

**Compress all text.** HTML, CSS, JS, JSON, SVG, XML, plain text, and most fonts (WOFF2 is already compressed; WOFF is not).

**Negotiate via `Accept-Encoding`.** Most servers and CDNs do this automatically. Configure them to prefer brotli, fall back to gzip:

- nginx: `brotli on; brotli_static on; gzip on;`
- Apache: `mod_brotli` and `mod_deflate`.
- Cloudflare, Fastly, Cloudfront: enable in the dashboard.

**Pre-compress static assets.** For files that don't change (your bundled JS), compress at build time to maximum level (brotli quality 11, gzip level 9) and let the server serve the `.br` or `.gz` file directly. Runtime compression usually runs at level 5–6 for CPU reasons.

**Set [`Vary: Accept-Encoding`](/spec/performance/vary/).** Tells CDNs to keep a separate cache entry per encoding. Without it, gzip clients may receive a brotli body they can't decode.

**Don't double-compress.** Images (JPEG, PNG, WebP, AVIF), video, fonts (WOFF2), and zip files are already compressed. Re-encoding wastes CPU and often grows the file.

## Common mistakes

- Compression off entirely. Lighthouse "Enable text compression" fails immediately.
- gzip only — a 20% saving left on the table for every brotli-capable browser.
- Compressing images or video. Pure waste.
- Missing `Vary: Accept-Encoding` behind a CDN. Cache poisoning waiting to happen.
- Brotli at quality 11 on dynamic responses. The encode cost erases the wire saving.
- Compressing a response that reflects attacker-controlled input next to a secret. This is the BREACH attack: an attacker who can inject text into a page (through a query parameter, say) and watch the size of the encrypted response can recover a secret on the same page, such as a CSRF token, one character at a time, because a guess that matches the secret compresses better. The fix is narrow, not a reason to switch compression off: mask per-request secrets with a fresh random value on every response (most frameworks' CSRF protection already does), keep secrets out of responses that echo user input, or skip compression on those specific responses. Static assets and pages without secrets are not affected. Scanners that flag "HTTP compression enabled" as a risk on every site, as Internet.nl does, are measuring something much broader than the actual exposure.

## Verification

- `curl -H "Accept-Encoding: br, gzip" -I https://example.com/main.css` — check `Content-Encoding`.
- DevTools → Network → response headers should show `content-encoding: br`.
- Compare Network "Size" (over the wire) vs "Resources" (decompressed). The ratio shows compression is working.
---

## conditional-requests
Source: https://specification.website/spec/performance/conditional-requests/

---
title: "Conditional requests (ETag, Last-Modified, 304)"
category: performance
status: recommended
url: https://specification.website/spec/performance/conditional-requests/
updated: "2026-06-09T11:00:00.000Z"
sources:
  - title: "RFC 9110 §13 — Conditional Requests"
    url: "https://www.rfc-editor.org/rfc/rfc9110#section-13"
    publisher: "IETF"
  - title: "RFC 9110 §8.8 — Validator Fields (ETag, Last-Modified)"
    url: "https://www.rfc-editor.org/rfc/rfc9110#section-8.8"
    publisher: "IETF"
  - title: "MDN — HTTP conditional requests"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests"
    publisher: "MDN"
  - title: "MDN — 304 Not Modified"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/304"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Conditional requests (ETag, Last-Modified, 304)

> Send a validator — ETag or Last-Modified — on every cacheable response, and honour If-None-Match / If-Modified-Since so unchanged resources return an empty 304 instead of the full body.

## What it is

A conditional request asks the server for a resource _only if it has changed_. The server attaches a **validator** to each response — an `ETag` (an opaque token identifying the body) or a `Last-Modified` date:

```http
ETag: "87d3702ef9500aacbb5164d5fb9d82a4"
Last-Modified: Mon, 09 Jun 2026 09:00:00 GMT
```

On the next fetch the client echoes that validator back:

```http
If-None-Match: "87d3702ef9500aacbb5164d5fb9d82a4"
If-Modified-Since: Mon, 09 Jun 2026 09:00:00 GMT
```

If the resource is unchanged, the server answers `304 Not Modified` with **empty body** and the client reuses its cached copy. If it changed, the server returns the full `200`. This is the revalidation step that `Cache-Control` defers to — see [Cache-Control headers](/spec/performance/cache-control/).

## Why it matters

`Cache-Control` decides _how long_ a cached copy stays fresh; validators decide _what revalidation costs_ once it goes stale. Without a validator, every revalidation re-downloads the whole body even when nothing changed. With one, an unchanged 2 MB asset becomes a sub-200-byte `304`. It is the difference between "is this still current?" costing a header exchange versus a full transfer.

It also matters for agents. A client polling this site's [Markdown mirrors](/spec/agent-readiness/markdown-source-endpoints/) can send `If-None-Match` and receive a `304` for content that has not changed, instead of re-parsing an identical page every cycle — cheap, polite re-fetching that pairs naturally with [stable URLs](/spec/agent-readiness/stable-urls/). This site emits validators on every response; a conditional `GET` of any unchanged asset returns `304`.

## How to implement

- **Emit a validator on cacheable responses.** Most servers and CDNs add `ETag` to static files automatically. Confirm it reaches the client and is not stripped by a proxy.
- **Prefer `ETag` over `Last-Modified`.** `Last-Modified` has one-second granularity and breaks for content that changes sub-second or has no meaningful file date. `ETag` is exact. When both are present, `If-None-Match` takes precedence.
- **Use weak ETags (`W/"…"`) for negotiated content.** A weak validator means "semantically equivalent", which is correct when the same URL is served gzip to one client and brotli to another. Pair with a correct `Vary` so caches do not cross the wires — see [compression](/spec/performance/compression/).
- **Keep the validator stable across identical bytes.** It must not change on every request (e.g. derived from a timestamp), or revalidation never short-circuits.

## Common mistakes

- No validator at all — revalidation re-downloads the full body every time.
- A **strong** ETag on content-negotiated responses, so a brotli client and a gzip client fight over one cache entry.
- ETags that vary per request (random or time-based), defeating every conditional request.
- Returning `200` with a body when the client's `If-None-Match` already matches — wasted bandwidth.

## Verification

- `curl -sI https://example.com/asset.js | grep -i etag` — confirm a validator is present.
- Re-request with it: `curl -s -o /dev/null -w "%{http_code}" -H 'If-None-Match: "…"' https://example.com/asset.js` — expect `304`.
- DevTools → Network → a revalidated resource shows status `304` and a tiny transfer size.
---

## core-web-vitals
Source: https://specification.website/spec/performance/core-web-vitals/

---
title: "Core Web Vitals (LCP, INP, CLS)"
category: performance
status: required
url: https://specification.website/spec/performance/core-web-vitals/
updated: "2026-05-29T20:27:54.000Z"
sources:
  - title: "web.dev — Web Vitals"
    url: "https://web.dev/articles/vitals"
    publisher: "web.dev"
  - title: "Chrome User Experience Report"
    url: "https://developer.chrome.com/docs/crux"
    publisher: "Chrome for Developers"
  - title: "web.dev — Interaction to Next Paint (INP)"
    url: "https://web.dev/articles/inp"
    publisher: "web.dev"
  - title: "web.dev — Cumulative Layout Shift (CLS)"
    url: "https://web.dev/articles/cls"
    publisher: "web.dev"
  - title: "Chrome for Developers — Break up long tasks with scheduler.yield()"
    url: "https://developer.chrome.com/blog/use-scheduler-yield"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Core Web Vitals (LCP, INP, CLS)

> Core Web Vitals measure loading, responsiveness, and visual stability. Hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile of real users.

## What it is

Core Web Vitals are three user-centric metrics that Google uses to score the quality of a page experience:

- **Largest Contentful Paint (LCP)** — time from navigation start until the largest visible element is painted. Measures loading.
- **Interaction to Next Paint (INP)** — the slowest interaction the user has with the page, from input to the next frame. Measures responsiveness.
- **Cumulative Layout Shift (CLS)** — the sum of unexpected layout shift scores during the page's lifecycle. Measures visual stability.

The targets, measured at the 75th percentile of page loads across mobile and desktop:

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS | ≤ 0.1 | ≤ 0.25 | > 0.25 |

## Why it matters

The numbers that count are **field data** from real users, captured in the Chrome User Experience Report (CrUX) and surfaced in Search Console, PageSpeed Insights, and the CrUX API. Lab data from Lighthouse is a useful proxy but not the score Google ranks on.

Slow pages lose users. Field studies consistently show conversion, bounce rate, and session depth all degrading sharply past the "good" thresholds. Core Web Vitals are also a confirmed Google ranking signal as part of page experience.

## How to implement

**LCP** — identify the LCP element (usually a hero image or heading) and make it arrive fast. Serve it from the origin, preload it, avoid lazy-loading it, and keep it out of client-rendered components.

**INP** — break up long JavaScript tasks, defer non-critical work, and avoid heavy work in event handlers. Inside a long task, `await scheduler.yield()` between chunks so the browser can process input — the continuation runs at boosted priority, so your work finishes before other queued tasks. To schedule new low-priority work, use `scheduler.postTask(fn, {priority: 'background'})` or `requestIdleCallback`. Audit third-party scripts.

**CLS** — set explicit `width` and `height` on images, iframes, and video. Reserve space for ads and embeds. Avoid inserting content above existing content. Preload fonts to reduce FOUT swaps.

## Common mistakes

- Optimising lab scores while field data stays red.
- Treating LCP as "first paint" — it is the largest element, often well into the page.
- Lazy-loading the LCP image. It must load eagerly.
- Measuring INP only on the homepage — interaction-heavy pages such as forms and search results are usually the worst offenders.

## Verification

- Check field data in [PageSpeed Insights](https://pagespeed.web.dev) — it pulls from CrUX.
- Use the [web-vitals JavaScript library](https://github.com/GoogleChrome/web-vitals) to send real-user metrics to your analytics.
- In Chrome DevTools, the Performance panel flags LCP, INP, and layout shifts.
---

## critical-css
Source: https://specification.website/spec/performance/critical-css/

---
title: "Critical CSS and render-blocking resources"
category: performance
status: recommended
url: https://specification.website/spec/performance/critical-css/
updated: "2026-09-20T00:00:00.000Z"
sources:
  - title: "web.dev — Extract critical CSS"
    url: "https://web.dev/articles/extract-critical-css"
    publisher: "web.dev"
  - title: "web.dev — Defer non-critical CSS"
    url: "https://web.dev/articles/defer-non-critical-css"
    publisher: "web.dev"
  - title: "MDN — Render-blocking resources"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/Render_blocking"
    publisher: "MDN"
  - title: "Chrome for Developers — Render-blocking requests"
    url: "https://developer.chrome.com/docs/performance/insights/render-blocking"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Critical CSS and render-blocking resources

> Inline the CSS needed for above-the-fold content and defer the rest. Render-blocking resources in <head> are the single biggest cause of slow first paint.

## What it is

A render-blocking resource is one the browser must fetch and parse before it can paint pixels. By default, every `<link rel="stylesheet">` and every synchronous `<script>` in `<head>` blocks rendering.

**Critical CSS** is the subset of your stylesheet needed to render the visible part of the page on first load. Inlined in a `<style>` tag in `<head>`, it lets the browser paint without waiting for the full stylesheet.

```html
<head>
  <style>/* ~14KB of styles for above-the-fold content */</style>
  <link rel="preload" href="/site.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/site.css"></noscript>
</head>
```

## Why it matters

A typical site stylesheet is 100–300KB. On a slow connection, fetching it adds 500ms+ before any pixel appears. That delay shows up directly as poor LCP and First Contentful Paint. Render-blocking JavaScript is even worse — it blocks both parsing and rendering.

Inlining the critical CSS removes one round-trip from the critical path. The non-critical CSS still loads, but in parallel with rendering rather than ahead of it.

## How to implement

**Identify above-the-fold styles.** Tools such as `critical`, `penthouse`, and `critters` parse the rendered page and extract only the rules used in the initial viewport. Build-time generation is fine; per-page is better.

**Inline in `<head>`.** Keep the inlined CSS under ~14KB (one TCP slow-start window) so it fits in the first packet.

**Load the rest asynchronously.** The `preload` + `onload` swap shown above is the standard pattern. A `<noscript>` fallback covers browsers with JavaScript disabled.

**Move JavaScript out of the critical path.** Add `defer` or `type="module"` to script tags. Both fetch in parallel and execute after parsing:

```html
<script src="/app.js" defer></script>
<script type="module" src="/app.mjs"></script>
```

Use `async` only for truly independent third-party scripts.

**Don't block on third-party CSS.** Webfont providers, analytics dashboards, and chat widgets that drop a stylesheet in `<head>` add an unknown origin to your critical path. Self-host or load asynchronously.

**Watch the `media` attribute.** `<link rel="stylesheet" media="print">` does not block rendering. Useful for splitting print styles out.

## Common mistakes

- Inlining the entire stylesheet. The HTML balloons; nothing is cacheable across pages.
- Forgetting the `<noscript>` fallback. Users with JS off see an unstyled page.
- Loading a synchronous `<script>` tag in `<head>` for analytics. Now analytics blocks your LCP.
- Critical CSS generated once for the homepage and reused everywhere. Article pages and product pages need different critical styles.
- Mistaking `async` for `defer`. `async` can execute mid-parse and block rendering.

## Verification

- DevTools → Performance → record a load. The "Render-Blocking" badge marks every blocking request.
- Lighthouse's "Render-blocking requests" insight lists them with estimated savings. (Before Lighthouse 13 this was the "Eliminate render-blocking resources" audit.)
- View source: every non-critical `<link rel="stylesheet">` should be deferred; every `<script>` in `<head>` should have `defer` or `async`.
---

## css-containment
Source: https://specification.website/spec/performance/css-containment/

---
title: "CSS containment"
category: performance
status: optional
url: https://specification.website/spec/performance/css-containment/
updated: "2026-05-29T16:40:22.000Z"
sources:
  - title: "CSS Containment Module Level 2"
    url: "https://drafts.csswg.org/css-contain-2/"
    publisher: "W3C"
  - title: "MDN — contain"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain"
    publisher: "MDN"
  - title: "web.dev — content-visibility: boost rendering performance"
    url: "https://web.dev/articles/content-visibility"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# CSS containment

> Use `contain: layout paint style` (or the `contain: content` shorthand) to tell the browser that an element's internals cannot affect the rest of the page, so reflow and repaint stay isolated to that subtree.

## What it is

The `contain` CSS property is a hint to the rendering engine: the element's subtree is independent of the rest of the document, so the browser can scope layout, paint, and style work to it. Four containment types compose:

- **`layout`** — descendants do not affect the layout of anything outside the element, and vice versa.
- **`paint`** — descendants are clipped to the element's box; nothing paints outside it.
- **`style`** — counters and quotes inside the element do not leak out.
- **`size`** — the element's own size is computed without consulting its children. Requires an explicit size or `contain-intrinsic-size`, otherwise the box collapses.

The shorthand `contain: content` is equivalent to `layout paint style` — deliberately excluding `size`, because most components do not have a known intrinsic size. The stricter `contain: strict` adds `size` on top.

## Why it matters

Browsers optimise rendering by computing layout, paint, and style for the smallest possible scope. Without containment, a class change deep inside a card can force the browser to recompute the layout of the surrounding page, because, in principle, an element's children can affect ancestors (think percentage heights, intrinsic sizing, or `position: absolute` escaping). Containment lets you assert that they cannot, so the engine can skip work it would otherwise have to do defensively.

The payoff is largest on pages with many independent components — feeds, grids, dashboards, long article comments — where a single interaction would otherwise invalidate a chunk of the document.

## How to implement

Apply `contain: content` to self-enclosed components — cards, sidebars, widgets, repeated list items — where children stay within the box and have predictable sizing:

```css
.card,
.sidebar-widget,
.feed-item {
  contain: content;
}
```

For off-screen sections, pair with `content-visibility: auto` so the browser can skip rendering entirely until the section approaches the viewport:

```css
article > section {
  content-visibility: auto;
  contain-intrinsic-size: 0 800px;
}
```

## Common mistakes

- **Applying `contain: size` without `contain-intrinsic-size`.** The box collapses to zero in the contained axis, because children no longer contribute to its size.
- **Containing elements whose children must overflow visually.** Tooltips, dropdown menus, and floating labels get clipped by `paint` containment.
- **Reaching for `contain: strict` at the page level.** Sticky positioning, fixed children, and anchor scrolling break when their containing block is unexpectedly isolated.
- **Treating containment as free.** There is a small cost to maintaining the boundary; apply it where you have measured a benefit, not as a reflex.

## Verification

- Chrome DevTools → Performance panel. Record an interaction before and after; recalc-style and layout costs on the contained subtrees should drop.
- DevTools → Rendering → "Paint flashing" and "Layer borders". Confirms the isolation is real — paint should not extend past contained boxes.
- Test scroll and interaction on long pages on a mid-range device. If frame times do not improve, the bottleneck was elsewhere; revert.
---

## dynamic-viewport-units
Source: https://specification.website/spec/performance/dynamic-viewport-units/

---
title: "Dynamic viewport units (dvh, svh, lvh)"
category: performance
status: recommended
url: https://specification.website/spec/performance/dynamic-viewport-units/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "CSS Values and Units Module Level 4 — Viewport-relative lengths"
    url: "https://drafts.csswg.org/css-values-4/#viewport-relative-lengths"
    publisher: "W3C CSSWG"
  - title: "MDN — Viewport-percentage lengths"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length#viewport-percentage_lengths"
    publisher: "MDN"
  - title: "web.dev — The large, small, and dynamic viewport units"
    url: "https://web.dev/blog/viewport-units"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Dynamic viewport units (dvh, svh, lvh)

> On mobile, 100vh is taller than the screen because it ignores the browser's collapsing toolbar. Use dvh, svh, and lvh to size full-height elements to the viewport that is actually visible.

## What it is

`dvh`, `svh`, and `lvh` are viewport-relative length units that describe a *height* the way `vh` always promised to but never delivered on mobile. They come with `vw` siblings (`dvw`, `svw`, `lvw`) and a matching set for the inline and block axes (`vi`, `vb`).

The three height units differ in which mobile viewport they measure:

- **`lvh`** — the **large** viewport: the screen with the browser's URL bar and toolbar *retracted*. `100lvh` is the same as the legacy `100vh`.
- **`svh`** — the **small** viewport: the screen with that chrome *fully shown*. `100svh` is always the safe maximum that fits without scrolling.
- **`dvh`** — the **dynamic** viewport: whatever is visible *right now*. It updates live as the toolbar slides in and out while the user scrolls.

```css
.hero { min-height: 100svh; }   /* never overflows */
.sheet { max-height: 100dvh; }  /* tracks the toolbar live */
```

## Why it matters

On a phone, the browser's toolbar collapses as you scroll down and reappears as you scroll up, so the visible height changes during a single page view. The original `vh` unit resolved to the *largest* possible height. An element set to `height: 100vh` is therefore taller than the screen whenever the toolbar is showing — its bottom edge sits behind the URL bar, hiding a "Continue" button, cutting off a full-screen menu, or leaving a strip that only appears after scrolling.

The dynamic units fix this without JavaScript. For years the workaround was a `resize` listener writing a `--vh` custom property on every frame — janky, and a needless main-thread cost that works against [Core Web Vitals](/spec/performance/core-web-vitals/). The units replace all of it. They are [Baseline](https://web.dev/baseline) and supported in every current browser engine.

## How to implement

- For an element that must **always fit** on first paint — a landing hero, a login screen, a modal — use `svh`. It is the conservative choice that never overflows, in any toolbar state.
- For an element that should **track the visible area** as the chrome moves — a bottom sheet, a slide-out menu, an overlay's max-height — use `dvh`.
- Use `lvh` only when you deliberately want the retracted-toolbar height; it behaves like the old `vh`.
- Keep a `vh` fallback first if you support very old browsers: `height: 100vh; height: 100dvh;`. The cascade ignores the unit it doesn't understand.

This site ships it: the ⌘K search overlay and the mobile navigation menu are capped with `dvh` in `src/styles/global.css`, so neither extends behind the address bar on a phone.

## Common mistakes

- **Animating `dvh`-sized layout.** Because `dvh` changes as the toolbar slides, an element whose `height` is in `dvh` reflows continuously during the scroll, which can look jittery and shift content. For large always-on regions in the scroll flow, prefer `svh`; reserve `dvh` for elements where live tracking is the point. (Capping a modal or menu with `max-height: …dvh` is safe — it's only an upper bound, and an open `<dialog>` locks background scrolling, so the toolbar isn't moving while it shows. That's how this site uses it.)
- **Using `100vh` for a hero and assuming it fits.** It does on desktop and lies on mobile. Switch to `svh`.
- **Reaching for a JavaScript `--vh` hack.** That pattern predates these units and is now pure technical debt.

## Verification

- On a real phone, scroll a page with a `100svh` and a `100vh` section. The `vh` one is cut off at the bottom while the toolbar shows; the `svh` one is not.
- In Chrome or Safari device emulation, toggle the simulated toolbar and confirm `dvh`-sized elements resize while `lvh`-sized ones stay fixed.
---

## early-hints
Source: https://specification.website/spec/performance/early-hints/

---
title: "103 Early Hints"
category: performance
status: optional
url: https://specification.website/spec/performance/early-hints/
updated: "2026-06-29T00:00:00.000Z"
sources:
  - title: "RFC 8297 — An HTTP Status Code for Indicating Hints"
    url: "https://www.rfc-editor.org/rfc/rfc8297.html"
    publisher: "IETF"
  - title: "RFC 8288 — Web Linking (the Link header field)"
    url: "https://www.rfc-editor.org/rfc/rfc8288.html"
    publisher: "IETF"
  - title: "MDN — 103 Early Hints"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/103"
    publisher: "MDN"
  - title: "Chrome for Developers — Faster page loads using server think-time with Early Hints"
    url: "https://developer.chrome.com/docs/web-platform/early-hints"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# 103 Early Hints

> An informational HTTP response that carries Link headers — preload, preconnect — to the browser before the final response is ready, putting server think-time to work.

## What it is

`103 Early Hints` is an informational HTTP status code, defined in RFC 8297. The server sends it _before_ the final response, carrying `Link` header fields that point at resources the final page will need. The browser can act on those hints immediately — opening connections, fetching stylesheets and fonts — while the server is still assembling the real response.

```http
HTTP/2 103 Early Hints
Link: </style.css>; rel=preload; as=style
Link: <https://cdn.example.com>; rel=preconnect

HTTP/2 200 OK
Content-Type: text/html; charset=utf-8
Link: </style.css>; rel=preload; as=style
...
```

This is the over-the-wire counterpart to the `<link rel>` hints described in [resource hints](/spec/performance/resource-hints/): same `rel` keywords, sent ahead of the response instead of waiting in the document head.

## Why it matters

Most pages spend their first moments on _server think-time_ — the database query, the template render, the upstream API call — during which the connection is idle and the browser has nothing to do. Early Hints fills that gap. By the time the `200 OK` arrives, the critical CSS may already be cached and the CDN connection already open, so the browser parses straight through instead of stalling on round-trips. The win is largest exactly where it hurts most: slow backends and high-latency connections.

## How to implement

- Emit a `103` response carrying `Link: …; rel=preload` or `rel=preconnect` for the handful of resources the page genuinely needs first — the LCP image, the critical stylesheet, a font origin.
- Repeat the same `Link` headers on the final response, so clients that ignore `103` still get the hint.
- Only send `103` over **HTTP/2 or later**. Some HTTP/1.1 intermediaries mishandle informational responses, so most clients act on Early Hints only over [HTTP/2 or HTTP/3](/spec/performance/http3/).
- Hint sparingly. As with any preload, hinting twenty things just makes them fight for bandwidth.

Many CDNs and edge platforms can synthesise the `103` automatically from the `Link` headers you already set on the final response, so this is often a configuration toggle rather than application code.

## Common mistakes

- Hinting resources the page does not use early, wasting bandwidth and warming the wrong connections.
- Sending `103` over HTTP/1.1, where intermediaries may corrupt the response.
- Treating it as a replacement for in-document hints — it complements them; keep the `<link rel>` tags too.

## Verification

- DevTools → Network: a hinted resource starts loading before the document response completes, and its initiator is the Early Hints response.
- `curl -I --http2` against the URL shows the `103` block ahead of the `200`.
- Browser support is uneven — Chromium acts on `103`; other engines currently ignore it harmlessly — so measure the gain, treat it as a progressive enhancement, and never depend on it.
---

## font-loading
Source: https://specification.website/spec/performance/font-loading/

---
title: "Web font loading"
category: performance
status: recommended
url: https://specification.website/spec/performance/font-loading/
updated: "2026-08-01T00:00:00.000Z"
sources:
  - title: "MDN — @font-face"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face"
    publisher: "MDN"
  - title: "web.dev — Best practices for fonts"
    url: "https://web.dev/articles/font-best-practices"
    publisher: "web.dev"
  - title: "MDN — font-display"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display"
    publisher: "MDN"
  - title: "web.dev — Avoid invisible text during font loading"
    url: "https://web.dev/articles/avoid-invisible-text"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Web font loading

> Self-host WOFF2 fonts, subset them, set font-display: swap so text is readable while the font loads, and preload the critical face only when it styles above-the-fold content.

## What it is

Web fonts are font files (TTF, OTF, WOFF, WOFF2) downloaded by the browser and applied via `@font-face`. Loading them well means short delay, no flash of invisible text, no layout shift when they swap in.

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

## Why it matters

A custom font that loads late causes one of two bad outcomes: **FOIT** (flash of invisible text — the page renders blank rectangles), or **FOUT** (flash of unstyled text — system font flashes, then jumps to the custom font, causing CLS). Both hurt user experience and Core Web Vitals.

Fonts can also be heavy. A single weight of a Latin font is ~30KB in WOFF2; a full multi-script variable font can be 300KB+. They block paint of the text they style.

## How to implement

**Self-host.** Third-party font services add a DNS lookup, TLS handshake, and a second domain to track. Download the WOFF2 files and serve them from your origin.

**Use WOFF2 only.** All modern browsers support it. WOFF2 is pre-compressed (do not gzip), 30% smaller than WOFF, and 50% smaller than TTF.

**Subset to what you use.** Google Fonts' default Latin subset covers most English-language sites. If your content is English only, drop Cyrillic, Greek, and Vietnamese subsets — that can halve the file. Tools: `pyftsubset`, `glyphhanger`, `subfont`.

**Preload the critical face — when it pays off.** A `<link rel="preload">` issues a high-priority fetch before CSS is parsed, so it competes with the HTML and critical CSS for bandwidth. Worth it when the font styles above-the-fold text *and* you have inlined critical CSS to free up the budget. On slow connections — or when you ship a heavy variable font and only need one weight up top — the preload steals bandwidth from more important requests and can delay first paint. If you use `font-display: optional` with a well-matched fallback, the preload usually buys nothing.

```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
```

`crossorigin` is mandatory even for same-origin fonts — without it the preload misses the cache and the font fetches twice.

**Set `font-display`.** `swap` shows the fallback immediately and swaps when the custom font arrives. `optional` is stricter: if the font isn't cached and ready within ~100ms, the fallback is used permanently — best for CLS. Avoid `block`, which causes FOIT.

**Use variable fonts when you need multiple weights.** A variable font replaces several weight + style files, but each variable file is itself heavier than a single static weight — a Latin-subsetted Inter variable runs ~80–120KB; a single static Inter weight is ~30KB. Break-even is roughly three weights, or a weight plus its italic. Below that, ship the specific static weights.

**Match metrics to reduce shift.** Use `size-adjust`, `ascent-override`, and `descent-override` on the fallback `@font-face` so the swap doesn't reflow the layout.

## Common mistakes

- Loading from `fonts.googleapis.com` and a self-host preload. Double-fetch.
- Preloading without `crossorigin`. Double-fetch.
- Preloading a font without `font-display: swap` (or `optional`) — the preload steals bandwidth from critical CSS *and* you still get a FOIT if the font arrives late.
- Preloading a heavy variable font when only one weight is used above the fold — ship the static weight instead.
- `font-display: block` (or the default `auto`). Causes invisible text for up to 3 seconds.
- Shipping six static weights when a variable font covers all of them; or shipping a variable font when one or two static weights would do.
- Loading the full multi-script font for a Latin-only site.

## Verification

- DevTools → Network → filter by Font. Count requests; check sizes; confirm WOFF2.
- DevTools → Rendering → Emulate "Slow 4G" and reload. Watch for FOIT or large layout shifts.
- Lighthouse "Ensure text remains visible during webfont load" flags missing `font-display`.
---

## http1-workarounds
Source: https://specification.website/spec/performance/http1-workarounds/

---
title: "HTTP/1.1 workarounds: sharding, sprites, and bundling"
category: performance
status: avoid
url: https://specification.website/spec/performance/http1-workarounds/
updated: "2026-06-20T00:00:00.000Z"
sources:
  - title: "RFC 9113 — HTTP/2"
    url: "https://www.rfc-editor.org/rfc/rfc9113"
    publisher: "IETF"
  - title: "MDN — Evolution of HTTP"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP"
    publisher: "MDN"
  - title: "MDN — Connection management in HTTP/1.x"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Connection_management_in_HTTP_1.x"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HTTP/1.1 workarounds: sharding, sprites, and bundling

> Domain sharding and image sprites were workarounds for HTTP/1.1's connection limit; under HTTP/2 and HTTP/3 they hurt — drop them. Bundling is the nuanced one: stop concatenating to cut requests, start doing it to cut bytes.

## What it is

Three habits were invented to dodge one HTTP/1.1 limitation: a browser opens only about six parallel connections per origin, and each connection carries one request at a time.

- **Domain sharding** — splitting assets across extra hostnames (`cdn1.example.com`, `cdn2.example.com`, `assets.example.com`) so the browser opens more connections in total.
- **Image sprites** — combining many small images into one big sheet and using CSS `background-position` to show slices, turning dozens of requests into one.
- **Concatenation** — bundling many CSS or JS files into one file, again to cut the request count.

[HTTP/2 and HTTP/3](/spec/performance/http3/) multiplex unlimited concurrent requests over one connection, so the request count is no longer the thing to optimise for. **Sharding and sprites are now net-negative — drop them. Bundling is different**: the old reason for it is gone, but a new one — compression — has taken its place.

## Why it matters

Sharding and sprites actively fight a multiplexed connection:

- **Sharding** adds DNS lookups, TLS handshakes, and connections, and defeats HTTP/2's single-connection coalescing — the very thing that makes it fast. QUIC's connection migration and 0-RTT only help when traffic stays on one origin.
- **Sprites** force every page to download every icon, including ones it never shows, and bust the whole sheet when one icon changes. Individual images, inline SVG, or an icon font are smaller and cache better.

Bundling is the nuanced case. Stop concatenating to cut requests; that is free now. But compression ratio rises sharply with input size — Brotli and Zstd share a dictionary across the whole stream — so many tiny files each compress in their own weak context and lose to a few larger ones, which also cut per-file parse and decompression overhead. Set against that, one giant bundle busts its cache entry on every edit and ships code for routes the visitor never opens.

## How to implement

Drop sharding (consolidate onto one origin) and sprites (use individual images, inline SVG, or an icon font; [lazy-load](/spec/performance/lazy-loading/) what is below the fold). For bundling, decide by **what blocks paint and what busts the cache, not by request count**:

- **Inline what blocks paint.** Put the [critical, above-the-fold CSS](/spec/performance/critical-css/) in the `<head>` so first paint needs zero extra requests.
- **Concatenate what compresses.** Bundle JS — and the non-critical CSS — into a few files; bigger inputs compress better and parse with less overhead.
- **Split what changes.** Keep frequently-changing code out of long-lived bundles (a stable vendor bundle separate from app code, large routes split out) so one edit does not invalidate the whole download. [Compression Dictionary Transport](/spec/performance/compression-dictionary-transport/) gives cross-version redundancy without a single monolith.

**The default, for most sites: inline all your CSS and ship one JS bundle.** Only split CSS once it grows large enough that re-shipping it inline on every page costs more than the request you save, and only split JS once one bundle is big enough that per-deploy cache-busting or unused-route code costs more than the compression win. Bias toward inlining and concatenating; break the default on measurement, not by reflex.

## Common mistakes

- Carrying a sprite sheet or domain-sharding config forward from an old build without re-checking whether it still helps. It doesn't.
- Splitting JS into hundreds of tiny modules "because HTTP/2 makes requests free" — true for the request, but you lose compression efficiency and add parse overhead.
- Inlining *all* CSS on a large multi-page site — inlined bytes are never cached across navigations, so past a few kilobytes you want the non-critical part in a cached file.

## Verification

- Count hostnames serving static assets. More than one origin for the same site is a sharding smell.
- Look for a single large `sprite.png` / `icons.png` — a candidate to split into real images.
- Check that critical CSS is inline in the HTML and that JS ships as a small number of bundles, not one monolith and not a swarm of modules.
---

## http3
Source: https://specification.website/spec/performance/http3/

---
title: "HTTP/2 and HTTP/3"
category: performance
status: recommended
url: https://specification.website/spec/performance/http3/
updated: "2026-06-20T00:00:00.000Z"
sources:
  - title: "RFC 9114 — HTTP/3"
    url: "https://www.rfc-editor.org/rfc/rfc9114"
    publisher: "IETF"
  - title: "RFC 9113 — HTTP/2"
    url: "https://www.rfc-editor.org/rfc/rfc9113"
    publisher: "IETF"
  - title: "MDN — Evolution of HTTP"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP"
    publisher: "MDN"
  - title: "MDN — Alt-Svc"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Alt-Svc"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HTTP/2 and HTTP/3

> Serve over HTTP/2 at minimum and HTTP/3 where you can. Multiplexing eliminates head-of-line blocking; QUIC removes TCP handshake delays.

## What it is

- **HTTP/1.1** (1997) — one request at a time per connection. Browsers open six parallel connections per origin to compensate. Plain text framing.
- **HTTP/2** (RFC 9113) — binary framing over a single TLS-over-TCP connection. Multiple requests interleaved (multiplexing). Header compression with HPACK.
- **HTTP/3** (RFC 9114) — same semantics as HTTP/2, but over QUIC instead of TCP. QUIC is a UDP-based transport with built-in TLS 1.3 and per-stream flow control.

HTTP/3 is advertised to clients via the `Alt-Svc` header on an HTTP/2 response:

```http
Alt-Svc: h3=":443"; ma=86400
```

After the first HTTP/2 connection, the browser remembers `Alt-Svc` and uses HTTP/3 directly for subsequent requests.

## Why it matters

HTTP/2 fixed HTTP/1.1's head-of-line blocking at the application layer: a single slow response no longer holds up the others on the connection. Combined with header compression, it typically cuts overhead by 30–50% on resource-heavy pages.

HTTP/3 fixes TCP's head-of-line blocking at the transport layer. On a lossy mobile network, a single dropped packet in TCP stalls every stream until it's retransmitted. QUIC streams are independent, so the loss only affects the one stream. HTTP/3 also handles connection migration (e.g. Wi-Fi to cellular) without dropping the connection, and reduces handshake round-trips with 0-RTT.

For users on flaky networks — the majority of mobile users globally — the difference is large and measurable.

## How to implement

**Turn it on at the edge.** Most CDNs (Cloudflare, Fastly, CloudFront, Bunny, Akamai) support HTTP/3 with a single checkbox. The TLS certificate, HSTS, and origin setup don't change.

**Require TLS.** HTTP/2 and HTTP/3 are HTTPS-only in browsers. There is no path forward without a valid certificate.

**Drop HTTP/1.1 optimisations.** Domain sharding, image sprites, and CSS concatenation were workarounds for HTTP/1.1's 6-connection limit. Under HTTP/2 they hurt: they break caching, prevent prioritisation, and inflate transfer sizes. See [HTTP/1.1 workarounds](/spec/performance/http1-workarounds/) for what to drop and why.

**Keep one origin.** HTTP/2 and HTTP/3 reward consolidation. Splitting assets across `cdn1`, `cdn2`, `assets.` forces new connections; on a single origin everything reuses the same one.

**Verify `Alt-Svc`.** If you've enabled HTTP/3 but `Alt-Svc` isn't set, browsers will never upgrade. Most edge providers add it automatically.

## Common mistakes

- TLS 1.0 or 1.1 still configured — HTTP/2 needs TLS 1.2+; HTTP/3 needs TLS 1.3.
- Domain sharding left over from HTTP/1.1 days, forcing extra connections.
- Inlining everything (CSS, JS, SVG) into HTML because that "saves a request" — under HTTP/2 it doesn't save much and it kills caching.
- Firewall or load balancer blocking UDP/443. HTTP/3 won't work and there is no error message — the browser just silently falls back to HTTP/2.

## Verification

- DevTools → Network → right-click the columns header → enable "Protocol". You should see `h2` and ideally `h3` for repeat requests.
- `curl --http3 -I https://example.com` confirms HTTP/3 is reachable.
- [https://http3check.net](https://http3check.net) and Cloudflare Radar both probe HTTP/3 support.
---

## image-optimization
Source: https://specification.website/spec/performance/image-optimization/

---
title: "Image optimisation"
category: performance
status: required
url: https://specification.website/spec/performance/image-optimization/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "HTML Standard — 4.8.4 Images"
    url: "https://html.spec.whatwg.org/multipage/images.html"
    publisher: "WHATWG"
  - title: "MDN — Image file type and format guide"
    url: "https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types"
    publisher: "MDN"
  - title: "web.dev — Serve responsive images"
    url: "https://web.dev/articles/serve-responsive-images"
    publisher: "web.dev"
  - title: "HTTP Archive — Web Almanac: Media"
    url: "https://almanac.httparchive.org/en/2024/media"
    publisher: "HTTP Archive"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Image optimisation

> Serve images in modern formats (AVIF, WebP), at the right size for the viewport, with explicit dimensions. Images are the largest payload on most pages.

## What it is

Image optimisation is the practice of shipping the smallest visually acceptable image for the user's device. It covers format, dimensions, compression, and how the browser chooses between sources.

```html
<img
  src="hero-800.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1600.webp 1600w"
  sizes="(max-width: 600px) 100vw, 800px"
  width="800"
  height="450"
  alt="Wide view of the harbour at dusk"
/>
```

## Why it matters

Images are the single largest contributor to page weight on the web — typically 40–50% of total bytes per the HTTP Archive Web Almanac. They are usually the LCP element, so their delivery directly drives Core Web Vitals. Oversized images also waste mobile data, drain battery, and hurt users on slow connections.

## How to implement

**Use a modern format.** Both AVIF and WebP beat JPEG and PNG by 25–50% at equivalent quality, and AVIF is the smaller of the two. Encode AVIF first: it reached Baseline widely available on 25 July 2026, so it is no longer the risky new format you bolt on behind WebP. The remaining trade-off is time, not support — AVIF encodes far more slowly, which matters for user uploads and large batch jobs, but not for a build step that runs once.

Keep the `<picture>` chain anyway. "Widely available" describes browser versions released over the past two and a half years, not the ones actually installed, and a fallback costs one line:

```html
<picture>
  <source srcset="photo.avif" type="image/avif">
  <source srcset="photo.webp" type="image/webp">
  <img src="photo.jpg" width="1200" height="800" alt="…">
</picture>
```

**Serve responsive sizes.** Generate the same image at several widths and let `srcset` plus `sizes` pick the right one. A 4000px image in a 400px slot wastes ~99% of the bytes.

**Always set `width` and `height`.** The browser computes the aspect ratio and reserves the slot, preventing CLS when the image loads.

**Compress aggressively.** Quality 75–80 in WebP is visually indistinguishable from quality 95 for photos. Use tools such as `sharp`, `squoosh`, or `cwebp`.

**Strip metadata.** EXIF, colour profiles, and thumbnails can add tens of kilobytes per image.

## Common mistakes

- Shipping the original camera JPEG (5MB, 6000px) into a 400px card.
- PNG for photos. PNG is for graphics with sharp edges and few colours.
- Omitting `width` and `height`, then wondering why CLS is poor.
- Single fixed `src` with no `srcset` — mobile users download the desktop image.
- Serving an "optimised" image that is still 1MB because compression was set to 100.

## Verification

- DevTools → Network → Img. Sort by size. Anything over 200KB needs a second look.
- Lighthouse flags "Properly size images" and "Serve images in next-gen formats".
- Run [Squoosh](https://squoosh.app) on the worst offenders and compare.
---

## lazy-loading
Source: https://specification.website/spec/performance/lazy-loading/

---
title: "Lazy loading images, iframes, and video"
category: performance
status: recommended
url: https://specification.website/spec/performance/lazy-loading/
updated: "2026-05-29T09:51:43.000Z"
sources:
  - title: "MDN — <img> loading attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#loading"
    publisher: "MDN"
  - title: "MDN — <iframe> loading attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#loading"
    publisher: "MDN"
  - title: "MDN — <video> loading attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video#loading"
    publisher: "MDN"
  - title: "HTML Living Standard — The video element"
    url: "https://html.spec.whatwg.org/multipage/media.html#the-video-element"
    publisher: "WHATWG"
  - title: "web.dev — Browser-level image lazy loading"
    url: "https://web.dev/articles/browser-level-image-lazy-loading"
    publisher: "web.dev"
  - title: "MDN — decoding attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#decoding"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Lazy loading images, iframes, and video

> Native lazy loading defers off-screen images, iframes, and (recently) video until the user scrolls near them. Use loading="lazy" — but never on the LCP element.

## What it is

The `loading` attribute lets the browser defer fetching a resource until it is close to the viewport. It is a single HTML attribute — no JavaScript, no IntersectionObserver. It applies to three elements:

```html
<img src="diagram.webp" width="800" height="600" loading="lazy" decoding="async" alt="…">
<iframe src="https://www.youtube.com/embed/…" loading="lazy" title="Demo"></iframe>
<video src="clip.mp4" loading="lazy" controls width="800" height="450"></video>
```

Valid values: `lazy` (defer), `eager` (load immediately — the default).

`<img>` has supported `loading="lazy"` since Chrome 77 (2019) and is universally available across modern browsers. `<iframe>` followed shortly after. **`<video loading="lazy">` is the newest member** — added to the HTML Living Standard in 2026 and shipping in Chromium-based browsers; treat it as progressive enhancement, since older browsers simply ignore the attribute and fall back to the element's existing `preload` behaviour.

## Why it matters

A typical article page has a dozen images below the fold that the user may never scroll to. Loading them eagerly costs bandwidth, blocks more important requests, and steals decode time from the main thread. Lazy loading defers that work, often cutting initial bytes by 30–60% on long pages.

`decoding="async"` is complementary: it lets the browser decode the image off the main thread, so the image arriving doesn't jank scrolling or interactions.

## How to implement

**Default off-screen images to lazy.** Anything below the fold — gallery thumbnails, author avatars, embedded tweets, YouTube embeds — should be `loading="lazy"`.

**Keep the LCP image eager.** The hero image, the article lead, the product photo — these must not be lazy-loaded. Browsers honour `loading="lazy"` even when the image is just below the fold on a small viewport, and the LCP cost is significant. When in doubt, use `loading="eager"` (or omit the attribute) for above-the-fold images.

**Add `decoding="async"` to all images.** It has no downside and helps with main-thread responsiveness.

**Lazy-load iframes by default.** YouTube and map embeds pull hundreds of kilobytes of JavaScript on every page view. `loading="lazy"` on the iframe defers all of it.

**Lazy-load below-the-fold video.** Combine `loading="lazy"` with `preload="none"` (or `preload="metadata"` if you need the poster frame) so neither the video bytes nor its metadata are fetched until the user reaches it. In older browsers without `loading="lazy"` support, `preload` alone still gives you most of the win.

```html
<video loading="lazy" preload="none" poster="poster.webp" controls
       width="800" height="450">
  <source src="clip.av1.mp4" type="video/mp4; codecs=av01.0.05M.08">
  <source src="clip.h264.mp4" type="video/mp4; codecs=avc1.42E01E">
</video>
```

**Keep `width` and `height`.** Lazy loading does not change layout — without dimensions you still get CLS when the resource arrives.

## Common mistakes

- `loading="lazy"` on the LCP image. The single biggest lazy-loading mistake. Lighthouse and PageSpeed Insights flag it explicitly.
- Custom JavaScript lazy-loaders running on top of native lazy loading, doubling the work.
- Lazy-loading every image to "be safe" — the first screenful must load eagerly.
- Omitting dimensions, so lazy-loaded images shift the layout on arrival.

## Verification

- DevTools → Network → throttle to "Slow 4G", reload, watch which images fetch immediately and which wait for scroll.
- Lighthouse audit: "Largest Contentful Paint image was lazily loaded" is a hard failure to fix.
- View source: every below-the-fold `<img>` and `<iframe>` should have `loading="lazy"`.
---

## no-vary-search
Source: https://specification.website/spec/performance/no-vary-search/

---
title: "No-Vary-Search response header"
category: performance
status: recommended
url: https://specification.website/spec/performance/no-vary-search/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "draft-ietf-httpbis-no-vary-search — The No-Vary-Search HTTP Caching Extension"
    url: "https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-no-vary-search"
    publisher: "IETF"
  - title: "MDN — No-Vary-Search"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/No-Vary-Search"
    publisher: "MDN"
  - title: "Chrome Status — No-Vary-Search"
    url: "https://chromestatus.com/feature/5202380930678784"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# No-Vary-Search response header

> The `No-Vary-Search` response header tells browsers and caches that some URL query parameters (tracking, UTM, sort order) do not change the response. The cached entry for the canonical URL is reused for variants — fewer fetches, better prefetch hits, less duplicate work.

## What it is

`No-Vary-Search` is a response header that tells the browser's HTTP cache (and the Speculation Rules prefetch/prerender cache) which URL query parameters are irrelevant to the response. By default, every distinct query string is treated as a distinct resource. `No-Vary-Search` lets the server say "the response for `/products?utm_source=x` is identical to the response for `/products`" without redirecting.

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
No-Vary-Search: params=("utm_source" "utm_medium" "utm_campaign" "utm_term" "utm_content"), key-order
```

The directives are small and precise:

- `params=("a" "b")` — these specific parameters do not change the response.
- `params` (no value) — none of the query parameters change the response.
- `except=("page")` — every parameter except these does not change the response (inverse form).
- `key-order` — the order of parameters in the URL does not matter.

## Why it matters

- **Prefetch hits land more often.** Pages prefetched via [Speculation Rules](/spec/performance/speculation-rules/) only count as a hit if the final URL matches. Without `No-Vary-Search`, a click that adds `?utm_source=newsletter` misses the prefetch and re-fetches the page.
- **CDN cache hit rate improves.** The same logic applies to shared caches: declaring that tracking params do not vary the response lets one cached object serve every campaign.
- **Less duplicate work for archives and crawlers.** Search engines treat URL variants as distinct pages by default; the [canonical link](/spec/foundations/canonical-url/) collapses them for indexing, but `No-Vary-Search` collapses them at the HTTP layer too.
- **Cheap to ship.** It is one response header. No code changes, no URL rewriting, no redirects to debug.

## How to implement

- **List the tracking parameters you actually receive.** UTMs are the universal set. Add `gclid`, `fbclid`, `msclkid`, `mc_cid`, `mc_eid`, and anything else your analytics pipeline adds and your application logic does not consume.
- **Set the header at the edge.** Like [Cache-Control](/spec/performance/cache-control/), this belongs in CDN or reverse-proxy config so it applies to every response in the matched path.

```http
No-Vary-Search: params=("utm_source" "utm_medium" "utm_campaign" "utm_content" "utm_term"
                        "gclid" "fbclid" "msclkid"), key-order
```

- **Add `key-order` unless ordering matters.** It almost never does for query strings, and it catches the common case where the same parameters arrive in different orders.
- **Apply it broadly.** Pages, RSS, JSON endpoints, static assets — anywhere a tracking parameter might end up appended.
- **Combine with [Speculation Rules](/spec/performance/speculation-rules/).** Without `No-Vary-Search`, an `eagerness: "moderate"` prefetch is wasted the moment a tracking param is added to the link.

**This site ships it.** `specification.website` sets `No-Vary-Search` on every response via [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers), covering the common UTM parameters plus `gclid`, `fbclid`, `msclkid`, `mc_cid`, `mc_eid`, and `ref`, with `key-order` so parameter ordering is also ignored.

## Common mistakes

- Listing a parameter that does change the response. Adding `page` or `sort` to `params=` collapses different pages into one cached entry. Use `except=` to be safe when in doubt.
- Forgetting that the directive is per-response. The header has to ship on the response that should be reused; setting it only on the variant URL has no effect.
- Treating `No-Vary-Search` as a substitute for `rel="canonical"`. The two solve different problems: this one tells caches not to vary; the canonical tells search engines which URL to index. Ship both.
- Shipping the header without testing prefetch hits. Use Chrome DevTools' Application → Speculative loads panel; a hit will be labelled accordingly.

## Verification

- `curl -sI https://example.com/ | grep -i ^no-vary-search` returns the configured directives.
- In Chrome DevTools, prefetch a URL via Speculation Rules, then navigate to the same URL with extra UTM parameters appended. The Application panel logs it as a prefetch hit.
- Hit the page twice with different UTM strings while watching the CDN's cache-status header (`Cf-Cache-Status`, `X-Cache`, etc.) — both should be `HIT` after the first miss.
- A cache analytics dashboard shows fewer near-duplicate URL entries.
---

## preload-prefetch-preconnect
Source: https://specification.website/spec/performance/preload-prefetch-preconnect/

---
title: "Preload, prefetch, preconnect"
category: performance
status: recommended
url: https://specification.website/spec/performance/preload-prefetch-preconnect/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "MDN — <link>: The External Resource Link element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link"
    publisher: "MDN"
  - title: "web.dev — Preload critical assets to improve loading speed"
    url: "https://web.dev/articles/preload-critical-assets"
    publisher: "web.dev"
  - title: "web.dev — Establish network connections early to improve perceived page speed"
    url: "https://web.dev/articles/preconnect-and-dns-prefetch"
    publisher: "web.dev"
  - title: "MDN — rel=preload"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Preload, prefetch, preconnect

> Resource hints let you tell the browser what is coming. Preload the LCP image and critical fonts, preconnect to third-party origins, prefetch the next navigation.

## What it is

Four `<link rel>` hints in the head tell the browser to start work earlier than the parser would:

- **preconnect** — open a TCP+TLS connection now, body comes later.
- **dns-prefetch** — resolve DNS only. The cheap fallback when preconnect is too aggressive.
- **preload** — fetch this exact resource now at high priority.
- **prefetch** — fetch this resource at low priority for a future navigation.

```html
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="https://analytics.example.com">
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">
<link rel="prefetch" href="/next-article" as="document">
```

## Why it matters

The browser only discovers resources as it parses HTML and CSS. By the time it sees a `<link rel="stylesheet">` that references a font, several round-trips have already passed. Hints move that discovery earlier — sometimes saving 200–500ms on the LCP element.

But a hint does not add bandwidth or make the connection faster. `preload` in particular is not an accelerate button. The pipe is fixed, so every byte it pulls forward is a byte something else waits for. It helps only a resource the parser would otherwise discover late, such as a font referenced from CSS or an LCP image injected by script. Preload something already visible early in the HTML and you gain nothing, because the preload scanner found it anyway. Preload a dozen things and they fight for the same bandwidth, starving the one request that sets your LCP. Hint the few late-discovered resources on the critical path, and nothing else.

## How to implement

**Preload the LCP image.** If your LCP is a hero image, preload it. Combine with `fetchpriority="high"` so it jumps the queue. Do not preload images that already appear early in the HTML — the preload scanner finds them anyway.

**Preload critical fonts — selectively.** Fonts requested from inside CSS are discovered late, so preloading shortens the path: `as="font" type="font/woff2" crossorigin`. The `crossorigin` attribute is mandatory even for same-origin fonts. The preload competes with critical CSS for bandwidth though, so reserve it for fonts that style above-the-fold text, and always pair with `font-display: swap` or `optional` — see [Web font loading](/spec/performance/font-loading/) for the full tradeoff.

**Preconnect to third-party origins.** If you load images from a CDN, fonts from Google, or analytics from a third party, preconnect saves the TCP+TLS handshake (~100–300ms). Use `crossorigin` for resources fetched with CORS (fonts, fetch, modules).

**Use dns-prefetch as a fallback.** Older browsers and proxies sometimes ignore preconnect. Pair it with dns-prefetch:

```html
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
<link rel="dns-prefetch" href="https://cdn.example.com">
```

**Prefetch the next likely page.** On a landing page, prefetch the obvious next step. The fetch happens at low priority and won't interfere with the current page.

## Common mistakes

- Preloading 10 things. They all fight for bandwidth and nothing wins.
- Forgetting `crossorigin` on font preloads — the browser then fetches the font twice.
- Preconnecting to origins you don't actually use.
- Preloading a stylesheet then forgetting to add `<link rel="stylesheet">`. The preload sits unused; Chrome logs a warning.
- Using prefetch for the LCP image of the current page. That is preload's job.

## Verification

- DevTools → Network → look at the priority and start time of LCP and font requests.
- Chrome logs `<link rel="preload"> was preloaded using link preload but not used within a few seconds` for misused hints.
- Lighthouse "Preload key requests" and "Preconnect to required origins" surface missing hints.
---

## resource-hints
Source: https://specification.website/spec/performance/resource-hints/

---
title: "Resource hints overview"
category: performance
status: recommended
url: https://specification.website/spec/performance/resource-hints/
updated: "2026-07-23T00:00:00.000Z"
sources:
  - title: "WHATWG HTML — Link types"
    url: "https://html.spec.whatwg.org/multipage/links.html#linkTypes"
    publisher: "WHATWG"
  - title: "MDN — <link>: The External Resource Link element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link"
    publisher: "MDN"
  - title: "web.dev — Preload critical assets"
    url: "https://web.dev/articles/preload-critical-assets"
    publisher: "web.dev"
  - title: "MDN — rel=modulepreload"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Resource hints overview

> Five resource hints — dns-prefetch, preconnect, preload, modulepreload, prefetch — cover every stage of the request lifecycle. Pick the right one for the job.

## What it is

Resource hints are `<link rel>` declarations that tell the browser to do work earlier than the HTML parser would otherwise discover it. All five live in one place: the WHATWG HTML Standard's link types. There is no separate "Resource Hints" specification any more — the W3C document of that name was discontinued and its URL now redirects into HTML.

| Hint | What it does | Use when |
|---|---|---|
| `dns-prefetch` | Resolve DNS for the origin. | Cheap fallback for older browsers; large numbers of secondary origins. |
| `preconnect` | DNS + TCP + TLS handshake to the origin. | You will definitely request from this origin in the next ~10 seconds. |
| `preload` | Fetch a specific resource at high priority. | Late-discovered critical resource (LCP image, font referenced from CSS). |
| `modulepreload` | Fetch and parse an ES module, including its dependency graph. | Critical JS module that would otherwise be discovered after the parser hits `<script type="module">`. |
| `prefetch` | Fetch a resource at low priority for a future navigation. | The user's next likely page (article → comments, search → first result). |

## Why it matters

The browser's parser discovers resources in source order. Anything referenced from CSS, JavaScript, or a late `<link>` is found late, after several round-trips. Hints move discovery to the start of the document so work overlaps with the rest of HTML parsing.

Used wrongly, hints **harm** performance — preloading 20 things slows the LCP element because everything fights for the same bandwidth. Treat each hint as a deliberate decision.

## How to implement

A practical decision flow:

1. **Is this for the current page?**
   - Yes → next question.
   - No, it's the next navigation → `prefetch` (as `document` for HTML, otherwise blank).

2. **Is it a specific URL the browser would otherwise discover late?**
   - Yes, and it's an ES module → `modulepreload`.
   - Yes, anything else → `preload` with the correct `as=` (image, font, style, script, fetch).
   - No, you don't know the URL yet but you know the origin → next question.

3. **How many requests will you make to that origin?**
   - 1+ — use `preconnect` (with `crossorigin` if the requests use CORS).
   - 0–1 maybe — use `dns-prefetch` only. Cheaper.

Example head with each hint serving a distinct purpose:

```html
<!-- We'll request the hero from the CDN -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>

<!-- Analytics may or may not fire on this page -->
<link rel="dns-prefetch" href="https://stats.example.com">

<!-- Font is referenced from CSS, would be discovered late -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>

<!-- LCP image, eager loading + high priority -->
<link rel="preload" href="/hero.avif" as="image" fetchpriority="high">

<!-- Critical module imported by /app.mjs -->
<link rel="modulepreload" href="/router.mjs">

<!-- After the user reads this article they often hit the next one -->
<link rel="prefetch" href="/articles/next" as="document">
```

See [preload-prefetch-preconnect](/spec/performance/preload-prefetch-preconnect/) for syntax details and gotchas.

## Common mistakes

- Preloading the same resource that is already referenced by a `<link rel="stylesheet">` higher in the head. The preload scanner finds it; the hint is noise.
- Mixing `preload` and `prefetch` semantics. `preload` is for the current page; `prefetch` is for the next one.
- Forgetting `crossorigin` on font preloads or preconnects to CORS origins.
- `modulepreload` on a non-module script. Use `preload as="script"` for classic scripts.
- More than ~5 hints in the head. Each one competes for bandwidth.

## Verification

- DevTools → Network → check the start time and priority of hinted resources. Hints should pull them left.
- Chrome console logs unused preloads after a few seconds.
- Lighthouse "Preload key requests" and "Preconnect to required origins" cover the common cases.
---

## script-loading
Source: https://specification.website/spec/performance/script-loading/

---
title: "Script loading — defer, async, module"
category: performance
status: recommended
url: https://specification.website/spec/performance/script-loading/
updated: "2026-09-20T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — The script element"
    url: "https://html.spec.whatwg.org/multipage/scripting.html#the-script-element"
    publisher: "WHATWG"
  - title: "MDN — <script>"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script"
    publisher: "MDN"
  - title: "Chrome for Developers — Render-blocking requests"
    url: "https://developer.chrome.com/docs/performance/insights/render-blocking"
    publisher: "Google"
  - title: "web.dev — JavaScript module scripts"
    url: "https://web.dev/articles/modulepreload"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Script loading — defer, async, module

> Choose the right script-loading attribute for every <script>: defer for app code, async for independent third-party, type=module for modern code. Bare <script> in <head> is always wrong.

## What it is

The `<script>` element has four loading modes that differ in *when the browser pauses HTML parsing* and *when the script runs*. Pick the wrong one and you block paint, break execution order, or ship code older browsers cannot evaluate.

```html
<!-- 1. Classic blocking — never use in <head> -->
<script src="/app.js"></script>

<!-- 2. async — parallel download, runs as soon as ready, may run before DOMContentLoaded -->
<script src="https://cdn.example.com/analytics.js" async
        integrity="sha384-OqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>

<!-- 3. defer — parallel download, runs after parsing in document order -->
<script src="/app.js" defer></script>

<!-- 4. module — parallel download, deferred by default, ESM with imports -->
<script src="/app.js" type="module"></script>
```

Plus the platform extras: `nomodule` for legacy fallback, `crossorigin` for CORS, `integrity` for [SRI](/spec/security/subresource-integrity/), `fetchpriority` for prioritisation hints, `blocking="render"` for the rare case you genuinely need a blocking script.

## Why it matters

A `<script>` in `<head>` with no `async`, `defer`, or `type="module"` halts HTML parsing while it downloads *and* executes. On a slow network, that one tag can delay the first paint by seconds. Done wrong site-wide, render-blocking scripts are the single biggest cause of poor [LCP](/spec/performance/core-web-vitals/) and the most common Lighthouse failure on real sites.

The four modes:

- **Blocking** — parser stops, browser fetches, browser executes, parser resumes. Catastrophic in `<head>`. Acceptable only for tiny inline scripts that must run before paint (e.g. a critical CSP nonce setter, a colour-scheme fix).
- **`async`** — parser does not stop; script downloads in parallel; runs as soon as it arrives, *in arrival order*, possibly mid-parse. Right for self-contained third-party code that doesn't depend on your DOM (analytics, error reporters).
- **`defer`** — parser does not stop; script downloads in parallel; runs in document order *after* the parser finishes, before `DOMContentLoaded`. Right for your application code that depends on the DOM and on other scripts in order.
- **`type="module"`** — `defer` semantics by default; supports `import`; runs in strict mode; deduplicates by URL. Right for modern ES modules.

For first-party app code, the practical answer in 2026 is almost always `type="module"` or `defer`, placed in `<head>`.

## How to implement

**Default to `<script defer src="…">` in `<head>` for app code.** It starts downloading early (parallel with HTML), runs in order, and runs before `DOMContentLoaded`. Cleaner than placing scripts at the end of `<body>`, equally non-blocking, and works in every browser that matters.

```html
<head>
  <script src="/app.js" defer></script>
  <script src="/widget.js" defer></script>
</head>
```

`app.js` runs before `widget.js`. Both run before `DOMContentLoaded`.

**Use `async` for independent third-party.** Analytics, A/B tooling, chat widgets — anything that doesn't depend on your code or DOM order. Always pair with [Subresource Integrity](/spec/security/subresource-integrity/) and `crossorigin="anonymous"` so a compromised CDN cannot ship modified code to your visitors:

```html
<script src="https://cdn.example.com/widget.js" async
        integrity="sha384-OqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```

Some vendors (rolling-release analytics, A/B platforms) ship a script whose contents change at the vendor's discretion and therefore cannot be pinned with SRI. In that case the integrity guarantee becomes "I trust this vendor with my origin" — make that an explicit risk decision, document it, and consider a [strict CSP](/spec/security/content-security-policy/) with a per-deploy allow-list as compensating control.

If two third-party scripts depend on each other, neither can be `async`. Use `defer` on both.

**Use `type="module"` for modern code.** It's `defer` by default, supports `import`, and gives you a single canonical place for tree-shaking, code-splitting, and dynamic `import()` for route-level lazy loading.

```html
<script type="module" src="/app.js"></script>
```

**Preload module dependencies.** Modules fetched via `import` are discovered lazily — preload them so the browser starts fetching during initial parse:

```html
<link rel="modulepreload" href="/lib/router.js">
<link rel="modulepreload" href="/lib/store.js">
<script type="module" src="/app.js"></script>
```

See [resource hints](/spec/performance/resource-hints/) for the decision table.

**Drop the legacy `nomodule` shim.** Every shipping browser in 2026 supports `type="module"`. The `nomodule` fallback was useful in 2018; it now ships a second bundle for users who don't exist.

**Inline tiny critical scripts in `<head>` if and only if** they must run before paint and are small enough that the cost of inlining is less than the cost of a separate request. Theme colour application, CSP setup, FOUC prevention — yes. A 50 KB framework runtime — no.

**Combine with `fetchpriority`** for the rare case you have a script that's deferred but critical:

```html
<script src="/critical.js" defer fetchpriority="high"></script>
```

**Set CSP allow-listing and SRI** ([subresource integrity](/spec/security/subresource-integrity/)) on every third-party script. The loading attribute does not change those obligations.

## Common mistakes

- `<script src="…">` in `<head>` with no attribute. Blocks paint until the script downloads and executes.
- Scripts at the end of `<body>` instead of `<head>` with `defer`. Modern advice is `<head>` + `defer`: the browser discovers the URL earlier and starts the fetch sooner. The body-end pattern is a hold-over from when `defer` was unreliable.
- `async` on a script that depends on another `async` script. Order is racy; you may get a working build by luck on your machine and broken in production.
- Shipping the same module both as `type="module"` *and* via a separate `defer` `<script>`. It downloads and runs twice.
- Forgetting `defer` on the second of two ordered scripts. The first defers, the second is blocking — parser stops mid-execution, partial DOM exposed.
- Inline `<script>` for tracking pixels under a strict [CSP](/spec/security/content-security-policy/) without a nonce or hash. CSP blocks the inline script, the tracker doesn't fire, "why is data missing?" three months later.
- Treating `type="module"` as "must use `import`." It works fine for a single-file module too, and inherits the `defer` behaviour for free.

## Verification

- View source on every page — every `<script src>` should have `defer`, `async`, or `type="module"` unless it is a tiny inline script with a documented reason.
- Chrome DevTools → Network → JS — column "Initiator" should show the script started loading during the initial HTML parse, not after.
- Lighthouse's "Render-blocking requests" insight reports zero offending scripts. (Before Lighthouse 13 this was the "Eliminate render-blocking resources" audit.)
- WebPageTest filmstrip — the first paint should not be delayed by JavaScript download/execution.
- For CSP compatibility, run [CSP Evaluator](https://csp-evaluator.withgoogle.com/) on production headers and confirm every `<script>` is allowed.
---

## scroll-driven-animations
Source: https://specification.website/spec/performance/scroll-driven-animations/

---
title: "Scroll-driven animations"
category: performance
status: optional
url: https://specification.website/spec/performance/scroll-driven-animations/
updated: "2026-08-01T00:00:00.000Z"
sources:
  - title: "CSS Scroll-driven Animations Module Level 1"
    url: "https://drafts.csswg.org/scroll-animations-1/"
    publisher: "W3C"
  - title: "MDN — CSS scroll-driven animations"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations"
    publisher: "MDN"
  - title: "MDN — animation-timeline"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline"
    publisher: "MDN"
  - title: "Chrome for Developers — Scroll-driven animations"
    url: "https://developer.chrome.com/docs/css-ui/scroll-driven-animations"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Scroll-driven animations

> Drive CSS animations from scroll position or element visibility with `scroll-timeline` and `view-timeline`, replacing JS scroll-listener libraries with compositor-thread animation.

## What it is

Scroll-driven animations tie a CSS animation's progress to scroll position instead of the wall clock. The browser provides two timelines.

**`scroll-timeline`** — progress maps to how far a scroll container has been scrolled. Useful for reading-progress bars and parallax tied to the document.

**`view-timeline`** — progress maps to a subject element's intersection with its scrollport. Useful for "reveal as you scroll" effects, sticky-section pinning, and per-element entrance animations.

Anonymous shorthands cover the common cases without naming a timeline:

- `animation-timeline: scroll()` — bind to the nearest scrollable ancestor.
- `animation-timeline: view()` — bind to this element's own viewport intersection.

The colour status is `optional` because nothing breaks if you ship none of this. Where motion is part of the design, however, it is the right answer: it replaces a category of janky JavaScript with a declarative primitive that the compositor can run.

## Why it matters

- **Off the main thread.** Compositor-only properties (`transform`, `opacity`, `filter`) animate without touching JavaScript or layout. No INP cost, no scroll-listener debouncing, no `requestAnimationFrame` loop.
- **No library needed.** Replaces a stack of intersection-observer-plus-rAF code, often shipped as 20–60 kB of JavaScript, with a few lines of CSS.
- **Honours user preferences when you opt in.** Because the motion is yours, you must gate it on `prefers-reduced-motion: reduce` — see [reduced motion](/spec/accessibility/reduced-motion/).
- **Composable with view transitions.** Pair with [view transitions](/spec/performance/view-transitions/) for entrance + navigation animation that stays on the compositor.

## How to implement

Fade an element in as it scrolls into view:

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(1rem); }
  to   { opacity: 1; transform: none; }
}

.reveal {
  animation: fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; }
}
```

`animation-range` tells the browser which slice of the view timeline drives the animation — here, from the element entering the scrollport until it has covered 30% of it.

For a top-of-page reading-progress bar, use `scroll()` instead:

```css
.progress {
  transform-origin: 0 50%;
  animation: progress linear;
  animation-timeline: scroll(root block);
}
@keyframes progress { to { transform: scaleX(1); } }
```

## Common mistakes

- **Animating layout properties** (`width`, `height`, `top`, `margin`) instead of `transform` and `opacity`. The compositor win disappears the moment the browser has to relayout on every frame.
- **Forgetting `prefers-reduced-motion`.** Scroll-driven motion is exactly the kind that triggers vestibular issues. Always provide an opt-out.
- **Replacing an Intersection Observer that runs logic.** Scroll-driven animations animate; they do not fire callbacks. If you need to lazy-init a widget, hydrate an island, or fetch data on visibility, keep the observer — see [visibility-aware rendering](/spec/performance/visibility-aware-rendering/).
- **Reaching for `scroll-timeline` when `view-timeline` would do.** Per-element reveal effects are simpler, more local, and easier to maintain with `view()`. Reserve `scroll()` for document-level effects like progress bars.
- **Long ranges with heavy keyframes.** Keep ranges tight; an animation that runs over half the page tends to feel laggy even when it is technically free.

## Verification

- Chrome DevTools → Animations panel records scroll-driven timelines and lets you scrub them.
- Toggle `prefers-reduced-motion: reduce` in DevTools → Rendering. The motion must disappear, not merely shorten.
- Run a Lighthouse or Web Vitals check. INP should be unaffected; if it regresses, you are animating the wrong property.
- Confirm the page still works with JavaScript disabled — scroll-driven animations are pure CSS and should degrade gracefully where unsupported.
---

## scrollbar-gutter
Source: https://specification.website/spec/performance/scrollbar-gutter/

---
title: "Scrollbar gutter"
category: performance
status: recommended
url: https://specification.website/spec/performance/scrollbar-gutter/
updated: "2026-05-29T16:40:22.000Z"
sources:
  - title: "CSS Overflow Module Level 3 — scrollbar-gutter"
    url: "https://drafts.csswg.org/css-overflow-3/#scrollbar-gutter-property"
    publisher: "W3C CSSWG"
  - title: "MDN — scrollbar-gutter"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter"
    publisher: "MDN"
  - title: "web.dev — scrollbar-gutter and scrollbar-width are Baseline Newly available"
    url: "https://web.dev/blog/baseline-scrollbar-props"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Scrollbar gutter

> Use scrollbar-gutter: stable to reserve scrollbar space and stop horizontal layout shift between pages or states that overflow vs. don't.

## What it is

`scrollbar-gutter` is a CSS property that controls whether a scroll container reserves space for a classic scrollbar even when one isn't currently shown. It takes three values you actually care about:

- **`auto`** (default) — the gutter appears only when content overflows. Short pages have no scrollbar; tall pages do.
- **`stable`** — the gutter is always reserved on the inline-end edge, whether or not the scrollbar is visible.
- **`stable both-edges`** — the gutter is reserved on both inline edges, so horizontal symmetry is preserved.

It only affects *classic* scrollbars — the kind that take layout space, common on Windows and on macOS when "Always show scrollbars" is enabled. Overlay scrollbars (the macOS and mobile default) float over content, so the property has no visible effect there.

```css
html {
  scrollbar-gutter: stable;
}
```

This site ships exactly that on `:root` in `src/styles/global.css`.

## Why it matters

- **No more page-to-page jolt.** A short page has no scrollbar; the next page does. Without `scrollbar-gutter: stable`, the viewport width snaps by 15–17px between navigations and the whole layout jumps sideways.
- **No mid-page jolt either.** The same shift happens within a single page when content grows or shrinks — a filter panel collapsing, an accordion opening, async-loaded content arriving below the fold.
- **Field-CLS friendly.** Layout shift caused by scrollbar appearance counts as real CLS in many implementations. It's a cheap [Core Web Vitals](/spec/performance/core-web-vitals/) win.
- **Animated navigations need it.** Paired with [view transitions](/spec/performance/view-transitions/) and prerendered links, a 15px width snap on swap makes an otherwise polished navigation look amateur.

## How to implement

Apply it once at the root:

```css
:root {
  scrollbar-gutter: stable;
}
```

That's the whole intervention for the common case. If your layout is centred and you want guaranteed symmetry regardless of overflow state:

```css
:root {
  scrollbar-gutter: stable both-edges;
}
```

Apply it to genuinely-scrollable nested regions (a sidebar with its own overflow, a modal body) on the same principle — but only those, not every element with `overflow` set.

## Common mistakes

- Applying it to a small element where the scrollbar is part of the visual design. The gutter then shows even when no scroll is needed. Restrict it to the root viewport or genuinely-scrollable regions.
- Combining it with custom `::-webkit-scrollbar` styling that already reserves layout space. You'll end up with a double gutter.
- Forgetting RTL. `stable` reserves on the inline-end edge — right in LTR, left in RTL. If you need predictable symmetry across both directions, use `stable both-edges`.
- Reaching for it to fix fluctuating content widths inside the page. That's a `min-height`, container query, or `aspect-ratio` job — `scrollbar-gutter` only addresses the scrollbar itself.

## Verification

- Open a short page and a tall page on the same site in the same window. The horizontal position of every element should stay identical. Without `scrollbar-gutter: stable`, it doesn't.
- Chrome DevTools → Rendering → Layout Shift Regions. Navigate between pages; there should be no flash on the right edge.
- Test on a system using overlay scrollbars (macOS default) *and* one using classic scrollbars (Windows default, or macOS Settings → Appearance → "Always" show scrollbars). Only the classic case shows the difference — which is exactly why it has to be tested there.
---

## server-timing
Source: https://specification.website/spec/performance/server-timing/

---
title: "Server-Timing header"
category: performance
status: optional
url: https://specification.website/spec/performance/server-timing/
updated: "2026-06-18T00:00:00.000Z"
sources:
  - title: "Server Timing — the Server-Timing header field"
    url: "https://www.w3.org/TR/server-timing/#the-server-timing-header-field"
    publisher: "W3C"
  - title: "MDN — Server-Timing"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Server-Timing"
    publisher: "MDN"
  - title: "MDN — PerformanceServerTiming"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/PerformanceServerTiming"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Server-Timing header

> Server-Timing surfaces backend metrics — database time, cache hits, edge processing — in browser DevTools and to RUM via the PerformanceServerTiming API. Send it when you measure server-side latency, and keep the values free of sensitive infrastructure detail.

## What it is

`Server-Timing` is an HTTP response header that carries one or more performance metrics about how the server produced the response. Each metric has a name and optional `dur` (duration in milliseconds) and `desc` (label):

```http
Server-Timing: db;dur=53, cache;desc="hit";dur=0.4, edge;dur=12
```

The metrics show up in the browser DevTools network panel against the request, and — for same-origin responses — are readable from JavaScript through the [`PerformanceServerTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceServerTiming) interface, so real-user monitoring (RUM) can collect them alongside [Core Web Vitals](/spec/performance/core-web-vitals/).

> **This site ships it.** Every response sets `Server-Timing: edge;desc="…";dur=…`, measured in the Cloudflare Pages middleware (`functions/_middleware.ts`). Open DevTools → Network, click the document request, and read the Timing tab.

## Why it matters

Browser timing APIs measure the request from the client's side — DNS, connection, time to first byte. They cannot see *why* the server took 600 ms. `Server-Timing` is the only standard channel for the server to attribute that time: how much was the database, how much was a cache miss, how much was rendering. It turns an opaque TTFB into a breakdown you can act on, both interactively in DevTools and in aggregate through RUM.

## How to implement

Emit the header from whatever produces the response — origin server, edge function, or CDN. Measure the work, then format the metrics:

```http
Server-Timing: app;desc="render";dur=42, db;dur=53, cache;desc="miss"
```

Keep names and descriptions short — they are shipped on every response, so verbosity is pure overhead. A metric may carry just a name (`cache;desc="hit"`), a duration, or both.

To read the metrics from JavaScript for RUM:

```js
const [nav] = performance.getEntriesByType("navigation");
for (const { name, duration, description } of nav.serverTiming) {
  // send {name, duration, description} to your analytics endpoint
}
```

## Common mistakes

- **Expecting cross-origin metrics to appear in JavaScript.** `PerformanceServerTiming` is same-origin only. For a CDN or third-party host, the response must send [`Timing-Allow-Origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Timing-Allow-Origin) naming your origin, or `nav.serverTiming` is empty — the DevTools display still works, but automated collection silently does not.
- **Leaking infrastructure detail.** The header is visible to anyone. Internal service names, query counts, and host identifiers are an information-disclosure surface; the [spec warns about this](https://www.w3.org/TR/server-timing/#privacy-and-security). Send coarse labels publicly, or gate richer metrics behind authentication.
- **Sending it as a trailer expecting the Fetch API to read it.** `Server-Timing` as an HTTP trailer is consumed only by DevTools, not by `fetch()` or the Performance API.
---

## speculation-rules
Source: https://specification.website/spec/performance/speculation-rules/

---
title: "Speculation Rules"
category: performance
status: recommended
url: https://specification.website/spec/performance/speculation-rules/
updated: "2026-06-10T00:00:00.000Z"
sources:
  - title: "MDN — Speculation Rules API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API"
    publisher: "MDN"
  - title: "WHATWG HTML — Speculative loading"
    url: "https://html.spec.whatwg.org/multipage/speculative-loading.html#speculative-loading"
    publisher: "WHATWG"
  - title: "Chrome for Developers — Speculation Rules"
    url: "https://developer.chrome.com/docs/web-platform/prerender-pages"
    publisher: "Google"
  - title: "web.dev — Prefetching, prerendering, and service worker precaching"
    url: "https://web.dev/learn/performance/prefetching-prerendering-precaching"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Speculation Rules

> Tell the browser which links to prefetch or prerender before the user clicks. Done well, navigations feel instant; done carelessly, you burn bandwidth on pages nobody visits.

> **This site ships it.** Every page emits a `<script type="speculationrules">` block from `BaseLayout.astro` — `prerender` on `moderate` for HTML same-origin links, `prefetch` on `conservative` as a fallback. The CSP allows the block via `'inline-speculation-rules'` (no `'unsafe-inline'`), and our bot logger drops requests with `Sec-Purpose: prefetch` so the stats stay honest.

## What it is

Speculation Rules let a page declare, in a structured way, which URLs the browser should **prefetch** (download the response in advance) or **prerender** (download *and* render the full page in a hidden background tab). When the user actually clicks, the navigation can complete in milliseconds because the work is already done.

The rules live in a `<script type="speculationrules">` block:

```html
<script type="speculationrules">
{
  "prerender": [{
    "where": { "href_matches": "/spec/*" },
    "eagerness": "moderate"
  }],
  "prefetch": [{
    "where": { "href_matches": "/*" },
    "eagerness": "conservative"
  }]
}
</script>
```

`eagerness` ranges from `conservative` (only on hover/touch) to `eager` (as soon as the rule is parsed). `moderate` is the sensible default — Chromium triggers on hover-with-intent and pointerdown.

This supersedes the older `<link rel="prerender">` hint, which has been removed from the platform.

## Why it matters

- **Sub-100ms navigations.** A prerendered page activates in single-digit milliseconds when the user clicks. It feels like the same page, not a navigation.
- **Improved INP and LCP on the next page.** Because the work is already done, the metrics on the destination page record near-zero delay.
- **Declarative.** No JavaScript event handlers, no IntersectionObserver, no custom hover-detection — the browser implements the heuristics.

Cross-site prerender is gated on [No-Vary-Search](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/No-Vary-Search) and additional restrictions; same-site is the realistic target for most sites.

## How to implement

**Start small.** Prerender only the obvious next pages — the main nav links from the homepage, the next page in a paginated list, the most-clicked CTA. Prerendering everything wastes data on links nobody clicks.

**Prefer `moderate` eagerness over `eager`.** It limits speculation to links the user is about to interact with.

**Combine prefetch + prerender.** Prefetch broadly (cheap), prerender narrowly (expensive). The rules above show the pattern.

**Handle JavaScript correctly.** Prerendered pages run their JS in a hidden, non-active context. Wait for the [`prerenderingchange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/prerenderingchange_event) event before running analytics, starting media, or anything user-visible:

```html
<script>
if (document.prerendering) {
  document.addEventListener('prerenderingchange', () => init(), { once: true });
} else {
  init();
}
</script>
```

**Pair with [view transitions](/spec/performance/view-transitions/)** for cross-document animations on prerendered navigations — together they make MPA navigations feel like an SPA.

**Don't speculate on URLs with side effects.** Logout endpoints, "delete" actions, payment flows. Use `urls`/`href_matches` carefully and exclude them.

## Common mistakes

- `eagerness: "eager"` on every link in the nav. Burns bandwidth and DB load.
- Prerendering pages whose analytics fire on script load instead of `prerenderingchange` — every prerender now counts as a fake pageview.
- Speculation rules that prefetch a page the server treats as cacheable but personalises silently (e.g. session-dependent content). The user lands on stale data.
- Forgetting that prerender is currently Chromium-only. Other browsers ignore the rules entirely — there is no regression, but the upside is browser-specific. Don't take a hard dependency on it.
- Conflicting `Cache-Control: no-store` headers on the target page. Browsers refuse to prerender no-store responses by design.

## Verification

- Chrome DevTools → Application → Speculative Loads. Lists every rule, what it matched, and whether the prerender succeeded.
- `chrome://prerender-internals` for low-level state.
- After implementation, the "Next-page navigation" line in Chrome User Experience Report drops sharply.
- Lighthouse does not yet score speculation rules directly, but field LCP/INP on landing pages reached via speculated navigations should improve.
---

## vary
Source: https://specification.website/spec/performance/vary/

---
title: "Vary — the cache key contract"
category: performance
status: recommended
url: https://specification.website/spec/performance/vary/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "RFC 9110 §12.5.5 — Vary"
    url: "https://www.rfc-editor.org/rfc/rfc9110#name-vary"
    publisher: "IETF"
  - title: "RFC 9111 §4.1 — Calculating Cache Keys with the Vary Header Field"
    url: "https://www.rfc-editor.org/rfc/rfc9111#name-calculating-cache-keys-with"
    publisher: "IETF"
  - title: "MDN — Vary"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Vary — the cache key contract

> Vary lists the request headers your server branched on when it chose this representation. Get it wrong and a cache hands one visitor's response to another; list too much and the cache stops working at all.

## What it is

`Vary` is a response header naming the request header fields your server consulted when it picked which representation to send:

```http
Content-Type: text/markdown; charset=utf-8
Vary: Accept, Accept-Encoding
```

That response can be reused only for requests whose `Accept` and `Accept-Encoding` match the original request, allowing semantics-preserving normalisation. If no stored variant matches, the cache must forward the request.

**`Vary` is not a sibling of `Cache-Control`, and it does not mean "this changes often".** That is the belief most people arrive with, and it is the source of nearly every mistake below. `Cache-Control` decides *whether and for how long* a response may be stored. `Vary` decides *which stored response may be handed back*. Adding `Vary` does not make a response fresher, shorter-lived, or less cacheable — it files it under a longer key. Which is why getting `Vary` wrong does not show up as stale content. It shows up as a cache serving one visitor the response that was built for a different one.

RFC 9111 §4.1 spells out the matching rule: a stored response is only reusable if, for every field named in its `Vary`, the new request's value matches the original request's. `Vary: *` never matches anything, so it means "never reuse", not "vary on everything".

## Why it matters

Content negotiation without `Vary` is broken by construction. Suppose the same URL returns HTML to a browser and Markdown to an agent that sent `Accept: text/markdown`. If the response omits `Vary: Accept`, the first representation a shared cache stores is the one it returns to everybody — so either agents get HTML they asked not to receive, or visitors get raw Markdown in the browser. The origin is negotiating perfectly the whole time; only the cache in front of it is wrong, which is exactly why this survives local testing and appears in production.

The same failure with `Accept-Encoding` is uglier: a client that cannot decode Brotli is handed a Brotli body and renders nothing.

The opposite failure is cache fragmentation. Each additional field can increase the number of variants stored for a URL. Fields with many distinct values, such as `User-Agent`, can divide requests among many entries and reduce reuse. Keep the list limited to fields that affect the response, and measure the cache hit rate. RFC 9110 §12.5.5 discusses the performance cost of expanding the cache key; it does not set a maximum number of fields.

## How to implement

**List exactly what you branched on — no more, no less.** If the server chose this body by reading `Accept-Encoding`, list `Accept-Encoding`. If it did not read `Accept-Language`, do not list it because the site happens to be translated.

**Set it on every representation, including the default.** A cache that stored the HTML response *without* `Vary: Accept` will happily reuse it for a request that asked for Markdown. Both branches of a negotiation need the header, not just the interesting one.

**Verify how your cache normalises values.** RFC 9111 §4.1 permits normalisation that preserves a field's semantics, including reordering values where order is insignificant. `Accept-Encoding: gzip, br` and `Accept-Encoding: br, gzip` therefore need not create different cache entries. Whether your cache merges them depends on its implementation. If you configure a smaller set of cache-key values, make sure that requests mapped to the same key can safely receive the same response.

**Prefer distinct URLs when the representations differ substantially.** `Vary` earns its place for encodings and for format mirrors of the same document. It is a poor way to serve different languages — give each locale its own URL and wire them together with [hreflang](/spec/i18n/hreflang/), so the content is linkable, shareable, and indexable. See [international URL structure](/spec/i18n/international-url-structure/).

**Treat `Vary: Cookie` on a public page as a bug report.** It nearly always means personalisation has leaked into a document that should have been cacheable. Either mark the response `private`, or move the personal fragment to a separate client-side request and keep the page shared.

**Avoid `Vary: User-Agent`.** The one context where it is conventionally sanctioned is serving separate mobile markup from a single URL, and it costs you most of your shared caching to do it. Responsive markup removes the need entirely.

This site ships `Vary: Accept` on every spec page, because each canonical URL returns HTML or Markdown depending on what the client asked for — see [per-page Markdown source endpoints](/spec/agent-readiness/markdown-source-endpoints/).

## Common mistakes

- Negotiating on a header that is not listed in `Vary`. The most damaging error here, and invisible until a cache is in front of you.
- Adding `Vary` to the negotiated response but not to the default one.
- `Vary: User-Agent` on a responsive site. Nothing about the response actually varies; only the hit rate does.
- Assuming the CDN adds `Vary: Accept-Encoding` for you. Many normalise encoding themselves and strip or rewrite the header — verify what leaves the edge, not what leaves the origin.
- Reading `Vary: *` as "varies on everything". It means the response can never be reused from cache.
- Listing fields defensively "in case we negotiate on them later". Every unused field is a permanent tax on the hit rate.

## Verification

- `curl -sI -H 'Accept: text/markdown' https://example.com/page/` and the same request without the header: the `Content-Type` should differ and *both* responses should carry `Vary: Accept`.
- Request the same URL through your CDN with `Accept-Encoding: gzip` and `Accept-Encoding: br`, in both orders. Each response must use an encoding the client accepts; an unencoded response can also be valid. Confirm that cache reuse or edge recompression never serves an incompatible encoding, rather than assuming the CDN stores two separate bodies.
- Scan your responses for `Vary` values listing more than two fields. Each one should trace to a branch that genuinely exists in the server code.
---

## view-transitions
Source: https://specification.website/spec/performance/view-transitions/

---
title: "View Transitions"
category: performance
status: optional
url: https://specification.website/spec/performance/view-transitions/
updated: "2026-07-06T00:00:00.000Z"
sources:
  - title: "MDN — View Transition API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API"
    publisher: "MDN"
  - title: "CSS View Transitions Module Level 2"
    url: "https://drafts.csswg.org/css-view-transitions-2/"
    publisher: "W3C"
  - title: "Chrome for Developers — Same-document view transitions"
    url: "https://developer.chrome.com/docs/web-platform/view-transitions/"
    publisher: "Google"
  - title: "Chrome for Developers — Cross-document view transitions"
    url: "https://developer.chrome.com/docs/web-platform/view-transitions/cross-document"
    publisher: "Google"
  - title: "WebKit — Cross-document view transitions for every website"
    url: "https://webkit.org/blog/16967/two-lines-of-cross-document-view-transitions-code-you-can-use-on-every-website-today/"
    publisher: "WebKit"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# View Transitions

> Animate between states (same-document) or between pages (cross-document) with a single CSS opt-in. Replaces ad-hoc SPA animation libraries with a platform primitive.

## What it is

The View Transitions API animates the change from one DOM state to another — or from one document to the next — by taking a snapshot of the old state, applying the change, taking a snapshot of the new state, and cross-fading between them. There are two flavours.

**Same-document (JS-driven).** A single-page-app pattern. Wrap any DOM mutation in `document.startViewTransition()`:

```js
document.startViewTransition(() => {
  // any DOM update — render new view, swap routes, etc.
  app.navigate(targetUrl);
});
```

**Cross-document (declarative).** Two normal HTML pages opt into a shared transition with a single CSS rule on each:

```css
@view-transition {
  navigation: auto;
}
```

When the user navigates from page A to page B and both pages have this rule, the browser captures A, replaces it with B, and cross-fades. No JavaScript required.

**This site ships it.** [`global.css`](https://github.com/jdevalk/specification.website/blob/main/src/styles/global.css) carries `@view-transition { navigation: auto }`, so cross-document navigations between any two pages on `specification.website` cross-fade on supporting browsers. The matching `prefers-reduced-motion: reduce` rule zeroes `animation-duration` on the view-transition pseudo-elements, so reduced-motion users get an instant swap. Pairs with our [Speculation Rules](/spec/performance/speculation-rules/) prerender — the next page is already in memory, then it animates in.

You shape the animation with the `::view-transition-*` pseudo-elements:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 200ms;
}

/* Tag elements that should animate independently */
.hero {
  view-transition-name: hero;
}
```

## Why it matters

- **Replaces a stack of dependencies.** Framer Motion, GSAP page transitions, hand-rolled FLIP — replaced by a CSS declaration and a pseudo-element.
- **Bridges MPA and SPA UX.** Cross-document view transitions give a traditional multi-page site the feel of an SPA without an SPA's complexity, JavaScript weight, or accessibility regressions.
- **Pairs with [Speculation Rules](/spec/performance/speculation-rules/).** A prerendered next page + a cross-document view transition is the closest the platform gets to "instant, animated" navigation.
- **Respects user preferences.** Browsers honour `prefers-reduced-motion: reduce` and skip the animation. You should still check it explicitly when you customise.

## How to implement

**Cross-document, the minimum:**

```css
@view-transition {
  navigation: auto;
}
```

Ship that on every page you want to participate. The browser handles the rest.

**Same-document, the minimum:**

```js
if (!document.startViewTransition) {
  updateDom();
  return;
}
document.startViewTransition(() => updateDom());
```

Feature-detect — older browsers run the callback synchronously without the transition.

**Tag persistent elements** so they morph instead of cross-fading:

```css
.product-card[data-id="42"] { view-transition-name: product-42; }
```

The same name on both old and new DOM signals "this is the same conceptual element — animate the position/size delta."

**Respect reduced motion:**

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```

**Keep transitions short** — 150–250ms. Longer feels sluggish; shorter feels like a flash.

## Common mistakes

- Same `view-transition-name` on multiple elements at once. The browser logs an error and skips the morph.
- Animating layout-dependent properties (width, height) when you could animate transforms. Transforms compositor-only, layout properties trigger reflow.
- Long animations on data-heavy navigations. The user is waiting for the page, not for your animation. Cap at ~250ms.
- Ignoring `prefers-reduced-motion`. People with vestibular disorders should not be motion-tested for a route change.
- Same-document transitions that swallow exceptions in the callback. Wrap with try/catch and re-throw on transition rejection.

## Verification

- DevTools → Animations panel. Records every view transition with timing.
- `caniuse.com/view-transitions` — current browser support matrix. Same-document is broadly available; cross-document still rolling out (Chromium first, WebKit shipping, Gecko in progress).
- Toggle `prefers-reduced-motion: reduce` in DevTools → Rendering. The transition must disappear, not just shorten.
- Run a Lighthouse audit on the destination page — adding view transitions must not regress LCP or INP. If it does, your animation is too long or too expensive.
---

## visibility-aware-rendering
Source: https://specification.website/spec/performance/visibility-aware-rendering/

---
title: "Visibility-aware rendering"
category: performance
status: optional
url: https://specification.website/spec/performance/visibility-aware-rendering/
updated: "2026-07-06T00:00:00.000Z"
sources:
  - title: "CSS Containment Module Level 2"
    url: "https://drafts.csswg.org/css-contain-2/"
    publisher: "W3C CSSWG"
  - title: "MDN — content-visibility"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility"
    publisher: "MDN"
  - title: "Intersection Observer"
    url: "https://www.w3.org/TR/intersection-observer/"
    publisher: "W3C"
  - title: "MDN — Intersection Observer API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Visibility-aware rendering

> Use `content-visibility` with `contain-intrinsic-size` to skip layout and paint for off-screen content, and Intersection Observer to drive lazy behaviour, instead of scroll and resize listeners.

## What it is

Two platform primitives for "do work only when content is actually visible".

**`content-visibility: auto`** is a CSS property from the Containment module. It tells the browser it may skip rendering work — layout, style, paint — for a subtree while that subtree is off-screen. When the element scrolls near the viewport, the browser renders it as normal.

**Intersection Observer** is a Web API that fires a callback when an element crosses a configurable threshold relative to the viewport (or another scroll root). It replaces hand-rolled `scroll` and `resize` listeners that ran on every frame.

## Why it matters

- **Long pages and card grids get cheaper.** A page with hundreds of sections, product cards, or comments pays the layout and paint cost for all of them on every change. `content-visibility: auto` reduces that to just what is on screen, often a multiple-times reduction in rendering time on initial load and interaction.
- **Scroll handlers stop being the bottleneck.** `scroll` listeners fire dozens of times per second on the main thread. Intersection Observer hands the work to the browser's compositor and only wakes your code at the threshold you asked for.
- **Built-in primitives beat libraries.** Lazy-init for embeds, "load more" triggers, viewport-driven analytics, and reveal animations all collapse to the same small API.

## How to implement

**`content-visibility` on long, repeating sections.** Always pair it with `contain-intrinsic-size` so the browser can reserve layout space for the skipped subtree:

```css
.card,
article > section {
  content-visibility: auto;
  contain-intrinsic-size: auto 600px;
}
```

The intrinsic size is a placeholder used until the real content is rendered. Pick a value close to the real rendered size of the block.

**Intersection Observer for everything `loading="lazy"` doesn't cover.** Native `loading="lazy"` on `<img>` and `<iframe>` already handles the simple image case — reach for IO for widgets, infinite-scroll triggers, and visibility analytics:

```js
const io = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.dataset.seen = 'true';
      io.unobserve(entry.target);
    }
  }
}, { rootMargin: '200px 0px' });

document.querySelectorAll('[data-lazy]').forEach((el) => io.observe(el));
```

`rootMargin` lets you start work *before* the element is on screen, so the user doesn't see a flash of empty space.

## Common mistakes

- **Omitting `contain-intrinsic-size`.** The skipped subtree collapses to zero height, the scrollbar jumps as content streams in, and CLS suffers.
- **Picking an intrinsic size much smaller than reality.** Same scrollbar-jank problem, just spread across the whole page.
- **Using Intersection Observer where `loading="lazy"` would do.** For below-the-fold images and iframes, the HTML attribute is simpler and ships in every modern browser.
- **Debounced scroll listeners.** If you're throttling `scroll` to fake an IO callback, just use IO. It is cheaper and more accurate.
- **Forgetting to `disconnect()`.** In long-lived single-page apps, observers attached to torn-down views leak. Disconnect when the view unmounts.

## Verification

- Chrome DevTools → Performance panel. Record a scroll through a long page with and without `content-visibility: auto`. The "Rendering" and "Painting" bands should shrink sharply.
- DevTools → Rendering → "Layout Shift Regions" and the Web Vitals overlay. Verify CLS does not regress after adding `content-visibility` — if it does, your `contain-intrinsic-size` is wrong.
- In the console, inspect `IntersectionObserverEntry.intersectionRatio` and `entry.isIntersecting` inside your callback to confirm thresholds fire when expected.
- Search the codebase for `addEventListener('scroll'` and `addEventListener('resize'`. Each hit is a candidate for replacement.
---

