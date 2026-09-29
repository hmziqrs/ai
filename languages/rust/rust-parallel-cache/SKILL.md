---
name: rust-parallel-cache
description: Make Rust parallel and cache-friendly at the thread and memory level. Use whenever the user says "parallelize this with rayon", "why doesn't adding threads help", "my rayon pool is slow", "pin these worker threads to cores", "false sharing", "why is my multithreaded counter slow", "NUMA / first-touch / mbind", "cache-friendly layout / blocking / tiling", "keep this off the E-cores / QoS classes", or asks about CPU affinity, cache lines, atomics scaling, thread pools not scaling, or core pinning. Covers rayon pool configuration, work-stealing vs pinned-shard design, false-sharing measurement and padding, cache tiling, NUMA first-touch, and Apple Silicon QoS/E-core steering. Does NOT fire on thread-per-core or single-writer service architecture and runtime choice (rust-fast-architecture), SIMD crate picks (rust-simd-crates), writing or diagnosing vector kernels (rust-simd-kernels), or generic profiling/triage with no lever chosen yet (rust-superopt).
---

# Parallel & Cache-Friendly Rust — rayon, affinity, false sharing, NUMA

Make threading actually scale: pick the right parallel shape, keep hot data on
the right cores and on private cache lines, and know what each OS will and will
not let you do. This is where the remaining multipliers live after single-core
work is done.

## Scope and routing

This skill owns **thread/memory-level parallelism**: rayon pools, work-stealing
vs pinned shards, false sharing, cache blocking/tiling, NUMA first-touch, and
P/E-core steering.

Hand off instead of covering here:

| If the ask is… | Route to |
|---|---|
| "Make this faster" with no lever chosen; Amdahl/compute-vs-memory-vs-IO triage; benchmark discipline; PGO/BOLT | `rust-superopt` |
| Swap in an accelerated crate (SIMD JSON/hashing/…) | `rust-simd-crates` |
| "Why didn't my loop vectorize"; hand-writing SIMD kernels | `rust-simd-kernels` |
| Thread-per-core **service design**, single-writer vs MVCC, sharding a service, glommio/compio/tokio runtime choice, group commit | `rust-fast-architecture` |

The boundary with `rust-fast-architecture`: that skill decides *whether* a
service should be share-nothing; this skill supplies the *mechanics* (pinning,
topology, deques, line padding) once the decision is made.

## Provenance labels used throughout

- **[measured]** — measured on the research host: Apple M3 Max, macOS 27,
  16 cores (12 P + 4 E), rustc 1.98.1. Topology re-verified live on this
  machine 2026-09-29 (see `references/topology.md`).
- **[sourced]** — from man pages, kernel docs, or vendor specs; no Linux host
  was available in any research session, so Linux/NUMA specifics are
  documentation-sourced, not locally measured.
- **[vendor]/[community]** — vendor-published or community-measured, not
  independently reproduced.

Never teach an absolute ns/op as a machine fact — only ratios survived
re-measurement across sessions.

## Step 0 — "Why doesn't adding threads help?" diagnosis

Run these checks in order; each one maps to a section below.

1. **Serial fraction.** If 30% of the runtime is serial, 100 cores cap you at
   ~3.3× (Amdahl). Profile first; if the bottleneck is not threading-level,
   route to `rust-superopt` for triage.
2. **False sharing / contended atomics.** A multithreaded counter that is
   *slower* than its serial version is the classic signature — packed counters
   cost a **double-digit multiple (~13–18× [measured, five sessions])** vs one
   per line (§ False sharing).
3. **Oversubscription.** More threads than cores means migration and
   scheduling overhead. `rayon` defaults to one worker per logical CPU;
   nested/extra pools fight each other.
4. **Memory bandwidth saturation.** Once every core streams from RAM, more
   cores add contention, not bandwidth. Check with `perf stat -e
   cache-references,cache-misses` [sourced] or Instruments CPU Counters.
5. **Migration / locality.** Unpinned threads bounce between cores and lose
   L1/L2 state on every migration — pin (Linux) or shard by cluster
   (Apple Silicon) (§ Affinity).
6. **E-core placement [Apple Silicon].** BACKGROUND QoS *can* land CPU-bound
   threads on E-cores — measured slowdowns span **~2.2–6.6× across sessions
   and thread contexts** — but it is not a per-thread guarantee: one
   measurement session found readback-confirmed BACKGROUND *worker* threads
   running at full P-core speed while the main thread still demoted. Check
   QoS **and verify with timing**, not just thread count (§ Affinity).
7. **Per-item work too small.** Parallel-task overhead swamps sub-microsecond
   items; batch per task (also the point where SIMD within an item matters —
   route to `rust-simd-kernels`).

## Choose the parallel shape: work-stealing vs pinned shards vs hybrid

| Shape | Use when | Costs / cautions |
|---|---|---|
| **Work-stealing pool** (rayon; Cilk-origin) | Irregular task sizes, data-parallel maps, one-off parallelization | Tasks can migrate → cold caches on hot per-worker state; steal overhead |
| **Pinned shards** (share-nothing per core) | Steady per-item load, hot per-shard state, tail-latency SLOs | Unbalanced workloads can underutilize cores (monoio's documented caveat [sourced]); needs affinity support from the OS |
| **Hybrid** — per-core `crossbeam-deque` `Worker`s + one global `Injector` for spillover; `sharded-slab` for sharded concurrent storage | Shards with occasionally unbalanced load | Some steal overhead, but only when it pays |

Reasons, not just preferences:

- **Pinning avoids cache invalidation on migration** — `sched_setaffinity(2)`
  keeps a thread's hot L1/L2 resident [sourced]. That is the whole argument
  for shards: Seastar ("single thread on each CPU… sharded memory…
  communication via explicit message passing") and glommio
  (`Placement::Fixed(0)` "will now never leave CPU 0") are built on it
  [sourced].
- **Work-stealing wins on skew.** When item cost varies wildly, a fixed shard
  assignment leaves fast workers idle; a stealing pool self-balances.
- **The tail-latency advantage of sharding+locality is repeatedly reproduced**
  [sourced: 2026 benchmark literature, see rust-fast-architecture's § on
  Iggy/PulseBeam]; the 2020-era claim that work-stealing must *lose* is not a
  general law.
- For whole-service runtime choices (compio vs Tokio `LocalRuntime` vs
  morsel-driven), route to `rust-fast-architecture`; note the glommio-lineage
  runtimes went release-stale (glommio 0.9.0 is 2024, hard-fork active but
  unreleased on crates.io; monoio/tokio-uring unshipped 2+ years) — mechanics
  here do not require adopting any of them.

## rayon essentials

Standard composition: `par_iter()` across independent items, per-item inner
work optimized separately.

```rust
use rayon::prelude::*;

data.par_chunks(BLOCK).for_each(|chunk| process(chunk));
```

Pool configuration that matters:

```rust
// Verified to compile and run on rayon 1.12.0 / rayon-core 1.13.0
// (2026-09-29: pool built, computed correctly, pin call returned false on
// macOS as expected). On Linux this pins worker i to cores[i].
let cores = core_affinity::get_core_ids().unwrap();
let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(cores.len())        // num_threads(0) = one per logical CPU
    .start_handler(move |idx| {
        core_affinity::set_for_current(cores[idx]); // runs on each worker at start
    })
    .exit_handler(|_idx| { /* matching cleanup, if any */ })
    .build()
    .unwrap();
```

- `start_handler(|idx| …)` receives the **worker index** — use it to pin and
  to initialize per-worker state on the worker itself (NUMA first-touch, see
  `references/numa-pinning.md`).
- `spawn_handler` gives full control over thread creation (name, stack size,
  scoped init) and is a **safe** fn on rayon-core 1.13.0 — the signature is
  `spawn_handler(|thread| …)` with `FnMut(ThreadBuilder) -> io::Result<()>`;
  the closure spawns an OS thread that calls the safe `ThreadBuilder::run()`
  (src/lib.rs:433-435; a spawn_handler pool was compiled and run here from
  100% safe code). It is still more machinery than `start_handler` — prefer
  `start_handler` unless you need spawn-time parameters.
- `num_threads(0)` means one worker per logical CPU (rayon's default).
- Build scoped pools per workload; `build_global()` is for a process-wide
  default — pick deliberately.

**"My rayon pool is slow" — usual causes, in checking order:** oversubscription
(extra pools, or threads inside the work); false sharing on per-worker
counters/accumulators; work items too small (batch them); memory bandwidth
saturation; unpinned workers bouncing between NUMA nodes or P/E clusters;
recursive `par_iter` causing fork-join overhead where `rayon::join` with a
serial base case belongs (§ Tiling).

## False sharing — rules of thumb

The rule: **never let two independently-written hot objects share a cache
line.** The penalty is a **double-digit multiple — ~12.7–17.5× [measured,
five sessions on the same M3 Max; Round 1: 16.6–17.5× across 18 runs; a
2026-09-29 verification run measured 12.7×]** for four packed atomic counters
vs one per line. Teach the *ratio*, never an absolute ns/op — packed counters
measured 48.8 → 36.7–37.1 → 8.0–8.5 → 6.21 ns/op across sessions on the
*same machine*.

Fix pattern:

```rust
use crossbeam_utils::CachePadded;
use std::sync::atomic::AtomicU64;

// BAD:  a: [AtomicU64; 4]  — all four in one 128 B line on Apple Silicon
// GOOD: pad each hot counter
pub struct Counters {
    pub hits:   CachePadded<AtomicU64>,   // crossbeam pads to 128 B on
    pub misses: CachePadded<AtomicU64>,   // x86_64/aarch64/ppc64, 256 B on s390x
}
// Equivalent without a dependency:
#[repr(align(128))]
pub struct Padded(AtomicU64);
```

- Pad to **128 B / `CachePadded` as the portable default** — 128 B is at least
  as good everywhere measured and is correct for Intel's line-pair spatial
  prefetcher. `crossbeam` itself calls its padding size "just a reasonable
  guess and is not guaranteed" [sourced].
- 64 B separation removed **~98%** of the penalty on the M3 Max [measured],
  but align(64) measured ~20–25% slower than align(128) in the Round-1
  re-runs (earlier sessions had shown them equal) — use 128.
- Ordering is **not** a lever on Apple Silicon: `Relaxed ≈ SeqCst` for
  `fetch_add` on M3's LSE atomics (8.28 vs 8.45 ns/op [measured]) — contrary
  to common x86 guidance.
- Kernel-doc guidance [sourced]: separate hot globals into dedicated lines,
  group fields written together, use per-cpu/per-thread counters and combine.

Detection and benchmark harness pitfalls (straddle hazard, `perf c2c` event
table): `references/false-sharing.md`.

## Cache-friendly layout: blocking and tiling

Cache-aware tiling keeps reused panels resident (Lam/Rothberg/Wolf 1991);
cache-oblivious divide-and-conquer (Frigo et al.) avoids explicit cache-size
parameters; empirical studies found **hybrids — explicit tiling at the
recursion base — work best** [sourced]. The Rust shape:

```rust
/// Recursive cache-oblivious matmul: parallel `rayon::join` splits over rows
/// at the top, serial tiled kernel at the base. c += a·b, row-major; a has
/// c.len()/n rows, b is n×n. (Compiles as-is; verified bitwise-identical to
/// a naive i-k-j reference at n=400/512/1000.)
fn matmul(a: &[f32], b: &[f32], c: &mut [f32], n: usize) {
    const ROW_BLOCK: usize = 128; // rows per serial base case
    if c.len() <= ROW_BLOCK * n {
        let m = c.len() / n;
        const T: usize = 64; // tile edge — pick so one T-wide panel set
                             // fits the shared cache level (references/topology.md)
        for i in 0..m {
            for k0 in (0..n).step_by(T) {
                let ke = (k0 + T).min(n);
                for j0 in (0..n).step_by(T) {
                    let je = (j0 + T).min(n);
                    for k in k0..ke {
                        let aik = a[i * n + k];
                        for j in j0..je {
                            c[i * n + j] += aik * b[k * n + j];
                        }
                    }
                }
            }
        }
    } else {
        let half = (c.len() / n / 2) * n;
        let (a_top, a_bot) = a.split_at(half);
        let (c_top, c_bot) = c.split_at_mut(half);
        rayon::join(|| matmul(a_top, b, c_top, n),
                    || matmul(a_bot, b, c_bot, n));
    }
}
```

- Size tiles so one working set fits the **shared** level the threads share
  (per-cluster L2 on Apple Silicon, L3/CCX on AMD — read the real hierarchy
  from `references/topology.md`, don't assume a flat "L3").
- `rayon::join` with a serial base case beats recursive `par_iter` here: the
  base case amortizes fork-join overhead.
- Keep layout changes (SoA, chunking, alignment) ahead of prefetch guesses —
  hardware prefetchers already handle linear scans (§ Prefetch).

## Affinity and OS behavior

### Linux [sourced — docs-verified, not measured here]

- `core_affinity::set_for_current(CoreId)` → `sched_setaffinity(2)`: real
  pinning, inherited per-thread. Verified pattern for rayon above.
- NUMA default policy is **first-touch**: memory lands on the node of the CPU
  that first *writes* the page — so the thread that will own data should
  allocate and initialize it. `mbind`/`set_mempolicy` semantics, the raw
  syscall route (libc has no wrappers), `taskset`/`numactl`, and the `hwlocality`
  memory-binding API: `references/numa-pinning.md`.
- Interleave memory only for pure-bandwidth streaming (effective ~1 MB+);
  check `/sys/devices/system/node/node*/numastat` [sourced].

### Apple Silicon [measured]

- **There is no user-space core pinning.** `core_affinity::set_for_current`
  returns `false` for every thread (main, workers, rayon workers), and
  `thread_policy_set(THREAD_AFFINITY_POLICY)` returns
  **KERN_NOT_SUPPORTED (46)** by direct C call. The SDK itself calls the
  affinity policy "experimental… a hint to the scheduler". Do not build a
  design that depends on pinning here.
- **QoS classes are the only P/E steering mechanism — but how strongly they
  bite is context- and session-dependent (measured record below).**
  On current `libc` call it directly (verified 2026-09-29 on `=0.2.189`,
  rc=0 with correct readback; the binding *relocated* across libc releases —
  `src/unix/bsd/apple/mod.rs` through 0.2.174,
  `src/new/apple/libpthread/pthread_/qos.rs` from 0.2.184 — it was never
  dropped):

  ```rust
  let rc = unsafe {
      libc::pthread_set_qos_class_self_np(
          libc::qos_class_t::QOS_CLASS_USER_INTERACTIVE, 0)
  };
  ```

  If your pinned `libc` predates the binding — or you want no dependency —
  declare it yourself (verified to compile and run identically; values from
  macOS SDK `<sys/qos.h>`):

  ```rust
  mod qos {
      // Values from macOS SDK sys/qos.h (verified 2026-09-29).
      pub const USER_INTERACTIVE: u32 = 0x21;
      pub const USER_INITIATED:  u32 = 0x19;
      pub const DEFAULT:         u32 = 0x15;
      pub const UTILITY:         u32 = 0x11;
      pub const BACKGROUND:      u32 = 0x09;

      extern "C" {
          pub fn pthread_set_qos_class_self_np(class: u32, priority: i32) -> i32;
          // Read back the class of any thread — confirms the setter took
          // (NOT the core placement; see measured record below):
          pub fn pthread_get_qos_class_np(
              thread: *mut core::ffi::c_void, class: *mut u32,
              priority: *mut i32) -> i32;
          pub fn pthread_self() -> *mut core::ffi::c_void;
      }
  }
  // In the worker thread (priority 0 = unspecified within class):
  unsafe { qos::pthread_set_qos_class_self_np(qos::USER_INTERACTIVE, 0) };
  ```

  **Measured record — BACKGROUND vs USER_INTERACTIVE on fixed integer work,
  three sessions, multiple thread contexts:**

  | Session | Context | BACKGROUND slowdown |
  |---|---|---|
  | Research (§2.13) | calling thread | ~2.4× (72–83 ms vs ~31 ms) |
  | Audit round 1 | **main thread** | 2.2× (722 vs 325 ms) |
  | Audit round 1 | **spawned worker**, class 0x09 confirmed by readback | **~1.0× — no demotion** (also ~1.0× at 8 and 16 threads) |
  | Audit round 1 | whole process (`taskpolicy -b`) | ~3× |
  | 2026-09-29 verify | main thread | 5.6× (285–295 vs 51–52 ms) |
  | 2026-09-29 verify | spawned worker, readback 0x09 | 3.1–3.3× (261–276 vs 82–84 ms) |
  | 2026-09-29 verify | 8-thread pool / 16-thread pool | 3.4–4.6× / 6.6× |

  The direction is real (BACKGROUND *can* put CPU-bound work on E-cores) but
  the per-thread guarantee is not: the audit session's spawned workers ran at
  P-core speed despite confirmed class 0x09, while the 2026-09-29 session
  demoted every context. Practical stance: **set the class you want, read it
  back, and confirm placement with timing in your own process state** —
  never assume a BACKGROUND worker is on an E-core, and never assume an
  interactive worker is immune to ambient process-level policy
  (`taskpolicy -b` demoted everything ~3×). Raising
  BACKGROUND→USER_INTERACTIVE succeeds (rc=0).

  Crates: `gdt-cpus` 0.2606.1 (reads `hw.perflevelN`, hybrid P/E aware,
  affinity-with-graceful-skip), `qos-threads` 0.1.3 (RAII `with_qos`),
  `eco-mode` 0.0.1 (listed among the research report's QoS options; no
  further detail recorded — inspect before adopting).
- **Size shards per cluster, not per chip.** The 12 P-cores form **two
  clusters of 6** (`hw.perflevel0.cpusperl2 = 6`), each with a private 16 MiB
  L2 — a 12-shard pool spans two private L2 domains (32 MB total), and any
  shard-shared structure larger than 16 MiB spills. Details and the full
  measured hierarchy: `references/topology.md`.

## Prefetch

Hardware prefetchers handle linear scans; **software prefetch earns its keep
for irregular-but-predictable accesses** — pointer chasing, hash-probe
chains, indirection — and too much prefetching causes evictions [sourced].

Rust-specific gotchas (both compile-verified):

- `_mm_prefetch(p, _MM_HINT_T0/T1/T2/NTA/ET0)` is *declared* safe and stable
  since 1.27, but it carries `#[target_feature(enable="sse")]` — calling it
  from ordinary safe code **does not compile** (E0133). Wrap in `unsafe {}` or
  a `#[target_feature]` fn of your own.
- `core::intrinsics::prefetch` **no longer exists** — split into
  `prefetch_read_data`/`prefetch_write_data`/`prefetch_read_instruction`
  (nightly-only; they emit real `prfm`). On stable aarch64, PRFM needs inline
  asm: `core::arch::asm!("prfm pldl1keep, [{}]", ptr_reg)`; nightly aarch64
  also has `core::arch::aarch64::_prefetch::<RW, LOCALITY>` behind
  `stdarch_aarch64_prefetch` (#117217).

## Measuring caches and sharing

- **Linux** [sourced]: `perf stat -e cache-references,cache-misses`;
  `perf mem record/report` for per-symbol memory levels (rides PEBS on Intel /
  SPE on AMD — needs `--data` sampling support, not available everywhere);
  `perf c2c` for false sharing (see false-sharing reference).
- **macOS** [measured available on this host]: Instruments **CPU Counters**
  template (CPU Bottlenecks mode, WWDC25 session 308) via
  `xcrun xctrace record` — works on Apple Silicon (a 3 s trace was recorded
  in Round 1); the old `instruments` CLI is gone. `mperf` is root-only with
  2 fixed + 8 configurable counters (kpep plists, no SIP changes);
  `darwin-kperf` is the Rust-binding route.
- **Anywhere**: `valgrind --tool=cachegrind` — honest caveat: models "an AMD
  Athlon circa 2002", virtual addresses only.

Always re-measure after any change in this skill: the false-sharing numbers
are proof that absolutes drift between sessions even on identical hardware —
compare before/after in the *same* session, ratio-style.

## Reference files

| File | Read when |
|---|---|
| `references/topology.md` | You need the real cache/cluster hierarchy (M3 Max measured table, Zen 4 CCX vs Intel mesh/SNC), how to query it per OS, and which topology crate to use |
| `references/numa-pinning.md` | Pinning threads (Linux mechanics, rayon pattern internals), NUMA first-touch/mbind semantics, raw-syscall route, hwlocality memory binding, THP/Redis latency case |
| `references/false-sharing.md` | You need the full measurement record, the benchmark-harness straddle hazard, padding rationale, or `perf c2c` detection with the per-vendor event table |
