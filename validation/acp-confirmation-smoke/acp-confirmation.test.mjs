/**
 * acp-confirmation.test.mjs — source-assertion driver for the ACP
 * confirmation fallback.
 *
 * Why: Zed's pi-acp adapter hard-cancels extension input/editor dialogs
 * ("not supported in ACP yet") and degrades select to a bare permission
 * prompt. Every confirmation surface in the rig must therefore carry the
 * ACP fallback clause — plain chat text, explicit typed affirmative,
 * dismissal/timeout/ambiguity = non-ratification — and this driver asserts
 * that clause exists, in matching wording, in each affected source.
 *
 * Checked sources:
 *   - skills/rig-change/SKILL.md      (§5.4 ratification prompt)
 *   - skills/project-onboard/SKILL.md (operator-approval points)
 *   - extensions/ask-user.ts          (ACP detection + degrade path)
 *   - extensions/ask-user.test.mjs    (behavioral coverage of the degrade)
 *
 * Run from the repo root: node validation/acp-confirmation-smoke/acp-confirmation.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

const norm = (s) => s.replace(/\s+/g, " ");
const rigChange = norm(readFileSync(join(REPO, "skills", "rig-change", "SKILL.md"), "utf8"));
const projectOnboard = norm(readFileSync(join(REPO, "skills", "project-onboard", "SKILL.md"), "utf8"));
const askUserSrc = norm(readFileSync(join(REPO, "extensions", "ask-user.ts"), "utf8"));
const askUserTest = norm(readFileSync(join(REPO, "extensions", "ask-user.test.mjs"), "utf8"));

// ---- The clause, in the skills (same wording across both) ----------------
for (const [name, src] of [["rig-change SKILL.md", rigChange], ["project-onboard SKILL.md", projectOnboard]]) {
  check(`${name}: names the frontend condition ("when the frontend is ACP (Zed)")`, src.includes("when the frontend is ACP (Zed)"));
  check(`${name}: forbids the interactive input UI`, src.includes("never invoke the interactive input UI"));
  check(`${name}: requires an explicit typed affirmative`, src.includes("explicit typed affirmative"));
  check(`${name}: dismissal/timeout/ambiguity = non-ratification`, src.includes("dismissal, timeout, or ambiguity") && src.toLowerCase().includes("non-ratification"));
}

// ---- rig-change: the clause is wired into Step 5 and the anti-patterns ---
check("rig-change SKILL.md: Step 5 carries the ACP plain-text instruction", /Step 5.*plain chat text/.test(rigChange));
check("rig-change SKILL.md: anti-patterns bar dismissal-as-ratification", rigChange.includes("NEVER treat an ACP dismissal, timeout, or ambiguous reply as ratification"));

// ---- ask-user extension: detection + degrade ------------------------------
check("ask-user.ts: detects ACP via the pi-acp session map", askUserSrc.includes("pi-acp") && askUserSrc.includes("session-map.json"));
check("ask-user.ts: degrade path tagged reason=acp_frontend", askUserSrc.includes('"acp_frontend"'));
check("ask-user.ts: degrade guidance directs plain chat text", askUserSrc.includes("plain chat text"));
check("ask-user.ts: degrade guidance carries the non-ratification rule", askUserSrc.includes("explicit typed affirmative") && askUserSrc.includes("non-ratification"));

// ---- behavioral coverage exists -------------------------------------------
check("ask-user.test.mjs: covers the ACP degrade path", askUserTest.includes("acp_frontend"));

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
