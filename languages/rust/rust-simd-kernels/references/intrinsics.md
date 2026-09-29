# Arch intrinsics, target_feature, and runtime dispatch (ladder rung 3)

For hand-written `core::arch` kernels, C-intrinsic ports, and the
`#[target_feature]` safety model. Rust-side facts verified 2026-09-28 by
compile tests on rustc 1.98.1 stable / 1.100–1.101 nightly and toolchain
sweeps 1.72–1.98. The full per-arch stable/nightly table with tracking issues
lives in references/stability-matrix.md.

## The safety model — versions matter, and people get them wrong

- **UB rule**: calling a `#[target_feature(enable = …)]` function on a CPU
  without the feature is undefined behavior. wasm32 is the *documented
  exception*: unsupported features cause a module-load validation failure, not
  UB (Rust reference).
- **Safe fns may carry `#[target_feature]` since Rust 1.86.0** (2025-04-03,
  PR #134090). This is commonly mis-dated to 1.87 — it isn't; the bracket was
  compile-tested (rejected on 1.78/1.85, accepted on 1.88/1.98.1).
- **Since 1.87.0**: "Most std::arch intrinsics that are unsafe only due to
  requiring target features to be enabled are now callable in safe code that
  has those features enabled" (RELEASES.md words it as intrinsics "which don't
  take pointer arguments"). The `safe_unaligned_simd` crate wraps the rest.
  Read "safe" as *memory-safe given enabled features* — inside a
  `#[target_feature]` fn, most compute intrinsics no longer need `unsafe {}`.
- Compile-time `cfg(target_feature = "…")` is always available, any version.

## The dispatch skeleton (x86_64)

```rust
// The kernel body is ONE generic implementation with #[inline(always)]
// helpers — the two attributes cannot combine on the same fn (see below),
// so keep them on separate functions:
#[inline(always)]
fn kernel_body<V: Vector>(a: &[f32], b: &[f32], out: &mut [f32]) {
    // ... shared vector code, monomorphized per V ...
}

// #[target_feature] appears ONLY at the instantiation entry points:
#[target_feature(enable = "avx2")]
unsafe fn kernel_avx2(a: &[f32], b: &[f32], out: &mut [f32]) {
    kernel_body::<Avx2>(a, b, out)
}

pub fn kernel(a: &[f32], b: &[f32], out: &mut [f32]) {
    if std::is_x86_feature_detected!("avx2") {
        unsafe { kernel_avx2(a, b, out) }
    } else {
        kernel_body::<Scalar>(a, b, out)
    }
}
```

Rules that make this hold up:

- **Detect once, cache the result.** `is_x86_feature_detected!` "is somewhat
  slow… beneficial to detect available features exactly once and then cache
  the results" (2025 survey) — a `OnceLock`/`AtomicU32`, or a crate that does
  it for you (pulp's `Arch`, fearless_simd's `Level`, rten-simd).
- **`#[target_feature]` blocks inlining** — even of `a + b`. Every helper on
  the hot path needs `#[inline(always)]`, or "performance will plummet… watch
  the generated assembly turn into absolute horror show" (Shnatsel, shipped as
  fearless_simd v0.5). kouteiheika's rebuttal: `#[inline(always)]` cannot
  combine with `#[target_feature]`, you must annotate the whole call stack,
  and "any mistake… will just have the compiler silently not inline the
  intrinsics, completely killing your performance, and you're completely on
  your own debugging it". The memchr `Vector`-trait pattern
  (references/portable-simd.md) is the ecosystem's answer: generic kernel +
  `#[inline(always)]` inside, `#[target_feature]` only at the instantiation
  entry.
- **macOS x86 AVX-512 caveat**: `is_x86_feature_detected!` can false-negative
  there; rten-simd re-checks via `sysctlbyname("hw.optional.avx512vl/…")`
  (cites golang/go#43089). Steal that if you dispatch AVX-512 on macOS x86.
- A good in-the-wild exemplar to imitate: jxl-oxide — runtime-dispatched
  `#[target_feature(enable = "avx2", enable = "fma")]` / NEON kernels picked
  via `is_x86_feature_detected!` / `is_aarch64_feature_detected!`.

## x86_64

- Baseline is `fxsr, sse, sse2` (verified). The whole `avx512*` family
  (F/VL/BW/DQ/CD) — target features *and* intrinsics — is **fully stable
  since Rust 1.89.0 (Aug 2025)**; verified by compiling `_mm512_add_epi32`
  under `#[target_feature(enable = "avx512f")]` on stable 1.98.1.
- Still nightly: Intel AMX (`amx-tile`/`amx-int8`/… → #126622), AVX10.1/10.2
  (#138843), `apxf`, and the newer AMX variants (`amx-fp8`, `amx-movrs`,
  `amx-avx512`) that appear in rustc 1.98.1's target-feature list.
- Width policy in one line: prefer 256-bit on Intel; 512-bit pays on Zen 4
  (double-pumped but "still smoked" Intel), Zen 5 (native), and Ice Lake+
  Intel. Full history and the uops.info numbers:
  references/stability-matrix.md.
- AVX2 vs AVX-512 kernels often must differ structurally (multiply +
  horizontal-add vs convert + vertical-add) — plan for two bodies, not one
  parameterized one (ChillFish8, integer-compression library author).
- Mixing 128-bit baseline and 256-bit paths incurs AVX/SSE transition
  penalties (`vzeroupper`) — keep wide paths self-contained.

## aarch64

- NEON is **baseline and mandatory** on all 64-bit ARM; NEON intrinsics stable
  since 1.59; `is_aarch64_feature_detected!` stable since 1.60 (macOS via
  `sysctlbyname("hw.optional.arm.FEAT_*")`, Linux via
  `getauxval(HWCAP/HWCAP2)`).
- **Feature-attribute stability ≠ intrinsics stability.** The `fp16`, `bf16`,
  `dotprod`, `i8mm`, `aes`, `crc`, `sha2`, `lse` target-feature *attributes*
  are stable — but `vdotq_s32` (dotprod) only became stable in **1.98.0**,
  `vaddq_f16` (fp16) in **1.94.0**, and `vmmlaq_s32` (i8mm) is still nightly
  (stdarch_neon_i8mm #117223). Check the intrinsic, not the feature.
- Arm's documentation is a known hazard (ack_complete, HN): there is no
  portable CPUID equivalent, Arm is "terrible at documenting which intrinsics
  require specific FEAT_* flags" — "execution details had to be reverse
  engineered for Apple M1, and there is nothing for Oryon".
- **SVE/SVE2**: the `sve`/`sve2` target-feature attributes are stable
  (verified clean 1.72→1.98) but the *intrinsics* are nightly
  (stdarch_aarch64_sve #145052). On stable, SVE is reachable only through
  autovectorization: "SVE works with autovectorization as well, even on
  stable. Unfortunately, excluding pure asm this is currently the only way to
  use SVE in Rust" (top-voted r/rust comment; confirmed by compile test on
  1.98.1).
- **Prefetch gotchas** (all compile-tested):
  - `_mm_prefetch(p, _MM_HINT_T0/T1/T2/NTA/ET0)` is *declared* safe (stable
    since 1.27) and the CPU may ignore it — but calling it from ordinary safe
    code **does not compile**: it carries `#[target_feature(enable = "sse")]`,
    so the caller needs `unsafe {}` or its own `#[target_feature]` wrapper
    (E0133). "Safe" describes the declaration, not callability.
  - `core::intrinsics::prefetch` **no longer exists** (E0425 on nightly) — it
    was split into `prefetch_read_data` / `prefetch_write_data` /
    `prefetch_read_instruction` (still nightly-only; the renamed fns emit real
    `prfm`).
  - `core::arch::aarch64::_prefetch::<RW, LOCALITY>` exists on nightly behind
    `stdarch_aarch64_prefetch` (#117217). On **stable**, PRFM still needs
    inline asm: `core::arch::asm!("prfm pldl1keep, [{}]", ptr)`.
  - Guidance unchanged by the mechanics: hardware prefetchers cover linear
    scans; software prefetch earns its keep for *irregular but predictable*
    accesses (pointer chasing, hash-probe chains, indirection), and too much
    prefetching causes evictions.

## Apple AMX and SME — what "stable" doesn't cover

Apple's matrix coprocessor is outside core::arch and LLVM entirely (no `amx`
target feature for AArch64):

- **AMX verified reachable from plain unprivileged userspace**: the full
  corsix/amx test suite (23 instruction classes × 40 parameter values —
  LDX/LDY/LDZ, STX/STY/STZ, EXTR, MAC16, FMA/FMS 16/32/64, VECINT/VECFP,
  MATINT/MATFP, GENLUT) built with clang and **passed completely (exit=0)** on
  macOS 27 / M3 Max with no kernel opt-in. Access is hand-encoded `.inst` /
  inline asm. State ≈ 5 KB (8×64 B X + 8×64 B Y + 4 KB Z). Present A13→M4
  (M2 adds bf16; M3 adds ldx/ldy/matint modes; M4 relaxes some extrh/vecfp
  offset bits).
- **M4 did NOT replace AMX with SME2 — it added SME2 alongside AMX.**
  Third-party benchmark (eugenehp/amx-rs, M4 Pro VM): AMX at 1500 GFLOPS =
  92% of Accelerate's 1630 for 1024³ sgemm — vendor-run, not independently
  reproduced. Crates: `amx-sys`/`amx-rs` 0.0.3 (2026-03-20) — no crate named
  `amx` exists (yvt/amx-rs was never published).
- **SME on M4 is a streaming-mode reality**: M4 CPU cores have no regular SVE
  — SVE exists only in streaming (SSVE) mode entered via `smstart`/`smstop`;
  one SME coprocessor per CPU cluster (all cores contend; data moves via
  shared L2). The University of Jena team upstreamed SME codegen into LIBXSMM
  JIT (1755 GFLOPS on 512×512 FP32 GEMM, M4 — their number). This M3 Max
  reports `FEAT_SME: 0` via sysctl; SME code was compile-verified only there.
- **Rust's SME reach** (measured on nightly 1.101.0 / LLVM 23.1.1):
  `sme/sme2/sme2p1/sme-f64f64/…` are listed target features;
  `-C target-feature=+sme` compiles with only a warning today (hard error
  coming per rust#162235); `core::arch::asm!("smstart sm")` compiles;
  `#[target_feature(enable = "sme2")]` needs
  `#![feature(aarch64_unstable_target_feature)]` (#150244); **no SME
  intrinsics exist in core::arch at all**. The official 2026 Rust goal lands
  SVE intrinsics first, with SME only at "design exploration"
  (rust-lang/goals#270).
- If the job is BLAS-shaped on Apple Silicon, prefer Accelerate (AMX-backed)
  via bindings — see rust-simd-crates' numeric reference — over hand-rolling
  AMX.

## Porting C intrinsics

The cost model is one implementation per platform × per instruction set —
"That's a lot of code!" (2025 survey), with real-world pain examples:
safe_arch (multiversioning clash), zune-jpeg's `unsafe_utils_avx2.rs`,
jxl-rs's arcane macros. Port strategy that survives:

1. Keep the C source as the oracle: port one intrinsic cluster at a time and
   parity-test vector-by-vector against C output (or its spec vectors).
2. Map C flags to permissions, not behavior: `_MM_FROUND_*`, `#pragma`-level
   contraction and `-ffast-math` effects do **not** transfer — rustc does no
   FMA contraction; `mul_add` is the only route to `vfmadd`
   (references/autovectorization.md).
3. Replace `cpuid`-style guards with `is_x86_feature_detected!` (or
   `is_aarch64_feature_detected!`) and the cache-once pattern; on aarch64,
   confirm each intrinsic's own stability before porting it.
4. Structure as the memchr `Vector`-trait pattern or adopt pulp/
   fearless_simd's `kernel!`/`simd_type!` machinery rather than inventing a
   macro layer — jxl-rs's "arcane macros" are what hand-rolled layers decay
   into.
5. If the C is NASM/MASM assembly rather than intrinsics (rav1e's case), the
   honest options are `cc`-build the asm or rewrite as intrinsics —
   `core::arch` has no assembler story.

Before porting at all, check whether autovectorized Rust already ties the C
(references/autovectorization.md's calibration set) — careful pure-Rust can
match C SIMD for byte-oriented formats (lz4_flex's benches vs C lz4 are the
standard example, vendor-run).
