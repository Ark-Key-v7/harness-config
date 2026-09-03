/**
 * advisory-diff.test.mjs — source-assertion driver for the optional
 * advisory staged-diff verification clause ("diff echo") in
 * skills/rig-change/SKILL.md Step 4.
 *
 * The clause: if the operator pastes the `git diff --cached` output back
 * into the thread, the agent verifies it against the ratification table
 * and reports discrepancies across exactly five checks, in this order:
 *   1. file list matches the table exactly (extra file = red flag)
 *   2. scope matches the brief (unrequested deletions/rewrites = stop)
 *   3. no secrets in added lines
 *   4. no law edits outside the brief
 *   5. driver scratch stays untracked
 * The report is advisory only: the typed yes remains the operator's sole
 * act of ratification — an agent never ratifies its own work.
 *
 * Also regression-guards the clauses this amendment must not disturb:
 * the ACP confirmation clause (detail: acp-confirmation-smoke), the
 * ratification read, and the push boundary (detail: rig-ratification-smoke).
 *
 * Run from the repo root: node validation/advisory-diff-smoke/advisory-diff.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const norm = (s) => s.replace(/\s+/g, " ");
const skill = norm(readFileSync(join(REPO, "skills", "rig-change", "SKILL.md"), "utf8"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

// ---- The advisory clause exists -------------------------------------------
check("clause: optional advisory step declared", skill.includes("Optional advisory step"));
check("clause: triggers on pasted `git diff --cached` output", skill.includes("`git diff --cached` output back into the thread"));
check("clause: verifies against the ratification table", skill.includes("verify it against the ratification table"));
check("clause: exactly five checks, in this order", skill.includes("exactly five checks") && skill.includes("in this order"));

// ---- The five checks: present, worded, and in the mandated order ----------
const FIVE = [
  ["1. File list matches the table exactly", "any extra file", "`extensions/`, `templates/`, or `bin/`", "is a red flag"],
  ["2. Scope matches the brief", "large unrequested deletions or rewrites are a stop"],
  ["3. No secrets", "keys, tokens, passwords", "`.env` content in added lines"],
  ["4. No law edits outside the brief", "governance files changing beyond what the table declared"],
  ["5. Driver scratch stays untracked", "no `??` fixtures staged"],
];

const positions = [];
for (const [i, phrases] of FIVE.entries()) {
  for (const phrase of phrases) {
    check(`check ${i + 1}: "${phrase}" present`, skill.includes(phrase));
  }
  positions.push(skill.indexOf(phrases[0]));
}
check(
  "the five checks appear in the mandated order (1→5)",
  positions.every((p) => p >= 0) && positions.every((p, i) => i === 0 || p > positions[i - 1])
);

// ---- Position: between the ratification read and the typed yes ------------
const idxRead = skill.indexOf("ratification read");
const idxAdvisory = skill.indexOf("Optional advisory step");
const idxYes = skill.indexOf("Commit? (yes/no)");
check(
  "clause sits between the ratification read and the typed yes",
  idxRead >= 0 && idxAdvisory > idxRead && idxYes > idxAdvisory
);

// ---- The boundary: advisory only, never self-ratification ------------------
check("boundary: report is advisory only", skill.includes("The report is advisory only"));
check("boundary: typed yes remains the operator's sole act", skill.includes("the typed yes remains the operator's sole act of ratification"));
check("boundary: an agent never ratifies its own work", skill.includes("an agent never ratifies its own work"));

// ---- Regression guard: ACP confirmation clause intact ----------------------
check(
  "ACP clause intact (see acp-confirmation-smoke for detail)",
  skill.includes("when the frontend is ACP (Zed)") &&
    skill.includes("never invoke the interactive input UI") &&
    skill.includes("explicit typed affirmative") &&
    skill.includes("dismissal, timeout, or ambiguity")
);

// ---- Regression guard: ratification-read clause intact ---------------------
check(
  "ratification read intact (see rig-ratification-smoke for detail)",
  skill.includes("handoff BEGINS with the ratification read") &&
    skill.includes("staged-file table is a summary, not evidence") &&
    skill.includes("ratification without the read is not ratification")
);

// ---- Regression guard: push-boundary clause intact -------------------------
check(
  "push boundary intact (see rig-ratification-smoke for detail)",
  skill.includes("push and clone-sync are always operator-run") &&
    skill.includes("operator holds the SSH key") &&
    skill.includes("NEVER run `git push` or `git -C ~/.pi/agent pull`")
);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
