---
name: shipflow
description: >-
  Per-project autonomous dev pipeline over labeled GitHub Issues: the main
  agent is the chain coordinator looping poll-run-relaunch over the
  shipflow-queue workflow, one issue per cycle — code, gates, preview,
  browser/vision evidence, PR, audit, merge. Use when a project wants its
  issue queue worked end-to-end, human owning triage labels and the pause
  label. Triggers: shipflow, issue queue automation, autonomous pipeline,
  ship-on-merge loop.
---

# shipflow

Installed INTO a project (INSTALL.md — per-project paths only, never global).
The queue is that project's GitHub Issues, driven by the `gh` CLI. Labels:
`pipeline:backlog`, `pipeline:ready`, `pipeline:claimed`, `pipeline:done`,
`pipeline:failed`; pause = `pipeline:paused` on the shipflow pin issue.
Branch per issue `shipflow/issue-<n>`, one PR per issue. The main agent
running this skill is the chain coordinator: it loops poll-run-relaunch; each
workflow run does exactly ONE cycle; the watchdog cron and the coordinator
provide the infinity — never a loop inside a run (no nesting; only the main
agent launches workflows).

## When to use

A project wants its labeled GitHub Issues worked autonomously, end-to-end:
code, gates, preview, browser/vision evidence, PR, audit, merge — one issue
per cycle, human owns triage labels and the pause label. Not for repos
without `gh` access or gates. Trivial one-file edits are cheaper done
directly.

## Tier matrix (one model per run — subagent_model is run-wide)

| Work | Tier |
|---|---|
| Coordination (init survey, queue polling, launches, verdict recording, report) | host main thread — compact control data only |
| triage, scout, gh-ops, copywriter, browser, monitor, injection | flash (GLM-5.3-Flash) |
| implement, plan, review, security, PR-review, qa | pro (GLM-5.3) |
| vision (pixel verdicts) | flash — pro is image-blind (SPEC 1.4) |

One model per run: `subagent_model` is run-wide (SPEC 1.1); the launcher
pins it per node — tier-pure node launches, zflow-engine style — and the
script never pins models.

## The queue loop (infinite, coordinator-owned)

1. **Init survey** (once): project AGENTS.md, gates inventory, preview
   command, charter.
2. **Poll**: `gh issue list -l pipeline:ready` — none: check pause/stop and
   end the session (the watchdog re-kicks). Found:
3. **Run one cycle**: `CreateWorkflow` shipflow-queue with `subagent_model`
   pinned to the cycle's tier — pro default, flash for label-chore cycles —
   and the workflow's declared args: `issueNumber`, `repo` (OWNER/NAME),
   `tier`, `task` (issue title+body verbatim), `areas` (the planner's
   array, zflow-engine shape), `agentsMd` (default "AGENTS.md"), `baseSha`,
   `maxRounds` (default 3), `commit` (default true), `dryRun` (default
   false — full cycle except PR create/merge). The cycle runs Claim →
   Triage → Plan → Implement → Gates → Preview → Browser → Vision → PR →
   Audit → Merge → Cleanup → Report and returns a typed CycleReport.
4. **On its typed return**: record verdicts, relaunch for the next issue.

## POLICY — exits in code, never model judgment

- Queue empty → end the session (the watchdog re-kicks).
- `pipeline:paused` on the pin issue → stop.
- Two consecutive failed cycles → stop, report honestly.
- Per-area `maxRounds` cap.
- Never claim clean while a gate is red.

## Watchdog cron (installed per project by INSTALL.md)

```
*/15 * * * * cd <project> && gh issue list -R <repo> -l pipeline:ready -L 1 | grep -q . && ! find .shipflow -name 'cycle-*.md' -mmin -30 | grep -q . && gh issue create -R <repo> -l pipeline:watchdog -t "shipflow stalled" -b "ready issues exist but no cycle artifact in 30m"
```

The workflow touches `.shipflow/cycle-<n>.md` (its report artifact) every
cycle; the cron only notifies, never relaunches.

## Conventions

- Size budget: ≤400 changed lines / ≤10 files per commit, one commit per
  green round. Committer-style serialized git, explicit paths, never
  `--no-verify`, never push branches — PRs only; merge via `gh pr merge`.
- AGENTS.md binds every spawned ask; its required skills are read and
  followed on top.
- Evidence under `.zflow/evidence/`; fresh auditors never judge fixes they
  inspired; unverified stays unverified; half-done work stays on disk and is
  listed in the report.

## Fallback lanes

- **Deep implement**: when the plan marks an area complex, the coordinator
  launches `zflow-engine` `mode=implement tier=pro` for that area BETWEEN
  cycles (no nesting — only the coordinator launches workflows), then feeds
  the engine's WorkflowReport back into the next queue cycle as `findings`.
