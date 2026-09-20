# Codex + Z.ai kit

Reusable Codex configuration for Z.ai's OpenAI Responses endpoint. The kit
contains a custom model catalog, five role-specific agents, six CLI profiles,
four workflow skills, and a credential-safe installer.

## Agents

| Role | Model | Reasoning | Use |
|---|---|---:|---|
| `zai_explorer` | GLM-5.3-Flash | low | Read-only fan-out exploration and evidence gathering |
| `zai_flash` | GLM-5.3-Flash | max | Routine implementation and mechanical verification |
| `zai_vision` | GLM-5.3-Flash | max | Screenshots, UI diagnosis, browser/desktop verification, and computer use |
| `zai_pro` | GLM-5.3 | max | Architecture, complex implementation, security, and final decisions |
| `zai_reviewer` | GLM-5.3 | max | Read-only correctness, security, regression, and test review |

The four user-facing worker/reviewer agents are pinned to `max`, as requested.
`zai_explorer` stays at `low` because it is a read-only, high-fan-out search
role rather than an implementation or decision role.

The six profile files expose `low`, `high`, and `max` for both models when a
specific CLI session needs a different effort level. Agent files still win for
agent dispatches.

## Skills and plugin

The publishable plugin is in [`plugins/zai-workflows`](plugins/zai-workflows).
It packages these Codex-native skills:

- `z-workflow` — mixed Flash/Pro routing for complex, multi-phase work.
- `z-proflow` — all-Pro, depth-first execution.
- `z-flashflow` — all-Flash execution with visual verification support.
- `z-liteflow` — a small-task implementation and audit loop.

The skills dispatch `zai_vision` for screenshots, browser flows, and computer
use. GLM-5.3-Flash is used because it is Z.ai's native multimodal model; it
supports image input and tool calling, while GLM-5.3 is text-only.

## Install

From the repository or directly from GitHub:

```sh
npx github:hmziqrs/ai codex
```

This leaves the normal OpenAI model as the default and installs Z.ai as an
opt-in provider. Provide `ZAI_API_KEY` in the installer's environment; the
installer imports it into the private Codex-only file
`~/.codex/secrets/zai-api-key` with mode `0600`. Provider authentication reads
that file, and the key never enters Git or `~/.codex/config.toml`. See
[install.md](install.md) for paths, authentication, manual setup, verification,
and uninstall behavior.

## Launch Desktop with Z.ai

Install `scripts/codex-zai-desktop` under both command names, then select the
Desktop model catalog before startup:

```sh
codex-zai flash /path/to/project
codex-zai pro /path/to/project
codex-openai /path/to/project
```

`codex-zai` snapshots the active OpenAI configuration, atomically activates
the Z.ai provider, selected model, max reasoning, and Z.ai catalog, then
restarts Desktop. `codex-openai` restores that exact snapshot and restarts
Desktop with the official catalog. This persistent switch is necessary because
Desktop reads its shared configuration and model catalog at startup.
