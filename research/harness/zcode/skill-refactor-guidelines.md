# Skill refactor guidelines

Apply to any skill. One test for every line: does it instruct action on the next real task, or
does it narrate, justify, or celebrate? The second category is bloat — cut it.

## Trim

1. **No history.** Ban: "Since v…", version numbers, "pre-", "the old", "now", "as always",
   "obsolete", "legacy", "why we switched" sections. State current behavior only.
2. **No sibling-skill references.** No other skill's name, no "sibling", "ports", cross-routing.
   The skill stands alone.
3. **No body "When to use" section.** Selection happens at the frontmatter description before
   the body loads; body routing addresses a decision already made. Trigger vocabulary lives in
   the description only. Salvage execution constraints (e.g. no-nesting) into the intro; delete
   the rest.
4. **No rationale tails.** Table "Why" columns, "which is the correct behavior", parentheticals
   explaining why a rule exists. The rule stays; the why goes. Keep a reason only when it
   prevents a recurring concrete error.
5. **No duplicated facts.** Every fact stated once, in its operational home — numbers,
   cadences, ownership, labelling rules.
6. **No machinery internals the reader cannot act on**, and no frequency commentary ("rarely",
   "usually", "Rare now:").

## Add (multi-model workflows, ZCode v3.15.1+)

1. **Per-subagent model pinning in one run**: `agent(name, { model: "providerId/modelId" })` —
   full ids only; bare ids are ambiguous across accounts and fail at launch. One launch
   replaces multi-launch main-thread orchestration.
2. **Tiering**: flash for objectively checkable output (vision capture/audit, mechanical
   checks), pro for judgment; deterministic checks get no model at all — `world.run` in script.
3. **Vision work pinned flash** (native pixel reading).
4. **Loop-until-clean inside the single run**, exit rules enforced in script: clean stop = zero
   findings of any status + all run gates green; two non-shrinking rounds → honest stop; round
   cap → honest stop; shrink-only continuation; baseline reds never fought; over-budget = HIGH
   finding, split the area. Models never judge exit conditions.
5. **Unique subagent names per run**: per-round suffixes (`judge-<area>-r<N>`); a duplicate name
   fails the run. Loop-spawned agents must not reuse names across iterations.
6. **Pin only providers that serve foreground turns**; a refused pin fails the run loudly at
   that subagent — fix the pin and amend.

## Method (fast, parallel)

1. Fan out 3 read-only auditors in parallel:
   (a) pro judgment — per-section KEEP/TIGHTEN/CUT verdicts against the test above;
   (b) flash mechanical — duplicate-fact map, banned-vocabulary grep with line numbers,
       longest-sentence list;
   (c) pro reader-value — census of load-bearing instructions (would change behavior if
       removed) vs a cut list of everything else.
2. Synthesize: apply unanimous cuts; override auditor overreach (the frontmatter description is
   the discovery surface — it stays; trigger vocabulary lives there and only there).
3. Rewrite once, do not patch. Every remaining line instructs.
4. Deterministic lint after rewriting: grep the banned vocabulary; `wc -l -c` before/after.
   Only acceptable hits are domain terms that merely resemble banned words.

## Verify (for load-bearing skills)

1. Mixed-model workflow: pro deep reviewer + flash mechanical checker in parallel; independent
   pro confirmer per finding (must reproduce from evidence alone); deterministic grep gates run
   by the script, never by a model.
2. Fixer applies verified findings only — minimal edits, existing voice and density preserved;
   unconfirmed findings labelled, never dropped.
3. Loop review → fix → re-review until a round yields zero verified findings or the cap;
   report honestly at the cap, never claim clean.
4. Re-typecheck any machinery the skill drives after every edit that touches it.

## Coherence

A skill that describes machinery must match the machinery: update the engine/saved workflow
first or together, and typecheck it (SaveWorkflow) after every edit. A skill describing
behavior the machinery does not have is a lie, no matter how clean its prose.
