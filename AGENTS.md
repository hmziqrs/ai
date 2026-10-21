# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — harness kits and cross-harness skill categories.
There is no installer: agents install this repo by following
`install.md`, and humans can follow the same steps.

## Research access (hard rule)

`research/` contains source reports, design studies, and historical experiments.
Never browse, enumerate, search, index, or read it on your own. Access is allowed
only in these two cases:

1. The user's prompt explicitly asks to inspect or use research material.
2. The task itself is research-related and the material is relevant to that work.

For every other task, exclude `research/` from recursive searches, file discovery,
audits, and delegated exploration. A link or citation pointing there does not
grant access. When access is allowed, read only what the task needs.

`research/` is never a skill category or installation source. Do not install
archived skills, agents, or workflows from it. Historical skill definitions use
`SKILL.snapshot.md` so discovery cannot mistake them for active skills.

## Layout

```
harness/<name>/              harness-SPECIFIC kits (only what depends on a harness)
  zcode/agents/<name>.md       ZCode sub-agent definitions (YAML frontmatter + system-prompt body)
  zcode/skills/<name>/SKILL.md ZCode-specific skills (the seven z-flow chains)
  codex/                       Codex kit (agents, profiles, plugin, model-catalogs, scripts)
<category>/[<group>/]<skill>/SKILL.md  cross-harness skill categories (copy/, languages/rust/, ...): plain SKILL.md skills, optionally grouped
research/                    source reports and historical material; access restricted above, never installed
install.md                   ZCode-kit + categories install procedure
llms.txt                     entry point for consuming agents
```

## Conventions

- Installable content has two kinds: `harness/<name>/` kits
  (harness-specific layout) and top-level category directories holding
  skill folders directly. `research/` is excluded from both.
  Litmus test: if content references CreateWorkflow, model pins, Codex
  TOML, or any harness mechanism, it belongs in a harness kit;
  otherwise it belongs in a category.
- Skill folder name MUST equal the frontmatter `name` (lowercase
  alphanumerics and hyphens). Names must be unique across all
  categories and kits. Installation uses a strict **Global Core vs
  Per-Project Niche** split (see `install.md` and `z-project-init`):
  - **Global Core**: only the 7 core agents (`general-pro`, `general-flash`,
    `explore-flash`, `workflow-author`, `workflow-author-flash`,
    `workflow-planner`, `workflow-planner-flash`) install into
    `~/.zcode/agents/`; only the 5 core ZCode skills (`z-workflow`,
    `z-proflow`, `z-flashflow`, `z-liteflow`, `z-project-init`) install into
    `~/.zcode/skills/`; and only the 5 universal baseline skills
    (`antislop-copy`, `code-comments`, `test-quality-guardrails`,
    `test-quality-tdd-agents`, `test-quality-audit`) install into
    `~/.agents/skills/`.
  - **Per-Project Niche**: `z-*` specialists, niche
    workflows (`z-gpui-workflow`, `z-tauri-workflow`, `z-super-rustflow`,
    plus a project-pinned copy of `z-workflow`), and stack-specific
    domain skills (`languages/rust/rust-*` and external framework skills)
    install per project into `<project>/.zcode/agents/`,
    `<project>/.zcode/skills/`, and `<project>/.agents/skills/` via
    `z-project-init`, tracked in `<project>/.zcode/hmziqrs-ai-snapshot.json`.
  - Harness-kit skills never install into `~/.agents/skills/` or
    `<project>/.agents/skills/`.
- Agent frontmatter: `name`, `description`, `model`, `tools`, `color`.
  Valid colors: red, blue, green, yellow, purple, orange, pink, cyan.
  Model IDs resolve against zai / zai-coding-plan providers
  (`glm-5.3-flash`, `glm-5.3`).
- New skills, agents, or categories need no registration — every
  install path picks up active content, excluding `research/`. A new category
  is a new top-level directory; a new harness is a new `harness/<name>/`
  folder plus its install documentation.
- Keep the repo root as flat as possible: prefer grouping skills under
  an existing category (categories may nest sub-groups, e.g.
  `languages/rust/`, `languages/go/`) over adding new top-level
  directories. Skill folders still install flat by folder name, so
  nesting is organizational only.
- z-workflow writes a fresh script per task through the workflow-author: for
  small work the author explores directly, for larger work the workflow-planner
  (a clean-context planning agent that then dispatches the author) gathers the
  facts; the coordinator itself never gathers facts (Pillar 9).
  z-proflow (pro only, no vision) and z-flashflow (Flash only) are
  profiles of it, and z-liteflow is its fast small-task form (a filled,
  pre-tested template, no author). z-gpui-workflow and z-tauri-workflow
  are domain profiles of z-workflow with scoped framework gates and device evidence.
  z-super-rustflow composes its own main-tier-only runs inline (no
  vision, no flash).
- No saved engines outside the explicitly selected V5/V6/V7/V8/V9 experiments below:
  every other z-flow run executes a script written (or, for
  z-liteflow, filled from its template) for that task. Do not add saved
  workflow engines or offer to SaveWorkflow a generated script as a standing
  engine; the only reusable workflow code is the persona kit and z-liteflow's
  pre-tested template.
- Workflows cannot call agents by name. To drive a workflow subagent
  with an agent file (a specialist), paste the persona kit
  `harness/zcode/skills/z-workflow/persona-kit.dwf.ts` unchanged into
  the script and use its functions; never hand-write a persona loader.
  A change to the kit goes into that file first (new version marker),
  then into every script that carries it (z-liteflow's template too).
- Embedded filesystem/process helpers use TypeScript executed by Bun through
  `world.run`. Pass data as arguments and disable project config and environment-file
  autoloading for read-only checks. Declare Bun as a runtime dependency.
- Codex templates keep `__ZAI_MODEL_CATALOG__` until install renders an
  absolute user path. `ZAI_API_KEY` imports into the Codex-only
  `~/.codex/secrets/zai-api-key` file with mode `0600`; command-backed
  provider authentication reads only that file. Never commit an API
  key or write one to `config.toml`.

## When asked to install this kit

Follow `install.md` (Global Core vs Per-Project Niche via `z-project-init`) or
`harness/codex/install.md` (Codex kit). Perform the copies yourself
with file tools; install skills and agents as real files, never
symlinks — ZCode silently skips symlinked agent definitions. Never install
`z-*` niche specialists or niche workflows (`z-gpui-workflow`,
`z-tauri-workflow`, `z-super-rustflow`) globally; install them per
project and record `<project>/.zcode/hmziqrs-ai-snapshot.json`. End by
noting that ZCode loads agents at session start: restart or a new
session is required.

## When asked to update an installed kit

Re-run the Global Core procedure in `install.md` for global files, or run
`z-project-init` inside a specific project to compare its
`<project>/.zcode/hmziqrs-ai-snapshot.json` against disk, update only that
project's niche agents/workflows/skills, and write the new snapshot.
The Codex secret file is reused, never rewritten.

## Experimental standalone workflow v2

The user-authorized `harness/zcode/skills/z-workflow-v2/` is an opt-in sixth global
workflow skill while the original four workflows remain unchanged for comparison.
Copy the whole folder as regular files to `~/.zcode/skills/z-workflow-v2/`; it owns
its policies, local orchestration personas, copied references and persona-kit copy.
Its local persona kit remains byte-identical to the canonical v4 kit; explicit
HIGH selection and evidence-gated MAX escalation live in its separate model helper.
No extra global agent definitions are required. Niche domain personas remain per-project.

V2 is an explicit exception to the saved-code rule above: it carries a tested
preparation template, copied per task, that gathers evidence and authors a fresh
execution script for the main thread to launch. Never SaveWorkflow it as a standing
engine. V2 has one preparation path, HIGH defaults, MAX eligibility only after two
completed unsuccessful HIGH correction attempts on the same reasoning criterion,
parallel independent work, and no numeric audit/correction round cap. External blockers
or no viable corrective approach end incomplete. Do not inherit another workflow's
router, model defaults, round caps, or references. The current platform API contract
still governs supported syntax/tools. Removing or promoting this experiment requires
an explicit user decision.


## Experimental standalone workflow v3

The user-authorized `harness/zcode/skills/z-workflow-v3/` is a separate opt-in global
experiment installed as regular files at `~/.zcode/skills/z-workflow-v3/`. Retain original
and V2 unchanged. It owns local personas, policies/references and a byte-identical v4
persona-kit copy. Its model helper explicitly defaults Pro/Flash to HIGH, allowing targeted
Pro MAX only after two completed failed HIGH corrections on the same reasoning criterion.
This helper is an authorized reusable policy component, not a saved workflow engine.
V3 writes fresh scripts per task; it has no saved preparation/execution template. One author
combines fact gathering, compact planning and script writing; optional bounded Flash scouts
resolve consequential unknowns. It does not inherit the original router/dials or V2's
mandatory preparation-review chain. Independent implementation, verification and disjoint
corrections run concurrently; shared Git/devices/writers serialize. One findings ledger
invalidates only affected evidence, with no numeric audit/correction cap or mandatory extra
clean rounds. The local V3 policy supersedes original-specific orchestration conventions
only for explicitly selected V3 runs; current platform API still governs tool/syntax support.
Niche personas remain project-local. New sessions are required to discover installation.
Promotion/removal of experiments requires an explicit user decision.


## Experimental standalone workflow v4

The user-authorized `harness/zcode/skills/z-workflow-v4/` is an additional opt-in global
experiment, copied as regular files to `~/.zcode/skills/z-workflow-v4/`. Keep original,
V2 and V3 unchanged. V4's three priorities are parallel per-area state machines, minimal
main-thread context through delegation, and speed/completeness over perfection. It uses
one delegated thin plan/author, no plan audit, fresh task scripts and no saved engines.
Product audits, QA, tests, screenshots and incidental bug fixes are opt-in; required assembly
and completion of the explicitly requested feature remain in scope. Add extra workflow
complexity only when requested, retaining real dependency/ownership and permission boundaries.
The current V4 contract supersedes original/V2/V3 orchestration and review conventions for
explicit V4 runs; actual platform API/syntax requirements still apply. Its byte-identical
canonical v4 persona kit and local model-policy helper are authorized reusable components,
not an execution engine. Pro defaults HIGH; bounded read-only Flash retrieval may explicitly
use LOW; MAX requires recorded authorized scope and two failed completed HIGH corrections on
the same reasoning criterion. No new global agents; niche personas remain project-local.
No time estimates. Promotion/removal of older experiments requires explicit user direction.
V4 authors write only a fresh task body. Its source-assembly CLI attaches the existing
persona/model helpers and runs the checker once; it is tooling, with no saved graph or
execution engine. The coordinator captures checkout anchors and delegates source discovery
immediately; it does not duplicate the author's exploration or reproduce launch scripts inline.

## Experimental standalone workflow v5

The user-authorized `harness/zcode/skills/z-workflow-v5/` revives the historical ZFlow
engine approach as an explicit exception to the no-engine/fresh-script rule. It is a
separate opt-in global skill, installed as regular files at `~/.zcode/skills/z-workflow-v5/`.
Keep original/V2/V3/V4 unchanged; do not restore retired legacy workflow install paths.
The maintained engine lives inside V5. Per-task launch preparation inserts only validated
JSON data into an unchanged engine/helper copy; no model writes task-specific orchestration.
One delegated configurator returns compact task data inside the same workflow run. Use one
awaited async task per area; do not restore native channel/future consumers or cyclic feedback
queues. That restoration stalled CreateWorkflow analysis before a run could start and was
reverted to the successfully benchmarked flat V5 scheduler. Every area advances through its
own states/phases as inputs become ready; it does not wait for
unrelated areas to finish that phase. Tests/vision/QA/audits are opt-in, and disjoint fixes
stay concurrent. Keep the canonical persona kit byte-identical. Pro HIGH remains the
configuration/implementation default, requested vision uses Flash HIGH, and MAX is never
automatic. Preserve permission, ownership, device and serialized Git boundaries; the
coordinator alone performs guarded checkout delivery. No time estimates or new global
agent definitions. Promotion/removal of earlier experiments needs explicit user direction.

## Experimental standalone workflow v6 and version preservation

The user-authorized `harness/zcode/skills/z-workflow-v6/` is a separate global opt-in skill
installed as regular files at `~/.zcode/skills/z-workflow-v6/`. It carries its own flat per-area
engine/helpers/personas/references, with the same static-engine exception as V5. Preserve
V5 and all earlier versions. From this point, behavioral changes to a released numbered
workflow go into a new numbered skill, not an in-place update of its previous version.
V6 adds harmless path normalization, precise shape diagnostics and one targeted manifest
correction before any writers; this is not a plan audit. Implementation dependencies must
not come from later whole-project checks. Assembly excludes inline programs/shell wrappers
and direct test runners; HTTP/CRUD/persistence smokes are optional tests, even without files.
Keep independent work concurrent, Pro HIGH defaults, optional checks and canonical persona
kit bytes. The user has explicitly authorized a fresh full-access V6 benchmark session.

## Experimental standalone workflow v7

The user-authorized `harness/zcode/skills/z-workflow-v7/` is a separate opt-in global skill
installed as regular files at `~/.zcode/skills/z-workflow-v7/`. Preserve V6 and all prior
versions. It retains the flat per-area engine exception, HIGH defaults, opt-in checks and
canonical persona kit bytes. Per-area setup precedes its implementer without a global
barrier; candidate setup precedes integrated assembly. Structured completion results keep
observations separate from concrete blockers, with one local format/classification recovery
on malformed reports and no extra clean round. Engine commands own setup/install and gates;
worker/correction prompts preserve that authority. Runtime tools remain shared, not a
claimed per-agent tool sandbox. Keep reports brief. The user authorized a fresh V7 launch
with Full access; follow the harness's separate CreateWorkflow approval flow as needed.

## Experimental composable workflow v8

The user-authorized `harness/zcode/skills/z-workflow-v8/` is a separate opt-in global skill,
installed as regular files at `~/.zcode/skills/z-workflow-v8/`. It extends the maintained-source
exception to an allowlisted source-piece library and deterministic concatenator. Preserve
V7 and all earlier versions. Select optional planning/unit-test/audit/browser/native-vision/
mobile-vision pieces before submission, retaining literal phase names and concrete ask types;
no runtime imports, saved standing definitions or model-authored orchestration. Keep the
canonical v4 persona kit unchanged, HIGH defaults, scoped explicit loop/repair authority,
flat per-area parallelism, serialized shared resources/Git and coordinator-only delivery.
Read-only verification areas may consume merged implementation outputs without a writer;
failures there require explicit owner-scoped follow-up. Validate full mixtures with the
actual ZCode analyzer, not TypeScript alone; do not mask graph crashes by raising stack limits.
Future reusable behavior changes require a new numbered skill. Installing V8 does not
promote it over V7 or authorize launching a new application benchmark automatically.

## Experimental composable workflow v9

The user-authorized `harness/zcode/skills/z-workflow-v9/` and
`harness/zcode/agents/workflow-author-v9.md` are a separate opt-in experiment. Install the
whole skill as regular files at `~/.zcode/skills/z-workflow-v9/`, and that one author as a
regular file at `~/.zcode/agents/workflow-author-v9.md`. This explicitly selected author is
a narrow exception to the seven default global agents; it is not a niche specialist or a
change to the Global Core install set. Keep V8 and all prior versions unchanged.

V9 keeps the maintained source-piece/flat per-area engine exception. One Flash HIGH author
reads its compact contract, runs deterministic preflight, fills a typed per-area plan and
invokes the assembler; the engine consumes that plan without another configurator. The
coordinator delegates immediately, loads the current platform launch contract and owns
approval/delivery only. Preserve literal source-selected sections, concrete asks, canonical
v4 kit bytes, Pro HIGH implementation/review and Flash HIGH image interpretation. Real
plan audit gates precede writers; TUI behavior and web visual judgment have distinct pieces.
Requested review counts and repair authority remain explicit; invalidated finite evidence
requires follow-up rather than silent extra rounds. Successful incremental gates remain
valid evidence. Validate combinations with the actual analyzer without stack-limit changes.
A new session is needed to load the new agent; creating/installing V9 does not authorize an
application benchmark or promote it over older versions. Future behavior changes need V10.
