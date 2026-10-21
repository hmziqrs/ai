import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// Run the same maintained, platform-independent validator used by the workflow.
// Only this trusted skill source is transpiled; project/task data is passed as values.
export async function validatePlan(plan: unknown, input: unknown) {
  const source = await readFile(resolve(import.meta.dir, "../schema.dwf.ts"), "utf8");
  const js = new Bun.Transpiler({loader:"ts"}).transformSync(source);
  const validate = new Function(js + "\nreturn v9ValidatePlan;")();
  validate(plan, input);
}
