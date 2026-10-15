---
name: code-comments
description: Apply minimal-comment discipline when writing, editing, or reviewing code, while preserving required documentation and functional directives.
---

# Code comments

Default to zero discretionary comments. Express intent through names,
types, and structure. Keep comments that carry a necessary contract,
safety justification, or constraint the code cannot express.

## When to Use

Apply while writing, editing, refactoring, generating, or reviewing code
in any language, including code samples. Follow explicit user and
repository documentation requirements first. This skill does not expand
the task into unrelated files or take over later work in the session.
Markdown headings, strings, and example data are not code comments.

## Decide before adding prose

Use these three categories:

1. **Public contract documentation:** caller obligations, behavior,
   errors, panics, units, or other externally relevant guarantees.
2. **Required safety documentation:** convention-required safety blocks
   explaining why the operation satisfies its obligations.
3. **Last-resort constraint notes:** explain a necessary workaround or
   external limitation, with a verified issue, specification, or source
   link that supports the explanation. Never invent a source.

Prefer a small naming or structural improvement already within scope.
An assertion, type, check, or focused test may enforce a constraint, but
it does not necessarily explain its external rationale. Do not add tests
or undertake broad refactors solely to avoid a comment. If new prose
fits none of these categories, omit it unless explicitly required.

Prefer one or two lines for discretionary notes, with three as the
maximum. Keep contract and safety documentation complete even when it
needs more space. Required formats and accurate explanations take
precedence over brevity.

## Preserve functional directives

Separate prose from comment-shaped instructions and required headers:
shebangs, build tags, encoding declarations, type or lint directives,
generator markers, and license notices. Preserve their syntax and
placement unless changing them is authorized and their effect is
understood. Do not treat them as removable narration or commented-out
code. Treat tool-consumed docstrings with the same care.

## Edit within the task

Remove obvious narration, section banners, change history, and dead
commented-out code from the code already being edited. For example,
“Parse the header” above `parse_header` adds nothing; “Now handles the
edge case” belongs in the change description. Avoid private-item prose
unless required or it qualifies as a safety or constraint note.

Keep existing meaningful rationale when its relevance is uncertain.
Inspect nearby code and available evidence before changing it. Report
unresolved uncertainty rather than delete it or fabricate a replacement
link. Correct stale explanations affected by the task, preserving useful
information. Do not run a repository-wide comment cleanup unless asked.

When asked to review, return actionable findings and their locations.
Edit only when the request authorizes changes.

## Verify the result

Check that removed prose carried no unique rationale or tooling effect,
retained explanations match the code, and required contracts and safety
obligations remain documented. Use verification suited to the change and
repository requirements, especially after changing a functional
directive. This skill adds no mandatory hooks or tests.

## Grounded in

The three categories and length preference implement the owner's
minimal-comment policy. They are not universal language requirements.
These primary sources support specific distinctions:

- [PEP 8: Comments](https://peps.python.org/pep-0008/#comments) advises
  keeping comments current and avoiding obvious inline narration.
- [Rust standard library safety comments policy](https://std-dev-guide.rust-lang.org/policy/safety-comments.html)
  requires safety explanations identifying the invariants in that codebase.
- [TypeScript 3.9: `ts-expect-error` comments](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html#ts-expect-error-comments)
  documents a comment directive that changes type-checking behavior.
