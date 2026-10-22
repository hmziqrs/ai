# V3 design evidence and evaluation

Read when comparing workflow behavior; not a required preparation stage.

## Observed comparison, 2026-10-19, Asia/Karachi

Read directly from ZCode SQLite in read-only mode. Original root session:
`sess_3b36b859-4042-4782-bd55-a550a199e9ce`; V2 root:
`sess_70d4bbf5-f9d1-4b9f-9f80-af015ba91956`. Both received identical TASK.md and
baseline commit `45aa815120ccbed8f356c31184989dbbb5534ba8`, in separate repositories.

At 13:31 PKT neither task had returned success. Original execution, launched 12:43:34,
was in its second audit round. V2's latest amended execution, launched 12:18:56 after
previous versions, was in browser QA round 3. These are snapshots, not final outcomes.

| Observation | V3 response |
|---|---|
| Original prepared a script by 07:22, but a 07:28 launch call remained pending until 12:38 and returned a schema error; real execution began 12:43 | Record queue/tool waiting separately; concrete ask interfaces and literal commands; no claim that this was model thinking |
| Original generated 1,282 lines, serialized backend then frontend, and planned up to five heavy audits | Preserve proportional planning and explicit joins, replace file-count review multipliers with actual risk; concurrent independent implementation |
| V2 used 475-line preparation and 1,799-line latest execution; preparation required six script-review rounds | One author gathers/synthesizes/plans; no saved preparation engine or mandatory synthesis/review chain |
| V2 scouts genuinely overlapped at 07:01:36; API/UI implementers both started 09:19:59 | Retain explicit Flash/Pro HIGH model overrides and real lane concurrency |
| V2 reached execution at 09:19:55 but had six execution versions by 13:31, including incomplete results and one supersession | Preserve valid evidence across amendments; repair control flow rather than repeating verified work |
| Informational "None blocking" text was treated as a blocker; a grep exit 1 meaning no matches appeared as failure | Separate typed notes/blockers and encode the command's actual pass predicate |
| Read-only tracer was required to independently reproduce port-bound behavior it lacked authority to run | Script-owned runtime checks; narrow actor authority; do not turn absent observation into a product failure |
| UI correction was sent to API owner, followed by ownership exceptions | Route by affected paths and contract, not keyword/prose guesses; concurrent disjoint fixes |
| UI fixes could restart browser/visual/smoke/final-review chains; commit caused repeated gates | One ledger and dependency-based invalidation; preserve checks for unchanged inputs |

V2 actor settings inspected earlier: 13 Flash HIGH and 27 Pro HIGH actor records; no MAX
observed then. Original execution planner/judge used Pro MAX. Counts are time-bound and
include preparation/revision actors, not a final efficiency score.

V3 is a hypothesis until measured on a new isolated run. Local helper tests establish
model-selection behavior, not end-to-end ZCode performance or product correctness.

## Matched evaluation

Use a new repository copied from the original comparison's untouched seed, including the
same TASK.md, dependencies, baseline commit and project-local specialist/domain skills.
Leave both existing sessions unchanged. Open a fresh ZCode session so installed V3 is indexed.
Use the same coordinator model/thinking and permissions as the comparison. Prompt:

> Use $z-workflow-v3. Read TASK.md and complete the task in the current repository.
> Execute the workflow, verify the app, and report actual timings and results.

Only the skill token changes. Do not add coaching or a prewritten implementation to V3's
prompt. Capture actual modelSelection reasoningLevel from actor messages; resolved_model
alone omits thinking. Record session/run IDs and times for preparation, first runnable,
integration, verification, corrections and delivery. Count asks, repeated checks and
amendments. Inspect actual code, API behavior, persistence and browser interactions in
isolated test data after completion. Lifecycle completed alone is not success.

Compare first-runnable and verified-complete wall time, defects found/missed, number of
productive versus orchestration corrections, and resource waiting. Concurrent runs compete
for resources; one trial cannot establish a general speedup. Do not change or retire an
older workflow based only on script length or a single unfinished comparison.
