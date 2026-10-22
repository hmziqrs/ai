# Installing `ai`

There is no installer script. This file is the procedure: an AI agent
given this repo completes it with its own file tools, and a human can
follow the same steps. Everything is plain copies — no build, no
dependencies.

Installable content comes in two kinds (see [README.md](README.md)):

- `harness/zcode/` — the ZCode kit (agents and ZCode-specific skills).
- other top-level directories except `research/` and `archive/`
  (`copy/`, `coding/`, …) are cross-harness skill categories. **All
  categories apply to every harness.**

`research/` contains source reports and historical snapshots; `archive/`
contains the retired pre-2026-10 workflow family. Exclude both from all
discovery and copy operations. Installation does not authorize reading
either; follow the access rule in [AGENTS.md](AGENTS.md).

## Installation policy: Global Core vs Per-Project Niche (hard rule)

Do **not** dump all agents or all domain skills into global `~/.zcode/` or
`~/.agents/skills/` directories. Global installs pollute every session's
index across unrelated repositories and force every project on the machine
to update simultaneously whenever `hmziqrs/ai` changes.

| Tier | Destination | What belongs here |
|---|---|---|
| **1. Global Core (machine-wide)** | `~/.zcode/agents/`, `~/.zcode/skills/`, `~/.agents/skills/` | **Only the 4 core agents** (`general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-launcher.md`), **the 2 core ZCode skills** (`z-workflow`, `z-project-init`), and **the 5 universal baseline skills** (`antislop-copy`, `code-comments`, `test-quality-guardrails`, `test-quality-tdd-agents`, `test-quality-audit`). |
| **2. Per-Project Niche (project-scoped via `z-project-init`)** | `<project>/.zcode/agents/`, `<project>/.agents/skills/`, `<project>/.zcode/hmziqrs-ai-snapshot.json` | **Only the niche `z-*.md` specialists** the project actually uses (for example `z-security-auditor`, `z-rust-engineer`, `z-qa-evaluator`) and **stack-specific domain skills** (`languages/rust/rust-*`, `product/*`, `testing/*`, and external framework skills), pinned by commit SHA and file hashes in the snapshot. |

Never install `general-pro`, `general-flash`, `explore-flash`, or
`workflow-launcher` per-project. Never install `z-*.md` specialists
globally.

## Step 1 — Global Core install

1. Copy **only the 4 global core agents** from `harness/zcode/agents/` to
   `~/.zcode/agents/`:
   - `general-pro.md`
   - `general-flash.md`
   - `explore-flash.md`
   - `workflow-launcher.md`
   Copy as regular files, never symlinks — ZCode silently skips symlinked
   agent files. Do **not** copy `z-*.md` into `~/.zcode/agents/`.
2. Copy **only the 2 global core ZCode skills** from
   `harness/zcode/skills/` to `~/.zcode/skills/` (whole folders, keeping
   folder names):
   - `z-workflow/` — the parallel fast-execution workflow skill
   - `z-project-init/` — the per-project initializer and snapshot manager
   Never copy ZCode-harness skills into `~/.agents/skills/`.
3. Copy **only the 5 universal baseline category skills** to
   `~/.agents/skills/` (whole folders, keeping folder names):
   - `copy/antislop-copy/`
   - `coding/code-comments/`
   - `coding/test-quality-guardrails/`
   - `coding/test-quality-tdd-agents/`
   - `coding/test-quality-audit/`
4. Update Global Core = re-copy the folders/files above, then run the
   cleanup step below.

### Cleanup of retired workflow installs (run on every update)

The pre-2026-10 workflow family is retired into `archive/`. When updating
an existing machine, remove these from the **global** directories (only
copies — the repo keeps everything in `archive/`):

- `~/.zcode/skills/`: `z-workflow-v2` … `z-workflow-v13`, `z-proflow`,
  `z-flashflow`, `z-liteflow`, `z-gpui-workflow`, `z-tauri-workflow`,
  `z-super-rustflow` (the fresh `z-workflow` replaces the old one).
- `~/.zcode/agents/`: `workflow-author.md`, `workflow-author-flash.md`,
  `workflow-planner.md`, `workflow-planner-flash.md`,
  `workflow-author-v9.md` … `workflow-author-v12.md`.
- `~/.zcode/workflows/`: `zflow-engine.dwf.ts` and any other
  `z-*`/`shipflow-*` saved engines.
- `<project>/.zcode/skills/` in initialized projects: the niche workflow
  folders above (reported by `z-project-init`, removed after the usual
  local-modification confirmation).

## Step 2 — Per-Project Niche install (`z-project-init` + snapshot manifest)

When initializing or updating a specific project `<project>`, load and
follow [`harness/zcode/skills/z-project-init/SKILL.md`](harness/zcode/skills/z-project-init/SKILL.md):

1. **Inspect `<project>`'s manifests** (`Cargo.toml`,
   `src-tauri/tauri.conf.json`, `package.json`, `wrangler.*`,
   `svelte.config.*`, `astro.config.*`, `pubspec.yaml`) and select only the
   matching niche artifacts from the `z-project-init` stack matrix.
2. **Copy selected niche sub-agents** (`harness/zcode/agents/z-*.md`) as
   regular files into `<project>/.zcode/agents/`.
3. **Copy selected niche domain skills** (for example
   `languages/rust/rust-*`, and for PRD / site-recon / parity work
   `product/prd-authoring`, `product/site-recon`,
   `testing/parity-testing`) into `<project>/.agents/skills/`.
4. **Write `<project>/.zcode/hmziqrs-ai-snapshot.json`** recording
   `sourceRepo: "hmziqrs/ai"`, `sourceCommit`
   (`git -C <aiRepo> rev-parse HEAD`), `detectedStacks`, and
   `installed.{agents,domainSkills,externalSkillDependencies}` with
   per-file `sha256` hashes.
5. **Updating one project:** run `z-project-init` in `<project>`. It
   compares disk against the snapshot first (blocking on any locally
   modified file until confirmed), replaces only that project's niche
   files from the target commit, removes files this repo no longer ships
   (including the retired workflow skills listed above and legacy
   shipflow/zflow artifacts) together with their snapshot entries, and
   writes the new snapshot without affecting any other project.

## Skills-only via skills.sh (optional)

```sh
npx skills add hmziqrs/ai -g -a zcode -y
```

Archived definitions under `research/` and `archive/` use
`SKILL.snapshot.md`; never select either for installation.

Installs SKILL.md packs into `~/.zcode/skills/` (other `-a` targets:
claude-code, cursor, universal, …). Scope what you install: this is for
the cross-harness category packs — the z-flow skills belong to the ZCode
kit (Step 1). Skills only — the sub-agent definitions under
`harness/zcode/agents/` still need Step 1.

## Verify (ZCode)

- **Global Core:**
  - `ls ~/.zcode/agents/` lists **only** `general-pro.md`,
    `general-flash.md`, `explore-flash.md`, and `workflow-launcher.md`
    (no `z-*.md`, no retired workflow agents).
    `find ~/.zcode/agents -type l` prints nothing.
  - `ls ~/.zcode/skills/` lists **only** `z-workflow` and `z-project-init`
    (plus non-repo skills); no `z-workflow-v*`, no `z-proflow` /
    `z-flashflow` / `z-liteflow` / niche workflow folders.
  - `ls ~/.agents/skills/` includes the 5 universal baseline skills — and
    no ZCode workflow skills.
- **Per-Project Niche (when initialized):**
  - `<project>/.zcode/hmziqrs-ai-snapshot.json` exists and records
    `sourceCommit` and matching `sha256` hashes for every installed agent
    and domain skill.
  - `<project>/.zcode/agents/` contains only the project's selected
    `z-*.md` specialists as regular files, and none of the 4 global core
    agents.
  - `<project>/.zcode/skills/` contains no workflow skills at all.
- Agents load at session start: restart ZCode or open a new session, then
  Settings → Subagents lists the copied agents.

## Specialist knowledge

Agent files name primary and task-specific skills. The category packs in
this repository supply comment/test discipline and Rust performance
knowledge. Framework skills, Rust practices/testing/async skills and
device tooling are separate dependencies. Resolve them from the session's
available-skills index before dispatch, and install missing requirements
from approved sources. Do not copy another machine's absolute paths into
personas or treat an absent required skill as available.

`z-gpui-engineer` references `gpui-kit` (`references/conventions.md`,
`references/coding-guides.md`, `references/recipes.md`, and
`references/gpui/*.md`) and requires `gpui-kit-design-guides`
(`references/design-guides.md`) for any visible screen, layout, spacing,
token, overlay, or interaction change, with documented fallback to the
official `https://gpui-kit.com/docs/*.md` pages when permitted by project
policy.

`z-tauri-integrator` references `tauri-v2`, `tauri`,
`understanding-tauri-architecture`,
`calling-rust-from-tauri-frontend`, `configuring-tauri-permissions`, and
`integrating-tauri-js-frontends`, separating Rust Core (`src-tauri/`),
capability/permission boundaries, and static frontend skills.

The Rust specialists (`z-rust-engineer`, `z-rust-perf-engineer`,
`z-rust-memory-engineer`, `z-rust-simd-engineer`, `z-rust-async-engineer`,
`z-unsafe-ffi-auditor`, `z-axum-engineer`) route across this repository's
five `languages/rust/*` packs (`rust-superopt`, `rust-simd-crates`,
`rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`) and
the session-installed Rust skills (`rust-string-perf`,
`rust-succinct-structures`, `rust-service-comms`,
`rust-embedded-storage`, `rust-best-practices`, `rust-async-patterns`,
`rust-testing`, `axum-web-framework`, `axum-code-review`).

`z-cloudflare-engineer` references [Cloudflare-maintained
skills](https://github.com/cloudflare/skills) directly, using installed
copies or official source URLs. `z-tanstack-engineer` references existing
per-package TanStack skills directly. Resolve only relevant dependencies
before dispatch.

## Report back

State the agents and skills now present, any retired workflow installs you
removed, and that a restart / new session is required to load the agents.
