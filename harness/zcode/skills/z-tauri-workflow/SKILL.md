---
name: z-tauri-workflow
description: >-
  Thin chain-coordinator skill for real Tauri v2 desktop work: pro implement and
  judge runs of zflow-engine, a flash vision node (web lane on the tauri
  dev-server URL, desktop lane via ocu for window/tray/native chrome), small
  commits, and a code-enforced POLICY loop. Trigger phrases: tauri workflow,
  tauri orchestration, tauri sub-agents, tauri iterate-until-clean.
---

# z-tauri-workflow

**The main agent is a chain coordinator, not an implementer.** It slices the task
into Tauri areas, launches tier-pure `zflow-engine` runs as chain nodes, and
writes the final report; between runs it holds ONLY compact control data — typed
returns, evidence paths, round number, open-finding counts, commit shas. Trivial
one-file edits don't need this skill. Sibling flows (z-workflow, z-proflow,
z-flashflow, z-liteflow, z-gpui-workflow) run under their own rules — never
cross-apply; hand off via finish-and-relaunch.

## Tier philosophy

Flash wherever output is objectively checkable — gates, git state, schema'd
reports, image reading. Pro wherever quality is only checkable by judgment —
architecture, command/state ownership, audit verdicts.

| Chain node | subagent_model pin | Why |
|---|---|---|
| `zflow-engine mode=implement` | pro (GLM 5.3) | judgment-heavy Rust + frontend generation |
| `zflow-engine mode=judge` | pro (GLM 5.3) | blind audit verdicts need depth |
| `zflow-engine mode=vision` | flash (GLM 5.3 Flash) | native PNG reading + measured hex/px deltas |
| AX structural checks | pro judge audits the .txt via `evidence=` (desktop lane) | ocu AX text is tier-blind |
| Committer | inside implement run | verifiable via `git log` |

The launcher pins `subagent_model` to the matching tier; the engine's `tier`
arg is a behavior switch only. Pro is image-blind — pixel judgment happens
only in the flash vision node or a batched escalation.

## Chain blueprint

One saved workflow (`zflow-engine`), one launch per node via CreateWorkflow
(validated args; completion notifications carry the typed return); fix rounds
re-enter via AmendWorkflow (reuses finished work), stopped runs continue via
ResumeWorkflowRun. Never nest — no run spawns another.

1. **Route (coordinator)**: slice into areas — fine-grained by decree, one kind per
   area: Rust core in `src-tauri/` (commands, state, events, plugins, tray/windows);
   frontend (components/routes/IPC bindings); capabilities/config
   (`src-tauri/capabilities/`, `src-tauri/tauri.conf.json`) — split any slice over
   ~4 files or mixing kinds. Per area: kind, paths, excludedPaths, skills (absolute
   SKILL.md paths), gates, complexity, dependsOn, hasUI. Gates: non-mutating,
   engine-allowlisted, right manifest/dir — Rust: `cargo fmt --check` and
   `cargo clippy --all-targets -- -D warnings`, both with
   `--manifest-path src-tauri/Cargo.toml`; frontend: typecheck only when repo
   tooling (`npx tsc --noEmit`, `vue-tsc --noEmit`; never in a JS-only frontend) and
   lint when configured, via the repo's package manager; no Tauri-CLI lint exists —
   never gate on one.
2. **Implement node** (`mode=implement`, tier=pro): one `implementer-<area>` per
   area, routing-map order, dependencies chained per item; the script runs the
   gates itself (world.run exit codes) — implementers never run gates or git; no
   pass/fail claim is trusted. The Committer drafts and the script commits: one
   logical unit per area, explicit paths; the coordinator gitignores `.zflow/` on
   round 1.
3. **Vision node** (`mode=vision`, tier=flash) per has-UI area: pin `lane`
   (AreaSpec; the engine's URL-regex guess applies only when absent). Frontend
   areas → `lane: "web"`: agent-browser audits the dev-server URL (`build.devUrl`,
   Vite default http://localhost:5173); the coordinator ensures the dev server is
   up first (`tauri dev` runs `build.beforeDevCommand`). Window/tray/native areas →
   `lane: "desktop"`: ocu captures the running window (AX `.txt` + decoded PNG)
   into `.zflow/evidence/`; the flash auditor reports measured deltas (px offsets,
   hex, missing/extra elements). **Lane caveat:** a web-lane audit sees frontend
   markup/CSS/JS but NOT the Tauri webview, native chrome, tray, or IPC (`invoke`
   cannot run in a plain browser) — check each area's `lane` in the typed return,
   mark not-covered, say so; the desktop lane covers them.
4. **Judge node** (`mode=judge`, tier=pro): fresh blind `judge-<area>-r<round>` per
   area — fresh auditors never judge fixes they inspired. It judges code plus the
   `evidence` paths you pass (AX structural checks ride this lane — the .txt is
   tier-blind text; PNG pixels are image-blind on pro); findings are confirmed by
   separate confirmers. Vision findings have NO confirmer — the judge never sees
   their content: pass them as advisory in the next implement run's `findings` arg
   (never fix targets); re-shoot verifies.
5. **POLICY loop** — exit conditions live in code inside each run and in the
   coordinator between runs; models cannot misjudge them:
   - **exit clean**: every area complete + all gates green + zero open judge-verified
     findings, every vision finding fixed and re-shot clean or deferred to the user.
   - **stop honestly**: two consecutive rounds without findings/failing gates
     strictly shrinking, or `maxRounds` (default 3) reached — report what passes,
     fails, why.
   - **continue**: findings strictly shrinking → fix round REUSES the same
     `implementer-<area>` agents, then gates → vision re-shoot (same checklist) →
     `fix:` commit → fresh judge.
   - Launch failures are findings, not hangs; record pre-existing red gates as
     baseline, don't burn fix rounds on them.

## Fallback lanes

- **Mid-run eyes in a pro run** (a judge re-examining pixel detail): the escalation
  bridge, batched — ONE escalation per area carrying ALL its screenshots; only the
  blocked subagent parks while the main agent resolves it (a flash Agent-tool
  subagent) and feeds the answer back; cap 3 per ask, budgeted by area.
- **Interactive desktop lane**: the official computer-use plugin, main thread only
  (session-bound host bridge; cannot run inside workflows). Hands-on app driving
  the CLI cannot express; never a flow step. If ocu, the dev server, or the launch
  fails, mark vision degraded for that area and say so — never invent substitutes.

## Preserved conventions

- Never claim clean while a gate is red. Never claim a screen verified that was not
  shot and audited this run. Unverified stays unverified — tiers you could only
  request are reported as such, never "used".
- Small commits keep findings cheap to revert; never `--no-verify`, never `git add
  -A`, match `git log --oneline -10` style (else `feat:`/`fix:`), never push unless
  asked; half-done work stays on disk, listed in the final report with evidence
  paths.
- Skills are dynamic: match by capability against the session's available-skills
  list; a gap is noted, not a blocker.
- Skill menu by area kind: Rust commands/state/events → tauri-v2,
  understanding-tauri-architecture, rust-best-practices, rust-async-patterns
  (when async); tray/windows/native → tauri-v2 + understanding-tauri-architecture;
  frontend → integrating-tauri-js-frontends + calling-rust-from-tauri-frontend
  (bindings) + the framework skill by capability (react-doctor, the svelte skills,
  tailwind); capabilities/config → configuring-tauri-permissions + tauri-v2; tests
  → tauri-v2 + rust-testing (Rust) or the framework skill. A skill page is the
  door, not the room.

## Final report (coordinator)

From the judge node's typed return + evidence paths: rounds spent, gate status
(mechanical/audit/vision), findings fixed vs deferred, key paths, degraded or
skipped vision stated plainly, items left for the user.
