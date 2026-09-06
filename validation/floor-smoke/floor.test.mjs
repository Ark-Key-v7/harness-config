/**
 * floor.test.mjs — deterministic driver for WP-C floor ratchet.
 *
 * Canon: Harness v1.3 §5.10.2 — floors are monotonic: auto-raise on merge,
 * lower only by operator ratification; _MAX ceilings cap the ratchet;
 * slack is reported. A floor that can silently lower is not a floor.
 *
 * Fixtures: raise (ok), silent lowering (refused), ratified lowering
 * (recorded), ceiling breach (refused), report (slack printed).
 *
 * Run from the repo:  node validation/floor-smoke/floor.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TOOL = join(REPO, "bin", "floor-ratchet.mjs");

const FIX = mkdtempSync(join(tmpdir(), "floor-fix-"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function ratchet(args) {
  const r = spawnSync(process.execPath, [TOOL, "--target", FIX, ...args], { encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}

// 1. First raise creates the floor
{
  const r = ratchet(["--raise", "test_pass_rate", "0.8"]);
  check("first --raise creates floor.json", r.code === 0 && r.out.includes("FLOOR RAISED"));
  const j = JSON.parse(readFileSync(join(FIX, ".agents", "floor.json"), "utf8"));
  check("schema: gates + history recorded", j.gates.test_pass_rate.floor === 0.8 && j.gates.test_pass_rate._MAX === 1 && j.history.length === 1);
}

// 2. Monotonic raise
{
  const r = ratchet(["--raise", "test_pass_rate", "0.9"]);
  check("raise 0.8 → 0.9 accepted (monotonic)", r.code === 0 && JSON.parse(readFileSync(join(FIX, ".agents", "floor.json"), "utf8")).gates.test_pass_rate.floor === 0.9);
}

// 3. Silent lowering refused
{
  const r = ratchet(["--raise", "test_pass_rate", "0.5"]);
  check("silent lowering REFUSED (exit 1)", r.code === 1 && r.out.includes("--ratify"));
  const j = JSON.parse(readFileSync(join(FIX, ".agents", "floor.json"), "utf8"));
  check("floor unmoved after refused lowering", j.gates.test_pass_rate.floor === 0.9);
}

// 4. Operator-ratified lowering recorded
{
  const r = ratchet(["--raise", "test_pass_rate", "0.5", "--ratify", "floor recalibrated after test-suite rewrite — op 2026-09"]);
  check("ratified lowering accepted + recorded", r.code === 0 && r.out.includes("operator-ratified"));
  const j = JSON.parse(readFileSync(join(FIX, ".agents", "floor.json"), "utf8"));
  check("ratification note in history", j.history.at(-1).ratified_lower?.includes("recalibrated") && j.gates.test_pass_rate.floor === 0.5);
}

// 5. Ceiling caps the ratchet
{
  const r = ratchet(["--raise", "test_pass_rate", "1.2"]);
  check("raise above _MAX REFUSED", r.code === 1 && r.out.includes("_MAX"));
}

// 6. Report prints slack
{
  const r = ratchet(["--report", "--observed", "0.75"]);
  check("--report prints floor/observed/slack", r.code === 0 && r.out.includes("floor=0.5") && r.out.includes("slack=0.2500"));
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
