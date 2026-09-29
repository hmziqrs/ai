# Autovectorization — diagnose, unblock, and verify (ladder rung 1)

Everything here answers two user questions: "why didn't this vectorize?" and
"check if this loop vectorizes". Measured facts below were measured on rustc
1.98.1 / LLVM 22, Apple M3 Max, opt-level 3 unless noted. Re-derive on your own
target with the toolchain recipes at the bottom — baselines differ per target
(e.g. `dotprod` is in the aarch64-apple-darwin baseline but not everywhere).

## What actually vectorizes your code

rustc has **no vectorizer of its own** — LLVM's **loop-vectorize** and
**slp-vectorizer** passes do the work. Knowing which pass fires tells you which
shape to try:

- **loop-vectorize**: loops with a provable trip count and regular stride.
- **slp-vectorizer**: straight-line / reduction idioms *outside* loops —
  adjacent independent operations get packed.

**Vectorization happens at opt-level 2 and 3 only.** Measured: `fadd.4s`
present at 2/3, zero vector instructions at 0/1. Cargo's release profile
defaults to opt-level 3, so plain `cargo build --release` already tries; debug
builds never will (this is also why SIMD-heavy deps tell you to raise
opt-level for their package in dev profiles).

## The calibration set — measured probe behaviors

Use these as expectations when reading your own asm (aarch64, opt-level 3):

| Probe | Outcome | Lesson |
|---|---|---|
| `out[i] = a[i] + b[i]` via `zip` | vectorized: `fadd.4s` ×4, interleaved ×4, scalar epilogue | the happy path; map-shaped loops work |
| same via **raw indexing** | also vectorized | modern LLVM hoists bounds checks into an up-front length check — see folklore note below |
| f32 dot `s += a[i]*b[i]` | **muls vectorize (`fmul.4s` ×5), adds stay scalar — 21× `fadd sN`, zero `fmla.4s`** | the classic float-reduction failure; the LLVM remark even reports "vectorized" for the mul part — **read the asm, not just the remark** |
| integer wrapping reduction | vectorized (`add.2d` + `addp.2d`) | integer reassociation is free; float is not |
| gather `a[idx[i]]` | not vectorized; on x86_64 with `+avx2` LLVM emitted **zero** `vgather` | restructure the layout (SoA), don't fight it |
| u8·u8 dot | vectorized with `udot.4s` | because `dotprod` is in this target's baseline — verify yours with `rustc --print cfg` |

**Bounds-check folklore is stale for simple shapes.** "Bounds checks always
block vectorization" no longer holds where the check can be hoisted (both zip
and raw indexing vectorized above). It still holds where it can't — so make
lengths provable regardless, with the tools below.

## Floats: the big exception, and the 1.98 escape hatch

LLVM will not reassociate floats, and Rust exposes no `-ffast-math`. This was
the sharpest community dispute about the 2025 "state of SIMD" survey, and it
was **resolved in-thread** (r/rust, complete 46-comment recovery):

- Western_Objective209: "I have not found this to be the case; even something
  as simple as a dot product often fails to auto-vectorize."
- iwxzr: with no mechanism to *ensure* vectorization, autovec is "generally
  unsuitable for writing computational kernels… it is simply a nice surprise
  gift from the compiler."
- dm603 identified the blocker — IEEE float non-associativity — noting "the
  currently-unstable algebraic operations take care of this, and also allow
  autovec to use fused mul-add too".
- Shnatsel then showed the iterator version "vectorizes just fine, but only if
  you indicate to the compiler that it's allowed to calculate your floats with
  reduced precision" (godbolt.org/z/zs44s8vnv; orlp.net/blog/taming-float-sums/).

**Rust 1.98 (2026-08-20) stabilized `algebraic_add()` / `algebraic_mul()` /
etc.** — stable Rust finally has the float-reassociation opt-in. Plain `+=`
still won't vectorize (measured on 1.98.1); reach for `algebraic_add` when a
float reduction must vectorize and the tolerance change is acceptable. On
nightly, `core::simd`'s `reduce_sum()` gives the same win explicitly (measured:
an `f32x8` sum-of-squares compiles to `fmul.4s`+`fadd.4s` NEON reduction).

**There is no automatic FMA contraction — the single most common surprise for
C arrivals.** rustc does *not* emit `vfmadd` for `out[i] = a[i]*b[i] + c[i]`
under `+avx2,+fma`; it emits separate `vmulps`+`vaddps` (FP contraction is
off). `f32::mul_add` is the only route to `vfmadd` (measured: 4 `vfmadd` on
ymm). Pair this with "no -ffast-math exists" when explaining why the C code
was faster.

## Loop shapes that help (rung 1 rewrites)

- **Handle the tail explicitly**: `chunks_exact(LANES)` + scalar
  `remainder()`; or better, `slice::as_chunks` (stable since 1.88, 2025-06-26),
  which gives you `(chunks, remainder)` without iterator noise.
- **Beware the `&mut`-iterator inhibition** (WormRabbit, the sharpest
  practitioner detail from the thread): "somewhy passing a `&mut chunk_iter`
  into the loop iterator inhibited the optimization… nested explicit
  indexing, the compiler gets confused. It could probably be solved with
  strategic `assert!` statements." If a refactor mysteriously killed
  vectorization, look for borrows threaded through the loop.
- **Hand LLVM proofs when checks can't hoist**: `core::hint::assert_unchecked`
  (stable 1.79) for length/alignment invariants, `std::hint::black_box` to
  pin values. These are the modern replacements for "sprinkle `assert!`".
- **Fix alignment and layout blockers**: packed/misaligned struct fields and
  Vec-vs-slice alignment mismatches can block vectorization on their own.
- **Stay contiguous.** `&[T]` not `Vec<Vec<T>>`; restructure gathers into
  strided passes instead.
- **Know the scope limit** (WormRabbit): autovec is "quite reliable for
  relatively simple computations… Unfortunately, it doesn't scale that well to
  function calls." Beyond simple map/reduce shapes, move to rung 2.

## Reading the tea leaves — inspection toolchain

- **cargo-show-asm 0.2.63** (`cargo asm --rust --intel --mca`): per-function
  asm interleaved with Rust source; works on stable; llvm-mca integration via
  `--mca`. Full useful flags: `--lib|--bin|--test`, `--release|--dev|
  --profile`, `--llvm`, `--llvm-input`, `--mir`, `--wasm`, `--callers-of`,
  `--everything`, `--json`. Gotchas when piping its output to standalone mca:
  the `--rust` interleave emits a raw source line without `//` (parse error)
  and truncated `.cfi_startproc` yields "Unfinished frame!" — strip cfi lines,
  or just use `--mca` directly.
- **LLVM remarks**: `-C remark=all -C debuginfo=1` prints e.g.
  `loop-vectorize (success): vectorized loop (vectorization width: 4,
  interleaved count: 4)`. `debuginfo=1` is required for locations (which often
  resolve into inlined core code). Filter per pass (`-C
  remark=loop-vectorize`, and the `-Rpass/-Rpass-missed/-Rpass-analysis`
  family) — `remark=all` drowns the signal in regalloc noise.
- **cargo-remark 0.1.2** (last published 2023): renders remarks as a
  filterable HTML site (`cargo remark build` / `cargo remark wrap -- <cmd>`);
  needs nightly for `-Zremark-dir`.
- **`--emit=llvm-ir`**: spotting `<N x f32>` types in the IR is often faster
  than reading asm.
- **godbolt.org** for shareable one-function experiments.
- **llvm-mca**: static throughput estimates; it does **not** model fetch/
  decode, branches, or caches — estimates only, benchmarks decide. On macOS it
  is not on PATH: Homebrew's keg-only LLVM has it at
  `/opt/homebrew/opt/llvm/bin/llvm-mca` (verified runnable, LLVM 22.1.2);
  Xcode's and rustup's llvm-tools do not include it. uiCA (Intel basic-block
  simulation, generally more accurate on Intel) is documented but absent from
  a stock macOS host.
- **Hand-driving rustc gotchas**: at `-O3` a bare `rustc --emit=asm` of a
  library silently omits plain `pub` fns — use `#[no_mangle]` or reachability
  from a binary. `-C codegen-units=1` is claimed to matter for asm capture
  (one CGU per file); not reproduced at small scales in testing — stands
  untested rather than wrong.

## CI regression tracking

Autovectorization is a complexity cap, not a contract: "If something
vectorizes today that doesn't necessarily mean it still will in a year from
now." For every loop that must stay vectorized, add a CI check that builds
release and **greps the remarks or `cargo asm` output** for the expected
vector instructions (or asserts the remark's "vectorization width"), so a
compiler bump that silently scalarizes a hot loop fails the build instead of
shipping.

## ISA flags and the shippable middle ground

- `-C target-cpu=native`: targets the host. Fine locally; **never for
  distributed binaries** ("crash or misbehave" on other CPUs).
- `-C target-feature=+avx2,+fma`: verified to switch codegen to ymm;
  `+avx512f,+avx512vl` → zmm. Remember: these are *permissions*, not requests
  — see the no-FMA-contraction section for what still won't happen.
- `-C target-cpu=x86-64-v2/v3/v4`: the practical "raise the whole baseline"
  knobs between plain x86_64 and per-feature enables — the shippable middle
  ground for binaries with a known deployment floor.
- Project-wide flags belong in `.cargo/config.toml`, scoped per target:

```toml
# .cargo/config.toml
[target.'cfg(target_arch = "x86_64")']
rustflags = ["-C", "target-cpu=x86-64-v3"]   # build-time floor; know your fleet
```

  (In cargo-pgo workflows keep rustflags under `[target.<…>]`, not `[build]`,
  or the tool's flags get overridden — cargo-pgo #49.)
- **vzeroupper**: mixing 128-bit baseline code and 256-bit (+avx2) paths in
  one binary incurs AVX/SSE transition penalties; niche but real once you mix
  widths. Keep the wide paths self-contained.
- Vector widths on NEON follow 128-bit lanes: width 4 for f32, 16 for u8, 2
  for u64 — read counts against that rule, not against a fixed "4 or 8".

## When rung 1 is exhausted

If after these rewrites the loop still won't vectorize (data-dependent exits,
cross-iteration dependencies, float semantics you cannot relax, or gathers
you cannot restructure), go to rung 2 (references/portable-simd.md) or rung 3
(references/intrinsics.md). If the blocker is memory layout, rung 4
(restructure) beats both — SIMD over scattered data loses to scalar over
contiguous data.
