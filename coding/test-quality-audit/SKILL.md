---
name: test-quality-audit
description: Audit and prune AI-generated test suites by measuring what they actually catch (mutation testing), treating coverage as a vanity metric, spotting implementation-mirroring tests, right-sizing the test mix, and deleting test slop through deliberate human triage.
---

# Auditing and Pruning AI-Written Test Suites

AI coding agents produce tests faster than any team can review them, and a green run of agent-written tests is a claim, not evidence. The research record is blunt: "some test suites achieve 100% coverage but only 4% mutation score" (MUTGEN, IEEE TSE), and on a real 180+ module Vitest project, LLM-generated tests "easily reach 90%+ coverage, but roughly 40-60% of their assertions are 'nonsense assertions' - they pass yet catch no bugs" (juejin). One developer ran nine Claude Code agents that delivered 1,310 passing tests, and the assembled app broke the moment it was opened.

This skill treats the suite itself as the thing under test: measure what the tests actually catch, smell out tests that merely mirror the implementation, right-size the unit/integration mix, spend testing effort where the risk is, and delete slop deliberately instead of regenerating it.

## When to Use

- You inherited or accrued a suite in which most tests were written by Claude Code, Cursor, GitHub Copilot, or similar agents, and nobody has audited it.
- Pull requests arrive more than half test code, review depth on tests is collapsing, and "regenerate" is becoming the default maintenance action.
- Coverage is high (or green counts are huge) yet bugs still ship through the "covered" code.
- You are about to lean on the suite as the safety net for agent-driven refactors, and need to know whether it will actually hold.
- You are defining CI quality gates for test changes and need a metric that cannot be gamed by volume.

## 1. Read the Numbers Correctly: Coverage Is a Vanity Metric

Coverage counts executed lines, not checked behavior. For agent-written suites it is systematically inflated:

- MUTGEN (IEEE TSE 2025): suites achieving "100% coverage but only 4% mutation score."
- juejin field measurements on a real Vitest project: 90%+ coverage, roughly 40-60% "nonsense assertions," a ~34% mutation-kill score, and an effective-assertion ratio of 0.31.
- Habr/Netology: "The number of cases, a green run, and high code coverage show the scale of the test suite - they do not prove that it catches errors."
- TestGenEval: on real repository code, the best model (GPT-4o) managed "an average coverage of only 35.2%" of statements - generated suites are shallower than demos suggest.
- Thorsten Ball, "A Few Words on Testing" (Register Spill): "I never believed in testing coverage as a metric."

One caveat that cuts both ways: the ISSTA 2026 replication study found that when the code under test may already be buggy - which is exactly the case when agents wrote it - coverage and mutation scores both "no longer serve as reliable indicators." Metrics rank suspects; they do not acquit code. Audit the suite and the code it claims to check, together.

Rules block - metrics policy:

```text
- Coverage numbers and green-test counts are reported as context, never as acceptance.
- A coverage increase produced by an agent is not evidence of anything until mutation-
  checked (section 2).
- Coverage is a by-product: assertions derive from spec/intent first, get mutation-
  validated second; coverage is observed, not targeted (juejin governance pipeline).
- Any "N tests passing" claim in a PR description is ignored during review.
```

## 2. Mutation Testing Is the Quality Gate

Mutation testing injects small faults into production code and asks a simple question: does any test fail? A suite that lets mutants survive is asserting less than it appears to. Field data on agent suites makes the gap concrete: 102 all-green agent-written tests scored only ~43.89% mutation kill (Zenn/QDHE); the juejin project measured ~34%.

### 2.1 Tooling

Use the conventional mutation engine for your stack. The research record names three - StrykerJS, mutmut, cargo-mutants - only in its search-gap notes, which record that their READMEs carry zero AI/LLM mentions: they are plain engines, and the AI angle comes from how you aim them. For LLM-proposed mutants, GitHub Next's LLMorpheus (archived; continued at neu-se/llmorpheus) "does not rely on a fixed set of mutation operators, but instead relies on an LLM to suggest suitable code fragments," fed through a modified StrykerJS.

Research says LLM-proposed mutants are worth the trouble: against 851 real Java bugs, LLM-generated mutants showed "111.29% higher fault detection" than rule-based ones (arXiv 2406.09843) - though they cost more in non-compiling and duplicate mutants, so dedupe and expect discard.

### 2.2 The AI-Injection Variant (Lightweight, No New Tooling)

Senko Rasic's practice needs no mutation framework at all:

1. Open a fresh AI session with access to the code only - never the tests.
2. Ask it to inject a realistic bug (off-by-one, inverted condition, dropped error path) into a specific function.
3. Run the suite. A failing test means the mutant was caught; silence means it survived.
4. Tally. His run: 40 mutations, 30 caught, 10 real gaps exposed.

Copy-paste prompt for the mutating session:

```text
You can see the implementation code but NOT the test suite. Your job is sabotage
review: inject exactly one realistic bug into <function/file>. Prefer bugs a careful
human could plausibly write (off-by-one, wrong comparison operator, swallowed error,
swapped arguments, missing null guard). Make the smallest change that plausibly
ships. Do not tell me what you changed beyond the file path.
```

His verdict on the method: "Use mutation testing to find new problem areas and as a means to test the tests." Use separate sessions per mutation so the mutating agent never learns what the tests check.

### 2.3 Gating in CI

The mutation-gate mechanics that scale (blog.habsi.net): mutate only changed lines on PRs and fail on a threshold; run full mutation scans nightly; set per-module thresholds. Interpretation rule worth adopting verbatim: "A surviving mutant is not a failed build; it is a question." (The source post is not AI-specific - apply it to agent suites anyway.)

Close the loop with the generator: MUTGEN's core result is that feeding mutation-analysis results back into the test-generating LLM's prompt beats both EvoSuite and plain prompting across 204 subjects. A survived mutant is your highest-value prompt for the next test-writing session.

Rules block - mutation gate:

```text
- PRs that add or modify tests must run a mutation check scoped to the changed code.
- A new test that kills zero mutants is rejected in review - it asserts nothing.
- Surviving mutants open tasks, not auto-generated tests: a human decides whether the
  gap is real, the behavior is unspecified, or the code is dead.
- Nightly full mutation run; per-module thresholds; never a single global number.
```

## 3. Smell Checklist: Mirroring and Implementation Coupling

The best-documented failure of agent-written tests is that they restate the code instead of checking it. Habr names it "tautological testing": the AI reads the implementation and re-states it as assertions, and cites a real Copilot case where green tests hid fired requests in prod. A user on the Cursor forum thread "End to End Testing... A tricky area for current gen LLMs?": "They are obsessed with writing tests to match the code - whatever the code does." The research receipt: "36% of commits made by coding agents add mocks to tests, compared with 26% by non-agents" (MSR 2026) - agents favor easy mocked tests over tests of real interactions. And the test-oracle study "Understanding LLM-Driven Test Oracle Generation" (AIware 2025) says generators cannot fix this alone: they "only encode what the code currently does," so unless assertions derive from intent, the generator "can never manage separating correct from buggy behavior."

Checklist - flag any test that:

```text
- Mirrors the implementation: the assertion recomputes the expected value with the
  same formula/logic the code uses, so both sides are wrong together.
- Asserts on mocks: verifies a dependency was called, not that the outcome is right
  ("mocks everywhere, testing the implementation rather than the result" - fpsvogel, Lobsters).
- Breaks on every internal refactor that preserves behavior. "Tests that you have
  to change whenever you change the code are less useful" (andyc, Lobsters);
  coupled tests provide "DISVALUE rather than value" (Hacker News, "My AI skeptic
  friends are all nuts").
- Has never been seen failing (Mark Seemann: "Tests work best when you have seen
  them fail"). Generated-after-the-fact tests were never red, so their pass proves
  nothing yet.
- Contains weak or absent assertions: "runnable but frequently lack strong assertions
  and meaningful behavioral coverage" (VibeCheck, POVC '26).
- Is an empty or stub body, e.g. "// your test logic here" (JetBrains YouTrack
  GO-15896 caught AI Assistant emitting these).
- Assumes execution or collection order - the dominant flakiness source in generated
  tests for databases (ICSE 2026), which also documents "flakiness transfer": models
  copy flaky patterns from surrounding context into new tests.
```

A fast coupling probe on suspect areas: make a behavior-preserving internal change (rename a private helper, reorder internal steps) and run the suite. Tests that fail on it are documenting internals, not behavior - candidates for section 6. Seemann's ceremony framing is the audit's default posture toward never-red tests: ritual, not verification.

## 4. Judge the Mix: "Not Too Many, Mostly Integration"

Volume is the audit's enemy. The maxim to audit against is Kent C. Dodds' "Write tests. Not too many. Mostly integration." (known via a verified search snippet). Mark Larah's anti-slop prescriptions operationalize it: fewer high-ratio tests, test at the edges, avoid mocking, mostly integration - and make the agent itself read the maxim. For a concrete shape, the awesome-agv ruleset ships a 70/20/10 pyramid (mandatory TDD, AAA pattern).

Two failures the mix check catches:

- All-unit suites: the 1,310-green-tests incident verified components in isolation; nothing validated the assembled system. The author's fix was end-to-end checks of critical flows. Each test level detects different defects, "and that role doesn't change just because AI arrived" (Zenn/ababup1192).
- Corner-case matrices nobody hits: ClickHouse's agent rules ban them outright - "do not write tests asserting that the feature no longer exists ... Such tests only pin down the absence of something and become noise," and no matrix-style corner-case tests users will not hit.

Audit action: count tests by level per module. Where trivial unit tests dominate a critical flow, flag the module for the section 5 reallocation - the goal is ratio, not raw count.

## 5. Spend Testing Where the Risk Is

Audit findings should reallocate effort, not just delete. Risk-based patterns from the record:

- iTerm2's CLAUDE.md mandates a live harness against real vendor APIs after any AI-assisted change, because "unit tests passing alone is not sufficient evidence" - and prices it so the mandate survives review: "Full sweep: ~95 sec, ~70 API calls, under $0.50."
- Zenn/QDHE pairs FMEA-style risk ranking (what deserves tests at all, ranked by failure severity) with SHA256 hash-freezing the approved suite so agents cannot silently rewrite it.
- ClickHouse treats CI cost as a first-class design constraint: integration tests are "about 40% of its cost, and the suite barely fits in its timeout" - so expensive tests must justify their slot; cheap tests must justify their volume.
- Top solution comments on an r/webdev thread about shipping agent-written code (dead link per the research document) argue for end-to-end coverage of critical user flows on every deploy, with the suite as "the actual source of truth for 'does this still work'" when nobody fully understands the shipped code.

Rules block - risk allocation:

```text
- Rank modules FMEA-style (severity x likelihood) before writing or pruning tests;
  the top-ranked modules get mutation gates and integration coverage first.
- Critical user flows get end-to-end checks that run on every merge, not
  unit-of-unit confidence.
- Anything talking to external systems gets a live round-trip check; mocked-only
  coverage of a paid/external dependency is an audit finding, not coverage.
- Every expensive test must name the risk it guards; every cheap test must kill
  mutants (section 2) or it guards nothing.
```

## 6. Prune Safely: Delete Slop Without Losing Signal

Deleting agent test slop is safe when it is deliberate, human-triaged, and one-directional. The failure mode to avoid is the flagship r/ExperiencedDevs pattern (dead link, archived content): test code "feels so cheap," so teams stop maintaining and start regenerating - which replaces unaudited tests with new unaudited tests.

Triage model (TDD Buddy, for characterization captures - use it for audit findings too): "The agent generates the captures. The human does the promotion." Every flagged test gets exactly one verdict:

```text
PROMOTE - asserts real behavior from intent/spec; kills mutants; keep and name it
          as spec-grade.
FLAG    - unclear or duplicate; quarantine and schedule a mutation probe before
          the next release.
DELETE  - trips the section 3 smells AND kills no mutants in its area; remove.
```

What the record shows is deletable:

- Redundant duplicates: GitHub's own Copilot article demonstrates the pattern - it shows Copilot emitting a duplicate test and prunes it, with the standing rule "Never trust any tests Copilot generates without going through your normal review process."
- Never-red ceremony tests (Seemann) that fail the mutation probe.
- Tautological/mirroring tests (Habr) - proven by the coupling probe.
- Noise tests pinning absence (ClickHouse) and corner-case matrices users will not hit.
- Whole scrapped suites: mordae's field report - a vibe-coded suite that only "documented current behavior" was "totally unmaintainable and had to be scrapped," rebuilt around property-based and model-based tests that survive.

Safety rails while pruning:

```text
- The agent never deletes or rewrites tests to make a run green. Regenerating a
  failing suite is the anti-pattern (Meta's Hermes rule: "Do not blindly regenerate
  tests to make them pass."). Deletions come from the human triage list only.
- Approved tests are read-only to the agent ("Do NOT modify tests - they are your
  acceptance criteria" - LinkedInLearning ralph-loop CLAUDE.md); QDHE-style hash
  freezing works when you need mechanical enforcement.
- Before deleting in a module, capture its mutation baseline; after deleting,
  re-run it. Acceptable outcome: fewer tests, same or higher kill score, coverage
  down. Coverage going down is not an argument against the deletion.
- Never delete end-to-end checks of critical flows (section 4); if one is flaky,
  fix or replace it - do not drop the risk it guards.
```

## The Audit Runbook

```text
1. Inventory: count tests by authorship (agent vs human), level (unit/integration/
   e2e), and module. Flag modules where trivial unit tests dominate a critical flow.
2. Baseline: run mutation testing (engine or AI-injection variant) on the modules
   that matter most (section 5 ranking). Record kill scores.
3. Smell pass: run the section 3 checklist; mark every mirroring, mock-asserting,
   never-red, stub, or order-dependent test.
4. Verdicts: PROMOTE / FLAG / DELETE per test, by a human (section 6).
5. Prune: delete DELETE-verdict tests in one reviewable commit; re-run the mutation
   baseline; expect coverage to drop.
6. Reinvest: turn surviving-mutant gaps into test-writing prompts (MUTGEN feedback
   loop) and reallocate effort toward integration/e2e of critical flows.
7. Gate: keep the section 2 mutation gate on changed lines so the suite cannot
   quietly regress to slop.
```

## Grounded in

All claims, quotes, tool names, and links below are from `ai-generated-tests-research.md` (the single source of truth for this skill).

- Senko Rasic, "Improving AI-generated tests using mutation testing," blog.senko.net (2026-03) - the AI-injection protocol, 40/30/10 run, "test the tests": https://blog.senko.net/improving-ai-generated-tests-using-mutation-testing
- MUTGEN, "Mutation-Guided Unit Test Generation with a Large Language Model," IEEE TSE / arXiv (2025): https://arxiv.org/abs/2506.02954 - 100% coverage / 4% mutation score; mutation feedback beats plain prompting.
- "A Comprehensive Study on Large Language Models for Mutation Testing," arXiv (2024): https://arxiv.org/abs/2406.09843 - LLM mutants "111.29% higher fault detection" against real bugs.
- "Do Coverage and Mutation Scores of LLM-Generated Test Suites Correlate with Their Effectiveness?," ISSTA 2026: https://arxiv.org/abs/2607.22880 - metrics stop indicating effectiveness on possibly-buggy code.
- juejin, "AI-generated unit test quality governance" (2026-03): https://juejin.cn/post/7618522925608091698 - 90%+ coverage, 40-60% nonsense assertions, ~34% kill score; spec-assertions-then-mutation governance pipeline.
- "Mutation Testing: The Quality Gate Your CI Is Missing," blog.habsi.net (2026-09): https://blog.habsi.net/mutation-testing-the-quality-gate-your-ci-is-missing - changed-lines PR gate, nightly full runs, per-module thresholds.
- LLMorpheus, GitHub Next (archived; continued at neu-se/llmorpheus): https://github.com/githubnext/llmorpheus - LLM-proposed mutants through a modified StrykerJS. StrykerJS, mutmut, and cargo-mutants are named only in the research document's search-gap notes ("What this search could not find"), which record that their READMEs contain zero AI/LLM mentions.
- Mark Seemann, "AI-Generated Tests as Ceremony," blog.ploeh.dk (2026-01): https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/ - "Tests work best when you have seen them fail."
- Habr/OTUS, "When all tests are green but bugs ship" (2026-08): https://habr.com/ru/articles/1073708/ - tautological testing; a real Copilot case where green tests hid fired requests in prod.
- Cursor Community Forum, "End to End Testing... A tricky area for current gen LLMs?" (2025-08): https://forum.cursor.com/t/end-to-end-testing-a-tricky-area-for-current-gen-llms/130697 - "obsessed with writing tests to match the code - whatever the code does."
- "Are Coding Agents Generating Over-Mocked Tests?," MSR 2026: https://arxiv.org/abs/2602.00409 - agents add mocks in 36% of commits vs 26% for humans.
- Habr/Netology on LLM test generation (2026-08): https://habr.com/ru/articles/1070438/ - scale of suite is not proof it catches errors.
- Kent C. Dodds, "Write tests. Not too many. Mostly integration." (verified search snippet per the research document): https://kentcdodds.com/blog/write-tests
- Mark Larah, "Preventing LLM unit test spam," blog.larah.me (2026-07): https://blog.larah.me/test-slop/ - fewer high-ratio tests, test at the edges, avoid mocking.
- Zenn/shune, nine Claude Code agents, 1,310 green tests, broken app (2026-10): https://zenn.dev/shune/articles/54501fc4fd6398 - the all-unit-suite failure.
- Zenn/belka_dolphin (QDHE), test freezing + FMEA (2026-04): https://zenn.dev/belka_dolphin/articles/c885376e01b59d - SHA256 freeze, FMEA ranking, 43.89% kill score on 102 green tests.
- iTerm2 CLAUDE.md testing rules: https://github.com/gnachman/iTerm2/blob/master/CLAUDE.md - live harness, costed at under $0.50, "unit tests passing alone is not sufficient evidence."
- ClickHouse .claude/CLAUDE.md: https://github.com/ClickHouse/ClickHouse/blob/master/.claude/CLAUDE.md - anti-noise rules; integration tests ~40% of CI cost.
- TDD Buddy, "Characterization Tests Are How Agents Enter Legacy Code" (2026-06): https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/ - Promote / Flag / Delete triage; "The agent generates the captures. The human does the promotion."
- GitHub Blog, "How to generate unit tests with GitHub Copilot" (2024-12): https://github.blog/ai-and-ml/github-copilot/how-to-generate-unit-tests-with-github-copilot-tips-and-examples/ - review-generated-tests rule; the pruned duplicate test.
- Lobsters, "Static types and shovels" (mordae's scrapped suite): https://lobste.rs/s/eiknm1/static_types_shovels - "totally unmaintainable and had to be scrapped"; property/model-based survives.
- Lobsters, "Testing is better than Data Structures and Algorithms" (2025-09): https://lobste.rs/s/lvnvnn/testing_is_better_than_data_structures - fpsvogel: "mocks everywhere, testing the implementation rather than the result"; andyc: tests you must change whenever you change the code are "less useful."
- Hacker News, "My AI skeptic friends are all nuts" (2025-06): https://news.ycombinator.com/item?id=44163063 - a comment argues LLM unit tests that couple to implementation provide "DISVALUE rather than value."
- VibeCheck, POVC '26 / arXiv (2026-09): https://arxiv.org/abs/2609.05978 - runnable tests lacking strong assertions.
- TestGenEval, arXiv (2024): https://arxiv.org/abs/2410.00752 - 35.2% average statement coverage on real code.
- Thorsten Ball, "A Few Words on Testing," Register Spill (2024-03): https://registerspill.thorstenball.com/p/a-few-words-on-testing - "I never believed in testing coverage as a metric."
- JetBrains YouTrack GO-15896: https://youtrack.jetbrains.com/issue/GO-15896 - stub test bodies from AI Assistant.
- ICSE 2026 SEIP, "On the Flakiness of LLM-Generated Tests for DBMSs": https://arxiv.org/abs/2601.08998 - order assumptions; "flakiness transfer."
- "Understanding LLM-Driven Test Oracle Generation," AIware 2025 / arXiv: https://arxiv.org/abs/2601.05542 - generators "only encode what the code currently does"; oracles must derive from intent.
- r/ExperiencedDevs, "My teammates are generating enormous test suites now" (dead link per the research document; PullPush archive content) - regenerating easier than maintaining; PRs over half tests: https://www.reddit.com/r/ExperiencedDevs/comments/1po8uud/my_teammates_are_generating_enormous_test_suites/
