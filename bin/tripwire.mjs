#!/usr/bin/env node
/**
 * tripwire.mjs — holdout-leak detection (Harness v1.3 E.7 / §5.10).
 *
 * Canon: holdout files are builder-blind — read-denied to the worker seat
 * (contract-scope emits the deny; the guard enforces). The tripwire detects
 * leaks AFTER the fact: provenance-based, not trust-based. A file tracked
 * in git before the run is not evidence; an UNTRACKED or WORKER-MODIFIED
 * file whose content matches a holdout's scenario signatures (the then:
 * clauses of .agents/tasks/*.holdout.md, normalized) is a LEAK.
 *
 * On a leak: the finding is printed verbatim, the worktree's STATE.md
 * records failure_class: holdout_leak (when STATE.md exists), exit 1.
 * No leak → exit 0.
 *
 * Usage: node bin/tripwire.mjs [--target <proj>]
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = resolve(arg("--target") ?? process.cwd());

const MIN_SIGNATURE = 20; // normalized chars — below this a then-clause is too weak to be evidence

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

// --- 1. Collect holdout signatures ------------------------------------------------
const tasksDir = join(TARGET, ".agents", "tasks");
const signatures = []; // { holdout, clause }
if (existsSync(tasksDir)) {
  for (const f of readdirSync(tasksDir).filter((f) => f.endsWith(".holdout.md"))) {
    const text = readFileSync(join(tasksDir, f), "utf8");
    for (const m of text.matchAll(/^\s*then:\s*(.+)$/gm)) {
      const raw = m[1].replace(/^\[|\]$/g, "").replace(/["']/g, "");
      for (const part of raw.split(/,(?=\s*[a-z])/i)) {
        const sig = normalize(part);
        if (sig.length >= MIN_SIGNATURE) signatures.push({ holdout: f, clause: sig });
      }
    }
  }
}
if (signatures.length === 0) {
  console.log(`TRIPWIRE CLEAN — no holdout signatures in ${tasksDir} (nothing to detect)`);
  process.exit(0);
}

// --- 2. Provenance: which files are untracked or worker-modified? -------------------
// git status --porcelain=v1: "??" untracked, " M"/"M " modified. A clean,
// pre-run tracked file is not evidence.
const git = spawnSync("git", ["-C", TARGET, "status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" });
if (git.error || (git.status ?? 1) !== 0) {
  console.error(`TRIPWIRE FAIL-CLOSED: cannot establish provenance (git status failed in ${TARGET}: ${String(git.stderr ?? git.error?.message).trim()}) — provenance-based detection requires the ledger of record`);
  process.exit(1);
}
const suspects = [];
for (const line of String(git.stdout ?? "").split("\n")) {
  if (!line.trim()) continue;
  const code = line.slice(0, 2);
  const path = line.slice(3).trim().replace(/^"(.*)"$/, "$1");
  if (code === "??" || code.includes("M") || code.includes("A")) {
    if (path.endsWith(".holdout.md")) continue; // the holdout itself is not a leak
    suspects.push(path);
  }
}

// --- 3. Scan suspects for signatures -------------------------------------------------
const findings = [];
for (const rel of suspects) {
  const p = join(TARGET, rel);
  if (!existsSync(p)) continue;
  let content;
  try {
    content = normalize(readFileSync(p, "utf8"));
  } catch {
    continue; // binary/unreadable — not evidence this pass
  }
  for (const s of signatures) {
    if (content.includes(s.clause)) {
      findings.push({ file: rel, holdout: s.holdout, clause: s.clause });
    }
  }
}

if (findings.length === 0) {
  console.log(`TRIPWIRE CLEAN — ${suspects.length} untracked/modified file(s), ${signatures.length} signature(s), no matches`);
  process.exit(0);
}

// --- 4. Leak: report + STATE.md failure_class + exit 1 --------------------------------
console.error("HOLDOUT LEAK DETECTED (E.7) — holdout-shaped content in worker-authored artifacts:");
for (const f of findings) {
  console.error(`  LEAK | ${f.file} matches then-clause of ${f.holdout}: "${f.clause}"`);
}
const statePath = join(TARGET, "STATE.md");
if (existsSync(statePath)) {
  let st = readFileSync(statePath, "utf8");
  if (/^failure_class:\s*null/m.test(st)) {
    st = st.replace(/^failure_class:\s*null.*$/m, "failure_class: holdout_leak");
    writeFileSync(statePath, st);
    console.error(`  STATE.md updated: failure_class: holdout_leak`);
  } else {
    console.error(`  STATE.md failure_class already set — recorded in findings above (never overwrite a verdict)`);
  }
} else {
  console.error(`  (no STATE.md at worktree root — the escalation stands on this output alone)`);
}
console.error(`  Escalate per §4.7: needs_human + proposed answer. The holdout is compromised — re-author it before it can prove anything.`);
process.exit(1);
