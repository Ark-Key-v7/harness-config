#!/usr/bin/env node
/**
 * lint-mcp.mjs — WP8 MCP curation gate (v1.2 §2.11 rulings).
 *
 * Validates a project's .pi/.mcp.json:
 * - Only curated servers: every entry must be exact-pinned
 *   (name@x.y.z — never "latest", never a bare package name).
 * - stdio transport is the default: entries use command+args. A "url"
 *   field (HTTP/SSE) is rejected unless --allow-http is passed AND the
 *   entry carries "consumer": naming the second concurrent consumer.
 * - Zero new dependencies on deprecated MCP capabilities: entries must
 *   not declare roots/sampling/logging (MCP 2026-07-28 deprecations).
 * - Empty is valid: { "mcpServers": {} } passes.
 *
 * Usage: node tools/lint-mcp.mjs <path-to-.mcp.json> [--allow-http]
 * Exit 0 = curated. Exit 1 = violations (each printed).
 */

import { existsSync, readFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const ALLOW_HTTP = process.argv.includes("--allow-http");
const FILE = args[0];

let violations = 0;
const bad = (m) => { violations++; console.error(`INVALID | ${m}`); };

if (!FILE || !existsSync(FILE)) {
  console.error("usage: node tools/lint-mcp.mjs <.mcp.json> [--allow-http]");
  process.exit(1);
}

let doc;
try {
  doc = JSON.parse(readFileSync(FILE, "utf8"));
} catch (err) {
  console.error(`INVALID | .mcp.json is not parseable JSON — ${String(err)}`);
  process.exit(1);
}

const servers = doc.mcpServers;
if (servers === undefined || typeof servers !== "object" || servers === null || Array.isArray(servers)) {
  bad('top-level "mcpServers" object is required (empty object is valid)');
} else {
  for (const [name, cfg] of Object.entries(servers)) {
    if (typeof cfg !== "object" || cfg === null) { bad(`server "${name}": entry must be an object`); continue; }

    // Deprecated capabilities (MCP 2026-07-28) — never reintroduced.
    for (const cap of ["roots", "sampling", "logging"]) {
      if (cap in cfg) bad(`server "${name}": declares deprecated capability "${cap}" (MCP 2026-07-28)`);
    }

    if ("url" in cfg) {
      // HTTP transport — exception path only.
      if (!ALLOW_HTTP) bad(`server "${name}": HTTP transport ("url") — stdio is the default; pass --allow-http only with a named second consumer`);
      if (!("consumer" in cfg)) bad(`server "${name}": HTTP transport requires "consumer" naming the second concurrent consumer`);
      continue;
    }

    // stdio entry: command + args.
    if (typeof cfg.command !== "string" || cfg.command.length === 0) {
      bad(`server "${name}": stdio entries require "command"`);
      continue;
    }
    const argv = Array.isArray(cfg.args) ? cfg.args : [];

    // Pin check: package specs launched via npx/uvx must be exact.
    const pinIdx = argv.findIndex((a) => a === "-y" || a === "--yes");
    const specIdx = ["npx", "uvx"].includes(cfg.command) ? pinIdx + 1 : -1;
    if (specIdx > 0) {
      const spec = argv[specIdx];
      if (typeof spec !== "string" || spec.length === 0) {
        bad(`server "${name}": ${cfg.command} launch has no package spec`);
      } else if (spec.startsWith("-")) {
        bad(`server "${name}": cannot locate package spec after flags in ${cfg.command} args — pin it explicitly`);
      } else {
        // Accept scoped (@org/pkg@1.2.3) and plain (pkg@1.2.3); reject bare, latest, ranges, tags.
        const bare = spec.replace(/^@[^/@]+\//, "");
        if (!/^[^/@]+@\d+\.\d+\.\d+(-[\w.]+)?$/.test(bare)) {
          bad(`server "${name}": "${spec}" is not exact-pinned (need name@x.y.z — never "latest", never bare)`);
        }
      }
    } else if (["npx", "uvx"].includes(cfg.command)) {
      bad(`server "${name}": ${cfg.command} entry lacks a package spec to pin`);
    }
  }
}

if (violations > 0) {
  console.error(`\nINVALID — ${violations} violation(s)`);
  process.exit(1);
}
const count = servers ? Object.keys(servers).length : 0;
console.log(`CURATED — ${count} server(s), all pinned and compliant (empty is valid)`);
