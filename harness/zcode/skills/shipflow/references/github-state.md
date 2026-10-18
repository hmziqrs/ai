# GitHub state

The contract for the state the autopilot keeps on GitHub: labels, the machine block, the task state machine,
claims, readiness, sub-issues and dependencies, reconciliation and Project publication, the merge path,
identities and trust, the PRD issue, and attempt journals. The code is the GitHub kit, `github-kit.dwf.ts`
(kit v1, the block between `// github-kit:start v1` and `// github-kit:end v1`). Scripts paste it unchanged,
and `dispatch.md` runs the drift diff before each launch. The reconciler is `scripts/reconcile.ts`. Design 6
of `autopilot-design.md` gives the reasons; this file states what the code does. Gaps are listed under
"Not wired yet". Failure responses are in `failure-policy.md`.

## When to Use

- Explaining or changing a label, task state, claim, merge decision or the PRD issue.
- Writing a bespoke run that touches GitHub: call the pasted kit. Agent-side `gh` writes are denied by the hook
  rule `gh-write-outside-kit` when `hooks.deny_agent_gh_writes` is true (`charter.md`).

## The kit

`makeGithubKit(config)` carries every GitHub mutation; setup's one direct `gh` call is a read of rulesets.

| Key | Source | Used for |
|---|---|---|
| `repo`, `login` | `repo`; `identities.builder.login` | every call; `login` is the only login whose records count |
| `instance` | `dispatcher.instance` | prefix of every claim nonce |
| `prdIssue` | `dispatcher.prd_issue` | pause and kickoff labels; the kit rejects 0 |
| `dryRun` | caller | mutating calls are recorded in `ops` as planned, not run |
| `claimTtlSeconds`, `attemptCap` | `2 x limits.task_timeout_minutes x 60`; `limits.task_attempts` | claim staleness; release cap |
| `requiredChecks` | `authority.merge.requires` | the merge predicate `checks` row |
| `writeRoot` | `<repo>/.shipflow` | body files, written as `gh/<n>-<purpose>.md` |
| `pollSeconds`, `maxPolls`, `assignee` | fill-cycle: 20 and 45; caller | wait loops; visibility assignee after a won claim |

- A `gh` call times out after 120 seconds (exit code 124). A failed mutating call adds a finding,
  `gh mutation failed`, with the first 300 characters of stderr.
- Bodies reach `gh` only through `--body-file`. A Bun helper writes them under `writeRoot` and refuses paths
  outside it, `..` segments and symbolic links. Dry runs write these local files; that is not a GitHub write.
  Lists read at most 1000 issues and 200 pull requests, without pagination.

## Labels

`KIT_LABELS` is the fixed set. `ensureLabels` creates missing labels, including the reconciler's `area:` labels,
and never changes an existing colour or description; `ensureMilestones` creates missing `M<n>` milestones.

| Label or family | Meaning | Set by |
|---|---|---|
| `kind:prd`, `kind:epic`, `kind:feature`, `kind:task`, `kind:bug`, `kind:assumption`, `kind:spike`, `kind:chore` | Issue kind. Claims accept `task`, `spike`, `chore`, `bug` | reconcile (`kind:task` for tasks); setup (`kind:prd`) |
| `state:backlog`, `state:ready`, `state:claimed`, `state:review`, `state:blocked`, `state:done`, `state:failed` | Machine state; exactly one on each open issue | reconcile (new tasks start in `backlog`); kit `claim`, `release`, `transition` |
| `size:S`, `size:M` | Task size; sets the default round cap and budget | reconcile |
| `prio:p0` to `prio:p3` | Priority; dispatch picks p0 first | reconcile creates `p2`; a person changes it |
| `attempt:1` to `attempt:4` | Attempt number; no label means attempt 1 | kit `release`, capped at `attemptCap` |
| `area:<section>` | Section code; lanes with overlapping areas never run together | reconcile |
| `autopilot:paused` | Stops every run and claim; lives on the PRD issue | a person; the kit reads it |
| `kickoff:S0` to `kickoff:S6`, `kickoff:done` | Kickoff stage on the PRD issue; no label means S0 | setup (`kickoff:S1`); `setKickoffStage` |
| `needs-research` | Attempt cap passed | kit `release`, with `state:blocked` |
| `needs-capability`, `flaky` | Missing capability; flaky check or test | no shipped script sets them; snapshot reports them as flags |
| `stop-the-line` | Red `main` | the audit run; while one is open the decision is `fix-main` |

## Machine block

The first block in each issue body. The reconciler renders it; the kit parses it. Example, trimmed. The reconciler also writes `parent`, `prd`, `satisfies`, `tests` and `milestone`; `budget` is
for tasks, with 150 lines for `S` and 300 for `M`:

````
```autopilot
id: LB-1.4
kind: task
prd_hash: 3f9c1a
area: [src/routes/leaderboard]
depends_on: [LB-1.1, LB-1.2, LB-1.3, FND-3.2]
size: S
budget: {files: 10, lines: 150}
```
````

Parse rules (`kitParseMachineBlock`):

1. Exactly one opening line `` ```autopilot `` and a later closing `` ``` ``. No opening gives `no machine block`;
   two give `multiple machine blocks`; no close gives `unterminated machine block`.
2. Each other non-empty line is `key: value`. Scalars: `id`, `kind`, `parent`, `prd`, `prd_hash`, `size`,
   `milestone`. Lists in `[a, b]` form: `area`, `depends_on`, `satisfies`, `tests`. `budget` is
   `{files: N, lines: N}`. A repeated key, or a scalar that starts with `[` or `{`, is an error. Unknown keys
   are ignored by the kit; `fill-cycle.ts` refuses an issue that has one.
3. Validation: `id` is `PRD`, two to four capitals with optional `-n` or `-n.n`, `A-nnn` or `ADR-nnn`; `kind` is
   one of the eight kinds; `satisfies` entries look like `LB-1.AC3`; `area`, `tests` and `prd` are safe paths
   (no leading `/`, no `..`, no backslash, only `A-Za-z0-9_./@+#-`); `prd_hash` is 6 to 64 lowercase hex digits;
   `size` is empty, `S` or `M`; a task id looks like `LB-1.4`, and a task needs a non-empty `area` and a `size` of `S` or `M`.

Any error makes the block null. Text after the block is untrusted (section Identities and trust).
`prd_hash` is the reconciler's change detector: a body is rewritten only when its block's `prd_hash` differs.

## State machine

`KIT_TRANSITIONS` lists the only legal moves. `transition(n, from, to)` refuses any other pair, and refuses
unless exactly one state label shows `from`. It re-reads the issue and returns `done` only when exactly `to`
shows. `claim` and `release` edit labels in one combined edit and do not call `transition`.

| From | To | Event | Performed by |
|---|---|---|---|
| backlog | ready | every blocked-by issue is closed | launched run, through `transition`, for `decision.promote` |
| backlog | blocked | task is unfit before it is ready | bespoke run through `transition` |
| ready | claimed | claim won | kit `claim` |
| ready | blocked | triage verdict not actionable | bespoke triage run through `transition` (`cycle-contract.md`) |
| claimed | review | PR opened or found | cycle, through `transition` |
| claimed | ready | stale claim (`bumpAttempt` true) or changed issue (false) | kit `release` |
| claimed | blocked | attempt cap passed, or release to blocked | kit `release` |
| claimed | failed | cycle failed | cycle, through `transition` |
| review | claimed | advance re-takes the lane | bespoke advance run through `transition` |
| review | ready | release from review | kit `release` |
| review | blocked | release to blocked, or attempt cap passed | kit `release` |
| review | failed | cycle failed | cycle, through `transition` |
| review | done | merge confirmed after `mergeTrain` returns `merged` | cycle, through `transition` |
| blocked | backlog | task sent back for planning | person, or bespoke run through `transition` |
| blocked | ready | task unblocked | person, or bespoke unblock run through `transition` |
| failed | ready | retry | person, or bespoke run through `transition` |

`reconcile` changes no state label except to create tasks in `state:backlog`.

## Claims

Claims are comments, not assignees. Several dispatchers can share one login, and GitHub Apps cannot be
assigned, so comments give an order and a nonce.

A claim comment carries `<!-- autopilot:claim -->` and a fenced `autopilot-claim` record (version 1: `task`,
`nonce`, `bodySha`, `attempt`). The nonce is `<instance>-<unix seconds>-<task>`; `task` is the block id, or
`issue-<N>` without a block (supervised mode only). `bodySha` is the SHA-256 of the body at claim time.

`claim(n, { requireBlock })`, with `requireBlock` true by default:

1. Refused if the PRD issue is unreadable or carries `autopilot:paused`.
2. Refused unless the issue is open with exactly one state label, and that label is `state:ready`.
3. Refused on a block error, unless `requireBlock` is false and the missing block is the only error. The kind
   must be `task`, `spike`, `chore` or `bug`.
4. Post the claim comment. Re-read the issue; if it still shows `state:ready`, move it to `state:claimed`.
5. Re-read the comments. The winner is the live claim with the lowest comment id among the configured login's
   claims in the current epoch. A loser deletes its own comment and returns `lost`; its label edit stays,
   which is correct because a winner exists.
6. The winner must re-read exactly `state:claimed`, or it deletes its comment and returns `error`. A won claim
   adds the assignee if one is set, and returns `won`.

Outcomes: `won`, `lost`, `refused`, `error`, `dry-run` (a dry run records the comment and edit as planned).

Epochs and TTL: the epoch is the comment id of the latest release record (`autopilot-release`, version 1, from
the configured login). Claims at or below it are ignored. A claim is live while its age is at most
`claimTtlSeconds`; the template's 90-minute timeout gives a 3-hour TTL.

Stale claims: a `state:claimed` issue with no live winner. The snapshot lists it, and `decide` puts it in
`decision.release` of the next launched run, or of a release-only run under `idle`.

`release(n, { reason, nonce, bumpAttempt, to, addLabels })` requires exactly one `claimed` or `review` label;
`to` is `ready` or `blocked`. It writes the release comment first (`<!-- autopilot:release -->`; record `task`,
`nonce`, `reason`, `attempt`, where `attempt` is the number after the bump). A release record also clears every
older claim. Then one label edit adds `state:<target>`, the new `attempt:<n>` and any `addLabels`, removes the
old state and attempt labels, and removes the assignee when set. Past `attemptCap` the target becomes `blocked`
and `needs-research` is added: with a cap of 4, a failure at attempt 4 writes attempt 5 in the record and keeps
`attempt:4` on the issue. If the edit fails after the comment, the issue stays `state:claimed` with no live
claim and the next snapshot lists it again; the attempt is read from the unchanged label, so it is not counted
twice.

## Readiness and dependencies

- The native blocked-by relation is the dependency source, written by the reconciler from `depends_on`. Claims
  never read `depends_on`.
- `promoteReady({ milestones })` moves backlog tasks to ready once all blocked-by issues are closed; an unreadable
  list moves nothing. No shipped script calls it; the launched run promotes `decision.promote` through `transition`.
- Sub-issues and dependencies use numeric REST ids: `sub_issues` (GET; POST with `sub_issue_id`) and
  `dependencies/blocked_by` (GET; POST with `issue_id`; DELETE `.../blocked_by/<id>`). Ids come from
  `GET repos/R/issues/N` (`id`), cached per instance. Adds read the list first and return `exists` when linked.
- `createIssue` passes `--parent` and `--blocked-by` only when `gh issue create --help` names them; otherwise it
  links by REST after creation. The help of gh 2.92.0, installed here, names neither, so REST is in use. A failed
  link returns `failed` with the issue number; the next reconcile adds the link.

## Reconciler and Project

`scripts/reconcile.ts` plans, then applies (`--dry-run` prints the plan); unparseable issues are never touched.

Plan order: `ensure-labels`, `ensure-milestones`; the PRD root (create when `prdIssue` is 0, else rewrite the body when
`prd_hash` changes); each active item (create, or rewrite the body when `prd_hash` differs; new tasks get
`kind:task`, `state:backlog`, size, `prio:p2` and `area:`); `link-parent`; `add-blocked-by` and `remove-blocked-by`
to match `depends_on`; `close-not-planned` for open issues missing from the PRD or dropped.

Apply runs the ops in order with `--pace-ms` (default 1000) between mutations. A secondary rate limit waits 60 seconds,
then retries once. A failed op does not stop later ops, but any failure ends the run before Project publication
(`issue sync failed`, exit 1).

Project publication, after a clean sync: find the Project by title among the owner's first 100, or create it; add
missing members (PRD issue, active items, tasks when included); verify membership (first 1000 items); set Status from
the state label (backlog: Backlog or Todo; ready: Ready or Todo; claimed: In progress; review: In review or In progress;
blocked and failed: Blocked; done: Done). A missing field or option is a warning; a failed read, edit or membership is
a failure. A Project failure does not roll back the issue sync: the run reports `partial publication` and exits 1, and a
rerun finishes the Project. Views are never created, edited or deleted.

## Merge path

`mergeTrain(pr, { reviewedSha, base, maxUpdates, requireApproval, onRepin })` is the only merge path. It always squashes
(`gh pr merge --squash --match-head-commit <pinned>`) and always runs as a train; `authority.merge.via` is validated but
not read.

Each poll reads the PR facts, then:

1. Head check. A head other than the pinned SHA is accepted only if this train ran `update-branch` and the new head is a
   merge commit whose parents are the pinned SHA and the current base head. The pin moves and `onRepin(newSha)` runs;
   `false` or an exception is `blocked`. Any other move is `blocked` ("head moved").
2. Predicate rows (`kitMergePredicate`): `open`, `not-draft`, `base`, `head`, `checks` (each required name present and
   `success` on the pinned head), `mergeable`, `merge-state` (`CLEAN`, `HAS_HOOKS`, `UNSTABLE`), and `review` (`APPROVED`)
   when `requireApproval`.
3. Choice, in order: `blocked` on a hard fail (closed or draft, wrong base, moved head, a failed required check,
   `CONFLICTING`, `DIRTY`, `DRAFT`, or approval missing when required); `update-branch` on `BEHIND`, checked before
   waiting; `wait` on a missing or pending check, `UNKNOWN` mergeable or merge state, or `BLOCKED`; `merge` when every
   row holds; otherwise `blocked` with the failing rows.
4. `merge` polls until the PR reads `MERGED` with a merge commit (`merged`), `CLOSED` without a merge (`failed`), or the
   poll cap (`timeout`).

Outcomes: `merged`, `blocked`, `failed`, `timeout`, `dry-run`; `maxUpdates` caps update-branch runs and `maxPolls` caps the loop.

Re-pin and `ai-review`: `update-branch` creates a head no status covers, so `onRepin` must post `ai-review` on it. With
`onRepin: null` (setup's call) nothing is posted, the predicate waits, and the train ends `timeout`. Statuses come from
`postStatus(sha, { context, state, description })`. A reviewer App check run is optional (`scripts/post-review.ts`).

Statuses and check runs with the same name fold into one entry; the worst state wins. A completed check run succeeds on
`SUCCESS`, `NEUTRAL` or `SKIPPED`. The kit has no merge lock; one active run per project keeps merges serial.

## Identities and trust

- Default identity: the login `gh` is authenticated as on the dispatcher machine, by default the owner's own login
  (design 0.1, D17). Claims, releases, journals, PRs, merges and the `ai-review` status all use it. The kit never selects
  a login. Setup compares `whoami()` with the charter login and warns on a mismatch; the claim path does not check.
- Only records from the configured `login` count; that is the only trust filter in shipped code.
- `author_association` is read onto each comment. `kitTrustedAssociation` (OWNER, MEMBER, COLLABORATOR) is exported but
  unused, so comment text from any login is data. Design 9 and `charter.md` describe owner, member and collaborator
  comments as direction; that is not implemented.

## PRD issue

- Setup creates it when no open issue carries `kind:prd` and block id `PRD`: title `[PRD] <project>`, labels `kind:prd`
  and `kickoff:S1`, then pins it (`pinIssue`) and adds it to the Project. Reconcile rewrites its body when the root
  `prd_hash` changes.
- Pause: add `autopilot:paused`. Claims refuse and the snapshot reports `paused`. Remove it to resume.
- Kickoff: `setKickoffStage(stage)` accepts `S0` to `S6` or `done`, removes the other `kickoff:*` labels and adds the
  target. A failed move returns `failed`.

## Snapshot and journals

`snapshot({ withPromotable })` reads open issues and returns counts per state (plus `unlabelled`), task rows (issue, id,
kind, state, milestone, area, prio, attempt, size, flags), `stopTheLine`, `staleClaims`, `promotable`, `openPrs`,
`invalid` (a state label on an issue whose block does not parse), `kickoffStage`, `prdIssueOpen` and `paused`. It fails
closed: a failed read gives `ok: false`. Task rows carry no `createdAt`, so dispatch ties fall back to the issue number.

A journal comment carries `<!-- autopilot:journal -->` and a fenced `autopilot-journal` record (version 1: `task`,
`attempt`, `outcome`, `signature`, `approaches`, `failed`, `learned`, `pr`, `mergeSha`, `minutes`), then a readable
summary. There is no cost, token or usage field (D13). `readJournal` returns the configured login's records in comment
order and skips any that do not parse. The run writes `signature`; the kit neither computes nor compares it.

## Not wired yet

- `promoteReady`, `kitTrustedAssociation` and `kitUntrusted` are exported and called by no shipped script; the owner,
  member and collaborator trust rule is not enforced.
- `claim`, `release`, `transition`, `journal` and `openPr` are called by the launched run (`cycle-contract.md`,
  `dispatch.md`). The task-cycle template that carries those calls is not in this folder. Setup calls `openPr` and
  `mergeTrain`; `harness/zcode/scripts/check-github-kit.mjs` exercises the rest.
- No script sets `flaky` or `needs-capability`. The merge queue is not used. Project Status is the only Project field
  synced.
