/**
 * pi-acp-patch.test.mjs — deterministic driver for the pi-acp /seat patch lane.
 *
 * Validates, against a pristine reconstructed copy (the live Zed install is
 * never touched — PI_ACP_TARGET overrides the target):
 *   1. apply script patches a pristine copy cleanly (exit 0, handler present,
 *      node --check passes, exactly one backup, no .rej litter);
 *   2. re-runs skip cleanly: exit 0, "already applied", no prompt (stdin
 *      closed), no duplicate backups, file byte-identical;
 *   3. fail-closed on a drifted target: exit 1, no modification.
 *
 * Run from the repo:  node validation/pi-acp-patch-smoke/pi-acp-patch.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const APPLY = join(REPO, "patches", "apply-pi-acp-seat-patch.sh");
const PATCH = join(REPO, "patches", "pi-acp-seat-command.patch");
const LIVE = join(process.env.HOME ?? "", ".local", "share", "zed", "external_agents", "registry", "npx", "pi-acp", "node_modules", "pi-acp", "dist", "index.js");

const WORK = mkdtempSync(join(tmpdir(), "pi-acp-fix-"));
const FIXDIR = join(WORK, "fixture");
mkdirSync(FIXDIR, { recursive: true });
// ESM marker so `node --check` resolves module type like the real package dir.
writeFileSync(join(FIXDIR, "package.json"), JSON.stringify({ type: "module" }));
const FIX = join(FIXDIR, "index.js");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

function sha(p) { return createHash("sha256").update(readFileSync(p)).digest("hex"); }
function backups() { return readdirSync(FIXDIR).filter((f) => /^index\.js\.bak\.\d+$/.test(f)); }
function rejLitter() { return readdirSync(FIXDIR).filter((f) => f.endsWith(".rej") || f.endsWith(".orig")); }
function applyOnce(target) {
  // stdin closed: any interactive prompt would read EOF and fail the run.
  return spawnSync("bash", [APPLY], {
    env: { ...process.env, PI_ACP_TARGET: target },
    input: "",
    encoding: "utf8",
  });
}
const patchProbe = (mode, target) =>
  spawnSync("patch", [mode, "--batch", "--fuzz=0", "--dry-run", "-u", target, "-i", PATCH], { encoding: "utf8" }).status === 0;

// ---- Fixture setup: reconstruct a pristine (unpatched) copy ----------------
if (!existsSync(LIVE)) {
  console.log(`FAIL  | live pi-acp present at ${LIVE} (driver needs it to reconstruct the fixture)`);
  console.log("—".repeat(80));
  console.log("FAILED — cannot build fixture");
  process.exit(1);
}
copyFileSync(LIVE, FIX);
const livePatched = readFileSync(LIVE, "utf8").includes('name: "seat"');
if (livePatched) {
  if (!patchProbe("--reverse", FIX)) {
    console.log("FAIL  | live file claims patched but reverse probe failed; cannot reconstruct pristine fixture");
    process.exit(1);
  }
  const r = spawnSync("patch", ["--reverse", "--batch", "-u", FIX, "-i", PATCH], { encoding: "utf8" });
  check("fixture reconstructed to pristine via reverse apply", r.status === 0);
} else if (patchProbe("--forward", FIX)) {
  check("live file pristine — used as fixture directly", true);
} else {
  console.log("FAIL  | live pi-acp matches neither patched nor pristine form; adapter drifted beyond driver assumptions");
  process.exit(1);
}
check("pristine fixture lacks seat handler", !readFileSync(FIX, "utf8").includes('name: "seat"'));

// ---- 1. First apply --------------------------------------------------------
let r = applyOnce(FIX);
check("run 1 exit 0 on pristine copy", r.status === 0);
check("run 1 reports success", (r.stdout ?? "").includes("patched successfully"));
check("run 1 installs seat handler exactly once", readFileSync(FIX, "utf8").split('name: "seat"').length - 1 === 1);
check("run 1 creates exactly one backup", backups().length === 1);
check("run 1 leaves no .rej/.orig litter", rejLitter().length === 0);
const afterFirst = sha(FIX);

// ---- 2. Idempotent re-runs -------------------------------------------------
r = applyOnce(FIX);
check("run 2 (re-run) exit 0 with no prompt", r.status === 0);
check("run 2 reports already applied", (r.stdout ?? "").includes("already applied"));
check("run 2 creates no duplicate backup", backups().length === 1);
check("run 2 file byte-identical", sha(FIX) === afterFirst);
check("run 2 leaves no .rej/.orig litter", rejLitter().length === 0);

// ---- 3. Fail-closed on drifted target --------------------------------------
const DRIFT = join(WORK, "drifted.js");
copyFileSync(FIX, DRIFT);
// Corrupt a context line inside the first hunk so neither forward nor reverse applies.
writeFileSync(DRIFT, readFileSync(DRIFT, "utf8").replace(
  'description: "Export session to an HTML file in the session cwd"',
  'description: "Export session to a PDF file in the session cwd"'
));
const beforeDrift = sha(DRIFT);
r = applyOnce(DRIFT);
check("drifted target exits 1", r.status === 1);
check("drifted target reports the drift", (r.stderr ?? "").includes("neither applies forward nor reverse"));
check("drifted target left unmodified", sha(DRIFT) === beforeDrift);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
