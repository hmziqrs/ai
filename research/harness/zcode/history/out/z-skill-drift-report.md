# z-skill drift report — z-*flow sheets vs zflow-engine

**Audit date:** 2026-10-15
**Engine:** `/Users/hmziq/.zcode/workflows/zflow-engine.dwf.ts` (1046 lines)
**Sheets (fixed order):** z-workflow, z-proflow, z-liteflow, z-flashflow, z-super-rustflow, z-tauri-workflow, z-gpui-workflow — each `SKILL.md` under `/Users/hmziq/.zcode/skills/`
**Auditor-measured sheet lengths:** z-super-rustflow 194, z-proflow 103, z-tauri-workflow 99, z-gpui-workflow 96, z-liteflow 95, z-flashflow 92 lines; z-workflow carried no pinned range and was audited by greps plus an anchored read (see caveats).

Rows come only from the six audited questions (q1–q6; every outcome = audited). Status "verified" is the auditor's verdict. Quotes are verbatim contiguous text at the cited lines, line wraps collapsed to a single space, each at most 25 words. Rows labeled "intent" are known-intent findings and are never counted as drift; every other row is counted drift.

## Headline

All six questions completed with outcome audited — none failed, none clean. 23 verified drift rows across the seven sheets: z-workflow 5, z-liteflow 5, z-gpui-workflow 4, z-tauri-workflow 3, z-proflow 2, z-flashflow 2, z-super-rustflow 2. Worst offenders: z-workflow and z-liteflow with 5 each. Severity across the 23: 1 high (z-super-rustflow's `maxRounds` default 6 vs the engine's unbounded default), 14 medium, 8 low. Four further rows are intent-labeled and excluded from counts (z-super-rustflow's inline composition, sibling routing, tier policy, and size-red stop machinery), plus one split-label merge counted once as drift (see z-super-rustflow section). One engine-side inconsistency holds: the engine's own line-280 lane warning omits "mobile" from the contention values the engine itself supports.

---

## 1. z-workflow — `/Users/hmziq/.zcode/skills/z-workflow/SKILL.md`

Verified drift: 5. The drift concentrates on the chain-blueprint line and the port/topology omissions; the sheet's contention table (101–106) and launch hygiene are otherwise accurate against the engine.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 104 (q4) | "deterministic port (4100 + index among this run's web areas, sorted) + isolated `agent-browser --session zflow-<area>`" | 7–8 | "dev-server URL named in the task overrides the port); desktop and mobile areas" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 124 (q5) | "Flash where output is objectively checkable — vision capture and audit, gates, git state" | 337–340 | "Judgment roles run pro in the balanced profile and flash in the all-flash profile; capture and audit are always flash." | sheet-disagrees-with-engine | verified | drift (low) |
| 134–136 (q2) | "z-workflow launches `mode=chain` and passes NO `subagent_model` and NO `max_concurrency` (only when the user asks for a width limit)" | 26–93 | "mode: type: string description: Chain mode — the full per-area parallel loop. required: false default: chain" | sheet-claims-machinery-engine-lacks | verified | drift (medium) |
| 168–170 (q4) | "vision — flash, only for web/desktop areas: dev server on the area's port (web) or app from the worktree (desktop)" | 817–818 | "if (it.area.contention !== \"terminal\") vision.send(it); else judgeCh.send(it);" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 177–195 (q6) | "Never claim clean while a non-baseline gate is red; baseline reds get zero fix rounds and are reported from the baseline record." | 313–319 | "const agentsMdPath = typeof args.agentsMd === \"string\" ? args.agentsMd : \"AGENTS.md\";" | sheet-claims-machinery-engine-lacks | verified | drift (medium) |

Auditor notes (sourced):
- Row 134–136: the sentence head ("passes NO max_concurrency") is accurate, but the parenthetical points at a control the engine arg block (26–93, read in full) does not define; the sheet mirrors the engine's own whenToUse prose at 23–25.
- Row 168–170: the engine sends every non-terminal area — web, desktop, AND mobile — to vision (817), gives mobile its own simctl/adb capture ask (583–594), and serializes desktop and mobile alike through the single-worker device lane (627–628).
- Row 177–195: `grep -n -i baseline` over all 1046 engine lines returns zero matches (exit 1); the args block at 313–319 defines no baseline arg. Baseline reds are handled coordinator-side per the sheet's own prep lines 153–155 (record and OMIT from areas[].gates), so the engine never sees them.
- Row 124 is wording-level: the sheet's own table row 132 ("no model — world.run in script") corrects it.
- Verified carrying both controls: z-workflow:20–22 names AmendWorkflow and ResumeWorkflowRun plus never-nest (q3 audit, cited range matched verbatim).

## 2. z-proflow — `/Users/hmziq/.zcode/skills/z-proflow/SKILL.md`

Verified drift: 2. One omission (the never-relaunch pair is absent file-wide) plus the shared "budgets" shorthand.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 40–64 (q3) | "launch (once): CreateWorkflow saved zflow-engine — mode=\"chain\", task, areas, agentsMd, baseSha, repoRoot, budgets, commit. No subagent_model." | 20–25 | "one launch per chain, never relaunching to fix (AmendWorkflow revises, ResumeWorkflowRun continues)" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 54–59 (q2) | "CreateWorkflow saved zflow-engine — mode=\"chain\", task, areas, agentsMd, baseSha, repoRoot, budgets, commit. No subagent_model." | 54–63 | "maxFiles: type: number description: \"Run-level default size budget: max changed files.\" required: false default: 10" | sheet-claims-machinery-engine-lacks | verified | drift (low) |

Auditor notes (sourced):
- Row 40–64: a file-wide case-insensitive grep finds no AmendWorkflow and no ResumeWorkflowRun anywhere in z-proflow (q3 audit).
- Row 54–59 is wording-level: the engine's maxFiles/maxLines descriptions literally read "Run-level default size budget", so "budgets" maps to real machinery; a literal arg named budgets would not reach maxLines/maxFiles.
- The q4-suggested drift for z-proflow:56–59 does not hold: the engine's gating at :817 is literally `it.area.contention !== "terminal"`, so the sheet's "vision for non-terminal areas" (57) and "or none, when all areas are terminal" (37) agree with the wiring (q4 audit).
- Clean elsewhere: POLICY block matched the engine on all six q6 dimensions; model-role list at 26–27 matches the engine's JUDGE_MODEL/FLASH_MODEL sites (q5, q6 audits).

## 3. z-liteflow — `/Users/hmziq/.zcode/skills/z-liteflow/SKILL.md`

Verified drift: 5. The widest spread: required launch args never named, the never-relaunch pair absent, a deliberate commit=false pin, and the mobile capture path and vision stage both omitted.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 14–19 (q3) | "**Hard rule — the main agent is the chain coordinator: it scopes, makes ONE launch, relays the report." | 20–25 | "one launch per chain, never relaunching to fix (AmendWorkflow revises, ResumeWorkflowRun continues)" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 33–41 (q2) | "[coordinator: scope + baseline gate run] → ONE CreateWorkflow: zflow-engine mode=chain modelProfile=flash commit=false" | 89–93 | "The verbatim task embedded in every subagent ask; a dev-server URL named here overrides the deterministic capture port for web areas. required: true" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 34–37 (q4) | "The run does everything per area: plan → implement → gates (world.run, anchored allowlist) → fresh blind judge + confirmer per finding → fix rounds" | 817–818 | "if (it.area.contention !== \"terminal\") vision.send(it); else judgeCh.send(it);" | sheet-omits-machinery-engine-has | verified | drift (low) |
| 59–61 (q2) | "`commit: false` — loop cleanliness is never known in advance, so the warranted commits are the coordinator's hand at hand-off: explicit paths, log style, never push" | 48–53 | "False skips every commit and every worktree merge; all work stays on disk and worktree dependents are blocked honestly. required: false default: true" | sheet-disagrees-with-engine | verified | drift (medium) |
| 89–91 (q4) | "in-run capture uses agent-browser (web) or ocu (desktop, device lane)" | 594 | "it.area.contention === \"web\" ? webAsk : it.area.contention === \"mobile\" ? mobileAsk : desktopAsk;" | sheet-omits-machinery-engine-has | verified | drift (medium) |

Auditor notes (sourced):
- Row 33–41: the engine's task arg is required:true and areas likewise required (engine 39–40); the sheet's Scope section supplies their content without ever naming either required arg (q2 audit).
- Row 59–61 is a deliberate, engine-supported pin of commit=false inverting the engine's default true (engine 50–51 describes exactly this behavior) — flagged per the brief's example, not a misstated default (q2 audit).
- Row 89–91: the claim's supporting detail was partly wrong — the claimed mobile enumeration at z-liteflow:43 does not exist (`grep -nEi 'mobile|terminal|contention'` on this sheet returned zero hits; that enumeration is in z-flashflow 47–48). The core drift — capture enumerated as only agent-browser/ocu while the engine runs a third mobileAsk path — stands on its two verified quotes (q4 audit).
- Row 34–37 is wording-level: the frontmatter (5–6) echoes the same loop without vision; the engine's loop comment at :96 reads plan → implement → vision → judge.
- z-liteflow:57's agentsMd default and :93–94's sibling-routing pointer are consistent with the engine / labeled intent (q2, q3 audits).

## 4. z-flashflow — `/Users/hmziq/.zcode/skills/z-flashflow/SKILL.md`

Verified drift: 2. The shared "budgets" shorthand plus the same mobile-capture omission as z-liteflow; the sheet's own prep line (47–48) contemplates mobile, making the exhaustive-sounding capture enumeration misleading.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 57–60 (q2) | "CreateWorkflow saved zflow-engine — mode=\"chain\", modelProfile=\"flash\", task, areas, agentsMd, baseSha, repoRoot, budgets, commit. No subagent_model." | 54–63 | "maxFiles: type: number description: \"Run-level default size budget: max changed files.\" required: false default: 10" | sheet-claims-machinery-engine-lacks | verified | drift (low) |
| 89–91 (q4) | "in-run capture uses agent-browser (web, one session per area) and ocu (desktop, single-worker device lane)" | 594 | "it.area.contention === \"web\" ? webAsk : it.area.contention === \"mobile\" ? mobileAsk : desktopAsk;" | sheet-omits-machinery-engine-has | verified | drift (medium) |

Auditor notes (sourced):
- The never-relaunch rule is intact here: both controls sit at z-flashflow 21–24 ("never relaunch to fix (AmendWorkflow revises a wrong run reusing its finished work; ResumeWorkflowRun continues a stopped one)") — the ask's citation 24–26 was stale, the sheet text is not drift (q3 audit; see caveats).
- Row 57–60 is wording-level like the other "budgets" rows (q2 audit).
- Clean elsewhere: model-role list at 36–37 matches the engine's sites; POLICY block matched on all six q6 dimensions.

## 5. z-super-rustflow — `/Users/hmziq/.zcode/skills/z-super-rustflow/SKILL.md`

Verified drift: 2 (counted), plus 4 intent-labeled rows excluded from counts. This sheet composes its own inline workflows rather than launching saved zflow-engine (a grep for "zflow-engine" across the file returns zero hits), which is why most of its divergences are labeled intent.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 29–31 (q1) | "Sibling flows (z-workflow, z-proflow, z-flashflow, z-liteflow, z-gpui-workflow, z-tauri-workflow) run under their own rules — never cross-apply; hand off via finish-and-relaunch." | 119–120 | "Node modes are not part of this engine; the z-*flow ports run their own node workflow." | sheet-claims-machinery-engine-lacks | verified | intent |
| 82–85 (q1) | "Node runs are composed inline from this blueprint via CreateWorkflow (compilation validates them); fix rounds re-enter via AmendWorkflow" | 119–120 | "Node modes are not part of this engine; the z-*flow ports run their own node workflow." | sheet-claims-machinery-engine-lacks | verified | intent |
| 111–116 (q6) | "runs a numstat size check after every round: a round whose delta exceeds the area's budget is a red round with reason `size`" | 893–911 | "what: `Area over size budget: ${size.files} file(s), +${size.added}/−${size.deleted} against ${budget.maxLines} lines / ${budget.maxFiles} files" | sheet-disagrees-with-engine | verified | intent |
| 116–119 (q1) | "The Committer drafts and the script commits each green round separately, `perf:` style matching `git log --oneline -10`" | 474–513 | "const committer = agent(\"Committer\", {" | sheet-claims-machinery-engine-lacks | verified | drift (medium) |
| 137–141 (q2+q6 merged; q2 cites 138–141) | "stop honestly: `maxRounds` (default 6 — an honesty valve against ping-pong, not a target) or two consecutive rounds with zero registry progress" | 64–69; 313–314 | "Optional per-area round cap. Default unbounded — every area loops until clean, stagnation, or this cap. required: false default: 0" | sheet-disagrees-with-engine | verified | drift (q2: high) / intent (q6: low) |

Auditor notes (sourced):
- Row 116–119: the blueprint's node table at sheet 66–72 (checked via whole-sheet read) defines no Committer row — rows are explorer/researcher, confirmers, implementer, auditor, gates+bench compare; the engine spawns its Committer only inside its own run machinery (agent() at engine 477, inside the cited 474–513). A misleading machinery description, not run-breaking (q1 audit).
- Merged row 137–141: q2 flagged it as drift per the brief (the term matches the engine arg name; engine default 0/unbounded, mapping at engine 314), while q6 labeled the same divergence intent because the sheet's convergence loop is its own inline machinery, blessed at engine 119–120. It is counted once in verifiedDrift, as drift, per the run's flag decision; both readings are recorded here.
- Intent rows: 29–31 is sibling-routing; 82–85 is inline composition; 111–116 (per-round numstat with size-red stops vs the engine's cumulative numstat raised as a HIGH verified finding, 893–911) and 59–68 (q5: main-tier-only/no-flash/no-escalation-bridge tier policy) describe the sheet's own composed workflow, not zflow-engine — engine offers only flash|balanced (311), pins flash only on capture/audit (600, 608), and has no router (grep exit 1).
- Lines 83–85 carry both fix controls ("fix rounds re-enter via AmendWorkflow … stopped runs continue via ResumeWorkflowRun. Never nest") — no q3 candidate (q3 audit).

## 6. z-tauri-workflow — `/Users/hmziq/.zcode/skills/z-tauri-workflow/SKILL.md`

Verified drift: 3. The ResumeWorkflowRun half of the never-relaunch rule is missing (no "resume" anywhere in the file), plus the shared flash-rationale wording and "budgets" shorthand.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 18–19 (q3) | "Never relaunch to fix (AmendWorkflow revises; never nest)." | 20–25 | "one launch per chain, never relaunching to fix (AmendWorkflow revises, ResumeWorkflowRun continues)" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 25–26 (q5) | "Flash where output is objectively checkable — gates, git state, image reading." | 337–340 | "Judgment roles run pro in the balanced profile and flash in the all-flash profile; capture and audit are always flash." | sheet-disagrees-with-engine | verified | drift (low) |
| 52–54 (q2) | "launch (once): CreateWorkflow saved zflow-engine — mode=\"chain\", task (with the dev-server URL named), areas, agentsMd, baseSha, repoRoot, budgets, commit." | 54–63 | "maxFiles: type: number description: \"Run-level default size budget: max changed files.\" required: false default: 10" | sheet-claims-machinery-engine-lacks | verified | drift (low) |

Auditor notes (sourced):
- Row 18–19: case-insensitive grep finds no "resume" anywhere in the file — the AmendWorkflow half survives, the ResumeWorkflowRun half is omitted (q3 audit).
- Row 25–26 is wording-level: the engine pins flash only on capture (600) and vision-audit (608) and runs gates model-free via world.run (425–434); the pinning sentence that follows at 26–28 is correct (q5 audit).
- Clean elsewhere: the dev-server URL override documented at 37–39 and 52–53 is exactly engine 7-8/91-92/568, device-lane serialization (55–57) matches engine 627–631 (q4 audit); POLICY-adjacent claims (baseline via OMIT at 47–48, no maxRounds unless user caps at 54, findings-shrink loop and dependsOn merges at 57–58, size-budget commits at 73–76) all match engine machinery (q6 audit).

## 7. z-gpui-workflow — `/Users/hmziq/.zcode/skills/z-gpui-workflow/SKILL.md`

Verified drift: 4. Same ResumeWorkflowRun omission as z-tauri-workflow, the shared "budgets" and flash-wording rows, and a distinct one: the vision audit claims gpui-kit design guides the engine never passes to the auditor.

| sheet lines | sheet quote | engine lines | engine quote | drift kind | status | label |
|---|---|---|---|---|---|---|
| 18–19 (q3) | "Never relaunch to fix (AmendWorkflow revises; never nest)." | 20–25 | "one launch per chain, never relaunching to fix (AmendWorkflow revises, ResumeWorkflowRun continues)" | sheet-omits-machinery-engine-has | verified | drift (medium) |
| 25–26 (q5) | "Flash where output is objectively checkable — gates, git state, image reading." | 337–340 | "Judgment roles run pro in the balanced profile and flash in the all-flash profile; capture and audit are always flash." | sheet-disagrees-with-engine | verified | drift (low) |
| 47–48 (q2) | "launch (once): CreateWorkflow saved zflow-engine — mode=\"chain\", task, areas, agentsMd, baseSha, repoRoot, budgets, commit. No subagent_model." | 54–63 | "maxFiles: type: number description: \"Run-level default size budget: max changed files.\" required: false default: 10" | sheet-claims-machinery-engine-lacks | verified | drift (low) |
| 49–55 (q4) | "the auditor reports measured differences — px offsets, hex deltas, font-size deltas, missing/extra elements — against the task + gpui-kit design guides" | 610–617 | "`Audit the visual evidence for area \"${name}\" (round ${round}) against the task.`, `Task: ${task}`" | sheet-claims-machinery-engine-lacks | verified | drift (medium) |

Auditor notes (sourced):
- Row 49–55: the engine's vision-audit ask hands the auditor only the task, evidence paths, capture notes, and the AGENTS.md line; area.skills is injected solely into the planner ask (engine 711) and implementer ask (engine 787) — the design-guide audit reference is machinery the engine lacks (q4 audit).
- Rows 25–26 and 47–48 are wording-level (q5, q2 audits); row 18–19 omits ResumeWorkflowRun exactly as in z-tauri-workflow (q3 audit).
- Clean elsewhere: model-role list at 26–28 matches the engine's sites (q5); POLICY block matched on all six q6 dimensions.

---

## Engine-side findings

Verified by the concurrent engine-side checker (reported from its result; not re-verified here):

- `/Users/hmziq/.zcode/workflows/zflow-engine.dwf.ts:280` — the hasUI/lane warning says to "classify the area with contention: \"terminal\" | \"web\" | \"desktop\"", omitting \"mobile\", while the engine itself handles mobile: the contention type at line 128 includes \"mobile\", lines 251–253 validate/accept \"mobile\", and the docs at lines 21 and 35–36 list mobile as a valid contention. (Checker lines 21–280; holds.)

No other engine-side inconsistencies were reported.

---

## Caveats

Every run caveat from the six audits, grouped by the question that produced it. Stale ranges found: one (z-flashflow ask citation, q3) — no stale ranges in any audited citation.

### q1 (machinery descriptions)

- Engine quotes for candidates 2 and 3 span a '//'-comment line wrap at engine lines 119–120; matched verbatim modulo the line-leading comment markers (whitespace/formatting-insensitive), with every quoted word appearing in order across the two lines.
- Candidate 1's drift reading additionally rests on the node table at sheet lines 66–72 (outside the cited 116–119 range); confirmed via the permitted whole-sheet read of z-super-rustflow/SKILL.md: table rows are explorer/researcher, confirmers, implementer, auditor, gates+bench compare — no Committer row.

### q2 (launch args and defaults)

- z-super-rustflow composes its own inline workflows rather than launching saved zflow-engine (its lines 82–87, inline composition is known intent per the brief), so its 'maxRounds (default 6)' may name a parameter of its own composed convergence loop rather than the zflow-engine arg; flagged anyway because the term matches the engine arg name and the brief names this exact drift as flaggable.
- The four 'budgets' candidates are wording-level: the engine's maxFiles/maxLines descriptions literally read "Run-level default size budget", so the shorthand maps to real machinery; kept at severity low. A literal reading (passing an arg named budgets) would not reach the engine's maxLines/maxFiles.
- No stale ranges: every pinned citation relocated exactly as given (sheet lengths: z-super-rustflow 194, z-tauri-workflow 99, z-gpui-workflow 96, z-proflow 103, z-flashflow 92, z-liteflow 95 lines; engine 1046 lines as stated).
- z-workflow carries no pinned range, so it was audited by two whole-file greps (launch-arg terms, then task/mode=) plus one anchored read of lines 125–164, per the read budget; its remaining arg mentions in grep output (lines 187 'maxRounds caps the loop only when the user sets one', lines 199–204 commit=false leaves work on disk and worktree dependents blocked honestly, line 205 pass agentsMd and baseSha at launch) are consistent with the engine and produced no candidates.
- Checks actually run this ask: Read of engine lines 26–75, 76–94, 311–319; whole Reads of z-liteflow, z-proflow, z-flashflow, z-tauri-workflow, z-gpui-workflow, z-super-rustflow; grep -n -E 'maxRounds|maxFiles|maxLines|modelProfile|subagent_model|max_concurrency|agentsMd|baseSha|repoRoot|areas|commit|launch|CreateWorkflow|args' and grep -n -E '\btask\b|mode=|mode"' on z-workflow, plus a 40-line anchored Read of z-workflow 125–164. No checks were substituted or skipped.
- Consistent-with-engine (no candidates): all other documented launch args exist in the engine block; every sheet that mentions subagent_model states it is NOT passed (accurate); modelProfile values used are only balanced/flash (engine line 311 maps non-flash to balanced); z-workflow line 160 'commit (default true)' matches engine line 53; z-liteflow line 57 'agentsMd (default AGENTS.md; "" when the repo has none)' matches engine lines 29–32; all sheets' ~400 lines/~10 files size budget matches engine defaults; z-super-rustflow's baseSha size-evidence wording (its lines 96–98) matches engine lines 41–47. Sibling-routing cross-references and z-super-rustflow/z-workflow inline research/draft pipelines were labeled intent per the brief, not flagged.
- Candidate 1's claim text cites 'engine lines 313–314' for the validation mapping; grep -n 'POSITIVE_INFINITY' on the engine located the mapping at line 314 exactly (const maxRounds = rawMaxRounds >= 1 ? Math.floor(rawMaxRounds) : Number.POSITIVE_INFINITY;). Line 313 was not read; this is corroboration only — the candidate's audited engine citation (64–69) is correct as cited.
- Candidate 8: the engine's own whenToUse prose (zflow-engine.dwf.ts lines 23–25, read via grep-anchored read around the max_concurrency hit) says 'The launcher passes no subagent_model and no max_concurrency unless the user asks for a width limit' — the sheet sentence mirrors engine prose, but a file-wide grep for max_concurrency hits only that prose line and the arg block (lines 26–93, read in full) defines no such arg, so the drift reading holds as stated.
- Candidate 3: z-liteflow sheet line 54 references 'areas[].gates' as a field path, which loosely touches the claim's 'without ever naming the two required args' phrasing; the Scope section (lines 43–61, whole-sheet read) never presents task or areas as launch args, and the launch sketch (33–41) names only mode/modelProfile/commit, so the drift reading is unaffected.
- Engine file was read only at cited ranges (26–93 in four chunks, 48–69, 89–93) plus two grep-anchored micro-reads (lines 16–25, 70–75); no whole-file read. All eight sheet quotes matched verbatim at their cited lines; no range corrections were needed.

### q3 (never-relaunch pair)

- Stale/mislocated ask citation: z-flashflow:24–26 does not match the text's location — the never-relaunch-to-fix parenthetical naming both AmendWorkflow (line 23) and ResumeWorkflowRun (line 24) sits at lines 21–24 ('...runs inside that single workflow; never relaunch to fix (AmendWorkflow revises a wrong run reusing its finished work; ResumeWorkflowRun continues a stopped one).'). The sheet carries both controls, so no drift; only the cited range is off.
- The ask's tentative grouping of z-super-rustflow:83–87 under 'drop the never-relaunch/never-nest rule' is contradicted by the file: lines 83–85 read 'fix rounds re-enter via AmendWorkflow (reuses finished work), stopped runs continue via ResumeWorkflowRun. Never nest — no run spawns another.' — it carries both controls plus the rule and therefore gets no candidate; its line-31 'hand off via finish-and-relaunch' is sibling-routing (known intent, not flagged).
- Checks run this ask: Read of engine /Users/hmziq/.zcode/workflows/zflow-engine.dwf.ts lines 20–25 only; grep -n -E 'AmendWorkflow|ResumeWorkflowRun|relaunch|re-launch|never nest|nest' across all seven SKILL.md files; grep -n -i -E 'amend|resume|revise' across z-proflow, z-liteflow, z-tauri-workflow, z-gpui-workflow; whole-Read of the seven pinned sheet ranges (z-workflow:20–22, z-proflow:40–64, z-liteflow:14–19, z-flashflow:20–28, z-super-rustflow:83–87, z-tauri:18–19, z-gpui:18–19). z-workflow:20–22 verified verbatim as carrying both controls plus never-nest (cited range matches).
- z-proflow:93–94 and z-liteflow:93–94 ('relaunch as the sibling flow ... no nesting') are sibling-routing cross-references — labeled as known intent, not drift, per the known-intent list; they are not part of any candidate.

### q4 (vision and capture topology)

- The question's suggested drift for z-proflow:56–59 ("non-terminal areas" vs the engine's "UI-area condition") does not hold and no candidate was reported for it: the engine's own gating at zflow-engine.dwf.ts:817 is literally `it.area.contention !== "terminal"` (checked by reading 805–829), and "UI area" appears only in the stage's phase label at :832; z-proflow 57 ("vision for non-terminal areas") and 37 ("or none, when all areas are terminal") therefore agree with the engine wiring.
- z-super-rustflow was checked rather than flagged: a grep for "zflow-engine" across that file returned zero hits — it composes its own inline blueprint and even plans a separate saved engine ("save the engine as `rustflow-engine`", z-super-rustflow 82–87), so its "no vision node, no flash agents, anywhere" (lines 10, 57–64) describes its own workflow, not zflow-engine's vision machinery; inline composition is also the labeled known intent.
- z-tauri-workflow's pinned lines (36–39, 54–67) match the engine: the dev-server URL named in the task text (37–39, 52–53) is exactly engine 7-8/91-92/568's override, and "capture serialized through the device lane" (55–57) matches engine 627–631; no candidate.
- z-workflow's contention table (101–106) is accurate against the engine (port 4100+index sorted = engine 335–336; session zflow-<area> = 567; mobile device phase through the same single-worker lane = 106/627); the sheet's drift is confined to the chain-blueprint line 168 and the port-override omission.
- Checks actually run this session: Read on engine ranges 4–10, 88–95, 110–115, 333–337, 349–354, 563–612, 613–640, 805–829, 832–848 (never the whole file); Read of all five cited sheets whole; grep for vision/capture terms in z-flashflow and z-super-rustflow with windowed reads around hits (z-flashflow 47–91, z-super-rustflow 1–25 and 55–99); grep for "zflow-engine|dev-server|dev server|devUrl" across all seven sheets; wc -l confirming sheet sizes. All cited ranges were found at their stated lines — no stale ranges.
- Candidate 3's claim asserts the sheet's prep list contemplates mobile areas ("terminal/web/desktop/mobile", z-liteflow 43) — this is wrong for the current file: `grep -nEi 'mobile|terminal|contention' /Users/hmziq/.zcode/skills/z-liteflow/SKILL.md` returned zero hits (exit 1); line 43 is '### Scope (coordinator, before the launch)' and the 95-line sheet never enumerates contention values. That enumeration text is in z-flashflow 47–48 (which candidate 4 cites correctly, likely a sheet mix-up by the searcher). Candidate 3's core drift — capture enumerated as only agent-browser/ocu while the engine runs a third mobileAsk path — still holds on its two verified quotes, so it is verified rather than refuted, with the bad supporting detail noted here.
- Candidate 2's cross-sheet assertion was independently re-run: `grep -nEi 'dev[ -]?server|devurl' /Users/hmziq/.zcode/skills/z-*/SKILL.md` hit only z-tauri-workflow (lines 6, 37, 53, 96 — the 37 and 53 hits fall inside the claim's cited 37–39 and 52–53 ranges) and z-workflow:168, consistent with 'only z-tauri-workflow documents the override'.
- Engine-side secondary line references were anchored by grep plus small anchored reads rather than whole-file reads: mobileAsk at engine 583 with simctl/adb/emulator capture at 584–587; device-lane gating of desktop AND mobile at 627–628; dev-server-URL port override at 91–92 and 568; .skills ask-injection only at 711 (planner) and 787 (implementer), with 269 being schema parsing; loop comment 'plan → implement → vision → judge' at 96. Engine file confirmed 1046 lines via `wc -l`; it was read only at cited ranges (814–821, 4–11, 590–597, 606–619) plus grep-anchored reads of ≤9 lines (623–631, 88–94), never whole.

### q5 (model tiers)

- No stale ranges: every cited engine range (311, 337–340, 601–609, 859–865, 912–925) plus the context lines 119–120, 599, 703, 775 and every cited sheet range resolved in place; engine is 1046 lines as stated (wc -l).
- Verified clean (reported here so the clean result is sourced): the engine's six JUDGE_MODEL sites are Committer 477/481, planner 700/704, plan-reviewer 719/723, implementer 770/776, judge 859/865, confirmer 914/918 and its only two FLASH_MODEL sites are capture 595/600 and vision-audit 604/608 (grep 'model: ' + grep 'agent(`' + grep 'agent("'); this exactly matches the role lists in z-proflow 26–27, z-flashflow 36–37, z-tauri 26–28, z-gpui 26–28, z-workflow 130–131. All modelProfile values passed by sheets (grep across seven sheets) are the literal strings 'flash' or 'balanced', so none is silently coerced by 311; z-tauri and z-gpui omit the arg and inherit the balanced default. No sheet names a router; engine grep -niE 'router|escalat' returns only the three per-agent escalation lines.
- z-workflow was not line-cited for q5; it was grep-anchored (modelProfile|flash|GLM) and read only at 120–134 and 156–170.
- Could not verify from the engine file whether composed inline nodes can opt out of the harness Escalate tool; z-super-rustflow:59 'no escalation bridge' is read as coordinator policy and left unverified.
- Out of q5 scope, not audited: the judge system prompt at engine 859–865 carries no escalation instruction ('If you cannot judge something, say so instead of guessing') while z-proflow 89–92, z-tauri-workflow 92–94 and z-gpui-workflow 90–92 describe a batched judge escalation bridge; the judge ask body (866+) was not read, so this is flagged for whichever question owns fallback lanes, not claimed.
- No stale or off-by-few ranges found: every cited quote appeared verbatim at its cited lines, so correctedSheet/correctedEngine are identical to the originals.
- Engine evidence was gathered only via six targeted reads (335–342, 309–313, 423–436, 596–612, 117–122) and three scoped greps (world.run/always flash/modelProfile/bless/escalation; escalate/FLASH_MODEL/VISION_MODEL; router); wc -l confirmed 1046 lines. The engine file was never read whole.
- Every supporting line reference inside the claims was verified during this ask: engine 339–340, 425–434, 599/600, 608, 703, 775, 119–120, 311; z-tauri-workflow 26–28; z-gpui-workflow 26–28; z-workflow 132; z-super-rustflow 57–72 and 82–83.
- Grep for 'router' in the engine returned no matches (exit 1), confirming candidate 4's 'zero router mentions' sub-claim.

### q6 (stop conditions and policy machinery)

- No stale ranges: every pinned engine range (18–19, 109–117, 313–332, 511–533, 879–911, 996–1046) and sheet range fell inside file bounds; engine confirmed at 1046 lines via wc -l (996–1046 read as 996–1045 plus 1046 per the 50-line chunk rule).
- 'Engine has no baseline machinery' is grounded by the command actually run this ask: grep -n -i baseline /Users/hmziq/.zcode/workflows/zflow-engine.dwf.ts → no matches, exit 1, across all 1046 lines.
- z-tauri-workflow had no pinned range; a scoped grep hit machinery terms, so the 98-line sheet was read whole (authorized by the ask's grep-hit rule) — its POLICY-adjacent claims (coordinator baseline via OMIT at 47–48, no maxRounds unless user caps at 54, findings-shrink loop and dependsOn merges at 57–58, size-budget commits 73–76) all match engine machinery; no drift found there.
- Engine behaviors outside the cited/pinned ranges were not verified and no finding rests on them — e.g. z-workflow:108–109's claim that the engine deletes merged worktrees/branches, and the exact clean-stop predicate behind z-workflow POLICY rule 1.
- z-proflow, z-liteflow, z-flashflow, and z-gpui-workflow POLICY blocks were compared line-by-line against the engine ranges and matched on all six dimensions (unbounded rounds/stagnation/cap, script-run gates → verified findings, script numstat → HIGH verified over-budget, serialized commits/DAG merges, board/report/commit=false, coordinator-side baseline); no candidates from them.
- Known-intent items checked and correctly absent: no sheet attributes research/draft inline composition to the zflow-engine (z-workflow routes code to saved zflow-engine, research/draft to inline scripts at 63–68), and sibling cross-references in z-proflow:21–22, z-super-rustflow:29–31 are routing pointers, so neither produced a candidate requiring the knownIntent label.

### Report-writer note

- The merged z-super-rustflow 137–141 row counts once in verifiedDrift, as drift: q2 flagged it per the brief while q6 labeled the same sentence intent (inline-composed convergence loop blessed at engine 119–120). Both labels are preserved in the row. No rows were added, removed, or re-derived beyond the audited findings; the engine-side row is the checker's verified result, reported as given.
