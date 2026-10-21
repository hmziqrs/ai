# V9 authoring contract

Read this file once. Use the maintained helpers as commands, without reading their internals.
The author is Flash HIGH, outside the workflow. It owns one compact plan and assembly; the
coordinator owns CreateWorkflow/approval/delivery. Product writers remain Pro HIGH. The engine
accepts this exact plan, so do not hand off another discovery/planning task after preparation.

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
| Review the plan before coding | `planning` + `plan-audit` | A real pre-writer gate, not `audit` |
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
with planning and optionally plan-audit; put the compact plan in notes, no areas/setup/assembly.
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
`requirements` is optional, only when the user requests area/domain counts; for example
`{"minimumAreas":4,"areaCounts":{"frontend":2,"backend":2}}`. Those counts are not defaults. Verification-only areas never satisfy implementation counts. `startedAt` is
optional and only accepts an actual supplied request timestamp; otherwise launcher time is labeled.
`workspaceRoot` defaults to repoRoot; nested roots are resolved deterministically. Instruction paths
are absolute existing files. Missing plan is an error. No arbitrary helper/function source fields.

Selection: `{name,authorization,mode?:"once"|"rounds"|"until-clean",rounds?:number,fixFindings?:boolean}`.
Default once. `rounds` is a positive integer only with mode rounds. `audit`, `plan-audit` and
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
  kind is a selected piece other than planning/plan-audit. Instructions cite actual scope/authority
  and acceptance criteria. Phase dependencies delay only that check, not its source writer.
  Interactive/vision phases require a persona, exclusive lowercase resource ID and cleanup.
  Unit tests may omit a judgment persona when executable assertions suffice. Other checks need one.
- `CommandPlan`: `{tool:string,args:string[],owners:string[]}`. All owners are nonempty exact area IDs,
  including candidate commands; no engine/global placeholder. Existing executable/script names,
  no inline eval, shell wrappers, Git commands or direct test runners in setup/assembly.

The engine owns commands and works in each worktree's cwd. Area setup precedes only that writer,
concurrently with other area setup. Candidate setup runs after merging, before integrated assembly.
Do not share writable node_modules, Cargo targets or data between worktrees. Required compiler
assistance on edited files is allowed; writers do not duplicate install/build/test gates. Every
new test/capture/lifecycle helper must have an implementation owner and real committed path.
For new apps agree a small contract and single scaffold/manifest owner; bootstrap is a dependency
only for code that genuinely cannot start without it. No speculative tool installs or hidden QA.
A zero-exit incremental build is valid; cold builds/cache clearing require actual user scope.

## Examples of real parallel ownership

A helpdesk can have ticket-list UI, ticket-detail UI, ticket API/storage, and comments/activity API
owners. Shared API schema and root manifests have one owner; all four can code against the shared
contract. Do not make the frontend wait for a backend build merely because the integrated check
needs both. A helper owner can implement isolated browser/PTY scripts alongside product writers.

A `role:"verify"` area can depend on app owners and helper owner, merge their actual commits and
run requested checks without a writer. Its ownedPaths cover only evidence/helper namespaces.
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
