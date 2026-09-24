# Installing `ai`

There is no installer script. This file is the procedure: an AI agent
given this repo completes it with its own file tools, and a human can
follow the same steps. Everything is plain copies — no build, no
dependencies.

Content comes in two kinds (see [README.md](README.md)):

- `harness/<name>/` — a harness-specific kit. Only the kit for your
  harness applies.
- every other top-level directory (`copy/`, …) — a cross-harness skill
  category. **All of them apply to every harness.**

## ZCode kit

1. Copy each `harness/zcode/agents/*.md` to `~/.zcode/agents/`.
   Copy, never symlink — ZCode silently skips symlinked agent files.
2. Copy each skill folder to `~/.agents/skills/` (or
   `~/.zcode/skills/` if you prefer ZCode-scoped skills), keeping the
   folder name. Sources:
   - the five z-flow skills in `harness/zcode/skills/`
     (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`,
     `z-gpui-workflow`)
   - every skill folder in every category directory (`copy/antislop-copy`,
     …)
3. The z-flow skills need the engine: copy
   `harness/zcode/workflows/zflow-engine.dwf.ts` to
   `~/.zcode/workflows/`. Its contract is `zflow-SPEC.md` beside the
   source.
4. Update = re-copy; folders are replaced wholesale. Uninstall = delete
   the copied folders listed above.

## Codex kit

Follow [harness/codex/install.md](harness/codex/install.md). It covers
the provider config, the secret file, model-catalog rendering, the
skills, and uninstall.

## Skills-only via skills.sh (optional)

```sh
npx skills add hmziqrs/ai -g -a zcode -y
```

Installs the SKILL.md packs into `~/.zcode/skills/` (other `-a`
targets: claude-code, cursor, universal, …). Skills only — the
sub-agent definitions under `harness/zcode/agents/` still need the
ZCode-kit steps above.

## Verify (ZCode)

- `ls ~/.zcode/agents/` lists `general-flash.md`, `explore-flash.md`,
  `general-pro.md`; `find ~/.zcode/agents -type l` prints nothing.
- `ls ~/.agents/skills/` lists the five z-flow skills and
  `antislop-copy/`, each containing `SKILL.md`.
- `ls ~/.zcode/workflows/` lists `zflow-engine.dwf.ts`.
- Agents load at session start: restart ZCode or open a new session,
  then Settings → Subagents lists the three agents.

## Report back

State which kit(s) you installed, the agents and skills now present,
and that a restart / new session is required to load the agents.
