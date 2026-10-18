// Loads the GitHub kit block (the text between the v1 markers of github-kit.dwf.ts) and evaluates
// it through a world shim. Workflow scripts paste the same block unchanged; the Bun CLIs run it
// through this loader, so the kit has one implementation for both.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface World {
  run(
    cmd: string,
    args?: string[],
    opts?: { timeoutMs?: number },
  ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

// Loose on purpose: the kit block is the typed source. Callers narrow the members they use.
export interface KitModule {
  makeGithubKit: (cfg: Record<string, unknown>) => any;
  [name: string]: any;
}

const START_MARKER = "// github-kit:start v1";
const END_MARKER = "// github-kit:end v1";
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set(["gh", "date", "sleep", "bun"]);
// lib/ sits one level below scripts/, which sits one level below the shipflow directory.
const KIT_FILE = join(import.meta.dir, "..", "..", "github-kit.dwf.ts");

// Spawns real processes, and only the allowed commands. A timeout kills the child and rejects with
// a timeout error, the same way a spawn failure rejects; the caller decides what a rejection means.
export const realWorld: World = {
  async run(cmd, args = [], opts = {}) {
    if (!ALLOWED_COMMANDS.has(cmd)) {
      throw new Error(`world.run refuses command "${cmd}" (allowed: gh, date, sleep, bun)`);
    }
    return runProcess(cmd, args, opts.timeoutMs);
  },
};

async function runProcess(
  cmd: string,
  args: string[],
  timeoutMs: number | undefined,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([cmd, ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const output = Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (timeoutMs === undefined) {
    const [stdout, stderr, exitCode] = await output;
    return { exitCode, stdout, stderr };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`${cmd} timed out after ${timeoutMs} ms`));
    }, timeoutMs);
  });
  try {
    const [stdout, stderr, exitCode] = await Promise.race([output, timeout]);
    return { exitCode, stdout, stderr };
  } finally {
    clearTimeout(timer);
  }
}

// The canonical block text, start marker through end marker inclusive. Markers match whole lines,
// so a comment that mentions a marker mid-line cannot split the block.
export function kitSource(): string {
  const lines = readFileSync(KIT_FILE, "utf8").split(/\r?\n/);
  const starts = markerLines(lines, START_MARKER);
  const ends = markerLines(lines, END_MARKER);
  if (starts.length !== 1 || ends.length !== 1 || ends[0] <= starts[0]) {
    throw new Error(`github-kit: ${KIT_FILE} must hold each v1 marker exactly once, start before end`);
  }
  return lines.slice(starts[0], ends[0] + 1).join("\n");
}

function markerLines(lines: string[], marker: string): number[] {
  return lines.flatMap((line, index) => (line.trimEnd() === marker ? [index] : []));
}

// Every top-level kit*, Kit*, KIT_* declaration plus makeGithubKit. The KIT_WRITE_TS program is a
// string literal, so its body is blanked before the scan.
function kitExportNames(block: string): string[] {
  const code = block.replace(/String\.raw`[^`]*`/g, "String.raw``");
  const names = new Set<string>();
  for (const match of code.matchAll(/^(?:async function|function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = match[1];
    if (/^(kit|Kit|KIT_)/.test(name) || name === "makeGithubKit") names.add(name);
  }
  return [...names];
}

// Evaluates the kit block against the given world (default: realWorld). Each call returns a fresh
// instance; the kit keeps no module-level state, so two loads never share anything.
export function loadKit(world: World = realWorld): KitModule {
  const block = kitSource();
  const compiled = new Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync(block);
  const names = kitExportNames(block);
  const body = `"use strict";\n${compiled}\nreturn { ${names.join(", ")} };`;
  return new Function("world", body)(world) as KitModule;
}
