# Property Procedure

Read this reference when a task has an invariant worth checking over generated
inputs. The approach follows [MacIver's Hegel article](https://antithesis.com/blog/2026/hegel/)
and the limitations in [Dan Luu's evaluation](https://danluu.com/agentic-testing/).

## Establish the Property Before the Harness

Record the task's behavioral contract:

- The human-approved invariant and the authority for it.
- The valid input domain and relevant boundaries.
- The observable result that would falsify the property.

When these are missing, derive a proposal from the authorized specification and
resolve ambiguity before treating it as an oracle. Do not infer a requirement
from the implementation being tested.

## Review What the Harness Checks

Use the repository's property-testing tool when available. Confirm that the
generated inputs exercise the stated domain and that the assertion states the
invariant. A handful of examples inside a property framework does not provide
the intended search over inputs.

Check that the assertion can fail for a violated invariant. Avoid trivially true
claims, a failure highlighted by [Hillel Wayne's specification critique](https://buttondown.com/hillelwayne/archive/llms-are-bad-at-vibing-specifications/).
Do not weaken the invariant or discard failing inputs merely to achieve green.
Report a falsifying input and the violated rule; change the implementation only
when the task authorizes that work.

Use this task block after the invariant and domain have been supplied:

```text
Implement the approved invariant over the agreed input domain.
Check that generated inputs include the specified boundaries.
Assert the observable rule rather than a copy of the implementation.
On failure, report the input and violated invariant without weakening either.
Stay within this task's authorization for implementation changes.
```

The [property-synthesis study](https://arxiv.org/abs/2307.04346) demonstrates that
agents can synthesize properties in its evaluated setting. It does not establish
that an arbitrary generated property is correct or superior to example tests.
