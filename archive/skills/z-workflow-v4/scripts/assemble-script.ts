import { createHash } from "node:crypto";
import { lstat, open, readFile, realpath } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";

const marker = "// z-workflow-v4 assembled-script v1 sha256:";
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function assemble() {
  const [bodyArg, outputArg, ...extra] = process.argv.slice(2);
  if (!bodyArg || !outputArg || extra.length) throw new Error("Usage: bun --no-env-file --config=/dev/null assemble-script.ts <task-body.ts> <workflow.dwf.ts>");
  const root = await realpath(resolve(import.meta.dir, ".."));
  const bodyPath = await realpath(resolve(bodyArg));
  const outputPath = join(await realpath(dirname(resolve(outputArg))), basename(outputArg));
  if (outputPath === bodyPath) throw new Error("Task body and assembled output must be different files");
  if (outputPath === root || outputPath.startsWith(root + sep)) throw new Error("Assembled output must be outside the skill directory to protect helper/tool inputs");

  let existing: Buffer | undefined;
  try {
    const outputStat = await lstat(outputPath);
    if (!outputStat.isFile() || outputStat.isSymbolicLink()) throw new Error("Existing output must be a regular generated file, not a symlink or directory");
    const bodyStat = await lstat(bodyPath);
    if (outputStat.dev === bodyStat.dev && outputStat.ino === bodyStat.ino) throw new Error("Task body and assembled output must be different files");
    existing = await readFile(outputPath);
    const newline = existing.indexOf(10);
    const header = existing.subarray(0, newline).toString("utf8");
    if (newline < 0 || header !== marker + digest(existing.subarray(newline + 1))) throw new Error("Refusing to overwrite output that is not an unchanged assembler-generated draft");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const [kit, policy, body] = await Promise.all([
    readFile(join(root, "persona-kit.dwf.ts")),
    readFile(join(root, "model-policy.dwf.ts")),
    readFile(bodyPath),
  ]);
  const payload = Buffer.concat([kit, Buffer.from("\n"), policy, Buffer.from("\n"), body]);
  const composed = Buffer.concat([Buffer.from(marker + digest(payload) + "\n"), payload]);
  const output = await open(outputPath, existing ? "r+" : "wx");
  try {
    if (existing && !(await output.readFile()).equals(existing)) throw new Error("Output changed during assembly; refusing to overwrite it");
    let written = 0;
    while (written < composed.length) {
      const part = await output.write(composed, written, composed.length - written, written);
      if (part.bytesWritten === 0) throw new Error("Could not finish writing the assembled draft");
      written += part.bytesWritten;
    }
    await output.truncate(composed.length);
  } finally {
    await output.close();
  }
  const checked = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(root, "scripts/check-script.ts"), outputPath],
    stdin: "ignore", stdout: "inherit", stderr: "inherit",
  });
  process.exitCode = checked.exitCode ?? 1;
}

try {
  await assemble();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
