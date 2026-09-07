#!/usr/bin/env node
/**
 * lint-skills.mjs — WP6 skills validation gate (E.6 contract, Pi-mapped).
 *
 * Per skill folder under DIR (default: templates/agents/skills):
 * - folder name kebab-case; file named exactly SKILL.md
 * - frontmatter: name (kebab-case, matches folder), description (≤1024),
 *   metadata.trigger_phrases present
 * - invocation mapping honored: disable-model-invocation present or absent
 *   (E.6 default is user — absence means model-invocable, which must be a
 *   deliberate choice; both accepted, presence/absence is checked for type)
 * - NO XML angle brackets anywhere in frontmatter or metadata (E.6)
 * - body carries the Act → Observe → Exit procedure form
 * - v2.0.0: metadata.class required (procedural | discipline); body carries
 *   a "When NOT to Use" section; empty folders inside a skill dir fail
 *
 * Usage: node bin/lint-skills.mjs [DIR]
 * Exit 0 = valid. Exit 1 = invalid (each violation printed).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(ROOT, "skills");

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
let violations = 0;
function violation(skill, msg) {
  violations++;
  console.error(`INVALID | ${skill}: ${msg}`);
}

/** First empty directory under root (depth-first), or null. */
function findEmptyDir(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = join(root, entry.name);
    if (readdirSync(p).length === 0) return p;
    const nested = findEmptyDir(p);
    if (nested) return nested;
  }
  return null;
}

if (!existsSync(DIR)) {
  console.error(`INVALID | skills dir not found: ${DIR}`);
  process.exit(1);
}

const folders = readdirSync(DIR).filter((f) => statSync(join(DIR, f)).isDirectory());
if (folders.length === 0) {
  console.error(`INVALID | no skill folders in ${DIR}`);
  process.exit(1);
}

for (const folder of folders) {
  if (!KEBAB.test(folder)) violation(folder, "folder name must be kebab-case");
  const skillFile = join(DIR, folder, "SKILL.md");
  if (!existsSync(skillFile)) { violation(folder, "missing SKILL.md (exact name, case-sensitive)"); continue; }
  const text = readFileSync(skillFile, "utf8");

  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { violation(folder, "missing YAML frontmatter"); continue; }
  const front = fm[1];
  if (/[<>]/.test(front)) violation(folder, "XML angle brackets in frontmatter/metadata (E.6 forbids)");

  const name = front.match(/^name:\s*(\S+)/m)?.[1];
  if (!name) violation(folder, "frontmatter missing name");
  else if (!KEBAB.test(name)) violation(folder, `name "${name}" not kebab-case`);
  else if (name !== folder) violation(folder, `name "${name}" does not match folder "${folder}"`);

  const desc = front.match(/^description:\s*(.+)$/m)?.[1];
  if (!desc) violation(folder, "frontmatter missing description");
  else if (desc.length > 1024) violation(folder, `description ${desc.length} chars > 1024 cap`);

  if (!/metadata:[\s\S]*?trigger_phrases:\s*\[/.test(front)) violation(folder, "metadata.trigger_phrases missing (E.6)");

  // format v2.0.0 (WP-D-1): metadata.class is required and must name a class.
  const cls = front.match(/^\s+class:\s*(\S+)/m)?.[1];
  if (!cls) violation(folder, "metadata.class missing (format v2.0.0 requires procedural | discipline)");
  else if (cls !== "procedural" && cls !== "discipline") violation(folder, `metadata.class "${cls}" must be procedural | discipline`);

  if (/^disable-model-invocation:/m.test(front) && !/^disable-model-invocation:\s*(true|false)$/m.test(front)) {
    violation(folder, "disable-model-invocation must be boolean");
  }

  const body = text.slice(fm[0].length);
  for (const marker of ["ACT", "OBSERVE", "EXIT"]) {
    // Case-sensitive, word-boundary: the step verbs must exist as protocol
    // steps, not as prose mentions ("Act → Observe → Exit" in a heading).
    if (!new RegExp(`\\b${marker}\\b`).test(body)) violation(folder, `body missing ${marker} — Act → Observe → Exit form required`);
  }

  // format v2.0.0 (WP-D-1): every skill states explicit non-activation
  // conditions — the brake against over-triggering.
  if (!/when not to use/i.test(body)) violation(folder, "body missing a \"When NOT to Use\" section (format v2.0.0 requires it)");

  // format v2.0.0 (WP-D-1): an empty folder inside a skill dir is noise.
  const empty = findEmptyDir(join(DIR, folder));
  if (empty) violation(folder, `empty folder is noise (lint fails on it): ${empty}`);
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — ${folders.length} skills conform to E.6`);
