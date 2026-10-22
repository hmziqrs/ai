---
name: z-project-init
description: >-
  Initializes, audits, or updates a target project with per-project ZCode niche
  sub-agents (.zcode/agents/z-*.md), niche domain skills (.agents/skills/),
  and a versioned hmziqrs/ai snapshot manifest
  (.zcode/hmziqrs-ai-snapshot.json). Enforces the global-vs-project split:
  core agents (general-pro, general-flash, explore-flash, workflow-launcher)
  and core skills (z-workflow, z-project-init) stay global, while niche
  specialists and stack skills install per project. No workflow skills
  install per project anymore. Use it when asked to initialize, install
  into, update or check a project for ZCode or a stack's specialists.
---

# z-project-init

`z-project-init` initializes or updates a project's local ZCode harness configuration (`<project>/.zcode/` and `<project>/.agents/skills/`) from `hmziqrs/ai` and records the exact source commit and file hashes in `<project>/.zcode/hmziqrs-ai-snapshot.json`.

Installing all `z-*` specialists and stack-specific skills globally bloats every session's agent/skill index and forces every project on the machine to update simultaneously whenever `hmziqrs/ai` changes. This skill isolates niche sub-agents and domain skills to the project that actually uses them and pins each project to an explicit `hmziqrs/ai` snapshot.

## When to Use

Use this skill when the user asks to:
- Initialize a repository or project for ZCode sub-agents (`z-project-init`, "init zcode for this project", "install niche agents/skills for this repo").
- Add a specific stack's specialists (such as GPUI, Tauri, Rust superopt, Axum, Svelte, Astro, ElysiaJS, Cloudflare, TanStack, or Flutter) to one project.
- Check whether a project's installed `.zcode/` agents and skills have drifted from its recorded `hmziqrs/ai` snapshot, or upgrade one project to a newer `hmziqrs/ai` commit without touching other projects.
- Clean up niche agents or retired workflow skills that were installed into global `~/.zcode/` or project `.zcode/skills/` directories.

## Global vs Per-Project Policy (Hard Rule)

Never mix global core files with per-project niche files:

| Tier | Scope & Destination | Exact Content |
|---|---|---|
| **Global Core Agents** | `~/.zcode/agents/` (machine-wide, regular files, never symlinks) | **Only the 4 core agents:** `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-launcher.md`. Never install these into `<project>/.zcode/agents/`, and never install `z-*.md` into `~/.zcode/agents/`. |
| **Global Core Skills** | `~/.zcode/skills/` (machine-wide, whole folders) | **Only the 2 general skills:** `z-workflow/`, `z-project-init/`. Never copy ZCode harness skills into `~/.agents/skills/`. |
| **Global Universal Baseline Skills** | `~/.agents/skills/` (machine-wide, whole folders) | **Only universal cross-project policies:** `antislop-copy/`, `code-comments/`, `test-quality-guardrails/`, `test-quality-tdd-agents/`, `test-quality-audit/`. |
| **Per-Project Niche Sub-Agents** | `<project>/.zcode/agents/` (regular files, never symlinks) | **Only the `z-*.md` specialists** required by `<project>`'s actual manifests and deliverables. |
| **Per-Project Niche Domain Skills** | `<project>/.agents/skills/` (whole folders) | **Only the stack/domain skills** required by `<project>`: `languages/rust/rust-*` (`rust-superopt`, `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`), `product/*`, `testing/*`, and required external framework skills (`gpui-kit`, `gpui-kit-design-guides`, `tauri-v2`, `tauri`, `svelte-code-writer`, `cloudflare`, etc.). |
| **Per-Project Snapshot Manifest** | `<project>/.zcode/hmziqrs-ai-snapshot.json` | Records the `hmziqrs/ai` commit SHA, timestamp, detected stack profiles, and per-file `sha256` hashes for drift detection and isolated per-project updates. |

**No workflow skills install per project.** `z-workflow` and `z-project-init` are global-only; the entire previous workflow family (original z-workflow, v2–v13, z-proflow/z-flashflow/z-liteflow, z-gpui/tauri/super-rustflow) is retired in the source repo's `archive/` and is never installed anywhere.

## Stack-to-Artifact Matrix

Inspect the target project's manifests (`Cargo.toml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `package.json`, `wrangler.toml`/`wrangler.jsonc`/`cloudflare.config.ts`, `svelte.config.*`, `astro.config.*`, `pubspec.yaml`) before selecting artifacts. Select only the profiles that match the project or the user's explicit request:

| Detected project stack / trigger | Per-project `.zcode/agents/` to copy | Per-project `.agents/skills/` (`hmziqrs/ai` + external dependencies) |
|---|---|---|
| **Base project pin** (every initialized project) | `z-security-auditor.md` | None (uses global `code-comments` and `test-quality-*` from `~/.agents/skills/`, or copies them locally if the project requests a self-contained checkout) |
| **Rust library / binary / service** (`Cargo.toml` present) | `z-rust-engineer.md`, `z-rust-async-engineer.md` (when `tokio`/`futures`/`compio` present), `z-unsafe-ffi-auditor.md` (when `unsafe`/FFI/SIMD present) | External: `rust-best-practices`, `rust-testing`, `rust-async-patterns` (when async) |
| **Rust performance / optimization** (hot-path crates, `benches/`, `criterion`/`divan`, or user opt-in) | `z-rust-perf-engineer.md`, `z-rust-memory-engineer.md`, `z-rust-simd-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` | From `hmziqrs/ai`: `rust-superopt/`, `rust-simd-crates/`, `rust-simd-kernels/`, `rust-parallel-cache/`, `rust-fast-architecture/`. External when applicable: `rust-string-perf`, `rust-succinct-structures`, `rust-service-comms`, `rust-embedded-storage` |
| **Rust terminal UI** (`ratatui` in `Cargo.toml`) | `z-rust-engineer.md`, `z-rust-async-engineer.md` (when `tokio`/`futures`/`compio` present) | External: `ratatui-tui-blacktop`, `ratatui-tui-pedronauck`, `tui-use` (drives the TUI during verification), `rust-best-practices`, `rust-testing` |
| **GPUI desktop app** (`gpui-kit` or `gpui` in `Cargo.toml`) | `z-gpui-engineer.md`, `z-native-device-verifier.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` (+ `z-rust-perf-engineer.md` / `z-rust-memory-engineer.md` when needed) | External: `gpui-kit`, `gpui-kit-design-guides`, `open-computer-use`, `rust-best-practices`, `rust-testing`, `rust-async-patterns`. From `hmziqrs/ai`: `rust-i18n/` |
| **Tauri v2 desktop / mobile app** (`src-tauri/tauri.conf.json` or `tauri` in `Cargo.toml`) | `z-tauri-integrator.md`, `z-native-device-verifier.md`, `z-qa-evaluator.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` + matching frontend specialist (`z-svelte-engineer.md`, `z-tanstack-engineer.md`, `z-astro-engineer.md`) | External: `tauri-v2`, `tauri`, `understanding-tauri-architecture`, `calling-rust-from-tauri-frontend`, `configuring-tauri-permissions`, `integrating-tauri-js-frontends`, `agent-browser`, `open-computer-use`, `mobile-automation`, `mobilecli`, `rust-best-practices`, `rust-testing` + frontend skills. From `hmziqrs/ai`: `sveltekit-paraglide/` (Svelte frontend) or `astro-i18n/` (Astro frontend) |
| **Axum / Tower HTTP service** (`axum` in `Cargo.toml`) | `z-axum-engineer.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md` | External: `axum-web-framework`, `axum-code-review`, `rust-service-comms`, `rust-async-patterns`, `rust-best-practices`, `rust-testing` |
| **Svelte 5 / SvelteKit** (`svelte` in `package.json`) | `z-svelte-engineer.md`, `z-qa-evaluator.md` | External: `svelte-code-writer`, `svelte-core-bestpractices` (+ `shadcn-svelte`, `TanStack Form`, `agent-browser` when applicable). From `hmziqrs/ai`: `sveltekit-paraglide/` |
| **Astro** (`astro` in `package.json`) | `z-astro-engineer.md`, `z-qa-evaluator.md` | External: `astro` (+ `starwind-ui`, `seo-audit`, `programmatic-seo` when applicable). From `hmziqrs/ai`: `astro-i18n/` |
| **TanStack** (`@tanstack/*` in `package.json`) | `z-tanstack-engineer.md` | External: package-matched TanStack Intent / community skills per `z-tanstack-engineer.md` |
| **Cloudflare Workers / D1 / R2 / KV / DO** (`wrangler.*`, `cloudflare.config.ts`, `@cloudflare/*`, `agents`) | `z-cloudflare-engineer.md` | External: `cloudflare`, `workers-best-practices` (+ `durable-objects`, `wrangler`, `cf-cli`, `workers-profiling`, `agents-sdk`, `drizzle-orm-d1` as needed) |
| **ElysiaJS** (`elysia` in `package.json`) | `z-elysiajs-engineer.md` | External: `elysiajs` (+ `better-auth`, `drizzle-orm-d1` when applicable) |
| **Flutter / Dart** (`pubspec.yaml` with `flutter`) | `z-flutter-engineer.md`, `z-native-device-verifier.md` | External: `flutter-*` and `dart-*` skills matching the project's tasks (+ `mobile-automation`, `mobilecli` for on-device verification). From `hmziqrs/ai`: `flutter-slang/` |
| **PRD, site-recon or parity work** (explicit request only; framework-agnostic) | `z-qa-evaluator.md` (when the project has a web UI) + the project's selected `z-*.md` stack specialists from the rows above | From `hmziqrs/ai` (`product/` and `testing/` categories): `prd-authoring/`, `site-recon/`, `parity-testing/` |

## Execution Procedure

### Step 1 — Locate `hmziqrs/ai` and record its snapshot commit

1. Resolve the local `hmziqrs/ai` source directory (never read or copy anything under `research/` or `archive/`):
   - Use the path provided by the user, the current workspace if it is `hmziqrs/ai`, or a clean clone of `https://github.com/hmziqrs/ai.git`.
2. Record the exact snapshot metadata from the `hmziqrs/ai` repository:
   - `sourceCommit`: `git -C <aiRepo> rev-parse HEAD`
   - `sourceShortCommit`: `git -C <aiRepo> rev-parse --short=7 HEAD`
   - `sourceDirty`: `git -C <aiRepo> status --porcelain` (warn if non-empty so uncommitted source edits are noted in the snapshot)

### Step 2 — Check global core prerequisites (`~/.zcode/` and `~/.agents/skills/`)

1. Verify that `~/.zcode/agents/` contains the 4 global core agents as regular files (`general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-launcher.md`) and that `find ~/.zcode/agents -type l` prints nothing. If any of the 4 core agents are missing, install them to `~/.zcode/agents/`.
2. Verify that `~/.zcode/skills/` contains the 2 global core skills (`z-workflow`, `z-project-init`) and that `~/.agents/skills/` contains the 5 universal baseline skills (`antislop-copy`, `code-comments`, `test-quality-guardrails`, `test-quality-tdd-agents`, `test-quality-audit`).
3. Check whether any retired or misplaced entries exist globally: `z-*.md` specialists, any `z-workflow-v2` … `z-workflow-v13`, `z-proflow`, `z-flashflow`, `z-liteflow`, `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow` skill folders, the retired `workflow-author*`/`workflow-planner*` agent files in `~/.zcode/agents/`, or legacy saved workflows (`zflow-engine.dwf.ts`, `shipflow-queue.dwf.ts`) in `~/.zcode/workflows/`. Report them to the user and remove them from the global directories when the user confirms.

### Step 3 — Detect `<project>` stack and check existing snapshot for local drift

1. Inspect `<project>`'s manifests and select the matching rows from the Stack-to-Artifact Matrix above.
2. If `<project>/.zcode/hmziqrs-ai-snapshot.json` already exists:
   - Read its `sourceCommit` and `installed` file list.
   - Compute `shasum -a 256` on each currently installed file in `<project>/.zcode/` and `<project>/.agents/skills/` and compare it against the `sha256` recorded in `hmziqrs-ai-snapshot.json`.
   - If any file on disk differs from its recorded snapshot hash, report the locally modified file(s) and ask the user before overwriting them.
   - **Retired-content cleanup:** this repo no longer ships any workflow skills, saved engines, or the Shipflow artifacts. When any of `<project>/.zcode/skills/z-workflow/`, `<project>/.zcode/skills/z-workflow-v*/`, `<project>/.zcode/skills/z-proflow/`, `z-flashflow/`, `z-liteflow/`, `z-gpui-workflow/`, `z-tauri-workflow/`, `z-super-rustflow/`, `<project>/.zcode/skills/shipflow/`, `<project>/.zcode/workflows/shipflow-queue.dwf.ts`, `<project>/.zcode/workflows/zflow-engine.dwf.ts`, `<project>/.zcode/agents/shipflow-*.md`, `<project>/.zcode/agents/workflow-author*.md`, `<project>/.zcode/agents/workflow-planner*.md`, or the legacy `z-gh-operator.md` / `z-pr-merge-steward.md` / `z-queue-sentinel.md` / `z-github-project-manager.md` / `z-product-owner.md` / `z-api-contract-engineer.md` / `z-database-migration-engineer.md` / `z-product-flow-analyst.md` / `z-accessibility-auditor.md` / `z-ci-diagnostician.md` files exists, list them in the plan, delete them during Step 4 (after the same local-modification confirmation as above, with a note that everything is preserved in the source repo's `archive/` and git history), remove their entries from the snapshot's `installed` lists, and remove `<project>/.zcode/skills/` or `<project>/.zcode/workflows/` if left empty.
3. Present the proposed per-project plan to the user (or proceed directly when the user's prompt already specified the exact target project and stack):
   - Target `<project>` root and `hmziqrs/ai` snapshot (`<sourceShortCommit>`).
   - Niche agents → `<project>/.zcode/agents/`
   - Bundled `hmziqrs/ai` domain skills → `<project>/.agents/skills/`
   - External skill dependencies to verify or install in `<project>/.agents/skills/`.

### Step 4 — Copy real files and write `<project>/.zcode/hmziqrs-ai-snapshot.json`

1. Create `<project>/.zcode/agents/` and (when domain skills are selected) `<project>/.agents/skills/`.
2. Delete any retired files identified in Step 3. Copy the selected `harness/zcode/agents/z-*.md` files to `<project>/.zcode/agents/` as **regular files** (`cp`, never `ln -s`). Never copy `general-pro.md`, `general-flash.md`, `explore-flash.md`, or `workflow-launcher.md` into `<project>/.zcode/agents/`.
3. Copy selected `hmziqrs/ai` domain skills (such as `languages/rust/rust-*`) wholesale into `<project>/.agents/skills/<skill-name>/`, never from `research/` or `archive/`.
4. Write `<project>/.zcode/hmziqrs-ai-snapshot.json` with the exact schema below:

```json
{
  "schemaVersion": 2,
  "sourceRepo": "hmziqrs/ai",
  "sourceUrl": "https://github.com/hmziqrs/ai",
  "sourceCommit": "<40-char git rev-parse HEAD>",
  "sourceShortCommit": "<7-char short SHA>",
  "sourceDirty": false,
  "installedAt": "<YYYY-MM-DDTHH:MM:SSZ>",
  "detectedStacks": ["rust", "gpui"],
  "globalCore": {
    "agents": [
      "general-pro",
      "general-flash",
      "explore-flash",
      "workflow-launcher"
    ],
    "skills": [
      "z-workflow",
      "z-project-init"
    ],
    "baselineSkills": [
      "antislop-copy",
      "code-comments",
      "test-quality-guardrails",
      "test-quality-tdd-agents",
      "test-quality-audit"
    ]
  },
  "installed": {
    "agents": [
      {
        "name": "z-gpui-engineer",
        "path": ".zcode/agents/z-gpui-engineer.md",
        "sha256": "<64-char sha256>"
      }
    ],
    "domainSkills": [
      {
        "name": "rust-superopt",
        "path": ".agents/skills/rust-superopt/SKILL.md",
        "sha256": "<64-char sha256>"
      }
    ],
    "externalSkillDependencies": [
      {
        "name": "gpui-kit",
        "status": "present-local",
        "resolvedPath": ".agents/skills/gpui-kit/SKILL.md"
      }
    ]
  }
}
```

Snapshots with `schemaVersion: 1` are upgraded in place during Step 4: their `personaKitVersion` / `personaKitSha256` fields and `installed.workflowSkills` lists are dropped along with the files they described.

### Step 5 — Verify and report

Run these checks before reporting completion:
1. **No symlinks:** `find <project>/.zcode/agents -type l` prints nothing.
2. **No global-only core agents leaked into project:** none of `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-launcher.md` exists in `<project>/.zcode/agents/`.
3. **No harness skills in `.agents/skills/`:** none of `z-workflow`, `z-project-init`, or any retired workflow skill exists in `<project>/.agents/skills/` or `~/.agents/skills/`.
4. **No workflow skills per project:** `<project>/.zcode/skills/` contains no `z-*` workflow folders at all (it may be absent).
5. **Snapshot hash verification:** every entry in `installed.agents` and `installed.domainSkills` exists on disk and its `shasum -a 256` equals the recorded `sha256`.
6. **No retired or legacy files:** `<project>/.zcode/agents/` contains no `shipflow-*.md`, `workflow-author*.md`, `workflow-planner*.md`, or the legacy operator/audit agent files listed in Step 3; `<project>/.zcode/skills/` contains no workflow folders; `<project>/.zcode/workflows/` contains neither `shipflow-queue.dwf.ts` nor `zflow-engine.dwf.ts`; and the snapshot lists none of them.

End by reporting the recorded `sourceCommit`, the installed per-project agents and skills, any missing external skill dependencies, any retired workflow files removed, and that **ZCode loads agents at session start — restart ZCode or open a new session in `<project>`**.
