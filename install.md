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

## The z-flow skills and the zflow-engine

The five z-flow skills (`z-workflow`, `z-proflow`, `z-flashflow`,
`z-liteflow`, `z-gpui-workflow`) are thin chain-coordinator wrappers:
they launch the saved `zflow-engine` dynamic workflow as tier-pure
nodes (implement / vision / judge) instead of running a state-file
loop. The engine is not installed by Tasks A–C — its source lives at
`zcode/workflows/zflow-engine.dwf.ts` in the repo (contract in
`zflow-SPEC.md` beside it) and it installs as a saved workflow at
`~/.zcode/workflows/`.

## Verify

- `ls ~/.zcode/agents/` shows `general-flash.md`, `explore-flash.md`,
  `general-pro.md`.
- `find ~/.zcode/agents -type l` prints nothing — agent files must be
  regular files.
- `ls ~/.agents/skills/` shows `z-workflow/`, `z-proflow/`,
  `z-flashflow/`, `z-liteflow/`, and
  `z-gpui-workflow/` each containing `SKILL.md`.
- ZCode picks up agents at session start: restart ZCode or open a new
  session, then check Settings → Subagents lists the three agents.

## Report back

State: which task ran, agents and skills now present,
and that a ZCode restart / new session is required to load the agents.

## Codex + Z.ai kit

This page's Tasks A–C are for the default ZCode kit. For Codex, run:

```sh
npx github:hmziqrs/ai codex
```

The Codex installer uses the Z.ai Responses endpoint, installs five Codex agent
definitions and six profiles, installs the four Codex workflow skills, and
imports `ZAI_API_KEY` into the private Codex-only file
`~/.codex/secrets/zai-api-key` with mode `0600`. Provider authentication reads
that file; the key never enters Git or `~/.codex/config.toml`. See
[codex/install.md](codex/install.md) for the complete behavior and
`codex uninstall` command.
