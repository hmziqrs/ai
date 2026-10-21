# Maintained V11 source composition

The runtime author contract is [authoring.md](authoring.md). Routine authors use that contract
and the CLI; they do not read engine internals. `scripts/compose.ts` selects allowlisted source
fragments in canonical order with unchanged bytes. `schema.dwf.ts` is also the deterministic
prelaunch plan validator. The canonical v4 kit remains unchanged.

Planning precede writers; plan checking is author-level (no workflow gate). Area pieces live in the proven flat per-area scheduler.
Literal phase names are selected before submission; no runtime imports, callback registries,
native channel/future feedback or hidden graph generation. Actual ZCode analysis must validate
new mixtures; TypeScript alone is insufficient. Never mask graph projection failure with a
larger process stack limit. Never wrap the engine tail in a long `try { ... } finally` span:
the platform's graph projector overflows its stack on that shape and kills the host turn at
CreateWorkflow submission with no diagnostics (V8 hit the same class with callback registries;
V11 reproduced it 2026-10-21 — three turn crashes, fixed by the `runEngine` inner function
plus catch-based teardown, pinned by the analyzer-safe-teardown composition test).

Validate meaningful behavior: plan-review blocks before writers; explicit count and repair
policies; independent writers/checks; real merged inputs; finite evidence budgets after source
changes; read-only guards; successful incremental command evidence; cleanup and device release;
root normalization and protected output. Keep all prior versions intact. Source tests do not
establish end-to-end LLM, device or application quality; report those limits honestly.
