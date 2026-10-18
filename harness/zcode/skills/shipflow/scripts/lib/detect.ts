// Run-time detection of gate commands, the preview command and areas from a project's manifests.
// Every function here only reads files under `root`. effectiveSettings lets a non-empty charter
// value win per group and fills every other group from detection.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Charter } from "./charter.ts";

export interface GateEntry {
  name: string;
  tool: string;
  args: string[];
  timeout_minutes: number;
}

export interface Command {
  tool: string;
  args: string[];
  timeout_minutes: number;
}

export interface DetectedGates {
  l1: GateEntry[];
  unit: GateEntry[];
  acceptance: GateEntry | null;
  parity: GateEntry | null;
  sources: string[];
}

export interface DetectedArea {
  prefix: string;
  specialist: string;
  ui: boolean;
  source: string;
}

// The charter allows acceptance and parity to be one entry or a list, so the effective form is a list.
export interface EffectiveGates {
  l1: GateEntry[];
  unit: GateEntry[];
  acceptance: GateEntry[];
  parity: GateEntry[];
  sources: string[];
}

export interface EffectiveSettings {
  gates: EffectiveGates;
  preview: Command | null;
  areas: DetectedArea[];
}

const GROUP_TIMEOUT_MINUTES = 15;
const SUITE_TIMEOUT_MINUTES = 30;
const PREVIEW_TIMEOUT_MINUTES = 2;
const CHARTER_SOURCE = "charter";

// Each slot lists script names in priority order; the first present, non-mutating script fills it.
const L1_SLOTS = [["build"], ["check", "typecheck", "check-types"], ["lint"]];
const UNIT_SLOTS = [["test:unit", "test"]];
const ACCEPTANCE_SLOTS = [["test:acceptance", "test:e2e", "e2e"]];
const PARITY_SLOTS = [["test:parity"]];

// A script whose body contains one of these changes files, so it never runs as a gate.
const MUTATING = ["--fix", "--write", "-u ", "--update", "prettier --write", "eslint --fix"];

// The first lockfile found at the root names the package manager.
const LOCKFILES: [string, string][] = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
];

const AREA_DIRS = ["src", "app", "lib", "server", "components", "routes", "pages", "crates", "tests"];
const NEVER_UI_DIRS = new Set(["server", "crates"]);

const AXUM_DEPENDENCY = /^\s*axum\s*[=.]|\.axum\]/m;
const FLUTTER_DEPENDENCY = /^\s*flutter\s*:|sdk:\s*flutter/m;

interface PackageInfo {
  scripts: Map<string, string>;
  deps: string[];
}

interface Manifests {
  pm: string;
  pkg: PackageInfo | null;
  cargo: string | null;
  pyproject: string | null;
  pubspec: string | null;
}

// A gate group holds its entries and the sources that explain them: `path:key`, or
// `skipped mutating <name>` for a script that was present but not allowed to run as a gate.
interface Group {
  entries: GateEntry[];
  sources: string[];
}

interface Groups {
  l1: Group;
  unit: Group;
  acceptance: Group;
  parity: Group;
}

function emptyGroup(): Group {
  return { entries: [], sources: [] };
}

function emptyGroups(): Groups {
  return { l1: emptyGroup(), unit: emptyGroup(), acceptance: emptyGroup(), parity: emptyGroup() };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function objectAt(doc: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = doc[key];
  return isRecord(v) ? v : {};
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

// A package.json that does not parse counts as absent, so its gates report as not configured.
function parsePackage(text: string): PackageInfo | null {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(doc)) return null;
  const scripts = new Map<string, string>();
  for (const [name, body] of Object.entries(objectAt(doc, "scripts"))) {
    if (typeof body === "string") scripts.set(name, body);
  }
  const deps = [
    ...Object.keys(objectAt(doc, "dependencies")),
    ...Object.keys(objectAt(doc, "devDependencies")),
  ];
  return { scripts, deps };
}

function packageManager(root: string): string {
  for (const [file, pm] of LOCKFILES) {
    if (existsSync(join(root, file))) return pm;
  }
  return "npm";
}

function loadManifests(root: string): Manifests {
  const packageText = readText(join(root, "package.json"));
  return {
    pm: packageManager(root),
    pkg: packageText === null ? null : parsePackage(packageText),
    cargo: readText(join(root, "Cargo.toml")),
    pyproject: readText(join(root, "pyproject.toml")),
    pubspec: readText(join(root, "pubspec.yaml")),
  };
}

// The first slot entry that is present and not mutating; mutating scripts that are present are recorded.
function pickScript(pkg: PackageInfo, slot: string[], sources: string[]): string | null {
  for (const name of slot) {
    const body = pkg.scripts.get(name);
    if (body === undefined) continue;
    if (MUTATING.some((marker) => body.includes(marker))) {
      sources.push(`skipped mutating ${name}`);
      continue;
    }
    return name;
  }
  return null;
}

function packageGroup(pkg: PackageInfo, pm: string, slots: string[][], timeout: number): Group {
  const group = emptyGroup();
  for (const slot of slots) {
    const name = pickScript(pkg, slot, group.sources);
    if (name === null) continue;
    group.entries.push({ name, tool: pm, args: ["run", name], timeout_minutes: timeout });
    group.sources.push(`package.json:${name}`);
  }
  return group;
}

// A group that package.json left empty takes the other manifest's group; notes from both are kept.
function fillGroup(group: Group, from: Group): Group {
  if (group.entries.length > 0) return group;
  return { entries: from.entries, sources: [...group.sources, ...from.sources] };
}

function cargoGroups(): Pick<Groups, "l1" | "unit"> {
  return {
    l1: {
      entries: [
        { name: "fmt", tool: "cargo", args: ["fmt", "--check"], timeout_minutes: GROUP_TIMEOUT_MINUTES },
        {
          name: "clippy",
          tool: "cargo",
          args: ["clippy", "--all-targets", "--", "-D", "warnings"],
          timeout_minutes: GROUP_TIMEOUT_MINUTES,
        },
      ],
      sources: ["Cargo.toml:fmt", "Cargo.toml:clippy"],
    },
    unit: {
      entries: [{ name: "test", tool: "cargo", args: ["test"], timeout_minutes: GROUP_TIMEOUT_MINUTES }],
      sources: ["Cargo.toml:test"],
    },
  };
}

// Matches a dependency line (`pytest = "^8"`) or a requirement string (`"pytest>=8"`), not `pytest-cov`.
function pythonDependency(text: string, name: string): boolean {
  return new RegExp(`^\\s*${name}\\s*=|["']${name}(\\[[^\\]]*\\])?\\s*(?:[<>=!~;"'\\]]|$)`, "m").test(text);
}

function pyprojectGroups(text: string): Pick<Groups, "l1" | "unit"> {
  const pytest = text.includes("[tool.pytest") || pythonDependency(text, "pytest");
  const ruff = text.includes("[tool.ruff") || pythonDependency(text, "ruff");
  return {
    l1: ruff
      ? {
          entries: [{ name: "ruff", tool: "ruff", args: ["check"], timeout_minutes: GROUP_TIMEOUT_MINUTES }],
          sources: ["pyproject.toml:ruff"],
        }
      : emptyGroup(),
    unit: pytest
      ? {
          entries: [{ name: "pytest", tool: "pytest", args: [], timeout_minutes: GROUP_TIMEOUT_MINUTES }],
          sources: ["pyproject.toml:pytest"],
        }
      : emptyGroup(),
  };
}

function scanGates(m: Manifests): Groups {
  const groups: Groups =
    m.pkg === null
      ? emptyGroups()
      : {
          l1: packageGroup(m.pkg, m.pm, L1_SLOTS, GROUP_TIMEOUT_MINUTES),
          unit: packageGroup(m.pkg, m.pm, UNIT_SLOTS, GROUP_TIMEOUT_MINUTES),
          acceptance: packageGroup(m.pkg, m.pm, ACCEPTANCE_SLOTS, SUITE_TIMEOUT_MINUTES),
          parity: packageGroup(m.pkg, m.pm, PARITY_SLOTS, SUITE_TIMEOUT_MINUTES),
        };
  if (m.cargo !== null) {
    const rust = cargoGroups();
    groups.l1 = fillGroup(groups.l1, rust.l1);
    groups.unit = fillGroup(groups.unit, rust.unit);
  }
  if (m.pyproject !== null) {
    const python = pyprojectGroups(m.pyproject);
    groups.l1 = fillGroup(groups.l1, python.l1);
    groups.unit = fillGroup(groups.unit, python.unit);
  }
  return groups;
}

export function detectGates(root: string): DetectedGates {
  const g = scanGates(loadManifests(root));
  return {
    l1: g.l1.entries,
    unit: g.unit.entries,
    acceptance: g.acceptance.entries[0] ?? null,
    parity: g.parity.entries[0] ?? null,
    sources: [g.l1, g.unit, g.acceptance, g.parity].flatMap((group) => group.sources),
  };
}

// The "preview" script wins over "dev"; the port is appended by the caller.
function previewFrom(pkg: PackageInfo | null, pm: string): Command | null {
  if (pkg === null) return null;
  for (const script of ["preview", "dev"]) {
    if (pkg.scripts.has(script)) {
      return { tool: pm, args: ["run", script, "--", "--port"], timeout_minutes: PREVIEW_TIMEOUT_MINUTES };
    }
  }
  return null;
}

export function detectPreview(root: string): Command | null {
  const m = loadManifests(root);
  return previewFrom(m.pkg, m.pm);
}

interface Primary {
  specialist: string;
  ui: boolean;
  source: string;
}

// Package dependency rules in priority order; the first rule with a matching dependency names the specialist.
const PACKAGE_RULES: [(dep: string) => boolean, string, boolean][] = [
  [(dep) => dep === "svelte" || dep === "@sveltejs/kit", "z-svelte-engineer", true],
  [(dep) => dep === "astro", "z-astro-engineer", true],
  [(dep) => dep === "elysia", "z-elysiajs-engineer", false],
  [(dep) => dep.startsWith("@tanstack/"), "z-tanstack-engineer", true],
  [(dep) => dep === "wrangler", "z-cloudflare-engineer", false],
];

function primarySpecialist(m: Manifests): Primary | null {
  const deps = m.pkg?.deps ?? [];
  for (const [matches, specialist, ui] of PACKAGE_RULES) {
    const dep = deps.find(matches);
    if (dep !== undefined) return { specialist, ui, source: `package.json:${dep}` };
  }
  if (m.cargo !== null) {
    if (AXUM_DEPENDENCY.test(m.cargo)) {
      return { specialist: "z-axum-engineer", ui: false, source: "Cargo.toml:axum" };
    }
    return { specialist: "z-rust-engineer", ui: false, source: "Cargo.toml" };
  }
  if (m.pubspec !== null && FLUTTER_DEPENDENCY.test(m.pubspec)) {
    return { specialist: "z-flutter-engineer", ui: true, source: "pubspec.yaml:flutter" };
  }
  return null;
}

// One area per existing top-level directory in AREA_DIRS, all with the primary specialist.
function areasFrom(m: Manifests, root: string): DetectedArea[] {
  const primary = primarySpecialist(m);
  if (primary === null) return [];
  return AREA_DIRS.filter((dir) => isDirectory(join(root, dir))).map((dir) => ({
    prefix: `${dir}/`,
    specialist: primary.specialist,
    ui: primary.ui && !NEVER_UI_DIRS.has(dir),
    source: primary.source,
  }));
}

export function detectAreas(root: string): DetectedArea[] {
  return areasFrom(loadManifests(root), root);
}

// A charter value is one entry or a list; an absent or empty value means the group is detected.
function asList(value: GateEntry | GateEntry[] | undefined): GateEntry[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function chooseGroup(pinned: GateEntry[], detected: Group, key: string): Group {
  return pinned.length > 0 ? { entries: pinned, sources: [`${CHARTER_SOURCE}:gates.${key}`] } : detected;
}

export function effectiveSettings(charter: Charter, root: string): EffectiveSettings {
  const m = loadManifests(root);
  const detected = scanGates(m);
  const pinned: Partial<Charter["gates"]> = charter.gates ?? {};
  const l1 = chooseGroup(asList(pinned.l1), detected.l1, "l1");
  const unit = chooseGroup(asList(pinned.unit), detected.unit, "unit");
  const acceptance = chooseGroup(asList(pinned.acceptance), detected.acceptance, "acceptance");
  const parity = chooseGroup(asList(pinned.parity), detected.parity, "parity");

  const pinnedPreview = charter.preview ?? null;
  const pinnedAreas = charter.areas ?? [];
  return {
    gates: {
      l1: l1.entries,
      unit: unit.entries,
      acceptance: acceptance.entries,
      parity: parity.entries,
      sources: [l1, unit, acceptance, parity].flatMap((group) => group.sources),
    },
    preview:
      pinnedPreview === null
        ? previewFrom(m.pkg, m.pm)
        : { tool: pinnedPreview.tool, args: pinnedPreview.args, timeout_minutes: pinnedPreview.timeout_minutes },
    areas:
      pinnedAreas.length > 0
        ? pinnedAreas.map((area) => ({
            prefix: area.prefix,
            specialist: area.specialist,
            ui: area.ui,
            source: CHARTER_SOURCE,
          }))
        : areasFrom(m, root),
  };
}
