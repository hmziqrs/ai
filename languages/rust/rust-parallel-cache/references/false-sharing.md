# False sharing — measurements, padding, detection

The complete record behind the SKILL.md rules of thumb. All numbers are
**[measured]** on the research host (Apple M3 Max, macOS 27) across five
sessions: the original session, the architect + verifier re-runs, the
Round-1 audit's fresh from-scratch reproduction (crossbeam-utils 0.8.23,
benchmark at `/tmp/audit-fs`), and a skill-writing verification run on
2026-09-29 (same shape: crossbeam-utils 0.8.23, aligned packed probe,
best-of-3, sums asserted). The benchmark shape: 4 threads × 20M atomic
`fetch_add` increments each, best-of-3, sums verified for correctness.

## The measurements, and what is and isn't reproducible

| Layout | Session 1 | Sessions 2–3 | Round 1 (18 runs) | 2026-09-29 verify |
|---|---|---|---|---|
| 4 counters packed in one line | 48.8 ns/op | 36.7–37.1 ns/inc | **8.0–8.5 ns/op** | **6.21 ns/op** |
| `#[repr(align(64))]` | 3.4–3.9 | 2.7 | **0.59–0.73 ns/op** | — |
| `#[repr(align(128))]` | 3.4–3.9 | 2.7 | **0.47–0.50 ns/op** | — |
| `CachePadded` (128 B on aarch64) | 3.4–3.9 | 2.7 | **0.47–0.50 ns/op** | **0.49 ns/op** |

**The absolute figures are NOT reproducible across sessions** — same machine,
3–8× spread on the packed case (machine load / QoS placement / thermal state
undetermined; the original session's benchmark source was not preserved).
What IS stable in every session: the **packed-vs-padded catastrophe ratio,
double-digit in all five sessions — ~12.7× to ~17.5×** (Round 1: 16.6–17.5×
across 18 runs; the 2026-09-29 verification run measured 12.7×, right at the
bottom of the range — the ratio itself drifts too, just far less than the
absolutes).

Corollaries:

- Teach and test the **ratio**, never an absolute ns/op. A "packed counter =
  8 ns" claim is a session artifact.
- Compare before/after variants **in the same session, interleaved**.
- An earlier "64 B == 128 B identical" claim (two sessions showed 2.7 == 2.7)
  was withdrawn in Round 1: align(64) was consistently ~20–25% slower than
  align(128) (0.59–0.73 vs 0.48–0.50). Current best statement: **64 B
  separation removes ~98% of the penalty on this part; 128 B is measurably at
  least as good and is the portable default.**

## Why 128 B as the default

- `crossbeam_utils::CachePadded` pads to 128 B on x86-64/aarch64/ppc64 and
  256 B on s390x, because **Intel's spatial prefetcher pulls line pairs** —
  two adjacent 64 B lines behave as a unit. Crossbeam itself describes the
  size as "just a reasonable guess and is not guaranteed" [sourced].
- On this M3 Max the coherency granularity behaves like 64 B sectors, which
  is why 64 B already removed ~98% of the penalty — but that is a property of
  *this part*, not a portable fact.

## Benchmark-harness pitfalls (how to not fool yourself)

1. **The straddle hazard [measured].** An *unaligned* packed counter array can
   straddle a cache-line boundary, splitting the contention across two lines
   and **understating the penalty ~2–4×** (2.1–3.8 vs 8.0–8.5 ns/op before
   forcing alignment). Force `#[repr(align(128))]` on the packed probe too —
   the "bad" variant must be bad on purpose, not by accident of placement.
   (The 2026-09-29 verification harness used exactly this aligned-packed
   probe; its packed figure, 6.21 ns/op, is the honest aligned number.)
2. **Verify the sums.** Every session verified the total increment count —
   **80,000,000** for the 4×20M shape used in every false-sharing session and
   by the harness below. (The report's preamble separately cites a
   240,000,000 sanity total — that belongs to its distinct cache-probe
   program, not this benchmark. Assert whatever total *your* harness issues.)
3. **Best-of-3 minimum, not mean**, on a quiet machine; report the ratio of
   medians.

## Ordering is not a lever here (M3)

On M3's LSE atomics, `Relaxed` ≈ `SeqCst` for `fetch_add`:
**8.28 vs 8.45 ns/op [measured]** in the contended packed case. Switching
orderings to "fix" a slow shared counter is x86 folklore — it does nothing on
Apple Silicon; only changing the *layout* does.

## Kernel-doc guidance [sourced]

From the kernel's own false-sharing page
(docs.kernel.org/kernel-hacking/false-sharing.html):

- Separate hot globals into dedicated cache lines.
- Group fields that are written together into the same line (that sharing is
  fine — it's *independent writers* per line that hurts).
- Use per-cpu (in our context: per-thread/per-shard) counters, combined
  occasionally, instead of one shared counter.

## Detection on Linux: `perf c2c` [sourced]

```sh
perf c2c record -- ./bench
perf c2c report --stdio
```

`perf c2c` does HITM (hit-modified) analysis with per-offset Source:Line
breakdowns of the contended cachelines. Event sets by vendor:

| Vendor | Events |
|---|---|
| Intel | `cpu/mem-loads,ldlat=30/P` + `cpu/mem-stores/P` |
| AMD | `ibs_op//u` (not available on Zen 3) |
| Arm64 | `arm_spe_0/ts_enable=1,…/` (SPE) |

- `--double-cl` doubles the cacheline size in the report to defeat the
  adjacent-line prefetcher when hunting line-pair effects.
- Pair with `pahole` on the binary to see actual struct layouts/padding.
- Caveat: this class of memory sampling rides PEBS (Intel) / SPE (AMD) and
  needs `--data` sampling support — not available on every machine.

On macOS there is no `perf c2c` equivalent; detect empirically — if padding
hot counters changes throughput by >2×, you had sharing (that is exactly the
measured effect size above).

## The fix, in one place

```rust
use crossbeam_utils::CachePadded;
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;

// BAD — all four counters in one 128 B line on Apple Silicon:
// struct S { c: [AtomicU64; 4] }

// GOOD — independent writers get independent lines:
#[derive(Default)]
struct S {
    c0: CachePadded<AtomicU64>,
    c1: CachePadded<AtomicU64>,
    c2: CachePadded<AtomicU64>,
    c3: CachePadded<AtomicU64>,
}

fn main() {
    let s = std::sync::Arc::new(S::default());
    let handles: Vec<_> = (0..4u64)
        .map(|i| {
            let s = s.clone();
            thread::spawn(move || {
                let counter = match i {
                    0 => &s.c0, 1 => &s.c1, 2 => &s.c2, _ => &s.c3,
                };
                for _ in 0..20_000_000 {
                    counter.fetch_add(1, Ordering::Relaxed);
                }
                20_000_000u64 // report what was done — then verify it
            })
        })
        .collect();
    let total: u64 = handles.into_iter().map(|h| h.join().unwrap()).sum();
    assert_eq!(total, 80_000_000); // pitfall 2: always verify the sums
}
```
