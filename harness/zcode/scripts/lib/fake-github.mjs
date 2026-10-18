// In-memory GitHub fake: it interprets only the GitHub kit's argv table and throws "unsupported gh argv" on anything else.
// Used by the kit checker (check-github-kit.mjs) and the autopilot checker.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const REPO = "acme/site";
export const LOGIN = "autopilot-builder[bot]";
export const REQUIRED = ["ci", "acceptance", "parity", "ai-review"];
export const OWNER = REPO.split("/")[0];
export const STATUS_STATES = { success: "SUCCESS", failure: "FAILURE", pending: "PENDING", error: "ERROR" };
export const NOW = 1792324800;

export const FIELDS = {
  view: "number,title,state,labels,assignees,body,updatedAt,milestone",
  list: "number,title,state,labels,body,createdAt,milestone",
  prListHead: "number,url,headRefOid",
  prListOpen: "number,headRefName,isDraft",
  prFacts: "number,state,isDraft,headRefOid,headRefName,baseRefName,mergeable,mergeStateStatus,statusCheckRollup,reviewDecision,author",
  prMerge: "state,mergeCommit",
};

export function sha1Hex(label) {
  return createHash("sha1").update(label).digest("hex");
}
export const isoAt = (epoch) => new Date(epoch * 1000).toISOString().replace(".000Z", "Z");
export const restId = (number) => 900000 + number * 7;
export const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const issueUrl = (n) => `https://github.com/${REPO}/issues/${n}`;
export const prUrl = (n) => `https://github.com/${REPO}/pull/${n}`;
export const ok = (stdout = "") => ({ exitCode: 0, stdout, stderr: "" });
export const fail = (stderr) => ({ exitCode: 1, stdout: "", stderr });
export const json = (value) => ok(`${JSON.stringify(value)}\n`);
export const positive = (token) => (typeof token === "string" && /^[1-9][0-9]*$/.test(token) ? Number(token) : null);
export const greenRollup = () => REQUIRED.map((name) => ({ name, status: "COMPLETED", conclusion: "SUCCESS" }));

export const toPending = (entry) => ("context" in entry ? { ...entry, state: "PENDING" } : { ...entry, status: "QUEUED", conclusion: "" });

export async function readOrNull(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return null;
  }
}

export function flags(tokens, spec) {
  const out = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const name = tokens[i];
    if (!Object.hasOwn(spec, name)) return null;
    if (spec[name] === "bool") {
      out[name] = true;
      continue;
    }
    i += 1;
    if (i >= tokens.length) return null;
    if (spec[name] === "many") out[name] = [...(out[name] ?? []), tokens[i]];
    else if (Object.hasOwn(out, name)) return null;
    else out[name] = tokens[i];
  }
  return out;
}

export function parseApi(tokens) {
  let method = "GET";
  let path = null;
  const seen = [];
  const fields = {};
  let input = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-X") {
      i += 1;
      method = tokens[i];
    } else if (token === "-F" || token === "-f") {
      i += 1;
      const eq = (tokens[i] ?? "").indexOf("=");
      if (eq <= 0) return null;
      fields[tokens[i].slice(0, eq)] = tokens[i].slice(eq + 1);
    } else if (token === "--input" && input === null && tokens[i + 1] !== undefined) {
      i += 1;
      input = tokens[i];
    } else if (token === "--paginate" || token === "--slurp") {
      seen.push(token);
    } else if (path === null && !token.startsWith("-")) {
      path = token;
    } else {
      return null;
    }
  }
  if (path === null) return null;
  const paged = seen.includes("--paginate") && seen.includes("--slurp") && seen.length === 2;
  if (seen.length !== 0 && !paged) return null;
  const keys = Object.keys(fields);
  const noFields = keys.length === 0;
  const onlyKey = (name) => keys.length === 1 && keys[0] === name;
  const at = (pattern) => path.match(new RegExp(`^repos/${escapeRe(REPO)}/${pattern}$`));
  const NUM = "([1-9][0-9]*)";
  let m;
  if (method === "GET" && noFields && !paged && input === null && path === "user") {
    return { kind: "whoami", mutating: false };
  }
  if (method === "GET" && noFields && !paged && input === null && path === `repos/${REPO}`) {
    return { kind: "repoRecord", mutating: false };
  }
  if (method === "GET" && noFields && !paged && input === null && at("rulesets")) {
    return { kind: "rulesetList", mutating: false };
  }
  if (input !== null && noFields && !paged) {
    if (method === "POST" && at("rulesets")) return { kind: "rulesetCreate", input, mutating: true };
    if (method === "PUT" && (m = at(`rulesets/${NUM}`))) {
      return { kind: "rulesetUpdate", id: Number(m[1]), input, mutating: true };
    }
    return null;
  }
  if (method === "POST" && !paged && input === null && (m = at("statuses/([0-9a-f]{40})"))) {
    const names = Object.keys(fields).sort().join(",");
    if (names !== "context,description,state" || !Object.hasOwn(STATUS_STATES, fields.state)) return null;
    return {
      kind: "postStatus", sha: m[1], state: fields.state, context: fields.context,
      description: fields.description, mutating: true,
    };
  }
  if (method === "GET" && noFields) {
    if (!paged && (m = at(`issues/${NUM}`))) return { kind: "restIssue", n: Number(m[1]), mutating: false };
    if (!paged && (m = at("commits/([0-9a-f]{40})"))) return { kind: "commit", sha: m[1], mutating: false };
    if (!paged && (m = at("branches/(.+)"))) return { kind: "branch", name: m[1], mutating: false };
    if (!paged && (m = at("git/ref/heads/(.+)"))) return { kind: "gitRef", name: m[1], mutating: false };
    if (paged && (m = at(`issues/${NUM}/comments`))) return { kind: "comments", n: Number(m[1]), mutating: false };
    if (paged && (m = at(`issues/${NUM}/sub_issues`))) return { kind: "subs", n: Number(m[1]), mutating: false };
    if (paged && (m = at(`issues/${NUM}/dependencies/blocked_by`))) return { kind: "blockers", n: Number(m[1]), mutating: false };
  }
  if (method === "GET" && noFields && paged && path === `repos/${REPO}/milestones?state=all&per_page=100`) {
    return { kind: "milestoneList", mutating: false };
  }
  if (method === "POST" && !paged && path === `repos/${REPO}/milestones` && onlyKey("title")) {
    return { kind: "milestoneCreate", title: fields.title, mutating: true };
  }
  if (method === "POST" && !paged) {
    if (onlyKey("sub_issue_id") && (m = at(`issues/${NUM}/sub_issues`)) && positive(fields.sub_issue_id) !== null) {
      return { kind: "addSub", parent: Number(m[1]), id: positive(fields.sub_issue_id), mutating: true };
    }
    if (onlyKey("issue_id") && (m = at(`issues/${NUM}/dependencies/blocked_by`)) && positive(fields.issue_id) !== null) {
      return { kind: "addBlocker", n: Number(m[1]), id: positive(fields.issue_id), mutating: true };
    }
  }
  if (method === "DELETE" && noFields && !paged) {
    if ((m = at(`issues/${NUM}/dependencies/blocked_by/${NUM}`))) {
      return { kind: "removeBlocker", n: Number(m[1]), id: Number(m[2]), mutating: true };
    }
    if ((m = at(`issues/comments/${NUM}`))) return { kind: "deleteComment", id: Number(m[1]), mutating: true };
    if ((m = at("git/refs/heads/(.+)"))) return { kind: "deleteRef", name: m[1], mutating: true };
  }
  return null;
}

export function projectSummary({ number, id, title, url }) {
  return { number, id, title, url };
}

export async function readJsonOrNull(path) {
  const text = await readOrNull(path);
  if (text === null) return null;
  try {
    const value = JSON.parse(text);
    return value !== null && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function parseProject(sub, rest) {
  if (sub === "list") {
    const f = flags(rest, { "--owner": "one", "--format": "one", "--limit": "one" });
    if (!f || f["--owner"] !== OWNER || f["--format"] !== "json" || f["--limit"] !== "100") return null;
    return { kind: "projectList", owner: OWNER, mutating: false };
  }
  if (sub === "create") {
    const f = flags(rest, { "--owner": "one", "--title": "one", "--format": "one" });
    if (!f || f["--owner"] !== OWNER || f["--format"] !== "json" || f["--title"] === undefined) return null;
    return { kind: "projectCreate", owner: OWNER, title: f["--title"], mutating: true };
  }
  if (sub === "item-edit") {
    const f = flags(rest, {
      "--id": "one", "--project-id": "one", "--field-id": "one", "--single-select-option-id": "one",
    });
    const values = f && [f["--id"], f["--project-id"], f["--field-id"], f["--single-select-option-id"]];
    if (!values || values.includes(undefined)) return null;
    return {
      kind: "projectItemEdit", item: f["--id"], project: f["--project-id"], field: f["--field-id"],
      option: f["--single-select-option-id"], mutating: true,
    };
  }
  const number = positive(rest[0]);
  if (number === null) return null;
  const f = flags(rest.slice(1), { "--owner": "one", "--format": "one", "--limit": "one", "--url": "one" });
  if (!f || f["--owner"] !== OWNER || f["--format"] !== "json") return null;
  if (sub === "item-list" && f["--limit"] === "1000" && f["--url"] === undefined) {
    return { kind: "projectItems", owner: OWNER, number, mutating: false };
  }
  if (sub === "item-add" && f["--limit"] === undefined && f["--url"] !== undefined) {
    return { kind: "projectItemAdd", owner: OWNER, number, url: f["--url"], mutating: true };
  }
  if (sub === "field-list" && f["--limit"] === undefined && f["--url"] === undefined) {
    return { kind: "projectFields", owner: OWNER, number, mutating: false };
  }
  return null;
}

export function parseGh(args, caps) {
  const [first, second, ...rest] = args;
  if (first === "issue" && second === "create" && rest.length === 1 && rest[0] === "--help") {
    return { kind: "help", mutating: false };
  }
  if (first === "issue" && second === "view") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one", "--json": "one" });
    if (n === null || !f || f["-R"] !== REPO || f["--json"] !== FIELDS.view) return null;
    return { kind: "view", n, mutating: false };
  }
  if (first === "issue" && second === "list") {
    const f = flags(rest, { "-R": "one", "--state": "one", "--limit": "one", "--json": "one" });
    if (!f || f["-R"] !== REPO || (f["--state"] !== "open" && f["--state"] !== "all")
      || f["--limit"] !== "1000" || f["--json"] !== FIELDS.list) {
      return null;
    }
    return { kind: "list", state: f["--state"], mutating: false };
  }
  if (first === "issue" && second === "edit") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), {
      "-R": "one", "--add-label": "many", "--remove-label": "many",
      "--add-assignee": "many", "--remove-assignee": "many", "--body-file": "one",
    });
    if (n === null || !f || f["-R"] !== REPO) return null;
    return {
      kind: "edit", n,
      add: f["--add-label"] ?? [], remove: f["--remove-label"] ?? [],
      addAssignee: f["--add-assignee"] ?? [], removeAssignee: f["--remove-assignee"] ?? [],
      bodyFile: f["--body-file"] ?? "", mutating: true,
    };
  }
  if (first === "issue" && second === "comment") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one", "--body-file": "one" });
    if (n === null || !f || f["-R"] !== REPO || f["--body-file"] === undefined) return null;
    return { kind: "comment", n, bodyFile: f["--body-file"], mutating: true };
  }
  if (first === "issue" && second === "close") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one", "--reason": "one" });
    if (n === null || !f || f["-R"] !== REPO || f["--reason"] !== "not planned") return null;
    return { kind: "close", n, mutating: true };
  }
  if (first === "issue" && second === "pin") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one" });
    if (n === null || !f || f["-R"] !== REPO) return null;
    return { kind: "pin", n, mutating: true };
  }
  if (first === "issue" && second === "create") {
    const spec = { "-R": "one", "--title": "one", "--body-file": "one", "--label": "many", "--milestone": "one" };
    if (caps.parent) spec["--parent"] = "one";
    if (caps.blockedBy) spec["--blocked-by"] = "many";
    const f = flags(rest, spec);
    if (!f || f["-R"] !== REPO || f["--title"] === undefined || f["--body-file"] === undefined) return null;
    const parent = f["--parent"];
    const blockers = f["--blocked-by"] ?? [];
    if (parent !== undefined && positive(parent) === null) return null;
    if (blockers.some((b) => positive(b) === null)) return null;
    return {
      kind: "create", title: f["--title"], bodyFile: f["--body-file"], labels: f["--label"] ?? [],
      milestone: f["--milestone"] ?? "", parent: parent === undefined ? null : Number(parent),
      blockers: blockers.map(Number), mutating: true,
    };
  }
  if (first === "api") return parseApi(args.slice(1));
  if (first === "project") return parseProject(second, rest);
  if (first === "pr" && second === "list") {
    const f = flags(rest, { "-R": "one", "--head": "one", "--state": "one", "--limit": "one", "--json": "one" });
    if (!f || f["-R"] !== REPO || f["--state"] !== "open") return null;
    if (f["--head"] !== undefined && f["--limit"] === undefined && f["--json"] === FIELDS.prListHead) {
      return { kind: "prListHead", head: f["--head"], mutating: false };
    }
    if (f["--head"] === undefined && f["--limit"] === "200" && f["--json"] === FIELDS.prListOpen) {
      return { kind: "prListOpen", mutating: false };
    }
    return null;
  }
  if (first === "pr" && second === "create") {
    const f = flags(rest, {
      "-R": "one", "--head": "one", "--base": "one", "--title": "one", "--body-file": "one", "--draft": "bool",
    });
    if (!f || f["-R"] !== REPO || f["--head"] === undefined || f["--base"] === undefined
      || f["--title"] === undefined || f["--body-file"] === undefined) return null;
    return { kind: "prCreate", head: f["--head"], base: f["--base"], bodyFile: f["--body-file"], draft: f["--draft"] === true, mutating: true };
  }
  if (first === "pr" && second === "view") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one", "--json": "one" });
    if (n === null || !f || f["-R"] !== REPO) return null;
    if (f["--json"] === FIELDS.prFacts) return { kind: "prFacts", n, mutating: false };
    if (f["--json"] === FIELDS.prMerge) return { kind: "prMerge", n, mutating: false };
    return null;
  }
  if (first === "pr" && second === "update-branch") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one" });
    if (n === null || !f || f["-R"] !== REPO) return null;
    return { kind: "updateBranch", n, mutating: true };
  }
  if (first === "pr" && second === "merge") {
    const n = positive(rest[0]);
    const f = flags(rest.slice(1), { "-R": "one", "--squash": "bool", "--match-head-commit": "one" });
    if (n === null || !f || f["-R"] !== REPO || f["--squash"] !== true || f["--match-head-commit"] === undefined) return null;
    return { kind: "merge", n, match: f["--match-head-commit"], mutating: true };
  }
  if (first === "label" && second === "list") {
    const f = flags(rest, { "-R": "one", "--limit": "one", "--json": "one" });
    if (!f || f["-R"] !== REPO || f["--limit"] !== "1000" || f["--json"] !== "name") return null;
    return { kind: "labelList", mutating: false };
  }
  if (first === "label" && second === "create") {
    const name = rest[0];
    if (!name || name.startsWith("-")) return null;
    const f = flags(rest.slice(1), { "-R": "one", "--color": "one", "--description": "one" });
    if (!f || f["-R"] !== REPO || f["--color"] === undefined || f["--description"] === undefined) return null;
    return { kind: "labelCreate", name, mutating: true };
  }
  return null;
}

export function helpText(caps) {
  const lines = [
    "Create a new issue", "", "USAGE", "  gh issue create [flags]", "", "FLAGS",
    "  -b, --body-file file    Read the body from a file",
    "  -l, --label strings     Add a label by name",
    "  -m, --milestone name    Add the issue to a milestone",
    "  -R, --repo repository   Select another repository",
    "  -t, --title string      Supply a title",
  ];
  if (caps.parent) lines.push("      --parent number     Make the issue a sub-issue of a parent");
  if (caps.blockedBy) lines.push("      --blocked-by number Mark the issue as blocked by another issue");
  return `${lines.join("\n")}\n`;
}

export class FakeGitHub {
  constructor() {
    this.login = LOGIN;
    this.now = NOW;
    this.caps = { parent: true, blockedBy: true };
    this.issues = new Map();
    this.comments = [];
    this.prs = new Map();
    this.commits = new Map();
    this.branches = new Map();
    this.labelNames = new Set();
    this.executed = [];
    this.mutations = [];
    this.unsupported = [];
    this.sleeps = 0;
    this.onSleep = null;
    this.failOnce = [];
    this.nextCommentId = 5000;
    this.shaSeq = 0;
    this.milestones = new Map();
    this.repo = {
      owner: { login: OWNER, type: "Organization" }, default_branch: "main",
      permissions: { admin: true }, allow_squash_merge: true, private: false,
    };
    this.rulesets = new Map();
    this.nextRulesetId = 1;
    this.projects = new Map();
    this.nextProjectItem = 1;
  }

  addProject(owner, title, fields = []) {
    const list = this.projects.get(owner) ?? [];
    this.projects.set(owner, list);
    const number = list.length + 1;
    list.push({
      number, id: `PVT_${owner}_${number}`, title,
      url: `https://github.com/orgs/${owner}/projects/${number}`, items: [], fields,
    });
    return list.at(-1);
  }

  projectFor(owner, number) {
    return (this.projects.get(owner) ?? []).find((project) => project.number === number);
  }

  projectById(id) {
    for (const list of this.projects.values()) {
      const project = list.find((entry) => entry.id === id);
      if (project) return project;
    }
    return undefined;
  }

  addIssue(number, { title = `Issue ${number}`, body = "", state = "OPEN", labels = [], milestone = "" } = {}) {
    this.issues.set(number, {
      number, id: restId(number), title, body, state, stateReason: "", pinned: false,
      labels: new Set(labels), assignees: new Set(), milestone,
      createdAt: isoAt(this.now), subIssues: [], blockedBy: [],
    });
  }

  addComment(issue, login, body, { association = "NONE", createdAt = isoAt(this.now) } = {}) {
    const id = this.nextCommentId;
    this.nextCommentId += 1;
    this.comments.push({ id, issue, login, body, created_at: createdAt, author_association: association });
    return id;
  }

  addPr(number, {
    head = `wf/t${number}`, base = "main", headSha, state = "OPEN", isDraft = false,
    mergeable = "MERGEABLE", mergeStateStatus = "CLEAN", rollup = greenRollup(), queueMode = false,
    reviewDecision = null, author = LOGIN,
  } = {}) {
    this.prs.set(number, {
      number, state, isDraft, head, base, headSha, mergeable, mergeStateStatus, rollup,
      mergeCommit: "", queued: false, queueMode, reviewDecision, author,
    });
  }

  addMilestone(title) {
    this.milestones.set(title, this.milestones.size + 1);
  }

  addCommit(sha, parents) {
    this.commits.set(sha, { parents });
  }

  setBranch(name, sha) {
    this.branches.set(name, sha);
  }

  newSha() {
    this.shaSeq += 1;
    return sha1Hex(`${this.now}:${this.shaSeq}`);
  }

  nextNumber() {
    return Math.max(0, ...this.issues.keys(), ...this.prs.keys()) + 1;
  }

  numberOfRest(id) {
    for (const issue of this.issues.values()) if (issue.id === id) return issue.number;
    return undefined;
  }

  restShape(number) {
    const issue = this.issues.get(number);
    return { id: issue.id, number, state: issue.state.toLowerCase() };
  }

  reject(cmd, args) {
    this.unsupported.push([cmd, ...args]);
    throw new Error(`unsupported ${cmd} argv: ${JSON.stringify(args)}`);
  }

  async run(cmd, args) {
    await new Promise((resolveTurn) => setImmediate(resolveTurn));
    this.executed.push([cmd, ...args]);
    if (cmd === "date") return this.date(args);
    if (cmd === "sleep") return this.sleep(args);
    if (cmd === "bun") return this.bun(args);
    if (cmd !== "gh") this.reject(cmd, args);
    const op = parseGh(args, this.caps);
    if (!op) this.reject("gh", args);
    const argv = ["gh", ...args];
    const hit = this.failOnce.findIndex((entry) => entry.match(argv));
    if (hit !== -1) {
      const [entry] = this.failOnce.splice(hit, 1);
      return { exitCode: entry.exitCode, stdout: "", stderr: entry.stderr };
    }
    if (op.mutating) this.mutations.push(argv);
    return this.apply(op);
  }

  date(args) {
    if (args.length !== 2 || args[0] !== "-u" || args[1] !== "+%s") this.reject("date", args);
    return ok(`${this.now}\n`);
  }

  sleep(args) {
    const seconds = Number(args[0]);
    if (args.length !== 1 || !Number.isInteger(seconds) || seconds < 0) this.reject("sleep", args);
    this.now += seconds;
    this.sleeps += 1;
    this.onSleep?.(seconds);
    for (const pr of this.prs.values()) {
      if (pr.queued && pr.state === "OPEN") this.finishMerge(pr);
    }
    return ok("");
  }

  bun(args) {
    const result = Bun.spawnSync({ cmd: ["bun", ...args], stdout: "pipe", stderr: "pipe" });
    const decoder = new TextDecoder();
    return { exitCode: result.exitCode, stdout: decoder.decode(result.stdout), stderr: decoder.decode(result.stderr) };
  }

  finishMerge(pr) {
    const sha = this.newSha();
    this.commits.set(sha, { parents: [this.branches.get(pr.base)] });
    this.branches.set(pr.base, sha);
    pr.state = "MERGED";
    pr.mergeCommit = sha;
    pr.queued = false;
  }

  async apply(op) {
    switch (op.kind) {
      case "help":
        return ok(helpText(this.caps));
      case "view": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail(`could not find issue #${op.n}`);
        return json({
          number: issue.number, title: issue.title, state: issue.state,
          labels: [...issue.labels].map((name) => ({ name })),
          assignees: [...issue.assignees].map((login) => ({ login })),
          body: issue.body, updatedAt: isoAt(this.now),
          milestone: issue.milestone ? { title: issue.milestone } : null,
        });
      }
      case "list":
        return json([...this.issues.values()]
          .filter((issue) => op.state === "all" || issue.state === "OPEN")
          .sort((a, b) => a.number - b.number)
          .map((issue) => ({
            number: issue.number, title: issue.title, state: issue.state,
            labels: [...issue.labels].map((name) => ({ name })),
            body: issue.body, createdAt: issue.createdAt,
            milestone: issue.milestone ? { title: issue.milestone } : null,
          })));
      case "restIssue": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail("HTTP 404: Not Found");
        return json({ id: issue.id, number: issue.number, state: issue.state.toLowerCase() });
      }
      case "comments": {
        if (!this.issues.has(op.n)) return fail("HTTP 404: Not Found");
        return json([this.comments.filter((c) => c.issue === op.n).map((c) => ({
          id: c.id, user: { login: c.login }, body: c.body,
          created_at: c.created_at, author_association: c.author_association,
        }))]);
      }
      case "subs": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail("HTTP 404: Not Found");
        return json([issue.subIssues.map((num) => this.restShape(num))]);
      }
      case "blockers": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail("HTTP 404: Not Found");
        return json([issue.blockedBy.map((num) => this.restShape(num))]);
      }
      case "commit": {
        const commit = this.commits.get(op.sha);
        if (!commit) return fail("HTTP 404: Not Found");
        return json({ sha: op.sha, parents: commit.parents.map((sha) => ({ sha })) });
      }
      case "branch": {
        const sha = this.branches.get(op.name);
        if (!sha) return fail("HTTP 404: Not Found");
        return json({ name: op.name, commit: { sha } });
      }
      case "gitRef": {
        const sha = this.branches.get(op.name);
        if (!sha) return fail("gh: Not Found (HTTP 404)");
        return json({ ref: `refs/heads/${op.name}`, object: { sha, type: "commit" } });
      }
      case "deleteRef": {
        if (!this.branches.has(op.name)) return fail("gh: Reference does not exist (HTTP 422)");
        this.branches.delete(op.name);
        return ok("");
      }
      case "edit": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail(`could not find issue #${op.n}`);
        let body;
        if (op.bodyFile) {
          body = await readOrNull(op.bodyFile);
          if (body === null) return fail("could not read body file");
        }
        for (const name of op.add) issue.labels.add(name);
        for (const name of op.remove) issue.labels.delete(name);
        for (const login of op.addAssignee) issue.assignees.add(login);
        for (const login of op.removeAssignee) issue.assignees.delete(login);
        if (body !== undefined) issue.body = body;
        return ok(`${issueUrl(op.n)}\n`);
      }
      case "comment": {
        if (!this.issues.has(op.n)) return fail(`could not find issue #${op.n}`);
        const body = await readOrNull(op.bodyFile);
        if (body === null) return fail("could not read body file");
        const id = this.addComment(op.n, this.login, body);
        return ok(`${issueUrl(op.n)}#issuecomment-${id}\n`);
      }
      case "close": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail(`could not find issue #${op.n}`);
        issue.state = "CLOSED";
        issue.stateReason = "not planned";
        return ok(`${issueUrl(op.n)}\n`);
      }
      case "create": {
        const body = await readOrNull(op.bodyFile);
        if (body === null) return fail("could not read body file");
        for (const blocker of op.blockers) {
          if (!this.issues.has(blocker)) return fail(`could not find blocker #${blocker}`);
        }
        if (op.parent !== null && !this.issues.has(op.parent)) return fail(`could not find parent #${op.parent}`);
        const number = this.nextNumber();
        this.addIssue(number, { title: op.title, body, labels: op.labels, milestone: op.milestone });
        this.issues.get(number).blockedBy.push(...op.blockers);
        if (op.parent !== null) this.issues.get(op.parent).subIssues.push(number);
        return ok(`${issueUrl(number)}\n`);
      }
      case "addSub": {
        const parent = this.issues.get(op.parent);
        const child = this.numberOfRest(op.id);
        if (!parent || child === undefined) return fail("Validation Failed: unknown sub_issue_id");
        if (parent.subIssues.includes(child)) return fail("Validation Failed: already a sub-issue");
        parent.subIssues.push(child);
        return json({ id: op.id });
      }
      case "addBlocker": {
        const issue = this.issues.get(op.n);
        const blocker = this.numberOfRest(op.id);
        if (!issue || blocker === undefined) return fail("Validation Failed: unknown issue_id");
        if (issue.blockedBy.includes(blocker)) return fail("Validation Failed: already blocked by");
        issue.blockedBy.push(blocker);
        return json({ id: op.id });
      }
      case "removeBlocker": {
        const issue = this.issues.get(op.n);
        const blocker = this.numberOfRest(op.id);
        if (!issue || blocker === undefined || !issue.blockedBy.includes(blocker)) return fail("HTTP 404: Not Found");
        issue.blockedBy = issue.blockedBy.filter((num) => num !== blocker);
        return ok("");
      }
      case "deleteComment": {
        const index = this.comments.findIndex((c) => c.id === op.id);
        if (index === -1) return fail("HTTP 404: Not Found");
        this.comments.splice(index, 1);
        return ok("");
      }
      case "labelList":
        return json([...this.labelNames].map((name) => ({ name })));
      case "labelCreate": {
        if (this.labelNames.has(op.name)) return fail("label already exists");
        this.labelNames.add(op.name);
        return ok("");
      }
      case "prListHead":
        return json([...this.prs.values()]
          .filter((pr) => pr.state === "OPEN" && pr.head === op.head)
          .map((pr) => ({ number: pr.number, url: prUrl(pr.number), headRefOid: pr.headSha })));
      case "prListOpen":
        return json([...this.prs.values()]
          .filter((pr) => pr.state === "OPEN")
          .map((pr) => ({ number: pr.number, headRefName: pr.head, isDraft: pr.isDraft })));
      case "prCreate": {
        const body = await readOrNull(op.bodyFile);
        if (body === null) return fail("could not read body file");
        if (!this.branches.has(op.head) || !this.branches.has(op.base)) return fail("branch not found");
        if ([...this.prs.values()].some((pr) => pr.state === "OPEN" && pr.head === op.head && pr.base === op.base)) {
          return fail("a pull request already exists for this head");
        }
        const number = this.nextNumber();
        this.addPr(number, { head: op.head, base: op.base, headSha: this.branches.get(op.head), isDraft: op.draft, rollup: [] });
        return ok(`${prUrl(number)}\n`);
      }
      case "prFacts": {
        const pr = this.prs.get(op.n);
        if (!pr) return fail(`could not find pull request #${op.n}`);
        return json({
          number: pr.number, state: pr.state, isDraft: pr.isDraft, headRefOid: pr.headSha,
          headRefName: pr.head, baseRefName: pr.base, mergeable: pr.mergeable,
          mergeStateStatus: pr.mergeStateStatus, statusCheckRollup: pr.rollup,
          reviewDecision: pr.reviewDecision, author: { login: pr.author },
        });
      }
      case "prMerge": {
        const pr = this.prs.get(op.n);
        if (!pr) return fail(`could not find pull request #${op.n}`);
        return json({ state: pr.state, mergeCommit: pr.mergeCommit ? { oid: pr.mergeCommit } : null });
      }
      case "updateBranch": {
        const pr = this.prs.get(op.n);
        if (!pr || pr.state !== "OPEN") return fail("pull request is not open");
        const sha = this.newSha();
        this.commits.set(sha, { parents: [pr.headSha, this.branches.get(pr.base)] });
        pr.headSha = sha;
        pr.mergeStateStatus = "CLEAN";
        pr.rollup = pr.rollup.map(toPending);
        return ok("");
      }
      case "merge": {
        const pr = this.prs.get(op.n);
        if (!pr || pr.state !== "OPEN") return fail("pull request is not open");
        if (op.match !== pr.headSha) return fail("Head branch was modified. Review and try the merge again.");
        if (pr.queueMode) {
          pr.queued = true;
          return ok("");
        }
        this.finishMerge(pr);
        return ok("");
      }
      case "pin": {
        const issue = this.issues.get(op.n);
        if (!issue) return fail(`could not find issue #${op.n}`);
        issue.pinned = true;
        return ok(`${issueUrl(op.n)}\n`);
      }
      case "milestoneList":
        return json([[...this.milestones].map(([title, number]) => ({ number, title, state: "open" }))]);
      case "milestoneCreate": {
        if (this.milestones.has(op.title)) return fail("Validation Failed: title already exists");
        this.addMilestone(op.title);
        return json({ number: this.milestones.get(op.title), title: op.title, state: "open" });
      }
      case "whoami":
        return json({ login: this.login });
      case "repoRecord":
        return json(this.repo);
      case "postStatus": {
        for (const pr of this.prs.values()) {
          if (pr.headSha === op.sha) {
            pr.rollup.push({ __typename: "StatusContext", context: op.context, state: STATUS_STATES[op.state] });
          }
        }
        return json({ context: op.context, state: STATUS_STATES[op.state] });
      }
      case "rulesetList":
        return json([...this.rulesets.values()].map(({ id, name }) => ({ id, name })));
      case "rulesetCreate": {
        const body = await readJsonOrNull(op.input);
        if (body === null || typeof body.name !== "string") return fail("Validation Failed: invalid ruleset");
        const id = this.nextRulesetId;
        this.nextRulesetId += 1;
        this.rulesets.set(id, { id, name: body.name, body });
        return json({ id, name: body.name });
      }
      case "rulesetUpdate": {
        const current = this.rulesets.get(op.id);
        const body = await readJsonOrNull(op.input);
        if (!current || body === null) return fail("HTTP 404: Not Found");
        const name = body.name ?? current.name;
        this.rulesets.set(op.id, { id: op.id, name, body });
        return json({ id: op.id, name });
      }
      case "projectList": {
        const list = this.projects.get(op.owner) ?? [];
        return json({ projects: list.map(projectSummary), totalCount: list.length });
      }
      case "projectCreate":
        return json(projectSummary(this.addProject(op.owner, op.title)));
      case "projectItems": {
        const project = this.projectFor(op.owner, op.number);
        if (!project) return fail(`could not find project ${op.number}`);
        return json({
          items: project.items.map((item) => ({
            id: item.id,
            content: { number: item.issue, repository: REPO, type: "Issue", url: issueUrl(item.issue) },
          })),
        });
      }
      case "projectItemAdd": {
        const project = this.projectFor(op.owner, op.number);
        const match = op.url.match(new RegExp(`^${escapeRe(issueUrl(""))}([1-9][0-9]*)$`));
        const issue = match ? Number(match[1]) : null;
        if (!project || issue === null || !this.issues.has(issue)) return fail("could not add item");
        const existing = project.items.find((item) => item.issue === issue);
        if (existing) return json({ id: existing.id });
        const id = `PVTI_${this.nextProjectItem}`;
        this.nextProjectItem += 1;
        project.items.push({ id, issue, fieldValues: {} });
        return json({ id });
      }
      case "projectFields": {
        const project = this.projectFor(op.owner, op.number);
        if (!project) return fail(`could not find project ${op.number}`);
        return json({ fields: project.fields });
      }
      case "projectItemEdit": {
        const project = this.projectById(op.project);
        const item = project?.items.find((entry) => entry.id === op.item);
        const field = project?.fields.find((entry) => entry.id === op.field);
        if (!item || !field || !(field.options ?? []).some((option) => option.id === op.option)) {
          return fail("could not edit item");
        }
        item.fieldValues[op.field] = op.option;
        return ok("");
      }
      default:
        return fail(`unhandled operation ${op.kind}`);
    }
  }
}

export function assertSupported(fake, label) {
  assert.deepEqual(fake.unsupported, [], `${label}: the kit sent gh argv outside the section 4 table`);
}

export const labelsOf = (fake, n) => fake.issues.get(n).labels;
export const stateLabels = (fake, n) => [...labelsOf(fake, n)].filter((name) => name.startsWith("state:")).sort();
export const stateLabelsWith = (fake, n, prefix) => [...labelsOf(fake, n)].filter((name) => name.startsWith(prefix)).sort();
export const commentsOf = (fake, n) => fake.comments
  .filter((c) => c.issue === n)
  .map((c) => ({ id: c.id, login: c.login, body: c.body, createdAt: c.created_at, association: c.author_association }));
export const argPair = (argv, flag, value) => argv.some((token, i) => token === flag && argv[i + 1] === value);
export const isPrMerge = (argv) => argv[1] === "pr" && argv[2] === "merge";
export const isPrUpdate = (argv) => argv[1] === "pr" && argv[2] === "update-branch";
