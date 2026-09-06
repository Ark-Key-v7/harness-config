#!/usr/bin/env node
/**
 * contract-scope.mjs — WP7/WP2 bridge: resolve a Task Contract to a scope file.
 *
 * Reads the contract's manifest.sub_graph, resolves it against gravity.md's
 * Sub-Graph Registry (the single source of truth), and emits the resolved
 * .pi/scope.json that the WP2 sandbox guard enforces:
 *
 *   { "contract": <contract_id>, "write": <write_scope>, "read": <read_scope>,
 *     "read_deny": [<holdout path>] }   // read_deny only when law requires it
 *
 * Holdout read-deny (Harness v1.3 E.7 / §5.10): when the contract manifest
 * carries a holdout: pointer, the holdout file is read-denied to every seat
 * except the reviewer (holdout verification runs against the reviewer seat
 * or CI). The active seat is read from the rig's seat state
 * (~/.pi/agent/seat-state.json, keyed by project root — the parent of the
 * --out .pi/ directory); an absent or unreadable seat state means DENY
 * (fail-closed).
 *
 * Fails closed: unregistered sub-graph, missing registry, malformed file —
 * all exit 1. The guard reads only this resolved artifact (WP2 design).
 *
 * Usage: node bin/contract-scope.mjs --contract <task.md> --gravity <.tmd/gravity.md> --out <.pi/scope.json>
 * Exit 0 = scope written. Exit 1 = resolution failed (nothing written).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
const CONTRACT = arg("--contract");
const GRAVITY = arg("--gravity");
const OUT = arg("--out");

function fail(msg) {
  console.error(`RESOLUTION FAILED: ${msg}`);
  process.exit(1);
}

if (!CONTRACT || !GRAVITY || !OUT) fail("usage: --contract <task.md> --gravity <gravity.md> --out <scope.json>");
if (!existsSync(CONTRACT)) fail(`contract not found: ${CONTRACT}`);
if (!existsSync(GRAVITY)) fail(`gravity not found: ${GRAVITY}`);

const contract = readFileSync(CONTRACT, "utf8");
const contractId = contract.match(/contract_id:\s*(\S+)/)?.[1] ?? fail("contract missing manifest.contract_id");
const subGraph = contract.match(/sub_graph:\s*(\S+)/)?.[1] ?? fail("contract missing manifest.sub_graph");

const gravityRaw = readFileSync(GRAVITY, "utf8");
// Zone B teaches by example inside HTML comments — those blocks are NOT the
// Registry. Strip comments first so resolution reads only the filled Zone C.
const gravity = gravityRaw.replace(/<!--[\s\S]*?-->/g, "");

// Registry blocks: one or more ```yaml subgraphs: blocks; entries merge, last wins.
const blocks = [...gravity.matchAll(/subgraphs:\n([\s\S]*?)(?=\n```|\n#|\n\S)/g)];
if (blocks.length === 0) fail("gravity.md has no subgraphs: registry block (Zone C unfilled?)");

const entries = new Map();
for (const b of blocks) {
  for (const e of b[1].split(/(?:^|\n)\s*-\s*name:\s*/).slice(1)) {
    const name = e.match(/^(\S+)/)?.[1];
    if (name) entries.set(name, e);
  }
}

let node = null;
const e = entries.get(subGraph);
if (e) {
  const write = e.match(/write_scope:\s*\[([^\]]*)\]/)?.[1];
  const read = e.match(/read_scope:\s*\[([^\]]*)\]/)?.[1];
  if (write === undefined || read === undefined) fail(`registry node "${subGraph}" lacks write_scope/read_scope arrays`);
  const parse = (s) => s.split(",").map((x) => x.trim().replace(/^["']|["']$/g, "")).filter((x) => x.length > 0);
  node = { write: parse(write), read: parse(read) };
}
if (!node) fail(`sub_graph "${subGraph}" is not registered in the Sub-Graph Registry`);

const scope = { contract: contractId, write: node.write, read: node.read };

// --- Holdout read-deny (E.7) ------------------------------------------------------
const holdout = contract.match(/^\s*holdout:\s*(\S+)/m)?.[1];
if (holdout && !holdout.includes("<")) {
  const projRoot = dirname(dirname(OUT)); // <proj>/.pi/scope.json → <proj>
  let seat = null;
  try {
    const state = JSON.parse(readFileSync(join(homedir(), ".pi", "agent", "seat-state.json"), "utf8"));
    seat = state?.[projRoot] ?? null;
  } catch { /* absent or unreadable seat state → null → fail-closed deny */ }
  if (seat !== "reviewer") {
    scope.read_deny = [holdout];
    console.log(`holdout read-deny emitted (${holdout}) — seat: ${seat ?? "none (fail-closed)"}; only the reviewer seat reads holdouts`);
  } else {
    console.log(`holdout ${holdout} readable: reviewer seat — verification runs raw (§5.10.3)`);
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(scope, null, 2) + "\n");
console.log(`scope resolved: ${contractId} → ${subGraph} (write: ${node.write.length} globs, read: ${node.read.length} globs)`);
