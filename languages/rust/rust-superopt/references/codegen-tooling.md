# Codegen inspection and whole-binary optimization tooling

Which tool answers which question, and the status of each on this class of
host (facts verified on an Apple M3 Max / macOS 27 with rustc 1.98.1,
Homebrew LLVM 22.1.2, 2026-09):

| Question | Tool |
|---|---|
| Did this function vectorize / what asm ships? | cargo-show-asm (`cargo asm`) |
| *Why* didn't LLVM vectorize/optimize this? | `-C remark=...` or cargo-remark |
| Static throughput estimate of a kernel | llvm-mca (via cargo-show-asm `--mca`) |
| Where does time go in the whole binary? | profilers (see references/measurement.md) |
| Squeeze the whole binary without touching code | PGO, then BOLT |
| Superoptimize this instruction sequence | (research tools — mostly dormant; see last section) |

## cargo-show-asm (0.2.63) — the workhorse

Per-function disassembly/asm, works on **stable** Rust. Exercised
end-to-end here: `cargo asm --lib add3 --rust` interleaved ARM64 asm with
the Rust source lines, and `--mca` (with Homebrew's llvm-mca on PATH)
printed the full llvm-mca report — IPC 0.99, Apple "CyUnit" resources.

Full flag set: `--lib|--bin|--test`, `--release|--dev|--profile`, `--rust`
(interleave source), `--intel/--att`, `--llvm` (emit LLVM IR), 
`--llvm-input`, `--mir`, `--wasm`, `--mca` + `-M/--mca-arg`,
`--callers-of`, `--everything`, `--json`.

**Gotchas when piping `cargo asm` output to a standalone mca**:
- The `--rust` interleave emits a raw source line without a `//` comment
  prefix — llvm-mca throws a parse error.
- Truncated `.cfi_startproc` directives yield "Unfinished frame!".
- Workarounds: strip the cfi lines and interleave markers before piping,
  or just use `--mca` and let cargo-show-asm drive llvm-mca itself.

What to look for: `vaddps`/`vmulps`/`vfmadd*` (x86), `add.4s`/`fmla`
(aarch64). Two codegen facts you will otherwise misread:

- **No automatic FMA contraction** — the most common surprise for C
  arrivals. Under `+avx2,+fma`, rustc emits separate `vmulps`+`vaddps` for
  `out[i]=a[i]*b[i]+c[i]`; `f32::mul_add` is the only route to `vfmadd`
  (Round-1 test: 4 `vfmadd` on ymm). Rust also exposes no `-ffast-math`.
- A function can be "vectorized" per the remark while part of it is scalar
  (the f32 dot-product probe: vectorized multiplies, 21 scalar adds). Read
  the asm, not just the remark.

## LLVM optimization remarks

The flag form is `-C remark=<pass>`, plus `-C debuginfo=1` for source
locations (they often resolve into inlined core code). What the output
looks like when it works:

```
note: .../core/src/iter/range.rs:900:12 loop-vectorize (success):
      vectorized loop (vectorization width: 4, interleaved count: 4)
```

**Delivery caveat — the flags can be correct and still print nothing.**
Verified on this host class (macOS aarch64, rustc 1.98.1 stable, 2026-09):
`RUSTFLAGS="-C remark=loop-vectorize -C debuginfo=1" cargo build --release`
on a known-vectorizable loop printed **zero** remark lines, and a bare
`rustc --emit=link` (the codegen path cargo uses) was equally silent —
only the `--emit=asm`/`--emit=obj` paths emitted the notes, in a controlled
A/B on the same file. So before wiring remark output into scripts or CI
gates, confirm your route actually emits. The demonstrated-printing route:

```sh
rustc -C opt-level=3 -C debuginfo=1 -C remark=loop-vectorize \
      --emit=asm --crate-type=lib src/lib.rs
```

Cargo-integrated routes: **cargo-show-asm** (its output is the asm itself —
the ground truth the remarks only annotate) and **cargo-remark** below
(nightly, `-Zremark-dir`). If you need remarks specifically, e.g. for the
"why not vectorized" miss reason, use the bare-rustc route or cargo-remark
— not a plain `cargo build` invocation.

- Filter per pass with `-C remark=<pass>` (e.g. `-C remark=loop-vectorize`)
  — `remark=all` drowns the signal in size-info/regalloc noise. Do not
  substitute clang's `-Rpass`/`-Rpass-missed`/`-Rpass-analysis` flags here:
  rustc has no such options — `rustc -Rpass=loop-vectorize` fails with
  `error: Unrecognized option: 'R'` (verified on rustc 1.98.1). The
  `-C remark=` form is the only rustc route. (The research report carried
  the same clang-flags error; corrected 2026-09.)
- **cargo-remark 0.1.2** (last published 2023-09-28) renders remarks as a
  filterable HTML site: `cargo remark build` or `cargo remark wrap -- <cmd>`;
  needs nightly for `-Zremark-dir`. It was exercised in the report's
  research session, but it is still a remark route — verify it emits on
  your host before gating CI on it (same caveat as above).
- Remember the complexity cap: grep-check in CI the asm you depend on
  (cargo-show-asm output — the reliable vehicle per the caveat above),
  because what vectorizes today may not next release (Shnatsel).

## Hand-driving rustc (gotchas)

- One asm file normally captures only one codegen unit — use
  `-C codegen-units=1` when you need every function in one `.s`. (Round-1
  caveat: this was *not reproduced* at small scales — default CGUs emitted
  all functions of ≤6-fn, ≤3-module libs into one file. Untested at larger
  scales, not refuted.)
- At `-O3`, a bare `rustc --emit=asm` of a library silently omits plain
  `pub` fns (regardless of whether bodies can panic). Workaround:
  `#[no_mangle]`, or ensure reachability from a binary.
- Stable alternatives when cargo-show-asm doesn't fit: `cargo-binutils`
  (`rust-objdump`), `--emit=llvm-ir` (spotting `<N x f32>` vector types in
  IR is often faster than reading asm), godbolt.org.

## llvm-mca and uiCA

- llvm-mca estimates **static throughput**; it does **not** model fetch/
  decode, branches, or caches — treat it as a lower-bound pipeline model,
  never as a latency prediction.
- **On macOS**: llvm-mca exists only via Homebrew's keg-only LLVM at
  `/opt/homebrew/opt/llvm/bin/llvm-mca` (22.1.2; verified running, reports
  "Host CPU: apple-m3"). It is merely not on PATH. Xcode's toolchain ships
  10 llvm-* tools *without* mca or bolt; rustup's llvm-tools has
  llvm-profdata but neither mca nor bolt. Fix — put Homebrew's LLVM on PATH
  first, then let cargo-show-asm drive mca:

  ```sh
  export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
  cargo asm --mca ...
  ```
- Cross-arch estimates work: the same binary was run with
  `-mtriple=x86_64 -mcpu=haswell`.
- **uiCA** (Intel basic-block simulation from uops.info data, generally
  more accurate on Intel than llvm-mca) is absent from this host; cited
  from its docs only.

## PGO — the flag canon (Kobzol, re-verified 2026-09-29)

Preferred route is cargo-pgo: `cargo pgo build` → run representative
workload(s) → `cargo pgo optimize` (needs a matching llvm-profdata).

Raw flags, for scripts/CI:
```
RUSTFLAGS="-C profile-generate" \
  LLVM_PROFILE_FILE=./target/pgo-profiles/%m_%p.profraw \
  cargo build --release
# run the workload(s)
llvm-profdata merge -o merged.profdata ./target/pgo-profiles/
RUSTFLAGS="-C profile-use=merged.profdata" cargo build --release
```

Caveats that still hold:
- Don't double-instrument (PGO-instrumented + BOLT-instrumented at once).
- In `.cargo/config.toml`, rustflags belong under `[target.<triple>]`, not
  `[build]`, or cargo-pgo's flags get overridden (cargo-pgo issue #49).
- Debian/Ubuntu's BOLT packages are "broken currently" — build LLVM's bolt
  yourself or use a container.

## BOLT — post-link optimizer

- Worth it late: ~2–5% cycles on rustc/LLVM builds **on top of LTO+PGO**
  (rustc-project measurements). rustc's own distributed builds are
  PGO+BOLT-optimized, with BOLT applied on Linux CI (bootstrap sets
  `RUSTC_BOLT_LINK_FLAGS=1`).
- Requires linking with `-Wl,-q` (`RUSTFLAGS="-C link-args=-Wl,-q"`) so
  relocations survive, then: `llvm-bolt -instrument` → run the workload →
  `merge-fdata` → `llvm-bolt -data merged.profdata`. cargo-pgo wraps this:
  `cargo pgo bolt build --with-pgo` for the combined loop.
- **Linux-only by design** — llvm issue #72205 (open since 2023-11-14):
  "Right now LLVM BOLT supports only Linux platform… no plans to add
  Windows and macOS support." BOLT operates on x86-64/AArch64 ELF binaries
  linked with `--emit-relocs`/`-Wl,-q`, and the instrumented binary must
  *run* on Linux to produce `.fdata`.
- **From a Mac, the practical route is Docker/Linux CI** — cargo-pgo's own
  README: "For BOLT, it is highly recommended to use Docker". There is no
  Homebrew formula for llvm-bolt.

## Superoptimizer status (2026-09) — check before promising any of these

- **Souper** (google/souper): dormant. Last push 2024-08-28; its last LLVM
  bump is PR #880 "Bump to llvm 18" (2024-05-30), and `build_deps.sh` pins
  a *patched* LLVM 18.1.6 fork (regehr/llvm-project, disable-peepholes
  branch) — it does not build against LLVM 19+. Its own Rust/Cargo
  instructions PR (#855) has been open since 2022. The one live Rust↔
  Souper path is Cranelift: `cranelift-codegen`'s optional `souper-ir` dep
  with the `souper-harvest` feature dumps optimization candidates as
  Souper IR (souper-ir 2.1.0, from 2020, ~2M DL).
- **STOKE** (StanfordPL/stoke): dead — default branch last commit
  2020-12-04, last release 2.1 (2015), stoke.stanford.edu defunct (last
  Wayback snapshot 2022-08-27).
- **The active successor line is e-graphs**: egg 0.11.0 (2025-12-04; repo
  active 2026-07-19), egglog (active 2026-09-28), Herbie 2.3 (2026-07-31,
  for floating-point accuracy — repo now herbie-fp/herbie). Equality
  saturation is reaching production ML compilers (an XLA pass; Foresight,
  CC 2026).
- Practical stance: none of these is a routine Rust workflow tool today.
  If a user asks to "superoptimize" a sequence, what actually works is the
  ladder in SKILL.md plus the inspection tools above; mention egg only if
  they want to research rewrite rules, and Souper only via Cranelift
  harvesting.

## The condensed end-to-end workflow

Release build → inspect with cargo-show-asm → if not vectorized, read the
`-C remark=<pass>` output for the reason and fix the loop shape → widen the
ISA locally with
`-C target-cpu=native` / runtime-dispatch for shipped binaries → estimate
with llvm-mca (uiCA on Intel), **measure with criterion** → PGO, then
BOLT (Linux/Docker) for whole-binary wins. The sub-skills own the middle
rungs; this file owns the inspection and whole-binary ends.
