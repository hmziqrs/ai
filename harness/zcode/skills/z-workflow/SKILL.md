---
name: z-workflow
description: >-
  Parallel-by-default workflow runner: every task is its own area running its
  own phase chain (implement → optional audit → optional test → …) with zero
  global phase barriers — an area moves to its next phase the moment its own
  work lands, never waiting for other areas. Optional verification phases run
  only when the user's brief names them (default 1 round; explicit N; until
  zero issues). No git worktrees. Use when the user asks for a workflow,
  parallel execution, or a multi-part task done fast.
---

# z-workflow — every area advances alone, in parallel

One job: split the user's task into independent areas, then run every area's
whole phase chain at the same time. Speed is the only goal; a phase of one
area must NEVER block a different area.

```
            implement    audit      test      smoke
auth        ████████►   done       done      ████►     ← auth is in smoke
posts       ████►                                        …while posts still implements
notifs      done        ████►      ████►                 ← notifs already past audit
```

Built entirely on the bundled `dynamic-workflows` skill — ZCode's own workflow
authoring contract. This skill adds no engine, no templates, no saved
workflows: every run is a fresh script written for that one task. The
skill's `references/proven-patterns.md` catalogues ten campaign-verified
workflow shapes (chains, model mixes, deterministic gates, and the
platform rules that bite) — the launcher plans from that catalogue.

## When to use it

- The user asks for a workflow / parallel execution, or hands you a multi-part
  implementation task and wants it fast.
- The task genuinely splits into 2+ independent areas (different files,
  features, or modules).
- Do NOT use it for a single small task — just do that inline, no workflow.
  Not for research questions (use Explore agents), and not when the user
  wants exhaustive verification — this skill is built for speed.

## The flow — three steps, that is all

1. **Dispatch one launcher.** Send the verbatim user brief to a single
   `workflow-launcher` agent (full access, Flash, HIGH thinking) along with
   the absolute workspace path. Do not explore, plan, or split anything
   yourself — the launcher does everything pre-workflow. Your context stays
   clean.
2. **Let it launch.** The launcher explores, bootstraps an uninitialized
   project if needed, plans every area, writes one fresh workflow script on
   the `dynamic-workflows` contract — with per-subagent model pins baked
   into the script — and submits it with CreateWorkflow. If the harness
   refuses the CreateWorkflow call from its context, it returns
   `{status:"ready", scriptPath, areas}` — then you load the
   `dynamic-workflows` skill and submit `CreateWorkflow` with
   `path: scriptPath` yourself, script unmodified; its model pins travel
   inside the script. Never edit or "improve" its script.
3. **Relay the result.** Do not poll the run. The completion notification
   arrives on its own; report the conclusion and per-area outcomes honestly,
   including any area that failed or never converged.

## The contract (hard rules for every run)

1. **Parallel by default — no global phase barriers.** Every area runs as its
   own chain inside one fan-out (`Promise.all(areas.map(async area => …))`);
   the area's phases are chained inside its own callback. The ONLY joins are
   what genuinely needs every area: the final report, and an optional final
   whole-tree smoke/full-suite gate. Nothing else waits for anything.
2. **All planning happens pre-workflow.** The launcher predetermines every
   area (files, approach, conventions) so the workflow executes without
   decisions. Areas start directly at implement; there is no plan phase to
   wait behind.
3. **Optional phases are opt-in, straight from the brief.** Audit, unit
   tests, native/device testing, vision, browser checks, smoke — each runs
   ONLY if the user's original prompt mentions it. Unmentioned means absent:
   the run is implement-only. Rounds for every optional phase: **1 by
   default**; the explicit number when the brief says 2, 3, 4…; "until zero
   issues" when the brief says so (loop until clean, bounded by a generous
   cap that can be amended, reported honestly if it never converged).
   Phases attach **per area, not globally**: vision and browser phases apply
   only to areas that produce a visible UI (never a backend or library
   area); native/device testing only to areas targeting a device surface.
   An area where a phase does not apply simply has a shorter chain —
   nothing skips, nothing waits. Testing phases use the matching capture
   tooling, loaded by the testing subagent itself: `agent-browser` for web
   flows (a headless-Chrome `world.run` screenshot when a static shot
   suffices), `open-computer-use` (ocu) for desktop surfaces, `mobilecli`
   for iOS/Android devices, `tui-use` to drive terminal UIs — with
   personas from the matching specialists (`z-qa-evaluator` for
   browser/vision judgment, `z-native-device-verifier` for device work).
4. **Per-area checks stay scoped to that area.** A phase checks only its own
   area's files and module targets (its own tests, its own type/lint scope).
   Anything that needs the whole tree — full suite, integrated build, smoke —
   runs ONCE at the final join, never per area. Shared physical resources —
   one device, one TUI session — serialize through a single device-operator
   subagent (its ask queue is FIFO); an area waits for the device itself,
   never for another area's phase.
5. **Small areas, disjoint files.** Each area is one concrete task finished
   in one sitting. No two areas write the same file; a shared file belongs to
   exactly one area, which also makes every dependent change to it.
6. **No git machinery.** No worktrees, no branches, no commits, no pushes.
   Areas edit the current checkout directly; the deliverable is the changed
   files.
7. **Personas and models — per-subagent pins, mixed in one run.** Every
   agent in the script carries an explicit model pin via the platform's
   per-subagent model feature (`const MODELS = { pro: model("account:zai-individual-coding-plan/GLM-5.3$high"), flash: model("account:zai-individual-coding-plan/GLM-5.3-Flash$high") }`,
   then `agent(name, { model: MODELS.… })`). The default tier is flash; an
   area runs on the main-tier GLM-5.3 only when the user explicitly asks.
   Vision is the hard exception: only GLM-5.3-Flash supports vision, so
   capture interpreters are ALWAYS pinned flash (HIGH), never the
   main-tier model — this is what lets one workflow run a GLM-5.3 area
   and flash vision rounds as sibling phases of the same run. Only if a
   host genuinely rejects the pins at compile may the run fall back
   (run-wide `subagent_model` or the session model), with the deviation
   disclosed in the run's notes — never fake a pin. Each area's
   implementer and checkers carry a niche persona distilled from the
   matching `z-*` specialist when one exists (the project's
   `.zcode/agents/` first), so niche work gets specialist judgment instead
   of a generic prompt.
8. **A live board, not a wall of logs.** The run publishes an areas board
   (columns per phase: implementing, auditing, testing, done, failed) and
   reports each area's transition as it happens — the pipelining is visible
   while it runs.
9. **One area's failure costs one area.** Per-area errors are caught and
   reported; the run keeps the other areas' work.
10. **Fresh script per task.** Never SaveWorkflow a script, never reuse a
    past script, never build a standing engine.
11. **Honest, short report.** What each area produced, what failed, what
    never converged — a few sentences. No ceremony.
