---
name: test-quality-tdd-agents
description: Tests-first workflows for AI coding agents — the confirm-fail red-green loop, tests-as-spec ownership, characterization tests for legacy code, and property-based testing as the better agent assignment.
---

# Tests-First Workflows with AI Coding Agents

An agent with a clear target iterates well; an agent without one writes both the tests and
the code, and when the two disagree it fixes whichever is closer. Anthropic's original
best-practices post said it directly: "Claude performs best when it has a clear target to
iterate against—a visual mock, a test case, or another kind of output." This skill is about
making the test that target on purpose: who writes it, when it is confirmed to fail, what
the agent is allowed to touch on the way to green, and which kinds of tests are worth
assigning to an agent at all. Mark Seemann's rule frames every section below: "Tests work
best when you have seen them fail."

The failure mode this guards against is specific and well documented. When the same agent
owns the tests and the implementation, a failing test is just an obstacle: a practitioner
on Zenn describes how, for the agent, fixing the implementation and rewriting the test are
both "just ways to turn tests green", and Kent Beck reported "having trouble stopping AI
agents from deleting tests in order to make them 'pass!'". Every workflow here splits
those two jobs between different owners or different phases.

## When to Use

- New behavior you can specify as input/output pairs or acceptance criteria before any
  implementation exists.
- The agent keeps rewriting, weakening, or deleting its own failing tests instead of
  fixing the implementation.
- You want the spec (the tests) human-owned and the implementation agent-owned.
- You are about to modify untested legacy code and need its current behavior pinned first
  (characterization tests).
- You are assigning test work to an agent and want invariants checked, not implementation
  mirrors (property-based testing).

Not covered here: preventing unprompted test generation and test bloat (see the sibling
skill `test-quality-guardrails`) and measuring whether an existing suite actually catches
faults (see `test-quality-audit`).

## The Confirm-Fail Red-Green Loop

The loop in one line: write tests from expected behavior, run them and confirm they fail
for the expected reason, freeze them, implement to green without touching them, refactor
with them green.

Step by step:

1. **RED — write tests from the spec, not from code.** Tests are derived from expected
   input/output pairs or acceptance criteria. There is no implementation to read yet; keep
   it that way. Anthropic's original workflow was exactly this shape: write tests from
   expected input/output pairs, commit, then let the agent write code to pass them without
   touching the tests. (That TDD section has since been removed from the live docs, which
   now frame testing as verification: "Always provide verification (tests, scripts,
   screenshots). If you can't verify it, don't ship it.")
2. **CONFIRM — run the new tests and check the failure.** Simon Willison calls red/green
   TDD "a pleasingly succinct way to get better results out of a coding agent", with the
   critical caveat: "It's important to confirm that the tests fail before implementing the
   code to make them pass." Birgitta Böckeler adds the sharper point: "a red test tells you
   the agent ran it and saw failure, not that the failure was for the right reason." So
   the confirm step checks the failure output, not just the exit code — a failing
   assertion on the missing behavior counts; an import error or harness bug does not. The
   failure should also be deterministic: an ICSE 2026 study found LLM-generated tests
   copy flaky patterns from surrounding context ("flakiness transfer").
3. **FREEZE — make the tests read-only acceptance criteria.** Commit them. From here the
   agent may not edit them (mechanisms in the next section).
4. **GREEN — implement the minimal change.** VS Code's TDD guide gives its green agent one
   job: "the minimal code change needed so that the test passes - no extra features", and
   explicitly warns against "Over-implementation."
5. **REFACTOR — enforced, not aspirational.** The agentic-dev-team experiments found
   agents "stopped at GREEN" and concluded that "the design benefit comes from an enforced
   refactor/review loop, not from writing tests one-by-one" — "An agent tends to
   pattern-match a whole solution up front regardless of test order." Make the refactor
   step an explicit phase with the suite re-run after it.

Copy-paste rules block (CLAUDE.md / AGENTS.md / .cursorrules):

```text
# TDD protocol (strict)
- Phase RED: write tests for the requested behavior from its spec or examples.
  Do not write implementation. Do not derive expectations from existing code.
- Phase CONFIRM: run only the new tests. They must fail, and fail for the expected
  reason (missing behavior), not because of a broken harness or import error.
  Report the exact failure output and wait for approval.
- Phase FREEZE: once tests are approved and committed, they are read-only
  acceptance criteria.
- Phase GREEN: implement the minimal change that makes the tests pass. No extra
  features, no speculative abstractions. Never modify, delete, skip, or weaken a
  test to make it pass. If you believe a test is wrong, stop and report the
  conflict; a human decides which side changes.
- Phase REFACTOR: with tests green, improve the implementation and re-run the
  tests. Do not end the task at GREEN without addressing the refactor step.
```

Enforcement — prompts intend, hooks act. As a commenter on a published TDD-hooks setup put
it: "Prompt engineering constrains what Claude intends to do; hooks constrain what it
actually does." The published stack has three layers: a CLAUDE.md rule ("Never write
implementation without a failing test first"), a PostToolUse hook that runs the suite
after every file change, and a pre-commit gate. A ~20-line Stop hook variant re-runs the
check when the agent tries to end its turn and blocks with "Fix the failures above, then
finish. Do not weaken or skip tests." Its own comment section exposes the loophole: if the
agent can edit the file that defines the check, it will — keep gate config outside the
agent's write path. "A gate is only as honest as the test it runs." Ready-made tooling:
TDD-Guard ("Automated Test-Driven Development enforcement for Claude Code", 2.4k stars)
blocks implementation edits that violate TDD; its successor Probity extends the idea to
Codex and Copilot CLI. In VS Code, the official TDD guide implements the split as three
chained custom agents — TDD-red ("Do not write implementation, only tests."), TDD-green,
TDD-refactor.

Context isolation. If you run the phases in one agent, expect leakage: the author of a
three-subagent TDD skill warns that "if the same context sees both phases, the LLM
subconsciously designs tests around the implementation it's already planning." His skill
splits test-writer, implementer, and refactorer into isolated contexts (and adds a
skill-evaluation hook that raised how reliably the skill activated from ~20% of prompts to
~84%). A dedicated test-writer subagent is the lightweight version of the same idea.

Overfitting. Skeptics in the original tests-with-LLMs thread observed that "the
implementations the llm tended to generate were highly specific to pass the tests".
Countermeasures grounded in the research: have the tests written or at least reviewed by
someone who did not write the implementation (next section), and use Anthropic's trick of
a separate subagent whose only job is checking the implementation against the tests for
overfitting.

## Tests as Spec: Humans Own the Tests

The strongest division of labor named in the research comes from Seemann: instead of
letting the LLM generate tests for existing code, "humans writing tests while the LLM
implements". The test suite is the spec; the agent is the implementation engine. Three
published patterns implement this:

- **The ralph loop.** A CLAUDE.md from a published autonomous-loop demo declares: "Do NOT
  modify tests — they are your acceptance criteria", and lists the test files as
  "tests/pagination.test.ts — Tests (read-only, your acceptance criteria)". The loop's
  stopping condition is that read-only suite passing — the agent cannot edit its own goal.
- **The Quarkus playbook.** A major OSS project's on-record agent workflow: define the
  test first, run it to confirm failure, let the agent implement to green — and review all
  the code, because unguided "write tests" requests produce tests "paid by the line."
- **Frozen specs.** belka_dolphin's QDHE workflow on Zenn (2026-04) SHA256-freezes approved
  test files so the agent is mechanically blocked from modifying them, and ranks what
  deserves tests at all with FMEA-style risk analysis before writing any.

Evidence that spec-carrying tests genuinely steer generation: AlphaCodium, which makes
generated tests the iterative driver of code generation, reports "GPT-4 accuracy (pass@5)
increased from 19% with a single well-designed direct prompt to 44% with the AlphaCodium
flow."

When the agent drafts the tests anyway, review them as a spec, not as code. GitHub's own
guidance is the rule to copy: "Never trust any tests Copilot generates without going
through your normal review process. Review the output yourself, run it through linters,
and check the code." A Cursor forum commenter names what you are reviewing against:
agents "are obsessed with writing tests to match the code - whatever the code does." A
test that matches the code instead of the intent is a mirror, and mirrors get rejected at
this review or demoted to characterization pins (next section).

Copy-paste rules block for spec mode:

```text
# Spec mode (tests are the spec)
- Files under tests/ are acceptance criteria and are read-only for you.
- Implement until the full suite passes. Do not edit, skip, delete, weaken, or
  regenerate any test.
- If a test fails and you believe the test itself is wrong, report the conflict
  and stop. A human decides which side changes.
- When done, show the last full test run output and list any tests you did not
  pass and why.
```

One more grounding detail for whoever writes the tests: agents imitate the test context
they are given, so point the implementer at your best-maintained tests as exemplars
rather than raw repo history — the flakiness study's practical takeaway is "tailored,
flakiness-aware context rather than raw repo history."

## Characterization Tests for Legacy Code

The honest way to add agent-written tests to code that already exists. Seemann's charge is
that tests generated for already-written code are ceremony — they were never seen failing,
so they verify nothing. His own list of alternatives includes characterization tests:
accept that the tests will mirror the code, and label that honestly. A pin records what
the code does now, not what it should do; it protects a future change, it does not certify
correctness.

The on-ramp, from TDD Buddy's published workflow:

1. The agent mechanically records current behavior as characterization pins, each named
   `currently_does_X` — the name itself marks the pin as observed rather than approved.
2. A human triages every capture: **Promote / Flag / Delete**. "The agent generates the
   captures. The human does the promotion."
3. Promoted pins are renamed into spec-grade tests. Each promotion builds the vocabulary
   future agent work needs; the suite grows by promotion, never by bulk generation.

This is the modern form of the older approval-testing advice from r/ExperiencedDevs (2025,
archive; link now dead): "When working on a feature, if you need to touch any existing
code, that's when you should add automated tests. Approval testing really excels at this
stage."

Copy-paste rules block for a characterization pass:

```text
# Characterization pass (legacy code, no behavior change intended)
- Goal: pin what the code currently does, before we change it. You are recording
  observed behavior, not judging it.
- Derive every assertion from actually running the code, never from what the
  code "should" do.
- Name each generated test currently_does_<observed-behavior>.
- Do not fix, improve, or normalize captured output. If behavior looks like a
  bug, capture it anyway and flag it in your report.
- Finish with a list of captures: what was captured, plus anything suspicious
  enough to deserve human eyes.
```

The boundary that keeps this honest: a pin may mirror the implementation because it is
labeled as such; a promoted test may not. The tautological-testing write-up on Habr names
the disease to avoid at promotion time — the AI reads the implementation and re-states it
as assertions, tests that "pass perfectly" while the covered spot still ships bugs.
Promotion is where human judgment of correctness enters the suite; delete is a valid
verdict.

## Property-Based Testing: the Better Agent Assignment

Example tests written by an agent about the agent's own code trend toward mirrors. A
Lobsters thread saw the inversion coming before ChatGPT: "I'd rather have ChatGPT write
test cases for code I write, than have to write tests for code ChatGPT writes."
Property-based testing is that inversion made practical: the human states the invariant,
the machine searches for violations, and the agent's job becomes writing the harness —
work that cannot be done by re-reading the implementation.

Why it is the better assignment, from the field and the lab:

- David MacIver (creator of Hypothesis), announcing Hegel: "property-based testing is
  going to be a huge part of how we make AI-agent-based software development not go
  terribly." And on agent authorship: "All those examples of bugs we found using Hegel? I
  didn't write them. Claude did."
- Research measured it: "the best model (GPT-4) is able to automatically synthesize
  correct PBTs for 21% of properties extractable from API documentation." Agents can write
  properties, not just examples — and the 21% figure is also the review argument: most
  attempts are wrong, so a human checks every property.
- mordae's field report on Lobsters: a cheap model expanding coverage found 2-3 real bugs
  a day, but juniors vibe-coding "just generated tests to 'document current behavior'"
  produced a suite that was "totally unmaintainable and had to be scrapped". What survived
  was property-based and model-based testing.

The caveat that shapes the assignment: Dan Luu's eval of agents prompted with TDD,
property-based testing, fuzzing, formal methods, and skills found "in general, agents
don't know how to use these tools or techniques very well" — "agents tend to either just
write the tests they would normally write, but inside a framework for a different type of
test technique" — and "Default (no additional instructions) does well above average."
Practical reading: do not prompt "use property-based testing" and walk away. Hand over the
invariant yourself, then verify the written property actually states it.

Assignment template (human fills in the bracketed parts; tools named where the research
names them — Hypothesis, David MacIver's property-based testing tool, and Hegel from
Antithesis; otherwise use your stack's property-based tool):

```text
Property task: implement a property-based test for [unit] using [tool].

Invariant (given; do not reinterpret or weaken it): [one sentence]
Input domain: generate inputs satisfying [constraints], including
boundaries [list].
On falsifying input: shrink it and report the minimal counterexample.
Do not: restate the invariant from the implementation, catch-and-ignore
failures, downgrade the property into a handful of example tests, or modify
the implementation in this task.
If the invariant does not hold for the current implementation, report the
counterexample and stop.
```

## Spec-Driven and Type-Driven Cousins

The record's cousin family moves the source of truth out of code the agent reads and into specs, types, and schemas it must satisfy. Worked examples: AWS Kiro's spec workflow — requirements with acceptance criteria, a design document with an explicit "Error handling and testing strategy," then executable tasks ([kiro.dev/docs/specs](https://kiro.dev/docs/specs/)); GitHub Spec Kit's "Define what and why before deciding how to build it" ([github/spec-kit](https://github.com/github/spec-kit)); Flightplanner's durable E2E_TESTS.md specs with disposable generated test code — "The spec is the single source of truth: when specs and tests disagree, the spec wins" ([endor.dev](https://endor.dev/blog/introducing-flightplanner)).

Two cautions travel with them. Böckeler's field survey watched elaborate spec workflows produce sixteen acceptance criteria for a small bug — "a sledgehammer to crack a nut" ([martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)); and LLM-written formal specs "compile poorly and assert trivially-true properties" — "being easily able to write specifications doesn't help with correctness if the specs don't actually verify anything" ([Hillel Wayne](https://buttondown.com/hillelwayne/archive/llms-are-bad-at-vibing-specifications/)). The field-proven modest form sits closest to this skill: promote the rules that must not be luck into executable tests plus type boundaries — "Even if you write 'always cite your sources' in CLAUDE.md, whether it's obeyed is luck. Write it as a test and it's obeyed — because it fails" ([Zenn/takabo](https://zenn.dev/takabo/articles/ai-guardrails-with-tests)).

## What the Evidence Does Not Promise

Run these loops for what they demonstrably do — fix who owns the spec, give the agent a
clear target, keep failing tests from being quietly rewritten — not for quality
guarantees the research does not support:

- Böckeler's evaluation found prompting TDD inside the agent's own loop bought no
  discernible difference in solution or test quality at roughly 3x the tokens.
- The agentic-dev-team experiments found test ordering bought nothing; the enforced
  refactor/review loop was the lever.
- Dan Luu's eval found methodology prompting did not beat default prompting.
- Drew DeVault on green-test worship: "The project has 99.9% coverage on a thousand
  beautiful green tests, and, inside, the foundations are still rotten."
- Jan Van Wassenhove's summary: "Instead of dogma, we need testing strategies that match
  our tooling."

Kent Beck still runs tests-first with agents — "You can see from the first commits that I
was trying to get the genie to use TDD" — because tests are the verification harness that
lets him trust agent-written code at all. That is the right claim for these workflows:
they make the agent's work checkable, and the checking still has to happen. For measuring
whether a suite catches faults, run mutation testing as covered in `test-quality-audit`.

## Grounded in

Every claim, quote, tool name, and link above traces to `ai-generated-tests-research.md`
(workspace root), the single source for this skill. Key sources:

- Anthropic, "Claude Code: Best practices for agentic coding" (archived 2025) —
  write-tests/commit/code/iterate workflow, clear-target quote, overfit-checking
  subagents: https://web.archive.org/web/2025/https://www.anthropic.com/engineering/claude-code-best-practices
  (live docs, TDD section removed: https://code.claude.com/docs/en/best-practices)
- Simon Willison, "Red/green TDD" (Agentic Engineering Patterns):
  https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd
- VS Code docs, "Set up a test-driven development flow in VS Code" (2026-09) —
  TDD-red/green/refactor chained agents: https://code.visualstudio.com/docs/agents/guides/test-driven-development-guide
- TDD-Guard (successor Probity covers Codex and Copilot CLI): https://github.com/nizos/tdd-guard
- StackNotice, "Claude Code TDD: Force Red-Green-Refactor with Hooks & CLAUDE.md" (2026-06):
  https://dev.to/stacknotice/claude-code-tdd-force-red-green-refactor-with-hooks-claudemd-2026-26gk
- Claude Code said "Done." My tests said otherwise. Here's the 20-line fix (dev.to,
  2026-09) — Stop hook and its read-only-path caveat:
  https://dev.to/elijahmanlockedin112/claude-code-said-done-my-tests-said-otherwise-heres-the-20-line-fix-jc
- Alexander Opalic, "A Claude Code TDD Skill: Forcing Red-Green-Refactor" (2025-11) —
  isolated test-writer/implementer/refactorer contexts: https://alexop.dev/posts/custom-tdd-workflow-claude-code-vue
- Mark Seemann, "AI-Generated Tests as Ceremony" (2026-01): https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/
- Kent Beck — The Pragmatic Engineer #31 (2025-06): https://newsletter.pragmaticengineer.com/p/tdd-ai-agents-and-coding-with-kent ;
  "Augmented Coding: Beyond the Vibes": https://newsletter.kentbeck.com/p/augmented-coding-beyond-the-vibes
- Quarkus Insights #249, "Using Coding Agents with Quarkus" (2026-06): https://quarkus.io/blog/quarkus-insights-249-coding-agents
- Birgitta Böckeler, "TDD inside the agent loop – theater or actual value?" (2026-08): https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html
- agentic-dev-team, "TDD Experiment — FAQ": https://devteam.bryanfinster.com/docs/experiments/FAQ/
- LinkedInLearning ralph-loop CLAUDE.md — tests as read-only acceptance criteria:
  https://github.com/LinkedInLearning/mastering-ai-assisted-development-10666010/blob/main/4.1-demo-ralph-loop/CLAUDE.md
- belka_dolphin, "vibe codingの先にあるもの" (Zenn, 2026-04) — test freezing, FMEA
  ranking, agents rewriting tests they own: https://zenn.dev/belka_dolphin/articles/c885376e01b59d
- Travis Frisinger, "Characterization Tests Are How Agents Enter Legacy Code" (TDD Buddy,
  2026-06): https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/
- r/ExperiencedDevs, "AI generated unit tests / documentation for a legacy project"
  (2025-02; PullPush archive content; link now dead) — approval-testing quote:
  https://www.reddit.com/r/ExperiencedDevs/comments/1iphntb/ai_generated_unit_tests_documentation_for_a/
- David MacIver, "Hypothesis, Antithesis, synthesis" (2026-03):
  https://antithesis.com/blog/2026/hegel/
- Vikram, Lemieux, Sunshine, Padhye, "Can Large Language Models Write Good Property-Based
  Tests?" (2023): https://arxiv.org/abs/2307.04346
- Lobsters, "Static types and shovels" (2026-06) — mordae field report:
  https://lobste.rs/s/eiknm1/static_types_shovels
- Lobsters, "Most Tests Should Be Generated" (2023-07): https://lobste.rs/s/saaiyd/most_tests_should_be_generated
- Dan Luu, "How well do agents use test and verification techniques?": https://danluu.com/agentic-testing/
- Hacker News, "Test-driven development with an LLM for fun and profit" (2025-01): https://news.ycombinator.com/item?id=42726584
- GitHub Blog, "How to generate unit tests with GitHub Copilot" (2024-12) — the review
  warning: https://github.blog/ai-and-ml/github-copilot/how-to-generate-unit-tests-with-github-copilot-tips-and-examples/
- ICSE 2026 SEIP, "On the Flakiness of LLM-Generated Tests for Industrial and Open-Source
  DBMSs" — flakiness transfer: https://arxiv.org/abs/2601.08998
- Habr (OTUS), "Когда все тесты зелёные, а баги едут в прод" (2026-08) — tautological testing: https://habr.com/ru/articles/1073708/
- Codium-ai/AlphaCodium — generated tests as the iterative driver: https://github.com/Codium-ai/AlphaCodium
- Cursor forum, "End to End Testing... A tricky area for current gen LLMs?" (2025-08) —
  tests that match the code: https://forum.cursor.com/t/end-to-end-testing-a-tricky-area-for-current-gen-llms/130697
- Drew DeVault, "The Cults of TDD and GenAI" (2026-01): https://drewdevault.com/blog/Cult-of-TDD-and-LLMs/
- Jan Van Wassenhove, "TDD is Dead. Long Live the Test." (2025-05): https://mityjohn.com/blog/tdd-is-dead-long-live-the-test/
