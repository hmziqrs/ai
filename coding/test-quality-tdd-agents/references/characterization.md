# Characterization Procedure

Read this reference when the task is to preserve existing behavior before a
legacy change. Its basis is [TDD Buddy's capture workflow](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/)
and [Seemann's characterization alternative](https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/).

## Capture the Changed Boundary

Limit captures to behavior relevant to the requested change:

1. Run representative inputs against the current implementation.
2. Record actual outputs, including surprising behavior.
3. Name each pin `currently_does_<observed-behavior>`.
4. Keep observation distinct from approval in the test and handoff.
5. Flag suspected bugs without fixing them during a preservation-only task.

A passing pin establishes that captured behavior remains unchanged for those
inputs. It does not establish that the behavior is desirable.

## Keep Promotion Explicit

Present captures for the owner's judgment using these dispositions:

| Disposition | Meaning |
| --- | --- |
| Promote | The owner accepts the behavior as a requirement; give the test a behavioral name |
| Flag | The behavior needs an intent decision before becoming a requirement |
| Delete | The capture adds no useful protection or should not be retained |

Finish authorized capture and preservation work without imposing a new approval
pause. Leave unresolved captures labeled as observations for review.

Use this task block when requesting a preservation pass:

```text
Capture the current behavior at the boundary changed by this task.
Use observed execution for expectations and label captures currently_does_X.
Preserve behavior during the refactor; flag suspicious captures in the report.
Do not promote an observation into a requirement without an intent decision.
```
