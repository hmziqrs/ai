import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { parseCharter } from "../skills/shipflow/scripts/lib/charter.ts";
import { lintPrd, parsePrd, readProject } from "../skills/shipflow/scripts/lib/prd.ts";
import { parseArgs as parseLintArgs } from "../skills/shipflow/scripts/prd-lint.ts";
import { buildDecideInput, decide, parseArgs as parseSnapshotArgs } from "../skills/shipflow/scripts/snapshot.ts";

const skill = resolve(import.meta.dirname, "../skills/shipflow");
const fixtures = resolve(skill, "scripts/fixtures");
const files = readProject(resolve(fixtures, "valid"));
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const lint = (model, options = {}) => lintPrd(model, {
  stage: "s5", coverageTarget: 0.95, decomposed: null, ...options,
});
let checks = 0;
function check(name, run) {
  try {
    run();
    checks++;
  } catch (error) {
    throw new Error(name, { cause: error });
  }
}

check("the detailed PRD fixture passes", () => {
  assert.deepEqual(lint(parsePrd(files)).errors, []);
});

for (const name of readdirSync(resolve(fixtures, "violations")).filter((name) => name.endsWith(".json"))) {
  check(`existing violation ${name}`, () => {
    const fixture = json(resolve(fixtures, "violations", name));
    const edited = new Map(files);
    for (const edit of fixture.edits) {
      const text = edited.get(edit.file);
      assert.ok(text?.includes(edit.find), `missing edit target in ${edit.file}`);
      edited.set(edit.file, text.replace(edit.find, edit.replace));
    }
    const result = lint(parsePrd(edited), { stage: fixture.stage });
    assert.ok(result.errors.some((error) => `ERROR ${error.id} ${error.rule}` === fixture.expect));
  });
}

const partialFiles = new Map(files);
partialFiles.set("prd/sections/LB.md", files.get("prd/sections/LB.md").replace(/^\| LB-5\.[0-9]+ \|.*\n/gm, ""));
const partial = parsePrd(partialFiles);

check("one feature can be complete while a sibling remains unplanned", () => {
  assert.deepEqual(lint(partial, { features: ["LB-1"] }).errors, []);
  assert.ok(lint(partial, { decomposed: ["M1"] }).errors.some((error) => error.id === "LB-5" && error.rule === "task-count"));
});
check("selecting the unfinished feature catches its missing tasks and criteria", () => {
  const result = lint(partial, { features: ["LB-5"] });
  assert.ok(result.errors.some((error) => error.rule === "task-count"));
  assert.ok(result.errors.some((error) => error.rule === "ac-uncovered"));
});
check("scoping cannot hide invalid existing tasks or dependencies", () => {
  const invalid = structuredClone(partial);
  invalid.tasks[0].area = ["../outside"];
  invalid.tasks[0].dependsOn = ["ZZ-99.1"];
  const errors = lint(invalid, { features: ["LB-1"] }).errors;
  assert.ok(errors.some((error) => error.rule === "task-fields"));
  assert.ok(errors.some((error) => error.rule === "dep-unresolved"));
});
check("unknown or inactive feature selection fails", () => {
  assert.ok(lint(partial, { features: ["ZZ-99"] }).errors.some((error) => error.rule === "task-scope"));
  const inactive = structuredClone(partial);
  inactive.features.find((feature) => feature.id === "LB-1").status = "dropped";
  assert.ok(lint(inactive, { features: ["LB-1"] }).errors.some((error) => error.rule === "task-scope"));
});
check("the planning CLI rejects ambiguous or malformed scope", () => {
  const args = ["--repo", ".", "--stage", "s5", "--features", "LB-1,LB-2"];
  assert.equal(parseLintArgs(args).kind, "run");
  assert.equal(parseLintArgs([...args, "--decomposed", "M1"]).kind, "usage");
  assert.equal(parseLintArgs(["--repo", ".", "--stage", "s3", "--features", "LB-1"]).kind, "usage");
  assert.equal(parseLintArgs([...args.slice(0, -1), ""]).kind, "usage");
});

const ready = json(resolve(fixtures, "github/decide-task-cycles.json"));
const rolling = json(resolve(fixtures, "github/decide-decompose.json"));
check("end-to-end dispatch can plan the next milestone; implementation runs existing tasks", () => {
  assert.equal(decide(rolling).action, "decompose");
  const result = decide({ ...rolling, mode: "implement" });
  assert.equal(result.action, "task-cycles");
  assert.deepEqual(result.issues, [110]);
});
check("new reports are triaged before review or task work, in either mode", () => {
  const triage = decide({ ...ready, untriaged: [41, 7] });
  assert.equal(triage.action, "triage");
  assert.deepEqual(triage.issues, [7, 41]);
  assert.equal(decide({ ...ready, mode: "implement", untriaged: [7] }).action, "triage");
  assert.equal(decide({ ...ready, untriaged: [7], stopTheLine: [9] }).action, "fix-main");
});
check("a queued bug is dispatched first, even outside the current milestone", () => {
  const later = ready.milestones[ready.milestones.length - 1].name;
  const bug = { issue: 500, id: "BUG-500", kind: "bug", milestone: later, area: ["zz-bug-only/"], prio: "p2", createdAt: "2099-01-01T00:00:00Z", criticalPath: 1 };
  const picked = decide({ ...ready, ready: [...ready.ready, bug] });
  assert.equal(picked.action, "task-cycles");
  assert.equal(picked.issues[0], 500);
});
check("implementation never starts kickoff", () => {
  assert.equal(decide({ ...ready, mode: "implement", kickoffStage: "S2" }).action, "needs-plan");
  assert.equal(decide({ ...ready, mode: "dispatch", kickoffStage: "S2" }).action, "kickoff");
});
check("human review holds even during an unfinished kickoff", () => {
  for (const mode of ["implement", "dispatch"]) {
    assert.equal(decide({ ...ready, mode, kickoffStage: "S4", prdApproval: "human", prdAwaitingApproval: true }).action, "wait-approval");
  }
});
check("implementation stops when more planning is needed", () => {
  const exhausted = { ...ready, mode: "implement", ready: [], promotable: [], openTasks: 0, projectDone: true };
  assert.equal(decide(exhausted).action, "needs-plan");
  const blocked = { ...exhausted, openTasks: 1, blocked: [201] };
  assert.equal(decide(blocked).action, "needs-plan");
  assert.equal(decide({ ...blocked, mode: "dispatch" }).action, "unblock");
});
check("pause and active-run rules still prevent launches", () => {
  assert.equal(decide({ ...ready, paused: true }).action, "paused");
  assert.equal(decide({ ...ready, activeRun: true }).action, "busy");
});
check("the snapshot CLI defaults to implementation-only and requires a valid mode", () => {
  const args = ["--repo", ".", "--charter", "autopilot.yaml"];
  assert.equal(parseSnapshotArgs(args).mode, "implement");
  assert.equal(parseSnapshotArgs([...args, "--mode", "dispatch"]).mode, "dispatch");
  assert.throws(() => parseSnapshotArgs([...args, "--mode", "unknown"]));
});
check("the template charter works without delivery accounting input", () => {
  const loaded = parseCharter(readFileSync(resolve(skill, "templates/autopilot.yaml"), "utf8"));
  assert.deepEqual(loaded.errors, []);
  const snap = {
    kickoffStage: "done", paused: false, tasks: [], promotable: [], openPrs: [],
    stopTheLine: [], staleClaims: [],
  };
  const input = buildDecideInput(snap, loaded.charter, partial, { mode: "implement", activeRun: false, auditDue: false });
  assert.equal(decide(input).action, "needs-plan");
});

// The CLIs run as child processes with the same flags as this checker: no env file, no config.
const decoder = new TextDecoder();
function runCli(script, args) {
  const run = Bun.spawnSync([process.execPath, "--no-env-file", "--no-config", script, ...args], {
    cwd: skill, stdout: "pipe", stderr: "pipe",
  });
  assert.equal(run.exitCode, 0, decoder.decode(run.stderr));
  return decoder.decode(run.stdout);
}
const snapshotArgs = [
  "--repo", resolve(fixtures, "valid"),
  "--charter", resolve(skill, "templates/autopilot.yaml"),
  "--json-in", resolve(fixtures, "github/snapshot-sample.json"),
];
const IMPLEMENT_ACTIONS = ["advance", "fix-main", "task-cycles", "unblock", "audit", "finish", "needs-plan", "idle"];

check("the snapshot CLI prints one summary line and leaks no task titles", () => {
  const out = runCli("scripts/snapshot.ts", snapshotArgs);
  const lines = out.split("\n").filter((line) => line !== "");
  assert.equal(lines.length, 1);
  const body = JSON.parse(lines[0]);
  assert.equal(body.snapshot.repo, "acme/site");
  assert.equal(typeof body.decision.action, "string");
  for (const title of ["Scaffold and CI", "Overall leaderboard"]) {
    assert.ok(!out.includes(title), `task title leaked into snapshot output: ${title}`);
  }
});
check("the snapshot CLI in implement mode advances review work and never kickoffs or decomposes", () => {
  const { decision } = JSON.parse(runCli("scripts/snapshot.ts", [...snapshotArgs, "--mode", "implement"]));
  assert.ok(IMPLEMENT_ACTIONS.includes(decision.action), `unexpected implement action ${decision.action}`);
  assert.equal(decision.action, "advance");
  assert.deepEqual(decision.issues, [21]);
  assert.deepEqual(decision.release, [26]);
});
check("the reconcile dry run is repeatable and plans labels, milestones, then backlog tasks only", () => {
  const args = [
    "--repo", resolve(fixtures, "valid"), "--gh-repo", "acme/site", "--login", "bot", "--prd-issue", "0",
    "--existing", resolve(fixtures, "github/empty.json"), "--dry-run",
  ];
  const first = runCli("scripts/reconcile.ts", args);
  assert.equal(runCli("scripts/reconcile.ts", args), first);
  const ops = first.split("\n").filter((line) => line.startsWith("OP "));
  assert.match(ops[0], /^OP ensure-labels /);
  assert.match(ops[1], /^OP ensure-milestones /);
  const states = first.match(/state:\S*/g) ?? [];
  assert.deepEqual([...new Set(states)], ["state:backlog"]);
});

process.stdout.write(`shipflow planning: ${checks} checks passed\n`);
