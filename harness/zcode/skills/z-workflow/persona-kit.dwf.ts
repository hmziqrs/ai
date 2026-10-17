// persona-kit:start v3
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

const PERSONA_SNAPSHOT_PY = String.raw`import hashlib
import json
import os
import stat
import subprocess
import sys

EXCLUDED = [".", ":(exclude)research", ":(exclude)research/**"]
MAX_SUBMODULE_DEPTH = 8

def git(repo, *args, allow_failure=False):
    result = subprocess.run(["git", *args], cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode and not allow_failure:
        raise RuntimeError("git " + " ".join(args[:3]) + " failed: " + result.stderr.decode("utf-8", "replace")[:300])
    return result

def repo_snapshot(repo, depth=0):
    if depth > MAX_SUBMODULE_DEPTH:
        raise RuntimeError("submodule nesting exceeds the snapshot limit")
    status = git(repo, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none", "--", *EXCLUDED).stdout
    head_result = git(repo, "rev-parse", "--verify", "HEAD", allow_failure=True)
    head = head_result.stdout.strip() if head_result.returncode == 0 else b"<unborn>"
    staged = git(repo, "diff", "--cached", "--binary", "--", *EXCLUDED).stdout
    entries = git(repo, "ls-files", "--stage", "-z", "--", *EXCLUDED).stdout
    others = git(repo, "ls-files", "--others", "--exclude-standard", "-z", "--", *EXCLUDED).stdout
    index = {}
    paths = set()
    for entry in entries.split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, object_id, stage = metadata.split(b" ", 2)
        path = os.fsdecode(raw_path)
        index[path] = (mode.decode("ascii"), object_id.decode("ascii"), stage.decode("ascii"))
        paths.add(path)
    paths.update(os.fsdecode(path) for path in others.split(b"\0") if path)
    files = []
    for path in sorted(paths, key=os.fsencode):
        full = os.path.join(repo, path)
        try:
            info = os.lstat(full)
        except FileNotFoundError:
            files.append([path, "missing", index.get(path)])
            continue
        mode = index.get(path)
        if stat.S_ISLNK(info.st_mode):
            files.append([path, "symlink", os.readlink(full), stat.S_IMODE(info.st_mode), mode])
        elif mode is not None and mode[0] == "160000":
            if not stat.S_ISDIR(info.st_mode):
                files.append([path, "gitlink-uninitialized", mode])
            else:
                nested = git(full, "rev-parse", "--show-toplevel", allow_failure=True)
                if nested.returncode != 0 or os.path.realpath(os.fsdecode(nested.stdout.strip())) != os.path.realpath(full):
                    files.append([path, "gitlink-uninitialized", mode])
                else:
                    files.append([path, "gitlink", mode, repo_snapshot(full, depth + 1)])
        elif stat.S_ISREG(info.st_mode):
            digest = hashlib.sha256()
            flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            fd = os.open(full, flags)
            try:
                current = os.fstat(fd)
                if not stat.S_ISREG(current.st_mode):
                    raise RuntimeError("file type changed while fingerprinting " + repr(path))
                while True:
                    chunk = os.read(fd, 1024 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
            finally:
                os.close(fd)
            files.append([path, "file", digest.hexdigest(), stat.S_IMODE(info.st_mode), mode])
        else:
            files.append([path, "other", info.st_mode, info.st_rdev, mode])
    return [status.hex(), head.decode("ascii", "replace"), staged.hex(), files]

snapshot = json.dumps(repo_snapshot(os.path.abspath(sys.argv[1])), ensure_ascii=True, separators=(",", ":")).encode("ascii")
print(hashlib.sha256(snapshot).hexdigest())
`;

async function personaSnapshot(dir: string): Promise<string> {
  const result = await world.run("python3", ["-c", PERSONA_SNAPSHOT_PY, dir]);
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
// persona-kit:end v3
