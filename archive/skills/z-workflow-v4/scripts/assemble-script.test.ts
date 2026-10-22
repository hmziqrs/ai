import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { linkSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const assembler = join(root, "scripts/assemble-script.ts");
const kit = readFileSync(join(root, "persona-kit.dwf.ts"));
const policy = readFileSync(join(root, "model-policy.dwf.ts"));
const marker = "// z-workflow-v4 assembled-script v1 sha256:";
const validBody = `interface LaneResult { complete: boolean; }
phase("Parallel implementation");
const backend = agent("Backend engineer", { model: model("account:zai-individual-coding-plan/GLM-5.3$high") });
const frontend = agent("Frontend engineer", { model: model("account:zai-individual-coding-plan/GLM-5.3$high") });
const backendWork = backend.ask<LaneResult>("Implement the assigned backend files");
const frontendWork = frontend.ask<LaneResult>("Implement the assigned frontend files");
return await Promise.all([backendWork, frontendWork]);
`;

function fixture(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "v4 assembly with spaces "));
  try { run(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function assemble(dir: string, body: string, output: string) {
  const result = Bun.spawnSync({
    cmd: [process.execPath, "--no-env-file", "--config=/dev/null", assembler, body, output],
    cwd: dir,
    env: { ...process.env, HTTP_PROXY: "http://127.0.0.1:1", HTTPS_PROXY: "http://127.0.0.1:1" },
    stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  return { exit: result.exitCode, text: result.stdout.toString() + result.stderr.toString() };
}

test("assembles exact helper/body bytes and checks once from a separate cwd with spaces", () => fixture((dir) => {
  const body = join(dir, "task body.ts");
  const output = join(dir, "new workflow.dwf.ts");
  writeFileSync(body, validBody);
  writeFileSync(join(dir, "bunfig.toml"), "this is invalid configuration");
  writeFileSync(join(dir, ".env"), "BUN_OPTIONS=--definitely-invalid-option\n");
  const result = assemble(dir, body, output);
  expect(result.exit).toBe(0);
  expect(result.text.split("Strict facade check passed").length - 1).toBe(1);
  const payload = Buffer.concat([kit, Buffer.from("\n"), policy, Buffer.from("\n" + validBody)]);
  const expected = Buffer.concat([Buffer.from(marker + createHash("sha256").update(payload).digest("hex") + "\n"), payload]);
  expect(readFileSync(output).equals(expected)).toBe(true);
  expect(readFileSync(body, "utf8")).toBe(validBody);
}));

test("propagates compiler failure and preserves the body, helpers and assembled draft", () => fixture((dir) => {
  const body = join(dir, "bad body.ts");
  const output = join(dir, "failed workflow.dwf.ts");
  const invalid = 'phase("Implementation"); const count: number = "bad"; return count;\n';
  writeFileSync(body, invalid);
  const result = assemble(dir, body, output);
  expect(result.exit).toBe(2);
  expect(result.text).toContain("not assignable");
  expect(readFileSync(body, "utf8")).toBe(invalid);
  expect(readFileSync(output, "utf8")).toEndWith(invalid);
  expect(readFileSync(join(root, "persona-kit.dwf.ts")).equals(kit)).toBe(true);
  expect(readFileSync(join(root, "model-policy.dwf.ts")).equals(policy)).toBe(true);
}));

test("replaces its own unchanged draft and refuses unrelated or modified existing output", () => fixture((dir) => {
  const body = join(dir, "body.ts");
  const output = join(dir, "workflow.ts");
  writeFileSync(body, validBody);
  expect(assemble(dir, body, output).exit).toBe(0);
  const replacement = 'phase("Revised implementation"); return await world.run("git", ["status", "--short"]);\n';
  writeFileSync(body, replacement);
  expect(assemble(dir, body, output).exit).toBe(0);
  expect(readFileSync(output, "utf8")).toEndWith(replacement);
  for (const protectedText of ["existing unrelated file\n", readFileSync(output, "utf8") + "// manual change\n"]) {
    writeFileSync(output, protectedText);
    expect(assemble(dir, body, output).text).toContain("Refusing to overwrite");
    expect(readFileSync(output, "utf8")).toBe(protectedText);
  }
}));

test("rejects the body itself, its hardlink/symlink aliases and helper/tool destinations", () => fixture((dir) => {
  const body = join(dir, "body.ts");
  writeFileSync(body, validBody);
  expect(assemble(dir, body, body).text).toContain("different files");
  const hardlink = join(dir, "body hardlink.ts");
  linkSync(body, hardlink);
  expect(assemble(dir, body, hardlink).text).toContain("different files");
  const symlink = join(dir, "body symlink.ts");
  symlinkSync(body, symlink);
  expect(assemble(dir, body, symlink).exit).toBe(1);
  for (const input of ["persona-kit.dwf.ts", "model-policy.dwf.ts", "scripts/check-script.ts", "scripts/assemble-script.ts"]) {
    expect(assemble(dir, body, join(root, input)).text).toContain("protect helper/tool inputs");
  }
  expect(readFileSync(body, "utf8")).toBe(validBody);
}));
