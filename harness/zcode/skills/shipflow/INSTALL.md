# Shipflow (autopilot) - per-project install

The owner prompts; the harness writes everything: the charter, PRD, tasks, labels, milestones,
Project, ruleset, CI workflow and hook configuration. No step has you write JSON, YAML,
credentials, a GitHub App or a key. The only prerequisite outside a prompt is a `gh` login on this
machine as the repository owner, with admin on the repository and the `repo` and `project`
scopes (`gh auth status` shows them). The commands shown are what the coordinator runs for you.

## 1. Planning only

Planning needs no GitHub access. It needs the `prd-authoring` skill (and `site-recon` for a
reference site) in `.agents/skills/`, plus the harness files from section 2, because the PRD
linter runs from `.zcode/skills/shipflow/scripts/prd-lint.ts`.

> Write a detailed PRD for <idea>

Planning ends at the local PRD and tasks. Publishing them to GitHub and building them need their
own prompts: approving a plan does not authorize building it (D14).

## 2. Install the harness files (prompt)

> Initialize this project for Shipflow autopilot

ZCode runs `z-project-init` with the Shipflow row selected, shows the plan and writes real files
(never symlinks, which ZCode silently skips for agents) after you confirm.

| Installed to | What lands there | When |
|---|---|---|
| `.zcode/skills/shipflow/` | the harness: scripts, hooks, references, templates | always |
| `.zcode/skills/z-workflow/` | the workflow skill, with its pinned `persona-kit.dwf.ts` | always |
| `.zcode/agents/` | `z-product-owner`, `z-security-auditor` | always |
| `.zcode/agents/` | `z-qa-evaluator`, `z-accessibility-auditor` | the project has a UI |
| `.zcode/agents/` | `z-native-device-verifier` | the project ships a desktop or mobile app |
| `.zcode/agents/` | stack specialists named in `z-workflow/references/specialists.md` | per the manifests |
| `.agents/skills/` | `prd-authoring`, `site-recon`, `parity-testing`, and the stack skills the specialists name | kickoff is used |
| `.zcode/hmziqrs-ai-snapshot.json` | source commit and sha256 of every installed file | always |

Restart the ZCode session afterwards, or open a new one. ZCode loads agents only at session start.

## 3. Set up the repository (prompt)

> Set up Shipflow autopilot for this repository

Add options to the same prompt in plain words: a reference site given by its https address, the
review mode ("human review", or "auto approval" for a small project), lanes ("5 lanes"), the task
breakdown ("detailed task list upfront" or "rolling"), and the Project title.

The coordinator runs setup twice: first as a plan, then for real.

```
bun .zcode/skills/shipflow/scripts/setup.ts --repo <root> --dry-run
bun .zcode/skills/shipflow/scripts/setup.ts --repo <root>
```

The dry run reads GitHub and writes nothing (`dryRun: true`, `files.status: "planned"`); the
coordinator shows it before applying. Setup is idempotent: `files.status: "up to date"` means a
re-run changed nothing.

| Step | Result |
|---|---|
| Identity | checks the `gh` login and admin access; that login becomes the builder identity |
| Charter | `autopilot.yaml` at the root, generated from the prompt and the repository; values already on the default branch are kept |
| Labels, milestones | the kit's label set (`state:*`, `kind:*`, `prio:*` and the rest) and the charter's milestones |
| PRD issue | `[PRD]` plus the project slug, labelled `kind:prd` and `kickoff:S1`, pinned; its number goes to `dispatcher.prd_issue` |
| Project | a GitHub Project titled as you asked (default: the project slug), with the PRD issue added |
| Setup PR | `[Setup] autopilot`, merged through the kit. It adds `autopilot.yaml`, `.github/workflows/autopilot-ci.yml`, the `.shipflow/`, `.zflow/` and `.zcode/workflow-drafts/` lines in `.gitignore`, the hook block in `.zcode/config.json`, and the harness files from section 2 |
| Ruleset | `autopilot-main` on the default branch, applied after the merge, requiring `ci`, `acceptance`, `parity` and `ai-review` |

Setup exits 0 when it finishes, 1 when a required step fails (the report's `error` names it), and
2 when the environment cannot work: no `gh` login, no admin access, or no GitHub origin. In the
last case the coordinator asks you for the repository name and passes it as `--gh-repo`.

Warnings do not stop setup. They appear in the report's `warnings` list as `WARN` lines:

- `project ...; publication will report partial`: no Project was created, usually because the
  `gh` login lacks the `project` scope. The coordinator names the one-line `gh` refresh; GitHub's
  browser prompt grants the scope. Then re-run the prompt.
- `ruleset` failed, or rulesets not readable: no server-side ruleset. A private personal
  repository on a free plan gets this. Merge safety then falls back to the kit's merge predicate
  (required checks before every merge) and the policy hook.
- `builder login X kept; gh login is Y`: the default branch already names builder X, and setup
  keeps it, so the dispatcher must run as X.
- `labels not created`, `milestones not created`, `PRD issue #N not pinned`, `project item for #N
  not added`: re-run the prompt.
- `skipped symbolic link`: a harness file is a symlink and was not committed. Reinstall it (section 2).

Setup does not change repository settings. If squash merging is off (Settings > General > Pull
Requests), the setup PR cannot merge: setup exits 1 and names the step. Turn the setting on and
re-run the prompt.

After the setup PR merges, the coordinator brings your checkout up to date:

```
bun .zcode/skills/shipflow/scripts/setup.ts --repo <root> --sync-checkout
```

The checkout must be on the default branch. Untracked files the merge would overwrite are moved
to `.zflow/setup-backup/` (never deleted), and only when they match the merged version or
regenerate to it (`.gitignore`, `.zcode/config.json`). Any other difference stops the sync and
names the file.

ZCode keeps hooks that arrive in a project's `.zcode/config.json` disabled until you trust them.
After the setup PR merges, the app shows "2 workspace hook(s) pending review". Open Review (or
Settings > Hooks), check that both commands run `.zcode/skills/shipflow/hooks/policy.ts`, and
turn on Trust for PreToolUse and PermissionRequest. This is the one click outside a prompt.
Until it is done the policy layer is off, and sessions already open keep it off: start a new
session afterwards.

## 4. Verify (prompt)

> Verify the Shipflow install

The coordinator runs the checks and reports each result. These must show:

| Check | Must show |
|---|---|
| Setup | the last setup report has `ok: true` |
| Charter | `autopilot.yaml` parses; an invalid charter makes the policy hook deny every agent action |
| PRD issue | open and pinned, labelled `kind:prd`; its number equals `dispatcher.prd_issue` |
| Labels | the kit's label set exists in the repository |
| Project | a `project.url` in the setup report, or the `project` warning |
| Ruleset | `autopilot-main` is listed with `ruleset: created` or `updated`, or the `ruleset` warning |
| CI | `.github/workflows/autopilot-ci.yml` is on the default branch; its `ci`, `acceptance` and `parity` jobs run on the next pull request or push |
| Hooks | Settings > Hooks lists PreToolUse and PermissionRequest for this project, both trusted |
| Policy | the coordinator asks an agent to run `git push --force origin wf/probe`; the push is refused and `.shipflow/policy.log` gets a line with `"decision":"deny"` and `"rule":"force-push"` |
| Agents | a new ZCode session in the project lists the Shipflow agents |

## 5. Change settings (prompt)

Settings change by prompt too. The coordinator re-runs setup with the new options, which opens
and merges one setup PR as the first run did. Options the prompt does not name keep their values.

> Switch PRD approval to auto for this small project
> Use 5 lanes
> Use the detailed task breakdown upfront

These map to `--approval auto`, `--lanes 5` and `--breakdown upfront`.

The build gate is not a setup option, and setup keeps the `gates` block already on the default
branch. This prompt makes the coordinator set the `gates.l1` build gate in `autopilot.yaml`
through a setup PR:

> Pin the build gate to bun run build

## 6. Supervised mode only

Supervised mode works issues you write, one approved cycle at a time, with no charter edits. It
needs the labels and PRD issue from section 3. Adding `autopilot:paused` to the PRD issue stops
the loop before its next cycle.

1. Open a GitHub issue for one piece of work and give it the `state:ready` label.
2. Prompt: "Work the Shipflow queue with per-cycle review".
3. Approve each cycle's command set in ZCode when it appears. A session-wide allowance (D16)
   stops repeat dialogs.
4. Review each cycle's pull request. With one identity you are its author, so GitHub cannot take
   your approval; merge it on GitHub, or prompt "Merge the reviewed PR #<n>" and the harness
   merges it through the kit, pinned to the reviewed commit. Teams with a second reviewer can
   require an approving review instead.

## 7. Optional hardening (only when you ask)

Neither option is needed for a working install. Ask for one by name in a prompt: "Add the
reviewer App to Shipflow" or "Add a separate builder account to Shipflow".

Reviewer App, in GitHub (Settings > Developer settings > GitHub Apps):

1. New GitHub App named after the project slug plus `-ai-review`. Uncheck Webhook > Active.
2. Permissions: Checks read and write; Contents and Pull requests read-only. Install it only on this account.
3. Generate a private key. The browser downloads a `.pem` file.
4. Install the App on this repository only.
5. Tell the coordinator the App ID, the installation ID and where the `.pem` file is.

The coordinator moves the key to `~/.config/autopilot/` with mode 0600, records the IDs in the
charter and re-runs setup. The ruleset then requires `ai-review` from the App, and
`post-review.ts` posts it as a check run.

Separate builder: invite a dedicated account with Write access (Settings > Collaborators), sign
the dispatcher's `gh` in as that account through GitHub's browser login, and tell the coordinator
its login. The coordinator records it in the charter and re-runs setup.

Setup does not install the stall watchdog (`templates/watchdog.yml`).

## 8. Update and uninstall

- Update: prompt "Update Shipflow in this project". ZCode runs `z-project-init`, which updates
  only the Shipflow files that differ from the snapshot. Then re-run the section 3 prompt so the
  committed files and the ruleset match the new kit.
- Uninstall: prompt "Remove Shipflow from this project". The coordinator deletes the files listed
  in the snapshot after you confirm. GitHub objects (PRD issue, labels, Project, ruleset) stay
  until you ask for each one.

## 9. Migrating from the old queue

Section 2's prompt also removes retired files. ZCode lists them, deletes them after you confirm,
and updates the snapshot.

| Retired | Replaced by |
|---|---|
| `.zcode/workflows/shipflow-queue.dwf.ts`, `.zcode/workflows/zflow-engine.dwf.ts` | a fresh script per run; saved engines are not used |
| `.zcode/agents/z-gh-operator.md`, `z-pr-merge-steward.md`, `z-queue-sentinel.md`, `z-github-project-manager.md` | the GitHub kit (`github-kit.dwf.ts`); project judgement moved to `z-product-owner` |
| `.zcode/agents/shipflow-*.md` | none; the review checklists stay in `.zcode/skills/shipflow/references/review-checklists.md` |
| `.zcode/workflows/` | removed when empty |
| `docs/agents/*.md` copies the old installer created (`browser-vision.md`, `implementer-rust.md`, `implementer-svelte.md`, `pipeline-ops.md`, `qa-writer.md`, `queue-monitoring.md`, `reviewer.md`, `security-audit.md`) | the checklists in `.zcode/skills/shipflow/references/review-checklists.md`; only files whose content matches the old copies are removed, edited ones are kept |
| `.zcode/skills/shipflow/references/knowledge/` | retired with the old role agents |
| `.zcode/shipflow.json` | the generated `autopilot.yaml` (D17) |
| Snapshot entries for every removed path in `.zcode/hmziqrs-ai-snapshot.json` | rewritten by `z-project-init`; a stale entry fails its drift check |
| Niche copies in `~/.zcode/agents/` and `~/.zcode/skills/`; legacy saved workflows in `~/.zcode/workflows/` | removed from the global folders after you confirm; niche files live per project |

Open issues with `pipeline:*` labels: prompt "Relabel the open pipeline issues to state labels".
The coordinator lists them, shows each old and new label, and applies the change after you
confirm, so every issue ends with exactly one `state:*` label. Run section 3 first so the
`state:*` labels exist.
