# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/), released as git tags (`vX.Y.Z`).

## [Unreleased]

### Added

- **New `z-workflow`: parallel by default, zero global phase barriers.** Built directly
  on the bundled `dynamic-workflows` skill: the coordinator dispatches a single
  `workflow-launcher` agent (full access, GLM-5.3-Flash, HIGH thinking) that does
  everything pre-workflow — explores, bootstraps an uninitialized project (thin scaffold +
  git baseline, never touching an initialized repository), parses optional phases and
  round budgets from the brief, and predetermines 2–8 areas with disjoint file sets —
  then launches one fresh script in which every area is its own state machine
  (implement → optional audit → optional test → …) chained inside its own fan-out
  callback. An area advances to its next phase the moment its own work lands and never
  waits for other areas; the only joins are the final report and an optional final
  whole-tree smoke gate. Optional verification phases (audit, unit tests, native/device
  testing, vision, browser, smoke) run only when the brief names them — 1 round by
  default, explicit N, or until-zero-issues bounded by an amendable cap. Per-area checks
  stay scoped to the area's own files; no git worktrees, branches or commits; a live
  per-area board shows the pipeline while it runs; fresh script per task, nothing saved.
  Phases attach per area (vision/browser only to UI-producing areas, native testing only
  to device surfaces), areas carry niche personas distilled from matching `z-*`
  specialists, and vision interpreters are always pinned to GLM-5.3-Flash (HIGH) — the
  only vision-capable model (a host that refuses model pins degrades to the session's
  image-analysis tooling, with the method disclosed). Testing phases pick the matching
  capture tooling — agent-browser (web), open-computer-use (desktop), mobilecli (mobile),
  tui-use (TUI) — with z-qa-evaluator / z-native-device-verifier personas, and shared
  devices/TUI sessions serialize through one FIFO device-operator subagent. Model pins
  are per subagent inside the script (ZCode platform feature): implementers default
  GLM-5.3-Flash at HIGH, main-tier GLM-5.3 only on explicit request, vision interpreters
  always Flash (the only vision-capable model) — one workflow mixes models across areas
  and phases. Verified by a ten-run campaign (October 2026): ten distinct workflow types —
  web app, CLI, glob-driven code sweep, dual-page visual family, TUI executed-output,
  DOM-verified, schema-validated config, planner→fan-out→editor content pipeline,
  adversarial implement↔attack, and an everything capstone — every run mixed-model,
  every deterministic gate green; the shapes are catalogued in the skill's
  `references/proven-patterns.md`. Follow-up residue tests verified the remaining
  mechanisms live: the serialized FIFO device lane on a booted iOS simulator (real
  `xcrun simctl` operations + flash pixel-judged captures), the interactive browser
  lane (a subagent driving real Playwright-backed clicks via agent-browser), the
  8-area scale ceiling with alternating model pins, and the final launcher returning
  per-subagent pins intact under its own context's refusal.
  Speed is the only goal.
- **`coding/` category skills.** `code-comments` (hard comment discipline for agent-written
  code) and the three-skill `test-quality-*` suite (`guardrails`, `tdd-agents`, `audit`),
  every claim traced to the research sweep under `research/coding/test-quality/`.
- **`i18n/` category.** `rust-i18n`, `sveltekit-paraglide`, `flutter-slang`, and
  `astro-i18n` reference skills; the matching skill is installed per stack by
  `z-project-init` and referenced from the stack specialists.
- **`languages/rust/` category group.** Five Rust super-optimization skills: `rust-superopt`
  (the router), `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`,
  `rust-fast-architecture`.
- Mobile and terminal capture tooling (`mobile-automation`, `mobilecli`, `tui-use`) joins
  `agent-browser` and `open-computer-use` as external capture dependencies referenced by
  the device-verification specialists.

### Removed

- **The entire pre-2026-10 workflow family is retired into `archive/`** (restricted,
  never installed, `SKILL.md` renamed `SKILL.snapshot.md`): the original `z-workflow`,
  experiments v2 through v13, the `z-proflow` / `z-flashflow` / `z-liteflow` profiles, the
  `z-gpui-workflow` / `z-tauri-workflow` / `z-super-rustflow` domain workflows, all eight
  `workflow-author*` / `workflow-planner*` agent definitions, the persona-kit checker, and
  the legacy `zflow-engine` saved workflow. Everything is preserved in `archive/` and git
  history; installing or discovering archived content is prohibited (see AGENTS.md).
- **The autonomous Shipflow layer** (skill, approval helper, probe scripts, and its GitHub
  agents `z-gh-operator`, `z-pr-merge-steward`, `z-queue-sentinel`,
  `z-github-project-manager`, `z-product-owner`) is removed; preserved in git history.
- **Support-specialist routing pruned** — `z-api-contract-engineer`,
  `z-database-migration-engineer`, `z-product-flow-analyst`, `z-accessibility-auditor`,
  and `z-ci-diagnostician` removed; `z-security-auditor` is the base project pin and
  `z-qa-evaluator` covers web-rendering stacks.

### Changed

- **Global Core is now 4 agents and 2 skills.** Global agents:
  `general-pro`, `general-flash`, `explore-flash`, `workflow-launcher`. Global ZCode
  skills: `z-workflow`, `z-project-init`. The 5 universal baseline skills in
  `~/.agents/skills/` are unchanged. **No workflow skills install per project anymore**;
  `z-project-init` snapshots move to `schemaVersion: 2` (persona-kit fields and
  per-project workflow lists dropped) and remove retired workflow installs on update.
- **Docs rewritten to match disk.** `AGENTS.md`, `install.md`, `llms.txt`, and `README.md`
  describe the new layout and drop stale references (the Codex kit directory and
  `.zcode-plugin` route no longer exist). `install.md` includes a cleanup step that
  removes retired workflow skills/agents/saved engines from global directories.
- **Repo restructured by kind.** `zcode/` → `harness/zcode/` — harness-specific kits live
  under `harness/`, cross-harness skills in top-level categories.

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
