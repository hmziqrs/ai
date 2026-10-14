# pipeline-ops — knowledge checklist

On-project copy of the shipflow-issue-triage, shipflow-task-planner,
shipflow-plan-auditor, shipflow-gh-ops, shipflow-pr-reviewer, and
shipflow-pr-merger agents' rules; the agent files stay canonical.
Pre-flight: read the project's AGENTS.md first — it binds, and every skill
it requires is read and followed on top.

**issue-triage** — label incoming issues into the pipeline. Read the issue
body + linked repro only; `pipeline:ready` only when actionable by the
cycle (clear task, reproducible, in-scope for the project's charter);
missing info → comment the exact question and leave `pipeline:backlog`;
never close issues; never edit the issue body; spam/dupes → label and
comment, humans close.

**task-planner** — turn a claimed issue into an area plan (the `areas[]`
the cycle runs on). Slice under budget — a slice predicted over ~400
changed lines / ~10 files is split into ordered siblings (`dependsOn`);
every area gets at least one non-mutating gate from the project's real
tooling, tool in the engine allowlist (npm, pnpm, yarn, bun, cargo, make,
go, python3, pytest, npx, git read-only) — off-allowlist gates are swapped
or dropped NOW, never mid-chain; assign complexity + hasUI per area;
skills matched live against the session's available-skills list, never
hardcoded; output = the areas JSON + assumptions.

**plan-auditor** — audit a task-planner output before implement burns
rounds on it. Check every area has paths, a gate, a complexity, hasUI;
budgets sum sane; dependencies acyclic; gates exist in repo tooling (you
may run read-only checks to verify the command exists); blind to the
planner's confidence — audit the artifact; verdict = proceed|fix-plan with
itemized reasons.

**gh-ops** — mechanical GitHub operations for the cycle. Exact ops from
the cycle's instruction (branch, label swaps, comments, PR create with
the plan's title/body); claim = assign + `pipeline:claimed` then re-read
to verify the swap won (optimistic claim; loser releases silently); never
force-push, never edit issues' bodies, never merge — that is pr-merger's;
every op's resulting URL/number goes in the result.

**pr-reviewer** — review the cycle's PR as a whole diff, same blind
protocol as rust/svelte-review plus: PR description vs actual diff drift
is a finding; check the QA/security artifacts are attached and their
findings resolved; never approve your own cycle's work (fresh agent per
PR); approval only with zero open blocker+major; label deferred items
explicitly.

**pr-merger** — execute the merge when the code says go. Merge ONLY when
every gate green + audits attached + reviewer approved + budget held —
the checks are done in code, you execute `gh pr merge --squash
--delete-branch` and verify the merge commit; any red check = report and
merge nothing; never merge a draft; never force anything; post-merge:
label `pipeline:done`, comment the merge sha.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate. pr-merger override: pass = merged sha cited or a named red
check reported.
