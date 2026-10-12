// A tiny stand-in for Supabase's API gateway: routes /auth/v1 and /rest/v1
// to the local containers and answers CORS preflights. Local testing only.
import http from "node:http";

const routes = { "/auth/v1": "http://127.0.0.1:54329", "/rest/v1": "http://127.0.0.1:54330" };
const port = Number(process.env.GATEWAY_PORT ?? 54321);
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, prefer, range, accept-profile, content-profile, x-supabase-api-version",
  "access-control-allow-methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "access-control-expose-headers": "content-range, x-total-count",
};

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors);
      return res.end();
    }
    const prefix = Object.keys(routes).find((p) => req.url.startsWith(p));
    if (!prefix) {
      res.writeHead(404, cors);
      return res.end("not found");
    }
    const target = new URL(routes[prefix] + (req.url.slice(prefix.length) || "/"));
    const headers = { ...req.headers, host: target.host };
    const upstream = http.request(target, { method: req.method, headers }, (up) => {
      const out = { ...up.headers, ...cors };
      res.writeHead(up.statusCode ?? 502, out);
      up.pipe(res);
    });
    upstream.on("error", (e) => {
      res.writeHead(502, cors);
      res.end(String(e));
    });
    req.pipe(upstream);
  })
  .listen(port, () => console.log(`gateway on :${port}`));
