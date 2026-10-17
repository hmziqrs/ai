# Agent Readiness — deep reference (verbatim spec pages)

Verbatim content of The Website Specification pages for this category, fetched 2026-10-17 (content CC BY 4.0 / code MIT). Canonical base: https://specification.website/spec/agent-readiness/. Assembled from the local evidence corpus (.zflow/evidence/specweb/agent-readiness/). Live truth and deltas: the specification-website skill (MCP get_changes). Loaded on demand when a checklist check fails or the full rule text, examples, or cited standards are needed.

## a2a-agent-cards
Source: https://specification.website/spec/agent-readiness/a2a-agent-cards/

---
title: "A2A agent cards"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/a2a-agent-cards/
updated: "2026-10-15T00:00:00.000Z"
sources:
  - title: "A2A Protocol — Specification"
    url: "https://a2a-protocol.org/latest/specification/"
    publisher: "A2A Project (Linux Foundation)"
  - title: "A2A Protocol — Agent Discovery"
    url: "https://a2a-protocol.org/latest/topics/agent-discovery/"
    publisher: "A2A Project (Linux Foundation)"
  - title: "A2A Protocol — What's new in v1.0"
    url: "https://a2a-protocol.org/latest/whats-new-v1/"
    publisher: "A2A Project (Linux Foundation)"
  - title: "RFC 8615 — Well-Known URIs"
    url: "https://www.rfc-editor.org/rfc/rfc8615"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# A2A agent cards

> The Agent-to-Agent (A2A) protocol lets an autonomous agent find another autonomous agent and call it over JSON-RPC. Discovery hinges on a single well-known file: `/.well-known/agent-card.json`. Relevant whenever your service exposes agentic behaviour another agent might want to delegate to.

## What it is

The Agent-to-Agent (A2A) protocol is an open standard for one autonomous agent to discover and call another. It was originally proposed by Google in 2025 and donated to the Linux Foundation later that year. It complements the [Model Context Protocol](/spec/agent-readiness/mcp-and-tool-discovery/): MCP exposes tools an LLM can call; A2A exposes a whole agent another agent can delegate to.

Discovery is deliberately small. An A2A-speaking service hosts a JSON manifest at the well-known URI `/.well-known/agent-card.json`. The manifest is the **agent card** — a self-describing document that names the agent, lists its skills, declares its capabilities, and points at one or more transport endpoints that speak the A2A wire protocol (JSON-RPC, gRPC, or HTTP+JSON).

The minimum field set is small and stable. Required fields per the spec are `name`, `description`, `version`, `supportedInterfaces` (each with `url`, `protocolBinding`, `protocolVersion`), `capabilities`, `defaultInputModes`, `defaultOutputModes`, and `skills` (each with `id`, `name`, `description`, `tags`). Optional fields cover provider, documentation URL, security schemes, JWS signatures, and an icon URL.

The card's `version` is the version of _your agent_, not of the protocol. Since 1.0 the protocol version lives on each entry in `supportedInterfaces`, because one card can now offer several interfaces speaking different protocol versions. There is no top-level `protocolVersion` any more, and a card that still carries one is following a 0.3-era example.

This site ships such a card as a worked example. The static manifest is at [`/.well-known/agent-card.json`](/.well-known/agent-card.json); the JSON-RPC endpoint is at [`mcp.specification.website/a2a/v1`](https://mcp.specification.website/a2a/v1). It is intentionally minimal — one send-message method, no streaming, no task lifecycle — and it wraps the same search and topic-fetch logic the MCP server already exposes. It is not yet fully in line with 1.0: the endpoint answers the pre-1.0 method name `message/send` rather than `SendMessage`, and the card still carries a top-level `protocolVersion` next to the per-interface one.

## Why it matters

- An agent card is the standard way for a calling agent to learn what you do, before any call is made. Without it, the calling agent has to be hard-coded against your service or guess from a UI.
- A2A is transport-agnostic: a single card can advertise JSON-RPC, gRPC, and HTTP+JSON endpoints in priority order. Clients pick the binding they support.
- It composes cleanly with MCP. An MCP server gives an LLM tools; an A2A card lets that whole LLM-plus-tools agent be reached by *other* agents. The two protocols are not alternatives.
- The card is a contract. Treat changes to `skills[].id`, `supportedInterfaces[].url`, or `capabilities` as breaking, and bump `version` accordingly.

Adoption is early but accelerating. The protocol reached version 1.0 in March 2026. Treat A2A as `optional` for now — useful if your product is itself an agent or wraps one, overkill if it is a static brochure.

## How to implement

- **Build the card.** Author a JSON document with `name`, `description`, `version`, `provider`, `supportedInterfaces` (each declaring its own `url`, `protocolBinding` and `protocolVersion`), `capabilities`, `defaultInputModes`, `defaultOutputModes`, and `skills`. Use the [A2A specification](https://a2a-protocol.org/latest/specification/) as the field reference. Use camelCase keys throughout.
- **Pick a transport.** JSON-RPC over HTTPS is the lowest-friction option and is what we ship here. gRPC is appropriate when you already speak gRPC; HTTP+JSON when you have an existing REST surface to wrap.
- **Serve it at the canonical URI.** Per [RFC 8615](https://www.rfc-editor.org/rfc/rfc8615), publish at `/.well-known/agent-card.json` with `Content-Type: application/json` and a sensible `Cache-Control` (an hour is fine; ETag is better).
- **Advertise it.** Add a `Link: </.well-known/agent-card.json>; rel="service-desc"; type="application/json"` response header so clients can discover the card without guessing the path. Add the same link to your [`/.well-known/api-catalog`](/spec/well-known/api-catalog/) Linkset entry. See [HTTP Link headers](/spec/agent-readiness/link-headers/).
- **Ship the endpoint behind it.** Do not publish a card that points at a non-existent URL. The first call most validators make is to the endpoint; a 404 there is worse than no card at all. At minimum, implement the `SendMessage` JSON-RPC method and return method-not-found for the rest.
- **Migrate the whole wire format.** Version 1.0 renamed JSON-RPC methods: `message/send` became `SendMessage`, `message/stream` became `SendStreamingMessage`, and `tasks/get` became `GetTask`. It also changed payloads: message roles use `ROLE_USER` and `ROLE_AGENT`, and parts are identified by their fields instead of a `kind` discriminator. Follow the [1.0 migration guide](https://a2a-protocol.org/latest/whats-new-v1/) for the request, response and agent-card changes. Method aliases alone do not preserve 0.3 compatibility. If you retain 0.3 clients, serve discovery cards and wire formats those clients understand, using a separate endpoint or a version-aware compatibility layer that parses and emits the appropriate format; advertise only versions each interface actually implements.
- **Be honest about capabilities.** If you do not support streaming, set `capabilities.streaming` to `false`. The same goes for `pushNotifications` and `extendedAgentCard`. Lying here breaks clients that probe before they call.
- **Sign the card if you care about provenance.** A2A allows JWS signatures (`signatures[]`); useful in curated registries, optional for direct discovery.

## Common mistakes

- Publishing a card that points at a URL that 404s. Discovery validators check the URI; runtime agents check the endpoint. Both matter.
- Mixing up `agent-card.json` with `agent.json`. The canonical filename is `agent-card.json` — pick it, do not invent a redirect.
- Claiming capabilities you do not implement. Setting `streaming: true` without a working `SendStreamingMessage` method is a contract violation, not a polite overstatement.
- Declaring `protocolVersion` `1.0` while answering 0.3 method names. Many early examples and tutorials predate 1.0, so code copied from them answers `message/send`; a strict 1.0 client sends `SendMessage` and gets method-not-found.
- Treating the card as static when the agent evolves. Every change to skills or transports needs a `version` bump.
- Forgetting the `Content-Type`. A card served as `text/plain` will be rejected by stricter clients. Serve it as `application/json`.

## Verification

- `curl https://your-site.example/.well-known/agent-card.json` returns 200 with `Content-Type: application/json` and parses as JSON.
- The JSON validates against the A2A schema for each interface's `protocolVersion`. Required fields are present; `supportedInterfaces[0].url` resolves; `skills` are non-empty.
- `curl -X POST` against `supportedInterfaces[0].url` with a minimal JSON-RPC body using the method name for that interface's version (`SendMessage` for 1.0) returns a JSON-RPC response (not an HTML error page).
- The card appears in your `/.well-known/api-catalog` Linkset and in the `Link` response header on `/`.
- A live test: connect the agent from a second A2A-speaking client and confirm at least one skill round-trips end-to-end.
---

## agent-readiness-overview
Source: https://specification.website/spec/agent-readiness/agent-readiness-overview/

---
title: "Agent readiness"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/agent-readiness-overview/
updated: "2026-06-08T00:00:00.000Z"
sources:
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
  - title: "The /llms.txt proposal"
    url: "https://llmstxt.org/"
    publisher: "llmstxt.org"
  - title: "Overview of Google crawlers and fetchers"
    url: "https://developers.google.com/crawling/docs/crawlers-fetchers/overview-google-crawlers"
    publisher: "Google Crawling Infrastructure"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Agent readiness

> Agent readiness is the set of choices that make a site legible to AI agents and LLMs: stable URLs, structured data, clean semantics, robots controls, and machine-readable endpoints.

## What it is

Agent readiness is a loose umbrella term for the choices that make a website legible to AI agents — chat assistants, autonomous browsers, retrieval pipelines, and any other non-human client that reads the web at scale. None of it is a single formal standard. It is a collection of existing web fundamentals plus a few emerging conventions.

The clearest checklist is published at [isitagentready.com](https://isitagentready.com/), which scores sites against a small set of agent-friendly signals.

## Why it matters

Agents read the same HTML as browsers, but they read it differently. They:

- Fetch a page, often without executing JavaScript.
- Strip away navigation, ads, and chrome to extract the main content.
- Follow links, structured data, and well-known endpoints to discover more.
- Cache and quote your content in answers, with or without a link back.

If your content is locked behind client-side rendering, your URLs change every release, or your robots.txt blocks the assistants your customers use, you are invisible in that surface. The pages that win in agent answers are the ones that are easy to fetch, easy to parse, and easy to trust.

## How to implement

There is no single switch. The items in this category each cover one part:

- **Stable URLs** so cached answers stay valid.
- **Structured data** (JSON-LD) so agents can extract entities without guessing.
- **Clean semantic HTML** so content extraction does not pull in navigation.
- **A robots.txt that names AI crawlers explicitly** so your policy is unambiguous.
- **/llms.txt** as a curated index of your most important content (emerging).
- **Machine-readable endpoints** — sitemaps, RSS, JSON feeds — where they fit.
- **MCP server endpoints** for sites that expose tools or actions (emerging).

Most of these also benefit traditional search engines and accessibility. Agent readiness rarely conflicts with the rest of the spec; it just raises the priority of things that have always been good practice.

## Common mistakes

- Treating agent readiness as a separate project from SEO and accessibility. The work overlaps heavily.
- Assuming AI crawlers will execute JavaScript. Most do not, or do it inconsistently.
- Writing for the model rather than the reader. Agents quote what humans would quote.
- Blocking every AI crawler by default, then wondering why your brand has no presence in assistants.

## Verification

- Run your site through [isitagentready.com](https://isitagentready.com/).
- Fetch a key page with `curl` and confirm the main content is in the initial HTML.
- Check `/robots.txt` lists the crawlers you intend to allow or block.
---

## agent-skills-discovery
Source: https://specification.website/spec/agent-readiness/agent-skills-discovery/

---
title: "Agent Skills discovery"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/agent-skills-discovery/
updated: "2026-05-29T11:27:49.000Z"
sources:
  - title: "Agent Skills Discovery via Well-Known URIs (RFC draft)"
    url: "https://github.com/cloudflare/agent-skills-discovery-rfc"
    publisher: "Cloudflare"
  - title: "Agent Skills specification"
    url: "https://agentskills.io/specification"
    publisher: "agentskills.io"
  - title: "RFC 8615 — Well-Known URIs"
    url: "https://datatracker.ietf.org/doc/html/rfc8615"
    publisher: "IETF"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Agent Skills discovery

> A well-known URI that lists Agent Skills — short, scoped instructions an AI agent can load to work better with your site. Emerging convention via a Cloudflare-led RFC; still draft, still cheap to ship.

## What it is

An Agent Skill is a small Markdown file — a `SKILL.md` with YAML frontmatter — that gives an AI agent a focused capability: when to use it, how to call your APIs, which conventions to follow. The format originated with Anthropic; the [agentskills.io specification](https://agentskills.io/specification) documents it.

Agent Skills Discovery is the convention for *publishing* those skills so any agent can find them. Per the Cloudflare-led [discovery RFC](https://github.com/cloudflare/agent-skills-discovery-rfc) (currently draft v0.2.0), publishers ship a JSON index at:

```
/.well-known/agent-skills/index.json
```

Each entry in the index has a `name`, `type` (`skill-md` or `archive`), `description`, `url`, and a `sha256` digest of the artefact. A top-level `$schema` field identifies the index version.

This site publishes one such skill: [`/.well-known/agent-skills/specification-website/SKILL.md`](/.well-known/agent-skills/specification-website/SKILL.md), advertised in [`/.well-known/agent-skills/index.json`](/.well-known/agent-skills/index.json). It teaches an agent how to query the spec via Markdown endpoints, [llms.txt](/spec/agent-readiness/llms-txt/), and the [MCP server](/spec/agent-readiness/mcp-and-tool-discovery/).

## Why it matters

- One URL answers "what skills does this site publish for agents?" — no scraping, no per-vendor registry.
- Skills are vendor-neutral Markdown. The same file works in Claude, in agent harnesses, and in anything else that loads the format.
- The `digest` field gives clients cheap change detection and integrity verification.
- It composes with other agent-readiness signals: a skill can teach an agent to prefer your `.md` endpoints, hit your MCP server, or follow your structured-data conventions.

Adoption is early. Treat it as a low-cost bet, not a settled standard.

## How to implement

- Author one or more `SKILL.md` files. Each MUST start with YAML frontmatter containing `name` (lowercase, hyphens, 1–64 chars) and `description` (≤1024 chars, written so an agent can decide whether to load the full body).
- Host each skill at `/.well-known/agent-skills/<name>/SKILL.md`. Serve as `text/markdown`.
- Publish `/.well-known/agent-skills/index.json` with `$schema` set to `https://schemas.agentskills.io/discovery/0.2.0/schema.json` and a `skills` array. Each entry needs `name`, `type`, `description`, `url`, and `digest`.
- Compute the digest as `sha256:<hex>` over the raw bytes of the artefact. Recompute and update the index every time the artefact changes.
- Advertise the index in [`/.well-known/api-catalog`](/spec/well-known/api-catalog/) and as a [`Link`](/spec/agent-readiness/link-headers/) header: `rel="agent-skills"; type="application/json"`.
- Serve both files with CORS open (`Access-Control-Allow-Origin: *`) so browser-based agents can fetch them.

## Common mistakes

- Letting the `digest` drift from the file. A mismatch makes the artefact unverifiable; compliant clients will refuse it.
- Writing the description as marketing copy. It is the only thing most agents read — front-load the *when to use this* signal.
- Bundling many unrelated capabilities into one skill. Prefer several small skills with sharp descriptions over one omnibus file.
- Forgetting `$schema`. Without it, clients fall back to v0.1.0 parsing and your entries may be ignored.
- Hosting `SKILL.md` with the wrong content type. `text/html` will confuse agents that fetch it directly.

## Verification

- `curl -sI https://example.com/.well-known/agent-skills/index.json` — confirm `200`, `Content-Type: application/json`.
- Parse the JSON and verify `$schema` matches the v0.2.0 URI.
- For each entry, fetch the `url`, hash the bytes, and confirm the result equals the `digest`.
- Validate with [isitagentready.com](https://isitagentready.com/) — `checks.discovery.agentSkills.status` should report `pass`.
---

## agentic-resource-discovery
Source: https://specification.website/spec/agent-readiness/agentic-resource-discovery/

---
title: "Agentic Resource Discovery (ARD)"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/agentic-resource-discovery/
updated: "2026-07-31T00:00:00.000Z"
sources:
  - title: "Agentic Resource Discovery (ARD) specification"
    url: "https://agenticresourcediscovery.org/"
    publisher: "ARD Project (Linux Foundation)"
  - title: "AI Catalog standard"
    url: "https://github.com/Agent-Card/ai-catalog"
    publisher: "AI Catalog Working Group, Linux Foundation"
  - title: "RFC 8141 — Uniform Resource Names (URNs)"
    url: "https://www.rfc-editor.org/rfc/rfc8141"
    publisher: "IETF"
  - title: "Announcing the Agentic Resource Discovery specification"
    url: "https://developers.googleblog.com/announcing-the-agentic-resource-discovery-specification/"
    publisher: "Google"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Agentic Resource Discovery (ARD)

> Publish an AI Catalog at /.well-known/ai-catalog.json listing the agent capabilities your domain offers — MCP servers, A2A agents — so registries and agents can find and trust them from one fetch.

## What it is

Agentic Resource Discovery (ARD) is a draft discovery layer — not a runtime — that lets a domain advertise which agent capabilities it offers and how to verify them. It answers three questions for an agent: where the right capability lives, which one to use, and whether it is safe to connect. It builds on the **AI Catalog** standard, both developed under a Linux Foundation working group and published Apache 2.0.

The core is a manifest at `/.well-known/ai-catalog.json`. Each `entries[]` item has a URN `identifier`, a `displayName`, a media type, and either an inline `data` object or a `url` pointing at the real artefact. The media types tie ARD to the rest of the agent-readiness graph:

| Media type | Points at |
|---|---|
| `application/mcp-server-card+json` | An [MCP server card](/spec/agent-readiness/mcp-and-tool-discovery/) |
| `application/a2a-agent-card+json` | An [A2A agent card](/spec/agent-readiness/a2a-agent-cards/) |
| `application/agentskill+zip` | An [Agent Skill](/spec/agent-readiness/agent-skills-discovery/) |
| `application/ai-catalog+json` | A nested catalog |

**Two specs, two field names.** The base [ai-catalog](https://github.com/Agent-Card/ai-catalog) spec names the media-type field `mediaType`; the ARD layer that builds on it names it `type` and adds an optional `representativeQueries` array (2–5 natural-language prompts) so a registry can match an entry to a user's intent. The two diverged, so the safe move is to emit **both** field names with the same value plus `representativeQueries` — that validates under either spec, since both require consumers to preserve unknown keys.

Beyond the well-known file itself, three mechanisms point agents at it: a `<link rel="ai-catalog">` (also emittable as an HTTP `Link` header); an `Agentmap:` directive in `robots.txt`; and DNS service-binding records `_catalog._agents.<domain>` and `_search._agents.<domain>` — the same `_agents` namespace as [DNS-AID](/spec/agent-readiness/dns-aid/).

## Why it matters

- **One fetch, typed answer.** Instead of guessing at well-known paths one by one, an agent reads a single manifest that names every capability and its media type.
- **Domain-anchored trust, if you can anchor it.** An optional `trustManifest` (SPIFFE ID, DID, or HTTPS identity, plus attestations and an optional JWS signature) lets a client verify the publisher cryptographically. The signature is a detached JWS over the JCS-canonicalised ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) trust manifest with the `signature` field removed; for an HTTPS identity, the verifier fetches the JWK Set at the identity URL and selects the key by the JWS `kid`. Read the next section before reaching for it — an HTTPS identity on your own origin is weaker than it looks.
- **Registry-friendly.** Registries crawl published catalogs and make them searchable, so a capability listed once becomes discoverable across the agentic web.

## How to implement

Publish `/.well-known/ai-catalog.json` with a `specVersion`, a `host` block, and one entry per capability you actually run. Reference your existing MCP and A2A cards by `url` rather than duplicating them. Advertise the manifest with a `link rel`, the `robots.txt` `Agentmap:` directive, and, if you publish DNS, the `_catalog._agents` record. Don't list endpoints you don't offer.

### Sign it only if the key lives somewhere the catalogue doesn't

The obvious way to use `trustManifest` is an HTTPS identity pointing at a JWK Set on your own origin. Think about what that buys. An attacker who can rewrite `/.well-known/ai-catalog.json` can rewrite `/.well-known/jwks.json` in the same breath, substitute their own key, and produce a manifest that verifies perfectly. The signature is defeated by exactly the compromise it exists to detect, because the document and the key that vouches for it share a fate.

A signature is only worth its weight when the verifying key is resolvable **independently of the signed document** — a DNSSEC-signed record, a key pinned by the verifier out of band, or a JWK Set on infrastructure an origin compromise would not reach. Absent one of those, an unsigned catalogue served over HTTPS makes the same guarantee with none of the machinery: TLS already proves the bytes came from the domain.

Note also that the signature covers the trust manifest **only, not `entries`**. That is convenient — entries change without re-signing — but it means the fields worth attacking are the unsigned ones. Rewriting an entry's `url` to point an agent at a hostile MCP endpoint leaves a valid signature intact.

**This site publishes the catalogue unsigned, deliberately.** [`/.well-known/ai-catalog.json`](/.well-known/ai-catalog.json) catalogues our MCP server, A2A agent, [Agent Skill](/spec/agent-readiness/agent-skills-discovery/), and [OKF bundle](/spec/agent-readiness/okf-bundle/), advertised through the `Link` header, a `link rel`, `robots.txt`, and a `_catalog._agents` DNS record; each entry carries both `mediaType` and `type` plus `representativeQueries`. We previously shipped a detached ES256 JWS with the JWK Set on this origin, and removed it: it protected three static fields, left every entry unsigned, and folded to any compromise that could reach the catalogue. Publishing it and explaining why is more use to you than a signature that verifies and proves nothing.

## Common mistakes

- Inventing fields. The entry schema is small — `identifier`, `displayName`, the media-type field (`mediaType` and/or `type`), and exactly one of `url` or `data`.
- A URN publisher segment that doesn't match the `trustManifest` identity domain — verification then fails.
- Signing the manifest with a key served from the same origin as the manifest, and treating the result as tamper-evidence. It is not: whoever can change one can change the other.
- Listing aspirational capabilities. The catalogue is a contract; only list what resolves.

## Verification

- `curl -s https://example.com/.well-known/ai-catalog.json | jq .` returns valid JSON with `specVersion` and `entries`.
- Each entry `url` resolves to a document of the declared `mediaType`.
- The `Agentmap:` line is present in `robots.txt` and the `ai-catalog` `Link` rel is on the homepage response.
- If a `trustManifest.signature` is present, it verifies: fetch the JWK Set at the `identity` URL, JCS-canonicalise the manifest minus `signature`, and check the detached JWS against the key named by its `kid`. Then check the harder question — whether the `identity` URL is reachable by anyone who could alter the catalogue itself. If it is, the verification is circular.
---

## auth-md
Source: https://specification.website/spec/agent-readiness/auth-md/

---
title: "auth.md — agent registration instructions"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/auth-md/
updated: "2026-09-30T00:00:00.000Z"
sources:
  - title: "WorkOS — The auth.md file"
    url: "https://workos.com/auth-md/docs/auth-md"
    publisher: "WorkOS"
  - title: "auth.md — protocol and reference implementation"
    url: "https://github.com/workos/auth.md"
    publisher: "WorkOS"
  - title: "RFC 9728 — OAuth 2.0 Protected Resource Metadata"
    url: "https://www.rfc-editor.org/rfc/rfc9728"
    publisher: "IETF"
  - title: "RFC 9700 — Best Current Practice for OAuth 2.0 Security"
    url: "https://www.rfc-editor.org/rfc/rfc9700.html"
    publisher: "IETF"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# auth.md — agent registration instructions

> An auth.md file tells agents how to register with a service and obtain scoped API access. An emerging convention for services that support agent registration, backed by OAuth metadata and server-enforced permissions.

## What it is

`auth.md` is a public Markdown document at a service's root, such as `https://example.com/auth.md`, describing how an agent registers and obtains API access. It is an emerging, WorkOS-authored open convention with a reference implementation, rather than an IETF standard. Its OAuth building blocks are standards; its `agent_auth` metadata extension and claim grant are specific to this protocol.

The file documents a registration system. Publishing Markdown alone does not create accounts, authenticate users, or grant permission. [OAuth protected resource metadata](/spec/well-known/oauth-protected-resource/) identifies the API and its authorisation servers; [authorisation server metadata](/spec/well-known/oauth-authorization-server/) provides the endpoints. The prose guides an agent through those services.

This site does not publish auth.md: its public content and MCP endpoint do not require user registration or delegated access.

## Why it matters

For a service that accepts agent registrations, a discoverable procedure can reduce reliance on an agent navigating a human sign-up form. The service still decides which identities to trust and which actions to permit.

Keep this optional. A public information site has no registration workflow to describe, and a service with an existing OAuth integration should assess whether this emerging protocol adds value for its clients.

## How to implement

Serve public Markdown over HTTPS at `/auth.md`, without a login wall. Link to it from integration documentation and the protocol's `agent_auth.skill` metadata field. Keep its hostnames, scopes, request examples, errors, and renewal instructions aligned with the deployed API.

Organise the file as a walkthrough: discover OAuth metadata, choose a supported registration method, register, complete any user claim, exchange the assertion, call the API, and handle revocation. Endpoint URLs should come from metadata rather than guesses based on example paths.

The reference implementation supports provider-issued identity assertions, an email-based flow requiring user confirmation, and anonymous registration with restricted access before a user claims it. Describe only the methods your service implements. Its claim ceremony resembles OAuth device authorisation, but uses a protocol-specific grant; a generic device-flow client cannot be assumed compatible.

### Security boundaries

Treat the Markdown as documentation. Enforce permissions at the API, with audience-restricted tokens and the minimum scopes needed, following [OAuth security best practice](https://www.rfc-editor.org/rfc/rfc9700.html).

For identity assertions, validate signatures, trusted issuers, audience, expiry, authentication freshness, and replay protection. The reference template requires user consent before asserting their identity and confirmation before linking an unfamiliar provider identity to an existing account. An email address supplied by an agent is not proof of account ownership.

For user claims, show the user which service and permissions they are authorising. Have them authenticate and enter the code on the service's own page. Restrict anonymous access and enforce code expiry and attempt limits server-side.

Keep tokens and assertions out of the public file, URLs, and logs. Verify that revocation prevents continued access, including obtaining new tokens from an earlier assertion.

## Common mistakes

- Publishing the file before implementing its registration endpoints.
- Describing WorkOS-specific extensions as requirements of an OAuth RFC.
- Treating a provider identity as permission for every action.
- Confusing registration on behalf of a user with [Web Bot Auth](/spec/agent-readiness/web-bot-auth/), which verifies the identity of automated HTTP traffic.

## Verification

Fetch `/auth.md` without credentials and confirm it returns readable Markdown rather than a login page. Compare every documented endpoint and scope with live metadata.

In a test environment, complete each supported method and check that unsupported methods fail. Try an untrusted assertion issuer, wrong audience, expired claim code, and access outside the granted scopes. Revoke the registration and confirm both API access and further token issuance fail. A successful file fetch verifies discovery only; these checks verify the workflow it describes.
---

## content-signals
Source: https://specification.website/spec/agent-readiness/content-signals/

---
title: "Content Signals in robots.txt"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/content-signals/
updated: "2026-09-26T00:00:00.000Z"
sources:
  - title: "IETF AI Preferences WG (aipref) — drafts"
    url: "https://datatracker.ietf.org/wg/aipref/documents/"
    publisher: "IETF"
  - title: "IAB Tech Lab — Content Monetization Protocols (CoMP) for AI"
    url: "https://iabtechlab.com/working-groups/content-monetization-protocols-comp-for-ai-working-group/"
    publisher: "IAB Tech Lab"
  - title: "Is It Agent Ready? — Content Signals check"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
  - title: "RFC 9309 — Robots Exclusion Protocol"
    url: "https://www.rfc-editor.org/rfc/rfc9309"
    publisher: "IETF"
  - title: "Content Signals"
    url: "https://contentsignals.org/"
    publisher: "Cloudflare"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Content Signals in robots.txt

> Add Content-Signal directives to robots.txt to declare whether AI crawlers may search, ingest, or train on your content. An emerging IETF AI Preferences / IAB Tech Lab proposal that some validators already check.

## What it is

Content Signals is a proposed extension to `robots.txt` that adds new directives expressing how a site wants its content treated downstream — specifically by AI systems. The directives live in normal `robots.txt` groups and declare boolean preferences such as "you may use this for search" or "you may not train on this".

```
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

The three values validators read today:

- **`search`** — whether the content may be indexed by search engines.
- **`ai-input`** — whether the content may be fetched as live input to an AI system (retrieval-augmented generation, summarisation at query time).
- **`ai-train`** — whether the content may be included in a training corpus.

Each takes `yes` or `no`. Multiple values are comma-separated on a single `Content-Signal:` line.

## Status of the proposal

This is **not yet a settled standard**. The work is split across two efforts:

- The **IETF AI Preferences working group ([aipref](https://datatracker.ietf.org/wg/aipref/documents/))** is defining both the vocabulary and the mechanism that attaches it to content.
- The **IAB Tech Lab Content Signals project** has published a parallel specification aimed at industry adoption.

Both IETF documents are currently active. [draft-ietf-aipref-vocab](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/) reached revision 08 on 14 September 2026; [draft-ietf-aipref-attach](https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/), which defines how a preference binds to content over HTTP, lapsed in mid-2026 and was reposted as revision 05 on 19 August 2026. Neither has been handed to the IESG, so neither is near publication as an RFC.

The part worth knowing is that **the IETF vocabulary does not use the names you put in `robots.txt`.** The draft labels its three usage categories `train-ai`, `ai-use` and `search`; the directive that validators and [Cloudflare's published policy](https://contentsignals.org/) actually read spells the first two `ai-train` and `ai-input`. So the line you can deploy today rests on the IAB Tech Lab specification and on validator convention, and the two vocabularies will have to converge before an RFC lands.

That is not a reason to avoid it, but it is a concrete reason to expect the syntax to move. Treat Content Signals as recommended-to-experiment-with, not as a finalised standard. The directive will be ignored by every crawler that does not yet parse it — which today is most of them.

## Why it matters

- **A declarative opt-in / opt-out at the right layer.** Existing `User-agent: GPTBot / Disallow:` directives are coarse — they block a specific bot from fetching anything. Content Signals separates *what* the bot may do from *who* the bot is.
- **Validators already check for it.** [isitagentready.com](https://isitagentready.com/) explicitly looks for `Content-Signal:` lines in `robots.txt`. Sites that want a clean agent-readiness scorecard should add them.
- **Some major model providers have signalled future support.** Cloudflare, Google, and others have published positions on the IETF drafts.

## How to implement

**Per-group, in `robots.txt`.** Place the `Content-Signal:` line inside the same group as `User-agent:` and `Allow:` / `Disallow:`.

```
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=yes
```

The example above says: "any crawler may use this content for search, for AI input, and for AI training." That is the right declaration for a public spec that wants to be readable.

**Different signals per crawler if your policy varies.** Use a targeted group:

```
User-agent: GPTBot
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no

User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=yes
```

**Pair with crawler-specific blocks where the answer is "no".** Content Signals is a hint; many crawlers still only obey `Disallow:`. A `Content-Signal: ai-train=no` paired with `User-agent: GPTBot \n Disallow: /` is stronger than either alone.

**Don't treat it as legal force.** It is a declaration. Compliance is voluntary, and the legal status of "you used my content for training despite my Content-Signal" is still developing.

## Common mistakes

- Spelling: `Content-Signal:` (singular). Not `Content-Signals:`.
- Putting the directive outside a group (no preceding `User-agent:` line). Some parsers will silently ignore it.
- Conflicting with `Disallow:`. If you `Disallow: /` for a bot, that bot was never going to fetch the page to read your `Content-Signal:`. They contradict; pick one.
- Inventing values beyond `yes` / `no`. The vocabulary is small on purpose.
- Writing the IETF draft's labels (`train-ai`, `ai-use`) in a `Content-Signal` directive. Nothing reads those; the deployed directive uses `ai-train` and `ai-input`.
- Treating it as a substitute for `Disallow:`. It is complementary.

## Verification

- `curl -s https://example.com/robots.txt | grep -i content-signal` lists every directive.
- [Is It Agent Ready?](https://isitagentready.com/) flips `botAccessControl.contentSignals` to `pass`.
- Track the [IETF aipref WG](https://datatracker.ietf.org/wg/aipref/documents/) for the final published vocabulary — names may yet shift before the RFC is published.
---

## dns-aid
Source: https://specification.website/spec/agent-readiness/dns-aid/

---
title: "DNS for AI Discovery (DNS-AID)"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/dns-aid/
updated: "2026-05-29T11:27:49.000Z"
sources:
  - title: "draft-mozleywilliams-dnsop-dnsaid — DNS for AI Discovery"
    url: "https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/"
    publisher: "IETF"
  - title: "RFC 9460 — Service Binding and Parameter Specification via the DNS (SVCB and HTTPS RRs)"
    url: "https://www.rfc-editor.org/rfc/rfc9460"
    publisher: "IETF"
  - title: "RFC 4033 — DNS Security Introduction and Requirements"
    url: "https://www.rfc-editor.org/rfc/rfc4033"
    publisher: "IETF"
  - title: "Is It Agent Ready? — DNS-AID check"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# DNS for AI Discovery (DNS-AID)

> Publish SVCB/HTTPS records under _agents.example.com so agents can discover your services from DNS, before any HTTP round-trip. Pair with DNSSEC so the answer is authenticated.

## What it is

DNS for AI Discovery (DNS-AID) is a draft IETF proposal that uses the existing [SVCB and HTTPS resource records](/spec/security/dnssec/) (RFC 9460) under a reserved `_agents` label to advertise where agents can reach your services. Instead of crawling a homepage to find a `Link` header or a `.well-known/` document, a client makes a single DNS query and gets a typed answer.

The well-known names follow the `_<service>._agents.<domain>` pattern. Two that the current draft and tooling check for:

| Name | Purpose |
|---|---|
| `_index._agents.example.com` | General entry point. Points at the canonical site. |
| `_mcp._agents.example.com`   | An [MCP](/spec/agent-readiness/mcp-and-tool-discovery/) server. |
| `_a2a._agents.example.com`   | An A2A (agent-to-agent) endpoint. |

Each record is in ServiceMode (priority ≥ 1), carrying `alpn` and `port` parameters at minimum:

```
_index._agents.example.com.  3600 IN HTTPS 1 example.com.            alpn="h3,h2" port=443
_mcp._agents.example.com.    3600 IN HTTPS 1 mcp.example.com.        alpn="h3,h2" port=443 mandatory="alpn,port"
```

## Why it matters

- **Discovery before the first HTTP request.** A DNS lookup is on the critical path for almost every connection anyway; piggybacking discovery on it is free.
- **Works for non-HTTP services too.** Any service with an ALPN identifier can be advertised this way.
- **Authenticated.** Combined with [DNSSEC](/spec/security/dnssec/), a validating resolver returns proof-of-authenticity. Without DNSSEC the record is just a hint.
- **Required by some agent-readiness validators.** [isitagentready.com](https://isitagentready.com/) explicitly checks for these records and for DNSSEC validation on the answer.

## How to implement

**Pick the services to advertise.** At minimum: `_index._agents`. If you run a public MCP server, also `_mcp._agents`. Add `_a2a._agents` when you support agent-to-agent endpoints. Don't advertise endpoints you don't actually offer.

**Use HTTPS records for HTTPS-based services and SVCB for everything else.** Both serialise the same way; HTTPS is the convenience alias for the common case.

**Required parameters:** `alpn` (the protocol the client will speak — typically `h3,h2` for browser-style HTTPS) and `port` (almost always `443`). The draft recommends including `mandatory="alpn,port"` on at least one record to signal to clients that those parameters must be understood.

**Sign the zone.** Without [DNSSEC](/spec/security/dnssec/), the discovery answer is unauthenticated and validators will downgrade or fail. Enable DNSSEC at your authoritative DNS, then ensure your registrar publishes the corresponding DS record.

**Advertise on the canonical domain, not the platform's vendor subdomain.** Records on `your-site.netlify.app` or `your-project.pages.dev` don't help agents that already know your real domain.

**Implementation, on Cloudflare specifically:** create the records as `HTTPS` type with name `_index._agents` (Cloudflare auto-appends the zone), priority `1`, target the canonical hostname, parameters as above. Enable DNSSEC under DNS settings. See `scripts/publish-dns-aid.sh` in this repo for the API call.

## Common mistakes

- Publishing in AliasMode (priority `0`) when you meant ServiceMode. Validators expect ServiceMode for the discovery use case.
- Missing `port`. Most parsers tolerate the omission and assume 443; some don't.
- Inventing custom params with unallocated names. Until the IETF assigns them, use the numeric `keyNNNNN` form rather than guessing a string identifier.
- Forgetting the trailing dot on the target hostname in zone-file syntax. Without it, the target is treated as relative.
- Enabling DNSSEC on the Cloudflare side but not pasting the DS record at an external registrar. The signature exists but the chain of trust breaks at the parent.
- Pointing `_index._agents` at a `pages.dev` / `netlify.app` / `vercel.app` host. Use your real domain.

## Verification

- `dig +short HTTPS _index._agents.example.com` returns a record beginning with `1 example.com.`.
- `dig +dnssec +cd HTTPS _index._agents.example.com` returns an `RRSIG` line — confirming DNSSEC is signing the answer.
- `dig +short DS example.com` returns at least one DS record at the registrar — confirming the chain of trust.
- [Is It Agent Ready?](https://isitagentready.com/) flips `discoverability.dnsAid` to `pass`.
- [Cloudflare DNSSEC Debugger](https://dnssec-debugger.verisignlabs.com/) or `dnssec-analyzer` shows a clean validation chain.
---

## link-headers
Source: https://specification.website/spec/agent-readiness/link-headers/

---
title: "HTTP Link headers for discovery"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/link-headers/
updated: "2026-05-29T14:13:42.000Z"
sources:
  - title: "RFC 8288 — Web Linking"
    url: "https://www.rfc-editor.org/rfc/rfc8288"
    publisher: "IETF"
  - title: "RFC 9727 — Publishing Organisation API Information"
    url: "https://www.rfc-editor.org/rfc/rfc9727"
    publisher: "IETF"
  - title: "RFC 9264 — Linkset: Media Types and a Link Relation Type for Link Sets"
    url: "https://www.rfc-editor.org/rfc/rfc9264"
    publisher: "IETF"
  - title: "IANA — Link Relations Registry"
    url: "https://www.iana.org/assignments/link-relations/link-relations.xhtml"
    publisher: "IANA"
  - title: "Is It Agent Ready? — Link headers check"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HTTP Link headers for discovery

> Use the HTTP Link header to advertise machine-readable resources — llms.txt, sitemap, api-catalog, RSS — directly in the response. Agents that never parse your HTML can still find what they need.

## What it is

The `Link` HTTP response header points the client at related resources. It is the same mechanism as `<link rel="…">` in HTML — same syntax, same registered relation types — except it travels with every response, including responses that have no HTML body (a JSON endpoint, a PDF, a 204).

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Link: </llms.txt>; rel="describedby"; type="text/markdown"; title="Site index for LLMs",
      </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json",
      </sitemap-index.xml>; rel="sitemap"; type="application/xml",
      </rss.xml>; rel="alternate"; type="application/rss+xml"
```

Multiple links may be sent as comma-separated entries inside a single `Link` header (the form above) or as several `Link` headers. Both are valid per [RFC 8288 §3](https://www.rfc-editor.org/rfc/rfc8288#section-3).

## Why it matters

- **HTML-free discovery.** A crawler fetching `HEAD /` sees every machine-readable surface without downloading or parsing the body.
- **Universal.** Works on any response — `application/json`, `image/png`, a 304 Not Modified. There is no `<head>` on a JSON endpoint to put `<link>` tags in.
- **Cache-friendly.** A CDN can route to alternative representations purely from the `Link` header.
- **Required by agent-readiness validators.** [isitagentready.com](https://isitagentready.com/) explicitly checks for it on the homepage. Failing this check is a fail of the whole "discoverability" group.

## How to implement

**Pick registered relation types.** The [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml) is the source of truth. Inventing your own is a bad signal. The relations a content site usually wants:

| `rel` | Purpose |
|---|---|
| `describedby` | A machine-readable description of this resource. Right for `llms.txt`. |
| `alternate` | An alternative representation of the same content (different format or language). Right for `.md` siblings, RSS, Atom, JSON Feed. |
| `api-catalog` | RFC 9727 — the location of `/.well-known/api-catalog`. |
| `sitemap` | The XML sitemap (or sitemap index). |
| `service-desc` / `service-doc` | A machine-readable / human-readable description of an API. |
| `security` | The `security.txt` policy. |
| `author` | Author resource. |
| `license` | Licence terms. |

**Send absolute or root-relative URLs.** Both are valid in `Link`; prefer root-relative for portability across protocols and ports.

**Include `type` and `title`.** They are optional in the header but make the link self-describing without an extra fetch.

**Ship on the homepage at minimum.** If you can afford it, ship on every response — the discovery benefit compounds when the agent enters mid-site.

**Edge configuration is the right layer.** Set `Link` headers at the CDN or reverse proxy, not in application code, so non-HTML responses get them too. On Cloudflare Pages this is one line in [`_headers`](https://developers.cloudflare.com/pages/configuration/headers/). On nginx it is `add_header Link …;`. On Vercel and Netlify it is config-driven.

## Common mistakes

- Sending `Link` only on HTML responses. Defeats the "HTML-free" point — agents looking at your `/api/users.json` get nothing.
- Inventing a custom `rel`. Crawlers ignore it. Use IANA-registered relations only.
- Wrapping URLs in quotes. Per RFC 8288, the URI goes inside `<>` angle brackets, not quotes.
- Forgetting to comma-separate when listing multiple links in one header. Without the comma, parsers see one malformed entry.
- Sending `Link` headers that contradict the HTML `<link rel>` entries. The headers and the HTML should be consistent — they describe the same site.

## Verification

- `curl -sI https://example.com/ | grep -i ^link` — lists every advertised relation in one shot.
- [Is It Agent Ready?](https://isitagentready.com/) flips `discoverability.linkHeaders` to `pass`.
- [Web Linking validator](https://datatracker.ietf.org/doc/html/rfc8288) — parse-and-render tools spot syntactic errors.
- Cross-check against `<head>`: every `rel` in the HTML should have an equivalent in the headers.
---

## llms-full-txt
Source: https://specification.website/spec/agent-readiness/llms-full-txt/

---
title: "/llms-full.txt"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/llms-full-txt/
updated: "2026-05-29T09:45:15.000Z"
sources:
  - title: "The /llms.txt proposal"
    url: "https://llmstxt.org/"
    publisher: "llmstxt.org"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /llms-full.txt

> An extended companion to /llms.txt that concatenates the full markdown content of your key pages into a single file. Useful for small sites, costly for large ones.

## What it is

`/llms-full.txt` is the long companion to [/llms.txt](/spec/agent-readiness/llms-txt/). Where `llms.txt` is an index of links, `llms-full.txt` concatenates the actual markdown content of those pages into a single file. The convention also originates with the [llmstxt.org](https://llmstxt.org/) proposal.

The idea is that an agent fetches one file and receives your entire documentation in plain markdown, ready to use as context. No crawling, no HTML extraction.

It is optional and emerging. Treat it as a nice-to-have for documentation-heavy sites where the content is reasonably small and stable.

```md
# Example Corp — full content

> All public documentation, concatenated.

---

# Getting started

(full markdown of the getting-started page)

---

# API reference

(full markdown of the API reference)
```

## Why it matters

- One fetch, all the content. No retries, no rate limits per page, no broken links.
- Markdown, not HTML. Agents do not have to strip navigation, ads, or scripts.
- Predictable structure. Pages are separated by horizontal rules and headings.
- Useful as a build artefact for your own retrieval pipelines and embeddings.

The trade-off is size. A large documentation site can easily produce a multi-megabyte file. Agents may refuse to load it, or load only the first slice. If your content does not fit comfortably in a single file, stick with `llms.txt` plus per-page markdown.

## How to implement

- Generate the file at build time. Manually maintaining it is not realistic.
- Concatenate the markdown source of the pages listed in `llms.txt`, in the same order.
- Separate sections with `---` and clear `#` headings. Include the page URL near each heading so agents can cite it.
- Strip front-matter and templating artefacts. Keep prose, headings, code blocks, and lists.
- Watch the size. Many model providers cap context windows; aim to stay well under common limits or split into focused files (`llms-api.txt`, `llms-guides.txt`).
- Serve as `text/markdown` or `text/plain`. Set sensible cache headers — this file changes on every doc update.

## Common mistakes

- Including every page on the site. Curate the same way `llms.txt` does.
- Forgetting to update it. A stale concatenation is harder to spot than a stale index.
- Letting it grow until it is too big to be useful. Split it before that point.
- Serving HTML by accident — check the response is real markdown.

## Verification

- Fetch the file and check the size. Anything over a couple of megabytes is suspect.
- Spot-check a few sections against the live pages they were generated from.
- Re-run the build after major content changes and diff against the previous version.
---

## llms-txt
Source: https://specification.website/spec/agent-readiness/llms-txt/

---
title: "/llms.txt"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/llms-txt/
updated: "2026-08-21T00:00:00.000Z"
sources:
  - title: "The /llms.txt proposal (v2)"
    url: "https://llmstxt.org/"
    publisher: "llmstxt.org"
  - title: "llms.txt — changes from v1 to v2"
    url: "https://llmstxt.org/changes.html"
    publisher: "llmstxt.org"
  - title: "RFC 8288 — Web Linking"
    url: "https://www.rfc-editor.org/rfc/rfc8288"
    publisher: "IETF"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# /llms.txt

> A markdown file at the site root that gives LLMs a curated index of your most important content. Now at v2, which makes it discoverable by link relation instead of by guessing the path. Still a convention, not a ratified standard.

## What it is

`/llms.txt` is a proposed convention for a markdown file served at the root of a site. It gives large language models a short, curated map of the content you most want them to see. The proposal lives at [llmstxt.org](https://llmstxt.org/) and was put forward by Jeremy Howard in 2024.

The name invites a comparison with `robots.txt`, and it is the wrong one. `robots.txt` is a control file: it grants and withholds access, crawler by crawler. `llms.txt` controls nothing. Listing a page in it does not open that page, and leaving one out does not protect it; the file is an index and an invitation, not a permission. Access and usage policy live elsewhere, in [robots.txt for AI crawlers](/spec/agent-readiness/robots-for-ai-crawlers/) and [Content Signals](/spec/agent-readiness/content-signals/), which actually allow, disallow, and set training preferences.

It is still not a ratified standard, and no model vendor discloses whether its crawlers read the file. Everything around that has moved, though. The proposal reached v2 in 2026, revised after two years of deployment; OpenAI, Anthropic and Google each publish one for their own developer docs; platforms from Mintlify to GitBook generate one by default; and Chrome's Lighthouse now audits for one under its agentic-browsing checks. Publishing is mainstream, consumption is undisclosed, and that asymmetry is the honest case for shipping it: the cost is one file, and the tooling that demonstrably looks for it is no longer hypothetical.

The file is plain markdown with a defined structure: a top-level heading with the site name, a short blockquote summary, optional context paragraphs, and one or more `##` sections containing markdown links.

```md
# Example Corp

> Example Corp builds open-source tools for static-site authors.

We publish documentation, a blog, and reference specifications.

## Docs

- [Getting started](https://example.com/docs/start.md): Install and first build.
- [API reference](https://example.com/docs/api.md): All public functions.

## Optional

- [Changelog](https://example.com/changelog.md): Release notes.
```

v2 left that format alone and fixed the part that never worked. v1 expected an agent to guess `/llms.txt` at the root, which meant a single file had to speak for a whole origin or go unfound. v2 replaces the guess with a link relation you publish, and scopes coverage by path, so `/docs/llms.txt` can describe the documentation and nothing else.

## Why it matters

- It is short. A model can read it in one fetch and learn what your site is about without crawling everything.
- It is curated. You decide which pages matter, in which order.
- It is markdown. No parsing of HTML, no JavaScript, no ads to strip.
- It complements `sitemap.xml`, which is exhaustive and machine-only. `llms.txt` is selective and human-readable too.

The cost is low: one file, updated when your information architecture changes.

## How to implement

- Place the file at `https://example.com/llms.txt`. Serve as `text/markdown` or `text/plain`.
- **Advertise it with `rel="describedby"`.** This is v2's one hard addition, and skipping it leaves you on the v1 guess-the-path behaviour. Emit it as a `<link>` in the head, as an HTTP [`Link` header](/spec/agent-readiness/link-headers/), or both — the header reaches agents that never parse your HTML.

  ```
  Link: </llms.txt>; rel="describedby"; type="text/markdown"
  ```

- Start with `# Site name` on the first line. Follow with a `> blockquote` summary.
- Use `##` headings to group links. Links should point to canonical pages.
- **Scope by path when one root file cannot speak for the whole origin.** A file covers the pages beneath its path and the most specific file wins, so a large site can participate one section at a time instead of waiting for a document nobody owns.
- Point at markdown source where you publish it. v2 accepts either URL shape — `page.md` or `page.html.md` — so use whichever your routing already produces, and advertise it with `rel="alternate"; type="text/markdown"`. See [per-page markdown source endpoints](/spec/agent-readiness/markdown-source-endpoints/).
- Keep it under a few hundred lines. If you want full content, see [/llms-full.txt](/spec/agent-readiness/llms-full-txt/).
- Link to it from your homepage or footer so humans can find it too.

**This site ships it.** [`/llms.txt`](/llms.txt) is generated from the same content collection as every other page, and each response carries `Link: </llms.txt>; rel="describedby"; type="text/markdown"` so an agent never has to guess.

## Common mistakes

- Treating it like a sitemap and listing every URL. The point is curation.
- Writing marketing copy in the summary. Models will quote it; write plainly.
- Letting it drift. A stale `llms.txt` is worse than none — it teaches models wrong things.
- Publishing the file and never linking to it. An unadvertised `llms.txt` is only found by an agent that already assumed the path, which is the failure v2 set out to fix.
- Reading meaning into `## Optional`. v1 gave that heading mechanical semantics for context-expansion tooling; v2 dropped the tooling and the semantics with it. It is a useful convention for secondary links and nothing more.

## Verification

- Fetch `https://example.com/llms.txt` and confirm a `200` with markdown content.
- Confirm the relation is actually advertised: `curl -sI https://example.com/ | grep -i '^link:'` should show `rel="describedby"`, or the same relation should appear in the HTML head.
- Validate the structure against the example on [llmstxt.org](https://llmstxt.org/).
- Run Chrome's Lighthouse over the site — its agentic-browsing checks report on the file, which confirms from outside that it is both present and findable.
- Re-check after every information-architecture change.
---

## machine-readable-formats
Source: https://specification.website/spec/agent-readiness/machine-readable-formats/

---
title: "Machine-readable formats"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/machine-readable-formats/
updated: "2026-05-29T09:45:15.000Z"
sources:
  - title: "RSS 2.0 Specification"
    url: "https://www.rssboard.org/rss-specification"
    publisher: "RSS Advisory Board"
  - title: "JSON Feed 1.1"
    url: "https://www.jsonfeed.org/version/1.1/"
    publisher: "JSON Feed"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Machine-readable formats

> Offer JSON, RSS, or plain markdown endpoints alongside HTML where it makes sense. Agents and feed readers prefer typed data over scraped HTML.

## What it is

A machine-readable format is a representation of your content designed to be consumed by software rather than rendered for humans. HTML is the universal default, but for lists, feeds, and structured records it is the wrong shape. JSON, RSS, Atom, and plain markdown are better.

Most sites already publish one without thinking about it: `sitemap.xml`. Adding a feed and an optional JSON endpoint covers the cases agents and aggregators care about most.

```xml
<!-- /feed -->
<rss version="2.0">
  <channel>
    <title>Example Corp Blog</title>
    <link>https://example.com/blog</link>
    <description>Notes on building things.</description>
    <item>
      <title>Setting up CSP</title>
      <link>https://example.com/blog/csp</link>
      <pubDate>Tue, 12 May 2026 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
```

```json
// /index.json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Example Corp Blog",
  "home_page_url": "https://example.com/blog",
  "feed_url": "https://example.com/index.json",
  "items": [
    {
      "id": "https://example.com/blog/csp",
      "url": "https://example.com/blog/csp",
      "title": "Setting up CSP",
      "date_published": "2026-05-12T10:00:00Z",
      "content_html": "<p>...</p>"
    }
  ]
}
```

## Why it matters

- Agents that need a list of recent posts can fetch one URL instead of scraping a paginated index.
- Feed readers, archive tools, and notification services have decades of support for RSS and Atom.
- JSON Feed is friendlier to modern toolchains and easier to extend.
- For documentation, exposing a `.md` next to each `.html` gives agents the source without HTML extraction.

The cost is small and the upside compounds: every consumer that does not have to parse HTML is one less source of bad quotes.

## How to implement

- **Sitemap.** Every site should have one — see [XML sitemaps](/spec/seo/xml-sitemaps/).
- **A feed.** Publish RSS 2.0 or Atom at a discoverable URL such as `/feed`, `/feed.xml`, or `/rss.xml`. Optionally publish a JSON Feed at `/feed.json` or `/index.json`. Link both from `<head>`:

  ```html
  <link rel="alternate" type="application/rss+xml" title="Blog" href="/feed.xml">
  <link rel="alternate" type="application/json" title="Blog" href="/feed.json">
  ```

- **Markdown sources.** For documentation, serve `page.md` alongside `page.html` — see [Per-page Markdown source endpoints](/spec/agent-readiness/markdown-source-endpoints/) for the full pattern, including `Accept: text/markdown` content negotiation done correctly with `Vary: Accept`.
- **Content negotiation.** Powerful, but easy to misuse. Always set `Vary: Accept` on every representation, otherwise caches will pin the wrong one for every subsequent visitor. When the formats are very different (HTML vs JSON), distinct URLs are usually simpler.
- **Stable schemas.** Once published, treat the field names as a contract — same rule as URLs.

## Common mistakes

- Truncating feed items to a one-line teaser. If you want agents to quote you fairly, give them the full content.
- Forgetting to update `pubDate` or `date_published`, so readers think nothing has changed.
- Letting the feed go stale because the CMS export broke quietly. Monitor it.
- Mixing absolute and relative URLs inside feed items. Use absolute everywhere.

## Verification

- Validate RSS at [validator.w3.org/feed](https://validator.w3.org/feed/).
- Validate JSON Feed against the [spec](https://www.jsonfeed.org/version/1.1/).
- Subscribe to your own feed in a reader and confirm new posts appear.
---

## markdown-source-endpoints
Source: https://specification.website/spec/agent-readiness/markdown-source-endpoints/

---
title: "Per-page Markdown source endpoints"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/markdown-source-endpoints/
updated: "2026-07-01T00:00:00.000Z"
sources:
  - title: "RFC 9110 — HTTP Semantics §12 (Content Negotiation), §8.7 (Vary), §8.7.1 (Content-Location)"
    url: "https://www.rfc-editor.org/rfc/rfc9110.html#name-content-negotiation"
    publisher: "IETF"
  - title: "MDN — Vary"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary"
    publisher: "MDN"
  - title: "MDN — Content-Location"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Location"
    publisher: "MDN"
  - title: "Anthropic — docs.anthropic.com Markdown source (live example)"
    url: "https://docs.anthropic.com/en/docs/intro.md"
    publisher: "Anthropic"
  - title: "llmstxt.org"
    url: "https://llmstxt.org/"
    publisher: "llmstxt.org"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Per-page Markdown source endpoints

> Expose every documentation page's raw Markdown source at a predictable URL — via a .md suffix on the canonical URL, content negotiation, or both. Agents pull source instead of parsing HTML.

## What it is

A per-page Markdown source endpoint exposes the original, unrendered Markdown of a content page at a predictable URL. An agent — an LLM, a documentation index, a CLI tool — fetches the Markdown instead of the HTML and gets the same content without the lossy round trip through DOM parsing, ad scaffolding, navigation chrome, and JavaScript hydration.

Two conventions are emerging, and the best sites do both.

**1. URL suffix.** Append `.md` to the page path.

```http
GET /docs/getting-started/        HTTP/1.1
GET /docs/getting-started.md      HTTP/1.1
```

The first returns HTML. The second returns the raw Markdown source with a `text/markdown` content type.

**2. Content negotiation.** Send `Accept: text/markdown` to the canonical (HTML) URL and get Markdown back.

```http
GET /docs/getting-started/        HTTP/1.1
Accept: text/markdown
```

```http
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8
Content-Location: /docs/getting-started.md
Vary: Accept
```

The `Content-Location` header tells the client the canonical Markdown URL; `Vary: Accept` tells caches the response depends on the request's `Accept` header.

## Why it matters

- **Lossless source.** HTML extraction loses heading semantics, code-block language hints, callout syntax, and inline metadata. Markdown gives the agent exactly what the author wrote.
- **Smaller payloads.** A typical Markdown page is 5–20× smaller than its rendered HTML once you remove styling, scripts, and shared chrome.
- **No JavaScript runtime.** Crawlers that don't run JS still get full content.
- **Aligned with `llms.txt`.** [llms.txt](/spec/agent-readiness/llms-txt/) and [llms-full.txt](/spec/agent-readiness/llms-full-txt/) point at pages — `.md` makes the pointed-to representation directly usable.
- **Stable signal of intent.** Sites that expose `.md` are advertising "we want to be readable by agents," which is itself a useful discovery signal.

Anthropic's documentation, Stripe's, and a growing number of others ship the `.md` suffix. Treat the canonical URL with `Accept: text/markdown` as the next layer up — same content, the URL stays canonical, caches behave correctly.

## How to implement

**Ship the suffix at minimum.** For every Markdown-sourced page, serve the same Markdown at the URL with `.md` appended.

```http
HTTP/1.1 200 OK
Content-Type: text/markdown; charset=utf-8
Cache-Control: public, max-age=3600
X-Markdown-Tokens: 1240
```

Include a YAML frontmatter block with the page's metadata so agents get structured context alongside the prose: `title`, `url` (the canonical HTML URL), `updated`, `sources`, `licence`. Don't ship implementation details an agent doesn't need (build timestamps, internal IDs).

**Hint the size.** Add an `X-Markdown-Tokens` response header carrying a rough token-count estimate for the body (any reasonable tokeniser — `tiktoken`'s `cl100k_base` is a fine default). The header is not a registered standard, but a growing number of agent-friendly sites ship it because it lets a caller decide whether to inline the page into a prompt, summarise it first, or skip it for a smaller one — without downloading the body. Recompute it whenever the Markdown changes; do not invent the number.

**Advertise it in `<head>`.** Add a discovery link to the HTML version so crawlers and tools find the Markdown without guessing the URL pattern.

```html
<link rel="alternate" type="text/markdown"
      href="https://example.com/docs/getting-started.md"
      title="Getting started — Markdown source">
```

**Add content negotiation if your edge supports it.** Cloudflare Pages Functions, Workers, Vercel Edge Middleware, Netlify Edge Functions, Fastly Compute, and Nginx can all branch on `Accept`. The middleware:

1. Matches the page URL pattern.
2. If `Accept` contains `text/markdown`, fetches the `.md` asset internally and returns its body with `Content-Type: text/markdown`, `Content-Location: /…/page.md`, and `Vary: Accept`.
3. Otherwise serves HTML, but still appends `Vary: Accept` so caches don't conflate the two representations of the same URL.

**Mention it in `llms.txt`.** Document both modes near the top of the file so agents can opt in on first read.

**Extend it to aggregate views, not just individual pages.** The same `Accept: text/markdown` negotiation works for any HTML view backed by Markdown. This site ships all three modes on every spec page and also negotiates two aggregate URLs: `/` returns [llms.txt](/spec/agent-readiness/llms-txt/), and [`/checklist/`](/checklist/) returns a copy-and-paste [Markdown task list](/checklist.md).

## Common mistakes

- Shipping the suffix but forgetting `Content-Type: text/markdown`. Browsers will then download the file instead of displaying it, and agents may misclassify it.
- Doing content negotiation without `Vary: Accept`. Caches will return whichever representation they cached first to every subsequent client, regardless of what they asked for.
- Returning Markdown that still contains template includes, unresolved shortcodes, or framework-specific syntax (e.g. `{{ component }}`). Serve the fully-rendered Markdown, not the source-of-source.
- Letting the Markdown drift from the HTML. The two should be generated from the same source at the same time, in the same build.
- Putting the `.md` behind authentication while the HTML is public. The two representations must have the same access policy.

## Verification

- `curl -i https://example.com/docs/getting-started.md` returns `200` with `Content-Type: text/markdown; charset=utf-8`.
- `curl -i -H 'Accept: text/markdown' https://example.com/docs/getting-started/` returns Markdown with `Content-Location` and `Vary: Accept`.
- The HTML response to the same URL also carries `Vary: Accept`.
- View source on any page — there is a `<link rel="alternate" type="text/markdown" …>` in `<head>`.
- The `.md` body contains the same headings, paragraphs, and code blocks as the rendered HTML, with frontmatter at the top.
---

## mcp-and-tool-discovery
Source: https://specification.website/spec/agent-readiness/mcp-and-tool-discovery/

---
title: "MCP and tool discovery"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/mcp-and-tool-discovery/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "Model Context Protocol"
    url: "https://modelcontextprotocol.io/"
    publisher: "Anthropic / MCP project"
  - title: "MCP specification"
    url: "https://modelcontextprotocol.io/specification"
    publisher: "MCP project"
  - title: "MCP 2026-07-28 — versioning and backward compatibility"
    url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning"
    publisher: "MCP project"
  - title: "MCP 2026-07-28 — Streamable HTTP transport"
    url: "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http"
    publisher: "MCP project"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# MCP and tool discovery

> The Model Context Protocol is an emerging way for sites to expose queryable tools to agents over JSON-RPC. Relevant whenever your content has structure worth filtering — even for a static reference site like this one.

## What it is

The Model Context Protocol (MCP) is an open protocol, originally proposed by Anthropic in late 2024, that defines how language-model clients talk to external tools and data sources. Instead of an agent scraping your UI, you expose an MCP server that declares a set of tools, resources, and prompts; the agent calls them directly.

MCP is built on JSON-RPC over two transports — stdio for local servers, Streamable HTTP for remote ones (the older HTTP-plus-Server-Sent-Events transport is deprecated). A tool definition includes a name, a description, and a JSON Schema for inputs.

**Since the 2026-07-28 revision there is no connection handshake.** Earlier revisions opened with an `initialize` exchange that negotiated a protocol version once and established a session for everything that followed. That is gone: each request now declares its own version in a `_meta` field, mirrored into an `MCP-Protocol-Version` header, and the server accepts or rejects it independently. A server that does not implement the requested version answers with `UnsupportedProtocolVersionError` listing what it does support, and the client retries. Sessions, the standalone `GET` stream, and resumable streams went with the handshake.

The practical consequence is that an MCP server is now a plain request/response HTTP endpoint, which is why it can sit on serverless and edge infrastructure without sticky routing. One new call is mandatory: `server/discover` returns the supported versions, capabilities, and identity in a single request, so a client can learn what a server is before calling anything.

This is relevant when your site exposes actions a user might want an agent to take: search a catalogue, create a ticket, book an appointment, query an account. For static content sites and blogs, MCP often adds little — well-cached HTML and a feed are enough. The exception is structured content sites where the data is filterable: a documentation set, a spec, a knowledge base. There an MCP server lets an agent ask "list all required SEO topics" or "give me the canonical CSP page" in a single typed call, instead of crawling and parsing.

This site ships such a server as a worked example. See [mcp.specification.website](https://mcp.specification.website/) for the live endpoint, [`/.well-known/mcp/server-card.json`](/.well-known/mcp/server-card.json) for the discovery document, and the [`mcp/` directory of the source repo](https://github.com/jdevalk/specification.website/tree/main/mcp) for the Cloudflare Worker implementation. Every tool it exposes is annotated `readOnlyHint` and declares an `outputSchema`, so clients get typed results alongside the human-readable text. It serves 2026-07-28 and still answers the handshake-based revisions back to 2025-03-26 on the same endpoint — see [supporting both eras](#supporting-both-eras) below.

Larger reference sites are reaching the same conclusion. In 2026 MDN — the canonical web-platform documentation — [shipped its own MCP server](https://developer.mozilla.org/en-US/blog/introducing-mdn-mcp-server/), exposing its docs and Baseline browser-compatibility data over the same protocol so agents query it directly instead of scraping pages. When the material a developer would otherwise read by hand becomes a typed, queryable tool, that is the signal a corpus is worth serving over MCP.

## Why it matters

- Agents call your functionality through a defined contract instead of guessing from a UI. Behaviour is predictable and auditable.
- One MCP server can be reused across Claude, ChatGPT (via connectors), and any other MCP-aware client. No per-vendor integration.
- Authorisation is explicit. Tools declare what they do; the agent (and the user) consents before calling.
- The same server is useful for your own internal automation, not just public agents.

Adoption is real but uneven. Treat it as an emerging convention worth investing in if your product is API-shaped, and as overkill if it is not.

## How to implement

- Decide what you want agents to do. Read-only tools (`search_products`, `get_order_status`) are a safe first step; write tools (`create_ticket`, `update_address`) come with stronger auth requirements.
- Build an MCP server. The reference SDKs cover TypeScript, Python, and others; see [modelcontextprotocol.io](https://modelcontextprotocol.io/).
- Host it at a discoverable URL such as `/mcp` or a subdomain like `mcp.example.com`. Document the endpoint in your developer docs and link it from [/llms.txt](/spec/agent-readiness/llms-txt/).
- **Publish a server card.** Ship `/.well-known/mcp/server-card.json` describing the server's name, version, transport, endpoint URL, capabilities, tools, and prompts. Add a `Link: </.well-known/mcp/server-card.json>; rel="mcp"` header on your main site so the card is discoverable without guessing the path — see [HTTP Link headers](/spec/agent-readiness/link-headers/) and [`/.well-known/api-catalog`](/spec/well-known/api-catalog/).
- Use OAuth 2.1 (the MCP spec aligns with it) for any tool that touches user data. Never accept long-lived API keys in tool calls.
- Keep tool descriptions short and precise. Agents pick which tool to call from the description. State what the tool does *not* cover and which sibling tool to use instead, so the agent disambiguates without a trial call.
- **Declare behaviour with annotations.** Each tool can carry hints — `readOnlyHint`, `idempotentHint`, `destructiveHint`, `openWorldHint` — that tell a client whether the tool has side effects, is safe to retry, or reaches beyond a closed corpus. A read-only search over bundled data should advertise `readOnlyHint: true` and `openWorldHint: false`. Clients and gateways read these to decide what to call without prompting the user.
- **Return structured output, not just prose.** Since the 2025-06-18 revision a tool can declare an `outputSchema` and return a matching `structuredContent` object next to the human-readable text. A calling agent then consumes typed data instead of re-parsing Markdown. Document every field and version the output schema as carefully as the input one.
- Version the schema. Renaming a tool or changing its input shape is a breaking change.

### Supporting both eras

The handshake did not disappear from the field the day it disappeared from the specification. Clients written against `2025-11-25` and earlier will keep opening with `initialize` for a long time, and they have no way to fall forward — a legacy client meeting a modern-only server simply fails, with no mechanism to discover why. If you already run a server, answering both is the courteous option and is explicitly provided for.

A dual-era server decides which semantics to apply from how the client opens, not from configuration:

- A request carrying the per-request version metadata is served under the new revision, statelessly.
- An `initialize` request selects the older, session-based semantics.

Two details are easy to get wrong. First, an `initialize` handshake must never be answered with `2026-07-28` — that revision has no handshake, so echoing it back promises something the server cannot then honour; answer with the newest revision that does have one. Second, apply the new header validation only to requests that declare the new version. Imposing `Mcp-Method` and `Mcp-Name` on a legacy request rejects a client that is behaving correctly for the revision it speaks.

Validation matters because the transport now mirrors body fields into headers so intermediaries can route without parsing JSON. If a header and the body disagree, a load balancer and your server are acting on different instructions — so the specification requires you to reject the request with a `HeaderMismatch` error rather than pick a winner.

Decide how long you will answer the handshake, and publish it. The protocol will not decide for you: earlier revisions are Final rather than withdrawn, and nothing in MCP says when a server should stop honouring one. This site's server answers `initialize` until 28 July 2027 and says so on the wire — those responses carry `Deprecation`, `Sunset` and a `rel="deprecation"` link, so a client learns its remaining runway without reading a blog post. The endpoint itself carries no such headers; `/mcp` is not being retired. See [deprecation and sunset](/spec/resilience/deprecation-and-sunset/) for the mechanics, and note the dates there are a server's policy, not the specification's.

Watch the [deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) for the things the protocol *has* scheduled for removal — Roots, Sampling, Logging and Dynamic Client Registration are all Deprecated as of 2026-07-28. Do not advertise a deprecated capability in a server you are writing now; new implementations are told not to adopt them.

## Common mistakes

- Exposing every internal API as an MCP tool. Curate; agents reason better about a small, well-named surface.
- Skipping rate limits and audit logs. An MCP endpoint that an agent can call repeatedly is an abuse vector.
- Mixing read and write tools without clear naming. Make destructive actions obvious in the tool name.
- Annotations that lie. Marking a write tool `readOnlyHint: true` is worse than omitting the hint — clients trust it and skip the confirmation a destructive call deserves.
- Treating MCP as a replacement for documentation. It complements it; it does not replace it.
- Assuming a session exists. Anything the old handshake let you stash for the duration of a connection — negotiated version, client identity, per-session state — now has to arrive on each request or be derived from it.
- Dropping legacy support the day you adopt the new revision. Older clients cannot fall forward; they just break.

## Verification

- Connect your server with the MCP Inspector or a reference client and confirm tools list, call, and return as expected.
- Call `server/discover` and check it reports the versions you actually serve. A version you list here is one a client may send on its next request.
- Send a request whose `MCP-Protocol-Version` header disagrees with the body, and one for a version you do not implement. The first must be rejected as a header mismatch, the second with the list of versions you do support.
- If you serve both eras, run an old client through `initialize` after every change. It is the path that breaks silently, because nothing in your own tooling exercises it.
- Review the OAuth flow end to end.
- Watch logs after a public launch for unexpected call patterns.
---

## nlweb
Source: https://specification.website/spec/agent-readiness/nlweb/

---
title: "NLWeb — conversational interface discovery"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/nlweb/
updated: "2026-05-29T12:14:17.000Z"
sources:
  - title: "nlweb-ai/NLWeb on GitHub"
    url: "https://github.com/nlweb-ai/NLWeb"
    publisher: "NLWeb project"
  - title: "NLWeb — REST API"
    url: "https://github.com/nlweb-ai/NLWeb/blob/main/docs/nlweb-rest-api.md"
    publisher: "NLWeb project"
  - title: "schema.org"
    url: "https://schema.org/"
    publisher: "schema.org"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# NLWeb — conversational interface discovery

> NLWeb is an emerging convention for exposing a site as a conversational AI endpoint. A site advertises an `/ask`-style endpoint via a `rel="nlweb"` link and serves an MCP-compatible JSON-RPC interface that agents can query in natural language.

## What it is

NLWeb is an open project, originally from Microsoft and now developed in its own `nlweb-ai` organisation, that lets any website expose a conversational query interface in a standard way. A site implements a small HTTP endpoint — by convention `/ask` — that accepts a natural-language query and returns a structured answer grounded in the site's own content, typically built from its [schema.org](https://schema.org/) data and embeddings of its pages.

Discovery is one HTML link tag:

```html
<link rel="nlweb" href="/ask" title="Ask this site">
```

An agent that recognises the relation knows the site speaks NLWeb without further negotiation. The endpoint itself follows a documented JSON shape and can additionally be wrapped as an MCP tool, so the same query path is reachable from both browser-side and server-side agent runtimes.

## Why it matters

- **One endpoint per site, not per question.** NLWeb gives agents a single answerable surface instead of asking them to crawl, embed, and reason over every page themselves.
- **Grounded in your own content.** Answers come from the site's structured data and corpus. A site retains editorial control over what gets cited.
- **Composes with [MCP](/spec/agent-readiness/mcp-and-tool-discovery/).** The NLWeb endpoint can also be exposed as an `ask_site` MCP tool. Same logic, two transports.
- **Cheap to ship.** A static site with [structured data](/spec/agent-readiness/structured-data-for-agents/) and a small vector index can answer most factual questions about its own content without a chatbot UI.

The convention is still early and driven by a single project, but the discovery link is a single line in `<head>` and the endpoint shape is documented. Treat NLWeb as `optional` — recommended where the site already has the corpus to ground answers, skippable for small static sites.

## How to implement

- **Build the corpus.** Index your pages — embeddings of the body text, plus the [JSON-LD](/spec/agent-readiness/structured-data-for-agents/) you already publish. Many implementations use the same schema.org data they ship in `<head>` as the source of truth.
- **Expose `/ask`.** Accept `GET` with a `query` parameter, or `POST` with a JSON body. Return JSON with the answer, the sources cited (URLs into your own site), and any structured results.
- **Advertise it.** Add `<link rel="nlweb" href="/ask">` to `<head>` and a matching `Link: </ask>; rel="nlweb"` HTTP header. See [HTTP Link headers](/spec/agent-readiness/link-headers/).
- **Mirror as an MCP tool.** If you already ship an [MCP server](/spec/agent-readiness/mcp-and-tool-discovery/), register a tool — `ask_site` is the common name — that wraps the same endpoint. Agents that speak MCP but not NLWeb get the same capability.
- **Cite, always.** Every answer should include the source URLs it was built from. Answers without citations train users (and agents) to mistrust the surface.

## Common mistakes

- Answering questions the site has no authority to answer. Scope `/ask` to your own corpus; refuse off-topic questions rather than guessing.
- Shipping a chatbot UI without the discovery link. Agents need the `rel="nlweb"` signal to find the endpoint; humans clicking a widget do not.
- Letting the index go stale. A grounded answer pulled from last quarter's corpus reads as a wrong answer, not a delayed one.
- Returning HTML. NLWeb is a machine interface; the response is JSON. If you also want to render the answer in a UI, do it client-side from the JSON.

## Verification

- `curl -sI https://example.com/ | grep -i nlweb` returns a `Link` header with `rel="nlweb"`.
- View source on the homepage — `<link rel="nlweb" href="…">` is present.
- `curl 'https://example.com/ask?query=what+do+you+do'` returns a JSON body with an `answer` field and a `sources` array of URLs into your own site.
- Spot-check that the cited URLs exist and that the answer matches what is on them.
---

## okf-bundle
Source: https://specification.website/spec/agent-readiness/okf-bundle/

---
title: "Open Knowledge Format (OKF) bundle"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/okf-bundle/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "Open Knowledge Format (OKF) specification"
    url: "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md"
    publisher: "Google"
  - title: "Open Knowledge Format — reference implementation and samples"
    url: "https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf"
    publisher: "Google"
  - title: "Agentic Resource Discovery (ARD) specification"
    url: "https://agenticresourcediscovery.org/"
    publisher: "ARD Project (Linux Foundation)"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Open Knowledge Format (OKF) bundle

> Publish your whole knowledge base as an Open Knowledge Format bundle — a tree of Markdown concept files with typed front matter — so an agent can ingest the entire corpus in one fetch instead of scraping page by page. Now at v0.2, which moves provenance and citations into front matter.

## What it is

The Open Knowledge Format (OKF) is a convention for packaging a body of knowledge as a tree of Markdown files an agent can consume directly. Each file is a **concept**: a YAML front-matter block followed by Markdown prose. The only hard requirement is a non-empty `type` field; the format leans on a small set of recommended fields (`title`, `description`, `resource`, `tags`) and lets producers add their own keys, which consumers must preserve rather than reject.

`generated` records content production; `verified` records source checks. Trust tiers derive from verification events, not authorship. Omit unsupported provenance instead of assigning an author or reviewer to an entire corpus. `sources` lists supporting material with stable identifiers that body footnotes can reference.

Version 0.2 supersedes two shapes from 0.1: the flat `timestamp` field, now `generated.at`, and the body-level `# Citations` list, now the front-matter `sources` list. Both are compatibility breaks in the writing direction only — a consumer is told to fall back to the 0.1 fields when the 0.2 ones are absent, so old bundles keep parsing. A bundle declares which revision it targets with `okf_version` in its root `index.md`.

A bundle is otherwise plain files and folders. `index.md` files give progressive disclosure — a reader can list a directory without parsing every concept. A root `log.md` records change history newest-first. A `references/` directory mirrors external standards as first-class concepts so a check can cite them with a bundle-relative link. There is no manifest, no schema server, and no runtime: a bundle is the directory itself.

## Why it matters

- **One ingest, not N scrapes.** An agent that wants your whole corpus gets it in a single download instead of crawling every HTML page and stripping navigation.
- **Typed, predictable structure.** Every concept declares what it is. Front matter carries the metadata an agent would otherwise have to infer.
- **Graceful for consumers.** Conformance is deliberately loose — unknown types, extra keys, and missing optional fields must not cause rejection — so a bundle stays usable as it grows.

OKF deliberately leaves **serving and discovery out of scope**. A bundle on its own is undiscoverable; pair it with a discovery surface — an [AI Catalog entry](/spec/agent-readiness/agentic-resource-discovery/) and an [`llms.txt`](/spec/agent-readiness/llms-txt/) pointer — so agents can find it.

## How to implement

Generate the bundle from your existing source of truth; do not hand-maintain a second copy. For each item, emit `<path>.md` with a `type` and the recommended fields, reusing the same Markdown body you already serve. Record `generated` and `verified` only when you have evidence for those events, and list supporting material in `sources`. Emit an `index.md` per directory (no front matter, except the bundle root, which carries `okf_version`). Add a `log.md` from your change history. Mirror each cited standard once under `references/` and link checks to it. Offer the tree browsably and, optionally, as a single archive for "take everything" consumers. Then advertise it.

This site ships it: the bundle targets OKF 0.2, is generated from the same content collection as every other surface, and is served browsable at [`/okf/`](/okf/index.md), with the whole tree packaged as [`/okf.tar.gz`](/okf.tar.gz). Each check has a producer-defined `requirement` field, the corresponding RFC 2119 `conformance` keyword, `source_updated_at`, and a `sources` list linking to [`/okf/references/`](/okf/references/index.md). We omit `generated` and `verified` because the collection has no per-page authorship or verification records. OKF reserves `status` for lifecycle values (`draft`, `stable`, `deprecated`); published concepts use its default of `stable`. The bundle is advertised in our [AI Catalog](/spec/agent-readiness/agentic-resource-discovery/) and in [`/llms.txt`](/llms.txt). Its `mediaType` is interim and unregistered (`application/okf-bundle+gzip`) pending a blessed OKF media type.

## Common mistakes

- Hand-authoring the bundle so it drifts from the source. Generate it.
- Putting front matter in `index.md` files — only the bundle-root `index.md` may carry it.
- Shipping the bundle with no way to find it. OKF solves packaging, not discovery; advertise it separately.
- Claiming a registered media type the artefact does not have. Until OKF has one, declare an honest interim type.
- Declaring an `okf_version` the concepts do not match. The version is a promise about the shape a consumer will find; a bundle that says `0.2` while still emitting `timestamp` and `# Citations` is worse than one that honestly says `0.1`.
- Inferring authorship or verification from maintainer approval. Record the actual event and actor, or omit the optional field.
- Putting requirement levels such as `recommended` in OKF's lifecycle `status` field. Use a separate producer-defined key.

## Verification

- Every non-index, non-log `.md` parses as YAML front matter with a non-empty `type`.
- `index.md` files carry no front matter (except the root's `okf_version`), and that version matches the field shapes the concepts actually use.
- Concept count matches your source corpus; the tree round-trips cleanly from the archive.
- The bundle is reachable from at least one discovery surface (AI Catalog entry, `llms.txt`, or a `Link` header).
---

## robots-for-ai-crawlers
Source: https://specification.website/spec/agent-readiness/robots-for-ai-crawlers/

---
title: "robots.txt for AI crawlers"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/robots-for-ai-crawlers/
updated: "2026-05-29T12:14:17.000Z"
sources:
  - title: "OpenAI — GPTBot"
    url: "https://platform.openai.com/docs/bots"
    publisher: "OpenAI"
  - title: "Anthropic — Crawlers"
    url: "https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler"
    publisher: "Anthropic"
  - title: "Google — Google-Extended"
    url: "https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended"
    publisher: "Google Crawling Infrastructure"
  - title: "Apple — Applebot-Extended"
    url: "https://support.apple.com/en-us/119829"
    publisher: "Apple"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# robots.txt for AI crawlers

> Major AI vendors publish named user-agents for their crawlers. Setting an explicit allow or disallow per agent is the clearest way to control how your content is used.

## What it is

The robots.txt file (see [robots.txt](/spec/seo/robots-txt/)) accepts rules per user-agent. Every major AI vendor now publishes a named user-agent for its training and retrieval crawlers, so you can allow or block each one independently of search.

The big ones, as of 2026:

- **GPTBot** — OpenAI training crawler.
- **OAI-SearchBot** — OpenAI retrieval crawler used by ChatGPT browsing.
- **ChatGPT-User** — on-demand fetches when a ChatGPT user asks for a URL.
- **ClaudeBot** — Anthropic training and retrieval crawler.
- **anthropic-ai** — legacy Anthropic user-agent, still seen.
- **Google-Extended** — opts out of Gemini and Vertex training without affecting Search.
- **Applebot-Extended** — opts out of Apple Intelligence training without affecting Siri/Spotlight.
- **PerplexityBot** — Perplexity retrieval crawler.
- **Bytespider** — ByteDance crawler, widely used for training.
- **CCBot** — Common Crawl, the dataset behind many open models.

## Why it matters

A blanket `Disallow: /` blocks everyone, including search. Naming agents lets you make precise decisions: allow retrieval bots so your content can be cited live, block training bots if you do not want to feed model weights, or the reverse.

Compliance is honour-based. Reputable vendors document and respect their user-agents. Unidentified scrapers will ignore robots.txt; defend against those with rate limits or WAF rules, not robots.

## How to implement

A reasonable default that allows search and retrieval but opts out of training:

```txt
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: *
Allow: /

Sitemap: https://example.com/sitemap_index.xml
```

Rules of thumb:

- Read each vendor's documentation; user-agents change.
- Decisions are per-host. A subdomain needs its own robots.txt.
- Combine with [/llms.txt](/spec/agent-readiness/llms-txt/) when you want to allow access but steer agents to specific pages.
- For paywalled or member content, keep auth in place — robots.txt is not a security boundary.

## Common mistakes

- Blocking `*` and forgetting that this also blocks Google.
- Blocking only `GPTBot` and assuming no OpenAI surface can see your site — `OAI-SearchBot` and `ChatGPT-User` are separate.
- Leaving stale user-agents from 2023 lists. Names change; the vendor docs are the source of truth.
- Treating disallow as deletion. Content already in training sets stays there.

## Verification

- Fetch `https://example.com/robots.txt` and check each rule renders.
- Cross-reference your list against the linked vendor pages — they are updated regularly.
- Watch server logs for the user-agents you care about and confirm they back off after a rule change.
---

## schemamap
Source: https://specification.website/spec/agent-readiness/schemamap/

---
title: "Schemamap — discoverable JSON-LD endpoints per resource"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/schemamap/
updated: "2026-05-29T14:13:42.000Z"
sources:
  - title: "JSON-LD 1.1 Specification"
    url: "https://www.w3.org/TR/json-ld11/"
    publisher: "W3C"
  - title: "Schema.org"
    url: "https://schema.org/"
    publisher: "schema.org"
  - title: "RFC 8288 — Web Linking"
    url: "https://www.rfc-editor.org/rfc/rfc8288"
    publisher: "IETF"
  - title: "IANA — Link Relations Registry"
    url: "https://www.iana.org/assignments/link-relations/link-relations.xhtml"
    publisher: "IANA"
  - title: "Sitemaps XML format"
    url: "https://www.sitemaps.org/protocol.html"
    publisher: "sitemaps.org"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Schemamap — discoverable JSON-LD endpoints per resource

> A convention this site proposes — no external standard exists yet. `/schemamap.xml` indexes one JSON-LD endpoint per resource so agents fetch the structured-data graph directly instead of extracting it from HTML.

## What it is

Schemamap is a convention this site proposes. It has no external standard, no IANA-registered link relation, and no second implementer at the time of writing. It is documented here as a worked proposal — not as settled web infrastructure. Treat the status as `optional` and adopt it because the design fits your needs, not because anyone else expects you to ship it.

The shape:

1. **A per-resource JSON-LD endpoint.** Every page that has structured data exposes its JSON-LD graph at a predictable URL — by convention, the canonical URL with a `.jsonld` suffix — served with `Content-Type: application/ld+json`. The endpoint returns the same `@graph` the HTML embeds, in a stable shape, with no surrounding markup to parse.

2. **An index — `/schemamap.xml`.** A sitemap-shaped XML file at the site root lists every resource that has a JSON-LD endpoint. Each `<resource>` carries the canonical URL, the `.jsonld` URL, the schema.org `@type`s present, and an optional `<lastmod>`.

3. **HTML discovery.** Two `<link>` tags in `<head>`. The site-wide one points at the index using the proposed `rel="schemamap"`. The per-page one points at this resource's JSON-LD endpoint using the registered `rel="alternate" type="application/ld+json"` — so agents that do not recognise `schemamap` still find the per-page graph through a standard relation.

```html
<!-- Per page -->
<link rel="alternate" type="application/ld+json"
      href="https://example.com/articles/foo.jsonld"
      title="Foo — JSON-LD graph">

<!-- Site-wide -->
<link rel="schemamap" type="application/xml"
      href="/schemamap.xml"
      title="Schemamap index">
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<schemamap xmlns="https://example.com/schemas/schemamap/0.1">
  <resource>
    <loc>https://example.com/articles/foo/</loc>
    <jsonld>https://example.com/articles/foo.jsonld</jsonld>
    <type>Article</type>
    <type>BreadcrumbList</type>
    <lastmod>2026-05-29</lastmod>
  </resource>
</schemamap>
```

**This site ships it.** Every spec page exposes a JSON-LD graph at `/spec/<category>/<slug>.jsonld`, and the index at [`/schemamap.xml`](/schemamap.xml) lists all of them. The per-page graph is also registered in the [api-catalog Linkset](/.well-known/api-catalog) under a URI-based rel so the discovery path is self-describing without the IANA registry.

## Why it matters

The status quo for structured data is "parse the HTML and pick out every `<script type=\"application/ld+json\">`". That works, but it has costs:

- **Lossy extraction.** Some sites ship multiple disagreeing JSON-LD blocks across plugins or templates on the same page; the [structured-data page](/spec/seo/structured-data/) flags this as a common mistake. There is no contract that says which block is canonical.
- **Hydration risk.** Frameworks that emit JSON-LD after JavaScript runs make the markup invisible to non-rendering crawlers. A dedicated endpoint runs no JavaScript.
- **No index.** The XML sitemap lists URLs; it does not say which of those URLs carries `Article`, `Product`, or `BreadcrumbList` markup. An agent that wants every `Recipe` on a site has to fetch every page.
- **Cross-page `@id` linking is harder than it should be.** When the graph lives in `<script>` tags scattered across the site, you cannot dereference an `@id` URI unless every page that mentions the entity is fetched.

A discoverable index of JSON-LD endpoints fixes all four cheaply. The cost is one new endpoint type and one extra file. Compare with the [Markdown source endpoints](/spec/agent-readiness/markdown-source-endpoints/) convention, which solves the same kind of problem for prose.

## How to implement

**Expose the per-page endpoint first.** Without `.jsonld` URLs, the index has nothing to point at. For each page that ships structured data, render the same graph you embed in the HTML to a separate endpoint:

```http
GET /articles/foo.jsonld HTTP/1.1

HTTP/1.1 200 OK
Content-Type: application/ld+json; charset=utf-8
Access-Control-Allow-Origin: *
Cache-Control: public, max-age=3600
```

Use a stable `@id` on every node (the canonical URL with a fragment is fine — `#article`, `#breadcrumb`, `#organization`). Include a `license` field on the graph if your content is licensed.

**Build the index from the same content source.** On `specification.website`, [`src/pages/schemamap.xml.ts`](https://github.com/jdevalk/specification.website/blob/main/src/pages/schemamap.xml.ts) iterates the content collection that drives the rest of the site, so the index cannot drift from the per-page endpoints. Sort entries by category then order then title — agents that incrementally fetch will see the same ordering as humans on `/spec/`.

**Advertise discovery in `<head>`.**

```html
<link rel="alternate" type="application/ld+json" href="…/page.jsonld" title="… JSON-LD graph">
<link rel="schemamap" type="application/xml" href="/schemamap.xml" title="Schemamap index">
```

Add the per-page link on every page that has a JSON-LD endpoint. Add the schemamap link site-wide.

**Pick the right serving headers.** `Content-Type: application/ld+json` for the endpoints, `application/xml` for the index. Set `Access-Control-Allow-Origin: *` so cross-origin agents can fetch the graph from a browser context. Cache aggressively — the graph only changes when the source content does.

**Be honest in the index about the registration gap.** The `rel="schemamap"` value is not in the [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml). [HTTP Link headers](/spec/agent-readiness/link-headers/) explicitly warns against inventing custom `rel` values for that reason. Two ways to handle it:

- **In HTML `<head>` only.** Ship `rel="schemamap"` in the page — that link tag *is* the proposal under test. Do not add it to the global HTTP `Link` header until the relation is registered. This site takes that route.
- **Use a URI-form `rel` instead.** Per [RFC 8288 §2.1.1](https://www.rfc-editor.org/rfc/rfc8288#section-2.1.1), a `rel` value that is a URI does not require IANA registration. This site exposes the schemamap entry in `/.well-known/api-catalog` under `https://specification.website/schemas/schemamap/0.1#index`, so any client that reads the api-catalog finds it without depending on a bare-name relation at all.

Registration is the prerequisite for promoting any of this beyond `optional`. Until then, treat schemamap as an opt-in proposal you can audit and walk back from.

## Common mistakes

- **Drift between the HTML graph and the `.jsonld` endpoint.** They have to be generated from the same source at the same time. If the page changes and the endpoint does not, every agent that trusted the index now has stale facts.
- **Inventing `@type` values to fill the index.** Only list real, valid schema.org types. Lying about types pollutes the only thing that makes the index more useful than a sitemap.
- **Forgetting CORS.** Without `Access-Control-Allow-Origin: *`, a browser-side agent cannot fetch the JSON-LD even though a backend crawler can — the discovery surface fragments by client.
- **Listing pages whose JSON-LD is just `WebSite`.** The homepage's `WebSite` block is the same on every page; it carries no resource-specific facts. The index should list resources whose graph adds something — articles, products, events, recipes, persons — not boilerplate.
- **Treating schemamap as a substitute for the XML sitemap or `llms.txt`.** They answer different questions: the sitemap lists URLs for indexing, `llms.txt` summarises content for LLMs, schemamap lists structured-data endpoints. Ship all three.

## Verification

- `curl -sI https://example.com/articles/foo.jsonld` returns `200` with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.
- `curl -s https://example.com/schemamap.xml | xmllint --noout -` parses cleanly. Every `<jsonld>` URL it lists fetches with `200`.
- Compare the `.jsonld` body to the `<script type="application/ld+json">` block on the same page — the graph (after sorting keys) should be identical.
- Fetch the page HTML and confirm both `<link rel="alternate" type="application/ld+json">` and `<link rel="schemamap">` are present in `<head>`.
- Validate the JSON-LD body with the [Schema Markup Validator](https://validator.schema.org/).
---

## stable-urls
Source: https://specification.website/spec/agent-readiness/stable-urls/

---
title: "Stable URLs"
category: agent-readiness
status: required
url: https://specification.website/spec/agent-readiness/stable-urls/
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "Cool URIs don't change"
    url: "https://www.w3.org/Provider/Style/URI"
    publisher: "W3C — Tim Berners-Lee"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
  - title: "Google — Redirects and Search"
    url: "https://developers.google.com/search/docs/crawling-indexing/301-redirects"
    publisher: "Google Search Central"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Stable URLs

> URLs are public contracts. Once published, they should keep working. Breaking them invalidates citations, bookmarks, links, and agent caches — and is almost always avoidable.

## What it is

A stable URL is one that keeps resolving to the same content over time, or — when content moves — redirects permanently to its new location. The principle was set out by Tim Berners-Lee in 1998 in *Cool URIs don't change* and has only become more important as agents, archives, and citations multiply.

A URL is a public contract. Once you publish one, every link, bookmark, citation, RSS reader, search index, and agent cache assumes it will keep working.

## Why it matters

- **Agents cache answers.** When a model quotes your page, it cites the URL. If that URL 404s next month, the citation is broken and your authority drops.
- **Search engines lose ranking signals.** Backlinks accumulated over years are tied to the URL.
- **Humans hate broken links.** Bookmarks, shared chat messages, printed materials.
- **Internal links rot.** Every change inside your own site creates work elsewhere on it.

A site that reorganises its URLs every release teaches the web not to trust it.

## How to implement

Design for permanence from the start:

- **Avoid implementation details.** No `/wp-content/`, `/index.php`, `.aspx`, or `?id=42`. These leak the stack and break when you switch it.
- **Avoid dates unless they are essential to the resource.** A news article can keep `/2025/03/headline`. An evergreen documentation page should not.
- **Avoid the author or department.** Authors leave and departments rename.
- **Use kebab-case slugs.** Lowercase, hyphens between words, no trailing slashes mixed with non-trailing slashes — pick one and enforce it.
- **Pick a canonical host.** `www.` or no-`www.`, HTTPS only, one path style. Redirect the rest.

When a URL must change, redirect:

- Issue a `301 Moved Permanently` (or `308` to preserve the method) from the old URL to the new one.
- Keep the redirect forever. Removing it years later breaks links you have forgotten about.
- Avoid chains: redirect `A` directly to `C`, not `A` to `B` to `C`.
- Never redirect everything to the homepage. That is worse than a 404 — it tells crawlers the page intentionally still exists.

For deletions, a clean `410 Gone` is more honest than a soft 404 or a homepage redirect.

## Common mistakes

- Re-platforming and changing every URL slug "while we're at it".
- Adding session IDs, tracking parameters, or A/B variants to canonical URLs.
- Letting trailing slashes serve different content from non-trailing slashes.
- 302 (temporary) redirects for moves that are permanent.
- Removing redirect maps after a year because the file got big.

## Verification

- Crawl old URLs after a migration and confirm each returns `301` to a working target.
- Use search-console reports to find 404s coming from external links.
- Spot-check archived URLs in the Wayback Machine. If they still load, your redirects are doing their job.
---

## structured-data-for-agents
Source: https://specification.website/spec/agent-readiness/structured-data-for-agents/

---
title: "Structured data for agents"
category: agent-readiness
status: recommended
url: https://specification.website/spec/agent-readiness/structured-data-for-agents/
updated: "2026-06-10T00:00:00.000Z"
sources:
  - title: "schema.org"
    url: "https://schema.org/"
    publisher: "schema.org"
  - title: "Google — Intro to structured data"
    url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
    publisher: "Google Search Central"
  - title: "JSON-LD 1.1"
    url: "https://www.w3.org/TR/json-ld11/"
    publisher: "W3C"
  - title: "Is It Agent Ready?"
    url: "https://isitagentready.com/"
    publisher: "Is It Agent Ready?"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Structured data for agents

> JSON-LD with schema.org types gives agents typed facts about your page. It is the same markup search engines use, and agents lean on it just as heavily.

## What it is

Structured data is a machine-readable description of what a page is about, embedded in the page itself. The dominant vocabulary is [schema.org](https://schema.org/), and the recommended syntax is JSON-LD: a `<script type="application/ld+json">` block inside `<head>`.

The same markup that drives rich results in Google also helps agents understand who wrote a page, what it describes, and how it relates to other entities. Agents do not parse open prose well; they parse JSON-LD reliably.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Setting up CSP",
  "datePublished": "2026-05-12",
  "author": {
    "@type": "Person",
    "name": "Joost de Valk",
    "url": "https://example.com/about/joost"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Example Corp",
    "url": "https://example.com"
  }
}
</script>
```

## Why it matters

- **Disambiguation.** "Joost de Valk" is text. `Person` with a `url` is a typed identity.
- **Extraction quality.** Agents pull facts from JSON-LD with near-perfect accuracy. The same facts in prose are guessed.
- **Cross-page consistency.** A consistent `Organization` block across the site lets agents merge data into a single entity.
- **Search overlap.** What helps agents here is the same work that drives rich results and Knowledge Graph entries.

It is also one of the easiest items in this spec to verify: the markup is right there in the HTML.

## How to implement

Pick the types that match your pages. Common ones:

- `Article`, `BlogPosting`, `NewsArticle` for editorial content.
- `Product` with `Offer`, `AggregateRating`, `Review` for commerce.
- `FAQPage` and `Question` for Q&A content. (Google retired FAQ as a *search* rich result in 2026; the markup stays valid, but no answer engine has confirmed it favours the JSON-LD over the rendered Q&A, so mark up genuine visible Q&A only — not as a "GEO" lever.)
- `Person`, `Organization` for entity pages, used as nested references everywhere else.
- `Event`, `Recipe`, `HowTo`, `JobPosting`, `LocalBusiness` for vertical-specific pages.
- `BreadcrumbList` for breadcrumb trails.
- `WebSite` with `SearchAction` on the homepage.

Rules to follow:

- Use JSON-LD over Microdata or RDFa. Easier to write, easier to keep in sync.
- One block per type is fine; multiple blocks per page are also fine.
- Reuse `@id` URIs so agents can link entities across pages.
- Mirror what is visible on the page. Schema for content that does not appear violates Google's guidelines and trains agents to mistrust your markup.
- Test with the [Schema Markup Validator](https://validator.schema.org/) and Google's Rich Results Test.

## Common mistakes

- Marking up an `Article` that is actually a category page.
- Inflating `AggregateRating` with fake reviews. Both search engines and agents penalise this when caught.
- Leaving stale `datePublished` or `author` after a CMS migration.
- Forgetting to update structured data when the visible content changes.
- Using `@type: "WebPage"` for everything. Pick a specific type.

## Verification

- Run the page through [validator.schema.org](https://validator.schema.org/) and Google's Rich Results Test.
- Fetch the HTML and confirm the JSON-LD is present before JavaScript executes.
- Spot-check that the JSON-LD matches what a reader actually sees.
---

## tdmrep
Source: https://specification.website/spec/agent-readiness/tdmrep/

---
title: "TDM reservation (TDMRep)"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/tdmrep/
updated: "2026-07-28T00:00:00.000Z"
sources:
  - title: "TDM Reservation Protocol (TDMRep) — Final Community Group Report"
    url: "https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240202/"
    publisher: "W3C"
  - title: "Directive (EU) 2019/790 on copyright in the Digital Single Market — Article 4"
    url: "https://eur-lex.europa.eu/eli/dir/2019/790/oj"
    publisher: "EUR-Lex"
  - title: "IANA Well-Known URIs registry"
    url: "https://www.iana.org/assignments/well-known-uris/well-known-uris.xhtml"
    publisher: "IANA"
  - title: "European Commission — Consultation on protocols for reserving rights from text and data mining"
    url: "https://digital-strategy.ec.europa.eu/en/consultations/commission-launches-consultation-protocols-reserving-rights-text-and-data-mining-under-ai-act-and"
    publisher: "European Commission"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# TDM reservation (TDMRep)

> Declare in machine-readable form whether you reserve the right to object to text and data mining, using the `tdm-reservation` HTTP header, a `<meta>` element, or `/.well-known/tdmrep.json`. Its force is legal, not technical.

## What it is

TDMRep is a small, finished convention for stating one thing: whether you reserve the right to object to **text and data mining** of your content. It carries a single value, `1` (reserved) or `0` (not reserved), plus an optional URL pointing at a human- or machine-readable licensing policy.

Three places can carry it, in ascending order of specificity:

```
tdm-reservation: 1
tdm-policy: https://example.com/policies/tdm.json
```

```html
<meta name="tdm-reservation" content="1" />
<meta name="tdm-policy" content="https://example.com/policies/tdm.json" />
```

```json
[
  { "location": "/", "tdm-reservation": 1 },
  { "location": "/press/*.jpg", "tdm-reservation": 0 }
]
```

The last of these lives at `/.well-known/tdmrep.json` and uses `robots.txt` path-matching rules, including `*` and `$`. When more than one mechanism applies to the same resource, the more specific wins: an HTML `<meta>` beats an HTTP header, which beats the well-known file. The file is the site-wide default; the header and the meta element are the per-resource overrides.

**This is not a crawler blocker, and reading it as one is the most common mistake.** `robots.txt` and AI-crawler directives answer *may you fetch this?* TDMRep answers a later and separate question: *having fetched it, may you mine it?* A crawler that respects `Disallow:` never sees your content. A crawler that respects `tdm-reservation: 1` reads the page quite happily and is then on notice that training on it was not licensed. One is a gate; the other is a notice. Shipping TDMRep blocks nobody, and a site that wants a gate still needs [robots directives for AI crawlers](/spec/agent-readiness/robots-for-ai-crawlers/).

## Why it matters

The consumer of this signal is mostly a legal system rather than a crawler, and that is the honest way to judge it.

Article 4 of the EU Copyright in the Digital Single Market Directive permits text and data mining of lawfully accessible works **unless the rightsholder has expressly reserved that right in a machine-readable way**. The reservation has to be machine-readable to count. TDMRep exists to be that machine-readable form. If you do nothing, Article 4's default is that mining is permitted.

That obligation now has a counterpart on the other side. Providers of general-purpose AI models must have a policy for identifying and respecting Article 4 reservations, and in December 2025 the European Commission opened a consultation to agree a list of protocols that qualify — with TDMRep among the named candidates. The output of that process, not crawler adoption statistics, is what will decide whether this convention matters.

Technical uptake, meanwhile, is thin and worth stating plainly. Spawning AI reads TDMRep in the API it operates for model trainers, and Common Crawl measures its prevalence when surveying opt-out signals. No major crawler operator has published a commitment to honour it in the way they publish commitments about `robots.txt`. Do not ship this expecting enforcement. Ship it because an unstated reservation is, under Article 4, no reservation at all.

## How to implement

**Decide the value first, then pick the mechanism.** The value is a licensing decision, not a technical one. `1` means anyone wanting to mine your content must seek permission or follow your `tdm-policy`. `0` means they may mine it freely. There is no "ask me nicely" middle option, and inventing one breaks parsers.

**Prefer the HTTP header for a whole-site answer.** It applies to every response, including images, PDFs, and JSON that have no `<head>` to put a `<meta>` in. That coverage is the reason to reach for it first.

**Use `/.well-known/tdmrep.json` when the answer varies by path**, and remember it is the weakest of the three — anything you set in a header or a `<meta>` on a specific resource overrides it.

**Set `tdm-policy` whenever you set `tdm-reservation: 1`.** A bare reservation tells a would-be licensee that the answer is no, without telling them who to ask. That is a wasted opportunity and, if you are hoping to license, self-defeating.

**Keep it consistent with everything else you publish.** A `tdm-reservation: 1` next to a permissive content licence, or next to `Content-Signal: ai-train=yes`, is a contradiction someone will eventually have to resolve — probably not in your favour.

> **This site ships it.** specification.website sends `tdm-reservation: 0` on every response, set in [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers). The content is CC BY 4.0 and we want it mined, indexed, and trained on; declaring `0` states that in the same machine-readable form that a refusal would take, rather than leaving it to be inferred from a licence file.

## Common mistakes

- Treating it as a block. It stops no fetch and triggers no `403`. If you want fetching stopped, that is a different mechanism.
- Sending `tdm-reservation: 1` while your `robots.txt` invites AI crawlers in, or vice versa. Pick a position and express it consistently.
- Using `true`, `yes`, or `reserved` as the value. Only the integers `1` and `0` are valid; anything else means agents treat the field as unset, so a malformed reservation is the same as no reservation.
- Putting the well-known file in place and assuming it wins. It is the lowest-precedence mechanism of the three.
- Expecting the declaration to be retroactive. It says nothing about copies already in a training corpus.

## Verification

- `curl -sI https://example.com/ | grep -i tdm-` shows the header on a real response.
- Fetch a non-HTML asset — an image, a PDF — and confirm the header is present there too. That is the coverage the `<meta>` form cannot give you.
- If you publish `/.well-known/tdmrep.json`, confirm it parses as a JSON array and that every entry has a `location` and an integer `tdm-reservation`.
- Check the value against your actual licence. The two should say the same thing.
---

## web-bot-auth
Source: https://specification.website/spec/agent-readiness/web-bot-auth/

---
title: "Web Bot Auth — verifiable bot identity"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/web-bot-auth/
updated: "2026-09-10T00:00:00.000Z"
sources:
  - title: "RFC 9421 — HTTP Message Signatures"
    url: "https://www.rfc-editor.org/rfc/rfc9421"
    publisher: "IETF"
  - title: "draft-ietf-webbotauth-httpsig-protocol — HTTP Message Signatures for automated traffic"
    url: "https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/"
    publisher: "IETF Web Bot Auth Working Group"
  - title: "IETF Web Bot Auth (webbotauth) Working Group"
    url: "https://datatracker.ietf.org/wg/webbotauth/about/"
    publisher: "IETF"
  - title: "Cloudflare — Forget IPs: using cryptography to verify bot and agent traffic"
    url: "https://blog.cloudflare.com/web-bot-auth/"
    publisher: "Cloudflare"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# Web Bot Auth — verifiable bot identity

> Web Bot Auth lets a bot prove who it is by signing each HTTP request with a key it controls. Sites can then allow or block specific bots without IP allow-lists, user-agent strings, or guesswork. Built on RFC 9421 HTTP Message Signatures.

## What it is

Web Bot Auth is an emerging convention that lets a bot prove its identity cryptographically on every request, using the standard [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421) mechanism from RFC 9421. Instead of guessing whether a request really comes from OpenAI's crawler by inspecting the user-agent string and looking up reverse DNS, the server reads a `Signature` header, fetches the bot's public key from a published key directory, and verifies the signature.

The work now has an IETF home. In September 2026 the [Web Bot Auth working group](https://datatracker.ietf.org/wg/webbotauth/about/) adopted [draft-ietf-webbotauth-httpsig-protocol](https://datatracker.ietf.org/doc/draft-ietf-webbotauth-httpsig-protocol/) as its first working-group document, folding in the separate key-directory draft that used to sit alongside it. One document now covers the trust model, the signing rules, the `Signature-Agent` header used to discover a bot's keys, and the JWK Set that header points at — served, the draft asks IANA to register, from `/.well-known/http-message-signatures-directory`. Cloudflare ships verification at the network edge, and a growing list of major crawlers sign their traffic.

Working-group adoption is not publication. The draft is still a draft, its details can and will change before it becomes an RFC, and the well-known URI it names is requested rather than registered. What adoption does tell you is that the mechanism is no longer one vendor's proposal: it has a chartered group, chairs, and a deliverable date, so building against it is a bet on a process rather than on a company.

## Why it matters

- **User-agent strings lie.** Anyone can set `User-Agent: GPTBot/1.0`. Signed requests cannot be forged without the bot operator's private key.
- **IP allow-lists rot.** Crawler IP ranges change. A signature-based check survives infrastructure migrations on the bot's side.
- **Granular policy.** Once you can verify the caller, you can apply different rules — paywall bypass for partner agents, slower rate limits for low-trust crawlers — without bespoke detection.
- **Composable with [Content Signals](/spec/agent-readiness/content-signals/) and [robots.txt for AI crawlers](/spec/agent-readiness/robots-for-ai-crawlers/).** robots.txt declares the policy; Web Bot Auth proves the identity the policy is about to be applied to.

Treat it as `optional` for now. The draft is pre-RFC, the verifier ecosystem is small, and most sites will get the benefit transparently via their CDN before they touch any code. But the direction is clear: bot identity is moving from "trust the header" to "verify the signature".

## How to implement

**If you are running a site:**

- **Use a verifier that supports your signing profile.** Follow its documented identity result. If verification happens at a proxy, accept that result only over a trusted proxy-to-origin path; strip client-supplied copies of identity headers.
- **Combine, do not replace.** Web Bot Auth tells you who is calling. [robots.txt](/spec/seo/robots-txt/) and [Content Signals](/spec/agent-readiness/content-signals/) tell you what they may do with the response. Both layers are needed.
- **Keep authorisation separate.** A valid signature establishes a key/identifier association, not permission or good behaviour. Apply your own policy to verified identifiers and retain your existing defaults for unsigned traffic.

**If you operate a bot:**

- **Generate an asymmetric signing keypair.** The draft restricts you to algorithms in the RFC 9421 registry and rules out shared-secret HMAC outright — a symmetric key would have to be handed to every site that wants to verify, which defeats the point.
- **Publish the public key** as a JWK Set. For default directory discovery, serve it at `https://bot.example/.well-known/http-message-signatures-directory` with media type `application/http-message-signatures-directory+json`. Send `Signature-Agent: sig1="https://bot.example"`: the value is an HTTPS **origin**, not the well-known file's URL. For a direct JWK Set URL instead, send `Signature-Agent: sig1="https://bot.example/keys.json";type=jwks_uri`.
- **Use the same label** (`sig1` here) in `Signature`, `Signature-Input` and `Signature-Agent`. Cover the matching dictionary member with `"signature-agent";key="sig1"` in `Signature-Input`, alongside the required target component. See [draft sections 5.2.1 and 5.5](https://datatracker.ietf.org/doc/html/draft-ietf-webbotauth-httpsig-protocol-00#section-5.2.1).
- **Sign every request** with `Signature` and `Signature-Input` per RFC 9421, covering `@authority` or `@target-uri` and carrying the `created`, `expires`, `keyid`, and `tag` parameters. `tag` must be `web-bot-auth`, which is what lets a verifier tell this profile apart from other uses of message signatures on the same connection.
- **Rotate keys** without breaking verifiers: allow for cached directories and outstanding signatures when overlapping keys; remove compromised keys promptly.

## Common mistakes

- Blocking unsigned traffic as a default. The standard is opt-in for bots; legitimate non-signing clients (including most browsers) will be locked out.
- Skipping `created` and `expires`, or accepting stale timestamps. Both are mandatory signature parameters in the draft; without a freshness window a captured signature replays forever.
- Verifying only the homepage. Bots fetch internal pages too; the policy has to apply site-wide.
- Assuming a signature authenticates `User-Agent`. It protects only the components it covers; the profile does not require that header to be signed.

## Verification

- Send an actually signed request using your signing client. Confirm the verifier reports the expected identifier, then change a covered component and confirm verification fails. Placeholder signature values cannot test success.
- For bot operators: feed your signed request into an RFC 9421 verifier and confirm the canonicalised signature base matches what your client constructed.
- Check your access logs for a verified-bot tag on traffic from signing crawlers (OpenAI, Anthropic, Perplexity, and others publish their key sets).
---

## webmcp
Source: https://specification.website/spec/agent-readiness/webmcp/

---
title: "WebMCP — browser-native tools for agents"
category: agent-readiness
status: optional
url: https://specification.website/spec/agent-readiness/webmcp/
updated: "2026-10-16T00:00:00.000Z"
sources:
  - title: "WebMCP — W3C Web Machine Learning Community Group"
    url: "https://webmachinelearning.github.io/webmcp/"
    publisher: "W3C WebML CG"
  - title: "webmachinelearning/webmcp on GitHub"
    url: "https://github.com/webmachinelearning/webmcp"
    publisher: "W3C WebML CG"
  - title: "webmcp-types — TypeScript type definitions for WebMCP"
    url: "https://github.com/webmachinelearning/webmcp-types"
    publisher: "W3C WebML CG"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# WebMCP — browser-native tools for agents

> WebMCP lets a page register tools that an in-browser AI agent can call directly, using the `document.modelContext` JavaScript API. It turns a site into an agent surface without server-side MCP plumbing.

## What it is

WebMCP is an emerging browser API that lets a page register structured tools — named functions with input schemas — that an AI agent running inside the same browser (a sidebar assistant, a built-in browser agent, an extension) can invoke directly. The shape mirrors [Model Context Protocol](/spec/agent-readiness/mcp-and-tool-discovery/) tools, hence the name: it is MCP, but the transport is the JavaScript heap instead of HTTP+JSON-RPC.

The proposal is incubated in the [W3C Web Machine Learning Community Group](https://webmachinelearning.github.io/webmcp/). The current spec surface is `document.modelContext`; earlier drafts (and some shipping implementations) exposed it as `navigator.modelContext` and a portable script feature-detects both. A page registers a tool by calling `registerTool({ name, description, inputSchema, annotations, execute })`. The browser exposes registered tools to the local agent; the agent calls `execute()` and gets a result back, all without leaving the tab.

```js
const mc =
  (typeof document !== 'undefined' && document.modelContext) ||
  (typeof navigator !== 'undefined' && navigator.modelContext);

mc?.registerTool({
  name: 'search_docs',
  title: 'Search the docs',
  description: 'Search the documentation for a query.',
  inputSchema: {
    type: 'object',
    properties: { query: { type: 'string' } },
    required: ['query'],
  },
  annotations: { readOnlyHint: true },
  async execute({ query }, { signal }) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
    return res.text();
  },
});
```

**This site ships it.** [`/webmcp.js`](/webmcp.js) registers `search_spec`, `list_topics`, `get_topic`, `open_search`, and `open_checklist` — generated at build time from the same content collection that powers the rest of the site. An in-browser agent can search and read the spec without going through the remote [MCP server](/spec/agent-readiness/mcp-and-tool-discovery/). A visitor whose browser has no WebMCP implementation downloads none of it: a small inline guard checks for `modelContext` and only then injects the script.

## Why it matters

- **Same vocabulary as server-side MCP.** A team that already builds MCP tools on the server can expose the same shapes in the browser without re-modelling.
- **Sees the logged-in user.** A browser-side tool runs inside the user's authenticated session, including cookies, IndexedDB, and any per-tab state. A server MCP server has none of that without explicit auth plumbing.
- **No new transport.** Nothing to host, nothing to scale, no auth headers to wire up. The browser is the transport.
- **Composes with MCP.** A site can ship both: an HTTP MCP server for headless agents and a WebMCP surface for in-browser agents. Same tool names, same schemas, same intent.

The API is early — implementations are shipping behind flags and via polyfill. Treat WebMCP as `optional` until at least one major browser exposes it without a flag. The cost of being early is low; the design follows MCP closely so most code will port forward.

## How to implement

- **Feature-detect before you download, not just before you register.** The obvious shape — ship the tool bundle on every page, check `modelContext` at the top, return early when it is missing — puts the check inside the thing it is meant to guard. Every visitor pays for a script that today almost none of them can use. Put the detection in a few inline bytes and inject the bundle only when the API is present. If it is absent, do nothing — never throw.
- **Keep the payload small; fetch the corpus on demand.** Tool definitions are tiny, the data they search usually is not. Register the tools with complete input schemas up front — an agent needs those to decide what to call — then fetch the data on the first call that actually needs it. The agent is already awaiting a tool result, so the extra round trip costs nothing anyone perceives.
- **Mirror your server-side MCP tools.** If you already publish `search_docs` on an HTTP MCP server, register a tool with the same name, description, and input schema in the browser. An agent that knows the server-side tool will recognise the browser one immediately.
- **Use the `annotations` field** to declare safety properties. The WebMCP surface defines `readOnlyHint` (the tool only reads data), `consequentialHint` (executing it commits a significant, real-world, or non-reversible action — bookings, payments, deletions), and `untrustedContentHint` (the output includes user- or third-party-authored text, which the agent must treat as untrusted). Newer implementations also expose `debugging` for developer-tooling-only tools. All hints default to `false`: declare a hint only when it is `true`, never declare `: false`. The agent uses these to decide whether to confirm with the user and how to sandbox the output.
- **Keep `execute()` small and its errors structured.** A tool is a thin call into existing site functionality (search, navigation, account actions), not a bespoke pipeline. On failure, resolve a structured payload (`{ error, code, retryable }`) rather than rejecting: an unhandled rejection surfaces to the agent as a generic `UnknownError` with the reason discarded. Never report a failure as a success string.
- **Document the tools.** Add them to your [agent skills index](/spec/agent-readiness/agent-skills-discovery/) so agents that read the site's discovery surfaces — not just ones already in the browser — know they exist.

## Common mistakes

- Registering tools that bypass the site's own access controls. A WebMCP tool runs as the logged-in user; treat it like any other JavaScript-callable action and apply the same authorisation checks server-side.
- Feature-detecting inside the bundle rather than before it. The early return is correct but it runs too late — the bytes are already on the wire and parsed. Guard the load, then guard the call.
- Designing tools that only make sense in the browser. If a server-side MCP server can do the same job, ship both — agents should be able to use whichever transport they have.
- Treating annotations as cosmetic. `readOnlyHint` and `consequentialHint` change agent behaviour; declare them honestly, and never declare a hint as `: false` — omission already means `false`.

## Verification

- `typeof navigator.modelContext?.registerTool === 'function'` in a console on a supporting browser.
- On a browser *without* the API, the network panel shows no request for the tool bundle at all — not a request whose script returns early.
- The browser's agent UI lists your registered tools by name and description.
- Calling a registered tool from a test agent returns a JSON-serialisable result. The tool's `execute()` can resolve a string, object, array, or another JSON-serialisable value; `document.modelContext.executeTool()` returns that value serialised as JSON. An MCP-shaped `{ content: [...] }` envelope is not required.
- If you ship a parallel HTTP MCP server, the tool names match across both surfaces.
---

