import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const workflow = await readFile(resolve(import.meta.dirname, "../workflows/shipflow-queue.dwf.ts"), "utf8");
const compiled = new Bun.Transpiler({ loader: "ts", target: "bun" }).transformSync("async function runQueue() {\n" + workflow + "\n}");
const modelId = "account:zai-individual-coding-plan/GLM-5.3";
const agentFiles = [
  "shipflow-gh-ops.md",
  "shipflow-issue-triage.md",
  "shipflow-task-planner.md",
  "shipflow-plan-auditor.md",
  "shipflow-browser-tester.md",
  "shipflow-vision-judge.md",
  "shipflow-security-audit.md",
  "shipflow-injection-auditor.md",
  "z-astro-engineer.md",
];
const defaultArea = {
  name: "astro-rendering",
  paths: ["src/page.astro"],
  excludedPaths: [],
  skills: ["/skills/astro/SKILL.md"],
  gates: [{ tool: "npm", args: ["test"] }],
  complexity: "straightforward",
  hasUI: false,
  dependsOn: [],
  specialist: "z-astro-engineer",
};
const personaText = (name) => "---\nname: " + name + "\nmodel: " + modelId + "\n---\nRole instructions for " + name + ".";

async function runScenario(options = {}) {
  const calls = [];
  const asks = [];
  const hostedEffects = [];
  const gateCalls = [];
  let prViewCount = 0;
  let snapshotVersion = 0;
  let localHead = "base-sha";
  const gitResult = (args) => {
    if (args[0] === "-C") args = args.slice(2);
    const command = args[0];
    if (command === "rev-parse" && args[1] === "--show-toplevel") return { exitCode: 0, stdout: "/fixture\n", stderr: "" };
    if (command === "rev-parse" && args[1] === "--verify") return { exitCode: 1, stdout: "", stderr: "missing branch" };
    if (command === "rev-parse") return { exitCode: 0, stdout: localHead + "\n", stderr: "" };
    if (command === "status") return { exitCode: 0, stdout: options.readOnlyGuardFails && snapshotVersion > 0 ? " M src/page.astro\0" : "", stderr: "" };
    if (command === "checkout" || command === "add") return { exitCode: 0, stdout: "", stderr: "" };
    if (command === "ls-files" && args.includes("--others")) return { exitCode: 0, stdout: "src/page.astro\n", stderr: "" };
    if (command === "ls-files") return { exitCode: 0, stdout: "", stderr: "" };
    if (command === "diff" && args.includes("--cached")) return { exitCode: 0, stdout: "", stderr: "" };
    if (command === "diff") return { exitCode: 0, stdout: "1\t0\tsrc/page.astro\n", stderr: "" };
    if (command === "commit") {
      localHead = options.localHeadMismatch ? "local-head" : "head-a";
      return { exitCode: 0, stdout: "[shipflow/issue-42 abcdef123456789] feat: improve Astro rendering\n", stderr: "" };
    }
    throw new Error("unexpected git args: " + args.join(" "));
  };
  const world = {
    async run(command, argv, config) {
      calls.push({ command, argv: [...argv], config });
      if (command === "git") return gitResult(argv);
      if (command === "ls") {
        const listing = options.missingBase ? agentFiles.filter((f) => f !== "shipflow-gh-ops.md") : agentFiles;
        return { exitCode: 0, stdout: listing.join("\n") + "\n", stderr: "" };
      }
      if (command === "cat") {
        const path = argv.at(-1);
        if (options.missingBase && path.endsWith("/shipflow-gh-ops.md")) return { exitCode: 1, stdout: "", stderr: "persona missing" };
        const name = path.split("/").at(-1).replace(/\.md$/, "");
        return { exitCode: 0, stdout: personaText(name), stderr: "" };
      }
      if (command === "shasum") {
        const path = argv.at(-1);
        const hash = createHash("sha256").update(personaText(path.split("/").at(-1).replace(/\.md$/, ""))).digest("hex");
        return { exitCode: 0, stdout: hash + "  " + path + "\n", stderr: "" };
      }
      if (command === "bun") {
        const digest = createHash("sha256").update(String(snapshotVersion)).digest("hex");
        return { exitCode: 0, stdout: digest + "\n", stderr: "" };
      }
      if (command === "sh") {
        assert.equal(argv[0], "-c");
        assert.equal(argv[1], 'cd "$1" && shift && exec "$@"');
        assert.equal(argv[2], "shipflow");
        assert.equal(argv[3], "/fixture");
        gateCalls.push({ cwd: argv[3], tool: argv[4], args: argv.slice(5), timeoutMs: config?.timeoutMs });
        if (argv[4] !== "npm") throw new Error("unexpected gate tool: " + argv[4]);
        return { exitCode: 0, stdout: "tests passed", stderr: "" };
      }
      if (command === "gh" && argv[0] === "pr" && argv[1] === "create") {
        hostedEffects.push({ operation: "pr-create", argv: [...argv] });
        return { exitCode: 0, stdout: "https://github.com/example/project/pull/9\n", stderr: "" };
      }
      if (command === "gh" && argv[0] === "pr" && argv[1] === "view") {
        const query = argv[argv.indexOf("--json") + 1] ?? "";
        if (query === "headRefOid,isDraft,reviewDecision") {
          prViewCount += 1;
          const headRefOid = options.remoteHeadChanged && prViewCount > 1 ? "head-b" : "head-a";
          return { exitCode: 0, stdout: JSON.stringify({ headRefOid, isDraft: false, reviewDecision: "APPROVED" }), stderr: "" };
        }
        if (query === "mergeCommit") return { exitCode: 0, stdout: options.queuedMerge ? "" : "merge-sha\n", stderr: "" };
        if (query === "state") return { exitCode: 0, stdout: "OPEN\n", stderr: "" };
      }
      if (command === "gh" && argv[0] === "pr" && argv[1] === "merge") {
        hostedEffects.push({ operation: "pr-merge", argv: [...argv] });
        return { exitCode: 0, stdout: "merged", stderr: "" };
      }
      throw new Error("unexpected world.run: " + command + " " + argv.join(" "));
    },
  };
  const files = { async read() { return "Project rules"; }, async glob() { return []; } };
  const reports = [];
  const artifact = { board() {}, async file(...args) { reports.push(args); } };
  const agent = (name) => ({
    async ask(prompt) {
      asks.push({ name, prompt });
      if (name === "gh-ops") {
        if (options.cleanupFailure && prompt.includes("Close out the shipflow cycle")) throw new Error("cleanup unavailable");
        if (prompt.includes("Claim issue #")) return { claimed: true, defaultBranch: "main", note: "claim verified" };
        if (prompt.includes("Draft the pull request")) return { title: "feat: improve Astro rendering (#42)", body: "Adds the Astro rendering change." };
        return "operation completed";
      }
      if (name === "issue-triage") return { actionable: true, reason: "reproducible project task" };
      if (name === "plan-auditor-a0") return { verdict: "proceed", reasons: [] };
      if (name === "implementer-astro-rendering") return { summary: "Updated the Astro page.", changedFiles: ["src/page.astro"], notes: "", skipped: [] };
      if (name === "Committer") return { message: "feat: improve Astro rendering" };
      if (name.startsWith("security-audit")) {
        if (options.readOnlyGuardFails) snapshotVersion += 1;
        const findings = options.finding || options.unconfirmedFinding
          ? [{ where: "src/page.astro:4", what: "A medium-severity issue remains.", evidence: "Confirmed against the changed path.", status: "judged", severity: "medium" }]
          : [];
        return { note: "security checklist complete", findings };
      }
      if (name.startsWith("injection-auditor")) return { note: "No tainted-input paths found.", findings: [] };
      if (name.startsWith("judge-astro-rendering")) return { note: "No findings.", findings: [] };
      if (name.startsWith("confirmer-")) return { reproduced: !options.unconfirmedFinding, note: options.unconfirmedFinding ? "not reproduced from evidence" : "reproduced" };
      throw new Error("unexpected agent.ask: " + name + ": " + prompt.slice(0, 100));
    },
  });
  globalThis.args = {
    issueNumber: 42,
    repo: "example/project",
    tier: "pro",
    task: "Improve the Astro page rendering.",
    areas: [{ ...defaultArea, ...(options.area ?? {}) }],
    agentDir: "/fixture/agents",
    commit: true,
  };
  globalThis.world = world;
  globalThis.files = files;
  globalThis.artifact = artifact;
  globalThis.agent = agent;
  globalThis.model = (id) => ({ id });
  globalThis.phase = () => {};
  globalThis.log = () => {};
  globalThis.report = () => {};
  const execute = new Function(compiled + "\nreturn runQueue();");
  const result = await execute();
  return { result, calls, asks, hostedEffects, gateCalls, reports };
}

{
  const { result, calls, asks, hostedEffects } = await runScenario({ missingBase: true });
  assert.equal(result.verdict, "refused");
  assert.equal(asks.length, 0);
  assert.equal(hostedEffects.length, 0);
  assert.equal(calls.some((call) => call.command === "gh"), false);
}

{
  const { result, asks, calls } = await runScenario({ area: { specialist: "" } });
  assert.equal(result.verdict, "failed");
  assert.equal(asks.some((ask) => ask.name.startsWith("implementer-")), false);
  assert.equal(calls.some((call) => call.command === "npm"), false);
  assert.match(result.findings.map((finding) => finding.what).join("\n"), /specialist is missing/);
}

{
  const { result, asks, hostedEffects, calls, gateCalls } = await runScenario();
  assert.equal(result.verdict, "merged");
  assert.ok(asks.some((ask) => ask.name === "implementer-astro-rendering"));
  assert.ok(asks.some((ask) => ask.name === "judge-astro-rendering-r1"));
  assert.ok(calls.some((call) => call.command === "cat" && call.argv.at(-1).endsWith("/z-astro-engineer.md")));
  assert.equal(asks.some((ask) => ask.prompt.includes("Start this project's preview")), false);
  assert.deepEqual(gateCalls.map((call) => [call.cwd, call.tool, ...call.args]), [["/fixture", "npm", "test"]]);
  assert.equal(gateCalls[0].timeoutMs, 900_000);
  const merge = hostedEffects.find((effect) => effect.operation === "pr-merge");
  assert.ok(merge, "a clean, approved cycle should request merge");
  assert.ok(merge.argv.includes("--match-head-commit"), "merge must be pinned to the reviewed PR head");
  assert.ok(merge.argv.includes("head-a"), "the merge pin must equal the head captured before audit");
}

for (const [options, expected] of [
  [{ finding: true }, /finding\(s\) stand/],
  [{ unconfirmedFinding: true }, /finding\(s\) stand/],
  [{ remoteHeadChanged: true }, /PR head changed after review/],
  [{ localHeadMismatch: true }, /local HEAD did not match the reviewed PR head/],
  [{ readOnlyGuardFails: true }, /read-only audit guards failed/],
]) {
  const { result, hostedEffects } = await runScenario(options);
  assert.notEqual(result.verdict, "merged");
  assert.equal(hostedEffects.some((effect) => effect.operation === "pr-merge"), false);
  assert.match(result.conclusion + "\n" + result.notCovered.join("\n"), expected);
}

{
  const { result, hostedEffects } = await runScenario({ queuedMerge: true });
  assert.ok(hostedEffects.some((effect) => effect.operation === "pr-merge"));
  assert.equal(result.verdict, "open");
  assert.match(result.conclusion, /completion is not confirmed/);
}

{
  const { result } = await runScenario({ cleanupFailure: true });
  assert.equal(result.verdict, "merged");
  assert.ok(result.notCovered.some((item) => item.includes("cleanup unavailable")));
}

console.log("Shipflow queue validation passed: fail-closed persona loading, specialist dispatch, Astro routing independent of UI preview, guarded merge readiness, and reviewed-head merge pinning.");
