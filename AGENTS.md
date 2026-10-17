# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — harness kits and cross-harness skill categories.
There is no installer: agents install this repo by following
`install.md`, and humans can follow the same steps.

## Research access (hard rule)

`research/` contains source reports, design studies, and historical experiments.
Never browse, enumerate, search, index, or read it on your own. Access is allowed
only in these two cases:

1. The user's prompt explicitly asks to inspect or use research material.
2. The task itself is research-related and the material is relevant to that work.

For every other task, exclude `research/` from recursive searches, file discovery,
audits, and delegated exploration. A link or citation pointing there does not
grant access. When access is allowed, read only what the task needs.

`research/` is never a skill category or installation source. Do not install
archived skills, agents, or workflows from it. Historical skill definitions use
`SKILL.snapshot.md` so discovery cannot mistake them for active skills.

## Layout

```
harness/<name>/              harness-SPECIFIC kits (only what depends on a harness)
  zcode/agents/<name>.md       ZCode sub-agent definitions (YAML frontmatter + system-prompt body)
  zcode/skills/<name>/SKILL.md ZCode-specific skills (the seven z-flow chains)
  zcode/workflows/             dynamic-workflow sources (zflow-engine.dwf.ts + zflow-SPEC.md)
  codex/                       Codex kit (agents, profiles, plugin, model-catalogs, scripts)
<category>/[<group>/]<skill>/SKILL.md  cross-harness skill categories (copy/, languages/rust/, ...): plain SKILL.md skills, optionally grouped
research/                    source reports and historical material; access restricted above, never installed
install.md                   ZCode-kit + categories install procedure
llms.txt                     entry point for consuming agents
```

## Conventions

- Installable content has two kinds: `harness/<name>/` kits
  (harness-specific layout) and top-level category directories holding
  skill folders directly. `research/` is excluded from both.
  Litmus test: if content references CreateWorkflow, model pins, Codex
  TOML, or any harness mechanism, it belongs in a harness kit;
  otherwise it belongs in a category.
- Skill folder name MUST equal the frontmatter `name` (lowercase
  alphanumerics and hyphens). Names must be unique across all
  categories and kits. Category skills install flat into
  `~/.agents/skills/` by folder name; harness-kit skills install only
  into their own harness's path (ZCode kit skills → `~/.zcode/skills/`)
  and never into `~/.agents/skills/`.
- Agent frontmatter: `name`, `description`, `model`, `tools`, `color`.
  Valid colors: red, blue, green, yellow, purple, orange, pink, cyan.
  Model IDs resolve against zai / zai-coding-plan providers
  (`glm-5.3-flash`, `glm-5.3`).
- New skills, agents, or categories need no registration — every
  install path picks up active content, excluding `research/`. A new category
  is a new top-level directory; a new harness is a new `harness/<name>/`
  folder plus its install documentation.
- Keep the repo root as flat as possible: prefer grouping skills under
  an existing category (categories may nest sub-groups, e.g.
  `languages/rust/`, `languages/go/`) over adding new top-level
  directories. Skill folders still install flat by folder name, so
  nesting is organizational only.
- z-workflow writes a fresh script per task through the workflow-author;
  z-proflow (pro only, no vision) and z-flashflow (Flash only) are
  profiles of it, and z-liteflow is its fast small-task form (a filled,
  pre-tested template, no author). z-gpui-workflow and z-tauri-workflow
  are domain profiles of z-workflow with scoped framework gates and device evidence.
  The saved engine retains its separate contract in
  `harness/zcode/workflows/zflow-SPEC.md`.
  z-super-rustflow composes its own main-tier-only runs inline (no
  vision, no flash) and needs no engine.
- Workflows cannot call agents by name. To drive a workflow subagent
  with an agent file (a specialist), paste the persona kit
  `harness/zcode/skills/z-workflow/persona-kit.dwf.ts` unchanged into
  the script and use its functions; never hand-write a persona loader.
  A change to the kit goes into that file first (new version marker),
  then into every script that carries it (z-liteflow's template and Shipflow queue too).
- Embedded filesystem/process helpers use TypeScript executed by Bun through
  `world.run`. Pass data as arguments and disable project config and environment-file
  autoloading for read-only checks. Declare Bun as a runtime dependency.
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
