---
name: z-gpui-workflow
description: >-
  Domain profile for z-workflow on GPUI (gpui-kit) Rust desktop tasks. Uses
  z-workflow's composer-coordinator and workflow-author to write a fresh
  task-specific script from measured signals, loads z-gpui-engineer and
  companion Rust/verification specialists through the canonical persona kit,
  scopes Cargo and #[gpui_kit::test] UI integration gates to the affected
  crate, and serializes V=desktop accessibility and screenshot capture through
  a single-worker device lane before guarded Step 6 fast-forward delivery.
---

# z-gpui-workflow

`z-gpui-workflow` is the GPUI (`gpui-kit`) desktop domain profile of `z-workflow`. The main agent acts as `z-workflow`'s **composer-coordinator** with a clean context (Pillar 9): it dispatches the `workflow-planner` for complex tasks — the planner gathers every GPUI domain fact and dispatches `workflow-author` itself — or the `workflow-author` directly for small tasks. Every run gets a freshly written script; do not depend on a saved engine or introduce a second GPUI coordinator.

## When to Use

Use this skill when the user explicitly requests `z-gpui-workflow` or GPUI subagent orchestration.

- **Task-kind stage eligibility applies first:** research uses discovery, source checking, and synthesis; audits use read-only inspection and confirmation; drafts write only named artifacts. Create implementation worktrees, Cargo gates, desktop capture, commits, and checkout merges only when the requested deliverable includes code or runtime verification.
- **Proportionate handoffs:** if the task is a single-area, non-visual GPUI logic edit (1 to 5 files, `V = none`, low uncertainty, low risk) with one existing Cargo gate, note that `z-liteflow` with `z-gpui-engineer` can run it faster; if the request is a multi-round Rust hot-path optimization campaign without UI changes, hand off to `z-super-rustflow`.

## How to run it

Load and follow `z-workflow` (`SKILL.md`) step by step with these GPUI domain overrides:

| `z-workflow` step | `z-gpui-workflow` domain rule |
|---|---|
| Step 0 — Triage & signals | The coordinator sets the trigger from the task text (Pillar 9); the planner (complex) or author (small) measures `A`, `F`, `R`, `U`, and `V` with commands. Slice areas (`A`) by behavior and state ownership — one `Entity<T>` model/controller flow, one `RenderOnce`/view composition slice, one action/keybinding/focus flow, one window/overlay (`Dialog`, `Sheet`, `Popover`, `Notification`, `Command`) flow, or one background service — never by directory. Set `V = desktop` whenever screen structure, layout, spacing, `cx.theme()` tokens, interactive states, focus rings, overlays, or window chrome change. Set `V = none` only when non-visual state or command logic is completely covered by unit or headless `#[gpui_kit::test]` tests. Rate `R = medium` when modifying existing entity update/event loops, focus traversal, or shared components; rate `R = high` when touching `unsafe`, native platform/window hooks, persistence migrations, or public library contracts. |
| Step 1 — Explore & crate discovery | Done by the planner (complex) or the author (small), never the coordinator: discover the exact Cargo workspace and crate manifest (`--manifest-path <crate>/Cargo.toml`, `-p <pkg>`, required `--features`), plus existing `#[gpui_kit::test]` (`TestAppContext`, `VisualTestContext`) targets. Never substitute a workspace-root Cargo command when a narrower crate manifest gates the affected code. Resolve `gpui-kit` and `gpui-kit-design-guides` from the session's available-skills index and record their paths in each area's `skills` array. |
| Step 2 — Shape (`workflow-author`) | The planner passes the verbatim task, `WorkflowBrief`, and resolved `dynamic-workflows` contract path to `workflow-author` (the coordinator passes them directly only on the small or brief-only-fallback path). Concurrent writing areas use isolated run-owned worktrees (`wf/<slug>/<area>`) merging through the serialized git chain into `wf/<slug>/integration`; a single-area code run uses one `wf/<slug>` worktree. All live desktop launches and `open-computer-use` captures serialize through one single-worker device lane. |
| Step 3 — Author & persona kit | Paste the canonical `persona-kit.dwf.ts` block (`// persona-kit:start v4` to `// persona-kit:end v4`) unchanged. Load every specialist with `loadPersona(path, { tier, access })` and `personaAgent(p, uniqueName, RUN_RULES)`. Implementers get `access: "write"` scoped to their area paths; every round's judge (`judge-<area>-r<round>`) and auditor is a fresh instance loaded with `access: "read-only"` and wrapped in `guardWrites(p, worktree, () => ...)` while no writer uses that worktree. Judges see the task, diff, gate results, AX snapshot text, screenshot paths, and blind vision rows — never the implementer's reasoning or prior verdicts. |
| Step 4 — Pre-flight | Run the `persona-kit` v4 drift check, rehearse `git status --porcelain -z` output parsing in `EvalWorkflowSnippet`, verify every `world.run` command against the git rules, check the complexity budget, and run a fresh `workflow-author` `REVIEW` when `R >= medium` or the budget exceeds 6 asks per round. |
| Step 5 — Approve & launch | Show the measured signals, dials, band, model per role, persona paths/sha256/access, Cargo gates, and device-capture commands before calling `CreateWorkflow`. Launch through the approval dialog using `"Allow only this time"`. |
| Step 6 — Checkout delivery | Follow `z-workflow` Step 6: require zero open findings, every lane complete, and all crate-scoped Cargo gates green on the combined committed result; verify the user's checkout is clean and still on the captured full branch ref and base `HEAD`; run `git -C <repo> merge --ff-only <result-branch>`; and rerun the crate-scoped gates in the checkout. |

## Specialist and skill routing

Select one primary domain persona per implementation lane from the discovered agent files, and add companion specialists only when a distinct deliverable or risk requires them:

| GPUI work or risk | Persona & authority | Required skills and references |
|---|---|---|
| Views, `Entity<T>` / `RenderOnce`, `gpui_kit::component` vs `gpui_kit::base`, actions, focus, overlays, custom `Element`s, or `#[gpui_kit::test]` | `z-gpui-engineer` (`write` for implementer; fresh `read-only` per judge round) | `gpui-kit` (`references/conventions.md`, `references/coding-guides.md`, `references/recipes.md`, and the matching `references/gpui/{action,async,context,element,element-id,entity,event,focus-handle,global,layout-style,test}.md`). Mandatory for any visible, layout, spacing, token, overlay, copy, or interaction work: `gpui-kit-design-guides` (`references/design-guides.md`). |
| Multi-state user journeys, empty/loading/error/cancellation flows | `z-product-flow-analyst` (`read-only`) | `gpui-kit`, `gpui-kit-design-guides` (`references/design-guides.md` task hierarchy and interaction states). |
| Keyboard navigation, `FocusHandle` / `FocusTrapElement`, accessible names/roles, and contrast | `z-accessibility-auditor` (`read-only`) | `gpui-kit` (`references/gpui/focus-handle.md`, `references/gpui/action.md`), `gpui-kit-design-guides` (`references/design-guides.md` accessibility checklist). |
| Background tasks, `cx.spawn` / `background_spawn` cancellation, channels, or Tokio integration | `z-rust-async-engineer` (`write` or `read-only`) | `gpui-kit` (`references/gpui/async.md`), `rust-async-patterns` (`references/details.md`), `rust-parallel-cache` (`references/channels.md`). |
| Frame-budget regressions, `VirtualList` / `DataTable` scaling, or allocation churn in render paths | `z-rust-perf-engineer` or `z-rust-memory-engineer` (`write` or `read-only`) | `rust-superopt` (`references/measurement.md`), `gpui-kit` (`references/coding-guides.md` performance rules), `rust-string-perf`, `rust-parallel-cache`. |
| Platform hooks (macOS/Windows/Linux), raw pointers, custom shaders, or `unsafe` blocks | `z-unsafe-ffi-auditor` (`read-only`) | `rust-best-practices` (`references/chapter_08.md`, `references/chapter_09.md`), `code-comments`, `rust-superopt` (layout/alignment rules). |
| Live desktop runtime capture (`V = desktop`) | `z-native-device-verifier` (`flash` tier in `z-workflow`, `write` scoped to `.zflow/evidence/`) | `open-computer-use` (`references/usage.md`, `references/troubleshooting.md`), `gpui-kit` (`references/gpui/test.md`). |

## Gates and desktop evidence

1. **Scoped Cargo gates (no model):** run `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` with `--manifest-path <worktree>/<crate>/Cargo.toml` (and task-relevant `--features`) via `world.run`. Headless UI integration tests (`#[gpui_kit::test]` with `TestAppContext` / `VisualTestContext`) execute inside `cargo test` and verify component state, focus, key dispatch, and owner callbacks deterministically.
2. **Serialized live desktop capture (`V = desktop`):** headless tests do not replace pixel or window-server verification when visual design or native window behavior is in scope.
   - Run all desktop app launches and `open-computer-use` (`ocu`) calls through one single-worker device lane.
   - On macOS, verify `sw_vers -productVersion` (>= 14.0) and `open-computer-use doctor` before launching the app; if the desktop session or permissions are unavailable, stop device capture and record the surface in `notCovered`.
   - Capture both semantic state (`open-computer-use call get_app_state` saved as `.txt`/`.json`) and window screenshots (`.png`) under `<worktree>/.zflow/evidence/<area>-r<round>-<n>.{txt,png}`. Never enable `OPEN_COMPUTER_USE_ALLOW_GLOBAL_POINTER_FALLBACKS=1` unless the user explicitly requested a global pointer operation.
3. **Blind Flash vision audit + command checks:**
   - A fresh `vision-audit-<area>-r<round>` (Flash) reads only the screenshot paths, viewport, and verbatim visible requirements from the task (including stated `gpui-kit-design-guides` criteria) — never source code, measured values, or implementer notes.
   - After the vision audit returns, script commands check the captured accessibility tree/logs against each row and record any audit-vs-command disagreement.
   - The fresh read-only Pro `z-gpui-engineer` judge reviews the diff, Cargo gate results, AX evidence, screenshot paths, and vision rows. Screenshots never replace red build or test gates.

## Final report

Include `conclusion`, `findings` (`verified`, `judged`, `unconfirmed`), `verified`, and `notCovered`, plus the measured signals/dials/band, budget counts, `personaReport()` (paths, sha256, selected models, access), crate-scoped gate results, `.zflow/evidence/` AX and PNG paths, uncovered desktop behavior, retained `wf/*` branches/worktrees, and the Step 6 fast-forward outcome (`old HEAD` → `new HEAD`).

## Grounded in

- `harness/zcode/skills/z-workflow/SKILL.md`: composer-coordinator, signals, dials, Vision phase, persona kit, and Step 6 delivery.
- `harness/zcode/skills/z-workflow/persona-kit.dwf.ts`: canonical v4 persona loader and read-only write guard.
- `harness/zcode/skills/z-workflow/references/specialists.md`: specialist dispatch contract.
- `harness/zcode/agents/z-gpui-engineer.md` and `harness/zcode/agents/z-native-device-verifier.md`: GPUI and desktop verification personas.
