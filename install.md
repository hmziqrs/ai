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

## Opt-in experiment — standalone workflow v2

When explicitly requested, copy the entire `harness/zcode/skills/z-workflow-v2/` folder
as regular files to `~/.zcode/skills/z-workflow-v2/`. This is a sixth global workflow
skill during the experiment; retain the existing global skills and seven agents.
It includes local orchestration personas, independent policies/references, a byte-identical
persona-kit copy, a model policy helper and the preparation template. Never install it
into a cross-harness skills directory. Domain specialists remain project-local.

Before copying, run these checks from the repo root:

```sh
bun test ./harness/zcode/skills/z-workflow-v2/scripts/check-behavior.ts
bun --no-env-file --config=/dev/null harness/zcode/skills/z-workflow-v2/scripts/check-script.ts harness/zcode/skills/z-workflow-v2/preparation-template.dwf.ts
```

Bun, Git and `bunx` access to TypeScript 5.9.3 are required. The second check validates
the copied facade and embedded helpers; CreateWorkflow remains the authoritative runtime
compiler/approval step. Open a new ZCode session after installation. Invoke
`$z-workflow-v2` explicitly for the experiment; it does not replace `$z-workflow`.
Uninstall only this experiment by removing its installed folder. Keep comparison prompts,
timings and results outside the skill installation and outside `research/`.

## Opt-in experiment — standalone workflow v3

When explicitly requested, copy the whole `harness/zcode/skills/z-workflow-v3/` folder as
regular files to `~/.zcode/skills/z-workflow-v3/`. This is an additional global experiment,
not a replacement for the five core skills or V2. Do not install it into `~/.agents/skills/`.
It bundles its own personas, policies, copied API references, unchanged v4 persona kit and
HIGH model-policy helper. No extra global agents or saved workflow engines are installed.
Niche specialists and domain skills remain project-local.

Before copying, run `bun install --frozen-lockfile` then `bun test` inside
`harness/zcode/skills/z-workflow-v3/`. After copying, run `bun install --frozen-lockfile`
inside `~/.zcode/skills/z-workflow-v3/` once to install its pinned checker dependency.
`node_modules/` is local tooling, not a source artifact to commit; retain `package.json`
and `bun.lock` when copying the skill.
For each authored draft use `bun --no-env-file --config=/dev/null
harness/zcode/skills/z-workflow-v3/scripts/check-script.ts <draft>`; Bun/Git and the installed
TypeScript 5.9.3 dependency are required. No bunx/network fetch occurs during checking.
This checks helper drift and strict facade types; actual
CreateWorkflow compilation and live task verification remain necessary.

Open a new ZCode session after copying and explicitly invoke `$z-workflow-v3`. Keep original
and V2 sessions unchanged for comparison. The evaluation procedure is in the skill's
`references/design-evidence.md`. Remove only its installed folder to uninstall this experiment.

## Opt-in experiment — standalone workflow v4

When requested, copy `harness/zcode/skills/z-workflow-v4/` as a whole folder of regular
files to `~/.zcode/skills/z-workflow-v4/`, excluding its local `node_modules/` tooling.
Retain original/V2/V3, do not mirror into `.agents/skills/`, and do not install niche agents
globally. No extra global agent definitions or saved workflow engines are installed.

Run `bun install --frozen-lockfile` once in the source and installed skill folder to resolve
the pinned local TypeScript checker. Run `bun test` in the source folder to validate the
model/authority helper and compiler diagnostics. Those are skill-tooling checks, not a
mandatory testing stage in V4 product workflows. The author writes only a fresh task body;
`bun --no-env-file --config=/dev/null <skillRoot>/scripts/assemble-script.ts <body.ts> <workflow.dwf.ts>`
attaches the existing helpers and invokes the checker once. Submit the result using
CreateWorkflow's `path` field. The assembler never executes a workflow, and the checker
never fetches packages during workflow execution. Actual CreateWorkflow analysis remains
authoritative for the current harness API. Bun and Git are runtime dependencies.

Use a new ZCode session and explicitly invoke `$z-workflow-v4`. V4 does not audit its plan,
run product tests/QA/audits or start incidental bug-fix loops unless the task requests them;
assembly and completion of the requested scope still apply. Existing agents load at session
start. Uninstall only V4 by removing its installed skill folder.

## Opt-in experiment — static ZFlow workflow v5

When requested, copy `harness/zcode/skills/z-workflow-v5/` as regular files to
`~/.zcode/skills/z-workflow-v5/`, excluding local `node_modules/`. Preserve the other
workflows. V5 is the explicit static-engine exception: the tested engine is bundled
inside this skill, not registered with SaveWorkflow or installed at a legacy workflows
path. No archived research artifact or extra global agent is installed.

Run `bun install --frozen-lockfile` in the source and installed folders to resolve the
pinned local TypeScript checker, and `bun test ./scripts` to verify the tooling. Ordinary
tasks provide a small request JSON to
`bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request.json> <run.dwf.ts>`.
The command inserts data into unchanged engine/helper source and checks it once, without
running product code or models. Launch the result through CreateWorkflow's `path` field.
Configuration and per-area implementation happen inside that one run.
The flat scheduler uses one awaited async task per area. Areas omit unrequested visual/check
work and advance independently; native channel/future scheduling is rejected before launch.

Open a new ZCode session and explicitly select `$z-workflow-v5`. Niche specialists remain
project-local. V5 does not add audit/QA phases unless requested, and no benchmark or app
session is launched by installation itself.

## Opt-in experiment — static ZFlow workflow v6

When requested, copy `harness/zcode/skills/z-workflow-v6/` as regular files to
`~/.zcode/skills/z-workflow-v6/`, excluding local `node_modules/`. Run
`bun --no-env-file --config=/dev/null install --frozen-lockfile` inside that installed folder
to install its pinned TypeScript checker. Keep V5 and all earlier versions unchanged.
Use a new ZCode session and select `$z-workflow-v6`. It retains the flat per-area engine,
HIGH defaults and optional audits/QA, and adds path normalization and targeted manifest
recovery. Later behavioral changes get a new numbered version. Niche specialists remain
project-local. Launch or monitor benchmarks only when the user requests it.

## Opt-in experiment — static ZFlow workflow v7

When requested, copy `harness/zcode/skills/z-workflow-v7/` as regular files to
`~/.zcode/skills/z-workflow-v7/`, excluding local `node_modules/`, then run
`bun --no-env-file --config=/dev/null install --frozen-lockfile` inside that folder.
Use a new ZCode session and `$z-workflow-v7`; niche personas remain project-local.
V7 owns its flat engine, persona/model helpers and references. It adds independent early
setup, structured completion/observations, local report recovery and compact handoffs.
Run `bun test ./scripts` in its source folder for maintenance verification. Keep V6 and
older versions unchanged; new behavior gets a new numbered skill. Full access does not
necessarily bypass ZCode's separate CreateWorkflow approval.

## Step 2 — Per-Project Niche install (`z-project-init` + snapshot manifest)

When initializing or updating a specific project `<project>`, load and follow [`harness/zcode/skills/z-project-init/SKILL.md`](harness/zcode/skills/z-project-init/SKILL.md):

1. **Inspect `<project>`'s manifests** (`Cargo.toml`, `src-tauri/tauri.conf.json`, `package.json`, `wrangler.*`, `cloudflare.config.ts`, `svelte.config.*`, `astro.config.*`, `pubspec.yaml`) and select only the matching niche artifacts from the `z-project-init` Stack-to-Artifact Matrix.
2. **Copy selected niche sub-agents** (`harness/zcode/agents/z-*.md`, chosen by the stack rows in `z-project-init`: for example `z-security-auditor.md` and `z-qa-evaluator.md` for a UI, and `z-native-device-verifier.md` for a desktop or mobile app) as regular files into `<project>/.zcode/agents/`.
3. **Copy selected niche workflow folders** (`z-gpui-workflow/`, `z-tauri-workflow/`, or `z-super-rustflow/`, plus `z-workflow/` so `<project>` pins its own `persona-kit.dwf.ts` and `references/specialists.md` at the snapshot commit) into `<project>/.zcode/skills/`.
4. **Copy selected niche domain skills** (for example `languages/rust/rust-superopt`, `rust-simd-crates`, `rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`, required external stack skills, and for PRD, site-recon or parity work `product/prd-authoring`, `product/site-recon` and `testing/parity-testing`) into `<project>/.agents/skills/`.
5. **Write `<project>/.zcode/hmziqrs-ai-snapshot.json`** recording:
   - `sourceRepo: "hmziqrs/ai"` and `sourceCommit` (`git -C <aiRepo> rev-parse HEAD`)
   - `personaKitVersion` (`v4`) and `personaKitSha256`
   - `detectedStacks` and `installed.{agents,workflowSkills,domainSkills,externalSkillDependencies}` with per-file `sha256` hashes.
6. **Updating one project:** run `z-project-init` in `<project>`. It compares the files on disk against `<project>/.zcode/hmziqrs-ai-snapshot.json` first (blocking on any locally modified file until confirmed), replaces only `<project>`'s niche files from the target `hmziqrs/ai` commit, removes legacy files this repo no longer ships (`<project>/.zcode/agents/shipflow-*.md`, `<project>/.zcode/agents/z-gh-operator.md`, `<project>/.zcode/agents/z-pr-merge-steward.md`, `<project>/.zcode/agents/z-queue-sentinel.md`, `<project>/.zcode/agents/z-github-project-manager.md`, `<project>/.zcode/agents/z-product-owner.md`, `<project>/.zcode/agents/z-api-contract-engineer.md`, `<project>/.zcode/agents/z-database-migration-engineer.md`, `<project>/.zcode/agents/z-product-flow-analyst.md`, `<project>/.zcode/agents/z-accessibility-auditor.md`, `<project>/.zcode/agents/z-ci-diagnostician.md`, `<project>/.zcode/skills/shipflow/`, `<project>/.zcode/workflows/shipflow-queue.dwf.ts`, `<project>/.zcode/workflows/zflow-engine.dwf.ts`) together with their snapshot entries, and writes the new snapshot without affecting any other project on the machine.

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
    each containing `SKILL.md`. Explicitly requested `z-workflow-v2` and
    `z-workflow-v3`, `z-workflow-v4`, `z-workflow-v5`, `z-workflow-v6` and `z-workflow-v7` experiments may additionally be present; nothing else mirrors them.
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

### Opt-in composable V8 experiment

When explicitly installing `z-workflow-v8`, copy the whole
`harness/zcode/skills/z-workflow-v8/` folder as regular files to
`~/.zcode/skills/z-workflow-v8/`, excluding development `node_modules/` and generated `dist/`.
Run `bun install --frozen-lockfile` in that destination for its pinned checker dependency.
Keep V7 and every older version. This authorized experimental source library is not a new
core default or a SaveWorkflow installation. Niche agent/domain files remain project-local.
Open a new ZCode session to discover the skill; use its selection/authorization contract.

### Opt-in V9 author and composable workflow

When explicitly selecting V9, copy `harness/zcode/skills/z-workflow-v9/` to
`~/.zcode/skills/z-workflow-v9/` as regular files, excluding development `node_modules/` and
`dist/`, then run `bun install --frozen-lockfile` in the destination. Copy
`harness/zcode/agents/workflow-author-v9.md` as the regular file
`~/.zcode/agents/workflow-author-v9.md`. This is an opt-in exception for one preparation
author, not an addition to the seven default Global Core agents or an authorization to
install niche specialists globally. Its skill-local persona copy must match that definition.

V9 is standalone: it carries its own helpers/pieces/references and byte-identical v4 kit.
The Flash HIGH author prepares one typed plan and invokes the deterministic assembler;
execution does not repeat configuration. Real plan-audit, TUI-test and web-vision sections
are available when requested. Current ZCode approval and guarded delivery still apply.
Preserve V8 and older versions. Open a new ZCode session to discover both V9 artifacts.
Installing V9 neither promotes it nor authorizes launching an app benchmark.

### Opt-in V12 author and standalone workflow

When explicitly selecting V12, copy `harness/zcode/skills/z-workflow-v12/` to
`~/.zcode/skills/z-workflow-v12/` as regular files, excluding development `node_modules/` and
`dist/`, then run `bun install --frozen-lockfile` in the destination. Copy
`harness/zcode/agents/workflow-author-v12.md` as the regular file
`~/.zcode/agents/workflow-author-v12.md`. This is an opt-in exception for one preparation
author (which carries Edit access for the user-authorized pre-workflow bootstrap of
uninitialized projects), not an addition to the seven default Global Core agents or an
authorization to install niche specialists globally. Its skill-local persona copy must match
that definition.

V12 is V11's engine plus the user-authorized pre-workflow bootstrap and three behavior
changes: judgment findings without repair authority are reported and never veto a completed
run; each lane's committed hand-off is an immutable snapshot, so later check outcomes never
retroactively block dependents; and the engine's final phase performs guarded
checkout-anchored fast-forward delivery and `z-v12/*`-only branch reclamation (current ZCode
approval still applies). Engine-run command outputs (lockfiles, generated sources) are engine
artifacts that never trip lane ownership; dependency files (lockfiles and co-rewritten manifests) integrate once at the candidate. The bootstrap is a git baseline commit, an ignored workflow-drafts
directory, a thin scaffold for empty projects when the brief names a stack, and no scaffold
lane for bootstrapped projects. It carries its own
helpers/pieces/references and a byte-identical v4 kit. Preserve V11 and older versions. Open
a new ZCode session to discover both V12 artifacts. Installing V12 neither promotes it nor
authorizes launching an app benchmark.

### Standalone zflow-chain workflow (V13)

When explicitly selecting V13, copy `harness/zcode/skills/z-workflow-v13/` to
`~/.zcode/skills/z-workflow-v13/` as regular files, excluding development `node_modules/`
and `dist/`, then run `bun install --frozen-lockfile` in the destination. V13 defines no
agent files — nothing is copied to `~/.zcode/agents/`, and no new session is needed to
load one.

V13 revives the historical zflow v2.2 parallel-chain engine (recovered from this repo's
git history, engine bytes unchanged from `f1397dd^`) as a maintained opt-in engine: the
coordinator classifies areas by contention, prepares one launch with
`scripts/prepare-run.ts` (clean branch anchors, stale-runTag and `.zflow/`-ignore
refusals, one facade check, printed launch JSON), and makes ONE `CreateWorkflow` call with
`path` — never a SaveWorkflow registration, never a relaunch to fix. Every area loops
independently (plan, implement, vision, judge) over channels with a counted close; the
engine never writes the user's checkout and delivers only through the skill's Step 6
guarded fast-forward. Validation after any engine edit:
`bun --no-env-file --config=/dev/null scripts/check-script.ts zflow-engine.dwf.ts` and
`bun test ./scripts`; the installed engine stays byte-identical to this repo's copy
(`diff -q`). Preserve V12 and older versions. Installing V13 neither promotes it nor
authorizes launching a benchmark.
