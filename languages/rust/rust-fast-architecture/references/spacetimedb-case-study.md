# SpacetimeDB case study — how an extremely fast Rust system actually works

Evidence base (from the research report, §2.8/§2.9, 2026-09-29): the blog posts
"Ok, but does it scale?" and "Benchmarking" (spacetimedb.com), docs v1.12.0,
and **direct inspection of a shallow clone of clockworklabs/SpacetimeDB@master
taken 2026-09-28**. All `file:line` citations refer to that snapshot and will
drift — re-derive before quoting. All TPS/latency numbers are
**vendor-published, not independently reproduced**.

## 1. The thesis: contention math

(SpacetimeDB's published reasoning, not a measurement by this research.)

- A ~3 µs single-core critical section admits ~300,000 TPS on a hot key; a
  ~1 ms distributed critical section admits ~1,000 TPS — "the single-threaded
  solution is 300x more scalable".
- With 1% contending transactions and 1 ms commits, any horizontally scalable
  cluster is capped at `(1/1ms)/1% = 100,000 TPS` regardless of core count.
- Horizontal scalability is "primarily a property of the workload"; cluster
  beats single-core only with zero contention AND >$3,600/month spend.

## 2. Execution model

- Each database is an actor on **one OS thread running a Tokio LocalSet** —
  `SingleThreadedExecutor`, `crates/core/src/util/jobs.rs:17-30` and
  `:282-362`.
- All state behind **one `Arc<RwLock<CommittedState>>`** — `datastore.rs:64`.
- **Early MVCC-based parallel execution was measured and removed** —
  single-threaded "flat out outperformed"; they estimate the lesson cost over
  $1m. The single most important negative result in the codebase.
- Commit does **early lock release**: durability is enqueued *while the write
  lock is still held*, then the lock is **downgraded write→read** so
  subscription evaluation overlaps the next writer — `datastore.rs:1030-1039`,
  `relational_db.rs:895-909`.

## 3. Threading and core partitioning

- `CoreReservations` partitions cores by thread class — **databases 1/8,
  tokio workers 4/8, rayon 1/8, IRQ 2, OS 2** — `startup.rs:224-234`.
- Pinning engages only when **≥10 cores** and the **non-default
  `core-pinning` feature** is enabled — `startup.rs:331-341`. The feature is
  enabled in neither core nor standalone Cargo.toml, so whether *their
  production builds* pin is unconfirmed.
- Pinning is **non-macOS, not Linux-only**: `apply_compute_thread_hint`
  (`util/thread_scheduling.rs:5-19`) is `#[cfg(not(target_os = "macos"))]` —
  it pins on Linux, Windows and BSDs. Only the tokio blocking-core CpuSet
  handling is Linux-specific. (macOS has no user-space core pinning at all —
  see the rust-parallel-cache skill for that platform's QoS-only reality.)
- An upstream doc comment says "less than 8" cores while the code checks ≥10 —
  follow the code.
- Rayon runs as a **pinned global pool with the Tokio handle entered**; rayon
  threads "must never actually block".
- Databases round-robin onto cores with **live migration** for load balancing:
  `LoadBalanceOnDropGuard` steals from the busiest core.

## 4. Storage: the paged row store

- Custom in-memory paged store: **64 KiB pages** (`PAGE_SIZE = 65536`) with
  64-byte headers; fixed-length row section + variable-length granule section
  with **O(1) freelist** recycling.
- Var-len objects >16 granules spill to a **content-deduplicating blob store**.
- Indexes: B-tree (std `BTreeMap`-backed) and hash indexes.
- **jemalloc** as global allocator, with 512 KB-sampled profiling.
- **Page pool defaults: 128 pages of 64 KiB = 8 MiB** (`page_pool`).

## 5. Serialization = memcpy

- A **`StaticLayout` precomputed per row type** makes BFLATN↔BSATN conversion
  **1–2 `copy_from_slice` calls** that skip padding — `static_layout.rs:1-27`.
- **BSATN** is fixed-width, little-endian, **no field names** — the wire format
  is designed so encoding is a copy, not a parse.

## 6. Maps and collections

- Maps are hashbrown+ahash with **identity hashing for integer keys**
  (`nohash_hasher`); `SmallVec` everywhere. Skip work (hashing, heap
  allocation) that the data shape lets you skip.

## 7. Durability: write-behind group commit

- Commit **enqueues to an async channel inside the critical section** and
  returns; a background actor drains with `recv_many`, writes the batch on
  `spawn_blocking`, issues **one `flush_and_sync` per batch**, and publishes
  the durable offset on a `watch` channel — `durability/src/imp/local.rs:269-311`.
- Snapshots (`crates/snapshot`): on-disk snapshots of committed state at a
  transaction offset, so restart replays only the commitlog suffix.
- Broadcast path uses an **`AdaptiveUnboundedReceiver`** with a **25 µs
  baseline linger doubling to 200 µs** while work keeps arriving.
- **Fanout**: `BsatnRowListBuilderPool::try_put` reclaims a `BytesMut` only on
  the **last** client, because encoded update buffers are **refcount-shared
  across clients** subscribing to the same query — encode once, fan out by
  Arc.

## 8. Execution engines (wasmtime and V8)

- **Separate sync wasmtime engine** so main-lane reducers avoid fiber
  overhead; the async engine is reserved for genuinely suspending operations.
  **wasmtime pinned at 39**, cranelift `OptLevel::Speed`.
- Fiber stacks (**2 MiB**) pooled via a crossbeam `ArrayQueue`; `BytesMut`
  builders of 4 KiB pooled with a 1024-buffer / 4 MiB cap.
- **A second execution engine: an embedded V8 host** for JavaScript modules
  (`crates/core/src/host/v8/`, `v8 = "=145.0.0"`) — a single main-lane worker
  thread per database owning one isolate plus a bounded pool of exclusive
  procedure instances, with inline isolate replacement after traps/heap
  retirement. Since the headline 303,920 TPS was set by the *TypeScript*
  client, part of the benchmark story runs through V8, not wasmtime.
- Energy metering is **pluggable** (`EnergyMonitor`/`FunctionBudget`,
  `core/src/energy.rs`) wrapping `consume_fuel` + epoch interruption — not
  just two wasmtime flags.

## 9. What they DON'T use (negative results)

- **No SIMD and no io_uring anywhere in the codebase** — grep-verified. io_uring
  exists only as a TODO comment inside an "Experiment" block with
  `O_DIRECT|O_DSYNC`.
- **The one SIMD decision in the codebase is a deferral**:
  `crates/commitlog/src/varint.rs:15,19` mentions the `varint-simd` crate as a
  possible future optimization and defers it — even at ~300k TPS they do not
  consider SIMD the lever. (Route SIMD questions to rust-simd-crates /
  rust-simd-kernels; architecture was the multiplier here.)
- Rayon only on the read path (subscription `par_iter` + websocket-message
  encoding via `spawn_rayon`) and wasmtime parallel compilation.
- A shipped guard against accidental O(n) scans: the default-on
  `unindexed_iter_by_col_range_warn` feature.

## 10. Release profile

opt-level 3, thin LTO, codegen-units 16, overflow-checks false. (Release-
profile guidance beyond this belongs to rust-superopt.)

## 11. Benchmarks and methodology (all vendor numbers)

On one i9-14900K (24 vCPU):

- **~303,920 TPS** (TypeScript client, contended α=1.5); **~265,541 TPS**
  (Rust client); **~279,025 TPS** uncontended.
- **p50 ~8.08 ms / p99 ~12.9 ms are the α=0 (uncontended) latencies**; at
  α=1.5 they are 7.39/11.7 ms.
- Comparators on the same machine: Bun+Postgres 10,730 TPS; Node+Postgres
  9,905 TPS; CockroachDB 5-node 4,253 TPS (α=0), "did not complete" under
  contention.
- Giving competitors 40-deep pipelining raised their latency per Little's Law
  without raising throughput.
- They honestly published an earlier SQLite benchmark bug (UPDATEs never
  executed; corrected to ~3.2k TPS).
- Discipline worth copying: criterion microbenches vs an in-tree SQLite
  baseline; **iai-callgrind instruction-count benchmarks** (a clockworklabs
  fork) for low-variance regression detection; a **CI perf gate**
  (median-of-31 index-scan reducers must stay ≤100 µs); benchmark validation
  against **Little's Law**; Tracy + Prometheus + jemalloc pprof in production.

## 12. Replication and cloud — proprietary, blog-described only

- Pipelined distributed state machine replication reportedly matching
  unreplicated throughput (~300k TPS) — not verifiable from the open source.
- Planned read replicas get linearizable reads via leader-assigned log
  positions ("the leader's only cost is handing out sequence numbers").
- IDC sharding and tiered storage slated 2026-10-31 (per the blog roadmap).

Do not present §12 internals as open-source-verifiable facts.

## 13. TigerBeetle — the contrasting sibling

(All from TigerBeetle's primary blog posts, fetched 2026-09-29; numbers are
vendor/design statements.)

- **Single-threaded-per-replica event loop** over a hand-written
  **completion-only io_uring/kqueue/IOCP dispatcher**. Stated rationale:
  "It is also best for determinism… enables us to do Deterministic Simulation
  Testing". The I/O code was adopted into Bun as `io_linux.zig`.
- **Zero dynamic allocation** — all capacities fixed at startup.
- **128-byte-aligned records**.
- **8191 queries per message** — leaving room for a 128-byte header;
  third-party write-ups saying 8192 are wrong.
- **One message in flight per client.**
- **O_DIRECT + io_uring registered buffers** — NIC→CPU→disk DMA with no
  page-cache copies.
- **LMAX-style single-writer core: no locks, no atomics in the hot path.**
- Parallelism comes from **batching (across time) and VSR replication (across
  the cluster), never from data-parallel thread pools inside a replica**.

### Side-by-side with SpacetimeDB

| Dimension | SpacetimeDB | TigerBeetle |
|---|---|---|
| Unit of serialization | One database = one actor on one thread, one RwLock | One replica = one event-loop thread, no locks |
| I/O model | Tokio + write-behind group commit (std fs, no io_uring) | Hand-written io_uring/kqueue/IOCP, O_DIRECT, registered buffers |
| Allocation | jemalloc + heavy pooling (pages, stacks, builders) | Zero dynamic allocation after startup |
| Batching | Group commit per batch; adaptive linger 25→200 µs | 8191 queries per message; one message in flight per client |
| Parallelism | Across databases/cores (partitioned, live-migrated) | Across time (batching) and cluster (VSR replication) |
| Determinism | Architectural lever, `dst` simulation-testing crate | The stated reason for the single-threaded I/O loop |
| Engine complexity | wasmtime + V8 hosts | None — no embedded compute engine |

The shared lesson: both systems make **one writer own the data** and get
their parallelism from somewhere other than contended threads — SpacetimeDB
across databases, TigerBeetle across time and replicas.
