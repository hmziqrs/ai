---
name: z-tauri-workflow
description: >-
  Thin one-launch chain skill for real Tauri v2 desktop work: a single
  zflow-engine chain launch runs every Tauri area as its own state machine —
  pro implement and judge in-run, flash vision on the tauri dev-server URL
  (web areas) or the ocu device lane (window/tray/native areas), small
  commits, DAG merges, and a code-enforced POLICY loop. Trigger phrases:
  tauri workflow, tauri orchestration, tauri sub-agents, tauri
  iterate-until-clean.
---

# z-tauri-workflow

**The main agent is a chain coordinator, not an implementer.** It slices the
task into Tauri areas, makes ONE launch, and relays the report; the whole
chain — plan, implement, vision, judge, fix rounds, merges — runs inside
that single workflow. Never relaunch to fix (AmendWorkflow revises,
ResumeWorkflowRun continues a stopped run; never nest). Trivial one-file
edits don't need this skill. Sibling flows run under their own rules.

## Models — balanced profile, in-engine

Pro where quality is only checkable by judgment — Rust architecture,
command/state ownership, audit verdicts. Flash where a model runs and its
output is objectively checkable — capture and image reading; gates and git
state run model-free in script (world.run). One launch pins it all:
planner/reviewer/implementer/Committer/judge/confirmer on pro; capture and
vision audit on flash. AX structural checks are tier-blind text — the pro
judge reads the .txt evidence directly.

## Launch (once)

prep (coordinator): slice into areas — fine-grained by decree, one kind per
  area: Rust core in `src-tauri/` (commands, state, events, plugins,
  tray/windows) → `contention: "desktop"` for window/tray/native areas,
  `terminal` for pure logic; frontend (components/routes/IPC bindings) →
  `contention: "web"` and the dev-server URL (`build.devUrl`, Vite default
  http://localhost:5173) named in the task text so the flash capture audits
  it; capabilities/config → `terminal`. Split any slice over ~4 files, over
  the size budget (~400 changed lines / ~10 files; per-area `budget` tunes
  it), or mixing kinds. Gates: non-mutating, engine-allowlisted — Rust:
  `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`, both
  with `--manifest-path src-tauri/Cargo.toml` (the engine absolutizes a
  gate's own manifest path); frontend: typecheck via the repo's
  package-manager scripts (`npm run type-check` style; `npx`-style gates
  refuse — wrap in a package.json script or Makefile; never in a JS-only
  frontend); no Tauri-CLI lint exists — never gate on one. Baseline gates
  once; record and OMIT pre-existing reds. Record baseSha, repoRoot,
  agentsMd; gitignore .zflow/; clean stale zflow/* branches/worktrees and
  untracked files under worktree areas' paths.

launch (once): CreateWorkflow saved zflow-engine — mode="chain", task
  (with the dev-server URL named), areas, agentsMd, baseSha, repoRoot,
  maxLines/maxFiles (per-area budget optional), commit. No subagent_model.
  No maxRounds unless the user caps.
  In-run per area: plan → implement (web areas in their own worktree;
  desktop areas in worktrees with capture serialized through the device
  lane) → flash vision → pro judge + confirmer per finding → fix rounds
  while findings shrink → merge along dependsOn → self-cleanup.

stop → relay the run's typed return + report: per-area terminal states,
  commits, merges, gate status, findings fixed vs deferred, degraded vision
  stated plainly.

**Lane caveat (unchanged):** a web-lane audit sees frontend markup/CSS/JS
but NOT the Tauri webview, native chrome, tray, or IPC (`invoke` cannot run
in a plain browser) — the report marks those not-covered; the desktop lane
covers them.

## Conventions

- Never claim clean while a gate is red. Never claim a screen verified that
  was not shot and audited this run. Unverified stays unverified.
- Size-budgeted small commits: ≤400 changed lines / ≤10 files, one commit
  per green round, `fix:` on fix rounds, explicit paths, never
  `--no-verify`/`git add -A`/push; match repo log style. The Committer owns
  git.
- AGENTS.md binds every subagent (agentsMd + baseSha args); its required
  skills ride on top of the routed skills.
- Skills are dynamic: matched by capability against the session's
  available-skills list; a gap is noted, not a blocker.
- Skill menu by area kind: Rust commands/state/events → tauri-v2 +
  understanding-tauri-architecture + rust-best-practices (+
  rust-async-patterns when async); tray/windows/native → tauri-v2 +
  understanding-tauri-architecture; frontend →
  integrating-tauri-js-frontends + calling-rust-from-tauri-frontend + the
  framework skill by capability; capabilities/config →
  configuring-tauri-permissions + tauri-v2; tests → tauri-v2 +
  rust-testing or the framework skill. A skill page is the door, not the room.

## Fallback lanes

- **Mid-run eyes in a pro role** (a judge re-examining pixel detail): the
  escalation bridge, batched — ONE escalation per area carrying ALL its
  screenshots; resolve with a flash Agent-tool subagent; cap 3 per ask.
- **Interactive desktop lane**: the computer-use plugin, main thread only —
  never inside runs. If ocu, the dev server, or the app launch fails, the
  run marks vision degraded for that area and says so — never invent
  substitutes.
