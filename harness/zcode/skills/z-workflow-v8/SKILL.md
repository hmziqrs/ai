---
name: z-workflow-v8
description: >-
  Compose a ZCode workflow from maintained typed source pieces when the user selects
  z-workflow-v8. Per-area parallel execution, optional planning, unit tests,
  implementation audit, browser smoke, native/mobile vision, and explicit audit round policies.
---

# z-workflow-v8

V8 is an independent experiment. Preserve V7 and every prior version. Select maintained
source pieces from the user's request, concatenate them before launch, and run one
self-contained typed workflow. No runtime imports, model-authored orchestration, saved
workflow definitions, function registries hiding executable calls, or engine source edits
per task. The canonical v4 persona kit is copied unchanged; local HIGH policy is independent.

## Priorities

- Independent area pipelines advance on their own real dependencies, including local tests
  while unrelated areas implement. Shared Git, writers and devices serialize where necessary.
- Keep the coordinator small: record the task and selected pieces, prepare, launch and deliver.
  One delegated configurator retrieves shared facts; specialists inspect their own domains.
- Complete the requested scope quickly. Keep planning thin. Product tests, audits, browser QA,
  vision and fixes require explicit scope; no mandatory extra clean rounds or perfection work.

## Select the pieces

Only include pieces explicitly requested or authorized in supplied project instructions.
Record that authority verbatim or with its exact instruction path in each selection.
A stack name alone does not authorize testing or vision. Read [composition.md](references/composition.md)
when choosing policy fields, declaring lifecycle commands, or adding a new maintained piece.

| Piece | Work |
|---|---|
| `planning` | Use the same clean-context configurator to produce the requested thin plan; no extra handoff. `mode:"plan"` stops before writers/worktrees. |
| `unit-tests` | Assigned owners write meaningful tests; engine executes the declared test commands. |
| `audit` | Independent implementation judgment, with actionable file/line evidence. |
| `browser` | Agent-browser journeys against a running isolated web preview, using a real project QA persona. |
| `native-vision` | Native desktop capture commands followed by Flash HIGH image interpretation. |
| `mobile-vision` | Actual mobile device/emulator captures followed by Flash HIGH interpretation. |

Absent optional pieces have no code or visible phase in the submitted script. Configuration,
implementation and integrated assembly remain the minimal kernel; planning replaces the
configuration label. Phase names are literal and fixed before confirmation. A section can
have several area instances; source selection changes the phase graph per request, never
invents a stage mid-run. Phase labels are presentation; dependencies implement scheduling.

## Launch

1. Load the installed ZCode `dynamic-workflows` contract. Its default review examples do not
   expand the user's scope. Ensure Bun, Git and this skill's pinned TypeScript dependency
   are installed (`bun install --frozen-lockfile` in the skill folder once if needed).
2. Create an ignored `.zcode/workflow-drafts/request.json` with absolute `repoRoot`, verbatim
   `task`, absolute `instructionPaths`, optional actual user-message `startedAt`, `mode`
   (`execute`, default, or `plan`) and `pieces`. Each piece is an object, for example:

   ```json
   {"name":"audit","authorization":"User: audit the implementation","mode":"once"}
   ```

   A bounded review uses `mode:"rounds",rounds:2`; an explicitly requested progress loop uses
   `mode:"until-clean",fixFindings:true`. `once` is the default. There is no hidden round cap
   on until-clean; actual unmet inputs, unchanged corrections or no viable approach stop
   incomplete. MAX is never automatic. A later launcher clock is not a user-request timestamp.
3. Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request.json> <run.dwf.ts>`.
   It validates selection/data, captures clean HEAD/full branch ref, concatenates unchanged
   fragments with literal JSON, records source hashes, and checks once. It executes no model
   or product work and refuses overwriting a manually repaired draft. Keep task drafts outside
   maintained skill source. No JS transpilation/bundling: ask result types must survive.
4. Submit `CreateWorkflow` using `path`. Follow its separate approval flow even with Full access.
   Compiler diagnostics mean no run started. Do not paste the source inline or SaveWorkflow.

## Execution and evidence

The configurator supplies disjoint paths, actual persona files, setup/build commands,
contracts and selected check steps. Raw `SKILL.md` files are guidance, never personaPath.
Command owners are nonempty unique exact area IDs, including global setup/build commands.
Plan-only output is in notes, without product mutation. Keep niche personas project-local.

A `role:"verify"` area may depend on completed app areas, merge their commits into its own
worktree and run independent audit/browser/device checks without a source writer. It owns
its separate evidence/helper namespace. Its checks report actionable failures; it cannot
repair another area's source. Explicit owner-scoped follow-up is required for such failures,
not a fake pass or an unrestricted candidate writer. Local owner checks may correct only
that owner's contribution when both the selection and step authorize repairs.

The engine owns setup/install, project-wide gates, test execution and capture/lifecycle
commands. Writers may author assigned tests/helpers and use required framework compiler
assistance on edited files. They do not duplicate engine gates. Keep a finite explicit audit
round count only when requested. An until-clean loop stops on the first clean pass; changed
source invalidates affected evidence. An authorized once/final bounded audit-pass correction is
reported as corrected but not re-audited rather than inventing another review. A failed
behavior check corrected after its final permitted pass stays incomplete until reverified.

Browser/device steps require a real persona, exclusive resource and cleanup commands. Start
and establish readiness before QA; stop only owned processes/session/device resources even
when the evaluator fails. Native/mobile capture releases its resource before separate image
interpretation. Missing tools, devices, images or permissions block that check honestly.
Do not silently substitute a browser for native device evidence. Evidence files/data must be
ignored; read-only guards protect tracked and nonignored source, not a claimed tool sandbox.

Models: configuration, implementation and audits use Pro HIGH; native/mobile interpretation
uses Flash HIGH. Bounded read-only Flash LOW retrieval is optional. The local model helper
permits targeted Pro MAX only with explicit authorization and two recorded failed completed
HIGH corrections on the same reasoning problem; the engine never selects it automatically.

The coordinator alone performs guarded ordinary fast-forward delivery after checking the
captured destination HEAD/ref, candidate cleanliness and ancestry. No reset/clean/force,
push or deployment. Use recorded engine evidence; do not repeat passed checks for delivery.
Report outcome, timings, actual selected pieces/models, findings, artifacts and incomplete
work briefly. Do not launch extra benchmarks or monitor other sessions without request.
Reusable fixes require a new numbered release; task-only repairs may use AmendWorkflow on
run-owned drafts under the current harness contract. Preserve stable asks for cached replay.
