#!/usr/bin/env node
/**
 * floor-ratchet.mjs — the floor ratchet (Harness v1.3 §5.10.2).
 *
 * Canon: gate thresholds live in the project's committed .agents/floor.json
 * (protected per §5.10.1 — the guard blocks worker writes to it) and are
 * MONOTONIC: they auto-raise on merge and lower only by operator
 * ratification (§5.4). _MAX ceilings cap the ratchet itself. Slack — the
 * distance between current performance and the floor — is reported at every
 * review: shrinking slack is early warning, growing slack is ratchet fuel.
 * A floor that can silently lower is not a floor.
 *
 * Commands:
 *   --target <proj> --raise <gate> <value>   merge-time hook: raise the
 *       floor toward observed performance (never above _MAX); REFUSES to
 *       lower unless --ratify "<operator note>" is present (recorded).
 *   --target <proj> --report                 slack table per gate.
 *
 * Schema (created on first --raise):
 *   { "gates": { "<gate>": { "floor": 0.0, "_MAX": 1.0 } }, "history": [] }
 *
 * Exit 0 = ok / report printed. Exit 1 = refusal (silent lowering attempt,
 * ceiling breach, malformed file).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = resolve(arg("--target") ?? process.cwd());
const RAISE_GATE = arg("--raise");
const RAISE_VALUE = RAISE_GATE !== null ? Number(process.argv[process.argv.indexOf("--raise") + 2]) : null;
const RATIFY = arg("--ratify");
const REPORT = process.argv.includes("--report");
const OBSERVED = arg("--observed"); // optional observed-performance value for --report slack

const FILE = join(TARGET, ".agents", "floor.json");

function refuse(msg) {
  console.error(`RATCHET REFUSED: ${msg}`);
  process.exit(1);
}

function load() {
  if (!existsSync(FILE)) return { gates: {}, history: [] };
  try {
    const j = JSON.parse(readFileSync(FILE, "utf8"));
    if (typeof j !== "object" || j === null || typeof j.gates !== "object" || !Array.isArray(j.history)) {
      refuse(`${FILE} is malformed (expected {gates, history})`);
    }
    return j;
  } catch (e) {
    if (e.message?.startsWith?.("RATCHET")) throw e;
    refuse(`${FILE} is not valid JSON: ${e.message}`);
  }
}
function save(j) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(j, null, 2) + "\n");
}

if (REPORT) {
  const j = load();
  const gates = Object.entries(j.gates);
  if (gates.length === 0) {
    console.log("FLOOR REPORT — no gates configured yet (floor.json empty)");
    process.exit(0);
  }
  console.log(`FLOOR REPORT — ${FILE}`);
  console.log("—".repeat(70));
  for (const [name, g] of gates) {
    const obs = OBSERVED !== null ? Number(OBSERVED) : g.last_observed;
    const slack = typeof obs === "number" ? obs - g.floor : null;
    console.log(`${name}: floor=${g.floor}  _MAX=${g._MAX}  ${typeof obs === "number" ? `observed=${obs}  slack=${slack.toFixed(4)}` : "observed=unknown"}`);
    if (slack !== null && slack < 0) console.log(`  WARNING: observed performance is BELOW the floor — shrinking slack is early warning`);
  }
  process.exit(0);
}

if (RAISE_GATE !== null) {
  if (RAISE_VALUE === null || Number.isNaN(RAISE_VALUE)) refuse("--raise requires a numeric value: --raise <gate> <value>");
  const j = load();
  const g = j.gates[RAISE_GATE] ?? { floor: 0, _MAX: 1 };
  if (typeof g._MAX !== "number") refuse(`gate ${RAISE_GATE} lacks a _MAX ceiling — ceilings cap the ratchet itself`);
  if (RAISE_VALUE > g._MAX) refuse(`${RAISE_VALUE} exceeds _MAX ${g._MAX} for ${RAISE_GATE} — the ceiling caps the ratchet; raising _MAX is a rig-change`);
  const entry = { ts: new Date().toISOString(), gate: RAISE_GATE, from: g.floor, to: RAISE_VALUE };
  if (RAISE_VALUE < g.floor) {
    if (!RATIFY) {
      refuse(`lowering ${RAISE_GATE} floor ${g.floor} → ${RAISE_VALUE} requires --ratify "<operator note>" (§5.4) — a floor that can silently lower is not a floor`);
    }
    entry.ratified_lower = RATIFY;
    g.floor = RAISE_VALUE;
    console.log(`FLOOR LOWERED (operator-ratified): ${RAISE_GATE} ${entry.from} → ${RAISE_VALUE} — "${RATIFY}"`);
  } else if (RAISE_VALUE === g.floor) {
    console.log(`FLOOR UNCHANGED: ${RAISE_GATE} already at ${g.floor}`);
    process.exit(0);
  } else {
    g.floor = RAISE_VALUE;
    console.log(`FLOOR RAISED: ${RAISE_GATE} ${entry.from} → ${RAISE_VALUE} (monotonic; _MAX ${g._MAX})`);
  }
  g.last_observed = RAISE_VALUE;
  j.gates[RAISE_GATE] = g;
  j.history.push(entry);
  save(j);
  process.exit(0);
}

console.error("usage: node bin/floor-ratchet.mjs --target <proj> (--raise <gate> <value> [--ratify \"<note>\"] | --report [--observed <value>])");
process.exit(1);
