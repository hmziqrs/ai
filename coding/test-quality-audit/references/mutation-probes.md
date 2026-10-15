# Bounded Mutation Probes

Read this only when an audit warrants a mutation probe within the authorized
scope. [Senko Rašić](https://blog.senko.net/improving-ai-generated-tests-using-mutation-testing)
describes realistic faults proposed in separate code-only AI sessions.
[MUTGEN](https://arxiv.org/abs/2506.02954) uses mutation feedback to improve tests.
Neither makes a particular score proof that a suite protects its specification.

## Prepare a Reversible Probe

The following is an operational interpretation of Senko's inject-and-test
procedure and [Willison's baseline practice](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/):

1. Identify a plausible fault in the reviewed behavior and its expected outcome.
2. Establish a passing relevant baseline. Investigate existing failures first.
3. Preserve current work and use an isolated, reversible change. Do not overwrite
   user edits or leave a fault in the working implementation.
4. Evaluate one fault at a time so attribution remains clear.

Use an existing mutation tool when available. The research names StrykerJS,
mutmut, and cargo-mutants in its tooling search notes, not as an AI-specific
comparative recommendation. An AI-proposed fault is optional and needs no new
framework. Give the proposing session implementation context without tests:

```text
Propose one small, realistic behavioral fault in the selected function.
Use implementation context only. Return the changed expression, intended
behavioral difference, and a reversible patch for review.
```

Review the proposal before applying it. Record what changed openly in the audit.
Fault selection should not be tailored to evade assertions visible to the
proposing session. Senko's separate-session practice motivates that isolation.

## Interpret and Restore

Record each fault, command, outcome, and explanation using these categories:

| Outcome | Evidence to retain |
| --- | --- |
| Detected | A relevant assertion fails because of the intended behavioral fault. |
| Survived | A valid behavior-changing fault runs and the relevant checks pass. |
| Invalid or inconclusive | Compilation, harness, unrelated failure, or uncertain behavior prevents attribution. |
| Duplicate | The fault repeats an already evaluated case. |

Non-compiling and duplicate mutants are documented in the
[mutation study](https://arxiv.org/abs/2406.09843). Separate them from evidence
about assertion quality; report uncertainty rather than inflating a score.

Restore each fault before the next probe and verify the final unmutated baseline.
Summarize unresolved surviving faults as questions about behavior or protection.
Do not delete a test merely because it detected none of the selected faults.
This is a conservative application of the
[ISSTA replication study's metric limitations](https://arxiv.org/abs/2607.22880).
