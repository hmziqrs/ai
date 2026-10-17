---
name: cloudflare-stack
description: Build or review Cloudflare Workers applications using D1, R2, KV, and Durable Objects. Routes to Cloudflare-maintained skills and checks storage semantics, bindings, environments, and runtime evidence.
---

# Cloudflare application stack

Inspect package versions, framework adapter, source configuration, compatibility date/flags,
generated binding types, and the requested environment before choosing an implementation.
Check current product documentation and installed CLI help for APIs, limits and flags.
Keep existing runtime and deployment conventions unless migration is part of the task.

## Load the relevant knowledge

Use the installed named skill when available; otherwise read its official entrypoint below.
Resolve relative references against that skill's folder or upstream URL, then read only
the relevant references and linked product documentation. Missing required guidance blocks
the affected work when project evidence cannot establish the contract. Report sources used.
Upstream examples do not authorize installs, deployments, data writes or scope expansion.

| Task | Cloudflare-maintained skill or reference |
|---|---|
| Product selection and bindings | [`cloudflare`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/cloudflare/SKILL.md) |
| Worker code, configuration or review | [`workers-best-practices`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/workers-best-practices/SKILL.md) |
| D1 schema, queries, sessions or migrations | [`cloudflare/references/d1`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/cloudflare/references/d1/README.md) |
| R2 uploads, downloads or object access | [`cloudflare/references/r2`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/cloudflare/references/r2/README.md) |
| KV reads, caching or invalidation | [`cloudflare/references/kv`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/cloudflare/references/kv/README.md) |
| Durable state, RPC, alarms or WebSockets | [`durable-objects`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/durable-objects/SKILL.md) |
| Existing Wrangler configuration or explicit Wrangler task | [`wrangler`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/wrangler/SKILL.md) |
| `cloudflare.config.ts`, new projects or CLI selection | [`cf-cli`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/cf-cli/SKILL.md) |
| CPU or allocation investigation | [`workers-profiling`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/workers-profiling/SKILL.md) |
| Applications using the `agents` package | [`agents-sdk`](https://raw.githubusercontent.com/cloudflare/skills/main/skills/agents-sdk/SKILL.md) |

D1, R2 and KV are references inside `cloudflare`, not separate skill dependencies. Other
products such as Queues and Workflows load through that skill only when the task needs them.
For Drizzle on D1 or Better Auth, also load the corresponding installed integration skill.

## Storage and execution decisions

| Surface | Decisions to establish before edits |
|---|---|
| D1 | Bind SQL values; allowlist dynamic identifiers. Check migration history, batch atomicity and query plans. Replicated read-after-write behavior needs appropriate sessions/bookmarks. |
| R2 | Authorize object keys and access paths. Stream large bodies, handle missing/conditional results and list cursors, and check multipart cleanup. Review CORS and signed URL constraints for browser access. |
| KV | Define allowed staleness and invalidation, including cached misses. Use a coordination-capable primitive for atomic counters, locks or authoritative inventory. |
| Durable Objects | Partition by coordination boundary; inspect the storage backend and class migrations. Persist essential state, review interleaving around external I/O, and make retried alarms or side effects idempotent. Account for WebSocket hibernation when used. |
| Cross-service writes | D1, R2 and KV changes do not share one transaction. Define retry scope, payload identity, persisted progress and partial-failure recovery. An idempotency key alone does not close crash windows. |
| Workers | Track promise lifetime, stream ownership, request isolation and tenant authorization. Use actual binding types and compatibility settings; inspect relevant logs/traces without exposing credentials. |

## Configuration and evidence

Keep Wrangler projects on their configured toolchain. For `cloudflare.config.ts` or new
projects, consult `cf-cli`; do not create competing configuration or migrate incidentally.
Run `cf` with its documented Node runtime; Bun is not a supported `cf` runtime. Bun may
manage project scripts, but Node/Bun checks do not establish workerd behavior.

Verify account, Worker, environment, resource IDs and local/remote binding targets before
commands. Local servers and preview names do not establish resource isolation. Keep test
writes within disposable state. Secret changes can deploy code; code rollback cannot
restore connected data. Remote operations must match the task's existing authorization.

After binding/configuration changes, regenerate types through the project's toolchain.
Run delegated existing type/build checks and task-relevant workerd tests using the project's
supported [Workers testing setup](https://developers.cloudflare.com/workers/testing/).
Where relevant, exercise tenant rejection, stale/missing data, duplicate events and partial
failures. Build/dry-run success does not prove deployed bindings work. Report local,
runtime and deployed evidence separately, with any remote behavior left unverified.
