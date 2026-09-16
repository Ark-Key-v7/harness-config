/**
 * wpd6.test.mjs — deterministic driver for WP-D-6 (profiles/protocols/promotions).
 *
 * Asserts (WP-D-6 §10 driver clause):
 *  (a) the five adopted skill dirs exist with metadata.class in frontmatter;
 *  (b) roster-laws.md exists and every profile references it;
 *  (c) ship-gate/SKILL.md contains `24-hour review clock`, `never auto-merge`,
 *      and `Harvest provenance`.
 *
 * Run from the repo:  node validation/wpd6-smoke/wpd6.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

// (a) five adopted skill dirs exist with metadata.class
for (const s of [
  "api-and-interface-design",
  "security-and-hardening",
  "observability-and-instrumentation",
  "documentation-and-adrs",
  "browser-testing-with-devtools",
]) {
  const p = join(REPO, "skills", s, "SKILL.md");
  const ok = existsSync(p);
  let hasClass = false;
  if (ok) {
    const fm = readFileSync(p, "utf8").match(/^---\n[\s\S]*?\n---/);
    hasClass = !!fm && /^\s+class:\s*(procedural|discipline)$/m.test(fm[0]);
  }
  check(`adopted skill ${s} exists with metadata.class`, ok && hasClass);
}
check("security-and-hardening reference byte-present", existsSync(join(REPO, "skills", "security-and-hardening", "references", "security-checklist.md")));
check("observability reference byte-present", existsSync(join(REPO, "skills", "observability-and-instrumentation", "references", "observability-checklist.md")));

// (b) roster-laws.md exists and every profile references it
const laws = join(REPO, "templates", "agents", "profiles", "roster-laws.md");
check("roster-laws.md exists", existsSync(laws));
if (existsSync(laws)) check("roster-laws carries the Core Operating Behaviors", readFileSync(laws, "utf8").includes("Core Operating Behaviors"));
for (const seat of ["scout", "planner", "worker", "reviewer"]) {
  const t = readFileSync(join(REPO, "templates", "agents", "profiles", `${seat}.md`), "utf8");
  check(`${seat}.md references roster-laws.md`, t.includes("roster-laws.md"));
  check(`${seat}.md carries the protocols block`, /  protocols:/.test(t) && /invoke_peers:\s*false/.test(t));
}

// (c) ship-gate sentinels
const sg = readFileSync(join(REPO, "skills", "ship-gate", "SKILL.md"), "utf8");
check("ship-gate: 24-hour review clock", sg.includes("24-hour review clock"));
check("ship-gate: never auto-merge", sg.includes("never auto-merge"));
check("ship-gate: Harvest provenance", sg.includes("Harvest provenance"));

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
