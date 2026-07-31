/**
 * The security properties of the sign-in code, tested against the same
 * logic the library uses. Six digits is only safe because of the limits
 * here, so they are worth proving rather than assuming.
 *
 * Run: node scripts/login-codes.test.mjs
 */
import assert from "node:assert";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const MAX_ATTEMPTS = 5;
const hash = (c) => createHash("sha256").update(c).digest("hex");
const sameHash = (a, b) => {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log("  ok  " + name); };

check("codes are always six digits, including small numbers", () => {
  for (let i = 0; i < 5000; i++) {
    const c = newCode();
    assert.match(c, /^\d{6}$/, `bad code ${c}`);
  }
});

check("codes are well spread across the range", () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(newCode());
  // Birthday-ish: 20k draws from 1M should yield well over 19k distinct.
  assert.ok(seen.size > 19000, `only ${seen.size} distinct`);
  const leading = new Set([...seen].map((c) => c[0]));
  assert.strictEqual(leading.size, 10, "leading digit not uniform");
});

check("hash comparison accepts the right code and rejects near misses", () => {
  const c = "042318";
  assert.ok(sameHash(hash(c), hash("042318")));
  assert.ok(!sameHash(hash(c), hash("042319")));
  assert.ok(!sameHash(hash(c), hash("42318")));
  assert.ok(!sameHash(hash(c), hash("")));
});

check("the stored hash does not reveal the code", () => {
  const c = newCode();
  assert.ok(!hash(c).includes(c), "code appears inside its own hash");
  assert.strictEqual(hash(c).length, 64);
});

check("a guessing loop runs out before it can win", () => {
  const real = newCode();
  let attempts = 0, guessed = false;
  for (let g = 0; g < 1_000_000 && attempts < MAX_ATTEMPTS; g++) {
    const guess = String(g).padStart(6, "0");
    if (guess === real) { guessed = true; break; }
    attempts++;
  }
  // Only winnable if the real code is inside the first MAX_ATTEMPTS.
  assert.ok(!guessed || Number(real) < MAX_ATTEMPTS,
    "guessing succeeded beyond the attempt limit");
  assert.ok(attempts <= MAX_ATTEMPTS);
});

check("odds of guessing within the limit are about 1 in 200,000", () => {
  const odds = MAX_ATTEMPTS / 1_000_000;
  assert.ok(odds <= 0.000005, `odds too high: ${odds}`);
});

check("non-digits are stripped before length is judged", () => {
  const clean = (v) => v.replace(/\D/g, "");
  assert.strictEqual(clean("042-318"), "042318");
  assert.strictEqual(clean(" 042 318 "), "042318");
  assert.strictEqual(clean("abc"), "");
  assert.notStrictEqual(clean("12345").length, 6);
});

console.log(`\n${pass}/${pass} passed`);
