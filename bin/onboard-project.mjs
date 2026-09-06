#!/usr/bin/env node
/**
 * onboard-project.mjs — WP10 TMD onboarding: fresh-project procedure.
 * (v2.1 paths; WP11 adds the deferred-register activation check.)
 *
 * Executes the mechanical phases of onboarding a product repository to the
 * governance plane (spec WP10):
 *
 *   Phase 1 (Cognitive alignment scaffolding): copy templates/ → root
 *     AGENTS.md, .tmd/ (five manifold files), .agents/ (profiles, skills,
 *     schemas, tasks/), .pi/ (settings, .mcp.json, .gitignore, README +
 *     the WP3 append-system projection).
 *   Projection: the committed WP3 projection is copied VERBATIM into
 *     .pi/append-system.md (L5 — referenced, never regenerated here; drift
 *     detection stays with bin/check-projections.mjs in the rig).
 *   Activation check (WP11): after placement, evaluate the deferred
 *     register's machine-readable triggers (docs/activation-triggers.json)
 *     and print ACTIVATION NOTICEs. Advisory only — the agent surfaces,
 *     the human ratifies (§5.4 / Meta-Harness).
 *
 * What this tool deliberately does NOT do (human + agent work, then human
 * ratification — spec WP10 phases 2 and 4):
 *   - fill Zone C slots (stack manifest, Sub-Graph Registry, budgets, glossary)
 *   - stamp last_verified with the HEAD SHA
 *   - commit anything
 * It prints those remaining steps and exits. Meta-Harness applies from the
 * moment the human commits the stamped manifold.
 *
 * Fail-closed: never overwrites an existing file (a re-run against an
 * onboarded project aborts, protecting human-filled Zone C content).
 *
 * Usage: node bin/onboard-project.mjs --target <project-dir> [--brownfield]
 * Exit 0 = onboarding scaffolding complete. Exit 1 = refused (with reason).
 */

import { existsSync, mkdirSync, copyFileSync, cpSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const RIG = join(HERE, "..");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = arg("--target");
const BROWNFIELD = process.argv.includes("--brownfield");

function fail(msg) {
  console.error(`ONBOARDING REFUSED: ${msg}`);
  process.exit(1);
}

if (!TARGET) fail("usage: node bin/onboard-project.mjs --target <project-dir> [--brownfield]");
const ROOT = resolve(TARGET);
if (!existsSync(ROOT)) fail(`target directory does not exist: ${ROOT}`);

// --- The placement map ---------------------------------------------------------
// [source (rig-relative), destination (project-relative)]
const PLACEMENTS = [
  ["templates/AGENTS.md", "AGENTS.md"],
  ["templates/tmd/rules.md", ".tmd/rules.md"],
  ["templates/tmd/gravity.md", ".tmd/gravity.md"],
  ["templates/tmd/promises.md", ".tmd/promises.md"],
  ["templates/tmd/glossary.md", ".tmd/glossary.md"],
  ["templates/tmd/design.md", ".tmd/design.md"],
  ["templates/pi/settings.json", ".pi/settings.json"],
  ["templates/pi/.mcp.json", ".pi/.mcp.json"],
  ["templates/pi/.gitignore", ".pi/.gitignore"],
  ["templates/pi/README.md", ".pi/README.md"],
  ["projections/pi/append-system.md", ".pi/append-system.md"],
];
const DIR_COPIES = [
  ["templates/agents/profiles", ".agents/profiles"],
  ["skills", ".agents/skills"],
  ["templates/agents/schemas", ".agents/schemas"],
];

// --- Fail-closed overwrite check -------------------------------------------------
const collisions = [];
for (const [, dst] of PLACEMENTS) if (existsSync(join(ROOT, dst))) collisions.push(dst);
for (const [, dst] of DIR_COPIES) {
  if (existsSync(join(ROOT, dst)) && readdirSync(join(ROOT, dst)).length > 0) collisions.push(`${dst}/ (non-empty)`);
}
for (const d of ["specs/intent", "specs/prd", "specs/plans"]) {
  if (existsSync(join(ROOT, d)) && readdirSync(join(ROOT, d)).filter((f) => f !== ".gitkeep").length > 0) collisions.push(`${d}/ (non-empty)`);
}
if (collisions.length > 0) {
  fail(`target already carries governance files — refusing to overwrite human-filled content:\n  ${collisions.join("\n  ")}\nIf this is a re-onboard, remove the stale layer by hand (human decision, never scripted).`);
}

for (const [src] of PLACEMENTS) if (!existsSync(join(RIG, src))) fail(`rig template missing: ${src} — is the rig clone current? (git -C ~/.pi/agent pull --ff-only)`);
for (const [src] of DIR_COPIES) if (!existsSync(join(RIG, src))) fail(`rig template dir missing: ${src}`);

// --- Place -----------------------------------------------------------------------
let placed = 0;
for (const [src, dst] of PLACEMENTS) {
  mkdirSync(dirname(join(ROOT, dst)), { recursive: true });
  copyFileSync(join(RIG, src), join(ROOT, dst));
  placed++;
}
for (const [src, dst] of DIR_COPIES) {
  cpSync(join(RIG, src), join(ROOT, dst), { recursive: true });
  placed++;
}
mkdirSync(join(ROOT, ".agents", "tasks"), { recursive: true });

// --- Phase-0 chain scaffold (TCE v2.1 §2.A) -----------------------------------------
// specs/ lives at project root, outside .tmd/ — work artifacts, not law.
// The three templates stay in the rig (referenced, never duplicated); the
// scaffold creates the empty chain segments only.
for (const d of ["specs/intent", "specs/prd", "specs/plans"]) {
  mkdirSync(join(ROOT, d), { recursive: true });
  const keep = join(ROOT, d, ".gitkeep");
  if (!existsSync(keep)) copyFileSync(join(RIG, "templates", "specs", ".gitkeep"), keep);
}

// --- Validate what we placed (the layer must boot clean) ----------------------------
const run = (tool, args) => {
  try {
    const out = execFileSync(process.execPath, [join(RIG, "bin", tool), ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
  }
};
const tmd = run("lint-tmd.mjs", [join(ROOT, ".tmd"), "--agents", join(ROOT, "AGENTS.md")]);
if (tmd.code !== 0) fail(`placed manifold fails template lint:\n${tmd.out}`);
const mcp = run("lint-mcp.mjs", [join(ROOT, ".pi", ".mcp.json")]);
if (mcp.code !== 0) fail(`placed .mcp.json fails curation lint:\n${mcp.out}`);

const head = readFileSync(join(ROOT, ".pi", "append-system.md"), "utf8").match(/<!-- source_head: ([0-9a-f]+) -->/)?.[1] ?? "unknown";

console.log(`ONBOARDED (scaffolding): ${ROOT}`);
console.log(`  placed: ${placed} items — AGENTS.md, .tmd/ (5), .pi/ (5), .agents/ (profiles, skills, schemas, tasks/)`);
console.log(`  specs/: Phase-0 chain scaffolded (intent/ prd/ plans/ — TCE v2.1 §2.A); contracts now carry a trace: back-reference and a holdout: pointer (.agents/tasks/<contract_id>.holdout.md — authored at review time, builder-blind, read-denied to the worker seat)`);
console.log(`  projection: append-system.md at source_head ${head}`);
console.log(`  validation: lint-tmd (template mode) PASS, lint-mcp PASS`);

// --- Activation check (WP11): surface fired deferred-register triggers ------------
const act = run("check-activations.mjs", ["--target", ROOT, ...(BROWNFIELD ? ["--brownfield"] : [])]);
if (act.code === 2) fail(`activation machinery broken:\n${act.out}`);
if (act.out.trim()) console.log(`\n${act.out.trim()}`);

console.log(`
Remaining phases are human + agent work, then human ratification (spec WP10):

  Phase 2 — Topological mapping: declare the Sub-Graph Registry and
    dependency closures in .tmd/gravity.md; fill Zone C slots across all
    five manifold files; author path-scoped rules; define glossary terms;
    set promises (incl. gateway cap if applicable).
  Phase 4 — Stamp and ratify: review the full diff, set last_verified to
    the current HEAD SHA on all five .tmd/ files, then commit.
    The Meta-Harness Restriction applies from that commit.

  Then, per task: the chain is intent → PRD → plan → contract (skills
  spec-intake and slice-plan walk it with you). Draft contracts in
  .agents/tasks/ from the rig's templates/task-contract.md, validate with
  lint-contract.mjs --gravity (trace: must resolve to a plan slice), and
  resolve scope with contract-scope.mjs before any worker boots.
  Before every commit: node ~/.pi/agent/bin/preflight.mjs --staged
  (Refinery Stage 0 — the local pre-flight lane, canon §6.3).`);
