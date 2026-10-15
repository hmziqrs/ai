# zflow engine SPEC — the one-launch parallel chain (v2.2)

Auditors: any artifact that contradicts Section 1 (verified platform facts) or
Section 3 (the engine contract as implemented) is a **blocker**. The engine
source beside this file is ground truth; this document must never describe
machinery the engine does not have.

## 1. Verified platform facts (ZCode v3.15.1+ multi-model harness)

1. **Per-subagent model pins in one run.** `model(id)` declares a ModelRef and
   `AgentPersona.model` pins it per subagent; one workflow run mixes tiers
   natively. The engine pins judgment roles per `modelProfile` and capture /
   vision-audit always on flash — no multi-launch tiering, no escalation needed
   for image reads. The launcher passes NO `subagent_model` and no
   `max_concurrency` (unless the user asks for a width limit).
2. **No nesting.** Workflow subagents cannot spawn workflows or Agent-tool
   subagents. One coordinator launch per chain; `AmendWorkflow` revises a run
   reusing finished work; `ResumeWorkflowRun` continues a stopped one. Never
   relaunch to fix.
3. **Escalation.** A blocked subagent escalates; only it parks; the main agent
   resolves (it may dispatch Agent-tool subagents of any tier). Cap: 3
   escalations per ask.
4. **Vision tiers.** GLM-5.3 (pro) is image-blind: Read on a PNG uploads it and
   returns a URL, no visual content. GLM-5.3-Flash reads PNGs natively via Read
   and can pixel-sample (python3/PIL). Judges are therefore image-blind by
   design and read text evidence (AX snapshots, logs) as files; pixels belong
   to the flash capture/vision lane.
5. **agent-browser CLI** (`~/.bun/bin/agent-browser`): headless browser
   automation usable by subagents via Bash. `--session <name>` gives isolated
   parallel browsers; `snapshot -i --json`; `screenshot <path>`; `close`.
6. **ocu / open-computer-use CLI**: desktop automation, macOS Accessibility
   granted. `ocu snapshot <app>` — AX trees come back as text (any tier can
   audit them); pixels come back as base64 PNG in JSON (decode to a file).
7. **world.run**: the command name must be a compile-time string literal
   (approved at confirmation); runtime values go in the args array. Nonzero
   exit code is a VALUE the loop branches on, not an exception.
8. **Official computer-use / browser-use plugins are main-thread-only** —
   their transport is a session-bound host bridge. In-run capture uses the CLI
   twins (agent-browser, ocu, simctl, adb, emulator) via subagent Bash.
9. **Named agents**: the same named agent across asks keeps context (the
   shared Committer is long-lived). The engine instead spawns FRESH named
   agents per round (`implementer-<area>-r<N>`, `judge-<area>-r<N>`,
   per-finding confirmers) — fresh eyes every round, by design.
10. **In-run mechanics**: phases are required and user-facing; typed results
    carry JSDoc; `report()` items survive failed runs; `artifact.*` is the
    user deliverable channel; `Promise.all` is a join — chain per-item inside
    fan-outs, join once.

## 2. Architecture — one launch, everything in-run

The main agent running a z-*flow skill is a **thin coordinator**: it surveys
the repo, classifies work into `areas[]`, records `baseSha`/`repoRoot`, and
makes ONE `CreateWorkflow saved: zflow-engine` call with `mode: "chain"`.
Every area is its own state machine — plan → implement → vision → judge,
looping per area until clean, stagnation, or the round cap — flowing through
channels (`implement`, `vision`, `judge`) between stage futures with a counted
close: areas sit at different stages and rounds at once, and the run ends
exactly when every area reaches a terminal state.

Topology is decided by `contention`:

- **terminal** — parallel in the shared checkout; verifiable by commands; no
  vision stage.
- **web** — its own git worktree (`.zflow/worktrees/<area>`, branch
  `zflow/<area>`) with a deterministic port (`4100 + index` among sorted web
  areas) and an isolated `agent-browser --session zflow-<area>`; a dev-server
  URL named in the task overrides the port. Web captures run concurrently.
- **desktop / mobile** — implement in worktrees like web, but the whole
  device phase (build, launch, capture, teardown) serializes through a
  single-worker device lane: one screen, one AX tree, one simulator/emulator
  at a time (ocu for desktop; xcodebuild/simctl, gradle/adb, or flutter for
  mobile).

Clean areas' worktree branches merge back along the `dependsOn` DAG; a clean
merge removes the worktree and branch again. A failed dependency blocks its
dependents honestly (never runs them blind).

## 3. Engine contract — `zflow-engine.dwf.ts`

ONE saved workflow, launched once per chain. Declared args (host-validated):

- `mode`: must be `"chain"` — anything else refuses to start.
- `task`: string, verbatim user task; embedded in every subagent ask.
- `areas`: AreaSpec array — `name`, `contention` (terminal | web | desktop |
  mobile), `paths[]`, `excludedPaths[]`, `skills[]` (absolute SKILL.md
  paths), `gates: {tool, args[]}[]`, `complexity` (straightforward |
  complex), `dependsOn: string[]`, optional `budget: {maxLines, maxFiles}`.
  Legacy `hasUI`/`lane` fields are ignored with a recorded warning — classify
  with `contention`. Duplicate names, unknown deps, and dependency cycles are
  dropped/broken with recorded problems so fan-out can never deadlock.
- `modelProfile`: `balanced` (default — pro judgment roles, flash capture and
  vision audit) or `flash` (every role on flash; judgment compensated
  mechanically by gates, confirmers, and the in-run POLICY).
- `commit`: default true. False skips every commit and every worktree merge —
  work stays on disk and worktree dependents are blocked honestly.
- `maxRounds`: default unbounded — every area loops until clean, stagnation
  (two rounds without shrinking findings), or this cap.
- `maxLines` / `maxFiles`: run-level size budget, default 400 / 10;
  per-area `budget` overrides.
- `agentsMd`: default "AGENTS.md", empty string disables. Read-first line
  injected into every spawned subagent's ask; missing/empty is recorded in
  notCovered, never silent.
- `baseSha`: the chain's starting sha; shared-checkout judge size evidence is
  measured against it (worktree areas measure against their branch point).
- `repoRoot`: absolute root — `world.run`'s cwd is NOT the workspace root for
  saved runs; pass `git rev-parse --show-toplevel` from prep.

Hard rules (all enforced in script code, never model judgment):

- **Anchored commands.** Every command anchors to repoRoot or the area
  worktree: git/make/go/pnpm via `-C`, npm via `--prefix`, yarn/bun via
  `--cwd`, cargo honors a gate's own `--manifest-path` (absolutized) else
  appends the root manifest, python3/pytest via absolute first path, `npx`
  has no safe anchored form and refuses honestly.
- **Gate allowlist**: literal-command switch for `npm`, `pnpm`, `yarn`,
  `bun`, `cargo`, `make`, `go`, `python3`, `pytest`, `git`; anything else is
  skipped with a recorded refusal. Gates are non-mutating (no `--fix` /
  `--write`); 900s timeout; the SCRIPT runs them (after implement, and again
  at judge) — implementers never run gates.
- **Git discipline**: commit messages drafted by the one shared named
  "Committer" agent; mutations executed by the script (`git add`/`commit`
  with explicit paths), serialized through a single git queue; never
  `--no-verify`; never push. One commit per green round; fix rounds' subjects
  start `fix:`.
- **Size budget enforced by the script**: after each judge round the script
  measures the area's delta itself (`git diff --numstat` vs the area's base);
  over budget is a verified HIGH finding — "split the area, never commit
  big" — exactly like a red gate.
- **Vision lanes by contention** (capture + audit both flash): web →
  agent-browser session per area; desktop → build/launch from the worktree +
  ocu; mobile → project's own build command + ONE device at a time
  (simctl/adb/emulator). Evidence lands under `.zflow/evidence/`; the script
  verifies files with its own glob, never trusting claimed paths. Capture
  agents never fix; a missing tool or impossible lane is reported plainly,
  never faked.
- **Vision never self-confirms.** Vision findings are ALWAYS `unconfirmed`;
  they never enter the judge's ask. Only findings the image-blind judge
  reproduces and a fresh confirmer independently verifies become fix targets.
  Unconfirmed vision findings on a clean area are deferred to the user in the
  report.
- **Fresh judges, per-finding confirmers**: `judge-<area>-r<N>` has never seen
  the work; every judge finding gets its own confirmer that must reproduce it
  from evidence alone. Red gates become verified HIGH findings without a
  judge in the loop.
- **POLICY as loop conditions**: zero open findings + gates green → settle
  clean and merge along the DAG; findings strictly shrinking → next round
  with a fresh implementer carrying the open findings; two non-shrinking
  rounds → stagnation stop; `maxRounds` cap → honest stop. Half-done work
  stays on disk and is listed, never claimed clean.
- **Strict-safe code**: guard `.find()`/optional results; no `Date.now`,
  `Math.random`, `process`, `fetch`, `fs` imports; phase names user-facing;
  subagent names human-readable and unique per run. Report cleanliness counts
  settle results, never standing findings alone.
- **Outputs**: live status-board artifact; primary markdown report artifact
  (per-area terminal states, rounds, commits, gates, evidence, standing
  findings, deferred vision findings, recent git log; implementer notes
  surfaced); typed WorkflowReport return `{conclusion, findings, verified,
  notCovered}`.

## 4. Per-skill map — thin coordinator sheets

Six skills are thin coordinators over the ONE engine — no orchestration code,
just slicing recipe, `modelProfile`, gates, and per-area skill routing; all
launch `CreateWorkflow saved: zflow-engine` with `mode: "chain"`:

- **z-workflow**: the general entry point — full contention taxonomy,
  balanced profile, role model, POLICY, fallback lanes.
- **z-proflow**: depth-first — balanced profile (pro judgment, flash only for
  pixel capture/audit); ocu AX-tree structural audits ride judge evidence.
- **z-flashflow**: all-flash (`modelProfile=flash`); hands off to z-proflow
  when a complex area stalls.
- **z-liteflow**: one area, `modelProfile=flash`, `commit=false` — the
  coordinator commits by hand at hand-off.
- **z-gpui-workflow**: GPUI slicing recipe (entity family / component /
  screen region per area); design areas are desktop contention (ocu lane).
- **z-tauri-workflow**: Tauri v2 slicing recipe — `src-tauri/` core as
  terminal/desktop contention, frontend as web contention with the devUrl
  named in the task; the lane caveat: a web-lane audit cannot see the
  webview, native chrome, tray, or IPC (`invoke` cannot run in a plain
  browser) — the report marks those not-covered.
- **z-super-rustflow** is NOT engine-driven: it composes its own inline
  main-tier-only runs (no vision, no flash) over the rust-* family; node
  modes are not part of this engine.

Cross-flow hand-offs = finish the run, relaunch as the sibling flow (no
nesting). Every launch carries `agentsMd` and `baseSha`; the AGENTS.md
injection rule and the numbered commit budget (~400 lines / ~10 files, one
commit per green round) hold everywhere.

## 5. Files, install, and no-drift discipline

- Source of record: this repo — `harness/zcode/workflows/zflow-engine.dwf.ts`
  (beside this SPEC), skills in `harness/zcode/skills/<name>/SKILL.md`,
  agents in `harness/zcode/agents/`.
- Install (per `install.md`): skills copy to `~/.zcode/skills/` (never
  `~/.agents/`), agents copy to `~/.zcode/agents/` (never symlink), the
  engine saves to `~/.zcode/workflows/` via SaveWorkflow. The installed
  engine and this source copy must stay **byte-identical** — verify with
  `diff -q` after every change; any difference is drift and a blocker.
- History, explicitly not live: `zflow-port/` (the Sep-21 v1 multi-run port),
  `.zcode/workflow-probes/` (platform probes and v2.2 development snapshots),
  `~/.zcode/archive/` (pre-port skill backups). They describe past platform
  facts and must never be installed from.
- Engine edits: update the engine first or together with the skills and this
  SPEC (a skill describing machinery the engine does not have is a lie),
  typecheck via SaveWorkflow after every edit, and re-sync the installed
  copy.
