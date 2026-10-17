---
name: z-project-init
description: >-
  Initializes, audits, or updates a target project with per-project ZCode niche
  sub-agents (.zcode/agents/z-*.md), niche workflow skills (.zcode/skills/),
  niche domain skills (.agents/skills/), and a versioned hmziqrs/ai snapshot
  manifest (.zcode/hmziqrs-ai-snapshot.json). Enforces the global-vs-project
  split: core agents (general-pro, general-flash, explore-flash,
  workflow-author, workflow-author-flash, workflow-planner,
  workflow-planner-flash) and core workflows (z-workflow,
  z-proflow, z-flashflow, z-liteflow, z-project-init) stay global, while niche
  specialists, niche workflows (z-gpui-workflow, z-tauri-workflow,
  z-super-rustflow, shipflow), and stack skills install per project.
---

# z-project-init

`z-project-init` initializes or updates a project's local ZCode harness configuration (`<project>/.zcode/` and `<project>/.agents/skills/`) from `hmziqrs/ai` and records the exact source commit and file hashes in `<project>/.zcode/hmziqrs-ai-snapshot.json`.

Installing all 27 `z-*` specialists, niche workflows, and stack-specific skills globally bloats every session's agent/skill index and forces every project on the machine to update simultaneously whenever `hmziqrs/ai` changes. This skill isolates niche sub-agents, workflows, and domain skills to the project that actually uses them and pins each project to an explicit `hmziqrs/ai` snapshot.

## When to Use

Use this skill when the user asks to:
- Initialize a repository or project for ZCode workflows or sub-agents (`z-project-init`, "init zcode for this project", "install niche agents/skills for this repo").
- Add a specific stack's workflow and specialists (such as GPUI, Tauri, Rust superopt, Axum, Svelte, Astro, ElysiaJS, Cloudflare, TanStack, Flutter, or Shipflow) to one project.
- Check whether a project's installed `.zcode/` agents and skills have drifted from its recorded `hmziqrs/ai` snapshot, or upgrade one project to a newer `hmziqrs/ai` commit without touching other projects.
- Clean up niche agents or workflows that were accidentally installed into global `~/.zcode/` or `~/.agents/skills/`.

## Global vs Per-Project Policy (Hard Rule)

Never mix global core files with per-project niche files:

| Tier | Scope & Destination | Exact Content |
|---|---|---|
| **Global Core Agents** | `~/.zcode/agents/` (machine-wide, regular files, never symlinks) | **Only the 7 core agents:** `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, `workflow-planner-flash.md`. Never install these into `<project>/.zcode/agents/`, and never install `z-*.md` into `~/.zcode/agents/`. |
| **Global Core Workflow Skills** | `~/.zcode/skills/` (machine-wide, whole folders) | **Only the 5 general skills:** `z-workflow/`, `z-proflow/`, `z-flashflow/`, `z-liteflow/`, `z-project-init/`. Never install `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`, or `shipflow` into `~/.zcode/skills/`, and never copy ZCode harness skills into `~/.agents/skills/`. |
| **Global Universal Baseline Skills** | `~/.agents/skills/` (machine-wide, whole folders) | **Only universal cross-project policies:** `antislop-copy/`, `code-comments/`, `test-quality-guardrails/`, `test-quality-tdd-agents/`, `test-quality-audit/`. |
| **Per-Project Niche Sub-Agents** | `<project>/.zcode/agents/` (regular files, never symlinks) | **Only the `z-*.md` specialists** required by `<project>`'s actual manifests and deliverables. |
| **Per-Project Niche Workflows** | `<project>/.zcode/skills/` (whole folders) | **Only the niche workflows** required by `<project>`: `z-gpui-workflow/`, `z-tauri-workflow/`, `z-super-rustflow/`, or `shipflow/` (plus `<project>/.zcode/skills/z-workflow/` so the project pins its own `persona-kit.dwf.ts` and `references/specialists.md` at the snapshot commit). Never copy these into `<project>/.agents/skills/`. |
| **Per-Project Niche Domain Skills** | `<project>/.agents/skills/` (whole folders) | **Only the stack/domain skills** required by `<project>`: `languages/rust/rust-*` (`rust-superopt`, `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`) and required external framework skills (`gpui-kit`, `gpui-kit-design-guides`, `tauri-v2`, `tauri`, `svelte-code-writer`, `cloudflare`, etc.). |
| **Per-Project Snapshot Manifest** | `<project>/.zcode/hmziqrs-ai-snapshot.json` | Records the `hmziqrs/ai` commit SHA, timestamp, `persona-kit` version/sha256, detected stack profiles, and per-file `sha256` hashes for drift detection and isolated per-project updates. |

## Stack-to-Artifact Matrix

Inspect the target project's manifests (`Cargo.toml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `package.json`, `wrangler.toml`/`wrangler.jsonc`/`cloudflare.config.ts`, `svelte.config.*`, `astro.config.*`, `pubspec.yaml`) before selecting artifacts. Select only the profiles that match the project or the user's explicit request:

| Detected project stack / trigger | Per-project `.zcode/agents/` to copy | Per-project `.zcode/skills/` to copy | Per-project `.agents/skills/` (`hmziqrs/ai` + external dependencies) |
|---|---|---|---|
| **Base project pin** (every initialized project) | `z-ci-diagnostician.md` (optional: `z-github-project-manager.md` when GitHub issues/milestones are managed) | `z-workflow/` (pins `persona-kit.dwf.ts` and `references/specialists.md` to the project snapshot) | None (uses global `code-comments` and `test-quality-*` from `~/.agents/skills/`, or copies them locally if the project requests a self-contained checkout) |
| **Rust library / binary / service** (`Cargo.toml` present) | `z-rust-engineer.md`, `z-rust-async-engineer.md` (when `tokio`/`futures`/`compio` present), `z-unsafe-ffi-auditor.md` (when `unsafe`/FFI/SIMD present) | — | External: `rust-best-practices`, `rust-testing`, `rust-async-patterns` (when async) |
| **Rust performance / optimization** (hot-path crates, `benches/`, `criterion`/`divan`/`gungraun`, or user opt-in) | `z-rust-perf-engineer.md`, `z-rust-memory-engineer.md`, `z-rust-simd-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` | `z-super-rustflow/` | From `hmziqrs/ai`: `rust-superopt/`, `rust-simd-crates/`, `rust-simd-kernels/`, `rust-parallel-cache/`, `rust-fast-architecture/`. External when applicable: `rust-string-perf`, `rust-succinct-structures`, `rust-service-comms`, `rust-embedded-storage` |
| **GPUI desktop app** (`gpui-kit` or `gpui` in `Cargo.toml`) | `z-gpui-engineer.md`, `z-native-device-verifier.md`, `z-accessibility-auditor.md`, `z-product-flow-analyst.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` (+ `z-rust-perf-engineer.md` / `z-rust-memory-engineer.md` when needed) | `z-gpui-workflow/`, `z-workflow/` | External: `gpui-kit`, `gpui-kit-design-guides`, `open-computer-use`, `rust-best-practices`, `rust-testing`, `rust-async-patterns` |
| **Tauri v2 desktop / mobile app** (`src-tauri/tauri.conf.json` or `tauri` in `Cargo.toml`) | `z-tauri-integrator.md`, `z-native-device-verifier.md`, `z-api-contract-engineer.md`, `z-accessibility-auditor.md`, `z-product-flow-analyst.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md`, `z-unsafe-ffi-auditor.md` + matching frontend specialist (`z-svelte-engineer.md`, `z-tanstack-engineer.md`, `z-astro-engineer.md`) | `z-tauri-workflow/`, `z-workflow/` | External: `tauri-v2`, `tauri`, `understanding-tauri-architecture`, `calling-rust-from-tauri-frontend`, `configuring-tauri-permissions`, `integrating-tauri-js-frontends`, `open-computer-use`, `rust-best-practices`, `rust-testing` + frontend skills |
| **Axum / Tower HTTP service** (`axum` in `Cargo.toml`) | `z-axum-engineer.md`, `z-api-contract-engineer.md`, `z-rust-engineer.md`, `z-rust-async-engineer.md` (+ `z-database-migration-engineer.md` when DB present) | — | External: `axum-web-framework`, `axum-code-review`, `rust-service-comms`, `rust-async-patterns`, `rust-best-practices`, `rust-testing` |
| **Svelte 5 / SvelteKit** (`svelte` in `package.json`) | `z-svelte-engineer.md`, `z-accessibility-auditor.md`, `z-product-flow-analyst.md` | — | External: `svelte-code-writer`, `svelte-core-bestpractices` (+ `shadcn-svelte`, `TanStack Form`, `agent-browser` when applicable) |
| **Astro** (`astro` in `package.json`) | `z-astro-engineer.md`, `z-accessibility-auditor.md`, `z-product-flow-analyst.md` | — | External: `astro` (+ `starwind-ui`, `seo-audit`, `programmatic-seo` when applicable) |
| **TanStack** (`@tanstack/*` in `package.json`) | `z-tanstack-engineer.md` (+ `z-api-contract-engineer.md` when Start/RPC/Query contracts are in scope) | — | External: package-matched TanStack Intent / community skills per `z-tanstack-engineer.md` |
| **Cloudflare Workers / D1 / R2 / KV / DO** (`wrangler.*`, `cloudflare.config.ts`, `@cloudflare/*`, `agents`) | `z-cloudflare-engineer.md`, `z-api-contract-engineer.md` (+ `z-database-migration-engineer.md` when D1/migrations exist) | — | External: `cloudflare`, `workers-best-practices` (+ `durable-objects`, `wrangler`, `cf-cli`, `workers-profiling`, `agents-sdk`, `drizzle-orm-d1` as needed) |
| **ElysiaJS** (`elysia` in `package.json`) | `z-elysiajs-engineer.md`, `z-api-contract-engineer.md` | — | External: `elysiajs` (+ `better-auth`, `drizzle-orm-d1` when applicable) |
| **Flutter / Dart** (`pubspec.yaml` with `flutter`) | `z-flutter-engineer.md`, `z-native-device-verifier.md`, `z-accessibility-auditor.md`, `z-product-flow-analyst.md` | — | External: `flutter-*` and `dart-*` skills matching the project's tasks |
| **Database / schema migrations** (`migrations/`, `sqlx`, `drizzle-kit`, `rusqlite`, `fjall`, `redb`, `heed`) | `z-database-migration-engineer.md` | — | External: `drizzle-orm-d1` (for D1) or `rust-embedded-storage` (for Rust embedded KV/SQLite) |
| **Shipflow GitHub issue queue** (explicit opt-in only; framework-agnostic) | `z-gh-operator.md`, `z-pr-merge-steward.md`, `z-queue-sentinel.md`, `z-security-auditor.md` + the project's selected `z-*.md` stack specialists from the rows above | `shipflow/`, `z-workflow/` (then follow `shipflow/INSTALL.md` for the repository's GitHub setup) | Stack skills for the project's selected `z-*` specialists |

## Execution Procedure

### Step 1 — Locate `hmziqrs/ai` and record its snapshot commit

1. Resolve the local `hmziqrs/ai` source directory (never read or copy anything under `research/`):
   - Use the path provided by the user, the current workspace if it is `hmziqrs/ai`, or a clean clone of `https://github.com/hmziqrs/ai.git`.
2. Record the exact snapshot metadata from the `hmziqrs/ai` repository:
   - `sourceCommit`: `git -C <aiRepo> rev-parse HEAD`
   - `sourceShortCommit`: `git -C <aiRepo> rev-parse --short=7 HEAD`
   - `sourceDirty`: `git -C <aiRepo> status --porcelain` (warn if non-empty so uncommitted source edits are noted in the snapshot)
   - `personaKitVersion`: marker from `harness/zcode/skills/z-workflow/persona-kit.dwf.ts` (currently `v4`)
   - `personaKitSha256`: `shasum -a 256 <aiRepo>/harness/zcode/skills/z-workflow/persona-kit.dwf.ts`

### Step 2 — Check global core prerequisites (`~/.zcode/` and `~/.agents/skills/`)

1. Verify that `~/.zcode/agents/` contains the 7 global core agents as regular files (`general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, `workflow-planner-flash.md`) and that `find ~/.zcode/agents -type l` prints nothing. If any of the 7 core agents are missing, install them to `~/.zcode/agents/`.
2. Verify that `~/.zcode/skills/` contains the 5 global core skills (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`, `z-project-init`) and that `~/.agents/skills/` contains the 5 universal baseline skills (`antislop-copy`, `code-comments`, `test-quality-guardrails`, `test-quality-tdd-agents`, `test-quality-audit`).
3. Check whether any niche `z-*.md`, legacy `shipflow-*.md`, `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`, or `shipflow` entries exist globally in `~/.zcode/agents/` or `~/.zcode/skills/`, or legacy saved workflows (`zflow-engine.dwf.ts`, `shipflow-queue.dwf.ts`) exist in `~/.zcode/workflows/`. Report them to the user and remove them from the global directory only when the user confirms migrating to strict per-project isolation.

### Step 3 — Detect `<project>` stack and check existing snapshot for local drift

1. Inspect `<project>`'s manifests and select the matching rows from the Stack-to-Artifact Matrix above.
2. If `<project>/.zcode/hmziqrs-ai-snapshot.json` already exists:
   - Read its `sourceCommit`, `personaKitVersion`, and `installed` file list.
   - Compute `shasum -a 256` on each currently installed file in `<project>/.zcode/` and `<project>/.agents/skills/` and compare it against the `sha256` recorded in `hmziqrs-ai-snapshot.json`.
   - If any file on disk differs from its recorded snapshot hash, report the locally modified file(s) and ask the user before overwriting them.
   - **Legacy cleanup:** `hmziqrs/ai` no longer ships saved engines, a Shipflow queue workflow, or dedicated Shipflow role agents. When any of `<project>/.zcode/workflows/shipflow-queue.dwf.ts`, `<project>/.zcode/workflows/zflow-engine.dwf.ts`, or `<project>/.zcode/agents/shipflow-*.md` exists, list them in the plan, delete them during Step 4 (after the same local-modification confirmation as above), remove their entries from the snapshot's `installed` lists, and remove `<project>/.zcode/workflows/` if it is left empty. When Shipflow was installed, select the new Shipflow row so its replacement agents are installed.
3. Present the proposed per-project plan to the user (or proceed directly when the user's prompt already specified the exact target project and stack):
   - Target `<project>` root and `hmziqrs/ai` snapshot (`<sourceShortCommit>`).
   - Niche agents → `<project>/.zcode/agents/`
   - Niche workflow skills → `<project>/.zcode/skills/`
   - Bundled `hmziqrs/ai` domain skills → `<project>/.agents/skills/`
   - External skill dependencies to verify or install in `<project>/.agents/skills/`.

### Step 4 — Copy real files and write `<project>/.zcode/hmziqrs-ai-snapshot.json`

1. Create `<project>/.zcode/agents/`, `<project>/.zcode/skills/`, and (when domain skills are selected) `<project>/.agents/skills/`.
2. Delete any legacy files identified in Step 3. Copy the selected `harness/zcode/agents/z-*.md` files to `<project>/.zcode/agents/` as **regular files** (`cp`, never `ln -s`). Never copy `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, or `workflow-planner-flash.md` into `<project>/.zcode/agents/`.
3. Copy `<aiRepo>/harness/zcode/skills/z-workflow/` and the selected niche workflow folders (`z-gpui-workflow/`, `z-tauri-workflow/`, `z-super-rustflow/`, `shipflow/`) wholesale into `<project>/.zcode/skills/`. Never copy ZCode workflow skills into `<project>/.agents/skills/`.
4. Copy selected `hmziqrs/ai` domain skills (such as `languages/rust/rust-*`) wholesale into `<project>/.agents/skills/<skill-name>/`, never from `research/`.
5. Write `<project>/.zcode/hmziqrs-ai-snapshot.json` with the exact schema below:

```json
{
  "schemaVersion": 1,
  "sourceRepo": "hmziqrs/ai",
  "sourceUrl": "https://github.com/hmziqrs/ai",
  "sourceCommit": "<40-char git rev-parse HEAD>",
  "sourceShortCommit": "<7-char short SHA>",
  "sourceDirty": false,
  "installedAt": "<YYYY-MM-DDTHH:MM:SSZ>",
  "personaKitVersion": "v4",
  "personaKitSha256": "<64-char sha256 of persona-kit.dwf.ts>",
  "detectedStacks": ["rust", "gpui"],
  "globalCore": {
    "agents": [
      "general-pro",
      "general-flash",
      "explore-flash",
      "workflow-author",
      "workflow-author-flash",
      "workflow-planner",
      "workflow-planner-flash"
    ],
    "workflowSkills": [
      "z-workflow",
      "z-proflow",
      "z-flashflow",
      "z-liteflow",
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
    "workflowSkills": [
      {
        "name": "z-workflow",
        "path": ".zcode/skills/z-workflow/SKILL.md",
        "sha256": "<64-char sha256>"
      },
      {
        "name": "z-gpui-workflow",
        "path": ".zcode/skills/z-gpui-workflow/SKILL.md",
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

### Step 5 — Verify and report

Run these checks before reporting completion:
1. **No symlinks:** `find <project>/.zcode/agents -type l` prints nothing.
2. **No global-only core agents leaked into project:** none of `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, `workflow-planner-flash.md` exists in `<project>/.zcode/agents/`.
3. **No harness skills in `.agents/skills/`:** none of `z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`, `z-project-init`, `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`, or `shipflow` exists in `<project>/.agents/skills/` or `~/.agents/skills/`.
4. **Persona-kit drift check:** `<project>/.zcode/skills/z-workflow/persona-kit.dwf.ts` matches `personaKitSha256` in `<project>/.zcode/hmziqrs-ai-snapshot.json`.
5. **Snapshot hash verification:** every entry in `installed.agents`, `installed.workflowSkills`, and `installed.domainSkills` exists on disk and its `shasum -a 256` equals the recorded `sha256`.
6. **No legacy files:** `<project>/.zcode/agents/` contains no `shipflow-*.md`, `<project>/.zcode/workflows/` contains neither `shipflow-queue.dwf.ts` nor `zflow-engine.dwf.ts`, and the snapshot lists none of them.

End by reporting the recorded `sourceCommit`, the installed per-project agents, workflows, and skills, any missing external skill dependencies, and that **ZCode loads agents at session start — restart ZCode or open a new session in `<project>`**.
