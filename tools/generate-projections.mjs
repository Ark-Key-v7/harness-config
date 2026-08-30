#!/usr/bin/env node
/**
 * generate-projections.mjs — WP3 projection generator.
 *
 * Canon: Harness Handbook v1.2 §2.4 (projection model), L4 (manifest header,
 * last_verified = commit SHA), L5 (no duplicated law — projections contain
 * POINTERS and generated bindings only).
 *
 * Reads:
 *   templates/tmd/*.md                  — manifold templates (WP4 fills these)
 *   templates/agents/profiles/*.md      — role roster profiles (WP5)
 *
 * Emits (committed, NEVER hand-edited):
 *   projections/pi/append-system.md     — stable system-prompt appendix
 *   projections/pi/pi-settings.json     — .pi/ settings projection (WP8 strips
 *                                         _-prefixed meta keys when copying)
 *
 * Determinism law: same inputs + same --source-head => byte-identical output.
 * No timestamps, no random ordering, no environment leakage. The only
 * variance source is the source HEAD, passed explicitly or read from git.
 *
 * Usage:
 *   node tools/generate-projections.mjs [--out DIR] [--source-head SHA]
 *
 * Two-part cache composition (v1.2 §2.4): projections are the STABLE part
 * only. Per-turn dynamic content (memory injection, scope state) is owned by
 * extensions via before_agent_start and MUST NOT appear here — one volatile
 * line invalidates the cached prefix.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// --- Args -------------------------------------------------------------------
const args = process.argv.slice(2);
function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}
const OUT_DIR = argValue("--out") ?? join(ROOT, "projections");

function gitHead() {
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}
const SOURCE_HEAD = argValue("--source-head") ?? gitHead();

// --- Inputs ------------------------------------------------------------------
/** Canonical manifold precedence (WP4 contract table). Unknown files sort after, alphabetically. */
const PRECEDENCE = { "rules.md": 1, "gravity.md": 2, "promises.md": 3, "glossary.md": 4, "design.md": 5 };

function listMd(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => {
      const pa = PRECEDENCE[a] ?? 100;
      const pb = PRECEDENCE[b] ?? 100;
      return pa !== pb ? pa - pb : a.localeCompare(b);
    });
}

const tmdDir = join(ROOT, "templates", "tmd");
const profilesDir = join(ROOT, "templates", "agents", "profiles");
const skillsDir = join(ROOT, "templates", "agents", "skills");
const manifoldFiles = listMd(tmdDir);
const profileFiles = listMd(profilesDir);

/** Skill routing: folder name + trigger phrases parsed from frontmatter (E.6). */
function listSkills(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => existsSync(join(dir, f, "SKILL.md")))
    .sort()
    .map((folder) => {
      const text = readFileSync(join(dir, folder, "SKILL.md"), "utf8");
      const phrases = text.match(/trigger_phrases:\s*\[([^\]]*)\]/)?.[1] ?? "";
      const triggers = phrases
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);
      return { folder, triggers };
    });
}
const skills = listSkills(skillsDir);

// --- Emit: append-system.md (STABLE part only) --------------------------------
const generatedBanner = (name) =>
  `<!-- GENERATED FILE — do not hand-edit (WP3, L4). Regenerate: node tools/generate-projections.mjs -->\n` +
  `<!-- source_head: ${SOURCE_HEAD} -->\n` +
  `<!-- projection: ${name} -->\n`;

const manifoldTable =
  manifoldFiles.length === 0
    ? "| (none committed yet — WP4 lands the manifold templates) | — |"
    : manifoldFiles
        .map((f) => `| templates/tmd/${f} | ${PRECEDENCE[f] ?? "unranked"} |`)
        .join("\n");

const rosterList =
  profileFiles.length === 0
    ? "- (none committed yet — WP5 lands the roster profiles)"
    : profileFiles.map((f) => `- templates/agents/profiles/${f}`).join("\n");

const skillsTable =
  skills.length === 0
    ? "| (none committed yet — WP6 lands the skills library) | — |"
    : skills
        .map((s) => `| ${s.folder} | ${s.triggers.length > 0 ? s.triggers.join(" · ") : "(no trigger phrases)"} |`)
        .join("\n");

const appendSystem =
  generatedBanner("pi/append-system.md") +
  `\n# Factory projection — Pi append-system (stable part)\n` +
  `\nYou are operating inside a governed factory rig. The law lives in the canon;\n` +
  `this projection carries POINTERS ONLY (L5 — no duplicated law). Read the\n` +
  `pointed-to files when a task touches their domain.\n` +
  `\n## Manifold pointers (precedence order)\n` +
  `\n| File | Precedence |\n|---|---|\n${manifoldTable}\n` +
  `\n## Role roster bindings\n` +
  `\n${rosterList}\n` +
  `\n## Skill routing table\n` +
  `\nWhen a task matches a trigger, invoke the named skill — procedure follows, never improvise:\n` +
  `\n| Skill | Trigger phrases |\n|---|---|\n${skillsTable}\n` +
  `\n## Composition boundary (v1.2 §2.4)\n` +
  `\nThis block is the STABLE part of the system prompt and is cache-safe.\n` +
  `Dynamic per-turn content (memory, active contract scope) is injected by rig\n` +
  `extensions via before_agent_start and never appears here.\n` +
  `\n## Enforcement notice\n` +
  `\nDeterministic guards (bash-guard, sandbox-guard, file-changes) enforce the\n` +
  `operational law at the tool-call layer. A blocked action is not a suggestion\n` +
  `to retry differently — escalate per the active contract.\n`;

// --- Emit: pi-settings.json ---------------------------------------------------
const settings = {
  _generated: "WP3 projection — WP8 strips _-prefixed meta keys when copying into a project's .pi/settings.json",
  _sourceHead: SOURCE_HEAD,
  extensions: [],
  packages: [],
};
const settingsJson = JSON.stringify(settings, null, 2) + "\n";

// --- Write ---------------------------------------------------------------------
const piOut = join(OUT_DIR, "pi");
mkdirSync(piOut, { recursive: true });
writeFileSync(join(piOut, "append-system.md"), appendSystem);
writeFileSync(join(piOut, "pi-settings.json"), settingsJson);

console.log(`projections written to ${piOut} (source_head: ${SOURCE_HEAD})`);
console.log(`  manifold files: ${manifoldFiles.length}, profiles: ${profileFiles.length}, skills: ${skills.length}`);
