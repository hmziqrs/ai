---
name: z-super-rustflow
description: >-
  Thin chain-coordinator skill for Rust super-optimization campaigns over the
  custom rust skill family (rust-superopt, rust-simd-kernels,
  rust-parallel-cache, rust-fast-architecture, rust-async-patterns,
  rust-best-practices, rust-testing): a read-only research phase (explorer,
  researcher, auditor) that is the DEFAULT and makes zero edits, plus an
  opt-in implement phase with a converge-until-auditors-go-silent audit-fix
  loop. Pure main-tier — no vision node, no flash agents, anywhere. Trigger
  phrases: super rustflow, z-super-rustflow, rustflow campaign, superopt
  workflow, super-optimization workflow, optimization orchestration,
  superopt sub-agents, optimize-until-clean, audit this crate for
  performance, research optimization opportunities. Does NOT fire
  on single-shot "why is this slow" / "make this loop faster" — that is
  rust-superopt routing; this page is the multi-agent campaign. Implement
  runs ONLY on explicit user opt-in ("also implement", "research and
  implement", "do the implementation of what we found").
---

# z-super-rustflow

**The main agent is a chain coordinator, not an implementer or researcher.**
It slices the optimization surface into areas, launches main-tier workflow
runs as chain nodes, and writes the final report; between runs it holds ONLY
compact control data — typed returns, the findings registry (fingerprinted,
deduped), evidence paths, baseline numbers, round count, commit shas.
Single-lever questions ("why didn't this vectorize") don't need this skill —
rust-superopt routes those. Sibling flows (z-workflow, z-proflow,
z-flashflow, z-liteflow, z-gpui-workflow, z-tauri-workflow) run under their
own rules — never cross-apply; hand off via finish-and-relaunch.

## Phase gate — research by default, implement only on explicit ask

Two phases, hard-gated, never mixed in one round:

- **Phase R — research (default, strictly read-only)**: explorer,
  researcher, and auditor nodes. Produces the findings dossier:
  release-hygiene verdict, triage evidence per bucket, Amdahl-ranked
  findings (each with owner skill, lever, risk, expected win), a
  measurement plan, and the stop-at-target definition. ZERO repo edits —
  no benchmark files, no profile tweaks; instrumentation is Phase I work.
  The campaign ENDS here unless the user opted in.
- **Phase I — implement (opt-in ONLY)**: runs when the user said so in the
  original ask ("research AND implement", "also do the implementation of
  what we find") or explicitly later ("now implement the findings").
  Never inferred from the richness of the dossier. A later Phase I
  consumes the Phase R dossier: confirmed findings ride the fix-target
  lane, unconfirmed ones travel as labelled context only.

Round 0 of Phase I is instrumentation, not optimization: criterion
benchmark + parity oracle + recorded baseline
(`cargo bench -- --save-baseline main`) + regression gate, committed
before the first optimization edit. The scalar implementation stays in
the tree forever as the correctness oracle.

## Tier philosophy — main-tier only, no vision

No flash anywhere, no image reading anywhere, no escalation bridge.
Optimization evidence is text — asm dumps, criterion JSON, perf/xctrace
reports — tier-blind by nature. Gates and benchmark comparisons are run by
the script (world.run exit codes), never by an agent, so no cheap-tier
gate-runner exists to want. If something seems to need eyes, it doesn't:
text evidence covers it, or it is marked not-covered and said so.

| Chain node | model | Why |
|---|---|---|
| explorer / researcher (Phase R) | main-tier (session model, never pinned to flash) | triage and lever ranking are judgment |
| confirmers (Phase R) | main-tier | finding verification needs depth |
| implementer (Phase I) | main-tier | judgment-heavy codegen |
| auditor (both phases) | main-tier, fresh each round | blind audit verdicts need depth |
| gates + bench compare | nobody — script-run | mechanical, exit codes |

## Chain blueprint

Node runs are composed inline from this blueprint via CreateWorkflow
(compilation validates them); fix rounds re-enter via AmendWorkflow
(reuses finished work), stopped runs continue via ResumeWorkflowRun. Never
nest — no run spawns another. Once a campaign validates the composed
scripts, offer ONCE to save the engine as `rustflow-engine` for reuse
thereafter; saving is the user's call, never silent.

1. **Route (coordinator)**: slice the optimization surface — one hot-path
   family or one profiling bucket per area; split any slice over ~4 files
   or mixing kinds. Per area: bucket (compute|memory|lock|io, provisional
   — Phase R refines it), paths, excludedPaths, skills (absolute SKILL.md
   paths), gates (non-mutating: `cargo fmt --check`,
   `cargo clippy --all-targets -- -D warnings`, `--manifest-path` where
   the workspace needs it), complexity, dependsOn.
2. **Phase R run**: parallel explorers map code, deps, build profiles,
   existing benches (read-only); researchers triage per rust-superopt
   Step 2 evidence rules; fresh auditors per area hunt findings — perf
   opportunities AND correctness hazards in the making (missing parity,
   float tolerance, unshippable target-cpu); independent confirmers
   verify every finding. Release hygiene (rust-superopt Step 0) is
   checked FIRST — a debug-benchmarked or size-optimized hot path ends
   the campaign at that finding.
3. **Phase I implement run**: `implementer-<area>` works confirmed
   findings in ladder order (crate swap → fix autovec → parallelize →
   cache/affinity → hand SIMD → architecture), re-benchmark after each
   lever, stop the moment the Phase R target is met — a satisfied target
   is a finished optimization. The script runs gates +
   `cargo bench -- --baseline main` itself; implementers never run gates
   or git; no pass/fail claim is trusted. The Committer drafts and the
   script commits: one logical unit per area, `perf:` style matching
   `git log --oneline -10`.
4. **Phase I audit run**: fresh blind `auditor-<area>-r<round>` per area —
   fresh auditors never judge fixes they inspired. Two jobs: score this
   round's fixes against the rust-superopt "done" rubric — parity story,
   codegen check (cargo-show-asm evidence path; every runtime-dispatch
   variant, not just the entry point), regression gate, honest number
   (ratio vs baseline, outside the noise band) — missing any one keeps
   the finding open; AND hunt for NOVEL findings.
5. **Convergence loop** — the registry lives in the coordinator between
   runs; exit conditions live in code, models cannot misjudge them:
   - **exit clean**: a full audit round with zero NOVEL registry findings
     AND zero open confirmed findings AND gates green AND baselines held.
     Auditors going silent on new things is the finish line, not a round
     cap.
   - **continue**: any novel or open finding → fix round REUSES the same
     `implementer-<area>` agents (long-lived context) → gates → bench
     compare → `perf:` commit → fresh audit.
   - **stop honestly**: `maxRounds` (default 6 — an honesty valve against
     ping-pong, not a target) or two consecutive rounds with zero
     registry progress (same findings open, nothing novel) → report what
     passed, what's open, why.
   - Pre-existing red gates and pre-existing benchmark numbers are
     recorded as baseline, never burned as findings. Launch failures are
     findings, not hangs.

## Skill menu by bucket

- routing, measurement discipline, PGO/BOLT, cargo-show-asm tooling →
  rust-superopt (its references/measurement.md and
  references/codegen-tooling.md)
- compute / autovec repair / hand-written SIMD → rust-simd-kernels
- crate swaps (ladder lever 1) → rust-simd-crates — not installed; fall
  back to rust-superopt's lever-1 list; a gap is noted, not a blocker
- memory / rayon / false sharing / NUMA / cache layout →
  rust-parallel-cache
- lock + IO architecture / sharding / single-writer / group commit →
  rust-fast-architecture
- async runtime concerns → rust-async-patterns
- code hygiene inside edits → rust-best-practices; parity + regression
  tests → rust-testing

A skill page is the door, not the room.

## Preserved conventions

- Never claim a speedup without the recorded baseline; noise-band deltas
  are no-change. asm-or-it-didn't-happen.
- Never ship `-C target-cpu=native` — experiments only; the distributable
  floor is `-C target-cpu=x86-64-v2/v3/v4` when the CPU floor is known.
- Small `perf:` commits keep findings cheap to revert; never `--no-
  verify`, never `git add -A`, never push unless asked. Half-done work
  stays on disk, listed in the final report with evidence paths.
- Unverified stays unverified — checks you could only request are
  reported as such, never "used".
- Skills are dynamic: match by capability against the session's
  available-skills list; a gap is noted, not a blocker.

## Final report (coordinator)

Phase R: hygiene verdict, ranked findings with Amdahl math and owner
skills, measurement plan, stop-at-target definition, explicit note that
nothing was edited. Phase I (when run): rounds to convergence,
per-finding disposition (fixed-verified / open / deferred to the user),
honest numbers vs baseline, regression gates added, items left for the
user.
