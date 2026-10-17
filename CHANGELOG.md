# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/), released as git tags (`vX.Y.Z`).

## [Unreleased]

### Changed
- **No saved engines: every z-flow run executes a script written for its
  task.** z-workflow writes a fresh script per task through the
  workflow-author; for larger work the new `workflow-planner` /
  `workflow-planner-flash` agents gather every fact into the WorkflowBrief
  and dispatch the author, so the coordinator never gathers facts
  (Pillar 9). The only reusable workflow code is the persona kit
  (`harness/zcode/skills/z-workflow/persona-kit.dwf.ts`) and z-liteflow's
  pre-tested template. No skill offers to save an engine or to
  SaveWorkflow a generated script.
- **Shipflow is now a framework-agnostic z-workflow profile.** One cycle
  takes one GitHub issue through a fresh z-workflow run on the COMPLEX
  path, with the normal approval dialog, a run-owned `wf/shipflow-<N>`
  worktree, planner-discovered gates, merge policy in script code, and
  one documented exception to z-workflow's no-push rule: a single
  non-force push of the run's own branch. Roles formerly carried by
  dedicated agents map onto the core agents and `z-*` specialists.
- **z-project-init** installs Shipflow as the `shipflow/` skill plus the
  four new `z-*` agents and the project's selected specialists, and
  removes legacy per-project engine, queue, and role files (with their
  snapshot entries) on update.
- **Repo restructured by kind.** `zcode/` → `harness/zcode/` and
  `codex/` → `harness/codex/` — harness-specific kits live under
  `harness/`, cross-harness skills in top-level categories. The
  `.zcode-plugin/plugin.json` manifest paths and all documentation
  (README, llms.txt, AGENTS.md, install docs) follow.

### Added
- `workflow-planner` and `workflow-planner-flash` core agents (Global
  Core is now seven agents).
- Four per-project niche agents for Shipflow-style GitHub work, usable by
  any z-workflow run: `z-gh-operator` (exact listed `gh` label, assignee,
  comment, and PR-create operations, each verified by re-read),
  `z-pr-merge-steward` (typed merge-readiness facts; merges only one
  authorized reviewed head with `--match-head-commit`), `z-queue-sentinel`
  (read-only queue health), and `z-security-auditor` (read-only diff
  security audit).
- Migration plan: `research/harness/zcode/zflow-migration-plan.md`.
- **`coding/` category: three `test-quality-*` skills.** Test-discipline
  suite for AI-heavy development, every claim, quote, and link traced to
  a 133-source research sweep (`research/coding/test-quality/ai-generated-tests-research.md`):
  `test-quality-guardrails` — stop the bloat with rules-file policies
  (default-off test generation, read-only failing tests, targeted
  in-loop runs with the full suite in CI/hooks) shipped as copy-paste
  CLAUDE.md/AGENTS.md/.cursorrules blocks; `test-quality-tdd-agents` —
  tests-first agent workflows (confirm-fail red-green loop with frozen
  tests, tests as the spec humans own, characterization tests for legacy
  code, property-based testing as the better agent assignment); and
  `test-quality-audit` — prune AI-written suites (mutation testing as
  the quality gate, coverage as a vanity metric, mirroring and
  over-mocking smells, the "not too many, mostly integration" mix, and
  a promote/flag/delete triage runbook).
- **z-super-rustflow skill** — the Rust super-optimization chain: a
  read-only research phase (explorer/researcher/auditor nodes →
  Amdahl-ranked findings dossier with owner skill, lever, risk, and
  measurement plan) as the DEFAULT with zero repo edits, an opt-in
  implement phase that runs only on explicit user ask (round 0 =
  criterion benchmark + parity oracle + saved baseline, then implement →
  gates → fresh blind audit rounds scored against the rust-superopt
  done-rubric), main-tier only — no vision node, no flash agents
  anywhere — and a convergence loop that exits clean only when a full
  audit round finds zero NOVEL registry findings. Composes its own
  inline runs over the rust-* family rather than chaining over
  zflow-engine.
- **`coding/` category: `code-comments` skill.** Hard comment discipline
  for agent-written code: zero comments by default — names, types,
  structure, and tests carry the meaning. Exactly three earning
  categories survive (public-API contract docs, convention-required
  SAFETY blocks, link-carrying last-resort constraint notes pushed
  toward a test or lint first), each capped at 2 lines, 3 absolute max;
  doubt kills, and an unearned comment is deleted, never rewritten.
  Narration, banners, change-log and AI-voice comments are banned
  outright — saving output tokens and keeping the codebase clean.
- **`languages/rust/` category group: five Rust super-optimization skills.** Plain
  cross-harness skills (no harness mechanisms), each folder carrying
  `SKILL.md` plus a `references/` pack: `rust-superopt` (the router —
  benchmark-first triage across compute/memory/lock/IO, release-profile
  hygiene, measurement discipline, PGO/BOLT and codegen-inspection
  tooling), `rust-simd-crates` (adopting SIMD-accelerated crates —
  simd-json/sonic-rs, hashing, compression, codecs, BLAS — over
  hand-writing kernels), `rust-simd-kernels` (hand-written and portable
  SIMD kernels: std::simd, intrinsics, `#[target_feature]`, runtime
  dispatch, codegen verification), `rust-parallel-cache` (rayon pools,
  core pinning, false sharing, NUMA first-touch, cache tiling, Apple
  Silicon QoS steering), and `rust-fast-architecture` (single-writer
  service architecture, contention math, write-behind group commit,
  deterministic simulation testing, async-runtime chooser).
- **z-tauri-workflow skill** — the Tauri v2 twin of z-gpui-workflow: a
  fine-grained desktop chain with two-lane vision (frontend areas audited
  on the tauri dev-server URL via the web lane; window/tray/native via the
  desktop ocu lane), Tauri-specific area slicing (Rust core under
  `src-tauri/`, frontend, capabilities/config), and non-mutating gate forms
  for the cargo + frontend toolchains.
- **Cross-harness skill categories.** Every top-level directory except
  `harness/` is a category holding plain-SKILL.md skills that install
  for every harness. First category and first skill: `copy/antislop-copy`
  — cuts consumer-facing website copy (homepages, landing pages,
  feature grids, pricing, about, FAQ, release posts, page titles and
  meta descriptions) to the shortest version that still answers the
  visitor's questions, without adding or bending any fact.

### Removed
- The saved engine and its contract: `harness/zcode/workflows/`
  (`zflow-engine.dwf.ts`, `zflow-SPEC.md`, `shipflow-queue.dwf.ts`) and the
  optional install step that copied the engine to `~/.zcode/workflows/`.
- The 20 dedicated Shipflow role agents (`harness/zcode/agents/shipflow-*.md`),
  `harness/zcode/skills/shipflow/references/knowledge/`, and
  `harness/zcode/scripts/check-shipflow.mjs`.
- Research documents for the superseded design: the V3 unification plan,
  `research/harness/zcode/shipflow/`, and `research/harness/zcode/history/`
  (including the zflow-port development snapshots).
- **The installers.** `bin/ai.js`, `bin/codex-ai.js`, and the
  `npx github:hmziqrs/ai` entry are gone. Installation is
  agent-driven: an AI agent (or human) follows `install.md` /
  `harness/codex/install.md`, which now carry the full procedure the
  scripts used to encode (marked provider block, `0600` secret file,
  `__ZAI_MODEL_CATALOG__` rendering, category skills). The ZCode
  plugin manifest and the skills.sh path remain as declarative
  alternatives.

## [1.0.0] - 2026-09-22

### Changed
- **The five z-flow skills are rewritten as thin chain-coordinator
  wrappers over one saved workflow node.** z-workflow, z-proflow,
  z-flashflow, z-liteflow, and z-gpui-workflow keep their names,
  folders, and triggers; the main agent is now a thin sequencer that
  launches tier-pure `zflow-engine` runs (implement / vision / judge)
  and holds only compact control data between runs. The state file,
  the append/compaction machinery, and the sequencer discipline
  tables are deleted. The decider's POLICY exit rules became loop
  conditions in code — in-run round caps and stagnation counters,
  coordinator counts between rounds — so no model judges an exit.
  Mechanical gates run as `world.run` behind a literal-command
  allowlist (npm, pnpm, yarn, bun, cargo, make, go, python3, pytest,
  npx, git read-only subcommands). Vision is flash-tier subagents
  driving `agent-browser` (web) and `ocu` (desktop AX text + decoded
  pixel PNGs). Tier mixing goes through per-run `subagent_model`
  pins; mid-run cross-tier needs go through the batched escalation
  bridge. Commit messages are drafted by a named Committer agent
  while the script executes the mutations serialized via
  `world.run("git", …)`; `commit: false` is supported.
- Verified-facts basis: every mechanism above was live-tested on
  2026-09-21/22 — one model per run, escalation bridging, flash
  image reading, and agent-browser / ocu driven from subagents.

### Added
- **zflow-engine** — the single saved dynamic workflow every z-flow
  skill chains over: `zcode/workflows/zflow-engine.dwf.ts`, with its
  contract in `zcode/workflows/zflow-SPEC.md`. The engine's install
  path is `~/.zcode/workflows/` (`zcode/workflows/` is the source
  copy).

### Breaking
- The five skills now require ZCode dynamic workflows; the old
  state-file orchestration loop is gone.
- Deployed originals were backed up at
  `~/.agents/skills-backup-2026-09-21` before this release.

[1.0.0]: https://github.com/hmziqrs/ai/compare/v0.5.0...v1.0.0

## [0.5.0] - 2026-09-07

### Added
- **z-proflow** skill — the depth-first variant: same loop as
  z-flashflow but every sub-agent (implementers, committer, judge,
  decider) dispatches `general-pro` (glm-5.3 pinned); no router
  (inherited); no vision phase or evidence layer at all — the
  main-tier model has no image support, and visual verification is a
  documented hand-off to z-workflow's flash vision agent. Phases 0-5.

[0.5.0]: https://github.com/hmziqrs/ai/compare/v0.4.0...v0.5.0

## [0.4.0] - 2026-09-07

### Changed
- **z-flashflow: removed the router phase.** One model tier means
  nothing to route — the main thread now surveys once at init and
  writes the routing map itself (compact control data, context
  discipline intact). Phases renumbered 0-6, model-routing table row
  removed, all cross-references updated.

[0.4.0]: https://github.com/hmziqrs/ai/compare/v0.3.0...v0.4.0

## [0.3.0] - 2026-09-07

### Changed
- **Renamed `flash-flow` skill to `z-flashflow`** (directory and
  frontmatter name) to match the z- family naming: z-workflow,
  z-flashflow, z-liteflow. Breaking for references to the old name.

[0.3.0]: https://github.com/hmziqrs/ai/compare/v0.2.0...v0.3.0

## [0.2.0] - 2026-09-07

### Added
- **flash-flow** skill — the all-flash variant of z-workflow: every
  sub-agent role (router, implementers, committer, judge, decider,
  vision) dispatches `general-flash` (glm-5.3-flash pinned); no
  main-tier model anywhere. Flash judgment is compensated by gates,
  fresh auditors, fix rounds, and the decider's POLICY checkpoint, with
  an explicit escalation path to z-workflow.
- Versioning infrastructure: `version` fields in `package.json`,
  `.zcode-plugin/plugin.json`, `.claude-plugin/plugin.json`, and the
  marketplace entry (the plugin update gate), this CHANGELOG, and
  `vX.Y.Z` git tags — enabling `npx github:hmziqrs/ai#v0.2.0` pinned
  installs.

### Changed
- Installer copies instead of symlinking — ZCode silently skips
  symlinked sub-agent files.

## [0.1.0] - 2026-09-07

### Added
- Model-pinned sub-agents: `general-flash` (glm-5.3-flash, full tools),
  `explore-flash` (glm-5.3-flash, read-only search + audits),
  `general-pro` (glm-5.3, judgment-heavy).
- Skills: `z-workflow` (state-file orchestration loop, typed dispatch by
  role), `z-liteflow` (lightweight single-domain loop).
- `npx github:hmziqrs/ai` installer (`bin/ai.js`), skills.sh / Claude
  marketplace compatibility manifests, `llms.txt` + `install.md` +
  `AGENTS.md` agent-facing install docs.

[0.2.0]: https://github.com/hmziqrs/ai/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/hmziqrs/ai/releases/tag/v0.1.0
