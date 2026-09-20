# Installing the Codex + Z.ai kit

## Automatic install

Run from a clone or directly from GitHub:

```sh
npx github:hmziqrs/ai codex
```

The installer:

1. Adds the non-secret Z.ai provider block to user-level
   `~/.codex/config.toml` and preserves the current default OpenAI model.
2. Installs agent definitions in `~/.codex/agents/`.
3. Installs all six profiles next to `~/.codex/config.toml`.
4. Installs the model catalog in `~/.codex/model-catalogs/`.
5. Installs the four skills in `~/.agents/skills/`.
6. Imports `ZAI_API_KEY` into the private Codex-only file
   `~/.codex/secrets/zai-api-key` and sets its mode to `0600`.

Provide `ZAI_API_KEY` in the installer's environment. Provider authentication
reads only `~/.codex/secrets/zai-api-key` through `/bin/cat`. The installer does
not inspect another application's configuration, and the API key is never
copied into the repository or `config.toml`.

If `model_providers.zai` already exists and was not created by this installer,
the installer stops without changing it. Review that table, then opt in to
replacement with:

```sh
npx github:hmziqrs/ai codex --force-provider
```

A timestamped copy of `config.toml` is created before a provider change.

## Z.ai protocol requirement

Codex custom providers use the OpenAI Responses protocol. The provider targets
Z.ai's documented Responses base URL:

```text
https://api.z.ai/api/v1
```

Use a Z.ai key that has access to this endpoint. Some older Coding Plan
accounts may only have Chat Completions access; Z.ai documents that limitation
separately, and those accounts cannot be made compatible merely by changing a
Codex model name.

## Use

Restart the Codex app (or open a new CLI session), then dispatch a custom agent
by name. For example:

```text
Use zai_vision to inspect this UI with computer use and capture evidence.
Use zai_reviewer to audit this change without editing files.
```

CLI profiles remain available for direct sessions:

```sh
codex --profile zai-flash-max
codex --profile zai-pro-max
```

`zai_vision` inherits browser, MCP, plugin, and unified-computer-use tools from
its parent Codex session. The model assignment supplies visual reasoning; the
computer-use plugin still has to be installed and enabled in that parent
session.

### Reversible Desktop launcher

Install `scripts/codex-zai-desktop` under both
`~/.local/bin/codex-zai` and `~/.local/bin/codex-openai`, then launch with:

```sh
codex-zai flash /path/to/project
codex-zai pro /path/to/project
codex-openai /path/to/project
```

`codex-zai` saves the current OpenAI configuration under the private
`~/.codex/desktop-profiles/` directory, activates a generated Z.ai configuration
atomically, and gracefully restarts Desktop. The model catalog is startup-only,
so command-line launch overrides are not used. Run `codex-openai` to restore
the exact saved OpenAI configuration before starting the official model catalog.

## Manual install

The source of truth is entirely under `codex/`:

- `agents/*.toml` — custom agents.
- `profiles/*.config.toml` — direct CLI profiles.
- `model-catalogs/zai-models.json` — GLM model metadata.
- `provider-config.toml` — rendered provider/auth template.
- `scripts/codex-zai-desktop` — reversible Z.ai/OpenAI Desktop launcher.
- `plugins/zai-workflows/` — publishable Codex skill plugin.

When installing manually, replace `__ZAI_MODEL_CATALOG__` in copied agent and
profile files with the absolute catalog path. Import `ZAI_API_KEY` into
`~/.codex/secrets/zai-api-key`, set that file's mode to `0600`, and render the
auth template with the Codex secret-file path. Do not put the key itself in `provider-config.toml` or
`~/.codex/config.toml`.

## Uninstall

```sh
npx github:hmziqrs/ai codex uninstall
```

Uninstall removes only the known kit files and the marked provider block. It
does not delete config backups or any unmarked provider configuration.
