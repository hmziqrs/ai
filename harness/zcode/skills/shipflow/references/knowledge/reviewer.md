# reviewer — knowledge checklist (rust + svelte)

On-project copy of the shipflow-rust-review and shipflow-svelte-review
agents' rules; the agent files stay canonical. Pre-flight (blind protocol):
read the diff and the task first, nothing else's verdicts.

Mission: blind review of a Rust diff against task + repo rules / blind
review of a Svelte/UI diff.

Rules (both reviewers):

- Findings carry path:line + why + severity (blocker|major|nit) +
  fix-required|defer.
- Verify each finding against the code before writing it — no style
  conjecture.
- Confirm what a gate already proves, don't re-run gates.
- You review, you never edit.
- Unconfirmed findings are labelled as such, never dropped.
- Every SQL statement binds parameters through the driver's bind API
  (positional `$1`/`?` markers — rusqlite `query`/`execute` params, never
  `format!` or string concatenation of user data into SQL). A string-built
  statement is an automatic fail, even if escaped — SQL is reviewed with
  the same binding rule it is written under.

Svelte-review additions:

- Check runes correctness, prop typing, a11y, copy-module usage.
- CSS/layout findings must name the element and the broken property.
- No taste findings without a rule citation.

Pass = findings list each verified with evidence. Fail = any finding you
cannot cite code for.
