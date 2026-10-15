# zflow-port — port report

Port of the five `z-*flow` skills from single-run, state-file orchestration onto
multi-workflow chains over one saved engine workflow (`zflow-engine.dwf.ts`), per
`SPEC.md`. This report was assembled after the three-round audit protocol
(SPEC §6) ran to its round cap; it is the honest stop report that protocol calls
for: what changed, what stands clean, what does not.

Paths below are relative to `zflow-port/`. Two evidence layers are used and kept
distinct throughout:

- **Audit log** — the 94-finding / 18-audit-round result set given to this report
  (fresh auditor per artifact per round per SPEC §6).
- **Verified this session** — checks I ran while writing this report: full reads of
  `SPEC.md`, all five `skills/*/SKILL.md`, and the cited regions of
  `zflow-engine.dwf.ts`; `grep`/`diff`/`ls` over workspace and `~/.agents/skills`;
  a `node` count over the audit-log classifications; `ListSavedWorkflows`;
  `ListModels` (failed — see §4).

## 1. End state in one paragraph

Six artifacts were ported and audited: the engine plus five thin SKILL.md wrappers
(120–129 lines each; SPEC §4 targeted ≤ ~120 — three are exactly 120, z-liteflow is
126, z-gpui-workflow is 129). Zero blockers were ever found. The round cap (3)
was reached with majors standing in two artifacts: **z-gpui-workflow (2)** and
**z-liteflow (1)**. The engine, z-workflow, z-proflow, and z-flashflow closed round
3 clean. The SPEC §5 install phase has **not** been run (no backup dir, the
`~/.agents/skills/` copies are still the pre-port originals, and no workflow is
saved — all verified this session, §4). No Codex remnants exist in the ported
artifacts (`grep -rn -i 'codex\|zai_\|SendMessage\|worker/explorer' zflow-engine.dwf.ts skills/`
→ no matches, exit 1).

## 2. What changed in each of the five skills

All five keep their directory names and frontmatter and became thin
chain-coordinator wrappers: when-to-use → tier matrix → chain blueprint (nodes,
order, POLICY) → conventions → fallback lanes. All state-file machinery,
append/compaction contracts, and sequencer tables are gone. What follows is each
skill's port redesign plus the audit-driven changes I verified present in the
current files.

### z-liteflow (126 lines)

- **Port redesign**: coordinator + flash implement node ⇄ flash judge node looping
  *between* runs, optional flash vision node (`SKILL.md:35-50`). The audit loop is
  no longer claimed to live inside the implement run — the engine's implement mode
  contains no auditor, so the loop was moved to the only place the platform
  supports (SPEC §1 fact 2: chaining goes through the main agent between runs).
- **Audit-driven fixes verified in-file**: classification is in-run — judge
  proposes, per-finding confirmer reproduces, only verified findings become fix
  targets (`SKILL.md:84-86`); commits reconciled — the engine commits gates-green
  areas itself, and what it cannot commit (gateless, audit-only) is the
  coordinator's hand, only on request and a clean judge round (`SKILL.md:99-105`);
  baseline made explicit — "The engine has NO baseline concept" (`SKILL.md:66-70`),
  so a pre-existing red is the coordinator's explicit call: declare it or leave it
  out and report it.
- **Round-3 major, fix applied after the last audit**: the floor rule now carves
  the one-liner exception into the hard rule as a disclosed exception
  (`SKILL.md:14-18`). Because the round cap was reached, this fix was never
  re-audited.
- **Residual (deferred nit, verified present)**: "(escalation is images-only)"
  (`SKILL.md:88`) misstates the platform fact — the escalation bridge carries any
  blocking question (SPEC §1 fact 3); reserving it for images is chain policy, not
  a platform property.

### z-flashflow (120 lines)

- **Port redesign**: all-flash chain; coordinator-discipline table pins the main
  agent to compact control data (`SKILL.md:27-33`).
- **Audit-driven fixes verified in-file**: the survey-time gate baseline — a
  baseline-red gate is dropped from that area's launch gates and reported as a
  pre-existing red, so no run burns fix rounds on it (`SKILL.md:30`, `:91`);
  the vision node is run-level — ONCE after all areas are clean, never per-area,
  so backend-first orders don't screenshot UI that doesn't exist yet
  (`SKILL.md:66-69`); the unimplementable frozen-checklist convention was replaced
  with comparability via coordinator evidence passback (`SKILL.md:70-75`); the
  node-1 return contract is now honest — "commit notes (message + exit code, no
  shas) … changed paths reach the typed return only via green areas' commit notes"
  (`SKILL.md:61-63`).
- **Residuals (verified present)**: `SKILL.md:75-76` still promises the vision
  node "returns verdicts + paths", but the engine's vision typed return carries
  per-area path *counts* only (`zflow-engine.dwf.ts:1108-1110`); "Evidence dir
  gitignored from round 1" (`:105`) and "Match repo style (`git log --oneline
  -10`) first" (`:94-95`) still name no actor — the engine never writes
  `.gitignore` (`grep -n gitignore zflow-engine.dwf.ts` → no matches) and its
  Committer is forbidden from running git (`zflow-engine.dwf.ts:407-412`).

### z-proflow (120 lines)

- **Port redesign**: all-pro chain, no router, no pixel vision; ocu AX-text
  structural audits allowed as tier-blind text.
- **Audit-driven fixes verified in-file**: the init-step gates constraint now
  names the engine's 11-command literal allowlist (npm, pnpm, yarn, bun, cargo,
  make, go, python3, pytest, npx, git — read-only subcommands) and the
  zero-gates-never-green rule (`SKILL.md:53-58`); the implement node now says the
  SCRIPT runs each area's gates in code and "implementers run neither the gates
  nor git" (`SKILL.md:60-63`).
- **Residuals (verified present)**: the sibling list still omits z-gpui-workflow
  (`SKILL.md:23-25`); the fallback lane still says "inside runs, `ocu` via
  Bash/world.run" (`SKILL.md:113`) — `world.run` is a script-level API subagents
  do not hold, and ocu is not in the gate allowlist (`zflow-engine.dwf.ts:332-333`),
  so inside runs the subagent's own Bash is the only channel; "Round-1
  housekeeping: gitignore `.zflow/`" still names no actor (`SKILL.md:64`).

### z-workflow (120 lines)

- **Port redesign**: pro implement + pro judge runs with a flash run-level vision
  node chained between rounds; the heaviest audit churn of the five (8 majors
  logged against it over the port).
- **Audit-driven fixes verified in-file**: every launch carries `findings=` and
  the round is `max(findings round) + 1` for **every** mode, or judges stall at
  `-r1` and the cap never fires (`SKILL.md:51`, `:57-58`; the engine derives the
  round mode-independently at `zflow-engine.dwf.ts:730`); the merge strips
  baseline-red gate findings so they never become permanent verified fix targets
  (`SKILL.md:52-55`); a data-sourcing paragraph handles the engine's lean typed
  returns — evidence paths from the coordinator's own `.zflow/evidence/` listing,
  changed paths from git, per-area summaries from the report artifact
  (`SKILL.md:75-81`); vision confirmation semantics corrected — the judge is blind
  to vision findings' content but receives their evidence paths, and a
  nowhere-re-derived vision FAIL blocks a clean exit (`SKILL.md:102-105`); POLICY
  items 1 and 5 carry the non-baseline qualifier (`:89`, `:93`).
- **Residuals (verified present)**: the merge is still "the merged array of ALL
  typed returns so far" with only the baseline strip (`:51-52`) — fixed findings
  never retire, so POLICY 4's "findings strictly shrink" (`:92`) can never hold
  against a union; POLICY 2 still says bare "red gates not shrinking" without the
  non-baseline qualifier (`:90`); no instruction drops baseline-red gates from
  `areas[].gates`, so the engine's inner fix loop still spends fix asks on them
  (the engine declares no baseline arg — `zflow-engine.dwf.ts:4-34`); the
  coordinator is told to hold "commit shas" and source changed paths "per shas
  held" (`:16`, `:119`) but no channel delivers shas — the engine appends git
  output to the commit note only on failure (`zflow-engine.dwf.ts:913-914`).

### z-gpui-workflow (129 lines)

- **Port redesign**: pro implement + judge, flash vision node for pixel design
  audits via ocu capture, batched escalation, main-thread computer-use as
  interactive fallback only.
- **Audit-driven fixes verified in-file**: the implement node says the script runs
  the gates itself and "no pass/fail claim is trusted" (`SKILL.md:56-58`); the
  unfulfillable "AX checks inside the pro implement run" claim is gone — the tier
  matrix routes AX structural checks to the flash vision node's desktop lane
  (`:34`) and the pro judge audits AX `.txt` passed via `evidence` (`:75-76`);
  vision-confirmation honesty — "Vision findings have NO confirmation path here —
  the judge never sees their content" (`:77-80`); a lane caveat documents the
  engine's URL-regex lane choice (`:66-70`).
- **Round-3 majors, both verified still standing** (see §4): the lane caveat's
  guard — "check each area's `lane` in the typed return" (`:69`) — cannot be
  executed: the vision typed return carries no lane in any field
  (`zflow-engine.dwf.ts:1103-1112`); and the engine itself still tells the
  coordinator the opposite of the corrected skill (below).
- **Residuals (deferred nits, verified present)**: the AX tier-matrix row's
  placement still differs from SPEC §4's "ocu AX audits inside pro runs (text)"
  wording (`:34` vs `SPEC.md:126`); "gitignore `.zflow/` on round 1" still
  ascribed to the Committer (`:59-60`), which cannot edit files.

### zflow-engine (1,229 lines, audited as the sixth artifact)

Fixes verified present this session: the `findings` arg doc matches the code —
only `verified` findings become fix targets, unconfirmed ride as labelled context
(`zflow-engine.dwf.ts:27` vs `:780-783`); `changedFiles` is unioned across the
in-run loop so an area's commit carries all of its work (`:785-799`); the commit
phase is wrapped in try/catch with a runtime guard on the draft message, so one
malformed subagent reply costs one commit, never the run's report (`:892-926`);
the judge status card derives failed/passed from red gates — "never claim clean
while a gate is red" (`:1156-1161`).

## 3. Audit rounds spent and what stands clean

Scoreboard as recorded by the audit protocol (18 audit rows = 3 rounds × 6
artifacts; zero blockers in every row):

| Artifact | Round 1 | Round 2 | Round 3 | Final |
|---|---|---|---|---|
| z-proflow | clean | clean | clean | **clean** |
| z-flashflow | clean | 1 major | clean | **clean** |
| z-workflow | 2 majors | 3 majors | clean | **clean** |
| engine | clean | clean | clean | **clean** |
| z-liteflow | clean | clean | 1 major | **not clean** |
| z-gpui-workflow | clean | clean | 2 majors | **not clean** |

The round cap (SPEC §6: 3) was reached without the all-clean exit, so the port
stopped per protocol and reports what stands.

Aggregate over the whole findings log (counted this session with `node` over a
transcription of the log's severity/fixRequired/artifact fields; artifact = the
finding's `where` path): **94 findings — 0 blockers, 36 majors, 58 nits; 45
fix-required, 49 deferred.** Per artifact (total / majors): engine 47/14,
z-workflow 16/8, z-liteflow 9/5, z-flashflow 9/4, z-gpui-workflow 7/3,
z-proflow 6/2. Note that several engine-`where` majors were filed by skill
auditors as cross-references (they cite both files).

**Data caveat, stated plainly:** the 94-finding log cannot be mapped one-to-one
onto the 18 scoreboard rows from the supplied data — the log contains
fix-required findings (verified still present in the current artifacts, listed in
§4) beyond the round-3 residue the scoreboard implies, and rows marked clean in
earlier rounds precede majors logged against the same artifacts. I could not
reconstruct per-finding round attribution, so §4 is organized around what I
verified in the current files rather than around round numbers.

## 4. Anything unresolved

### 4.1 The round-3 majors (the scoreboard's standing residue)

1. **z-gpui-workflow — lane check unreachable.** `skills/z-gpui-workflow/SKILL.md:69`
   instructs the coordinator to check each area's `lane` "in the typed return",
   but the vision run's typed return contains no lane anywhere — its `verified`
   entries are count strings and its conclusion has no per-area lane
   (verified: `zflow-engine.dwf.ts:1103-1112`; lane exists only in the markdown
   artifact header at `:1085` and internal types). The sole guard against silently
   auditing a GPUI desktop area through the web lane cannot be executed as
   written. Fix is one-sided: emit lane in the vision return, or point the skill
   at the report artifact.
2. **z-gpui-workflow / engine — the engine contradicts the corrected skill on
   vision confirmation.** The skill now truthfully says vision findings have no
   confirmation path (`SKILL.md:77-80`), but the engine still promises the
   opposite in four strings — `zflow-engine.dwf.ts:241` ("the judge node confirms
   them"), `:1040` (comment), `:1098` (artifact description "all findings await
   judge confirmation"), `:1106` (typed-return conclusion) — while judge mode is
   blind to prior-findings content by the engine's own design (`:27` args doc;
   `:730` uses round numbers only) and only `verified` findings become fix
   targets (`:782-783`). A coordinator believing the typed return waits for a
   confirmation that never comes.
3. **z-liteflow — floor rule vs hard rule** (major at round 3). The fix is present
   in the current file — the one-liner exception is carved into the hard rule as a
   disclosed exception (`skills/z-liteflow/SKILL.md:14-18`) — but it was applied
   after the final audit and was **not re-audited** (round cap). Treat it as
   fixed, unverified.

### 4.2 Fix-required findings verified still present in the current artifacts

Beyond the three above, these logged fix-required findings are unfixed in the
files as they stand (each verified this session):

- **Engine `AreaWork.notes` is a dead typed field.** Declared with a JSDoc
  promising "Anything worth carrying into the report (blocked parts, surprises)"
  (`zflow-engine.dwf.ts:105-106`) and steered to by the implement ask (`:475`),
  but never read — the outcome at `:834-845` consumes summary/changedFiles/skipped
  only; the only `.notes` consumed anywhere is `capture.notes` (`:1036`).
- **Engine `skipped` keeps only the last in-run round's list** (`:842`), so items
  disclosed as left-undone in an earlier round vanish from the report when a
  later round goes green — against the preserve-list item "half-done work … is
  listed in the report" (SPEC §4).
- **Engine typed returns stay lean**: implement mode returns no per-area changed
  paths or summaries (markdown artifact only, `:948-993`), vision mode returns
  counts, not paths/verdicts/lane (`:1103-1112`). The skills now document
  workarounds (e.g. `skills/z-workflow/SKILL.md:75-81`), but
  `skills/z-flashflow/SKILL.md:75-76` still promises "returns verdicts + paths".
- **Engine `whenToUse` still says "implement on the build tier"** (`:3`) — a tier
  that does not exist (the tier arg is flash|pro, `:11`), and "judge on pro"
  contradicts the all-flash flows.
- **Engine `WorkflowReport.findings` is still the only field without JSDoc**
  (`:249`, verified bare between documented neighbors) against SPEC §3's "JSDoc
  on every field".
- **z-workflow's findings-merge semantics** (see §2 residuals): union-without-
  retirement vs POLICY 4, unqualified POLICY 2, no `areas[].gates` pruning for
  baseline reds, and the sha-less "shas held" sourcing.

### 4.3 Deferred items (logged fix-not-required; verified present where checked)

The one deferred **major**: the vision lane is chosen by URL regex over task +
area name + paths (`zflow-engine.dwf.ts:671-674`, used at `:1022-1023`) — a
desktop task that merely quotes a URL routes every UI area to the agent-browser
web lane, and no arg can pin the lane (AreaSpec has no lane field). Deferred to
the engine's drafter; until fixed, keep URLs out of task/area text for desktop
flows (z-gpui-workflow documents this caveat at `SKILL.md:66-70`).

Deferred nits verified present in the engine: commits filtered only by
`excludedPaths`, not `area.paths` (`:816`); the git-mutation guard inspects only
`gateArgs[0]`, so `git -C <dir> push` bypasses it (`:286-287`); prior evidence
matched by unanchored substring, so overlapping area names cross-contaminate
(`:1034`); every area's judge receives the whole unfiltered evidence array
(`:1132`); gateless areas land in the board's failed column and the "still red"
conclusion bucket (`:804`, `:940-944`); the status board is declared before the
round-cap refusal (`:742` vs `:761`). Plus the skill-side nits listed in §2.

### 4.4 Process gaps — verified this session, all "not run / not done"

- **The engine has never been compiled by the real workflow compiler.** No
  TypeScript toolchain exists on this machine (`which tsc` empty; no global
  typescript; `npx --no-install tsc` resolves to the joke package), and
  EvalWorkflowSnippet's facade declares no `agent()`/`report()`/`artifact()`, so
  orchestration cannot compile there. The audit log records one auditor's
  `tsc --strict` pass over a stubbed-facade copy (exit 0, with a negative
  control) — that is the auditor's run, not mine; I ran no compile check. First
  real compile surfaces at SaveWorkflow time. The audit log also flags the
  dependency-chaining `Map` memoization (`:765-775`) as unverified against the
  compiler's analyzability diagnostics.
- **SPEC §5 install phase not run.** `~/.agents/skills-backup-2026-09-21/` does
  not exist; all five `~/.agents/skills/<name>/SKILL.md` differ from the ported
  workspace files (`diff -q`) and are the pre-port originals (the installed
  z-liteflow still opens "Lightweight Codex orchestration loop…", 234–527 lines
  vs the ports' 120–129). The ports are deployed nowhere yet.
- **The engine is not saved as a workflow.** `ListSavedWorkflows` → 0 saved
  workflows in this project. SPEC §5 defers saving to the main agent via
  SaveWorkflow — still outstanding.
- **Model catalog unavailable in this session.** `ListModels` errored
  (`model_catalog_unavailable`), so the exact `subagent_model` IDs for flash/pro
  could not be resolved here; §5 uses the tier names the skills pin.

## 5. How to launch a chain

Prerequisites (both currently outstanding, §4.4): save the engine once via
SaveWorkflow from `zflow-port/zflow-engine.dwf.ts` (it becomes the saved workflow
`zflow-engine`), and deploy the five skills per SPEC §5 if you want the wrappers
installed.

**One launch per chain node:**

```
CreateWorkflow saved: {
  name: "zflow-engine",
  args: {
    mode: "implement" | "judge" | "vision",
    tier: "flash" | "pro",            // behavior switch ONLY — pin the model too (below)
    task: "<verbatim user task>",
    areas: [{
      name, paths: [...], excludedPaths: [...],
      skills: ["<absolute SKILL.md paths>"],
      gates: [{ tool, args: [...] }],  // non-mutating; tool ∈ the 11-command allowlist
      complexity: "straightforward" | "complex",
      hasUI: boolean, dependsOn: [...]
    }],
    evidence: [...],                   // optional: evidence paths for judge/vision
    findings: [...],                   // optional: prior-round findings (fix rounds)
    maxRounds: 3                       // optional, default 3
  },
  subagent_model: <the model matching the tier arg>
}
```

Args are the engine's declared contract (`zflow-engine.dwf.ts:4-34`, matching
SPEC §3). Three launch-time rules the port established:

1. **Pin `subagent_model` to the tier at every launch.** The script cannot pin
   models; `tier` is behavior-only. The skills pin GLM-5.3-Flash for flash nodes
   (z-liteflow everything, z-flashflow everything, vision nodes everywhere) and
   GLM-5.3 for pro nodes (z-proflow everything, z-workflow/z-gpui-workflow
   implement + judge). Resolve the exact IDs from `ListModels` at launch time —
   this session could not (§4.4).
2. **Gates must use the literal-command allowlist:** npm, pnpm, yarn, bun, cargo,
   make, go, python3, pytest, npx, git (read-only subcommands), and be
   non-mutating (no `--fix`/`--write`). Anything else is skipped and counts red
   (`zflow-engine.dwf.ts:309-334`), so an off-allowlist gate fails forever. Drop
   baseline-red gates from `areas[].gates` at launch — the engine has no baseline
   concept and will burn fix rounds on them otherwise.
3. **Pass `findings=` to every node of every round after the first.** The engine
   derives its round solely from the findings array
   (`zflow-engine.dwf.ts:730`); omit it and the node re-runs as round 1 — judges
   stall at `-r1`, vision evidence collides at `-r1-*`, and the round cap never
   fires.

Chain shape per flow (each arrow = finish the run, relaunch — no nesting):

- **z-liteflow**: implement(flash) → judge(flash) ⇄ until POLICY clean; optional
  vision(flash) on request.
- **z-flashflow**: implement(flash) → vision(flash, once, run-level, only if any
  `hasUI`) → judge(flash) ⇄ fix rounds relaunch implement with `findings=`.
- **z-proflow**: implement(pro) → judge(pro) ⇄; no vision node — pixel needs go
  through the batched escalation bridge or a z-workflow hand-off.
- **z-workflow / z-gpui-workflow**: implement(pro) → vision(flash, run-level) →
  judge(pro) ⇄, merging typed returns into `findings=` (minus baseline-red gate
  findings) and passing accumulated `.zflow/evidence/` paths as `evidence=`.
- Completion notifications carry each run's typed `WorkflowReport`; the
  coordinator holds only compact control data between runs and writes the final
  report from the last judge return plus the run's markdown report artifact.
