# V7 engine contract

V7 preserves the independently advancing, flat per-area scheduler. Its historical scheduling
reference is Git commit `af931eb`, `harness/zcode/workflows/zflow-engine.dwf.ts`, lines 665–1043:
areas advanced as their own inputs became ready. Historical sources are development evidence,
not runtime dependencies or installation sources. The native channel/future restoration
stalled CreateWorkflow's symbolic analyzer; never restore that feedback graph. Keep one
awaited async task per area and phase iteration inside that task. The checker rejects native
channel/future calls. Local TypeScript/tests do not replace live harness graph analysis.

The launch input contains repository, verbatim task, instruction paths, clean base HEAD/full
branch ref, start timestamp and this skill root. One read-only Pro HIGH configurator supplies
RunPlan. Normalize a single directory trailing slash, then validate shape, IDs, disjoint
ownership, absolute persona paths, command data and dependency DAGs. Never normalize away
traversal, .git components or overlapping ownership. .gitignore/.github remain valid paths.
Invalid configuration gets precise feedback and one same-context correction before writers;
a second invalid result returns incomplete. No unconditional configuration review runs.

Each area's task waits only for actual implementation inputs, creates its own worktree,
merges required inputs, runs its setup, then dispatches its persistent Pro HIGH specialist.
Setup runs independently across areas. Required local types/tools must exist before the writer
starts. Setup failure preserves partial state and blocks only affected consumers. Dependency
changes need explicitly assigned manifests/lockfiles and post-edit resolution commands.
The integrated candidate runs its own setup before assembly. No shared writable node_modules.

AreaWork reports implemented/blocked, changedPaths, a short summary, structured blockers and
observations. Concrete unmet input/permission/environment/implementation requirements block;
uncertainty or deferred engine checks do not. An implemented result proceeds directly into
assembly. A malformed/contradictory completion report gets one same-context clarification,
without tools or source changes. Never heuristically delete a blocker; a valid genuine blocker
still stops that area. An invalid second report leaves the area incomplete. Actual write
ownership is checked even when the report is malformed; invalid declarations never stage paths.

Engine code owns setup/install, project-wide assembly/checking and authorized optional phases.
Worker prompts and correction prompts carry this ownership. Compiler assistance required by a
framework skill is limited to changed files, without redundant clean passes. Explicit user
scope overrides broader check recommendations. HTTP/CRUD/persistence smokes are tests even
without test files. Setup/assembly rejects inline programs, shell wrappers and direct test
runners. This command validation applies to engine commands; shared agent runtime tools do
not provide a per-agent process sandbox. Do not claim prompt restrictions enforce a tool ACL.

Each area advances through its assembly and requested phases immediately, even while siblings
implement or correct. Requested evidence sees a stable area revision. Only affected revisions
invalidate earlier evidence. Exclusive capture/device locks release before image judgment.
Optional audits/QA/tests/vision are absent unless expressly authorized; only authorized fixes
or blocking own implementation/assembly corrections return to the persistent owner. No changed
progress, no viable correction or an external blocker ends affected work incomplete. There is
no numeric product correction cap or mandatory extra clean round.

Git mutations serialize and check exit codes. Stage only explicit owned paths, preserve
partial results, and abort only a conflicted merge the engine started. No hard reset, clean,
stash, rebase, blanket staging, force, hook bypass, push or branch deletion. Command failure
is evidence to correct, not permission to weaken a check. Whole-app assembly consumes the
integrated candidate, never the user's checkout. Return observations without lengthy duplicate
file inventories; they do not need separate reviewer/confirmation calls.

The coordinator alone may deliver a complete clean candidate through ordinary fast-forward,
checking both worktrees, captured branch/HEAD and existing delivery authority. Delivery does
not repeat passed gates. Report actual prompt timestamps separately from launcher timestamps,
and approval wait separately from tool execution. ZCode may apply tool.alwaysAsk in Full access.
Unexpected engine repairs use run-owned drafts plus AmendWorkflow and cached ask prefixes;
reusable behavior fixes go into the next numbered skill. Preserve every released version.
