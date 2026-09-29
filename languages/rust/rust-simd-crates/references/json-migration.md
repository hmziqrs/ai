# serde_json → simd-json / sonic-rs migration

Source: research report §2.3 (simd-json and sonic-rs rows + headline rule), §3 JSON
row, §5.4. Data as of 2026-09-28/29. Vendor benchmark numbers are **vendor-reported**
(none reproduced by the research).

## Decision: which crate, or neither

| Constraint | Pick | Why |
|---|---|---|
| Max parse throughput, can change the API | **simd-json** | Runtime-dispatched (AVX2/SSE4.2/NEON/wasm128 + scalar fallback), stable Rust, no build flags; MSRV 1.88 |
| The serde-shaped API must survive (serde derive, `json!`, `serde_json::Value`-like ergonomics) | **sonic-rs** | Near drop-in, migration doc exists — but compile-time SIMD: without `-C target-cpu=native` it silently runs the scalar fallback |
| Only string *escaping* is hot (serialization side) | **json-escape-simd** (napi-rs, 2026-09) | Kernels taken from sonic-rs; vendor CI bench 56.23 ns vs serde_json 111.65 ns on short strings |
| Untyped partial access (read a few fields off big docs) | **sonic-rs `lazyvalue`** | `to_lazyvalue`/`get_from_str`/`get_many` — pointer-style access without building a DOM |
| You're on non-x86_64/non-aarch64 | neither | sonic-rs is "slow" there; simd-json has wasm simd128 + scalar fallback — check whether SIMD even pays |
| Typed deserialization dominated, floats-heavy | often std is fine | Rust std adopted the fast-float (Lemire) algorithm — float parsing in std is already algorithmically fast |

**Benchmark first** (report §5.4): run a quick criterion A/B — serde_json vs
simd-json vs sonic-rs on the user's **own payload shapes** — before any migration.
simd-json is API-invasive and sonic-rs constrains build flags; both costs need a
measured win to justify. Sanity-check against the vendor numbers: sonic-rs twitter
struct 827.74 µs vs simd_json 1.0872 ms vs serde_json 2.2895 ms (~2.8× over
serde_json, Xeon 8260, vendor); sonic-rs also claims simd-json on untyped parse
(vendor).

## simd-json (0.18.1, 2026-08-23; 21.5M / 5.83M DL)

Dispatch: runtime by default (the `runtime-detection` feature is on by default) —
AVX2 or SSE4.2 on x86, NEON on aarch64, wasm simd128, slow scalar fallback
(lib.rs:404–420 source-verified; the audit's compile/run on stable 1.98.1 made
`algorithm()` return NEON on an M3 Max). **No build flags needed — ever.**

The API deltas to plan around:

1. **Every parse entry point takes `&mut`** — simd-json unescapes in place. You must
   own the input bytes: parse from a `&mut [u8]` you can mutate (a `Vec<u8>` buffer
   you reuse, or a per-request copy). Borrowed `&str`/`&[u8]` straight off a static
   or shared buffer is not an option without copying first.
2. **Own DOM types, not `serde_json::Value`**: it ships `BorrowedValue` /
   `OwnedValue` / `Tape`. Type-level drop-in it is not; the serde derive path for
   typed structs is the least invasive route (the report notes DOM + serde are both
   accelerated).
3. **`prelude::*` import is needed** for the ergonomic API surface (§3 row).
4. **f64 numbers are not `Eq`** — enable the `ordered-float` feature if map keys or
   equality over numbers matter to you.
5. **Allocator-sensitive**: the vendor recommends snmalloc/mimalloc/jemalloc for hot
   paths (an earlier "snalloc" spelling in the wild was a typo). If you're already
   on a global allocator, keep it; if not, measure before adding one.
6. **Hot-loop reuse**: reuse buffers across parses via `to_tape_with_buffers` /
   `from_slice_with_buffers` instead of fresh allocations per call (sketch — check
   the current docs for exact signatures).
7. **Perf features to evaluate**: known-key interning (ahash-based), big-int-as-float,
   approx-number-parsing — each trades exactness or assumptions for speed; enable
   only with a benchmark in hand.
8. **Verify which kernel ran**: `Deserializer::algorithm()` is a public
   introspection point — on a stray machine it will tell you whether you got NEON /
   AVX2 / SSE4.2 / scalar.

## sonic-rs (0.5.10, 2026-09-11; 6.95M / 2.85M DL)

The good part: **near drop-in for serde_json** — serde derive support, a `json!`
macro, and a vendor migration doc. The `lazyvalue` API (`to_lazyvalue`,
`get_from_str`, `get_many`) gives pointer-style partial access without building a
DOM — its most distinctive perf feature.

The binding constraint: **compile-time SIMD**. `src/util/arch/mod.rs` is one `cfg_if`:
x86_64 kernels require `pclmulqdq`+`avx2`+`sse2` **all compiled in** (PCLMULQDQ
prefix_xor, AVX2+SSSE3-pshufb whitespace bitmaps), else the scalar fallback; aarch64
uses NEON (prefix_xor deliberately avoids PMULL); sonic-simd's 256-bit level needs
compile-time avx2, and 512-bit needs the opt-in `avx512` feature (Rust 1.89+). There
is **no `is_x86_feature_detected` anywhere**.

Consequences you must state to the user:

1. **Without `-C target-cpu=native` you may silently get the slow fallback** — a
   default `x86_64-unknown-linux-gnu` build compiles the scalar path (verified from
   the cfg chain). No warning is emitted.
2. **A native-built binary is unusable elsewhere** ("crash or misbehave" on CPUs
   without the assumed features). If the binary ships to other machines, sonic-rs's
   advertised performance is unavailable to you — this is the one crate in the whole
   survey where that trade is real. Everything else surveyed dispatches at runtime.
3. Raising the baseline (`-C target-cpu=x86-64-v3`) is a middle ground only when you
   control the deployment floor; the mechanics and flags belong to
   **rust-simd-kernels**.
4. The unsafe `*_unchecked` APIs skip UTF-8 validation — a correctness/robustness
   trade, not a free win; validate input provenance before using them.

## Migration checklist

1. **Capture a payload corpus** from production-shaped traffic (sizes, string
   density, nesting, number density — simd-json and sonic-rs win by different
   margins on different shapes).
2. **criterion A/B** serde_json vs candidate(s) on that corpus, release profile.
   Measurement hygiene from **rust-superopt** applies.
3. For simd-json: inventory every `serde_json::Value` touchpoint (the type swap
   ripples); decide the `&mut` buffer strategy; evaluate `ordered-float`; set up
   `*_with_buffers` reuse in the hot loop; consider the allocator.
4. For sonic-rs: confirm you control build flags for every binary that ships;
   configure `-C target-cpu=native` (or a `-v3` floor) in `.cargo/config.toml`, not
   per-command; confirm the SIMD path engaged by benchmarking, since there is no
   runtime introspection equivalent to simd-json's `algorithm()`.
5. **Parity-test** against serde_json as the oracle: empty documents, tiny
   documents, adversarial escapes, deeply nested arrays, numbers at the f64
   precision boundary, invalid UTF-8 (especially if touching `*_unchecked`).
6. Keep serde_json as a dev-dependency for the oracle tests even after the swap.

## jiter footnote

jiter (0.17.0; 746M-scale adopter ecosystem via pydantic-core) **does** carry SIMD —
baseline compile-time SSE2/NEON in `crates/jiter/src/simd/`, no runtime dispatch, no
AVX2, not advertised in its README. Correct premise: it is fast and SIMD-accelerated
but width-capped; when the ask is "AVX2 JSON kernels", the picks remain simd-json /
sonic-rs.
