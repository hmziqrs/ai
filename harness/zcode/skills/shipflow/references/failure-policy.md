# Failure policy

What the shipflow dispatcher and its runs do when something fails, stalls or reaches a limit: the signal, the
response, the component that detects it, and the actor that acts. This is design 9 with two owner changes. D13
removes monetary and token accounting and every budget stop, so only execution limits remain. D14 keeps the
phases independent: an implementation-only run never re-plans. Where the code differs from design 9, this file
describes the code and lists the gap under "Not wired yet". The state rules are in `github-state.md`; the
decision table is in `dispatch.md`.

## When to Use

- A run stopped, errored or failed a gate, a claim or merge stalled, or a decision came back `needs-plan`,
  `paused` or `idle` and you need the reason.
- Changing a limit in the charter (`charter.md`).

## Execution limits

No cost, token or budget limit exists (D13). These limits remain:

| Limit | Charter key (template value) | Enforced by | On breach |
|---|---|---|---|
| Attempts | `limits.task_attempts` (4) | kit `release` (`attemptCap`) | the task moves to `state:blocked` with `needs-research` |
| Claim TTL | `limits.task_timeout_minutes` (90); TTL is twice that | kit `claim` and `staleClaims` | the claim is stale; the next release clears it |
| Round cap | fixed by size: 2 for `S`, 3 for `M` | fill-cycle (`roundCap`) and the cycle stop rule | the lane stops; nothing merges |
| File and line budget | task `budget` (default 10 files; 150 lines for `S`, 300 for `M`) | cycle size check (`cycle-contract.md`, phase 4) | lane result `over-budget`; a `medium` finding that blocks |
| Gate timeout | `timeout_minutes` on each gate and on `preview` | `run-gate.ts` (SIGTERM, then SIGKILL after 5 seconds); `preview.ts` reads it | the gate fails with reason `timeout` |
| Lanes | `limits.max_parallel_lanes` (3) | snapshot decision (`pickNonOverlapping`) | fewer lanes per run; overlapping areas never run together |
| Merge polls | fill-cycle: 45 polls, 20 seconds apart | kit `mergeTrain` (`maxPolls`) | `timeout`; the issue stays `state:review` |
| `gh` call | kit: 120 seconds | kit `gh` | exit 124, recorded as a failed mutation |
| Reconcile pacing | `--pace-ms` (1000) | `reconcile.ts` | a secondary rate limit waits 60 seconds, once |
| Crawl cap | `limits.page_cap` (400) | validated only; no shipped script reads it | none in this skill |
| Wall clock | `limits.wall_clock_days` (14) | validated only | none in this skill |

## Failure responses

| Signal | Response | Detector | Actor |
|---|---|---|---|
| Gates still red after the stop rule | Attempt plus one; journal the signature and approach; release to ready with `bumpAttempt` | cycle stop rule; red gate blocks (`verification-ladder.md`) | launched run, kit `release` |
| Second attempt (`attempt:2`) | Lane tier is `pro`; attempt 1 uses `tiers.first_attempt` | attempt label | fill-cycle (`tier`) |
| Third attempt, or the same signature twice | Product owner splits the task or opens a spike (design 9) | not wired; see Not wired yet | none |
| Bumped attempt above `attemptCap` | `state:blocked` with `needs-research`; the queue moves on | kit `release` | launched run, kit `release` |
| Supervised cycle failed | `state:failed` with a comment; a person relabels to `ready` | cycle outcome `failed` | cycle, through `transition` |
| Blocked tasks and none ready | Dispatch mode: `unblock` run (split, spike or PRD change). Implementation-only: `needs-plan` | snapshot `blocked` list; `decide` | dispatcher turn; unblock run |
| Red `main` | `stop-the-line` issue; decision `fix-main`; no PR advances or merges while it is open | snapshot `stopTheLine` | audit run opens it; fix run works it |
| Flaky test | Three reruns, then `flaky` quarantine and a fix task (design 9) | not wired | none |
| Stale claim (`state:claimed`, no live winner) | Next launched run releases it with `bumpAttempt`; a release-only run under `idle` | snapshot `staleClaims` | next run, kit `release` |
| Issue body changed after planning | Release to ready, no attempt bump, reason "issue changed during planning" | cycle freshness check (`cycle-contract.md`, step 5) | cycle, kit `release` |
| PRD plan changed since publication | Issue refused (`needs-publish`); no GitHub write until the PRD is republished | fill-cycle `planHashCheck` | fill-cycle |
| PRD item dropped | Issue refused (`needs-plan`); no GitHub write | fill-cycle `planHashCheck` | fill-cycle |
| Implementation-only, and planning or publication is missing | Decision `needs-plan` with the stage or ids; the turn ends; nothing is planned | `decide` in `implement` mode | dispatcher turn |
| Open backlog tasks, none ready or blocked, every milestone planned | Decision `idle` in code (design 9 says `needs-plan`); a release-only run if stale claims exist | `decide` | dispatcher turn |
| Claim lost to an older live claim | Loser deletes its comment; the cycle returns `released` with no issue comment | kit `claim` | kit and cycle |
| Claim write fails, or the state does not land | Own comment deleted; `error`; a leftover `state:claimed` issue becomes stale | kit `claim` | kit and cycle |
| Run stopped (`interrupted` or `provider`) | `ResumeWorkflowRun` once; if it stops again, claims wait for the TTL and the next run releases them | dispatcher run list | dispatcher |
| Run errored (script threw, overran a cap, lost an artifact) | No resume; the turn ends with `errored: run <id>`; the owner or the author fixes the script | dispatcher | owner or author |
| PRD issue unreadable | Snapshot `ok: false` ends the turn; claims refuse | snapshot; kit `paused` | dispatcher; kit |
| Paused (`autopilot:paused`) | Decision `paused`; no launch; no release | snapshot `paused` | a person sets and removes the label |
| Required check red on a PR | `blocked`; no merge; the PR stays open; the issue stays `state:review` with the failing rows | kit `mergeTrain` (`checks` row) | merge caller |
| Required check still pending at the poll cap | `timeout`; the issue stays `state:review` | kit `mergeTrain` | merge caller |
| Head moved outside the train, re-pin refused, or update limit reached | `blocked`; no merge | kit `mergeTrain` | merge caller |
| A `gh` write fails | Finding recorded; failure returned to the caller | kit `gh` | caller |
| Reconcile op fails | Other ops continue; exit 1 `issue sync failed`; no Project step | `reconcile.ts` apply | operator, after fixing the cause |
| Project step fails after a clean sync | `partial publication`; exit 1; the issue sync is kept | `publishProject` | operator reruns |
| Protected path touched, or a change outside the lane's area | Verified finding (a protected path is `high`); lane blocked | purity check (`verification-ladder.md`) | cycle |
| Comment from a login other than the configured one | Ignored for claims, releases and journals | kit login filter | kit |
| No activity for 2 hours, ready tasks exist, not paused | Open one `kind:bug` issue titled `autopilot stalled`; never relaunches anything | watchdog workflow (`templates/watchdog.yml`) | watchdog |

## Implementation-only runs (D14)

- `decide` in `implement` mode (the default of `snapshot.ts --mode`) never plans or publishes. Its planning
  decision is `needs-plan`, returned when the kickoff stage is not `done`, when a milestone has no task plan, or
  when blocked tasks need a planning decision. The decision names the stage, milestone or issue ids for the turn to
  report.
- `needs-publish` is not a decision value. It is the refusal `fill-cycle.ts` gives an issue whose machine-block
  `prd_hash` no longer matches its PRD item, or whose item is missing. Such an issue is refused with no GitHub write.
- Planning and publication run only when the request authorizes them (`dispatch.md`, start-up checklist). A
  planning-only or publication-only request does not enter the dispatch loop.

## Attempt journals and signatures

- Journal fields: `task`, `attempt`, `outcome`, `signature`, `approaches`, `failed`, `learned`, `pr`, `mergeSha`,
  `minutes`. There is no cost field (D13).
- `signature` is a free string the run writes. The kit neither computes nor compares it. The audit retro reads
  journals with `readJournal` to find recurring signatures (`SKILL.md`, audit step 5).

## Coordinator stop rule (supervised)

`failed` and `refused` cycle outcomes add one to a consecutive-failure count; `merged` resets it; `open`,
`released`, `shadow` and `dry-run` leave it unchanged. Two in a row stop the loop (`SKILL.md`, supervised step 10).

## Not wired yet

- The attempt-3 split and the same-signature rule: no code reads attempt 3 or journal signatures.
- Flaky quarantine: no script reruns tests or sets `flaky`.
- Backlog-only queues: `decide` returns `idle`, while design 9 says `needs-plan`.
- Crawl cap and wall-clock limit: validated in the charter, not enforced by code in this skill.
- Gate-red release, promotion and attempt bump belong to the task-cycle template, which is not in this folder. The
  responses above come from `dispatch.md` and `cycle-contract.md`.
