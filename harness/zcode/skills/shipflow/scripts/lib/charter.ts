import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

interface GateEntry {
  name: string;
  tool: string;
  args: string[];
  timeout_minutes: number;
}

export interface Charter {
  version: 1;
  project: string;
  repo: string;
  base_branch: string;
  reference: string[];
  parity_target: { structure: boolean; layout: boolean; interactions: boolean; brand: boolean; content: boolean };
  stack: string;
  milestones: string[];
  prd_approval: "auto" | "window" | "human";
  review_window_hours: number;
  task_breakdown: "rolling" | "upfront";
  limits: {
    max_parallel_lanes: number;
    task_attempts: number;
    task_timeout_minutes: number;
    wall_clock_days: number;
    page_cap: number;
  };
  tiers: { first_attempt: "pro" | "flash" };
  authority: {
    push: string[];
    merge: { method: string; via: string[]; requires: string[] };
    github: string[];
    deploy: string;
    network_allow: string[];
  };
  identities: {
    builder: { login: string };
    // null: ai-review is a commit status posted through the kit; an object: the optional reviewer App.
    reviewer: { app_id: string; installation_id: string; key_path: string } | null;
  };
  dispatcher: { instance: string; prd_issue: number };
  // {} declares no capabilities; otherwise all three keys are required.
  capabilities: Record<string, never> | { oauth_github: string; email_smtp: string; database: string };
  // An absent or empty gate is detected at run time; a present entry is used as written.
  gates: {
    l1?: GateEntry[];
    unit?: GateEntry[];
    // Either form; the example writes acceptance and parity as one entry.
    acceptance?: GateEntry | GateEntry[];
    parity?: GateEntry | GateEntry[];
  };
  // null: the preview command is detected at run time.
  preview: { tool: string; args: string[]; timeout_minutes: number } | null;
  // []: areas are detected at run time.
  areas: { prefix: string; specialist: string; ui: boolean }[];
  security_paths: string[];
  protected: { prefix: string; agents: string; branches: string }[];
  hooks: { log: string; deny_agent_gh_writes: boolean; auto_approve_tools: string[] };
  pause: string;
  notify: string[];
}

const TOP_KEYS = [
  "version", "project", "repo", "base_branch", "reference", "parity_target", "stack", "milestones",
  "prd_approval", "review_window_hours", "task_breakdown", "limits", "tiers", "authority",
  "identities", "dispatcher", "capabilities", "gates", "preview", "areas", "security_paths",
  "protected", "hooks", "pause", "notify",
];
const PARITY_KEYS = ["structure", "layout", "interactions", "brand", "content"];
const LIMIT_KEYS = [
  "max_parallel_lanes", "task_attempts", "task_timeout_minutes",
  "wall_clock_days", "page_cap",
];
const AUTHORITY_KEYS = ["push", "merge", "github", "deploy", "network_allow"];
const MERGE_KEYS = ["method", "via", "requires"];
const REVIEWER_KEYS = ["app_id", "installation_id", "key_path"];
const GATE_KEYS = ["name", "tool", "args", "timeout_minutes"];
const PREVIEW_KEYS = ["tool", "args", "timeout_minutes"];
const AREA_KEYS = ["prefix", "specialist", "ui"];
const PROTECTED_KEYS = ["prefix", "agents", "branches"];
const HOOK_KEYS = ["log", "deny_agent_gh_writes", "auto_approve_tools"];

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PROJECT = /^[a-z0-9-]+$/;
const MILESTONE = /^M\d+$/;
const SPECIALIST = /^z-[a-z0-9-]+$/;

type Obj = Record<string, unknown>;
type Check = (v: unknown) => boolean;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isTextList = (v: unknown): boolean => Array.isArray(v) && v.every(isText);
const isNonEmptyTextList = (v: unknown): boolean => isTextList(v) && (v as unknown[]).length > 0;
const isNonEmptyArray = (v: unknown): boolean => Array.isArray(v) && v.length > 0;
const isPositive = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v) && v > 0;
const isNonNegativeInteger = (v: unknown): boolean => Number.isInteger(v) && (v as number) >= 0;
const isBool = (v: unknown): boolean => typeof v === "boolean";
const isDigits = (v: unknown): boolean => typeof v === "string" && /^\d+$/.test(v);
const oneOf = (...allowed: string[]) => (v: unknown): boolean => typeof v === "string" && allowed.includes(v);
const matches = (re: RegExp) => (v: unknown): boolean => typeof v === "string" && re.test(v);

function keyPath(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Reports a non-mapping and any key outside `keys`; returns the mapping, or null when it is not one.
function mapping(v: unknown, path: string, keys: string[], errs: string[]): Obj | null {
  if (!isObj(v)) {
    errs.push(`${path || "charter"}: must be a mapping`);
    return null;
  }
  for (const key of Object.keys(v)) {
    if (!keys.includes(key)) {
      errs.push(path === "" ? `${key}: unknown top-level key` : `${keyPath(path, key)}: unknown key`);
    }
  }
  return v;
}

// Runs `check` on o[key], or reports the key as required when it is absent.
function at(o: Obj, path: string, key: string, check: (v: unknown, p: string) => void, errs: string[]): void {
  const p = keyPath(path, key);
  if (key in o) check(o[key], p);
  else errs.push(`${p}: required`);
}

function field(o: Obj, path: string, key: string, ok: Check, want: string, errs: string[]): void {
  at(o, path, key, (v, p) => {
    if (!ok(v)) errs.push(`${p}: ${want}`);
  }, errs);
}

function section(
  o: Obj,
  path: string,
  key: string,
  keys: string[],
  fill: (m: Obj, p: string) => void,
  errs: string[],
): void {
  at(o, path, key, (v, p) => {
    const m = mapping(v, p, keys, errs);
    if (m) fill(m, p);
  }, errs);
}

function list(o: Obj, path: string, key: string, each: (item: unknown, p: string) => void, errs: string[]): void {
  at(o, path, key, (v, p) => {
    if (!Array.isArray(v)) {
      errs.push(`${p}: must be a list`);
      return;
    }
    v.forEach((item, i) => each(item, `${p}[${i}]`));
  }, errs);
}

// A command run as argv with a timeout: a gate entry (named) or the preview command (unnamed).
function checkCommand(v: unknown, p: string, named: boolean, errs: string[]): void {
  const m = mapping(v, p, named ? GATE_KEYS : PREVIEW_KEYS, errs);
  if (!m) return;
  if (named) field(m, p, "name", isText, "must be a non-empty string", errs);
  field(m, p, "tool", isText, "must be a non-empty string", errs);
  field(m, p, "args", isTextList, "must be a list of strings", errs);
  field(m, p, "timeout_minutes", isPositive, "must be a positive number", errs);
}

function checkRegex(m: Obj, p: string, key: string, errs: string[]): void {
  at(m, p, key, (v, vp) => {
    if (!isText(v)) {
      errs.push(`${vp}: must be a non-empty regex string`);
      return;
    }
    try {
      new RegExp(v);
    } catch (err) {
      errs.push(`${vp}: invalid regex: ${errorMessage(err)}`);
    }
  }, errs);
}

function validate(doc: unknown): string[] {
  const errs: string[] = [];
  const root = mapping(doc, "", TOP_KEYS, errs);
  if (!root) return errs;

  field(root, "", "version", (v) => v === 1, "must be 1", errs);
  field(root, "", "project", matches(PROJECT), "must match [a-z0-9-]+", errs);
  field(root, "", "repo", matches(REPO), "must be OWNER/NAME", errs);
  field(root, "", "base_branch", isText, "must be a non-empty string", errs);
  field(root, "", "reference", isTextList, "must be a list of strings", errs);
  section(root, "", "parity_target", PARITY_KEYS, (m, p) => {
    for (const key of PARITY_KEYS) field(m, p, key, isBool, "must be true or false", errs);
  }, errs);
  field(root, "", "stack", isText, "must be a non-empty string", errs);
  at(root, "", "milestones", (v, p) => {
    if (!isNonEmptyArray(v)) {
      errs.push(`${p}: must be a non-empty list of M<n>`);
      return;
    }
    (v as unknown[]).forEach((m, i) => {
      if (typeof m !== "string" || !MILESTONE.test(m)) errs.push(`${p}[${i}]: must match M<n>`);
    });
  }, errs);
  field(root, "", "prd_approval", oneOf("auto", "window", "human"), "must be auto, window or human", errs);
  field(root, "", "review_window_hours", isPositive, "must be a positive number", errs);
  field(root, "", "task_breakdown", oneOf("rolling", "upfront"), "must be rolling or upfront", errs);
  section(root, "", "limits", LIMIT_KEYS, (m, p) => {
    for (const key of LIMIT_KEYS) field(m, p, key, isPositive, "must be a positive number", errs);
  }, errs);
  section(root, "", "tiers", ["first_attempt"], (m, p) => {
    field(m, p, "first_attempt", oneOf("pro", "flash"), "must be pro or flash", errs);
  }, errs);
  section(root, "", "authority", AUTHORITY_KEYS, (m, p) => {
    field(m, p, "push", isTextList, "must be a list of strings", errs);
    section(m, p, "merge", MERGE_KEYS, (merge, mp) => {
      field(merge, mp, "method", isText, "must be a non-empty string", errs);
      field(merge, mp, "via", isTextList, "must be a list of strings", errs);
      field(merge, mp, "requires", isNonEmptyTextList, "must be a non-empty list of strings", errs);
    }, errs);
    field(m, p, "github", isTextList, "must be a list of strings", errs);
    field(m, p, "deploy", isText, "must be a non-empty string", errs);
    field(m, p, "network_allow", isTextList, "must be a list of strings", errs);
  }, errs);
  section(root, "", "identities", ["builder", "reviewer"], (m, p) => {
    section(m, p, "builder", ["login"], (b, bp) => {
      field(b, bp, "login", isText, "must be a non-empty string", errs);
    }, errs);
    // The key is required; its value is null (no reviewer App) or a reviewer object validated in full.
    at(m, p, "reviewer", (v, rp) => {
      if (v === null) return;
      const r = mapping(v, rp, REVIEWER_KEYS, errs);
      if (!r) return;
      field(r, rp, "app_id", isDigits, "must be a quoted string of digits", errs);
      field(r, rp, "installation_id", isDigits, "must be a quoted string of digits", errs);
      field(r, rp, "key_path", isText, "must be a non-empty string", errs);
    }, errs);
  }, errs);
  section(root, "", "dispatcher", ["instance", "prd_issue"], (m, p) => {
    field(m, p, "instance", isText, "must be a non-empty string", errs);
    field(m, p, "prd_issue", isNonNegativeInteger, "must be a non-negative integer", errs);
  }, errs);
  section(root, "", "capabilities", ["oauth_github", "email_smtp", "database"], (m, p) => {
    if (Object.keys(m).length === 0) return;
    for (const key of ["oauth_github", "email_smtp", "database"]) {
      field(m, p, key, isText, "must be a non-empty string", errs);
    }
  }, errs);
  // Each gate key may be absent (detected at run time); a present key is validated as before.
  section(root, "", "gates", ["l1", "unit", "acceptance", "parity"], (m, p) => {
    if ("l1" in m) list(m, p, "l1", (item, ip) => checkCommand(item, ip, true, errs), errs);
    if ("unit" in m) list(m, p, "unit", (item, ip) => checkCommand(item, ip, true, errs), errs);
    for (const key of ["acceptance", "parity"]) {
      if (!(key in m)) continue;
      at(m, p, key, (v, vp) => {
        if (Array.isArray(v)) v.forEach((item, i) => checkCommand(item, `${vp}[${i}]`, true, errs));
        else checkCommand(v, vp, true, errs);
      }, errs);
    }
  }, errs);
  // The key is required; null means the preview command is detected at run time.
  at(root, "", "preview", (v, p) => {
    if (v !== null) checkCommand(v, p, false, errs);
  }, errs);
  list(root, "", "areas", (item, p) => {
    const m = mapping(item, p, AREA_KEYS, errs);
    if (!m) return;
    field(m, p, "prefix", isText, "must be a non-empty string", errs);
    field(m, p, "specialist", matches(SPECIALIST), "must match ^z-[a-z0-9-]+$", errs);
    field(m, p, "ui", isBool, "must be true or false", errs);
  }, errs);
  field(root, "", "security_paths", isTextList, "must be a list of strings", errs);
  list(root, "", "protected", (item, p) => {
    const m = mapping(item, p, PROTECTED_KEYS, errs);
    if (!m) return;
    field(m, p, "prefix", isText, "must be a non-empty string", errs);
    checkRegex(m, p, "agents", errs);
    checkRegex(m, p, "branches", errs);
  }, errs);
  section(root, "", "hooks", HOOK_KEYS, (m, p) => {
    field(m, p, "log", isText, "must be a non-empty string", errs);
    field(m, p, "deny_agent_gh_writes", isBool, "must be true or false", errs);
    field(m, p, "auto_approve_tools", isTextList, "must be a list of strings", errs);
  }, errs);
  field(root, "", "pause", isText, "must be a non-empty string", errs);
  field(root, "", "notify", isTextList, "must be a list of strings", errs);
  return errs;
}

export function parseCharter(text: string): { charter: Charter | null; errors: string[] } {
  let doc: unknown;
  try {
    doc = Bun.YAML.parse(text);
  } catch (err) {
    return { charter: null, errors: [`charter: invalid YAML: ${errorMessage(err)}`] };
  }
  const errors = validate(doc);
  return errors.length === 0 ? { charter: doc as Charter, errors } : { charter: null, errors };
}

export function loadCharter(path: string): { charter: Charter | null; errors: string[] } {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    return { charter: null, errors: [`charter: cannot read ${path}: ${errorMessage(err)}`] };
  }
  return parseCharter(text);
}

// Expands a leading "~" or "~/" to the home directory; other paths are returned unchanged.
export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

// The area with the longest prefix that the path starts with, or null when none matches.
export function areaFor(
  charter: Charter,
  path: string,
): { prefix: string; specialist: string; ui: boolean } | null {
  let best: Charter["areas"][number] | null = null;
  for (const area of charter.areas) {
    if (path.startsWith(area.prefix) && (best === null || area.prefix.length > best.prefix.length)) best = area;
  }
  return best === null ? null : { prefix: best.prefix, specialist: best.specialist, ui: best.ui };
}

// The protected rule with the longest prefix that the path starts with, with its regexes compiled.
export function protectedRule(
  charter: Charter,
  path: string,
): { prefix: string; agents: RegExp; branches: RegExp } | null {
  let best: Charter["protected"][number] | null = null;
  for (const rule of charter.protected) {
    if (path.startsWith(rule.prefix) && (best === null || rule.prefix.length > best.prefix.length)) best = rule;
  }
  return best === null
    ? null
    : { prefix: best.prefix, agents: new RegExp(best.agents), branches: new RegExp(best.branches) };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Each authority.push pattern is anchored; "*" is the only wildcard and matches any characters,
// including "/".
export function matchesPushPattern(charter: Charter, ref: string): boolean {
  return charter.authority.push.some((glob) => {
    const body = glob.split("*").map(escapeRegExp).join("[\\s\\S]*");
    return new RegExp(`^${body}$`).test(ref);
  });
}
