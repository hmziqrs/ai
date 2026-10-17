import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const names = new Set();
const colors = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);
for (const file of await readdir(resolve(root, "agents"))) {
  if (!file.endsWith(".md")) continue;
  const text = await readFile(resolve(root, "agents", file), "utf8");
  const front = text.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(front, `${file}: missing frontmatter`);
  const fields = Object.fromEntries([...front[1].matchAll(/^([A-Za-z]+):[ \t]*(.*)$/gm)].map((match) => [match[1], match[2]]));
  for (const field of ["name", "description", "model", "tools", "color"]) assert.ok(fields[field], `${file}: missing ${field}`);
  assert.equal(fields.name, file.slice(0, -3), `${file}: name mismatch`);
  assert.ok(!names.has(fields.name), `${file}: duplicate name`);
  names.add(fields.name);
  assert.ok(colors.has(fields.color), `${file}: invalid color`);
  assert.ok(["account:zai-individual-coding-plan/GLM-5.3", "account:zai-individual-coding-plan/GLM-5.3-Flash"].includes(fields.model), `${file}: unsupported model`);
  assert.equal(fields.injectAgentsMd, "true", `${file}: repository guidance must be injected`);
  assert.ok(JSON.parse(fields.tools).every((tool) => typeof tool === "string"), `${file}: invalid tool list`);
}

const canonicalPath = resolve(root, "skills/z-workflow/persona-kit.dwf.ts");
const liteflowPath = resolve(root, "skills/z-liteflow/liteflow-template.dwf.ts");
const canonical = await readFile(canonicalPath, "utf8");
const liteflow = await readFile(liteflowPath, "utf8");
const start = "// persona-kit:start v3";
const end = "// persona-kit:end v3";
const extract = (text) => {
  const from = text.indexOf(start);
  const to = text.indexOf(end, from);
  assert.notEqual(from, -1, "persona-kit start marker is missing");
  assert.notEqual(to, -1, "persona-kit end marker is missing");
  return text.slice(from, to + end.length);
};

assert.equal(extract(liteflow), extract(canonical), "Liteflow persona-kit copy differs from canonical");
const queue = await readFile(resolve(root, "workflows/shipflow-queue.dwf.ts"), "utf8");
assert.equal(extract(queue), extract(canonical), "Shipflow persona-kit copy differs from canonical");
assert.ok(liteflow.includes('loadPersona(IMPLEMENTER_PERSONA, { tier: "pro", access: "write" })'));
assert.ok(liteflow.includes('loadPersona(JUDGE_PERSONA, { tier: "pro", access: "read-only" })'));

const transpiler = new Bun.Transpiler({ loader: "ts", target: "bun" });
const compiled = transpiler.transformSync(canonical);
const statusParserSource = liteflow.match(/^function changedPaths[\s\S]*?^}/m);
assert.ok(statusParserSource, "Liteflow status parser is missing");
const parseStatus = new Function(transpiler.transformSync(statusParserSource[0]) + "\nreturn changedPaths;")();
assert.deepEqual(parseStatus(" M app.js\0?? name with spaces.txt\0"), ["app.js", "name with spaces.txt"]);
assert.deepEqual(parseStatus("R  target.txt\0a\0 M next.txt\0"), ["target.txt", "a", "next.txt"]);
assert.deepEqual(parseStatus("C  copy\0original\0"), ["copy", "original"]);
assert.throws(() => parseStatus("R  target.txt\0"), /Incomplete rename/);


function mockWorld(options = {}) {
  const docs = options.docs ?? {};
  const state = { statusCalls: 0 };
  const digest = (value) => Array.from(String(value), (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("").padEnd(64, "0").slice(0, 64);
  return {
    state,
    world: {
      async run(command, args) {
        if (command === "cat") {
          const text = docs[args[0]];
          return text === undefined ? { exitCode: 1, stdout: "", stderr: "missing" } : { exitCode: 0, stdout: text, stderr: "" };
        }
        if (command === "shasum") {
          const text = docs[args.at(-1)];
          if (options.personaHashFailure || text === undefined) return { exitCode: 1, stdout: "", stderr: "hash failed" };
          return { exitCode: 0, stdout: `${digest(text)}  ${args.at(-1)}\n`, stderr: "" };
        }
        throw new Error(`unexpected command ${command}`);
      },
    },
  };
}

async function evaluate(body, world) {
  globalThis.world = world;
  globalThis.model = (id) => ({ id });
  globalThis.agent = (name, options) => ({ name, options, ask: async () => ({}) });
  globalThis.writeFixture = writeFile;
  globalThis.retargetFixture = async (path) => {
    await unlink(path);
    await symlink("targets/b.txt", path);
  };
  globalThis.assert = assert;
  return await new Function("return (async () => {\n" + compiled + "\n" + body + "\n})()")();
}

const valid = "---\nname: specialist\nmodel: account:zai-individual-coding-plan/GLM-5.3-Flash\nthoughtLevel: high\ntools: [bash]\n---\nReview carefully.";

{
  const { world } = mockWorld({ docs: { "/persona.md": valid } });
  await evaluate(`
    const p = await loadPersona("/persona.md", { tier: "pro", access: "read-only" });
    assert.equal(p.modelId, "account:zai-individual-coding-plan/GLM-5.3$high");
    assert.ok(p.note.includes("forced from account:zai-individual-coding-plan/GLM-5.3-Flash"));
    const review = personaAgent(p, "review");
    assert.match(review.options.system, /read-only/);
    assert.match(review.options.system, /Git state, external services/);
    assert.deepEqual(p.tools, ["bash"]);
  `, world);
}

for (const [path, contents] of [
  ["/missing.md", undefined],
  ["/empty-body.md", "---\nmodel: account:zai-individual-coding-plan/GLM-5.3\n---\n  "],
  ["/no-model.md", "---\nname: bad\n---\nBody."],
  ["/unsupported.md", "---\nmodel: unsupported\n---\nBody."],
]) {
  const docs = contents === undefined ? {} : { [path]: contents };
  await evaluate(`
    const p = await loadPersona(${JSON.stringify(path)}, { tier: "pro", access: "read-only" });
    assert.equal(p, undefined);
    assert.equal(personaLoaded.length, 0);
    assert.equal(personaFindings.length, 1);
  `, mockWorld({ docs }).world);
}

{
  await evaluate(`
    const p = await loadPersona("/bad-model.md", { tier: "pro", access: "write" });
    assert.equal(p, undefined);
  `, mockWorld({ docs: { "/bad-model.md": valid.replace("GLM-5.3-Flash", "other") } }).world);
}

{
  await evaluate(`
    const p = await loadPersona("/hash-failure.md", { tier: "any", access: "read-only" });
    assert.equal(p, undefined);
    assert.match(personaFindings[0].what, /hash/);
  `, mockWorld({ docs: { "/hash-failure.md": valid }, personaHashFailure: true }).world);
}

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

async function makeRepo(parent, name, files = { "src/file.txt": "committed" }) {
  const repo = join(parent, name);
  await mkdir(repo, { recursive: true });
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "persona-check@example.invalid");
  git(repo, "config", "user.name", "Persona Check");
  for (const [path, contents] of Object.entries(files)) {
    const full = join(repo, path);
    await mkdir(resolve(full, ".."), { recursive: true });
    await writeFile(full, contents);
  }
  git(repo, "add", "--all");
  git(repo, "commit", "-qm", "fixture baseline");
  return repo;
}

function repoWorld(docs = {}) {
  return {
    async run(command, args) {
      if (command === "cat") {
        const text = docs[args[0]];
        return text === undefined ? { exitCode: 1, stdout: "", stderr: "missing" } : { exitCode: 0, stdout: text, stderr: "" };
      }
      if (command === "shasum") {
        const text = docs[args.at(-1)];
        if (text === undefined) return { exitCode: 1, stdout: "", stderr: "missing" };
        const hash = createHash("sha256").update(text).digest("hex");
        return { exitCode: 0, stdout: `${hash}  ${args.at(-1)}\n`, stderr: "" };
      }
      if (command === "python3") {
        try {
          const stdout = execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
          return { exitCode: 0, stdout, stderr: "" };
        } catch (error) {
          return { exitCode: error.status ?? 1, stdout: error.stdout?.toString() ?? "", stderr: error.stderr?.toString() ?? error.message };
        }
      }
      throw new Error(`unexpected command ${command}`);
    },
  };
}

function failSnapshot(world, failAt) {
  let calls = 0;
  return {
    async run(command, args) {
      if (command === "python3" && ++calls === failAt) return { exitCode: 1, stdout: "", stderr: "fixture snapshot failure" };
      return await world.run(command, args);
    },
  };
}

async function withFixture(callback) {
  const base = await mkdtemp(join(tmpdir(), "zcode-persona-check-"));
  try {
    await callback(base);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
}

async function checkNoop(repo) {
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    const result = await guardWrites(p, ${JSON.stringify(repo)}, async () => "unchanged");
    assert.equal(result, "unchanged");
    assert.equal(personaFindings.length, 0);
  `, repoWorld({ "/review.md": valid }));
}

await withFixture(async (base) => {
  const repo = await makeRepo(base, "deleted-before-review", { "src/keep.txt": "keep", "src/deleted.txt": "delete me" });
  await unlink(join(repo, "src/deleted.txt"));
  await checkNoop(repo);
});

await withFixture(async (base) => {
  const repo = await makeRepo(base, "same-status-edit");
  await writeFile(join(repo, "src/file.txt"), "already dirty");
  const beforeStatus = git(repo, "status", "--porcelain", "--untracked-files=all");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    let guardError;
    try {
      await guardWrites(p, ${JSON.stringify(repo)}, async () => { await globalThis.writeFixture(${JSON.stringify(join(repo, "src/file.txt"))}, "different dirty bytes"); });
    } catch (error) { guardError = error; }
    assert.match(String(guardError), /changed repository state/);
    assert.match(personaFindings[0].what, /changed repository state/);
  `, repoWorld({ "/review.md": valid }));
  const afterStatus = git(repo, "status", "--porcelain", "--untracked-files=all");
  assert.equal(afterStatus, beforeStatus, "the fixture mutation should preserve Git's status classification");
});

await withFixture(async (base) => {
  const repo = await makeRepo(base, "symlink-retarget", { "targets/a.txt": "same bytes", "targets/b.txt": "same bytes" });
  await symlink("targets/a.txt", join(repo, "current.txt"));
  git(repo, "add", "current.txt");
  git(repo, "commit", "-qm", "link baseline");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    let guardError;
    try {
      await guardWrites(p, ${JSON.stringify(repo)}, async () => globalThis.retargetFixture(${JSON.stringify(join(repo, "current.txt"))}));
    } catch (error) { guardError = error; }
    assert.match(String(guardError), /changed repository state/);
    assert.match(personaFindings[0].what, /changed repository state/);
  `, repoWorld({ "/review.md": valid }));
});

await withFixture(async (base) => {
  const sub = await makeRepo(base, "submodule-source", { "nested.txt": "nested baseline" });
  const repo = await makeRepo(base, "submodule-parent", { "root.txt": "root baseline" });
  git(repo, "-c", "protocol.file.allow=always", "submodule", "add", "-q", sub, "vendor/sub");
  git(repo, "commit", "-qam", "add submodule");
  await checkNoop(repo);
  await writeFile(join(repo, "vendor/sub/nested.txt"), "already dirty");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    await assert.rejects(() => guardWrites(p, ${JSON.stringify(repo)}, async () => {
      await globalThis.writeFixture(${JSON.stringify(join(repo, "vendor/sub/nested.txt"))}, "different dirty bytes");
    }), /changed repository state/);
  `, repoWorld({ "/review.md": valid }));
  await rm(join(repo, "vendor/sub"), { recursive: true, force: true });
  await checkNoop(repo);
  await mkdir(join(repo, "vendor/sub"));
  await checkNoop(repo);
});

await withFixture(async (base) => {
  const repo = await makeRepo(base, "preserve-work-error");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    await assert.rejects(() => guardWrites(p, ${JSON.stringify(repo)}, async () => { throw new Error("review callback failed"); }), /review callback failed/);
    assert.equal(personaFindings.length, 0);
  `, repoWorld({ "/review.md": valid }));
});

await withFixture(async (base) => {
  const repo = await makeRepo(base, "baseline-failure");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    let ran = false;
    await assert.rejects(() => guardWrites(p, ${JSON.stringify(repo)}, async () => { ran = true; }), /fixture snapshot failure/);
    assert.equal(ran, false);
    assert.match(personaFindings[0].what, /could not establish a baseline/);
  `, failSnapshot(repoWorld({ "/review.md": valid }), 1));
});

await withFixture(async (base) => {
  const repo = await makeRepo(base, "final-check-failure");
  await evaluate(`
    const p = await loadPersona("/review.md", { access: "read-only" });
    await assert.rejects(() => guardWrites(p, ${JSON.stringify(repo)}, async () => "work result"), /fixture snapshot failure/);
    assert.match(personaFindings[0].what, /could not verify the final state/);
  `, failSnapshot(repoWorld({ "/review.md": valid }), 2));
});

console.log("Persona kit validation passed: exact embedded copy, authority restrictions, fail-closed loading, deletion baselines, content and symlink identity, initialized/uninitialized submodules, and read-only no-op/error paths.");
