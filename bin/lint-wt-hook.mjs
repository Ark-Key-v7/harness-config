#!/usr/bin/env node
/**
 * lint-wt-hook.mjs — WP9 wt.toml post-create hook contract validator.
 *
 * Canon (Appendix §5, binding):
 *   (1) on_failure is ALWAYS abort — no warn-and-continue mode.
 *   (2) Order is contractual: dependency restoration → STATE.md genesis →
 *       mount injection → pre-flight assertion → (only then) agent boot.
 *   (3) Every abort emits SPAWN_ABORT to the trace ledger (the assert block
 *       must carry on_failure = "abort"; emission is the runtime's duty).
 *   (4) The assertion list is APPEND-ONLY per project — with --base, every
 *       assert name in the base file must still be present.
 *
 * Usage: node bin/lint-wt-hook.mjs <wt.toml> [--base <previous wt.toml>]
 * Exit 0 = contract satisfied. Exit 1 = violations (each printed).
 */

import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const bIdx = process.argv.indexOf("--base");
const BASE = bIdx >= 0 ? process.argv[bIdx + 1] : null;
const FILE = args[0] && args[0] !== BASE ? args[0] : null;

let violations = 0;
const bad = (m) => { violations++; console.error(`INVALID | ${m}`); };

if (!FILE || !existsSync(FILE)) {
  console.error("usage: node bin/lint-wt-hook.mjs <wt.toml> [--base <previous>]");
  process.exit(1);
}
const text = readFileSync(FILE, "utf8");

// --- Section presence + contractual order -----------------------------------------
const iRun = text.search(/^\[hooks\.post_create\]\s*$/m);
const iInject = text.search(/^\[\[hooks\.post_create\.inject\]\]\s*$/m);
const iMount = text.search(/^\[\[hooks\.post_create\.mount\]\]\s*$/m);
const iAssert = text.search(/^\[\[hooks\.post_create\.assert\]\]\s*$/m);

if (iRun < 0) bad("missing [hooks.post_create] (dependency restoration)");
if (iInject < 0) bad("missing [[hooks.post_create.inject]] — STATE.md genesis is not optional");
if (iMount < 0) bad("missing [[hooks.post_create.mount]] — sandbox mount injection");
if (iAssert < 0) bad("missing [[hooks.post_create.assert]] — fail-closed pre-flight assertion");

if (iRun >= 0 && iInject >= 0 && iMount >= 0 && iAssert >= 0) {
  if (!(iRun < iInject && iInject < iMount && iMount < iAssert)) {
    bad("contractual order violated — must be: post_create → inject → mount → assert");
  }
}

// --- Genesis block shape -------------------------------------------------------------
if (iInject >= 0) {
  if (!/artifact\s*=\s*"STATE\.md"/.test(text)) bad('inject block must declare artifact = "STATE.md"');
  if (!/from_schema\s*=\s*"[^"]*state\.schema\.yaml"/.test(text)) bad("inject block must generate from_schema state.schema.yaml (E.2)");
  if (!/to\s*=\s*"\$\{WORKTREE_ROOT\}\/STATE\.md"/.test(text)) bad("STATE.md must be generated at ${WORKTREE_ROOT}/STATE.md — the per-worktree root");
}

// --- Rule (1): on_failure is always abort ----------------------------------------------
const onFailures = [...text.matchAll(/on_failure\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
if (onFailures.length === 0) bad('no on_failure declared — the pre-flight assertion must carry on_failure = "abort"');
for (const v of onFailures) {
  if (v !== "abort") bad(`on_failure = "${v}" — there is no warn-and-continue mode; only "abort" is lawful`);
}

// --- The visibility assertion is irreducible ----------------------------------------------
if (!/name\s*=\s*"worktree_visible_in_sandbox"/.test(text)) {
  bad('the "worktree_visible_in_sandbox" assertion is missing — teams may add checks, never remove this one');
}
if (!/test\s+-f\s+\/workspace\/\$\{TASK_CONTRACT_PATH\}\s*&&\s*test\s+-f\s+\/workspace\/STATE\.md/.test(text)) {
  bad("the visibility assertion must test BOTH the task contract and STATE.md inside the mount");
}

// --- Rule (4): append-only vs base -----------------------------------------------------------
if (BASE) {
  if (!existsSync(BASE)) bad(`base file not found: ${BASE}`);
  else {
    const baseText = readFileSync(BASE, "utf8");
    const names = (t) => [...t.matchAll(/\[\[hooks\.post_create\.assert\]\]\s*\n\s*name\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
    const oldNames = names(baseText);
    const newNames = names(text);
    for (const n of oldNames) {
      if (!newNames.includes(n)) bad(`append-only violation: assertion "${n}" existed in the base contract and may not be removed`);
    }
  }
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
console.log(`VALID — wt.toml post-create hook contract satisfied (fail-closed, append-only)`);
