# Visual TUI Alternatives: Pixel/Screenshot Terminal Tooling, and When Text Control Wins

Area: `visual-tui-alternatives` (Q3 pixel tier + Q4 recommendation). Scope: the
tools that turn terminal state into pixels — vhs, freeze, termshot, OS-level
screenshot capture, MCP screenshot servers, vision-model loops — contrasted with
the text tier (tui-use, tmux `capture-pane`/`send-keys`), closing with the
recommendation on when each tier wins.

## Verdict

The pixel tier of terminal control exists and works, but almost none of it
screenshots your *actual* terminal emulator. Of the tools examined, only the
OS-level capture layer — macOS `screencapture -l <windowid>` and the screeny
MCP server — produces true pixels of a real Terminal.app/iTerm2 window, chrome
and all. The popular "terminal screenshot" tools (charmbracelet vhs, freeze,
termshot) do something different: they re-render ANSI text streams into
synthetic PNG/SVG/GIF images of a program's output inside a drawn window
frame — polished, headless, CI-friendly, and completely blind to the real
emulator GUI and its tabs, sidebars, and buttons. tmux `capture-pane -e` stays
pure text (text plus ANSI attribute escapes, no pixels). Dedicated
terminal-screenshot MCP servers do exist — lioneltay/terminal-mcp and
computer-agent-labs/terminal-use — but both manufacture pixels by re-rendering
text they can already read (tmux `capture-pane` ANSI, or a node-pty-fed
headless xterm.js buffer) into synthetic PNGs; neither captures a real
emulator window, so the OS-level capture layer keeps its monopoly on true
window pixels, and text-only terminal MCP servers such as iterm2-mcp-server
expose no image capture at all. Vision-model computer use (Anthropic's
screenshot/zoom/click loop) is the only approach here that both takes real
pixels and acts on them — but it acts by guessing pixel coordinates, not by
element identity. For Q4: for agent-driven work on TUI applications, text-level
control (tui-use, tmux send-keys/capture-pane) is strictly better whenever the
goal is driving the program or reading its state; escalate to the pixel tier
for three concrete gaps — (1) verifying or presenting rendered appearance
(colors, theme, layout), (2) GUI chrome outside the PTY, and (3) look-and-click
element interaction, which is where vision-model or Accessibility-based GUI
automation (covered by the sibling `terminal-gui-visual` area) is forced.

## Capability matrix

| Tool | Produces pixels? | Shows real emulator chrome? | Detects UI elements? | Drives input? |
|---|---|---|---|---|
| tui-use | No — plain-text snapshot + inverse-video highlights | No | No (text + highlight spans only) | Yes — keys into a PTY it spawns |
| tmux `capture-pane -e` | No — text grid; ANSI attribute escapes with `-e` | No | No | Yes — `send-keys` |
| vhs | Yes — GIF, MP4, WebM, PNG frames, `Screenshot` PNG | No — draws its own synthetic `WindowBar`/border | No | Yes — scripted tape commands |
| freeze | Yes — PNG, SVG, WebP | No | No | No — capture/render only |
| termshot | Yes — PNG | No | No | Yes — runs the command in its own PTY |
| asciinema (+ agg) | No — text stream; GIF only via separate `agg` render | No | No | No — recording only |
| macOS `screencapture -l` | Yes — real rendered window pixels | Yes | No | No |
| screeny (MCP) | Yes — real window pixels, base64 JPEG | Yes | No | No |
| iterm2-mcp-server | No — "screen buffer text" only | No | No | Yes — `iterm2_send_text` |
| terminal-mcp (MCP) | Yes — PNG re-rendered from `capture-pane` ANSI via headless xterm | No | No | No — input stays `tmux send-keys` |
| terminal-use (MCP) | Yes — PNG rendered from a headless xterm.js buffer | No | No — cell coordinates + preview ring, not element IDs | Yes — type/press/click/scroll |
| Anthropic computer use | Yes — full-display screenshots + `zoom` regions | Yes (whole display) | No — "Coordinates are in screenshot pixels" | Yes — mouse/keyboard |

## Evidence: the pixel/screenshot tools

### charmbracelet vhs — scripted terminal renders (real pixels, synthetic window)

vhs (Charmbracelet, MIT) is "Your CLI home video recorder" — "Write terminal
GIFs as code for integration testing and demoing your CLI tools"
(source: charmbracelet/vhs README, https://github.com/charmbracelet/vhs).

- Input is a `.tape` file of scripted commands (`vhs new demo.tape`, `vhs
  demo.tape`); a `vhs record` mode generates a tape from a live session. Tape
  commands include `Type`, `Enter`, `Tab`, arrow keys, `Ctrl+<char>`,
  `ScrollUp`/`ScrollDown`, `Sleep`, `Wait /regex/`, `Hide`/`Show`, `Copy`,
  `Paste` (vhs README).
- Outputs are genuinely pixel formats: `Output out.gif`, `Output out.mp4`,
  `Output out.webm`, `Output frames/` (a PNG frame sequence), and a
  `Screenshot examples/screenshot.png` directive that captures "the current
  frame (png format)". It also emits `.txt`/`.ascii` outputs for golden-file
  integration testing (vhs README).
- Dependencies: it "requires ttyd and ffmpeg to be installed and available on
  your PATH" (vhs README). The tape executes on a virtual terminal whose
  appearance you set — `Set FontSize`, `Set FontFamily`, `Set Width`/`Height`
  or `Columns`/`Rows`, `Set Padding`, `Set Theme`, `Set Framerate`, and window
  dressing via `Set WindowBar` and `Set BorderRadius` (vhs README).
- It runs fully headless and in CI: an official Docker image
  (`ghcr.io/charmbracelet/vhs`), an official GitHub Action, and a built-in SSH
  server (`vhs serve`) so a tape can be piped over SSH and a GIF returned
  (vhs README).

Key nuance for Q3: the window chrome in a vhs render is drawn by vhs itself
(`WindowBar`, `BorderRadius` settings). It is a depiction of a terminal, not a
capture of Terminal.app or iTerm2. Nothing in vhs inspects or detects elements
in another application's GUI (vhs README).

### charmbracelet freeze — static images of code and ANSI output

freeze (Charmbracelet, MIT) generates "images of code and terminal output"
(source: charmbracelet/freeze README, https://github.com/charmbracelet/freeze).

- Outputs "PNGs, SVGs, and WebPs" via `--output`; the default is `out.svg` or
  stdout when piped (freeze README).
- Terminal-capture mode preserves ANSI colors: you can "capture ANSI output of
  a terminal command with the `--execute` flag" (e.g. `freeze --execute "eza
  -lah"`), or pipe output in (`cat artichoke.hs | freeze --language haskell`).
- The README explicitly documents bridging from the tmux text tier:
  `tmux capture-pane -pet 1 | freeze -c full` — i.e. capture a tmux pane with
  escapes to stdout and render it (freeze README). This is the canonical
  text-to-pixels pipeline: `capture-pane -e` produces ANSI text; freeze turns
  it into a real image.
- Styling flags: `--language`, `--theme`, `--show-line-numbers`, `--lines`,
  `--window`, `--padding`, `--margin`, `--shadow.*`, `--border.*`,
  `--background`, `--font.*` (freeze README). There is also an interactive TUI
  mode (`freeze --interactive`) for composing the image (freeze README).

### homeport/termshot — command output as a PNG

termshot (Go, MIT) "Creates screenshots based on terminal command output"
(source: homeport/termshot README, https://github.com/homeport/termshot).

- Mechanism: "In order to work, termshot uses a pseudo terminal for the command
  to be executed" — `termshot ls -a`, or `termshot -- "ls -1 | grep go"` for
  pipes, or `termshot /bin/zsh` to capture an interactive session until exit
  (termshot README).
- Fidelity: it "reads the ANSI escape codes ('rich text') logged by most
  command-line tools and uses it to generate a high-fidelity 'screenshot' of
  your terminal output." The README warns the parser is incomplete — some
  output "cannot be parsed correctly, yet," and commands that reset the cursor
  position can cause issues (termshot README).
- Output: a PNG (default `out.png`, `--filename` to change); `--clipboard`
  copies it instead; binaries ship "for Darwin and Linux" (termshot README).
  No SVG or video output is documented.

### tmux `capture-pane -e` — ANSI text, not pixels

From the tmux man page (source: tmux(1) man page,
https://man7.org/linux/man-pages/man1/tmux.1.html):

- `capture-pane`'s purpose is to "Capture the contents of a pane." By default
  the pane's visible contents go to a tmux paste buffer; `-p` prints to stdout;
  `-S`/`-E` select a line range (negative lines reach into history). It is
  purely textual — a character grid, not pixels or images. (tmux has SIXEL
  graphics support elsewhere, but capture-pane itself dumps text; `-C` can even
  show non-printables as octal.)
- The `-e` flag, verbatim: "If -e is given, the output includes escape
  sequences for text and background attributes." So the text tier *can* carry
  color information — as ANSI escape codes, which is exactly the format freeze
  consumes (see above).
- `send-keys` is the input half: it sends key names (`C-a`, `NPage`) or, with
  `-l`, literal UTF-8; `-H` takes hex codes; `-R` resets terminal state. This
  is deterministic key injection into a pane — no vision, no coordinates.

### asciinema — the text-stream contrast case

asciinema is "a suite of tools for recording, streaming, and sharing terminal
sessions" (source: asciinema docs, https://docs.asciinema.org/). Its asciicast
v2 format is "based on newline-delimited JSON": a JSON header, then event
tuples `[time, code, data]` where code "o" means "printing new data to a
terminal" and `data` is the raw terminal text — including ANSI escapes, e.g.
`"\u001b[1;31mHello \u001b[32mWorld!\u001b[0m\n"` (source: asciicast v2 spec,
https://docs.asciinema.org/manual/asciicast/v2/). It cannot produce GIFs
itself; that requires `agg`, "the asciinema GIF generator" (asciinema docs).
This matters because it shows even the recording tools in this space store
text, and pixels are a separate rendering step.

### OS-level pixel capture — the only true "real terminal window" screenshots

- macOS `screencapture` captures images of the screen or a window to file or
  clipboard; `-l windowid` means "Capture the window with windowid"; `-x`
  silences the shutter sound; `-C` includes the cursor; `-o` drops the window
  shadow; `-c` sends the image to the clipboard. It grabs rendered screen
  pixels (the page notes it even works on DVD Player video "where the normal
  keyboard shortcuts won't work") (source: macOS `screencapture` reference,
  https://ss64.com/mac/screencapture.html). Piping its output into a vision
  model is the zero-dependency pixel bridge on macOS.
- screeny is "a privacy-focused macOS MCP server enabling AI agents to capture
  screenshots of user-approved windows." Tools: `listWindows` ("Lists all
  approved application windows available for screenshot capture") and
  `takeScreenshot` ("Captures a screenshot of a specific window by its ID").
  It can capture windows in the background but not minimized windows, and it
  "Provides actual pixel data - full-fidelity image, not OCR or text
  extraction" as base64 JPEG with a payload cap (Medium preset 250KB)
  (source: rohanrav/screeny README, https://github.com/rohanrav/screeny).

### MCP servers for terminal state — two dedicated screenshot servers, plus the text-only tier

- iterm2-mcp-server lets an assistant "read the contents of iTerm2 terminal
  panes" via the iTerm2 Python API over a WebSocket. Its eight tools are
  `iterm2_list_panes`, `iterm2_read_pane` ("Read the screen buffer contents
  of a specific pane"), `iterm2_send_text` ("as if typed by the user"),
  `iterm2_send_control_character`, `iterm2_split_pane`, `iterm2_current_pane`
  ("Get information about the current iTerm2 pane where Claude Code is
  running"), and the `iterm2_status`/`iterm2_enable_api` setup helpers. There
  is no screenshot or image-capture tool; all output is text (source:
  sumchattering/iterm2-mcp-server README,
  https://github.com/sumchattering/iterm2-mcp-server).
- lioneltay/terminal-mcp is a dedicated terminal-screenshot MCP server: "MCP
  server that lets AI agents take screenshots of terminal apps running in
  tmux, with full ANSI color and styling rendered via headless xterm.js"
  (source: repo description, https://github.com/lioneltay/terminal-mcp; the
  repo ships no README and no license file, so the source is the code). Its
  single `screenshot` tool renders "a tmux terminal pane as a PNG screenshot"
  of the pane's visible content "with full ANSI color/style support", and its
  own usage guidance keeps input in the text tier — `tmux send-keys` for
  keys, `tmux capture-pane -p` for plain text reads (source: src/index.ts,
  same repo). The mechanism is a pure text-to-pixels pipeline: `tmux
  capture-pane` with escape sequences preserved, parsed into a cell grid by
  `@xterm/headless`, each cell drawn onto a `@napi-rs/canvas` canvas,
  `renderer.ts` returning the raw PNG buffer, which `src/index.ts` then
  base64-encodes into the `image/png` MCP content (sources: src/renderer.ts
  and src/index.ts, same repo).
- computer-agent-labs/terminal-use goes further: "MCP server that lets AI
  agents drive a real terminal: type, press keys, click, read the screen,
  take screenshots." Sessions run under node-pty and feed a headless xterm.js
  emulator whose buffer the README calls "the single source of truth" for
  both reads and screenshots; `terminal_screenshot` renders "the screen as a
  PNG" (with bundled JetBrains Mono), and `terminal_click` performs
  "Left-click a cell, with a preview step" — coordinates are 1-indexed cell
  positions, the preview (on by default) returns a screenshot with a ring
  drawn around the target cell without clicking, and a real click requires
  the program to enable mouse reporting, erroring rather than injecting fake
  escape codes otherwise (source: computer-agent-labs/terminal-use README,
  MIT, https://github.com/computer-agent-labs/terminal-use).

Correction record: an earlier draft of this section asserted, from two web
searches, that no MCP server dedicated to screenshotting terminal state
exists. That claim is withdrawn — terminal-mcp and terminal-use are exactly
such servers. But both render pixels *headlessly* from text the server can
already read (capture-pane ANSI, or a node-pty-fed xterm buffer); neither
captures a real Terminal.app/iTerm2 window or sees emulator chrome, which
confirms the core verdict rather than overturning it. The verified paths
stand: `screencapture -l`/screeny for real-window pixels, iterm2-mcp-server
for text, terminal-mcp/terminal-use for synthetic PNGs of PTY/tmux state.
terminal-use's `terminal_click` also marks a middle tier in Q3's
element-detection spectrum: cell coordinates with a preview ring — finer
than full-display pixel coordinates (Anthropic computer use), but still grid
coordinates, not element identity.

### Vision-model loops — screenshot, reason over pixels, click coordinates

Anthropic's computer use tool gives a model "screenshot capabilities and
mouse/keyboard control for autonomous desktop interaction." Its member tools
include `screenshot` (full display returned as an image), `zoom` (a region at
full resolution for reading small text), `left_click`/`right_click`/etc. with
coordinates, `type`, and `key`. Clicking is explicitly coordinate-based:
"Coordinates are in screenshot pixels," in "the pixel space of the full-display
screenshots you return, with the origin at the top left," and the docs advise
placing the target description before the image "because Providing the target
description before the image is processed improves click accuracy," plus using
`zoom` when clicks miss (source: Anthropic computer use documentation,
https://platform.claude.com/docs/en/docs/agents-and-tools/computer-use). This
is the pixel tier's interaction model: no element identity, only coordinates
reasoned from the image — which is why its accuracy guidance is about image
framing and descriptive prompts.

## Q4 — Recommendation: text level first, escalate only on these gaps

### When text-level control (tui-use, tmux) is strictly better

1. **Driving the program.** Deterministic key injection beats coordinate
   guessing. tui-use types into the PTY it spawns and returns "clean plain
   text" snapshots with a `highlights` field "listing the inverse-video spans
   on screen — the standard way TUI programs indicate selected items"
   (source: onesuper/tui-use README, https://github.com/onesuper/tui-use);
   tmux `send-keys` injects exact key names or literal bytes into a pane
   (tmux man page). Compare the vision loop's own documented failure mode:
   clicks can miss, and the mitigation is prompt phrasing and `zoom`
   (Anthropic computer use docs). For a TUI driven by keys, sending the keys is
   categorically more reliable than clicking their pixels.
2. **Reading state.** A text grid is exact and greppable: tui-use has `find
   <pattern>` regex search and `wait --text <pattern>` for semantic syncing,
   plus `wait` until the screen stabilizes (tui-use README); `capture-pane -e`
   gives the same grid with colors as ANSI escapes (tmux man page). No pixel
   tool offers grep; a vision model must re-OCR the screen every step, at
   higher token cost and with transcription risk.
3. **Selection semantics.** The inverse-video `highlights` field is the TUI's
   own machine-readable "what is selected" signal (tui-use README). Pixels only
   let a vision model *infer* selection from appearance.
4. **Headless and CI.** The text tier needs no display server, no macOS Screen
   Capture permission, and no window manager. Even vhs — a pixel tool — falls
   back to text golden files (`.txt`/`.ascii` outputs) when the job is
   *testing* rather than demoing (vhs README).
5. **Scale.** Parallel sessions are cheap: tui-use runs a background daemon
   managing multiple labeled sessions (`start`, `list`, `use`, `kill`; tui-use
   README) and tmux scripts arbitrary panes — whereas OS screenshot tiers are
   bound to real windows on one desktop, one at a time, under user approval
   (screeny README).

### The concrete gaps that force escalation to the pixel/visual tier

1. **Rendered appearance.** tui-use strips styling — its README's Limitations
   section says "colors and most formatting are stripped" and "TUI color/style
   info is mostly lost". To verify or present what a human actually sees
   — theme colors, 256-color output, layout — render pixels: vhs for animated
   GIF/MP4/WebM/PNG frames (vhs README), freeze or termshot for static
   PNG/SVG/WebP (freeze README; termshot README). The bridge is documented by
   freeze itself: `tmux capture-pane -pet 1 | freeze` turns the text tier's
   output into an image (freeze README).
2. **GUI chrome outside the PTY.** Terminal tabs, sidebars, buttons, and
   settings of Terminal.app/iTerm2 are invisible to every PTY-level tool above.
   Real chrome requires real pixels: `screencapture -l <windowid>` (ss64
   screencapture reference) or screeny's `takeScreenshot` (screeny README) —
   or the Accessibility/GUI tier covered by the sibling area, which is also
   what reaches emulator *controls* (menus, settings panes) rather than just
   their image.
3. **Look-and-click interaction.** When the only specification of a target is
   visual ("the blue Submit button in the bottom-right," Anthropic computer use
   docs) or the target lives in a GUI that has no text channel, the
   vision-model screenshot/click loop is the tool — accepting coordinate-based
   action as its cost (Anthropic computer use docs). Inside a TUI grid that
   enables mouse reporting, terminal-use's `terminal_click` offers an
   intermediate: 1-indexed cell coordinates with a preview ring — still
   coordinates, not element identity (terminal-use README). For
   element-semantic GUI control, the Accessibility tier (open-computer-use /
   computer-use, sibling area's subject) is the stronger escalation.
4. **Non-text pane content.** `capture-pane` "dumps text" even though tmux has
   SIXEL graphics support elsewhere (tmux man page) — graphics rendered inside
   a pane do not survive text capture, and tui-use's headless xterm snapshot is
   plain text (tui-use README). Pixels are the only faithful capture for such
   content.

### Bottom line

Default to the text tier — tui-use for spawning and driving TUI programs, raw
tmux `send-keys`/`capture-pane -e` for panes an agent did not launch. Escalate
to vhs/freeze/termshot only when pixels themselves are the deliverable or the
assertion target (demos, docs, visual regression of rendered output). Escalate
to `screencapture`/screeny plus a vision model, or to Accessibility-based GUI
automation, only when the target is the emulator's GUI — chrome, menus,
dialogs — or when a target is specified only by appearance.

## Sources

- charmbracelet/vhs README — https://github.com/charmbracelet/vhs
- charmbracelet/freeze README — https://github.com/charmbracelet/freeze
- homeport/termshot README — https://github.com/homeport/termshot
- tmux(1) man page — https://man7.org/linux/man-pages/man1/tmux.1.html
- asciinema docs — https://docs.asciinema.org/
- asciicast v2 format spec — https://docs.asciinema.org/manual/asciicast/v2/
- rohanrav/screeny README — https://github.com/rohanrav/screeny
- sumchattering/iterm2-mcp-server README — https://github.com/sumchattering/iterm2-mcp-server
- lioneltay/terminal-mcp (repo description + src/index.ts + src/renderer.ts) — https://github.com/lioneltay/terminal-mcp
- computer-agent-labs/terminal-use README — https://github.com/computer-agent-labs/terminal-use
- macOS screencapture reference — https://ss64.com/mac/screencapture.html
- Anthropic computer use docs — https://platform.claude.com/docs/en/docs/agents-and-tools/computer-use
- onesuper/tui-use README — https://github.com/onesuper/tui-use
