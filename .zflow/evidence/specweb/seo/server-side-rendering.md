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
