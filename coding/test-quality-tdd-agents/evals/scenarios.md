# Maintainer Evaluation Scenarios

These are evaluation fixtures, not execution results or runtime instructions.
Run a candidate skill and a baseline against the same request and artifacts in
isolated workspaces. Judge observable decisions and produced tests rather than
specific wording. Keep evaluator expectations separate from the agent prompt.

## Regression Test with Existing Authorization

Prompt: "Fix pagination repeating the final item on the next page and add a
focused regression test. Continue through implementation and verification."

Fixture: a small pagination implementation with an overlapping page boundary;
the documented contract says pages are disjoint and preserve order. Supply a
working test command and one maintained test. No approval gate exists.

Expected observations:

- The test checks the disjoint-page contract at the repeating boundary.
- Its initial assertion fails because an item repeats, rather than a harness error.
- The agent fixes the implementation and verifies affected behavior.
- It finishes authorized work without inventing an approval or commit checkpoint.

The defect pattern tests [Willison's red/green procedure](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd)
and [Böckeler's failure-reason distinction](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html).

## Characterization with Suspicious Behavior

Prompt: "Refactor this legacy formatter while preserving its current behavior.
Add characterization coverage for the boundary you change."

Fixture: a formatter with documented common output but an observed trailing
separator for empty input. Supply execution access and no intended empty-input
contract.

Expected observations:

- The agent captures actual output and labels the empty-input case as observation.
- It flags the surprising separator without silently changing it.
- The refactor preserves the capture; no claim calls the separator correct.
- Unresolved intent stays visible in the handoff.

This scenario exercises [TDD Buddy's capture/promotion boundary](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/).

## Property Harness That Can Falsify a Rule

Prompt: "Add a property test for the approved invariant: sorting preserves the
input's elements, including duplicate counts. The domain is finite integer lists,
including empty lists and repeated values. Do not change implementation."

Fixture: a sorting implementation that removes duplicates and a working property
framework already used by the repository.

Expected observations:

- Generated inputs reach duplicate-containing lists and the empty boundary.
- The assertion checks multiplicity rather than set equality or a copy of the algorithm.
- The agent reports a falsifying input without suppressing it or editing implementation.
- The final report distinguishes detecting a bug from fixing it.

This scenario probes the technique misuse described in [Dan Luu's evaluation](https://danluu.com/agentic-testing/).

## Negative Routing Case

Prompt: "Change the settings button label from Preferences to Settings."

Fixture: a presentational component with the label supplied directly as text;
repository policy requires no new tests for copy-only changes.

Expected observations:

- The agent makes the requested text change without starting a testing methodology.
- It adds no speculative test cases, suite audit, or policy changes.
- It follows any existing required checks without expanding the task.

This boundary follows [Larah's test-slop guidance](https://blog.larah.me/test-slop/)
and the research dossier's [cost-of-repetition example](https://forum.cursor.com/t/cursor-doing-an-infinite-number-of-tests/155514).
