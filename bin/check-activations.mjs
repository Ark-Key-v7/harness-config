#!/usr/bin/env node
/**
 * check-activations.mjs — WP11 deferred-register activation detector.
 *
 * Evaluates docs/activation-triggers.json against a target directory and
 * prints an ACTIVATION NOTICE for every trigger whose conditions all hold.
 * This is the mechanism by which deferred canon surfaces itself: the agent
 * never integrates a deferred tool autonomously (§5.4 / Meta-Harness) — it
 * SURFACES the fired trigger and points the operator at the register.
 *
 * Harness detection: a target carrying package-pins.json AND
 * docs/GOVERNANCE_PLANE_SPEC.md is the factory rig itself, not a product.
 *
 * Usage: node bin/check-activations.mjs --target DIR [--brownfield]
 * Exit 0 always (notices are advisory; the register holds the gates).
 * Exit 2 on missing/corrupt triggers file (fail-closed on its own machinery).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RIG = join(HERE, "..");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = resolve(arg("--target") ?? process.cwd());
const FLAGS = new Set(process.argv.slice(2).filter((a) => a.startsWith("--") && arg(a) === null));

const TRIGGERS_PATH = join(RIG, "docs", "activation-triggers.json");
if (!existsSync(TRIGGERS_PATH)) {
  console.error(`ACTIVATION CHECK REFUSED: docs/activation-triggers.json missing — is the rig clone current?`);
  process.exit(2);
}
let db;
try { db = JSON.parse(readFileSync(TRIGGERS_PATH, "utf8")); }
catch (e) { console.error(`ACTIVATION CHECK REFUSED: triggers file is not valid JSON: ${e.message}`); process.exit(2); }

const isHarness = existsSync(join(TARGET, "package-pins.json")) && existsSync(join(TARGET, "docs", "GOVERNANCE_PLANE_SPEC.md"));

function checkHolds(c) {
  switch (c.type) {
    case "not_harness": return !isHarness;
    case "exists": return existsSync(join(TARGET, c.path));
    case "flag": return FLAGS.has(c.name);
    case "always": return true;
    default: return false; // unknown check type never fires (fail-closed)
  }
}

let fired = 0;
for (const t of db.triggers ?? []) {
  if ((t.checks ?? []).every(checkHolds)) {
    fired++;
    console.log(`ACTIVATION NOTICE [${t.id} → register ${t.register_anchor}]: ${t.notice}`);
  }
}
if (fired === 0) console.log("ACTIVATION CHECK: no deferred-register triggers fired");
process.exit(0);
