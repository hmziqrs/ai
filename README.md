# ai: harness kits and cross-harness skills

Harness-specific kits live under `harness/`, one subfolder per harness.
Other top-level directories except `research/` are cross-harness skill
categories. There is no installer: an AI agent pointed at this repo installs it from
[install.md](install.md); `llms.txt` is the agent entry point.

`research/` holds source reports and historical material. It is excluded from
installation. Agents may read it only on an explicit user request or during
research-related work, as required by [AGENTS.md](AGENTS.md).

```
ai/
├── harness/              harness-SPECIFIC kits (only what depends on a harness)
│   ├── zcode/            ZCode kit: agents/, skills/ (7 z-flow chains), scripts/
│   └── codex/            Codex kit: agents, profiles, plugin, model catalogs
├── copy/                 cross-harness skill category: writing & copywriting
│   └── antislop-copy/
├── coding/               cross-harness skill category: implementation & code discipline
│   ├── code-comments/
│   └── test-quality-*/   the 3 test-quality skills, listed below
├── languages/            cross-harness skill category: language ecosystems
│   └── rust/             Rust performance (the 5 rust-* skills, listed below)
├── product/              cross-harness skill category: product definition
│   ├── prd-authoring/
│   └── site-recon/
├── testing/              cross-harness skill category: verification
│   └── parity-testing/
├── research/             source reports, design studies, and historical experiments
└── install.md            the install procedure
```

## ZCode kit (`harness/zcode/`)

### Agents (`harness/zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |
| `workflow-author` | glm-5.3 | Dynamic-workflow architect and reviewer (`AUTHOR` and `REVIEW` modes) |
| `workflow-author-flash` | glm-5.3-flash | Flash dynamic-workflow architect and reviewer for `z-flashflow` |
| `workflow-planner` | glm-5.3 | Planning agent (`PLAN`/`PLAN+AUTHOR`) that gathers all facts into the WorkflowBrief for complex tasks, then dispatches the workflow-author itself |
| `workflow-planner-flash` | glm-5.3-flash | Flash planning agent for `z-flashflow` |

Only these seven core agents install globally into `~/.zcode/agents/`. The 25 reusable `z-*`
domain, verification, and product specialists install **per project**
into `<project>/.zcode/agents/` via `z-project-init` and are tracked in
`<project>/.zcode/hmziqrs-ai-snapshot.json`. Agent descriptions select expertise; the
coordinator assigns scope and explicit analysis, implementation, or review authority. See
[specialist routing](harness/zcode/skills/z-workflow/references/specialists.md).

### Workflow skills

- **Global Core (`~/.zcode/skills/`):**
  - `z-workflow`: for small work the workflow-author explores directly; for larger
    work the workflow-planner gathers every fact into the WorkflowBrief (keeping the
    coordinator's context clean) and dispatches the author. Either way the script is
    task-specific from measured signals, with
    independent worktree lanes, command gates, fresh review, and bounded feedback.
  - `z-proflow`: pro-only profile without vision.
  - `z-flashflow`: Flash-only profile with command-backed checks and labelled judgments.
  - `z-liteflow`: a small single-area template with optional domain personas.
  - `z-project-init`: initializes, audits, or updates per-project niche sub-agents,
    niche workflows, domain skills, and `.zcode/hmziqrs-ai-snapshot.json`.
- **Per-Project Niche (`<project>/.zcode/skills/` via `z-project-init`):**
  - `z-gpui-workflow` and `z-tauri-workflow`: domain profiles of z-workflow, preserving
    framework-specific gates, web/native coverage, and serialized device capture.
  - `z-super-rustflow`: measurement-first Rust optimization; analysis by default,
    implementation only when requested.
  - `shipflow`: autopilot profile of z-workflow for PRD-driven delivery on GitHub, with modes
    setup, plan, publish, implement, kickoff, dispatch, audit and supervised. Plan, publish and
    implement are independent entry points, composed only when the prompt asks, and GitHub holds
    the delivery state. The owner only prompts: setup generates the charter, labels, PRD issue,
    Project, ruleset and CI under the owner's own `gh` login (a reviewer GitHub App is optional
    hardening). GitHub mechanics come from the pasted `github-kit.dwf.ts`, and each standard task
    cycle is the pre-tested `task-cycle-template.dwf.ts`. `ai-review` is a commit status.
    Installed per project by `z-project-init`; follow its
    [installation procedure](harness/zcode/skills/shipflow/INSTALL.md).

The persona kit records source hashes and selected models, validates role loading and
checks read-only repository state. Tool metadata is advisory within workflows; change
checks do not sandbox agents or prevent external effects. Claims of verification require
command evidence. Local checkout fast-forward follows z-workflow's guarded Step 6;
remote PR merging has a separate policy. No workflow is launched by installing the kit.

Five Bun check scripts in `harness/zcode/scripts/` (`check-personas.mjs`, `check-github-kit.mjs`,
`check-shipflow-planning.mjs`, `check-autopilot.mjs`, `check-autopilot-e2e.mjs`) verify the agents,
kits and autopilot scripts without live GitHub; [install.md](install.md) lists them.
`probe-todo-backend.mjs` judges the app built by the autonomous playbook scenario R4.

Copy the ZCode agents and whole skill folders using [install.md](install.md). There are
no saved workflow engines: every run executes a script written or filled for that task.

## Cross-harness skills

Every category skill installs for every harness:

- **antislop-copy** (`copy/antislop-copy/`): cuts consumer-facing website copy to the shortest version that still answers what a visitor needs to act, without adding or bending any fact.
- **code-comments** (`coding/code-comments/`): hard comment discipline for agent-written code — zero comments by default; the code is the documentation (names, types, structure, tests). Only public-API contract docs, convention-required SAFETY blocks, and link-carrying last-resort constraint notes survive, never longer than 2 lines (3 absolute max). Kills narration, banners, change-log and AI-voice comments to save output tokens and codebase cleanliness.
- **test-quality-guardrails** (`coding/test-quality-guardrails/`): stop AI agents from generating bloated, low-value unit tests — rules-file policies with copy-paste CLAUDE.md/AGENTS.md/.cursorrules blocks: default-off test generation, read-only failing tests (never modify or delete a failing test to make it pass), targeted runs in the agent loop with the full suite in CI/hooks, and when tests are worth explicitly asking for (auth, money, parsing, public APIs).
- **test-quality-tdd-agents** (`coding/test-quality-tdd-agents/`): tests-first workflows for AI coding agents — the confirm-fail red-green loop with tests frozen during implementation, humans writing or reviewing the tests as the spec, characterization tests for legacy code, and property-based testing as the better agent assignment than hand-written example tests.
- **test-quality-audit** (`coding/test-quality-audit/`): audit and prune AI-written test suites — mutation testing as the quality gate, coverage as a vanity metric, implementation-coupling and mirroring smells, the "not too many, mostly integration" mix, risk-based coverage allocation, and a promote/flag/delete triage runbook.
- **rust-superopt** (`languages/rust/rust-superopt/`): entry point for "make this Rust faster" — benchmarks-first triage across compute vs memory vs lock vs IO (Amdahl), release-profile hygiene, measurement discipline, and codegen-inspection/PGO/BOLT tooling; routes to the other four rust skills.
- **rust-simd-crates** (`languages/rust/rust-simd-crates/`): adopt an existing SIMD-accelerated crate (JSON, hashing, compression, UTF-8 validation, base64/hex, CRC, FFT/BLAS, crypto, image codecs, search) instead of hand-writing kernels — crate selection, runtime-vs-compile-time dispatch caveats, feature-flag swaps, and the serde_json → simd-json/sonic-rs migration.
- **rust-simd-kernels** (`languages/rust/rust-simd-kernels/`): write, port, and debug hand-written SIMD/vector kernels when crates and the autovectorizer are not enough — std::simd / core::simd / wide / pulp, C-intrinsic ports, `#[target_feature]` and runtime dispatch, codegen verification via cargo-show-asm / llvm-mca / LLVM remarks.
- **rust-parallel-cache** (`languages/rust/rust-parallel-cache/`): make Rust parallel and cache-friendly at the thread and memory level — rayon pool configuration, work-stealing vs pinned-shard design, false-sharing measurement and padding, cache tiling, NUMA first-touch, and Apple Silicon QoS/E-core steering.
- **rust-fast-architecture** (`languages/rust/rust-fast-architecture/`): architecture-level speed for whole Rust services — contention math, single-writer actors, lock downgrade at commit, write-behind group commit, adaptive linger, pooling, determinism/deterministic-simulation-testing, and the async-runtime chooser.
- **prd-authoring** (`product/prd-authoring/`): staged pipeline for writing or amending a PRD that agents build from, with levels, stable IDs, Given/When/Then acceptance criteria, and lint and critic gates. Per-project: installed with Shipflow autopilot projects via `z-project-init`.
- **site-recon** (`product/site-recon/`): read-only reconnaissance of a public reference website into a discovery pack (archetypes, captures, data model, journeys, gated-area assumptions, parity spec) that a PRD and parity tests are built from. Per-project: installed with Shipflow autopilot projects via `z-project-init`.
- **parity-testing** (`testing/parity-testing/`): reference-parity tests that compare a website clone with a versioned capture of its reference site, covering aria-snapshot structure matching, masked pixel diffs of static chrome, journey replay, per-archetype parity scores, and noise and sensitivity calibration. Per-project: installed with Shipflow autopilot projects via `z-project-init`.

## Install

1. **Point an AI agent at this repo.** It reads `llms.txt` and follows
   [install.md](install.md) for ZCode or
   [harness/codex/install.md](harness/codex/install.md) for Codex.
2. **ZCode plugin.** Settings → Plugin Management → Discover → + → Git
   URL, this repo, then install the `flash-agents` plugin.
3. **skills.sh, skills only.** `npx skills add hmziqrs/ai -g -a zcode -y`
   copies the SKILL.md packs into `~/.zcode/skills/`. It skips the
   sub-agent definitions; use path 1 for those.

## Codex kit (`harness/codex/`)

The Codex kit provides Z.ai custom-provider configuration, five TOML
custom agents, six GLM-5.3 / GLM-5.3-Flash reasoning profiles, and the
four workflow skills adapted for Codex. `zai_flash`,
`zai_vision`, `zai_pro`, and `zai_reviewer` are pinned to max effort;
the read-only fan-out explorer stays at low. GLM-5.3-Flash owns vision
and computer-use work.

Install follows [harness/codex/install.md](harness/codex/install.md).
`ZAI_API_KEY` imports into the private Codex-only file
`~/.codex/secrets/zai-api-key` with mode `0600`; provider
authentication reads that file, and the key never enters the repository
or `~/.codex/config.toml`.

The four skills are also packaged as the publishable Codex plugin at
`harness/codex/plugins/zai-workflows/`. For Desktop, install
`harness/codex/scripts/codex-zai-desktop` as both `codex-zai` and
`codex-openai`.

## Adding content

[AGENTS.md](AGENTS.md) holds the layout conventions: harness kits under
`harness/<name>/`, cross-harness skills as
`<category>/<name>/SKILL.md`, folder name equal to the frontmatter
`name`.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, edit the
`model:` lines or fall back to the built-ins; the skills document that
fallback (prompt-stamp `Model: ...`).
