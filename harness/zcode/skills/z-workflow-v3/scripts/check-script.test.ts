import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const prefix = readFileSync(join(root, "persona-kit.dwf.ts"), "utf8") + "\n" + readFileSync(join(root, "model-policy.dwf.ts"), "utf8");
function check(body: string, helpers = prefix) {
  const dir = mkdtempSync(join(tmpdir(), "v3-check-test-"));
  try {
    const draft = join(dir, "draft.ts");
    writeFileSync(draft, helpers + "\n" + body);
    const result = Bun.spawnSync({cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(root, "scripts/check-script.ts"), draft], env: {...process.env, HTTP_PROXY: "http://127.0.0.1:1", HTTPS_PROXY: "http://127.0.0.1:1"}, stdout: "pipe", stderr: "pipe"});
    return {exit: result.exitCode, output: result.stdout.toString() + result.stderr.toString()};
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
}
test("actual concrete typed draft checks with unusable network proxy", () => {
  const result = check('interface Result { ok: boolean; notes: string[]; }\nphase("Check"); const a = agent("review", {model: model("account:zai-individual-coding-plan/GLM-5.3$high")}); return await a.ask<Result>("Read only");');
  expect(result.exit).toBe(0);
  expect(result.output).toContain("Strict facade check passed");
});
test("rejects the generic ask pattern that caused the original launch failure", () => {
  const result = check('phase("Check"); const a = agent("review"); async function guarded<T>() { return await a.ask<T>("Read only"); } return await guarded<{ok: boolean}>();');
  expect(result.exit).not.toBe(0);
  expect(result.output).toContain("unresolved generic type parameter");
});
test("rejects a variable executable before platform submission", () => {
  const result = check('phase("Check"); const command = "bun"; return await world.run(command, ["test"]);');
  expect(result.exit).not.toBe(0);
  expect(result.output).toContain("world.run executable must be a compile-time string literal");
});
test("rejects TypeScript errors in an authored draft", () => {
  const result = check('phase("Check"); const n: number = "wrong"; await world.run("git", ["status"]); return n;');
  expect(result.exit).not.toBe(0);
  expect(result.output).toContain("not assignable");
});
test("rejects changed policy helpers", () => {
  const result = check('phase("Check"); return await world.run("git", ["status"]);', prefix.replace('const v3Escalations: MaxEvidence[] = [];', 'const v3Escalations: MaxEvidence[] = []; // changed'));
  expect(result.exit).not.toBe(0);
  expect(result.output).toContain("unchanged local v3 model-policy helper");
});
