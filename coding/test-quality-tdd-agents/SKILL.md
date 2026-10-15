---
name: test-quality-tdd-agents
description: Design and update focused behavioral tests for bug fixes, new behavior, or legacy changes, choosing regression tests, TDD, characterization, or properties when the task calls for them.
---

# Behavioral Test Design with AI Coding Agents

Turn intended behavior into executable checks. Choose a workflow that fits the
requested change, preserve its source of truth, and report what execution proved.

## When to Use

Use this skill for requests to write or update behavioral tests, reproduce a bug,
use TDD, capture legacy behavior, or check a specified invariant.
Cosmetic edits alone do not need this workflow.
Repository policy configuration belongs to `test-quality-guardrails`.
Assessing or pruning an existing suite belongs to `test-quality-audit`.
Neither sibling skill is a prerequisite for writing a focused test.

## Choose the Mode

Start with the requested outcome and available evidence:

| Situation | Mode | Source of expected results |
| --- | --- | --- |
| A reported bug has an agreed expected result | Regression | Reproducer plus intended behavior |
| New behavior has acceptance criteria | TDD when useful or requested | Criteria and input/output examples |
| Legacy behavior must survive a change | Characterization | Observed execution, labeled as observation |
| A rule must hold across a meaningful input domain | Property | Approved invariant and domain constraints |

Keep the work proportional to the change. Do not impose TDD or property testing
on every task. These are selectable techniques, with mixed evidence for benefits
from prompting alone. See [Böckeler's TDD evaluation](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)
and [Dan Luu's technique evaluation](https://danluu.com/agentic-testing/).

## Establish the Oracle

Identify what makes an assertion correct before writing it:

1. Read the request, relevant acceptance criteria, and repository testing policy.
2. Locate the changed boundary and a maintained test showing local conventions.
3. State the expected behavior and its authority in one sentence.
4. Resolve material ambiguity from available specifications or user context.
   Ask only when the intended result remains undecidable.

Existing implementation can explain setup and reachable paths. It cannot certify
its own behavior as correct. Separate a captured observation from an approved
requirement. [Seemann's ceremony critique](https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/)
and [TDD Buddy's characterization workflow](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/)
motivate this distinction.

Preserve existing user authorization and repository workflow. Writing tests does
not create a new approval checkpoint, commit requirement, or delegation step.
When human-owned acceptance tests have explicitly been made read-only, honor that
chosen boundary. Do not extend it to every test file in ordinary work.

## Write the Smallest Useful Behavioral Check

Select the level that can expose the defect:

- Assert the observable result, including the consequential error or boundary case.
- Prefer a real interaction where mocking it would hide the failure being checked.
- Use integration or end-to-end checks when the risk is in assembled behavior.
- Avoid repetitive cases and coverage targets that add no distinct behavior.

These choices follow [Mark Larah's test-slop guidance](https://blog.larah.me/test-slop/)
and [Zenn's assembled-system failure report](https://zenn.dev/shune/articles/54501fc4fd6398).
They do not prescribe one test level for every system.

Use maintained examples without copying flaky assumptions, particularly collection
ordering. The [ICSE flakiness study](https://arxiv.org/abs/2601.08998) found agents
transferred such patterns from their context.

## Run Regression or TDD Work

For a bug fix, reproduce the agreed incorrect behavior before changing it when
feasible. For TDD, write the behavior check before implementation:

1. **Red:** run the relevant new test and inspect its failure.
   Confirm that the assertion exposes the missing or incorrect behavior.
   An import error, broken harness, or unavailable dependency does not establish red.
2. **Green:** make the smallest implementation change that satisfies the behavior.
   Keep expectations tied to the requirement while iterating.
3. **Review:** check whether the implementation overfits the examples and whether
   refactoring improves it. Make no extra edit when there is no useful refactor.
4. **Verify:** rerun affected checks after changes, following repository policy.

The sequence draws on [Willison's red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd),
[VS Code's TDD guide](https://code.visualstudio.com/docs/agents/guides/test-driven-development-guide),
and [Böckeler's failure-reason caveat](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html).

If the implementation already passes, inspect whether the proposed test checks
the requested behavior or duplicates existing coverage. Report that an original
failure was not demonstrated; do not invent execution evidence or declare the
test worthless solely because it was written after implementation.

Never delete, skip, or weaken an assertion to force green. A test may need a
justified change when the authorized contract changes or the test itself is wrong.
Explain that conflict and the authority for the new expectation; unresolved intent
requires clarification. [Hermes's regeneration rule](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md)
requires understanding the failure and reviewing the resulting changes.

For a deliberately chosen human-owned acceptance suite, preserve its read-only
files and report contract conflicts to its owner. The
[ralph-loop example](https://github.com/LinkedInLearning/mastering-ai-assisted-development-10666010/blob/main/4.1-demo-ralph-loop/CLAUDE.md)
illustrates this optional ownership model.

## Capture Legacy Behavior

Run the existing behavior and label captures `currently_does_<behavior>`.
Flag suspicious output rather than silently normalizing it or calling it correct.
Promotion into a requirement needs human judgment of intended behavior.
For a characterization task, read [the capture procedure](references/characterization.md).
Its capture/Promote/Flag/Delete distinction comes from
[TDD Buddy](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/).

## Check Properties When Justified

Use a property when a reviewed invariant expresses more than a list of examples.
Establish the input domain and its boundaries before writing generators.
Verify that the harness exercises the invariant rather than recomputing the
implementation or wrapping ordinary examples in a property framework.
For a property task, read [the property procedure](references/properties.md).
[MacIver's Hegel article](https://antithesis.com/blog/2026/hegel/) motivates the
approach; [Dan Luu's evaluation](https://danluu.com/agentic-testing/) supplies its
technique-misuse warning. Neither establishes universal superiority.

## Verify and Report

Use the repository's required commands and selected tests during iteration.
Broaden checks when the changed behavior or repository policy requires it.
A full suite on every edit is not a universal requirement; selective local runs
do not replace required CI checks. See
[Hashimoto's filtered verification workflow](https://mitchellh.com/writing/my-ai-adoption-journey)
and the [selective-run debate](https://news.ycombinator.com/item?id=45151447).

Report the behavior checked, its source of truth, commands run, and outcomes.
Distinguish a demonstrated assertion failure from an execution blocker.
State omitted checks and remaining uncertainty. Green tests support only the
behavior exercised, as the [assembled-system report](https://zenn.dev/shune/articles/54501fc4fd6398)
illustrates. Do not add repeated runs without a changed implementation, failure
diagnosis, or another unresolved verification question.

## Grounded in

Testing guidance is distilled from the repository's supplied research dossier.
The skill is self-contained; using it does not require reading that archive.
Maintainers can evaluate its behavior with [scenarios](evals/scenarios.md).
Key sources are:

- [Seemann: AI-Generated Tests as Ceremony](https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/).
- [Willison: Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd).
- [Böckeler: TDD in the agent loop](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html).
- [TDD Buddy: Characterization Tests Are How Agents Enter Legacy Code](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/).
- [MacIver: Hypothesis, Antithesis, synthesis](https://antithesis.com/blog/2026/hegel/).
- [Dan Luu: How well do agents use test and verification techniques?](https://danluu.com/agentic-testing/).
