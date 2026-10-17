# Security — 98 audit checks

Transport and document hardening: CSP, TLS 1.2/1.3 with modern hardening, HSTS, mixed content, reporting endpoints, security.txt, nosniff, frame protection, Fetch Metadata, cross-origin isolation, Referrer-/Permissions-Policy, SRI, digest fields, Trusted Types, cookie attributes, Clear-Site-Data, and DNS-side assurances (CAA, RPKI, DNSSEC, DANE).

Source: [The Website Specification](https://specification.website/spec/security/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.4, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/security/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — HTTPS and TLS, HSTS, X-Content-Type-Options, clickjacking protection, cookie attributes · **Avoid** — X-XSS-Protection · **Recommended** — TLS configuration hardening, mixed content, Content Security Policy, security.txt, Referrer-Policy, Permissions-Policy, Subresource Integrity.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

- **S1 — Serve a Content-Security-Policy response header on every HTML page.** (high · `content-security-policy`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy` returns a policy on the homepage and inner templates.
- **S2 — Use default-src 'self' as the fallback fetch directive.** (medium · `content-security-policy`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the policy contains `default-src 'self'` (or every fetch directive is explicitly enumerated); run the header through Google CSP Evaluator (csp-evaluator.withgoogle.com).
- **S3 — Control script-src with a per-response nonce plus 'strict-dynamic'.** (high · `content-security-policy`)
  Verify: `curl -sI https://SITE/` twice — `script-src` contains a `'nonce-…'` token and `'strict-dynamic'`, and the nonce value differs between the two responses.
- **S4 — Generate a fresh nonce per response and embed it in every inline script tag.** (medium · `content-security-policy`)
  Verify: Fetch the same page twice with `curl -s https://SITE/`; extract the nonce from the CSP header and from inline `<script nonce=…>` tags — header and tags agree per response and change across responses.
- **S5 — Never ship 'unsafe-inline' or 'unsafe-eval' in script-src unless guarded by a nonce with 'strict-dynamic'.** (high · `content-security-policy`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy`, parse `script-src` — flag `unsafe-inline`/`unsafe-eval` unless `'strict-dynamic'` and a nonce are present; Google CSP Evaluator flags the same.
- **S6 — Do not use wildcard script-src such as * or https: alone.** (medium · `content-security-policy`)
  Verify: Parse the deployed CSP header's `script-src` for `*` or a bare `https:` source; csp-evaluator.withgoogle.com reports wildcard weaknesses.
- **S7 — Set object-src 'none'.** (medium · `content-security-policy`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `object-src 'none'`.
- **S8 — Set base-uri 'none'.** (medium · `content-security-policy`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — policy includes `base-uri 'none'`.
- **S9 — Switch from Content-Security-Policy-Report-Only to enforcing; do not ship report-only forever.** (medium · `content-security-policy`)
  Verify: `curl -sI https://SITE/` — production pages carry `Content-Security-Policy` (enforcing), not only `Content-Security-Policy-Report-Only`.
- **S10 — Serve every page over HTTPS using TLS 1.2/1.3 only; disable SSL, TLS 1.0 and 1.1.** (high · `https-tls`)
  Verify: Qualys SSL Labs test (ssllabs.com/ssltest) protocols section shows only TLS 1.2/1.3 enabled; `openssl s_client -connect SITE:443 -tls1_1` fails the handshake.
- **S11 — Redirect every plain-HTTP request to HTTPS with a 301.** (high · `https-tls`)
  Verify: `curl -sI http://SITE/path` returns `301` with a `Location: https://…` header.
- **S12 — Serve the HTTP-to-HTTPS redirect on every hostname owned, including apex, www, and legacy subdomains.** (medium · `https-tls`)
  Verify: `curl -sI http://example.com` and `curl -sI http://www.example.com` (plus known subdomains from crt.sh) each return a 301 to https.
- **S13 — Hold a valid CA-issued certificate covering both apex and www (no self-signed certificates in production).** (high · `https-tls`)
  Verify: `curl -vI https://example.com` and `curl -vI https://www.example.com` both complete the TLS handshake with no certificate errors; SSL Labs shows a publicly trusted, unexpired cert.
- **S14 — Serve the complete certificate chain, including the intermediate.** (high · `https-tls`)
  Verify: `openssl s_client -connect SITE:443 -showcerts` lists the leaf plus intermediate; SSL Labs reports no chain issues.
- **S15 — Enable OCSP stapling.** (medium · `https-tls`)
  Verify: `openssl s_client -connect SITE:443 -status` reports an OCSP response status of successful.
- **S16 — Use ECDHE key exchange only, on TLS 1.2 as well as 1.3.** (medium · `https-tls`)
  Verify: `openssl s_client -connect SITE:443 -tls1_2` shows a negotiated cipher beginning with ECDHE; SSL Labs cipher-suites section confirms no static/finit-field groups.
- **S17 — Do not carry DHE or RSA key-exchange suites in the TLS 1.2 configuration.** (medium · `https-tls`)
  Verify: SSL Labs (or testssl.sh) lists all negotiated TLS 1.2 suites — none uses DHE or RSA key exchange.
- **S18 — Offer hybrid post-quantum key agreement X25519MLKEM768 on TLS 1.3.** (low · `https-tls`)
  Verify: SSL Labs handshake details (or a current browser's DevTools security panel) show the TLS 1.3 negotiated group as X25519MLKEM768, not plain x25519.
- **S19 — Score A or A+ on the Qualys SSL Labs test.** (medium · `https-tls`)
  Verify: Run ssllabs.com/ssltest against the domain and read the overall grade.
- **S20 — Turn TLS compression off.** (medium · `tls-configuration`)
  Verify: Internet.nl website test HTTPS section reports TLS compression disabled; testssl.sh shows the same.
- **S21 — Support secure renegotiation but disable client-initiated renegotiation.** (medium · `tls-configuration`)
  Verify: Internet.nl or testssl.sh renegotiation checks: secure renegotiation supported, client-initiated renegotiation rejected.
- **S22 — Keep 0-RTT off, or accept only replay-safe idempotent requests in early data.** (medium · `tls-configuration`)
  Verify: Internet.nl reports 0-RTT status; where a CDN accepts early data for POSTs, confirm the origin checks `Early-Data` or answers `425 Too Early`.
- **S23 — Enable Extended Main Secret for TLS 1.2.** (medium · `tls-configuration`)
  Verify: `openssl s_client -connect SITE:443 -tls1_2` (recent OpenSSL) reports Extended Main Secret used; Internet.nl lists it.
- **S24 — On TLS 1.2, use server cipher order or offer only strong (AEAD over ECDHE) suites.** (low · `tls-configuration`)
  Verify: SSL Labs "cipher order" and suite list for TLS 1.2 — either server preference is on or every suite is AEAD+ECDHE.
- **S25 — Use SHA-256 or stronger for the TLS 1.2 key-exchange signature; never SHA-1 or MD5.** (medium · `tls-configuration`)
  Verify: Internet.nl key-exchange hash check, or SSL Labs handshake signature algorithm for simulated TLS 1.2 clients.
- **S26 — Use certificate keys of adequate size: RSA at least 2048 bits or ECDSA on P-256 or larger.** (medium · `tls-configuration`)
  Verify: SSL Labs certificate section reports the public key size/curve.
- **S27 — Serve a certificate chain signed with SHA-256 or stronger (no SHA-1 intermediates).** (low · `tls-configuration`)
  Verify: `openssl s_client -connect SITE:443 -showcerts` — every chain element's signature algorithm is SHA-256+; SSL Labs reports it.
- **S28 — Send Strict-Transport-Security with max-age=63072000 and includeSubDomains on HTTPS responses (max-age must not be 0).** (high · `hsts`)
  Verify: `curl -sI https://SITE/ | grep -i strict-transport-security` returns `max-age=63072000; includeSubDomains` (and max-age is not 0).
- **S29 — Omit the preload directive; do not submit the domain to the HSTS preload list.** (low · `hsts`)
  Verify: Header contains no `preload`; hstspreload.org does not list the domain.
- **S30 — Only set includeSubDomains when every subdomain works over HTTPS.** (medium · `hsts`)
  Verify: Enumerate subdomains (crt.sh / DNS) and `curl -I https://<sub>.SITE` for each — all must succeed over HTTPS while the header carries includeSubDomains.
- **S31 — Serve every subresource over HTTPS — an HTTPS page must load nothing over plain HTTP.** (high · `mixed-content`)
  Verify: `curl -s https://SITE/ | grep -oE '(src|href)="http://[^"]+"'` returns nothing (repeat for CSS files); browser DevTools console shows no mixed-content warnings.
- **S32 — Send the upgrade-insecure-requests CSP directive as a safety net.** (medium · `mixed-content`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep upgrade-insecure-requests` matches.
- **S33 — Use explicit https:// subresource URLs, never protocol-relative // URLs.** (low · `mixed-content`)
  Verify: `curl -s https://SITE/ | grep -E '(src|href)="//'` returns nothing.
- **S34 — Send Reporting-Endpoints on HTML responses naming at least a default endpoint.** (low · `reporting-endpoints`)
  Verify: `curl -sI https://SITE/ | grep -i reporting-endpoints` returns a well-formed header that defines a `default=` endpoint.
- **S35 — Do not use the deprecated Report-To header or CSP report-uri.** (low · `reporting-endpoints`)
  Verify: `curl -sI https://SITE/` shows no `Report-To` header, and the CSP uses `report-to` (not `report-uri`).
- **S36 — Publish /.well-known/security.txt over HTTPS returning 200 with Content-Type text/plain (the well-known path, not /security.txt).** (low · `security-txt`)
  Verify: `curl -sI https://SITE/.well-known/security.txt` returns 200 with `Content-Type: text/plain`; validate the file at securitytxt.org.
- **S37 — Include the required Contact field with a monitored contact URI.** (low · `security-txt`)
  Verify: `curl -s https://SITE/.well-known/security.txt | grep '^Contact:'` shows a mailto/https/tel URI.
- **S38 — Include a required, unexpired Expires field set roughly a year out.** (low · `security-txt`)
  Verify: `curl -s https://SITE/.well-known/security.txt | grep '^Expires:'` — an ISO 8601 date in the future; securitytxt.org validator passes.
- **S39 — Send X-Content-Type-Options: nosniff on every response.** (medium · `x-content-type-options`)
  Verify: `curl -sI https://SITE/ | grep -i x-content-type-options` prints `X-Content-Type-Options: nosniff` on HTML, assets, and API responses; securityheaders.com confirms.
- **S40 — The header value must be exactly the single token nosniff.** (low · `x-content-type-options`)
  Verify: Parse the header value from `curl -sI` — it equals `nosniff` exactly, with no additional tokens.
- **S41 — Pair nosniff with correct Content-Type labels on every response.** (low · `x-content-type-options`)
  Verify: `curl -sI https://SITE/app.js`, `/styles.css`, `/api.json` — Content-Type matches the file type.
- **S42 — Set CSP frame-ancestors, defaulting to 'none', as the clickjacking defence.** (medium · `frame-ancestors`)
  Verify: `curl -sI https://SITE/ | grep -i frame-ancestors` shows the directive; a test page on another origin with `<iframe src="https://SITE">` refuses to load.
- **S43 — Also send X-Frame-Options (DENY or SAMEORIGIN) as the legacy fallback alongside CSP.** (low · `frame-ancestors`)
  Verify: `curl -sI https://SITE/ | grep -i x-frame-options` returns DENY or SAMEORIGIN in addition to frame-ancestors.
- **S44 — Send the anti-framing headers on every HTML response, including login, signup, and OAuth screens.** (medium · `frame-ancestors`)
  Verify: `curl -sI` on homepage, /login, /signup, /password-reset — each carries frame-ancestors and/or X-Frame-Options.
- **S45 — Do not use the unsupported X-Frame-Options ALLOW-FROM value.** (low · `frame-ancestors`)
  Verify: Parse the X-Frame-Options value — it is not ALLOW-FROM.
- **S46 — Enforce a resource isolation policy that rejects remaining non-exempt cross-site requests with 403.** (medium · `fetch-metadata`)
  Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: no-cors' -H 'Sec-Fetch-Dest: image'` returns 403.
- **S47 — Do not block cross-site navigations outright — ordinary inbound links must keep working.** (medium · `fetch-metadata`)
  Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/ -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: navigate' -H 'Sec-Fetch-Dest: document'` returns the page's normal response code.
- **S48 — Allow a cross-site navigation only when the method is GET, mode is navigate, and dest is neither object nor embed.** (medium · `fetch-metadata`)
  Verify: Repeat the curl probe with `-H 'Sec-Fetch-Dest: object'` then `embed` — both rejected; with `document` — allowed.
- **S49 — Absent Sec-Fetch headers must not bypass the endpoint's existing authentication and CSRF checks.** (medium · `fetch-metadata`)
  Verify: `curl -s -o /dev/null -w '%{http_code}\n' https://SITE/account/settings` with no Sec-Fetch headers still returns an auth redirect/401/403, not the authenticated page.
- **S50 — Add Sec-Fetch-Site, Sec-Fetch-Mode, Sec-Fetch-Dest to Vary on cacheable responses the policy changes.** (low · `fetch-metadata`)
  Verify: `curl -sI` an allowed and a denied response — the `Vary` field lists the three Sec-Fetch headers.
- **S51 — Never require Sec-Fetch-User in the policy.** (low · `fetch-metadata`)
  Verify: Policy/config review shows no Sec-Fetch-User condition; observable as the site remaining functional in Safari.
- **S52 — Send COOP and CORP on every HTML response as a baseline.** (medium · `cross-origin-isolation`)
  Verify: `curl -sI https://SITE/ | grep -iE 'cross-origin-(opener|resource)-policy'` returns both headers.
- **S53 — Set Cross-Origin-Opener-Policy to same-origin.** (medium · `cross-origin-isolation`)
  Verify: `curl -sI https://SITE/ | grep -i cross-origin-opener-policy` shows `same-origin` (or `same-origin-allow-popups` where popup flows exist).
- **S54 — Set Cross-Origin-Resource-Policy to same-site.** (medium · `cross-origin-isolation`)
  Verify: `curl -sI https://SITE/ | grep -i cross-origin-resource-policy` shows `same-site` (or `cross-origin` for genuinely public embeddable assets).
- **S55 — Relax COOP to same-origin-allow-popups on pages that rely on OAuth or payment pop-ups.** (low · `cross-origin-isolation`)
  Verify: On pages that open popup flows, `curl -sI` shows `Cross-Origin-Opener-Policy: same-origin-allow-popups` and the popup flow completes in a browser.
- **S56 — Add COEP require-corp only when isolation-gated APIs are actually needed.** (low · `cross-origin-isolation`)
  Verify: `curl -sI https://SITE/ | grep -i cross-origin-embedder-policy` — COEP absent unless the site uses SharedArrayBuffer etc.; where present, DevTools `self.crossOriginIsolated` is true.
- **S57 — Serve CORP cross-origin on assets meant to be hot-linked by others.** (low · `cross-origin-isolation`)
  Verify: `curl -sI https://cdn.SITE/public-asset` shows `Cross-Origin-Resource-Policy: cross-origin` for resources other sites legitimately embed.
- **S58 — Send Referrer-Policy: strict-origin-when-cross-origin on HTML responses.** (medium · `referrer-policy`)
  Verify: `curl -sI https://SITE/ | grep -i referrer-policy` shows `strict-origin-when-cross-origin`.
- **S59 — Set the header explicitly rather than relying on browser defaults.** (low · `referrer-policy`)
  Verify: Spot-check `curl -sI` across HTML templates (home, article, product) — the header is present on each, not only some.
- **S60 — Use a stricter policy (same-origin or no-referrer) on pages with sensitive URLs such as password reset and account settings.** (medium · `referrer-policy`)
  Verify: `curl -sI https://SITE/password-reset | grep -i referrer-policy` shows `same-origin`/`no-referrer`, or the page carries `<meta name="referrer" content="no-referrer">`.
- **S61 — Never use the unsafe-url policy.** (medium · `referrer-policy`)
  Verify: Parse the Referrer-Policy value from `curl -sI` — it must not be `unsafe-url`.
- **S62 — Send Permissions-Policy on every HTML response, denying features the site does not use.** (medium · `permissions-policy`)
  Verify: `curl -sI https://SITE/ | grep -i permissions-policy` returns a header with empty allow-lists for unused features.
- **S63 — Disable camera, microphone, geolocation, and payment when the site does not use them.** (medium · `permissions-policy`)
  Verify: Parse the header for `camera=()`, `microphone=()`, `geolocation=()`, `payment=()` unless the feature is genuinely used; check effective policy at permissionspolicy.com.
- **S64 — Use the Permissions-Policy structured syntax, not the legacy Feature-Policy header.** (low · `permissions-policy`)
  Verify: `curl -sI https://SITE/ | grep -iE 'permissions-policy|feature-policy'` — Permissions-Policy with `()` lists present, no Feature-Policy header.
- **S65 — Do not allow * to make an iframe work — scope allowances to the specific origin.** (low · `permissions-policy`)
  Verify: Parse the header for any `=*` allowance (none expected); embedded iframes' `allow` attributes name only the features they need.
- **S66 — Give every third-party script and stylesheet an integrity attribute (SHA-384 of the exact file) plus crossorigin="anonymous".** (medium · `subresource-integrity`)
  Verify: `curl -s https://SITE/ | grep -oE '<(script|link)[^>]+(src|href)="https?://[^"]+"[^>]*>'` — every third-party tag carries both `integrity="sha384-…"` and `crossorigin="anonymous"`.
- **S67 — Pin third-party assets to immutable versioned URLs, never a "latest" CDN URL.** (low · `subresource-integrity`)
  Verify: Inspect third-party URLs in the HTML for version segments; re-fetching the URL later returns byte-identical content.
- **S68 — Ship Integrity-Policy-Report-Only as a site-wide tripwire for unhashed scripts.** (low · `subresource-integrity`)
  Verify: `curl -sI https://SITE/ | grep -i integrity-policy` returns the report-only header naming blocked destinations and an endpoint.
- **S69 — If digest fields are emitted, use sha-256 or sha-512 — the only Active IANA algorithms — never md5 or sha-1.** (low · `digest-fields`)
  Verify: `curl -sI https://SITE/data.json | grep -iE '^(content|repr)-digest'` — the algorithm token is sha-256 or sha-512.
- **S70 — Emit digests on machine-readable endpoints clients act on, and ensure they match the bytes received.** (low · `digest-fields`)
  Verify: `curl -sS -D h.txt -o body https://SITE/data.json`; `grep -i '^content-digest' h.txt`; `echo "sha-256=:$(openssl dgst -sha256 -binary body | openssl base64 -A):"` — the two lines match byte for byte, with and without `Accept-Encoding: gzip`.
- **S71 — Enable require-trusted-types-for 'script' with an explicit trusted-types policy allowlist.** (medium · `trusted-types`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy | grep "require-trusted-types-for"`; in DevTools on the live page, `document.body.innerHTML = '<img src=x>'` throws a TypeError.
- **S72 — Deploy Trusted Types in report-only mode first, then switch to enforcing.** (low · `trusted-types`)
  Verify: Rollout artifacts show `Content-Security-Policy-Report-Only` with the directives before the enforcing header appears in `curl -sI`.
- **S73 — Name the allowed policies in the trusted-types directive.** (low · `trusted-types`)
  Verify: Parse the CSP header — a `trusted-types` directive with explicit policy names accompanies `require-trusted-types-for 'script'`.
- **S74 — The default policy must sanitise input (e.g. DOMPurify), not pass it through unchanged.** (medium · `trusted-types`)
  Verify: On a live search/results page, inject markup with an event handler into a reflected parameter (e.g. `?q=<img src=x onerror=1>`) — the handler is stripped in the rendered DOM; the policy definition in shipped JS calls a sanitiser.
- **S75 — Send no X-XSS-Protection header at all — delete it.** (low · `x-xss-protection`)
  Verify: `curl -sI https://SITE/ | grep -i x-xss-protection` returns nothing (check through the full CDN/WAF chain, not just origin).
- **S76 — If a checklist forces the header to be present, its only acceptable value is 0 — never 1 or 1; mode=block.** (low · `x-xss-protection`)
  Verify: Parse the X-XSS-Protection value if present — it must be `0`, not `1` or `1; mode=block`.
- **S77 — Confirm the replacement landed: a CSP whose script-src has no 'unsafe-inline'.** (medium · `x-xss-protection`)
  Verify: `curl -sI https://SITE/ | grep -i content-security-policy` — the script-src directive carries no standalone `'unsafe-inline'`.
- **S78 — Set Secure, HttpOnly (where possible), and an explicit SameSite on every cookie.** (high · `cookie-attributes`)
  Verify: `curl -sI https://SITE/ | grep -i set-cookie` — each Set-Cookie carries Secure, HttpOnly (unless JS must read it), and SameSite; DevTools → Application → Cookies shows the same per row.
- **S79 — Every cookie that carries identity must have the Secure attribute.** (high · `cookie-attributes`)
  Verify: Inspect all Set-Cookie headers (curl plus DevTools after sign-in) — session/auth cookies all carry `Secure`.
- **S80 — Every session cookie must be HttpOnly.** (high · `cookie-attributes`)
  Verify: Signed in, run `document.cookie` in DevTools console — the session cookie is absent; DevTools cookie table shows HttpOnly ticked.
- **S81 — Use the __Host- prefix for session cookies.** (medium · `cookie-attributes`)
  Verify: Inspect Set-Cookie after sign-in — the session cookie name starts `__Host-`.
- **S82 — __Host- cookies must be Secure, Path=/, and carry no Domain attribute.** (low · `cookie-attributes`)
  Verify: Parse the `__Host-` Set-Cookie header — attributes are exactly Secure, Path=/, no Domain; the browser accepts it.
- **S83 — Any SameSite=None cookie must also carry Secure.** (medium · `cookie-attributes`)
  Verify: Parse every Set-Cookie with `SameSite=None` — each also carries `Secure`; DevTools shows the cookie actually stored.
- **S84 — Always set an explicit Path and a Max-Age or Expires on cookies.** (low · `cookie-attributes`)
  Verify: Parse Set-Cookie headers — Path and Max-Age/Expires present; Domain absent unless subdomain sharing is intended.
- **S85 — Do not treat SameSite as complete CSRF defence — pair it with CSRF tokens or a Sec-Fetch-Site check, and keep state changes out of GET.** (medium · `cookie-attributes`)
  Verify: View source of authenticated forms — CSRF token fields present; state-changing endpoints reject cross-site requests (see the Fetch-Metadata curl probe) and are not reachable by plain GET.
- **S86 — Send Clear-Site-Data on the sign-out response, listing the data types to clear.** (low · `clear-site-data`)
  Verify: Never probe `/logout` yourself — sign-out is a side-effect URL and many servers process HEAD like GET. Observe the header only on a capture or response the dispatch supplies; otherwise mark S86 not run. After a natural sign-out, DevTools → Application shows cookies and storage empty.
- **S87 — Never send Clear-Site-Data site-wide — only on the exact responses that should clear data.** (medium · `clear-site-data`)
  Verify: `curl -sI https://SITE/` and other normal pages — the header is absent everywhere except the sign-out flow.
- **S88 — Clear-Site-Data values must be quoted tokens.** (low · `clear-site-data`)
  Verify: Parse the header — every directive is a double-quoted token such as `"cache", "cookies", "storage"`.
- **S89 — Publish at least one CAA record at the domain apex restricting which CAs may issue.** (medium · `caa-records`)
  Verify: `dig CAA example.com +short` returns one or more records.
- **S90 — Set issuewild explicitly so wildcard issuance does not silently inherit the issue tag.** (low · `caa-records`)
  Verify: `dig CAA example.com +short` includes an `issuewild` entry (e.g. `issuewild ";"` when wildcards are not used).
- **S91 — Include an iodef contact for CA incident reports.** (low · `caa-records`)
  Verify: `dig CAA example.com +short` includes an `iodef "mailto:…"` record.
- **S92 — The prefixes holding the site's servers must be RPKI-valid (covered by a ROA with matching origin ASN).** (medium · `rpki`)
  Verify: Look up the site's A/AAAA addresses on stat.ripe.net — RPKI validation status reads "valid"; the Internet.nl website test RPKI section agrees.
- **S93 — Check the name servers and MX hosts' prefixes too, not just the web server.** (low · `rpki`)
  Verify: Resolve NS and MX targets, look up each address's prefix on RIPEstat — every one is RPKI-valid.
- **S94 — If DNSSEC is deployed, the full chain must validate: signed zone plus DS record at the parent.** (low · `dnssec`)
  Verify: `dig +dnssec example.com` returns RRSIG records with the `ad` flag; Verisign DNSSEC Debugger or DNSViz shows a green chain to the root.
- **S95 — Use DNSSEC algorithm 13 (ECDSA P-256 with SHA-256) as the modern default.** (low · `dnssec`)
  Verify: `dig DNSKEY example.com +short` — the KSK (flag 257) uses algorithm 13.
- **S96 — A signed zone must also publish the DS record — signing without DS provides no protection.** (low · `dnssec`)
  Verify: Verisign DNSSEC Debugger shows a DS at the parent zone matching the child's KSK.
- **S97 — A TLSA record for HTTPS is only meaningful in a DNSSEC-signed zone; without DNSSEC, do not bother.** (low · `dane`)
  Verify: `dig +dnssec TLSA _443._tcp.www.SITE` — if records exist, confirm the zone's DNSSEC chain validates (ad flag / DNSViz); if the zone is unsigned, no TLSA should be published.
- **S98 — Publish TLSA at _443._tcp. plus the exact hostname clients connect to.** (low · `dane`)
  Verify: `dig +dnssec TLSA _443._tcp.www.example.com` returns the record with the `ad` flag from a validating resolver, for each served hostname.
