# Maintained V12 source composition

The author contract is [authoring.md](authoring.md); routine authors use it and the CLI, not
engine internals. `scripts/compose.ts` concatenates allowlisted fragments unchanged;
`schema.dwf.ts` doubles as the deterministic prelaunch validator. The canonical v4 kit stays
byte-identical; the model-policy helper is V12's trimmed HIGH-only copy (no LOW/MAX paths).

The engine is V11's flat per-area scheduler with literal phase names and concrete ask types,
plus V12's changes: findings-don't-veto phase handling and a final "Deliver and clean up"
phase (guarded ff-only delivery, then `z-v12/*` reclamation) after the catch-based teardown.
No runtime imports, callback registries or hidden graph generation.

Never wrap the engine tail in a long `try { ... } finally` span: the platform's graph
projector overflows its stack on that shape and kills the host turn at CreateWorkflow with
no diagnostics (V8 hit this class with callback registries; V11 reproduced it 2026-10-21 —
three turn crashes, fixed by the `runEngine` inner function plus catch-based teardown, pinned
by the analyzer-safe-teardown composition test).

Validate new mixtures with the actual ZCode analyzer, never TypeScript alone, and never mask
graph projection failure with a larger process stack limit. Validate meaningful behavior:
plan blocks before writers; explicit count and repair policies; independent writers/checks;
real merged inputs; finite evidence budgets after source changes; read-only guards;
successful incremental command evidence; cleanup and device release. Keep all prior versions
intact. Source tests do not establish end-to-end LLM, device or application quality.
