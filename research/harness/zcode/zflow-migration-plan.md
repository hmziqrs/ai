# z-flow migration plan: no static engine

Date: 2026-10-18. Status: phase 1 (removal and re-alignment) executed in the working tree;
phases 2-8 open. This document replaces the deleted V3 unification plan, the Shipflow build
plan, and the `history/` archive. Everything deleted is recoverable from git at commit
`af931eb` (`git show af931eb:<path>`).

## 1. Why

The z-flow harness moved to a new standard in commits `81e2ca2` and `af931eb`:

- **Pillar 9, clean coordinator context.** The main thread holds only compact control data.
  It captures anchors, sets the SMALL or COMPLEX trigger from the task text, and dispatches.
  It never reads file contents, fetches URLs, or builds inventories.
- **Planner and author split.** `workflow-planner` (or `workflow-planner-flash`) gathers every
  fact for COMPLEX work, fills the `WorkflowBrief`, and dispatches `workflow-author` itself.
  For SMALL work the author explores and measures the signals directly.
- **A fresh script for every run.** The author writes a script for the task in hand, sized
  by measured signals and dials.

Three sets of documents and artifacts still assumed the old world:

- **A saved static engine** (`zflow-engine.dwf.ts`) with its own spec of record
  (`zflow-SPEC.md`).
- **A planned second saved engine.** The V3 "autonomous superset" was to be one persistent,
  self-amending run.
- **A Rust-plus-Svelte Shipflow.** It was a saved 82 KB queue script with 20 role agents, of
  which only 8 were ever loaded.

These contradicted Pillar 9 and the fresh-script rule. They also kept two sources of truth
alive and tied the issue pipeline to one stack. This plan removes them, rebuilds Shipflow as
a framework-agnostic z-workflow profile, and schedules the open work they still carried.

## 2. The target standard

| Rule | Where it lives |
|---|---|
| Fresh script per run; no saved engines; no "save this run as an engine" offers | `harness/zcode/skills/z-workflow/SKILL.md`, `ai/AGENTS.md` Conventions |
| Clean coordinator context (Pillar 9) | z-workflow Pillars, Step 0, Step 1 |
| Planner gathers facts (COMPLEX); author plans directly (SMALL) | `harness/zcode/agents/workflow-planner.md`, `workflow-author.md` |
| Reusable code is limited to pasted, drift-checked blocks | `z-workflow/persona-kit.dwf.ts` (canonical), z-liteflow's pre-tested template; `scripts/check-personas.mjs` |
| Domain roles come from `z-*` specialists; generic roles come from core agents | `z-workflow/references/specialists.md` |
| No destructive git; no push, except Shipflow's single publication step | z-workflow git rules; `skills/shipflow/SKILL.md` |
| Evidence labels: verified (command), judged (agent), unconfirmed | z-workflow Definitions |
| Global Core is 7 agents and 5 ZCode skills; everything niche installs per project | `install.md`, `z-project-init` |

The persona kit and the liteflow template are not engines. They are fixed blocks pasted
unchanged into generated scripts and checked byte-for-byte by `check-personas.mjs`. No
other saved script is allowed.

## 3. Decisions (binding)

- **D1. No saved engines.** Every run gets a fresh script from the z-workflow chain. No
  skill may offer to SaveWorkflow a generated script as a standing engine.
- **D2. Shipflow is a framework-agnostic profile of z-workflow.**
  - One cycle is one issue and one fresh run.
  - The run always takes the COMPLEX path, because issue text is off-repo material.
  - The coordinator loop runs on the main thread with compact data only and never reads
    issue bodies.
  - Every cycle passes the approval dialog; there is no unattended mode.
- **D3. Four new Shipflow-agnostic agents, installed per project with the `z-` prefix:**
  - `z-gh-operator`: exact listed `gh` mutations.
  - `z-pr-merge-steward`: merge-readiness facts, and one authorized pinned merge.
  - `z-queue-sentinel`: read-only queue health.
  - `z-security-auditor`: read-only diff security audit, including untrusted-text sinks.

  The Global Core stays at 7 agents.
- **D4. Every deleted `shipflow-*` role maps to a general or `z-*` agent** (section 6.3).
- **D5. Publication is the one exception to "scripts never push".** A Shipflow cycle may run
  exactly one non-force push of its own `wf/shipflow-<N>` branch. It is approved as its own
  group in the Step 5 command set.
- **D6. Merge policy is script code, never an agent verdict.**
  - Gates green, with no gateless area.
  - Audits attached.
  - Zero open high or medium findings.
  - Reviewed head unchanged.
  - PR not a draft.
  - `reviewDecision` is APPROVED. The pipeline never self-approves.
  - The merge is pinned with `--match-head-commit`.
- **D7. `dryRun` never sets `pipeline:done`.** It restores `pipeline:ready` and reports
  `dry-run`.
- **D8. Work happens in a run-owned worktree, never the user's checkout.**
  - Cycle reports (`.shipflow/`) and evidence (`.zflow/evidence/`) are written to
    git-ignored paths only.
  - These two paths are the only documented write exemption.
- **D9. Gates are discovered, not allowlisted.**
  - The planner reads them from manifests and project AGENTS.md.
  - It records the baseline exit code at `baseCommit`.
  - It refuses mutating flags and flags scripts whose bodies mutate.
- **D10. The label state machine keeps the old names.**
  - Labels: `pipeline:backlog`, `ready`, `claimed`, `done`, `failed`, `paused` (on the pin
    issue), and `watchdog`.
  - Claims are optimistic with a verify read.
  - The watchdog only notifies.

## 4. What phase 1 removed

| Removed | Count | Reason |
|---|---|---|
| `harness/zcode/workflows/zflow-engine.dwf.ts` | 1 | Saved static engine (D1) |
| `harness/zcode/workflows/zflow-SPEC.md` | 1 | Spec of record for the engine; z-workflow SKILL is the only contract |
| `harness/zcode/workflows/shipflow-queue.dwf.ts` | 1 | Saved queue engine (D1, D2) |
| `harness/zcode/agents/shipflow-*.md` | 20 | Replaced by general and `z-*` agents (D4); 12 were never loaded |
| `harness/zcode/skills/shipflow/references/knowledge/` | 8 | Rust/Svelte-specific templates; distilled into agnostic references |
| `harness/zcode/scripts/check-shipflow.mjs` | 1 | Tested the deleted queue |
| `research/harness/zcode/zflow-v3-unification-plan.md` | 1 | Premised on saved engines and a persistent self-amending run |
| `research/harness/zcode/shipflow/` (plan and graph) | 2 | Rust/Svelte build spec for the saved queue |
| `research/harness/zcode/history/` (out/ and zflow-port/) | 13 | Engine port archive, V3 runbook, drift report against the deleted engine |

Kept on purpose:

- `research/harness/zcode/skill-refactor-guidelines.md`. It is general. Its Coherence rule
  now targets the persona kit, the liteflow template and the skill text instead of a saved
  workflow.
- `research/harness/zcode/terminal-control/`. Unrelated.

The working tree held uncommitted edits to the V3 plan and the Shipflow plan from another
session. They were saved to the session scratchpad before deletion. They were not merged
into this plan, because their premises are superseded; their still-valid ideas appear in
section 7.

## 5. Stale-document migration map (phase 1 edits)

| File | Change |
|---|---|
| `ai/AGENTS.md` | Drop the `workflows/` layout line, the saved-engine contract lines, the "Shipflow queue" persona-kit carrier, and the `shipflow-*` role lists; state D1 in Conventions |
| `README.md` | Drop `workflows/` and the saved-engine/SPEC sentences; new Shipflow bullet; specialist count updated for the four new agents |
| `llms.txt` | Drop the engine bullet and the `shipflow-*` roles; describe the agnostic Shipflow and the four new agents |
| `install.md` | Drop the saved-engine step and check, all `shipflow-*.md` copies, and the `check-shipflow.mjs` run |
| `CHANGELOG.md` | [Unreleased] gains Added, Changed and Removed entries for this migration; released history untouched except the dangling `history/` pointer |
| `harness/zcode/scripts/check-personas.mjs` | Drop the queue-copy assertion; the liteflow copy stays checked |
| `harness/zcode/skills/z-workflow/SKILL.md` | Drop saved-engine references; provider ids point at core agent frontmatter; add the D5 exception and D1 |
| `harness/zcode/skills/z-workflow/references/specialists.md` | Routing rows for the four new agents; drop queue-specific authority |
| `harness/zcode/skills/z-project-init/SKILL.md` | New Shipflow install row; legacy cleanup step for `shipflow-*`, `shipflow-queue.dwf.ts` and `zflow-engine.dwf.ts` in initialized projects; drift check no longer reads the queue |
| `harness/zcode/skills/z-liteflow/SKILL.md` | Drop the static-engine evidence line |
| `harness/zcode/skills/z-super-rustflow/SKILL.md` | Drop the "save as `rustflow-engine`" offer; replace `shipflow-security-audit` with `z-security-auditor` |
| `harness/zcode/skills/z-tauri-workflow/SKILL.md` | Replace `shipflow-security-audit` with `z-security-auditor` |
| `harness/zcode/agents/z-github-project-manager.md` | Route mutations to `z-gh-operator`, health to `z-queue-sentinel`; drop deleted knowledge-file paths |
| `harness/zcode/agents/workflow-author.md`, `workflow-planner.md` | Fix only stale engine and push references (D5 applies only under the shipflow profile) |
| `harness/zcode/skills/shipflow/` | Rewritten: `SKILL.md`, `INSTALL.md`, `references/{cycle-contract,brief-extension,gates,review-checklists}.md` |

Projects initialized before this migration still carry `<project>/.zcode/agents/shipflow-*.md`,
`<project>/.zcode/workflows/shipflow-queue.dwf.ts`, possibly
`<project>/.zcode/workflows/zflow-engine.dwf.ts`, and old snapshot entries. `z-project-init`
removes them on its next run and rewrites the snapshot. Global installs need a Global Core
re-copy. ZCode loads agents only at session start, so a restart is required.

## 6. Shipflow rebuild

### 6.1 Capabilities that survive

Every capability below was in the deleted queue and is now specified in
`skills/shipflow/references/cycle-contract.md`. Generated cycle scripts must implement it:

- **Labels and loop control.** The label state machine and pin-issue pause. Stop rules:
  queue empty, user stops, paused, or two consecutive failed cycles.
- **Claim.** Optimistic: assign, swap the label, re-read; the loser releases silently. A
  retry reuses an existing `wf/shipflow-<N>` branch or open PR.
- **Triage.** Re-triage after the claim; a not-actionable issue is released to backlog with
  the exact question.
- **Plan.** The planner plans; the author REVIEW and plan-attack dials audit the plan.
- **Implementation lanes.** One per-area lane per `z-*` specialist, with skills resolved per
  `specialists.md`. A script-measured size budget applies; an overage is a verified finding.
- **Gates.** Gates are commands, with a baseline and a timeout. A red gate is a verified
  high finding. A gateless area is "unverified" and blocks the merge.
- **Judges.** Fresh blind judges each round, and confirmers that reproduce by command.
  Confirmed findings loop back to the lane implementer.
- **Runtime evidence.** Driven by the `V` signal: web capture in-run, desktop and mobile
  through one serialized device lane, and a blind vision audit.
- **Security audit.** Run by `z-security-auditor`, covering the injection sinks too.
- **Delivery.** Publication (D5), then a PR via `--body-file`. Merge policy is code (D6),
  and a merge-commit confirmation follows.
- **Close-out.** A comment plus a label swap. Outcomes: merged, open, released, failed,
  refused, or dry-run.
- **Report.** The cycle report at `<repoRoot>/.shipflow/cycle-<N>.md` doubles as the
  watchdog heartbeat.
- **Install checks.** Agent discovery, kit identity, `gh` scopes, capture probe, and a gate
  discovery dry check.

### 6.2 Defects the rebuild fixes

| Old defect | Fix |
|---|---|
| Ran `git checkout -b` and committed in the user's checkout | Run-owned worktree `wf/shipflow-<N>` (D8) |
| PR creation needed a branch no step published | Explicit publication step (D5) |
| Areas implemented sequentially despite `dependsOn` | Real per-area lanes with a worktree per writer and an integration branch |
| Confirmed review findings never looped back | Findings feed the lane implementer under the stop rule |
| A green `dryRun` set `pipeline:done` | D7 |
| Preview server never stopped | Cleanup stops every server it started |
| Command-reproduced findings labelled judged | Labelled verified, per z-workflow |
| Fixed gate allowlist of npm, cargo and similar | Manifest discovery (D9) |
| Agents loaded only from the project directory | Project first, then global (`specialists.md`) |
| 12 of 20 roles were dead code | Roster replaced (6.3) |

### 6.3 Role map

| Deleted role | Replacement |
|---|---|
| scout | `explore-flash` |
| issue-triage | `workflow-planner` verdict (`z-github-project-manager` for board judgement) plus `z-gh-operator` for label and comment |
| task-planner | `workflow-planner` |
| plan-auditor | `workflow-author` REVIEW plus the plan-attack dial |
| rust-impl, svelte-impl | The area's `z-*` specialist per `specialists.md` |
| rust-review, svelte-review | A fresh read-only copy of the area specialist; `z-accessibility-auditor` for UI |
| perf-engineer | `z-rust-perf-engineer` or the stack's specialist; `general-pro` otherwise |
| qa-writer, fixer | The area implementer; tests are part of the area (`test-quality-tdd-agents`) |
| copywriter | `general-pro` with `antislop-copy` |
| browser-tester | Script `world.run` capture; `general-flash` only for a long-running server |
| vision-judge | `general-flash` blind vision auditor |
| security-audit, injection-auditor | `z-security-auditor` |
| pr-reviewer | Fresh `general-pro` cross-area judge with a PR-body drift check |
| gh-ops | `z-gh-operator` |
| pr-merger | `z-pr-merge-steward` |
| queue-monitor | `z-queue-sentinel` |

The four new agents are generic. Any z-workflow run that delivers to GitHub may use them,
not only Shipflow.

### 6.4 Cycle shape without an engine

1. **Stop check.** The coordinator asks `z-queue-sentinel` for the pause flag and the ready
   issue numbers (counts and refs only).
2. **Pick and dispatch.** The coordinator picks an issue by number, captures anchors and the
   Shipflow config, and dispatches `workflow-planner` with the brief extension
   (`references/brief-extension.md`).
3. **Not actionable.** The coordinator dispatches `z-gh-operator` to comment the question and
   relabel to backlog. No run is launched.
4. **Otherwise, launch.**
   - The planner returns the brief, the TopologyPlan, and a script that pastes the persona
     kit unchanged.
   - The coordinator runs Step 4 pre-flight with REVIEW on.
   - It shows the Step 5 command set with `gh` mutations and publication as their own
     groups, then launches.
   - z-workflow's Step 6 local fast-forward is skipped; delivery is the remote PR.
5. **Close the cycle.** The coordinator relays the CycleReport, counts consecutive failures,
   and loops.

### 6.5 Implementation choices made in phase 1

The rebuilt skill settled these details. Owner review is still pending.

- **Branch names.** The integration branch is `wf/shipflow-<N>`, the only branch D5 lets a
  cycle push. Parallel area branches are `wf/shipflow-<N>-<area>`, because git cannot hold
  both `wf/shipflow-<N>` and `wf/shipflow-<N>/<area>`.
- **Worktrees.** They live under `<repoRoot>/.zflow/worktrees/`, which is git-ignored.
  - A retry reuses an existing local branch or registered worktree.
  - A remote-only branch is reported, not fetched.
  - One `git fetch origin <defaultBranch>` is allowed when the default head is missing
    locally. It is listed in the git-mutations approval group.
- **Project config.** `<project>/.zcode/shipflow.json` is committed and holds the repo, pin
  issue, tier, `dryRun`, `commit`, size budget and merge-method preference. The coordinator
  reads only its values, with one `jq -r` call.
- **Baselines.** The planner stays read-only and never runs baselines. The script's
  `Baseline gates` phase measures them in the fresh worktree.
- **Claim wins.** A claim wins only when the re-read shows `pipeline:claimed`, no
  `pipeline:ready`, and the authenticated login as the sole assignee. A changed `updatedAt`
  or body hash after the win releases the issue to `pipeline:ready`.
- **Review before publication.**
  - Judges and the security audit run on the local integration head before the single push.
  - A PR opens as `--draft` when the merge rules already fail locally.
  - After the push, `ls-remote` and the steward's `headRefOid` must both equal
    `reviewedSha`.
- **Merging.**
  - No `--delete-branch` on merge, so `wf/*` branches are kept per z-workflow's git rules.
  - All required checks must pass (`gh pr checks --required --watch` under a timeout).
  - The approver must not be the PR author.
- **Outcome bookkeeping.**
  - `open` and `commit=false` keep `pipeline:claimed`.
  - `failed` and `refused` add to the consecutive-failure counter; `merged` resets it.
- **Watchdog.** `<project>/.shipflow/watchdog.sh` is git-ignored and notify-only. An open
  watchdog issue stops the coordinator.

### 6.6 Risks carried by the rebuild

- **No unattended queue.** The approval dialog per cycle is deliberate. Unattended
  operation would need a separate authorization model and is out of scope.
- **Merging needs an outside approver.** The same account cannot approve its own PR, so
  merging needs a human or bot reviewer. Without one, cycles end `open`, which is correct
  but slow.
- **Planning tokens can be wasted.** The planner runs before the claim, so a racing
  coordinator can plan the same issue. The claim's re-read releases the loser.
- **Discovered gates can mutate.** They may be arbitrary scripts, so the planner's mutation
  flagging and the command-set approval are the only controls.

## 7. Ideas carried forward from the deleted research

These are kept as requirements or checks. The source is the deleted file, recoverable at
`af931eb`.

**Platform facts to re-verify before relying on them** (from `history/zflow-port/SPEC.md`
and the V3 plan, section 2a):

- Workflows cannot nest.
- `world.run` needs a literal command name and returns the exit code as a value.
- `report()` survives failed runs.
- agent-browser needs `--session` for parallel use.
- open-computer-use returns base64 PNG inside JSON.
- Plugins and MCP work on the main thread only; CLI tools are reachable inside runs.
- Per-subagent model pins work in one run.
- Unbounded `while` loops are an anti-pattern, because runs die on caps.

**GitHub facts** (V3 plan, section 2a):

- The token has `project` scope.
- `gh project item-edit` moves columns.
- `gh issue` has no sub-issue command.
- `item-list` returns `{"items":[...]}`.
- `--match-head-commit` is the merge-time drift guard.

**Untrusted input** (`history/out/shipflow-plan.md`, section 5.5):

- Funnel issue, PR and web text through the planner.
- Cap and fence excerpts.
- Validate numeric ids.
- Never let issue text choose operations.

**Script hygiene** (`PORT-REPORT.md`, `STANDING.md`):

- Typed returns carry changed paths, shas and per-area lanes, not counts.
- Gates exclude reds that already fail on the base commit.
- The guard checks the first non-flag git token, so `git -C <dir> push` cannot slip through.
- Evidence paths match anchored, never by substring.
- Per-area try/catch, so one bad reply cannot kill the report.
- The fix-target list is the latest judge return, never a union.
- Never claim a confirmation path that does not exist.
- Compile or rehearse before claiming done.

**Install** (V3 C5, shipflow plan Phase 0):

- User-scope skills shadow workspace skills, so every install needs a shadow scan.
- Byte-parity checks for pasted blocks.

**Preview** (`history/out/shipflow-plan.md`, section 6):

- The preview lifecycle is owned by the script, never by a model.
- Ports are deterministic.
- Credentials are generated per preview, never taken from source.

**Queue semantics** (V3 owner runbook):

- "Ready" means approved, all blockers closed, and not claimed.
- Pause must be explicit. The runbook admitted V3 had none; D10 restores the pin-issue pause.

**Audit method** (`history/out/z-skill-drift-report.md`):

- Quote-anchored drift audit of skill text against machinery.
- "Drift" and "intent" labels kept separate.
- Reused in phase 8 against the persona kit, the liteflow template and the z-workflow skill.

## 8. Overridden decisions (do not reintroduce)

- **Saved engines of record**, or any spec file outside the z-workflow skill.
- **A persistent, self-amending run that chains itself through AmendWorkflow.**
  AmendWorkflow fixes a wrong script and nothing else.
- **Tier-pure runs**, "one run = one model", and a run-wide `subagent_model`.
- **"Pro is image-blind."** Pro reads images.
- **Mode-switched chain nodes** (implement, judge, vision) and the escalation bridge.
- **Personas generated from a build-time registry.** Agent files stay canonical and the kit
  loads them at run time.
- **Stack forks inside the pipeline:** `implPersona(hasUI)`, the `{rust, svelte, copy, perf}`
  area vocabulary, and a `hasUI` boolean. These are replaced by measured signals and the
  `contention` field.
- **Reconcile steps with destructive git:** `reset --hard`, `branch -D`, `checkout main`.
- **A fixed `maxRounds 3` and a fixed 400-line, 10-file budget.** Dials set both now; the
  budget is a default only when the dials give none.
- **The mimosa broker** and the degraded single-model ladder.
- **A coordinator-run baseline gate pass** passed as launch arguments. The planner measures
  baselines inside its dispatch.

## 9. Remaining phases

Each phase is its own z-workflow task. Scope comes from the task text, so each starts as
COMPLEX unless noted.

### Phase 2: verify phase 1 (SMALL per file, run now)

1. `bun harness/zcode/scripts/check-personas.mjs` passes.
2. A stale-phrase grep for `zflow-engine`, `zflow-SPEC`, `shipflow-queue`, `check-shipflow`,
   `shipflow-[a-z]`, "saved engine" and "static engine" is clean outside `CHANGELOG.md`
   history and this document.
3. All core-agent lists agree on 7. The specialist count matches `ls harness/zcode/agents/z-*.md`.
4. Every new agent's `name` equals its filename and uses a valid color and model id.

### Phase 3: Shipflow live validation

Run against a scratch GitHub repository with:

- One ready issue per stack: a Node web app, a Rust crate, and a Python package.
- One not-actionable issue.
- One issue with a `blocked-by` link.
- One `dryRun` cycle.

Pass criteria:

- Labels follow the state machine.
- No write lands in the user's checkout outside `.shipflow/` and `.zflow/`.
- Publication pushes only `wf/shipflow-<N>`.
- An unapproved PR stays open with reasons.
- `dryRun` ends `ready`.
- The watchdog sees the cycle report.

Write the outcome back into this document.

### Phase 4: platform facts

Re-verify the section 7 platform and GitHub facts with probes. Record each with its command
and date in `harness/zcode/skills/z-workflow/references/` (new file `platform-facts.md`), and
link it from z-workflow. A fact that fails is removed from every skill that relies on it.

### Phase 5: runtime coverage

- Mobile capture through `mobilecli` inside runs, with `mobile-mcp` on the main thread only.
- Remote device fleets need owner consent, because they are billed.
- Lands in z-workflow's Vision phase and capture guidance, not in an engine.
- Includes a terminal/TUI verification lane (old spike S3) and xcodebuild/Espresso gates
  (S4).
- Settle the vision-blocking policy: does a vision fail block a merge or only flag it?

### Phase 6: cross-area seams

Specify the seam contract as an optional `WorkflowBrief` field:

- `contract` artifact.
- `servesOn` and `dependsOnService`.
- A whole-set `seamGate` that runs after integration and before delivery.

This is the open answer to "areas verified in isolation". It blocks new multi-service stack
profiles.

### Phase 7: delivery and intake

- **Delivery adapter.** One boundary for publication, PR, merge, and a future deploy stage
  (old spike S1). The deploy stage needs an owner decision before any script deploys.
- **GitHub Project queue.** Optional, on top of labels:
  - Columns, and an Approved column as the approval signal.
  - A `blocked-by-<n>` readiness rule.
  - Option ids read once with `gh project field-list`.
- **PRD front door.** The owner confirms each item. A versioned PRD file is kept on disk.
  `z-gh-operator` files the issues from an approved op list.

### Phase 8: drift audits

Apply the quote-anchored audit method to every z-flow skill against the persona kit, the
liteflow template and the z-workflow SKILL, with "drift" and "intent" labels separate.

Known defect classes to check:

- Omitted `mobile` contention.
- Profiles dropping the AmendWorkflow/ResumeWorkflowRun pair.
- Lean typed returns.
- The `git -C` guard bypass.
- Unanchored evidence matching.

## 10. Open questions for the owner

`autopilot-design.md` in this folder proposes answers to questions 2, 3 and 4 for
autonomous mode:

- An autonomy charter instead of per-cycle approval.
- A reviewer-identity `ai-review` check instead of a human approver.
- The GitHub kit.

If adopted, it reverses D2, D3, D5 and D6 for that mode.

1. **Placement of the new agents.** Should `z-security-auditor` join the Global Core? It is
   generic enough for any z-workflow Auditor dial. It stays per project for now to keep the
   Core at 7.
2. **Unattended Shipflow.** Is it ever wanted? If yes, it needs a separate authorization
   design. It must not be built by weakening the approval dialog.
3. **Merge approver.** Who approves Shipflow PRs: a human reviewer, or a dedicated bot
   account? This decides whether cycles can reach `merged` without a person.
4. **Optional policy kit.** Should a tested, drift-checked policy block (merge readiness,
   claim parsing, close-out) be pasted into cycle scripts like the persona kit? It would
   make the policy unit-testable again (the deleted `check-shipflow.mjs` tested it), at the
   cost of one more pasted block.
5. **Missing `harness/codex/`.** `ai/AGENTS.md` and `install.md` reference it, but it does
   not exist in this checkout. Restore it, or remove the references?

## 11. Rollback

Every deleted file is recoverable: `git show af931eb:<path>` or `git checkout af931eb -- <path>`.
Projects keep working on their pinned copies until `z-project-init` runs again.
