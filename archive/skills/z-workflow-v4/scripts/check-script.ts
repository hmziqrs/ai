import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: bun check-script.ts <workflow.dwf.ts>");
const root = resolve(import.meta.dir, "..");
const compilerPath = join(root, "node_modules/typescript/lib/typescript.js");
let ts: any;
try {
  ts = (await import(compilerPath)).default;
} catch {
  throw new Error("V4 checker dependency missing. Run bun install --frozen-lockfile in " + root + " once before workflow use; this checker does not fetch packages.");
}
if (ts.version !== "5.9.3") throw new Error("V4 checker requires installed TypeScript 5.9.3, found " + ts.version);
const temporary = await mkdtemp(join(tmpdir(), "z-workflow-v4-check-"));
try {
  const source = await readFile(sourcePath, "utf8");
  const kit = (await readFile(join(root, "persona-kit.dwf.ts"), "utf8")).trim();
  const policy = (await readFile(join(root, "model-policy.dwf.ts"), "utf8")).trim();
  if (!source.includes(kit)) throw new Error("Script must embed the unchanged local persona-kit block");
  if (!source.includes(policy)) throw new Error("Script must embed the unchanged local v4 model-policy helper");
  const facade = await readFile(join(root, "references/platform-facade.d.ts"), "utf8");
  await writeFile(join(temporary, "workflow.ts"), facade + "\nasync function workflow() {\n" + source + "\n}\n");
  await writeFile(join(temporary, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: "ES2022", lib: ["ES2022"], types: [], skipLibCheck: false },
    files: ["workflow.ts"],
  }));
  const configPath = join(temporary, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, temporary);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();
  const workflow = program.getSourceFile(join(temporary, "workflow.ts"));
  const issues: string[] = [];
  const literal = (node: any) => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
  const issue = (node: any, message: string) => {
    const location = workflow.getLineAndCharacterOfPosition(node.getStart(workflow));
    issues.push("L" + String(location.line + 1) + ": " + message);
  };
  const inspect = (node: any) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isPropertyAccessExpression(callee) && callee.expression.getText(workflow) === "world" && callee.name.text === "run" && !literal(node.arguments[0])) {
        issue(node, "world.run executable must be a compile-time string literal; place runtime values in args");
      }
      if (ts.isPropertyAccessExpression(callee) && callee.expression.getText(workflow) === "world" && callee.name.text === "run" && node.arguments.length > 2 && !ts.isObjectLiteralExpression(node.arguments[2])) {
        issue(node, "world.run options must be an object literal when present; omit the third argument otherwise (never null or undefined)");
      }
      if (ts.isIdentifier(callee) && ["model", "phase"].includes(callee.text) && !literal(node.arguments[0])) {
        issue(node, callee.text + " requires a compile-time string literal");
      }
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === "ask") {
        const inspectType = (part: any) => {
          if (ts.isTypeReferenceNode(part) && (checker.getTypeFromTypeNode(part).flags & ts.TypeFlags.TypeParameter)) {
            issue(part, "ask result contains an unresolved generic type parameter; use a concrete JSON interface at the ask site");
          }
          ts.forEachChild(part, inspectType);
        };
        for (const type of node.typeArguments ?? []) inspectType(type);
      }
    }
    ts.forEachChild(node, inspect);
  };
  inspect(workflow);
  if (issues.length > 0) throw new Error(issues.join("\n"));
  const result = Bun.spawnSync({ cmd: [process.execPath, "--no-env-file", "--config=/dev/null", join(root, "node_modules/typescript/lib/tsc.js"), "--project", configPath], stdout: "pipe", stderr: "pipe", stdin: "ignore" });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.exitCode === 0) console.log("Strict facade check passed. CreateWorkflow still performs platform analysis and command approval.");
  process.exitCode = result.exitCode;
} finally {
  await rm(temporary, { recursive: true, force: true });
}
