---
name: code-comments
description: Hard comment discipline for every line of code an agent writes or edits. Use whenever writing, editing, refactoring, reviewing, or generating code in ANY language — even when the request never mentions comments. Default is zero comments; only public-API contract docs, convention-required SAFETY blocks, and link-carrying last-resort constraint notes survive — never longer than 2 lines, 3 absolute max. Cuts output tokens and keeps the codebase clean.
---

# Code comments — zero by default

Comments cost twice: output tokens to write them, and context tokens for
every reader — agent and human — forever after. The code is the
documentation: names, types, structure, and tests carry the meaning.
When a comment seems needed, the fix is a better name, a smaller
function, a type, or a test — not a comment.

## Persistence

Once loaded, ACTIVE FOR THE REST OF THE SESSION on every file write —
edits, refactors, new files, all languages and comment syntaxes
(`//`, `#`, `--`, `%`, `/* */`, docstrings). No drift back to
narrating, no comment creep-back over long sessions. Unsure whether
this still applies? It does. Off ONLY when the user explicitly says so.

## The only allowed comments — exactly three

1. **Public-API doc comment** (`///`, `/** */`, docstring) stating the
   contract of a public item — behavior, panics, units — never its
   implementation.
2. **`// SAFETY:` block** where the language convention requires one.
3. **Last-resort constraint note** proving the code cannot express it —
   e.g. an upstream-bug workaround — carrying the issue/RFC link.

Everything else: zero — including private items of any kind and
TODO/FIXME (tracked debt lives in the tracker, not the file). Dense
math, regex, and bit tricks are not a category: that meaning goes into
names and tests.

## Encoding before comment

Before writing a category-3 note, attempt the cheapest encoding —
type, assertion, runtime check, test, or lint. Write the comment only
when no encoding can express the constraint. A constraint a test can
prove gets a test.

## Length cap — stated once

An earned comment is at most 2 lines; 3 lines only in super-rare
cases; 3 is the hard absolute max for ANY comment — public-API docs
and SAFETY blocks included.

## Proof standard — doubt kills

A comment survives only with proof the code cannot carry the meaning:
name its earning category and show the proof — upstream link,
convention, or contract element. Claiming value is not proof. Unsure
whether a category applies? The comment is not written — and an
existing one dies. An unearned comment is deleted outright, never
rewritten shorter or padded longer.

## Banned outright

- Restating the next line (`// increment i`, `// loop over users`)
- Section banners (`// --- helpers ---`)
- Change narration (`// now we handle the edge case`, `// added for #123`,
  `// fix: changed < to <=`) — that belongs in the commit or PR, never
  in the file
- Commented-out code
- AI-voice commentary of any kind
- Docs on private items

## When editing existing code

Add no comments to code you touch. If code you are already editing
contains banned comments, delete them in the same edit. Do not mount
separate cleanup passes.

## Examples

Keep — written only after the cheapest encoding (a test) was tried and
cannot express it; 2 lines, link included:

```rust
// Upstream bug: v1.2 sends length as u16 even for >64KiB frames
// (github.com/acme/proto/issues/481). Keep the manual split.
let len = split_len_manually(buf)?;
```

Kill:

```rust
// Parse the header
let header = parse_header(buf)?;

// Check if the user is valid
if !user.is_valid() { return Err(InvalidUser); }
```

The kill examples say nothing `parse_header(buf)` and `is_valid()`
don't already say.
