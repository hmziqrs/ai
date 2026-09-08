# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning is [SemVer](https://semver.org/), released as git tags (`vX.Y.Z`).

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
