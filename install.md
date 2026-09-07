# Installing `ai` (ZCode kit)

Task-oriented install instructions. An AI agent given this repo should be
able to complete every task below autonomously. Human commands included
inline. Default scope: user (home directory), files copied (ZCode's
subagent loader skips symlinked definitions).

## Environment check

1. `node --version` — if >= 16, use the npx runner (Task A).
2. Otherwise: download the repo and copy files by hand (Task C).

## Task A — full kit via npx (preferred)

Run: `npx github:hmziqrs/ai`

Expected output: three `installed agent  ~/.zcode/agents/...` lines and
two `installed skill  ~/.agents/skills/...` lines.

Variants: `--zcode-skills` to place skills in `~/.zcode/skills/`, or
run `npx github:hmziqrs/ai uninstall` to remove.

## Task B — skills only (skills.sh ecosystem)

Run: `npx skills add hmziqrs/ai -g -a zcode -y`

Installs both SKILL.md packs into `~/.zcode/skills/` (copied). Other
`-a` targets exist (claude-code, cursor, universal, ... — the CLI lists
them on error). Note: this installs skills only — the sub-agent
definitions in `zcode/agents/` are NOT handled by the skills CLI; run
Task A or C when agents are wanted.

## Task C — manual copy

Copy `zcode/agents/*.md` to `~/.zcode/agents/` and `zcode/skills/*` to
`~/.agents/skills/`.

Copy, never symlink — ZCode's subagent discovery silently skips
symlinked agent definitions.

## Verify

- `ls ~/.zcode/agents/` shows `general-flash.md`, `explore-flash.md`,
  `general-pro.md`.
- `find ~/.zcode/agents -type l` prints nothing — agent files must be
  regular files.
- `ls ~/.agents/skills/` shows `z-workflow/`, `flash-flow/`, and
  `z-liteflow/` each containing `SKILL.md`.
- ZCode picks up agents at session start: restart ZCode or open a new
  session, then check Settings → Subagents lists the three agents.

## Report back

State: which task ran, agents and skills now present,
and that a ZCode restart / new session is required to load the agents.
