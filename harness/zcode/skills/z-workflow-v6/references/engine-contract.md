# V6 engine contract

The scheduling reference is the pre-retirement engine at Git commit `af931eb`, path
`harness/zcode/workflows/zflow-engine.dwf.ts`, especially lines 665–1043. Its stage consumers
started per-item futures immediately and closed only after every area was terminal. This
allowed one area to advance into vision/checking while another still implemented. Liteflow's
single-area template is not this engine. Historical sources are development evidence, not
runtime dependencies or installation sources.

V6 preserves independent area progression and awaited completion using one async task per
area. It does not restore the historical native-channel implementation. The October 20
channel/future restoration stalled inside CreateWorkflow before any run was created, and
ZCode's watchdog recycled the process. V6 retains the successful flat scheduler from V5.
Keep phase iteration inside each area's task; no channel consumers or feedback-queue cycles.
The local checker rejects channel/future calls before submission. Local execution tests and
TypeScript checks alone do not validate ZCode's graph analyzer.

V6 removes the historical mandatory per-area planner/reviewer, fresh judges/confirmers, duplicate gates,
default vision, model-generated commit messages and arbitrary size/round budgets.

The launch input is data: repository, verbatim task, instruction paths, clean base HEAD/full
branch ref, start timestamp and this skill's absolute root. One persistent read-only Pro HIGH
configurator returns the concrete manifest requested by the engine. Validate area IDs,
ownership, personas, commands and dependency edges before creating worktrees. Unknown/cyclic
dependencies are errors, not edges to silently discard. Normalize one harmless directory
trailing slash before overlap checks; never normalize away traversal or .git components.
Report the exact field/value on invalid configuration. Valid .gitignore/.github paths are
not .git. One targeted retry reuses the configurator context; a second invalid manifest ends
incomplete before any worktree creation. No unconditional configuration review is added.

Assembly names existing setup/build commands, not generated inline programs or shell
wrappers. HTTP assertions and CRUD/persistence smokes are tests regardless of file layout.
An implementation dependency is required code/input, not a project-wide check scheduled later;
put such checks at their real integration join. The engine executes assembly, not implementers.
Each separate worktree needs its own dependencies; a sibling install does not supply them.

An area waits only for its actual inputs. Its persistent specialist implements in its own
worktree, then that area advances through its necessary assembly and explicitly requested
checks. Independent areas continue on success, correction and failure paths. A failed area
blocks its consumers; it does not suppress unrelated work. Requested read-only checking sees
a stable area revision. A correction invalidates only evidence affected by that revision.

Git mutations serialize and check exit codes. Stage explicit owned paths, preserve partial
results, and abort only a conflicted merge the engine started. No hard resets, clean, stash,
rebase, blanket staging, forced operations, hook bypass, push or branch deletion. A command
failure is evidence of that command's failure, not an invitation to weaken its checks.

Tests/vision/audits have no default rounds. Requested check failures are reported; only
authorized fixes or own blocking implementation/assembly corrections return to the persistent
owner. No changed progress or a concrete external blocker ends the affected work incomplete.
Whole-app assembly consumes the compatible integrated candidate, not the user's checkout.

The engine never performs final delivery. The coordinator checks completion, candidate and
destination cleanliness, captured branch/HEAD and delivery authority, then uses an ordinary
fast-forward only. Delivery does not itself require running passed checks again. Keep branch,
worktree, exact command results, failures and skipped scope in the return value.

For engine maintenance only, the local `platform-facade.d.ts` and installed checker provide
mechanical checks; ZCode's current live compiler/API remains authoritative. Ordinary task
configuration does not load workflow-authoring documentation or generate executable code.
