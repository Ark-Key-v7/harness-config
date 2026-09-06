#!/usr/bin/env node
/**
 * lint-contract.mjs — WP7 Task Contract validation gate (E.1).
 *
 * Validates a filled contract: manifest keys (contract_id, manifold_version
 * semver, sub_graph, read_closure, regime enum, model_class,
 * sizing_budget_tokens int, trace, holdout), inherit block
 * (rules/gravity/promises/glossary arrays), must_haves (truths with
 * given/when/then + artifacts), validation_commands non-empty,
 * iteration_budget/timeout_seconds ints, A2A exit protocol declared.
 * Placeholders (TEMPLATE_VALUE_REQUIRED) are rejected — this lints FILLED
 * contracts (the template is not its own input).
 *
 * Phase-0 chain (TCE v2.1 §2.A / Harness v1.3 E.1): the manifest's trace:
 * must resolve to specs/plans/<slug>.md containing the named slice heading
 * (resolved against the current working directory — the project root). A
 * contract without a resolvable trace is invalid. The manifest's holdout:
 * must point at .agents/tasks/<contract_id>.holdout.md (E.7); if the
 * holdout file does not exist yet, WARN (it is authored at review time),
 * never fail.
 *
 * With --gravity <path to .tmd/gravity.md>: the manifest's sub_graph must be
 * a registered node in the Sub-Graph Registry (a contract with no registered
 * sub-graph is invalid and must not spawn).
 *
 * Usage: node bin/lint-contract.mjs <contract.md> [--gravity .tmd/gravity.md]
 * Exit 0 = valid. Exit 1 = invalid (each violation printed).
 */

import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const gIdx = process.argv.indexOf("--gravity");
const GRAVITY = gIdx >= 0 ? process.argv[gIdx + 1] : null;
const FILE = args[0] && args[0] !== process.argv[gIdx + 1] ? args[0] : null;

let violations = 0;
let warnings = 0;
const bad = (m) => { violations++; console.error(`INVALID | ${m}`); };
const warn = (m) => { warnings++; console.error(`WARN | ${m}`); };

if (!FILE || !existsSync(FILE)) {
  console.error("usage: node bin/lint-contract.mjs <contract.md> [--gravity .tmd/gravity.md]");
  process.exit(1);
}
const text = readFileSync(FILE, "utf8");

if (text.includes("TEMPLATE_VALUE_REQUIRED")) bad("unfilled TEMPLATE_VALUE_REQUIRED slots — this linter validates filled contracts");

// --- manifest ----------------------------------------------------------------
const manifest = text.match(/manifest:\n([\s\S]*?)(?=\ninherit:|\n[a-z_]+:)/);
if (!manifest) bad("missing manifest block");
else {
  const m = manifest[1];
  const need = ["contract_id:", "manifold_version:", "sub_graph:", "read_closure:", "regime:", "model_class:", "sizing_budget_tokens:", "trace:"];
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

// --- Phase-0 chain: trace + holdout (TCE v2.1 §2.A / Harness E.1/E.7) -------------
// trace: resolves against the cwd (the project root) — specs/plans/<slug>.md
// must exist and contain the named slice heading. This is the same resolution
// lint-spec.mjs's back-reference law performs from the specs/ side; the two
// gates share the convention, not code (no cross-bin imports — each gate
// stands alone).
const traceRaw = text.match(/^\s*trace:\s*(\S+)/m)?.[1];
if (traceRaw && !traceRaw.includes("TEMPLATE_VALUE_REQUIRED")) {
  const [rel, hash] = traceRaw.split("#");
  if (!rel.startsWith("specs/plans/")) {
    bad(`trace must point into specs/plans/ (got "${traceRaw}") — the chain back-reference is law (TCE v2.1 §2.A)`);
  } else if (!existsSync(rel)) {
    bad(`unresolvable trace: ${rel} does not exist (cwd is the project root)`);
  } else if (hash) {
    const plan = readFileSync(rel, "utf8");
    if (!new RegExp(`^###\\s+${hash}:`, "m").test(plan)) {
      bad(`trace names slice ${hash} but ${rel} contains no "### ${hash}:" heading`);
    }
  }
}
// holdout: sits at YAML top level, after the must_haves block (E.1 skeleton
// layout) — required somewhere in the contract, validated here.
const contractId = text.match(/contract_id:\s*(\S+)/)?.[1];
const holdoutRaw = text.match(/^\s*holdout:\s*(\S+)/m)?.[1];
if (!holdoutRaw) bad("missing holdout: pointer (E.7 builder-blind acceptance — a contract without it cannot complete)");
if (holdoutRaw && !holdoutRaw.includes("<")) {
  if (contractId && holdoutRaw !== `.agents/tasks/${contractId}.holdout.md`) {
    bad(`holdout must be .agents/tasks/<contract_id>.holdout.md (got "${holdoutRaw}")`);
  } else if (!existsSync(holdoutRaw)) {
    warn(`holdout file ${holdoutRaw} does not exist yet — authored at review time, builder-blind (E.7); completion is blocked until it runs`);
  }
}

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
  console.error(`\nINVALID — ${violations} violation(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`VALID — contract ${subGraph ? `(sub_graph: ${subGraph})` : ""} conforms to E.1${warnings ? ` (${warnings} warning(s))` : ""}`);
