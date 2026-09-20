# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — AI-agent sub-agent definitions and skills, one
subfolder per harness. Current kits: `zcode/` and `codex/`.

## Layout

```
zcode/agents/<name>.md        ZCode sub-agent definitions (YAML frontmatter + system-prompt body)
zcode/skills/<name>/SKILL.md  ZCode skills
bin/ai.js                     npx installer (npx github:hmziqrs/ai)
bin/codex-ai.js               Codex installer selected by the `codex` subcommand
codex/agents/*.toml           Codex custom agent templates
codex/profiles/*.toml         Codex CLI profile templates
codex/plugins/zai-workflows/  Publishable plugin containing the four Codex skills
codex/model-catalogs/*.json   Codex custom model metadata
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
- The installer copies EVERYTHING found under `zcode/agents/` and
  `zcode/skills/` — new files need no installer or manifest changes.
- New harness = new sibling folder (`claude/`, `cursor/`, ...) with its
  own layout; never mix harnesses in one folder.
- Codex templates keep `__ZAI_MODEL_CATALOG__` until the installer renders an
  absolute user path. The installer imports `ZAI_API_KEY` into the Codex-only
  `~/.codex/secrets/zai-api-key` file with mode `0600`; command-backed provider
  authentication reads only that file. Never commit an API key or write one to
  `config.toml`.

## When asked to install this kit

Follow `install.md`. Preferred: `npx github:hmziqrs/ai` (full kit) or
`npx skills add hmziqrs/ai -g` (skills only). Always end by noting that
ZCode loads agents at session start — restart or new session required.

Install as real files, never symlinks — ZCode silently skips symlinked
agent definitions; if not using the installer, verify
`find ~/.zcode/agents -type l` prints nothing.

## When asked to update an installed kit

Re-run the installer: `npx github:hmziqrs/ai` (`--yes` skips npx's
install prompt), or `./bin/ai.js` from a clone.

For the Codex kit, run `npx github:hmziqrs/ai codex`. The installer updates
agents, profiles, model catalog, skills, and its marked provider block while
preserving the user's default OpenAI model. It imports `ZAI_API_KEY` into
`~/.codex/secrets/zai-api-key` with mode `0600`; the key must not enter Git or
`~/.codex/config.toml`.
