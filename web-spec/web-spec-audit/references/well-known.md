# Well-Known URIs — 45 audit checks

IANA-registered metadata under `/.well-known/`: general serving rules plus per-file contracts for change-password, webauthn, OpenID/OAuth discovery, gpc.json, api-catalog, webfinger, AASA, assetlinks, nodeinfo, and traffic-advice.

Source: [The Website Specification](https://specification.website/spec/well-known/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.5, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/well-known/<slug>/.

Checklist status (`meta/checklist.md`): **Recommended** — well-known overview, api-catalog.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

- **WK-1 — Well-known resources must be served under the /.well-known/ prefix with the leading dot, at the exact spec-defined name** (medium · `well-known-overview`)
  Verify: For each well-known resource the site exposes, `curl -sI https://example.com/.well-known/<name>` returns the document, and probing the dot-less `/well-known/<name>` variant (`curl -s -o /dev/null -w '%{http_code}' https://example.com/well-known/<name>`) is not the canonical location; compare the name spelling against the IANA well-known registry.
- **WK-2 — Well-known resources must be served over HTTPS on the canonical host** (medium · `well-known-overview`)
  Verify: `curl -sI https://example.com/.well-known/<name>` returns 200 with a valid certificate; the plain-HTTP request `curl -sI http://example.com/.well-known/<name>` upgrades/redirects to HTTPS.
- **WK-3 — Well-known resources must pass through CDN, firewall, and auth middleware — no login wall, no user-agent blocking** (medium · `well-known-overview`)
  Verify: From a network outside the site's own (read-only probe, no cookies): `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (compatible; auditor)' https://example.com/.well-known/<name>` returns 200, not 401/403/429.
- **WK-4 — Only IANA-registered names may be published under /.well-known/** (low · `well-known-overview`)
  Verify: Enumerate the site's well-known paths (Link headers, HTML references, common-probe list) and cross-check each name against https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml.
- **WK-5 — Each well-known resource must be served with the Content-Type its spec defines** (medium · `well-known-overview`)
  Verify: `curl -sI https://example.com/.well-known/<name> | grep -i '^content-type:'` returns the spec's media type, not text/html.
- **WK-6 — Sites with user accounts must serve a 302/303 redirect at /.well-known/change-password** (medium · `change-password`)
  Verify: `curl -sI https://example.com/.well-known/change-password` shows status 302 or 303 with a `Location:` header.
- **WK-7 — The redirect destination must be the change-password page, not the forgot-password reset or sign-up flow** (medium · `change-password`)
  Verify: `loc=$(curl -sI https://example.com/.well-known/change-password | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')` then inspect the URL path and `curl -sL "$loc" | grep -iE 'forgot|reset|sign-?up|create.account'` — the destination must not be the reset or registration page.
- **WK-8 — Sites with user accounts must not return 404 at /.well-known/change-password** (medium · `change-password`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/change-password` is not 404 for sites that have a login flow.
- **WK-9 — Sites using passkeys across multiple origins must publish /.well-known/webauthn as application/json with a full-origins array** (medium · `webauthn`)
  Verify: `curl -sI https://example.com/.well-known/webauthn` shows 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/webauthn | jq -e '.origins | type == "array" and all(.[]; test("^https?://"))'` returns true.
- **WK-10 — /.well-known/webauthn must be fetchable without credentials and without a Referer header** (medium · `webauthn`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' -H 'Cookie:' -H 'Referer:' https://example.com/.well-known/webauthn` returns 200 (curl sends no Referer by default, matching the browser's fetch).
- **WK-11 — The webauthn origins array must not list more than five distinct registrable domains, important origins first** (low · `webauthn`)
  Verify: `curl -s https://example.com/.well-known/webauthn | jq '[.origins[] | capture("^https?://(?<h>[^/]+)").h] | unique | length'` is ≤ 5.
- **WK-12 — OIDC providers must publish a valid openid-configuration JSON with the required endpoints** (high · `openid-configuration`)
  Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; `curl -sI` the same URL shows `Content-Type: application/json`.
- **WK-13 — The openid-configuration issuer must exactly match the URL clients use, with no trailing slash** (high · `openid-configuration`)
  Verify: `curl -s https://login.example.com/.well-known/openid-configuration | jq -r .issuer` equals the advertised issuer URL exactly (string compare; flag any trailing slash, port, or casing difference).
- **WK-14 — The openid-configuration jwks_uri must be reachable and return current signing keys** (high · `openid-configuration`)
  Verify: `curl -s "$(curl -s https://login.example.com/.well-known/openid-configuration | jq -r .jwks_uri)" | jq -e '.keys | length > 0'` returns true.
- **WK-15 — openid-configuration must set a minutes-to-hours Cache-Control, not days** (low · `openid-configuration`)
  Verify: `curl -sI https://login.example.com/.well-known/openid-configuration | grep -i cache-control` shows a max-age in the minutes-to-hours range (≤ 86400, not multi-day values).
- **WK-16 — Plain OAuth 2.0 authorization servers must publish valid metadata with issuer, endpoints, and jwks_uri** (high · `oauth-authorization-server`)
  Verify: `curl -s https://login.example.com/.well-known/oauth-authorization-server | jq -e '.issuer and .authorization_endpoint and .token_endpoint and .jwks_uri'` returns true; issuer string-compares exactly to the advertised issuer URL.
- **WK-17 — Path-bearing issuers must serve oauth-authorization-server with the well-known segment inserted before the path (RFC 8414)** (medium · `oauth-authorization-server`)
  Verify: For issuer `https://example.com/tenant1`, `curl -s -o /dev/null -w '%{http_code}' https://example.com/.well-known/oauth-authorization-server/tenant1` returns 200 with valid JSON.
- **WK-18 — OAuth-protected APIs must publish resource metadata with resource and authorization_servers** (medium · `oauth-protected-resource`)
  Verify: `curl -s https://api.example.com/.well-known/oauth-protected-resource | jq -e '.resource and (.authorization_servers | length > 0)'` returns true; the document is fetchable unauthenticated.
- **WK-19 — 401 responses from a protected resource must carry WWW-Authenticate with a resource_metadata pointer** (medium · `oauth-protected-resource`)
  Verify: `curl -si https://api.example.com/ | grep -i '^www-authenticate:'` includes `resource_metadata="https://api.example.com/.well-known/oauth-protected-resource"` (send the request without a token to trigger the 401).
- **WK-20 — gpc.json, if published, must be 200 application/json with a top-level object containing a boolean gpc member** (medium · `gpc-json`)
  Verify: `curl -sI https://example.com/.well-known/gpc.json` returns 200 with `Content-Type: application/json`; `curl -s https://example.com/.well-known/gpc.json | jq -e 'type == "object" and (.gpc | type == "boolean")'` returns true.
- **WK-21 — gpc: true may only be published if the site actually honours Sec-GPC: 1 opt-outs** (high · `gpc-json`)
  Verify: `curl -sI -H 'Sec-GPC: 1' https://example.com/` — compare against a request without the header; the GPC response must not set advertising or data-broker cookies/tags (inspect `Set-Cookie` and third-party beacon URLs in the body).
- **WK-22 — gpc.json lastUpdate must be an RFC 3339 date that reflects the last review, not years stale** (low · `gpc-json`)
  Verify: `curl -s https://example.com/.well-known/gpc.json | jq -r .lastUpdate` matches `^\d{4}-\d{2}-\d{2}` (or full timestamp) and is not years in the past relative to the audit date.
- **WK-23 — api-catalog must be served as application/linkset+json with a valid Linkset body** (low · `api-catalog`)
  Verify: `curl -sI https://example.com/.well-known/api-catalog | grep -i '^content-type:'` shows `application/linkset+json`; `curl -s https://example.com/.well-known/api-catalog | jq -e '.linkset | type == "array" and all(.[]; has("anchor"))'` returns true.
- **WK-24 — The api-catalog must be advertised via a Link header with rel="api-catalog"** (low · `api-catalog`)
  Verify: `curl -sI https://example.com/ | grep -i '^link:'` contains `</.well-known/api-catalog>; rel="api-catalog"` (or the absolute-URL equivalent with `type="application/linkset+json"`).
- **WK-25 — api-catalog relation names must come from the IANA Link Relations registry** (low · `api-catalog`)
  Verify: `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | keys[]' | sort -u | grep -v '^anchor$'` — every listed relation appears in the IANA registry at https://www.iana.org/assignments/link-relations/link-relations.xhtml.
- **WK-26 — Every URL the api-catalog points at must return 200 from the same origin** (low · `api-catalog`)
  Verify: Extract hrefs with `curl -s https://example.com/.well-known/api-catalog | jq -r '.linkset[] | to_entries[] | select(.key != "anchor") | .value[].href'` and fetch each: `curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' -L "$href"` — all 200 and same-origin.
- **WK-27 — Federated sites must answer WebFinger queries with application/jrd+json** (medium · `webfinger`)
  Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^content-type:'` shows `application/jrd+json`.
- **WK-28 — WebFinger must answer on the host matching the acct: handle's domain** (medium · `webfinger`)
  Verify: For a known handle `user@example.com`, `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger?resource=acct:user@example.com"` returns 200 directly on the apex host (a redirect to a subdomain host or failure is a miss).
- **WK-29 — WebFinger must return 400 for missing/malformed resource parameters and 404 for unknown resources** (low · `webfinger`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' "https://example.com/.well-known/webfinger"` (no resource parameter) returns 400; a query for a non-existent account returns 404.
- **WK-30 — WebFinger responses must set Access-Control-Allow-Origin: *** (low · `webfinger`)
  Verify: `curl -sI "https://example.com/.well-known/webfinger?resource=acct:user@example.com" | grep -i '^access-control-allow-origin:'` shows `*`.
- **WK-31 — AASA must be served at the exact extension-less path with Content-Type application/json** (medium · `apple-app-site-association`)
  Verify: `curl -sI https://example.com/.well-known/apple-app-site-association` returns 200 with `Content-Type: application/json` at the extension-less path; Apple's App Search API Validation Tool (https://search.developer.apple.com/appsearch-validation-tool/) reports the file loaded.
- **WK-32 — AASA must return 200 directly over HTTPS with no redirect** (medium · `apple-app-site-association`)
  Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/apple-app-site-association` shows status 200 and redirects=0.
- **WK-33 — AASA must be reachable by Apple's CDN fetcher (no WAF/UA blocking, no challenge pages)** (medium · `apple-app-site-association`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' -A 'app-site-association.cdn-apple.com' https://example.com/.well-known/apple-app-site-association` returns 200 (not 403/429 and not a challenge/interstitial page).
- **WK-34 — AASA must be valid JSON under 128 KB** (medium · `apple-app-site-association`)
  Verify: `curl -s https://example.com/.well-known/apple-app-site-association | tee /tmp/aasa.json | jq -e . > /dev/null && wc -c < /tmp/aasa.json` — jq exits 0 and the byte count is < 131072.
- **WK-35 — AASA applinks must use the modern components key, not only the legacy paths key** (low · `apple-app-site-association`)
  Verify: `curl -s https://example.com/.well-known/apple-app-site-association | jq '.applinks.details[] | has("components")'` returns true for every detail entry.
- **WK-36 — assetlinks.json must be served at the exact .json path with 200, application/json, no redirect** (medium · `assetlinks-json`)
  Verify: `curl -s -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects}\n' https://example.com/.well-known/assetlinks.json` shows 200/0, and `curl -sI` the same URL shows `Content-Type: application/json`; `curl -s ... | jq -e 'type == "array"'` confirms the JSON-array shape.
- **WK-37 — assetlinks.json must carry SHA-256 fingerprints for every release signing certificate including Play App Signing** (medium · `assetlinks-json`)
  Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.sha256_cert_fingerprints[]'` lists at least one 32-octet colon-separated SHA-256 per entry (presence/format is externally checkable; matching the true release key is owner-side via `adb shell pm get-app-links <package>`).
- **WK-38 — Every relevant Android package, including beta/staging, must have its own assetlinks entry** (low · `assetlinks-json`)
  Verify: `curl -s https://example.com/.well-known/assetlinks.json | jq -r '.[].target.package_name'` and compare against every package the site links to (Play Store links on the site's app/download pages); flag missing packages.
- **WK-39 — /.well-known/nodeinfo must be a links pointer, not the NodeInfo document itself** (low · `nodeinfo`)
  Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -e '.links | length > 0'` returns true and the body has no top-level `software` key; `curl -sI` shows `Content-Type: application/json`.
- **WK-40 — NodeInfo documents must use schema 2.0 or 2.1 (older versions deprecated)** (low · `nodeinfo`)
  Verify: `curl -s https://example.com/.well-known/nodeinfo | jq -r '.links[].rel'` includes `http://nodeinfo.diaspora.software/ns/schema/2.0` or `.../2.1`, and fetching that href returns `"version": "2.0"` or `"2.1"` via jq.
- **WK-41 — NodeInfo responses must set permissive CORS** (low · `nodeinfo`)
  Verify: `curl -sI https://example.com/.well-known/nodeinfo | grep -i '^access-control-allow-origin:'` shows `*`.
- **WK-42 — traffic-advice, if published, must use Content-Type application/trafficadvice+json exactly** (low · `traffic-advice`)
  Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^content-type:'` shows exactly `application/trafficadvice+json`.
- **WK-43 — traffic-advice cache freshness must sit between 10 minutes and 48 hours** (low · `traffic-advice`)
  Verify: `curl -sI https://example.com/.well-known/traffic-advice | grep -i '^cache-control:'` — the max-age value is between 600 and 172800 seconds.
- **WK-44 — traffic-advice body must be a JSON array of user_agent entries with disallow or fraction 0–1** (low · `traffic-advice`)
  Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -e 'type == "array" and all(.[]; (.user_agent | type == "string") and ((.disallow == true) or ((.fraction // -1) >= 0 and (.fraction // 2) <= 1)))'` returns true.
- **WK-45 — traffic-advice entries must be ordered broadest match first** (low · `traffic-advice`)
  Verify: `curl -s https://example.com/.well-known/traffic-advice | jq -r '.[].user_agent'` — the generic `"prefetch-proxy"` (or `"*"`) entry appears before any implementer-specific brand entry.
