# SIMD crates — parsing, serialization, text

Source: research report §2.3 and §2.10 + §3 text-side rows. All crate data from the
crates.io API and README/docs fetches, 2026-09-28/29; the "source-verified" dispatch
claims come from the report's audits grepping the actual crate sources. **No local
benchmarks — every perf number is vendor-reported.**

The golden dispatch rule from SKILL.md applies throughout: runtime-dispatched,
stable-Rust crates are the default; sonic-rs is the sole crate whose advertised
performance requires `-C target-cpu=native`; native builds of anything are
non-distributable.

## Full table — parsing, serialization, text

| Crate | Accelerates | Dispatch | Latest (date) | DLs total/recent | Key gotchas |
|---|---|---|---|---|---|
| **simd-json** | JSON parse (DOM + serde) | Runtime (default feature `runtime-detection`): AVX2 or SSE4.2; NEON; wasm simd128; slow scalar fallback (lib.rs:404–420 — verified; `algorithm()` returns NEON on the M3 Max audit host) | 0.18.1 (2026-08-23); **MSRV 1.88** | 21.5M / 5.83M | Not a type-level drop-in: **every parse entry point takes `&mut`** (in-place unescaping); ships `BorrowedValue`/`OwnedValue`/`Tape`, not `serde_json::Value`; f64 numbers not `Eq` without `ordered-float` feature; allocator-sensitive (recommends snmalloc/mimalloc/jemalloc); hot-loop reuse via `to_tape_with_buffers`/`from_slice_with_buffers`; perf features (known-key/ahash, big-int-as-float, approx-number-parsing); `Deserializer::algorithm()` is a public introspection point for which kernel ran |
| **sonic-rs** | JSON parse+serialize | **Compile-time only** — `src/util/arch/mod.rs` is one cfg_if: x86_64 kernels require `pclmulqdq`+`avx2`+`sse2` **all compiled in** (PCLMULQDQ prefix_xor, AVX2+SSSE3-pshufb whitespace bitmaps), else scalar fallback; aarch64 NEON (prefix_xor deliberately avoids PMULL); sonic-simd's 256-bit level needs compile-time avx2, 512-bit needs the opt-in `avx512` feature (Rust 1.89+). No `is_x86_feature_detected` anywhere; README requires `-C target-cpu=native` | 0.5.10 (2026-09-11) | 6.95M / 2.85M | Near drop-in for serde_json (serde derive, `json!`, migration doc); without target-cpu you may **silently get the slow fallback** (a default `x86_64-unknown-linux-gnu` build compiles the scalar path — verified from the cfg chain); native-built binaries unusable elsewhere; unsafe `*_unchecked` APIs skip UTF-8 validation; non-x86_64/aarch64 = slow. Vendor bench (Xeon 8260): twitter struct 827.74 µs vs simd_json 1.0872 ms vs serde_json 2.2895 ms (~2.8×); also beats simd-json on untyped parse. **`lazyvalue` API** (`to_lazyvalue`/`get_from_str`/`get_many`) — pointer-style partial access without building a DOM, its most distinctive perf feature |
| **memchr** | byte find/memmem | SSE2 always on x86_64 (arch/x86_64/mod.rs:6); AVX2 runtime via `std::is_x86_feature_detected!` only under the crate `std` feature (avx2/memchr.rs:93-108 — `cfg(target_feature="avx2")` short-circuits to true); NEON + wasm without std; SWAR fallback | 2.8.3 (2026-07-08) | 1.47B / 369M | Gains vanish on tiny haystacks; no_std loses runtime AVX2 detection; MSRV 1.61. **`PackedPair`** (candidate/rare-byte pair search) is the SIMD surface regex-automata's prefilter uses beyond plain memchr |
| **aho-corasick** | multi-pattern search (Teddy) | **Three-layer gating (source-verified in 1.1.5)**: compile-time arch cfg (x86_64 under baseline sse2 — always; aarch64 under neon+little-endian; all else `{None}`), then runtime SSSE3/AVX2 via `is_available_ssse3()/is_available_avx2()` — which under `no_std` return **false**, silently disabling Teddy unless the whole build enables the features; FatAVX2/SlimAVX2/SlimSSSE3/SlimNeon kernel variants | 1.1.5 (2026-08-03) | 1.18B / 253M | Builder skips Teddy at >64 patterns (docs round to "on the order of 100 or so"); construction can fail (auto-fallback to NFA/DFA); "sometimes by an order of magnitude faster" than the automaton; prefilter ladder starts with memchr on ≤3 rare bytes |
| **regex** | regex matching | **No SIMD of its own** — `perf-literal` (default) pulls memchr + aho-corasick; no core::arch/std::arch in regex or regex-automata sources | 1.13.1 (2026-07-15) | 1.20B / 258M | Prefilter only helps patterns containing literals; put a literal (prefix or rare byte like `@` in `\w+@\w+`) in the pattern; high-FP prefilters can even slow via "ping-ponging between the prefilter search and the regex engine" (regex-automata prefilter docs) |
| **bstr** | byte-string ops | via memchr (only required dep, Cargo.toml:122) | 1.13.1 (2026-08-10) | 432M / 95.1M | Not a SIMD engine; UTF-8-optional string API |
| **simdutf8** | UTF-8 validation | SSE4.2 + AVX2 runtime on x86 (std); NEON automatic since Rust 1.61; wasm compile-time | 0.1.5 (2024-09-22) | 227M / 73.4M | `basic::from_utf8` is the drop-in (zero-sized error — measured `size_of::<basic::Utf8Error>()==0`); `compat` gives serde-style errors; avoid `opt-level="z"` (kills inlining); `public_imp` feature exposes the raw SIMD implementations and streaming-validation traits; no release in ~2 years (single maintainer) |
| **crc32fast** | CRC-32 IEEE | PCLMULQDQ + VPCLMULQDQ (256/512-bit; those need Rust 1.89+); aarch64 crc32 3-way interleaved; runtime in `Hasher::new` (needs std) | 1.5.2 (2026-09-12) | 715M / 168M | Vendor bench 7314 MB/s vs 207 for `crc` crate; fuzzed + ASan CI; check value verified correct on the audit host |
| **crc32c** | CRC-32C | SSE4.2 CRC32, runtime cpuid unless compiled with +sse4.2; **aarch64 CRC32C documented and auto-enabled on rustc ≥1.80** (README.md:13-14; build.rs:196-197 — verified active by default on the 1.98.1 audit host, check value 0xE3069283 correct) | 0.6.8 (2024-06-09) | 84.7M / 15.8M | Slow release cadence — but the old "ARM path undocumented" gotcha is stale (corrected in the report's Round 1) |
| **flate2 + zlib-rs** | DEFLATE/zlib/gzip | **Runtime** (source-verified in zlib-rs 0.6.8): `src/cpu_features.rs` uses `is_x86_feature_detected!` for sse/sse4.2/avx2+bmi1+bmi2 (cached in an `AtomicU32`)/avx512f/pclmulqdq and `is_aarch64_feature_detected!` for neon/crc, consumed in the inflate/writer/adler32 paths; **also runtime-detects LoongArch LSX** (behind the `lsx` feature, cpu_features.rs:104-112) and wasm32 simd128 (:114-120). The README's `-Ctarget-cpu=native` advice is optional extra codegen, and native builds remain non-distributable | zlib-rs 0.6.8 (2026-09-15); flate2 1.1.10 | zlib-rs 153M / 66.5M; flate2 707M / 164M | Feature-flag swap: `flate2 = { version = "1", default-features = false, features = ["zlib-rs"] }` — but note **flate2's default backend is `rust_backend` (miniz_oxide), NOT zlib-rs**; zlib-rs is strictly opt-in. The backend first appeared in flate2 **1.0.29 (2024-04-26)** (as libz-rs-sys 0.1.1; direct zlib-rs 0.6 dep since 1.1.7, 2025-12-05); 1.1.10 defaults are `rust_backend` + `runtime_detection`. `-Cllvm-args=-enable-dfa-jump-thread` ≈ +10% only for 16-byte chunks ("couple percent" under 1 KiB, "not significant" beyond); Trifecta Tech Foundation maintained; "generally on-par with zlib-ng" |
| **highway** | keyed strong hashing | SSE4.1/AVX2 runtime via `std`; **NEON on aarch64 (NeonHash)**; wasm opt-in; no_std → portable | 1.3.0 (2025-01-11) | 3.75M / 752K | Non-cryptographic; poor for <100-byte payloads |
| **fast-float2** | float parsing | n/a (algorithmic — Eisel-Lemire in scalar code; no core::arch anywhere in src) | 0.2.4 (2026-08-14) | 21.3M / 8.65M | **README recommends std `FromStr`** — Rust std adopted the algorithm; original `fast-float` unmaintained since 2021; fork is in maintenance mode; only for no_std/byte-slice/partial-parse. Describe it as "Lemire fast float parsing", not SIMD |
| **jiter** | iterable JSON | **Baseline compile-time SIMD** (corrected in the report's Round 1): `crates/jiter/src/simd/` ships x86_64 SSE2 (`std::arch::x86_64` under `#[target_feature(enable="sse2")]`) and aarch64 NEON (vld1q_u8/vcgtq_u8…) for string/number chunk decoding — no runtime dispatch, no AVX2, not advertised in the README | 0.17.0 | 746M-scale adopter ecosystem (via pydantic-core etc.) | Fast, but SIMD-width-capped at baseline; do NOT categorize as SIMD-free — and it still isn't the pick when you want AVX2 kernels (that's simd-json/sonic-rs) |
| **rapidhash** | non-SIMD hashing (listed so the skill does NOT recommend it as SIMD) | — | — | — | explicitly "no dependency on vectorized or cryptographic hardware instructions" (README:9, exact) |

Related non-crypto row from §3: **ahash** (runtime AES detection, >100M DL) is the
hashmap pick — SIMD-adjacent hardware instructions, runtime-detected.

## The incumbent codec family — frozen but ubiquitous

All in the Nugine/simd monorepo, MIT, "relies heavily on unsafe code", algorithms
credited to 0x80.pl/aqrit. Repo still maintained (commits 2026-08-30) but **no crate
release since 2022-12-28** — 2022 vintage, fine for SSE2/AVX2/NEON, check before
betting on newer ISAs:

- **base64-simd** 0.8.0 — 155.7M total / 43.0M recent
- **uuid-simd** 0.8.0 — 42.7M / 17.3M; unmatched for UUID parse/format
- **hex-simd** 0.8.0 — 2.4M / 848K
- **simd-abstraction** 0.7.1 — the framework beneath them, 19.2M
- `unicode-simd`/`base32-simd` 0.0.1 are **yanked placeholders** (no released Nugine
  unicode/base32 crate).

## The Sept-2026 codec wave (freshest part of the niche)

- **faster-hex 1.0.0** (nervosnetwork, 2026-09-23; 60.8M DL) — SIMD + portable
  fallback, no_std, fuzzed (libFuzzer x86/ARM, AFL), a bench-compare harness against
  hex/const-hex/hex-simd/fashex/better-hex. **The most credible hex codec today;
  recommend over hex-simd.**
- **escape-simd 0.1.0 + json-escape-simd/html-escape-simd** (napi-rs org, 2026-09-12;
  39K DL in ~2 weeks) — shared SIMD string-escaping kernels ("JSON implementation is
  from sonic-rs; we only take the string escaping part"); CI bench: short-string JSON
  escaping 56.23 ns vs serde_json 111.65 vs v_htmlescape 151.98. Becoming the standard
  escape kernel — recommend.
- **encodify 1.0.0** (Stalwart Labs, 2026-09-28 — one day old at survey time) —
  Base64/Base32/QP/RFC 2047/UTF-7/PEM with NEON + runtime-detected SSSE3/AVX2 kernels;
  vendor bench: base64 encode 25.7 GB/s vs base64-turbo 19.2 vs base64-simd 12.8.
  Watch/adopt for MIME-adjacent formats after it settles.
- **base64-turbo 0.5.0** (2026-09-19) — ">100 GiB/s" claims (81.6/106.5 on Zen 5),
  kernels checked by **Kani + MIRI + MSan + fuzzing**; single new author, tiny
  adoption — second choice until it matures. (better-hex 1.0.1: SSSE3/AVX2/
  AVX-512BW/NEON/WASM128 + constant-time decode, crypto niche. hex-turbo/fashex:
  experimental.)
- Educational/historical, not recommendations: vb64 (companion to mcyoung's
  "Designing a SIMD Algorithm from Scratch", HN 441 pts), bs64, inet-aton (a faithful
  Rust port of Lemire's SSE IPv4 parser, unmaintained since 2023).

## Hidden SIMD inside mainstream text crates (grep-verified)

Use these before adding any dependency — the crate the user already has may already
be accelerated:

- **httparse 1.10.1 (746,176,801 DL per crates.io) ships a real SIMD module** —
  `src/simd/{avx2,sse42,neon,swar,runtime,mod}.rs`; SWAR is the default when
  `httparse_simd` is unset; `runtime.rs` dispatches via
  `is_x86_feature_detected!("avx2"/"sse4.2")`; build.rs honors
  `CARGO_CFG_HTTPARSE_DISABLE_SIMD` (the `httparse_disable_simd` cfg opt-out). Almost
  nobody knows this HTTP parser — three-quarters of a billion downloads — is
  SWAR/SIMD-accelerated. (The "most-downloaded HTTP parser in Rust" superlative was
  never independently ranked; the 746M figure is the verified part.)
- **quick-xml 0.42.0 (436.8M)**: memchr accelerates **both the escape path and the
  readers' byte scanning** — src/escape.rs (entity `&`/`;` and CR/UTF-8-lead-byte
  scanning) *and* read paths: `src/reader/slice_reader.rs:273` `memchr2(b'<', b'&')`
  in `read_text` (+ :317 `memchr3`), `src/reader/mod.rs:1202,1228`
  `memchr_iter(b'>')` for Comment/CData scanning, `src/reader/state.rs:116`
  `memchr(b'-')`, `src/parser/element.rs:58` `memchr3_iter(b'>', '\'', '"')`. The
  parsing *logic* is a scalar pull-parser state machine.
- **csv 1.4.0**: memchr on the **writer** path only (quote scanning;
  csv-core/src/writer.rs:4,550); the reader is a DFA/NFA state machine with no SIMD.
  **simd-csv 0.14.0** (Sciences Po médialab, 35.6K DL, fast adoption) is the niche
  pick — runtime detection, wasm simd128, and an unusually honest README: "sometimes
  ~8× faster, sometimes only as fast as scalar… one of the reasons why SIMD CSV
  parsers are not yet very prevalent". lazycsv 0.3.1 ("vectorized, lazy-decoding,
  zero-copy", ~20% over rust-csv) is experimental.
- **bytecount 0.6.9** (143.1M) — SIMD newline/byte counting + UTF-8 code points; the
  invisible workhorse.
- **stringzilla 5.1.2** (C lib with a first-class Rust crate, 103K DL) — SIMD
  search/sorting/hashing/UTF-8 segmentation, claims 10–70× over ICU4C/ICU4X
  (vendor); the strongest general-text recommendation.
- **simdnbt 0.10.0** — the pick for Minecraft NBT specifically (hand-written fast,
  no simd deps).

## Integer vs float parsing (a premise users get wrong)

- **atoi_simd 0.18.1 IS the SIMD integer parser** (SSE4.1/AVX2/NEON, 17.7M DL) —
  needs target-feature flags or falls back to scalar-but-faster.
- **fast-float2 and lexical are NOT SIMD** (algorithmic scalar — say "Lemire fast
  float parsing", not SIMD); **std `FromStr` already adopted the fast-float
  algorithm**, so the std path is the first choice for float parsing.
- **fastdate has no SIMD claims** (table-driven scalar); **no Rust SIMD date parser
  exists**.

## Negative results that correct the premises

- **simdzone is C, not Rust** (NLnetLabs, language: C per the GitHub API; no
  crates.io entry) — **no SIMD DNS zone parser exists in Rust**; simdzone-class
  throughput needs FFI or patience.
- **No SIMD URL parser exists** either (sorug 0.6.2 is SWAR+memchr, 1★, too
  immature; fluent-uri/url make no SIMD claims).
- **No SIMD HTML sanitizer exists in Rust**: ammonia 4.2.0 (html5ever, scalar) is the
  default answer; **lol-html is NOT SIMD** (no simd deps, no core::arch in its
  top-level sources — its speed is streaming design). SIMD in the HTML space lives in
  *escaping*: v_htmlescape 0.17.0 (13.3M) and the new html-escape-simd.
  fast-html-parser/fhp-simd 0.1.2 (2026-06-08, runtime SSE4.2/AVX2/NEON) is too
  early to recommend. simdxml 0.2.1 (XPath 1.0 over flat arrays, 2.6× pugixml on
  DBLP, vendor; single-digit stars) — experimental but genuine.

## §3 quick rows (text side, condensed)

- **JSON parse+serialize**: `serde_json` (compat baseline) → **simd-json** for max
  parse throughput (runtime dispatch, stable; MSRV 1.88) | **sonic-rs** when the
  serde-shaped API must survive (~2.8× over serde_json, vendor bench) — but
  compile-time SIMD: without `-C target-cpu=native` it silently runs the scalar
  fallback; `lazyvalue` API avoids DOM-building for partial access.
- **Byte search (single/sub-pattern)**: **memchr** (or free via `bstr`; `PackedPair`
  for candidate/rare-byte pairs) | `regex` with literal-bearing patterns — SIMD
  arrives automatically inside regex/aho-corasick; put literals in patterns to
  activate prefilters.
- **Multi-pattern search**: **aho-corasick** (Teddy auto-applied) — x86_64
  (SSSE3/AVX2 runtime) + aarch64 NEON, little-endian only; ≲100 patterns; silently
  unavailable on no_std x86_64 unless the build enables the target features.
- **UTF-8 validation**: **simdutf8** (`basic::from_utf8`) | std `str::from_utf8`.
- **Checksums**: **crc32fast** (IEEE), **crc32c** (Castagnoli) — PCLMULQDQ/
  VPCLMULQDQ + aarch64 CRC32, both runtime.
- **Compression**: **flate2 with `zlib-rs` feature** (opt-in — flate2's *default*
  backend is miniz_oxide; zlib-rs SIMD is runtime-dispatched, incl. LoongArch LSX +
  wasm) | `lz4_flex` (pure Rust, safe-by-default, ties C lz4); `zstd` bindings
  (C-side threading via `Encoder::multithread`).
- **Base64/hex/UUID codecs**: **base64-simd / uuid-simd** (Nugine; ubiquitous
  default, frozen at 0.8.0/2022 with repo maintenance continuing) and **faster-hex
  1.0** for hex (recommend over hex-simd) | escape-simd family, encodify (brand-new),
  base64-turbo (young).
- **Integer parsing**: **atoi_simd** | scalar `atoi`/`btoi`.
- **Float parsing**: **std `FromStr`** | fast-float2 only for
  no_std/byte-slice/partial-parse — algorithmic (Lemire), not SIMD.
- **HTTP parsing**: **httparse** (746M DL — already SIMD/SWAR by default).
- **General text/unicode**: **stringzilla** | **bytecount**.
- **CSV**: `csv` (writer SIMD via memchr; reader is a scalar DFA) | **simd-csv**
  (author's own caveat: gains are data-dependent).
- **XML/HTML**: `quick-xml` (memchr-accelerated read-path byte scanning **and**
  escaping; parsing logic is a scalar state machine) | simdxml (experimental). No
  SIMD HTML sanitizer exists.
- **DNS zone parsing**: none in Rust; FFI to C simdzone if that throughput is
  required.
