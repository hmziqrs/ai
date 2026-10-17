# Distilled audit requirements — well-known URIs (specification.website)

Each block: requirement, quote (verbatim single source line), source path, verify method, severity.
Source paths are workspace-relative, exactly as the evidence pages were listed.

## General well-known rules (well-known-overview.md)

### 1. Well-known resources must be served under the /.well-known/ prefix with the leading dot, at the exact spec-defined name
Requirement: Every well-known resource the site publishes must live at the exact registered path `/.well-known/<name>` — leading dot present, name spelled and cased exactly as the spec defines — never under `/well-known/` or a renamed variant.
Quote: - Publishing under `/well-known/` (no leading dot). The spec requires `/.well-known/`.
Source: .zflow/evidence/specweb/well-known/well-known-overview.md
Verify: For each well-known resource the site exposes, `curl -sI https://example.com/.well-known/<name>` returns the document, and probing the dot-less `/well-known/<name>` variant (`curl -s -o /dev/null -w '%{http_code}' https://example.com/well-known/<name>`) is not the canonical location; compare the name spelling against the IANA well-known registry.
Severity: medium

### 2. Well-known resources must be served over HTTPS on the canonical host
Requirement: Each published well-known resource must be reachable over HTTPS on the site's canonical host.
Quote: - Serve the resource over **HTTPS** on the canonical host.
Source: .zflow/evidence/specweb/well-known/well-known-overview.md
Verify: `curl -sI https://example.com/.well-known/<name>` returns 200 with a valid certificate; the plain-HTTP request `curl -sI http://example.com/.well-known/<name>` upgrades/redirects to HTTPS.
Severity: medium

### 3. Well-known resources must pass through CDN, firewall, and auth middleware — no login wall, no user-agent blocking
Requirement: Well-known resources must be fetchable by an unauthenticated external client; authentication walls, user-agent blocks, and aggressive rate limits that fail legitimate probes are not allowed.
Quote: - Allow your CDN, firewall and authentication middleware to pass through. A well-known URI behind a login wall is invisible.
Source: .zflow/evidence/specweb/well-known/well-known-overview.md
Verify: From a network outside the site's own (read-only probe, no cookies): `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (compatible; auditor)' https://example.com/.well-known/<name>` returns 200, not 401/403/429.
Severity: medium

### 4. Only IANA-registered names may be published under /.well-known/
Requirement: The site must not publish custom, unregistered names under `/.well-known/`; any name used must appear in the IANA Well-Known URIs registry.
Quote: - **Do not invent new names.** If you need a new well-known URI, register it via the IETF process described in RFC 8615 §3.
Source: .zflow/evidence/specweb/well-known/well-known-overview.md
Verify: Enumerate the site's well-known paths (Link headers, HTML references, common-probe list) and cross-check each name against https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml.
Severity: low

### 5. Each well-known resource must be served with the Content-Type its spec defines
Requirement: Every well-known resource must be served with the correct Content-Type for its spec (e.g. `application/json`, `application/jrd+json`, `application/linkset+json`), never `text/html` from a framework-wrapped route.
Quote: - Set the **correct Content-Type** (often `application/json`, sometimes plain text or JSON variants like `application/jrd+json`).
Source: .zflow/evidence/specweb/well-known/well-known-overview.md
Verify: `curl -sI https://example.com/.well-known/<name> | grep -i '^content-type:'` returns the spec's media type, not text/html.
Severity: medium

## /.well-known/change-password

### 6. Sites with user accounts must serve a 302/303 redirect at /.well-known/change-password
Requirement: If the site offers user accounts (a login flow), `/.well-known/change-password` must respond with an HTTP 302 or 303 redirect pointing at the real change-password page; account-less marketing/docs sites should omit it instead.
Quote: Serve an HTTP **302** (or **303**) redirect from `/.well-known/change-password` to your actual change-password page.
Source: .zflow/evidence/specweb/well-known/change-password.md
Verify: `curl -sI https://example.com/.well-known/change-password` shows status 302 or 303 with a `Location:` header.
Severity: medium

### 7. The redirect destination must be the change-password page, not the forgot-password reset or sign-up flow
Requirement: The Location target must be the page where a logged-in user changes an existing password — not the forgot-password reset flow and not the sign-up page.
Quote: - The destination must be the page where a logged-in user can **change their existing password** — not the password reset flow for forgotten passwords, and not the sign-up page.
Source: .zflow/evidence/specweb/well-known/change-password.md
Verify: `loc=$(curl -sI https://example.com/.well-known/change-password | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')` then inspect the URL path and `curl -sL "$loc" | grep -iE 'forgot|reset|sign-?up|create.account'` — the destination must not be the reset or registration page.
Severity: medium

### 8. Sites with user accounts must not return 404 at /.well-known/change-password
Requirement: On a site with user accounts, `/.well-known/change-password` must not return 404 — a 404 tells password managers the feature is unsupported.
Quote: - Do not return **404**. A 404 tells password managers the feature is not supported.
Source: .zflow/evidence/specweb/well-known/change-password.md
Verify: `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/change-password` is not 404 for sites that have a login flow.
Severity: medium

## /.well-known/webauthn

### 9. Sites using passkeys across multiple origins must publish /.well-known/webauthn as application/json with a full-origins array
Requirement: If passkeys are shared across more than one origin, the RP ID's origin must serve `/.well-known/webauthn` with HTTP 200, Content-Type application/json, and an `origins` array of complete scheme+host origin strings.
Quote: - Include an `origins` array of the full origins (scheme + host) allowed to use this RP ID's passkeys.
Source: .zflow/evidence/specweb/well-known/webauthn.md
Verify: `curl -sI https://example.com/.well-known/webauthn` shows 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/webauthn | jq -e '.origins | type == "array" and all(.[]; test("^https?://"))'` returns true.
Severity: medium

### 10. /.well-known/webauthn must be fetchable without credentials and without a Referer header
Requirement: The webauthn file must not be gated behind cookies, authentication, or WAF rules that block header-less requests, because browsers fetch it credential-less and Referer-less.
Quote: - The browser fetches it **without credentials and without a `Referer` header**, so do not gate it behind cookies, authentication, or a WAF rule that blocks header-less requests.
Source: .zflow/evidence/specweb/well-known/webauthn.md
Verify: `curl -s -o /dev/null -w '%{http_code}' -H 'Cookie:' -H 'Referer:' https://example.com/.well-known/webauthn` returns 200 (curl sends no Referer by default, matching the browser's fetch).
Severity: medium

### 11. The webauthn origins array must not list more than five distinct registrable domains, important origins first
Requirement: The `origins` array must stay within the browser cap of five distinct registrable domains, ordered so the important origins come first.
Quote: - Listing more registrable domains than the browser will honour. Implementations cap the number of distinct registrable domains processed (five in current browsers) — order the array so the important origins come first.
Source: .zflow/evidence/specweb/well-known/webauthn.md
Verify: `curl -s https://example.com/.well-known/webauthn | jq '[.origins[] | capture("^https?://(?<h>[^/]+)").h] | unique | length'` is ≤ 5.
Severity: low

## /.well-known/openid-configuration

### 12. OIDC providers must publish a valid openid-configuration JSON with the required endpoints
Requirement: If the site operates an OpenID Connect identity provider (not merely a relying party), `/.well-known/openid-configuration` must be valid application/json containing at least `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri`.
Quote: The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint` and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
Source: .zflow/evidence/specweb/well-known/openid-configuration.md
Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; `curl -sI` the same URL shows `Content-Type: application/json`.
Severity: high

### 13. The openid-configuration issuer must exactly match the URL clients use, with no trailing slash
Requirement: The `issuer` value must match the issuer URL clients use character-for-character — same scheme, host, port, casing, and no trailing slash.
Quote: - The `issuer` value must **exactly match** the URL clients use, including scheme and absence of trailing slash. Mismatches are the single most common cause of "invalid issuer" errors.
Source: .zflow/evidence/specweb/well-known/openid-configuration.md
Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -r .issuer` equals the advertised issuer URL exactly (string compare; flag any trailing slash, port, or casing difference).
Severity: high

### 14. The openid-configuration jwks_uri must be reachable and return current signing keys
Requirement: The `jwks_uri` endpoint must resolve and return the provider's current signing keys.
Quote: - The `jwks_uri` must be reachable and return current signing keys.
Source: .zflow/evidence/specweb/well-known/openid-configuration.md
Verify: `curl -s "$(curl -s https://login.example.com/.well-known/openid-configuration | jq -r .jwks_uri)" | jq -e '.keys | length > 0'` returns true.
Severity: high

### 15. openid-configuration must set a minutes-to-hours Cache-Control, not days
Requirement: The discovery document must be cached for minutes to hours, not days, so clients re-fetch on errors and pick up endpoint changes.
Quote: - Set `Cache-Control` sensibly — minutes to hours, not days. Clients re-fetch on errors.
Source: .zflow/evidence/specweb/well-known/openid-configuration.md
Verify: `curl -sI https://login.example.com/.well-known/openid-configuration | grep -i cache-control` shows a max-age in the minutes-to-hours range (≤ 86400, not multi-day values).
Severity: low

## /.well-known/oauth-authorization-server

### 16. Plain OAuth 2.0 authorization servers must publish valid metadata with issuer, endpoints, and jwks_uri
Requirement: If the site runs a plain OAuth 2.0 authorization server (no OIDC layer), `/.well-known/oauth-authorization-server` must be valid application/json with at least `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri`; OAuth consumers that are only clients must not publish it.
Quote: The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
Source: .zflow/evidence/specweb/well-known/oauth-authorization-server.md
Verify: `curl -s https://login.example.com/.well-known/oauth-authorization-server | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; issuer string-compares exactly to the advertised issuer URL.
Severity: high

### 17. Path-bearing issuers must serve oauth-authorization-server with the well-known segment inserted before the path (RFC 8414)
Requirement: For an issuer with a path component, the metadata must be served at `https://host/.well-known/oauth-authorization-server/<path>` (insert rule), not the OIDC-style appended path.
Quote: The one rule that trips people up: for an issuer that has a **path component**, RFC 8414 _inserts_ the well-known segment before the path — issuer `https://example.com/tenant1` → `https://example.com/.well-known/oauth-authorization-server/tenant1` — whereas OIDC _appends_ it (`https://example.com/tenant1/.well-known/openid-configuration`). Get this wrong and multi-tenant clients cannot find you.
Source: .zflow/evidence/specweb/well-known/oauth-authorization-server.md
Verify: For issuer `https://example.com/tenant1`, `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/oauth-authorization-server/tenant1` returns 200 with valid JSON.
Severity: medium

## /.well-known/oauth-protected-resource

### 18. OAuth-protected APIs must publish resource metadata with resource and authorization_servers
Requirement: If the site exposes an OAuth-protected resource (token-required API, including authenticated MCP servers), `/.well-known/oauth-protected-resource` must be valid JSON with at least `resource` and `authorization_servers`.
Quote: The response should be valid JSON with at least `resource` and `authorization_servers`. Trigger a `401` from the resource and confirm the `WWW-Authenticate` header carries a `resource_metadata` link back to this document.
Source: .zflow/evidence/specweb/well-known/oauth-protected-resource.md
Verify: `curl -s https://api.example.com/.well-known/oauth-protected-resource | jq -e '.resource and (.authorization_servers | length > 0)'` returns true; the document is fetchable unauthenticated.
Severity: medium

### 19. 401 responses from a protected resource must carry WWW-Authenticate with a resource_metadata pointer
Requirement: When the protected resource returns 401, the response must include a `WWW-Authenticate` header with a `resource_metadata` parameter pointing at the protected-resource metadata URL.
Quote: - On a `401`, set `WWW-Authenticate` with a `resource_metadata` parameter pointing at this URL, so discovery works without out-of-band configuration.
Source: .zflow/evidence/specweb/well-known/oauth-protected-resource.md
Verify: `curl -si https://api.example.com/ | grep -i '^www-authenticate:'` includes `resource_metadata="https://api.example.com/.well-known/oauth-protected-resource"` (send the request without a token to trigger the 401).
Severity: medium

## /.well-known/gpc.json

### 20. gpc.json, if published, must be 200 application/json with a top-level object containing a boolean gpc member
Requirement: If the site publishes `/.well-known/gpc.json`, it must return 200 with Content-Type application/json and a JSON object whose `gpc` member is a boolean — not a string, not an array wrapper.
Quote: Serve the document at exactly `/.well-known/gpc.json` on the canonical host, over HTTPS, with `Content-Type: application/json`. A different media type leaves your support status unknown, which defeats the point.
Source: .zflow/evidence/specweb/well-known/gpc-json.md
Verify: `curl -sI https://example.com/.well-known/gpc.json` returns 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/gpc.json | jq -e 'type == "object" and (.gpc | type == "boolean")'` returns true.
Severity: medium

### 21. gpc: true may only be published if the site actually honours Sec-GPC: 1 opt-outs
Requirement: A published `"gpc": true` must be truthful — the site must actually process `Sec-GPC: 1` requests by not selling/sharing that user's personal information (no advertising or data-broker tags on GPC requests).
Quote: - **Only publish `"gpc": true` if it is true.** Process `Sec-GPC: 1` first; publish second.
Source: .zflow/evidence/specweb/well-known/gpc-json.md
Verify: `curl -sI -H 'Sec-GPC: 1' https://example.com/` — compare against a request without the header; the GPC response must not set advertising or data-broker cookies/tags (inspect `Set-Cookie` and third-party beacon URLs in the body).
Severity: high

### 22. gpc.json lastUpdate must be an RFC 3339 date that reflects the last review, not years stale
Requirement: `lastUpdate` must be an RFC 3339 date (`YYYY-MM-DD` or full timestamp) set to the day the statement was last reviewed, and must not be left stale for years.
Quote: - **Set `lastUpdate` to the day the statement was last reviewed**, and revisit it when your data practices change.
Source: .zflow/evidence/specweb/well-known/gpc-json.md
Verify: `curl -s https://example.com/.well-known/gpc.json | jq -r .lastUpdate` matches `^\d{4}-\d{2}-\d{2}` (or full timestamp) and is not years in the past relative to the audit date.
Severity: low

## /.well-known/api-catalog

### 23. api-catalog must be served as application/linkset+json with a valid Linkset body
Requirement: If published, `/.well-known/api-catalog` must return 200 with `Content-Type: application/linkset+json` (not application/json or text/plain) and the body must be a valid RFC 9264 Linkset.
Quote: **Serve a Linkset.** RFC 9727 requires the response body to be a valid [Linkset](https://www.rfc-editor.org/rfc/rfc9264). The media type is `application/linkset+json`. Set the `Content-Type` accordingly — most static hosts default to `application/octet-stream` for files without an extension.
Source: .zflow/evidence/specweb/well-known/api-catalog.md
Verify: `curl -sI https://example.com/.well-known/api-catalog | grep -i '^content-type:'` shows `application/linkset+json`; `curl -s https://example.com/.well-known/api-catalog | jq -e '.linkset | type == "array" and all(.[]; has("anchor"))'` returns true.
Severity: low

### 24. The api-catalog must be advertised via a Link header with rel="api-catalog"
Requirement: Responses must advertise the catalogue in the HTTP `Link` header using the `api-catalog` relation (not `describedby`), so agents can find the path without guessing.
Quote: **Advertise it.** Add the catalogue to your HTTP `Link` header on every response:
Source: .zflow/evidence/specweb/well-known/api-catalog.md
Verify: `curl -sI https://example.com/ | grep -i '^link:'` contains `</.well-known/api-catalog>; rel="api-catalog"` (or the absolute-URL equivalent with `type="application/linkset+json"`).
Severity: low

### 25. api-catalog relation names must come from the IANA Link Relations registry
Requirement: Every relation key used in the Linkset must be a registered IANA link relation; invented relation names are not allowed.
Quote: - Inventing relation names. Use only those in the [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
Source: .zflow/evidence/specweb/well-known/api-catalog.md
Verify: `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | keys[]' | sort -u | grep -v '^anchor$'` — every listed relation appears in the IANA registry at https://www.iana.org/assignments/link-relations/link-relations.xhtml.
Severity: low

### 26. Every URL the api-catalog points at must return 200 from the same origin
Requirement: The catalogue must not drift: every href it lists must return 200 from the same origin.
Quote: - Every URL the catalogue points at returns `200` from the same origin.
Source: .zflow/evidence/specweb/well-known/api-catalog.md
Verify: Extract hrefs with `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | to_entries[] | select(.key != "anchor") | .value[].href'` and fetch each: `curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' -L "$href"` — all 200 and same-origin.
Severity: low

## /.well-known/webfinger

### 27. Federated sites must answer WebFinger queries with application/jrd+json
Requirement: If the site hosts federated accounts, `/.well-known/webfinger?resource=<id>` must accept GET with a `resource` parameter and return Content-Type `application/jrd+json` — not application/json or text/plain.
Quote: Accept GET requests with a `resource` query parameter. Return `application/jrd+json`.
Source: .zflow/evidence/specweb/well-known/webfinger.md
Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^content-type:'` shows `application/jrd+json`.
Severity: medium

### 28. WebFinger must answer on the host matching the acct: handle's domain
Requirement: WebFinger must be served on the host that forms the right-hand side of the `acct:` identifier (e.g. `example.com`, not only `social.example.com`).
Quote: - Serve over **HTTPS**, and respond on the host that matches the right-hand side of the `acct:` URI. A query for `joost@example.com` must be answered by `example.com`, not `social.example.com`.
Source: .zflow/evidence/specweb/well-known/webfinger.md
Verify: For a known handle `user@example.com`, `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger?resource=acct:user@example.com"` returns 200 directly on the apex host (a redirect to a subdomain host or failure is a miss).
Severity: medium

### 29. WebFinger must return 400 for missing/malformed resource parameters and 404 for unknown resources
Requirement: A WebFinger request with a missing or malformed `resource` parameter must return 400, and an unknown resource must return 404, consistently (no account-existence leaks via mixed responses).
Quote: - Return `404` for unknown resources, `400` for a missing or malformed `resource` parameter.
Source: .zflow/evidence/specweb/well-known/webfinger.md
Verify: `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger"` (no resource parameter) returns 400; a query for a non-existent account returns 404.
Severity: low

### 30. WebFinger responses must set Access-Control-Allow-Origin: *
Requirement: WebFinger responses must carry `Access-Control-Allow-Origin: *` so browser-based clients can fetch them.
Quote: - Set permissive `Access-Control-Allow-Origin: *` so browser-based clients can fetch the response.
Source: .zflow/evidence/specweb/well-known/webfinger.md
Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^access-control-allow-origin:'` shows `*`.
Severity: low

## /.well-known/apple-app-site-association

### 31. AASA must be served at the exact extension-less path with Content-Type application/json
Requirement: If the site has an Apple-platform app, the AASA file must live at exactly `/.well-known/apple-app-site-association` (no `.json` extension) and return `Content-Type: application/json`.
Quote: - The path is **exactly** `/.well-known/apple-app-site-association` with **no `.json` extension**.
Source: .zflow/evidence/specweb/well-known/apple-app-site-association.md
Verify: `curl -sI https://example.com/.well-known/apple-app-site-association` returns 200 with `Content-Type: application/json` at the extension-less path; Apple's App Search API Validation Tool (https://search.developer.apple.com/appsearch-validation-tool/) reports the file loaded.
Severity: medium

### 32. AASA must return 200 directly over HTTPS with no redirect
Requirement: The AASA response must be served over HTTPS with a valid certificate and answer 200 directly — Apple treats a redirect as a hard failure.
Quote: - The response must be served over **HTTPS** with a valid certificate. No redirects: respond with `200` directly.
Source: .zflow/evidence/specweb/well-known/apple-app-site-association.md
Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/apple-app-site-association` shows status 200 and redirects=0.
Severity: medium

### 33. AASA must be reachable by Apple's CDN fetcher (no WAF/UA blocking, no challenge pages)
Requirement: The AASA file must be publicly accessible with no authentication, and Apple's CDN user agent (`app-site-association.cdn-apple.com`) must be allowed through the WAF.
Quote: - Apple fetches the file through its own CDN (`app-site-association.cdn-apple.com`). Allow that user agent through your WAF.
Source: .zflow/evidence/specweb/well-known/apple-app-site-association.md
Verify: `curl -s -o /dev/null -w '%{http_code}' -A 'app-site-association.cdn-apple.com' https://example.com/.well-known/apple-app-site-association` returns 200 (not 403/429 and not a challenge/interstitial page).
Severity: medium

### 34. AASA must be valid JSON under 128 KB
Requirement: The AASA document must parse as valid JSON and stay under Apple's 128 KB size limit.
Quote: - Keep the JSON **valid** and under Apple's size limit (currently 128 KB).
Source: .zflow/evidence/specweb/well-known/apple-app-site-association.md
Verify: `curl -s https://example.com/.well-known/apple-app-site-association | tee /tmp/aasa.json | jq -e . > /dev/null && wc -c < /tmp/aasa.json` — jq exits 0 and the byte count is < 131072.
Severity: medium

### 35. AASA applinks must use the modern components key, not only the legacy paths key
Requirement: Universal Links configuration must use the `components` key (shipping `paths` alongside during migration is acceptable; `paths` alone is not).
Quote: - Using only `paths` (the old key) without `components`. Modern iOS versions prefer `components`; ship both during migration.
Source: .zflow/evidence/specweb/well-known/apple-app-site-association.md
Verify: `curl -s https://example.com/.well-known/apple-app-site-association | jq '.applinks.details[] | has("components")'` returns true for every detail entry.
Severity: low

## /.well-known/assetlinks.json

### 36. assetlinks.json must be served at the exact .json path with 200, application/json, no redirect
Requirement: If the site has an Android app, `/.well-known/assetlinks.json` (the `.json` extension is required) must respond 200 directly with `Content-Type: application/json` over HTTPS, publicly readable.
Quote: - The path is **exactly** `/.well-known/assetlinks.json`. The `.json` extension is required here (unlike Apple's [AASA](/spec/well-known/apple-app-site-association/), which has no extension).
Source: .zflow/evidence/specweb/well-known/assetlinks-json.md
Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/assetlinks.json` shows 200/0, and `curl -sI` the same URL shows `Content-Type: application/json`; `curl -s ... | jq -e 'type == "array"'` confirms the JSON-array shape.
Severity: medium

### 37. assetlinks.json must carry SHA-256 fingerprints for every release signing certificate including Play App Signing
Requirement: Each Android app entry must list `sha256_cert_fingerprints` covering the signing certificate of every release variant — the Play App Signing key, not just the upload key.
Quote: - The `sha256_cert_fingerprints` must include the SHA-256 of the signing certificate of every release variant — including the Play App Signing key, not just your upload key.
Source: .zflow/evidence/specweb/well-known/assetlinks-json.md
Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.sha256_cert_fingerprints[]'` lists at least one 32-octet colon-separated SHA-256 per entry (presence/format is externally checkable; matching the true release key is owner-side via `adb shell pm get-app-links <package>`).
Severity: medium

### 38. Every relevant Android package, including beta/staging, must have its own assetlinks entry
Requirement: Each Android package that acts on the domain (including beta or staging packages) needs its own entry in assetlinks.json.
Quote: - Declare every relevant app, including any beta or staging packages.
Source: .zflow/evidence/specweb/well-known/assetlinks-json.md
Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.package_name'` and compare against every package the site links to (Play Store links on the site's app/download pages); flag missing packages.
Severity: low

## /.well-known/nodeinfo

### 39. /.well-known/nodeinfo must be a links pointer, not the NodeInfo document itself
Requirement: If the site is a federated server, `/.well-known/nodeinfo` must return application/json containing a `links` array pointing at the versioned NodeInfo documents — not the NodeInfo document itself.
Quote: - Returning the NodeInfo document directly from `/.well-known/nodeinfo`. The well-known URI is a pointer; the document lives elsewhere.
Source: .zflow/evidence/specweb/well-known/nodeinfo.md
Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -e '.links | length > 0'` returns true and the body has no top-level `software` key; `curl -sI` shows `Content-Type: application/json`.
Severity: low

### 40. NodeInfo documents must use schema 2.0 or 2.1 (older versions deprecated)
Requirement: The linked NodeInfo documents must support at least one current schema version (2.0 or 2.1); 1.0/1.1 are deprecated.
Quote: - Support at least one of the current schema versions (2.0 or 2.1). Older versions (1.0, 1.1) are deprecated.
Source: .zflow/evidence/specweb/well-known/nodeinfo.md
Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -r '.links[].rel'` includes `http://nodeinfo.diaspora.software/ns/schema/2.0` or `.../2.1`, and fetching that href returns `"version": "2.0"` or `"2.1"` via jq.
Severity: low

### 41. NodeInfo responses must set permissive CORS
Requirement: NodeInfo responses must set `Access-Control-Allow-Origin: *` so browser-based dashboards can read them.
Quote: - Set permissive CORS (`Access-Control-Allow-Origin: *`) so browser-based dashboards can read it.
Source: .zflow/evidence/specweb/well-known/nodeinfo.md
Verify: `curl -sI https://example.com/.well-known/nodeinfo | grep -i '^access-control-allow-origin:'` shows `*`.
Severity: low

## /.well-known/traffic-advice

### 42. traffic-advice, if published, must use Content-Type application/trafficadvice+json exactly
Requirement: If the site ships `/.well-known/traffic-advice`, the response must use `Content-Type: application/trafficadvice+json` — any other value (including application/json) is ignored as no advice.
Quote: - **`Content-Type: application/trafficadvice+json` is mandatory.** Any other value (including `application/json`) is treated as no advice and the proxy uses its default.
Source: .zflow/evidence/specweb/well-known/traffic-advice.md
Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^content-type:'` shows exactly `application/trafficadvice+json`.
Severity: low

### 43. traffic-advice cache freshness must sit between 10 minutes and 48 hours
Requirement: The traffic-advice response must set a Cache-Control freshness of at least 10 minutes and at most 48 hours so posture changes propagate in an operationally reasonable window.
Quote: - **Cache lifetime.** The spec suggests a minimum freshness of 10 minutes and a maximum of 48 hours; agents default to 30 minutes when no `Cache-Control` is set. Pick a value short enough that posture changes propagate within an operationally reasonable window.
Source: .zflow/evidence/specweb/well-known/traffic-advice.md
Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^cache-control:'` — the max-age value is between 600 and 172800 seconds.
Severity: low

### 44. traffic-advice body must be a JSON array of user_agent entries with disallow or fraction 0–1
Requirement: The body must be a JSON array where each entry has a string `user_agent` and either `disallow: true` or a numeric `fraction` between 0 and 1; `disallow: true` is the documented refusal vocabulary.
Quote: Confirm `Content-Type: application/trafficadvice+json` and a sensible `Cache-Control`. The body should parse as a JSON array; each entry should have a string `user_agent` and one of `disallow: true` or a numeric `fraction` between 0 and 1.
Source: .zflow/evidence/specweb/well-known/traffic-advice.md
Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -e 'type == "array" and all(.[]; (.user_agent | type == "string") and ((.disallow == true) or ((.fraction // -1) >= 0 and (.fraction // 2) <= 1)))'` returns true.
Severity: low

### 45. traffic-advice entries must be ordered broadest match first
Requirement: Advice entries must list the broadest identity first (e.g. `"prefetch-proxy"`), then narrower per-implementer exceptions, because a proxy takes the earliest match in its identity list.
Quote: - **Match ordering.** List the broadest advice first (`"prefetch-proxy"`), then narrower per-implementer exceptions. A proxy walks its own identity list and takes the earliest match.
Source: .zflow/evidence/specweb/well-known/traffic-advice.md
Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -r '.[].user_agent'` — the generic `"prefetch-proxy"` (or `"*"`) entry appears before any implementer-specific brand entry.
Severity: low
