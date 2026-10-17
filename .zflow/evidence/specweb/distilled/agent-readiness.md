# Distilled audit requirements — agent-readiness

Distilled from the agent-readiness section of specification.website (local evidence copies under `.zflow/evidence/specweb/agent-readiness/`). Each block states one checkable practice for a consumer-facing website, the exact source line it derives from, how a read-only auditor verifies it on the live site, and the severity of a failure. Page statuses from the spec front matter: `stable-urls` is **required**; `llms-txt`, `markdown-source-endpoints`, `robots-for-ai-crawlers`, `structured-data-for-agents`, `machine-readable-formats`, `link-headers`, `agent-skills-discovery`, and the overview are **recommended**; the rest are **optional/emerging** — severity reflects that weighting for public marketing, content, and self-service surfaces.

---

## agent-readiness-overview.md

### 1. Main content must be in the initial HTML
- **Requirement:** Key pages must deliver their main content in the initial HTML response, without requiring JavaScript execution.
- **Quote:** - Fetch a key page with `curl` and confirm the main content is in the initial HTML.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-readiness-overview.md`
- **Verify:** Pick a distinctive phrase visible only in the rendered main content, then `curl -s <page-url> | grep -F '<phrase>'` — the phrase must appear in the raw HTML; if it only appears after JS runs (check in a headless browser), the site fails.
- **Severity:** high

### 2. robots.txt must name AI crawlers explicitly
- **Requirement:** The site's robots.txt must state explicit allow/disallow rules for the AI crawlers it intends to allow or block.
- **Quote:** - Check `/robots.txt` lists the crawlers you intend to allow or block.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-readiness-overview.md`
- **Verify:** `curl -s https://example.com/robots.txt` and confirm named AI user-agents (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Google-Extended, Applebot-Extended, PerplexityBot, CCBot, Bytespider) appear with their own rules rather than only a `*` wildcard.
- **Severity:** medium

---

## llms-txt.md

### 3. /llms.txt served at the root
- **Requirement:** A site publishing llms.txt must serve it at the site root with a 200 and markdown content.
- **Quote:** - Fetch `https://example.com/llms.txt` and confirm a `200` with markdown content.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -sI https://example.com/llms.txt` returns 200 with `Content-Type: text/markdown` or `text/plain`, and `curl -s https://example.com/llms.txt` returns a markdown body.
- **Severity:** medium

### 4. /llms.txt advertised with rel="describedby"
- **Requirement:** /llms.txt must be advertised with the `rel="describedby"` relation via an HTTP Link header, an HTML `<link>` in the head, or both.
- **Quote:** - Confirm the relation is actually advertised: `curl -sI https://example.com/ | grep -i '^link:'` should show `rel="describedby"`, or the same relation should appear in the HTML head.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -sI https://example.com/ | grep -i '^link:'` shows `rel="describedby"`, or `curl -s https://example.com/ | grep 'rel="describedby"'` finds the `<link>` in `<head>`.
- **Severity:** medium

### 5. /llms.txt structure: H1 name plus blockquote summary
- **Requirement:** /llms.txt must start with a top-level `#` heading carrying the site name, followed by a `>` blockquote summary.
- **Quote:** Start with `# Site name` on the first line. Follow with a `> blockquote` summary.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -s https://example.com/llms.txt | head -5` — the first non-empty line starts with `# ` and the next starts with `> `.
- **Severity:** low

### 6. /llms.txt groups canonical links under ## sections
- **Requirement:** /llms.txt must group its markdown links under `##` headings, and the links must point at canonical pages.
- **Quote:** Use `##` headings to group links. Links should point to canonical pages.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** Inspect `curl -s https://example.com/llms.txt` for `##` sections; extract links with `grep -oE '\]\([^)]+\)'` and spot-check they resolve 200 and match the canonical (rel="canonical") URL of the target page.
- **Severity:** low

### 7. /llms.txt stays short
- **Requirement:** /llms.txt must remain a curated index kept under a few hundred lines, not an exhaustive sitemap.
- **Quote:** Keep it under a few hundred lines. If you want full content, see [/llms-full.txt](/spec/agent-readiness/llms-full-txt/).
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -s https://example.com/llms.txt | wc -l` — under roughly 300 lines.
- **Severity:** low

### 8. /llms.txt linked for humans
- **Requirement:** /llms.txt must be linked from the homepage or footer so humans can find it too.
- **Quote:** Link to it from your homepage or footer so humans can find it too.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -s https://example.com/ | grep -c 'llms.txt'` returns at least 1.
- **Severity:** low

### 9. /llms.txt points at markdown source, advertised with rel="alternate"
- **Requirement:** Where a site publishes markdown source, /llms.txt must point at it (page.md or page.html.md) and the pages must advertise the markdown with `rel="alternate"; type="text/markdown"`.
- **Quote:** Point at markdown source where you publish it. v2 accepts either URL shape — `page.md` or `page.html.md` — so use whichever your routing already produces, and advertise it with `rel="alternate"; type="text/markdown"`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** `curl -s https://example.com/llms.txt | grep -E '\.md'` lists markdown URLs, and `curl -s <page> | grep 'rel="alternate"' | grep 'text/markdown'` shows the per-page advertisement.
- **Severity:** low

### 10. /llms.txt links must not be stale
- **Requirement:** Every link in /llms.txt must resolve, because a stale llms.txt teaches models wrong things.
- **Quote:** - Letting it drift. A stale `llms.txt` is worse than none — it teaches models wrong things.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-txt.md`
- **Verify:** Extract every URL from /llms.txt and run `curl -s -o /dev/null -w '%{http_code}' <url>` on each — all must return 2xx or 3xx.
- **Severity:** medium

---

## llms-full-txt.md

### 11. /llms-full.txt kept to a usable size
- **Requirement:** If /llms-full.txt is published, it must stay small enough to be usable — anything over a couple of megabytes is suspect.
- **Quote:** - Fetch the file and check the size. Anything over a couple of megabytes is suspect.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
- **Verify:** `curl -s https://example.com/llms-full.txt | wc -c` — well under ~2,000,000 bytes.
- **Severity:** low

### 12. /llms-full.txt served as real markdown
- **Requirement:** /llms-full.txt must be served as text/markdown or text/plain, never HTML by accident.
- **Quote:** - Serve as `text/markdown` or `text/plain`. Set sensible cache headers — this file changes on every doc update.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
- **Verify:** `curl -sI https://example.com/llms-full.txt` shows a text content type, and `curl -s https://example.com/llms-full.txt | head -1` starts with `#`, not `<`.
- **Severity:** low

### 13. /llms-full.txt sections carry their source URL
- **Requirement:** Each section in /llms-full.txt must be separated by `---` under a clear `#` heading with the page URL nearby so agents can cite it.
- **Quote:** - Separate sections with `---` and clear `#` headings. Include the page URL near each heading so agents can cite it.
- **Source:** `.zflow/evidence/specweb/agent-readiness/llms-full-txt.md`
- **Verify:** Inspect the body: `grep -c '^---$'` matches section count and each heading block contains an absolute URL (`grep -A2 '^# '`).
- **Severity:** low

---

## markdown-source-endpoints.md

### 14. .md suffix returns markdown source
- **Requirement:** Every Markdown-sourced page must serve its raw markdown at the canonical URL with `.md` appended, returning 200 with `Content-Type: text/markdown`.
- **Quote:** - `curl -i https://example.com/docs/getting-started.md` returns `200` with `Content-Type: text/markdown; charset=utf-8`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** Run exactly `curl -sI https://example.com/docs/getting-started.md` on sample content pages and check status 200 plus the markdown content type.
- **Severity:** medium

### 15. Accept: text/markdown negotiation works
- **Requirement:** Sending `Accept: text/markdown` to the canonical HTML URL must return markdown with `Content-Location` and `Vary: Accept` headers.
- **Quote:** - `curl -i -H 'Accept: text/markdown' https://example.com/docs/getting-started/` returns Markdown with `Content-Location` and `Vary: Accept`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** Run the quoted curl and confirm the response body is markdown and the headers include `Content-Location` and `Vary: Accept`.
- **Severity:** medium

### 16. HTML response carries Vary: Accept
- **Requirement:** The default HTML response of a content-negotiated URL must also carry `Vary: Accept` so caches do not conflate the two representations.
- **Quote:** - The HTML response to the same URL also carries `Vary: Accept`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** `curl -sI https://example.com/docs/getting-started/` shows `Vary` containing `Accept`.
- **Severity:** medium

### 17. Markdown source advertised in <head>
- **Requirement:** The HTML version of each page must carry a `<link rel="alternate" type="text/markdown">` discovery link in `<head>`.
- **Quote:** - View source on any page — there is a `<link rel="alternate" type="text/markdown" …>` in `<head>`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** `curl -s <page-url> | grep 'rel="alternate"' | grep 'text/markdown'` returns the link tag.
- **Severity:** low

### 18. .md body matches the rendered HTML
- **Requirement:** The `.md` body must contain the same headings, paragraphs, and code blocks as the rendered HTML — fully rendered markdown with frontmatter at the top, not the source-of-source.
- **Quote:** - The `.md` body contains the same headings, paragraphs, and code blocks as the rendered HTML, with frontmatter at the top.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** Compare `curl -s <page>.md | grep '^#'` against the rendered page's headings, and grep the .md body for template artefacts (`grep -E '\{\{|_shortcode'` should find nothing).
- **Severity:** medium

### 19. .md and HTML share one access policy
- **Requirement:** The `.md` representation must not be behind authentication while the HTML is public — both representations must have the same access policy.
- **Quote:** - Putting the `.md` behind authentication while the HTML is public. The two representations must have the same access policy.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** `curl -s -o /dev/null -w '%{http_code}' <page>.md` returns 200 (or the same status as the HTML page), never 401/403 or a login redirect.
- **Severity:** medium

### 20. Markdown frontmatter carries page metadata
- **Requirement:** Markdown responses should include a YAML frontmatter block with `title`, canonical `url`, `updated`, `sources`, and `licence` (no internal build details).
- **Quote:** Include a YAML frontmatter block with the page's metadata so agents get structured context alongside the prose: `title`, `url` (the canonical HTML URL), `updated`, `sources`, `licence`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** `curl -s <page>.md | head -20` begins with `---` and the frontmatter contains at least `title` and `url`.
- **Severity:** low

### 21. X-Markdown-Tokens size hint
- **Requirement:** Markdown responses should carry an `X-Markdown-Tokens` header with a recomputed token-count estimate for the body.
- **Quote:** **Hint the size.** Add an `X-Markdown-Tokens` response header carrying a rough token-count estimate for the body (any reasonable tokeniser — `tiktoken`'s `cl100k_base` is a fine default). The header is not a registered standard, but a growing number of agent-friendly sites ship it because it lets a caller decide whether to inline the page into a prompt, summarise it first, or skip it for a smaller one — without downloading the body. Recompute it whenever the Markdown changes; do not invent the number.
- **Source:** `.zflow/evidence/specweb/agent-readiness/markdown-source-endpoints.md`
- **Verify:** `curl -sI <page>.md | grep -i 'x-markdown-tokens'`; when present, tokenise the body with tiktoken cl100k_base and confirm the value is the same order of magnitude (not invented).
- **Severity:** low

---

## robots-for-ai-crawlers.md

### 22. Explicit per-agent AI crawler rules
- **Requirement:** robots.txt must contain per-user-agent rules for named AI crawlers so allow/block decisions are precise and independent of search.
- **Quote:** A blanket `Disallow: /` blocks everyone, including search. Naming agents lets you make precise decisions: allow retrieval bots so your content can be cited live, block training bots if you do not want to feed model weights, or the reverse.
- **Source:** `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
- **Verify:** `curl -s https://example.com/robots.txt` contains at least one dedicated group for a named AI crawler (e.g. `User-agent: GPTBot`, `User-agent: ClaudeBot`, `User-agent: Google-Extended`) with an explicit Allow/Disallow.
- **Severity:** medium

### 23. No accidental blanket wildcard disallow
- **Requirement:** The `User-agent: *` group must not disallow the whole site unless total crawler invisibility (including Google) is intended.
- **Quote:** - Blocking `*` and forgetting that this also blocks Google.
- **Source:** `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
- **Verify:** Parse `curl -s https://example.com/robots.txt`: a `User-agent: *` group followed by `Disallow: /` is a failure unless the site is deliberately unlisted (confirm intent, e.g. a login-gated staging surface).
- **Severity:** high

### 24. Each public subdomain has its own robots.txt
- **Requirement:** Every public subdomain must serve its own robots.txt, because robots decisions are per-host.
- **Quote:** - Decisions are per-host. A subdomain needs its own robots.txt.
- **Source:** `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
- **Verify:** For each public subdomain (blog., docs., shop.), `curl -sI https://<subdomain>.example.com/robots.txt` returns 200.
- **Severity:** medium

### 25. OpenAI agents controlled individually
- **Requirement:** OpenAI policy must be expressed per agent — GPTBot, OAI-SearchBot, and ChatGPT-User are separate user-agents and blocking one does not block the others.
- **Quote:** - Blocking only `GPTBot` and assuming no OpenAI surface can see your site — `OAI-SearchBot` and `ChatGPT-User` are separate.
- **Source:** `.zflow/evidence/specweb/agent-readiness/robots-for-ai-crawlers.md`
- **Verify:** Inspect robots.txt groups: where any OpenAI user-agent appears, all three (GPTBot, OAI-SearchBot, ChatGPT-User) have explicit rules matching the intended policy.
- **Severity:** low

---

## content-signals.md

### 26. Content-Signal directive published
- **Requirement:** Sites adopting Content Signals must publish a `Content-Signal:` line in robots.txt declaring `search`, `ai-input`, and `ai-train` preferences (validators already check for it).
- **Quote:** Content-Signal: search=yes, ai-input=yes, ai-train=no
- **Source:** `.zflow/evidence/specweb/agent-readiness/content-signals.md`
- **Verify:** `curl -s https://example.com/robots.txt | grep -i 'content-signal'` returns a well-formed directive line.
- **Severity:** low

### 27. Directive spelled singular and placed in a group
- **Requirement:** The directive must be spelled `Content-Signal:` (singular, not `Content-Signals:`) and sit inside a group after a `User-agent:` line.
- **Quote:** - Spelling: `Content-Signal:` (singular). Not `Content-Signals:`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/content-signals.md`
- **Verify:** `curl -s /robots.txt | grep -i 'content-signals:'` must be empty, and the `Content-Signal:` line must appear after a `User-agent:` line within its group.
- **Severity:** low

### 28. Deployed key names used
- **Requirement:** The directive must use the deployed key names `ai-train` and `ai-input`, not the IETF draft labels `train-ai`/`ai-use`.
- **Quote:** - Writing the IETF draft's labels (`train-ai`, `ai-use`) in a `Content-Signal` directive. Nothing reads those; the deployed directive uses `ai-train` and `ai-input`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/content-signals.md`
- **Verify:** `curl -s /robots.txt | grep -i 'content-signal'` — keys are limited to `search`, `ai-input`, `ai-train`.
- **Severity:** low

### 29. Values limited to yes/no
- **Requirement:** Every Content-Signal value must be exactly `yes` or `no` — no invented values.
- **Quote:** - Inventing values beyond `yes` / `no`. The vocabulary is small on purpose.
- **Source:** `.zflow/evidence/specweb/agent-readiness/content-signals.md`
- **Verify:** Parse the directive line: every `<key>=<value>` pair matches `(search|ai-input|ai-train)=(yes|no)`.
- **Severity:** low

### 30. No contradiction with Disallow
- **Requirement:** A bot that is fully disallowed must not also carry a Content-Signal line, since the two contradict.
- **Quote:** - Conflicting with `Disallow:`. If you `Disallow: /` for a bot, that bot was never going to fetch the page to read your `Content-Signal:`. They contradict; pick one.
- **Source:** `.zflow/evidence/specweb/agent-readiness/content-signals.md`
- **Verify:** For each robots.txt group containing a Content-Signal line, confirm the same group has no full `Disallow: /`.
- **Severity:** low

---

## tdmrep.md

### 31. TDM reservation declared machine-readably
- **Requirement:** The site must declare its text-and-data-mining reservation in machine-readable form — `tdm-reservation` HTTP header, `<meta>` element, or `/.well-known/tdmrep.json`.
- **Quote:** > Declare in machine-readable form whether you reserve the right to object to text and data mining, using the `tdm-reservation` HTTP header, a `<meta>` element, or `/.well-known/tdmrep.json`. Its force is legal, not technical.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** `curl -sI https://example.com/ | grep -i tdm-`, or `curl -s https://example.com/ | grep 'tdm-reservation'`, or `curl -s https://example.com/.well-known/tdmrep.json` — at least one is present.
- **Severity:** low

### 32. Reservation value must be integer 1 or 0
- **Requirement:** The tdm-reservation value must be exactly the integer `1` or `0`, because any other value reads as unset (i.e. no reservation).
- **Quote:** - Using `true`, `yes`, or `reserved` as the value. Only the integers `1` and `0` are valid; anything else means agents treat the field as unset, so a malformed reservation is the same as no reservation.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** Inspect the header/meta/JSON value — it must match exactly `1` or `0` (no `true`, `yes`, `reserved`).
- **Severity:** medium

### 33. Header form covers non-HTML assets
- **Requirement:** When the HTTP header form is used, it must be present on non-HTML assets (images, PDFs, JSON) too, not only HTML pages.
- **Quote:** - Fetch a non-HTML asset — an image, a PDF — and confirm the header is present there too. That is the coverage the `<meta>` form cannot give you.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** `curl -sI <site-image-or-pdf-url> | grep -i tdm-` returns the header.
- **Severity:** low

### 34. tdm-policy accompanies a reservation of 1
- **Requirement:** Whenever `tdm-reservation: 1` is set, a `tdm-policy` URL pointing at the licensing policy must be set alongside it.
- **Quote:** **Set `tdm-policy` whenever you set `tdm-reservation: 1`.** A bare reservation tells a would-be licensee that the answer is no, without telling them who to ask.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** Wherever tdm-reservation is 1, a `tdm-policy` URL is present and `curl -s -o /dev/null -w '%{http_code}' <policy-url>` returns 2xx.
- **Severity:** low

### 35. TDMRep consistent with other AI signals
- **Requirement:** The tdm-reservation value must be consistent with the site's licence and Content-Signal declarations (no `tdm-reservation: 1` beside `Content-Signal: ai-train=yes`).
- **Quote:** **Keep it consistent with everything else you publish.** A `tdm-reservation: 1` next to a permissive content licence, or next to `Content-Signal: ai-train=yes`, is a contradiction someone will eventually have to resolve — probably not in your favour.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** Compare the tdm-reservation value with the robots.txt Content-Signal ai-train value and any published content licence — they must not contradict.
- **Severity:** low

### 36. tdmrep.json is a valid array
- **Requirement:** If `/.well-known/tdmrep.json` is published, it must parse as a JSON array whose every entry has a `location` and an integer `tdm-reservation`.
- **Quote:** - If you publish `/.well-known/tdmrep.json`, confirm it parses as a JSON array and that every entry has a `location` and an integer `tdm-reservation`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/tdmrep.md`
- **Verify:** `curl -s https://example.com/.well-known/tdmrep.json | jq .` — output is an array; every entry has `location` and integer `tdm-reservation`.
- **Severity:** low

---

## web-bot-auth.md

### 37. Unsigned traffic must not be blocked by default
- **Requirement:** The site must not block unsigned (non-signing) traffic by default, or legitimate non-signing clients including most browsers get locked out.
- **Quote:** - Blocking unsigned traffic as a default. The standard is opt-in for bots; legitimate non-signing clients (including most browsers) will be locked out.
- **Source:** `.zflow/evidence/specweb/agent-readiness/web-bot-auth.md`
- **Verify:** `curl -s -o /dev/null -w '%{http_code}' -A 'Mozilla/5.0 (Macintosh)' https://example.com/` and a plain `curl -sI https://example.com/` both return 2xx/3xx without a bot-verification wall or 403.
- **Severity:** medium

---

## auth-md.md

### 38. /auth.md readable without credentials
- **Requirement:** If auth.md is published, it must be served as public markdown over HTTPS at `/auth.md` without a login wall.
- **Quote:** Serve public Markdown over HTTPS at `/auth.md`, without a login wall. Link to it from integration documentation and the protocol's `agent_auth.skill` metadata field.
- **Source:** `.zflow/evidence/specweb/agent-readiness/auth-md.md`
- **Verify:** `curl -s https://example.com/auth.md` returns 200 with a markdown body, not a 30x to a login page.
- **Severity:** low

### 39. auth.md endpoints match live metadata
- **Requirement:** Every endpoint and scope documented in auth.md must match the service's live OAuth metadata.
- **Quote:** Fetch `/auth.md` without credentials and confirm it returns readable Markdown rather than a login page. Compare every documented endpoint and scope with live metadata.
- **Source:** `.zflow/evidence/specweb/agent-readiness/auth-md.md`
- **Verify:** Extract documented endpoints from auth.md and diff them against `curl -s https://example.com/.well-known/oauth-authorization-server | jq .` (and the protected-resource metadata).
- **Severity:** low

---

## stable-urls.md

### 40. No implementation details in URLs
- **Requirement:** Public URLs must avoid implementation details such as `/wp-content/`, `/index.php`, `.aspx`, or `?id=42`.
- **Quote:** - **Avoid implementation details.** No `/wp-content/`, `/index.php`, `.aspx`, or `?id=42`. These leak the stack and break when you switch it.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** Extract URLs from the sitemap and homepage links, then `grep -E '\.php|\.aspx|\?id=|/wp-content/'` — no matches.
- **Severity:** medium

### 41. Kebab-case slugs with one trailing-slash style
- **Requirement:** Slugs must be lowercase kebab-case, and the site must enforce one trailing-slash style rather than mixing both.
- **Quote:** - **Use kebab-case slugs.** Lowercase, hyphens between words, no trailing slashes mixed with non-trailing slashes — pick one and enforce it.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** Inspect sitemap URLs for lowercase-hyphen patterns and confirm trailing-slash presence is uniform across all listed URLs.
- **Severity:** medium

### 42. One canonical host over HTTPS
- **Requirement:** The site must pick one canonical host (www or apex, HTTPS only, one path style) and redirect the other variants to it.
- **Quote:** - **Pick a canonical host.** `www.` or no-`www.`, HTTPS only, one path style. Redirect the rest.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** `curl -sI http://example.com/`, `curl -sI https://www.example.com/` (and the apex counterpart) each return 301/308 to the canonical HTTPS host; plain HTTP never returns 200 directly.
- **Severity:** high

### 43. Moved URLs redirect permanently
- **Requirement:** When a URL changes, the old URL must issue a 301 Moved Permanently (or 308) to the new location and keep it working.
- **Quote:** - Issue a `301 Moved Permanently` (or `308` to preserve the method) from the old URL to the new one.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** For known old URLs (from prior sitemaps or the Wayback Machine), `curl -sI <old-url>` returns 301/308 with a Location that resolves 200.
- **Severity:** high

### 44. No redirect chains
- **Requirement:** Redirects must go directly from the old URL to its final target, not through intermediate hops.
- **Quote:** - Avoid chains: redirect `A` directly to `C`, not `A` to `B` to `C`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** `curl -sIL -o /dev/null -w '%{num_redirects}\n' <url>` on moved/host-variant URLs — at most 1 hop after the initial request.
- **Severity:** medium

### 45. No mass redirect to the homepage
- **Requirement:** Retired URLs must never be redirected to the homepage — that is worse than a 404 because it tells crawlers the page still exists.
- **Quote:** - Never redirect everything to the homepage. That is worse than a 404 — it tells crawlers the page intentionally still exists.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** Request retired URLs (from old sitemaps or inbound-link reports): the Location header must not be `/` or the homepage; expect 404/410 instead.
- **Severity:** high

### 46. Deleted content returns 410
- **Requirement:** Permanently deleted pages must return a clean `410 Gone` rather than a soft 404 or a homepage redirect.
- **Quote:** For deletions, a clean `410 Gone` is more honest than a soft 404 or a homepage redirect.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** Spot-check known-removed URLs: `curl -s -o /dev/null -w '%{http_code}' <removed-url>` returns 410 (or an honest 404), not a 200 homepage or a redirect to it.
- **Severity:** medium

### 47. Canonical URLs free of session/tracking parameters
- **Requirement:** Canonical URLs (and sitemap URLs) must not embed session IDs, tracking parameters, or A/B variants.
- **Quote:** - Adding session IDs, tracking parameters, or A/B variants to canonical URLs.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** `curl -s <page> | grep 'rel="canonical"'` — the canonical URL contains no `utm_`, session, or variant query parameters; same check on sitemap URLs.
- **Severity:** medium

### 48. Trailing-slash variants must not serve different content
- **Requirement:** The trailing-slash and non-trailing-slash forms of a path must serve the same content (one redirecting to the other), never different payloads.
- **Quote:** - Letting trailing slashes serve different content from non-trailing slashes.
- **Source:** `.zflow/evidence/specweb/agent-readiness/stable-urls.md`
- **Verify:** `diff <(curl -s https://example.com/page) <(curl -s https://example.com/page/)` — identical bodies, or one form 301-redirects to the other.
- **Severity:** medium

---

## structured-data-for-agents.md

### 49. JSON-LD embedded in the page
- **Requirement:** Pages must embed a `<script type="application/ld+json">` block with schema.org vocabulary inside `<head>`.
- **Quote:** Structured data is a machine-readable description of what a page is about, embedded in the page itself. The dominant vocabulary is [schema.org](https://schema.org/), and the recommended syntax is JSON-LD: a `<script type="application/ld+json">` block inside `<head>`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** `curl -s <page-url> | grep -c 'application/ld+json'` returns at least 1 and the block contains `"@context": "https://schema.org"`.
- **Severity:** medium

### 50. JSON-LD present before JavaScript executes
- **Requirement:** The JSON-LD must be present in the initial HTML before JavaScript executes, so non-rendering crawlers can read it.
- **Quote:** - Fetch the HTML and confirm the JSON-LD is present before JavaScript executes.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** `curl -s <page-url> | grep 'application/ld+json'` finds the markup in the raw, un-JS'd response.
- **Severity:** high

### 51. Markup mirrors visible content
- **Requirement:** Structured data must mirror what is visible on the page — schema for content that does not appear violates Google's guidelines.
- **Quote:** - Mirror what is visible on the page. Schema for content that does not appear violates Google's guidelines and trains agents to mistrust your markup.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** Extract headline, author, and offer/price fields from the JSON-LD (`curl -s <page> | grep -A20 'application/ld+json'`) and confirm each appears in the rendered page a browser shows.
- **Severity:** high

### 52. Specific schema.org types per page kind
- **Requirement:** Pages must use a specific `@type` matching the page kind (Article, Product, FAQPage, LocalBusiness, ...) instead of generic `WebPage` everywhere.
- **Quote:** - Using `@type: "WebPage"` for everything. Pick a specific type.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** `curl -s <page> | grep '"@type"'` — the primary type is specific to the page kind, not `WebPage`.
- **Severity:** low

### 53. Stable @id URIs reused across pages
- **Requirement:** Entity nodes (Organization, Person) must reuse stable `@id` URIs so agents can link entities across pages.
- **Quote:** - Reuse `@id` URIs so agents can link entities across pages.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** Extract `"@id"` values for the organization/author node from several pages (`curl -s <page1> <page2> | grep '"@id"'`) — the same entity carries the same @id everywhere.
- **Severity:** low

### 54. No inflated ratings
- **Requirement:** AggregateRating and Review markup must reflect real, visible reviews — never inflated or fabricated values.
- **Quote:** - Inflating `AggregateRating` with fake reviews. Both search engines and agents penalise this when caught.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** Compare the ratingValue/reviewCount in the JSON-LD with the reviews actually visible on the page; counts or stars that cannot be seen on-page fail.
- **Severity:** high

### 55. Markup metadata stays current
- **Requirement:** `datePublished` and `author` in the markup must match the visible page and not be stale after migrations.
- **Quote:** - Leaving stale `datePublished` or `author` after a CMS migration.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** Compare JSON-LD datePublished/author with the visible byline and date on the same page — they must agree.
- **Severity:** medium

### 56. Markup validates
- **Requirement:** Page markup must pass the Schema Markup Validator and Google's Rich Results Test.
- **Quote:** - Run the page through [validator.schema.org](https://validator.schema.org/) and Google's Rich Results Test.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** Submit key page URLs to validator.schema.org — zero errors for the embedded JSON-LD.
- **Severity:** medium

### 57. JSON-LD preferred over Microdata/RDFa
- **Requirement:** Structured data must be emitted as JSON-LD rather than Microdata or RDFa.
- **Quote:** - Use JSON-LD over Microdata or RDFa. Easier to write, easier to keep in sync.
- **Source:** `.zflow/evidence/specweb/agent-readiness/structured-data-for-agents.md`
- **Verify:** `curl -s <page> | grep -c 'itemscope='` returns 0 (or microdata is clearly supplementary) while a JSON-LD block is present.
- **Severity:** low

---

## machine-readable-formats.md

### 58. XML sitemap published
- **Requirement:** Every site must publish an XML sitemap.
- **Quote:** - **Sitemap.** Every site should have one — see [XML sitemaps](/spec/seo/xml-sitemaps/).
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** `curl -sI https://example.com/sitemap.xml` (or the sitemap index referenced by the robots.txt `Sitemap:` line) returns 200 with XML content.
- **Severity:** medium

### 59. RSS/Atom feed at a discoverable URL
- **Requirement:** Content sites must publish an RSS 2.0 or Atom feed at a predictable URL such as `/feed`, `/feed.xml`, or `/rss.xml`.
- **Quote:** - **A feed.** Publish RSS 2.0 or Atom at a discoverable URL such as `/feed`, `/feed.xml`, or `/rss.xml`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** `curl -sI https://example.com/feed.xml` (trying /feed and /rss.xml as fallbacks) returns 200 with an RSS/Atom XML body.
- **Severity:** medium

### 60. Feeds linked from <head>
- **Requirement:** Feeds must be linked from the HTML `<head>` with `<link rel="alternate">` elements.
- **Quote:**   <link rel="alternate" type="application/rss+xml" title="Blog" href="/feed.xml">
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** `curl -s <page> | grep 'rel="alternate"' | grep -E 'rss|atom|json'` returns the feed link(s).
- **Severity:** low

### 61. Feed items carry full content
- **Requirement:** Feed items must include the full content, not a one-line teaser, so agents can quote fairly.
- **Quote:** - Truncating feed items to a one-line teaser. If you want agents to quote you fairly, give them the full content.
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** `curl -s /feed.xml` item descriptions/content:encoded contain full paragraphs matching the article body, not truncated teasers.
- **Severity:** medium

### 62. Absolute URLs in feed items
- **Requirement:** Feed item URLs must be absolute everywhere, never mixed with relative URLs.
- **Quote:** - Mixing absolute and relative URLs inside feed items. Use absolute everywhere.
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** Parse the feed and check every `<link>`, `<guid>`, and inline href starts with `https://` (or `http://`).
- **Severity:** low

### 63. Feed timestamps update with content
- **Requirement:** `pubDate`/`date_published` must update when content changes so readers (and agents) see freshness.
- **Quote:** - Forgetting to update `pubDate` or `date_published`, so readers think nothing has changed.
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** Compare the newest feed item's timestamp against the most recently published/updated page date — they must match.
- **Severity:** low

### 64. Feeds validate
- **Requirement:** The RSS/Atom feed must pass the W3C feed validator (and JSON Feed must match its spec).
- **Quote:** - Validate RSS at [validator.w3.org/feed](https://validator.w3.org/feed/).
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** Submit the feed URL at validator.w3.org/feed — no validation errors.
- **Severity:** medium

### 65. Vary: Accept on every negotiated representation
- **Requirement:** Any Accept-based content negotiation must set `Vary: Accept` on every representation, or caches pin the wrong one for subsequent visitors.
- **Quote:** **Content negotiation.** Powerful, but easy to misuse. Always set `Vary: Accept` on every representation, otherwise caches will pin the wrong one for every subsequent visitor. When the formats are very different (HTML vs JSON), distinct URLs are usually simpler.
- **Source:** `.zflow/evidence/specweb/agent-readiness/machine-readable-formats.md`
- **Verify:** `curl -sI` each representation of a negotiated URL — both responses carry `Vary` containing `Accept`.
- **Severity:** medium

---

## link-headers.md

### 66. Link header on the homepage advertising resources
- **Requirement:** The homepage (ideally every response) must carry HTTP Link headers advertising the site's machine-readable resources (llms.txt, sitemap, RSS, api-catalog).
- **Quote:** > Use the HTTP Link header to advertise machine-readable resources — llms.txt, sitemap, api-catalog, RSS — directly in the response. Agents that never parse your HTML can still find what they need.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** `curl -sI https://example.com/ | grep -i '^link'` lists at least one advertised relation (agent-readiness validators check exactly this).
- **Severity:** medium

### 67. Only IANA-registered relation types
- **Requirement:** Link `rel` values must be IANA-registered relation types (describedby, alternate, sitemap, api-catalog, security, license, ...), never invented custom ones.
- **Quote:** - Inventing a custom `rel`. Crawlers ignore it. Use IANA-registered relations only.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** Extract every `rel=` value from the Link header and check each against the IANA Link Relations Registry (iana.org/assignments/link-relations/).
- **Severity:** low

### 68. Link header syntax: angle brackets, comma separation
- **Requirement:** Link header URLs must sit inside `<>` angle brackets (not quotes) and multiple links in one header must be comma-separated.
- **Quote:** - Wrapping URLs in quotes. Per RFC 8288, the URI goes inside `<>` angle brackets, not quotes.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** Inspect the raw Link header: targets match `"<...>"` and multiple entries are separated by commas; an RFC 8288 parse-and-render tool reports no syntax errors.
- **Severity:** low

### 69. Link headers on non-HTML responses too
- **Requirement:** Link headers must also be sent on non-HTML responses (JSON endpoints, PDFs), not only HTML pages.
- **Quote:** - Sending `Link` only on HTML responses. Defeats the "HTML-free" point — agents looking at your `/api/users.json` get nothing.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** `curl -sI <json-or-asset-url> | grep -i '^link'` returns the header for public non-HTML endpoints.
- **Severity:** low

### 70. Link headers consistent with HTML <head>
- **Requirement:** HTTP Link headers must not contradict the HTML `<link rel>` entries — both describe the same site.
- **Quote:** - Sending `Link` headers that contradict the HTML `<link rel>` entries. The headers and the HTML should be consistent — they describe the same site.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** Cross-check every rel in the homepage head against the Link header: same relations point at the same targets.
- **Severity:** low

### 71. Link entries self-describing with type and title
- **Requirement:** Link header entries should include `type` (and `title`) parameters so they are self-describing without an extra fetch.
- **Quote:** **Include `type` and `title`.** They are optional in the header but make the link self-describing without an extra fetch.
- **Source:** `.zflow/evidence/specweb/agent-readiness/link-headers.md`
- **Verify:** `curl -sI https://example.com/ | grep -i '^link'` — entries carry `type="..."` (and ideally `title="..."`).
- **Severity:** low

---

## mcp-and-tool-discovery.md

### 72. MCP server card published and linked
- **Requirement:** A site exposing an MCP server must publish `/.well-known/mcp/server-card.json` describing name, version, transport, endpoint URL, capabilities, tools, and prompts, and advertise it with a `Link: rel="mcp"` header.
- **Quote:** - **Publish a server card.** Ship `/.well-known/mcp/server-card.json` describing the server's name, version, transport, endpoint URL, capabilities, tools, and prompts. Add a `Link: </.well-known/mcp/server-card.json>; rel="mcp"` header on your main site so the card is discoverable without guessing the path — see [HTTP Link headers](/spec/agent-readiness/link-headers/) and [`/.well-known/api-catalog`](/spec/well-known/api-catalog/).
- **Source:** `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
- **Verify:** `curl -sI https://example.com/.well-known/mcp/server-card.json` returns 200 JSON, and `curl -sI https://example.com/ | grep -i 'rel="mcp"'` shows the advertisement.
- **Severity:** low

### 73. Tool annotations must be truthful
- **Requirement:** MCP tool annotations must truthfully declare side effects — a write tool marked `readOnlyHint: true` is worse than omitting the hint.
- **Quote:** - Annotations that lie. Marking a write tool `readOnlyHint: true` is worse than omitting the hint — clients trust it and skip the confirmation a destructive call deserves.
- **Source:** `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
- **Verify:** With the MCP Inspector, run tools/list and compare each tool's annotations (readOnlyHint, destructiveHint, openWorldHint) against the observed effect of a call.
- **Severity:** medium

### 74. OAuth 2.1 for user-data tools, no long-lived keys
- **Requirement:** Any MCP tool that touches user data must use OAuth 2.1, and long-lived API keys must never be accepted in tool calls.
- **Quote:** - Use OAuth 2.1 (the MCP spec aligns with it) for any tool that touches user data. Never accept long-lived API keys in tool calls.
- **Source:** `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
- **Verify:** Inspect the server card and tool input schemas (MCP Inspector tools/list): user-data tools reference an OAuth flow, and no tool input schema contains a static api-key parameter.
- **Severity:** medium

### 75. Tools declare outputSchema and return structured content
- **Requirement:** MCP tools should declare an `outputSchema` and return a matching `structuredContent` object alongside human-readable text.
- **Quote:** - **Return structured output, not just prose.** Since the 2025-06-18 revision a tool can declare an `outputSchema` and return a matching `structuredContent` object next to the human-readable text.
- **Source:** `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
- **Verify:** MCP Inspector tools/list shows `outputSchema` on tools, and a sample call returns a `structuredContent` object.
- **Severity:** low

### 76. No deprecated capabilities advertised
- **Requirement:** A newly written MCP server must not advertise capabilities the current revision deprecates (Roots, Sampling, Logging, Dynamic Client Registration).
- **Quote:** Watch the [deprecated features registry](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) for the things the protocol *has* scheduled for removal — Roots, Sampling, Logging and Dynamic Client Registration are all Deprecated as of 2026-07-28.
- **Source:** `.zflow/evidence/specweb/agent-readiness/mcp-and-tool-discovery.md`
- **Verify:** Inspect the server card / server/discover response: the deprecated capabilities are absent from the advertised capability set.
- **Severity:** low

---

## a2a-agent-cards.md

### 77. agent-card.json served as JSON
- **Requirement:** A site exposing A2A must serve `/.well-known/agent-card.json` with 200 and `Content-Type: application/json`, parseable as JSON.
- **Quote:** - `curl https://your-site.example/.well-known/agent-card.json` returns 200 with `Content-Type: application/json` and parses as JSON.
- **Source:** `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
- **Verify:** Run the quoted curl and pipe the body through `jq .` — both succeed.
- **Severity:** low

### 78. Card points only at live endpoints
- **Requirement:** An agent card must never point at a URL that 404s — validators check the card URI and runtime agents check the endpoint.
- **Quote:** - Publishing a card that points at a URL that 404s. Discovery validators check the URI; runtime agents check the endpoint. Both matter.
- **Source:** `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
- **Verify:** `curl -s -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage","params":{}}' <supportedInterfaces[0].url>` returns a JSON-RPC response, not 404 or an HTML error page.
- **Severity:** medium

### 79. Card capabilities are honest
- **Requirement:** The card's capabilities must reflect what is actually implemented (e.g. `capabilities.streaming` false when streaming is unsupported).
- **Quote:** - **Be honest about capabilities.** If you do not support streaming, set `capabilities.streaming` to `false`. The same goes for `pushNotifications` and `extendedAgentCard`. Lying here breaks clients that probe before they call.
- **Source:** `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
- **Verify:** Where the card declares `streaming: true`, a `SendStreamingMessage` JSON-RPC call must succeed; unimplemented capabilities must be false.
- **Severity:** low

### 80. Canonical card filename
- **Requirement:** The card must live at the canonical filename `agent-card.json`, not `agent.json` or an invented redirect.
- **Quote:** - Mixing up `agent-card.json` with `agent.json`. The canonical filename is `agent-card.json` — pick it, do not invent a redirect.
- **Source:** `.zflow/evidence/specweb/agent-readiness/a2a-agent-cards.md`
- **Verify:** `curl -sI https://example.com/.well-known/agent-card.json` returns 200 directly (not a redirect from an `agent.json` path).
- **Severity:** low

---

## agent-skills-discovery.md

### 81. Skills index published with v0.2.0 $schema
- **Requirement:** Sites publishing agent skills must serve `/.well-known/agent-skills/index.json` with `$schema` set to the 0.2.0 discovery URI and a `skills` array whose entries have `name`, `type`, `description`, `url`, and `digest`.
- **Quote:** - Publish `/.well-known/agent-skills/index.json` with `$schema` set to `https://schemas.agentskills.io/discovery/0.2.0/schema.json` and a `skills` array. Each entry needs `name`, `type`, `description`, `url`, and `digest`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** `curl -s https://example.com/.well-known/agent-skills/index.json | jq '.$schema, (.skills | length)'` — schema matches the v0.2.0 URI and skills is non-empty with all five fields per entry.
- **Severity:** low

### 82. Skills hosted as text/markdown
- **Requirement:** Each skill must be hosted at `/.well-known/agent-skills/<name>/SKILL.md` and served as `text/markdown`.
- **Quote:** - Host each skill at `/.well-known/agent-skills/<name>/SKILL.md`. Serve as `text/markdown`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** For each index entry, `curl -sI <skill-url>` returns 200 with `Content-Type: text/markdown`.
- **Severity:** low

### 83. SKILL.md frontmatter constraints
- **Requirement:** Each SKILL.md must start with YAML frontmatter containing `name` (lowercase, hyphens, 1–64 chars) and `description` (≤1024 chars).
- **Quote:** - Author one or more `SKILL.md` files. Each MUST start with YAML frontmatter containing `name` (lowercase, hyphens, 1–64 chars) and `description` (≤1024 chars, written so an agent can decide whether to load the full body).
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** Parse each SKILL.md frontmatter: name matches `^[a-z0-9-]{1,64}$` and description length is ≤1024 characters.
- **Severity:** low

### 84. Digest matches the artefact bytes
- **Requirement:** Each index `digest` must be `sha256:<hex>` over the current raw bytes of the artefact, recomputed on every change.
- **Quote:** - Compute the digest as `sha256:<hex>` over the raw bytes of the artefact. Recompute and update the index every time the artefact changes.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** `curl -s <skill-url> | shasum -a 256` and compare with the index digest — they must be equal.
- **Severity:** low

### 85. Skills files served with open CORS
- **Requirement:** The index and skill files must be served with `Access-Control-Allow-Origin: *` so browser-based agents can fetch them.
- **Quote:** - Serve both files with CORS open (`Access-Control-Allow-Origin: *`) so browser-based agents can fetch them.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** `curl -sI https://example.com/.well-known/agent-skills/index.json | grep -i 'access-control-allow-origin'` returns `*` (same for a SKILL.md URL).
- **Severity:** low

### 86. Skills index advertised via Link header
- **Requirement:** The skills index must be advertised as a Link header with `rel="agent-skills"; type="application/json"` (and in the api-catalog).
- **Quote:** - Advertise the index in [`/.well-known/api-catalog`](/spec/well-known/api-catalog/) and as a [`Link`](/spec/agent-readiness/link-headers/) header: `rel="agent-skills"; type="application/json"`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agent-skills-discovery.md`
- **Verify:** `curl -sI https://example.com/ | grep -i 'rel="agent-skills"'` returns the advertisement.
- **Severity:** low

---

## dns-aid.md

### 87. _index._agents record in ServiceMode
- **Requirement:** The site must publish an `_index._agents.<domain>` HTTPS/SVCB record in ServiceMode carrying `alpn` and `port` parameters.
- **Quote:** - `dig +short HTTPS _index._agents.example.com` returns a record beginning with `1 example.com.`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
- **Verify:** Run `dig +short HTTPS _index._agents.<domain>` — the answer begins with `1 <hostname>.` (priority ≥ 1, not AliasMode priority 0) and includes alpn/port.
- **Severity:** low

### 88. DNS-AID records DNSSEC-signed
- **Requirement:** The zone serving `_agents` discovery records must be DNSSEC-signed so the answer is authenticated.
- **Quote:** - `dig +dnssec +cd HTTPS _index._agents.example.com` returns an `RRSIG` line — confirming DNSSEC is signing the answer.
- **Source:** `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
- **Verify:** Run `dig +dnssec +cd HTTPS _index._agents.<domain>` — an RRSIG record appears in the answer; `dig +short DS <domain>` returns at least one DS record.
- **Severity:** low

### 89. Records on the canonical domain
- **Requirement:** DNS-AID records must be published on the site's canonical registered domain, not a platform vendor subdomain.
- **Quote:** **Advertise on the canonical domain, not the platform's vendor subdomain.** Records on `your-site.netlify.app` or `your-project.pages.dev` don't help agents that already know your real domain.
- **Source:** `.zflow/evidence/specweb/agent-readiness/dns-aid.md`
- **Verify:** Run the dig queries against the site's registered apex domain (the one in the canonical URL), not `*.netlify.app`/`*.pages.dev`/`*.vercel.app`.
- **Severity:** low

---

## agentic-resource-discovery.md

### 90. ai-catalog.json valid with specVersion and entries
- **Requirement:** A site publishing ARD must serve `/.well-known/ai-catalog.json` as valid JSON containing `specVersion` and `entries`.
- **Quote:** - `curl -s https://example.com/.well-known/ai-catalog.json | jq .` returns valid JSON with `specVersion` and `entries`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
- **Verify:** Run the quoted command — jq parses the document and both fields are present.
- **Severity:** low

### 91. Catalog entry URLs resolve to the declared media type
- **Requirement:** Every catalog entry `url` must resolve to a live document of its declared `mediaType`, and the catalogue must list only capabilities that actually resolve.
- **Quote:** - Each entry `url` resolves to a document of the declared `mediaType`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
- **Verify:** `curl -sI <entry-url>` for each entry — returns 200 and the Content-Type matches the declared mediaType (mcp-server-card+json, a2a-agent-card+json, agentskill+zip, ai-catalog+json).
- **Severity:** low

### 92. Catalog advertised via Agentmap and Link rel
- **Requirement:** The catalogue must be advertised with an `Agentmap:` directive in robots.txt and an `ai-catalog` Link rel on the homepage response.
- **Quote:** - The `Agentmap:` line is present in `robots.txt` and the `ai-catalog` `Link` rel is on the homepage response.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
- **Verify:** `curl -s https://example.com/robots.txt | grep -i '^agentmap:'` and `curl -sI https://example.com/ | grep -i 'rel="ai-catalog"'` both succeed.
- **Severity:** low

### 93. Entries emit both mediaType and type
- **Requirement:** Each catalog entry should carry both field names (`mediaType` and `type`) with the same value, plus `representativeQueries`, to validate under either spec.
- **Quote:** The two diverged, so the safe move is to emit **both** field names with the same value plus `representativeQueries` — that validates under either spec, since both require consumers to preserve unknown keys.
- **Source:** `.zflow/evidence/specweb/agent-readiness/agentic-resource-discovery.md`
- **Verify:** `curl -s /.well-known/ai-catalog.json | jq '.entries[] | {mediaType, type}'` — both keys present and equal on every entry.
- **Severity:** low

---

## nlweb.md

### 94. NLWeb endpoint advertised
- **Requirement:** A site exposing an NLWeb `/ask` endpoint must advertise it with `<link rel="nlweb" href="/ask">` in `<head>` and a matching `Link: </ask>; rel="nlweb"` HTTP header.
- **Quote:** - **Advertise it.** Add `<link rel="nlweb" href="/ask">` to `<head>` and a matching `Link: </ask>; rel="nlweb"` HTTP header.
- **Source:** `.zflow/evidence/specweb/agent-readiness/nlweb.md`
- **Verify:** `curl -s https://example.com/ | grep 'rel="nlweb"'` and `curl -sI https://example.com/ | grep -i nlweb` both return the advertisement.
- **Severity:** low

### 95. /ask returns JSON with cited sources
- **Requirement:** The NLWeb endpoint must return a JSON body with an `answer` field and a `sources` array of URLs into the site's own pages, and the cited URLs must exist.
- **Quote:** - `curl 'https://example.com/ask?query=what+do+you+do'` returns a JSON body with an `answer` field and a `sources` array of URLs into your own site.
- **Source:** `.zflow/evidence/specweb/agent-readiness/nlweb.md`
- **Verify:** Run the quoted curl, confirm JSON (not HTML) with `answer` and `sources`, then spot-check that each source URL returns 200 and supports the answer.
- **Severity:** low

---

## webmcp.md

### 96. Tool bundle not downloaded without the API
- **Requirement:** The WebMCP tool bundle must not be downloaded on browsers that lack `modelContext` — feature-detect before loading, not inside the bundle.
- **Quote:** - **Feature-detect before you download, not just before you register.** The obvious shape — ship the tool bundle on every page, check `modelContext` at the top, return early when it is missing — puts the check inside the thing it is meant to guard. Every visitor pays for a script that today almost none of them can use. Put the detection in a few inline bytes and inject the bundle only when the API is present. If it is absent, do nothing — never throw.
- **Source:** `.zflow/evidence/specweb/agent-readiness/webmcp.md`
- **Verify:** Load the page in a browser without the API and watch the network panel — no request for the tool bundle is made at all (not a request whose script returns early).
- **Severity:** low

### 97. WebMCP tools honour site access controls
- **Requirement:** WebMCP tools must apply the same server-side authorisation checks as the site's own JavaScript-callable actions, never bypassing access controls.
- **Quote:** - Registering tools that bypass the site's own access controls. A WebMCP tool runs as the logged-in user; treat it like any other JavaScript-callable action and apply the same authorisation checks server-side.
- **Source:** `.zflow/evidence/specweb/agent-readiness/webmcp.md`
- **Verify:** Invoke an account-scoped tool's underlying endpoint unauthenticated (`curl -s -o /dev/null -w '%{http_code}' <endpoint>`) — it must fail exactly as the direct site action does.
- **Severity:** medium

### 98. Annotations honest, never explicitly false
- **Requirement:** WebMCP annotation hints must be declared honestly and never explicitly set to `: false` (omission already means false).
- **Quote:** - Treating annotations as cosmetic. `readOnlyHint` and `consequentialHint` change agent behaviour; declare them honestly, and never declare a hint as `: false` — omission already means `false`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/webmcp.md`
- **Verify:** In a supporting browser, inspect registered tools' annotations (`readOnlyHint`, `consequentialHint`, `untrustedContentHint`) — no hint is explicitly false and declared values match observed tool behaviour.
- **Severity:** low

---

## okf-bundle.md

### 99. Every OKF concept has a non-empty type
- **Requirement:** Every non-index, non-log `.md` file in an OKF bundle must parse as YAML front matter with a non-empty `type`.
- **Quote:** - Every non-index, non-log `.md` parses as YAML front matter with a non-empty `type`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
- **Verify:** Iterate the published bundle (or fetch `/okf.tar.gz` and extract), parse each concept's frontmatter, and confirm `type` is present and non-empty.
- **Severity:** low

### 100. Only the root index.md carries front matter
- **Requirement:** `index.md` files must carry no front matter except the bundle root's `okf_version`, and that version must match the field shapes the concepts use.
- **Quote:** - `index.md` files carry no front matter (except the root's `okf_version`), and that version matches the field shapes the concepts actually use.
- **Source:** `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
- **Verify:** Check each `index.md` for a `---` front-matter block (only the root has one, declaring `okf_version`), and confirm the declared version matches the fields the concepts emit (0.2 uses `generated.at`/`sources`, not `timestamp`/`# Citations`).
- **Severity:** low

### 101. Bundle reachable from a discovery surface
- **Requirement:** The OKF bundle must be reachable from at least one discovery surface — an AI Catalog entry, an llms.txt pointer, or a Link header.
- **Quote:** - The bundle is reachable from at least one discovery surface (AI Catalog entry, `llms.txt`, or a `Link` header).
- **Source:** `.zflow/evidence/specweb/agent-readiness/okf-bundle.md`
- **Verify:** Grep the ai-catalog entries, /llms.txt body, and homepage Link headers for the bundle URL — at least one contains it.
- **Severity:** low

---

## schemamap.md

### 102. Per-resource .jsonld endpoint with CORS
- **Requirement:** Each page with structured data must expose its JSON-LD graph at the canonical URL with a `.jsonld` suffix, returning 200 with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.
- **Quote:** - `curl -sI https://example.com/articles/foo.jsonld` returns `200` with `Content-Type: application/ld+json` and `Access-Control-Allow-Origin: *`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** Run the quoted curl on sample resource URLs and check status plus both headers.
- **Severity:** low

### 103. schemamap index parses and lists live URLs
- **Requirement:** `/schemamap.xml` must parse as valid XML and every `<jsonld>` URL it lists must fetch with 200.
- **Quote:** - `curl -s https://example.com/schemamap.xml | xmllint --noout -` parses cleanly. Every `<jsonld>` URL it lists fetches with `200`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** Run the quoted xmllint check, then `curl -s /schemamap.xml | grep -oE '<jsonld>[^<]+'` and fetch each listed URL — all return 200.
- **Severity:** low

### 104. .jsonld graph identical to the embedded JSON-LD
- **Requirement:** The `.jsonld` endpoint must serve exactly the same `@graph` the HTML page embeds, generated from the same source.
- **Quote:** - Compare the `.jsonld` body to the `<script type="application/ld+json">` block on the same page — the graph (after sorting keys) should be identical.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** `diff <(curl -s <page>.jsonld | jq -S .) <(curl -s <page> | extract-ldjson-script | jq -S .)` — no differences.
- **Severity:** low

### 105. Schemamap discovery links in <head>
- **Requirement:** Pages must carry both the per-page `<link rel="alternate" type="application/ld+json">` and the site-wide `<link rel="schemamap">` tags in `<head>`.
- **Quote:** - Fetch the page HTML and confirm both `<link rel="alternate" type="application/ld+json">` and `<link rel="schemamap">` are present in `<head>`.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** `curl -s <page> | grep -E 'rel="schemamap"|rel="alternate" type="application/ld\+json"'` returns both link tags.
- **Severity:** low

### 106. Index lists only real schema.org types
- **Requirement:** The schemamap index must list only real, valid schema.org `@type` values that the pages actually carry.
- **Quote:** - **Inventing `@type` values to fill the index.** Only list real, valid schema.org types.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** Extract `<type>` values from the index and confirm each is a documented type on schema.org and appears in the referenced page's JSON-LD.
- **Severity:** low

### 107. Unregistered rel stays out of the HTTP Link header
- **Requirement:** The unregistered `rel="schemamap"` value must appear only in HTML `<head>`, not in the global HTTP Link header, until the relation is registered.
- **Quote:** - **In HTML `<head>` only.** Ship `rel="schemamap"` in the page — that link tag *is* the proposal under test. Do not add it to the global HTTP `Link` header until the relation is registered.
- **Source:** `.zflow/evidence/specweb/agent-readiness/schemamap.md`
- **Verify:** `curl -sI https://example.com/ | grep -i 'rel="schemamap"'` returns nothing while the homepage HTML does contain the link tag.
- **Severity:** low
