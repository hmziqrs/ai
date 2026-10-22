# AGENTS.md — working in this repo

Repo: `hmziqrs/ai` — the ZCode harness kit plus cross-harness skill
categories. There is no installer: agents install this repo by following
`install.md`, and humans can follow the same steps.

## Research and archive access (hard rule)

`research/` contains source reports, design studies, and historical
experiments. `archive/` contains the retired pre-2026-10 workflow family
(every z-workflow version and profile, all workflow-author/planner agents,
the persona checker). Never browse, enumerate, search, index, or read
either on your own. Access is allowed only in these two cases:

1. The user's prompt explicitly asks to inspect or use that material.
2. The task itself is maintenance of that material and it is relevant.

For every other task, exclude both from recursive searches, file discovery,
audits, and delegated exploration. A link or citation pointing there does
not grant access. When access is allowed, read only what the task needs.

Neither directory is ever a skill category or installation source. Do not
install archived skills, agents, or workflows from either. Archived skill
definitions use `SKILL.snapshot.md` so discovery cannot mistake them for
active skills.

## Layout

```
harness/zcode/               ZCode kit (the only harness kit)
  agents/<name>.md             ZCode sub-agent definitions (core, launcher, z-* specialists)
  skills/<name>/SKILL.md       ZCode-specific skills (z-workflow, z-project-init)
<category>/[<group>/]<skill>/SKILL.md  cross-harness skill categories (copy/, coding/, i18n/, languages/rust/, product/, testing/, web-spec/): plain SKILL.md skills, optionally grouped
research/                    source reports and historical material; restricted above, never installed
archive/                     retired workflow family and tooling; restricted above, never installed
install.md                   ZCode-kit + categories install procedure
llms.txt                     entry point for consuming agents
```

## Conventions

- Installable content has two kinds: the `harness/zcode/` kit
  (harness-specific layout) and top-level category directories holding
  skill folders directly. `research/` and `archive/` are excluded from both.
  Litmus test: if content references CreateWorkflow, model pins, or any
  harness mechanism, it belongs in the harness kit; otherwise it belongs in
  a category.
- Skill folder name MUST equal the frontmatter `name` (lowercase
  alphanumerics and hyphens). Names must be unique across all categories
  and the kit. Installation uses a strict **Global Core vs Per-Project
  Niche** split (see `install.md` and `z-project-init`):
  - **Global Core**: only the 4 core agents (`general-pro`, `general-flash`,
    `explore-flash`, `workflow-launcher`) install into `~/.zcode/agents/`;
    only the 2 core ZCode skills (`z-workflow`, `z-project-init`) install
    into `~/.zcode/skills/`; and only the 5 universal baseline skills
    (`antislop-copy`, `code-comments`, `test-quality-guardrails`,
    `test-quality-tdd-agents`, `test-quality-audit`) install into
    `~/.agents/skills/`.
  - **Per-Project Niche**: `z-*` specialist agents and stack-specific
    domain skills (`languages/rust/rust-*` and external framework skills)
    install per project into `<project>/.zcode/agents/` and
    `<project>/.agents/skills/` via `z-project-init`, tracked in
    `<project>/.zcode/hmziqrs-ai-snapshot.json`.
  - Harness-kit skills never install into `~/.agents/skills/` or
    `<project>/.agents/skills/`.
- Agent frontmatter: `name`, `description`, `model`, `thoughtLevel`,
  `tools`, `color`. Valid colors: red, blue, green, yellow, purple, orange,
  pink, cyan. Model IDs resolve against the zai / zai-coding-plan providers
  (`GLM-5.3-Flash`, `GLM-5.3`).
- New skills, agents, or categories need no registration — every install
  path picks up active content, excluding `research/` and `archive/`.
- Keep the repo root as flat as possible: prefer grouping skills under an
  existing category (categories may nest sub-groups, e.g.
  `languages/rust/`) over adding new top-level directories. Skill folders
  still install flat by folder name, so nesting is organizational only.

## z-workflow — the only workflow skill

Parallel by default, with zero global phase barriers. `z-workflow` routes a
multi-part task to a single `workflow-launcher` agent (full access,
GLM-5.3-Flash, HIGH thinking), which does everything pre-workflow: explores,
bootstraps an uninitialized project (thin scaffold + git baseline, never
touching an initialized repository), parses optional phases and round
budgets straight from the user's brief, and predetermines 2–8 areas with
disjoint file sets. It then launches ONE fresh workflow script on the
bundled `dynamic-workflows` skill in which every area is its own state
machine — implement → optional audit → optional test → … chained inside its
own fan-out callback — so an area moves to its next phase the moment its own
work lands and never waits for other areas. The only joins are the final
report and an optional final whole-tree smoke gate. Optional verification
phases (audit, unit tests, native/device testing, vision, browser, smoke)
run only when the brief names them; each defaults to 1 round, an explicit N
when the brief says so, and "until zero issues" when the brief says so
(bounded by an amendable cap, reported honestly if unconverged). Per-area
checks are scoped to that area's own files/targets. No git worktrees,
branches, or commits — areas edit the current checkout directly. The run
publishes a live per-area board. Flash subagents unless the user asks
otherwise; fresh script per task; never SaveWorkflow or build a standing
engine. The full contract lives in the skill's `SKILL.md`.

The entire previous workflow family — the original z-workflow, versions
v2–v13, the z-proflow / z-flashflow / z-liteflow profiles, the
z-gpui-workflow / z-tauri-workflow / z-super-rustflow domain workflows,
and every workflow-author / workflow-planner agent — is retired in
`archive/` under the hard rule above.

## When asked to install this kit

Follow `install.md`. Perform the copies yourself with file tools; install
skills and agents as real files, never symlinks — ZCode silently skips
symlinked agent definitions. End by noting that ZCode loads agents at
session start: restart or a new session is required.

## When asked to update an installed kit

Re-run the Global Core procedure in `install.md` for global files — it
also removes retired workflow skills and agents from the global
directories — or run `z-project-init` inside a specific project to compare
its `<project>/.zcode/hmziqrs-ai-snapshot.json` against disk, update only
that project's niche agents and skills, and write the new snapshot.
