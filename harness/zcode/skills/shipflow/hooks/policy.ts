import { Buffer } from "node:buffer";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  expandHome,
  loadCharter,
  matchesPushPattern,
  protectedRule,
  type Charter,
} from "../scripts/lib/charter.ts";

export type Decision = "allow" | "deny" | "pass";

export interface Verdict {
  decision: Decision;
  rule: string;
  reason: string;
}

export type HookInput = Record<string, unknown>;

interface Context {
  charter: Charter;
  root: string;
  agentType: string | null;
}

const PASS: Verdict = { decision: "pass", rule: "", reason: "" };
const DEFAULT_LOG = ".shipflow/policy.log";
const SUMMARY_LIMIT = 200;
const URL_TEXT_LIMIT = 80;
const MAX_NESTING = 5;
const RULE_TOOLS = new Set(["Bash", "Write", "Edit", "NotebookEdit", "ApplyPatch", "WebFetch"]);
const SEPARATORS = new Set([";", "&", "|", "\n", "(", ")"]);
const SHELL_KEYWORDS = new Set(["!", "{", "}", "if", "then", "else", "elif", "do", "while", "until"]);
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const WRAPPERS = new Set(["env", "sudo", "command", "exec", "nohup", "time", "xargs", "nice", "timeout"]);
const WRAPPER_VALUE_FLAGS = new Map<string, Set<string>>([
  ["sudo", new Set(["-u", "-g", "-C", "-h", "-p", "-r", "-t", "-U"])],
  ["env", new Set(["-u", "-C", "-S"])],
  ["nice", new Set(["-n"])],
  ["xargs", new Set(["-a", "-d", "-E", "-I", "-L", "-n", "-P", "-s"])],
  ["timeout", new Set(["-s", "-k"])],
  ["exec", new Set(["-a"])],
  ["time", new Set(["-f", "-o"])],
]);
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh"]);
const GIT_VALUE_OPTIONS = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--super-prefix", "--config-env"]);
const PUSH_VALUE_LONG = new Set(["--repo", "--receive-pack", "--exec", "--push-option"]);
const GH_VALUE_FLAGS = new Set(["-R", "--repo", "-H", "--hostname"]);
const GH_API_VALUE_FLAGS = new Set([
  "-H", "--header", "-q", "--jq", "-t", "--template", "-p", "--preview", "--cache", "--hostname",
]);
const GH_API_FIELD_FLAGS = new Set(["-f", "-F", "--field", "--raw-field", "--input"]);
const GH_API_GUARDED_PATH =
  /(^|\/)(rulesets|secrets|hooks|collaborators|keys|environments)(\/|$)|(^|\/)branches\/[^/]+\/protection(\/|$)/i;
const GH_WRITE_SUBCOMMANDS = new Map<string, Set<string>>([
  ["issue", new Set(["create", "edit", "close", "reopen", "comment", "delete", "lock", "unlock", "pin", "unpin", "transfer", "develop"])],
  ["pr", new Set(["create", "edit", "close", "reopen", "comment", "review", "ready", "update-branch"])],
  ["label", new Set(["create", "edit", "delete", "clone"])],
]);
const URL_PATTERN = /https?:\/\/[^\s'"`<>()|;&]*/gi;
const PATCH_FILE = /^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/;
const ALLOW_OUTPUT = {
  hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } },
};

function deny(rule: string, reason: string): Verdict {
  return { decision: "deny", rule, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Splits on the spec operators outside quotes. Command substitutions are scanned as
// their own commands, so `echo $(git push -f ...)` is still checked.
export function splitSegments(command: string): string[] {
  const out: string[] = [];
  scanSegments(command, out);
  return out.map((segment) => segment.trim()).filter((segment) => segment.length > 0);
}

function scanSegments(text: string, out: string[]): void {
  let current = "";
  let quote: '"' | "'" | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && quote !== "'") {
      current += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (quote === "'") {
      if (ch === "'") quote = null;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === "$" && text[i + 1] === "(") {
      const end = closingParen(text, i + 2);
      scanSegments(text.slice(i + 2, end), out);
      current += "$()";
      i = end + 1;
      continue;
    }
    if (ch === "`") {
      const end = closingBacktick(text, i + 1);
      scanSegments(text.slice(i + 1, end), out);
      current += "``";
      i = end + 1;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      current += ch;
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      i += 1;
      continue;
    }
    if (SEPARATORS.has(ch)) {
      out.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  out.push(current);
}

function closingParen(text: string, start: number): number {
  let depth = 1;
  let quote: '"' | "'" | null = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
      continue;
    }
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

function closingBacktick(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === "`") return i;
  }
  return text.length;
}

// Shell-style words: quotes are removed, redirections and their targets are dropped.
// A word glued to a redirection (2>x) is a file descriptor, not an argument.
export function tokenize(segment: string): string[] {
  const tokens: string[] = [];
  let word = "";
  let inWord = false;
  let skipWord = false;
  let quote: '"' | "'" | null = null;

  const endWord = (): void => {
    if (inWord) {
      if (skipWord) skipWord = false;
      else tokens.push(word);
    }
    word = "";
    inWord = false;
  };

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
      else word += ch;
      continue;
    }
    if (quote === '"') {
      if (ch === '"') {
        quote = null;
      } else if (ch === "\\" && i + 1 < segment.length && '"\\$`\n'.includes(segment[i + 1])) {
        word += segment[i + 1];
        i += 1;
      } else {
        word += ch;
      }
      continue;
    }
    if (ch === "\\") {
      if (i + 1 < segment.length && segment[i + 1] !== "\n") word += segment[i + 1];
      i += 1;
      inWord = true;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      inWord = true;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
      endWord();
      continue;
    }
    if (ch === "#" && !inWord) break;
    if (ch === "<" || ch === ">") {
      if (inWord && /^\d+$/.test(word)) {
        word = "";
        inWord = false;
      } else {
        endWord();
      }
      skipWord = true;
      continue;
    }
    word += ch;
    inWord = true;
  }
  endWord();
  return tokens;
}

function commandWords(tokens: string[]): string[] {
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (SHELL_KEYWORDS.has(token) || ASSIGNMENT.test(token)) {
      i += 1;
      continue;
    }
    const name = path.posix.basename(token);
    if (WRAPPERS.has(name)) {
      i = skipWrapperArgs(name, tokens, i + 1);
      continue;
    }
    break;
  }
  return tokens.slice(i);
}

function skipWrapperArgs(name: string, tokens: string[], start: number): number {
  const valueFlags = WRAPPER_VALUE_FLAGS.get(name) ?? new Set<string>();
  let i = start;
  while (i < tokens.length && tokens[i].startsWith("-") && tokens[i] !== "-") {
    if (tokens[i] === "--") {
      i += 1;
      break;
    }
    i += valueFlags.has(tokens[i]) ? 2 : 1;
  }
  if (name === "timeout" && i < tokens.length) i += 1;
  return i;
}

function checkCommand(command: string, ctx: Context, depth: number): Verdict {
  if (depth > MAX_NESTING) return deny("policy-error", "shell nesting is too deep to check");
  for (const segment of splitSegments(command)) {
    const verdict = checkSegment(segment, ctx, depth);
    if (verdict.decision === "deny") return verdict;
  }
  return PASS;
}

function checkSegment(segment: string, ctx: Context, depth: number): Verdict {
  const words = commandWords(tokenize(segment));
  if (words.length === 0) return PASS;
  const name = path.posix.basename(words[0]);
  if (name === "git") return checkGit(words, ctx);
  if (name === "gh") return checkGh(words, ctx.charter);
  if (SHELLS.has(name)) {
    const script = shellScript(words);
    return script === null ? PASS : checkCommand(script, ctx, depth + 1);
  }
  if (name === "eval") return checkCommand(words.slice(1).join(" "), ctx, depth + 1);
  return PASS;
}

function shellScript(words: string[]): string | null {
  for (let k = 1; k < words.length; k++) {
    const word = words[k];
    if (word === "-o" || word === "+o") {
      k += 1;
      continue;
    }
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(word)) return words[k + 1] ?? "";
    if (!word.startsWith("-") && !word.startsWith("+")) return null;
  }
  return null;
}

function checkGit(words: string[], ctx: Context): Verdict {
  let i = 1;
  while (i < words.length && words[i].startsWith("-")) {
    i += GIT_VALUE_OPTIONS.has(words[i]) ? 2 : 1;
  }
  const sub = words[i];
  if (sub === undefined) return PASS;
  const args = words.slice(i + 1);
  const destructive = destructiveReason(sub, args);
  if (destructive !== null) return deny("git-destructive", destructive);
  if (ctx.agentType !== null && !isReadOnlyGit(sub, args)) {
    return deny("git-mutation", `subagent ${ctx.agentType} may not run git ${sub}`);
  }
  return sub === "push" ? checkPush(args, ctx.charter) : PASS;
}

const READ_ONLY_GIT = new Set([
  "status", "diff", "log", "show", "rev-parse", "ls-files", "ls-remote", "cat-file", "grep", "blame",
  "describe", "shortlog", "rev-list", "merge-base", "for-each-ref", "name-rev", "show-ref", "help", "version",
]);
const BRANCH_LIST_LONG = new Set([
  "--list", "--all", "--remotes", "--show-current", "--verbose", "--color", "--no-color", "--column",
  "--no-column", "--sort", "--format", "--contains", "--no-contains", "--merged", "--no-merged",
  "--points-at", "--abbrev", "--no-abbrev", "--omit-empty", "--ignore-case",
]);
const BRANCH_POSITIONAL_OK = ["--list", "--contains", "--no-contains", "--merged", "--no-merged"];
const CONFIG_WRITE_FLAGS = ["--unset", "--unset-all", "--add", "--replace-all", "--rename-section", "--remove-section", "--edit"];

function positionalsOf(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith("-"));
}

// Bundled short flags (-fd) count as each letter they contain; long flags match before any "=".
function hasFlag(args: string[], short: string | null, longs: readonly string[]): boolean {
  return args.some((arg) => {
    if (longs.includes(arg.split("=")[0])) return true;
    return short !== null && /^-[A-Za-z]+$/.test(arg) && arg.includes(short);
  });
}

function destructiveReason(sub: string, args: string[]): string | null {
  switch (sub) {
    case "reset":
      return hasFlag(args, null, ["--hard", "--merge", "--keep"]) ? "git reset --hard, --merge and --keep discard work" : null;
    case "clean":
      return hasFlag(args, "f", ["--force"]) ? "git clean -f deletes untracked files" : null;
    case "checkout":
      if (args.includes("--")) return "git checkout -- overwrites working tree files";
      if (hasFlag(args, "f", ["--force"])) return "git checkout -f discards local changes";
      if (args.includes(".")) return "git checkout . discards working tree changes";
      return null;
    case "switch":
      return hasFlag(args, "f", ["--force", "--discard-changes"]) ? "git switch --discard-changes discards local changes" : null;
    case "restore": {
      const stagedOnly = hasFlag(args, "S", ["--staged"]) && !hasFlag(args, "W", ["--worktree"]);
      return stagedOnly ? null : "git restore overwrites working tree files; only restore --staged is allowed";
    }
    case "branch": {
      const forced = hasFlag(args, "D", []) || (hasFlag(args, "d", ["--delete"]) && hasFlag(args, "f", ["--force"]));
      return forced ? "git branch -D force-deletes a branch" : null;
    }
    case "stash":
      return args[0] === "list" || args[0] === "show" ? null : "only git stash list and git stash show are allowed";
    case "rebase":
      return "git rebase rewrites history";
    case "worktree":
      return positionalsOf(args)[0] === "remove" && hasFlag(args, "f", ["--force"])
        ? "git worktree remove --force deletes a worktree"
        : null;
    case "update-ref": {
      if (!hasFlag(args, "d", [])) return null;
      // Allowed: compare-and-delete of a run-owned branch at a known commit, as cleanup does after a merge.
      const safe = args.length === 3 && args[0] === "-d" && /^refs\/heads\/wf\/[A-Za-z0-9._\/-]+$/.test(args[1])
        && !args[1].includes("..") && /^[0-9a-f]{40}$/.test(args[2]);
      return safe ? null : "git update-ref -d deletes a ref; only -d refs/heads/wf/<branch> <40-hex sha> is allowed";
    }
    case "reflog":
      return args.includes("expire") ? "git reflog expire drops reflog entries" : null;
    case "gc":
      return args.includes("--prune=now") ? "git gc --prune=now drops unreachable objects" : null;
    case "filter-branch":
      return "git filter-branch rewrites history";
    default:
      return null;
  }
}

function isReadOnlyGit(sub: string, args: string[]): boolean {
  if (READ_ONLY_GIT.has(sub)) return true;
  switch (sub) {
    case "symbolic-ref":
      return !hasFlag(args, "d", ["--delete"]) && positionalsOf(args).length <= 1;
    case "worktree":
      return positionalsOf(args)[0] === "list";
    case "branch":
      return isReadOnlyBranch(args);
    case "remote":
      return args.every((arg) => arg === "-v" || arg === "--verbose");
    case "config":
      return hasFlag(args, "l", ["--get", "--get-all", "--list"]) && !hasFlag(args, "e", CONFIG_WRITE_FLAGS);
    default:
      return false;
  }
}

// Only listing flags are accepted. Positional names are allowed only with a listing filter,
// so `git branch -a new-x` (which creates a branch) is not read-only.
function isReadOnlyBranch(args: string[]): boolean {
  for (const arg of args) {
    if (arg.startsWith("--")) {
      if (!BRANCH_LIST_LONG.has(arg.split("=")[0])) return false;
    } else if (/^-[A-Za-z]+$/.test(arg) && ![...arg.slice(1)].every((letter) => "alrvqi".includes(letter))) {
      return false;
    }
  }
  return positionalsOf(args).length === 0 || hasFlag(args, "l", BRANCH_POSITIONAL_OK);
}

function checkPush(args: string[], charter: Charter): Verdict {
  const positional: string[] = [];
  let force: string | null = null;
  let tags = false;
  let hasRepo = false;
  let optionsEnded = false;
  for (let k = 0; k < args.length; k++) {
    const arg = args[k];
    if (optionsEnded || arg === "-" || !arg.startsWith("-")) {
      positional.push(arg);
      continue;
    }
    if (arg === "--") {
      optionsEnded = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const name = eq === -1 ? arg : arg.slice(0, eq);
      if (name.startsWith("--force") || name === "--mirror" || name === "--all" || name === "--delete" || name === "--prune") {
        force ??= arg;
      } else if (name === "--tags") {
        tags = true;
      } else if (name === "--repo") {
        hasRepo = true;
      }
      if (eq === -1 && PUSH_VALUE_LONG.has(name)) k += 1;
      continue;
    }
    // git accepts bundled short flags, so `-fu` is a force push; `o` takes a value.
    if (/^-[A-Za-z]+$/.test(arg)) {
      const oAt = arg.indexOf("o");
      const flags = oAt === -1 ? arg : arg.slice(0, oAt);
      if (/[fd]/.test(flags)) force ??= arg;
      if (oAt === arg.length - 1) k += 1;
    }
  }

  if (force !== null) return deny("force-push", `git push option ${force} is not allowed`);
  if (tags) return deny("push-refspec", "git push --tags pushes refs outside refs/heads/wf/*");
  const refspecs = hasRepo ? positional : positional.slice(1);
  if (refspecs.length === 0) {
    return deny("push-refspec", "git push needs an explicit refspec such as HEAD:wf/<name>");
  }
  for (const refspec of refspecs) {
    const verdict = checkRefspec(refspec, charter);
    if (verdict.decision === "deny") return verdict;
  }
  return PASS;
}

function checkRefspec(refspec: string, charter: Charter): Verdict {
  if (refspec.startsWith("+")) return deny("force-push", `forced refspec ${refspec} is not allowed`);
  const colon = refspec.indexOf(":");
  if (colon === 0) return deny("force-push", `deleting a remote ref with ${refspec} is not allowed`);
  const destination = colon === -1 ? refspec : refspec.slice(colon + 1);
  if (destination === "" || destination.includes("..") || refspec.includes("*")) {
    return deny("push-refspec", `refspec ${refspec} must name one explicit destination ref`);
  }
  const ref = destination.startsWith("refs/") ? destination : `refs/heads/${destination}`;
  if (!matchesPushPattern(charter, ref)) {
    return deny("push-refspec", `refspec ${refspec} pushes to ${ref}, outside authority.push`);
  }
  return PASS;
}

function checkGh(words: string[], charter: Charter): Verdict {
  const positional: Array<{ value: string; index: number }> = [];
  for (let k = 1; k < words.length; k++) {
    const word = words[k];
    if (word.startsWith("-")) {
      if (GH_VALUE_FLAGS.has(word)) k += 1;
      continue;
    }
    positional.push({ value: word, index: k });
  }
  const first = positional[0]?.value;
  const second = positional[1]?.value;
  if (first === "pr" && second === "merge") {
    return deny("merge-outside-kit", "gh pr merge is not allowed; merges go through the merge queue");
  }
  if (first === "api" && positional[0] !== undefined) {
    return checkGhApi(words.slice(positional[0].index + 1), charter);
  }
  if (first === "secret") return deny("ruleset-or-secret", "gh secret commands are not allowed to agents");
  if (first === "variable" && second !== "list" && second !== "get") {
    return deny("ruleset-or-secret", "only gh variable list and gh variable get are allowed");
  }
  if (first === "ruleset" && second !== "list" && second !== "view" && second !== "check") {
    return deny("ruleset-or-secret", "only gh ruleset list, view and check are allowed");
  }
  if (first === "repo" && (second === "edit" || second === "delete" || second === "rename" || second === "archive")) {
    return deny("ruleset-or-secret", `gh repo ${second} is not allowed`);
  }
  if (first === "auth" && second !== "status") {
    return deny("ruleset-or-secret", "only gh auth status is allowed");
  }
  if (
    charter.hooks.deny_agent_gh_writes &&
    first !== undefined &&
    second !== undefined &&
    GH_WRITE_SUBCOMMANDS.get(first)?.has(second)
  ) {
    return deny("gh-write-outside-kit", `gh ${first} ${second} writes to GitHub outside the kit`);
  }
  return PASS;
}

// gh api sends a POST when a field flag is given without -X. Any non-GET call is a GitHub
// write, so it cannot be left open next to the subcommand list.
function checkGhApi(args: string[], charter: Charter): Verdict {
  let method: string | null = null;
  let hasBody = false;
  let endpoint = "";
  for (let k = 0; k < args.length; k++) {
    const arg = args[k];
    if (arg === "-X" || arg === "--method") {
      method = args[k + 1] ?? "";
      k += 1;
    } else if (arg.startsWith("--method=")) {
      method = arg.slice("--method=".length);
    } else if (/^-X./.test(arg)) {
      method = arg.slice(2);
    } else if (GH_API_FIELD_FLAGS.has(arg)) {
      hasBody = true;
      k += 1;
    } else if (/^--(field|raw-field|input)=/.test(arg) || /^-[fF]./.test(arg)) {
      hasBody = true;
    } else if (GH_API_VALUE_FLAGS.has(arg)) {
      k += 1;
    } else if (!arg.startsWith("-") && endpoint === "") {
      endpoint = arg;
    }
  }
  const verb = (method ?? (hasBody ? "POST" : "GET")).toUpperCase();
  if (verb === "GET" || verb === "HEAD") return PASS;
  const target = apiPath(endpoint);
  if (GH_API_GUARDED_PATH.test(target)) {
    return deny("ruleset-or-secret", `gh api ${verb} ${target} changes rulesets, protection, secrets, hooks, keys or collaborators`);
  }
  if (charter.hooks.deny_agent_gh_writes) {
    return deny("gh-write-outside-kit", `gh api ${verb} ${target} is a GitHub write outside the kit`);
  }
  return PASS;
}

function apiPath(endpoint: string): string {
  let target = endpoint;
  if (/^https?:\/\//i.test(target)) {
    try {
      target = new URL(target).pathname;
    } catch {
      return target;
    }
  }
  return target.split("?")[0];
}

function checkUrlHosts(text: string, charter: Charter): Verdict {
  for (const match of text.matchAll(URL_PATTERN)) {
    const verdict = checkUrl(match[0], charter);
    if (verdict.decision === "deny") return verdict;
  }
  return PASS;
}

function checkUrl(raw: string, charter: Charter): Verdict {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return deny("host-not-allowed", `cannot read the host of ${raw.slice(0, URL_TEXT_LIMIT)}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return deny("host-not-allowed", `URL scheme ${url.protocol} is not allowed`);
  }
  if (!hostAllowed(url.hostname, charter.authority.network_allow ?? [])) {
    return deny("host-not-allowed", `host ${url.hostname} is not in authority.network_allow`);
  }
  return PASS;
}

function hostAllowed(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host === "127.0.0.1") return true;
  return allowed.some((entry) => {
    const base = entry.toLowerCase();
    return host === base || host.endsWith(`.${base}`);
  });
}

function patchPaths(patch: string): string[] {
  const files: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = PATCH_FILE.exec(line);
    if (match) files.push(match[1].trim());
  }
  return files;
}

function targetPath(toolInput: Record<string, unknown>): string | null {
  for (const key of ["file_path", "path", "notebook_path"]) {
    const value = toolInput[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return null;
}

function projectRelative(root: string, target: string): string | null {
  const relative = path.relative(root, path.resolve(root, target));
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return null;
  }
  return relative.split(path.sep).join("/");
}

// Matching is also tried in lowercase because macOS file systems are case-insensitive.
function checkWritePath(target: string, ctx: Context): Verdict {
  const relative = projectRelative(ctx.root, target);
  if (relative === null) return PASS;
  const rule = protectedRule(ctx.charter, relative) ?? protectedRule(ctx.charter, relative.toLowerCase());
  if (rule === null) return PASS;
  if (ctx.agentType !== null && rule.agents.test(ctx.agentType)) return PASS;
  return deny("protected-path", `${relative} is under protected prefix ${rule.prefix}`);
}

function checkTool(tool: string, input: HookInput, ctx: Context): Verdict {
  if (!RULE_TOOLS.has(tool)) return PASS;
  const toolInput = input.tool_input;
  if (!isRecord(toolInput)) return deny("policy-error", `tool_input is not an object for ${tool}`);

  if (tool === "Bash") {
    const command = toolInput.command;
    if (typeof command !== "string") return deny("policy-error", "Bash tool_input.command is missing");
    const verdict = checkCommand(command, ctx, 0);
    return verdict.decision === "deny" ? verdict : checkUrlHosts(command, ctx.charter);
  }

  if (tool === "WebFetch") {
    const url = toolInput.url;
    if (typeof url !== "string") return deny("policy-error", "WebFetch tool_input.url is missing");
    return checkUrl(url, ctx.charter);
  }

  if (tool === "ApplyPatch") {
    const patch = str(toolInput.patch) ?? str(toolInput.input);
    if (patch === null) return deny("policy-error", "ApplyPatch patch text is missing");
    const files = patchPaths(patch);
    if (files.length === 0) {
      return patch.trim() === "" ? PASS : deny("policy-error", "ApplyPatch has no recognized file header");
    }
    for (const file of files) {
      const verdict = checkWritePath(file, ctx);
      if (verdict.decision === "deny") return verdict;
    }
    return PASS;
  }

  const target = targetPath(toolInput);
  if (target === null) return deny("policy-error", `${tool} tool_input has no file path`);
  return checkWritePath(target, ctx);
}

function evaluateInput(input: HookInput, charter: Charter, root: string): Verdict {
  const event = input.hook_event_name;
  if (event !== "PreToolUse" && event !== "PermissionRequest") {
    return deny("policy-error", `unsupported hook event ${String(event)}`);
  }
  const tool = input.tool_name;
  if (typeof tool !== "string" || tool === "") return deny("policy-error", "tool_name is missing");
  const agent = str(input.agent_type);
  const ctx: Context = { charter, root, agentType: agent !== null && agent !== "" ? agent : null };

  const verdict = checkTool(tool, input, ctx);
  if (verdict.decision === "deny") return verdict;
  if (event === "PermissionRequest" && (charter.hooks.auto_approve_tools ?? []).includes(tool)) {
    return { decision: "allow", rule: "auto-approve", reason: `${tool} is listed in hooks.auto_approve_tools` };
  }
  return PASS;
}

// Deny wins over every other rule. Any exception becomes a policy-error deny.
export function evaluate(input: HookInput, charter: Charter, project: string): Verdict {
  try {
    return evaluateInput(input, charter, path.resolve(project));
  } catch (error) {
    return deny("policy-error", `policy error: ${messageOf(error)}`);
  }
}

function summaryOf(input: HookInput): string {
  const toolInput: Record<string, unknown> = isRecord(input.tool_input) ? input.tool_input : {};
  let text: string | null;
  if (input.tool_name === "Bash") text = str(toolInput.command);
  else if (input.tool_name === "WebFetch") text = str(toolInput.url);
  else if (input.tool_name === "ApplyPatch") text = patchPaths(str(toolInput.patch) ?? str(toolInput.input) ?? "").join(" ");
  else text = targetPath(toolInput);
  return (text ?? "").slice(0, SUMMARY_LIMIT);
}

function suggestionKeys(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (isRecord(entry) ? Object.keys(entry) : []));
}

function logLine(input: HookInput | null, verdict: Verdict): string {
  const entry: Record<string, unknown> = {
    ts: new Date().toISOString(),
    event: input ? str(input.hook_event_name) : null,
    tool: input ? str(input.tool_name) : null,
    agent: input ? str(input.agent_type) : null,
    mode: input ? str(input.permission_mode) : null,
    decision: verdict.decision,
    rule: verdict.rule === "" ? null : verdict.rule,
    summary: input ? summaryOf(input) : "",
  };
  if (input !== null && input.hook_event_name === "PermissionRequest") {
    entry.suggestions = suggestionKeys(input.permission_suggestions);
  }
  return JSON.stringify(entry);
}

interface Args {
  project: string;
  charter: string | null;
}

function parseArgs(argv: string[]): Args | string {
  let project: string | null = null;
  let charter: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const name = arg.startsWith("--") && eq !== -1 ? arg.slice(0, eq) : arg;
    if (name !== "--project" && name !== "--charter") return `unknown argument ${name}`;
    let value: string | undefined;
    if (name !== arg) {
      value = arg.slice(name.length + 1);
    } else {
      value = argv[i + 1];
      i += 1;
    }
    if (value === undefined || value === "") return `${name} needs a value`;
    if (name === "--project") project = value;
    else charter = value;
  }
  if (project === null) return "--project is required";
  return { project, charter };
}

function loadSafely(file: string): { charter: Charter | null; errors: string[] } {
  try {
    const result = loadCharter(file);
    if (result.charter === null || result.errors.length > 0) {
      return { charter: null, errors: result.errors.length > 0 ? result.errors : ["charter did not load"] };
    }
    return { charter: result.charter, errors: [] };
  } catch (error) {
    return { charter: null, errors: [messageOf(error)] };
  }
}

function parseInput(raw: string): HookInput | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function appendLog(file: string, line: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  appendFileSync(file, `${line}\n`);
}

async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);
  if (typeof parsed === "string") {
    process.stderr.write(`autopilot policy (policy-error): ${parsed}\n`);
    return 2;
  }
  const root = path.resolve(parsed.project);
  const charterPath = parsed.charter === null ? path.join(root, "autopilot.yaml") : path.resolve(parsed.charter);
  const loaded = loadSafely(charterPath);
  const input = parseInput(await readStdin());

  let verdict: Verdict;
  if (loaded.charter === null) {
    verdict = deny("policy-error", `charter invalid: ${loaded.errors.join("; ")}`);
  } else if (input === null) {
    verdict = deny("policy-error", "hook input on stdin is not a JSON object");
  } else {
    verdict = evaluate(input, loaded.charter, root);
  }

  const logFile = loaded.charter === null
    ? path.join(root, DEFAULT_LOG)
    : path.resolve(root, expandHome(loaded.charter.hooks.log));
  let final = verdict;
  try {
    appendLog(logFile, logLine(input, verdict));
  } catch (error) {
    if (final.decision !== "deny") {
      final = deny("policy-error", `cannot write the policy log: ${messageOf(error)}`);
    }
  }

  if (final.decision === "deny") {
    process.stderr.write(`autopilot policy (${final.rule}): ${final.reason}\n`);
    return 2;
  }
  if (final.decision === "allow") {
    process.stdout.write(`${JSON.stringify(ALLOW_OUTPUT)}\n`);
  }
  return 0;
}

if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(`autopilot policy (policy-error): ${messageOf(error)}\n`);
    return 2;
  });
}
