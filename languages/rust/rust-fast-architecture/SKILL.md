---
name: rust-fast-architecture
description: Architecture-level speed for whole Rust services. Use when the user says "thread-per-core", "share-nothing" or "sharded service design", "single-writer vs MVCC vs sharding", "how does SpacetimeDB/TigerBeetle go so fast", "reduce lock contention", "group commit" or "write-behind logging", "colocate compute with data", "glommio vs monoio vs compio vs tokio", or asks to design a low-latency high-throughput service. Covers contention math, single-writer actors, lock downgrade at commit, write-behind group commit, adaptive linger, pooling, determinism/deterministic-simulation-testing, and the 2026 async-runtime chooser. NOT for rayon/pinning/NUMA/false-sharing mechanics (rust-parallel-cache), SIMD crate picks (rust-simd-crates), hand-written vector kernels (rust-simd-kernels), or unclear-lever profiling/PGO work (rust-superopt routes here).
---

# Rust Fast Architecture — service-level speed

Whole-service throughput ceilings are set by architecture, not instruction tuning.
The strongest public Rust evidence: SpacetimeDB reaches ~300k TPS on one 24-vCPU
i9-14900K with **no SIMD and no io_uring anywhere in its codebase** (both
grep-verified in the research underlying this skill) — single-writer actors, a
paged in-memory store whose serialization collapses to memcpys, write-behind
group commit, pooling, and core partitioning do the work. TigerBeetle gets its
numbers from the same shape taken further: one thread per replica, zero dynamic
allocation, batching instead of intra-replica parallelism.

This skill turns those systems into a decision framework. Everything here is
sourced from the research report (simd-research/report.md, 2026-09-29, itself
sourced from SpacetimeDB/TigerBeetle blogs and a clone of clockworklabs/
SpacetimeDB@master, 2026-09-28); measured TPS figures are **vendor-published,
not independently reproduced**, and single-blog migration numbers (Iggy,
PulseBeam) are labeled as such where they appear.

## When to use this skill

Fires on: thread-per-core / share-nothing / sharded service design,
single-writer vs MVCC vs sharding choices, "how does SpacetimeDB/TigerBeetle go
so fast", reducing lock contention, group commit / write-behind logging,
colocating compute with data, glommio-vs-monoio-vs-compio-vs-tokio, designing a
low-latency high-throughput service.

Route instead of overlapping:
- **Unclear lever, "make my Rust faster", profiling, PGO/BOLT, release-profile
  hygiene** → `rust-superopt` (it routes architecture questions back here).
- **Adopting a SIMD-accelerated crate** → `rust-simd-crates`.
- **Hand-writing or debugging vector kernels** → `rust-simd-kernels`.
- **Rayon pools, thread pinning mechanics, NUMA/first-touch, false sharing,
  cache blocking, E-core/QoS steering** → `rust-parallel-cache`. This skill
  says *when* to pin and partition cores; that skill says *how*.

## Step 0 — Do the contention math before changing anything

The ceiling on a contended key is `1 / critical-section-length` (SpacetimeDB's
published reasoning, "Ok, but does it scale?"):

- A ~3 µs single-core critical section admits **~300,000 TPS** on a hot key.
- A ~1 ms distributed critical section admits **~1,000 TPS** — "the
  single-threaded solution is 300x more scalable".
- With just **1% contending transactions** and 1 ms commits, *any* horizontally
  scalable cluster is capped at `(1/1ms)/1% = 100,000 TPS` **regardless of core
  count**.
- Their corollaries: horizontal scalability is "primarily a property of the
  workload"; a cluster beats a single core only with (near-)zero contention
  **and** spend above ~$3,600/month.

So first measure where the lock actually is and how long it is held. If the
answer is "a coarse lock held for microseconds", the fix is architectural
(below), not finer-grained locking. If the workload has essentially no shared
hot keys, stop — sharding buys little and costs operational complexity.

## The central decision: single-writer vs MVCC/parallel vs sharding

**Single-writer per shard** (SpacetimeDB's choice): each database is an actor on
one OS thread running a Tokio LocalSet, all state behind one
`Arc<RwLock<CommittedState>>`. They *built* early MVCC-based parallel
execution, measured it, and **removed it** — single-threaded execution "flat
out outperformed"; they estimate the detour cost over $1m. Lesson: fine-grained
concurrency machinery (MVCC, lock striping) often costs more than it returns
once the critical section is already microsecond-scale.

**Sharding / share-nothing across shards**: splits the contention math by key.
Wins when the workload partitions naturally and tail latency matters — the
tail-latency advantage of sharding+locality is *repeatedly reproduced* across
the 2026 case studies. Iggy's caveat from practice: pure shared-nothing with
`RefCell`-owned state **failed** (borrow-across-await); their working shape is a
hybrid — shared control plane, sharded data plane (left-right, flume, DashMap,
mimalloc).

**Parallel/morsel-driven** (do NOT shard) when the workload is analytical:
Justin Jaffray's "The death of thread per core" (2025-10-20) argues skew,
CPU-bound bottlenecks, morsel-driven scheduling (Leis et al.; DuckDB, KuzuDB,
Umbra, CedarDB in practice) and multitenant elasticity beat fixed partitioning
for query engines. A July-2026 tokio/smol/glommio benchmark (c410-f3r, Ryzen 9
5900X, k6) found **no consistent winner** — so the 2020-era claim that
work-stealing must lose is not a general law.

**Net 2026 verdict**: thread-per-core thrives in new latency-critical systems
and lost in analytical engines. Take the *architecture*, not the runtime brand.

## The transferable techniques

Each is stated as guidance; file:line evidence for every claim is in
`references/spacetimedb-case-study.md`.

1. **One lock + a microsecond critical section beats fine-grained MVCC under
   contention.** Serialize writers on one lock, but keep the section tiny.
   At commit, do **early lock release via downgrade**: enqueue durability work
   *while still holding the write lock*, then downgrade write→read so
   subscription evaluation overlaps the next writer
   (`datastore.rs:1030-1039`, `relational_db.rs:895-909`).
2. **Never hold the hot lock across I/O.** Write-behind **group commit**: the
   commit path enqueues to an async channel inside the critical section and
   returns; a background actor drains with `recv_many`, writes the batch on
   `spawn_blocking`, issues **one `flush_and_sync` per batch**, and publishes
   the durable offset on a `watch` channel for waiters
   (`durability/src/imp/local.rs:269-311`). Amortize fsync across many commits,
   never the reverse.
3. **Partition cores by thread class, and pin only above a threshold.**
   SpacetimeDB reserves cores 1/8 databases, 4/8 tokio workers, 1/8 rayon, plus
   2 IRQ and 2 OS cores (`startup.rs:224-234`); pinning engages only when ≥10
   cores **and** the non-default `core-pinning` feature is on
   (`startup.rs:331-341`). Pinning is non-macOS (Linux/Windows/BSD —
   `util/thread_scheduling.rs:5-19`); macOS has no user-space core pinning.
   Databases round-robin onto cores with **live migration** for load balancing
   (`LoadBalanceOnDropGuard` steals from the busiest core). For the pinning
   mechanics themselves, use `rust-parallel-cache`.
4. **Keep async/fibers off the fast path.** SpacetimeDB runs reducers on a
   *synchronous* wasmtime engine so the main lane avoids fiber overhead; the
   async engine is reserved for genuinely suspending operations. Fiber stacks
   (2 MiB) are pooled in a crossbeam ArrayQueue rather than allocated per call.
   Same principle in ordinary services: a plain function call through owned
   state beats an `.await` through a generic runtime on the hot path.
5. **Precompute layouts, then memcpy.** A `StaticLayout` computed once per row
   type makes wire-format conversion 1–2 `copy_from_slice` calls that skip
   padding (`static_layout.rs:1-27`); the wire format (BSATN) is fixed-width,
   little-endian, with **no field names**. Serialization stops being a parser
   and becomes a copy.
6. **Adaptive linger on worker queues.** Their broadcast path uses an
   `AdaptiveUnboundedReceiver` with a 25 µs baseline linger that doubles to
   200 µs while work keeps arriving — batch under load, stay snappy when idle.
7. **Pool hot-path allocations; use an arena-of-pages store.** 64 KiB pages
   with O(1) freelists; a page pool defaulting to 128 pages (8 MiB); 4 KiB
   `BytesMut` builders pooled with a cap; **jemalloc** as global allocator with
   512 KB-sampled profiling. Per-request malloc/free disappears from the tail.
8. **Identity-hash integer keys + SmallVec.** hashbrown+ahash maps with
   `nohash_hasher` (identity hashing — skip hashing when the key *is* the
   hash) and SmallVec everywhere to keep small collections off the heap.
9. **Determinism as an architectural lever.** No I/O, clocks, or randomness
   inside handlers → retries and replication become replay, and
   **deterministic simulation testing** (`dst` crate at SpacetimeDB; the stated
   reason TigerBeetle's I/O loop is single-threaded) makes concurrency bugs
   reproducible in CI instead of rare in production.
10. **Measure the way they do.** Instruction-count benchmarks (iai-callgrind)
    for low-variance regression detection; a CI perf gate (median-of-31 runs of
    an index-scan reducer must stay ≤100 µs); benchmark validation against
    Little's Law; microbenches pinned against an in-tree SQLite baseline;
    Tracy + Prometheus + jemalloc pprof in production. (Details in the
    reference file.)
11. **Scale by explicit shard boundaries, not transparent distribution — and
    colocate compute with data.** Eliminating the server→database round trip
    turns a ~200 µs network hop into ~100 ns in-process calls (SpacetimeDB's
    stated numbers). Make the shard key an explicit API contract; transparent
    distributed hash-maps reimport the contention and the round trips.

Fanout addendum: when many subscribers read the same query, **refcount-share
one encoded update buffer** across them and reclaim it only when the last
client is done (`BsatnRowListBuilderPool::try_put`) instead of encoding per
client.

## Async-runtime chooser (2026 status)

The pattern won; the flagship runtimes rotted. Current state (all fetched
2026-09-29):

| Runtime | Status | Use it when |
|---|---|---|
| **Tokio** (multi-threaded, work-stealing) | The default; what SpacetimeDB itself builds on (LocalSet per database) | General services with mixed workloads, no shard-affinity requirement |
| **Tokio LocalSet / LocalRuntime, one per thread** | What SpacetimeDB actually does; what PulseBeam chose | Thread-per-core sharding **without adopting an exotic runtime** — take the architecture, not the brand |
| **compio** 0.19.2 (2026-08-18) | The only actively-shipping completion-based (io_uring-style) thread-per-core runtime | io_uring feature parity and file/fsync-heavy paths at scale |
| **glommio** | Dormant at DataDog (crates.io still 0.9.0, 2024-03-25); a hard fork at github.com/glommio/glommio is active (commits through 2026-09-25) but has **no crates.io release** | Only if you can depend on the fork's git repo — the crates.io artifact is ~2.5 years stale |
| **monoio** 0.2.4 (2024-08-20) / **tokio-uring** 0.5.0 (2024-05-27) | No release in 2+ years (monoio still takes commits, nothing ships) | Avoid for new designs |
| **Morsel-driven query engine** (DuckDB/KuzuDB/Umbra/CedarDB shape) | The analytical world's answer | CPU-bound query processing with skew and elasticity — do NOT shard |

Evidence behind the table:
- **Iggy (Apache)** evaluated and picked compio over monoio ("lacked io_uring
  feature parity and slow development") and glommio ("essentially
  unmaintained"). Their tokio→compio migration, single-vendor blog numbers
  (2026-02-27, 8 streams / 20 GB): P9999 latency **34 ms → 6.51 ms**; fsync
  throughput 843 → 992 MB/s (+18%) with P95 −45%. Root motivation: tokio's
  blocking-pool file I/O didn't scale — if you don't have their file-I/O shape,
  don't assume their result transfers.
- **PulseBeam** (2026-07-10, single-vendor) moved a Rust WebRTC SFU to
  thread-per-core using **Tokio `LocalRuntime` per thread** — explicitly *not*
  glommio/monoio/compio, "to avoid spending time chasing bugs at the async
  runtime level": P99.99 **70→10 ms**, +25% capacity. This is the shape of the
  thesis in 2026.
- **c410-f3r** (July-2026, independent, Ryzen 9 5900X, k6): no consistent
  winner among tokio/smol/glommio — though an EPT-style setup made his WTX top
  the HttpArena WebSocket benchmark after default Tokio scored ~8× lower.
  Single-host, single-author; treat as "runtime choice is workload-empirical",
  not a ranking.

Practical chooser:
1. Greenfield latency-critical service, natural shard key → Tokio with one
   `LocalRuntime`/`LocalSet` per pinned shard thread (SpacetimeDB/PulseBeam
   shape). Boring runtime, fast architecture.
2. File-I/O/fsync-bound at scale, io_uring wanted → compio (only actively
   shipped option).
3. Analytical / CPU-bound query engine → morsel-driven parallelism, not
   thread-per-core.
4. Everything else / no measured tail-latency problem → plain Tokio; revisit
   only when the contention math (Step 0) says a shared hot path is the
   ceiling.

## TigerBeetle in one paragraph (contrast case)

TigerBeetle is the contrasting sibling: a **single-threaded-per-replica** event
loop over a hand-written completion-only io_uring/kqueue/IOCP dispatcher;
**zero dynamic allocation** (all capacities fixed at startup); 128-byte-aligned
records; **8191 queries per message** (not 8192 — third-party write-ups are
wrong; room is left for a 128-byte header); one message in flight per client;
O_DIRECT plus io_uring registered buffers (NIC→CPU→disk DMA, no page-cache
copies); an LMAX-style single-writer core with **no locks or atomics in the hot
path**. Parallelism comes from batching (across time) and VSR replication
(across the cluster) — never from data-parallel thread pools inside a replica.
Single-threaded I/O is chosen *for determinism*, enabling their deterministic
simulation testing; the I/O code was adopted into Bun as `io_linux.zig`. Full
detail and the side-by-side with SpacetimeDB:
`references/spacetimedb-case-study.md`.

## Discipline

- Label vendor numbers as vendor numbers in anything you write; none of the
  TPS/latency figures in this skill were independently reproduced by the
  research underlying it.
- Adopt techniques in the order of the contention math: shrink the critical
  section → move I/O out of it → then partition, pool, and precompute.
- Re-benchmark after each change; the c410-f3r result is the standing warning
  that runtime/architecture wins are workload-specific.
- The file:line citations in the reference file are from a clone of
  clockworklabs/SpacetimeDB@master taken 2026-09-28 and will drift; re-derive
  them before quoting in user-facing output.
