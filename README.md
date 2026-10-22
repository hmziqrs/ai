# ai: ZCode harness kit and cross-harness skills

The ZCode kit lives under `harness/zcode/`. Other top-level directories
except `research/` and `archive/` are cross-harness skill categories. There
is no installer: an AI agent pointed at this repo installs it from
[install.md](install.md); `llms.txt` is the agent entry point.

`research/` holds source reports and historical material. `archive/` holds
the retired pre-2026-10 workflow family. Both are excluded from
installation. Agents may read either only on an explicit user request or
during maintenance of that material, as required by [AGENTS.md](AGENTS.md).

```
ai/
├── harness/              harness-SPECIFIC kits
│   └── zcode/            ZCode kit: agents/, skills/, scripts/
├── copy/                 cross-harness skill category: writing & copywriting
│   └── antislop-copy/
├── coding/               cross-harness skill category: implementation & code discipline
│   ├── code-comments/
│   └── test-quality-*/   the 3 test-quality skills, listed below
├── i18n/                 cross-harness skill category: internationalization
│   ├── rust-i18n/
│   ├── sveltekit-paraglide/
│   ├── flutter-slang/
│   └── astro-i18n/
├── languages/            cross-harness skill category: language ecosystems
│   └── rust/             Rust performance (the 5 rust-* skills, listed below)
├── product/              cross-harness skill category: product definition
│   ├── prd-authoring/
│   └── site-recon/
├── testing/              cross-harness skill category: verification
│   └── parity-testing/
├── web-spec/             cross-harness skill category: web specification
├── research/             source reports, design studies, and historical experiments (restricted)
├── archive/              retired workflow family: skills/, agents/, saved-workflows/, scripts/ (restricted)
└── install.md            the install procedure
```

## ZCode kit (`harness/zcode/`)

### Agents (`harness/zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |
| `workflow-launcher` | glm-5.3-flash (HIGH thinking) | Full-access launcher for `z-workflow` — does everything pre-workflow (explores, bootstraps an uninitialized project, parses optional phases and round budgets from the brief, plans every area), then writes one fresh dynamic-workflows script where each area runs its own phase chain with zero global barriers, and launches it |

These four core agents are the default global set in `~/.zcode/agents/`.
The reusable `z-*` domain and verification specialists install **per
project** into `<project>/.zcode/agents/` via `z-project-init` and are
tracked in `<project>/.zcode/hmziqrs-ai-snapshot.json`. Agent descriptions
select expertise; the coordinator assigns scope and explicit analysis,
implementation, or review authority.

### Skills (`harness/zcode/skills/`)

- **`z-workflow`** (global core): the only workflow skill — parallel by
  default with zero global phase barriers. The coordinator dispatches one
  `workflow-launcher` agent with the user's brief; the launcher does
  everything pre-workflow (including bootstrapping an uninitialized
  project) and launches one fresh script on the bundled `dynamic-workflows`
  contract in which every task is its own area running its own chain —
  implement → optional audit → optional test → … — inside its own fan-out
  callback, so an area advances the moment its own work lands and never
  waits for other areas. Optional verification phases run only when the
  brief names them (default 1 round, explicit N, or until-zero-issues) and
  attach per area — vision/browser only to UI-producing areas, native
  testing only to device-targeting areas; per-area checks stay scoped to
  the area's own files; whole-tree gates run once at the final join. Areas
  carry niche personas distilled from matching `z-*` specialists; vision
  interpreters pin to GLM-5.3-Flash (HIGH) or GLM-5.3 on request. No git
  worktrees/branches/commits — areas edit
  the current checkout directly. A live per-area board shows the pipeline
  while it runs. Fresh script per task, nothing saved.
- **`z-project-init`** (global core): initializes, audits, or updates
  per-project niche sub-agents, domain skills, and
  `.zcode/hmziqrs-ai-snapshot.json`.

There are no saved workflow engines and no versioned workflow skills
anymore: the entire previous family (original z-workflow, v2–v13,
z-proflow/z-flashflow/z-liteflow, the domain workflows, and all
workflow-author/planner agents) is retired in `archive/`.

## Cross-harness skills

Every category skill installs for every harness:

- **antislop-copy** (`copy/antislop-copy/`): cuts consumer-facing website copy to the shortest version that still answers what a visitor needs to act, without adding or bending any fact.
- **code-comments** (`coding/code-comments/`): hard comment discipline for agent-written code — zero comments by default; the code is the documentation (names, types, structure, tests). Only public-API contract docs, convention-required SAFETY blocks, and link-carrying last-resort constraint notes survive, never longer than 2 lines (3 absolute max). Kills narration, banners, change-log and AI-voice comments to save output tokens and codebase cleanliness.
- **test-quality-guardrails** (`coding/test-quality-guardrails/`): stop AI agents from generating bloated, low-value unit tests — rules-file policies with copy-paste CLAUDE.md/AGENTS.md/.cursorrules blocks: default-off test generation, read-only failing tests (never modify or delete a failing test to make it pass), targeted runs in the agent loop with the full suite in CI/hooks, and when tests are worth explicitly asking for (auth, money, parsing, public APIs).
- **test-quality-tdd-agents** (`coding/test-quality-tdd-agents/`): tests-first workflows for AI coding agents — the confirm-fail red-green loop with tests frozen during implementation, humans writing or reviewing the tests as the spec, characterization tests for legacy code, and property-based testing as the better agent assignment than hand-written example tests.
- **test-quality-audit** (`coding/test-quality-audit/`): audit and prune AI-written test suites — mutation testing as the quality gate, coverage as a vanity metric, implementation-coupling and mirroring smells, the "not too many, mostly integration" mix, risk-based coverage allocation, and a promote/flag/delete triage runbook.
- **rust-i18n** (`i18n/rust-i18n/`): Longbridge `rust-i18n` for Rust/GPUI desktop localization — `i18n!`/`t!`, YAML/JSON/TOML locale files, runtime `set_locale`, `gpui-component` string overrides via `rust_i18n::extend!`, and `cargo i18n` extraction.
- **sveltekit-paraglide** (`i18n/sveltekit-paraglide/`): Paraglide JS v2 for SvelteKit — Vite plugin, `messages/<locale>.json`, `m.*` runtime, `paraglideMiddleware` and reroute wiring, locale strategies, and SSR/prerender pitfalls.
- **flutter-slang** (`i18n/flutter-slang/`): slang v4 for Flutter — `slang.yaml`/`build.yaml`, typed JSON sources, `context.t`, `LocaleSettings` switching and persistence, drift checks, with the official gen-l10n/ARB alternative.
- **astro-i18n** (`i18n/astro-i18n/`): Astro's built-in i18n routing — `i18n` config, `astro:i18n` helpers, per-locale content collections, the UI-string dictionary recipe, and when to add Paraglide JS.
- **rust-superopt** (`languages/rust/rust-superopt/`): entry point for "make this Rust faster" — benchmarks-first triage across compute vs memory vs lock vs IO (Amdahl), release-profile hygiene, measurement discipline, and codegen-inspection/PGO/BOLT tooling; routes to the other four rust skills.
- **rust-simd-crates** (`languages/rust/rust-simd-crates/`): adopt an existing SIMD-accelerated crate (JSON, hashing, compression, UTF-8 validation, base64/hex, CRC, FFT/BLAS, crypto, image codecs, search) instead of hand-writing kernels — crate selection, runtime-vs-compile-time dispatch caveats, feature-flag swaps, and the serde_json → simd-json/sonic-rs migration.
- **rust-simd-kernels** (`languages/rust/rust-simd-kernels/`): write, port, and debug hand-written SIMD/vector kernels when crates and the autovectorizer are not enough — std::simd / core::simd / wide / pulp, C-intrinsic ports, `#[target_feature]` and runtime dispatch, codegen verification via cargo-show-asm / llvm-mca / LLVM remarks.
- **rust-parallel-cache** (`languages/rust/rust-parallel-cache/`): make Rust parallel and cache-friendly at the thread and memory level — rayon pool configuration, work-stealing vs pinned-shard design, false-sharing measurement and padding, cache tiling, NUMA first-touch, and Apple Silicon QoS/E-core steering.
- **rust-fast-architecture** (`languages/rust/rust-fast-architecture/`): architecture-level speed for whole Rust services — contention math, single-writer actors, lock downgrade at commit, write-behind group commit, adaptive linger, pooling, determinism/deterministic-simulation-testing, and the async-runtime chooser.
- **prd-authoring** (`product/prd-authoring/`): staged pipeline for writing or amending a PRD that agents build from, with levels, stable IDs, Given/When/Then acceptance criteria, and lint and critic gates. Per-project niche: installed by `z-project-init` into projects that need it.
- **site-recon** (`product/site-recon/`): read-only reconnaissance of a public reference website into a discovery pack (archetypes, captures, data model, journeys, gated-area assumptions, parity spec) that a PRD and parity tests are built from. Per-project niche: installed by `z-project-init` into projects that need it.
- **parity-testing** (`testing/parity-testing/`): reference-parity tests that compare a website clone with a versioned capture of its reference site, covering aria-snapshot structure matching, masked pixel diffs of static chrome, journey replay, per-archetype parity scores, and noise and sensitivity calibration. Per-project niche: installed by `z-project-init` into projects that need it.

## Install

1. **Point an AI agent at this repo.** It reads `llms.txt` and follows
   [install.md](install.md).
2. **skills.sh, skills only.** `npx skills add hmziqrs/ai -g -a zcode -y`
   copies the SKILL.md packs into `~/.zcode/skills/`. It skips the
   sub-agent definitions; use path 1 for those.

## Adding content

[AGENTS.md](AGENTS.md) holds the layout conventions: the harness kit under
`harness/zcode/`, cross-harness skills as `<category>/<name>/SKILL.md`,
folder name equal to the frontmatter `name`.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, edit the
`model:` lines or fall back to the built-ins.
