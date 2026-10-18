# Shipflow cycle contract

Every cycle script the `workflow-author` writes for Shipflow meets this contract. REVIEW and
the coordinator's pre-flight check it. Names in `<angle brackets>` come from the brief.

Supervised mode asks for product review per cycle when the user chooses that policy.
Session-wide workflow permission can suppress repeated tool dialogs; it does not replace
that requested product review. This contract adds no GitHub write outside authorized scope. Every GitHub mutation goes through
the pasted GitHub kit (`github-kit.dwf.ts`, `// github-kit:start v1`); the cycle writes no
hand-built `gh` mutation.

## Label state machine

Every transition is a GitHub kit call: `transition`, or the label edit inside `claim` and
`release`. An issue carries exactly one `state:*` label, and the kit refuses a transition from
a state the issue does not show.

| From | Event | To | Actor |
|---|---|---|---|
| (new issue) | human triage | `state:backlog` or `state:ready` | human |
| `state:ready` | planner verdict not actionable | `state:blocked` + exact question comment | coordinator via the GitHub kit |
| `state:ready` | claim won (kit `claim` returns `won`) | `state:claimed` | script via the GitHub kit |
| `state:ready` | claim lost | unchanged; the loser deletes its own claim comment, no comment on the issue | script via the GitHub kit |
| `state:claimed` | issue `updatedAt` or body hash differs from the brief | `state:ready` via kit `release` (no attempt bump) + comment "issue changed during planning" | script |
| `state:claimed` | PR opened | `state:review` | script via the GitHub kit |
| `state:review` | merge confirmed | `state:done` + comment with merge SHA | script via the GitHub kit |
| `state:review` | PR open, merge blocked or awaiting the owner's merge | stays `state:review` + comment with PR URL and itemized reasons | script |
| `state:claimed` | `commit=false` | stays `state:claimed` + comment with worktree paths | script |
| `state:claimed` | dry run finished | `state:ready` via kit `release` + comment | script |
| `state:claimed` or `state:review` | cycle failed | `state:failed` + comment with reason | script via the GitHub kit |
| `state:failed` (or `state:claimed` left by a stopped cycle) | human relabels | `state:ready` (next cycle takes the retry lane) | human |

`autopilot:paused` lives only on the PRD issue (`dispatcher.prd_issue`), and a cycle only reads
it. The watchdog's record is a GitHub issue titled `autopilot stalled` (see Watchdog), not a
label. A cycle touches only its own issue's `state:*` label.

## Claim and release protocol

A claim is a kit record, not an assignee. It is a comment by the builder login that carries a
nonce, and the winner is decided by comment order. Several dispatchers can share one builder
login and GitHub Apps cannot be assignees, so assignees are not the claim primitive. Supervised
cycles call the kit with `requireBlock: false`, because human-written issues carry no machine
block.

1. Pause check: the kit reads `autopilot:paused` on the PRD issue (`dispatcher.prd_issue`).
   Paused, or unreadable: return `refused`; nothing was claimed.
2. Issue check (kit `claim`, step 2): the issue must be OPEN and carry exactly one `state:*`
   label, which must be `state:ready`. A machine block is optional; a block that is present
   must parse and have kind `task`, `spike`, `chore` or `bug`. Any failure returns `refused`
   with no mutation.
3. Claim comment: the kit posts a `<!-- autopilot:claim -->` comment with an `autopilot-claim`
   record (nonce `<instance>-<unix seconds>-issue-<N>`, `bodySha` = `kitSha256` of the body,
   attempt), then sets `state:claimed` and removes `state:ready`. An assignee may be added after
   a won claim for visibility only (kit `assignee`; empty for none).
4. Winner check (kit `claim`, steps 6-7): the kit re-reads the comments and counts only those by
   the builder login. The epoch is the id of the last release comment; claims posted before it
   do not count. A claim older than `claimTtlSeconds` (twice the task timeout) is stale and does
   not count. The lowest live claim comment id wins. When our nonce wins the kit returns `won`.
   Otherwise it returns `lost`: the kit deletes our claim comment and touches no label, and the
   cycle returns `released` with no comment on the issue.
5. Freshness: the script re-reads `updatedAt` (kit `viewIssue`) and compares it, and the claim's
   `bodySha`, with the brief's `issue.updatedAt` and `issue.bodySha256`. A mismatch releases the
   claim through kit `release` (reason "issue changed during planning", no attempt bump) and
   returns `released`.
6. Kit outcome `error` returns `failed` with the reason. Kit `dry-run` continues the cycle with
   no GitHub write.

A stopped cycle leaves its claim live until the TTL passes. A failed cycle does the same,
because kit `release` cannot target `failed`. A relabel to `state:ready` before the TTL passes
therefore cannot be claimed: each attempt returns `released` until the old claim goes stale.

## Required phases, in order

Phase names are string literals; the pre-flight greps for each.

1. `Refuse or claim` - argument checks, PRD issue pause check, kit claim (protocol above).
2. `Prepare worktrees` - retry lane: when `wf/shipflow-<N>` exists locally, `git worktree add
   <wt> wf/shipflow-<N>` (reuse an existing registered worktree as-is and record its
   porcelain status); otherwise `git worktree add -b wf/shipflow-<N> <wt> <defaultHead>`,
   preceded by one `git fetch origin <defaultBranch>` only when the brief reports that SHA
   missing locally. Write `.shipflow/requirements-<N>.md` from the brief.
   Area worktrees `wf/shipflow-<N>-<area>` branch from the integration head. A remote-only
   leftover branch is reported; the cycle does not fetch it into a new local branch.
3. `Baseline gates` - every gate once per area worktree before any edit. Red on base: excluded
   from the merge predicate, listed in `notCovered`, never counted green.
4. `Lanes` - one future per area, started together: implement (specialist, `write`), gate,
   size check (`git add -N` on untracked paths, then `git diff --numstat <baseCommit>`), flash
   tracer, fresh read-only judges, confirmers when `R` >= medium, vision or device stage when
   `V` says so; stop rule with the dial round cap; one commit per lane at the end.
5. `Integrate` - `// JOIN: integration-merge`. Serialized `git merge --no-ff` of each area
   branch into the integration worktree; conflicts run `git merge --abort` and are findings.
   Rerun every gate on the integration head.
6. `Cross-area review` - `// JOIN: whole-set-check`. `z-security-auditor` (read-only) on the
   full diff; fresh `general-pro` cross-area judge, including PR-body drift against the body
   file. Confirmed findings route to the owning lane by path (pattern 12, counted close),
   re-gate, re-merge, re-review, under the stop rule.
7. `Publish` - skipped when `dryRun` or `commit=false`. Record `reviewedSha`
   (`git rev-parse HEAD` in the integration worktree), push once per cycle with the D5 refspec,
   then `git ls-remote origin refs/heads/wf/shipflow-<N>` must equal `reviewedSha`.
8. `Pull request` - kit `openPr({ head: wf/shipflow-<N>, base, title, body, draft })`. The body
   text is read from `.shipflow/pr-body-<N>.md`; `draft` is set when the local predicate rows are
   already false. `openPr` returns `exists` for an open PR on that head, so no second PR is made.
   A `created` or `exists` result moves the issue from `state:claimed` to `state:review` (kit
   `transition`) and comments the PR URL. Required checks are read later, by the merge run in phase 9,
   not by a separate `gh pr checks` call.
9. `Merge decision` - the run-level rows of the predicate below are checked in script code, using
   kit `prFacts` for the kit rows. When every run-level row holds, the script posts `ai-review`
   with state `success` on `reviewedSha` through kit `postStatus`. A failing row posts nothing, so
   the ruleset keeps the PR unmergeable, and every failing row is itemized. The cycle does not call
   `mergeTrain`: it ends `open` with the PR awaiting the owner, who merges in GitHub or prompts the
   merge run below (SKILL.md, Mode: supervised, Merge). That bounded merge run starts only after the
   owner's explicit merge prompt and calls kit `mergeTrain(pr, { reviewedSha, base, maxUpdates,
   requireApproval: false, onRepin })`, with `reviewedSha` read from `.shipflow/cycle-<N>.md`. On
   each poll the kit applies `kitMergePredicate` with `requireApproval: false`: `update-branch`
   (up to `maxUpdates`, then re-pinned to GitHub's base merge), `wait` (poll again), `merge` (the
   merge argv below), or `blocked` (stop and itemize the failing rows). `onRepin` re-posts
   `ai-review` on the re-pinned head through kit `postStatus`, so the required context follows the
   head. `requireApproval: true` is for a team where another person reviews; it is not the default.
10. `Close out` - labels and comment per the state machine, through the GitHub kit. On `merged` (reported by the merge run),
    `transition(n, "review", "done")` plus a comment with the merge SHA. On `open`, the issue stays
    `state:review`. On `failed`, the transition to `state:failed`. The kit returns `done` only
    when exactly one `state:*` label shows the target, which is the script re-read.
11. `Cleanup` - stop every preview server and close every browser or device session this
    cycle started (verify the port no longer answers); remove area worktrees whose lanes
    reported `merged`, without `--force`; keep the integration worktree unless the outcome
    is `merged`. Runs on every path, including failures.
12. `Report` - write `.shipflow/cycle-<N>.md` and return the CycleReport.

## Merge predicate (script code and kit)

The run-level rows are checked in script code before `ai-review` is posted (phase 9). The kit rows
are the rows of `kitMergePredicate`, which the merge run's `mergeTrain` applies on every poll with
that run's `requireApproval` value (`false` by default); the script reads the same facts through
`prFacts` for the report.

| Row | Source | Holds when |
|---|---|---|
| Gates | run | every non-baseline-red gate exited 0 on the integration head |
| Gateless area | run | every area has at least one gate that was green on base |
| Size | run | every area within budget by the script's numstat |
| Audit attached | run | the security audit and every fresh judge returned a result |
| Findings | run | zero open high or medium findings, counting unconfirmed ones |
| Guards | run | no read-only guard failure in `personaFindings` |
| Head, local | run | integration `HEAD` equals `reviewedSha` |
| Head, remote | run | `git ls-remote origin refs/heads/wf/shipflow-<N>` equals `reviewedSha` |
| Method | run | squash is in the brief's `mergeMethods`; the kit merges only with `--squash` |
| `open` | kit | `prFacts.state` is `OPEN` |
| `not-draft` | kit | `isDraft` is false |
| `base` | kit | `baseRefName` is the brief's `defaultBranch` |
| `head` | kit | `headRefOid` equals `reviewedSha` |
| `checks` | kit | every name in the brief's `requiredChecks` concluded `success` on `reviewedSha` |
| `mergeable` | kit | `mergeable` is `MERGEABLE` |
| `merge-state` | kit | `mergeStateStatus` is `CLEAN`, `HAS_HOOKS` or `UNSTABLE` |
| `review` | kit | Checked only when the merge run's `mergeTrain` has `requireApproval: true` (a team where another person reviews): `reviewDecision` is `APPROVED`. With the default `requireApproval: false` the row is not applied; the owner's explicit merge prompt is the human gate, and `reviewDecision` is reported only |

Merge argv (kit): `gh pr merge <pr> -R <repo> --squash --match-head-commit <reviewedSha>`; never
`--admin`, `--auto`, or `--delete-branch`. Merged only when the kit's merge-state read shows
`MERGED` with a non-empty merge commit. A failing row leaves the PR open; every failing row is
itemized in the comment and the report.

## dryRun and commit

| Setting | Claims | Edits and gates | Commits | Push, PR, merge | Final label | Outcome |
|---|---|---|---|---|---|---|
| default | yes | yes | yes | per predicate | per state machine | merged, open, failed |
| `dryRun: true` | yes (kit records the claim as planned) | yes | yes, on `wf/*` only | no | `state:ready` (no GitHub write) | `dry-run` |
| `commit: false` | yes | yes | no | no | `state:claimed` | `open` |

## CycleReport

```ts
interface CycleReport {
  /** One paragraph: outcome and the reason, in plain words. */
  conclusion: string;
  /** Every finding with its label; nothing silently dropped. */
  findings: { where: string; what: string; evidence: string; status: "verified" | "judged" | "unconfirmed"; severity: "low" | "medium" | "high"; area: string }[];
  /** Command-backed facts: gate exits, re-reads, merge commit. */
  verified: string[];
  /** What the cycle did not check or finish, with why. */
  notCovered: string[];
  /** The issue number this cycle handled. */
  issue: number;
  outcome: "merged" | "open" | "released" | "failed" | "refused" | "dry-run";
  /** "" when no PR exists. */
  prUrl: string;
  /** Integration head the judges reviewed; "" when nothing was committed. */
  reviewedSha: string;
  /** Merge commit SHA when outcome is merged, else "". */
  mergeSha: string;
  /** One row per gate run, baseline included. */
  gates: { area: string; argv: string; phase: "baseline" | "lane" | "integration"; exitCode: number; baselineRed: boolean }[];
  /** Per area: branch, worktree, rounds, stop reason, size, lane result. */
  areas: { name: string; branch: string; worktree: string; rounds: number; stopReason: string; size: { files: number; added: number; deleted: number }; result: "merged" | "red" | "over-budget" | "gateless" | "not-run" }[];
  /** Merge predicate rows with pass or the failing value. */
  predicate: { row: string; holds: boolean; value: string }[];
  /** Evidence file paths under .zflow/evidence/. */
  evidence: string[];
  /** personaReport() rows: path, sha256, access, model. */
  personas: { path: string; sha256: string; access: "read-only" | "write"; model: string }[];
  /** Label and comment ops with their re-read results. */
  ghOps: { op: string; target: string; result: string }[];
  /** wf/* branches and worktrees left on disk. */
  left: string[];
}
```

## Report path and format

`<repoRoot>/.shipflow/cycle-<N>.md`, rewritten every cycle for that issue. Its mtime is a local
heartbeat only; the watchdog reads GitHub activity instead (see Watchdog). Format: a
`# Shipflow cycle - issue #<N>` title; a summary table (outcome, PR, reviewedSha, mergeSha,
dryRun, commit); the predicate table; gates; areas; findings
grouped by label; evidence paths; personas; GitHub ops; notCovered; branches and worktrees
left. Issue text never appears in the report except as the issue number and title hash.

## Watchdog

`templates/watchdog.yml` is a GitHub Actions scheduled workflow: every 30 minutes, permissions
`contents: read` and `issues: write`, notify-only. It is optional and reads `dispatcher.prd_issue`
from `autopilot.yaml`, so it is installed only in a project that has a charter. It opens at most
one `kind:bug` issue titled `autopilot stalled`, and only when the PRD issue is not paused,
`state:ready` issues exist, and no issue or pull request in the repository was updated in the
last 2 hours. An open `autopilot stalled` issue suppresses a second one. It never relaunches,
labels or edits anything else. The local report mtime is not visible to it, so the cycle's
GitHub comments and label edits are what count as activity.
