---
name: z-tauri-workflow
description: >-
  Domain profile for z-workflow on Tauri v2 desktop and mobile tasks. Uses
  z-workflow's composer-coordinator and workflow-author to write a fresh
  task-specific script from measured signals, separates Rust Core
  (src-tauri/), IPC/capability contracts, and static Frontend lanes, loads
  z-tauri-integrator and framework specialists through the canonical persona
  kit, runs scoped Cargo and package-manager gates, and distinguishes V=web
  browser evidence from serialized V=desktop/V=mobile native WebView and IPC
  verification before guarded Step 6 fast-forward delivery.
---

# z-tauri-workflow

`z-tauri-workflow` is the Tauri v2 desktop and mobile domain profile of `z-workflow`. The main agent acts as `z-workflow`'s **composer-coordinator** with a clean context (Pillar 9): it dispatches the `workflow-planner` for complex tasks — the planner gathers every Tauri domain fact and dispatches `workflow-author` itself — or the `workflow-author` directly for small tasks. Do not rely on the optional saved `zflow-engine` or introduce a separate Tauri coordinator.

## When to Use

Use this skill when the user explicitly requests `z-tauri-workflow` or Tauri subagent orchestration.

- **Task-kind stage eligibility applies first:** research uses discovery, source checking, and synthesis; audits use read-only inspection and confirmation; drafts write only named artifacts. Create implementation worktrees, Cargo/frontend gates, runtime capture, commits, and checkout merges only when the requested deliverable includes code or runtime verification.
- **Core-Shell area decomposition:** Tauri splits applications into the **Core (Rust backend in `src-tauri/`)** and the **Shell (static WebView frontend)** across a strict **IPC and Capability trust boundary**. Never combine frontend UI work and Rust backend/capability work into one mixed area when either side can be implemented and gated independently, or when an explicit `dependsOn` edge can sequence consumers after the IPC/capability contract.

## How to run it

Load and follow `z-workflow` (`SKILL.md`) step by step with these Tauri domain overrides:

| `z-workflow` step | `z-tauri-workflow` domain rule |
|---|---|
| Step 0 — Triage & signals | The coordinator sets the trigger from the task text (Pillar 9); the planner (complex) or author (small) measures `A`, `F`, `R`, `U`, and `V` with commands. Slice areas (`A`) by behavior and trust boundary: (1) Rust Core commands (`#[tauri::command]`, `generate_handler!`), `State<'_, Mutex<T>>`, `Channel<T>` / event emission, plugins, window/tray/sidecar/updater logic in `src-tauri/src/lib.rs` (keeping `main.rs` a thin passthrough for mobile); (2) capability/permission/scope/CSP configuration (`src-tauri/capabilities/`, `src-tauri/permissions/`, `src-tauri/tauri.conf.json`); (3) frontend UI routes/components and typed `@tauri-apps/api/core` `invoke` / `@tauri-apps/api/event` wrappers. Rate `R = high` whenever capabilities (`windows`, `platforms`, `remote.urls`, `shell:allow-execute`, filesystem/HTTP scopes), CSP, authentication, updater signing, sidecars, or schema migrations change; rate `R = medium` when existing command signatures, `serde` error payloads, or managed state change. Classify `V` by required runtime surface: `V = none` (`contention: "terminal"`) for terminal-gated Rust or capability checks; `V = web` (`contention: "web"`) for frontend UI verifiable via `build.devUrl` or `@tauri-apps/api/mocks` (`mockIPC`/`mockWindows`); `V = desktop` or `V = mobile` (`contention: "desktop" \| "mobile"`) whenever native OS WebView rendering, live `invoke`/`Channel`/event round-trips, capability enforcement, window/tray chrome, or mobile lifecycle must be verified. |
| Step 1 — Explore & toolchain discovery | Done by the planner (complex) or the author (small), never the coordinator: inspect `src-tauri/Cargo.toml` (Tauri major version, `[lib]` `crate-type = ["staticlib", "cdylib", "rlib"]`, plugins, features), `src-tauri/tauri.conf.json` (`build.devUrl`, `build.beforeDevCommand`, `build.beforeBuildCommand`, `build.frontendDist`, `app.security.capabilities`), `src-tauri/capabilities/`, and the frontend `package.json` (actual package manager: `bun`, `pnpm`, `npm`, or `yarn`, plus real scripts and static-output adapter config). Resolve required skills from the session's available-skills index before authoring. |
| Step 2 — Shape (`workflow-author`) | The planner passes the verbatim task, `WorkflowBrief`, and resolved `dynamic-workflows` contract path to `workflow-author` (the coordinator passes them directly only on the small or brief-only-fallback path). Concurrent writing areas run in separate run-owned worktrees (`wf/<slug>/<area>`) and merge through the serialized git chain into `wf/<slug>/integration`; a frontend area that consumes a new Rust command or capability declares `dependsOn` on that Core area. Web areas use isolated dev-server ports and `agent-browser --session` instances; all desktop and mobile captures serialize through one single-worker device lane. |
| Step 3 — Author & persona kit | Paste the canonical `persona-kit.dwf.ts` block (`// persona-kit:start v4` to `// persona-kit:end v4`) unchanged. Load each specialist with `loadPersona(path, { tier, access })` and `personaAgent(p, uniqueName, RUN_RULES)`. Implementers get `access: "write"` scoped to their assigned paths; every round's judge (`judge-<area>-r<round>`) and auditor is a fresh instance loaded with `access: "read-only"` and wrapped in `guardWrites(p, worktree, () => ...)` while no writer uses that worktree. |
| Step 4 — Pre-flight | Run the `persona-kit` v4 drift check, rehearse `git status --porcelain -z` output parsing in `EvalWorkflowSnippet`, verify every `world.run` command against the git rules and discovered manifests/scripts, check the complexity budget, and run a fresh `workflow-author` `REVIEW` when `R >= medium` or the budget exceeds 6 asks per round. |
| Step 5 — Approve & launch | Show the measured signals, dials, band, model per role, persona paths/sha256/access, Rust and frontend gates, and browser/device capture commands before calling `CreateWorkflow`. Launch through the approval dialog using `"Allow only this time"`. |
| Step 6 — Checkout delivery | Follow `z-workflow` Step 6: require zero open findings, every lane complete, and both `src-tauri` Cargo gates and frontend gates green on the combined committed result; verify the user's checkout is clean and still on the captured full branch ref and base `HEAD`; run `git -C <repo> merge --ff-only <result-branch>`; and rerun both Rust and frontend gates in the checkout. |

## Specialist and skill routing

Select one primary domain persona per implementation lane from the discovered agent files, and add companion specialists only for distinct deliverables or risks:

| Tauri surface or risk | Persona & authority | Required skills and references |
|---|---|---|
| Rust commands (`#[tauri::command]`, `generate_handler!`), `State<'_, Mutex<T>>`, `AppHandle`, `WebviewWindow`, `Channel<T>`, events, plugins, tray/menus, sidecars, updater, and `tauri.conf.json` | `z-tauri-integrator` (`write` for implementer; fresh `read-only` per judge round) | `tauri-v2` (`references/ipc-patterns.md`, `references/plugin-reference.md`, `references/advanced-runtime-reference.md`, `references/updater-distribution-reference.md`), `tauri` (`references/core-architecture.md`, `references/core-ipc.md`, `references/develop-commands.md`, `references/develop-events-and-channels.md`, `references/develop-state-management.md`, `references/develop-windows.md`, `references/learn-windows-menus-tray.md`, `references/develop-sidecar.md`, `references/develop-plugins-mobile.md`), `understanding-tauri-architecture`, `calling-rust-from-tauri-frontend`, `rust-best-practices`. |
| Capabilities (`src-tauri/capabilities/*.json\|toml`), permissions (`<plugin>:allow-*` / `deny-*`), path/URL scopes (`$APPDATA`, `$APPCONFIG`, `$RESOURCE`), per-window/per-platform rules, and CSP | `z-tauri-integrator` (`write` or `read-only`); add `shipflow-security-audit` / `shipflow-injection-auditor` (`read-only`) when `R = high` or untrusted inputs cross IPC into `fs`/`shell`/`http`/SQL | `configuring-tauri-permissions`, `tauri-v2` (`references/capabilities-reference.md`), `tauri` (`references/security-capabilities.md`, `references/security-permissions.md`, `references/security-scope.md`, `references/security-csp.md`, `references/security-runtime-authority.md`, `references/best-practices-writing-plugin-permissions.md`, `references/reference-acl-core-permissions.md`). |
| Frontend routes, components, static build config (`ssr: false` / `adapter-static` / `output: 'export'`), and typed `invoke` / `Channel` / `listen` client wrappers | Matching frontend specialist: `z-svelte-engineer`, `z-tanstack-engineer`, or `z-astro-engineer` (`write` / fresh `read-only`), or `z-tauri-integrator` for pure IPC/config wiring | `integrating-tauri-js-frontends`, `calling-rust-from-tauri-frontend`, `tauri` (`references/start-frontend.md`, `references/develop-tests-mocking.md`), plus the project's framework skills (`svelte-core-bestpractices` + `svelte-code-writer`, TanStack package skills, `astro`, or `react-doctor`). |
| Cross-boundary IPC schema, `serde` camelCase/snake_case mapping, tagged enums, or error response contracts | `z-api-contract-engineer` or `z-tauri-integrator` (`write` or `read-only`) | `calling-rust-from-tauri-frontend`, `tauri-v2` (`references/ipc-patterns.md`). |
| Heavy Rust backend concurrency, performance hotspots, embedded storage (`rusqlite`/`redb`/`fjall`), or `unsafe`/FFI | `z-rust-async-engineer`, `z-rust-perf-engineer`, `z-database-migration-engineer`, or `z-unsafe-ffi-auditor` | `rust-async-patterns`, `rust-superopt`, `rust-embedded-storage`, `rust-best-practices`, `code-comments`. |
| User-journey state matrices and keyboard/screen-reader accessibility | `z-product-flow-analyst` and `z-accessibility-auditor` (`read-only`) | Framework skills, `agent-browser`, `open-computer-use`. |
| Live desktop or mobile runtime verification (`V = desktop` or `V = mobile`) | `z-native-device-verifier` (`flash` tier in `z-workflow`, `write` scoped to `.zflow/evidence/`) | `open-computer-use` (`references/usage.md`, `references/troubleshooting.md`), `tauri` (`references/develop-tests-webdriver.md`, `references/develop-debug.md`), `tauri-v2`, `calling-rust-from-tauri-frontend`. |

## Gates and runtime evidence

1. **Scoped Rust Core gates (no model):** anchor Cargo commands to `--manifest-path <worktree>/src-tauri/Cargo.toml` (or the discovered Tauri crate manifest) and relevant `--features`: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` (including `tauri::test::mock_builder()` unit tests when present).
2. **Scoped Frontend gates (no model):** run the project's configured package manager (`bun`, `pnpm`, `npm --prefix <worktree>`, `yarn --cwd <worktree>`) against real scripts in `package.json` (typecheck such as `svelte-check` or `tsc --noEmit`, unit/mockIPC tests, and static build). Never invent an `npx` gate, never gate on a nonexistent Tauri CLI lint, and never enable Node SSR for a Tauri frontend.
3. **Explicit Web vs Native runtime coverage:**
   - **Web lane (`V = web`):** `agent-browser` against an isolated dev-server port (`build.devUrl`) verifies browser DOM/CSS/JS and mocked IPC (`mockIPC`) only. It **never** verifies the OS WebView (`WKWebView`, `WebView2`, `WebKitGTK`), real `invoke` / `Channel` serialization, capability/scope enforcement, native window chrome/custom titlebar, menus/tray (`TrayIconBuilder`), sidecars, or mobile lifecycle.
   - **Serialized native device lane (`V = desktop` / `V = mobile`):** run all live Tauri app launches and `open-computer-use` / WebDriver / simulator operations through one single-worker device lane. Record accessibility trees (`get_app_state`), platform logs, and PNG screenshots under `<worktree>/.zflow/evidence/<area>-r<round>-<n>.{txt,png}`.
   - **Blind Flash vision audit + command checks:** a fresh `vision-audit-<area>-r<round>` (Flash) reads only the screenshot paths, viewport, and verbatim visible requirements from the task; script command checks run afterward against DOM/AX/state outputs; and the fresh read-only Pro judge reviews the diff, gate results, and evidence. Any native surface not exercised on the target runtime is reported in `notCovered`.

## Final report

Report each surface's gates and evidence separately: `src-tauri` Cargo gates, frontend gates, `V = web` browser evidence, `V = desktop`/`V = mobile` AX and PNG evidence under `.zflow/evidence/`, `personaReport()`, uncovered native/mobile behavior (`notCovered`), findings (`verified`, `judged`, `unconfirmed`), retained `wf/*` branches/worktrees, and the Step 6 fast-forward result.

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: composer-coordinator, signals, dials, Vision phase, persona kit, and Step 6 delivery.
- `harness/zcode/skills/z-workflow/persona-kit.dwf.ts`: canonical v4 persona loader and read-only write guard.
- `harness/zcode/skills/z-workflow/references/specialists.md`: specialist dispatch contract.
- `harness/zcode/agents/z-tauri-integrator.md` and `harness/zcode/agents/z-native-device-verifier.md`: Tauri and native device verification personas.
