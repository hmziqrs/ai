// post-review: posts the ai-review check run as the reviewer GitHub App (design 6.6, spec section 5).
// Exit 0 when the check run is posted or a dry run prints, 1 when GitHub refuses a request,
// 2 for usage or key-file errors. The app JWT and the installation token are never printed,
// logged or returned: every error message is scrubbed of both before it leaves this module.
import { createSign } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { expandHome } from "./lib/charter.ts";

const USAGE =
  "usage: bun post-review.ts --gh-repo OWNER/NAME --sha <40-hex> --conclusion success|failure|neutral --summary-file <path> --app-id <id> --installation-id <id> --key <pem path> [--title <text>] [--dry-run]\n";
const VALUE_FLAGS = new Set([
  "--gh-repo",
  "--sha",
  "--conclusion",
  "--summary-file",
  "--app-id",
  "--installation-id",
  "--key",
  "--title",
]);
const BOOLEAN_FLAGS = new Set(["--dry-run"]);
const REQUIRED_FLAGS = [
  "--gh-repo",
  "--sha",
  "--conclusion",
  "--summary-file",
  "--app-id",
  "--installation-id",
  "--key",
];
const CONCLUSIONS = ["success", "failure", "neutral"] as const;
const CHECK_NAME = "ai-review";
const DEFAULT_TITLE = "AI review";
const SUMMARY_LIMIT = 65000;
const API_ORIGIN = "https://api.github.com";
const API_VERSION = "2022-11-28";
const JWT_CLOCK_SKEW_SECONDS = 60;
const JWT_LIFETIME_SECONDS = 540;

export type Conclusion = (typeof CONCLUSIONS)[number];
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface ReviewOptions {
  repo: string;
  sha: string;
  conclusion: Conclusion;
  summary: string;
  title: string;
  appId: string;
  installationId: string;
  keyPath: string;
}

export interface ReviewResult {
  ok: boolean;
  checkRunId: number | null;
  error: string | null;
}

export type ParsedArgs =
  | { kind: "run"; summaryFile: string; dryRun: boolean; options: Omit<ReviewOptions, "summary"> }
  | { kind: "help" }
  | { kind: "usage"; message: string };

export function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") return { kind: "help" };
    if (!arg.startsWith("--")) return { kind: "usage", message: `unexpected argument ${arg}` };
    const eq = arg.indexOf("=");
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (VALUE_FLAGS.has(name)) {
      const value = eq >= 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || (eq < 0 && value.startsWith("--"))) {
        return { kind: "usage", message: `${name} needs a value` };
      }
      values.set(name, value);
    } else if (BOOLEAN_FLAGS.has(name) && eq < 0) {
      flags.add(name);
    } else {
      return { kind: "usage", message: `unknown flag ${name}` };
    }
  }

  for (const name of REQUIRED_FLAGS) {
    if (!values.has(name)) return { kind: "usage", message: `${name} is required` };
  }
  const get = (name: string): string => values.get(name) ?? "";

  const repo = get("--gh-repo");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    return { kind: "usage", message: "--gh-repo takes OWNER/NAME" };
  }
  const sha = get("--sha");
  if (!/^[0-9a-f]{40}$/.test(sha)) return { kind: "usage", message: "--sha takes a 40-character lowercase hex commit" };
  const conclusion = get("--conclusion");
  if (!(CONCLUSIONS as readonly string[]).includes(conclusion)) {
    return { kind: "usage", message: "--conclusion must be success, failure or neutral" };
  }
  const appId = get("--app-id");
  if (!/^\d+$/.test(appId)) return { kind: "usage", message: "--app-id takes a numeric id" };
  const installationId = get("--installation-id");
  if (!/^\d+$/.test(installationId)) return { kind: "usage", message: "--installation-id takes a numeric id" };
  const title = (values.get("--title") ?? DEFAULT_TITLE).trim();
  if (title === "") return { kind: "usage", message: "--title must not be empty" };

  return {
    kind: "run",
    summaryFile: get("--summary-file"),
    dryRun: flags.has("--dry-run"),
    options: {
      repo,
      sha,
      conclusion: conclusion as Conclusion,
      title,
      appId,
      installationId,
      keyPath: expandHome(get("--key")),
    },
  };
}

function base64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

export function buildJwt(appId: string, pem: string, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iat: nowSeconds - JWT_CLOCK_SKEW_SECONDS,
      exp: nowSeconds + JWT_LIFETIME_SECONDS,
      iss: appId,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(pem).toString("base64url")}`;
}

// Mode must be 0600 or stricter: no group or other bits, and no owner execute bit.
export function keyPermissionError(keyPath: string): string | null {
  let mode: number;
  try {
    mode = statSync(keyPath).mode & 0o777;
  } catch {
    return `key file not readable: ${keyPath}`;
  }
  if ((mode & 0o177) !== 0) {
    return `key file permissions too open (${mode.toString(8).padStart(4, "0")}), need 0600 or stricter: ${keyPath}`;
  }
  return null;
}

export function capSummary(summary: string): string {
  return [...summary].slice(0, SUMMARY_LIMIT).join("");
}

function tokenUrl(installationId: string): string {
  return `${API_ORIGIN}/app/installations/${installationId}/access_tokens`;
}

function checkRunUrl(repo: string): string {
  return `${API_ORIGIN}/repos/${repo}/check-runs`;
}

function apiHeaders(authorization: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: authorization,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

function checkRunBody(opts: ReviewOptions): Record<string, unknown> {
  return {
    name: CHECK_NAME,
    head_sha: opts.sha,
    status: "completed",
    conclusion: opts.conclusion,
    output: { title: opts.title, summary: capSummary(opts.summary) },
  };
}

export function dryRunPlan(opts: ReviewOptions): Record<string, unknown> {
  return {
    dryRun: true,
    requests: [
      {
        method: "POST",
        url: tokenUrl(opts.installationId),
        headers: apiHeaders("Bearer <app JWT, not printed>"),
      },
      {
        method: "POST",
        url: checkRunUrl(opts.repo),
        headers: { ...apiHeaders("Bearer <installation token, not printed>"), "Content-Type": "application/json" },
        body: checkRunBody(opts),
      },
    ],
  };
}

function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret !== "") out = out.split(secret).join("<redacted>");
  }
  return out;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failure(error: string, secrets: string[] = []): ReviewResult {
  return { ok: false, checkRunId: null, error: redact(error, secrets) };
}

type CallOutcome = { ok: true; body: Record<string, unknown> } | { ok: false; error: string };

async function call(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<CallOutcome> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    return { ok: false, error: `request failed: ${messageOf(error)}` };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  const object = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  if (!response.ok) {
    const message = typeof object?.message === "string" ? `: ${object.message.slice(0, 200)}` : "";
    return { ok: false, error: `HTTP ${response.status}${message}` };
  }
  if (object === null) return { ok: false, error: `HTTP ${response.status}: response was not JSON` };
  return { ok: true, body: object };
}

export async function postReview(opts: ReviewOptions, fetchImpl: FetchLike = fetch): Promise<ReviewResult> {
  const keyError = keyPermissionError(opts.keyPath);
  if (keyError !== null) return failure(keyError);

  let jwt: string;
  try {
    const pem = readFileSync(opts.keyPath, "utf8");
    jwt = buildJwt(opts.appId, pem, Math.floor(Date.now() / 1000));
  } catch (error) {
    return failure(`cannot sign app JWT: ${messageOf(error)}`);
  }

  const tokenCall = await call(fetchImpl, tokenUrl(opts.installationId), {
    method: "POST",
    headers: apiHeaders(`Bearer ${jwt}`),
  });
  if (!tokenCall.ok) return failure(`installation token: ${tokenCall.error}`, [jwt]);
  const token = tokenCall.body.token;
  if (typeof token !== "string" || token === "") {
    return failure("installation token: response had no token", [jwt]);
  }
  const secrets = [jwt, token];

  const checkCall = await call(fetchImpl, checkRunUrl(opts.repo), {
    method: "POST",
    headers: { ...apiHeaders(`Bearer ${token}`), "Content-Type": "application/json" },
    body: JSON.stringify(checkRunBody(opts)),
  });
  if (!checkCall.ok) return failure(`check run: ${checkCall.error}`, secrets);
  const id = checkCall.body.id;
  if (typeof id !== "number") return failure("check run: response had no id", secrets);
  return { ok: true, checkRunId: id, error: null };
}

export async function main(argv: string[], fetchImpl: FetchLike = fetch): Promise<number> {
  const parsed = parseArgs(argv);
  if (parsed.kind === "help") {
    process.stdout.write(USAGE);
    return 0;
  }
  if (parsed.kind === "usage") {
    process.stderr.write(`post-review: ${parsed.message}\n${USAGE}`);
    return 2;
  }

  const keyError = keyPermissionError(parsed.options.keyPath);
  if (keyError !== null) {
    process.stderr.write(`post-review: ${keyError}\n`);
    return 2;
  }

  let summary: string;
  try {
    summary = readFileSync(parsed.summaryFile, "utf8");
  } catch {
    process.stderr.write(`post-review: summary file not readable: ${parsed.summaryFile}\n`);
    return 2;
  }
  if (summary.trim() === "") {
    process.stderr.write(`post-review: summary file is empty: ${parsed.summaryFile}\n`);
    return 2;
  }

  const opts: ReviewOptions = { ...parsed.options, summary };
  if (parsed.dryRun) {
    process.stdout.write(`${JSON.stringify(dryRunPlan(opts), null, 2)}\n`);
    return 0;
  }

  const result = await postReview(opts, fetchImpl);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
