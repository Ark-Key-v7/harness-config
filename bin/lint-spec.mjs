#!/usr/bin/env node
/**
 * lint-spec.mjs — WP-A Phase-0 spec-chain validation gate.
 *
 * Canon: TCE v2.1 §2.A (intent → prd → plan → slice → contract; every
 * artifact carries a back-reference and a provenance header; orphans are
 * lint errors); Harness v1.3 E.1 (contract trace: field).
 *
 * Checks, in order:
 *   1. Header law     — every artifact has derived_from: and
 *      last_reconciled:; intents additionally carry `parent: none`.
 *   2. Orphan law     — every non-intent artifact's derived_from resolves
 *      to a file in the project; every plan slice's `contract:` reference,
 *      if that contract exists, matches the contract's own trace: field.
 *   3. Back-reference law — every Task Contract's trace: resolves to
 *      specs/plans/<slug>.md containing that slice heading.
 *   4. Size-cap advisory — WARN (never fail) when a slice's touches:
 *      list names >12 entries (Harness §4.7 caps are enforced at contract
 *      scope time; this lint warns early, while decomposition is cheap).
 *
 * Usage:
 *   node bin/lint-spec.mjs [DIR] [--strict]
 *     DIR       specs/ directory (default: templates/specs — template mode)
 *     --strict  project mode: placeholder tokens (<...>) are violations.
 *               Template mode (default) tolerates unfilled slots so the
 *               rig's own templates lint clean.
 *
 * Exit 0 = clean (warnings permitted). Exit 1 = any failure, printed
 * verbatim with file:line.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const STRICT = process.argv.includes("--strict");
const DIR = args[0] ?? join(ROOT, "templates", "specs");
// specs/ lives at project root (TCE v2.1 §2.A placement law) — the project
// root is the specs dir's parent; derived_from paths resolve against it.
const PROJ = dirname(DIR);
const TASKS = join(PROJ, ".agents", "tasks");

let failures = 0;
let warnings = 0;
const failAt = (file, line, msg) => { failures++; console.error(`FAIL | ${file}:${line} — ${msg}`); };
const warnAt = (file, line, msg) => { warnings++; console.error(`WARN | ${file}:${line} — ${msg}`); };

const PLACEHOLDER = /<[^>\n]*>/;

function lineOf(text, idx) {
  return text.slice(0, idx).split("\n").length;
}
function field(text, name) {
  const m = text.match(new RegExp(`^[ \\t]*${name}:\\s*(.+)$`, "m"));
  return m ? { value: m[1].trim(), line: lineOf(text, m.index) } : null;
}

if (!existsSync(DIR)) {
  console.error(`FAIL | specs dir not found: ${DIR}`);
  process.exit(1);
}

const KINDS = ["intent", "prd", "plans"];
const artifacts = []; // { kind, file, path, text }
for (const kind of KINDS) {
  const kd = join(DIR, kind);
  if (!existsSync(kd)) continue; // empty segments are lawful — nothing to lint
  for (const f of readdirSync(kd).filter((f) => f.endsWith(".md"))) {
    const path = join(kd, f);
    artifacts.push({ kind, file: `${kind}/${f}`, path, text: readFileSync(path, "utf8") });
  }
}

// --- 1. Header law ---------------------------------------------------------------
for (const a of artifacts) {
  const df = field(a.text, "derived_from");
  const lr = field(a.text, "last_reconciled");
  if (!df) failAt(a.file, 1, "missing provenance header derived_from: (TCE v2.1 §2.A)");
  if (!lr) failAt(a.file, 1, "missing provenance header last_reconciled:");
  if (STRICT) {
    for (const [f, name] of [[df, "derived_from"], [lr, "last_reconciled"]]) {
      if (f && PLACEHOLDER.test(f.value)) failAt(a.file, f.line, `${name} still holds a placeholder — strict artifacts are law, not templates`);
    }
  }
  if (a.kind === "intent") {
    const p = field(a.text, "parent");
    if (!p || p.value !== "none") failAt(a.file, p?.line ?? 1, "intents are chain heads and must carry `parent: none`");
  }
}

// --- 2. Orphan law -----------------------------------------------------------------
for (const a of artifacts) {
  if (a.kind === "intent") continue; // chain heads have no upstream
  const df = field(a.text, "derived_from");
  if (!df || (!STRICT && PLACEHOLDER.test(df.value))) continue;
  const target = join(PROJ, df.value.split("#")[0]);
  if (!existsSync(target)) {
    failAt(a.file, df.line, `orphan: derived_from "${df.value}" does not resolve to a file in the project`);
  }
}

// --- 3. Slice contracts & back-references -------------------------------------------
// Plans: parse slice headings (### S<n>:) and each slice's contract: pointer.
const slices = []; // { planFile, planSlug, sliceId, line, contract, touches, touchesLine }
for (const a of artifacts.filter((a) => a.kind === "plans")) {
  const planSlug = a.file.replace(/^plans\//, "").replace(/\.md$/, "");
  const re = /^###\s+(S\d+):/gm;
  let m;
  while ((m = re.exec(a.text)) !== null) {
    const start = m.index;
    const next = a.text.indexOf("\n### ", start + 1);
    const body = a.text.slice(start, next < 0 ? undefined : next);
    const c = body.match(/^-\s*contract:\s*(\S+)/m);
    const t = body.match(/^-\s*touches:\s*(.+)$/m);
    slices.push({
      planFile: a.file, planSlug, sliceId: m[1], line: lineOf(a.text, start),
      contract: c?.[1] ?? null,
      touches: t?.[1] ?? null, touchesLine: t ? lineOf(a.text, start + t.index) : null,
    });
  }
}

// Plan slice → contract agreement (only when the contract already exists)
for (const s of slices) {
  if (!s.contract) continue;
  const cPath = join(TASKS, `${s.contract}.md`);
  if (!existsSync(cPath)) continue; // contract not yet drafted — slice-plan's Step 4, not an orphan
  const cText = readFileSync(cPath, "utf8");
  const trace = field(cText, "trace");
  const want = `specs/plans/${s.planSlug}.md#${s.sliceId}`;
  if (!trace || trace.value.split(/\s/)[0] !== want) {
    failAt(s.planFile, s.line, `slice ${s.sliceId} names contract ${s.contract} but that contract's trace: is "${trace?.value ?? "missing"}" — expected ${want}`);
  }
}

// Contract → plan slice resolution (the back-reference law)
if (existsSync(TASKS)) {
  for (const f of readdirSync(TASKS).filter((f) => f.endsWith(".md") && !f.endsWith(".holdout.md"))) {
    const text = readFileSync(join(TASKS, f), "utf8");
    const trace = field(text, "trace");
    if (!trace) continue; // a contract with no trace: is lint-contract's violation, not this gate's
    const [rel, hash] = trace.value.split(/\s/)[0].split("#");
    const line = trace.line;
    const planPath = join(PROJ, rel);
    if (!existsSync(planPath)) {
      failAt(`.agents/tasks/${f}`, line, `unresolvable trace: ${rel} does not exist`);
      continue;
    }
    if (hash) {
      const planText = readFileSync(planPath, "utf8");
      if (!new RegExp(`^###\\s+${hash}:`, "m").test(planText)) {
        failAt(`.agents/tasks/${f}`, line, `trace names slice ${hash} but ${rel} contains no "### ${hash}:" heading`);
      }
    }
  }
}

// --- 4. Size-cap advisory ------------------------------------------------------------
for (const s of slices) {
  if (!s.touches || PLACEHOLDER.test(s.touches)) continue;
  const n = s.touches.split(",").map((x) => x.trim()).filter(Boolean).length;
  if (n > 12) {
    warnAt(s.planFile, s.touchesLine ?? s.line, `slice ${s.sliceId} touches ${n} entries (>12 — Harness §4.7 cap); decompose in the plan, while decomposition is cheap`);
  }
}

console.error("—".repeat(70));
if (failures > 0) {
  console.error(`INVALID — ${failures} failure(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`VALID — ${artifacts.length} spec artifact(s), ${slices.length} slice(s), ${warnings} warning(s) (${STRICT ? "strict" : "template"} mode)`);
