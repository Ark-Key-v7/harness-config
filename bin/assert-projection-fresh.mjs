#!/usr/bin/env node
/**
 * assert-projection-fresh.mjs — WP3 spawn-time staleness assertion.
 *
 * Law (v1.2 §2.4): a projection is at its source's HEAD or invalid. No
 * time-based staleness. The Worktrunk post-create hook (WP9) runs this at
 * spawn; a projection whose recorded source_head differs from the current
 * HEAD blocks the spawn.
 *
 * Usage:
 *   node bin/assert-projection-fresh.mjs [--expected SHA] [--file PATH]
 *
 * Defaults: --expected = `git rev-parse HEAD` at repo root; checks
 * projections/pi/append-system.md and projections/pi/pi-settings.json.
 * Exit 0 = fresh. Exit 1 = stale or corrupt.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "unknown";
  }
}
// Freshness law (v1.2 §2.4): a projection is at its SOURCE's head — the last
// commit that touched the projection inputs (templates + the generator),
// not the repo HEAD. Commits that don't touch inputs (docs, tools, drivers)
// must not stale the projection; a projections-refresh commit must not stale
// itself. Explicit --expected overrides for drivers and CI.
const EXPECTED = argValue("--expected") ?? git("log -1 --format=%H -- templates/tmd templates/agents/profiles skills bin/generate-projections.mjs");

const files = argValue("--file")
  ? [argValue("--file")]
  : [join(ROOT, "projections", "pi", "append-system.md"), join(ROOT, "projections", "pi", "pi-settings.json")];

let stale = 0;
for (const f of files) {
  if (!existsSync(f)) {
    console.error(`STALE: ${f} missing`);
    stale++;
    continue;
  }
  const content = readFileSync(f, "utf8");
  const m = content.match(/source_head: (\S+) -->/) ?? content.match(/"_sourceHead": "(\S+)"/);
  if (!m) {
    console.error(`STALE: ${f} has no source head marker — hand-edited or corrupt`);
    stale++;
    continue;
  }
  if (m[1] !== EXPECTED) {
    console.error(`STALE: ${f} is at source head ${m[1]}, expected ${EXPECTED}`);
    stale++;
    continue;
  }
  console.log(`FRESH: ${f} @ ${m[1]}`);
}
process.exit(stale > 0 ? 1 : 0);
