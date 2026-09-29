# Stability matrix — what Rust exposes per ISA, and how to detect it

The reference for "is X stable yet?" and "what's the baseline on Y?".
Rust-side facts verified 2026-09-28 by compile tests on rustc 1.98.1 stable /
1.100–1.101 nightly, toolchain sweeps 1.72–1.98, `rustc --print cfg /
--print target-features`, and rust-src greps. ISA claims closed against
primary sources are marked.

## Version timeline (the numbers people get wrong)

| Since | What |
|---|---|
| 1.27 | `is_x86_feature_detected!` (CPUID) |
| 1.59 | aarch64 NEON intrinsics |
| 1.60 | `is_aarch64_feature_detected!` |
| 1.79 | `core::hint::assert_unchecked` (length/alignment proofs for autovec) |
| 1.82 | wasm32 `relaxed-simd` intrinsics |
| 1.86 | **safe fns may carry `#[target_feature]`** (PR #134090) — not 1.87, a common error; also SSE2 required for i686 |
| 1.87 | most `std::arch` intrinsics callable in safe code given enabled features ("which don't take pointer arguments") |
| 1.88 | `slice::as_chunks` |
| 1.89 | **AVX-512 (whole avx512* family) target features + intrinsics**; LoongArch runtime detection |
| 1.93 | s390x runtime detection |
| 1.94 | `vaddq_f16` (fp16 NEON intrinsic) |
| 1.98 | `vdotq_s32` (dotprod intrinsic); **`algebraic_add()` etc. — float reassociation on stable** |

## Baselines per target (verify your own: `rustc --print cfg`)

- **x86_64**: `fxsr, sse, sse2` — verified; nothing wider, ever, by default.
- **i686**: SSE2 by default (since 1.86/1.87 it is *required*); pre-SSE2
  hardware means `i586-*` targets.
- **aarch64**: NEON mandatory and baseline. Target-specific extras exist —
  e.g. `dotprod` is in the `aarch64-apple-darwin` baseline (why a u8·u8 dot
  autovectorizes to `udot.4s` there); don't assume it elsewhere.
- **wasm32**: nothing vector by default — `simd128` and `relaxed-simd` are
  stable but **strictly opt-in** (`-C target-feature=+simd128`), and wasm has
  **no runtime detection** (two-binaries-plus-JS-detection is the documented
  pattern).
- **The middle-ground knobs**: `-C target-cpu=x86-64-v2/v3/v4` raise the
  whole baseline between plain x86_64 and per-feature enables — the shippable
  way to say "our fleet has AVX2" (v3) without runtime dispatch.

## Stable vs nightly per feature family (2026-09)

| Family | Status | Tracking issue / note |
|---|---|---|
| AVX-512 F/VL/BW/DQ/CD | **stable 1.89** | compile-verified `_mm512_add_epi32` on stable |
| SVE / SVE2 attributes | **stable** (verified 1.72→1.98) | attributes only |
| SVE / SVE2 intrinsics | **nightly** | x86… stdarch_aarch64_sve **#145052**; stable-SVE via autovec only (else asm) |
| SME / SME2 / sve2p1+ | **nightly** | aarch64_unstable_target_feature **#150244**; **no SME intrinsics module exists at all**; `-Ctarget-feature=+sme` warns today, hard error coming (rust#162235) |
| Intel AMX (`amx-tile`/`amx-int8`/…) | **nightly** | x86_amx_intrinsics **#126622** |
| AVX10.1 / AVX10.2 | **nightly** | **#138843** |
| `apxf`, `amx-fp8`, `amx-movrs`, `amx-avx512` | **nightly** | present in rustc 1.98.1's x86_64 target-feature list |
| RISC-V RVV | **nightly** | **#150257**; `core::arch::riscv64` contains **no RVV intrinsics module**; detection #111192; stable RVV via autovec carries a `-Ctarget-feature: v` *warning* on stable; the packed-SIMD **P extension is unratified** — nothing to target yet |
| `portable_simd` / `core::simd` | **nightly** | **#86656**, `needs-rfc`, no date; API churning (SimdFloat import broke on 1.100) |
| LoongArch LSX/LASX intrinsics | **nightly** | **#117427** (runtime *detection* is stable 1.89) |
| s390x intrinsics | nightly | #130869 (detection stable 1.93) |
| powerpc/powerpc64 intrinsics | nightly | #111145 |
| 32-bit Arm `is_arm_feature_detected!` | unstable | #111190 (NEON intrinsics in `core::arch::arm` exist) |
| wasm `simd128` / `relaxed-simd` intrinsics | **stable 1.82**, opt-in | no runtime detection; wasm is the documented exception to the target_feature UB rule (load-time validation, not UB) |

## Runtime detection matrix

| Macro | Status | Mechanism |
|---|---|---|
| `is_x86_feature_detected!` | stable 1.27 | CPUID |
| `is_aarch64_feature_detected!` | stable 1.60 | macOS `sysctlbyname("hw.optional.arm.FEAT_*")` / Linux `getauxval(HWCAP/HWCAP2)` |
| LoongArch | stable 1.89 | std_detect |
| s390x | stable 1.93 | std_detect |
| PowerPC / MIPS | nightly | #111191 / #111188 |
| RISC-V | nightly | #111192 |
| wasm | none | build-time only |

Compile-time `cfg(target_feature)` is always available on all of them.
macOS-x86 AVX-512 caveat: detection can false-negative; rten-simd re-checks
via `sysctlbyname` (golang/go#43089).

## Downclocking and width policy (the "is AVX-512 safe" answer)

- **History**: Skylake-X stepped 4.65→4.0 GHz under AVX-512 and pre-Ice-Lake
  Intel reduced the frequency of *all* cores; fixed in Ice Lake (2019); AMD
  never had the issue. 2021 Alder Lake shipped AVX-512 firmware-disabled
  (usable only with E-cores off) and it was **physically fused off in 2022
  steppings**. Later Intel server CPUs dropped fixed offsets.
- **Zen 4 double-pumping is measured fact, not inference** (uops.info; AMD's
  PPR 57647 documents the same numbers): VADDPS ymm at 0.50 CPI vs VADDPS zmm
  at 1.00 CPI on Zen 4 (same latency 3, 1 µop, same FP23 port) — a 512-bit op
  is one retire-µop occupying its 256-bit pipe for two cycles. Zen 5 does zmm
  at 0.50. Zen 5 has no fixed offsets (512-bit reg-reg FMA sustained ~5.7 GHz;
  the two fine-grained numbers — gradual IPC-driven backoff under sustained
  L1 loads, >100 ms recovery — are corroborated only at headline level and
  remain unverified in detail).
- **Policy**: prefer 256-bit on Intel targets (this is gcc/clang's default;
  rustc exposes `prefer-256-bit` — a *codegen* feature that "cannot be used
  in cfg or #[target_feature]"). Go 512-bit on Zen 4/5 and Ice Lake+ Intel;
  the survey's verdict on Zen 4 double-pumping was that it "still smoked"
  Intel anyway.
- **AVX10**: Revision 3.0 (March 2025) is the revision that made **512-bit
  the only vector length** — verified from Intel's own whitepaper PDF
  (356368-003US, created 2025-03-13): Rev 3.0 "Removed references to 256-bit
  maximum vector register size…"; secondary coverage attributing this to
  Rev 2.0 (which only removed the 32-bit mask-register limitation) is wrong.
  Corroborated by Intel's compiler team on gcc-patches (2025-03-19): "all the
  platforms will support 512 bit vector width".

## SVE/SME architecture facts (primary sources)

- **SVE2 is mandatory from Armv9.0-A; SME/SME2 are optional.** From LLVM's
  own `AArch64Features.td` (llvm-project main): `HasV9_0aOps.DefaultExts`
  includes FeatureSVE *and* FeatureSVE2; FEAT_SME is grouped under Armv9.2
  extensions, FEAT_SME2 under v9.3, and **neither appears in the default set
  of any base architecture through v9.7a**. rustc mirrors this
  (`("sve2", Stable, &["sve"])` vs unstable `sme`/`sme2`/`sme2p1`), and no
  built-in rustc aarch64 target enables sve/sme by default. (Arm's own ARM
  DDI 0602 was unreachable — developer.arm.com 403s — so LLVM + rustc are the
  primary sources here.)
- Survey's hardware reality check: SVE "in 2025 is still mostly on paper";
  SVE2 "pretty much useless" at current 128-bit implementations; RISC-V RVV
  irrelevant in 2026 (with pushback: SpacemiT K3 ships RVV 1.0 with vlen
  256/1024, SiFive X280 is in Google TPUs). A commenter's claim that SVE
  ships in the two latest Google Pixel and MediaTek CPU generations was not
  independently verifiable — treat as hearsay.
- **On Apple M4, SVE exists only in streaming (SSVE) mode** — M4 CPU cores
  have no regular SVE outside `smstart`/`smstop` (see references/intrinsics.md
  for the AMX/SME access mechanics).
- Rust's official 2026 goal (rust-lang/goals#270, "Sized Hierarchy and
  Scalable Vectors") lands SVE intrinsics first; SME is at "design
  exploration". The underlying language blocker: "Rust doesn't properly
  support unsized concrete types" (macerator's author, on why scalable
  registers don't fit the current trait system).

## wasm32 details

- `simd128` and `relaxed-simd` are both stable but strictly opt-in; no
  runtime detection; unsupported features fail at module-load validation —
  the documented exception to the target_feature UB rule.
- **Engine support for SIMD128**: Chrome/Edge 91, Firefox 89, Safari 16.4,
  Node 16.4 — universal.
- **relaxed-simd browser matrix (corrected from primary sources)**: Chrome
  114 (caniuse + MDN BCD agree; V8 always-on; chromestatus's own entry is
  stale); Firefox 145 (Bugzilla 1930192, fixed 2025-10-08; MDN BCD records
  146 — a one-version discrepancy between primaries); **no stable Safari
  supports it through Safari 27.0 (Sept 2026)** — Safari Technology Preview
  only since 2026-08-18. Do not assume relaxed-simd is safe for general web
  deployment.

## Survey hardware datapoints (for fleet decisions)

- 15% of x86 CPUs still lack AVX2 (Firefox survey — i.e. only ~75% have it);
  Steam survey: 23.9% AVX-512.
- Windows 11's actual instruction floor is only SSE4/POPCNT, not AVX2
  (swiftcoder/ack_complete); some games now ship AVX2-hard requirements
  (tancop).
- NEON ≈ AVX2-quality: the same base64 algorithm ran 1.5–2× faster on NEON
  than AVX2, and 2× slower than AVX-512 (survey figures).
- Subnormal math: ~30× slowdown on Intel vs ~2× on AMD.
- LLVM sometimes autovectorizes into scatter/gather that is 1.75× (Intel) to
  4× (AMD) slower than scalar — permission to vectorize is not always a win;
  check the asm (references/autovectorization.md).
