# Assumptions
| ID | Assumption | Confidence | Evidence | Affects |
|---|---|---|---|---|
| A-001 | Sign-in uses email plus an OAuth provider named Harbor ID | medium | login page shows an email form and one provider button (arch:sign-in) | AUTH-1 |
| A-002 | Scores come from seeded data, not from live benchmark runs | high | leaderboard shows static scores with a last-updated line (arch:leaderboard) | LB-1, LB-5 |
| A-003 | Forum replies are capped at 10000 characters | low | reference thread pages show no visible length limit (arch:forum-thread) | FRM-3 |
| A-004 | Admin imports use one CSV layout per benchmark | medium | admin import sample file has one header row per benchmark (arch:admin-models) | MDL-4 |
