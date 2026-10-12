// Prints local-only JWT secret + anon/service keys as env lines.
import crypto from "node:crypto";
const secret = process.env.JWT_SECRET ?? "local-only-jwt-secret-for-belle-tests-0123456789";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
};
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
console.log(`JWT_SECRET=${secret}`);
console.log(`ANON_KEY=${sign({ iss: "supabase-local", role: "anon", exp })}`);
console.log(`SERVICE_ROLE_KEY=${sign({ iss: "supabase-local", role: "service_role", exp })}`);
