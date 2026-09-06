#!/usr/bin/env node
/**
 * guard.mjs — CI/offline twin of extensions/guard.ts (Harness v1.3 §5.10.1).
 *
 * Tests the paths a change touches against THE protected list
 * (bin/guard-list.mjs — the single source; the harness extension imports
 * the same file, so code and CI never drift).
 *
 * Input: `git diff --name-only` output — either produced by this tool
 * (--target, --staged) or piped on stdin (`--paths -`).
 *
 * Exit 2 = protected-path violation (each printed, law named).
 * Exit 1 = FAIL CLOSED: the diff could not be determined (git error, not a
 *          repo, empty stdin with --paths -). Undeterminable = denied.
 * Exit 0 = clean (zero changed paths is clean — nothing was written).
 *
 * Usage:
 *   node bin/guard.mjs --target <repo> [--staged]
 *   git diff --name-only | node bin/guard.mjs --paths -
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkPath } from "./guard-list.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = arg("--target");
const PATHS_FROM_STDIN = arg("--paths") === "-";
const STAGED = process.argv.includes("--staged");

function failClosed(msg) {
  console.error(`GUARD FAIL-CLOSED (§5.10.1): ${msg} — undeterminable = denied.`);
  process.exit(1);
}

let paths;
if (PATHS_FROM_STDIN) {
  let raw;
  try {
    raw = readFileSync(0, "utf8"); // fd 0 = stdin
  } catch (e) {
    failClosed(`could not read paths from stdin: ${e.message}`);
  }
  if (!raw.trim()) failClosed("empty path list on stdin — the diff could not be determined");
  paths = raw.split("\n").map((s) => s.trim()).filter(Boolean);
} else if (TARGET) {
  const repo = resolve(TARGET);
  const args = ["-C", repo, "diff", "--name-only"];
  if (STAGED) args.push("--cached");
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.error || (r.status ?? 1) !== 0) {
    failClosed(`git diff failed in ${repo}: ${r.error?.message ?? String(r.stderr ?? "").trim()}`);
  }
  paths = String(r.stdout ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
} else {
  failClosed("usage: node bin/guard.mjs --target <repo> [--staged] | --paths - (paths on stdin)");
}

let violations = 0;
for (const p of paths) {
  const rel = p.replaceAll("\\", "/");
  const hit = checkPath(rel);
  if (hit.protected) {
    violations++;
    console.error(`VIOLATION | ${rel} — ${hit.label}`);
  }
}

if (violations > 0) {
  console.error(`\nGUARD VIOLATION — ${violations} protected path(s) in this change (§5.10.1). The list lives in code (bin/guard-list.mjs); changing it is a §5.4-ratified rig-change.`);
  process.exit(2);
}
console.log(`GUARD CLEAN — ${paths.length} changed path(s), none protected`);
process.exit(0);
