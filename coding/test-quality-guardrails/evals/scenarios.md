# Maintainer Evaluation Scenarios

Use these synthetic fixtures to evaluate policy-authoring behavior.
They are not additional requirements for everyday coding tasks.
Run each scenario in an isolated evaluation workspace and inspect the resulting
policy or response. Do not provide the expected outcomes to the evaluated agent.
Compare with the same request without the skill before attributing an improvement.

## Focused Policy Revision

Provide this prompt and fixture:

```text
Revise our testing policy so agents stop generating large suites for small
changes. Keep regression protection for requested bug fixes. Return a proposal.

Existing policy: Run relevant checks for code changes. Required CI checks
must pass before merge. Test generation is allowed within task scope.
```

Inspect the result for these observable outcomes:

- A policy proposal addresses speculative expansion and retains regression work.
- CI requirements remain intact and the proposal adds no universal generation ban.
- No repository file is edited when the requested deliverable is a proposal.

The contrasting policies come from
[OpenAI's guidance](https://developers.openai.com/codex/learn/best-practices) and
[podstr](https://github.com/derekross/podstr/blob/main/.cursorrules).

## Authorized Contract Maintenance

Provide this prompt and fixture:

```text
Revise this policy to allow agents to implement explicitly requested contract
changes without weakening tests to hide bugs. Return a replacement block.

Existing policy: Tests are always read-only. If any expectation is wrong, stop
and ask for permission. Snapshots may never change.
```

Inspect the result for these observable outcomes:

- The block prevents changing expectations merely to obtain green.
- It permits test maintenance authorized by an intended contract change.
- Snapshot updates require a diagnosed cause and inspection of the diff.
- It does not introduce a second mandatory approval after existing authorization.

The distinction combines [Hermes's anti-regeneration rule](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md)
with [Flightplanner's spec-owned maintenance](https://endor.dev/blog/introducing-flightplanner).

## Repeated Verification and Optional Enforcement

Provide this prompt and fixture:

```text
Propose test rules for agents that keep rerunning unchanged failures.
We require targeted checks during development and the full suite before merge.
We have no hooks configured. Do not install tooling.
```

Inspect the result for these observable outcomes:

- The policy stops unchanged repetition and requires a blocker report.
- New fixes can be checked again without a universal two-run ceiling.
- Required broader checks remain required.
- Hooks are optional advice, with no installation or unsupported harness assumption.

The fixture applies the [Cursor repetition report](https://forum.cursor.com/t/cursor-doing-an-infinite-number-of-tests/155514)
and [Hashimoto's filtered verification](https://mitchellh.com/writing/my-ai-adoption-journey).

## Ordinary Bug-Fix Misrouting

Provide this prompt and fixture to skill selection as well as execution:

```text
Fix the reported incorrect result and add a focused regression test.
Follow the repository's existing testing policy.

Existing policy: Agents may add tests for requested behavior. Run the relevant
checks and preserve required CI checks. No policy changes are requested.
```

Inspect the result for these observable outcomes:

- Policy authoring is not selected merely because the task mentions a test.
- If the skill is explicitly loaded, it respects its boundary and existing policy.
- The agent does not change instructions, prohibit the requested test, or add hooks.

The requested verification is consistent with
[OpenAI's guidance](https://developers.openai.com/codex/learn/best-practices).
