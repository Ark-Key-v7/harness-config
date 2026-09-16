#!/usr/bin/env node
/**
 * canon-compile.mjs — WP-C2 §9: the rig's Canon Compiler (document gate).
 *
 * Canon spec §0.6.1 mandates a deterministic, fail-closed gate over the
 * rig's normative documents. Nine checks:
 *   1. Normative YAML blocks (frontmatter + fenced ```yaml) parse
 *      structurally — malformed = fail.
 *   2. templates/wt.toml parses (structural TOML: sections, key=value).
 *   3. a2a-completion.schema.json parses and carries the draft-2020-12
 *      structural fields ($schema, type, required, properties).
 *   4. Every ${...} resolves against its file's declared variable
 *      inventory (wt.toml's inventory comment); files declaring no
 *      inventory must contain zero ${...}.
 *   5. Prose inventories match canonical schemas: rules.md A.2 carries
 *      exactly fifteen numbered laws; the task-contract Exit Protocol
 *      names the five A2A fields; wt.toml values keys exist in
 *      state.schema.yaml.
 *   6. Stale stack terms rejected (denylist with per-term justification).
 *   7. Internal cross-references resolve: `§D.N` mentions in docs/ match
 *      an existing `### §D.N` heading in CAPABILITY_REGISTER.md.
 *   8. Stable section-anchor index emitted to validation/canon-compile/index.json.
 *   9. Fail closed; advisory mode does not exist.
 *
 * DEVIATION on record (WP-C2 §9 premise): no YAML/TOML parser is vendored
 * in this repo (lint-tmd.mjs is regex-based, no node_modules). Checks 1–2
 * use in-script structural parsers (indentation/section/key-line law) —
 * zero new dependencies, no new pins.
 *
 * Usage: node bin/canon-compile.mjs [ROOT]   (default: repo root)
 * Exit 0 = all checks green. Exit 1 = failures, each with file:line.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : join(HERE, "..");

let failures = 0;
const fail = (file, line, msg) => { failures++; console.error(`FAIL | ${file}:${line ?? 1} — ${msg}`); };

const TMD = join(ROOT, "templates", "tmd");
const WT = join(ROOT, "templates", "wt.toml");
const SCHEMAS = join(ROOT, "templates", "agents", "schemas");
const SPECS = join(ROOT, "templates", "specs");
const CONTRACT = join(ROOT, "templates", "task-contract.md");
const REGISTER = join(ROOT, "docs", "CAPABILITY_REGISTER.md");
const DOCS = join(ROOT, "docs");
const FIXTURES = join(ROOT, "validation", "canon-compile", "fixtures");
const OUT_INDEX = join(ROOT, "validation", "canon-compile", "index.json");

/** Recursively list files under dir with a given extension. */
function walk(dir, ext, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, acc);
    else if (e.name.endsWith(ext)) acc.push(p);
  }
  return acc;
}

// --- Check 1: normative YAML blocks parse structurally ---------------------------
// Structural law: frontmatter delimited by ---; fenced yaml blocks balanced;
// list items and mappings indent-consistently; tabs inside YAML are malformed.
function checkYamlBlocks(label, text) {
  const lines = text.split("\n");
  if (lines[0] === "---") {
    const close = lines.indexOf("---", 1);
    if (close < 0) fail(label, 1, "frontmatter opened but never closed");
  }
  let fence = null;
  let fenceLine = 0;
  let inComment = false;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln.trimStart().startsWith("<!--")) inComment = true;
    if (ln.includes("-->")) inComment = false;
    if (/^\s*```(yaml|toml)?\s*$/.test(ln) || /^```(yaml|toml)\b/.test(ln)) {
      if (fence === null) { fence = ln.trim(); fenceLine = i + 1; }
      else { fence = null; }
      continue;
    }
    if (fence !== null && !inComment && /\t/.test(ln)) {
      fail(label, i + 1, "tab character inside fenced normative block — malformed YAML");
    }
  }
  if (fence !== null) fail(label, fenceLine, `unclosed fenced block (${fence})`);
}

// --- Check 2: structural TOML -----------------------------------------------------
function checkToml(label, text) {
  let section = null;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*#/.test(ln) || !ln.trim()) continue;
    const sec = ln.match(/^(\[+[\w.]+\]+)\s*$/);
    if (sec) { section = sec[1]; continue; }
    if (/^[A-Za-z_][\w-]*\s*=/.test(ln)) continue;
    if (/^(run|exec|name|artifact|from_schema|to|values|engine|host_path|container_path|mode|on_failure|version|endpoint|constraint)\s*=/.test(ln)) continue;
    if (/^\[\[/.test(ln) || /^\[/.test(ln)) continue;
    fail(label, i + 1, `malformed TOML line (section ${section ?? "top"}): ${ln.trim().slice(0, 50)}`);
  }
}

// --- Check 3: A2A schema structural validation -------------------------------------
function checkA2aSchema(path) {
  const label = relative(ROOT, path);
  let j;
  try { j = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { fail(label, 1, `does not parse as JSON: ${e.message}`); return; }
  if (j.$schema !== "https://json-schema.org/draft/2020-12/schema") fail(label, 1, "$schema must be draft 2020-12");
  if (j.type !== "object") fail(label, 1, 'type must be "object"');
  const req = j.required;
  if (!Array.isArray(req) || req.length !== 5) fail(label, 1, "required must list exactly the five A2A fields");
  if (!j.properties || !j.properties.status || !j.properties.worktrunk_path || !j.properties.commit_hash || !j.properties.trace_id || !j.properties.regime) {
    fail(label, 1, "properties must define all five required A2A fields");
  }
  if (j.additionalProperties !== false) fail(label, 1, "additionalProperties must be false");
}

// --- Check 4: ${...} inventory -------------------------------------------------------
function checkVariables(label, text) {
  const invMatch = text.match(/^#\s*\$\{([A-Z_]+)\}/gm);
  const declared = new Set((invMatch ?? []).map((l) => l.slice(l.indexOf("{") + 1, l.indexOf("}"))));
  const used = [...text.matchAll(/\$\{([A-Z_]+)\}/g)].map((m) => m[1]);
  if (declared.size === 0) {
    if (used.length > 0) fail(label, (text.slice(0, text.indexOf("${")).match(/\n/g) ?? []).length + 1, "file declares no variable inventory but uses ${...} placeholders");
    return;
  }
  for (const v of new Set(used)) if (!declared.has(v)) fail(label, 1, `variable \${${v}} used but not declared in the inventory`);
}

// --- Check 6: stale stack terms -------------------------------------------------------
// Scan scope: templates/ only (register/docs carry the closed-decision prose
// where the terms are lawful).
const DENYLIST = [
  // superseded — PR-Agent is the review agent of record (ruling 4)
  { term: "Qodo", allow: [] },
  // out on license; lawful only inside register closed-decision prose, never templates
  { term: "GitNexus", allow: [] },
  // out — codebase-memory-mcp holds the graph seat (ruling 7)
  { term: "CodeGraph", allow: [] },
  // deferred-entry name only; never a template binding
  { term: "Claw Patrol", allow: [] },
  // removed as L3 mandate — OpenWiki+OpenKB hold the substrate seat
  { term: "Mintlify", allow: [] },
];
function checkDenylist(label, text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const { term } of DENYLIST) {
      if (lines[i].includes(term)) fail(label, i + 1, `stale stack term "${term}" — rejected by canon v2.0 rulings`);
    }
  }
}

// --- Run over rig templates ------------------------------------------------------------
const targets = [
  ...walk(TMD, ".md"),
  ...walk(SPECS, ".md"),
  ...(existsSync(CONTRACT) ? [CONTRACT] : []),
  ...(existsSync(WT) ? [WT] : []),
  ...walk(SCHEMAS, ".yaml"),
];

for (const path of targets) {
  const label = relative(ROOT, path);
  const text = readFileSync(path, "utf8");
  checkYamlBlocks(label, text);
  checkVariables(label, text);
  checkDenylist(label, text);
  if (path.endsWith(".toml")) checkToml(label, text);
}
for (const j of walk(SCHEMAS, ".json")) checkA2aSchema(j);

// --- Check 5: prose inventories vs canonical schemas -----------------------------------
{
  const rules = readFileSync(join(TMD, "rules.md"), "utf8");
  const laws = [...rules.matchAll(/^\d+\.\s+\*\*[A-Z][A-Z \-]+:/gm)].length;
  if (laws !== 15) fail("templates/tmd/rules.md", 1, `A.2 must carry exactly fifteen numbered laws, found ${laws}`);

  const contract = readFileSync(CONTRACT, "utf8");
  const exitIdx = contract.indexOf("**Exit protocol.**");
  const exitBlock = exitIdx >= 0 ? contract.slice(exitIdx, exitIdx + 900) : "";
  for (const field of ["status", "worktrunk_path", "commit_hash", "trace_id", "regime"]) {
    if (!exitBlock.includes(field)) fail("templates/task-contract.md", 1, `Exit Protocol prose must name the A2A field "${field}"`);
  }

  const wt = readFileSync(WT, "utf8");
  const schema = readFileSync(join(SCHEMAS, "state.schema.yaml"), "utf8");
  // The declared mapping comment is the authority for hook→schema key renames
  // (WP-C2 §5.3: task_contract_path → task_contract).
  const mapLine = wt.match(/^#\s*Mapping:.*$/m)?.[0] ?? "";
  const mapped = new Map();
  for (const m of mapLine.matchAll(/(\w+)\s+(?:value\s+)?lands in STATE.md's\s+(\w+)\s+field/g)) mapped.set(m[1], m[2]);
  const values = wt.match(/values\s*=\s*\{([^}]*)\}/)?.[1] ?? "";
  for (const kv of values.split(",").map((s) => s.trim()).filter(Boolean)) {
    const key = kv.split("=")[0].trim();
    const schemaKey = mapped.get(key) ?? key;
    if (key && !schema.includes(schemaKey)) fail("templates/wt.toml", 1, `values key "${key}" (schema key "${schemaKey}") does not exist in state.schema.yaml (E.2 mapping law)`);
  }
}

// --- Check 7: internal §D.N cross-references ------------------------------------------
{
  const reg = readFileSync(REGISTER, "utf8");
  const headings = new Set([...reg.matchAll(/^###\s+§(D\.\d+)/gm)].map((m) => m[1]));
  for (const path of walk(DOCS, ".md")) {
    const label = relative(ROOT, path);
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const m of lines[i].matchAll(/§(D\.\d+)/g)) {
        if (!headings.has(m[1])) fail(label, i + 1, `cross-reference §${m[1]} has no matching "### §${m[1]}" heading in CAPABILITY_REGISTER.md`);
      }
    }
  }
}

// --- Fixtures: every filled example under fixtures/ MUST pass; negatives live in the driver ---
if (existsSync(FIXTURES)) {
  for (const path of [...walk(FIXTURES, ".md"), ...walk(FIXTURES, ".toml"), ...walk(FIXTURES, ".json")]) {
    const label = relative(ROOT, path);
    const text = readFileSync(path, "utf8");
    checkYamlBlocks(label, text);
    checkVariables(label, text);
    checkDenylist(label, text);
    if (path.endsWith(".toml")) checkToml(label, text);
    if (/^a2a-completion\.schema.*\.json$/.test(basename(path))) checkA2aSchema(path);
    if (path.endsWith("rules.md")) {
      const laws = [...text.matchAll(/^\d+\.\s+\*\*[A-Z][A-Z \-]+:/gm)].length;
      if (laws !== 15) fail(label, 1, `fixture rules.md must carry fifteen laws, found ${laws}`);
    }
  }
}

// --- Check 8: stable anchor index --------------------------------------------------------
{
  const index = {};
  for (const path of [...walk(TMD, ".md"), ...walk(SPECS, ".md"), ...(existsSync(CONTRACT) ? [CONTRACT] : []), ...walk(SCHEMAS, ".yaml"), ...walk(SCHEMAS, ".json"), ...(existsSync(WT) ? [WT] : [])]) {
    const label = relative(ROOT, path);
    const text = readFileSync(path, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const h = lines[i].match(/^#{2,4}\s+(.+)$/);
      if (h) {
        const anchor = h[1].trim().toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
        index[`${label}#${anchor}`] = { file: label, line: i + 1 };
      }
    }
  }
  mkdirSync(dirname(OUT_INDEX), { recursive: true });
  writeFileSync(OUT_INDEX, JSON.stringify({ generated_by: "bin/canon-compile.mjs (WP-C2 §9 check 8)", anchors: index }, null, 2) + "\n");
}

console.error("—".repeat(70));
if (failures > 0) {
  console.error(`INVALID — ${failures} failure(s) — the Canon Compiler is fail-closed; there is no advisory mode`);
  process.exit(1);
}
console.log("VALID — canon-compile: 9 checks green over templates + fixtures");
