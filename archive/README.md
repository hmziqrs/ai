# archive/

Retired workflow experiments and their subagents. Nothing here is active,
installable, or discovered — treat this directory exactly like `research/`:
never browse, search, index, or install from it. Restoration is the only
reason to enter it.

Moved here 2026-10-22, when the whole workflow family was consolidated into a
single new `z-workflow` (one launcher agent on the bundled `dynamic-workflows`
contract: parallel by default, no audits, no tests, no vision, no git
worktrees).

- `skills/` — z-workflow v1 (original) through v13, the z-proflow /
  z-flashflow / z-liteflow profiles, and the niche z-gpui-workflow /
  z-tauri-workflow / z-super-rustflow skills. Each `SKILL.md` is renamed
  `SKILL.snapshot.md` so no discovery path can ever pick it up as an active
  skill.
- `agents/` — workflow-author, workflow-author-flash, workflow-planner,
  workflow-planner-flash, and workflow-author-v9 through v12.
- `saved-workflows/` — retired saved engines pulled out of
  `~/.zcode/workflows/`.

To restore a piece: `git mv archive/skills/<name> harness/zcode/skills/<name>`,
rename `SKILL.snapshot.md` back to `SKILL.md`, and update `install.md`.
Git history before this move holds everything in its original layout.
