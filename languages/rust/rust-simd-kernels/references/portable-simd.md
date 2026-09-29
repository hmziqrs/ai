# Portable SIMD layers — pick and use (ladder rung 2)

Covers the explicit-vector crates on stable, `core::simd` on nightly, the
`multiversion` crate, and the hand-rolled dispatch pattern the ecosystem
converged on. Survey provenance: Shnatsel's "state of SIMD in Rust" 2025
article + 2026 follow-up, the complete r/rust thread, four HN threads, and
Round-1 crate-internals reviews (2026-09). Download counts are crates.io
totals as of 2026-09-29.

## The stable landscape

| Crate | Version (date) | Dispatch model | DLs | The load-bearing facts |
|---|---|---|---|---|
| `wide` | 1.7.1 (2026-09-14) | **build-time only** — "does not work with wide" for runtime detection; x86 defaults SSE2, wasm needs `+simd128` | 76.09M | "Near drop-in replacement for std::simd"; explicit MSRV policy (1.89); depends on safe_arch on x86 and bytemuck. **Fundamentally incompatible with multiversioning** — work around lack of generics with `macro_rules!`. Trig precision "explicitly left unspecified"; its `sin()` is called out as "shipping scalar implementations in a SIMD guise… the cardinal sin". Its own author (Lokathor): "Ugh don't *tell* people about the `wide` crate or they might actually use it." |
| `pulp` | 0.22.3 (2026-06-20) | **runtime** — `Arch::new().dispatch(...)`, `WithSimd` trait, `with_simd!` macro (pulp-macro dep) | 26.55M | Powers **faer** (faer pins pulp 0.22.2 with `x86-v3` default; `x86-v4` only inside faer's `nightly` feature; rayon optional but on by default). Safe abstraction over core::arch; **native SIMD width only** (kernels must handle variable-width chunks); f32+f64 means duplication; only NEON/AVX2/AVX-512 (only ~75% of Firefox-survey systems have AVX2); fixed-width vectors "technically possible, but completely undocumented and quite awkward"; **sparsely documented** (don't quote a docs-coverage number); most verbose multiversioning. Uniquely enables safe non-level intrinsics (e.g. `_mm_aesenc_si128`) via `simd_type!` — "the best (and only) way to do it safely". Maturity datapoint: Shnatsel contributed fixes including a soundness bug while researching. |
| `fearless_simd` | 1.0.0 (2026-09-21) | one-time `Level` token + `#[simd]` attribute; internals below | 6.55M | Linebender (repo linebender/fearless_simd; maintainers Laurenz Stampfl + Shnatsel); MSRV 1.89, edition 2024, ~99.6k lines, zero-dependency no_std core. "All-in-one": multiversioning built in; orders of magnitude less unsafe. Gaps: explicit `simd: S` boilerplate, no trigonometry. **COI caveat below.** |
| `rten-simd` | 0.26.0 (2026-08-29) | runtime, trait-based | — | From the RTen ML runtime; "inspired by Google's Highway and the pulp crate"; **manual multiversioning on stable Rust** — a `SimdOp { fn eval<I: Isa> }` trait with `#[target_feature]` inner fns; dispatch ladder aarch64-NEON → x86_64 AVX-512(f/vl/bw/dq+f16c) → AVX2(+fma,f16c) → wasm simd128 → generic; MSRV 1.94. Notable: re-checks AVX-512 on macOS via `sysctlbyname("hw.optional.avx512vl/…")` because `is_x86_feature_detected!` can false-negative there (cites golang/go#43089). |
| `macerator` | (pulp fork) | runtime | tiny | Split from pulp over type-generic usability: pulp's per-register associated types make type-generic wrappers hard; macerator uses a single untyped register type. Adds element-type generics, f16, all x86 + WASM + NEON + LoongArch; drops safe intrinsic access and most documentation. 8 reverse-deps (burn family + RUDA crates) — "oddly obscure and therefore unproven". SVE-blocked because "Rust doesn't properly support unsized concrete types". |
| `vek` | 0.17.2 (2025-09-23) | **none, ever** | 1.24M | On stable, vek is `#[repr(C)]` structs with macro-generated per-lane scalar ops relying on autovectorization — no runtime detection, no core::arch intrinsics anywhere in src. Real SIMD only on nightly + non-default features (`repr_simd`, `platform_intrinsics`); non-power-of-two Vec3 is forced `#[repr(C)]`. Treat as convenience 2D/3D math, **not** a SIMD toolkit. |
| `simdeez` | 3.0.1 (2026-03-25) | runtime + compile-time | 0.29M | **Do not recommend.** 2026 survey: "development is primarily AI-driven… disconcertingly buggy"; real correctness bug arduano/simdeez#131 ("Tests check for ULP<=35, not ULP<=3.5", open since 2026-08-31); README admits only i32/i64/f32/f64 are "well fleshed out". The 2026 survey also excludes `magetypes` and `thermite` (AI-driven) and `jxl_simd`/`pathfinder_simd` ("not intended for a general audience"). |

The "fancy iterators" approach is dead: the one crate taking it (`faster`) has
been abandoned since 0.5.2 (2021-03-25).

## The fearless_simd COI caveat — do not skip

The 2026 survey recommends fearless_simd as the all-in-one default — but its
author became a fearless_simd maintainer, disclosed only in an editor's note on
an article revision that could not be dated or verified against any archive
capture. Its headline benchmarks ("up to 2× faster") are maintainer-run.
**Do not present fearless_simd's superiority as settled fact; present it as a
strong option and let the user's benchmark decide.** What *is* independently
verifiable and safe to cite:

- **memchr-n** (Dr_Emann, BurntSushi/memchr#241): built on fearless_simd,
  "tends to outperform the rust memchr crate".
- **PhastFT** 0.4.1 moved std::simd → fearless_simd specifically to reach
  stable Rust (100% unsafe-free FFT, power-of-two sizes).
- **Philbin** (val.markovic.io, 2026-09-28): pure-Rust AEGIS AEAD with two
  unsafe lines total, built on the "CPU feature tokens" approach the
  fearless_simd team pioneered.

## fearless_simd internals (what you are adopting)

From source review (Round 1):

- `Level` is a non-exhaustive enum of **zero-sized capability tokens**.
  `Level::new()` detects once on x86 — an Ice-Lake AVX-512 test that is a
  34-feature conjunction sourced literally from `rustc --print=cfg -C
  target-cpu=icelake-server`, then x86-64-v3, v2, SSE2+fxsr, fallback —
  cached in an `Aligned128<LazyLock>`. Non-x86 targets use statically known
  baselines.
- The x86 ladder: SSE2 / SSE4.2 / AVX2 plus **two AVX-512 tiers** (early-slow
  vs Ice Lake+ — downclocking-aware); NEON + extension levels on ARM; scalar
  fallback only on 32-bit x86.
- `dispatch!(level, simd => expr)` monomorphizes the expression per compiled
  level, with binary-size opt-outs (`--cfg disable_dispatch_sse2|sse4_2|
  avx2|avx512`).
- Audited unsafe surface: `assume_supported()` const fns carrying
  `#[target_feature]`; a `kernel!` macro that makes raw intrinsics safe inside
  a wrapped safe fn (it rejects `unsafe fn` bodies); an internal bytemuck-style
  `SimdPod` transmute layer.
- **Its multiversioning "is controlled by whoever builds the final binary"** —
  an end-user-build-flags property that matters for library authors (the
  inverse of sonic-rs's build-flag gotcha).

## The `multiversion` crate (0.9.0)

Syntax — **compile-tested on 0.9.0**, and the old positional form no longer
compiles (it was 0.7-era):

```rust
#[multiversion::multiversion(targets("x86_64+avx+avx2"))]
fn kernel(a: &[f32], b: &[f32]) -> Vec<f32> { /* ... */ }

// or let the crate pick the target list:
#[multiversion::multiversion(targets = "simd")]
fn kernel2(a: &[f32]) -> f32 { /* ... */ }
```

Facts that shape usage:

- **Per-call detection** — each call re-checks features ("a little bit of
  overhead", about a dozen instructions). No `self`/`Self`/impl-Trait returns.
- The 2026 survey's rule of thumb, verbatim: **"if your function has a loop in
  it, add #[multiversion]; if it processes a handful of values add
  #[inline(always)], so long as there is #[multiversion] somewhere up the call
  chain."** Keep the multiversioned function coarse-grained (loops, not leaf
  ops).
- The oft-repeated "inlining hazards" complaint does not exist in the issue
  tracker (all 58 issues reviewed) — the real, surveyed cost is the per-call
  dispatch overhead above.
- `multiversion` "works great with autovectorization" (2025 survey) — the
  attribute supplies the ISA permission, LLVM does the vectorizing.
- **cargo-multivers** (whole-binary multiversioning) "only works for
  long-running programs" — it duplicates the binary per target; not a general
  answer.

## The memchr pattern — hand-rolled dispatch done right

What ripgrep/memchr actually does (burntsushi, HN), when you want rung 2/3
without a crate:

```rust
// One kernel body, generic over the vector type:
trait Vector: Copy {
    unsafe fn splat(byte: u8) -> Self;
    unsafe fn load_unaligned(ptr: *const u8) -> Self;
    unsafe fn cmp_eq(self, other: Self) -> Self;   // -> mask
    unsafe fn movemask(self) -> u64;               // arch-specific
    // ...
}

// Every helper is #[inline(always)]...
#[inline(always)]
fn memchr_generic<V: Vector>(haystack: &[u8], byte: u8) -> Option<usize> {
    // ... one implementation ...
}

// ...and #[target_feature(enable = ...)] appears ONLY at the instantiation
// entry points, one per ISA:
#[target_feature(enable = "avx2")]
unsafe fn memchr_avx2(h: &[u8], b: u8) -> Option<usize> { memchr_generic::<__m256i>(h, b) }
```

- burntsushi: "ripgrep wouldn't be as fast as it was if it weren't possible to
  use SIMD on stable Rust".
- **The portable-movemask hole is real**: "There's no optimal portable
  `movemask`… aarch64 NEON doesn't have it" — byte-masking idioms need a
  per-arch strategy.

**The strongest anti-hand-SIMD case on record** — kouteiheika's six-point
rebuttal, the parts the record relays:

1. `#[inline(always)]` cannot combine with `#[target_feature]`.
2. You must annotate the whole call stack, not just the entry point.
3. "any mistake… will just have the compiler silently not inline the
   intrinsics, completely killing your performance, and you're completely on
   your own debugging it".

Corroborating maintenance cost (Shnatsel): "an FFT library that has 3
algorithms for 5 instruction sets and 2 types… added up to 30 mostly handwritten
implementations. And I gave up trying to optimize that." And the inline-or-die
mechanics from his 2026-06-19 debugging write-up: `#[target_feature]` blocks
inlining of even `a + b`, so every caller needs `#[inline(always)]` or
"performance will plummet… watch the generated assembly turn into absolute
horror show".

## What portable layers give you that autovec doesn't

raphlinus (Linebender/fearless_simd author): "There is a big gap between just
autovectorization and the portable primitives a library like Highway or
Fearless SIMD will give you. For example, I haven't seen autovectorization do
select or swizzle." Also from that thread: fearless_simd's "downcasting" is
microarchitecture specialization; "The day of 'fire and forget' portable SIMD
has not yet arrived"; "you do have to measure… I frequently look at the
assembler output". Counterweight (simonask): "Auto-vectorization is actually
quite fragile in 2026" — the reason rung 2 exists at all.

Structural note from a practitioner (ChillFish8, integer-compression
library): AVX2 vs AVX-512 kernels often must differ *structurally*
(multiply+horizontal-add vs convert+vertical-add), so per-ISA bodies are
sometimes unavoidable even inside a portable layer.

## `core::simd` / `portable_simd` — the nightly section

- **Nightly-only, #86656, `needs-rfc`, no date.** Supports all instruction
  sets LLVM supports; vendor lowerings exist for x86/x86_64, aarch64/arm64ec,
  armv7-NEON, wasm32, powerpc(64), loongarch64, hexagon — **not RISC-V**
  (scalar fallback there).
- `Simd<T, N>` for N = 1..=64 (aliases up to 512-bit); f16/f32/f64/i*/u*
  elements; masks with arch-specific layout.
- **The API is still churning**: on nightly 1.100.0 `use std::simd::SimdFloat`
  failed (trait became `pub impl(self) trait`) while the prelude import kept
  working; re-verified on 1.101.0-nightly (2026-09-27). Pin a nightly and
  expect breakage.
- "Pairs well with the multiversion crate" (2025 survey) — the combination the
  old crate tables omitted.
- `reduce_sum()` is "the worst case for both performance and accuracy" — but
  it does give the float-reduction autovec cannot (measured: f32x8
  sum-of-squares → `fmul.4s`+`fadd.4s` NEON reduction on nightly).
- Trig: `sleef` is the best option ("only a little buggy"; sleef 0.3.3,
  2026-02-21, 26.7k DL) but third-party extensions don't compose.
- Production datapoints when the user can run nightly: Chromium uses
  std::simd in production on nightly "trying to avoid the least stable APIs"
  (mdriley); exDM69 reports ~4 years on nightly std::simd at "~20× my scalar
  code, 5x from just a naive translation", with f32x8 beating f32x4 *even on
  128-bit hardware*; camel-cdr: "For Zen5 you probably want to use f32x32".

## Choosing, in one paragraph

Need one binary that runs everywhere with runtime dispatch and you want the
least ceremony → `fearless_simd` (accept the `simd: S` boilerplate, COI
caveat, no trig) or `pulp` (faer-proven, sparsely documented, native-width
kernels). You control every build flag and don't need multiversioning →
`wide`. You want plain-stable multiversioning without a crate-specific DSL →
`rten-simd`'s `SimdOp` pattern or the `multiversion` crate. You need
element-type generics above all → `macerator`, accepting "unproven". You are
already on nightly and can pin it → `core::simd` + `multiversion`. Whatever
you pick: "The day of 'fire and forget' portable SIMD has not yet arrived" —
measure, and look at the assembler.
