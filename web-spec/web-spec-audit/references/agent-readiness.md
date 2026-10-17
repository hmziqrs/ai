# Agent Readiness — 107 audit checks

Making the site legible to AI agents and LLMs: initial-HTML content, llms.txt and markdown source endpoints, per-agent crawler rules, Content Signals, TDMRep, stable URLs, structured data, feeds, Link headers, and the emerging discovery conventions (MCP, A2A, Agent Skills, DNS-AID, ARD, NLWeb, WebMCP, OKF, Schemamap).

Source: [The Website Specification](https://specification.website/spec/agent-readiness/) — content CC BY 4.0, code MIT. Distilled from the local research corpus (`.zflow/evidence/specweb/research-report.md` §2.6, quotes grep-verified against fetched pages); the live spec is the source of truth. Each entry's slug resolves to https://specification.website/spec/agent-readiness/<slug>/.

Checklist status (`meta/checklist.md`): **Required** — stable URLs · **Recommended** — agent readiness overview, llms.txt, Markdown source endpoints, robots.txt for AI crawlers, structured data for agents, machine-readable formats, HTTP Link headers for discovery, Agent Skills discovery.

Severity legend:

- high = breaks the platform contract or harms users
- medium = real defect degrading the site
- low = polish (the full model lives in the web-spec-audit SKILL.md)

## Checks

- **AR-1 — Main content must be in the initial HTML** (high · `agent-readiness-overview`)
  Verify: Pick a distinctive phrase visible only in the rendered main content, then `curl -s <page-url> | grep -F '<phrase>'` — the phrase must appear in the raw HTML; if it only appears after JS runs (check in a headless browser), the site fails.
- **AR-2 — robots.txt must name AI crawlers explicitly** (medium · `agent-readiness-overview`)
  Verify: `curl -s https://example.com/robots.txt` and confirm named AI user-agents (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Google-Extended, Applebot-Extended, PerplexityBot, CCBot, Bytespider) appear with their own rules rather than only a `*` wildcard.
- **AR-3 — /llms.txt served at the root** (medium · `llms-txt`)
  Verify: `curl -sI https://example.com/llms.txt` returns 200 with `Content-Type: text/markdown` or `text/plain`, and `curl -s https://example.com/llms.txt` returns a markdown body.
- **AR-4 — /llms.txt advertised with rel="describedby"** (medium · `llms-txt`)
  Verify: `curl -sI https://example.com/ | grep -i '^link:'` shows `rel="describedby"`, or `curl -s https://example.com/ | grep 'rel="describedby"'` finds the `<link>` in `<head>`.
- **AR-5 — /llms.txt structure: H1 name plus blockquote summary** (low · `llms-txt`)
  Verify: `curl -s https://example.com/llms.txt | head -5` — the first non-empty line starts with `# ` and the next starts with `> `.
- **AR-6 — /llms.txt groups canonical links under ## sections** (low · `llms-txt`)
  Verify: Inspect `curl -s https://example.com/llms.txt` for `##` sections; extract links with `grep -oE '\]\([^)]+\)'` and spot-check they resolve 200 and match the canonical (rel="canonical") URL of the target page.
- **AR-7 — /llms.txt stays short** (low · `llms-txt`)
  Verify: `curl -s https://example.com/llms.txt | wc -l` — under roughly 300 lines.
- **AR-8 — /llms.txt linked for humans** (low · `llms-txt`)
  Verify: `curl -s https://example.com/ | grep -c 'llms.txt'` returns at least 1.
- **AR-9 — /llms.txt points at markdown source, advertised with rel="alternate"** (low · `llms-txt`)
  Verify: `curl -s https://example.com/llms.txt | grep -E '\.md'` lists markdown URLs, and `curl -s <page> | grep 'rel="alternate"' | grep 'text/markdown'` shows the per-page advertisement.
- **AR-10 — /llms.txt links must not be stale** (medium · `llms-txt`)
  Verify: Extract every URL from /llms.txt and run `curl -s -o /dev/null -w '%{http_code}' <url>` on each — all must return 2xx or 3xx.
- **AR-11 — /llms-full.txt kept to a usable size** (low · `llms-full-txt`)
  Verify: `curl -s https://example.com/llms-full.txt | wc -c` — well under ~2,000,000 bytes.
- **AR-12 — /llms-full.txt served as real markdown** (low · `llms-full-txt`)
  Verify: `curl -sI https://example.com/llms-full.txt` shows a text content type, and `curl -s https://example.com/llms-full.txt | head -1` starts with `#`, not `<`.
- **AR-13 — /llms-full.txt sections carry their source URL** (low · `llms-full-txt`)
  Verify: Inspect the body: `grep -c '^---$'` matches section count and each heading block contains an absolute URL (`grep -A2 '^# '`).
- **AR-14 — .md suffix returns markdown source** (medium · `markdown-source-endpoints`)
  Verify: Run exactly `curl -sI https://example.com/docs/getting-started.md` on sample content pages and check status 200 plus the markdown content type.
- **AR-15 — Accept: text/markdown negotiation works** (medium · `markdown-source-endpoints`)
  Verify: Run the quoted curl and confirm the response body is markdown and the headers include `Content-Location` and `Vary: Accept`.
- **AR-16 — HTML response carries Vary: Accept** (medium · `markdown-source-endpoints`)
  Verify: `curl -sI https://example.com/docs/getting-started/` shows `Vary` containing `Accept`.
- **AR-17 — Markdown source advertised in <head>** (low · `markdown-source-endpoints`)
  Verify: `curl -s <page-url> | grep 'rel="alternate"' | grep 'text/markdown'` returns the link tag.
- **AR-18 — .md body matches the rendered HTML** (medium · `markdown-source-endpoints`)
  Verify: Compare `curl -s <page>.md | grep '^#'` against the rendered page's headings, and grep the .md body for template artefacts (`grep -E '\{\{|_shortcode'` should find nothing).
- **AR-19 — .md and HTML share one access policy** (medium · `markdown-source-endpoints`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' <page>.md` returns 200 (or the same status as the HTML page), never 401/403 or a login redirect.
- **AR-20 — Markdown frontmatter carries page metadata** (low · `markdown-source-endpoints`)
  Verify: `curl -s <page>.md | head -20` begins with `---` and the frontmatter contains at least `title` and `url`.
- **AR-21 — X-Markdown-Tokens size hint** (low · `markdown-source-endpoints`)
  Verify: `curl -sI <page>.md | grep -i 'x-markdown-tokens'`; when present, tokenise the body with tiktoken cl100k_base and confirm the value is the same order of magnitude (not invented).
- **AR-22 — Explicit per-agent AI crawler rules** (medium · `robots-for-ai-crawlers`)
  Verify: `curl -s https://example.com/robots.txt` contains at least one dedicated group for a named AI crawler (e.g. `User-agent: GPTBot`, `User-agent: ClaudeBot`, `User-agent: Google-Extended`) with an explicit Allow/Disallow.
- **AR-23 — No accidental blanket wildcard disallow** (high · `robots-for-ai-crawlers`)
  Verify: Parse `curl -s https://example.com/robots.txt`: a `User-agent: *` group followed by `Disallow: /` is a failure unless the site is deliberately unlisted (confirm intent, e.g. a login-gated staging surface).
- **AR-24 — Each public subdomain has its own robots.txt** (medium · `robots-for-ai-crawlers`)
  Verify: For each public subdomain (blog., docs., shop.), `curl -sI https://<subdomain>.example.com/robots.txt` returns 200.
- **AR-25 — OpenAI agents controlled individually** (low · `robots-for-ai-crawlers`)
  Verify: Inspect robots.txt groups: where any OpenAI user-agent appears, all three (GPTBot, OAI-SearchBot, ChatGPT-User) have explicit rules matching the intended policy.
- **AR-26 — Content-Signal directive published** (low · `content-signals`)
  Verify: `curl -s https://example.com/robots.txt | grep -i 'content-signal'` returns a well-formed directive line.
- **AR-27 — Directive spelled singular and placed in a group** (low · `content-signals`)
  Verify: `curl -s /robots.txt | grep -i 'content-signals:'` must be empty, and the `Content-Signal:` line must appear after a `User-agent:` line within its group.
- **AR-28 — Deployed key names used** (low · `content-signals`)
  Verify: `curl -s /robots.txt | grep -i 'content-signal'` — keys are limited to `search`, `ai-input`, `ai-train`.
- **AR-29 — Values limited to yes/no** (low · `content-signals`)
  Verify: Parse the directive line: every `<key>=<value>` pair matches `(search|ai-input|ai-train)=(yes|no)`.
- **AR-30 — No contradiction with Disallow** (low · `content-signals`)
  Verify: For each robots.txt group containing a Content-Signal line, confirm the same group has no full `Disallow: /`.
- **AR-31 — TDM reservation declared machine-readably** (low · `tdmrep`)
  Verify: `curl -sI https://example.com/ | grep -i tdm-`, or `curl -s https://example.com/ | grep 'tdm-reservation'`, or `curl -s https://example.com/.well-known/tdmrep.json` — at least one is present.
- **AR-32 — Reservation value must be integer 1 or 0** (medium · `tdmrep`)
  Verify: Inspect the header/meta/JSON value — it must match exactly `1` or `0` (no `true`, `yes`, `reserved`).
- **AR-33 — Header form covers non-HTML assets** (low · `tdmrep`)
  Verify: `curl -sI <site-image-or-pdf-url> | grep -i tdm-` returns the header.
- **AR-34 — tdm-policy accompanies a reservation of 1** (low · `tdmrep`)
  Verify: Wherever tdm-reservation is 1, a `tdm-policy` URL is present and `curl -s -o /dev/null -w '%{http_code}' <policy-url>` returns 2xx.
- **AR-35 — TDMRep consistent with other AI signals** (low · `tdmrep`)
  Verify: Compare the tdm-reservation value with the robots.txt Content-Signal ai-train value and any published content licence — they must not contradict.
- **AR-36 — tdmrep.json is a valid array** (low · `tdmrep`)
  Verify: `curl -s https://example.com/.well-known/tdmrep.json | jq .` — output is an array; every entry has `location` and integer `tdm-reservation`.
- **AR-37 — Unsigned traffic must not be blocked by default** (medium · `web-bot-auth`)
  Verify: `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (Macintosh)' https://example.com/` and a plain `curl -sI https://example.com/` both return 2xx/3xx without a bot-verification wall or 403.
- **AR-38 — /auth.md readable without credentials** (low · `auth-md`)
  Verify: `curl -s https://example.com/auth.md` returns 200 with a markdown body, not a 30x to a login page.
- **AR-39 — auth.md endpoints match live metadata** (low · `auth-md`)
  Verify: Extract documented endpoints from auth.md and diff them against `curl -s https://example.com/.well-known/oauth-authorization-server | jq .` (and the protected-resource metadata).
- **AR-40 — No implementation details in URLs** (medium · `stable-urls`)
  Verify: Extract URLs from the sitemap and homepage links, then `grep -E '\.php|\.aspx|\?id=|/wp-content/'` — no matches.
- **AR-41 — Kebab-case slugs with one trailing-slash style** (medium · `stable-urls`)
  Verify: Inspect sitemap URLs for lowercase-hyphen patterns and confirm trailing-slash presence is uniform across all listed URLs.
- **AR-42 — One canonical host over HTTPS** (high · `stable-urls`)
  Verify: `curl -sI http://example.com/`, `curl -sI https://www.example.com/` (and the apex counterpart) each return 301/308 to the canonical HTTPS host; plain HTTP never returns 200 directly.
- **AR-43 — Moved URLs redirect permanently** (high · `stable-urls`)
  Verify: For known old URLs (from prior sitemaps or the Wayback Machine), `curl -sI <old-url>` returns 301/308 with a Location that resolves 200.
- **AR-44 — No redirect chains** (medium · `stable-urls`)
  Verify: `curl -sIL -o /dev/null -w '%{num_redirects}\n' <url>` on moved/host-variant URLs — at most 1 hop after the initial request.
- **AR-45 — No mass redirect to the homepage** (high · `stable-urls`)
  Verify: Request retired URLs (from old sitemaps or inbound-link reports): the Location header must not be `/` or the homepage; expect 404/410 instead.
- **AR-46 — Deleted content returns 410** (medium · `stable-urls`)
  Verify: Spot-check known-removed URLs: `curl -s -o /dev/null -w '%{http_code}' <removed-url>` returns 410 (or an honest 404), not a 200 homepage or a redirect to it.
- **AR-47 — Canonical URLs free of session/tracking parameters** (medium · `stable-urls`)
  Verify: `curl -s <page> | grep 'rel="canonical"'` — the canonical URL contains no `utm_`, session, or variant query parameters; same check on sitemap URLs.
- **AR-48 — Trailing-slash variants must not serve different content** (medium · `stable-urls`)
  Verify: `diff <(curl -s https://example.com/page) <(curl -s https://example.com/page/)` — identical bodies, or one form 301-redirects to the other.
- **AR-49 — JSON-LD embedded in the page** (medium · `structured-data-for-agents`)
  Verify: `curl -s <page-url> | grep -c 'application/ld+json'` returns at least 1 and the block contains `"@context": "https://schema.org"`.
- **AR-50 — JSON-LD present before JavaScript executes** (high · `structured-data-for-agents`)
  Verify: `curl -s <page-url> | grep 'application/ld+json'` finds the markup in the raw, un-JS'd response.
- **AR-51 — Markup mirrors visible content** (high · `structured-data-for-agents`)
  Verify: Extract headline, author, and offer/price fields from the JSON-LD (`curl -s <page> | grep -A20 'application/ld+json'`) and confirm each appears in the rendered page a browser shows.
- **AR-52 — Specific schema.org types per page kind** (low · `structured-data-for-agents`)
  Verify: `curl -s <page> | grep '"@type"'` — the primary type is specific to the page kind, not `WebPage`.
- **AR-53 — Stable @id URIs reused across pages** (low · `structured-data-for-agents`)
  Verify: Extract `"@id"` values for the organization/author node from several pages (`curl -s <page1> <page2> | grep '"@id"'`) — the same entity carries the same @id everywhere.
- **AR-54 — No inflated ratings** (high · `structured-data-for-agents`)
  Verify: Compare the ratingValue/reviewCount in the JSON-LD with the reviews actually visible on the page; counts or stars that cannot be seen on-page fail.
- **AR-55 — Markup metadata stays current** (medium · `structured-data-for-agents`)
  Verify: Compare JSON-LD datePublished/author with the visible byline and date on the same page — they must agree.
- **AR-56 — Markup validates** (medium · `structured-data-for-agents`)
  Verify: Submit key page URLs to validator.schema.org — zero errors for the embedded JSON-LD.
- **AR-57 — JSON-LD preferred over Microdata/RDFa** (low · `structured-data-for-agents`)
  Verify: `curl -s <page> | grep -c 'itemscope='` returns 0 (or microdata is clearly supplementary) while a JSON-LD block is present.
- **AR-58 — XML sitemap published** (medium · `machine-readable-formats`)
  Verify: `curl -sI https://example.com/sitemap.xml` (or the sitemap index referenced by the robots.txt `Sitemap:` line) returns 200 with XML content.
- **AR-59 — RSS/Atom feed at a discoverable URL** (medium · `machine-readable-formats`)
  Verify: `curl -sI https://example.com/feed.xml` (trying /feed and /rss.xml as fallbacks) returns 200 with an RSS/Atom XML body.
- **AR-60 — Feeds linked from <head>** (low · `machine-readable-formats`)
  Verify: `curl -s <page> | grep 'rel="alternate"' | grep -E 'rss|atom|json'` returns the feed link(s).
- **AR-61 — Feed items carry full content** (medium · `machine-readable-formats`)
  Verify: `curl -s /feed.xml` item descriptions/content:encoded contain full paragraphs matching the article body, not truncated teasers.
- **AR-62 — Absolute URLs in feed items** (low · `machine-readable-formats`)
  Verify: Parse the feed and check every `<link>`, `<guid>`, and inline href starts with `https://` (or `http://`).
- **AR-63 — Feed timestamps update with content** (low · `machine-readable-formats`)
  Verify: Compare the newest feed item's timestamp against the most recently published/updated page date — they must match.
- **AR-64 — Feeds validate** (medium · `machine-readable-formats`)
  Verify: Submit the feed URL at validator.w3.org/feed — no validation errors.
- **AR-65 — Vary: Accept on every negotiated representation** (medium · `machine-readable-formats`)
  Verify: `curl -sI` each representation of a negotiated URL — both responses carry `Vary` containing `Accept`.
- **AR-66 — Link header on the homepage advertising resources** (medium · `link-headers`)
  Verify: `curl -sI https://example.com/ | grep -i '^link'` lists at least one advertised relation (agent-readiness validators check exactly this).
- **AR-67 — Only IANA-registered relation types** (low · `link-headers`)
  Verify: Extract every `rel=` value from the Link header and check each against the IANA Link Relations Registry (iana.org/assignments/link-relations/).
- **AR-68 — Link header syntax: angle brackets, comma separation** (low · `link-headers`)
  Verify: Inspect the raw Link header: targets match `"<...>"` and multiple entries are separated by commas; an RFC 8288 parse-and-render tool reports no syntax errors.
- **AR-69 — Link headers on non-HTML responses too** (low · `link-headers`)
  Verify: `curl -sI <json-or-asset-url> | grep -i '^link'` returns the header for public non-HTML endpoints.
- **AR-70 — Link headers consistent with HTML <head>** (low · `link-headers`)
  Verify: Cross-check every rel in the homepage head against the Link header: same relations point at the same targets.
- **AR-71 — Link entries self-describing with type and title** (low · `link-headers`)
  Verify: `curl -sI https://example.com/ | grep -i '^link'` — entries carry `type="..."` (and ideally `title="..."`).
- **AR-72 — MCP server card published and linked** (low · `mcp-and-tool-discovery`)
  Verify: `curl -sI https://example.com/.well-known/mcp/server-card.json` returns 200 JSON, and `curl -sI https://example.com/ | grep -i 'rel="mcp"'` shows the advertisement.
- **AR-73 — Tool annotations must be truthful** (medium · `mcp-and-tool-discovery`)
  Verify: With the MCP Inspector, run tools/list and compare each tool's annotations (readOnlyHint, destructiveHint, openWorldHint) against the tool's documented behaviour; make a live call only when the tool is annotated readOnlyHint true AND documented side-effect-free — otherwise mark not run.
- **AR-74 — OAuth 2.1 for user-data tools, no long-lived keys** (medium · `mcp-and-tool-discovery`)
  Verify: Inspect the server card and tool input schemas (MCP Inspector tools/list): user-data tools reference an OAuth flow, and no tool input schema contains a static api-key parameter.
- **AR-75 — Tools declare outputSchema and return structured content** (low · `mcp-and-tool-discovery`)
  Verify: MCP Inspector tools/list shows `outputSchema` on tools; a sample call to confirm `structuredContent` is made only against a tool annotated readOnlyHint true and documented side-effect-free — otherwise mark not run.
- **AR-76 — No deprecated capabilities advertised** (low · `mcp-and-tool-discovery`)
  Verify: Inspect the server card / server/discover response: the deprecated capabilities are absent from the advertised capability set.
- **AR-77 — agent-card.json served as JSON** (low · `a2a-agent-cards`)
  Verify: Run the quoted curl and pipe the body through `jq .` — both succeed.
- **AR-78 — Card points only at live endpoints** (medium · `a2a-agent-cards`)
  Verify: Never send live POST payloads to the audited site's endpoints. Verify the card's interface URLs are live read-only — `curl -sI <supportedInterfaces[0].url>` is reachable and not 404 — and mark the JSON-RPC liveness check not run unless the dispatch supplies a capture or explicitly authorizes the probe.
- **AR-79 — Card capabilities are honest** (low · `a2a-agent-cards`)
  Verify: Where the card declares `streaming: true`, confirm only read-only — the streaming endpoint is advertised and reachable; a `SendStreamingMessage` call is a state change: mark not run unless the dispatch supplies a capture or authorizes it. Unimplemented capabilities must be false.
- **AR-80 — Canonical card filename** (low · `a2a-agent-cards`)
  Verify: `curl -sI https://example.com/.well-known/agent-card.json` returns 200 directly (not a redirect from an `agent.json` path).
- **AR-81 — Skills index published with v0.2.0 $schema** (low · `agent-skills-discovery`)
  Verify: `curl -s https://example.com/.well-known/agent-skills/index.json | jq '.$schema, (.skills | length)'` — schema matches the v0.2.0 URI and skills is non-empty with all five fields per entry.
- **AR-82 — Skills hosted as text/markdown** (low · `agent-skills-discovery`)
  Verify: For each index entry, `curl -sI <skill-url>` returns 200 with `Content-Type: text/markdown`.
- **AR-83 — SKILL.md frontmatter constraints** (low · `agent-skills-discovery`)
  Verify: Parse each SKILL.md frontmatter: name matches `^[a-z0-9-]{1,64}$` and description length is ≤1024 characters.
- **AR-84 — Digest matches the artefact bytes** (low · `agent-skills-discovery`)
  Verify: `curl -s <skill-url> | shasum -a 256` and compare with the index digest — they must be equal.
- **AR-85 — Skills files served with open CORS** (low · `agent-skills-discovery`)
  Verify: `curl -sI https://example.com/.well-known/agent-skills/index.json | grep -i 'access-control-allow-origin'` returns `*` (same for a SKILL.md URL).
- **AR-86 — Skills index advertised via Link header** (low · `agent-skills-discovery`)
  Verify: `curl -sI https://example.com/ | grep -i 'rel="agent-skills"'` returns the advertisement.
- **AR-87 — _index._agents record in ServiceMode** (low · `dns-aid`)
  Verify: Run `dig +short HTTPS _index._agents.<domain>` — the answer begins with `1 <hostname>.` (priority ≥ 1, not AliasMode priority 0) and includes alpn/port.
- **AR-88 — DNS-AID records DNSSEC-signed** (low · `dns-aid`)
  Verify: Run `dig +dnssec +cd HTTPS _index._agents.<domain>` — an RRSIG record appears in the answer; `dig +short DS <domain>` returns at least one DS record.
- **AR-89 — Records on the canonical domain** (low · `dns-aid`)
  Verify: Run the dig queries against the site's registered apex domain (the one in the canonical URL), not `*.netlify.app`/`*.pages.dev`/`*.vercel.app`.
- **AR-90 — ai-catalog.json valid with specVersion and entries** (low · `agentic-resource-discovery`)
  Verify: Run the quoted command — jq parses the document and both fields are present.
- **AR-91 — Catalog entry URLs resolve to the declared media type** (low · `agentic-resource-discovery`)
  Verify: `curl -sI <entry-url>` for each entry — returns 200 and the Content-Type matches the declared mediaType (mcp-server-card+json, a2a-agent-card+json, agentskill+zip, ai-catalog+json).
- **AR-92 — Catalog advertised via Agentmap and Link rel** (low · `agentic-resource-discovery`)
  Verify: `curl -s https://example.com/robots.txt | grep -i '^agentmap:'` and `curl -sI https://example.com/ | grep -i 'rel="ai-catalog"'` both succeed.
- **AR-93 — Entries emit both mediaType and type** (low · `agentic-resource-discovery`)
  Verify: `curl -s /.well-known/ai-catalog.json | jq '.entries[] | {mediaType, type}'` — both keys present and equal on every entry.
- **AR-94 — NLWeb endpoint advertised** (low · `nlweb`)
  Verify: `curl -s https://example.com/ | grep 'rel="nlweb"'` and `curl -sI https://example.com/ | grep -i nlweb` both return the advertisement.
- **AR-95 — /ask returns JSON with cited sources** (low · `nlweb`)
  Verify: Run the quoted curl, confirm JSON (not HTML) with `answer` and `sources`, then spot-check that each source URL returns 200 and supports the answer.
- **AR-96 — Tool bundle not downloaded without the API** (low · `webmcp`)
  Verify: Load the page in a browser without the API and watch the network panel — no request for the tool bundle is made at all (not a request whose script returns early).
- **AR-97 — WebMCP tools honour site access controls** (medium · `webmcp`)
  Verify: Invoke an account-scoped tool's underlying endpoint unauthenticated (`curl -s -o /dev/null -w '%{http_code}' <endpoint>`) — it must fail exactly as the direct site action does.
- **AR-98 — Annotations honest, never explicitly false** (low · `webmcp`)
  Verify: In a supporting browser, inspect registered tools' annotations (`readOnlyHint`, `consequentialHint`, `untrustedContentHint`) — no hint is explicitly false and declared values match observed tool behaviour.
- **AR-99 — Every OKF concept has a non-empty type** (low · `okf-bundle`)
  Verify: Iterate the published bundle (or fetch `/okf.tar.gz` and extract), parse each concept's frontmatter, and confirm `type` is present and non-empty.
- **AR-100 — Only the root index.md carries front matter** (low · `okf-bundle`)
  Verify: Check each `index.md` for a `---` front-matter block (only the root has one, declaring `okf_version`), and confirm the declared version matches the fields the concepts emit (0.2 uses `generated.at`/`sources`, not `timestamp`/`# Citations`).
- **AR-101 — Bundle reachable from a discovery surface** (low · `okf-bundle`)
  Verify: Grep the ai-catalog entries, /llms.txt body, and homepage Link headers for the bundle URL — at least one contains it.
- **AR-102 — Per-resource .jsonld endpoint with CORS** (low · `schemamap`)
  Verify: Run the quoted curl on sample resource URLs and check status plus both headers.
- **AR-103 — schemamap index parses and lists live URLs** (low · `schemamap`)
  Verify: Run the quoted xmllint check, then `curl -s /schemamap.xml | grep -oE '<jsonld>[^<]+'` and fetch each listed URL — all return 200.
- **AR-104 — .jsonld graph identical to the embedded JSON-LD** (low · `schemamap`)
  Verify: `diff <(curl -s <page>.jsonld | jq -S .) <(curl -s <page> | extract-ldjson-script | jq -S .)` — no differences.
- **AR-105 — Schemamap discovery links in <head>** (low · `schemamap`)
  Verify: `curl -s <page> | grep -E 'rel="schemamap"|rel="alternate" type="application/ld\+json"'` returns both link tags.
- **AR-106 — Index lists only real schema.org types** (low · `schemamap`)
  Verify: Extract `<type>` values from the index and confirm each is a documented type on schema.org and appears in the referenced page's JSON-LD.
- **AR-107 — Unregistered rel stays out of the HTTP Link header** (low · `schemamap`)
  Verify: `curl -sI https://example.com/ | grep -i 'rel="schemamap"'` returns nothing while the homepage HTML does contain the link tag.
