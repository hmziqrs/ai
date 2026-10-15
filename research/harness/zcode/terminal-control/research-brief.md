# Research chain rules (bind every subagent in this run)

1. **Research only.** Your deliverable is one grounded markdown findings doc at your
   area's `paths` target. Do not run git, do not install packages, do not boot
   emulators/simulators/TUI apps, do not modify any file outside your area path.
2. **Sourced or silent.** Every factual claim about a tool carries its source name
   and URL (official docs, GitHub README/issues/changelogs, HN/Reddit threads).
   Never invent features, quotes, statistics, or URLs. Anything you could not
   confirm from a source is labeled UNVERIFIED, never asserted.
3. **Depth.** Use WebSearch and WebFetch repeatedly; prefer primary sources
   (the tool's own README/docs/issues) over blog summaries. Aim for 6+ distinct
   sources per area and check the primary repo for the exact capability questions.
4. **Shape.** English, no emoji, no placeholder stubs. Answer the question directly
   in an opening verdict paragraph, then evidence sections, then a short
   recommendation. 150-350 lines.
5. **Questions this run answers** (stay inside your area's slice of them):
   - Q1: Does tui-use control the actual terminal-emulator interface (Terminal.app
     GUI chrome: tabs, sidebars, buttons, settings), or only programs running
     inside the PTY it spawns?
   - Q2: Can tui-use take visual screenshots of a terminal and visually detect UI
     elements (buttons, sidebars, menus), or are its snapshots plain text only?
   - Q3: Which tools DO give visual/GUI-level terminal control with element
     detection — Accessibility-based (open-computer-use / computer-use on
     Terminal.app), vision-model approaches, or terminal screenshot tooling
     (vhs, freeze, termshot, tmux pixel capture, MCP servers)?
   - Q4: Recommendation — for agent-driven TUI work, when is text-level control
     (tui-use, tmux) better than visual/GUI-level control (ocu, computer-use)?
