# Shipflow cycle contract

Every cycle script the `workflow-author` writes for Shipflow meets this contract. REVIEW and
the coordinator's pre-flight check it. Names in `<angle brackets>` come from the brief.

## Label state machine

| From | Event | To | Actor |
|---|---|---|---|
| (new issue) | human triage | `pipeline:backlog` or `pipeline:ready` | human |
| `pipeline:ready` | planner verdict not actionable | `pipeline:backlog` + exact question comment | coordinator via `z-gh-operator` |
| `pipeline:ready` | claim won (re-read shows sole assignee @me) | `pipeline:claimed` | script via `z-gh-operator` |
| `pipeline:ready` | claim lost | unchanged; own assignee removed, no comment | script via `z-gh-operator` |
| `pipeline:claimed` | issue `updatedAt` or body hash differs from the brief | `pipeline:ready` + comment "issue changed during planning" | script |
| `pipeline:claimed` | merge confirmed | `pipeline:done` + comment with merge SHA | script |
| `pipeline:claimed` | PR open, merge blocked or awaiting review | stays `pipeline:claimed` + comment with PR URL and itemized reasons | script |
| `pipeline:claimed` | `commit=false` | stays `pipeline:claimed` + comment with worktree paths | script |
| `pipeline:claimed` | dry run finished | `pipeline:ready`, own assignee removed + comment | script |
| `pipeline:claimed` | cycle failed | `pipeline:failed` + comment with reason | script |
| `pipeline:failed` or `pipeline:claimed` | human relabels | `pipeline:ready` (next cycle takes the retry lane) | human |

`pipeline:paused` lives only on the pin issue. `pipeline:watchdog` lives only on issues the
watchdog opens. No other labels are created or removed.

## Claim and release protocol

1. Re-read the pin issue labels (`gh issue view <pin> --json labels`). Paused: return
   `refused`; nothing was claimed.
2. Re-read the issue (`gh issue view <N> --json labels,assignees,updatedAt,state`). Not open,
   not `pipeline:ready`, or already assigned to someone else: return `refused`.
3. `z-gh-operator` ops, in order: `assign @me`, `label-add pipeline:claimed`,
   `label-remove pipeline:ready`.
4. Script re-read of labels and assignees. Won only when `pipeline:claimed` is present,
   `pipeline:ready` is absent, and the assignees are exactly the authenticated login
   (`gh api user -q .login`). Lost: `z-gh-operator` runs `unassign @me` only, the script
   returns `released` with no comment and no further mutation.
5. Compare the re-read `updatedAt` and the body sha256 (from a script-run
   `gh issue view <N> --json body -q .body | shasum -a 256`) against the brief. A mismatch
   releases the claim back to `pipeline:ready` with outcome `released`.

## Required phases, in order

Phase names are string literals; the pre-flight greps for each.

1. `Refuse or claim` - argument checks, pause check, claim protocol above.
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
   (`git rev-parse HEAD` in the integration worktree), push with the D5 refspec, then
   `git ls-remote origin refs/heads/wf/shipflow-<N>` must equal `reviewedSha`.
8. `Pull request` - reuse the open PR for head `wf/shipflow-<N>` when one exists; otherwise
   `z-gh-operator` `pr-create --body-file .shipflow/pr-body-<N>.md`, `--draft` when the
   local predicate rows are already false. Then wait on required checks with
   `gh pr checks <pr> --required --watch` under a timeout.
9. `Merge decision` - `z-pr-merge-steward` `facts`, the predicate below in script code, then
   `merge` mode only when every row holds.
10. `Close out` - labels and comment per the state machine, through `z-gh-operator`, each
    verified by a script re-read.
11. `Cleanup` - stop every preview server and close every browser or device session this
    cycle started (verify the port no longer answers); remove area worktrees whose lanes
    reported `merged`, without `--force`; keep the integration worktree unless the outcome
    is `merged`. Runs on every path, including failures.
12. `Report` - write `.shipflow/cycle-<N>.md` and return the CycleReport.

## Merge predicate (script code)

| Row | Holds when |
|---|---|
| Gates | every non-baseline-red gate exited 0 on the integration head |
| No gateless area | every area has at least one gate that was green on base |
| Size | every area within budget by the script's numstat |
| Audit attached | the security audit and every fresh judge returned a result |
| Findings | zero open high or medium findings, counting unconfirmed ones |
| Guards | no read-only guard failure in `personaFindings` |
| Head, local | integration `HEAD` equals `reviewedSha` |
| Head, remote | steward `headRefOid` and `ls-remote` both equal `reviewedSha` |
| Draft | `isDraft` is false |
| Review | `reviewDecision` is `APPROVED` and the approver is not the PR author |
| Checks | every required check concluded `SUCCESS` on `reviewedSha` |
| Method | the chosen method is allowed by the repo (brief `mergeMethods`) |

Merge argv: `gh pr merge <pr> --<method> --match-head-commit <reviewedSha>`; never `--admin`,
`--auto`, or `--delete-branch`. Merged only when `gh pr view <pr> --json state,mergeCommit`
shows `MERGED` and a non-empty merge commit. A failing row leaves the PR open; every failing
row is itemized in the comment and the report.

## dryRun and commit

| Setting | Claims | Edits and gates | Commits | Push, PR, merge | Final label | Outcome |
|---|---|---|---|---|---|---|
| default | yes | yes | yes | per predicate | per state machine | merged, open, failed |
| `dryRun: true` | yes | yes | yes, on `wf/*` only | no | `pipeline:ready` | `dry-run` |
| `commit: false` | yes | yes | no | no | `pipeline:claimed` | `open` |

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

`<repoRoot>/.shipflow/cycle-<N>.md`, rewritten every cycle for that issue; its mtime is the
watchdog heartbeat. Format: a `# Shipflow cycle - issue #<N>` title; a summary table (outcome,
PR, reviewedSha, mergeSha, dryRun, commit); the predicate table; gates; areas; findings
grouped by label; evidence paths; personas; GitHub ops; notCovered; branches and worktrees
left. Issue text never appears in the report except as the issue number and title hash.
