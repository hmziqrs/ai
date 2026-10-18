// Approval helper for ZCode's "Run this workflow?" dialog, for the owner's autonomous Shipflow runs.
// It reads ZCode's accessibility tree with open-computer-use (ocu), and when the dialog asks to run a
// workflow named zflow-autopilot-<slug> it chooses "Always allow in this session" (the session-wide
// allowance of design D16) and confirms. Every other dialog, and any workflow with another name, is
// left alone and logged as refused. Each decision is appended to ~/.zcode/autopilot-approvals.log.
// Test tooling for the owner's machine: it is not installed into projects.
//   bun harness/zcode/scripts/approve-workflow.mjs --once                run one check and exit
//   bun harness/zcode/scripts/approve-workflow.mjs --minutes 240         watch for up to 240 minutes
//   bun harness/zcode/scripts/approve-workflow.mjs --self-test           parser checks on fixtures
// Exit 0 when the check ran (or the self-test passed), 1 when the self-test failed, 2 on usage errors.
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const APP = "dev.zcode.app";
const TITLE = "Run this workflow?";
const OPTION = "Always allow in this session";
const CONFIRM = "Confirm";
const WORKFLOW = /zflow-autopilot-[a-z0-9-]+/g;
const LOG = join(homedir(), ".zcode", "autopilot-approvals.log");

// The index of an accessibility element line: leading tabs, then the number, then the role.
function indexOf(line) {
  const m = /^\t*(\d+) /.exec(line);
  return m === null ? null : Number(m[1]);
}

// The element index for a label: the label's own line, else the nearest element line above it.
function elementFor(lines, at) {
  for (let i = at; i >= 0; i--) {
    const index = indexOf(lines[i]);
    if (index !== null) return index;
  }
  return null;
}

// Reads the tree text and returns what the approval needs, or why it is refused.
export function workflowDialog(text) {
  const lines = text.split("\n");
  const title = lines.findIndex((line) => line.includes(TITLE));
  if (title === -1) return { found: false };
  const block = lines.slice(title, title + 200);
  const names = [...new Set(block.join("\n").match(WORKFLOW) ?? [])];
  const option = block.findIndex((line) => line.includes(OPTION));
  const confirm = block.findIndex((line) => /\bConfirm\b/.test(line));
  const result = { found: true, names, option: null, confirm: null, refused: "" };
  if (names.length === 0) {
    result.refused = "the dialog names no zflow-autopilot workflow";
    return result;
  }
  if (option === -1 || confirm === -1) {
    result.refused = "the dialog lacks the expected options or the Confirm button";
    return result;
  }
  const optionIndex = elementFor(block, option);
  const confirmIndex = elementFor(block, confirm);
  if (optionIndex === null || confirmIndex === null) {
    result.refused = "the dialog elements have no index";
    return result;
  }
  result.option = optionIndex;
  result.confirm = confirmIndex;
  return result;
}

function log(entry) {
  mkdirSync(dirname(LOG), { recursive: true });
  appendFileSync(LOG, `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
}

// One ocu call that reads the accessibility state and returns its text.
function readState() {
  const run = spawnSync("ocu", ["call", "get_app_state", "--args", JSON.stringify({ app: APP })], { encoding: "utf8", timeout: 60000 });
  if (run.status !== 0) throw new Error(`ocu get_app_state exited ${run.status}: ${(run.stderr || "").trim().slice(-300)}`);
  const parsed = JSON.parse(run.stdout);
  if (parsed.isError) throw new Error(`ocu get_app_state failed: ${parsed.content?.[0]?.text ?? ""}`);
  return parsed.content.map((part) => part.text ?? "").join("\n");
}

// The clicks run in one ocu process, so the element indices read just before stay valid for them.
function clickInOneProcess(option, confirm) {
  const calls = [
    { tool: "get_app_state", args: { app: APP } },
    { tool: "click", args: { app: APP, element_index: option } },
    { tool: "click", args: { app: APP, element_index: confirm } },
  ];
  const run = spawnSync("ocu", ["call", "--calls", JSON.stringify(calls)], { encoding: "utf8", timeout: 120000 });
  if (run.status !== 0) throw new Error(`ocu clicks exited ${run.status}: ${(run.stderr || "").trim().slice(-300)}`);
  if (/"isError"\s*:\s*true/.test(run.stdout)) throw new Error(`ocu click reported an error: ${run.stdout.slice(-300)}`);
}

// One check: read the tree; when a zflow-autopilot approval is open, choose the session allowance, confirm,
// and read the tree again to confirm the dialog closed.
export function checkOnce() {
  const dialog = workflowDialog(readState());
  if (!dialog.found) return { action: "none" };
  if (dialog.refused !== "") {
    log({ action: "refused", reason: dialog.refused, names: dialog.names });
    return { action: "refused", reason: dialog.refused };
  }
  clickInOneProcess(dialog.option, dialog.confirm);
  const after = workflowDialog(readState());
  if (after.found) {
    log({ action: "unconfirmed", names: dialog.names, reason: "the dialog is still open after Confirm" });
    return { action: "unconfirmed", names: dialog.names };
  }
  log({ action: "approved", names: dialog.names, option: OPTION });
  return { action: "approved", names: dialog.names };
}

function selfTest() {
  const tree = [
    "App=dev.zcode.app (pid 1)",
    "\t\t\t12 container",
    "\t\t\t\t13 text Run this workflow?",
    "\t\t\t\t14 text zflow-autopilot-s1-recon1",
    "\t\t\t\t15 button Allow Allow only this time",
    "\t\t\t\t16 button Always allow in this session Do not ask again for workflows in this session",
    "\t\t\t\t17 button Deny Reject it for now",
    "\t\t\t\t18 button Confirm",
  ].join("\n");
  const ok = workflowDialog(tree);
  const checks = [
    ["finds the dialog", ok.found === true],
    ["takes the session allowance element", ok.option === 16],
    ["takes the confirm element", ok.confirm === 18],
    ["names the workflow", ok.names.length === 1 && ok.names[0] === "zflow-autopilot-s1-recon1"],
    ["no dialog means no action", workflowDialog("App=dev.zcode.app\n\t\t\t1 button New task").found === false],
    ["refuses a workflow with another name", workflowDialog(tree.replace("zflow-autopilot-s1-recon1", "deploy-prod")).refused !== ""],
    ["refuses when Confirm is missing", workflowDialog(tree.replace("\n\t\t\t\t18 button Confirm", "")).refused !== ""],
    ["refuses a different dialog with the same options", workflowDialog(tree.replace("Run this workflow?", "Delete the repository?")).found === false],
  ];
  let failed = 0;
  for (const [name, pass] of checks) {
    console.log(`${pass ? "PASS" : "FAIL"} ${name}`);
    if (!pass) failed++;
  }
  console.log(`approve-workflow self-test: ${checks.length - failed}/${checks.length} checks passed`);
  return failed === 0 ? 0 : 1;
}

function main(argv) {
  if (argv.includes("--self-test")) return selfTest();
  if (argv.includes("--once")) {
    console.log(JSON.stringify(checkOnce()));
    return 0;
  }
  const minutesAt = argv.indexOf("--minutes");
  if (minutesAt === -1) {
    console.error("usage: approve-workflow.mjs --once | --minutes <n> | --self-test");
    return 2;
  }
  const minutes = Number(argv[minutesAt + 1]);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    console.error("--minutes needs a positive number");
    return 2;
  }
  const until = Date.now() + minutes * 60000;
  while (Date.now() < until) {
    try {
      const result = checkOnce();
      if (result.action !== "none") console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
    } catch (error) {
      log({ action: "error", message: String(error.message ?? error) });
    }
    Bun.sleepSync(3000);
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
