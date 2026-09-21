#!/usr/bin/env node
/**
 * lint-skills.mjs — WP6 skills validation gate (E.6 contract, Pi-mapped).
 *
 * Per skill folder under DIR (default: skills/):
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
 * - v2.0.0 amendment (WP-D-2): the Act → Observe → Exit body form is
 *   required for procedural skills only — the discipline-class skeleton
 *   (template-skill §4B) replaces sections 1–4, so discipline skills
 *   legitimately carry no ACT/OBSERVE/EXIT steps
 *
 * v2.1.0 (WP-F — tooling harvest, jsmastery-pro/skills @ 43b69e44):
 * - byte budgets: SKILL.md ≤ 32KB, support .md ≤ 24KB (hard fail); WARN at
 *   ≥90% of budget. Rationale (JSM check-portability): the skill body loads
 *   into the main context on every invocation.
 * - description ratchet: hard cap stays 1024; WARN above 400. JSM's rule is
 *   <400 (the description loads into every session); existing library
 *   descriptions run to 498, so the hard cap tightens to 400 during WP-F
 *   Phase 2/3 as bodies are merged — not silently here.
 * - model-alias spawn-directive ban: no `model: <alias>` line in any skill
 *   markdown. Models pin in agents/ profiles (ZCode) or profiles/seats
 *   (Pi), never in skills — capability-first prose instead. Aliases cover
 *   Claude + rig provider families; extend via rig-change on adoption.
 * - contract blocks: <!-- NAME:START -->…<!-- NAME:END --> with the same
 *   NAME must be byte-identical across ALL skills (a rule two independently
 *   installed skills must both obey cannot live in one shared file — JSM
 *   convention). Unclosed markers fail.
 * - DECLINED (WP-F §7 record): em/en-dash and prose-hyphen bans — house
 *   typography differs; not adopted.
 *
 * Usage: node bin/lint-skills.mjs [DIR]
 * Exit 0 = valid. Exit 1 = invalid (each violation printed). WARN lines are
 * non-failing.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(ROOT, "skills");

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKILL_MAX_BYTES = 32 * 1024;
const SUPPORT_MAX_BYTES = 24 * 1024;
const WARN_RATIO = 0.9;
const DESC_HARD_MAX = 1024;
const DESC_WARN = 400;
// Named per-file budget overrides (WP-F Phase 2): JSM's own checker calibrates
// heavier budgets for known-heavy files; imported here with reasons. Adding an
// override is a rig-change event with a reason, never a silent ratchet.
const BUDGET_OVERRIDES = {
  "architect/SKILL.md": { bytes: 36 * 1024, reason: "JSM 32KB-equivalent corpus + WP-F rig-law additions" },
  "architect/agent-prompt.md": { bytes: 32 * 1024, reason: "JSM upstream override (32KB)" },
  "architect/internal/design-conversation.md": { bytes: 29 * 1024, reason: "JSM upstream override (29KB)" },
};
// Spawn-directive alias ban (extend via rig-change when a provider is adopted).
const MODEL_ALIAS = /(^|\n)[ \t]*model:[ \t]*["']?(haiku|sonnet|opus|fable|kimi|glm|deepseek|qwen|grok|llama|mistral)\b/gi;
// START markers may carry an annotation before the closing `-->`
// (e.g. JSM's `<!-- TOOL-CONSENT:START (identical in /architect, /audit and /sync) -->`).
const CONTRACT_BLOCK = /<!--\s*([A-Za-z0-9_-]+):START\b[^>]*-->([\s\S]*?)<!--\s*\1:END\s*-->/g;
const CONTRACT_START = /<!--\s*[A-Za-z0-9_-]+:START\b/g;
const CONTRACT_END = /<!--\s*[A-Za-z0-9_-]+:END\s*-->/g;

let violations = 0;
function violation(label, msg) {
  violations++;
  console.error(`INVALID | ${label}: ${msg}`);
}
function warn(label, msg) {
  console.log(`WARN   | ${label}: ${msg}`);
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

/** All .md files under a skill folder, as { rel, abs }. */
function mdFiles(folderRoot) {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".md")) out.push({ rel: relative(folderRoot, p), abs: p });
    }
  })(folderRoot);
  return out;
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

// contract-block ledger: NAME -> [{ skill, rel, content }] across ALL skills
const contractBlocks = new Map();

for (const folder of folders) {
  if (!KEBAB.test(folder)) violation(folder, "folder name must be kebab-case");
  const skillFile = join(DIR, folder, "SKILL.md");
  if (!existsSync(skillFile)) { violation(folder, "missing SKILL.md (exact name, case-sensitive)"); continue; }
  const text = readFileSync(skillFile, "utf8");

  // WP-F: byte budgets — SKILL.md and every support .md under the folder.
  for (const f of mdFiles(join(DIR, folder))) {
    const bytes = Buffer.byteLength(readFileSync(f.abs));
    const isSkill = f.rel === "SKILL.md";
    const override = BUDGET_OVERRIDES[`${folder}/${f.rel}`];
    const budget = override?.bytes ?? (isSkill ? SKILL_MAX_BYTES : SUPPORT_MAX_BYTES);
    const kind = isSkill ? "SKILL.md" : `support ${f.rel}`;
    if (bytes > budget) violation(folder, `${kind} ${bytes} bytes > ${budget} byte budget (WP-F${override ? `, override: ${override.reason}` : ""})`);
    else if (bytes >= budget * WARN_RATIO) warn(folder, `${kind} at ${Math.round((bytes / budget) * 100)}% of its ${budget}-byte budget`);
  }

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
  else if (desc.length > DESC_HARD_MAX) violation(folder, `description ${desc.length} chars > ${DESC_HARD_MAX} cap`);
  else if (desc.length > DESC_WARN) warn(folder, `description ${desc.length} chars > ${DESC_WARN} — WP-F ratchet tightens the hard cap to ${DESC_WARN} in Phase 2/3`);

  if (!/metadata:[\s\S]*?trigger_phrases:\s*\[/.test(front)) violation(folder, "metadata.trigger_phrases missing (E.6)");

  // format v2.0.0 (WP-D-1): metadata.class is required and must name a class.
  const cls = front.match(/^\s+class:\s*(\S+)/m)?.[1];
  if (!cls) violation(folder, "metadata.class missing (format v2.0.0 requires procedural | discipline)");
  else if (cls !== "procedural" && cls !== "discipline") violation(folder, `metadata.class "${cls}" must be procedural | discipline`);

  if (/^disable-model-invocation:/m.test(front) && !/^disable-model-invocation:\s*(true|false)$/m.test(front)) {
    violation(folder, "disable-model-invocation must be boolean");
  }

  // WP-F: model-alias spawn-directive ban — across SKILL.md and support .md.
  for (const f of mdFiles(join(DIR, folder))) {
    const body = readFileSync(f.abs, "utf8");
    MODEL_ALIAS.lastIndex = 0;
    let m;
    while ((m = MODEL_ALIAS.exec(body)) !== null) {
      violation(folder, `model alias spawn directive in ${f.rel}: "model: ${m[2]}" — pin models in agents/ profiles, use capability-first prose (WP-F)`);
    }
  }

  const body = text.slice(fm[0].length);
  if (cls === "procedural") {
    for (const marker of ["ACT", "OBSERVE", "EXIT"]) {
      // Case-sensitive, word-boundary: the step verbs must exist as protocol
      // steps, not as prose mentions ("Act → Observe → Exit" in a heading).
      if (!new RegExp(`\\b${marker}\\b`).test(body)) violation(folder, `body missing ${marker} — Act → Observe → Exit form required`);
    }
  }

  // format v2.0.0 (WP-D-1): every skill states explicit non-activation
  // conditions — the brake against over-triggering.
  if (!/when not to use/i.test(body)) violation(folder, "body missing a \"When NOT to Use\" section (format v2.0.0 requires it)");

  // format v2.0.0 (WP-D-1): an empty folder inside a skill dir is noise.
  const empty = findEmptyDir(join(DIR, folder));
  if (empty) violation(folder, `empty folder is noise (lint fails on it): ${empty}`);

  // WP-F: contract-block extraction + unclosed-marker detection, all .md files.
  for (const f of mdFiles(join(DIR, folder))) {
    const content = readFileSync(f.abs, "utf8");
    CONTRACT_BLOCK.lastIndex = 0;
    let m;
    while ((m = CONTRACT_BLOCK.exec(content)) !== null) {
      const list = contractBlocks.get(m[1]) ?? [];
      list.push({ skill: folder, rel: f.rel, content: m[2] });
      contractBlocks.set(m[1], list);
    }
    const starts = (content.match(CONTRACT_START) ?? []).length;
    const ends = (content.match(CONTRACT_END) ?? []).length;
    if (starts !== ends) violation(folder, `unclosed contract-block marker in ${f.rel} (${starts} START / ${ends} END) (WP-F)`);
  }
}

// WP-F: same-NAME blocks must be identical across skills. Comparison is
// whitespace-normalized (leading indent stripped per line): a block nested in
// a bullet legitimately carries deeper indentation (JSM's own /sync does);
// the words are the contract, the nesting is context.
const normalizeBlock = (c) => c.split("\n").map((l) => l.replace(/^\s+/, "")).join("\n").trim();
for (const [blockName, list] of contractBlocks) {
  const distinct = new Map();
  for (const entry of list) {
    const key = normalizeBlock(entry.content);
    if (!distinct.has(key)) distinct.set(key, []);
    distinct.get(key).push(`${entry.skill}/${entry.rel}`);
  }
  if (distinct.size > 1) {
    const variants = [...distinct.values()].map((locs) => locs.join(", ")).join("  ≠  ");
    violation("(contract blocks)", `block "${blockName}" differs between skills: ${variants} (WP-F: shared rules stay identical)`);
  }
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — ${folders.length} skills conform to E.6 (+ WP-F budgets)`);