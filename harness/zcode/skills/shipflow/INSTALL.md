# Shipflow — per-project install

Installs the shipflow automation INTO one project. Real files, never
symlinks (ZCode silently skips symlinked agent definitions). No global
paths ANYWHERE — no home-directory or user-level destinations of any
kind; every destination below is inside the target project.

1. **Copy the package** (from this repo, `hmziqrs/ai`, at its root, or via `z-project-init` with Shipflow enabled):
   - `harness/zcode/agents/shipflow-*.md` and only the project's required `harness/zcode/agents/z-*.md` specialists (never the 7 global core agents `general-pro.md`, `general-flash.md`, `explore-flash.md`, `workflow-author.md`, `workflow-author-flash.md`, `workflow-planner.md`, `workflow-planner-flash.md`) →
     `<project>/.zcode/agents/`
   - Whole `harness/zcode/skills/shipflow/` and `harness/zcode/skills/z-workflow/`
     folders → `<project>/.zcode/skills/`
   - `harness/zcode/workflows/shipflow-queue.dwf.ts` →
     `<project>/.zcode/workflows/`
   - `harness/zcode/skills/shipflow/references/knowledge/*.md` (8 role
     checklists the personas cite) → `<project>/docs/agents/`
   - Record the `hmziqrs/ai` commit SHA, `personaKitVersion`, `personaKitSha256`, and per-file `sha256` hashes in `<project>/.zcode/hmziqrs-ai-snapshot.json` (see `harness/zcode/skills/z-project-init/SKILL.md`).

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

4. **Phase-0 verification**: every applicable check passes before the first run; a failure
   stops the install and is reported, never skipped:
   - Workspace agent discovery: fresh session in `<project>` lists the
     shipflow agents from `<project>/.zcode/agents/` (ZCode loads agents at
     session start — restart or a new session is required). Verify
     compare the copied filenames to the source agent globs, require regular files,
     and verify the discovered descriptions include the chosen domain specialists.
   - Domain knowledge: resolve each selected persona's named primary skills from the
     session. Framework skills such as `svelte-code-writer`, `gpui-kit`, `tauri-v2`
     and Flutter skills are separate dependencies; this package does not bundle them.
     Missing required skills block that assignment. Install only the project's required
     dependencies through its approved skill sources.
   - Browser/device capability: when the issue needs capture, run a bounded capture probe
     and verify the PNG plus semantic evidence. Check actual image-reading capability;
     do not assume a text model is image-blind. Device capture requires its own delegated
     tool/runtime access and one serialized device lane.
   - Kit identity: the queue's persona-kit block must match the canonical file in
     `<project>/.zcode/skills/z-workflow/persona-kit.dwf.ts` exactly.
   - Gate allowlist coverage: every gate the project will declare has tool
     in {npm, pnpm, yarn, bun, cargo, make, go, python3, pytest, npx, git}
     and is non-mutating; anything else is swapped or dropped at install,
     never mid-chain.

5. **Update** = re-copy (copies replace wholesale). **Uninstall** = delete
   the copied files and the cron entry.
