# Specialist routing

Select from the session's discovered agents using the task, manifests, affected code and
agent descriptions. These are routing examples, not a registration list. Niche `z-*`
specialists and niche workflows (`z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`,
`shipflow`) install **per project** under `<project>/.zcode/agents/` and
`<project>/.zcode/skills/` via `z-project-init` (tracked in
`<project>/.zcode/hmziqrs-ai-snapshot.json`), while the 7 core agents (`general-pro`,
`general-flash`, `explore-flash`, `workflow-author`, `workflow-author-flash`,
`workflow-planner`, `workflow-planner-flash`) live globally
in `~/.zcode/agents/`. Resolve each selected file to an absolute path; project-local
definitions in `<project>/.zcode/agents/` take precedence over global copies. If a required
niche specialist is not yet installed in `<project>/.zcode/agents/`, report it and offer
to run `z-project-init` for the project rather than installing niche agents globally or
inferring a framework from `hasUI` or file extensions alone.

| Work | Persona | Primary domain skills |
|---|---|---|
| General Rust libraries and applications | `z-rust-engineer` | `rust-best-practices`, `rust-testing`, `rust-async-patterns` |
| Axum and Tower HTTP services | `z-axum-engineer` | `axum-web-framework`, `axum-code-review`, `rust-service-comms`, `rust-async-patterns` |
| Svelte 5 components, runes, and SvelteKit routes | `z-svelte-engineer` | `svelte-code-writer`, `svelte-core-bestpractices`, `shadcn-svelte`, `TanStack Form` |
| Astro content collections, pages, and islands | `z-astro-engineer` | `astro`, `starwind-ui`, `seo-audit`, `programmatic-seo` |
| GPUI (`gpui-kit`) entities, views, focus, overlays, and desktop UI | `z-gpui-engineer` | `gpui-kit`, `gpui-kit-design-guides`, `rust-best-practices`, `rust-testing` |
| Flutter widgets, responsive layouts, routing, and Dart behavior | `z-flutter-engineer` | `flutter-*`, `dart-*` task-matched skills |
| ElysiaJS routes, schemas, plugins, and Eden clients | `z-elysiajs-engineer` | `elysiajs`, `better-auth`, `drizzle-orm-d1` |
| Cloudflare Workers, D1, R2, KV, Durable Objects, and Agents SDK | `z-cloudflare-engineer` | `cloudflare`, `workers-best-practices`, `durable-objects`, `wrangler`, `cf-cli`, `workers-profiling`, `agents-sdk` |
| TanStack Query, Store, DB, Table, Form, Virtual, Router, and Start | `z-tanstack-engineer` | Package-matched TanStack Intent and scoped community skills |
| Tauri v2 Rust Core commands, IPC, capabilities, plugins, and WebView shell | `z-tauri-integrator` | `tauri-v2`, `tauri`, `understanding-tauri-architecture`, `calling-rust-from-tauri-frontend`, `configuring-tauri-permissions`, `integrating-tauri-js-frontends` |
| Rust release hygiene, profiling, benchmark variance, and lever triage | `z-rust-perf-engineer` | `rust-superopt` + bottleneck-matched `rust-*` sub-skill |
| Rust allocation rate, struct/string layout, succinct sets, cache/RSS, and zero-copy buffers | `z-rust-memory-engineer` | `rust-superopt`, `rust-string-perf`, `rust-succinct-structures`, `rust-parallel-cache`, `rust-service-comms`, `rust-fast-architecture`, `rust-embedded-storage` |
| Rust SIMD crate swaps, autovectorization, portable SIMD, intrinsics, and runtime dispatch | `z-rust-simd-engineer` | `rust-simd-crates`, `rust-simd-kernels`, `rust-superopt` |
| Rust futures, cancellation safety, `LocalSet`/Tokio contention, and channel/wire backpressure | `z-rust-async-engineer` | `rust-async-patterns`, `rust-fast-architecture`, `rust-parallel-cache`, `rust-service-comms` |
| Read-only Rust `unsafe`, pointer/layout, `#[target_feature]`, and FFI soundness audit | `z-unsafe-ffi-auditor` | `rust-best-practices`, `code-comments`, `rust-superopt`, `rust-simd-kernels`, `rust-parallel-cache`, `rust-async-patterns` |
| HTTP, RPC, wire-format, and IPC schema compatibility | `z-api-contract-engineer` | Stack-matched contract skills (`axum-*`, `rust-service-comms`, `calling-rust-from-tauri-frontend`, `elysiajs`, `TanStack *`) |
| SQL, D1, and embedded storage schema evolution, backfills, and sync durability | `z-database-migration-engineer` | Engine docs + `drizzle-orm-d1`, `cloudflare/references/d1`, `rust-embedded-storage` |
| Read-only user-journey state/transition matrices and acceptance criteria | `z-product-flow-analyst` | Stack-matched UI/routing skills + `gpui-kit-design-guides` |
| Read-only keyboard, focus, semantic tree, and contrast accessibility audit | `z-accessibility-auditor` | Stack-matched UI skills + `agent-browser` / `open-computer-use` |
| Serialized desktop or mobile runtime verification and AX/PNG capture | `z-native-device-verifier` | `open-computer-use`, `gpui-kit`, `tauri-v2`, `tauri`, `flutter-add-integration-test` |
| Read-only failed build, lint, test, or CI gate classification | `z-ci-diagnostician` | Stack-matched diagnostic skills (`rust-best-practices`, `gpui-kit`, `tauri-v2`, `svelte-code-writer`, `astro`, `react-doctor`, `dart-*`) |
| Read-only GitHub issue triage, dependency DAGs, milestones, and `gh-ops` plans | `z-github-project-manager` | `shipflow`, `z-workflow`, read-only `gh help` |

Use existing explorer, planner/auditor, security, injection, browser, visual, QA and PR
review roles when their actual responsibility applies. Shipflow roles retain queue-specific
authority. A missing specialist is reported before launch; select a suitable available
general agent explicitly or stop if its expertise is required. Never silently substitute a
different framework. Match the persona's named primary and conditional skills to the available-skills index,
resolve their current paths and read the relevant guidance before work. Local framework
skills are separate dependencies, not bundled by this kit. Missing required primary or
project-mandated skills block the assignment; report optional gaps without loading unrelated
packs. The planner (or, for small work, the author) resolves the paths and carries them
in each area's `skills` field; the coordinator relays them and resolves nothing itself.
When a persona explicitly supplies upstream skill sources, resolve permitted guidance before
dispatch and carry cached absolute paths in `skills`; do not bypass project source restrictions.

## Dispatch contract

- Select one primary domain persona per implementation lane. Add a specialist only for a
  distinct deliverable or risk; a file touching several technologies does not justify a
  panel. Contract decisions precede consumers through explicit dependency edges.
- Record `area`, `role`, absolute `path`, `access` (`read-only` or `write`) and `reason` in
  the brief and plan. Pass the task, worktree, allowed/excluded paths, relevant skills,
  acceptance criteria, evidence and delegated commands. Device captures use the serialized
  device lane; browser sessions and ports stay isolated.
- Load through the canonical persona kit with explicit access and the profile tier. Use a
  fresh read-only instance for review, including when it uses the implementer's domain
  file. Give it the task, diff and evidence, never the implementer's reasoning or earlier
  verdicts. Guard every read-only ask while no writer uses that worktree.
- Implementation authority covers only the assigned source paths. Capture authority covers
  only delegated evidence and test-state interactions. Neither grants Git, GitHub, release
  or deployment authority. Queue operations and remote merging retain their own policy.
- Return the requested typed result, supported findings, checked commands and limitations.
  Return discovered tasks with parent, kind, scope, dependencies and evidence; the planner
  or coordinator deduplicates and routes them within the run's budget. Lane workers never
  spawn agents or workflows (the pre-run `workflow-planner` is the one exception: it
  dispatches read-only explorers and the `workflow-author` itself). Findings requiring edits
  re-enter an authorized implementation lane.
- Research, planning and audit assignments stay read-only. Draft work gets only its named
  artifact paths. Do not add implementation, capture, commits or merge stages to those
  tasks unless their requested deliverable needs them.
