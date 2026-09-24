# ai: harness kits and cross-harness skills

Harness-specific kits live under `harness/`, one subfolder per harness.
Every other top-level directory is a cross-harness skill category. There
is no installer: an AI agent pointed at this repo installs it from
[install.md](install.md); `llms.txt` is the agent entry point.

```
ai/
├── harness/              harness-SPECIFIC kits (only what depends on a harness)
│   ├── zcode/            ZCode kit: agents/, skills/ (5 z-flow chains), workflows/
│   └── codex/            Codex kit: agents, profiles, plugin, model catalogs
├── copy/                 cross-harness skill category: writing & copywriting
│   └── antislop-copy/
└── install.md            the install procedure
```

## ZCode kit (`harness/zcode/`)

### Agents (`harness/zcode/agents/`)

| Agent | Model pinned | Role |
|---|---|---|
| `general-flash` | glm-5.3-flash | Full-tools general agent for objectively checkable work (CRUD, boilerplate, mechanical verification) |
| `explore-flash` | glm-5.3-flash | Read-only search + read-only code audits (reports findings, no verdict authority) |
| `general-pro` | glm-5.3 | Full-tools general agent for judgment-heavy work (complex implementation, audit verdicts, continue/stop decisions) |

Both flash agents read images natively; GLM-5.3-Flash is the multimodal tier.

### Skills (`harness/zcode/skills/`)

All five z-flow skills are thin coordinators over one saved workflow:
they launch tier-pure `zflow-engine` runs (implement / vision / judge)
via CreateWorkflow with `subagent_model` pinned per run. The engine
(`harness/zcode/workflows/zflow-engine.dwf.ts`, contract in
`zflow-SPEC.md` beside it) runs the mechanical gates as `world.run`
behind a literal-command allowlist and enforces the POLICY exits as
loop conditions in code. Skills copy to `~/.agents/skills/`; the
engine to `~/.zcode/workflows/`.

- **z-workflow:** mixed-tier chain for complex multi-phase tasks. Pro implement and judge runs with a flash run-level vision node chained between rounds.
- **z-proflow:** the all-pro depth-first variant. Every run pinned to the pro tier, no router, no pixel vision (pro is image-blind; ocu AX-text structural audits allowed because text is tier-blind).
- **z-flashflow:** the all-flash variant. Every run pinned to flash, pixel vision included; gates, fresh blind judges, fix rounds, and code-enforced POLICY exits compensate for flash judgment, with hand-off to z-proflow when a complex area stalls.
- **z-liteflow:** lightweight chain for small single-domain tasks. Flash implement and judge runs looping between runs per finding, plus an optional flash vision node.
- **z-gpui-workflow:** fine-grained GPUI desktop chain. Pro implement/judge runs, a flash vision node for pixel design audits via ocu capture (AX text + decoded PNGs), and the main-thread computer-use plugin as the interactive fallback lane only.

## Cross-harness skills

Every category skill installs for every harness:

- **antislop-copy** (`copy/antislop-copy/`): cuts consumer-facing website copy to the shortest version that still answers what a visitor needs to act, without adding or bending any fact.

## Install

1. **Point an AI agent at this repo.** It reads `llms.txt` and follows
   [install.md](install.md) for ZCode or
   [harness/codex/install.md](harness/codex/install.md) for Codex.
2. **ZCode plugin.** Settings → Plugin Management → Discover → + → Git
   URL, this repo, then install the `flash-agents` plugin.
3. **skills.sh, skills only.** `npx skills add hmziqrs/ai -g -a zcode -y`
   copies the SKILL.md packs into `~/.zcode/skills/`. It skips the
   sub-agent definitions; use path 1 for those.

## Codex kit (`harness/codex/`)

The Codex kit provides Z.ai custom-provider configuration, five TOML
custom agents, six GLM-5.3 / GLM-5.3-Flash reasoning profiles, and the
four workflow skills adapted for Codex. `zai_flash`,
`zai_vision`, `zai_pro`, and `zai_reviewer` are pinned to max effort;
the read-only fan-out explorer stays at low. GLM-5.3-Flash owns vision
and computer-use work.

Install follows [harness/codex/install.md](harness/codex/install.md).
`ZAI_API_KEY` imports into the private Codex-only file
`~/.codex/secrets/zai-api-key` with mode `0600`; provider
authentication reads that file, and the key never enters the repository
or `~/.codex/config.toml`.

The four skills are also packaged as the publishable Codex plugin at
`harness/codex/plugins/zai-workflows/`. For Desktop, install
`harness/codex/scripts/codex-zai-desktop` as both `codex-zai` and
`codex-openai`.

## Adding content

[AGENTS.md](AGENTS.md) holds the layout conventions: harness kits under
`harness/<name>/`, cross-harness skills as
`<category>/<name>/SKILL.md`, folder name equal to the frontmatter
`name`.

## Model note

Model IDs (`glm-5.3-flash`, `glm-5.3`) resolve against the zai / zai
coding-plan providers. On a provider that doesn't serve them, edit the
`model:` lines or fall back to the built-ins; the skills document that
fallback (prompt-stamp `Model: ...`).
