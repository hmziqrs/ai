# Shipflow plan — the source of truth for the shipflow package

Landed by the research area. The three implementing areas build ONLY from this file.
Anything a deliverable needs that is not written here is a gap: stop and escalate rather
than invent. Platform facts in `harness/zcode/workflows/zflow-SPEC.md` section 1 are
ground truth over this plan if they ever conflict; `ai/AGENTS.md` conventions bind below
that. Nothing in any shipflow artifact may reference a global path (`~/.zcode`,
`~/.agents`, `~/.codex`, `$HOME`) — the package is per-project only.

Deliverable map: D1 = agent files (agents area), D2 = coordinator skill + INSTALL.md +
knowledge templates (skill area), D3 = `shipflow-queue.dwf.ts` (workflow area).
Count note: the task text says "19 agent files" but enumerates 20 names; the enumerated
list is normative — D1 lands 20 files.

## 1. Product shape

Shipflow is an autonomous dev pipeline installed INTO a project. The queue is that
project's GitHub Issues, driven by the `gh` CLI. Labels: `pipeline:backlog`,
`pipeline:ready`, `pipeline:claimed`, `pipeline:done`, `pipeline:failed`; pause =
`pipeline:paused` on the shipflow pin issue. Branch per issue `shipflow/issue-<n>`,
one PR per issue. The main agent running the skill is the chain coordinator: it loops
poll-run-relaunch; each workflow run does exactly ONE cycle; the watchdog cron and the
coordinator provide the infinity (never a loop inside a run — SPEC 1.2 no nesting, and
only the main agent launches workflows, SPEC 1.9).

## 2. Agent set (D1) — 20 files at `harness/zcode/agents/shipflow-<name>.md`

Frontmatter contract (per `ai/AGENTS.md:31-34` and the existing files): `name` (= file
stem), one-sentence `description`, `model`, `tools` (JSON array), `color` from
{red, blue, green, yellow, purple, orange, pink, cyan}, `thoughtLevel` from
{low, high, max}, and `injectAgentsMd: false` — false because the queue workflow injects
the AGENTS.md read-first line into every spawned ask itself (engine `agentsMd`
contract); harness-level injection stays off to avoid double injection.
Model strings: pro = `account:zai-individual-coding-plan/GLM-5.3`,
flash = `account:zai-individual-coding-plan/GLM-5.3-Flash` (as `general-pro.md:7`).

Shared body template (every file): `# <name>` skipped — body starts with the mission
line, then `Rules:` (5-8 hard bullets), then `Dispatch:` and `Pass/Fail:` sections:
- Dispatch: "Invoke by name via the Agent tool with: the task verbatim; absolute area
  paths; the read-first line (the project's AGENTS.md binds, its required skills are
  read and followed); evidence paths if any. Return: conclusion first, then evidence
  (absolute paths + line numbers), then open questions."
- Pass/Fail: "Pass = every rule above held, every claim carries cited evidence, gates
  green where applicable. Fail = any rule broken, any uncited claim, or a red gate."
  Per-agent overrides below replace this line only when noted.
- Workflow note (inlined once per file, last line): inside queue runs the persona is
  spawned with this mission+rules as its system prompt — the workflow inlines the text
  (no fs imports), so this file is the canonical wording both lanes keep in sync.

SQL parameter-binding rule (verbatim, in rust-impl, fixer, security-audit,
injection-auditor): "Every SQL statement binds parameters through the driver's bind API
(positional `$1`/`?` markers — rusqlite `query`/`execute` params, never `format!` or
string concatenation of user data into SQL). A string-built statement is an automatic
fail, even if escaped."

| # | name | model | level | color | tools |
|---|------|-------|-------|-------|-------|
| 1 | shipflow-rust-impl | glm-5.3 | high | red | Read, Edit, Write, Bash, Glob, Grep |
| 2 | shipflow-svelte-impl | glm-5.3 | high | orange | Read, Edit, Write, Bash, Glob, Grep |
| 3 | shipflow-fixer | glm-5.3 | high | yellow | Read, Edit, Write, Bash, Glob, Grep |
| 4 | shipflow-perf-engineer | glm-5.3 | max | pink | Read, Edit, Write, Bash, Glob, Grep |
| 5 | shipflow-copywriter | glm-5.3-flash | low | cyan | Read, Edit, Bash, Glob, Grep |
| 6 | shipflow-qa-writer | glm-5.3 | high | green | Read, Edit, Write, Bash, Glob, Grep |
| 7 | shipflow-rust-review | glm-5.3 | max | purple | Read, Bash, Glob, Grep |
| 8 | shipflow-svelte-review | glm-5.3 | max | purple | Read, Bash, Glob, Grep |
| 9 | shipflow-security-audit | glm-5.3 | max | red | Read, Bash, Glob, Grep |
| 10 | shipflow-injection-auditor | glm-5.3-flash | low | cyan | Read, Bash, Glob, Grep |
| 11 | shipflow-browser-tester | glm-5.3-flash | low | blue | Read, Bash |
| 12 | shipflow-vision-judge | glm-5.3-flash | high | blue | Read, Bash |
| 13 | shipflow-issue-triage | glm-5.3-flash | low | cyan | Read, Bash, Grep |
| 14 | shipflow-task-planner | glm-5.3 | max | purple | Read, Bash, Glob, Grep |
| 15 | shipflow-queue-monitor | glm-5.3-flash | low | green | Read, Bash |
| 16 | shipflow-gh-ops | glm-5.3-flash | low | blue | Read, Bash |
| 17 | shipflow-scout | glm-5.3-flash | low | cyan | Read, Bash, Glob, Grep, WebFetch |
| 18 | shipflow-plan-auditor | glm-5.3 | max | purple | Read, Bash, Glob, Grep |
| 19 | shipflow-pr-reviewer | glm-5.3 | max | purple | Read, Bash, Glob, Grep |
| 20 | shipflow-pr-merger | glm-5.3-flash | low | green | Read, Bash |

Per-agent mission + rules (5-8 each; Dispatch/Pass-Fail per the shared template):

1. **rust-impl** — Mission: implement planned Rust slices in the queue's project repo,
   smallest coherent change per round. Rules: follow the plan's slice only — no drive-by
   edits outside area paths; run nothing mutating except through the cycle's gates
   (never git); SQL parameter-binding rule (above); errors handled with `thiserror`/
   `Result`, no `unwrap` on fallible IO; no `unsafe` without a SAFETY comment and a
   gate-covered test; public APIs carry doc comments; match `cargo fmt` output shape;
   report half-done work honestly — it stays on disk and is listed.
2. **svelte-impl** — Mission: implement planned Svelte/UI slices. Rules: Svelte 5 runes
   (`$state`/`$derived`/`$effect`) — no legacy stores for new code; components under the
   area paths only; props typed, no `any`; a11y basics (labels, focus, alt) on anything
   interactive; no inline styles where a class exists; i18n strings via the project's
   copy module, never hardcoded when one exists; never run git; report half-done work.
3. **fixer** — Mission: apply CONFIRMED findings from judge rounds to code you may not
   have written. Rules: fix only the attached findings — adjacent smells are reported,
   not fixed; preserve the implementer's intent, ask-verbatim quotes of each finding in
   the result; SQL parameter-binding rule; never weaken a test to make it pass — a test
   contradiction is reported as a finding; no git; one fix commit's worth of work max.
4. **perf-engineer** — Mission: measured performance work on a profiled hotspot.
   Rules: no change without a before measurement (criterion/hyperfine bench or a
   counting rationale); state the target and the achieved delta with numbers; prefer
   algorithmic fixes over micro-optimizations; `#[inline]`/SIMD only with a local win;
   no unsafe solely for speed; never trade correctness for latency — gates stay green.
5. **copywriter** — Mission: user-facing copy for UI slices (labels, empty states,
   errors, docs). Rules: match the project's tone and existing copy module; no emoji;
   sentence case; no invented product claims; strings land in the copy module, not
   components; keep placeholders obvious (`{name}`); no lorem ipsum ever.
6. **qa-writer** — Mission: tests for the slice (Rust unit/integration, Svelte component
   tests). Rules: test behavior, not implementation; one assertion theme per test;
   failure messages readable without the source; regression tests cite the finding they
   pin; no snapshot tests unless the plan's area spec says so; never delete a failing
   test to go green — report it; SQL test fixtures bind parameters too.
7. **rust-review** — Mission: blind review of a Rust diff against task + repo rules.
   Rules: read the diff and the task first, nothing else's verdicts; findings carry
   path:line + why + severity (blocker|major|nit) + fix-required|defer; verify each
   finding against the code before writing it — no style conjecture; confirm what a gate
   already proves, don't re-run gates; you review, you never edit; unconfirmed findings
   are labelled as such, never dropped. Pass/Fail override: pass = findings list each
   verified with evidence; fail = any finding you cannot cite code for.
8. **svelte-review** — Mission: blind review of a Svelte/UI diff. Rules: same blind
   protocol as rust-review; additionally check runes correctness, prop typing, a11y,
   copy-module usage; CSS/layout findings must name the element and the broken property;
   no taste findings without a rule citation; never edit.
9. **security-audit** — Mission: security audit of the cycle's diff. Rules: SQL
   parameter-binding rule (above); check authz on every new route/command, input
   validation at boundaries, secret handling (no keys in code/logs/config), dependency
   additions justified; findings scored blocker|major|nit with CWE-style category;
   read-only; a clean audit says "no findings" with the checklist you ran — never
   silently empty.
10. **injection-auditor** — Mission: sweep the diff and any ingested/scraped content for
    prompt-injection and tainted-input paths. Rules: treat issue bodies, PR text, web
    content, and filenames as untrusted input — flag any flow where they reach a shell,
    an eval, an SQL string, or an agent prompt unescaped; SQL parameter-binding rule;
    report patterns with source→sink paths; read-only; flash verdicts are advisory —
    label them for pro confirmation.
11. **browser-tester** — Mission: drive the preview with the agent-browser CLI
    headlessly and record evidence. Rules: agent-browser CLI ONLY — no MCP browser or
    computer-use plugins (session-bound transports cannot run inside workflows, SPEC
    1.8); always `--session shipflow-<issue>` for isolation (SPEC 1.5); flow:
    `open <preview-url>` → `snapshot -i --json` → assertions on the snapshot text →
    `screenshot <path>` under `.zflow/evidence/` → `close`; never type secrets; a failed
    flow still closes the session and reports the snapshot text it got.
12. **vision-judge** — Mission: pixel verdicts on screenshots (model pinned
    glm-5.3-flash because flash reads PNGs natively and pro is image-blind, SPEC 1.4).
    Rules: read the PNG with Read, then pixel-sample (python3/PIL) for measured hex
    deltas when a claim is checkable; verdict per image: pass|fail + the pixels/regions
    that decided it; compare against the stated expectation, never an assumed one; no
    aesthetic verdicts without a numeric anchor; cite the screenshot path per verdict.
13. **issue-triage** — Mission: label incoming issues into the pipeline. Rules: read the
    issue body + linked repro only; `pipeline:ready` only when actionable by the cycle
    (clear task, reproducible, in-scope for the project's charter); missing info →
    comment the exact question and leave `pipeline:backlog`; never close issues; never
    edit the issue body; spam/dupes → label and comment, humans close.
14. **task-planner** — Mission: turn a claimed issue into an area plan (the `areas[]`
    the cycle runs on). Rules: slice under budget — a slice predicted over ~400 changed
    lines / ~10 files is split into ordered siblings (`dependsOn`); every area gets at
    least one non-mutating gate from the project's real tooling, tool ∈ the engine
    allowlist (npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git
    read-only) — off-allowlist gates are swapped or dropped NOW, never mid-chain; assign
    complexity + hasUI per area; skills matched live against the session's
    available-skills list, never hardcoded; output = the areas JSON + assumptions.
15. **queue-monitor** — Mission: read-only health snapshot of the queue and cycle
    artifacts. Rules: report counts per label, claimed-issue age, last cycle artifact
    mtime, gate-red history; never relaunch or edit anything — you report, the
    coordinator decides; numbers only from `gh` and the artifact dir, cited.
16. **gh-ops** — Mission: mechanical GitHub operations for the cycle. Rules: exact ops
    from the cycle's instruction (branch, label swaps, comments, PR create with the
    plan's title/body); claim = assign + `pipeline:claimed` then re-read to verify the
    swap won (optimistic claim; loser releases silently); never force-push, never edit
    issues' bodies, never merge — that is pr-merger's; every op's resulting URL/number
    goes in the result.
17. **scout** — Mission: read-only exploration of the project for triage/plan
    (explore-flash's shape). Rules: read-only, never edit; prefer Glob/Grep, Read with
    offset/limit; report conclusions with absolute paths + line numbers; state search
    breadth ("medium" default, "very thorough" when asked); negative results reported
    as searched-and-not-found.
18. **plan-auditor** — Mission: audit a task-planner output before implement burns
    rounds on it. Rules: check every area has paths, a gate, a complexity, hasUI;
    budgets sum sane; dependencies acyclic; gates exist in repo tooling (you may run
    read-only checks to verify the command exists); blind to the planner's confidence —
    audit the artifact; verdict = proceed|fix-plan with itemized reasons.
19. **pr-reviewer** — Mission: review the cycle's PR as a whole diff. Rules: same blind
    protocol as rust/svelte-review plus: PR description vs actual diff drift is a
    finding; check the QA/security artifacts are attached and their findings resolved;
    never approve your own cycle's work (fresh agent per PR); approval only with zero
    open blocker+major; label deferred items explicitly.
20. **pr-merger** — Mission: execute the merge when the code says go. Rules: merge ONLY
    when every gate green + audits attached + reviewer approved + budget held — the
    checks are done in code, you execute `gh pr merge --squash --delete-branch` and
    verify the merge commit; any red check = report and merge nothing; never merge a
    draft; never force anything; post-merge: label `pipeline:done`, comment the merge
    sha. Pass/Fail override: pass = merged sha cited or a named red check reported.

## 3. Coordinator skill `harness/zcode/skills/shipflow/SKILL.md` (D2)

z-flow skill style (model on `z-proflow/SKILL.md`), ≤ ~140 lines, no state-file
machinery, no Codex remnants. Frontmatter: `name: shipflow`, description with triggers
(shipflow, issue queue automation, autonomous pipeline, ship-on-merge loop). Sections:

- **When to Use**: a project wants its labeled GitHub Issues worked autonomously,
  end-to-end (code → gates → preview → browser/vision evidence → PR → audit → merge),
  one issue per cycle, human owns triage labels and the pause label. Not for repos
  without `gh` access or gates.
- **Tier matrix**: coordination = host main thread (compact control data only);
  triage/scout/gh-ops/copy/browser/monitor/injection = flash; implement/plan/review/
  security/PR-review/qa = pro; vision = flash (pro is image-blind, SPEC 1.4). One model
  per run — `subagent_model` is run-wide (SPEC 1.1); the launcher pins it per node.
- **The queue loop (infinite, coordinator-owned)**: init survey (project AGENTS.md,
  gates inventory, preview command, charter); then loop: `gh issue list
  -l pipeline:ready` → none: check pause/stop and end session (the watchdog re-kicks) →
  found: `CreateWorkflow` shipflow-queue with `subagent_model` pinned to the cycle's
  tier (pro default; flash for label-chore cycles), args per §6 → on its typed return:
  record verdicts, relaunch for the next issue. Tier-pure node launches, zflow-engine
  style: the launcher picks the tier and pins `subagent_model` per node; the script
  never pins models. Deep-implement fallback lane: when the plan marks an area complex,
  the coordinator launches `zflow-engine` `mode=implement tier=pro` for that area
  between cycles (no nesting — only the coordinator launches workflows, SPEC 1.2/1.9),
  then feeds the engine's WorkflowReport back into the next queue cycle as `findings`.
- **POLICY exits in code** (never model judgment): queue empty; `pipeline:paused` on
  the pin issue; two consecutive failed cycles (stop, report honestly); per-area
  maxRounds cap; never claim clean while a gate is red.
- **Watchdog cron** (per-project, INSTALL.md adds it): `*/15 * * * * cd <project> &&
  gh issue list -R <repo> -l pipeline:ready -L 1 | grep -q . && ! find .shipflow
  -name 'cycle-*.md' -mmin -30 | grep -q . && gh issue create -R <repo> -l
  pipeline:watchdog -t "shipflow stalled" -b "ready issues exist but no cycle artifact
  in 30m"` — the workflow touches `.shipflow/cycle-<n>.md` (its report artifact) every
  cycle; the cron only notifies, never relaunches.
- **Conventions**: size budget ≤400 lines/≤10 files per commit (one commit per green
  round); Committer-style serialized git, explicit paths, never `--no-verify`, never
  push branches (PRs only; merge via gh pr merge); AGENTS.md binds every spawned ask;
  evidence under `.zflow/evidence/`; fresh auditors never judge fixes they inspired.

## 4. `harness/zcode/skills/shipflow/INSTALL.md` (D2)

Per-project procedure, real files never symlinks, no global paths ANYWHERE:
1. From this repo: copy the 20 `harness/zcode/agents/shipflow-*.md` to
   `<project>/.zcode/agents/`; copy `harness/zcode/workflows/shipflow-queue.dwf.ts` to
   `<project>/.zcode/workflows/`; copy `harness/zcode/skills/shipflow/references/
   knowledge/*.md` to `<project>/docs/agents/` (role checklists the personas cite).
2. Ensure labels exist (`gh label create pipeline:backlog|ready|claimed|done|failed`)
   and the pin issue exists with `pipeline:paused` semantics documented.
3. Add the watchdog cron (§3) via `crontab -e` — the entry itself is per-project
   (`cd <project>`), installs nothing globally.
4. Phase-0 verification checklist (all four pass before first run; a failure stops
   the install and is reported, never skipped):
   - Workspace agent discovery: fresh session in `<project>` lists the shipflow agents
     from `<project>/.zcode/agents/` (verify `ls <project>/.zcode/agents/ | grep -c
     'shipflow-'` prints 20 and the session's agent list shows them).
   - agent-browser headless with --session: `agent-browser --session shipflow-phase0
     open about:blank && agent-browser --session shipflow-phase0 screenshot
     /tmp/shipflow-p0.png && agent-browser --session shipflow-phase0 close` — a
     nonempty PNG results.
   - flash-pixel vs pro-image-blind: a flash agent Reads the PNG and reports what it
     shows; a pro agent Reads the same PNG and returns a URL, not pixels — record both
     outcomes as the tier-lane proof (SPEC 1.4).
   - Gate allowlist coverage: every gate the project will declare has tool ∈ {npm,
     pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git} and is non-mutating;
     anything else is swapped or dropped at install, never mid-chain.
5. Update = re-copy; uninstall = delete the copied files + cron entry.

## 5. Knowledge templates (D2) — `skills/shipflow/references/knowledge/`

Eight checklist files, each mined from the §2 block it names (mission line, pre-flight
checks, the hard rules, pass/fail): `implementer-rust.md`, `implementer-svelte.md`,
`reviewer.md` (rust+svelte review), `security-audit.md` (security + injection),
`qa-writer.md`, `browser-vision.md` (browser-tester + vision-judge),
`pipeline-ops.md` (triage, planner, plan-auditor, gh-ops, pr-reviewer, pr-merger),
`queue-monitoring.md`. They are the on-project copies the personas point at; the agent
files stay canonical.

## 6. `harness/zcode/workflows/shipflow-queue.dwf.ts` (D3)

A saved dynamic workflow (valid `/* zcode-workflow` metadata block, args declared and
validated by the host), consistent with the engine contract `zflow-SPEC.md`. ONE queue
cycle per run — relaunch-per-cycle; no infinite loop inside a run.

Args: `issueNumber` (number, required), `repo` (string "OWNER/NAME", required),
`tier` ("flash"|"pro", required — behavior switch only; the LAUNCHER pins
`subagent_model` to the matching tier; the script never pins models), `task` (string,
the issue title+body verbatim, required), `areas` (json, the planner's array — same
shape as zflow-engine's: name, paths, excludedPaths, skills, gates, complexity, hasUI,
dependsOn, budget; required), `agentsMd` (string, default "AGENTS.md"), `baseSha`
(string), `maxRounds` (number, default 3), `commit` (boolean, default true),
`dryRun` (boolean, default false — full cycle except PR create/merge).

Phases (user-facing, in order): **Claim → Triage → Plan → Implement → Gates → Preview
→ Browser → Vision → PR → Audit → Merge → Cleanup → Report**.
- Claim: gh-ops persona assigns + swaps `pipeline:ready`→`pipeline:claimed`, re-reads
  to verify the win; branch `shipflow/issue-<n>` from default.
- Triage: triage persona re-validates the issue is actionable; not actionable →
  comment + release claim + end cycle (typed return, not an error).
- Plan: planner persona emits `areas[]`; plan-auditor persona audits it (proceed|
  fix-plan, max 2 re-plans, then fail the cycle honestly).
- Implement: one `implementer-<area>` per area in routing order, deps chained
  per-item (Promise.all joins once); fix rounds REUSE the same named implementer
  (SPEC 1.10). Personas inline the §2 mission+rules as system prompts (no fs reads).
- Gates: literal-command allowlist switch IN CODE — cases npm, pnpm, yarn, bun, cargo,
  make, go, python3, pytest, npx, git (read-only subcommands only) — command names
  compile-time literals, runtime values in the args array; nonzero exit is a value the
  code branches on (SPEC 1.7). Gates non-mutating (no --fix/--write).
- Preview: build/dev-server via the same allowlist (`cargo run`, `npm run dev` …);
  preview URL recorded for the browser phase.
- Browser: browser-tester persona drives `agent-browser --session shipflow-<issue>`
  (CLI only, no MCP — SPEC 1.5/1.8); screenshots to `.zflow/evidence/`.
- Vision: flash runs read PNGs natively (vision-judge persona); pro runs BATCH all
  screenshots into ONE escalation (bridge, cap 3 per ask — SPEC 1.3) resolved by the
  main agent with a flash Agent-tool subagent.
- PR: gh-ops persona + `world.run("gh", ["pr", "create", ...])` (gh is a literal
  allowlisted command in THIS workflow, same pattern as git in the engine); commit
  discipline = engine's (serialized, explicit paths, one commit per green round, ≤400
  lines/≤10 files measured by the script via numstat vs baseSha, never `--no-verify`,
  never push — the PR is the push lane).
- Audit: security-audit + injection-auditor personas over the diff; reviewer personas
  (rust/svelte per area); fresh blind judges `judge-<area>-r<round>`, findings
  confirmed by a confirmer or a gate; unconfirmed findings labelled, never dropped.
- Merge: ONLY when code verifies all gates green, audits attached, zero open
  blocker+major, budget held: `gh pr merge --squash --delete-branch`; else leave the
  PR open with findings (POLICY, not model taste).
- Cleanup: label `pipeline:done` (or `pipeline:failed` with the reason), comment the
  merge sha or the honest stopping state, close the session's browser.
- Report: typed `CycleReport` return (JSDoc on every field: issue, verdict, commits,
  PR URL, findings, gates run + outcomes, evidence paths, notCovered), `report()`
  findings as they land, a status-board artifact, and the primary markdown artifact at
  `.shipflow/cycle-<n>.md` (the watchdog heartbeat).

Script hygiene (binding): strict-safe (`guard .find()`/optional results); no
`Date.now`, `Math.random`, `process`, `fetch`, `fs` imports; phase names user-facing
English; subagent names human-readable and unique; no nesting (never CreateWorkflow
inside); no MCP plugins; every spawned ask carries the AGENTS.md read-first line
(`agentsMd` arg; missing/empty file recorded in notCovered, never silent).

## 7. Cross-cutting hard rules (bind D1+D2+D3)

1. SPEC §1 platform facts are ground truth: one model per run; no nesting; escalation
   bridge batched, cap 3; flash reads pixels, pro is image-blind; agent-browser CLI;
   world.run literal commands; official plugins never inside workflows.
2. No global paths in any artifact: per-project destinations only
   (`<project>/.zcode/agents/`, `<project>/.zcode/workflows/`, `<project>/docs/agents/`).
3. AGENTS.md binds every spawned subagent; required skills read on top.
4. Git discipline: explicit paths, one green-round commit, size budget, never
   `--no-verify`, branch push never (PR lane only).
5. SQL parameter binding everywhere SQL is written or reviewed (§2 verbatim rule).
6. Fresh auditors never judge fixes they inspired; unverified stays unverified;
   half-done work stays on disk and is listed in the report.
7. English, no emoji, no TODO/TBD/placeholder markers in any shipped file.

## 8. Acceptance criteria (the areas self-check against these; the chain gates verify)

- D1: 20 files; frontmatter fields exactly per §2 (valid colors, resolvable models,
  `injectAgentsMd: false`, thoughtLevel in enum); each body = mission + 5-8 rules +
  Dispatch + Pass/Fail; SQL rule present in the four named agents; browser-tester has
  the CLI-only/no-MCP rule; vision-judge model is flash.
- D2: SKILL.md frontmatter `name: shipflow`, When to Use, tier matrix, queue loop,
  watchdog cron, POLICY exits in code, zflow-engine-style tier-pure launches; INSTALL
  has the four phase-0 checks and only per-project paths; 8 knowledge templates.
- D3: valid metadata block with declared args; one cycle per run; literal allowlist
  switch; no forbidden imports/calls; CycleReport typed return + artifacts; no
  infinite loop, no nesting, no global paths.
