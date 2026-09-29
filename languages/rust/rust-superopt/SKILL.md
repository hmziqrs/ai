---
name: rust-superopt
description: Entry point whenever the user wants Rust faster and the right lever isn't obvious — use when they say "make this Rust loop faster", "why is this Rust code slow", "optimize this crate/service", "superoptimize this", "improve throughput/latency", "set up PGO/BOLT/benchmarking", or "profile this Rust binary". Benchmarks first, triages compute vs memory vs lock vs IO (Amdahl), owns measurement discipline, release-profile hygiene, and codegen-inspection/PGO/BOLT tooling, then routes to the matching sub-skill. Does NOT fire on the sub-skills' specific phrases — crate swaps ("use simd_json instead of serde", "which SIMD crate"), vectorization diagnosis ("why didn't my loop vectorize"), thread pinning/cache mechanics ("false sharing", "NUMA", "my rayon pool is slow"), or service architecture ("thread-per-core", "sharded design") route straight to rust-simd-crates / rust-simd-kernels / rust-parallel-cache / rust-fast-architecture.
---

# Rust Super-Optimization — Triage, Measurement, Routing

This is the router for "make it faster" requests plus the owner of everything
that must be true regardless of which lever wins: a trustworthy baseline,
release-profile hygiene, and honest measurement. Do four things, in order:

1. **Verify the build is even worth measuring** (Step 0 — release hygiene).
2. **Benchmark to get a baseline and define the target** (Step 1).
3. **Triage where the time actually goes** — compute, memory, lock, or IO
   (Step 2). Amdahl caps the whole exercise: an 8× faster kernel that is 10%
   of runtime is a ~1.1× overall win.
4. **Route to the sub-skill that owns the lever** (Steps 3–4), or apply the
   whole-binary tooling this skill owns directly (PGO, BOLT).

## Step 0 — Release-profile hygiene (before any measurement)

Never optimize or benchmark a debug build. Facts to check first:

- Cargo's release profile defaults to `opt-level = 3`, and LLVM only
  vectorizes at opt-level 2 and 3 — measured on rustc 1.98.1/LLVM 22: vector
  instructions present at 2/3, **zero** at 0/1. Plain `cargo build --release`
  already tries; if someone benchmarks `cargo run` without `--release`, the
  conversation ends there.
- `opt-level = "z"` kills inlining (simdutf8 documents this explicitly) —
  never size-optimize a hot path you are trying to speed up.
- SIMD-heavy crates crawl in dev profiles: zune-jpeg's intrinsics perform
  poorly in debug builds; set `opt-level = 3` for that package in dev/test
  profiles when benchmarking through them.
- A known-fast production reference point: SpacetimeDB's release profile is
  `opt-level 3`, thin LTO, `codegen-units 16`, `overflow-checks false`.
  (Their ~300k TPS figure is vendor-published, not independently
  reproduced.) For microbenchmark A/B comparisons, additionally pin
  `codegen-units = 1` and `lto` in `[profile.bench]` so codegen differences
  don't masquerade as algorithm differences — but ship what you verified at
  your real profile.
- `-C target-cpu=native` targets the host: fine for local experiments,
  **non-distributable** — binaries "almost certainly crash" on other
  machines (zlib-rs README wording). `-C target-cpu=x86-64-v2/v3/v4` is the
  shippable middle ground when you know your CPU floor.
- Project-wide flags belong in `.cargo/config.toml`
  (`build.rustflags` / `target.'cfg(target_arch)'.rustflags`), not in
  per-command invocations that teammates won't repeat.

## Step 1 — Benchmark before touching code

- Write a criterion benchmark for the current implementation and record the
  number. The current (scalar) implementation stays in the codebase forever
  as the correctness oracle. Skeleton and hygiene rules:
  `references/measurement.md`.
- Define the target up front ("2× on the parse path", "p99 < 10 ms") and
  **stop the moment you hit it**. Every further rung of the ladder costs
  maintainability; a satisfied target is a finished optimization.
- Treat changes inside criterion's noise band as no change. Save and compare
  against baselines (`cargo bench -- --save-baseline main`, then
  `--baseline main`).

## Step 2 — Triage: compute vs memory vs lock vs IO

Amdahl first: the overall speedup is capped by the fraction of time you do
*not* improve. Pick the bucket from evidence, not vibes:

| Evidence | Bucket | Lever lives in |
|---|---|---|
| Hot loop, high IPC, few cache misses, flat under `--threads` variation | **Compute** (instruction throughput) | rust-simd-crates (swap an accelerated crate) or rust-simd-kernels (autovec / hand SIMD) |
| Time per element grows with input size; speedup collapses once working sets exceed L2; high `cache-misses` | **Memory** (bandwidth/latency) | rust-parallel-cache (layout, blocking/tiling, SoA, prefetch) |
| Threads idle while one runs; throughput stops scaling with cores; time spent in `Mutex`/atomics/syscall wait | **Lock/contention** | rust-fast-architecture (single-writer, sharding, lock downgrade) — mechanics like false-sharing padding are rust-parallel-cache |
| Latency dominated by syscalls, network, fsync; CPU mostly idle | **IO** | rust-fast-architecture (group commit, write-behind, batching) |

How to get the evidence, per OS (full tool transcripts in
`references/measurement.md`):

- **Linux**: `perf stat -e cache-references,cache-misses` for the memory
  bucket; `perf` sampling / flame graphs for compute hotspots; `perf c2c`
  for false sharing.
- **macOS**: Instruments **CPU Counters** template via
  `xcrun xctrace record` (works on Apple Silicon; the old `instruments` CLI
  is gone), or `mperf` (root-only) / `darwin-kperf` for PMU counters.
- **Any OS**: Tracy for frame/span-level timelines (SpacetimeDB's production
  stack is Tracy + Prometheus + jemalloc pprof). For a cache model, use
  `valgrind --tool=cachegrind` — with its honesty caveat: it models
  "an AMD Athlon circa 2002".

One caution before assuming the lever: SpacetimeDB reaches ~300k TPS
(vendor) on one machine with **no SIMD and no io_uring anywhere in the
codebase** — their grep-verified one SIMD decision is a comment *deferring*
`varint-simd`. The ceiling is often architectural, not instructional. Their
contention math: a ~3 µs critical section admits ~300,000 TPS on a hot key;
a ~1 ms distributed critical section admits ~1,000 TPS — the single-threaded
solution is "300x more scalable". If the profile says lock or IO, more
instructions per clock is not the answer.

## Step 3 — The lever ladder (try in order, re-benchmark after each)

Cheapest and least invasive first; stop as soon as the target from Step 1
is met.

| # | Lever | Route to | Why here |
|---|---|---|---|
| 1 | **Swap an accelerated crate** — memchr, simd-json, blake3, flate2+zlib-rs, crc32fast, RustCrypto aes, httparse already in your tree | `rust-simd-crates` | A dependency-line change beats a kernel rewrite; the mainstream 2026 crates are runtime-dispatched and stable-Rust — with exceptions: sonic-rs silently falls back to scalar without `-C target-cpu=native`, xxhash-rust/glam/wide are compile-time, jiter is compile-time at baseline width. rust-simd-crates owns that list |
| 2 | **Fix autovectorization** — loop shape, provable bounds/alignment, `chunks_exact`, `algebraic_add` (stable since Rust 1.98) for float reductions | `rust-simd-kernels` | Zero new dependencies; verify with cargo-show-asm, don't assume |
| 3 | **Parallelize** — rayon `par_iter` across independent items | `rust-parallel-cache` | Multiplies whole-runtime throughput when the work is actually independent |
| 4 | **Cache & affinity** — layout, 128 B padding / `CachePadded`, blocking, pinning, NUMA first-touch | `rust-parallel-cache` | The measured multipliers: ~14–18× for eliminating false sharing (ratio stable across sessions; absolute ns/op is not) |
| 5 | **Hand-written SIMD** — portable crates (pulp / fearless_simd / wide) then arch intrinsics + runtime dispatch | `rust-simd-kernels` | Last resort for compute the compiler can't already do; verification mandatory |
| 6 | **Architectural change** — sharding, single-writer, group commit, colocate compute with data | `rust-fast-architecture` | The SpacetimeDB/TigerBeetle class of win; biggest blast radius |

Whole-binary levers that no sub-skill owns — apply them from here:

- **PGO** (profile-guided optimization): stable and practical via cargo-pgo
  — `cargo pgo build`, run a representative workload, `cargo pgo optimize`.
  Needs a matching `llvm-profdata`. Flag canon and gotchas:
  `references/codegen-tooling.md`.
- **BOLT**: ~2–5% cycles on rustc/LLVM builds on top of LTO/PGO (as
  measured by the rustc project), requires `-Wl,-q` at link, and is
  Linux-only by design — from a Mac, run it in Docker/Linux CI.

## Step 4 — Routing table

Route the moment the user's phrasing (or your triage) matches a sub-skill's
specialty; do not answer those questions here:

| User says / finding is | Go to |
|---|---|
| "use simd_json instead of serde", "is there a crate that does X with AVX2/NEON", "which SIMD crate", "why is my serde_json/regex path slow" | **rust-simd-crates** |
| "why didn't this vectorize", "hand-write an AVX2/NEON/AVX-512 kernel", "multiversion this", "port these C intrinsics", "is AVX-512/SVE/AMX stable" | **rust-simd-kernels** |
| "parallelize with rayon", "false sharing", "NUMA/first-touch", "pin these threads", "cache-friendly layout/blocking", "keep this off the E-cores", "my rayon pool is slow" | **rust-parallel-cache** |
| "thread-per-core", "share-nothing/sharded design", "single-writer vs MVCC", "reduce lock contention", "group commit", "how does SpacetimeDB/TigerBeetle go so fast", "glommio vs monoio vs compio vs tokio" | **rust-fast-architecture** |
| "set up PGO/BOLT", "benchmark this properly", "profile this binary", generic make-it-faster with no obvious lever | **stay here** |

## What "done" looks like

Every optimization that leaves this skill must have all four:

1. **A parity story** — the optimized path agrees with the oracle
   (lengths not divisible by lane counts; float tolerance vs integer
   equality; NaN/edge values). Details: `references/measurement.md`.
2. **A codegen check** — the instructions you promised actually appear in
   the shipping binary (`cargo asm`), not just in a benchmark build. A
   "SIMD" function that calls scalar libm is a common silent failure; if
   using runtime dispatch, check each variant, not just the entry point.
3. **A regression gate** — a CI check so the win survives refactors:
   instruction counts (iai-callgrind) or median-of-N wall-clock thresholds
   (SpacetimeDB gates median-of-31 index-scan reducers at ≤100 µs), plus a
   vectorization regression grep over cargo-show-asm output ("if something
   vectorizes today that doesn't necessarily mean it still will in a year
   from now" — Shnatsel; asm is the reliable vehicle — remark output can be
   silently empty via cargo's emit path, see
   `references/codegen-tooling.md`).
4. **An honest number** — the improvement ratio against the recorded
   baseline, on release builds, outside the noise band.

## Reference files

- **references/measurement.md** — criterion hygiene (release-only, cache-
  regime-sized inputs, saved baselines, the false-sharing benchmark's
  lessons: ratios not absolutes, the straddle hazard, verified sums), parity
  tests vs the scalar oracle, per-OS profiling (perf / Instruments CPU
  Counters / mperf / darwin-kperf / Tracy / cachegrind), iai-callgrind
  instruction counts, CI perf gates and Little's-law validation, the
  cargo-pgo measurement loop.
- **references/codegen-tooling.md** — cargo-show-asm and cargo-remark
  transcripts and gotchas, `-C remark` filtering, hand-driving rustc
  gotchas, llvm-mca on macOS (Homebrew keg-only LLVM) and what mca does not
  model, llvm-bolt (Linux-only, Docker route), the PGO/BOLT flag canon
  (Kobzol), and superoptimizer status: Souper/STOKE dormant, egg/egglog/
  Herbie active.
