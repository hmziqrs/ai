# Shipflow gates

Gates are the project's own non-mutating checks, discovered by the `workflow-planner` from
manifests and AGENTS.md, run by the cycle script with `world.run`, and read as exit codes.
There is no fixed tool allowlist. The controls are: discovery from real files only, the
mutating-flag refusal list, the mutating-body flag, the baseline rule, and the Step 5
command-set approval where the user sees every gate argv.

## Discovery

The planner reads the project AGENTS.md first: a gate it names wins over anything inferred.
Then it reads the manifests below in the area's directory and the repo root, and records
each gate as `{ tool, args, source }` where `source` is `path:line` of the defining entry.
A gate is never invented: no script name, target or task that does not appear in a file.

| Manifest | Gate candidates | Notes |
|---|---|---|
| `package.json` `scripts` | `<pm> run <name>` for names like `test`, `lint`, `typecheck`, `check`, `build` | `<pm>` from the lockfile: `bun.lock`/`bun.lockb` bun, `pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `package-lock.json` npm. Read the script body; see mutating bodies. |
| `deno.json` / `deno.jsonc` `tasks` | `deno task <name>`; `deno check`, `deno lint`, `deno test` | `deno fmt --check`, never bare `deno fmt`. |
| `Cargo.toml` | `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test` | Add `--manifest-path <crate>/Cargo.toml` for nested crates; workspace flags only when `[workspace]` exists. |
| `go.mod` | `go vet ./...`, `go test ./...`, `gofmt -l .` (fails when output is non-empty: the script checks output, not just exit) | |
| `pyproject.toml`, `setup.cfg`, `tox.ini` | the configured runner: `pytest`, `ruff check`, `ruff format --check`, `mypy`, `uv run <tool>`, `poetry run <tool>` | Tool must appear in the manifest's dependencies or tool tables. |
| `Makefile`, `justfile` | `make <target>`, `just <recipe>` for check, test, lint targets | Read the recipe body; see mutating bodies. |
| `pubspec.yaml` | `dart analyze`, `flutter analyze`, `flutter test`, `dart format --output=none --set-exit-if-changed .` | Flutter only when the SDK dependency is `flutter`. |
| `build.gradle(.kts)`, `gradlew` | `./gradlew check`, `./gradlew test` | Prefer the wrapper when present. |
| `pom.xml` | `mvn -B verify` or `mvn -B test` | `-B` keeps output parseable. |
| `*.csproj`, `*.sln` | `dotnet build --no-restore`, `dotnet test --no-build`, `dotnet format --verify-no-changes` | |
| Project AGENTS.md | any command it lists as a required check | Still subject to the refusal list. |

Each area gets the gates that cover its files. A gate that covers the whole repo is run once
per lane worktree and again on the integration head.

## Baseline rule

The script's `Baseline gates` phase runs every gate in each fresh worktree at `defaultHead`
before any edit, with the same argv and timeout it will use later.

- Base exit 0: the gate counts in the merge predicate.
- Base exit nonzero: the gate is **red on base**. It still runs every round and its results
  are reported, but it is excluded from the predicate and listed in `notCovered` as
  "red on base: <argv> exited <code>". A lane never tries to fix a red-on-base gate unless
  the issue asks for it.
- An area whose every gate is red on base, or that has no gate, is **gateless**: the merge
  predicate fails on it and the report says so. It is never called clean.
- A gate that exits 0 on base and nonzero after the lane is a verified finding against that
  lane, trimmed to the failing lines.

## Refusal list (mutating flags)

The script refuses, as a value and never by throwing, any gate whose args contain one of
these, and records a verified finding naming the gate and its `source`:

| Flag or form | Typical tools |
|---|---|
| `--fix`, `--unsafe-fixes`, `--apply` | eslint, ruff, biome, clippy, dart fix |
| `--write`; `-w` for gofmt and prettier | prettier, biome, gofmt |
| `-u`, `--update`, `--updateSnapshot`, `--update-snapshots` | jest, vitest, playwright, insta |
| `--accept`, `--bless` | snapshot and expect-test tools |
| `fmt` or `format` without `--check`, `--verify-no-changes`, `--set-exit-if-changed`, or `--output=none` | cargo, deno, dart, dotnet, ruff |
| `install`, `add`, `update`, `upgrade`, `publish`, `deploy`, `release`, `migrate`, `db push`, `seed` as a subcommand | package managers, ORMs, CLIs |
| `git` with any subcommand outside `status`, `diff`, `log`, `show`, `rev-parse`, `ls-files` | git |
| `--no-verify`, `--force` | any |
| `curl`, `wget`, `ssh`, `scp`, `docker push`, `gh` as the gate tool | network and remote tools |

## Mutating script bodies

For every indirect gate (`<pm> run <name>`, `make <target>`, `just <recipe>`, `deno task`,
a Gradle task), the planner reads the body it resolves to and sets `mutatingBody: true` when
the body runs anything from the refusal list, writes outside build-output directories
(`> file`, `tee`, `sed -i`, `cp`, `mv`, `rm`), or chains to another script that does. A
flagged gate is not run; the planner proposes the read-only form when the manifest has one
(`lint` instead of `lint:fix`) and otherwise leaves the area gateless with the reason. The
coordinator shows every flagged gate with its `source` in the Step 5 command set.

Gates that write only build output (`build`, `target/`, `dist/`, `.dart_tool/`) are allowed
in run-owned worktrees; the purity check still reports any tracked file they change.

## Timeouts and execution

- Each gate runs as `world.run(tool, [...args], { timeoutMs })` with `cwd` set by the
  argument form the tool supports (`-C`, `--manifest-path`, `--prefix`, `--cwd`) or by the
  `sh -c 'cd "$1" && shift && exec "$@"'` wrapper with the worktree as `$1`.
- Default `timeoutMs` 900000 (15 minutes) per gate; the brief may lower it per gate with a
  reason. A timeout is a red result with reason `timeout`, never a pass.
- Gates in one worktree run serially; gates in different lane worktrees run in parallel.
- Output is kept per line; findings inline only the failing lines (the last 1200 characters
  when no line pattern matches). Full logs go under `.zflow/evidence/gate-<area>-r<round>.log`.
- Environment: no secrets are passed to gates. A gate that needs a credential to run is
  reported gateless with that reason rather than given one.
