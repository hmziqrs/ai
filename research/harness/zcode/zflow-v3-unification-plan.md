# zflow v3 — Unification Plan (direction document)

Status: DECISION DOCUMENT. No implementation has started. Nothing in `ai/`, `~/.zcode/`,
or any engine/skill file was modified while writing this. Two capability-probe workflow
runs were executed 2026-10-15 (§2a); they wrote only harness-local artifacts
(`.zcode/workflow-drafts/` and the run journal).

Inputs: four read-only probe reports (2026-10-15) over (1) shipflow raw material in
`ai/harness/zcode/`, (2) the installed v2.2 engine + 7 z-flow skills, (3) the
verification surface per frontend kind, (4) repo plumbing and git history; plus
owner-supplied facts: v2.2 is the latest engine; `shipflow-refactor-wip` (ai `46c9b40`)
was parked because parallelizing the legacy engine's nested loops sent the ZCode harness
into an infinite loop and crashed it.

---

## 1. Conclusion in one paragraph

TWO engines, deliberately separate (owner decision, 2026-10-15): v2.2 stays untouched
as the goal-oriented engine (finite: one task in, verified work out), and V3 — a NEW
engine file containing ALL of v2.2's capabilities again, plus the shipflow delivery
layer — becomes the autonomous engine: ONE persistent, SELF-MUTATING workflow run
whose in-script scheduler keeps 2-3 issue LANES busy concurrently (each lane: claim →
build → verify → PR → review → merge), pulling newly-approved, unblocked issues from
the GitHub Project as lanes free up, running until a human resolves it. No issue is
ever split across launches, and no engine ever launches another. The infinite loop
lives in SCRIPT CODE + on-disk state — never in any agent's context. A manual PRD
front door sits before the engine: goal → plain-language PRD overview → owner confirms
each item → iteratively extended → concrete plan → the AGENT files it as GitHub issues
(with blocked-by labels and Project cards); the owner's drag into the Approved column
is the only start signal. The shared generalization work (stack profiles, seam
contract, delivery stages) is specified once in the SPEC and implemented in each
engine. Before any of that: Phase 0 reconciliation, so v2.2 is the only goal-engine
generation that exists anywhere. Specialized skills stay thin coordinator sheets on
top, exactly like the existing z-tauri/z-gpui pattern.

## 2. Verified starting point (probe facts that bind this plan)

- The v2.2 one-launch engine (`~/.zcode/workflows/zflow-engine.dwf.ts`, 52,773 B) is the
  newest artifact — one save NEWER than `.zcode/workflow-probes/engine-v2.2-snapshot.dwf.ts`
  (52,817 B; installed copy drops a `commitNotes` field). Pro/Flash vision coexist in one
  run via `model()` pins (engine lines 337-340). It classifies areas by
  `contention: terminal | web | desktop | mobile` and rejects legacy `hasUI`.
- The `ai/` repo of record still carries the OLD multi-run engine (81,637 B) and docs
  describing the retired tier-pure architecture; 6 of 7 installed skills match the parent
  repo's probe snapshots, not `ai/` main. Three engine generations coexist.
- shipflow = the product/delivery layer, ~95% stack-agnostic. Exactly four stack forks:
  `implPersona(hasUI)` (`shipflow-queue.dwf.ts:300-304`), `reviewerPersona(hasUI)`
  (`:328-333`), a rusqlite SQL rule inside two audit personas (`:322,325`), and the
  browser/vision stage. Its 17 typed interfaces and its claim→triage→plan→implement→
  gates→preview→evidence→PR→audit→merge→report control flow are generic.
- Both engines already share conventions: `.zflow/evidence/`, script-run gates with
  allowlist + anchoring, serialized git, Finding/Confirmer separation, flash-captures /
  pro-judges. The merge is a dedup, not a rewrite.
- Coverage gaps in the verification matrix: terminal TUI (no pty driver, no ratatui
  `TestBackend` guidance), XCTest/Espresso programmatic layers, Flutter MCP server,
  Tauri WebDriver on macOS (ocu lane compensates). The mobile interaction gap is now
  covered by mobile-mcp/mobilecli (§2b): describe-first refs, webview DOM queries,
  screenshots, and crash reports on both platforms.

## 2a. Harness capability verification (2026-10-15, probe runs dwfrun-7082fdf0 / dwfrun-827c76c8)

Everything V3's design depends on was verified against the live harness with a probe
workflow, then amended once to prove self-mutation. Results:

| Capability | Verdict | Evidence |
|---|---|---|
| Monitor tick loop as pure script code (`world.run` sleep + gh, state across ticks, zero model context) | WORKS | 3 ticks, all exits 0, gh 2.92.0; loop shape is the V3 monitor |
| Per-subagent model pinning — PRO and Flash in ONE run (`model()` refs) | WORKS | pro echo PRO-OK + flash echo FLASH-OK in the same run |
| Specialized persona with rules EMBEDDED in its system prompt (no boot-time skill loading, zero file reads) | WORKS | answered ruleUsed=R3, readAFile=false, correct domain answer |
| In-run CLI capture stack from a subagent shell | WORKS 6/6 | agent-browser 0.8.0, ocu 0.3.5, gh 2.92.0, python3 3.9.6, adb 1.0.41, xcrun 72 |
| Self-mutation via AmendWorkflow (warm cache) | WORKS | original run 1m34s/11 steps; amended run 7s with 10/12 steps settled from cache, prior phases re-settled at 0s, only the new station ran live (AMEND-OK) |

Contract facts that shape the design (from the dynamic-workflows authoring contract,
loaded in full): an **unbounded `while` is a documented anti-pattern — runs die on
caps** (also: 65,536 report items / 1 GiB per run), so V3's infinity is bounded
scheduling windows chained by amend/resume with full state import; the persona surface
is exactly `{system, model}` (no skill-loading field) — embedding distilled rules in
the system prompt IS the pre-loading mechanism; subagents cannot call CreateWorkflow
(no nesting, C1 confirmed); browser-use/computer-use plugins stay main-thread-only
(in-run capture = CLI twins, confirmed present). Model catalog verified:
`account:zai-individual-coding-plan/GLM-5.3` and `-Flash`, levels low/high/max.

## 2b. Mobile surface: mobile-mcp + mobilecli (owner-designated primary, 2026-10-15)

Verified on this machine. These two replace the first-party ios-simulator /
android-emulator plugins as the primary mobile surface for V2.2 and V3 (plugins remain
installed as fallback):

- **`mobile-mcp`** (MCP server, configured in `~/.zcode/cli/config.json` via
  `mcp-server-mobile`) — the MAIN-THREAD face: element-level interaction
  (`mobile_list_elements_on_screen` returns refs + coordinates + labels — the
  describe-first pattern), screenshots, device logs, foreground app, crash reports,
  screen recording. Local devices/simulators are free; a REMOTE cloud device fleet
  exists but is billed — nothing in V2.2/V3 may allocate a remote device silently;
  remote use is owner-consented only.
- **`mobilecli`** (npm CLI, `~/.nvm/.../bin/mobilecli`) — the IN-RUN face, drivable
  from any subagent shell, replacing raw `adb`/`xcrun simctl` in engine capture lanes:
  device list/boot/shutdown/reboot/info/orientation; app launch/terminate/install/
  foreground; screenshots (png/jpeg, scaled); input (tap, longpress, swipe, pinch,
  hardware buttons, text, clipboard); **webview commands — list embedded webviews,
  navigate, and query DOM by CSS selector / eval JS / read url+title** (gives hybrid
  apps DOM-level describe-first, which raw adb never had); crash report list/get;
  on-device agent install; remote allocate/release (same billing caution); device
  filesystem access.

Positioning follows the established triad — `agent-browser` (web), `ocu` (desktop),
`mobilecli` (mobile) inside runs; MCP/plugin surfaces on the main thread for
coordinator-side and PRD-time use. Element-ref interaction stays MCP-side (main
thread); in-run interaction uses coordinates plus webview selectors where the app is
hybrid. Device serialization (one physical screen / simulator) still applies — the
in-script device mutex is unchanged.

## 3. Hard constraints (post-mortems and harness rules — not suggestions)

- **C1 — No nesting, no parallel nested loops.** The WIP branch died of this; the
  dynamic-workflows facade also forbids subagents calling CreateWorkflow. v3 is
  one launch per task with every loop inside the run (the v2.2 shape). Any design that
  requires a workflow to launch a workflow is invalid on arrival.
- **C2 — One engine of record, zero drift.** v2.2 (specifically: the installed
  `~/.zcode` copy, the newest save) becomes the single source; every other copy is
  either updated to it, archived, or deleted.
- **C3 — Coherence rule** (skill-refactor-guidelines.md): a skill describing machinery
  the machinery does not have is a lie. Engine first or together; typecheck via
  SaveWorkflow after every edit.
- **C4 — In-run tool limits.** browser-use/computer-use plugins are main-thread-only;
  in-run capture uses the CLI twins (`agent-browser --session`, `ocu`, `mobilecli` for
  mobile); vision judging is flash subagents reading PNGs natively. `mcp analyze_image`
  is remote-URL only. MCP surfaces (`mobile-mcp` included) are main-thread; their CLI
  twins run inside workflows.
- **C5 — Shadow semantics cause silent drift.** Per ZCode config: skills load from
  user `~/.zcode/skills` before workspace `.zcode/skills`, and the first same-named
  skill wins — a stale user-scope copy silently shadows the repo copy. Saved workflows
  exist in two scopes (`~/.zcode/workflows` global, `.zcode/workflows` project). The
  install ritual must include a shadow/conflict scan, or drift returns.
- **C6 — The infinite loop never lives in AGENT context.** No subagent and no
  main-agent session may hold the loop — a long-lived agent overflows its context and
  destroys the workflow (owner rule; consistent with the C1 crash post-mortem). The
  loop lives in SCRIPT CODE plus on-disk state: V3's in-run scheduler loop is plain
  code, its journal and queue state live outside any model context (GitHub issues,
  `.shipflow/` artifacts, evidence files), so per-cycle agent context cost is zero.
  The watchdog cron still guards liveness from outside.
- **C7 — The autonomous engine starts only from an approved PRD.** PRD refinement is
  manual, human-in-the-loop, and precedes any autonomous run (see 4a). Approval =
  the issue's card sitting in the GitHub Project's Approved column (D8) — nothing
  else starts a lane.
- **C8 — One launch for the whole autonomous session.** V3 is a single persistent
  run: the scheduler keeps 2-3 issue lanes busy inside it, each lane carries its
  issue from claim through merge, and no issue is ever split across launches. No
  engine ever launches another engine (C1) — that split recreates the multi-round
  orchestration the harness update eliminated.

## 4. Phase 0 — Reconcile: v2.2 everywhere (do this before anything else)

Goal: after Phase 0, exactly one engine file content exists, `ai/` main is its source
of truth, and every install surface matches it byte-for-byte.

Steps:
1. Diff installed `~/.zcode/workflows/zflow-engine.dwf.ts` vs
   `.zcode/workflow-probes/engine-v2.2-snapshot.dwf.ts`; confirm the installed copy is
   the newest (expected: yes, minus `commitNotes`). Land THAT content into
   `ai/harness/zcode/workflows/zflow-engine.dwf.ts`, replacing the 81 KB multi-run
   engine.
2. Land the 6 ported-skill sheets from `.zcode/workflow-probes/ported-skills/` into
   `ai/harness/zcode/skills/` (z-super-rustflow already matches ai main — verify only).
3. Rewrite `ai/harness/zcode/workflows/zflow-SPEC.md`, README, install.md, llms.txt to
   the one-launch reality (per-subagent `model()` pins, chain mode, no tier-pure runs).
   CHANGELOG: one entry for the reconciliation + one post-mortem line for
   `shipflow-refactor-wip` ("parked: parallelizing the legacy engine's nested loops
   infinite-looped the harness; superseded by the one-launch v2.2/v3 line").
4. Archive, don't delete: keep `zflow-port/` as the historical Sep-21 spec-of-record
   (already done); mark `.zcode/workflow-probes/` snapshots SUPERSEDED in its LAYOUT.md;
   leave the parked ai branch untouched.
5. Reinstall from `ai/` of record and verify: byte-parity engine + 7 skills across
   `~/.zcode`; no symlinks under `~/.zcode/agents` (ZCode skips them); no same-named
   skill in both user and workspace scope (shadow scan, C5); zflow-smoke fixtures green.

Exit criteria: `diff` clean everywhere; one engine generation reachable; docs tell the
truth. Phase 1 may not start until this holds.

## 4a. The front door: PRD flow (manual, before the autonomous engine)

The autonomous engine never starts from a raw goal. A manual, human-in-the-loop PRD
pipeline runs first (C7):

1. Owner writes a goal (one sentence to one paragraph).
2. Agent returns a PRD OVERVIEW in plain language — what will be built, for whom,
   what "done" means, open questions. No jargon, no implementation detail.
3. Owner walks through each PRD item and confirms or corrects it.
4. Agent extends the confirmed items one level deeper (behaviors, edges, non-goals,
   verification expectations). Owner confirms again.
5. Repeat step 4 until every item is concrete enough to implement — the final PRD
   artifact IS the plan the engine consumes (it becomes the issue bodies, step 6).
6. The agent FILES the approved PRD into GitHub (D9): one issue per PRD item, bodies
   written from the confirmed text, `blocked-by-<n>` labels encoding the dependency
   graph (D7), all cards added to the Project in a Review column. The owner edits
   freely in GitHub, then drags cards into Approved — that drag is the approval gate
   (D8, C7). Only Approved-and-unblocked issues are ever claimed by a lane.

Rules: every extension round starts from the owner's last confirmation (no silent
rewrites); the PRD artifact is a versioned file on disk, never only chat context; the
engine's triage stage may reject back to PRD if the artifact is not actionable —
that rejection is a normal outcome, not a failure.

## 4b. Phase 0.5 — Update V2.2's mobile lane to mobilecli BEFORE forking V3

Owner decision (2026-10-15): the mobile capture lane stops using raw `adb` /
`xcrun simctl` (v2.2 engine's mobile ask-template) and routes through `mobilecli`
instead. This lands in V2.2 FIRST, so the V3 fork inherits the updated lane at zero
cost — the fork baseline is the POST-0.5 v2.2, not the current one.

What changes in V2.2's mobile lane: boot/install/launch/screenshot via mobilecli;
interaction by coordinates plus webview DOM queries for hybrid apps; crash-report
checks join the evidence set; the device mutex and evidence-glob verification stay
exactly as they are. Gated on spike S6 (an in-run mobilecli probe mirroring §2a) so
the rewrite is verified, not assumed. This is the one owner-directed capability
exception to the "V2.2 fixes only" maintenance policy, recorded below.

## 5. Phase 1 — V3: the autonomous superset engine; V2.2 untouched

**Decision D1 (DECIDED by owner, 2026-10-15): maintain TWO engines — V2.2 and V3.**
V2.2 is NOT modified, NOT extended, NOT merged into; it stays the goal-oriented engine
(finite run, one task, multi-area worktrees, DAG, in-run vision) for manual one-shot
use. V3 is a NEW engine file that contains ALL of V2.2's machinery again — forked at the
POST-Phase-0.5 baseline (mobile lane already on mobilecli, §4b) — PLUS the shipflow
delivery core (suggested name `shipflow-engine.dwf.ts`; final naming under D5).

**One persistent run, many lanes — the load-bearing rules (C8, D6).** V3 is ONE
long-lived workflow launch. Inside it, a scheduler loop (plain script code, never a
subagent — C6) keeps 2-3 LANES busy: each lane carries one issue end-to-end — claim →
triage → plan → implement → gates → fix loop → capture/vision → PR → audit fan-out →
merge policy → report — then pulls the next ready issue. Ready = card in the Project's
Approved column AND every `blocked-by-<n>` blocker closed AND not already claimed.
Lanes are data-driven subagent dispatches over a flat worker pool (no nested
loops-of-agents — the C1 crash shape). A global in-script mutex serializes
desktop/mobile device use across lanes; web capture ports allocate deterministically
per issue so concurrent lanes never collide. A lane ends merged, honestly failed, or
backlogged; only human resolution (or explicit stop) ends the run.

**Self-mutation — the owner's requirement, mapped to harness mechanisms.** The run can
change its own code without losing work: AmendWorkflow stops the run, starts the
revised script as its successor, and IMPORTS the finished work as warm cache (nothing
re-paid); holes (dynamic-workflows §15) let a running script grow new stages where the
shape is not known yet. Use amend for mid-flight stage fixes and scheduler-policy
changes; the GitHub queue survives every mutation because it lives outside the script.
The harness contract forbids unbounded while-loops (runs die on caps — §2a), so this
chaining is not a fallback but THE infinity mechanism: V3 runs bounded scheduling
windows, and each amend/resume segment continues the same workflow with full state
import. Probe-verified (§2a): 10 of 12 steps settled from cache at zero cost, prior
phases re-settled in 0s, only new code ran live.

**What V3 keeps from shipflow (its product core):** claim race → triage (validates
against the approved PRD artifact) → plan + plan-audit (≤2 re-plans) → implement →
gates → fix loop → capture/vision → PR → audit fan-out (security ∥ injection ∥ blind
judges ∥ confirmers) → code-computed merge POLICY → closeCycle heartbeat, labels,
CycleReport.

**What V3 carries over from V2.2 (full fork at the post-0.5 baseline, then diverges):**
per-subagent `model()` pinning (pro implementation + flash capture/vision in the same
run); the visionOne capture lanes (web via agent-browser, desktop via ocu, mobile via
mobilecli — §2b); gate allowlist + per-tool arg anchoring; worktree-per-area isolation
with the DAG/rounds/POLICY loop; evidence-glob verification ("filesystem is truth");
serialized git + Committer.

**Specialized sub-agents only — no general sub-agents (D10).** Every role V3
dispatches is a specialized persona (implementer, reviewer, capturer, vision judge,
security auditor, dispatcher, ...) whose domain rules are generated INTO its system
prompt at BUILD time from the single-source profile registry. The workflow facade's
persona surface is exactly `{system, model}` — no skill-loading field exists — so
embedding the distilled rules in the system prompt IS the pre-loading mechanism
(probe-verified: a persona answered a domain question from embedded rules with zero
file reads, §2a). The registry is the one place a stack's rules live: engine personas,
agent files, and knowledge sheets are all GENERATED from it (kills shipflow's
triple-copy sync hazard). This is also where the mix-and-match stack skills plug in —
TypeScript, Rust, Flutter, or any stack contributes persona rules + gate toolchains +
capture adapters to the registry, and a fine-grained skill on top simply selects a
combination.

**Maintenance policy for the fork:** V3 is the going-forward engine — new capability
lands in V3 first; V2.2 receives fixes only, staying a stable one-shot tool (one
owner-directed exception: the Phase 0.5 mobile-lane rewrite to mobilecli, §4b, which
happens in V2.2 before the fork so V3 inherits it). Shared
machinery conventions are documented once in `zflow-SPEC.md` (spec of record); the
Phase 0 drift ritual covers BOTH engine files at every install, so the fork stays
visible and intentional, never silent.

## 6. Phase 2 — The three generalized planes

### Plane A — Stack profiles (kill the four shipflow forks)

A registry BOTH engines implement (specified once in `zflow-SPEC.md` as the spec of
record; each engine carries its own implementation copy — the accepted D1 tradeoff).
Each area's `AreaSpec` gains `profile` fields instead of the boolean fork:

```
profile = {
  backend:  "rust" | "node" | "python" | "go" | ...,
  frontend: "none" | "web-svelte" | "web-react" | "terminal" | "desktop-tauri"
          | "desktop-gpui" | "ios" | "android" | "flutter",
}
```

Each registry entry supplies: implementer/reviewer persona templates, data-layer rules
block (the rusqlite line becomes rust's entry; parameterized queries for node/python),
gate toolchain additions (allowlist gains `flutter`, `dart`, `gradle`, `xcodebuild`,
`tauri` — today their absence silently blocks non-web stacks), and the capture adapter
keyed by contention (unchanged from v2.2). First entries ported from existing material:
rust, svelte (from shipflow verbatim), node, tauri, gpui, terminal, ios, android.
One persona source per entry; agent files and knowledge sheets GENERATED from it
(eliminates shipflow's triple-copy sync hazard).

### Plane B — The seam contract (the genuinely new, framework-defining work)

Today `dependsOn` only makes a frontend area wait; nothing verifies the integration.
v3 adds to AreaSpec:

- `contract`: path(s) to the interface artifact (OpenAPI/JSON Schema, TS types, Rust
  type crate) — injected into BOTH the backend and frontend implementer asks.
- `servesOn` / `dependsOnService`: port registry so the backend's port is allocated,
  launched, and known to the frontend area's capture lane (extends v2.2's
  deterministic `4100 + index` web scheme to backend services).
- `seamGate`: a cross-area gate (contract test / e2e spanning backend+frontend) run
  once all its areas are clean, BEFORE merges. This is the stage that makes v3 an
  integration framework instead of two parallel pipelines; it is also the fix for
  z-tauri-workflow's lane caveat (web-lane audits can't see IPC/webview).

### Plane C — Delivery plane (GitHub generalized)

Shipflow's delivery logic generalized as typed stages with a single adapter boundary
(`gh` CLI today): claim → branch → PR → automated review → audit fan-out → merge
policy → **deploy** (new) → report. The GitHub Project is the queue of record:
columns Draft → Approved → In Progress (lane claimed) → In Review (PR open) → Done
(merged) / Failed / Backlog; `pipeline:*` labels carry machine claim state;
`blocked-by-<n>` labels carry ordering (D7). Deploy does not exist anywhere yet — see
spike S1.
Everything downstream of merge consumes only typed artifacts (CycleReport, findings,
evidence paths), so a non-GitHub adapter (plain git + local report) can be added later
without touching stages.

## 7. Phase 3 — Specialized skills stay thin

The proven pattern holds: a specialized skill = coordinator sheet (~100 lines) choosing
profiles + slicing recipe + gate menu + skill-menu routing + fallback lanes, launching
ONE v3 run. Existing six sheets migrate unchanged except text updates; new sheets
become cheap: flutter-app, ios-rust, tui-axum, etc. z-super-rustflow stays independent
by design (different problem shape: research-gated optimization campaigns).

## 8. Research spikes (questions to answer BEFORE implementing each piece)

- **S0 Long-run + self-mutation spike — MOSTLY ANSWERED (2026-10-15, §2a)**: monitor
  tick loop, per-subagent model pinning, embedded-skill personas, CLI reachability,
  and AmendWorkflow warm-cache chaining (10/12 steps cached, prior phases at 0s) are
  all probe-verified. Remaining: a multi-hour soak for journal growth,
  ResumeWorkflowRun-after-kill behavior at scale, and gh rate limits at the
  production poll interval.
- **S1 Deploy strategy** (blocks Plane C's last stage): per-PR preview deploys vs
  post-merge deploys; mechanism (`gh workflow run` + `gh run watch`, or direct CLI);
  which targets matter (static host / container / crate publish). Recommend: post-merge
  CI dispatch first, preview deploys later.
- **S2 Contract artifact format** (blocks Plane B): one format or per-stack? Recommend:
  OpenAPI/JSON Schema as the interchange, generated into per-stack types.
- **S3 Terminal verification lane** (cheapest gap): ratatui `TestBackend` buffer
  assertions as gates + a pty capture fallback for live TUIs.
- **S4 Mobile programmatic gates**: `xcodebuild test` / Espresso in the allowlist —
  cost, timeouts, device serialization interactions with desktopLane.
- **S5 Vision gating policy**: today vision findings are structurally non-blocking
  (unconfirmed, never confirmed). If they should block: a flash vision-CONFIRMER
  distinct from the capturer (preserves "vision never self-confirms").
- **S6 Mobile-lane probe (gates Phase 0.5)**: from a workflow subagent shell, drive
  one local simulator/emulator end-to-end via mobilecli — devices, app install/launch,
  screenshot to file, webview query/eval (hybrid app), crash list — mirroring §2a's
  method. Confirms the CLI twin works in-run before V2.2's lane is rewired, and
  settles the interaction strategy per app type (webview selectors for hybrid,
  coordinates otherwise; element refs stay main-thread via mobile-mcp).

## 9. Open decisions for the owner (my recommendation in brackets)

- **D1 Engine shape**: DECIDED (owner, 2026-10-15) — V2.2 untouched (goal-oriented
  one-shot use) + V3 autonomous superset (all V2.2 machinery again + delivery, ONE
  launch per issue, no engine ever launches another). See §5.
- **D2 Vision blocking**: keep evidentiary-only [safe default] vs add vision-confirmer
  lane [recommended once S5 is answered].
- **D3 Shipflow roster**: 7 of 20 agents are never spawned (qa-writer, fixer,
  pr-merger, pr-reviewer, perf-engineer, copywriter, + scout is coordinator-side);
  Committer/Confirmer exist only in-script. Recommend: trim core roster to what runs,
  move the rest to an optional manual-dispatch pool; generate knowledge sheets.
- **D4 Queue surface**: GitHub-issues-as-queue only [recommended now], queue adapter
  interface deferred.
- **D5 Naming**: V2.2 keeps the saved name `zflow-engine`. V3 needs its own distinct
  saved-workflow name — recommend `shipflow-engine` (its lineage; the queue skill
  keeps the shipflow brand); `zflow-v3` as the alternative. CHANGELOG carries both
  under a v3.0.0 entry.
- **D6 Parallelism**: DECIDED (owner, 2026-10-15) — NO separate runs; ONE persistent,
  self-mutating V3 run with 2-3 concurrent issue lanes inside it (see §5).
- **D7 Dependencies**: DECIDED — label/body convention: `blocked-by-<n>` labels (or a
  Blockers line in the body); a lane refuses to claim until all blockers are closed.
- **D8 PRD approval gate**: DECIDED — GitHub Project column; the owner's drag into
  Approved is the only start signal.
- **D9 Issue filing**: DECIDED — the agent files PRD issues into GitHub (bodies,
  blocked-by labels, Project cards) at the end of the PRD flow; the engine only ever
  starts Approved, unblocked issues.
- **D10 Specialized sub-agents, pre-loaded skills**: DECIDED (owner, 2026-10-15) — no
  general sub-agents anywhere in V3. Every in-run role is a specialized persona whose
  rules are generated into its system prompt at build time from the single-source
  profile registry; zero boot-time skill loading (probe-verified, §2a).
  `.zcode/agents/*.md` definitions remain coordinator-side only (main-agent Agent
  tool); the workflow facade has no skill-loading field, so embedding is THE
  mechanism. V3 is the core product; fine-grained stack skills layer on top by
  contributing to and selecting registry entries.

## 10. Verification ladder (each phase ends here)

1. SaveWorkflow typecheck after every engine edit (C3).
2. zflow-smoke fixtures (site/dash/tray/mobile/stack/web/flash/api/mini) green on the
   v2.2 engine byte-identical to pre-work — proves the goal engine changed nothing.
3. V3 fixtures: dryRun PR path (no gh writes), merge-policy computation over synthetic
   findings (unit-style), then a multi-lane soak on a scratch repo — 4+ issues, 2-3
   lanes, at least one blocked-by chain and one device-using issue — run unattended
   to prove the scheduler, the device mutex, port isolation, and the watchdog (C6).
4. Drift check (C5 ritual): byte-parity + shadow scan across all scopes; this becomes
   the standing "install verification" section of ai/install.md.

## 11. Non-goals (for now)

- No implementation until Phase 0 is approved and executed.
- No new stack profiles beyond porting existing material until Plane B's seamGate lands
  (otherwise new stacks inherit the verifies-in-isolation hole).
- No z-super-rustflow unification.
- No multi-vcs/CI abstraction beyond the adapter boundary named in Plane C.
