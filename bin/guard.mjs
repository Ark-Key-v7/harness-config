#!/usr/bin/env node
/**
 * guard.mjs — CI/offline twin of extensions/guard.ts (Harness v1.3 §5.10.1).
 *
 * Tests the paths a change touches against THE protected list
 * (bin/guard-list.mjs — the single source; the harness extension imports
 * the same file, so code and CI never drift).
 *
 * Input: `git diff --name-only` output — either produced by this tool
 * (--target, --staged) or piped on stdin (`--paths -`).
 *
 * Exit 2 = protected-path violation (each printed, law named).
 * Exit 1 = FAIL CLOSED: the diff could not be determined (git error, not a
 *          repo, empty stdin with --paths -). Undeterminable = denied.
 * Exit 0 = clean (zero changed paths is clean — nothing was written).
 *
 * Bar checks (WP-D-3 §6.1 harvest — guard-the-bar five diff checks from
 * agent-skills constraint-driven-development): in --target mode the guard
 * additionally inspects the CONTENT diff (git diff -U0) for the five known
 * ways a quality bar gets quietly moved:
 *   1. threshold-moved    numeric floor decreased in .agents/floor.json or
 *                         CONSTRAINTS.md Bars table (FAIL, unless the same
 *                         diff records the ratified lowering — a
 *                         `ratified_lower` history entry or a CONSTRAINTS.md
 *                         change-log row; canon §5.10.2 allows ratified
 *                         lowering, and the guard must not contradict it)
 *   2. test-got-easier    assertions deleted/weakened in test files
 *                         (strict matcher replaced by loose, or net expect()
 *                         count drop) without the operator waiver marker
 *                         (`waiver:` / `RATIFIED` in the diff, or a dated
 *                         CONSTRAINTS.md exception row) (FAIL)
 *   3. checker-silenced   suppression comment added (@ts-ignore,
 *                         @ts-nocheck, eslint-disable, noqa) or a CI check
 *                         step removed, without a dated CONSTRAINTS.md
 *                         exception row (FAIL)
 *   4. work-unfinished    TODO/FIXME/not-implemented/stub-skip markers added
 *                         (WARN, counted in the report)
 *   5. exception-appeared new CONSTRAINTS.md exception row without an expiry
 *                         date ≤ 90 days out (FAIL)
 * In --paths - mode only path names are available; bar checks need content
 * and are skipped there (path protection still applies).
 *
 * Usage:
 *   node bin/guard.mjs --target <repo> [--staged]
 *   git diff --name-only | node bin/guard.mjs --paths -
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkPath } from "./guard-list.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

function arg(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : null;
}
const TARGET = arg("--target");
const PATHS_FROM_STDIN = arg("--paths") === "-";
const STAGED = process.argv.includes("--staged");

function failClosed(msg) {
  console.error(`GUARD FAIL-CLOSED (§5.10.1): ${msg} — undeterminable = denied.`);
  process.exit(1);
}

let paths;
if (PATHS_FROM_STDIN) {
  let raw;
  try {
    raw = readFileSync(0, "utf8"); // fd 0 = stdin
  } catch (e) {
    failClosed(`could not read paths from stdin: ${e.message}`);
  }
  if (!raw.trim()) failClosed("empty path list on stdin — the diff could not be determined");
  paths = raw.split("\n").map((s) => s.trim()).filter(Boolean);
} else if (TARGET) {
  const repo = resolve(TARGET);
  const args = ["-C", repo, "diff", "--name-only"];
  if (STAGED) args.push("--cached");
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.error || (r.status ?? 1) !== 0) {
    failClosed(`git diff failed in ${repo}: ${r.error?.message ?? String(r.stderr ?? "").trim()}`);
  }
  paths = String(r.stdout ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
} else {
  failClosed("usage: node bin/guard.mjs --target <repo> [--staged] | --paths - (paths on stdin)");
}

let violations = 0;
for (const p of paths) {
  const rel = p.replaceAll("\\", "/");
  const hit = checkPath(rel);
  if (hit.protected) {
    violations++;
    console.error(`VIOLATION | ${rel} — ${hit.label}`);
  }
}

// --- Bar checks (WP-D-3 §6.1): content-level diff inspection --------------
// Only in --target mode: --paths - carries names only, no content.
const barFails = [];
const barWarns = [];

if (TARGET) {
  const repo = resolve(TARGET);
  const args = ["-C", repo, "diff", "-U0"];
  if (STAGED) args.push("--cached");
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.error || (r.status ?? 1) !== 0) {
    failClosed(`git content diff failed in ${repo}: ${r.error?.message ?? String(r.stderr ?? "").trim()}`);
  }

  /** Parse `git diff -U0` into [{ path, added: string[], removed: string[] }]. */
  const files = [];
  {
    let cur = null;
    for (const line of String(r.stdout ?? "").split("\n")) {
      if (line.startsWith("+++ ")) {
        const p = line.slice(4).replace(/^b\//, "").trim();
        cur = { path: p, added: [], removed: [] };
        files.push(cur);
      } else if (cur && line.startsWith("+") && !line.startsWith("+++")) {
        cur.added.push(line.slice(1));
      } else if (cur && line.startsWith("-") && !line.startsWith("---")) {
        cur.removed.push(line.slice(1));
      }
    }
  }

  const DAY = 24 * 60 * 60 * 1000;
  const iso = (d) => d.toISOString().slice(0, 10);
  const today = new Date();

  const isTestFile = (p) => /(^|\/)(test|tests|__tests__)\//.test(p) || /\.(test|spec)\.[a-z]+$/.test(p) || /_(test|spec)\.[a-z]+$/.test(p);
  const isCodeFile = (p) => /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|rb|php|cs|cpp|c|h|swift)$/.test(p);

  // Shared waiver evidence across rules: an operator marker in the diff, or
  // a dated exception row added to CONSTRAINTS.md in this same diff.
  const anyWaiverMarker = files.some((f) => f.added.some((l) => /waiver:|RATIFIED/i.test(l)));
  const DATE_RE = /\d{4}-\d{2}-\d{2}/g;

  // Exception rows live in the "## Exceptions" SECTION — added table rows
  // elsewhere in CONSTRAINTS.md (Bars, Change Log) are not exceptions.
  // With -U0 the diff carries no context, so section membership is resolved
  // against the post-image file (worktree, or the index under --staged).
  const constraintsPaths = files
    .map((f) => f.path)
    .filter((p) => /(^|\/)CONSTRAINTS\.md$/.test(p));
  const constraintsPost = new Map(); // path → exceptions-section table rows
  for (const p of constraintsPaths) {
    let content = null;
    if (STAGED) {
      const fromIndex = spawnSync("git", ["-C", repo, "show", `:${p}`], { encoding: "utf8" });
      if (!fromIndex.error && (fromIndex.status ?? 1) === 0) content = String(fromIndex.stdout ?? "");
    }
    if (content === null) {
      try {
        content = readFileSync(join(repo, p), "utf8");
      } catch {
        continue;
      }
    }
    const section = content.split(/^## /m).find((s) => /^Exceptions\b/m.test(s));
    if (!section) continue;
    constraintsPost.set(
      p,
      section
        .split("\n")
        .filter((l) => /^\s*\|/.test(l) && !/^\s*\|[-\s|]*$/.test(l) && !/Exception\s*\|\s*Reason/.test(l))
    );
  }
  const isExceptionRow = (path, line) =>
    constraintsPost.get(path)?.some((row) => row.trim() === line.trim()) ?? false;
  const byFile = new Map(files.map((f) => [f.path, f]));
  const newExceptionRows = (p) => (byFile.get(p)?.added ?? []).filter((l) => isExceptionRow(p, l));
  const datedExceptionAdded = [...constraintsPost.keys()].some(
    (p) => newExceptionRows(p).some((l) => (l.match(DATE_RE) ?? []).length >= 2)
  );

  const nums = (l) => [...l.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const prefixOf = (l) => l.replace(/-?\d+(?:\.\d+)?/g, "#");

  for (const f of files) {
    // 1. threshold-moved — a numeric floor decreased under the same prefix.
    if (/\.agents\/floor\.json$/.test(f.path) || /(^|\/)CONSTRAINTS\.md$/.test(f.path)) {
      const addedPrefixes = f.added.map(prefixOf);
      for (const rm of f.removed) {
        const rn = nums(rm);
        if (rn.length === 0) continue;
        const rp = prefixOf(rm);
        for (let i = 0; i < addedPrefixes.length; i++) {
          if (addedPrefixes[i] !== rp) continue;
          const an = nums(f.added[i]);
          if (an.length !== rn.length) continue;
          for (let k = 0; k < rn.length; k++) {
            if (an[k] < rn[k]) {
              const ratified = /ratified_lower/i.test(rp)
                ? f.added.some((l) => /ratified_lower/.test(l))
                : datedExceptionAdded;
              if (!ratified) {
                barFails.push(`threshold-moved | ${f.path}: floor ${rn[k]} → ${an[k]} under "${rp.trim().slice(0, 60)}" (lowering requires a recorded ratification)`);
              }
            }
          }
        }
      }
    }

    // 2. test-got-easier — assertion deleted or weakened without waiver.
    if (isTestFile(f.path)) {
      const expectCount = (ls) => ls.filter((l) => /\bexpect\s*\(/.test(l)).length;
      const STRICT = /\.(toBe|toEqual|toStrictEqual|toBeCloseTo|toContain|toMatchObject|toHaveLength|toThrow)\(/;
      const LOOSE = /\.(toBeTruthy|toBeDefined|toBeNull|toBeUndefined|toBeGreaterThan|toBeLessThan)\(/;
      const weakened = f.removed.some((rm) => STRICT.test(rm) && f.added.some((ad) => LOOSE.test(ad)));
      const lost = expectCount(f.removed) > expectCount(f.added);
      if ((weakened || lost) && !anyWaiverMarker && !datedExceptionAdded) {
        barFails.push(`test-got-easier | ${f.path}: ${weakened ? "strict assertion replaced by loose matcher" : "net assertion count dropped"} without operator waiver`);
      }
    }

    // 3. checker-silenced — suppression added, or a CI check step removed.
    if (isCodeFile(f.path)) {
      const suppressed = f.added.some((l) => /@ts-ignore|@ts-nocheck|eslint-disable|#\s*noqa/.test(l));
      if (suppressed && !datedExceptionAdded) {
        barFails.push(`checker-silenced | ${f.path}: suppression comment added without a dated CONSTRAINTS.md exception row`);
      }
    }
    if (/\.(yml|yaml)$/.test(f.path) && /(^|\.github\/|ci\/|\.gitlab)/i.test(f.path)) {
      const step = /run:\s*.*(eslint|tsc\b|typecheck|pytest|jest|vitest|npm test|npm run lint|semgrep)/i;
      const removed = f.removed.filter((l) => step.test(l)).length;
      const added = f.added.filter((l) => step.test(l)).length;
      if (removed > added) {
        barFails.push(`checker-silenced | ${f.path}: CI check step removed (${removed - added} step(s))`);
      }
    }

    // 4. work-unfinished — markers added (WARN, counted).
    if (isCodeFile(f.path)) {
      const markers = f.added.filter((l) => /\bTODO\b|\bFIXME\b|not implemented|it\.skip\(|describe\.skip\(|test\.skip\(|xit\(|xdescribe\(/.test(l));
      for (const m of markers) {
        barWarns.push(`work-unfinished | ${f.path}: ${m.trim().slice(0, 80)}`);
      }
    }

    // 5. exception-appeared — new exception row without expiry ≤ 90 days.
    if (constraintsPost.has(f.path)) {
      for (const row of newExceptionRows(f.path)) {
        if (/\(\s*none\s*\)/i.test(row)) continue; // template's empty row
        const dates = row.match(DATE_RE) ?? [];
        const expiry = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;
        if (!expiry || !(expiry > today) || expiry - today > 90 * DAY) {
          barFails.push(`exception-appeared | ${f.path}: new exception row lacks an expiry date ≤ 90 days out — "${row.trim().slice(0, 80)}"`);
        }
      }
    }
  }

  for (const w of barWarns) console.log(`BAR WARN  | ${w}`);
  for (const b of barFails) console.error(`BAR FAIL  | ${b}`);
}

violations += barFails.length;

if (violations > 0) {
  console.error(`\nGUARD VIOLATION — ${violations} protected path/bar violation(s) in this change (§5.10.1). The list lives in code (bin/guard-list.mjs); changing it is a §5.4-ratified rig-change.`);
  process.exit(2);
}
const warnNote = barWarns.length > 0 ? `; bar: ${barWarns.length} work-unfinished warning(s)` : "";
console.log(`GUARD CLEAN — ${paths.length} changed path(s), none protected${warnNote}`);
process.exit(0);
