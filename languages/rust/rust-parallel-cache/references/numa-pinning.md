# Thread pinning and NUMA memory binding

Mechanics for keeping threads on cores and pages on nodes. Provenance: Linux
material is **[sourced]** from man pages and kernel docs (no Linux host was
available in any research session — verify flags on your target kernel);
Apple Silicon statements are **[measured]** on the research host; the rayon
pattern was **[verified]** compile-and-run on rayon 1.12.0 / rayon-core
1.13.0.

## What `core_affinity::set_for_current` actually does per OS

`core_affinity` 0.8.3 routes to:

| OS | Underlying call | Reality |
|---|---|---|
| Linux/Android | `sched_setaffinity(2)` | Real pinning; per-thread; takes effect immediately |
| Windows | `SetThreadAffinityMask` | Real pinning |
| macOS | `thread_policy_set(THREAD_AFFINITY_POLICY)` | Passes an affinity *tag* the scheduler may ignore; on Apple Silicon every `set_for_current` call returns `false` and the direct call returns **KERN_NOT_SUPPORTED (46)** [measured, re-verified by direct C call]. The SDK header itself calls the policy "experimental… a hint to the scheduler" |

Caveat from `references/topology.md`: `core_affinity`'s CoreIds are
topology-blind (plain `0..n` on macOS) — combine with hwlocality or sysfs
when the *set* of cores matters (clusters, CCXs, SMT siblings).

## Verified rayon pinning pattern

```rust
// [verified] compiles and runs on rayon 1.12.0 / rayon-core 1.13.0
// (2026-09-29). On Linux: worker i is pinned to cores[i]. On Apple Silicon
// macOS the pin call is declined by the OS (returns false) and the pool
// still builds and computes correctly — don't treat the bool as fatal there.
use rayon::ThreadPoolBuilder;

let cores = core_affinity::get_core_ids().expect("core ids");
let pool = ThreadPoolBuilder::new()
    .num_threads(cores.len())   // 0 = one worker per logical CPU
    .start_handler(move |idx| {
        // Runs on the worker thread itself at start — pin AND do any
        // per-worker/NUMA first-touch allocation here (see below).
        core_affinity::set_for_current(cores[idx]);
    })
    .exit_handler(|_idx| { /* matching cleanup if you allocated */ })
    .build()
    .unwrap();
```

- `start_handler`'s argument is the **worker index** (0..num_threads), which
  is how you index your core list.
- `spawn_handler` (full thread control: stack size, name, scoped init) is a
  **safe** fn on rayon-core 1.13.0 — `FnMut(ThreadBuilder) -> io::Result<()>`;
  the closure spawns an OS thread that calls the safe `ThreadBuilder::run()`
  (verified by compiling and running a spawn_handler pool from 100% safe
  code). Prefer `start_handler` unless you need spawn-time parameters.
- For Apple Silicon workers you cannot pin — set QoS in the same
  `start_handler` instead (SKILL.md § Affinity).

## CLI-level control (Linux) [sourced]

```sh
taskset -c 0-3 ./bench            # pin whole process to CPUs 0–3
numactl --physcpubind=0-3 ./svc   # CPU binding, NUMA-aware
numactl --cpunodebind=0 --membind=0 ./svc   # CPU + memory node binding
numactl --interleave=all ./stream # round-robin pages across all nodes
```

Useful when benchmarking someone else's binary or A/B-testing placement
without code changes.

## NUMA policy semantics [sourced — mbind(2)/set_mempolicy(2) semantics]

- **Default policy is first-touch** (`MPOL_LOCAL`): a page is allocated on
  the node of the CPU that faults it in — in practice, the node of the CPU
  that first *writes* it after mapping.
- Consequence: **the thread that will own data should allocate and
  initialize it.** Do per-worker initialization inside the worker (e.g. in
  rayon's `start_handler`) so pages touch on the right node.
- **Policy affects only pages first written *after* it is set** — setting a
  binding policy does not migrate already-touched pages.
- **`MAP_SHARED` mappings ignore the policy.**
- Interleave (`--interleave=all` / `MPOL_INTERLEAVE`) is for pure-bandwidth
  streaming, effective at ~1 MB+ accesses; it trades locality for aggregate
  bandwidth.
- Post-mortem: `/sys/devices/system/node/node*/numastat` shows hit/miss
  percentages per node.

## Rust API routes for memory binding

1. **`libc` has no wrappers.** libc 0.2.189 exposes only the
   `SYS_set_mempolicy`/`SYS_mbind` syscall-number constants and the
   `MPOL_*` policy constants — call the raw syscalls yourself:

   ```rust
   // Sketch of the raw route; argument order/meaning follows mbind(2).
   // Verify flags on your target kernel — this path is docs-sourced.
   let rc = unsafe {
       libc::syscall(
           libc::SYS_mbind,
           addr,                       // page-aligned start
           len,                        // bytes
           libc::MPOL_BIND as i32,     // or MPOL_INTERLEAVE / MPOL_PREFERRED…
           nodemask_ptr,               // pointer to an unsigned long mask
           maxnode,
           0,                          // flags (e.g. MPOL_MF_MOVE to migrate)
       ) as i32
   };
   ```

2. **`hwlocality`** 1.0.0-alpha.12 (2026-04-05) — the maintained hwloc
   binding, with real memory-binding APIs: `bind_memory`,
   `allocate_bound_memory`, `bind_memory_area`, and
   `MemoryBindingPolicy::{FirstTouch, Bind, …}`. Prefer this over raw
   syscalls unless you want zero extra deps. (`hwloc2` 2.2.0 is stale since
   2020 and has **no** memory-binding functions — don't reach for it.)

3. **Name-collision warning**: the crate named `numa` on crates.io (0.24.0,
   2026-09-28) is a **DNS resolver for `.numa` local domains**, not libnuma
   bindings. Actual libnuma-flavored options: `numanji` 0.1.5 (2020),
   `numalloc` 0.1.3, `numa-shim` 0.2.0 — all small/old; hwlocality is the
   actively maintained choice.

## Transparent huge pages and tail latency [sourced]

THP trades TLB coverage against compaction stalls:

- Recommended pattern for tail-latency-sensitive per-core designs: set THP to
  `madvise` mode and apply **explicit `MADV_HUGEPAGE` on pre-faulted per-core
  arenas** — you get TLB coverage where you want it without global
  compaction stalls.
- The canonical cautionary case is **Redis**: its guidance says "disable
  transparent huge pages" — fork + copy-on-write of huge pages causes big
  latency spikes (a COW fault on a 2 MiB page touches 2 MiB, not 4 KiB).
- If your service forks (or you snapshot via fork), test with THP both ways
  before assuming huge pages help.

## Checklist for a pinned, NUMA-local worker pool

1. Query the real topology (clusters/CCX/SNC — `references/topology.md`).
2. Decide threads-per-domain; leave cores for the OS/IRQ on dedicated
   machines (partitioning by thread class is a service-architecture decision
   — `rust-fast-architecture`).
3. Pin each worker via `start_handler` (Linux) or set QoS (Apple Silicon).
4. Allocate + first-write each worker's working set **inside** the worker.
5. Use `mbind`/hwlocality only when first-touch isn't expressive enough.
6. Verify with `numastat` (Linux) or per-cluster timing (Apple Silicon);
   re-measure in-session, ratio-style.
