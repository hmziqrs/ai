---
name: test-quality-guardrails
description: Author or revise repository testing policies for AI coding agents when asked to configure test generation, test changes, verification, or enforcement, rather than during ordinary coding work.
---

# Repository Test Policies for AI Agents

Produce a focused testing policy for the repository's agent instructions.
Separate the team's choices from safeguards against changing acceptance criteria
to obtain a passing run.

## When to Use

Use this skill for requests to create, diagnose, or revise testing rules in
`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, or an equivalent repository policy.

Writing a regression test or reviewing a suite does not itself require changing
repository policy. Handle those requests within the existing rules.

## Establish the Policy Scope

Read the existing agent instructions, testing commands, and relevant CI checks.
Identify which reported behavior the policy should address before adding rules.
Keep the requested output explicit: a proposal, a copy-ready block, or a file edit.
Edit repository instructions only when the request authorizes that work.

Record the team's decisions on these points:

- When agents may add tests, including focused regression protection.
- Which acceptance tests are fixed and which tests agents may maintain.
- Which checks run during iteration, before completion, and in CI.
- Whether any enforcement mechanism is requested and supported by the harness.

Keep command tutorials and unrelated conventions out of the policy.
[Cursor's rules guidance](https://cursor.com/docs/context/rules) cautions against
padding instructions with commands agents already know.

## Choose a Test-Generation Policy

The sources describe different policies, not one established optimum.
[podstr's rules](https://github.com/derekross/podstr/blob/main/.cursorrules)
require explicit test requests, while
[OpenAI's Codex guidance](https://developers.openai.com/codex/learn/best-practices)
asks for tests when needed, relevant checks, and review.

Preserve the team's chosen policy. When none is specified, propose focused tests
that establish requested behavior or protect a bug fix, rather than adopting an
unsolicited ban on generation. Target consequential behavior and observable
boundaries, following [Mark Larah's test-slop guidance](https://blog.larah.me/test-slop/).
Avoid coverage-driven expansion and repeated assertions of implementation details.

If the team explicitly wants generation only on request, use this alternative
in place of the generation paragraph in the template below:

```markdown
Add tests only when the user's request authorizes them. A failing check or a
coverage suggestion alone does not authorize generating replacement tests.
Continue to run the relevant existing checks for implementation changes.
```

This is a local restriction adapted from podstr, not a prerequisite for safe
agent use. Do not combine contradictory generation policies in the same file.

## Copy-Ready Core Policy

Adapt this block to the existing repository rules. Preserve specific commands
and required checks already defined there:

```markdown
## Testing with coding agents

### Adding tests

Add focused tests when needed to establish the requested behavior or prevent
a bug's recurrence, within the repository's testing policy and task scope.
Base assertions on intended behavior and acceptance criteria. Avoid expanding
the suite merely to increase coverage or reproduce implementation details.

### Changing tests

Do not delete, skip, deselect, or weaken a test merely to obtain a passing run.
Diagnose failures before changing implementation or expectations.
Preserve acceptance criteria unless the task authorizes a contract change.
When that change requires test maintenance, explain the old and new behavior
and show the corresponding test diff for normal review.

Do not blindly regenerate snapshots or golden files. Explain the failure's
cause, identify the intended change, and inspect every changed expectation.
If the expected behavior is unresolved, report the conflict rather than
choosing whichever expectation makes the implementation pass.

### Running checks

Use relevant filtered checks while iterating. Run the broader checks required
by repository policy at completion or in CI, and report their actual status.
Keep required checks enabled. Targeted iteration does not replace those gates.

After changing the implementation or test setup, rerun the affected checks.
Avoid repeating an unchanged failing command without a new diagnostic reason.
If progress is blocked, report the command, failure, and remaining uncertainty.
Do not add verification passes after the required evidence is complete.

### Reporting results

State which checks ran, what passed or failed, and what was not verified.
Distinguish local results from pending CI results.
Explain any changed expectations and the behavior that authorized them.
```

The generation and completion rules adapt
[OpenAI's Codex guidance](https://developers.openai.com/codex/learn/best-practices).
The assertion boundary follows [Larah](https://blog.larah.me/test-slop/).
The anti-regeneration safeguard comes from
[Hermes's rules](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md).
Authorized test maintenance follows the spec-owned approach described by
[Flightplanner](https://endor.dev/blog/introducing-flightplanner).

## Set Verification Boundaries

Choose filtered runs that exercise the changed behavior, using the repository's
existing commands. [Mitchell Hashimoto's harness guidance](https://mitchellh.com/writing/my-ai-adoption-journey)
describes filtered test runs as fast, programmatic verification.

Distinguish a new implementation attempt from unchanged repetition.
The [Cursor forum report](https://forum.cursor.com/t/cursor-doing-an-infinite-number-of-tests/155514)
motivates an explicit retry budget. Its fixed limit is a local remedy, not
evidence for limiting all implementation attempts to two test runs.

Preserve the repository's broader verification requirements. If the team chooses
selective checks with a nightly full-suite backstop, name that arrangement and
its limits: the [HN discussion](https://news.ycombinator.com/item?id=45151447)
records the mitigation but does not establish release safety.

## Add Enforcement Only When Needed

When requested, choose a mechanism supported by the current harness.
[Claude Code's best practices](https://code.claude.com/docs/en/best-practices)
describe Stop hooks that verify work before a turn ends.
The [verify-gate example](https://dev.to/elijahmanlockedin112/claude-code-said-done-my-tests-said-otherwise-heres-the-20-line-fix-jc)
exposes a loophole: protecting tests is insufficient if the agent can rewrite
the check command. Protect the command configuration as well.

For a workflow that explicitly freezes approved acceptance tests,
[QDHE](https://zenn.dev/belka_dolphin/articles/c885376e01b59d) describes hash checks.
Retain an authorized path for intended contract updates. Do not freeze every
test or install hooks as an incidental part of writing a policy proposal.

Keep enforced checks bounded and relevant to the chosen policy. Treat these
mechanisms as safeguards, not proof that agent-written tests are correct.

## Review and Deliver

Check the proposed policy against a routine bug fix, an authorized contract
change, and a persistent failing check. Remove rules that produce conflicting
actions or approvals already covered by the user's request.

Deliver the requested proposal or policy diff, with the chosen generation mode,
verification responsibilities, and any enforcement limitations. Do not claim
that writing the policy proves it will be followed.

## Grounded in

These policy adaptations use the repository's AI-generated-tests research:

- [OpenAI, Codex best practices](https://developers.openai.com/codex/learn/best-practices): tests when needed, verification, and review.
- [podstr, .cursorrules](https://github.com/derekross/podstr/blob/main/.cursorrules): optional explicit-request generation policy.
- [Mark Larah, Test Slop](https://blog.larah.me/test-slop/): focused tests at observable boundaries.
- [Meta Hermes, CLAUDE.md](https://github.com/facebook/hermes/blob/static_h/CLAUDE.md): diagnose and review regenerated expectations.
- [Mitchell Hashimoto, My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey): filtered verification.
- [Flightplanner](https://endor.dev/blog/introducing-flightplanner): maintain tests against an intended specification.
