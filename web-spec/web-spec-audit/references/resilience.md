# Resilience — 34 audit checks

Behaviour under failure: error and maintenance pages with correct statuses, graceful degradation without JavaScript, offline support, PWA manifest, monitoring/status separation, deprecation signalling, Redirect-By, and IPv6.

Source: [The Website Specification](https://specification.website/spec/resilience/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.9, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/resilience/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — custom error pages · **Recommended** — maintenance pages and 503, graceful degradation, web app manifest, monitoring and uptime, IPv6 reachability.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

- **R01 — Missing URLs must return HTTP 404, never 200** (high · `error-pages`)
  Verify: `curl -sI https://example.com/<random-unused-path>` — the status line must be 404 (follow no redirects); the body must be the site's custom error page, not a 200 "page not found" message.
- **R02 — Unknown URLs must not redirect to the homepage** (medium · `error-pages`)
  Verify: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://example.com/<random-unused-path>` — expect 404 with an empty redirect_url, not a 3xx pointing at `/`.
- **R03 — The 404 page offers a way forward** (medium · `error-pages`)
  Verify: `curl -s https://example.com/<random-unused-path>` — the returned HTML must contain a homepage link and a search form or popular-section links (e.g. `grep -Ei 'href="(/|https://example\.com/)"|<form'`).
- **R04 — The 404 page keeps site navigation** (low · `error-pages`)
  Verify: `curl -s https://example.com/<random-unused-path> | grep -Ei '<nav|<header|<footer'` — the same chrome as normal pages must be present.
- **R05 — The 404 message renders without a heavy JS bundle** (low · `error-pages`)
  Verify: `curl -s https://example.com/<random-unused-path> | grep -i 'not found\|could not find'` — the "not found" wording must appear in the raw HTML with scripting disabled/unloaded.
- **R06 — Server errors return 500 and leak no implementation details** (high · `error-pages`)
  Verify: Observable on any 5xx response the audit happens to receive: `curl -s <erroring-url>` must not contain stack traces, file paths, SQL, or debug output (`grep -Ei 'traceback|exception|\.php|Warning:|at /'`). A polite read-only audit cannot force a 500.
- **R07 — Multilingual sites serve a localized 404** (low · `error-pages`)
  Verify: `curl -s https://example.com/fr/<random-unused-path> | grep 'lang="fr"'` — heading and copy in French, home link and search pointed at `/fr/`.
- **R08 — Planned downtime returns 503, never 200** (medium · `maintenance-pages`)
  Verify: During a maintenance window (or whenever the site currently serves its maintenance page): `curl -sI https://example.com/` must return 503, not 200. Not observable while the site is up.
- **R09 — 503 responses carry Retry-After** (medium · `maintenance-pages`)
  Verify: On any 503 response: `curl -sI https://example.com/ | grep -i '^retry-after:'` — value must be seconds or an HTTP-date.
- **R10 — The maintenance page is self-contained** (low · `maintenance-pages`)
  Verify: When the maintenance body is served: `curl -s https://example.com/ | grep -Ei '<(script|link|img)[^>]+(src|href)="https?://'` — no cross-origin subresources.
- **R11 — Rate limiting uses 429 with Retry-After** (low · `maintenance-pages`)
  Verify: Observable only if the auditor is actually throttled: the response must be 429 carrying Retry-After; a polite read-only audit cannot force throttling without abusing the site.
- **R12 — Core content and navigation work without JavaScript** (high · `graceful-degradation`)
  Verify: `curl -s https://example.com/ | grep -i '<h1'` — the main heading and body copy must be in the server HTML (not an empty `<div id="root">`); reload in a browser with JavaScript disabled (DevTools) and confirm content and primary nav still render and work.
- **R13 — Visible content is not gated behind JavaScript** (medium · `graceful-degradation`)
  Verify: `curl -s https://example.com/<content-page>` — the article/body text must be present in the raw HTML and not cloaked by inline `display:none`/`hidden` awaiting script.
- **R14 — Menus, accordions, dialogs operable natively** (low · `graceful-degradation`)
  Verify: With JavaScript disabled in a browser, open the primary menu/accordion — it must expand; in HTML, controls are native (`grep -c '<details\|<dialog'`) or the nav links are plain `<a href>` elements reachable without a script.
- **R15 — Service worker serves a cached offline fallback page** (low · `offline-support`)
  Verify: Find the worker URL in the page source, then `curl -s https://example.com/sw.js` — it must contain a `navigate`-mode fetch handler and a precached offline URL; DevTools → Network → "Offline" + reload renders the fallback; Lighthouse's PWA audit reports the offline behaviour.
- **R16 — Cache names are versioned and old caches cleaned** (low · `offline-support`)
  Verify: `curl -s https://example.com/sw.js | grep -iE "cache|activate"` — a versioned cache name (e.g. `v1`) and old-cache deletion logic on activate.
- **R17 — The shipped worker has a kill switch** (low · `offline-support`)
  Verify: `curl -s https://example.com/sw.js | grep -i 'unregister\|sw=off'` — the worker (or the page that registers it) must implement an unregister path.
- **R18 — Manifest linked from the HTML head** (medium · `pwa-manifest`)
  Verify: `curl -s https://example.com/ | grep -i 'rel="manifest'"` — a manifest link must exist and its href must fetch successfully.
- **R19 — Manifest carries the installability fields** (low · `pwa-manifest`)
  Verify: `curl -s https://example.com/manifest.webmanifest | jq` — `name` or `short_name`, `start_url`, and `display` must be present and parse.
- **R20 — Icons: 192px, 512px, and a maskable variant** (low · `pwa-manifest`)
  Verify: `curl -s https://example.com/manifest.webmanifest | jq '.icons'` — check the sizes/purpose entries; fetch each icon URL (`curl -sI`) for 200 + `image/png`; visually test the maskable icon at maskable.app/editor.
- **R21 — theme_color and background_color set** (low · `pwa-manifest`)
  Verify: `curl -s https://example.com/manifest.webmanifest | jq '.theme_color, .background_color'` — both must be non-null colour values.
- **R22 — start_url resolves to a live page** (medium · `pwa-manifest`)
  Verify: Extract `start_url` from the manifest, then `curl -sI https://example.com<start_url>` — must return 200.
- **R23 — Manifest served with the correct content type** (medium · `pwa-manifest`)
  Verify: `curl -sI https://example.com/site.webmanifest` — status 200 and a `content-type: application/manifest+json` header.
- **R24 — Status page on a separate host** (low · `monitoring-uptime`)
  Verify: `dig +short status.example.com` vs `dig +short example.com` — different addresses; `dig +short NS status-domain` vs the main domain shows separate DNS.
- **R25 — RUM/error beacons post same-origin** (low · `monitoring-uptime`)
  Verify: Load a page in a browser with the network panel open (read-only): any error/vitals beacon must target the site's own origin, not a collector's domain; the page's CSP `connect-src` should not need the vendor origin.
- **R26 — Deprecated resources announce Deprecation/Sunset headers** (low · `deprecation-and-sunset`)
  Verify: For each known deprecated/legacy endpoint: `curl -sI <url> | grep -iE 'deprecation|sunset|link'` — both dates present, ordered correctly, with a rel link.
- **R27 — Retired URLs return 410 or 404, not 200** (low · `deprecation-and-sunset`)
  Verify: `curl -sI <retired-url>` — status must be 410 or 404; a 200 on a retired resource fails this check.
- **R28 — Deprecation value is a date, not a boolean** (low · `deprecation-and-sunset`)
  Verify: `curl -sI <deprecated-url> | grep -i '^deprecation:'` — the value is `@<unix-seconds>` or an HTTP-date, not `true`.
- **R29 — Redirects are signed with Redirect-By** (low · `redirect-by`)
  Verify: `curl -sI <url-known-to-redirect> | grep -i 'redirect-by'` — the header must appear next to `Location`; follow chains with `curl -sIL` and confirm each hop is signed.
- **R30 — Redirect-By value leaks no infrastructure detail** (low · `redirect-by`)
  Verify: Inspect every `Redirect-By`/`X-Redirect-By` value in the redirect chain: it must not contain version strings, `.php`/file paths, or rule identifiers.
- **R31 — AAAA records published for apex and www** (medium · `ipv6`)
  Verify: `dig +short AAAA example.com` and `dig +short AAAA www.example.com` — both must return addresses.
- **R32 — The IPv6 address actually answers** (high · `ipv6`)
  Verify: `curl -6 -sI https://example.com/` from an IPv6-capable network — the request must complete with a valid certificate and the expected status; a timeout or TLS failure next to a published AAAA fails this check.
- **R33 — IPv6 and IPv4 serve the same site** (medium · `ipv6`)
  Verify: Compare `curl -6 -sI https://example.com/` with `curl -4 -sI https://example.com/` — same status, redirects, and headers; or run the Internet.nl website test, whose IPv6 section flags differences.
- **R34 — Authoritative name servers reachable over IPv6** (low · `ipv6`)
  Verify: `dig +short NS example.com`, then for each name server `dig +short AAAA <ns>` — at least two must return addresses (Internet.nl checks this too).
