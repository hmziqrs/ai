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
│   ├── zcode/            ZCode kit: agents/, skills/ (7 z-flow chains), workflows/
│   └── codex/            Codex kit: agents, profiles, plugin, model catalogs
├── copy/                 cross-harness skill category: writing & copywriting
│   └── antislop-copy/
├── coding/               cross-harness skill category: code-writing discipline
│   ├── code-comments/
│   └── test-quality-*/   the 3 test-quality skills, listed below
├── languages/            cross-harness skill category: language ecosystems
│   └── rust/             Rust performance (the 5 rust-* skills, listed below)
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

Both flash agents read images natively; GLM-5.3-Flash is the multimodal tier.

### Skills (`harness/zcode/skills/`)

Six of the seven z-flow skills are thin coordinators over ONE saved
workflow: a single `CreateWorkflow saved: zflow-engine` launch with
`mode: "chain"` runs every area as its own state machine (plan →
implement → vision → judge, looping per area until clean or honestly
stopped) — the seventh, z-super-rustflow, composes its own
main-tier-only runs inline (no vision, no flash anywhere) over the
rust-* skill family. The engine
(`harness/zcode/workflows/zflow-engine.dwf.ts`, contract in
`zflow-SPEC.md` beside it) pins models per subagent in one run
(`modelProfile`: balanced = pro judgment + flash capture/audit; flash =
every role on flash), runs the mechanical gates as `world.run` behind a
literal-command allowlist, and enforces the POLICY exits as loop
conditions in code. Skills copy to `~/.zcode/skills/` — ZCode-harness
skills never go to `~/.agents/skills/` (useless in other harnesses, and
mirroring them doubles every ZCode session's skill index); the engine to
`~/.zcode/workflows/`, byte-identical to this source copy.

- **z-workflow:** the general entry point — one-launch parallel chain for complex multi-phase tasks; contention decides each area's topology (shared checkout, own worktree + port + browser session, or the serialized device lane).
- **z-proflow:** the depth-first variant — balanced profile (all-pro judgment, flash only for pixel capture/audit); ocu AX-text structural audits ride the judge's evidence.
- **z-flashflow:** the all-flash variant (`modelProfile=flash`). Pixel vision included; gates, fresh blind judges, per-finding confirmers, and code-enforced POLICY exits compensate for flash judgment, with hand-off to z-proflow when a complex area stalls.
- **z-liteflow:** one-launch lightweight chain for small single-domain tasks — one area, flash profile, `commit=false`; the coordinator commits by hand at hand-off.
- **z-gpui-workflow:** fine-grained GPUI desktop chain — pro implement/judge in-run, flash vision through the ocu device lane (AX text + decoded PNGs) for pixel design audits, and the main-thread computer-use plugin as the interactive fallback lane only.
- **z-tauri-workflow:** fine-grained Tauri v2 desktop chain — pro implement/judge in-run, flash vision with two lanes (web lane on the tauri dev-server URL for frontend areas, desktop lane via ocu for window/tray/native), and the main-thread computer-use plugin as the interactive fallback lane only.
- **z-super-rustflow:** Rust super-optimization chain over the rust-* skill family. Main-tier only — no vision node, no flash agents anywhere. Phase-gated: a read-only research phase (explorer/researcher/auditor → Amdahl-ranked findings dossier) is the default; the implement phase (instrumentation round 0, then implement → gates → fresh blind audit) runs only on explicit user opt-in and loops until an audit round surfaces zero novel findings.

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
