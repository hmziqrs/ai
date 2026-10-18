# Verification ladder

The operating contract for autopilot checks (design 7). Gate commands come from the charter `gates` map, which `scripts/lib/charter.ts` validates. CI runs them through `scripts/run-gate.ts`. The task-cycle template runs them in each lane worktree (`task-cycle-template.dwf.ts`, filled per run by `scripts/fill-cycle.ts`). `ai-review` is a commit status that the cycle posts through the kit's `postStatus` by default. `scripts/post-review.ts` posts it as a check run only when a reviewer App is configured (see `## ai-review`).

## When to Use

- Wiring or changing gates in the charter, or changing the CI workflow.
- A lane stopped on a finding and you need to know whether it blocks the merge.
- A merge waits on a required check and you need to know which level produces it.

## The ladder

| Level | Check | Charter source | Written by | When it runs | Evidence | Effect |
|---|---|---|---|---|---|---|
| L1 | Build, typecheck, lint, format check when the project lists one | `gates.l1` | Charter entries, set by a setup prompt; the project owns the tools | Each lane (baseline and every round); CI `ci` job; nightly | Verified | Blocks merge |
| L2 | Unit and integration tests for the change | `gates.unit` | Implementer, test first | Each lane; CI `ci` job; nightly | Verified | Blocks merge |
| L3 | Acceptance e2e, one or more tests per criterion | `gates.acceptance` | Test author in `tests/acceptance/` (protected) | Lane `checks` with the task's test paths; CI `acceptance` job runs the whole suite | Verified | Blocks merge |
| L4 | Reference parity: aria-snapshot structure, masked pixel diff of static chrome, journey replay | `gates.parity` | Recon and test author in `tests/parity/` (protected) | Lane `checks` with the task's test paths; CI `parity` job runs the whole suite | Verified | Blocks merge |
| L5 | NFR budgets: Lighthouse, axe, bundle size, dependency audit, secret scan | None yet (see notes) | Not written yet | Audit mode on main | Verified | A red result opens a `stop-the-line` issue |
| L6 | Independent judgement: code judge, tracer, security auditor, QA evaluator on a preview | Persona files, not gates | Judge and tracer personas, `z-security-auditor`, `z-qa-evaluator` | Every lane round (judge); security when `security`; QA when `ui`; after zero open | Judged; verified once a command reproduces it | High and medium findings block |

Notes:

- **L5 has no charter key.** The validator accepts only the `gates` keys `l1`, `unit`, `acceptance` and `parity`. An NFR command cannot be declared yet, and no shipped workflow runs L5. Design 7 also adds a nightly and a pre-release run; neither is wired. Declaring L5 needs a schema change in `charter.ts`.
- **Parity scope is wider than design 7.** Design 7 runs touched parity routes per cycle and everything nightly. `templates/ci.yml` runs the whole `parity` suite on every pull request, every push to main and the nightly trigger. The workflow is what merges are checked against.

## Where the commands come from

- In autopilot mode gates come from `effectiveSettings` (`scripts/lib/detect.ts`): a charter `gates` group pinned by a setup prompt wins; an empty group is detected from the manifests (package.json scripts, Cargo.toml, pyproject.toml). Each entry is argv with no shell: `{name, tool, args, timeout_minutes}`. The AGENTS.md discovery in `references/gates.md` applies to supervised mode only. The refusal list in that file applies to charter gates too, but the validator checks shape, not flags, so review every `args` list when a setup prompt sets a gate.
- A group with nothing pinned and nothing detected is not configured, and not configured is red. `run-gate.ts` prints `gate <name>: not configured` and exits 1. An area without a green gate cannot merge.
- A gate that exceeds its `timeout_minutes` is red with reason `timeout`, never a pass. `run-gate.ts` sends SIGTERM at the limit and SIGKILL five seconds later.
- A lane's checks are the charter's `acceptance` or `parity` entry with the task's test paths appended. The same list reaches CI through `run-gate.ts --tests`, which refuses any path that starts with `-`.

## Running a gate (`run-gate.ts`)

| Invocation | Runs | Exit |
|---|---|---|
| `bun .zcode/skills/shipflow/scripts/run-gate.ts --charter autopilot.yaml --gate l1` | Every `gates.l1` entry, in order | 0 all passed; 1 any failed, timed out or not configured; 2 usage or charter error |
| `... --gate unit` | Every `gates.unit` entry | Same |
| `... --gate acceptance [--tests a,b]` | `gates.acceptance` entries, test paths appended; the whole suite without `--tests` | Same |
| `... --gate parity [--tests a,b]` | `gates.parity` entries, test paths appended; the whole suite without `--tests` | Same |
| `... --gate protected --base <sha> --branch <name>` | No gate runs. Changed paths from `git diff --name-only -z --no-renames <base>...HEAD` are checked against the `protected` rules | Same; `--base` and `--branch` are required |

Every entry runs even after an earlier one fails, so the summary is complete. Output is one summary line, then one line per failed entry, then up to five indented tail lines:

```
gate unit: 0/1 passed
ERROR unit exit 1
  AssertionError: expected 3 rows, received 0
```

The protected gate reports the allowed count over the checked count, then one line per violation:

```
gate protected: 1/2 passed
ERROR prd/sections/LB.md protected path changed on wf/LB-1.4
```

Full output goes to `<log-dir>/<gate>-<entry>.log` (default `.shipflow/gates/`). The CI jobs upload that folder when they fail.

## What a lane runs

| Phase | Runs | Red means |
|---|---|---|
| Baseline (before any edit) | Every gate and check once on base | A gate red on base is excluded and listed in `notCovered`. Acceptance and parity checks named by the task stay in the predicate: their new tests are red on base by design and must be green at the end |
| Each round | L1 and L2 gates; L3 and L4 checks; purity; size; tracer; judge | A verified finding, which blocks |
| Review (only when the loop ends with zero open findings) | Security auditor when `security`; QA evaluator on a preview when `ui` | High and medium findings block |
| Publish | Commit; push `refs/heads/wf/<id>`; open the PR; post `ai-review` (kit `postStatus`) on the reviewed SHA | A push that does not show the reviewed SHA releases the lane |
| Merge | `mergeTrain` waits for `ci`, `acceptance`, `parity` and `ai-review` | A timeout leaves the issue in `state:review` |

## Blocking rules

| Finding source | Severity | Blocks |
|---|---|---|
| Gate or check red (and not red on base) | Verified | Yes |
| Purity: a changed path outside the lane's area, or a protected path the lane kind may not write | Verified; a protected path is `high`, `protected path changed` | Yes |
| Size: over the machine-block budget | `medium`, `over budget` | Yes |
| Code judge | `high`, `medium`, `low` | `high` and `medium` |
| Security auditor | Blocker and major map to high and medium; other levels are reported | Mapped levels only |
| QA evaluator | Verdict `pass`, or any `high` or `medium` finding | A verdict other than pass, or any high or medium finding |
| Status or check post failure | Verified | The merge waits for `ai-review` and times out |

Every verified finding blocks, whatever its label. Only judged findings can be `low`, and a `low` judged finding never blocks.

## Protected paths

The template's default protected rules, as shipped in `templates/autopilot.yaml`:

| Prefix | Agent name allowed (regex) | Branch allowed (regex) | Who changes it |
|---|---|---|---|
| `prd/` | `^(prd\|plan)-` | `^wf/prd-v[0-9]+$` | PRD-change PRs |
| `tests/acceptance/`, `tests/parity/` | `^test-author-` | `^wf/test-` | Test-author lanes |
| `discovery/` | `^recon-` | `^wf/recon-` | Recon lanes |
| `.github/`, `autopilot.yaml` | `^$` (no agent) | `^$` (no branch) | The setup run only, through its setup PR (`charter.md`, Changing the charter) |

Three enforcement points:

| Point | Component | Moment | Result |
|---|---|---|---|
| 1. Write | `hooks/policy.ts`, through `hooks/hooks.json` on `PreToolUse` and `PermissionRequest` (Write, Edit, ApplyPatch, NotebookEdit) | Before the write | Rule `protected-path` denies the write unless `agent_type` is non-empty and matches the agents regex. Paths are also compared in lowercase, because macOS file systems are case-insensitive |
| 2. Lane publish | Purity check in the task-cycle template | Before push | The lane stops before publish with `protected path changed` (high). No PR is opened |
| 3. Pull request | `run-gate.ts --gate protected` in the CI `ci` job | Every pull request | `ERROR <path> protected path changed on <branch>`; the `ci` check fails and the ruleset blocks the merge |

A session with no agent type, including the dispatcher's own thread and the owner's ZCode session, is denied every write to a protected path. The owner may edit PRD and test paths in an editor outside ZCode and open a PR. `autopilot.yaml` and `.github/` change only through a setup prompt, never by hand.

## Judged findings (L6)

| Reviewer | Persona | Runs | Output |
|---|---|---|---|
| Code judge | Fresh read-only instance of the lane's judge persona | Every round, after gates and tracer rows | Findings with `high`, `medium` or `low`, labelled `judged` |
| Tracer | Flash tier, fresh per round | Every round | One row per criterion with path and quote. The script greps each quote; unmatched rows go to the judge |
| Security auditor | `z-security-auditor`, read-only, fresh | Lanes with `security: true` (a changed area is under `security_paths`) | Findings, mapped to the blocking table above |
| QA evaluator | `z-qa-evaluator`, read-only, fresh, on a preview at 1440, 768 and 390 pixels wide | Lanes with `ui: true` | Verdict `pass`, `fail` or `blocked`, with findings |

Rules:

- A judged finding becomes verified once a command reproduces it: a gate, a check or a grep. Until then a judged `high` or `medium` finding is open on its own, so a judge's high finding blocks without a command.
- The template has no separate vision judge. Visual review of the preview belongs to the QA evaluator.
- A missing persona skips its review without a finding. `securityPersona` and `qaPersona` are empty strings when the file is absent. The install check must confirm both agents resolve from `.zcode/agents/` or `~/.zcode/agents/`.

## Output hygiene

- A runner prints one summary line, then one `ERROR <name> <reason>` line per failure. Up to five tail lines follow, indented two spaces, cut at 300 characters, with ANSI escapes removed. Full logs stay in files.
- A finding carries the last 1200 characters of combined output, never the whole log.
- Gate logs go to `--log-dir` (CI: `.shipflow/gates/`). Lane preview logs and QA evidence go to `<repoRoot>/.zflow/evidence/<run-slug>/<lane id>`.
- Exit codes: 0 passed; 1 red, timed out or not configured; 2 usage or charter error. A nonzero gate exit is a value. Scripts record it and do not throw.
- Gate argv never contains issue text. Test paths reach `run-gate.ts` only through `--tests`.

## Parity checks

Parity compares the clone with a versioned capture of the reference, never the live site (design 7). Viewport, fonts and animation settings are fixed, and dynamic regions are masked. The aria snapshot is the main signal. Pixels are compared only for static chrome, and a vision judge rates overall look as judged evidence. The parity score per archetype is passing checks divided by all checks.

The capture steps, test patterns and noise calibration belong to the `parity-testing` skill (`testing/parity-testing/SKILL.md`). This file does not repeat them.

## CI workflow (`templates/ci.yml`)

| Check name | Trigger | Gate steps | Required by the ruleset |
|---|---|---|---|
| `ci` | Pull request, push to main, nightly, manual | `gate l1`, `gate unit`; `gate protected` on pull requests only, with the base SHA and head ref passed through `env` | Yes |
| `acceptance` | Same | Installs Chromium (`bunx playwright install --with-deps chromium`), then `gate acceptance`; uploads logs on failure | Yes |
| `parity` | Same | Same steps with `gate parity` | Yes |
| `ai-review` | Not a job in this workflow | Commit status posted through the kit (`postStatus`) on the reviewed SHA; a reviewer App check run from `post-review.ts` when one is configured | Yes; pinned to the App only when a reviewer App is configured |

- The workflow uses `permissions: contents: read`, uses no secrets, and cancels superseded runs for the same ref. Branch and base values reach the shell only through `env`, never through `${{ }}` inside the script.
- The nightly trigger runs at 03:17 UTC. The protected step runs on pull requests only.
- `templates/ruleset-main.json` lists `ai-review` without `integration_id`, so the commit status satisfies it. When a reviewer App is configured, setup adds that App's `integration_id` to the entry, and then only a check run from that App satisfies it.

## ai-review

`ai-review` is the review gate on the exact commit that will merge. By default it is a commit status: the task cycle posts it through the kit (`postStatus`, context `ai-review`, state `success`) on the reviewed SHA, and only after its review found nothing open. Separation of duties comes from the code, not from a second identity: fresh judges and command checks run first, the ruleset requires the status, and the merge is pinned to the reviewed SHA (design 6.6). `post-review.ts` is optional hardening. When a reviewer App is configured (`identities.reviewer` in the charter), the task cycle posts `ai-review` through it instead, as a check run with conclusion `success`. `post-review.ts` also accepts `failure` and `neutral`, which the template never sends.

With a reviewer App configured:

- The key file must be mode 0600 or stricter. Anything looser exits 2 and no request is made.
- The app JWT and the installation token are never printed, logged or returned. A GitHub refusal exits 1 with the response message.
- `--dry-run` prints the two requests, with the token fields marked as not printed, and makes no call.

Whichever identity posts it:

- When `update-branch` moves the head to GitHub's base-merge commit, the merge train re-posts `ai-review` on that commit (`onRepin`), with a summary that records the re-pin (design 6.6).

## The ladder and the merge predicate

| Required check (`authority.merge.requires`) | Means | Produced by |
|---|---|---|
| `ci` | L1 and L2 pass on this commit; protected paths unchanged on a pull request | `ci` job |
| `acceptance` | L3 suite passes | `acceptance` job |
| `parity` | L4 suite passes | `parity` job |
| `ai-review` | L6 review passed on this commit | Kit `postStatus`; `post-review.ts` when a reviewer App is configured |

The merge predicate (`kitMergePredicate`, row `checks`) waits while a required check is missing or pending, and blocks when one has failed. The charter's `authority.merge.requires` list and the ruleset's contexts must stay identical. Changing one without the other leaves a required check that nothing produces, or a produced check that nothing requires.
