# Shipflow - per-project install

Shipflow installs into one project at a time through `z-project-init`
(`harness/zcode/skills/z-project-init/SKILL.md`). Real files, never symlinks: ZCode silently
skips symlinked agent definitions. Nothing installs globally beyond the Global Core that
`install.md` already covers. There is no workflow file to install: every cycle script is
written fresh by the planner and author chain.

## 1. Files (via z-project-init with Shipflow selected)

| Source in `hmziqrs/ai` | Destination |
|---|---|
| `harness/zcode/skills/shipflow/` (whole folder) | `<project>/.zcode/skills/shipflow/` |
| `harness/zcode/skills/z-workflow/` (whole folder, pins `persona-kit.dwf.ts` and `references/specialists.md`) | `<project>/.zcode/skills/z-workflow/` |
| `harness/zcode/agents/z-gh-operator.md`, `z-pr-merge-steward.md`, `z-queue-sentinel.md`, `z-security-auditor.md` | `<project>/.zcode/agents/` |
| The `z-*` specialists the project's manifests call for (per `harness/zcode/skills/z-workflow/references/specialists.md`), plus `z-native-device-verifier.md` when the project ships a desktop or mobile surface | `<project>/.zcode/agents/` |
| Stack skills those specialists name, from their approved sources | `<project>/.agents/skills/` |

Never copy the 7 core agents into the project, never create `<project>/.zcode/workflows/`,
and never copy role checklists into `docs/agents/`; the checklists live in
`shipflow/references/review-checklists.md` and are read from there. `z-project-init` records
the source commit, `personaKitVersion`, `personaKitSha256` and every file's sha256 in
`<project>/.zcode/hmziqrs-ai-snapshot.json`.

## 2. Project config

Create `<project>/.zcode/shipflow.json` (committed, so the queue's policy is reviewable):

```json
{
  "repo": "OWNER/NAME",
  "pinIssue": 1,
  "tier": "pro",
  "dryRun": false,
  "commit": true,
  "sizeBudget": { "maxLines": 400, "maxFiles": 10 },
  "mergeMethods": ["squash", "merge", "rebase"]
}
```

`tier` is `pro` or `flash` (flash selects `workflow-planner-flash` and the z-flashflow
profile). `mergeMethods` is a preference order; the planner intersects it with what the repo
allows. Start a new project with `"dryRun": true` for the first cycles.

Add to `<project>/.gitignore`:

```
.shipflow/
.zflow/
```

Check with `git -C <project> check-ignore -q .shipflow/x .zflow/x` (exit 0).

## 3. Labels and pin issue

Create each label once (one `gh label create` per label; `--force` is not used, so an
existing label is left as it is and the command's "already exists" error is fine):

```bash
for l in backlog ready claimed done failed paused watchdog; do
  gh label create "pipeline:$l" -R OWNER/NAME || true
done
gh label list -R OWNER/NAME --search pipeline: --json name -q '.[].name' | sort
```

The list must print all seven names. Then create the pin issue and record its number as
`pinIssue`:

```bash
gh issue create -R OWNER/NAME -t "Shipflow control" \
  -b "Add the pipeline:paused label to this issue to stop the Shipflow loop before its next cycle. Remove it to allow cycles again."
gh issue pin <number> -R OWNER/NAME
```

## 4. Watchdog (notify only)

The watchdog notices a stalled queue and opens one issue. It never launches, resumes or
relabels anything. It runs from the user's crontab and installs nothing globally; the entry
is per project (`cd <project>`). Save as `<project>/.shipflow/watchdog.sh` (git-ignored,
`chmod 700`):

```bash
#!/bin/sh
# Shipflow watchdog: notify-only. Opens one pipeline:watchdog issue when ready work exists,
# the queue is not paused, and no cycle report was written in the last 30 minutes.
set -eu
cd "$1"; R="$2"; PIN="$3"
gh issue view "$PIN" -R "$R" --json labels -q '.labels[].name' | grep -qx 'pipeline:paused' && exit 0
gh issue list -R "$R" -l pipeline:ready --state open -L 1 --json number -q '.[].number' | grep -q . || exit 0
find .shipflow -name 'cycle-*.md' -mmin -30 2>/dev/null | grep -q . && exit 0
gh issue list -R "$R" -l pipeline:watchdog --state open -L 1 --json number -q '.[].number' | grep -q . && exit 0
gh issue create -R "$R" -l pipeline:watchdog -t "shipflow stalled" \
  -b "Ready issues exist, the queue is not paused, and no .shipflow/cycle-*.md was written in 30 minutes. Check the coordinator session."
```

Crontab entry (`crontab -e`):

```
*/15 * * * * /bin/sh <project>/.shipflow/watchdog.sh <project> OWNER/NAME <pinIssue>
```

The duplicate check keeps one open watchdog issue at a time. The coordinator stops when it
sees one open; the user closes it after looking.

## 5. Verification (all must pass before the first cycle)

A failure stops the install and is reported with its command; nothing is skipped.

| Check | Command | Must show |
|---|---|---|
| Real files | `find <project>/.zcode/agents <project>/.zcode/skills -type l` | empty output |
| Agent discovery | start a new ZCode session in `<project>` (agents load at session start) and list agents | `z-gh-operator`, `z-pr-merge-steward`, `z-queue-sentinel`, `z-security-auditor` and each selected specialist, read from `<project>/.zcode/agents/` |
| Kit identity | from the `hmziqrs/ai` checkout: `bun harness/zcode/scripts/check-personas.mjs`; then `shasum -a 256 <project>/.zcode/skills/z-workflow/persona-kit.dwf.ts` | the checker exits 0; the hash equals `personaKitSha256` in the snapshot |
| gh auth | `gh auth status` and `gh api repos/OWNER/NAME -q '.permissions.push'` | logged in with the `repo` scope; `true` |
| Merge methods | `gh api repos/OWNER/NAME -q '[.allow_squash_merge,.allow_merge_commit,.allow_rebase_merge]'` | at least one `true` that is also in `mergeMethods` |
| Labels and pin | the label list above; `gh issue view <pinIssue> -R OWNER/NAME --json state -q .state` | seven labels; `OPEN` |
| Ignored paths | `git -C <project> check-ignore -q .shipflow/x .zflow/x` | exit 0 |
| Capture probe, `V` = web | `agent-browser --session shipflow-probe open about:blank`, then `screenshot <project>/.zflow/evidence/probe.png`, then `close`; `test -s <project>/.zflow/evidence/probe.png` | exit 0 for each; non-empty PNG |
| Capture probe, `V` = desktop or mobile | one `z-native-device-verifier` probe dispatch against the project's app or simulator | an AX dump and a PNG under `.zflow/evidence/` |
| Gate discovery dry check | dispatch `workflow-planner` with the task "list the Shipflow gates for this repo per shipflow/references/gates.md; no author dispatch" | every gate has a `source`, none is refused, no `mutatingBody` left unexplained |
| Bun and Git present | `bun --version`; `git --version` | both print a version (the persona guard needs them) |

Run the capture probe only for the surfaces the project has; record "not applicable" for
the others. Close any probe session even when a step fails.

## 6. Update and uninstall

Update by running `z-project-init` in the project; it compares the snapshot, asks before
overwriting local edits, and rewrites the snapshot. Uninstall by deleting the copied
`shipflow/` folder, the four queue agents, `.zcode/shipflow.json`, the crontab line and
`.shipflow/watchdog.sh`, then rerunning `z-project-init` to rewrite the snapshot. Labels and
the pin issue stay on GitHub unless the user deletes them.

## Migrating from the old queue

Projects installed before the no-engine migration carry files this repo no longer ships.
Remove them (after `git -C <project> status --porcelain` shows they hold no local edits the
user wants), then rerun `z-project-init`:

| Remove | Why |
|---|---|
| `<project>/.zcode/workflows/shipflow-queue.dwf.ts` (and `zflow-engine.dwf.ts` if present) | saved engines are retired; cycles are written fresh |
| `<project>/.zcode/agents/shipflow-*.md` (all 20 roles) | replaced by the role map in `shipflow/SKILL.md` |
| `<project>/docs/agents/*.md` copies the old installer created (`browser-vision.md`, `implementer-rust.md`, `implementer-svelte.md`, `pipeline-ops.md`, `qa-writer.md`, `queue-monitoring.md`, `reviewer.md`, `security-audit.md`) | checklists now live in `shipflow/references/review-checklists.md`; delete only files whose content matches the old copies, and keep any the project edited |
| `<project>/.zcode/skills/shipflow/references/knowledge/` | retired with the agents |
| Snapshot entries for every removed path in `<project>/.zcode/hmziqrs-ai-snapshot.json` | `z-project-init` rewrites them; a stale entry fails drift checks |

Then add `.zcode/shipflow.json`, the `.gitignore` lines, and rerun every verification check.
Old branches named `shipflow/issue-<N>` are left in place; the new retry lane only looks for
`wf/shipflow-<N>`. Issues left `pipeline:claimed` by the old queue are relabelled by a human.
