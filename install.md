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

## Installation policy: Global Core vs Per-Project Niche (Hard Rule)

Do **not** dump all 31 agents, all workflow profiles, or all domain skills into global `~/.zcode/` or `~/.agents/skills/` directories. Installing niche sub-agents, niche workflows, and stack-specific skills globally pollutes every session's index across unrelated repositories and forces every project on the machine to update simultaneously whenever `hmziqrs/ai` changes.

Installation is strictly split into two tiers:

| Tier | Destination | What belongs here |
|---|---|---|
| **1. Global Core (machine-wide)** | `~/.zcode/agents/`, `~/.zcode/skills/`, `~/.agents/skills/` | **Only the 7 core orchestration/general agents** (`general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, `workflow-planner-flash.md`), **the 5 general workflow/initializer skills** (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`, `z-project-init`), and **the 5 universal cross-project baseline skills** (`antislop-copy`, `code-comments`, `test-quality-guardrails`, `test-quality-tdd-agents`, `test-quality-audit`). |
| **2. Per-Project Niche (project-scoped via `z-project-init`)** | `<project>/.zcode/agents/`, `<project>/.zcode/skills/`, `<project>/.agents/skills/`, `<project>/.zcode/hmziqrs-ai-snapshot.json` | **Only the niche `z-*.md` specialists** (for example `z-security-auditor` and `z-qa-evaluator`), **niche workflow profiles** (`z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`, plus a project-pinned copy of `z-workflow`), and **stack-specific domain skills** (`languages/rust/rust-*` and external framework skills) that `<project>` actually uses, pinned by commit SHA and file hashes in `<project>/.zcode/hmziqrs-ai-snapshot.json`. |

Never install `general-pro`, `general-flash`, `explore-flash`, `workflow-author`, `workflow-author-flash`, `workflow-planner`, or `workflow-planner-flash` per-project. Never install `z-*.md`, `z-gpui-workflow`, `z-tauri-workflow`, or `z-super-rustflow` globally.

## Step 1 — Global Core install (ZCode kit + universal baseline)

1. Copy **only the 7 global core agents** from `harness/zcode/agents/` to `~/.zcode/agents/`:
   - `general-pro.md`
   - `general-flash.md`
   - `explore-flash.md`
   - `workflow-author.md`
   - `workflow-author-flash.md`
   - `workflow-planner.md`
   - `workflow-planner-flash.md`
   Copy as regular files, never symlinks — ZCode silently skips symlinked agent files. Do **not** copy `z-*.md` into `~/.zcode/agents/`.
2. Copy **only the 5 global core ZCode skills** from `harness/zcode/skills/` to `~/.zcode/skills/` (whole folders, keeping folder names):
   - `z-workflow/` (carries `persona-kit.dwf.ts` and `references/specialists.md`)
   - `z-proflow/`
   - `z-flashflow/`
   - `z-liteflow/` (carries `liteflow-template.dwf.ts`)
   - `z-project-init/` (the native ZCode project initializer and snapshot manager)
   Never copy ZCode-harness skills into `~/.agents/skills/` — they are useless in other harnesses and double every ZCode session's skill index when mirrored there. Do **not** copy `z-gpui-workflow`, `z-tauri-workflow`, or `z-super-rustflow` into `~/.zcode/skills/`.
3. Copy **only the 5 universal baseline category skills** to `~/.agents/skills/` (whole folders, keeping folder names):
   - `copy/antislop-copy/`
   - `coding/code-comments/`
   - `coding/test-quality-guardrails/`
   - `coding/test-quality-tdd-agents/`
   - `coding/test-quality-audit/`
4. Update Global Core = re-copy the folders/files listed in steps 1–3. Uninstall Global Core = delete those copied folders/files.

## Step 2 — Per-Project Niche install (`z-project-init` + snapshot manifest)

When initializing or updating a specific project `<project>`, load and follow [`harness/zcode/skills/z-project-init/SKILL.md`](harness/zcode/skills/z-project-init/SKILL.md):

1. **Inspect `<project>`'s manifests** (`Cargo.toml`, `src-tauri/tauri.conf.json`, `package.json`, `wrangler.*`, `cloudflare.config.ts`, `svelte.config.*`, `astro.config.*`, `pubspec.yaml`) and select only the matching niche artifacts from the `z-project-init` Stack-to-Artifact Matrix.
2. **Copy selected niche sub-agents** (`harness/zcode/agents/z-*.md`, chosen by the stack rows in `z-project-init`: for example `z-security-auditor.md`, `z-qa-evaluator.md` and `z-accessibility-auditor.md` for a UI, and `z-native-device-verifier.md` for a desktop or mobile app) as regular files into `<project>/.zcode/agents/`.
3. **Copy selected niche workflow folders** (`z-gpui-workflow/`, `z-tauri-workflow/`, or `z-super-rustflow/`, plus `z-workflow/` so `<project>` pins its own `persona-kit.dwf.ts` and `references/specialists.md` at the snapshot commit) into `<project>/.zcode/skills/`.
4. **Copy selected niche domain skills** (for example `languages/rust/rust-superopt`, `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`, required external stack skills, and for PRD, site-recon or parity work `product/prd-authoring`, `product/site-recon` and `testing/parity-testing`) into `<project>/.agents/skills/`.
5. **Write `<project>/.zcode/hmziqrs-ai-snapshot.json`** recording:
   - `sourceRepo: "hmziqrs/ai"` and `sourceCommit` (`git -C <aiRepo> rev-parse HEAD`)
   - `personaKitVersion` (`v4`) and `personaKitSha256`
   - `detectedStacks` and `installed.{agents,workflowSkills,domainSkills,externalSkillDependencies}` with per-file `sha256` hashes.
6. **Updating one project:** run `z-project-init` in `<project>`. It compares the files on disk against `<project>/.zcode/hmziqrs-ai-snapshot.json` first (blocking on any locally modified file until confirmed), replaces only `<project>`'s niche files from the target `hmziqrs/ai` commit, removes legacy files this repo no longer ships (`<project>/.zcode/agents/shipflow-*.md`, `<project>/.zcode/agents/z-gh-operator.md`, `<project>/.zcode/agents/z-pr-merge-steward.md`, `<project>/.zcode/agents/z-queue-sentinel.md`, `<project>/.zcode/agents/z-github-project-manager.md`, `<project>/.zcode/agents/z-product-owner.md`, `<project>/.zcode/skills/shipflow/`, `<project>/.zcode/workflows/shipflow-queue.dwf.ts`, `<project>/.zcode/workflows/zflow-engine.dwf.ts`) together with their snapshot entries, and writes the new snapshot without affecting any other project on the machine.

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

- **Global Core (`~/.zcode/` and `~/.agents/skills/`):**
  - `ls ~/.zcode/agents/` lists **only** `general-flash.md`, `explore-flash.md`,
    `general-pro.md`, `workflow-author.md`, `workflow-author-flash.md`,
    `workflow-planner.md`, and `workflow-planner-flash.md` (no
    `z-*.md`). `find ~/.zcode/agents -type l` prints nothing.
  - `ls ~/.zcode/skills/` lists **only** the 5 global core ZCode skills
    (`z-workflow`, `z-proflow`, `z-flashflow`, `z-liteflow`, `z-project-init`),
    each containing `SKILL.md` — and nothing else mirrors them.
  - `ls ~/.agents/skills/` lists the 5 universal baseline skills
    (`antislop-copy`, `code-comments`, `test-quality-guardrails`,
    `test-quality-tdd-agents`, `test-quality-audit`) — and no ZCode workflow skills.
- **Per-Project Niche (`<project>/.zcode/` and `<project>/.agents/skills/`, when initialized):**
  - `<project>/.zcode/hmziqrs-ai-snapshot.json` exists and records `sourceCommit`,
    `personaKitVersion`, `personaKitSha256`, and matching `sha256` hashes for every
    installed agent, workflow, and domain skill.
  - `<project>/.zcode/agents/` contains only the project's selected `z-*.md`
    specialists, as regular files
    (`find <project>/.zcode/agents -type l` prints nothing), and none of the 7
    global core agents.
  - `<project>/.zcode/skills/` contains `z-workflow/` plus only the project's
    selected niche workflows (`z-gpui-workflow`, `z-tauri-workflow`,
    `z-super-rustflow`), and `<project>/.agents/skills/` contains
    the project's selected domain/framework skills (such as `rust-*`, `gpui-kit`,
    `tauri-v2`, etc.).
- Agents load at session start: restart ZCode or open a new session,
  then Settings → Subagents lists the copied agents.

## Specialist knowledge

Agent files name primary and task-specific skills. The category packs in this repository
supply comment/test discipline and Rust performance knowledge. Framework skills, Rust
practices/testing/async skills and device tooling are separate dependencies. Resolve them
from the session's available-skills index before dispatch, and install missing requirements
from approved sources. Do not copy another machine's absolute paths into personas or treat
an absent required skill as available.

`z-gpui-engineer` and `z-gpui-workflow` reference `gpui-kit` (`references/conventions.md`,
`references/coding-guides.md`, `references/recipes.md`, and `references/gpui/*.md`) and
require `gpui-kit-design-guides` (`references/design-guides.md`) for any visible screen,
layout, spacing, token, overlay, or interaction change, with documented fallback to the
official `https://gpui-kit.com/docs/*.md` pages when permitted by project policy.

`z-tauri-integrator` and `z-tauri-workflow` reference `tauri-v2`, `tauri`,
`understanding-tauri-architecture`, `calling-rust-from-tauri-frontend`,
`configuring-tauri-permissions`, and `integrating-tauri-js-frontends`, separating Rust
Core (`src-tauri/`), capability/permission boundaries, and static frontend skills. Live
desktop and mobile verification routes through `z-native-device-verifier` using
`open-computer-use` (`ocu`) in a serialized single-worker device lane.

The Rust specialists (`z-rust-engineer`, `z-rust-perf-engineer`, `z-rust-memory-engineer`,
`z-rust-simd-engineer`, `z-rust-async-engineer`, `z-unsafe-ffi-auditor`, and
`z-axum-engineer`) and `z-super-rustflow` route across this repository's five `languages/rust/*`
packs (`rust-superopt`, `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`,
`rust-fast-architecture`) and the session-installed Rust skills (`rust-string-perf`,
`rust-succinct-structures`, `rust-service-comms`, `rust-embedded-storage`,
`rust-best-practices`, `rust-async-patterns`, `rust-testing`, `axum-web-framework`,
`axum-code-review`).

`z-cloudflare-engineer` references [Cloudflare-maintained skills](https://github.com/cloudflare/skills)
directly, using installed copies or official source URLs. D1, R2 and KV use the relevant
product references inside `cloudflare`; Workers, Durable Objects and CLI tasks select their
own skills. Install only needed upstream folders and retain their references.

`z-tanstack-engineer` references existing per-package skills directly: installed TanStack
Intent core/task/adapter skills where available, and explicitly scoped community Query,
Store, Form and Virtual skills. Its source links distinguish framework-neutral guidance
from React examples. Resolve only relevant dependencies before dispatch; retain linked
references when installing an upstream skill. Runtime loading follows project source policy.

Persona change guards require Bun and Git at runtime. They execute embedded TypeScript
with project configuration and environment-file autoloading disabled.

## Source validation

Run `bun harness/zcode/scripts/check-personas.mjs` from the repository root. It checks agent
frontmatter, model pins and colors, loader behavior, and the embedded persona-kit copies in
every skill. It checks code and fixtures only: it does not launch a ZCode workflow or prove
runtime tool restrictions.

If the repository carries `harness/zcode/agents/z-web-spec-auditor.md`, run the persona check on
a copy of the tree without that file:

```sh
S=$(mktemp -d) && rsync -a --exclude .git --exclude .zcode --exclude .zflow --exclude research ./ "$S/" \
  && rm "$S/harness/zcode/agents/z-web-spec-auditor.md" && (cd "$S" && bun harness/zcode/scripts/check-personas.mjs)
```

## Report back

State which kit(s) you installed, the agents and skills now present,
and that a restart / new session is required to load the agents.
