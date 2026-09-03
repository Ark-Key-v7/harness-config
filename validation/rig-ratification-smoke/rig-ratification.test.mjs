/**
 * rig-ratification.test.mjs — source-assertion driver for the rig-change
 * ratification protocol's two governance clauses.
 *
 * Clause 1 (ratification read): the operator handoff must begin with the
 *   ratification read — the operator runs `git diff --cached` and reads the
 *   full staged diff before answering; the staged-file table is a summary,
 *   not evidence.
 * Clause 2 (push boundary): typed-yes ratification authorizes the commit
 *   only; push and clone-sync are always operator-run (the operator holds
 *   the SSH key).
 *
 * Both clauses must exist in skills/rig-change/SKILL.md, and the ACP
 * confirmation clause (asserted in detail by acp-confirmation-smoke) must
 * still be intact.
 *
 * Run from the repo root: node validation/rig-ratification-smoke/rig-ratification.test.mjs
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

// ---- Clause 1: the ratification read -------------------------------------
check("ratification read: handoff begins with `git diff --cached`", skill.includes("handoff BEGINS with the ratification read") && skill.includes("git diff --cached"));
check("ratification read: staged-file table is a summary, not evidence", skill.includes("staged-file table is a summary, not evidence"));
check("ratification read: ratification without the read is not ratification", skill.includes("ratification without the read is not ratification"));

// ---- Clause 2: the push boundary ------------------------------------------
check("push boundary: typed yes authorizes the commit only", skill.includes("the commit only"));
check("push boundary: push and clone-sync are always operator-run", skill.includes("push and clone-sync are always operator-run"));
check("push boundary: the operator holds the SSH key", skill.includes("operator holds the SSH key") || skill.includes("the operator\nholds the SSH key"));
check("push boundary: Step 6 hands keys back, never runs push/sync", skill.includes("Hand the operator the push + sync commands; NEVER run them yourself"));
check("push boundary: anti-pattern bars agent-run push and pull", skill.includes("NEVER run `git push` or `git -C ~/.pi/agent pull`"));
check("push boundary: chain completes on operator-reported fast-forward", skill.includes("operator reports the pull output shows a fast-forward update") && skill.includes("the agent never runs the push or the sync"));

// ---- Regression guard: ACP confirmation clause still intact ---------------
check("ACP clause intact (see acp-confirmation-smoke for detail)", skill.includes("when the frontend is ACP (Zed)") && skill.includes("explicit typed") && skill.includes("non-ratification"));

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
