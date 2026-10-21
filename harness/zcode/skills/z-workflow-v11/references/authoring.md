# V11 authoring contract

Read this file once. Use the maintained helpers as commands, without reading their internals.
The author is Flash HIGH, outside the workflow. It owns one compact plan and assembly; the
coordinator owns CreateWorkflow/approval/delivery. Product writers remain Pro HIGH. The engine
accepts this exact plan, so do not hand off another discovery/planning task after preparation.

## Priorities

- Complete the requested scope fast. Speed comes from parallel lanes by default: split the task
  along real ownership seams into the maximum number of independently executable writer areas
  (typically 3-6 for multi-feature briefs), so the engine runs them concurrently.
- For new apps the scaffold owner (manifests + shared contract + app entries) is the only
  allowed blocking dependency, and it stays thin: never absorb feature implementation into it.
  Feature areas depend on the scaffold and on nothing else unless code truly cannot start;
  do not make any feature area wait for another feature area's build.
- Audits, tests and vision are opt-in pieces with explicit authorization; nothing is enabled by
  stack detection. Default posture is no unit tests, no audits — only what the
  user requested.
- Verification follows the lane by default: attach requested audit/unit-test phases to each
  implementation area. Stage A (implement + gates + commit) hands off to dependents immediately;
  the lane's read-only phases stream concurrently in stage B and gate only the final result.
  Phases with repair authority (fixFindings) gate as one stage. Build a merged whole-app verify
  area only for checks that inherently cross lanes (integrated browser journeys, whole-app
  visual pass).
- Split along real inputs, not to inflate agent counts: a justified single lane
  (`requirements.minimumAreas: 1` plus a note) beats a fake split.

## Fast preparation

1. Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/preflight.ts <workspace>`.
   It resolves an ordinary nested workspace to the real Git root, preserves `appScope`, reports
   clean HEAD/full branch, ignored drafts, real persona paths and relevant root manifests.
   It does not mutate. Detached/unborn/non-Git checkouts, dirty state or missing ignored drafts
   need an authorized remedy from the coordinator, never automatic stash/reset/commit.
2. Read supplied project instructions and only consequential interfaces absent from facts.
   Keep all application paths beneath the requested nested scope, not the parent/sibling project.
3. Fill the request below in the root's ignored `.zcode/workflow-drafts/<unique>-request.json`.
   Keep task verbatim; no injected scope from another workflow or invented user timestamp.
4. Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/prepare-run.ts <request> <run.dwf.ts>`.
   It validates data, attaches canonical helpers/pieces, prints actual phases and checks once.
   Correct named invalid fields once using existing facts. Stop with a concrete diagnostic if
   still invalid. The coordinator submits by path; local checking does not prove platform analysis.

## Intent → pieces

Infer meaning, including exclusions and requested scope, not an exact keyword requirement.
Each selection has nonblank `authorization` quoting the actual request/instruction path.

| Intent | Piece | Important boundary |
|---|---|---|
| Thin/product plan | `planning` | Same prepared plan, no extra planning agent |
| Review the plan before coding | author self-check | The author re-reads its finished plan against the brief during preparation and fixes gaps itself; no workflow gate, no extra round |
| Unit/component/domain tests | `unit-tests` | Author actual test files; engine runs them |
| Interactive terminal / tui-use testing | `tui-tests` | Actual labeled PTY actions, assertions and snapshots; not piped stdin/unit tests |
| Review implementation | `audit` | Concrete file:line defects, no new plan review |
| Browser journeys / agent-browser smoke | `browser` | Real ready preview and behavior evidence, no automatic visual pass |
| Check web design visually | `web-vision` | Actual web screenshots + Flash HIGH interpretation |
| Inspect native desktop or terminal window visually | `native-vision` | Actual native window captures, no browser substitution |
| Inspect mobile app visually | `mobile-vision` | Actual device/simulator captures, not a web preview |

Combine pieces when the request combines these intentions. "No tests" removes tests; "audit
once" means one pass, not until-clean. If a user asks only to assemble/show a workflow, prepare
execute-mode data without submitting it. If they ask only for the product plan, use mode plan
with planning; put the compact plan in notes, no areas/setup/assembly.
Do not invent a missing capability, silently omit a requirement or call screenshots a vision pass.

## Request JSON

```json
{
  "repoRoot":"/absolute/git-root",
  "workspaceRoot":"/absolute/git-root",
  "task":"Original user brief",
  "instructionPaths":[],
  "mode":"execute",
  "pieces":[],
  "plan":{
    "sharedContract":"One existing app owner; keep its public API",
    "areas":[{
      "id":"app","title":"Requested app change","domain":"app",
      "personaPath":"/absolute/path/to/an/actual-agent.md",
      "ownedPaths":["src"],"dependsOn":[],"instructions":"Implement the requested change",
      "setup":[],"assembly":[{"tool":"bun","args":["run","build"],"owners":["app"]}],"phases":[]
    }],
    "setup":[],"assembly":[],"blockers":[],"notes":[]
  }
}
```

The example is structural: replace the persona and build command with actual preflight facts.
`requirements` is optional. Execute mode enforces a parallel-by-default floor of 2 writer areas;
explicit `{"minimumAreas":N,"areaCounts":{"frontend":2,"backend":2}}` raise or lower it — use
`"minimumAreas":1` only when the task genuinely has one lane, and record the justification in
plan notes. Verification-only areas never satisfy implementation counts. `startedAt` is
optional and only accepts an actual supplied request timestamp; otherwise launcher time is labeled.
`workspaceRoot` defaults to repoRoot; nested roots are resolved deterministically. Instruction paths
are absolute existing files. Missing plan is an error. No arbitrary helper/function source fields.

Selection: `{name,authorization,mode?:"once"|"rounds"|"until-clean",rounds?:number,fixFindings?:boolean}`.
Default once. `rounds` is a positive integer only with mode rounds. `audit` and
`unit-tests` support explicit bounded/until-clean policies. Other pieces are one-pass observations.
Repairs need explicit user authority and `fixFindings:true` in both selection and local phase;
read-only verification areas cannot edit product source. Until-clean stops on clean or no changed
progress; no arbitrary numeric cap. A once audit is one round across assigned scopes, not duplicate
local and whole-project audits of the same paths. End incomplete when requested checks fail or
finite evidence is invalidated, rather than expanding rounds. No automatic escalation to MAX.

## RunPlan (all arrays required)

- `sharedContract:string`: compact shared API/types/file owners; reference brief instead of rewriting it.
- `areas:AreaPlan[]`, `setup:CommandPlan[]`, `assembly:CommandPlan[]`, `blockers:string[]`, `notes:string[]`.
- `AreaPlan`: `{id,title,domain?,personaPath,ownedPaths,dependsOn,instructions,setup,assembly,phases?,role?}`.
  IDs are unique lowercase/hyphen strings. Domain labels are optional, user-relevant, arbitrary
  (`frontend`, `backend`, `storage`, `native-ui`, ...). personaPath is an absolute actual agent
  definition with name/model frontmatter, never SKILL.md, a symlink, or a guessed path.
  ownedPaths are disjoint safe relative files/directories; a trailing slash is normalized.
  `role` is implement (default) or verify. dependsOn names area IDs truly needed BEFORE source work.
- `AreaPhase`: `{id,kind,commands,personaPath?,instructions,dependsOn?,resource?,fixFindings?,cleanup?}`.
kind is a selected piece other than planning. Instructions cite actual scope/authority
and acceptance criteria. Phase dependencies delay only that check, not its source writer.
Interactive/vision phases require a persona, exclusive lowercase resource ID and cleanup.
Unit tests may omit a judgment persona when executable assertions suffice. Other checks need one.

First-draft checklist (the six recurring shape traps; satisfy these BEFORE the first
prepare-run invocation so assembly compiles in one shot):
- Phase `cleanup` is a `CommandPlan[]` array like `{"tool":"bun","args":["scripts/x.ts","--cleanup"],"owners":["helper"]}`
  — never a string. Omit it on non-interactive phases rather than stubbing it.
- Phase `dependsOn` names AREA IDs only. Phases run in their array order within an area: order
  sibling checks (e.g. browser journeys before web-vision) by position, not by phase ID.
- Behavior/capture phases (browser, tui-tests, web/native/mobile-vision) need nonempty executable
  `commands` in the first draft. Assign the committed helper script (capture, preview, smoke) to
  a writer/helper owner area as its deliverable and reference it in the phase.
- `requirements` lives at the request top level, a sibling of `plan` — never inside `plan`.
- Repair authority and the verify role are exclusive: an area holding any `fixFindings` phase
  must NOT be `role:"verify"`. Authorized until-clean repairs live in implementation-role areas
  (or as local phases of the owning writer); read-only verify areas report findings only.
- Verify-area `setup` stays empty — the engine provisions the environment from the merged
  manifests. No hand-rolled provisioning (pip/venv/npm installs) in verify setup, no shell
  wrappers (`sh -c`, `bash -n`) anywhere in setup/assembly/commands — invoke tools directly
  (e.g. `node --check`, `bun build --outfile /dev/null`) — and Git is never a command tool.
- `CommandPlan`: `{tool:string,args:string[],owners:string[]}`. All owners are nonempty exact area IDs,
  including candidate commands; no engine/global placeholder. Existing executable/script names,
  no inline eval, shell wrappers, Git commands or direct test runners in setup/assembly.

The engine owns commands and works in each worktree's cwd. Area setup precedes only that writer,
concurrently with other area setup. Candidate setup runs after merging, before integrated assembly.
Do not share writable node_modules, Cargo targets or data between worktrees. Required compiler
assistance on edited files is allowed; writers do not duplicate install/build/test gates. Every
new test/capture/lifecycle helper must have an implementation owner and real committed path.
For new apps agree a small contract and single scaffold/manifest owner; bootstrap is a dependency
only for code that genuinely cannot start without it, and the scaffold owner never absorbs feature
implementation — feature areas code against the shared contract in parallel. Plan notes must include
the lane map: which areas run concurrently after their dependencies and the expected critical path,
so the coordinator can see the parallelism at submission. No speculative tool installs or hidden QA.
A zero-exit incremental build is valid; cold builds/cache clearing require actual user scope.

## Examples of real parallel ownership

A helpdesk can have ticket-list UI, ticket-detail UI, ticket API/storage, and comments/activity API
owners. Shared API schema and root manifests have one owner; all four can code against the shared
contract. Do not make the frontend wait for a backend build merely because the integrated check
needs both. A helper owner can implement isolated browser/PTY scripts alongside product writers.

A `role:"verify"` area can depend on app owners and helper owner, merge their actual commits and
run requested checks without a writer — use it for checks that inherently cross lanes (integrated
browser journeys, whole-app visual pass); per-lane audits and unit tests belong as phases on the
implementation areas instead. Its ownedPaths cover only evidence/helper namespaces.
It reports actionable defects, not unrestricted source fixes. Audit areas and browser/vision
areas can run independently once their own inputs exist; the same browser/PTY resource serializes
capture/actions but releases before image interpretation. Helpers must use owned process IDs,
isolated loopback ports/session labels, readiness signals, ignored evidence and cleanup on failure.
Never kill other sessions/processes or inspect unrelated desktop content.

For visual checks assign capture helpers to a writer and pass actual screenshot paths to Flash
HIGH. For TUI checks use tui-use start/wait/type/press/snapshot with explicit session IDs, machine
assertions and persistence fixtures, then owned cleanup. Missing image capability, permission,
preview readiness, actual device or assertion evidence is a blocker, never an invented pass.

AuthorResult is brief data: status, scriptPath, repoRoot/workspaceRoot, captured baseCommit/branchRef,
selected piece keys, actual phase labels, area IDs/domains/dependencies, blockers and notes. The
assembler is authoritative about the generated phase list. Phase count does not prove concurrency:
implementation dependencies and live trace events establish that later. Separate preparation,
confirmation/platform delay and execution timings. Do not describe planned checks as performed.
