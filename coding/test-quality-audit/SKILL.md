---
name: test-quality-audit
description: Assess an existing test suite when an audit or evidence of weak protection warrants it, and produce ranked findings or authorized pruning with verification.
---

# Audit Existing Test Suites

Assess which behaviors a suite protects and where its maintenance cost buys
little evidence. Return reviewable findings. Change tests only within the
user's authorized scope, following the repository's testing policy.

## When to Use

Use for requests to audit inherited or generated tests, investigate escaped
defects despite green runs, or assess proposed test pruning. Ordinary bug fixes
and feature work do not require a suite audit. Test design and repository-policy
authoring are separate tasks.

## Establish Scope and Baseline

Start with the requested module, recent escaped defect, or critical user flow.
Identify relevant tests, expected behavior, test levels, and existing commands.
Prefer a risk-based sample to an unrequested repository-wide investigation.
The risk framing draws on [Zenn/QDHE](https://zenn.dev/belka_dolphin/articles/c885376e01b59d)
and the cost constraints in [ClickHouse's rules](https://github.com/ClickHouse/ClickHouse/blob/master/.claude/CLAUDE.md).

Record these boundaries before interpreting results:

- Audit mode: findings only, or changes already authorized by the user.
- Scope: modules, flows, sampled tests, and important areas left unexamined.
- Expected behavior: specification, acceptance criteria, or known regression.
- Baseline: relevant command, result, existing failures, and environment limits.

Run the relevant existing checks before changing tests, following
[Simon Willison's baseline practice](https://simonwillison.net/guides/agentic-engineering-patterns/first-run-the-tests/).
If checks cannot run, continue static review and state that limitation. A failed
baseline prevents attributing later failures to an audit probe without further
investigation. Do not claim a passing run that was skipped.

Use coverage and pass counts as navigation aids. Neither proves that the suite
detects the relevant faults. Mutation scores also have limits, especially when
the implementation may already be wrong: see the
[ISSTA replication study](https://arxiv.org/abs/2607.22880).

## Review Behavior and Assertions

For each sampled test, identify the behavior, input, expected outcome, and
source of that expectation. An oracle copied from implementation can preserve
the same bug; compare against intent, as discussed in
[Understanding LLM-Driven Test Oracle Generation](https://arxiv.org/abs/2601.05542).
Treat unexplained current behavior as a characterization candidate, not an
approved contract, following [TDD Buddy](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/).

Investigate these signals with concrete evidence:

| Signal | Question to resolve |
| --- | --- |
| Expected result repeats production logic | What independent requirement establishes the answer? |
| Assertion checks calls or private helpers | Does the interaction itself matter to the contract? |
| Weak assertion or empty body | What incorrect outcome could still pass? |
| Tests fail after internal refactoring | Did observable behavior change, or only implementation? |
| Repetitive cases | Do they protect distinct behaviors or the same case repeatedly? |
| Unspecified ordering | Does the contract guarantee order? |

These are investigation prompts, not automatic deletion rules. Their basis is
[Habr's tautological-testing account](https://habr.com/ru/articles/1073708/),
[VibeCheck's assertion-quality findings](https://arxiv.org/abs/2609.05978),
[Larah's test-slop critique](https://blog.larah.me/test-slop/), and the
[DBMS flakiness study](https://arxiv.org/abs/2601.08998).

Mocks require context: the [over-mocking study](https://arxiv.org/abs/2602.00409)
reports their frequency, not a verdict on an individual test. Determine whether
the mock excludes the interaction the test claims to validate. Preserve useful
checks of interaction contracts.

Missing failure history is a confidence gap. [Seemann](https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/)
recommends seeing tests fail. Use a relevant controlled fault when justified;
do not reject an otherwise useful regression test solely because it was written
after implementation.

## Check Protection Across Test Levels

Map the sampled critical flow to what its unit, integration, and end-to-end
checks exercise. Identify an untested boundary or assembled behavior rather
than prescribing a numeric mix. [Zenn/ababup1192](https://zenn.dev/ababup1192/articles/77b844dcfc1529)
explains that each test level detects different defects; the
[1,310-green-tests account](https://zenn.dev/shune/articles/54501fc4fd6398)
illustrates the missing assembled-system check.

Name the specific risk behind expensive checks. A mocked external dependency
may leave a real integration unverified, but a live probe must fit the requested
scope, repository policy, credentials, and cost. [iTerm2's live harness](https://github.com/gnachman/iTerm2/blob/master/CLAUDE.md)
is a project-specific example, not a requirement for every dependency.

## Use Mutation Evidence Selectively

Use a bounded mutation probe when uncertainty about an assertion's sensitivity
justifies its cost. Prefer existing tooling and a small relevant scope. Do not
install tools, add CI gates, or schedule scans merely to complete an audit.
For an authorized probe, read [the mutation procedure](references/mutation-probes.md).

Mutation results can expose gaps and guide targeted improvements, as in
[Senko Rašić's practice](https://blog.senko.net/improving-ai-generated-tests-using-mutation-testing)
and [MUTGEN](https://arxiv.org/abs/2506.02954). Interpret them as bounded evidence:

- A behavior-attributable failure shows sensitivity to that specific fault.
- A valid surviving mutation raises a question about the fault or requirement.
- Invalid, non-compiling, duplicate, or harness-failing mutations do not establish
  assertion sensitivity; separate them from interpretable outcomes.
- Killing no selected mutants does not establish that a test is worthless.
- Matching scores before and after pruning do not prove equal protection.

The last two rules are conservative interpretations of the
[ISSTA metric limitations](https://arxiv.org/abs/2607.22880); invalid and duplicate
mutants are documented in the [mutation study](https://arxiv.org/abs/2406.09843).

## Propose or Apply Dispositions

Adapt [TDD Buddy's human triage](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/)
to the suite under review. Assign dispositions with reasons:

- Keep: meaningful behavior with a justified expectation.
- Improve: a specific gap, coupling issue, or flaky assumption needs correction.
- Clarify: the intended behavior is unresolved.
- Remove: demonstrated redundancy or irrelevance, with remaining protection named.

For findings-only audits, return proposals. When pruning is already authorized,
apply supported changes without inventing another approval step. Preserve the
behavior protected by critical-flow tests through retention or replacement.
Do not weaken, skip, or regenerate failing tests merely to make the run green;
[Hermes' rules](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md)
require understanding the failure and reviewing the resulting change.

After changes, rerun the same relevant baseline. If mutation evidence influenced
the decision, compare the same interpretable fault cases as well as the behavior
review. Report any lost protection or unresolved failure. This verification
combines the baseline practice above with mutation diagnostics; it does not
certify equivalence from a score alone.

## Report Findings

Rank findings by behavioral risk and support each with a test path, observable
evidence, impact, and proposed disposition. State uncertainty where intent or
execution evidence is missing. A useful finding has this shape:

```text
Path: tests/cart.test.ts
Evidence: expected total repeats the production discount formula.
Risk: the same formula error can make implementation and expectation agree.
Disposition: improve using the documented discount examples.
Validation: existing check passes; no controlled fault was evaluated.
```

Finish with scope examined, checks performed, changes made, and limitations.
Do not present a sampled review as a whole-suite judgment. Maintainers evaluating
this skill can use [the scenarios](evals/scenarios.md); they are not runtime steps.

## Grounded in

The repository's AI-generated-tests research report is the provenance record;
this skill's workflow does not require loading that archive. Key sources are:

- [Test oracle generation](https://arxiv.org/abs/2601.05542): intent-derived expectations.
- [ISSTA replication study](https://arxiv.org/abs/2607.22880): limits of coverage and mutation metrics.
- [Senko Rašić](https://blog.senko.net/improving-ai-generated-tests-using-mutation-testing): bounded mutation diagnostics.
- [TDD Buddy](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/): review and triage of captured behavior.
- [Hermes](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md): understand failures before updating tests.
- [Larah](https://blog.larah.me/test-slop/): reduce redundant, brittle generated tests.
