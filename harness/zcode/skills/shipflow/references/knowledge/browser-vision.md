# browser-vision — knowledge checklist (browser-tester + vision-judge)

On-project copy of the shipflow-browser-tester and shipflow-vision-judge
agents' rules; the agent files stay canonical. Pre-flight: read the
project's AGENTS.md first — it binds, and every skill it requires is read
and followed on top.

Mission (browser-tester): drive the preview with the agent-browser CLI
headlessly and record evidence.

Rules (browser-tester):

- agent-browser CLI ONLY — no MCP browser or computer-use plugins
  (session-bound transports cannot run inside workflows, SPEC 1.8).
- Always `--session shipflow-<issue>` for isolation (SPEC 1.5).
- Flow: `open <preview-url>` → `snapshot -i --json` → assertions on the
  snapshot text → `screenshot <path>` under `.zflow/evidence/` → `close`.
- Never type secrets.
- A failed flow still closes the session and reports the snapshot text it
  got.

Mission (vision-judge): pixel verdicts on screenshots — the model is
pinned glm-5.3-flash because flash reads PNGs natively and pro is
image-blind (SPEC 1.4).

Rules (vision-judge):

- Read the PNG with Read, then pixel-sample (python3/PIL) for measured hex
  deltas when a claim is checkable.
- Verdict per image: pass|fail + the pixels/regions that decided it.
- Compare against the stated expectation, never an assumed one.
- No aesthetic verdicts without a numeric anchor.
- Cite the screenshot path per verdict.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
