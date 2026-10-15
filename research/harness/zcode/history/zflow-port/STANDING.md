# STANDING — consolidated open findings after round 3 (deduped; source: run dwfrun-b67c8345 findings)

Fix the MAJORS. Fix a NIT only when it touches a line region you are already editing.
Do NOT regress the already-fixed items listed at the bottom. Every fix must keep the
artifact consistent with SPEC.md (zflow-port/SPEC.md) — update cross-references in the
skills to match engine changes you make here.

## ENGINE — zflow-port/zflow-engine.dwf.ts

- E1 (major) Commit phase is the only agent block with no try/catch; `draft.message.trim()`
  throws on a malformed CommitDraft and kills the whole run AFTER implementation finished,
  losing the report artifact and the return. Wrap per-area commit in try/catch, default a
  missing/empty message, continue to remaining areas, record the failure in the outcome.
- E2 (major) Typed returns omit data the chain depends on:
  implement mode must return per-area changed paths + per-area summary (+ the short commit
  sha on success — it is in the git commit stdout); vision mode must return per-area
  verdict + EXACT evidence paths (not counts). Clean/zero-finding areas included.
- E3 (major) `AreaWork.notes` is declared with a JSDoc promise ("carrying into the report")
  and the ask even steers implementers to use it, but nothing reads it. Surface it in
  AreaOutcome + report/notCovered (or delete the field AND the ask steer — pick one, keep
  JSDoc truthful).
- E4 (major) `skipped` still reads only the LAST in-run round's value (changedFiles got the
  union fix; skipped did not). Union skipped across the in-run loop.
- E5 (major) Vision-confirmation false promises: four strings (args JSDoc, conclusion,
  artifact description, code comment) claim "the judge node confirms them" — structurally
  false (judge is blind to findings content by design). Reword to the truth: vision
  findings carry into the next implement round as advisory context and are verified by
  re-shoot; disclose in notCovered that pixel findings have no independent confirmer.
- E6 (major) Vision lane routing by URL regex over task text misroutes desktop areas (a
  task that merely mentions a URL sends GPUI areas to agent-browser). Add optional
  `lane: "web" | "desktop"` to AreaSpec; use it when present, fall back to the heuristic;
  EMIT the chosen lane per area in the vision typed return (E2) so the coordinator can
  check it.
- E7 (major) Judge-mode status card hardcodes "passed" for non-errored areas even with red
  gates. Derive passed/failed from gate results like implement mode does.
- E8 (major) Doc/code mismatch on fix targets: args doc says "confirmed ones" but code
  attaches ALL prior findings. Filter fix targets to status==="verified"; keep unconfirmed
  prior findings visible as advisory context in the ask, clearly labelled not-fix-targets.
- E9 (nit bundle, fix while in the regions above):
  a) WorkflowReport.findings gets JSDoc.
  b) priorForArea substring match → anchor to `${EVIDENCE_DIR}/${area.name}-r` prefix.
  c) judge mode: filter evidence per area (same anchored prefix), not the whole array.
  d) webUrl regex paren bug (excludes ')' but not '(').
  e) gateless areas: never "failed"/"still red" wording — "unverified (no gates declared)";
     keep them out of the passed column too.
  f) gateIsMutating: switch to a read-only git allowlist (status, log, diff, show,
     rev-parse, ls-files, check-ignore, describe, shortlog, blame) applied to the first
     non-flag token.
  g) stringArray silently drops non-strings → record a parse problem instead.
  h) whenToUse metadata: "implement on the build tier" → tier-neutral wording; don't
     hardcode judge=pro (skills decide tiers).
  i) capture asks receive prior-round evidence paths for this area (anchored) so re-shoots
     are comparable; checklist reuse = prior shots + auditor's prior findings.
  j) committer ask includes the last ~10 `git log --oneline` lines (script fetches via
     world.run git log) for repo-style matching.

## SKILLS — each file in zflow-port/skills/<name>/SKILL.md

### z-liteflow
- L1 (major) Hard rule "never writes product code" vs floor "do it directly": carve the
  exception into the hard rule explicitly (one-liners may be done directly, disclosed).
- L2 (major) Classification of auditor findings assigned to the coordinator, but the loop
  lives inside one run and the coordinator has no mid-run channel. State that
  classification happens in-run (the judge node's confirmer/triage) and the coordinator
  only acts on typed returns BETWEEN runs.
- L3 (major) Three-way commit contradiction: engine commits green areas automatically. Two
  options — engine arg `commit: boolean` (default true) added in this round, and the skill
  says the coordinator passes commit=false unless the user asked AND the loop ended clean.
  Update the tier matrix + conventions to the engine's actual behavior.
- L4 (major) Baseline semantics unsupported: coordinator must run a baseline gate pass
  BEFORE the first launch, record pre-existing reds, and OMIT those gates from
  areas[].gates at every launch (they stay in the baseline record for POLICY + report).
  Rewrite the baseline section to that procedure. Audit-only (no gates) stays as-is.
- L5 (nit) Frontmatter description: audit/fix loop is judge-node-between-runs, not inside
  the implement node; "escalation is images-only" → "reserved here for image needs".

### z-flashflow
- F1 (major) Node-1 return promises (shas, interface notes) must match the engine AFTER
  this round's E2/E3 fixes: per-area changed paths, summaries, shas, notes now ride the
  typed return. Update the control-data list accordingly.
- F2 (major) Checklist reuse: engine now passes prior evidence to capture/audit asks
  (E9.i). Reword the vision node text to the real mechanism (prior shots + prior findings
  passed back in), drop the "identical checklist" phrasing that has no artifact.
- F3 (nit) "Relaunch … reusing the same named implementers (context kept)" — a fresh
  CreateWorkflow starts empty contexts; context survives only within a run or via
  AmendWorkflow. Reword.

### z-proflow
- P1 (major) Init-step gate constraint must state the engine allowlist (npm, pnpm, yarn,
  bun, cargo, make, go, python3, pytest, npx, git read-only) and that off-allowlist gates
  are skipped-and-red forever.
- P2 (nit) Drop "/world.run" from the ocu sentence (subagent Bash is the only channel);
  add z-gpui-workflow to the sibling list.

### z-workflow
- W1 (major) findings= merge discipline, precise rule: pass (a) the LATEST judge return's
  findings plus (b) vision findings never yet judged — NEVER a union of all returns;
  exclude baseline-red gate findings (they live in the baseline record); this retires
  fixed findings, keeps shrink tests coherent, and stops same-round round-counter
  inflation. Update POLICY 2 with the non-baseline qualifier.
- W2 (major) Baseline: same procedure as L4 (pre-launch baseline pass; strip baseline-red
  gates from areas[].gates; never merge them into findings=).
- W3 (nit) Round-1 judge may receive same-round vision evidence paths (channel exists);
  "context kept" wording same as F3; commit shas now ride the typed return (E2) — update
  the data-sourcing paragraph.

### z-gpui-workflow
- G1 (major) AX structural checks do NOT run inside the pro implement run (engine has no
  such step; no arg can carry it). Move them to their real home: ocu AX text is captured
  by the flash vision node (desktop lane) and the pro judge audits the .txt evidence via
  `evidence=`. Fix tier matrix + blueprint to say exactly that.
- G2 (major) "check each area's lane in the typed return" — engine now emits lane (E6);
  keep the sentence and make sure it names the field/shape.
- G3 (nit) Vision-confirmation wording must match E5 (no judge confirmation; re-shoot
  verifies). gitignore bullet: name the coordinator as the actor or drop it.

## Installer
Redeploy all five updated SKILL.md files (backup already exists at
/Users/hmziq/.agents/skills-backup-2026-09-21 — do NOT re-backup over it; verify sources
differ from backup before copying, then diff -q after).

## Already fixed in rounds 1-3 — do NOT regress
- changedFiles union across in-run rounds; merge-scope excluding same-round siblings
  (skill side); coordinator-side baseline recording (detection + reporting); z-workflow
  interface-notes wording; vision ordering (run-level not per-area); implementer "self-runs
  gates" contradictions in z-proflow/z-gpui; gate allowlist omission in z-proflow init
  (partially — P1 completes it); frontmatter triggers; Committer persona discipline.
