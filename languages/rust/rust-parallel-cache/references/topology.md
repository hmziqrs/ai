# CPU topology and cache hierarchy

How to read the real hierarchy on each platform, what it is on the research
host, and which crates see it correctly. Shard/tile sizing must come from
*this* data — never from an assumed flat "L3".

Provenance: Apple Silicon numbers are **[measured]** on the research host
(M3 Max, macOS 27, rustc 1.98.1), re-verified live 2026-09-29 by
`sysctl -a | grep -Ei 'perflevel|cachelinesize'`. x86 server data is
**[sourced]** from vendor specs/man pages — no Linux/x86 host was available
in any research session.

## Apple Silicon, measured (M3 Max)

Command:

```sh
sysctl -a | grep -Ei 'perflevel|cachelinesize'
```

Live readings on the research host (2026-09-29):

| Key | Value | Meaning |
|---|---|---|
| `hw.ncpu` / `hw.physicalcpu` | 16 / 16 | logical == physical → **no SMT** |
| `hw.nperflevels` | 2 | P + E |
| `hw.perflevel0.name` / `.physicalcpu` | Performance / 12 | 12 P-cores |
| `hw.perflevel0.l1icachesize` | 196608 (192 KiB) | per P-core |
| `hw.perflevel0.l1dcachesize` | 131072 (128 KiB) | per P-core |
| `hw.perflevel0.l2cachesize` | 16777216 (16 MiB) | **shared per 6 P-cores** |
| `hw.perflevel0.cpusperl2` | 6 | → 12 P-cores = **two 6-core clusters** |
| `hw.perflevel1.name` / `.physicalcpu` | Efficiency / 4 | 4 E-cores |
| `hw.perflevel1.l1icachesize` / `.l1dcachesize` | 128 KiB / 64 KiB | per E-core |
| `hw.perflevel1.l2cachesize` / `.cpusperl2` | 4 MiB / 4 | all 4 E-cores share one L2 |
| `hw.cachelinesize` | 128 | on both core types |

- **The cluster consequence**: two private 16 MiB P-cluster L2s (32 MB total
  across P-cores). A 12-shard P-pool spans two cache domains — any structure
  shared by all 12 shards lives twice-removed. Size shards per **6-core
  cluster**, not per chip.
- **No L3 is exposed.** Apple's system-level cache (SLC) does not appear in
  sysctl; the often-quoted **48 MB M3 Max SLC figure is community-measured**
  (RWT forum, 2024-02-19), not Apple-documented [community].
- **Legacy-key trap [measured]**: `hw.l1dcachesize` (64 KiB) and
  `hw.l2cachesize` (4 MiB) mirror the **E-core** values on this machine. Any
  code or crate reading the legacy keys silently sizes for the E cluster.
  Always read `hw.perflevelN.*`.
- `hw.optional.arm.FEAT_SME: 0` on this M3 Max (SME is M4+; irrelevant to
  threading but a reminder that perflevel-style probing beats assumptions).

## x86 servers [sourced]

Cache lines are 64 B on x86.

| CPU | L1d | L2 | L3 / LLC | Topology shape |
|---|---|---|---|---|
| AMD Zen 4 (Genoa) | 32 KiB (+32 KiB L1i) | 1 MiB per core | 32 MiB per **8-core CCX** | Cross-CCX traffic = cross-die latency *within* a socket; SMT2 siblings share L1/L2 |
| Intel Sapphire Rapids | 48 KiB | 2 MiB | ≤112.5 MiB | **Unified mesh LLC** — not per-CCX |
| Intel Granite Rapids (2024) | 48 KiB (64 KiB L1i) | 2 MiB | 3 MiB/core, ≤128 P-cores | Mesh LLC |

**AMD vs Intel nuance that changes shard sizing**: on AMD, the private-L3
boundary is the CCX — keep a shard's working set inside its CCX's 32 MiB.
On Intel SPR/GNR the L3 is a unified mesh shared by everything in the socket;
the Intel analogue of the CCX boundary is **sub-NUMA clustering (SNC)** —
detect it from the same `lscpu`/sysfs cache ids and steer with `numactl`.

## Querying topology

- **macOS**: `sysctl hw.perflevelN.*` (see table above). There is no
  `sched_getcpu`-equivalent for cheap core identity; affinity is refused
  anyway (SKILL.md § Affinity).
- **Linux** [sourced]:
  - `lscpu -C` (caches) and `lscpu -e` (per-CPU); valid columns via `lscpu -H`.
  - sysfs, per CPU and cache index:
    `/sys/devices/system/cpu/cpuX/cache/indexY/{level,type,size,coherency_line_size,shared_cpu_list}`
    — `shared_cpu_list` is the direct answer to "who shares this cache".
  - `/sys/devices/system/cpu/cpuX/topology/thread_siblings_list` for SMT
    siblings.
  - `numactl --hardware` for the NUMA node map.
  - `sched_getcpu()` (via vDSO, cheap) for NUMA-local decisions in
    first-touch paths.

## Topology/affinity crates (status 2026-09)

| Crate | Verdict | Why |
|---|---|---|
| `core_affinity` 0.8.3 | OK for plain pinning on Linux/Windows; **topology-blind** | Its macOS `get_core_ids()` returns `0..n` indices with no cluster/P-E awareness — a `CoreId` carries no topology meaning. For cluster-aware ids use hwloc (via `hwlocality`) or read sysfs yourself |
| `hwloc2` 2.2.0 (2020-05-22) | **Avoid** | Stale since 2020 and CPU-binding only — no memory-binding functions at all |
| `hwlocality` 1.0.0-alpha.12 (2026-04-05) | The maintained hwloc binding | Full CPU **and** memory binding (`bind_memory`, `allocate_bound_memory`, `bind_memory_area`, `MemoryBindingPolicy::{FirstTouch, Bind, …}`) — see `numa-pinning.md` |
| `raw-cpuid` 11.6.0 | x86 only | CPUID leaf 4 cache parameters |
| `gdt-cpus` 0.2606.1 (81K DL) | Apple Silicon P/E-aware | Reads `hw.perflevel{N}.physicalcpu`, hybrid P/E aware, affinity-with-graceful-skip (doesn't hard-fail where pinning is refused) |
| `qos-threads` 0.1.3 (2026-08) | Apple Silicon QoS | RAII `with_qos` wrapper |
| `eco-mode` 0.0.1 | Apple Silicon QoS options list | Named in the research report beside gdt-cpus/qos-threads with no further detail recorded — inspect before adopting |
| `darwin-kperf` (91K DL) | macOS PMU counters | The Rust route to kperf counters (see SKILL.md § Measuring) |

## Sizing rules that fall out

1. Read `shared_cpu_list` / `cpusperl2` before choosing a shard count — shard
   per **cache domain** (6-core P cluster on M3 Max, 8-core CCX on Zen 4,
   SNC node on Intel), not per socket or per chip.
2. A shared structure used by shards in two domains pays cross-domain traffic
   twice; replicate per domain and combine at the end when feasible.
3. Working set per shard should fit the domain's shared cache *minus* the
   streaming portion of the input.
4. On SMT parts, pin to physical cores first (siblings share L1/L2 and
   compete for execution units); only use both siblings when throughput
   matters more than per-thread latency.
