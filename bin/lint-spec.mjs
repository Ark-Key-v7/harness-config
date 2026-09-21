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
    // WP-T: the enriched intent template annotates the field (`parent: none  # …`)
    // — compare the value with any trailing comment stripped.
    if (!p || p.value.split("#")[0].trim() !== "none") failAt(a.file, p?.line ?? 1, "intents are chain heads and must carry `parent: none`");
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
  if (!existsSync(cPath)) continue; // contract not yet drafted — /scope slices mode Step 4, not an orphan
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

// --- 5. WP-E delta lint: changes/<slug>/delta.md -------------------------------------
function parseReqBlocks(text) {
  const out = [];
  const re = /^### (REQ-[a-z0-9-]+-\d+):(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const lineEnd = text.indexOf("\n", m.index);
    const next = text.slice(lineEnd + 1).search(/^### |^## /m);
    const end = next < 0 ? text.length : lineEnd + 1 + next;
    out.push({ id: m[1], body: text.slice(m.index, end) });
  }
  return out;
}
function deltaSection(text, kind) {
  const m = text.match(new RegExp(`^## ${kind} Requirements\\s*$`, "m"));
  if (!m) return "";
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^## /m);
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}
{
  const changesDir = join(DIR, "changes");
  if (existsSync(changesDir)) {
    for (const slug of readdirSync(changesDir, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== "archive").map((e) => e.name)) {
      const dp = join(changesDir, slug, "delta.md");
      if (!existsSync(dp)) continue;
      const text = readFileSync(dp, "utf8");
      for (const h of ["change:", "derived_from:", "last_reconciled:"]) {
        if (!new RegExp(`^${h}`, "m").test(text)) failAt(`changes/${slug}/delta.md`, 1, `missing provenance header ${h} (WP-C2 rules)`);
      }
      const domainsTouched = (text.match(/^domains_touched:\s*\[([^\]]*)\]/m)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      const added = parseReqBlocks(deltaSection(text, "ADDED"));
      const modified = parseReqBlocks(deltaSection(text, "MODIFIED"));
      const removed = parseReqBlocks(deltaSection(text, "REMOVED"));
      for (const r of [...added, ...modified, ...removed]) {
        if (!/#### Scenario:/.test(r.body)) failAt(`changes/${slug}/delta.md`, 1, `${r.id}: requirement without a Scenario — untestable (E.1 Gherkin-truth rule)`);
      }
      const refDomains = new Set([...added, ...modified, ...removed].map((r) => r.id.match(/^REQ-([a-z0-9-]+)-\d+$/)?.[1]).filter(Boolean));
      for (const d of refDomains) if (!domainsTouched.includes(d)) failAt(`changes/${slug}/delta.md`, 1, `requirement in domain "${d}" but domains_touched does not list it`);
      for (const d of domainsTouched) if (!refDomains.has(d)) failAt(`changes/${slug}/delta.md`, 1, `domains_touched lists "${d}" but no requirement references it`);
      for (const d of refDomains) {
        const specPath = join(DIR, "domains", d, "spec.md");
        const ids = existsSync(specPath) ? new Set(parseReqBlocks(readFileSync(specPath, "utf8")).map((r) => r.id)) : new Set();
        for (const r of modified) if (r.id.startsWith(`REQ-${d}-`) && !ids.has(r.id)) failAt(`changes/${slug}/delta.md`, 1, `MODIFIED ${r.id} does not exist in specs/domains/${d}/spec.md`);
        for (const r of removed) if (r.id.startsWith(`REQ-${d}-`) && !ids.has(r.id)) failAt(`changes/${slug}/delta.md`, 1, `REMOVED ${r.id} does not exist in the living spec`);
        for (const r of added) if (r.id.startsWith(`REQ-${d}-`) && ids.has(r.id)) failAt(`changes/${slug}/delta.md`, 1, `ADDED ${r.id} already exists in specs/domains/${d}/spec.md`);
      }
      // Orphan advisory: unarchived change with no contract in flight and a landed plan
      if (existsSync(TASKS)) {
        const inFlight = readdirSync(TASKS).some((f) => f.startsWith(`task-${slug}-`) && f.endsWith(".md"));
        const planLanded = existsSync(join(DIR, "plans", `${slug}.md`));
        if (!inFlight && planLanded) warnAt(`changes/${slug}/delta.md`, 1, "unarchived change with a landed plan and no contract in flight — abandoned work; archive or close it");
      }
    }
  }
}

// --- 6. WP-E domain-spec lint: specs/domains/<d>/spec.md ------------------------------
{
  const domainsDir = join(DIR, "domains");
  if (existsSync(domainsDir)) {
    for (const d of readdirSync(domainsDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
      const sp = join(domainsDir, d, "spec.md");
      if (!existsSync(sp)) continue;
      const text = readFileSync(sp, "utf8");
      for (const h of ["spec_domain:", "derived_from:", "last_reconciled:"]) {
        if (!new RegExp(`^${h}`, "m").test(text)) failAt(`domains/${d}/spec.md`, 1, `missing header ${h} (living-truth provenance)`);
      }
      if (!/^status: living$/m.test(text)) failAt(`domains/${d}/spec.md`, 1, 'domain spec must carry "status: living"');
      for (const r of parseReqBlocks(text)) {
        if (!/^provenance:\s*specs\/changes\/archive\//m.test(r.body)) {
          failAt(`domains/${d}/spec.md`, 1, `${r.id}: missing provenance line to an archived change`);
        } else {
          const arch = r.body.match(/^provenance:\s*(\S+)/m)?.[1];
          if (!existsSync(join(PROJ, arch))) failAt(`domains/${d}/spec.md`, 1, `${r.id}: provenance "${arch}" does not resolve to an archive folder`);
        }
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
