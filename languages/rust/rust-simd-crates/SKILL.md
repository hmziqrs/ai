---
name: rust-simd-crates
description: >
  Replace a slow Rust path by adopting an existing SIMD-accelerated crate instead of
  hand-writing kernels. Use whenever the user wants to swap in a faster crate for JSON,
  hashing, compression, UTF-8 validation, base64/hex, CRC, FFT, BLAS/linear algebra,
  crypto, image codecs, or search — "use simd-json instead of serde", "is there a crate
  that does X with AVX2/NEON", "which SIMD crate should I pick", "why is my
  serde_json/regex path slow", "faster JSON/hashing/compression/CRC/base64/FFT/BLAS".
  Covers crate selection, runtime-vs-compile-time dispatch caveats, feature-flag swaps,
  the serde_json → simd-json/sonic-rs migration, and benchmark-before-adopt discipline.
  Does NOT fire on "why didn't my loop vectorize", hand-writing AVX2/NEON/AVX-512/SVE
  kernels, std::simd/wide/pulp/fearless_simd kernel authoring, multiversioning or
  runtime-dispatch mechanics (rust-simd-kernels); generic "make this Rust faster"
  triage, profiling, PGO/BOLT (rust-superopt); rayon/thread-pinning/false sharing
  (rust-parallel-cache); thread-per-core service design (rust-fast-architecture).
---

# Rust SIMD crate adoption — pick an accelerated crate before writing any kernel

Adopt before you write. A mature Rust project gets SIMD today via runtime-dispatching,
stable-Rust crates — memchr (1.47B downloads), aho-corasick/regex prefilters, simdutf8,
simd-json, blake3, crc32fast, flate2+zlib-rs — with zero nightly or `target-cpu`
requirements. Hand-written SIMD is a last resort owned by `rust-simd-kernels`; this
skill's whole job is to make it unnecessary.

All crate versions, dates, and download counts below are as of 2026-09-28/29
(crates.io API + source greps from the research report). Every speedup number from a
crate's own README/CI is **vendor-reported** — none were reproduced by the research;
label them as such and benchmark before adopting (see "Benchmark before adopting").

## When to use this skill

- "Use simd_json instead of serde_json" / "make my JSON path faster"
- "Is there a crate that does X with AVX2/NEON?"
- "Which SIMD crate should I pick for hashing/compression/FFT/BLAS/…?"
- "Why is my serde_json/regex/UTF-8/CRC path slow?"

Route elsewhere (do not take these over):
- "Why didn't my loop vectorize", "hand-write an AVX2 kernel", "port these C
  intrinsics", "is AVX-512/SVE stable" → **rust-simd-kernels**
- Generic "make this Rust faster / profile this / set up PGO" → **rust-superopt**
- rayon, pinning, false sharing, NUMA → **rust-parallel-cache**
- thread-per-core, sharding, lock contention → **rust-fast-architecture**

## The golden dispatch rule

**Prefer runtime-dispatched, stable-Rust crates.** Sonic-rs is the only surveyed
crate whose advertised performance **requires** `-C target-cpu=native`; a few
others (xxhash-rust's xxh3, glam, wide) also pick kernels at compile time but
stay correct — and reasonably fast — at baseline. So:

1. **Never require nightly** for a crate swap. The whole surveyed set compiled, ran,
   and picked the right kernels on stable 1.98.1 with the default target and no
   `target-cpu` flags (Round-1 audit; simd-json's `Deserializer::algorithm()` returned
   NEON on the M3 Max test host).
2. **Never instruct `-C target-cpu=native` for distributable binaries.** A native-built
   binary of any crate "will crash or misbehave" on CPUs without the assumed features
   (zlib-rs README: "almost certainly crash" on other machines). `-Ctarget-cpu=native`
   is fine for local experiments only.
3. **sonic-rs is the sole crate whose advertised performance requires
   `-C target-cpu=native`.** Its SIMD is chosen at compile time (one `cfg_if` in
   `src/util/arch/mod.rs`; no `is_x86_feature_detected!` anywhere). Without the flag a
   default `x86_64-unknown-linux-gnu` build **silently compiles the scalar fallback**
   (verified from the cfg chain) — you get serde-shaped APIs at non-SIMD speed with no
   warning.
4. **jiter is compile-time too, but at baseline width** (SSE2/NEON), so it needs no
   build flags — it is width-capped, not flag-gated. Do not categorize it as
   SIMD-free (it ships `crates/jiter/src/simd/`) nor as the AVX2 pick (that's
   simd-json/sonic-rs).
5. **zlib-rs is runtime-dispatched** (source-verified in 0.6.8: `src/cpu_features.rs`
   calls `is_x86_feature_detected!` for sse/sse4.2/avx2+bmi1+bmi2/avx512f/pclmulqdq,
   cached in an `AtomicU32`, plus `is_aarch64_feature_detected!` for neon/crc). Its
   README's `-Ctarget-cpu=native` advice is optional extra codegen, not a SIMD
   requirement.

### Compile-time-dispatch offenders (require build-flag control)

| Crate | Dispatch | Consequence |
|---|---|---|
| `sonic-rs` | compile-time only | Silent scalar fallback without `-C target-cpu=native`; 512-bit kernels need the opt-in `avx512` feature (Rust 1.89+) |
| `xxhash-rust` | all detection compile-time | "Encouraged… via -C target_cpu=native" (vendor wording) — without flags you sit at SSE2 on x86_64 |
| `glam` | compile-time features only | SSE2 default on x86_64 / NEON default on aarch64 is fine; anything wider needs build flags |
| `wide` | build-time only | Runtime detection "does not work with wide" — only pick it when you control build flags |
| `jiter` | compile-time at baseline width | No flags needed; capped at SSE2/NEON |

Silent-degradation traps — kernels that quietly don't engage (check before shipping):
- **`memchr` under `no_std`** loses runtime AVX2 detection (AVX2 detection needs the
  crate's `std` feature).
- **`aho-corasick` under `no_std` on x86_64**: its `is_available_ssse3()/is_available_avx2()`
  return **false**, silently disabling the Teddy SIMD kernels unless the whole build
  enables the target features.
- **`atoi_simd`** needs target-feature flags or it falls back to scalar-but-faster.

## Workflow

### 1. Match the category to a crate

Quick-pick table (full tables, versions, download counts, and gotchas in the reference
files — text-side detail in `references/crates-text-parsing.md`, numeric/media in
`references/crates-numeric-media.md`):

| Category | First choice | Alternative / caveat |
|---|---|---|
| JSON parse+serialize | `simd-json` (max parse throughput, runtime, MSRV 1.88) | `sonic-rs` (serde-shaped API survives; compile-time SIMD — see golden rule) |
| Byte search | `memchr` (or free via `bstr`) | `regex` with literal-bearing patterns activates memchr/aho-corasick prefilters |
| Multi-pattern search | `aho-corasick` (Teddy auto-applies) | ≲100 patterns; NEON + little-endian only on aarch64 |
| UTF-8 validation | `simdutf8` (`basic::from_utf8`) | avoid `opt-level="z"` (kills inlining) |
| Crypto hashing | `blake3` (+`rayon` feature) | not a password KDF |
| Non-crypto hashing | `xxhash-rust` (xxh3) — compile-time, BSL-1.0 | `highway` (keyed, runtime, NEON); `ahash` for hashmaps (runtime AES) |
| Checksums | `crc32fast` (IEEE), `crc32c` (Castagnoli) | both runtime-dispatched incl. aarch64 CRC |
| Symmetric crypto | RustCrypto `aes`/`chacha20`/`poly1305` | `aes` 0.9.3 runtime-scales AES-NI → AVX-512 VAES with zero build flags |
| Compression | `flate2` with the **opt-in** `zlib-rs` feature | `lz4_flex` (pure Rust, safe-by-default, ties C lz4); `zstd` (SIMD in C, C-side threading) |
| Base64/hex/UUID | `base64-simd`/`uuid-simd` (Nugine); `faster-hex` 1.0 for hex | `escape-simd` family (2026-09); `encodify` (MIME-adjacent, brand-new) |
| Integer parsing | `atoi_simd` | needs target-feature flags or falls back |
| Float parsing | **std `FromStr`** | `fast-float2` is algorithmic (Lemire), **not SIMD** — don't sell it as SIMD |
| HTTP parsing | `httparse` — already SIMD/SWAR by default | hidden `src/simd/` module; you likely need nothing |
| General text | `stringzilla` | `bytecount` for newline/codepoint counting |
| CSV | `csv` (writer SIMD via memchr; reader scalar) | `simd-csv` — honest author caveat: gains are data-dependent |
| XML/HTML | `quick-xml` (memchr-accelerated scanning; scalar state machine) | no SIMD HTML sanitizer exists |
| FFT | `rustfft` via `FftPlanner` (runtime cascade) | `PhastFT` (fearless_simd-based, unsafe-free, power-of-two) |
| Linear algebra | `faer` (pulp dispatch + private-gemm-x86) | `apple-accelerate` / blas-src+lapack-src `accelerate` on macOS |
| ML inference (CPU) | `rten` (rten-simd = stable multiversioning) | `candle` (CPU = gemm crate) |
| Game math | `glam` | `vek` on stable is autovectorized `repr(C)`, not a SIMD toolkit |
| Image codecs | `zune-jpeg` (via `image`) | `jxl-oxide` (runtime AVX2+FMA/NEON) |
| AV1 encode | `rav1e` (bring NASM ≥ 2.14.02) | x86 SIMD is NASM asm, not Rust intrinsics |
| Audio decode | `symphonia` | its default `opt-simd` rides rustfft's SIMD |
| Vector search | `turbovec` (young, single-maintainer) | `hora-search` |

### 2. Benchmark before adopting

Vendor perf numbers are vendor numbers — the research reproduced none of them (no x86
host; M3 Max has no AVX2/AVX-512). Run a quick criterion A/B on the user's **own
payload shapes** before any migration:

- serde_json vs simd-json vs sonic-rs on representative documents (simd-json is
  API-invasive; sonic-rs constrains build flags — both costs need a measured win to
  justify).
- Include realistic sizes: memchr's gains "vanish on tiny haystacks"; simd-csv's own
  author reports "sometimes ~8× faster, sometimes only as fast as scalar".
- Vendor figures to sanity-check against (all vendor-reported): sonic-rs twitter
  struct 827.74 µs vs simd_json 1.0872 ms vs serde_json 2.2895 ms (~2.8×, Xeon 8260);
  crc32fast 7314 MB/s vs 207 for the `crc` crate; escape-simd JSON escaping 56.23 ns
  vs serde_json 111.65 ns (short strings).

Benchmarking hygiene (noise bands, best-of-N, release-only) is owned by
**rust-superopt**'s measurement reference — apply it here, don't reinvent it.

### 3. Migrate

- JSON: follow `references/json-migration.md` — simd-json takes `&mut` input, ships
  its own Value types, and wants `prelude::*`; sonic-rs is near drop-in but
  build-flag-gated.
- flate2 → zlib-rs is a one-line feature swap (see compression row above) — the
  cheapest win in this skill.
- Keep the scalar crate as the oracle: parity-test the accelerated path against it on
  edge payloads (empty, tiny, adversarial quoting/escapes) before deleting it.

## Do NOT recommend (the premise-correction list)

Never file these under SIMD; correct the user's premise if they ask for them as
accelerated:

- **simdzone** — C, not Rust (NLnetLabs); **no SIMD DNS zone parser exists in Rust**.
- **fast-float2 / lexical / fastdate** — algorithmic scalar (say "Lemire fast float
  parsing" where relevant); no Rust SIMD date parser exists.
- **ammonia / lol-html** — scalar; **no SIMD HTML sanitizer exists** (lol-html's speed
  is streaming design, not SIMD).
- **rapidhash** — explicitly "no dependency on vectorized or cryptographic hardware
  instructions" (README).
- **`faster`** — abandoned (last release 0.5.2, 2021-03-25).
- **simdeez, magetypes, thermite** — excluded by the 2026 Shnatsel survey as AI-driven
  (simdeez has a real correctness bug open: tests checking ULP≤35 instead of ≤3.5).
  thermite's feature set is real; the trust question is open — flag the tension.
- **varint-simd** — dormant since 2024-09.
- **arrow2** — archived since 2024-02-27; polars-arrow is the descendant.
- **vek as a SIMD toolkit** — stable vek is `#[repr(C)]` scalar ops relying on
  autovectorization; real SIMD only on nightly + opt-in features. Treat as
  convenience 2D/3D math.
- **intel-mkl-src** (2022-stale) and **ispc** (~150 downloads/month, external ISPC
  toolchain + libclang) — niche; the ecosystem chose in-language portable SIMD.

## Negative results worth stating up front

When the user asks for a SIMD crate in these spaces, the honest answer is "none
exists as of 2026-09":

- **DNS zone parsing** — simdzone is C; Rust needs FFI or patience.
- **URL parsing** — no SIMD URL parser (sorug is SWAR+memchr, 1★, too immature;
  fluent-uri/url make no SIMD claims).
- **HTML sanitization** — ammonia is the scalar default.
- **Date parsing** — no Rust SIMD date parser (fastdate is table-driven scalar).
- **Geometry** — geo has no SIMD anywhere; geometry crates deliberately prefer
  exact/adaptive arithmetic over vectorization.

## Reference files

- `references/crates-text-parsing.md` — full parsing/serialization/text table with
  per-crate gotchas, dispatch models, versions/downloads; the Nugine codec family and
  its 2022 freeze; the Sept-2026 codec wave (faster-hex, escape-simd, encodify,
  base64-turbo); hidden SIMD in mainstream crates (httparse, quick-xml, csv); the
  negative-results detail.
- `references/crates-numeric-media.md` — math/hashing/crypto/compression/media/ML
  crates (glam, faer, rustfft, blake3, RustCrypto, zlib-rs, zune-jpeg, rten-simd,
  turbovec, polars/arrow), the Apple Accelerate route, which crates bring their own
  rayon threading, and explicit-vector crates as dependency picks.
- `references/json-migration.md` — the serde_json → simd-json / sonic-rs migration in
  detail: API deltas, feature flags, allocator advice, buffer reuse, build-flag
  consequences, and what to benchmark.
