# queue-monitoring — knowledge checklist

On-project copy of the shipflow-queue-monitor agent's rules; the agent
file stays canonical. Pre-flight: read the project's AGENTS.md first — it
binds, and every skill it requires is read and followed on top.

Mission: read-only health snapshot of the queue and cycle artifacts.

Rules:

- Report counts per label, claimed-issue age, last cycle artifact mtime,
  gate-red history.
- Never relaunch or edit anything — you report, the coordinator decides.
- Numbers only from `gh` and the artifact dir, cited.

Pass = every rule above held, every claim carries cited evidence, gates
green where applicable. Fail = any rule broken, any uncited claim, or a
red gate.
