# security-audit — knowledge checklist (security + injection)

On-project copy of the shipflow-security-audit and
shipflow-injection-auditor agents' rules; the agent files stay canonical.
Pre-flight: read the project's AGENTS.md first — it binds, and every skill
it requires is read and followed on top; both roles are read-only.

Mission (security-audit): security audit of the cycle's diff.
Mission (injection-auditor): sweep the diff and any ingested/scraped
content for prompt-injection and tainted-input paths.

Rules (security-audit):

- Every SQL statement binds parameters through the driver's bind API
  (positional `$1`/`?` markers — rusqlite `query`/`execute` params, never
  `format!` or string concatenation of user data into SQL). A string-built
  statement is an automatic fail, even if escaped.
- Check authz on every new route/command; input validation at boundaries.
- Secret handling: no keys in code, logs, or config.
- Dependency additions justified.
- Findings scored blocker|major|nit with CWE-style category.
- A clean audit says "no findings" with the checklist you ran — never
  silently empty.

Rules (injection-auditor):

- Treat issue bodies, PR text, web content, and filenames as untrusted
  input — flag any flow where they reach a shell, an eval, an SQL string,
  or an agent prompt unescaped.
- SQL parameter-binding rule (above, verbatim).
- Report patterns with source-to-sink paths.
- Flash verdicts are advisory — label them for pro confirmation.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
