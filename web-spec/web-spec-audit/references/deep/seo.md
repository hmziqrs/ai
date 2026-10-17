# SEO — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/seo/. Assembled from the local evidence corpus (.zflow/evidence/specweb/seo/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## breadcrumbs
Source: https://specification.website/spec/seo/breadcrumbs/

---
title: "Breadcrumbs"
category: seo
status: recommended
url: https://specification.website/spec/seo/breadcrumbs/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Schema.org — BreadcrumbList"
    url: "https://schema.org/BreadcrumbList"
    publisher: "schema.org"
  - title: "Breadcrumb structured data"
    url: "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb"
    publisher: "Google Search Central"
  - title: "ARIA Authoring Practices — Breadcrumb"
    url: "https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/"
    publisher: "W3C WAI"
  - title: "MDN — aria-current"
    url: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Breadcrumbs

> A short trail showing the page's position in the site hierarchy. Visible in the UI for users, marked up as BreadcrumbList JSON-LD for search engines.

## What it is

Breadcrumbs are a short, one-line navigation trail showing the path from the site root to the current page. They serve users (an at-a-glance "where am I"), assistive technology (a labelled landmark to skip to or escape from), and search engines (a hierarchy signal that often replaces the URL in search results).

The visible markup is a `<nav>` containing an ordered list of links, with the current page marked using `aria-current`. The same trail is also serialised as JSON-LD `BreadcrumbList` for search engines.

```html
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/seo">SEO</a></li>
    <li><a href="/seo/breadcrumbs" aria-current="page">Breadcrumbs</a></li>
  </ol>
</nav>
```

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://example.com/" },
    { "@type": "ListItem", "position": 2, "name": "SEO",         "item": "https://example.com/seo" },
    { "@type": "ListItem", "position": 3, "name": "Breadcrumbs", "item": "https://example.com/seo/breadcrumbs" }
  ]
}
</script>
```

## Why it matters

- **Search engines** display breadcrumb trails under the page title in results instead of the raw URL. A clean `Home › SEO › Breadcrumbs` reads better than `example.com/seo/breadcrumbs/`.
- **Screen-reader users** rely on the labelled `<nav>` landmark to find the trail in one keystroke.
- **Sighted users** use breadcrumbs to escape upwards, especially when they arrived from a search result deep in the site.
- **AI agents** parse the JSON-LD to understand the site's taxonomy, which helps them answer questions like "what is the parent topic of this page".

## How to implement

The pattern is small and stable; do it once and reuse it.

- **Wrap the trail in `<nav aria-label="Breadcrumb">`.** The label is what screen readers announce. "Breadcrumb" is the conventional value.
- **Use an ordered list (`<ol>`).** Order is part of the meaning.
- **Each item except the last is a link to its level.** The last item is the current page, marked `aria-current="page"`. It should not be a link.
- **Match the visible trail to the JSON-LD exactly.** Same items, same order, same names, same URLs.
- **Use a CSS separator (`::before`), not a literal `›` character in the markup.** Avoids the separator being announced as part of the link.
- **Anchor breadcrumbs at "Home".** Some sites omit Home, but including it makes the JSON-LD more useful and matches what Google displays.
- **Keep them short.** Three to five levels is normal; ten levels suggests the URL structure is too deep.

For dynamic sites, derive the trail from the URL or the page's place in the navigation tree, not from a hand-maintained per-page list.

## Common mistakes

- Visible trail and JSON-LD list disagree.
- The current-page item is a link to itself.
- `aria-label` missing or set to something unhelpful like "Navigation".
- Breadcrumbs based on the user's click path ("you came from Search") rather than the site hierarchy. That is "history", not "breadcrumbs".
- Adding a separator character inside the `<a>` text, so the link reads "Home ›".

## Verification

- Tab through with a screen reader. The trail should be announced as "Breadcrumb navigation, list with 3 items".
- Use the Rich Results Test to confirm Google recognises the `BreadcrumbList`.
- Visually check that the current-page item is not clickable.
---

## heading-hierarchy
Source: https://specification.website/spec/seo/heading-hierarchy/

---
title: "Heading hierarchy"
category: seo
status: required
url: https://specification.website/spec/seo/heading-hierarchy/
updated: "2026-07-01T00:00:00.000Z"
sources:
  - title: "HTML Living Standard — Headings and sections"
    url: "https://html.spec.whatwg.org/multipage/sections.html#headings-and-sections"
    publisher: "WHATWG"
  - title: "WCAG — Headings and Labels (2.4.6)"
    url: "https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html"
    publisher: "W3C"
  - title: "Section Headings — ARIA Authoring Practices"
    url: "https://www.w3.org/WAI/tutorials/page-structure/headings/"
    publisher: "W3C WAI"
  - title: "MDN — Heading elements"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Heading hierarchy

> Headings describe the sections of a page. They must form a nested outline, never be used for visual styling alone, and never skip levels.

## What it is

HTML defines six heading levels, `<h1>` through `<h6>`. They are the spine of a document's outline. Screen readers expose them as a navigable list, search engines weight them when working out what a page is about, and AI agents use them to chunk content.

```html
<h1>HSTS</h1>
<h2>What it is</h2>
<h2>Why it matters</h2>
<h3>For users on public Wi-Fi</h3>
<h2>How to implement</h2>
```

## Why it matters

Headings are the only structural signal that is consistent across browsers, screen readers, search engines, and AI tools. Get them right and the page becomes:

- **Navigable** for users of assistive technology, who jump heading-by-heading instead of scrolling.
- **Indexable** in chunks, so search engines and AI agents can quote a section without needing the whole page.
- **Maintainable**, because the outline matches the writing.

WCAG 2.4.6 (Level AA) requires headings and labels to describe the topic or purpose. Skipping levels or using a heading for its visual weight is a direct failure.

## How to implement

The rules are simple and rarely controversial:

- **One `<h1>` per page.** HTML5 once described a document-outline algorithm in which each nested sectioning element (`<section>`, `<article>`) reset the heading scope, so `<h1>` could be reused everywhere. No browser or screen reader ever implemented it, nesting multiple `<h1>`s that way is now non-conforming, and the browser default that shrank a sectioned `<h1>` was removed from the spec in 2025. Use a single `<h1>` that matches the page title.
- **Do not skip levels.** Go `h1 → h2 → h3`, never `h1 → h3`. Levels can decrease by any amount on the way back up (`h3 → h2` is fine).
- **Headings describe sections, not styling.** If you want bigger text, use CSS. Never pick a heading level for its font size.
- **No heading without a section under it.** Every heading should have content. An `<h2>` followed immediately by another `<h2>` with nothing between them is a smell.
- **Keep headings short.** They are anchors, not paragraphs. Aim for under 70 characters.
- **Distinguish sibling headings.** The same heading text under different parent sections ("Overview", "Examples") is fine, because the rotor shows each nested under its parent. Two headings with identical text in the same branch are the confusing case; disambiguate those.
- **A title and its subtitle are one heading, not two.** Marking up a strapline as a second heading (`<h1>` followed by an `<h2>` tagline) adds a phantom level to the outline. Wrap the single `<h1>`–`<h6>` and one or more `<p>` subtitles in `<hgroup>`, which groups them without contributing a heading of its own.
- **Visual headings need real heading tags.** A `<div class="heading">` is invisible to assistive tech. A `<p>` styled to look like an `<h2>` is invisible to search engines.

For component-driven design systems, expose the heading level as a prop (`<Heading level={2}>...</Heading>`) so the same component can render at the right level for its context.

## Common mistakes

- Using an `<h1>` per section because a designer wanted "big titles everywhere".
- Wrapping the site logo in `<h1>` on every page, so every page has the same H1.
- Skipping levels to get a smaller default size (use CSS).
- Hiding headings visually but leaving them in the DOM as the only outline — fine if intentional, broken if it becomes a maintenance burden.
- Putting interactive elements inside headings (buttons, dropdowns). Keep headings text-only.

## Verification

- Use the browser dev tools accessibility panel to view the heading outline.
- Run an automated check (axe, Lighthouse, WAVE). Skipped levels and empty headings are flagged immediately.
- Tab through the page with a screen reader's heading shortcut (`H` in NVDA, `VO+Cmd+H` in VoiceOver). Does the outline read like a table of contents?
---

## image-sitemaps
Source: https://specification.website/spec/seo/image-sitemaps/

---
title: "Image and video sitemap extensions"
category: seo
status: optional
url: https://specification.website/spec/seo/image-sitemaps/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Image sitemaps"
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps"
    publisher: "Google Search Central"
  - title: "Video sitemaps and alternatives"
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps"
    publisher: "Google Search Central"
  - title: "Sitemaps XML format"
    url: "https://www.sitemaps.org/protocol.html"
    publisher: "sitemaps.org"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Image and video sitemap extensions

> Optional XML extensions that add image and video metadata to sitemap entries. Useful when media is loaded by JavaScript or hosted on a CDN that crawlers cannot reach by following links.

## What it is

Sitemaps support extensions for declaring images and videos associated with each page. They use additional XML namespaces alongside the standard `urlset`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://example.com/articles/csp</loc>
    <image:image>
      <image:loc>https://cdn.example.com/csp-hero.jpg</image:loc>
    </image:image>
    <image:image>
      <image:loc>https://cdn.example.com/csp-diagram.png</image:loc>
    </image:image>
  </url>
</urlset>
```

The video extension is similar (`xmlns:video`) and supports more metadata: `title`, `description`, `thumbnail_loc`, `content_loc`, and `player_loc`.

## Why it matters

Crawlers normally find images by parsing the HTML of pages they fetch. That is usually enough. The extensions only earn their keep when:

- **Media is loaded by JavaScript** and not in the initial HTML.
- **Media lives on a different host** (a CDN or media subdomain) that crawlers do not visit independently.
- **You publish a lot of original photography or video** and want crawlers to discover updates quickly.

For most marketing sites, plain `<img>` and `<video>` elements with good `alt` text and `<source>` declarations are enough. The extensions are an optimisation, not a baseline.

## How to implement

For images:

- Up to **1,000 images per `<url>` entry**.
- Each `<image:image>` needs only `<image:loc>`. Other fields (`caption`, `title`, `geo_location`, `license`) are accepted by some crawlers but are not widely used.
- Use the canonical image URL — the one the page actually loads. CDN URLs are fine.

For videos:

- Each `<video:video>` needs `thumbnail_loc`, `title`, `description`, and one of `content_loc` or `player_loc`.
- Keep titles under 100 characters and descriptions under 2,048.
- Add `duration` in seconds where possible.

For both, prefer to **add them to existing page sitemaps** rather than create a separate image or video sitemap. That keeps the relationship between page and media explicit. If volume is too high, split into a dedicated `sitemap-images.xml` and reference it from your sitemap index.

## Common mistakes

- Listing images that are not actually used on the page in `<loc>`. Crawlers cross-check.
- Pointing `<image:loc>` at a redirect or a 404.
- Forgetting the `xmlns:image` or `xmlns:video` namespace declaration on `<urlset>`.
- Treating these as a ranking lever. They help discovery, not ranking.

## Verification

- Validate the sitemap against the extension XSDs.
- In Search Console, check the Sitemaps report for parsed image and video counts.
- Test that each `<image:loc>` returns `200 OK` with an image `Content-Type`.
---

## indexnow
Source: https://specification.website/spec/seo/indexnow/

---
title: "IndexNow"
category: seo
status: optional
url: https://specification.website/spec/seo/indexnow/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "IndexNow protocol"
    url: "https://www.indexnow.org/documentation"
    publisher: "IndexNow"
  - title: "Bing — IndexNow"
    url: "https://www.bing.com/indexnow"
    publisher: "Bing"
  - title: "Yandex — IndexNow"
    url: "https://yandex.com/support/webmaster/indexnow/key.html"
    publisher: "Yandex"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# IndexNow

> An open protocol for telling participating search engines that a URL has changed. One HTTP request pushes Bing, Yandex, Naver, and Seznam to recrawl — Google does not participate.

## What it is

IndexNow is a simple push protocol that lets a site tell search engines a URL has been added, updated, or deleted. The publisher hosts a key file at the site root and sends an HTTP request to a participating endpoint listing the changed URLs. Bing, Yandex, Naver, Seznam, and Yep all consume the same feed; one submission propagates to all of them. Google does **not** participate.

The submission is a single GET or POST:

```http
POST /indexnow HTTP/1.1
Host: api.indexnow.org
Content-Type: application/json

{
  "host": "example.com",
  "key": "abc123...xyz",
  "keyLocation": "https://example.com/abc123xyz.txt",
  "urlList": [
    "https://example.com/articles/csp",
    "https://example.com/articles/hsts"
  ]
}
```

The key file at `https://example.com/abc123xyz.txt` must contain the same key as plain text — that proves you control the host.

## Why it matters

Discovery is the slowest part of indexing. A sitemap tells crawlers what exists; IndexNow tells them what just changed. For news, e-commerce stock changes, and price updates, that gap matters — Bing typically recrawls within minutes of an IndexNow ping versus hours or days from sitemap-only discovery.

It is also a low-effort improvement. A single endpoint covers every participating engine, no per-engine integrations needed.

Google's absence is the limiting factor. If most of your traffic is from Google, IndexNow is a nice-to-have. For markets where Bing, Yandex, or Naver have meaningful share (Russia, South Korea, the Czech Republic, US Bing-driven verticals), the impact is real.

## How to implement

The shape is straightforward:

1. **Generate a key.** 8 to 128 characters, `[a-zA-Z0-9-]`. Pick one and reuse it indefinitely.
2. **Host the key file at the site root.** `https://example.com/<key>.txt`, served as `text/plain`, body equal to the key.
3. **Submit URLs on change.** Fire a request to `https://api.indexnow.org/indexnow` (or directly to Bing's or Yandex's endpoint) after every publish, update, or unpublish event.
4. **Limit volume.** Up to 10,000 URLs per request. Do not send the entire sitemap on every cron tick — submit only what changed since the last call.
5. **Send deletions too.** A 404 or 410 should also be submitted; that is how participating engines learn to drop URLs quickly.

Trigger the submission from whatever fires on content change — the same event that rebuilds a page or invalidates its cache is the right hook.

## Common mistakes

- Submitting URLs that return non-200 statuses you did not mean to publish.
- Re-submitting on every page view rather than only on change.
- Hosting the key file at the wrong path or behind redirects. The key file must return 200 directly.
- Treating IndexNow as a Google signal. Google ignores the protocol — use Search Console's URL Inspection tool for one-off Google submissions.

## Verification

- `curl https://example.com/<key>.txt` should return the key as plain text.
- The endpoint returns `200 OK` on accepted submissions, `202` if quarantined, and `400`/`403`/`422` on errors. Log the response.
- Bing Webmaster Tools shows IndexNow activity under "URL Submission" — confirm the URLs appear there.
---

## internal-linking
Source: https://specification.website/spec/seo/internal-linking/

---
title: "Internal linking"
category: seo
status: recommended
url: https://specification.website/spec/seo/internal-linking/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "Yoast — Internal linking for SEO"
    url: "https://yoast.com/internal-linking-for-seo-why-and-how/"
    publisher: "Yoast"
  - title: "Google — Links and link building"
    url: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable"
    publisher: "Google Search Central"
  - title: "Google — Qualify your outbound links"
    url: "https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links"
    publisher: "Google Search Central"
  - title: "MDN — Creating hyperlinks"
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Creating_links"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Internal linking

> Links from one page on a site to another. The strongest signal you control for telling crawlers and AI agents what a page is about and how important it is.

## What it is

An internal link is an `<a href>` from one URL on a site to another URL on the same site. Internal links form the graph that crawlers walk, that screen-reader users navigate, and that AI agents follow to gather context.

```html
<p>
  Read the <a href="/seo/xml-sitemaps">XML sitemap spec</a>
  to see how this page is discovered.
</p>
```

## Why it matters

Three audiences read internal links differently:

- **Crawlers** use them to discover pages and to weight importance. A page linked from the home page is considered more important than one linked only from a deep archive.
- **AI agents and answer engines** use anchor text as a strong signal for what the destination is about, often stronger than the destination's own `<title>`.
- **Humans** scan link text to decide whether the click is worth it.

Internal links are also the easiest SEO lever you fully control. External backlinks are won; internal links are decided.

## How to implement

Anchor text is the single most important variable.

- **Use descriptive anchor text.** "XML sitemap spec" is good. "Click here" tells the user and the crawler nothing.
- **Vary anchor text naturally.** Link the same destination from different pages using slightly different phrasings. Identical anchors on every link looks templated.
- **Link to the canonical URL** of the destination, not a redirect. Every link to a redirect costs a hop.
- **Link to topically related content.** Each article should link to two to five other relevant pages on the site. A page with zero outbound internal links is an orphan from the crawler's perspective even if it links inwards.
- **Avoid orphan pages.** Every URL in the sitemap should be reachable from at least one other page through normal navigation, not just from the sitemap itself.
- **Keep link depth shallow.** Pages more than three clicks from the home page get crawled and updated less often.
- **Cross-link from breadcrumbs.** They give crawlers a clean hierarchical view and let users escape upwards.
- **Open in the same tab unless there is a reason.** `target="_blank"` is for downloads and third-party flows, not internal navigation.

Avoid linking inside long lists of navigation that repeat on every page. Those count, but contextual links inside body content carry more weight per link.

## Common mistakes

- "Click here" or "read more" used as the only anchor text in the body.
- Hundreds of footer links to every page on the site. Dilutes the signal and clutters screen-reader rotors.
- Linking to staging or preview URLs by accident.
- Building the entire navigation in JavaScript with no `<a href>` fallback. Crawlers and screen readers cannot follow it.
- Pointing internal links at redirect chains created by an old migration.
- Using `rel="nofollow"` on internal links to "sculpt" ranking signals or save crawl budget. Google treats nofollow as a hint, not an instruction, so nofollowed pages can still be crawled and indexed through your sitemap or other links. It is not a crawl-control lever: to keep your own pages out of the crawl, Google's guidance is a robots.txt `disallow`, not `nofollow`.

## Verification

- Crawl the site and check the orphan-pages report. Anything in the sitemap but not reachable through links needs a contextual link added.
- Use Search Console's Links report to see the top linked-to pages. The list should match your idea of what is important.
- Check that anchor text varies and is descriptive — a crawler that exports a list of `(anchor, target)` pairs tells you a lot in one read.
---

## meta-robots
Source: https://specification.website/spec/seo/meta-robots/

---
title: "Meta robots and X-Robots-Tag"
category: seo
status: required
url: https://specification.website/spec/seo/meta-robots/
updated: "2026-05-29T09:55:11.000Z"
sources:
  - title: "HTML Living Standard — Standard metadata names: robots"
    url: "https://html.spec.whatwg.org/multipage/semantics.html#meta-robots"
    publisher: "WHATWG"
  - title: "Google Search Central — Robots meta tag, data-nosnippet, and X-Robots-Tag"
    url: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag"
    publisher: "Google Search Central"
  - title: "Bing Webmaster — Robots meta tag"
    url: "https://www.bing.com/webmasters/help/which-robots-metatags-does-bing-support-5198d240"
    publisher: "Bing"
  - title: "MDN — <meta name=\"robots\">"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Meta robots and X-Robots-Tag

> Every page must have an explicit, correct indexing policy — either implicit (default index, follow) on public pages, or an explicit noindex / X-Robots-Tag on staging, admin, thin, or private content. Get this wrong and you either disappear from search or expose what you didn't mean to.

## What it is

The robots meta tag and the equivalent `X-Robots-Tag` HTTP header tell search engines and other compliant crawlers whether they may index a page, follow its links, and how to render it in results. Together they are the per-page complement to [robots.txt](/spec/seo/robots-txt/) — robots.txt controls *crawling*, robots meta controls *indexing*.

```html
<meta name="robots" content="index, follow">
<meta name="robots" content="noindex, nofollow">
<meta name="robots" content="noindex, max-image-preview:large">
```

```http
X-Robots-Tag: noindex, nofollow
X-Robots-Tag: googlebot: noindex
```

The HTTP header form is the only way to control indexing for non-HTML resources — PDFs, images, JSON endpoints, downloads.

## Why it matters

Every URL a search engine fetches has a policy, whether you set one or not. The default is `index, follow` — every fetched page becomes a candidate for the index, and every link is a discovery hop. That is right for your homepage and your articles; it is wrong for:

- **Staging and preview environments.** Forgetting `noindex` on a `staging.example.com` is a top-five SEO mistake. Once Google indexes a staging URL, it competes with production.
- **Internal search results, filtered listings, faceted-search permutations.** Infinite combinations of low-value pages dilute the site's crawl budget.
- **Thin, duplicate, or transactional pages.** Thank-you pages, cart pages, password-reset pages, account screens.
- **Pages waiting for content.** Empty category pages, "coming soon" pages.
- **Sensitive resources.** Print-only versions, internal exports, machine-readable feeds you don't want surfacing as snippets.

Public pages are required to be indexable; non-public pages are required to be non-indexable. Either way, the policy must be explicit and correct.

## How to implement

**Add the meta tag in `<head>`** for every HTML page that needs a non-default policy:

```html
<meta name="robots" content="noindex, follow">
```

`follow` keeps link equity flowing to the destinations even when the host page is not indexed. Pair it with `noindex` for staging, internal search, faceted listings.

**Use directives precisely.** The most useful ones, with the values search engines respect:

| Directive | Effect |
|---|---|
| `index` / `noindex` | Allow / disallow indexing of this page |
| `follow` / `nofollow` | Allow / disallow following links on this page |
| `noarchive` | Don't show a cached copy in results |
| `nosnippet` | Don't show a text snippet in results |
| `max-snippet:[n]` | Cap the snippet at *n* characters; `-1` means no limit |
| `max-image-preview:[none\|standard\|large]` | Control image-preview size |
| `max-video-preview:[n]` | Cap video preview at *n* seconds |
| `noimageindex` | Don't index images on this page |
| `unavailable_after:[date]` | Drop from the index after this RFC 822 / ISO 8601 date |

**Target a specific crawler when you need to.** Replace `robots` with `googlebot`, `bingbot`, `applebot`, or another user-agent token. A `robots` directive applies to all; a named-bot directive overrides it for that bot.

```html
<meta name="robots" content="noindex">
<meta name="googlebot-news" content="noindex, nofollow">
```

**Use `X-Robots-Tag` for non-HTML.** Cloudflare, Nginx, Apache, and CDN edge config can all set it per-path. Required for PDFs you don't want indexed.

```http
X-Robots-Tag: noindex, nofollow
```

**Don't combine `robots.txt: Disallow` with `noindex`.** If a URL is disallowed in robots.txt, crawlers never fetch it — and therefore never see the `noindex`. The page can still be indexed from external links, with no snippet. To truly de-index, allow crawl and serve `noindex`.

**Default policy is implicit.** A public page with no robots meta tag is `index, follow`. You do not need to add `<meta name="robots" content="index, follow">` — it's the default, and shipping it on every page is noise. Add the tag only when the policy differs.

## Common mistakes

- Staging site indexed because someone forgot to set `noindex`. Block it at the server with `X-Robots-Tag: noindex` site-wide on the staging host.
- `Disallow: /` in robots.txt on a staging site instead of `noindex`. The page may still appear in results with the URL but no snippet. Use `noindex` and let the crawler fetch and see it.
- Shipping a launch with `<meta name="robots" content="noindex, nofollow">` left over from staging. Diff every deploy.
- Conflicting directives: `<meta name="robots" content="index">` paired with `X-Robots-Tag: noindex`. The most restrictive wins; the result is usually not what was intended.
- Using `nofollow` to "save crawl budget" by stopping internal link discovery. It does not save budget; it just throws away signals.
- Relying on `noindex` to protect sensitive data. It is a request, not an access control. Use authentication.

## Verification

- View source on every key URL — confirm the `<meta name="robots">` value matches intent.
- `curl -I https://example.com/private/` — confirm `X-Robots-Tag` is set as expected.
- Google Search Console → URL Inspection. The "Indexing allowed" line is authoritative.
- After a staging deploy, search `site:staging.example.com` in Google. Zero results is the only acceptable answer.
- Audit tools (Screaming Frog, Sitebulb) export every URL's `robots` directive — review the list before launch and after major releases.
---

## redirects
Source: https://specification.website/spec/seo/redirects/

---
title: "Redirects (301/302/308)"
category: seo
status: required
url: https://specification.website/spec/seo/redirects/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "RFC 9110 — HTTP Semantics, redirection 3xx"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-redirection-3xx"
    publisher: "IETF"
  - title: "Redirects and Google Search"
    url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects"
    publisher: "Google Search Central"
  - title: "MDN — Redirections in HTTP"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Redirections"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Redirects (301/302/308)

> HTTP redirects send a client from one URL to another. Use 301 or 308 for permanent moves, 302 or 307 for temporary ones, and never chain more than necessary.

## What it is

A redirect is a `3xx` HTTP response that tells the client to fetch a different URL, named in the `Location` header. RFC 9110 defines the semantics of each status code.

```http
HTTP/1.1 301 Moved Permanently
Location: https://example.com/articles/csp
```

The four codes that matter in practice:

- **301 Moved Permanently** — the canonical URL has changed. Search engines transfer ranking signals to the target.
- **302 Found** — temporary redirect. The browser may switch the request method (a `POST` can become a `GET`). Use only for short-lived redirects.
- **307 Temporary Redirect** — like 302, but the method and body must be preserved. Safer for APIs.
- **308 Permanent Redirect** — like 301, but the method and body must be preserved.

For SEO, treat 301 and 308 as equivalent ("permanent"), and 302 and 307 as equivalent ("temporary").

## Why it matters

When you move a page, every link, bookmark, and search result pointing at the old URL becomes a problem. A permanent redirect tells crawlers to forget the old URL and consolidate ranking signals onto the new one. A temporary redirect tells them the old URL is the canonical one and will return.

Getting this wrong is one of the most common SEO mistakes. A 302 on a URL that has actually moved permanently can take months to be reinterpreted as a 301, during which the site loses traffic.

## How to implement

Rules of thumb:

- **URL has moved for good → 301 (or 308 if the method matters).**
- **Site is in maintenance, A/B test, or geo-redirect → 302 (or 307).**
- **HTTPS upgrade → 301** from `http://` to `https://`.
- **Trailing-slash or case canonicalisation → 301.**
- **Old domain → new domain → 301.** Keep the old domain registered indefinitely so the redirect keeps working.

Keep chains short. Each hop is a fresh request, costs latency, and risks a crawler giving up. `A → B → C` should be flattened to `A → C` and `B → C` wherever you control both rules.

```
Bad:  /old-name  → 301 → /new-name  → 301 → /new-name/
Good: /old-name  → 301 → /new-name/
      /new-name  → 301 → /new-name/
```

Other practical points:

- Redirect at the edge (web server, CDN, or origin) — not with `<meta http-equiv="refresh">` or JavaScript. Crawlers handle HTTP redirects reliably; meta-refresh and JS redirects are slower and ambiguous.
- For 301 chains across a migration, write the redirect map from your old URL inventory, not by guessing.
- Preserve query strings if the destination needs them.

## Common mistakes

- Using 302 for a permanent move.
- Redirecting every removed page to the home page. That hides the loss and confuses crawlers — return 410 or 404 instead.
- Redirect loops (`A → B → A`).
- Chains longer than three hops. Google stops following after about ten; users feel the latency long before that.

## Verification

- `curl -sI https://example.com/old-url` and check the status code and `Location` header.
- Use Search Console's URL inspection tool. It reports the redirect chain Google followed.
- Crawl the site to find chains and loops.
---

## robots-txt
Source: https://specification.website/spec/seo/robots-txt/

---
title: "robots.txt"
category: seo
status: recommended
url: https://specification.website/spec/seo/robots-txt/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "RFC 9309 — Robots Exclusion Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc9309.html"
    publisher: "IETF"
  - title: "Introduction to robots.txt"
    url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro"
    publisher: "Google Search Central"
  - title: "How Google interprets the robots.txt specification"
    url: "https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec"
    publisher: "Google Crawling Infrastructure"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# robots.txt

> A plain-text file at the site root that tells crawlers which paths they may or may not fetch. Standardised in RFC 9309 and supported by every major search engine.

## What it is

`robots.txt` is a plain-text file served at the root of a host that tells automated crawlers which URL paths they are allowed to fetch. The format was finalised as a standard in 2022 as RFC 9309.

It must be reachable at exactly `/robots.txt` on the host, served as `text/plain`, and returned with a `200 OK`. A `404` is interpreted as "no restrictions"; a `5xx` is interpreted as "crawl nothing" by most crawlers.

```txt
User-agent: *
Disallow: /admin/
Disallow: /cart
Allow: /admin/public-policy

Sitemap: https://example.com/sitemap.xml
```

## Why it matters

- Saves crawl budget on URLs that have no value in search (faceted filters, internal search, login, cart).
- Keeps staging paths and admin areas out of crawler logs.
- The `Sitemap:` directive is the canonical way to point crawlers at your sitemap when they have not been told another way.
- AI crawlers and SEO tools also honour it — it is the broadest signal you have for "do not fetch this".

It is not a security mechanism. Anything you do not want public must be behind authentication. Disallowed URLs can still appear in search results if they are linked from elsewhere.

## How to implement

Group rules by user-agent. The most specific user-agent wins per RFC 9309.

```txt
User-agent: Googlebot
Disallow: /private/

User-agent: *
Disallow: /admin/
Allow: /

Sitemap: https://example.com/sitemap_index.xml
```

Rules to follow:

- One host per file. `robots.txt` only applies to the host it is served from, including the scheme and port.
- Paths are case-sensitive and treated as URL prefixes. `/Admin` and `/admin` are different.
- Wildcards (`*`) and end-of-URL anchors (`$`) are supported by Google, Bing, and most other major crawlers, but they are not in RFC 9309. Use them carefully.
- `Crawl-delay` is non-standard. Google ignores it; Bing and Yandex honour it. Prefer per-crawler rate settings in their dashboards.
- Keep the file under 500 KiB. Google truncates above that.

## Common mistakes

- `Disallow: /` accidentally left over from staging. This blocks the entire site.
- Disallowing a URL that you also want deindexed. Crawlers cannot read a `noindex` they are not allowed to fetch.
- Adding a `Noindex:` line to robots.txt to keep a page out of search. It was never part of the standard, Google stopped honouring the unofficial version in September 2019, and unsupported lines are silently ignored. robots.txt governs crawling, not indexing: to deindex a page, let it be crawled and serve `noindex` in a meta robots tag or `X-Robots-Tag`.
- Blocking CSS and JS. Google needs to render the page to rank it.
- Serving `robots.txt` from a CDN that returns `5xx` during incidents — crawlers stop fetching the whole site.

## Verification

- Fetch `https://example.com/robots.txt` directly. Confirm `Content-Type: text/plain` and a `200`.
- Use Google Search Console's robots.txt report to see the parsed rules and any warnings.
---

## server-side-rendering
Source: https://specification.website/spec/seo/server-side-rendering/

---
title: "Server-side rendering"
category: seo
status: recommended
url: https://specification.website/spec/seo/server-side-rendering/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "Understand the JavaScript SEO basics"
    url: "https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics"
    publisher: "Google Search Central"
  - title: "Rendering on the Web"
    url: "https://web.dev/articles/rendering-on-the-web"
    publisher: "web.dev"
  - title: "Progressive enhancement"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Server-side rendering

> Crawlers, social scrapers, and AI agents index the HTML your server returns. Render your primary content and metadata server-side — via SSR, static generation, or prerendering — so it is in the initial response, not assembled later by client-side JavaScript.

## What it is

Server-side rendering means the server returns a complete HTML document — primary content, links, and metadata already in the markup — rather than an empty shell that a browser must fill in by running JavaScript. The label covers a family of approaches that all produce the same outcome: rendering per request (SSR), at build time (static generation), or ahead of time for a known set of URLs (prerendering). What matters for search is not which one you pick but that the response a crawler receives already contains the content.

The opposite is client-side rendering: the server sends a near-empty `<div id="root">`, and the page is assembled in the browser. A person on a fast device with JavaScript enabled sees no difference. A crawler often does.

## Why it matters

Search engines index the HTML they are served. Googlebot can render JavaScript, but it does so in a deferred second pass that is budget-limited and never guaranteed — and most other consumers do not render at all. Bing, the social-network scrapers that build link previews from Open Graph tags, and the AI crawlers behind assistant answers typically read the raw response and stop. If your title, copy, canonical URL, and structured data only appear after hydration, those consumers see an empty page.

The cost is concrete: pages that index late or not at all, link previews that fall back to a bare URL, and invisibility in AI surfaces (see the [agent-readiness overview](/spec/agent-readiness/agent-readiness-overview/)). Internal links injected by JavaScript may never be discovered, so whole sections of a site can go uncrawled.

## How to implement

- Render primary content and `<head>` metadata server-side, by whichever method fits: SSR for per-request content, static generation for stable content, prerendering for a fixed URL set.
- Treat client-side JavaScript as enhancement, not the delivery mechanism — the page should be readable and navigable before it runs (progressive enhancement).
- Put real `<a href>` links in the markup so crawlers can follow them; do not rely on click handlers for navigation.
- Send the correct HTTP status with the rendered document — a missing route returns `404`, not a `200` shell (see [soft 404s](/spec/seo/soft-404/)).

## Common mistakes

- **Assuming "Google renders JavaScript" settles it.** Rendering is deferred and budget-limited, and it does nothing for the non-Google consumers that drive previews and AI answers.
- **Metadata injected late.** Open Graph and canonical tags added by script are missed by scrapers that read only the response.
- **Cloaking by accident.** Serving crawlers a different rendered output from users risks quality penalties and broken trust. Render the same content for everyone.

## Verification

- `curl -s https://example.com/ | grep -i '<title'` — your title, main copy, and canonical link should be present without a browser.
- Disable JavaScript in DevTools and reload: primary content and navigation should still be there.
- Use Search Console's URL Inspection → "View crawled page" to see the HTML Google actually received, and confirm your content is in it.
---

## sitemap-index
Source: https://specification.website/spec/seo/sitemap-index/

---
title: "Sitemap index files"
category: seo
status: recommended
url: https://specification.website/spec/seo/sitemap-index/
updated: "2026-05-29T19:18:37.253Z"
sources:
  - title: "Sitemaps XML format — sitemap index files"
    url: "https://www.sitemaps.org/protocol.html#index"
    publisher: "sitemaps.org"
  - title: "Manage sitemaps for large sites"
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
    publisher: "Google Search Central"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Sitemap index files

> A sitemap of sitemaps. Used when a site has more than 50,000 URLs or wants to split sitemaps by content type for cleaner reporting.

## What it is

A sitemap index is an XML file that lists [other sitemap files](/spec/seo/xml-sitemaps/). Its root element is `<sitemapindex>` and each child `<sitemap>` has a `<loc>` pointing at a child sitemap, with an optional `<lastmod>`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-articles.xml</loc>
    <lastmod>2026-05-29</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2026-05-28</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-images.xml</loc>
    <lastmod>2026-05-29</lastmod>
  </sitemap>
</sitemapindex>
```

Submit the index URL to Search Console. Crawlers will fetch the index, then each child sitemap, then each URL.

## Why it matters

Two reasons to use an index:

1. **Scale.** A single sitemap is capped at 50,000 URLs and 50 MB uncompressed. Once a site exceeds either, the only standard-compliant option is to split into multiple sitemaps and reference them from an index.
2. **Reporting.** Search Console reports submitted-vs-indexed counts per sitemap. Splitting by content type (articles, products, categories, images) lets you see at a glance which section has indexing problems instead of one big number for the whole site.

A site with 500 URLs does not need an index. Adding one anyway is harmless but adds a layer of fetching that gains you nothing.

## How to implement

Split sitemaps by something meaningful:

- **By content type** — `sitemap-posts.xml`, `sitemap-pages.xml`, `sitemap-products.xml`.
- **By language or region** — `sitemap-en.xml`, `sitemap-nl.xml`. Pairs well with `hreflang`.
- **By date** — `sitemap-2025.xml`, `sitemap-2026.xml` for archive-heavy sites.

Rules:

- Up to **50,000 child sitemaps** per index, and the index itself is capped at 50 MB uncompressed.
- Every child sitemap must be on the same host as the index, with limited cross-host exceptions.
- `<lastmod>` on the index entry should reflect the newest `<lastmod>` inside the child sitemap. This lets crawlers skip refetching unchanged sections.
- Reference the index from `robots.txt` and submit only the index in Search Console — do not also submit each child individually.

## Common mistakes

- Pointing the index at child sitemaps on a different host.
- Stale `<lastmod>` on the index while the child sitemap has fresh URLs.
- Splitting arbitrarily (sitemap-1, sitemap-2) so the reporting buckets are meaningless.
- Submitting both the index and each child sitemap, causing duplicate reports.

## Verification

- Fetch the index URL. Confirm the root element is `<sitemapindex>` and each child resolves to a valid sitemap.
- Validate against the sitemaps.org XSD.
- In Search Console, confirm the index shows the expected number of child sitemaps and their per-sitemap indexing stats.
---

## soft-404
Source: https://specification.website/spec/seo/soft-404/

---
title: "Soft 404s"
category: seo
status: avoid
url: https://specification.website/spec/seo/soft-404/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "How HTTP status codes affect Google's crawlers"
    url: "https://developers.google.com/crawling/docs/troubleshooting/http-status-codes"
    publisher: "Google Crawling Infrastructure"
  - title: "RFC 9110 — 404 Not Found"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-404-not-found"
    publisher: "IETF"
  - title: "MDN — HTTP response status codes"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Soft 404s

> A page that looks like a 'not found' message to a user but returns 200 OK to a crawler. Search engines treat soft 404s as a quality problem and often refuse to index them.

## What it is

A soft 404 is a URL that **returns `200 OK`** but **renders a page indicating the content is missing**. The classic examples:

- An empty search results page that says "no results found" but returns 200.
- A category page with zero products that renders the chrome and a "nothing here" message.
- A single-page app that routes every unknown URL to a generic "page not found" component without changing the status code.
- A CMS that, when a slug is missing, redirects to the home page (a different bug, but classified by Google in the same family).

The HTTP semantics and the human-readable content disagree. RFC 9110 is explicit: `404 Not Found` is the correct status for a missing target. A page that says "not found" with `200` is lying to the protocol.

## Why it matters

Crawlers use the status code as the source of truth. When they see `200`, they assume the content is valid, index it, and may rank it for queries it should never appear for. When the user clicks through, they land on an empty page and bounce.

Once Google's quality systems notice the pattern, they reclassify the URL as a soft 404 and drop it from the index, often along with similar URLs across the site. Search Console's "Soft 404" report exists specifically to surface these. A site with many soft 404s gets crawled less, because the crawler stops trusting the status codes.

It is also an accessibility and user-experience problem. Screen readers and browser back-button behaviour rely on status codes being accurate.

## How to detect

- **Search Console → Pages → Why pages aren't indexed → Soft 404.** This is the authoritative list of URLs Google has reclassified.
- **Server logs.** Look for `200` responses on URLs that match patterns like `/search`, `/category/<id>`, or known SPA fallback routes, especially with very low time-on-page.
- **Crawl with a status-aware tool.** Compare the rendered DOM (for phrases like "no results", "page not found", "this product is no longer available") against the HTTP status.

## How to fix

- **Return the right status.** A missing page returns `404`. A removed page that will never come back returns `410 Gone` — both signal "do not index" and are correct.
- **For SPAs**, configure the server or edge to return the correct status before serving the fallback HTML. The same shell can render, but the response must be `404`.
- **For empty category and search pages**, decide whether the URL should exist at all. If it should, return a useful page (suggestions, related products) but keep `200`. If it should not, return `404`.
- **Do not redirect missing pages to the home page.** That is the worst of both worlds — Google treats it as a soft 404 anyway, and users get no signal about what went wrong.

## Verification

- `curl -sI https://example.com/this-does-not-exist` should return `404` or `410`, not `200` and not `302`.
- After deploying the fix, request reindexing for affected URLs in Search Console and watch the Soft 404 count fall on the next crawl cycle.
---

## structured-data
Source: https://specification.website/spec/seo/structured-data/

---
title: "Structured data (JSON-LD)"
category: seo
status: recommended
url: https://specification.website/spec/seo/structured-data/
updated: "2026-08-03T00:00:00.000Z"
sources:
  - title: "Schema.org"
    url: "https://schema.org/"
    publisher: "schema.org"
  - title: "Latest Google Search documentation updates"
    url: "https://developers.google.com/search/updates"
    publisher: "Google Search Central"
  - title: "Introduction to structured data markup in Google Search"
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
    publisher: "Google Search Central"
  - title: "JSON-LD 1.1 Specification"
    url: "https://www.w3.org/TR/json-ld11/"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Structured data (JSON-LD)

> Machine-readable annotations that describe the content of a page using the schema.org vocabulary. JSON-LD is the format search engines and AI agents expect.

## What it is

Structured data is a set of machine-readable statements that describe what a page is about, using the shared vocabulary at [schema.org](https://schema.org/). The recommended serialisation is JSON-LD: a `<script type="application/ld+json">` block inside `<head>` (or, less commonly, `<body>`).

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "What is HSTS?",
  "datePublished": "2026-05-29",
  "author": {
    "@type": "Person",
    "name": "Jane Doe"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Example",
    "url": "https://example.com"
  }
}
</script>
```

Microdata and RDFa are also accepted, but JSON-LD is the de facto standard because it sits separate from the visible markup.

## Why it matters

Structured data is not a ranking signal. Adding it does not move a page up the results, and Google grants a rich result only to pages already eligible, so valid markup is necessary but never sufficient. What it changes is legibility, not rank: how the result looks, and what a machine can quote without guessing.

Two audiences read it heavily:

- **Search engines** use it to power rich results (article cards, breadcrumbs, product carousels, knowledge-panel facts) instead of a plain blue link.
- **AI agents and answer engines** rely on it as the ground truth for facts they may quote. A `Person` schema with a `sameAs` linking to your verified profiles is the cleanest way to assert identity.

It is also the most stable contract between a publisher and the rest of the web. The HTML can change; the JSON-LD describes meaning.

## How to implement

Stick to a small set of well-supported types:

- **`WebSite`** — site-wide, on the home page. Include `url` and `name`, and `potentialAction` for sitelinks search if appropriate.
- **`Organization`** or **`Person`** — for the publisher and authors. Include `sameAs` arrays pointing at verified profiles.
- **`BreadcrumbList`** — on every page that has a breadcrumb trail.
- **`Article`** or **`BlogPosting`** — for articles, with `headline`, `datePublished`, `dateModified`, `author`, `image`.
- **`Product`**, **`Offer`**, **`AggregateRating`** — for e-commerce, where eligibility is strict.
- **`FAQPage`** — only when the page genuinely has a Q-and-A list visible to users. Google [stopped showing the FAQ rich result on 7 May 2026 and deleted its documentation on 15 June 2026](https://developers.google.com/search/updates): [`FAQPage`](https://schema.org/FAQPage) is still valid schema.org vocabulary, but it no longer produces a Google search feature, and no answer engine has confirmed it favours the markup over rendered HTML — so add it for genuine visible content, not for SERP or "GEO" gain. Never stuff fake FAQs. ([Further reading](https://joost.blog/faq-schema-cycle/) on why the format was abused into deprecation, and the proposed `FAQSection` type for Q-and-A that is a *section* of a page rather than its main entity.)

Rules:

- **Mirror what is visible on the page.** Do not declare facts in JSON-LD that the page does not state. Google calls this "out of sync" data and ignores or penalises it.
- **One graph per page is cleaner than many fragments.** Use `@graph` to nest related entities and `@id` URIs to cross-reference them.
- **Use absolute URLs** in `@id`, `url`, `image`, and `sameAs`.
- **Keep dates in ISO 8601.**
- **Validate.** Schema.org evolves; what is valid one year may be deprecated the next.

## Common mistakes

- Fabricating `aggregateRating` or `Review` to win stars. Google detects this and removes the rich result, sometimes the whole site's eligibility.
- Marking up navigation, footers, or sidebars as if they were the main content.
- Forgetting to update structured data when the page content changes.
- Multiple disagreeing `@type` declarations across plugins or templates on the same page.

## Verification

- Use the [Schema.org validator](https://validator.schema.org/) for spec conformance.
- Use Google's [Rich Results Test](https://search.google.com/test/rich-results) for eligibility.
- Check Search Console's "Enhancements" reports after deployment.
---

## url-structure
Source: https://specification.website/spec/seo/url-structure/

---
title: "URL structure"
category: seo
status: recommended
url: https://specification.website/spec/seo/url-structure/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "RFC 3986 — Uniform Resource Identifier (URI): Generic Syntax"
    url: "https://www.rfc-editor.org/rfc/rfc3986"
    publisher: "IETF"
  - title: "URL structure best practices"
    url: "https://developers.google.com/search/docs/crawling-indexing/url-structure"
    publisher: "Google Search Central"
  - title: "URL — Living Standard"
    url: "https://url.spec.whatwg.org/"
    publisher: "WHATWG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# URL structure

> URLs are the most stable identifier on the web. Keep them lowercase, hyphenated, descriptive, and shallow. Treat them as a public API for your content.

## What it is

A URL is the canonical name for a resource on the web. Its syntax is defined by RFC 3986 and refined for the browser by the WHATWG URL Living Standard. The path component — everything after the host — is where structure choices have the most impact on SEO and usability.

```
https://example.com/articles/web-security/csp
            ^host       ^path
```

## Why it matters

URLs are quoted in chat, pasted into documents, printed on slides, and saved in bookmarks for years. Once a URL is public, it is effectively forever — changing it requires a redirect, and chains of redirects degrade. They also appear under the page title in search results, so a clean, readable URL is a small but real signal of quality to both users and crawlers.

A consistent URL structure also makes analytics, A/B testing, redirect rules, and access controls dramatically simpler.

## How to implement

Treat URLs as a public API:

- **Lowercase only.** RFC 3986 says the path is case-sensitive, so `/About` and `/about` are different URLs. Pick lowercase and enforce a 301 redirect for any uppercase variant.
- **Hyphens, not underscores.** Search engines tokenise on hyphens but not underscores. `web-security` reads as two words; `web_security` reads as one.
- **No trailing whitespace, no encoded spaces.** Replace spaces with hyphens before the URL is ever generated.
- **Descriptive slugs.** `/articles/csp` beats `/articles/12345`. Both work, but the readable one survives social sharing better.
- **Avoid deep nesting.** Aim for three or fewer path segments after the host. Deep URLs (`/section/sub/sub/sub/post`) signal low priority and are hard to refactor.
- **Pick trailing-slash or no-trailing-slash and stick with it.** Both work; mixing creates duplicate-content risk. Use a 301 to enforce the chosen form.
- **Query parameters are for filters, not content.** Canonical content should have a clean path. Parameters are fine for sort order, pagination, and tracking, but the canonical link should strip them.
- **ASCII where possible.** Modern browsers handle IDNs and percent-encoded UTF-8 fine, but non-ASCII URLs break in older tooling, copy-paste, and email clients.

```
Good:  https://example.com/articles/web-security/csp
Bad:   https://example.com/Articles/Web_Security/CSP/?id=12345&utm_source=x
```

## Common mistakes

- Mixed case across the site, with no canonical enforcement.
- Including dates that go stale: `/2023/10/csp` looks outdated by 2026 even if the content has been kept current.
- Session IDs or tracking parameters baked into canonical URLs.
- Renaming URLs every CMS migration. Each rename costs link equity even with redirects.

## Verification

- Crawl the site with a tool like Screaming Frog or a sitemap fetcher. Check for mixed-case duplicates and trailing-slash inconsistencies.
- Confirm 301 redirects enforce the canonical form.
- Check Search Console's Pages report for "Duplicate, Google chose different canonical" — that often points at URL-structure problems.
---

## xml-sitemaps
Source: https://specification.website/spec/seo/xml-sitemaps/

---
title: "XML sitemaps"
category: seo
status: recommended
url: https://specification.website/spec/seo/xml-sitemaps/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "Sitemaps XML format"
    url: "https://www.sitemaps.org/protocol.html"
    publisher: "sitemaps.org"
  - title: "Build and submit a sitemap"
    url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap"
    publisher: "Google Search Central"
  - title: "HTML Standard — Interactions with XPath and XSLT"
    url: "https://html.spec.whatwg.org/multipage/infrastructure.html#interactions-with-xpath-and-xslt"
    publisher: "WHATWG"
  - title: "Removing XSLT for a more secure browser"
    url: "https://developer.chrome.com/docs/web-platform/deprecating-xslt"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# XML sitemaps

> An XML file listing the canonical URLs of a site, with optional metadata about when each was last changed. The fastest way to tell a search engine what exists.

## What it is

An XML sitemap is a structured list of the URLs a site wants search engines to know about. The format is defined by sitemaps.org and supported by Google, Bing, Yandex, and others. Each entry is a `<url>` element with a required `<loc>` and optional `<lastmod>`, `<changefreq>`, and `<priority>`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/articles/hsts</loc>
    <lastmod>2026-05-12</lastmod>
  </url>
  <url>
    <loc>https://example.com/articles/csp</loc>
    <lastmod>2026-04-30</lastmod>
  </url>
</urlset>
```

## Why it matters

Crawlers find URLs by following links. A sitemap is a shortcut: it lists every canonical URL, even those that are only weakly linked, and tells the crawler when they last changed. Without one, new pages can take days or weeks to be discovered.

A sitemap does not make a page rank, and inclusion is not a promise it will be indexed. It is a discovery and scheduling hint, nothing more: a URL can sit in the sitemap for weeks and stay out of the index if the search engine judges it thin or duplicate. Indexing and ranking are decided after the crawl, on the page itself, not on its presence in a list.

A sitemap is also the cleanest way to surface translation pairs, image and video metadata, and large archives. It is the main signal that powers crawl scheduling on Bing and the IndexNow protocol.

## How to implement

Follow the spec:

- **URL must be absolute.** Include the scheme and host. The sitemap must live on the same host as the URLs it lists, with limited exceptions.
- **One sitemap, 50,000 URLs and 50 MB uncompressed maximum.** Past that, split into multiple sitemaps and add a [sitemap index](/spec/seo/sitemap-index/).
- **List canonical URLs only.** A URL that redirects, returns 404, or has a different canonical confuses crawlers.
- **Set `<lastmod>` honestly.** Use ISO 8601 / W3C date format. Google uses it as a hint when scheduling recrawls; touching it on every deploy degrades that signal.
- **`<changefreq>` and `<priority>` are ignored by Google.** Other crawlers may use them, but do not spend effort tuning them.
- **Gzip is allowed.** Serve as `application/xml` (`.xml`) or `application/x-gzip` (`.xml.gz`).
- **Reference it from `robots.txt`** with `Sitemap: https://example.com/sitemap.xml` and submit it in Search Console / Bing Webmaster Tools.

Generate sitemaps dynamically from your content source, not by crawling your own site — that way you cannot accidentally include orphaned or redirected URLs.

**This site ships it.** `specification.website` generates [`/sitemap-index.xml`](/sitemap-index.xml) at build time from the content collection, and sets each `<lastmod>` from the entry's `updated` front matter — the same field the [RSS feed](/rss.xml) uses — rather than the build timestamp, so the date only moves when the content actually changes.

## Do not attach an XSL stylesheet

A sitemap opened in a browser shows raw XML, which is hostile to anyone who is not a crawler. The long-standing fix was an `<?xml-stylesheet?>` processing instruction pointing at an XSLT stylesheet, which the browser applied to render the sitemap as a readable HTML table. That advice has expired.

Since August 2026 the [HTML Standard](https://html.spec.whatwg.org/multipage/infrastructure.html#interactions-with-xpath-and-xslt) tells authors to avoid client-side XSLT outright: browser XSLT implementations are, in its words, highly susceptible to memory-safety vulnerabilities, and the feature is being removed from the web platform. Chrome plans to disable native XSLT in version 158, scheduled for 17 November 2026, with temporary exceptions for origin-trial and enterprise-policy participants until Chrome 176, scheduled for 17 August 2027. Firefox and WebKit have also signalled removal intent; they do not share Chrome's published timetable.

The failure is worth understanding precisely, because it is milder than it sounds and that is exactly why it gets left in place too long. Crawlers never read the stylesheet; they parse the XML underneath it, and an `<?xml-stylesheet?>` instruction a parser cannot process is ignored rather than fatal. So nothing about discovery or indexing breaks. What breaks is the human view: a URL that rendered a tidy table starts rendering the browser's raw-XML fallback, and nobody notices until someone opens the sitemap and reports it as a bug.

XML itself and XML styled with CSS remain supported; this removal concerns native XSLT transformations. If you want a page a person can read, write one in HTML and link it. It costs no more than the stylesheet did, it is crawlable and linkable in its own right, and it does not depend on a feature three engines are deleting.

**This site no longer does it.** `specification.website` pointed its sitemaps at a `/sitemap.xsl` until this page changed; the processing instruction has been dropped rather than left to break.

## Common mistakes

- Listing non-canonical URLs (parameters, session IDs, alternate-case paths).
- Including URLs that return 3xx, 4xx, or 5xx — crawlers will drop trust in the whole sitemap.
- Updating `<lastmod>` on every build even when content has not changed.
- Splitting by URL hash for no reason. Split by content type or section so each sitemap is meaningful on its own.

## Verification

- Fetch the sitemap directly. Confirm `Content-Type: application/xml` and a `200 OK`.
- Validate against the sitemaps.org XSD.
- Check Search Console's Sitemaps report for parse errors and discovered-vs-indexed counts.
---

