# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/), released as git tags (`vX.Y.Z`).

## [Unreleased]

### Added
- **Cross-harness skill categories.** Every top-level directory except
  `harness/` is a category holding plain-SKILL.md skills that install
  for every harness. First category and first skill: `copy/antislop-copy`
  — cuts consumer-facing website copy (homepages, landing pages,
  feature grids, pricing, about, FAQ, release posts, page titles and
  meta descriptions) to the shortest version that still answers the
  visitor's questions, without adding or bending any fact.

### Changed
- **Repo restructured by kind.** `zcode/` → `harness/zcode/` and
  `codex/` → `harness/codex/` — harness-specific kits live under
  `harness/`, cross-harness skills in top-level categories. The
  `.zcode-plugin/plugin.json` manifest paths and all documentation
  (README, llms.txt, AGENTS.md, install docs) follow.
- The zflow-engine is now an explicit install step (copy
  `harness/zcode/workflows/zflow-engine.dwf.ts` to
  `~/.zcode/workflows/`) instead of being left out of the kit install.

### Removed
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
