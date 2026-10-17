# Foundations — 67 audit checks

Document correctness every page needs before anything else: doctype, language, encoding, viewport, title/description/canonical, favicons, colour scheme, Open Graph, feeds, and the CSS/Popover build-technique pages.

Source: [The Website Specification](https://specification.website/spec/foundations/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.1, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/foundations/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — Doctype, html lang, meta charset, meta viewport, title · **Recommended** — meta description, canonical URL, favicons and app icons, meta color-scheme, Open Graph.

Severity legend:
- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

- **F-01 — Doctype as the first bytes of every page** (high · `doctype`)
  Verify: `curl -s https://example.com/ | head -c 20` — output must begin with `<!doctype html>` (case-insensitive); in DevTools, `document.compatMode` must return `"CSS1Compat"`, not `"BackCompat"`.
- **F-02 — Doctype on error pages and secondary surfaces** (medium · `doctype`)
  Verify: `curl -s https://example.com/nonexistent-page-test | head -c 20` still starts with `<!doctype html>`.
- **F-03 — Valid BCP 47 lang on `<html>`** (high · `html-lang`)
  Verify: `curl -s https://example.com/ | grep -oiE '<html[^>]*lang="[^"]+"'` returns a well-formed BCP 47 tag; run an axe or Lighthouse accessibility audit, which flags missing or invalid `lang`.
- **F-04 — lang matches the actual content language** (medium · `html-lang`)
  Verify: Fetch each locale's HTML (`curl -s https://example.com/fr/ | grep -oi 'lang="[^"]*"' | head -1`) and confirm the tag matches the visible content language of that page.
- **F-05 — RTL pages pair lang with dir** (medium · `html-lang`)
  Verify: On pages whose `lang` is an RTL language (ar, he, fa, ur), `curl -s <url> | grep -oE '<html[^>]*>'` shows `dir="rtl"`.
- **F-06 — UTF-8 declared within the first 1024 bytes** (high · `meta-charset`)
  Verify: `curl -s https://example.com/ | head -c 1024 | grep -i '<meta charset'` finds the declaration; DevTools `document.characterSet` returns `"UTF-8"`.
- **F-07 — Charset first in head, before title** (medium · `meta-charset`)
  Verify: `curl -s https://example.com/ | grep -oE '<meta charset[^>]*>|<title' | head -2` lists the meta charset before the title.
- **F-08 — Content-Type header agrees on UTF-8** (medium · `meta-charset`)
  Verify: `curl -sI https://example.com/ | grep -i '^content-type:'` shows `charset=utf-8`.
- **F-09 — Viewport tag on every page** (high · `meta-viewport`)
  Verify: `curl -s https://example.com/ | grep -i 'name="viewport"'` returns the tag containing `width=device-width, initial-scale=1`; Lighthouse flags a missing viewport tag.
- **F-10 — Never disable pinch-zoom** (high · `meta-viewport`)
  Verify: `curl -s https://example.com/ | grep -iE 'user-scalable *= *no|maximum-scale'` returns nothing; pinch-to-zoom works on a real phone; Lighthouse flags zoom-disabling viewports.
- **F-11 — Exactly one non-empty title in head** (high · `title`)
  Verify: `curl -s https://example.com/ | grep -ic '<title'` equals 1 and the element contains non-whitespace text inside `<head>`.
- **F-12 — Title rendered server-side, not via JS** (medium · `title`)
  Verify: `curl -s https://example.com/ | grep -i '<title'` shows the full title in the raw response with no JS executed.
- **F-13 — Titles unique per page, page-specific part first** (medium · `title`)
  Verify: Crawl a sample of pages and compare `<title>` values — any duplicate is a failure; spot-check that the unique part precedes the site name.
- **F-14 — One non-empty description, 120–160 characters** (medium · `meta-description`)
  Verify: `curl -s https://example.com/ | grep -i 'name="description"'` returns a non-empty description; measure its content length (roughly 120–160 chars).
- **F-15 — Descriptions unique per page** (low · `meta-description`)
  Verify: Crawl a sample of pages, hash each description content, and flag any duplicates.
- **F-16 — Self-referencing canonical on every public page** (medium · `canonical-url`)
  Verify: `curl -s https://example.com/page | grep -i 'rel="canonical"'` returns exactly one tag whose href equals the page's clean URL, present in the raw HTML without JS.
- **F-17 — Canonical is absolute and scheme-matched** (medium · `canonical-url`)
  Verify: Extract the canonical href and confirm it starts with `https://` and its host matches the host actually serving the page.
- **F-18 — Tracking parameters stripped from canonical** (medium · `canonical-url`)
  Verify: `curl -s 'https://example.com/page?utm_source=test' | grep -i 'rel="canonical"'` points at the parameter-free URL.
- **F-19 — Pagination canonicalises to itself** (medium · `canonical-url`)
  Verify: `curl -s 'https://example.com/blog?page=2' | grep -i 'rel="canonical"'` keeps `?page=2` in the href.
- **F-20 — Canonical target returns 200 directly** (medium · `canonical-url`)
  Verify: `curl -sI <canonical-href>` (without `-L`) returns `HTTP/... 200`.
- **F-21 — Full icon set wired in head** (medium · `favicons`)
  Verify: `curl -s https://example.com/ | grep -iE 'rel="icon"|apple-touch-icon|rel="manifest"'` shows the link tags, and each referenced URL returns 200.
- **F-22 — /favicon.ico returns 200 at the root** (medium · `favicons`)
  Verify: `curl -sI https://example.com/favicon.ico` returns 200.
- **F-23 — apple-touch-icon is a 180×180 PNG** (low · `favicons`)
  Verify: Download the file referenced by `rel="apple-touch-icon"` and check with `file` or `sips -g pixelWidth -g pixelHeight` that it is a 180×180 PNG.
- **F-24 — Maskable manifest icon declared** (low · `favicons`)
  Verify: `curl -s https://example.com/site.webmanifest | grep -i maskable` shows a maskable icon entry with sizes 512x512.
- **F-25 — Light and dark theme-color via media** (low · `theme-color`)
  Verify: `curl -s https://example.com/ | grep -i 'name="theme-color"'` returns tags with `media="(prefers-color-scheme: light)"` and `media="(prefers-color-scheme: dark)"`.
- **F-26 — theme-color is opaque** (low · `theme-color`)
  Verify: Inspect each theme-color content value — none is an 8-digit hex (#RRGGBBAA).
- **F-27 — color-scheme in both meta and CSS** (low · `color-scheme`)
  Verify: `curl -s https://example.com/ | grep -i 'name="color-scheme"'` returns the meta tag, and the stylesheet contains a `color-scheme` declaration on `:root`; DevTools `getComputedStyle(document.documentElement).colorScheme` returns the set value.
- **F-28 — Never use "only dark"** (low · `color-scheme`)
  Verify: `curl -s https://example.com/ | grep -i 'only dark'` returns nothing.
- **F-29 — Core OG tags with property= syntax** (medium · `open-graph`)
  Verify: `curl -s https://example.com/ | grep -i 'property="og:'` returns all five core tags; `curl -s https://example.com/ | grep -i 'name="og:'` returns none.
- **F-30 — og:image on a stable, controlled HTTPS URL** (medium · `open-graph`)
  Verify: `curl -sI <og:image-url>` returns HTTPS 200 directly (not a redirect to a login page), and the image host matches the site's own domain.
- **F-31 — og:image under 300 KB** (medium · `open-graph`)
  Verify: `curl -sI <og:image-url> | grep -i content-length` shows ≤ 300000 bytes (or `curl -s <og:image-url> | wc -c`).
- **F-32 — og:image is PNG/JPEG/WebP, never AVIF** (medium · `open-graph`)
  Verify: `curl -sI <og:image-url> | grep -i '^content-type:'` is `image/png`, `image/jpeg`, or `image/webp` — not `image/avif`.
- **F-33 — og:image dimensions declared and correct** (low · `open-graph`)
  Verify: Compare the declared dimensions with the actual file (`sips -g pixelWidth -g pixelHeight` after download); confirm the image is 1200 px wide at a 1.91:1 or 16:9 ratio.
- **F-34 — twitter:card summary_large_image** (low · `open-graph`)
  Verify: `curl -s https://example.com/ | grep -i 'twitter:card'` returns `summary_large_image`.
- **F-35 — og:url matches canonical** (medium · `open-graph`)
  Verify: Extract `og:url` and the `link[rel=canonical]` href from the same page response and compare — they must be equal.
- **F-36 — OG tags within the first 32 KB** (medium · `open-graph`)
  Verify: `curl -s -r 0-32767 https://example.com/ | grep -c 'property="og:'` equals the count from a full page fetch.
- **F-37 — og:locale on multilingual pages** (low · `open-graph`)
  Verify: On pages with translated versions, `curl -s <url> | grep -i 'og:locale'` returns underscored values (e.g. `en_GB`), one per locale.
- **F-38 — Feed announced with rel="alternate"** (low · `feed-discovery`)
  Verify: `curl -s https://example.com/ | grep -i 'rel="alternate"'` returns each declared feed with a title attribute.
- **F-39 — Correct feed MIME type** (low · `feed-discovery`)
  Verify: Inspect the `type` attribute of each feed alternate link; it must match the format actually served at the href.
- **F-40 — Feed URL reachable and valid** (medium · `feed-discovery`)
  Verify: `curl -sI <feed-url>` returns 200 directly; paste the URL into https://validator.w3.org/feed/ and expect a clean pass.
- **F-41 — atom:link rel="self" self-identification** (low · `feed-hygiene`)
  Verify: `curl -s https://example.com/feed.xml | grep -i 'rel="self"'` returns a self-link whose href equals the feed URL fetched.
- **F-42 — Stable per-item GUID** (medium · `feed-hygiene`)
  Verify: Fetch the feed twice around a deploy and diff `<guid>` values per item — none may change for the same post.
- **F-43 — Declared update cadence** (low · `feed-hygiene`)
  Verify: `curl -s <feed-url> | grep -i 'sy:update'` returns valid values consistent with the site's real publishing rhythm.
- **F-44 — Consistent feed dates** (low · `feed-hygiene`)
  Verify: Parse the feed and compare dates: every pubDate ≤ lastBuildDate and ≤ current time.
- **F-45 — RFC 5005 paging on archive feeds** (low · `feed-hygiene`)
  Verify: `curl -s <feed-url> | grep -i 'rel="next"'` returns the next-page link on paged archive feeds.
- **F-46 — Native popover for non-blocking overlays** (low · `popover-api`)
  Verify: Inspect the DOM for `popover`/`popovertarget` usage; pressing Escape closes an auto popover, clicking outside dismisses it, and focus returns to the trigger.
- **F-47 — Manual popovers have a dismiss control** (medium · `popover-api`)
  Verify: For every `[popover="manual"]` element in the DOM, confirm a close control exists (e.g. a button with `popovertargetaction="hide"`).
- **F-48 — Popover triggers are real buttons** (medium · `popover-api`)
  Verify: DOM query `[popovertarget]` — every match is a `<button>`; close a popover and observe focus lands back on the trigger.
- **F-49 — No duplicate ARIA on popovers** (low · `popover-api`)
  Verify: DOM query `[popover][role="dialog"], [popover][aria-modal]` returns nothing.
- **F-50 — Blocking flows use dialog, not popover** (low · `popover-api`)
  Verify: Open a confirmation or sign-in flow and confirm in DevTools that it is a `<dialog>` element, not a popover.
- **F-51 — Advertise hub and self on feeds** (low · `websub`)
  Verify: `curl -sI https://example.com/feed.xml | grep -i '^link:'` shows both `rel="hub"` and `rel="self"`.
- **F-52 — rel="self" is the canonical, redirect-free topic URL** (low · `websub`)
  Verify: Fetch the `rel="self"` URL directly with `curl -sI` — it returns 200, not a redirect; in HTML pages the link elements sit inside `<head>`.
- **F-53 — Hub actually pinged on publish** (low · `websub`)
  Verify: Subscribing a callback and publishing are state changes — never do them on the audited site. Verify read-only that the `rel="hub"` URL resolves (`curl -sI` 200) and the hub advertises the topic; mark the ping-on-publish behaviour not run unless the dispatch supplies webhook logs or an authorized test topic.
- **F-54 — Static fallback behind @supports** (low · `anchor-positioning`)
  Verify: View the shipped stylesheet for `@supports (anchor-name: ...)` gating; in a browser without support, the overlay is still reachable and usable in its static position.
- **F-55 — position-try-fallbacks declared** (low · `anchor-positioning`)
  Verify: Inspect the CSS of anchored elements for `position-try-fallbacks`; scroll the trigger near a viewport edge and confirm the overlay flips rather than clipping.
- **F-56 — Anchored elements are positioned** (low · `anchor-positioning`)
  Verify: Check computed styles of anchored elements — `position-anchor` is always paired with `position: absolute` or `fixed`.
- **F-57 — balance on headings, pretty on prose** (low · `text-wrap`)
  Verify: In DevTools run `getComputedStyle(document.querySelector('h1')).textWrap` (expect `balance`) and on a body paragraph (expect `pretty`); or grep the shipped CSS for `text-wrap`.
- **F-58 — pretty scoped to prose, not universal** (low · `text-wrap`)
  Verify: Grep the shipped CSS — `text-wrap: pretty` is attached to prose containers, not a universal selector.
- **F-59 — No manual <br> break hacks in headings** (low · `text-wrap`)
  Verify: DOM query `h1 br, h2 br, h3 br` returns nothing on content pages.
- **F-60 — Default layout plus wrapper-based containers** (low · `container-queries`)
  Verify: DevTools shows query-container badges on ancestor wrappers; with `@container` unsupported (or viewing the default layout), a usable fallback renders.
- **F-61 — container-type: size needs a known block size** (medium · `container-queries`)
  Verify: Grep the shipped CSS for `container-type: size` and confirm each matched element also has an explicit height/block size.
- **F-62 — command/commandfor only on buttons** (medium · `invoker-commands`)
  Verify: DOM query `[commandfor]:not(button)` returns nothing; activate a command button with Enter/Space and the target responds.
- **F-63 — Custom commands have a listener** (low · `invoker-commands`)
  Verify: Activate a `--`-prefixed command button and observe the target reacts (a `command` event listener fires on the target).
- **F-64 — request-close for cancel-capable dialogs** (low · `invoker-commands`)
  Verify: Inspect dialog close buttons' `command` attribute — flows with cancel logic use `request-close`.
- **F-65 — Record format: v=FORSALE1, one pair per record** (low · `for-sale-dns`)
  Verify: `dig +short TXT _for-sale.example.com` — every returned string begins `v=FORSALE1;` and contains at most one tag=value pair.
- **F-66 — TTL at or below 3600** (low · `for-sale-dns`)
  Verify: `dig TXT _for-sale.example.com | grep _for-sale` shows a TTL ≤ 3600.
- **F-67 — Record absent unless genuinely for sale** (medium · `for-sale-dns`)
  Verify: `dig +short TXT _for-sale.<domain>` returns nothing for domains not actively for sale; on a live, not-for-sale consumer site an existing record is a failure.
