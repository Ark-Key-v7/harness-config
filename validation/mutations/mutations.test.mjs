/**
 * mutations.test.mjs — suite-loop wrapper for the mutation lane (WP-C,
 * Harness v1.3 §5.10.4). The lane itself is validation/mutations/run.mjs;
 * this wrapper lets the runbook's suite glob (validation/*\/*.test.mjs)
 * pick the lane up automatically.
 *
 * Run from the repo:  node validation/mutations/mutations.test.mjs
 * Exit 0 = lane green. Exit 1 = a gate leaked.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [join(HERE, "run.mjs")], { encoding: "utf8" });
process.stdout.write(String(r.stdout ?? ""));
process.stderr.write(String(r.stderr ?? ""));
if ((r.status ?? 1) !== 0) {
  console.error("FAILED — mutation lane red");
  process.exit(1);
}
console.log("ALL PASS — mutation lane green (6 rungs)");
