#!/usr/bin/env node
/**
 * token-usage.mjs — WP-F tooling harvest (jsmastery-pro/skills @ 43b69e44,
 * scripts/analyze-token-usage.mjs cost-weight model, ported to both rig seats).
 *
 * Sources (verified on-machine 2026-09-21):
 * - ZCode seat: ~/.zcode/cli/rollout/model-io-sess_*.jsonl — one line per
 *   model I/O request; usage objects appear in two shapes (Anthropic-style
 *   snake_case and camelCase with totalTokens). Files named *subagent_* are
 *   sidechain (subagent) transcripts — reported separately, same as JSM's
 *   caveat that async subagent tokens sit outside the main total.
 * - Pi seat: ~/.pi/agent/sessions/<encoded-cwd>/<ts>_<uuid>.jsonl — typed
 *   events; usage = {input, output, cacheRead, cacheWrite, totalTokens}.
 *   The nested `cost` object is money, not tokens — excluded by requiring
 *   a token-count key (totalTokens / input_tokens / inputTokens).
 *
 * Cost weights (JSM's model, unchanged): W = { input 1.0, cacheWrite 1.25,
 * cacheRead 0.1, output 5.0 } — approximate billed-equivalent. Reading:
 * cut OUTPUT and FRESH input first; cache reads are already cheap.
 *
 * Output: pipe-delimited per the AXI standard (structured text over JSON).
 *
 * Usage: node bin/token-usage.mjs [--zcode-dir D] [--pi-dir D]
 *        [--session SUBSTR] [--limit N]   (defaults: both seats, all, 25)
 * Exit 0 = report printed. Exit 1 = no usable transcripts found.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

const W = { fresh: 1.0, cacheWrite: 1.25, cacheRead: 0.1, output: 5.0 };

const args = process.argv.slice(2);
function argOf(flag) {
  const i = args.lastIndexOf(flag); // last occurrence wins — standard CLI override
  return i >= 0 ? args[i + 1] : undefined;
}
const ZCODE_DIR = argOf("--zcode-dir") ?? join(homedir(), ".zcode", "cli", "rollout");
const PI_DIR = argOf("--pi-dir") ?? join(homedir(), ".pi", "agent", "sessions");
const SESSION_FILTER = argOf("--session");
const LIMIT = Number(argOf("--limit") ?? 25);

/** Recursively collect objects that look like token-usage payloads. */
function collectUsage(node, out = []) {
  if (Array.isArray(node)) { for (const n of node) collectUsage(n, out); return out; }
  if (node && typeof node === "object") {
    const isUsage =
      "totalTokens" in node ||
      "input_tokens" in node ||
      ("inputTokens" in node && "totalTokens" in node);
    if (isUsage) { out.push(node); return out; } // do not descend into usage
    for (const v of Object.values(node)) collectUsage(v, out);
  }
  return out;
}

/** Normalize one usage object to { fresh, cacheWrite, cacheRead, output }. */
function normalize(u) {
  if (u.input_tokens !== undefined) {
    const cr = u.cache_read_input_tokens ?? 0;
    const cw = u.cache_creation_input_tokens ?? 0;
    return { fresh: Math.max(0, (u.input_tokens ?? 0) - cr - cw), cacheWrite: cw, cacheRead: cr, output: u.output_tokens ?? 0 };
  }
  if (u.inputTokens !== undefined && u.totalTokens !== undefined) {
    return { fresh: u.inputTokens ?? 0, cacheWrite: u.cacheWriteTokens ?? 0, cacheRead: u.cacheReadTokens ?? 0, output: u.outputTokens ?? 0 };
  }
  // Pi shape: { input, output, cacheRead, cacheWrite, totalTokens }
  return { fresh: u.input ?? 0, cacheWrite: u.cacheWrite ?? 0, cacheRead: u.cacheRead ?? 0, output: u.output ?? 0 };
}

const billed = (t) => W.fresh * t.fresh + W.cacheWrite * t.cacheWrite + W.cacheRead * t.cacheRead + W.output * t.output;
const sum = (a, b) => ({ fresh: a.fresh + b.fresh, cacheWrite: a.cacheWrite + b.cacheWrite, cacheRead: a.cacheRead + b.cacheRead, output: a.output + b.output });
const ZERO = { fresh: 0, cacheWrite: 0, cacheRead: 0, output: 0 };

const sessions = [];

function scanJsonl(file, seat, side) {
  let raw;
  try { raw = readFileSync(file, "utf8"); } catch { return; }
  let acc = ZERO;
  const models = new Set();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    const usages = collectUsage(parsed);
    for (const u of usages) { acc = sum(acc, normalize(u)); if (parsed?.model?.modelId) models.add(parsed.model.modelId); }
    if (parsed?.type === "model_change" && parsed.modelId) models.add(parsed.modelId);
    if (parsed?.request?.body?.model) models.add(parsed.request.body.model);
  }
  if (acc.fresh || acc.output || acc.cacheRead || acc.cacheWrite) {
    sessions.push({ seat, side, session: basename(file), models: [...models].join("+") || "?", ...acc });
  }
}

if (existsSync(ZCODE_DIR)) {
  for (const f of readdirSync(ZCODE_DIR)) {
    if (!/^model-io-sess_.*\.jsonl$/.test(f)) continue;
    if (SESSION_FILTER && !f.includes(SESSION_FILTER)) continue;
    scanJsonl(join(ZCODE_DIR, f), "zcode", f.includes("subagent") ? "subagent" : "main");
  }
}
if (existsSync(PI_DIR)) {
  for (const d of readdirSync(PI_DIR)) {
    const dir = join(PI_DIR, d);
    let files = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of files) {
      if (SESSION_FILTER && !f.includes(SESSION_FILTER) && !d.includes(SESSION_FILTER)) continue;
      scanJsonl(join(dir, f), "pi", "main");
    }
  }
}

if (sessions.length === 0) {
  console.error("no usable transcripts found (check --zcode-dir / --pi-dir)");
  process.exit(1);
}

sessions.sort((a, b) => billed(b) - billed(a));
const header = "seat   | side     | billed  | fresh   | cacheW  | cacheR  | output  | models | session";
console.log(header);
console.log("-".repeat(header.length));
let total = ZERO;
for (const s of sessions.slice(0, LIMIT)) {
  const n = (x) => String(Math.round(x)).padStart(7);
  console.log(`${s.seat.padEnd(6)} | ${s.side.padEnd(8)} | ${n(billed(s))} | ${n(s.fresh)} | ${n(s.cacheWrite)} | ${n(s.cacheRead)} | ${n(s.output)} | ${(s.models || "?").slice(0, 14).padEnd(14)} | ${s.session.slice(0, 48)}`);
}
if (sessions.length > LIMIT) console.log(`… ${sessions.length - LIMIT} more sessions (raise --limit)`);

for (const seat of ["zcode", "pi"]) {
  for (const side of ["main", "subagent"]) {
    const rows = sessions.filter((s) => s.seat === seat && s.side === side);
    if (rows.length === 0) continue;
    const t = rows.reduce(sum, ZERO);
    total = sum(total, t);
    const n = (x) => String(Math.round(x)).padStart(7);
    console.log(`TOTAL  | ${seat}/${side.padEnd(8)} | ${n(billed(t))} | ${n(t.fresh)} | ${n(t.cacheWrite)} | ${n(t.cacheRead)} | ${n(t.output)} | ${rows.length} session(s)`);
  }
}
const n = (x) => String(Math.round(x)).padStart(7);
console.log(`TOTAL  | all seats | ${n(billed(total))} | ${n(total.fresh)} | ${n(total.cacheWrite)} | ${n(total.cacheRead)} | ${n(total.output)} | billed-equivalent, W={in 1.0, cw 1.25, cr 0.1, out 5.0}`);
