# Terminal GUI control via the Accessibility tier: open-computer-use and the computer-use plugin

## Verdict

Yes — the Accessibility tier controls the **actual terminal-emulator application** (Terminal.app
as a GUI app: its tabs, buttons, window chrome, and menu bar), not a PTY it spawns, and it does
so with **named, element-addressed targets** plus — verified live in this run — a real pixel
screenshot in the same response. Open Computer Use (`open-computer-use` npm CLI / `ocu` alias /
stdio MCP server; repo [iFurySt/open-codex-computer-use](https://github.com/iFurySt/open-codex-computer-use))
and the ZCode `computer-use` plugin are two frontends over the same idea: read the app's OS
accessibility tree, act on elements by index, and fall back to coordinate clicks only when the
tree has no safer target (`~/.agents/skills/open-computer-use/SKILL.md:14-16,24-29`;
`computer-use` plugin `SKILL.md:39-57`).

In a live check run during this research (macOS 27.0, open-computer-use 0.3.5,
`open-computer-use call get_app_state --args '{"app":"Terminal"}'`), Terminal.app's snapshot
exposed, as named elements: the window title, a text-entry-area element holding the visible
screen text, a tab group labeled "tab bar" with 8 tabs (each with its own `Close tab` button and
selected on/off value), a `new tab` button, the `close`/`full screen`/`minimize` window buttons,
and the menu bar (Terminal, Shell, Edit, View, Window, Help) — plus a base64 PNG screenshot of
the window (177,632 base64 chars in the same JSON) showing the tab bar, window chrome, colors,
and the cursor. Element detection, however, comes from the accessibility tree, not from pixels:
the pixel image is evidence for a vision model, not something the tool itself parses. Pure
vision-tier tools (e.g. Anthropic's computer use tool) get only the screenshot and must express
every action in screenshot pixel coordinates
([Anthropic computer use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)).

The tier's real costs are operational, not capability: macOS 14+ plus Accessibility and Screen
Recording permission grants, a logged-in GUI session, per-action latency, and a working surface
bounded by what each terminal app exposes to accessibility. Terminal.app conforms well (proven
above); iTerm2's accessibility support exists but arrived late and is documented mainly through
its release notes (see the iTerm2 section below).

## 1. What this tier is

Two local variants were examined; both drive the user's real desktop session.

- **Open Computer Use (OCU).** An open-source Computer Use service wrapped as MCP and CLI,
  installable with `npm install -g open-computer-use` (short alias `ocu`; Node.js 18+ required by
  the npm launcher). Sources:
  [installation.md](https://github.com/iFurySt/open-codex-computer-use) and local skill
  `~/.agents/skills/open-computer-use/references/installation.md:17-33`. The MCP server exposes
  nine core tools — `list_apps`, `get_app_state`, `click`, `perform_secondary_action`, `scroll`,
  `drag`, `type_text`, `press_key`, `set_value` — with macOS additionally exposing `query`
  (local `SKILL.md:14-16`; README: "ocu mcp continues to expose the nine core native tools, plus
  query on macOS").
- **ZCode computer-use plugin.** A bound-object API over the same accessibility-first design
  (`getAXState`, `getScreenshot`, `getAXStateAndScreenshot`, `click`, `setValue`, `pressKey`,
  `performSecondaryAction`, ...; local plugin `skills/computer-use/SKILL.md:89-123` and
  `docs/computer-use.md`). Its `get_app_state` tool takes `include_screenshot` (default `false`)
  and returns the tree as text, optionally with an image block
  (`docs/computer-use.md:162,221-246`).

Both treat the terminal emulator as an ordinary native app. Nothing here spawns a PTY: the tool
list has no "start process" surface — you point `get_app_state` at an app name or bundle id that
`list_apps` already sees (live run: `open-computer-use call list_apps` returned 8 running apps
including `Terminal — com.apple.Terminal`).

## 2. How it works (per-platform plumbing)

- **macOS**: a Swift runtime built on the AX (Accessibility) APIs. Coordinate hits are resolved
  into actionable elements via `AXUIElementCopyElementAtPosition`
  ([docs/ARCHITECTURE.md](https://github.com/iFurySt/open-codex-computer-use/blob/main/docs/ARCHITECTURE.md)).
  Window capture prefers the WindowServer's `SLSHWCaptureWindowList` (works across Spaces and
  while occluded, "15-45 ms") with ScreenCaptureKit as fallback; screenshots return as base64
  PNG (default) or JPG/WebP MCP image blocks (same ARCHITECTURE.md; the local skill's platform
  notes also list "Accessibility, ScreenCaptureKit, app-posted input events" —
  `references/usage.md:157`).
- **Windows**: UI Automation (`System.Windows.Automation`) via an embedded PowerShell bridge,
  with Win32 PostMessage/SendMessage fallbacks (ARCHITECTURE.md; `references/usage.md:160-161`).
- **Linux**: AT-SPI2 through the desktop session bus via a Python/GObject bridge; Wayland
  screenshot and coordinate input are compositor-dependent and best-effort (ARCHITECTURE.md;
  `references/usage.md:165`).

`get_app_state` renders the tree with default budgets of **1200 nodes / 64 levels**, overridable
per call with `max_tree_nodes` / `max_tree_depth`; snapshot text is truncated to **500
characters** by default (`text_limit` accepts a positive integer or `"max"`)
(`references/usage.md:73-99`, `references/troubleshooting.md:63`). These budgets exist because of
real truncation bugs reported against the tree (OCU issues
[#40](https://github.com/iFurySt/open-codex-computer-use/issues/40) and
[#36](https://github.com/iFurySt/open-codex-computer-use/issues/36)).

## 3. Prerequisites and failure modes before any element is visible

- **macOS 14.0 or later**; on earlier versions the bundled binary cannot launch and no permission
  change fixes it (local `SKILL.md:12` and `references/installation.md:7-15`). This host runs
  macOS 27.0 (`sw_vers -productVersion` → `27.0`), so the live check below was in-spec.
- **Accessibility and Screen Recording permissions**, granted via the `doctor` onboarding UI on
  first GUI use (local `SKILL.md:22`; README reports `ocu doctor --json` fields
  `accessibilityTrusted`, `screenCaptureGranted`, `allGranted`).
- **A logged-in desktop session** on Windows/Linux; SSH or service contexts may start the binary
  but see no windows (`references/usage.md:161`, `references/troubleshooting.md:90-92`).
- **A visible, non-minimized window**; common causes of an empty snapshot are minimized/hidden
  windows or missing Screen Recording permission (`references/troubleshooting.md:39-48`).
  Occluded-window capture also has a documented bug class: issue
  [#60](https://github.com/iFurySt/open-codex-computer-use/issues/60) (Apple event error -10005
  `cgWindowNotFound` for windows occluded within the same Space; the reporter reproduced it on
  both 0.2.1 and 0.3.3 via binary swap, so it is long-standing rather than a regression, and
  closed it as completed on Sep 5, 2026) and issue
  [#57](https://github.com/iFurySt/open-codex-computer-use/issues/57) (same error after
  logout/relogin on a macOS 27 beta, fixed by reboot; still open as of Oct 15, 2026).

These grants are per-machine, interactive, and user-approvable only — a hard gate for headless or
freshly provisioned agents that text-level tools (tui-use, tmux over SSH) do not have.

## 4. Capability map: `get_app_state` on Terminal.app (live run)

Executed during this research (not simulated). Commands and results:

```
$ sw_vers -productVersion
27.0
$ open-computer-use call list_apps
  ... "Terminal — com.apple.Terminal [running]" ...        (8 apps listed)
$ open-computer-use call get_app_state --args '{"app":"Terminal"}'
```

The response JSON contained two content blocks: a `text` block (the element tree) and an
`image` block (`mimeType: image/png`, 177,632 base64 chars). The tree, abridged with private
shell content elided:

```
App=com.apple.Terminal (pid 1291)
Window: "os — -zsh — 213×61", App: Terminal.
0 standard window os — -zsh — 213×61, Secondary Actions: Raise
    1 split group
        2 scroll area
            3 text entry area Description: shell Last login: ... (screen text, focused element)
            4 scroll bar (disabled, settable, float) 0
    5 tab group tab bar Description: Tab bar, 8 tabs.
        6 tab ~ — caffeinate -ims Value: off
            7 button Close tab Description: Close ID: _closeButton
        ... (8 tabs total; selected tab has Value: on)
        23 button new tab
    24 close button
    25 full screen button Help: this button also has an action to zoom the window, ...
    26 minimize button
    27 image os
    28 text os — -zsh — 213×61
29 menu bar
    30 Terminal  31 Shell  32 Edit  33 View  34 Window  35 Help
```

What this proves, point by point against the coordinator's question:

- **Buttons: yes.** Per-tab `Close tab` buttons (each addressable by `element_index`, e.g.
  `click --args '{"app":"Terminal","element_index":"7"}'`), a `new tab` button, and the three
  window buttons. Element-targeted actions are the tier's primary path (`SKILL.md:27-28`).
- **Tab bars: yes.** A `tab group` element with per-tab titles (cwd + running command), an
  on/off selected value, and `Secondary Actions: Raise` on the window — so an agent can switch
  or close tabs semantically, without pixel guessing.
- **Sidebar items: none observed.** Terminal.app's default window has no sidebar; the tree shows
  a `split group > scroll area` content hierarchy. Whether sidebar-bearing terminal setups expose
  sidebar rows here was not tested (no sidebar-bearing terminal config on this machine) — treat
  that as UNVERIFIED.
- **Text content: yes, the visible screen as plain text.** Element 3 (a `text entry area`,
  also the focused element) carried the visible screen text, truncated at the default 500 chars
  (ends `remote: Enumerat...` in the raw output). Colors, bold/italic attributes, and pixel
  layout exist only in the image block, not in the tree. Whether Terminal's accessibility text
  area exposes scrollback beyond the visible screen was **not verifiable in this run** — the
  captured text began at the window's visible top (`Last login:` line) — UNVERIFIED.
- **Menu bar: titles only at default budgets.** The six menu titles appear as elements; menu
  item contents did not (elements end at the bar). Whether deeper budgets expand menus is
  UNVERIFIED; the documented way to reach hidden controls is the macOS-only `query` tool, which
  finds controls "by text or role without a screenshot or a full AX tree"
  ([docs/targeted-query.md](https://github.com/iFurySt/open-codex-computer-use/blob/main/docs/targeted-query.md)).
- **Screenshot: yes, by default on this version.** OCU 0.3.5's `get_app_state` returned a real
  PNG of the window with no extra flag (decoded and visually confirmed: tab bar with 8 tabs,
  window chrome, green/bold colored output, cursor block). The ZCode plugin's `get_app_state`
  instead defaults `include_screenshot` to `false` and adds the raster only when asked
  (`docs/computer-use.md:162`); ARCHITECTURE.md documents the image-block return only for OCU's
  own capture path. Note the tool itself performs **no visual detection**: element identity and
  indexes come
  from the AX tree; pixels are for the calling model's eyes.

## 5. iTerm2: what is and is not established

iTerm2 was not installed on this machine (`ls /Applications` finds no iTerm binary), so nothing
about it could be live-tested; everything below is web-sourced only.

- iTerm2 3.7.0 release notes, under "Input and Accessibility": "VoiceOver now announces terminal
  output and deleted characters"; 3.7.4 fixed crashes "involving VoiceOver"
  ([iterm2 downloads/release notes](https://iterm2.com/downloads.html)). This establishes that
  iTerm2 exposes terminal content through macOS accessibility as of 3.7.x — the same surface OCU
  and the plugin read — but says nothing about tab-bar/toolbar element quality for automation.
- A 2015 assistive-technology review concluded VoiceOver could work with iTerm2 ("VO read the
  entire screen to start"), i.e., screen-reader usability predates the 3.7 work but was
  review-grade rather than automation-grade
  ([iAccessibility](https://iaccessibility.net/iterm2-for-mac-a-very-decent-terminal-replacement)).
- OCU's issue tracker contains **no** Terminal.app- or iTerm2-specific issues: a scan of the
  full issue list plus a GitHub `terminal` search (10 results, all body-text matches — the term
  appears in no issue title; e.g. #60 names Terminal only as the frontmost app in its
  reproduction, with Finder as the failing target) surfaced no issue whose subject is
  Terminal.app or iTerm2, so there is no documented terminal-specific handling or bugfix either
  way ([issues](https://github.com/iFurySt/open-codex-computer-use/issues)).

Practical reading: point the tier at iTerm2 the same way (`get_app_state --args '{"app":"iTerm2"}'`)
and verify the tree empirically per version — the generic a11y mismatch class is documented in
the repo (issue [#82](https://github.com/iFurySt/open-codex-computer-use/issues/82): macOS
Firefox showed native-dialog content in the screenshot while the AX tree and background input
kept targeting the underlying page), so screenshot/tree divergence is a known failure shape on
non-conforming apps.

## 6. Coordinate-click fallback and its limits

When the tree has no usable element, both variants can click coordinates — with guardrails that
matter for terminal work:

- The local skill's standing rule: prefer semantic actions and `set_value`; use coordinate
  `click`, `scroll`, `drag` "only when the element tree does not expose a safer target"
  (`SKILL.md:38`).
- Delivery methods are explicit and never silently fall back (`references/usage.md:110-140`):
  `accessibility` (AX actions only), `app_post` (macOS/Windows; posts events to the target
  process without moving the real pointer), `sky_click` (macOS-only private SkyLight path for
  covered Chromium windows), and `global` (real system pointer; gated behind
  `OPEN_COMPUTER_USE_ALLOW_GLOBAL_POINTER_FALLBACKS=1`, `SKILL.md:39`). ARCHITECTURE.md
  documents `auto` — not `app_post` — as the default route: a click first tries
  `AXSelectedChildren` selection on native list containers, then the AX semantic activations
  (`AXPress` / `AXConfirm` / `AXOpen`), then a scan of the target's descendant AX elements plus
  AX hit-testing near the click point, and only the non-AX branch delivers `CGEvent.postToPid`
  directed mouse events (global HID stays behind the env gate); `drag` likewise defaults to
  `postToPid` delivery. The SkyLight SPI sits behind the explicit `sky_click` mode.
- **Window-server drags do nothing by default**: the gated-off drag path posts events per-pid,
  so "window moves, drag-selecting text, and Finder drag-and-drop return without error but have
  no visible effect" (`references/usage.md:146-151`). Text selection inside a terminal via
  drag-select is therefore unreliable unless the global gate is deliberately enabled.
- The plugin's strategy parameter (`auto|a11y|event`) expresses the same split, and its skill
  file warns that Electron/canvas content accessibility cannot see is where coordinates begin
  (plugin `SKILL.md:52`), plus that a capture is scoped to one window and a modal that just
  opened becomes the captured window (plugin `SKILL.md:171-177`).

## 7. The pure-vision tier, for contrast

Anthropic's computer use tool gives the model `screenshot`/`zoom` plus mouse/keyboard tools whose
every positional parameter is pixel-based — "Coordinates are in screenshot pixels" — and its
documented tool list operates on screenshot pixels throughout, with no accessibility-tree or
DOM addressing surface (the words "accessibility tree", "a11y", and "DOM" do not appear in the
documentation's tool listing); `zoom` exists to read "small text or dense UI that isn't legible
in a downscaled full screenshot". Documented weaknesses map badly onto terminals: small and dense text, Retina 2x
coordinate-scaling bugs, "UI elements (such as dropdowns and scrollbars) might be tricky", each
screenshot costing "1,000-1,800 input tokens", and prompt-injection risk from text visible in
screenshots ([Anthropic computer use docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)).
OSWorld, the standard real-OS agent benchmark, treats observation modality as an experimental
variable — separate leaderboards for "Screenshot", "A11y tree", "Screenshot + A11y tree", and
"Set-of-Mark" — and reports models "primarily struggling with GUI grounding"
([OSWorld leaderboard](http://osworld-v1.xlang.ai/)). The research consensus is therefore not
"vision vs a11y" but that pixel-only grounding is the weakest link; the Accessibility tier's
value is precisely that it hands the agent named elements instead of pixels.

## 8. Gaps versus text-level control (tui-use / tmux)

For driving the *program inside* the terminal, the Accessibility tier is strictly worse than the
text tier on every operational axis:

- **Permissions and environment**: OCU needs macOS 14+, Accessibility + Screen Recording grants,
  and a visible window; tui-use needs nothing but a PTY it spawns itself ("Spawn any program in
  a PTY, read its screen as plain text, send keystrokes — all from the command line" —
  [tui-use README](https://github.com/onesuper/tui-use)), and tmux sessions "continue running in
  the background" while detached from any screen
  ([tmux man page](https://man.openbsd.org/tmux), DESCRIPTION) (GUI-tier prerequisites in
  section 3 vs. `SKILL.md:20-22`). Headless servers and CI are unreachable for the GUI tier by
  design (`references/troubleshooting.md:90-92`).
- **Throughput and determinism**: an a11y round-trip renders up to 1200 nodes plus a ~130 KB
  raster per observation; text-tier snapshots are plain strings ("The screen field is always
  clean plain text" — [tui-use README](https://github.com/onesuper/tui-use)). Token cost of the
  screenshot alone is the 1,000-1,800-token figure Anthropic quotes for the vision tier, paid on
  every observation.
- **Scrollback and structure**: Terminal's AX text element exposed the visible screen only in
  this run (scrollback exposure UNVERIFIED); tmux reaches arbitrary history via `capture-pane`
  (`-S`/`-E` take "negative numbers are lines in the history", and `-S -` captures from the
  start of history — [tmux man page](https://man.openbsd.org/tmux)), and tui-use spawns the
  target program in a PTY of its own and drives it with keystrokes while reading the screen as
  plain text ([tui-use README](https://github.com/onesuper/tui-use)). The GUI tier has no
  scrollback primitive at all — if it is not in the visible window, it is not in the tree.
- **Colors and cursor geometry**: present in the screenshot for a vision model to interpret,
  absent as data from the tree. Text-tier capture can carry them as data: tmux `capture-pane -e`
  means "the output includes escape sequences for text and background attributes"
  ([tmux man page](https://man.openbsd.org/tmux)); tui-use's README lists stripped color/style
  as a known limitation of its plain-text screen.
- **Interactive drag semantics**: drag-select of terminal text silently no-ops without the global
  pointer gate (`references/usage.md:146-151`); keyboard/select primitives in text-tier tools
  have no such cliff.
- **App-level coverage**: the tier only works on emulators with conforming accessibility
  implementations; Terminal.app qualifies (section 4), iTerm2 is release-notes-verified only
  (section 5), and GPU-rendered or Electron-embedded terminal panes inherit the generic
  a11y-vs-pixels mismatch class (issue #82).

What the GUI tier uniquely buys: operating the **emulator's own chrome** — switching/closing
tabs, opening Settings/Preferences and clicking its buttons, splitting panes, menu commands —
which no PTY-level tool can reach because tab bars and settings windows are app GUI state, not
terminal bytes.

## 9. Recommendation (this area's slice of Q3/Q4)

Use the Accessibility tier when the target is the terminal *application's* GUI — tabs, splits,
settings dialogs, menu items — or when the agent has no other channel into the machine than its
desktop session. Verified on Terminal.app with OCU 0.3.5: tab bars, per-tab close buttons, and
window controls are all first-class elements, and the bundled screenshot covers the visual
residue. For anything inside the shell — running TUI programs, reading output, scrolling
history — the text tier (tui-use, tmux) remains the right default, and the GUI tier's
prerequisites (interactive permission grants, logged-in GUI session, per-observation image
tokens) are exactly the gaps that force the escalation up to visual/GUI control only when chrome
or a non-PTY channel is the target.

## Grounded in

- Local skill (read this session): `~/.agents/skills/open-computer-use/SKILL.md` (tool surface
  14-16, workflow 24-29, macOS 14 requirement 12, doctor/permissions 22, pointer rules 38-39);
  `references/installation.md`; `references/usage.md`; `references/troubleshooting.md`.
- Local plugin (read this session): ZCode `computer-use` plugin
  `~/.zcode/cli/plugins/cache/zcode-plugins-official/computer-use/0.6.4/skills/computer-use/SKILL.md`
  and `docs/computer-use.md`.
- Live run (this session, macOS 27.0, open-computer-use 0.3.5): `sw_vers -productVersion`;
  `open-computer-use call list_apps`; `open-computer-use call get_app_state --args
  '{"app":"Terminal"}'` (element tree + 177,632-char base64 PNG, decoded and inspected).
- Open Computer Use README: <https://github.com/iFurySt/open-codex-computer-use>
- OCU architecture doc: <https://github.com/iFurySt/open-codex-computer-use/blob/main/docs/ARCHITECTURE.md>
- OCU targeted-query doc: <https://github.com/iFurySt/open-codex-computer-use/blob/main/docs/targeted-query.md>
- OCU issues (incl. #36, #40, #57, #60, #82): <https://github.com/iFurySt/open-codex-computer-use/issues>
- iTerm2 release notes (3.7.0 / 3.7.4 accessibility entries): <https://iterm2.com/downloads.html>
- iAccessibility iTerm2 VoiceOver review: <https://iaccessibility.net/iterm2-for-mac-a-very-decent-terminal-replacement>
- Anthropic computer use tool docs: <https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool>
- OSWorld benchmark (observation-modality ablations): <http://osworld-v1.xlang.ai/>
- tui-use README (PTY spawn, plain-text screen, keystroke input): <https://github.com/onesuper/tui-use>
- tmux man page (OpenBSD; capture-pane -S/-E/-e, detached sessions): <https://man.openbsd.org/tmux>
