# tui-use Capabilities: What It Controls and What Its Snapshots Contain (Q1 + Q2)

Research date: 2026-10-15. Primary subject: tui-use (https://github.com/onesuper/tui-use,
npm package `tui-use`). Method: read the GitHub README and the full source of `src/session.ts`,
`src/highlights.ts`, `src/cli.ts`, `src/daemon.ts`, `src/protocol.ts`, the shipped agent skill
`skills/tui-use/SKILL.md`, the repo file tree and issues via the GitHub API, and the npm
registry metadata for `tui-use`, `@xterm/headless`, plus the `node-pty` and `xterm.js` READMEs.
All quotes below were fetched during this session; commands run are named inline.

## Verdict

**Q1 — tui-use does NOT control the terminal-emulator GUI.** It spawns each target program
inside a fresh pseudo-terminal of its own (`node-pty` `pty.spawn` in `src/session.ts:229`) and
keeps a headless `@xterm/headless` emulator as the only "screen" that ever exists. Nothing in
the repository touches Terminal.app, iTerm2, or any emulator's window chrome: the README's own
description is "Spawn any program in a PTY, read its screen as plain text, send keystrokes —
all from the command line" (README, "What is tui-use?"). A case-insensitive grep of `src/cli.ts`
for `screenshot|image|pixel|png|accessibility|osascript|apple|iterm|terminal.app|gui` returned
zero matches, and the daemon's IPC protocol (`src/protocol.ts:26-94`) defines exactly 13 request
types — `start, snapshot, wait, type, press, kill, list, use, paste, find, scroll, info, rename`
— with no "attach to an existing terminal" or "screenshot" operation.

**Q2 — tui-use cannot take screenshots or visually detect UI elements.** Its snapshot is a
plain-text render of the headless xterm buffer (`translateToString(true)` per row,
`src/session.ts:303`) plus structured metadata: cursor position, window title, an
alternate-screen flag, and `highlights` — inverse-video spans extracted per cell via
`cell.isInverse()` (`src/highlights.ts:61`). There is no image-producing code path anywhere in
the dependency tree (the only runtime dependencies are `node-pty`, `@xterm/headless`, and
`commander` — npm registry, `tui-use@0.1.20`). One nuance: an opt-in `snapshot --color` flag
re-encodes per-cell style (fg/bg palette or RGB, bold, underline, inverse, ...) back into ANSI
SGR escape sequences embedded in the text lines (`src/session.ts:16-27, 52, 86`; `src/cli.ts:67`),
so color survives as text-encoded attributes — but the output is still characters, never pixels,
and "detection" is always a deterministic buffer scan, never vision.

For agent-driven TUI work this places tui-use firmly in the text tier: it can drive vim, htop,
fzf, REPLs and debuggers by reading emulated text and sending keystrokes, but it cannot see or
operate anything outside the program it spawned, and it cannot answer questions that require
looking at rendered pixels.

## Q1 evidence: PTY spawn, not GUI attach

### The architecture is spawn-and-emulate

The README's "How It Works" section states the data flow in one line:

> "tui-use sits directly on the PTY event stream — every byte the program outputs flows through
> a headless terminal emulator in real time." (README, "How It Works",
> https://github.com/onesuper/tui-use#how-it-works)

Concretely, each `tui-use start <cmd>` creates a brand-new session object whose constructor
does exactly one OS-level thing — fork a new pseudo-terminal running `$SHELL -c <command>`:

```ts
const shell = process.env.SHELL ?? "/bin/sh";
this.ptyProcess = pty.spawn(shell, ["-c", command], {
  name: "xterm-256color",
  cols, rows,
  cwd: options.cwd ?? process.cwd(),
  env: process.env as { [key: string]: string },
});
```
(`src/session.ts:228-235`, https://github.com/onesuper/tui-use/blob/main/src/session.ts)

`pty.spawn` is `node-pty`, self-described as "`forkpty(3)` bindings for node.js. This allows you
to fork processes with pseudoterminal file descriptors" (node-pty README,
https://github.com/microsoft/node-pty). `forkpty(3)` allocates a *new* pseudo-terminal; it has no
operation for attaching to the TTY of an already-running GUI terminal window. The session class
header says the same thing in its own words:

> "Uses @xterm/headless as a VT renderer — all PTY output is written into the terminal emulator,
> and `snapshot()` reads back the rendered screen." (`src/session.ts:1-6`)

The emulated screen is a fixed grid the agent chooses at spawn time — `--cols`/`--rows`, default
120x30 (`src/cli.ts:38-39`; README CLI table) — backed by 10,000 lines of scrollback
(`src/session.ts:213`). These dimensions belong to the emulator, not to any real window; the
user's Terminal.app or iTerm2 window size is irrelevant and untouched.

### The daemon owns the sessions; nothing attaches to an existing window

Sessions persist across CLI invocations in a background daemon: "Behind the scenes, a daemon
process manages PTY sessions so they persist across CLI calls" (README, "How It Works"). The
daemon listens on a Unix socket at `~/.tui-use/daemon.sock` (TCP port 7654 on Windows) and
auto-exits after all sessions have been dead for 5 minutes (`src/daemon.ts:24-32, 36-39`,
https://github.com/onesuper/tui-use/blob/main/src/daemon.ts). Its entire job is holding
`Session` objects (PTY + headless emulator pairs); there is no code path that enumerates,
focuses, or injects input into a GUI application.

### The protocol surface has no GUI operation

The daemon protocol (`src/protocol.ts`) is the complete capability list, because every session
CLI command maps to one request type. The 13 request types are: `start` (line 26), `snapshot` (37),
`wait` (42), `type` (51), `press` (57), `kill` (62), `list` (66), `use` (70), `paste` (75),
`find` (80), `scroll` (85), `info` (90), `rename` (94)
(https://github.com/onesuper/tui-use/blob/main/src/protocol.ts). There is no
`attach`/`connect`/`adopt` (no way to take over a TTY tui-use did not spawn), no
`screenshot`, and no window-management call. The CLI mirrors this protocol surface: its 15
session commands are `start, snapshot, wait, type, press, kill, use, keys, paste, find, scrollup,
scrolldown, info, rename, list` — `keys` prints the supported key names locally
(`src/cli.ts:168-174`) and `scrollup`/`scrolldown` both send the protocol's single `scroll`
request with a signed line count (`src/cli.ts:223, 241`) — and the remaining registrations are
the `daemon` command (`src/cli.ts:332`) with its three lifecycle subcommands `status`, `stop`,
`restart` (`src/cli.ts:336, 348, 356`: "Check if the daemon is running", "Stop the daemon",
"Restart the daemon"), which manage the tui-use background process itself and touch no session
or GUI. That is 19 `.command()` registrations in all on main-branch `src/cli.ts`
(`grep -n '^  \.command('`, verified 2026-10-15) — none of them a GUI operation
(`src/cli.ts:34-356`; README "CLI Interface").

### Negative evidence across the whole repo

Checks actually run this session against the main branch (2026-10-15):

- Full file tree via `gh api repos/onesuper/tui-use/git/trees/main?recursive=1`: 50 files —
  19 markdown, 14 TypeScript, 7 JSON, 5 Python example scripts (`examples/ask.py`,
  `examples/dialog.py`, `examples/menu.py`, `examples/picker.py`, `examples/tabs.py`), plus one
  each of `.yml`, `.npmignore`, `.js`, `.gitignore`, and `LICENSE`. The only native code is the
  `node-pty` binding delivered via prebuilt binaries and `scripts/install.js`; there is no
  Swift/Objective-C/AppleScript/Accessibility source anywhere in the tree — the Python files are
  usage examples for tui-use's own CLI, not GUI automation code.
- `grep -n -i "screenshot\|image\|pixel\|png\|accessibility\|osascript\|apple\|iterm\|terminal.app\|gui"`
  over `src/cli.ts` (427 lines): zero matches (grep exit status 1).
- `grep -c -i "screenshot\|pixel\|image\|visual\|accessibility\|osascript"` over
  `docs/superpowers/specs/2026-04-08-tui-use-git-test-design.md`,
  `docs/superpowers/plans/2026-04-08-tui-use-git-test.md`,
  `plugins/tui-use/skills/tui-use/SKILL.md`, and `package.json`: 0 matches in each file.
- The shipped agent skill describes the same text-only workflow —
  "Operate interactive terminal programs (REPLs, debuggers, TUI apps) using PTY automation"
  (`skills/tui-use/SKILL.md` frontmatter,
  https://github.com/onesuper/tui-use/blob/main/skills/tui-use/SKILL.md).
- Tracker: the only two open items are pull requests, not issues — #8 "fix: repair Windows
  postinstall probe and the build workflow" and #4 "feat: include cursor position in wait change
  detection" (each carries `pull_request: true`; `gh api
  "repos/onesuper/tui-use/issues?state=open"`, 2026-10-15). The repo's `open_issues_count: 2`
  counts these PRs too, so the issue tracker itself currently has zero open issues; the repo has
  discussions disabled (`has_discussions: false` from `gh api repos/onesuper/tui-use`). Nothing
  on the tracker promises or discusses GUI or screenshot capability.

### Two fields that are easy to misread as GUI state

- `title` — captured from the program's own xterm window-title escape sequence via the
  emulator's `onTitleChange` callback (`src/session.ts:218-220`). It is the title *the program
  asked for*, observed inside the PTY stream; tui-use never reads a real Terminal.app/iTerm2
  title bar.
- `is_fullscreen` — derived from `bufferNamespace.active.type === "alternate"`
  (`src/session.ts:143-145`), i.e. whether the program switched to the alternate screen buffer
  (as vim/htop do). It says nothing about the macOS window being full-screen.

Both live in the README's Limitations as emulator-observed state: "Window title and fullscreen
mode are captured in `title` and `is_fullscreen`" (README, "Limitations"). UNVERIFIED beyond
these sources: nothing suggests any integration with Terminal.app, iTerm2, tmux panes, or VS Code
terminals — the tool's model is strictly "program spawned by tui-use".

## Q2 evidence: text snapshots plus highlights, never screenshots

### What a snapshot actually is

`Session.snapshot()` reads the emulated buffer row by row:

```ts
plainLines.push((buf.getLine(startY + i)?.translateToString(true) ?? "").trimEnd());
```
(`src/session.ts:301-306`, https://github.com/onesuper/tui-use/blob/main/src/session.ts)

`translateToString(true)` returns the characters in that buffer row — this is a text
serialization of the emulator's cell grid, not a raster of anything. The result is trimmed of
leading/trailing empty lines and returned with cursor coordinates, change flag, title,
fullscreen flag, and highlights (`src/session.ts:297-347`). The README promises exactly this:
"PTY output is processed by a headless xterm emulator. ANSI escape sequences, cursor movement,
and screen clearing all work correctly. The `screen` field is always clean plain text."
(README, "Features", "Full VT Rendering").

The JSON shape shipped in the project's own skill doc confirms the field set
(`skills/tui-use/SKILL.md`, "wait output", https://github.com/onesuper/tui-use/blob/main/skills/tui-use/SKILL.md):

```json
{
  "session_id": "abc12345",
  "screen": "What is your name?\n> Alice",
  "cursor": { "x": 2, "y": 1 },
  "changed": true,
  "status": "running",
  "exit_code": null,
  "title": "",
  "is_fullscreen": false,
  "cols": 120,
  "rows": 30,
  "highlights": []
}
```

The emulator is `@xterm/headless`, "a headless terminal component that runs in Node.js"
(npm registry, https://www.npmjs.com/package/@xterm/headless) — the xterm.js project describes it
as "a stripped down version of xterm.js that runs headless in Node.js", intended for tracking a
terminal's buffer state with no rendering front end (xterm.js README,
https://github.com/xtermjs/xterm.js#readme, "We also publish @xterm/headless"). A headless
emulator has no renderer and produces no pixels by design; the only way state leaves it is
through buffer reads like the ones above.

### Highlights: structured inverse-video spans, not visual detection

The closest tui-use gets to "UI element detection" is the `highlights` field. `extractHighlights`
walks every cell of every row and tests `cell.isInverse() !== 0`, accumulating contiguous
inverse-video runs into `{ line, col_start, col_end, text }` objects
(`src/highlights.ts:47-79`, https://github.com/onesuper/tui-use/blob/main/src/highlights.ts).
The file header explains the intent:

> "Scans xterm buffer cells for inverse-video (reverse) attributes and returns structured
> Highlight objects — one per contiguous inverse run per line. This lets AI agents identify
> selected items in TUI menus, tab bars, dialogs, and status lines without parsing ANSI codes."
> (`src/highlights.ts:1-5`)

The README frames it the same way: "Every snapshot includes a `highlights` field listing the
inverse-video spans on screen — the standard way TUI programs indicate selected items. Agents
can read which menu option, tab, or button is currently active without parsing text or guessing
from cursor position." (README, "Features", "Highlights"). This is deterministic data read from
the emulator buffer — the program's own markup (inverse video), not inference from appearance.
It detects only what TUI programs express as inverse video; a button drawn with box-drawing
characters, a sidebar distinguished by color alone, or an icon have no representation here.

The other "element" tools are textual too: `find <pattern>` returns regex matches with
`line`/`col_start`/`col_end` on the plain-text screen (`find` method at
`src/session.ts:435-457`; README CLI table), and the cursor position comes from
`buf.cursorX/cursorY` (`src/session.ts:339`).

### The `--color` nuance: ANSI re-encoding, not pixels

The README's Limitations section still says color is lost:

> "TUI color/style info is mostly lost — `screen` contains plain text only; colors and most
> formatting are stripped. Selected items and active elements are captured in `highlights` via
> inverse-video detection." (README, "Limitations")

The current code adds an opt-in escape hatch: `snapshot --color` and `wait --color` ("Preserve
ANSI color/style escape sequences in output lines", `src/cli.ts:67, 86`) make `snapshot()` walk
the buffer again and re-encode each cell's style — fg/bg as palette index or 24-bit RGB, plus
bold, dim, italic, underline, blink, inverse, strikethrough — into SGR escape sequences
interleaved with the characters (`CellStyle` at `src/session.ts:16-27`; `styleToAnsi` at
`src/session.ts:52`; `renderLineWithColor` at `src/session.ts:86`). So the README's "mostly
stripped" understates the current release: color survives when asked for. The important boundary
does not move, though: the payload is still a line of text carrying escape codes. There is no
canvas, no PNG encoder, no image type anywhere in the dependencies (npm registry:
`tui-use@0.1.20` depends only on `node-pty ^1.0.0`, `@xterm/headless ^6.0.0`, `commander ^12.0.0`),
and no code that could feed a vision model — a consumer wanting pixels would have to render the
ANSI text itself with a separate tool.

### Negative evidence for any screenshot path

- `grep -n -i "screenshot|image|pixel|png|..."` over `src/cli.ts`: zero matches (run this
  session, exit status 1). The same grep over the design docs, the plugin skill, and
  `package.json`: zero matches.
- The repo-wide file tree contains no asset, fixture, or test that is an image file; the test
  files are all `.test.ts` asserting on text/highlights (`src/highlights.test.ts`,
  `src/session.test.ts`, etc. — file tree via GitHub API).
- The daemon protocol types have no image-shaped field either: `SnapshotRequest` carries only
  `type: "snapshot"` plus an optional `color` flag (`src/protocol.ts:35-38`), and `ScreenResponse`
  — returned by both `snapshot` and `wait` — is built from `lines: string[]` together with
  cursor, status, title, fullscreen, dimension, and `highlights` fields
  (`src/protocol.ts:120-140`); the `screen` key in CLI JSON output is assembled by joining those
  lines (`screen: r.lines.join("\n")`, `src/cli.ts:377`). A string array is even further from an
  image than a single string: the type system itself has no field an image could occupy.

## What this settles for the visual-tier questions (bridge to Q3/Q4)

Everything tui-use knows about the program it spawned, it knows from two channels: bytes it
writes into the PTY (keystrokes) and cell attributes it reads out of its own emulator (text,
cursor, inverse-video spans, title, alternate-screen flag). Both channels terminate at the PTY
boundary: the Terminal.app/iTerm2 window, its tabs and sidebars, its settings, and every other
pane in the user's session are as invisible to tui-use as they are to `bash`. When an agent's
task is "make this TUI program do X", the text tier gives deterministic, coordinate-addressable
state (`highlights`, `find`, cursor) and a stable readiness signal (`wait`/`wait --text`) that
pixel-based approaches cannot match; when the task is "operate the terminal application itself"
or "judge what the screen looks like" — anything involving window chrome, colors-as-appearance,
or layout the program does not encode in text/attributes — tui-use has no capability at all, and
the work must move up to Accessibility-based GUI automation or vision-model screenshotting,
which the sibling areas (`terminal-gui.md`,
`visual-tui.md`) cover.

## Grounded in

1. tui-use README (main branch, fetched 2026-10-15) —
   https://github.com/onesuper/tui-use#readme (quotes: "Spawn any program in a PTY...", "Full VT
   Rendering", "Highlights", "How It Works", "Limitations", "Why not tmux?")
2. `src/session.ts` (487 lines, fetched via GitHub contents API 2026-10-15) —
   https://github.com/onesuper/tui-use/blob/main/src/session.ts (pty.spawn at :229, headless
   Terminal at :213, snapshot at :297-347, is_fullscreen at :143-145, color re-encoding at :16-96)
3. `src/highlights.ts` (81 lines) —
   https://github.com/onesuper/tui-use/blob/main/src/highlights.ts (isInverse scan at :47-79)
4. `src/cli.ts` (427 lines) —
   https://github.com/onesuper/tui-use/blob/main/src/cli.ts (command surface :34-356, --color
   flag :67/:86; negative grep run on fetched content)
5. `src/daemon.ts` (429 lines) —
   https://github.com/onesuper/tui-use/blob/main/src/daemon.ts (socket path and idle timeout :24-32)
6. `src/protocol.ts` (219 lines) —
   https://github.com/onesuper/tui-use/blob/main/src/protocol.ts (13 request types :26-94)
7. `skills/tui-use/SKILL.md` (151 lines, the skill shipped in the repo) —
   https://github.com/onesuper/tui-use/blob/main/skills/tui-use/SKILL.md (snapshot JSON example)
8. tui-use repo metadata and tracker via GitHub API (`gh api repos/onesuper/tui-use`,
   `gh api "repos/onesuper/tui-use/issues?state=open"`,
   `gh api repos/onesuper/tui-use/git/trees/main`) —
   TypeScript, MIT, 269 stars, created 2026-04-07, `open_issues_count: 2` (two open PRs, zero
   open issues), discussions disabled —
   https://github.com/onesuper/tui-use/issues
9. npm registry metadata for `tui-use@0.1.20` (fetched 2026-10-15) —
   https://registry.npmjs.org/tui-use (description "TUI automation for AI agents — like
   BrowserUse, but for the terminal"; dependencies node-pty ^1.0.0, @xterm/headless ^6.0.0,
   commander ^12.0.0)
10. npm registry metadata for `@xterm/headless` — https://www.npmjs.com/package/@xterm/headless
    ("A headless terminal component that runs in Node.js") and xterm.js README —
    https://github.com/xtermjs/xterm.js#readme ("stripped down version of xterm.js that runs
    headless in Node.js")
11. node-pty README — https://github.com/microsoft/node-pty ("forkpty(3) bindings for node.js...
    fork processes with pseudoterminal file descriptors")
12. tui-use GitHub landing page (WebFetch of https://github.com/onesuper/tui-use, 2026-10-15) —
    corroborates README quotes and repo stats.
