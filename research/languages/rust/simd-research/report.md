# Rust Super-Optimization — Research Report & Skill Architecture

Date: 2026-09-28; **updated 2026-09-29 after Round 1 of the deep audit** (see the
Round-1 note below). Prepared by the skill architect.
Sources: the eight original research packets (each fact carries the citation given in
its packet), **plus Round 1's eight section audits (re-verification of every claim,
with refuted/unverifiable verdicts) and eight niche-research packets** (ISA primary
sources, crate internals, missing discussions, niche text/numeric crates,
superoptimizer tooling, Apple Silicon, thread-per-core ecosystem) — the new §2.9–§2.13
and the in-place corrections carry their citations inline — plus direct reading of the
existing draft skill at `/Users/hmziq/.agents/skills/rust-simd-superopt/` (SKILL.md +
4 reference files, read in full on 2026-09-28). No benchmarks or builds were run by the
architect beyond the two re-verifications below; every measured number was measured by
the cited research session, and every "verified" Rust fact was verified by the cited
compile test on rustc 1.98.1 / nightly 1.100.0 (Round-1 nightly checks re-ran on
1.101.0-nightly after rustup replaced the toolchain mid-audit).

**Post-verification corrections (2026-09-28, run by the architect after a verifier
refuted two claims):**
1. **zlib-rs is runtime-dispatched, not compile-time-only.** I downloaded
   `zlib-rs-0.6.8.crate` from crates.io and grepped the extracted source:
   `src/cpu_features.rs` calls `std::is_x86_feature_detected!("sse")` (line 15),
   `"sse4.2"` (24), avx2+bmi1+bmi2 (50–52) behind a cached `AtomicU32` (44),
   `"avx512f"` (67), `"pclmulqdq"&&"sse4.1"` (76), and
   `is_aarch64_feature_detected!("neon")` (89) / `"crc"` (99); consumed at
   `src/inflate.rs:1882` (`is_enabled_avx2_and_bmi2()`) and the writer/adler32 paths.
   The original packet's "compile-time, statically assumes CPU caps" characterization
   (drawn from the README's `-Ctarget-cpu=native` build advice) is wrong about
   dispatch; **sonic-rs is the sole compile-time-only exception** among the surveyed
   crates. *[Round-1 nuance: jiter is also compile-time-only, but at baseline width
   (SSE2/NEON) needing no build flags — §2.3; sonic-rs remains the sole crate whose
   advertised performance requires `-C target-cpu=native`.]* The README's
   native-build/crash warning still applies to *choosing*
   `-Ctarget-cpu=native`, which remains non-distributable — it just isn't required for
   zlib-rs's SIMD kernels to engage.
2. **64-byte padding measured sufficient on this M3 Max.** I re-ran
   `cd /Users/hmziq/ZCodeProject/cache-probe && cargo run --release`: no-padding
   (4 counters in one 128 B line) **36.9 ns/inc**; `#[repr(align(64))]` **2.7**;
   `#[repr(align(128))]` **2.7**; `CachePadded` **2.7**; sanity total 240,000,000
   verified. This matches the verifier's three runs (36.7–37.1 / 2.7 / 2.7 / 2.7) and
   **contradicts the original packet's** 48.8 ns/inc packed and 3.4–3.9 ns/inc
   align(64) figures. Conclusion: on this Apple Silicon part the coherency granularity
   behaves like 64 B sectors, so 64-byte separation already eliminates the measured
   penalty; the 128 B / `CachePadded` recommendation stays (portable, pessimistic-safe,
   correct for Intel's line-pair prefetcher and for cross-chip variance) but is **not**
   a measured Apple Silicon requirement. The packed-line catastrophe is robust in
   direction (~13.6–18× across sessions; magnitude varies 36.7–48.8 ns/inc between
   runs/sessions). *[Round-1 update: a fourth session measured 8.0–8.5 packed /
   0.47–0.50 padded ns/op, and align(64) came out consistently ~20–25% slower than
   align(128) — so both the absolute figures and the "64 B == 128 B" equality are
   session-dependent; teach the ratio, not the absolutes. See §2.7.]*

**Round-1 audit note (2026-09-29).** A full re-verification pass audited every section
and refuted or qualified a number of claims below; all are corrected in place and the
load-bearing ones are listed here:

- **Refuted and corrected**: the Pixel/MediaTek SVE quote in §2.2 was misattributed to
  Shnatsel (it is commenter Honest-Emphasis-4841's); crc32c's "ARM path undocumented"
  (§2.3) is stale — aarch64 CRC32C is documented and auto-enabled on rustc ≥1.80;
  jiter (§2.3) **does** contain SIMD (baseline SSE2+NEON, no runtime dispatch) — the
  "no SIMD" row was wrong; the `ispc` "~85 downloads/month" figure (§2.4, §2.6)
  matches no measurable window (≈150/month crate-wide on the 90-day window);
  safe `#[target_feature]` fns landed in Rust **1.86**, not 1.87 (§2.5, §2.6 — the
  separate 1.87 change, "most std::arch intrinsics … now callable in safe code", is
  correct as quoted in §2.1); llvm-mca **is** runnable on this host via Homebrew's
  keg-only LLVM (§2.6, §2.12); rustc does **not** emit `vfmadd` for `a*b+c` under
  `+avx2,+fma` — FP contraction is off, `mul_add` is the only route (§2.6);
  multiversion 0.9.0's syntax is `#[multiversion(targets("x86_64+avx2"))]`, not the
  positional string form (§2.6); the false-sharing **absolute** ns/op figures are not
  reproducible across sessions — only the ~14–18× ratio is stable (§2.7); `_mm_prefetch`
  is declared safe but still needs `unsafe {}`/a `#[target_feature]` caller because it
  carries `enable="sse")` (§2.7); `core::intrinsics::prefetch` no longer exists —
  split into `prefetch_read_data`/`prefetch_write_data`/`prefetch_read_instruction`
  (§2.7); SpacetimeDB's core pinning is **non-macOS**, not Linux-only (§2.8);
  relaxed-simd browser support (§2.5) was wrong for Safari (no stable Safari has it
  through Safari 27.0, Sept 2026) and Firefox (145/146, not 120+); M4 did **not**
  replace AMX with SME2 — it added SME2 alongside AMX (§2.5, §2.13); and no crate
  named `amx` exists — yvt/amx-rs was never published; the real crates are
  `amx-sys`/`amx-rs` 0.0.3 (§2.5, §2.13).
- **Labeled unverifiable**: the Linebender "too much like building a language" quote
  (§2.4) appears in no reachable primary source; "Apple steers developers to QoS
  classes" (§2.7) rests on the API's existence — the classic guidance page 404s; the
  "longer 2026 edit" of the Medium article remains recoverable only from the prior
  session's stale cache (§2.1).
- **New content merged** (new §2.9–§2.13): the 2026 thread-per-core runtime status
  (glommio hard-fork, compio, Iggy, TigerBeetle); two niche-crate surveys (text/
  parsing/serialization and numeric/crypto/ML/media); superoptimizer/codegen tooling
  status (Souper, STOKE, egg, llvm-mca/BOLT on macOS); and an Apple Silicon deep dive
  (AMX verified from userspace, M4 SME, QoS from Rust, Accelerate bindings). ISA
  primary-source closures (LLVM SVE2/SME tables, AVX10 Rev 3.0, Zen 4 double-pumping
  measured, relaxed-simd engines) are folded into §2.5. §2.2 was upgraded from a
  15-comment partial capture to the complete 46-comment thread (recovered via
  pullpush.io) plus four HN threads. §3's crate table was rewritten with the niche
  additions.

**Round-2 verification note (2026-09-29).** The second audit round re-verified the
Round-1 critical claims and refuted one part of one: **quick-xml's memchr is not
escape/write-only** — it also accelerates read paths (`src/reader/slice_reader.rs:273`
`memchr2(b'<', b'&')` in `read_text`, `src/reader/mod.rs:1202,1228`
`memchr_iter(b'>')` for Comment/CData, `src/reader/state.rs:116`,
`src/parser/element.rs:58`), while the parsing logic remains a scalar state machine.
Corrected in §2.10, §3's XML row, the executive summary, and the §4 file map (I
re-fetched and grepped all five quick-xml files from master this session to confirm
the cited lines). Everything else in the refuted claim was **confirmed** by the same
round: httparse 1.10.1's SIMD module (cloned; `src/simd/{avx2,sse42,neon,swar,runtime,
mod}.rs`; SWAR default; runtime `is_x86_feature_detected!` dispatch; the
`httparse_disable_simd`/`CARGO_CFG_HTTPARSE_DISABLE_SIMD` opt-out; 746,176,801
downloads), csv's writer-only memchr (csv-core/src/writer.rs:4,550; reader has none),
and simdzone being C with no Rust crate (crates.io: "crate `simdzone` does not
exist"). One qualifier added: the "most-downloaded HTTP parser in Rust" superlative
was never independently ranked — the download count is the verified part.

---

## 1. Executive summary

1. **The single highest-leverage change since the draft skill was written is that
   "just use a crate" got dramatically better.** A mature Rust project can get SIMD
   today via runtime-dispatching, stable-Rust crates — memchr (1.47B downloads),
   aho-corasick/regex prefilters, simdutf8, simd-json, blake3, crc32fast,
   flate2+zlib-rs — with zero nightly or `target-cpu` requirements. The **sole**
   notable exception is sonic-rs, which enables SIMD **only at compile time** and so
   requires `-C target-cpu=native` (silently falling back otherwise). zlib-rs, which
   the original survey flagged as the second exception, is in fact runtime-dispatched
   (source-verified — see the corrections preamble). The draft skill has no
   crate-adoption content at all; this becomes a whole sub-skill.

2. **Hand-written SIMD remains a last resort, and the ladder to it is well-defined.**
   Autovectorization works at opt-level 2+ for map-shaped loops but *not* for float
   reductions (measured: f32 dot product leaves all adds scalar), gathers, or
   data-dependent exits. Community pushback on Shnatsel's autovec optimism is real:
   "even a dot product often fails to auto-vectorize" and there is no mechanism to
   *guarantee* vectorization — so verification (cargo-show-asm, `-C remark=all`) is
   mandatory, not optional. Rust 1.98 (2026-08-20) stabilized `algebraic_add()` etc.,
   finally giving stable Rust an opt-in to float reassociation.

3. **The stable-portable-SIMD decision changed shape in 2026.** `core::simd` is still
   nightly-only (tracking #86656, `needs-rfc`, API still churning — `SimdFloat` failed
   to import on nightly 1.100). On stable: `wide` (build-time-only ISA selection, no
   runtime detection), `pulp` (runtime `Arch::new().dispatch`, powers faer),
   `fearless_simd` (hit v1.0.0 on 2026-09-21, Linebender, all-in-one with built-in
   multiversioning — but its chief promoter is now a maintainer, a disclosed conflict
   of interest), `macerator` (best generics, unproven), and — per Round 1 —
   **rten-simd** (stable multiversioning, Highway/pulp-inspired; §2.11). AVX-512
   intrinsics + target features are fully stable since Rust 1.89; safe fns may carry
   `#[target_feature]` since 1.86 and most intrinsics are safe to call (given enabled
   features) since 1.87; AMX/AVX10/SVE-intrinsics/SME/RVV remain nightly.

4. **Parallelism and cache behavior are where the remaining multipliers live, and the
   draft skill ignores them entirely.** Measured on an M3 Max across four sessions:
   4 atomic counters packed into one 128-byte line cost **~14–18× vs one-per-line**
   (ratio robust; absolute ns/op is session-dependent and must not be taught as a
   machine fact — packed measured 48.8 → 36.7–37.1 → 8.0–8.5 ns/inc across sessions,
   padded 3.4–3.9 → 2.7 → 0.47–0.50). In the Round-1 re-measurement align(64) came out
   consistently ~20–25% *slower* than align(128) (0.59–0.73 vs 0.48–0.50 ns/op), so the
   earlier "64 B == 128 B identical" claim is withdrawn: 64 B removes ~98% of the
   penalty, 128 B/`CachePadded` remains the portable default (also correct for Intel's
   line-pair prefetcher). macOS refuses thread pinning on Apple Silicon
   (`set_for_current` always returns `false`; THREAD_AFFINITY_POLICY returns
   KERN_NOT_SUPPORTED=46, re-verified in Round 1 by direct C call); QoS classes are
   the only P/E steering lever (measured: BACKGROUND lands on E-cores, ~2.4× slower).
   Linux pins for real via `core_affinity`/rayon `start_handler`/`sched_setaffinity`
   with NUMA first-touch.

5. **SpacetimeDB proves the ceiling is architectural, not instructional.** ~300k TPS on
   one 24-vCPU i9-14900K with **no SIMD and no io_uring anywhere in the codebase**
   (grep-verified; the one "simd" hit is a commitlog doc-comment deferring
   `varint-simd`): single-writer-per-database actors behind one RwLock, 64 KiB paged
   row store whose serialization collapses to 1–2 memcpys via precomputed layouts,
   write-behind group commit with lock downgrade, aggressive pooling, adaptive linger,
   core partitioning by thread class. Round 1 adds: a second execution engine (an
   embedded V8 host for JavaScript modules — the headline TPS was set by the
   TypeScript client), deterministic simulation testing (`dst`) as the test-side lever,
   and pinning that is non-macOS (Linux/Windows/BSD), not Linux-only. TigerBeetle is
   the contrasting sibling case (§2.9). The transferable techniques are worth a
   sub-skill of their own.

6. **The Round-1 niche surveys expand "just use a crate" well beyond the classic
   list** (§2.10–§2.11): a frozen-but-ubiquitous codec family (base64-simd 155.7M /
   uuid-simd 42.7M downloads, last released 2022-12-28), a fresh Sept-2026 wave
   (faster-hex 1.0, napi-rs escape-simd, Stalwart encodify, base64-turbo),
   hidden SIMD inside mainstream crates (httparse 746M DL ships
   `src/simd/{avx2,sse42,neon,swar}.rs`; csv uses memchr on its write path only, while
   quick-xml's readers also memchr-accelerate their byte scanning), RustCrypto's
   runtime VAES (aes 0.9.3, 332M DL),
   rten-simd (stable-Rust multiversioning, Highway/pulp-inspired), and standouts
   turbovec (17.3k★, AVX-512 VNNI + NEON SDOT kernels) and jxl-oxide. Negative
   results worth teaching: simdzone is C not Rust (no Rust SIMD DNS zone parser
   exists), fast-float2/lexical/fastdate are algorithmic not SIMD, ammonia/lol-html
   are not SIMD, and there is no SIMD HTML sanitizer.

7. **Architecture decision (re-affirmed after Round 1)**: one main skill
   (`rust-superopt`) for triage/routing plus four sub-skills (`rust-simd-crates`,
   `rust-simd-kernels`, `rust-parallel-cache`, `rust-fast-architecture`). Round 1 grew
   the evidence volume ~40% but did not change the trigger topology — every new
   finding maps onto an existing coverage area; the crates sub-skill gains a second
   reference file, and the superoptimizer/tooling findings become a new reference file
   inside the main skill rather than a sixth skill (which would race with the router on
   "superoptimize" triggers). The existing draft is **restructured** into
   `rust-simd-kernels` (its ladder concept and reference skeletons survive, updated for
   Rust 1.86/1.87/1.89/1.98 and the 2026 crate landscape) and the old skill directory is
   retired to avoid two skills firing on the same triggers. Full justification in §4.

---

## 2. Detailed findings per research topic

### 2.1 The state of SIMD in Rust — Shnatsel's 2025 survey and 2026 follow-up

**Sources**: "The state of SIMD in Rust in 2025" (https://shnatsel.medium.com/the-state-of-simd-in-rust-in-2025-32c263e5f53d,
published 2025-11-05; live text verified verbatim against Wayback snapshot of
2026-09-02); the author's 2026 follow-up (https://shnatsel.github.io/state-of-simd-rust-2026/,
2026-09-25, fetched in full); crates.io API for fearless_simd; HN thread 45826348.

**Provenance caveat that matters for the skill**: the live Medium article is the
original Nov-2025 short version **in substance**. Round-1 auditing of three Wayback
snapshots (2025-11-05, 2026-05-26, 2026-09-02) found Medium did edit one paragraph in
place between Nov-2025 and May-2026 (fearless_simd described as "largely a copy of
pulp's design made for use in vello" → "inspired by pulp's design… fixed-size
chunks"), so "live = original" holds in substance, not byte-for-byte. The longer 2026
edit (recommending fearless_simd, with an editor's note disclosing the author became a
fearless_simd maintainer, benchmarks showing "up to 2x faster", AVX-512 downclocking
data, bytemuck guidance) was retrieved only from a stale reader cache and could not be
dated; it is absent from every Wayback capture through 2026-09-02 (the 2026-09-27
capture is a 403, so post-09-02 state is unverifiable). The skill must not present
fearless_simd's superiority as settled fact — it rests partly on maintainer-run
benchmarks.

**The four approaches** (ascending effort): automatic vectorization; fancy iterators;
portable SIMD abstractions; raw intrinsics. The 2026 survey drops "fancy iterators"
entirely — the one crate taking that approach (`faster`) "has been abandoned for
years" (its last release is 0.5.2, 2021-03-25, per the crates.io API).

**Feature detection is an x86-only problem**: the compiler may only emit SSE2 on x86
by default; either assert the target (`RUSTFLAGS='-C target-cpu=x86-64-v3'` — the
article's wording is the program will "crash or misbehave" on CPUs without AVX2) or
multiversion (compile the function several times, dispatch at runtime). NEON is
mandatory on all 64-bit ARM and never expanded beyond 128-bit (SVE "in 2025 is still
mostly on paper"; Rust support in progress, rust-lang/goals#270 "Sized Hierarchy and
Scalable Vectors" — the issue redirected when rust-project-goals was renamed).
wasm needs two binaries with JS-side detection.

**Autovectorization**: "works surprisingly well, as long as you structure your code in
a way that is amenable to vectorization" (matklad's "Can You Trust a Compiler to
Optimize Your Code?" is the reference). Verify with cargo-show-asm or godbolt.org —
"but your benchmarks are the ultimate judge". Two hard limits: there is a complexity
cap that may change between compiler versions ("If something vectorizes today that
doesn't necessarily mean it still will in a year from now"), and **floats**: the
optimizer "won't even touch anything involving floats" because reordering may alter
results; the opt-out (`f64::algebraic_add`) was nightly-only at publication. **Rust
1.98 (2026-08-20) stabilized the algebraic ops**, per the 2026 survey — this supersedes
the draft skill's "float reductions never auto-vectorize" rule (§2.6 has the measured
nuance). The `multiversion` crate "works great with autovectorization".

**Portable SIMD crates** (2025 TL;DR: "use std::simd if you don't mind nightly, wide if
you don't need multiversioning, and otherwise pulp or macerator"):

| Crate | 2025 assessment | 2026 delta |
|---|---|---|
| `std::simd` | supports all instruction sets LLVM supports; "nightly-only and will remain such for the foreseeable future"; "pairs well with the multiversion crate" (a pairing the old table omitted) | unchanged; `sleef` is the best trig ("only a little buggy"; sleef 0.3.3, 2026-02-21, 26.7k DL) but third-party extensions don't compose; `reduce_sum()` is "the worst case for both performance and accuracy" |
| `wide` | mature; NEON/WASM/all x86; **no multiversioning at all** (cargo-multivers "very exotic") | "fundamentally incompatible with multiversioning"; work around lack of generics with macro_rules!; **trig precision "explicitly left unspecified"** and its `sin()` is called out: "shipping scalar implementations in a SIMD guise is the cardinal sin" — a concrete float-function warning beyond the multiversioning incompatibility |
| `pulp` | built-in multiversioning; powers faer so performance proven; **native SIMD width only** (code must handle variable-width chunks); f32+f64 means duplication; only NEON/AVX2/AVX-512 (only 75% of Firefox-survey systems have AVX2) | fixed-width vectors "technically possible, but completely undocumented and quite awkward"; most verbose multiversioning; uniquely enables safe non-level intrinsics (e.g. `_mm_aesenc_si128`) via `simd_type!` ("the best (and only) way to do it safely"); maturity datapoint: Shnatsel "contributed some fixes for them while researching, including for a soundness bug" |
| `macerator` | pulp fork, better generics, all x86 + WASM + NEON + LoongArch; "oddly obscure and therefore unproven" (used only by burn-ndarray, optionally) | adds element-type generics, drops safe intrinsic access and most documentation; f16 support; "still only used by burn" is *slightly* stale — crates.io reverse-deps now list 8 (burn-ndarray/burn-flex/burn-vision plus five RUDA-project crates); the load-bearing point (tiny adoption, unproven) holds |
| `fearless_simd` | pulp-inspired + fixed-size chunks; "far less mature… supports NEON, WASM and SSE4.2, but not the newer x86 extensions. Seems too immature just yet" | **v1.0.0 released 2026-09-21** (crates.io API: 6.55M total / 4.80M recent as of 2026-09-29; repo linebender/fearless_simd; published by Laurenz Stampfl — the second driving maintainer beside Shnatsel; MSRV 1.89, edition 2024, ~99.6k lines, zero-dependency no_std core); now an "all-in-one solution": multiversioning via `#[simd]`, AVX-512 only on Ice Lake+/AMD (downclocking-aware), orders of magnitude less unsafe; gaps: explicit `simd: S` boilerplate, no trigonometry. **Its multiversioning "is controlled by whoever builds the final binary"** — an end-user-build-flags property that matters for library authors (neatly inverts the sonic-rs build-flag gotcha). x86 ladder: SSE2/SSE4.2/AVX2 + two AVX-512 tiers (early-slow vs Ice Lake+); NEON + extension levels on ARM; scalar fallback only on 32-bit x86 |
| `simdeez` | all instruction sets except AVX-512, built-in multiversioning, "barely used" (291k total DL); README admits only i32/i64/f32/f64 "well fleshed out" | **excluded from the 2026 survey**: "development is primarily AI-driven… disconcertingly buggy" (real correctness bug: arduano/simdeez#131, "Tests check for ULP<=35, not ULP<=3.5", open since 2026-08-31) — do not recommend. The survey excludes more than simdeez: `magetypes` and `thermite` (also AI-driven), and `jxl_simd`/`pathfinder_simd` ("not intended for a general audience") |

**Raw intrinsics**: cost model is one implementation per platform × per instruction set
("That's a lot of code!"), with real-world pain examples: safe_arch (multiversioning
clash), zune-jpeg's `unsafe_utils_avx2.rs`, jxl-rs's arcane macros. The 2025 bright spot,
verified against the official Rust 1.87.0 release notes: "Most std::arch intrinsics that
are unsafe only due to requiring target features to be enabled are now callable in safe
code that has those features enabled"; `safe_unaligned_simd` wraps the rest.
Multiversioning is DIY on `std::is_x86_feature_detected!`, which "is somewhat slow…
beneficial to detect available features exactly once and then cache the results".

**2026-survey hardware facts worth keeping in the skill**: 15% of x86 CPUs still lack
AVX2 (Firefox survey); Steam survey 23.9% AVX-512; AVX-512 downclocking on pre-Ice-Lake
Intel reduces frequency of **all** cores (fixed in Ice Lake 2019; AMD never had the
issue); Zen 4 executes 512-bit ops on 256-bit units and "still smoked" Intel; NEON is
≈AVX2-quality (same base64 algorithm 1.5–2× faster on NEON than AVX2, 2× slower than
AVX-512); SVE2 "pretty much useless" (128-bit implementations); RISC-V RVV irrelevant
in 2026; subnormal math ~30× slowdown on Intel vs ~2× AMD; LLVM sometimes
autovectorizes into scatter/gather that is 1.75× (Intel) to 4× (AMD) slower.

**Multiversioning overhead rule of thumb** — provenance corrected in Round 1: the
wording is **exact and verbatim in the verifiable 2026 survey** (not, as previously
attributed, the unverifiable "expanded edit"; harmless mis-attribution, conservatively
worded): "if your function has a loop in it, add #[multiversion]; if it processes
a handful of values add #[inline(always)], so long as there is #[multiversion]
somewhere up the call chain." The survey also quantifies the per-call cost of a
`#[multiversion]` function as "a little bit of overhead" (about a dozen instructions).
Related 2026 sharpening: cargo-multivers "only works for long-running programs" —
more actionable than 2025's "very exotic".

**fearless_simd internals** (Round-1 source review, §2.11 cross-ref): `Level` is a
non-exhaustive enum of zero-sized capability tokens; `Level::new()` detects once on
x86 (an Ice-Lake AVX-512 34-feature conjunction sourced literally from
`rustc --print=cfg -C target-cpu=icelake-server`, then x86-64-v3, v2, SSE2+fxsr,
fallback) cached in an `Aligned128<LazyLock>`; non-x86 targets use statically known
baselines. `dispatch!(level, simd => expr)` monomorphizes per level with binary-size
opt-outs (`--cfg disable_dispatch_sse2|sse4_2|avx2|avx512`). The audited unsafe
surface: `assume_supported()` const fns carrying `#[target_feature]`, a `kernel!`
macro that makes raw intrinsics safe inside a wrapped safe fn (rejects `unsafe fn`
bodies), and an internal bytemuck-style `SimdPod` transmute layer.

### 2.2 Community reception — r/rust thread (complete as of Round 1) and the HN threads

**Sources**: the original Wayback capture of the old.reddit rendering
(2025-11-05T19:42:34Z, ~4.5h after posting, 15 comments) **plus the Round-1 recovery
of the complete 46-comment thread** via `api.pullpush.io/reddit/search/comment/?link_id=1op5jlj`
(all 31 post-capture comments, 2025-11-05T21:25 → 2026-03-29; the 15 pre-capture
comments matched the Wayback read author-for-author, which is the accuracy check —
pullpush is the sole source for the tail, Wayback holds no readable text of it).
Submission metadata: posted **by u/Shnatsel himself** (the article author) on
2025-11-05T14:35:13Z, eventual score 260; the recovered set is 46 comments (the
eventual permalink count renders 45 and pullpush's cached num_comments says 44 —
count drift from deletions/ingest; the 46-item array is internally consistent) — so
"community reception" includes the author defending his own article in-thread.

**Corrections from the Round-1 audit of the original 15-comment read**:
- The sentence "SVE ships in the two latest Google Pixel and MediaTek CPU generations"
  was **misattributed** — it is commenter Honest-Emphasis-4841's claim (the same
  third-party commenter who posted the top SVE comment and an unrelayed rumor that
  Qualcomm SoCs have SVE present but disabled), **not** Shnatsel's. The hardware fact
  itself was not independently verifiable from this M3 Max host.
- "Raw core::arch intrinsics remain the working default for several commenters"
  overstated: exactly **two of fifteen** said so (Western_Objective209: "I've had to
  use raw intrinsics for the most part"; ChillFish8: "I end up using the raw
  intrinsics anyway"); a third (ansible) tried raw intrinsics and "bounced off of that
  hard" — the steep-on-ramp counterpoint the section previously omitted.

- **Strongest pushback targets autovec optimism** — and the Round-1 recovery shows the
  dispute was eventually *resolved in-thread*. Western_Objective209 (13 pts) blockquotes
  "It works surprisingly well…" and rebuts: **"I have not found this to be the case;
  even something as simple as a dot product often fails to auto-vectorize."** iwxzr
  (6 pts): with no mechanism to *ensure* vectorization, autovec is "generally
  unsuitable for writing computational kernels… it is simply a nice surprise gift from
  the compiler." **The resolution** (post-capture comments): dm603 (13 pts) identified
  IEEE float non-associativity as the blocker — "the currently-unstable algebraic
  operations take care of this, and also allow autovec to use fused mul-add too"
  (godbolt.org/z/MrPefccoE); Shnatsel showed the iterator version "vectorizes just
  fine, but only if you indicate to the compiler that it's allowed to calculate your
  floats with reduced precision" (godbolt.org/z/zs44s8vnv; orlp.net/blog/taming-float-sums/);
  and WormRabbit closed the loop with the sharpest practitioner detail — the
  "unvectorized" `dot_index_unrolled` *does* use vector ops, the difference vs
  `dot_avx2` is accumulator width (2 vs 8 floats), and **"somewhy passing a `&mut
  chunk_iter` into the loop iterator inhibited the optimization… nested explicit
  indexing, the compiler gets confused. It could probably be solved with strategic
  `assert!` statements"** — a concrete autovec pitfall worth teaching. WormRabbit also
  states the scope limit: autovec is "quite reliable for relatively simple
  computations… Unfortunately, it doesn't scale that well to function calls."
- **Top comment (24 pts) corrects the SVE picture**: "SVE works with autovectorization
  as well, even on stable. Unfortunately, excluding pure asm this is currently the only
  way to use SVE in Rust." (Same for RISC-V RVV per camel-cdr-'s "same for rvv" —
  Round-1 compile tests bore both out on stable 1.98.1, with the caveat that rustc
  warns "unstable feature specified for -Ctarget-feature: `v`" on stable, so
  RVV-on-stable is more qualified than SVE-on-stable.)
- **Missing technique the article skipped** (RelevantTrouble, endorsed by fintelia):
  the `chunks_exact()` + `remainder()` trick for helping SIMD codegen; "or even better,
  the `as_chunks` method that recently became stable" (stabilized in 1.88.0,
  2025-06-26 — "recently" was accurate in Nov 2025).
- **Crates the article missed**, added by their own maintainers: **rten-simd** +
  **rten-vecmath** (RTen ML runtime; vectorized softmax/activations/exp/trig kernels —
  see §2.11); macerator's author explains it split from pulp over type-generic
  usability (pulp's per-register associated types make type-generic wrappers hard;
  macerator uses a single untyped register type) and is SVE-blocked because "Rust
  doesn't properly support unsized concrete types". The post-capture tail adds the
  pulp maintainer's (reflexpr-sarah-) revelation: **"faer has a wasm simd impl for
  matmul independent from pulp. i really should merge it upstream"** — resolving a
  commenter's confusion (SIMD seen in wasm faer binaries is compiler-autovectorized
  pulp fallback, not pulp WASM intrinsics).
- **Contrarian defense**: valarauca14 — "The state of Rust SIMD is actually pretty
  good"; compilers legitimately decline to vectorize because packing/unpacking,
  swizzling, loss of OoO execution from false dependencies, and cross-domain data
  movement have non-trivial costs. Good context for the skill's "don't fight the
  compiler" tone.
- **Practitioner default** (corrected count above): raw `core::arch` intrinsics for
  two of the first fifteen commenters; ChillFish8 (integer-compression library) notes
  AVX2 vs AVX-512 kernels often must differ structurally (multiply+horizontal-add vs
  convert+vertical-add), and argues safe-SIMD abstractions "end up making it much
  harder… to understand what the ASM is going to look like". Post-capture: Shnatsel
  on why raw intrinsics don't scale — "an FFT library that has 3 algorithms for 5
  instruction sets and 2 types… added up to 30 mostly handwritten implementations.
  And I gave up trying to optimize that". Lokathor (wide's author), on wide: "Ugh
  don't *tell* people about the `wide` crate or they might actually use it."
- **Author in-thread** (genuine Shnatsel comments): SME on M4 behaves like an
  accelerator (dedicated mode where most ARM instructions don't work — Fridux's
  comment originated that discussion); "if your workloads benefit from wide SIMD then
  just get a cloud instance with Zen 5, it's still more cost-effective" than SVE ARM
  instances. (The Pixel/MediaTek SVE sentence moved to Honest-Emphasis-4841 above.)
- In-thread mockery of simdeez ("simdeez roflcopter", autodialerbroken116)
  independently corroborates §2.1's do-not-recommend stance.

**Hacker News threads** (Round-1 recovery via hn.algolia.com, all read in full):
- **Story 45826348** (2025 article, 237 pts, **155 comments**): mdriley (Chromium) —
  the article's TL;DR "matches the conclusion we reached for Chromium. We were okay
  with nightly, so we're using std::simd but trying to avoid the least stable APIs"
  (a production datapoint for nightly std::simd). **burntsushi** (ripgrep/memchr):
  "ripgrep wouldn't be as fast as it was if it weren't possible to use SIMD on stable
  Rust"; "There's no optimal portable `movemask`… aarch64 NEON doesn't have it"; and
  the **memchr pattern** — a `Vector` trait generic over the vector type,
  `#[inline(always)]` inside, `#[target_feature(enable=…)]` only at the instantiation
  entry point. **kouteiheika's rebuttal** (six concrete pain points, the strongest
  anti-hand-SIMD case on record): `#[inline(always)]` can't combine with
  `#[target_feature]`, you must annotate the whole call stack, and "any mistake… will
  just have the compiler silently not inline the intrinsics, completely killing your
  performance, and you're completely on your own debugging it". JoshTriplett gives
  the authoritative list of reasons std::simd remains unstable (massive problem, std
  stability guarantee, ecosystem crates can ship semver-majors, "many people already
  use non-portable SIMD for the 1-3 targets they care about"). exDM69: ~4 years on
  nightly std::simd, "~20x my scalar code, 5x from just a naive translation";
  f32x8 beat f32x4 even on 128-bit hardware; camel-cdr: "For Zen5 you probably want
  to use f32x32". The -ffast-math debate (silentvoice vs Sharlin's "-fwrong-math";
  Tuna-Fish: "You can write good autovectorized code in Rust today, but only for
  integers") and the Julia/andyferris comparison (zero trouble autovectorizing —
  the float-semantics difference is Rust-specific). Cross-language context: C#
  `Vector<T>` ("C# is blessed"), Go (plan9 asm renames/ABI0/no inlining,
  golang/go#73787), Java Vector API blocked on Valhalla.
- **Story 49844629** (2026 survey, 203 pts, 60 comments, active through 2026-09-28):
  **raphlinus** (Linebender/fearless_simd author) rebuts the "no portable SIMD" hot
  take: "There is a big gap between just autovectorization and the portable
  primitives a library like Highway or Fearless SIMD will give you. For example, I
  haven't seen autovectorization do select or swizzle"; explains fearless_simd's
  "downcasting" (microarchitecture specialization); "The day of 'fire and forget'
  portable SIMD has not yet arrived"; "you do have to measure… I frequently look at
  the assembler output". simonask: "Auto-vectorization is actually quite fragile in
  2026". ack_complete on AArch64 tooling: no portable CPUID equivalent, Arm is
  "terrible at documenting which intrinsics require specific FEAT_* flags" ("execution
  details had to be reverse engineered for Apple M1, and there is nothing for Oryon");
  Steam survey AVX2 95.4% vs AVX512F 23.9%. tancop: games now ship AVX2-hard
  requirements; swiftcoder/ack_complete: Win11's floor is actually only
  SSE4/POPCNT, not AVX2. cbolton pushes back on the survey's RISC-V dismissal
  (SpacemiT K3 RVV 1.0 with vlen 256/1024; SiFive X280 in Google TPUs).
- **Story 49800085** ("Fearless SIMD v1.0", 316 pts, 52 comments, 2026-09-22): JMKH42
  (SIMDeez's original author) congratulates; orlp (Polars) contributes IEEE-754
  minimumNumber AVX2 sequences, dzaima superoptimizes them to 5 instructions and
  files LLVM issue 217376; **Dr_Emann: memchr-n built on fearless_simd "tends to
  outperform the rust memchr crate"** (BurntSushi/memchr#241); O3marchnative:
  **PhastFT moved std::simd→fearless_simd to reach stable Rust**. Adoption evidence
  for the pattern beyond Linebender: **Philbin** (val.markovic.io, 2026-09-28), a
  pure-Rust AEGIS AEAD library with two unsafe lines total, built on the "CPU feature
  tokens" approach "pioneered by Sergey 'Shnatsel' Davidoff and the rest of the
  Fearless SIMD team" (announced on HN by jedisct1/Frank Denis, libaegis author).
- A "fearless_simd parser-performance-debugging article" **does not exist** in the
  survey's link graph (Round-1 exhaustive href inventory); the survey's one
  fearless_simd article is "Safe SIMD in Rust, even on the inside"
  (shnatsel.github.io, 2026-06-19), whose second half is a genuine
  performance-debugging story: `#[target_feature]` blocks inlining of `a + b`, so
  every caller needs `#[inline(always)]` or "performance will plummet… watch the
  generated assembly turn into absolute horror show" (shipped as v0.5).

### 2.3 SIMD crates I — parsing, serialization, text (all data from crates.io API + README/docs fetches, 2026-09-28; no local benchmarks — all perf numbers are vendor-reported)

**The headline rule**: every crate below runs on stable Rust, and every one with
ISA-optional kernels dispatches them **at runtime** except sonic-rs — never require
nightly, and never instruct `-C target-cpu=native` for distributable binaries.
(zlib-rs was initially believed to be a second compile-time-only exception based on its
README's native-build advice; source inspection of 0.6.8 disproved this — its kernels
are runtime-dispatched. See the corrections preamble and the table row below. Round-1
audit compile/run-tested the whole set on stable 1.98.1, default target, no
target-cpu flags: all built, ran, and picked the right kernels — simd-json
`algorithm()` returned NEON on this M3 Max.) One nuance the audit added: **jiter is
also compile-time-only** — but at *baseline* width (SSE2/NEON), so it needs no build
flags; see its row. sonic-rs remains the sole crate whose advertised performance
requires `-C target-cpu=native`.

| Crate | Accelerates | Dispatch | Latest (date) | DLs total/recent | Key gotchas |
|---|---|---|---|---|---|
| **simd-json** | JSON parse (DOM + serde) | Runtime (default feature `runtime-detection`): AVX2 or SSE4.2; NEON; wasm simd128; slow scalar fallback (lib.rs:404–420 — verified; `algorithm()` returns NEON on this M3 Max) | 0.18.1 (2026-08-23); **MSRV 1.88** | 21.5M / 5.83M | Not a type-level drop-in: **every parse entry point takes `&mut`** (in-place unescaping); ships `BorrowedValue`/`OwnedValue`/`Tape`, not `serde_json::Value`; f64 numbers not `Eq` without `ordered-float` feature; allocator-sensitive (recommends **snmalloc**/mimalloc/jemalloc — earlier "snalloc" was a typo); hot-loop reuse via `to_tape_with_buffers`/`from_slice_with_buffers`; perf features (known-key/ahash, big-int-as-float, approx-number-parsing); `Deserializer::algorithm()` is a public introspection point for which kernel ran |
| **sonic-rs** | JSON parse+serialize | **Compile-time only** — `src/util/arch/mod.rs` is one cfg_if: x86_64 kernels require `pclmulqdq`+`avx2`+`sse2` **all compiled in** (PCLMULQDQ prefix_xor, AVX2+SSSE3-pshufb whitespace bitmaps), else scalar fallback; aarch64 NEON (prefix_xor deliberately avoids PMULL); sonic-simd's 256-bit level needs compile-time avx2, 512-bit needs the opt-in `avx512` feature (Rust 1.89+). No `is_x86_feature_detected` anywhere; README requires `-C target-cpu=native` | 0.5.10 (2026-09-11) | 6.95M / 2.85M | Near drop-in for serde_json (serde derive, `json!`, migration doc); without target-cpu you may **silently get the slow fallback** (a default `x86_64-unknown-linux-gnu` build compiles the scalar path — verified from the cfg chain); native-built binaries unusable elsewhere; unsafe `*_unchecked` APIs skip UTF-8 validation; non-x86_64/aarch64 = slow. Vendor bench (Xeon 8260): twitter struct 827.74 µs vs simd_json 1.0872 ms vs serde_json 2.2895 ms (~2.8×); also beats simd-json on untyped parse. **`lazyvalue` API** (`to_lazyvalue`/`get_from_str`/`get_many`) — pointer-style partial access without building a DOM, its most distinctive perf feature |
| **memchr** | byte find/memmem | SSE2 always on x86_64 (arch/x86_64/mod.rs:6); AVX2 runtime via `std::is_x86_feature_detected!` only under the crate `std` feature (avx2/memchr.rs:93-108 — same hybrid as aho-corasick: `cfg(target_feature="avx2")` short-circuits to true); NEON + wasm without std; SWAR fallback | 2.8.3 (2026-07-08) | 1.47B / 369M | Gains vanish on tiny haystacks; no_std loses runtime AVX2 detection; MSRV 1.61. **`PackedPair`** (candidate/rare-byte pair search) is the SIMD surface regex-automata's prefilter uses beyond plain memchr |
| **aho-corasick** | multi-pattern search (Teddy) | **Three-layer gating (source-verified in 1.1.5)**: compile-time arch cfg (x86_64 under baseline sse2 — always; aarch64 under neon+little-endian; all else `{None}`), then runtime SSSE3/AVX2 via `is_available_ssse3()/is_available_avx2()` — which under `no_std` return **false**, silently disabling Teddy unless the whole build enables the features; FatAVX2/SlimAVX2/SlimSSSE3/SlimNeon kernel variants | 1.1.5 (2026-08-03) | 1.18B / 253M | Builder skips Teddy at >64 patterns (docs round to "on the order of 100 or so"); construction can fail (auto-fallback to NFA/DFA); "sometimes by an order of magnitude faster" than the automaton (the earlier "often" overstated the docs); prefilter ladder starts with memchr on ≤3 rare bytes |
| **regex** | regex matching | **No SIMD of its own** — `perf-literal` (default) pulls memchr + aho-corasick; no core::arch/std::arch in regex or regex-automata sources | 1.13.1 (2026-07-15) | 1.20B / 258M | Prefilter only helps patterns containing literals; put a literal (prefix or rare byte like `@` in `\w+@\w+`) in the pattern; high-FP prefilters can even slow via "ping-ponging between the prefilter search and the regex engine" (regex-automata prefilter docs) |
| **bstr** | byte-string ops | via memchr (only required dep, Cargo.toml:122) | 1.13.1 (2026-08-10) | 432M / 95.1M | Not a SIMD engine; UTF-8-optional string API |
| **simdutf8** | UTF-8 validation | SSE4.2 + AVX2 runtime on x86 (std); NEON automatic since Rust 1.61; wasm compile-time | 0.1.5 (2024-09-22) | 227M / 73.4M | `basic::from_utf8` is the drop-in (zero-sized error — measured `size_of::<basic::Utf8Error>()==0`); `compat` gives serde-style errors; avoid `opt-level="z"` (kills inlining); `public_imp` feature exposes the raw SIMD implementations and streaming-validation traits; no release in ~2 years (single maintainer) |
| **crc32fast** | CRC-32 IEEE | PCLMULQDQ + VPCLMULQDQ (256/512-bit; those need Rust 1.89+); aarch64 crc32 3-way interleaved; runtime in `Hasher::new` (needs std) | 1.5.2 (2026-09-12) | 715M / 168M | Vendor bench 7314 MB/s vs 207 for `crc` crate; fuzzed + ASan CI; check value verified correct on this host |
| **crc32c** | CRC-32C | SSE4.2 CRC32, runtime cpuid unless compiled with +sse4.2; **aarch64 CRC32C documented and auto-enabled on rustc ≥1.80** (README.md:13-14; build.rs:196-197 sets the `armsimd` cfg — verified active by default on this 1.98.1 host, check value 0xE3069283 correct) | 0.6.8 (2024-06-09) | 84.7M / 15.8M | Slow release cadence — but the earlier "ARM path undocumented" gotcha is **stale** (corrected in Round 1) |
| **flate2 + zlib-rs** | DEFLATE/zlib/gzip | **Runtime** (source-verified in zlib-rs 0.6.8): `src/cpu_features.rs` uses `is_x86_feature_detected!` for sse/sse4.2/avx2+bmi1+bmi2 (cached in an `AtomicU32`)/avx512f/pclmulqdq and `is_aarch64_feature_detected!` for neon/crc, consumed in the inflate/writer/adler32 paths; **also runtime-detects LoongArch LSX** (behind the `lsx` feature, cpu_features.rs:104-112) and wasm32 simd128 (:114-120). The README's `-Ctarget-cpu=native` advice is optional extra codegen, and native builds remain non-distributable ("almost certainly crash" on other machines) | zlib-rs 0.6.8 (2026-09-15); flate2 1.1.10 | zlib-rs 153M / 66.5M; flate2 707M / 164M | Feature-flag swap: `flate2 = { version = "1", default-features = false, features = ["zlib-rs"] }` — but note **flate2's default backend is `rust_backend` (miniz_oxide), NOT zlib-rs**; zlib-rs is strictly opt-in. The backend first appeared in flate2 **1.0.29 (2024-04-26)** (as libz-rs-sys 0.1.1; direct zlib-rs 0.6 dep since 1.1.7, 2025-12-05); 1.1.10 defaults are `rust_backend` + `runtime_detection`. `-Cllvm-args=-enable-dfa-jump-thread` ≈ +10% only for 16-byte chunks ("couple percent" under 1 KiB, "not significant" beyond); Trifecta Tech Foundation maintained; "generally on-par with zlib-ng" |
| **highway** | keyed strong hashing | SSE4.1/AVX2 runtime via `std`; **NEON on aarch64 (NeonHash)**; wasm opt-in; no_std → portable | 1.3.0 (2025-01-11) | 3.75M / 752K | Non-cryptographic; poor for <100-byte payloads |
| **fast-float2** | float parsing | n/a (algorithmic — Eisel-Lemire in scalar code; no core::arch anywhere in src) | 0.2.4 (2026-08-14) | 21.3M / 8.65M | **README recommends std `FromStr`** — Rust std adopted the algorithm; original `fast-float` unmaintained since 2021; fork is in maintenance mode; only for no_std/byte-slice/partial-parse. Describe it as "Lemire fast float parsing", not SIMD |
| **jiter** | iterable JSON | **Baseline compile-time SIMD** (corrected in Round 1): `crates/jiter/src/simd/` ships x86_64 SSE2 (`std::arch::x86_64` under `#[target_feature(enable="sse2")]`) and aarch64 NEON (vld1q_u8/vcgtq_u8…) for string/number chunk decoding — no runtime dispatch, no AVX2, not advertised in the README | 0.17.0 | 746M-scale adopter ecosystem (via pydantic-core etc.) | Fast, but SIMD-width-capped at baseline; do NOT categorize as SIMD-free (the old row's premise was wrong) — and it still isn't the pick when you want AVX2 kernels (that's simd-json/sonic-rs) |
| **rapidhash** | non-SIMD hashing (listed so the skill does NOT recommend it as SIMD) | — | — | — | explicitly "no dependency on vectorized or cryptographic hardware instructions" (README:9, exact) |

### 2.4 SIMD crates II — math, hashing, codecs, C bindings (crates.io API, 2026-09-28; vendor-reported perf)

**Explicit-vector crates (the stable-portable-SIMD landscape)**:

| Crate | Latest | DLs | Dispatch | Notes |
|---|---|---|---|---|
| `wide` 1.7.1 | 2026-09-14 | 76.09M / 18.65M | **build-time only** — runtime detection "does not work with wide"; x86 defaults SSE2; wasm needs `+simd128` | "Near drop-in replacement for std::simd"; explicit MSRV policy (1.89); lowest friction when you control build flags; depends on safe_arch on x86 (ironic given the survey's safe_arch critique) and on bytemuck |
| `pulp` 0.22.3 | 2026-06-20 | 26.55M / 12.35M | **runtime** (`Arch::new().dispatch(...)`); `WithSimd` trait; `with_simd!` macro (pulp-macro dep) | Powers **faer** (faer Cargo.toml pins pulp 0.22.2 with `x86-v3` default; `x86-v4` only inside faer's `nightly` feature; rayon optional but **on by default**); safe abstraction over core::arch; sparsely documented — the "~21% documented" figure is **not reproducible** (Round-1 `rustdoc --show-coverage` on aarch64: 8.7% total, lib.rs alone 19.9%; x86 cross-build failed on dep errors), so say "sparsely documented", not a number |
| `simdeez` 3.0.1 | 2026-03-25 | 0.29M / 0.04M | runtime `simd_runtime_generate!` + compile-time | Tiny adoption; 2026 survey calls development AI-driven and buggy — avoid |
| `fearless_simd` 1.0.0 | 2026-09-21 | 6.55M / 4.80M | one-time `Level` token; `#[simd]` multiversioning; internals in §2.1 | Linebender; see §2.1 COI caveat; MSRV 1.89 |
| `vek` 0.17.2 | 2025-09-23 | 1.24M / 0.14M | **none ever** (corrected in Round 1) | On **stable**, vek is `#[repr(C)]` structs with macro-generated per-lane scalar ops relying on autovectorization — no runtime detection, no core::arch intrinsics anywhere in src/. Real SIMD only on **nightly + non-default features**: `repr_simd` (`#[repr(simd)]` for power-of-two lanes) and `platform_intrinsics` (`std::intrinsics::simd`); non-power-of-two Vec3 is forced `#[repr(C)]`. Treat as convenience 2D/3D math, not a SIMD toolkit |

**Domain crates**:
- **glam** 0.33.11 (148.9M DL; released 2026-09-27): Vec3A/Vec4/Quat/Mat3A/Mat4/Affine* use 128-bit SIMD storage on x86/x86_64/wasm/aarch64-NEON (vec3a.rs: `__m128`/`v128`/`float32x4_t` backends). **Compile-time features only** (SSE2 default x86_64, NEON default aarch64, wasm needs `+simd128`); `core-simd` feature = nightly portable_simd; **`fast-math` feature is deprecated and has no effect — do not recommend it** (Cargo.toml: "Deprecated and no longer has any effect. Kept so existing Cargo manifests continue to build").
- **rustfft** 6.4.1 (29.77M; **maintained repo is ejmahler/RustFFT** — awelkie/rustfft is the stale 2021 original): planner-based **runtime cascade** AVX+FMA → SSE → FCMA (Arm v8.3 complex fused ops) → NEON → WASM-SIMD → scalar (src/plan.rs:79-102); AVX planner requires runtime `avx`+`fma`; AVX2 optional, unlocking radix 5/7/11; **no AVX-512 path**; per-ISA planners are public so users can force or refuse SIMD. **Critical gotcha: "bypassing the planner will disable all AVX, SSE, Neon, and WASM SIMD optimizations."** Sizes `2^n * 3^m` fastest; no threading — parallelize across FFTs yourself. Butterflies are code-generated (`tools/gen_simd_butterflies`). `realfft` 3.5.0 wraps it and forwards its SIMD features. **PhastFT** 0.4.1 (2026-07-31) is the fearless_simd-0.5-based, 100%-unsafe-free alternative for power-of-two sizes (§2.11).
- **blake3** 1.8.7 (189.95M): SSE2/SSE4.1/AVX2/AVX-512/NEON/WASM, runtime on x86 via the cpufeatures crate (`platform.rs:72-84`: AVX512 > AVX2 > SSE4.1 > SSE2 > portable); NEON/wasm compile-time-assumed. **`rayon` feature** → `update_rayon`/`update_mmap_rayon` via tree-join (rayon-core dep) — the model example of SIMD-within-chunk + rayon-across-chunks. Default x86 backend is Samuel Neves' assembly compiled via cc (auto-falls-back to pure Rust with no C compiler); `prefer_intrinsics`/`pure` stay C-free. Not a password KDF.
- **xxhash-rust** 0.8.19 (108.4M): xxh3 SSE2 (default x86_64)/AVX2/AVX512/NEON/wasm — **all detection compile-time** ("encouraged… via -C target_cpu=native"); prefer one-shot over streaming; **BSL-1.0 license**, not MIT/Apache.
- **zune-jpeg** 0.5.15 (117.9M): "unsafe is only used for SIMD intrinsics, and can be turned off entirely both at compile time and at runtime"; main adoption path is the `image` crate's `jpeg` feature (zune-core + zune-jpeg + jpeg-encoder — and jpeg-encoder is built with `features=["simd"]`, so the encode side is SIMD too); intrinsics perform poorly in debug builds — set `opt-level=3` for the package in dev profiles.
- **rav1e** 0.8.1: speed from hand-written **NASM assembly** — x86_64 requires **NASM 2.14.02+** (enabled by default); `threading` is **default-on** via maybe-rayon (serial fallback shim; "optional" = feature-gated); `RAV1E_CPU_TARGET=rust` disables asm.
- **lewton** (Vorbis): `#![forbid(unsafe_code)]`, no SIMD, last release 2021 — effectively unmaintained; use **symphonia** 0.6.1 (2026-08-13, active, used by rodio). **Round-1 correction**: symphonia is not "pure scalar" in effect — its **default features include `opt-simd`**, which forwards to symphonia-core's opt-simd-sse/avx/neon, implemented as **rustfft's** SIMD features (rodio surfaces it as `simd = ["symphonia/opt-simd"]`). Symphonia's *own* source contains zero core::arch/target_feature (repo-wide grep) — its SIMD is rustfft's, on by default. Either way it remains the right lewton replacement.
- **jxl-oxide** 5.0.0 (tirr-c): the best non-zune image-codec SIMD exemplar — runtime-dispatched `#[target_feature(enable="avx2")]+[fma]` / NEON kernels in jxl-color (ycbcr) and jxl-modular (rct.rs picks via `is_x86_feature_detected!`/`is_aarch64_feature_detected!`).
- **C bindings pattern**: `-sys` crate vendors C source, compiles with `cc`, safe wrapper on top; SIMD stays in C with C-side dispatch. **zstd** 0.14.0 (402.1M): threading is C's own (`zstdmt` feature, `Encoder::multithread(n)`), **not rayon**; `no_asm` feature exists. **lz4_flex** 0.14.0 (143.6M): pure Rust, no unsafe by default (`safe-encode`/`safe-decode`), README benches show it matching or beating C lz4 through bindings (66KB JSON: 1615 vs 1469 MiB/s compress; 5973 vs 5313 MiB/s `unchecked_decode`) — the standard proof that careful autovectorized pure Rust can tie C SIMD for byte-oriented formats.
- **intel-mkl-src** (0.8.1, 2022, stale) and **ispc** 2.0.4 (unsafe FFI, external ISPC compiler + libclang required): both niche. **Corrected download figure (Round 1)**: ispc shows **452 recent downloads** on the crates.io 90-day window (≈150/month crate-wide; latest version ≈63/month) — the earlier "~85/month" matched no measurable window; the crate is nonetheless exactly as niche as claimed. The ecosystem chose in-language portable SIMD. *[The previous sentence attributed to Linebender a rejection of a proc-macro DSL as "too much like building a language" — **unverifiable**: the quote appears in no reachable primary source (not the 2026 survey, the Linebender v1.0 blog — which presents the new #[simd] proc-macro positively — the fearless_simd repo/docs, or HN), and it sits oddly against fearless_simd 1.0 shipping a proc-macro. Possibly garbled from the stale-cache Medium edit or the Linebender Zulip; do not use in the skill.]*

**Rayon pairing summary** (verified against every Cargo.toml in Round 1): built-in rayon — blake3 (`rayon` feature, rayon-core), rav1e (maybe-rayon behind **default-on** `threading`), faer (**default-on** rayon). C-internal threads — zstd (zstdmt), MKL/TBB (iomp/seq). No threading, caller parallelizes — rustfft/realfft, xxhash-rust, highway (features are only `[std]`), lz4_flex, zune-*, glam, wide/pulp (zero rayon references in any of them). Standard composition: `rayon::par_iter()` over independent items with each item's inner loop SIMD-accelerated.

### 2.5 SIMD instruction sets across architectures — what Rust exposes (all Rust-side facts verified 2026-09-28 by compile tests on rustc 1.98.1 stable / 1.100.0-nightly, toolchain sweep 1.72–1.98, `rustc --print cfg/--print target-features`, and rust-src greps)

- **x86_64 baseline**: `fxsr, sse, sse2` (verified). i686 targets default to SSE2; pre-SSE2 hardware → `i586-*` targets; SSE2 *required* for i686 since Rust 1.86/1.87.
- **AVX-512 (whole avx512* family incl. F/VL/BW/DQ/CD) fully stable since Rust 1.89.0 (Aug 2025)** — both `target_feature` attributes and intrinsics; verified by compiling `_mm512_add_epi32` under `#[target_feature(enable = "avx512f")]` on stable 1.98.1.
- **Still nightly** (gate → tracking issue): Intel AMX (`amx-tile`/`amx-int8`/… → x86_amx_intrinsics #126622); AVX10.1/AVX10.2 (#138843); SVE/SVE2 **intrinsics** (stdarch_aarch64_sve #145052 — even though the `sve`/`sve2` target_feature *attributes* are stable, verified clean on 1.72→1.98); Arm SME/SME2/sve2p1+ (aarch64_unstable_target_feature #150244; no SME intrinsics module exists at all); RISC-V V (#150257 — `core::arch::riscv64` contains **no RVV intrinsics module**, and `is_riscv_feature_detected!` is unstable #111192).
- **aarch64**: NEON mandatory and baseline; NEON intrinsics stable since 1.59; `is_aarch64_feature_detected!` stable since 1.60 (macOS via `sysctlbyname("hw.optional.arm.FEAT_*")`, Linux via `getauxval(HWCAP/HWCAP2)`). Other stable target features: `fp16`, `bf16`, `dotprod`, `i8mm`, `aes`, `crc`, `sha2`, `lse`… — **but feature-attribute stability ≠ intrinsics stability** (Round-1 caveat): the `i8mm` *attribute* is stable while `vmmlaq_s32` is still nightly (stdarch_neon_i8mm #117223); `vdotq_s32` (dotprod) only became stable in 1.98.0 and `vaddq_f16` (fp16) in 1.94.0.
- **wasm32**: `simd128` and `relaxed-simd` (intrinsics stable since 1.82) are both **stable but strictly opt-in** (`-C target-feature=+simd128`); **no runtime detection** — and wasm is the *documented exception* to the target_feature UB rule: the Rust reference says unsupported features cause a module-load validation failure, not UB. Engines universally support SIMD128 (Chrome/Edge 91, Firefox 89, Safari 16.4, Node 16.4). **relaxed-simd browser support corrected in Round 1 from primary sources**: Chrome 114 (caniuse + MDN BCD agree; V8 lists it in FOREACH_WASM_NON_FLAG_FEATURE — always on; chromestatus's own entry is stale); **Firefox 145** (Bugzilla 1930192, "ride the trains", fixed 2025-10-08; MDN BCD records 146 — a one-version discrepancy between primaries); **no stable Safari release supports it through Safari 27.0 (Sept 2026)** — Safari Technology Preview only since 2026-08-18 (BCD PR #30253). The earlier "Firefox 120+/Safari 18.4+" line was wrong.
- **portable_simd / core::simd**: nightly-only (#86656, needs-rfc, no date). `Simd<T, N>` for N = 1..=64 (aliases up to 512-bit); f16/f32/f64/i*/u* elements; masks with arch-specific layout. Vendor lowerings exist for x86/x86_64, aarch64/arm64ec, armv7-NEON, wasm32, powerpc(64), loongarch64, hexagon — **not RISC-V** (scalar fallback). API still moving: on nightly 1.100.0, `use std::simd::SimdFloat` fails (trait now `pub impl(self) trait`) while the prelude import works.
- **Apple AMX**: undocumented matrix coprocessor in A13…**M4** (8×64B X + 8×64B Y + 4KB Z ≈ 5KB state; M1 has a P-cluster unit + lower-throughput E-cluster unit). Not in core::arch or LLVM at all (no `amx` target feature for AArch64). Reachable via **Apple Accelerate** (vecLib BLAS `cblas_sgemm`; vDSP/BNNS routing inferred from reverse-engineering and power signatures, not Apple-documented) or third-party crates. **Corrected in Round 1**: no crate named `amx` exists — yvt/amx-rs was never published; the real crates are **`amx-sys`/`amx-rs` 0.0.3** (eugenehp/amx-rs, 2026-03-20; benchmarks on M4 Pro at ~92% of Accelerate sgemm). **M4 did NOT replace AMX with SME2** — it *added* SME2 alongside AMX (corsix/amx documents M4 Max; see §2.13 for the on-host verification), and its SME is a partial, streaming-mode-only SVE2/SME2 subset (M4 CPU cores have no regular SVE outside streaming mode).
- **AVX-512 downclocking is essentially over on current silicon**: Zen 5 has no fixed offsets (512-bit reg-reg FMA sustained ~5.7 GHz; the two fine-grained numbers — gradual IPC-driven backoff under sustained L1 loads, >100ms recovery — are corroborated only at headline level from the Chips and Cheese article and remain unverified in detail); Skylake-X stepped 4.65→4.0 GHz; later Intel server CPUs dropped fixed offsets. Intel client: 2021 Alder Lake silicon shipped AVX-512 firmware-disabled (usable only with E-cores off); it was **physically fused off in 2022 steppings** (the old one-liner compressed this). **AVX10: the 512-bit-mandatory revision is now primary-verified** (see the addendum below). Practical guidance: prefer 256-bit on Intel targets (gcc/clang default — not re-checked against gcc/clang docs in Round 1; rustc exposes `prefer-256-bit`, a *codegen* feature rustc says "cannot be used in cfg or #[target_feature]").
- **Runtime detection matrix**: `is_x86_feature_detected!` stable 1.27 (CPUID); `is_aarch64_feature_detected!` stable 1.60; **s390x stable 1.93; LoongArch stable 1.89** (both std_detect source-verified; LoongArch was missing from the original list); PowerPC/MIPS nightly (#111191/#111188); RISC-V nightly (#111192); wasm none. 32-bit Arm has `core::arch::arm` NEON intrinsics and an `is_arm_feature_detected!` that is **unstable** (#111190) — only aarch64 was covered originally. s390x (#130869) and powerpc/powerpc64 (#111145) also have *intrinsics* modules, both unstable.
- Compile-time `cfg(target_feature)` always available; `#[target_feature(enable)]` is UB to call on unsupported CPUs (wasm's load-time validation is the documented exception). **Corrected in Round 1**: safe fns may be marked `#[target_feature]` since Rust **1.86.0** (2025-04-03, PR #134090) — not 1.87; bracket-compile-tested (rejected on 1.78/1.85, accepted on 1.88/1.98.1). The separate 1.87.0 change — "Most std::arch intrinsics that are unsafe only due to requiring target features to be enabled are now callable in safe code that has those features enabled" (blog wording; RELEASES.md words it as intrinsics "which don't take pointer arguments") — is correct as quoted in §2.1.
- **Microarchitecture baseline levels** (added in Round 1): `-C target-cpu=x86-64-v2/v3/v4` are the practical "raise the whole baseline" knobs between plain x86_64 and per-feature enablement — the shippable middle ground for binaries with a known floor.

**Round-1 primary-source addendum (ISA questions closed with primary evidence, 2026-09-29):**
- **SVE2 is mandatory from Armv9.0-A; SME/SME2 are optional.** LLVM's own
  `AArch64Features.td` (fetched from llvm-project main): `HasV9_0aOps.DefaultExts`
  includes FeatureSVE **and** FeatureSVE2 (lines 1094–1097) — SVE2 is a default of
  armv9-a; FEAT_SME is grouped under "Armv9.2 Architecture Extensions" (line 408) and
  FEAT_SME2 under v9.3 (line 427), and **neither appears in the default set of any base
  architecture through v9.7a** (v9.2a defaults add only MEC; v9.3a add nothing).
  rustc mirrors this: `("sve2", Stable, &[\"sve\"])` while `sme`/`sme2`/`sme2p1` are
  unstable (target_features.rs:338–390); no built-in rustc aarch64 target enables
  sve/sme by default. (Arm's own ARM DDI 0602 was unreachable — developer.arm.com 403s —
  so LLVM+rustc are the primary sources, as the audit conceded.)
- **AVX10: Revision 3.0 (March 2025) is the revision that made 512-bit the only vector
  length.** The whitepaper PDF itself (356368-003US, created 2025-03-13) was downloaded
  and parsed: Rev 3.0 "Removed references to 256-bit maximum vector register size,
  enumeration of vector-length support, and 256-bit instructions supporting embedded
  rounding"; Rev 2.0 (Dec 2023) only removed the 32-bit mask-register limitation —
  secondary coverage attributing this to Rev 2.0 is wrong. Corroborated by Intel's
  compiler team on gcc-patches (2025-03-19): "all the platforms will support 512 bit
  vector width (previously, E-core is up to 256 bit…)"; GCC removed
  `-mavx10.x-256/512` accordingly.
- **Zen 4 AVX-512 double-pumping is measured fact, not inference**: uops.info shows
  VADDPS ymm at 0.50 CPI vs VADDPS zmm at 1.00 CPI on Zen 4 (same latency 3, 1 µop,
  same FP23 port; AMD's PPR 57647 documents the same numbers), while Zen 5 does zmm at
  0.50 — a 512-bit op is one retire-µop occupying its 256-bit pipe for two cycles.
- **rustc 1.98.1's x86_64 target-feature list also contains** `apxf` and newer AMX
  variants (`amx-fp8`, `amx-movrs`, `amx-avx512`) — all nightly-gated; the nightly list
  in this section predates them.

### 2.6 Auto-vectorization and automatic SIMD (all local checks run on rustc 1.98.1 / LLVM 22, Apple M3 Max; probe at /tmp/autosimd/lib.rs)

- rustc has no vectorizer of its own — LLVM's **loop-vectorize** and **slp-vectorizer** do the work. Vectorization happens at **opt-level 2 and 3 only** — measured: `fadd.4s` present at 2/3, zero vector instructions at 0/1. Cargo's release profile defaults to opt-level 3, so plain `cargo build --release` already tries.
- **Measured behavior on probe loops** (aarch64, opt-level 3):
  - `out[i]=a[i]+b[i]` via zip: vectorized (`fadd.4s` ×4, interleaved ×4, scalar epilogue).
  - The same via **raw indexing**: also vectorized — modern LLVM hoists bounds checks into an up-front length check. **The draft skill's "bounds checks always block vectorization" folklore is stale** for simple shapes (it still holds where the check can't be hoisted; make lengths provable regardless).
  - f32 dot product `s += a[i]*b[i]`: multiplies vectorized (`fmul.4s` ×5) but **adds stayed scalar — 21× `fadd sN`, zero `fmla.4s`**. LLVM will not reassociate floats, and Rust exposes no `-ffast-math`. The remark even reports "vectorized" for the mul part — **read the asm, not just the remark**.
  - Integer wrapping reduction: vectorized (`add.2d` + `addp.2d`).
  - Gather `a[idx[i]]`: not vectorized; on x86_64 with `+avx2` LLVM emitted **zero** `vgather` (restructure layout instead).
  - u8·u8 dot: vectorized with `udot.4s` because `dotprod` is in the aarch64-apple-darwin baseline (verify your own baseline with `rustc --print cfg`).
- **Rust 1.98 (2026-08-20) stabilized `algebraic_add()` etc.** (per the 2026 Shnatsel survey) — stable-Rust float reassociation opt-in now exists; plain `+=` still won't vectorize (consistent with the measurement above, run on 1.98.1).
- **Inspection toolchain**:
  - `-C remark=all -C debuginfo=1` prints e.g. `loop-vectorize (success): vectorized loop (vectorization width: 4, interleaved count: 4)`; `debuginfo=1` is required for locations, which often resolve into inlined core code. Filter per pass (`-C remark=loop-vectorize`, and the `-Rpass/-Rpass-missed/-Rpass-analysis` family) — `remark=all` drowns the signal in size-info/regalloc noise. **cargo-remark 0.1.2** (last published 2023-09-28) renders remarks as a filterable HTML site (`cargo remark build` / `cargo remark wrap -- <cmd>`; needs nightly for `-Zremark-dir`); installed and exercised in Round 1 (§2.12).
  - **cargo-show-asm 0.2.63** (`cargo asm --rust --intel --mca`): per-function asm, llvm-mca integration, works on stable — **installed and run end-to-end in Round 1**: `cargo asm --lib add3 --rust` interleaved ARM64 asm with Rust source, and `--mca` (with Homebrew's llvm-mca on PATH) printed the full mca report (IPC 0.99, Apple "CyUnit" resources). Gotchas when piping `cargo asm` output to standalone mca: the `--rust` interleave emits a raw source line without `//` (parse error) and truncated `.cfi_startproc` yields "Unfinished frame!" — strip cfi lines and interleave, or just use `--mca`. Full flag set: `--lib|--bin|--test`, `--release|--dev|--profile`, `--rust`, `--intel/--att`, `--llvm`, `--llvm-input`, `--mir`, `--wasm`, `--mca` + `-M/--mca-arg`, `--callers-of`, `--everything`, `--json`.
  - Two gotchas hit while hand-driving rustc: use `-C codegen-units=1` or one asm file captures only one CGU (**Round-1 caveat: not reproduced at the scales tested** — default CGUs emitted all fns of ≤6-fn, ≤3-module libs into one .s file; the claim stands untested rather than wrong); and at `-O3` a bare `rustc --emit=asm` of a lib silently omits plain `pub` fns regardless of panic-ness — the practical workaround (`#[no_mangle]` or reachability from a binary) is real, but the earlier "bodies can panic" cause was wrong (Round 1: a non-panicking lib also emitted 0 symbols).
  - **llvm-mca** (static throughput; does not model fetch/decode, branches, or caches) — **corrected in Round 1: it IS runnable on this host**, at `/opt/homebrew/opt/llvm/bin/llvm-mca` (Homebrew keg-only LLVM 22.1.2; verified running with `-mtriple=x86_64 -mcpu=haswell`); it is merely not on PATH, and neither Xcode's 10 llvm-* tools nor rustup's llvm-tools include it. **uiCA** (Intel basic-block simulation from uops.info data, generally more accurate on Intel) is genuinely absent from this host; cited from docs.
  - Stable alternatives worth teaching: `cargo-binutils` (`rust-objdump`), `--emit=llvm-ir` (spotting `<N x f32>` types in IR is often faster than reading asm), godbolt.org.
- **ISA control**: `-C target-cpu=native` targets the host (fine locally; unsafe for distributed binaries); `-C target-feature=+avx2,+fma` verified to switch codegen to **ymm** — but **corrected in Round 1: rustc does NOT emit `vfmadd`** for `out[i]=a[i]*b[i]+c[i]` under `+avx2,+fma`; it emits separate `vmulps`+`vaddps` (FP contraction is off; `f32::mul_add` is the only route to `vfmadd` — 4 vfmadd on ymm in the Round-1 test). `+avx512f,+avx512vl` → zmm verified. **There is no automatic FMA contraction — the single most common surprise for C arrivals**; pair with the "no -ffast-math" fact below. `#[target_feature(enable="avx2")]` makes the fn unsafe to call; gate with `is_x86_feature_detected!` (with the §2.5 nuance: since 1.86 a *safe* fn may carry `#[target_feature]` if callers are compiled with the features). Project-wide flags belong in `.cargo/config.toml` (`build.rustflags` / `target.'cfg(target_arch)'.rustflags`), not per-command invocations.
- **Dispatch crates**: `multiversion` 0.9.0 — **syntax corrected in Round 1 (compile-tested)**: `#[multiversion(targets("x86_64+avx+avx2"))]` and `#[multiversion(targets = "simd")]` compile; the positional-string form `#[multiversion("x86_64+avx+avx2")]` errors on 0.9.0 (it was the 0.7-era syntax). Per-call detection; no `self`/`Self`/impl-Trait returns. "Inlining hazards" refined: no such issue exists in the tracker (all 58 reviewed) — the real, surveyed cost is per-call dispatch overhead ("a little bit of overhead", ~a dozen instructions), so keep the multiversioned fn coarse-grained (loops, not leaf ops). `pulp` — detect once into an `Arch`, selected impl fully inlines (Linebender's praise is really of the detect-once/zero-sized-token pattern rather than pulp by name). `fearless_simd` generalizes with a one-time `Level` token (internals in §2.1).
- **PGO and BOLT**: PGO is stable and practical via **cargo-pgo** (`cargo pgo build` → run workload → `cargo pgo optimize`; needs matching llvm-profdata). **BOLT** works on Rust binaries but needs `-Wl,-q` at link plus standalone llvm-bolt tools; ~2–5% cycles on rustc/LLVM on top of LTO/PGO; Linux x86_64-centric. rustc itself ships PGO+BOLT-optimized.
- **portable_simd measured**: on nightly 1.100.0, an `f32x8` sum-of-squares via `reduce_sum()` compiles to `fmul.4s`+`fadd.4s` NEON reduction — exactly the float-reduction win auto-vectorization cannot give. But see §2.5: still nightly, API churning.
- **ISPC-style never caught on**: the `ispc` crate 2.0.4 (**corrected figure, Round 1**: 452 recent downloads on the 90-day window ≈ 150/month crate-wide, ≈63/month for the latest version — the earlier "~85/month" matched no measurable window; equally niche either way) requires the external ISPC compiler + libclang, binds via raw unsafe FFI; Rust's ownership already gives LLVM the aliasing proofs, and `#[target_feature]` + autovec + pulp-style dispatch cover ISPC's dispatch natively.
- **Round-1 additions to the autovec guidance** (each measured or sourced in the audit):
  - **slp-vectorizer** is the *other* pass — it vectorizes straight-line/reduction idioms outside loops; which pass fires determines which loop shapes to try (the section named it without explaining it).
  - **`core::hint::assert_unchecked` (stable 1.79) and `black_box`** are the stable tools for handing LLVM length/alignment proofs when bounds checks genuinely cannot be hoisted — the natural continuation of the bounds-check bullet, and exactly WormRabbit's "strategic `assert!` statements" fix from §2.2.
  - **Alignment and data layout can block vectorization** (packed/misaligned fields, Vec-vs-slice alignment) — omitted from the original loop-shape guidance.
  - **Vector widths follow 128-bit lanes on NEON**: width 4 for f32, 16 for u8, 2 for u64 — readers see the counts without the rule.
  - **Track vectorization in CI**: grep remarks/cargo-show-asm output to catch the §2.1 "vectorizes today, not next release" complexity-cap regressions — the cap warning lived in §2.1 but this section had no detection recipe.
  - **AVX/SSE transition penalties (vzeroupper)** apply when mixing 128/256-bit code across the boundary — niche but real once you mix baseline and +avx2 code paths.
  - Nightly drift note: portable_simd behavior was re-verified on **1.101.0-nightly (2026-09-27)** because rustup replaced 1.100.0 mid-audit; all gate tests (AMX/AVX10/SVE/SME) ran on 1.100.0 before the swap.
- **Condensed auto-SIMD workflow** (this becomes the sub-skill's spine): release build → inspect with cargo-show-asm → if not vectorized, `-C remark` for the reason and fix loop shape → widen ISA locally / runtime-dispatch for shipped → estimate with llvm-mca/uiCA, measure with criterion → PGO then BOLT for whole-binary wins (§2.12 has the tool-by-tool status).

### 2.7 CPU cache hierarchy and per-core task binding (Apple numbers measured on this M3 Max, macOS 27, 16 cores 12P+4E, rustc 1.98.1; Linux material sourced from man pages/kernel docs — no Linux host available)

**Measured hierarchy (M3 Max)** — `sysctl -a | grep -Ei 'perflevel|cachelinesize'`:
128-byte cache lines on both core types; P-cores: L1i 192 KiB / L1d 128 KiB each, L2 16 MiB shared per **6** P-cores; E-cores: L1i 128 KiB / L1d 64 KiB, L2 4 MiB shared by all 4 E-cores; no SMT (logical == physical); **no L3 exposed** (Apple's system-level cache is not in sysctl; the 48 MB M3-Max SLC figure is community-measured — RWT forum, 2024-02-19 — not Apple-documented). **Round-1 addition — the shard-count consequence: the 12 P-cores form TWO clusters of 6 (`cpusperl2=6`), so a 12-shard P-pool spans two private 16 MiB L2 domains** (32 MB total P L2); size shards per cluster, not per chip. Gotcha: the legacy `hw.l1dcachesize`/`hw.l2cachesize` keys mirror **E-core** values on this machine — use `hw.perflevelN.*`.

**x86 servers (sourced)**: lines are 64 B. AMD Zen 4 (Genoa): 32 KiB L1d/L1i + 1 MiB L2 per core, **32 MiB L3 per 8-core CCX** (cross-CCX = cross-die latency within a socket), SMT2 siblings share L1/L2. Intel Sapphire Rapids: 48 KiB L1d, 2 MiB L2, ≤112.5 MiB LLC. Granite Rapids (2024): 64 KiB L1i/48 KiB L1d, 2 MiB L2, 3 MiB L3/core, ≤128 P-cores. **Round-1 nuance: Intel SPR/GNR's L3 is a unified mesh LLC, not per-CCX like AMD** — the cross-CCX=cross-die guidance is AMD-specific; Intel's analogue is sub-NUMA clustering (SNC), controllable via the same lscpu/cache ids + numactl.

**Topology querying**: macOS `sysctl hw.perflevelN.*`; Linux `lscpu -C/-e` (valid columns via `lscpu -H`) and sysfs `/sys/devices/system/cpu/cpuX/cache/indexY/{level,type,size,coherency_line_size,shared_cpu_list}` plus `topology/thread_siblings_list`, `numactl --hardware`; `sched_getcpu()`/vDSO for cheap NUMA-local decisions in first-touch paths. Crates: `core_affinity` 0.8.3 (**its macOS `get_core_ids()` is just 0..n indices with no cluster/P-E awareness** — CoreId carries no topology meaning; hwloc or sysfs needed for cluster-aware ids), `hwloc2` 2.2.0 (stale since 2020; **CPU-binding only — no memory-binding functions at all**; the maintained binding is **hwlocality** 1.0.0-alpha.12, 2026-04-05, with `bind_memory`/`allocate_bound_memory`/`bind_memory_area` and `MemoryBindingPolicy::{FirstTouch, Bind}` — see §2.9), `raw-cpuid` 11.6.0 (CPUID leaf 4 cache params).

**Pinning mechanics**: `core_affinity::set_for_current(CoreId)` → `sched_setaffinity` (Linux/Android), `SetThreadAffinityMask` (Windows), `thread_policy_set(THREAD_AFFINITY_POLICY)` (macOS — passes an affinity *tag*; the SDK header itself calls it "experimental… a hint to the scheduler"). **Measured on Apple Silicon: every call returned `false`** (main thread, workers, rayon workers); THREAD_AFFINITY_POLICY returns **KERN_NOT_SUPPORTED (46)** — re-verified in Round 1 by direct C call on this M3 Max/macOS 27. *"Apple steers developers to QoS classes"* — **unverifiable as phrased** (the classic Q&A page qa2081 404s; no replacement doc found stating it in those words); the QoS *mechanism* is real and measured (§2.13: BACKGROUND reliably lands on E-cores at ~2.4× slower; `pthread_set_qos_class_self_np` works from Rust via `extern "C"` — the libc crate does not bind it). Treat Apple Silicon as "no user-space core pinning"; design shards around QoS tiers + per-cluster L2 (crates: `gdt-cpus` 0.2606.1, `qos-threads` 0.1.3 — §2.13).

**Rayon pool pinning** (verified compile + run on rayon 1.12.0/rayon-core 1.13.0): `ThreadPoolBuilder::new().num_threads(n).start_handler(move |idx| core_affinity::set_for_current(cores[idx]))` — handler receives the worker index; `spawn_handler` gives full thread control (**and is an `unsafe fn`** — the obligation that comes with it); there is a matching `stop_handler` for cleanup; `num_threads(0)` = logical CPUs. Pool built and computed correctly on macOS; the pin call itself was declined by the OS.

**NUMA**: Linux default is **first-touch** (`MPOL_LOCAL` — memory allocated on the node of the faulting CPU; policy affects only pages first *written* after it is set, and `MAP_SHARED` ignores it). **libc 0.2.189 has no `set_mempolicy`/`mbind` wrappers** — only `SYS_set_mempolicy`/`SYS_mbind` constants (and the `MPOL_*` constants do exist), so call raw syscalls or use hwlocality's memory binding. **Beware the crate named `numa` on crates.io (0.24.0, 2026-09-28) — it is a DNS resolver for .numa local domains, not libnuma bindings**; the real options are `numanji` 0.1.5 (2020), `numalloc` 0.1.3, `numa-shim` 0.2.0. CLI: `taskset -c 0-3`, `numactl --physcpubind/--cpunodebind/--interleave=all`. Pattern: the thread that will own data allocates/initializes it; interleave only for pure-bandwidth streaming (effective ~1 MB+); check `/sys/devices/system/node/node*/numastat`.

**False sharing — measured across four sessions** (4 threads × 20M atomic increments,
best-of-3, sums verified; original session, architect + verifier re-runs, and the
Round-1 audit's fresh from-scratch reproduction at /tmp/audit-fs with crossbeam-utils
0.8.23):
- 4 counters packed in one 128 B line: **8.0–8.5 ns/op** in Round 1; earlier sessions
  measured 36.7–37.1 and one 48.8 — the **absolute figures are not reproducible across
  sessions** (machine load/QoS placement/thermal state undetermined; the original
  benchmark source is not preserved). What IS stable in every session: the
  **catastrophe ratio, ~14–18× vs one-per-line** (Round 1: 16.6–17.5× across 18 runs).
- `#[repr(align(128))]` and `crossbeam_utils::CachePadded` (measured 128/128 on
  aarch64): **0.47–0.50 ns/op** in Round 1 (earlier sessions: 2.7).
- `#[repr(align(64))]`: **0.59–0.73 ns/op** in Round 1 — consistently ~20–25% *slower*
  than align(128) in every Round-1 run, **withdrawing the earlier "identical to 128 B"
  claim** (an earlier quartet of runs had shown 2.7 == 2.7). Best current statement:
  64 B separation removes ~98% of the penalty on this part; 128 B is measurably at
  least as good and is the portable default.
- Round-1 benchmarking caveats: an **unaligned packed array can straddle a line
  boundary and understate the penalty ~2–4×** (2.1–3.8 vs 8.0–8.5 ns/op before forcing
  alignment) — force `align(128)` on the packed probe; and on M3 (LSE atomics)
  **Relaxed ≈ SeqCst** for `fetch_add` (8.28 vs 8.45 ns/op) — ordering choice is not a
  lever here, contrary to common x86 guidance.

→ Practical rule for the skill: **never let two independently-written hot objects
share a cache line** (~14–18× measured penalty when they do — the ratio is the
teachable fact, not any absolute ns/op); pad to 128 B / `CachePadded` as the portable
default — crossbeam pads to 128 B on x86-64/aarch64/ppc64 because Intel's spatial
prefetcher pulls line pairs, 256 B on s390x — "just a reasonable guess and is not
guaranteed" — while noting 64 B removed ~98% of the penalty on the M3 Max. Kernel
guidance (docs.kernel.org/kernel-hacking/false-sharing.html): separate hot globals
into dedicated lines, group fields written together, per-cpu counters. **Detection on
Linux: `perf c2c record` / `perf c2c report`** (HITM analysis with per-offset
Source:Line breakdowns; Intel `cpu/mem-loads,ldlat=30/P` + `cpu/mem-stores/P`, AMD
`ibs_op//u` — not on Zen3 — Arm64 `arm_spe_0/ts_enable=1,…/`; `--double-cl` defeats
the adjacent-line prefetcher) with `pahole` for layouts.

**Prefetching** — **two Round-1 corrections**:
- `_mm_prefetch(p, _MM_HINT_T0/T1/T2/NTA/ET0)` is declared **safe** and stable since
  1.27, and the CPU may ignore it — but **calling it from ordinary safe code does not
  compile**: it carries `#[target_feature(enable="sse")]`, so a caller needs
  `unsafe {}` or its own `#[target_feature]` wrapper (E0133, compile-tested). "Safe"
  describes the declaration and memory semantics, not callability — a skill that
  presents it as callable-without-unsafe produces non-compiling examples.
- `core::intrinsics::prefetch` **no longer exists**: on nightly it is E0425 — it was
  split into `prefetch_read_data`/`prefetch_write_data`/`prefetch_read_instruction`
  (still nightly-only; the renamed fns emit real `prfm`). And the "no aarch64 prefetch
  intrinsic" gap is closing: `core::arch::aarch64::_prefetch::<RW, LOCALITY>` exists
  on nightly behind `stdarch_aarch64_prefetch` (#117217) — compiled and run here. On
  **stable**, PRFM still needs inline asm (`core::arch::asm!("prfm pldl1keep, [{}]")`).
- Guidance unchanged: most modern CPUs hardware-prefetch linear scans, so software
  prefetch earns its keep for *irregular but predictable* accesses (pointer chasing,
  hash-probe chains, indirection); too much prefetching causes evictions.

**Pinning vs work-stealing**: pinning avoids cache invalidation on migration (sched_setaffinity(2)); share-nothing per-core designs — Seastar ("single thread on each CPU… sharded memory… communication via explicit message passing"), glommio (`Placement::Fixed(0)` "will now never leave CPU 0"), monoio (thread-local state across `.await`, tasks needn't be Send; caveat: unbalanced workloads can underutilize cores vs Tokio) — suit steady per-item load with hot per-shard state and tail-latency SLOs. Work stealing (rayon, Cilk-origin) suits irregular task sizes and data-parallel maps. Hybrid: per-core `crossbeam-deque` Workers + a global Injector for spillover; `sharded-slab` for sharded concurrent storage. **2026 ecosystem status update in §2.9** — the *pattern* is thriving (Iggy, PulseBeam, TigerBeetle) while the glommio-lineage *runtimes* went release-stale (glommio dormant at DataDog and hard-forked 2026-03; monoio/tokio-uring unshipped for 2+ years); compio and Tokio LocalSet/LocalRuntime are the practical carriers now.

**Measuring caches**: Linux `perf stat -e cache-references,cache-misses`, `perf mem record/report` (per-symbol memory levels; Round-1 caveat: perf mem rides PEBS on Intel / SPE on AMD — needs `--data` sampling support, not available everywhere); macOS Instruments **CPU Counters** template (CPU Bottlenecks mode, WWDC25 session 308 — Round 1 recorded a 3 s CPU-Counters trace of `/usr/bin/yes` on this host via `xcrun xctrace record`, so it works on Apple Silicon; the old `instruments` CLI is gone) and **mperf** (root-only, 2 fixed + 8 configurable counters via kpep plists, no SIP changes needed; `darwin-kperf` is the Rust-binding route); anywhere: `valgrind --tool=cachegrind` (honest caveat: models "an AMD Athlon circa 2002", virtual addresses only).

**Blocking/tiling**: cache-aware tiling (Lam/Rothberg/Wolf 1991) keeps reused panels resident; cache-oblivious divide-and-conquer (Frigo et al.) avoids explicit cache-size parameters but empirical studies found hybrids (explicit tiling at the recursion base) work best. Rust shape: `if n > THRESHOLD { rayon::join(...) } else { blocked_tile_kernel() }`.

### 2.8 SpacetimeDB — how an extremely fast Rust system actually works

**Sources**: blog "Ok, but does it scale?" and "Benchmarking" (spacetimedb.com, fetched in full), docs v1.12.0, and direct inspection of a shallow clone of clockworklabs/SpacetimeDB@master (2026-09-28); code cites are file:line in that clone at /tmp/SpacetimeDB. TPS numbers are vendor-published, not independently reproduced.

**The thesis — contention math**: a ~3 µs single-core critical section admits ~300,000 TPS on a hot key; a ~1 ms distributed critical section admits ~1,000 TPS — "the single-threaded solution is 300x more scalable". With 1% contending transactions and 1 ms commits, any horizontally scalable cluster is capped at (1/1ms)/1% = 100,000 TPS regardless of core count. Cluster beats single-core only with zero contention AND >$3,600/month spend. Horizontal scalability is "primarily a property of the workload".

**Execution model**: each database is an actor on **one OS thread running a Tokio LocalSet** (`SingleThreadedExecutor`, crates/core/src/util/jobs.rs:17-30,282-362); all state behind **one `Arc<RwLock<CommittedState>>`** (datastore.rs:64). Early MVCC-based parallel execution was measured and **removed** — single-threaded "flat out outperformed", a lesson they estimate cost over $1m. Commit does **early lock release**: durability enqueue while the write lock is held, then **downgrade write→read** so subscription evaluation overlaps the next writer (datastore.rs:1030-1039, relational_db.rs:895-909).

**Threading & pinning**: `CoreReservations` partitions cores by thread class — **databases 1/8, tokio workers 4/8, rayon 1/8, IRQ 2, OS 2** (startup.rs:224-234) — with pinning only when ≥10 cores and the non-default `core-pinning` feature (startup.rs:331-341; enabled in neither core nor standalone Cargo.toml — so whether *their production builds* pin is unconfirmed). **Corrected in Round 1**: pinning is **non-macOS, not Linux-only** — `apply_compute_thread_hint` (util/thread_scheduling.rs:5-19) is `#[cfg(not(target_os = "macos"))]`, i.e. it pins on Linux, Windows and BSDs; only the tokio blocking-core CpuSet handling is Linux-specific. (An upstream doc comment says "less than 8" while the code checks ≥10 — the report follows the code.) Rayon runs as a pinned global pool with the Tokio handle entered; rayon threads "must never actually block". Databases round-robin onto cores with **live migration** for load balancing (`LoadBalanceOnDropGuard` steals from the busiest core).

**Storage**: custom in-memory paged store — **64 KiB pages** (PAGE_SIZE=65536) with 64-byte headers, fixed-length row section + variable-length granule section with **O(1) freelist** recycling; var-len objects >16 granules spill to a content-deduplicating blob store; B-tree (std BTreeMap-backed) and hash indexes; **jemalloc** global allocator with 512 KB-sampled profiling. Serialization is reduced to memcpys: a **StaticLayout** precomputed per row type makes BFLATN↔BSATN conversion 1–2 `copy_from_slice` calls skipping padding (static_layout.rs:1-27); BSATN is fixed-width, little-endian, **no field names**. Maps are hashbrown+ahash with **identity hashing for integer keys** (`nohash_hasher`); SmallVec everywhere.

**Durability & I/O**: write-behind **group commit** — commit enqueues to an async channel inside the critical section; a background actor drains with `recv_many`, writes the batch on `spawn_blocking`, issues **one `flush_and_sync` per batch**, publishes the durable offset on a `watch` channel (durability/src/imp/local.rs:269-311). Broadcast uses an **AdaptiveUnboundedReceiver** with 25 µs baseline linger doubling to 200 µs while work keeps arriving.

**What they DON'T use**: **no SIMD and no io_uring anywhere** (grep-verified; io_uring exists only as a TODO comment in an "Experiment" block with O_DIRECT|O_DSYNC). **The one SIMD decision in the codebase**: crates/commitlog/src/varint.rs:15,19 mentions the `varint-simd` crate as a possible future optimization and defers it — a useful datapoint that even at 300k TPS they don't consider SIMD the lever. Rayon only on the read path (subscription `par_iter` + websocket-message encoding via spawn_rayon) and wasmtime parallel compilation. Speed also comes from: separate **sync wasmtime engine** so main-lane reducers avoid fiber overhead (async engine reserved for genuinely suspending ops; **wasmtime pinned at 39, cranelift OptLevel::Speed**); pooling of 2 MiB fiber stacks (crossbeam ArrayQueue), 4 KiB BytesMut builders (1024/4 MiB cap), and **64 KiB pages (page_pool defaults: 128 pages = 8 MiB)**; `consume_fuel` + epoch interruption, wrapped in a **pluggable** `EnergyMonitor`/`FunctionBudget` abstraction (core/src/energy.rs — metering is not just two wasmtime flags). Release profile: opt-level 3, thin LTO, codegen-units 16, overflow-checks false.

**Round-1 additions to the architecture picture**:
- **A second execution engine**: an embedded **V8** host for JavaScript modules (crates/core/src/host/v8/, `v8 = "=145.0.0"`), a single main-lane worker thread per database owning one isolate plus a bounded pool of exclusive procedure instances, with inline isolate replacement after traps/heap retirement. Since the headline 303,920 TPS was set by the *TypeScript* client, part of the benchmark story runs through V8, not wasmtime.
- **Deterministic simulation testing**: the `dst` crate (crates/dst) is the testing side of "determinism as an architectural lever" — the tool that makes the determinism cheap; name it when recommending the discipline.
- **Snapshots**: crates/snapshot persists on-disk snapshots of committed state at a transaction offset, so restart replays only the commitlog suffix — directly relevant to the durability design and the tiered-storage roadmap.
- **Broadcast buffer sharing**: `BsatnRowListBuilderPool::try_put` reclaims a BytesMut only on the last client because encoded update buffers are refcount-shared across clients subscribing to the same query — a fanout technique to sit beside the AdaptiveUnboundedReceiver.
- A shipped guard against accidental O(n) scans: the default-on `unindexed_iter_by_col_range_warn` feature.

**Measured (vendor)**: on one i9-14900K (24 vCPU) — ~303,920 TPS (TypeScript client, contended α=1.5), ~265,541 TPS (Rust client), ~279,025 TPS uncontended; **p50 ~8.08 ms / p99 ~12.9 ms are the α=0 (uncontended) latencies** (at α=1.5 they are 7.39/11.7 ms — placing them after the contended numbers, as previously done, slightly misattributes them); vs Bun+Postgres 10,730 TPS and Node+Postgres 9,905 TPS on the same machine; CockroachDB 5-node 4,253 TPS (α=0), "did not complete" under contention. Giving competitors 40-deep pipelining raised their latency per Little's Law without raising throughput — their benchmark methodology validates against Little's Law and they honestly published an earlier SQLite benchmark bug (UPDATEs never executed; corrected to ~3.2k TPS). Discipline: criterion microbenches vs in-tree SQLite baseline, **iai-callgrind instruction-count benchmarks** (a clockworklabs fork) for low-variance regression detection, a **CI perf gate** (median-of-31 index-scan reducers must stay ≤100 µs), Tracy + Prometheus + jemalloc pprof.

**Replication/cloud** (proprietary, blog-described): pipelined distributed state machine replication reportedly matching unreplicated throughput (~300k TPS); planned read replicas get linearizable reads via leader-assigned log positions ("the leader's only cost is handing out sequence numbers"); IDC sharding and tiered storage slated 2026-10-31.

**Transferable techniques** (each becomes skill guidance): (1) one lock + microsecond critical section beats fine-grained MVCC under contention; lock downgrade at commit; (2) never hold the hot lock across I/O — write-behind group commit + watch-channel offsets; (3) partition cores by thread class and pin, above a core-count threshold; (4) keep async/fibers off the fast path; (5) precompute layouts, then memcpy; fixed-width name-free wire formats; (6) adaptive linger on worker queues; (7) pool hot-path allocations; arena-of-pages row store; (8) identity-hash integer keys + SmallVec; (9) determinism as an architectural lever (no I/O/clocks/randomness in handlers → retry and replication for free); (10) measure like they do (instruction counts, CI gates, Little's-law validation); (11) scale by explicit shard boundaries, not transparent distribution — colocate compute with data (eliminating the server→DB round trip turns a ~200 µs hop into ~100 ns in-process calls).

---

### 2.9 Thread-per-core and the async-runtime ecosystem — 2026 status (Round-1 research; all crates.io/GitHub/HN data fetched 2026-09-29)

**The headline: the pattern won, the flagship runtimes rotted.**

- **glommio is dormant at DataDog and hard-forked.** Latest crates.io release remains
  0.9.0 (2024-03-25, ~2.5 years stale). DataDog/glommio's last substantive commit is
  2025-04-21; maintainer issue #707 "Call for glommio maintaners" (2026-03-10) drew
  original author Glauber Costa's reply that the DataDog-controlled org makes official
  maintenance hard. A **hard fork at github.com/glommio/glommio** (created 2026-03-13,
  endorsed by glommer 2026-04-02) is genuinely active (commits through 2026-09-25;
  contributors incl. glommer/311, HippoBaro/226, matklad/37) but has **no crates.io
  release yet** — `glommio` on crates.io is still DataDog's 0.9.0.
- **monoio 0.2.4 (2024-08-20)** and **tokio-uring 0.5.0 (2024-05-27)**: no release in
  2+ years either. monoio's repo moved to monoio-rs/monoio and still receives commits
  (IORING_OP_SEND_ZC, 2026-04), but nothing ships. **compio 0.19.2 (2026-08-18)** is
  the only actively-shipping completion-based thread-per-core runtime.
- **Apache Iggy's evaluation (blog, 2026-02-27) crowned compio** over monoio ("lacked
  io_uring feature parity and slow development") and glommio ("essentially
  unmaintained"); migrating tokio→compio took P9999 latency **34 ms → 6.51 ms**
  (8 streams/20 GB), fsync throughput 843→992 MB/s (+18%) with P95 −45%. Root
  motivation: tokio's blocking-pool file I/O didn't scale. Design lesson they
  published: pure shared-nothing with RefCell failed (borrow-across-await); they
  settled on hybrid shared-control-plane/sharded-data-plane (left-right, flume,
  DashMap, mimalloc).
- **PulseBeam (2026-07-10)** moved a Rust WebRTC SFU to thread-per-core using **Tokio
  `LocalRuntime` per thread** — explicitly *not* glommio/monoio/compio, "to avoid
  spending time chasing bugs at the async runtime level": P99.99 70→10 ms, +25%
  capacity. This is the shape of the thesis in 2026: take the architecture, not the
  runtime brand.
- **The "TPC lost" camp is the analytical/query-engine world**: Justin Jaffray's "The
  death of thread per core" (2025-10-20; HN 155 pts) argues skew, CPU-bound
  bottlenecks, morsel-driven scheduling (Leis et al.; DuckDB/KuzuDB/Umbra/CedarDB in
  practice) and multitenant elasticity beat fixed partitioning. A July-2026
  tokio/smol/glommio benchmark (c410-f3r.github.io, Ryzen 9 5900X, k6) found **no
  consistent winner** — but noted an EPT-style setup made his WTX top the HttpArena
  WebSocket benchmark after default Tokio scored ~8× lower. Net verdict: TPC thrives
  in new latency-critical systems and lost in analytical engines; the 2020-era claim
  that work-stealing must lose is not a general law, but the *tail-latency* advantage
  of sharding+locality is repeatedly reproduced.
- **TigerBeetle — the contrasting sibling** (all primary blog posts fetched):
  single-threaded-per-replica event loop over a hand-written completion-only
  **io_uring/kqueue/IOCP** dispatcher ("It is also best for determinism… enables us to
  do Deterministic Simulation Testing"; the I/O code was adopted into Bun as
  io_linux.zig); **zero dynamic allocation** (all capacities at startup);
  128-byte-aligned records; **8191 queries per message** (leaving room for a 128-byte
  header — third-party write-ups saying 8192 are wrong); one message in flight per
  client; O_DIRECT + io_uring registered buffers (NIC→CPU→disk DMA, no page-cache
  copies); LMAX-style single-writer core — no locks/atomics in the hot path. Its I/O
  loop is single-threaded on purpose; parallelism comes from batching (across time)
  and VSR replication (across the cluster), never from data-parallel thread pools
  inside a replica.
- **Tooling corrections/updates for the sub-skills**: `hwloc2` is stale (2.2.0,
  2020-05-22) and **has no memory-binding functions**; the maintained binding is
  **hwlocality** 1.0.0-alpha.12 (2026-04-05) with full CPU+memory binding
  (`bind_memory`, `allocate_bound_memory`, `bind_memory_area`,
  `MemoryBindingPolicy::{FirstTouch, Bind, …}`). Transparent-hugepage relevance for
  tail-latency designs: `madvise` mode + explicit `MADV_HUGEPAGE` on pre-faulted
  per-core arenas reconciles TLB coverage with compaction stalls (the canonical
  cautionary case is Redis: "disable transparent huge pages" — fork+COW of huge pages
  causes big latency spikes).

### 2.10 Niche SIMD crates — text, parsing, serialization (Round-1 survey; crates.io/GitHub/Grepping of sources, 2026-09-29; no local benchmarks)

**The incumbent codec family — frozen but ubiquitous** (all in the Nugine/simd
monorepo, MIT, "relies heavily on unsafe code", algorithms credited to 0x80.pl/aqrit;
repo still maintained — commits 2026-08-30 — but **no crate release since
2022-12-28**): `base64-simd` 0.8.0 (155.7M total / 43.0M recent), `uuid-simd` 0.8.0
(42.7M / 17.3M — unmatched for UUID parse/format), `hex-simd` 0.8.0 (2.4M / 848K),
`simd-abstraction` 0.7.1 (the framework beneath them, 19.2M). Caveat: 2022 vintage —
check before betting on new ISAs. `unicode-simd`/`base32-simd` 0.0.1 are **yanked
placeholders** (no released Nugine unicode/base32 crate).

**The Sept-2026 codec wave** (freshest part of the niche):
- **faster-hex 1.0.0** (nervosnetwork, 2026-09-23; 60.8M DL) — SIMD + portable
  fallback, no_std, fuzzed (libFuzzer x86/ARM, AFL), a bench-compare harness against
  hex/const-hex/hex-simd/fashex/better-hex. **The most credible hex codec today;
  recommend over hex-simd.**
- **escape-simd 0.1.0 + json-escape-simd/html-escape-simd** (napi-rs org,
  2026-09-12; 39K DL in ~2 weeks) — shared SIMD string-escaping kernels ("JSON
  implementation is from sonic-rs; we only take the string escaping part"); CI bench:
  short-string JSON escaping 56.23 ns vs serde_json 111.65 vs v_htmlescape 151.98.
  Becoming the standard escape kernel — recommend.
- **encodify 1.0.0** (Stalwart Labs, 2026-09-28 — one day old at survey time) —
  Base64/Base32/QP/RFC 2047/UTF-7/PEM with NEON + runtime-detected SSSE3/AVX2 kernels;
  bench: base64 encode 25.7 GB/s vs base64-turbo 19.2 vs base64-simd 12.8. Watch/adopt
  for MIME-adjacent formats after it settles.
- **base64-turbo 0.5.0** (2026-09-19) — ">100 GiB/s" claims (81.6/106.5 on Zen 5),
  kernels checked by **Kani + MIRI + MSan + fuzzing**; single new author, tiny
  adoption — second choice until it matures. (better-hex 1.0.1: SSSE3/AVX2/AVX-512BW/
  NEON/WASM128 + constant-time decode, crypto niche. hex-turbo/fashex: experimental.)
- Educational/historical, not recommendations: vb64 (companion to mcyoung's
  "Designing a SIMD Algorithm from Scratch", HN 441 pts), bs64, inet-aton (a faithful
  Rust port of Lemire's SSE IPv4 parser, unmaintained since 2023).

**Hidden SIMD inside mainstream text crates** (grep-verified; quick-xml row corrected
in Round 2):
- **httparse 1.10.1 (746,176,801 DL per crates.io) ships a real SIMD module** —
  `src/simd/{avx2,sse42,neon,swar,runtime,mod}.rs`; SWAR is the default when
  `httparse_simd` is unset; `runtime.rs` dispatches via
  `is_x86_feature_detected!("avx2"/"sse4.2")`; build.rs honors
  `CARGO_CFG_HTTPARSE_DISABLE_SIMD` (the `httparse_disable_simd` cfg opt-out). Almost
  nobody knows this HTTP parser — three-quarters of a billion downloads — is
  SWAR/SIMD-accelerated. *(The "most-downloaded HTTP parser in Rust" superlative was
  not independently ranked by either audit round; the 746M figure is the verified
  part.)*
- **quick-xml 0.42.0** (436.8M): memchr accelerates **both the escape path and the
  readers' byte scanning** — src/escape.rs (entity `&`/`;` and CR/UTF-8-lead-byte
  scanning) *and* read paths: `src/reader/slice_reader.rs:273` `memchr2(b'<', b'&')`
  in `read_text` (+ :317 `memchr3`), `src/reader/mod.rs:1202,1228`
  `memchr_iter(b'>')` for Comment/CData scanning, `src/reader/state.rs:116`
  `memchr(b'-')`, `src/parser/element.rs:58` `memchr3_iter(b'>', '\'', '"')`. The
  parsing *logic* is a scalar pull-parser state machine — but the earlier
  "escaping only" characterization (Round 1, from a master-branch grep of escape.rs
  alone) was wrong, refuted in Round 2.
- **csv 1.4.0**: memchr on the **writer** path only (quote scanning); the reader is a
  DFA/NFA state machine with no SIMD. **simd-csv 0.14.0** (Sciences Po médialab,
  35.6K DL, fast adoption) is the niche pick — runtime detection, wasm simd128, and an
  unusually honest README: "sometimes ~8× faster, sometimes only as fast as scalar…
  one of the reasons why SIMD CSV parsers are not yet very prevalent". lazycsv 0.3.1
  ("vectorized, lazy-decoding, zero-copy", ~20% over rust-csv) is experimental.
- **bytecount 0.6.9** (143.1M) — SIMD newline/byte counting + UTF-8 code points; the
  invisible workhorse. **stringzilla 5.1.2** (C lib with a first-class Rust crate,
  103K DL) — SIMD search/sorting/hashing/UTF-8 segmentation, claims 10–70× over
  ICU4C/ICU4X; the strongest general-text recommendation. **simdnbt 0.10.0** — the
  pick for Minecraft NBT specifically (hand-written fast, no simd deps).

**Negative results that correct the skill's premises**:
- **simdzone is C, not Rust** (NLnetLabs, language: C per the GitHub API; no crates.io
  entry) — **no SIMD DNS zone parser exists in Rust**; simdzone-class throughput needs
  FFI or patience. No SIMD URL parser exists either (sorug 0.6.2 is SWAR+memchr, 1★,
  too immature); fluent-uri/url make no SIMD claims.
- **No SIMD HTML sanitizer exists in Rust**: ammonia 4.2.0 (html5ever, scalar) is the
  default answer; **lol-html is NOT SIMD** (no simd deps, no core::arch in its top-level
  sources — its speed is streaming design). SIMD in the HTML space lives in
  *escaping*: v_htmlescape 0.17.0 (13.3M) and the new html-escape-simd.
  fast-html-parser/fhp-simd 0.1.2 (2026-06-08, runtime SSE4.2/AVX2/NEON) is too early
  to recommend. simdxml 0.2.1 (XPath 1.0 over flat arrays, 2.6× pugixml on DBLP,
  single-digit stars) — experimental but genuine.
- **fast-float2 and lexical are not SIMD** (algorithmic scalar — say "Lemire fast
  float parsing", not SIMD); **atoi_simd 0.18.1 IS** the SIMD integer parser (SSE4.1/
  AVX2/NEON, 17.7M DL, needs target-feature flags or falls back). fastdate has no
  SIMD claims (table-driven scalar); no Rust SIMD date parser exists.

### 2.11 Niche SIMD crates — numeric, crypto, ML, media (Round-1 survey; six full source clones grepped; no benchmarks run)

**ML runtimes**: **rten-simd 0.26.0** (2026-08-29; MSRV 1.94, edition 2024;
"inspired by Google's Highway and the pulp crate") — runtime dispatch aarch64-NEON →
x86_64 AVX-512(f/vl/bw/dq+f16c) → AVX2(+fma,f16c) → wasm simd128 → generic, as a
`SimdOp { fn eval<I: Isa> }` trait with `#[target_feature]` inner fns — **manual
multiversioning on stable Rust; the recommended stable alternative to pulp for CPU
kernels**; notable detail: it re-checks AVX-512 on macOS via
`sysctlbyname("hw.optional.avx512vl/…")` because `is_x86_feature_detected!` can
false-negative there (cites golang/go#43089). rten itself is the go-to pure-Rust ONNX
CPU runtime. **candle** delegates CPU matmuls to the `gemm` crate (0.19.0,
wasm-simd128 enabled) — candle's CPU SIMD story *is* the pulp/gemm ecosystem.

**RustCrypto** (all production defaults; highest-recommendation tier of anything in
this report):
- **aes 0.9.3** (332M DL, 2026-08-28): backends AES-NI, aarch64 AESE, fixslice, and
  **runtime VAES-256/512** (`x86_vaes256.rs`/`x86_vaes512.rs`, cpufeatures tokens for
  avx512f+vaes) — a stock binary scales from AES-NI to AVX-512 VAES with zero build
  flags.
- **chacha20 0.10.2** (240M DL): hand-written soft/sse2/avx2/avx512/neon backends;
  **ppv-lite86 is gone** from the dep list; SSE2/AVX2 runtime-detected; AVX-512
  opt-in (`--cfg chacha20_backend="avx512"` + avx512f/vl, else `compile_error!`).
- **poly1305 0.9.1** (101M): runtime AVX2 via a `union` + ManuallyDrop dispatch.

**Data-frame engines**: **polars 0.55.2** — its `simd` feature chains to **nightly
`std::simd`** (polars-arrow bitmask.rs uses `std::simd::Mask`; repo pins
nightly-2026-09-01; the `nightly` feature implies `simd`): polars' explicit SIMD is
opt-in and nightly-only — default stable builds rely on autovectorization plus
external SIMD deps (atoi_simd, simd-json, simdutf8). **arrow-rs 60.0.0** is the
philosophical contrast: repo-wide, arch intrinsics appear in only two files (BMI2
PEXT/PDEP behind compile-time cfg in arrow-buffer) — trust autovec + bit ops.
**arrow2 is archived** (since 2024-02-27) — do not recommend; polars-arrow is the
descendant.

**Matrix/FFT**: **faer 0.24.4** — kernels are `pulp::WithSimd` closures launched via
`T::Arch::default().dispatch(...)` (verified across triangular_solve/qr/svd/
householder/cholesky); pulp 0.22.2 with x86-v3 default (x86-v4 only in faer's
`nightly` feature); GEMM supply now leans on **private-gemm-x86 0.1.20** (3.05M DL,
default-on x86_64 dep) beside gemm 0.19/nano-gemm 0.2.2 — faer's x86 GEMM is
increasingly a prebuilt private kernel; repo moved to **sarah-quinones/faer-rs**
(old sarah-ek paths 404). **rustfft** — see §2.4 (maintained at ejmahler/RustFFT).
**PhastFT 0.4.1**: fearless_simd-0.5-based, `unsafe`-free FFT for power-of-two sizes;
~2.8K DL/month, young but clean — the second real fearless_simd adoption after
memchr-n (§2.2).

**Media**: **jxl-oxide 5.0.0** — runtime-dispatched AVX2+FMA / NEON (§2.4). **rubato**
is where audio-resampling SIMD lives (runtime AVX→SSE3/NEON; its FFT resampler rides
rustfft). **symphonia**: zero explicit SIMD of its own (§2.4 correction re
opt-simd/rustfft). **rav1e**: x86 SIMD is NASM assembly, not Rust intrinsics.

**Vector search / quantized ANN — the hottest new entrant**: **turbovec 1.0.0**
(RyanCodrai/turbovec, **17,255★**, pushed 2026-09-13) — Rust vector index on
TurboQuant (arXiv 2504.19874) with **hand-written kernels: NEON SDOT/SMMLA on ARM,
AVX-512 VNNI + vpermb on x86, AVX2 and scalar fallbacks** (verified in src/
{encode,pack,rotation,search}.rs with is_x86_feature_detected! dispatch), claiming
3.4× over FAISS IndexPQFastScan at 4-bit. Young/single-maintainer — normal caution —
but the SIMD engineering is real and inspectable. Also: quickwit-oss/**bitpacking**
(Lemire simdcomp port, ">4 billions integers per second"; the tantivy/quickwit
primitive), hora-search (2.7K★, slower cadence), sassy (SIMD approximate string
matching, active research code), varint-simd (dormant since 2024-09).

**Geometry**: **geo has no SIMD anywhere** (robust/earcut/spade deps) — geometry
crates deliberately prefer exact/adaptive arithmetic over vectorization; a negative
result worth teaching. **thermite 0.3.0** (portable numeric/special-function kernels,
AVX-512 tier validated via Intel SDE, autodiff/double-double companions, MSRV 1.95) —
note the tension: the 2026 survey **excludes** thermite as AI-driven (§2.1); the
feature set is real, the trust question is open.

### 2.12 Superoptimization and codegen tooling — 2026 status (Round-1 research; local installs and runs on this host)

**Classic superoptimizers are dormant**:
- **Souper** (google/souper): last push 2024-08-28; last LLVM bump is PR #880
  "Bump to llvm 18" (2024-05-30) — and `build_deps.sh` pins a **patched LLVM 18.1.6
  fork** (regehr/llvm-project, disable-peepholes branch), so it does not build against
  LLVM 19+. Its own Rust/Cargo instructions PR #855 has been open since 2022. **The
  live Rust↔Souper path is Cranelift**: `cranelift-codegen`'s optional `souper-ir`
  dep with the `souper-harvest` feature dumps optimization candidates as Souper IR
  (souper-ir 2.1.0, 2020, ~2M DL).
- **STOKE** (StanfordPL/stoke): default branch last commit 2020-12-04, last release
  2.1 (2015); stoke.stanford.edu is dead (last Wayback snapshot 2022-08-27).
- **The active successor line is e-graphs**: **egg 0.11.0** (2025-12-04; repo pushed
  2026-07-19), **egglog** (pushed 2026-09-28), **Herbie 2.3** (2026-07-31; repo moved
  to herbie-fp/herbie) — plus 2025–26 equality-saturation work reaching production ML
  compilers (XLA pass; Foresight, CC 2026).

**llvm-mca / llvm-bolt on macOS (verified on this machine)**:
- llvm-mca: **only from Homebrew's keg-only llvm** (`/opt/homebrew/opt/llvm/bin/
  llvm-mca`, 22.1.2; runs, "Host CPU: apple-m3"). Xcode's toolchain ships 10 llvm-*
  tools *without* mca/bolt; rustup's llvm-tools has llvm-profdata but neither mca nor
  bolt.
- llvm-bolt: **no Homebrew formula, and BOLT is Linux-only by design** — llvm issue
  #72205 (open since 2023-11-14): "Right now LLVM BOLT supports only Linux platform…
  no plans to add Windows and macOS support". BOLT operates on x86-64/AArch64 ELF
  binaries linked with `--emit-relocs`/`-Wl,-q`, and the instrumented binary must
  *run* on Linux to produce .fdata. **Practical route from a Mac: Docker/Linux CI**
  (cargo-pgo's README: "For BOLT, it is highly recommended to use Docker"). rustc's
  own dist builds apply BOLT on Linux CI (bootstrap sets `RUSTC_BOLT_LINK_FLAGS=1`,
  compile.rs:1140-1142).
- **cargo-show-asm 0.2.63 and cargo-remark 0.1.2 were installed and exercised here**
  (see §2.6 for the run transcripts and the pipe-to-mca gotchas).

**The PGO/BOLT canon (flags re-verified 2026-09-29)**: Kobzol's 2023-07-28 article
remains the practical walkthrough — `-Cprofile-generate` → workload → `llvm-profdata
merge` → `-Cprofile-use`; `LLVM_PROFILE_FILE=./target/pgo-profiles/%m_%p.profraw`;
BOLT: `RUSTFLAGS="-C link-args=-Wl,-q"`, `llvm-bolt -instrument`, `merge-fdata`,
`llvm-bolt -data merged.profdata`; cargo-pgo subcommands `bolt build --with-pgo` for
the combined loop. Caveats that still hold: Debian/Ubuntu BOLT packages "broken
currently"; don't double-instrument; in config.toml put rustflags under
`[target.<…>]`, not `[build]`, or cargo-pgo's flags get overridden (cargo-pgo #49).

### 2.13 Apple Silicon deep dive — AMX, SME, QoS, Accelerate (Round-1 research; local runs on this M3 Max)

**AMX verified from plain userspace on this host**: the full corsix/amx test suite
(23 instruction classes × 40 parameter values — LDX/LDY/LDZ, STX/STY/STZ, EXTR,
MAC16, FMA/FMS 16/32/64, VECINT/VECFP, MATINT/MATFP, GENLUT) was built with clang and
**passed completely (exit=0) with no kernel opt-in call** — AMX executes from
ordinary unprivileged userspace on macOS 27 / M3 Max. (The GFLOPS `make perf` bench
built but did not finish within the session window — no local AMX perf number.)

**AMX generations — and the M4 correction**: corsix's README and issue tracker
document AMX on M1 (2021) through **M4 Max (2024)** — M2 adds bf16 (#5), M3 adds
ldx/ldy/matint modes (#10), M4 relaxes some extrh/vecfp offset bits (#13). **AMX was
NOT dropped in favor of SME** (correcting §2.5's old line): eugenehp/amx-rs
benchmarks AMX on an M4 Pro VM at **1500 GFLOPS = 92% of Accelerate's 1630** for
1024³ sgemm. Apple's patents + the tzakharko M4-SME analysis (same outer-product
grid) strongly suggest the SME block is the AMX block re-exposed through the
architectural interface. No `amx` target feature exists in LLVM/rustc — access is
hand-encoded `.inst`/inline asm (crates: `amx-sys`/`amx-rs` 0.0.3, 2026-03-20).

**SME on M4** (tzakharko/m4-sme-exploration, on real M4 iPad hardware; HN 41501494):
one SME coprocessor **per CPU cluster** (all cores contend; a single core can
saturate it; data moves via shared L2); supports FEAT_SME/SME2 with f16/bf16/f32/f64
and i8/i16/i32 outer products (SME_F32F32…FEAT_SME_I16I64); **M4 CPU cores have no
regular SVE — SVE exists only in streaming (SSVE) mode** via smstart/smstop. The
University of Jena team upstreamed SME codegen into LIBXSMM JIT (1755 GFLOPS on
512×512 FP32 GEMM, M4). This M3 Max reports `FEAT_SME: 0` (sysctl) — SME code was
compile-verified only here.

**Rust's SME reach, measured on this host**: nightly 1.101.0 (LLVM 23.1.1) lists
sme/sme2/sme2p1/sme-f64f64/… as target features; `-C target-feature=+sme` compiles
with only a warning today (hard error coming per rust#162235);
`core::arch::asm!("smstart sm")` compiles on nightly; `#[target_feature(enable=
"sme2")]` needs `#![feature(aarch64_unstable_target_feature)]` (#150244); **no SME
intrinsics exist in core::arch**, and the official 2026 goal (rust-lang/goals#270)
lands SVE intrinsics with SME only at "design exploration".

**QoS from Rust — the only P/E steering lever (measured)**: `thread_policy_set(
THREAD_AFFINITY_POLICY)` returns **46 = KERN_NOT_SUPPORTED** (direct C call, this
host); `pthread_set_qos_class_self_np` works from Rust via `extern "C"` — fixed
integer work: USER_INTERACTIVE ~31 ms, BACKGROUND **72–83 ms (~2.4× slower, E-core)**;
raising BACKGROUND→USER_INTERACTIVE succeeds (rc=0). **The rust `libc` crate does not
bind `pthread_set_qos_class_self_np`** (grep of the apple module — only latency/
throughput QoS policy structs). No `qos-class` crate exists; the maintained options:
**gdt-cpus 0.2606.1** (81K DL; reads `hw.perflevel{N}.physicalcpu`, hybrid P/E aware,
affinity-with-graceful-skip), **qos-threads 0.1.3** (2026-08; RAII `with_qos`),
eco-mode 0.0.1; `darwin-kperf` (91K DL) is the PMU-counter route.

**Accelerate from Rust**: **`apple-accelerate` 0.4.0** (repo doom-fish/accelerate-rs,
updated 2026-09-24) — the most complete maintained binding: vDSP radix-2 FFT, biquad,
vector math, Hamming/Blackman; BLAS sdot/sgemv/sgemm; LAPACK LU/solves; BNNS
ReLU/sigmoid (+BnnsGraphCompileOptions, macOS 15+); Sparse; vImage `ImageBuffer`
(rotate/box-convolve/scale/alpha-blend); `raw-ffi` feature exposes ~1,580 bindgen
functions. The drop-in BLAS/LAPACK path is **blas-src 0.14.0 / lapack-src 0.13.0
`accelerate` features** (accelerate-src just links the framework; 1.06M DL). The
common *indirect* route is whisper.cpp's `-DGGML_ACCELERATE` on macOS via whisper-rs.
(objc2-accelerate does not exist — Accelerate is pure C.)

---

## 3. Recommended-crates table by category (merged from §2.3–2.4 and the Round-1 niche surveys §2.10–§2.11)

**Default rule**: prefer runtime-dispatched, stable-Rust crates. Compile-time-only
crates (sonic-rs, xxhash-rust, glam, wide) require build-flag control; sonic-rs
silently falls back to its slow path without -C target-cpu=native, and a native-built
binary of any crate must never be shipped to other machines (zlib-rs kernels are
runtime-dispatched per source inspection; its README native-build advice is optional
extra codegen, not a SIMD requirement). Vendor perf numbers are vendor numbers — A/B
with criterion on your own payloads before migrating.

| Category | First choice | Alternative | Notes / gotchas |
|---|---|---|---|
| **JSON parse+serialize** | `serde_json` (compat baseline) → **`simd-json`** for max parse throughput (runtime dispatch, stable; MSRV 1.88) | **`sonic-rs`** when the serde-shaped API must survive (~2.8× over serde_json vendor-bench) — but compile-time SIMD: without `-C target-cpu=native` it silently runs the scalar fallback, and native builds are bound to the build machine's CPU; its `lazyvalue` API avoids DOM-building for partial access; **`sonic-number`** (Round 4: sonic-rs's SIMD float-number parsing published standalone, 2.7M recent, updated 2026-09-11) | simd-json: `&mut` input, own Value types, `prelude::*` import needed (see migration guide); sonic-rs: near drop-in, unsafe `*_unchecked` skips UTF-8 validation; jiter is fast and *does* carry baseline SSE2/NEON SIMD — but width-capped, so it is not the AVX2 pick |
| **Byte search (single/sub-pattern)** | **`memchr`** (or free via `bstr`; `PackedPair` for candidate/rare-byte pairs) | `regex` with literal-bearing patterns | SIMD arrives automatically inside regex/aho-corasick; put literals in patterns to activate prefilters |
| **Multi-pattern search** | **`aho-corasick`** (Teddy auto-applied) | — | Teddy on x86_64 (SSSE3/AVX2 runtime) + aarch64 NEON, little-endian only; ≲100 patterns; **silently unavailable on no_std x86_64 unless the build enables the target features** |
| **UTF-8 validation** | **`simdutf8`** (`basic::from_utf8`) | std `str::from_utf8`; **`smoothutf8`** (2026-06: mechanically verified against Unicode §3.9 Table 3-7, no_std zero-dep; 2–5× faster than both simdutf8 and std on ≤32-byte ASCII — the protobuf-field regime; `SlackBuf`/`verify_with_slack` zero-copy API); **`simd_cesu8`** (32.4M recent DLs; CESU-8/Modified UTF-8 — the standard JNI string path via jni 0.22.4/android-activity) | Drop-in; avoid `opt-level="z"`; `public_imp` exposes raw kernels. Round 4: `simdutf` (Nugine) binds the C++ simdutf library for validation/transcoding at "billions of chars/s" |
| **Crypto hashing** | **`blake3`** (+`rayon` feature for multicore) | **`blake2b_simd`/`blake2s_simd`** (Round 4: 100% stable Rust, dynamic SIMD, 58.2M/1.9M DLs, updated 2026-08; the halo2/Zcash substrate — reverse deps: halo2_proofs, rustcrypto-ff, rust-argon2, pasta_curves, jwt-simple) | Runtime dispatch on x86; `prefer_intrinsics`/`pure` for C-free builds; not a password KDF |
| **Non-crypto hashing** | **`xxhash-rust`** (xxh3) | `highway` (keyed, runtime, incl. NEON) | xxhash is compile-time SIMD + **BSL-1.0**; prefer one-shot over streaming; rapidhash is NOT SIMD; **ahash** (runtime AES detection, >100M DL) for hashmaps |
| **Checksums** | **`crc32fast`** (IEEE), **`crc32c`** (Castagnoli) | **`crc-fast`** (Round 4: 24M recent DLs, generic SIMD CRC for **all** Rocksoft-model CRC-16/32/64 variants incl. non-reflected — "unique in any language" per README; >100 GiB/s, up to >220× the `crc` crate, aarch64/x86_64/x86 + table fallback; deps: aws-smithy-checksums, minio, object_store, uucore); **`crc64fast`/`crc64fast-nvme`** (187K/1.16M recent) | PCLMULQDQ/VPCLMULQDQ + aarch64 CRC32 both runtime; crc32c's aarch64 path is documented + auto-enabled on rustc ≥1.80 (old "undocumented" note stale). Round 4: **`simd-adler32` is the biggest crate the table lacked** — 413M total/148.5M recent, runtime AVX512/AVX2/SSSE3/SSE2+NEON+wasm (vendor 33.3 GiB/s), and it is **inside the png/DEFLATE stack** (fdeflate, miniz_oxide, zune-inflate, zopfli, zarrs) |
| **Symmetric crypto** | **RustCrypto `aes` / `chacha20` / `poly1305`** (rustls/age defaults) | — | aes 0.9.3 runtime-dispatches AES-NI→VAES-256→VAES-512; chacha20 AVX-512 is opt-in via `--cfg`; production defaults, highest-confidence tier |
| **Compression** | **`flate2` with `zlib-rs` feature** (opt-in — flate2's *default* backend is miniz_oxide; zlib-rs SIMD is runtime-dispatched, incl. LoongArch LSX + wasm) | `lz4_flex` (pure Rust, safe-by-default, ties C lz4); `zstd` bindings (C-side threading via `Encoder::multithread`) | `-Ctarget-cpu=native` builds of anything are non-distributable; zstd's SIMD lives in the C library with C-side dispatch |
| **Base64 / hex / UUID codecs** | **`base64-simd` / `uuid-simd`** (Nugine; 155.7M / 42.7M DL — ubiquitous default, frozen at 0.8.0/2022 with repo maintenance continuing) and **`faster-hex` 1.0** for hex (recommend over hex-simd) | `escape-simd`/`json-escape-simd`/`html-escape-simd` (napi-rs, 2026-09, ~2× serde_json escaping); `encodify` 1.0 (Stalwart, MIME-adjacent, brand-new); `base64-turbo` (Kani+MIRI-verified, young) | Nugine caveat: no crate release since 2022-12-28 — fine for SSE2/AVX2/NEON, check before betting on newer ISAs |
| **Integer parsing** | **`atoi_simd`** 0.18.1 (SSE4.1/AVX2/NEON, runtime) | scalar `atoi`/`btoi` | Needs target-feature flags or falls back to scalar-but-faster |
| **Float parsing** | **std `FromStr`** (it adopted the fast-float algorithm) | `fast-float2` only for no_std/byte-slice/partial-parse — **algorithmic (Lemire), not SIMD; don't sell it as SIMD** | fast-float unmaintained; fork in maintenance mode; lexical likewise non-SIMD |
| **HTTP parsing** | **`httparse`** (746M DL — already SIMD/SWAR by default) | — | Hidden `src/simd/` module (avx2/sse42/neon/swar); `httparse_disable_simd` cfg opt-out |
| **General text / unicode** | **`stringzilla`** 5.1.2 (search/sort/hash/UTF-8 segmentation; C lib, Rust crate) | `bytecount` (newline/codepoint counting, 143M DL) | stringzilla claims 10–70× over ICU4C/ICU4X (vendor) |
| **CSV** | `csv` (writer is SIMD via memchr; reader is a scalar DFA) | **`simd-csv`** 0.14 (runtime dispatch; author's own caveat: gains are data-dependent, "sometimes ~8×, sometimes scalar-speed") | No mainstream SIMD CSV story yet — benchmark on your own data |
| **XML / HTML** | `quick-xml` (memchr-accelerated read-path byte scanning **and** escaping; parsing logic is a scalar state machine) | `simdxml` 0.2 (XPath 1.0 over flat arrays, 2.6× pugixml vendor-bench — experimental) | **No SIMD HTML sanitizer exists** (ammonia is scalar-by-design); lol-html is *not* SIMD; escaping is where HTML SIMD lives (v_htmlescape, html-escape-simd) |
| **DNS zone parsing** | — (none in Rust) | FFI to C `simdzone` if simdzone-class throughput is required | simdzone is C (NLnetLabs); no Rust SIMD zone parser exists as of 2026-09 |
| **FFT** | **`rustfft`** / `realfft` — always via `FftPlanner` | **`PhastFT`** 0.4.1 (fearless_simd-based, unsafe-free, power-of-two sizes) | Bypassing the planner disables all SIMD; no threading (parallelize across FFTs); rustfft maintained at ejmahler/RustFFT |
| **Linear algebra / BLAS** | **`faer`** (pulp dispatch + private-gemm-x86 kernels) | `apple-accelerate` 0.4 / blas-src+lapack-src `accelerate` on macOS (routes to AMX); `gemm` (candle's engine); **`matrixmultiply`** (Round 4: 146M total/31.2M recent — "detects and uses SIMD features on x86/x86-64 and AArch64 **transparently**", microkernel strategy, optional threading; **the default pure-Rust GEMM under ndarray 0.17/nalgebra 0.35/burn-ndarray** — if you use ndarray you already have it); **`simba`** (14.8M recent; the SIMD-algebra substrate beneath nalgebra/faer/parry/rapier); `oxiblas-core` (249K recent, pure-Rust BLAS/LAPACK with custom core::arch AVX2/FMA/AVX512F/NEON) | faer rayon default-on; repo now sarah-quinones/faer-rs (Round 4 authorship correction: sarah-quinones, **not** caelunshun) |
| **ML inference (CPU)** | **`rten`** (ONNX runtime; rten-simd = stable multiversioning, Highway/pulp-inspired) | `candle` (CPU = gemm crate) | rten-simd double-checks AVX-512 on macOS via sysctl (detection false-negative workaround) |
| **Game/graphics math** | **`glam`** | `vek` (stable = autovectorized repr(C); real SIMD only nightly + opt-in features — treat as convenience math) | glam compile-time features; `fast-math` feature is a deprecated no-op; `core-simd` feature is nightly |
| **Image codecs** | **`zune-jpeg`** (via `image`; jpeg-encoder is SIMD too) | **`jxl-oxide`** 5.0 (runtime AVX2+FMA/NEON — the best non-zune exemplar); **`fast_image_resize`** (Round 4: 4.5M recent, per-pixel-format SSE4.1/AVX2/NEON/wasm32 — its README flags a **Rust 1.95/1.96 LLVM wasm32-SIMD128 regression, rust#157456**, a live toolchain gotcha); `rust_h265` (288K recent, pure-Rust HEVC Main/Main10, 2026) | zune-jpeg: SIMD unsafe can be disabled at compile+runtime; set opt-level 3 in dev profile |
| **AV1 encode** | **`rav1e`** (bring NASM ≥2.14.02) | — | x86 SIMD is NASM asm, not Rust intrinsics; `threading` default-on via maybe-rayon |
| **Audio decode** | **`symphonia`** | — | lewton unmaintained/no SIMD; symphonia's own source has zero intrinsics but its default `opt-simd` feature rides **rustfft's** SIMD |
| **Vector search / ANN** | **`turbovec`** 1.0 (17.3k★; AVX-512 VNNI/VBMI + NEON SDOT/SMMLA kernels, 3.4× FAISS claim) — young, single-maintainer | `hora-search` (slower cadence); **`argminmax`** (Round 4: 2.8M recent, argmin+argmax in one pass, SSE/AVX/AVX512/NEON runtime, "SIMD implementation contains no if checks" — data-order-independent; f16/uints via bijective bitwise ordering; **shipped by Polars** via polars-utils/polars-ops) | Inspect kernels before adopting; the SIMD engineering is real and verifiable in-source |
| **Fuzzy / approximate string search** | **`frizbee`** (Round 4: Saghen; SIMD Smith-Waterman with affine gaps — ~4× nucleo, ~5× fzf, **20× on unicode**; multithreaded, multi-pattern query syntax; used by blink.cmp, **atuin**, television, skim; fork neo_frizbee adds 183K recent) | `sassy` (SIMD approximate matching, active research code) | FZF-class fuzzy finders are now a SIMD problem; frizbee is the production pick (911K recent DLs) |
| **Content-defined chunking (dedup)** | **`gearhash`** (Round 4: 1.16M recent; GEAR rolling hash for FastCDC, SSE4.2+AVX2 x86_64 and NEON aarch64 "used automatically", cargo-fuzz coverage) | scalar CDC implementations | Deps: xet-data, leyline-cdc — the CDC/dedup niche's SIMD primitive |
| **Explicit portable vectors (stable)** | **`pulp`** (runtime dispatch, faer-proven) or **`fearless_simd`** 1.0 (all-in-one, MSRV 1.89, COI caveat) | `rten-simd` (kernel authors wanting plain stable multiversioning), `wide` (build-time flags), `macerator` (generics, unproven), **`archmage`** (Round 4: imazen 0.9.29, 211K recent — "write SIMD in Rust without `unsafe`": CPU-tier tokens proven once with `summon()`, `incant!` dispatch, `#![forbid(unsafe_code)]`-compatible, x86-64/AArch64/WASM, MSRV 1.89; adopted by **rav1d-safe**; **tension**: the 2026 survey excludes its `magetypes` sibling as AI-driven — feature set real, trust question open); `cfavml` (4★, no_std/no-alloc minimal vector-op library) | Avoid simdeez (AI-driven, buggy per 2026 survey — and the survey also excludes magetypes/thermite); wide is fundamentally incompatible with multiversioning and leaves trig precision unspecified. Round 4 adoption evidence: fearless_simd direct in mullvadvpn-app/vello_cpu/blitz/ntsc-rs/hayro; wide direct in kornia-rs and Anki's fsrs-rs; pulp in elodin and adobe/trustmark |
| **Explicit vectors (nightly OK)** | `core::simd` | — | All LLVM targets except RISC-V lowering; API still churning; **Chromium runs it in production on nightly** (HN datapoint) |
| **Multiversioning** | `multiversion` 0.9 crate — syntax `#[multiversion(targets("x86_64+avx2"))]` | pulp/fearless_simd built-in dispatch | Rule of thumb: `#[multiversion]` on fns with loops; `#[inline(always)]` on tiny fns with multiversion up the chain; cargo-multivers only for long-running programs |
| **Parallelism (data-parallel)** | `rayon` (+ built-in in blake3/faer/rav1e) | — | Standard composition: par_iter across items, SIMD within each item |
| **Parallelism (thread-per-core services)** | **`compio`** 0.19 (only actively-shipping TPC runtime; Iggy's pick) or Tokio `LocalSet`/`LocalRuntime` per thread (PulseBeam's pick) | glommio hard-fork (github.com/glommio/glommio, active, **no crates.io release yet** — crates.io glommio is still DataDog's 0.9.0/2024); monoio/tokio-uring (2+ years unshipped) | See §2.9: the pattern thrives, the glommio-lineage runtimes went release-stale; morsel-driven (DuckDB-style) won in analytical engines |
| **Affinity/topology** | `core_affinity` (Linux/Windows) | **`hwlocality`** (maintained; CPU **and memory** binding), `raw-cpuid` (x86 cache params) | **hwloc2 is stale (2020) and has no memory-binding functions**; macOS Apple Silicon: pinning refused (KERN_NOT_SUPPORTED=46) → QoS (`gdt-cpus`, `qos-threads`); beware the `numa` crate (a DNS resolver, not libnuma) |

**Do-not-recommend / premise-corrections list** (so the skill never files these under
SIMD): simdzone (C), fast-float2/lexical/fastdate (algorithmic scalar), ammonia/
lol-html (scalar), rapidhash (explicitly non-vectorized), `faster` (abandoned 2021),
simdeez + magetypes + thermite (survey-excluded as AI-driven), varint-simd (dormant),
arrow2 (archived), vek-as-SIMD-toolkit (stable vek is autovectorized repr(C)),
intel-mkl-src (2022-stale) and ispc (niche FFI with external toolchain).
**Round-4 additions**: `packed_simd_2` (frozen nightly-only, last release
2022-06-01 — and the crate name `packed_simd2` **no longer exists** on
crates.io/docs.rs, so every blog citing it points at nothing); the
`aprender-*` family (14 crates all self-published the same day, 2026-04-07 —
treat as unvetted); and a verdict flip for **`safe_arch`** — *alive*
(updated 2026-08-14, 75.5M total DLs) and deliberately compile-time-only per
its own README ("an 'unopinionated' middle layer crate"): fine as `wide`'s
substrate, wrong for application code. Discovery warning: awesome-rust and
awesome-simd list **zero** of the modern SIMD crates (awesome-simd's only
Rust entry is the dead `faster`) — the live discovery channel is
`gh api "search/repositories?q=topic:simd+language:rust&sort=updated"`.

**Round-4 negative result — SIMD integer *formatting* does not exist in
Rust** (no crate formats integers with SIMD), and the technique to port is
Lemire/Gareau 2026: AVX-512 IFMA `_mm512_madd52lo/hi_epu64` with per-lane
decimal reciprocals — **two instructions produce eight digits**, masked
stores handle variable length, 1.4–2× over the best competitors
(https://lemire.me/blog/2026/05/18/simd-accelerated-integer-to-string-conversion/;
reference C++ at github.com/fastfloat/int_serialization_benchmark).

---

## 4. Proposed skill architecture (re-decided 2026-09-29 against the Round-1-updated report)

### 4.1 Decision: KEEP one main skill + four sub-skills — same names, heavier references

Round 1 grew the evidence base by roughly 40% (five new research areas: thread-per-core
ecosystem, two niche-crate surveys, superoptimizer tooling, Apple Silicon deep dive —
plus the completed community record). The re-evaluation asked whether the five-skill
split still holds. **It does, on trigger topology**: every new finding maps cleanly
onto exactly one existing coverage area, and the five trigger families remain disjoint.
The genuine candidates for a sixth skill were considered and rejected:

- **A standalone superoptimizer/codegen-tooling skill** (Souper/STOKE/egg/llvm-mca/
  uiCA/PGO/BOLT, §2.12) — rejected because its trigger phrases ("superoptimize this",
  "make this faster", "squeeze the last 5%") are exactly the main skill's triggers; a
  separate skill would race with the router on every generic speed-up request. Its
  content becomes a **second reference file inside `rust-superopt`**
  (`references/codegen-tooling.md`).
- **Splitting `rust-simd-crates` into text vs numeric** — rejected because both halves
  answer the same question shape ("is there a crate that already does X with SIMD?"),
  so two skills would overlap on every crate-adoption trigger. The volume is absorbed
  as a **second reference file** (`references/crates-numeric-media.md`).
- **An Apple-Silicon-specific skill** (AMX/SME/QoS/Accelerate, §2.13) — rejected as a
  *skill* (its triggers are other skills' triggers: "use NEON on my Mac" is kernels;
  "keep this off the E-cores" is parallel-cache). The content splits naturally:
  instruction-access facts → kernels' stability matrix; QoS/topology/ Accelerate-as-a-
  crate → parallel-cache and crates references.
- **A thread-per-core skill** — the ecosystem update (§2.9) confirms this is an
  *architecture* decision (compio vs Tokio LocalRuntime vs morsel-driven), already
  owned by `rust-fast-architecture`; the pinning mechanics stay in
  `rust-parallel-cache`. Splitting runtime-choice from pinning would duplicate the
  topology material.

Why not one skill (unchanged from the original argument, now stronger): ~55k words of
load-bearing reference material across 10+ tables; progressive disclosure requires a
lean router plus focused sub-skills. Why not more than five: each additional skill
multiplies trigger-overlap risk, and Round 1 showed the *content* grows inside files,
not into new trigger families.

The main skill fires on generic speed-up requests and routes; each sub-skill fires
directly on its specific phrases, so "pin these worker threads to cores" never loads
the SIMD crate survey, and "thread-per-core" never loads the false-sharing numbers.

### 4.2 Skills, names, triggers, files (each file line names the report sections that feed it)

All under `/Users/hmziq/.agents/skills/`. Trigger descriptions are written to be
mutually exclusive; the router phrases in parentheses are examples, not exhaustive.

**1. `rust-superopt` (main skill — router + measurement/tooling)**

- **Purpose / trigger**: Entry point when the user wants Rust faster and the lever
  isn't yet obvious, and owner of the measure-verify-tooling discipline. Fires on:
  "make this Rust loop faster", "why is this Rust code slow", "optimize this
  crate/service", "superoptimize this", "improve throughput/latency", "set up PGO /
  BOLT / benchmarking for my Rust project", "profile this Rust binary". Does NOT fire
  on the sub-skills' specific phrases (crate swap, vectorization diagnosis, pinning,
  service architecture) — it routes to them. Establishes benchmark-first discipline,
  compute-vs-memory-vs-lock-vs-IO triage (Amdahl), and release-profile hygiene.
- **Files**:
  - `SKILL.md` — triage workflow and routing table. Feeds: §1 (lever-selection
    decision tree: swap an accelerated crate → fix autovec → parallelize → cache/
    affinity → hand SIMD → architectural change; "stop when you hit the target"),
    §4.2's own routing phrases, §2.8's release-profile facts (opt-level 3 / thin LTO /
    codegen-units, overflow-checks).
  - `references/measurement.md` — the verification backbone: criterion hygiene
    (release-only, sizes around L2, noise bands, the false-sharing benchmark's
    straddle-hazard and best-of-N lessons), parity tests vs the scalar oracle
    (tail lengths, float tolerance vs int equality, NaN/edge values), per-OS profiling
    (perf/Tracy/Instruments CPU Counters/mperf/darwin-kperf), iai-callgrind
    instruction counts, CI perf gates. Feeds: §2.6 (inspection toolchain),
    §2.7 (measuring caches), §2.8 (SpacetimeDB's benchmark discipline: criterion vs
    SQLite baseline, median-of-31 CI gate, Little's-law validation), §2.12
    (cargo-pgo workflow).
  - `references/codegen-tooling.md` — NEW in Round 1: codegen-inspection and
    whole-binary optimization tooling status. Feeds: §2.6 (cargo-show-asm 0.2.63
    flags + the pipe-to-mca gotchas, cargo-remark, `-C remark` filtering,
    codegen-units caveat, llvm-IR alternative), §2.12 (llvm-mca-on-macOS via
    Homebrew keg-only LLVM; llvm-bolt Linux-only #72205 + Docker route; Souper frozen
    at LLVM-18 + cranelift souper-harvest as the live Rust path; STOKE dormant;
    egg/egglog/Herbie active; Kobzol PGO/BOLT flag canon; rustc's own BOLT builds).

**2. `rust-simd-crates` (sub-skill: adopt an accelerated crate)**

- **Purpose / trigger**: Pick and migrate to an existing SIMD-accelerated crate
  instead of hand-writing kernels. Fires on: "use simd_json instead of serde", "is
  there a crate that does X with AVX2/NEON", "faster JSON / hashing / compression /
  UTF-8 validation / base64 / hex / CRC / FFT / BLAS / crypto", "why is my
  serde_json/regex path slow", "which SIMD crate should I use". Does NOT fire on
  "why didn't my loop vectorize" (kernels) or on writing your own kernels.
- **Files**:
  - `SKILL.md` — adopt-don't-write decision rules: the golden rule (runtime dispatch
    by default; sonic-rs is the sole crate whose advertised perf needs
    `-C target-cpu=native`; jiter is compile-time at baseline width; native builds of
    anything are non-distributable), benchmark-before-adopt, feature-flag swap
    patterns, the do-not-recommend list. Feeds: §2.3 headline rule, §3 default rule +
    do-not-recommend list, §2.10–§2.11 negative results.
  - `references/crates-text-parsing.md` — Feeds: §2.3 (the full parsing/serialization
    table with per-crate gotchas, dispatch models, versions/downloads), §2.10 (Nugine
    codec family + 2022-freeze caveat; faster-hex/escape-simd/encodify/base64-turbo
    wave; httparse's hidden SIMD; quick-xml's read-path+escape memchr vs csv's
    writer-only memchr; simd-csv;
    stringzilla/bytecount; simdnbt; the DNS/URL/HTML-sanitizer gaps; atoi_simd vs
    fast-float2-is-not-SIMD), §3 rows: JSON, byte search, multi-pattern, UTF-8,
    hashing, checksums, crypto, compression, codecs, integer/float parsing, HTTP,
    text, CSV, XML/HTML, DNS.
  - `references/crates-numeric-media.md` — NEW in Round 1. Feeds: §2.4
    (glam/rustfft/blake3/xxhash/zune-jpeg/rav1e/symphonia/jxl-oxide/faer/zstd/
    lz4_flex + rayon-pairing summary), §2.11 (rten-simd incl. the macOS AVX-512
    sysctl workaround; RustCrypto aes/chacha20/poly1305 runtime VAES; polars
    nightly-std::simd caveat vs arrow-rs autovec; arrow2 archived; PhastFT;
    turbovec; thermite trust tension; bitpacking; geo negative result; candle=gemm),
    §2.13 (apple-accelerate / blas-src accelerate as the macOS math route), §3 rows:
    FFT, linear algebra, ML inference, math, image codecs, AV1, audio, vector search,
    explicit-vector crates, multiversioning.
  - `references/json-migration.md` — serde_json → simd-json / sonic-rs in detail.
    Feeds: §2.3 simd-json and sonic-rs rows (`&mut` input, Value types, prelude
    import, ordered-float, allocator sensitivity, with_buffers reuse, sonic-rs
    build-flag requirement + lazyvalue + `*_unchecked`), §2.3 headline rule.

**3. `rust-simd-kernels` (sub-skill: write and verify your own SIMD)**

- **Purpose / trigger**: Write, port, or debug your own vector code when crates and
  the compiler aren't enough. Fires on: "why didn't this vectorize", "check if this
  loop vectorizes", "hand-write an AVX2/NEON/AVX-512/SVE kernel", "use std::simd /
  wide / pulp / fearless_simd / rten-simd", "runtime dispatch with
  is_x86_feature_detected", "multiversion this function", "port these C intrinsics",
  "is AVX-512/SVE/AMX stable in Rust yet". Does NOT fire on crate-pick questions.
- **Files**:
  - `SKILL.md` — the intervention ladder (rung 0 compile flags → rung 1 autovec-
    friendly rewrite → rung 2 portable SIMD → rung 3 arch intrinsics → rung 4
    algorithmic/layout), stable-vs-nightly decision, when to stop. Feeds: §2.1
    (approaches + crate table + COI caveat), §2.6 (the condensed workflow spine),
    §2.5 (baseline facts, AVX-512 stable 1.89, downclocking history + Zen 4
    double-pumping measurement).
  - `references/autovectorization.md` — Feeds: §2.6 (opt-level 2/3 requirement;
    measured probe behaviors incl. the f32-dot muls-vectorize/adds-scalar case and
    the resolved Reddit dot-product dispute; no FMA contraction — mul_add is the only
    route; algebraic_* since 1.98; bounds-check folklore correction;
    assert_unchecked/black_box; alignment blockers; slp-vectorizer's role; vector-
    width = 128-bit-lane rule; vzeroupper; CI remark-grep regression tracking), §2.2
    (WormRabbit's &mut-iterator gotcha; chunks_exact/as_chunks), §2.5 (x86-64-v2/v3/v4
    as the shippable middle ground; .cargo/config.toml).
  - `references/portable-simd.md` — Feeds: §2.1 (crate table: pulp/wide/fearless_simd/
    macerator/simdeez + survey exclusions), §2.4 (dispatch internals: pulp Arch/
    WithSimd; wide build-time-only; fearless_simd Level/dispatch!/kernel!/SimdPod and
    binary-size cfgs), §2.6 (multiversion 0.9 correct syntax + overhead reality;
    cargo-multivers long-running-only), §2.2 (memchr Vector-trait pattern + the
    kouteiheika six-point critique; no portable movemask on NEON; raphlinus
    select/swizzle gap), §2.5 (core::simd nightly section with API-churn warning,
    Chromium-on-nightly datapoint).
  - `references/intrinsics.md` — Feeds: §2.5 (target_feature safety: 1.86 safe-fn
    marking, 1.87 safe intrinsics, UB rule + wasm exception; aarch64 NEON/dotprod/
    fp16/i8mm attribute-vs-intrinsics split; prefetch facts incl. the _mm_prefetch
    E0133 gotcha and nightly aarch64 _prefetch), §2.13 (AMX via .inst/asm, M4 SME
    streaming-mode-only reality, smstart/smstop asm on nightly).
  - `references/stability-matrix.md` — Feeds: §2.5 in full (baselines per target;
    stable-vs-nightly per arch with tracking issues AMX #126622, AVX10 #138843, SVE
    intrinsics #145052, SME #150244, RVV #150257 + no RVV intrinsics module +
    unratified P extension, portable_simd #86656, LoongArch detection stable 1.89 +
    LSX/LASX intrinsics unstable #117427, s390x/ppc/32-bit-arm modules; detection
    macro matrix; prefer-256-bit codegen-only caveat; APX/new-AMX variants), §2.5's
    primary-source addendum (LLVM SVE2-mandatory-at-v9.0, SME v9.2/SME2 v9.3
    optional; AVX10 Rev 3.0 March 2025; relaxed-simd browser matrix).

**4. `rust-parallel-cache` (sub-skill: parallelize + cache/affinity)**

- **Purpose / trigger**: Make Rust parallel and cache-friendly at the thread/memory
  level. Fires on: "parallelize this with rayon", "why doesn't adding threads help",
  "pin these worker threads to cores", "false sharing", "NUMA / first-touch /
  mbind", "cache-friendly layout / blocking / tiling", "why is my multithreaded
  counter slow", "keep this off the E-cores / QoS classes", "my rayon pool is slow".
  Does NOT fire on "thread-per-core service design" or single-writer architecture
  (fast-architecture), nor on SIMD itself.
- **Files**:
  - `SKILL.md` — decision framework: work-stealing vs pinned shards vs hybrid;
    rayon core (par_iter, scoped pools, num_threads, start/stop_handler,
    spawn_handler-is-unsafe); false-sharing rules of thumb (ratio ~14–18×, pad to
    128 B/CachePadded; 64 B removes ~98% on M3; never teach absolute ns/op);
    blocking/tiling with the rayon.join base-case shape; Apple Silicon caveats
    (KERN_NOT_SUPPORTED=46 → QoS tiers + per-cluster L2, 2×6 P-cluster shard
    consequence); prefetch guidance. Feeds: §2.7 in full, §2.9 (work-stealing-vs-TPC
    benchmark verdicts — the *mechanics* half), §1 point 4.
  - `references/topology.md` — Feeds: §2.7 (measured M3 Max hierarchy + legacy-key
    trap + SLC 48 MB community figure; lscpu/sysfs/numactl; Zen 4 CCX vs Intel mesh/
    SNC distinction; core_affinity's topology-blind macOS ids; hwloc2-stale vs
    hwlocality), §2.13 (perflevel sysctl readings, cpusperl2, gdt-cpus).
  - `references/numa-pinning.md` — Feeds: §2.7 (core_affinity per-OS internals;
    verified rayon pinning pattern; taskset/numactl; MPOL semantics incl.
    write-after-policy and MAP_SHARED exceptions; raw SYS_mbind/syscall route; numa
    crate name-collision warning; hwlocality memory binding), §2.9 (hwlocality API
    list, THP/madvise + Redis latency case).
  - `references/false-sharing.md` — Feeds: §2.7 (all four sessions' numbers with the
    reproducibility caveat; straddle hazard; Relaxed≈SeqCst on M3; crossbeam padding
    rationale; kernel guidance; perf c2c event table incl. AMD/Arm64 and
    --double-cl).

**5. `rust-fast-architecture` (sub-skill: service-level speed)**

- **Purpose / trigger**: Architecture-level speed for whole Rust services. Fires on:
  "thread-per-core", "share-nothing / sharded service design", "single-writer vs
  MVCC vs sharding", "how does SpacetimeDB / TigerBeetle go so fast", "reduce lock
  contention", "group commit / write-behind logging", "should I colocate compute and
  data", "glommio vs monoio vs compio vs tokio", "design a low-latency
  high-throughput service". Does NOT fire on rayon/pinning mechanics
  (parallel-cache) or single-kernel SIMD (kernels).
- **Files**:
  - `SKILL.md` — the transferable techniques as a decision framework: contention
    math (ceiling = 1/critical-section; 3 µs vs 1 ms; the 1%-contention cluster cap),
    when single-writer-per-shard beats parallelism, lock downgrade at commit,
    write-behind group commit + watch-channel offsets, async off the fast path,
    precomputed-layout memcpy serialization, pooling, adaptive linger, determinism
    as a lever (dst), core partitioning by thread class, benchmark methodology, and
    the async-runtime chooser (compio / Tokio LocalRuntime / morsel-driven when
    analytical). Feeds: §2.8 transferable techniques, §2.9 (Iggy/PulseBeam/Jaffray/
    c410-f3r verdicts — the *architecture-choice* half), §1 point 5.
  - `references/spacetimedb-case-study.md` — Feeds: §2.8 in full with file:line
    citations (single-threaded executor + the one RwLock; 64 KiB pages/freelists/
    page_pool 128×8 MiB; StaticLayout memcpys; BSATN; group commit; adaptive
    receiver + refcount-shared broadcast buffers; jemalloc profiling; sync/async
    wasmtime split + V8 second engine; the varint-simd deferral as the one SIMD
    decision; no-io_uring checklist; vendor benchmarks + methodology; what is
    proprietary), §2.9 (TigerBeetle contrast: 8191-per-message batching,
    zero-dynamic-alloc, O_DIRECT+registered buffers, single-writer).

### 4.3 Draft verdict (unchanged in substance, updated details)

`/Users/hmziq/.agents/skills/rust-simd-superopt` (read in full on 2026-09-28) gets
**restructured, not reused or kept as-is**:

- **Keep (ported, updated)**: the intervention-ladder concept and SKILL.md's workflow
  spine (baseline → inspect → climb → verify → codegen-check) become
  `rust-simd-kernels/SKILL.md`; `references/autovectorization.md`,
  `references/portable-simd.md`, `references/intrinsics.md` (all updated per the
  feeding sections listed above), and `references/verification.md` (moves to
  `rust-superopt/references/measurement.md`).
- **Replace**: the skill's scope and name — "SIMD superopt" cannot carry crate
  adoption, rayon, cache/affinity, or architecture content, and two skills firing on
  "make this loop faster" would race. The old directory should be retired once the
  new five exist.
- **Stale facts in the draft that motivated the rewrite** (line refs to the draft as
  read): "float reductions never auto-vectorize… nightly-only opt-out"
  (portable-simd.md:29, autovectorization.md:74) — superseded by Rust 1.98's stable
  `algebraic_*`; NEON "intrinsics are still unsafe fns" + "check its current
  stability" for `is_aarch64_feature_detected!` (intrinsics.md:89-95) — stable since
  1.59/1.60 and largely safe-to-call since 1.87; no mention of fearless_simd v1.0,
  AVX-512 stability (1.89), or the crate-adoption path entirely. **Round-1 additions
  to the stale list**: any multiversion syntax in the draft must be checked against
  0.9's `targets(...)` form; `_mm_prefetch` presented as callable-without-unsafe
  won't compile (E0133); `core::intrinsics::prefetch` no longer exists (renamed
  split); "64 B == 128 B on Apple Silicon" is withdrawn (64 B ≈ 98% removal).

---

## 5. Open questions for the user

1. **Replace or rename-in-place?** The draft `rust-simd-superopt` directory could be
   renamed to become `rust-simd-kernels` (preserving git-less continuity) or deleted
   after the new five skills are written. **Recommendation**: build the five fresh and
   delete the draft — its four reference files are being substantially rewritten
   anyway, and leaving it would double-fire on SIMD triggers. (Round 1 adds: the
   draft's facts have aged further — multiversion syntax, prefetch callability,
   intrinsics renames — so porting is a rewrite, not a copy.)

2. **Nightly stance for `rust-simd-kernels`.** Should `core::simd`/portable_simd be a
   first-class path or a marked sidebar? **Recommendation**: stable-first (pulp /
   fearless_simd / rten-simd / wide + multiversion), with core::simd as a clearly-
   gated nightly section — the API is still churning (`SimdFloat` import broke on
   nightly 1.100, re-verified on 1.101) and most users ship stable; note the Rust 1.98
   `algebraic_*` escape hatch prominently. Round-1 nuance: Chromium runs std::simd in
   production on nightly while "avoiding the least stable APIs" — cite it when a user
   with nightly flexibility asks.

3. **fearless_simd's prominence.** The 2026 survey (author now a maintainer, COI
   disclosed) recommends it as the all-in-one default; the recommendation partly rests
   on maintainer-run benchmarks that could not be independently dated or verified.
   **Recommendation**: present it as a strong option alongside pulp (runtime dispatch,
   faer-proven) and wide (build-time), with a one-line COI note — do not make it the
   unconditional default; let the user's benchmark decide. Round 1 strengthens its
   case with independent adoption: memchr-n reportedly outperforming memchr
   (BurntSushi/memchr#241), PhastFT moving to it for stable Rust, and Philbin (AEGIS)
   adopting the token pattern — worth citing as third-party evidence, distinct from
   the maintainer's own benchmarks.

4. **Vendor benchmark policy.** All crate speedups in §2.3–§2.4 and §2.10–§2.11 are
   vendor-reported; none were reproduced on this host (no x86 machine; M3 Max has no
   AVX2/AVX-512). **Recommendation**: the crates sub-skill should instruct a quick
   criterion A/B (serde_json vs simd-json/sonic-rs on the user's own payload shapes)
   before any migration, since simd-json is API-invasive and sonic-rs constrains
   build flags.

5. **Platform emphasis in `rust-parallel-cache`.** Linux pinning/NUMA content is
   server-oriented and verified only against man pages/kernel docs (no Linux host in
   any session); Apple Silicon content is measured (QoS latencies, KERN_NOT_SUPPORTED,
   perflevel topology, false-sharing ratios). **Recommendation**: keep both
   first-class — the audience for super-optimization skews Linux servers, and the
   Apple Silicon content is measured and directly actionable for the many devs on
   Macs.

6. **SpacetimeDB currency.** Its cloud replication details are proprietary and its
   tiered storage ships 2026-10-31; the case-study reference must date-stamp claims
   (clone at commit 06d7d33c, 2026-09-27/28; workspace v2.11.0 vs shipped docs
   v1.12.0). **Recommendation**: include the open-source-tree facts (file:line-cited)
   as the load-bearing content and mark blog-only claims as vendor-described; pair
   with TigerBeetle (§2.9) as the counter-case so the skill teaches the trade space,
   not one system.

---

# Round 3 addendum (2026-09-30): release flags, wasm pipeline, instruction families

User asked: is SIMD-instruction coverage complete; are WebAssembly release
cycle and release flags (desktop/Linux/Windows/wasm) covered; anything new
in 2026? Audit + delta pass, recorded here.

## Gaps found and closed

1. **Per-platform release flags** — previously only x86_64 floor rules
   existed. Added `rust-superopt/references/release-flags.md`: profile
   fields (lto/codegen-units/panic-abort caveats), per-target config
   sections, the x86_64 baseline decision tree, verified macOS defaults,
   and the full wasm pipeline. Wired into both SKILL.md files.
2. **Wasm release cycle + pipeline** — stability-matrix had the flags'
   stability but nothing on the build pipeline or cadence. Added: engine
   matrix (below), the load-trap gotcha (flags apply to std+deps; wasm
   validates at load — no in-module fallback), the dual-build +
   `WebAssembly.validate` JS-detection pattern (wasm's analogue of
   `is_x86_feature_detected!`), wasm-pack/wasm-bindgen/wasm-opt
   `-O3 --enable-simd [--enable-relaxed-simd]` chain with binaryen-version
   pinning, and the release-cycle picture (Chrome/Firefox ~4-week cadence;
   Safari rides OS updates — why relaxed-simd lags; Node lags V8).
3. **Instruction-family map** — intrinsics.md had scaffolding patterns but
   no cross-arch family catalog. Added a 15-row table: table-lookup
   (pshufb/tbl/swizzle), permutes, movemask patterns, blend, FMA/fcmla,
   VNNI/udot/smmla, horizontal reduce (hadd trap vs faddv), gather (the
   1.75–4× survey figure), saturating math, widening/narrowing, AES,
   PCLMUL/pmull, CRC32, FP16/BF16, and pcmpestri (avoid). Includes which
   crates already own each family.

## 2026 delta (new facts this round, sourced)

- **RHEL 10 made x86-64-v3 the whole-distro baseline** (dropped v2) and
  **Ubuntu 26.04 LTS ships v3-optimized package variants** (classic baseline
  still default). Changes the `-C target-cpu=x86-64-v3` fleet calculus.
  [2026 distro reports; not locally verifiable on this macOS host]
- **Windows 11 24H2's CPU floor is SSE4.2/POPCNT** (≈ x86-64-v2).
- **Safari: relaxed-simd still absent from stable as of 2026-09**; WebKit is
  actively shipping it piecemeal in STP (208 added relaxed laneselect);
  WebViews absent too (caniwebview). caniuse now lists Firefox 128+ for
  relaxed-simd, which **conflicts** with round-2's primary-sourced 145/146
  (Bugzilla train 145, MDN BCD 146) — recorded as disputed; the skill keeps
  the primary-sourced figure with the conflict noted.
- **wasm-opt flags verified**: `-O3 --enable-simd --enable-relaxed-simd`
  (binaryen docs; without --enable-relaxed-simd it may reject relaxed instrs).
- **aarch64-apple-darwin defaults, locally verified on rustc 1.98.1** via
  `rustc --print cfg`: neon, dotprod, fp16, aes, crc, rdm, sha2, sha3 are
  ALL default-on; i8mm and SVE-class are not. This supersedes older blog
  claims (StackOverflow 65156743 era, Homebrew issue 15530 era) that only
  NEON is default. One historical cfg bug exists (rust#95122) — re-verify
  per toolchain.
- **wasm32 verified locally on rustc 1.98.1 (stable)**: no SIMD in default
  cfg; `-C target-feature=+simd128,+relaxed-simd` accepted and both appear
  in cfg.
- Rust stable SIMD story otherwise unchanged from round 2: 1.87 safe
  intrinsics, 1.89 AVX-512, 1.98 algebraic_*; AVX10/SVE/SME intrinsics and
  portable_simd still nightly (searched 2026-09; no new stabilization found).

## Honest limits of this round

- Distro/browler/caniuse facts are sourced from web search summaries and
  feature-status pages, not measured (no Linux/x86 host; engine behavior
  not executed).
- The Firefox relaxed-simd version conflict (128 vs 145/146) is flagged, not
  adjudicated — primary-source round 2 (Bugzilla/BCD) currently wins.
- Node simd128 floor stated as "16.x+ (V8-based)" from V8 91 alignment, not
  tested per Node version.

---

# Round 4: exhaustive niche hunt (2026-09-30)

Twelve channel hunters swept non-English communities, the Rust forum archives,
LLVM's own vectorizer sources, the niche blogger canon, StackExchange, the
GitHub/crates.io long tails, the (GitHub-mirrored) Zulip decision rooms, the
academic layer, Wasm engine primaries, hardware manuals, and the benchmark/
folklore layer. Every fact below carries the citation its hunter captured
(fetches run live 2026-09-30 against the cited APIs/pages). The integrator ran
no independent re-verification beyond the greps noted — treat hunter-sourced
numbers exactly as labeled (measured-by-hunter / vendor / community).

## 4.1 Corrections and settlements (these supersede earlier rounds)

1. **Firefox relaxed-simd = 145 — the Round-3 "128 vs 145/146" dispute is
   settled.** Bugzilla REST on bug 1930192 ("Let relaxed-simd ride the trains
   to release"): RESOLVED FIXED, target milestone **145 Branch**,
   `cf_status_firefox145: fixed`, patch landed mozilla-central
   `5b7e8a98b984` on 2025-10-08. webassembly.org's `features.json` records
   `"relaxedSimd": "145"` for Firefox. Bug 1934940 proves "128" is impossible:
   before the train flip the `javascript.options.wasm_relaxed_simd` pref was
   compiled into Nightly only and **did nothing in Release/Beta** (user-
   confirmed non-functional on 139.0.1; rhunt closed it "fixed by bug
   1930192", 2025-10-24). caniuse's own wasm-relaxed-simd row is stale
   through FF 160 (still "Nightly only") — **do not inherit caniuse for this
   feature**; Bugzilla + features.json outrank it. Sources:
   https://bugzilla.mozilla.org/show_bug.cgi?id=1930192 ,
   https://bugzilla.mozilla.org/show_bug.cgi?id=1934940 ,
   https://raw.githubusercontent.com/WebAssembly/website/main/features.json
2. **The portable_simd blocker list moved.** The 2023 trio in #364 (lane
   counts / mask element / swizzle API) is stale: calebzulawski (2026-08-04,
   rust-lang/portable-simd#364): "The thing we are waiting on right now are
   two major structural changes to the API. One is **#493** which separates
   the scalar type from the length… The other is **#483** which changes masks
   to use the scalar type as the generic parameter… We probably want to
   finish up #493 first and then rewrite #483." hsivonen's same-day subset-
   stabilization proposal (int vectors + static swizzles now) did **not**
   change the plan. #86656 remains open with `needs-rfc` and **no target
   release**; #483 has been awaiting reviewer workingjubilee since 2025-09
   ("HELLO YES." — 2026-07-03). Sources:
   https://github.com/rust-lang/portable-simd/issues/364 (comment
   2026-08-04T14:14:35Z), https://github.com/rust-lang/rust/issues/86656 .
3. **`packed_simd2` no longer exists as a crate name.** crates.io API:
   `{"errors":[{"detail":"crate `packed_simd2` does not exist"}]}`;
   docs.rs/crate/packed_simd2/latest → 404. The rust-lang project publishes
   as **`packed_simd_2`** (repo github.com/rust-lang/packed_simd), last
   release **2022-06-01** — frozen nightly-only, awaiting portable_simd.
   Every blog post citing `packed_simd2` now points at nothing.
4. **`safe_arch` is alive and deliberate, not a dead oddity.** Updated
   2026-08-14, 25 versions, 75.5M total / 18.4M recent DLs — top-10 by
   downloads in the hunter's whole survey. Its own README: compile-time
   `#[cfg]` only ("If you'd like to determine what CPU features are available
   at runtime… **this crate is not for you**"), "an 'unopinionated' middle
   layer crate that just provides the safety". Fine as `wide`'s substrate;
   wrong for application code. Source: crates.io API + README
   https://raw.githubusercontent.com/Lokathor/safe_arch/main/README.md
5. **pulp/faer authorship corrected: sarah-quinones** (crates.io repository
   fields: github.com/sarah-quinones/pulp, codeberg.org/sarah-quinones/faer)
   — **not** caelunshun (whose repos are fjall/lsm-tree/cudarc/…; no SIMD
   library, no blog). sarah-quinones publishes no prose at all: pulp's
   `Arch::dispatch` / `WithSimd` head-tail design is documented only in the
   README and docs.rs.
6. **Negative verifications — do not re-chase**: Muła's rumored "djbhash"
   post (greps over notesen/notespl/til + Wayback CDX = 0 hits; his rolling-
   hash work is the SIMD Rabin-Karp/strfind series); Langdale's "simdbase"
   repo and Robin-Hood-hashing post (GitHub repo list = 5 repos, none such;
   the real SIMD+Robin-Hood artifacts are Bother et al., VLDB'23
   "Analyzing Vectorized Hash Tables Across CPU Architectures" and repos
   benwills/MapV, SpencerTSmith/SIMD-Robin-Hood-Hash-Table); a rumored CGO'25
   Rust superoptimizer "slop" and a "Croissant" SIMD-isomorphism paper
   (arXiv title search + GitHub repo search + web = 0 hits each).
7. **Dougall Johnson's Apple database covers M1/A14 (Firestorm/Icestorm)
   only** — repo file listing via GitHub API has no M2/M3/M4 tables, and AMX
   *instruction latencies* are not tabulated anywhere (port placement +
   fusion rules only). Any per-M-generation NEON/AMX latency table must come
   from another source; none was found in the four hardware manuals swept.
8. **Subnormal-FP folklore quantified** (replaces "~30× Intel / ~2× AMD"):
   denormal FP-multiply output costs **132 cycles on Lion Cove, 124 on
   Redwood Cove**, while **Skymont (3.35/cyc ≈ FTZ rate) and Zen have a fast
   path** (near-free). Sources: Chester Lam, "Lion Cove: Intel's P-Core
   Roars", https://chipsandcheese.com/2024/09/27/lion-cove-intels-p-core-roars/ ;
   clamchowder, "Skymont", https://old.chipsandcheese.com/2024/10/03/skymont-intels-e-cores-reach-for-the-sky/

## 4.2 The twelve-channel bibliography

### 4.2.1 Non-English communities (Japan / Russia / China)

Each community hosts one tier-one cluster English search never surfaces.

- **Japan — mod_poppo** (Zenn, 48 articles; the deepest x86-FP/SIMD expert
  found): "言語処理系にSIMD命令を実装することについて" (Zenn 2025-02-08,
  11,754 letters) — implementing SIMD in GHC's NCG without LLVM. Directly
  transferable technique: x86 FP negation/abs must be XOR/AND masks; the 32
  AVX compare predicates = 4 relations × signaling/non-signaling; **integer
  vector multiply ladder** (int8x16 via interleave into 16-bit lanes; int32x4
  via two `pmuludq` or SSE4.1 `pmulld`; int64x2 via three `pmuludq` partial
  products or AVX-512DQ `vpmullq`); shuffles reduce to pshufb/pshufd/shufps/
  shufpd pattern-matching; **the Intel Intrinsics Guide is incomplete**
  (e.g. `_mm_range_ss` missing). Cost accounting: ~800 lines of codegen for
  integer+shuffle ops, ~1 month spare time for integer shuffles alone.
  https://zenn.dev/mod_poppo/articles/simd-implementation . Also: AVX10.2
  features (2024-08-13, /articles/new-features-of-avx10-2), x86-64 VEX/EVEX
  machine code (2024-01-03, /articles/x86-64-vex-evex), runtime CPU feature
  detection x86 (/articles/detect-processor-features-x86 — the
  `is_x86_feature_detected!` underpinning), libm precision (2025-12-20,
  31,713 letters), bfloat16 (2025-07-01), FMA implementation (Qiita 2020,
  https://qiita.com/mod_poppo/items/e6577df362f44a3ef8dd).
- **Japan — yua134**, "2600億回のモンテカルロを14秒で" (Zenn 2025-10-07):
  260B Monte-Carlo trials in ~14.2 s (~18B trials/s, Core Ultra 5 125U) with
  std::arch AVX2 + rayon + hand-written XorShift. Tricks: float conversion
  via the **IEEE-754 exponent trick** (set exponent=127 → [1,2), subtract 1;
  no division); **circle test as sign-bit of x²+y²−1 counted with popcnt**
  (no compare/branch); **reusing each 8-value RNG batch as both x and y
  coordinates** (halves RNG cost, accepted statistical tradeoff); flags
  (LTO/codegen-units=1/panic=abort/native) worth >2×.
  https://zenn.dev/yua134/articles/montecarlo-pi
- **Japan — benki** (Qiita 2019): SWAR UTF-8 codepoint counting over u64
  (`u>>6 | !u>>7`, mask, `count_ones()`) ≈ **1.5× faster than
  `str::chars().count()`**, with the note that LLVM autovectorization nearly
  matches the hand SWAR loop. https://qiita.com/benki/items/bcc77f8d346ad1478478
- **Japan — DwarfM42** (Qiita 2026-09-26): introduced **csveee** (TUM's
  fused parallel CSV parser, 180 GB/s paper claim) to JP readers — the
  "inverted parser" (`init/acc/merge`: you hand your fold to the parser),
  speculative chunk parsing with boundary fix-up, zero-copy record slices.
  https://qiita.com/DwarfM42/items/f5911b55555843ac1b61 ; paper
  https://db.in.tum.de/~ellmann/papers/csveee.pdf ; repo
  https://github.com/ackxolotl/csveee
- **Russia — 0xItsss** (Habr 2026-07-29): "Четыре f64 за одну инструкцию не
  делают вас быстрыми" — vectorizing the open-source Rust trading engine
  **Quince** into six AVX2/FMA kernels (`sum`, `weighted_sum`,
  `sum_and_sum_xy`, `sum_abs_diff`, `min_max`, `sum_sq_diff`). The
  transferable engineering: give SIMD **two contiguous slices instead of
  copying the ring-buffer window**; preserve logical numbering across
  wrap-around; **split hot/cold state so SIMD doesn't accelerate code that's
  losing to L1 misses anyway**; scalar tail + numerical contracts; and a
  **Criterion gate that checks confidence intervals of the whole pipeline,
  not means — so thermal downclocking isn't misread as a regression** ("How
  Criterion lied to me by 120%"). https://habr.com/ru/articles/1064622/
- **Russia — m03r** (Habr 2022-06-02, score 117): fail2ban ~1000× via a Rust
  rewrite — `_mm_extract_epi32`/widening multiplies for SIMD line parsing
  plus the **memchr crate** (not std) for CPU-specialized separator search.
  https://habr.com/ru/articles/668634/
- **Russia — morett1m** (Habr 2026-07-27): SwissTable internals — Rust std
  HashMap since 1.36 scans **16 control bytes per SIMD instruction**;
  EMPTY=0xFF / DELETED=0x80 / FULL with 7-bit h2 fingerprint; h1 from low
  bits (group index), h2 from top 7 bits (deliberately opposite ends); when
  to switch to FxHash. https://habr.com/ru/articles/1051164/
- **China — juejin/kerkour translation** (猩猩程序员, 2025-08): the ChaCha12/
  BLAKE3 author's SIMD guidance in Chinese — std::arch +
  `is_x86_feature_detected!` on stable, `wide`/`pulp` as mid-layers, nightly
  std::simd; **SSE2 no longer worth targeting**; SIMD can downclock older
  Intel; test with each feature on and off.
  https://juejin.cn/post/7538641137974116391 . Production-scale Chinese
  artifact: ByteDance **sonic-rs** (juejin 2024-02,
  https://juejin.cn/post/7337135278634680370).
- Meta-observation: Japan concentrates in competitive programming + language
  implementation (mod_poppo, contramundum's 2.926T AHC003 solution); Russia
  in long-form production post-mortems with honest CI methodology
  (0xItsss/m03r/morett1m); China in ecosystem engineering + curated
  translations. The rarest non-English material: 0xItsss's Criterion-
  statistics section and mod_poppo's cost accounting for portable SIMD.

### 4.2.2 Rust forum archives (internals + users Discourse)

- **The origin fights.** t/4380 "Getting explicit SIMD on stable Rust"
  (burntsushi, 2016-11-14, 336 posts): alexcrichton's libs-triage position
  (#25) ruled out a high-level type-safe wrapper in std; gnzlbg (#24)
  established `std::arch` (vendor) as orthogonal to a future portable
  `std::simd`; scottmcm (#253): "I don't think
  `std::simd::intel_intrinsics::_mm512_mask_add_round_ps` is bedrock".
  t/5176 "Pre-RFC: stabilization of target_feature" (gnzlbg, 2017-05-04,
  130 posts) contains the founding unsafety argument: "if #[target_feature]
  is unsafe, then it follows necessarily that all vendor intrinsics are also
  necessarily unsafe" + "if we make it unsafe at first, we can always make it
  safe later in a backwards compatible way". That is why every std::arch
  intrinsic is `unsafe fn` today.
- **AVX-512's forum record is silence**: t/12454 (smith.daniel, 2020-05-29)
  is 1 post, zero replies — "guarded behind the stdsimd feature, which seems
  to be currently abandoned". Stabilization happened only in Rust 1.89
  (PR #138940, tracking #111137 opened 2019 — six years).
- **The evex512 gap**: t/21239 (sayantn, 2024-07-24, 1 post): rustc has **no
  negative target features** and auto-enables `evex512` with any avx512*
  feature, so `avx10.N-256` "is impossible to implement" in Rust as-is;
  flipping the default would "create a massive incompatibility". GCC/Clang
  solve it with evex512-on-by-default + `-no-evex512`.
- **prefer-256-bit works but warns**: t/17361 (MarcusTL12, 2022-09-10):
  rustc warns "unknown feature specified for -Ctarget-feature:
  prefer-256-bit" **even though it is listed in `rustc --print=target-
  features` and actually works** (passed straight through to LLVM; 512-bit
  registers disappear from the asm).
- **The best-reasoned war story in the archive** — t/17315 (burjui, 2022-09,
  23 posts): every Rust program 1.5–2× slower with `target-cpu=native` on an
  AMD FX-8320 (Piledriver/bdver2, correctly detected). bjorn3's diagnostic
  method (diff `rustc --print cfg` vs `-Ctarget-cpu=bdver2 --print cfg`,
  bisect the 16 features, isolate scheduler-vs-instruction with
  `-Ztune-cpu`); quaternic found the cause in **Agner Fog blog 285**: on
  Piledriver "Memory writes with the 256-bit AVX registers are exceptionally
  slow… 8–9 times slower than two 128-bit writes" — "LLVM doesn't seem to be
  aware of that, as it happily uses AVX if enabled." Not thermal (35 °C,
  <5 s runs). https://www.agner.org/optimize/blog/read.php?i=285
- **Detection cost is real**: t/22083 "Better codegen for CPU feature
  detection" (raphlinus, 2024-12-27, 45 posts): `is_x86_feature_detected!`
  codegen "can be poor" — an &&-chain does **an atomic load per check**;
  detection inside a loop "has very poor performance"; inlining loses
  opportunities ("both caller and callee must do the full feature detection
  and dispatch"). Proposed "dynamically constant" semantics (≈ LLVM
  `unordered`). The `cpufeatures` crate uses the same atomics-to-cache
  pattern as std.
- **The movemask hole, verbatim from the memchr author** — t/16719 (2022-06):
  tcsc: "memchr::memmem assumes the existence of efficient movemsk-style
  instruction, which doesn't exist on arm/aarch64 (and emulating it is as
  slow as emulating horizontal ops generally are)". burntsushi on std::simd:
  "I spent ten minutes looking at std::simd and I can't answer… whether there
  is a portable movemask operation. **The docs are really hard to browse.**"
  The `ToBitmask` trait exists but its emulation is "slow enough… it's an
  immediate red flag". Same thread, folklore correction (#37): "unelided
  bounds checks are not what slows down debug builds. It's un-inlined
  functions."
- Compile-vs-runtime detection confusion answered by BurntSushi himself
  (users t/91243): `cfg!(target_feature="fma")` reflects the *compile-time*
  target — defaults "are usually pretty paltry… FMA… doesn't get added until
  you use the x86-64-v3 level".
- Live 2026 friction: hsivonen's pre-RFCs — t/24536 (2026-08-17) make
  `#[target_feature]`-fn calls safe when the feature is statically enabled
  for the compilation (RalfJung reframes as flow-sensitive checking; flags
  the inlining constraint "a callee with more target features cannot be
  inlined into a caller with fewer… LLVM isn't smart enough"); t/24538
  (2026-08-18) move `is_x86_feature_detected!` into core.

### 4.2.3 LLVM vectorizer — the source of truth (main = LLVM 24.0-dev)

- **`llvm/docs/Vectorizers.md`** (was .rst; old paths 404): two vectorizers
  on by default (loop + SLP). Cost/forcing knobs `-force-vector-width=N`,
  `-force-vector-interleave=N` — reachable from Rust as
  `RUSTFLAGS='-C llvm-args=-force-vector-width=8'`.
- **FP reductions — the Rust-critical rule** (lines 186-199): LLVM
  vectorizes FP reductions on most targets only under a fast-math subset;
  **AArch64 and RISC-V are exceptions that can emit ordered reductions
  preserving the exact result**. Rust has no fast-math → this is why float
  loop reductions auto-vectorize more readily on aarch64/riscv64 than
  x86-64. (Tension with our own §2.6 measurement: on rustc 1.98.1/aarch64 a
  plain f32 fold still left adds scalar — ordered reduction is *permitted*,
  not *default*; `algebraic_*` remains the reliable route.)
- **Early-exit loops now vectorize** (new section, lines 398-419; single
  early exit): all blocks after the exit predicated; exit via one
  `BranchOnTwoConds` VPInstruction to a `vector.early.exit` block
  (`UncountableExitStyle` in VPlan.h:80-93). Restrictions (Graham Hunter's
  RFC, discourse.llvm.org/t/84690): no stores, no loads after the exit load,
  no reductions, single counted exit, exit shaped `icmp(load, invariant)`,
  all memory dereferenceable. AMD's "Check-first" RFC (t/91337, 2026-07-18)
  generalizes to multiple/flexible/nested exits without masked stores.
- **Tail folding is default-on for RISC-V since LLVM 22** (ReleaseNotes
  22.x lines 201-203) — removes the scalar epilogue; opt back out with
  `-prefer-predicate-over-epilogue=scalar-epilogue`. EVL tail folding
  (`-force-tail-folding-style=data-with-evl` +
  `-prefer-predicate-over-epilogue=predicate-else-scalar-epilogue`, PR
  #76172) was motivated by GCC 14 being ~24% faster on SPEC 525.x264_r
  (SpacemiT X60) and as of July 2025 beats the scalar-epilogue default on
  SPEC2017 + TSVC (issue #123069, Luke Lau).
- **VPlan**: Legal → Plan → Execute (only Execute writes IR); as of 2026
  every VPRecipe computes its own cost via pure-virtual
  `cost(ElementCount, VPCostContext&)` (VPlan.h:359) — the "cost model
  models code that isn't emitted" complaint is being engineered away.
  Register pressure modeled (`VPRegisterUsage::spillCost()`,
  VPlanAnalysis.h:33-48). Canonical talk: Zaks & Hahn, "VPlan: Status Update
  and Future Roadmap", LLVM Dev Meeting 2023.
- **Knob inventory** (LoopVectorize.cpp:177-283): `-tail-folding-policy`,
  `-epilogue-tail-folding-policy` ∈ {dont, prefer, must}-fold-tail;
  `-force-tail-folding-style` ∈ {none, data, data-without-lane-mask,
  data-and-control, data-with-evl}; `-enable-interleaved-mem-accesses`,
  `-enable-masked-interleaved-mem-accesses`, `-vectorize-memory-check-
  threshold`, `-tiny-trip-count-vector-threshold`, epilogue-VF knobs.
- **Remarks**: `-Rpass=loop-vectorize` (success) / `-Rpass-missed=` (failure)
  / `-Rpass-analysis=` (the blocking statements); `-fsave-optimization-
  record` lists multiple causes; `-gline-tables-only -gcolumn-info` for
  locations. (clang spellings — rustc's route is `-C remark=`; see §2.6's
  delivery caveat.) Newest observability commit: early-exit failure remarks
  (#225078, merged 2026-09-23).
- **Public roadmap**: github.com/orgs/llvm/projects/58 (Hassnaa Hamdi RFC,
  discourse.llvm.org/t/90632, 2026-04-22) tracking VPlan migration and
  tail-folded epilogues. 2025-26 SLP: FMA/FMAD pattern recognition + missing
  lanes as `add 0` identities (LLVM 22).

### 4.2.4 The niche blogger canon (0x80.pl, branchfree.org, lemire.me, rten)

- **Wojciech Muła — 0x80.pl, 174 English notes** (index
  http://0x80.pl/notesen.html — HTTP only; the HTTPS endpoint serves a
  mismatched cert). Landmark clusters: SIMD-friendly algorithm design
  (strfind 2016-11-28; Rabin-Karp 2014-03-11; dictionary search 2015-04-08),
  parsing (decimal SWAR/SSE 2014-10-12; **integer sequences with SIMD**
  2018-04-19 — parallel parse+validate of variable-length runs, SSSE3 7–9×
  scalar; IPv4 2023-04-09; HTTP verbs 2022-01-29; hex-with-validation
  2022-01-17), shuffles (PSHUFB lookup 2016-03-13 — ≤16-subrange classifier
  from compare-accumulate + one pshufb; AVX512 GF affine bit-shuffle
  2020-01-19), the base64 series (2015-2017), AVX-512 deep cuts (ternary
  logic 2015-03-22 + ternlogconst tool; conflict detection 2016-10-23 and
  2023-05-06; positional popcount 2019-12-31; PDEP/PEXT in SIMD 2025-01-05),
  recent (SIMD binary-heap ops 2025-01-18; dividing u8 2024-12-21;
  **"Rust is perfectly imperfect" 2026-01-08** — a C++ SIMD veteran's view
  of Rust's toolchain consistency).
- **Daniel Lemire — lemire.me/blog**: "**SIMD-accelerated integer-to-string
  conversion**" (2026-05-18, with Jael Champagne Gareau) — AVX-512 IFMA
  `_mm512_madd52lo/hi_epu64` with per-lane reciprocal powers of ten: **two
  instructions generate eight digits**, masked stores for variable length;
  1.4–2× over the best competitors, 2–4× over `std::to_chars`. Reference C++:
  github.com/fastfloat/int_serialization_benchmark; paper
  doi:10.1002/spe.70079. **No Rust crate implements this.**
  https://lemire.me/blog/2026/05/18/simd-accelerated-integer-to-string-conversion/
- **Geoff Langdale — branchfree.org** (16 posts, 2018-2024): "**A (Draft)
  Taxonomy of SIMD Usage**" (2024-06-09) — Type 1 Horizontal (memchr/Teddy
  scans), Type 2 Vertical (in-register data structures — Hyperscan's NFA in
  registers), Type 3 Exotic (functionality only SIMD has: PCLMULQDQ quote
  pairs via parallel-prefix XOR, AESNI/SHA/GF2P8AFFINEQB, VPERMB/PSHUFB
  in-register tables, compress/expand, VPMULTISHIFTQB) + **SWASR** ("SIMD
  Within A SIMD Register" — e.g. 168 3-bit quantities in one ZMM).
  "**Fitting My Head Through The ARM Holes: Two Sequences to Substitute for
  the Missing PMOVMSKB on ARM NEON**" (2019-04-01) — the two NEON shuffle
  sequences every aarch64 kernel author reinvents. "Bits to indexes in BMI2
  and AVX-512" (2018-05-22) — mask→index compaction, the idiom under
  memchr/aho-corasick interiors. Hyperscan Harry/Teddy (2024-06-29); Why Ice
  Lake is Important (2019-05-29). https://branchfree.org/author/geofflangdale/
- **Robert Knight — rten retrospectives** (2024-12-30, 2025-12-31):
  rten-simd redesigned as a **vector-length-agnostic, entirely-safe portable
  SIMD library modeled on Google's Highway**, designed for future SVE/RVV
  runtime-length ISAs; "use all parallelism kinds — superscalar, SIMD,
  threads — and minimize memory loads and branch mispredicts".
  https://robertknight.me.uk/posts/rten-2025/
- **Lokathor**: written canon = the wide README only (site is a link hub);
  wide's **build-time-only feature detection** — "`is_x86_feature_detected!`/
  multiversion explicitly do not work with wide"; wasm needs
  `RUSTFLAGS='-C target-feature=+simd128'`. Twitch SIMD sessions are not
  publicly archived (gap).

### 4.2.5 StackExchange — Peter Cordes' corpus and the Rust-specific classics

- **Left-pack/compress-filter (q=36932240), four complementary recipes**:
  Cordes' AVX2+BMI2 (https://stackoverflow.com/a/36951611): `pext` over a
  packed self-index constant driving one `vpermd`/`vpermps`; for byte masks
  change the pdep constant 0x0101010101010101 → 0x0F0F0F0F0F0F0F0F and ×0xFF
  → `|<<4`. **Trap: pdep/pext ≈ 6 µops / 18-cycle latency on Zen 1–2** (fine
  Zen 3+); for f64 you still use VPERMPS (no register-controlled VPERMPD).
  Froglegs' AMD-friendly broadcast+`vpsrlv` LUT (a/36949578); Z boson's SSE2
  instruction-LUT (a/36965322); Denis Yaroshevskiy's production
  `std::remove` (a/61431303) splitting 256-bit sub-dword into two 128-bit
  pshufb compresses.
- **AVX-512 compress rule** (a/36949618): `vpcompressps` exists for exactly
  this (dword/qword until VBMI2) — but **compress to a register + full
  overlapping unaligned store**; compress **to memory is "disastrously slow
  on Zen 4"** (uops.info); advance the output pointer by `popcnt` of the
  mask.
- **Movemask inverse** (a/36491672): per-width decision table LUT vs ALU;
  `_mm_min_epu8(v, set1(1))` for 0/1 without cmpeq; AVX-512 made the family
  moot (`kmovw`; "scalar popcnt on the mask results would be a better bet").
- **Horizontal reduction** (a/35270026, 164 votes — his highest-voted pure-
  SIMD answer): extract-high→vertical-add tree; **never hsum inside a loop**
  — accumulate vertically in multiple accumulators, hsum once; `psadbw` as
  the 8→64-bit widening accumulate for byte counts; signed-byte SAD via XOR
  0x80 bias. Companion (a/49943540): `hadd(same,same)` costs 2 shuffle µops
  vs 1 ("good for code-size but pretty much nothing else"); restructure
  matmul so you produce result[i+0..3] per vector and never hsum at all.
- **Shuffle/port economics** (a/47656883): Intel has **one shuffle unit
  (port 5)**; in-lane shuffles 1c vs lane-crossing 3c on SKX; "sometimes
  it's even worth using two overlapping loads instead of loading once and
  shuffling"; `vprolq zmm,zmm,32` swaps neighboring 64-bit elements on
  ports 0/1 — dodges port 5; every unaligned 512-bit load is a cache-line
  split. Blends (a/77713554): `vpblendvb ymm` multi-µop on Intel P-cores,
  single-µop on Zen, Gracemont E-cores "choke badly". Alignment (a/32612833):
  loadu on aligned data is as fast as aligned load; 512-bit alignment worth
  15–20% on SKX over large arrays. Cache aliasing (a/40169187): 32 KiB L1d =
  512 lines / 64 sets / 8 ways → 9 pointers 4 KiB apart conflict-miss; "the
  SoA benefit is mostly from SIMD"; hybrid = SoA in SIMD-vector-sized groups.
- **Latency-vs-throughput reasoning**: a/45114487 (write-only destinations
  break dependency chains via renaming; the exceptions are false deps —
  popcnt/lzcnt/tzcnt pre-Ice-Lake, partial-register writes); a/72333152
  (strength reduction converting per-element parallelism into a **serial
  FP loop-carried dependency** — 2 adds / 4 cycles on Skylake, no
  vectorization; fix by generalizing the recurrence to a larger stride).
- **Rust-specific**: a/71806693 — **rustc silently emits slow non-inlined
  calls** when `#[target_feature]`/intrinsic wrappers are compiled without
  the matching features, where GCC/clang *error out* ("inlining failed…
  always_inline"); also `_mm256_load_epi32` needs AVX512VL to inline, then
  lowers to a plain AVX2 load. a/67444453 (BurntSushi): `target-cpu=native`
  once made SIMD slower via rust#83027, fixed by PR #83084 (2021-03-17).
  a/73119184: "LLVM (and GCC) don't know how to auto-vectorize loops whose
  trip-count can't be calculated up front" — search loops are structurally
  excluded; manually express the unrolling over 2/4/8-element chunks with
  branchless conditions. a/63008805 (yugr): a ternary in source lets GCC's
  if-conversion build vectorizable IR; if/goto shapes contain "spurious
  jumps which… break vectorization". a/76684234: GCC's default
  `-ftrapping-math` blocks conditional-FP vectorization (a skipped multiply
  must not raise), and **AVX-512 masked ops vectorize even with trapping
  math because masking suppresses FP exceptions on inactive lanes**.
  a/45401182 (chtz): never store complex numbers interleaved — split re/im
  SoA so one load fills a packet. Veedrac a/47543246 (78 votes): bounds
  checks ≈ free when indices derive from container size; the real risk is
  bounds living behind several pointer indirections.

### 4.2.6 GitHub long tail (topics, dependents, awesome lists)

- **Dependents — production adopters the crate tables missed** (walked via
  `github.com/{owner}/{repo}/network/dependents?dependent_type=REPOSITORY` +
  `gh search code "… filename:Cargo.toml"`, 2026-09-30):
  - **fearless_simd direct users**: mullvad/mullvadvpn-app (7,610★,
    tunnel-obfuscation), linebender/vello vello_cpu (4,379★ — the CPU 2D
    renderer), DioxusLabs/blitz (4,200★), ntsc-rs (2,627★), LaurenzV/hayro
    (776★, PDF renderer), raphlinus/synthesizer-io. It has quietly become
    the default SIMD abstraction of Rust's 2D-graphics/PDF renaissance.
  - **wide direct users**: kornia/kornia-rs (Cargo.toml:101 `wide="1.4"`)
    and **open-spaced-repetition/fsrs-rs (Cargo.toml:29 `wide="0.7"` — the
    FSRS scheduler inside Anki**, i.e. wide ships to millions of flashcard
    users). Also fedimint (699★), AztecProtocol (453★), iqtree3 (166★).
  - **pulp dependents**: elodin-sys/elodin (545★, drone/avionics sim),
    adobe/trustmark (149★), contentauth/c2pa-js (Content Authenticity).
  - **memchr**: 843,513 repositories / 2,333 packages in GitHub's graph.
- **Discovery is structurally broken**: rust-unofficial/awesome-rust's
  README (388 KB, fetched 2026-09-30) contains **zero** mentions of wide,
  pulp, memchr, fearless_simd, multiversion, stdarch, glam; awesome-simd
  (251★, stale since 2024-09-15) lists exactly one Rust library — the dead
  `faster` crate. The live discovery channel is
  `gh api "search/repositories?q=topic:simd+language:rust&sort=updated"`.
- **topic:simd pages 2-3 standouts**: Nugine/simd 267★, thermite 318★,
  PhastFT 308★, sliceslice-rs (Cloudflare) 106★, SIMD-itertools 186★,
  varint-simd 141★, argminmax 64★, lightmotif (bioinformatics PWM) 64★;
  the RagnarGrootKoerkamp genomics cluster (sassy 169★, simd-minimizers,
  packed-seq, quickheap); Dicklesworthstone/franken_ocr 332★; hacer-bark/
  base64-turbo + hex-turbo (formally verified Kani/MIRI/MSan codecs);
  skyzh/type-exercise-in-rust 1,514★ (the best auto-vectorization tutorial
  artifact); avx512-language:rust totals just **42 repos**.

### 4.2.7 crates.io long tail (7 queries, 3,871 unique crates; API caps at 1,000 rows/query)

Union: 2,904 updated in 2026; 771 SIMD-focused. **48 worthwhile crates
absent from this report** (each grep-verified absent before this round).
Tier 1 (changes recommendations — merged into §3): **simd-adler32**
 (148.5M recent DLs; AVX512/AVX2/SSSE3/SSE2+NEON+wasm runtime; vendor bench
 33.3 GiB/s; inside the **png/DEFLATE stack** via fdeflate 0.3.7,
 miniz_oxide 0.9.1, zune-inflate, zopfli, zarrs, yara-x), **matrixmultiply**
 (31.2M recent; transparent runtime SIMD microkernel GEMM — the default
 under ndarray 0.17/nalgebra 0.35/burn-ndarray), **simba** (14.8M recent;
 the SIMD-algebra substrate under nalgebra/faer/parry/rapier), **crc-fast**
 (24M recent; >100 GiB/s generic Rocksoft-model CRC-16/32/64 — "all known
 variants", up to >220× the `crc` crate; deps: aws-smithy-checksums, minio,
 object_store, uucore), **blake2b_simd/blake2s_simd** (8.6M/1.9M recent;
 100% stable Rust, dynamic SIMD; the halo2/Zcash substrate; author is a
 blake3 co-author), **archmage + archmage-macros + magetypes** (imazen,
 0.9.29, 211K recent; "write SIMD without `unsafe`" — CPU-tier tokens +
 `incant!` dispatch, `#![forbid(unsafe_code)]`-compatible, MSRV 1.89;
 adopted by **rav1d-safe** "Safe SIMD fork of rav1d"; tension: the 2026
 Shnatsel survey excludes magetypes as AI-driven), **numkong** (Ash
 Vardanian, 155.7K recent; 2,000+ kernels incl. **AMX & SME 2D registers**,
 4-bit ints/6-bit floats, x86/Arm/RISC-V/LoongArch/Power/WASM; **SimSIMD
 has been folded into NumKong in 2026** — the crates.io crate `simsimd`
 (1.46M recent) now points at NumKong's README), **smoothutf8** (created
 2026-06-25; mechanically verified against Unicode §3.9 Table 3-7; 2–5×
 faster than `core::str::from_utf8` **and simdutf8 on ≤32-byte ASCII**, the
 protobuf-field regime; `SlackBuf`/`verify_with_slack` zero-copy), **frizbee**
 (Saghen; SIMD Smith-Waterman with affine gaps — ~4× nucleo, ~5× fzf, 20× on
 unicode; used by blink.cmp, atuin, television, skim), **sonic-number**
 (2.7M recent; sonic-rs's float parsing standalone), **fast_image_resize**
 (4.5M recent; per-format SSE4.1/AVX2/NEON/wasm32 — flags a Rust 1.95/1.96
 LLVM wasm32-SIMD128 regression, rust#157456), **vello_cpu** (3.6M recent;
 the most mature Vello renderer, "optimized for multithreading and SIMD"),
 **argminmax** (2.8M recent; argmin+argmax in one pass, no-branch SIMD,
 f16/uints via bijective bitwise ordering; shipped by **polars-utils/
 polars-ops**), **gearhash** (1.16M recent; GEAR rolling hash for FastCDC
 content-defined chunking, SSE4.2/AVX2+NEON), **simd_cesu8** (32.4M recent;
 the standard JNI string path — deps jni 0.22.4, android-activity),
 **oxiblas-core** (249K recent; pure-Rust BLAS/LAPACK with a custom
 core::arch AVX2/FMA/AVX512F/NEON layer).
  Tier 2 (row-worthy): reed-solomon-simd, sliceslice, crc64fast(-nvme),
  simdutf (C++ simdutf bindings), utf16-simd, xutf, memspan, simdsieve, zlob,
  garb, zenyuv, blazediff, fast-ssim2, libjpeg-turbo-rs, rust_h265 (288K
  recent, pure-Rust HEVC Main/Main10), zrip, sonora-simd, winarm-cpufeatures
  ("fills the Windows-on-Arm gap in `is_aarch64_feature_detected!`"),
  pulp-wasm-simd-flag (9.5M recent), picosimd, erydanos.
  Tier 3 (status/verdict): packed_simd_2 (frozen 2022-06; the name
  `packed_simd2` 404s), triple_accel (2021, still the go-to SIMD edit-
  distance citation), pathfinder_geometry, fake-simd, simd_helpers, and the
  **aprender-\* family (14 crates all created 2026-04-07, 174K combined
  recent, grandiose descriptions — treat as unvetted)**.
- Squat census: effectively none (p50 of the union = 898 recent DLs; bare
  ISA-name probes all return "crate does not exist"). The genuine squat
  pattern remains the yanked 0.0.1 placeholders already in §2.10.

### 4.2.8 Zulip decision rooms (via GitHub mirrors — the archive is dead)

zulip-archive.rust-lang.org 404s on root/sitemap/all probed stream paths (its
404 handler just bounces to the auth-walled live Zulip; API is 401). The
decision content survives in GitHub cross-references:

- Rust 1.86.0 (2025-04-03): target_feature_11 — safe fns with
  `#[target_feature]` (PR #134090, veluca93; after the 2023
  stabilize-#99767/revert-#108654 whiplash).
- Rust 1.89.0 (2025-08-07): avx512 target features (PR #138940, sayantn,
  merged 2025-05-18). The decision hinged on **Intel's whitepaper dropping
  AVX10.N-256** plus compiler-team MCP #827's backward-compat strategy
  (sayantn, rust#111137 comment 2745821279, 2025-03-22) — i.e. avx512
  stability is Intel-policy-contingent; an AVX10 reversal could reopen
  surface later.
- std::simd is nightly-only with the #493→#483 blocker chain (§4.1 item 2).
- **Shnatsel, "Improving std::simd's swizzle_dyn"** (2026-06-20,
  https://shnatsel.github.io/improving-std-simd-swizzle-dyn/): swizzle_dyn's
  fast path "is selected during build-time of the standard library", so good
  performance needs `-Zbuild-std` **plus** target-cpu RUSTFLAGS that crash
  on older CPUs, and **runtime multiversioning cannot fix it** (his
  doubling-the-vector-width trick: 4× on AVX2, ~6× on a base64 prototype;
  landed as portable-simd PRs #533/#540/#542/#543/#545/#548).
- **fearless_simd 1.0** (Linebender blog 2026-09-22,
  https://linebender.org/blog/fearless-simd-1-0/): stable Rust, 3-year
  security commitment, f16/SVE/RVV planned without API breaks; positioning:
  "we would love to see std::simd stabilized, but it would not make Fearless
  SIMD obsolete". Raph Levien's earlier verdict (2025-03-29): std::simd
  "encourages a 'lowest common denominator' approach" and "does not itself
  solve the multiversion problem" — "probably best to consider it as a
  souped-up version of autovectorization". Real-world switch: PhastFT
  ported std::simd→fearless_simd to reach stable.

### 4.2.9 Academic layer (arXiv + Semantic Scholar)

- **Auto-vectorization frontier 2024-26**: **Splyce** (arXiv 2609.19410,
  Sept 2026) — MLIR vectorization of sparse coiteration via a dual-path
  execution model + **selective predication** that eliminates data-dependent
  branches as a side effect (transferable to any Rust kernel with
  data-dependent loop bounds: precompute the branch as a mask, keep both
  paths branch-free). **LLM-Vectorizer** (Microsoft, arXiv 2406.04693) —
  FSM-based mutational verification of LLM-proposed vectorized variants.
  **AutoVecCoder** (arXiv 2605.17978) — confirms explicit-vectorization
  corpus scarcity; autovec "frequently yields suboptimal results due to
  conservative static analysis" is now the academic baseline assumption.
  **Scion** (PLDI 2026, arXiv 2511.15028) — data layout decoupled from
  traversal as a first-class optimization axis.
- **RVV field reports**: Carpentieri et al. (Euromicro PDP 2025) on RVV
  autovectorization; muRISCV-NN (ACM CF 2024) — hand-written RVV beats
  autovec on embedded; "Closer in the Gap" (Euro-Par 2026). Length-agnostic
  vectors break fixed-lane assumptions — the same shape core::simd users
  face on SVE.
- **SLEEF** (arXiv 2001.09258) remains the canonical portable-SIMD
  engineering paper — the layering template wide/pulp/rten-simd/core::simd
  all follow. **UC3M's "Code Rejuvenation"** (IJPP 2025) is the closest
  studied intrinsics→portable-SIMD migration methodology — but targets
  **C++ std::simd (C++26)**, not Rust's; the axes transfer.
- **The Muła/Lemire paper canon**: simdjson (1902.08318); **"Scanning HTML
  at Tens of GB/s on ARM"** (2503.01662, 2025 — the one new survey of the
  vectorized-classification toolkit, ~20× on recent ARM); base64 at memcpy
  speed (1910.05109; AVX-512 **and** working sets beyond L1 — a benchmark-
  design caveat: working-set size changes the winner); **AVX2 popcount**
  (1611.07612 — vectorized popcount ≈2× scalar `popcnt`, adopted by
  LLVM/clang); Unicode transcoding (2109.10433); positional popcounts
  (1911.02696). Muła's arXiv corpus tops out at 2021 (the ł must be
  URL-encoded or `au:` search returns zero); newer work lives on 0x80.pl.
- **Superooptimization reality-check**: **Minotaur** (OOPSLA'24, arXiv
  2306.00229) — the SIMD synthesizing superoptimizer averages **7.3% on GMP
  / 1.5% on SPEC2017**: the verified instruction-level-search ceiling on
  already-optimized code is single-digit percent. **SuperCoder** (arXiv
  2505.11480): 8,072-program assembly benchmark; best of 23 LLMs passes
  **51.5%** of tests. Hydra (OOPSLA'24 peephole generalization); Numerical
  Superoptimization for Library Learning (arXiv 2603.24812 — output as
  "which primitives are worth implementing"); LPO (ASPLOS'26); PrediPrune
  (Souper still alive, 2025); the tensor-program line Mirage→Prism→Axon→
  EqiForge all share a two-level search pattern (symbolic family pruning,
  then concrete instantiation).
- **Rust-specific**: "Evaluating Rust for Sparse Matrix Kernels" (arXiv
  2606.19213, June 2026) — Rust SpMV/Lanczos track Eigen/PSBLAS, below
  oneMKL/PETSc: the first serious arXiv head-to-head of Rust in classic HPC
  kernel territory. MonaVec (arXiv 2606.19458) — training-free 4-bit
  quantization via Randomized Hadamard Transform conditioning, shipped as
  Rust crates. Metatheory.jl v3 benchmarks **against Rust's egg** as the
  state-of-the-art e-graph implementation.
- **SIMD hashing 2025**: Nath & Sarkar, "Vectorised Hashing Based on
  Bernstein-Rabin-Winograd Polynomials" (arXiv 2507.06490) — the c-way
  decomposition (each lane evaluates an independent chunk) as the general
  recipe for vectorizing polynomial hashes. SIMD-PAC-DB (arXiv 2603.15023):
  stochastic aggregates as SIMD-friendly bit-parallel ops, 40× over scalar,
  shipped as a DuckDB extension. PauLIB (arXiv 2605.25974): **sorted arrays
  instead of hash maps to enable branch-predictable SIMD bulk ops** — the
  data-structure-choice-to-unlock-SIMD pattern, stated crisply.

### 4.2.10 Wasm engines — primary status (features.json + Bugzilla + WebKit STP)

- The primary tracker moved: per-proposal READMEs are gone (404); the
  canonical matrix is **webassembly.org/features** = `features.json` in
  WebAssembly/website (39,465 bytes, parsed). Spec stages: fixed SIMD (WG
  2021-07-14, spec 2.0), Relaxed SIMD (WG 2024-07-10, spec 3.0), Memory64
  (WG 2025-07-23, spec 3.0); Wide Arithmetic **Phase 4, merged into no spec
  version** (champions Alex Crichton & Jamey Sharp).
- Engine matrix (features.json): fixed SIMD — Chrome 91 / Firefox 89 /
  Safari 16.4 / Node 16.4.0 / Deno 1.9 / Wasmtime 0.33 / wazero yes /
  **wasm3 no (unmaintained)**. Relaxed SIMD — Chrome 114 (V8 11.4, May
  2023), **Firefox 145** (§4.1), Node 21.0.0 (V8 11.8), Deno 1.33, Wasmtime
  15, Wasmer 7.1, **Safari: no stable release — STP 250 (2026-08-13) behind
  `useWebAssemblyRelaxedSIMD`**; wazero false. Memory64 — Chrome 133 /
  Firefox 134 / Node 24.0.0 (V8 13.6) / **Safari STP 251+ only**, with the
  measured caveat (Ben Visness, SpiderMonkey blog 2025-01-15): slowdowns
  "can range from just 10% to over 100% — a 2× slowdown just from changing
  your pointer size"; JS API caps 64-bit memories at 16 GB; "the only reason
  to use Memory64 is if you actually need more than 4 GB".
  https://spidermonkey.dev/blog/2025/01/15/is-memory64-actually-worth-using.html
- **Wide Arithmetic** (i64x2 add-with-carry / mul-wide — lets codegen use
  `adc/sbc/umulh` instead of `__multi3` sequences): implemented in
  SpiderMonkey (bug 1949081, target **150 Branch**, Nightly pref only),
  JavaScriptCore (commit 311366@main), Wasmtime, Wasmer 7.1 (**the only
  default ship**), Wasmi; toolchains: LLVM PR #111598 and **Rust
  rust-lang/rust PR #132077**; engines gate behind `--wasm-wide-arithmetic`
  (V8/Node) / `--wasm=wide-arithmetic` (Wasmtime).
  https://github.com/WebAssembly/wide-arithmetic/blob/main/proposals/wide-arithmetic/Overview.md
- Node pins verified from changelogs: 21.0.0 carries V8 11.8 (relaxed SIMD
  available; Node 20 stayed on V8 11.3 → **no relaxed SIMD on Node 20**);
  24.0.0 carries V8 13.6 (memory64).

### 4.2.11 Hardware manuals (Agner 2026-05-23 / uops.info / Dougall Johnson / Chips and Cheese)

- **Agner's manual 2 updated 2026-05-23** with full Zen 4 (ch. 24) and
  Zen 5 (ch. 25) chapters. Zen 4: "512-bit vector instructions are executed
  with a single µop using two 256-bit pipes simultaneously"; two 256-bit
  vector reads or one read+one write per clock; **one 512-bit read per clock
  and one 512-bit write per two clocks**. Zen 5 desktop/server: "full 512
  bit data width in all vector execution units, **except memory write
  instructions which have 256 bit width**. Mobile processors have 256 bits
  data width so that 512 bit vector instructions execute at half the
  throughput on mobile" — i.e. **Strix Point/mobile Zen 5 double-pumps**;
  FP register file 384×512-bit; FP-add latency cut 3→2; no vector
  instruction has effective 1-cycle latency; two 32 B/cycle decoders
  (previous AMD+Intel bottleneck: 16 B/clock); 512-bit write = two 256-bit
  ops; AVX-512 compares 3/4/6 c at 128/256/512-bit.
- **uops.info measured deltas** (18 forms × ~15 µarchs): 512-bit FMA
  VFMADD231PS zmm — Zen 4 tp 1.00 vs Zen 5/EMR tp 0.50. VPERMD ymm —
  **Zen 4/5 lat 4 tp 0.50 (full rate!)** vs Zen 3 tp 1.17-1.33, Zen 2
  tp 2.00, Intel P lat 3 tp 1.00, Gracemont/Crestmont lat 6 tp 2.00,
  Skymont tp 1.00; VPERMD zmm — Zen 5 tp 0.50 vs Zen 4/EMR 1.00. VPSHUFB
  ymm — Zen 4/5 lat **2** (Zen 2/3 were 1) tp 0.50; Skymont lat 1 tp 1.00.
  VHADDPS ymm — **tp 2.00 on Zen 4/5 and Intel; 3.16-3.63 on E-cores; Lion
  Cove best at 1.50 — horizontal ops never beat ~1.5-2 c**. Loads: Intel P
  tp 0.33 (3×256-bit/cycle); Zen 2-5 tp 0.50; 512-bit Zen 5/Intel 0.50 vs
  Zen 4 1.00. No Arrow-Lake-P AVX-512 data exists (fused off); no Zen 5-
  mobile column (Agner-only). E-core FMA caught up: Skymont lat 4/tp 0.50 =
  P-core (Gracemont/Crestmont were 6/1.00).
- **Dougall Johnson (Apple, M1/A14 only — see §4.1 item 7)**: cross-lane
  NEON shuffles are **near-free on Apple** — TBL (1- and 2-register), TBX
  (1-reg), ZIP1/2, UZP1/2, TRN1/2, EXT, REV64/32 all latency 2, tp 0.25
  (4/cycle) on Firestorm; Icestorm identical latency at exactly half
  throughput. FP: FADD 3c, FMUL/FMLA/FCMLA 4c (all widths incl. FP16),
  SDOT/UDOT 3c, FDIV.4s lat 8 tp 1, FSQRT.4s lat 10 tp 2; AESE 3c tp 0.25
  with AESE+AESMC **fusing to 2 µops at unchanged throughput**. Load-use 4c
  to ALU (3c to another load's base; +1c shift-indexed; LDP's second
  register always 4c); 3 loads/cycle P / 2 E. AMX dispatches on the
  load/store units (Firestorm units 7/8, Icestorm unit 4 — E-cores have AMX
  too); consecutive AMX ops fuse.
- **Chips and Cheese**: "Zen 5's AVX-512 Frequency Behavior" (2025-03-01) —
  no sharp downclock; instead IPC throttling (FP NSQ full up to ~10% of
  cycles) with gradual ~150-600 MHz backoff on memory-operand-heavy 512-bit
  code. "Lion Cove" (2024-09-27) — vector side "very closely resembles
  AMD's going back to Zen 1"; denormal-FP-mul 132c (RWC 124c) vs fast paths
  on Zen/Skymont; consumer Lion Cove has no AVX-512. "Skymont" (2024-10-03)
  — E-core vector units are **128-bit; 256-bit AVX2 executes as two µops**
  (a 256-bit result occupies two 128-bit scheduler entries, halving
  effective capacity for AVX2 code); FADD 2c, FMUL 3, FMA 4; denormal mul
  3.35/cyc ≈ FTZ rate (Crestmont: 1 per 283.67 c).

### 4.2.12 Benchmarks and folklore (benchmarks-game, AoC, war stories)

- **benchmarks-game Rust entries still carry three distinct trick
  families** (salsa.debian.org, fetched via GitLab API): fannkuchredux-rust-6
  — each 16-element permutation as a **u128 of nibbles**, reversed/rotated
  with one `_mm_shuffle_epi8` via precomputed 16-entry u128 mask tables,
  indexed by `_mm_extract_epi8`; fasta-rust-7 — **SIMD alias-method CDF
  lookup**: `_mm_set1_epi32` needle, `_mm_cmplt_epi32` against four loaded
  cumulative-probability vectors, survivors counted by subtracting masks
  from a zero vector (0−(−1)=1), horizontal sum via `_mm_extract_epi32`,
  `#[cfg(target_feature="sse2")]` scalar fallback; mandelbrot-rust-4 — the
  **autovec-bait struct**: `#[repr(align(32))] struct F64x8([f64;8])` with
  macro-generated ops and `splat()`, zero intrinsics; mandelbrot-rust-6 —
  packed f64x2 pairs with a manual `vec_nle` early-exit.
- **indiv0/aoc-fastest** — Rust Discord speedrun: all 49 AoC 2024 problems
  in **988,936 ns total** (Ryzen 5950X pinned 3.4 GHz boost-off, I/O
  excluded); D17P2 at **1 ns** via LUT+inline asm. Technique bundle: LUTs
  that generalize, assertions as optimizer hints, "more-than-questionable
  unsafe". https://github.com/indiv0/aoc-fastest
- **ameobea's AoC 2024 D9P2 write-up** (139.1 ms → 23.28 µs):
  portable-SIMD `u8x32` digit parse via `splat(48)` + `deinterleave`;
  `simd_ge + mask.first_set()` was a *regression*; `#[repr(align(16))]
  MiniVec` with u16 fields transmuted pairwise to `[u16;16]` for `vpaddw`;
  page-aligned input; sentinel-poisoning instead of pop_front; closed-form
  checksum with a triangular-sum LUT; znver4 emits `vpmovwb` where znver3
  emits uglier shuffles. https://cprimozic.net/blog/optimizing-advent-of-code-2024/
- **jsgroth (2026-09-09)**: the measured Rust-1.98 story — an f32 dot fold
  stayed scalar SSE until `algebraic_add/algebraic_mul`, then auto-
  vectorized, and with `#[target_feature("avx2,fma")]` emitted 256-bit
  `vfmadd231ps` "with no code changes"; **the algebraic autovec beat the
  author's hand-written AVX2 intrinsics (which had a single accumulator)**.
  https://jsgroth.dev/blog/posts/trying-to-make-a-loop-auto-vectorize/
- **Ragnar Groot Koerkamp's 1BRC in Rust** (105 s → 1.05 s, ~12 GB/s):
  one 32-byte AVX2 compare per line → `vpmovmskb` + `tzcnt` offsets,
  branchless (branch misses 148M→4M); `vpmaxud` min/max via negated max;
  **PDEP digit parsing (with a shift/mask fallback — PDEP is ~18 cycles of
  microcode on Zen 1/2)**; single-multiplication SWAR temperature parse;
  PtrHash minimal perfect hash instead of HashMap; 4-way ILP interleaving
  (IPC 2.2→2.95). https://curiouscoding.nl/posts/1brc/
- **Cranelift status**: rustc_codegen_cranelift **still does not fully
  support std::arch** — issue #171 open, updated 2026-09-30:
  `rust_xlsxwriter 0.99` panics under cargo-clif on
  `llvm.x86.pclmulqdq.256 is not yet supported` (2026-09-14);
  `llvm.aarch64.neon.sqxtn.v4i16` fails on AArch64 (2026-07-04). README:
  std::simd fully works, std::arch partially. Companion perf cliff:
  wasmtime#7085 — two semantically identical source orderings differed ~4×
  (0.615 s vs 2.395 s) because Cranelift never vectorized the second.
  https://github.com/rust-lang/rustc_codegen_cranelift/issues/171
- Counter-lore from Japan: @kanryu's "I accidentally built the world's
  strongest Wasm compiler" (Qiita 2026-09-09, 284 likes) — a Go-like
  language with an **LLVM backend chosen specifically for its vectorization
  passes**, 2.56 KB self-hosted wasm binaries.
- HN folklore from the state-of-SIMD thread (49844629): Archit3ch — "there
  is no portable SIMD … what so-called portable SIMD libraries give you is
  portable auto-vectorization"; Sharlin — "Getting 2x or 4x in your inner
  loops using a reasonable SIMD library is infinitely better than
  theoretically getting 8x with hand-coded nonportable intrinsics, because
  the latter is never going to happen in most programs."

## 4.3 Techniques harvested into the skills this round

1. Compress/left-pack cookbook (pdep/pext+vpermd, per-width constants,
   pre-Zen3 trap, vpcompress-to-register rule, popcnt pointer advance) —
   Peter Cordes. → rust-simd-kernels/intrinsics.md
2. Shuffle/port economics (single port-5 shuffle unit on Intel, in-lane vs
   lane-crossing, overlapping loads as shuffles, vprolq-32 on ports 0/1,
   vpblendvb µop asymmetry) — Cordes. → intrinsics.md
3. NEON PMOVMSKB substitution sequences — Langdale. → intrinsics.md
4. Bits-to-indexes mask compaction (BMI2 PDEP/PEXT + AVX-512 compress/
   expand) — Langdale. → intrinsics.md
5. x86 integer-multiply ladder + Intel-Intrinsics-Guide-is-incomplete —
   mod_poppo. → intrinsics.md
6. Horizontal-reduction rules (never hsum in a loop; multiple accumulators;
   psadbw widening) — Cordes. → intrinsics.md + autovectorization.md
7. Measured per-µarch latency/throughput table (FMA/VPERMD/VPSHUFB/VHADDPS/
   loads across Zen 2-5/ICL-EMR/ADL-ARL P+E, Apple Firestorm/Icestorm) —
   uops.info/Agner/Dougall Johnson. → new references/hardware-costs.md
8. "Wider is slower" hazard + diagnosis recipe (Piledriver AVX stores) —
   t/17315 + Agner blog 285. → autovectorization.md
9. LLVM `-C llvm-args` knob list + 2025-26 vectorizer changes (early-exit,
   tail-fold default on RISC-V, epilogue vectorization, SLP FMA, FP ordered
   reductions per-target) — Vectorizers.md/LoopVectorize.cpp. →
   autovectorization.md
10. Search loops never autovectorize → manual chunk + branchless; keep
    conditionals select-shaped — Cordes/yugr. → autovectorization.md
11. Silent non-inline diagnostic for #[target_feature] wrappers — Cordes +
    rust#83027/#83084. → autovectorization.md
12. Kernel patterns: SIMD CDF/alias-table lookup, u128-nibble pshufb
    permutation tables, autovec-bait aligned struct, sign-bit+popcnt
    membership, IEEE-754 exponent-trick conversion, six rolling-indicator
    kernel shapes, two-contiguous-slices-not-ring-copy, hot/cold state
    split — benchmarks-game/yua134/0xItsss. → intrinsics.md + SKILL.md
13. Criterion CI gates on confidence intervals, not means (thermal
    downclocking masquerades as regression) — 0xItsss. →
    rust-superopt/measurement.md
14. Superooptimization academic reality check (Minotaur single-digit %,
    SuperCoder 51.5% LLM pass) — arXiv. → rust-superopt/codegen-tooling.md
15. L1 set/way aliasing math + SoA-in-vector-groups hybrid layout — Cordes.
    → rust-parallel-cache/SKILL.md
16. swizzle_dyn `-Zbuild-std` trap + the real portable_simd blocker chain
    (#493→#483) — Shnatsel/Zulip-mirrors. → portable-simd.md
17. archmage/magetypes safe-intrinsics dispatch + packed_simd_2 rename +
    numkong AMX/SME — crates.io hunters. → portable-simd.md +
    rust-simd-crates
18. evex512/no-negative-target-features gap + detection-cost atomic-load +
    prefer-256-bit warns-but-works — Discourse. → stability-matrix.md
19. Wasm matrix settlements (Firefox 145; Safari STP-250-only; memory64
    10-100% penalty; wide-arithmetic Phase 4 with Rust PR #132077) —
    Bugzilla/features.json. → stability-matrix.md + release-flags.md
20. 48 crates merged into §3 and the crates sub-skill references —
    crates.io hunter. → §3 + rust-simd-crates

## 4.4 Crate-table merge (spliced into §3 above)

Rows edited in place: **Checksums** (+crc-fast, +crc64fast-nvme, +simd-
adler32-as-PNG-stack-fact), **Crypto hashing** (+blake2b_simd/blake2s_simd),
**UTF-8 validation** (+smoothutf8, +simd_cesu8), **JSON** (+sonic-number),
**Linear algebra** (+matrixmultiply, +simba), **Image codecs**
(+fast_image_resize), **Vector search** (+frizbee), **Explicit portable
vectors** (+archmage), **Data-frame engines** (+argminmax). New rows:
**Fuzzy/approximate string search**, **Content-defined chunking**, **argmin/
argmax**. Verdict updates in the do-not-recommend list: `packed_simd_2`
(frozen 2022; the `packed_simd2` name 404s) and the `aprender-*` family
(unvetted same-day workspace); `safe_arch` reclassified as alive-and-
deliberate (fine as wide's substrate, wrong for app code).

Fleet-caliber adoption evidence added to the crates sub-skill: fearless_simd
direct in mullvadvpn-app/vello_cpu/blitz/ntsc-rs/hayro; wide direct in
kornia-rs and Anki's fsrs-rs; pulp in elodin and adobe/trustmark; argminmax
shipped by Polars; simd-adler32 inside the png stack; matrixmultiply under
ndarray. Discovery note: awesome-rust and awesome-simd list **zero** of the
modern SIMD crates — the live channel is the GitHub topic-sort=updated
query.

---

# Round 5: production war stories (2026-09-30)

Ten war-story hunters swept the industry blogosphere (Cloudflare seed-post deep
dive + archive sitemap sweep, plus nine channels: editors/tooling, databases,
services, network stacks/runtimes, allocators, media SIMD, low-reach HN/personal
blogs, benchmark methodology, cache design, kernel/syscall boundary). Method
per hunter: RSS-first, sitemap enumeration where feeds truncate (Cloudflare's
RSS carries only 20 items; the full 3,623-English-slug inventory came from
`sitemap-posts.xml`), Wayback `id_` snapshots for dead URLs (GitHub's Blackbird
post now 404s live), HN Algolia for discovery, crates.io API for deployment
counts. Every performance number below is **vendor-/author-reported** — no
hunter reproduced any of them — except where explicitly marked *third-party*.
Hunter-verified arithmetic is marked as such. This round's product: the
per-company technique record (§5.1–§5.10), the cross-cutting transferable-
techniques table (§5.11), the negative results (§5.12), and the skill harvest
(§5.13).

## 5.1 Cloudflare — the memory-layout canon at fleet scale

### 5.1.1 The seed post: 1.1.1.1's DNS cache (Big Pineapple), 2026-08-27

Scale premise: >250 billion cache entries fleet-wide, so 1 wasted byte/entry =
250 GB (hunter-verified: 1 B × 250e9 = 250 GB). Five purely layout-level
changes, all vendor-reported:

| # | Change | Effect |
|---|---|---|
| 1 | `Vec<T>`/`String` → `Box<[T]>`/`Box<str>` for write-once fields (8 fields × 8 B capacity word + growth slack) | 64 B/entry, >15 TB fleet (64 × 250e9 = 16.0 TB, hunter-verified) |
| 2 | Merge answer/authority/additional lists into one list + two `u16` section offsets; pack booleans into one `bitflags` | 28 B/entry for the merge (2×16 B − 2×2 B, verified); padding collapse made the bitflags shrink the struct by *more* than the bools' size |
| 3 | Key-derived field elision: `owner: Option<Box<Name>>`, `None` = "owner == qname", reconstruct from the cache key at read time | avoids a heap allocation for most records |
| 4 | Box only the rare-huge `RecordData` variants (NAPTR 136 B → enum 144 B w/ tag; A=4 B, AAAA=16 B are >80% of traffic) | ~120 B saved per A/AAAA record; costs jemalloc size-class rounding + pointer-chasing locality — stated honestly as an intermediate step |
| 5 | Store RDATA as raw wire-format bytes in one `Box<[u8]>` (2-byte length prefixes), built via a reusable scratch buffer + single allocation + memcpy; A/AAAA/TXT/DNSSEC copy verbatim into responses, only name-bearing types (CNAME/NS/MX/SOA) re-parse for RFC 1035 compression | this change alone: **−5% lookup latency, +13% insert throughput** |

Aggregate (vendor-reported benchmark, 56% A / 25% AAAA / 19% TXT mix, jemalloc):
per-entry footprint **953 → 420 B (−56%)**; per-entry allocations 1.1 KB → 461 B;
insert throughput **625k → 893k entries/s (+43%)**; lookup latency
**828 → 670 ns (−19%)**. Production (staged rollout 2026-05-18 → 2026-07-06):
per-instance resident memory p99 **9.3 → 5.3 GB (−43%)**, p90 6.5 → 3.8 GB.
Fleet working set ~100 TB lower — internally consistent with 130 Gen 13
servers × 768 GB RAM = 99.84 TB (hunter-verified multiplication; RAM figure
from the Gen 13 post). Benchmark ceiling cross-check: (953−420) × 250e9 =
133 TB vs ~100 TB production — consistent, since production includes
non-cache process data (hunter arithmetic).

Measurement methodology (the most reusable artifact): a custom `GlobalAlloc`
wrapper around `System` recording allocations+bytes per cache entry; paired
insert-throughput/lookup-latency benchmarks so space wins can't hide speed
losses; a synthetic calibrated to the production traffic mix; production
validation via p90/p98/p99 resident memory read at **steady-state plateaus,
not post-restart dips**, across a staged rollout. Rejected alternative: caching
the full DNS wire response and patching per-client fields fails because
DNSSEC records are conditional on the client's DO flag.

One-hop context (Big Pineapple intro, 2022 — may not reflect the 2026
codebase): Rust + tokio with work stealing; cache replaced LMDB with an
**adaptive replacement cache (ARC)**; queries **consistently hashed onto
healthy peer nodes by registered domain**; oDoH HPKE delegated to host calls
gave 4× over computing inside Wasm. Gaps the seed post does not close: no
hash-table design detail, no arena/shm allocator, eviction only qualitative.

### 5.1.2 Pingora (the Rust proxy stack)

- **Why nginx broke** (2022 intro, vendor): per-worker process pinning →
  unbalanced cores; **connection pools are per-worker, so the reuse ratio
  degrades as you add workers** → more TCP/TLS handshakes → worse TTFB.
  Pingora: multithreading with work stealing (Tokio) so pools and shared state
  span all threads; shared items via atomically refcounted references instead
  of mutex-guarded shared memory. Numbers: >1T requests/day, ~70% less CPU and
  67% less memory vs the old service, TTFB −5 ms median / −80 ms p95
  (attributed to better connection reuse), one customer's connection reuse
  87.1% → 99.92% (new origin connections −160×), zero service-code crashes
  since inception. Open-sourced 2024 (Apache 2.0), "nearly a quadrillion
  requests" since.
- **trie-hard** (2024): one hot function (`clear_internal_headers`,
  ~100 internal headers stripped per outbound request) cost 1.71% of
  pingora-origin CPU — at 35M req/s = 40,000 compute-cores, that is 680
  dedicated cores. Technique chain: **invert the iteration direction**
  (iterate the request's 10–30 headers, not the 100+ internal-header list):
  3.65 → 1.53 µs; std HashMap 0.82% CPU; custom trie (one contiguous memory
  chunk, node relationships in bits of unsigned integers): 0.93 µs / 0.34% CPU.
  The validation loop is the transferable part: **predict CPU% from criterion
  ratios, then verify by statistical stack-trace sampling in production**
  (predicted 0.43%, measured 0.34%).
- **pingora-limits** (2023): lock-free **count-min sketch** for inflight-event
  counting / rate estimation replacing `Mutex<HashMap>` — vendor benchmark
  (M1 VM, 1M keys, 100M events): single-thread **10 ns/event vs 51 ns
  (Mutex<HashMap>) vs 43 ns (DashMap)**; 8 threads 212 ns vs 1505 ns vs 212 ns;
  peak memory 26 KB vs 53 MB vs 36 MB (1/2000 and 1/1300). Tuned so two
  unrelated customers collide ~1/2^52. Pattern: probabilistic first-stage
  filter feeding an exact structure only above threshold.
- **Saving another 100TB of RAM with math** (2026-09-18, Pingora Backend
  Router): ketama rings multiplied per feature-combination subset (up to
  6 GB/box). Fix 1: pack the (u32 hash, u32 index) point to **6 bytes with a
  u16 index stored as a raw byte array** + `from_ne_bytes` getters — Rust
  alignment pads a u16-containing struct back to 8 B, so the byte-array form
  is `#[repr(packed)]` semantics without the UB (−25% ring memory). Fix 2:
  **cut hashes/server 90%** using the derived coefficient of variation
  CV = √((N−1)/(Nk+1)) — with disk-size weights multiplying the base
  (weight 625 → k=100,000 hashes/server), the last 90,000 hashes buy only
  ~0.7% error, while 32-bit birthday-paradox collisions *add* error between
  10k–100k hashes/server at 2,048 servers/DC. Fewer hashes = less error AND
  less memory. Rollout craft: dual v1/v2 rings resident, per-request
  hash-stable ring selection (clean rollback), datacenter-layered rollout to
  bound cache-churn blast radius. Net: −100 TB globally; shipped in the
  open-source pingora-ketama crate behind a `v2` feature.
- **ecdysis** (2026-02): graceful-restart library, 5 years in production,
  330+ DCs — parent fork()s, child execve()s a fresh binary, listening-socket
  fds inherited via a named pipe, child signals readiness, parent drains.
  Explicitly rejects SO_REUSEPORT (the kernel can assign a SYN to a process
  that exits before accept() → orphaned connection). Tokio + systemd
  (Type=notify-reload) integrations.
- **Cache Transcoding** (2026-09): zstd-3 inside the Pingora cache,
  compressed form persists on disk and across tiered-cache hops, decode only
  on the client-facing hop; measured 2.834× on a controlled corpus, encode
  4.31 ns/B paid once per fill, decode 1.56 ns/B paid per serve; restricting
  to hot assets performed *worse* (decode dominates).

### 5.1.3 WAF / wirefilter

- **Memoization** (2020): cache transformation chains keyed on
  function+args; hit rate 56% → 74%; average WAF processing time −40%
  (comparable p95/p99 drops), edge CPU −4.3%. Prefiltering with cheap
  `contains()` byte checks skips whole rules. 2019 PCRE→RE2/DFA migration:
  no average CPU change but linear-time guarantees killed p95/p99 outliers.
- **WAF ML** (2024): 1519 → 275 µs end-to-end (−82%, 5.5×). Ladder: TFLite
  rebuilt `-march=x86-64-v3` (AVX2+FMA, 1.89×); TFLite 2.16 + XNNPACK
  (4.38× cumulative); preprocessing: HashMap lookups → Aho-Corasick
  (1.44–1.71×) → plain `match` on 3-byte ngrams letting rustc emit a jump
  table (1.94–2.20×) → **branchless ngram lookup: offset tables over
  distinct-byte remapping, ~500 KiB total, L2/L3-resident (5.66–12.09×)**;
  LRU cache of inferences keyed on inputs (~70% hit ratio, −50% more). At
  9.5M req/s the 1244 µs/req saved ≈ 32 years of processing per day.
- **wirefilter** (2019): one Rust rules engine embedded in both the Go REST
  API (save-time validation) and the Lua/nginx edge (request-time matching) —
  dual implementations would diverge into "inconsistencies that attackers may
  be able to exploit".
- **Worker sharding** (2025): consistent-hash each Worker onto a home shard
  server (the same ring data structure the HTTP cache uses); refusals handled
  with a Cap'n Proto lazy capability to avoid the RPC trombone. Only **4% of
  enterprise requests were sharded** after full rollout, yet the global Worker
  **eviction rate fell 10×** and the warm-request rate went 99.9% → 99.99%,
  at <1 ms TTFB added — the power-law leverage of sharding only the
  low-traffic tail. Framing worth stealing: eviction rate is memory pressure,
  "garbage collection at a macro level".

### 5.1.4 Datapath / kernel

- **XDP packet-drop ladder** (2018, single CPU, 14 Mpps UDP flood, turbo
  disabled so stddev is ±0.25%): userspace recvmmsg ~175 kpps → conntrack
  disabled ~333 kpps (470 w/ SO_BUSY_POLL) → classic BPF socket filter
  512 kpps → iptables filter DROP 606 kpps → iptables raw PREROUTING
  1.688 Mpps → nftables ingress 1.53 Mpps → **XDP_DROP 10.1+ Mpps** (runs in
  driver context, before skbuff allocation). L4Drop production (2019): one
  server dropped >8M pps with total CPU up only ~10% while packet rate grew
  40×.
- **BPF LPM trie** (2025): at 10K entries — lookup 134.7 ns, update 378 ns,
  delete 1,405 ns, free 1.743 ms/entry; the lookup bottleneck shifts from L1
  dcache misses to **dTLB misses around 80K entries** (per-node kernel-
  freelist allocation scatters nodes; 2-child nodes defeat multibit compares;
  no level compression unlike fib_trie.c). Root cause of production soft
  lockups (frees pinning a CPU >10 s).
- **TCP**: per-route `initrwnd` patch let the receive window hit 1 MiB in the
  first ACK vs ~six RTTs of autotuning ramp (2022); high-BDP tuning
  (tcp_rmem/wmem max 512 MiB, `tcp_adv_win_scale=-2`, collapse capped at
  6 MiB, `tcp_notsent_lowat=131072`) took WAN throughput 24–32× (2023);
  the TCP receive-buffer unbounded-memory bug (window only grows, never
  shrinks) fixed by RFC 7323 shrinking in kernel 6.5 (2023); connect() port
  parity (even/odd scan) made odd-port connects ~180× slower until kernel
  6.8 commit 207184853dbd (2024).
- **QUIC**: the CUBIC idle-epoch port bug (2026) — `bytes_in_flight == 0`
  conflates app-idle with window-limited drain; 3-line fix after weeks of
  qlog analysis. CWND-aware packet-number skipping (skip = 2× initial cwnd +
  random scaled to cwnd) defends optimistic-ACK attacks (CVE-2025-4820).

### 5.1.5 Negative results (Cloudflare)

- **No zlib-rs adoption post exists** — verified against the full 3,623-URL
  English sitemap, HN Algolia, Trifecta Tech Foundation's own zlib-rs posts
  (zero Cloudflare mentions), and the cloudflare/zlib GitHub repo (not
  archived, no deprecation notice, last push 2026-04-24). Their documented
  zlib story remains the 2015 C fork ("cloudflare-fights-cancer": CRC32-as-
  hash-function, PCLMULQDQ, SIMD window rolling; level-9 2–7.5× faster than
  stock zlib).
- **No SIMD-quiche post, no "ScalpR"** (the name could not be verified to
  exist anywhere), no V8-isolate memory deep-dive (workerd + the sharding
  post are the closest), no IRQ/RSS-tuning post.

## 5.2 Editors and tooling: Zed, Astral, Warp

**Zed** (all vendor-reported; numbers verified verbatim in raw HTML):
- **Rope + SumTree**: B+ tree with per-item summaries (`TextSummary`) cached
  at every node — seek along one dimension while accumulating another in
  O(log N); Arc'd nodes make snapshots a refcount bump (background
  re-parse/async save with no text copy).
- **Bitmask chunks**: each 128-byte chunk carries parallel `u128` bitmasks
  (`chars`, `chars_utf16`, `newlines`, `tabs`); coordinate conversion becomes
  mask + `count_ones()` + `leading_zeros()`. Criterion micro: **57.0 →
  1.05 ns (57×)**; production `point_to_offset` "up to 70%" faster,
  throughput up 250%. The spread is the lesson: micro wins decay at macro
  scale.
- **Project search** (latency-vs-throughput): first-match latency collapsed
  **16.8 s → 32 ms (~524×)** on the Rust compiler repo by adding
  `select_biased!` poll ordering so rare "confirm all matches" tasks preempt
  cheap "file has no match" scans — total time roughly unchanged (16.8 →
  13.96 s; ripgrep 10.5 s). Same regex crate as ripgrep; they explicitly
  refuse hand-written SIMD.
- **120 fps**: frames rendered <4 ms still hitched until present scheduling
  was fixed (`wait_until_scheduled`, then `present_drawable`+`commit`,
  triple-buffered instance buffers, and a 1 s CADisplayLink keep-alive so the
  panel doesn't downclock).
- **git blame beachball**: one git process per open file (257 simultaneous
  processes) + a QoS priority inversion turned a 5 ms main-thread budget into
  a 4,550 ms stall. Fixed v0.133.7.

**Astral**: Ruff's hand-written recursive-descent parser (replacing LALRPOP)
is >2× faster, whole-program lint/format 20–40% faster (cpython lint 134.6 →
94.4 ms); formatter >30× faster than Black on Zulip's 250k LOC (0.10 s vs
17.77 s, caching disabled). Independent third-party measurement
(pythonspeed.com, i7-12700K HT/turbo off, 120k LOC): Ruff 0.2 s wall vs
Flake8+bugbear 23.3 s vs PyLint 14.0 s — with the honest caveat that
flake8's wall-clock gap shrinks under parallelism. **uv**: 8–10× pip cold,
80–115× warm; the warm win is architectural — one global module cache whose
entries are linked into projects via **hardlinks / Copy-on-Write reflinks**
(near-zero-copy installs), plus PubGrub and a static binary.

**Warp**: circular-buffer row grids where scrolling moves no memory (bump
`bottom_row`, overwrite one row; rows allocated in 1,000-row chunks); glyph
atlas bounded to 3 sub-pixel alignments. **No benchmark numbers published
anywhere in six engineering posts** — architecture only.

## 5.3 Databases and search: quickwit/tantivy, TiKV, Turso, Greptime, Databend, Meilisearch

All vendor-reported unless marked.

- **quickwit, "When allocating unused memory boosts performance by 2x"**
  (2024): a term-aggregation benchmark ran 700 MB/s when a dead 1M-element
  `Vec<u32>` was allocated first, 350 MB/s without. Diagnosis chain worth
  teaching: perf flamegraph → 30% of time in page faults inside hashbrown's
  `resize_inner` → `strace -e trace=mmap,munmap,mremap,brk` → glibc's
  **dynamic mmap threshold** rises to the largest freed block (max 4 MB) and
  trim threshold follows at 2×; the dead 4 MB allocation ratchets
  `M_TRIM_THRESHOLD` so the steady-state loop issues zero syscalls.
  Reproduction without the vec: `MALLOC_MMAP_THRESHOLD_=4000000
  MALLOC_TRIM_THRESHOLD_=-1`. Transferable: **HashMap resize copies into
  freshly mmap'd (unmapped) pages while Vec growth gets mremap** — so
  `HashMap::with_capacity` matters far more than `Vec::with_capacity`;
  page-fault hotspots on anonymous mmaps are an allocator-behavior signal.
- **tantivy branchless binary search** (2021): `seek()` was 73.6% of
  intersection-query time. std `binary_search` became branchy in Rust 1.25
  (issues #53823/#57935); the fix types the block as `&[u32; 128]` (not a
  slice) and tracks `(start, len)` — LLVM unrolls to exactly 7 comparisons,
  removes bounds checks, emits CMOVs (~9.55 cycles estimated in uiCA vs
  26.29 for a branchless SSE2 linear search). Measured: seek microbench p90
  −35%; AND queries 10% faster on average. Tantivy ships `get_unchecked`
  because rustc codegen quality isn't stable across versions; a `(start,len)`
  loop compiled perfectly while an equivalent `Range` version got none of it.
- **GreptimeDB**: borrowing `&str` directly from all four Arrow string
  layouts (`StringArray`/`LargeStringArray`/`StringViewArray`/
  `DictionaryArray<UInt32Type>`) + allocating per-series instead of per-row
  took RecordBatch→TimeSeries conversion **1.8M → 9.6–34.8M rows/s (4–16×)**;
  the dictionary path had run 35% *slower* than plain strings because the
  generic fallback called `to_string()` per row. Pending Rows Batcher:
  moving row→column conversion **out of the Region worker's `&mut` critical
  section** → Prometheus Remote Write 1.20M → 2.17M points/s (+80%) at −20%
  Datanode CPU. Ingestion-protocol benchmark: ~37× spread across 7 protocols
  (Arrow Flight DoPut 2.68M rows/s vs MySQL INSERT ~72k at batch=1000).
- **TiKV**: Follower Read (26 lines of client code, Raft ReadIndex) —
  cross-DC 1,000-scan-keys case 31 QPS (leader, p99 34.7 s) → 446 QPS
  (follower, p99 2.65 s). Raftstore is single-threaded per store; when its
  CPU saturates, propose-wait reaches hundreds of ms — the Grafana threshold
  rule (store-pool CPU < pool-size × 85%) is the transferable operational
  gauge. Lease read uses the **raw monotonic clock** because NTP can slew the
  monotonic clock's rate.
- **Turso/Limbo**: async `sqlite3_step` over io_uring; schema parsed once and
  shared via `Arc` with **`Arc::make_mut` copy-on-write mutation** →
  connection open **23 ms → 40 µs** regardless of table count (10k tables);
  vendor microbench `SELECT ... LIMIT 1`: 506 ns vs SQLite's 620 ns.
- **Meilisearch**: (a) the allocator story — apparent "leaks" were LMDB (C)
  and the Rust global allocator not cooperating; **unifying via LD_PRELOAD
  jemalloc (verified with `nm` that malloc resolves to `mi_malloc` when
  mimalloc is preloaded) made RSS growth disappear**; adopted mimalloc v3
  with perf swings −9%/+13%. (b) vector store 3× faster by patching LMDB for
  nested read transactions over uncommitted writes — eliminating a full scan
  whose every page polluted the disk page cache. (c) chunk-based indexing
  (4 MiB grenad temp files) + diff-indexing since v1.6 after 2022 OOMs.
- **Databend**: aggregate hash table with a **pointer array (`Vec<u64>` of
  salt u16 + pointer u48) over 256 KB payload pages** — salt pre-comparison
  short-circuits key compares, **resize rebuilds only the pointer array**
  (payload never moves), vectorized probe/state combination: TPC-H-style
  Q33 −61%, Q19 −56% on a 12-core box.

## 5.4 Services: Discord, Figma, GitHub Blackbird, Sentry, Vector, Polar Signals

All vendor-reported except where marked.

- **Discord, Go→Rust (2020)**: latency+CPU spikes every ~2 minutes because Go
  forces a GC at least every 2 min and the collector had to **scan the entire
  LRU cache**; shrinking the cache made spikes smaller but worsened p99 (more
  DB loads). The Rust rewrite (BTreeMap, fewer copies) beat the hand-tuned Go
  version on latency, CPU, and memory, then raised the cache to 8M read
  states with microsecond averages. The transferable law: **a GC that scans
  large long-lived structures couples cache size to tail latency**.
- **Discord, trillions of messages (2023)**: Rust migrator written in an
  afternoon (vs ScyllaDB's 3-month Spark estimate) sustained 3.2M
  messages/s; 177 Cassandra → 72 ScyllaDB nodes; read p99 40–125 → 15 ms,
  write p99 5–70 → 5 ms. Their Rust "data services" do **request coalescing**
  (first requester spawns a worker task; followers subscribe to the same
  in-flight future) to shield hot partitions.
- **Figma**: per-node property `HashMap` was >60% of file memory → flat
  sorted `Vec<(u16, pointer)>` (O(n) insert, cache-friendly deserialize):
  −25% memory for large files, −20% p99 deserialization, −20% fleet memory.
  Honest-measurement lesson: a `Vec<u64>` layout that promised 20% more
  savings delivered ~5% — **RSS ≠ allocated memory; measure resident size,
  not theoretical layout size**. Earlier: Rust child process per document
  (serialization >10× faster); the multiplayer model is centralized
  last-writer-wins with the server defining order — CRDT machinery
  deliberately dropped.
- **GitHub Blackbird (2023; live URL 404s, read via Wayback)**: 115 TB of
  code, 15.5B documents. Napkin math for grep: 2,048 cores at ripgrep's
  0.6 GB/s/core → 0.01 QPS. Index design: **shard by Git blob object ID**
  (even distribution, natural dedup: 115 TB → 28 TB unique → 25 TB index
  incl. a compressed content copy); **delta indexing** — repositories
  crawled by diffing against a delta-tree parent, ingest order chosen by a
  "geometric filter" (MinHash/HLL-class set similarity) + **approximate
  minimum-spanning-tree over a repo-similarity graph** computed in minutes
  (~90% of the delta-compression benefit); ngram choice: **dynamic sparse
  grams** (bigrams insufficiently selective, quadgrams too big, follow-masks
  saturate). Kafka partition-per-shard gives commit-level query consistency.
  Query path: shard p99 ~100 ms pinning one core → ~640 QPS per 64-core
  host; ingest ~120k docs/s → ~18 h full re-index.
- **Sentry Symbolicator** — the LTO/PGO/BOLT ladder, **third-party-measured**
  (community benchmark in getsentry/symbolicator#1334, Ryzen 9 5900X, wrk,
  linux.dmp, turbo disabled): release 2,685.8 req/s → +LTO 3,106.2 (+15.7%)
  → +PGO (cargo-pgo) 3,644.6 (+35.6%) → +LLVM BOLT 3,897.9 (+45.1%).
  **Sentry's own production result (vendor-reported): shipping 1CGU+LTO
  produced no visible CPU reduction** — "I expected to see some
  improvements… there was nothing." IO-bound services eat CPU-opt wins;
  microbenchmark +45% ≠ production CPU.
- **Vector**: Adaptive Request Concurrency = an **AIMD loop out of TCP
  congestion control** (linear increase on flat RTT/2xx, multiplicative
  decrease on rising RTT/429/503, EWMA-smoothed) — motivated by one observed
  case where static rate limits left >80% of achievable throughput unused.
  `--allocation-tracing` wraps a global allocator attributing every
  alloc/dealloc to the executing component (~20% throughput cost when on).
- **Polar Signals**: (a) S2 case study — profiling showed **SHA256 at 68.37%
  of CPU**; enabling sha2's hardware acceleration on Graviton (a Cargo.toml
  change) cut it to 31.82% and let S2 push ≥2× throughput at the same
  compute (customer-reported in a vendor-published case study). (b)
  Parquet→Vortex: Parquet→Arrow conversion dominated query CPU ("retrieval
  is not querying"); Vortex gave a vendor-reported 70% average query
  improvement at 10% better uncompressed size, 3% worse compressed. (c)
  DWARF-based eBPF stack walking: precompute a 16-byte-per-row unwind table
  in userspace (a profiler needs only 2 registers + return address), binary-
  search it in-kernel, aggregate stacks in a BPF map drained twice a minute.

## 5.5 Network stacks and runtimes: Fastly, curl, Deno, monoio, the kernel boundary

- **Fastly quicly** (2020) — the canonical per-packet-cost ladder, measured
  on a single core deliberately clocked 2.2 GHz → 400 MHz so CPU bottlenecks
  before the wire: raw TCP 708 Mbps; TLS-over-TCP 466; quicly off the shelf
  **196**; ACK frequency 1-per-2 → 1-per-10 packets **240**; + UDP GSO
  coalescing 10 packets **348**; GSO 20 **431**; packet size 1280 → 1460 B
  **466 (parity with TLS-over-TCP)**. Productionizing each knob honestly:
  the QUIC delayed-ACK extension (sender-driven, ~1 ACK per ⅛ cwnd); GSO
  burst capped at 10 because "a sender's kernel cannot pace these packets
  out"; server derives its packet size from the size of the client's first
  packets (they already survived the path).
- **Fastly Lucet** (2019): AOT (compile once) + **memory regions with
  reusable slots** instead of mmap/free per instance — per-request slice
  30 µs, context switch 0.5 µs, teardown 23 µs → <60 µs total setup+teardown
  per Wasm instance; sparse heaps (skip copying zero pages) cut instantiation
  to 1/8 when 1 in 8 pages has data.
- **curl**: test case **3214 hard-caps the sizes of 15 internal structs**
  (adjustable limits, so growth needs a deliberate act); over 5 years
  (7.75.0 → 8.19.0-DEV) a 10-transfer/20-connection workload nets exactly
  10,000 bytes *less*. Per-test allocation tripwires (>1,000 allocations or
  >1 MB concurrent must be declared). TLS-library allocation spread fetching
  one HTTPS URL: curl+libcurl ≈134 allocations; OpenSSL 3.4.1 >200,000;
  OpenSSL 3.5.0 >54,000; **rustls 2,176**. The Aug 2026 perf harness: 24
  tests ~6 min/round every 20 min, graphs max/median/min per commit,
  hand-set "stakes" per test — and its first lesson: allocation-count merges
  inflated a main struct enough to register as a regression (one axis
  improved, another regressed — the reason the harness measures both).
- **ByteDance monoio** (vendor docs, production network, Xeon Gold 5118 /
  10GbE): thread-per-core + io_uring reaches **~2× Tokio's peak at 4 cores
  and ~3× at 16**; the doc states plainly that at very low connection counts
  epoll-based Tokio has *lower latency* — the stated reason not to use monoio
  for that workload. Design docs explain why completion-based IO traits must
  take **buffer ownership** (a dropped future releases the borrow while the
  op stays queued — "the kernel is operating on invalid memory"; equivalently
  "if we can do async drop, we can do async IO with a reference") and why
  io_uring cancellation is non-deterministic (needs a CancelHandle so a timed-
  out read reports errno 125 instead of silently dropping bytes).
- **io_uring vs epoll, third-party** (Alibaba PhotonLibOS engineer,
  liburing#536, Xeon 8369B, 40 GbE): echo server, streaming-mode client —
  epoll 64 B: 1565K qps vs io_uring 506K (io_uring ~3× *slower*); the gap
  closes at 16 KiB buffers. io_uring wins ping-pong, loses streaming;
  per-connection socket I/O is IO-depth-1. Escape hatch: **hybrid — use the
  ring as the event system, psync read/write as the mover.**
- **Red Hat syscall accounting** (vendor): batching io_uring submissions and
  draining the CQ cut `io_uring_enter` from 4,001 to **79 per 1,000 client
  requests** (and 23 for 5,000 socket ops on a busier server).
- **Turso storage on io_uring** (author): O_DIRECT silently disables kernel
  readahead; submitting one entry at a time turned 195,207 SQEs into ~196,000
  device requests of 4.37 KiB avg (essentially zero merging); a 32-page
  application readahead window collapsed that to ~16,300 requests (91–93%
  merged) — and the io_uring backend still lost to plain syscalls on TPC-H
  Q6 (8.55 s vs 3.02 s). SQPOLL burned 65% of cycles in the kernel sq thread.
- **Zero-copy copy shapes** (author, Go but the rule is runtime-generic):
  wrapping a `*os.File` in any custom reader defeated the runtime's sendfile
  fast path — 2,958 sendfile calls became ~131,093 read+write syscalls,
  **3.4× CPU per byte** at identical throughput. **kTLS + splice** (Tensor-
  lake, vendor): terminate TLS in userspace, install keys via setsockopt,splice
  plaintext fd-to-fd through a kernel pipe — 1.12 → 2.50 GB/s (2.2×),
  ~46% CPU/GB cut; `rustls` + the `ktls` crate is the Rust shape. LWN on
  SEND_ZC: cover-letter claims >200% over MSG_ZEROCOPY, but vs plain
  io_uring the gain was ~27%; rule of thumb — zero-copy sends pay only above
  ~10 Gbps.

## 5.6 Allocators

- **Microsoft mimalloc v3** (2026, vendor): "page stealing" (work-stealing
  for pages) — ~800-thread Windows thread-pool workload allocates 262 GiB at
  **1.3× live data committed** vs 4× for an unnamed highly-concurrent
  allocator; page-metadata map makes invalid `mi_free` pointers detectable;
  co-designed with the Azure Cosmos DB team.
- **jemalloc postmortem** (Jason Evans 2025) + **Meta's renewed commitment**
  (2026): internal telemetry over thousands of workflows is what made
  fast-path changes safe — "if thousands of distinct workflows behave well
  with no outlier regressions, a change is probably safe"; pprof-compatible
  heap profiling was the adoption unlock. Meta unarchived the repos and is
  funding HPA/THP work. No quantitative claims in either post.
- **The strand problem**: mimalloc's freed blocks are reconciled on the
  owning thread's *subsequent* malloc — threads that stop allocating strand
  memory. pwy.io: +4 GB apparent leak in a Rust pricing service from spawned
  worker threads that finished and slept; fix = a dedicated long-lived
  refresh thread so allocations share one thread; mimalloc kept for ~10%
  speed. pranitha.dev: under bursty Tokio loads, glibc and mimalloc both
  pinned RSS at prior peaks, while **tikv-jemallocator with
  `background_thread:true, dirty_decay_ms:10000, muzzy_decay_ms:0,
  thp:madvise` returned RSS to baseline after each burst** (dhat first
  proved not-a-leak: peak heap 1.4 GB vs 10 KB alive at end).
- **Third-party TPC-C** (TidesDB-run, HammerDB, MariaDB 11.8.6, 40
  warehouses): InnoDB is allocator-insensitive (<2.1% spread); the
  LSM TidesDB engine — high allocation churn — **jemalloc ~75.1k NOPM vs
  mimalloc ~42.7k (−43%)**, tcmalloc 74.5k, glibc 68.8k. Allocator choice
  matters proportionally to allocation churn.
- **rustc** (author-run on perf.rust-lang.org): `MALLOC_CONF="thp:always,
  metadata_thp:always"` + kernel THP → −5% wall, −60% page faults, **+15%
  RSS**; a prior mimalloc swap showed the same speed/memory trade and was
  rejected. The canonical "allocator choice is a speed-vs-RSS dial" data
  point.
- **musl static**: a wasmtime workload ran 92.16 s static-musl vs 4.45 s
  dynamic-glibc (musl malloc thread contention on 48 cores); static musl +
  mimalloc 3.83 s — faster than glibc (Tweag; patching musl's libc.a with an
  `ar` MRI script so C libraries route through mimalloc too).
- **Firefox MemShrink** (canonical methodology): about:memory + DMD +
  areweslimyet continuous regression testing; one jemalloc size-class bug
  (4 KB layout allocations rounding to 8 KB) cost >700 MB on a layout-heavy
  test; heap-unclassified driven to a ~15% practical floor. Taxonomy:
  zombie compartments, allocator slop (size-class rounding wastes up to
  ~50% just past powers of two — request exact size-class sizes when you
  can), lifetime segregation to fight fragmentation.
- **Perf-book doctrine** (Nethercote): if malloc/free is hot → reduce
  allocation rate and/or switch allocator; **DHAT first — rustc rule of
  thumb: −10 allocations per million instructions ≈ +1% perf**; dhat-rs
  heap-usage tests as CI regression gates. jemalloc dynamic profiling:
  build with `prof:true`, env `_RJEM_MALLOC_CONF` (rust-prefixed symbols),
  flip at runtime via `mallctl("prof_active")` — "essentially no performance
  impact" inactive.
- **Arenas**: scratch-arena-by-value (temporaries freed on return incl.
  error paths); mmap 1 TiB overcommit arena gave a 31% DAG-traversal win
  over typed-arena but is OOM-killer-risky; **bumpalo hazard:
  `into_bump_slice` never runs drop glue** — a std Vec inside the arena
  leaked for ~1.5 years in Meilisearch before diagnosis.

## 5.7 Media SIMD in production

- **dav1d** (author-reported 2018): hand-written NASM/GAS assembly (no
  intrinsics), C99 core — avg **2.49× faster than libaom** on Haswell, 3.49×
  on Ryzen 5 1600, peak 5.27×, at 1/10 the code, 1/3 the binary, 1/4 the
  memory. 1.0.0 added AVX-512 and automatic thread management; 0.9.1
  retrofitted **10/12-bit SSSE3** across mc/ipred/wiener/sgr — the
  compatibility floor extended before chasing wide registers. Film grain is
  offloaded ("not run on the CPU").
- **image-png is Chromium's default PNG decoder since M139 (Aug 2025), all
  platforms** (image-rs, 2026): benchmarks across all 2,848 images of the
  independent QOI corpus with C built against zlib-ng "to give them their
  best possible chance"; checksums via simd_adler32/crc32fast (AVX-512+NEON),
  decoder kernels deliberately **SSE2-baseline** (SSE4.2 headroom identified
  for Paeth unfiltering); non-SIMD multipliers mattered as much — smaller
  internal buffers keeping data in faster cache tiers between decompression
  and unfiltering.
- **zune-jpeg**: the `image` crate's default JPEG decoder since 0.25.0;
  119,070,388 downloads (crates.io API, retrieved 2026-09-30); vendor claim
  parity within ±10 ms of libjpeg-turbo via platform intrinsics.
- **jxl-rs** (libjxl org): the JPEG XL decoder shipped in **both Chrome and
  Firefox**; Mozilla's precondition was replacing the >100,000-line C++
  reference; third-party measurements in the shipping thread put lossless
  decode 15–20× slower than WebP — but libjxl's own djxl ~20× slower too
  (Rust holding parity with C++, not regressing it). Governance rule worth
  copying: unsafe SIMD code requires **extensive safety comments + review by
  a non-author Unsafe Rust expert**.
- **Firefox swgl**: span-based SIMD rasterizer shading 4 pixels at a time,
  with `swgl_drawSpan*` intrinsics to bypass per-fragment texel
  unpack/repack. No benchmark numbers published.
- **Cloudflare Stream's AV1 verdict** (vendor): libaom encoding 2 s of 4K@30
  took >30 min on one core / ≥43 s on all 48 EPYC cores → "over 20 servers
  per live stream" → **bought dedicated AV1 hardware encoders**. When
  software SIMD can't close a realtime gap, ASICs do.

## 5.8 Low-reach war stories (HN pages 2–4 sweep, 2024→now)

- **ast-grep's tree-sitter Rust rewrite** (author): +29.7% raw parse
  throughput, −22.2% end-to-end user CPU — but the **first 30%-faster
  parser made the app slower**: per-parser large virtual-memory arena
  reservations caused syscall/page-table churn across thousands of files;
  fix = grow-on-demand arenas + compact child indexes (peak RSS on a
  TypeScript stress corpus 1.04 GiB → 91.2 MiB). Component wins ≠ system
  wins.
- **Ayende/RavenDB**: 40M struct items cut from ~1 GB to under half via
  struct-of-arrays + 1-byte field indexes for 8-byte string references — and
  the CPU drop came almost entirely from **eliminating 40M GC reference-
  traversal marks**, not cache locality.
- **OpenUI**: a Rust/WASM parser rewritten in TypeScript ran 2.2–4.6× faster
  per call — the bottleneck was the **WASM↔JS boundary** (string copies,
  serde-wasm-bindgen's fine-grained crossings were 9–29% slower than one big
  JSON string), plus statement-level incremental caching turning O(N²)
  streaming reparse into O(N).
- **toktrack** (Node CLI → Rust): simd-json + rayon + **cold/warm path split
  (warm path re-parses only files with mtime ≥ yesterday-midnight)**: 43.26 s
  → ~1.0 s cold, ~0.04 s warm on 3.4 GB of JSONL (~3 GiB/s parse).
- **chunkofcoal NEON CSV**: Geoff Langdale nibble-split classification
  (two 16-entry `vqtbl1q_u8` lookups AND-ed) compressed to u64 bitmasks;
  quote parity via **prefix-XOR — one `vmull_p64` carryless multiply**;
  branchless carry toggle between chunks. Technique post, no numbers.
- **Shnatsel's 2026 SIMD survey** (already in §2.1) re-confirmed by this
  channel: 15% of x86 CPUs still lack AVX2; LLVM scatter/gather emission
  costs 1.75× (Intel) / 4× (AMD).
- **Cimba** (C+asm discrete-event sim, author benchmark): 43.1M events/s on
  one core vs SimPy's 15.5M/s on all 64 logical cores — event queue kept
  entirely in hot CPU cache. Single-author claims; treat as a design pointer
  (batch/keep-hot-state), not a number to quote.
- **dirac.run**: with the standard 1×/10× uncached/cached price ratio, a
  20-point drop in LLM prefix-cache hit rate roughly doubles an agent loop's
  total cost — cache-hit economics as a first-class design metric.

## 5.9 Benchmark methodology and CI perf gates

The production gate-design consensus across Netflix, Dropbox, MongoDB,
Firefox, lolbench, CodSpeed:

1. **Buy variance first, gates second.** Dropbox Apogee took measurement
   variability from 60% worst-case to **<5%** (headless mode, static test
   sharding, dedicated CPU/memory per VM, clock sync disabled, Spotlight
   banned) before any threshold worked; MongoDB EC2 went 20–30% → <5%
   (EBS Provisioned IOPS — ephemeral SSD was "essentially the worst
   choice"; "disabling CPU options" stabilized both CPU- and I/O-heavy
   tests, disproving two folk beliefs).
2. **Aggregate to beat skew**: min-of-3 (Netflix — "of 3 repeats use the
   MINIMUM, the best filter of external device noise"); reject-one-of-five
   outliers but still graph them (Dropbox); memory tests aggregate with max
   (crash risk), responsiveness with median.
3. **Gate against rolling history, not static thresholds.** Netflix: fail if
   a datapoint is **>4σ above the mean of the previous 40 runs** + e-divisive
   changepoint detection over the last 100 runs for warnings — alerts
   dropped to ~10% of the static-threshold era while catching more genuine
   regressions. lolbench: ~5σ vs the historical mean across ~350 crate
   benchmarks per nightly toolchain. Firefox Talos: t-test on 12-before vs
   12-after, blame the push with the highest t-score (not the first to
   cross). MongoDB: reframe "did perf change >10%?" as "which software
   changes altered performance?" — a time-series changepoint question
   (63 regressions caught via DSI vs 20 via microbenchmarks in the 4.2
   cycle).
4. **Size thresholds to measured runner CoV** (CodSpeed, vendor for their
   own product): GitHub-hosted runners ~2.66% CoV → a 2% gate ≈ **45%
   false-positive rate**; their bare-metal runners 0.56% CoV → the same 2%
   gate fires 0.04% of the time.
5. **Escape noise deterministically when possible**: Iai/Cachegrind
   instruction counts — single run, layout- and frequency-insensitive
   (motivation: cloud wall-time "differences of as much as 50% are common"
   with identical code); **Stabilizer** (ASPLOS'13) randomizes code/stack/
   heap layout at runtime so layout luck becomes Gaussian — its headline
   finding: **−O3 vs −O2 was statistically indistinguishable from noise on
   SPEC CPU2006**, the standing warning for before/after superoptimization
   claims.
6. **Instrument the platform, not just the code**: MongoDB's canary
   benchmarks caught a 30% platform-wide drop on 2018-01-04 (Spectre/
   Meltdown microcode) and its reversion 9 days later.
7. **Correlated noise cannot be averaged away** (Cloudflare Workers CPU
   post-mortem, 2025): an external benchmark claimed Workers 3.5× slower
   than Node — actually warm-isolate routing queued CPU-bound requests
   behind each other (latency ≠ CPU time); mixed server generations and
   noisy-neighbor memory-bandwidth contention make more iterations
   worthless without randomizing placement; config asymmetry (unset
   NODE_ENV → React dev mode) dwarfed platform differences. The response
   playbook: measure CPU time not wall-clock, colocate the load client,
   profile before concluding (flamegraphs showed GC at 10–25% → relaxing a
   2017-era young-gen cap ≈ +25%; a V8 JSON.parse reviver patch ≈ +33%),
   cross-validate against provider telemetry.
8. **TigerBeetle's VOPR** as the deterministic pole star: a seeded
   deterministic simulator with fault knobs; *liveness mode* picks a core
   quorum, heals it, and makes all faults on non-core replicas permanent —
   uniform-random healing hides livelocks (caught the "resonance" bug #913).

## 5.10 Cache design at scale

- **Eviction policy evidence**: **SIEVE** (2023, author-measured academic
  eval over 1,559 traces / 247B requests): one FIFO queue + visited bit +
  moving hand; retained objects stay in place (no promotion on hit → no
  lock/pointer churn) — beats all state-of-the-art policies on >45% of
  traces, mean 21% FIFO miss-ratio reduction on a large CDN dataset, ≤21
  lines to swap for LRU across Go/JS/Rust/Python libs, 16% faster than
  optimized LRU single-threaded and >2× at 16 threads (Cachelib); **not
  scan-resistant** without a ghost cache. **Dan Luu (independent, public
  simulators)**: evicting the LRU of *two random* candidates matches or
  beats true LRU at large cache sizes — exact recency tracking buys little.
  **W-TinyLFU/Caffeine**: CountMin sketch with aging + admission window +
  80%-capped protected SLRU; reads recorded to a **striped ring buffer**
  (dropped when full — hit ratio unaffected), writes to MPSC queues; reads
  scale linearly at ~33% of hash-table throughput, ~10% write penalty.
  **moka (Rust)**: TinyLFU admission + LRU today; on the ARC-DS1 database
  trace its hit ratio **dropped at 6M entries where W-TinyLFU stayed
  near-optimal** — plain TinyLFU without an admission window degrades at
  scale on recency-heavy workloads; quick-cache chose S3-FIFO. moka runs in
  production on crates.io's API (~85% hit rate on the download endpoint).
- **Metadata sharing**: Pelikan **Segcache** groups objects by *similar TTL*
  into segments with shared headers — **5 bytes/object metadata vs
  Memcached's 56** (Twitter's median object <300 B, so >1/3 of memory was
  metadata); 40–90% memory reduction vs Pelikan-slab, 8× Memcached
  throughput at 24 threads; merge-based eviction drops lock frequency
  ~10,000×. **Instagram** (2013, archived): bucketing 300M keys into
  1,000-entry Redis hashes triggered compact encoding — 70 MB → 16 MB per 1M
  keys (21 GB → <5 GB total) at O(1) lookups.
- **Tiering**: Cloudflare Regional Tiered Cache = 50–100 ms tail cache-hit
  improvement (vendor); HIBP's Cache Reserve (customer-measured): hit ratio
  99.52% → 99.9998% at ~$2/day, removing ~16M origin requests over 9 days.
  Fastly's methodological point: split **CHR-edge vs CHR-global** — a
  request served by a parent POP still counts as a "hit" in the classic
  formula.
- **Twitter twemcache** (2012, archived): random-slab eviction to fix slab
  calcification (reassign a random slab's size class when the cache is full);
  thread-local counters aggregated by one background thread (1× vs 100×/s
  aggregation changes mutex wait <20%). Pelikan+Intel ADQ (2020): hardware
  queues per instance held p999 <5 ms at 1M QPS where non-ADQ breached the
  SLO beyond ~500 connections/instance — "the biggest improvement in a
  decade" (author's words).

## 5.11 Transferable techniques table (cross-cutting)

| # | Technique | Proved at | Measured effect (vendor unless noted) | Skill destination |
|---|---|---|---|---|
| 1 | `Box<[T]>`/`Box<str>` for frozen (write-once) data | Cloudflare DNS cache | 64 B/entry ×8 fields, >15 TB fleet; entry 953→420 B total | rust-fast-architecture (new) |
| 2 | Padding-aware struct surgery (bitflags; removing small fields shrinks more than their size) | Cloudflare DNS cache | part of −56%/entry; ketama point 8→6 B via raw-byte struct | rust-fast-architecture (new) |
| 3 | Box only rare-huge enum variants when traffic skews small | Cloudflare DNS cache | ~120 B/record for >80% of traffic | rust-fast-architecture (new) |
| 4 | Hot immutable payload as one length-prefixed blob + memcpy-on-read, built via reusable scratch buffer | Cloudflare DNS cache | −5% latency, +13% throughput alone; entry total −56%, +43% insert | rust-fast-architecture (new) |
| 5 | Work-stealing threads over worker processes → shared connection pools | Pingora vs nginx | −70% CPU, −67% mem, −80 ms p95 TTFB, reuse 87.1→99.92% | rust-fast-architecture (new) |
| 6 | Flip iteration direction: iterate the small dynamic set, not the large static set | Pingora trie-hard | 3.65→0.93 µs; 1.71%→0.34% of fleet CPU | rust-fast-architecture (new) |
| 7 | Shard by content hash + delta encoding + approximate-MST ingest order | GitHub Blackbird | 115 TB → 25 TB index; ~18 h full re-index | rust-fast-architecture (new) |
| 8 | Bias poll order so expensive confirmation preempts cheap filtering | Zed project search | first-match 16.8 s → 32 ms (~524×), total unchanged | rust-fast-architecture (new) |
| 9 | Component ≠ system: measure end-to-end after kernel wins | ast-grep | +30% parser initially *slowed* the app (VM-churn arenas) | rust-fast-architecture (new) |
| 10 | Global-allocator swap as differential diagnostic for "leaks"; one allocator per process (LD_PRELOAD + nm check) | Meilisearch, pwy.io | +4 GB phantom leak explained; RSS growth disappeared | rust-parallel-cache (new) |
| 11 | jemalloc decay tunables for RSS return under bursty async load | pranitha.dev | RSS returned to baseline; glibc/mimalloc pinned at peaks | rust-parallel-cache (new) |
| 12 | Per-entry allocation accounting: GlobalAlloc wrapper + paired throughput/latency + staged-rollout p99 resident memory at steady-state plateaus | Cloudflare DNS cache | caught −58% allocations without speed loss | rust-parallel-cache (new) |
| 13 | Eviction-policy chooser: SIEVE / W-TinyLFU / S3-FIFO / 2-random over plain LRU/TinyLFU | SIEVE paper, Caffeine, moka, Dan Luu | >2× at 16 threads (SIEVE); TinyLFU degrades at 6M entries (moka) | rust-parallel-cache (new) |
| 14 | Ring-buffer reads + MPSC writes for cache concurrency (Caffeine) | Caffeine/moka | linear read scaling at ~33% of hash-table throughput | rust-parallel-cache (new) |
| 15 | Consistent-hash ring sizing from CV formula; 6-byte packed points; dual-ring migration | Cloudflare PBR | −25% ring memory, hashes/server −90%, −100 TB | rust-parallel-cache + fast-architecture |
| 16 | Variance budget before gates; rolling-history σ gates; min-of-k; canary benchmarks; threshold sized to runner CoV | Netflix/Dropbox/MongoDB/CodSpeed/lolbench | 60%→<5% CoV; alerts to ~10%; 2.66% CoV → 2% gate = 45% FP | rust-superopt (new) |
| 17 | Deterministic proxies: Cachegrind instruction counts; layout randomization warning (Stabilizer: −O3 ≈ −O2 = noise) | Iai; Stabilizer ASPLOS'13 | single-run gates; SPEC CPU2006 | rust-superopt (new) |
| 18 | Validate microbenchmarks against production (stack-sampling; staged rollout) | Pingora trie-hard; Sentry Symbolicator | predicted 0.43% vs measured 0.34%; but LTO's +45% micro = no prod CPU win | rust-superopt (new) |
| 19 | LTO→PGO→BOLT measured ladder | Symbolicator (third-party bench) | +15.7% / +35.6% / +45.1% cumulative req/s | rust-superopt (new) |
| 20 | Branchless multi-way lookup: offset tables over distinct-byte remapping, sized to L2/L3 | Cloudflare WAF ML | 5.66–12.09× over HashMap/Aho-Corasick preprocessing | rust-simd-kernels (new) |
| 21 | Token-position bitmaps: classify two token classes over 128 B windows, walk with TZCNT | Cloudflare PicoHTTPParser AVX2 | 1.68–1.79× over SSE4.2 PCMPESTRI | rust-simd-kernels (new) |
| 22 | Nibble-split classification + prefix-XOR parity via carryless multiply (`vmull_p64`) | chunkofcoal NEON CSV | technique-only (no numbers published) | rust-simd-kernels (new) |
| 23 | AVX-512 compress-store index output for range filters | quickwit simd-range | 8.6B u32/s vs 170M/s scalar (Skylake; note Zen-4 compress-to-memory penalty) | rust-simd-kernels (new) |
| 24 | Fixed-size branchless binary search: `&[u32; N]` + `(start, len)` | tantivy | ~9.55 cycles (sim-est.); AND queries 10% faster | rust-simd-kernels (new) |
| 25 | Feature-flag hardware acceleration check on crypto crates (sha2) | Polar Signals/S2 (customer-reported) | SHA256 68.37% → 31.82% CPU, ≥2× throughput | rust-simd-crates (new) |
| 26 | Fleet-deployment evidence as crate-adoption signal (image-png in Chromium, zune-jpeg in image, jxl-rs in Chrome+Firefox) | image-rs, Chromium, Mozilla | billions of users; 119M zune-jpeg downloads | rust-simd-crates (new) |
| 27 | io_uring guardrails: batch submissions; ring-as-waiter + psync mover for streaming; O_DIRECT ⇒ own readahead; SQPOLL CPU tax; memlock rlimit | Red Hat, liburing#536 (3rd-party), Turso, glommio | 4,001→79 enters/1k reqs; io_uring 3× slower than epoll streaming at 64 B | rust-fast-architecture (new) |
| 28 | Preserve zero-copy copy shapes; kTLS+splice for TLS proxies | segflow (Go), Tensorlake | 3.4× CPU/byte lost to one wrapper; 2.2× throughput gained | rust-fast-architecture (new) |
| 29 | Request coalescing via shared in-flight futures | Discord data services | shields hot partitions; enabled 177→72 node migration at 3.2M msg/s | rust-fast-architecture / rust-parallel-cache |
| 30 | Measure RSS, not allocated bytes (layout math overstates wins) | Figma | promised 20% extra savings delivered ~5% | rust-fast-architecture (new) |

## 5.12 Negative results and things that did not transfer

- **Cloudflare zlib-rs**: no adoption post exists (sitemap + HN + Trifecta
  posts + repo checked). Any nginx→zlib-rs expectation must come from
  elsewhere; their real zlib story is the 2015 C fork.
- **"ScalpR"**: unverifiable — likely a misremembered name.
- **Sentry's PGO/LTO in production**: microbenchmark +45% (third-party) →
  no visible production CPU change (vendor). IO-bound services eat codegen
  wins.
- **Warp**: publishes no benchmark numbers at all — architecture-only
  evidence.
- **Restricting Cloudflare's cache transcoding to hot assets performed
  worse** — decode cost per serve dominates.
- **Boxing enum variants is an intermediate step, not an end state** —
  Cloudflare's own post: allocator size-class rounding + pointer-chasing
  locality; the wire-format blob is what produced the measurable win.
- **O_DIRECT + io_uring without application readahead lost to plain
  syscalls** (Turso, 8.55 s vs 3.02 s) — the faster interface is not
  automatically the faster system.
- **The 100 TB headline math doesn't scale down**: a 64 B/entry win only
  matters at billions of entries; below ~10⁷ entries the same techniques
  yield KBs–MBs — do them for allocation-count and locality wins.
- **monoio loses at low connection counts** (higher latency than Tokio) —
  stated by its own benchmark doc; thread-per-core's bill comes due on
  unbalanced load.
- **pullpush.io (Reddit archive) hard-blocked agents** this round — the
  r/rust sweep leg could not run; no Reddit-sourced claims are in this round.
- **VictoriaMetrics' IOx benchmark** (2020, competitor-run against an alpha)
  is direction-only; no independent measurement of current IOx was found.

## 5.13 Harvest into the skills (Round 5)

1. **rust-fast-architecture** — new `references/production-case-studies.md`:
   the Cloudflare DNS-cache frozen-data layout (techniques 1–4), Pingora
   threading + trie-hard + count-min sketch + ecdysis (5–6), Blackbird
   sharding (7), Zed latency-vs-throughput scheduling (8), ast-grep
   component≠system (9), Figma RSS≠allocated (30), Discord GC-scan coupling
   + request coalescing (29), uv hardlink/reflink cache tier, ketama ring
   math (15), io_uring guardrails (27), zero-copy copy shapes + kTLS (28).
   SKILL.md gains a case-study index section.
2. **rust-parallel-cache** — new `references/cache-eviction-allocators.md`:
   the allocator decision table + tunables (10, 11), per-entry allocation
   accounting harness (12), eviction-policy chooser (13), Caffeine
   concurrency recipe (14), ring sizing (15), cold/warm mtime cache
   (toktrack), glibc mmap-threshold diagnosis (quickwit). SKILL.md gains a
   short pointer section.
3. **rust-superopt** — `references/measurement.md` gains the variance-budget
   / regression-gate methodology (16, 17) and the benchmark→production
   validation loop (18); `references/codegen-tooling.md` gains the measured
   LTO→PGO→BOLT ladder with the Sentry production caution (19). SKILL.md
   Step 1 gains the variance-budget rule.
4. **rust-simd-kernels** — `references/intrinsics.md` gains the
   production-kernel section (20–24); SKILL.md rung-4 note updated.
5. **rust-simd-crates** — `references/crates-numeric-media.md` gains the
   fleet-deployment evidence section (25, 26) and the sha2 feature-flag
   check pattern.

Items the hunters routed to `rust-best-practices` / `rust-async-patterns`
(frozen-data layout, graceful restarts, bumpalo hazard, monoio async-rent,
kernel TCP sysctls) were redirected into the five skills above, per this
round's distribution constraint — the layout content lives in
rust-fast-architecture's case study, allocator hazards in
rust-parallel-cache, and io_uring ownership/cancellation semantics in the
fast-architecture io_uring section.

# Round 6: untouched resources (2026-10-01)

Twelve hunts closed the last named resource classes the first five rounds never
opened: the three CPU vendors' own optimization manuals, the cross-language
portable-SIMD design record (Java/.NET/Go/ISPC), rustc's own performance
machinery, the benchmark-harness authors' writing, the canonical Rust perf
writers (nnethercote/matklad/burntsushi), the OLAP vectorized-execution
literature, Rust gamedev (bevy/wgpu/rapier), the Rust audio/DSP niche, TLS
(rustls), Unicode (ICU4X), the remaining non-English communities (Habr deep
pages, dev.to, velog, Zhihu retry), and conference slide archives
(CppCon/FOSDEM/C++Russia/CGO). Method unchanged from prior rounds and stated
once here: **every number below is vendor-/author-/paper-reported as labeled —
nothing was re-benchmarked in this or any prior round** (the research host is
Apple Silicon without AVX2/AVX-512). Key source URLs were re-checked live this
round (curl status 200) unless noted otherwise. Access notes that shaped the
hunts: AMD's SOG had to be pulled through docs.amd.com's Fluid-Topics
`/api/khub` endpoints; Arm's developer.arm.com is a JS shell whose old PDF
hosts are NXDOMAIN — PDFs came from the undocumented
`documentation-service.arm.com` HAL API; learn.microsoft.com and Intel's
oneAPI doc bodies are JS-rendered (worked around via reader tools / the ORM
PDF); Internet Archive was "Temporarily Offline" for part of the window.

## 6.1 Vendor optimization manuals (Intel ORM Vol 1, AMD Zen 5 + Zen 3 SOGs, Arm Neoverse N3/V2/V3 SOGs)

The third-party measured layer (uops.info/Agner/Chips&Cheese) already in the
skills lacked the vendors' *policy* statements. What the manuals add:

- **Width policy, per vendor.** AMD Zen 5 SOG (PUB 58455 §2.11.2): "the
  datapath is 512 bits across all operations, so optimal code operates on
  512-bit (ZMM registers) with every operation… expect software to have
  reduced power and increased performance when using 512-bit operations" —
  AMD's official go-wide-everywhere verdict on Zen 5 (no 256-bit hedge in this
  document; the double-pump story remains Zen 4/PPR + third-party measured).
  Zen 3 SOG (PUB 56665) says the same sentence with 256-bit — the rule is
  literally "use the full datapath width" per generation. 512-bit mechanics
  (58455 §2.6.2.2): a 512-bit load pairs the two 256-bit load pipes for a
  cycle (blocking an integer load); a 512-bit store costs 2 dispatch slots and
  2 store-queue entries — stores are the 512-bit weak point, matching the
  measured double-pump map in §2.11 of this report.
- **Intel's frequency-license model replaces folklore** (ORM 248966-050US
  §2.6.3): three per-core licenses (L0 scalar/128-bit; L1 AVX2-heavy +
  AVX-512-light; L2 AVX-512-heavy), up to 500 µs to grant a higher license,
  ~2 ms return timer, mixed light instructions stack (Xeon 8180: 110
  AVX-512-light + 20 256-bit-heavy in 65 cycles ⇒ L2), and the vendor's own
  verdict that AVX-512-heavy DL workloads gain 1.3–1.5× over AVX2 *despite*
  the lower clock.
- **The most concrete gather guidance found anywhere** (Intel ORM §15.16.4):
  a decision table — regular loads for sequential / <4-element / small-stride
  (load-nearby + `VPERMQ`) / transposition / redundant-element patterns;
  VGATHER only for ≥4 elements with locality; prefer dword-index forms (qword
  indices waste half the register slots); hoist gathers ahead of consumers;
  pre-zero the destination with VXOR to break the false merge-dependency.
  §17.22 documents the compiler-side G2S (gather-to-shuffle) rewrite (4×
  `vmovups` + `vpermi2d` replacing `vpgatherdd` for strided AOS→SOA). AMD's
  matching policy (58455 §2.11.2 rec 8): "Avoid GATHER instructions when the
  indices are known ahead of time. Vector loads followed by shuffles result in
  a higher load bandwidth." Krzikalla's CppCon 2024 measurements (below)
  quantify exactly this: gather intrinsic 14/4/6 GB/s vs shuffle-built loads
  29/40/28 GB/s on Broadwell/Skylake/Zen 2.
- **Flag-toggle economics (new class, no skill taught it).** Intel ORM
  §3.9.2/§3.9.3 + Coding Rule 52: an MXCSR *write* is a serializing
  instruction and MXCSR reads have fairly long latency — set FTZ/DAZ once at
  startup, never per region. Arm N3 SOG §4.8/§4.9: a predicted FPCR
  control-field change "introduces a barrier which prevents subsequent
  instructions from executing". AMD 58455 §2.11.4: with both DAZ and FTZ set,
  denormals cost nothing; without them only mul/div/sqrt may re-execute at
  longer latency. The skills taught what denormals cost, not that toggling
  the mitigation is itself expensive.
- **Arm vendor numbers for gather and serialized reduction.** All three
  current Neoverse SOGs (N3 109637, V2 109898, V3 PJDOC-…) state SVE2 is
  implemented **with a 128-bit vector length** — SVE on the current cloud
  fleet is a programming-model win (predication), not a width win. Gather vs
  contiguous, vendor-stated: N3 contiguous LD1 3/clk (lat 6) vs gather 3/4–4/5
  per clk; V2 contiguous 3/clk vs 32-bit-scaled gather 1/2 per clk (lat 10) —
  a 4–6× throughput gap. Serialized horizontal reduction (FADDA) f32: lat 8 /
  tp 1/2 on N3, lat 6 / tp 1/5 on V2 — vendor data behind the existing
  tree-reduction rule.
- **Unrolling rules with numbers.** Intel Rule 15: unroll so iterations =
  16/(# conditional branches); Example 15-36: 8 independent YMM accumulators
  + one post-loop vertical tree reduction; §2.5.1.4: unroll×2 to place two
  same-cache-line stores back-to-back so they pair. AMD 58455 §2.6.2.1: in
  multi-stream loops, place up to four loads (two if vector/FP) from each
  stream together to avoid L1 bank conflicts; §2.9.1 caps hot code at the
  6.75K-µop op-cache.
- Not obtained: the **Zen 4 SOG** (amd.com URL 404, absent from docs.amd.com
  sitemaps and its search API; no GitHub mirror) — Zen 4 stays covered by the
  GDC'23 deck + third-party measured data. Intel ORM Vol 2 identified but not
  pulled; Vol 1 (-050US, Apr 2024) covers through Emerald Rapids/Crestmont.

Sources: https://docs.amd.com/v/u/en-US/58455_1.00 (direct ZIP via
https://docs.amd.com/api/khub/documents/RCLISlZoOyWkKA9SYwLLDQ/content);
https://docs.amd.com/v/u/en-US/56665 ;
https://cdrdv2.intel.com/v1/dl/getContent/671488 ;
https://developer.arm.com/documentation/109637/latest ,
…/109898/latest , …/PJDOC1505342170661452/latest (PDFs via
documentation-service.arm.com).

## 6.2 Cross-language portable-SIMD design (Java Vector API, .NET, Go simd, ISPC)

The strongest cross-validation of the skills' stable-first doctrine on record:

- **Autovectorization is formally dead as a strategy — in writing, by
  everyone.** JEP 529 (Vector API, 11th incubator): "even after decades of
  research… auto-vectorization of scalar code is not a reliable tactic" and
  HotSpot's machinery "works only on special occasions". Go issue #80857
  (2026): "The compiler performs no auto-vectorization" — with the team-
  reported gap quantified (~1.5 GB/s scalar vs ~90 GB/s AVX-512 for a
  []u8 min reduction), and Go's remedial path is a *closed list* of
  recognized idioms rewritten to archsimd kernels, not a general vectorizer.
- **Every ecosystem converged on two levels**: arch-intrinsics + a portable
  layer (Go's `simd/archsimd` + `simd` — explicitly the syscall/os split;
  .NET's Vector128/256/512 + TensorPrimitives; Java's intrinsics + species-
  polymorphic Vector<E>; ISPC's per-target codegen + length-agnostic gangs).
  Rust's `core::arch` + portable layer (pulp/fearless_simd) is the same
  shape; nobody argues for a third layer or one level alone.
- **Shape portability is the decision** (maps onto the crate table): pulp's
  native-width ≈ .NET `Vector<T>`, whose own docs now confine it to "a
  building block"; `Simd<T, N>` ≈ Java's platform-agnostic species, with
  JEP 448's warning that shape-specific species "inhibits C2 from generating
  optimal code"; ISPC documents that programs "compute different results when
  run with different gang sizes".
- **Hardware-varying ops are name-quarantined or vendored**: .NET's
  `…Estimate`/`…Native` suffixes; Java buys transcendental portability by
  vendoring SVML→SLEEF (3.9.0 in JDK 27) with 1-ULP claims; Go refuses
  emulation outright. Counter-example already flagged in the skills: `wide`'s
  "explicitly left unspecified" trig.
- **Tail handling belongs to the width-aware layer**: ISPC `foreach`
  (= chunks_exact + masked ragged tail), TensorPrimitives "vectorize
  remainder processing" internally, Java's masked-array tails.
- **Timeline realism**: the Java Vector API JEP was created 2018-04-06 and is
  on its *twelfth* incubator round (JEP 537, JDK 27), still pre-preview,
  blocked on Valhalla value classes; Go went 2022 (dilemma stated by
  ianlancetaylor) → 2025 (GOEXPERIMENT archsimd) → 2026 (portable package,
  still experimental); .NET went 2014 `Vector<T>` → 2023-24 TensorPrimitives.
  Portable-SIMD APIs take ~a decade per ecosystem — portable_simd's
  nightly-only status since #86656 is normal for the problem class, which is
  precisely why the stable-first rule is right.

Sources: https://openjdk.org/jeps/338 , /414 , /448 , /529 , /537 , /0 ;
https://github.com/golang/go/issues/73787 , /78902 , /80857 , /53171 ;
https://learn.microsoft.com/en-us/dotnet/api/system.numerics.tensors.tensorprimitives ;
https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-9/ ;
https://ispc.github.io/ispc.html , https://ispc.github.io/perfguide.html .

## 6.3 rustc's own performance machinery (rustc-perf, dev-guide, triage logs)

- **The IQR noise fence** — the most transferable artifact: a result counts
  as a real change only if it is significant under a *per-benchmark* fence
  computed from that benchmark's own historical adjacent-run deltas —
  `Q3 + 3×IQR`, falling back to a 0.2% constant with no history
  (site/src/comparison.rs + docs/comparison-analysis.md). Everything else in
  the collector is deliberate noise control: `perf stat` instructions:u as
  the triage metric (deterministic), ASLR off via `setarch -R`, P-core
  pinning via taskset on hybrid CPUs, minimum of 3 iterations, only
  x86_64-linux tracked.
- **Ecosystem-scale codegen regressions are real and small**: rust#160745
  (dropping LLVM `noalias` from FnOnce closure captures) cost ~+0.4% mean
  instructions across 94 primary benchmarks; the fix (#162361) gave −0.3%
  across 85. LLVM upgrades diverge by metric (LLVM 16: instructions +1.2%
  mean while cycles improved — reverted once, then relanded). Two std
  vectorization fixes measured ecosystem-wide: to_lowercase autovec
  (−0.3% mean on 21 primary benchmarks) and a vectorizer-friendly bitset
  rewrite (−1.4% mean on 4).
- **Toolchain numbers for the PGO/LTO/BOLT ladder** (rustc-project-reported):
  thin-LTO up to 10% (Linux), PGO+BOLT up to 15% additional; Rust 1.66
  shipped LTO-frontend + BOLT-LLVM official Linux builds; MIR inlining
  (1.65) worth 3–10% compile time; Nethercote's Sept-2026 post: −4.57% mean
  wall-time over two months, single LLVM 23 upgrade −1.2%, Clippy PGO up to
  −18% on Clippy benchmarks; PGO profile gathering now pins frontend threads
  to 1 (parallel sampling poisons the profile).

Sources: https://github.com/rust-lang/rustc-perf (docs/comparison-analysis.md,
collector sources, triage/2026/*); rustc-dev-guide profiling/perf pages;
https://blog.rust-lang.org/2022/12/15/Rust-1.66.0/ ;
https://nnethercote.github.io/2026/09/30/how-to-speed-up-the-rust-compiler-in-september-2026.html .

## 6.4 Benchmark-harness authors (sharkdp, criterion, hyperfine, Divan, iai→Gungraun)

- **Correction to our own skeleton**: benchmarks in the same crate as the
  measured code overstate performance — Rust inlines freely within a crate
  but not across crate boundaries; put benches in a **separate workspace
  member** (Gungraun best-practices doc). rust-superopt's criterion skeleton
  shows the in-crate shape and is now annotated.
- **Benchmark-sink fidelity**: hyperfine pipes output to /dev/null and hid a
  real 2–3× terminal win in hexyl's color-output path (PR #176) — "an
  artificial measurement". Measure output-heavy code through the production
  sink. hyperfine also corrects for shell-spawn time (`--shell=none` for
  <5 ms commands) and supports cold-cache `--prepare` with drop_caches.
- **Exact statistical machinery, now named in the skills**: criterion —
  100,000 bootstrap samples, 95% CI, t-test over bootstrap distributions,
  default ±1% noise threshold (CORRECTED in audit round 2, 2026-10-01: this
  line originally said ±2%, which is wrong — criterion src/lib.rs sets
  `noise_threshold: 0.01` identically on 0.5.1 and master), four verdict
  labels; outliers classified with
  modified Tukey fences (mild 1.5×IQR / severe 3×IQR) but **flagged, not
  removed**. hyperfine — Iglewicz–Hoaglin modified Z-score (x−median)/MAD,
  threshold 1.4826×10. Divan — double iterations per sample until a sample
  spans 100× timer precision (Chen & Revels); deferred-drop caveat.
- **Timing-loop taxonomy** (criterion): `iter` counts Drop inside the loop;
  `iter_with_large_drop` defers it; `iter_batched`/`iter_batched_ref` +
  BatchSize (PerIteration has orders-of-magnitude overhead — distorts
  hundreds-of-ns benches).
- **iai-callgrind renamed Gungraun** (v0.20): single-run deterministic
  counts repeatable to 7+ significant digits vs ~1 for wall-clock;
  regression gates as per-event soft %-limits plus absolute hard limits
  (`--callgrind-limits='ir=5%'`, exit code 3); env vars cleared by default;
  honest caveats — cycles "merely correlate" with wall-clock, and the
  precision is so high that adding one benchmark case can perturb others in
  the file (code-layout sensitivity).
- **sharkdp's fair-comparison checklist** (fd README + PR #1422): flag
  equivalence between compared tools, warm/cold cache disclosure, result
  parity verified ("both tools found the exact same 546 files"), external
  reference binaries as anchors in every table (bfs/find), corpus sizes
  reported, scripts published, machine-specificity disclaimed, and
  commit-by-commit benchmarking of optimization ladders (hexyl #173:
  1.23× → 1.67× → 3.69× chain). Startup latency is a distinct benchmark axis
  (bat: LTO +10%, lazy syntaxes +75% small-file, lazy themes +25%).

## 6.5 The canonical Rust perf writers (nnethercote, matklad, burntsushi)

The perf-book (read in full, 19 chapters, maintained through 2025) contributes
whole technique classes no skill owned: **allocation-rate reduction** (DHAT
rule of thumb from rustc: cutting 10 allocs per million instructions ≈ ~1%
runtime; SmallVec/ArrayVec, with_capacity, clone_from, Cow, workhorse
collections; dhat-rs heap-usage tests as CI gates), **type-size engineering**
(types >128 bytes are memcpy'd — shrink below the threshold; -Zprint-type-sizes;
boxing rare-huge variants; ThinVec), **hasher selection** (rustc-hash > fnv >
ahash ordering is workload-dependent; rustc's own numbers; FxHash high-bits
entropy hazard), **cross-crate inlining rules** (`#[inline]`'s real job is
cross-crate; non-transitive; hot/cold split pattern), and **compile-time
levers** (cargo-llvm-lines, non-generic inner-fn pattern). Nethercote's
profiler ranking: instruction counts (Cachegrind) first — "±0.1% vs ±3%" for
wall-times; cycles last (correlate with instruction counts); "every new type
of profiling found new things to improve."

matklad's measured micro-optimization method: the Min-of-Three DTW series
(reordering nested min/max selects alone 435→287 ms via ILP; diagonal
traversal + pre-sliced bounds hoisting → LLVM auto-vectorizes, 293→52 ms;
**reverse-iterating one input blocks vectorization** — reverse once up
front); `#[inline(always)]` 330 ms vs `#[inline(never)]` 259 ms where the
cause was 0.8B extra instructions, *not* i-cache (perf stat + Cachegrind
agree, I1 misses negligible) — "it's not always iCache"; the black_box-free
benchmark scaffold (runtime-overridable inputs + a printed weak hash of
outputs, defeating both constant-folding and DCE while doubling as a
correctness canary); batched event-loop draining (scalar-select
anti-pattern); reserve-first bulk mutation.

burntsushi's regex internals: literal prefilters "not uncommon to improve
throughput by one or two orders of magnitude" with the failure mode being
false-positive ping-ponging with the engine; extraction heuristics (few,
long literals scored against a background byte-frequency distribution);
Teddy/memmem/Aho-Corasick selection (AC wins around tens of thousands of
literals); the 1.9.5 cross-thread contention fix (sharded free-list, one
cache line per shard) for shared-Regex-on-small-haystack slowdowns; regex
1.9 measured 1.5× faster than 1.7.3 across 242 rebar benchmarks
(author-reported) at the cost of compile time (mitigated by regex-lite).

## 6.6 OLAP vectorized execution (X100 → Sompolski → Morsels → DuckDB/ClickHouse/Arrow)

The OLAP canon is a concrete recipe none of the skills taught (rung 4 stops
at "blocking for cache"):

- **Batch sizing**: X100's measured optimum ~1000 tuples (default 1024);
  "all values between 128 and 8K work well"; deterioration once intermediates
  exceed cache; at 4M-tuple vectors the engine degenerates to materializing
  to RAM. TPC-H Q1 SF=1: MySQL 26.6 s vs X100 0.50 s vs hand-coded 0.22 s
  (author-measured, AthlonMP). DuckDB ships STANDARD_VECTOR_SIZE = 2048.
- **Selection vectors**: filters emit *positions* (u32 indexes + count), not
  materialized booleans; conjunctions chain selection vectors; dictionary
  vectors are (child, selection) pairs kept compressed end-to-end through
  execution, with a UnifiedVectorFormat-style flatten fallback.
- **Vectorization vs compilation** (Sompolski/Żukowski/Boncz, CIKM 2011):
  vectorized SIMD Project 1.2 cycles/tuple vs compiled 2.0; tuple-at-a-time
  23 (interpreted) vs 7 (compiled); verdict — combine them, compile
  per-primitive loops and materialize intermediate vectors.
- **Morsel scheduling** (Leis et al., SIGMOD 2014): ~100k-tuple morsels
  ("experimentally determined"); the dispatcher is a lock-free data structure
  *executed by the work-requesting worker thread itself* (no dispatcher
  thread/core); per-core morsel lists for NUMA locality; preemption only at
  morsel boundaries. DuckDB's instantiation: two-phase thread-local
  pre-aggregation + radix partitioning above 10k entries + symbolic
  (block-id, offset) hash-table pointers so resizes rebuild only the pointer
  array.
- **String views**: DuckDB's string_t and Arrow's StringView (16-byte views,
  ≤12-byte strings inlined, 4-byte prefix for early-out compares); arrow-rs
  measured ~2× faster Parquet loads vs BinaryArray and 24% end-to-end on
  ClickBench Q20 (vendor) — plus the Rust war story that 13 length
  specializations (0–12) were needed to fix a 10× short-string construction
  slowdown, and that UTF-8 validation erased the copy win until bulk
  validation was patched in.
- ClickHouse PREWHERE (column-ordered granule reads, 23.36→6.74 MB and
  0.056→0.017 s at unchanged rows — vendor) and 30+ precompiled hash-table
  variants selected per query/data.

## 6.7 Rust gamedev (bevy, wgpu, rapier) — frame-loop and GPU-API lessons

- **Warm-thread scheduling economics** (bevy 0.14): a woken thread with cold
  cache costs up to ~30 µs; running the executor at the *end* of each system
  task on the already-awake thread saves 1–3× context switches per schedule;
  merging 20+ micro-systems into one cut the First schedule 140 µs → 25 µs —
  batch tasks below the wake-cost floor.
- **ECS storage is a per-write-pattern choice** (bevy 0.12/0.15/0.20): the
  render world's clear-and-respawn cycle caused constant archetype moves
  until it moved to `EntityHashMap`; the 0.15 dense-iteration fix made
  sparse-set queries 1.8–3.5× faster where any sparse component had forced
  slow iteration; non-archetypal filters (Added/Changed/Spawned) scan every
  matching entity; despawn_all batches structural work (1.3–1.7×); schedule
  randomization (0.20 `shuffle_seed`) is property testing for implicit
  order-dependence.
- **Dirty-bit hierarchy skipping** (bevy 0.16): transform propagation 1.1 ms
  → 0.1 ms on a 127,515-object scene (vendor, M4 Max) via a propagated dirty
  bit + leaf/non-leaf parallel split; on low-end hardware this pass could be
  25% of the frame budget.
- **wgpu arcanization — "share by cloning the handle, not by reading under
  the lock"**: holding Hub locks only long enough to `Arc::clone` a resource
  enabled parallel command encoding (45% frame-time reduction on Bevy's
  bistro scene); v22's Arc-based tracking: `.submit()` 39–64% faster. The
  shader-safety tax is measurable: naga's integer-div guards cost ~10 extra
  instructions per division (`emit_int_div_checks`, trusted-module escape
  hatches).
- **ecs_bench lore retired**: the suite behind "bevy ECS is fastest" was
  archived in 2022 with the note that speed is "a rather small" aspect once a
  baseline exists; its final committed numbers (extracted from the repo's
  estimates.json) show mid-pack bevy_ecs 0.5 vs legion 0.3 — per-benchmark
  winners differ and leaderboards rot within a release.
- Rapier: determinism as an opt-in feature flag; 2026 rust-gpu physics stack
  "generally 2x faster" than the WGSL version, renderer+simulation sharing
  one device so there is no GPU→CPU readback sync (vendor).

## 6.8 Rust audio/DSP niche — three portable rules the general skills lacked

1. **Planar (non-interleaved) processing, interleave late**: planar is
   "standard for real-time DSP, optimal for SIMD" (audio-blocks taxonomy);
   Symphonia keeps its internal buffer planar and interleaves only at the
   output boundary because interleaved LRLRLR "can't be loaded efficiently
   into vector registers" to process channels separately — interleaved only
   vectorizes when the identical op applies to every channel.
2. **Kill denormals deliberately**: fundsp sets MXCSR 0x9fc0 (FTZ+DAZ) once
   at setup (src/denormal.rs, x86-only, invoked in Feedback::new — feedback
   loops breed denormal tails); CamillaDSP's portable alternative flushes
   biquad state s1/s2 with `is_subnormal()` once per block (v1.0.0);
   no_denormals wraps it in an RAII guard including aarch64 FPCR. Open
   tension: Rust assumes the default FP environment — changing MXCSR
   masking/rounding flags is formally UB per Rust's own docs, and
   rust-lang/rust#123123 (PipeWire: FTZ+DAZ is "the only way to get realtime
   behavior") asks the compiler to stop assuming; nothing landed.
3. **SIMD/FFT-friendly block sizes**: fundsp processes fixed 64-sample
   non-interleaved f32x8 blocks (allocation-free via stack BufferArray);
   CamillaDSP's rule — FFT length = 2× chunk size, so chunks should be
   powers of two or products of small primes (1296 good; 1297 prime and
   29×43=1247 bad). Plus ejmahler's RustFFT kernel rules: the three SIMD
   cost causes (in-register swaps, re-loading the same data, >10–15 live
   chunks); the winning shape runs 12 parallel column FFTs using 12 of 16
   AVX registers (radix-16 spills and loses); 40–50% of FFT time is the
   transpose; AVX-512's 32 vector registers meet only 16 GPRs for pointers.
   RustFFT 5.0's AVX code measured 5–10× over 4.0 and ≥FFTW at every tested
   size (author-reported). cpal footgun: `BufferSize::Default` through
   PipeWire's ALSA plugin yields a 1,048,576-frame buffer (21 s at 48 kHz) —
   always request `BufferSize::Fixed`.

Not reachable: the Rust Audio Discord (the community's actual hub) and the
dead rust-audio Discourse; the users.rust-lang thread on CamillaDSP's
Intel/Linux-only ~10× biquad slowdown ends unresolved (root cause never
stated in-thread).

## 6.9 TLS/crypto (rustls, aws-lc-rs, ring) — win by staying out of the data path

- rustls 0.23.37 + aws-lc-rs 1.16.0 placed first in 14 of 16 project
  benchmarks vs OpenSSL 3.6.1 and BoringSSL (Mar 2026, Xeon E-2386G,
  vendor-reported) — and the reason is not cipher speed: on Ampere Altra the
  three libraries' AES-256-GCM microbenchmarks were within 0.2% while rustls
  still trailed end-to-end, locating the difference in TLS framing/buffering.
- Quantified architecture lessons: an API-forced extra receive copy cost
  7–17% throughput (drove the unbuffered API); allocator choice more than
  doubled send throughput (jemalloc vs glibc malloc); the TicketSwitcher
  mutex→RwLock fix (PR #2193) + cutting default tickets 4→2 restored linear
  scaling to 80 cores; provider-level *dynamic* dispatch
  (`&'static dyn CryptoProvider`, PR #1448) measured mildly positive —
  dispatch dynamically at the provider boundary, statically inside per-byte
  kernels.
- SIMD-specific: ring-era rustls had ~45% lower ChaCha20-Poly1305
  throughput than OpenSSL purely because OpenSSL used AVX-512 (equalized
  when disabled); Intel later contributed AVX-512 to aws-lc-rs. RustCrypto
  sha2's backend matrix (SHA-256: SHA-NI/aarch64-sha2; SHA-512: **AVX2** +
  aarch64 sha3 ext; runtime detection default) extends the feature-flag
  check pattern the skills already teach.
- Third-party (rscrypto 8-host CI): aws-lc wins P-256 agreement, ring wins
  public-key derivation, libcrux is the fastest ML-KEM on x86 Zen while
  aws-lc-rs wins on Graviton — and the benchmark-equivalence trap: APIs with
  different precomputation boundaries (cached-public vs import-plus-public)
  produce ~10× phantom wins unless comparison contracts are stated.

## 6.10 Unicode performance (ICU4X design docs, zerovec, unicode-ident, regex folding)

- **Transform API shape** (Sivonen's string-representation doc): slice-in/
  slice-out with a restartable `(read, written)` protocol + worst-case
  estimator fns; never iterator-adaptors across FFI (their optimization
  cannot be relied on across the boundary); allocate-src.len()-first and
  grow to worst case only on shortfall (3 allocs worst case, 1 common).
- **Per-code-point lookup**: two-stage tries (2 loads below the fast limit,
  4 above) traversed zero-copy from the serialized bytes; unicode-ident's
  branchless 2-level trie with 512-bit chunks + Kuhn–Munkres chunk dedup
  classifies at 0.36–0.43 ns/call from 10.3 KB — ~6× faster than
  unicode-xid's binary-search ranges (~7 cache lines + mispredicts per
  lookup). Binary-search range tables are the anti-pattern at both ends of
  the decade (unicode-normalization made the same move in 2019).
- **Zero-copy data** (zerovec, vendor criterion numbers): deserializing a
  vec of 100 u32 drops 233.18 ns → 14.12 ns (16.5×) and a 131,072-entry map
  50.5 ms → 3.74 ms (13.5×), while large-map lookups get ~4× *slower*
  (51 → 213 ns) — ZeroMap for deserialize-heavy paths, HashMap for
  lookup-heavy. Unaligned little-endian (ULE) layout costs little for scalar
  reads; alignment is only worth chasing for vectorizable numeric data.
- **Case folding × SIMD**: ripgrep discussion #2444 (maintainer-confirmed) —
  `rg 'pat[t ]ern'` over 3 GB ran 2.5× *faster with `-i`* (0.485 s vs
  1.221 s) because folding at HIR-translation time expands the pattern into
  32 five-byte literals that Teddy SIMD-scans, while the case-sensitive
  pattern's memchr prefilter chases 'p' (67.45M occurrences). Fold at
  compile time to feed multi-literal SIMD prefilters. No Rust SIMD
  normalization/case-fold crate exists (xxUTF is C; memchr verifiably has no
  case-insensitive code).

## 6.11 Non-English communities, round 2 (Habr pages 4–8, dev.to, velog, Zhihu; Hashnode blocked)

- **GitHub's casefold crate** (via Habr, 2026-08-21): the canonical
  "why won't LLVM vectorize this" ladder, author-measured on Apple M4 —
  naive loop with a `break` on non-ASCII ~3.1 GiB/s; loop body branchless
  but break kept ~2.6 GiB/s (**a single data-dependent exit keeps the loop
  scalar; branch elimination alone is a pessimization**); break removed,
  OR-accumulator + single post-loop check + unconditional masked store
  ~7.6 GiB/s; fully branchless arithmetic → LLVM emits 16-byte NEON,
  >45 GiB/s. Powers Blackbird's 480 TB code index.
- **serde_json SWAR deep-dive** (Habr translation, 2024): the escape-class
  scan needs `\`, `"`, and control chars in one pass — a u64 SWAR "Mycroft
  trick" (9 bitwise ops) beat real SIMD on json-benchmark because short
  strings are latency-bound; +10/+23/+32% on string-heavy datasets; the
  error path's line/column recompute cost −48…−77% until replaced with
  memchr. Cautionary tale: a two-pass memchr2 variant was slower, and the
  strlcpy microbenchmark that suggested it was confounded by GCC
  auto-vectorizing one loop but not the other.
- **dev.to long tail**: the Iceberg-client comparison (Rust 1.9–4.3× faster
  than pyiceberg locally, 85–90% of the gap being reqwest vs Python
  `requests`, collapsing to ~1.0× over the internet — methodology-grade);
  the markettrace `format!` hunt (19.5% CPU symbol fixed with a 64-byte
  stack buffer; jemalloc switch; and the **benchmark-validity lesson**: a
  simd-json swap measured 0% because a hardcoded `now` tripped the
  staleness gate and the harness processed an empty set — "a benchmark
  number that looks too good is a bug in the benchmark until proven
  otherwise"); THP `always`→`madvise` dropping RSS 358→87 MB with zero code
  changes under jemalloc.
- **velog (Korean)**: GraphQL API works but tag filtering is broken at the
  API; only conceptual SIMD material (a NEON hands-on M4 post; a backend
  SIMD primer with the N-lanes ≠ N× end-to-end warning). **Zhihu**: one
  strong article recovered via the Rust Magazine mirror (Rucene inverted-
  index decompression in hand-written SSE2, Merger P95 −30%; compiler tuning
  alone ≈ +10%) — the zhuanlan portable-SIMD guide is 403/anti-bot with no
  Wayback snapshot. **Hashnode is now hard-blocked**: the public GraphQL API
  was retired behind a Pro plan (announcement page), and no global RSS
  exists — most Hashnode blogs live on custom domains a site: filter can't
  see.

## 6.12 Conference slide archives (CppCon, FOSDEM, C++Russia, CGO)

- **Krzikalla (DLR, CppCon 2024, author-measured)** — the gather verdict in
  numbers: strided struct-member loads via `_mm256_i32gather_pd` reach
  ~14/4/6 GB/s (Broadwell/Skylake/Zen 2) vs ~29/40/28 GB/s for
  compiler-built scalar-load+insert construction — 2–7× for fixed small
  strides, matching both vendors' manuals. Also: on a native-width-4 target,
  fixed_size_simd width 8 (2× native, forcing unroll) flipped a 1.05–1.39×
  SIMD *slowdown* into a 0.91–0.94× time ratio; SIMD divide costs up to
  4.01× scalar time on Broadwell; masked conditions with a lane-cost model
  (`if any_of(mask) compute branch A; where(!mask) … = branch B`).
- **yugr (C++Russia 2026, author-measured, Rust 1.87 vs Clang 20)**: safety
  checks usually <5% average (P95 11%); bounds checks alone 3–4% but some
  tests degrade 10%+; Hardened C++ checks 5× more accesses than Rust at
  comparable overhead; Rust's aliasing rules add ~5% analysis precision and
  1–2% performance. Plus a ten-pattern bounds-check workaround catalog
  (two-step reslicing `&v[i..][..n]`, farthest-element-first access order,
  `1..(n+1)` over `1..=n`, next_power_of_two masking, hoisted asserts) —
  several not in our autovec file.
- **Milovidov (ClickHouse, FOSDEM 2026)**: non-temporal stores ~1.5× only
  for large copies; a self-tuning memcpy won microbenchmarks and *failed on
  real queries* (multithreaded memcpy is memory-bandwidth-bound; exploration
  polluted the i-cache); across ~42,000 measurements no single memcpy
  implementation wins. Alignment trick: copy the first vector unaligned,
  then align the main loop's *stores*.
- **Kretz (CppCon 2023)**: the anti-pattern slide — localizing SIMD to 4
  lanes/pixel with an immediate reduction made the program *slower*;
  "consider SIMD an implementation detail" of data parallelism.
  **Yaroshevskiy**: memcmp as find_if+zip with first_true =
  any_of+reduce_min_index; single-register sorts via bitonic networks; the
  vectorized-sort lineage (Bramas, vqsort, Intel x86-simd-sort).
- **CGO 2026 (OML-vect, paper-reported)**: the two blockers to
  auto-vectorizing transformer kernels are reductions and data layout (not
  instruction selection); an MLIR reduction-detection pass + compile-time
  transpose reaches 94% (x86) / 91% (RISC-V) of baseline, *exceeding*
  manually vectorized libraries by ~2%/~8% — compiler-research confirmation
  of the Rust-side folklore.
- Negative findings: RustConf/RustBeltConf 2023–26 have **no** public
  SIMD/perf deck repos; FOSDEM 2025/26 HPC-BigData and LLVM devrooms had
  zero vectorization talks; the new FOSDEM 2026 Software Performance
  devroom is the one to watch. CppCon's GitHub deck archive is the only
  reliably open conference archive.

## 6.13 Harvest into the skills (Round 6)

Per the round's distribution constraint (five skills only), all additions
landed in rust-superopt, rust-simd-crates, rust-simd-kernels,
rust-parallel-cache, rust-fast-architecture:

1. **rust-simd-kernels** — `references/hardware-costs.md` gains the
   vendor-manual layer (Zen 5/Zen 3 width policy + 512-bit store mechanics,
   Intel license model, Neoverse SVE=128-bit + vendor gather/FADDA numbers,
   MXCSR/FPCR toggle costs, Krzikalla strided-load table, 2×-native unroll
   flip, unroll rules); `references/intrinsics.md` gains the Intel gather
   decision table + G2S + AMD rec 8, the RustFFT kernel-shape rules, and
   the compress-family/sort-lineage note; `references/autovectorization.md`
   gains the casefold data-dependent-break ladder, the serde_json SWAR
   formula, the cross-language autovec receipts, the CGO blockers finding,
   matklad's Min-of-Three rules, and the bounds-check workaround catalog;
   `references/portable-simd.md` gains the cross-language design precedents
   section; **new** `references/audio-dsp.md` (planar layout, denormal
   FTZ/flush practice + the Rust UB tension, block sizing, RustFFT rules);
   SKILL.md gains two platform-fact lines and the rung-4 batch-size/
   selection-vector rule.
2. **rust-superopt** — `references/measurement.md` gains the
   separate-workspace-member rule (annotating our own skeleton), criterion/
   hyperfine/divan statistical machinery, the timing-loop taxonomy,
   sink-fidelity, the Gungraun rename + gates, the rustc-perf IQR fence,
   matklad's black_box-free scaffold, the sharkdp fair-comparison checklist,
   the harness-validity lesson, and nnethercote's profiler ranking; SKILL.md
   gains an allocation-rate/type-size lever in the ladder.
3. **rust-simd-crates** — `references/crates-numeric-media.md` gains the
   TLS provider tier (rustls numbers, sha2 backend matrix, benchmark-
   equivalence trap); `references/crates-text-parsing.md` gains the regex
   acceleration section (case-insensitive-can-win, prefilter selection,
   contention fix) and the Unicode zero-copy/trie rules; SKILL.md notes the
   audio companions row.
4. **rust-parallel-cache** — SKILL.md gains warm-thread scheduling
   economics and the memcpy guidance; `references/cache-eviction-allocators.md`
   gains the THP always→madvise RSS diagnosis.
5. **rust-fast-architecture** — `references/production-case-studies.md`
   gains the rustls case study and the wgpu arcanization pattern; SKILL.md
   gains the Arc-clone-out-of-lock technique and the morsel mechanics
   expansion.

Hunters' proposals for **new** skills (rust-vectorized-engine,
rust-frame-loop-perf, rust-unicode-perf, a warm-thread-scheduling reference
file, updates to rust-best-practices/rust-testing) were **redirected into the
five skills** per the constraint — the OLAP batch/selection-vector rules into
rust-simd-kernels rung 4, morsel mechanics and gamedev scheduler economics
into fast-architecture/parallel-cache, Unicode/text rules into
rust-simd-crates' text reference.

## 6.14 Negative results and still-open doors after Round 6

- Zen 4 SOG unobtainable (404 everywhere, absent from AMD's search API, no
  mirror); Internet Archive was offline during the window, so Wayback
  recovery of dead amd.com/arm.com URLs never ran.
- Hashnode's API retirement means its long tail is structurally unreachable
  without a Pro plan; zhuanlan.zhihu.com stays 403 with no archive; the
  Rust Audio Discord and rust-audio Discourse are out of reach; Reddit
  remains blocked (so the wgpu "21% perf drop" community measurements and
  any r/rust challenge to Round-5/6 numbers are uncollected).
- Video-only sources stay video-only: RustNation/RustNL SIMD talks, Divan's
  FOSDEM talk, GDC streams. CppCon 2023's SIMD-algorithms PDF is
  image-only (HTML deck substitutes). RustChinaConf 2024 slides sit in a
  1.18 GB zip nobody downloaded. xxUTF's benchmarks are PNG charts.
- The CamillaDSP Intel/Linux-only ~10× biquad slowdown thread ends
  unresolved; the denormal diagnosis is inference, not proof. No maintained
  ECS benchmark suite exists to re-adjudicate "fastest Rust ECS" with
  current crates. rapier.rs's perf-tuning page 404s post-restructure.
- rustls.dev publishes AES-GCM-only tables — current ChaCha20 throughput in
  rustls must be measured locally; the 45% AVX-512 gap story is 2024-era
  (ring backend, pre-Intel-aws-lc-rs work).
- One API's compiler-knob page (icx `-qopt-zmm-usage`, gather-by-shuffles
  flags) body text stayed JS-walled; the ORM substitutes at the
  architecture level.
- Nothing in six rounds was ever measured on x86 hardware by us: every
  AVX2/AVX-512/Zen number in the entire report is vendor-, author-, or
  third-party-reported.

---

# Round 7: new optimization routes (2026-10-02)

Twelve route hunters returned, each assigned a route *outside* the SIMD core
of Rounds 1–6: GPU compute, succinct structures, string optimization,
sorting, hashing, mixed precision, async runtime tuning, zero-copy
serialization, runtime specialization/JIT, lock-free design, embedded
storage engines, and a cross-route war-story sweep. This round appends their
distillate; the skill harvest is §7.13, the new-skill proposals §7.14.

**Labeling for this round.** **[vendor]** = vendor-published;
**[author]** = the crate/paper/blog author measured their own work (the
default for most performance numbers here — independent replication was
generally not found); **[3p]** = an independent third party measured it;
**[local]** = measured on this research host class (Apple M3 Max, 12P+4E,
rustc 1.98.1) by the hunter session that reported it — benchmark projects
preserved at `/tmp/succinct-bench`, `/tmp/strcheck`, `/tmp/mixprec`.
Documentation/source facts carry their citation inline.

## 7.1 GPU compute in Rust (wgpu, cudarc, rust-gpu, CubeCL)

**The decision rule — arithmetic intensity is the gate.** Intensity = FLOPs ÷
bytes moved. Reference points [author, ayoob.ai WebGPU GEMM study]:
elementwise multiply = 0.125 FLOPs/byte, FMA/sum = 0.25, radix-sort pass
≈ 0.375, square GEMM = n/6 (128 → 21.3; 1024 → 170.7). An RTX 4060-class
GPU's operational-intensity ceiling is ~55.5 FLOPs/byte — below ~10
FLOPs/byte the kernel is memory-bound and speedup is capped at the GPU:CPU
**bandwidth** ratio (≈5× discrete, 1–2× integrated), not the ~75× compute
ratio.

**Break-evens [author]:** compute-bound work needs ≳604k FLOPs to amortize
dispatch (WebGPU dispatch 0.03–1.1 ms; CUDA launch ~10 µs [vendor, Modal]);
memory-bound work breaks even at ≈800k–1.2M elements (~4 MB) on discrete
GPUs, 2–4M on integrated. PCIe costs ~0.2 ms per 4 MB. Measured f32 GEMM
crossover vs 8-thread CPU BLAS: 64×64 → CPU wins (0.44×); 128×128 → 1.17×;
512² → 10.1×; 2048² → 21.9×; integrated-GPU crossover ≈ 512×512.

**The Apple-Silicon exception [author, bhavana.io — same host class as this
machine, verified M3 Max/40-core/Metal 4 via `system_profiler`]:** unified
memory removes the PCIe tax; an SDF-generation kernel ran 1.4 ms on GPU vs
5–6 ms for the *best possible* CPU version (ISPC SIMD + task system) — and
the algorithm change (brute force → jump flooding, 21× on GPU) mattered more
than the hardware choice.

**The wgpu route.** wgpu 30.0.1 (2026-08-22, 37.9M downloads) is the stable
floor: Vulkan/Metal/D3D12 native, WebGPU on wasm; powers Firefox/Servo/Deno.
Abstraction tax is small [3p, willusher.io marching cubes on 256³ volumes]:
RTX 3080 WebGPU 31–37.5 ms vs native Vulkan 27.5–33.4 ms (~5–27%, faster on
one dataset); M2 Max 40–54 ms. Size against the default limits (docs.rs
`wgpu::Limits`): `max_compute_invocations_per_workgroup` **256**, workgroup
storage 16 KB, 65,535 workgroups/dimension, `max_storage_buffer_binding_size`
**128 MiB** (split bigger datasets — see the `big_compute_buffers` example
with `binding_array`), 8 storage buffers/stage. Workgroups should be
multiples of the 32-wide warp/subgroup/SIMD-group (CubeCL names the axes:
Plane = lockstep width, CubeDim = shared-memory block). Layout trap: WGSL
pads `mat3x3<f32>` to 48 bytes vs Rust's 36 — validate field offsets in
tests (Matt Keeter's naga+facet harness approach). GPU vectorization gains
"saturate around 128 bits, which matches the width of a global memory load"
while CPU runtimes keep gaining to AVX-512 widths (CubeCL README) — one more
reason the CPU/GPU decision is about data movement, not peak FLOPs.

**NVIDIA and the compiler routes.** NVIDIA announced first-party CUDA Rust
on 2026-09-08 [vendor]: track 1 **cuda-oxide** (SIMT; custom rustc codegen
MIR→Pliron→LLVM→PTX; pinned nightly; early alpha; shared memory still
`unsafe`), track 2 **cutile** (stable Rust 1.89+; CUDA 13.3 Tile-IR JIT at
first launch; `partition()` makes tile aliasing a compile error; already in
HuggingFace Grout and mistral.rs). No performance numbers published
[vendor]. **rust-gpu v0.10.0** (2026-10-01; nightly-2026-07-03;
cooperative-matrix support) is active but the README still says "heavily in
development… not yet production-ready… no backwards-compatibility
guarantees" — nightly-only. Its academic arm (arXiv 2608.13759,
"GPU Offload in Rust") reports "solid kernel performance" vs hand CUDA/HIP
and 2× on FIR from algebraic-float assumptions on an RTX A2000 [author].
**VectorWare** (std::simd → GPU warp) is pre-product; its zero-cost-over-PTX
claim is unverifiable. **cudarc 0.19.10** (2026-09-24; repo transferred
coreylowman → chelsea0x3b, verified via `gh api`) wraps 13 CUDA libraries
(driver, NVRTC, cuBLAS/Lt, cuDNN, NCCL, cuSPARSE, cuSOLVER, cuFFT, cuRAND,
cuFILE, CUPTI, NVTX) for CUDA 11.4–13.4; kernels stay CUDA C, JIT'd via
NVRTC. **CubeCL** (tracel-ai, 2,404★, pushed 2026-10-01) is the maintained
Rust-native kernel DSL: one `#[cube]` function JIT-compiles to CUDA, HIP,
Metal, SPIR-V, WGSL, or CPU SIMD with comptime specialization + autotuning;
Burn's backend. Dead/dormant: `cust` (crate 0.3.2 since 2022 despite repo
reboot), `emu` (2023), `blade` (2024; Zed migrated off it to wgpu, PR
#46758). "ember"/"gamma" GPU crates could not be resolved (names taken by
unrelated dead projects).

**Route summary:** default to CPU SIMD below ~600k FLOPs / ~4 MB per
dispatch; cross-platform GPU = wgpu 30 WGSL compute; NVIDIA-only + existing
CUDA libs = cudarc; write-once autotuned kernels = CubeCL; Rust-instead-of-
WGSL is three compiler efforts, none production-proven yet.

## 7.2 Succinct and compact data structures

**Roaring bitmaps** (roaring-rs 0.11.5): each 65,536-value chunk lives in
exactly one container — Array (sorted u16), Bitmap ([u64;1024] = 8 KiB), Run
(RLE) — verified at `roaring/src/bitmap/store/mod.rs:28-32`;
`RoaringTreemap` is literally `BTreeMap<u32, RoaringBitmap>`
(`treemap/mod.rs:41`). Portable spec serialization (Rust ↔ Go/Java/C).
Paper [author, arXiv:1402.6407]: 4–5× faster intersections than Concise/WAH
on all densities; 50% of Concise's / 25% of WAH's space on sparse bitmaps;
on real data, cases with 4× Concise's memory but ~4× faster intersections.
Plain bitsets still win dense-but-cache-resident data (paper's own BitSet
finding).

Measured crossover vs sorted-vec/HashSet [local, /tmp/succinct-bench,
single-thread release]:

| case | roaring ∩ | sorted-vec ∩ | HashSet ∩ |
|---|---|---|---|
| 1M in 2³² (0.023%) | 8.70 ms | **7.97 ms** | 8.52 ms |
| 1M in 2²⁴ (6%) | **6.81 ms** | 7.62 ms | 10.2 ms |
| 6.36M in 2²⁴ (38%) | **0.092 ms** | 49.5 ms | 222 ms |
| 100k in 2³² | 1.66 ms | **0.73 ms** | 1.22 ms |

Contains: sparse — HashSet 5.8 ns vs roaring 90.6; dense-38% — parity (6.4
vs 6.5). **Decision rules:** dense/clustered or algebra-heavy → roaring
(540× over sorted-vec at 38% density); small, sparse, point-lookup-dominated
→ plain `Vec`/HashSet (sorted-vec beats roaring on space *and* merge speed
there); cross-language u32 id sets → roaring's portable serialization.

**Elias-Fano** [local, sucds 0.9.1]: bytes vs sorted `Vec<u32>` = 0.48× (1M
of 2³²), 0.23× (1M of 2²⁴), 0.14× (6.36M of 2²⁴); rank ~26–29 ns ≈ binary
search (16–39 ns) — **the win is space, not query speed**. Crates: sucds
(no-unsafe, curated), vers-vecs (constant-time predecessor/successor; BMI2
worth 2–3× on rank/select [author]), sux (Vigna; monotone MPHFs claimed
fastest [author]).

**Perfect hashing:** `phf` 0.14 = compile-time CHD (keys known at build);
`ph` = runtime MPHFs at FMPH ~2.8 / FMPHGO ~2.1 / PHast <2 bits/key [author]
— frozen key set + lookup-dominated → MPHF + plain array replaces ~48 B/slot
hash entries with 2–3 bits/key.

**ART** (ICDE 2013 [author]): Node4/16/48/256 + path compression, O(k)
ops, ~2× a hash+RB-tree combo on TPC-C, cache-driven. Rust crates young;
**artmap** (surrealdb's concurrent ART, optimistic lock coupling) is the
production-safest. **Morton codes** (morton-encoding, lindel for Hilbert):
interleave coords into a u64 and *any* ordered structure becomes a spatial
index; Hilbert preserves locality better than Z-order.

**Crate map:** roaring 0.11.5 (+croaring C bindings) · sucds/vers/sux ·
phf/ph · art/artmap · fm-index 0.3.1 (wavelet matrix over vers-vecs) ·
regex-automata dense/sparse DFA as the in-tree succinct-layout exemplar
(stride = smallest power of two ≥ 257-symbol alphabet).

**War story (sweep):** Bluesky's 5.5M-user/164M-follow graph as per-user
roaring bitmaps = ~6.5 GB RAM / ~1.6 GB disk vs ~7.5 TB naive bitmaps,
intersections <500 µs at 70k req/s [author, jazco.dev].

## 7.3 String optimization (SSO, interning, compact strings)

**Layout zoo** (sizes verified [local, /tmp/strcheck, rustc 1.98.1]):
String 24 B; Box<str> 16; CompactString 24 (Option 24 — niche) with **24
inline bytes**; SmolStr 24/23-inline O(1)-clone; EcoString **16**/15-inline
(Option = 24 — *not* niche-optimized, contradicting rosetta's table; trust
the measurement); ArcStr **8** (literal clones free); Ustr 8 (global cache);
lasso Spur key **4**.

**compact_str design** (README = the design doc): last UTF-8 byte is always
in [0,192), so bytes [192,215] encode inline length, 216 = heap, 217 =
`&'static str` (literals never copied); heap variant packs capacity in 7
bytes so `From<String>` reuses the buffer; clone specialized to two
overlapping fixed-width load/stores.

**Measured wins** (rosetta-rs 2026-03-09 run, chart-decoded ±15% [3p];
[local] numbers agree): create-from-&str ~62–72 ns inline vs 140–155 String
(2×), but **~164 ns heap vs 140 String — the SSO heap path is slightly
*slower***; clone 0.4–0.6 ns inline vs 18–24 String; equality identical
(0.6 ns); Arc<str> clone 10.9 ns vs ArcStr-literal 0.5 ns. [local]
allocation counts: 100k seven-byte strings from non-static sources = 100,001
allocations with String/Box<str> vs **1** (just the Vec) with
CompactString/SmolStr/EcoString; at 40 bytes everything reverts to 100,001
except ustr (3 uniques → 1). smartstring's heap path measured 331 ns (2.3×
worse than String) and was excluded from rosetta's access group "due to how
slow it is".

**Interning poles:** **lasso** = scoped, lifecycle stages (Rodeo →
ThreadedRodeo → frozen RodeoReader/Resolver), 4-byte keys, ahash worth 1.7×
over std hasher on `get_or_intern` [author, 2020-era benches]; ThreadedRodeo
collapses under contention (441 µs vs 34 at 24 threads [author]). **ustr** =
global never-freed cache, 8-byte handle, precomputed hash (UstrMap skips
rehashing), NUL-terminated for FFI; wins with few uniques + many copies;
DoS/cache-growth hazard on untrusted input (use `existing_ustr`). Rule:
interning is for *short-lived programs or bounded vocabularies*, and only
after profiling (rosetta's own suggestions).

**Cow discipline:** Klabnik's rule — String in structs, `&str` parameters,
`String` returns unless returning an unmutated substring. The zero-copy
extreme measured [author, fasterthanli.me 2020]: fully-borrowed serde_json =
13 allocs but 293.4 KB peak (whole file resident) vs streaming String 82.7
KB / 2017 allocs; SmartString best overall 73.8 KB / 19 allocs. Count
allocations, not ns/iter.

**Case conversion** [author, casefold benches + local spot-check]:
`str::to_lowercase` runs 26.1 GiB/s on ASCII (vectorized fast path) —
`to_ascii_lowercase` is **not** faster (21.2 GiB/s); `chars().flat_map(
char::to_lowercase)` is ~68× slower (383 MiB/s); `eq_ignore_ascii_case` at
0.3 ns is ~65× cheaper than convert-then-compare [local].

## 7.4 Sorting — the Rust sorting renaissance

**What shipped:** Rust 1.81 (PR #124032, merged 2024-06-20) replaced
`slice::sort` with stable **driftsort** and `slice::sort_unstable` with
unstable **ipnsort**; the same machinery powers `select_nth*`. Research home:
Voultapher/sort-research-rs (544★) with seven design essays under `writeup/`.
All numbers below **[author]** (Zen 3 / Broadwell / M1 Pro, the authors
measuring their own work).

**Component lessons:** branchless Lomuto partition with cyclic permutation =
2–3× whole-sort on random u64 (3.7–3.9× for the partition alone); partition
choice alone spans ~3–5× end-to-end; llvm-mca predicted 6.11 cycles/iter vs
~2–3 measured (uiCA closer) — never trust one tool. Small-sorts chosen at
compile time by type introspection (verified in `ipnsort/src/smallsort.rs`:
thresholds 16/32/32 over Freeze/Copy/size — insertion fallback, sort8_stable
ping-pong merge, sorting networks for ≤8-byte Copy types from Dobbelaere's
optimal set; ~2–3× over the old insertion small-sort). N ≤ 20 gets a
dedicated inlined insertion sort because 95+% of real calls are that small
and i-cache misses dominate there. Stable side: drift detection + lazy
"drifting" merges + powersort policy, ancestor-pivot equal-partitioning →
O(N·log K): ~2.4× flat vs old std on random, ~13× (random_d20) / ~17×
(random_p5) at N=1e6; aux buffer full-N below 8 MB then N/2. Depth limit
2·log2(N) → heapsort/mergesort replaces pdqsort's pattern-breakers.

**When NOT a comparison sort:** scalar keys ≤16 B at large N → radsort
(stable LSB radix, O(n) always, "several times faster" on hundreds+ of
elements; worse short and on 16-byte keys) [author]. Known tiny cardinality →
counting/bucket ~2.6× over std but **silently corrupts** when the assumption
breaks (the "unreasonable" essay's robustness table: match panics; branchless
counters and phf produce wrong output). Top-k → `select_nth_unstable`.
Binary-size-constrained → tiny_sort (320 B vs 3,848 B std instantiation).
Intel AVX-512 sorts beat everything only in a pattern window; on 95%-equal
data they collapsed below O(N·log N) [author].

**Methodology transferable to any kernel benchmark:** two prediction states
(trash i-cache/BTB/uop-cache before *every* iteration — randomized jump
ladder + syscall, `benches/trash_prediction.rs`), ~100 seeded input patterns
as the experiment design (cardinality/percent-random/Zipf/sorted sweeps),
types as a dimension (u64, 1 KiB structs, 13.5-cycle-compare F128) to
separate control-flow vs compare vs copy cost, symmetric speedup reporting,
and differential + miri + fuzz + kani verification. Safety essay: all Rust
sorts tested are Ord-safe; libstdc++/libc++/MSVC invoke UB on comparator
violations.

## 7.5 Hashing engine — SwissTable internals and hasher choice

**Origin correction:** the fetched primary sources date SwissTable's public
presentation to **2017**, open-sourced in Abseil 2018 (Go blog); a "2016"
origin could not be confirmed. Rust std has used hashbrown since **1.36.0**
(PR #58623, replacing a Robin Hood table); the std default hasher has been
**SipHash-1-3** since 1.11.0 (PR #33940).

**Mechanics** (hashbrown master, read this round): 64-bit hash → H1 (57
bits, bucket) + H2 (top 7 bits, 1-byte control tag). 16-slot groups scanned
with one SSE2 cmpeq+movemask — a ~1/128 per-slot false-positive filter so
keys are rarely touched. Triangular-number probing (jumps of 1, 2, 3, …
groups) visits every group exactly once in power-of-two tables
(`src/raw.rs:66-90`). Load factor 7/8 (`cap*8/7` → next power of two;
`src/raw.rs:104-176`). **AVX deliberately skipped**: "the probability of
finding a match drops off drastically after the first few buckets"
(`src/control/group/mod.rs`); NEON long lost to multi-cycle latency (a
NEON backend now exists for LE aarch64 — trust the source, not the 2019
essay). Resize rehashes everything (H1 is not stored) — `with_capacity`
before bulk inserts is the cheapest fix in this route. README: ~2× vs old
std HashMap, 1 B/entry overhead, empty maps allocate nothing [author].

**Hasher-choice tree** (measured deltas from nnethercote's perf book,
rustc-measured [author]): untrusted keys → SipHash-1-3 (std default); fx→
SipHash costs 4–84%, fnv→fx gains up to 6%, fx→ahash *lost* 1–4% on rustc.
Trusted integer-heavy in-process → **FxHash** (rustc-hash 2.x redesigned as
a polynomial hash; classic fx's zero-run and low-entropy-bit weaknesses no
longer apply per its README). Keyed app maps → **ahash** (AES intrinsics;
not for persistence). **foldhash** = hashbrown ≥0.17 default ("minimally
DoS resistant", no interactive-attacker claim) — its author-run tables: 4.4–
6.2 ns vs SipHash-1-3's ~22–29 ns [author]. Max portable throughput →
**rapidhash** (fastest to pass all SMHasher/3 [author]; note it is *not*
SIMD — see rust-simd-crates' premise-correction list). Already-random ints
→ nohash-hasher. A June-2026 users-thread [community] confirms std's gap vs
C++ `unordered_map` on int inserts is mostly SipHash (Get-Hit N=1M: std 480M
cycles vs Fx 129M / AHash 103M, RDTSCP, methodology flagged in-thread).

**Switch to BTreeMap/sorted-Vec when:** sorted iteration, range scans,
min/max, predecessor/successor, or deterministic latency is needed (std
collections guidance); small n → sorted Vec + binary search (no hasher at
all). Cross-language validation of the table design: Go 1.24's Swiss maps —
up to 60% faster microbenchmarks but ~1.5% geomean in full applications
[vendor]; split key/value groups saved 56 B per 8-slot group [3p explainer
of Go-team results].

**Sweep addition:** MultiTable (arXiv 2609.39233, Sep 2026, Rust reference
impl) claims arithmetic-mean 2.1× hashbrown throughput over 84 configs and
operation at physical load factor up to 0.9999 [author, preprint — not
third-party validated].

## 7.6 Mixed precision and quantization on CPU

**The rule every crate converged on: storage dtype ≠ compute dtype.** f16/
bf16 = storage; f32 = compute (unless native narrow arithmetic *and* kernels
exist); int8 = compute too, where dot instructions exist (SDOT/UDOT/i8mm,
VNNI). rten is the bluntest: f16 weights are upconverted to f32 at load
(README:54-55).

**Measured [local, /tmp/mixprec, 12 threads, DRAM-resident 2^27 stream]:**
f32 29.5 el/ns (118 GB/s); f16+FCVT 53.6 (**1.82×**); bf16 47.7 (**1.62×**);
i8 101.4 (**3.44×**) — all saturating ~95–118 GB/s: purely a bytes-per-
element win; single-thread the f16 loop matches f32's element rate
(conversion hides in load latency). Conversion in isolation (2^25, 1T):
f16→f32 scalar 3.62 el/ns vs NEON 18.77 (**5.2×**); **bf16→f32 scalar 17.67
— nearly free without SIMD because it is a 16-bit shift**. DRAM dot
products: f16 1.57× f32; i8 SDOT **8.2×** (1.70 vs 13.96 ms, 2^26). The
only independent corroboration found: Futhark measured 1.38× (naive) to
1.93× (packed) for f16 vs f32 summation [author, GPU].

**Verified platform facts:** `aarch64-apple-darwin` enables **dotprod and
fp16 target features by default** (`cfg!(target_feature="dotprod")` → true,
rustc 1.98.1) — the autovectorizer emits SDOT/FCVT from plain loops (objdump
on the bench binary: 148 sdot, 64 fcvtl sites); check before hand-writing.
Native f16 *arithmetic* intrinsics (`vfmaq_f16`) are **unstable on stable
Rust** (stdarch_neon_f16, rust#136306; compile error reproduced) — only
conversions are stable; crates route around via inline asm. x86: F16C is
conversion-only; bf16 needs AVX512-BF16 (half crate docs). Pre-VNNI x86
int8 saturates in VPMADDUBSW → 7-bit "range reduced" quantization (rten
docs — a correctness footgun).

**Framework map:** gemm 0.19 (f16 default feature; `MixedSimd<f16,f16,f16,
f32>` = f32 accumulator at gemm-common/src/simd.rs:2078; native vfmaq_f16
microkernels on aarch64) · rten (f32 GEMM + int8; docs/quantization.md is
the best in-repo decision doc: "1.5–3× typical" for <1 GB models [author];
LLMs → int4 MatMulNBits) · candle (F16/BF16 native on CPU, matmul → gemm;
ggml k-quants with asm SDOT/i8mm) · burn-flex (burn-ndarray deprecated;
f16 native via gemm, bf16 via f32; dequantize 135–232× faster than
burn-ndarray [author]).

## 7.7 Async runtime performance (tokio tuning, wake discipline)

**Task economics [3p, jimblandy context-switch suite]:** ~0.2 µs/context
switch and ~0.4 KiB/task vs ~1.7 µs / ~20 KiB for OS threads — but the
advantage evaporates when I/O readiness or single-core pinning dominates.
Tokio's tutorial blesses spawn-per-connection (single allocation, 64 B).
Anti-pattern with numbers [3p, users.rust-lang]: recursive task-per-call
fanout with unbounded channels — `join!` 6.6 s vs 0.5 s sequential
(fibo(29)), 1156 s vs 6.3 s at n=32; it reduces to an allocator stress test
(jemalloc leveled it to 4.7 vs 5.4 s).

**Coop budget:** 128 ops/tick (`Budget::initial()` — source-verified; the
value was chosen because it "felt good" [vendor blog]; tail latencies
"reduced by almost 3×" [vendor]). Combinators that re-implement scheduling
fight it: `FuturesUnordered` + budget was **quadratic** until futures
0.3.19's 32-iteration cap (ScyllaDB post-mortem — their driver also ran 2×
the C driver's CPU from unbuffered I/O; BufReader/BufWriter fixed it).
`unconstrained()` opts out and re-exposes starvation.

**Blocking discipline** (ryhl.io): ≤10–100 µs between `.await`s; CPU →
rayon; short sync I/O → `spawn_blocking` (default pool cap 512); forever →
dedicated thread. `block_in_place` panics on current-thread runtimes;
`Runtime::block_on` panics inside async. `tokio::fs` is spawn_blocking +
copies — std wins for local files [3p post-mortems].

**Wake discipline:** `watch::send` wakes **all** watchers
(`notify_waiters()`, source-verified); broadcast drains the whole waiter
list — one wakeup per receiver per send. LIFO slot helps ping-pong, hurts
long polls (`disable_lifo_slot` unstable); single-epoll contention at high
core counts is a live design question (io_shards PR open, unmerged).

**Cancellation safety** (select! docs): safe — `recv`, `read`, `accept`,
`next`; unsafe (data loss) — `read_exact`, `read_to_end`, `write_all`; unsafe
(queue position) — `Mutex::lock`, `Semaphore::acquire`, `Notify::notified`.
Fix patterns: reserve-permits before send; Cursor-resume for writes
(sunshowers.io). **Futurelock** (select! over `&mut future` + await in a
handler) hung essentially every HTTP request at Oxide (omicron #9259;
mitigations: spawn/JoinSet, `try_send`) — RFD 609. io_uring runtimes break
drop-to-cancel: dropping an `accept()` future leaks the kernel-completed
connection (tonbo.io; epoll/tokio unaffected).

**Diagnosis loop:** tokio-console (`RUSTFLAGS="--cfg tokio_unstable"`, port
6669, 6 s retention) — five lints: self-wakes (>50%), lost-waker,
never-yielded, auto-boxed-future, large-future; plus poll-time histograms.
Known trap: `test-util` leaked into release made `Clock::now` a contention
point that scaled negatively on 24 cores [3p].

**Post-mortem ledger (compressed):** ScyllaDB (2× CPU → buffering + futures
0.3.19) · Clock::now (test-util + resolver=1) · join! fibo (task explosion)
· Oxide futurelock (spawn/try_send) · Dropshot (spawn per request) · tokio
fs (use std) · Pingora validating spawn-per-connection at 1T req/day
(vendor: 70% CPU / 67% memory less than nginx).

## 7.8 Zero-copy serialization (rkyv, capnp, flatbuffers, Arrow, postcard)

**The argument** (rkyv book, read in full): serde's two-stage model always
pays read-parse-reconstruct; partial borrowing still constructs containers;
total zero-copy makes the buffer *be* the struct via `#[repr(C)]` mirrors +
**relative pointers** (relocatable, no write access needed → mmap read-only;
root at buffer *end* so access needs no stored root). Alignment is the
pitfall (AlignedVec, 16-byte; prefix bytes must be sliced off).

**Measured** (rust_serialization_benchmark 2026-09-10, AMD EPYC 9V74 —
**suite maintained by rkyv's author; treat as author-affiliated**), `log`
dataset: rkyv serialize 178.87 µs, deserialize-to-native 1.22 ms, **access
1.09 ns** (unvalidated) / 274 µs (validated upfront) vs flatbuffers access
2.18 ns but **2.14 ms validated**; capnp access 64 ns (lazy on-demand
validation; validated read 117.7 µs — beats rkyv's 279.7 µs when you touch a
slice); sizes: bitcode 704 KB < postcard 725 KB < rkyv 1011 KB < capnp 1443
KB (1047 packed) < serde_json 1827 KB. Flat data (mesh): validation nearly
free (rkyv 4.5 ns validated). 2021 snapshot (with bincode): even rkyv's full
deserialize was only 1.4–4.3× faster than bincode — **the headline win was
never deserialize, it's the O(1) access path**.

**The trade:** no schema evolution and no cross-language is *why* rkyv may
be fastest (Cap'n Proto author's HN critique; rkyv's own feature matrix
confirms). Production echo: Climatiq embeds rkyv-parsed edge datasets but
maintaining a duplicate archived type per struct is "a bit of a bother".

**Arrow** = the same bet at array level, in 100% safe Rust: IPC format
"identical" to the in-memory format, mmap analytics with no deserialization,
Flight puts `data_body` last so it can be pulled zero-copy; filter kernels
compile bitmaps to runs (`SlicesIterator`) — the columnar twin of the
selection-vector pattern. InfluxDB 3.0's FDAP stack exists to avoid
transcoding; "5× better compression than specialized TS formats" [vendor].

**Decision rules:** read-mostly bulk data consumed in slices, fixed or
rebuildable schema → rkyv (budget validation by structure count; untrusted
input → upfront or capnp-style lazy). Analytical/SoA, multi-engine, zero-copy
without unsafe → Arrow IPC/Flight. Cross-language + schema evolution → capnp
(lazy Result reads) — flatbuffers only if unset-field elision matters and
the Rust verifier cost is acceptable. Small fully-consumed messages →
postcard/bitcode (smallest wire, no_std). If you'd materialize everything
anyway, serde+parse is fine.

**Sweep additions:** Iggy abandoned rkyv for a custom offset-indexed format
(couldn't slice cached batches into Archived views; "heavy crate that
spreads through your entire application") — consumer 2.1→4.0 GB/s, p99
2.93→1.46 ms [author, AWS i3en.3xlarge]. Serde borrowing pitfall: bare
`&'a str` fails **at runtime** on escaped strings; use `Cow<'a,str>` +
`#[serde(borrow)]` (serde#1852). musli-zerocopy in-place disk layout:
1M reads of an 11-field struct 563 ms vs 1.072 s JSON [author]. Databend's
zero-copy-AST parser rebuild: 13.29 s → ~4 s parse (3.3×), memory 5× → 1.2×
input [vendor].

## 7.9 Runtime specialization and JIT

**Origin:** Neumann's HyPer (PVLDB 2011, PDF extracted) — LLVM JIT vs
generated C++: TPC-H Q1 142→35 ms with compile 1556→16 ms; Q5 1416→1105 ms
with 2592→34 ms; TPC-C 169,491 tps at 0.81 s total compile. The canonical
amortization template: compile cost (16–34 ms) must be bought back by
per-execution savings × runs. Umbra then hit LLVM's compile wall (a
2000-join query: 150 s LLVM, 4 s at -O0, <0.04 s custom backend) and solved
it with interpreter tiering; **DuckDB chose the opposite** — interpreted but
vectorized ("a large batch of values processed in one operation").

**Copy-and-patch** (Xu & Kjolstad, **OOPSLA 2021** — venue corrected from
CGO): precompiled stencils copied+patched at runtime; high-level compiler
compiles two orders faster than LLVM -O0 with code 14% faster; WASM compiler
4.9–6.5× faster compile than Liftoff with 39–63% faster execution [author].
Production users verified: **CPython 3.13 = yes** (PEP 744; build-time clang
only; currently "about as fast as the specializing interpreter" with 10–20%
more memory — chosen for zero runtime deps, not speed); **JavaScriptCore =
no** (tiers LLInt→baseline→DFG→FTL/B3; no copy-and-patch tier documented —
premise corrected).

**Cranelift** ceiling, maintainer-stated with third-party citation: ~2%
slower than V8 TurboFan, ~14% slower than an LLVM engine, ~10× faster
compilation (copy-and-patch paper Fig. 22). Wasmtime tiers: Winch (single-
pass baseline) vs Cranelift; guidance = **remove compilation from the
critical path (AOT + cache) before tuning compilers**.

**Correction:** rust-lang/regex **never** used dynasm (GitHub search total:
0; full-history grep clean; JIT requested in #325, 2017, and rejected —
"the overhead of interpretation is mostly removed in the DFA"; "building a
good JIT takes year(s)"). Its shipped technique is the **lazy DFA**: builds
at most one state per byte searched, amortization without executable memory.
A 2026 community Cranelift-DFA experiment (wareya: 653.9 µs vs regex 1.77 ms
on one lexer bench, ~2.7×) was disputed by the maintainer — full-DFA-ahead-
of-time is "mostly a non-starter" for a general engine. dynasm-rs itself is
alive (x64/aarch64/riscv; Wasmer SinglePass, lightbeam, sp1-jit lineage).

**Decision rule (synthesis):** specialize only when `compile_cost/runs <<
generic − specialized` AND dispatch overhead dominates (if a table or
vectorization already removed dispatch — DFA, 2048-row batches — the JIT's
margin shrinks to tens of percent); tier by compile budget (copy-and-patch/
dynasm for startup latency, Cranelift/LLVM for hot code, interpreter+async
compile à la Umbra when mixed); specialize lazily at use time when
worst-case compile is unbounded (regex's answer).

## 7.10 Lock-free deep design (crossbeam, seqlock, left-right)

**Reclamation.** crossbeam#221 ("Mustardwatching", the canonical essay):
*granularity of hazards is the most important SMR design choice* — EBR is
coarse (pin ≈ 7 ns, defer ≈ 17 ns [author, 2018]; one long-pinned thread
delays all reclamation), HP is fine-grained (per-pointer, aggressive, slower
to advertise); the EBR+HP hybrid cost 5.5× on flush (110→608 ns). rfcs#25
decision rules: "traversing a linked data structure is almost certainly
faster using EBR"; HP for long-lived iterators/wait-free queues and eager
retirement. crossbeam-epoch internals (read from source): bags of
MAX_OBJECTS=64, collection attempted every 128 pins, 8 bags per pass.
**Hazard pointers never landed in crossbeam** (git-tree grep: zero files);
the Rust HP crate is jonhoo's haphazard 0.1.8 (dormant since 2023-12). The
active frontier is **seize** (hyaline, arXiv 1905.07903): refcounts only on
retired batches → "performance competitive with epoch schemes, memory
efficiency similar to hazard pointers" [author]; papaya's essay rejects
refcounting ("similar cost to an RwLock, single contention point") and EBR's
global epoch blocking for the same reason.

**Read-mostly structures:** **seqlock** 0.2.0 (Amanieu; Linux-kernel
derived; `T: Copy` only — torn reads repaired by retry are only sound for
memcpy-able data; "up to two orders of magnitude over RwLock" for readers
[author]; stale since 2023). **arc-swap** 1.9.2: `load` *borrows* via
per-thread slots (no refcount contention, "mostly wait-free"); `load_full`
to own; writer costlier than an uncontended Mutex — fine under contention.
**left-right** 0.11.8 (jonhoo, active): two copies + oplog; reads update a
reader-indicator epoch (two cache-line invalidations per writer flip),
every op applied twice, ops must be deterministic, ~2× memory — wait-free
population-oblivious reads that "scale linearly with cores" [author];
evmap is the map-shaped consumer (its own benchmarks "outdated"; 18.4 Mops/s
read-heavy @10t in the modern shootout — not magic).

**Concurrent map shootout** (conc-map-bench, dashmap author's harness,
author-committed CSVs analyzed at 10 threads, Apple M1 Pro; author concedes
"not 100% scientific"):

| Map | ReadHeavy std | ReadHeavy ahash | Exchange std | RapidGrow ahash |
|---|---|---|---|---|
| SccMap | 62.8 | **89.5** | **49.6** | **69.7** |
| DashMap | **63.9** | 75.5 | 39.7 | 54.4 |
| Flurry | 58.0 | 60.7 | 15.5 | 13.3 |
| Contrie | 37.5 | 55.9 | 18.0 | 26.7 |
| Evmap | 18.4 | 24.3 | 1.3 | 1.8 |
| CrossbeamSkipMap | 4.8 | 4.8 | 4.1 | 4.4 |
| CHashMap (lock) | 3.2 | 3.2 | 2.4 | 2.4 |

(Mops/s.) Takeaways: ~20× sharded-vs-locked on reads; **std→ahash alone =
+42% SccMap, +18% DashMap — the hasher rivals the map**; EBR skipmap is 13×
off DashMap on reads (pointer chasing). papaya (same harness, Ryzen 9
9950X, plots only — numbers not extractable) wins read-heavy, loses
update-heavy to allocator pressure, insert tails "orders of magnitude" below
dashmap [author]; flurry's README now advises papaya/dashmap instead.
dashmap internals (verified in src/lib.rs): default shards =
`next_power_of_two(cores×4)`, power-of-two only (panics otherwise), shard =
high hash bits (`(hash << 7) >> shift`, low 7 reserved for hashbrown's tag).

**SPSC/MPMC ladders:** mutex 12M ops/s → atomics + cache-line padding 35M →
acquire/release tuning 108M → caching the peer's index 305M (**25×**,
author-reported, pinned cores); rules: own-index loads Relaxed, power-of-two
capacity (mask), verify with `perf stat -e cache-misses`
(david.alvarezrosa.com). A Zig L2-batch reserve/commit ring reports 514M
msgs/s at 8P1C vs 4M for a CAS queue [author, cross-language datapoint].

**Validation:** loom = exhaustive under C11 but **unsound** (no
load-buffering exploration; SeqCst modeled as AcqRel → false alarms) — "a
bug can exist even if Loom says there is none" (README); shuttle (awslabs,
0.9.5 released 2026-10-01) = randomized/PCT, scales where loom can't,
>99.9999% detection claimed on a simple two-thread race, deterministic
failure reproduction. Rule: loom for small cores, shuttle for suites,
miri/TSan in CI (crossbeam-epoch hardens MAX_OBJECTS=4 under miri).

## 7.11 Embedded storage engines (fjall, redb, LMDB, SQLite)

**Crate map:** fjall 3.x (leveled LSM, 100% safe Rust, forbid-unsafe) ·
redb 1.x+ (COW B+tree, **no mmap** — pwrite + `sync_data`; double-buffered
commit slots; MVCC single-writer) · LMDB via heed (mmap'd COW B+tree;
**1.0 released 2026-07**: page checksums, encryption, 2PC, parallel
read-your-writes) · sled (**still beta** — README defers to SQLite/RocksDB/
LMDB; storage being rewritten as komora/marble; the HYTRADBOI 2025 talk is
the post-mortem: "I hit a wall", complexity itself was the enemy) · SQLite
(rusqlite; the reliability baseline every other author points to).

**LSM mechanics** (fjall blog, author-derived): worst-case point-read I/O =
`L0_segments + (level_count − 1)`; **level fanout is the read-amp/write-amp
dial** (high fanout = faster reads + higher write amp; target level size =
fanout^level; defaults 64 MiB segments, fanout 8). Bloom filters ≈ 10
bits/key; **hash sharing** (SHaMBa) makes per-query hashing O(1) — otherwise
>24 unchecked segments can exceed 1 µs CPU, "slower than simply reading from
an SSD"; v3 unpins filters below L1 and single-allocation blocks with
embedded sparse indexes cut block memory overhead 2–5× and uncached reads
2×–100× [author]. redb's own cross-engine table (author-run, Ryzen
9950X3D + NVMe): LMDB fastest reads nearly everywhere (random reads 637 ms
vs redb 1138 / rocksdb 2911 / fjall 2177 / sqlite 4283); redb fastest
individual writes (920 ms); fjall fastest batch writes (353 ms) and removals
(6004 ms) — the qualitative B-tree-reads/LSM-writes ordering is consistent
across both authors' tables, which is the only reason to lean on it.

**The mmap debate:** CMU CIDR 2022 ("Are You Sure…?") — four problems
(transactional safety, I/O stalls, SIGBUS error handling, TLB-shootdown
contention), MongoDB/InfluxDB abandonments on record, prescription "mmap
only for read-only in-memory working sets — otherwise never". Howard Chu's
rebuttal: LMDB's mmap is **read-only by default** (clean pages, instantly
reclaimable; the dirty-page critique doesn't apply), the paper benchmarked
fio not a DBMS, and only the OS sees global memory state — free, optimal
paging across the tree-of-trees. `MDB_WRITEMAP` "may be slightly faster for
DBs that fit entirely in RAM, but is slower for DBs larger than RAM"
(lmdb.h). Field reports (HN, single-source): multi-hundred-GB write stalls
(OpenLDAP #10236 "confirmed for years"), disk-growth pathologies fixed by
sharding or periodic compaction.

**Durability dial (per write, not per database):** fjall `PersistMode`
Buffer (survives app crash, not power) / SyncData (fdatasync) / SyncAll
(fsync; automatic on journal rotation); redb `Durability::None`/`Immediate`;
LMDB default flush-on-commit, NOMETASYNC = ACI-not-D, NOSYNC = corruption
risk on system crash (ACI-only if the FS preserves write order and no
WRITEMAP); SQLite WAL `synchronous=NORMAL` makes "the checkpoint the only
operation to issue an I/O barrier". **fsyncgate** (LWN 2018): fsync() can
return success after a failed writeback because filesystems discard failed
pages — check fsync errors as a contract and know which layer owns the
barrier. Sweep additions: fractalbits moved object-storage metadata from
RocksDB to an on-disk adaptive radix tree (O(path) lookups, atomic renames)
— 1M S3 GET ops/s at p99 ~5 ms on one m7gd.4xlarge [vendor]; redb-turbo
fork adds AES-GCM + zstd pages (28 B/page crypto overhead) [author].

## 7.12 Cross-route sweep (war stories not folded in above)

- **TCP zero-copy / sendfile** [author]: MSG_ZEROCOPY/io_uring send_zc give
  30–40% single-flow single-CPU throughput (io_uring cover letter;
  corroborated "roughly on the order" by the blog author) — bulk throughput,
  not latency; needs scatter-gather DMA. Go forensics: wrapping a file in
  any `io.Reader` disabled sendfile → 24× slower (2,958 → ~131k syscalls);
  verify with strace, forward `WriterTo`/`ReaderFrom`.
- **coroTracer** (repo war story): M:N scheduler throughput "collapsed to
  zero" under load — a **lost wakeup** invisible to ASAN/TSan; the tool
  traces futex/wakeup transitions to surface exactly this class (no numbers
  published).
- **Meilisearch CTO's indexer essay**: 250M docs in ~20 h; a customer at
  311M docs; a 96-core machine could not be used efficiently — ~21 inverted
  indexes of word→docids bitmaps per database; direction = parallel indexing
  + memory management for 100M+ doc sets.
- **GPU extras:** zero-copy WASM↔Metal inference (wgpu HAL imported
  directly; KV-cache restore 1.4 ms vs 67.7 ms; ~9 ms/token Llama 3.2 1B on
  M1) [author]; themaister's compute-first GPU programming rules (workgroups
  64/(8,8)/(4,4,4); subgroup sizes 4–128 by vendor); slurpjson (JSON on wgpu
  as parallel prefix scans — research, no numbers yet).
- **zerocopy codegen verification** (jack.wrenn.fyi): CI asserts generated
  machine code against checked-in models via cargo-show-asm — replacing
  "#[inline(always)] and faith in LLVM". Aligns with this report's
  verify-the-codegen discipline (Rounds 1–6).

## 7.13 Harvest into the five skills (Round 7)

1. **rust-superopt/SKILL.md** — cold-state benchmarking subsection (trash
   i-cache/BTB per iteration; symmetric speedup; llvm-mca's 6.11-vs-~2–3
   cycles/iter miss); two new routing-table rows (GPU → rust-simd-kernels;
   sorting stays here); "Sorting quick rules (Rust ≥ 1.81)" block.
2. **rust-simd-crates/SKILL.md** — hashbrown SwissTable as the
   horizontal-SIMD/metadata-filtering case study (SSE2 16-wide control-byte
   groups, ~1/128 false positives, AVX-skipped rationale, triangular
   probing, 7/8 load); mixed-precision crate map (gemm/rten/half/candle/
   burn-flex) with the storage≠compute rule and the [local] DRAM-bound
   multipliers.
3. **rust-simd-kernels/SKILL.md** — "when to stop SIMD and move to the GPU"
   (intensity gate, break-evens, dispatch/PCIe costs, GEMM crossover,
   unified-memory exception, wgpu limits, WGSL padding trap, crate route
   map); mixed-precision kernel rules (conversion costs, dotprod/fp16
   default-on aarch64-apple-darwin, vfmaq_f16 instability, VPMADDUBSW
   saturation); the comparator-generic ILP-over-lanes lesson from ipnsort.
4. **rust-parallel-cache** — new SKILL.md section (concurrent-map chooser +
   hasher-rivals-map rule + reclamation chooser + SPSC ladder + loom/shuttle
   validation) and **new reference file**
   `references/concurrent-maps-lockfree.md` carrying the full tables, the
   hasher-choice tree with reserve discipline, dashmap shard math, and
   left-right/seqlock/arc-swap mechanics.
5. **rust-fast-architecture/SKILL.md** — "Tokio tuning and failure modes"
   (task economics, 128-op budget, blocking rules, wake discipline,
   cancellation-safety classes + futurelock + io_uring caveat, tokio-console
   lints, known traps); "Serialization: parse vs zero-copy" decision matrix;
   "Runtime specialization: when JIT beats generic code" (amortization
   inequality, tier menu, Cranelift ceilings, lazy DFA); embedded-storage
   routing pointer.

Hunters' suggestions that would have gone to rust-best-practices /
rust-async-patterns / a new rust-gpu-compute skill were folded into the five
per this round's constraint: async discipline into fast-architecture's
existing runtime chooser, GPU into simd-kernels + superopt routing.

## 7.14 Proposed new skills (designs only — awaiting approval)

Three routes have no home in the five-skill family and enough measured
decision rules to justify a skill. Designs recorded here and in the round's
result payload; nothing created yet.

1. **rust-succinct-structures** — choose compact data structures when memory
   or set-algebra cost dominates. Files: `SKILL.md` (density/mutability/
   query-axis decision table + crate map), `references/bitmaps-rank-select.md`
   (roaring container mechanics, paper numbers, Rank9Sel/DArray, vers-vs-
   sucds), `references/ef-mphf-tries.md` (Elias-Fano measured space tables,
   phf/ph MPHF bits-per-key, ART node layouts, Morton/Hilbert keys).
   Rationale: the material is data-structure selection with its own measured
   crossovers (roaring wins ≥6% density, sorted-Vec wins sparse) — not SIMD
   kernels, not threading, not service architecture; rust-fast-architecture
   is service-shaped and near its line budget.
2. **rust-string-perf** — string type selection, interning, and case/Cow
   discipline. Files: `SKILL.md` (decision tree: String default → Box<str>
   keys → Cow for literal-heavy → SSO after profiling → interning for few-
   uniques-many-copies; case-conversion rules), `references/string-types.md`
   (the layout zoo with verified sizes, rosetta + local numbers, lasso-vs-
   ustr poles, allocation-counting method). Rationale: crosses every layer
   (type size, allocator rate, hashmap keys, parsing) with measured backing
   (100,001→1 allocations) and does not fit superopt's rung-3 bullet.
3. **rust-embedded-storage** — durable local state. Files: `SKILL.md`
   (engine chooser + durability ladder + mmap decision),
   `references/lsm-tuning.md` (fanout/amp math, bloom hash sharing, per-level
   compression, L0 discipline), `references/durability-fsync.md` (fsyncgate,
   per-engine sync semantics, crash-testing). Rationale: storage is a
   subsystem with its own correctness dimension (durability) and war-story
   base (sled's beta saga, LMDB stalls); only a routing pointer fits
   fast-architecture.

## 7.15 Negative results, corrections, and open doors (Round 7)

- **Premise corrections:** SwissTable origin is 2017-presentation/2018-Abseil
  (no primary source for "2016"); JavaScriptCore does **not** use
  copy-and-patch; rust-lang/regex never used dynasm; copy-and-patch is
  OOPSLA 2021, not CGO; Option<EcoString> is 24 bytes (rosetta's table says
  niche-optimized — measurement wins); `to_ascii_lowercase` is not faster
  than `to_lowercase` on ASCII.
- **Unresolvable:** "ember"/"gamma" GPU crates (names taken by unrelated
  dead projects); Armin Ronacher's async post (404, not in HN index); kanal's
  benchmark numbers (image-only); papaya's exact Mops/s (SVG plots only);
  fjall 3.0 benchmark values (chart images); a "tokio wake storm" deep-dive
  (nearest: coroTracer's lost-wakeup collapse).
- **Not independently reproduced:** every rkyv/capnp/flatbuffers number
  (author-maintained suite); all GPU break-evens (author-run); conc-map-bench
  (author-committed); MultiTable (preprint); Lite³'s 120×/242× claims
  (self-reported); lasso's 2020-era benches.
- **No x86 measurements** were run this round either (same host constraint
  as Rounds 1–6): F16C/VNNI/BF16 claims rest on rten docs, oneDNN, and an
  Intel community thread.
- Local benchmarks this round ([local] labels) are single-session,
  best-of-N, uniform-random data — treat as directional crossovers, not
  absolute rates; the roaring/Elias-Fano tables in particular used uniform
  random sets, not the clustered real-roaring-datasets corpus.

# Round 8: type-level optimization and service-communication performance (2026-10-02)

The loop converged after 3 discovery rounds; the judge counted 34 novel
items across the 17 hunter packets synthesized here. Scope this round: the
**type-level lever** (layout, niches, ZSTs, dispatch, inlining, const
generics), **indirection and container selection**, **zero-copy buffer
discipline**, **channels/actors/cross-thread costs**, and the
**service-communication stack** (HTTP transport, gRPC/RPC, serialization
formats, web-framework routing/middleware). Labels: **[R8-local]** = measured
this round by the hunters on the research host (Apple M3 Max / Apple Silicon,
rustc 1.98.1 unless noted; artifacts: `/tmp/typeopt`, `/tmp/zc/zcheck`,
`/tmp/indir_bench`, `/tmp/dsbench`, `/tmp/mtbench`, `/tmp/chanbench`,
`/tmp/chanspin`, `/tmp/memcpy_threshold`, `/tmp/mwbench`, `/tmp/varint_check`,
`/tmp/grpc_rust_research`, `/tmp/h2resolve`,
`/Users/hmziq/ZCodeProject/serde-bench-t8`,
`/Users/hmziq/ZCodeProject/router-bench-check`); **[3p]** = independent
third party; **[vendor]/[author]** = vendor- or author-reported, not
reproduced. Three follow-up verifier packets resolved the round's internal
contradictions (memcpy threshold, channel crossover, the avro multiplier) —
verdicts in §8.10.

## 8.1 Type-level optimization: layout, niches, ZSTs, dispatch, inlining

**Field layout.** Default `repr(Rust)` **reorders fields**: `struct
{u8,u64,u8}` measures 16 B vs 24 B for `repr(C)` (and 10 B packed);
`[struct;100]` = 1600 vs 2400 B (−33%) [R8-local, /tmp/typeopt; Rust
Reference "Type Layout" — the default ordering is *unspecified*, so source
field order is not an ABI]. Rules: never hand-sort fields (the compiler
already does it); reordering is **per-type, not global** — `Nested
{u8, RustReorder, u8}` = 24 B, not 18: flatten hot structs, don't nest them,
because the inner struct's trailing padding is not squeezed; `repr(C)` only
at FFI boundaries (and FFI packed wants `#[repr(C, packed)]` — packed alone
does not fix ordering, and references to its unaligned fields are UB);
`#[repr(align(N))]` can only *raise* alignment (power of two ≤ 2²⁹).

**Niche optimization — what is guaranteed vs what rustc actually does.**
The *guarantee* (std `Option` "Representation",
https://doc.rust-lang.org/std/option/index.html): `Option<T>` is same
size/ABI as T only for `Box`, `&T`, `&mut T`, `fn`/`extern "C" fn`,
`NonZero*`, `NonNull`, and `#[repr(transparent)]` wrappers of these — the
exact list for which `Some(t) ↔ t` transmutes are sound. Measured
consequences [R8-local]: `Option<&u8>`/`Option<Box<u64>>`/`Option<fn()>` = 8,
`Option<NonZeroU32>` = 4, `Option<&str>` = 16 (ptr is the tag, len payload),
`Option<String>` = 24, `Option<Box<dyn Debug>>` = 16 (niche survives the fat
pointer), **`Option<*const u8>` = 16 — raw pointers have no niche** (0 is a
valid value). Beyond Option: **multi-variant enums do not niche-pack** —
`enum {A(&u64), B, C}` = 16 B, and even 7 unit variants alongside a `&u64`
payload stays 16 B, because rustc's scheme requires "a single tag location"
(steffahn, https://users.rust-lang.org/t/why-cant-this-enum-be-niche-optimized/61633);
`Option<Option<&u64>>` = 16 likewise. What *does* work: payload-in-
discriminant (`enum{A(NonZeroU32),B}` = 4 B; `enum{A(char),B}` = 4 B using
the surrogate gap), stacked bool niches (`Option<Option<bool>>` = 1 B), and
tag+payload packing (`enum{A(Box<u64>),B(u64)}` = 16 B). **Killing niches by
accident:** adding `#[repr(u8)]`/`repr(i*)`/`repr(C)` to a *fieldful* enum
suppresses the null-pointer optimization — the Nomicon's measured example
grows an Option-like enum over `&u16` from 8 to 16 B
(https://doc.rust-lang.org/nomicon/other-reprs.html). Expansion pre-RFCs
("Prefer all-zeros niche" internals t/12076, "Orthogonal Discriminants"
t/24543) remain title-only citations.

**Copy vs Clone codegen — and the round's biggest correction.** Derived
`Clone` calls `.clone()` field-by-field and carries `#[inline]` (verified by
`-Zunpretty=expanded`); after inlining, cloning a `Copy`-able struct lowers to
the same integral loads/stores — `Copy` is a semantic choice, not a codegen
one. A clone of a *local* that is only projected is fully elided (SROA); a
clone from an unknown reference is real work. The perf-book's "types larger
than 128 bytes are copied with `memcpy`" (in its text unchanged since the
initial 2020-11 commit 19db3a7650) is **x86_64-specific, not outdated**: the
threshold is LLVM's `MaxStoresPerMemcpy` × 16-byte stores — X86 = 8 → **128 B**
(libcall from 136 B), AArch64 = 16 → **256 B** (libcall from 264 B; OptSize
4 → 64 B at `-Oz`; x86 `-Oz` instead emits unlimited `rep movsb`), riscv64gc
= 96 B [R8-local, probes across rustc 1.72→1.101-nightly and llvmorg-11.1.0/
16.0.5/18.1.2/22.1.8 — the constants are identical across all of them, so no
rustc upgrade moves this]. The earlier in-round reading ("cutoff between 256
and 512 B on arm64, perf-book wrong") resolved to exactly 256 B. Portable
rule unchanged: keep hot by-value-copied types ≤128 B (inline on both archs);
aarch64-only deployments get 256 B at -O2/-O3. Separately, **rustc ≥ 1.73
elides caller-side argument copies** for moved large by-value args (PR
#112157 + LLVM 16 InstCombine D136822) — remaining large memcpys are genuine
copies, not ABI plumbing.

**`dyn Trait` vs generics: the tax is lost inlining, not the indirect call.**
[R8-local, /tmp/typeopt/cg/disp.rs] With a non-inlinable body, 100M calls ran
generic 81.07 ms vs dyn 81.11 ms — the indirect call itself is free on
Apple Silicon's OoO core. With an *inlinable* body, static dispatch let LLVM
delete the entire 100M-iteration loop (~0 ns) while dyn stayed ~81–88 ms: the
real cost of dyn is the opaque call boundary that blocks constant folding,
SROA, and loop deletion. Monomorphization price [R8-local, /tmp/typeopt/mono]:
200 instantiations of one `#[inline(never)]` fn = 32,884 B of `.text` / 425 ms
compile vs 3,392 B / 147 ms for the dyn-only build (~10× / ~2.9×). Middle
path (perf-book): keep generic wrappers thin and extract a non-generic inner
fn (the `std::fs::read` pattern); watch over-instantiation with
`cargo llvm-lines`. Object-safety canon for trait design: tower's
`type Future: Future` associated type exists "so users get to pick their own
type" — concrete futures avoid boxing, `Pin<Box<…>>` is the dyn escape hatch
(https://tokio.rs/blog/2021-05-14-inventing-the-service-trait);
`async fn` in traits (stable 1.75) is still not dyn-compatible
(E0038) because each impl has a distinct future type
(https://smallcultfollowing.com/babysteps/blog/2019/10/26/async-fn-in-traits-are-hard/);
async-trait desugars to one `Pin<Box<dyn Future + Send>>` per call at the
trait boundary (https://github.com/dtolnay/async-trait).

**`#[inline]` tiers and cross-crate reality.** The four perf-book tiers stand
(non-transitive; `#[inline(always)]` wins "all but the most exceptional
cases"; verify with Cachegrind). New measured fact: **non-generic functions
cross-crate inline without any attribute** — rustc exports MIR for functions
with 0 calls, 0 landing pads, and ≤100 statements (default
`cross_crate_inline_threshold = Sometimes(100)`) when not building
incrementally at opt > 0; `#[inline(never)]` always overrides. Verified in
rustc source (`compiler/rustc_mir_transform/src/cross_crate_inline.rs`) and
by a local lib+bin asm test where an unattributed `x*C+7` inlined into the
downstream crate (magic constant visible, zero calls). The folklore rule
"no `#[inline]` ⇒ not cross-crate inlinable" now applies only to large or
call-containing functions.

**Const generics buy unrolling and vectorization for free.** [R8-local,
/tmp/typeopt/cg/cg.rs] `fn dot<const N: usize>` with a plain loop:
`dot::<4>` unrolls to 2-wide `fmul.2s`; `dot::<64>` fully unrolls *and*
auto-vectorizes to 4-wide `fmul.4s` chains with zero branches — the known
trip count removes the guard loop and scalar tail that the same body over a
runtime-length `&[f32]` keeps. Fixed-size `[T; N]` params (not slices) and
per-N kernels get this free; the cost is code size per N (same
monomorphization tax as above).

**ZSTs.** `Vec<ZST>` never allocates — capacity saturates at `usize::MAX`
(measured after 1M pushes); `with_capacity` on `Vec<()>` is a no-op and
`capacity()` is meaningless. Iteration over `&[()]` compiles to length
arithmetic: `iter().count()` and `fold` emit `mov x0,x1; ret`;
`step_by(2).count()` emits pure len arithmetic, no loop [R8-local asm].
Design patterns (author-claimed, no benchmarks): typestate/proof ZSTs
replacing runtime checks — https://www.hardmo.de/article/2021-03-14-zst-proof-types.md

## 8.2 The indirection price list [R8-local, /tmp/indir_bench unless labeled]

| Operation | Cost |
|---|---|
| raw `u64` copy | 0.34 ns |
| `Rc<u64>` clone+drop | 1.38 ns |
| `Arc<u64>` clone+drop, uncontended | 3.83 ns |
| `Arc<u64>` clone+drop, 8 threads on one refcount | 66.1 ns (**17.5× collapse**, 265→15 M ops/s) |
| malloc+free pair, 64 B–64 KiB | 14.2–77.1 ns |
| deep clone `Vec<u8>` 64 KiB | 745 ns (≈35 B/ns) |
| `Arc<[u8]>` / `Bytes` clone of same | 3.7–3.9 ns |
| random dependent load (1 Mi table) | 10.9 ns/hop |
| same chain, sequential/prefetchable | 0.44 ns/hop |
| contiguous SIMD `Vec<u64>` sum | 0.079 ns/elem |

Decision rules: **move > borrow > deep clone (≤~128 B payload — the
deep-clone-vs-Arc crossover) > Arc/Rc share**; `Rc` over `Arc` on
single-threaded paths (2.7×); clone an `Arc` where it will be dropped, never
speculatively in a loop (a hot widely-shared refcount is a contention point —
the wgpu "arcanization" pattern exists because of this). Handle sizes:
`Vec<u8>` 24 B, `Box<[u8]>`/`Arc<[u8]>`/`Box<str>`/`Arc<str>` 16 B, `Bytes`
32 B; **avoid `Arc<Vec<u8>>`** (8-B handle but two dependent loads and two
allocations — `Arc::from(vec.into_boxed_slice())` removes both). Boxed struct
fields cost +44% on a touch-every-field scan even in the sequential-
allocation best case; box only rare-huge enum variants, recursive types, and
trait objects. Small-vec family: exact-fit `SmallVec<[u64;4]>` at len 4 is
**4.7× faster** than `Vec::new+push` (the gap is one malloc+free pair); a
**spilled** SmallVec is just a worse Vec (106.6 vs 27.6 ns with
`with_capacity`); `ArrayVec` when the max is exactly known (but panics past
capacity); `tinyvec`'s safe enum pays 3.5× over SmallVec at len 4;
maintainer rule (mbrubeck): SmallVec when ≥2 of {small common case, hot
function-local, indirection-removal improves locality}. 2026 arrivals
`wordvec`/`smallvec-handle` are author-reported only. Inside one arena/
graph, prefer `(u32 key + generation, Vec)` (slotmap) over webs of
`Rc<RefCell<T>>` — stale-handle detection plus zero refcount traffic, at one
dependent load per access.
https://nnethercote.github.io/perf-book/heap-allocations.html ;
https://users.rust-lang.org/t/when-is-it-morally-correct-to-use-smallvec ;
https://docs.rs/slotmap

## 8.3 Container and layout selection [R8-local, /tmp/dsbench unless labeled]

- **Vec growth**: std's policy is exact doubling with floors 8 (1-byte
  elems) / 4 (≤1 KiB) / 1 (larger) — `raw_vec.rs` `min_non_zero_cap`; folly's
  FBVector doc argues 1.5× precisely because 2× "never allows the vector to
  reuse any of its previously-allocated memory"
  (https://raw.githubusercontent.com/facebook/folly/main/folly/docs/FBVector.md).
  Measured: blind pushes at 1M u64 cost 2.4× time, 19 allocations, 2.1×
  allocator bytes vs `with_capacity` (0.966 vs 0.401 ms; 16.8 vs 8.0 MB).
  Any Vec with a known/bounded count gets `with_capacity`; `shrink_to_fit`
  after over-growth is cheap (0.010 ms at 1M).
- **sorted-Vec vs BTreeMap**: for warm-cache random-hit lookups on u64 keys
  there is **no size crossover** — sorted-Vec `binary_search` beat BTreeMap
  `get` at every measured n (3.0 vs 15.9 ns @65 … 49.8 vs 183.0 ns @1,048,577;
  ratio 2.7–5.4×). The real crossover is *mutation*: interleaved inserts are
  O(n) on the Vec, O(log n) on the tree. BTreeMap also costs 90,915
  allocations and 42.2 MB at 1M entries vs the Vec's 16.0 MB flat. Build-
  once/read-many → sorted Vec no matter the size; std's node is B=6 (11
  keys). Third-party analysis of why trees lose warm lookups (speculative
  execution between lookups) and 512-B node tuning:
  https://www.scattered-thoughts.net/writing/smolderingly-fast-btrees/
- **IndexMap vs HashMap** (same std RandomState hasher on both, isolating
  structure): build 1.29× slower, 30M hit lookups 1.69× slower (52.1 vs
  30.9 ns), iteration **7.8× faster** (0.286 vs 2.235 ns/entry), memory +20%
  (42.9 vs 35.7 MB at 1M). Default HashMap; IndexMap for deterministic/
  insertion-order iteration, `get_index`, or iteration-heavy workloads; a
  production revert-to-HashMap on memory grounds corroborates the +20% [3p,
  https://news.ycombinator.com/item?id=40896911].
  https://raw.githubusercontent.com/indexmap-rs/indexmap/master/README.md
- **VecDeque**: ring buffer (head+len, wrap seam); `Vec::insert(0)` ×100k =
  696.9 ms vs `push_front` 0.190 ms (~3,700×) — never front-insert a Vec in
  a loop; but one-shot bulk reversal is `Vec` push + `reverse()` (2.3× faster
  than 1M push_fronts); contiguous access wants `make_contiguous`/
  `as_slices`.
- **SoA / split streams**: selective-field iteration over big elements is
  the win condition — 240-B struct, 1M elems, single-field sum: AoS 3.871 ms
  vs SoA 0.904 ms (**4.28×**, reproducing soa_derive's author-reported 4.4×
  within 3%); at 16–24-B elements it is parity (add-latency-bound);
  `Vec<(u64,u8)>` vs split `Vec<u64>` = 2.0× on the u64 scan (16 B stored
  per 9 B payload). soa_derive = one Vec per field; soa-rs/soapy = single
  allocation; push/pop slower than Vec in all of them.
  https://github.com/lumol-org/soa-derive ; https://github.com/tim-harding/soa-rs
- **The ECS archetype lesson (bevy)**: group entities by full access-
  signature; store each archetype as a columnar table ("each column stores
  components of a given type, each row is an entity") for cache-friendly
  query iteration; pay copy-all-components on archetype change; sparse-set
  storage is the opt-out for hot-add/remove components; empty archetypes are
  never freed (deliberate time/memory trade). Generalizes SoA: *structural
  index + columnar storage*, same push/pop trade.
  https://bevy.org/news/bevy-0-5/ ;
  https://docs.rs/bevy_ecs/latest/bevy_ecs/archetype/index.html

## 8.4 Zero-copy buffer discipline

**Moves are not guaranteed-elided.** The Reference defines move-out/
deinitialization but is silent on address preservation; unsafe-code-
guidelines #416 ("What are the semantics of move operands?") is still open —
Rust has no C++17-style guaranteed copy elision
(https://github.com/rust-lang/unsafe-code-guidelines/issues/416). Measured
[R8-local asm probes]: a 4-KiB pass-through move compiles to nothing; a move
whose *destination address escapes* forces a 4-KiB memcpy; two simultaneously
live copies are the only thing that must copy; moving `Vec`/`Bytes` is 3–4
word copies with the data pointer preserved. Rules: never rely on a big value
keeping its address across a move — heap-allocate (`Box`/`Vec`/`Bytes`) when
address stability matters; the copy you see in profilers is two-live-copies,
not "the move".

**Self-referential types are a last resort.** Safe Rust has no syntax for a
struct borrowing its own field, and §moves means interior pointers would
dangle after any move. The production answers heap-allocate an immovable
owner: **self_cell** (init owner in place, build dependent next to it; "only
when there is no good alternative") and **ouroboros** (`#[self_referencing]`;
wrap it internally, not in public APIs). The graveyard is the warning:
**rental** (unsound, deprecated), **owning_ref** (RUSTSEC-2022-0040,
unmaintained). Surviving alternatives: **yoke** (owner + `Cow`-typed
dependent, 204.9M recent DL), arenas (bumpalo), or `Bytes::from_owner`
(externalize the lifetime into a refcount — mmap-friendly). Preference
order: borrowed views kept beside the buffer → arena → `Bytes`-style shared
ownership → yoke for serde → ouroboros/self_cell.
https://github.com/Voultapher/self_cell ;
https://github.com/someguynamedjosh/ouroboros

**`bytes::Bytes` (1.12.1) — the canonical shared-buffer design.** Exactly
4 usizes (ptr, len, `AtomicPtr` data, `&'static Vtable`); five vtable fns
(clone/into_vec/into_mut/is_unique/drop); the data pointer is **tagged**
(KIND_ARC=0b0 / KIND_VEC=0b1). Three backing kinds: static (clone is a
no-op), `Box<[u8]>`/len==cap Vec (PROMOTABLE — the raw Vec pointer rides the
tag; zero header allocation until shared), and len<cap Vec (SHARED header).
**Lazy promotion**: an unshared Vec-backed Bytes never pays for refcounting;
the first possible clone promotes into a `Shared { ref_cnt: 2 }` via CAS
(`shallow_clone_vec`, `#[cold]`), race losers fall into the Arc path.
`slice`/`split_to`/`split_off`/`freeze` are O(1) pointer arithmetic — all
pointer-preservation asserts passed locally [R8-local /tmp/zc/zcheck].
Unique → `into_vec` **reattaches the original allocation in place** (ptr::
copy view to buffer start + `Vec::from_raw_parts`, no alloc; asserted);
shared → deep copy (asserted pointer change). `BytesMut` recycling is
original-capacity memory (1 KiB floor, powers of two to 2¹⁷) + `reserve`'s
shift-back reclaim when consumed-prefix ≥ len — **no thread-local free-list
pool exists in any published tag** (grepped v0.4.0→master: zero matches; the
"Bytes has an internal pool" folklore is false).
https://github.com/tokio-rs/bytes (bytes.rs:101-125, 946-976, 1368-1547;
bytes_mut.rs:78, 615-830)

**The end-to-end pipelines.** hyper HTTP/1 reads the kernel straight into
`BytesMut` spare capacity (`chunk_mut().as_uninit_slice_mut()` + `ReadBuf::
uninit` + `advance_mut` — the BufMut contract returning
`&mut [MaybeUninit<u8>]` since bytes 0.5) with an 8-KiB-power-of-two adaptive
read strategy (two-read hysteresis); the write side gathers up to
**MAX_WRITEV_BUFS = 64 IoSlices** into one `poll_write_vectored` when the IO
reports `is_write_vectored` (pipelining forces the Flatten strategy).
tonic+prost decode keeps one persistent `BytesMut` per stream, hands prost a
borrowed `DecodeBuf` window, and prost's `copy_to_bytes` on BytesMut is
`split_to(len).freeze()` — **one allocation shared from socket to decoded
message**; the encode side batches into 8-KiB per-RPC buffers with a 32-KiB
yield threshold (configurable via `BufferSettings`). Measured syscall win:
8×1-KiB writes to /dev/null, 200k iterations — 1.239 s serial vs 0.178 s as
one writev per batch (**6.97×**, conservative — the vectored loop still
allocates its IoSlice vec per iteration) [R8-local /tmp/zc/zcheck/iocheck].
https://github.com/hyperium/hyper/blob/master/src/proto/h1/io.rs ;
https://github.com/hyperium/tonic/blob/master/tonic/src/codec/decode.rs

**Borrowing machinery rules** (all demonstrated locally): `Cow::Borrowed`
shares the pointer; the **first** `to_mut()` is the one copy — but
`reserve(n)` before mutation or `push` reallocates (first draft of the probe
panicked on exactly this). `mem::take` on a buffer leaves capacity **0** —
the hot loop re-allocates; the zero-copy handoff for a buffer you keep is
`split()/split_to(n).freeze()` (give away a view, retain the remainder with
its capacity); `mem::replace` with a fresh buffer amortizes the swap, not
the alloc. `ManuallyDrop` + forget-exactly-once is how bytes steals a Vec's
parts; `slice/Vec::from_raw_parts` reattachment requires same-allocator
pointer, `len` initialized elements, and the *real* capacity or Drop
mis-frees. MaybeUninit rules: validity invariants apply even in unsafe code;
uninitialized memory has no fixed value (UB to have uninit data even in an
integer variable); padding need not be initialized. Caveat: `vec![0; 64 MiB]`
took 5.6 µs on macOS (zero-fill-on-demand pages) — "MaybeUninit avoids the
memset" is allocator/OS-dependent on fresh allocations; its reliable wins
are reused/pool memory and never writing bytes twice.

## 8.5 Channels, actors, and cross-thread costs

**flume 0.11+ is a single-lock design and its spinlock opt-in regressed
contention.** The 0.11.0 rewrite (2023-08-16) put the entire channel state —
VecDeque queue + waiter lists — behind one Mutex (`Chan { sending, queue,
waiting }`, flume 0.12.0 lib.rs:431-478). PR #130 ("make all remaining
spinlocks opt-in", motivated by RTOS priority inversion) shipped with **no
benchmark and no perf note**; a local A/B measured contended MPMC ~2.1–2.2×
slower without the `spin` feature (mpmc4-tight 50.1→22.8 ns/msg with spin;
work-mode 897→433) [R8-local /tmp/chanspin]. Maintainers acknowledge only
generically (#162: std's switch to crossbeam "silently improved" programs;
#105 from 2022: crossbeam "has the edge in very high contention scenarios").
Pick flume for API breadth (sync/async mixing, select), not throughput.
https://github.com/zesterer/flume/issues/130

**kanal: regime-dependent, and its README numbers remain image-only.** kanal
0.1.x is one custom mutex around a VecDeque (internal.rs:18-24,165-180) —
cheap when uncontended and never-full, pathological in lock-step bounded
transfer. Measured [R8-local /tmp/chanbench + /tmp/chankanalcap]: bounded(1024)
SPSC tight loop = 52–587 ns/msg, **unstable and 5–90× behind crossbeam**
(crossbeam 6.4, std `sync_channel` 5.7); unbounded SPSC is kanal's one clear
win (5.5–36 vs crossbeam 9.1); 4-producer work-mode cells all go to
crossbeam. The third-party forum result (kanal ~3× over crossbeam at 24-B
messages, 12-producer rayon harness with µs-scale work between sends,
https://users.rust-lang.org/t/simple-and-fast-channel-too-good-to-be-true/104036)
did **not** reproduce in the 4-producer replica at 24 B (crossbeam 167.5 vs
kanal 199.9 ns) — magnitude is host/rhythm-specific; the *ordering* (kanal
beats flume/std in work-amortized unbounded multi-producer ≥24 B) is
plausible. kanal's own benchmark table is still an unreadable image (vision
tooling failed all round); its async path had a documented 15–200× collapse
under full CPU load in 2022 (issue #12), fixed by dropping spin-wait.
**Bench hygiene lesson from the same thread:** black_box the received value —
the thread's original numbers were distorted exactly by that omission.

**Channel selection** [R8-local unless noted]: bounded tight-loop pipeline →
crossbeam-channel or std `sync_channel` (5.7–6.4 ns SPSC u64; 4P1C/4P4C
crossbeam wins all cells); unbounded SPSC hot path → kanal defensible,
crossbeam stabler second; many-producers + real work between sends +
unbounded + ≥24-B messages → kanal beats flume/std, vs crossbeam
host-dependent (measure); contended MPMC with blocking → avoid flume default
(`features=["spin"]` halves it, still trails crossbeam); async tokio →
tokio::sync::mpsc measured 154 ns/msg on the same host's 4P1C u64 cell
(cross-thread wakeup is the tax).

**Arc refcount contention is the Send/Sync runtime tax.** Clone+drop on one
shared `Arc<u64>`: 3.97 ns (1 thread) → 9.47 (2) → 23.0 (4) → 67.9 (8) →
69.6 (12) — ~18× [R8-local /tmp/mtbench; the parallel independent run in
§8.2 agrees]. Cross-thread *ask* in actor frameworks costs 9–12 µs vs 90–370
ns for same-thread *tell* (30–40×) [3p rust-actors-benches, i7/rustc 1.84];
spawning 10k actors: actix 5.03 ms / kameo 47.9 / ractor 68.5. Bounded
mailboxes exist only in actix/kameo/xtra. Baseline pattern without a
framework: task + owned state + mpsc handle + oneshot replies (Alice Ryhl,
https://ryhl.io/blog/actors-with-tokio/). crossbeam-deque is Chase-Lev
(MIN_CAP 64, MAX_BATCH 32, epoch-retired buffers) and is rayon's spine;
rayon defaults to exactly `available_parallelism()` threads while tokio's
blocking pool caps at 512 — never let CPU work run on the 512 pool.
JoinSet = abort-on-drop + completion-order results (a never-joined JoinSet
accumulates and can OOM); TaskTracker = keep-alive/close/wait, does NOT
abort on drop; moro = nursery scopes borrowing stack data (experimental).

**Zero-copy across threads and processes.** `Arc<Bytes>` pipeline handoff ≈
refcount bump + view math: framing 1-KiB frames via `Bytes::split_to` = 5.26
ns/frame vs 32.32 for `to_vec()` (**6.1×**) [R8-local]. The end-to-end
recv→parse pattern is buffer-passing reads (tokio-uring: "the buffer is
passed by ownership and submitted to the kernel… we get the buffer back") —
allocate once, kernel fills, freeze/split into the parser. rkyv zero-copy
access ≈ 1.09 ns unvalidated / 274 µs validated-upfront vs 1.22 ms
deserialized-to-owned [3p djkoloski]. memmap2's `map_mut` is `MAP_SHARED`
by default — two processes share a window with zero copies but **no
synchronization whatsoever** (std primitives are not process-shared; wrap in
seqlocks/atomics or single-writer handoff); no shm crate publishes text
benchmarks (gap). monoio/glommio thread-per-core QPS data (Tokio plateaus
~435k @4C vs Glommio 603k+) is vendor-committed raw data whose lesson is the
!I/O loop! not the protocol (https://github.com/bytedance/monoio/blob/main/docs/en/benchmark.md).

## 8.6 HTTP stack

**hyper 1.x h2 defaults, from source** (src/proto/h2/server.rs:36-79):
initial connection & stream windows 1 MiB each, `max_concurrent_streams`
200, per-stream send buffer ~400 KiB, `max_header_list_size` 16 KiB,
keep-alive pings **disabled** (20 s timeout when enabled), adaptive window
off. Raise windows on high-BDP paths; 16 KiB header list refuses header-fat
requests (JWTs, tracing baggage) — size to real p99.9; h1 `max_headers`
moves stack-allocated headers (default 100) to the heap at "a performance
drop of about 5%" (hyper's own doc). **HeaderMap** (http crate) is Robin
Hood hashing where the index table stores only `{u16 index, u16 hash}` —
eviction copies 8 bytes, not header data — capped at 24,576 entries, with a
DoS-adaptive "danger state": an insertion displacing ≥128 entries turns the
map yellow (grow) then red (collision-resistant hasher) rather than O(n²).
**HPACK/h2 2026 work** (changelog + PRs): 0.4.16 (2026-08-17) shipped
flush-without-holding-stream-locks (author-measured single-connection write
throughput 2853→4294 MiB/s at 2 workers, −33.5% elapsed), 1-byte HPACK
decode tables (decode microbench +13–41%), and encode-buffer reuse (+3.8% on
a 100k-request multithread bench, permutation p=0.016); 0.4.17 caps the
encoder table at 4 KB; 0.4.18/19 add `data_frame_budget`. **Upgrade h2
rather than hand-tuning around old versions.**
https://github.com/hyperium/hyper/issues/3071 (h2 can be ~2× slower than h1
in some workflows — maintainer-acknowledged); the pathological end is
actix-web#3841 (reqwest→actix rustls h2 at 41.45 ms/req vs 0.14 ms h1 —
configuration/interaction, not intrinsic).

**Clients**: hyper/ureq/reqwest finished within **1.01×** of each other on a
real-network 100-request CI bench (107.6/108.4/108.7 ms) [3p
orhun/zig-http-benchmarks] — the "ureq is much faster/slower" folklore dies
for realistic use; ureq 3.x is HTTP/1.1-only with tight pool defaults
(10 total/3 per host/15 s max age) for CLI-shaped tools; hyper-util's pooled
client defaults to 90 s idle with **unlimited** idle per host, and idle
reaping requires a configured pool timer (raw builders have none; reqwest
wires one). One `Client`/`Agent` per process — clones share the pool via
Arc; constructing per request is the #1 real-world mistake. **Protocol
choice**: LAN/loopback service-to-service → h1+keep-alive; h2 for many
parallel requests over one high-latency link (after the 2026 h2 fixes);
h3/QUIC when 0-RTT/TTFB dominates — Cloudflare's controlled experiment:
H3 TTFB 176 vs 201 ms (+12.4%, mainly 0-RTT), but a 1-MB transfer slightly
*slower* (2.33 vs 2.30 s) and real-world page loads trailed by 1–4%
[vendor]. **QUIC implementation gaps measure the I/O loop, not the
protocol**: ETH Zürich's QBench measured quinn 1,865 vs quiche-through-
harness 891 Mbps and attributes most of it to GSO (batched reads alone took
the harness 469→891; a mutex-shared loop spent 84.9% in futex); quinn was
also ~16% behind quiche as a sender partly from missing PMTUD
(quinn#1320). Benchmark your workload; published QUIC numbers disagree by 2×
on GSO alone. TQUIC's self-rated table is marketing (doesn't test quinn);
rpxy deleted its own proxy benchmark as unreproducible — an honest negative.
https://nsg.ee.ethz.ch/files/public/theses/2024-qbench/thesis-1.pdf ;
https://blog.cloudflare.com/http-3-vs-http-2 (vendor)

## 8.7 gRPC in Rust

**Standing numbers** [3p LesnyRumcajs/grpc_bench discussion #559,
2026-04-23, Xeon Gold 6548N]: `rust_tonic_st` (tonic 0.14/prost 0.14,
current_thread runtime) was **#1 of 40 at 1 server CPU: 102,754 req/s,
14.5 ms p99, 14.97 MiB RSS** — 1.84× grpc-go at half its memory; at 4 CPUs
tonic_mt reached 136,638 req/s (14.6 MiB) vs Java leaders ~150k at 330+ MiB.
The `_st` arm is one worker thread by design; runtime shape is a real lever
(current_thread beat multi_thread by 25% at 1 CPU with far better p99;
tonic#784/#1405: multiple single-threaded runtimes beat one big one past
~8 cores).

**The single-connection plateau is still unfixed.** h2 issue #531 ("does not
scale with multiple cores", open since 2021) is **OPEN as of 2026-10-02**;
the mechanism is confirmed in v0.4.19 source: one `std::sync::Mutex` per
connection guards all stream bookkeeping (`Streams { inner:
Arc<Mutex<Inner>> }` streams.rs:25; `reserve_capacity` at :1386; the send
path nests a second `SendBuffer` Mutex at :101). h2 0.4.16's fixes only
narrowed it (flush outside stream locks). The real fix — PR #917, per-stream
locks — is an **unmerged, conflicting draft** with no milestone and no
target version; maintainer-reported +15–40% on multi-threaded workloads
(aggregating testers; June–July 2026 testing found deadlocks and a
cold-CPU cliff of 24 vs 5,897 req/s, since fixed on-branch); the latest
activity (2026-09-24) is a *new* contention report (250-RPC fanout). tonic's
own advisory is #607: **cloning a Channel does not raise throughput —
clones share one h2 connection; spread load over multiple new Channels.**
Fresh tonic 0.14.6 resolves h2 0.4.19 [R8-local `cargo tree -i h2`]; any
lockfile older than 2026-08-17 pins h2 ≤0.4.15 — `cargo update -p h2`.
https://github.com/hyperium/h2/issues/531 ;
https://github.com/hyperium/h2/pull/917

**The codec is where tonic loses, not the tower/h2 layers.** prost's varint
decode is a single-byte fast path plus a fully-unrolled 32-bit-split loop
ported from protobuf C++ — measured 496.5M varint-decodes/s (1.74 GB/s) vs
109.5M encodes/s on a mixed distribution [R8-local /tmp/varint_check]; SIMD
was prototyped and rejected as a macrobench "wash" (prost#279). tonic's own
decode bench: 2,855 MB/s (100-B chunks) → 15,608 MB/s (10-KiB messages)
[R8-local, same bench family tonic#1486 used]. The owned-struct tax is the
story: connect-rust's CPU profile on decode-heavy traffic shows
tonic+prost at **9.6% allocator + 8.5% HashMap ops + 6.2% string-alloc** vs
~0–3.6% for zero-copy views, with framework dispatch level within 1–3%
[vendor, c7i.metal-24xl, 2026-09]. Greptime's war story is the same shape:
protobuf decode was 12% of CPU; pooling/clear-not-drop 7.3→2.7 ms; naive
`Bytes` zero-copy first *regressed* (2.7→3.4 ms — the `Buf` adapter double-
converts and `slice` refcounts) until a specialized Buf→Bytes path hit
1.62 ms (~4.5×); SIMD was never needed
(https://greptime.com/blogs/2024-04-09-rust-protobuf-performance). Rules:
decode prost from `bytes::Bytes`, not `&[u8]` (prost#571 — non-Bytes input
forces an intermediate copy); `encoded_len` is computed twice on encode,
~5% (prost#1112); flatten map-heavy hot paths to `Vec<(K,V)>` at the
handler boundary; `Channel` is a cheap tower `Buffer` handle — clone freely,
never `Endpoint::connect` per request; stock p2c `balance_channel` uses a
**constant** load metric (no in-flight awareness); set
`http2_keep_alive_interval` + `tcp_nodelay`; watch the GoAway reconnect wart
(tonic#2185). Beyond ~36k req/s per h2 connection, add connections
(connect-rust measured 41–42k vs tonic 36–37k single-connection; over 8
connections all stacks within 5% [vendor]). Removing protobuf entirely when
both ends are Rust: pgdog replaced prost (de)serialization of
libpg_query ASTs with direct conversion — parse 5.45×, deparse 9.64×,
+25% end-to-end [author].

**The Connect alternative and the ecosystem shift.** connectrpc-rs speaks
Connect/gRPC/gRPC-Web on one tower-based server; on the same server, Connect
framing (no 5-B envelope, no trailer HEADERS on unary) gave **1.23× gRPC**
unary at c=256 (245,173 vs 199,574 req/s) — at 200k+ req/s gRPC trailers
mean ~200k extra h2 HEADERS encodes per second [vendor]. The transition to
watch: hyperium/tonic was transferred into the gRPC project as
**grpc/grpc-rust** (2026-05); the new `grpc` crate 0.9.0 (2026-05-28) is
**client-only, prerelease, "not recommended for production"**, still runs on
tonic 0.14.6 transport, and pairs with Google's protobuf-v4 **upb kernel**
(not prost; protoc pinned to exactly 34.0). tonic is bug-fix-only
maintenance; the promised migration path preserves tonic codegen (channel
swap). Codec expectation from Anthropic's buffa bare-metal tables
[3p-but-self-interested]: upb/protobuf-v4 encode 2.6–3.8× *faster* than
prost on 4 of 5 message shapes but decode mixed — up to 83% slower on
bytes-heavy MediaFrame (serialize() allocates a fresh arena and copies out).
**Stay on tonic for production through at least late 2026.**
https://grpc.io/blog/grpc-welcomes-tonic/ ;
https://luciofranco.com/blog/tonic-joins-grpc/ ;
https://github.com/connectrpc/connect-rust

## 8.8 Service serialization formats [R8-local serde-bench-t8 unless labeled]

First-party bench, 1,000 mixed orders, length-delimited streams:

| codec | size vs JSON | enc MB/s | dec MB/s |
|---|---|---|---|
| prost 0.14.4 | 0.46× | 1,329 | 317 |
| rust-protobuf 3.7.2 | 0.46× (**byte-identical**) | 1,226 | 328 |
| ciborium 0.2.2 | 0.77× (named maps) | 1,870 | 222 |
| serde_cbor 0.11.2 | 0.77× (byte-identical to ciborium) | 1,643 | 458 |
| minicbor 2.3.0 | 0.43× (indexed) | 1,636 | 603 |
| rmp-serde 1.3.1 | 0.43× (**arrays by default**) | 1,086 | 355 |
| apache-avro 0.22 (OCF) | 0.41× | 293 | 87 |
| serde_json (anchor) | 1.00× | 1,179 | 438 |

- **prost vs rust-protobuf is a policy choice, not a speed choice**: both
  emit byte-identical wire streams and decode within 3–11% (nrc's old suite
  found prost 2.6% lower latency — inside its own 1.7–1.9% run variance;
  djkoloski's 2026 suite has prost ~30% faster on encode [3p]). The
  decision-relevant difference, measured: **prost drops unknown fields on
  decode-then-re-encode (322 B → 278 B); rust-protobuf preserves them
  losslessly (322 → 322)** via `special_fields`. Proxies/relays/sidecars
  that re-encode unknown-versioned messages must use rust-protobuf (or
  preserve raw bytes). Beware the crate-name collision: `protobuf` on
  crates.io carries both rust-protobuf 3.x and Google's 4.36.x line.
- **Wire mechanics that decide size**: negative int32/int64 varints always
  take 10 bytes — `sintN` (ZigZag) for negative-heavy fields; field numbers
  1–15 cost one tag byte; packed repeated is proto3-default and
  backward-compatible; `oneof` costs **zero wire bytes** (member encodes
  identically to a plain field with the same tag — measured); moving an
  existing field into an existing oneof is the compatibility break.
- **CBOR**: serde_cbor is dead (archived, last release 2021, three
  advisories incl. an OOB write) — **ciborium produced byte-identical
  output locally**, so migration does not change payloads; but ciborium
  inverts the speed profile (fastest encode, slowest non-avro decode);
  minicbor is the fastest decoder and smallest via indexed fields. CBOR's
  0.77× vs msgpack's 0.43× is *serde's named-map default*, not the format.
- **msgpack trap**: rmp-serde encodes serde structs as **positional arrays
  by default** (encode.rs:741-751 branches on `is_named`) — compact but
  field-order-brittle; `with_struct_map()` buys JSON-like evolution
  tolerance at CBOR-like size. Decide consciously; the default is the
  brittle one.
- **avro**, corrected record: apache-avro is **actively maintained**
  (0.22.0 on 2026-08-10, repo pushed 2026-10-01) — any "stale" implication
  is wrong. But it pays an intermediate-`Value` + per-append-validation
  tax: locally 87 MB/s decode (OCF `Value` path) vs protobuf's 317–328; a
  deser-only head-to-head against serde_avro_fast measured 15–38× gaps
  (0.21) and ~11–29× (0.22) [R8-local replication of the author's bench].
  The claim that the slowdown "is acknowledged in its own benchmarks" is
  **refuted** — its criterion benches self-compare Value vs serde paths
  only; the published x11/x20 multipliers are serde_avro_fast's
  author-reported numbers, and the "4.5×" lower bound matches no source.
  0.22's GenericDatumReader/Writer rework recovered only ~20–30% [R8-local];
  maintainers acknowledge the overhead qualitatively (#310 user flamegraph:
  `ResolvedSchema::try_from` = 80.26% of `from_avro_datum`; #322 open).
  Rust quirks: u64 maps to a nonstandard `Fixed("org.apache.avro.rust.u64")`,
  u32→long — derive schemas, don't hand-write; reader schema must carry
  `default` for every added field. Pick avro only for schema-registry
  ecosystems.
- **SOAP: no maintained native stack exists as of 2026-10** (verified
  against crates.io + repo states): soap-rs dead since 2018 (never
  published), savon archived, strong-xml dormant since 2021, yaserde
  commit-active but unreleased for 23 months; xsd-parser (1.5.2, 2026-03) is
  alive but XSD-codegen-only. The working pattern is hand-rolled envelope
  templating over reqwest + quick-xml/yaserde with manual `xsi:type`
  dispatch. https://users.rust-lang.org/t/how-to-use-soap-in-rust/75596

## 8.9 Web-framework routing and middleware

**Router costs are architectural, not constant.** On identical 130-route
GitHub-API-shaped tables [R8-local router-bench-check, criterion]: matchit
0.9.2 (axum's router, pinned `=0.9.2`) = **38.5 ns/match**, position-
insensitive (17–26 ns first-to-last, 10.2 ns unmatched); actix-router 0.5.4
= **4.07 µs/match** — but the "~100×" headline is route-count-dependent:
actix's `recognize` is a **linear scan running one compiled regex per
dynamic candidate** (router.rs:54, resource.rs:692), so it wins at scan
depth 1 (12.7 ns, static) and pays 7.53 µs on a full-scan 404. Known open
issue actix-web#3645 (early-return refactor); sibling PR #3649 closed
unmerged. Two bench traps verified: actix-http's own rewrk parity app
registers **zero routes** (framework RPS says nothing about router cost),
and actix-router 0.5.x treats `:param` colon syntax as literal text —
importing matchit's old colon route list silently measures all-miss scans.
https://github.com/ibraheemdev/matchit#benchmarks (author-reported table,
same shape)

**Middleware overhead ladder.** [R8-local /tmp/mwbench, dispatch-only,
M3 Max] axum `middleware::from_fn` costs ~88–116 ns + 2 heap allocations per
middleware per request (boxing at three sites: from_fn.rs:291, 306/339,
355) vs ~0 for a hand-written `Service` with a concrete `Future` — three
from_fn layers = 285–379 ns vs 31–35 ns hand-written. A full production
middleware stack ≈ **5.9 µs/req** [3p users.rust-lang.org t/139313]. The
dangerous layers are the ones that **wrap the body stream**: tower-http
decompression was a **10× throughput regression** (fresh 64-B `BytesMut`
per `poll_frame`) fixed in 0.6.1 by a persistent 4096-B scratch buffer —
Sentry independently measured ~4× faster compressed-body reads + ~50%
lower avg latency from that one fix [3p]; CompressionLayer still buffers
whole streaming bodies (multipart parts seconds apart arrive simultaneously
— #292, open — never put SSE behind it); ServeFile is 2.8–5.8× off raw
reads on hot small files (#480, "not particularly optimized" per
maintainer). And before blaming any middleware for latency: **set
TCP_NODELAY** — the scariest ServeDir report ("~100×") was Nagle's
algorithm (#352→hyper#3187). No measured-overhead report exists anywhere in
the trackers for TraceLayer/CorsLayer/TimeoutLayer/RequestBodyLimitLayer —
measure before budgeting them.
https://github.com/tower-rs/tower-http/issues/520 ;
https://github.com/tower-rs/tower-http/pull/521

## 8.10 Corrections and verdicts (Round 8)

- **RESOLVED — memcpy threshold**: 128 B (x86_64) vs 256 B (aarch64) is a
  pure LLVM-architecture split (`MaxStoresPerMemcpy` 8 vs 16 × 16-B stores),
  unchanged llvmorg-11→22; the perf-book's 128 B is x86_64-correct and was
  never arch-qualified; the in-round "256–512 B" reading was a coarse grid
  (exact boundary 256 B; aarch64 `-Oz` collapses to 64 B). Also new: rustc
  ≥1.73 elides caller-side argument copies (PR #112157). This corrects the
  §6.5 framing and the skills' "types >128 B are memcpy'd" wording.
- **CONFIRMED — h2 single-connection plateau unfixed** through 0.4.19; PR
  #917 unmerged draft (15–40% maintainer-reported); multi-connection
  spreading stays mandatory; grpc_bench #559 ran h2 0.4.13 with 50
  connections baked in, so it never measured the plateau.
- **CONFIRMED with mechanism — actix-router ~100× slower** than matchit on
  130-route tables, but it is a linear scan: cost sweeps 12.7 ns→7.5 µs with
  match depth; "100×" must never travel without the O(N) context.
- **REFUTED — "apache-avro's 4.5–11× slowdown is acknowledged in its own
  benchmarks"**: its benches self-compare only; multipliers are competitor-
  authored (x11/x20 vs avro 0.17); the 4.5× lower bound matches no source;
  local replication found 15–38× (0.21) / 11–29× (0.22) on a deser-only
  shape. apache-avro is actively maintained.
- **REFUTED — "bytes has an internal pool"**: no free-list pool exists in
  any published tag; recycling is original-capacity + shift-back + unique
  reattach.
- **REGRESSION, UNACKNOWLEDGED — flume 0.11 spinlock opt-in**: contended
  MPMC ~2.1–2.2× slower by default (local A/B); no perf note in the release.
- **SCOPED — kanal's 3× forum win** is regime-specific (12-producer,
  unbounded, work-between-sends, ≥24 B); did not reproduce at 4 producers;
  kanal bounded tight-loops are 5–90× behind crossbeam and unstable.
- **CONFIRMED — no maintained SOAP stack in Rust** (primary-source table in
  §8.8).
- **NEGATIVE — the Figma "shared_ptr refcounting ate N% of CPU" figure** is
  unsourceable (not in the 2018 post, its mirror, HN, or search); likely
  misremembered — do not cite.

## 8.11 Harvest into the five skills (Round 8)

1. **rust-superopt/SKILL.md** — rung 3's "types >128 B are memcpy'd"
   corrected to the arch split; new "Types, indirection, and containers
   (Round 8)" section: layout/niche rules, dyn-vs-generics with the measured
   free-dispatch/lost-inlining pair, cross-crate inline rule, the §8.2
   indirection price list, container quick rules (Vec growth/with_capacity,
   sorted-Vec vs BTreeMap, IndexMap, VecDeque, SoA/ECS one-liners), ZST
   facts, move-semantics rules, verification commands; routing rows added.
2. **rust-simd-kernels/SKILL.md** — const-generic trip counts as a rung-1
   lever (free unroll+vectorize at known N, code-size-per-N tax).
3. **rust-simd-crates/SKILL.md** — the varint-simd "do not recommend"
   entry reinforced with the measured prost scalar numbers and the rejected-
   SIMD history (prost#279).
4. **rust-parallel-cache** — new "Channel choice (Round 8)" block + **new
   reference file `references/channels.md`** (the full selection table, the
   flume regression A/B, kanal regimes, Arc contention economics, actor
   costs, crossbeam-deque mechanics, JoinSet/TaskTracker/moro, buffer-
   passing recv, MAP_SHARED caveat); description gains the channel trigger.
5. **rust-fast-architecture/SKILL.md** — new "Service communication (Round
   8)" digest + **new reference file `references/service-comms.md`** carrying
   the hyper defaults table, h2 plateau/watch item, client/pool rules,
   protocol chooser, gRPC/tonic checklist, codec rules, the serialization
   tradeoff table (incl. the avro corrected record and SOAP negative), the
   Bytes/zero-copy buffer discipline, router and middleware cost ladders.

## 8.12 Proposed new skill (design only — awaiting approval)

**rust-service-comms** — wire-stack performance for Rust services. Files:
`SKILL.md` (firing phrases: "tune hyper", "why is my HTTP/2 slow", "tonic
vs connect", "prost vs rust-protobuf", "reqwest vs ureq", "which
serialization format", "CBOR vs msgpack vs protobuf", "gRPC channel
pooling"; contents: the protocol/transport chooser, the RPC-stack checklist,
the wire-format table, the middleware/router cost ladders — all as digests);
`references/http-transport.md` (hyper h1/h2 defaults from source, HeaderMap
design, HPACK/h2 2026 changelog economics, client pools, H1/2/3 decision
with the Cloudflare/QBench caveats); `references/rpc-grpc.md` (tonic
internals — Channel/Buffer/Reconnect, codec BufferSettings, the h2 #531/
#917 watch item, connect-rust numbers, the grpc/grpc-rust transition and
its stay-on-tonic verdict); `references/wire-formats.md` (the tradeoff
table, prost-vs-rust-protobuf unknown-fields rule, wire mechanics, CBOR/
msgpack traps, avro corrected record, SOAP negative result). Rationale:
nine of this round's seventeen packets are wire-stack material with their
own measured decision rules; rust-fast-architecture is at its SKILL.md line
cap with an architecture-shaped (contention/sharding/runtime) trigger
surface, so this round could only park the material in a reference file —
promotion gives it the routing phrases it needs to fire. The
`references/service-comms.md` file created this round becomes the seed.

Also recorded: **rust-type-perf was considered and folded into
rust-superopt** instead — the type-level material is the cheapest rung of
the lever ladder superopt already owns (rung 3 already claimed type-size
engineering and allocation-rate reduction), it needed ~100 lines rather
than a skill, and its verification tooling (`-Zprint-type-sizes`,
size_of probes, `--emit=asm` memcpy greps) is measurement discipline, which
is superopt's core identity. And the pending Round-7 **rust-string-perf**
proposal gains this round's measured handle sizes (String 24 B /
`Box<str>`/`Arc<str>` 16 B; `Box<str>` heap block is exactly `len` bytes —
no capacity drift) for its `references/string-types.md`.

## 8.13 Negative results, gaps, and open doors (Round 8)

- **Still unreadable**: kanal's README benchmark chart (vision tooling
  failed all round); TechEmpower raw data (endpoints serve HTML/JS — every
  TFB number rides on issue threads, doubly vendor-cautioned).
- **Not reproduced**: the forum's kanal 3× magnitude (4-producer replica
  lost to crossbeam); pajamax vs tonic (author-run); every buffa number
  (Anthropic-run, though methodology is public and careful); the h2 #917
  15–40% (maintainer-reported, no methodology in-thread); no post-0.4.16
  measurement re-quantifies the single-connection plateau; no grpc_bench
  run exists after 2026-04-22; nothing end-to-end on the new `grpc` crate.
- **Local limits**: all R8-local numbers are single-host Apple Silicon
  (LSE atomics; x86 `lock`-prefixed costs classically reported but
  unverified); channel/Arc/Bytes timings are single-run or best-of-3
  directional orderings; the memcpy grid covered 64-bit x86_64/aarch64/
  riscv64 only (no i686/wasm); avro benched via the OCF Value path only;
  no megamorphic (many-vtable) dyn site was measured; no async channel
  cells were run locally.
- **Open doors for Round 9**: an h2 0.4.19 single-connection plateau re-
  measurement; a post-transition grpc/grpc-rust benchmark once a server API
  exists; shm/MAP_SHARED inter-process channel costs (no crate publishes
  numbers); an E2E from_fn-vs-Service bench through hyper (this round's was
  dispatch-only); sonic-rs (repo moved/404) JSON numbers; the internals
  pre-RFC threads (t/12076, t/24543) read in full; x86 re-runs of the
  type-level and channel matrices.

# Round 9: approved skills built (2026-10-02)

The four proposed skills (designs parked in Round 7 §7.14 and Round 8
§8.12, both "awaiting approval") were built on user approval and now live
under `~/.agents/skills`:

- **rust-succinct-structures** — `~/.agents/skills/rust-succinct-structures`
- **rust-string-perf** — `~/.agents/skills/rust-string-perf`
- **rust-embedded-storage** — `~/.agents/skills/rust-embedded-storage`
- **rust-service-comms** — `~/.agents/skills/rust-service-comms` (seeded
  from rust-fast-architecture's `references/service-comms.md`, split into
  http-transport / rpc-grpc / wire-formats references)

The five existing skills (rust-superopt, rust-simd-crates, rust-simd-kernels,
rust-parallel-cache, rust-fast-architecture) were re-wired this round to
route to the four new ones; rust-fast-architecture's service-comms digest
was replaced with a pointer (the seed file stays on disk — still cited by
rust-parallel-cache's channels reference).
