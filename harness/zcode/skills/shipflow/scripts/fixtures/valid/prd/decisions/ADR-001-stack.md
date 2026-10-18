# ADR-001 Stack

Status: accepted (2026-10-18)

## Context
The site needs server-rendered pages for search engines, a relational store for ranked data, and session-based accounts with an OAuth option. Hosting is not decided by this record.

## Decision
- A statically typed web app with server-rendered routes and a small JSON API for the tables.
- A relational data store with versioned migrations and idempotent seed import.
- Session cookies with HttpOnly and SameSite=Lax. OAuth sits behind an adapter with a development mock.

## Consequences
- Tables render fast on the server and need one query per view.
- The adapter keeps the OAuth provider replaceable; the mock keeps local development offline.
