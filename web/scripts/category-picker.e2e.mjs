/**
 * Drives the checkout category picker in a real browser.
 *
 * The picker replaced a native select once the taxonomy passed a
 * hundred entries, and everything it does now (filtering, keyboard
 * selection, refusing a taken category) is our code rather than the
 * browser's. That is worth exercising rather than eyeballing.
 *
 * Needs a running server and a reachable Mission Control:
 *   npm run build && npx next start -p 3113
 *   node scripts/category-picker.e2e.mjs [baseUrl] [zone]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3113";
const ZONE = process.argv[3] ?? "summerville";
const CHROME =
  process.env.CHROME_PATH ??
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

let failures = 0;
const ok = (name, cond) => {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
};

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

// A zone with more than one card open lists the cards first, so find a
// real card link rather than hardcoding an id that will go stale.
await page.goto(`${BASE}/postcards/${ZONE}/checkout`, { waitUntil: "networkidle" });
const box = page.locator("#pc-cat");
if ((await box.count()) === 0) {
  const href = await page
    .locator(`a[href*="/postcards/${ZONE}/checkout?card="]`)
    .first()
    .getAttribute("href");
  if (!href) {
    console.log(`FAIL  no open card in ${ZONE} to test against`);
    await browser.close();
    process.exit(1);
  }
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
}
await box.waitFor({ timeout: 15000 });

await box.click();
const total = await page.locator('[role="option"]').count();
ok(`opens on focus, ${total} options`, total > 5);

await box.fill("auto");
const narrowed = await page.locator('[role="option"]').count();
ok(`"auto" narrows ${total} to ${narrowed}`, narrowed > 0 && narrowed < total);

await box.fill("detail auto");
const wordy = await page.locator('[role="option"]').allInnerTexts();
ok(
  "word order does not matter",
  wordy.length > 0 && wordy.every((t) => /auto/i.test(t) && /detail/i.test(t)),
);

await box.fill("zzzzqqq");
ok(
  "a miss explains itself instead of showing an empty box",
  /Nothing matches/i.test(await page.locator('ul[role="listbox"]').innerText()),
);

await box.fill("");
await box.press("ArrowDown");
await box.press("Enter");
const picked = await box.inputValue();
ok(`arrow and enter select ("${picked}")`, picked.length > 0);

await page.locator('[aria-label="Clear category"]').click();
ok("clear empties the field", (await box.inputValue()) === "");

await box.click();
const taken = page.locator('[role="option"][aria-disabled="true"]').first();
if (await taken.count()) {
  const label = (await taken.innerText()).split("\n")[0];
  await taken.dispatchEvent("mousedown");
  ok(`a taken category refuses selection ("${label}")`, (await box.inputValue()) !== label);
} else {
  console.log("SKIP  no taken category on this card");
}

await box.click();
await box.press("Escape");
ok("escape closes the list", (await page.locator('ul[role="listbox"]').count()) === 0);

ok("no page errors", pageErrors.length === 0);
if (pageErrors.length) console.log(pageErrors.join("\n"));

await browser.close();
process.exit(failures > 0 ? 1 : 0);
