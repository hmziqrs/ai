# Specialist routing

Select from the session's discovered agents using the task, manifests, affected code and
agent descriptions. These are routing examples, not a registration list. Resolve each
selected file to an absolute path; project-local definitions take precedence over global
copies. Do not infer a framework from `hasUI` or file extensions alone.

| Work | Persona |
|---|---|
| General Rust | `z-rust-engineer` |
| Axum HTTP services | `z-axum-engineer` |
| Svelte components and routes | `z-svelte-engineer` |
| Astro content, pages and islands | `z-astro-engineer` |
| GPUI entities, views and desktop interaction | `z-gpui-engineer` |
| Flutter widgets and application behavior | `z-flutter-engineer` |
| ElysiaJS services | `z-elysiajs-engineer` |
| Cloudflare Workers, D1, R2, KV and Durable Objects | `z-cloudflare-engineer` |
| TanStack data, routing, forms, tables and cross-library behavior | `z-tanstack-engineer` |
| Rust/frontend IPC and native integration | `z-tauri-integrator` |
| Profiling and optimization selection | `z-rust-perf-engineer` |
| Buffer ownership, allocations and zero-copy interfaces | `z-rust-memory-engineer` |
| Vectorization, SIMD kernels and ISA dispatch | `z-rust-simd-engineer` |
| Cancellation, synchronization and shutdown correctness | `z-rust-async-engineer` |
| Unsafe Rust or foreign ownership boundaries | `z-unsafe-ffi-auditor` |
| API schema and cross-version compatibility | `z-api-contract-engineer` |
| Durable schema changes and backfills | `z-database-migration-engineer` |
| Routes, states and user-journey acceptance criteria | `z-product-flow-analyst` |
| Keyboard, semantics and assistive technology | `z-accessibility-auditor` |
| Desktop or mobile runtime evidence | `z-native-device-verifier` |
| Failed build, test or CI diagnosis | `z-ci-diagnostician` |
| GitHub priorities, dependencies and project planning | `z-github-project-manager` |

Use existing explorer, planner/auditor, security, injection, browser, visual, QA and PR
review roles when their actual responsibility applies. Shipflow roles retain queue-specific
authority. A missing specialist is reported before launch; select a suitable available
general agent explicitly or stop if its expertise is required. Never silently substitute a
different framework. Match the persona's named primary and conditional skills to the available-skills index,
resolve their current paths and read the relevant guidance before work. Local framework
skills are separate dependencies, not bundled by this kit. Missing required primary or
project-mandated skills block the assignment; report optional gaps without loading unrelated
packs. The coordinator carries the resolved paths in each area's `skills` field.
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
  Return discovered tasks with parent, kind, scope, dependencies and evidence; the
  coordinator deduplicates and routes them within the run's budget. Workers never spawn
  agents or workflows. Findings requiring edits re-enter an authorized implementation lane.
- Research, planning and audit assignments stay read-only. Draft work gets only its named
  artifact paths. Do not add implementation, capture, commits or merge stages to those
  tasks unless their requested deliverable needs them.
