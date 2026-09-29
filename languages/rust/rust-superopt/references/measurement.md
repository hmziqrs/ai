# Measurement — benchmarks, parity tests, profilers, CI gates

The verification backbone for every optimization this skill family makes.
Every rung of every ladder ends with the same two questions: *is it
faster?* and *is it still correct?* Both need machinery written once, up
front. (This file supersedes the old rust-simd-superopt
`references/verification.md`; content ported and corrected against the
2026-09 research report.)

## Criterion benchmark skeleton

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "kernel"
harness = false

[profile.bench]
# inherits release; pin these for stable A/B comparisons
lto = "thin"
codegen-units = 1
```

```rust
// benches/kernel.rs
use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};

fn bench(c: &mut Criterion) {
    let mut group = c.benchmark_group("kernel");
    for size in [64usize, 4096, 1 << 20] {
        let data = make_input(size);
        group.bench_with_input(BenchmarkId::new("scalar", size), &data,
            |b, d| b.iter(|| kernel_scalar(d)));
        group.bench_with_input(BenchmarkId::new("simd", size), &data,
            |b, d| b.iter(|| kernel_simd(d)));
    }
    group.finish();
}
criterion_group!(benches, bench);
criterion_main!(benches);
```

## Benchmark hygiene — violations produce phantom "8× wins" that evaporate

- **Release only.** Never trust debug-mode relative numbers: LLVM
  vectorizes at opt-level 2 and 3 only (measured on rustc 1.98.1/LLVM 22 —
  zero vector instructions at 0/1), and `opt-level = "z"` kills inlining
  (simdutf8 documents this). SIMD-heavy crates like zune-jpeg specifically
  warn their intrinsics perform poorly in debug builds — give such packages
  `opt-level = 3` in the dev/bench profile.
- **Size the input across cache regimes.** Include sizes *below*, *at*, and
  *far above* L2 (e.g. 4 KiB, 64 KiB, 4 MiB — know your L2; an M3 Max has
  16 MiB shared per 6 P-cores, 4 MiB for the 4 E-cores). SIMD speedups often
  exist only in the L1/L2 regime and vanish on DRAM streaming — that shape
  is the roofline signal that the loop is memory-bound and belongs to
  rust-parallel-cache, not to wider vectors.
- **Prevent dead-code elimination.** Criterion's `iter` handles most cases;
  if you suspect elision, fold the result into an accumulator and
  `std::hint::black_box` it.
- **Compare against a saved baseline** — save once, compare after:
  `cargo bench -- --save-baseline main`, then
  `cargo bench -- --baseline main`. Machine noise otherwise masquerades as
  improvement; changes within criterion's noise band are not wins.
- **Verify the work actually happened.** Sum a sanity total and assert it —
  the false-sharing probe on M3 Max verified 240,000,000 increments. This is
  not paranoia: SpacetimeDB published — and honestly corrected — a SQLite
  benchmark after discovering the UPDATEs never executed (corrected figure:
  ~3.2k TPS).
- **Best-of-N, wall power, quiet machine, several runs.**

### Lessons from the false-sharing measurements (four sessions, M3 Max)

The 4-atomic-counters probe (4 threads × 20M increments, best-of-3, sums
verified) is the canonical cautionary tale for absolute numbers:

- **Packed-in-one-128B-line vs one-per-line measured ~14–18× in every
  session** (16.6–17.5× across 18 runs in the Round-1 reproduction). That
  ratio is the teachable, committable fact.
- **The absolute ns/op figures were NOT reproducible across sessions**:
  packed measured 48.8 → 36.7–37.1 → 8.0–8.5 ns/op across three sessions;
  padded measured 3.4–3.9 → 2.7 → 0.47–0.50. Machine load, QoS placement,
  and thermal state were undetermined. **Commit ratios and deltas, never
  absolute ns/op, as regression baselines.**
- **Straddle hazard**: an unaligned deliberately-packed probe array can
  straddle a cache-line boundary and understate the penalty ~2–4× (measured
  2.1–3.8 vs 8.0–8.5 ns/op before forcing alignment). Force
  `#[repr(align(128))]` on the packed probe when measuring false sharing.
- **Ordering is not always a lever**: on M3 (LSE atomics), `Relaxed` ≈
  `SeqCst` for `fetch_add` (8.28 vs 8.45 ns/op) — contrary to common x86
  guidance. Measure your target before claiming atomic-ordering wins.

## Parity tests against the scalar oracle

The scalar/current implementation is the oracle. Test that the optimized
version agrees with it automatically, on random inputs:

```toml
[dev-dependencies]
proptest = "1"
```

```rust
proptest! {
    #[test]
    fn optimized_matches_scalar(len in 0..2000usize, seed in any::<u64>()) {
        let data = pseudo_random_f32s(len, seed);
        // Tolerance must scale with input length — a fixed epsilon fails
        // inside this very range: measured on a chunked-8 vs scalar f32
        // sum, drift exceeded a fixed 1e-3 in 1440 of 80,000 seed×len
        // cases (max 0.0012 at len=1504); 1e-3·√n passed all 80,000.
        let tol = 1e-3 * (data.len().max(1) as f32).sqrt();
        prop_assert!((kernel_scalar(&data) - kernel_simd(&data)).abs() <= tol);
    }
}
```

What the test must cover — these are the bugs that actually happen:

- **Lengths not divisible by the lane count** (0, 1, LANES−1, LANES,
  LANES+1). Tail-handling bugs are the #1 SIMD bug; the `0..2000` range
  covers all residues mod 8/16/32, and tiny lengths should be hit explicitly.
- **Tolerance for floats, equality for ints.** Lane-tree summation and FMA
  round differently than scalar left-to-right, and the drift grows with
  input length — a tolerance scaled to `data.len()` (the `√n` form in the
  example above) beats a fixed epsilon, and `==` fails legitimately. The
  measured case is in the snippet's comment; a kernel whose error grows
  linearly in n rather than ~√n needs the linear scale. Integer kernels
  must match bit-for-bit — unless using `wrapping` ops, where the *scalar
  oracle* must also wrap.
- **Edge values**: `0.0`, `-0.0`, `f32::MIN/MAX`, `INFINITY`, `NaN`
  (compare `is_nan` on both sides — `NaN != NaN`), `u32::MAX` for overflow
  paths.
- **Between-build-profile divergence**: debug builds panic on integer
  overflow; wrapping SIMD ops don't. Pick semantics explicitly in the oracle
  so parity holds in every profile you test.

**FMA note**: `f.mul_add(x, y)` computes `f*x + y` with one rounding;
scalar `f*x + y` rounds twice — expect last-ulp differences, covered by the
tolerance. Rust has **no automatic FMA contraction**: rustc under
`+avx2,+fma` emits separate `vmulps`+`vaddps` for `a[i]*b[i]+c[i]`;
`mul_add` is the only route to `vfmadd` (Round-1 compile test: 4 `vfmadd`
on ymm). If downstream consumers need bit-exact reproducibility
(lockstep simulation, checkpoint hashing), document the divergence.

## Profiling, per OS

**Linux**:
- `perf stat -e cache-references,cache-misses` — quick memory-bucket read.
- `perf mem record/report` — per-symbol memory levels. Caveat: rides PEBS
  on Intel / SPE on AMD and needs `--data` sampling support, which is not
  available everywhere.
- `perf c2c record` / `perf c2c report` — HITM analysis for false sharing,
  with per-offset Source:Line breakdowns (Intel `cpu/mem-loads,ldlat=30/P`
  + `cpu/mem-stores/P`; AMD `ibs_op//u` — not on Zen3; Arm64
  `arm_spe_0/ts_enable=1,…/`; `--double-cl` defeats the adjacent-line
  prefetcher). Pair with `pahole` for struct layouts.

**macOS**:
- Instruments **CPU Counters** template (CPU Bottlenecks mode, WWDC25
  session 308) via `xcrun xctrace record --template 'CPU Counters' ...` —
  verified working on Apple Silicon (a 3 s trace of `/usr/bin/yes` was
  recorded this way). The old `instruments` CLI is gone.
- **mperf** — root-only, 2 fixed + 8 configurable counters via kpep
  plists, no SIP changes needed; **darwin-kperf** is the Rust-binding
  route.
- Apple Silicon has no user-space core pinning (`THREAD_AFFINITY_POLICY`
  returns `KERN_NOT_SUPPORTED=46`) — don't chase pinning on a Mac; see
  rust-parallel-cache for QoS classes.

**Any OS**:
- **Tracy** for span-level timelines of services (SpacetimeDB's production
  observability stack: Tracy + Prometheus + jemalloc pprof).
- `valgrind --tool=cachegrind` for a cache simulation, with its honesty
  caveat: it models "an AMD Athlon circa 2002", virtual addresses only.

## Instruction counts and CI perf gates

Wall-clock benchmarks are noisy; gates need something deterministic:

- **iai-callgrind** — instruction-count benchmarks with tiny variance.
  SpacetimeDB uses one (a clockworklabs fork) specifically for low-variance
  regression detection, alongside criterion microbenches that are always
  measured *against an in-tree SQLite baseline* — relative to a reference
  implementation, never absolute.
- **CI perf gate shape**: median-of-N on a fixed scenario with a hard
  ceiling. SpacetimeDB's gate: median-of-31 runs of index-scan reducers
  must stay ≤100 µs.
- **Track vectorization itself in CI**: grep cargo-show-asm output for the
  vector instructions you depend on — the asm is the ground truth, and it
  is the reliable CI vehicle (remark output only works via an emit path
  that actually prints on your host — see the delivery caveat in
  `references/codegen-tooling.md`). Grep it because autovectorization has
  a complexity cap that can move between compiler versions ("If something
  vectorizes today that doesn't necessarily mean it still will in a year
  from now" — Shnatsel).
- **Validate load tests against Little's Law** (concurrency = throughput ×
  latency). SpacetimeDB's methodology does exactly this; it is how you
  catch rigs that inflate throughput by hiding latency — giving their
  competitors 40-deep pipelining raised latency per Little's Law without
  raising throughput.

## The PGO measurement loop

PGO needs a *representative* workload, which is a measurement-design
problem before it is a tooling one:

1. `cargo pgo build` — builds instrumented (needs a matching `llvm-profdata`
   on PATH).
2. Run the representative workload(s) against the instrumented binary.
   Profile with `LLVM_PROFILE_FILE=./target/pgo-profiles/%m_%p.profraw`
   (the `%m_%p` pattern keeps multiple processes from clobbering each
   other).
3. `cargo pgo optimize` — merges profiles and rebuilds with
   `-Cprofile-use`.

Caveats that still hold (Kobzol canon, re-verified 2026-09-29): don't
double-instrument; in `.cargo/config.toml` put rustflags under
`[target.<triple>]`, not `[build]`, or cargo-pgo's flags get overridden
(cargo-pgo #49). Raw-flag route if not using cargo-pgo:
`-Cprofile-generate` → workload → `llvm-profdata merge` →
`-Cprofile-use`. BOLT workflow and its Linux-only constraint:
`references/codegen-tooling.md`.

## Inspection quickstart (full detail: references/codegen-tooling.md)

- `cargo asm --rust <target>` (cargo-show-asm) — per-function asm with
  Rust source interleaved; works on stable.
- Remarks (`-C remark=loop-vectorize`) explain *why* a loop did or did not
  vectorize — but mind the delivery caveat in
  `references/codegen-tooling.md`: via cargo's default emit path the flags
  printed **nothing** on the verified host, because the notes only surface
  through the `--emit=asm`/`--emit=obj` codegen paths. Use the bare-rustc
  route, cargo-show-asm, or cargo-remark; filter per pass, because
  `remark=all` drowns the signal in size-info/regalloc noise.
- Read the asm, not just the remark: the f32 dot-product probe's remark
  reported "vectorized" for the multiply part while all 21 adds stayed
  scalar — zero `fmla.4s`.
