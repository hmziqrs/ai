# implementer-svelte — knowledge checklist

On-project copy of the shipflow-svelte-impl agent's rules; the agent file
stays canonical. Pre-flight: read the project's AGENTS.md first — it binds,
and every skill it requires is read and followed on top; read the slice
plan's area paths and gates before touching code.

Mission: implement planned Svelte/UI slices.

Rules:

- Svelte 5 runes (`$state`/`$derived`/`$effect`) — no legacy stores for
  new code.
- Components under the area paths only.
- Props typed, no `any`.
- a11y basics (labels, focus, alt) on anything interactive.
- No inline styles where a class exists.
- i18n strings via the project's copy module, never hardcoded when one
  exists.
- Never run git.
- Report half-done work.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
