import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

const marker = "// z-workflow-v6 prepared-run v1 sha256:";
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const within = (path: string, root: string) => path === root || path.startsWith(root + sep);

async function prepare() {
  const launcherStartedAt = new Date().toISOString();
  const [requestArg, outputArg, ...extra] = process.argv.slice(2);
  if (!requestArg || !outputArg || extra.length) throw new Error("Usage: bun --no-env-file --config=/dev/null prepare-run.ts <request.json> <run.dwf.ts>");
  const skillRoot = await realpath(resolve(import.meta.dir, ".."));
  const requestPath = await realpath(resolve(requestArg));
  const requestStat = await lstat(requestPath);
  if (!requestStat.isFile()) throw new Error("Request must be a regular JSON file");
  const outputPath = join(await realpath(dirname(resolve(outputArg))), basename(outputArg));
  if (outputPath === requestPath) throw new Error("Request and prepared output must be different files");
  if (within(outputPath, skillRoot)) throw new Error("Prepared output must be outside the skill directory to protect helper/tool inputs");

  const request: unknown = JSON.parse(await readFile(requestPath, "utf8"));
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Request must be a JSON object");
  const fields = request as Record<string, unknown>;
  const allowed = new Set(["repoRoot", "task", "instructionPaths", "startedAt"]);
  if (Object.keys(fields).some((key) => !allowed.has(key))) throw new Error("Request has unsupported fields; supply repoRoot, task, instructionPaths and optional startedAt only");
  if (typeof fields.repoRoot !== "string" || !isAbsolute(fields.repoRoot)) throw new Error("repoRoot must be an absolute path");
  if (typeof fields.task !== "string" || !fields.task.trim()) throw new Error("task must be a nonblank string");
  const repoRoot = await realpath(fields.repoRoot);
  if (!(await lstat(repoRoot)).isDirectory()) throw new Error("repoRoot must be a directory");
  const paths = fields.instructionPaths === undefined ? [] : fields.instructionPaths;
  if (!Array.isArray(paths) || paths.some((path) => typeof path !== "string" || !isAbsolute(path))) throw new Error("instructionPaths must be an array of absolute paths");
  const instructionPaths: string[] = [];
  for (const path of paths) {
    const canonical = await realpath(path);
    if (!(await lstat(canonical)).isFile()) throw new Error("Instruction path must be a regular file: " + path);
    if (canonical === outputPath) throw new Error("Prepared output cannot overwrite an instruction file");
    instructionPaths.push(canonical);
  }
  if (fields.startedAt !== undefined && (typeof fields.startedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(fields.startedAt) || !Number.isFinite(Date.parse(fields.startedAt)))) throw new Error("startedAt must be a valid ISO timestamp");
  const startedAt = fields.startedAt === undefined ? launcherStartedAt : new Date(fields.startedAt as string).toISOString();

  const gitEnvironment = { ...process.env };
  for (const key of Object.keys(gitEnvironment)) if (key.startsWith("GIT_")) delete gitEnvironment[key];
  gitEnvironment.GIT_OPTIONAL_LOCKS = "0";
  const git = (...args: string[]) => {
    const result = Bun.spawnSync({
      cmd: ["git", "--no-optional-locks", "-c", "core.fsmonitor=false", "-C", repoRoot, ...args],
      env: gitEnvironment,
      stdin: "ignore", stdout: "pipe", stderr: "pipe",
    });
    if (result.exitCode !== 0) throw new Error("Git validation failed: " + result.stderr.toString().trim());
    return result.stdout.toString().trim();
  };
  if (git("rev-parse", "--is-inside-work-tree") !== "true" || await realpath(git("rev-parse", "--show-toplevel")) !== repoRoot) throw new Error("repoRoot must be the top-level Git worktree directory");
  let branchRef: string;
  try { branchRef = git("symbolic-ref", "--quiet", "HEAD"); }
  catch { throw new Error("A checked-out branch is required; detached HEAD is not supported"); }
  if (!branchRef.startsWith("refs/heads/")) throw new Error("A checked-out branch is required; detached HEAD is not supported");
  const baseCommit = git("rev-parse", "--verify", "HEAD");
  if (git("status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none")) throw new Error("Worktree must be clean, including all untracked files, before preparation");
  if (within(outputPath, repoRoot)) {
    const draftsRoot = await realpath(join(repoRoot, ".zcode/workflow-drafts"));
    if (!within(draftsRoot, repoRoot) || !within(outputPath, draftsRoot) || outputPath === draftsRoot) throw new Error("In-project output must be inside the ignored .zcode/workflow-drafts directory");
    git("check-ignore", "--quiet", "--", outputPath);
  }

  let existing: Buffer | undefined;
  let outputIdentity: { dev: number; ino: number } | undefined;
  try {
    const stat = await lstat(outputPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Existing output must be a regular generated file, not a symlink or directory");
    if (stat.dev === requestStat.dev && stat.ino === requestStat.ino) throw new Error("Request and prepared output must be different files");
    if (stat.nlink !== 1) throw new Error("Refusing to overwrite hardlinked output");
    existing = await readFile(outputPath);
    const newline = existing.indexOf(10);
    if (newline < 0 || existing.subarray(0, newline).toString("utf8") !== marker + digest(existing.subarray(newline + 1))) throw new Error("Refusing to overwrite output that is not an unchanged launcher-generated draft");
    outputIdentity = { dev: stat.dev, ino: stat.ino };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const [kit, policy, engine] = await Promise.all([
    readFile(join(skillRoot, "persona-kit.dwf.ts")),
    readFile(join(skillRoot, "model-policy.dwf.ts")),
    readFile(join(skillRoot, "engine.dwf.ts")),
  ]);
  const input = { repoRoot, task: fields.task, baseCommit, branchRef, startedAt, skillRoot, instructionPaths };
  const payload = Buffer.concat([kit, Buffer.from("\n"), policy, Buffer.from("\nconst INPUT: RunInput = " + JSON.stringify(input) + ";\n"), engine]);
  const composed = Buffer.concat([Buffer.from(marker + digest(payload) + "\n"), payload]);
  const flags = existing ? constants.O_RDWR | constants.O_NOFOLLOW : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;
  const output = await open(outputPath, flags, 0o600);
  try {
    if (existing) {
      const stat = await output.stat();
      if (stat.nlink !== 1 || stat.dev !== outputIdentity!.dev || stat.ino !== outputIdentity!.ino || !(await output.readFile()).equals(existing)) throw new Error("Output changed during preparation; refusing to overwrite it");
    }
    let written = 0;
    while (written < composed.length) {
      const part = await output.write(composed, written, composed.length - written, written);
      if (!part.bytesWritten) throw new Error("Could not finish writing the prepared draft");
      written += part.bytesWritten;
    }
    await output.truncate(composed.length);
  } finally {
    await output.close();
  }
  console.log(fields.startedAt === undefined
    ? "startedAt (launcher start; original user-request timestamp was not supplied): " + startedAt
    : "startedAt (supplied user-request timestamp): " + startedAt);
  const checked = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(skillRoot, "scripts/check-script.ts"), outputPath],
    cwd: skillRoot,
    stdin: "ignore", stdout: "inherit", stderr: "inherit",
  });
  process.exitCode = checked.exitCode ?? 1;
}

try {
  await prepare();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
