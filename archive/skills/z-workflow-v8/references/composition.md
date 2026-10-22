# V8 composition contract

The source library lives in this skill. `scripts/compose.ts` selects an allowlisted canonical
order and concatenates fragments. A fragment may contain an open function/block completed
by another fragment; validate the assembled script, never run fragments independently.
The submitted script embeds unchanged persona-kit/model policy, literal request data and
maintained kernel/check fragments. There are no runtime imports or saved standing workflows.

The smallest source contains configuration, per-area implementation and candidate assembly.
Selecting `planning` substitutes its configuration header. Each check piece contributes a
literal named section and a typed action block. Unselected pieces are absent from source and
confirmation graph. Shared kernel types appear once. Preserve explicit call/branch structure;
wrapping all stages in callback-heavy registries reproduced ZCode's graph-projection stack
overflow during development. A plain TypeScript pass does not establish analyzer compatibility.

## Request data

```json
{
  "repoRoot":"/absolute/project",
  "task":"Verbatim authorized task",
  "instructionPaths":["/absolute/project/AGENTS.md","/absolute/project/TASK.md"],
  "mode":"execute",
  "pieces":[
    {"name":"unit-tests","authorization":"User asked for unit tests"},
    {"name":"audit","authorization":"User asked for implementation audit","mode":"rounds","rounds":2},
    {"name":"browser","authorization":"User asked for agent-browser smoke"}
  ]
}
```

Omitted `pieces` means none. Duplicate/unknown keys and path traversal are rejected.
`authorization` is required text, never inferred from stack detection. Round `once` is default;
`rounds` requires a positive integer; `until-clean` has no numerical cap and stops on clean or
no changed corrective progress. Audit/unit owner repairs require `fixFindings:true` both in
selection and the configured step. Browser/native/mobile are one-pass evidence pieces in
this release, with owner-scoped follow-up for failures. Planning-only requires `mode:"plan"`
and the planning selection; do not combine it with implementation check pieces.

## Planner output

The configurator receives the concrete RunPlan schema in its ask. Each AreaPlan has id,
title, personaPath, ownedPaths, dependsOn, instructions, setup, assembly, optional phases
and optional role (`implement`, default, or `verify`). Each phase has id, selected kind,
commands, personaPath for judgments, authorization/instructions, optional dependsOn/resource,
fixFindings and cleanup. CommandPlan is `{tool,args,owners}`; owners always references real
area IDs. Tests cannot masquerade as assembly. No inline programs, shell wrappers or Git
commands in planner-supplied setup/assembly; use named existing project scripts where needed.

Assign test files and lifecycle helper scripts to actual writers. A verification area's
implementation dependencies name all app inputs it truly needs; its worktree merges those
commits before setup/build/checks. For example API and UI can implement concurrently, API
unit tests run while UI implements, then an independent QA area consumes both. Keep ownership
namespaces disjoint. A verification area has no writer and cannot silently repair app code.
No phase-dependency cycles, global phase barrier or nested workflow/agent dispatch.

Runtime process/browser/device operations need isolated identifiers and cleanup in the same
phase. Browser smoke receives acceptance IDs, a loopback URL already ready, named session,
viewports and ignored evidence paths. Use agent-browser snapshots before interactions.
Native/mobile capture commands return actual image paths; separate Flash HIGH judgment
consumes them after the capture resource is released. Never invent device/screenshot results.

## Maintainer validation

Run `bun test ./scripts` and the strict facade checker on the selected mixtures. Meaningful
fixtures cover real Git worktrees, concurrent area progress, independent verification, test
failures, round policies, no-progress stops, read-only guards and resource cleanup.
The checker is a conservative local aid; ZCode's CreateWorkflow analyzer remains authoritative.
Validate changed compositions with the current installed analyzer before release. Do not
increase a process stack limit to mask a graph-projection failure. A prototype tested only
with fake agents does not establish real browser/device availability or model quality.
