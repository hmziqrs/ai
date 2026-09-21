# ai — agent & skill kits per harness

One repo, one subfolder per harness. Each `<harness>/` folder is a
self-contained kit that its installer drops into the right places.
Model-pinned sub-agents and orchestration skills — no role depends on
inheriting the main thread's model; every dispatch site names a type
that pins its own model.

```
ai/
├── bin/ai.js           npx entry point (ZCode default; `codex` subcommand)
├── bin/codex-ai.js     Codex provider/agent/profile/skill installer
├── codex/              Codex kit (agents, profiles, plugin, setup docs)
└── zcode/              ZCode kit
    ├── agents/
    ├── skills/
    └── workflows/       saved-workflow sources (zflow-engine + SPEC)
```

## ZCode kit (`zcode/`)

### Agents (`zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |

### Skills (`zcode/skills/`)

All five z-flow skills are **thin chain-coordinator wrappers** over one
saved workflow node: the main agent is a thin sequencer that launches
tier-pure `zflow-engine` runs (implement / vision / judge) via
CreateWorkflow with `subagent_model` pinned per run, and holds only
compact control data between runs. The engine (`zcode/workflows/
zflow-engine.dwf.ts`, contract in `zflow-SPEC.md` beside it) runs the
mechanical gates as `world.run` behind a literal-command allowlist,
drafts commits with a named Committer agent while the script executes
the mutations, and enforces the POLICY exit rules as loop conditions in
code. The engine installs as a saved workflow at `~/.zcode/workflows/`
(`zcode/workflows/` is the source copy).

- **z-workflow** — mixed-tier chain for complex multi-phase tasks: pro
  implement and judge runs with a flash run-level vision node chained
  between rounds, looping per POLICY until clean or honestly stopped.
- **z-proflow** — the all-pro depth-first variant: every run pinned to
  the pro tier, no router, no pixel vision (pro is image-blind; ocu
  AX-text structural audits allowed — text is tier-blind).
- **z-flashflow** — the all-flash variant: every run pinned to flash;
  gates, fresh blind judges, fix rounds, and code-enforced POLICY
  exits compensate for flash judgment, with hand-off to z-proflow when
  a complex area stalls.
- **z-liteflow** — lightweight chain for small single-domain tasks:
  flash implement and judge runs looping between runs per finding, plus
  an optional flash vision node.
- **z-gpui-workflow** — fine-grained GPUI desktop chain: pro
  implement/judge runs, a flash vision node for pixel design audits
  via ocu capture (AX text + decoded PNGs), and the main-thread
  computer-use plugin as the interactive fallback lane only.

## Install (pick one)

### Option A — npx one-liner (recommended)

```bash
npx github:hmziqrs/ai
```

Runs the repo's installer straight from GitHub — no npm publish, no
clone, no dependencies (Node ≥ 16). Agents copy into
`~/.zcode/agents/`, skills into `~/.agents/skills/` (ZCode's subagent
loader skips symlinked definitions), so updates re-run the same
command. Variants: `npx github:hmziqrs/ai uninstall`, `--zcode-skills`.

### Option B — skills.sh ecosystem (skills only)

```bash
npx skills add hmziqrs/ai -g -a zcode -y
```

Installs the two SKILL.md packs through the cross-agent skills CLI into
`~/.zcode/skills/` (`zcode` is a first-class target; swap `-a` for
claude-code, cursor, universal, ...). Note: the skills CLI does not
install sub-agent definitions — use Option A when the agents are wanted
too.

### Option C — ZCode plugin

The repo carries a `.zcode-plugin/plugin.json` manifest pointing at
`zcode/agents` and `zcode/skills`, so the repo works as a plugin
marketplace source: **Settings → Plugin Management → Discover → + → Git
URL** → this repo. Install the `flash-agents` plugin; its skills and
agents load with the plugin (agents dispatchable by bare name).
Disable/remove from the same screen. (A `.claude-plugin/` marketplace
manifest is included for Claude Code / skills.sh compatibility.)

### For AI agents

Point an agent at this repo and it can install itself: `llms.txt` is the
entry point, `install.md` holds task-oriented install instructions,
`AGENTS.md` orients agents working inside the repo.

## Adding more agents / skills / harnesses

- **More into the ZCode kit** — drop files anywhere inside `zcode/`:
  - `zcode/agents/<name>.md` — YAML frontmatter (`name`, `description`,
    `model`, `tools`, `color`) with the system prompt as the body. Valid
    colors: red, blue, green, yellow, purple, orange, pink, cyan.
  - `zcode/skills/<name>/SKILL.md` — YAML frontmatter (`name`,
    `description`) + body.
  Both install paths pick new entries up automatically — the script
  copies whatever it finds, and the plugin manifest points at the
  directories.
- **Another harness** (claude, cursor, codex, …) — add a sibling folder
  `claude/` etc. with whatever layout that harness expects, plus its own
  install step in its README. The root installer stays ZCode-default and
  untouched.

## Codex kit (`codex/`)

The Codex kit provides Z.ai custom-provider configuration, five TOML custom
agents, all six GLM-5.3 / GLM-5.3-Flash reasoning profiles, and Codex-adapted
versions of the four workflow skills. `zai_flash`, `zai_vision`, `zai_pro`, and
`zai_reviewer` are pinned to max effort; the read-only fan-out explorer stays
at low. GLM-5.3-Flash owns vision and computer-use work because it is the
multimodal model.

Install the entire Codex kit without putting a key in Git or TOML:

```bash
npx github:hmziqrs/ai codex
```

Provide `ZAI_API_KEY` in the installer's environment. The installer imports it
into the private Codex-only file `~/.codex/secrets/zai-api-key`, sets mode
`0600`, and configures provider authentication to read that file. The key is
never written to the repository or `~/.codex/config.toml`.

The four skills are also packaged as the publishable Codex plugin at
`codex/plugins/zai-workflows/`. See [codex/install.md](codex/install.md) for
secret-file handling, paths, protocol requirements, and uninstall behavior.

For Desktop, install `codex/scripts/codex-zai-desktop` as both `codex-zai` and
`codex-openai`. Run `codex-zai flash` or `codex-zai pro` to activate the Z.ai
catalog before Desktop starts; run `codex-openai` to restore the exact saved
official configuration. See `codex/install.md` for the switching behavior.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, either
edit the `model:` lines or fall back to the built-ins — the skills
already document that fallback (prompt-stamp `Model: ...`).
