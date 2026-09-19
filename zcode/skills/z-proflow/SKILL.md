---
name: z-proflow
description: >-
  State-file-driven ZCode orchestration loop — the depth-first variant:
  all-pro, no router, no vision. No router agent (one model tier means
  nothing to route — the main thread surveys once at init); every
  spawned sub-agent (implementers, committer, judge, decider) runs
  glm-5.3 via `general-pro` — main-tier reasoning for judgment-heavy
  implementation and audit verdicts, with gates, fresh auditors, and
  fix rounds as the mechanical backstop. No vision phase: the
  main-tier model has no image support — visual verification belongs
  to z-workflow's flash vision agent. Use when depth beats speed on
  multi-area work. Trigger phrases: pro workflow, max-depth
  orchestration, main-tier loop, depth-first iterate-until-clean.
---

# z-proflow

**Hard rule — the main thread is a thin sequencer.** It spawns, sequences,
runs gates, and reports. It holds as little as possible: the state file path,
the latest verdict line, the next action. Context degrades reasoning — an
orchestrator that reads diffs, gate dumps, and screenshots becomes a worse
judge of everything downstream.

| Main thread DOES | Main thread NEVER |
|---|---|
| Read the HEADER plus compact operational sections — routing map, gate-verdict lines, commit shas (HEADER via `sed -n '1,/^# POLICY/p' STATE.md`, never a whole-file read) | Read raw evidence: diffs, full gate output, screenshots, or the detail of judge / vision / implementer sections |
| Spawn/resume sub-agents, each seeded with the state file path | Edit/create/delete any project source, config, test, or doc file |
| Run mechanical gates via Bash — exit code + `tail -20`, nothing more | Run any git mutation — the committer agent owns them |
| Append one-line gate verdicts to the state BODY (shell `>>`, never a full-file read) | Judge findings or decide continue/stop |
| Write the final report from the decider's header summary | Debug inside implementation details |

The distinction that makes this work: **operational metadata is compact and
safe to read; raw evidence is what bloats you.** Routing map, gate-verdict
lines, and commit shas are the loop's control data — read them freely, they
are why the state file exists. Diffs, gate logs, screenshots, and finding
detail are evidence — those belong to sub-agents.

The trap is immediacy: after a red gate it is always faster to read the diff
and change one line yourself. Don't. Note the failing command, spawn the
fixer. The moment you read evidence or author code, your context fills with
detail a sequencer doesn't need — and by the audit phase you'd be judging
work you half-remember doing. Route it, don't read it.

Use this skill for real work only. Trivial one-file edits are cheaper done
directly — without this skill loaded, no rule binds you. These rules bind
only runs started under this skill: its siblings z-workflow (mixed
tiers, with vision), z-flashflow (all-flash, fast), and z-liteflow
(small single-domain tasks) run under their own rules — never
cross-apply. But once a z-proflow run starts, the boundary holds until
the final report.

## The state file

`.z-proflow/` (STATE.md + `evidence/`), gitignored — the committer
establishes the ignore entry on round 1. It is the only memory in the
system; the main thread's conversation deliberately carries almost nothing.

```markdown
# HEADER  (main thread writes it once at init; only the decider updates it
#          after; read it with: sed -n '1,/^# POLICY/p' STATE.md)
phase: <phase name>
verdict: <one line while looping; on stop: the run summary, see Phase 5>
next: <branch at the last decider checkpoint — "spawn implementer area 2" |
      "spawn fixer area backend" | "final report">

# POLICY  (written at init, never edited; the decider evaluates IN ORDER)
1. Two consecutive rounds with no meaningful progress — open findings or
   failing gates not shrinking → stop; report honestly what passes, what
   fails, and a diagnosis.
2. Every routing-map area complete + all gates green + zero open findings →
   stop, report.
3. Findings strictly shrinking → continue. There is no fixed round cap.
Never claim clean while a gate is red.

# TASK  (written at init by the main thread; the user's task, verbatim)
<task spec>

# BODY  (append-only; one section per actor per round; the main thread
#        appends only one-line gate verdicts)
## survey — init (main thread)
<routing map, one row per area: paths, excluded paths, skills (absolute),
gate commands (non-mutating only — no --fix/--write flags), depends-on>
<project rules extracted from AGENTS.md / CLAUDE.md / CONTRIBUTING.md>
## implementer — <area> — round <n>   (fixers reuse this section type)
<changed paths, self-gate results, interface notes — endpoints, schema,
exports that dependent areas consume — punted items>
## gates — round <n>
<one line per command: pass/fail + last error line if fail>
## committer — round <n>
<sha, staged paths, message>
## judge — <area> — round <n>
<findings: severity, file:line, what, why, fix-required | defer-to-user —
or "clean">
## decider — round <n>
<continue/stop per POLICY, with counts; compaction notes>
```

Rules:

- **Every sub-agent appends its own section** at end-of-file via shell
  redirect (`cat >> .z-proflow/STATE.md <<'EOF' … EOF`), never by rewriting
  the file wholesale — sections may have been appended since it was last
  read. The main thread's gate-verdict lines follow the same mechanics. An
  agent's final message back is 1–3 lines: verdict + "appended".
- **Append-only for everyone except the decider**, which alone may compact.
  Compaction may collapse only *resolved* findings into summary lines, and
  must preserve verbatim: deferred findings (with file:line and reasons),
  punted items, all commit shas, the routing map, project
  rules, and the TASK section. Compact when the BODY has roughly doubled
  since the last compaction.
- **Only the decider updates the HEADER.** It is a checkpoint, not a live
  cursor: between decider checkpoints, this document's phase order drives
  sequencing; `next:` matters where the loop branches.

## Model routing

Principle: **Pro everywhere, by design.** Every sub-agent runs glm-5.3
via `general-pro`; the main thread alone uses the host model, and only
to sequence. This is the depth-first flow — judgment-heavy
implementation and audit verdicts get main-tier reasoning, with gates,
fresh auditors, and fix rounds as the mechanical backstop. No vision
anywhere: the main-tier model has no image support. Visual verification
is a hand-off to z-workflow (see Hand-offs), never a mid-run model
swap.

| Work | Model | Dispatch as | Why |
|---|---|---|---|
| Orchestration (init survey, spawn, sequence, gates) | Host model, main thread | — | Survey output is compact control data; sequencing is all it does |
| State decider (continue/stop, compaction) | GLM 5.3 | `general-pro` | Honesty terminus with main-tier depth; input is compact |
| Implementation — complex (concurrency, architecture, subtle bugs) | GLM 5.3 | `general-pro` | Judgment-heavy generation — the reason this flow exists |
| Implementation — straightforward (CRUD, boilerplate, simple UI) | GLM 5.3 | `general-pro` | One tier everywhere; gates + fix loop are the backstop |
| Mechanical gates (`cargo test`, builds, linters) | Direct Bash, no sub-agent | — | Objective truth, no model needed |
| Judge (code audit + verdicts) | GLM 5.3 | `general-pro` | Rule judgment needs depth — main-tier audit verdicts |
| Committer (stage, message, commit) | GLM 5.3 | `general-pro` | Verifiable via `git log` |

Dispatch by sub-agent type, never by prompt stamp. `general-pro` pins
glm-5.3, so no role depends on inheriting the main thread's model.
Where the custom type is unavailable on this install (not defined, or
disabled in Settings → Subagents), fall back to the built-in
`general-purpose` (which inherits the host model) and stamp
`Model: GLM 5.3` as the first line of every prompt, noting in the
final report that model assignment was requested-but-unverified. Never
report a model as "actually used" when you could only request it.

## Commit discipline

Small commits, one logical unit each — a feature slice, a single fix. Never
one mega-commit at the end: small commits are what make an audit finding or
vision failure cheap to revert.

- **The committer agent owns ALL git mutations.** Implementers' contract
  is: edit files, append to STATE.md, report paths — never `git add`, never
  `git commit`. Uncommitted work keeps a bad round cheap to throw away —
  the committer executes the discard (`git checkout -- <paths>`) on your
  order; you never run it yourself.
- **Round-1 housekeeping:** the committer's first action ensures
  `.z-proflow/` is gitignored (append to `.gitignore` if missing, include
  that change in the first commit).
- **Never `--no-verify`.** If a commit fails (hook rejection, signing),
  the committer reports the failure verbatim and appends nothing — you
  route it to a fix round as a finding. The agent under the most pressure
  to show green must not be the one allowed to bypass hooks.
- **Serialized by design.** Areas run one at a time; the committer runs
  only after an area's gates pass, one area per commit.
- **Commit after gates pass, not before.** Failed rounds get fixed on top
  of the same working tree; only green work gets recorded.
- **Fix rounds commit separately** from the feature commit they amend
  behavior of (`fix: ...`), so history shows what the loop actually did.
- **Match repo style first**: the committer checks `git log --oneline -10`;
  if the log is empty (fresh repo), default to conventional `feat:` /
  `fix:` messages.
- **Explicit paths only** — never `git add -A`.
- Never push unless asked. Commits stay local by default.

## The shape of the flow

```
Init + survey (main thread): STATE.md + routing map + project rules
                        │
                        ▼  (per area, routing-map order, dependencies first)
   ┌────────────────────────────────────────────────────────────┐
   │  Implementer (general-pro) ◄────────────────────┐          │
   │      │ self-runs gates                          │          │
   │      ▼                                          │          │
   │  Gates (main thread) ── fail───────────────────►│          │
   │      │ pass                                     │          │
   │      ▼                                          │  fix     │
   │  Committer (general-pro)                        │  rounds  │
   │      ▼                                          │          │
   │  Judge (general-pro): code audit of             │          │
   │  this area's commits ── findings────────────────┴──────────┘
   │      │ clean
   └──────┼─────────────────────────────────────────────────────┘
          ▼ all areas clean
   Decider (general-pro): apply POLICY, write HEADER
          ├── continue ──► fix rounds (re-enter the cycle above)
          └── stop ──► Final report (main thread)
```

Why this shape:

- **Gate failures skip the judge, not the exit conditions.** A red gate
  goes straight to a fix round — but the main thread counts consecutive
  gate-fail rounds, and after two with no shrinking failures it spawns the
  decider anyway. POLICY rule 1 is the loop's only exit from a run that
  can't go green; no run may loop forever.
- **`next:` matters at branch points** — next area's implementer, a fixer,
  or the final report. Between checkpoints, phase order above drives
  sequencing.

## Phase 0 — Init + survey (main thread)

No router agent: one model tier means nothing to route, so the main
thread surveys once at init and writes the routing map itself. Survey
output is compact control data — manifests and rule files, not diffs or
gate logs — so the context discipline still holds.

1. Survey the repo (`Cargo.toml`, `package.json`, `pyproject.toml`,
   `pubspec.yaml`, app/packages dirs, svelte/react/mobile configs) and
   extract project rules from AGENTS.md / CLAUDE.md / CONTRIBUTING.md.
2. Write a fresh `.z-proflow/STATE.md`: the TASK section verbatim, the
   POLICY block numbered exactly as templated, the survey section
   holding the routing map and project rules, an empty BODY, HEADER set
   to `phase: implement / next: spawn implementer <area 1>`.
3. One routing-map row per area: paths, excluded paths, skills, gate
   commands, depends-on.
4. Two survey hard rules: gate commands must be **non-mutating** (no
   `--fix`/`--write` flags — formatting and fixes belong to
   implementers) and must **actually exist in the repo's tooling**
   (check package.json scripts, Makefile, cargo targets) — a
   hallucinated gate fails forever and poisons the loop.
5. Write a `TodoWrite` plan with one item per phase. Update it as rounds
   pass; on a long run it is the user's window into the work.

One tooling rule:

- **Skills** (language/framework best-practice and code-review — rust,
  axum, gpui, svelte, flutter, react, ...) are DYNAMIC: they differ per
  machine and session. Match them by capability against the session's
  available-skills list — never assume or hardcode them — and record
  the chosen skill's absolute SKILL.md path in the routing map. If
  nothing fits an area, route it without a skill and note the gap in
  STATE.md and the final report instead of blocking.

## Phase 1 — Implementers (one area at a time)

Spawn one agent per area, in routing-map order (dependencies first) —
always `general-pro`, straightforward and complex alike; the type
carries the model, the stamp line below is only the built-in fallback.
Prompt:

```text
Model: GLM 5.3

You are implementing the <area> area of the task in <repo path>.

FIRST, read /abs/path/.z-proflow/STATE.md — the TASK, POLICY, routing map,
and project-rules sections, plus the implementer sections of any areas
yours depends on (their interface notes carry your contract). Load the
skill files listed for your area before writing any code:
<absolute SKILL.md paths>.

Scope: touch only <allowed paths>. Never modify <excluded paths> or
anything outside your scope.
Done means: <gate commands> all pass — run them yourself before reporting.
Record interface notes (endpoints, schema, exports) that dependent areas
will consume.
Do NOT run any git write command. Append your section to the STATE.md BODY.
Report back in 3 lines max.
```

Two contract rules are non-negotiable: the implementer runs the gates
itself before claiming done, and it appends its own section — never trust a
bare "succeeded".

## Phase 2 — Mechanical gates (main thread)

After each implementation and each fix round, run the gates of **every area
touched so far** — an untouched area's gates say nothing about this round.
Re-run everything on fix rounds; fixes regress earlier passes.

Context discipline: redirect full output, keep only the exit code and
`tail -20`, append one verdict line per command to the BODY via shell
redirect. Never paste a full gate log into the conversation.

Your run is the objective one: if the implementer claimed green and your
run is red, red wins — append both facts. If a gate was red before this
workflow began, record it as a pre-existing baseline in the gates section;
don't burn fix rounds on it.

Failures go straight to a fix round, no audit needed — the fixer re-runs
the failing gates itself and reads the errors directly; you relay only
which commands failed. But count consecutive gate-fail rounds: after two
with no shrinking failures, spawn the decider (POLICY rule 1 — the exit).

## Phase 3 — Committer (GLM 5.3)

When an area's gates pass, spawn the committer — a `general-pro` agent —
with that area's explicit paths. Round-1 housekeeping
(gitignore) first, then: check `git log --oneline -10` for message style,
stage explicit paths, commit one logical unit, append sha + paths + message
to the BODY.

## Phase 4 — Judge (GLM 5.3)

One occasion, one contract: the **per-area** code audit spawned by the
per-area cycle. Spawn a fresh `general-pro` agent (glm-5.3 pinned),
read-only for product code — its only write is appending to STATE.md. One
agent, one pass; no triage layer, no split verdicts. The template's
`Model:` stamp is the built-in fallback only — omit it when dispatching
`general-pro`. Prompt core:

```text
Model: GLM 5.3

Read-only audit of <scope> in <repo path>.
Judge against the project-rules section of .z-proflow/STATE.md (plus any
rule file paths it lists).
<scope> = the commits for this area since its last clean verdict — the
shas in the committer sections; on round 1 the single feature commit; on
fix rounds the fix commit plus the commit it patched.
Report ONLY: severity (blocker/major/nit), file:line, what is wrong, why
it matters given the rules. Mark each finding: fix-required or
defer-to-user. If nothing fails, say "clean". No praise, no summaries of
what the code does right. Append your section to STATE.md; reply in 3
lines max.
```

## Phase 5 — Decider (GLM 5.3)

Spawn the decider — a `general-pro` agent (glm-5.3 pinned) —
after every judge verdict, and after two stagnant gate-fail rounds. It reads the
whole state file, validates it, applies POLICY in order, writes the
HEADER (phase / verdict / next-action), and
compacts per the compaction contract. Validation matters: pass the decider
the list of agents you spawned this round, and it checks each has a BODY
section — a missing section, or a judge "clean" contradicted by red
gate-verdict lines, is flagged in its verdict. The state file is trusted
input, not gospel; its writers are models under pressure.

`next:` names the next spawn — the next area's implementer, or a fixer —
or the final report. The main thread executes whatever `next:` says.

On stop, the decider's verdict stops being one line: it writes the run
summary into the HEADER — rounds spent, gate status per category
(mechanical / audit), findings fixed vs. deferred (detail
preserved by the compaction invariants), key changed paths, and items left for the user's call. That summary is the entire
input to the final report.

The decider is the loop's honesty checkpoint. Its verdicts are the only
judgment the main thread ever consumes.

## Fix rounds

Collect nothing yourself — open findings live in the judge's latest BODY
section. Prefer resuming the original implementer where the harness
supports sub-agent resume — it still knows its own code; otherwise
spawn a fresh fixer with the FULL Phase 1 template — general-pro
dispatch, skill loading, scope fences, no-git, append, 3-line reply —
with scope set to the affected area and the open findings attached.

After fixes the full cycle re-runs in order: gates (main thread) → `fix:`
commit (committer) → judge re-audits the affected scope → decider
checkpoint.

## Hand-offs

z-proflow has no vision — the main-tier model cannot read images. Route
visual/UI verification to z-workflow, whose vision agent is flash-tier
with image support; route speed/cost-dominated work whose failures are
objectively checkable to z-flashflow. If a run stalls — two fix rounds
with no shrinking findings on the same issue — stop cleanly: the decider
writes the run summary, report honestly what is done and what is open.
Half-done work stays on disk, listed in the report; revert only on
request.

## Final report (main thread)

Read the HEADER only — on stop, the decider's verdict block is the run
summary. Expand it into the user-facing report. Add the one thing only
you know: which sub-agent type you dispatched per spawn and the model it
pins — and where you fell back to prompt stamps, say "unverified" rather
than guessing.
