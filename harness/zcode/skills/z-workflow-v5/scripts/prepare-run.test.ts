import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const sourceRoot = resolve(import.meta.dir, "..");
const marker = "// z-workflow-v5 prepared-run v1 sha256:";
const engine = `interface RunInput {
  repoRoot: string; task: string; baseCommit: string; branchRef: string;
  startedAt: string; skillRoot: string; instructionPaths: string[];
}
throw new Error("ENGINE_EXECUTED");
return INPUT;
`;

type Fixture = { dir: string; root: string; repo: string; request: string; output: string; count: string; head: string; branch: string };

function git(repo: string, ...args: string[]) {
  const result = Bun.spawnSync({ cmd: ["git", "-C", repo, ...args], stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function fixture(run: (f: Fixture) => void, realChecker = false) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "v5 launcher with spaces ")));
  const root = join(dir, "skill with spaces");
  const repo = join(dir, "project with spaces");
  const request = join(dir, "request input.json");
  const output = join(dir, "run output.dwf.ts");
  const count = join(root, "checker-count.txt");
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(repo);
  copyFileSync(join(sourceRoot, "scripts/prepare-run.ts"), join(root, "scripts/prepare-run.ts"));
  for (const name of ["persona-kit.dwf.ts", "model-policy.dwf.ts"]) copyFileSync(join(sourceRoot, name), join(root, name));
  writeFileSync(join(root, "engine.dwf.ts"), engine);
  if (realChecker) {
    mkdirSync(join(root, "references"));
    copyFileSync(join(sourceRoot, "scripts/check-script.ts"), join(root, "scripts/check-script.ts"));
    copyFileSync(join(sourceRoot, "references/platform-facade.d.ts"), join(root, "references/platform-facade.d.ts"));
    symlinkSync(join(sourceRoot, "node_modules"), join(root, "node_modules"));
  } else {
    writeFileSync(join(root, "scripts/check-script.ts"), `import { appendFileSync, readFileSync } from "node:fs";
appendFileSync(${JSON.stringify(count)}, "checked\\n");
if (!readFileSync(process.argv[2], "utf8").includes("const INPUT: RunInput = ")) throw new Error("Missing input binding");
console.error("fixture checker diagnostic");
process.exit(Number(process.env.V5_TEST_CHECK_EXIT ?? "0"));
`);
  }
  git(repo, "init", "-q");
  writeFileSync(join(repo, "README.md"), "Clean baseline\n");
  writeFileSync(join(repo, ".gitignore"), ".zcode/workflow-drafts/\n");
  git(repo, "add", ".");
  git(repo, "-c", "user.name=V5 launcher test", "-c", "user.email=v5-test@example.invalid", "commit", "-qm", "baseline");
  const head = git(repo, "rev-parse", "HEAD");
  const branch = git(repo, "symbolic-ref", "HEAD");
  writeFileSync(request, JSON.stringify({ repoRoot: repo, task: "Implement the requested feature." }));
  try { run({ dir, root, repo, request, output, count, head, branch }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

function prepare(f: Fixture, options: { input?: string; output?: string; exit?: number; env?: Record<string, string> } = {}) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(f.root, "scripts/prepare-run.ts"), options.input ?? f.request, options.output ?? f.output],
    cwd: f.dir,
    env: { ...process.env, V5_TEST_CHECK_EXIT: String(options.exit ?? 0), HTTP_PROXY: "http://127.0.0.1:1", HTTPS_PROXY: "http://127.0.0.1:1", ...options.env },
    stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  return { exit: result.exitCode, text: result.stdout.toString() + result.stderr.toString() };
}

function readInput(path: string) {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf("\nconst INPUT: RunInput = ") + "\nconst INPUT: RunInput = ".length;
  const end = source.indexOf(";\n", start);
  return JSON.parse(source.slice(start, end));
}

test("fills only literal JSON, captures anchors, preserves exact engine/helper bytes and checks once", () => fixture((f) => {
  const sentinel = join(f.dir, "task-data-must-not-run");
  const task = `Implement quotes ", backticks \` and \\ paths. $(touch '${sentinel}');\n"; await world.run("touch", [${JSON.stringify(sentinel)}]); //`;
  const instructions = join(f.dir, "instructions with spaces.md");
  writeFileSync(instructions, "Project instructions\n");
  const supplied = "2026-10-20T14:20:00+05:00";
  writeFileSync(f.request, JSON.stringify({ repoRoot: f.repo, task, startedAt: supplied, instructionPaths: [instructions] }));
  writeFileSync(join(f.dir, "bunfig.toml"), "invalid configuration that must not be loaded");
  writeFileSync(join(f.dir, ".env"), "BUN_OPTIONS=--not-a-valid-option\n");
  const result = prepare(f);
  expect(result.exit).toBe(0);
  expect(result.text).toContain("supplied user-request timestamp");
  const input = readInput(f.output);
  expect(input).toEqual({ repoRoot: f.repo, task, baseCommit: f.head, branchRef: f.branch, startedAt: "2026-10-20T09:20:00.000Z", skillRoot: f.root, instructionPaths: [instructions] });
  const payload = Buffer.concat([
    readFileSync(join(f.root, "persona-kit.dwf.ts")), Buffer.from("\n"),
    readFileSync(join(f.root, "model-policy.dwf.ts")), Buffer.from("\nconst INPUT: RunInput = " + JSON.stringify(input) + ";\n"),
    Buffer.from(engine),
  ]);
  const expected = Buffer.concat([Buffer.from(marker + createHash("sha256").update(payload).digest("hex") + "\n"), payload]);
  expect(readFileSync(f.output).equals(expected)).toBe(true);
  expect(readFileSync(f.count, "utf8")).toBe("checked\n");
  expect(existsSync(sentinel)).toBe(false);
  expect(git(f.repo, "rev-parse", "HEAD")).toBe(f.head);
  expect(git(f.repo, "status", "--porcelain=v1", "--untracked-files=all")).toBe("");
}));

test("labels a missing timestamp as launcher start and defaults instruction paths to an empty array", () => fixture((f) => {
  const before = Date.now();
  const result = prepare(f);
  const after = Date.now();
  expect(result.exit).toBe(0);
  expect(result.text).toContain("launcher start; original user-request timestamp was not supplied");
  const input = readInput(f.output);
  expect(input.instructionPaths).toEqual([]);
  expect(Date.parse(input.startedAt)).toBeGreaterThanOrEqual(before);
  expect(Date.parse(input.startedAt)).toBeLessThanOrEqual(after);
}));

test("rejects the channel/future restoration before it reaches ZCode's workflow analyzer", () => fixture((f) => {
  writeFileSync(join(f.root, "engine.dwf.ts"), engine.replace('throw new Error("ENGINE_EXECUTED");', `
const queue = channel<string>("feedback");
const consumer = future(async () => {
  for await (const item of queue) queue.send(item);
});
`));
  const result = prepare(f);
  expect(result.exit).toBe(1);
  expect(result.text).toContain("V5 requires the flat per-area scheduler");
  expect(git(f.repo, "status", "--porcelain=v1", "--untracked-files=all")).toBe("");
}, true));

test("accepts an ignored machine-owned draft directory without changing product files or Git", () => fixture((f) => {
  const drafts = join(f.repo, ".zcode/workflow-drafts");
  mkdirSync(drafts, { recursive: true });
  const request = join(drafts, "request.json");
  const output = join(drafts, "run.dwf.ts");
  writeFileSync(request, readFileSync(f.request));
  expect(prepare(f, { input: request, output }).exit).toBe(0);
  expect(readInput(output).baseCommit).toBe(f.head);
  expect(git(f.repo, "status", "--porcelain=v1", "--untracked-files=all")).toBe("");
  expect(readFileSync(join(f.repo, "README.md"), "utf8")).toBe("Clean baseline\n");
}));

test("does not let inherited Git environment redirect validation to a different repository or index", () => fixture((f) => {
  const result = prepare(f, { env: { GIT_DIR: join(f.dir, "wrong-repo.git"), GIT_WORK_TREE: f.dir, GIT_INDEX_FILE: join(f.dir, "foreign-index") } });
  expect(result.exit).toBe(0);
  expect(readInput(f.output).baseCommit).toBe(f.head);
  expect(existsSync(join(f.dir, "foreign-index"))).toBe(false);
}));

test("rejects an unignored in-project draft path rather than adding ignores or creating a product artifact", () => fixture((f) => {
  writeFileSync(join(f.repo, ".gitignore"), "");
  git(f.repo, "add", ".gitignore");
  git(f.repo, "-c", "user.name=V5 launcher test", "-c", "user.email=v5-test@example.invalid", "commit", "-qm", "remove draft ignore");
  const drafts = join(f.repo, ".zcode/workflow-drafts");
  mkdirSync(drafts, { recursive: true });
  const output = join(drafts, "run.dwf.ts");
  expect(prepare(f, { output }).exit).toBe(1);
  expect(existsSync(output)).toBe(false);
  expect(existsSync(f.count)).toBe(false);
  expect(readFileSync(join(f.repo, ".gitignore"), "utf8")).toBe("");
}));

test("rejects dirty tracked/untracked work, detached HEAD and non-root directories before checking", () => fixture((f) => {
  writeFileSync(join(f.repo, "README.md"), "Uncommitted changes\n");
  expect(prepare(f).text).toContain("must be clean");
  git(f.repo, "checkout", "--", "README.md");
  mkdirSync(join(f.repo, "nested"));
  writeFileSync(join(f.repo, "nested", "untracked.txt"), "Untracked\n");
  expect(prepare(f).text).toContain("must be clean");
  rmSync(join(f.repo, "nested"), { recursive: true });
  git(f.repo, "checkout", "--detach", "-q", f.head);
  expect(prepare(f).text).toContain("detached HEAD");
  git(f.repo, "checkout", "-q", f.branch.slice("refs/heads/".length));
  const nested = join(f.repo, "nested");
  mkdirSync(nested);
  writeFileSync(f.request, JSON.stringify({ repoRoot: nested, task: "Implement" }));
  expect(prepare(f).text).toContain("top-level Git worktree");
  expect(existsSync(f.count)).toBe(false);
  expect(existsSync(f.output)).toBe(false);
}));

test("rejects invalid JSON, bad request fields and missing paths without overwriting an existing file", () => fixture((f) => {
  const original = "unrelated original output\n";
  writeFileSync(f.output, original);
  const cases = [
    "{broken json", "null", "[]",
    JSON.stringify({ repoRoot: f.repo, task: " " }),
    JSON.stringify({ repoRoot: "relative", task: "Implement" }),
    JSON.stringify({ repoRoot: join(f.dir, "missing"), task: "Implement" }),
    JSON.stringify({ repoRoot: f.repo, task: "Implement", instructionPaths: ["relative.md"] }),
    JSON.stringify({ repoRoot: f.repo, task: "Implement", instructionPaths: [join(f.dir, "missing.md")] }),
    JSON.stringify({ repoRoot: f.repo, task: "Implement", instructionPaths: null }),
    JSON.stringify({ repoRoot: f.repo, task: "Implement", startedAt: "not a date" }),
    JSON.stringify({ repoRoot: f.repo, task: "Implement", unexpected: true }),
  ];
  for (const input of cases) {
    writeFileSync(f.request, input);
    expect(prepare(f).exit).toBe(1);
    expect(readFileSync(f.output, "utf8")).toBe(original);
  }
  expect(existsSync(f.count)).toBe(false);
}));

test("updates only an unchanged owned draft and refuses unrelated or edited output", () => fixture((f) => {
  expect(prepare(f).exit).toBe(0);
  writeFileSync(f.request, JSON.stringify({ repoRoot: f.repo, task: "Updated task" }));
  expect(prepare(f).exit).toBe(0);
  expect(readInput(f.output).task).toBe("Updated task");
  for (const protectedText of ["Existing unrelated file\n", readFileSync(f.output, "utf8") + "// manual edit\n"]) {
    writeFileSync(f.output, protectedText);
    expect(prepare(f).text).toContain("Refusing to overwrite");
    expect(readFileSync(f.output, "utf8")).toBe(protectedText);
  }
  expect(readFileSync(f.count, "utf8")).toBe("checked\nchecked\n");
}));

test("protects request/instruction files, aliases, skill files and non-draft project destinations", () => fixture((f) => {
  const requestBytes = readFileSync(f.request);
  expect(prepare(f, { output: f.request }).text).toContain("different files");
  const linkedRequest = join(f.dir, "request hardlink.json");
  linkSync(f.request, linkedRequest);
  expect(prepare(f, { output: linkedRequest }).text).toContain("different files");
  const symlink = join(f.dir, "request symlink.json");
  symlinkSync(f.request, symlink);
  expect(prepare(f, { output: symlink }).exit).toBe(1);
  expect(readFileSync(f.request).equals(requestBytes)).toBe(true);
  for (const name of ["persona-kit.dwf.ts", "model-policy.dwf.ts", "engine.dwf.ts", "scripts/check-script.ts", "scripts/prepare-run.ts"]) {
    expect(prepare(f, { output: join(f.root, name) }).text).toContain("protect helper/tool inputs");
  }
  expect(prepare(f, { output: join(f.repo, "README.md") }).exit).toBe(1);
  const instructions = join(f.dir, "instructions.md");
  writeFileSync(instructions, "Protect instructions\n");
  writeFileSync(f.request, JSON.stringify({ repoRoot: f.repo, task: "Implement", instructionPaths: [instructions] }));
  expect(prepare(f, { output: instructions }).text).toContain("cannot overwrite an instruction");
  expect(readFileSync(instructions, "utf8")).toBe("Protect instructions\n");
  expect(existsSync(f.count)).toBe(false);
}));

test("refuses hardlinks even when the linked file has a valid generated draft marker", () => fixture((f) => {
  expect(prepare(f).exit).toBe(0);
  const hardlink = join(f.dir, "draft alias.dwf.ts");
  linkSync(f.output, hardlink);
  const original = readFileSync(f.output);
  expect(prepare(f, { output: hardlink }).text).toContain("hardlinked output");
  expect(readFileSync(f.output).equals(original)).toBe(true);
  expect(readFileSync(f.count, "utf8")).toBe("checked\n");
}));

test("propagates checker failure once and preserves the generated draft and inputs", () => fixture((f) => {
  const request = readFileSync(f.request);
  const result = prepare(f, { exit: 23 });
  expect(result.exit).toBe(23);
  expect(result.text).toContain("fixture checker diagnostic");
  expect(readFileSync(f.count, "utf8")).toBe("checked\n");
  expect(readInput(f.output).task).toBe("Implement the requested feature.");
  expect(readFileSync(f.request).equals(request)).toBe(true);
}));

test("compiles the literal binding and unchanged helpers through the installed local checker without executing the engine", () => fixture((f) => {
  const result = prepare(f);
  expect(result.exit).toBe(0);
  expect(result.text.split("Strict facade check passed").length - 1).toBe(1);
  expect(result.text).not.toContain("ENGINE_EXECUTED");
}, true));
