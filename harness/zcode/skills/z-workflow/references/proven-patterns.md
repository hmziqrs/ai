# Proven workflow patterns — the verified catalogue

Every shape here was executed for real in the October 2026 proof campaign
(mixed GLM-5.3 + GLM-5.3-Flash in every run) and finished green. The
launcher picks from these when planning a run; nothing else is needed.

## Platform rules that bite (each learned live)

- `world.run`'s command is a **compile-time string literal** — never a
  const or template. Paths/flags/round numbers go in the args array.
- `phase()` markers live at the top level only — never inside a concurrent
  callback. One marker names what happens to each area.
- Subagent names must be unique: one per item (`` agent(`Migrator·${p}`) ``)
  in fan-outs, never one fixed name.
- The only top-level `await` barriers allowed: the final join, an optional
  whole-tree smoke, and a join-phase that genuinely needs every area
  (cross-page consistency, final synthesis).
- Per-subagent model pins live IN the script (`model("…GLM-5.3$high")`) —
  they survive the coordinator's submission even when a subagent context
  claims otherwise. Vision interpreters are ALWAYS GLM-5.3-Flash (the only
  vision-capable model), HIGH.
- Fix rounds are bounded (default 1) and an area's fix round holds only
  that area. Report `{converged, rounds}` honestly when a cap hits.
- Auditors/judges return ONLY actionable findings — an interface whose
  array is counted by the gate must not carry PASS notes.

## The ten verified types

| # | Type | Areas and chains | Model mix | Deterministic gate |
|---|---|---|---|---|
| 1 | Web app | ui: implement→audit→vision · api: implement · smoke at join | flash impl+vision, pro audit+api | smoke `node api.js` exit 0 + payload check |
| 2 | CLI tool | core: implement→unit · docs: implement · smoke at join | pro core, flash docs | `node --test` exit 0; smoke `sum 2 3 → 5` |
| 3 | Code sweep | pro seeder → `files.glob` fan-out of flash migrators → pro reviewer at join | pro seed+review, flash migrate | `node --check` per file |
| 4 | Visual family | two ui areas: implement→vision each · join: pro code audit (+unify round) + flash cross-page consistency on fresh captures | pro audit, flash impl+vision | token-block identity verified by re-audit (md5) |
| 5 | TUI output | implement → real run → flash render judge on actual stdout | pro impl, flash judge | real run exit 0 + frame markers in stdout |
| 6 | DOM-verified | implement → pro audit → dump-dom gate (+1 fix round) | flash impl, pro audit | `--dump-dom` markers + card count checked in script |
| 7 | Schema config | pro schema → flash instance → mechanical validator (+1 fix round) | pro schema, flash instance | `node -e` validator: required keys + typeof |
| 8 | Content pipeline | pro planner (typed outline) → flash writer per section → pro editor merge at join | pro plan+edit, flash write | per-writer file isolation by slug |
| 9 | Adversarial | pro implementer ↔ flash attacker over the spec, rounds ≤ 2 | pro impl, flash attack | `node --test` executes the attacker's suite |
| 10 | Capstone | ui: implement→audit→vision · api: implement→unit · docs: implement · smoke at join | full mix in one run | `node --test` + whole-tree smoke |

## Residue tests (also verified live, same campaign)

- **Device lane, serialized:** two device areas queued on ONE operator
  subagent whose FIFO ask-order ran real `xcrun simctl` operations on a
  booted iOS simulator (appearance light → capture; dark → capture), while
  a device-free area finished unblocked in parallel; a flash judge read
  both captures from pixels. Physical-device flow: same shape via
  `mobilecli` / `open-computer-use`.
- **Interactive browser lane:** a subagent loads the `agent-browser` skill
  and drives a REAL browser through its CLI — `open` → `snapshot -i` →
  `eval` → `click @ref` (Playwright-backed) — then reads the live DOM.
  Verified: 3 real clicks moved a counter to "3".
- **Scale ceiling:** 8 concurrent areas (contract max), alternating
  GLM-5.3/GLM-5.3-Flash implementers, per-area `node --check` gates, and a
  join smoke requiring all 8 modules (Σ=36). All green.

## Canonical fragment — per-area state machines, zero global barriers

```ts
const MODELS = {
  pro: model("account:zai-individual-coding-plan/GLM-5.3$high"),
  flash: model("account:zai-individual-coding-plan/GLM-5.3-Flash$high"),
};

phase("Run every area's own chain in parallel — no area waits for another");
const areas = await Promise.all([
  areaA(), // implement → audit → vision, chained INSIDE its own callback
  areaB(), // implement → unit gate — no vision (no UI surface)
]);       // the one legitimate join: the smoke below needs every file

phase("Whole-tree smoke once at the join");
const smoke = await world.run("node", ["demo/app.js"], { timeoutMs: 30000 });
```

Each `areaX()` is an async function whose per-area `try/catch` turns one
failure into one failed area, `report({name, phase, summary}, "areas")` at
every transition feeds the live board, and every agent is created with its
persona and its model pin.
