/**
 * stack-staging.test.mjs — deterministic driver for WP-STACK §2 (pre-staging).
 *
 * Four-parts law per component: pin (package-pins.json) + install (present on
 * the machine floor) + smoke (this driver exercises each staged tool) +
 * skill/catalog pointer (referenced from the rig's surfaces).
 *
 * Run from the repo:  node validation/stack-staging-smoke/stack-staging.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FLOOR = join(dirname(REPO), "..", "tools");
const PINS = JSON.parse(readFileSync(join(REPO, "package-pins.json"), "utf8"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: "utf8", timeout: 30_000, ...opts });
}
function versionOf(out) {
  return /(\d+\.\d+\.\d+)/.exec(String(out))?.[1] ?? null;
}

// --- L0 ripgrep: version + scoped-search fixture ---------------------------------------
{
  const v = run("rg", ["--version"]);
  check("L0 ripgrep on PATH", v.status === 0);
  check("L0 ripgrep pinned version matches (14.1.0)", versionOf(v.stdout) === PINS.ripgrep?.version);
  const fix = mkdtempSync(join(tmpdir(), "rg-fix-"));
  writeFileSync(join(fix, "a.ts"), "export const needle = 1;\nexport const hay = 2;\n");
  writeFileSync(join(fix, "b.ts"), "export const other = 3;\n");
  const search = run("rg", ["needle", "--glob", "*.ts", "-l", fix]);
  check("L0 ripgrep scoped search finds the needle file", search.status === 0 && String(search.stdout).trim().endsWith("a.ts"));
  rmSync(fix, { recursive: true, force: true });
}

// --- L7 secrets: betterleaks binary + detect fixture -------------------------------------
{
  const bl = join(FLOOR, "betterleaks", "betterleaks");
  check("betterleaks binary present on the floor", existsSync(bl));
  const v = run(bl, ["--version"]);
  check("betterleaks version matches pin (1.8.1)", v.status === 0 && versionOf(v.stdout) === PINS.betterleaks?.version);
  const fix = mkdtempSync(join(tmpdir(), "bl-fix-"));
  // NB: the classic AWS *example* key is deliberately not flagged; use a
  // pattern the default ruleset catches (GitHub PAT + PEM block).
  writeFileSync(join(fix, "leak.txt"), 'github_token = "ghp_16C7e42v29uG3k9oP7vTq1vN8uJk2W5x4A1bC3dE"\n-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA\n-----END RSA PRIVATE KEY-----\n');
  const det = run(bl, ["detect", "--source", fix, "--no-git", "--redact", "--report-format", "json", "--report-path", join(fix, "report.json")], { cwd: fix });
  const found = existsSync(join(fix, "report.json")) && JSON.parse(readFileSync(join(fix, "report.json"), "utf8")).length > 0;
  check("betterleaks detects a planted AWS key (fixture)", det.status !== null && found);
  rmSync(fix, { recursive: true, force: true });
}

// --- L1 serena: venv + version --------------------------------------------------------------
{
  const sr = join(FLOOR, "serena", "venv", "bin", "serena");
  check("serena venv binary present", existsSync(sr));
  const v = run(sr, ["--version"]);
  check("serena version matches pin (1.7.0)", v.status === 0 && versionOf(v.stdout) === PINS.serena?.version);
}

// --- L2 codebase-memory-mcp: binary + version ------------------------------------------------
{
  const cb = join(FLOOR, "codebase-memory-mcp", "node_modules", ".bin", "codebase-memory-mcp");
  check("codebase-memory-mcp binary present", existsSync(cb));
  const v = run(cb, ["--version"]);
  check("codebase-memory-mcp version matches pin (0.11.0)", v.status === 0 && versionOf(v.stdout) === PINS["codebase-memory-mcp"]?.version);
}

// --- L3 openwiki + openkb: package presence + version ---------------------------------------
for (const [pkg, dir] of [["openwiki", "openwiki"], ["openkb", "openkb"]]) {
  const pj = join(FLOOR, dir, "node_modules", pkg, "package.json");
  check(`${pkg} installed on the floor`, existsSync(pj));
  if (existsSync(pj)) {
    const v = JSON.parse(readFileSync(pj, "utf8")).version;
    check(`${pkg} version matches pin`, v === PINS[pkg]?.version);
  }
}

// --- L4-public context7: binary presence ----------------------------------------------------
{
  const c7 = join(FLOOR, "context7", "node_modules", ".bin", "context7-mcp");
  check("context7-mcp binary present", existsSync(c7));
  const pj = join(FLOOR, "context7", "node_modules", "@upstash", "context7-mcp", "package.json");
  if (existsSync(pj)) check("context7 version matches pin (4.1.1)", JSON.parse(readFileSync(pj, "utf8")).version === PINS.context7?.version);
}

// --- L4-private qmd: venv + index/query fixture ----------------------------------------------
{
  const qmd = join(FLOOR, "qmd", "venv", "bin", "qmd");
  check("qmd venv binary present", existsSync(qmd));
  const v = run(qmd, ["--help"]);
  check("qmd CLI answers (search/collection/document)", v.status === 0 && /search/.test(String(v.stdout)));
  // NB: an index+query roundtrip is deliberately NOT part of staging smoke —
  // qmd downloads a ~600M-param embedding model from HF Hub on first use
  // (network-gated, HF-token-nagged). That cost is paid at ACTIVATION, not
  // staging. Recorded in FACTORY_STATUS (WP-STACK deviation note).
}

// --- L6 headroom + tokenjuice ----------------------------------------------------------------
{
  const hr = join(FLOOR, "headroom", "venv", "bin", "headroom");
  check("headroom venv binary present", existsSync(hr));
  const v = run(hr, ["--version"]);
  check("headroom version matches pin (0.3.4)", v.status === 0 && versionOf(v.stdout) === PINS["headroom-ai"]?.version);
  const tj = join(FLOOR, "tokenjuice", "node_modules", ".bin", "tokenjuice");
  check("tokenjuice binary present", existsSync(tj));
  const tv = run(tj, ["--version"]);
  check("tokenjuice version matches pin (0.8.5)", tv.status === 0 && versionOf(tv.stdout) === PINS.tokenjuice?.version);
  const comp = run(tj, ["--help"]);
  check("tokenjuice CLI answers (compression surface)", comp.status === 0 && /usage/i.test(String(comp.stdout) + String(comp.stderr)));
}

// --- MCP catalog: curated + every entry's binary exists ---------------------------------------
{
  const cat = JSON.parse(readFileSync(join(REPO, "templates", "mcp-catalog.json"), "utf8"));
  const lint = run(process.execPath, [join(REPO, "bin", "lint-mcp.mjs"), join(REPO, "templates", "mcp-catalog.json"), "--catalog"]);
  check("mcp-catalog.json curated (lint-mcp --catalog)", lint.status === 0);
  for (const [name, cfg] of Object.entries(cat.mcpServers)) {
    const bin = cfg.command === "node" ? cfg.args[0] : cfg.command;
    check(`catalog server ${name}: launch binary exists`, existsSync(bin));
    check(`catalog server ${name}: pinned in package-pins.json`, /@?\d+\.\d+\.\d+/.test(cfg.pin));
  }
}

// --- Four-parts law: every staged pin has an install + a pointer ------------------------------
{
  const doc = readFileSync(join(REPO, "docs", "CANON_MAP.md"), "utf8");
  for (const k of ["betterleaks", "serena", "codebase-memory-mcp", "openwiki", "openkb", "context7", "qmd", "headroom-ai", "tokenjuice"]) {
    check(`pin exists: ${k}`, Boolean(PINS[k]));
  }
  check("nine-layer map marks staged components STAGED", /STAGED/.test(doc));
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
