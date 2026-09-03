/**
 * pi-acp-patch.test.mjs — deterministic driver for the pi-acp /seat patch lane.
 *
 * Validates, against a pristine reconstructed copy (the live Zed install is
 * never touched — PI_ACP_TARGET overrides the target):
 *   1. apply script patches a pristine copy cleanly (exit 0, handler present,
 *      node --check passes, exactly one backup, no .rej litter);
 *   2. re-runs skip cleanly: exit 0, "already applied", no prompt (stdin
 *      closed), no duplicate backups, file byte-identical;
 *   3. the patched handler's behavior: the /seat block is extracted from the
 *      patched fixture and run with a mocked connection/session — list/show
 *      render from fixture profiles, are read-only, fail closed on missing
 *      profiles, and switch/off still mutate state (all state resolves into
 *      the temp dir via fake homedir + RIG_PROFILES_DIR);
 *   4. fail-closed on a drifted target: exit 1, no modification.
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

// ---- 3. Behavioral surface: run the patched handler with mocks ------------
// Extract the /seat block from the patched fixture and exercise it. State and
// profiles resolve into the temp dir (fake homedir + RIG_PROFILES_DIR) — the
// live rig is never touched.
const PROFILES = join(WORK, "profiles");
mkdirSync(PROFILES, { recursive: true });
writeFileSync(join(PROFILES, "scout.md"), "# PROFILE: Scout (Maps the terrain and reports)\n\nScout body.\n");
writeFileSync(join(PROFILES, "planner.md"), "# PROFILE: Planner (Turns maps into sequenced plans)\n\nPlanner body.\n");
writeFileSync(join(PROFILES, "worker.md"), "# PROFILE: Worker (Executes plan steps)\n\nWorker body.\n");
writeFileSync(join(PROFILES, "reviewer.md"), "# PROFILE: Reviewer (Judges output against contract)\n\nReviewer body.\n");
const FAKEHOME = join(WORK, "fakehome");
const statePath = () => join(FAKEHOME, ".pi", "agent", "seat-state.json");

const patchedSrc = readFileSync(FIX, "utf8");
const H_START = '      if (cmd === "seat") {';
const H_END = "        return sendSeatText(text);\n      }";
const hStart = patchedSrc.indexOf(H_START);
const hEnd = patchedSrc.indexOf(H_END);
check("seat handler extractable from patched fixture", hStart !== -1 && hEnd > hStart);

if (hStart !== -1 && hEnd > hStart) {
  const src = patchedSrc.slice(hStart, hEnd + H_END.length);
  const fn = new Function(
    "args", "session", "cmd", "join", "dirname", "homedir", "readFileSync", "writeFileSync", "mkdirSync",
    `return (async function () { ${src} }).call(this);`
  );
  const runSeat = (argv) => {
    const sent = [];
    const conn = { sessionUpdate: async (u) => { sent.push(u.update.content.text); } };
    const session = { sessionId: "s1", cwd: "/proj" };
    return Promise.resolve(
      fn.call({ conn }, argv, session, "seat", join, dirname, () => FAKEHOME, readFileSync, writeFileSync, mkdirSync)
    ).then((res) => ({ res, text: sent.join("\n") }));
  };

  const savedRigDir = process.env.RIG_PROFILES_DIR;
  process.env.RIG_PROFILES_DIR = PROFILES;

  let out = await runSeat(["list"]);
  check("/seat list renders all four seats with inactive markers", ["scout", "planner", "worker", "reviewer"].every((s) => out.text.includes(`○ ${s} —`)));
  check("/seat list pulls purposes from # PROFILE headings", out.text.includes("Maps the terrain and reports"));
  check("/seat list is read-only (no state file written)", !existsSync(statePath()));
  check("/seat list advertises show and off", out.text.includes("/seat show <name>") && out.text.includes("/seat off"));

  out = await runSeat(["show", "scout"]);
  check("/seat show scout returns profile content", out.text.includes("Profile: scout") && out.text.includes("Scout body."));
  check("/seat show is read-only", !existsSync(statePath()));

  out = await runSeat(["show"]);
  check("/seat show without target warns with usage", out.text.includes("Usage: /seat show"));

  out = await runSeat(["bogus"]);
  check("unknown-seat usage now mentions list and show", out.text.includes("Unknown seat") && out.text.includes("list") && out.text.includes("show <seat>"));
  check("unknown seat is read-only", !existsSync(statePath()));

  out = await runSeat(["scout"]);
  check("/seat scout still switches (state written)", existsSync(statePath()) && readFileSync(statePath(), "utf8").includes('"scout"'));

  out = await runSeat(["list"]);
  check("/seat list marks the active seat", out.text.includes("● scout") && out.text.includes("○ planner"));

  out = await runSeat(["off"]);
  check("/seat off still clears", !readFileSync(statePath(), "utf8").includes('"scout"'));

  const EMPTY = join(WORK, "empty-profiles");
  mkdirSync(EMPTY, { recursive: true });
  process.env.RIG_PROFILES_DIR = EMPTY;
  out = await runSeat(["list"]);
  check("/seat list flags missing profiles", (out.text.match(/profile MISSING/g) ?? []).length === 4);
  out = await runSeat(["show", "scout"]);
  check("/seat show with missing profile fails closed", out.text.includes("not found"));

  if (savedRigDir === undefined) delete process.env.RIG_PROFILES_DIR;
  else process.env.RIG_PROFILES_DIR = savedRigDir;
}

// ---- 4. Fail-closed on drifted target --------------------------------------
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
