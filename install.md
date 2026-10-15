# Installing `ai`

There is no installer script. This file is the procedure: an AI agent
given this repo completes it with its own file tools, and a human can
follow the same steps. Everything is plain copies — no build, no
dependencies.

Installable content comes in two kinds (see [README.md](README.md)):

- `harness/<name>/` — a harness-specific kit. Only the kit for your
  harness applies.
- other top-level directories except `research/` (`copy/`, …) are
  cross-harness skill categories. **All categories apply to every harness.**

`research/` contains source reports and historical snapshots. Exclude it from
all discovery and copy operations. Installation does not authorize reading it;
follow the research-access rule in [AGENTS.md](AGENTS.md).

## ZCode kit

1. Copy each `harness/zcode/agents/*.md` to `~/.zcode/agents/`.
   Copy, never symlink — ZCode silently skips symlinked agent files.
2. Skills install by kind — never mix the destinations:
   - The seven z-flow skills in `harness/zcode/skills/`
     (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`,
     `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`) are
     ZCode-harness skills: copy them ONLY to `~/.zcode/skills/`,
     keeping the folder name. Never `~/.agents/skills/` — they are
     useless in other harnesses and double every ZCode session's skill
     index when mirrored there.
   - Every skill folder in every category directory, excluding `research/`
     and nested to any depth
     (`copy/antislop-copy`, `languages/rust/rust-superopt`, …), is
     cross-harness: copy those to `~/.agents/skills/`, keeping the
     folder name.
3. The z-flow skills need the engine: copy
   `harness/zcode/workflows/zflow-engine.dwf.ts` to
   `~/.zcode/workflows/`. Its contract is `zflow-SPEC.md` beside the
   source. z-super-rustflow is the exception: it composes its own inline
   runs and needs no engine (it may offer to save a validated
   `rustflow-engine` later — the user's call).
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

Archived definitions under `research/` use `SKILL.snapshot.md`; never select
research material for installation.

Installs SKILL.md packs into `~/.zcode/skills/` (other `-a` targets:
claude-code, cursor, universal, …). Scope what you install: this is for
the cross-harness category packs — the z-flow skills belong to the ZCode
kit (step 2), and the four same-named Codex-native ports under
`harness/codex/plugins/zai-workflows/skills/` (z-workflow, z-proflow,
z-flashflow, z-liteflow) must never land in `~/.zcode/skills/`, where
they would clobber the ZCode kit's skills by folder name. Skills only —
the sub-agent definitions under `harness/zcode/agents/` still need the
ZCode-kit steps above.

## Verify (ZCode)

- `ls ~/.zcode/agents/` lists `general-flash.md`, `explore-flash.md`,
  `general-pro.md`; `find ~/.zcode/agents -type l` prints nothing.
- `ls ~/.zcode/skills/` lists the seven z-flow skills
  (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`,
  `z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`), each
  containing `SKILL.md` — and nothing else mirrors them.
- `ls ~/.agents/skills/` lists the cross-harness skills only:
  `antislop-copy/`, the coding skills (`code-comments`,
  `test-quality-guardrails`, `test-quality-tdd-agents`,
  `test-quality-audit`), and the five rust skills (`rust-superopt`,
  `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`,
  `rust-fast-architecture`) — no z-flow skills.
- `ls ~/.zcode/workflows/` lists `zflow-engine.dwf.ts`.
- Agents load at session start: restart ZCode or open a new session,
  then Settings → Subagents lists the three agents.

## Report back

State which kit(s) you installed, the agents and skills now present,
and that a restart / new session is required to load the agents.
