---
name: z-workflow-v2
description: >-
  Standalone parallel ZCode workflow: Flash HIGH evidence gathering, Pro HIGH synthesis
  and persistent script authoring, then independent execution lanes with fresh review
  until clean. MAX requires two failed HIGH correction attempts on the same problem.
  Use when the user requests z-workflow-v2; keep the original workflow available for comparison.
---

# z-workflow-v2

Use one preparation path for every task. There is no small/complex router and no
inherited workflow policy. This folder contains its own policies, personas, specialist
rules, preparation template, and persona kit. Its external runtime dependency is ZCode's
`dynamic-workflows` platform contract, not another workflow skill.

The coordinator handles control data; delegated actors gather facts and author scripts.
Independent work starts concurrently. Pro and Flash default to **HIGH**. Successful
execution requires zero unresolved material findings, green gates, and required visual
evidence; audit and correction rounds have **no fixed cap**.

## Start and prepare

1. Resolve this skill's absolute folder and the session's actual `dynamic-workflows`
   `SKILL.md` path. Load the platform skill before submission. If absent, report the
   missing runtime and stop incomplete; do not guess API names or launch another workflow.
   Read [policies](references/policies.md) before preparation. Bun and Git are required
   for embedded helpers and persona write detection.
2. Capture compact anchors: absolute repository root, HEAD, full branch ref (or detached),
   worktree status, applicable instruction paths, verbatim task and delivery preferences.
   The coordinator may read this skill and the platform contract, command status/counts,
   manifests, briefs, and scripts. It does not inspect source files, URLs, repository
   inventories, or implementation evidence to gather task facts.
3. Copy [preparation-template.dwf.ts](preparation-template.dwf.ts) to a fresh run draft and
   supply its input arguments listed below only. Do not redesign its control flow. The user authorized
   this reusable preparation template as a v2-specific exception to the repository's
   no-saved-engine convention. It prepares a fresh execution script; it is not a saved
   execution engine. Run artifacts belong outside protected source paths.
4. Submit that preparation script through the platform's normal approval flow. It fans out
   bounded Flash HIGH exploration, passes **all** findings to Pro HIGH synthesis, and asks
   one persistent Pro HIGH author to write and repair the execution script. Work sizing
   adjusts lane count and dependencies within this same path. It does not route to old
   planner/author agents. Domain persona selection follows the local
   [specialist rules](references/specialists.md).
5. Preparation returns the execution script path, plan/brief/report data, complete command
   set, persona fingerprints, and mechanical validation results. A missing or invalid
   script returns to the same author. Never accept a brief as if execution had happened.

### Preparation arguments

Pass `task`, `repoRoot`, `baseCommit`, `baseBranch` (use `"DETACHED"` when detached),
`skillRoot` (this installed folder), `draftPath` (absolute execution script in a run-owned external draft directory or ignored
`<repo>/.zcode/workflow-drafts/`), and `platformContract` (the current platform skill path).
Optional `scopes` is an array of distinct exploration questions derived from the task text;
otherwise the template starts source/stack and acceptance/verification scouts together.
Use `CreateWorkflow({path: copiedTemplatePath, args: {...}, name: "Prepare workflow v2"})`;
its `zcode-workflow` metadata declares those arguments. Do not submit it inline.
Create the draft directory before copying the template. If it is not ignored, use
a run-owned external draft directory; do not edit project ignore files without scope.
Run `bun --no-env-file --config=/dev/null <skillRoot>/scripts/check-script.ts <copied-template>`
before submission. Requires Bun, Git and `bunx` access to TypeScript 5.9.3 (cached after first use).
The helper performs a strict local facade check; CreateWorkflow supplies authoritative
platform analysis. If platform and bundled facade differ, update the snapshot before use.

## Validate and execute

Read [execution contract](references/execution.md) when authoring, reviewing, or launching
the returned script. The local checker covers strict facade compilation and unchanged local
kit/model helper. CreateWorkflow performs platform analysis. A fresh Pro HIGH reviewer
checks actual constructor/helper usage, HIGH defaults and MAX evidence, command authority,
persona scopes, fresh review actors, explicit dependencies, topology and safety before
launch. Blocking findings return to the persistent author; each revision gets mechanical
checks and a fresh review. There is no numeric revision cap; a missing prerequisite or
unresolved external blocker returns incomplete with evidence.

Show the actual commands, selected models/thinking, write scopes, worktrees, joins, gates,
and expected deliverables before launch. Submit the returned script unchanged through
CreateWorkflow once; use the platform's amendment/resume mechanisms for that run when
needed. Do not start a replacement run to hide failures. Never bypass platform approval.
Watch via completion notifications rather than repeated polling.

Execution uses persistent implementers and fresh reviewers in independent area pipelines.
Use the local persona helper with explicit tier and authority; no model or thinking
inheritance from a domain agent may override v2 policy. MAX is eligible only for the
specific criterion that failed after **two completed HIGH correction attempts**, with
logged attempts and evidence. Eligibility is not a requirement to escalate.

## Deliver

For code, execution writes only run-owned worktrees and integrates there. The coordinator
may deliver the finished result by guarded fast-forward only under the checks in the
execution contract. Respect review-first/no-merge instructions and preserve dirty or
changed user checkouts. Never push.

Return completion or incomplete status, unresolved findings, gates and evidence, visual
checks, persona paths/hashes and actual models/thinking, HIGH attempt counts and any MAX
escalation, elapsed preparation/execution time, run-owned branches/worktrees, script/report
paths, and delivery status. Distinguish command-verified evidence from model judgments and
unconfirmed claims. Keep the original workflow installed unchanged during evaluation.
