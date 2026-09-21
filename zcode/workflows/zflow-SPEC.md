# zflow-port SPEC — porting the five z-*flow skills onto multi-workflow chains

Auditors: any artifact that contradicts Section 1 (verified platform facts) is a **blocker**.
Drafters: Section 1 is ground truth; Section 3 is the engine contract; Section 4 is the per-skill map.

## 1. Verified platform facts (every item tested live on this machine, 2026-09-21)

1. **One workflow run = ONE model.** `subagent_model` is run-wide. Per-agent model fields do
   not exist — `agent(name, { system, model })` is a compile error: `'model' does not exist
   in type 'AgentPersona'`. Mixed tiers per RUN are impossible natively.
2. **No nesting.** Workflow subagents cannot spawn workflows or Agent-tool subagents.
   Chaining goes through the main agent BETWEEN runs; mid-run cross-tier needs go through
   the escalation bridge.
3. **Escalation bridge.** A blocked subagent escalates; only it parks; the main agent
   resolves (it may dispatch Agent-tool subagents of any tier — `general-pro`,
   `general-flash`). Cap: **3 escalations per ask**. Verified: a GLM-5.3 run obtained a
   flash image read through one escalation round trip.
4. **Vision tiers.** GLM-5.3 (pro) is image-blind: Read on a PNG uploads it to a CDN and
   returns a URL, no visual content. GLM-5.3-Flash reads PNGs natively via Read, and can
   pixel-sample (python3/PIL) for measured hex deltas. Verified with an unguessable token.
5. **agent-browser CLI 0.8.0** (`~/.bun/bin/agent-browser`): headless browser automation,
   plain CLI — usable by workflow subagents via Bash. `--session <name>` gives isolated
   parallel browsers; `snapshot -i --json`; `screenshot <path>`; `close`. Verified
   end-to-end (open → screenshot → close).
6. **ocu / open-computer-use 0.3.5** (`~/.nvm/.../bin/ocu`): desktop automation CLI,
   macOS Accessibility permissions already granted. `ocu snapshot <app>` and
   `ocu call get_app_state --args '{"app":"...","include_screenshot":true}'` — AX trees
   come back as **text** (any tier can audit them); pixels come back as **base64 PNG in
   JSON** (decode with jq + base64 -d to a file). No standalone `screenshot` tool.
   Batched sequences via `ocu call --calls '[...]'`.
7. **world.run**: the command name must be a compile-time string literal (the user approves
   the command set at confirmation); runtime values go in the args array. Nonzero exit
   code is a VALUE the loop branches on, not an exception. Timeout default 300s,
   override per call.
8. **Official computer-use / browser-use plugins are NOT usable inside workflows** —
   their transport is a session-bound host bridge (`globals[Symbol.for(...)]`). They stay
   the main agent's interactive lane only.
9. **Chain launches**: `CreateWorkflow` per node (saved workflows take validated args);
   completion notification carries the typed return; `AmendWorkflow` re-runs reusing
   finished work; `ResumeWorkflowRun` continues stopped runs.
10. **Named-agent reuse**: same named agent across asks keeps context — fix rounds reuse
    the original implementer's agent (long-lived, cheap round 5).
11. **In-run mechanics**: phases are required and user-facing; typed results carry JSDoc;
    `report()` items survive failed runs; `artifact.*` is the user deliverable channel;
    `Promise.all` is a join — chain per-item inside fan-outs, join once.

## 2. Target architecture (what the skills become)

Main agent running the skill = **chain coordinator** (thin sequencer, holds only compact
control data between runs). Tier-pure workflow runs are chain nodes:

```
[zflow-engine mode=implement tier=X]  → findings, paths, evidence
[zflow-engine mode=vision   tier=flash] → vision verdicts, screenshot paths   (web: agent-browser; desktop: ocu)
[zflow-engine mode=judge    tier=pro]  → confirmed findings, fixes needed
   ↑ loop per POLICY (findings shrinking, round cap), enforced in code inside each run
   ↑ and by the coordinator between runs
```

- Inter-phase tiering = chaining (unlimited). Intra-run tier needs = escalation bridge,
  batched (one escalation per area carrying ALL its screenshots).
- The state file is DELETED. Chain state = each run's typed return + the coordinator's
  compact context. Evidence lives in files under `.zflow/evidence/`.
- The decider's POLICY becomes loop conditions in code (stagnation counters, caps,
  shrinking-findings checks) — models cannot misjudge exit conditions.

## 3. Engine contract — `zflow-engine.dwf.ts`

ONE saved workflow, launched once per chain node. Declared args (validated by the host):

- `mode`: "implement" | "judge" | "vision" — behavior switch.
- `tier`: "flash" | "pro" — behavior switch ONLY (e.g. vision assumes image reading;
  judge escalates image needs). The LAUNCHER must set `subagent_model` to the matching
  tier; the script cannot pin models itself.
- `task`: string (verbatim user task).
- `areas`: array of { name, paths[], excludedPaths[], skills[] (absolute SKILL.md paths),
  gates: { tool, args[] }[], complexity: "straightforward"|"complex", hasUI: boolean,
  dependsOn: string[] }.
- `evidence`: string[] (screenshot/evidence paths for judge/vision modes).
- `findings`: prior-round findings array (fix rounds).
- `maxRounds`: number, default 3.

Hard rules:

- **Gate dispatch via literal-command allowlist switch** in script code — cases for
  `npm`, `pnpm`, `yarn`, `bun`, `cargo`, `make`, `go`, `python3`, `pytest`, `npx`,
  `git` — each calling `world.run("<literal>", areaGateArgs)`; gate tool+args come from
  `areas` at runtime, command names never interpolated.
- **Gates non-mutating** (no --fix/--write); gates must exist in repo tooling.
- **Git discipline in code**: commit messages drafted by a shared named "Committer"
  agent; mutations executed by `world.run("git", ["add", ...explicit paths])` /
  `world.run("git", ["commit", "-m", msg, "--", ...paths])` — serialized by the script;
  separate `fix:` commits for fix rounds; explicit paths only; NEVER `--no-verify`;
  never push.
- Implement mode: one implementer agent per area (name `implementer-<area>`), routing-map
  order, dependencies chained per-item; fix rounds REUSE the same implementer agent.
- Vision mode (flash): web → `agent-browser --session zflow-<area>`; desktop → `ocu`
  (AX text + decoded pixel PNGs). Evidence to `.zflow/evidence/<area>-r<n>-*.png`.
- Judge mode (pro): fresh blind judge per area (`judge-<area>-r<round>`), findings
  confirmed by a separate confirmer or a world.run gate; unconfirmed findings labelled,
  never dropped.
- Typed interfaces with JSDoc on every field; Finding/WorkflowReport shapes per the
  dynamic-workflows conventions; `report()` findings as they land; a status board
  artifact; final markdown report artifact (primary) + WorkflowReport return.
- Strict-safe code (guard `.find()`/optional results); no `Date.now`, `Math.random`,
  `process`, `fetch`, `fs` imports; phase names user-facing English; subagent names
  human-readable and unique per run (computed suffixes in loops).

## 4. Per-skill port map — thin SKILL.md wrappers (target ≤ ~120 lines each)

All five keep their directory name, frontmatter (valid `name` + `description` with
trigger phrases), and become: **when to use → tier matrix → chain blueprint (nodes,
order, POLICY) → conventions → fallback lanes**. Delete ALL state-file machinery,
append/compaction contracts, and sequencer discipline tables (the engine and coordinator
make them structural). No Codex remnants (`zai_*` agent types, `~/.codex`, worker/explorer
built-ins, SendMessage-as-flow-step) — blocker if found.

- **z-liteflow**: one implement node (flash), audit loop inside it, optional vision node.
  Small tasks; audit-only mode when no gates exist.
- **z-flashflow**: all-flash chain; parallel areas; native vision node; escalate to
  z-proflow when a complex area stalls two rounds.
- **z-proflow**: all-pro chain; NO pixel vision (unchanged design); ocu AX-text
  structural checks ARE allowed (text is tier-blind).
- **z-workflow**: pro implement/judge + flash vision node chained between rounds
  (run-level vision); escalation bridge only for mid-loop image needs.
- **z-gpui-workflow**: pro implement/judge; ocu AX audits inside pro runs (text);
  pixel design audits via the flash vision node, batched per area; main-thread
  computer-use plugin = interactive fallback lane only.
- Cross-flow hand-offs = finish the run, relaunch as the sibling flow (no nesting).
- Preserve verbatim in spirit: small commits / cheap revert; never claim clean while a
  gate is red; never `--no-verify`; fresh auditors never judge fixes they inspired;
  unverified stays unverified; half-done work stays on disk and is listed in the report.

## 5. Files and install

- Workspace: `zflow-port/zflow-engine.dwf.ts`, `zflow-port/skills/<name>/SKILL.md` × 5,
  `zflow-port/PORT-REPORT.md` (assembled at the end).
- Install (final phase): `mkdir -p ~/.agents/skills-backup-2026-09-21/` → copy the five
  originals in → deploy the five ported SKILL.md files over
  `/Users/hmziq/.agents/skills/<name>/SKILL.md` → verify with `diff -q`. The engine is
  NOT installed by the run (the main agent saves it via SaveWorkflow afterwards).
- If a write is permission-blocked, escalate or report — never fake an install.

## 6. Audit protocol (the rounds)

- Fresh auditor per artifact per round (never the drafter, never a repeat auditor).
- Findings: where / what / evidence / severity (blocker|major|nit) / fix-required|defer.
- Fixer = the artifact's original drafter agent (reused, keeps context) with the findings
  attached; then a FRESH re-audit of the fixed artifact.
- Exit clean when zero blocker+major across all artifacts. Round cap 3. Two rounds
  without a shrinking blocker+major count → stop, report honestly what stands.
