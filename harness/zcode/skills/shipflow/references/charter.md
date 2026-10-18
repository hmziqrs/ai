# Autopilot charter

The `autopilot.yaml` schema v1 (autopilot scripts spec 1, design 12): the one file the owner approves before autonomy starts. `scripts/setup.ts` generates it from the owner's prompt and repository inspection. The owner changes it by prompting: setup re-runs with new options. Nobody writes it by hand. `scripts/lib/charter.ts` parses and validates it (`parseCharter`, `loadCharter`, `areaFor`, `protectedRule`, `matchesPushPattern`). `templates/autopilot.yaml` is an example of what setup generates, not a file to copy or edit. The readers are `scripts/fill-cycle.ts`, `scripts/snapshot.ts`, `scripts/run-gate.ts`, `scripts/preview.ts`, `scripts/post-review.ts` and `hooks/policy.ts`.

Planning-only work does not need this delivery charter. Choose `prd_approval` and
`task_breakdown` from the user's requested phases and detail, not from reference-site presence;
setup writes them from its `--approval` and `--breakdown` options (defaults `human` and `upfront`).
The schema uses `limits`. An older charter is brought up to date by re-running setup, which keeps
the values it already has and fills the keys the schema requires. Unknown keys fail validation and
stop setup before any GitHub write. Owner rationale: design 0.1, D13-D17.

## When to Use

- Setup generating the charter, or changing any key through a setup prompt.
- A hook denied a call, a gate did not run, or a merge is blocked by policy, and you need the rule that decided it.
- Answering what the autonomy limits are.

## Validation

- Every top-level key is required, and setup writes all of them; the validator applies no defaults. Gate keys inside `gates` may be absent, and `gates: {}` is valid.
- Unknown keys are errors at every depth, not only at the top level, so a typo cannot silently drop a rule.
- Each error names its key path, for example `limits.task_attempts: must be a positive number`. `run-gate.ts` prints the errors and exits 2. `hooks/policy.ts` denies every tool call with rule `policy-error` while the charter is invalid.
- `project` matches `[a-z0-9-]+`. `repo` is `OWNER/NAME`. `milestones` is a non-empty list of `M<n>`. `version` must be `1`.
- Every regex in `protected` must compile. `areas[].specialist` must match `^z-[a-z0-9-]+$`.
- `identities.reviewer.app_id` and `installation_id` must be quoted strings of digits. Bare digits parse as YAML numbers and fail.
- `dispatcher.prd_issue` is a non-negative integer. `0` means the PRD issue does not exist yet.
- `dispatcher.instance` is any non-empty text here. The kit rejects an id outside `/^[a-z0-9][a-z0-9-]{0,31}$/` when it runs.
- The validator checks shape only. It does not check gate flags (see `verification-ladder.md`), and it does not check that `areas` specialists or the reviewer key exist. Those fail at use: persona resolution in fill-cycle, and key permissions in `post-review.ts`.

## Keys

### Project and PRD

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `version` | `1` | Schema version | Validator |
| `project` | `[a-z0-9-]+` | Project slug | Validator |
| `repo` | `OWNER/NAME` | GitHub repository | fill-cycle (`ghRepo`) |
| `base_branch` | Text | Branch that lanes merge into | fill-cycle (`baseBranch`, base SHA) |
| `reference` | List of text; `[]` for no reference site | Reference site URLs | Validator. The PRD root front matter carries the list that `prd-lint` reads |
| `parity_target` | Five booleans: `structure`, `layout`, `interactions`, `brand`, `content` | Axes that parity covers | Validator. The PRD root front matter carries it |
| `stack` | Text | `auto`, or a pinned stack sentence | Validator. With `auto`, the architect decides by ADR |
| `milestones` | Non-empty list of `M<n>` | Milestone order | snapshot |
| `prd_approval` | `auto`, `window` or `human` | PRD approval mode (design 4.6) | snapshot (`decide`) |
| `review_window_hours` | Positive number | Window length for `window` approval | Validator only |
| `task_breakdown` | `rolling` or `upfront` | When later milestones get tasks | snapshot (`decide`) |
| `capabilities` | `oauth_github`, `email_smtp`, `database`: text each | Capability status. `missing` means the adapter is mocked and the feature carries `needs-capability` | Validator only |

### Execution limits and tiers

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `limits.max_parallel_lanes` | Positive number | K, the lanes per run | snapshot (`lanes`) |
| `limits.task_attempts` | Positive number | Attempt cap. Failing attempt `task_attempts` blocks the task | snapshot; fill-cycle (`attemptCap`) |
| `limits.task_timeout_minutes` | Positive number | Basis for the claim TTL, which is twice this value | fill-cycle (`claimTtlSeconds`) |
| `limits.wall_clock_days` | Positive number | Project time box | Validator only |
| `limits.page_cap` | Positive number | Recon crawl page cap | Validator only |
| `tiers.first_attempt` | `pro` or `flash` | Tier for attempt 1. Attempt 2 and later are always `pro` | fill-cycle (`tier`) |

### Authority

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `authority.push` | List of globs. `*` matches any characters, including `/` | Refs that autopilot may push | `hooks/policy.ts` (`push-refspec`) |
| `authority.merge.method` | Text; `squash` | Merge method | Validator only. The kit always squashes |
| `authority.merge.via` | List of text (`merge_queue`, `merge_train`) | Merge paths | Validator only. Queue handling follows GitHub's answer |
| `authority.merge.requires` | Non-empty list of check names | Checks that must pass before a merge | fill-cycle (`requiredChecks`), the kit's merge predicate |
| `authority.github` | List of text | GitHub surfaces autopilot uses | Validator only. The kit's argv table is the real limit |
| `authority.deploy` | Text; `preview_only` | Deploy scope | Validator only. No deploy code exists |
| `authority.network_allow` | List of hosts | Hosts that URLs in Bash and WebFetch may reach | `hooks/policy.ts` (`host-not-allowed`) |

### Identities and dispatcher

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `identities.builder.login` | Text | The `gh` login setup detected (the owner's own login). An existing value is kept, and setup warns when it differs from the current login | fill-cycle (`login`). The kit counts only this login's claim and journal records |
| `identities.reviewer` | `null` by default; otherwise an object with the three keys below | Optional reviewer App, for hardening only. `null` means `ai-review` is a commit status posted through the kit (design 6.6). Setup never creates an App; it keeps an object only when the charter already has one | fill-cycle; `post-review.ts` |
| `identities.reviewer.app_id` | Quoted digits; only when `reviewer` is an object | Reviewer GitHub App id | fill-cycle; `post-review.ts` (`--app-id`) |
| `identities.reviewer.installation_id` | Quoted digits; only when `reviewer` is an object | Installation id of the App on the repository | fill-cycle; `post-review.ts` (`--installation-id`) |
| `identities.reviewer.key_path` | Text; a leading `~` is expanded; only when `reviewer` is an object | PEM file, mode 0600 or stricter | fill-cycle; `post-review.ts` (`--key`) |
| `dispatcher.instance` | Text | Dispatcher id, part of every claim nonce | fill-cycle (`instance`) |
| `dispatcher.prd_issue` | Integer, 0 or more | Number of the PRD issue. `0` means not created yet | fill-cycle (`prdIssue`); snapshot (`--prd-issue`) |

### Gates and preview

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `gates.l1` | List of gate entries. Absent or `[]` means detected at run time | Build, typecheck, lint | fill-cycle (lane gates); `run-gate.ts` |
| `gates.unit` | List of gate entries. Absent or `[]` means detected at run time | Unit and integration tests | fill-cycle (lane gates); `run-gate.ts` |
| `gates.acceptance` | One entry or a list. Absent or `[]` means detected at run time | Acceptance suite | fill-cycle (lane checks); `run-gate.ts` |
| `gates.parity` | One entry or a list. Absent or `[]` means detected at run time | Parity suite | fill-cycle (lane checks); `run-gate.ts` |
| Gate entry | `name` text; `tool` text; `args` list of text; `timeout_minutes` positive | argv run with no shell | As the parent key |
| `preview` | `null` (the default) means detected at run time. Otherwise `tool` text; `args` list of text; `timeout_minutes` positive; no name | Start command. The port is appended | `preview.ts` |

`gates` must be present; `gates: {}` declares no pinned gates. A present `l1` or `unit` must be a list. `acceptance` and `parity` take one entry or a list.

### Run-time detection

When a charter value is empty, `lib/detect.ts` reads the project at run time. Nothing is written back to the charter.

- **Gates.** `package.json` scripts, each slot filled by the first script present. L1 runs `build`, one of `check`, `typecheck` or `check-types`, and `lint`. Unit takes `test:unit` or `test`; acceptance takes `test:acceptance`, `test:e2e` or `e2e`; parity takes `test:parity`. A script whose body contains `--fix`, `--write`, `-u` or `--update` never runs as a gate.
- **Package manager and timeouts.** The first lockfile at the root names it (bun, pnpm, yarn; npm by default). Gate groups time out after 15 minutes, suites after 30.
- **Other manifests.** Cargo.toml fills L1 with `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`, and unit with `cargo test`. pyproject.toml fills a group that is still empty with `ruff check` and `pytest`.
- **Preview.** The `preview` script, else `dev`, run as `<pm> run <script> -- --port` with a 2-minute timeout.
- **Areas.** One per existing top-level directory among `src`, `app`, `lib`, `server`, `components`, `routes`, `pages`, `crates` and `tests`, all with the primary specialist. The primary comes from package.json (`svelte` or `@sveltejs/kit`, `astro`, `elysia`, `@tanstack/*`, `wrangler`), then Cargo.toml (`axum`, else `z-rust-engineer`), then pubspec.yaml (`flutter`). `ui` is false under `server` and `crates`.
- A non-empty charter value wins for its own key (per group for gates) and nothing else.

### Areas and protection

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `areas` | List of `{prefix, specialist, ui}`; the longest matching prefix wins; `[]` means detected at run time | Path prefix to specialist agent, and whether the area has a UI | fill-cycle (`areaFor`) |
| `security_paths` | List of prefixes | A lane that touches one gets a security review | fill-cycle (`security`) |
| `protected` | List of `{prefix, agents, branches}`; `agents` and `branches` are regexes | Who may change which paths | `hooks/policy.ts` (`protected-path`); `run-gate.ts --gate protected`; fill-cycle (`protectedPaths`, `testAuthorPaths`) |

### Hooks and pause

| Key | Type and rule | Meaning | Read by |
|---|---|---|---|
| `hooks.log` | Text, relative to the project | Decision log: one JSON line per hook call | `hooks/policy.ts` |
| `hooks.deny_agent_gh_writes` | Boolean | Deny `gh` writes outside the kit | `hooks/policy.ts` (`gh-write-outside-kit`) |
| `hooks.auto_approve_tools` | List of tool names | Individual permission requests approved when no rule denies; empty grants none through this hook. Existing session-wide workflow permission is separate | `hooks/policy.ts` (`auto-approve`) |
| `pause` | Text | Where the pause label lives: the PRD issue | Validator only. The kit reads the label (`paused()`) |
| `notify` | List of text | Notification channels. Notify only; nothing waits for an answer | Validator only |

## Enforcement layers

Design 12 lists seven layers, outermost first. The charter keys each layer reads are in the last column.

| # | Layer | What it stops | Where it lives | Charter keys |
|---|---|---|---|---|
| 1 | Sandbox and network allowlist | Work outside the project and outside the allowed hosts | The dispatcher runs in its own OS user account (owner setup). The hook checks URL hosts | `authority.network_allow` |
| 2 | Owner's `gh` login | Admin actions and unscoped writes | The owner's own `gh` login with the scopes it already has (`repo`, `project`). An optional reviewer App is hardening only; setup never requires it | `identities` |
| 3 | Server ruleset and merge train | Merges without the required checks | `templates/ruleset-main.json`; the kit's merge train | `authority.merge.requires` |
| 4 | ZCode hooks | Pushes, merges, `gh` writes, protected paths, hosts | `hooks/policy.ts` through `hooks/hooks.json` | `hooks.*`, `authority.push`, `protected`, `authority.network_allow` |
| 5 | Kit policy code | Admin, auto-merge, branch deletion and force flags; invalid transitions; forged claims | `github-kit.dwf.ts`: its argv table has no such flags | `dispatcher`, `identities.builder` |
| 6 | Execution limits | Endless retries; oversized or stalled task runs | Attempt cap blocks the task; task timeout sets the claim TTL; the pause label stops new delivery runs | `limits.task_attempts`, `limits.task_timeout_minutes`, `pause` |
| 7 | Audit trail | Unrecorded actions | Claims, releases, journals and merges are GitHub comments and events. `hooks.log` records each hook decision | `hooks.log` |

The pause label is user steering; it stops new delivery runs.

### Hook rule ids

`hooks/policy.ts` returns one rule id per deny. The id is printed on stderr and written to `hooks.log`.

| Rule | Denies |
|---|---|
| `force-push` | `git push` with a force flag, a `+` refspec, `--delete`, `--mirror`, `--all` or `--prune` |
| `push-refspec` | A push with no explicit refspec, or a destination outside `authority.push` |
| `git-mutation` | Any git write from a subagent. Read-only git is allowed |
| `git-destructive` | `reset --hard`, `clean -f`, `checkout --` or `checkout -f`, `restore` without `--staged`, `branch -D`, `rebase`, `worktree remove --force`, `reflog expire`, `gc --prune=now` |
| `merge-outside-kit` | `gh pr merge` |
| `gh-write-outside-kit` | `gh` issue, pull request and label writes, when `deny_agent_gh_writes` is true |
| `ruleset-or-secret` | Non-GET `gh api` calls on rulesets, branch protection, secrets, hooks, collaborators, keys and environments; `gh secret`, `gh ruleset`, `gh variable`, `gh repo edit`, `gh auth` writes |
| `protected-path` | Write, Edit, ApplyPatch or NotebookEdit to a protected prefix, from a session whose agent name does not match the prefix's `agents` regex |
| `host-not-allowed` | A URL host outside `network_allow`, a non-HTTP scheme, or a URL whose host cannot be read |
| `policy-error` | A charter or input that does not load, a hook exception, or a log that cannot be written. Fails closed |
| `auto-approve` | A permission request allowed by `auto_approve_tools`. Not a denial |

A deny exits 2 with the reason on stderr. An allow prints the permission-request JSON and exits 0. A pass exits 0 with no output.

## What a person does

- **Once:** sign in to `gh` as the repository owner; give the setup prompt and review its `--dry-run` plan; accept mocks for missing capabilities; start the dispatcher.
- **Any time:** add the label named by `pause` to the PRD issue, which stops new runs; comment on the PRD issue (owner, member and collaborator comments are read as direction, anything else as data); edit the PRD by PR.

## Changing the charter

The owner changes the charter by prompting. Nobody edits `autopilot.yaml` by hand.

1. The owner states the change as a setup prompt, for example "change the review mode to auto".
2. The harness runs `setup.ts --dry-run` with the matching flags and shows the plan, including `autopilot.yaml` in its file list.
3. After the owner confirms, setup runs for real. It validates the generated charter before any GitHub write, then delivers it through the setup PR like the other generated files. Invalid output stops setup and names the key paths.
4. The charter is a protected path: `protected` gives it the branch pattern `^$`, and `hooks/policy.ts` denies Write and Edit calls to it from every session. Only the setup run changes it.
5. Setup branches may change the protected `autopilot.yaml` and `.github/` paths: their `branches` regex is `^wf/setup-[0-9]+$`, so the `ci` protected step passes a setup PR, while agents (`agents: "^$"`) and task branches still cannot change them.