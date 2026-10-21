# V4: small execution graph

The user chooses scope; the actual dynamic-workflows contract governs syntax/tools. Start
with the smallest graph that delivers the requested behavior. No plan review, plan attack,
file-count risk router, mandatory panel or nested preparation/audit controller.

## Area state machines

| State | Action / transition |
|---|---|
| ready | Shared inputs and owned paths are available: dispatch its persistent implementer now. |
| implementing | Implement requested behavior; return changed paths, interface output and assembly needs. |
| assembling | Produce the requested artifact and integrate compatible outputs. No audit/test stage by default. |
| waiting | Await only the named missing input or contested resource, then resume this area. |
| blocked | Record exact execution failure and partial work; other independent areas continue. |
| done | Requested output assembled and available to its consumers or delivery. |

When explicitly requested, add a checking state for that check, or a correcting state for
that authorized fix. Do not smuggle a default QA loop into assembling. One persistent actor
per writing area; multiple asks on one actor are FIFO, not parallel workers. Start independent
futures/asks before awaiting the set, and name each join's actual consumer. Separate areas
by independent behavior and owned outputs, not by directory count or code/tests/docs splits.
No saved engine: the author writes these transitions into a fresh task-specific script.

The body is direct task wiring: concrete setup commands, named persistent owner asks,
actual joins/integration, required assembly and a compact return. Do not design a reusable
gate dispatcher, repair framework, general server supervisor or speculative failure graph.
Route a real blocker to its existing owner when it occurs; disjoint blockers stay parallel.
Keep explicit Git exit checks and checkout guards without inventing a general Git library.

Examples: backend/UI implement against a frozen response shape in parallel; native domain
logic/views implement against a shared Rust interface. A completed backend need not wait for
an unrelated view to assemble. A shared-type change is a real coordination edge. Concurrent
writers use separate run-owned worktrees; an integration worktree is needed only when outputs
must merge. Give shared manifests/types one owner. Bootstrap/setup finishes before consumers
that need it; it is not repeated for each area. Each worktree needing generated dependency
files gets a writable local dependency location; do not symlink its entire node_modules to
another checkout. Cached package installation is setup, not an unsolicited dependency change.
Git/index mutations and shared devices serialize. Independent code work continues while a
device is occupied.

## Completion and bugs

Normal implementation includes completing the requested paths, wiring consumers together,
and resolving blocking mistakes in that work. The required build/package operation is
assembly, not permission to run a test suite. For a source-only or planning deliverable,
include no build or server. For a runnable app, use its real build/start command as needed
to produce the deliverable; no unsolicited endpoint matrix, browser journey or restart loop.
Do not require both dev and production boot, a second build or process-management experiments
by default. A server consumer is needed only when the requested deliverable/check needs it.
If it fails, route the concrete assembly blocker to the existing owner. Disjoint blocking
fixes run concurrently. Do not repeatedly regenerate the orchestration script to fix product
code. When a diagnosis yields no viable next step or an external prerequisite is missing,
report that area incomplete with evidence instead of looping blindly.

Do not investigate or repair incidental bugs, refactor unrelated code, tune aesthetics or
expand acceptance criteria unless requested. A casually observed issue is recorded as an
observation with location/evidence, not dispatched to a new reviewer. Do not fix known
out-of-scope concerns behind the user's back or hide known in-scope failures as untested.
If testing/auditing alone is requested, findings are the deliverable; fixes need authorization.
No fixed correction cap for authorized work, but no mandatory correction/review cycle either.
Do not restart passed areas because another area's check failed.

## Opt-in checks only

Explicit user scope may request build + tests, browser QA, an audit, screenshots, or an
iterative bug-fix campaign. Include exactly that scope and actual project-mandated checks;
"polished", "complete", or choosing a UI framework do not authorize an audit program.
Use concrete existing checks rather than making up a separate checker for each requirement.
The script owns full-suite execution; implementers/reviewers don't independently rerun it.
API checks, browser QA and independent review overlap on a frozen candidate where their
inputs exist. Isolate databases/ports/browser sessions and generated output. An exclusive
native device serializes only its device lane. A review can start from a stable diff while
unrelated checks run; its visual portion waits only for actual rendered evidence if requested.
One requested check does not authorize a panel, blind audit plus visual verdict, confirmer,
or blanket recheck. Recheck affected inputs after an authorized fix; retain valid evidence
for unchanged behavior. Missing required evidence is reported, never converted into a pass.
Optional prose such as "None blocking" belongs in notes, not a blocker array.

## Keep authoring and execution reliable

Author only the new task body; scripts/assemble-script.ts attaches the unchanged local
canonical persona kit and model helper as data, then runs the checker once. It has no saved
task body, execution topology or runtime engine. Keep the body as the editable source and
the assembled file as the launch artifact; reassemble after edits. Neither helper source
nor checker implementation needs to be read for ordinary use. Load the live API contract
once in the context authoring the graph; use this skill's references/platform-facade.d.ts
directly for declarations. The dispatch supplies absolute local paths, plus the real bundled
reference path/excerpt for any further live API requirement. Do not discover platform docs
by searching other workflow versions or the entire installed skill collection.
Select tier/thinking/access explicitly. Domain personas provide expertise; V4 overrides
their default MAX and any task-inapplicable workflow ceremony. Read-only actor prompts
prohibit source/external writes; use guardWrites on their frozen workspace, with no writer
active there. This is detection, not a sandbox. Capture gets only explicitly requested
session/evidence/test-data authority. Subagents never run Git mutations or nested workflows.

Use concrete JSON interfaces at branching `ask<Interface>` sites, not generic `ask<T>` wrappers.
Keep outputs narrow: changed paths, deliverable, blockers, notes. Preserve full logs at paths.
Literal `world.run` executable; data in args. Omit options when absent, never pass null or
undefined as the third argument. Bun read-only helpers disable project config/env autoload.
Normal application execution keeps its needed environment. Parse Git NUL records without
trimming away status prefixes. Read every nonzero exit and preserve partial results.

Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/assemble-script.ts <body.ts> <workflow.dwf.ts>`;
it uses the installed checker/compiler without a network fetch. Do not run the checker again
on unchanged assembled bytes or echo the full script through the coordinator. Submit the
artifact through CreateWorkflow's `path` field. The live platform compiler is authoritative.
A mechanical diagnostic goes back to the same author for a targeted patch, never a fresh
plan-review cycle. Use documented amendment/resume and
cache semantics; don't copy old cached "passes" onto changed inputs. Keep model/authorization
history across amendments, including consumed MAX attempts. For MAX select one targeted Pro
actor for one ask; subsequent work returns to HIGH. A new escalation needs two new failed HIGH
corrections on the same criterion. No MAX for the default incidental-bug handoff path.

Server helpers use an owned PID, asynchronous subprocesses, a readiness signal and finally
teardown. Do not await a blocking server holder before starting its consumer. Do not kill by
broad process name. Do not disable CSRF/origin checks to accommodate a probe; preserve normal
security defaults and use a correctly formed client request. Permission/tool failure is not
an application defect or reason to give unrelated agents broader write scopes.

## Delivery

Workflow scripts write run-owned worktrees, stage explicit intended paths, commit lane
results for integration, and integrate through one serialized Git chain. Check exit codes
before dependent mutations. Never hard-reset/restore/clean, force-remove, delete branches,
stash, rebase, blanket-stage, bypass hooks, push or overwrite another writer's work. On a
script-started merge conflict abort that merge, retain work and report; no forced strategy.
Cleanup only clean run-owned worktrees whose work is safely integrated; preserve incomplete work.

The coordinator alone delivers after writers finish and result is committed/clean. Guarded
fast-forward requires authorization for local implementation, no review-first/no-merge
request, and the same clean user checkout HEAD/full branch captured before launch. A dirty,
detached or changed destination stays untouched. Assembly and expressly requested checks
must apply to the integrated result; no new tests or QA are added as a delivery precondition.
Use `merge --ff-only`; if it fails retain the result and report the exact handoff problem.
If the task explicitly requests handoff checks, run them once there. Do not rerun a whole
suite merely because a commit/fast-forward preserved its tested inputs. Never auto-undo a
failed handoff. No extra approval question for already authorized reversible local work;
actual permission flow and user review-first instructions still apply.

Keep reports/timing files inside the workspace for artifact publication. If the user asks
for a copy outside it, return the path and let the coordinator write the authorized copy;
do not grant parent-directory writes to implementers or restart QA for artifact-copy errors.
The handoff names requested outputs completed/incomplete, build/assembly result, only the
checks actually requested/run, skipped optional checks as not requested, known observations,
models/thinking, branches/paths and delivered/deferred state. No "all bugs fixed" claim.
