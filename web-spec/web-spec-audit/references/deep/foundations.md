# Foundations — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/foundations/. Assembled from the local evidence corpus (.zflow/evidence/specweb/foundations/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## anchor-positioning
Source: https://specification.website/spec/foundations/anchor-positioning/

---
title: "CSS anchor positioning"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/anchor-positioning/
updated: "2026-06-24T00:00:00.000Z"
sources:
  - title: "CSS Anchor Positioning Module Level 1"
    url: "https://drafts.csswg.org/css-anchor-position-1/"
    publisher: "W3C CSS Working Group"
  - title: "MDN — Using CSS anchor positioning"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using"
    publisher: "MDN"
  - title: "MDN — anchor-name"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/anchor-name"
    publisher: "MDN"
  - title: "Introducing the CSS anchor positioning API"
    url: "https://developer.chrome.com/blog/anchor-positioning-api"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# CSS anchor positioning

> Tether tooltips, menus, and popovers to the element that triggers them with pure CSS — no JavaScript positioning library, and it works across overflow and stacking boundaries.

## What it is

CSS anchor positioning lets one element be positioned relative to another — its _anchor_ — without the two sharing a parent or a containing block. You name an anchor, associate a positioned element with it, and place that element against the anchor's edges using CSS alone.

Three pieces do the work:

- `anchor-name: --trigger` registers an element as a named anchor.
- `position-anchor: --trigger` on an absolutely (or fixed) positioned element associates it with that anchor.
- The `anchor()` function and the `position-area` property place the element against the anchor's edges.

```css
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  position-area: top center; /* sit above, centred on the anchor */
  margin-bottom: 0.5rem;
}
```

`anchor-size()` sizes an element from its anchor's dimensions (a dropdown panel as wide as its button), and `@position-try` plus `position-try-fallbacks` let the element flip to a different side when it would overflow the viewport.

## Why it matters

- **No JavaScript positioning library.** Tooltips, menus, comboboxes, and popovers have historically needed scripts (or Popper/Floating UI) to measure the trigger and reposition on scroll and resize. The browser now does this natively, every frame.
- **It crosses boundaries.** Anchor positioning works regardless of `overflow: hidden` ancestors, `z-index`, or `transform` containing blocks — the same constraints that break hand-rolled overlays. It pairs naturally with [the Popover API](/spec/foundations/popover-api/) and top-layer elements.
- **Viewport-aware by default.** `@position-try` gives you fallback positions, so an overlay that would clip off-screen flips to a side that fits — behaviour you previously wrote and maintained by hand.

## How to implement

Use it to position non-blocking UI relative to its trigger. Treat it as progressive enhancement: give the element a sensible static position first, then layer anchor positioning on top.

```css
@supports (anchor-name: --x) {
  .menu {
    position: absolute;
    position-anchor: --menu-button;
    position-area: bottom span-right;
    position-try-fallbacks: flip-block, flip-inline;
  }
}
```

`position-try-fallbacks` lists alternatives the browser tries in order until the element fits. `position-visibility: anchors-visible` hides the element when its anchor scrolls out of view, so a detached tooltip does not linger.

## Common mistakes

- **Forgetting to position the element.** `position-anchor` and `anchor()` only apply to an element with `position: absolute` or `fixed`. Without it, nothing moves.
- **No fallbacks.** An anchored element with a single fixed side will overflow the viewport near screen edges. Provide `position-try-fallbacks`.
- **Making it the only mechanism.** Until anchor positioning is universally available, keep a usable static fallback for browsers without support rather than leaving the overlay unpositioned.
- **Anchoring across documents.** Anchor and anchored element must be in the same document and not separated by certain layout containers — check the association actually resolves.

## Verification

- `@supports (anchor-name: --x)` gates the enhancement; confirm the fallback layout is acceptable on its own.
- In DevTools, inspect the anchored element and confirm its inset values resolve against the anchor.
- Scroll and resize the viewport: the element should follow its anchor and flip via fallbacks rather than clipping.
- Baseline: CSS anchor positioning became newly available across browsers in early 2026 — verify your target support before relying on it without a fallback.
---

## canonical-url
Source: https://specification.website/spec/foundations/canonical-url/

---
title: "Canonical URL (rel=\"canonical\")"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/canonical-url/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "RFC 6596 — The Canonical Link Relation"
    url: "https://www.rfc-editor.org/rfc/rfc6596"
    publisher: "IETF"
  - title: "MDN — rel=canonical"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#canonical"
    publisher: "MDN"
  - title: "Google — Consolidate duplicate URLs with canonicals"
    url: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls"
    publisher: "Google Search Central"
  - title: "HTML Living Standard — Link types: canonical"
    url: "https://html.spec.whatwg.org/multipage/links.html#link-type-canonical"
    publisher: "WHATWG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Canonical URL (rel="canonical")

> Declare the preferred URL for a page so search engines and crawlers consolidate ranking signals on one address, even when several URLs serve the same content.

## What it is

The canonical link tells crawlers which URL is the authoritative version of a page when the same content is reachable through several addresses:

```html
<link rel="canonical" href="https://example.com/articles/lang-attribute" />
```

It belongs in `<head>` and was standardised in [RFC 6596](https://www.rfc-editor.org/rfc/rfc6596). All major search engines honour it.

A canonical is not a redirect, and it is not `noindex`. The other URLs stay live, keep returning `200`, and stay crawlable; nothing changes for a visitor who lands on one. The tag only asks search engines to _attribute_ the content to the URL you name, so ranking signals, backlinks, and the indexed address consolidate there instead of splitting across the duplicates. It changes where credit lands, not what is reachable.

## Why it matters

The same content often lives at multiple URLs without anyone meaning it to:

- `https://example.com/page` and `https://www.example.com/page`
- `http://` and `https://` versions of the same path
- `/page` and `/page/` (with and without trailing slash)
- `/page?utm_source=newsletter` and `/page` (tracking parameters)
- `/page?sort=date` and `/page?sort=name` (filter and sort variants)
- Paginated archives, printer-friendly views, AMP versions

Without a canonical, crawlers may index every variant separately, splitting ranking signals and backlinks across duplicates. Consolidating them gives a stronger ranking for the page you actually want to rank, and a cleaner index.

A canonical is a **strong hint**, not an absolute directive. Search engines can override it if other signals (sitemaps, redirects, internal links) point elsewhere. Make all your signals agree.

## How to implement

Put a **self-referencing canonical** on every public HTML page. Even pages without duplicates benefit: it removes ambiguity for query-string variants and short-circuits any scraper that copies the page.

```html
<link rel="canonical" href="https://example.com/articles/lang-attribute" />
```

Rules:

- **Use absolute URLs.** Include the scheme (`https://`) and host. Relative canonicals are allowed by the spec but more error-prone; absolute is the safer default.
- **Match the scheme you actually serve.** If the site is HTTPS everywhere, canonicals must say `https://`.
- **Pick one host and stick to it.** Either `example.com` or `www.example.com`, never both. Redirect the other.
- **Be consistent about trailing slashes.** If `/articles/` and `/articles` resolve to the same content, pick one and canonicalise to it. Mixed is the worst case.
- **Strip tracking parameters** from the canonical. The canonical of `/page?utm_source=newsletter` is `/page`.
- **Avoid loops.** Page A canonical to B, B canonical to A is a contradiction.
- **One per page.** Multiple canonicals are ignored.

Cross-domain canonicals are valid when content is syndicated. If you republish an article on a partner site, the partner can canonical back to your original:

```html
<!-- On partner.example -->
<link rel="canonical" href="https://yoursite.example/articles/the-original" />
```

For pages that exist in multiple languages, use `hreflang` in addition to `canonical`. Each language version is its own canonical; `hreflang` ties them together.

The canonical can also be sent as an HTTP header, which is useful for non-HTML resources like PDFs:

```http
Link: <https://example.com/whitepaper.pdf>; rel="canonical"
```

## Common mistakes

- Pointing every page's canonical at the homepage. This tells crawlers your inner pages are duplicates of the homepage and de-indexes them.
- Canonicalising paginated archives (`?page=2`) to page 1. Each pagination page is distinct content; let them index normally.
- Setting a canonical on `https://` that points to `http://`, or vice versa.
- Forgetting to update the canonical when the site moves domain.
- Generating canonicals from `window.location` in client-side JS only. Crawlers may not run JS; render server-side.

## Verification

- View source on a few pages with query parameters. The canonical should ignore the parameters and point to the clean URL.
- Run `document.querySelector('link[rel=canonical]').href` in DevTools.
- Crawl the site and list canonical targets. Every target should return 200 OK, not a redirect.
- In Google Search Console, the "URL Inspection" tool shows the user-declared canonical and the Google-selected canonical. When they differ, something else is overriding your hint.
---

## color-scheme
Source: https://specification.website/spec/foundations/color-scheme/

---
title: "<meta name=\"color-scheme\">"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/color-scheme/
updated: "2026-06-30T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — Standard metadata names: color-scheme"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#meta-color-scheme"
    publisher: "WHATWG"
  - title: "CSS Color Adjustment Module Level 1 — the color-scheme property"
    url: "https://www.w3.org/TR/css-color-adjust-1/#color-scheme-prop"
    publisher: "W3C"
  - title: "MDN — <meta name=\"color-scheme\">"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/color-scheme"
    publisher: "MDN"
  - title: "web.dev — Improve dark mode default with color-scheme"
    url: "https://web.dev/articles/color-scheme"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# <meta name="color-scheme">

> Tells the browser which colour schemes your page is designed for. Prevents the white flash that dark-mode users see before your CSS loads, and lets the browser style scrollbars, form controls, and the page background to match.

## What it is

`color-scheme` declares which colour schemes your page is designed for — light, dark, or both. The browser uses that information to pick sensible defaults for things you didn't style yourself: the canvas background it paints before your CSS loads, scrollbars, native form controls, and the white-space around `<input>` and `<textarea>` elements.

There are two places to set it. The HTML meta tag sets the document-level default:

```html
<meta name="color-scheme" content="light dark" />
```

The CSS property sets it on any element (and is the only form that participates in the cascade):

```css
:root { color-scheme: light dark; }
```

Ship both. The meta tag takes effect before any stylesheet parses, so it prevents the white flash dark-mode users would otherwise see during page load. The CSS property is the authoritative source once styles arrive, and lets you scope schemes to subtrees if you ever need to.

**This site ships it.** [`HeadMeta.astro`](https://github.com/jdevalk/specification.website/blob/main/src/components/HeadMeta.astro) emits `<meta name="color-scheme" content="light dark">` plus a matched pair of `theme-color` tags with `media="(prefers-color-scheme: ...)"`, and [`global.css`](https://github.com/jdevalk/specification.website/blob/main/src/styles/global.css) defines its `--color-ink-*` token scale with `light-dark()` so every utility that references those tokens — backgrounds, borders, body text, even the dual-theme code blocks — resolves against the *used* colour scheme with no `prefers-color-scheme` media query at all. Setting `color-scheme` on `:root` follows the user's OS preference; the in-page theme toggle pins it to `light` or `dark` via a `[data-theme]` attribute, which re-resolves every `light-dark()` value in one go. Accent green is held constant and lifted for text contrast on dark surfaces.

## Why it matters

Without `color-scheme`, the browser assumes the page is light-only. A dark-mode user opening your site sees a blink of white background before your CSS paints — even if your stylesheet is perfectly dark-mode-ready. Native form controls, date pickers, and scrollbars also stay in their light defaults until you restyle every one by hand.

With `color-scheme: light dark` (or just `dark` if your site is dark-only), the browser:

- paints the initial canvas in a colour matching the user's preference;
- renders `<input type="date">`, `<select>`, file pickers, and other form controls in the right scheme;
- gives scrollbars the right contrast against your background;
- treats `currentColor` defaults sensibly for things you forgot to style.

It is distinct from [`<meta name="theme-color">`](/spec/foundations/theme-color/). `theme-color` paints the **browser chrome around** the page (address bar, task switcher, PWA title bar). `color-scheme` styles the **page surface itself** and its native controls. Both should ship; neither replaces the other.

## How to implement

The valid values for the `content` attribute are `normal`, `light`, `dark`, `light dark`, `dark light`, and `only light`. List the preferred scheme first; the others are acceptable fallbacks. `only dark` is explicitly not allowed by the HTML spec — there is no way to forbid light mode, because forcing a page into dark mode the page wasn't built for produces unreadable contrast.

```html
<head>
  <meta name="color-scheme" content="light dark" />
  <link rel="stylesheet" href="/styles.css" />
</head>
```

```css
:root {
  color-scheme: light dark;
  --bg: light-dark(#ffffff, #0b1020);
  --fg: light-dark(#0b1020, #ffffff);
}

body { background: var(--bg); color: var(--fg); }
```

CSS's `light-dark()` function reads the *used* colour scheme from `color-scheme` and picks the matching value. It replaces most cases where you would have reached for `@media (prefers-color-scheme: dark)`.

If your site has a theme switcher independent of the OS preference, update both the meta tag and the root CSS dynamically — or use a CSS custom property for the scheme and toggle it.

## Common mistakes

- Setting `<meta name="theme-color">` for dark mode but forgetting `color-scheme`. The browser chrome is dark; the page underneath still flashes white on load.
- Using `only dark` — invalid; pick `dark` and accept the light fallback.
- Setting `color-scheme: dark` on a site that has not been audited in dark mode. Form controls and scrollbars will recolour and you will discover broken contrast in production.
- Forgetting `light dark` order matters. The first value is the *preferred* scheme when the user has no preference set.

## Verification

- `curl -s https://example.com/ | grep -i 'name="color-scheme"'` returns the meta tag.
- In Chrome DevTools → Rendering, toggle "Emulate CSS prefers-color-scheme: dark" and reload. The page background should switch immediately, with no white flash.
- View a page with a native form control (`<input type="date">`) in both schemes — the picker UI itself should match.
- Run `getComputedStyle(document.documentElement).colorScheme` in the console — it should return the value you set, not `normal`.
---

## container-queries
Source: https://specification.website/spec/foundations/container-queries/

---
title: "CSS container queries"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/container-queries/
updated: "2026-09-22T00:00:00.000Z"
sources:
  - title: "CSS Conditional Rules Module Level 5 — container queries and style queries"
    url: "https://drafts.csswg.org/css-conditional-5/#container-queries"
    publisher: "W3C CSS Working Group"
  - title: "CSS Containment Module Level 2"
    url: "https://drafts.csswg.org/css-contain-2/"
    publisher: "W3C CSS Working Group"
  - title: "MDN — @container"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@container"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# CSS container queries

> Style a component by the space it is actually given with container-type and @container — responsive design that follows the container, not the viewport — and test a container's own custom properties with style queries.

## What it is

Container queries let an element respond to the size of an ancestor _container_ rather than the viewport. You mark an element as a query container with `container-type` (optionally naming it with `container-name`), then write `@container` rules that take effect when that container meets a condition.

```css
.card-list {
  container-type: inline-size;
  container-name: cards;
}

@container cards (min-width: 30rem) {
  .card {
    grid-template-columns: 8rem 1fr;
  }
}
```

`container-type: inline-size` is the common choice: it queries the container's inline dimension while leaving block size to flow normally. _Style queries_, the newer half of the feature, test a container's computed custom properties instead of its size:

```css
@container style(--density: compact) {
  .row {
    padding-block: 0.25rem;
  }
}
```

## Why it matters

- **Components, not pages.** A media query only knows the viewport. It cannot tell that the same card sits full-width in one column and narrow in a sidebar elsewhere. Container queries let a component carry its own breakpoints and drop into any layout slot correctly.
- **Reuse without rewrites.** A design-system component styled against its container works unchanged across pages and templates, instead of needing a new viewport breakpoint each time it lands somewhere new.
- **No JavaScript.** `ResizeObserver` hacks that measured an ancestor and toggled classes are now redundant — the browser resolves the query natively each frame.

## How to implement

Set `container-type` on the wrapper you want to query, not on the element you are styling — an element cannot query itself, and the rules inside `@container` apply to that container's descendants. Name containers when you nest them so a query targets the intended ancestor.

Treat it as progressive enhancement: write a sensible single-column default, then enhance at larger container widths. No `@supports` gate is needed — unsupported browsers ignore the `@container` block and keep the default. Prefer `inline-size` unless you genuinely need both axes; `container-type: size` requires the container to have a known block size or its box collapses, exactly as with [`contain: size`](/spec/performance/css-containment/).

## Common mistakes

- **Querying the element you are styling.** The query container must be an ancestor of the styled element.
- **`container-type: size` without a fixed height.** With no known block size the box collapses to zero in the contained axis.
- **Expecting style queries on standard properties.** Style queries currently test custom properties only — you cannot yet query, say, `display` or `color` directly.
- **Forgetting that a query container establishes containment.** It changes how absolutely positioned descendants resolve their containing block; check overlays still anchor where you expect.

## Verification

- Resize a _container_ (drag a sidebar, not the window) and confirm the component reflows at its own breakpoints.
- DevTools marks query containers with a badge and shows which `@container` rules match.
- Baseline: size container queries have been Baseline since February 2023 (and are now widely available); style queries reached Baseline (newly available) in May 2026 — keep the non-queried layout usable where style queries are unsupported.
---

## doctype
Source: https://specification.website/spec/foundations/doctype/

---
title: "The HTML doctype"
category: foundations
status: required
url: https://specification.website/spec/foundations/doctype/
updated: "2026-07-27T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — The DOCTYPE"
    url: "https://html.spec.whatwg.org/multipage/syntax.html#the-doctype"
    publisher: "WHATWG"
  - title: "MDN — Doctype"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/Doctype"
    publisher: "MDN"
  - title: "MDN — Quirks Mode and Standards Mode"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Quirks_mode_and_standards_mode"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# The HTML doctype

> Every HTML document must start with <!doctype html> as its first line. This opts the browser into standards mode; without it, you get quirks mode and broken layout.

## What it is

The doctype is a short declaration at the very top of an HTML document that tells the browser which rendering mode to use. In modern HTML, there is exactly one correct form:

```html
<!doctype html>
```

It is case-insensitive, so `<!DOCTYPE html>` is equally valid. It must be the first thing in the document, before `<html>`, with no whitespace, comments, or byte-order mark trickery in front of it.

Despite how it looks, the doctype does not declare a version of HTML. The old `HTML 4.01 Transitional` and `XHTML 1.0 Strict` doctypes pointed at a DTD, so reading them as "this document is written in that version" was fair. `<!doctype html>` carries no version and switches on no "HTML5 mode". The modern elements and features you may use do not depend on it: `<section>`, `<video>`, and the rest parse with or without a doctype. Its only job is to choose the rendering mode: present and well-formed gives standards mode, absent or malformed gives quirks mode.

## Why it matters

Without a doctype, browsers fall back to **quirks mode** — a compatibility layer that emulates the buggy behaviour of browsers from the late 1990s. In quirks mode:

- The CSS box model changes (widths include padding and border, like the old IE5 model).
- Inline elements behave differently around whitespace.
- Many modern CSS features are unreliable or disabled.
- Table cell heights, image alignment, and font sizing all shift.

With `<!doctype html>` you get **standards mode**, where the browser follows current specifications. There is also a "limited-quirks" (almost-standards) mode triggered by some legacy doctypes, but you should never need it.

In short: one missing line at the top of the document silently changes how every CSS rule on the page is interpreted. It is the cheapest correctness fix on the web.

## How to implement

Put the doctype on line one of every HTML response. No XML prolog, no comment, no blank line:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Page title</title>
  </head>
  <body>...</body>
</html>
```

Replace any legacy HTML 4 or XHTML doctype with `<!doctype html>`. The short form is part of the HTML Living Standard and works in every browser back to IE6.

For XML-serialised HTML (XHTML served as `application/xhtml+xml`), the doctype is optional, but the document must still parse as XML. Almost no public sites need this — serve HTML.

## Common mistakes

- A blank line, comment, or BOM before `<!doctype html>`. Anything before the doctype can trigger quirks mode.
- Using a legacy HTML 4 or XHTML doctype copied from a 2005 tutorial.
- Sending the doctype only on some pages — error pages, print views, and embedded iframes need it too.
- Letting a templating engine strip it during minification.

## Verification

- View source on the page. The very first bytes must be `<!doctype html>`.
- In DevTools, run `document.compatMode` in the console. It should return `"CSS1Compat"` (standards mode), not `"BackCompat"` (quirks).
- Check error pages (404, 500), redirect destinations, and any HTML fragments returned by APIs.
---

## favicons
Source: https://specification.website/spec/foundations/favicons/

---
title: "Favicons and app icons"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/favicons/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "MDN — The <link> element (rel=icon)"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/link"
    publisher: "MDN"
  - title: "HTML Living Standard — Link type: icon"
    url: "https://html.spec.whatwg.org/multipage/links.html#rel-icon"
    publisher: "WHATWG"
  - title: "W3C — Web App Manifest, maskable icons"
    url: "https://www.w3.org/TR/appmanifest/#icons-member"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Favicons and app icons

> Ship an SVG favicon, an ICO fallback at /favicon.ico, an apple-touch-icon, and a maskable PWA icon. Five files cover every browser and home-screen surface.

## What it is

A favicon is the small icon that represents your site in browser tabs, bookmarks, history, home-screen shortcuts, and OS task switchers. Modern sites need a small set of icons in different formats to cover every surface that displays them.

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

## Why it matters

The favicon is one of the most visible pieces of branding on the web. Tab strips, bookmark bars, and history menus are full of them, and a missing or broken icon looks unfinished. It also affects:

- **Recognition** — users scan tab strips visually, not by reading title text.
- **Home-screen installs** — when a user adds your site to their phone, the icon is what they see every day.
- **Search results** — Google shows a favicon next to mobile search results.
- **OS surfaces** — pinned tabs, recent apps, share sheets, and notification icons all pull from the icon set.

A single 16×16 ICO from 2008 still works, but looks terrible on a high-DPI screen, and is wrong on a phone home screen.

## How to implement

Aim for five files. They cover every browser, every platform, and every density:

1. **`/favicon.svg`** — the modern default. One vector file, infinitely scalable, supports light- and dark-mode variants via CSS inside the SVG. Most browsers since 2021 prefer it.
2. **`/favicon.ico`** — a multi-resolution ICO containing 16×16, 32×32, and 48×48 PNGs. Older browsers and crawlers expect this at the root path.
3. **`/apple-touch-icon.png`** — 180×180 PNG used by iOS when the user adds the site to their home screen. iOS does not honour the SVG favicon for home screens.
4. **`/icon-192.png` and `/icon-512.png`** — referenced from the web app manifest, used by Android and PWA installs.
5. **A maskable variant** — a 512×512 PNG with the important content inside an 80% safe zone, so platforms can crop it to round, squircle, or other masks without clipping your logo.

Wire them up in the head:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

And declare the maskable icons in the manifest:

```json
{
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Even with explicit `<link rel="icon">` tags, browsers and crawlers still request `/favicon.ico` from the site root. Always serve a real ICO at that path. A 404 there shows up in every server log forever.

Design the icon to read at 16×16. Logos with thin text or fine detail disappear; bold marks survive. Test in both light and dark browser themes.

## Common mistakes

- Only shipping a 16×16 PNG. Looks blurry on every modern screen.
- No `/favicon.ico` at the root, so crawlers and old browsers 404 endlessly.
- An apple-touch-icon with transparency. iOS used to add its own rounded background; modern iOS does not, and transparent gaps look broken.
- A maskable icon with the logo at the very edge. The platform crops it; design for an 80% safe zone.
- Forgetting to update the icon when rebranding. Stale icons cached by browsers persist for months.

## Verification

- Open the site in a browser. The tab should show a sharp icon, not a blank page.
- Visit `https://yoursite.example/favicon.ico` directly — it should return 200.
- On iOS Safari, use "Add to Home Screen" and check the icon is crisp and well-cropped.
- On Android Chrome, install the PWA and confirm the launcher icon uses the maskable variant.
- Check server logs for `/favicon.ico` 404s.
---

## feed-discovery
Source: https://specification.website/spec/foundations/feed-discovery/

---
title: "Feed discovery with rel=\"alternate\""
category: foundations
status: recommended
url: https://specification.website/spec/foundations/feed-discovery/
updated: "2026-06-18T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — Link types: alternate"
    url: "https://html.spec.whatwg.org/multipage/links.html#link-type-alternate"
    publisher: "WHATWG"
  - title: "MDN — rel=alternate"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel#alternate"
    publisher: "MDN"
  - title: "RSS 2.0 Specification"
    url: "https://www.rssboard.org/rss-specification"
    publisher: "RSS Advisory Board"
  - title: "RFC 4287 — The Atom Syndication Format"
    url: "https://www.rfc-editor.org/rfc/rfc4287"
    publisher: "IETF"
  - title: "JSON Feed 1.1"
    url: "https://www.jsonfeed.org/version/1.1/"
    publisher: "JSON Feed"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Feed discovery with rel="alternate"

> If your site publishes a feed — RSS, Atom, or JSON Feed — announce it in <head> with <link rel="alternate">. Feed readers, agents, and browsers discover it without guessing the URL.

## What it is

`<link rel="alternate">` in `<head>` declares an alternative representation of the current page or site — most commonly a syndication feed, but also a translated version, a print stylesheet, or, increasingly, the page's Markdown source. Feed readers, browsers, and a growing number of AI agents look for these links to subscribe, switch language, or fetch a machine-friendly version.

For feeds specifically:

```html
<head>
  <link rel="alternate" type="application/rss+xml"
        title="Example — Posts" href="/feed.xml">
  <link rel="alternate" type="application/atom+xml"
        title="Example — Posts (Atom)" href="/atom.xml">
  <link rel="alternate" type="application/feed+json"
        title="Example — Posts (JSON Feed)" href="/feed.json">
</head>
```

The browser, [feed readers](https://en.wikipedia.org/wiki/Comparison_of_feed_aggregators), and tools like the [W3C Feed Validation Service](https://validator.w3.org/feed/) pick these up automatically. The `title` attribute is what the user sees in the subscribe UI — make it specific.

## Why it matters

- **Feed readers cannot subscribe to what they cannot find.** Without `<link rel="alternate">`, the user has to know the URL. With it, every modern reader auto-discovers from the homepage or any article.
- **Browsers and OS-level readers (Safari, NetNewsWire, Reeder) use the same discovery hook.**
- **Search engines and aggregators** treat `rel="alternate"` as the canonical signal for syndication.
- **`rel="alternate"` is a multi-purpose link relation.** Pair the same pattern with `hreflang` for translated URLs (see [hreflang](/spec/i18n/hreflang/)), with `type="text/markdown"` for [Markdown source endpoints](/spec/agent-readiness/markdown-source-endpoints/), and with `media` for print or mobile alternates. Using it consistently teaches every tool that reads your site what to look for.

## How to implement

**Pick the right MIME type.** Browsers and readers branch on it.

| Format | MIME type |
|---|---|
| RSS 2.0 | `application/rss+xml` |
| Atom 1.0 | `application/atom+xml` |
| JSON Feed | `application/feed+json` |
| Markdown source | `text/markdown` |

**Include `title`** for every alternate. A reader's subscribe dialog shows the title verbatim. "RSS Feed" tells the user nothing; "Example — Engineering blog" does.

**Put the most-preferred feed first.** Some readers offer the first alternate by default if there are several.

**Use absolute URLs in the feed itself**, even if the `href` here is relative — see [machine-readable formats](/spec/agent-readiness/machine-readable-formats/).

**Site-wide vs page-specific.** A blog index links to the main feed. An individual category page can additionally link to that category's feed. An individual post does not need its own feed.

**Don't forget HTTP discovery.** Some readers also honour `Link` headers:

```http
Link: </feed.xml>; rel="alternate"; type="application/rss+xml"; title="Example — Posts"
```

Useful for non-HTML responses (e.g. an API root) where there is no `<head>`.

## Common mistakes

- Using `type="text/xml"` or `application/xml` for an RSS feed. Some readers ignore it.
- Linking to a feed that 404s, redirects, or fails validation. Run `https://validator.w3.org/feed/` on every feed URL before shipping.
- Pointing all `<link rel="alternate">` entries at the same URL "to be safe". Each entry must describe a distinct representation.
- Omitting `title` and letting the reader guess.
- Putting `rel="alternate"` on an `<a>` link in the body. It only carries discovery semantics inside `<head>`.

## Verification

- `curl -s https://example.com/ | grep -i 'rel="alternate"'` returns each declared alternate.
- Paste the homepage URL into a feed reader's "Add subscription" dialog — it should resolve to the correct feed without you typing the feed URL.
- The W3C [feed validator](https://validator.w3.org/feed/) returns no errors on the linked feed.
- View source on a per-language page and confirm `rel="alternate" hreflang="…"` siblings sit alongside any feed alternates without conflicting.
---

## feed-hygiene
Source: https://specification.website/spec/foundations/feed-hygiene/

---
title: "Feed content hygiene"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/feed-hygiene/
updated: "2026-05-29T15:19:28.000Z"
sources:
  - title: "RSS 2.0 Specification"
    url: "https://www.rssboard.org/rss-specification"
    publisher: "RSS Advisory Board"
  - title: "RSS Best Practices Profile"
    url: "https://www.rssboard.org/rss-profile"
    publisher: "RSS Advisory Board"
  - title: "RFC 4287 — The Atom Syndication Format"
    url: "https://www.rfc-editor.org/rfc/rfc4287"
    publisher: "IETF"
  - title: "RDF Site Summary 1.0 Modules: Syndication"
    url: "https://web.resource.org/rss/1.0/modules/syndication/"
    publisher: "RSS-DEV Working Group"
  - title: "RFC 5005 — Feed Paging and Archiving"
    url: "https://www.rfc-editor.org/rfc/rfc5005"
    publisher: "IETF"
  - title: "W3C Feed Validation Service"
    url: "https://validator.w3.org/feed/"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Feed content hygiene

> If you publish a feed, ship it well-formed. Identify the feed inside itself with atom:link rel="self", give every item a stable guid, declare an update cadence with the Syndication module, and validate before deploy.

## What it is

[`Feed discovery`](/spec/foundations/feed-discovery/) tells the world *where* your feed is. Feed hygiene is about whether the feed itself is well-formed once they fetch it. Aggregators, feed readers, and AI agents all behave better — and waste fewer of your bytes — when the channel identifies itself, every item has a stable identifier, and the publishing cadence is declared.

The conventions are old and stable. The base specs are RSS 2.0 (RSS Advisory Board), RFC 4287 (Atom), and JSON Feed 1.1. The practical layer — what makes a feed actually portable — lives in the *RSS Best Practices Profile*, which both the [W3C Feed Validation Service](https://validator.w3.org/feed/) and the RSS Validator use to flag warnings.

## Why it matters

- **Self-identification (`atom:link rel="self"`)** makes a feed portable. If the feed is mirrored, cached, or sent to you by a friend, every reader can still find the canonical subscription URL.
- **Stable, unique `<guid>`** lets aggregators detect updates without re-displaying old items. Get this wrong and every refresh re-floods subscribers with duplicates.
- **`sy:updatePeriod` and `sy:updateFrequency`** tell polite aggregators how often to poll. A weekly blog declaring `daily` cadence wastes bandwidth on both sides; declaring `hourly` invites unnecessary load.
- **`<lastBuildDate>`** lets a reader skip parsing when nothing has changed.
- **Paging headers (RFC 5005)** keep archive feeds usable. Without `rel="next"`/`rel="prev"`, anything past the first page is invisible to readers that follow links.

The cost of getting these right is one-time and small. The cost of getting them wrong shows up as duplicate posts in every reader, weeks of stale entries, or 100× more polling traffic than you intended.

## How to implement

Declare the Atom and Syndication namespaces on the `<rss>` root, then ship a self-link, channel metadata, and per-item GUIDs:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:sy="http://purl.org/rss/1.0/modules/syndication/">
  <channel>
    <title>Example — Posts</title>
    <link>https://example.com/</link>
    <description>Engineering writing from the Example team.</description>
    <language>en-GB</language>

    <atom:link href="https://example.com/feed.xml"
               rel="self" type="application/rss+xml" />
    <lastBuildDate>Mon, 27 May 2026 09:00:00 GMT</lastBuildDate>
    <sy:updatePeriod>daily</sy:updatePeriod>
    <sy:updateFrequency>1</sy:updateFrequency>

    <item>
      <title>Shipping the new search</title>
      <link>https://example.com/blog/new-search/</link>
      <guid isPermaLink="true">https://example.com/blog/new-search/</guid>
      <pubDate>Mon, 27 May 2026 09:00:00 GMT</pubDate>
      <description>Why we rebuilt search on Pagefind.</description>
    </item>
  </channel>
</rss>
```

Key points:

- **`atom:link rel="self"`** must point at the canonical URL of the feed itself. Both feed validators flag its absence as a warning.
- **`<guid isPermaLink="true">`** is the simplest correct form when the URL never changes. If the URL is unstable, use `isPermaLink="false"` with a tag URI: `<guid isPermaLink="false">tag:example.com,2026:post/123</guid>`. Once chosen, **the GUID for an item must never change** — that is the identifier readers key off.
- **`sy:updatePeriod`** accepts `hourly`, `daily`, `weekly`, `monthly`, `yearly`. `sy:updateFrequency` is a positive integer (count per period). A site updating twice a day declares `<sy:updatePeriod>daily</sy:updatePeriod><sy:updateFrequency>2</sy:updateFrequency>`.
- **Dates** use RFC 822 format (`Mon, 27 May 2026 09:00:00 GMT`). Atom uses RFC 3339.
- **For archive feeds**, add RFC 5005 paging:

```xml
<atom:link rel="next" href="https://example.com/feed.xml?page=2" />
<atom:link rel="last" href="https://example.com/feed.xml?page=14" />
```

Atom and JSON Feed have direct equivalents for all of the above — JSON Feed's `feed_url` is the self-link, and its `id` per item is the GUID.

## Common mistakes

- Missing `atom:link rel="self"`. Both validators warn on it, and most production feeds in the wild still don't ship it.
- Generating a fresh GUID per build instead of per item. Every reader re-floods subscribers on every deploy.
- Mismatched dates — `pubDate` newer than `lastBuildDate`, or per-item timestamps in the future. Some aggregators silently drop the item.
- Declaring a cadence (`<sy:updatePeriod>hourly</sy:updatePeriod>`) the site does not actually meet. Aggregators back off if the feed is stale relative to the declared cadence.
- Putting absolute URLs in `<link>` but relative URLs in `<atom:link rel="self">`. Both should be absolute.
- Forgetting `xmlns:atom` or `xmlns:sy` namespace declarations. The elements are then technically invalid in RSS 2.0.

## Verification

- Paste the feed URL into [validator.w3.org/feed](https://validator.w3.org/feed/) — expect a clean pass.
- Paste it into [rssboard.org/rss-validator](https://www.rssboard.org/rss-validator/) — the second-opinion validator catches things the W3C one misses.
- `curl -s https://example.com/feed.xml | grep -i 'rel="self"'` should return your self-link.
- Subscribe in two different readers (NetNewsWire and a web reader). Trigger a deploy that does not change content. Confirm no item duplicates appear in either reader.
- Inspect a few items: each `<guid>` should be stable across builds for the same post.
---

## for-sale-dns
Source: https://specification.website/spec/foundations/for-sale-dns/

---
title: "_for-sale DNS records"
category: foundations
status: optional
url: https://specification.website/spec/foundations/for-sale-dns/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "RFC 10023 — The \"_for-sale\" Underscored and Globally Scoped DNS Node Name"
    url: "https://www.rfc-editor.org/rfc/rfc10023.html"
    publisher: "IETF"
  - title: "RFC 8552 — Scoped Interpretation of DNS Resource Records through Underscored Node Names"
    url: "https://www.rfc-editor.org/rfc/rfc8552"
    publisher: "IETF"
  - title: "IANA — Underscored and Globally Scoped DNS Node Names registry"
    url: "https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# _for-sale DNS records

> If a domain is genuinely for sale, say so in DNS. A TXT record at _for-sale.example.com advertises it to brokers and availability services without taking the site down or parking it.

## What it is

`_for-sale` is a reserved DNS leaf node name, defined by RFC 10023 (Informational, July 2026) and registered with IANA. A `TXT` record published at `_for-sale.example.com` signals that `example.com`, although registered and resolving normally, is available for purchase.

```dns
_for-sale IN TXT "v=FORSALE1;furi=https://example.com/for-sale"
```

The record carries a mandatory version tag followed by at most one `tag=value` pair:

| Tag     | Meaning                          | Example                              |
| ------- | -------------------------------- | ------------------------------------ |
| `ftxt=` | Free human-readable text         | `ftxt=Eligibility criteria apply.`    |
| `furi=` | Contact or information URI       | `furi=mailto:hq@example.com`         |
| `fval=` | Asking price, currency + amount  | `fval=EUR2500.00`                    |
| `fcod=` | Proprietary code, by prior agreement | `fcod=XX-aHR0cHM...`             |

The wrong belief to clear first is that this is a way of *parking* a domain. It is close to the opposite. Parking replaces the site with a sales page, which costs you every visitor the domain still has. `_for-sale` sits beside a live site in DNS and says nothing to a browser: the homepage keeps serving, the mail keeps flowing, and the record can be added and removed at will. RFC 10023 makes the point explicitly — the convention is designed to work while the domain is still in active use.

It is also not the same thing as registration data. WHOIS and RDAP answer "is this name registered?"; a registered name may still be purchasable, and an unregistered one may not be worth having. That gap is the whole reason the convention exists, and it is why brokers and automated availability services are the intended audience rather than people.

## Why it matters

The signal a domain owner most wants to send is the one there has never been a channel for. If you are willing to sell, the interested buyer has no way to learn that short of a cold email to a WHOIS contact that privacy redaction has probably removed. Enquiries that would have been welcome never arrive, and the ones that do arrive are indistinguishable from spam.

Putting the signal in DNS rather than on the page is what makes it useful to the parties who can act on it. A broker or an availability service checking a name resolves it anyway; one extra lookup tells them what a rendered page could not, because nothing on a working homepage says "the domain under this is negotiable". It is externally checkable, costs one record, and carries no risk to the site itself — a browser never sees it.

## How to implement

Publish a single `TXT` record at the `_for-sale` leaf of the zone you are selling, and only while you mean it.

```dns
; Free text
_for-sale IN TXT "v=FORSALE1;ftxt=Serious offers only"

; A URI to negotiate through — https, mailto and tel are the usable schemes
_for-sale IN TXT "v=FORSALE1;furi=https://example.com/fs?d=eHl6"

; An asking price: uppercase currency code, then the amount
_for-sale IN TXT "v=FORSALE1;fval=USD12500"
```

Rules worth getting right the first time:

- **The version tag is mandatory** and case-sensitive: every record starts `v=FORSALE1;`. It exists so a processor can tell a real `_for-sale` record from an unrelated `TXT` record that a DNS wildcard happened to expand into that name.
- **One tag-value pair per record.** To publish a price *and* a contact URI, publish two records in the same RRset and let the processor pick what it understands. This is not SPF; the pairs do not concatenate.
- **One character-string per record**, 255 octets maximum, so nothing has to be reassembled during parsing.
- **Keep the TTL at 3600 seconds or less.** A stale record advertising a price you have withdrawn, or a domain you already sold, is worse than no record.
- **Place it at a leaf.** `_for-sale.example.com` is valid at any level of the tree, but `xyz._for-sale.example.com` is not, and records under `.arpa` must be ignored — an offer to sell address space is out of scope.
- **Remove it when the domain is no longer for sale.** The convention has no "not for sale" value; absence is the only way to say no.

Sign the zone with [DNSSEC](/spec/security/dnssec/) if you can. An unsigned `TXT` record asserting your domain is for sale, at a price, with a contact URI, is a comfortable thing for someone else to forge.

This site does not ship a `_for-sale` record: specification.website is not for sale.

## Common mistakes

- **Cramming several pairs into one record.** `"v=FORSALE1;fval=EUR2500;furi=https://…"` looks reasonable and is not what the format defines. Use one pair per record, multiple records per RRset.
- **Publishing it aspirationally.** The indicator is only for domains actually available. It is not a marketing banner, and a record that exists to lure enquiries is an abuse the RFC calls out by name.
- **Assuming it obliges anyone.** Publishing the record does not commit the holder to sell, and an advertised `fval=` price is indicative — the RFC tells processors to display a disclaimer and never to treat it as a purchase commitment.
- **Expecting a wildcard to cover a whole zone.** `_for-sale.*.example.com` is not a valid wildcard. There is no way to put every domain under a TLD up for sale with one record.
- **Trusting the content.** If you are on the reading side, `ftxt=` is attacker-controlled text and `furi=` is an attacker-controlled URI. Sanitise before display — the RFC's own example content is `<script>...</script>` — and never auto-navigate a user to a `furi=` target without an explicit confirmation step.

## Verification

```bash
dig +short TXT _for-sale.example.com
```

- The answer begins with `v=FORSALE1;` and contains at most one `tag=value` pair per string.
- The TTL is 3600 or lower: `dig TXT _for-sale.example.com | grep _for-sale`.
- If the zone is signed, `dig +dnssec TXT _for-sale.example.com` returns a validating `RRSIG`.
- The record resolves at all. During a redemption or `pendingDelete` period, or when DNSSEC validation is bogus, the name will not resolve and the signal silently disappears.
---

## html-lang
Source: https://specification.website/spec/foundations/html-lang/

---
title: "The lang attribute on <html>"
category: foundations
status: required
url: https://specification.website/spec/foundations/html-lang/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "HTML Living Standard — The lang and xml:lang attributes"
    url: "https://html.spec.whatwg.org/multipage/dom.html#the-lang-and-xml:lang-attributes"
    publisher: "WHATWG"
  - title: "MDN — HTML lang global attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang"
    publisher: "MDN"
  - title: "BCP 47 — Tags for Identifying Languages"
    url: "https://www.rfc-editor.org/info/bcp47"
    publisher: "IETF"
  - title: "WCAG 3.1.1 — Language of Page (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# The lang attribute on <html>

> Set a valid BCP 47 language tag on the <html> element so screen readers, translators, search engines, and browsers know what language the page is in.

## What it is

Every HTML document should declare its primary language on the root element using the `lang` attribute:

```html
<html lang="en">
```

The value is a **BCP 47 language tag** — a short, standardised string that identifies a language and, optionally, a region or script. Examples: `en`, `en-GB`, `nl`, `pt-BR`, `zh-Hant`, `de-AT`.

## Why it matters

The language of the page is metadata that many systems rely on:

- **Screen readers** switch pronunciation engines based on `lang`. Without it, VoiceOver and NVDA read English text with a Dutch accent, or vice versa, making content unintelligible.
- **Browsers** offer translation prompts ("Translate this page from French?") only when they know the source language.
- **Search engines** use it as one signal for which audience to show the page to.
- **Spell checkers** in `<textarea>` and `contenteditable` fields use the document language as their default.
- **CSS** can match `:lang(en-GB)` to apply locale-specific typography (quotation marks, hyphenation).
- **WCAG 3.1.1 Level A** requires the human language of every page to be programmatically determinable.

A missing `lang` is one of the most common accessibility failures, and one of the easiest to fix.

## How to implement

Use a valid BCP 47 tag. The simplest form is just the two-letter ISO 639-1 language code:

```html
<html lang="en">
<html lang="fr">
<html lang="ja">
```

Add a region only when it changes meaning — currency, spelling, or pronunciation:

```html
<html lang="en-GB">   <!-- British English: "colour", "behaviour" -->
<html lang="en-US">   <!-- American English: "color", "behavior" -->
<html lang="pt-BR">   <!-- Brazilian Portuguese -->
<html lang="zh-Hant"> <!-- Traditional Chinese script -->
```

For sections of a page in a different language, use `lang` on a child element:

```html
<p>The French call it <span lang="fr">pamplemousse</span>.</p>
```

For right-to-left scripts (Arabic, Hebrew), pair `lang` with `dir`:

```html
<html lang="ar" dir="rtl">
```

## Common mistakes

- Omitting the attribute entirely. Many CMS templates ship without it.
- Using made-up codes like `lang="english"` or `lang="us"`. Only BCP 47 tags are valid.
- Setting `lang="en"` on a Dutch site because the template was copied from an English boilerplate.
- Over-specifying the region (`lang="en-US"` on a generic global English site is fine but rarely needed).
- Forgetting to update `lang` on translated pages — every locale needs its own value.

## Verification

- View source: confirm `<html lang="...">` is present and matches the actual content language.
- Run `document.documentElement.lang` in DevTools.
- Use an accessibility checker (axe, Lighthouse). Both flag missing or invalid `lang`.
- Listen to the page with a screen reader and confirm pronunciation matches the language.
---

## invoker-commands
Source: https://specification.website/spec/foundations/invoker-commands/

---
title: "Invoker commands"
category: foundations
status: optional
url: https://specification.website/spec/foundations/invoker-commands/
updated: "2026-07-06T00:00:00.000Z"
sources:
  - title: "HTML Standard — The button element (command, commandfor)"
    url: "https://html.spec.whatwg.org/multipage/form-elements.html#attr-button-command"
    publisher: "WHATWG"
  - title: "HTML Standard — CommandEvent"
    url: "https://html.spec.whatwg.org/multipage/interaction.html#commandevent"
    publisher: "WHATWG"
  - title: "MDN — Invoker Commands API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API"
    publisher: "MDN"
  - title: "Open UI — Invokers explainer"
    url: "https://open-ui.org/components/invokers.explainer/"
    publisher: "Open UI"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Invoker commands

> Wire a button to open a popover, close a dialog, or run a custom action declaratively with command and commandfor — no click handler, no ARIA plumbing.

## What it is

Invoker commands let a `<button>` control another element declaratively, through two HTML attributes:

- `commandfor` references the `id` of the element to act on.
- `command` names the action to perform.

The browser wires the click and keyboard activation, dispatches a `command` event on the target, and runs the built-in behaviour — no `addEventListener`, no `aria-controls`, no `aria-expanded` to keep in sync.

```html
<button commandfor="menu" command="toggle-popover">Open menu</button>

<div id="menu" popover>
  <button commandfor="menu" command="hide-popover">Close</button>
</div>
```

The built-in commands cover the common overlay patterns: `show-popover`, `hide-popover`, `toggle-popover` for [popovers](/spec/foundations/popover-api/), and `show-modal`, `close`, `request-close` for `<dialog>`. Any value prefixed with two dashes (for example `command="--rotate"`) is a **custom command**: the browser fires a `CommandEvent` on the target carrying that name, and your script decides what to do — invoker wiring without a built-in action.

## Why it matters

- **Less JavaScript for common patterns.** Opening a popover or closing a dialog no longer needs a click handler. The relationship lives in markup the browser understands.
- **Accessibility comes for free.** The control is a real `<button>`, so keyboard activation, focus, and the exposed relationship are handled natively. There is no ARIA to add or to drift out of sync.
- **Custom commands are properly delegated.** A `--name` command dispatches a single typed event from a real button, replacing ad-hoc `onclick` wiring with one consistent mechanism — and you can read `event.source` to know which button invoked it.
- **It composes with the platform.** Invoker commands pair directly with the Popover API, `<dialog>`, and [native interactive elements](/spec/accessibility/native-interactive-elements/) rather than re-implementing their behaviour in script.

## How to implement

Reach for invoker commands whenever a button's job is to drive another element. Use the built-in popover and dialog commands for overlays; use a `--`-prefixed custom command when you want the declarative button-to-target wiring but a behaviour the platform does not ship.

```html
<button commandfor="confirm" command="show-modal">Delete…</button>

<dialog id="confirm">
  <form method="dialog">
    <p>Delete this item?</p>
    <button command="close" commandfor="confirm">Cancel</button>
    <button value="delete">Delete</button>
  </form>
</dialog>
```

Treat it as progressive enhancement where you still support older browsers: a button with a JavaScript fallback degrades to a normal control.

## Common mistakes

- **Putting `command`/`commandfor` on a non-button.** They only work on `<button>`. A `<div>` with these attributes does nothing and is not keyboard-operable.
- **Custom command without a listener.** A `--name` command does nothing on its own; you must handle the `command` event on the target.
- **Forgetting `request-close`.** For dialogs that should run cancel behaviour and fire the `cancel` event, prefer `request-close` over `close`.

## Verification

- Activate the button with the keyboard (Enter/Space): the target popover or dialog responds without any script.
- In DevTools, confirm the `<button>` exposes the command relationship and that a `command` event fires on the target.
- Baseline: invoker commands became newly available across major browsers at the end of 2025 — keep a scripted fallback if you still support older versions.
---

## meta-charset
Source: https://specification.website/spec/foundations/meta-charset/

---
title: "<meta charset>"
category: foundations
status: required
url: https://specification.website/spec/foundations/meta-charset/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "HTML Living Standard — Specifying the document's character encoding"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#charset"
    publisher: "WHATWG"
  - title: "MDN — <meta>: charset"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta#charset"
    publisher: "MDN"
  - title: "WHATWG Encoding Standard"
    url: "https://encoding.spec.whatwg.org/"
    publisher: "WHATWG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# <meta charset>

> Declare UTF-8 as the document character encoding in the first 1024 bytes of the HTML, so browsers parse text correctly before they hit any non-ASCII content.

## What it is

`<meta charset>` tells the browser how to decode the bytes of the HTML document into characters. In 2026 there is only one correct value:

```html
<meta charset="utf-8" />
```

It must appear inside `<head>`, and the entire `<meta>` element must fit within the **first 1024 bytes** of the response. Browsers stop sniffing after that point; anything declared later is ignored.

## Why it matters

Before the browser can parse a single character of your page, it has to decide which encoding to apply to the byte stream. Without an explicit declaration, it guesses — based on the `Content-Type` HTTP header, a byte-order mark, or heuristics over the first chunk of bytes. Guessing goes wrong:

- A page with a curly apostrophe (`'`) shows mojibake (`â€™`) when the browser picks Windows-1252.
- Form submissions get encoded in the wrong charset, corrupting non-ASCII input.
- Right-to-left text reorders incorrectly.
- Search engines index garbled strings.

**UTF-8 is the only encoding you should use.** It is a superset of ASCII, supports every script (Latin, Cyrillic, Arabic, Chinese, emoji), is the default for JSON and XML, and is what every modern build tool produces. Legacy encodings (`iso-8859-1`, `windows-1252`, `shift_jis`) exist only as compatibility for old documents — do not create new content in them.

## How to implement

Put the charset declaration as the very first child of `<head>`, before `<title>` or any other tag that could contain non-ASCII text:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>The Website Specification</title>
    ...
  </head>
</html>
```

Save the file itself as UTF-8 (most editors do this by default). The declaration in the HTML and the actual bytes on disk must match.

Also set the HTTP `Content-Type` header on the response. The header takes precedence over the meta tag, so if they conflict, the header wins:

```http
Content-Type: text/html; charset=utf-8
```

If both agree on UTF-8, you are covered for every loader: browsers, scrapers, RSS readers, and crawlers that read the bytes directly.

The older XHTML form `<meta http-equiv="Content-Type" content="text/html; charset=utf-8">` still works but is verbose and unnecessary. Use the short form.

## Common mistakes

- Declaring the charset after `<title>` so a non-ASCII character in the title is parsed wrongly before the meta tag is reached.
- Saving the file as Windows-1252 or Latin-1 while declaring `utf-8`.
- Adding a byte-order mark to a UTF-8 file. It is allowed but can break server-side includes and PHP headers.
- Different charsets in the HTTP header and the meta tag.
- Using `utf8` without the hyphen — browsers accept it, but `utf-8` is the canonical spelling.

## Verification

- View source. `<meta charset="utf-8" />` should be the first or second line inside `<head>`.
- Run `document.characterSet` in DevTools. It must return `"UTF-8"`.
- Check the `Content-Type` response header in the Network tab.
- Add a non-ASCII test string (`café — 日本語 — 🌍`) to a page and confirm it renders correctly.
---

## meta-description
Source: https://specification.website/spec/foundations/meta-description/

---
title: "<meta name=\"description\">"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/meta-description/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "MDN — <meta>: the metadata element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta"
    publisher: "MDN"
  - title: "Google — Create good meta descriptions"
    url: "https://developers.google.com/search/docs/appearance/snippet"
    publisher: "Google Search Central"
  - title: "HTML Living Standard — Standard metadata names"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#standard-metadata-names"
    publisher: "WHATWG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# <meta name="description">

> A short, unique summary of the page used by search engines and social platforms as a snippet. Google may rewrite it, but a good one is rewritten less often.

## What it is

A meta description is a short summary of the page, declared in `<head>`:

```html
<meta name="description" content="The Website Specification is a platform-agnostic spec of what a good website must do, from doctype to security headers." />
```

The browser does not render it. It is metadata for crawlers, social platforms, and AI agents that fetch the page.

## Why it matters

The meta description does not directly affect search ranking, but it strongly affects whether the user clicks. Search engines often use it as the snippet shown beneath the title in results:

- A good description that matches the user's query gives them a reason to click.
- A missing description forces the engine to invent one from the page body, which is often less compelling.
- Google rewrites the description for about 70% of results, but matches the source more often when it is high quality.

Social platforms (Slack, Discord, iMessage, LinkedIn) use it as the preview text when no Open Graph description is set. AI agents and answer engines use it as a short canonical summary.

A description that is missing, duplicated across pages, or stuffed with keywords is a wasted asset on every result and every share.

## How to implement

Write one description per page, specific to that page:

- **120–160 characters** is the sweet spot. Google typically truncates around 920 pixels on desktop, roughly 155–160 characters.
- **Front-load the unique value.** Truncation eats the end.
- **Describe what the page is about, not the site.** A reader skimming SERPs should be able to predict what they will find.
- **Plain language.** No keyword lists, no marketing slogans, no all-caps.
- **One per page.** Two pages with the same description is a duplicate-content signal.

```html
<!-- Good -->
<meta name="description" content="The lang attribute on <html> tells screen readers, browsers, and search engines what language the page is written in. Use a valid BCP 47 tag." />

<!-- Bad: too long, generic, no useful information -->
<meta name="description" content="Welcome to our website. We are the best in the industry, providing world-class solutions for all your needs. Contact us today to learn more about what we do and how we can help your business grow in 2026." />
```

For the homepage, summarise the site as a whole. For article pages, summarise the article. For category or archive pages, describe what is in the category. Do not leave the description empty and do not auto-generate it from the first 160 characters of the body — that almost always picks up navigation or boilerplate.

If the page also sets `<meta property="og:description">`, write each separately. Social platforms prefer the OG version; search engines prefer the plain meta description. They can be similar but rarely identical, because the audience and the truncation length differ.

## Common mistakes

- Reusing the same description on every page (often pulled from a site-wide template field).
- Stuffing keywords: "cheap shoes, buy shoes, shoes online, shoe shop". Search engines ignore this and users distrust it.
- Including the page title verbatim. The snippet shows both — repeating wastes space.
- Going to 300+ characters. Anything past the truncation line is invisible.
- Ending mid-sentence because the CMS truncates blindly. Write to fit.

## Verification

- View source. `<meta name="description" content="...">` must be in `<head>` and non-empty.
- Run `document.querySelector('meta[name="description"]').content` in DevTools.
- Crawl the site and check for duplicate descriptions. Any duplication is worth fixing.
- Use a SERP preview tool to see how the snippet looks at the truncation length.
---

## meta-viewport
Source: https://specification.website/spec/foundations/meta-viewport/

---
title: "<meta viewport>"
category: foundations
status: required
url: https://specification.website/spec/foundations/meta-viewport/
updated: "2026-09-22T00:00:00.000Z"
sources:
  - title: "MDN — Viewport meta tag"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport"
    publisher: "MDN"
  - title: "CSS Viewport Module Level 1 — the viewport meta element"
    url: "https://drafts.csswg.org/css-viewport-1/#viewport-meta"
    publisher: "W3C"
  - title: "MDN — env() and the safe-area-inset-* variables"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env"
    publisher: "MDN"
  - title: "WCAG 1.4.4 — Resize Text (Level AA)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# <meta viewport>

> Tell mobile browsers to render the page at the device's actual width instead of pretending to be a 980-pixel desktop. One line, and never disable user scaling.

## What it is

The viewport meta tag controls how mobile browsers size and scale the page. The correct value for almost every website is:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

It belongs in `<head>`, alongside the charset and title.

## Why it matters

When mobile browsers first appeared, almost every website on the web was designed for desktop. To avoid showing tiny squashed columns, Safari on iPhone decided to render pages as if the screen were 980 CSS pixels wide and zoom out to fit. That behaviour persists today: without a viewport meta tag, your responsive site is rendered at 980 pixels, then scaled down. The result on a phone is a postage-stamp version of the desktop layout, with text too small to read and tap targets the user has to pinch-zoom to hit.

Setting `width=device-width` tells the browser: "Use the device's actual width as the viewport." `initial-scale=1` sets the initial zoom level to 1:1, so CSS pixels match the browser's idea of a pixel. Together they make responsive CSS (`@media (max-width: 600px)`) work as designed.

This single line is the difference between a site that works on mobile and one that does not. Google has used "mobile-friendliness" as a ranking signal since 2015, and Search uses the mobile version of pages for indexing.

## How to implement

The standard, correct value:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

That is it. Do not add anything else unless you have a specific reason.

You may occasionally see additional keys:

- `viewport-fit=cover` — lets the page draw edge to edge, into the rounded corners and notch/Dynamic Island area. Add it only together with the `env()` handling below.
- `interactive-widget=resizes-content` — controls how the on-screen keyboard interacts with the viewport.

What you must **never** do is disable user zooming:

```html
<!-- Do not do this -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
```

`user-scalable=no` and `maximum-scale=1` prevent users from pinch-zooming. For anyone with low vision who needs to magnify text — and that is a significant fraction of users — this turns a usable page into an unusable one. It also fails WCAG 1.4.4. There is no good reason to disable zoom on a content site.

## Safe-area insets

`viewport-fit=cover` is the one viewport key worth adding deliberately. By default (`viewport-fit=auto`) the browser keeps the page inside a rectangle that clears the notch, the rounded corners, and the home indicator, leaving letterbox bands. `cover` removes those bands so a background or header can run truly edge to edge — which looks best paired with a [`theme-color`](/spec/foundations/theme-color/) that matches the chrome.

The catch: once you opt into `cover`, content can slide *under* the notch and the home indicator, especially in landscape. You take responsibility for keeping interactive content clear of those regions, using the four environment variables the browser exposes:

```css
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
/* Fixed elements pinned to an edge need the bottom/top insets too. */
.bottom-bar {
  padding-bottom: env(safe-area-inset-bottom);
}
```

`env(safe-area-inset-*)` resolves to `0` on devices without insets and on browsers that don't support it, so the rule is safe everywhere. Wrap a value in `max()` when you want a minimum gutter: `padding-left: max(1rem, env(safe-area-inset-left))`.

This site ships `viewport-fit=cover` and pads the document body and the fixed search overlay with `env(safe-area-inset-*)` so nothing hides behind the notch or home indicator.

## Common mistakes

- Omitting the tag and assuming the site is "responsive enough" — mobile browsers will still render at 980 pixels.
- Copying old snippets that include `user-scalable=no`. Remove it.
- Setting `width=1024` or a fixed pixel value to force a layout. Build a responsive layout instead.
- Using `initial-scale=1.0` (with the trailing zero) — harmless, but `1` is canonical.
- Adding the tag only to some templates. Every HTML page needs it.

## Verification

- View source: confirm the tag is present and contains `width=device-width, initial-scale=1`.
- Open Chrome DevTools, toggle device emulation, and check the layout is not 980 pixels wide and scaled down.
- Try pinch-to-zoom on a real phone. If it does not zoom, you have a `user-scalable=no` somewhere.
- Run Lighthouse — it flags both missing viewport tags and ones that disable zooming.
---

## open-graph
Source: https://specification.website/spec/foundations/open-graph/

---
title: "Open Graph protocol"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/open-graph/
updated: "2026-06-09T00:00:00.000Z"
sources:
  - title: "The Open Graph protocol"
    url: "https://ogp.me/"
    publisher: "ogp.me"
  - title: "A Guide to Sharing for Webmasters"
    url: "https://developers.facebook.com/docs/sharing/webmasters/"
    publisher: "Meta"
  - title: "X — Cards markup (Internet Archive)"
    url: "https://web.archive.org/web/20260201012312/https://developer.x.com/en/docs/x-for-websites/cards/overview/markup"
    publisher: "X"
  - title: "Google Search Central — Google Discover and your website"
    url: "https://developers.google.com/search/docs/appearance/google-discover"
    publisher: "Google"
  - title: "WhatsApp — Link previews"
    url: "https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/"
    publisher: "Meta"
  - title: "Slack — Unfurling links in messages"
    url: "https://docs.slack.dev/messaging/unfurling-links-in-messages/"
    publisher: "Slack"
  - title: "Open Graph Plus — Slack unfurl tags"
    url: "https://opengraphplus.com/consumers/slack/tags"
    publisher: "Open Graph Plus"
  - title: "Open Graph Plus — How Slack crawls your page"
    url: "https://opengraphplus.com/consumers/slack/crawling"
    publisher: "Open Graph Plus"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Open Graph protocol

> Open Graph tags control how pages look when shared on social platforms and chat apps. Set og:title, og:description, og:image, og:url, and og:type on every page.

## What it is

Open Graph (OG) is a set of `<meta>` tags, originally introduced by Facebook in 2010 and now supported by virtually every social platform, chat app, and link-preview tool. They tell the platform how to display your page when someone pastes the URL.

```html
<meta property="og:title" content="The lang attribute on <html>" />
<meta property="og:description" content="Set a valid BCP 47 language tag on <html> so screen readers, translators, and search engines know what language the page is in." />
<meta property="og:image" content="https://example.com/og/html-lang.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="675" />
<meta property="og:url" content="https://example.com/foundations/html-lang" />
<meta property="og:type" content="article" />
```

Note `property=` (not `name=`) — Open Graph predates the standard `meta name` registry and uses the RDFa attribute.

## Why it matters

When a link is pasted into Slack, Discord, iMessage, WhatsApp, LinkedIn, Mastodon, Bluesky, or X, the platform fetches the page and reads the OG tags to build a preview card. Without them, the platform falls back to whatever it can scrape — sometimes the `<title>` and meta description, sometimes the first image it can find, sometimes nothing. The result is unpredictable and often unflattering.

A good preview card gives the link a thumbnail, a headline, and a one-line description. Posts with card previews get measurably more clicks than bare URLs. For any content you want shared, OG tags are the difference between a polished preview and a naked URL.

## How to implement

Six tags do most of the work:

- **`og:title`** — the headline. Usually shorter than the HTML `<title>` (no site suffix needed; the platform shows the domain separately).
- **`og:description`** — the snippet under the title. 60–200 characters reads well on most platforms.
- **`og:image`** — an absolute URL to the preview image.
- **`og:url`** — the canonical absolute URL of the page. Match your `<link rel="canonical">`.
- **`og:type`** — the kind of object: `website` for the homepage, `article` for posts, `product` for shop items.
- **`og:site_name`** — the human-readable site name. Slack renders it as the small label above the title; Facebook and LinkedIn also use it when present.

For the image, there are two sensible sizes:

- **1200 × 630** (1.91:1) — the historical Open Graph default. Works on Facebook, LinkedIn, Slack, Discord, iMessage, Bluesky, and Mastodon.
- **1200 × 675** (16:9) — also works on every OG platform, *and* satisfies [Google Discover](https://developers.google.com/search/docs/appearance/google-discover), which only surfaces large-format cards when the image is at least 1200 px wide and roughly 16:9. If you care about appearing in Discover (and you should, if your content is Discover-eligible), 1200 × 675 is the more portable choice — and you also need `<meta name="robots" content="max-image-preview:large">` for Google to use the full-width version.

Other constraints, regardless of which size you pick:

- File size under 5 MB across most platforms, but **WhatsApp drops the preview entirely if the image is over 300 KB** — and WhatsApp is one of the most-used unfurlers on the planet. Treat 300 KB as the real ceiling.
- **Format: PNG or JPEG is the safe universal choice.** WebP is now accepted by virtually every modern unfurler (Facebook, LinkedIn, Discord, iMessage, Slack, Mastodon, Bluesky, X, WhatsApp) and is a good pick when you need to stay under WhatsApp's 300 KB cap on a denser image. AVIF is *not* yet safe — only Facebook, Threads, Pinterest, and WhatsApp render AVIF previews today; the rest will silently drop them. If your CMS auto-converts uploads to AVIF, force the `og:image` URL to stay PNG/JPEG/WebP.
- No critical content within 60 pixels of any edge — platforms crop differently.
- Declare `og:image:width` and `og:image:height`. Some platforms refuse to use images they cannot pre-size.
- Serve over HTTPS. HTTP images are rejected.
- Use absolute URLs. Relative `og:image` paths are not portable.
- **Host it on a stable, branded URL you control.** Serve `og:image` from your own domain (or a branded asset subdomain), not a third-party image host or a signed CDN URL that expires. Platforms cache the card and re-fetch the image later, so the URL has to stay put and stay public: the crawler fetches with no cookies, so a login wall, hotlink/referer protection, or bot blocking makes the image silently disappear from the preview.

For X (Twitter), add Twitter Card tags as a fallback. X prefers them when present:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="The lang attribute on <html>" />
<meta name="twitter:description" content="Set a valid BCP 47 language tag on <html>..." />
<meta name="twitter:image" content="https://example.com/og/html-lang.png" />
```

If you skip the Twitter Card tags, X will fall back to your OG tags, which is fine. The one extra value worth adding is `twitter:card` set to `summary_large_image` so the preview shows the full-width image instead of a small thumbnail.

Two more Twitter Card tags are worth setting because **Slack** renders them as extra key–value rows below the description in the unfurl card:

```html
<meta name="twitter:label1" content="Reading time" />
<meta name="twitter:data1" content="6 min" />
<meta name="twitter:label2" content="Written by" />
<meta name="twitter:data2" content="Jane Doe" />
```

Up to two pairs are shown. Keep each value short — roughly 25 characters fits without truncation. Good uses are reading time, author, price, publication date, category, or rating. Slack is currently the main consumer of these tags; X used to render them on a now-deprecated card type, and most other platforms ignore them, so treat them as a Slack-specific bonus, not a replacement for `og:description`.

Slack also checks for **[oEmbed](https://oembed.com/) discovery** before falling back to OG/Twitter Card tags — either a `<link rel="alternate" type="application/json+oembed">` in the head or an `application/json+oembed` link in the HTTP `Link` header. If you ship oEmbed (most CMSes do for video and rich embeds), Slack uses it first; OG tags are the fallback. The two should describe the same page.

Generate the image per page when you can. A unique illustration or screenshot per article is more engaging than a single site-wide card. Many sites generate them on-demand at build time or with an edge function.

**Locale tags for multilingual sites.** If your page has translated versions, declare them with `og:locale` (this page) and `og:locale:alternate` (every other locale). Use the underscored `language_TERRITORY` form, not the BCP 47 hyphenated form used by `lang` and `hreflang`:

```html
<meta property="og:locale" content="en_GB" />
<meta property="og:locale:alternate" content="fr_FR" />
<meta property="og:locale:alternate" content="de_DE" />
```

Without `og:locale`, social platforms guess from the crawler's `Accept-Language` and may render the wrong-language card. The full set of head changes for a translated page — title, description, OG, JSON-LD `inLanguage`, image alt — is covered in [localised-metadata](/spec/i18n/localised-metadata/).

## Common mistakes

- Using `name="og:title"` instead of `property="og:title"`. The protocol requires `property`.
- Relative URLs in `og:image` or `og:url`. Always absolute, always HTTPS.
- Image dimensions that drift from 1.91:1 or 16:9 — cropped badly on every platform.
- Shipping a 1200 × 630 image *and* wanting Google Discover traffic. Discover wants 16:9 at ≥ 1200 px wide; 1200 × 675 satisfies both worlds.
- A beautiful 600 KB PNG that WhatsApp silently refuses to preview. Compress, downscale, or switch to WebP until you are under 300 KB.
- Serving `og:image` as AVIF. Most platforms cannot render it and will skip the card entirely.
- **An `og:image` on an expiring signed URL or a host you do not control.** When the URL rotates, expires, or starts blocking the crawler, the cached preview breaks and there is no fallback. Serve it from a stable, public URL on your own branded domain.
- Missing `og:image:width` and `og:image:height`. Some platforms skip the image entirely without them.
- One generic OG image reused on every page. Works, but missing an opportunity.
- `og:url` that does not match the canonical URL. The two should agree.
- Missing `og:site_name`. Slack and Facebook fall back to the bare domain, which looks unbranded.
- Stuffing a sentence into `twitter:data1`. The field is for a short value, not a description — long strings get truncated in the Slack card.
- Burying OG tags below 32 KB of inline CSS or scripts in the `<head>`. Slackbot only fetches the first 32 KB with a `Range` request; meta tags past that cut-off are never seen and the link silently fails to unfurl. Put OG tags near the top of `<head>`, above any large inline blocks.

## Verification

- View source and check the five core tags are present and absolute.
- Paste the URL into a debugger (Facebook Sharing Debugger, LinkedIn Post Inspector, Slack's link unfurler, or a direct paste into a chat).
- Confirm the image renders at full width, the title is correct, and the description matches.
- Check the image file itself: `curl -sI` the `og:image` URL and confirm it returns HTTPS `200` (not a redirect to a login page), and that its real pixel dimensions match the declared `og:image:width`/`height` and a 1.91:1 or 16:9 ratio.
- After updating tags, re-scrape on platforms that cache previews aggressively (Facebook, LinkedIn) so they pick up the new values.
---

## popover-api
Source: https://specification.website/spec/foundations/popover-api/

---
title: "Popover API"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/popover-api/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "HTML Standard — Popover"
    url: "https://html.spec.whatwg.org/multipage/popover.html"
    publisher: "WHATWG"
  - title: "MDN — Popover API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Popover_API"
    publisher: "MDN"
  - title: "Introducing the Popover API"
    url: "https://web.dev/blog/popover-api"
    publisher: "web.dev"
  - title: "Open UI — Popover explainer"
    url: "https://open-ui.org/components/popover.research.explainer/"
    publisher: "Open UI"
  - title: "Using CSS anchor positioning"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Anchor_positioning/Using"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Popover API

> Replace ARIA-puzzled JavaScript modals, menus, and tooltips with a native top-layer primitive that the browser opens, closes, and accessibility-wires for you.

## What it is

The Popover API turns any element into a top-layer overlay using three HTML attributes. The browser handles opening, closing, stacking, focus, and keyboard behaviour — no JavaScript and no ARIA juggling.

- `popover` on the overlay element. Values: `auto` (default), `manual`, or `hint`.
- `popovertarget` on a `<button>` that controls the overlay, referencing the popover's `id`.
- `popovertargetaction` to force `"show"`, `"hide"`, or the default `"toggle"`.

```html
<button popovertarget="menu">Open menu</button>

<div id="menu" popover>
  <p>Menu contents.</p>
  <button popovertarget="menu" popovertargetaction="hide">Close</button>
</div>
```

The `auto` value gives you light-dismiss (click outside to close) and auto-close on Escape. `manual` requires an explicit dismiss control. `hint` is for tooltip-style transient overlays that close when another `hint` opens.

CSS hooks: `:popover-open` matches an open popover, `::backdrop` styles the layer behind it, and [CSS **Anchor Positioning**](/spec/foundations/anchor-positioning/) (`position-anchor`, `anchor()`) can position a popover relative to its trigger where supported.

## Why it matters

- **Native top-layer rendering.** The popover sits above every `z-index`, every `overflow: hidden` ancestor, and every transformed container — the perennial CSS bugs of hand-rolled overlays disappear.
- **Built-in accessibility.** Focus moves into the popover on open, Escape closes `auto` popovers, click-outside dismisses them, and the trigger-to-popover relationship is wired automatically. No `aria-expanded`, `aria-controls`, focus-trap library, or outside-click listener required.
- **Less JavaScript.** Menus, disclosure widgets, and lightweight overlays become pure HTML. No state hook, no portal component, no event plumbing.
- **Composes with `<dialog>`.** `<dialog>` remains the right choice for blocking modal flows (forms that need a decision); `popover` covers everything else.

## How to implement

Use `popover` (`auto`) for menus, share sheets, command palettes, and any overlay where clicking outside should dismiss. Use `popover="manual"` only when you have an explicit close affordance and a reason the user shouldn't dismiss by clicking away. Use `hint` for tooltips.

```html
<button popovertarget="share">Share</button>
<div id="share" popover>
  <ul>
    <li><a href="...">Copy link</a></li>
    <li><a href="...">Email</a></li>
  </ul>
</div>

<style>
  [popover]:popover-open { animation: fade-in 120ms ease-out; }
  [popover]::backdrop    { background: rgb(0 0 0 / 0.2); }
</style>
```

For programmatic control, the element exposes `showPopover()`, `hidePopover()`, and `togglePopover()`, and fires `beforetoggle` / `toggle` events.

## Common mistakes

- **`popover="manual"` without a dismiss control.** The user has no way out. Auto is the default for a reason.
- **Reaching for `popover` when you mean `<dialog>`.** Confirmations, sign-in flows, and anything that must block the rest of the page belong in `<dialog showModal()>`. Popovers are non-blocking.
- **Not testing focus return.** When a popover closes, focus must return to the trigger. The browser does this for you — but only if your trigger is a real `<button>`, not a `<div>` with an onClick.
- **Duplicating ARIA.** Don't add `role="dialog"` or `aria-modal` to a popover. The accessibility tree already reflects the right semantics.

## Verification

- DevTools accessibility tree shows the popover as an exposed overlay tied to its trigger.
- Pressing Escape closes an `auto` popover; clicking outside dismisses it; focus returns to the trigger.
- The popover renders above every transformed and `overflow: hidden` ancestor — proof it is in the top layer.
- `caniuse.com/mdn-html_global_attributes_popover` — supported in all major browsers since 2024.
---

## text-wrap
Source: https://specification.website/spec/foundations/text-wrap/

---
title: "Balanced text wrapping"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/text-wrap/
updated: "2026-06-25T00:00:00.000Z"
sources:
  - title: "CSS Text Module Level 4 — the text-wrap shorthand"
    url: "https://drafts.csswg.org/css-text-4/#text-wrap"
    publisher: "W3C CSS Working Group"
  - title: "MDN — text-wrap"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-wrap"
    publisher: "MDN"
  - title: "CSS text-wrap: balance"
    url: "https://developer.chrome.com/docs/css-ui/css-text-wrap-balance"
    publisher: "Chrome for Developers"
  - title: "Better typography with text-wrap: pretty"
    url: "https://webkit.org/blog/16547/better-typography-with-text-wrap-pretty/"
    publisher: "WebKit"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Balanced text wrapping

> Let the browser break headings and body copy intelligently with text-wrap: balance and pretty — no orphaned words, no manual line breaks, no layout shift.

## What it is

`text-wrap` is a CSS shorthand that tells the browser _how_ to break a run of text across lines, beyond the default greedy "fill each line, then break". Two values matter for content:

- **`text-wrap: balance`** — even out the number of characters per line so a block doesn't end on a lonely word. Best for short runs: headings, blockquotes, captions, card titles. Browsers cap it (six lines in Chromium, ten in Firefox), so it stays cheap.
- **`text-wrap: pretty`** — optimise the _last few_ lines of a longer block to avoid orphans (a single word on the final line) and bad breaks. Intended for body copy.

Both are part of the `text-wrap` shorthand in CSS Text Module Level 4, alongside `text-wrap-mode` (`wrap` / `nowrap`) and `text-wrap-style` (which carries `balance` / `pretty` / `stable`).

```css
h1,
h2,
h3 {
  text-wrap: balance;
}
p {
  text-wrap: pretty;
}
```

## Why it matters

- **Readability.** A heading that wraps "Balanced text\nwrapping" reads better than one that leaves "wrapping" stranded alone. Avoiding orphans and ragged breaks is a typographic baseline print has always had.
- **No manual line breaks.** The common workaround — `<br>` or `&nbsp;` to force "good" wrapping — breaks the moment the viewport, font, or translated string changes. `balance` adapts to whatever width it is given.
- **It degrades safely.** Unsupported browsers ignore the declaration and fall back to normal wrapping. There is no polyfill, no JavaScript, and no layout to repair. `balance` is also cheap — browsers cap it to a handful of lines — though `pretty` is not (see below).

This site ships it: `text-wrap: balance` on spec headings and `text-wrap: pretty` on body paragraphs, in [`global.css`](https://github.com/jdevalk/specification.website/blob/main/src/styles/global.css).

## How to implement

Apply `balance` to short, heading-like elements and `pretty` to flowing prose. Set it globally in your base stylesheet; you do not need a feature query because the fallback is simply default wrapping.

Reserve `balance` for short blocks — the browser stops balancing past its line cap, so using it on long paragraphs does nothing useful. Use `pretty` for the long stuff.

Unlike `balance`, `pretty` is not free: it deliberately trades layout speed for typography, running a slower algorithm with no line cap, so the cost scales with how much text it touches. That is a fine trade for genuine body copy, but think before blanket-applying it to every text node on the page — scope it to your prose containers rather than a bare `*` or `p` selector across the whole document.

## Common mistakes

- **`balance` on long body text.** Past the browser's line cap it is a no-op, and where it does apply to long blocks it can cost layout performance. Keep it for headings and other short runs.
- **Keeping old `<br>` hacks.** Manual breaks fight the browser's balancing and produce double breaks at some widths. Remove them once you adopt `text-wrap`.
- **Expecting `pretty` everywhere.** Engine support for `pretty` trails `balance`; treat it as a progressive enhancement, never as something a layout depends on.
- **Applying `pretty` indiscriminately.** It runs a slower wrapping algorithm by design, and unlike `balance` it has no line cap, so applying it site-wide carries a real layout cost. Reserve it for actual body copy; do not hang it off a universal selector.

## Verification

- In a supporting browser, resize a balanced heading: the lines stay evenly filled rather than leaving a one-word last line.
- `caniuse.com/css-text-wrap-balance` — `balance` is Baseline across Chromium, Firefox, and Safari; `pretty` has narrower support.
---

## theme-color
Source: https://specification.website/spec/foundations/theme-color/

---
title: "<meta name=\"theme-color\">"
category: foundations
status: recommended
url: https://specification.website/spec/foundations/theme-color/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "MDN — <meta name=\"theme-color\">"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color"
    publisher: "MDN"
  - title: "HTML Living Standard — Other metadata names: theme-color"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#meta-theme-color"
    publisher: "WHATWG"
  - title: "W3C — Web App Manifest, theme_color"
    url: "https://www.w3.org/TR/appmanifest/#theme_color-member"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# <meta name="theme-color">

> Tints the browser chrome and OS surfaces to match your brand. Use the media attribute to ship one colour for light mode and another for dark mode.

## What it is

`theme-color` suggests a colour for the browser or OS to use when rendering surfaces around the page — the address bar on mobile, the title bar of an installed PWA, the task switcher card, and notification accents.

```html
<meta name="theme-color" content="#0b1020" />
```

The value is any valid CSS colour: hex, `rgb()`, `hsl()`, or a named colour.

## Why it matters

Mobile browsers render a thin strip above the page — the URL bar in Safari and Chrome on iOS and Android. By default it is grey or white. With `theme-color`, that strip can match your brand, so the page and the chrome around it look like one continuous surface.

The same value is used by:

- **iOS Safari** to tint the status bar area when scrolled.
- **Chrome on Android** for the address bar and the task switcher card.
- **PWAs and installed web apps** for the system title bar.
- **macOS Safari 15+** to tint the tab bar of the focused tab.

A page without `theme-color` is not broken, but the visual seam between page content and browser chrome is more obvious. With it, the page feels polished and "native-ish" on mobile.

## How to implement

Set one value for light mode and one for dark mode using the `media` attribute:

```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0b1020" media="(prefers-color-scheme: dark)" />
```

Browsers pick the value whose `media` query matches the user's current colour scheme. If only one tag is present, it is used in every mode — fine for sites with a single fixed palette.

Pick colours that match the **edges** of your page, not the centre. The strip sits flush against your `<body>` background; if your header is dark and the rest of the page is light, the theme colour should match the header.

For an installed PWA, the manifest's `theme_color` and `background_color` are used at launch. Set both for a smooth splash:

```json
{
  "name": "The Website Specification",
  "theme_color": "#0b1020",
  "background_color": "#0b1020"
}
```

The manifest value is used once at install/launch time; the meta tag is consulted on every page load. They can differ if you want a different colour during the splash than during normal browsing, but matching them avoids a visible jump.

### When you ship a manual theme toggle

The `media`-based tags follow the **operating system**, not an in-page switcher. If you let users force dark mode independently of the OS, a visitor on a light OS who picks dark gets a dark page with a *light* address bar — the `(prefers-color-scheme: light)` tag still matches. The chrome and the content disagree.

Fix it in script: write a single `theme-color` value that reflects the *resolved* theme, and make sure it wins. Browsers read the **first** `theme-color` meta in document order whose `media` matches, so insert your dynamic tag ahead of the media ones:

```js
function syncThemeColor(theme) {
  let m = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!m) {
    m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.prepend(m); // ahead of the media-based tags, so it wins
  }
  m.content = theme === 'dark' ? '#0b1020' : '#ffffff';
}
```

Set it **before paint** in the same inline script that restores the stored theme, then keep it in sync whenever the user toggles. Leave the two `media` tags in place as the no-JS fallback. This site does exactly that — see the early-init script in `BaseLayout.astro` and `theme-toggle.js`.

## Common mistakes

- A theme colour with low contrast against the address-bar text. Safari and Chrome render the URL in dark or light text based on the luminance of `theme-color`; an unreadable URL is a real bug.
- Setting only the dark-mode value, so light-mode users see the default grey.
- Relying on the `media`-based tags alone while shipping an in-page dark-mode toggle. They track the OS, so a manual override leaves the chrome out of step — drive `theme-color` from the resolved theme instead.
- Forgetting to update the value when redesigning. The address bar starts looking off-brand months before anyone notices.
- Animating it on scroll. It is metadata, not a paint surface — leave it static.
- Putting hex values with alpha (`#0b1020aa`). Browsers ignore the alpha channel; use an opaque colour.

## Verification

- Open the site on iOS Safari or Chrome on Android. The address bar should be tinted to match your site.
- Toggle the OS between light and dark mode. The strip should change.
- Install the site as a PWA and check the title bar and splash screen colours.
- In DevTools, run `document.querySelector('meta[name="theme-color"]').content` and confirm the value.
---

## title
Source: https://specification.website/spec/foundations/title/

---
title: "The <title> element"
category: foundations
status: required
url: https://specification.website/spec/foundations/title/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — The title element"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#the-title-element"
    publisher: "WHATWG"
  - title: "MDN — <title>: The Document Title element"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title"
    publisher: "MDN"
  - title: "WCAG 2.4.2 — Page Titled (Level A)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html"
    publisher: "W3C"
  - title: "Google — Influencing your title links in search results"
    url: "https://developers.google.com/search/docs/appearance/title-link"
    publisher: "Google Search Central"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# The <title> element

> Every HTML document must have exactly one non-empty <title> element inside <head>. It names the page for browsers, search engines, screen readers, social previews, and AI agents. It is not the same thing as the page's <h1>.

## What it is

The `<title>` element is a required child of `<head>` that names the document. It is the only HTML element with no markup inside it — only text. There must be exactly one per page.

```html
<title>Setting up CSP · The Website Specification</title>
```

The `<title>` is not the `<h1>`. Both name the page, but they are read in different places. The `<h1>` sits at the top of the content, where the reader can already see the logo, the navigation and the URL. It can assume you know where you are. The `<title>` appears where none of that is present: a browser tab, a bookmark, a list of search results drawn from many different sites, the first thing a screen reader announces on load. It can assume nothing.

That is why "Setting up CSP" is a good `<h1>` and a poor `<title>`. As an `<h1>`, the site name is already on the screen. As a `<title>` it is not, so the title has to carry it: `Setting up CSP · The Website Specification`.

## Why it matters

- **Browsers** show the title in the tab, the window, the bookmark, and the history entry.
- **Search engines** use it as the default link text in results (Google may rewrite it, but a good `<title>` is rewritten less).
- **Screen readers** announce the title when the page loads, so it is the first thing a non-sighted user hears.
- **Social platforms** fall back to it when no `<meta property="og:title">` is set.
- **AI agents** use it as the canonical short description of the page.

Missing or empty titles are a WCAG 2.4.2 Level A failure — the lowest accessibility bar there is.

## How to implement

Because the title runs without context, write it for the page, not for the site:

- **Page-specific first, site name second**, separated by a delimiter such as `·`, `—`, or `|`. The unique part is what a reader scanning tabs or search results needs; put it where truncation cannot hide it.
- **50–60 characters** is a reasonable target. Google typically displays around 600 pixels of width.
- **One per page, unique per page.** Two pages with the same title is a quality signal that they are duplicates.
- **No keyword stuffing.** Write what the page is about.

The order matters when the tab is narrow:

```html
<!-- Good: unique part first -->
<title>HSTS · Security · The Website Specification</title>

<!-- Worse: site name eats the tab -->
<title>The Website Specification — Security — HSTS</title>
```

For the homepage, the site name on its own is fine:

```html
<title>The Website Specification</title>
```

## Common mistakes

- Empty `<title></title>`. Browsers show the URL; screen readers announce nothing useful.
- Identical titles across many pages (often the site name only).
- Titles set in JavaScript after first paint — search crawlers and social scrapers may not run JS.
- Putting the title in `<body>` instead of `<head>`.

## Verification

- View source. `<title>` must be inside `<head>` and contain non-whitespace text.
- Open the page in a narrow tab. Check the unique part is visible.
- Run [`curl -s https://example.com | grep -i '<title'`](https://curl.se) and confirm it is set without JavaScript.
- Test with a screen reader (VoiceOver, NVDA). It should announce the title on load.
---

## websub
Source: https://specification.website/spec/foundations/websub/

---
title: "WebSub — push notification for feeds"
category: foundations
status: optional
url: https://specification.website/spec/foundations/websub/
updated: "2026-07-31T00:00:00.000Z"
sources:
  - title: "WebSub — W3C Recommendation, 2 June 2026"
    url: "https://www.w3.org/TR/websub/"
    publisher: "W3C"
  - title: "IANA Link Relation Types registry — hub, self"
    url: "https://www.iana.org/assignments/link-relations/link-relations.xhtml"
    publisher: "IANA"
  - title: "RFC 8288 — Web Linking"
    url: "https://www.rfc-editor.org/rfc/rfc8288"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# WebSub — push notification for feeds

> If you publish a feed, advertise a WebSub hub with rel="hub" and rel="self" so subscribers are pushed each update instead of polling for it. Cuts latency to seconds and removes most of the crawl traffic your feed attracts.

## What it is

WebSub is the standard way to turn a pull feed into a push feed. It is a W3C Recommendation — republished on 2 June 2026 — and it descends from PubSubHubbub, whose wire format it keeps compatible.

Three parties are involved. The **publisher** is you: you own the topic URL, normally a [feed](/spec/foundations/feed-discovery/). The **hub** is a separate service that fans out notifications. The **subscriber** is a feed reader, an aggregator, or an agent that wants your updates. When you publish, you tell the hub; the hub POSTs the new content to every subscriber that has registered a callback.

The part that lives on your site is small: two link relations. `rel="hub"` names a hub that will distribute your topic; `rel="self"` names the topic's own canonical URL. Both are registered at IANA and can travel either as HTTP `Link` headers or as elements inside the document or feed. Subscribers must check the [`Link` headers](/spec/agent-readiness/link-headers/) first and only fall back to embedded elements.

Which makes it worth saying plainly: **`rel="hub"` is an advertisement, not a delivery mechanism.** Adding the link relation does not make updates arrive anywhere. It tells a subscriber where to go and negotiate; the actual delivery only happens because a hub was notified that the topic changed, and because that subscriber renewed its lease. A feed with a `rel="hub"` link and nothing behind it is a feed that still gets polled — the link just makes the failure invisible.

## Why it matters

Polling is how feeds are consumed by default, and it is wasteful in both directions. A reader that polls hourly discovers your post an average of thirty minutes late; one that polls daily can be twenty-three hours behind. Meanwhile every subscriber fetches the same unchanged feed over and over. On a feed with real distribution, that traffic dominates — most requests to a feed URL are polls that return nothing new.

WebSub inverts it. Latency drops to however long the hub takes to fan out, usually seconds. The polling disappears, because subscribers no longer need to guess when to look. For anything time-sensitive — security advisories, status updates, release announcements, breaking news — that difference is the whole point.

It also matters for agents and aggregators specifically. An agent that wants to stay current on your site has two options: poll politely and be slightly stale, or subscribe and be notified. The second costs you almost nothing and is strictly better for both sides.

## How to implement

**1. Advertise the hub and the topic.** Send both relations on the feed response:

```http
Link: <https://hub.example.com/>; rel="hub"
Link: <https://example.com/feed.xml>; rel="self"
```

Or, inside an Atom feed:

```xml
<link rel="hub" href="https://hub.example.com/" />
<link rel="self" href="https://example.com/feed.xml" />
```

`rel="self"` must be the topic's canonical URL — the one you would give in a [`rel="canonical"`](/spec/foundations/canonical-url/) — because that is the identity subscribers key their subscription on. If it disagrees with the URL you actually serve the feed at, subscriptions land on the wrong topic. In HTML, put the link elements in `<head>`; the spec is explicit that `<body>` is unsafe, because injected markup could redirect subscriptions to an attacker's hub.

**2. Notify the hub when you publish.** This is the step people forget. The hub has no way to know your feed changed unless you tell it, so your publish flow must ping the hub on every update. A hub that is never pinged delivers nothing.

**3. Run or choose a hub.** You can operate one, or point at a hosted hub. Either way the hub is a real service with obligations: it verifies every subscription with a `hub.challenge` handshake, enforces lease expiry via `hub.lease_seconds`, and must not issue perpetual leases. If a subscriber supplied a `hub.secret`, the hub signs each delivery with `X-Hub-Signature`, in the form `method=signature` — `sha256`, `sha384`, and `sha512` are the algorithms to use; `sha1` is still recognised but has no business in new deployments.

**4. Keep the feed correct anyway.** WebSub is additive. Subscribers that do not implement it keep polling, so [feed hygiene](/spec/foundations/feed-hygiene/) — stable GUIDs, valid markup, correct `Last-Modified` and `ETag` — still governs how well those clients behave. The push path carries the same feed body, so a malformed feed is malformed for everyone.

**This site ships it.** Both [`/rss.xml`](/rss.xml) and [`/changelog/rss.xml`](/changelog/rss.xml) advertise `rel="hub"` and `rel="self"` on the response and inside the feed, pointing at a hub we run ourselves at `/websub`. It is deliberately a *self-hub*: `hub.topic` is allowlisted to those two feeds, so the endpoint cannot be pointed at arbitrary URLs or made to relay anyone else's content. An open hub is a public service with a different risk profile, and running one is not a prerequisite for the advice above — pointing at a hosted hub is the ordinary choice.

## Common mistakes

- Advertising `rel="hub"` without pinging the hub on publish. Nothing is ever distributed, and nothing errors.
- Omitting `rel="self"`, or pointing it at a redirect or a query-string variant of the feed URL. Subscribers cannot agree with each other on what the topic is.
- Putting the discovery links in `<body>` instead of `<head>`.
- Treating the hub as a cache or CDN for the feed. It is a fan-out relay; it does not serve your feed to readers, and it does not remove your obligation to serve it yourself.
- Reading `X-Hub-Signature` as a publisher signature. It is keyed on the secret a *subscriber* chose, so it authenticates the hub to that one subscriber — it says nothing to anyone else about who wrote the content.
- Assuming a subscription is permanent. Leases expire by design; a subscriber that never re-subscribes silently stops receiving updates.

## Verification

- `curl -sI https://example.com/feed.xml | grep -i '^link:'` and confirm both `rel="hub"` and `rel="self"` are present.
- Check that the `rel="self"` URL, fetched directly, returns the feed with a 200 — not a redirect.
- Publish something and watch your hub's delivery log. If the hub records no ping, the publish flow is not wired up.
- Subscribe a test callback to your own topic and confirm you receive the intent-verification GET, echo the `hub.challenge`, and then receive a content POST on the next publish.
---

