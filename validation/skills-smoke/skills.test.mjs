/**
 * skills.test.mjs — deterministic driver for WP6 (skills scaffold).
 *
 * Validates: shipped skill library passes lint-skills; non-kebab folder,
 * name/folder mismatch, missing trigger_phrases, oversized description,
 * angle brackets in frontmatter, and missing Act/Observe/Exit are caught.
 *
 * Run from the repo:  node validation/skills-smoke/skills.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, cpSync, renameSync } from "node:fs";
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

check("shipped skill library VALID (template + 3 skills)", lint().code === 0);

// non-kebab folder
renameSync(join(SKILLS, "pr-review"), join(SKILLS, "PR_Review"));
const folderRun = lint(true);
check("non-kebab folder caught", folderRun.code === 1 && folderRun.out.includes("kebab-case"));
renameSync(join(SKILLS, "PR_Review"), join(SKILLS, "pr-review"));

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

check("library VALID again after restores", lint().code === 0);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
