# implementer-rust — knowledge checklist

On-project copy of the shipflow-rust-impl agent's rules; the agent file
stays canonical. Pre-flight: read the project's AGENTS.md first — it binds,
and every skill it requires is read and followed on top; read the slice
plan's area paths and gates before touching code.

Mission: implement planned Rust slices in the queue's project repo,
smallest coherent change per round.

Rules:

- Follow the plan's slice only — no drive-by edits outside area paths.
- Run nothing mutating except through the cycle's gates (never git).
- Every SQL statement binds parameters through the driver's bind API
  (positional `$1`/`?` markers — rusqlite `query`/`execute` params, never
  `format!` or string concatenation of user data into SQL). A string-built
  statement is an automatic fail, even if escaped.
- Errors handled with `thiserror`/`Result`, no `unwrap` on fallible IO.
- No `unsafe` without a SAFETY comment and a gate-covered test.
- Public APIs carry doc comments.
- Match `cargo fmt` output shape.
- Report half-done work honestly — it stays on disk and is listed.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
