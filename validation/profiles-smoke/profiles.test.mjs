/**
 * profiles.test.mjs — deterministic driver for WP5 (role roster profiles).
 *
 * Validates: shipped roster passes the linter; missing seat, missing E.5 key,
 * write-tool in a no-write seat, wrong write_scope, and missing Kimi mapping
 * are all caught.
 *
 * Run from the repo:  node validation/profiles-smoke/profiles.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "prof-fix-"));
mkdirSync(join(FIX, "tools"), { recursive: true });
copyFileSync(join(REPO, "tools", "lint-profiles.mjs"), join(FIX, "tools", "lint-profiles.mjs"));
cpSync(join(REPO, "templates", "agents", "profiles"), join(FIX, "templates", "agents", "profiles"), { recursive: true });

const PROFILES = join(FIX, "templates", "agents", "profiles");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function lint(allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, "tools", "lint-profiles.mjs"), PROFILES], { cwd: FIX, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

const scoutPath = join(PROFILES, "scout.md");
const scoutOrig = readFileSync(scoutPath, "utf8");

check("shipped roster VALID", lint().code === 0);

// missing seat
rmSync(join(PROFILES, "reviewer.md"));
const missRun = lint(true);
check("missing seat caught", missRun.code === 1 && missRun.out.includes("reviewer.md"));
writeFileSync(join(PROFILES, "reviewer.md"), readFileSync(join(REPO, "templates", "agents", "profiles", "reviewer.md"), "utf8"));

// missing E.5 key
writeFileSync(scoutPath, scoutOrig.replace("substitution_bounds:", "subst_bounds:"));
const keyRun = lint(true);
check("missing E.5 key caught", keyRun.code === 1 && keyRun.out.includes("substitution_bounds"));
writeFileSync(scoutPath, scoutOrig);

// write tool in a no-write seat
writeFileSync(scoutPath, scoutOrig.replace("tool_allowlist: [read, grep, find, ls]", "tool_allowlist: [read, grep, find, ls, write]"));
const loadRun = lint(true);
check("write tool in no-write seat caught (minimal loadout)", loadRun.code === 1 && loadRun.out.includes("minimal loadout"));
writeFileSync(scoutPath, scoutOrig);

// wrong write_scope
writeFileSync(scoutPath, scoutOrig.replace("write_scope: none", "write_scope: sub-graph"));
const scopeRun = lint(true);
check("wrong write_scope caught (roster law)", scopeRun.code === 1 && scopeRun.out.includes("write_scope"));
writeFileSync(scoutPath, scoutOrig);

// missing Kimi mapping
writeFileSync(scoutPath, scoutOrig.replace("kimi-subscription regime", "some-other regime"));
const kimiRun = lint(true);
check("missing Kimi-subscription mapping caught", kimiRun.code === 1 && kimiRun.out.includes("Kimi-subscription"));
writeFileSync(scoutPath, scoutOrig);

check("roster VALID again after restores", lint().code === 0);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
