#!/usr/bin/env node
/**
 * lint-contract.mjs — WP7 Task Contract validation gate (E.1).
 *
 * Validates a filled contract: manifest keys (contract_id, manifold_version
 * semver, sub_graph, read_closure, regime enum, model_class,
 * sizing_budget_tokens int), inherit block (rules/gravity/promises/glossary
 * arrays), must_haves (truths with given/when/then + artifacts),
 * validation_commands non-empty, iteration_budget/timeout_seconds ints,
 * A2A exit protocol declared. Placeholders (TEMPLATE_VALUE_REQUIRED) are
 * rejected — this lints FILLED contracts (the template is not its own input).
 *
 * With --gravity <path to .tmd/gravity.md>: the manifest's sub_graph must be
 * a registered node in the Sub-Graph Registry (a contract with no registered
 * sub-graph is invalid and must not spawn).
 *
 * Usage: node tools/lint-contract.mjs <contract.md> [--gravity .tmd/gravity.md]
 * Exit 0 = valid. Exit 1 = invalid (each violation printed).
 */

import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const gIdx = process.argv.indexOf("--gravity");
const GRAVITY = gIdx >= 0 ? process.argv[gIdx + 1] : null;
const FILE = args[0] && args[0] !== process.argv[gIdx + 1] ? args[0] : null;

let violations = 0;
const bad = (m) => { violations++; console.error(`INVALID | ${m}`); };

if (!FILE || !existsSync(FILE)) {
  console.error("usage: node tools/lint-contract.mjs <contract.md> [--gravity .tmd/gravity.md]");
  process.exit(1);
}
const text = readFileSync(FILE, "utf8");

if (text.includes("TEMPLATE_VALUE_REQUIRED")) bad("unfilled TEMPLATE_VALUE_REQUIRED slots — this linter validates filled contracts");

// --- manifest ----------------------------------------------------------------
const manifest = text.match(/manifest:\n([\s\S]*?)(?=\ninherit:|\n[a-z_]+:)/);
if (!manifest) bad("missing manifest block");
else {
  const m = manifest[1];
  const need = ["contract_id:", "manifold_version:", "sub_graph:", "read_closure:", "regime:", "model_class:", "sizing_budget_tokens:"];
  for (const k of need) if (!m.includes(k)) bad(`manifest missing ${k}`);
  if (!/manifold_version:\s*"?[\d]+\.[\d]+\.[\d]+"?/.test(m)) bad("manifold_version must be semver");
  if (!/regime:\s*(gateway|subscription)\b/.test(m)) bad("regime must be gateway|subscription");
  if (!/sizing_budget_tokens:\s*\d+/.test(m)) bad("sizing_budget_tokens must be an int");
}

// --- inherit -------------------------------------------------------------------
if (!/inherit:\n([\s\S]*?)(?=\nmust_haves:)/.test(text)) bad("missing inherit block (contracts inherit manifold law by naming slices, never restating)");
else {
  const inh = text.match(/inherit:\n([\s\S]*?)(?=\nmust_haves:)/)[1];
  for (const k of ["rules:", "gravity:", "promises:", "glossary:"]) if (!inh.includes(k)) bad(`inherit block missing ${k}`);
}

// --- must_haves ------------------------------------------------------------------
const mh = text.match(/must_haves:\n([\s\S]*?)(?=\nvalidation_commands:)/);
if (!mh) bad("missing must_haves block");
else {
  const b = mh[1];
  if (!/truths:/.test(b)) bad("must_haves missing truths (Gherkin scenarios)");
  if (!/artifacts:/.test(b)) bad("must_haves missing artifacts (mechanical checks)");
  const scenarios = b.match(/scenario:/g) ?? [];
  if (scenarios.length === 0) bad("no Gherkin scenarios in truths");
  const gwts = (b.match(/given:/g) ?? []).length;
  if (gwts < scenarios.length) bad("every scenario needs given/when/then (goal-backward verification)");
}

// --- budgets / validation / exit ---------------------------------------------------
if (!/validation_commands:\s*\[[^\]]+\]/.test(text) && !/validation_commands:\n\s+-/.test(text)) bad("validation_commands missing or empty — must represent full application state");
if (!/iteration_budget:\s*\d+/.test(text)) bad("iteration_budget must be an int");
if (!/timeout_seconds:\s*\d+/.test(text)) bad("timeout_seconds must be an int");
if (!/A2A Completion Payload/.test(text)) bad("exit protocol must emit the A2A Completion Payload (E.3)");

// --- Registry cross-check -------------------------------------------------------------
const subGraph = text.match(/sub_graph:\s*(\S+)/)?.[1];
if (GRAVITY && subGraph) {
  if (!existsSync(GRAVITY)) bad(`gravity file not found: ${GRAVITY}`);
  else {
    const g = readFileSync(GRAVITY, "utf8").replace(/<!--[\s\S]*?-->/g, ""); // Zone B examples live in comments — not the Registry
    if (!new RegExp(`-\\s*name:\\s*${subGraph}\\b`).test(g)) {
      bad(`sub_graph "${subGraph}" is not registered in gravity.md's Sub-Graph Registry — contract must not spawn`);
    }
  }
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — contract ${subGraph ? `(sub_graph: ${subGraph})` : ""} conforms to E.1`);
