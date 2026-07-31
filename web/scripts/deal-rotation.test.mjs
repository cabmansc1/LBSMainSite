/**
 * Proves the two claims the /deals page makes about rotation:
 * it never duplicates a deal, and every deal gets a turn.
 *
 * Run: node scripts/deal-rotation.test.mjs
 */
import assert from "node:assert";
import {
  rotateDeals,
  rotationCycleMs,
  ROTATION_WINDOW_MS,
  MAX_DEALS,
  PINNED_DEALS,
} from "../src/lib/deal-rotation.ts";

const deals = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
let pass = 0;
const check = (name, fn) => {
  fn();
  pass++;
  console.log("  ok  " + name);
};

check("under the limit, everything shows and nothing rotates", () => {
  const all = deals(12);
  assert.deepStrictEqual(rotateDeals(all, { nowMs: 0 }), all);
  assert.deepStrictEqual(rotateDeals(all, { nowMs: 9e12 }), all);
});

check("exactly at the limit, everything shows", () => {
  const all = deals(MAX_DEALS);
  assert.strictEqual(rotateDeals(all, { nowMs: 5e11 }).length, MAX_DEALS);
});

check("over the limit, the page is always full and never repeats", () => {
  for (const total of [26, 40, 100, 500]) {
    const all = deals(total);
    for (let w = 0; w < 200; w++) {
      const shown = rotateDeals(all, { nowMs: w * ROTATION_WINDOW_MS });
      assert.strictEqual(shown.length, MAX_DEALS, `total ${total} window ${w}`);
      assert.strictEqual(
        new Set(shown.map((d) => d.id)).size,
        MAX_DEALS,
        `duplicate at total ${total} window ${w}`,
      );
    }
  }
});

check("the newest deals are always on the page", () => {
  const all = deals(500);
  for (let w = 0; w < 50; w++) {
    const shown = rotateDeals(all, { nowMs: w * ROTATION_WINDOW_MS });
    for (let i = 0; i < PINNED_DEALS; i++) {
      assert.strictEqual(shown[i].id, i, `pin ${i} missing at window ${w}`);
    }
  }
});

check("every deal appears within one advertised cycle", () => {
  for (const total of [26, 40, 100, 500]) {
    const all = deals(total);
    const windows = rotationCycleMs(total) / ROTATION_WINDOW_MS;
    const seen = new Set();
    for (let w = 0; w < windows; w++) {
      for (const d of rotateDeals(all, { nowMs: w * ROTATION_WINDOW_MS })) {
        seen.add(d.id);
      }
    }
    assert.strictEqual(
      seen.size,
      total,
      `total ${total}: ${total - seen.size} deals never shown in ${windows} windows`,
    );
  }
});

check("the page holds still inside one window", () => {
  const all = deals(500);
  const base = 77 * ROTATION_WINDOW_MS;
  const a = rotateDeals(all, { nowMs: base });
  const b = rotateDeals(all, { nowMs: base + ROTATION_WINDOW_MS - 1 });
  assert.deepStrictEqual(a, b);
  const c = rotateDeals(all, { nowMs: base + ROTATION_WINDOW_MS });
  assert.notDeepStrictEqual(a, c);
});

check("clocks before the epoch do not produce a negative index", () => {
  const all = deals(60);
  const shown = rotateDeals(all, { nowMs: -5 * ROTATION_WINDOW_MS });
  assert.strictEqual(shown.length, MAX_DEALS);
  assert.ok(shown.every((d) => d !== undefined));
});

console.log(`\n${pass}/${pass} passed`);
