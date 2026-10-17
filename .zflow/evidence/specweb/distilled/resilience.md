# Resilience — distilled requirements

Distilled from the resilience section of specification.website (9 pages, local evidence copies under `.zflow/evidence/specweb/resilience/`). Each block is one checkable practice for a consumer-facing website: the requirement, the exact quoted source line, the evidence path, how a read-only auditor verifies it on the live site, and severity.

## error-pages.md (status: required)

### R01 — Missing URLs must return HTTP 404, never 200
- **Requirement:** Requests to non-existent URLs must return HTTP status 404 with a custom error page, never `200 OK` (a soft 404).
- **Quote:** - Return HTTP status `404`. Verify with `curl -I https://example.com/does-not-exist`.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -sI https://example.com/<random-unused-path>` — the status line must be 404 (follow no redirects); the body must be the site's custom error page, not a 200 "page not found" message.
- **Severity:** high

### R02 — Unknown URLs must not redirect to the homepage
- **Requirement:** Unknown URLs must not be redirected (e.g. 302) to the homepage or any other URL that returns 200, which search engines treat as a soft 404.
- **Quote:** - Redirecting all unknown URLs to the homepage with a `302`. Search engines flag this as a soft 404 too.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://example.com/<random-unused-path>` — expect 404 with an empty redirect_url, not a 3xx pointing at `/`.
- **Severity:** medium

### R03 — The 404 page offers a way forward
- **Requirement:** The 404 page must offer the visitor a way forward — a search box, a link to the homepage, and links to the most visited sections.
- **Quote:** - Offer a search box, a link to the homepage, and links to the most visited sections.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -s https://example.com/<random-unused-path>` — the returned HTML must contain a homepage link and a search form or popular-section links (e.g. `grep -Ei 'href="(/|https://example\.com/)"|<form'`).
- **Severity:** medium

### R04 — The 404 page keeps site navigation
- **Requirement:** The 404 page must keep the site's navigation, header, and footer so the user can continue browsing.
- **Quote:** - Keep navigation, header, and footer so the user can carry on browsing.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -s https://example.com/<random-unused-path> | grep -Ei '<nav|<header|<footer'` — the same chrome as normal pages must be present.
- **Severity:** low

### R05 — The 404 message renders without a heavy JS bundle
- **Requirement:** The 404 page's message must be present in the server-returned HTML, not rendered only after a heavy JavaScript bundle loads.
- **Quote:** - A 404 page that loads a heavy JavaScript bundle before showing the message.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -s https://example.com/<random-unused-path> | grep -i 'not found\|could not find'` — the "not found" wording must appear in the raw HTML with scripting disabled/unloaded.
- **Severity:** low

### R06 — Server errors return 500 and leak no implementation details
- **Requirement:** Server-error responses must return HTTP 500 with a page that acknowledges the failure without showing stack traces, framework names, or environment variables.
- **Quote:** - Acknowledge the failure in one sentence. Do not show stack traces, framework names, or environment variables.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** Observable on any 5xx response the audit happens to receive: `curl -s <erroring-url>` must not contain stack traces, file paths, SQL, or debug output (`grep -Ei 'traceback|exception|\.php|Warning:|at /'`). A polite read-only audit cannot force a 500.
- **Severity:** high

### R07 — Multilingual sites serve a localized 404
- **Requirement:** On a multilingual site, the 404 page for a locale-prefixed URL must render in that locale, with a matching `lang` attribute and locale-consistent links.
- **Quote:** **Localise error pages too.** On a multilingual site, the 404 a French visitor lands on should be in French — the URL prefix (`/fr/this-page-does-not-exist`) already tells the server which locale to render. Match the page's `lang` attribute, translate the heading and copy, and keep the search box and home link pointed at the same locale.
- **Source:** .zflow/evidence/specweb/resilience/error-pages.md
- **Verify:** `curl -s https://example.com/fr/<random-unused-path> | grep 'lang="fr"'` — heading and copy in French, home link and search pointed at `/fr/`.
- **Severity:** low

## maintenance-pages.md (status: recommended)

### R08 — Planned downtime returns 503, never 200
- **Requirement:** During planned downtime the site must return HTTP 503 with a maintenance page, never a `200 OK` "we'll be back soon" page that search engines index as real content.
- **Quote:** - `curl -I https://example.com/` returns `HTTP/2 503` and a `Retry-After` header.
- **Source:** .zflow/evidence/specweb/resilience/maintenance-pages.md
- **Verify:** During a maintenance window (or whenever the site currently serves its maintenance page): `curl -sI https://example.com/` must return 503, not 200. Not observable while the site is up.
- **Severity:** medium

### R09 — 503 responses carry Retry-After
- **Requirement:** Every 503 maintenance response must carry a `Retry-After` header, as either an integer number of seconds or an HTTP date.
- **Quote:** - `Retry-After` header: either an integer number of seconds (`Retry-After: 1800`) or an HTTP date (`Retry-After: Wed, 29 May 2026 14:00:00 GMT`). Use the form that matches your confidence in the ETA.
- **Source:** .zflow/evidence/specweb/resilience/maintenance-pages.md
- **Verify:** On any 503 response: `curl -sI https://example.com/ | grep -i '^retry-after:'` — value must be seconds or an HTTP-date.
- **Severity:** medium

### R10 — The maintenance page is self-contained
- **Requirement:** The maintenance page must be a single HTML page with no external dependencies — no analytics, chat widgets, or CDN-hosted fonts that may also be down.
- **Quote:** - Body: a single HTML page that loads no external dependencies, no analytics, and no fonts from CDNs that may also be down.
- **Source:** .zflow/evidence/specweb/resilience/maintenance-pages.md
- **Verify:** When the maintenance body is served: `curl -s https://example.com/ | grep -Ei '<(script|link|img)[^>]+(src|href)="https?://'` — no cross-origin subresources.
- **Severity:** low

### R11 — Rate limiting uses 429 with Retry-After
- **Requirement:** Throttling an individual busy client must use HTTP 429 with a `Retry-After` header, not a 503 or a silent connection drop.
- **Quote:** - A rate-limited client receives `HTTP/2 429` with `Retry-After`, not a `503` or a silent drop.
- **Source:** .zflow/evidence/specweb/resilience/maintenance-pages.md
- **Verify:** Observable only if the auditor is actually throttled: the response must be 429 carrying Retry-After; a polite read-only audit cannot force throttling without abusing the site.
- **Severity:** low

## graceful-degradation.md (status: recommended)

### R12 — Core content and navigation work without JavaScript
- **Requirement:** Core content and primary navigation must be delivered in the initial HTML using real `<a href>` links and real `<form action>` elements, so the page works when JavaScript fails to load or throws.
- **Quote:** - Deliver core content and navigation in the initial HTML. Use real `<a href>` links and real `<form action>` so both function before any script runs.
- **Source:** .zflow/evidence/specweb/resilience/graceful-degradation.md
- **Verify:** `curl -s https://example.com/ | grep -i '<h1'` — the main heading and body copy must be in the server HTML (not an empty `<div id="root">`); reload in a browser with JavaScript disabled (DevTools) and confirm content and primary nav still render and work.
- **Severity:** high

### R13 — Visible content is not gated behind JavaScript
- **Requirement:** Visible content must not be hidden in CSS or gated behind a successful `fetch` waiting for JavaScript to reveal it.
- **Quote:** - Never gate visible content behind a successful `fetch`. If a script reveals or hydrates content, ensure that content is present and readable without it.
- **Source:** .zflow/evidence/specweb/resilience/graceful-degradation.md
- **Verify:** `curl -s https://example.com/<content-page>` — the article/body text must be present in the raw HTML and not cloaked by inline `display:none`/`hidden` awaiting script.
- **Severity:** medium

### R14 — Menus, accordions, dialogs operable natively
- **Requirement:** Menus, accordions, and dialogs must remain operable without JavaScript, using native elements (`<details>`, `<dialog>`) or CSS behaviour.
- **Quote:** - Keep menus, accordions, and dialogs operable with native elements (`<details>`, `<dialog>`) or CSS where you can.
- **Source:** .zflow/evidence/specweb/resilience/graceful-degradation.md
- **Verify:** With JavaScript disabled in a browser, open the primary menu/accordion — it must expand; in HTML, controls are native (`grep -c '<details\|<dialog'`) or the nav links are plain `<a href>` elements reachable without a script.
- **Severity:** low

## offline-support.md (status: optional)

### R15 — Service worker serves a cached offline fallback page
- **Requirement:** A service worker must serve a cached offline fallback page when a navigation request fails, so network failures show the site's own message instead of the browser's dead tab.
- **Quote:** > A service worker can serve a cached offline fallback page when the network fails, keeping the site usable on flaky connections and turning hard failures into graceful ones.
- **Source:** .zflow/evidence/specweb/resilience/offline-support.md
- **Verify:** Find the worker URL in the page source, then `curl -s https://example.com/sw.js` — it must contain a `navigate`-mode fetch handler and a precached offline URL; DevTools → Network → "Offline" + reload renders the fallback; Lighthouse's PWA audit reports the offline behaviour.
- **Severity:** low

### R16 — Cache names are versioned and old caches cleaned
- **Requirement:** The service worker's cache name must include a version string and stale caches must be cleaned up on `activate`, so deploys are not undone by old cached content.
- **Quote:** Always include a version string in the cache name and clean up old caches on `activate`, or you'll ship stale code on the next deploy.
- **Source:** .zflow/evidence/specweb/resilience/offline-support.md
- **Verify:** `curl -s https://example.com/sw.js | grep -iE "cache|activate"` — a versioned cache name (e.g. `v1`) and old-cache deletion logic on activate.
- **Severity:** low

### R17 — The shipped worker has a kill switch
- **Requirement:** A deployed service worker must have a way to be unregistered or disabled in production (e.g. a `?sw=off` kill switch), because it outlives deploys.
- **Quote:** - Ship a `?sw=off` kill switch that unregisters the worker, in case you need to disable it in production.
- **Source:** .zflow/evidence/specweb/resilience/offline-support.md
- **Verify:** `curl -s https://example.com/sw.js | grep -i 'unregister\|sw=off'` — the worker (or the page that registers it) must implement an unregister path.
- **Severity:** low

## pwa-manifest.md (status: recommended)

### R18 — Manifest linked from the HTML head
- **Requirement:** The site must serve a web app manifest at a standard path and link it from every page with `<link rel="manifest">`.
- **Quote:** Serve it at `/site.webmanifest` or `/manifest.webmanifest` and link it from the page:
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** `curl -s https://example.com/ | grep -i 'rel="manifest'"` — a manifest link must exist and its href must fetch successfully.
- **Severity:** medium

### R19 — Manifest carries the installability fields
- **Requirement:** The manifest must contain the fields Chromium requires for installability — `name`/`short_name`, `start_url`, and `display`.
- **Quote:** Required fields for installability in Chromium browsers:
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** `curl -s https://example.com/manifest.webmanifest | jq` — `name` or `short_name`, `start_url`, and `display` must be present and parse.
- **Severity:** low

### R20 — Icons: 192px, 512px, and a maskable variant
- **Requirement:** The manifest must declare at least one 192×192 and one 512×512 PNG icon plus a separate icon with `"purpose": "maskable"`.
- **Quote:** - `icons` — at least one 192×192 and one 512×512 PNG. Add a separate icon with `"purpose": "maskable"` so Android can apply its adaptive icon mask without cropping content.
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** `curl -s https://example.com/manifest.webmanifest | jq '.icons'` — check the sizes/purpose entries; fetch each icon URL (`curl -sI`) for 200 + `image/png`; visually test the maskable icon at maskable.app/editor.
- **Severity:** low

### R21 — theme_color and background_color set
- **Requirement:** The manifest must set `theme_color` and `background_color` so the OS chrome is themed and the splash screen is painted before load.
- **Quote:** - `theme_color` and `background_color` — the first themes the OS chrome, the second paints the splash screen before the page loads.
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** `curl -s https://example.com/manifest.webmanifest | jq '.theme_color, .background_color'` — both must be non-null colour values.
- **Severity:** low

### R22 — start_url resolves to a live page
- **Requirement:** The manifest's `start_url` must point at a URL that returns 200, not a 404 left behind by a URL-structure change.
- **Quote:** - `start_url` pointing to a 404 because someone changed the URL structure.
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** Extract `start_url` from the manifest, then `curl -sI https://example.com<start_url>` — must return 200.
- **Severity:** medium

### R23 — Manifest served with the correct content type
- **Requirement:** The manifest file must be served over HTTPS with HTTP 200 and `Content-Type: application/manifest+json`, or installability silently fails.
- **Quote:** - `curl -I https://example.com/site.webmanifest` returns `200` and `application/manifest+json`.
- **Source:** .zflow/evidence/specweb/resilience/pwa-manifest.md
- **Verify:** `curl -sI https://example.com/site.webmanifest` — status 200 and a `content-type: application/manifest+json` header.
- **Severity:** medium

## monitoring-uptime.md (status: recommended)

### R24 — Status page on a separate host
- **Requirement:** If the site runs a public status page, it must be hosted on a different host and a different DNS provider from the main site so it stays up when the site does not.
- **Quote:** Run the status page on a different host and a different DNS provider from the main site. Common pattern: `status.example.com` resolved through a CDN-fronted static site, with the status records stored at a third-party provider (Statuspage, Instatus, BetterStack, or a static site you update manually). The point is that when the primary site is unreachable, the status page must not be unreachable too.
- **Source:** .zflow/evidence/specweb/resilience/monitoring-uptime.md
- **Verify:** `dig +short status.example.com` vs `dig +short example.com` — different addresses; `dig +short NS status-domain` vs the main domain shows separate DNS.
- **Severity:** low

### R25 — RUM/error beacons post same-origin
- **Requirement:** Real-user-monitoring and error-reporting scripts must scrub personal data client-side and post to a same-origin endpoint that forwards to the collector, not directly to a third-party domain.
- **Quote:** A RUM script is still a script sending visitor data to someone, so it falls under the same rules as any [third-party script](/spec/privacy/third-party-scripts/). Two habits keep it honest. Scrub before sending: drop cookies, request headers and bodies, query strings and user identifiers in the client, so personal data never leaves the browser. And post to a same-origin endpoint that forwards to the collector, rather than to the collector's domain: `connect-src` stays `'self'`, the vendor never sees the visitor's IP address, and the forwarder can enforce its own limits. A forwarder is an open relay unless you make it otherwise: pin a single destination, check the `Origin`, cap the body size and the request rate, and accept only the event types you expect.
- **Source:** .zflow/evidence/specweb/resilience/monitoring-uptime.md
- **Verify:** Load a page in a browser with the network panel open (read-only): any error/vitals beacon must target the site's own origin, not a collector's domain; the page's CSP `connect-src` should not need the vendor origin.
- **Severity:** low

## deprecation-and-sunset.md (status: optional)

### R26 — Deprecated resources announce Deprecation/Sunset headers
- **Requirement:** Deprecated endpoints must emit `Deprecation` and `Sunset` response headers (Sunset not earlier than Deprecation) paired with a `Link` of `rel="deprecation"` and/or `rel="successor-version"` pointing at documentation or the replacement.
- **Quote:** The `Sunset` date **must not be earlier** than the `Deprecation` date. Pair either header with a `Link`: `rel="deprecation"` points to human documentation about the change, `rel="sunset"` to a retirement or migration policy, and `rel="successor-version"` to the replacement.
- **Source:** .zflow/evidence/specweb/resilience/deprecation-and-sunset.md
- **Verify:** For each known deprecated/legacy endpoint: `curl -sI <url> | grep -iE 'deprecation|sunset|link'` — both dates present, ordered correctly, with a rel link.
- **Severity:** low

### R27 — Retired URLs return 410 or 404, not 200
- **Requirement:** Fully retired URLs must return `410 Gone` (or `404`), never `200 OK`, and may keep the `Sunset` header and a `rel="deprecation"` link for latecomers.
- **Quote:** Confirm `Deprecation` carries a date, `Sunset` is not earlier, and a `rel="deprecation"` or `rel="successor-version"` link is present. On a fully retired URL, confirm the status is `410`/`404`, not `200`.
- **Source:** .zflow/evidence/specweb/resilience/deprecation-and-sunset.md
- **Verify:** `curl -sI <retired-url>` — status must be 410 or 404; a 200 on a retired resource fails this check.
- **Severity:** low

### R28 — Deprecation value is a date, not a boolean
- **Requirement:** The `Deprecation` header value must be a structured-field date (RFC 9745), never a bare `true`.
- **Quote:** - Using a bare `Deprecation: true`. The value is a structured-field date, not a boolean.
- **Source:** .zflow/evidence/specweb/resilience/deprecation-and-sunset.md
- **Verify:** `curl -sI <deprecated-url> | grep -i '^deprecation:'` — the value is `@<unix-seconds>` or an HTTP-date, not `true`.
- **Severity:** low

## redirect-by.md (status: recommended)

### R29 — Redirects are signed with Redirect-By
- **Requirement:** Every redirect the software issues must carry a `Redirect-By` (or legacy `X-Redirect-By`) response header whose value names the component responsible, emitted alongside `Location`.
- **Quote:** On every redirect your software issues, set a `Redirect-By` response header whose value names the component responsible. Keep the value to a stable product or service name, the thing a maintainer would recognise, and emit it alongside the `Location` header.
- **Source:** .zflow/evidence/specweb/resilience/redirect-by.md
- **Verify:** `curl -sI <url-known-to-redirect> | grep -i 'redirect-by'` — the header must appear next to `Location`; follow chains with `curl -sIL` and confirm each hop is signed.
- **Severity:** low

### R30 — Redirect-By value leaks no infrastructure detail
- **Requirement:** The `Redirect-By` value must be a stable product or service name only — no version numbers, file paths, or internal rule details that fingerprint the stack.
- **Quote:** **Leaking detail into the value.** Name the software, not its version, its file path, or the internal rule that matched. `Redirect-By: WordPress` is useful; `Redirect-By: WordPress 6.5.2 via wp-content/plugins/acme/redirects.php:214` hands an attacker a fingerprint for free. Attribution should identify the layer, not describe your infrastructure.
- **Source:** .zflow/evidence/specweb/resilience/redirect-by.md
- **Verify:** Inspect every `Redirect-By`/`X-Redirect-By` value in the redirect chain: it must not contain version strings, `.php`/file paths, or rule identifiers.
- **Severity:** low

## ipv6.md (status: recommended)

### R31 — AAAA records published for apex and www
- **Requirement:** Every public host name that serves the site — the apex and `www` at minimum — must publish an IPv6 `AAAA` record alongside its `A` record.
- **Quote:** 2. **Publish `AAAA` records** for every name that has an `A` record: the apex, `www`, and any other host name that serves the site.
- **Source:** .zflow/evidence/specweb/resilience/ipv6.md
- **Verify:** `dig +short AAAA example.com` and `dig +short AAAA www.example.com` — both must return addresses.
- **Severity:** medium

### R32 — The IPv6 address actually answers
- **Requirement:** The web server, firewall, and load balancer must accept connections on ports 80 and 443 over IPv6 with the same certificate, so a published AAAA record is never dead.
- **Quote:** 3. **Make sure the server listens on IPv6.** The web server, the firewall, and any load balancer all need to accept connections on ports 80 and 443 over IPv6, with the same certificate.
- **Source:** .zflow/evidence/specweb/resilience/ipv6.md
- **Verify:** `curl -6 -sI https://example.com/` from an IPv6-capable network — the request must complete with a valid certificate and the expected status; a timeout or TLS failure next to a published AAAA fails this check.
- **Severity:** high

### R33 — IPv6 and IPv4 serve the same site
- **Requirement:** The site served over IPv6 must be identical to the IPv4 one — same content, same HTTP-to-HTTPS and apex/www redirects, same security headers.
- **Quote:** 4. **Serve the same site on both.** The same content, the same redirects (HTTP to HTTPS, apex to `www` or the reverse), the same security headers. Internet.nl compares the two responses and flags differences.
- **Source:** .zflow/evidence/specweb/resilience/ipv6.md
- **Verify:** Compare `curl -6 -sI https://example.com/` with `curl -4 -sI https://example.com/` — same status, redirects, and headers; or run the Internet.nl website test, whose IPv6 section flags differences.
- **Severity:** medium

### R34 — Authoritative name servers reachable over IPv6
- **Requirement:** The domain's authoritative name servers must publish their own AAAA records, with at least two reachable over IPv6, so IPv6-only resolvers can resolve the zone.
- **Quote:** 5. **Use name servers with IPv6.** Managed DNS providers almost all publish `AAAA` records for their name servers; check that yours do, and that at least two of them are reachable over IPv6.
- **Source:** .zflow/evidence/specweb/resilience/ipv6.md
- **Verify:** `dig +short NS example.com`, then for each name server `dig +short AAAA <ns>` — at least two must return addresses (Internet.nl checks this too).
- **Severity:** low
