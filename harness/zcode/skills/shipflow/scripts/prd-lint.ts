import { statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  buildIndex,
  isStage,
  lintPrd,
  parsePrd,
  readProject,
  renderIndex,
  sortIssues,
  type LintResult,
  type Stage,
} from "./lib/prd.ts";

const USAGE =
  "usage: bun prd-lint.ts --repo <root> --stage s2|s3|s5 [--coverage-target 0.95] [--decomposed M0,M1 | --features LB-1,LB-2] [--emit-index] [--json]\n";
const VALUE_FLAGS = new Set(["--repo", "--stage", "--coverage-target", "--decomposed", "--features"]);
const BOOLEAN_FLAGS = new Set(["--emit-index", "--json"]);

export interface LintCliOptions {
  repo: string;
  stage: Stage;
  coverageTarget: number;
  decomposed: string[] | null;
  features?: string[];
  emitIndex: boolean;
  json: boolean;
}

export type ParsedArgs =
  | { kind: "run"; options: LintCliOptions }
  | { kind: "help" }
  | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (!arg.startsWith("--")) return { kind: "usage", message: `unexpected argument ${arg}` };
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (VALUE_FLAGS.has(name)) {
      const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || (eq < 0 && value.startsWith("--"))) {
        return { kind: "usage", message: `${name} needs a value` };
      }
      values.set(name, value);
    } else if (BOOLEAN_FLAGS.has(name) && eq < 0) {
      flags.add(name);
    } else {
      return { kind: "usage", message: `unknown flag ${name}` };
    }
  }

  const repo = values.get("--repo");
  if (!repo) return { kind: "usage", message: "--repo is required" };
  const stage = values.get("--stage");
  if (stage === undefined) return { kind: "usage", message: "--stage is required" };
  if (!isStage(stage)) return { kind: "usage", message: `--stage must be s2, s3 or s5, found ${stage}` };

  const targetText = values.get("--coverage-target") ?? "0.95";
  const coverageTarget = targetText.trim() === "" ? Number.NaN : Number(targetText);
  if (!Number.isFinite(coverageTarget) || coverageTarget < 0 || coverageTarget > 1) {
    return { kind: "usage", message: "--coverage-target must be a number from 0 to 1" };
  }

  const decomposedText = values.get("--decomposed");
  const decomposed = decomposedText === undefined ? null : decomposedText.split(",").map((m) => m.trim());
  if (decomposed !== null && decomposed.some((m) => !/^M\d+$/.test(m))) {
    return { kind: "usage", message: "--decomposed takes milestone names such as M0,M1" };
  }
  const featuresText = values.get("--features");
  const features = featuresText?.split(",").map((id) => id.trim());
  if (features !== undefined && (stage !== "s5" || features.some((id) => !/^[A-Z]{2,4}-[0-9]+$/.test(id)))) {
    return { kind: "usage", message: "--features takes feature ids such as LB-1,LB-2 at stage s5" };
  }
  if (features !== undefined && decomposed !== null) {
    return { kind: "usage", message: "choose --features or --decomposed" };
  }

  return {
    kind: "run",
    options: {
      repo: resolve(repo),
      stage,
      coverageTarget,
      decomposed,
      features,
      emitIndex: flags.has("--emit-index"),
      json: flags.has("--json"),
    },
  };
}

export function runLint(options: LintCliOptions): { output: string; exitCode: number; result: LintResult } {
  const model = parsePrd(readProject(options.repo));
  const result = lintPrd(model, {
    stage: options.stage,
    coverageTarget: options.coverageTarget,
    decomposed: options.decomposed,
    features: options.features,
  });

  let indexWritten = false;
  if (options.emitIndex) {
    if (result.errors.length === 0) {
      writeFileSync(join(options.repo, "prd", "index.json"), renderIndex(buildIndex(model)));
      indexWritten = true;
    } else {
      process.stderr.write(`prd-lint: index not written, ${result.errors.length} errors\n`);
    }
  }

  const { errors, warnings, coverage } = result;
  const summary = `prd-lint ${options.stage}: ${errors.length} errors, ${warnings.length} warnings, coverage ${coverage.covered}/${coverage.total}`;
  const output = options.json
    ? `${JSON.stringify(
        {
          stage: options.stage,
          summary,
          errors,
          warnings,
          coverage: {
            covered: coverage.covered,
            total: coverage.total,
            ratio: coverage.ratio,
            misses: coverage.misses,
          },
          indexWritten,
        },
        null,
        2,
      )}\n`
    : [
        summary,
        ...sortIssues([...errors, ...warnings]).map(
          (issue) => `${issue.level === "error" ? "ERROR" : "WARN"} ${issue.id} ${issue.rule} ${issue.reason}`,
        ),
      ].join("\n") + "\n";

  return { output, exitCode: errors.length > 0 ? 1 : 0, result };
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`prd-lint: ${parsed.message}\n${USAGE}`);
    return 2;
  }
  const repoStat = statSync(parsed.options.repo, { throwIfNoEntry: false });
  if (!repoStat?.isDirectory()) {
    process.stderr.write(`prd-lint: repo is not a directory: ${parsed.options.repo}\n`);
    return 2;
  }
  const run = runLint(parsed.options);
  process.stdout.write(run.output);
  return run.exitCode;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
