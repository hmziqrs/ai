---
title: "HSTS (Strict-Transport-Security)"
category: security
status: required
url: https://specification.website/spec/security/hsts/
updated: "2026-07-01T00:00:00.000Z"
sources:
  - title: "RFC 6797 — HTTP Strict Transport Security (HSTS)"
    url: "https://www.rfc-editor.org/rfc/rfc6797"
    publisher: "IETF"
  - title: "MDN — Strict-Transport-Security"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security"
    publisher: "MDN"
  - title: "HSTS Preload List Submission"
    url: "https://hstspreload.org/"
    publisher: "Google Chrome"
  - title: "OWASP — HTTP Strict Transport Security Cheat Sheet"
    url: "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html"
    publisher: "OWASP"
source_repo: https://github.com/jdevalk/specification.website
licence: CC-BY-4.0
---

# HSTS (Strict-Transport-Security)

> HSTS tells browsers to only ever use HTTPS for your domain. Send max-age with includeSubDomains — but skip the preload list, which its own operator now discourages.

## What it is

HTTP Strict Transport Security, defined in RFC 6797, is a response header that tells the browser: from now on, never speak HTTP to this host — only HTTPS. The browser remembers the instruction for the duration of `max-age` and refuses plain HTTP even if the user types it, clicks a stale link, or has DNS hijacked.

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

## Why it matters

A 301 redirect from HTTP to HTTPS only protects the second request. The first request — and any cookies sent with it — already left the device in plain text. HSTS closes that gap. It also defends against active downgrade attacks where a network attacker strips the redirect and proxies the connection.

Without HSTS, every typed URL, bookmark, and external link to `http://example.com` is a moment when an attacker on the network can intercept the session.

## How to implement

Send the header on every HTTPS response. Browsers ignore it on plain HTTP.

Directives:

- **`max-age=<seconds>`** — required. How long the browser remembers. Start short (a few hours) to verify, then raise to two years (`63072000`) before preloading.
- **`includeSubDomains`** — applies the policy to every subdomain. Audit them first (see below).
- **`preload`** — opts in to the browser preload list. **No longer recommended** for most sites — the list's own operator now advises against it (see below), so leave it off unless you have a specific reason.

Recommended production header:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains
```

This site sends exactly that — `max-age=63072000; includeSubDomains`, no `preload` — from [`public/_headers`](https://github.com/jdevalk/specification.website/blob/main/public/_headers).

### Preloading is no longer recommended

The historic advice was to add `preload` and submit the domain to [the preload list](https://hstspreload.org/), hard-coding HTTPS-only into browsers so that even a first visit on a fresh device is protected. That guidance has changed. Modern browsers (Chrome, Safari) now auto-upgrade every HTTP navigation to HTTPS regardless of any HSTS policy, so preloading only helps in the narrow case where that upgrade fails against an active attacker. The list operator now states it plainly: "**HSTS preloading is not recommended.**" The commitment, meanwhile, is heavy — removal from the list takes months and applies to every subdomain. For nearly all sites, a strong `max-age` with `includeSubDomains` is the right stopping point; skip `preload`.

## Common mistakes

- **Sending HSTS over HTTP.** Browsers must ignore it. Send it on HTTPS responses only.
- **Setting `includeSubDomains` without auditing subdomains.** Every subdomain — including internal tools, staging, and legacy services — must work over HTTPS. If `dev.example.com` is HTTP-only, you have just broken it.
- **Setting `max-age=0` by accident.** That removes HSTS. Useful when rolling back, dangerous when copied from a tutorial.
- **Adding `preload` reflexively.** The preload list is now discouraged by its own operator, and getting a domain off it takes months. Ship HSTS without it unless you have a specific reason.

## Verification

- `curl -sI https://example.com | grep -i strict-transport-security` should return the header.
- In Chrome DevTools, the Security panel shows the HSTS state for the current site.

HSTS is a commitment, not a switch. Plan the rollback path before you ship.
