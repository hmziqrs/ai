# Foundations — distilled audit requirements

Distilled from the 20 raw pages of the foundations section of specification.website
(`.zflow/evidence/specweb/foundations/`). Each block is one checkable practice for a
consumer-facing (public marketing / content / self-service) website, with a verbatim
one-line quote from the source page, a read-only verification method, and a severity
for a consumer-facing failure.

---

## The HTML doctype (doctype.md)

### F-01 — Doctype as the first bytes of every page
- **Requirement:** Every HTML document the site serves must begin with `<!doctype html>` as its very first bytes — no blank line, comment, or BOM before it — so the page renders in standards mode rather than quirks mode.
- **Quote:**
```
> Every HTML document must start with <!doctype html> as its first line. This opts the browser into standards mode; without it, you get quirks mode and broken layout.
```
- **Source:** .zflow/evidence/specweb/foundations/doctype.md
- **Verify:** `curl -s https://example.com/ | head -c 20` — output must begin with `<!doctype html>` (case-insensitive); in DevTools, `document.compatMode` must return `"CSS1Compat"`, not `"BackCompat"`.
- **Severity:** high

### F-02 — Doctype on error pages and secondary surfaces
- **Requirement:** Error pages (404, 500), print views, redirect destinations, and other secondary HTML responses must carry the doctype just like normal pages.
- **Quote:**
```
- Sending the doctype only on some pages — error pages, print views, and embedded iframes need it too.
```
- **Source:** .zflow/evidence/specweb/foundations/doctype.md
- **Verify:** `curl -s https://example.com/nonexistent-page-test | head -c 20` still starts with `<!doctype html>`.
- **Severity:** medium

---

## The lang attribute (html-lang.md)

### F-03 — Valid BCP 47 lang on `<html>`
- **Requirement:** The root `<html>` element must carry a valid BCP 47 language tag (e.g. `en`, `en-GB`, `pt-BR`, `zh-Hant`), never a made-up value like `english` or `us`.
- **Quote:**
```
> Set a valid BCP 47 language tag on the <html> element so screen readers, translators, search engines, and browsers know what language the page is in.
```
- **Source:** .zflow/evidence/specweb/foundations/html-lang.md
- **Verify:** `curl -s https://example.com/ | grep -oiE '<html[^>]*lang="[^"]+"'` returns a well-formed BCP 47 tag; run an axe or Lighthouse accessibility audit, which flags missing or invalid `lang`.
- **Severity:** high

### F-04 — lang matches the actual content language
- **Requirement:** The declared `lang` must match the page's actual content language, and every translated locale must carry its own value rather than a copied boilerplate `lang="en"`.
- **Quote:**
```
- View source: confirm `<html lang="...">` is present and matches the actual content language.
```
- **Source:** .zflow/evidence/specweb/foundations/html-lang.md
- **Verify:** Fetch each locale's HTML (`curl -s https://example.com/fr/ | grep -oi 'lang="[^"]*"' | head -1`) and confirm the tag matches the visible content language of that page.
- **Severity:** medium

### F-05 — RTL pages pair lang with dir
- **Requirement:** Pages written in right-to-left scripts (Arabic, Hebrew, etc.) must pair `lang` with `dir="rtl"` on the `<html>` element.
- **Quote:**
```
For right-to-left scripts (Arabic, Hebrew), pair `lang` with `dir`:
```
- **Source:** .zflow/evidence/specweb/foundations/html-lang.md
- **Verify:** On pages whose `lang` is an RTL language (ar, he, fa, ur), `curl -s <url> | grep -oE '<html[^>]*>'` shows `dir="rtl"`.
- **Severity:** medium

---

## meta charset (meta-charset.md)

### F-06 — UTF-8 declared within the first 1024 bytes
- **Requirement:** Every HTML page must declare `<meta charset="utf-8">` with the entire meta element inside the first 1024 bytes of the response; anything later is ignored.
- **Quote:**
```
> Declare UTF-8 as the document character encoding in the first 1024 bytes of the HTML, so browsers parse text correctly before they hit any non-ASCII content.
```
- **Source:** .zflow/evidence/specweb/foundations/meta-charset.md
- **Verify:** `curl -s https://example.com/ | head -c 1024 | grep -i '<meta charset'` finds the declaration; DevTools `document.characterSet` returns `"UTF-8"`.
- **Severity:** high

### F-07 — Charset first in head, before title
- **Requirement:** The charset meta must be the first child of `<head>`, before `<title>` or any element that could contain non-ASCII text.
- **Quote:**
```
Put the charset declaration as the very first child of `<head>`, before `<title>` or any other tag that could contain non-ASCII text:
```
- **Source:** .zflow/evidence/specweb/foundations/meta-charset.md
- **Verify:** `curl -s https://example.com/ | grep -oE '<meta charset[^>]*>|<title' | head -2` lists the meta charset before the title.
- **Severity:** medium

### F-08 — Content-Type header agrees on UTF-8
- **Requirement:** The HTTP response must set `Content-Type: text/html; charset=utf-8`, and the header must agree with (not contradict) the meta declaration.
- **Quote:**
```
Also set the HTTP `Content-Type` header on the response. The header takes precedence over the meta tag, so if they conflict, the header wins:
```
- **Source:** .zflow/evidence/specweb/foundations/meta-charset.md
- **Verify:** `curl -sI https://example.com/ | grep -i '^content-type:'` shows `charset=utf-8`.
- **Severity:** medium

---

## meta viewport (meta-viewport.md)

### F-09 — Viewport tag on every page
- **Requirement:** Every HTML page (not just some templates) must include `<meta name="viewport" content="width=device-width, initial-scale=1">` in `<head>`.
- **Quote:**
```
<meta name="viewport" content="width=device-width, initial-scale=1" />
```
- **Source:** .zflow/evidence/specweb/foundations/meta-viewport.md
- **Verify:** `curl -s https://example.com/ | grep -i 'name="viewport"'` returns the tag containing `width=device-width, initial-scale=1`; Lighthouse flags a missing viewport tag.
- **Severity:** high

### F-10 — Never disable pinch-zoom
- **Requirement:** The viewport tag must never disable user zooming — no `user-scalable=no` and no `maximum-scale=1` (a WCAG 1.4.4 failure).
- **Quote:**
```
`user-scalable=no` and `maximum-scale=1` prevent users from pinch-zooming. For anyone with low vision who needs to magnify text — and that is a significant fraction of users — this turns a usable page into an unusable one. It also fails WCAG 1.4.4. There is no good reason to disable zoom on a content site.
```
- **Source:** .zflow/evidence/specweb/foundations/meta-viewport.md
- **Verify:** `curl -s https://example.com/ | grep -iE 'user-scalable *= *no|maximum-scale'` returns nothing; pinch-to-zoom works on a real phone; Lighthouse flags zoom-disabling viewports.
- **Severity:** high

---

## title element (title.md)

### F-11 — Exactly one non-empty title in head
- **Requirement:** Every page must have exactly one non-empty `<title>` element inside `<head>` (a WCAG 2.4.2 Level A failure when missing).
- **Quote:**
```
> Every HTML document must have exactly one non-empty <title> element inside <head>. It names the page for browsers, search engines, screen readers, social previews, and AI agents. It is not the same thing as the page's <h1>.
```
- **Source:** .zflow/evidence/specweb/foundations/title.md
- **Verify:** `curl -s https://example.com/ | grep -ic '<title'` equals 1 and the element contains non-whitespace text inside `<head>`.
- **Severity:** high

### F-12 — Title rendered server-side, not via JS
- **Requirement:** Titles must be present in the raw server-rendered HTML, not set by JavaScript after first paint (crawlers and social scrapers may not run JS).
- **Quote:**
```
- Titles set in JavaScript after first paint — search crawlers and social scrapers may not run JS.
```
- **Source:** .zflow/evidence/specweb/foundations/title.md
- **Verify:** `curl -s https://example.com/ | grep -i '<title'` shows the full title in the raw response with no JS executed.
- **Severity:** medium

### F-13 — Titles unique per page, page-specific part first
- **Requirement:** Titles must be unique per page, written page-specific first and site name second (target ~50–60 characters), because identical titles signal duplicates.
- **Quote:**
```
- **One per page, unique per page.** Two pages with the same title is a quality signal that they are duplicates.
```
- **Source:** .zflow/evidence/specweb/foundations/title.md
- **Verify:** Crawl a sample of pages and compare `<title>` values — any duplicate is a failure; spot-check that the unique part precedes the site name.
- **Severity:** medium

---

## meta description (meta-description.md)

### F-14 — One non-empty description, 120–160 characters
- **Requirement:** Every page must carry one non-empty `<meta name="description">` written specifically for that page, targeting 120–160 characters.
- **Quote:**
```
- **120–160 characters** is the sweet spot. Google typically truncates around 920 pixels on desktop, roughly 155–160 characters.
```
- **Source:** .zflow/evidence/specweb/foundations/meta-description.md
- **Verify:** `curl -s https://example.com/ | grep -i 'name="description"'` returns a non-empty description; measure its content length (roughly 120–160 chars).
- **Severity:** medium

### F-15 — Descriptions unique per page
- **Requirement:** Descriptions must be unique per page — the same description on multiple pages is a duplicate-content signal.
- **Quote:**
```
- **One per page.** Two pages with the same description is a duplicate-content signal.
```
- **Source:** .zflow/evidence/specweb/foundations/meta-description.md
- **Verify:** Crawl a sample of pages, hash each description content, and flag any duplicates.
- **Severity:** low

---

## canonical URL (canonical-url.md)

### F-16 — Self-referencing canonical on every public page
- **Requirement:** Every public HTML page must carry exactly one self-referencing `<link rel="canonical">`, rendered server-side (never generated client-side from `window.location` only).
- **Quote:**
```
Put a **self-referencing canonical** on every public HTML page. Even pages without duplicates benefit: it removes ambiguity for query-string variants and short-circuits any scraper that copies the page.
```
- **Source:** .zflow/evidence/specweb/foundations/canonical-url.md
- **Verify:** `curl -s https://example.com/page | grep -i 'rel="canonical"'` returns exactly one tag whose href equals the page's clean URL, present in the raw HTML without JS.
- **Severity:** medium

### F-17 — Canonical is absolute and scheme-matched
- **Requirement:** Canonical URLs must be absolute — scheme (`https://`) and host included — matching the scheme actually served.
- **Quote:**
```
- **Use absolute URLs.** Include the scheme (`https://`) and host. Relative canonicals are allowed by the spec but more error-prone; absolute is the safer default.
```
- **Source:** .zflow/evidence/specweb/foundations/canonical-url.md
- **Verify:** Extract the canonical href and confirm it starts with `https://` and its host matches the host actually serving the page.
- **Severity:** medium

### F-18 — Tracking parameters stripped from canonical
- **Requirement:** Canonicals must strip tracking parameters — the canonical of `/page?utm_source=newsletter` is `/page`.
- **Quote:**
```
- **Strip tracking parameters** from the canonical. The canonical of `/page?utm_source=newsletter` is `/page`.
```
- **Source:** .zflow/evidence/specweb/foundations/canonical-url.md
- **Verify:** `curl -s 'https://example.com/page?utm_source=test' | grep -i 'rel="canonical"'` points at the parameter-free URL.
- **Severity:** medium

### F-19 — Pagination canonicalises to itself
- **Requirement:** Paginated archive pages must canonicalise to themselves, never to page 1, and no page's canonical may point at the homepage.
- **Quote:**
```
- Canonicalising paginated archives (`?page=2`) to page 1. Each pagination page is distinct content; let them index normally.
```
- **Source:** .zflow/evidence/specweb/foundations/canonical-url.md
- **Verify:** `curl -s 'https://example.com/blog?page=2' | grep -i 'rel="canonical"'` keeps `?page=2` in the href.
- **Severity:** medium

### F-20 — Canonical target returns 200 directly
- **Requirement:** Every canonical target must return 200 OK directly, not a redirect.
- **Quote:**
```
- Crawl the site and list canonical targets. Every target should return 200 OK, not a redirect.
```
- **Source:** .zflow/evidence/specweb/foundations/canonical-url.md
- **Verify:** `curl -sI <canonical-href>` (without `-L`) returns `HTTP/... 200`.
- **Severity:** medium

---

## favicons and app icons (favicons.md)

### F-21 — Full icon set wired in head
- **Requirement:** The site must ship a full icon set — SVG favicon, ICO fallback, apple-touch-icon, and manifest icons including a maskable variant — wired up with `<link>` tags in `<head>`.
- **Quote:**
```
> Ship an SVG favicon, an ICO fallback at /favicon.ico, an apple-touch-icon, and a maskable PWA icon. Five files cover every browser and home-screen surface.
```
- **Source:** .zflow/evidence/specweb/foundations/favicons.md
- **Verify:** `curl -s https://example.com/ | grep -iE 'rel="icon"|apple-touch-icon|rel="manifest"'` shows the link tags, and each referenced URL returns 200.
- **Severity:** medium

### F-22 — /favicon.ico returns 200 at the root
- **Requirement:** `/favicon.ico` must return 200 at the site root even when explicit link tags point elsewhere, because browsers and crawlers request it regardless.
- **Quote:**
```
Even with explicit `<link rel="icon">` tags, browsers and crawlers still request `/favicon.ico` from the site root. Always serve a real ICO at that path. A 404 there shows up in every server log forever.
```
- **Source:** .zflow/evidence/specweb/foundations/favicons.md
- **Verify:** `curl -sI https://example.com/favicon.ico` returns 200.
- **Severity:** medium

### F-23 — apple-touch-icon is a 180×180 PNG
- **Requirement:** The apple-touch-icon must be a 180×180 PNG sized for iOS home screens (iOS does not honour the SVG favicon there).
- **Quote:**
```
3. **`/apple-touch-icon.png`** — 180×180 PNG used by iOS when the user adds the site to their home screen. iOS does not honour the SVG favicon for home screens.
```
- **Source:** .zflow/evidence/specweb/foundations/favicons.md
- **Verify:** Download the file referenced by `rel="apple-touch-icon"` and check with `file` or `sips -g pixelWidth -g pixelHeight` that it is a 180×180 PNG.
- **Severity:** low

### F-24 — Maskable manifest icon declared
- **Requirement:** The web app manifest must declare a 512×512 maskable icon entry (`"purpose": "maskable"`) with the important content inside an 80% safe zone.
- **Quote:**
```
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
```
- **Source:** .zflow/evidence/specweb/foundations/favicons.md
- **Verify:** `curl -s https://example.com/site.webmanifest | grep -i maskable` shows a maskable icon entry with sizes 512x512.
- **Severity:** low

---

## theme-color (theme-color.md)

### F-25 — Light and dark theme-color via media
- **Requirement:** Pages must set `<meta name="theme-color">` with one value for light mode and one for dark mode via the `media` attribute.
- **Quote:**
```
> Tints the browser chrome and OS surfaces to match your brand. Use the media attribute to ship one colour for light mode and another for dark mode.
```
- **Source:** .zflow/evidence/specweb/foundations/theme-color.md
- **Verify:** `curl -s https://example.com/ | grep -i 'name="theme-color"'` returns tags with `media="(prefers-color-scheme: light)"` and `media="(prefers-color-scheme: dark)"`.
- **Severity:** low

### F-26 — theme-color is opaque
- **Requirement:** theme-color values must be opaque colours — no alpha-channel hex values.
- **Quote:**
```
- Putting hex values with alpha (`#0b1020aa`). Browsers ignore the alpha channel; use an opaque colour.
```
- **Source:** .zflow/evidence/specweb/foundations/theme-color.md
- **Verify:** Inspect each theme-color content value — none is an 8-digit hex (#RRGGBBAA).
- **Severity:** low

---

## color-scheme (color-scheme.md)

### F-27 — color-scheme in both meta and CSS
- **Requirement:** Pages must declare `color-scheme` both as the `<meta name="color-scheme" content="light dark">` document default (pre-paint) and as the `:root` CSS property.
- **Quote:**
```
Ship both. The meta tag takes effect before any stylesheet parses, so it prevents the white flash dark-mode users would otherwise see during page load. The CSS property is the authoritative source once styles arrive, and lets you scope schemes to subtrees if you ever need to.
```
- **Source:** .zflow/evidence/specweb/foundations/color-scheme.md
- **Verify:** `curl -s https://example.com/ | grep -i 'name="color-scheme"'` returns the meta tag, and the stylesheet contains a `color-scheme` declaration on `:root`; DevTools `getComputedStyle(document.documentElement).colorScheme` returns the set value.
- **Severity:** low

### F-28 — Never use "only dark"
- **Requirement:** color-scheme must never use the invalid `only dark` value; valid values are `normal`, `light`, `dark`, `light dark`, `dark light`, and `only light`.
- **Quote:**
```
The valid values for the `content` attribute are `normal`, `light`, `dark`, `light dark`, `dark light`, and `only light`. List the preferred scheme first; the others are acceptable fallbacks. `only dark` is explicitly not allowed by the HTML spec — there is no way to forbid light mode, because forcing a page into dark mode the page wasn't built for produces unreadable contrast.
```
- **Source:** .zflow/evidence/specweb/foundations/color-scheme.md
- **Verify:** `curl -s https://example.com/ | grep -i 'only dark'` returns nothing.
- **Severity:** low

---

## Open Graph (open-graph.md)

### F-29 — Core OG tags with property= syntax
- **Requirement:** Every page must set `og:title`, `og:description`, `og:image`, `og:url`, and `og:type` (plus `og:site_name`) using the `property=` attribute, not `name=`.
- **Quote:**
```
> Open Graph tags control how pages look when shared on social platforms and chat apps. Set og:title, og:description, og:image, og:url, and og:type on every page.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -s https://example.com/ | grep -i 'property="og:'` returns all five core tags; `curl -s https://example.com/ | grep -i 'name="og:'` returns none.
- **Severity:** medium

### F-30 — og:image on a stable, controlled HTTPS URL
- **Requirement:** `og:image` must be an absolute HTTPS URL on a stable host the site controls, fetchable with no cookies — no third-party image host, no expiring signed CDN URL, no login wall or bot blocking.
- **Quote:**
```
- **Host it on a stable, branded URL you control.** Serve `og:image` from your own domain (or a branded asset subdomain), not a third-party image host or a signed CDN URL that expires. Platforms cache the card and re-fetch the image later, so the URL has to stay put and stay public: the crawler fetches with no cookies, so a login wall, hotlink/referer protection, or bot blocking makes the image silently disappear from the preview.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -sI <og:image-url>` returns HTTPS 200 directly (not a redirect to a login page), and the image host matches the site's own domain.
- **Severity:** medium

### F-31 — og:image under 300 KB
- **Requirement:** The og:image file must stay under 300 KB — the size at which WhatsApp drops the preview entirely.
- **Quote:**
```
- File size under 5 MB across most platforms, but **WhatsApp drops the preview entirely if the image is over 300 KB** — and WhatsApp is one of the most-used unfurlers on the planet. Treat 300 KB as the real ceiling.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -sI <og:image-url> | grep -i content-length` shows ≤ 300000 bytes (or `curl -s <og:image-url> | wc -c`).
- **Severity:** medium

### F-32 — og:image is PNG/JPEG/WebP, never AVIF
- **Requirement:** og:image must be served as PNG, JPEG, or WebP — never AVIF, which most unfurlers silently drop.
- **Quote:**
```
- **Format: PNG or JPEG is the safe universal choice.** WebP is now accepted by virtually every modern unfurler (Facebook, LinkedIn, Discord, iMessage, Slack, Mastodon, Bluesky, X, WhatsApp) and is a good pick when you need to stay under WhatsApp's 300 KB cap on a denser image. AVIF is *not* yet safe — only Facebook, Threads, Pinterest, and WhatsApp render AVIF previews today; the rest will silently drop them. If your CMS auto-converts uploads to AVIF, force the `og:image` URL to stay PNG/JPEG/WebP.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -sI <og:image-url> | grep -i '^content-type:'` is `image/png`, `image/jpeg`, or `image/webp` — not `image/avif`.
- **Severity:** medium

### F-33 — og:image dimensions declared and correct
- **Requirement:** `og:image:width` and `og:image:height` must be declared and match the real file, sized 1200×630 (1.91:1) or 1200×675 (16:9).
- **Quote:**
```
- Declare `og:image:width` and `og:image:height`. Some platforms refuse to use images they cannot pre-size.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** Compare the declared dimensions with the actual file (`sips -g pixelWidth -g pixelHeight` after download); confirm the image is 1200 px wide at a 1.91:1 or 16:9 ratio.
- **Severity:** low

### F-34 — twitter:card summary_large_image
- **Requirement:** Pages must set `twitter:card` to `summary_large_image` so previews show the full-width image instead of a small thumbnail.
- **Quote:**
```
If you skip the Twitter Card tags, X will fall back to your OG tags, which is fine. The one extra value worth adding is `twitter:card` set to `summary_large_image` so the preview shows the full-width image instead of a small thumbnail.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -s https://example.com/ | grep -i 'twitter:card'` returns `summary_large_image`.
- **Severity:** low

### F-35 — og:url matches canonical
- **Requirement:** `og:url` must match the page's canonical URL — the two must agree.
- **Quote:**
```
- `og:url` that does not match the canonical URL. The two should agree.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** Extract `og:url` and the `link[rel=canonical]` href from the same page response and compare — they must be equal.
- **Severity:** medium

### F-36 — OG tags within the first 32 KB
- **Requirement:** OG tags must appear within the first 32 KB of the HTML, above any large inline CSS/script blocks, because Slackbot only fetches that much with a Range request.
- **Quote:**
```
- Burying OG tags below 32 KB of inline CSS or scripts in the `<head>`. Slackbot only fetches the first 32 KB with a `Range` request; meta tags past that cut-off are never seen and the link silently fails to unfurl. Put OG tags near the top of `<head>`, above any large inline blocks.
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** `curl -s -r 0-32767 https://example.com/ | grep -c 'property="og:'` equals the count from a full page fetch.
- **Severity:** medium

### F-37 — og:locale on multilingual pages
- **Requirement:** Multilingual pages must declare `og:locale` and `og:locale:alternate` in the underscored `language_TERRITORY` form (not BCP 47 hyphenated).
- **Quote:**
```
**Locale tags for multilingual sites.** If your page has translated versions, declare them with `og:locale` (this page) and `og:locale:alternate` (every other locale). Use the underscored `language_TERRITORY` form, not the BCP 47 hyphenated form used by `lang` and `hreflang`:
```
- **Source:** .zflow/evidence/specweb/foundations/open-graph.md
- **Verify:** On pages with translated versions, `curl -s <url> | grep -i 'og:locale'` returns underscored values (e.g. `en_GB`), one per locale.
- **Severity:** low

---

## Feed discovery (feed-discovery.md)

### F-38 — Feed announced with rel="alternate"
- **Requirement:** If the site publishes a feed (RSS, Atom, or JSON Feed), HTML pages must announce it with `<link rel="alternate">` plus a specific `title` in `<head>`.
- **Quote:**
```
> If your site publishes a feed — RSS, Atom, or JSON Feed — announce it in <head> with <link rel="alternate">. Feed readers, agents, and browsers discover it without guessing the URL.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-discovery.md
- **Verify:** `curl -s https://example.com/ | grep -i 'rel="alternate"'` returns each declared feed with a title attribute.
- **Severity:** low

### F-39 — Correct feed MIME type
- **Requirement:** Feed alternates must use the correct MIME type — `application/rss+xml`, `application/atom+xml`, or `application/feed+json` — never `text/xml` or `application/xml`.
- **Quote:**
```
- Using `type="text/xml"` or `application/xml` for an RSS feed. Some readers ignore it.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-discovery.md
- **Verify:** Inspect the `type` attribute of each feed alternate link; it must match the format actually served at the href.
- **Severity:** low

### F-40 — Feed URL reachable and valid
- **Requirement:** Every declared feed URL must return 200 (not 404 or a redirect) and pass the W3C feed validator.
- **Quote:**
```
- Linking to a feed that 404s, redirects, or fails validation. Run `https://validator.w3.org/feed/` on every feed URL before shipping.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-discovery.md
- **Verify:** `curl -sI <feed-url>` returns 200 directly; paste the URL into https://validator.w3.org/feed/ and expect a clean pass.
- **Severity:** medium

---

## Feed hygiene (feed-hygiene.md)

### F-41 — atom:link rel="self" self-identification
- **Requirement:** Feeds must self-identify with `atom:link rel="self"` pointing at the feed's own canonical URL (with the atom namespace declared).
- **Quote:**
```
- **`atom:link rel="self"`** must point at the canonical URL of the feed itself. Both feed validators flag its absence as a warning.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-hygiene.md
- **Verify:** `curl -s https://example.com/feed.xml | grep -i 'rel="self"'` returns a self-link whose href equals the feed URL fetched.
- **Severity:** low

### F-42 — Stable per-item GUID
- **Requirement:** Every feed item must carry a stable `<guid>` (isPermaLink="true" URL or a tag URI) that never changes across rebuilds or deploys.
- **Quote:**
```
- **`<guid isPermaLink="true">`** is the simplest correct form when the URL never changes. If the URL is unstable, use `isPermaLink="false"` with a tag URI: `<guid isPermaLink="false">tag:example.com,2026:post/123</guid>`. Once chosen, **the GUID for an item must never change** — that is the identifier readers key off.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-hygiene.md
- **Verify:** Fetch the feed twice around a deploy and diff `<guid>` values per item — none may change for the same post.
- **Severity:** medium

### F-43 — Declared update cadence
- **Requirement:** Feeds must declare an honest update cadence with `sy:updatePeriod` (hourly/daily/weekly/monthly/yearly) and `sy:updateFrequency` (positive integer per period).
- **Quote:**
```
- **`sy:updatePeriod`** accepts `hourly`, `daily`, `weekly`, `monthly`, `yearly`. `sy:updateFrequency` is a positive integer (count per period). A site updating twice a day declares `<sy:updatePeriod>daily</sy:updatePeriod><sy:updateFrequency>2</sy:updateFrequency>`.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-hygiene.md
- **Verify:** `curl -s <feed-url> | grep -i 'sy:update'` returns valid values consistent with the site's real publishing rhythm.
- **Severity:** low

### F-44 — Consistent feed dates
- **Requirement:** Feed dates must be consistent — `pubDate` never newer than `lastBuildDate`, and no per-item timestamps in the future.
- **Quote:**
```
- Mismatched dates — `pubDate` newer than `lastBuildDate`, or per-item timestamps in the future. Some aggregators silently drop the item.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-hygiene.md
- **Verify:** Parse the feed and compare dates: every pubDate ≤ lastBuildDate and ≤ current time.
- **Severity:** low

### F-45 — RFC 5005 paging on archive feeds
- **Requirement:** Archive feeds must implement RFC 5005 paging with `rel="next"`/`rel="prev"` links so pages past the first stay reachable.
- **Quote:**
```
- **Paging headers (RFC 5005)** keep archive feeds usable. Without `rel="next"`/`rel="prev"`, anything past the first page is invisible to readers that follow links.
```
- **Source:** .zflow/evidence/specweb/foundations/feed-hygiene.md
- **Verify:** `curl -s <feed-url> | grep -i 'rel="next"'` returns the next-page link on paged archive feeds.
- **Severity:** low

---

## Popover API (popover-api.md)

### F-46 — Native popover for non-blocking overlays
- **Requirement:** Non-blocking overlays (menus, share sheets, command palettes, tooltips) should use the native `popover` attribute with `popovertarget` buttons instead of hand-rolled JS overlays.
- **Quote:**
```
> Replace ARIA-puzzled JavaScript modals, menus, and tooltips with a native top-layer primitive that the browser opens, closes, and accessibility-wires for you.
```
- **Source:** .zflow/evidence/specweb/foundations/popover-api.md
- **Verify:** Inspect the DOM for `popover`/`popovertarget` usage; pressing Escape closes an auto popover, clicking outside dismisses it, and focus returns to the trigger.
- **Severity:** low

### F-47 — Manual popovers have a dismiss control
- **Requirement:** `popover="manual"` overlays must include an explicit dismiss control so the user always has a way out.
- **Quote:**
```
- **`popover="manual"` without a dismiss control.** The user has no way out. Auto is the default for a reason.
```
- **Source:** .zflow/evidence/specweb/foundations/popover-api.md
- **Verify:** For every `[popover="manual"]` element in the DOM, confirm a close control exists (e.g. a button with `popovertargetaction="hide"`).
- **Severity:** medium

### F-48 — Popover triggers are real buttons
- **Requirement:** Popover triggers must be real `<button>` elements (not divs with onClick) so focus returns to the trigger on close.
- **Quote:**
```
- **Not testing focus return.** When a popover closes, focus must return to the trigger. The browser does this for you — but only if your trigger is a real `<button>`, not a `<div>` with an onClick.
```
- **Source:** .zflow/evidence/specweb/foundations/popover-api.md
- **Verify:** DOM query `[popovertarget]` — every match is a `<button>`; close a popover and observe focus lands back on the trigger.
- **Severity:** medium

### F-49 — No duplicate ARIA on popovers
- **Requirement:** Popovers must not duplicate ARIA — no `role="dialog"` or `aria-modal` on a popover element.
- **Quote:**
```
- **Duplicating ARIA.** Don't add `role="dialog"` or `aria-modal` to a popover. The accessibility tree already reflects the right semantics.
```
- **Source:** .zflow/evidence/specweb/foundations/popover-api.md
- **Verify:** DOM query `[popover][role="dialog"], [popover][aria-modal]` returns nothing.
- **Severity:** low

### F-50 — Blocking flows use dialog, not popover
- **Requirement:** Blocking flows — confirmations, sign-in dialogs, anything that must block the page — must use `<dialog showModal()>`, not popover.
- **Quote:**
```
- **Reaching for `popover` when you mean `<dialog>`.** Confirmations, sign-in flows, and anything that must block the rest of the page belong in `<dialog showModal()>`. Popovers are non-blocking.
```
- **Source:** .zflow/evidence/specweb/foundations/popover-api.md
- **Verify:** Open a confirmation or sign-in flow and confirm in DevTools that it is a `<dialog>` element, not a popover.
- **Severity:** low

---

## WebSub (websub.md)

### F-51 — Advertise hub and self on feeds
- **Requirement:** If the site publishes a feed, it should advertise a WebSub hub with `rel="hub"` and `rel="self"` on the feed response (HTTP Link headers or elements inside the feed).
- **Quote:**
```
> If you publish a feed, advertise a WebSub hub with rel="hub" and rel="self" so subscribers are pushed each update instead of polling for it. Cuts latency to seconds and removes most of the crawl traffic your feed attracts.
```
- **Source:** .zflow/evidence/specweb/foundations/websub.md
- **Verify:** `curl -sI https://example.com/feed.xml | grep -i '^link:'` shows both `rel="hub"` and `rel="self"`.
- **Severity:** low

### F-52 — rel="self" is the canonical, redirect-free topic URL
- **Requirement:** WebSub `rel="self"` must be the feed's canonical URL returning 200 directly (not a redirect or query-string variant), and in HTML the discovery links belong in `<head>`, never `<body>`.
- **Quote:**
```
`rel="self"` must be the topic's canonical URL — the one you would give in a [`rel="canonical"`](/spec/foundations/canonical-url/) — because that is the identity subscribers key their subscription on. If it disagrees with the URL you actually serve the feed at, subscriptions land on the wrong topic. In HTML, put the link elements in `<head>`; the spec is explicit that `<body>` is unsafe, because injected markup could redirect subscriptions to an attacker's hub.
```
- **Source:** .zflow/evidence/specweb/foundations/websub.md
- **Verify:** Fetch the `rel="self"` URL directly with `curl -sI` — it returns 200, not a redirect; in HTML pages the link elements sit inside `<head>`.
- **Severity:** low

### F-53 — Hub actually pinged on publish
- **Requirement:** The publish flow must actually ping the advertised hub on every update — an advertised-but-never-pinged hub delivers nothing.
- **Quote:**
```
**2. Notify the hub when you publish.** This is the step people forget. The hub has no way to know your feed changed unless you tell it, so your publish flow must ping the hub on every update. A hub that is never pinged delivers nothing.
```
- **Source:** .zflow/evidence/specweb/foundations/websub.md
- **Verify:** Subscribe a test callback to the topic and publish a post — the callback must receive the `hub.challenge` verification GET and then a content POST on the next publish.
- **Severity:** low

---

## CSS anchor positioning (anchor-positioning.md)

### F-54 — Static fallback behind @supports
- **Requirement:** Anchor positioning must be treated as progressive enhancement — gated behind `@supports (anchor-name: --x)` with a usable static fallback for unsupported browsers.
- **Quote:**
```
- **Making it the only mechanism.** Until anchor positioning is universally available, keep a usable static fallback for browsers without support rather than leaving the overlay unpositioned.
```
- **Source:** .zflow/evidence/specweb/foundations/anchor-positioning.md
- **Verify:** View the shipped stylesheet for `@supports (anchor-name: ...)` gating; in a browser without support, the overlay is still reachable and usable in its static position.
- **Severity:** low

### F-55 — position-try-fallbacks declared
- **Requirement:** Anchored elements must declare `position-try-fallbacks` so they flip to a fitting side instead of overflowing the viewport near screen edges.
- **Quote:**
```
- **No fallbacks.** An anchored element with a single fixed side will overflow the viewport near screen edges. Provide `position-try-fallbacks`.
```
- **Source:** .zflow/evidence/specweb/foundations/anchor-positioning.md
- **Verify:** Inspect the CSS of anchored elements for `position-try-fallbacks`; scroll the trigger near a viewport edge and confirm the overlay flips rather than clipping.
- **Severity:** low

### F-56 — Anchored elements are positioned
- **Requirement:** Elements using `position-anchor` or `anchor()` must also set `position: absolute` or `fixed`, or the anchoring does nothing.
- **Quote:**
```
- **Forgetting to position the element.** `position-anchor` and `anchor()` only apply to an element with `position: absolute` or `fixed`. Without it, nothing moves.
```
- **Source:** .zflow/evidence/specweb/foundations/anchor-positioning.md
- **Verify:** Check computed styles of anchored elements — `position-anchor` is always paired with `position: absolute` or `fixed`.
- **Severity:** low

---

## Balanced text wrapping (text-wrap.md)

### F-57 — balance on headings, pretty on prose
- **Requirement:** Headings and short runs should use `text-wrap: balance` and body copy `text-wrap: pretty`, set in the base stylesheet with no feature query needed.
- **Quote:**
```
> Let the browser break headings and body copy intelligently with text-wrap: balance and pretty — no orphaned words, no manual line breaks, no layout shift.
```
- **Source:** .zflow/evidence/specweb/foundations/text-wrap.md
- **Verify:** In DevTools run `getComputedStyle(document.querySelector('h1')).textWrap` (expect `balance`) and on a body paragraph (expect `pretty`); or grep the shipped CSS for `text-wrap`.
- **Severity:** low

### F-58 — pretty scoped to prose, not universal
- **Requirement:** `text-wrap: pretty` must be scoped to prose containers, never a bare `*` or document-wide selector, because it runs an uncapped slower layout algorithm.
- **Quote:**
```
Unlike `balance`, `pretty` is not free: it deliberately trades layout speed for typography, running a slower algorithm with no line cap, so the cost scales with how much text it touches. That is a fine trade for genuine body copy, but think before blanket-applying it to every text node on the page — scope it to your prose containers rather than a bare `*` or `p` selector across the whole document.
```
- **Source:** .zflow/evidence/specweb/foundations/text-wrap.md
- **Verify:** Grep the shipped CSS — `text-wrap: pretty` is attached to prose containers, not a universal selector.
- **Severity:** low

### F-59 — No manual <br> break hacks in headings
- **Requirement:** Manual `<br>` / `&nbsp;` line-break hacks must be removed from headings once text-wrap is adopted.
- **Quote:**
```
- **Keeping old `<br>` hacks.** Manual breaks fight the browser's balancing and produce double breaks at some widths. Remove them once you adopt `text-wrap`.
```
- **Source:** .zflow/evidence/specweb/foundations/text-wrap.md
- **Verify:** DOM query `h1 br, h2 br, h3 br` returns nothing on content pages.
- **Severity:** low

---

## Container queries (container-queries.md)

### F-60 — Default layout plus wrapper-based containers
- **Requirement:** Container-query layouts must ship a sensible default that works when `@container` is unsupported, with `container-type` set on a wrapper ancestor of the styled elements (prefer `inline-size`).
- **Quote:**
```
Treat it as progressive enhancement: write a sensible single-column default, then enhance at larger container widths. No `@supports` gate is needed — unsupported browsers ignore the `@container` block and keep the default. Prefer `inline-size` unless you genuinely need both axes; `container-type: size` requires the container to have a known block size or its box collapses, exactly as with [`contain: size`](/spec/performance/css-containment/).
```
- **Source:** .zflow/evidence/specweb/foundations/container-queries.md
- **Verify:** DevTools shows query-container badges on ancestor wrappers; with `@container` unsupported (or viewing the default layout), a usable fallback renders.
- **Severity:** low

### F-61 — container-type: size needs a known block size
- **Requirement:** `container-type: size` must only be used on elements with a known fixed block size, or the box collapses to zero.
- **Quote:**
```
- **`container-type: size` without a fixed height.** With no known block size the box collapses to zero in the contained axis.
```
- **Source:** .zflow/evidence/specweb/foundations/container-queries.md
- **Verify:** Grep the shipped CSS for `container-type: size` and confirm each matched element also has an explicit height/block size.
- **Severity:** medium

---

## Invoker commands (invoker-commands.md)

### F-62 — command/commandfor only on buttons
- **Requirement:** `command` / `commandfor` attributes must only appear on `<button>` elements — on anything else they do nothing and are not keyboard-operable.
- **Quote:**
```
- **Putting `command`/`commandfor` on a non-button.** They only work on `<button>`. A `<div>` with these attributes does nothing and is not keyboard-operable.
```
- **Source:** .zflow/evidence/specweb/foundations/invoker-commands.md
- **Verify:** DOM query `[commandfor]:not(button)` returns nothing; activate a command button with Enter/Space and the target responds.
- **Severity:** medium

### F-63 — Custom commands have a listener
- **Requirement:** Custom `--name` commands must have a `command` event listener on the target element, or they do nothing.
- **Quote:**
```
- **Custom command without a listener.** A `--name` command does nothing on its own; you must handle the `command` event on the target.
```
- **Source:** .zflow/evidence/specweb/foundations/invoker-commands.md
- **Verify:** Activate a `--`-prefixed command button and observe the target reacts (a `command` event listener fires on the target).
- **Severity:** low

### F-64 — request-close for cancel-capable dialogs
- **Requirement:** Dialog close controls that must run cancel behaviour should use `request-close` rather than `close`.
- **Quote:**
```
- **Forgetting `request-close`.** For dialogs that should run cancel behaviour and fire the `cancel` event, prefer `request-close` over `close`.
```
- **Source:** .zflow/evidence/specweb/foundations/invoker-commands.md
- **Verify:** Inspect dialog close buttons' `command` attribute — flows with cancel logic use `request-close`.
- **Severity:** low

---

## _for-sale DNS records (for-sale-dns.md)

### F-65 — Record format: v=FORSALE1, one pair per record
- **Requirement:** A `_for-sale` TXT record, if published, must start with the mandatory case-sensitive `v=FORSALE1;` tag and carry at most one `tag=value` pair per record (one character-string, 255 octets max).
- **Quote:**
```
- **The version tag is mandatory** and case-sensitive: every record starts `v=FORSALE1;`. It exists so a processor can tell a real `_for-sale` record from an unrelated `TXT` record that a DNS wildcard happened to expand into that name.
```
- **Source:** .zflow/evidence/specweb/foundations/for-sale-dns.md
- **Verify:** `dig +short TXT _for-sale.example.com` — every returned string begins `v=FORSALE1;` and contains at most one tag=value pair.
- **Severity:** low

### F-66 — TTL at or below 3600
- **Requirement:** A `_for-sale` record must keep its TTL at 3600 seconds or less so a withdrawn offer does not linger.
- **Quote:**
```
- **Keep the TTL at 3600 seconds or less.** A stale record advertising a price you have withdrawn, or a domain you already sold, is worse than no record.
```
- **Source:** .zflow/evidence/specweb/foundations/for-sale-dns.md
- **Verify:** `dig TXT _for-sale.example.com | grep _for-sale` shows a TTL ≤ 3600.
- **Severity:** low

### F-67 — Record absent unless genuinely for sale
- **Requirement:** A `_for-sale` record must exist only while the domain is genuinely for sale and be removed once it no longer is — absence is the only "not for sale" signal.
- **Quote:**
```
- **Remove it when the domain is no longer for sale.** The convention has no "not for sale" value; absence is the only way to say no.
```
- **Source:** .zflow/evidence/specweb/foundations/for-sale-dns.md
- **Verify:** `dig +short TXT _for-sale.<domain>` returns nothing for domains not actively for sale; on a live, not-for-sale consumer site an existing record is a failure.
- **Severity:** medium
