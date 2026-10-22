# V3 execution contract

Author a fresh task-specific script, never a saved engine or a copied prior run. The actual
platform contract governs supported APIs and syntax. This file owns V3 execution policy.

## Keep the critical path short

Resolve shared inputs first, then start all ready work. Express each join by its consumer
and missing input, not a blanket phase barrier. A backend and frontend can implement against
an agreed contract; a mobile data layer and views can do the same. Do not force web-shaped
lanes onto native projects. Existing projects skip bootstrap. A new project bootstraps once,
then freezes baseline/shared manifests before independent writers begin.

Use one run-owned worktree per concurrent writer, plus integration when needed. Persistent
implementers own coherent behavior including its tests. Give shared files one owner; contract
changes are explicit coordination edges, not permission to write through another owner.
Allow small deterministic bootstrap/integration helpers; do not build a general process
supervisor, custom merge engine, or separate correction controller per verification stage.
Kit/helper lines are fixed overhead. Remaining logic should describe this task's lanes,
checks and findings. Remove repeated scaffolding and copy-pasted lane controllers; prefer a
shared *task-local* routine where supported. No hard script-length gate or arbitrary role quota.

## One candidate, concurrent verification

Commit/integrate compatible lane work, then freeze the candidate while independent readers
verify it. Launch checks with `future`/`Promise.all` before awaiting the set. Each ask needs its
own actor; multiple asks on one actor queue rather than run concurrently. Examples:

- API tests and browser QA can run concurrently on independent database copies and ports.
- Code review can start as soon as a stable diff exists; screenshots are required only for
  its visual judgment. It need not wait for unrelated tests or repeat their work.
- Type checking, build and tests overlap only if their generated files, setup and resources
  do not conflict. Serialize sync/code generation before consumers when the stack needs it.
- A blind Flash screenshot observer, when warranted, starts once images exist alongside
  unrelated code/API checks. Its prompt contains only images, state, viewport and criteria.
- One desktop/mobile/TUI device is exclusive. Other code/API checks continue concurrently.

No default requirement for lane tracer + lane reviewer + visual judge + final judge +
confirmer. Use one focused independent Pro HIGH review for the integrated candidate, with
specialist expertise where needed. Extra reviewers need a distinct consequential risk or
explicit task requirement. A testable finding gets one independent targeted reproduction;
a deterministic script gate already confirms its own result and needs no confirmer actor.

Source-read-only review uses `guardWrites` on its frozen worktree with no concurrent writer.
Independent readers can share that frozen source. QA receives explicit authority for its
browser/device session, evidence directory and disposable test data, not source edits.
If tests generate files, assign an isolated verification worktree/copy or finish setup before
source guards; do not mislabel expected generated output as unauthorized source edits.
A read-only tracer cannot be required to bind ports while forbidden to bind ports: script-owned
runtime checks provide that evidence. Distinguish not observed from an actual product defect.

Servers must be alive while checked. Prefer a single Bun helper that asynchronously starts
the server, waits for readiness, runs automated checks/capture and tears down in finally.
For interactive QA use documented concurrent futures with a readiness signal and scoped
teardown after the actor finishes. Never await a blocking server holder before starting its
consumer, block its event loop with synchronous subprocesses, or kill processes by broad name.
Every server has a unique port, test database and owned PID. A held port, tool failure or
resource prerequisite becomes a precise infrastructure finding; unrelated lanes keep working.

## One findings ledger and targeted feedback

Maintain one task-local ledger: stable criterion ID, affected paths, owner, materiality,
evidence label, resolution check, status and correction attempt history. Merge duplicate
reports of the same defect. Notes and uncertainty live separately from actual blockers.
Use structured arrays; no parsing prose such as "None blocking" into a fatal control flag.
Treat malformed output as a schema repair, never as success. Keep ask outputs narrow and
concrete; put long evidence at paths. Do not ask a scout to return the complete plan schema.

After results arrive, close reads and start corrections. Partition by affected files and
contract, not prose regexes. Dispatch disjoint API/UI or native/domain corrections together.
For overlapping/shared-file fixes, coordinate with their explicit owner first. Never widen
another implementer's ownership just to avoid routing a finding to the correct implementer.
Parallel correction writers need independent worktrees or truly isolated writable resources;
Git/index mutation remains serialized. Integrate fixes once, then recheck.

A check's evidence records its source revision (or exact file fingerprint), inputs, command,
exit status and resources. Reuse it only while its relevant inputs remain unchanged:

| Change | Typical invalidation |
|---|---|
| CSS/layout only | Affected viewport screenshots/layout checks, UI judgment, required build |
| Backend persistence/query | Database tests, API checks and relevant integration journeys |
| Shared response/type | Both consumers' checks and integrated journeys |
| Runtime config/dependencies | Build/startup and affected API/browser checks |
| Docs only | Relevant docs checks; no new CRUD walk |

These are examples, not automatic exemptions. Follow actual dependencies and required repo
checks. Fresh reviewers for changed code get task/diff/current evidence, not implementer
reasoning or prior verdicts as authority. Unchanged independently reviewed behavior need not
be reviewed again. A complete required gate suite runs on the final integrated candidate;
if no relevant input changed since a recorded pass, do not rerun it just because another
stage completed or a commit was created. A commit hook, generated output or environment
change that changes those inputs invalidates the pass.

Continue only against concrete unresolved material findings. No numeric correction/audit
cap; no mandatory second clean round. For repeated failure change the approach or identify
the missing prerequisite. MAX is eligible only under local model helper evidence rules and
only for the responsible Pro problem solver. Give each MAX actor one targeted ask only;
select a new HIGH persona for subsequent work rather than retaining that MAX actor. Keep
criterion IDs and round numbers stable across amendments. Persist consumed MAX evidence
in the findings report and restore it into `v3Escalations` before any new actor selection
after an amendment that changes the execution path; task-local memory alone cannot
reconstruct omitted history. Do not reset the ledger to gain eligibility. Reused evidence is rejected by
the helper. After that attempt return unrelated/subsequent
work to HIGH; another MAX selection needs a new pair of failed HIGH corrections. Success
requires passing required checks and evidence-backed disposition of material uncertainty.

## Compiler and persona mechanics

Paste local canonical `persona-kit.dwf.ts` unchanged, then local `model-policy.dwf.ts`
unchanged. Use explicit tier/access through `v3Persona` and `v3Agent`, no hand-written loader.
Do not alter the canonical kit to optimize this experiment. Domain expertise comes from
project-local personas; V3 controls their model/thinking and scoped authority. Include paths,
hashes, selected models, `personaFindings`, and escalation records in reports. Persona tools
are advisory, not a sandbox; guards detect source/index/HEAD changes with documented limits.

Use `ask<ConcreteInterface>` with an actual plain JSON-serializable interface in the script.
Never place generic `ask<T>` inside a guard/helper and assume TypeScript acceptance proves
platform schema compatibility. Use literal `world.run` executables; runtime values are args.
Narrow result schemas: booleans, strings, arrays and concrete objects; explicit notes and
blockers. Test nontrivial parsers with actual output including modified/untracked paths.
Git porcelain parsing uses NUL records, not whole-output trim. Always inspect exit codes.
For read-only Bun helpers disable project config and env autoload; pass data as args. Do not
silently disable application environment loading for normal required application execution.
Local strict checking is not authoritative platform compilation. Repair precise diagnostics
with the persistent author; amendments preserve validated work only where inputs still match.

## Git, delivery and evidence

The script owns Git mutations and serializes them. Subagents do not mutate Git. Allowed:
read-only Git, create run-owned `wf/*` branches/worktrees, stage explicit intended paths,
commit lane results and integrate in a run-owned result worktree. Check every command before
its dependent mutation. On a script-started merge conflict, abort that merge, retain work
and report the conflict; do not force a resolution. No destructive reset/restore/clean,
force removal, branch deletion, rebase, stash, blanket staging, hook bypass or push.
Purity failures report exact paths, never revert changes. Keep incomplete branches/evidence.

Only the coordinator delivers, after writers finish and the verified result is committed
and clean. Automatic fast-forward requires authorized low/medium-risk local implementation,
no review-first/no-merge request, an unchanged clean user checkout (HEAD and full branch ref
match captured anchors), and all required checks valid for the combined committed result.
Detached/dirty/moved checkouts defer delivery. Use `git merge --ff-only`; stop on failure and
retain the result. High-risk delivery or review-first requires approval of the concrete
result; no-merge stays no-merge. Required post-delivery checks still run as an environment
handoff check. On their failure report delivery, old/new HEAD and diagnostics; do not auto-undo.

Required visible evidence comes from the actual rendered final relevant source, at
acceptance-relevant states/viewports, with files verified present. Use HTTP for module apps.
One combined independent reviewer can judge code and screenshots; commands prove behavior,
not aesthetics. Preserve screenshot freshness when relevant visible inputs change. Missing
required browser/device evidence is incomplete. Keep screenshots local. Publish a report
artifact where supported, also persist a report file so artifact publishing failure does not
erase the results. Artifact failure is not a product defect; report it as a limitation.

Return actual timings, criterion/check outcomes, finding history, tested revisions, screenshots,
actor model/thinking and authority, blockers/notCovered and branch/delivery status. Record
first runnable time separately from final verified completion. Preserve partial evidence on
exceptions through incremental report calls. Do not claim success from lifecycle "completed"
when the returned task status is incomplete.


## Timing and external report destinations

Keep the workflow's complete report/timing JSON inside its workspace and return the actual
absolute report path. Publish that workspace file through `artifact.file` when supported.
When the user explicitly requests a copy outside the workspace, the coordinator performs
that final file write/copy with its ordinary file tool after the run, using the authorized
absolute destination from the task. For a request for the parent comparison directory,
write `<parent>/<repository-folder>-timing.json`; preserve the workspace original. The
execution script never tries to publish an out-of-workspace file as an artifact, and no
implementation or QA actor receives unrelated parent-directory authority. Record both
paths and final copy outcome in delivery. Use the existing authorization; do not ask again
merely because the requested destination is outside the workflow artifact root. A file
permission failure is a report-delivery error with retained data, not a product defect or
reason to repeat implementation/browser QA.
