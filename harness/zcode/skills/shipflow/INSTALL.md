# Shipflow — per-project install

Installs the shipflow automation INTO one project. Real files, never
symlinks (ZCode silently skips symlinked agent definitions). No global
paths ANYWHERE — no home-directory or user-level destinations of any
kind; every destination below is inside the target project.

1. **Copy the package** (from this repo, `hmziqrs/ai`, at its root):
   - `harness/zcode/agents/shipflow-*.md` (20 files) →
     `<project>/.zcode/agents/`
   - `harness/zcode/workflows/shipflow-queue.dwf.ts` →
     `<project>/.zcode/workflows/`
   - `harness/zcode/skills/shipflow/references/knowledge/*.md` (8 role
     checklists the personas cite) → `<project>/docs/agents/`

2. **Labels and pin issue**: ensure the pipeline labels exist (`gh label
   create pipeline:backlog pipeline:ready pipeline:claimed pipeline:done
   pipeline:failed` — one per invocation), plus `pipeline:paused` (the pin
   issue's pause semantics) and `pipeline:watchdog` (the cron's notify
   label). The pin issue exists with `pipeline:paused` semantics documented
   in its body: while it carries the label, the coordinator stops.

3. **Watchdog cron** via `crontab -e` — the entry itself is per-project
   (`cd <project>`), installs nothing globally:

   ```
   */15 * * * * cd <project> && gh issue list -R <repo> -l pipeline:ready -L 1 | grep -q . && ! find .shipflow -name 'cycle-*.md' -mmin -30 | grep -q . && gh issue create -R <repo> -l pipeline:watchdog -t "shipflow stalled" -b "ready issues exist but no cycle artifact in 30m"
   ```

4. **Phase-0 verification** — all four pass before the first run; a failure
   stops the install and is reported, never skipped:
   - Workspace agent discovery: fresh session in `<project>` lists the
     shipflow agents from `<project>/.zcode/agents/` (ZCode loads agents at
     session start — restart or a new session is required). Verify
     `ls <project>/.zcode/agents/ | grep -c 'shipflow-'` prints 20 and the
     session's agent list shows them.
   - agent-browser headless with --session:
     `agent-browser --session shipflow-phase0 open about:blank &&
     agent-browser --session shipflow-phase0 screenshot /tmp/shipflow-p0.png
     && agent-browser --session shipflow-phase0 close` — a nonempty PNG
     results.
   - flash-pixel vs pro-image-blind: a flash agent Reads the PNG and
     reports what it shows; a pro agent Reads the same PNG and returns a
     URL, not pixels — record both outcomes as the tier-lane proof
     (SPEC 1.4).
   - Gate allowlist coverage: every gate the project will declare has tool
     in {npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git}
     and is non-mutating; anything else is swapped or dropped at install,
     never mid-chain.

5. **Update** = re-copy (copies replace wholesale). **Uninstall** = delete
   the copied files and the cron entry.
