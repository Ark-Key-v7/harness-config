#!/usr/bin/env node
/**
 * contract-scope.mjs — WP7/WP2 bridge: resolve a Task Contract to a scope file.
 *
 * Reads the contract's manifest.sub_graph, resolves it against gravity.md's
 * Sub-Graph Registry (the single source of truth), and emits the resolved
 * .pi/scope.json that the WP2 sandbox guard enforces:
 *
 *   { "contract": <contract_id>, "write": <write_scope>, "read": <read_scope> }
 *
 * Fails closed: unregistered sub-graph, missing registry, malformed file —
 * all exit 1. The guard reads only this resolved artifact (WP2 design).
 *
 * Usage: node bin/contract-scope.mjs --contract <task.md> --gravity <.tmd/gravity.md> --out <.pi/scope.json>
 * Exit 0 = scope written. Exit 1 = resolution failed (nothing written).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

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
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(scope, null, 2) + "\n");
console.log(`scope resolved: ${contractId} → ${subGraph} (write: ${node.write.length} globs, read: ${node.read.length} globs)`);
