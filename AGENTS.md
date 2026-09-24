# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — harness kits and cross-harness skill categories.
There is no installer: agents install this repo by following
`install.md`, and humans can follow the same steps.

## Layout

```
harness/<name>/              harness-SPECIFIC kits (only what depends on a harness)
  zcode/agents/<name>.md       ZCode sub-agent definitions (YAML frontmatter + system-prompt body)
  zcode/skills/<name>/SKILL.md ZCode-specific skills (the five z-flow chains)
  zcode/workflows/             dynamic-workflow sources (zflow-engine.dwf.ts + zflow-SPEC.md)
  codex/                       Codex kit (agents, profiles, plugin, model-catalogs, scripts)
<category>/<skill>/SKILL.md  cross-harness skill categories (copy/, ...): plain SKILL.md skills
install.md                   ZCode-kit + categories install procedure
llms.txt                     entry point for consuming agents
```

## Conventions

- Two content kinds: `harness/<name>/` kits (harness-specific layout)
  and top-level category directories holding skill folders directly.
  Litmus test: if content references CreateWorkflow, model pins, Codex
  TOML, or any harness mechanism, it belongs in a harness kit;
  otherwise it belongs in a category.
- Skill folder name MUST equal the frontmatter `name` (lowercase
  alphanumerics and hyphens). Names must be unique across all
  categories and kits — skills install flat into
  `~/.agents/skills/` by folder name.
- Agent frontmatter: `name`, `description`, `model`, `tools`, `color`.
  Valid colors: red, blue, green, yellow, purple, orange, pink, cyan.
  Model IDs resolve against zai / zai-coding-plan providers
  (`glm-5.3-flash`, `glm-5.3`).
- New skills, agents, or categories need no registration — every
  install path picks up whatever is in the tree. A new category is a
  new top-level directory; a new harness is a new `harness/<name>/`
  folder plus its install documentation.
- The five z-flow skills are thin chain-coordinator wrappers over
  `zflow-engine` nodes; keep them consistent with
  `harness/zcode/workflows/zflow-SPEC.md` (the engine contract).
- Codex templates keep `__ZAI_MODEL_CATALOG__` until install renders an
  absolute user path. `ZAI_API_KEY` imports into the Codex-only
  `~/.codex/secrets/zai-api-key` file with mode `0600`; command-backed
  provider authentication reads only that file. Never commit an API
  key or write one to `config.toml`.

## When asked to install this kit

Follow `install.md` (ZCode kit + categories) or
`harness/codex/install.md` (Codex kit). Perform the copies yourself
with file tools; install skills and agents as real files, never
symlinks — ZCode silently skips symlinked agent definitions. End by
noting that ZCode loads agents at session start: restart or a new
session is required.

## When asked to update an installed kit

Re-run the same install procedure — copies replace folders wholesale.
The Codex secret file is reused, never rewritten.
