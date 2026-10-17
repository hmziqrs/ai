# Privacy — 51 audit checks

GDPR-grade data practices observable from the outside: privacy-policy disclosures, prior opt-in cookie consent, Global Privacy Control, third-party script discipline, Storage Access API, privacy-respecting analytics, and data minimisation.

Source: [The Website Specification](https://specification.website/spec/privacy/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.8, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/privacy/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — privacy policy, cookie consent · **Recommended** — Global Privacy Control, third-party scripts, privacy-respecting analytics, data minimisation.

Severity:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

(The full severity model lives in the web-spec-audit SKILL.md.)

- **PRV-01 — Privacy policy names the controller with a postal address and privacy contact** (medium · `privacy-policy`)
  Verify: Fetch the privacy policy page (e.g. `curl -s https://example.com/privacy/`) and check the text for a legal/entity name, a postal address, and a privacy contact (email or form); a named DPO if applicable.
- **PRV-02 — Categories of personal data are disclosed** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "usage data|payment data|IP address|account data|contact data"` — confirm at least the categories actually in use on the site are named.
- **PRV-03 — A purpose is stated for each data category** (medium · `privacy-policy`)
  Verify: Read the policy body (fetch with `curl -s`) and confirm each disclosed data category is tied to at least one named purpose, not a single undifferentiated "we use data" statement.
- **PRV-04 — Lawful basis stated per purpose** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "legal basis|lawful basis|legitimate interest"` and confirm each named purpose maps to a basis; any "legitimate interests" claim is accompanied by what the interest is.
- **PRV-05 — Recipients/processors named and non-EU/UK transfers flagged with safeguard** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "hosting|payment provider|email service|analytics"` for named/category recipients, and `grep -iE "standard contractual|SCC|adequacy"` for the transfer safeguard; a bare "we may share data with partners" line fails.
- **PRV-06 — Retention periods or criteria disclosed** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "retain|retention|how long|delete.*after"` — confirm a period or criterion appears per category, not absent entirely.
- **PRV-07 — Data-subject rights listed, including complaint to a supervisory authority** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -icE "erasure|rectification|portability"` — the rights enumeration (or equivalents like "right to be forgotten") must be present.
- **PRV-08 — Cookie/tracking disclosure present** (medium · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "cookie"` — confirm either an inline cookies section or a link to a dedicated cookie notice page.
- **PRV-09 — Visible "last updated" date at the top of the policy** (low · `privacy-policy`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "last updated|updated on|last revised"` and confirm the date appears near the top of the rendered page (inspect the first content block in the HTML body).
- **PRV-10 — Policy linked from the footer of every page, not behind a login** (high · `privacy-policy`)
  Verify: On the homepage and key public pages run `curl -s https://example.com/<page> | grep -io 'href="[^"]*privacy[^"]*"'` (footer link present), then `curl -sI https://example.com/privacy/` expecting HTTP 200 without an auth redirect.
- **PRV-11 — Non-essential device storage requires prior opt-in consent (EU/UK)** (high · `cookie-consent`)
  Verify: Fresh browser profile (no stored state), load the homepage without clicking anything: `document.cookie` and DevTools → Application → Local Storage contain no analytics/ad entries, and the network panel shows no tracking requests; also `curl -sI https://example.com/` and inspect `Set-Cookie` for non-essential cookies on the first response.
- **PRV-12 — Consent rule covers all storage technologies, not just cookies** (medium · `cookie-consent`)
  Verify: On a first visit with no interaction, check DevTools → Application → Local Storage / IndexedDB for analytics keys (e.g. `_hjSessionUser`, amplitude/gtag IDs) and the network panel for pixel image requests (`/collect`, `/tr?id=`), all of which must be absent before consent.
- **PRV-13 — Only strictly necessary storage is exempt from consent** (medium · `cookie-consent`)
  Verify: Classify every cookie/storage key and third-party request observed pre-consent against the exempt list; any analytics/ad/social/A/B item appearing before consent is a failure of PRV-11 and this classification.
- **PRV-14 — No non-essential cookies or tracking scripts before the user accepts** (high · `cookie-consent`)
  Verify: `curl -s https://example.com/ | grep -E "googletagmanager|google-analytics|gtag|connect\.facebook\.net|static\.hotjar\.com|youtube-nocookie|youtube\.com/embed"` — matches must be consent-gated (injected only after choice), e.g. absent from initial HTML for client-side gating; in a clean browser, no such requests fire before the consent click.
- **PRV-15 — "Accept" and "reject" given equal prominence** (medium · `cookie-consent`)
  Verify: Open the banner in a browser, screenshot it, and compare the accept/reject controls (size, contrast, style) in the same dialog; a DOM check confirms both an accept and a reject control exist as siblings in the banner.
- **PRV-16 — Rejecting is one click, as easy as accepting** (high · `cookie-consent`)
  Verify: Load the site, observe the banner, and confirm a "Reject all" control completes rejection with one click — not hidden behind "Manage preferences".
- **PRV-17 — Reject means reject: no tracking, no fingerprinting fallback, no default-on legitimate-interests toggle** (high · `cookie-consent`)
  Verify: Click "Reject all", reload and browse: `document.cookie` has no tracking cookies and the network panel shows no tracker requests; open the preferences pane and confirm no non-essential or legitimate-interests purpose is pre-enabled.
- **PRV-18 — Purposes are specific categories users can choose between** (medium · `cookie-consent`)
  Verify: Open the banner's preferences view and confirm per-purpose toggles labelled with concrete categories (analytics, marketing/advertising, functional).
- **PRV-19 — Persistent footer link to reopen the banner** (medium · `cookie-consent`)
  Verify: `curl -s https://example.com/ | grep -iE "cookie settings|cookie preferences|manage cookies|consent"` — a footer link/control that reopens the banner must exist on public pages; click it in a browser to confirm the banner reopens.
- **PRV-20 — Banner does not re-ask on every visit** (low · `cookie-consent`)
  Verify: Never commit a consent choice to test this. In a profile that already recorded consent before the audit (supplied by the dispatch), reload and navigate: the banner must not render again; without such a profile, mark unconfirmed.
- **PRV-21 — Consent choice is stored as a record** (low · `cookie-consent`)
  Verify: Inspect DevTools → Application → Cookies/Local Storage in a profile where consent was recorded before the audit (supplied by the dispatch) for a consent entry containing purpose state and a timestamp/version (e.g. OneTrust/CookieYes/Cookiebot consent keys); otherwise mark unconfirmed.
- **PRV-22 — No pre-ticked boxes or toggles for non-essential purposes** (high · `cookie-consent`)
  Verify: Open the banner's preferences/details view and inspect the default state of every non-essential purpose toggle — all must be off; also inspect the markup (`curl -s | grep -i 'checked'`) for pre-checked consent checkboxes.
- **PRV-23 — No "by using this site you agree" implied consent** (high · `cookie-consent`)
  Verify: `curl -s https://example.com/ | grep -iE "by using this site|by continuing (to use|to browse)|continued use"` — no such implied-consent claim may serve as the consent mechanism.
- **PRV-24 — GPC signal suppresses advertising trackers, retargeting pixels, and data-broker tags** (medium · `global-privacy-control`)
  Verify: Compare `curl -s -H "Sec-GPC: 1" https://example.com/` against `curl -s https://example.com/` (server-injected tracker markup should differ), and in a GPC-enabled browser (Firefox with global privacy control on, or DuckDuckGo/Brave) confirm the network panel shows no ad-tech/data-broker requests.
- **PRV-25 — GPC means no sale or sharing of personal information** (medium · `global-privacy-control`)
  Verify: With GPC active (browser signal or `curl -H "Sec-GPC: 1"`), verify no third-party ad/data-broker requests carrying identifiers occur (network panel) — the observable proxy for sale/share — and that the site does not expose a "do not sell" state contradicting the signal.
- **PRV-26 — GPC suppresses consent-banner "accept" defaults** (low · `global-privacy-control`)
  Verify: Load the site in a GPC-enabled browser, open the banner/preferences, and confirm tracking purposes are not pre-accepted or pre-enabled.
- **PRV-27 — GPC honouring disclosed in the privacy policy** (low · `global-privacy-control`)
  Verify: `curl -s https://example.com/privacy/ | grep -iE "global privacy control|GPC"` — a statement of GPC handling must be present.
- **PRV-28 — Machine-readable GPC support resource at /.well-known/gpc.json** (low · `global-privacy-control`)
  Verify: `curl -s https://example.com/.well-known/gpc.json` — when the site honours GPC, this returns valid JSON declaring the origin's GPC position (a missing file only fails if GPC is otherwise honoured).
- **PRV-29 — GPC processed for every user who sends it, regardless of state/region** (medium · `global-privacy-control`)
  Verify: Send `curl -s -H "Sec-GPC: 1"` (and load in a GPC browser) from any region with no location signals (no geo cookies/params) and confirm tracker suppression applies identically.
- **PRV-30 — Every third-party domain the pages contact is audited** (low · `third-party-scripts`)
  Verify: Generate a Request Map (requestmap.com) or WebPageTest third-party report for the homepage and key templates; every contacted domain should be identifiable and justifiable (no mystery trackers).
- **PRV-31 — Fonts, JavaScript libraries, and icon sets are self-hosted** (low · `third-party-scripts`)
  Verify: `curl -s https://example.com/ | grep -oE "(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|use\.fontawesome\.com)[^\"']*)*" | sort -u` — expect no hits (or only consent-gated ones) when assets are self-hosted.
- **PRV-32 — Non-essential third-party scripts deferred or consent-gated** (medium · `third-party-scripts`)
  Verify: Load a public page in a clean browser with no interaction: the network panel shows no chat widgets, A/B testers, session-replay, or marketing tags on first paint.
- **PRV-33 — Content Security Policy with a script-src allowlist** (medium · `third-party-scripts`)
  Verify: `curl -sI https://example.com/ | grep -i content-security-policy` (also check `<meta http-equiv="Content-Security-Policy">` in `curl -s` output) — a policy must exist and its `script-src` must list specific sources; `script-src *` (or an absent directive with `default-src *`) fails.
- **PRV-34 — Subresource Integrity on third-party scripts** (low · `third-party-scripts`)
  Verify: `curl -s https://example.com/ | grep -oE '<script[^>]*src="https?://[^"]*"[^>]*>'` — every cross-origin script tag in the initial HTML should include `integrity="sha384-…"`.
- **PRV-35 — Referrer-Policy of strict-origin-when-cross-origin or stricter** (medium · `third-party-scripts`)
  Verify: `curl -sI https://example.com/ | grep -i referrer-policy` — value must be one of `strict-origin-when-cross-origin`, `no-referrer`, `same-origin`, or `strict-origin`; `unsafe-url`/`origin-when-cross-origin` or a missing header fails.
- **PRV-36 — Storage Access API used only by embedded cross-site content, never first-party pages** (low · `storage-access-api`)
  Verify: `curl -s https://example.com/ | grep -c "requestStorageAccess"` — first-party markup/scripts must show 0 usages; any hit must be inside a cross-site `<iframe>` embed's own script.
- **PRV-37 — requestStorageAccess() called only inside a user-gesture handler** (low · `storage-access-api`)
  Verify: Fetch the embed's script (`curl -s <script-url>`) and confirm `requestStorageAccess()` is invoked within a user-event handler, not at top level; on the live page, no storage-access prompt appears without a click.
- **PRV-38 — Cookies used in the cross-site flow are SameSite=None; Secure over HTTPS** (low · `storage-access-api`)
  Verify: `curl -sI https://<embedded-provider>/login | grep -i set-cookie` — the embedded provider's cookies show `SameSite=None; Secure`; the embedding page is served over HTTPS (`curl -sI https://example.com/` succeeds, no TLS errors).
- **PRV-39 — Embedding page does not block storage access via Permissions-Policy or sandbox** (low · `storage-access-api`)
  Verify: `curl -sI https://example.com/ | grep -i permissions-policy` — must not contain `storage-access=()`; `curl -s https://example.com/ | grep -oE '<iframe[^>]*sandbox="[^"]*"'` — any sandboxed embed needing storage access includes the `allow-storage-access-by-user-activation` token.
- **PRV-40 — Analytics runs without cookies or persistent client identifiers** (medium · `analytics-privacy`)
  Verify: Load a page and inspect the analytics endpoint in the network panel: its responses set no `Set-Cookie` and the page stores no analytics cookies/localStorage keys (e.g. no `_ga`/`_hj*`); the tool in page source is a cookieless pattern (Plausible, Fathom, self-hosted Matomo without cookies, Cloudflare Web Analytics).
- **PRV-41 — Aggregation at write time rather than per-visitor event storage** (low · `analytics-privacy`)
  Verify: Check the analytics vendor's public data-model documentation for aggregate-only storage (read-only, documentation-level check); tools storing raw per-visitor event streams fail unless a necessity is documented.
- **PRV-42 — Any kept IP data is anonymised** (low · `analytics-privacy`)
  Verify: For self-hosted Matomo, open its public privacy settings or docs and confirm "Anonymize IP" is enabled; for hosted tools, confirm IP truncation in the vendor's documentation (documentation-level check).
- **PRV-43 — Analytics data kept in the relevant jurisdiction (EU-hosted for EU traffic)** (medium · `analytics-privacy`)
  Verify: Identify the analytics hostname in page source, resolve it (`dig +short analytics.example.com`), and geo-locate the result (e.g. `curl -s ipinfo.io/<ip>`); check the vendor's published sub-processor list for EU processing.
- **PRV-44 — Short analytics retention (about ninety days of aggregates)** (low · `analytics-privacy`)
  Verify: Check the stated retention in the privacy policy (`curl -s https://example.com/privacy/ | grep -iA2 analytic`) and/or the vendor's documented default retention; anything open-ended ("indefinitely") fails.
- **PRV-45 — Analytics tooling documented in the privacy policy** (medium · `analytics-privacy`)
  Verify: Cross-reference the analytics script found in page source with `curl -s https://example.com/privacy/ | grep -iE "plausible|fathom|matomo|cloudflare web analytics|google analytics"` — the tool actually loaded must be named with data, retention, and basis.
- **PRV-46 — Ad-tech-grade analytics isolated behind explicit consent** (medium · `analytics-privacy`)
  Verify: In a clean browser before any consent click, no GA4/ads-grade measurement requests fire (network panel) — the pre-consent network log is the check; do not accept consent to test the post-consent state.
- **PRV-47 — Every public form field has a named purpose** (medium · `data-minimization`)
  Verify: Enumerate inputs on each public form (`curl -s https://example.com/<form-page> | grep -oE '<(input|select|textarea)[^>]*name="[^"]*"'`) and justify each field against the form's function; unexplainable fields (e.g. date of birth on a service with no age requirement) fail.
- **PRV-48 — Newsletter signup collects only an email address** (medium · `data-minimization`)
  Verify: Inspect the newsletter form markup (`curl -s https://example.com/ | grep -iA8 -B2 "newsletter"`) — only the email input (plus a consent checkbox where required) should be present.
- **PRV-49 — Contact form collects only what is needed to reply** (low · `data-minimization`)
  Verify: `curl -s https://example.com/contact | grep -ioE 'name="(tel|phone)[^"]*"'` — a phone field on an email-reply contact form fails.
- **PRV-50 — No delivery address demanded for digital downloads** (low · `data-minimization`)
  Verify: Walk the public download flow read-only and confirm no address fields appear; `curl -s https://example.com/<download-page> | grep -icE "address"`.
- **PRV-51 — Country dropdown instead of full address when only country matters** (low · `data-minimization`)
  Verify: Inspect checkout/tax-related public forms: a `<select>` of countries with no street/city/postcode fields when country is the only requirement.
