# Installing the Codex + Z.ai kit

There is no installer script. An AI agent (or a human) performs these
steps directly; everything the kit needs is under `harness/codex/`.

1. **Provider block.** Copy `provider-config.toml` into user-level
   `~/.codex/config.toml` between its `# BEGIN hmziqrs/ai Codex Z.ai
   provider` / `# END hmziqrs/ai Codex Z.ai provider` markers,
   replacing `__ZAI_API_KEY_FILE__` with the absolute path of the
   secret file below. The block never selects Z.ai as the global
   default provider and never contains the key itself. If an unmarked
   `[model_providers.zai]` table already exists, stop and ask the
   human; if they approve replacement, save a timestamped copy of
   `config.toml` first.
2. **Agents and profiles.** Copy `agents/*.toml` to
   `~/.codex/agents/` and `profiles/*.config.toml` next to
   `~/.codex/config.toml`, replacing `__ZAI_MODEL_CATALOG__` in each
   with the absolute catalog path
   (`~/.codex/model-catalogs/zai-models.json`).
3. **Model catalog.** Copy `model-catalogs/zai-models.json` to
   `~/.codex/model-catalogs/zai-models.json`.
4. **Skills.** Copy each skill folder in `plugins/zai-workflows/skills/`
   and each skill folder in every top-level category directory of the
   repo (`copy/`, …) to `~/.agents/skills/`, keeping folder names.
5. **Secret.** Import `ZAI_API_KEY` from the environment into
   `~/.codex/secrets/zai-api-key`: create `~/.codex/secrets/` with
   mode `0700` if needed, write the file with mode `0600`, and never
   overwrite an existing secret. Provider authentication reads only
   that file through `/bin/cat`; the key never enters Git,
   `config.toml`, or command output.
6. **Legacy cleanup.** Remove `~/.codex/bin/zai-credential.js` if an
   older install left it.

Update = re-run the steps (the secret is reused, not rewritten).
Uninstall = reverse them: delete the agent, profile, catalog, and
skill files; remove the marked provider block (keep the config
backups); remove `~/.codex/bin/zai-credential.js`. The secret file is
intentionally preserved.

## Z.ai protocol requirement

Codex custom providers use the OpenAI Responses protocol. The provider
targets Z.ai's documented Responses base URL:

```text
https://api.z.ai/api/v1
```

Use a Z.ai key that has access to this endpoint. Some older Coding
Plan accounts may only have Chat Completions access; Z.ai documents
that limitation separately, and those accounts cannot be made
compatible merely by changing a Codex model name.

## Use

Restart the Codex app (or open a new CLI session), then dispatch a
custom agent by name. For example:

```text
Use zai_vision to inspect this UI with computer use and capture evidence.
Use zai_reviewer to audit this change without editing files.
```

CLI profiles remain available for direct sessions:

```sh
codex --profile zai-flash-max
codex --profile zai-pro-max
```

`zai_vision` inherits browser, MCP, plugin, and unified-computer-use
tools from its parent Codex session. The model assignment supplies
visual reasoning; the computer-use plugin still has to be installed
and enabled in that parent session.

### Reversible Desktop launcher

Install `scripts/codex-zai-desktop` under both
`~/.local/bin/codex-zai` and `~/.local/bin/codex-openai`, then launch
with:

```sh
codex-zai flash /path/to/project
codex-zai pro /path/to/project
codex-openai /path/to/project
```

`codex-zai` saves the current OpenAI configuration under the private
`~/.codex/desktop-profiles/` directory, activates a generated Z.ai
configuration atomically, and gracefully restarts Desktop. The model
catalog is startup-only, so command-line launch overrides are not
used. Run `codex-openai` to restore the exact saved OpenAI
configuration before starting the official model catalog.
