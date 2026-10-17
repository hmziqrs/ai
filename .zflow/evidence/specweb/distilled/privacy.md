# Privacy — distilled audit requirements

Distilled from `.zflow/evidence/specweb/privacy/*.md` (specification.website, privacy category).
Every quote is a single line copied verbatim from the listed source file.

---

## Privacy policy (`.zflow/evidence/specweb/privacy/privacy-policy.md`)

### PRV-01 — Privacy policy names the controller with a postal address and privacy contact
- **Requirement:** The privacy policy discloses the identity of the data controller, including a postal address and a contact route for privacy questions (and the DPO, if one exists).
- **Quote:** `- **Identity of the controller**, including a postal address and a contact for privacy questions. If you have a Data Protection Officer, name them.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** Fetch the privacy policy page (e.g. `curl -s https://example.com/privacy/`) and check the text for a legal/entity name, a postal address, and a privacy contact (email or form); a named DPO if applicable.
- **Severity:** medium

### PRV-02 — Categories of personal data are disclosed
- **Requirement:** The policy lists the categories of personal data processed (account, usage, payment, contact, technical identifiers such as IP).
- **Quote:** `- **Categories of personal data** you process — account data, usage data, payment data, contact data, technical identifiers like IP addresses.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "usage data|payment data|IP address|account data|contact data"` — confirm at least the categories actually in use on the site are named.
- **Severity:** medium

### PRV-03 — A purpose is stated for each data category
- **Requirement:** Each category of data has its purposes stated (service operation, billing, marketing, analytics, security, legal compliance).
- **Quote:** `- **Purposes** for each category — running the service, billing, marketing, analytics, security, legal compliance.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** Read the policy body (fetch with `curl -s`) and confirm each disclosed data category is tied to at least one named purpose, not a single undifferentiated "we use data" statement.
- **Severity:** medium

### PRV-04 — Lawful basis stated per purpose
- **Requirement:** The policy states the GDPR Article 6 lawful basis for each purpose, and spells out the legitimate interest when it is relied on.
- **Quote:** `- **Lawful basis** under GDPR Article 6 for each purpose: consent, contract, legal obligation, vital interests, public task, or legitimate interests. If you rely on legitimate interests, say what they are.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "legal basis|lawful basis|legitimate interest"` and confirm each named purpose maps to a basis; any "legitimate interests" claim is accompanied by what the interest is.
- **Severity:** medium

### PRV-05 — Recipients/processors named and non-EU/UK transfers flagged with safeguard
- **Requirement:** The policy lists recipients and processors by name or category and indicates transfers outside the EU/UK together with the safeguard used (SCCs or adequacy decision).
- **Quote:** `- **Recipients and processors** — payment providers, hosting, email, analytics, customer support tools. List by name or category, and indicate transfers outside the EU/UK with the safeguard used (SCCs, adequacy decision).`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "hosting|payment provider|email service|analytics"` for named/category recipients, and `grep -iE "standard contractual|SCC|adequacy"` for the transfer safeguard; a bare "we may share data with partners" line fails.
- **Severity:** medium

### PRV-06 — Retention periods or criteria disclosed
- **Requirement:** The policy gives retention periods per data category, or the criteria used to set them.
- **Quote:** `- **Retention periods** for each category, or the criteria used to determine them.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "retain|retention|how long|delete.*after"` — confirm a period or criterion appears per category, not absent entirely.
- **Severity:** medium

### PRV-07 — Data-subject rights listed, including complaint to a supervisory authority
- **Requirement:** The policy lists access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority.
- **Quote:** `- **Rights** — access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -icE "erasure|rectification|portability"` — the rights enumeration (or equivalents like "right to be forgotten") must be present.
- **Severity:** medium

### PRV-08 — Cookie/tracking disclosure present
- **Requirement:** The policy covers cookies and tracking, inline or via a link to a separate cookie notice.
- **Quote:** `- **Cookies and tracking**, either inline or by linking to a separate cookie notice.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "cookie"` — confirm either an inline cookies section or a link to a dedicated cookie notice page.
- **Severity:** medium

### PRV-09 — Visible "last updated" date at the top of the policy
- **Requirement:** The policy page shows a "last updated" date visible at the top.
- **Quote:** `- **A "last updated" date** that is visible at the top of the page.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "last updated|updated on|last revised"` and confirm the date appears near the top of the rendered page (inspect the first content block in the HTML body).
- **Severity:** low

### PRV-10 — Policy linked from the footer of every page, not behind a login
- **Requirement:** Every public page links to the privacy policy from its footer, and the policy URL is publicly reachable without authentication.
- **Quote:** `Link to the policy from the footer of every page. Do not put it behind a login.`
- **Source path:** `.zflow/evidence/specweb/privacy/privacy-policy.md`
- **Verify method:** On the homepage and key public pages run `curl -s https://example.com/<page> | grep -io 'href="[^"]*privacy[^"]*"'` (footer link present), then `curl -sI https://example.com/privacy/` expecting HTTP 200 without an auth redirect.
- **Severity:** high

---

## Cookie consent (`.zflow/evidence/specweb/privacy/cookie-consent.md`)

### PRV-11 — Non-essential device storage requires prior opt-in consent (EU/UK)
- **Requirement:** For EU/UK visitors, no non-essential cookies or similar device storage are set or read before freely given, informed, specific, unambiguous opt-in consent.
- **Quote:** `> In the EU and UK, non-essential cookies and similar storage require freely given, informed, specific, and unambiguous opt-in consent before they are set.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Fresh browser profile (no stored state), load the homepage without clicking anything: `document.cookie` and DevTools → Application → Local Storage contain no analytics/ad entries, and the network panel shows no tracking requests; also `curl -sI https://example.com/` and inspect `Set-Cookie` for non-essential cookies on the first response.
- **Severity:** high

### PRV-12 — Consent rule covers all storage technologies, not just cookies
- **Requirement:** The pre-consent rule applies equally to localStorage, sessionStorage, IndexedDB, fingerprinting, and pixel trackers.
- **Quote:** `This applies to cookies, but also to localStorage, sessionStorage, IndexedDB, fingerprinting, and pixel trackers. The technology does not matter; the storage and access do.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** On a first visit with no interaction, check DevTools → Application → Local Storage / IndexedDB for analytics keys (e.g. `_hjSessionUser`, amplitude/gtag IDs) and the network panel for pixel image requests (`/collect`, `/tr?id=`), all of which must be absent before consent.
- **Severity:** medium

### PRV-13 — Only strictly necessary storage is exempt from consent
- **Requirement:** Only strictly necessary storage (login sessions, cart, security tokens, load balancing) loads without consent; analytics, advertising, social embeds, and A/B testing are not exempt.
- **Quote:** `- **Strictly necessary cookies do not need consent.** Session cookies for login, shopping carts, security tokens, and load balancing are exempt. Analytics, advertising, social embeds, and A/B testing are not.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Classify every cookie/storage key and third-party request observed pre-consent against the exempt list; any analytics/ad/social/A/B item appearing before consent is a failure of PRV-11 and this classification.
- **Severity:** medium

### PRV-14 — No non-essential cookies or tracking scripts before the user accepts
- **Requirement:** Google Analytics, Meta Pixel, Hotjar, YouTube embeds, and marketing tags are not loaded or set before the user accepts.
- **Quote:** `- **Set no non-essential cookies before the user accepts.** This includes Google Analytics, Meta Pixel, Hotjar, YouTube embeds, and most "marketing" tags.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** `curl -s https://example.com/ | grep -E "googletagmanager|google-analytics|gtag|connect\.facebook\.net|static\.hotjar\.com|youtube-nocookie|youtube\.com/embed"` — matches must be consent-gated (injected only after choice), e.g. absent from initial HTML for client-side gating; in a clean browser, no such requests fire before the consent click.
- **Severity:** high

### PRV-15 — "Accept" and "reject" given equal prominence
- **Requirement:** The consent banner presents accept and reject with the same size, colour weight, and number of clicks.
- **Quote:** `- **Give "accept" and "reject" equal prominence.** Same size, same colour weight, same number of clicks. A bright green "Accept all" next to a grey "Manage preferences" is non-compliant.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Open the banner in a browser, screenshot it, and compare the accept/reject controls (size, contrast, style) in the same dialog; a DOM check confirms both an accept and a reject control exist as siblings in the banner.
- **Severity:** medium

### PRV-16 — Rejecting is one click, as easy as accepting
- **Requirement:** A full-reject option is reachable in a single click from the banner.
- **Quote:** `- **Rejecting must be as easy as accepting.** One click. Not a maze of toggles.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Load the site, observe the banner, and confirm a "Reject all" control completes rejection with one click — not hidden behind "Manage preferences".
- **Severity:** high

### PRV-17 — Reject means reject: no tracking, no fingerprinting fallback, no default-on legitimate-interests toggle
- **Requirement:** After rejection, no tracking cookies or fingerprinting run, and no "legitimate interests" toggle is enabled by default.
- **Quote:** `- **Reject means reject.** No tracking cookies, no fingerprinting fallback, no "legitimate interests" toggle that is on by default.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Click "Reject all", reload and browse: `document.cookie` has no tracking cookies and the network panel shows no tracker requests; open the preferences pane and confirm no non-essential or legitimate-interests purpose is pre-enabled.
- **Severity:** high

### PRV-18 — Purposes are specific categories users can choose between
- **Requirement:** Consent purposes are concrete categories such as "analytics" and "marketing" that users can accept or reject individually, not vague phrases like "improving your experience".
- **Quote:** `- **Be specific about purposes.** "Analytics" and "marketing" are categories users can choose between; "improving your experience" is not.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Open the banner's preferences view and confirm per-purpose toggles labelled with concrete categories (analytics, marketing/advertising, functional).
- **Severity:** medium

### PRV-19 — Persistent footer link to reopen the banner
- **Requirement:** A persistent footer link lets users reopen the consent banner and change their choice later.
- **Quote:** `- **Let users change their mind.** A persistent link in the footer to reopen the banner.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** `curl -s https://example.com/ | grep -iE "cookie settings|cookie preferences|manage cookies|consent"` — a footer link/control that reopens the banner must exist on public pages; click it in a browser to confirm the banner reopens.
- **Severity:** medium

### PRV-20 — Banner does not re-ask on every visit
- **Requirement:** After a choice, the banner does not reappear on every visit; it re-asks only when purposes change.
- **Quote:** `- **Re-ask only when the purposes change**, not every visit.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Accept or reject, then reload and navigate between pages in the same profile: the banner must not render again while the stored consent persists.
- **Severity:** low

### PRV-21 — Consent choice is stored as a record
- **Requirement:** The site stores what the user consented to, when, and which notice version they saw.
- **Quote:** `The banner is not the consent record. Store the user's choice — what they consented to, when, and which version of the notice they saw.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** After choosing, inspect DevTools → Application → Cookies/Local Storage for a consent entry containing purpose state and a timestamp/version (e.g. OneTrust/CookieYes/Cookiebot consent keys).
- **Severity:** low

### PRV-22 — No pre-ticked boxes or toggles for non-essential purposes
- **Requirement:** No non-essential purpose is pre-ticked or pre-enabled in the consent UI.
- **Quote:** `- Pre-ticked boxes for any non-essential purpose. The CJEU ruled this invalid in *Planet49* (2019).`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** Open the banner's preferences/details view and inspect the default state of every non-essential purpose toggle — all must be off; also inspect the markup (`curl -s | grep -i 'checked'`) for pre-checked consent checkboxes.
- **Severity:** high

### PRV-23 — No "by using this site you agree" implied consent
- **Requirement:** The site does not claim consent from continued use; implied consent text must not be used as the consent mechanism.
- **Quote:** `- "By using this site you agree" — implied consent is not valid consent under GDPR.`
- **Source path:** `.zflow/evidence/specweb/privacy/cookie-consent.md`
- **Verify method:** `curl -s https://example.com/ | grep -iE "by using this site|by continuing (to use|to browse)|continued use"` — no such implied-consent claim may serve as the consent mechanism.
- **Severity:** high

---

## Global Privacy Control (`.zflow/evidence/specweb/privacy/global-privacy-control.md`)

### PRV-24 — GPC signal suppresses advertising trackers, retargeting pixels, and data-broker tags
- **Requirement:** When `Sec-GPC: 1` is sent, the site does not load advertising trackers, retargeting pixels, or data-broker tags.
- **Quote:** `- **Do not load advertising trackers**, retargeting pixels, or data-broker tags.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** Compare `curl -s -H "Sec-GPC: 1" https://example.com/` against `curl -s https://example.com/` (server-injected tracker markup should differ), and in a GPC-enabled browser (Firefox with global privacy control on, or DuckDuckGo/Brave) confirm the network panel shows no ad-tech/data-broker requests.
- **Severity:** medium

### PRV-25 — GPC means no sale or sharing of personal information
- **Requirement:** When the GPC signal is present, the site does not sell or share the user's personal information as defined by applicable law.
- **Quote:** `- **Do not sell or share** personal information as those terms are defined under the user's applicable law.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** With GPC active (browser signal or `curl -H "Sec-GPC: 1"`), verify no third-party ad/data-broker requests carrying identifiers occur (network panel) — the observable proxy for sale/share — and that the site does not expose a "do not sell" state contradicting the signal.
- **Severity:** medium

### PRV-26 — GPC suppresses consent-banner "accept" defaults
- **Requirement:** When GPC is active, the consent banner does not default the user into accepted tracking.
- **Quote:** `- **Suppress consent-banner "accept" defaults** — the user has already expressed a preference.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** Load the site in a GPC-enabled browser, open the banner/preferences, and confirm tracking purposes are not pre-accepted or pre-enabled.
- **Severity:** low

### PRV-27 — GPC honouring disclosed in the privacy policy
- **Requirement:** The privacy policy states that the site honours GPC and what that means in practice.
- **Quote:** `- **Disclose your behaviour** in the privacy policy: state that you honour GPC and what that means in practice.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** `curl -s https://example.com/privacy/ | grep -iE "global privacy control|GPC"` — a statement of GPC handling must be present.
- **Severity:** low

### PRV-28 — Machine-readable GPC support resource at /.well-known/gpc.json
- **Requirement:** Once GPC is actually processed, the origin publishes a GPC support declaration at `/.well-known/gpc.json`.
- **Quote:** `Once the signal is actually processed, you can say so in machine-readable form by publishing a [GPC support resource at `/.well-known/gpc.json`](/spec/well-known/gpc-json/). That file declares the origin's position for tooling that wants to ask without visiting; it is a declaration, not an implementation, so publish it second.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** `curl -s https://example.com/.well-known/gpc.json` — when the site honours GPC, this returns valid JSON declaring the origin's GPC position (a missing file only fails if GPC is otherwise honoured).
- **Severity:** low

### PRV-29 — GPC processed for every user who sends it, regardless of state/region
- **Requirement:** GPC is honoured for any user who sends the signal, not only detected Californian visitors.
- **Quote:** `- Honouring GPC only for users who identify themselves as Californian. The signal does not include a state, and the AG has been clear: process it for any user who sends it.`
- **Source path:** `.zflow/evidence/specweb/privacy/global-privacy-control.md`
- **Verify method:** Send `curl -s -H "Sec-GPC: 1"` (and load in a GPC browser) from any region with no location signals (no geo cookies/params) and confirm tracker suppression applies identically.
- **Severity:** medium

---

## Third-party scripts (`.zflow/evidence/specweb/privacy/third-party-scripts.md`)

### PRV-30 — Every third-party domain the pages contact is audited
- **Requirement:** The site maintains an audit listing every third-party domain its pages contact.
- **Quote:** `- **Audit what you have.** Use the network panel, or a tool like Request Map, to list every domain your pages contact. Most sites are surprised.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** Generate a Request Map (requestmap.com) or WebPageTest third-party report for the homepage and key templates; every contacted domain should be identifiable and justifiable (no mystery trackers).
- **Severity:** low

### PRV-31 — Fonts, JavaScript libraries, and icon sets are self-hosted
- **Requirement:** Public-facing fonts, JS libraries, and icon sets are served from the site's own origin rather than a third-party CDN.
- **Quote:** `- **Self-host where you can.** Fonts, JavaScript libraries, and icon sets rarely need to come from a CDN. Self-hosting eliminates a third-party contact entirely and is often faster.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** `curl -s https://example.com/ | grep -oE "(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|use\.fontawesome\.com)[^\"']*)*" | sort -u` — expect no hits (or only consent-gated ones) when assets are self-hosted.
- **Severity:** low

### PRV-32 — Non-essential third-party scripts deferred or consent-gated
- **Requirement:** Third-party scripts not essential to first render load after user interaction or only after consent.
- **Quote:** `- **Defer or gate the rest.** Anything that is not essential to first render should load after user interaction, or only after consent for non-essential storage.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** Load a public page in a clean browser with no interaction: the network panel shows no chat widgets, A/B testers, session-replay, or marketing tags on first paint.
- **Severity:** medium

### PRV-33 — Content Security Policy with a script-src allowlist
- **Requirement:** The site serves a CSP whose `script-src` is an explicit allowlist, not a wildcard.
- **Quote:** `- **Use a Content Security Policy.** A `script-src` allowlist prevents a compromised page from loading scripts you did not approve. See `security/content-security-policy`.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** `curl -sI https://example.com/ | grep -i content-security-policy` (also check `<meta http-equiv="Content-Security-Policy">` in `curl -s` output) — a policy must exist and its `script-src` must list specific sources; `script-src *` (or an absent directive with `default-src *`) fails.
- **Severity:** medium

### PRV-34 — Subresource Integrity on third-party scripts
- **Requirement:** Cross-origin `<script>` loads with stable URLs carry an `integrity` attribute (SRI hash).
- **Quote:** `- **Use Subresource Integrity** for any script you must load from a third party where the URL is stable. An SRI hash ensures the file has not changed since you audited it. See `security/subresource-integrity`.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** `curl -s https://example.com/ | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>'` — every cross-origin script tag in the initial HTML should include `integrity="sha384-…"`.
- **Severity:** low

### PRV-35 — Referrer-Policy of strict-origin-when-cross-origin or stricter
- **Requirement:** Public pages send `Referrer-Policy: strict-origin-when-cross-origin` or a stricter value.
- **Quote:** `- **Set a Referrer-Policy** of `strict-origin-when-cross-origin` or stricter. It trims the URL carried in the `Referer` header the browser sends when it fetches a third-party resource, so a pixel or image endpoint sees your origin rather than the full path and query string.`
- **Source path:** `.zflow/evidence/specweb/privacy/third-party-scripts.md`
- **Verify method:** `curl -sI https://example.com/ | grep -i referrer-policy` — value must be one of `strict-origin-when-cross-origin`, `no-referrer`, `same-origin`, or `strict-origin`; `unsafe-url`/`origin-when-cross-origin` or a missing header fails.
- **Severity:** medium

---

## Storage Access API (`.zflow/evidence/specweb/privacy/storage-access-api.md`)

Applies only to sites embedding cross-site content that needs its own cookies (SSO, federated identity, signed-in widgets). Optional spec — low severity for consumer-facing surfaces.

### PRV-36 — Storage Access API used only by embedded cross-site content, never first-party pages
- **Requirement:** `requestStorageAccess()` appears only inside embedded cross-site content that genuinely needs unpartitioned cookies; first-party pages never call it.
- **Quote:** `- Reach for it only when embedded content genuinely needs its own unpartitioned cookies — SSO, federated identity, a signed-in widget. A first-party site setting its own cookies never needs it.`
- **Source path:** `.zflow/evidence/specweb/privacy/storage-access-api.md`
- **Verify method:** `curl -s https://example.com/ | grep -c "requestStorageAccess"` — first-party markup/scripts must show 0 usages; any hit must be inside a cross-site `<iframe>` embed's own script.
- **Severity:** low

### PRV-37 — requestStorageAccess() called only inside a user-gesture handler
- **Requirement:** The embed calls `requestStorageAccess()` inside a click/tap handler (transient activation), awaiting the promise and degrading gracefully on rejection.
- **Quote:** `- From the embed, call `hasStorageAccess()`; if it is false, call `requestStorageAccess()` inside a click or tap handler — it requires transient activation (a user gesture). Await the promise, load the credentialed view on success, and degrade gracefully on rejection.`
- **Source path:** `.zflow/evidence/specweb/privacy/storage-access-api.md`
- **Verify method:** Fetch the embed's script (`curl -s <script-url>`) and confirm `requestStorageAccess()` is invoked within a user-event handler, not at top level; on the live page, no storage-access prompt appears without a click.
- **Severity:** low

### PRV-38 — Cookies used in the cross-site flow are SameSite=None; Secure over HTTPS
- **Requirement:** Cookies that must travel in the embedded cross-site context are set with `SameSite=None; Secure`, and the flow runs only on HTTPS.
- **Quote:** `- Cookies must be `SameSite=None; Secure` to travel cross-site (see [cookie attributes](/spec/security/cookie-attributes/)), and the whole flow works only in a secure (HTTPS) context.`
- **Source path:** `.zflow/evidence/specweb/privacy/storage-access-api.md`
- **Verify method:** `curl -sI https://<embedded-provider>/login | grep -i set-cookie` — the embedded provider's cookies show `SameSite=None; Secure`; the embedding page is served over HTTPS (`curl -sI https://example.com/` succeeds, no TLS errors).
- **Severity:** low

### PRV-39 — Embedding page does not block storage access via Permissions-Policy or sandbox
- **Requirement:** The embedding page's Permissions-Policy does not block `storage-access`, and sandboxed iframes carry the `allow-storage-access-by-user-activation` token.
- **Quote:** `- The embedding page must permit it: an `allow-storage-access-by-user-activation` sandbox token on a sandboxed iframe, and no `storage-access` [Permissions-Policy](/spec/security/permissions-policy/) blocking it.`
- **Source path:** `.zflow/evidence/specweb/privacy/storage-access-api.md`
- **Verify method:** `curl -sI https://example.com/ | grep -i permissions-policy` — must not contain `storage-access=()`; `curl -s https://example.com/ | grep -oE '<iframe[^>]*sandbox="[^"]*"'` — any sandboxed embed needing storage access includes the `allow-storage-access-by-user-activation` token.
- **Severity:** low

---

## Privacy-respecting analytics (`.zflow/evidence/specweb/privacy/analytics-privacy.md`)

### PRV-40 — Analytics runs without cookies or persistent client identifiers
- **Requirement:** Site measurement uses no cookies and no persistent per-visitor identifiers; uniques are estimated with a daily-rotating hash and raw IPs are dropped.
- **Quote:** `- **Measure without cookies.** Use a daily-rotating hash of IP + user-agent + a site salt to estimate uniques. Drop the raw IP before it hits disk.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** Load a page and inspect the analytics endpoint in the network panel: its responses set no `Set-Cookie` and the page stores no analytics cookies/localStorage keys (e.g. no `_ga`/`_hj*`); the tool in page source is a cookieless pattern (Plausible, Fathom, self-hosted Matomo without cookies, Cloudflare Web Analytics).
- **Severity:** medium

### PRV-41 — Aggregation at write time rather than per-visitor event storage
- **Requirement:** Analytics stores aggregate counts per page per day rather than individual timestamped events, unless genuinely needed.
- **Quote:** `- **Aggregate at write time.** Store counts per page per day, not individual events with timestamps, unless you genuinely need them.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** Check the analytics vendor's public data-model documentation for aggregate-only storage (read-only, documentation-level check); tools storing raw per-visitor event streams fail unless a necessity is documented.
- **Severity:** low

### PRV-42 — Any kept IP data is anonymised
- **Requirement:** If any IP is retained, it is anonymised — last octet of IPv4 or last 80 bits of IPv6 — enough to break linkability while keeping country-level geo.
- **Quote:** `- **Anonymise the IP** at the edge if any IP is kept. The last octet of an IPv4 (or the last 80 bits of an IPv6) is enough to break linkability and still keep country-level geo.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** For self-hosted Matomo, open its public privacy settings or docs and confirm "Anonymize IP" is enabled; for hosted tools, confirm IP truncation in the vendor's documentation (documentation-level check).
- **Severity:** low

### PRV-43 — Analytics data kept in the relevant jurisdiction (EU-hosted for EU traffic)
- **Requirement:** For EU traffic, the analytics endpoint is EU-hosted with an EU sub-processor list.
- **Quote:** `- **Keep data in the relevant jurisdiction.** For EU traffic, that means an EU-hosted analytics endpoint and an EU sub-processor list.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** Identify the analytics hostname in page source, resolve it (`dig +short analytics.example.com`), and geo-locate the result (e.g. `curl -s ipinfo.io/<ip>`); check the vendor's published sub-processor list for EU processing.
- **Severity:** medium

### PRV-44 — Short analytics retention (about ninety days of aggregates)
- **Requirement:** Daily aggregates are kept no longer than about 90 days; raw events are kept even shorter.
- **Quote:** `- **Set a short retention.** Ninety days of daily aggregates answers most product questions. Raw events should be even shorter.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** Check the stated retention in the privacy policy (`curl -s https://example.com/privacy/ | grep -iA2 analytic`) and/or the vendor's documented default retention; anything open-ended ("indefinitely") fails.
- **Severity:** low

### PRV-45 — Analytics tooling documented in the privacy policy
- **Requirement:** The privacy policy names the analytics tool, the data collected, the retention period, and the legal basis.
- **Quote:** `- **Document it.** The privacy policy should name the analytics tool, the data collected, the retention period, and the legal basis.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** Cross-reference the analytics script found in page source with `curl -s https://example.com/privacy/ | grep -iE "plausible|fathom|matomo|cloudflare web analytics|google analytics"` — the tool actually loaded must be named with data, retention, and basis.
- **Severity:** medium

### PRV-46 — Ad-tech-grade analytics isolated behind explicit consent
- **Requirement:** Any ad-tech-grade analytics used for marketing attribution loads only behind explicit consent, kept separate from product analytics.
- **Quote:** `If you must use ad-tech-grade analytics for marketing attribution, isolate it behind explicit consent and treat it as a separate system from product analytics.`
- **Source path:** `.zflow/evidence/specweb/privacy/analytics-privacy.md`
- **Verify method:** In a clean browser before any consent click, no GA4/ads-grade measurement requests fire (network panel); after accepting "marketing"/"analytics" consent they may — the pre-consent network log is the observable check.
- **Severity:** medium

---

## Data minimisation (`.zflow/evidence/specweb/privacy/data-minimization.md`)

### PRV-47 — Every public form field has a named purpose
- **Requirement:** Each field on every public form and API corresponds to a decided purpose; fields that fail the test are removed.
- **Quote:** `**Collection.** Walk through every form and every API. For each field, name the purpose. Drop anything that fails the test.`
- **Source path:** `.zflow/evidence/specweb/privacy/data-minimization.md`
- **Verify method:** Enumerate inputs on each public form (`curl -s https://example.com/<form-page> | grep -oE '<(input|select|textarea)[^>]*name="[^"]*"'`) and justify each field against the form's function; unexplainable fields (e.g. date of birth on a service with no age requirement) fail.
- **Severity:** medium

### PRV-48 — Newsletter signup collects only an email address
- **Requirement:** The newsletter signup asks for an email address and not a name, phone number, or job title.
- **Quote:** `- A newsletter signup needs an email address. It does not need a name, a phone number, or a job title.`
- **Source path:** `.zflow/evidence/specweb/privacy/data-minimization.md`
- **Verify method:** Inspect the newsletter form markup (`curl -s https://example.com/ | grep -iA8 -B2 "newsletter"`) — only the email input (plus a consent checkbox where required) should be present.
- **Severity:** medium

### PRV-49 — Contact form collects only what is needed to reply
- **Requirement:** The public contact form does not ask for a phone number or other extras when replies go by email.
- **Quote:** `- A contact form needs a way to reply. If you reply by email, you do not need a phone number.`
- **Source path:** `.zflow/evidence/specweb/privacy/data-minimization.md`
- **Verify method:** `curl -s https://example.com/contact | grep -ioE 'name="(tel|phone)[^"]*"'` — a phone field on an email-reply contact form fails.
- **Severity:** low

### PRV-50 — No delivery address demanded for digital downloads
- **Requirement:** Downloading digital content (e.g. a PDF) does not require a delivery address.
- **Quote:** `- A delivery address is necessary to deliver a physical product. It is not necessary to download a PDF.`
- **Source path:** `.zflow/evidence/specweb/privacy/data-minimization.md`
- **Verify method:** Walk the public download flow read-only and confirm no address fields appear; `curl -s https://example.com/<download-page> | grep -icE "address"`.
- **Severity:** low

### PRV-51 — Country dropdown instead of full address when only country matters
- **Requirement:** Where only country is needed (tax/compliance), the form asks for country via dropdown rather than a full address.
- **Quote:** `- Use a country dropdown instead of asking for a full address when only country matters for tax or compliance.`
- **Source path:** `.zflow/evidence/specweb/privacy/data-minimization.md`
- **Verify method:** Inspect checkout/tax-related public forms: a `<select>` of countries with no street/city/postcode fields when country is the only requirement.
- **Severity:** low

---

## Scope notes

Excluded as not externally verifiable by a read-only auditor on a live consumer-facing site (internal/backend practices): server log redaction and body-logging limits (data-minimization), scheduled enforcement of retention periods (data-minimization), and recording GPC opt-outs with timestamp/URL (global-privacy-control). GPC's consent-record backend storage and analytics "aggregate at write time" are only partially observable; those checks fall back to documentation-level verification as noted in PRV-41/PRV-42.
