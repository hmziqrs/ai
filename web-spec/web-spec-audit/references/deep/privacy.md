# Privacy — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/privacy/. Assembled from the local evidence corpus (.zflow/evidence/specweb/privacy/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## analytics-privacy
Source: https://specification.website/spec/privacy/analytics-privacy/

---
title: "Privacy-respecting analytics"
category: privacy
status: recommended
url: https://specification.website/spec/privacy/analytics-privacy/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "EDPB — 101 complaints concerning EU-U.S. data transfers (Google Analytics)"
    url: "https://edpb.europa.eu/news/news/2022/austrian-dpa-decision-101-complaints-issued_en"
    publisher: "EDPB"
  - title: "CNIL — Use of Google Analytics and data transfers to the United States"
    url: "https://www.cnil.fr/en/use-google-analytics-and-data-transfers-united-states-cnil-orders-website-manageroperator-comply"
    publisher: "CNIL"
  - title: "ICO — Guidance on the use of cookies and similar technologies"
    url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/"
    publisher: "ICO"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Privacy-respecting analytics

> You can measure traffic without surveilling visitors. Aggregate, cookieless, EU-hosted analytics tools answer most product questions without the consent and transfer problems of ad-tech analytics.

## What it is

Privacy-respecting analytics measure what visitors do on your site without building a persistent profile of each visitor. The pattern: collect the smallest useful unit of data, aggregate it on the server, drop or hash anything that could identify a person, and keep it out of jurisdictions that introduce transfer problems.

Most product questions — what pages people read, where they came from, where they drop off — can be answered without cookies, fingerprints, or cross-site identifiers.

## Why it matters

Between 2022 and 2023, the Austrian, French, Italian, and Danish data protection authorities ruled that the standard configuration of Google Analytics violated the GDPR because of transfers to the US. The EU–US Data Privacy Framework has changed the legal picture, but regulators still treat ad-tech-grade analytics with scrutiny, and the underlying design problem — every visit shared with a third party that combines it with data from millions of other sites — has not gone away.

There is a more practical reason: a cookieless analytics tool does not require a consent banner under EU rules, because nothing is stored on the user's device. The data you get is also more representative, because nobody opts out.

Cookieless is not the same as GDPR-exempt, and the two are easily confused. Two separate laws apply. The ePrivacy Directive governs storing or reading anything on the device, and going cookieless clears that hurdle, which is why the banner disappears. The GDPR governs the processing of personal data, and it does not disappear: an IP address or a device-derived identifier is still personal data, so you still need a lawful basis, and the minimisation and retention duties below still bind you. Removing the cookie removes the consent prompt, not the obligation to handle the data lawfully.

## How to implement

The pattern is the same across tools:

- **Measure without cookies.** Use a daily-rotating hash of IP + user-agent + a site salt to estimate uniques. Drop the raw IP before it hits disk.
- **Aggregate at write time.** Store counts per page per day, not individual events with timestamps, unless you genuinely need them.
- **Anonymise the IP** at the edge if any IP is kept. The last octet of an IPv4 (or the last 80 bits of an IPv6) is enough to break linkability and still keep country-level geo.
- **Keep data in the relevant jurisdiction.** For EU traffic, that means an EU-hosted analytics endpoint and an EU sub-processor list.
- **Set a short retention.** Ninety days of daily aggregates answers most product questions. Raw events should be even shorter.
- **Document it.** The privacy policy should name the analytics tool, the data collected, the retention period, and the legal basis.

Tools that follow this pattern include **Plausible**, **Fathom**, self-hosted **Matomo** (configured for IP anonymisation and no cookies), and **Cloudflare Web Analytics**. Listed as patterns, not endorsements — the specific tool matters less than the configuration.

If you must use ad-tech-grade analytics for marketing attribution, isolate it behind explicit consent and treat it as a separate system from product analytics.

## Common mistakes

- Treating "we anonymise IPs" as enough while still loading a third-party script that fingerprints the browser.
- Using GA4 with default settings and assuming the EU–US DPF closes the case. The EDPB and national authorities still expect documented assessment.
- Running a "privacy-friendly" analytics tool *and* GA *and* Hotjar. Each one introduces its own consent and transfer questions.
- Keeping raw event logs forever because storage is cheap.
- Forgetting to disclose the analytics tool in the privacy policy.
---

## cookie-consent
Source: https://specification.website/spec/privacy/cookie-consent/

---
title: "Cookie consent"
category: privacy
status: required
url: https://specification.website/spec/privacy/cookie-consent/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "EDPB Guidelines 03/2022 on deceptive design patterns in social media"
    url: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en"
    publisher: "EDPB"
  - title: "ICO — Cookies and similar technologies"
    url: "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/"
    publisher: "ICO"
  - title: "CNIL — Cookies and other tracking devices: new guidelines"
    url: "https://www.cnil.fr/en/cookies-and-other-tracking-devices-cnil-publishes-new-guidelines"
    publisher: "CNIL"
  - title: "ePrivacy Directive 2002/58/EC, Article 5(3)"
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:02002L0058-20091219"
    publisher: "EUR-Lex"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Cookie consent

> In the EU and UK, non-essential cookies and similar storage require freely given, informed, specific, and unambiguous opt-in consent before they are set.

## What it is

In the EU and UK, the ePrivacy Directive — implemented through national laws such as PECR in the UK — requires consent before storing or reading information on a user's device. The GDPR then defines what valid consent looks like: a freely given, specific, informed, and unambiguous indication of the user's wishes, given by a clear affirmative action.

This applies to cookies, but also to localStorage, sessionStorage, IndexedDB, fingerprinting, and pixel trackers. The technology does not matter; the storage and access do.

A banner is not what the law requires. The obligation is narrow: do not store or read non-essential information on the device without prior consent. A banner is one way to collect that consent, not the requirement itself. A site that sets no non-essential storage needs no banner at all, and a banner that drops analytics cookies before the user has chosen is non-compliant however polished it looks. The compliant state is defined by what your site does before the click, not by the presence of the dialog.

## Why it matters

Cookie consent is the most enforced part of EU privacy law on the public web. National regulators — CNIL, the Garante, the ICO, the Belgian DPA — issue fines regularly, and most of them target the same patterns: pre-ticked boxes, "reject" buttons hidden two clicks away, and banners that count scrolling as consent.

A non-compliant banner is also a poor user experience. Visitors do not want to negotiate with your site before reading it.

## How to implement

The principles are simpler than vendors make them sound:

- **Strictly necessary cookies do not need consent.** Session cookies for login, shopping carts, security tokens, and load balancing are exempt. Analytics, advertising, social embeds, and A/B testing are not.
- **Set no non-essential cookies before the user accepts.** This includes Google Analytics, Meta Pixel, Hotjar, YouTube embeds, and most "marketing" tags.
- **Give "accept" and "reject" equal prominence.** Same size, same colour weight, same number of clicks. A bright green "Accept all" next to a grey "Manage preferences" is non-compliant.
- **Rejecting must be as easy as accepting.** One click. Not a maze of toggles.
- **Reject means reject.** No tracking cookies, no fingerprinting fallback, no "legitimate interests" toggle that is on by default.
- **Be specific about purposes.** "Analytics" and "marketing" are categories users can choose between; "improving your experience" is not.
- **Let users change their mind.** A persistent link in the footer to reopen the banner.
- **Re-ask only when the purposes change**, not every visit.

The banner is not the consent record. Store the user's choice — what they consented to, when, and which version of the notice they saw.

## Common mistakes

- Pre-ticked boxes for any non-essential purpose. The CJEU ruled this invalid in *Planet49* (2019).
- "By using this site you agree" — implied consent is not valid consent under GDPR.
- Loading analytics scripts before the user has chosen.
- A "reject" button that is visually deprioritised, or only appears after clicking "preferences".
- No way to withdraw consent later.
- Treating the UK as exempt from these rules — UK GDPR and PECR are substantively the same.
---

## data-minimization
Source: https://specification.website/spec/privacy/data-minimization/

---
title: "Data minimisation"
category: privacy
status: recommended
url: https://specification.website/spec/privacy/data-minimization/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "GDPR Article 5 — Principles relating to processing of personal data"
    url: "https://gdpr-info.eu/art-5-gdpr/"
    publisher: "EU GDPR"
  - title: "ICO — Data minimisation"
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/data-minimisation/"
    publisher: "ICO"
  - title: "EDPB Guidelines 4/2019 on Article 25 Data Protection by Design and by Default"
    url: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-42019-article-25-data-protection-design-and_en"
    publisher: "EDPB"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Data minimisation

> Collect only the personal data you actually need for a specific purpose, keep it only as long as you need it, and redact it from anywhere it leaks unnecessarily.

## What it is

Data minimisation is the principle that personal data must be "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed" — GDPR Article 5(1)(c). It is one of the foundational principles of EU and UK data protection law, and it is echoed in most modern privacy regimes.

In practice it is a design constraint: do not collect a field unless you have decided in advance what you will do with it.

## Why it matters

Every personal data point you hold is a liability. It can be breached, subpoenaed, misused by an insider, or simply held longer than the law allows. The cheapest way to protect data is not to collect it. The second cheapest is to delete it as soon as you no longer need it.

Minimisation is also the principle regulators reach for when no other rule clearly applies. If a form collects a date of birth and the service has no age requirement, no insurance product, and no birthday email, that field is hard to justify — even if the user typed it in voluntarily.

## How to implement

Apply minimisation at four points: collection, storage, logging, and retention.

**Collection.** Walk through every form and every API. For each field, name the purpose. Drop anything that fails the test.

- A newsletter signup needs an email address. It does not need a name, a phone number, or a job title.
- A contact form needs a way to reply. If you reply by email, you do not need a phone number.
- A delivery address is necessary to deliver a physical product. It is not necessary to download a PDF.
- Use a country dropdown instead of asking for a full address when only country matters for tax or compliance.

**Storage.** Separate identifiers from behavioural data where you can. Hash or tokenise where the raw value is not needed for the operation. For free-text fields, expect users to paste in personal data and plan accordingly.

**Logging.** Logs are the most common place where minimisation quietly fails. A request log that records full URLs will capture query-string tokens, search terms, and form data submitted over GET. Redact known sensitive fields, truncate URLs at the path, and never log request bodies in plain text in production.

**Retention.** Set a maximum retention period for each category of data and enforce it with a scheduled job, not a wiki page. Build deletion into the system from the start; retrofitting it after a request from a regulator is painful.

## Common mistakes

- Treating "we might want this later" as a purpose.
- Asking for a phone number "in case we need to call" when you never call.
- Storing IP addresses in analytics or logs indefinitely.
- Logging request bodies, including login payloads, in production.
- A retention policy in the privacy notice that no system enforces.
- Forgetting that backups age out on their own schedule — deletion needs to flow through to them too.
---

## global-privacy-control
Source: https://specification.website/spec/privacy/global-privacy-control/

---
title: "Global Privacy Control (GPC)"
category: privacy
status: recommended
url: https://specification.website/spec/privacy/global-privacy-control/
updated: "2026-09-24T00:00:00.000Z"
sources:
  - title: "Global Privacy Control (GPC) — W3C Working Draft"
    url: "https://www.w3.org/TR/gpc/"
    publisher: "W3C Privacy Working Group"
  - title: "California Attorney General — Frequently Asked Questions: CCPA"
    url: "https://oag.ca.gov/privacy/ccpa"
    publisher: "California Office of the Attorney General"
  - title: "Colorado's approach to Universal Opt-Out requirements"
    url: "https://iapp.org/news/a/colorados-approach-to-universal-opt-out-requirements"
    publisher: "IAPP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Global Privacy Control (GPC)

> Global Privacy Control is a browser-level signal that tells websites the user opts out of the sale or sharing of their personal data. California and Colorado require sites to honour it.

## What it is

Global Privacy Control (GPC) is a simple machine-readable signal that a user — through their browser, an extension, or a privacy-focused tool like DuckDuckGo or Brave — broadcasts to every site they visit. It says: *I do not want my personal data sold or shared.*

The signal is sent two ways:

- An HTTP request header: `Sec-GPC: 1`
- A JavaScript property: `navigator.globalPrivacyControl === true`

Both are read-only and trivial to detect server-side or client-side.

GPC is not Do Not Track. The `DNT` header shipped a decade earlier with the same ambition and failed, because nothing obliged a site to honour it: it was a polite request that sites were free to ignore, and almost all did. GPC sends the same kind of signal but carries different legal weight. Where DNT was voluntary everywhere, GPC is a binding opt-out under several US state privacy laws, so ignoring it is not a stylistic choice but a violation. If you dismissed GPC as "another header nobody enforces", that reasoning was true of DNT and is wrong about GPC.

## Why it matters

Under the California Consumer Privacy Act (CCPA/CPRA), the California Attorney General has confirmed that GPC is a valid opt-out signal that businesses must honour. Enforcement has followed — Sephora paid \$1.2 million in 2022 in part for failing to process GPC signals. The Colorado Privacy Act explicitly lists GPC-style universal opt-out mechanisms as a required path from July 2024 onward. Connecticut and several other states have followed.

GPC does not replace cookie banners under EU law, because the EU regime is opt-in rather than opt-out. But it is a strong privacy signal everywhere, and respecting it costs almost nothing.

## How to implement

Detect the signal on every request:

```js
// Client-side
if (navigator.globalPrivacyControl) {
  // user has opted out
}
```

```
# Server-side (any language)
if request.headers.get("Sec-GPC") == "1":
    opt_out = True
```

When the signal is present:

- **Do not sell or share** personal information as those terms are defined under the user's applicable law.
- **Do not load advertising trackers**, retargeting pixels, or data-broker tags.
- **Suppress consent-banner "accept" defaults** — the user has already expressed a preference.
- **Record the opt-out** as you would any other privacy request, including the timestamp and the URL.
- **Disclose your behaviour** in the privacy policy: state that you honour GPC and what that means in practice.

For sites that serve both EU and US users, GPC should be treated as one of several inputs alongside cookie consent and any in-product privacy settings. The strictest preference wins.

Once the signal is actually processed, you can say so in machine-readable form by publishing a [GPC support resource at `/.well-known/gpc.json`](/spec/well-known/gpc-json/). That file declares the origin's position for tooling that wants to ask without visiting; it is a declaration, not an implementation, so publish it second.

## Common mistakes

- Ignoring the signal entirely and continuing to load tracking scripts.
- Honouring GPC only for users who identify themselves as Californian. The signal does not include a state, and the AG has been clear: process it for any user who sends it.
- Treating GPC as a cookie banner replacement under GDPR. EU consent is opt-in; GPC is opt-out.
- Failing to mention GPC in the privacy policy, so users have no way to verify the site respects it.
---

## privacy-policy
Source: https://specification.website/spec/privacy/privacy-policy/

---
title: "Privacy policy"
category: privacy
status: required
url: https://specification.website/spec/privacy/privacy-policy/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "GDPR Articles 13 and 14 — Information to be provided"
    url: "https://gdpr-info.eu/art-13-gdpr/"
    publisher: "EU GDPR"
  - title: "ICO — Right to be informed"
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/"
    publisher: "ICO"
  - title: "EDPB Guidelines on Transparency under Regulation 2016/679"
    url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/transparency_en"
    publisher: "EDPB"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Privacy policy

> A privacy policy tells visitors what personal data you collect, why, on what legal basis, who you share it with, how long you keep it, and what rights they have.

## What it is

A privacy policy is the public document that explains how your website handles personal data. Under the GDPR it satisfies the transparency obligations of Articles 13 and 14 — the right of the data subject to be informed about processing. Similar laws exist in the UK (UK GDPR), California (CCPA/CPRA), Brazil (LGPD), and most other jurisdictions.

It is not a disclaimer. It is a binding statement of practice.

## Why it matters

If you collect any personal data — names, email addresses, IP addresses, cookies tied to a user, form submissions — you owe the visitor an accurate description of what happens to it. Regulators treat a missing, vague, or out-of-date policy as a transparency failure on its own, even before they look at what you actually do with the data.

A clear policy also reduces support load. Most "what do you do with my data?" questions disappear when there is a page to point at.

## How to implement

A privacy policy should disclose, at minimum:

- **Identity of the controller**, including a postal address and a contact for privacy questions. If you have a Data Protection Officer, name them.
- **Categories of personal data** you process — account data, usage data, payment data, contact data, technical identifiers like IP addresses.
- **Purposes** for each category — running the service, billing, marketing, analytics, security, legal compliance.
- **Lawful basis** under GDPR Article 6 for each purpose: consent, contract, legal obligation, vital interests, public task, or legitimate interests. If you rely on legitimate interests, say what they are.
- **Recipients and processors** — payment providers, hosting, email, analytics, customer support tools. List by name or category, and indicate transfers outside the EU/UK with the safeguard used (SCCs, adequacy decision).
- **Retention periods** for each category, or the criteria used to determine them.
- **Rights** — access, rectification, erasure, restriction, portability, objection, and the right to lodge a complaint with a supervisory authority.
- **Cookies and tracking**, either inline or by linking to a separate cookie notice.
- **A "last updated" date** that is visible at the top of the page.

Link to the policy from the footer of every page. Do not put it behind a login.

## Common mistakes

- Copy-pasted boilerplate that mentions practices you do not have, or omits ones you do.
- A single "we may share data with partners" line that names no one.
- No retention information at all.
- Hiding the policy in the terms of service.
- Updating the document without changing the date — or changing the date without telling existing users.
---

## storage-access-api
Source: https://specification.website/spec/privacy/storage-access-api/

---
title: "Storage Access API"
category: privacy
status: optional
url: https://specification.website/spec/privacy/storage-access-api/
updated: "2026-07-05T10:00:00.000Z"
sources:
  - title: "The Storage Access API"
    url: "https://privacycg.github.io/storage-access/"
    publisher: "W3C Privacy Community Group"
  - title: "MDN — Storage Access API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API"
    publisher: "MDN"
  - title: "MDN — Document: requestStorageAccess() method"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Document/requestStorageAccess"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Storage Access API

> As browsers partition and block third-party cookies, embedded cross-site content uses the Storage Access API to request its own cookies behind a user gesture — instead of asking visitors to switch off tracking protection.

## What it is

The Storage Access API lets cross-site content loaded in a third-party context — embedded in an `<iframe>` — request access to its own unpartitioned cookies and storage: the state it would have as a first-party document but is denied when embedded. An embed calls `document.hasStorageAccess()` to check, and `document.requestStorageAccess()`, behind a user gesture, to ask. The browser grants or denies, sometimes after prompting the user. It is standardised by the W3C Privacy Community Group and ships in Chrome, Firefox, Safari, and Edge.

## Why it matters

Browsers are phasing out unrestricted third-party cookies to stop cross-site tracking. Firefox (Total Cookie Protection) and Safari (Intelligent Tracking Prevention) partition or block them by default, and Chrome is moving the same way. That also breaks legitimate cross-site flows: single sign-on with a federated identity provider, a shared account or comment widget, or personalisation served from a sibling domain. The old workaround — telling visitors to disable tracking protection or add an exception — trades every user's privacy for one site's convenience, and increasingly does not work at all. The Storage Access API is the standards-track replacement: it restores access for the specific, legitimate case behind an explicit user gesture, without reopening the site to tracking.

## How to implement

- Reach for it only when embedded content genuinely needs its own unpartitioned cookies — SSO, federated identity, a signed-in widget. A first-party site setting its own cookies never needs it.
- From the embed, call `hasStorageAccess()`; if it is false, call `requestStorageAccess()` inside a click or tap handler — it requires transient activation (a user gesture). Await the promise, load the credentialed view on success, and degrade gracefully on rejection.
- Cookies must be `SameSite=None; Secure` to travel cross-site (see [cookie attributes](/spec/security/cookie-attributes/)), and the whole flow works only in a secure (HTTPS) context.
- The embedding page must permit it: an `allow-storage-access-by-user-activation` sandbox token on a sandboxed iframe, and no `storage-access` [Permissions-Policy](/spec/security/permissions-policy/) blocking it.
- For already-granted permissions and passive resources, the `Sec-Fetch-Storage-Access` request header and `Activate-Storage-Access` response header let the server skip a round trip; add `Vary: Sec-Fetch-Storage-Access` when you branch on it.

## Common mistakes

- Calling `requestStorageAccess()` outside a user gesture — it rejects without transient activation.
- Forgetting `SameSite=None; Secure`, so cookies are never sent even after access is granted.
- Treating a grant as permanent; grants lapse (around 30 days without interaction) and must be re-activated per context.
- Using it as a tracking loophole. Browsers gate it on prior first-party interaction and user prompts precisely to prevent that.

## Verification

- In an embedded frame, log `await document.hasStorageAccess()` before and after the request flow.
- Check the browser's storage or privacy panel for the granted `storage-access` permission, keyed to `<top-level site, embedded site>`.
- Confirm the credentialed request carries cookies in the DevTools network panel, and that `Sec-Fetch-Storage-Access` reports `none` / `inactive` / `active` as expected.
---

## third-party-scripts
Source: https://specification.website/spec/privacy/third-party-scripts/

---
title: "Third-party scripts and privacy"
category: privacy
status: recommended
url: https://specification.website/spec/privacy/third-party-scripts/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "MDN — Content Security Policy (CSP)"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP"
    publisher: "MDN"
  - title: "EDPB Guidelines 2/2023 on Technical Scope of Art. 5(3) ePrivacy Directive"
    url: "https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22023-technical-scope-art-53-eprivacy-directive_en"
    publisher: "EDPB"
  - title: "MDN — Subresource Integrity"
    url: "https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Subresource_Integrity"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Third-party scripts and privacy

> Every script loaded from another domain can read cookies, see the URL, and exfiltrate data from your page. Audit them, justify them, and lock them down.

## What it is

A third-party script is any `<script src="…">` whose source is not your own origin. Once it loads, it runs with full access to the page: the DOM, cookies that are not `HttpOnly`, localStorage, the URL, the referrer, form inputs as the user types, and any data your own JavaScript exposes.

The browser also tells the third party about the visit at the network layer: IP address, user-agent, Accept-Language, the page that loaded the script (Referer), and any cookies that domain has set.

## Why it matters

Third-party scripts are the largest source of unintended data leaks on the modern web. A single tag for a chat widget, A/B tester, fonts service, or "session replay" tool can ship every URL a logged-in user visits to a third party. Some of those tools record keystrokes by default.

From a legal standpoint, the EDPB has confirmed that the ePrivacy Directive applies to any technology that reads or writes to the user's device, not just cookies — so a tracking pixel without a cookie is still in scope. From a security standpoint, a compromised third-party script becomes a compromise of your site. *Magecart*-style supply-chain attacks have hit British Airways, Ticketmaster, and many smaller sites by injecting code into a single trusted vendor.

## How to implement

Treat every third party as a liability you are choosing to take on.

- **Audit what you have.** Use the network panel, or a tool like Request Map, to list every domain your pages contact. Most sites are surprised.
- **Justify each one.** What does it do, who owns it, what data does it receive, and what is the business case for keeping it? Anything that fails this should be removed.
- **Self-host where you can.** Fonts, JavaScript libraries, and icon sets rarely need to come from a CDN. Self-hosting eliminates a third-party contact entirely and is often faster.
- **Defer or gate the rest.** Anything that is not essential to first render should load after user interaction, or only after consent for non-essential storage.
- **Use a Content Security Policy.** A `script-src` allowlist prevents a compromised page from loading scripts you did not approve. See `security/content-security-policy`.
- **Use Subresource Integrity** for any script you must load from a third party where the URL is stable. An SRI hash ensures the file has not changed since you audited it. See `security/subresource-integrity`.
- **Set a Referrer-Policy** of `strict-origin-when-cross-origin` or stricter. It trims the URL carried in the `Referer` header the browser sends when it fetches a third-party resource, so a pixel or image endpoint sees your origin rather than the full path and query string.

## Common mistakes

- Loading dozens of marketing tags through a tag manager and treating the tag manager as the audit.
- Hot-linking fonts or libraries from a public CDN to "save bandwidth" while leaking visitor IPs to that CDN.
- Adding session-replay tools without checking what they record. Many capture passwords and credit cards by default.
- Setting a permissive CSP (`script-src *`) that defeats the protection.
- Expecting `Referrer-Policy` to hide the URL from a third-party script. It controls the `Referer` header only. A script loaded with `<script src>` runs inside your document and reads `location.href` directly, whatever the policy says. The policy limits what a fetched resource is told, not what an executing script can see, so the two protections are not interchangeable.
- Auditing once at launch and never again.
---

