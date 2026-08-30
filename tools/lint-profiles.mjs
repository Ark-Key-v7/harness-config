#!/usr/bin/env node
/**
 * lint-profiles.mjs — WP5 roster validation gate.
 *
 * Validates the role roster against the E.5 schema (Appendix E) and the
 * roster laws (spec WP5): all four seats present; every E.5 key present;
 * per-role write_scope law (scout none / planner specs-only / worker
 * sub-graph / reviewer none); minimal loadout (scout & reviewer carry no
 * write/edit in tool_allowlist); Kimi-subscription mapping stated.
 *
 * Usage: node tools/lint-profiles.mjs [DIR]   (default: templates/agents/profiles)
 * Exit 0 = valid. Exit 1 = invalid (each violation printed).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(ROOT, "templates", "agents", "profiles");

const ROSTER_LAW = {
  "scout.md":    { write_scope: "none",        noWriteTools: true,  read_scope: "sub_graph+closure" },
  "planner.md":  { write_scope: "specs-only",  noWriteTools: false, read_scope: "full-manifold" },
  "worker.md":   { write_scope: "sub-graph",   noWriteTools: false, read_scope: "sub_graph+closure" },
  "reviewer.md": { write_scope: "none",        noWriteTools: true,  read_scope: null },
};

const E5_KEYS = ["profile:", "compute_physics:", "model_class:", "effort_level:", "substitution_bounds:", "actuation_boundary:", "tool_allowlist:", "command_allowlist:", "tmd_read_path:", "write_scope:", "read_scope:"];
const WIREFRAME_SECTIONS = ["System Directive", "Mandatory Topological Binding", "Tooling & Capability Constraints", "Execution Lifecycle"];

let violations = 0;
function violation(file, msg) {
  violations++;
  console.error(`INVALID | ${file}: ${msg}`);
}

if (!existsSync(DIR)) {
  console.error(`INVALID | profiles dir not found: ${DIR}`);
  process.exit(1);
}

for (const [file, law] of Object.entries(ROSTER_LAW)) {
  const p = join(DIR, file);
  if (!existsSync(p)) { violation(file, "required roster seat missing"); continue; }
  const text = readFileSync(p, "utf8");

  for (const k of E5_KEYS) if (!text.includes(k)) violation(file, `missing E.5 key ${k}`);
  for (const s of WIREFRAME_SECTIONS) if (!text.includes(s)) violation(file, `missing wireframe section "${s}"`);

  if (!text.includes(`write_scope: ${law.write_scope}`)) violation(file, `roster law: write_scope must be "${law.write_scope}"`);
  if (law.read_scope && !text.includes(`read_scope: ${law.read_scope}`)) violation(file, `roster law: read_scope must be "${law.read_scope}"`);

  if (law.noWriteTools) {
    const m = text.match(/tool_allowlist:\s*\[([^\]]*)\]/);
    if (m && /\b(write|edit)\b/.test(m[1])) violation(file, "minimal loadout violated: write/edit in tool_allowlist of a no-write seat");
  }
  if (!text.includes("kimi-subscription regime")) violation(file, "Kimi-subscription model-class mapping not stated (WP5 acceptance)");
  if (!text.includes("Conflict Halt")) violation(file, "profile must bind the Conflict Halt (no agent-side resolution)");
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log("VALID — 4 roster seats conform to E.5 + roster laws");
