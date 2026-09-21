/**
 * skills.test.mjs — deterministic driver for WP6 (skills scaffold).
 *
 * Validates: shipped skill library passes lint-skills; non-kebab folder,
 * name/folder mismatch, missing trigger_phrases, oversized description,
 * angle brackets in frontmatter, and missing Act/Observe/Exit are caught.
 * v2.0.0 (WP-D-1): missing metadata.class, missing "When NOT to Use",
 * and empty folders inside a skill dir are caught.
 * v2.1.0 (WP-F): byte budgets (SKILL.md 32KB / support 24KB), description
 * >400 WARN (ratchet, non-failing), model-alias spawn-directive ban,
 * contract-block byte-identity + unclosed-marker detection are caught.
 *
 * Run from the repo:  node validation/skills-smoke/skills.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync, cpSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "skills-fix-"));
mkdirSync(join(FIX, "bin"), { recursive: true });
copyFileSync(join(REPO, "bin", "lint-skills.mjs"), join(FIX, "bin", "lint-skills.mjs"));
cpSync(join(REPO, "skills"), join(FIX, "skills"), { recursive: true });

const SKILLS = join(FIX, "skills");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function lint(allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, "bin", "lint-skills.mjs"), SKILLS], { cwd: FIX, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

const rigChange = join(SKILLS, "rig-change", "SKILL.md");
const rigOrig = readFileSync(rigChange, "utf8");

check("shipped skill library VALID (format v2.0.0 + WP-F budgets)", lint().code === 0);

// non-kebab folder
renameSync(join(SKILLS, "document"), join(SKILLS, "PR_Review"));
const folderRun = lint(true);
check("non-kebab folder caught", folderRun.code === 1 && folderRun.out.includes("kebab-case"));
renameSync(join(SKILLS, "PR_Review"), join(SKILLS, "document"));

// name/folder mismatch
writeFileSync(rigChange, rigOrig.replace("name: rig-change", "name: rigchange"));
const nameRun = lint(true);
check("name/folder mismatch caught", nameRun.code === 1 && nameRun.out.includes("does not match folder"));
writeFileSync(rigChange, rigOrig);

// missing trigger_phrases
writeFileSync(rigChange, rigOrig.replace(/trigger_phrases:\s*\[[^\]]*\]/, ""));
const trigRun = lint(true);
check("missing metadata.trigger_phrases caught", trigRun.code === 1 && trigRun.out.includes("trigger_phrases"));
writeFileSync(rigChange, rigOrig);

// oversized description
writeFileSync(rigChange, rigOrig.replace(/^description: .+$/m, "description: " + "x".repeat(1100)));
const descRun = lint(true);
check("description over 1024 caught", descRun.code === 1 && descRun.out.includes("1024"));
writeFileSync(rigChange, rigOrig);

// angle brackets in frontmatter
writeFileSync(rigChange, rigOrig.replace("name: rig-change", "name: rig-change\nxml: <nope>"));
const xmlRun = lint(true);
check("XML angle brackets in frontmatter caught (E.6)", xmlRun.code === 1 && xmlRun.out.includes("angle brackets"));
writeFileSync(rigChange, rigOrig);

// missing Act/Observe/Exit
writeFileSync(rigChange, rigOrig.replaceAll("OBSERVE", "LOOK"));
const loopRun = lint(true);
check("missing OBSERVE (Act/Observe/Exit form) caught", loopRun.code === 1 && loopRun.out.includes("OBSERVE"));
writeFileSync(rigChange, rigOrig);

// v2.0.0 (WP-D-1): missing metadata.class
writeFileSync(rigChange, rigOrig.replace(/^\s+class: procedural$/m, ""));
const classRun = lint(true);
check("missing metadata.class caught (format v2.0.0)", classRun.code === 1 && classRun.out.includes("metadata.class"));
writeFileSync(rigChange, rigOrig);

// v2.0.0 (WP-D-1): missing When NOT to Use
writeFileSync(rigChange, rigOrig.replace("#### When NOT to Use", "#### Exclusions"));
const wnuRun = lint(true);
check("missing When NOT to Use caught (format v2.0.0)", wnuRun.code === 1 && wnuRun.out.includes("When NOT to Use"));
writeFileSync(rigChange, rigOrig);

// v2.0.0 (WP-D-1): empty folder inside a skill dir
mkdirSync(join(SKILLS, "rig-change", "scratch"));
const emptyRun = lint(true);
check("empty folder inside skill dir caught (format v2.0.0)", emptyRun.code === 1 && emptyRun.out.includes("empty folder"));
rmSync(join(SKILLS, "rig-change", "scratch"), { recursive: true });

// v2.1.0 (WP-F): support .md over the 24KB byte budget
mkdirSync(join(SKILLS, "rig-change", "references"));
writeFileSync(join(SKILLS, "rig-change", "references", "big.md"), "x".repeat(25 * 1024));
const supportRun = lint(true);
check("support .md over 24KB byte budget caught (WP-F)", supportRun.code === 1 && supportRun.out.includes("byte budget"));
rmSync(join(SKILLS, "rig-change", "references"), { recursive: true });

// v2.1.0 (WP-F): SKILL.md over the 32KB byte budget
const secFile = join(SKILLS, "security-and-hardening", "SKILL.md");
const secOrig = readFileSync(secFile, "utf8");
writeFileSync(secFile, secOrig + "x".repeat(5 * 1024));
const skillBudgetRun = lint(true);
check("SKILL.md over 32KB byte budget caught (WP-F)", skillBudgetRun.code === 1 && skillBudgetRun.out.includes("byte budget"));
writeFileSync(secFile, secOrig);

// v2.1.0 (WP-F): description >400 chars WARNs (ratchet — non-failing)
writeFileSync(rigChange, rigOrig.replace(/^description: .+$/m, "description: " + "x".repeat(500)));
const warnRun = lint();
check("description >400 warns without failing (WP-F ratchet)", warnRun.code === 0 && warnRun.out.includes("WARN") && warnRun.out.includes("400"));
writeFileSync(rigChange, rigOrig);

// v2.1.0 (WP-F): model-alias spawn directive
writeFileSync(rigChange, rigOrig + '\nmodel: "sonnet"\n');
const aliasRun = lint(true);
check("model-alias spawn directive caught (WP-F)", aliasRun.code === 1 && aliasRun.out.includes("model alias"));
writeFileSync(rigChange, rigOrig);

// v2.1.0 (WP-F): contract blocks — same NAME, different content across skills
const prFile = join(SKILLS, "document", "SKILL.md");
const prOrig = readFileSync(prFile, "utf8");
writeFileSync(rigChange, rigOrig + "\n<!-- SHARED-RULE:START -->\nRule A text.\n<!-- SHARED-RULE:END -->\n");
writeFileSync(prFile, prOrig + "\n<!-- SHARED-RULE:START -->\nRule B text.\n<!-- SHARED-RULE:END -->\n");
const mismatchRun = lint(true);
check("contract-block byte mismatch caught (WP-F)", mismatchRun.code === 1 && mismatchRun.out.includes("contract block"));
writeFileSync(rigChange, rigOrig);
writeFileSync(prFile, prOrig);

// v2.1.0 (WP-F): contract blocks — identical content passes
writeFileSync(rigChange, rigOrig + "\n<!-- SHARED-RULE:START -->\nSame text.\n<!-- SHARED-RULE:END -->\n");
writeFileSync(prFile, prOrig + "\n<!-- SHARED-RULE:START -->\nSame text.\n<!-- SHARED-RULE:END -->\n");
check("byte-identical contract blocks pass (WP-F)", lint().code === 0);
writeFileSync(rigChange, rigOrig);
writeFileSync(prFile, prOrig);

// v2.1.0 (WP-F): unclosed contract-block marker
writeFileSync(rigChange, rigOrig + "\n<!-- LONE:START -->\nno end here\n");
const unclosedRun = lint(true);
check("unclosed contract-block marker caught (WP-F)", unclosedRun.code === 1 && unclosedRun.out.includes("unclosed"));
writeFileSync(rigChange, rigOrig);

check("library VALID again after restores", lint().code === 0);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
