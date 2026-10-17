# Distilled — specification.website meta artefacts

Distilled for a read-only auditor of consumer-facing websites (public marketing, content, and self-service surfaces).
Sources: the five local evidence files under `.zflow/evidence/specweb/meta/`. Every quote below is one line copied
character-for-character from its source file (leading indentation preserved).

Selection rule: all 36 **Required** and all 6 **Avoid** items of the checklist are included (the hard bars);
**Recommended** items observable on public consumer surfaces are included at medium severity; **Optional**
(context-conditional) items and pure build-technique/infrastructure Recommended items are excluded and named in
the Checklist Notes.

Severity mapping: Required → high · Recommended → medium · Avoid → high (medium where the act is dead-weight
rather than actively harmful: X-XSS-Protection, HTTP/1.1 workarounds).

---

## Foundations

#### 1. Doctype — Required (severity: high)

Requirement: Every HTML page must begin its response with `<!doctype html>` so browsers render in standards mode.
Quote (exact source line):
  Every HTML document must start with \<!doctype html\> as its first line. This opts the browser into standards mode; without it, you get quirks mode and broken layout.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | head -c 100` — the first markup token is `<!doctype html>` (case-insensitive), before any comment, whitespace-only prologue, or element.

#### 2. html lang — Required (severity: high)

Requirement: The `<html>` element must carry a valid BCP 47 `lang` tag declaring the page language.
Quote (exact source line):
  Set a valid BCP 47 language tag on the \<html\> element so screen readers, translators, search engines, and browsers know what language the page is in.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<html[^>]*>'` — a `lang="..."` attribute with a valid BCP 47 tag (e.g. `en`, `pt-BR`) is present.

#### 3. meta charset — Required (severity: high)

Requirement: UTF-8 must be declared as the document character encoding within the first 1024 bytes of the HTML.
Quote (exact source line):
  Declare UTF-8 as the document character encoding in the first 1024 bytes of the HTML, so browsers parse text correctly before they hit any non-ASCII content.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | head -c 1024 | grep -i charset` — `charset` declaration (meta or equivalent HTTP header) appears inside the first 1024 bytes.

#### 4. meta viewport — Required (severity: high)

Requirement: A `<meta name="viewport">` set to the device's actual width must be present, and user scaling must never be disabled.
Quote (exact source line):
  Tell mobile browsers to render the page at the device's actual width instead of pretending to be a 980-pixel desktop. One line, and never disable user scaling.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<meta name="viewport"[^>]*>'` — `width=device-width` present; no `user-scalable=no` and no `maximum-scale=1`.

#### 5. title — Required (severity: high)

Requirement: Every page must have exactly one non-empty `<title>` element inside `<head>`, distinct from the page's `<h1>`.
Quote (exact source line):
  Every HTML document must have exactly one non-empty \<title\> element inside \<head\>. It names the page for browsers, search engines, screen readers, social previews, and AI agents. It is not the same thing as the page's \<h1\>.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -c '<title>'` — exactly one, non-empty, inside `<head>`, and unique per page across sampled URLs.

#### 6. meta description — Recommended (severity: medium)

Requirement: Every page should carry a short, unique `<meta name="description">` summary.
Quote (exact source line):
  A short, unique summary of the page used by search engines and social platforms as a snippet. Google may rewrite it, but a good one is rewritten less often.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'name="description"'` — present, non-empty, and unique across sampled pages (no shared site-wide default).

#### 7. canonical URL — Recommended (severity: medium)

Requirement: Pages should declare their preferred canonical URL via `<link rel="canonical">`.
Quote (exact source line):
  Declare the preferred URL for a page so search engines and crawlers consolidate ranking signals on one address, even when several URLs serve the same content.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'rel="canonical"'` — present and pointing at the page's preferred absolute URL.

#### 8. favicons and app icons — Recommended (severity: medium)

Requirement: The site should ship an SVG favicon, an ICO fallback at /favicon.ico, an apple-touch-icon, and a maskable PWA icon.
Quote (exact source line):
  Ship an SVG favicon, an ICO fallback at /favicon.ico, an apple-touch-icon, and a maskable PWA icon. Five files cover every browser and home-screen surface.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <origin>/favicon.ico` returns 200; `<head>` links an SVG icon and an apple-touch-icon; the web app manifest declares a maskable icon.

#### 9. meta color-scheme — Recommended (severity: medium)

Requirement: Pages should declare `<meta name="color-scheme">` so dark-mode users get no white flash and browser-styled UI matches.
Quote (exact source line):
  Tells the browser which colour schemes your page is designed for. Prevents the white flash that dark-mode users see before your CSS loads, and lets the browser style scrollbars, form controls, and the page background to match.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'name="color-scheme"'` — present with light/dark values.

#### 10. Open Graph — Recommended (severity: medium)

Requirement: Pages should set Open Graph tags (og:title, og:description, og:image, og:url, og:type) for social and chat previews.
Quote (exact source line):
  Open Graph tags control how pages look when shared on social platforms and chat apps. Set og:title, og:description, og:image, og:url, and og:type on every page.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'property="og:'` — all five of og:title, og:description, og:image, og:url, og:type present and non-empty.

## SEO

#### 11. robots.txt — Recommended (severity: medium)

Requirement: A robots.txt conforming to RFC 9309 should be served at the site root.
Quote (exact source line):
  A plain-text file at the site root that tells crawlers which paths they may or may not fetch. Standardised in RFC 9309 and supported by every major search engine.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <origin>/robots.txt` — returns a parseable RFC 9309 file with a Sitemap directive; no accidental `Disallow: /` on public content.

#### 12. XML sitemaps — Recommended (severity: medium)

Requirement: An XML sitemap listing canonical URLs should be published and referenced from robots.txt.
Quote (exact source line):
  An XML file listing the canonical URLs of a site, with optional metadata about when each was last changed. The fastest way to tell a search engine what exists.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Fetch the sitemap URL from robots.txt, validate with `xmllint --noout sitemap.xml`, and spot-check that listed URLs are canonical and return 200.

#### 13. URL structure — Recommended (severity: medium)

Requirement: Public URLs should be lowercase, hyphenated, descriptive, and shallow.
Quote (exact source line):
  URLs are the most stable identifier on the web. Keep them lowercase, hyphenated, descriptive, and shallow. Treat them as a public API for your content.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect sampled URLs from the sitemap and nav — lowercase, hyphen-separated, human-descriptive, shallow path depth; no mixed case, underscores, or opaque IDs.

#### 14. redirects — Required (severity: high)

Requirement: HTTP redirects must use the correct permanence code (301/308 permanent, 302/307 temporary) and avoid unnecessary chains.
Quote (exact source line):
  HTTP redirects send a client from one URL to another. Use 301 or 308 for permanent moves, 302 or 307 for temporary ones, and never chain more than necessary.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sIL http://<origin>` — HTTP redirects to HTTPS with 301/308; test known moved URLs for the right code and count hops (`-w '%{num_redirects}'`) — no long chains.

#### 15. server-side rendering — Recommended (severity: medium)

Requirement: Primary content and metadata should be present in the initial server response (SSR, static, or prerendered), not assembled only by client JavaScript.
Quote (exact source line):
  Crawlers, social scrapers, and AI agents index the HTML your server returns. Render your primary content and metadata server-side — via SSR, static generation, or prerendering — so it is in the initial response, not assembled later by client-side JavaScript.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url>` — the returned HTML already contains the page's primary content, title, and meta tags; compare against a JS-disabled browser render.

#### 16. soft 404s — Avoid (severity: high)

Requirement: URLs that don't exist must return a real 404/410 status, not a 200 OK page that looks like "not found".
Quote (exact source line):
  A page that looks like a 'not found' message to a user but returns 200 OK to a crawler. Search engines treat soft 404s as a quality problem and often refuse to index them.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s -o /dev/null -w '%{http_code}' <origin>/no-such-page-<random>` — status is 404 or 410, never 200 with "not found" content.

#### 17. meta robots / X-Robots-Tag — Required (severity: high)

Requirement: Every page must carry an explicit, correct indexing policy — default index on public pages, explicit noindex/X-Robots-Tag on staging, admin, thin, or private content.
Quote (exact source line):
  Every page must have an explicit, correct indexing policy — either implicit (default index, follow) on public pages, or an explicit noindex / X-Robots-Tag on staging, admin, thin, or private content. Get this wrong and you either disappear from search or expose what you didn't mean to.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'name="robots"'` and `curl -sI <page-url> | grep -i x-robots-tag` — public pages are indexable; no `noindex` leaking onto public pages; staging/admin (if reachable) is noindexed.

#### 18. heading hierarchy — Required (severity: high)

Requirement: Page headings must form a nested outline without skipped levels and must not be used for visual styling alone.
Quote (exact source line):
  Headings describe the sections of a page. They must form a nested outline, never be used for visual styling alone, and never skip levels.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<h[1-6][^>]*>'` — one h1 per page and no skipped levels in the heading sequence.

#### 19. internal linking — Recommended (severity: medium)

Requirement: Pages should contain descriptive in-content links to other pages on the site.
Quote (exact source line):
  Links from one page on a site to another. The strongest signal you control for telling crawlers and AI agents what a page is about and how important it is.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Crawl 5–10 pages and count descriptive same-site links in body content — key pages are reachable within a few clicks of the homepage.

#### 20. structured data (JSON-LD) — Recommended (severity: medium)

Requirement: Pages should carry schema.org structured data as JSON-LD.
Quote (exact source line):
  Machine-readable annotations that describe the content of a page using the schema.org vocabulary. JSON-LD is the format search engines and AI agents expect.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep 'application/ld+json'` — valid JSON-LD present; validate types/values at validator.schema.org.

#### 21. breadcrumbs — Recommended (severity: medium)

Requirement: Pages deep in the hierarchy should show a visible breadcrumb marked up as BreadcrumbList JSON-LD.
Quote (exact source line):
  A short trail showing the page's position in the site hierarchy. Visible in the UI for users, marked up as BreadcrumbList JSON-LD for search engines.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: On a product/article/detail page, a visible breadcrumb exists and a BreadcrumbList JSON-LD block mirrors it.

## Accessibility

#### 22. colour contrast — Required (severity: high)

Requirement: Text and meaningful non-text elements must meet contrast minimums against their background.
Quote (exact source line):
  Text and meaningful non-text elements must have enough contrast against their background so people with low vision and people in harsh light can read them.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Run axe-core or Lighthouse accessibility audit on key templates — zero contrast violations (≥4.5:1 body text, ≥3:1 large text and UI components).

#### 23. image alt text — Required (severity: high)

Requirement: Every `<img>` element must have an alt attribute describing its purpose.
Quote (exact source line):
  Every \<img\> element must have an alt attribute. The value describes the image's purpose to screen readers, search engines, and anyone whose image fails to load.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<img[^>]*>'` — every img carries `alt` (empty `alt=""` only on decorative images).

#### 24. form labels — Required (severity: high)

Requirement: Every form control must have a programmatically associated label; a placeholder is not a label.
Quote (exact source line):
  Every form control needs a programmatically associated label. A placeholder is not a label, and an unlabelled input is unusable for screen-reader and voice-control users.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect each form control for `<label for>`, `aria-label`, or `aria-labelledby` — inputs with only placeholder text fail.

#### 25. keyboard navigation — Required (severity: high)

Requirement: Every interactive element must be reachable and operable by keyboard alone, in logical order, with no focus traps.
Quote (exact source line):
  Every interactive element on the page must be reachable and operable with a keyboard alone, in a logical order, with no traps that hold focus.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Manual Tab/Shift+Tab walkthrough in a browser — all controls reachable and operable (menus, carousels, modals, filters), DOM order logical, no trap.

#### 26. visible focus indicators — Required (severity: high)

Requirement: Keyboard focus must show a clear, high-contrast indicator on every control.
Quote (exact source line):
  Whenever a control receives keyboard focus, the page must show a clear, high-contrast indicator. Removing focus outlines without a replacement is a top accessibility failure.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Tab through the page and observe a visible focus ring on every control; grep CSS for `outline: none` / `outline:0` without a replacement style.

#### 27. focus not obscured — Recommended (severity: medium)

Requirement: A focused control must not be hidden behind sticky headers, cookie banners, or chat widgets.
Quote (exact source line):
  A focused control must not be hidden behind a sticky header, cookie banner, or chat widget. WCAG 2.2 added this as a separate criterion because a perfect focus ring is worthless if something is sitting on top of it.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: With sticky header/cookie banner/chat widget present, Tab to elements near the top and bottom — the focused element is never fully obscured.

#### 28. skip links — Required (severity: high)

Requirement: A "skip to main content" link must be the first focusable element on every page.
Quote (exact source line):
  A 'skip to main content' link as the first focusable element lets keyboard and screen-reader users jump past repeated navigation on every page.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: First Tab press on a page reveals a skip link targeting the main content region, and activating it moves focus there.

#### 29. semantic HTML and landmarks — Required (severity: high)

Requirement: Pages must use semantic HTML with landmark elements (header, nav, main, footer).
Quote (exact source line):
  Use the right HTML element for the job. Landmarks like \<header\>, \<nav\>, \<main\>, and \<footer\> let assistive technologies announce structure and skip between regions.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<header\|<nav\|<main\|<footer'` — landmarks present, exactly one `<main>`, and headings/structure not faked with styled divs.

#### 30. descriptive link text — Required (severity: high)

Requirement: Link text must describe its destination; generic "click here"/"read more" text fails.
Quote (exact source line):
  Every link's text must describe where it goes. 'Click here' and 'read more' fail screen-reader users who scan a page by jumping from link to link.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Extract all anchor texts (axe `link-name` or manual) — no ambiguous 'click here' / 'read more' links without an accessible name carrying context.

#### 31. empty links and buttons — Avoid (severity: high)

Requirement: No link or button may lack an accessible name, including icon-only controls.
Quote (exact source line):
  A link or button with no accessible name is invisible to screen readers and unreachable for voice control. Icon-only controls without a label are the usual culprit.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Run axe rules `button-name` / `link-name` — zero unnamed links or buttons; icon-only controls carry aria-label or visually hidden text.

#### 32. accessible form errors — Required (severity: high)

Requirement: Form submission failures must produce text errors associated with the offending input and announced to assistive technology.
Quote (exact source line):
  When a form submission fails, errors must be identified in text, associated with the input that caused them, and announced to assistive technology.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Submit a form with invalid data — textual error messages appear, tied to inputs via `aria-describedby`/`aria-invalid`, and announced (live region / focus move).

#### 33. status messages — Recommended (severity: medium)

Requirement: Success, failure, or progress messages that don't move focus must be exposed through a live region.
Quote (exact source line):
  When something succeeds, fails or changes without moving focus — a result count, a saved confirmation, a progress update — assistive technology has to be told. Expose it through a live region, or announce it with ariaNotify().
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Trigger an async result (search, filter, save) — the update is exposed via `aria-live`/`role="status"` (or ariaNotify) rather than silently changing the DOM.

#### 34. accessible authentication — Recommended (severity: medium)

Requirement: Login must be possible without cognitive function tests, without blocking password managers, and with paste allowed.
Quote (exact source line):
  Let people log in without solving a puzzle, transcribing a code, or memorising anything. Don't block password managers, allow paste, and offer a method that needs no cognitive function test.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Walk the login flow — no memorisation/transcription-only step, paste works in password fields (`onpaste="return false"` fails), autocomplete attributes allow password managers.

#### 35. redundant entry — Recommended (severity: medium)

Requirement: Multi-step processes should not force users to re-enter information already provided.
Quote (exact source line):
  Don't make people re-type information they already gave you in the same process. Auto-populate it, or let them pick it from what they entered a step ago.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Walk a multi-step form (e.g. checkout) — previously entered data (address, email) is pre-filled or selectable at later steps.

#### 36. consistent help — Recommended (severity: medium)

Requirement: Help affordances (contact link, phone, chat, FAQ) should sit in the same relative place on every page where they appear.
Quote (exact source line):
  If you offer help — a contact link, a phone number, a chat widget, an FAQ — put it in the same relative place on every page that has it. Moving it around is the failure.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Compare the position of help/contact/chat elements across sampled pages — same relative placement everywhere.

#### 37. document and parts language — Required (severity: high)

Requirement: The page's primary language must be set on `<html lang>` and inline foreign-language content marked with its own lang attribute.
Quote (exact source line):
  Set the page's primary language on \<html lang\> and mark any inline content in a different language with its own lang attribute, so screen readers pronounce it correctly.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `<html lang>` matches page language; spot-check foreign-language passages for their own `lang` attribute.

#### 38. reduced motion — Required (severity: high)

Requirement: The site must respect the user's prefers-reduced-motion setting for decorative animation, parallax, and autoplay.
Quote (exact source line):
  Respect the user's `prefers-reduced-motion` setting. Decorative animation, parallax, and autoplay can trigger vestibular distress, migraines, and seizures.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Enable Reduce Motion at OS level and browse — animation/parallax/autoplay stops or reduces; grep CSS for a `@media (prefers-reduced-motion)` block wrapping motion.

#### 39. accessibility overlays — Avoid (severity: high)

Requirement: The site must not load third-party accessibility overlay widgets claiming runtime WCAG compliance.
Quote (exact source line):
  Third-party JavaScript widgets that claim to make a site WCAG-compliant at runtime. They do not work, often harm screen-reader users, and attract lawsuits.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: View source and the network log for known overlay vendors (accessiBe, UserWay, AudioEye, etc.) — none present.

#### 40. captions and transcripts — Required (severity: high)

Requirement: Video must have synchronised captions, audio-only content a transcript, and meaningful visuals audio description.
Quote (exact source line):
  Video needs synchronised captions, audio-only content needs a transcript, and visuals that carry meaning need audio description. Auto-captions alone are not enough.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Every `<video>` element has a `<track kind="captions">`; audio-only content links a transcript page.

#### 41. accessible data tables — Required (severity: high)

Requirement: Data tables must use real table markup with caption, header cells, and scope attributes.
Quote (exact source line):
  Tabular data must use real \<table\> markup with a caption, header cells, and scope attributes so screen readers can announce row and column relationships.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<table[^>]*>'` context — data tables use `<caption>` and `<th scope="...">`; no data presented in CSS grids/divs or layout tables.

#### 42. touch target size — Required (severity: high)

Requirement: Interactive controls must meet the 24×24 CSS px minimum touch target (44×44 enhanced).
Quote (exact source line):
  Interactive controls must be large enough to tap or click reliably. WCAG 2.2 sets a 24×24 CSS px minimum, with 44×44 CSS px as the enhanced target.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Measure tappable controls in browser DevTools (or an automated a11y scan) — none below 24×24 CSS px; primary actions aim for 44×44.

#### 43. mobile-friendly form inputs — Recommended (severity: medium)

Requirement: Mobile forms should use the right input type/inputmode/enterkeyhint and keep input text at 16px or larger.
Quote (exact source line):
  On a phone, the right input type, inputmode, and enterkeyhint summon the correct on-screen keyboard and a useful Enter key. Keep input text at 16px or larger so iOS Safari doesn't zoom on focus.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect forms for `type="email|tel|number"` plus `inputmode`/`enterkeyhint` where appropriate; computed input font-size ≥16px.

## Security

#### 44. HTTPS and TLS — Required (severity: high)

Requirement: Every page must be served over HTTPS with TLS 1.2/1.3, plain HTTP redirected, and obsolete TLS versions disabled.
Quote (exact source line):
  Serve every page over HTTPS using TLS 1.2 or 1.3, redirect plain HTTP to HTTPS, and disable obsolete SSL and early TLS versions on every host you control.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI http://<origin>` redirects to https; `openssl s_client -connect <host>:443 -tls1_1` fails while `-tls1_2`/`-tls1_3` succeed (or SSL Labs reports TLS 1.2/1.3 only).

#### 45. TLS configuration hardening — Recommended (severity: medium)

Requirement: TLS configuration should be hardened: compression off, secure renegotiation, no unsafe 0-RTT, EMS on, server cipher order, SHA-2 signatures, adequate key sizes.
Quote (exact source line):
  Beyond protocol versions and key exchange: TLS compression off, secure renegotiation only, no unsafe 0-RTT, Extended Main Secret on, server cipher order, SHA-2 signatures, and certificate keys of adequate size.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Run `testssl.sh <host>` or an SSL Labs scan — no TLS compression, no insecure renegotiation, EMS on, server cipher ordering, SHA-2 chain, adequate key sizes.

#### 46. HSTS — Required (severity: high)

Requirement: HSTS must be sent with max-age and includeSubDomains (preload list skipped).
Quote (exact source line):
  HSTS tells browsers to only ever use HTTPS for your domain. Send max-age with includeSubDomains — but skip the preload list, which its own operator now discourages.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI https://<origin>/ | grep -i strict-transport-security` — `max-age` (large) with `includeSubDomains`; `preload` not required by the spec.

#### 47. mixed content — Recommended (severity: medium)

Requirement: All subresources on HTTPS pages must load over HTTPS, with CSP upgrade-insecure-requests as a safety net.
Quote (exact source line):
  An HTTPS page that loads any subresource over HTTP is mixed content. Serve every subresource over HTTPS, and send the upgrade-insecure-requests CSP directive as a safety net.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Scan page source and network log for `http://` subresources — zero; CSP contains `upgrade-insecure-requests`.

#### 48. Content Security Policy — Recommended (severity: medium)

Requirement: A Content Security Policy should restrict trusted sources of script, style, image, and frame content.
Quote (exact source line):
  A CSP tells browsers which sources of script, style, image, and frame content to trust. A good policy stops most XSS and data-exfiltration attacks dead.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i content-security-policy` — a real, restrictive policy is present (script-src allowlist, not `unsafe-inline` everywhere).

#### 49. security.txt — Recommended (severity: medium)

Requirement: A /.well-known/security.txt should be published describing how to report vulnerabilities.
Quote (exact source line):
  A standard text file at /.well-known/security.txt tells security researchers how to report vulnerabilities. It is cheap to publish and dramatically lowers the bar for responsible disclosure.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s https://<origin>/.well-known/security.txt` — 200 with a `Contact:` field (follows RFC 9116 fields).

#### 50. X-Content-Type-Options — Required (severity: high)

Requirement: Responses must send X-Content-Type-Options: nosniff.
Quote (exact source line):
  The nosniff header stops browsers from guessing a response's content type. It blocks a class of attacks where a benign-looking file is interpreted as script or stylesheet.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i x-content-type-options` — value is `nosniff` on HTML and downloadable resources.

#### 51. clickjacking protection — Required (severity: high)

Requirement: Pages must set CSP frame-ancestors (X-Frame-Options as legacy fallback) to control iframe embedding.
Quote (exact source line):
  Tell browsers who is allowed to embed your pages in an iframe. Use CSP frame-ancestors. X-Frame-Options is the legacy fallback.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i 'frame-ancestors\|x-frame-options'` — CSP `frame-ancestors` present (`'none'` or an allowlist), optionally with legacy X-Frame-Options.

#### 52. Referrer-Policy — Recommended (severity: medium)

Requirement: A Referrer-Policy of strict-origin-when-cross-origin or stricter should be sent.
Quote (exact source line):
  Referrer-Policy controls how much URL information your site leaks when users follow a link or load a subresource. strict-origin-when-cross-origin is the sensible default.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i referrer-policy` — present and `strict-origin-when-cross-origin`, `no-referrer`, or `same-origin`.

#### 53. Permissions-Policy — Recommended (severity: medium)

Requirement: A Permissions-Policy should disable powerful browser features the site doesn't use, for its pages and embedded iframes.
Quote (exact source line):
  Permissions-Policy lets you turn off powerful browser features — camera, microphone, geolocation, payment, USB — for your own pages and for any iframes you embed.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i permissions-policy` — present; unused powerful features (camera, mic, geolocation, payment, USB) are disabled.

#### 54. Subresource Integrity — Recommended (severity: medium)

Requirement: Third-party scripts and stylesheets should carry Subresource Integrity hashes.
Quote (exact source line):
  SRI adds a cryptographic hash to every third-party script and stylesheet so the browser refuses to run modified files. Essential for any external JS or CSS you depend on.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<script[^>]*src="https\?://[^"]*"[^>]*>'` — every cross-origin script/link tag carries an `integrity=` attribute.

#### 55. X-XSS-Protection — Avoid (severity: medium)

Requirement: The dead X-XSS-Protection header must not be sent.
Quote (exact source line):
  A dead header that roughly a third of major sites still send. No shipping browser reads it, it was never standardised, and the values people copy-paste were the dangerous ones. Stop sending it and rely on CSP.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i x-xss-protection` — header absent; its presence is the finding.

#### 56. cookie attributes — Required (severity: high)

Requirement: Every cookie must be Secure, HttpOnly where possible, with an explicit SameSite; session cookies should use __Host-/__Secure- prefixes.
Quote (exact source line):
  Every cookie should be Secure, HttpOnly where possible, and have an explicit SameSite. Use __Host- and __Secure- prefixes for session cookies.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI -D - <origin>` — every `Set-Cookie` carries `Secure` and `SameSite`; session cookies add `HttpOnly` and use `__Host-`/`__Secure-` names.

## Well-Known URIs

#### 57. well-known overview — Recommended (severity: medium)

Requirement: Site-level metadata should be published under /.well-known/ using only IANA-registered names (RFC 8615).
Quote (exact source line):
  The /.well-known/ path prefix is a standardised place to publish site-level metadata. RFC 8615 defines it; IANA keeps the registry of allowed names.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Probe the `/.well-known/` files the site uses (security.txt, api-catalog, ...) — each responds correctly and each name is in the IANA registry.

#### 58. api-catalog — Recommended (severity: medium)

Requirement: A machine-readable /.well-known/api-catalog (RFC 9727 Linkset) of the host's APIs and resources should be published.
Quote (exact source line):
  RFC 9727 publishes a machine-readable index of the APIs and resources a host exposes. Served as a Linkset (RFC 9264) JSON document, discoverable via the api-catalog link relation.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <origin>/.well-known/api-catalog` — a Linkset JSON document listing the host's machine-readable endpoints.

## Agent Readiness

#### 59. agent readiness overview — Recommended (severity: medium)

Requirement: The site should be agent-ready overall: stable URLs, structured data, clean semantics, robots controls, and machine-readable endpoints.
Quote (exact source line):
  Agent readiness is the set of choices that make a site legible to AI agents and LLMs: stable URLs, structured data, clean semantics, robots controls, and machine-readable endpoints.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Composite check — pass the individual checks for stable URLs (#63), JSON-LD (#20/#64), semantic HTML (#29), robots.txt (#11/#62), and machine-readable endpoints (#58/#60/#65).

#### 60. llms.txt — Recommended (severity: medium)

Requirement: A curated /llms.txt markdown index of the site's most important content should be published.
Quote (exact source line):
  A markdown file at the site root that gives LLMs a curated index of your most important content. Now at v2, which makes it discoverable by link relation instead of by guessing the path. Still a convention, not a ratified standard.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <origin>/llms.txt` — a curated markdown index returns 200; optionally check the v2 link relation in `<head>`/Link headers.

#### 61. Markdown source endpoints — Recommended (severity: medium)

Requirement: Documentation/content pages should expose raw Markdown source at a predictable URL (.md suffix and/or content negotiation).
Quote (exact source line):
  Expose every documentation page's raw Markdown source at a predictable URL — via a .md suffix on the canonical URL, content negotiation, or both. Agents pull source instead of parsing HTML.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url>.md` and `curl -s -H 'Accept: text/markdown' <page-url>` — at least one returns the page's raw Markdown source.

#### 62. robots.txt for AI crawlers — Recommended (severity: medium)

Requirement: robots.txt should set explicit allow/disallow rules per named AI crawler user-agent.
Quote (exact source line):
  Major AI vendors publish named user-agents for their crawlers. Setting an explicit allow or disallow per agent is the clearest way to control how your content is used.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <origin>/robots.txt` — named AI crawler user-agents (GPTBot, ClaudeBot, Google-Extended, CCBot, ...) each have an explicit allow/disallow rule.

#### 63. stable URLs — Required (severity: high)

Requirement: Published URLs must keep working; breaking them invalidates citations, bookmarks, links, and agent caches.
Quote (exact source line):
  URLs are public contracts. Once published, they should keep working. Breaking them invalidates citations, bookmarks, links, and agent caches — and is almost always avoidable.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Sample deep URLs from old sitemaps, archived copies, or inbound links — each still returns 200 or redirects to an equivalent page.

#### 64. structured data for agents — Recommended (severity: medium)

Requirement: Pages should carry schema.org JSON-LD typed facts for agents.
Quote (exact source line):
  JSON-LD with schema.org types gives agents typed facts about your page. It is the same markup search engines use, and agents lean on it just as heavily.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Key templates carry concrete schema.org types in JSON-LD (e.g. Product, Article, Organization, FAQPage) with real values.

#### 65. machine-readable formats — Recommended (severity: medium)

Requirement: JSON, RSS, or plain markdown endpoints should be offered alongside HTML where it makes sense.
Quote (exact source line):
  Offer JSON, RSS, or plain markdown endpoints alongside HTML where it makes sense. Agents and feed readers prefer typed data over scraped HTML.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Check the api-catalog/llms.txt listings and common paths — at least one typed feed/JSON/markdown endpoint exists for the site's content.

#### 66. HTTP Link headers for discovery — Recommended (severity: medium)

Requirement: HTTP Link headers should advertise machine-readable resources (llms.txt, sitemap, api-catalog, RSS) in responses.
Quote (exact source line):
  Use the HTTP Link header to advertise machine-readable resources — llms.txt, sitemap, api-catalog, RSS — directly in the response. Agents that never parse your HTML can still find what they need.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <page-url> | grep -i '^link:'` — Link headers advertise llms.txt / sitemap / api-catalog / RSS as applicable.

#### 67. Agent Skills discovery — Recommended (severity: medium)

Requirement: A well-known URI listing Agent Skills should be published so agents can load scoped instructions for the site.
Quote (exact source line):
  A well-known URI that lists Agent Skills — short, scoped instructions an AI agent can load to work better with your site. Emerging convention via a Cloudflare-led RFC; still draft, still cheap to ship.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <origin>/.well-known/agent-skills` — an index of agent skills returns (JSON per the discovery schema or equivalent).

## Performance

#### 68. Core Web Vitals — Required (severity: high)

Requirement: Real-user Core Web Vitals must hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile.
Quote (exact source line):
  Core Web Vitals measure loading, responsiveness, and visual stability. Hit LCP ≤ 2.5s, INP ≤ 200ms, and CLS ≤ 0.1 at the 75th percentile of real users.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Query the CrUX field data / PageSpeed Insights API for the origin — p75 LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1.

#### 69. image optimisation — Required (severity: high)

Requirement: Images must be served in modern formats (AVIF/WebP), sized for the viewport, with explicit dimensions.
Quote (exact source line):
  Serve images in modern formats (AVIF, WebP), at the right size for the viewport, with explicit dimensions. Images are the largest payload on most pages.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect image responses (`curl -sI` / network log) — AVIF/WebP negotiated, `width`/`height` attributes set, and no oversized sources in small slots.

#### 70. lazy loading — Recommended (severity: medium)

Requirement: Off-screen images, iframes, and video should use native loading="lazy", never on the LCP element.
Quote (exact source line):
  Native lazy loading defers off-screen images, iframes, and (recently) video until the user scrolls near them. Use loading="lazy" — but never on the LCP element.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<img[^>]*>'` — off-screen imgs/iframes carry `loading="lazy"`; the LCP image does not.

#### 71. preload, prefetch, preconnect — Recommended (severity: medium)

Requirement: Resource hints should preload the LCP image and critical fonts, preconnect third-party origins, and prefetch likely navigations.
Quote (exact source line):
  Resource hints let you tell the browser what is coming. Preload the LCP image and critical fonts, preconnect to third-party origins, prefetch the next navigation.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect `<head>` — `<link rel="preload">` for the LCP image and critical font, `rel="preconnect"` for key third-party origins.

#### 72. Cache-Control — Required (severity: high)

Requirement: Fingerprinted assets must be served with immutable + max-age=31536000; HTML with short or no-cache.
Quote (exact source line):
  Cache-Control tells browsers and CDNs how long to keep a response. Use immutable + max-age=31536000 for fingerprinted assets and short or no-cache for HTML.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <hashed-asset-url>` — `public, max-age=31536000, immutable`; `curl -sI <page-url>` — HTML is short-lived or no-cache.

#### 73. conditional requests — Recommended (severity: medium)

Requirement: Cacheable responses should carry ETag/Last-Modified validators and honour conditional requests with 304.
Quote (exact source line):
  Send a validator — ETag or Last-Modified — on every cacheable response, and honour If-None-Match / If-Modified-Since so unchanged resources return an empty 304 instead of the full body.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI <asset-url>` shows ETag/Last-Modified; re-request with `If-None-Match` — server returns 304 with empty body.

#### 74. compression — Required (severity: high)

Requirement: Text responses must be compressed (brotli where supported, gzip otherwise).
Quote (exact source line):
  Compress text responses with brotli where supported, gzip everywhere else. zstd is emerging. Don't compress already-compressed media.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI -H 'Accept-Encoding: br, gzip' <text-resource-url>` — `Content-Encoding: br` (or gzip) on HTML/CSS/JS.

#### 75. web font loading — Recommended (severity: medium)

Requirement: Web fonts should be self-hosted WOFF2, subset, with font-display: swap and critical faces preloaded.
Quote (exact source line):
  Self-host WOFF2 fonts, subset them, set font-display: swap so text is readable while the font loads, and preload the critical face only when it styles above-the-fold content.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Fonts load from the same origin as WOFF2, `font-display: swap` declared, and the critical face is preloaded in `<head>`.

#### 76. critical CSS — Recommended (severity: medium)

Requirement: Above-the-fold CSS should be inlined with the rest deferred; render-blocking head resources minimised.
Quote (exact source line):
  Inline the CSS needed for above-the-fold content and defer the rest. Render-blocking resources in \<head\> are the single biggest cause of slow first paint.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Check `<head>` — above-fold styles inlined or few blocking stylesheets; run Lighthouse "Eliminate render-blocking resources" with no head-blocking CSS for below-fold styles.

#### 77. script loading — Recommended (severity: medium)

Requirement: Scripts must use the right loading attribute (defer/async/type=module); a bare synchronous script in head is always wrong.
Quote (exact source line):
  Choose the right script-loading attribute for every \<script\>: defer for app code, async for independent third-party, type=module for modern code. Bare \<script\> in \<head\> is always wrong.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <page-url> | grep -o '<script[^>]*>'` — no bare synchronous `<script src>` inside `<head>`; defer/async/type=module used deliberately.

#### 78. HTTP/2 and HTTP/3 — Recommended (severity: medium)

Requirement: The site should be served over HTTP/2 at minimum, HTTP/3 where possible.
Quote (exact source line):
  Serve over HTTP/2 at minimum and HTTP/3 where you can. Multiplexing eliminates head-of-line blocking; QUIC removes TCP handshake delays.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -sI --http2 <origin>` negotiates HTTP/2; `curl -sI --http3 <origin>` (where supported) negotiates HTTP/3.

#### 79. back/forward cache — Recommended (severity: medium)

Requirement: Pages should stay BFCache-eligible so back/forward navigation restores instantly.
Quote (exact source line):
  Keep pages BFCache-eligible so back/forward navigation restores them instantly from memory, with no reload, no hydration, and no repaint.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Chrome DevTools bfcache check / observe back-navigation (no full reload); HTML responses avoid `Cache-Control: no-store` and pages avoid `unload` handlers.

#### 80. HTTP/1.1 workarounds — Avoid (severity: medium)

Requirement: HTTP/1.1-era workarounds (domain sharding, image sprites) should be dropped.
Quote (exact source line):
  Domain sharding and image sprites were workarounds for HTTP/1.1's connection limit; under HTTP/2 and HTTP/3 they hurt — drop them. Bundling is the nuanced one: stop concatenating to cut requests, start doing it to cut bytes.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect resource hosts — no asset domains sharded purely for connection limits; no image sprite sheets serving icon sets.

## Privacy

#### 81. privacy policy — Required (severity: high)

Requirement: A privacy policy must state what personal data is collected, why, on what legal basis, with whom it's shared, retention, and user rights.
Quote (exact source line):
  A privacy policy tells visitors what personal data you collect, why, on what legal basis, who you share it with, how long you keep it, and what rights they have.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Follow the footer privacy-policy link — the page covers data types, purpose, legal basis, sharing, retention, and user rights.

#### 82. cookie consent — Required (severity: high)

Requirement: Non-essential cookies and similar storage must not be set before freely given, informed, specific, unambiguous opt-in consent (EU/UK).
Quote (exact source line):
  In the EU and UK, non-essential cookies and similar storage require freely given, informed, specific, and unambiguous opt-in consent before they are set.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Load the site with storage cleared and network log open — no non-essential cookies/tracking requests fire before opt-in; the banner offers a genuine reject as easy as accept.

#### 83. Global Privacy Control — Recommended (severity: medium)

Requirement: The Global Privacy Control signal should be honoured.
Quote (exact source line):
  Global Privacy Control is a browser-level signal that tells websites the user opts out of the sale or sharing of their personal data. California and Colorado require sites to honour it.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Request with `Sec-GPC: 1` — the site's behaviour/cookies reflect the opt-out (and/or `/.well-known/gpc.json` declares awareness).

#### 84. third-party scripts — Recommended (severity: medium)

Requirement: Third-party scripts should be audited, justified, and locked down.
Quote (exact source line):
  Every script loaded from another domain can read cookies, see the URL, and exfiltrate data from your page. Audit them, justify them, and lock them down.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inventory cross-origin scripts in the network log — each maps to a stated purpose and is constrained by CSP/SRI.

#### 85. privacy-respecting analytics — Recommended (severity: medium)

Requirement: Analytics should be aggregate, cookieless, and/or EU-hosted rather than surveillance-based.
Quote (exact source line):
  You can measure traffic without surveilling visitors. Aggregate, cookieless, EU-hosted analytics tools answer most product questions without the consent and transfer problems of ad-tech analytics.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect analytics beacons — cookieless/aggregate (no identifying Set-Cookie on analytics requests) or fully consent-gated.

#### 86. data minimisation — Recommended (severity: medium)

Requirement: Only personal data actually needed for a specific purpose should be collected, kept only as long as needed, and redacted where it leaks unnecessarily.
Quote (exact source line):
  Collect only the personal data you actually need for a specific purpose, keep it only as long as you need it, and redact it from anywhere it leaks unnecessarily.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Review forms and URLs — no unnecessary PII fields, no email/PII in query strings or client-side storage beyond need.

## Resilience

#### 87. custom error pages — Required (severity: high)

Requirement: Custom error pages must return the correct HTTP status, explain the problem in plain language, and offer a way forward without leaking implementation details.
Quote (exact source line):
  Custom error pages must return the correct HTTP status code, explain what went wrong in plain language, and offer the user a way forward without leaking implementation details.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s -i <origin>/no-such-page-<random>` — status 404 with a branded, plain-language page, navigation/search offered, and no stack traces.

#### 88. maintenance pages and 503 — Recommended (severity: medium)

Requirement: Intentional downtime should return 503 with Retry-After and a page explaining what's happening.
Quote (exact source line):
  When the site is intentionally offline, return HTTP 503 with a Retry-After header and a page that tells users what is happening and when to come back.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Only observable during an outage — check the status page / incident history, or probe during planned maintenance for `503` + `Retry-After`.

#### 89. graceful degradation — Recommended (severity: medium)

Requirement: Core content and primary navigation should keep working when JavaScript fails to load or throws.
Quote (exact source line):
  Core content and primary navigation should keep working when JavaScript fails to load or throws — treat client-side scripts as an enhancement, not the delivery mechanism.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Browse key pages with JavaScript disabled (DevTools) — content readable and primary navigation usable as plain links.

#### 90. web app manifest — Recommended (severity: medium)

Requirement: A web app manifest should describe install behaviour (name, icons, start URL, theme colour, display mode).
Quote (exact source line):
  A web app manifest is a small JSON file that tells browsers how the site should appear when installed — its name, icons, start URL, theme colour, and display mode.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s <manifest-url>` (from `<link rel="manifest">`) — valid JSON with name, icons, start_url, display.

#### 91. monitoring and uptime — Recommended (severity: medium)

Requirement: The site should be monitored externally with a status page on a separate host.
Quote (exact source line):
  Monitor the site from outside your own infrastructure, combine synthetic checks with real user data, and run a status page on a separate host so it stays up when the site does not.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Look for a public status page on a separate host (footer link or `status.<domain>`) — presence is the externally observable part; internal monitoring cannot be verified read-only.

#### 92. IPv6 reachability — Recommended (severity: medium)

Requirement: The site should be reachable over IPv6 with AAAA records that serve the same site as IPv4.
Quote (exact source line):
  Publish AAAA records for the web server and the authoritative name servers, make sure every IPv6 address actually answers, and serve the same site over IPv6 as over IPv4.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `dig AAAA <host>` returns addresses and `curl -6 -sI https://<host>/` serves the same site as IPv4.

## Internationalisation

#### 93. international URL structure — Recommended (severity: medium)

Requirement: Multilingual/multi-regional content should use a single consistent URL pattern.
Quote (exact source line):
  Pick a single URL pattern for multilingual or multi-regional content — country-code top-level domain, subdomain, or subdirectory — and stick with it. Optionally localise the slugs too.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: List locale variants of the same page — they all follow one pattern (ccTLD / subdomain / subdirectory), not a mix.

#### 94. hreflang — Recommended (severity: medium)

Requirement: hreflang alternates must use BCP 47 codes and be reciprocal across all versions.
Quote (exact source line):
  hreflang tells search engines which language or regional version of a page to show to which user. It uses BCP 47 codes and must be reciprocal across all alternates.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Crawl each locale's page — hreflang cluster uses valid BCP 47 codes and every alternate links back reciprocally (including x-default).

#### 95. localised page metadata — Recommended (severity: medium)

Requirement: Localised pages should translate head and structured-data strings (title, description, OG, JSON-LD, alt text), not just the body.
Quote (exact source line):
  Translate every visible string in the head and in structured data — title, meta description, Open Graph fields, JSON-LD names and descriptions, image alt text — not just the body. A localised body with English metadata is a half-translation.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: On a non-English page, inspect title/description/OG tags/JSON-LD/alt text — all translated, no English leftovers.

#### 96. automatic IP-based language redirects — Avoid (severity: high)

Requirement: Visitors must not be automatically redirected to a locale based on IP geolocation or Accept-Language.
Quote (exact source line):
  Automatically redirecting visitors to a locale based on IP geolocation or Accept-Language is an anti-pattern. It traps users in the wrong language, breaks search crawlers, and breaks shared links. Let users choose.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -H 'Accept-Language: de' <origin>/` (and from a second region/VPN) — no forced locale redirect; a language *choice* is offered instead.

#### 97. lang attribute on inline content — Required (severity: high)

Requirement: Inline content in a different language than the document must carry its own lang attribute.
Quote (exact source line):
  Mark passages, phrases, and inline elements that differ from the document language with a lang attribute. WCAG 3.1.2 requires it so assistive tech can switch pronunciation.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Spot-check foreign-language passages, quotes, and brand terms on sampled pages — each carries its own `lang` attribute.

#### 98. language switcher — Recommended (severity: medium)

Requirement: A language switcher should list each locale in its own language with the right lang attribute, without using flags.
Quote (exact source line):
  List each locale in its own language ('Deutsch', '日本語', 'العربية') and mark it with the right lang attribute. Don't use flags — flags are countries, not languages.
Source: .zflow/evidence/specweb/meta/checklist.md
Verify: Inspect the language switcher — locale names in their own language with `lang` attributes; no flag icons representing languages.

---

## Site Skills (as published by specification.website)

1. **Agent Skill — `specification-website`**: a `skill-md` skill served at `/.well-known/agent-skills/specification-website/SKILL.md` with sha256 digest `7070db105de9efc80aecd3cf5ccf3c232da7116dd182f022ea20e38631127dcd` (agent-skills-index.json); its purpose is to query and apply The Website Specification when auditing a URL or deciding what a site should have, with answers backed by primary sources (site-skill.md).
2. **MCP server — `specification-website` v0.2.0 "The Website Specification"**: endpoint `https://mcp.specification.website/mcp`; transport `http`; authentication `none`; protocol version 2026-07-28 (supported: 2026-07-28, 2025-11-25, 2025-06-18, 2025-03-26); capabilities: tools, prompts (no resources); tools: `search`, `list_topics`, `get_topic`, `get_checklist`, `get_categories`, `get_changes`; prompt: `audit_url`; vendor Joost de Valk; license MIT (code) / CC-BY-4.0 (content) (mcp-server-card.json).
3. **OKF bundle — okf_version 0.2**: an Open Knowledge Format index of 177 checks across the 10 categories derived from specification.website, with a `references/` directory mirroring every cited external standard and `log.md` as the change log; content CC BY 4.0, canonical pages at specification.website/spec/ (okf-index.md). Note: the local files never name the tarball file `okf.tar.gz` — that filename comes from the task brief, not from the evidence.

## Checklist Notes (how the site's own checklist organises the spec)

1. The checklist condenses the whole spec into ten category blocks, in this order: Foundations, SEO, Accessibility, Security, Well-Known URIs, Agent Readiness, Performance, Privacy, Resilience, Internationalisation — each block opens with a one-line intro and holds one checkbox item per spec page.
2. Every item is a checkbox linking to its spec page and tagged with one of four statuses — Required, Recommended, Optional, or Avoid — which the site treats as the audit bar: required = "the platform breaks without it", recommended = "a modern site should do it", optional = context-dependent, avoid = "if a site does one of these, flag it" (site-skill.md, "Statuses — the contract"; it also warns auditors to never silently upgrade recommended to required).
3. The fetched checklist contains exactly 177 items, matching the "177 pages" figure in site-skill.md: Foundations 20, SEO 14, Accessibility 30, Security 23, Well-Known URIs 13, Agent Readiness 22, Performance 26, Privacy 7, Resilience 9, Internationalisation 13.
4. The site's own audit workflow is status-first: pull the checklist filtered to `status: "required"` and verify each item, adding `status: "recommended"` for deeper audits; the `audit_url` MCP prompt generates a per-URL audit plan (site-skill.md, "Common workflows").
5. Distillation coverage: all 36 Required and all 6 Avoid items are included above; Recommended items included are those observable on public consumer surfaces. Excluded Recommended items are build-technique items (Popover API, anchor positioning, text-wrap, container queries, invoker commands, inert attribute, ARIA-first-rule, CSS state selectors, native interactive elements, forced-colors, hidden-until-found, dragging movements, speculation rules, view transitions, visibility-aware rendering, CSS containment, scroll-driven animations, scrollbar-gutter, dynamic viewport units, resource-hints overview, theme-color, feed discovery/hygiene, sitemap index, image sitemaps, IndexNow, Vary, No-Vary-Search, Early Hints, compression dictionary transport, Server-Timing, Reporting API, Fetch Metadata, COOP/COEP/CORP, Trusted Types, digest fields, Clear-Site-Data, DNS CAA, RPKI, DNSSEC, DANE, Redirect-By, Deprecation/Sunset, offline service worker, WebSub, contrast-color()) — consult checklist.md when the target site's context makes them relevant.
6. Optional items are conditional on site features and were excluded from requirements: account/auth well-knowns (change-password, webauthn, openid-configuration, oauth-authorization-server, oauth-protected-resource, gpc.json, storage access), feed items, and emerging agent conventions (llms-full.txt, Content Signals, TDMRep, Web Bot Auth, auth.md, MCP tool discovery, A2A cards, DNS-AID, ARD, NLWeb, WebMCP, OKF bundle, Schemamap) — the checklist marks each with the condition under which it applies.
