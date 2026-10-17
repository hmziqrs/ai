---
name: z-gpui-workflow
description: >-
  Domain profile for z-workflow on GPUI desktop tasks. Use when the user
  explicitly requests a GPUI workflow or GPUI subagent orchestration.
---

# z-gpui-workflow

Use z-workflow's composer-coordinator and workflow-author. The author writes a fresh script from the current task and measured dials. Do not depend on a saved engine or add a separate GPUI coordinator. Research and draft tasks keep their own shape; use code lanes only when the task calls for code changes.

For code work, split areas by behavior and dependency, not by directory. Put concurrent writers in separate run-owned worktrees. Serialize all desktop capture through one device lane. Preserve the standard approval dialog and use z-workflow Step 6 for the guarded fast-forward into the user's checkout.

Resolve the discovered `z-gpui-engineer` agent file to an absolute path and load it through the canonical persona kit embedded unchanged from `persona-kit.dwf.ts`. Give the implementer write access. Each round uses a fresh judge from the same persona with read-only access; the judge sees the task, diff, gates, and evidence, never the implementer's reasoning. The implementer reads the project guidance and available domain skills, including `gpui-kit-design-guides` for screen structure, spacing, hierarchy, and interaction work. Resolve current skill paths from the session rather than assuming this repository is installed in the target project.

Discover the actual Cargo manifest and existing test commands, then gate only the affected crate and relevant features. Do not substitute a root workspace command for a scoped manifest when the project has a narrower target. Visible desktop work sets `V=desktop`: use `z-native-device-verifier` with Flash tier and write access limited to evidence artifacts for bounded capture in the serialized device lane, recording an accessibility tree and PNG under `.zflow/evidence/` when available. A separate fresh Flash vision auditor reads only the stated requirements, viewport, and capture paths. The pro judge receives the evidence and command results. Missing runtime or capture evidence stays unverified; screenshots do not replace build and test gates.

Before launch, show the measured dials, model roles, and command set, then use the one-time approval choice. Report paths, gate results, AX and PNG evidence, uncovered native behavior, findings, and the run branch. Never push or delete run branches.
