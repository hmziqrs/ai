# Security — distilled audit requirements

Distilled from the security section of specification.website (raw pages in `.zflow/evidence/specweb/security/`).
Each block: requirement, quote (one line copied character-for-character from the source page), source path, verify method for a read-only auditor on a live consumer-facing site, severity.

## Content Security Policy

### S1. Serve a Content-Security-Policy response header on every HTML page.
quote: - `curl -sI https://example.com | grep -i content-security-policy` should return the header.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy` returns a policy on the homepage and inner templates.
severity: high

### S2. Use default-src 'self' as the fallback fetch directive.
quote: - **`default-src 'self'`** — fallback for all fetch directives. Allow your own origin by default.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the policy contains `default-src 'self'` (or every fetch directive is explicitly enumerated); run the header through Google CSP Evaluator (csp-evaluator.withgoogle.com).
severity: medium

### S3. Control script-src with a per-response nonce plus 'strict-dynamic'.
quote: - **`script-src`** — controls JavaScript. Use a per-response nonce; the `strict-dynamic` keyword lets a trusted script load further trusted scripts.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/` twice — `script-src` contains a `'nonce-…'` token and `'strict-dynamic'`, and the nonce value differs between the two responses.
severity: high

### S4. Generate a fresh nonce per response and embed it in every inline script tag.
quote: Generate a fresh nonce per response and embed it in every inline `<script>` tag.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: Fetch the same page twice with `curl -s https://SITE/`; extract the nonce from the CSP header and from inline `<script nonce=…>` tags — header and tags agree per response and change across responses.
severity: medium

### S5. Never ship 'unsafe-inline' or 'unsafe-eval' in script-src unless guarded by a nonce with 'strict-dynamic'.
quote: - **`unsafe-inline` or `unsafe-eval` standing alone.** As above, `'unsafe-inline'` only degrades safely with a nonce and `'strict-dynamic'` beside it; by itself it neutralises the protection, and `'unsafe-eval'` re-enables `eval()`. Use nonces or hashes.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy`, parse `script-src` — flag `unsafe-inline`/`unsafe-eval` unless `'strict-dynamic'` and a nonce are present; Google CSP Evaluator flags the same.
severity: high

### S6. Do not use wildcard script-src such as * or https: alone.
quote: - **Wildcards like `script-src *` or `https:` alone.** Almost as bad as no policy at all.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: Parse the deployed CSP header's `script-src` for `*` or a bare `https:` source; csp-evaluator.withgoogle.com reports wildcard weaknesses.
severity: medium

### S7. Set object-src 'none'.
quote: - **`object-src 'none'`** — kills Flash and plugin embeds.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `object-src 'none'`.
severity: medium

### S8. Set base-uri 'none'.
quote: - **`base-uri 'none'`** — blocks `<base>` tag injection attacks.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `base-uri 'none'`.
severity: medium

### S9. Switch from Content-Security-Policy-Report-Only to enforcing; do not ship report-only forever.
quote: - **Shipping a report-only policy forever.** Use `Content-Security-Policy-Report-Only` to test, then switch to enforcing.
source: .zflow/evidence/specweb/security/content-security-policy.md
verify: `curl -sI https://SITE/` — production pages carry `Content-Security-Policy` (enforcing), not only `Content-Security-Policy-Report-Only`.
severity: medium

## HTTPS and TLS

### S10. Serve every page over HTTPS using TLS 1.2/1.3 only; disable SSL, TLS 1.0 and 1.1.
quote: - TLS 1.3 enabled, TLS 1.2 enabled, everything older disabled.
source: .zflow/evidence/specweb/security/https-tls.md
verify: Qualys SSL Labs test (ssllabs.com/ssltest) protocols section shows only TLS 1.2/1.3 enabled; `openssl s_client -connect SITE:443 -tls1_1` fails the handshake.
severity: high

### S11. Redirect every plain-HTTP request to HTTPS with a 301.
quote: Redirect every HTTP request to HTTPS with a 301:
source: .zflow/evidence/specweb/security/https-tls.md
verify: `curl -sI http://SITE/path` returns `301` with a `Location: https://…` header.
severity: high

### S12. Serve the HTTP-to-HTTPS redirect on every hostname owned, including apex, www, and legacy subdomains.
quote: Serve the same redirect on every hostname you own, including the apex, `www`, and any legacy subdomains. After HTTPS works, add [HSTS](/spec/security/hsts/) so browsers stop trying HTTP at all.
source: .zflow/evidence/specweb/security/https-tls.md
verify: `curl -sI http://example.com` and `curl -sI http://www.example.com` (plus known subdomains from crt.sh) each return a 301 to https.
severity: medium

### S13. Hold a valid CA-issued certificate covering both apex and www (no self-signed certificates in production).
quote: - A valid certificate on `www.example.com` but not the apex `example.com`, or vice versa.
source: .zflow/evidence/specweb/security/https-tls.md
verify: `curl -vI https://example.com` and `curl -vI https://www.example.com` both complete the TLS handshake with no certificate errors; SSL Labs shows a publicly trusted, unexpired cert.
severity: high

### S14. Serve the complete certificate chain, including the intermediate.
quote: - A complete certificate chain — serve the intermediate, not just the leaf.
source: .zflow/evidence/specweb/security/https-tls.md
verify: `openssl s_client -connect SITE:443 -showcerts` lists the leaf plus intermediate; SSL Labs reports no chain issues.
severity: high

### S15. Enable OCSP stapling.
quote: - OCSP stapling on.
source: .zflow/evidence/specweb/security/https-tls.md
verify: `openssl s_client -connect SITE:443 -status` reports an OCSP response status of successful.
severity: medium

### S16. Use ECDHE key exchange only, on TLS 1.2 as well as 1.3.
quote: - ECDHE key exchange only, on TLS 1.2 as well as 1.3.
source: .zflow/evidence/specweb/security/https-tls.md
verify: `openssl s_client -connect SITE:443 -tls1_2` shows a negotiated cipher beginning with ECDHE; SSL Labs cipher-suites section confirms no static/finit-field groups.
severity: medium

### S17. Do not carry DHE or RSA key-exchange suites in the TLS 1.2 configuration.
quote: - Carrying `DHE` or RSA key exchange suites in a TLS 1.2 configuration written before July 2026. Both are now `MUST NOT`.
source: .zflow/evidence/specweb/security/https-tls.md
verify: SSL Labs (or testssl.sh) lists all negotiated TLS 1.2 suites — none uses DHE or RSA key exchange.
severity: medium

### S18. Offer hybrid post-quantum key agreement X25519MLKEM768 on TLS 1.3.
quote: - Hybrid post-quantum key agreement offered on TLS 1.3 — `X25519MLKEM768`.
source: .zflow/evidence/specweb/security/https-tls.md
verify: SSL Labs handshake details (or a current browser's DevTools security panel) show the TLS 1.3 negotiated group as X25519MLKEM768, not plain x25519.
severity: low

### S19. Score A or A+ on the Qualys SSL Labs test.
quote: - Run the [Qualys SSL Labs test](https://www.ssllabs.com/ssltest/) and aim for an A or A+.
source: .zflow/evidence/specweb/security/https-tls.md
verify: Run ssllabs.com/ssltest against the domain and read the overall grade.
severity: medium

## TLS configuration hardening

### S20. Turn TLS compression off.
quote: - **TLS compression off.** TLS-level compression leaks the contents of encrypted records through their length, which the CRIME attack used to recover session cookies. RFC 9325 says deployments **SHOULD NOT** support it. TLS 1.3 removed it entirely. This is separate from HTTP compression; see [compression](/spec/performance/compression/) for the related BREACH caveat.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: Internet.nl website test HTTPS section reports TLS compression disabled; testssl.sh shows the same.
severity: medium

### S21. Support secure renegotiation but disable client-initiated renegotiation.
quote: - **Secure renegotiation on, client-initiated renegotiation off.** TLS 1.2 servers must support the `renegotiation_info` extension (RFC 5746), which fixes the 2009 plaintext injection attack; RFC 9325 makes it a **MUST**. Separately, disable renegotiation initiated by the client: it gives nothing to a website and lets a single client force repeated expensive handshakes, a cheap denial-of-service lever. TLS 1.3 has no renegotiation at all.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: Internet.nl or testssl.sh renegotiation checks: secure renegotiation supported, client-initiated renegotiation rejected.
severity: medium

### S22. Keep 0-RTT off, or accept only replay-safe idempotent requests in early data.
quote: - **0-RTT off, or only for replay-safe requests.** TLS 1.3 early data (0-RTT) lets a returning client send its first request before the handshake finishes, but that data can be replayed by an attacker (RFC 9846, section 8). RFC 9325 says not to use it unless the application profile makes replay safe. For HTTP, RFC 8470 is that profile: only accept idempotent requests such as `GET` in early data, mark them with the `Early-Data: 1` header towards the origin, and answer `425 Too Early` for anything that changes state. If you cannot enforce that, leave 0-RTT off.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: Internet.nl reports 0-RTT status; where a CDN accepts early data for POSTs, confirm the origin checks `Early-Data` or answers `425 Too Early`.
severity: medium

### S23. Enable Extended Main Secret for TLS 1.2.
quote: - **Extended Main Secret on (TLS 1.2).** The extension originally specified as "Extended Master Secret" (RFC 7627) binds the session keys to the whole handshake transcript, defeating the triple-handshake attack. RFC 9325 makes support a **MUST** for TLS 1.2. RFC 9846 renamed it "Extended Main Secret" and obsoleted RFC 7627 without changing how it works, so tools may use either name.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: `openssl s_client -connect SITE:443 -tls1_2` (recent OpenSSL) reports Extended Main Secret used; Internet.nl lists it.
severity: medium

### S24. On TLS 1.2, use server cipher order or offer only strong (AEAD over ECDHE) suites.
quote: - **Server cipher order on TLS 1.2, or only strong suites.** If the server offers a mix of strong and weaker suites, configure it to choose from its own preference list rather than the client's, with AEAD suites (`AES-GCM`, `ChaCha20-Poly1305`) over `ECDHE` first; otherwise an old or misconfigured client can steer the connection to the weakest suite you allow. The alternative is to offer only strong suites, in which case the order no longer matters. That is the approach the Mozilla "Intermediate" profile takes: it turns server preference off because every suite it lists is strong, and Internet.nl accepts that too. On TLS 1.3 every defined suite is strong, so the same reasoning applies.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: SSL Labs "cipher order" and suite list for TLS 1.2 — either server preference is on or every suite is AEAD+ECDHE.
severity: low

### S25. Use SHA-256 or stronger for the TLS 1.2 key-exchange signature; never SHA-1 or MD5.
quote: - **SHA-2 for the key-exchange signature.** In TLS 1.2 the server signs its key exchange parameters, and the hash for that signature is negotiated. SHA-1 and MD5 there **MUST NOT** be used (RFC 9155, cited by RFC 9325); offer SHA-256 or stronger only.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: Internet.nl key-exchange hash check, or SSL Labs handshake signature algorithm for simulated TLS 1.2 clients.
severity: medium

### S26. Use certificate keys of adequate size: RSA at least 2048 bits or ECDSA on P-256 or larger.
quote: - **Certificate key of adequate size.** RSA keys of at least 2048 bits (RFC 9325 requires this), or ECDSA on P-256 or a larger curve. ECDSA P-256 is smaller and faster; many sites serve both an ECDSA and an RSA certificate and let the client choose.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: SSL Labs certificate section reports the public key size/curve.
severity: medium

### S27. Serve a certificate chain signed with SHA-256 or stronger (no SHA-1 intermediates).
quote: - **Certificate signed with SHA-256 or stronger.** Publicly trusted CAs no longer issue SHA-1-signed certificates, so this mostly catches internal CAs, very old certificates, and SHA-1 intermediates left in a chain.
source: .zflow/evidence/specweb/security/tls-configuration.md
verify: `openssl s_client -connect SITE:443 -showcerts` — every chain element's signature algorithm is SHA-256+; SSL Labs reports it.
severity: low

## HSTS

### S28. Send Strict-Transport-Security with max-age=63072000 and includeSubDomains on HTTPS responses (max-age must not be 0).
quote: Strict-Transport-Security: max-age=63072000; includeSubDomains
source: .zflow/evidence/specweb/security/hsts.md
verify: `curl -sI https://SITE/ | grep -i strict-transport-security` returns `max-age=63072000; includeSubDomains` (and max-age is not 0).
severity: high

### S29. Omit the preload directive; do not submit the domain to the HSTS preload list.
quote: - **`preload`** — opts in to the browser preload list. **No longer recommended** for most sites — the list's own operator now advises against it (see below), so leave it off unless you have a specific reason.
source: .zflow/evidence/specweb/security/hsts.md
verify: Header contains no `preload`; hstspreload.org does not list the domain.
severity: low

### S30. Only set includeSubDomains when every subdomain works over HTTPS.
quote: - **Setting `includeSubDomains` without auditing subdomains.** Every subdomain — including internal tools, staging, and legacy services — must work over HTTPS. If `dev.example.com` is HTTP-only, you have just broken it.
source: .zflow/evidence/specweb/security/hsts.md
verify: Enumerate subdomains (crt.sh / DNS) and `curl -I https://<sub>.SITE` for each — all must succeed over HTTPS while the header carries includeSubDomains.
severity: medium

## Mixed content

### S31. Serve every subresource over HTTPS — an HTTPS page must load nothing over plain HTTP.
quote: > An HTTPS page that loads any subresource over HTTP is mixed content. Serve every subresource over HTTPS, and send the upgrade-insecure-requests CSP directive as a safety net.
source: .zflow/evidence/specweb/security/mixed-content.md
verify: `curl -s https://SITE/ | grep -oE '(src|href)="http://[^"]+"'` returns nothing (repeat for CSS files); browser DevTools console shows no mixed-content warnings.
severity: high

### S32. Send the upgrade-insecure-requests CSP directive as a safety net.
quote: 2. **Send `upgrade-insecure-requests` as a safety net.** This CSP directive tells the browser to rewrite every `http://` subresource request (and same-origin navigation) to `https://` before it is sent:
source: .zflow/evidence/specweb/security/mixed-content.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep upgrade-insecure-requests` matches.
severity: medium

### S33. Use explicit https:// subresource URLs, never protocol-relative // URLs.
quote: - Using protocol-relative URLs (`//example.com/x.js`) and calling it solved; current guidance is explicit `https://`.
source: .zflow/evidence/specweb/security/mixed-content.md
verify: `curl -s https://SITE/ | grep -E '(src|href)="//'` returns nothing.
severity: low

## Reporting endpoints

### S34. Send Reporting-Endpoints on HTML responses naming at least a default endpoint.
quote: 1. Send `Reporting-Endpoints` on HTML responses, naming at least a `default` endpoint and any policy-specific ones you need.
source: .zflow/evidence/specweb/security/reporting-endpoints.md
verify: `curl -sI https://SITE/ | grep -i reporting-endpoints` returns a well-formed header that defines a `default=` endpoint.
severity: low

### S35. Do not use the deprecated Report-To header or CSP report-uri.
quote: - **Using the deprecated `Report-To` header or CSP `report-uri`.** Migrate to `Reporting-Endpoints` plus `report-to`.
source: .zflow/evidence/specweb/security/reporting-endpoints.md
verify: `curl -sI https://SITE/` shows no `Report-To` header, and the CSP uses `report-to` (not `report-uri`).
severity: low

## security.txt

### S36. Publish /.well-known/security.txt over HTTPS returning 200 with Content-Type text/plain (the well-known path, not /security.txt).
quote: Create the file at `/.well-known/security.txt`. Serve it over HTTPS with `Content-Type: text/plain; charset=utf-8`.
source: .zflow/evidence/specweb/security/security-txt.md
verify: `curl -sI https://SITE/.well-known/security.txt` returns 200 with `Content-Type: text/plain`; validate the file at securitytxt.org.
severity: low

### S37. Include the required Contact field with a monitored contact URI.
quote: - **`Contact:`** — required. One or more `mailto:`, `https:`, or `tel:` URIs. Use a monitored mailbox or form.
source: .zflow/evidence/specweb/security/security-txt.md
verify: `curl -s https://SITE/.well-known/security.txt | grep '^Contact:'` shows a mailto/https/tel URI.
severity: low

### S38. Include a required, unexpired Expires field set roughly a year out.
quote: - **`Expires:`** — required. ISO 8601 timestamp. Set it to roughly a year out and update it before it lapses.
source: .zflow/evidence/specweb/security/security-txt.md
verify: `curl -s https://SITE/.well-known/security.txt | grep '^Expires:'` — an ISO 8601 date in the future; securitytxt.org validator passes.
severity: low

## X-Content-Type-Options

### S39. Send X-Content-Type-Options: nosniff on every response.
quote: Send the header on every response. Most web servers and CDNs let you set it globally; there is no reason to be selective.
source: .zflow/evidence/specweb/security/x-content-type-options.md
verify: `curl -sI https://SITE/ | grep -i x-content-type-options` prints `X-Content-Type-Options: nosniff` on HTML, assets, and API responses; securityheaders.com confirms.
severity: medium

### S40. The header value must be exactly the single token nosniff.
quote: - **Multiple values.** The header takes one token, `nosniff`. Anything else is ignored or rejected.
source: .zflow/evidence/specweb/security/x-content-type-options.md
verify: Parse the header value from `curl -sI` — it equals `nosniff` exactly, with no additional tokens.
severity: low

### S41. Pair nosniff with correct Content-Type labels on every response.
quote: Pair `nosniff` with correct `Content-Type` headers on every response. The directive only helps if your server actually labels responses properly. JavaScript files must be served as `application/javascript` (or `text/javascript`), CSS as `text/css`, JSON as `application/json`, and so on.
source: .zflow/evidence/specweb/security/x-content-type-options.md
verify: `curl -sI https://SITE/app.js`, `/styles.css`, `/api.json` — Content-Type matches the file type.
severity: low

## Clickjacking protection (frame-ancestors / X-Frame-Options)

### S42. Set CSP frame-ancestors, defaulting to 'none', as the clickjacking defence.
quote: Content-Security-Policy: frame-ancestors 'none'
source: .zflow/evidence/specweb/security/frame-ancestors.md
verify: `curl -sI https://SITE/ | grep -i frame-ancestors` shows the directive; a test page on another origin with `<iframe src="https://SITE">` refuses to load.
severity: medium

### S43. Also send X-Frame-Options (DENY or SAMEORIGIN) as the legacy fallback alongside CSP.
quote: - **Setting only `X-Frame-Options`.** Modern policies, including allow-lists, live in CSP. Set both for now.
source: .zflow/evidence/specweb/security/frame-ancestors.md
verify: `curl -sI https://SITE/ | grep -i x-frame-options` returns DENY or SAMEORIGIN in addition to frame-ancestors.
severity: low

### S44. Send the anti-framing headers on every HTML response, including login, signup, and OAuth screens.
quote: Send the headers on every HTML response. Send them even on pages that "wouldn't make sense" framed; attackers will frame anything that performs an authenticated action.
source: .zflow/evidence/specweb/security/frame-ancestors.md
verify: `curl -sI` on homepage, /login, /signup, /password-reset — each carries frame-ancestors and/or X-Frame-Options.
severity: medium

### S45. Do not use the unsupported X-Frame-Options ALLOW-FROM value.
quote: - **`ALLOW-FROM`.** Deprecated and unsupported. Use `frame-ancestors`.
source: .zflow/evidence/specweb/security/frame-ancestors.md
verify: Parse the X-Frame-Options value — it is not ALLOW-FROM.
severity: low

## Fetch Metadata

### S46. Enforce a resource isolation policy that rejects remaining non-exempt cross-site requests with 403.
quote: 5. Reject the remaining non-exempt cross-site requests, normally with `403`.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: no-cors' -H 'Sec-Fetch-Dest: image'` returns 403.
severity: medium

### S47. Do not block cross-site navigations outright — ordinary inbound links must keep working.
quote: - **Blocking `cross-site` navigations outright.** Every inbound link from another site is `Sec-Fetch-Site: cross-site` with `Sec-Fetch-Mode: navigate`. Block those and your site becomes unreachable from search results.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/ -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document'` returns the page's normal response code.
severity: medium

### S48. Allow a cross-site navigation only when the method is GET, mode is navigate, and dest is neither object nor embed.
quote: 4. For cross-site requests, allow a navigation only when **all three** conditions hold: the method is `GET`, `Sec-Fetch-Mode` is `navigate`, and `Sec-Fetch-Dest` is neither `object` nor `embed`.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: Repeat the curl probe with `-H 'Sec-Fetch-Dest: object'` then `embed` — both rejected; with `document` — allowed.
severity: medium

### S49. Absent Sec-Fetch headers must not bypass the endpoint's existing authentication and CSRF checks.
quote: - **Treating missing headers as proof of safety.** Use the endpoint's existing CSRF and authentication checks when metadata is absent; many non-browser clients omit it.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings` with no Sec-Fetch headers still returns an auth redirect/401/403, not the authenticated page.
severity: medium

### S50. Add Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest to Vary on cacheable responses the policy changes.
quote: When the policy changes a cacheable response, include the request fields it uses in `Vary`, as the [W3C deployment guidance](https://www.w3.org/TR/fetch-metadata/#vary) explains. For the policy above, append `Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest` to any existing `Vary` fields on allowed and denied responses. Otherwise a cache can reuse an allowed response for a request the policy would reject, or serve a cached denial to a legitimate visitor.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: `curl -sI` an allowed and a denied response — the `Vary` field lists the three Sec-Fetch headers.
severity: low

### S51. Never require Sec-Fetch-User in the policy.
quote: - **Requiring `Sec-Fetch-User`.** Safari does not send it. A rule that demands it locks out Safari users entirely.
source: .zflow/evidence/specweb/security/fetch-metadata.md
verify: Policy/config review shows no Sec-Fetch-User condition; observable as the site remaining functional in Safari.
severity: low

## Cross-origin isolation (COOP / CORP / COEP)

### S52. Send COOP and CORP on every HTML response as a baseline.
quote: Send COOP and CORP on every HTML response as a baseline:
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: `curl -sI https://SITE/ | grep -iE 'cross-origin-(opener|resource)-policy'` returns both headers.
severity: medium

### S53. Set Cross-Origin-Opener-Policy to same-origin.
quote: Cross-Origin-Opener-Policy: same-origin
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: `curl -sI https://SITE/ | grep -i cross-origin-opener-policy` shows `same-origin` (or `same-origin-allow-popups` where popup flows exist).
severity: medium

### S54. Set Cross-Origin-Resource-Policy to same-site.
quote: Cross-Origin-Resource-Policy: same-site
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: `curl -sI https://SITE/ | grep -i cross-origin-resource-policy` shows `same-site` (or `cross-origin` for genuinely public embeddable assets).
severity: medium

### S55. Relax COOP to same-origin-allow-popups on pages that rely on OAuth or payment pop-ups.
quote: If your site relies on OAuth or payment pop-ups, relax COOP to `same-origin-allow-popups` so the pop-up flow keeps working while isolated pages stay protected.
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: On pages that open popup flows, `curl -sI` shows `Cross-Origin-Opener-Policy: same-origin-allow-popups` and the popup flow completes in a browser.
severity: low

### S56. Add COEP require-corp only when isolation-gated APIs are actually needed.
quote: Only add `Cross-Origin-Embedder-Policy: require-corp` if you actually need `SharedArrayBuffer` or other isolation-gated APIs — it forces every cross-origin subresource to opt in, which often breaks third-party embeds until each one sends CORP or CORS. Treat full isolation as opt-in, not a default.
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: `curl -sI https://SITE/ | grep -i cross-origin-embedder-policy` — COEP absent unless the site uses SharedArrayBuffer etc.; where present, DevTools `self.crossOriginIsolated` is true.
severity: low

### S57. Serve CORP cross-origin on assets meant to be hot-linked by others.
quote: - **Serving CORP `same-origin` on assets meant to be hot-linked** (a public CDN, embeddable widget). Use `cross-origin` for genuinely public resources.
source: .zflow/evidence/specweb/security/cross-origin-isolation.md
verify: `curl -sI https://cdn.SITE/public-asset` shows `Cross-Origin-Resource-Policy: cross-origin` for resources other sites legitimately embed.
severity: low

## Referrer-Policy

### S58. Send Referrer-Policy: strict-origin-when-cross-origin on HTML responses.
quote: Referrer-Policy: strict-origin-when-cross-origin
source: .zflow/evidence/specweb/security/referrer-policy.md
verify: `curl -sI https://SITE/ | grep -i referrer-policy` shows `strict-origin-when-cross-origin`.
severity: medium

### S59. Set the header explicitly rather than relying on browser defaults.
quote: - **Relying on the browser default.** Different browsers historically used different defaults. Be explicit.
source: .zflow/evidence/specweb/security/referrer-policy.md
verify: Spot-check `curl -sI` across HTML templates (home, article, product) — the header is present on each, not only some.
severity: low

### S60. Use a stricter policy (same-origin or no-referrer) on pages with sensitive URLs such as password reset and account settings.
quote: Use a stricter policy (`same-origin` or `no-referrer`) on pages with sensitive URLs — password reset, account settings, internal tools.
source: .zflow/evidence/specweb/security/referrer-policy.md
verify: `curl -sI https://SITE/password-reset | grep -i referrer-policy` shows `same-origin`/`no-referrer`, or the page carries `<meta name="referrer" content="no-referrer">`.
severity: medium

### S61. Never use the unsafe-url policy.
quote: - **`unsafe-url`** — always sends the full URL. Avoid.
source: .zflow/evidence/specweb/security/referrer-policy.md
verify: Parse the Referrer-Policy value from `curl -sI` — it must not be `unsafe-url`.
severity: medium

## Permissions-Policy

### S62. Send Permissions-Policy on every HTML response, denying features the site does not use.
quote: Send the header on every HTML response. Start by denying everything you do not use:
source: .zflow/evidence/specweb/security/permissions-policy.md
verify: `curl -sI https://SITE/ | grep -i permissions-policy` returns a header with empty allow-lists for unused features.
severity: medium

### S63. Disable camera, microphone, geolocation, and payment when the site does not use them.
quote: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
source: .zflow/evidence/specweb/security/permissions-policy.md
verify: Parse the header for `camera=()`, `microphone=()`, `geolocation=()`, `payment=()` unless the feature is genuinely used; check effective policy at permissionspolicy.com.
severity: medium

### S64. Use the Permissions-Policy structured syntax, not the legacy Feature-Policy header.
quote: - **Using the older `Feature-Policy` syntax.** Permissions-Policy uses structured headers with `()` lists, not space-separated origins.
source: .zflow/evidence/specweb/security/permissions-policy.md
verify: `curl -sI https://SITE/ | grep -iE 'permissions-policy|feature-policy'` — Permissions-Policy with `()` lists present, no Feature-Policy header.
severity: low

### S65. Do not allow * to make an iframe work — scope allowances to the specific origin.
quote: - **Allowing `*` to "fix" a broken iframe.** Narrow it to the specific origin instead.
source: .zflow/evidence/specweb/security/permissions-policy.md
verify: Parse the header for any `=*` allowance (none expected); embedded iframes' `allow` attributes name only the features they need.
severity: low

## Subresource Integrity

### S66. Give every third-party script and stylesheet an integrity attribute (SHA-384 of the exact file) plus crossorigin="anonymous".
quote: For every external script or stylesheet, compute a SHA-384 hash of the exact file content and include it in the `integrity` attribute. Add `crossorigin="anonymous"` so the browser sends a CORS request and can verify the response without credentials.
source: .zflow/evidence/specweb/security/subresource-integrity.md
verify: `curl -s https://SITE/ | grep -oE '<(script|link)[^>]+(src|href)="https?://[^"]+"[^>]*>'` — every third-party tag carries both `integrity="sha384-…"` and `crossorigin="anonymous"`.
severity: medium

### S67. Pin third-party assets to immutable versioned URLs, never a "latest" CDN URL.
quote: - **Pinning to a "latest" CDN URL.** The hash and the URL must match a specific immutable version. Use `/widget@1.2.3/widget.js`, never `/widget/widget.js`.
source: .zflow/evidence/specweb/security/subresource-integrity.md
verify: Inspect third-party URLs in the HTML for version segments; re-fetching the URL later returns byte-identical content.
severity: low

### S68. Ship Integrity-Policy-Report-Only as a site-wide tripwire for unhashed scripts.
quote: Integrity-Policy-Report-Only: blocked-destinations=(script), endpoints=(integrity-endpoint)
source: .zflow/evidence/specweb/security/subresource-integrity.md
verify: `curl -sI https://SITE/ | grep -i integrity-policy` returns the report-only header naming blocked destinations and an endpoint.
severity: low

## Digest fields

### S69. If digest fields are emitted, use sha-256 or sha-512 — the only Active IANA algorithms — never md5 or sha-1.
quote: Hash the body and emit the field. Use `sha-256` or `sha-512`, the only algorithms the [IANA registry](https://www.iana.org/assignments/http-digest-hash-alg/http-digest-hash-alg.xhtml) marks `Active`.
source: .zflow/evidence/specweb/security/digest-fields.md
verify: `curl -sI https://SITE/data.json | grep -iE '^(content|repr)-digest'` — the algorithm token is sha-256 or sha-512.
severity: low

### S70. Emit digests on machine-readable endpoints clients act on, and ensure they match the bytes received.
quote: Spend the effort where a client will act on it: JSON APIs, file downloads, and machine-readable endpoints that agents fetch and cache. Browsers do not automatically validate `Content-Digest` or `Repr-Digest`; `Unencoded-Digest` has separate, limited browser support.
source: .zflow/evidence/specweb/security/digest-fields.md
verify: `curl -sS -D h.txt -o body https://SITE/data.json`; `grep -i '^content-digest' h.txt`; `echo "sha-256=:$(openssl dgst -sha256 -binary body | openssl base64 -A):"` — the two lines match byte for byte, with and without `Accept-Encoding: gzip`.
severity: low

## Trusted Types

### S71. Enable require-trusted-types-for 'script' with an explicit trusted-types policy allowlist.
quote: Content-Security-Policy: require-trusted-types-for 'script'; trusted-types escape
source: .zflow/evidence/specweb/security/trusted-types.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep "require-trusted-types-for"`; in DevTools on the live page, `document.body.innerHTML = '<img src=x>'` throws a TypeError.
severity: medium

### S72. Deploy Trusted Types in report-only mode first, then switch to enforcing.
quote: 1. **Deploy in report-only first** so you can find every sink your code touches without breaking the page:
source: .zflow/evidence/specweb/security/trusted-types.md
verify: Rollout artifacts show `Content-Security-Policy-Report-Only` with the directives before the enforcing header appears in `curl -sI`.
severity: low

### S73. Name the allowed policies in the trusted-types directive.
quote: - **Omitting `trusted-types`.** Without the allowlist, code can create a policy of any name, including a malicious one; name your policies explicitly.
source: .zflow/evidence/specweb/security/trusted-types.md
verify: Parse the CSP header — a `trusted-types` directive with explicit policy names accompanies `require-trusted-types-for 'script'`.
severity: low

### S74. The default policy must sanitise input (e.g. DOMPurify), not pass it through unchanged.
quote: - **A pass-through default policy** that returns its input unchanged — it satisfies the type check while re-opening the exact hole you closed.
source: .zflow/evidence/specweb/security/trusted-types.md
verify: On a live search/results page, inject markup with an event handler into a reflected parameter (e.g. `?q=<img src=x onerror=1>`) — the handler is stripped in the rendered DOM; the policy definition in shipped JS calls a sanitiser.
severity: medium

## X-XSS-Protection

### S75. Send no X-XSS-Protection header at all — delete it.
quote: Delete the header.
source: .zflow/evidence/specweb/security/x-xss-protection.md
verify: `curl -sI https://SITE/ | grep -i x-xss-protection` returns nothing (check through the full CDN/WAF chain, not just origin).
severity: low

### S76. If a checklist forces the header to be present, its only acceptable value is 0 — never 1 or 1; mode=block.
quote: Removing it entirely is better than setting `X-XSS-Protection: 0`. The zero value existed to switch off a filter that no longer exists; sending it now just documents that you once had to think about this. If a compliance checklist insists the header be present with a specific value, `0` is the only value to give it — never `1` or `1; mode=block`.
source: .zflow/evidence/specweb/security/x-xss-protection.md
verify: Parse the X-XSS-Protection value if present — it must be `0`, not `1` or `1; mode=block`.
severity: low

### S77. Confirm the replacement landed: a CSP whose script-src has no 'unsafe-inline'.
quote: - Confirm the replacement actually landed: the response carries a `Content-Security-Policy` whose `script-src` has no `'unsafe-inline'`.
source: .zflow/evidence/specweb/security/x-xss-protection.md
verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the script-src directive carries no standalone `'unsafe-inline'`.
severity: medium

## Cookie attributes

### S78. Set Secure, HttpOnly (where possible), and an explicit SameSite on every cookie.
quote: Set these attributes on every cookie unless you have a specific reason not to.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: `curl -sI https://SITE/ | grep -i set-cookie` — each Set-Cookie carries Secure, HttpOnly (unless JS must read it), and SameSite; DevTools → Application → Cookies shows the same per row.
severity: high

### S79. Every cookie that carries identity must have the Secure attribute.
quote: - **`Secure`** — sent only over HTTPS. Mandatory on any cookie that carries identity. Required for `SameSite=None`.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Inspect all Set-Cookie headers (curl plus DevTools after sign-in) — session/auth cookies all carry `Secure`.
severity: high

### S80. Every session cookie must be HttpOnly.
quote: - **`HttpOnly`** — not exposed to `document.cookie`. Use on every session cookie. Skip it on cookies your JavaScript genuinely needs to read (preferences, A/B test bucket).
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Signed in, run `document.cookie` in DevTools console — the session cookie is absent; DevTools cookie table shows HttpOnly ticked.
severity: high

### S81. Use the __Host- prefix for session cookies.
quote: Use `__Host-` for session cookies whenever you can. It blocks subdomain takeover from rewriting the session cookie.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Inspect Set-Cookie after sign-in — the session cookie name starts `__Host-`.
severity: medium

### S82. __Host- cookies must be Secure, Path=/, and carry no Domain attribute.
quote: - **`__Host-`** — name starts with `__Host-`, the cookie must be `Secure`, must have `Path=/`, and must not have a `Domain` attribute. Pins the cookie to the exact host.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Parse the `__Host-` Set-Cookie header — attributes are exactly Secure, Path=/, no Domain; the browser accepts it.
severity: low

### S83. Any SameSite=None cookie must also carry Secure.
quote: - **`SameSite=None` without `Secure`.** Modern browsers reject the cookie outright.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Parse every Set-Cookie with `SameSite=None` — each also carries `Secure`; DevTools shows the cookie actually stored.
severity: medium

### S84. Always set an explicit Path and a Max-Age or Expires on cookies.
quote: Always set an explicit `Path`, `Max-Age` or `Expires`, and a sensible value length. Avoid `Domain=example.com` unless you really need the cookie on subdomains.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: Parse Set-Cookie headers — Path and Max-Age/Expires present; Domain absent unless subdomain sharing is intended.
severity: low

### S85. Do not treat SameSite as complete CSRF defence — pair it with CSRF tokens or a Sec-Fetch-Site check, and keep state changes out of GET.
quote: - **Treating `SameSite` as a complete CSRF defence.** It is defence in depth, not a replacement for anti-CSRF tokens. `SameSite=Lax` still sends the cookie on top-level GET navigations, so a state-changing request reachable by `GET` and triggered from another site keeps the session attached; and `SameSite` keys on the registered domain, not the origin, so it trusts every subdomain. Pair it with per-request CSRF tokens or a `Sec-Fetch-Site` check for state-changing endpoints.
source: .zflow/evidence/specweb/security/cookie-attributes.md
verify: View source of authenticated forms — CSRF token fields present; state-changing endpoints reject cross-site requests (see the Fetch-Metadata curl probe) and are not reachable by plain GET.
severity: medium

## Clear-Site-Data

### S86. Send Clear-Site-Data on the sign-out response, listing the data types to clear.
quote: Send the header on the response that confirms the sign-out — the `/logout` redirect or its landing page — listing the data types you actually want gone:
source: .zflow/evidence/specweb/security/clear-site-data.md
verify: `curl -sI https://SITE/logout | grep -i clear-site-data` shows the header with quoted tokens; after sign-out, DevTools → Application shows cookies and storage empty.
severity: low

### S87. Never send Clear-Site-Data site-wide — only on the exact responses that should clear data.
quote: Scope it to the exact responses that should clear data. Never send it site-wide: a stray `Clear-Site-Data` on every response wipes the user's session on each request.
source: .zflow/evidence/specweb/security/clear-site-data.md
verify: `curl -sI https://SITE/` and other normal pages — the header is absent everywhere except the sign-out flow.
severity: medium

### S88. Clear-Site-Data values must be quoted tokens.
quote: - **Omitting the quotes.** `Clear-Site-Data: cookies` is invalid; the value must be `"cookies"`.
source: .zflow/evidence/specweb/security/clear-site-data.md
verify: Parse the header — every directive is a double-quoted token such as `"cache", "cookies", "storage"`.
severity: low

## CAA records

### S89. Publish at least one CAA record at the domain apex restricting which CAs may issue.
quote: Add CAA records at the apex of your domain. They cover all subdomains unless overridden.
source: .zflow/evidence/specweb/security/caa-records.md
verify: `dig CAA example.com +short` returns one or more records.
severity: medium

### S90. Set issuewild explicitly so wildcard issuance does not silently inherit the issue tag.
quote: - **Forgetting `issuewild`.** Without it, issuance of wildcards inherits the `issue` tag, which may be more permissive than you intend.
source: .zflow/evidence/specweb/security/caa-records.md
verify: `dig CAA example.com +short` includes an `issuewild` entry (e.g. `issuewild ";"` when wildcards are not used).
severity: low

### S91. Include an iodef contact for CA incident reports.
quote: - **`iodef`** — an email or URL where CAs report failed checks (Incident Object Description Exchange Format).
source: .zflow/evidence/specweb/security/caa-records.md
verify: `dig CAA example.com +short` includes an `iodef "mailto:…"` record.
severity: low

## RPKI

### S92. The prefixes holding the site's servers must be RPKI-valid (covered by a ROA with matching origin ASN).
quote: 2. Check their RPKI status in the same tool. You want **valid** for every one.
source: .zflow/evidence/specweb/security/rpki.md
verify: Look up the site's A/AAAA addresses on stat.ripe.net — RPKI validation status reads "valid"; the Internet.nl website test RPKI section agrees.
severity: medium

### S93. Check the name servers and MX hosts' prefixes too, not just the web server.
quote: - **Checking only the web server.** The name servers and mail servers are in other prefixes, often run by other providers.
source: .zflow/evidence/specweb/security/rpki.md
verify: Resolve NS and MX targets, look up each address's prefix on RIPEstat — every one is RPKI-valid.
severity: low

## DNSSEC

### S94. If DNSSEC is deployed, the full chain must validate: signed zone plus DS record at the parent.
quote: 4. **Verify the chain.** Use `dig +dnssec` or [Verisign DNSSEC Debugger](https://dnssec-analyzer.verisignlabs.com/) to confirm every signature validates and the `DS` at the parent matches.
source: .zflow/evidence/specweb/security/dnssec.md
verify: `dig +dnssec example.com` returns RRSIG records with the `ad` flag; Verisign DNSSEC Debugger or DNSViz shows a green chain to the root.
severity: low

### S95. Use DNSSEC algorithm 13 (ECDSA P-256 with SHA-256) as the modern default.
quote: Algorithm 13 (ECDSA P-256 with SHA-256) is the recommended modern default; it is small, fast, and widely supported.
source: .zflow/evidence/specweb/security/dnssec.md
verify: `dig DNSKEY example.com +short` — the KSK (flag 257) uses algorithm 13.
severity: low

### S96. A signed zone must also publish the DS record — signing without DS provides no protection.
quote: - **Signing the zone but never publishing the `DS`.** Resolvers ignore the signatures — no protection.
source: .zflow/evidence/specweb/security/dnssec.md
verify: Verisign DNSSEC Debugger shows a DS at the parent zone matching the child's KSK.
severity: low

## DANE

### S97. A TLSA record for HTTPS is only meaningful in a DNSSEC-signed zone; without DNSSEC, do not bother.
quote: 1. **Sign the zone with DNSSEC** and confirm the chain validates. Without this, stop.
source: .zflow/evidence/specweb/security/dane.md
verify: `dig +dnssec TLSA _443._tcp.www.SITE` — if records exist, confirm the zone's DNSSEC chain validates (ad flag / DNSViz); if the zone is unsigned, no TLSA should be published.
severity: low

### S98. Publish TLSA at _443._tcp. plus the exact hostname clients connect to.
quote: - **Publishing `TLSA` for the wrong name.** It belongs at `_443._tcp.` plus the exact host name clients connect to, for each host name.
source: .zflow/evidence/specweb/security/dane.md
verify: `dig +dnssec TLSA _443._tcp.www.example.com` returns the record with the `ad` flag from a validating resolver, for each served hostname.
severity: low
