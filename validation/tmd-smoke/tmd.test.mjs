/**
 * tmd.test.mjs — deterministic driver for WP4 (TMD template law transcription).
 *
 * Validates: the shipped templates pass the linter in template mode; zone
 * removal, wrong precedence, and date-stamped last_verified are caught;
 * strict mode rejects unfilled slots and accepts a fully-filled manifold;
 * AGENTS.md router passes and the 50-line cap is enforced.
 *
 * Run from the repo:  node validation/tmd-smoke/tmd.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "tmd-fix-"));
mkdirSync(join(FIX, "bin"), { recursive: true });
copyFileSync(join(REPO, "bin", "lint-tmd.mjs"), join(FIX, "bin", "lint-tmd.mjs"));
cpSync(join(REPO, "templates", "tmd"), join(FIX, "templates", "tmd"), { recursive: true });
copyFileSync(join(REPO, "templates", "AGENTS.md"), join(FIX, "templates", "AGENTS.md"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function lint(args = [], allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, "bin", "lint-tmd.mjs"), ...args], { cwd: FIX, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

const TMD = join(FIX, "templates", "tmd");
const AGENTS = join(FIX, "templates", "AGENTS.md");
const SHA = "a".repeat(40);

// 1. Shipped templates pass in template mode
check("shipped templates VALID in template mode", lint([TMD]).code === 0);
check("shipped AGENTS.md router VALID", lint([TMD, "--agents", AGENTS]).code === 0);

// 2. Template mode must FAIL strict
check("templates REJECTED in --strict (unfilled slots)", lint([TMD, "--strict"], true).code === 1);

// 3. Zone integrity
const rules = join(TMD, "rules.md");
const origRules = readFileSync(rules, "utf8");
writeFileSync(rules, origRules.replace("## ZONE B", "## ZONE X"));
check("removing ZONE B is caught", lint([TMD], true).code === 1);
writeFileSync(rules, origRules);

// 4. Precedence arithmetic
writeFileSync(rules, origRules.replace("precedence: 1", "precedence: 2"));
const precRun = lint([TMD], true);
check("wrong precedence rank is caught", precRun.code === 1 && precRun.out.includes("precedence"));
writeFileSync(rules, origRules);

// 5. Header law: dates are not SHAs
writeFileSync(rules, origRules.replace(/last_verified: "TEMPLATE_VALUE_REQUIRED[^"]*"/, 'last_verified: "2026-08-29"'));
const dateRun = lint([TMD], true);
check("date-stamped last_verified is caught (L4)", dateRun.code === 1 && dateRun.out.includes("commit SHA"));
writeFileSync(rules, origRules);

// 6. Missing header = invalid law
writeFileSync(rules, origRules.replace(/^---\n[\s\S]*?\n---\n/, ""));
check("missing manifest header is caught", lint([TMD], true).code === 1);
writeFileSync(rules, origRules);

// 7. Unknown manifold file rejected
writeFileSync(join(TMD, "vibes.md"), "# vibes\n");
check("unknown manifold file rejected (five seats only)", lint([TMD], true).code === 1);
execFileSync("rm", [join(TMD, "vibes.md")]);

// 8. Strict mode accepts a fully-filled manifold
for (const f of ["rules.md", "gravity.md", "promises.md", "glossary.md", "design.md"]) {
  const p = join(TMD, f);
  let t = readFileSync(p, "utf8");
  t = t.replace(/manifold_version: "TEMPLATE_VALUE_REQUIRED[^"]*"/, 'manifold_version: "1.0.0"');
  t = t.replace(/last_verified: "TEMPLATE_VALUE_REQUIRED[^"]*"/, `last_verified: "${SHA}"`);
  t = t.replaceAll("TEMPLATE_VALUE_REQUIRED", "filled-per-project");
  writeFileSync(p, t);
}
check("fully-filled manifold VALID in --strict", lint([TMD, "--strict"], true).code === 0);

// 9. AGENTS.md 50-line cap
const long = readFileSync(AGENTS, "utf8") + "\nfiller".repeat(30);
writeFileSync(AGENTS, long);
check("AGENTS.md over 50 lines is caught (Instruction-File Boundary)", lint([TMD, "--agents", AGENTS], true).code === 1);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
