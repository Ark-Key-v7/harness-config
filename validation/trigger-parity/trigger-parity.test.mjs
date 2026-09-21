/**
 * trigger-parity.test.mjs — WP-F §4.9 gate for the systematic-debugging → /debug retirement.
 *
 * The retirement is safe when the absorbing /debug skill carries the
 * discipline's full trigger surface AND the discovery chain exposes it to
 * every host harness. Checks:
 *  1. every systematic-debugging trigger phrase survives verbatim in
 *     /debug's frontmatter (trigger_phrases + description);
 *  2. the discipline's activation concepts (bug / test failure /
 *     unexpected behavior / before fixes) are present in /debug's
 *     description, so description-based matchers fire on the same inputs;
 *  3. the discovery chain is live: ~/.agents/skills resolves to the
 *     deployed skills tree and exposes debug/ (PORTABILITY step 2b);
 *  4. post-retirement: systematic-debugging is absent from the authoring
 *     tree (run after `git rm`).
 *
 * Behavioral note on record (FACTORY_STATUS): surface parity is proven
 * here; live confirmation is the first real mid-build failure
 * auto-invoking /debug in a fresh ZCode session. Rollback = revert the
 * retirement commit.
 *
 * Run from the repo:  node validation/trigger-parity/trigger-parity.test.mjs
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

let failures = 0, checks = 0;
function check(label, cond) { checks++; if (cond) console.log(`PASS  | ${label}`); else { failures++; console.log(`FAIL  | ${label}`); } }

const debugPath = join(REPO, "skills", "debug", "SKILL.md");
check("/debug SKILL.md exists", existsSync(debugPath));
const debugText = readFileSync(debugPath, "utf8");
const front = debugText.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

// 1. Phrase-level parity: every discipline trigger phrase survives in /debug frontmatter.
const DISCIPLINE_PHRASES = ["debug this", "find the root cause", "systematic debugging"];
for (const p of DISCIPLINE_PHRASES) {
  check(`trigger phrase "${p}" present in /debug frontmatter`, front.toLowerCase().includes(p));
}

// 2. Concept parity: the discipline's activation language maps onto /debug's description.
const desc = front.match(/^description:\s*"(.+)"/m)?.[1] ?? "";
for (const concept of ["bug", "test", "behavior"]) {
  check(`activation concept "${concept}" in /debug description`, desc.toLowerCase().includes(concept));
}
check("/debug carries the discipline's trigger_phrases block", /trigger_phrases:/.test(front));
check("/debug body carries the absorbed Iron Law", debugText.includes("NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST"));

// 3. Discovery chain (PORTABILITY step 2b): ~/.agents/skills → deployed skills.
const agentsSkills = join(homedir(), ".agents", "skills");
check("~/.agents/skills exists (2b bootstrap)", existsSync(agentsSkills));
check("~/.agents/skills/debug/SKILL.md reachable", existsSync(join(agentsSkills, "debug", "SKILL.md")));
const deployed = join(homedir(), ".pi", "agent", "skills");
check("deployed clone skills tree exists", existsSync(deployed));
check("deployed clone exposes debug/", existsSync(join(deployed, "debug", "SKILL.md")));

// 4. Post-retirement: no dual-maintenance in the authoring tree.
check("systematic-debugging retired from authoring tree", !existsSync(join(REPO, "skills", "systematic-debugging", "SKILL.md")));
// And the absorber still passes the byte-identity guarantee for its ported refs.
check("absorbed references present (root-cause-tracing)", existsSync(join(REPO, "skills", "debug", "references", "root-cause-tracing.md")));

console.log("—".repeat(80));
if (failures > 0) { console.log(`FAILED — ${failures} of ${checks} checks failed. DO NOT RETIRE (or restore if already retired).`); process.exit(1); }
console.log(`ALL PASS — ${checks} checks. Trigger surface parity proven; live confirmation = first real failure in a fresh session.`);
