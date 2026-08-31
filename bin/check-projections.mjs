#!/usr/bin/env node
/**
 * check-projections.mjs — WP3 CI drift check.
 *
 * Regenerates projections into a temp dir using the source_head RECORDED IN
 * the committed projection (byte-determinism requires the same head), then
 * diffs against the committed tree. Exit 0 = clean. Exit 1 = drift — meaning
 * someone hand-edited a projection or changed a template without
 * regenerating (L4/L5 violation).
 *
 * Usage: node bin/check-projections.mjs
 */

import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const COMMITTED = join(ROOT, "projections", "pi");

function fail(msg) {
  console.error(`DRIFT: ${msg}`);
  process.exit(1);
}

const committedAppend = join(COMMITTED, "append-system.md");
if (!existsSync(committedAppend)) fail("projections/pi/append-system.md is missing — run the generator and commit the output");

const headMatch = readFileSync(committedAppend, "utf8").match(/<!-- source_head: (\S+) -->/);
if (!headMatch) fail("committed projection has no source_head header — hand-edited or corrupt");
const recordedHead = headMatch[1];

const tmp = mkdtempSync(join(tmpdir(), "proj-drift-"));
execFileSync(process.execPath, [join(HERE, "generate-projections.mjs"), "--out", tmp, "--source-head", recordedHead], {
  stdio: ["ignore", "ignore", "inherit"],
});

for (const name of ["append-system.md", "pi-settings.json"]) {
  const a = join(COMMITTED, name);
  const b = join(tmp, "pi", name);
  if (!existsSync(b)) fail(`generator did not emit ${name}`);
  if (readFileSync(a, "utf8") !== readFileSync(b, "utf8")) {
    fail(`${name} differs from a fresh regeneration. Do NOT hand-edit projections — change templates/ and re-run: node bin/generate-projections.mjs, then commit both.`);
  }
}
console.log("OK — committed projections match regeneration (no drift)");
