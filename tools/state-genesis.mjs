#!/usr/bin/env node
/**
 * state-genesis.mjs — WP9 STATE.md genesis (wt.toml hook step 2 instrument).
 *
 * Canon: STATE.md "is created at the root of each Worktrunk by the
 * post-create spawn hook" (Appendix §4.2). Where the engine lacks a native
 * inject facility, this tool performs genesis: it reads
 * .agents/schemas/state.schema.yaml and fills the identity fields for one
 * execution thread.
 *
 * The schema's law keys (status, position, resolved_invariants, …) pass
 * through untouched — genesis fills identity, never pre-fills resolution.
 *
 * Usage:
 *   node tools/state-genesis.mjs --schema .agents/schemas/state.schema.yaml \
 *     --contract task-auth.md --contract-id task-auth-session-crud \
 *     --worktree /abs/path --branch feat/auth --out STATE.md
 *
 * Exit 0 = STATE.md written (validated by lint-state before writing).
 * Exit 1 = any input missing or the generated state fails its own lint.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
const SCHEMA = arg("--schema");
const CONTRACT = arg("--contract");
const CONTRACT_ID = arg("--contract-id");
const WORKTREE = arg("--worktree");
const BRANCH = arg("--branch");
const OUT = arg("--out");

function fail(msg) {
  console.error(`GENESIS FAILED: ${msg}`);
  process.exit(1);
}

if (!SCHEMA || !CONTRACT || !CONTRACT_ID || !WORKTREE || !BRANCH || !OUT) {
  fail("usage: --schema --contract --contract-id --worktree --branch --out (all required)");
}
if (!existsSync(SCHEMA)) fail(`schema not found: ${SCHEMA}`);
if (!WORKTREE.startsWith("/")) fail("worktree path must be absolute");

let doc = readFileSync(SCHEMA, "utf8");

const fill = (key, value) => {
  const re = new RegExp(`^${key}: null(\\s*#.*)?$`, "m");
  if (!re.test(doc)) fail(`schema key "${key}" is not in its genesis form ("${key}: null")`);
  doc = doc.replace(re, `${key}: ${value}`);
};

fill("session_id", randomUUID());
fill("run_id", randomUUID());
fill("task_contract", CONTRACT);
fill("contract_id", CONTRACT_ID);
fill("worktrunk_path", WORKTREE);
fill("branch", BRANCH);

// Genesis emits only a state that passes its own validator (fail-closed).
writeFileSync(OUT, doc);
try {
  execFileSync(process.execPath, [join(HERE, "lint-state.mjs"), OUT], { stdio: ["ignore", "pipe", "pipe"] });
} catch (err) {
  console.error(`GENESIS FAILED: generated STATE.md failed lint-state — ${String(err.stderr ?? err)}`);
  process.exit(1);
}
console.log(`STATE.md genesis complete: ${OUT} (session bound to contract ${CONTRACT_ID})`);
