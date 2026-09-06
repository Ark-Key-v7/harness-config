#!/usr/bin/env node
/**
 * doctor.mjs — WP-B autonomy evidence gate (Harness v1.3 §5.6).
 *
 * Elevation law: the dial position in a project's committed
 * .agents/autonomy.json may only be set to a level ≤ the doctor's verdict —
 * elevation is doctor-gated, never self-declared. Demotion needs no gate.
 * The doctor computes max_level() from deterministic, filesystem-detectable
 * checks; every FAIL row names the single next action.
 *
 * Checks (cumulative — level L requires every check tagged ≤ L):
 *   L0  .tmd/ manifold present, lint-tmd --strict clean
 *   L1  specs/ present, lint-spec --strict clean
 *   L1  rig driver suite green (validation/* spine — the gates the dial
 *       delegates to must themselves be green)
 *   L1  .agents/autonomy.json present and schema-valid
 *   L2  ≥1 .agents/tasks/*.holdout.md exists AND its contract lints clean
 *       (proxy for "passed with it" until the §D.15 ledger exists —
 *       filesystem-detectable today, ledger-verified when it lands)
 *   L2  watchdog machinery live (§D.19): .agents/queue.json +
 *       .agents/watchdog-state.json both present
 *   L3  mutation lane green (WP-C): validation/mutations/ in the rig
 *   L3  merge queue live: manual attestation field in autonomy.json
 *       (register §D.1 — a human attests, the doctor verifies the attestation
 *       is present; the machinery proof arrives with the merge queue itself)
 *
 * Usage:
 *   node bin/doctor.mjs [--target DIR] [--require N]
 *     --target    governed project root (default: cwd)
 *     --require   exit 1 when the project's max_level < N — this mode is
 *                 what blocks dial elevation (§5.6 elevation law)
 * Exit 0 otherwise (the doctor reports; it does not block shells).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const RIG = join(HERE, "..");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = resolve(arg("--target") ?? process.cwd());
const REQUIRE = arg("--require") !== null ? Number(arg("--require")) : null;

function run(script, args, cwd = TARGET) {
  const r = spawnSync(process.execPath, [join(RIG, "bin", script), ...args], { cwd, encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}

// --- The checklist ----------------------------------------------------------------
const checks = []; // { level, name, pass, next }
function check(level, name, pass, next) {
  checks.push({ level, name, pass: Boolean(pass), next });
}

// L0 — manifold present and strict-clean
const tmdDir = join(TARGET, ".tmd");
if (!existsSync(tmdDir)) {
  check(0, ".tmd/ manifold present, lint-tmd clean", false, "onboard the project (bin/onboard-project.mjs), fill Zone C, stamp last_verified");
} else {
  const r = run("lint-tmd.mjs", [tmdDir, "--strict"]);
  check(0, ".tmd/ manifold present, lint-tmd clean", r.code === 0, "fix the manifold violations lint-tmd printed, then re-run the doctor");
}

// L1 — spec chain present and clean
const specsDir = join(TARGET, "specs");
if (!existsSync(specsDir)) {
  check(1, "specs/ present, lint-spec clean", false, "scaffold the Phase-0 chain (spec-intake skill) — TCE v2.1 §2.A");
} else {
  const r = run("lint-spec.mjs", [specsDir, "--strict"]);
  check(1, "specs/ present, lint-spec clean", r.code === 0, "resolve the spec-chain failures lint-spec printed (orphans are lint errors)");
}

// L1 — rig driver suite green (skip doctor-smoke: a suite cannot contain itself)
{
  const valDir = join(RIG, "validation");
  const drivers = [];
  for (const d of readdirSync(valDir, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === "doctor-smoke") continue;
    const dd = join(valDir, d.name);
    for (const f of readdirSync(dd).filter((f) => f.endsWith(".test.mjs"))) drivers.push(join(dd, f));
  }
  const failed = [];
  for (const drv of drivers) {
    const r = spawnSync(process.execPath, [drv], { cwd: RIG, encoding: "utf8", env: { ...process.env, DOCTOR_SUITE: "1" } });
    if ((r.status ?? 1) !== 0) failed.push(drv.replace(`${RIG}/`, ""));
  }
  check(1, "rig driver suite green", failed.length === 0, `driver(s) failing: ${failed.join(", ")} — the dial never outruns its gates`);
}

// L1 — autonomy.json present and schema-valid
const AUTONOMY_SCHEMA = '{ dial: int 0–3, ratified_by: string, ratified_at: date-string, merge_queue_live: boolean, notes: string }';
const autPath = join(TARGET, ".agents", "autonomy.json");
let autonomy = null;
if (!existsSync(autPath)) {
  check(1, ".agents/autonomy.json present and schema-valid", false, `commit .agents/autonomy.json — schema: ${AUTONOMY_SCHEMA}`);
} else {
  try {
    autonomy = JSON.parse(readFileSync(autPath, "utf8"));
    const okShape = Number.isInteger(autonomy.dial) && autonomy.dial >= 0 && autonomy.dial <= 3
      && typeof autonomy.ratified_by === "string" && autonomy.ratified_by.length > 0
      && typeof autonomy.ratified_at === "string" && /\d{4}-\d{2}-\d{2}/.test(autonomy.ratified_at)
      && typeof autonomy.merge_queue_live === "boolean"
      && typeof autonomy.notes === "string";
    check(1, ".agents/autonomy.json present and schema-valid", okShape, `repair autonomy.json — schema: ${AUTONOMY_SCHEMA}`);
  } catch (e) {
    check(1, ".agents/autonomy.json present and schema-valid", false, `autonomy.json is not valid JSON: ${e.message}`);
  }
}

// L2 — holdout suite exists and its contract lints clean
{
  const tasksDir = join(TARGET, ".agents", "tasks");
  const holdouts = existsSync(tasksDir) ? readdirSync(tasksDir).filter((f) => f.endsWith(".holdout.md")) : [];
  if (holdouts.length === 0) {
    check(2, "≥1 holdout exists and its contract lints clean", false, "author a builder-blind holdout at review time (E.7) — dial 2 auto-merge requires holdouts");
  } else {
    const holdoutFor = holdouts[0].replace(/\.holdout\.md$/, "");
    const contractPath = join(tasksDir, `${holdoutFor.replace(/^task-/, "task-")}.md`);
    const candidates = [join(tasksDir, `${holdoutFor}.md`), contractPath];
    const contract = candidates.find((p) => existsSync(p) && !p.endsWith(".holdout.md"));
    if (!contract) {
      check(2, "≥1 holdout exists and its contract lints clean", false, `holdout ${holdouts[0]} names no committed contract — an orphan holdout proves nothing`);
    } else {
      const args = [contract];
      if (existsSync(join(TARGET, ".tmd", "gravity.md"))) args.push("--gravity", join(TARGET, ".tmd", "gravity.md"));
      const r = run("lint-contract.mjs", args);
      check(2, "≥1 holdout exists and its contract lints clean", r.code === 0, "the holdout's contract fails lint-contract — fix the contract first");
    }
  }
}

// L2 — watchdog machinery live (§D.19 interlock: no dial ≥2 without a live watchdog)
{
  const q = existsSync(join(TARGET, ".agents", "queue.json"));
  const w = existsSync(join(TARGET, ".agents", "watchdog-state.json"));
  check(2, "watchdog machinery live (§D.19)", q && w, "§D.19 queue machinery is not built — its activation trigger is the first dial-2 request (this one). Open the register.");
}

// L3 — mutation lane green (WP-C)
{
  const lane = join(RIG, "validation", "mutations");
  if (!existsSync(lane)) {
    check(3, "mutation lane green (§5.10.4)", false, "mutation lane does not exist — WP-C builds it; dial 3 waits");
  } else {
    const runner = join(lane, "run.mjs");
    const r = spawnSync(process.execPath, [runner], { cwd: RIG, encoding: "utf8" });
    check(3, "mutation lane green (§5.10.4)", (r.status ?? 1) === 0, "mutation lane red — a gate defect escaped; the ladder is unproven");
  }
}

// L3 — merge queue live (human attestation until §D.1 machinery exists)
{
  check(3, "merge queue live (attested)", autonomy?.merge_queue_live === true, "merge_queue_live attestation absent/false in autonomy.json — §D.1 machinery is the real proof when it lands");
}

// --- Verdict ----------------------------------------------------------------------
let maxLevel = -1;
for (let L = 0; L <= 3; L++) {
  if (checks.filter((c) => c.level <= L).every((c) => c.pass)) maxLevel = L;
  else break;
}

console.log(`DOCTOR — ${TARGET}`);
console.log("—".repeat(70));
for (const c of checks) {
  console.log(`${c.pass ? "PASS" : "FAIL"} | L${c.level} | ${c.name}${c.pass ? "" : `\n     next: ${c.next}`}`);
}
console.log("—".repeat(70));
console.log(`max_level: ${maxLevel < 0 ? "none (not eligible for dial 0)" : maxLevel}`);
if (autonomy && Number.isInteger(autonomy.dial) && maxLevel >= 0 && autonomy.dial > maxLevel) {
  console.log(`DIAL VIOLATION: autonomy.json dial=${autonomy.dial} exceeds the doctor's verdict ${maxLevel} — elevation is doctor-gated (§5.6). Lower the dial or close the FAIL rows.`);
}

if (REQUIRE !== null && maxLevel < REQUIRE) {
  console.error(`REQUIRE FAILED: project qualifies for dial ${maxLevel}, not ${REQUIRE}`);
  process.exit(1);
}
process.exit(0);
