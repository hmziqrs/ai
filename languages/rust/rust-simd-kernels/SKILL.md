---
name: rust-simd-kernels
description: Write, port, and debug hand-written SIMD/vector kernels in Rust when crates and the autovectorizer are not enough. Use when the user asks "why didn't this vectorize" or "check if this loop vectorizes", wants to hand-write an AVX2/NEON/AVX-512/SVE/AMX kernel, port C intrinsics to Rust, use std::simd / core::simd / wide / pulp / fearless_simd / rten-simd / multiversion, add runtime dispatch with is_x86_feature_detected! or #[target_feature], verify vector codegen with cargo-show-asm / llvm-mca / LLVM remarks, or asks "is AVX-512 / SVE / AMX / SME stable in Rust yet". Does NOT fire on picking an existing SIMD-accelerated crate (that is rust-simd-crates), generic make-it-faster triage and benchmarking discipline (rust-superopt), rayon/cache/pinning (rust-parallel-cache), or service architecture (rust-fast-architecture).
---

# Rust SIMD kernels — write, port, and verify your own vector code

You are here because an existing crate does not cover the operation and the
compiler's autovectorizer is not enough. Work the intervention ladder below one
rung at a time, re-benchmarking after each, and stop the moment you hit the
target — every rung you climb adds code that must be maintained, ported, and
proved correct.

## Scope and routing

Hand-writing kernels is the last resort of the SIMD world. Route out first:

- "Is there a crate that does X with AVX2/NEON?", "faster JSON/hashing/
  UTF-8/base64/CRC" → **rust-simd-crates** (adopt before writing; runtime-
  dispatched stable crates cover most byte-shaped work).
- "Make this faster" with no vector angle yet → **rust-superopt** (it owns
  benchmark-first discipline, compute-vs-memory-vs-lock-vs-IO triage, and
  profiling; it routes back here when the lever is vectorization).
- "Parallelize with rayon", "false sharing", "pin threads", "E-cores" →
  **rust-parallel-cache** (SIMD within a chunk, threads across chunks).
- Thread-per-core / service design → **rust-fast-architecture**.

This skill owns: autovectorization diagnosis, portable-SIMD layer choice,
`core::arch` intrinsics, `#[target_feature]` + runtime dispatch, multiversioning,
C-intrinsic ports, and the per-ISA stability questions.

## Step 0 — confirm hand-written SIMD is the right answer

- **Check for a crate first.** memchr-class byte search, JSON, UTF-8, hashing,
  CRC, compression, FFT, BLAS all have runtime-dispatched stable crates (see
  rust-simd-crates). Hand-written kernels are for the operations nobody shipped.
- **Confirm the loop is compute-bound.** Wider vectors multiply arithmetic
  throughput; they do nothing for code waiting on memory, locks, or I/O. If a
  loop already streams at memory-bandwidth speed, rungs 2–3 cannot help — fix
  layout (rung 4) or leave it alone.
- **Respect the counter-case.** A practitioner rebuttal worth remembering
  (valarauca14, r/rust thread on the state of SIMD): compilers legitimately
  decline to vectorize because packing/unpacking, swizzling, loss of out-of-order
  execution from false dependencies, and cross-domain data movement have real
  costs. Sometimes the scalar code is not the enemy.

## The workflow spine

1. **Baseline.** Write a correct scalar reference and a criterion benchmark.
   The scalar version stays in the codebase forever as the parity oracle.
   Record the number. Benchmark release builds only.
2. **Inspect what LLVM already does** before writing any vector code:
   `cargo asm` (cargo-show-asm) or godbolt.org. Look for `vaddps`/`vmulps`
   (x86) or `fadd.4s`/`fmla` (aarch64). Vectorization only happens at
   opt-level 2+; Cargo's release profile defaults to 3, so plain
   `cargo build --release` already tries.
3. **Diagnose.** If not vectorized (or vectorized wrongly), get the reason with
   `-C remark=loop-vectorize` and fix the loop shape — see
   references/autovectorization.md. Community consensus: there is no mechanism
   to *guarantee* autovectorization, so verification is mandatory, not optional
   ("even something as simple as a dot product often fails to auto-vectorize" —
   Western_Objective209; autovec is "simply a nice surprise gift from the
   compiler" — iwxzr).
4. **Climb the ladder** (below) one rung at a time; re-benchmark after each.
5. **Verify correctness** — parity tests against the scalar oracle at lengths
   that are *not* multiples of the lane count, plus edge values (0, MAX, NaN
   for floats). Measurement and parity-test discipline live in
   rust-superopt's references.
6. **Verify the codegen in the shipped artifact.** Confirm the vector
   instructions appear in the final binary, and that distributable builds use
   runtime dispatch, not a hard ISA requirement.

## The intervention ladder (least → most invasive)

| Rung | Approach | Cost | Read first |
|------|----------|------|-----------|
| 0 | Compile flags: `-C target-cpu=native` (local only), `x86-64-v2/v3/v4` floor, LTO, `codegen-units=1` | ~zero | this file |
| 1 | Autovectorizer-friendly scalar rewrite | low | references/autovectorization.md |
| 2 | Explicit portable SIMD: `wide`/`pulp`/`fearless_simd`/`rten-simd` (stable) or `core::simd` (nightly) | medium | references/portable-simd.md |
| 3 | Arch intrinsics (`core::arch`) + `#[target_feature]` + runtime dispatch | high | references/intrinsics.md |
| 4 | Algorithmic/layout: SoA, blocking for cache, gather→restructure, tables | varies | this file + rust-parallel-cache |

**Rung 0 specifics.** `-C target-cpu=native` is fine for local experiments and
never for binaries that leave the machine ("crash or misbehave" on CPUs lacking
the features). The shippable middle ground between plain x86_64 and per-feature
enables is `-C target-cpu=x86-64-v2/v3/v4` — raise the whole baseline only when
you know the deployment floor (games now ship AVX2-hard; Windows 11's actual
floor is only SSE4/POPCNT). Project-wide flags belong in `.cargo/config.toml`
(`build.rustflags` or `target.'cfg(target_arch = "x86_64")'.rustflags`), never
in ad-hoc command lines. Details and gotchas: references/autovectorization.md.

**Rung 4 reminder.** Measured: gathers (`a[idx[i]]`) do not vectorize (zero
`vgather` emitted under `+avx2`). Survey-reported: LLVM sometimes
autovectorizes into scatter/gather that is 1.75× (Intel) to 4× (AMD) *slower*
than scalar — restructure the layout instead of forcing lanes.

## Stable vs nightly — the decision, 2026 edition

Stable Rust now covers far more of this space than folklore admits:

| Capability | Since | Notes |
|---|---|---|
| Autovectorization at opt-level 2/3 | always | verify it happened; see autovectorization.md |
| `core::hint::assert_unchecked` for length proofs | 1.79 | |
| Safe fns carrying `#[target_feature]` | **1.86** (2025-04-03, PR #134090) | commonly mis-dated to 1.87 |
| Most `std::arch` intrinsics callable in safe code (features enabled) | **1.87** | intrinsics "which don't take pointer arguments" |
| `slice::as_chunks` | 1.88 | the cleaner `chunks_exact` successor |
| AVX-512 `target_feature` **and** intrinsics (F/VL/BW/DQ/CD) | **1.89** (Aug 2025) | compile-verified on stable |
| Float reassociation opt-in: `algebraic_add()` etc. | **1.98** (2026-08-20) | unblocks float-reduction autovec |
| NEON intrinsics / `is_aarch64_feature_detected!` | 1.59 / 1.60 | aarch64 |
| `portable_simd` / `core::simd` | **nightly** | #86656, `needs-rfc`, API churning |
| SVE/SVE2 *intrinsics* | **nightly** | #145052 (attributes are stable) |
| SME/SME2 | **nightly** | #150244; no intrinsics module exists |
| Intel AMX, AVX10, RISC-V RVV intrinsics | **nightly** | #126622 / #138843 / #150257 |

Decision rule: **stable-first.** `wide`/`pulp`/`fearless_simd`/`rten-simd` +
`multiversion` + `algebraic_*` + (since 1.89) AVX-512 intrinsics cover nearly
every shippable kernel. Treat `core::simd` as a clearly-gated nightly sidebar:
the API is still churning (the `SimdFloat` import broke outright on nightly
1.100; re-verified still-moving on 1.101) — but if the user already runs
nightly, note that Chromium ships std::simd in production "trying to avoid the
least stable APIs", and one HN practitioner reports ~4 years on nightly
std::simd at "~20× my scalar code, 5× from just a naive translation".

The one-line nightly escape hatch on stable: SVE (and RVV) are reachable on
stable *through autovectorization only* — "excluding pure asm this is currently
the only way to use SVE in Rust" (top-voted comment, r/rust thread; borne out
by compile tests on 1.98.1, with the caveat that rustc warns about the
unstable `v` target-feature on stable for RVV).

## Platform facts that shape the kernel

- **x86_64 baseline is `fxsr, sse, sse2`** — nothing wider. Feature detection
  is an x86-only problem: 15% of x86 CPUs still lack AVX2 (Firefox survey);
  Steam survey shows 23.9% AVX-512. Shippable binaries therefore need
  `is_x86_feature_detected!` runtime dispatch, multiversioning, or a
  `x86-64-v3`-floor build decision.
- **aarch64: NEON is mandatory, 128-bit, and never wider.** No runtime
  detection needed for NEON itself; only extensions (dotprod, fp16, i8mm, SVE)
  need `is_aarch64_feature_detected!`. Survey assessment: NEON is ≈AVX2-quality
  (same base64 algorithm ran 1.5–2× faster on NEON than AVX2, 2× slower than
  AVX-512).
- **AVX-512 downclocking is essentially over on current silicon** — but know
  the history before recommending zmm on old Intel: pre-Ice-Lake Intel reduced
  the frequency of *all* cores during AVX-512 (Skylake-X stepped 4.65→4.0 GHz;
  fixed in Ice Lake 2019; AMD never had the issue). 2021 Alder Lake shipped
  AVX-512 firmware-disabled, and it was physically fused off in 2022 steppings.
- **Zen 4 executes 512-bit ops on 256-bit units** ("double-pumping") — measured
  at uops.info and documented in AMD's PPR 57647: VADDPS ymm at 0.50 CPI vs
  zmm at 1.00 CPI on Zen 4 (one retire-µop occupying its 256-bit pipe for two
  cycles); Zen 5 does zmm at 0.50. The survey's verdict: Zen 4 "still smoked"
  Intel anyway. Practical defaults: prefer 256-bit on Intel targets (gcc/clang
  default; rustc's `prefer-256-bit` is a codegen-only feature — it cannot be
  used in `cfg` or `#[target_feature]`); go 512-bit on Zen 4/5 and
  Ice Lake+ Intel.
- **Width surprises are real:** an HN datapoint reports f32x8 beating f32x4
  *even on 128-bit hardware*, and "For Zen 5 you probably want to use f32x32".
  Measure widths; don't assume lane-count = register-width.
- **Float gotchas travel with the silicon:** subnormal math is ~30× slower on
  Intel vs ~2× on AMD. Benchmark with realistic magnitudes.

## Picking a portable-SIMD layer (rung 2, stable)

| Crate | Dispatch | Pick it when | Watch out |
|---|---|---|---|
| `wide` 1.7.1 | build-time only | you control build flags, want lowest friction | fundamentally incompatible with multiversioning; trig precision "explicitly left unspecified" — its `sin()` ships "scalar implementations in a SIMD guise", "the cardinal sin" |
| `pulp` 0.22.3 | runtime (`Arch::new().dispatch`) | CPU kernels; proven by faer | native width only; sparsely documented; most verbose multiversioning |
| `fearless_simd` 1.0.0 | one-time `Level` token + `#[simd]` | all-in-one with built-in multiversioning | see COI note below; no trig; `simd: S` boilerplate; MSRV 1.89 |
| `rten-simd` 0.26.0 | runtime, `SimdOp` trait | plain stable multiversioning without a macro DSL | MSRV 1.94; ML-runtime provenance |
| `macerator` | runtime | you need element-type generics | tiny adoption, unproven; drops safe intrinsic access |
| `core::simd` | n/a | nightly-only | #86656; API churning |

**COI caveat (do not skip):** fearless_simd's chief promoter (Shnatsel) became
a maintainer of it, with the conflict disclosed in the 2026 survey edit; its
"up to 2×" benchmarks are maintainer-run and could not be independently dated
or verified. Do not present fearless_simd superiority as settled fact.
Independent adoption evidence cuts in its favor and is safe to cite:
memchr-n built on it "tends to outperform the rust memchr crate"
(BurntSushi/memchr#241), PhastFT moved std::simd→fearless_simd to reach
stable Rust, and the Philbin AEGIS library adopted the same token pattern.

**Avoid simdeez** (and the survey-excluded `magetypes`/`thermite`): the 2026
survey calls development "primarily AI-driven… disconcertingly buggy" — a real
correctness bug (arduano/simdeez#131: "Tests check for ULP<=35, not ULP<=3.5")
sits open.

Full internals, dispatch mechanics, and the multiversion crate (0.9 syntax
`#[multiversion(targets("x86_64+avx+avx2"))]`) are in references/portable-simd.md.

## When to stop

- **Stop at the target, not at the maximum.** Each rung costs maintenance;
  Amdahl caps the payoff; a 8× kernel that is 10% of runtime is ~1.1× overall.
- **Autovectorization is a complexity cap, not a contract:** "If something
  vectorizes today that doesn't necessarily mean it still will in a year from
  now." Track it in CI by grepping remarks or cargo-show-asm output for the
  kernels that must stay vectorized (recipe in autovectorization.md).
- **Raw intrinsics do not scale across the matrix.** Shnatsel's cautionary
  arithmetic: "an FFT library that has 3 algorithms for 5 instruction sets and
  2 types… added up to 30 mostly handwritten implementations. And I gave up
  trying to optimize that." If you are on rung 3 for more than 1–2 ISAs,
  re-read rung 2.
- **Benchmarks are the ultimate judge** — asm inspection and llvm-mca estimates
  rank candidates; criterion on the user's payloads decides.

## Reference files

- **references/autovectorization.md** — read for rung 1 and for any "why
  didn't/does this vectorize" question: opt-level rules, measured probe
  behaviors (incl. the f32-dot muls-vectorize/adds-scalar trap), no-FMA-
  contraction, `algebraic_*`, bounds-check folklore, `assert_unchecked`,
  chunks_exact/as_chunks, the `&mut`-iterator gotcha, toolchain and CI recipes.
- **references/portable-simd.md** — read for rung 2 and any crate from the
  table above: dispatch internals (pulp/fearless_simd/wide/rten-simd),
  multiversion 0.9 syntax and overhead, the memchr Vector-trait pattern and
  its six-point critique, the core::simd nightly section.
- **references/intrinsics.md** — read for rung 3, C-intrinsic ports, and all
  `#[target_feature]`/safety/detection questions: the 1.86/1.87/1.89 stability
  map, the UB rule and its wasm exception, aarch64 attribute-vs-intrinsics
  split, prefetch gotchas, Apple AMX/SME access.
- **references/stability-matrix.md** — read for "is X stable yet / what's the
  baseline on Y": per-arch baselines, the nightly tracking-issue table
  (AMX #126622, AVX10 #138843, SVE #145052, SME #150244, RVV #150257,
  portable_simd #86656), the runtime-detection matrix, downclocking/width
  policy, SVE2/SME architecture facts, the wasm relaxed-simd browser matrix.
