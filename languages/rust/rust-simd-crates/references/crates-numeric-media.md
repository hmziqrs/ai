# SIMD crates — numeric, hashing, crypto, compression, ML, media

Source: research report §2.4, §2.11, §2.13 + §3 numeric/media rows. Crate data from
crates.io API 2026-09-28/29; six full source clones were grepped for the §2.11
claims. **No benchmarks were run by the research — all perf numbers are
vendor-reported.**

Golden rule applies: runtime-dispatched stable crates first; compile-time crates
(xxhash-rust, glam, wide) require build-flag control; native builds of anything are
non-distributable.

## Explicit-vector crates as dependency picks

Pick-a-crate guidance only — writing kernels with these belongs to
**rust-simd-kernels**.

| Crate | Latest / DLs | Dispatch | Pick guidance |
|---|---|---|---|
| `wide` 1.7.1 (2026-09-14) | 76.09M / 18.65M | **build-time only** — runtime detection "does not work with wide"; x86 defaults SSE2; wasm needs `+simd128` | "Near drop-in replacement for std::simd"; explicit MSRV policy (1.89); lowest friction **when you control build flags**; depends on safe_arch on x86 and on bytemuck |
| `pulp` 0.22.3 (2026-06-20) | 26.55M / 12.35M | **runtime** (`Arch::new().dispatch(...)`); `WithSimd` trait; `with_simd!` macro (pulp-macro dep) | Powers **faer** (faer pins pulp 0.22.2 with `x86-v3` default; `x86-v4` only inside faer's `nightly` feature; rayon optional but **on by default**) — runtime dispatch proven in production; sparsely documented (say "sparsely documented", not a number) |
| `fearless_simd` 1.0.0 (2026-09-21) | 6.55M / 4.80M | one-time `Level` token; `#[simd]` multiversioning | Linebender; all-in-one; MSRV 1.89. **COI caveat**: its chief promoter is now a maintainer, and the headline benchmarks are maintainer-run — present alongside pulp, let the user's benchmark decide. Third-party adoption evidence: memchr-n reportedly outperforming memchr (BurntSushi/memchr#241), PhastFT, Philbin (AEGIS). Its multiversioning "is controlled by whoever builds the final binary" — an end-user-build-flags property that matters for library authors |
| `rten-simd` 0.26.0 (2026-08-29) | (part of the rten ecosystem) | runtime dispatch aarch64-NEON → x86_64 AVX-512(f/vl/bw/dq+f16c) → AVX2(+fma,f16c) → wasm simd128 → generic, as a `SimdOp { fn eval<I: Isa> }` trait with `#[target_feature]` inner fns | **Manual multiversioning on stable Rust; the recommended stable alternative to pulp for CPU kernels** ("inspired by Google's Highway and the pulp crate"; MSRV 1.94, edition 2024). Notable: it re-checks AVX-512 on macOS via `sysctlbyname("hw.optional.avx512vl/…")` because `is_x86_feature_detected!` can false-negative there (cites golang/go#43089) |
| `simdeez` 3.0.1 (2026-03-25) | 0.29M / 0.04M | runtime `simd_runtime_generate!` + compile-time | **Avoid** — 2026 survey calls development AI-driven and buggy (correctness bug open: tests checking ULP≤35, not ≤3.5) |
| `vek` 0.17.2 (2025-09-23) | 1.24M / 0.14M | **none ever** (on stable) | On **stable**, vek is `#[repr(C)]` structs with macro-generated per-lane scalar ops relying on autovectorization — no runtime detection, no core::arch intrinsics anywhere in src/. Real SIMD only on **nightly + non-default features** (`repr_simd`, `platform_intrinsics`). Treat as convenience 2D/3D math, not a SIMD toolkit |

Survey exclusions to mirror: the 2026 Shnatsel survey also excludes `magetypes` and
`thermite` as AI-driven, and `jxl_simd`/`pathfinder_simd` ("not intended for a
general audience").

## Math and linear algebra

- **glam 0.33.11** (148.9M DL; released 2026-09-27): Vec3A/Vec4/Quat/Mat3A/Mat4/Affine*
  use 128-bit SIMD storage on x86/x86_64/wasm/aarch64-NEON (vec3a.rs: `__m128`/
  `v128`/`float32x4_t` backends). **Compile-time features only** (SSE2 default
  x86_64, NEON default aarch64, wasm needs `+simd128`); `core-simd` feature = nightly
  portable_simd; **`fast-math` feature is deprecated and has no effect — do not
  recommend it** (Cargo.toml: "Deprecated and no longer has any effect. Kept so
  existing Cargo manifests continue to build").
- **faer 0.24.4**: kernels are `pulp::WithSimd` closures launched via
  `T::Arch::default().dispatch(...)` (verified across triangular_solve/qr/svd/
  householder/cholesky); pulp 0.22.2 with x86-v3 default; GEMM supply now leans on
  **private-gemm-x86 0.1.20** (3.05M DL, default-on x86_64 dep) beside gemm
  0.19/nano-gemm 0.2.2 — faer's x86 GEMM is increasingly a prebuilt private kernel.
  Repo moved to **sarah-quinones/faer-rs** (old sarah-ek paths 404). faer's rayon is
  **default-on**.
- **rustfft 6.4.1** (29.77M; **maintained repo is ejmahler/RustFFT** — awelkie/rustfft
  is the stale 2021 original): planner-based **runtime cascade** AVX+FMA → SSE → FCMA
  (Arm v8.3 complex fused ops) → NEON → WASM-SIMD → scalar (src/plan.rs:79-102); AVX
  planner requires runtime `avx`+`fma`; AVX2 optional, unlocking radix 5/7/11; **no
  AVX-512 path**; per-ISA planners are public so users can force or refuse SIMD.
  **Critical gotcha: "bypassing the planner will disable all AVX, SSE, Neon, and WASM
  SIMD optimizations."** Sizes `2^n * 3^m` fastest; no threading — parallelize across
  FFTs yourself. Butterflies are code-generated. `realfft` 3.5.0 wraps it and
  forwards its SIMD features.
- **PhastFT 0.4.1** (2026-07-31): fearless_simd-0.5-based, 100%-unsafe-free FFT for
  power-of-two sizes; ~2.8K DL/month, young but clean — the second real fearless_simd
  adoption after memchr-n. It moved std::simd → fearless_simd specifically to reach
  stable Rust.
- **rubato** is where audio-resampling SIMD lives (runtime AVX→SSE3/NEON; its FFT
  resampler rides rustfft).
- **geo has no SIMD anywhere** (robust/earcut/spade deps) — geometry crates
  deliberately prefer exact/adaptive arithmetic over vectorization; a negative
  result worth teaching. **thermite 0.3.0** (portable numeric/special-function
  kernels, AVX-512 tier validated via Intel SDE, autodiff/double-double companions,
  MSRV 1.95) — tension: the 2026 survey **excludes** thermite as AI-driven; the
  feature set is real, the trust question is open.

## Hashing and checksums

- **blake3 1.8.7** (189.95M): SSE2/SSE4.1/AVX2/AVX-512/NEON/WASM, runtime on x86 via
  the cpufeatures crate (platform.rs:72-84: AVX512 > AVX2 > SSE4.1 > SSE2 > portable);
  NEON/wasm compile-time-assumed. **`rayon` feature** → `update_rayon`/
  `update_mmap_rayon` via tree-join (rayon-core dep) — the model example of
  SIMD-within-chunk + rayon-across-chunks. Default x86 backend is Samuel Neves'
  assembly compiled via cc (auto-falls-back to pure Rust with no C compiler);
  `prefer_intrinsics`/`pure` stay C-free. Not a password KDF.
- **xxhash-rust 0.8.19** (108.4M): xxh3 SSE2 (default x86_64)/AVX2/AVX512/NEON/wasm —
  **all detection compile-time** ("encouraged… via -C target_cpu=native"); prefer
  one-shot over streaming; **BSL-1.0 license**, not MIT/Apache.
- **highway** 1.3.0 — keyed non-crypto, runtime SSE4.1/AVX2, NEON (NeonHash); poor
  for <100-byte payloads.
- **ahash** — runtime AES detection, >100M DL; the hashmap pick.
- **crc32fast / crc32c** — see the text-parsing reference (both runtime-dispatched;
  crc32fast vendor bench 7314 MB/s).
- **rapidhash is NOT SIMD** — explicitly "no dependency on vectorized or
  cryptographic hardware instructions".

## Crypto (RustCrypto — the highest-confidence tier in the research)

All production defaults:

- **aes 0.9.3** (332M DL, 2026-08-28): backends AES-NI, aarch64 AESE, fixslice, and
  **runtime VAES-256/512** (`x86_vaes256.rs`/`x86_vaes512.rs`, cpufeatures tokens
  for avx512f+vaes) — a stock binary scales from AES-NI to AVX-512 VAES with zero
  build flags.
- **chacha20 0.10.2** (240M DL): hand-written soft/sse2/avx2/avx512/neon backends;
  **ppv-lite86 is gone** from the dep list; SSE2/AVX2 runtime-detected; AVX-512
  opt-in (`--cfg chacha20_backend="avx512"` + avx512f/vl, else `compile_error!`).
- **poly1305 0.9.1** (101M): runtime AVX2 via a `union` + ManuallyDrop dispatch.

These are the rustls/age defaults — recommend with high confidence.

## Compression

- **flate2 + zlib-rs**: the one-line feature swap; full detail in the text-parsing
  reference (runtime-dispatched; flate2's default backend is miniz_oxide — zlib-rs
  is strictly opt-in).
- **lz4_flex 0.14.0** (143.6M): pure Rust, no unsafe by default
  (`safe-encode`/`safe-decode`), README benches show it matching or beating C lz4
  through bindings (66KB JSON: 1615 vs 1469 MiB/s compress; 5973 vs 5313 MiB/s
  `unchecked_decode` — vendor) — the standard proof that careful autovectorized pure
  Rust can tie C SIMD for byte-oriented formats.
- **zstd 0.14.0** (402.1M): C bindings; threading is C's own (`zstdmt` feature,
  `Encoder::multithread(n)`), **not rayon**; `no_asm` feature exists. zstd's SIMD
  lives in the C library with C-side dispatch.

## Data-frame engines

- **polars 0.55.2**: its `simd` feature chains to **nightly `std::simd`**
  (polars-arrow bitmask.rs uses `std::simd::Mask`; repo pins nightly-2026-09-01; the
  `nightly` feature implies `simd`) — polars' explicit SIMD is opt-in and
  nightly-only. Default stable builds rely on autovectorization plus external SIMD
  deps (atoi_simd, simd-json, simdutf8).
- **arrow-rs 60.0.0** is the philosophical contrast: repo-wide, arch intrinsics
  appear in only two files (BMI2 PEXT/PDEP behind compile-time cfg in arrow-buffer) —
  trust autovec + bit ops.
- **arrow2 is archived** (since 2024-02-27) — do not recommend; polars-arrow is the
  descendant.

## ML inference

- **rten** is the go-to pure-Rust ONNX CPU runtime; **rten-simd** (see the
  explicit-vector table) is its stable multiversioning framework — also the
  recommended standalone choice for stable-Rust CPU kernels.
- **candle** delegates CPU matmuls to the `gemm` crate (0.19.0, wasm-simd128
  enabled) — candle's CPU SIMD story *is* the pulp/gemm ecosystem.

## Media codecs

- **zune-jpeg 0.5.15** (117.9M): "unsafe is only used for SIMD intrinsics, and can be
  turned off entirely both at compile time and at runtime"; main adoption path is
  the `image` crate's `jpeg` feature (zune-core + zune-jpeg + jpeg-encoder — and
  jpeg-encoder is built with `features=["simd"]`, so the encode side is SIMD too);
  intrinsics perform poorly in debug builds — set `opt-level=3` for the package in
  dev profiles.
- **jxl-oxide 5.0.0** (tirr-c): the best non-zune image-codec SIMD exemplar —
  runtime-dispatched `#[target_feature(enable="avx2")]+[fma]` / NEON kernels in
  jxl-color (ycbcr) and jxl-modular (rct.rs picks via
  `is_x86_feature_detected!`/`is_aarch64_feature_detected!`).
- **rav1e 0.8.1**: speed from hand-written **NASM assembly** — x86_64 requires
  **NASM 2.14.02+** (enabled by default); `threading` is **default-on** via
  maybe-rayon (serial fallback shim); `RAV1E_CPU_TARGET=rust` disables asm. Its x86
  SIMD is NASM, not Rust intrinsics.
- **Audio decode**: **symphonia 0.6.1** (2026-08-13, active, used by rodio) —
  its default features include `opt-simd`, which forwards to symphonia-core's
  opt-simd-sse/avx/neon, implemented as **rustfft's** SIMD features (rodio surfaces
  it as `simd = ["symphonia/opt-simd"]`). Symphonia's *own* source contains zero
  core::arch/target_feature (repo-wide grep) — its SIMD is rustfft's, on by default.
  **lewton** (Vorbis) is unmaintained (last release 2021), `#![forbid(unsafe_code)]`,
  no SIMD — symphonia is the right replacement.

## Vector search / quantized ANN

- **turbovec 1.0.0** (RyanCodrai/turbovec, **17,255★**, pushed 2026-09-13) — Rust
  vector index on TurboQuant (arXiv 2504.19874) with **hand-written kernels: NEON
  SDOT/SMMLA on ARM, AVX-512 VNNI + vpermb on x86, AVX2 and scalar fallbacks**
  (verified in src/{encode,pack,rotation,search}.rs with is_x86_feature_detected!
  dispatch), claiming 3.4× over FAISS IndexPQFastScan at 4-bit (vendor). Young/
  single-maintainer — normal caution — but the SIMD engineering is real and
  inspectable.
- **quickwit-oss/bitpacking** (Lemire simdcomp port, ">4 billions integers per
  second" vendor; the tantivy/quickwit primitive).
- Also: hora-search (2.7K★, slower cadence), sassy (SIMD approximate string
  matching, active research code), varint-simd (dormant since 2024-09 — do not
  recommend).

## Apple Accelerate (the macOS math route)

- **apple-accelerate 0.4.0** (repo doom-fish/accelerate-rs, updated 2026-09-24) —
  the most complete maintained binding: vDSP radix-2 FFT, biquad, vector math,
  Hamming/Blackman; BLAS sdot/sgemv/sgemm; LAPACK LU/solves; BNNS ReLU/sigmoid
  (+BnnsGraphCompileOptions, macOS 15+); Sparse; vImage `ImageBuffer` (rotate/
  box-convolve/scale/alpha-blend); `raw-ffi` feature exposes ~1,580 bindgen
  functions.
- The drop-in BLAS/LAPACK path is **blas-src 0.14.0 / lapack-src 0.13.0
  `accelerate` features** (accelerate-src just links the framework; 1.06M DL).
- The common *indirect* route is whisper.cpp's `-DGGML_ACCELERATE` on macOS via
  whisper-rs. (objc2-accelerate does not exist — Accelerate is pure C.)
- Context from the research: Accelerate's BLAS routes to Apple's AMX matrix
  coprocessor, which is reachable but undocumented by Apple (vDSP/BNNS routing
  inferred from reverse-engineering, not Apple-documented). The third-party crates
  are `amx-sys`/`amx-rs` 0.0.3 (benchmarked at ~92% of Accelerate sgemm on an M4 Pro
  VM — vendor). AMX/SME kernel authoring is rust-simd-kernels territory.

## Rayon-pairing summary (verified against every Cargo.toml in the research)

Know which crates bring their own threading before adding rayon around them:

- **Built-in rayon**: blake3 (`rayon` feature, rayon-core), rav1e (maybe-rayon
  behind **default-on** `threading`), faer (**default-on** rayon).
- **C-internal threads**: zstd (zstdmt), MKL/TBB (iomp/seq).
- **No threading, caller parallelizes**: rustfft/realfft, xxhash-rust, highway
  (features are only `[std]`), lz4_flex, zune-*, glam, wide/pulp (zero rayon
  references in any of them).

Standard composition: `rayon::par_iter()` over independent items with each item's
inner loop SIMD-accelerated. Threading/pool mechanics belong to
**rust-parallel-cache**.

## C-bindings pattern (when there is no Rust crate)

`-sys` crate vendors C source, compiles with `cc`, safe wrapper on top; SIMD stays
in C with C-side dispatch (zstd is the exemplar). The counter-example that keeps the
bar high: lz4_flex proves careful pure Rust can tie C SIMD for byte-oriented
formats. **intel-mkl-src** (0.8.1, 2022, stale) and **ispc 2.0.4** (unsafe FFI,
external ISPC compiler + libclang required; ~150 downloads/month crate-wide) are
niche — the ecosystem chose in-language portable SIMD.
