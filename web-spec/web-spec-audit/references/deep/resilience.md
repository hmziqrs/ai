# Resilience — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/resilience/. Assembled from the local evidence corpus (.zflow/evidence/specweb/resilience/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## deprecation-and-sunset
Source: https://specification.website/spec/resilience/deprecation-and-sunset/

---
title: "Deprecation and Sunset"
category: resilience
status: optional
url: https://specification.website/spec/resilience/deprecation-and-sunset/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "RFC 9745 — The Deprecation HTTP Response Header Field"
    url: "https://www.rfc-editor.org/rfc/rfc9745"
    publisher: "IETF"
  - title: "RFC 8594 — The Sunset HTTP Header Field"
    url: "https://www.rfc-editor.org/rfc/rfc8594"
    publisher: "IETF"
  - title: "IANA — Link Relations Registry"
    url: "https://www.iana.org/assignments/link-relations/link-relations.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Deprecation and Sunset

> When you retire an endpoint, announce it in machine-readable form: the Deprecation and Sunset response headers tell clients it is going away, when, and where to go next — so integrations migrate before anything breaks.

## What it is

When you retire an HTTP endpoint — an old API version, a moved feed, a well-known URI you no longer serve — two response headers let you announce it in machine-readable form so clients migrate before anything breaks.

- **`Deprecation`** (RFC 9745) marks a resource as deprecated. Its value is a date: `Deprecation: @1717200000`. A date in the past means it _was_ deprecated then; a future date means it _will_ be. The resource still works — this is advance notice.
- **`Sunset`** (RFC 8594) gives the date the resource is expected to stop responding: `Sunset: Tue, 30 Jun 2026 23:59:59 GMT`. It should be a future date while the resource is live; once it passes, requests typically return `410 Gone`.

The `Sunset` date **must not be earlier** than the `Deprecation` date. Pair either header with a `Link`: `rel="deprecation"` points to human documentation about the change, `rel="sunset"` to a retirement or migration policy, and `rel="successor-version"` to the replacement.

## Why it matters

- **Clients and agents find out on their own.** A consumer hitting the endpoint reads the date and the link, and schedules migration — no out-of-band emails or guesswork.
- **It turns a silent break into a planned one.** Without these headers an endpoint simply vanishes one day and every integration fails at once.
- **The signal is auditable.** Anyone can `curl -I` the endpoint and see when it is going away and where to go next.
- **It complements a real status code.** A retired URL should still return the right status (`404`/`410`) and, where a replacement exists, a [redirect](/spec/seo/redirects/); these headers add the _when_ and _why_.

## How to implement

While the resource is still live, emit the headers and keep serving it normally:

```
Deprecation: @1717200000
Sunset: Tue, 30 Jun 2026 23:59:59 GMT
Link: <https://api.example.com/v2/orders>; rel="successor-version",
      <https://developer.example.com/deprecation/orders-v1>; rel="deprecation"
```

Announce as early as you can — the point is lead time. Do not start failing before the Sunset date. Once the resource is genuinely gone, return `410 Gone` (or `404`); you may keep the `Sunset` header to record when it went, plus a `rel="deprecation"` link so latecomers still find the explanation. RFC 8594 explicitly covers this post-sunset `410` case.

This site ships a worked example. `/.well-known/ai.txt` was retired, and rather than a bare 404 it returns `410 Gone` carrying `Deprecation`, `Sunset`, and a `rel="deprecation"` link back to this page (see `functions/_middleware.ts`). The `ai.txt` convention itself proved defunct — express AI-crawler preferences via [robots.txt](/spec/seo/robots-txt/) and content signals instead.

### Announcing your own support window

The headers are usually read as "this URL is being retired", but they answer a broader question: *how long will this keep working?* That question also arises when nothing is being retired at all — when a still-valid way of talking to your endpoint is one you intend to stop accepting.

Our MCP server is the case in point. The 2026-07-28 revision of the protocol replaced the `initialize` handshake with per-request negotiation, but it did not deprecate the handshake: the older revisions are Final, not withdrawn, and the protocol says nothing about when a server should stop honouring them. That makes the support window a decision by the server, not by the specification — and a decision nobody can discover by reading the standard. So responses to a legacy `initialize` carry `Deprecation`, a `Sunset` of 28 July 2027, and a `rel="deprecation"` link, while the endpoint itself carries nothing: `/mcp` is not going anywhere, only our willingness to answer the handshake on it. See [MCP and tool discovery](/spec/agent-readiness/mcp-and-tool-discovery/).

Two things make that legitimate rather than a misuse of the headers. The scope is a real one — the response to a particular request, not the URL in general — and the commitment is one we are actually making and can be held to. If you borrow this pattern, be clear in your own documentation that the dates are yours. Attributing them to an upstream standard that never set them is a claim someone will check.

## Common mistakes

- A `Sunset` earlier than `Deprecation`. Invalid per RFC 9745.
- Emitting `Deprecation` but never a `Sunset` or a successor link — consumers learn it is deprecated but not when it dies or what to use instead.
- Failing the resource _before_ the announced Sunset. Deprecation is a promise to keep working until then.
- Using a bare `Deprecation: true`. The value is a structured-field date, not a boolean.
- Announcing a sunset you have no intention of honouring, because a standard "moved on" from a feature. Check whether the thing is actually scheduled for removal; if the date is your policy rather than the standard's, say so.

## Verification

```
curl -sI https://api.example.com/v1/orders | grep -iE 'deprecation|sunset|link'
```

Confirm `Deprecation` carries a date, `Sunset` is not earlier, and a `rel="deprecation"` or `rel="successor-version"` link is present. On a fully retired URL, confirm the status is `410`/`404`, not `200`.
---

## error-pages
Source: https://specification.website/spec/resilience/error-pages/

---
title: "Custom error pages (404, 500)"
category: resilience
status: required
url: https://specification.website/spec/resilience/error-pages/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "RFC 9110 — HTTP Semantics: 404 Not Found"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-404-not-found"
    publisher: "IETF"
  - title: "RFC 9110 — HTTP Semantics: 500 Internal Server Error"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-500-internal-server-error"
    publisher: "IETF"
  - title: "How HTTP status codes affect Google's crawlers"
    url: "https://developers.google.com/crawling/docs/troubleshooting/http-status-codes"
    publisher: "Google Crawling Infrastructure"
  - title: "MDN — HTTP response status codes"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Custom error pages (404, 500)

> Custom error pages must return the correct HTTP status code, explain what went wrong in plain language, and offer the user a way forward without leaking implementation details.

## What it is

A custom error page is the document a server returns when it cannot fulfil a request. The two pages every site needs are the **404 Not Found** for missing resources and the **500 Internal Server Error** for unexpected failures.

A custom error page has two parts that are easy to conflate. One is the document the human reads: a styled page, matching the rest of the site, that explains what went wrong. The other is the HTTP status code in the response headers, which the human never sees but every crawler, link checker, and monitoring tool reads. Only the status code is the contract. A well-designed "page not found" that returns `200 OK` has reassured the visitor and misinformed every machine.

## Why it matters

That mismatch has a name. A "page not found" message that returns `200 OK` is a **soft 404**: search engines index the error page, link checkers see no broken links, and analytics tools count failures as normal traffic. Google explicitly treats soft 404s as a quality problem.

For humans, a generic server error page or a stack trace damages trust and may leak file paths, framework versions, or database details that help an attacker. A custom page keeps users in the site and gives them an obvious next step.

## How to implement

For a **404**:

- Return HTTP status `404`. Verify with `curl -I https://example.com/does-not-exist`.
- Set a clear heading: "We could not find that page."
- Offer a search box, a link to the homepage, and links to the most visited sections.
- Keep navigation, header, and footer so the user can carry on browsing.
- Log the request so you can find broken inbound links.

For a **500**:

- Return HTTP status `500`.
- Acknowledge the failure in one sentence. Do not show stack traces, framework names, or environment variables.
- Offer a retry, a link home, and a support contact if you have one.
- Log the underlying error server-side with a request ID and surface that ID to the user so support can correlate.

Configure both pages at the server or edge layer (Nginx `error_page`, Apache `ErrorDocument`, Cloudflare custom error pages, Netlify `_redirects` with status overrides) so they work even when the application is down.

**Localise error pages too.** On a multilingual site, the 404 a French visitor lands on should be in French — the URL prefix (`/fr/this-page-does-not-exist`) already tells the server which locale to render. Match the page's `lang` attribute, translate the heading and copy, and keep the search box and home link pointed at the same locale.

## Common mistakes

- Returning `200 OK` for a "page not found" message — the classic soft 404.
- Redirecting all unknown URLs to the homepage with a `302`. Search engines flag this as a soft 404 too.
- Exposing stack traces, SQL errors, or framework debug pages in production.
- A 404 page that loads a heavy JavaScript bundle before showing the message.
- Forgetting the 500 page entirely, so users see the default web server error.

## Verification

- `curl -I https://example.com/this-does-not-exist` returns `HTTP/2 404`.
- Force a 500 in staging and confirm the response code and that no stack trace leaks.
- Check Google Search Console under **Pages** for "Soft 404" warnings.
- Run a link checker against your site and confirm broken links surface as 404s, not 200s.
---

## graceful-degradation
Source: https://specification.website/spec/resilience/graceful-degradation/

---
title: "Graceful degradation when JavaScript fails"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/graceful-degradation/
updated: "2026-06-08T20:15:00.000Z"
sources:
  - title: "WHATWG HTML Standard — The noscript element"
    url: "https://html.spec.whatwg.org/multipage/scripting.html#the-noscript-element"
    publisher: "WHATWG"
  - title: "MDN — Progressive enhancement"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement"
    publisher: "MDN"
  - title: "MDN — Graceful degradation"
    url: "https://developer.mozilla.org/en-US/docs/Glossary/Graceful_degradation"
    publisher: "MDN"
  - title: "MDN — <noscript>"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/noscript"
    publisher: "MDN"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Graceful degradation when JavaScript fails

> Core content and primary navigation should keep working when JavaScript fails to load or throws — treat client-side scripts as an enhancement, not the delivery mechanism.

## What it is

Graceful degradation means the page's core content and primary navigation keep working when JavaScript fails — not only when it is switched off, but when a script times out, a CDN returns a 404 for the bundle, an exception throws halfway through execution, or an extension blocks it. The baseline is delivered in HTML and CSS; JavaScript is layered on top, and its failure costs a single feature, not the whole page.

This is the runtime companion to [server-side rendering](/spec/seo/server-side-rendering/). SSR asks whether the content is in the server's response at all; graceful degradation asks whether the page still works after that response arrives but the scripts do not.

## Why it matters

Script delivery fails more often than people assume — a dropped packet on a flaky mobile connection, a request that raced a deploy, a corporate proxy, an ad blocker with an over-broad rule. A page that only renders its article body, opens its menu, or submits its forms after JavaScript runs turns every one of those failures into a blank screen. The content was already in the HTML; one failed request hid it.

The cost also lands on the long tail of non-rendering clients — feed readers, link-preview scrapers, and many AI crawlers — for which "JavaScript required" is indistinguishable from "broken".

## How to implement

- Deliver core content and navigation in the initial HTML. Use real `<a href>` links and real `<form action>` so both function before any script runs.
- Treat client behaviour as enhancement: attach it to markup that already works, and feature-detect before using it.
- Never gate visible content behind a successful `fetch`. If a script reveals or hydrates content, ensure that content is present and readable without it.
- Use `<noscript>` as a backstop for the no-JavaScript path — but remember it does **not** fire when JavaScript loads and then errors, so it cannot be the whole strategy.
- Keep menus, accordions, and dialogs operable with native elements (`<details>`, `<dialog>`) or CSS where you can.

This site is a worked example: every spec page, the checklist, and all navigation render and work with JavaScript fully disabled. Only the ⌘K search overlay needs JavaScript, and the same search is reachable as a plain page at `/search/`.

## Common mistakes

- Rendering the whole page into an empty `<div id="root">`, so a script failure yields a white screen.
- Links and buttons built from `<div>`s wired up by JavaScript — dead if the script never runs (see [empty links and buttons](/spec/accessibility/empty-links-buttons/)).
- Relying on `<noscript>` alone, which does nothing when a script loads but then throws.
- Hiding content with CSS and revealing it with JavaScript, leaving it permanently hidden after an error.

## Verification

- Disable JavaScript in DevTools and reload: core content and primary navigation must still be present and usable.
- In DevTools → Network, block the JS bundle's URL and reload — the page should still work.
- Throttle to slow 3G and read the page before scripts finish; it should be legible mid-load.
- `curl https://example.com/` and confirm the main content is in the returned HTML, not just a `<script>` tag.
---

## ipv6
Source: https://specification.website/spec/resilience/ipv6/

---
title: "IPv6 reachability"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/ipv6/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "RFC 3596 — DNS Extensions to Support IP Version 6"
    url: "https://www.rfc-editor.org/rfc/rfc3596"
    publisher: "IETF"
  - title: "RFC 4213 — Basic Transition Mechanisms for IPv6 Hosts and Routers"
    url: "https://www.rfc-editor.org/rfc/rfc4213"
    publisher: "IETF"
  - title: "RFC 8305 — Happy Eyeballs Version 2: Better Connectivity Using Concurrency"
    url: "https://www.rfc-editor.org/rfc/rfc8305"
    publisher: "IETF"
  - title: "Internet.nl — Website test"
    url: "https://internet.nl/"
    publisher: "Internet.nl"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# IPv6 reachability

> Publish AAAA records for the web server and the authoritative name servers, make sure every IPv6 address actually answers, and serve the same site over IPv6 as over IPv4.

## What it is

IPv6 is the successor to IPv4, with 128-bit addresses instead of 32-bit ones. A host name is reachable over IPv6 when DNS publishes an `AAAA` record for it (RFC 3596) and something at that address answers. Running both protocols side by side, with an `A` and an `AAAA` record for the same name, is called dual stack (RFC 4213), and it is how almost every IPv6-capable site is run today.

Two separate things need IPv6, and the second is often forgotten:

1. **The web server.** `example.com` and `www.example.com` each need an `AAAA` record that points at a host serving the site.
2. **The authoritative name servers.** The servers listed in your `NS` records need `AAAA` records of their own, so an IPv6-only resolver can look your domain up at all.

The wrong belief most operators hold is that a missing or broken `AAAA` record would show up as a visible outage. It usually does not. Browsers use Happy Eyeballs (RFC 8305): they try IPv6 and IPv4 almost at once and keep whichever connects first. If the IPv6 address is dead, the browser quietly falls back to IPv4 after a short delay, and the operator testing from a desktop never notices. The failure lands on clients that do not race the two protocols, on IPv6-only networks, and on tests such as Internet.nl that check each protocol on its own.

## Why it matters

- **IPv6-only and IPv6-preferred networks are common.** Many mobile carriers hand out only IPv6 addresses and reach IPv4 through a translation layer (NAT64). Native IPv6 skips that layer, and its latency and failure modes.
- **IPv4 addresses are scarce.** Hosts increasingly share IPv4 addresses behind carrier-grade NAT, which makes IPv4 paths slower and harder to debug than direct IPv6 ones.
- **A broken `AAAA` costs time even when it "works".** Every Happy Eyeballs fallback adds a connection delay, typically a few hundred milliseconds, before the first byte.
- **Name servers are a single point of failure.** If every authoritative server is IPv4-only, an IPv6-only resolver cannot resolve any name in your zone, however well your web server is configured.

## How to implement

1. **Check whether your host supports IPv6.** Most CDNs and managed platforms do, often by default. If yours does not, that is a reason to move, not a reason to skip the record.
2. **Publish `AAAA` records** for every name that has an `A` record: the apex, `www`, and any other host name that serves the site.

   ```
   example.com.        300  IN  A     192.0.2.10
   example.com.        300  IN  AAAA  2001:db8::10
   www.example.com.    300  IN  CNAME example.com.
   ```

3. **Make sure the server listens on IPv6.** The web server, the firewall, and any load balancer all need to accept connections on ports 80 and 443 over IPv6, with the same certificate.
4. **Serve the same site on both.** The same content, the same redirects (HTTP to HTTPS, apex to `www` or the reverse), the same security headers. Internet.nl compares the two responses and flags differences.
5. **Use name servers with IPv6.** Managed DNS providers almost all publish `AAAA` records for their name servers; check that yours do, and that at least two of them are reachable over IPv6.
6. **Monitor both protocols separately.** An uptime check that resolves the name normally will happily use IPv4 and miss a dead IPv6 path. Add a check pinned to IPv6. See [monitoring and uptime](/spec/resilience/monitoring-uptime/).

This site ships it: the apex and both of its Cloudflare name servers have `AAAA` records, and the site answers identically over IPv6.

## Common mistakes

- **An `AAAA` record pointing at a host that does not listen on IPv6.** Often left over from a migration, or added by a control panel for a server whose IPv6 firewall drops port 443. Browsers hide it; other clients time out.
- **Different behaviour over IPv6.** An old virtual-host config that serves a default page, skips the HTTPS redirect, or omits HSTS on the IPv6 listener.
- **A certificate that only covers the IPv4 path.** Separate front ends per protocol drift apart, and one ends up with an expired or mismatched certificate.
- **IPv4-only name servers.** The web server is dual stack, but nothing in the delegation can be reached over IPv6.
- **Adding `AAAA` for the apex but not for `www`**, or the reverse, so half the site is reachable.

## Verification

- `dig +short AAAA example.com` and `dig +short AAAA www.example.com` return addresses.
- For each name server in `dig +short NS example.com`, `dig +short AAAA <ns>` returns an address.
- `curl -6 -sI https://example.com/` and `curl -4 -sI https://example.com/` return the same status, redirects, and headers.
- Run the [Internet.nl website test](https://internet.nl/). Its IPv6 section covers name servers, web server addresses and reachability, and whether the IPv6 and IPv4 sites are the same.
---

## maintenance-pages
Source: https://specification.website/spec/resilience/maintenance-pages/

---
title: "Maintenance pages and 503"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/maintenance-pages/
updated: "2026-08-04T00:00:00.000Z"
sources:
  - title: "RFC 9110 — HTTP Semantics: 503 Service Unavailable"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable"
    publisher: "IETF"
  - title: "RFC 9110 — HTTP Semantics: Retry-After"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after"
    publisher: "IETF"
  - title: "RFC 6585 — Additional HTTP Status Codes: 429 Too Many Requests"
    url: "https://www.rfc-editor.org/rfc/rfc6585#section-4"
    publisher: "IETF"
  - title: "Google Search Central — Temporarily pause or disable a website"
    url: "https://developers.google.com/search/docs/crawling-indexing/pause-online-business"
    publisher: "Google Search Central"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Maintenance pages and 503

> When the site is intentionally offline, return HTTP 503 with a Retry-After header and a page that tells users what is happening and when to come back.

## What it is

A maintenance page is what visitors see during planned downtime — a database migration, a major deploy, a hardware swap. The page itself is only half of the requirement. The other half is the HTTP response: status `503 Service Unavailable` with a `Retry-After` header that tells crawlers and clients when to come back.

```
HTTP/2 503
Retry-After: 3600
Content-Type: text/html; charset=utf-8
```

## Why it matters

A maintenance page that returns `200 OK` is indistinguishable from your real site to a search engine. Googlebot will happily index "We're back in an hour" as the content of every URL on your domain. If the outage lasts a day, you can wake up to a site that ranks for nothing.

`503` is the explicit signal that the server is unavailable on purpose and that the condition is temporary. Crawlers slow down or pause. CDNs may serve stale content from cache. Monitoring tools record an outage instead of a successful response. Browsers and SDKs that respect `Retry-After` back off cleanly.

## How to implement

Configure the edge or load balancer to return the maintenance response, not the application itself — the application is the thing you're taking down.

- Status code: `503`.
- `Retry-After` header: either an integer number of seconds (`Retry-After: 1800`) or an HTTP date (`Retry-After: Wed, 29 May 2026 14:00:00 GMT`). Use the form that matches your confidence in the ETA.
- Body: a single HTML page that loads no external dependencies, no analytics, and no fonts from CDNs that may also be down.
- Tell the user: what is happening, when you expect to be back, and where to get updates (status page, social account).

Most edge providers (Cloudflare, Fastly, Nginx, HAProxy) can serve a static maintenance page with a 503 from a single rule. Allow an admin IP through so you can verify the deploy before lifting the block.

```nginx
# Nginx example
if (-f /etc/nginx/maintenance.flag) {
  return 503;
}
error_page 503 @maintenance;
location @maintenance {
  root /var/www/maintenance;
  rewrite ^.*$ /index.html break;
  add_header Retry-After 1800 always;
}
```

## Rate limiting: 429, not 503

`503` is for the whole site being down. When you are throttling a *single* client that is sending too many requests, the correct status is `429 Too Many Requests` (RFC 6585), and it takes the same `Retry-After` header:

```
HTTP/2 429
Retry-After: 60
```

The distinction matters for crawlers and AI agents. A 429 with `Retry-After` says "you specifically are going too fast — slow down and come back"; a well-behaved bot backs off to the interval you name and keeps its place. A `503`, a silent connection drop, or a `200` with an error body all teach it the wrong lesson: that the whole site is down, or that the throttled response was real content. If you rate-limit crawlers (see [controlling AI crawlers](/spec/agent-readiness/robots-for-ai-crawlers/)), do it with 429 and an honest `Retry-After`, not a block that looks like an outage.

This is an edge or origin behaviour — a static host does not emit it on its own. Configure it where the throttling happens (your CDN's rate-limiting rules, a reverse proxy, or the application).

## Common mistakes

- Returning `200 OK` with a "we'll be back soon" message. Search engines treat this as the new content of every URL.
- Throttling a busy client with a `503` or a silent drop instead of a `429` with `Retry-After`.
- Returning `503` with no `Retry-After`. Clients have to guess.
- Loading third-party scripts (analytics, chat widgets, fonts) on the maintenance page. Most of them will fail and the page may not render.
- Forgetting to remove the maintenance flag after the deploy and leaving the site at 503 for hours.

## Verification

- `curl -I https://example.com/` returns `HTTP/2 503` and a `Retry-After` header.
- A rate-limited client receives `HTTP/2 429` with `Retry-After`, not a `503` or a silent drop.
- The page renders without the application backend running.
- Status page (if you have one) shows the planned window.
---

## monitoring-uptime
Source: https://specification.website/spec/resilience/monitoring-uptime/

---
title: "Monitoring and uptime"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/monitoring-uptime/
updated: "2026-10-15T12:00:00.000Z"
sources:
  - title: "Google SRE Book — Monitoring Distributed Systems"
    url: "https://sre.google/sre-book/monitoring-distributed-systems/"
    publisher: "Google SRE"
  - title: "web.dev — User-centric performance metrics"
    url: "https://web.dev/articles/user-centric-performance-metrics"
    publisher: "web.dev"
  - title: "Google SRE Workbook — SLO engineering case studies"
    url: "https://sre.google/workbook/implementing-slos/"
    publisher: "Google SRE"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Monitoring and uptime

> Monitor the site from outside your own infrastructure, combine synthetic checks with real user data, and run a status page on a separate host so it stays up when the site does not.

## What it is

Monitoring is the continuous check that the site is reachable, correct, and fast. Uptime is the headline number — the percentage of time the site responded successfully over a window. Together they answer two questions: is the site up right now, and how often has it been down this month?

Three layers cover most needs:

1. **Synthetic monitoring** — a script in another data centre requests the site on a schedule and alerts when the response is wrong.
2. **Real User Monitoring (RUM)** — JavaScript on the page reports real visitor experience: load times, errors, Core Web Vitals.
3. **A public status page** — a page on a separate host where users can check whether the issue is yours or theirs.

## Why it matters

Internal dashboards go down with the application. A check that runs inside the same VPC as the database cannot tell you the DNS provider has failed, the TLS certificate has expired, or the CDN is serving stale content. External monitoring catches the failures your users see first.

Synthetic checks tell you whether the site works. RUM tells you whether it works **for the people who use it** — on real devices, on real networks, in the regions you actually serve. The two are complementary: synthetic is fast feedback in a controlled environment, RUM is ground truth.

A status page reduces support load during incidents. When the homepage is down, "is it just me?" is the first question every user asks. A status page on a separate domain answers it without a support ticket.

## How to implement

For synthetic monitoring, pick one external service and run checks every minute from multiple regions:

- **Hosted**: UptimeRobot, Pingdom, StatusCake, Better Stack, Checkly, Datadog Synthetics.
- **Self-hosted**: Uptime Kuma, Healthchecks.io.

Check more than the homepage. A login flow, a search endpoint, and a checkout step catch problems the home page does not. Validate the response body, not just the status code, so a `200 OK` returning the maintenance page still trips an alert.

For RUM, send Core Web Vitals (LCP, INP, CLS) and JavaScript errors to a collector. The `web-vitals` library, Sentry, Datadog RUM, and Cloudflare Web Analytics all do this in a few kilobytes.

A RUM script is still a script sending visitor data to someone, so it falls under the same rules as any [third-party script](/spec/privacy/third-party-scripts/). Two habits keep it honest. Scrub before sending: drop cookies, request headers and bodies, query strings and user identifiers in the client, so personal data never leaves the browser. And post to a same-origin endpoint that forwards to the collector, rather than to the collector's domain: `connect-src` stays `'self'`, the vendor never sees the visitor's IP address, and the forwarder can enforce its own limits. A forwarder is an open relay unless you make it otherwise: pin a single destination, check the `Origin`, cap the body size and the request rate, and accept only the event types you expect.

This site ships it: JavaScript errors, and one in a thousand page loads for performance, go to a self-hosted GlitchTip server through a same-origin Sentry tunnel ([`functions/api/diagnostics.ts`](https://github.com/jdevalk/specification.website/blob/main/functions/api/diagnostics.ts)) that accepts one scrubbed error or transaction per request and nothing else.

Run the status page on a different host and a different DNS provider from the main site. Common pattern: `status.example.com` resolved through a CDN-fronted static site, with the status records stored at a third-party provider (Statuspage, Instatus, BetterStack, or a static site you update manually). The point is that when the primary site is unreachable, the status page must not be unreachable too.

## Common mistakes

- A monitor that hits the homepage from one region every five minutes and reports 100% uptime while half the world cannot reach the site.
- Checking only the status code, so a 200 OK returning an error page passes.
- Status page on the same domain as the site. When the site is down, so is the status page.
- Alerting on every blip. Pages every five minutes train operators to ignore the alert.
- No on-call rota, so alerts go to an inbox no one reads at 3am.

## Verification

- Trigger a controlled outage in staging. Confirm the monitor alerts within the expected window.
- Check that the status page resolves when the main site's CDN is blocked at the network level.
- Review the past month's incidents and confirm RUM data and synthetic checks agree on when the site was degraded.
---

## offline-support
Source: https://specification.website/spec/resilience/offline-support/

---
title: "Offline support and service workers"
category: resilience
status: optional
url: https://specification.website/spec/resilience/offline-support/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "MDN — Service Worker API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API"
    publisher: "MDN"
  - title: "MDN — Using Service Workers"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers"
    publisher: "MDN"
  - title: "web.dev — Common techniques to build offline applications"
    url: "https://web.dev/articles/offline-cookbook"
    publisher: "web.dev"
  - title: "W3C — Service Workers"
    url: "https://www.w3.org/TR/service-workers/"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Offline support and service workers

> A service worker can serve a cached offline fallback page when the network fails, keeping the site usable on flaky connections and turning hard failures into graceful ones.

## What it is

A service worker is a JavaScript file that the browser runs in the background, separate from any page. It sits between the page and the network and can intercept requests, return cached responses, and respond when the network is unavailable. The minimum useful offline feature is a single cached fallback page that the worker serves when a navigation request fails.

A service worker is not an ordinary script. A normal `<script>` runs when the page loads and is gone on reload; a service worker installs once and keeps controlling later visits to the origin, mediating their requests, until the browser fetches and activates a replacement. That persistence is what makes offline support possible. It is also the catch: a bug in the worker is not fixed by deploying new HTML, because the browser keeps serving through the installed worker until a corrected one takes over. Ship a worker you can roll back.

## Why it matters

Connections drop. Mobile users walk into lifts and tunnels. Captive portals block traffic until the user logs in. Without a service worker, every one of these turns into the browser's generic "no internet" screen, with your brand nowhere in sight. A fallback page keeps the site present and gives users a clear message instead of a dead tab.

For content-heavy sites, caching previously visited pages lets users re-read articles offline. For applications, careful caching of shell HTML, CSS, and JavaScript turns the second visit into an instant load even on slow networks.

## How to implement

Register the worker once from the page:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

The worker pre-caches a fallback page on install and serves it when a navigation request fails:

```js
// sw.js
const CACHE = 'v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
    );
  }
});
```

Pick a caching strategy per resource type:

- **Cache-first** for fonts, icons, and versioned static assets. Fast, no network round-trip, fine because the URL changes on update.
- **Network-first** for HTML pages and API responses. Fresh by default, with the cache as the fallback.
- **Stale-while-revalidate** for images and non-critical content. Serve cached, then update in the background.

Always include a version string in the cache name and clean up old caches on `activate`, or you'll ship stale code on the next deploy.

## Common mistakes

- Caching the whole site indiscriminately and serving stale HTML for weeks.
- Forgetting to bump the cache version on deploy, so users never see new content.
- Registering the service worker before the page is interactive and blocking first paint.
- Caching responses with `Cache-Control: no-store` or authenticated API calls.
- No way to unregister a shipped worker. Because it outlives the deploy, plan the kill switch before you launch, not after it misbehaves.

## Verification

- DevTools → **Application** → **Service Workers**: confirm the worker is active for the scope you want.
- DevTools → **Network**: tick "Offline" and reload. The fallback page should render.
- Lighthouse PWA audit reports the offline behaviour.
- Ship a `?sw=off` kill switch that unregisters the worker, in case you need to disable it in production.
---

## pwa-manifest
Source: https://specification.website/spec/resilience/pwa-manifest/

---
title: "Web app manifest"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/pwa-manifest/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "W3C — Web Application Manifest"
    url: "https://www.w3.org/TR/appmanifest/"
    publisher: "W3C"
  - title: "MDN — Web app manifest"
    url: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest"
    publisher: "MDN"
  - title: "web.dev — Add a web app manifest"
    url: "https://web.dev/articles/add-manifest"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Web app manifest

> A web app manifest is a small JSON file that tells browsers how the site should appear when installed — its name, icons, start URL, theme colour, and display mode.

## What it is

A web app manifest is a JSON document linked from the HTML head that describes how the site should behave when installed to a device's home screen or app launcher. It is declarative metadata and nothing more: it never runs, caches nothing, and intercepts no requests. What it unlocks is how the site looks and installs: installability, splash screens, themed UI, and maskable icons that render correctly on every platform. It does not make the site work offline. That is the job of a separate [service worker](/spec/resilience/offline-support/), and the two are independent despite both wearing the "PWA" label. You can ship either without the other.

Serve it at `/site.webmanifest` or `/manifest.webmanifest` and link it from the page:

```html
<link rel="manifest" href="/site.webmanifest">
```

## Why it matters

Without a manifest, browsers cannot offer to install the site, and on Android the "Add to Home Screen" prompt falls back to a generic browser icon and the page title. With a manifest, the installed site gets a proper icon, a controlled start URL, and a window mode that can hide browser chrome. The same icons feed Android shortcuts, iOS home screen entries, Windows jump lists, and Chrome OS launchers.

The theme colour also lets browsers tint the status bar and the address bar to match the brand, which makes the site feel native even when it isn't installed.

## How to implement

A minimal manifest:

```json
{
  "name": "The Website Specification",
  "short_name": "WebSpec",
  "start_url": "/?utm_source=pwa",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0b5fff",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Required fields for installability in Chromium browsers:

- `name` and `short_name` — the long form for splash screens, the short form for the home screen.
- `start_url` — usually `/`. Add a tracking parameter if you want to count installed launches separately.
- `display` — `standalone` hides browser chrome; `minimal-ui` keeps a tiny bar; `browser` opens in a regular tab.
- `icons` — at least one 192×192 and one 512×512 PNG. Add a separate icon with `"purpose": "maskable"` so Android can apply its adaptive icon mask without cropping content.
- `theme_color` and `background_color` — the first themes the OS chrome, the second paints the splash screen before the page loads.

The fields alone are not enough: installability also requires the page be served over HTTPS (or `localhost` in development). Serve the manifest file itself with `Content-Type: application/manifest+json`.

## Common mistakes

- Linking the manifest but serving it as `text/html` or with a missing file — installability silently fails.
- One square icon with the logo touching the edge, used as the maskable icon. Android crops it into a circle and chops the brand.
- `start_url` pointing to a 404 because someone changed the URL structure.
- Setting `display: fullscreen` and breaking the user's ability to leave the site.
- Forgetting `theme_color`, leaving the status bar bright white.

## Verification

- DevTools → **Application** → **Manifest**: every field parses, every icon loads.
- The "Install" affordance appears in the address bar in Chromium browsers.
- Test the maskable icon with [maskable.app](https://maskable.app).
- `curl -I https://example.com/site.webmanifest` returns `200` and `application/manifest+json`.
---

## redirect-by
Source: https://specification.website/spec/resilience/redirect-by/

---
title: "Redirect-By header"
category: resilience
status: recommended
url: https://specification.website/spec/resilience/redirect-by/
updated: "2026-07-14T00:00:00.000Z"
sources:
  - title: "WordPress Developer Reference — the x_redirect_by filter"
    url: "https://developer.wordpress.org/reference/hooks/x_redirect_by/"
    publisher: "WordPress"
  - title: "Yoast — Let's introduce the X-Redirect-By header"
    url: "https://yoast.com/developer-blog/x-redirect-by-header/"
    publisher: "Yoast"
  - title: "RFC 6648 — Deprecating the \"X-\" Prefix"
    url: "https://www.rfc-editor.org/rfc/rfc6648"
    publisher: "IETF"
  - title: "Joost de Valk — The Redirect-By HTTP header"
    url: "https://joost.blog/redirect-by-http-headers/"
    publisher: "joost.blog"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Redirect-By header

> The Redirect-By response header names the software that issued a redirect, so anyone debugging a redirect chain can see at a glance which system to fix. It is deployed today under the legacy name X-Redirect-By.

## What it is

A redirect can carry a header that names the software that generated it. The recommended field name is `Redirect-By`:

```http
HTTP/1.1 301 Moved Permanently
Redirect-By: specification.website
Location: https://specification.website/.well-known/security.txt
```

It has no effect on the redirect itself. The browser, the crawler, and the ranking signals all behave exactly as they would without it. It is metadata for whoever is reading the response, not an instruction to the client. That is the point: a single URL is often redirected several times over by different layers (a CDN edge rule, a reverse proxy, an application redirect, a plugin), and when one of them is wrong there is nothing in an ordinary `3xx` response that says which one did it. `Redirect-By` labels the culprit at the moment it acts.

The field is not yet registered with IANA, and it is deployed in the wild under an older name: `X-Redirect-By`. WordPress core has emitted `X-Redirect-By` on every `wp_redirect()` since version 5.1 (exposed through the `x_redirect_by` filter so themes and plugins can set their own value, such as `Yoast SEO`), and other systems including TYPO3 follow suit. Because RFC 6648 discourages the `X-` prefix on new fields, this specification recommends the unprefixed `Redirect-By`. Treat the two names as one field: emit `Redirect-By`, and recognise `X-Redirect-By` when you read other people's responses.

## Why it matters

Debugging a redirect you did not write is one of the more thankless tasks in web operations. You see the request land on the old URL and bounce to the new one, but the stack between them is opaque: was it the edge, the load balancer, the framework, a redirect-manager plugin, an `.htaccess` rule someone added three years ago? Without attribution you bisect by disabling layers one at a time. With `Redirect-By` the answer is in the response header, and the search that used to take an afternoon takes seconds.

The header earns its keep most on sites assembled from parts you do not fully control: a managed host, a CDN, a CMS, and a stack of plugins, each capable of issuing its own redirect. It is cheap to add and it costs nothing at request time, so the return on a few bytes per redirect is high.

## How to implement

On every redirect your software issues, set a `Redirect-By` response header whose value names the component responsible. Keep the value to a stable product or service name, the thing a maintainer would recognise, and emit it alongside the `Location` header.

This is a convention, not yet a registered standard, so there is no algorithm to follow: the only rule is that every layer that redirects should sign its work. A CDN edge rule labels itself; the application labels itself; a redirect-manager plugin labels itself. When several layers each set the header, the value you see is the one from the layer that actually produced the response you are holding, which is exactly the layer you want to find.

Prefer `Redirect-By` over the older `X-Redirect-By`: RFC 6648 discourages new fields carrying an `X-` prefix. Most deployed software still emits and looks for `X-Redirect-By`, so a reader should treat the two names as equivalent, and a sender bridging the transition may send both. New implementations should send `Redirect-By`.

This site ships it. The short-URL aliases in [`functions/_middleware.ts`](https://github.com/jdevalk/specification.website/blob/main/functions/_middleware.ts) are served as 301s carrying `Redirect-By: specification.website`, rather than from Cloudflare Pages' `_redirects` file, which cannot attach custom response headers.

## Common mistakes

**Treating it as a request header.** `Redirect-By` is set by the server on a redirect response. Clients do not send it, and there is nothing for a browser to do with it.

**Leaking detail into the value.** Name the software, not its version, its file path, or the internal rule that matched. `Redirect-By: WordPress` is useful; `Redirect-By: WordPress 6.5.2 via wp-content/plugins/acme/redirects.php:214` hands an attacker a fingerprint for free. Attribution should identify the layer, not describe your infrastructure.

**Reaching for the `X-` prefix on new work.** The `X-Redirect-By` spelling persists only because it predates RFC 6648's guidance against `X-` prefixes and is now widely deployed. Recognise it when reading responses, but emit `Redirect-By`.

## Verification

Request one of your redirects and inspect the response headers:

```
curl -sI https://specification.website/security.txt | grep -i redirect-by
```

A correctly configured redirect returns the `Redirect-By` line next to `Location`; the `-i` flag also catches the legacy `X-Redirect-By`. If several layers redirect in sequence, follow the chain (`curl -sIL`) and confirm each hop names itself.
---

