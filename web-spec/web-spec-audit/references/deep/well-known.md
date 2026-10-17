# Well-Known URIs — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/well-known/. Assembled from the local evidence corpus (.zflow/evidence/specweb/well-known/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## api-catalog
Source: https://specification.website/spec/well-known/api-catalog/

---
title: "/.well-known/api-catalog"
category: well-known
status: recommended
url: https://specification.website/spec/well-known/api-catalog/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "RFC 9727 — Publishing Organisation API Information"
    url: "https://www.rfc-editor.org/rfc/rfc9727"
    publisher: "IETF"
  - title: "RFC 9264 — Linkset: Media Types and a Link Relation Type for Link Sets"
    url: "https://www.rfc-editor.org/rfc/rfc9264"
    publisher: "IETF"
  - title: "RFC 8288 — Web Linking"
    url: "https://www.rfc-editor.org/rfc/rfc8288"
    publisher: "IETF"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/api-catalog

> RFC 9727 publishes a machine-readable index of the APIs and resources a host exposes. Served as a Linkset (RFC 9264) JSON document, discoverable via the api-catalog link relation.

## What it is

`/.well-known/api-catalog` is an IETF-standardised path at which an organisation publishes a machine-readable catalogue of the APIs and structured resources its host exposes. The document is a [Linkset](https://www.rfc-editor.org/rfc/rfc9264) (RFC 9264) — a JSON array of link relations grouped by an anchor URL.

The name undersells it: despite "api", the catalogue is not limited to OpenAPI specs or JSON endpoints. Most of its useful relations, such as `sitemap`, `describedby`, `license` and `alternate`, point at resources that are not APIs at all. Read it as an index of every machine-readable thing on the origin, expressed as a Linkset.

```http
GET /.well-known/api-catalog HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: application/linkset+json; charset=utf-8
```

```json
{
  "linkset": [
    {
      "anchor": "https://example.com/",
      "describedby": [
        { "href": "https://example.com/llms.txt", "type": "text/markdown" }
      ],
      "alternate": [
        { "href": "https://example.com/rss.xml", "type": "application/rss+xml" }
      ],
      "sitemap": [
        { "href": "https://example.com/sitemap-index.xml", "type": "application/xml" }
      ],
      "license": [
        { "href": "https://creativecommons.org/licenses/by/4.0/" }
      ]
    }
  ]
}
```

The path is registered in the [IANA Well-Known URIs Registry](https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml) by RFC 9727 — unlike many AI-era conventions, this one is standards-track.

## Why it matters

- **One predictable fetch surfaces every machine-readable resource.** Agents that obey `/.well-known/api-catalog` get a typed list of feeds, sitemaps, llms.txt, OpenAPI specs, terms of service, licence URLs — without scraping HTML.
- **Pairs with the `Link` header.** Advertise `Link: </.well-known/api-catalog>; rel="api-catalog"` and the agent never has to guess the path. See [HTTP Link headers](/spec/agent-readiness/link-headers/).
- **Standards-track.** RFC 9727 (May 2024) is final, not a draft. The IANA registration anchors the path.
- **Cheap to ship.** A small static JSON file.

## How to implement

**Serve a Linkset.** RFC 9727 requires the response body to be a valid [Linkset](https://www.rfc-editor.org/rfc/rfc9264). The media type is `application/linkset+json`. Set the `Content-Type` accordingly — most static hosts default to `application/octet-stream` for files without an extension.

**Each `linkset` entry has an `anchor`** (the resource the links describe) and one or more relation-keyed arrays. Useful relations:

- `describedby` — a description of the anchor (llms.txt, OpenAPI).
- `service-desc` — a machine-readable description of an API (OpenAPI, AsyncAPI).
- `service-doc` — a human-readable description of an API.
- `alternate` — alternative representations of the anchor's content.
- `sitemap` — sitemap covering the anchor.
- `license`, `author`, `terms-of-service` — metadata.
- `status` — status / health endpoint.

**Advertise it.** Add the catalogue to your HTTP `Link` header on every response:

```http
Link: </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"
```

This is what makes the path discoverable without an out-of-band hint.

**Update it when the surface changes.** A drifted catalogue is worse than no catalogue. CI should validate it on every change to the public resources it describes.

**Keep it small.** Catalogues are typically a few KB. Linksets are flat — there is no recursion to follow.

## Common mistakes

- Returning the catalogue with `Content-Type: application/json` (or `text/plain`). It must be `application/linkset+json` for RFC 9727 to apply; agents that strictly type-check will skip it otherwise.
- Inventing relation names. Use only those in the [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml).
- Wrapping the catalogue inside an authentication wall. The whole point is unauthenticated discovery.
- Forgetting to keep it in sync with `/llms.txt`, `/sitemap-index.xml`, and the `<link>` tags in HTML. They are different surfaces for the same statement of fact.
- Pairing it with `Link: </.well-known/api-catalog>; rel="describedby"`. The correct relation is `api-catalog` — that registration is what RFC 9727 added.

## Verification

- `curl -sI https://example.com/.well-known/api-catalog` returns `200` with `Content-Type: application/linkset+json`.
- The body parses as JSON and matches the Linkset schema (RFC 9264 §4).
- [Is It Agent Ready?](https://isitagentready.com/) flips `discovery.apiCatalog` to `pass`.
- Every URL the catalogue points at returns `200` from the same origin.
---

## apple-app-site-association
Source: https://specification.website/spec/well-known/apple-app-site-association/

---
title: "/.well-known/apple-app-site-association"
category: well-known
status: optional
url: https://specification.website/spec/well-known/apple-app-site-association/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Apple — Supporting associated domains"
    url: "https://developer.apple.com/documentation/xcode/supporting-associated-domains"
    publisher: "Apple Developer Documentation"
  - title: "Apple — Allowing apps and websites to link to your content"
    url: "https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content"
    publisher: "Apple Developer Documentation"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/apple-app-site-association

> A JSON file that tells iOS, iPadOS and macOS which Apple apps may handle which URLs on your domain. Required for Universal Links and several other Apple features.

## What it is

`apple-app-site-association` (often abbreviated **AASA**) is a JSON file Apple platforms fetch from your domain to verify that you authorise specific apps to handle specific URLs. It powers Universal Links (opening web URLs directly in an app), Handoff between web and app, Shared Web Credentials, and AutoFill of strong passwords across web and app.

It must live at `https://example.com/.well-known/apple-app-site-association`. Apple no longer accepts the legacy root-path location.

## Why it matters

- **Universal Links.** Without a valid AASA, a tap on `https://example.com/orders/123` in Mail or Messages opens Safari instead of your app. The whole "deep linking that survives links being shared" model depends on this file.
- **Password sharing.** Shared Web Credentials lets a password saved in Safari autofill in the corresponding app, and vice versa. It is gated by AASA.
- **Trust.** The fact that you control the domain and can publish this file is what Apple uses to prove that an app may claim URLs on your domain. There is no other mechanism.

If you do not have an iOS, iPadOS, macOS or visionOS app, you do not need this file.

## How to implement

Serve a JSON document with the App IDs and URL patterns that may handle your domain.

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["ABCDE12345.com.example.app"],
        "components": [
          { "/": "/orders/*" },
          { "/": "/users/*/profile" }
        ]
      }
    ]
  },
  "webcredentials": {
    "apps": ["ABCDE12345.com.example.app"]
  }
}
```

Rules:

- The path is **exactly** `/.well-known/apple-app-site-association` with **no `.json` extension**.
- The response **Content-Type must be `application/json`**.
- The response must be served over **HTTPS** with a valid certificate. No redirects: respond with `200` directly.
- The file must be **publicly accessible** with no authentication, no rate limiting that blocks Apple's CDN, and no `Vary` header that breaks caching.
- Apple fetches the file through its own CDN (`app-site-association.cdn-apple.com`). Allow that user agent through your WAF.
- Keep the JSON **valid** and under Apple's size limit (currently 128 KB).

## Common mistakes

- Adding a `.json` extension because a server forced one.
- Serving with `Content-Type: text/plain` or `text/html`.
- Returning a redirect. Apple treats a redirect as a hard failure.
- Hiding the file behind Cloudflare's "Under Attack" mode, a login page, or a country block.
- Using only `paths` (the old key) without `components`. Modern iOS versions prefer `components`; ship both during migration.

## Verification

```
curl -I https://example.com/.well-known/apple-app-site-association
```

You should see `200 OK` and `Content-Type: application/json`. Apple's [App Search API Validation Tool](https://search.developer.apple.com/appsearch-validation-tool/) and the on-device "Diagnostics" build flag both report whether AASA loaded successfully.
---

## assetlinks-json
Source: https://specification.website/spec/well-known/assetlinks-json/

---
title: "/.well-known/assetlinks.json"
category: well-known
status: optional
url: https://specification.website/spec/well-known/assetlinks-json/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "Verify Android App Links"
    url: "https://developer.android.com/training/app-links/verify-applinks"
    publisher: "Google Developers"
  - title: "Digital Asset Links protocol"
    url: "https://developers.google.com/digital-asset-links/v1/getting-started"
    publisher: "Google Developers"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/assetlinks.json

> Android's Digital Asset Links file proves that an Android app and a web domain are owned by the same entity. It powers App Links and Smart Lock for Passwords.

## What it is

`assetlinks.json` is Google's equivalent of Apple's [AASA file](/spec/well-known/apple-app-site-association/). It is a JSON document published at `/.well-known/assetlinks.json` that declares which Android applications are allowed to act on behalf of your web domain. Android verifies this file before honouring App Links and several credential-sharing features.

The format is defined by the **Digital Asset Links** protocol, which is also used for cross-app verification and SmartLock.

## Why it matters

- **Android App Links.** With a valid `assetlinks.json`, tapping `https://example.com/orders/123` in Gmail or Chrome opens directly in your app, with no "open with" dialog. Without it, the user lands on the web.
- **Credential sharing.** Saved passwords in Chrome can autofill in the corresponding Android app, and vice versa.
- **Trust.** Google needs cryptographic proof that the same party owns the domain and the app. Hosting this file at a URL only the domain owner controls provides that proof.

If you do not ship an Android app, you do not need this file.

## How to implement

Publish a JSON array. Each entry declares one relation between your site and one app.

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.app",
      "sha256_cert_fingerprints": [
        "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
      ]
    }
  }
]
```

Rules:

- The path is **exactly** `/.well-known/assetlinks.json`. The `.json` extension is required here (unlike Apple's [AASA](/spec/well-known/apple-app-site-association/), which has no extension).
- Serve as **`Content-Type: application/json`** over **HTTPS**.
- Respond with **`200 OK`** directly. No redirects.
- The file must be **publicly readable**, with no authentication and no aggressive bot rules.
- The `sha256_cert_fingerprints` must include the SHA-256 of the signing certificate of every release variant — including the Play App Signing key, not just your upload key.
- Declare every relevant app, including any beta or staging packages.

## Common mistakes

- Listing the upload certificate fingerprint and forgetting Play App Signing's actual signing certificate.
- Leaving out a package because it shares code with another. Each package needs its own entry.
- Serving the file from a subdomain that is not the eTLD+1 the app is associated with.
- Returning a 301 to a CDN host. Google's verifier follows redirects in some cases and not others — do not depend on it.
- Letting a deploy pipeline rewrite JSON keys to camelCase.

## Verification

```
curl -s https://example.com/.well-known/assetlinks.json | jq .
```

Use Google's [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator) and Android Studio's "App Links Assistant". On a device, `adb shell pm get-app-links com.example.app` shows whether verification succeeded and why if it did not.
---

## change-password
Source: https://specification.website/spec/well-known/change-password/

---
title: "/.well-known/change-password"
category: well-known
status: optional
url: https://specification.website/spec/well-known/change-password/
updated: "2026-07-09T00:00:00.000Z"
sources:
  - title: "A Well-Known URL for Changing Passwords"
    url: "https://w3c.github.io/webappsec-change-password-url/"
    publisher: "W3C Web Application Security Working Group"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/change-password

> A standard redirect endpoint that points password managers and users at your real change-password page. Only applicable if the site has user accounts — sites without logins have nothing to point at and should not implement it.

## What it is

`/.well-known/change-password` is a fixed URL that resolves, by redirect, to the page where a user can change their password. The W3C Web Application Security Working Group defined it so that password managers, browsers and security tooling can jump a user from a breach alert or rotation prompt to the right form in one click.

It is not a form itself. It is a discoverable pointer.

**Applies only if your site has user accounts.** A marketing site, documentation site, or any other site without a login flow has no change-password page to point at and should not implement this URL — see the note at the end of the implementation section.

## Why it matters

- **Password managers** (1Password, Bitwarden, iCloud Keychain, Chrome, Edge, Firefox) probe this URL when they detect a weak or breached credential. If it works, the "change password" button takes the user straight there.
- **Users** who type `example.com/.well-known/change-password` into the address bar get to the right place without hunting through account menus.
- **Security teams** can use it as part of incident response: send everyone to one URL and the redirect resolves the rest.

It costs almost nothing to implement and removes a step from one of the highest-friction user journeys on the web.

## How to implement

Serve an HTTP **302** (or **303**) redirect from `/.well-known/change-password` to your actual change-password page.

```http
GET /.well-known/change-password HTTP/1.1
Host: example.com

HTTP/1.1 302 Found
Location: https://example.com/account/security/password
```

Rules:

- Serve it over **HTTPS** on the canonical host (the same host users log in to).
- The destination must be the page where a logged-in user can **change their existing password** — not the password reset flow for forgotten passwords, and not the sign-up page.
- The destination should work for an unauthenticated user too: redirect them to sign in first, then back to the change-password page.
- Do not return **404**. A 404 tells password managers the feature is not supported.

If you do not have accounts at all (a static marketing site, a documentation site, a brochure-ware site), do not implement this URL. There is nothing for it to redirect to, and a broken or placeholder destination is worse than the absence of the endpoint — password managers treat a 404 here as "feature unsupported" and move on, which is the correct outcome for a site without logins.

## Common mistakes

- Pointing at the password **reset** flow instead of the **change** flow. Reset is for forgotten passwords; change is for known-good users rotating credentials.
- Returning a 200 with an HTML page instead of a redirect. Some clients follow it; the spec says redirect.
- Hiding it behind a `noindex` requirement or a WAF rule that blocks non-browser user agents.
- Forgetting the leading dot in `/.well-known/`.

## Verification

```
curl -I https://example.com/.well-known/change-password
```

You should see a `302` or `303` response with a `Location:` header pointing at your real change-password page. Test in a password manager: trigger a weak-password warning and confirm the "Change password" button works.
---

## gpc-json
Source: https://specification.website/spec/well-known/gpc-json/

---
title: "/.well-known/gpc.json"
category: well-known
status: optional
url: https://specification.website/spec/well-known/gpc-json/
updated: "2026-09-24T00:00:00.000Z"
sources:
  - title: "Global Privacy Control (GPC) — §4 GPC Support Resource (W3C Working Draft)"
    url: "https://www.w3.org/TR/gpc/"
    publisher: "W3C Privacy Working Group"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "Global Privacy Control — Implementation guide for publishers"
    url: "https://globalprivacycontrol.org/implementation"
    publisher: "Global Privacy Control"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/gpc.json

> A small JSON document at /.well-known/gpc.json in which an origin declares that it is aware of Global Privacy Control and intends to honour the signal. Only applicable to sites that process personal data in ways an opt-out signal touches.

## What it is

`/.well-known/gpc.json` is the **GPC support resource**: a JSON document in which an origin states, in machine-readable form, that it is aware of [Global Privacy Control](/spec/privacy/global-privacy-control/) and intends to honour the signal.

```json
{
  "gpc": true,
  "lastUpdate": "2026-09-24"
}
```

That is the whole document. `gpc` is a boolean — `true` means the origin intends to honour GPC requests to the extent it is legally required to; `false` means it does not. Any other value leaves support unknown. `lastUpdate` is an RFC 3339 date (`YYYY-MM-DD`, or a full timestamp) saying when the statement was last made. The name is registered with IANA and the document is defined in §4 of the W3C Global Privacy Control specification.

**The file is not how you honour GPC.** This is the confusion worth naming up front. The obligation under California, Colorado and the other state opt-out laws attaches to what your server *does* when a request arrives carrying `Sec-GPC: 1` — you stop selling or sharing that user's personal information. Publishing `{"gpc": true}` changes nothing about that request handling, and publishing it without doing the work is simply a false statement in public. The spec is unusually blunt about the boundary: the support resource conveys an origin's awareness of and support for GPC, and is "not intended to convey whether the origin abides by GPC requests from the user agent accessing the resource." It is a site-wide declaration, not a per-request receipt and not a consent record.

By default, an origin's GPC support is **unknown**. The file's job is to replace that unknown with a stated position.

## Why it matters

The `Sec-GPC` header only tells you something when a user who has enabled GPC visits. There is no way, from the outside, to ask a site whether it honours the signal — a crawler cannot send a request and infer intent from the response body. The support resource is the answer to that question, at a fixed path, for anyone who wants to ask it without visiting.

That matters to three audiences. Privacy extensions and GPC-aware browsers can show a user whether the site they are on has declared support. Regulators and researchers can survey compliance across a population of sites rather than testing them one at a time. And consent-management platforms and privacy tooling use it as the site's own statement of position.

It is also the cheapest possible part of a GPC implementation: a static file. If you have already done the hard part — actually processing the signal — declaring it costs one commit.

## How to implement

Serve the document at exactly `/.well-known/gpc.json` on the canonical host, over HTTPS, with `Content-Type: application/json`. A different media type leaves your support status unknown, which defeats the point.

```http
GET /.well-known/gpc.json HTTP/1.1
Host: example.com

HTTP/1.1 200 OK
Content-Type: application/json

{ "gpc": true, "lastUpdate": "2026-09-24" }
```

Then:

- **Only publish `"gpc": true` if it is true.** Process `Sec-GPC: 1` first; publish second.
- **Set `lastUpdate` to the day the statement was last reviewed**, and revisit it when your data practices change.
- **Keep it reachable.** No login wall, no user-agent blocking, no WAF rule that treats a bare `/.well-known/` probe as suspicious.
- **Say the same thing in your [privacy policy](/spec/privacy/privacy-policy/).** The JSON is for machines; the prose is what a person reads, and the two must not disagree.

A site with no advertising, no data brokers and no third-party trackers has nothing an opt-out signal changes. Publishing `{"gpc": true}` there is accurate but empty, and omitting the file is a perfectly good answer — this site does not ship one for exactly that reason. The file earns its place on sites where the signal actually alters behaviour.

## Common mistakes

- **Publishing the file instead of implementing GPC.** The declaration is the visible part; the request handling is the part with legal consequences.
- Serving it as `text/plain` or `text/html` because a framework or static host guessed the content type from something other than the extension.
- Wrapping the object in an array, or using `"gpc": "true"` as a string. Only a JSON object with a boolean `gpc` member counts.
- Letting `lastUpdate` rot for years after the site's data practices changed.
- Treating it as a replacement for a cookie banner under the GDPR. GPC is an opt-out mechanism; EU consent is opt-in, and neither the header nor this file satisfies the other regime.

## Verification

```
curl -sI https://example.com/.well-known/gpc.json
curl -s  https://example.com/.well-known/gpc.json
```

The first should return `200` with `Content-Type: application/json`; the second should return an object with a boolean `gpc`. Then check the claim is true: send a request with `Sec-GPC: 1` and confirm the response does not set advertising or data-broker tags.
---

## nodeinfo
Source: https://specification.website/spec/well-known/nodeinfo/

---
title: "/.well-known/nodeinfo"
category: well-known
status: optional
url: https://specification.website/spec/well-known/nodeinfo/
updated: "2026-07-29T00:00:00.000Z"
sources:
  - title: "NodeInfo — Protocol overview"
    url: "https://nodeinfo.diaspora.software/"
    publisher: "NodeInfo project"
  - title: "NodeInfo Protocol specification"
    url: "https://nodeinfo.diaspora.software/protocol.html"
    publisher: "NodeInfo project"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/nodeinfo

> A discovery URI for federated platforms. It returns links to NodeInfo documents that describe the software, version and basic statistics of a server.

## What it is

NodeInfo is a small, two-step discovery mechanism for federated and decentralised servers. A client first fetches `/.well-known/nodeinfo`, which returns a list of links pointing at versioned NodeInfo documents (typically `/nodeinfo/2.0` or `/nodeinfo/2.1`). Those documents then describe what software the server runs, which protocols it speaks, and basic statistics about users and posts.

The protocol started in Diaspora and is now used across Mastodon, PeerTube, Pleroma, Misskey, Friendica, GoToSocial, Lemmy, Funkwhale and most of the rest of the Fediverse.

## Why it matters

- **Server identification.** Crawlers, statistics sites (such as fediverse.observer), and admin tools use NodeInfo to recognise what platform a domain runs without screen-scraping HTML.
- **Federation health.** Admins can quickly check whether a peer is reachable, what version it runs, and whether it supports the protocols their server speaks.
- **Compatibility hints.** Clients can adapt to platform-specific quirks once they know whether they are talking to Mastodon, Misskey or something else.

If your site is not a federated server, you do not need NodeInfo.

## How to implement

Serve `/.well-known/nodeinfo` as JSON. The body lists one or more `rel`/`href` pairs that point at the actual NodeInfo documents.

```json
{
  "links": [
    {
      "rel": "http://nodeinfo.diaspora.software/ns/schema/2.0",
      "href": "https://example.com/nodeinfo/2.0"
    },
    {
      "rel": "http://nodeinfo.diaspora.software/ns/schema/2.1",
      "href": "https://example.com/nodeinfo/2.1"
    }
  ]
}
```

Then serve the actual NodeInfo document at the linked URL:

```json
{
  "version": "2.1",
  "software": {
    "name": "examplesocial",
    "version": "1.4.2",
    "repository": "https://github.com/example/social"
  },
  "protocols": ["activitypub"],
  "services": { "inbound": [], "outbound": [] },
  "openRegistrations": false,
  "usage": {
    "users": { "total": 142, "activeMonth": 38, "activeHalfyear": 95 },
    "localPosts": 3120
  },
  "metadata": {}
}
```

Rules:

- Serve over **HTTPS** with `Content-Type: application/json`.
- Set permissive CORS (`Access-Control-Allow-Origin: *`) so browser-based dashboards can read it.
- Cache for **minutes**, not days — stats change.
- Support at least one of the current schema versions (2.0 or 2.1). Older versions (1.0, 1.1) are deprecated.

## Common mistakes

- Returning the NodeInfo document directly from `/.well-known/nodeinfo`. The well-known URI is a pointer; the document lives elsewhere.
- Returning HTML or `text/plain` because the response was wrapped by a framework.
- Hard-coding `openRegistrations: true` when registrations are actually closed, breaking sign-up flows from third-party clients.
- Forgetting to update `software.version` on deploy, so peer servers think you are running a year-old release.

## Verification

```
curl -s https://example.com/.well-known/nodeinfo | jq .
curl -s https://example.com/nodeinfo/2.1 | jq .
```

Cross-check on a statistics site (such as fediverse.observer) that your server appears with the correct software name and version.
---

## oauth-authorization-server
Source: https://specification.website/spec/well-known/oauth-authorization-server/

---
title: "/.well-known/oauth-authorization-server"
category: well-known
status: optional
url: https://specification.website/spec/well-known/oauth-authorization-server/
updated: "2026-07-08T00:00:00.000Z"
sources:
  - title: "RFC 8414 — OAuth 2.0 Authorization Server Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc8414"
    publisher: "IETF"
  - title: "RFC 9728 — OAuth 2.0 Protected Resource Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc9728"
    publisher: "IETF"
  - title: "OpenID Connect Discovery 1.0"
    url: "https://openid.net/specs/openid-connect-discovery-1_0.html"
    publisher: "OpenID Foundation"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/oauth-authorization-server

> A JSON metadata document describing a plain OAuth 2.0 authorisation server's endpoints and capabilities. The non-OIDC sibling of openid-configuration; only needed if you run an authorisation server.

## What it is

`/.well-known/oauth-authorization-server` is a JSON metadata document, defined by **RFC 8414**, that an OAuth 2.0 **authorisation server** publishes to describe itself: where to send authorisation requests, where to exchange tokens, which scopes and grant types it supports, and where its signing keys live (`jwks_uri`).

It is the plain-OAuth sibling of [`/.well-known/openid-configuration`](/spec/well-known/openid-configuration/). The two carry almost the same fields — OpenID Connect Discovery came first, and RFC 8414 was modelled on it — but they describe different servers. Publish `openid-configuration` if you are an **OpenID Connect** provider (you issue `id_token`s and expose a UserInfo endpoint); publish `oauth-authorization-server` if you are a **plain OAuth 2.0** authorisation server with no OIDC layer. A server that is both may publish both.

## Why it matters

- **Zero hand-configuration.** A client needs only your issuer URL and discovers every endpoint from this document.
- **It completes the discovery chain.** A protected resource's [`oauth-protected-resource`](/spec/well-known/oauth-protected-resource/) metadata (RFC 9728) lists its `authorization_servers`; the client fetches this document from each to find the token endpoint. Resource metadata says _who_ issues tokens; this says _how_ to get one.
- **Key rotation and capability negotiation.** `jwks_uri` is the canonical key source, and `scopes_supported` / `grant_types_supported` tell clients what you allow.

Only publish it if you actually run an authorisation server. An application that merely _consumes_ OAuth — "sign in with someone else's provider" — is a client, not a server, and has nothing to advertise here.

## How to implement

Serve the document as `application/json` over HTTPS. A minimal payload:

```json
{
  "issuer": "https://login.example.com",
  "authorization_endpoint": "https://login.example.com/oauth2/authorize",
  "token_endpoint": "https://login.example.com/oauth2/token",
  "jwks_uri": "https://login.example.com/oauth2/jwks",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["read", "write"]
}
```

The one rule that trips people up: for an issuer that has a **path component**, RFC 8414 _inserts_ the well-known segment before the path — issuer `https://example.com/tenant1` → `https://example.com/.well-known/oauth-authorization-server/tenant1` — whereas OIDC _appends_ it (`https://example.com/tenant1/.well-known/openid-configuration`). Get this wrong and multi-tenant clients cannot find you.

Otherwise the mechanics match [`openid-configuration`](/spec/well-known/openid-configuration/): keep `issuer` an exact match for the URL clients use, serve over HTTPS, return `200`, cache for minutes-to-hours, and let it through any authentication middleware.

## Common mistakes

- An `issuer` value that does not match the URL clients use — differing by a trailing slash, port, or hostname casing. The single most common "invalid issuer" cause.
- Using OIDC's _append_ rule instead of RFC 8414's _insert_ rule for path-bearing issuers.
- Publishing it when you only consume OAuth. That makes you a client, not a server.
- Serving it as `text/html` or behind authentication.

## Verification

```
curl -s https://login.example.com/.well-known/oauth-authorization-server | jq .
```

The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint`, and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
---

## oauth-protected-resource
Source: https://specification.website/spec/well-known/oauth-protected-resource/

---
title: "/.well-known/oauth-protected-resource"
category: well-known
status: optional
url: https://specification.website/spec/well-known/oauth-protected-resource/
updated: "2026-08-08T00:00:00.000Z"
sources:
  - title: "RFC 9728 — OAuth 2.0 Protected Resource Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc9728"
    publisher: "IETF"
  - title: "RFC 8414 — OAuth 2.0 Authorization Server Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc8414"
    publisher: "IETF"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "Model Context Protocol 2026-07-28 — Authorization"
    url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization"
    publisher: "Anthropic / MCP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/oauth-protected-resource

> A JSON metadata document that tells clients which authorisation server issues the tokens an OAuth-protected API accepts, and how to present them. Only needed if you expose an OAuth-protected resource.

## What it is

`/.well-known/oauth-protected-resource` is a JSON metadata document that an OAuth 2.0 **protected resource** — an API, or any endpoint that requires an access token — publishes so a client can discover, with no hand-configuration, which authorisation server issues the tokens it accepts and how to present them. It is defined by **RFC 9728**.

It is the resource-server counterpart to the authorisation-server documents at `/.well-known/oauth-authorization-server` (RFC 8414) and [`/.well-known/openid-configuration`](/spec/well-known/openid-configuration/). Those describe where to _get_ a token; this describes what a specific resource _expects_.

## Why it matters

- **Zero hand-configuration.** A client that receives a `401` from a protected resource can learn, from this one document, exactly which authorisation server to send the user to.
- **The 401 handshake.** The resource returns `WWW-Authenticate: Bearer resource_metadata="https://api.example.com/.well-known/oauth-protected-resource"`, so even a client that did not know the path is pointed straight at it.
- **Many issuers, one resource.** `authorization_servers` can list several trusted issuers; the client picks the right one instead of guessing.
- **Agent readiness.** The Model Context Protocol's authorization spec **requires** a remote (authenticated) MCP server to publish this document, and MCP clients use it to bootstrap OAuth. See [MCP and tool discovery](/spec/agent-readiness/mcp-and-tool-discovery/).

Only publish this if you actually expose an OAuth-protected resource. A public, unauthenticated API or MCP endpoint has nothing to advertise here — like `openid-configuration`, it is `optional` and applies only when the condition holds. (This site's own MCP endpoint is public and unauthenticated, so it does not serve this file.)

## How to implement

Serve the document as `application/json` from the resource's origin. A minimal payload:

```json
{
  "resource": "https://api.example.com",
  "authorization_servers": ["https://login.example.com"],
  "scopes_supported": ["read", "write"],
  "bearer_methods_supported": ["header"],
  "jwks_uri": "https://api.example.com/.well-known/jwks.json"
}
```

Rules:

- The `resource` value must **exactly match** the resource identifier that appears in the `aud` (audience) claim of issued tokens, scheme and all.
- List every issuer you accept in `authorization_servers`. The client fetches each one's own metadata (RFC 8414 / OIDC) to find the token endpoint.
- On a `401`, set `WWW-Authenticate` with a `resource_metadata` parameter pointing at this URL, so discovery works without out-of-band configuration.
- Serve over **HTTPS**, return **200**, and let it through any authentication middleware — a discovery document hidden behind the very login it describes is useless.

## Common mistakes

- A `resource` value that does not match the `aud` claim in issued tokens — clients reject the mismatch.
- Omitting the `WWW-Authenticate: … resource_metadata=…` pointer, so only clients that already know the path can find it.
- Confusing this (the **resource server**) with `oauth-authorization-server` / `openid-configuration` (the **authorisation server**). They describe different roles.
- Serving the file behind authentication, or as `text/html`.

## Verification

```
curl -s https://api.example.com/.well-known/oauth-protected-resource | jq .
```

The response should be valid JSON with at least `resource` and `authorization_servers`. Trigger a `401` from the resource and confirm the `WWW-Authenticate` header carries a `resource_metadata` link back to this document.
---

## openid-configuration
Source: https://specification.website/spec/well-known/openid-configuration/

---
title: "/.well-known/openid-configuration"
category: well-known
status: optional
url: https://specification.website/spec/well-known/openid-configuration/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "OpenID Connect Discovery 1.0"
    url: "https://openid.net/specs/openid-connect-discovery-1_0.html"
    publisher: "OpenID Foundation"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "RFC 8414 — OAuth 2.0 Authorization Server Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc8414"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/openid-configuration

> A JSON discovery document that describes an OpenID Connect provider's endpoints and capabilities. Only required if you are an OIDC identity provider.

## What it is

`/.well-known/openid-configuration` is a JSON document published by an OpenID Connect (OIDC) provider that describes how clients can interact with it. A relying party fetches this URL, parses the response, and then knows where to send authorisation requests, where to exchange tokens, how to verify signatures, and which features the provider supports.

The format is defined by **OpenID Connect Discovery 1.0**. A closely related document for plain OAuth 2.0 lives at `/.well-known/oauth-authorization-server` (RFC 8414).

## Why it matters

- **Zero hand-configuration.** A client only needs your issuer URL. It discovers everything else from this document.
- **Key rotation works.** The `jwks_uri` is the canonical source for signing keys. Rotate keys there and every client picks up the change.
- **Capability negotiation.** Clients see which scopes, claims, response types and signing algorithms you support, and behave accordingly.
- **Standardisation.** Every major identity library (Auth0, Okta, Keycloak, Microsoft Entra, Google, etc.) consumes this format. You do not have to write client SDKs.

Only publish this if you actually run an OIDC identity provider. A site that uses "Sign in with Google" is a relying party, not a provider, and should not expose this URL.

## How to implement

Serve the file as `application/json` from your issuer's origin. The minimum useful payload looks roughly like this:

```json
{
  "issuer": "https://login.example.com",
  "authorization_endpoint": "https://login.example.com/oauth2/authorize",
  "token_endpoint": "https://login.example.com/oauth2/token",
  "userinfo_endpoint": "https://login.example.com/oauth2/userinfo",
  "jwks_uri": "https://login.example.com/oauth2/jwks",
  "response_types_supported": ["code", "id_token", "code id_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"]
}
```

Rules:

- The `issuer` value must **exactly match** the URL clients use, including scheme and absence of trailing slash. Mismatches are the single most common cause of "invalid issuer" errors.
- Always serve over **HTTPS**.
- Set `Cache-Control` sensibly — minutes to hours, not days. Clients re-fetch on errors.
- The `jwks_uri` must be reachable and return current signing keys.

## Common mistakes

- Publishing the file but having clients fail with "issuer mismatch" because the URL differs by a trailing slash, port number, or hostname casing.
- Exposing a stale `jwks_uri` after rotating keys.
- Marking the file as `text/html` because a framework rendered it as a page.
- Treating the file as static when endpoints actually move. If you change endpoints, change the file.

## Verification

```
curl -s https://login.example.com/.well-known/openid-configuration | jq .
```

The response should be valid JSON with at least `issuer`, `authorization_endpoint`, `token_endpoint` and `jwks_uri`. The `issuer` value must equal the URL prefix you advertise to clients.
---

## traffic-advice
Source: https://specification.website/spec/well-known/traffic-advice/

---
title: "/.well-known/traffic-advice"
category: well-known
status: optional
url: https://specification.website/spec/well-known/traffic-advice/
updated: "2026-05-29T17:54:33.000Z"
sources:
  - title: "Traffic Advice — formal specification"
    url: "https://buettner.github.io/private-prefetch-proxy/traffic-advice.html"
    publisher: "Jeremy Roman (editor) / Private Prefetch Proxy community"
  - title: "private-prefetch-proxy on GitHub — traffic-advice.md"
    url: "https://github.com/buettner/private-prefetch-proxy/blob/main/traffic-advice.md"
    publisher: "Private Prefetch Proxy community"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "Private Prefetch Proxy"
    url: "https://developer.chrome.com/blog/private-prefetch-proxy"
    publisher: "Chrome for Developers"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/traffic-advice

> A JSON file that tells private prefetch proxies — most notably Chrome's — whether to send prefetch traffic to your origin, and at what fraction. Optional opt-out / throttle mechanism, provisionally registered with IANA.

## What it is

`/.well-known/traffic-advice` is a JSON document that tells private prefetch proxies — most notably Chrome's [Private Prefetch Proxy](https://developer.chrome.com/blog/private-prefetch-proxy) — whether (and how much) to send prefetch traffic to your origin on a user's behalf. By default a proxy assumes consent. This file lets you refuse, or throttle to a fraction.

The body is a JSON array of advice objects, served as `application/trafficadvice+json`:

```json
[
  {"user_agent": "prefetch-proxy", "disallow": true}
]
```

Each object has a `user_agent` and either `disallow: true` (refuse traffic) or `fraction` (a value between 0 and 1, the share of traffic to allow). A proxy picks the most-specific match — its own brand name (e.g. `"ExamplePrivatePrefetchProxy"`), the generic class `"prefetch-proxy"`, or the wildcard `"*"`. The first identity that appears in the proxy's own self-identification list wins.

The convention was authored by Jeremy Roman at Google and is provisionally registered with IANA. Outside Chrome's Private Prefetch Proxy, no major implementer has adopted it yet.

## Why it matters

Most sites should never need this file. A prefetched response improves [Core Web Vitals](/spec/performance/core-web-vitals/) for the user who clicks through, and the proxy itself caches per HTTP semantics so origin load stays low. Reasons to override the default:

- **Origin under load.** Drop `fraction` during a launch or news spike to thin out speculative requests without affecting real traffic.
- **Log hygiene.** Proxy-sourced prefetches still hit access logs even though they bypass client-side analytics. Disallow to keep raw counts clean.
- **Bandwidth-billed infra.** Origins on per-byte billing may want a fraction below 1, or `disallow` outright.

If none of those apply, ship nothing here — a missing file is the correct signal for "default behaviour is fine".

## How to implement

```http
GET /.well-known/traffic-advice HTTP/1.1
Host: example.com

HTTP/1.1 200 OK
Content-Type: application/trafficadvice+json
Cache-Control: public, max-age=3600

[
  {"user_agent": "prefetch-proxy", "fraction": 0.5}
]
```

- **`Content-Type: application/trafficadvice+json` is mandatory.** Any other value (including `application/json`) is treated as no advice and the proxy uses its default.
- **Cache lifetime.** The spec suggests a minimum freshness of 10 minutes and a maximum of 48 hours; agents default to 30 minutes when no `Cache-Control` is set. Pick a value short enough that posture changes propagate within an operationally reasonable window.
- **Match ordering.** List the broadest advice first (`"prefetch-proxy"`), then narrower per-implementer exceptions. A proxy walks its own identity list and takes the earliest match.
- **Status codes.** Return `200` with JSON, or omit the file. `429` and `503` signal back-pressure — the proxy will pause and retry later. Any other non-OK status is treated as "no advice".

## Common mistakes

- Returning `application/json` instead of `application/trafficadvice+json`. The spec requires the dedicated media type and proxies ignore anything else.
- Using `fraction: 0` to opt out. `disallow: true` is the documented refusal; `fraction: 0` works but is the wrong vocabulary.
- Forgetting the wildcard. To affect every prefetch proxy (not only Chrome's), include an entry with `"user_agent": "*"`.
- Treating absence as a bug. A missing file is the correct "default behaviour" signal — only ship the file when you have a reason to override.

## Verification

```
curl -I https://example.com/.well-known/traffic-advice
curl -s https://example.com/.well-known/traffic-advice | jq .
```

Confirm `Content-Type: application/trafficadvice+json` and a sensible `Cache-Control`. The body should parse as a JSON array; each entry should have a string `user_agent` and one of `disallow: true` or a numeric `fraction` between 0 and 1.
---

## webauthn
Source: https://specification.website/spec/well-known/webauthn/

---
title: "/.well-known/webauthn"
category: well-known
status: optional
url: https://specification.website/spec/well-known/webauthn/
updated: "2026-09-08T00:00:00.000Z"
sources:
  - title: "Web Authentication: An API for accessing Public Key Credentials — Level 3 (W3C Recommendation)"
    url: "https://www.w3.org/TR/webauthn-3/"
    publisher: "W3C Web Authentication Working Group"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "Allow passkey reuse across your sites with Related Origin Requests"
    url: "https://web.dev/articles/webauthn-related-origin-requests"
    publisher: "web.dev"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/webauthn

> A JSON document at /.well-known/webauthn lists the origins allowed to use passkeys scoped to a single Relying Party ID. It enables WebAuthn Related Origin Requests — one passkey shared across several domains you own. Only applicable if the site uses passkeys across more than one origin.

## What it is

`/.well-known/webauthn` is a JSON document that lists the origins permitted to create and use [passkeys](https://www.w3.org/TR/webauthn-3/) scoped to a single Relying Party ID (RP ID). It is the discovery file behind **Related Origin Requests (ROR)**, a feature added in WebAuthn Level 3, which reached W3C Recommendation in August 2026.

A passkey is normally bound to one RP ID, which must match the registrable domain of the site using it. That breaks down when one organisation operates several domains — `example.com`, `example.co.uk`, `example.de` — and wants a single passkey to work across all of them. ROR lets a browser treat a request from a listed origin as valid for the RP ID, after fetching and checking this file.

```json
{
  "origins": [
    "https://example.com",
    "https://example.co.uk",
    "https://example.de"
  ]
}
```

## Why it matters

- **One credential, many domains.** Users register a passkey once and sign in across every related property, instead of one passkey per ccTLD or brand domain.
- **No shared secret or redirect dance.** The allowlist is a static, publicly fetchable file. The browser, not your servers, enforces it.
- **It is a platform feature, not a vendor one.** ROR is in the W3C Recommendation and ships in Chrome, Safari, and Firefox (152+), so the behaviour is consistent across browsers.

## How to implement

- Host the file at `https://<rp-id>/.well-known/webauthn` — on the RP ID's origin, served over **HTTPS**.
- Serve it as `application/json` with HTTP **200**.
- Include an `origins` array of the full origins (scheme + host) allowed to use this RP ID's passkeys.
- Pass an `RP ID` to `navigator.credentials.get()` that differs from the requesting origin; the browser then fetches this file to authorise the cross-origin use.
- The browser fetches it **without credentials and without a `Referer` header**, so do not gate it behind cookies, authentication, or a WAF rule that blocks header-less requests.

**Applies only if you use passkeys across more than one origin.** A site with a single domain, or no passkey authentication at all, has nothing to list and should not publish this file.

## Common mistakes

- Listing more registrable domains than the browser will honour. Implementations cap the number of distinct registrable domains processed (five in current browsers) — order the array so the important origins come first.
- Serving the file with `Content-Type: text/html` because a framework wrapped the route.
- Blocking the credential-less, `Referer`-less fetch with a firewall rule, which makes the file invisible to the browser.
- Putting the file on the requesting origin instead of the RP ID's origin.

## Verification

```
curl -I https://example.com/.well-known/webauthn
```

Expect `200` with `Content-Type: application/json`. Confirm the `origins` array contains every property that should share the RP ID's passkeys, and test a real sign-in from each listed origin.
---

## webfinger
Source: https://specification.website/spec/well-known/webfinger/

---
title: "/.well-known/webfinger"
category: well-known
status: optional
url: https://specification.website/spec/well-known/webfinger/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "RFC 7033 — WebFinger"
    url: "https://www.rfc-editor.org/rfc/rfc7033"
    publisher: "IETF"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "ActivityPub — W3C Recommendation"
    url: "https://www.w3.org/TR/activitypub/"
    publisher: "W3C"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /.well-known/webfinger

> WebFinger (RFC 7033) resolves an account identifier such as acct:user@example.com to a set of links. The Fediverse uses it to discover ActivityPub actors.

## What it is

WebFinger is a discovery protocol defined in **RFC 7033**. A client asks `/.well-known/webfinger` for information about a resource identifier — typically an account in the form `acct:user@example.com` — and the server returns a JSON Resource Descriptor (JRD) describing that resource and where to find more.

It is the protocol that lets you type `@alice@mastodon.example` into any Fediverse client and have it resolve to Alice's ActivityPub profile, regardless of which server she lives on.

## Why it matters

- **Federation depends on it.** Mastodon, Pleroma, Misskey, GoToSocial, PeerTube, Lemmy and every other ActivityPub-speaking platform use WebFinger as step one of "who is this user".
- **It abstracts the URL.** A handle like `acct:joost@example.com` is human-friendly. The actual ActivityPub actor URL might be `https://example.com/users/joost`. WebFinger maps one to the other.
- **It works across protocols.** WebFinger is not tied to ActivityPub. It can advertise any kind of link relation for any kind of resource.

If your site does not host accounts that need to federate, you do not need this URL.

## How to implement

Accept GET requests with a `resource` query parameter. Return `application/jrd+json`.

```http
GET /.well-known/webfinger?resource=acct:joost@example.com HTTP/1.1
Host: example.com
Accept: application/jrd+json
```

A typical response for a Fediverse account:

```json
{
  "subject": "acct:joost@example.com",
  "aliases": [
    "https://example.com/@joost",
    "https://example.com/users/joost"
  ],
  "links": [
    {
      "rel": "http://webfinger.net/rel/profile-page",
      "type": "text/html",
      "href": "https://example.com/@joost"
    },
    {
      "rel": "self",
      "type": "application/activity+json",
      "href": "https://example.com/users/joost"
    }
  ]
}
```

Rules:

- Serve over **HTTPS**, and respond on the host that matches the right-hand side of the `acct:` URI. A query for `joost@example.com` must be answered by `example.com`, not `social.example.com`.
- Return `404` for unknown resources, `400` for a missing or malformed `resource` parameter.
- Accept the `rel` query parameter and filter the `links` array accordingly. Clients use it to reduce payload size.
- Set permissive `Access-Control-Allow-Origin: *` so browser-based clients can fetch the response.

## Common mistakes

- Answering on the wrong host. If user identifiers look like `@alice@example.com` but WebFinger lives on `social.example.com`, federation breaks. Fix this by serving WebFinger from `example.com` and redirecting or proxying as needed.
- Returning `text/plain` or `application/json` instead of `application/jrd+json`.
- Leaking the existence of accounts via different responses for "user exists but private" and "user does not exist". Pick one behaviour and apply it consistently.
- Ignoring the `rel` filter and always returning every link.

## Verification

```
curl -s "https://example.com/.well-known/webfinger?resource=acct:joost@example.com" | jq .
```

Then try to follow your account from a Mastodon server you do not control. If federation fails, WebFinger is almost always the first thing to check.
---

## well-known-overview
Source: https://specification.website/spec/well-known/well-known-overview/

---
title: "Well-known URIs"
category: well-known
status: recommended
url: https://specification.website/spec/well-known/well-known-overview/
updated: "2026-07-09T12:00:00.000Z"
sources:
  - title: "RFC 8615 — Well-Known Uniform Resource Identifiers (URIs)"
    url: "https://www.rfc-editor.org/rfc/rfc8615"
    publisher: "IETF"
  - title: "IANA — Well-Known URIs Registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Well-known URIs

> The /.well-known/ path prefix is a standardised place to publish site-level metadata. RFC 8615 defines it; IANA keeps the registry of allowed names.

## What it is

A well-known URI is a resource served from a fixed path under `/.well-known/` on your origin. RFC 8615 reserves this prefix so that protocols and tools can probe a site for capabilities without guessing URLs or polluting the root namespace.

```
https://example.com/.well-known/change-password
https://example.com/.well-known/security.txt
https://example.com/.well-known/webfinger?resource=acct:user@example.com
```

`/.well-known/` is a URL namespace, not a directory you have to fill with files. Some well-known resources are static documents, but others are produced on demand: `/.well-known/change-password` is a redirect, and `/.well-known/webfinger` answers a query string. A client only cares about the path and the response, never whether a file sits on disk behind it, so any of these can be a dynamic route.

The names allowed under `/.well-known/` are not arbitrary. IANA maintains a public registry; new names go through a review process. If you publish at a name that is not registered, you are claiming a path that may later be assigned to someone else.

## Why it matters

- **Discoverability.** Clients, browsers, password managers, federated servers, mobile operating systems and crawlers know exactly where to look. They do not need configuration per site.
- **Interoperability.** Standardised paths are what let Mastodon, Apple, Google, OpenID Connect, ACME (Let's Encrypt) and others work across millions of sites without coordination.
- **Stability.** The reserved prefix keeps protocol metadata out of the way of your application's routing. You will not accidentally collide with `/security.txt` if it lives under `/.well-known/`.

Some capabilities span **several** well-known URIs that reference each other, so a client can follow the chain with no prior configuration. OAuth 2.0 discovery is the clearest example: a protected resource describes itself at [`/.well-known/oauth-protected-resource`](/spec/well-known/oauth-protected-resource/) and names its authorisation server(s), whose own metadata lives at [`/.well-known/oauth-authorization-server`](/spec/well-known/oauth-authorization-server/) — or [`/.well-known/openid-configuration`](/spec/well-known/openid-configuration/) for OpenID Connect.

## How to implement

- Serve the resource over **HTTPS** on the canonical host.
- Use the **exact path and filename** the spec defines. Case matters on most servers.
- Set the **correct Content-Type** (often `application/json`, sometimes plain text or JSON variants like `application/jrd+json`).
- Return **HTTP 200** with the body, or follow the spec where it allows a redirect (for example, `change-password`).
- Allow your CDN, firewall and authentication middleware to pass through. A well-known URI behind a login wall is invisible.
- **Do not invent new names.** If you need a new well-known URI, register it via the IETF process described in RFC 8615 §3.

## Common mistakes

- Publishing under `/well-known/` (no leading dot). The spec requires `/.well-known/`.
- Serving the file with `Content-Type: text/html` because a framework wrapped it.
- Requiring authentication, blocking by user-agent, or rate-limiting probes so aggressively that legitimate clients fail.
- Using a name not in the IANA registry. Custom names belong elsewhere.

## Verification

- `curl -I https://example.com/.well-known/<name>` should return `200` and the correct content type.
- Confirm the name appears in the [IANA registry](https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml).
- Probe from a network outside your own to catch firewall and WAF rules.
---

