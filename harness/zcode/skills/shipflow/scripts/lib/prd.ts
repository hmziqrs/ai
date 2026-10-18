// PRD tooling core: parses prd/** and discovery/manifest.json into a model, lints it at a stage
// and builds the deterministic prd/index.json. parsePrd, lintPrd and buildIndex are pure over a
// file map (relative path -> text); readProject is the only function here that touches the disk.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export type Stage = "s2" | "s3" | "s5";
export const STAGES: readonly Stage[] = ["s2", "s3", "s5"];

export function isStage(value: string): value is Stage {
  return (STAGES as readonly string[]).includes(value);
}

export interface LintIssue {
  level: "error" | "warn";
  id: string;
  rule: string;
  reason: string;
  file: string;
}

export interface PrdRoot {
  id: string;
  title: string;
  reference: string[];
  milestones: string[];
  parityTarget: Record<string, boolean>;
  journeys: { id: string; features: string[] }[];
  sections: { code: string; title: string; milestone: string; dependsOn: string[]; covers: string[] }[];
  headings: string[];
}

export interface PrdSection {
  id: string;
  title: string;
  milestone: string;
  dependsOn: string[];
  referenceArchetypes: string[];
  file: string;
  hash: string;
}

export interface PrdFeature {
  id: string;
  section: string;
  title: string;
  story: string;
  milestone: string;
  dependsOn: string[];
  evidence: string[];
  status: "active" | "dropped";
  supersededBy: string[];
  file: string;
  anchor: string;
  hash: string;
}

export interface PrdAc {
  id: string;
  feature: string;
  text: string;
  check: string;
}

export interface PrdTask {
  id: string;
  feature: string;
  goal: string;
  area: string[];
  dependsOn: string[];
  satisfies: string[];
  tests: string[];
  size: string;
  notes: string;
  milestone: string;
  status: "active" | "dropped";
  file: string;
  anchor: string;
  hash: string;
}

export interface PrdAssumption {
  id: string;
  text: string;
  confidence: string;
  evidence: string;
  affects: string[];
}

export interface Discovery {
  archetypes: string[];
  journeys: string[];
  interactions: string[];
}

export interface PrdModel {
  root: PrdRoot | null;
  sections: PrdSection[];
  features: PrdFeature[];
  acs: PrdAc[];
  tasks: PrdTask[];
  assumptions: PrdAssumption[];
  discovery: Discovery | null;
  parseIssues: LintIssue[];
  // Raw prd/index.json text, or null when absent. The stale-index rule compares it with
  // buildIndex output, so the model has to carry it (spec section 2 does not list this field).
  indexText: string | null;
}

export interface LintOptions {
  stage: Stage;
  coverageTarget: number;
  decomposed: string[] | null;
  features?: string[];
}

export interface Coverage {
  total: number;
  covered: number;
  ratio: number;
  misses: string[];
}

export interface LintResult {
  errors: LintIssue[];
  warnings: LintIssue[];
  coverage: Coverage;
}

export interface PrdIndexItem {
  id: string;
  kind: "epic" | "feature" | "task";
  parent: string;
  title: string;
  milestone: string;
  dependsOn: string[];
  acs?: string[];
  evidence?: string[];
  area?: string[];
  satisfies?: string[];
  tests?: string[];
  size?: string;
  file: string;
  anchor: string;
  hash: string;
  status: "active" | "dropped";
}

// Spec section 2.2 shape. Key order of every object is the emitted order.
export interface PrdIndex {
  version: number;
  root: { id: string; title: string; milestones: string[]; hash: string } | null;
  items: PrdIndexItem[];
  acs: { id: string; feature: string; check: string }[];
}

const ROOT_FILE = "prd/prd.md";
const SECTIONS_DIR = "prd/sections/";
const ASSUMPTIONS_FILE = "prd/assumptions.md";
const MANIFEST_FILE = "discovery/manifest.json";
const INDEX_FILE = "prd/index.json";

const STAGE_RANK: Record<Stage, number> = { s2: 2, s3: 3, s5: 5 };
const ROOT_HEADINGS = [
  "Summary",
  "Users and journeys",
  "Scope",
  "NFR budgets",
  "Architecture",
  "Milestones",
  "Sections",
  "Glossary",
  "Done definition",
];
const SECTION_CODE = /^[A-Z]{2,4}$/;
const ASSUMPTION_ID = /^A-\d{3}$/;
const DISCOVERY_ID: Record<keyof Discovery, RegExp> = {
  archetypes: /^arch:[a-z0-9-]+$/,
  journeys: /^journey:[a-z0-9-]+$/,
  interactions: /^int:[a-z0-9-]+$/,
};
const GIVEN_WHEN_THEN = /\bgiven\b[\s\S]*\bwhen\b[\s\S]*\bthen\b/i;
const TASK_COLUMNS = ["Task", "Goal", "Area", "Depends on", "Satisfies", "Tests", "Size", "Notes"];
const AC_COLUMNS = ["ID", "Criterion", "Check"];
const ASSUMPTION_COLUMNS = ["ID", "Assumption", "Confidence", "Evidence", "Affects"];

// ---------------------------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------------------------

export function readProject(repoRoot: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const rel of listFiles(join(repoRoot, "prd"), "prd")) {
    files.set(rel, readFileSync(join(repoRoot, rel), "utf8"));
  }
  const manifest = join(repoRoot, MANIFEST_FILE);
  if (existsSync(manifest) && statSync(manifest).isFile()) {
    files.set(MANIFEST_FILE, readFileSync(manifest, "utf8"));
  }
  return new Map([...files].sort(([a], [b]) => compareText(a, b)));
}

function listFiles(dir: string, rel: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => compareText(a.name, b.name));
  for (const entry of entries) {
    const childRel = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), childRel));
    else if (entry.isFile()) out.push(childRel);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Pure helpers (exported for the CLIs and the checker)
// ---------------------------------------------------------------------------------------------

// sha256 hex, first 12 characters, over the text with CRLF normalized and trailing spaces or
// tabs removed from every line, so that editor whitespace does not change an item's hash.
export function itemHash(text: string): string {
  const normalized = toLines(text)
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 12);
}

// Natural order: digit runs compare by value, so LB-2 sorts before LB-10.
export function naturalCompare(a: string, b: string): number {
  const xs = a.match(/\d+|\D+/g) ?? [];
  const ys = b.match(/\d+|\D+/g) ?? [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    const x = xs[i];
    const y = ys[i];
    let order: number;
    if (/^\d/.test(x) && /^\d/.test(y)) {
      const xn = BigInt(x);
      const yn = BigInt(y);
      order = xn < yn ? -1 : xn > yn ? 1 : compareText(x, y);
    } else {
      order = compareText(x, y);
    }
    if (order !== 0) return order;
  }
  return xs.length - ys.length || compareText(a, b);
}

export function sortIssues(issues: LintIssue[]): LintIssue[] {
  return [...issues].sort(
    (a, b) =>
      naturalCompare(a.id, b.id) ||
      compareText(a.rule, b.rule) ||
      compareText(a.level, b.level) ||
      compareText(a.reason, b.reason) ||
      compareText(a.file, b.file),
  );
}

// GitHub-style heading anchor: lowercase, drop characters other than [a-z0-9 -], spaces to '-'.
export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
}

export function renderIndex(index: PrdIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

// ---------------------------------------------------------------------------------------------
// Parsing: files -> PrdModel (never throws on malformed content; problems go to parseIssues)
// ---------------------------------------------------------------------------------------------

type Obj = Record<string, unknown>;

interface Document {
  present: boolean;
  data: Obj | null;
  error: string | null;
  raw: string;
  body: string[];
  bodyOffset: number;
}

interface Heading {
  level: number;
  text: string;
  index: number;
}

interface Row {
  cells: string[];
  raw: string;
}

interface Table {
  index: number;
  header: string[];
  rows: Row[];
}

interface Scan {
  fenced: boolean[];
  headings: Heading[];
  tables: Table[];
}

type Report = (reason: string) => void;

export function parsePrd(files: Map<string, string>): PrdModel {
  const issues: LintIssue[] = [];

  const rootText = files.get(ROOT_FILE);
  if (rootText === undefined) {
    issue(issues, ROOT_FILE, "frontmatter", "root prd/prd.md is missing");
  }
  const root = rootText === undefined ? null : parseRoot(rootText, issues);

  const sections: PrdSection[] = [];
  const features: PrdFeature[] = [];
  const acs: PrdAc[] = [];
  const tasks: PrdTask[] = [];
  for (const file of [...files.keys()].filter(isSectionFile).sort(compareText)) {
    const parsed = parseSection(file, files.get(file) ?? "", issues);
    sections.push(parsed.section);
    features.push(...parsed.features);
    acs.push(...parsed.acs);
    tasks.push(...parsed.tasks);
  }

  const assumptionsText = files.get(ASSUMPTIONS_FILE);
  const assumptions = assumptionsText === undefined ? [] : parseAssumptions(assumptionsText, issues);

  const manifestText = files.get(MANIFEST_FILE);
  const discovery = manifestText === undefined ? null : parseDiscovery(manifestText, issues);

  return {
    root,
    sections: byId(sections),
    features: byId(features),
    acs: byId(acs),
    tasks: byId(tasks),
    assumptions: byId(assumptions),
    discovery,
    parseIssues: issues,
    indexText: files.get(INDEX_FILE) ?? null,
  };
}

function isSectionFile(file: string): boolean {
  return file.startsWith(SECTIONS_DIR) && file.endsWith(".md") && !file.slice(SECTIONS_DIR.length).includes("/");
}

function parseRoot(text: string, issues: LintIssue[]): PrdRoot {
  const doc = splitDocument(text);
  const data = doc.data;
  const report: Report = (reason) => issue(issues, ROOT_FILE, "frontmatter", reason, "PRD");
  let id = "";
  let title = "";
  let reference: string[] = [];
  let milestones: string[] = [];
  let parityTarget: Record<string, boolean> = {};

  if (data === null) {
    report(doc.error ?? "front matter is missing");
  } else {
    id = stringOf(data.id);
    if (id !== "PRD") report(`front matter id must be exactly PRD, found "${id}"`);
    title = stringOf(data.title);
    if (title === "") report("front matter title is missing");
    reference = requiredList(data.reference, "reference", report) ?? [];
    const listed = requiredList(data.milestones, "milestones", report);
    if (listed !== null) {
      if (listed.length === 0) report("front matter milestones must not be empty");
      else if (listed.some((m) => !/^M\d+$/.test(m))) report("front matter milestones must be M<n> values");
      milestones = listed;
    }
    const parity = data.parity_target;
    if (parity === undefined) {
      report("front matter parity_target is missing");
    } else if (!isObject(parity) || Object.keys(parity).length === 0 || Object.values(parity).some((v) => typeof v !== "boolean")) {
      report("front matter parity_target must map names to true or false");
    } else {
      parityTarget = parity as Record<string, boolean>;
    }
  }

  const scan = scanMarkdown(doc.body);
  const len = doc.body.length;
  const offset = doc.bodyOffset;
  structureIssues(scan, ROOT_FILE, offset, [], issues);

  const journeys: PrdRoot["journeys"] = [];
  for (const table of tablesIn(scan, sectionRange(scan, "Users and journeys", len))) {
    reportMissingColumns(table, ["Journey", "Features"], ROOT_FILE, offset, issues);
    const get = columnReader(table);
    for (const row of table.rows) {
      journeys.push({ id: leadingJourneyId(get(row, "Journey")), features: splitList(get(row, "Features")) });
    }
  }

  const rootSections: PrdRoot["sections"] = [];
  for (const table of tablesIn(scan, sectionRange(scan, "Sections", len))) {
    reportMissingColumns(table, ["Code", "Section", "Milestone", "Depends on", "Covers"], ROOT_FILE, offset, issues);
    const get = columnReader(table);
    for (const row of table.rows) {
      rootSections.push({
        code: get(row, "Code"),
        title: get(row, "Section"),
        milestone: get(row, "Milestone"),
        dependsOn: splitList(get(row, "Depends on")),
        covers: splitList(get(row, "Covers")),
      });
    }
  }

  return {
    id,
    title,
    reference,
    milestones,
    parityTarget,
    journeys,
    sections: rootSections,
    headings: scan.headings.filter((h) => h.level === 2).map((h) => h.text),
  };
}

function parseSection(
  file: string,
  text: string,
  issues: LintIssue[],
): { section: PrdSection; features: PrdFeature[]; acs: PrdAc[]; tasks: PrdTask[] } {
  const code = file.slice(SECTIONS_DIR.length, -".md".length);
  const doc = splitDocument(text);
  const data = doc.data;
  const report: Report = (reason) => issue(issues, file, "frontmatter", reason, code);
  if (data === null) report(doc.error ?? "front matter is missing");
  if (data !== null) {
    const declared = stringOf(data.id);
    if (declared === "") report("front matter id is missing");
    else if (declared !== code) report(`front matter id "${declared}" must equal the file name ${code}`);
    if (stringOf(data.title) === "") report("front matter title is missing");
    if (stringOf(data.milestone) === "") report("front matter milestone is missing");
  }
  const fm: Obj = data ?? {};
  const id = stringOf(fm.id) || code;
  const title = stringOf(fm.title);
  const milestone = stringOf(fm.milestone);
  const dependsOn = optionalList(fm.depends_on, "depends_on", report);
  const referenceArchetypes = optionalList(fm.reference_archetypes, "reference_archetypes", report);

  const body = doc.body;
  const len = body.length;
  const offset = doc.bodyOffset;
  const scan = scanMarkdown(body);
  const h1 = scan.headings.find((h) => h.level === 1);
  const firstH2 = scan.headings.find((h) => h.level === 2)?.index ?? len;
  const purpose = h1 ? body.slice(h1.index + 1, firstH2).join("\n").trim() : "";

  const section: PrdSection = {
    id,
    title,
    milestone,
    dependsOn,
    referenceArchetypes,
    file,
    hash: itemHash(`${doc.raw}\n${purpose}`),
  };

  const features: PrdFeature[] = [];
  const acs: PrdAc[] = [];
  const tasks: PrdTask[] = [];
  const ownedTaskRanges: [number, number][] = [];

  for (const heading of scan.headings.filter((h) => h.level === 2)) {
    const end = spanEnd(scan.headings, heading, len, 2);
    const subs = scan.headings.filter((s) => s.level === 3 && s.index > heading.index && s.index < end);
    const fields = keyValues(body, scan.fenced, heading.index + 1, subs[0]?.index ?? end);
    const { id: featureId, title: featureTitle } = splitHeading(heading.text);
    const featureMilestone = fields.get("milestone")?.trim() || milestone;
    const status = parseStatus(fields.get("status"));
    if (status.problem !== null) {
      issue(issues, file, "parse", `feature ${featureId}: ${status.problem}`, featureId);
    }
    const tasksHeading = subs.find((s) => s.text.toLowerCase() === "tasks");
    const acHeading = subs.find((s) => s.text.toLowerCase() === "acceptance criteria");
    const feature: PrdFeature = {
      id: featureId,
      section: id,
      title: featureTitle,
      story: fields.get("story") ?? "",
      milestone: featureMilestone,
      dependsOn: splitList(fields.get("depends on") ?? ""),
      evidence: splitList(fields.get("evidence") ?? ""),
      status: status.status,
      supersededBy: status.supersededBy,
      file,
      anchor: slug(heading.text),
      // Hash covers the heading through the line before "### Tasks" (or the next "##").
      hash: itemHash(body.slice(heading.index, tasksHeading?.index ?? end).join("\n")),
    };
    features.push(feature);

    if (acHeading) {
      const range: [number, number] = [acHeading.index, spanEnd(scan.headings, acHeading, len, 3)];
      for (const table of tablesIn(scan, range)) {
        reportMissingColumns(table, AC_COLUMNS, file, offset, issues);
        const get = columnReader(table);
        for (const row of table.rows) {
          acs.push({ id: get(row, "ID"), feature: featureId, text: get(row, "Criterion"), check: get(row, "Check") });
        }
      }
    }

    if (tasksHeading) {
      const range: [number, number] = [tasksHeading.index, spanEnd(scan.headings, tasksHeading, len, 3)];
      ownedTaskRanges.push(range);
      for (const table of tablesIn(scan, range)) {
        reportMissingColumns(table, TASK_COLUMNS, file, offset, issues);
        const get = columnReader(table);
        for (const row of table.rows) {
          const notes = get(row, "Notes");
          tasks.push({
            id: get(row, "Task"),
            feature: featureId,
            goal: get(row, "Goal"),
            area: splitList(get(row, "Area")),
            dependsOn: splitList(get(row, "Depends on")),
            satisfies: splitList(get(row, "Satisfies")),
            tests: splitList(get(row, "Tests")),
            size: get(row, "Size"),
            notes,
            milestone: featureMilestone,
            status: /^dropped\b/i.test(notes) ? "dropped" : "active",
            file,
            anchor: feature.anchor,
            hash: itemHash(row.raw),
          });
        }
      }
    }
  }

  structureIssues(scan, file, offset, ownedTaskRanges, issues);
  return { section, features, acs, tasks };
}

function parseAssumptions(text: string, issues: LintIssue[]): PrdAssumption[] {
  const scan = scanMarkdown(toLines(text));
  const assumptions: PrdAssumption[] = [];
  for (const table of scan.tables) {
    if (!table.header.some((h) => h.toLowerCase() === "assumption")) continue;
    reportMissingColumns(table, ASSUMPTION_COLUMNS, ASSUMPTIONS_FILE, 0, issues);
    const get = columnReader(table);
    for (const row of table.rows) {
      assumptions.push({
        id: get(row, "ID"),
        text: get(row, "Assumption"),
        confidence: get(row, "Confidence"),
        evidence: get(row, "Evidence"),
        affects: splitList(get(row, "Affects")),
      });
    }
  }
  structureIssues(scan, ASSUMPTIONS_FILE, 0, [], issues);
  return assumptions;
}

function parseDiscovery(text: string, issues: LintIssue[]): Discovery | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (error) {
    issue(issues, MANIFEST_FILE, "parse", `manifest is not valid JSON: ${messageOf(error)}`);
    return null;
  }
  if (!isObject(data)) {
    issue(issues, MANIFEST_FILE, "parse", "manifest must be a JSON object");
    return null;
  }
  const manifest: Obj = data;
  const idsOf = (key: string): string[] => {
    const entries = manifest[key];
    if (entries === undefined) return [];
    if (!Array.isArray(entries)) {
      issue(issues, MANIFEST_FILE, "parse", `manifest ${key} must be an array`);
      return [];
    }
    const ids: string[] = [];
    for (const entry of entries) {
      const id = isObject(entry) ? stringOf(entry.id) : "";
      if (id === "") issue(issues, MANIFEST_FILE, "parse", `manifest ${key} entry has no string id`);
      else ids.push(id);
    }
    return ids;
  };
  return { archetypes: idsOf("archetypes"), journeys: idsOf("journeys"), interactions: idsOf("interactions") };
}

// ---------------------------------------------------------------------------------------------
// Front matter and Markdown scanning
// ---------------------------------------------------------------------------------------------

function splitDocument(text: string): Document {
  const lines = toLines(text);
  if (lines[0]?.trim() !== "---") {
    return { present: false, data: null, error: null, raw: "", body: lines, bodyOffset: 0 };
  }
  const close = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (close < 0) {
    return { present: true, data: null, error: "front matter is not closed by ---", raw: "", body: lines.slice(1), bodyOffset: 1 };
  }
  const raw = lines.slice(0, close + 1).join("\n");
  const body = lines.slice(close + 1);
  let parsed: unknown;
  try {
    parsed = Bun.YAML.parse(lines.slice(1, close).join("\n")) ?? {};
  } catch (error) {
    return { present: true, data: null, error: `front matter is not valid YAML: ${messageOf(error)}`, raw, body, bodyOffset: close + 1 };
  }
  if (!isObject(parsed)) {
    return { present: true, data: null, error: "front matter is not a mapping", raw, body, bodyOffset: close + 1 };
  }
  return { present: true, data: parsed, error: null, raw, body, bodyOffset: close + 1 };
}

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})\s*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const KEY_VALUE = /^\s*([A-Za-z][A-Za-z ]*?):\s*(.*?)\s*$/;

// Fenced code blocks are opaque: headings and tables inside them are not PRD structure.
function markFences(lines: string[]): boolean[] {
  const fenced: boolean[] = [];
  let open = "";
  for (const line of lines) {
    if (open === "") {
      const start = FENCE_OPEN.exec(line);
      if (start) open = start[1];
      fenced.push(start !== null);
      continue;
    }
    fenced.push(true);
    const close = FENCE_CLOSE.exec(line);
    if (close && close[1][0] === open[0] && close[1].length >= open.length) open = "";
  }
  return fenced;
}

function scanMarkdown(lines: string[]): Scan {
  const fenced = markFences(lines);
  const headings: Heading[] = [];
  const tables: Table[] = [];
  let i = 0;
  while (i < lines.length) {
    if (fenced[i]) {
      i++;
      continue;
    }
    const heading = HEADING.exec(lines[i]);
    if (heading) {
      headings.push({ level: heading[1].length, text: (heading[2] ?? "").trim(), index: i });
      i++;
      continue;
    }
    if (isTableStart(lines, fenced, i)) {
      const rows: Row[] = [];
      let j = i + 2;
      while (j < lines.length && !fenced[j] && lines[j].includes("|") && lines[j].trim() !== "") {
        rows.push({ cells: splitRow(lines[j]), raw: lines[j] });
        j++;
      }
      tables.push({
        index: i,
        header: splitRow(lines[i]),
        rows: rows.filter((row) => row.cells.some((cell) => cell !== "")),
      });
      i = j;
      continue;
    }
    i++;
  }
  return { fenced, headings, tables };
}

// A table is a header row with pipes followed directly by a delimiter row. Leading and trailing
// pipes are optional; escaped pipes (\|) stay inside their cell.
function isTableStart(lines: string[], fenced: boolean[], i: number): boolean {
  return i + 1 < lines.length && !fenced[i + 1] && lines[i].includes("|") && isDelimiterRow(lines[i + 1]);
}

function isDelimiterRow(line: string): boolean {
  if (!line.includes("|")) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function splitRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith("|")) text = text.slice(1);
  if (text.endsWith("|") && !text.endsWith("\\|")) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function columnReader(table: Table): (row: Row, column: string) => string {
  const index = new Map(table.header.map((name, i) => [name.toLowerCase(), i] as const));
  return (row, column) => {
    const i = index.get(column.toLowerCase());
    return i === undefined ? "" : (row.cells[i] ?? "");
  };
}

function reportMissingColumns(table: Table, columns: string[], file: string, offset: number, issues: LintIssue[]): void {
  const have = new Set(table.header.map((h) => h.toLowerCase()));
  const missing = columns.filter((c) => !have.has(c.toLowerCase()));
  if (missing.length > 0) {
    issue(issues, file, "parse", `table at line ${table.index + offset + 1} lacks column ${missing.join(", ")}`);
  }
}

// Depth rule inputs that the model cannot represent: #### headings naming a feature or task,
// and task tables that are not inside a feature's Tasks section.
function structureIssues(scan: Scan, file: string, offset: number, ownedTaskRanges: [number, number][], issues: LintIssue[]): void {
  for (const heading of scan.headings) {
    if (heading.level < 4) continue;
    const token = heading.text.split(/\s+/)[0] ?? "";
    if (/^[A-Z]{2,4}-\d+/.test(token)) {
      issue(issues, file, "depth", `heading level ${heading.level} names ${token}; features are ## and tasks are table rows`, token);
    }
  }
  for (const table of scan.tables) {
    if (!isTaskTable(table)) continue;
    if (ownedTaskRanges.some(([start, end]) => table.index >= start && table.index < end)) continue;
    issue(issues, file, "depth", `task table at line ${table.index + offset + 1} is outside a feature Tasks section`);
  }
}

function isTaskTable(table: Table): boolean {
  const names = table.header.map((h) => h.toLowerCase());
  return names.includes("task") || names.includes("satisfies");
}

// Level-n heading's section runs until the next heading of level n or shallower.
function spanEnd(headings: Heading[], at: Heading, length: number, level: number): number {
  return headings.find((h) => h.index > at.index && h.level <= level)?.index ?? length;
}

function sectionRange(scan: Scan, title: string, length: number): [number, number] | null {
  const heading = scan.headings.find((h) => h.level === 2 && h.text === title);
  return heading ? [heading.index, spanEnd(scan.headings, heading, length, 2)] : null;
}

function tablesIn(scan: Scan, range: [number, number] | null): Table[] {
  if (range === null) return [];
  return scan.tables.filter((t) => t.index >= range[0] && t.index < range[1]);
}

// "Key: value" lines directly under a feature heading, before its first ### (fenced lines skipped).
function keyValues(body: string[], fenced: boolean[], from: number, to: number): Map<string, string> {
  const fields = new Map<string, string>();
  for (let i = from; i < to; i++) {
    if (fenced[i]) continue;
    const match = KEY_VALUE.exec(body[i]);
    if (!match) continue;
    const key = match[1].trim().toLowerCase();
    if (!fields.has(key)) fields.set(key, match[2]);
  }
  return fields;
}

function parseStatus(raw: string | undefined): { status: "active" | "dropped"; supersededBy: string[]; problem: string | null } {
  const value = (raw ?? "").trim();
  if (value === "") return { status: "active", supersededBy: [], problem: null };
  if (/^dropped\b/i.test(value)) return { status: "dropped", supersededBy: [], problem: null };
  const superseded = /^superseded by\s+(.+)$/i.exec(value);
  if (superseded) return { status: "dropped", supersededBy: splitList(superseded[1]), problem: null };
  return { status: "active", supersededBy: [], problem: `Status "${value}" must be dropped or superseded by <ids>` };
}

function splitHeading(text: string): { id: string; title: string } {
  const id = text.split(/\s+/)[0] ?? "";
  return { id, title: text.slice(id.length).trim() };
}

function leadingJourneyId(cell: string): string {
  const match = /^(J\d+)\b/.exec(cell);
  return match ? match[1] : (cell.split(/\s+/)[0] ?? "");
}

// ---------------------------------------------------------------------------------------------
// Front matter field helpers
// ---------------------------------------------------------------------------------------------

function requiredList(value: unknown, key: string, report: Report): string[] | null {
  if (value === undefined) {
    report(`front matter ${key} is missing`);
    return null;
  }
  const list = listValue(value);
  if (list === null) report(`front matter ${key} must be a list of strings`);
  return list;
}

function optionalList(value: unknown, key: string, report: Report): string[] {
  if (value === undefined) return [];
  const list = listValue(value);
  if (list === null) {
    report(`front matter ${key} must be a list of strings`);
    return [];
  }
  return list;
}

function listValue(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) return null;
  return value.map((v) => v.trim()).filter((v) => v !== "");
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

function toLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function issue(issues: LintIssue[], file: string, rule: string, reason: string, id = file): void {
  issues.push({ level: "error", id: id || file, rule, reason, file });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function byId<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => naturalCompare(a.id, b.id));
}

function compareText(x: string, y: string): number {
  return x < y ? -1 : x > y ? 1 : 0;
}

// ---------------------------------------------------------------------------------------------
// Lint (spec table 2.1). Rules run when their stage is at or below the requested stage.
// ---------------------------------------------------------------------------------------------

interface Sink {
  error(id: string, rule: string, reason: string, file?: string): void;
  warn(id: string, rule: string, reason: string, file?: string): void;
}

export function lintPrd(model: PrdModel, opts: LintOptions): LintResult {
  const issues: LintIssue[] = [...model.parseIssues];
  const sink: Sink = {
    error: (id, rule, reason, file = ROOT_FILE) => issues.push({ level: "error", id: id || file, rule, reason, file }),
    warn: (id, rule, reason, file = ROOT_FILE) => issues.push({ level: "warn", id: id || file, rule, reason, file }),
  };
  const applies = (stage: Stage): boolean => STAGE_RANK[opts.stage] >= STAGE_RANK[stage];

  // s2
  if (model.root) checkRootHeadings(model.root, sink);
  checkMilestones(model, sink);
  checkIds(model, sink);
  checkDuplicates(model, sink);
  const coverage = checkCoverage(model, opts, sink);

  if (applies("s3")) {
    checkSectionIndex(model, sink);
    checkAcceptanceCriteria(model, sink);
    checkFeatures(model, sink);
    checkSectionSize(model, sink);
    checkAssumptions(model, sink);
    checkDependencies(model, sink);
    if (model.indexText !== null && model.indexText !== renderIndex(buildIndex(model))) {
      sink.warn(INDEX_FILE, "stale-index", "prd/index.json differs from the PRD; rerun with --emit-index", INDEX_FILE);
    }
  }

  if (applies("s5")) {
    checkTasks(model, opts, sink);
  }

  const sorted = sortIssues(issues);
  return {
    errors: sorted.filter((i) => i.level === "error"),
    warnings: sorted.filter((i) => i.level === "warn"),
    coverage,
  };
}

function checkRootHeadings(root: PrdRoot, sink: Sink): void {
  for (const heading of ROOT_HEADINGS) {
    if (!root.headings.includes(heading)) sink.error("PRD", "frontmatter", `missing ## heading "${heading}"`, ROOT_FILE);
  }
  const positions = ROOT_HEADINGS.map((h) => root.headings.indexOf(h)).filter((p) => p >= 0);
  if (positions.some((p, i) => i > 0 && p < positions[i - 1])) {
    sink.error("PRD", "frontmatter", "required ## headings are out of order", ROOT_FILE);
  }
}

function checkMilestones(model: PrdModel, sink: Sink): void {
  const root = model.root;
  if (!root || root.milestones.length === 0) return;
  const known = new Set(root.milestones);
  const check = (id: string, milestone: string, file: string) => {
    if (milestone !== "" && !known.has(milestone)) {
      sink.error(id, "milestone-unknown", `milestone ${milestone} is not in the root milestones list`, file);
    }
  };
  for (const section of root.sections) check(section.code, section.milestone, ROOT_FILE);
  for (const section of model.sections) check(section.id, section.milestone, section.file);
  for (const feature of model.features) check(feature.id, feature.milestone, feature.file);
}

function checkIds(model: PrdModel, sink: Sink): void {
  const root = model.root;
  for (const journey of root?.journeys ?? []) {
    if (!/^J\d+$/.test(journey.id)) sink.error(journey.id, "id-format", "journey id must be J<n>", ROOT_FILE);
  }
  for (const section of root?.sections ?? []) {
    if (!SECTION_CODE.test(section.code)) sink.error(section.code, "id-format", "section code must match ^[A-Z]{2,4}$", ROOT_FILE);
  }
  for (const section of model.sections) {
    if (!SECTION_CODE.test(section.id)) sink.error(section.id, "id-format", "section code must match ^[A-Z]{2,4}$", section.file);
  }
  for (const feature of model.features) {
    const code = codeOf(feature.file);
    if (isDeep(feature.id)) sink.error(feature.id, "depth", "id is deeper than a task", feature.file);
    else if (!isChildId(feature.id, `${code}-`)) sink.error(feature.id, "id-format", `feature id must be ${code}-<n>`, feature.file);
  }
  for (const task of model.tasks) {
    if (isDeep(task.id)) sink.error(task.id, "depth", "task id is deeper than <feature>.<n>", task.file);
    else if (!isChildId(task.id, `${task.feature}.`)) sink.error(task.id, "id-format", `task id must be ${task.feature}.<n>`, task.file);
  }
  for (const ac of model.acs) {
    const file = featureFile(model, ac.feature);
    if (isDeep(ac.id)) sink.error(ac.id, "depth", "id is deeper than <feature>.AC<n>", file);
    else if (!isChildId(ac.id, `${ac.feature}.AC`)) sink.error(ac.id, "id-format", `AC id must be ${ac.feature}.AC<n>`, file);
  }
  for (const assumption of model.assumptions) {
    if (!ASSUMPTION_ID.test(assumption.id)) sink.error(assumption.id, "id-format", "assumption id must be A-<nnn>", ASSUMPTIONS_FILE);
  }
  if (model.discovery) {
    for (const key of Object.keys(DISCOVERY_ID) as (keyof Discovery)[]) {
      for (const id of model.discovery[key]) {
        if (!DISCOVERY_ID[key].test(id)) sink.error(id, "id-format", `discovery id in ${key} has the wrong prefix or slug`, MANIFEST_FILE);
      }
    }
  }
}

function checkDuplicates(model: PrdModel, sink: Sink): void {
  const root = model.root;
  reportDuplicates((root?.sections ?? []).map((s) => ({ id: s.code, file: ROOT_FILE })), "section", sink);
  reportDuplicates(model.sections.map((s) => ({ id: s.id, file: s.file })), "section", sink);
  reportDuplicates(model.features.map((f) => ({ id: f.id, file: f.file })), "feature", sink);
  reportDuplicates(model.tasks.map((t) => ({ id: t.id, file: t.file })), "task", sink);
  reportDuplicates(model.acs.map((a) => ({ id: a.id, file: featureFile(model, a.feature) })), "acceptance criterion", sink);
  reportDuplicates(model.assumptions.map((a) => ({ id: a.id, file: ASSUMPTIONS_FILE })), "assumption", sink);
  reportDuplicates((root?.journeys ?? []).map((j) => ({ id: j.id, file: ROOT_FILE })), "journey", sink);
}

function reportDuplicates(entries: { id: string; file: string }[], kind: string, sink: Sink): void {
  const counts = new Map<string, { count: number; file: string }>();
  for (const entry of entries) {
    if (entry.id === "") continue;
    const seen = counts.get(entry.id);
    counts.set(entry.id, { count: (seen?.count ?? 0) + 1, file: seen?.file ?? entry.file });
  }
  for (const [id, { count, file }] of counts) {
    if (count > 1) sink.error(id, "id-duplicate", `${kind} id appears ${count} times`, file);
  }
}

// Covers archetypes and journeys at s2 (root Sections Covers); at s3 and later, every archetype,
// journey and interaction via active feature Evidence plus section reference_archetypes.
function checkCoverage(model: PrdModel, opts: LintOptions, sink: Sink): Coverage {
  const discovery = model.discovery;
  const reference = model.root?.reference ?? [];
  if (discovery === null && reference.length === 0) return { total: 0, covered: 0, ratio: 1, misses: [] };
  if (discovery === null) {
    sink.error(MANIFEST_FILE, "coverage", "discovery manifest is missing but the root reference list is not empty", MANIFEST_FILE);
  }

  const targets = new Set([...(discovery?.archetypes ?? []), ...(discovery?.journeys ?? [])]);
  if (opts.stage !== "s2") {
    for (const interaction of discovery?.interactions ?? []) targets.add(interaction);
  }

  const covered = new Set<string>();
  if (opts.stage === "s2") {
    for (const section of model.root?.sections ?? []) for (const c of section.covers) covered.add(c);
  } else {
    for (const feature of model.features) {
      if (feature.status === "active") for (const e of feature.evidence) covered.add(e);
    }
    for (const section of model.sections) for (const a of section.referenceArchetypes) covered.add(a);
  }

  const ids = [...targets].sort(naturalCompare);
  const hits = ids.filter((id) => covered.has(id));
  const misses = ids.filter((id) => !covered.has(id));
  for (const miss of misses) sink.warn(miss, "coverage", "not covered by any feature", MANIFEST_FILE);

  const ratio = ids.length === 0 ? 1 : hits.length / ids.length;
  if (ratio < opts.coverageTarget) {
    sink.error(
      MANIFEST_FILE,
      "coverage",
      `covered ${hits.length}/${ids.length} is below the target ${opts.coverageTarget}`,
      MANIFEST_FILE,
    );
  }
  return { total: ids.length, covered: hits.length, ratio, misses };
}

function checkSectionIndex(model: PrdModel, sink: Sink): void {
  if (!model.root) return;
  const listed = new Set(model.root.sections.map((s) => s.code));
  const fileByCode = new Map(model.sections.map((s) => [codeOf(s.file), s.file] as const));
  for (const [code, file] of [...fileByCode].sort(([a], [b]) => naturalCompare(a, b))) {
    if (!listed.has(code)) sink.error(code, "section-index", "section file is not listed in the root Sections table", file);
  }
  for (const code of [...listed].sort(naturalCompare)) {
    if (!fileByCode.has(code)) sink.error(code, "section-index", "listed in the root Sections table but has no section file", ROOT_FILE);
  }
}

function checkAcceptanceCriteria(model: PrdModel, sink: Sink): void {
  for (const feature of activeFeatures(model)) {
    const count = acsOf(model, feature.id).length;
    if (count < 3 || count > 10) sink.error(feature.id, "ac-count", `has ${count} acceptance criteria (expected 3-10)`, feature.file);
  }
  for (const ac of model.acs) {
    const file = featureFile(model, ac.feature);
    if (!GIVEN_WHEN_THEN.test(ac.text)) sink.error(ac.id, "ac-format", "text must contain Given, when, then in that order", file);
    if (!isValidCheck(ac.check)) {
      sink.error(ac.id, "ac-check", `Check "${ac.check}" must be tests/<path> or <tool>:<name> with tool parity, lighthouse, axe or bundle`, file);
    }
  }
}

function checkFeatures(model: PrdModel, sink: Sink): void {
  const reference = model.root?.reference ?? [];
  const known = new Set([
    ...(model.discovery?.archetypes ?? []),
    ...(model.discovery?.journeys ?? []),
    ...(model.discovery?.interactions ?? []),
  ]);
  for (const feature of activeFeatures(model)) {
    if (feature.story.trim() === "") sink.error(feature.id, "story", "has no Story", feature.file);
    if (model.root && reference.length > 0) {
      if (feature.evidence.length === 0) sink.error(feature.id, "evidence", "has no Evidence id; the reference is not empty", feature.file);
      for (const e of feature.evidence) {
        if (!known.has(e)) sink.error(feature.id, "evidence", `Evidence ${e} is not in the discovery manifest`, feature.file);
      }
    }
  }
}

function checkSectionSize(model: PrdModel, sink: Sink): void {
  if (model.sections.length < 4 || model.sections.length > 10) {
    sink.warn("PRD", "section-size", `${model.sections.length} sections (expected 4-10)`, ROOT_FILE);
  }
  for (const section of model.sections) {
    const count = activeFeatures(model).filter((f) => f.section === section.id).length;
    if (count < 2 || count > 8) sink.warn(section.id, "section-size", `${count} active features (expected 2-8)`, section.file);
  }
}

function checkAssumptions(model: PrdModel, sink: Sink): void {
  for (const assumption of model.assumptions) {
    if (!ASSUMPTION_ID.test(assumption.id)) sink.error(assumption.id, "assumption-format", "id must be A-<nnn>", ASSUMPTIONS_FILE);
    if (!["low", "medium", "high"].includes(assumption.confidence)) {
      sink.error(assumption.id, "assumption-format", `confidence "${assumption.confidence}" must be low, medium or high`, ASSUMPTIONS_FILE);
    }
  }
}

function checkDependencies(model: PrdModel, sink: Sink): void {
  const root = model.root;
  const sectionIds = new Set([...model.sections.map((s) => s.id), ...(root?.sections ?? []).map((s) => s.code)]);
  const featureIds = new Set(model.features.map((f) => f.id));
  const taskIds = new Set(model.tasks.map((t) => t.id));

  for (const section of model.sections) {
    for (const dep of section.dependsOn) {
      if (!sectionIds.has(dep)) sink.error(section.id, "dep-unresolved", `depends on unknown section ${dep}`, section.file);
    }
  }
  for (const section of root?.sections ?? []) {
    for (const dep of section.dependsOn) {
      if (!sectionIds.has(dep)) sink.error(section.code, "dep-unresolved", `depends on unknown section ${dep}`, ROOT_FILE);
    }
  }
  for (const feature of model.features) {
    for (const dep of feature.dependsOn) {
      if (!featureIds.has(dep) && !taskIds.has(dep)) sink.error(feature.id, "dep-unresolved", `depends on unknown id ${dep}`, feature.file);
    }
  }
  for (const task of model.tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) sink.error(task.id, "dep-unresolved", `depends on unknown task ${dep}`, task.file);
    }
  }

  const sectionGraph = new Map(model.sections.map((s) => [s.id, { file: s.file, deps: s.dependsOn }] as const));
  const featureGraph = new Map(
    model.features.map((f) => [f.id, { file: f.file, deps: f.dependsOn.filter((d) => featureIds.has(d)) }] as const),
  );
  const taskGraph = new Map(
    model.tasks.map((t) => [t.id, { file: t.file, deps: t.dependsOn.filter((d) => taskIds.has(d)) }] as const),
  );
  reportCycles(sectionGraph, sink);
  reportCycles(featureGraph, sink);
  reportCycles(taskGraph, sink);
}

function reportCycles(graph: Map<string, { file: string; deps: string[] }>, sink: Sink): void {
  const seen = new Set<string>();
  for (const cycle of findCycles(graph)) {
    const start = cycle.indexOf(cycle.reduce((a, b) => (naturalCompare(a, b) <= 0 ? a : b)));
    const ring = [...cycle.slice(start), ...cycle.slice(0, start)];
    const chain = [...ring, ring[0]].join(" -> ");
    if (seen.has(chain)) continue;
    seen.add(chain);
    sink.error(ring[0], "dep-cycle", `cycle ${chain}`, graph.get(ring[0])?.file);
  }
}

function findCycles(graph: Map<string, { file: string; deps: string[] }>): string[][] {
  const state = new Map<string, "open" | "done">();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const visit = (node: string): void => {
    state.set(node, "open");
    stack.push(node);
    for (const dep of [...new Set(graph.get(node)?.deps ?? [])].sort(naturalCompare)) {
      if (!graph.has(dep)) continue;
      const seen = state.get(dep);
      if (seen === "open") cycles.push(stack.slice(stack.indexOf(dep)));
      else if (seen === undefined) visit(dep);
    }
    stack.pop();
    state.set(node, "done");
  };
  for (const node of [...graph.keys()].sort(naturalCompare)) {
    if (!state.has(node)) visit(node);
  }
  return cycles;
}

function checkTasks(model: PrdModel, opts: LintOptions, sink: Sink): void {
  const tasks = model.tasks.filter((t) => t.status === "active");
  const features = activeFeatures(model);
  const decomposed = new Set(opts.decomposed ?? (opts.features === undefined ? model.tasks.map((t) => t.milestone).filter((m) => m !== "") : []));
  const selected = new Set(opts.features ?? []);
  const complete = (feature: PrdFeature): boolean => decomposed.has(feature.milestone) || selected.has(feature.id);
  for (const id of selected) {
    if (!features.some((feature) => feature.id === id)) {
      sink.error(id, "task-scope", "selected feature is missing or inactive", "prd/prd.md");
    }
  }

  for (const task of tasks) {
    if (task.goal.trim() === "") sink.error(task.id, "task-fields", "missing Goal", task.file);
    if (task.area.length === 0) sink.error(task.id, "task-fields", "missing Area path", task.file);
    for (const area of task.area) {
      if (!isRelativePath(area)) sink.error(task.id, "task-fields", `Area "${area}" is not a valid relative path`, task.file);
    }
    if (task.satisfies.length === 0) sink.error(task.id, "task-fields", "missing Satisfies", task.file);
    if (task.tests.length === 0) sink.error(task.id, "task-fields", "missing Tests", task.file);
    for (const test of task.tests) {
      if (!isRelativePath(test)) sink.error(task.id, "task-fields", `Tests "${test}" is not a valid relative path`, task.file);
    }

    if (task.size !== "S" && task.size !== "M") {
      sink.error(task.id, "task-size", `Size "${task.size}" must be S or M; split L or empty tasks`, task.file);
    }

    const own = new Set(acsOf(model, task.feature).map((a) => a.id));
    for (const ac of task.satisfies) {
      if (!own.has(ac)) sink.error(task.id, "task-satisfies", `${ac} is not an acceptance criterion of ${task.feature}`, task.file);
    }
  }

  const milestoneIndex = (m: string): number => model.root?.milestones.indexOf(m) ?? -1;
  const featureById = new Map(model.features.map((f) => [f.id, f] as const));
  const taskById = new Map(model.tasks.map((t) => [t.id, t] as const));
  for (const feature of features) {
    for (const dep of feature.dependsOn) {
      const target = featureById.get(dep);
      if (target && milestoneIndex(feature.milestone) >= 0 && milestoneIndex(target.milestone) > milestoneIndex(feature.milestone)) {
        sink.error(feature.id, "dep-forward-milestone", `${feature.milestone} feature depends on ${dep} in ${target.milestone}`, feature.file);
      }
    }
  }
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      const target = taskById.get(dep);
      if (target && milestoneIndex(task.milestone) >= 0 && milestoneIndex(target.milestone) > milestoneIndex(task.milestone)) {
        sink.error(task.id, "dep-forward-milestone", `${task.milestone} task depends on ${dep} in ${target.milestone}`, task.file);
      }
    }
  }

  for (const feature of features) {
    if (!complete(feature)) continue;
    const count = tasks.filter((t) => t.feature === feature.id).length;
    if (count < 2 || count > 8) {
      sink.error(feature.id, "task-count", `has ${count} active tasks in selected scope (expected 2-8)`, feature.file);
    }
  }

  const satisfied = new Set(tasks.flatMap((t) => t.satisfies));
  for (const feature of features) {
    if (!complete(feature)) continue;
    for (const ac of acsOf(model, feature.id)) {
      if (!satisfied.has(ac.id)) sink.error(ac.id, "ac-uncovered", "is not satisfied by any active task", feature.file);
    }
  }
}

function activeFeatures(model: PrdModel): PrdFeature[] {
  return model.features.filter((f) => f.status === "active");
}

function acsOf(model: PrdModel, featureId: string): PrdAc[] {
  return model.acs.filter((a) => a.feature === featureId);
}

function featureFile(model: PrdModel, featureId: string): string {
  return model.features.find((f) => f.id === featureId)?.file ?? ROOT_FILE;
}

function codeOf(file: string): string {
  return (file.split("/").pop() ?? "").replace(/\.md$/, "");
}

function isChildId(id: string, prefix: string): boolean {
  return id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length));
}

// More than one dot is deeper than a task (LB-1.2.3, LB-1.AC1.x).
function isDeep(id: string): boolean {
  return (id.match(/\./g) ?? []).length > 1;
}

function isValidCheck(check: string): boolean {
  if (check.startsWith("tests/")) return check.length > "tests/".length && isRelativePath(check);
  return /^(parity|lighthouse|axe|bundle):\S+$/.test(check);
}

function isRelativePath(path: string): boolean {
  if (path === "" || path.startsWith("/") || path.includes("\\") || /^[A-Za-z]:/.test(path)) return false;
  const segments = path.replace(/\/+$/, "").split("/");
  return segments.every((segment) => segment !== "" && segment !== "..");
}

// ---------------------------------------------------------------------------------------------
// Index (spec 2.2)
// ---------------------------------------------------------------------------------------------

export function buildIndex(model: PrdModel): PrdIndex {
  const items: PrdIndexItem[] = [];
  for (const section of orderedSections(model)) {
    items.push({
      id: section.id,
      kind: "epic",
      parent: "PRD",
      title: section.title,
      milestone: section.milestone,
      dependsOn: section.dependsOn,
      file: section.file,
      anchor: slug([section.id, section.title].filter((part) => part !== "").join(" ")),
      hash: section.hash,
      status: "active",
    });
    for (const feature of byId(model.features.filter((f) => f.section === section.id))) {
      items.push({
        id: feature.id,
        kind: "feature",
        parent: section.id,
        title: feature.title,
        milestone: feature.milestone,
        dependsOn: feature.dependsOn,
        acs: byId(acsOf(model, feature.id)).map((a) => a.id),
        evidence: feature.evidence,
        file: feature.file,
        anchor: feature.anchor,
        hash: feature.hash,
        status: feature.status,
      });
      for (const task of byId(model.tasks.filter((t) => t.feature === feature.id))) {
        items.push({
          id: task.id,
          kind: "task",
          parent: feature.id,
          title: task.goal,
          milestone: task.milestone,
          dependsOn: task.dependsOn,
          area: task.area,
          satisfies: task.satisfies,
          tests: task.tests,
          size: task.size,
          file: task.file,
          anchor: task.anchor,
          hash: task.hash,
          status: task.status,
        });
      }
    }
  }

  const root = model.root;
  return {
    version: 1,
    root: root
      ? { id: root.id, title: root.title, milestones: root.milestones, hash: rootHash(root) }
      : null,
    items,
    acs: byId(model.acs).map((a) => ({ id: a.id, feature: a.feature, check: a.check })),
  };
}

function orderedSections(model: PrdModel): PrdSection[] {
  const order = (model.root?.sections ?? []).map((s) => s.code);
  const rank = (id: string): number => {
    const index = order.indexOf(id);
    return index < 0 ? order.length : index;
  };
  return [...model.sections].sort((a, b) => rank(a.id) - rank(b.id) || naturalCompare(a.id, b.id));
}

function rootHash(root: PrdRoot): string {
  const parity = Object.fromEntries(Object.entries(root.parityTarget).sort(([a], [b]) => compareText(a, b)));
  return itemHash(
    JSON.stringify({
      id: root.id,
      title: root.title,
      reference: root.reference,
      milestones: root.milestones,
      parityTarget: parity,
      journeys: root.journeys,
      sections: root.sections,
      headings: root.headings,
    }),
  );
}
