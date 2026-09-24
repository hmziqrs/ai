---
name: z-gpui-workflow
description: >-
  Thin chain-coordinator skill for real GPUI (gpui-kit) Rust desktop work:
  pro implement and judge runs of zflow-engine, a flash vision node for
  pixel design audits via ocu capture (AX text + decoded PNGs), small
  commits, and a code-enforced POLICY loop. Use for multi-area GPUI tasks
  needing iterate-until-clean with visual verification. Trigger phrases:
  gpui workflow, gpui orchestration, gpui sub-agents, gpui
  iterate-until-clean, fine-grained GPUI loop.
---

# z-gpui-workflow

**The main agent is a chain coordinator, not an implementer.** It slices
the task into GPUI areas, launches tier-pure `zflow-engine` runs as chain
nodes, and writes the final report; between runs it holds ONLY compact
control data — typed returns, evidence paths, round number, open-finding
counts, commit shas. Trivial one-file edits don't need this skill. Sibling
flows (z-workflow, z-proflow, z-flashflow, z-liteflow) run under their own
rules — never cross-apply; hand off via finish-and-relaunch.

## Tier philosophy

Flash wherever output is objectively checkable — gates, git state,
schema'd reports, image reading. Pro wherever quality is only checkable by
judgment — architecture, entity/state ownership, audit verdicts.

| Chain node | subagent_model pin | Why |
|---|---|---|
| `zflow-engine mode=implement` | pro (GLM 5.3) | judgment-heavy GPUI generation |
| `zflow-engine mode=judge` | pro (GLM 5.3) | blind audit verdicts need depth |
| `zflow-engine mode=vision` | flash (GLM 5.3 Flash) | native PNG reading + measured hex/px deltas |
| AX structural checks | pro judge audits the .txt via `evidence=` (flash vision node captures, desktop lane) | ocu AX text is tier-blind |
| Committer | inside implement run | verifiable via `git log` |

The launcher pins `subagent_model` to the matching tier; the engine's
`tier` arg is a behavior switch only. Pro is image-blind — pixel judgment
happens only in the flash vision node or a batched escalation.

## Chain blueprint

One saved workflow (`zflow-engine`), one launch per node via CreateWorkflow
(validated args; completion notifications carry the typed return). Fix
rounds re-enter via AmendWorkflow (reuses finished work); stopped runs
continue via ResumeWorkflowRun. Never nest — no run spawns another.

1. **Route (coordinator)**: slice into areas — fine-grained by decree: one
   entity family, one component, or one screen region per area; split any
   slice over ~4 files or mixing kinds. Per area: kind, paths,
   excludedPaths, skills (absolute SKILL.md paths), gates (non-mutating,
   existing repo tooling, right manifest dir — e.g. `cargo fmt --check`,
   `clippy -- -D warnings`), complexity, dependsOn, hasUI (design/styling
   and render areas with visible output).
2. **Implement node** (`mode=implement`, tier=pro): one
   `implementer-<area>` per area, routing-map order, dependencies chained
   per item. The script runs the gates itself (world.run exit codes) —
   implementers never run gates or git; no pass/fail claim is trusted.
   The Committer drafts and the script commits: one logical unit per
   area, explicit paths; the coordinator gitignores `.zflow/` on round 1.
3. **Vision node** (`mode=vision`, tier=flash), per has-UI area: a
   capture agent saves the ocu AX snapshot (`<area>-r<n>-ax.txt`) and
   decoded pixel PNG under `.zflow/evidence/`; the flash auditor reads
   them natively and reports measured differences (px offsets, hex
   deltas, font-size deltas, missing/extra elements) against the task +
   gpui-kit design guides. **Lane caveat:** pin `lane: "desktop"` per
   area (AreaSpec; the engine's URL-regex web-vs-desktop guess applies
   only when it is absent). Check each area's `lane` ("web" | "desktop")
   in the vision typed return: a GPUI area on the web lane was NOT
   audited (mark not-covered, say so). A run-level whole-UI pass =
   relaunch vision once with all evidence paths in `evidence`.
4. **Judge node** (`mode=judge`, tier=pro): fresh blind
   `judge-<area>-r<round>` per area — fresh auditors never judge fixes
   they inspired. It judges code plus the `evidence` paths you pass (AX
   structural checks ride this lane — the .txt is tier-blind text; PNG
   pixels are image-blind on pro); its own findings are confirmed by
   separate confirmers. Vision findings have NO confirmer — the judge
   never sees their content: pass them as advisory in the next implement
   run's `findings` arg (never fix targets); re-shoot verifies.
5. **POLICY loop** — exit conditions live in code inside each run and in
   the coordinator between runs; models cannot misjudge them:
   - **exit clean**: every area complete + all gates green + zero open
     judge-verified findings, and every vision finding either fixed and
     re-shot clean or explicitly deferred to the user in the report.
   - **stop honestly**: two consecutive rounds without findings/failing
     gates strictly shrinking, or `maxRounds` (default 3) reached —
     report what passes, what fails, a diagnosis.
   - **continue**: findings strictly shrinking → fix round REUSES the same
     `implementer-<area>` agents (long-lived context), then gates →
     vision re-shoot (same checklist) → `fix:` commit → fresh judge.
   - Launch failures are findings, not hangs; record pre-existing red
     gates as baseline, don't burn fix rounds on them.

## Fallback lanes

- **Mid-run eyes in a pro run** (a judge re-examining pixel detail): the
  escalation bridge, batched — ONE escalation per area carrying ALL its
  screenshots; only the blocked subagent parks while the main agent
  resolves it (a flash Agent-tool subagent) and feeds the answer back; cap
  3 per ask, budgeted by area.
- **Interactive desktop lane**: the official computer-use plugin, main
  thread only (session-bound host bridge; cannot run inside workflows).
  Hands-on app driving the CLI cannot express; never a flow step. If ocu
  or the launch fails, mark vision degraded for that area and say so —
  never invent substitutes.

## Preserved conventions

- Never claim clean while a gate is red. Never claim a screen verified
  that was not shot and audited this run. Unverified stays unverified —
  tiers you could only request are reported as such, never "used".
- Small commits keep findings cheap to revert; never `--no-verify`; never
  `git add -A`; match `git log --oneline -10` style (else `feat:`/`fix:`);
  never push unless asked. Half-done work stays on disk and is listed in
  the final report with evidence paths.
- Skills are dynamic: match by capability against the session's
  available-skills list; a gap is noted, not a blocker.
- Skill menu by area kind: state/entities, render/views, actions/focus,
  app-wiring → gpui-kit + rust-best-practices; design/styling →
  gpui-kit-design-guides (normative — follow its referenced guides) + the
  same pair; tests → gpui-kit (test reference primary) + rust-testing. A
  skill page is the door, not the room.

## Final report (coordinator)

From the judge node's typed return + evidence paths: rounds spent, gate
status (mechanical/audit/vision), findings fixed vs deferred, key paths,
degraded or skipped vision stated plainly, items left for the user.
