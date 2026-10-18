// Reference to-do backend for `probe-todo-backend.mjs --self-test`. It implements the R4 contract in
// harness/zcode/skills/shipflow/references/test-playbook.md. TODO_REFERENCE_FAULT injects one named
// defect, so the self-test can show that the probe fails each one.
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const fault = process.env.TODO_REFERENCE_FAULT ?? "";
const dbPath = fault === "memory-db" ? ":memory:" : (process.env.DB_PATH ?? "data/todo.sqlite");
const ttlSeconds = Number(process.env.LOGIN_CODE_TTL_SECONDS ?? 600);
if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { create: true });
db.exec(`
  create table if not exists codes (email text not null, code text not null, expires integer not null, used integer not null default 0);
  create table if not exists tokens (token text primary key, email text not null);
  create table if not exists todos (id integer primary key autoincrement, email text not null, title text not null, done integer not null default 0);
`);

type Todo = { id: number; title: string; done: number };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reply(status: number, body?: unknown): Response {
  return body === undefined ? new Response(null, { status }) : Response.json(body, { status });
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.json();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// The dummy mailer: no email leaves the machine, the code goes to the terminal.
function sendLoginCode(email: string, code: string): void {
  if (fault !== "silent-mailer") console.log(`MAIL to=${email} code=${code}`);
}

function caller(req: Request): { email: string; token: string } | null {
  const match = /^Bearer (\S+)$/.exec(req.headers.get("authorization") ?? "");
  if (!match) return null;
  const row = db.query("select email from tokens where token = ?").get(match[1]) as { email: string } | null;
  return row ? { email: row.email, token: match[1] } : null;
}

const view = (row: Todo) => ({ id: row.id, title: row.title, done: row.done === 1 });

async function todos(req: Request, path: string, email: string): Promise<Response> {
  if (path === "/todos" && req.method === "GET") {
    const rows = db.query("select id, title, done from todos where email = ? order by id").all(email) as Todo[];
    return reply(200, rows.map(view));
  }
  if (path === "/todos" && req.method === "POST") {
    const body = await readBody(req);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return reply(400, { error: "title is required" });
    const row = db.query("insert into todos (email, title) values (?, ?) returning id, title, done").get(email, title) as Todo;
    return reply(201, view(row));
  }
  const id = Number(path.slice("/todos/".length));
  const row = (fault === "cross-user"
    ? db.query("select id, title, done from todos where id = ?").get(id)
    : db.query("select id, title, done from todos where id = ? and email = ?").get(id, email)) as Todo | null;
  if (!Number.isInteger(id) || !row) return reply(404, { error: "not found" });
  if (req.method === "DELETE") {
    db.query("delete from todos where id = ?").run(id);
    return reply(204);
  }
  if (req.method === "PATCH") {
    const body = await readBody(req);
    if ("title" in body && (typeof body.title !== "string" || !body.title.trim())) return reply(400, { error: "invalid title" });
    if ("done" in body && typeof body.done !== "boolean") return reply(400, { error: "invalid done" });
    const title = typeof body.title === "string" ? body.title.trim() : row.title;
    const done = typeof body.done === "boolean" ? (body.done ? 1 : 0) : row.done;
    db.query("update todos set title = ?, done = ? where id = ?").run(title, done, id);
    return reply(200, view({ id, title, done }));
  }
  return reply(405, { error: "method not allowed" });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (req.method === "GET" && path === "/health") return reply(200, { ok: true });
    if (req.method === "POST" && path === "/auth/request") {
      const body = await readBody(req);
      const email = typeof body.email === "string" ? body.email : "";
      if (!EMAIL.test(email)) return reply(400, { error: "invalid email" });
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      db.query("insert into codes (email, code, expires) values (?, ?, ?)").run(email, code, Date.now() + ttlSeconds * 1000);
      sendLoginCode(email, code);
      return reply(202, { sent: true });
    }
    if (req.method === "POST" && path === "/auth/verify") {
      const body = await readBody(req);
      const row = db
        .query("select rowid as id, expires, used from codes where email = ? and code = ? order by rowid desc")
        .get(String(body.email ?? ""), String(body.code ?? "")) as { id: number; expires: number; used: number } | null;
      const reused = row !== null && row.used === 1 && fault !== "reusable-code";
      const expired = row !== null && row.expires < Date.now() && fault !== "no-expiry";
      if (!row || reused || expired) return reply(401, { error: "invalid code" });
      db.query("update codes set used = 1 where rowid = ?").run(row.id);
      const token = crypto.randomUUID();
      db.query("insert into tokens (token, email) values (?, ?)").run(token, String(body.email));
      return reply(200, { token });
    }
    if (req.method === "POST" && path === "/auth/logout") {
      const who = caller(req);
      if (!who) return reply(401, { error: "unauthorized" });
      if (fault !== "logout-noop") db.query("delete from tokens where token = ?").run(who.token);
      return reply(204);
    }
    if (path === "/todos" || path.startsWith("/todos/")) {
      const who = caller(req);
      if (!who) return reply(401, { error: "unauthorized" });
      return todos(req, path, who.email);
    }
    return reply(404, { error: "not found" });
  },
});

console.log(`listening on ${server.port}`);
