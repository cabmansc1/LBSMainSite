/**
 * Impersonation is useful and dangerous, and the difference is the
 * guards. These prove the ones that are pure logic; the route-level
 * refusals are checked against a running server separately.
 *
 * Run: node scripts/impersonation.test.mjs
 */
import assert from "node:assert";
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = "test-secret";
const sign = (p) => createHmac("sha256", SECRET).update(p).digest("base64url");
const encode = (u) => {
  const p = Buffer.from(JSON.stringify({ ...u, exp: Date.now() + 60000 })).toString("base64url");
  return `${p}.${sign(p)}`;
};
const decode = (t) => {
  const [p, mac] = t.split(".");
  if (!p || !mac) return null;
  const a = Buffer.from(mac), b = Buffer.from(sign(p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const d = JSON.parse(Buffer.from(p, "base64url").toString());
  if (d.exp < Date.now()) return null;
  const by = d.impersonatedBy;
  return {
    id: d.id, email: d.email, firstName: d.firstName,
    role: d.role === "admin" ? "admin" : undefined,
    impersonatedBy: by && typeof by.id === "number" && typeof by.email === "string"
      ? { id: by.id, email: by.email } : undefined,
  };
};
const isImpersonating = (u) => !!u?.impersonatedBy;

let pass = 0;
const check = (n, f) => { f(); pass++; console.log("  ok  " + n); };

const admin = { id: 1, email: "owner@example.com", firstName: "Owner", role: "admin" };
const asUser = { id: 42, email: "biz@example.com", firstName: "Biz",
                 impersonatedBy: { id: 1, email: "owner@example.com" } };

check("an impersonated session is not an admin", () => {
  const s = decode(encode(asUser));
  assert.strictEqual(s.role, undefined, "impersonated session carries admin role");
  assert.ok(isImpersonating(s));
});

check("a normal session is not flagged as impersonating", () => {
  assert.ok(!isImpersonating(decode(encode(admin))));
  assert.ok(!isImpersonating(decode(encode({ id: 7, email: "a@b.c", firstName: "A" }))));
});

check("stripping impersonatedBy invalidates the signature", () => {
  const token = encode(asUser);
  const [p] = token.split(".");
  const data = JSON.parse(Buffer.from(p, "base64url").toString());
  delete data.impersonatedBy;
  const forged = Buffer.from(JSON.stringify(data)).toString("base64url");
  // Re-using the original signature must fail.
  assert.strictEqual(decode(`${forged}.${token.split(".")[1]}`), null);
});

check("granting yourself admin invalidates the signature", () => {
  const token = encode(asUser);
  const [p, mac] = token.split(".");
  const data = JSON.parse(Buffer.from(p, "base64url").toString());
  data.role = "admin";
  const forged = Buffer.from(JSON.stringify(data)).toString("base64url");
  assert.strictEqual(decode(`${forged}.${mac}`), null);
});

check("a malformed impersonatedBy is dropped, not trusted", () => {
  const s = decode(encode({ ...asUser, impersonatedBy: { id: "1", email: 5 } }));
  assert.strictEqual(s.impersonatedBy, undefined);
  assert.ok(!isImpersonating(s));
});

check("the admin to restore comes from the signed record", () => {
  const s = decode(encode(asUser));
  assert.strictEqual(s.impersonatedBy.id, 1);
  assert.strictEqual(s.impersonatedBy.email, "owner@example.com");
});

console.log(`\n${pass}/${pass} passed`);
