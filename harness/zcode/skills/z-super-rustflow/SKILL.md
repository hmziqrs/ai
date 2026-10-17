---
name: z-super-rustflow
description: >-
  Thin chain-coordinator skill for Rust super-optimization campaigns over the
  custom rust skill family (rust-superopt, rust-simd-kernels,
  rust-parallel-cache, rust-fast-architecture, rust-async-patterns,
  rust-best-practices, rust-testing): a read-only research phase (explorer,
  researcher, auditor) that is the DEFAULT and makes zero edits, plus an
  opt-in implement phase with a converge-until-auditors-go-silent audit-fix
  loop. Pro personas only, with no vision or flash agents. Trigger
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
It slices the optimization surface into areas, launches pro-tier workflow
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

## Persona routing — pro-tier only, no vision

No flash anywhere, no image reading anywhere, no escalation bridge.
Optimization evidence is text — asm dumps, criterion JSON, perf/xctrace
reports — tier-blind by nature. Gates and benchmark comparisons are run by
the script (world.run exit codes), never by an agent, so no cheap-tier
gate-runner exists to want. Use each persona's declared model and thought
level; do not add a second model profile. If something seems to need eyes,
text evidence covers it, or it is marked not-covered and said so.

| Chain node | model | Why |
|---|---|---|
| routing, profiling, benchmark plan | `z-rust-perf-engineer`, read-only | baseline, noise, workload, lever selection |
| memory, SIMD, or async research | matching `z-rust-memory-engineer`, `z-rust-simd-engineer`, or `z-rust-async-engineer`, read-only | domain-specific evidence |
| Rust implementation | matching domain persona, write only in Phase I | scoped code changes |
| audit | fresh read-only domain persona each round; `shipflow-security-audit` when safety invariants change | blind review and invariant checks |
| gates + bench compare | nobody — script-run | mechanical, exit codes |

Every composed script pastes the complete current block from
`harness/zcode/skills/z-workflow/persona-kit.dwf.ts` unchanged. Resolve each
agent file to an absolute path, then use `loadPersona` with `tier: "pro"`
and explicit `access`, followed by `personaAgent`;
never paste persona text by hand. Phase R, judges, and auditors use
`access: "read-only"`; only Phase I implementers use `access: "write"`.
Use `guardWrites` for read-only asks, include persona findings and reports,
and list persona paths and hashes before launch. When unsafe, FFI, aliasing,
or memory-safety invariants change, add a fresh read-only audit of those
invariants; never reuse the implementer as auditor.

**Fresh-context rule — universal:** every node above is a fresh agent per task;
confirmers are fresh per finding. The single exception is `implementer-<area>`,
reused only within its own area's convergence loop — never across areas, never
across campaigns. Freshness is not an auditor-only discipline; it is the default
for every role, and reuse is the named exception, not the habit.

## Chain blueprint

Node runs are composed inline from this blueprint via CreateWorkflow
(compilation validates them); fix rounds re-enter via AmendWorkflow
(reuses finished work), stopped runs continue via ResumeWorkflowRun. Never
nest — no run spawns another. Once a campaign validates the composed
scripts, offer ONCE to save the engine as `rustflow-engine` for reuse
thereafter; saving is the user's call, never silent.

1. **Route (coordinator)**: slice the optimization surface — one hot-path
   family or one profiling bucket per area; split any slice over ~4 files,
   a predicted diff over the size budget (~400 changed lines / ~10 files —
   per-area `budget` tunes it), or mixing kinds. Per area: bucket (compute|memory|lock|io, provisional
   — Phase R refines it), paths, excludedPaths, skills (absolute SKILL.md
   paths), gates (non-mutating: `cargo fmt --check`,
   `cargo clippy --all-targets -- -D warnings`, `--manifest-path` where
   the workspace needs it), complexity, dependsOn. Record `baseSha`
   (`git rev-parse HEAD`) — the audit runs' size evidence is measured
   against it.
2. **Phase R run**: parallel read-only personas map code, dependencies,
   build profiles, and existing benches; `z-rust-perf-engineer` leads
   triage per rust-superopt
   Step 2 evidence rules; fresh auditors per area hunt findings — perf
   opportunities AND correctness hazards in the making (missing parity,
   float tolerance, unshippable target-cpu); independent confirmers
   verify every finding. Release hygiene (rust-superopt Step 0) is
   checked FIRST — a debug-benchmarked or size-optimized hot path ends
   the campaign at that finding.
3. **Phase I implement run**: choose `z-rust-memory-engineer`,
   `z-rust-simd-engineer`, `z-rust-async-engineer`, or `z-rust-engineer`
   by the confirmed lever; `z-rust-perf-engineer` owns benchmark and target
   decisions. `implementer-<area>` works confirmed
   findings in ladder order (crate swap → fix autovec → parallelize →
   cache/affinity → hand SIMD → architecture), re-benchmark after each
   lever, stop the moment the Phase R target is met — a satisfied target
   is a finished optimization. The script runs gates +
   `cargo bench -- --baseline main` itself; implementers never run gates
   or git; no pass/fail claim is trusted. The script also runs a numstat
   size check after every round: a round whose delta exceeds the area's
   budget is a red round with reason `size` — shrink it or report the
   split needed; two consecutive size-reds stop the area. A Committer role
   drafts the message and the script commits
   each green round separately, `perf:`
   style matching `git log --oneline -10` — never one commit folding
   several rounds' work.
4. **Phase I audit run**: fresh blind `auditor-<area>-r<round>` per area —
   fresh auditors never judge fixes they inspired. Two jobs: score this
   round's fixes against the rust-superopt "done" rubric — parity story,
   codegen check (cargo-show-asm evidence path; every runtime-dispatch
   variant, not just the entry point), regression gate, honest number
   (ratio vs baseline, outside the noise band) — missing any one keeps
   the finding open; AND hunt for NOVEL findings. Each audit ask carries
   the area's numstat vs `baseSha` as size evidence: an area over its
   budget is a HIGH finding regardless of correctness.
5. **Convergence loop** — the registry lives in the coordinator between
   runs; exit conditions live in code, models cannot misjudge them:
   - **exit clean**: a full audit round with zero NOVEL registry findings
     AND zero open confirmed findings AND gates green AND baselines held.
     Auditors going silent on new things is the finish line, not a round
     cap.
   - **continue**: any novel or open finding → fix round REUSES the same
     `implementer-<area>` agents (long-lived context) → gates → bench
     compare → `perf:` commit → fresh audit.
   - **stop honestly**: this flow's own composed-loop `maxRounds` cap
     (default 6) or two consecutive rounds with zero
     registry progress (same findings open, nothing novel) → report what
     passed, what's open, why.
   - Pre-existing red gates and pre-existing benchmark numbers are
     recorded as baseline, never burned as findings. Launch failures are
     findings, not hangs.

## Worktrees and checkout delivery

Phase R stays read-only: no worktrees, commits or checkout merges. At the start of an
opt-in Phase I, record the repository root, base commit and full destination branch ref.
Use z-workflow's safe Git rules and Step 6 delivery checks; its stage/commit cadence does
not replace this campaign's benchmark and per-green-round commit rules.

One writing area uses one run-owned worktree on `wf/<slug>`. Concurrent independent
areas use `wf/<slug>/<area>` worktrees and a run-owned `wf/<slug>/integration` worktree.
Carry those paths and branch identities across campaign nodes. Workers never edit the
user's checkout or run Git. Serialize script-owned Git mutations, check every exit code,
and integrate a completed clean lane only after its dependencies. Abort conflicts in the
run worktree without force; retain unresolved branches and worktrees.

Before checkout delivery, complete the whole campaign, integrate clean lanes and rerun
all required correctness, parity and benchmark gates on the combined result. Every
remaining finding, including unconfirmed or deferred findings, blocks automatic delivery.
The coordinator then follows z-workflow Step 6: same captured destination branch and base
HEAD, clean checkout, fast-forward only, and all task gates again in the checkout. Low or
medium risk may deliver without another prompt; high risk or review-first requires
approval. An explicit no-merge request, disabled committing, an incomplete campaign or
research-only work never auto-merges. A failed post-merge gate is reported without a reset.

## Skill menu by bucket

- routing, measurement discipline, PGO/BOLT, cargo-show-asm tooling →
  rust-superopt (its references/measurement.md and
  references/codegen-tooling.md)
- compute / autovec repair / hand-written SIMD → rust-simd-kernels
- crate swaps (ladder lever 1) → rust-simd-crates; resolve the installed
  path and report missing required coverage before that assignment
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
- Small `perf:` commits keep findings cheap to revert — one logical unit
  = one revertable review, ≤400 changed lines / ≤10 files (the size
  budget; per-area `budget` tunes it); one commit per green round, never
  one area-folding commit; an area over budget is split, not committed
  big. Never `--no-verify`, never `git add -A`, never push unless asked.
  Half-done work stays on disk, listed in the final report with evidence
  paths.
- AGENTS.md binds every subagent: every composed agent ask carries the
  AGENTS.md read-first line — its hard rules bind the task, and every
  skill it requires is read and followed on top of the bucket's skill
  menu.
- Unverified stays unverified — checks you could only request are
  reported as such, never "used".
- Skills are dynamic: match by capability against the session's
  available-skills list; a gap is noted, not a blocker.

## Final report (coordinator)

Phase R: hygiene verdict, ranked findings with Amdahl math and owner
skills, measurement plan, stop-at-target definition, explicit note that
nothing was edited. Phase I (when run): rounds to convergence,
per-finding disposition (fixed-verified / open / deferred to the user),
honest numbers vs baseline, regression gates added, retained branches/worktrees,
checkout delivery outcome with old/new HEAD and gates, and items left for the user.
