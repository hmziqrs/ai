import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: bun check-script.ts <workflow.dwf.ts>");
const root = resolve(import.meta.dir, "..");
const temporary = await mkdtemp(join(tmpdir(), "z-workflow-v2-check-"));
try {
  const source = await readFile(sourcePath, "utf8");
  const kit = (await readFile(join(root, "persona-kit.dwf.ts"), "utf8")).trim();
  const policy = (await readFile(join(root, "model-policy.dwf.ts"), "utf8")).trim();
  if (!source.includes(kit)) throw new Error("Script must embed the unchanged local persona-kit block");
  if (!source.includes(policy)) throw new Error("Script must embed the unchanged local v2 model-policy helper");
  const facade = await readFile(join(root, "references/platform-facade.d.ts"), "utf8");
  await writeFile(join(temporary, "workflow.ts"), facade + "\nasync function workflow() {\n" + source + "\n}\n");
  await writeFile(join(temporary, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: "ES2022", lib: ["ES2022"], types: [], skipLibCheck: false },
    files: ["workflow.ts"],
  }));
  const result = Bun.spawnSync({ cmd: ["bunx", "--package", "typescript@5.9.3", "tsc", "--project", join(temporary, "tsconfig.json")], stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.exitCode === 0) console.log("Strict facade check passed. CreateWorkflow still performs platform analysis and command approval.");
  process.exitCode = result.exitCode;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
