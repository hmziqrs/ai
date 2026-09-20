---
name: z-gpui-workflow
description: >-
  State-file-driven, fine-grained orchestration loop for GPUI (gpui-kit) Rust
  desktop work. A thin main thread sequences sub-agents, runs mechanical
  gates, and alone operates the main-thread-only computer-use surface to
  launch the app and capture screenshots; router, implementers, committer,
  judge, and decider do all real work from a persistent STATE.md. Image
  interpretation happens only in flash sub-agents reading images natively
  (built-in analyze-image banned); has-UI areas get per-area visual
  checkpoints plus one run-level pass. Trigger phrases: gpui workflow, gpui
  orchestration, gpui sub-agents, gpui iterate-until-clean, fine-grained
  GPUI loop.
---

# z-gpui-workflow

**Hard rule — the main thread is a thin sequencer and the sole pair of
hands on the desktop.** It spawns, sequences, runs gates, captures visual
evidence through native computer-use, and reports. It holds as little as
possible: the state file path, the latest verdict line, the next action.
Context degrades reasoning — an orchestrator that reads diffs, gate dumps,
or screenshots becomes a worse judge of everything downstream.

| Main thread DOES | Main thread NEVER |
|---|---|
| Read the HEADER plus compact operational sections — routing map, gate-verdict lines, commit shas (HEADER via `sed -n '1,/^# POLICY/p' STATE.md`, never a whole-file read) | Read raw evidence: diffs, full gate output, screenshots, or the detail of judge / vision / implementer sections |
| Operate native computer-use — launch/activate the app, drive flows via app-state computer-use tools, capture rasters to `evidence/` through the node-kernel cell | Interpret any image, or call the built-in analyze-image MCP tool — vision judgment belongs to flash sub-agents |
| Spawn/resume sub-agents, each seeded with the state file path | Edit/create/delete any project source, config, test, or doc file |
| Run mechanical gates via Bash — exit code + `tail -20`, nothing more | Run any git mutation — the committer agent owns them |
| Append one-line gate verdicts to the state BODY (shell `>>`, never a full-file read) | Route areas, judge findings, or decide continue/stop |
| Write the final report from the decider's header summary | Debug inside implementation details |

The distinction that makes this work: **operational metadata is compact and
safe to read; raw evidence is what bloats you.** Routing map, gate-verdict
lines, and commit shas are the loop's control data — read them freely.
Diffs, gate logs, screenshots, and finding detail are evidence — those
belong to sub-agents.

The trap is immediacy: after a red gate it is always faster to read the
diff and change one line yourself. Don't. Note the failing command, spawn
the fixer. Route it, don't read it.

Use this skill for real GPUI work only. Trivial one-file edits are cheaper
done directly — without this skill loaded, no rule binds you. These rules
bind only runs started under this skill: its siblings z-workflow (mixed
tiers, general-purpose), z-proflow (all-pro), z-flashflow (all-flash), and
z-liteflow (small tasks) run under their own rules — never cross-apply.
But once a z-gpui-workflow run starts, the boundary holds until the final
report.

## The two vision laws (non-negotiable)

1. **Native computer-use only, main thread only.** All desktop
   interaction runs in the main thread through the `computer-use`
   plugin: direct MCP tools where the session exposes them, and the
   computer-use node-kernel cell (`mcp__node_repl__js`) for everything
   else — always including raster capture. Plugin versions differ in
   what they expose as direct MCP tools (0.5.x has many; 0.6.x exposes
   execution only through the shared node kernel), so the kernel cell is
   the version-proof path. Sub-agents have no computer-use access —
   never route it there — and scripted substitutes (osascript,
   screencapture) are banned: native plugin or nothing. If the Phase 0
   kernel-cell check fails, set the HEADER's vision field to "degraded —
   native capture unavailable" and say so in the final report; never
   invent a substitute.
2. **Flash eyes only.** Image interpretation happens exclusively in a
   `general-flash` sub-agent using its native image reading (the Read tool
   on image files). The built-in analyze-image MCP tool is banned for
   every actor in this flow — main thread and sub-agents alike. A
   `general-pro` agent (judge, implementer, decider) never reads images
   itself; sub-agents in this harness cannot spawn sub-agents, so when a
   pro agent needs eyes it ends its pass with a NEEDS-PROBE line
   (`NEEDS-PROBE: <image path> — <question>`), the MAIN THREAD spawns
   the flash probe, the probe appends a `vision-probe` section to
   STATE.md, and the requesting agent (resumed via SendMessage, or its
   successor next round) reads that section.

## The state file

`.z-gpui-workflow/` (STATE.md + `evidence/`), gitignored — the committer
establishes the ignore entry on round 1. It is the only memory in the
system; the main thread's conversation deliberately carries almost nothing.

```markdown
# HEADER  (main thread writes it once at init; only the decider updates it
#          after; read it with: sed -n '1,/^# POLICY/p' STATE.md)
phase: <phase name>
verdict: <one line while looping; on stop: the run summary, see Phase 7>
next: <branch at the last decider checkpoint — "spawn implementer area 2" |
      "spawn fixer area design/settings-pane" | "final report">
vision: <ok | degraded — native capture unavailable>

# POLICY  (written at init, never edited; the decider evaluates IN ORDER)
1. Two consecutive rounds with no meaningful progress — open findings or
   failing gates not shrinking → stop; report honestly what passes, what
   fails, and a diagnosis.
2. Every routing-map area complete + all gates green + zero open findings
   (code and design) → stop, report.
3. Findings strictly shrinking → continue. There is no fixed round cap.
Never claim clean while a gate is red. Never claim a screen verified that
was not shot and audited this run.

# TASK  (written at init by the main thread; the user's task, verbatim)
<task spec>

# BODY  (append-only; one section per actor per round; the main thread
#        appends only one-line gate verdicts and the vision-capture log)
## router — init
<routing map, one row per area: kind, paths, excluded paths, skills
(absolute SKILL.md paths), gate commands (non-mutating only), complexity
tag (straightforward | complex), depends-on, has-UI>
<project rules extracted from AGENTS.md / CLAUDE.md / CONTRIBUTING.md,
 plus any gpui-kit version / theme / design-token constraints>
## implementer — <area> — round <n>   (fixers reuse this section type)
<changed paths, self-gate results, interface notes — entity APIs, pub
exports, component props, action names that dependent areas consume —
punted items>
## gates — round <n>
<one line per command: pass/fail + last error line if fail>
## committer — round <n>
<sha, staged paths, message>
## vision-capture — <area | run> — round <n>   (main thread)
<app launch command + pid, screens captured, evidence file paths, app
quit status>
## vision-audit — <area | run> — round <n>   (flash auditor)
<checklist used + pass/fail per item + measured differences + evidence
paths>
## vision-probe — <requester> — round <n>   (flash, main-thread-spawned)
<image path + question + ≤5-line findings>
## judge — <area | vision> — round <n>
<findings: severity, file:line, what, why, fix-required | defer-to-user —
or "clean">
## decider — round <n>
<continue/stop per POLICY, with counts; compaction notes>
```

Rules:

- **Every writer appends its own section** at end-of-file via shell
  redirect (`cat >> .z-gpui-workflow/STATE.md <<'EOF' … EOF`), never by
  rewriting the file wholesale — sections may have been appended since it
  was last read. The main thread's gate-verdict and vision-capture lines
  follow the same mechanics. An agent's final message back is 1–3 lines:
  verdict + "appended".
- **Append-only for everyone except the decider**, which alone may compact.
  Compaction may collapse only *resolved* findings into summary lines, and
  must preserve verbatim: deferred findings (with file:line and reasons),
  punted items, all commit shas, evidence paths, the routing map, project
  rules, and the TASK section. Compact when the BODY has roughly doubled
  since the last compaction.
- **Only the decider updates the HEADER.** It is a checkpoint, not a live
  cursor: between decider checkpoints, this document's phase order drives
  sequencing; `next:` matters where the loop branches.
- Screenshots and evidence go to `.z-gpui-workflow/evidence/` with stable
  names (`<area|run>-r<n>-<screen>.png`), referenced by path, never inlined.

## Model routing

Principle: **Flash wherever the output is objectively checkable — gates,
git state, schema'd reports, image reading. GLM 5.3 wherever quality is
only checkable by judgment — architecture, state ownership, audit
verdicts.**

| Work | Model | Dispatch as | Why |
|---|---|---|---|
| Orchestration (spawn, sequence, gates) | Host model, main thread | — | Sequencing is all it does |
| Native computer-use (launch, drive, capture) | Main thread only | — | The MCP surface is main-thread-only by runtime policy |
| Router (repo survey → GPUI routing map) | GLM 5.3 Flash | `general-flash` | Table lookup + structured output; a misroute dies at the gates |
| Implementation — complex (entity graphs, async state, architecture) | GLM 5.3 | `general-pro` | Judgment-heavy generation |
| Implementation — straightforward (one component, bindings, tests) | GLM 5.3 Flash | `general-flash` | Gates + fix loop catch failures objectively |
| Mechanical gates (`cargo build/test/clippy/fmt --check`) | Direct Bash, no sub-agent | — | Objective truth, no model needed |
| Vision capture (build, launch, shoot) | Main thread (Bash + computer-use; node-kernel cell writes rasters to disk) | — | Native plugin only; mechanical, no interpretation |
| Vision audit (interpret screenshots, design compliance) | GLM 5.3 Flash | `general-flash` | Native image reading; measured-difference reporting |
| Judge (code audit + vision FAIL review) | GLM 5.3 | `general-pro` | Rule judgment needs depth; requests flash probes via the orchestrator |
| Committer (stage, message, commit) | GLM 5.3 Flash | `general-flash` | Verifiable via `git log` |
| Decider (continue/stop, compaction) | GLM 5.3 | `general-pro` | Honesty terminus; input is compact |

Dispatch by sub-agent type, never by prompt stamp — `general-flash` runs
glm-5.3-flash, `general-pro` runs glm-5.3. Where those types are
unavailable on this install, fall back to the built-in `general-purpose`
agent and stamp the model as the first prompt line — `Model: GLM 5.3` /
`Model: GLM 5.3 Flash` — noting in the final report that model assignment
was requested-but-unverified. Never report a model as "actually used" when
you could only request it.

## Skill injection

Every sub-agent prompt carries the absolute SKILL.md paths it must load
before working — the router records them per area. Skills are DYNAMIC:
match by capability against the session's available-skills list (it
differs per machine), never assume or hardcode. The GPUI-native menu:

| Area kind | Load before coding |
|---|---|
| state/entities (Entity/Context modeling, subscriptions, background tasks) | gpui-kit (its async reference is primary), rust-best-practices |
| render/views (render trees, components, custom elements) | gpui-kit, rust-best-practices |
| design/styling (layout, spacing, color, interaction states, copy) | gpui-kit-design-guides (normative — read the referenced design-guides.md in full), gpui-kit, rust-best-practices |
| actions/focus (actions, keybindings, focus, menus) | gpui-kit, rust-best-practices |
| app-wiring (application bootstrap, init, windows, assets, platform) | gpui-kit, rust-best-practices |
| tests (unit + UI integration) | gpui-kit (its test reference is primary for UI integration tests), rust-testing |

Rules: if a skill file references further files (gpui-kit's Coding Guides,
gpui-kit-design-guides' design-guides.md), the agent reads those too — the
skill page is the door, not the room. If a needed skill is missing from
the session, route the area without it and note the gap in STATE.md and
the final report instead of blocking.

## Commit discipline

Small commits, one logical unit each — one entity family, one component,
one screen. Never one mega-commit at the end: small commits are what make
an audit or design finding cheap to revert.

- **The committer agent owns ALL git mutations.** Implementers' contract
  is: edit files, append to STATE.md, report paths — never `git add`,
  never `git commit`. The committer executes discards
  (`git checkout -- <paths>`) on your order; you never run them yourself.
- **Round-1 housekeeping:** the committer's first action ensures
  `.z-gpui-workflow/` is gitignored (append to `.gitignore` if missing,
  include that change in the first commit).
- **Never `--no-verify`.** If a commit fails, the committer reports the
  failure verbatim and appends nothing — route it to a fix round.
- **Serialized by design.** Areas run one at a time, dependencies first;
  the committer runs only after an area's gates AND (for has-UI areas)
  its vision checkpoint pass, one area per commit.
- **Commit after gates and vision pass, not before.** Only green work is
  recorded; fix rounds commit separately (`fix: ...`).
- **Match repo style first**: check `git log --oneline -10`; empty log →
  conventional `feat:` / `fix:`. Explicit paths only — never `git add -A`.
- Never push unless asked.

## The shape of the flow

```
Init STATE.md + capability check (main thread)
                        │
                        ▼
   Router (general-flash): GPUI area map + rules + skills
                        │
                        ▼  (per area, routing-map order, dependencies first)
   ┌────────────────────────────────────────────────────────────────┐
   │  Implementer (general-pro | general-flash, skills loaded)      │
   │      │ self-runs gates                                         │
   │      ▼                                                         │
   │  Gates (main thread) ── fail ──────────────────────┐           │
   │      │ pass                                        │           │
   │      ▼                                             │   fix     │
   │  [has-UI areas only]                              │   rounds  │
   │  Vision checkpoint:                               │           │
   │    capture (main thread: cargo run + computer-use) │           │
   │    audit (general-flash reads images natively)     │           │
   │      │ pass                                       │           │
   │      ▼                                             │           │
   │  Committer (general-flash)                         │           │
   │      ▼                                             │           │
   │  Judge (general-pro): code audit ── findings ──────┴───────────┘
   │      │ clean                                                   │
   └──────┼─────────────────────────────────────────────────────────┘
          ▼ all areas clean
   Run-level vision pass (main thread shoots every screen once;
          flash audits whole-UI checklist) — skip only if no UI areas
          ▼
   Judge (general-pro): reviews vision FAIL evidence (NEEDS-PROBE →
          main-thread flash probes) + any commits not yet judged
          ▼
   Decider (general-pro): apply POLICY, write HEADER
          ├── continue ──► fix rounds (re-enter the cycle above)
          └── stop ──► Final report (main thread)
```

Why this shape:

- **Per-area vision for has-UI areas, run-level vision for the whole UI.**
  A has-UI area produces a visible slice — by the time it runs in
  dependency order (state → render → design → wiring → tests), its screen
  exists, so it gets shot and audited immediately; a state-only area never
  triggers a screenshot of a UI that isn't there. The final run-level pass
  catches cross-screen inconsistencies per-area checks cannot see.
- **Gate failures skip the judge and vision, not the exit conditions.** A
  red gate goes straight to a fix round; the stagnation exit is defined
  once in Phase 3 (two stagnant gate-fail rounds → decider; POLICY rule 1
  is the only exit from a red-gate loop).
- **`next:` matters at branch points.** Between checkpoints, phase order
  drives sequencing.

## Phase 0 — Init (main thread)

1. Write a fresh `.z-gpui-workflow/STATE.md`: TASK verbatim, POLICY block
   numbered exactly as templated, empty BODY, HEADER set to
   `phase: routing / next: spawn router`. Do NOT survey the repo — that
   is the router's job.
2. Capability check inside a kernel cell (`mcp__node_repl__js`,
   bootstrapped per the computer-use plugin's skill, then e.g.
   `list_apps`): works on every plugin version, unlike direct MCP tools.
   If it fails, set the HEADER's `vision:` field to `degraded — native
   capture unavailable` and skip every vision step for the run, saying so
   in the final report.
3. Write a concise in-chat progress plan with one item per phase; update
   it as rounds pass.

## Phase 1 — Router (GLM 5.3 Flash)

Spawn a `general-flash` agent with the state file path: survey the repo
(`Cargo.toml` — workspace or single crate; gpui-kit version; theme and
design-token files; existing component tree), extract project rules from
AGENTS.md / CLAUDE.md / CONTRIBUTING.md, and append the routing map. Slice
the task into areas by the GPUI-native menu — **fine-grained by decree**:
one entity family, one component, or one screen region per area; if a
slice would touch more than ~4 files or mix two kinds, split it.

One row per area: kind, paths, excluded paths, skills (verified against
the session's available-skills list, absolute paths), gate commands,
complexity tag (`straightforward` → general-flash | `complex` →
general-pro), depends-on, has-UI (design/styling and render areas with
visible output are `true`).

Three router hard rules: gate commands must be **non-mutating**
(`cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo build`,
`cargo test` — never `cargo fix`, never `--write` flags), must **run from
the right manifest directory** (workspace root vs member crate), and must
**actually exist in the repo's tooling** — a hallucinated gate fails
forever and poisons the loop.

## Phase 2 — Implementers (one area at a time)

Spawn one agent per area, in routing-map order (dependencies first) —
`general-flash` for straightforward areas, `general-pro` for complex
ones; the type carries the model — the templates carry no stamp line, so
on the built-in fallback path only, prepend `Model: GLM 5.3` /
`Model: GLM 5.3 Flash` yourself. Prompt:

```text
You are implementing the <area> area (kind: <kind>) of the task in
<repo path>.

FIRST, read /abs/path/.z-gpui-workflow/STATE.md — the TASK, POLICY,
routing map, and project-rules sections, plus the implementer sections of
any areas yours depends on (their interface notes carry your contract).
Load the skill files listed for your area BEFORE writing any code, and
follow their internal reference links (e.g. the design guides):
<absolute SKILL.md paths>.

Scope: touch only <allowed paths>. Never modify <excluded paths> or
anything outside your scope.
Done means: <gate commands> all pass — run them yourself before reporting.
Record interface notes (entity APIs, pub exports, component props, action
names) that dependent areas will consume.
Do NOT run any git write command. Do NOT read or judge images — if you
need visual confirmation, say so in your report; the orchestrator runs
the vision checkpoint.
Append your section to the STATE.md BODY.
Report back in 3 lines max.
```

Two contract rules are non-negotiable: the implementer runs the gates
itself before claiming done, and it appends its own section — never trust
a bare "succeeded".

## Phase 3 — Mechanical gates (main thread)

After each implementation and each fix round, run the gates of **every
area touched so far** from each area's manifest directory. Re-run
everything on fix rounds; fixes regress earlier passes.

Context discipline: redirect full output, keep only the exit code and
`tail -20`, append one verdict line per command to the BODY. Your run is
the objective one: if the implementer claimed green and your run is red,
red wins — append both facts. Record pre-existing red gates as baseline;
don't burn fix rounds on them. Failures go straight to a fix round — but
after two stagnant gate-fail rounds, spawn the decider.

## Phase 4 — Vision checkpoint (has-UI areas)

Runs per area whose routing-map `has-UI` is true, after its gates pass,
and once run-level at the end. Two actors, strict division:

**Capture — main thread, native only, rasters never enter your context:**

Before the first capture, load the `computer-use` plugin's skill and
follow its node-kernel bootstrap idiom (`scripts/computer-use-client.mjs`
imported via a `file://` URL). The kernel gives each cell a fresh
context, so EVERY cell — poll, drive, capture — repeats the bootstrap.
Each cell returns text only (a path, a status line); never an image.

1. Build and launch: `cargo run` (background, from the right manifest
   directory) — or launch the built binary. Poll for the window in a
   kernel cell (`list_windows` / `get_app_state`), BOUNDED at ≤60s. On
   timeout or startup panic: record a vision FAIL quoting the last
   stderr line, quit the app, route to a fix round — a launch failure is
   a finding, not a hang.
2. Drive to the area's screen in kernel cells via the app-state
   computer-use tools, accessibility tree first (element-targeted
   `perform_action`, `set_value`; raw clicks only when no element
   exists) — their text results are cheap; raster results are not.
   Direct MCP equivalents are fine where the session exposes them.
3. Capture each screen to
   `.z-gpui-workflow/evidence/<area|run>-r<n>-<screen>.png` in a kernel
   cell: call the SDK screenshot, write the PNG to the evidence path
   with `node:fs` inside the same cell, return only the path string —
   never emit the image. First shots are FULL-SCREEN; zoomed crops
   happen only on re-shoots, for regions the auditor's reply names
   (`zoom: <regions>` — verdict-line-class data you may read). The
   direct MCP `screenshot`/`zoom` tools return rasters inline (no path
   argument, no file) — calling them from the main thread is banned in
   this flow: it pollutes the orchestrator's context and creates no
   evidence file.
4. Quit the app. Append the `vision-capture` section (launch command,
   pid, evidence paths, quit status). You NEVER interpret the captures.

**Audit — general-flash, native image reading:**

```text
You are the vision auditor for <area> of the GPUI app in <repo path>.
Read these images natively with your Read tool — do NOT use any external
image-analysis tool: <evidence paths>.
Derive your checklist ONCE from the TASK section of
/abs/path/.z-gpui-workflow/STATE.md plus the design rules in <gpui-kit
design guides path>; list it in your section. Re-shot rounds must reuse
the identical checklist.
Judge each item pass/fail with MEASURED differences — px offsets, hex
color deltas, font-size deltas, missing/extra elements — never vague
impressions. Console/panic output during capture counts as fail.
Append your section to STATE.md; reply in 3 lines max — on any FAIL,
include a `zoom: <regions>` line for the re-shoot.
```

The auditor reports evidence; it does not get the final word — run-level
FAIL verdicts are reviewed by the run-level judge; per-area audit FAILs
route straight to a fix round (the area is uncommitted until green, so
there is nothing for a judge to audit yet).

## Phase 5 — Committer (GLM 5.3 Flash)

When an area's gates pass (and its vision checkpoint, for has-UI areas),
spawn the committer — a `general-flash` agent — with that area's explicit
paths. Round-1 housekeeping (gitignore) first, then: check
`git log --oneline -10` for style, stage explicit paths, commit one
logical unit, append sha + paths + message to the BODY.

## Phase 6 — Judge (GLM 5.3)

Two occasions, same contract: **per-area** (code audit in the per-area
cycle) and **run-level** (vision FAIL evidence + any commits not yet
judged). Spawn a fresh `general-pro` agent, read-only for product code —
its only write is appending to STATE.md. One agent, one pass. The judge
reviews vision FAIL evidence through the auditor's written findings; if
it must re-examine an image itself, it CANNOT — sub-agents cannot spawn
sub-agents in this harness, and the judge never reads images. Instead it
ends its pass with a NEEDS-PROBE line (`NEEDS-PROBE: <image path> —
<question>`); you spawn the flash probe yourself and resume the judge
(SendMessage) once the probe has appended its findings:

```text
Vision probe (main-thread-spawned, glm-5.3-flash, native image reading).
Read <image path> with the Read tool and answer ONLY: <question>. No
file edits. Append a `## vision-probe` section to STATE.md (path,
question, ≤5-line findings). Reply in 3 lines max.
```

The judge never calls the built-in analyze-image tool and never claims to
have seen an image it did not — unverified stays unverified. Judge
against the project-rules section plus the loaded skill guides:

```text
Read-only audit of <scope> in <repo path>, plus the vision-audit
sections and their evidence/ paths in STATE.md (omit if vision was
skipped/degraded). Judge against the project-rules section of
.z-gpui-workflow/STATE.md and the GPUI/rust skill guides it lists.
<scope> = the commits for this area since its last clean verdict — the
shas in the committer sections; on fix rounds the fix commit plus the
commit it patched.
Report ONLY: severity (blocker/major/nit), file:line, what is wrong, why
it matters given the rules. Mark each finding: fix-required or
defer-to-user. If nothing fails, say "clean". No praise, no summaries.
Append your section to STATE.md; reply in 3 lines max.
```

## Phase 7 — Decider (GLM 5.3)

Spawn the decider — a `general-pro` agent — after every run-level judge
verdict, after two stagnant gate-fail rounds (Phase 3's stagnation
rule), and per-area only when that area's judge reports findings. It
reads the whole state file, validates it (every spawned agent has a BODY
section; no judge "clean" contradicted by red gate-verdict lines; every
has-UI area has a capture and an audit section — or a recorded
degradation, or a launch-failure FAIL in its vision-capture section),
applies POLICY in order, writes the HEADER, and compacts per the
compaction contract.
`next:` names the next spawn or the final report; the main thread
executes whatever it says.

On stop, the decider writes the run summary into the HEADER — rounds
spent, gate status per category (mechanical / audit / vision), findings
fixed vs. deferred, key changed paths, evidence paths, items left for
the user's call. That summary is the entire input to the final report.
The decider's verdicts are the only judgment the main thread consumes.

## Fix rounds

Collect nothing yourself — open findings live in the judge's (or vision
auditor's) latest BODY section. Prefer resuming the original implementer
where the harness supports sub-agent resume; otherwise spawn a fresh
fixer with the FULL Phase 2 template — type dispatch per the area's
complexity tag, skill loading, scope fences, no-git, append, 3-line
reply — scope set to the affected area, instructing the fixer to read
the latest judge / vision-audit / vision-capture (launch failures)
section for that area in STATE.md and fix every fix-required finding
listed there (you never relay finding detail yourself).

After fixes the cycle re-runs in order: gates (main thread) → vision
re-shoot for affected has-UI areas (same checklist — the main thread
re-captures, a fresh flash audit re-judges) → `fix:` commit (committer)
→ judge re-audits the affected scope → decider checkpoint. A claimed fix
isn't done until its screens were re-shot and re-audited. Fix rounds
originating from the run-level pass re-run the run-level pass (all
screens re-shot, fresh flash audit) before the next decider checkpoint —
a fix that breaks a different screen must be caught cross-screen.

## Final report (main thread)

Read the HEADER only — on stop, the decider's verdict block is the run
summary. Expand it into the user-facing report. Add the one thing only
you know: which sub-agent type you dispatched per spawn and the model it
pins — and where you fell back to prompt stamps, say "unverified" rather
than guessing. State plainly if vision was degraded or skipped, and list
the evidence paths so the user can look at the screens themselves.
