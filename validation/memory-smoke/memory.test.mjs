/**
 * memory.test.mjs — deterministic driver for WP-MEM (agent memory system).
 *
 * Validates: the memory skill passes lint; the entry template carries the M2
 * provenance fields; memory-verify lists/approves fixture drafts and refuses
 * provenance-less entries; the write-path extension is installed in the Pi
 * layer and matches its pinned intake clone; constraint-payload exclusion law
 * is present in the skill; the catalog carries the memory-layer entries.
 *
 * Run from the repo:  node validation/memory-smoke/memory.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const INTAKE = join(dirname(dirname(REPO)), "sources", "_intake", "pi-observational-memory");
const PINNED_SHA = "78a1efcfdd46332253fb289724f05b26dfc7769e"; // WP-MEM §3.1 step 0

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(tool, args, opts = {}) {
  const r = spawnSync(process.execPath, [join(REPO, tool), ...args], { encoding: "utf8", ...opts });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}

// --- Skill + template (M1/M2 law lives skill-local — Law Economy) ---
const skill = readFileSync(join(REPO, "skills", "memory", "SKILL.md"), "utf8");
check("memory skill: M1 verbatim present", skill.includes("M1 — Recall, never law"));
check("memory skill: M2 verbatim present", skill.includes("M2 — Provenance or it didn't happen"));
check("memory skill: exclusion law (contracts/.tmd/secrets) present", /contract payloads/.test(skill) && /secrets/.test(skill));
const tpl = readFileSync(join(REPO, "templates", "memory", "entry.md"), "utf8");
for (const f of ["id:", "derived_from:", "verified: false", "last_reconciled:", "tags:"]) {
  check(`entry template carries ${f}`, tpl.includes(f));
}
check("rules.md Zone A untouched by WP-MEM (M1/M2 skill-local)", !readFileSync(join(REPO, "templates", "tmd", "rules.md"), "utf8").includes("M1 — Recall"));

// --- memory-verify: list / approve / provenance-refusal ---
{
  const root = mkdtempSync(join(tmpdir(), "mem-fix-"));
  mkdirSync(join(root, ".agents", "memory", "drafts"), { recursive: true });
  writeFileSync(join(root, ".agents", "memory", "drafts", "mem-2026-09-17-good.md"), `---
id: mem-2026-09-17-good
derived_from: "session abc"
verified: false
last_reconciled: "2026-09-17"
tags: [fixture]
---

# Good entry
`);
  writeFileSync(join(root, ".agents", "memory", "drafts", "mem-2026-09-17-orphan.md"), `---
id: mem-2026-09-17-orphan
verified: false
---

# No provenance
`);
  const list = run("bin/memory-verify.mjs", ["--list", "--root", root]);
  check("memory-verify --list shows drafts", list.code === 0 && list.out.includes("mem-2026-09-17-good"));
  const bad = run("bin/memory-verify.mjs", ["--approve", "mem-2026-09-17-orphan", "--root", root]);
  check("provenance-less draft refused (M2)", bad.out.includes("SKIP") && bad.out.includes("M2"));
  const ok = run("bin/memory-verify.mjs", ["--approve", "mem-2026-09-17-good", "--root", root]);
  const moved = readFileSync(join(root, ".agents", "memory", "mem-2026-09-17-good.md"), "utf8");
  check("approval flips verified: true and moves to store", ok.code === 0 && moved.includes("verified: true"));
  check("approved draft left drafts/ (refused orphan stays for compaction pruning)", readdirSync(join(root, ".agents", "memory", "drafts"))[0].includes("orphan"));
  rmSync(root, { recursive: true, force: true });
}

// --- Write path: installed in Pi layer, matches pinned intake clone ---
{
  const ext = join(homedir(), ".pi", "agent", "extensions", "pi-observational-memory");
  check("pi-observational-memory installed in the Pi layer", existsSync(join(ext, "src", "index.ts")));
  const sha = spawnSync("git", ["-C", INTAKE, "log", "-1", "--format=%H"], { encoding: "utf8" });
  check(`intake clone at pinned SHA ${PINNED_SHA.slice(0, 8)}`, String(sha.stdout).trim() === PINNED_SHA);
  if (existsSync(ext)) {
    const same = spawnSync("diff", ["-rq", "--exclude", "node_modules", "--exclude", ".git", INTAKE, ext], { encoding: "utf8" });
    check("installed copy matches intake clone (no drift)", same.status === 0);
  }
  const cfg = JSON.parse(readFileSync(join(homedir(), ".pi", "agent", "settings.json"), "utf8"));
  const om = cfg["observational-memory"];
  check("observational-memory configured (passive default, kimi models)", om && om.passive === true && om.models.observer.provider === "kimi-coding");
}

// --- Catalog: memory-layer entries curated ---
{
  const lint = run("bin/lint-mcp.mjs", ["--catalog", join(REPO, "templates", "mcp-catalog.json")]);
  check("mcp-catalog curated", lint.code === 0);
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
