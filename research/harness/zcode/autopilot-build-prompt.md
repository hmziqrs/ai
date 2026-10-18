# Build prompt: autopilot (autonomous PRD-driven delivery for the ZCode harness)

Paste everything below the line into a fresh agent session opened on
`/Users/hmziq/ZCodeProject/ai`.

---

You are building **autopilot**, an autonomous, PRD-driven delivery system for the ZCode
harness in this repository. Local PRD files hold unpublished plans; GitHub holds delivery state after publication. The full design
is in `research/harness/zcode/autopilot-design.md`. That document is your specification:
build what it says, and when it leaves something open, use the defaults in section 3 below.

Revision source: owner decisions D13-D16, 2026-10-18, in
[autopilot-design.md section 0.1](autopilot-design.md#01-owner-decisions-2026-10-18).
They supersede earlier defaults. This prompt now separates planning, publication and
implementation because the owner wants human review and work resumed in later sessions,
while keeping explicit small-project end-to-end builds possible. The subscription setup
requires execution limits only, with no monetary or token-usage accounting.

## 1. How you work: Opus coordinates, Haiku edits

**You are the main thread, running on Opus.** You own:
- the plan;
- every design decision;
- every brief;
- the review of every change;
- all verification.

You do not make bulk edits yourself.

**Fine-grained changes go to Haiku subagents** (Agent tool, `model: "haiku"`). For each one:
- Give one subagent one bounded change: a single file, or a small set of files no other
  running subagent touches.
- Run independent subagents in parallel, in one message. Run dependent ones in sequence.
- Write every brief from the template in section 7. A Haiku subagent sees only its brief,
  so name exact paths, exact content requirements, the conventions to copy (with an example
  file), and what done looks like.
- When a subagent reports back, read its diff yourself before moving on. A report is a
  claim, not evidence. If it is wrong, send a corrective brief; do not patch large parts
  yourself.
- Keep your own context small. Read files to decide and to review, and let subagents do
  the bulk typing.

**Track progress** with a task list, one item per phase in section 5, and keep it current.

## 2. Read first, in this order

1. `research/harness/zcode/autopilot-design.md`. Read it in full; it is the specification.
2. `research/harness/zcode/zflow-migration-plan.md`. It holds decisions D1-D10;
   autopilot-design section 13 says which ones change.
3. `AGENTS.md`, the repo rules: layout, naming, Global Core vs per-project, agent
   frontmatter, the persona kit rule.
4. `harness/zcode/skills/z-workflow/SKILL.md`, the coordinator contract, Pillar 9, the git
   rules and evidence labels. Then `references/specialists.md` and `persona-kit.dwf.ts`.
5. `harness/zcode/agents/workflow-planner.md`, `workflow-author.md`, and two existing `z-*`
   agents as style references (for example `z-ci-diagnostician.md` and
   `z-security-auditor.md`).
6. `harness/zcode/skills/shipflow/`, all of it. You will restructure it.
7. `harness/zcode/skills/z-liteflow/` (template precedent), `z-project-init/SKILL.md`,
   `install.md`, `README.md`, `llms.txt`, and `harness/zcode/scripts/check-personas.mjs`.
8. The ZCode platform contract for dynamic workflows, at
   `/Applications/ZCode.app/Contents/Resources/glm/packages/bundled-skills/skills/dynamic-workflows/SKILL.md`.
   Read the parts on `world.run`, caps, run states, resume, and the confirmation dialog.

## 3. Owner decisions already made, and defaults for the open ones

**Fixed:**
- **No CLI or headless runner.** The owner runs and tests everything in the ZCode desktop
  (GUI) app, driven through Claude remote control. The dispatcher is a ZCode GUI session's
  main thread (design 8.1).
  - Do not write launchd or systemd units, `zcode -p` invocations, or shell supervisors.
  - Do not write test steps that need a terminal ZCode.
- **One agent for project judgement.** Merge `z-github-project-manager` into a new
  `z-product-owner`.
- **GitHub mechanics are code.** Delete `z-gh-operator`, `z-pr-merge-steward` and
  `z-queue-sentinel`, and replace them with the GitHub kit.
- **Keep `z-security-auditor`.**
- **Add `z-qa-evaluator`:** a skeptical browser QA agent with a calibrated rubric and hard
  thresholds (design 1, 7, 11).
- **Independent phases (D14):** expose `plan`, `publish` and `implement`. A planning-only
  prompt returns local files and a review handoff without GitHub writes, product code,
  scaffolding or executable tests. Publication synchronizes approved requirements into
  issues and the selected GitHub Project, then stops. Implementation resumes existing
  approved/published tasks without regenerating the plan. Compose phases only as requested.
- **PRD approval (D15):** `human` for requested review or niche/complex requirements;
  `auto` for an explicitly authorized small-project end-to-end build. `window` is an
  explicitly chosen asynchronous option within authorized delivery. A reference URL does
  not select authority. Plan confirmation does not authorize unrequested implementation.
- **Task depth (D15):** a detailed whole-product PRD includes overview, sections, features,
  fine-grained tasks, criteria, dependencies and named checks. Use upfront breakdown for
  that request; support rolling breakdown and independently selected features or milestones.
  S5 task planning does not require S4 executable tests. An empty project uses explicit
  proposed-path and architecture assumptions, rechecked before later implementation.
- **Session confirmation (D16):** reuse an existing session-wide workflow allowance. The
  owner reports that one allowance suppresses subsequent workflow dialogs in that session.
  Verify it in S1 instead of requiring per-run clicks by default. Product review remains
  separate. AXTree confirmation is an optional proposed fallback within already-authorized
  workflow scope; do not add it as a dependency or claim it is implemented.
- **Execution limits (D13):** retries, timeouts, concurrency and crawl size only. Remove
  accounting fields, flags, journal data, fixtures and reports rather than disabling them.
- **Prompt-only operation (D17):** the owner only prompts. The harness generates the
  charter, discovery, PRD, tasks, issues, Project, labels, milestones, ruleset, CI and hook
  configuration; a `setup` entry point writes the charter from the prompt and repository
  inspection and configures the repository. The default identity is the owner's existing
  `gh` login, and `ai-review` is a commit status posted through the kit. A reviewer GitHub
  App is optional hardening, never an install requirement. Fixture JSON is check-script
  test data, not owner input.

**Defaults to use unless the owner overrides them. List them in your first message, then
proceed:**
- **Skill name:** keep the `shipflow` folder and name. Describe it as "autopilot", with
  modes `setup`, `plan`, `publish`, `implement`, `kickoff`, `dispatch`, `audit` and
  `supervised`.
- **D12, adopted:** the standard task cycle becomes a pre-tested template,
  `task-cycle-template.dwf.ts`, filled per run like z-liteflow's template. The planner and
  author write bespoke scripts only for kickoff, foundations, audits, re-plans and
  stop-the-line fixes.
- **Labels:** the `state:*` and `kind:*` namespaces from design 6.2.
- **Repository owner:** support both personal repos and organisations. Use labels instead
  of issue types, and a merge train instead of a merge queue, whenever the org-only
  features are missing.

## 4. Hard rules

- **Off-limits paths:**
  - `.zcode/` and `.zflow/` at the repo root.
  - Everything under `web-spec/`.
  - `harness/zcode/agents/z-web-spec-auditor.md`.
  - Any `specification-website` or `web-spec-audit` material. That is separate,
    concurrent work.
- **Research access:** in `research/` read only this prompt, `autopilot-design.md` and the
  named migration plan when needed. Edit this prompt and the design only to keep the
  specification aligned with owner decisions or verified build findings. Record the reason
  and source of each decision; section 0.1 is the owner-decision reference for this revision.
- **No saved engines** (D1). The only reusable code is pasted, drift-checked blocks: the
  persona kit, the liteflow template, the new GitHub kit, and the task-cycle template. Each
  must be checked by a script the way `check-personas.mjs` checks the persona kit.
- **Agent files:**
  - Frontmatter `name` equals the filename.
  - `model` is `account:zai-individual-coding-plan/GLM-5.3` or `...GLM-5.3-Flash`.
  - `injectAgentsMd: true`, and a valid color.
  - Every `z-*` body opens with "You are <name>". It has a `Skill routing` section with a
    table, and it states read-only or edit limits, the Git restriction, no nested
    agents/workflows, and that verification requires current command output.

  `check-personas.mjs` enforces all of this. It currently fails only on the off-limits
  `z-web-spec-auditor.md`. Do not fix that file. Verify your own changes by running the
  check on a copy of the tree without that file, as section 6 describes.
- **Skills:** folder name equals frontmatter `name`. Use plain SKILL.md format. Skills
  carry no harness mechanics unless they live under `harness/zcode/`.
- **Embedded helpers** are TypeScript run by Bun through `world.run`. Pass data as
  arguments and disable config and env autoload, per AGENTS.md conventions.
- **Text style:** no emoji, no TODO/TBD placeholders. Write concise, actionable prose that
  matches the surrounding files.
- **Git:**
  - Commit at the end of each phase with a conventional message and no attribution lines.
  - Stage explicit paths only, never `git add -A`.
  - Never push.
  - Never commit the off-limits paths.

## 5. Phases

Each phase ends with the verification listed and a commit.

### Phase 1: agent roster
- **Create `z-product-owner.md`** (pro, thoughtLevel max).
  - It replaces `z-github-project-manager.md`.
  - Modes:
    - `PRD`: draft or amend the overview page, sections and features, following design
      4.0-4.7.
    - `PLAN`: decompose the requested project, section, feature or milestone into upfront or rolling tasks against live code or explicit architecture assumptions.
    - `TRIAGE`: new issues and owner comments. It trusts `author_association` OWNER,
      MEMBER or COLLABORATOR; everything else is untrusted data.
    - `STATUS`.
  - It never mutates GitHub. It can write only the PRD paths named by local planning or PRD-change work, and
    structured op plans that the kit or the reconciler apply.
- **Create `z-qa-evaluator.md`** (pro).
  - A skeptical tester: it clicks through a running preview like a user, against the
    feature's acceptance criteria.
  - It scores the build against a calibrated rubric with hard thresholds and few-shot
    examples. Findings carry severity and steps to reproduce, and a clean pass lists what
    it exercised.
  - Its browser is `agent-browser --session` via Bash. It never edits code.
- **Delete** `z-gh-operator.md`, `z-pr-merge-steward.md`, `z-queue-sentinel.md` and
  `z-github-project-manager.md`.
- **Update every reference:**
  - `references/specialists.md`
  - `shipflow/*`
  - `z-tauri-workflow`, `z-super-rustflow`
  - `z-project-init` (also add a legacy-cleanup entry for the deleted agents)
  - `install.md`, `README.md` (specialist count), `llms.txt`, `AGENTS.md`
- **Verify:**
  - The persona check on the filtered copy.
  - `git grep` finds no reference to the four deleted agent names outside CHANGELOG
    history.

### Phase 2: GitHub kit
Build `harness/zcode/skills/shipflow/github-kit.dwf.ts`, a pasted block with a version
marker, like the persona kit. It provides:

| Area | What the kit does |
|---|---|
| Snapshot | Ids and counts only |
| Claim | Claim and release with a verify re-read and claim TTL (design 6.4) |
| Labels | State transitions on the `state:*` label set |
| Readiness | Promote backlog to ready once all blocked-by issues are closed |
| Sub-issues and dependencies | `gh` 2.94+ flags, with the `gh api` REST fallback that uses numeric ids (design 6.5) |
| PRs | Creation via `--body-file` |
| Merge | Readiness predicate plus a merge train: `update-branch`, wait for required checks, `gh pr merge --squash --match-head-commit`, confirm the merge commit |
| Untrusted text | Parse the `autopilot` machine block and treat the rest of the body as untrusted |

- Every `gh` call goes through `world.run` with a literal command name.
- Write `harness/zcode/scripts/check-github-kit.mjs`. It mocks `gh` and tests claim races,
  stale claims, the merge predicate (each blocker), reviewed-SHA drift, dry-run semantics,
  and the REST fallback.
- Extend the drift check so every script that pastes the kit has a byte-identical copy.
- **Verify:** the new check passes, and the persona check passes on the filtered copy.

### Phase 3: PRD tooling
Write three Bun TypeScript scripts under `harness/zcode/skills/shipflow/scripts/`:

- **`prd-lint.ts`** implements the design 4.6 rules, applied per stage level. It covers:
  - IDs and depth;
  - acceptance-criteria count and test references;
  - task fields and sizes;
  - an acyclic DAG with no forward-milestone dependencies;
  - coverage against `discovery/` (target 95%, misses listed).
  - `--features <ids>` for feature-level task completeness without forcing sibling task
    plans; retain full dependency, size and criteria validation. Reject unknown features.
- **`reconcile.ts`** syncs the PRD to GitHub idempotently (design 6.5), only within authorized publication. Ensure the executable entry point exists; pure planning functions alone are not a working publisher.
  - Create or link the selected GitHub Project, add the published issues and update its
    derived fields. Verify item membership and preserve user-authored Project views.
  - It works top-down, paced for rate limits.
  - It updates bodies by hash and closes dropped items as not planned.
  - It never touches `state:*` labels except setting backlog on new issues.
  - It has a dry-run mode that prints the planned ops.
- **`snapshot.ts`** produces compact JSON for the dispatcher. Default to `--mode implement`: do not start kickoff, decompose new milestones or re-plan blocked tasks. Return `needs-plan` when planning is missing. Explicit `--mode dispatch` composes phases only for authorized end-to-end delivery.

Add fixtures and a checker: a valid PRD, plus one fixture per lint rule violation. Use the
design 4.5 LLM benchmark example as the valid fixture.

**Verify:** run `bun --no-env-file --no-config harness/zcode/scripts/check-shipflow-planning.mjs`
for feature-scoped lint and implementation-only decisions. All fixtures behave as expected,
and reconcile dry-run on the fixture prints a stable op list twice once its executable
entry point and the GitHub kit exist. Report missing components instead of claiming success.

### Phase 4: cross-harness category skills
Create three skills:

- **`product/prd-authoring/SKILL.md`**
  - The design 4.0 staged pipeline and gates.
  - The design 4.1-4.4 levels, IDs and templates, and Given/When/Then acceptance criteria.
  - Critic rubrics: completeness, testability, consistency, feasibility, scope. Each asks
    what would break.
  - Assumption logging and the no-reference variant.
- **`product/site-recon/SKILL.md`**
  - Design section 5: crawl, archetypes, capture, data inference, safe interaction probing,
    gated-area inference.
  - The brand and content boundary, and robots and rate limits.
  - The discovery pack format.
- **`testing/parity-testing/SKILL.md`**
  - Design 7: aria-snapshot structure matching, masked pixel diff of static chrome only,
    journey replay, per-archetype parity score, and noise and sensitivity calibration.
  - Output hygiene.

These are harness-agnostic: no CreateWorkflow and no ZCode mechanics. Register them only
where the repo's install docs list category skills, and decide whether they are Global
Core or per-project by the AGENTS.md rules. Report your choice.

### Phase 5: shipflow becomes autopilot
Restructure `harness/zcode/skills/shipflow/`:

**`SKILL.md`, independent modes and compositions:**
- **`plan`**: local overview, sections, features and/or tasks at the requested depth and
  scope. No delivery charter or GitHub credentials required. Return paths, ids, hashes or
  a commit, overview, dependency summary, assumptions and decisions needing review.
- **`publish`**: after publication is authorized, sync the reviewed plan into GitHub issues
  and a Project. Verify Project membership and links; report partial publication if the
  Project sync fails. Stop before implementation.
- **`implement`**: execute existing approved and published tasks. Check an older plan against
  live code; return missing planning or intent changes to review rather than rebuilding it.
- **`kickoff`**: compose plan and publication only. Each stage is separately resumable;
  S5 can precede S4. Stop after publication.
- **`dispatch`**: compose planning, publication, test preparation and implementation only
  for an end-to-end request. Run the design 8.2 policy in the GUI main thread, one active
  run per project, waking on run-settled notifications. Preserve human review stops.
- **`audit`**: design 10, including the retro pass.
- **`supervised`**: the current per-cycle-approval behaviour.

**References** (move existing content where it fits, and do not duplicate the design doc):

| File | Content |
|---|---|
| `prd-format.md` | PRD layout, levels, templates |
| `github-state.md` | Labels, the machine block, the state machine, claims, ready rule, merge path, identities |
| `verification-ladder.md` | Design 7 |
| `charter.md` | The `autopilot.yaml` schema and enforcement layers (design 12) |
| `failure-policy.md` | Design 9 |
| `dispatch.md` | Design 8.1-8.2 for the GUI app: chaining on run-settled notifications, context-size rules, when to start a fresh session |
| `cycle-contract.md`, `brief-extension.md`, `gates.md`, `review-checklists.md` | Updated for the kit and the new agents |

**Other files:**
- **`task-cycle-template.dwf.ts`** implements the design 8.3 cycle with constants filled per
  run, and includes the persona kit and the GitHub kit unchanged. Test it with
  `EvalWorkflowSnippet`-style rehearsal where the platform allows, and with a drift check.
- **`hooks/`** holds the ZCode `PreToolUse` and `PermissionRequest` policy that enforces the
  charter (design 8.1, local policy), plus install instructions for a project's ZCode
  config. Each denial is logged.
- **`templates/`** holds a GitHub Actions CI workflow that runs the `ci`, `acceptance` and
  `parity` gates, a ruleset JSON for `main` (design 6.6), and an `autopilot.yaml` example.
- **`INSTALL.md`** covers per-project install as prompts: `z-project-init` with Shipflow,
  then `shipflow setup`, which generates the charter and configures labels, milestones, the
  PRD issue, the Project, the ruleset, CI and the hooks with the owner's `gh` login (D17).
  Optional hardening (a reviewer GitHub App) is documented separately and never required.
  The free-organisation recommendation stays.

**Update the decisions:** z-workflow git rules, `workflow-author.md` and the migration
plan's D2, D3, D5 and D6 change for autopilot mode, per design section 13. Keep supervised
mode intact.

**Verify:**
- All check scripts pass.
- A stale-reference grep is clean.
- `z-project-init` installs exactly the new file set.

### Phase 6: test playbook for the owner
Write `harness/zcode/skills/shipflow/references/test-playbook.md`. The owner runs it in the
ZCode GUI app through Claude remote control, so every step is a GUI action or a GitHub web
action, never a terminal ZCode command.

| Section | Scope | Pass criteria |
|---|---|---|
| S1 | Unattended chaining on a scratch repo | From design 15, with exact steps and what to record |
| S2-S6 | GitHub primitives, recon, parity noise, cycle behavior, merge path | From design 15 |
| R1 | Local planning, then separately authorized publication | Full upfront plan from a two-line idea; a scoped feature plan; niche requirements reviewed; no GitHub writes before confirmation; Project membership verified |
| R2 | Implementation-only shadow mode | Resume in a new session; no regenerated PRD; `needs-plan` on missing/blocked planning; session permission cannot advance a plan-only request |
| R3 | Small-site autopilot | From design 15 |

Also provide a results template to fill in, so findings can be fed back into the design
doc.

### Phase 7: docs and final verification
- Update `README.md`, `llms.txt`, `install.md`, `AGENTS.md` and `CHANGELOG.md`
  (Unreleased) so they describe autopilot, the new agents, the kit, the category skills,
  and the deleted agents.
- Final checks:
  - Every check script passes, with the persona check on the filtered copy.
  - Grep shows no leftover references to deleted agents, `zcode -p`, launchd or systemd, or
    saved engines.
  - Every new skill and agent name is unique across the repo.

## 6. Verifying the persona check without the off-limits file

```
S=$(mktemp -d) && rsync -a --exclude .git --exclude .zcode --exclude .zflow --exclude research ./ "$S/" \
  && rm "$S/harness/zcode/agents/z-web-spec-auditor.md" && (cd "$S" && bun harness/zcode/scripts/check-personas.mjs)
```

## 7. Haiku brief template

```
Goal: <one sentence>
Files you may edit: <exact paths>. Do not touch anything else.
Read first: <exact paths, including one style example to copy>
Requirements:
- <concrete, checkable bullet>
- ...
Conventions: <frontmatter rules / table formats / no emoji / no TODO>
Done when: <observable result, e.g. "file exists, frontmatter name = filename, contains a
Skill routing table with these rows">
Report: the paths changed, and anything you could not do. No summaries of unchanged content.
```

## 8. What you must not claim

You can verify file contents, check scripts, fixtures and mocked tests. You cannot verify
behaviour inside the ZCode GUI app, live GitHub, or a real reference site; the owner covers
those with the test playbook.

Your final report has five parts:
1. Each phase, with its commit.
2. What each check verified.
3. What remains unverified, and which playbook step covers it.
4. Any edits to the design doc.
5. Decisions you made that the owner should review.
