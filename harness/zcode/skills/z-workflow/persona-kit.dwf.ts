// persona-kit:start v2
// Canonical source: z-workflow/persona-kit.dwf.ts. Paste this block unchanged, from the
// start marker to the end marker, into any workflow script that wants specialist
// subagents built from agent files. Scripts cannot import, so the block is copied; the
// drift check in z-workflow's SKILL.md compares its sha256 with the canonical file.
//
// Use:
//   const reviewer = await loadPersona("/abs/path/agents/svelte-review.md");
//   if (reviewer !== undefined) {
//     const v = await guardWrites(reviewer, WT, () =>
//       personaAgent(reviewer, "svelte-review-r1", RUN_RULES).ask<Verdict>("..."));
//   }
//   ... findings: [...yourFindings, ...personaFindings], report lines: personaReport()
//
// Verified behaviour (probe dwfrun-ee616ce6): the body becomes the system prompt and is
// followed; the frontmatter model is honoured; tools: is NOT enforced inside workflows
// (every subagent gets every tool), so read-only personas are guarded by git status;
// AGENTS.md is injected automatically. The $level suffix compiles; its effect on reasoning
// effort is not observable, so treat it as unverified.

/** Every model a persona may resolve to. model() takes literals only, so all are declared. */
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

/** Tools that can change files; a persona listing none of them (and not "*") is read-only. */
const PERSONA_WRITE_TOOLS = ["*", "write", "edit", "multiedit", "notebookedit", "bash"];

interface Persona {
  /** Frontmatter name, or the file name when the field is missing. */
  name: string;
  /** The path the persona was loaded from. */
  path: string;
  /** sha256 of the file as loaded. */
  sha256: string;
  /** The body after the frontmatter: the system prompt. */
  system: string;
  /** The model key used, with its $level when present. */
  modelId: string;
  /** The declared model for that key. */
  model: ModelRef;
  /** Tools listed in the frontmatter (advisory only inside workflows). */
  tools: string[];
  /** True when the listed tools cannot change files; guardWrites then checks for changes. */
  readOnly: boolean;
  /** Empty, or what the kit changed (for example a model forced by the run's profile). */
  note: string;
}

interface PersonaFinding {
  /** File or directory the finding is about. */
  where: string;
  /** One sentence: what happened. */
  what: string;
  /** The command output that shows it. */
  evidence: string;
  /** Kit findings come from commands, so they are verified. */
  status: "verified";
}

/** Findings the kit recorded; add them to the run's findings. */
const personaFindings: PersonaFinding[] = [];
/** Every persona that loaded; personaReport() lists them. */
const personaLoaded: Persona[] = [];

function personaField(front: string[], key: string): string {
  for (const line of front) {
    if (line.startsWith(key + ":")) return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function personaToolList(raw: string): string[] {
  return raw.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim().replace(/^["']|["']$/g, "")).filter((t) => t !== "");
}

/**
 * Load an agent file as a persona. `tier` forces the model family for the run's profile
 * ("pro" for z-proflow, "flash" for z-flashflow), keeping the file's $level; "any" keeps
 * the file's model. Returns undefined, with a finding, when the file is missing, empty,
 * has no frontmatter or body, or names a model the kit does not declare.
 */
async function loadPersona(path: string, opts?: { tier?: "any" | "pro" | "flash" }): Promise<Persona | undefined> {
  const tier = opts?.tier ?? "any";
  const read = await world.run("cat", [path]);
  if (read.exitCode !== 0 || read.stdout.trim() === "") {
    personaFindings.push({ where: path, what: "Persona file could not be read; that role did not run", evidence: "cat exit " + String(read.exitCode) + ": " + read.stderr.slice(0, 200), status: "verified" });
    return undefined;
  }
  const lines = read.stdout.split("\n");
  const end = lines[0].trim() === "---" ? lines.indexOf("---", 1) : -1;
  const body = end > 0 ? lines.slice(end + 1).join("\n").trim() : "";
  if (end <= 0 || body === "") {
    personaFindings.push({ where: path, what: "Persona file has no frontmatter or no body; that role did not run", evidence: "first line " + JSON.stringify(lines[0]) + ", closing marker " + String(end), status: "verified" });
    return undefined;
  }
  const front = lines.slice(1, end);
  const fileModel = personaField(front, "model");
  const level = personaField(front, "thoughtLevel");
  let base = fileModel;
  let note = "";
  if (tier !== "any") {
    const forced = tier === "pro" ? "account:zai-individual-coding-plan/GLM-5.3" : "account:zai-individual-coding-plan/GLM-5.3-Flash";
    if (base !== forced) {
      note = "model forced from " + (base === "" ? "(none)" : base) + " to " + forced + " by the run's " + tier + " profile";
      base = forced;
    }
  }
  const key = level === "" ? base : base + "$" + level;
  const ref = PERSONA_MODELS[key];
  if (ref === undefined) {
    personaFindings.push({ where: path, what: "Persona names a model the kit does not declare; that role did not run", evidence: "wanted " + JSON.stringify(key) + "; declared: " + Object.keys(PERSONA_MODELS).join(", "), status: "verified" });
    return undefined;
  }
  const sum = await world.run("shasum", ["-a", "256", path]);
  const tools = personaToolList(personaField(front, "tools"));
  const persona: Persona = {
    name: personaField(front, "name") || path.split("/").pop() || path,
    path,
    sha256: sum.exitCode === 0 ? sum.stdout.split(" ")[0] : "shasum exit " + String(sum.exitCode),
    system: body,
    modelId: key,
    model: ref,
    tools,
    readOnly: tools.length > 0 && !tools.some((t) => PERSONA_WRITE_TOOLS.includes(t.toLowerCase())),
    note,
  };
  personaLoaded.push(persona);
  return persona;
}

/**
 * A subagent driven by the persona. `name` must be unique in the run (add the round).
 * `rules` are the run's own rules for this role (worktree path, never run git, escalate
 * when impossible); they follow the persona body, so the run's rules come last.
 */
function personaAgent(p: Persona, name: string, rules?: string): Agent {
  const system = rules === undefined || rules.trim() === "" ? p.system : p.system + "\n\n## Rules for this run\n" + rules.trim();
  return agent(name, { system, model: p.model });
}

/** NUL, the separator of `git status -z`. Built from its code so retyping cannot mangle it. */
const PERSONA_NUL = String.fromCharCode(0);

function personaStatusEntries(z: string): string[] {
  return z.split(PERSONA_NUL).filter((e) => e.length > 3);
}

/**
 * Run `work` and, when the persona is read-only, compare `git status --porcelain -z` in
 * `dir` before and after; any new change is a finding. Use it only while no other writer
 * runs in `dir`, or another writer's changes will be reported as the persona's.
 */
async function guardWrites<T>(p: Persona, dir: string, work: () => PromiseLike<T>): Promise<T> {
  if (!p.readOnly) return await work();
  const before = await world.run("git", ["-C", dir, "status", "--porcelain", "-z"]);
  const result = await work();
  const after = await world.run("git", ["-C", dir, "status", "--porcelain", "-z"]);
  if (before.exitCode !== 0 || after.exitCode !== 0) {
    personaFindings.push({ where: dir, what: "Read-only guard could not run git status for " + p.name, evidence: "exit " + String(before.exitCode) + "/" + String(after.exitCode), status: "verified" });
    return result;
  }
  const was = personaStatusEntries(before.stdout);
  const changed = personaStatusEntries(after.stdout).filter((e) => !was.includes(e)).map((e) => e.slice(3));
  if (changed.length > 0) {
    personaFindings.push({ where: dir, what: "Read-only persona " + p.name + " changed files: " + changed.join(", "), evidence: "git status --porcelain -z before and after its asks", status: "verified" });
  }
  return result;
}

/** One line per loaded persona, for the report and the pre-launch command set. */
function personaReport(): string[] {
  return personaLoaded.map((p) => p.name + ": " + p.path + " sha256 " + p.sha256 + ", model " + p.modelId + (p.readOnly ? ", read-only (guarded)" : "") + (p.note === "" ? "" : "; " + p.note));
}
// persona-kit:end v2
