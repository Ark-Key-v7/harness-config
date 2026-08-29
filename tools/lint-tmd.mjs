#!/usr/bin/env node
/**
 * lint-tmd.mjs — WP4 manifold validation gate.
 *
 * Canon: Harness Handbook v1.2 §1.3 (manifest header law, precedence order,
 * zone structure via WP4 three-zone contract), L4 (last_verified = SHA).
 *
 * Usage:
 *   node tools/lint-tmd.mjs [DIR] [--strict]
 *     DIR      manifold directory (default: templates/tmd)
 *     --strict project-manifold mode: headers must be REAL (semver version,
 *              40-hex SHA last_verified) and no TEMPLATE_VALUE_REQUIRED slots
 *              may remain. Template mode (default) tolerates slot markers.
 *     --agents PATH  also lint a root AGENTS.md router (≤50 lines).
 *
 * Exit 0 = valid. Exit 1 = invalid (each violation printed).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const STRICT = process.argv.includes("--strict");
const agentsIdx = process.argv.indexOf("--agents");
const AGENTS_PATH = agentsIdx >= 0 ? process.argv[agentsIdx + 1] : null;
const DIR = args[0] && args[0] !== process.argv[agentsIdx + 1] ? args[0] : join(ROOT, "templates", "tmd");

const CANON = { "rules.md": 1, "gravity.md": 2, "promises.md": 3, "glossary.md": 4, "design.md": 5 };
const SHA40 = /^[0-9a-f]{40}$/;
const SEMVER = /^\d+\.\d+\.\d+$/;

let violations = 0;
function violation(file, msg) {
  violations++;
  console.error(`INVALID | ${file}: ${msg}`);
}

function lintManifoldFile(path, name) {
  const text = readFileSync(path, "utf8");
  const wantPrec = CANON[name];

  const headerMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (!headerMatch) return violation(name, "missing YAML manifest header (a file without a valid header is invalid law)");
  const header = headerMatch[1];

  const version = header.match(/^manifold_version:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
  const verified = header.match(/^last_verified:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
  const prec = header.match(/^precedence:\s*(\d+)/m)?.[1];

  if (!version) violation(name, "header missing manifold_version");
  else if (STRICT && !SEMVER.test(version)) violation(name, `manifold_version must be semver, got "${version}"`);

  if (!verified) violation(name, "header missing last_verified");
  else if (/\d{4}-\d{2}-\d{2}/.test(verified)) violation(name, "last_verified is a DATE — it must be a commit SHA (L4)");
  else if (STRICT && !SHA40.test(verified)) violation(name, `last_verified must be a 40-hex commit SHA, got "${verified}"`);

  if (!prec) violation(name, "header missing precedence");
  else if (Number(prec) !== wantPrec) violation(name, `precedence ${prec} != canonical rank ${wantPrec} (precedence is arithmetic, not judgment)`);

  for (const zone of ["ZONE A", "ZONE B", "ZONE C"]) {
    if (!text.includes(zone)) violation(name, `missing ${zone} — three-zone contract broken (WP4)`);
  }
  if (!/#{2,3}\s+.*enforcement/i.test(text)) {
    violation(name, "missing Enforcement section (TMD §0.6 — every law names its wall)");
  }
  if (STRICT && text.includes("TEMPLATE_VALUE_REQUIRED")) {
    violation(name, "unfilled TEMPLATE_VALUE_REQUIRED slots remain — a strict manifold is law, not a template");
  }
}

function lintAgents(path) {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n").length;
  if (lines > 50) violation("AGENTS.md", `${lines} lines — exceeds the ≤50-line router cap (Instruction-File Boundary)`);
  if (!/.tmd\//.test(text)) violation("AGENTS.md", "router does not point at /.tmd/ — a router that routes nowhere is decoration");
}

// --- Run ----------------------------------------------------------------------
if (!existsSync(DIR)) {
  console.error(`INVALID | manifold dir not found: ${DIR}`);
  process.exit(1);
}
const files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
if (files.length === 0) {
  console.error(`INVALID | no manifold files in ${DIR}`);
  process.exit(1);
}
for (const f of files) {
  if (!(f in CANON)) violation(f, "unknown manifold file — the manifold has exactly five seats (rules/gravity/promises/glossary/design)");
  else lintManifoldFile(join(DIR, f), f);
}
for (const name of Object.keys(CANON)) {
  if (!files.includes(name)) violation(name, "required manifold file missing");
}
if (AGENTS_PATH) {
  if (existsSync(AGENTS_PATH)) lintAgents(AGENTS_PATH);
  else violation("AGENTS.md", `not found at ${AGENTS_PATH}`);
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — ${files.length} manifold files${AGENTS_PATH ? " + AGENTS.md" : ""} (${STRICT ? "strict" : "template"} mode)`);
