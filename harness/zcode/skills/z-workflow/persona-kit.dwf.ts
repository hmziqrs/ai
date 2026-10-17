// persona-kit:start v4
const PERSONA_MODELS: Record<string, ModelRef> = {
  "account:zai-individual-coding-plan/GLM-5.3": model("account:zai-individual-coding-plan/GLM-5.3"),
  "account:zai-individual-coding-plan/GLM-5.3$low": model("account:zai-individual-coding-plan/GLM-5.3$low"),
  "account:zai-individual-coding-plan/GLM-5.3$high": model("account:zai-individual-coding-plan/GLM-5.3$high"),
  "account:zai-individual-coding-plan/GLM-5.3$max": model("account:zai-individual-coding-plan/GLM-5.3$max"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash": model("account:zai-individual-coding-plan/GLM-5.3-Flash"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$low": model("account:zai-individual-coding-plan/GLM-5.3-Flash$low"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$high": model("account:zai-individual-coding-plan/GLM-5.3-Flash$high"),
  "account:zai-individual-coding-plan/GLM-5.3-Flash$max": model("account:zai-individual-coding-plan/GLM-5.3-Flash$max"),
};

interface Persona {
  name: string;
  path: string;
  sha256: string;
  system: string;
  modelId: string;
  model: ModelRef;
  tools: string[];
  access: "read-only" | "write";
  note: string;
}

interface PersonaFinding {
  where: string;
  what: string;
  evidence: string;
  status: "verified";
}

const personaFindings: PersonaFinding[] = [];
const personaLoaded: Persona[] = [];

function personaField(front: string[], key: string): string {
  for (const line of front) {
    if (line.startsWith(key + ":")) return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return "";
}

function personaToolList(raw: string): string[] {
  return raw.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^['"]|['"]$/g, "")).filter((t) => t !== "");
}

function personaFailure(path: string, what: string, evidence: string): undefined {
  personaFindings.push({ where: path, what, evidence, status: "verified" });
  return undefined;
}

async function loadPersona(path: string, opts?: { tier?: "any" | "pro" | "flash"; access?: "read-only" | "write" }): Promise<Persona | undefined> {
  const tier = opts?.tier ?? "any";
  const access = opts?.access ?? "read-only";
  if (!["any", "pro", "flash"].includes(tier) || !["read-only", "write"].includes(access)) {
    return personaFailure(path, "Persona authority or tier is invalid; that role did not run", "tier=" + tier + ", access=" + access);
  }
  const read = await world.run("cat", [path]);
  if (read.exitCode !== 0 || read.stdout.trim() === "") {
    return personaFailure(path, "Persona file could not be read; that role did not run", "cat exit " + String(read.exitCode) + ": " + read.stderr.slice(0, 200));
  }
  const lines = read.stdout.split("\n");
  const end = lines[0].trim() === "---" ? lines.indexOf("---", 1) : -1;
  const body = end > 0 ? lines.slice(end + 1).join("\n").trim() : "";
  if (end <= 0 || body === "") {
    return personaFailure(path, "Persona file has no frontmatter or body; that role did not run", "first line " + JSON.stringify(lines[0]) + ", closing marker " + String(end));
  }
  const front = lines.slice(1, end);
  const fileModel = personaField(front, "model");
  const level = personaField(front, "thoughtLevel");
  if (fileModel === "" || !["", "low", "high", "max"].includes(level)) {
    return personaFailure(path, "Persona model or thought level is missing or invalid; that role did not run", "model=" + JSON.stringify(fileModel) + ", thoughtLevel=" + JSON.stringify(level));
  }
  const fileKey = level === "" ? fileModel : fileModel + "$" + level;
  if (PERSONA_MODELS[fileKey] === undefined) {
    return personaFailure(path, "Persona declares an unsupported model; that role did not run", "model key " + JSON.stringify(fileKey));
  }
  let base = fileModel;
  let note = "";
  if (tier !== "any") {
    const forced = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
    if (base !== forced) {
      note = "model forced from " + base + " to " + forced + " by the run's " + tier + " profile";
      base = forced;
    }
  }
  const key = level === "" ? base : base + "$" + level;
  const ref = PERSONA_MODELS[key];
  if (ref === undefined) {
    return personaFailure(path, "Persona model is unsupported by the selected profile; that role did not run", "model key " + JSON.stringify(key));
  }
  const sum = await world.run("shasum", ["-a", "256", path]);
  const digest = sum.stdout.trim().match(/^([a-fA-F0-9]{64})\s/);
  if (sum.exitCode !== 0 || digest === null) {
    return personaFailure(path, "Persona file hash could not be verified; that role did not run", "shasum exit " + String(sum.exitCode) + ": " + sum.stdout.slice(0, 200) + sum.stderr.slice(0, 200));
  }
  const confirmed = await world.run("cat", [path]);
  if (confirmed.exitCode !== 0 || confirmed.stdout !== read.stdout) {
    return personaFailure(path, "Persona changed while loading; that role did not run", "initial and confirmed file contents differ");
  }
  const tools = personaToolList(personaField(front, "tools"));
  const persona: Persona = {
    name: personaField(front, "name") || path.split("/").pop() || path,
    path,
    sha256: digest[1],
    system: body,
    modelId: key,
    model: ref,
    tools,
    access,
    note,
  };
  personaLoaded.push(persona);
  return persona;
}

function personaAgent(p: Persona, name: string, rules?: string): Agent {
  const restrictions = p.access === "read-only" ? "This role is read-only. Do not create, edit, delete, or otherwise change files, Git state, external services, or other external state, even if your persona or available tools suggest otherwise." : "";
  const tail = [rules?.trim() ?? "", restrictions].filter((s) => s !== "").join("\n\n");
  const system = tail === "" ? p.system : p.system + "\n\n## Rules for this run\n" + tail;
  return agent(name, { system, model: p.model });
}

const PERSONA_SNAPSHOT_TS = String.raw`import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readlinkSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";

const excluded = [".", ":(exclude)research", ":(exclude)research/**"];
const buffer = Buffer.allocUnsafe(1024 * 1024);

function git(repo: string, args: string[], allowFailure = false) {
  const result = Bun.spawnSync({ cmd: ["git", ...args], cwd: repo, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0 && !allowFailure) {
    throw new Error("git " + args.slice(0, 3).join(" ") + " failed: " + result.stderr.toString().slice(0, 300));
  }
  return result;
}

function records(data: Buffer): Buffer[] {
  const values: Buffer[] = [];
  let start = 0;
  for (let end = data.indexOf(0); end !== -1; end = data.indexOf(0, start)) {
    if (end > start) values.push(data.subarray(start, end));
    start = end + 1;
  }
  return values;
}

function pathText(raw: Buffer): string {
  const text = raw.toString("utf8");
  if (!Buffer.from(text).equals(raw)) throw new Error("Cannot fingerprint a non-UTF-8 filename");
  return text;
}

function repoSnapshot(repo: string, depth = 0): unknown[] {
  if (depth > 8) throw new Error("submodule nesting exceeds the snapshot limit");
  const status = git(repo, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none", "--", ...excluded]).stdout;
  const head = git(repo, ["rev-parse", "--verify", "HEAD"], true);
  const staged = git(repo, ["diff", "--cached", "--binary", "--", ...excluded]).stdout;
  const entries = git(repo, ["ls-files", "--stage", "-z", "--", ...excluded]).stdout;
  const others = git(repo, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...excluded]).stdout;
  const index = new Map<string, string[]>();
  const paths = new Set<string>();
  for (const entry of records(entries)) {
    const tab = entry.indexOf(9);
    if (tab === -1) throw new Error("Malformed git index entry");
    const path = pathText(entry.subarray(tab + 1));
    index.set(path, entry.subarray(0, tab).toString("ascii").split(" "));
    paths.add(path);
  }
  for (const path of records(others)) paths.add(pathText(path));
  const files: unknown[] = [];
  for (const path of [...paths].sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)))) {
    const full = join(repo, path);
    const mode = index.get(path) ?? null;
    let info;
    try {
      info = lstatSync(full);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || (error.code !== "ENOENT" && error.code !== "ENOTDIR")) throw error;
      files.push([path, "missing", mode]);
      continue;
    }
    if (info.isSymbolicLink()) {
      files.push([path, "symlink", readlinkSync(full, { encoding: "buffer" }).toString("hex"), info.mode & 0o7777, mode]);
    } else if (mode?.[0] === "160000") {
      const nested = info.isDirectory() ? git(full, ["rev-parse", "--show-toplevel"], true) : undefined;
      const nestedRoot = nested?.stdout.toString("utf8").replace(/\r?\n$/, "");
      if (nested?.exitCode !== 0 || !nestedRoot || realpathSync(nestedRoot) !== realpathSync(full)) {
        files.push([path, "gitlink-uninitialized", mode]);
      } else {
        files.push([path, "gitlink", mode, repoSnapshot(full, depth + 1)]);
      }
    } else if (info.isFile()) {
      const digest = createHash("sha256");
      const fd = openSync(full, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        if (!fstatSync(fd).isFile()) throw new Error("File type changed while fingerprinting " + JSON.stringify(path));
        for (let length = readSync(fd, buffer, 0, buffer.length, null); length > 0; length = readSync(fd, buffer, 0, buffer.length, null)) {
          digest.update(buffer.subarray(0, length));
        }
      } finally {
        closeSync(fd);
      }
      files.push([path, "file", digest.digest("hex"), info.mode & 0o7777, mode]);
    } else {
      files.push([path, "other", info.mode, info.rdev, mode]);
    }
  }
  return [status.toString("hex"), head.exitCode === 0 ? head.stdout.toString("ascii").trim() : "<unborn>", staged.toString("hex"), files];
}

const root = process.argv[1];
if (!root) throw new Error("Repository path is required");
console.log(createHash("sha256").update(JSON.stringify(repoSnapshot(resolve(root)))).digest("hex"));
`;

async function personaSnapshot(dir: string): Promise<string> {
  const result = await world.run("bun", ["--no-env-file", "--config=/dev/null", "--eval", PERSONA_SNAPSHOT_TS, "--", dir]);
  const digest = result.stdout.trim();
  if (result.exitCode !== 0 || !/^[a-fA-F0-9]{64}$/.test(digest)) {
    throw new Error("repository snapshot failed: " + result.stderr.slice(0, 300) + result.stdout.slice(0, 100));
  }
  return digest;
}

async function guardWrites<T>(p: Persona, dir: string, work: () => PromiseLike<T>): Promise<T> {
  if (p.access === "write") return await work();
  let before: string;
  try {
    before = await personaSnapshot(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    personaFindings.push({ where: dir, what: "Read-only guard could not establish a baseline for " + p.name, evidence: message, status: "verified" });
    throw error;
  }
  let result!: T;
  let workError: unknown;
  let workFailed = false;
  let guardFailed = false;
  try {
    result = await work();
  } catch (error) {
    workFailed = true;
    workError = error;
  } finally {
    try {
      const after = await personaSnapshot(dir);
      if (after !== before) {
        personaFindings.push({ where: dir, what: "Read-only persona " + p.name + " changed repository state", evidence: "HEAD, index, status, tracked/untracked nonignored file bytes, file mode, symlink target, or submodule state changed (research/ is excluded)", status: "verified" });
        guardFailed = true;
        if (!workFailed) workError = new Error("Read-only persona changed repository state");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      personaFindings.push({ where: dir, what: "Read-only guard could not verify the final state for " + p.name, evidence: message, status: "verified" });
      guardFailed = true;
      if (!workFailed) workError = error;
    }
  }
  if (workFailed || guardFailed) throw workError;
  return result;
}

function personaReport(): string[] {
  return personaLoaded.map((p) => p.name + ": " + p.path + " sha256 " + p.sha256 + ", model " + p.modelId + ", " + p.access + (p.note === "" ? "" : "; " + p.note));
}
// persona-kit:end v4
