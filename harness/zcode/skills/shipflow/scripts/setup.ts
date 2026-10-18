// shipflow setup: the one owner-invoked step that configures a repository for autopilot. It
// generates autopilot.yaml from the owner's prompt and the repository, then, with the owner's
// existing gh login and the github kit, confirms or creates the labels, milestones, PRD issue,
// GitHub Project, setup PR and autopilot ruleset. --sync-checkout afterwards fast-forwards the
// owner's checkout to the merged default branch without losing any untracked file.
//
// Exit codes: 0 done (warnings allowed), 1 a required step failed, 2 usage or environment
// (gh not authenticated, no admin access, no GitHub origin).
import { createHash } from "node:crypto";
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync,
} from "node:fs";
import { hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { expandHome, parseCharter, type Charter } from "./lib/charter.ts";
import { loadKit, realWorld, type KitModule, type World } from "./lib/kit.ts";

const USAGE = [
  "usage: bun setup.ts --repo <root> [--gh-repo OWNER/NAME] [--dry-run] [--no-ruleset]",
  "                    [--reference <https-url>]... [--reference-clear]",
  "                    [--approval human|auto|window] [--breakdown upfront|rolling] [--lanes <n>]",
  "                    [--attempts <n>] [--timeout-minutes <n>] [--page-cap <n>]",
  "                    [--first-attempt pro|flash] [--project-title <title>] [--instance <id>]",
  "                    [--gate <l1|unit|acceptance|parity>=\"<command>\"]... [--clear-gates <group>]...",
  "                    [--area <prefix>=<specialist>[:ui]]... [--clear-areas]",
  "                    [--preview \"<command>\"] [--clear-preview]",
  "                    [--reviewer-app <app_id>:<installation_id>:<key_path>] [--no-reviewer]",
  "       bun setup.ts --repo <root> --sync-checkout [--gh-repo OWNER/NAME] [--dry-run]",
  "",
].join("\n");

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const INSTANCE_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const REF_TEXT = /^[A-Za-z0-9._/-]+$/;
const ORIGIN = "origin/";
const CHARTER_FILE = "autopilot.yaml";
const CI_FILE = ".github/workflows/autopilot-ci.yml";
const CONFIG_FILE = ".zcode/config.json";
const GITIGNORE_FILE = ".gitignore";
const TEMPLATE_DIR = join(import.meta.dir, "..", "templates");
const HOOKS_FILE = join(import.meta.dir, "..", "hooks", "hooks.json");
const HARNESS_DIRS = [".zcode/skills/shipflow", ".zcode/skills/z-workflow", ".zcode/agents", ".agents/skills"];
const HARNESS_FILES = [".zcode/hmziqrs-ai-snapshot.json"];
// Check-script test data, never part of an installed project.
const HARNESS_EXCLUDED = [".zcode/skills/shipflow/scripts/fixtures"];
const LOCKFILES = ["bun.lock", "bun.lockb", "pnpm-lock.yaml", "yarn.lock", "package-lock.json"];
const APPROVALS = ["human", "auto", "window"];
const BREAKDOWNS = ["upfront", "rolling"];

export interface SetupOptions {
  root: string;
  ghRepo: string | null;
  // [] with --reference-clear; null when no reference flag was given.
  references: string[] | null;
  approval: "human" | "auto" | "window" | null;
  breakdown: "upfront" | "rolling" | null;
  lanes: number | null;
  attempts: number | null;
  timeoutMinutes: number | null;
  pageCap: number | null;
  firstAttempt: "pro" | "flash" | null;
  projectTitle: string | null;
  instance: string | null;
  // Gate groups: a command list from --gate (in flag order), or null from --clear-gates (detection).
  gates: Record<string, Obj[] | null>;
  // undefined: not given. [] (--clear-areas) returns the areas to detection.
  areas: Obj[] | undefined;
  // undefined: not given. null (--clear-preview) returns the preview to detection.
  preview: Obj | null | undefined;
  // undefined: not given. null (--no-reviewer) sets identities.reviewer to null.
  reviewer: Obj | null | undefined;
  dryRun: boolean;
  noRuleset: boolean;
  syncCheckout: boolean;
}

export type ParsedArgs =
  | { kind: "run"; options: SetupOptions }
  | { kind: "help" }
  | { kind: "usage"; message: string };

// A required step failed (1) or the environment is unusable (2). Anything else is also exit 1.
export class SetupFailure extends Error {
  readonly exitCode: 1 | 2;

  constructor(message: string, exitCode: 1 | 2) {
    super(message);
    this.exitCode = exitCode;
  }
}

const VALUE_FLAGS = new Set([
  "--repo", "--gh-repo", "--reference", "--approval", "--breakdown", "--lanes", "--attempts",
  "--timeout-minutes", "--page-cap", "--first-attempt", "--project-title", "--instance",
  "--gate", "--clear-gates", "--area", "--preview", "--reviewer-app",
]);
const REPEATABLE_FLAGS = new Set(["--reference", "--gate", "--clear-gates", "--area"]);
const BOOLEAN_FLAGS = new Set([
  "--dry-run", "--no-ruleset", "--sync-checkout", "--reference-clear", "--clear-areas", "--clear-preview",
  "--no-reviewer",
]);
const APPLY_ONLY_FLAGS = [
  "--reference", "--reference-clear", "--approval", "--breakdown", "--lanes", "--attempts", "--timeout-minutes",
  "--page-cap", "--first-attempt", "--project-title", "--instance", "--gate", "--clear-gates", "--area",
  "--clear-areas", "--preview", "--clear-preview", "--reviewer-app", "--no-reviewer", "--no-ruleset",
];

const usage = (message: string): ParsedArgs => ({ kind: "usage", message });

function isHttpsUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === "https:" && url.hostname !== "";
  } catch {
    return false;
  }
}

// Thrown by the flag parser; parseArgs turns it into a usage result (exit 2).
class UsageError extends Error {}

const GATE_GROUPS = ["l1", "unit", "acceptance", "parity"];
// Gate timeouts in minutes. Acceptance and parity run browsers, so they get longer.
const GATE_TIMEOUT: Record<string, number> = { l1: 15, unit: 15, acceptance: 30, parity: 30 };
const PREVIEW_TIMEOUT = 2;
const FIRST_ATTEMPTS = ["pro", "flash"];
const DIGITS = /^[0-9]+$/;
const SPECIALIST = /^z-[a-z0-9-]+$/;

function positiveInt(flag: string, text: string | null): number | null {
  if (text === null) return null;
  if (!/^[1-9][0-9]*$/.test(text)) throw new UsageError(`${flag} must be a positive integer`);
  return Number(text);
}

// A command splits on whitespace: the first token is the tool, the rest are its arguments.
function commandTokens(text: string, flag: string): string[] {
  const tokens = text.trim().split(/\s+/).filter((token) => token !== "");
  if (tokens.length === 0) throw new UsageError(`${flag} needs a command`);
  return tokens;
}

// The gate name is the script for `run <script>` and the tool otherwise.
export function gateEntry(group: string, command: string): Obj {
  const tokens = commandTokens(command, `--gate ${group}`);
  const args = tokens.slice(1);
  const name = args[0] === "run" && args.length >= 2 ? args[1] : tokens[0];
  return { name, tool: tokens[0], args, timeout_minutes: GATE_TIMEOUT[group] };
}

function previewEntry(text: string): Obj {
  const tokens = commandTokens(text, "--preview");
  return { tool: tokens[0], args: tokens.slice(1), timeout_minutes: PREVIEW_TIMEOUT };
}

// --area <prefix>=<specialist>[:ui]
function areaEntry(value: string): Obj {
  const eq = value.indexOf("=");
  if (eq <= 0) throw new UsageError("--area needs <prefix>=<specialist>[:ui]");
  const rest = value.slice(eq + 1);
  const ui = rest.endsWith(":ui");
  const specialist = ui ? rest.slice(0, -3) : rest;
  if (!SPECIALIST.test(specialist)) throw new UsageError(`--area specialist must match ^z-[a-z0-9-]+$: ${specialist}`);
  return { prefix: value.slice(0, eq), specialist, ui };
}

// --reviewer-app <app_id>:<installation_id>:<key_path>; the key path may itself contain colons.
function reviewerEntry(value: string): Obj {
  const parts = value.split(":");
  if (parts.length < 3) throw new UsageError("--reviewer-app needs <app_id>:<installation_id>:<key_path>");
  const [appId, installationId] = parts;
  const keyPath = parts.slice(2).join(":");
  if (!DIGITS.test(appId) || !DIGITS.test(installationId)) throw new UsageError("--reviewer-app ids must be digits");
  if (keyPath === "") throw new UsageError("--reviewer-app needs a key path");
  return { app_id: appId, installation_id: installationId, key_path: keyPath };
}

// The reviewer key is a local secret: a regular file that only the owner can read (mode 0600 or
// stricter). Returns the problem, or null when the key is acceptable.
export function reviewerKeyProblem(keyPath: string): string | null {
  const path = expandHome(keyPath);
  if (!existsSync(path) || !statSync(path).isFile()) return `reviewer key ${keyPath} is not a file`;
  const mode = statSync(path).mode & 0o777;
  if ((mode & 0o077) !== 0) return `reviewer key ${keyPath} must be mode 0600 or stricter (is ${mode.toString(8)})`;
  return null;
}

// --gate <group>=<command> builds each group's list in flag order; --clear-gates returns a group to
// detection (null). A group named by both is refused.
function gateOverrides(gateValues: string[], clearValues: string[]): Record<string, Obj[] | null> {
  const groups = new Map<string, Obj[]>();
  for (const value of gateValues) {
    const eq = value.indexOf("=");
    const group = eq > 0 ? value.slice(0, eq) : "";
    if (!GATE_GROUPS.includes(group)) throw new UsageError("--gate needs <l1|unit|acceptance|parity>=<command>");
    groups.set(group, [...(groups.get(group) ?? []), gateEntry(group, value.slice(eq + 1))]);
  }
  const result: Record<string, Obj[] | null> = Object.fromEntries(groups);
  for (const group of clearValues) {
    if (!GATE_GROUPS.includes(group)) throw new UsageError("--clear-gates needs l1, unit, acceptance or parity");
    if (groups.has(group)) throw new UsageError(`--gate and --clear-gates both name ${group}`);
    result[group] = null;
  }
  return result;
}

export function parseArgs(argv: string[]): ParsedArgs {
  try {
    return parseArgsOrThrow(argv);
  } catch (err) {
    if (err instanceof UsageError) return usage(err.message);
    throw err;
  }
}

function parseArgsOrThrow(argv: string[]): ParsedArgs {
  const values = new Map<string, string[]>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (!arg.startsWith("--")) throw new UsageError(`unexpected argument ${arg}`);
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (VALUE_FLAGS.has(name)) {
      const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || value === "" || (eq < 0 && value.startsWith("--"))) {
        throw new UsageError(`${name} needs a value`);
      }
      const seen = values.get(name) ?? [];
      if (seen.length > 0 && !REPEATABLE_FLAGS.has(name)) throw new UsageError(`${name} was given twice`);
      values.set(name, [...seen, value]);
    } else if (BOOLEAN_FLAGS.has(name) && eq < 0) {
      flags.add(name);
    } else {
      throw new UsageError(`unknown flag ${name}`);
    }
  }

  const one = (name: string): string | null => values.get(name)?.[0] ?? null;
  const has = (name: string): boolean => values.has(name) || flags.has(name);
  const rootFlag = one("--repo");
  if (rootFlag === null) throw new UsageError("--repo is required");
  const syncCheckout = flags.has("--sync-checkout");
  if (syncCheckout) {
    const misplaced = APPLY_ONLY_FLAGS.find((name) => has(name));
    if (misplaced !== undefined) throw new UsageError(`${misplaced} does not apply with --sync-checkout`);
  }
  for (const [a, b] of [
    ["--reference", "--reference-clear"],
    ["--area", "--clear-areas"],
    ["--preview", "--clear-preview"],
    ["--reviewer-app", "--no-reviewer"],
  ]) {
    if (has(a) && has(b)) throw new UsageError(`${a} and ${b} cannot be used together`);
  }

  const ghRepo = one("--gh-repo");
  if (ghRepo !== null && !REPO_RE.test(ghRepo)) throw new UsageError("--gh-repo must be OWNER/NAME");
  const approval = one("--approval");
  if (approval !== null && !APPROVALS.includes(approval)) throw new UsageError("--approval must be human, auto or window");
  const breakdown = one("--breakdown");
  if (breakdown !== null && !BREAKDOWNS.includes(breakdown)) throw new UsageError("--breakdown must be upfront or rolling");
  const firstAttempt = one("--first-attempt");
  if (firstAttempt !== null && !FIRST_ATTEMPTS.includes(firstAttempt)) throw new UsageError("--first-attempt must be pro or flash");
  const instance = one("--instance");
  if (instance !== null && !INSTANCE_RE.test(instance)) throw new UsageError("--instance must match ^[a-z0-9][a-z0-9-]{0,31}$");
  const projectTitle = one("--project-title");
  if (projectTitle !== null && projectTitle.trim() === "") throw new UsageError("--project-title must not be blank");
  const referenceValues = values.get("--reference") ?? [];
  for (const ref of referenceValues) {
    if (!isHttpsUrl(ref)) throw new UsageError(`--reference must be an https URL: ${ref}`);
  }
  const areaValues = values.get("--area");
  const previewText = one("--preview");
  const reviewerText = one("--reviewer-app");
  return {
    kind: "run",
    options: {
      root: resolve(rootFlag),
      ghRepo,
      references: flags.has("--reference-clear") ? [] : values.has("--reference") ? referenceValues : null,
      approval: approval as SetupOptions["approval"],
      breakdown: breakdown as SetupOptions["breakdown"],
      lanes: positiveInt("--lanes", one("--lanes")),
      attempts: positiveInt("--attempts", one("--attempts")),
      timeoutMinutes: positiveInt("--timeout-minutes", one("--timeout-minutes")),
      pageCap: positiveInt("--page-cap", one("--page-cap")),
      firstAttempt: firstAttempt as SetupOptions["firstAttempt"],
      projectTitle,
      instance,
      gates: gateOverrides(values.get("--gate") ?? [], values.get("--clear-gates") ?? []),
      areas: areaValues !== undefined ? areaValues.map(areaEntry) : flags.has("--clear-areas") ? [] : undefined,
      preview: previewText !== null ? previewEntry(previewText) : flags.has("--clear-preview") ? null : undefined,
      reviewer: reviewerText !== null ? reviewerEntry(reviewerText) : flags.has("--no-reviewer") ? null : undefined,
      dryRun: flags.has("--dry-run"),
      noRuleset: flags.has("--no-ruleset"),
      syncCheckout,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Charter generation. The YAML emitter is deterministic: keys keep insertion order, short values
// are written in flow style (as in templates/autopilot.yaml), and output for the same input is
// byte-identical, so a second run over its own output changes nothing.
// ---------------------------------------------------------------------------------------------

type Yaml = string | number | boolean | null | Yaml[] | { [key: string]: Yaml };
type Obj = { [key: string]: Yaml };

const RESERVED_WORDS = new Set(["true", "false", "null", "yes", "no", "on", "off", "y", "n"]);
const PLAIN_TEXT = /^[A-Za-z][A-Za-z0-9_./-]*$/;
const FLOW_LIMIT = 100;
const PAUSE_TEXT = "label autopilot:paused on the PRD issue";
const CHARTER_HEADER = [
  "# Autopilot charter, generated by shipflow setup from the owner's prompt and the repository.",
  "# Do not edit by hand: change it by re-running setup, which opens a PR that the owner merges.",
];
const DEFAULT_LIMITS: Obj = {
  max_parallel_lanes: 3,
  task_attempts: 4,
  task_timeout_minutes: 90,
  wall_clock_days: 14,
  page_cap: 400,
};
const DEFAULT_HOSTS = ["github.com", "api.github.com", "registry.npmjs.org"];
const DEFAULT_PROTECTED: Yaml[] = [
  { prefix: "prd/", agents: "^(prd|plan)-", branches: "^wf/prd-v[0-9]+$" },
  { prefix: "tests/acceptance/", agents: "^test-author-", branches: "^wf/test-" },
  { prefix: "tests/parity/", agents: "^test-author-", branches: "^wf/test-" },
  { prefix: "discovery/", agents: "^recon-", branches: "^wf/recon-" },
  { prefix: ".github/", agents: "^$", branches: "^wf/setup-[0-9]+$" },
  { prefix: "autopilot.yaml", agents: "^$", branches: "^wf/setup-[0-9]+$" },
];
const DEFAULT_HOOKS: Obj = { log: ".shipflow/policy.log", deny_agent_gh_writes: true, auto_approve_tools: [] };

// What the flags ask for. null (or undefined for the object-valued keys) means the flag was not
// given, so the existing value is kept; [] or null in the list-like keys is an explicit clear.
export interface CharterOverrides {
  references: string[] | null;
  approval: string | null;
  breakdown: string | null;
  lanes: number | null;
  attempts: number | null;
  timeoutMinutes: number | null;
  pageCap: number | null;
  firstAttempt: string | null;
  instance: string | null;
  gates: Record<string, Obj[] | null>;
  areas: Obj[] | undefined;
  preview: Obj | null | undefined;
  reviewer: Obj | null | undefined;
}

export interface CharterInputs {
  repo: string;
  baseBranch: string;
  login: string;
  prdIssue: number;
  lockfile: string;
  defaultInstance: string;
  overrides: CharterOverrides;
}

function isMap(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function section(value: unknown): Obj {
  return isMap(value) ? value : {};
}

function listOf(value: unknown): Yaml[] {
  return Array.isArray(value) ? (value as Yaml[]) : [];
}

function stringList(value: unknown): string[] {
  return listOf(value).filter((item): item is string => typeof item === "string");
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function firstLine(text: string): string {
  return text.trim().split("\n")[0] ?? "";
}

function scalar(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "string") {
    return PLAIN_TEXT.test(value) && !RESERVED_WORDS.has(value.toLowerCase()) ? value : JSON.stringify(value);
  }
  return String(value);
}

function flow(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(flow).join(", ")}]`;
  if (isMap(value)) {
    return `{${Object.entries(value).map(([key, item]) => `${scalar(key)}: ${flow(item)}`).join(", ")}}`;
  }
  return scalar(value as string | number | boolean | null);
}

function emitMap(map: Obj, indent: string, out: string[]): void {
  for (const [key, value] of Object.entries(map)) {
    const inline = flow(value);
    if (inline.length + key.length + indent.length <= FLOW_LIMIT) {
      out.push(`${indent}${scalar(key)}: ${inline}`);
    } else if (isMap(value)) {
      out.push(`${indent}${scalar(key)}:`);
      emitMap(value, `${indent}  `, out);
    } else {
      out.push(`${indent}${scalar(key)}:`);
      for (const item of listOf(value)) out.push(`${indent}  - ${flow(item)}`);
    }
  }
}

function emitYaml(doc: Obj, header: string[]): string {
  const out = [...header];
  emitMap(doc, "", out);
  return `${out.join("\n")}\n`;
}

// The host of a reference URL. Tolerant on purpose: an existing charter value is validated by
// parseCharter, not here.
function hostOf(reference: string): string {
  return reference.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/:?#]/)[0].toLowerCase();
}

export function slugOf(repo: string): string {
  return repo.split("/")[1].toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function parityFor(hasReference: boolean): Obj {
  return { structure: hasReference, layout: hasReference, interactions: hasReference, brand: false, content: false };
}

function securityPaths(lockfile: string): string[] {
  return ["server/auth/", "server/api/", "package.json", ...(lockfile === "" ? [] : [lockfile])];
}

function authorityFor(existing: Obj, referenceHosts: string[]): Obj {
  const current = section(existing.authority);
  const base = "network_allow" in current ? stringList(current.network_allow) : DEFAULT_HOSTS;
  return {
    push: ["refs/heads/wf/*"],
    merge: { method: "squash", via: ["merge_queue", "merge_train"], requires: ["ci", "acceptance", "parity", "ai-review"] },
    github: ["issues", "sub_issues", "dependencies", "labels", "pull_requests", "checks"],
    deploy: "preview_only",
    ...current,
    network_allow: [...new Set([...base, ...referenceHosts])],
  };
}

const given = (value: number | null | undefined): value is number => typeof value === "number";

// Each numeric flag overrides its own limit; a flag that was not given leaves the existing value.
function limitOverrides(o: CharterOverrides): Obj {
  const out: Obj = {};
  if (given(o.lanes)) out.max_parallel_lanes = o.lanes;
  if (given(o.attempts)) out.task_attempts = o.attempts;
  if (given(o.timeoutMinutes)) out.task_timeout_minutes = o.timeoutMinutes;
  if (given(o.pageCap)) out.page_cap = o.pageCap;
  return out;
}

// A group named by --gate replaces that group (acceptance and parity keep the single-object form
// when there is one entry). A null group (--clear-gates) returns to detection.
function gatesFor(existing: Obj, overrides: Record<string, Obj[] | null>): Obj {
  const gates: Obj = { ...section(existing.gates) };
  for (const [group, entries] of Object.entries(overrides)) {
    if (entries === null || entries.length === 0) {
      delete gates[group];
    } else {
      const single = (group === "acceptance" || group === "parity") && entries.length === 1;
      gates[group] = single ? entries[0] : entries;
    }
  }
  return gates;
}

// Values already in origin/<default>:autopilot.yaml are kept; a flag overrides its key; anything
// missing gets the default. repo, base_branch and dispatcher.prd_issue always come from GitHub.
export function generateCharter(inputs: CharterInputs, existingText: string | null): string {
  const parsed: unknown = existingText === null ? {} : Bun.YAML.parse(existingText);
  if (parsed !== null && parsed !== undefined && !isMap(parsed)) {
    throw new Error(`existing ${CHARTER_FILE} must be a mapping`);
  }
  const existing = section(parsed);
  const o = inputs.overrides;
  const keep = (key: string, fallback: Yaml): Yaml => (key in existing ? existing[key] : fallback);
  const references = o.references ?? stringList(existing.reference);
  const identities = section(existing.identities);
  const builder = section(identities.builder);
  const builderLogin = typeof builder.login === "string" && builder.login !== "" ? builder.login : inputs.login;
  const dispatcher = section(existing.dispatcher);
  // --reference-clear leaves no reference site, so parity has nothing to compare against.
  const parity = Array.isArray(o.references) && references.length === 0
    ? parityFor(false)
    : keep("parity_target", parityFor(references.length > 0));
  const doc: Obj = {
    version: 1,
    project: keep("project", slugOf(inputs.repo)),
    repo: inputs.repo,
    base_branch: inputs.baseBranch,
    reference: references,
    parity_target: parity,
    stack: keep("stack", "auto"),
    milestones: keep("milestones", ["M0", "M1", "M2", "M3"]),
    prd_approval: o.approval ?? keep("prd_approval", "human"),
    review_window_hours: keep("review_window_hours", 24),
    task_breakdown: o.breakdown ?? keep("task_breakdown", "upfront"),
    limits: { ...DEFAULT_LIMITS, ...section(existing.limits), ...limitOverrides(o) },
    tiers: {
      ...section(existing.tiers),
      first_attempt: o.firstAttempt ?? section(existing.tiers).first_attempt ?? "pro",
    },
    authority: authorityFor(existing, references.map(hostOf)),
    identities: {
      builder: { login: builderLogin },
      reviewer: o.reviewer !== undefined ? o.reviewer : "reviewer" in identities ? identities.reviewer : null,
    },
    dispatcher: {
      instance: o.instance ?? (typeof dispatcher.instance === "string" ? dispatcher.instance : inputs.defaultInstance),
      prd_issue: inputs.prdIssue,
    },
    capabilities: keep("capabilities", {}),
    gates: gatesFor(existing, o.gates ?? {}),
    preview: o.preview !== undefined ? o.preview : keep("preview", null),
    areas: o.areas ?? keep("areas", []),
    security_paths: keep("security_paths", securityPaths(inputs.lockfile)),
    protected: keep("protected", DEFAULT_PROTECTED),
    hooks: keep("hooks", DEFAULT_HOOKS),
    pause: keep("pause", PAUSE_TEXT),
    notify: keep("notify", ["github-issue"]),
  };
  // Keys the generator does not own are carried over, so parseCharter reports them rather than
  // setup silently dropping an owner's typo.
  for (const key of Object.keys(existing)) {
    if (!(key in doc)) doc[key] = existing[key];
  }
  return emitYaml(doc, CHARTER_HEADER);
}

// ---------------------------------------------------------------------------------------------
// Generated files: .zcode/config.json, the CI workflow, .gitignore, and the planner that decides
// which files a setup PR changes.
// ---------------------------------------------------------------------------------------------

const AUTOPILOT_STATUS = "autopilot policy";
const IGNORE_RULES = [".shipflow/", ".zflow/"];

function parseJsonObject(text: string, label: string): Obj {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new Error(`${label} is not valid JSON: ${messageOf(err)}`);
  }
  if (!isMap(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}

function isAutopilotEntry(entry: unknown): boolean {
  return isMap(entry) && listOf(entry.hooks).some((hook) => isMap(hook) && hook.statusMessage === AUTOPILOT_STATUS);
}

// Keeps every key of the existing config. Under hooks.events, only the entries that carry the
// autopilot status message are replaced by the template's entries; other hooks are untouched.
export function mergeZcodeConfig(existingText: string | null, hooksJsonText: string): string {
  const template = section(parseJsonObject(hooksJsonText, "hooks.json").hooks);
  const templateEvents = section(template.events);
  const config = existingText === null ? {} : parseJsonObject(existingText, CONFIG_FILE);
  if ("hooks" in config && !isMap(config.hooks)) throw new Error(`${CONFIG_FILE}: hooks must be an object`);
  const hooks: Obj = { ...section(config.hooks) };
  if ("events" in hooks && !isMap(hooks.events)) throw new Error(`${CONFIG_FILE}: hooks.events must be an object`);
  hooks.enabled = true;
  const events: Obj = { ...section(hooks.events) };
  for (const [event, entries] of Object.entries(templateEvents)) {
    const kept = listOf(events[event]).filter((entry) => !isAutopilotEntry(entry));
    events[event] = [...kept, ...listOf(entries)];
  }
  hooks.events = events;
  return `${JSON.stringify({ ...config, hooks }, null, 2)}\n`;
}

// The template's push trigger names main; setup points it at the repository's default branch.
export function ciWorkflowFor(templateText: string, branch: string): string {
  if (!REF_TEXT.test(branch) || branch.startsWith("-")) {
    throw new Error(`default branch ${branch} is not a plain ref name`);
  }
  const lines = templateText.split("\n");
  const hits = lines.flatMap((line, index) => (line.trimEnd() === "    branches: [main]" ? [index] : []));
  if (hits.length !== 1) throw new Error(`ci template needs one "    branches: [main]" line, found ${hits.length}`);
  lines[hits[0]] = `    branches: [${branch}]`;
  return lines.join("\n");
}

const ruleKey = (line: string): string => line.trim().replace(/^\/+/, "").replace(/\/+$/, "");

// Appends the autopilot ignore rules that are missing. Existing lines are never touched.
export function appendIgnores(text: string | null): string {
  const base = text ?? "";
  const present = new Set(base.split(/\r?\n/).map(ruleKey));
  const missing = IGNORE_RULES.filter((rule) => !present.has(ruleKey(rule)));
  if (missing.length === 0) return base;
  const lead = base === "" || base.endsWith("\n") ? base : `${base}\n`;
  return `${lead}${missing.join("\n")}\n`;
}

// The short machine name as a dispatcher instance id: lowercase, [a-z0-9-], at most 32 characters.
export function instanceFrom(name: string): string {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+/, "").slice(0, 32).replace(/-+$/, "");
  return cleaned === "" ? "owner" : cleaned;
}

export function repoFromRemote(url: string): string | null {
  const match = /github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/.exec(url.trim());
  if (match === null) return null;
  const repo = `${match[1]}/${match[2]}`;
  return REPO_RE.test(repo) ? repo : null;
}

export interface DesiredFile {
  path: string;
  content: string | Uint8Array;
}

export interface PlannedFile {
  path: string;
  content: Uint8Array;
  changed: boolean;
}

export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

// Compares each desired file with its current content (absent from `current` means new). Output is
// sorted by path, so the same inputs always produce the same plan.
export function planFiles(desired: DesiredFile[], current: Map<string, Uint8Array>): PlannedFile[] {
  const seen = new Set<string>();
  const sorted = [...desired].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return sorted.map((file) => {
    if (seen.has(file.path)) throw new Error(`planFiles: duplicate path ${file.path}`);
    seen.add(file.path);
    const content = typeof file.content === "string" ? new TextEncoder().encode(file.content) : file.content;
    const before = current.get(file.path);
    return { path: file.path, content, changed: before === undefined || !sameBytes(before, content) };
  });
}

// ---------------------------------------------------------------------------------------------
// Git. Setup runs only the commands in gitAllowed; the guard refuses everything else before a
// process starts (no reset, checkout, clean, stash, branch -D, force flags, or non-fast-forward
// pushes). Every command is an argv array, never a shell string.
// ---------------------------------------------------------------------------------------------

export interface GitResult {
  exitCode: number;
  stdout: string;
  stdoutBytes: Uint8Array;
  stderr: string;
}

export type GitRunner = (root: string, args: string[]) => GitResult;

const safeRef = (text: string | undefined): boolean =>
  text !== undefined && REF_TEXT.test(text) && !text.includes("..") && !text.startsWith("-");
const safePath = (text: string | undefined): boolean => text !== undefined && text !== "" && !text.startsWith("-");

export function gitAllowed(args: string[]): boolean {
  const [cmd, ...rest] = args;
  switch (cmd) {
    case "remote":
      return rest.join(" ") === "get-url origin";
    case "fetch":
      return rest.length === 2 && rest[0] === "origin" && safeRef(rest[1]);
    case "show":
      return rest.length === 1 && /^origin\/[A-Za-z0-9._/-]+:(?!-)[^\0\n]+$/.test(rest[0]);
    case "worktree": {
      const [sub, ...tail] = rest;
      if (sub === "add") {
        return tail.length === 4 && tail[0] === "-b" && safeRef(tail[1]) && safePath(tail[2])
          && tail[3].startsWith(ORIGIN) && safeRef(tail[3].slice(ORIGIN.length));
      }
      return sub === "remove" && tail.length === 1 && safePath(tail[0]);
    }
    case "add":
      return rest.length >= 2 && rest[0] === "--" && rest.slice(1).every((p) => safePath(p));
    case "commit":
      return rest.length === 2 && rest[0] === "-m" && rest[1] !== "";
    case "rev-parse":
      return rest.join(" ") === "HEAD" || rest.join(" ") === "--abbrev-ref HEAD";
    case "push": {
      const match = /^refs\/heads\/([A-Za-z0-9._/-]+):refs\/heads\/\1$/.exec(rest[1] ?? "");
      return rest.length === 2 && rest[0] === "origin" && match !== null && safeRef(match[1]);
    }
    case "ls-remote":
      return rest.length === 2 && rest[0] === "origin" && /^refs\/heads\/[A-Za-z0-9._/-]+$/.test(rest[1]);
    case "status":
      // --ignored: git merge overwrites ignored files without a warning, so they are checked too.
      return rest.join(" ") === "--porcelain -z" || rest.join(" ") === "--porcelain -z --ignored";
    case "merge":
      return rest.length === 2 && rest[0] === "--ff-only" && rest[1].startsWith(ORIGIN)
        && safeRef(rest[1].slice(ORIGIN.length));
    case "ls-tree":
      return rest.length === 3 && rest[0] === "-r" && rest[1] === "--name-only" && rest[2].startsWith(ORIGIN)
        && safeRef(rest[2].slice(ORIGIN.length));
    default:
      return false;
  }
}

export const realGit: GitRunner = (root, args) => {
  if (!gitAllowed(args)) throw new Error(`setup refuses git ${args.join(" ")}`);
  const proc = Bun.spawnSync(["git", "-C", root, ...args], {
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return {
    exitCode: proc.exitCode ?? 1,
    stdout: new TextDecoder().decode(proc.stdout),
    stdoutBytes: new Uint8Array(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
};

function gitOk(git: GitRunner, root: string, args: string[], label: string): GitResult {
  const result = git(root, args);
  if (result.exitCode !== 0) throw new SetupFailure(`${label} failed: ${firstLine(result.stderr)}`, 1);
  return result;
}

function repoFromOrigin(git: GitRunner, root: string): string {
  const result = git(root, ["remote", "get-url", "origin"]);
  if (result.exitCode !== 0) throw new SetupFailure("no origin remote; pass --gh-repo OWNER/NAME", 2);
  const repo = repoFromRemote(result.stdout);
  if (repo === null) throw new SetupFailure("origin is not a GitHub repository; pass --gh-repo OWNER/NAME", 2);
  return repo;
}

// The paths in origin/<branch>, as one set. Setup reads the remote tree, never the working copy.
function listRemote(git: GitRunner, root: string, branch: string): Set<string> {
  const listing = gitOk(git, root, ["ls-tree", "-r", "--name-only", `${ORIGIN}${branch}`], "git ls-tree");
  return new Set(listing.stdout.split("\n").filter((line) => line !== ""));
}

function remoteBytes(git: GitRunner, root: string, branch: string, remote: Set<string>, path: string): Uint8Array | null {
  if (!remote.has(path)) return null;
  return gitOk(git, root, ["show", `${ORIGIN}${branch}:${path}`], `git show ${path}`).stdoutBytes;
}

const decode = (bytes: Uint8Array | null): string | null => (bytes === null ? null : new TextDecoder().decode(bytes));

export interface HarnessFiles {
  files: string[];
  skipped: string[];
}

// Regular files under the installed harness directories of the owner's checkout. Symbolic links
// are reported as skipped, never followed.
export function walkHarness(root: string): HarnessFiles {
  const files: string[] = [];
  const skipped: string[] = [];
  const visit = (rel: string): void => {
    if (HARNESS_EXCLUDED.includes(rel)) return;
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    const stat = lstatSync(abs);
    if (stat.isSymbolicLink()) {
      skipped.push(rel);
    } else if (stat.isFile()) {
      files.push(rel);
    } else if (stat.isDirectory()) {
      for (const entry of readdirSync(abs).sort()) visit(`${rel}/${entry}`);
    }
  };
  for (const dir of HARNESS_DIRS) visit(dir);
  for (const file of HARNESS_FILES) visit(file);
  return { files: files.sort(), skipped: skipped.sort() };
}

// Parses `git status --porcelain -z --ignored`: untracked ("?? path") and ignored ("!! path")
// entries; a directory entry ends with "/". A rename or copy entry is followed by its original
// path, which is skipped.
export function untrackedFrom(porcelainZ: string): string[] {
  const parts = porcelainZ.split("\0");
  const found: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (entry.length < 4) continue;
    const code = entry.slice(0, 2);
    if (code === "??" || code === "!!") found.push(entry.slice(3));
    if (code.includes("R") || code.includes("C")) i++;
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// The setup run. Each step either records a warning or throws a SetupFailure, which ends the run
// with the report built so far. Dry-run performs every read and plans every write.
// ---------------------------------------------------------------------------------------------

export interface SetupDeps {
  world: World;
  // The loaded kit module; tests may inject one. Default: loadKit(world) on first use.
  kit?: KitModule;
  git: GitRunner;
  now: () => number;
  hostname: string;
}

export function defaultDeps(): SetupDeps {
  return {
    world: realWorld,
    git: realGit,
    now: () => Math.floor(Date.now() / 1000),
    hostname: hostname().split(".")[0],
  };
}

export interface SyncState {
  branch: string;
  oldHead: string;
  newHead: string | null;
  moved: string[];
  // Generated files whose differing local copy was accepted because regenerating from it
  // reproduces the merged version exactly.
  regenerated: string[];
  backup: string | null;
}

export interface RunState {
  dryRun: boolean;
  repo: string;
  login: string;
  defaultBranch: string;
  prdIssue: number;
  project: { number: number; url: string } | null;
  pr: { number: number; url: string } | null;
  merged: boolean;
  ruleset: string;
  labelsCreated: string[];
  milestonesCreated: string[];
  files: { status: string; paths: string[] };
  sync: SyncState | null;
  warnings: string[];
}

export interface SetupResult {
  exitCode: number;
  report: Record<string, unknown>;
}

type Kit = ReturnType<KitModule["makeGithubKit"]>;

const SETUP_LOGIN = "setup";
const SETUP_INSTANCE = "setup";
const RULESET_FILE = join(TEMPLATE_DIR, "ruleset-main.json");

function freshState(dryRun: boolean): RunState {
  return {
    dryRun,
    repo: "",
    login: "",
    defaultBranch: "",
    prdIssue: 0,
    project: null,
    pr: null,
    merged: false,
    ruleset: "skipped",
    labelsCreated: [],
    milestonesCreated: [],
    files: { status: "not planned", paths: [] },
    sync: null,
    warnings: [],
  };
}

function reportOf(opts: SetupOptions, st: RunState, ok: boolean, error: string | null): Record<string, unknown> {
  return {
    ok,
    error,
    mode: opts.syncCheckout ? "sync-checkout" : "apply",
    repo: st.repo,
    login: st.login,
    charter: CHARTER_FILE,
    prdIssue: st.prdIssue,
    project: st.project,
    pr: st.pr,
    merged: st.merged,
    ruleset: st.ruleset,
    labels: { created: st.labelsCreated },
    milestones: { created: st.milestonesCreated },
    files: st.files,
    sync: st.sync,
    warnings: st.warnings,
    dryRun: st.dryRun,
  };
}

export async function runSetup(opts: SetupOptions, deps: SetupDeps): Promise<SetupResult> {
  const st = freshState(opts.dryRun);
  try {
    if (opts.syncCheckout) await syncCheckout(opts, deps, st);
    else await applySetup(opts, deps, st);
    return { exitCode: 0, report: reportOf(opts, st, true, null) };
  } catch (err) {
    const exitCode = err instanceof SetupFailure ? err.exitCode : 1;
    return { exitCode, report: reportOf(opts, st, false, messageOf(err)) };
  }
}

// prdIssue is 0 until the PRD issue exists (the kit's "no PRD yet"), then the real number.
function makeKit(
  kitModule: KitModule,
  opts: SetupOptions,
  repo: string,
  login: string,
  requiredChecks: string[],
  prdIssue: number,
): Kit {
  return kitModule.makeGithubKit({
    repo,
    login,
    instance: SETUP_INSTANCE,
    prdIssue,
    dryRun: opts.dryRun,
    claimTtlSeconds: 7200,
    attemptCap: 4,
    requiredChecks,
    writeRoot: resolve(opts.root, ".zflow", "kit"),
    pollSeconds: 15,
    maxPolls: 120,
    assignee: "",
  });
}

function reasonOf(kit: Kit): string {
  const last = kit.findings[kit.findings.length - 1];
  return last === undefined ? "gh call failed" : `${last.what}: ${last.evidence}`;
}

function warnNames(st: RunState, what: string, names: string[]): void {
  if (names.length > 0) st.warnings.push(`WARN ${what}: ${names.join(", ")}`);
}

const readTemplate = (path: string): string => readFileSync(path, "utf8");

// The charter overrides a run's flags ask for. Flags that were not given stay null or undefined.
export function overridesOf(opts: SetupOptions): CharterOverrides {
  return {
    references: opts.references,
    approval: opts.approval,
    breakdown: opts.breakdown,
    lanes: opts.lanes,
    attempts: opts.attempts,
    timeoutMinutes: opts.timeoutMinutes,
    pageCap: opts.pageCap,
    firstAttempt: opts.firstAttempt,
    instance: opts.instance,
    gates: opts.gates,
    areas: opts.areas,
    preview: opts.preview,
    reviewer: opts.reviewer,
  };
}

function charterInputsFor(opts: SetupOptions, st: RunState, deps: SetupDeps, lockfile: string, prdIssue: number) {
  return {
    repo: st.repo,
    baseBranch: st.defaultBranch,
    login: st.login,
    prdIssue,
    lockfile,
    defaultInstance: instanceFrom(deps.hostname),
    overrides: overridesOf(opts),
  };
}

// Read-only. The kit has no member that lists rulesets, and setup needs the answer before it
// decides whether the setup PR may merge with required checks.
async function autopilotRulesetExists(world: World, repo: string, name: string, st: RunState): Promise<boolean> {
  const listed = await world.run("gh", ["api", `repos/${repo}/rulesets`], { timeoutMs: 120000 });
  if (listed.exitCode !== 0) {
    st.warnings.push(`WARN rulesets not readable (${firstLine(listed.stderr)}); assuming no ${name} ruleset`);
    return false;
  }
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(listed.stdout);
  } catch {
    st.warnings.push(`WARN rulesets reply is not JSON; assuming no ${name} ruleset`);
  }
  return listOf(parsed).some((ruleset) => isMap(ruleset) && ruleset.name === name);
}

async function applySetup(opts: SetupOptions, deps: SetupDeps, st: RunState): Promise<void> {
  // Checked before any GitHub call: a reviewer key that others can read is refused (exit 2).
  if (opts.reviewer) {
    const problem = reviewerKeyProblem(String(opts.reviewer.key_path));
    if (problem !== null) throw new SetupFailure(problem, 2);
  }
  const kitModule = deps.kit ?? loadKit(deps.world);
  const repo = opts.ghRepo ?? repoFromOrigin(deps.git, opts.root);
  st.repo = repo;

  // Step 1: identity and repository facts. Setup needs admin access (the proxy for the rights it
  // uses: rulesets, Project and the merge); the kit does not report push permission.
  const probe = makeKit(kitModule, opts, repo, SETUP_LOGIN, [], 0);
  const who = await probe.whoami();
  if (!who.ok) throw new SetupFailure("gh is not authenticated; run gh auth login as the repository owner", 2);
  const info = await probe.repoInfo();
  if (!info.ok) throw new SetupFailure(`gh cannot read ${repo}; check the name and your access`, 2);
  if (!info.admin) throw new SetupFailure(`${who.login} has no admin access to ${repo}; run setup as the owner`, 2);
  if (!safeRef(info.defaultBranch)) {
    throw new SetupFailure(`default branch ${info.defaultBranch} is not a plain ref name`, 2);
  }
  st.login = who.login;
  st.defaultBranch = info.defaultBranch;
  const kitFor = (requiredChecks: string[], prdIssue: number): Kit =>
    makeKit(kitModule, opts, repo, who.login, requiredChecks, prdIssue);
  const rulesetPayload = parseJsonObject(readTemplate(RULESET_FILE), "ruleset-main.json");
  const rulesetExists = await autopilotRulesetExists(deps.world, repo, String(rulesetPayload.name), st);

  // Step 2: the charter, from origin/<default> when it already exists, otherwise generated.
  gitOk(deps.git, opts.root, ["fetch", "origin", st.defaultBranch], `git fetch origin ${st.defaultBranch}`);
  const remote = listRemote(deps.git, opts.root, st.defaultBranch);
  const existingCharter = decode(remoteBytes(deps.git, opts.root, st.defaultBranch, remote, CHARTER_FILE));
  if (existingCharter !== null) {
    const previous = parseCharter(existingCharter).charter?.identities.builder.login;
    if (previous !== undefined && previous !== who.login) {
      st.warnings.push(`WARN builder login ${previous} kept; gh login is ${who.login}`);
    }
  }
  const lockfile = LOCKFILES.find((name) => remote.has(name) || existsSync(join(opts.root, name))) ?? "";
  const generate = (prdIssue: number): string =>
    generateCharter(charterInputsFor(opts, st, deps, lockfile, prdIssue), existingCharter);
  const first = parseCharter(generate(0));
  if (first.charter === null) {
    throw new SetupFailure(`generated ${CHARTER_FILE} is invalid: ${first.errors.join("; ")}`, 1);
  }

  // Step 3: GitHub objects through the kit. The PRD number feeds the charter, so the charter text
  // is generated again once it is known.
  const kit = kitFor([], 0);
  const prdIssue = await githubObjects(kit, kitModule, st, first.charter, info.ownerLogin, opts.projectTitle);
  st.prdIssue = prdIssue;
  const charterText = generate(prdIssue);
  const final = parseCharter(charterText);
  if (final.charter === null) {
    throw new SetupFailure(`generated ${CHARTER_FILE} is invalid: ${final.errors.join("; ")}`, 1);
  }

  // Step 4: the setup PR. Step 5: the ruleset. Both run with the PRD number now known.
  await publishFiles(opts, deps, st, kitFor, remote, charterText, final.charter, rulesetExists);
  await applyRuleset(kitFor([], prdIssue), opts, st, final.charter, rulesetPayload);
}

// Step 3: labels, milestones, the PRD issue (found by kind:prd and machine id PRD, else created and
// pinned), and the GitHub Project. A Project failure is a warning; the other failures are fatal.
async function githubObjects(
  kit: Kit,
  kitModule: KitModule,
  st: RunState,
  charter: Charter,
  owner: string,
  projectTitle: string | null,
): Promise<number> {
  const labels = await kit.ensureLabels([]);
  st.labelsCreated = labels.created;
  warnNames(st, "labels not created", labels.failed);
  const milestones = await kit.ensureMilestones(charter.milestones);
  st.milestonesCreated = milestones.created;
  warnNames(st, "milestones not created", milestones.failed);

  const prdNumber = await ensurePrdIssue(kit, kitModule, charter.project);
  if (prdNumber > 0) {
    const pinned = await kit.pinIssue(prdNumber);
    if (pinned.outcome === "failed") st.warnings.push(`WARN PRD issue #${prdNumber} not pinned`);
  }

  const title = projectTitle ?? charter.project;
  const project = await kit.projectEnsure(owner, title);
  if (project.outcome === "failed") {
    st.warnings.push(`WARN project ${reasonOf(kit)}; publication will report partial`);
  } else if (project.number > 0 && (project.outcome === "found" || project.outcome === "created")) {
    st.project = { number: project.number, url: project.url };
    if (prdNumber > 0) {
      const added = await kit.projectAdd(owner, project.number, [prdNumber]);
      if (added.failed.length > 0) st.warnings.push(`WARN project item for #${prdNumber} not added`);
    }
  }
  return prdNumber;
}

async function ensurePrdIssue(kit: Kit, kitModule: KitModule, project: string): Promise<number> {
  const listed = await kit.listIssues("open");
  if (!listed.ok) throw new SetupFailure("cannot list open issues to find the PRD issue", 1);
  const existing = listed.issues.find(
    (issue: { labels: string[]; body: string }) =>
      issue.labels.includes("kind:prd") && kitModule.kitParseMachineBlock(issue.body).block?.id === "PRD",
  );
  if (existing !== undefined) return existing.number;
  const block = kitModule.kitRenderMachineBlock({
    id: "PRD", kind: "prd", parent: "", prd: "", prd_hash: "", area: [], depends_on: [], satisfies: [],
    tests: [], size: "", milestone: "", budget: null,
  });
  const body = `${block}\n\nPRD issue for ${project}. The autopilot:paused label on this issue pauses every run; `
    + "the kickoff:* label records the kickoff stage. Setup keeps this issue pinned.\n";
  const created = await kit.createIssue({
    title: `[PRD] ${project}`, body, labels: ["kind:prd", "kickoff:S1"], milestone: "", parent: 0, blockedBy: [],
  });
  if (created.outcome === "failed") throw new SetupFailure("creating the PRD issue failed", 1);
  return created.number;
}

// The files a setup PR can change, each with its desired content. Existing content comes from
// origin/<default>, so a re-run over merged output plans no change.
function desiredFiles(opts: SetupOptions, deps: SetupDeps, st: RunState, remote: Set<string>, charterText: string): DesiredFile[] {
  const text = (path: string): string | null => decode(remoteBytes(deps.git, opts.root, st.defaultBranch, remote, path));
  const ci = ciWorkflowFor(readTemplate(join(TEMPLATE_DIR, "ci.yml")), st.defaultBranch);
  const hooks = readTemplate(HOOKS_FILE);
  const harness = walkHarness(opts.root);
  for (const path of harness.skipped) st.warnings.push(`WARN skipped symbolic link ${path}`);
  return [
    { path: CHARTER_FILE, content: charterText },
    { path: CI_FILE, content: ci },
    { path: GITIGNORE_FILE, content: appendIgnores(text(GITIGNORE_FILE)) },
    { path: CONFIG_FILE, content: mergeZcodeConfig(text(CONFIG_FILE), hooks) },
    ...harness.files.map((path) => ({ path, content: readFileSync(join(opts.root, path)) })),
  ];
}

function prBody(paths: string[]): string {
  return ["Generated by shipflow setup. Files changed:", ...paths.map((path) => `- ${path}`)].join("\n");
}

function removeWorktree(git: GitRunner, root: string, worktree: string, st: RunState): void {
  if (!existsSync(worktree)) return;
  const removed = git(root, ["worktree", "remove", worktree]);
  if (removed.exitCode !== 0) st.warnings.push(`WARN worktree ${worktree} kept: ${firstLine(removed.stderr)}`);
}

// Step 4. Dry-run and an up-to-date checkout stop after planning. Otherwise: a new wf/setup-<s>
// branch in a worktree, one commit with the changed paths, a push (no force), an ls-remote check,
// the PR, and the merge. The worktree is removed afterwards (no force).
async function publishFiles(
  opts: SetupOptions,
  deps: SetupDeps,
  st: RunState,
  kitFor: (requiredChecks: string[], prdIssue: number) => Kit,
  remote: Set<string>,
  charterText: string,
  charter: Charter,
  rulesetExists: boolean,
): Promise<void> {
  const branch = st.defaultBranch;
  const desired = desiredFiles(opts, deps, st, remote, charterText);
  const current = new Map<string, Uint8Array>();
  for (const file of desired) {
    const bytes = remoteBytes(deps.git, opts.root, branch, remote, file.path);
    if (bytes !== null) current.set(file.path, bytes);
  }
  const changed = planFiles(desired, current).filter((file) => file.changed);
  if (changed.length === 0) {
    st.files = { status: "up to date", paths: [] };
    return;
  }
  st.files = { status: st.dryRun ? "planned" : "changed", paths: changed.map((file) => file.path) };
  if (st.dryRun) return;

  const stamp = deps.now();
  const branchName = `wf/setup-${stamp}`;
  const worktree = join(opts.root, ".zflow", "worktrees", `setup-${stamp}`);
  gitOk(deps.git, opts.root, ["worktree", "add", "-b", branchName, worktree, `${ORIGIN}${branch}`], "git worktree add");
  try {
    for (const file of changed) {
      const target = join(worktree, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.content);
    }
    gitOk(deps.git, worktree, ["add", "--", ...changed.map((file) => file.path)], "git add");
    gitOk(deps.git, worktree, ["commit", "-m", "chore(autopilot): setup"], "git commit");
    const sha = gitOk(deps.git, worktree, ["rev-parse", "HEAD"], "git rev-parse").stdout.trim();
    gitOk(deps.git, worktree, ["push", "origin", `refs/heads/${branchName}:refs/heads/${branchName}`], "git push");
    const remoteSha = gitOk(deps.git, opts.root, ["ls-remote", "origin", `refs/heads/${branchName}`], "git ls-remote")
      .stdout.split(/\s+/)[0];
    if (remoteSha !== sha) throw new SetupFailure(`origin/${branchName} is not at the local commit`, 1);

    const pr = await kitFor([], st.prdIssue).openPr({
      head: branchName, base: branch, title: "[Setup] autopilot", body: prBody(changed.map((file) => file.path)), draft: false,
    });
    if (pr.outcome === "failed") throw new SetupFailure("opening the setup PR failed", 1);
    st.pr = { number: pr.number, url: pr.url };

    // With the ruleset in place, its required checks must pass on the setup PR too. ai-review is
    // the owner's commit status (D17), posted here because the owner asked for this setup.
    const mergeKit = kitFor(rulesetExists ? charter.authority.merge.requires : [], st.prdIssue);
    // The ai-review status is posted on the reviewed head and again on every head that an
    // update-branch produces, so the required check stays satisfied on the commit being merged.
    const postAiReview = async (target: string): Promise<boolean> => {
      const status = await mergeKit.postStatus(target, {
        context: "ai-review", state: "success", description: "owner-requested setup",
      });
      return status.outcome === "done";
    };
    if (rulesetExists && !(await postAiReview(sha))) {
      throw new SetupFailure("posting the ai-review status failed", 1);
    }
    const train = await mergeKit.mergeTrain(pr.number, {
      reviewedSha: sha,
      base: branch,
      maxUpdates: 3,
      requireApproval: false,
      onRepin: rulesetExists ? postAiReview : null,
    });
    if (train.outcome !== "merged") {
      throw new SetupFailure(`setup PR #${pr.number} not merged (${train.outcome}): ${train.reason}`, 1);
    }
    st.merged = true;
  } finally {
    removeWorktree(deps.git, opts.root, worktree, st);
  }
}

// Step 5. The payload is the ruleset template; with a reviewer identity, its ai-review check is
// bound to the App id, as GitHub expects for an App-posted check.
async function applyRuleset(kit: Kit, opts: SetupOptions, st: RunState, charter: Charter, payload: Obj): Promise<void> {
  if (opts.noRuleset) {
    st.ruleset = "skipped";
    return;
  }
  const reviewer = charter.identities.reviewer;
  const body = structuredClone(payload) as Obj;
  if (reviewer !== null && reviewer !== undefined) {
    for (const rule of listOf(body.rules)) {
      if (!isMap(rule) || rule.type !== "required_status_checks" || !isMap(rule.parameters)) continue;
      for (const check of listOf(rule.parameters.required_status_checks)) {
        if (isMap(check) && check.context === "ai-review") check.integration_id = Number(reviewer.app_id);
      }
    }
  }
  const result = await kit.ensureRuleset(body);
  st.ruleset = result.outcome;
  if (result.outcome === "failed") st.warnings.push(`WARN ruleset ${reasonOf(kit)}`);
}

// ---------------------------------------------------------------------------------------------
// --sync-checkout: brings the owner's checkout to origin/<default> after a merged setup. Untracked
// files that the fast-forward would overwrite must be byte-identical to the merged version; they
// move (rename, nothing deleted) into .zflow/setup-backup/<s>/ and move back if the merge fails.
// ---------------------------------------------------------------------------------------------

const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

// The two generated files that setup derives from the owner's local copy. A differing local copy is
// acceptable only when regenerating from it reproduces the merged version byte for byte; every
// other file, and any local copy that regenerates differently, is refused.
export function regeneratesMerged(path: string, local: Uint8Array, merged: Uint8Array, hooksJsonText: string): boolean {
  const text = new TextDecoder().decode(local);
  let regenerated: string;
  try {
    if (path === CONFIG_FILE) regenerated = mergeZcodeConfig(text, hooksJsonText);
    else if (path === GITIGNORE_FILE) regenerated = appendIgnores(text);
    else return false;
  } catch {
    return false;
  }
  return sameBytes(new TextEncoder().encode(regenerated), merged);
}

async function syncCheckout(opts: SetupOptions, deps: SetupDeps, st: RunState): Promise<void> {
  const kitModule = deps.kit ?? loadKit(deps.world);
  const repo = opts.ghRepo ?? repoFromOrigin(deps.git, opts.root);
  st.repo = repo;
  const info = await makeKit(kitModule, opts, repo, SETUP_LOGIN, [], 0).repoInfo();
  if (!info.ok) throw new SetupFailure(`gh cannot read ${repo}; check the name and your access`, 2);
  const branch = info.defaultBranch;
  if (!safeRef(branch)) throw new SetupFailure(`default branch ${branch} is not a plain ref name`, 2);
  st.defaultBranch = branch;

  gitOk(deps.git, opts.root, ["fetch", "origin", branch], `git fetch origin ${branch}`);
  const onBranch = gitOk(deps.git, opts.root, ["rev-parse", "--abbrev-ref", "HEAD"], "git rev-parse").stdout.trim();
  if (onBranch !== branch) {
    throw new SetupFailure(`checkout is on ${onBranch}, not ${branch}; switch to ${branch} first`, 1);
  }
  const oldHead = gitOk(deps.git, opts.root, ["rev-parse", "HEAD"], "git rev-parse").stdout.trim();
  const remote = listRemote(deps.git, opts.root, branch);
  const status = gitOk(deps.git, opts.root, ["status", "--porcelain", "-z", "--ignored"], "git status").stdout;
  const untracked = untrackedFrom(status);
  const candidates = [...remote]
    .filter((path) => untracked.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry)))
    .filter((path) => existsSync(join(opts.root, path)))
    .sort();

  const differing: string[] = [];
  const regenerated: string[] = [];
  const hooksText = readTemplate(HOOKS_FILE);
  for (const path of candidates) {
    if (!lstatSync(join(opts.root, path)).isFile()) {
      differing.push(path);
      continue;
    }
    const merged = gitOk(deps.git, opts.root, ["show", `${ORIGIN}${branch}:${path}`], `git show ${path}`).stdoutBytes;
    const local = readFileSync(join(opts.root, path));
    if (digest(local) === digest(merged)) continue;
    if (regeneratesMerged(path, local, merged, hooksText)) regenerated.push(path);
    else differing.push(path);
  }
  if (differing.length > 0) {
    throw new SetupFailure(
      `refusing: untracked files differ from origin/${branch} (${differing.join(", ")}); move them by hand`,
      1,
    );
  }

  const backup = candidates.length > 0 ? join(opts.root, ".zflow", "setup-backup", String(deps.now())) : null;
  st.sync = { branch, oldHead, newHead: null, moved: candidates, regenerated, backup };
  if (opts.dryRun) return;

  const moved: string[] = [];
  for (const path of candidates) {
    const target = join(backup as string, path);
    mkdirSync(dirname(target), { recursive: true });
    renameSync(join(opts.root, path), target);
    moved.push(path);
  }
  const ff = deps.git(opts.root, ["merge", "--ff-only", `${ORIGIN}${branch}`]);
  if (ff.exitCode !== 0) {
    for (const path of [...moved].reverse()) renameSync(join(backup as string, path), join(opts.root, path));
    throw new SetupFailure(`fast-forward to origin/${branch} failed; local files restored: ${firstLine(ff.stderr)}`, 1);
  }
  st.sync.newHead = gitOk(deps.git, opts.root, ["rev-parse", "HEAD"], "git rev-parse").stdout.trim();
}

export async function main(argv: string[], deps: SetupDeps = defaultDeps()): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`setup: ${parsed.message}\n${USAGE}`);
    return 2;
  }
  const result = await runSetup(parsed.options, deps);
  process.stdout.write(`${JSON.stringify(result.report)}\n`);
  if (typeof result.report.error === "string") process.stderr.write(`setup: ${result.report.error}\n`);
  return result.exitCode;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
