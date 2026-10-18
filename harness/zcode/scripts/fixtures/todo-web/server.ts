// The reference web server: one page at /, and a 500 when the page-500 fault is injected.
const fault = process.env.FAULT ?? "";
Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  fetch(req) {
    if (new URL(req.url).pathname !== "/") return new Response("not found", { status: 404 });
    if (fault === "page-500") return new Response("boom", { status: 500 });
    return new Response("<!doctype html><html><head><title>To-do</title></head><body><h1>To-do</h1></body></html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});
console.log("listening");
