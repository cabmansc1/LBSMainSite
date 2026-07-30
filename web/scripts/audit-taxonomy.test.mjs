/**
 * The taxonomy audit, against the cases it exists to catch.
 *
 * Fixtures rather than a database, and the real functions rather than a
 * copy of them: the whole risk in this script is the judgement about
 * what counts as broken and what it should become, which is exactly
 * what a reimplementation in a test would stop checking.
 *
 * Run: node scripts/audit-taxonomy.test.mjs
 */
import assert from "node:assert";
import { analyse, check, report, slugify } from "./audit-taxonomy.mjs";

let pass = 0;
const it = (name, fn) => {
  fn();
  pass++;
  console.log("  ok  " + name);
};

const categories = [
  { slug: "hvac", display_name: "HVAC", is_active: 1 },
  { slug: "plumbing", display_name: "Plumbing", is_active: 1 },
  { slug: "auto-repair", display_name: "Auto Repair", is_active: 1 },
  { slug: "tanning-salons", display_name: "Tanning Salons", is_active: 0 },
];
const locations = [
  { slug: "mount-pleasant", display_name: "Mount Pleasant", is_active: 1 },
  { slug: "james-island", display_name: "James Island", is_active: 1 },
];

const biz = (over) => ({
  id: 1,
  business_name: "Test Co",
  slug: "test-co",
  category: "hvac",
  location_area: "mount-pleasant",
  city: "Mount Pleasant",
  is_active: 1,
  is_verified: 1,
  is_hidden: 0,
  ...over,
});

const run = (businesses) => analyse({ businesses, categories, locations });

it("a listing on real slugs is clean", () => {
  const r = run([biz()]);
  assert.equal(r.ok, 1);
  assert.equal(r.problems.length, 0);
});

it("a display name typed into the slug column is caught", () => {
  const r = run([biz({ category: "HVAC" })]);
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0].category.kind, "unknown");
});

it("and is matched back to the right slug", () => {
  const r = run([biz({ category: "HVAC" })]);
  assert.equal(r.problems[0].category.suggest, "hvac");
});

it("a spaced display name maps through slugify", () => {
  const r = run([biz({ location_area: "Mount Pleasant" })]);
  assert.equal(r.problems[0].location.suggest, "mount-pleasant");
});

it("case and punctuation do not defeat the match", () => {
  const r = run([biz({ category: "auto repair" })]);
  assert.equal(r.problems[0].category.suggest, "auto-repair");
});

it("a value matching nothing gets no suggestion", () => {
  const r = run([biz({ category: "underwater-basket-weaving" })]);
  assert.equal(r.problems[0].category.kind, "unknown");
  assert.equal(r.problems[0].category.suggest, undefined);
});

it("an empty value is reported but not guessed at", () => {
  const r = run([biz({ category: "" })]);
  assert.equal(r.problems[0].category.kind, "empty");
  assert.equal(r.problems[0].category.suggest, undefined);
});

it("null is treated as empty, not as a broken slug", () => {
  const r = run([biz({ location_area: null })]);
  assert.equal(r.problems[0].location.kind, "empty");
});

it("a real slug pointing at a deactivated entry is flagged separately", () => {
  const r = run([biz({ category: "tanning-salons" })]);
  assert.equal(r.problems[0].category.kind, "inactive");
});

it("both columns broken on one listing are reported together", () => {
  const r = run([biz({ category: "HVAC", location_area: "James Island" })]);
  assert.equal(r.problems.length, 1);
  assert.equal(r.problems[0].category.suggest, "hvac");
  assert.equal(r.problems[0].location.suggest, "james-island");
});

it("live listings sort above ones nobody can see", () => {
  const r = run([
    biz({ id: 1, business_name: "Hidden", category: "HVAC", is_hidden: 1 }),
    biz({ id: 2, business_name: "Live", category: "HVAC" }),
  ]);
  assert.equal(r.problems[0].business.id, 2);
  assert.equal(r.live, 1);
});

it("unverified counts as not live, matching what the directory shows", () => {
  const r = run([biz({ category: "HVAC", is_verified: 0 })]);
  assert.equal(r.live, 0);
});

it("suggested SQL targets one row and quotes the value", () => {
  const r = run([biz({ id: 42, category: "HVAC" })]);
  const { suggestions } = report({
    result: r,
    categories,
    locations,
    escape: (v) => `'${String(v).replace(/'/g, "''")}'`,
  });
  assert.equal(suggestions.length, 1);
  assert.match(suggestions[0], /^UPDATE directory_businesses SET category = 'hvac' WHERE id = 42;/);
});

it("nothing without a confident match becomes SQL", () => {
  const r = run([biz({ category: "underwater-basket-weaving" }), biz({ id: 2, category: "" })]);
  const { suggestions } = report({
    result: r,
    categories,
    locations,
    escape: (v) => `'${v}'`,
  });
  assert.equal(suggestions.length, 0);
});

it("a clean database says so rather than printing an empty list", () => {
  const { text } = report({
    result: run([biz()]),
    categories,
    locations,
    escape: (v) => `'${v}'`,
  });
  assert.match(text, /Nothing to fix/);
});

it("check() is unaffected by surrounding whitespace", () => {
  const idx = {
    bySlug: new Map([["hvac", { slug: "hvac", is_active: 1 }]]),
    byName: new Map(),
    byLooseName: new Map(),
  };
  assert.equal(check("  hvac  ", idx).kind, "ok");
});

it("slugify matches the app's rule for ampersands", () => {
  assert.equal(slugify("Heating & Cooling"), "heating-and-cooling");
});

console.log(`\n${pass} passed`);
