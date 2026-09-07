# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — AI-agent sub-agent definitions and skills, one
subfolder per harness. Current kits: `zcode/`.

## Layout

```
zcode/agents/<name>.md        ZCode sub-agent definitions (YAML frontmatter + system-prompt body)
zcode/skills/<name>/SKILL.md  ZCode skills
bin/ai.js                     npx installer (npx github:hmziqrs/ai)
llms.txt                      entry point for consuming agents
install.md                    task-oriented install instructions
```

## Conventions

- Skill folder name MUST equal the frontmatter `name` (lowercase
  alphanumerics and hyphens).
- Agent frontmatter: `name`, `description`, `model`, `tools`, `color`.
  Valid colors: red, blue, green, yellow, purple, orange, pink, cyan.
  Model IDs resolve against zai / zai-coding-plan providers
  (`glm-5.3-flash`, `glm-5.3`).
- The installer links/copies EVERYTHING found under `zcode/agents/` and
  `zcode/skills/` — new files need no installer or manifest changes.
- New harness = new sibling folder (`claude/`, `cursor/`, ...) with its
  own layout; never mix harnesses in one folder.

## When asked to install this kit

Follow `install.md`. Preferred: `npx github:hmziqrs/ai` (full kit) or
`npx skills add hmziqrs/ai -g` (skills only). Always end by noting that
ZCode loads agents at session start — restart or new session required.

## When asked to update an installed kit

If installed via symlinks (default): `git pull` in the cloned repo is
enough. If copied: re-run the installer. `npx` users re-run the one-liner
(add `--yes` if npx caches an old ref).
