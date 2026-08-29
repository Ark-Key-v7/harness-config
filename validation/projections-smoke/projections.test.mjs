/**
 * projections.test.mjs — deterministic driver for WP3 (projection generator).
 *
 * Validates: deterministic byte-identical generation, L4 header law, pointer
 * coverage of manifold + roster, tolerance for missing WP4/WP5 inputs, drift
 * check (clean passes, hand-edit fails), staleness assertion (fresh passes,
 * staled fixture blocks).
 *
 * Run from the repo:  node validation/projections-smoke/projections.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, cpSync, existsSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_TOOLS = join(HERE, "..", "..", "tools");

// --- Fixture: a mini harness-config repo in tmp -------------------------------
const FIX = mkdtempSync(join(tmpdir(), "proj-fix-"));
mkdirSync(join(FIX, "tools"), { recursive: true });
for (const s of ["generate-projections.mjs", "check-projections.mjs", "assert-projection-fresh.mjs"]) {
  copyFileSync(join(REPO_TOOLS, s), join(FIX, "tools", s));
}

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(script, args = [], allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, "tools", script), ...args], {
      cwd: FIX, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stderr ?? "") + String(err.stdout ?? "") };
    throw err;
  }
}

const HEAD_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const HEAD_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

// --- Phase 1: WP4/WP5 inputs ABSENT — generator must tolerate -----------------
run("generate-projections.mjs", ["--source-head", HEAD_A]);
const appendPath = join(FIX, "projections", "pi", "append-system.md");
const settingsPath = join(FIX, "projections", "pi", "pi-settings.json");
check("generator runs with no templates committed", existsSync(appendPath) && existsSync(settingsPath));
const emptyAppend = readFileSync(appendPath, "utf8");
check("empty-state is explicit (no phantom pointers)", emptyAppend.includes("none committed yet"));
check("L4 header: source_head recorded", emptyAppend.includes(`source_head: ${HEAD_A}`));

// --- Phase 2: add manifold + profile fixtures ----------------------------------
mkdirSync(join(FIX, "templates", "tmd"), { recursive: true });
mkdirSync(join(FIX, "templates", "agents", "profiles"), { recursive: true });
writeFileSync(join(FIX, "templates", "tmd", "gravity.md"), "# gravity\n");
writeFileSync(join(FIX, "templates", "tmd", "rules.md"), "# rules\n");
writeFileSync(join(FIX, "templates", "tmd", "promises.md"), "# promises\n");
writeFileSync(join(FIX, "templates", "agents", "profiles", "worker.md"), "# worker\n");
writeFileSync(join(FIX, "templates", "agents", "profiles", "scout.md"), "# scout\n");
run("generate-projections.mjs", ["--source-head", HEAD_A]);
const full = readFileSync(appendPath, "utf8");

check("pointer: rules.md present", full.includes("templates/tmd/rules.md"));
check("pointer: gravity.md present", full.includes("templates/tmd/gravity.md"));
check("pointer: promises.md present", full.includes("templates/tmd/promises.md"));
check("precedence order: rules(1) before gravity(2) before promises(3)",
  full.indexOf("rules.md") < full.indexOf("gravity.md") && full.indexOf("gravity.md") < full.indexOf("promises.md"));
check("roster binding: worker profile", full.includes("templates/agents/profiles/worker.md"));
check("roster binding: scout profile", full.includes("templates/agents/profiles/scout.md"));
check("cache-boundary declared (stable part only)", full.includes("STABLE part"));
check("no duplicated law: projection carries pointers, not template bodies", !full.includes("# gravity"));
const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
check("settings projection: valid JSON with extensions/packages keys", Array.isArray(settings.extensions) && Array.isArray(settings.packages));
check("settings projection: meta keys prefixed for WP8 stripping", "_sourceHead" in settings && "_generated" in settings);

// --- Phase 3: determinism ---------------------------------------------------------
run("generate-projections.mjs", ["--out", join(FIX, "regen1"), "--source-head", HEAD_A]);
run("generate-projections.mjs", ["--out", join(FIX, "regen2"), "--source-head", HEAD_A]);
check("byte-identical across runs (append-system)",
  readFileSync(join(FIX, "regen1", "pi", "append-system.md"), "utf8") === readFileSync(join(FIX, "regen2", "pi", "append-system.md"), "utf8"));
check("byte-identical across runs (settings)",
  readFileSync(join(FIX, "regen1", "pi", "pi-settings.json"), "utf8") === readFileSync(join(FIX, "regen2", "pi", "pi-settings.json"), "utf8"));

// --- Phase 4: drift check -------------------------------------------------------------
const cleanRun = run("check-projections.mjs");
check("drift check passes on a clean tree", cleanRun.code === 0);
appendFileSync(appendPath, "\nhand edit\n");
const driftRun = run("check-projections.mjs", [], true);
check("drift check FAILS on a hand-edited projection", driftRun.code === 1 && driftRun.out.includes("DRIFT"));
run("generate-projections.mjs", ["--source-head", HEAD_A]); // restore
check("drift check passes again after regeneration", run("check-projections.mjs").code === 0);

// --- Phase 5: staleness assertion ------------------------------------------------------
check("staleness assert passes when fresh", run("assert-projection-fresh.mjs", ["--expected", HEAD_A]).code === 0);
const staleRun = run("assert-projection-fresh.mjs", ["--expected", HEAD_B], true);
check("staleness assert BLOCKS a staled fixture", staleRun.code === 1 && staleRun.out.includes("STALE"));
// corrupt the header marker -> treated as stale/corrupt, never waved through
const sPath = settingsPath;
const sOrig = readFileSync(sPath, "utf8");
writeFileSync(sPath, sOrig.replace('"_sourceHead"', '"_srcHead"'));
check("missing head marker = stale (fail-closed)", run("assert-projection-fresh.mjs", ["--expected", HEAD_A], true).code === 1);
writeFileSync(sPath, sOrig); // restore

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
