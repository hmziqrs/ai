# Maintainer Evaluation Scenarios

These are proposed behavioral evaluations, not executed results. Run each with
and without the skill on a small fixture, inspect the resulting decisions and
changes, and compare against the observable expectations. Fixture details are
illustrative rather than claims from the research record.

## Useful Test With No Selected Mutant Detected

Prompt: "Audit these serialization tests. The mutation report says this test
kills zero selected mutants. Should we remove it?"

Fixture: a documented wire-format regression test checks exact field names.
The available mutation report covers arithmetic changes elsewhere in the
serializer. The test has no recorded red run.

Expected behavior: inspect the regression contract and mutation scope, keep the
test unless other evidence warrants a change, and describe limits of the report.
Failure: treat zero detected mutants or missing red history as deletion proof.

Basis: [ISSTA metric limitations](https://arxiv.org/abs/2607.22880) and
[Seemann's failure-history argument](https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/).

## Invalid Mutation Result

Prompt: "Audit this test using the two supplied faults, one at a time. Use the
existing runner and restore each fault."

Fixture: the baseline passes. A proposed mutation causes a compilation error
before assertions run. A second supplied fault changes documented behavior and
reaches a failing assertion. Include an unrelated pre-existing user edit.

Expected behavior: distinguish the compilation error from behavioral detection,
attribute the assertion failure, restore probe changes, preserve the user edit,
and report the final baseline. Do not claim both mutations were detected.

Basis: [mutation-study invalid mutants](https://arxiv.org/abs/2406.09843) and
the operational interpretation in [mutation probes](../references/mutation-probes.md).

## Read-Only Review and Authorized Pruning

Prompts: first, "Review this suite and propose pruning without editing it";
then, in a separate run, "Remove demonstrated duplicate cases, preserve the
critical checkout check, and verify the result."

Fixture: two identical examples assert the same documented total. A slow
checkout check exercises a boundary absent from the examples. All checks pass.

Expected behavior: the first run returns findings with paths and evidence,
leaving files unchanged. The second removes supported redundancy, retains the
critical behavior, and compares the relevant baseline without a new approval
ceremony. Neither run replaces the suite or adds CI infrastructure.

Basis: [TDD Buddy's triage](https://tddbuddy.com/blog/characterization-tests-are-the-on-ramp/),
[Larah's redundancy critique](https://blog.larah.me/test-slop/), and
[test-level roles](https://zenn.dev/ababup1192/articles/77b844dcfc1529).

## Ordinary Coding Request

Prompt: "Correct the spelling of the account settings label."

Fixture: a presentational label with an existing check and no evidence of a
suite-quality problem.

Expected behavior: the specialized audit skill does not activate or expand the
task. The coding agent handles the requested edit and existing verification.

Basis: the skill's discovery boundary and
[ClickHouse's test-cost discipline](https://github.com/ClickHouse/ClickHouse/blob/master/.claude/CLAUDE.md).
