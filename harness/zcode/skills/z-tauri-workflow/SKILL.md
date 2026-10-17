---
name: z-tauri-workflow
description: >-
  Domain profile for z-workflow on Tauri desktop tasks. Use when the user
  explicitly requests a Tauri workflow or Tauri subagent orchestration.
---

# z-tauri-workflow

Use z-workflow's composer-coordinator and workflow-author. The author writes a fresh script from the task and measured dials. Do not rely on a saved engine or create a second framework coordinator. Keep research and draft requests in their requested shape; create code lanes only for implementation work.

Split code areas by behavior and ownership. Route Rust command, state, permission, and native integration changes to `z-tauri-integrator` or the relevant Rust specialist. Route frontend changes to the project's framework specialist. Load canonical personas through the unchanged persona kit from `persona-kit.dwf.ts`; implementers have write access and each round's reviewer is fresh and read-only. Avoid one mixed frontend/native area when either side can be implemented and gated independently.

Discover the actual Rust manifest, features, package manager, and frontend scripts before defining gates. Scope Cargo formatting, lint, and tests to the affected manifest and relevant features. Use the existing frontend typecheck or test scripts. Do not invent an npm command, invoke `npx` as a gate, or gate on a nonexistent Tauri CLI lint. Preserve the IPC contract across Rust commands and frontend invoke types. Keep capabilities narrow and follow the project's plugin and permission setup.

Classify visible coverage explicitly. A web lane can verify browser rendering and frontend behavior; it does not cover the Tauri webview, native chrome, tray, IPC, permissions, lifecycle, or platform integration. Put desktop capture in a separate run-owned worktree when needed and serialize all device activity through one lane. Use `z-native-device-verifier` with Flash tier and write access limited to evidence artifacts for bounded capture and semantic evidence. Save accessibility evidence and PNGs under `.zflow/evidence/` when available, then ask a separate fresh blind Flash vision auditor to compare captures with task requirements. Keep the pro judge independent and read-only.

Show the measured dials, model roles, and command set before launch, use the one-time approval choice, and follow z-workflow Step 6 for guarded fast-forward into the user's checkout. Report each surface's gates and evidence separately, including uncovered native behavior. Never push or delete run branches.
