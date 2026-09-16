#!/usr/bin/env node
/**
 * archive-change.mjs — WP-E §5: the archive merge (change semantics).
 *
 * Canon: specs/ holds WHY work exists (ancestry, immutable);
 * specs/domains/ holds WHAT the system does NOW (currency, merged);
 * this tool is the only instrument that moves truth from a landed change
 * into the living domain specs. A hand-edit to a domain spec is drift —
 * the manifest guard halts on it.
 *
 * Usage:
 *   node bin/archive-change.mjs --change specs/changes/<slug> [--dry-run] [--root DIR]
 *     --change   path to the change folder (relative to --root, default cwd)
 *     --dry-run  print the merge summary without writing
 *     --root     project root (default: process cwd)
 *
 * Preflight (fail-closed):
 *   - delta.md parses; provenance header present (WP-C2 rules)
 *   - every requirement block carries >=1 Scenario (E.1 Gherkin-truth rule)
 *   - MODIFIED/REMOVED IDs exist in the living domain spec
 *   - ADDED IDs do NOT exist (and are next-free per domain)
 *   - domains_touched matches the domains the requirement IDs name
 *   - if task contracts exist for the slug (.agents/tasks/task-<slug>-*.md),
 *     the change must carry verified.md (the reviewer seat's E.4 verdict
 *     marker) — archive of unverified work is forbidden
 *
 * Exit 0 = merged (or dry-run clean). Exit 1 = failures, printed verbatim.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT_REPO = join(HERE, "..");

const argv = process.argv.slice(2);
const get = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
const DRY = argv.includes("--dry-run");
const PROJECT = get("root") ?? process.cwd();
const CHANGE_REL = get("change");

let failures = 0;
const fail = (msg) => { failures++; console.error(`FAIL | ${msg}`); };

if (!CHANGE_REL) {
  console.error("usage: node bin/archive-change.mjs --change specs/changes/<slug> [--dry-run] [--root DIR]");
  process.exit(1);
}

const CHANGE_DIR = join(PROJECT, CHANGE_REL);
const DELTA = join(CHANGE_DIR, "delta.md");
const SPECS = join(PROJECT, "specs");

function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*"?([^"\\n]+)"?`, "m"));
  return m ? m[1].trim() : null;
}
function sha(s) { return createHash("sha256").update(s).digest("hex"); }
const today = () => new Date().toISOString().slice(0, 10);

/** Parse a delta or domain spec into requirement blocks keyed by ID. */
function parseRequirements(text) {
  const out = []; // { id, title, body, index }
  const re = /^### (REQ-[a-z0-9-]+-\d+):(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const lineEnd = text.indexOf("\n", m.index);
    const next = text.slice(lineEnd + 1).search(/^### |^## /m);
    const end = next < 0 ? text.length : lineEnd + 1 + next;
    out.push({ id: m[1], title: m[2].trim(), body: text.slice(m.index, end).replace(/\n+$/, "\n"), index: m.index });
  }
  return out;
}

function readDomainSpec(domain) {
  const p = join(SPECS, "domains", domain, "spec.md");
  return existsSync(p) ? { path: p, text: readFileSync(p, "utf8") } : null;
}

function manifestPath(domain) {
  return join(SPECS, "domains", domain, ".merge-manifest.json");
}

// --- Load delta ---------------------------------------------------------------------
if (!existsSync(DELTA)) { console.error(`FAIL | ${CHANGE_REL}/delta.md not found`); process.exit(1); }
const deltaText = readFileSync(DELTA, "utf8");

const changeSlug = field(deltaText, "change");
const derivedFrom = field(deltaText, "derived_from");
const domainsTouched = (deltaText.match(/^domains_touched:\s*\[([^\]]*)\]/m)?.[1] ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

if (!changeSlug) fail("delta.md missing provenance header change:");
if (!derivedFrom) fail("delta.md missing provenance header derived_from:");
if (!field(deltaText, "last_reconciled")) fail("delta.md missing provenance header last_reconciled:");
if (changeSlug && !CHANGE_REL.endsWith(`/${changeSlug}`)) fail(`delta change: "${changeSlug}" does not match folder name (${CHANGE_REL})`);

// --- Split delta sections --------------------------------------------------------------
function section(kind) {
  const re = new RegExp(`^## ${kind} Requirements\\s*$`, "m");
  const m = deltaText.match(re);
  if (!m) return "";
  const rest = deltaText.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}
const added = parseRequirements(section("ADDED"));
const modified = parseRequirements(section("MODIFIED"));
const removed = parseRequirements(section("REMOVED"));

if (added.length + modified.length + removed.length === 0) fail("delta contains no requirement blocks — nothing to merge");

// --- Preflight checks ---------------------------------------------------------------------
const referencedDomains = new Set([...added, ...modified, ...removed].map((r) => r.id.match(/^REQ-([a-z0-9-]+)-\d+$/)?.[1]).filter(Boolean));
for (const d of referencedDomains) if (!domainsTouched.includes(d)) fail(`requirement in domain "${d}" but domains_touched does not list it`);
for (const d of domainsTouched) if (!referencedDomains.has(d)) fail(`domains_touched lists "${d}" but no requirement references it`);

for (const r of [...added, ...modified, ...removed]) {
  if (!/#### Scenario:/.test(r.body)) fail(`${r.id}: requirement without a Scenario — untestable, fails lint (E.1 Gherkin-truth rule)`);
}

const domainState = new Map(); // domain -> { text, path, reqs }
for (const d of referencedDomains) {
  const spec = readDomainSpec(d);
  domainState.set(d, spec ? { ...spec, reqs: parseRequirements(spec.text) } : null);
  const ids = spec ? new Set(parseRequirements(spec.text).map((r) => r.id)) : new Set();
  for (const r of modified) if (r.id.startsWith(`REQ-${d}-`) && !ids.has(r.id)) fail(`MODIFIED ${r.id} does not exist in specs/domains/${d}/spec.md — lint failure, not a merge-time surprise`);
  for (const r of removed) if (r.id.startsWith(`REQ-${d}-`) && !ids.has(r.id)) fail(`REMOVED ${r.id} does not exist in the living spec`);
  for (const r of added) if (r.id.startsWith(`REQ-${d}-`) && ids.has(r.id)) fail(`ADDED ${r.id} already exists in specs/domains/${d}/spec.md`);
}

// Contract verification gate: if task contracts exist for the slug, the change
// must carry verified.md (the reviewer seat's E.4 PASS verdict marker).
{
  const tasks = join(PROJECT, ".agents", "tasks");
  if (existsSync(tasks)) {
    const contracts = readdirSync(tasks).filter((f) => f.startsWith(`task-${changeSlug}-`) && f.endsWith(".md"));
    if (contracts.length > 0 && !existsSync(join(CHANGE_DIR, "verified.md"))) {
      fail(`${contracts.length} task contract(s) exist for "${changeSlug}" but the change carries no verified.md — archive of unverified work is forbidden (verification-before-completion at the spec layer)`);
    }
  }
}

if (failures > 0) {
  console.error(`\nINVALID — ${failures} preflight failure(s); nothing merged`);
  process.exit(1);
}

// --- Manifest guard: hand-edit detection -------------------------------------------------
for (const [d, spec] of domainState) {
  const mp = manifestPath(d);
  if (spec && existsSync(mp)) {
    let manifest;
    try { manifest = JSON.parse(readFileSync(mp, "utf8")); }
    catch { fail(`domains/${d}: .merge-manifest.json is corrupt — human resolves (restore from git)`); continue; }
    const live = parseRequirements(spec.text);
    const drifted = [];
    for (const r of live) {
      const h = manifest.requirements?.[r.id];
      if (h === undefined) drifted.push(`${r.id} (no manifest entry — added by hand?)`);
      else if (h !== sha(r.body)) drifted.push(`${r.id} (content hash mismatch)`);
    }
    for (const id of Object.keys(manifest.requirements ?? {})) {
      if (!live.some((r) => r.id === id)) drifted.push(`${id} (manifest entry without a block — deleted by hand?)`);
    }
    if (drifted.length > 0) {
      fail(`domains/${d}/spec.md drifted from the merge manifest — hand-edits are drift, the merger never papers over them. Drifted: ${drifted.join(", ")}. Human resolves: restore from git, or re-baseline via a declared reconciliation change.`);
    }
  }
}
if (failures > 0) {
  console.error(`\nHALT — manifest guard tripped; nothing merged`);
  process.exit(1);
}

// --- Merge per domain ---------------------------------------------------------------------
const archivePath = `specs/changes/archive/${today()}-${changeSlug}`;
const summary = [];

for (const d of referencedDomains) {
  const spec = domainState.get(d);
  const prov = `provenance: ${archivePath}`;
  let text;
  if (!spec) {
    // New domain: create the living spec from the template
    const tpl = readFileSync(join(ROOT_REPO, "templates", "specs", "domain-spec.md"), "utf8");
    text = tpl
      .replace(/spec_domain: "TEMPLATE_VALUE_REQUIRED[^"]*"/, `spec_domain: "${d}"`)
      .replace(/derived_from: "TEMPLATE_VALUE_REQUIRED[^"]*"/, `derived_from: "${archivePath}"`)
      .replace(/last_reconciled: "TEMPLATE_VALUE_REQUIRED[^"]*"/, `last_reconciled: "${today()}"`)
      .replace("# Domain Spec: <domain>", `# Domain Spec: ${d}`)
      .replace(/## Requirements\n\n<!--[\s\S]*?-->\nTEMPLATE_VALUE_REQUIRED/, "## Requirements\n");
  } else {
    text = spec.text;
  }

  // REMOVED → delete blocks
  for (const r of removed) if (r.id.startsWith(`REQ-${d}-`)) {
    const re = new RegExp(`^### ${r.id}:.*$(?:\\n(?!### |## ).*)*\\n?`, "m");
    text = text.replace(re, "");
  }
  // MODIFIED → replace block in full, restamping provenance to this archive
  for (const r of modified) if (r.id.startsWith(`REQ-${d}-`)) {
    const re = new RegExp(`^### ${r.id}:.*$(?:\\n(?!### |## ).*)*`, "m");
    let stamped = /\nprovenance: .*/.test(r.body)
      ? r.body.replace(/\nprovenance: .*/, `\n${prov}`)
      : `${r.body.replace(/\n+$/, "")}\n${prov}\n`;
    text = text.replace(re, stamped);
  }
  // ADDED → append before the next `## ` after `## Requirements` (or at end)
  for (const r of added) if (r.id.startsWith(`REQ-${d}-`)) {
    const block = `${r.body.replace(/\n+$/, "")}\n${prov}\n`;
    const reqIdx = text.indexOf("## Requirements");
    if (reqIdx < 0) { fail(`domains/${d}/spec.md has no "## Requirements" heading`); continue; }
    const nextSec = text.slice(reqIdx).search(/\n## /);
    const insertAt = nextSec < 0 ? text.length : reqIdx + nextSec;
    text = text.slice(0, insertAt).replace(/\n*$/, "\n\n") + block + text.slice(insertAt);
  }
  // Advance last_reconciled
  text = text.replace(/^last_reconciled:.*$/m, `last_reconciled: "${today()}"`);

  // Manifest: recompute over the merged result
  const liveReqs = parseRequirements(text);
  const manifest = { last_merge: archivePath, requirements: Object.fromEntries(liveReqs.map((r) => [r.id, sha(r.body)])) };

  summary.push(`${d}: ${added.filter((r) => r.id.startsWith(`REQ-${d}-`)).length} added / ${modified.filter((r) => r.id.startsWith(`REQ-${d}-`)).length} modified / ${removed.filter((r) => r.id.startsWith(`REQ-${d}-`)).length} removed`);
  if (!DRY) {
    mkdirSync(join(SPECS, "domains", d), { recursive: true });
    writeFileSync(join(SPECS, "domains", d, "spec.md"), text);
    writeFileSync(manifestPath(d), JSON.stringify(manifest, null, 2) + "\n");
  }
}

if (failures > 0) { console.error(`\nINVALID — merge produced failures; nothing written`); process.exit(1); }

// --- Archive the change ------------------------------------------------------------------
if (!DRY) {
  mkdirSync(join(SPECS, "changes", "archive"), { recursive: true });
  renameSync(CHANGE_DIR, join(PROJECT, archivePath));
}

console.log(`${DRY ? "DRY-RUN — " : ""}merged ${changeSlug}`);
for (const s of summary) console.log(`  ${s}`);
console.log(`  archive: ${archivePath}`);
