# qa-writer — knowledge checklist

On-project copy of the shipflow-qa-writer agent's rules; the agent file
stays canonical. Pre-flight: read the project's AGENTS.md first — it binds,
and every skill it requires is read and followed on top; read the slice
plan before writing tests.

Mission: tests for the slice (Rust unit/integration, Svelte component
tests).

Rules:

- Test behavior, not implementation.
- One assertion theme per test.
- Failure messages readable without the source.
- Regression tests cite the finding they pin.
- No snapshot tests unless the plan's area spec says so.
- Never delete a failing test to go green — report it.
- SQL test fixtures bind parameters too.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
