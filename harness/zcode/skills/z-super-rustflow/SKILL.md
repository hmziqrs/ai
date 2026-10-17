---
name: z-super-rustflow
description: >-
  Thin chain-coordinator skill for Rust super-optimization campaigns over the
  Rust performance and soundness skill suite (rust-superopt, rust-simd-crates,
  rust-simd-kernels, rust-parallel-cache, rust-fast-architecture, plus
  session-installed rust-string-perf, rust-succinct-structures,
  rust-service-comms, rust-embedded-storage, rust-async-patterns,
  rust-best-practices, and rust-testing): a read-only research phase (explorer,
  researcher, auditor) that is the DEFAULT and makes zero edits, plus an
  opt-in implement phase with a converge-until-auditors-go-silent audit-fix
  loop. Pro personas only, loaded through persona-kit v4, with no vision or
  flash agents. Trigger phrases: super rustflow, z-super-rustflow, rustflow
  campaign, superopt workflow, super-optimization workflow, optimization
  orchestration, superopt sub-agents, optimize-until-clean, audit this crate
  for performance, research optimization opportunities. Does NOT fire on
  single-shot "why is this slow" / "make this loop faster" — that is
  rust-superopt routing; this page is the multi-agent campaign. Implement runs
  ONLY on explicit user opt-in ("also implement", "research and implement",
  "do the implementation of what we found").
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

| Chain node | Persona & access | Responsibility |
|---|---|---|
| Routing, release hygiene, profiling, benchmark/variance harness, sorting, type-size/container layout | `z-rust-perf-engineer`, `read-only` in Phase R / `write` in Phase I | Step 0 release-profile check, criterion/cold-state baseline, variance budget, Amdahl triage, lever selection, PGO/BOLT |
| Allocation rate, string representation, succinct sets, cache layout, RSS/allocator, zero-copy buffers | `z-rust-memory-engineer`, `read-only` in Phase R / `write` in Phase I | DHAT/allocation census, `Box<str>`/`Arc<str>`/`Cow`/SSO/interning, roaring/Elias-Fano/MPHF/ART, `CachePadded`, `bytes::Bytes` / `rkyv` / Arrow |
| SIMD crate adoption, autovectorization diagnosis, portable SIMD, arch intrinsics & runtime dispatch | `z-rust-simd-engineer`, `read-only` in Phase R / `write` in Phase I | Lever 1 crate swap, `cargo asm` / `-C remark=loop-vectorize`, `as_chunks` / `algebraic_*`, `pulp`/`fearless_simd`/`rten-simd`/`wide`, `core::arch` + runtime detection |
| Lock contention, single-writer sharding, group commit, Tokio/LocalSet, channels, HTTP/gRPC wire stack | `z-rust-async-engineer` (or `z-axum-engineer` for Axum HTTP routes/layers), `read-only` in Phase R / `write` in Phase I | Contention math (`1 / critical_section`), `LocalSet`/`compio`/Tokio tuning, lock downgrade, write-behind group commit, channel/map choice, `h2`/`tonic`/`prost` wire paths |
| Embedded storage engine, per-write sync rungs, mmap vs pwrite, LSM fanout/bloom tuning | `z-rust-perf-engineer` or `z-database-migration-engineer`, `read-only` in Phase R / `write` in Phase I | `heed`/LMDB vs `fjall` vs `redb` vs `rusqlite`, `PersistMode`/`Durability`/WAL sync barriers, LSM read/write amplification |
| General safe Rust refactoring, trait/generic dispatch (`cargo llvm-lines`), error paths | `z-rust-engineer`, `read-only` in Phase R / `write` in Phase I | Thin generic wrapper + non-generic inner fn, error/API preservation |
| Per-round performance & parity audit | Fresh read-only domain persona (`auditor-<area>-r<round>`) matching the area's lever | Blind review against the 4-part `rust-superopt` "done" rubric and novel-finding hunt |
| Unsafe, FFI, pointer provenance, `#[target_feature]`, `repr(packed)`, or custom allocator audit | Fresh `z-unsafe-ffi-auditor`, `read-only` (`shipflow-security-audit` only when broader service/auth trust boundaries also change) | Concrete invariant trace across every new or touched `unsafe`, intrinsic, unaligned, or FFI boundary |
| Gates, `git status --porcelain -z`, `numstat`, and bench compare | None — script-run (`world.run`) | Mechanical exit codes and baseline comparisons |

Every composed script pastes the complete current block from
`harness/zcode/skills/z-workflow/persona-kit.dwf.ts` (`// persona-kit:start v4`
to `// persona-kit:end v4`) unchanged and runs `z-workflow`'s persona-kit drift
check before launch. Resolve each agent file to an absolute path, then use
`loadPersona` with `tier: "pro"` and explicit `access`, followed by
`personaAgent(p, uniqueName, RUN_RULES)`; never paste persona text by hand.
Phase R, judges, confirmers, and auditors use `access: "read-only"`; only
Phase I implementers use `access: "write"`. Wrap every read-only ask in
`guardWrites(p, worktree, () => ...)` while no writer uses that worktree,
include `personaFindings` and `personaReport()` in the report, and list persona
paths, sha256 hashes, selected models, and access before launch. When `unsafe`,
FFI, aliasing, `#[target_feature]`, `repr(packed)`, or memory-safety invariants
change, add a fresh read-only `z-unsafe-ffi-auditor` ask; never reuse the
implementer as auditor.

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
   `z-rust-simd-engineer`, `z-rust-async-engineer`, `z-rust-perf-engineer`,
   or `z-rust-engineer` by the confirmed lever; `z-rust-perf-engineer` owns
   benchmark and target decisions. `implementer-<area>` works confirmed
   findings in ladder order (crate swap → fix autovec → cut allocation rate
   and shrink types → parallelize → cache/affinity → hand SIMD →
   architecture/storage/wire), re-benchmarks after each lever, and stops the
   moment the Phase R target is met — a satisfied target is a finished
   optimization. The script runs gates, `git status --porcelain -z` purity
   checks (parsed per NUL entry without trimming the whole output first), and
   `cargo bench -- --baseline main` itself; implementers never run gates or
   git, and no pass/fail claim is trusted. Discovered tasks return to the
   coordinator with `parent`, `kind`, `scope`, `dependencies`, and `evidence`.
   The script also runs a `numstat` size check after every round: a round
   whose delta exceeds the area's budget is a red round with reason `size` —
   shrink it or report the split needed; two consecutive size-reds stop the
   area. A Committer role drafts the message and the script commits each green
   round separately, `perf:` style matching `git log --oneline -10` — never
   one commit folding several rounds' work.
4. **Phase I audit run**: fresh blind `auditor-<area>-r<round>` per area —
   fresh auditors never judge fixes they inspired, and any new or changed
   `unsafe`, `#[target_feature]`, `repr(packed)`, raw-pointer, or FFI boundary
   also gets a fresh read-only `z-unsafe-ffi-auditor`. Two jobs: score this
   round's fixes against the `rust-superopt` "done" rubric — parity story,
   codegen check (`cargo-show-asm` evidence path; every runtime-dispatch
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

Resolve required skills from the session's available-skills index before launching each node and carry their absolute `SKILL.md` paths in `area.skills`. Load only the skills and reference files that match the area's measured bucket and rung:

- **Triage, release hygiene, benchmark/variance harness, sorting, type/container layout, and PGO/BOLT** → `rust-superopt` (`SKILL.md`, `references/measurement.md`, `references/codegen-tooling.md`, and `references/release-flags.md` when available).
- **Lever 1 — SIMD-accelerated crate swaps** (JSON, byte/multi-pattern search, UTF-8, crypto/non-crypto hashing, CRC, compression `flate2`+`zlib-rs`, base64/hex/escaping, FFT, linear algebra `faer`, codecs) → `rust-simd-crates` (`references/crates-text-parsing.md`, `references/crates-numeric-media.md`, `references/json-migration.md`).
- **Lever 2 & 6 — Autovectorization diagnosis and hand-written SIMD kernels** (`cargo asm`, `-C remark=loop-vectorize`, `slice::as_chunks`, `assert_unchecked`, Rust 1.98+ `algebraic_*`, portable SIMD `pulp`/`fearless_simd`/`rten-simd`/`wide`, `core::arch` + safe `#[target_feature]` + runtime dispatch) → `rust-simd-kernels` (`references/autovectorization.md`, `references/portable-simd.md`, `references/intrinsics.md`, `references/stability-matrix.md`, plus `references/hardware-costs.md` and `references/audio-dsp.md` when available).
- **Lever 3a — String handle layout, allocation census, `Box<str>` / `Arc<str>` / `Cow<str>` / SSO (`CompactString`, `SmolStr`, `EcoString`) / interning (`lasso`, `ustr`), and case conversion** → `rust-string-perf` (`references/string-types.md`) when available in the session, paired with `rust-superopt`.
- **Lever 3b — Compact/succinct integer sets and frozen lookups** (roaring ~6% density crossover, plain bitsets, `sucds` Elias-Fano, `phf`/`ph` MPHFs, `vers-vecs` rank/select, `artmap` adaptive radix tries, Morton/Hilbert keys) → `rust-succinct-structures` (`references/bitmaps-rank-select.md`, `references/ef-mphf-tries.md`) when available in the session.
- **Lever 4 & 5 — Rayon pools, work-stealing vs pinned shards, false sharing (128 B / `CachePadded`), cache tiling & set-aliasing, NUMA first-touch, Apple Silicon QoS steering, concurrent maps (`papaya`/`scc`/`dashmap`) + hasher choice (`ahash`/`foldhash`), channels (`crossbeam`/`kanal`/`flume`), eviction (SIEVE/W-TinyLFU), and allocator/RSS/THP tuning (`jemalloc`/`mimalloc`)** → `rust-parallel-cache` (`references/topology.md`, `references/numa-pinning.md`, `references/false-sharing.md`, plus `references/cache-eviction-allocators.md`, `references/concurrent-maps-lockfree.md`, `references/channels.md` when available).
- **Lever 7a — Service contention math, single-writer actors (`LocalSet`/`LocalRuntime`), early lock downgrade, write-behind group commit, adaptive linger, pooling, Tokio coop/wakeup/cancellation tuning, embedded zero-copy (`rkyv`, Arrow, `capnp`, `postcard`), runtime specialization (AOT/Cranelift/lazy DFA), and deterministic simulation testing** → `rust-fast-architecture` (`references/spacetimedb-case-study.md`, plus `references/production-case-studies.md` when available).
- **Lever 7b — HTTP/1.1 vs `h2` (>= 0.4.16) vs `h3`, client connection pools, `tonic` multi-connection scaling & `prost` `Bytes` decode, wire formats (`prost`, `rust-protobuf`, `ciborium`, `minicbor`, `rmp-serde`), `bytes::Bytes` `split_to(n).freeze()` discipline, and `matchit`/Tower middleware costs** → `rust-service-comms` (`references/http-transport.md`, `references/rpc-grpc.md`, `references/wire-formats.md`) when available; add `axum-web-framework` and `axum-code-review` when modifying Axum routers/extractors/layers.
- **Lever 7c — Durable local state** (`heed`/LMDB vs `fjall` vs `redb` vs `rusqlite`; per-write `PersistMode`/`Durability`/WAL sync points; mmap vs pwrite; LSM fanout and bloom hash-sharing) → `rust-embedded-storage` (`references/lsm-tuning.md`, `references/durability-fsync.md`) when available.
- **Async lifecycle & cancellation correctness** → `rust-async-patterns` (`references/details.md`).
- **Code, safety, and parity-test hygiene inside Phase I edits** → `rust-best-practices` (`references/chapter_01.md`–`chapter_09.md`), `rust-testing`, `code-comments`, and `test-quality-tdd-agents` (for property-based parity or characterization tests).

A skill page is the door, not the room: read the specific `references/*.md` file that owns the lever before designing or auditing a change.

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
