# ai — agent & skill kits per harness

One repo, one subfolder per harness. Each `<harness>/` folder is a
self-contained kit that its installer drops into the right places.
Model-pinned sub-agents and orchestration skills — no role depends on
inheriting the main thread's model; every dispatch site names a type
that pins its own model.

```
ai/
├── install.sh          installer (reads from zcode/ by default)
└── zcode/              ZCode kit
    ├── agents/
    └── skills/
```

## ZCode kit (`zcode/`)

### Agents (`zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |

### Skills (`zcode/skills/`)

- **z-workflow** — state-file-driven orchestration loop for complex
  multi-phase tasks. Router / straightforward implementers / committer /
  vision dispatch `general-flash`; complex implementers / judge / decider
  dispatch `general-pro`.
- **z-liteflow** — lightweight loop for small single-domain tasks;
  implementer/fixer/vision on `general-flash`, fresh auditor on
  `explore-flash`.

## Install (pick one)

### Option A — script (recommended)

```bash
git clone git@github.com:hmziqrs/ai.git
cd ai && ./install.sh
```

- Reads `zcode/agents/` and `zcode/skills/`; agents symlink into
  `~/.zcode/agents/`, skills into `~/.agents/skills/`.
- Symlinks mean `git pull` updates everything in place.
- `./install.sh --copy` to copy instead, `--zcode-skills` to install
  skills into `~/.zcode/skills/` instead, `--uninstall` to remove.
- Restart ZCode (or open a new session) afterwards — agents are scanned
  at session start. Verify in **Settings → Subagents**.

### Option B — ZCode plugin

The repo carries a `.zcode-plugin/plugin.json` manifest pointing at
`zcode/agents` and `zcode/skills`, so the repo works as a plugin
marketplace source: **Settings → Plugin Management → Discover → + → Git
URL** → this repo. Install the `flash-agents` plugin; its skills and
agents load with the plugin (agents dispatchable by bare name).
Disable/remove from the same screen.

## Adding more agents / skills / harnesses

- **More into the ZCode kit** — drop files anywhere inside `zcode/`:
  - `zcode/agents/<name>.md` — YAML frontmatter (`name`, `description`,
    `model`, `tools`, `color`) with the system prompt as the body. Valid
    colors: red, blue, green, yellow, purple, orange, pink, cyan.
  - `zcode/skills/<name>/SKILL.md` — YAML frontmatter (`name`,
    `description`) + body.
  Both install paths pick new entries up automatically — the script
  links whatever it finds, and the plugin manifest points at the
  directories.
- **Another harness** (claude, cursor, codex, …) — add a sibling folder
  `claude/` etc. with whatever layout that harness expects, plus its own
  install step in its README. The root installer stays ZCode-default and
  untouched.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, either
edit the `model:` lines or fall back to the built-ins — the skills
already document that fallback (prompt-stamp `Model: ...`).
