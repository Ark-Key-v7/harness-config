/**
 * merge-completeness.test.mjs — WP-F §8.1 anti-truncation gate.
 *
 * For every retiring skill, EVERY section must be accounted for in its
 * absorbing seat before the folder may be deleted. Mechanical check: each
 * mapped keyphrase (a load-bearing line of the retired section) must be
 * present in the named absorber file. A retiring folder may be deleted only
 * when this driver exits 0. Post-deletion, skills-smoke asserts absence.
 *
 * Accounting map provenance: headers extracted from the pre-merge tree at
 * WP-F Phase 2 (git 3a2ade9..ab89c88 carries the absorbing skills; the
 * retired originals are byte-preserved in sources/_intake/jsm-skills and
 * git history for audit).
 *
 * Run from the repo:  node validation/merge-completeness/merge-completeness.test.mjs
 * Exit 0 = all retirements accounted for. Exit 1 = a gap — DO NOT DELETE.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// skill → absorber file → keyphrases (one per retired section / load-bearing mechanism)
const ACCOUNTING = {
  "spec-intake": {
    absorber: "skills/scope/modes/spec.md",
    also: ["skills/scope/SKILL.md"],
    keyphrases: [
      "ported from spec-intake v2.1.0",
      "Intent clarity gate",
      "interview-me",
      "divergent refinement",
      "delta decision",
      "falsifiable hypothesis",
      "PRD guards",
      "Anti-fluff rule",
      "Test-seam thinking",
      "door check",
      "must exit 0",
      "NEVER ship a hypothesis without its WRONG condition",
      "NEVER invent success criteria",
    ],
  },
  "slice-plan": {
    absorber: "skills/scope/modes/slices.md",
    also: ["skills/scope/references/task-quality.md", "skills/scope/SKILL.md"],
    keyphrases: [
      "ported from slice-plan v2.1.0",
      "≤500 prod lines / ≤12 files / ≤1500 total",
      "REQ-<domain>-<nnn>",
      "requirements: [REQ-...",
      "task-quality gate",
      "lint-contract.mjs",
      "ticket export",
      "NEVER author a contract whose sub_graph is not in the gravity Registry",
      "NEVER write the holdout file",
      "NEVER emit a plan containing a placeholder",
      "stop and ask — never overwrite it",
    ],
  },
  "pr-review": {
    absorber: "skills/check/modes/review.md",
    also: ["skills/check/SKILL.md", "skills/check/review-guide.md", "skills/check/modes/verify.md"],
    keyphrases: [
      "Lane framing (one process, stratified",
      "base-branch rulebook",
      "a PR may not smuggle its own standard",
      "PREFLIGHT BLOCKED = automatic FAIL",
      "must_haves → evidence map",
      "out-of-scope path = automatic FAIL",
      "holdout file, run it raw",
      "Ten Diagnostic Marks",
      "Raw output wins",
      "EvaluationResult",
      "performative agreement",
      "rules-drift-check",
      "a reviewer that edits is a worker with stale context",
      "verified.md",
      "fresh context is the review's defining physics",
      "A2A completion payload",
    ],
  },
};

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

for (const [skill, map] of Object.entries(ACCOUNTING)) {
  const absorberPath = join(REPO, map.absorber);
  check(`${skill}: absorber exists (${map.absorber})`, existsSync(absorberPath));
  if (!existsSync(absorberPath)) continue;
  const absorberText = readFileSync(absorberPath, "utf8");
  const alsoTexts = map.also.map((f) => ({ f, t: existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : "" }));
  for (const kp of map.keyphrases) {
    const found = absorberText.includes(kp) || alsoTexts.some(({ t }) => t.includes(kp));
    check(`${skill}: "${kp.slice(0, 58)}${kp.length > 58 ? "…" : ""}" accounted`, found);
  }
}

// Systematic-debugging (WP-F §4.9, resolved 2026-09-21): trigger-parity
// driver (validation/trigger-parity) proved surface parity (phrases +
// concepts + discovery chain) BEFORE this retirement; live confirmation
// = first real failure in a fresh session (rollback = revert the commit).
check("systematic-debugging retired (parity-gated by validation/trigger-parity)", !existsSync(join(REPO, "skills", "systematic-debugging", "SKILL.md")));

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed. DO NOT DELETE retiring folders.`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks; retirements are completeness-gated and may proceed.`);
