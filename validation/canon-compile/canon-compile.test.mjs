/**
 * canon-compile.test.mjs — deterministic driver for WP-C2 §9 (Canon Compiler).
 *
 * Positive: the shipped templates + fixtures pass all nine checks.
 * Negative: ten-law rules.md, undeclared ${...} variable, legacy
 * ${TASK_CONTRACT} key, stale stack term (Qodo), dangling §D.N reference,
 * and a Zone C entry missing derived_from (lint-tmd composition) — each FAIL.
 *
 * Run from the repo:  node validation/canon-compile/canon-compile.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function compile(root, allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(REPO, "bin", "canon-compile.mjs"), root], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

function makeTree() {
  const root = mkdtempSync(join(tmpdir(), "cc-fix-"));
  mkdirSync(join(root, "bin"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });
  cpSync(join(REPO, "templates"), join(root, "templates"), { recursive: true });
  cpSync(join(REPO, "bin", "lint-tmd.mjs"), join(root, "bin", "lint-tmd.mjs"));
  cpSync(join(REPO, "docs", "CAPABILITY_REGISTER.md"), join(root, "docs", "CAPABILITY_REGISTER.md"));
  cpSync(join(REPO, "validation", "canon-compile", "fixtures"), join(root, "validation", "canon-compile", "fixtures"), { recursive: true });
  return root;
}

// 1. Shipped repo + fixtures pass
check("shipped templates + fixtures VALID (9 checks)", compile(REPO).code === 0);

// 2. rules.md with only ten laws — FAIL (check 5, law count)
{
  const root = makeTree();
  const p = join(root, "templates", "tmd", "rules.md");
  const t = readFileSync(p, "utf8");
  const cut = t.indexOf("11. **NO CORPSE CODE:");
  writeFileSync(p, t.slice(0, cut).replace("fifteen global negative constraints", "ten global negative constraints"));
  const r = compile(root, true);
  check("ten-law rules.md rejected (law count)", r.code === 1 && r.out.includes("fifteen numbered laws"));
  rmSync(root, { recursive: true, force: true });
}

// 3. Undeclared ${...} variable — FAIL (check 4)
{
  const root = makeTree();
  const p = join(root, "templates", "wt.toml");
  writeFileSync(p, readFileSync(p, "utf8").replace("${SESSION_UUID}", "${MYSTERY_VAR}"));
  const r = compile(root, true);
  check("undeclared variable rejected (inventory)", r.code === 1 && r.out.includes("not declared"));
  rmSync(root, { recursive: true, force: true });
}

// 4. Legacy ${TASK_CONTRACT} key — FAIL (check 4; renders as undeclared)
{
  const root = makeTree();
  const p = join(root, "templates", "wt.toml");
  writeFileSync(p, readFileSync(p, "utf8").replace("${TASK_CONTRACT_PATH}", "${TASK_CONTRACT}"));
  const r = compile(root, true);
  check("legacy ${TASK_CONTRACT} variable rejected", r.code === 1 && r.out.includes("TASK_CONTRACT"));
  rmSync(root, { recursive: true, force: true });
}

// 5. Stale stack term — FAIL (check 6)
{
  const root = makeTree();
  const p = join(root, "templates", "task-contract.md");
  writeFileSync(p, readFileSync(p, "utf8") + "\nReview with Qodo.\n");
  const r = compile(root, true);
  check("stale term Qodo rejected (denylist)", r.code === 1 && r.out.includes("Qodo"));
  rmSync(root, { recursive: true, force: true });
}

// 6. Dangling §D.N reference in docs — FAIL (check 7)
{
  const root = makeTree();
  const p = join(root, "docs", "CAPABILITY_REGISTER.md");
  writeFileSync(p, readFileSync(p, "utf8") + "\nSee register §D.99 for details.\n");
  const r = compile(root, true);
  check("dangling §D.99 cross-reference rejected", r.code === 1 && r.out.includes("§D.99"));
  rmSync(root, { recursive: true, force: true });
}

// 7. Zone C entry missing derived_from — FAIL via lint-tmd composition (WP-C2 §3.3)
{
  const root = makeTree();
  const p = join(root, "templates", "tmd", "glossary.md");
  const t = readFileSync(p, "utf8");
  const anchor = "## ZONE C — PRD-COMPILED ENTRIES (provenance mandatory)";
  writeFileSync(p, t.replace(anchor, anchor + '\n\n- term: "Broken"\n  definition: "no provenance"\n'));
  let out = "";
  try {
    out = execFileSync(process.execPath, [join(root, "bin", "lint-tmd.mjs"), join(root, "templates", "tmd")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    check("Zone C entry missing derived_from rejected (lint-tmd composition)", false);
  } catch (err) {
    out = String(err.stderr ?? "");
    check("Zone C entry missing derived_from rejected (lint-tmd composition)", out.includes("derived_from"));
  }
  rmSync(root, { recursive: true, force: true });
}

// 8. Index regenerated and committed-shape (check 8)
{
  compile(REPO);
  const idx = JSON.parse(readFileSync(join(REPO, "validation", "canon-compile", "index.json"), "utf8"));
  check("anchor index regenerated with entries", Object.keys(idx.anchors ?? {}).length > 20);
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
