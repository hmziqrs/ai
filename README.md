# ai — agent & skill kits per harness, plus cross-harness skill categories

Harness-specific kits live under `harness/` (one subfolder per
harness). Everything else at the top level is a skill category —
cross-harness skills any agent can load. There is **no installer**:
an AI agent pointed at this repo installs it from [install.md](install.md)
(`llms.txt` is the agent entry point).

Model-pinned sub-agents and orchestration skills — no role depends on
inheriting the main thread's model; every dispatch site names a type
that pins its own model.

```
ai/
├── harness/              harness-SPECIFIC kits (only what depends on a harness)
│   ├── zcode/            ZCode kit: agents/, skills/ (5 z-flow chains), workflows/
│   └── codex/            Codex kit: agents, profiles, plugin, model catalogs
├── copy/                 cross-harness skill category: writing & copywriting
│   └── antislop-copy/
└── install.md            the install procedure (executed by an AI agent or human)
```

## ZCode kit (`harness/zcode/`)

### Agents (`harness/zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |

### Skills (`harness/zcode/skills/`)

All five z-flow skills are **thin chain-coordinator wrappers** over one
saved workflow node: the main agent is a thin sequencer that launches
tier-pure `zflow-engine` runs (implement / vision / judge) via
CreateWorkflow with `subagent_model` pinned per run, and holds only
compact control data between runs. The engine (`harness/zcode/workflows/
zflow-engine.dwf.ts`, contract in `zflow-SPEC.md` beside it) runs the
mechanical gates as `world.run` behind a literal-command allowlist,
drafts commits with a named Committer agent while the script executes
the mutations, and enforces the POLICY exit rules as loop conditions in
code. The engine installs as a saved workflow at `~/.zcode/workflows/`
(`harness/zcode/workflows/` is the source copy).

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

## Cross-harness skill categories

Every top-level directory except `harness/` is a skill category
(`copy/` today; `framework/`, `design/`, … when their first skills
arrive). Categories hold skill folders directly: `copy/antislop-copy/`
with a `SKILL.md` inside.

- **Litmus test:** a category skill is a plain `SKILL.md` with no
  harness-specific tooling — no CreateWorkflow, no model pins, no
  Codex TOML. Content that needs any of that belongs in the harness
  kit.
- Skills install flat into `~/.agents/skills/` by folder name, so
  skill names must be unique across all categories and harness kits.
- **antislop-copy** — cuts consumer-facing website copy (homepages,
  landing pages, feature grids, pricing, about, FAQ, release posts,
  page titles and meta descriptions) to the shortest version that
  still answers what a visitor needs to act, without adding or
  bending any fact.

## Install

There is no installer and no npx entry — the friction of maintaining
one outweighs running it.

1. **Point an AI agent at this repo** (primary). The agent reads
   `llms.txt`, follows [install.md](install.md) for the ZCode kit or
   [harness/codex/install.md](harness/codex/install.md) for Codex, and
   performs the copies. Updates and uninstalls are the same procedure.
2. **ZCode plugin** (declarative). The repo carries a
   `.zcode-plugin/plugin.json` manifest pointing at
   `harness/zcode/agents` and `harness/zcode/skills`: Settings →
   Plugin Management → Discover → + → Git URL → this repo; install the
   `flash-agents` plugin. (A `.claude-plugin/` marketplace manifest is
   included for Claude Code compatibility.)
3. **skills.sh** (skills only): `npx skills add hmziqrs/ai -g -a zcode -y`
   installs the SKILL.md packs into `~/.zcode/skills/`. No sub-agent
   definitions — use path 1 for those.

## Adding more content

- **A cross-harness skill** — drop `copy/<name>/SKILL.md` (or a new
  category: any new top-level directory). YAML frontmatter (`name`,
  `description`) + body; folder name must equal the `name`. Every
  install path picks new entries up automatically — there is nothing
  to register.
- **Into a harness kit** — drop files inside that kit:
  - `harness/zcode/agents/<name>.md` — YAML frontmatter (`name`,
    `description`, `model`, `tools`, `color`) with the system prompt as
    the body. Valid colors: red, blue, green, yellow, purple, orange,
    pink, cyan.
  - `harness/zcode/skills/<name>/SKILL.md` — same shape as a category
    skill, for ZCode-specific skills only.
- **Another harness** (claude, cursor, …) — add `harness/<name>/` with
  whatever layout that harness expects, plus an install section in its
  own README; categories apply to it unchanged.

## Codex kit (`harness/codex/`)

The Codex kit provides Z.ai custom-provider configuration, five TOML
custom agents, all six GLM-5.3 / GLM-5.3-Flash reasoning profiles, and
Codex-adapted versions of the four workflow skills. `zai_flash`,
`zai_vision`, `zai_pro`, and `zai_reviewer` are pinned to max effort;
the read-only fan-out explorer stays at low. GLM-5.3-Flash owns vision
and computer-use work because it is the multimodal model.

Install follows [harness/codex/install.md](harness/codex/install.md).
The `ZAI_API_KEY` import goes into the private Codex-only file
`~/.codex/secrets/zai-api-key` with mode `0600`; provider
authentication reads that file. The key is never written into the
repository or `~/.codex/config.toml`.

The four skills are also packaged as the publishable Codex plugin at
`harness/codex/plugins/zai-workflows/`. For Desktop, install
`harness/codex/scripts/codex-zai-desktop` as both `codex-zai` and
`codex-openai` — see [harness/codex/install.md](harness/codex/install.md)
for the switching behavior.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, either
edit the `model:` lines or fall back to the built-ins — the skills
already document that fallback (prompt-stamp `Model: ...`).
