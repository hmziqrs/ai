# Installing `ai` (ZCode kit)

Task-oriented install instructions. An AI agent given this repo should be
able to complete every task below autonomously. Human commands included
inline. Default scope: user (home directory), symlinks.

## Environment check

1. `node --version` — if >= 16, use the npx runner (Task A).
2. Otherwise `git --version` + a POSIX shell — use the shell installer
   (Task B).
3. Neither: download the repo and copy files by hand (Task D).

## Task A — full kit via npx (preferred)

Run: `npx github:hmziqrs/ai`

Expected output: three `installed agent  ~/.zcode/agents/...` lines and
two `installed skill  ~/.agents/skills/...` lines.

Variants: append `--copy` to copy instead of symlink, `--zcode-skills`
to place skills in `~/.zcode/skills/`, or run
`npx github:hmziqrs/ai uninstall` to remove.

## Task B — full kit via shell

Run: `git clone https://github.com/hmziqrs/ai.git && cd ai && ./install.sh`
(same destinations and flags as Task A).

## Task C — skills only (skills.sh ecosystem)

Run: `npx skills add hmziqrs/ai -g -a zcode -y`

Installs both SKILL.md packs into `~/.zcode/skills/` (copied). Other
`-a` targets exist (claude-code, cursor, universal, ... — the CLI lists
them on error). Note: this installs skills only — the sub-agent
definitions in `zcode/agents/` are NOT handled by the skills CLI; run
Task A or B when agents are wanted.

## Task D — manual copy

Copy `zcode/agents/*.md` to `~/.zcode/agents/` and `zcode/skills/*` to
`~/.agents/skills/`.

## Verify

- `ls ~/.zcode/agents/` shows `general-flash.md`, `explore-flash.md`,
  `general-pro.md`.
- `ls ~/.agents/skills/` shows `z-workflow/` and `z-liteflow/` each
  containing `SKILL.md`.
- ZCode picks up agents at session start: restart ZCode or open a new
  session, then check Settings → Subagents lists the three agents.

## Report back

State: which task ran, symlink or copy, agents and skills now present,
and that a ZCode restart / new session is required to load the agents.
