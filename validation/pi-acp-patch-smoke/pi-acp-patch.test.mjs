/**
 * pi-acp-patch.test.mjs — deterministic driver for the pi-acp command-bridge lane.
 *
 * Validates, against a pristine reconstructed copy (the live Zed install is
 * never touched — PI_ACP_TARGET overrides the target):
 *   1. apply script patches a pristine copy cleanly (exit 0, bridge present,
 *      extension commands advertised, node --check passes, exactly one
 *      backup, no .rej litter);
 *   2. re-runs skip cleanly: exit 0, "already applied", no prompt (stdin
 *      closed), no duplicate backups, file byte-identical;
 *   3. the patched bridge's behavior, extracted from the patched fixture and
 *      run with mocks:
 *      a. registry advertised — toAvailableCommandsFromPiGetCommands with
 *         includeExtensionCommands: true surfaces extension commands
 *         (previously filtered);
 *      b. dispatch round-trip — /seat and /memory (source "extension") are
 *         forwarded verbatim to proc.prompt and resolve end_turn; skill,
 *         prompt-template, file, and unknown commands are NOT bridged; the
 *         registry is fetched once and cached; a getCommands failure fails
 *         open (falls through, no throw);
 *   4. migration — a target carrying the retired /seat patch is restored
 *      from a backup and patched; with no usable backup it fails closed;
 *   5. fail-closed on a drifted target: exit 1, no modification.
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
const APPLY = join(REPO, "patches", "apply-pi-acp-command-bridge.sh");
const PATCH = join(REPO, "patches", "pi-acp-command-bridge.patch");
const LIVE_DIR = join(process.env.HOME ?? "", ".local", "share", "zed", "external_agents", "registry", "npx", "pi-acp", "node_modules", "pi-acp", "dist");
const LIVE = join(LIVE_DIR, "index.js");

const WORK = mkdtempSync(join(tmpdir(), "pi-acp-bridge-"));
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
// The live adapter may be pristine, command-bridge-patched, or carrying the
// retired /seat patch (whose backups hold the pristine base). Resolve all
// three without touching the live file.
if (!existsSync(LIVE)) {
  console.log(`FAIL  | live pi-acp present at ${LIVE} (driver needs it to reconstruct the fixture)`);
  console.log("—".repeat(80));
  console.log("FAILED — cannot build fixture");
  process.exit(1);
}
if (patchProbe("--forward", LIVE)) {
  copyFileSync(LIVE, FIX);
  check("live file pristine — used as fixture directly", true);
} else if (patchProbe("--reverse", LIVE)) {
  copyFileSync(LIVE, FIX);
  const r = spawnSync("patch", ["--reverse", "--batch", "-u", FIX, "-i", PATCH], { encoding: "utf8" });
  check("fixture reconstructed to pristine via reverse apply", r.status === 0);
} else {
  const bak = readdirSync(LIVE_DIR)
    .filter((f) => /^index\.js\.bak/.test(f))
    .map((f) => join(LIVE_DIR, f))
    .sort()
    .reverse()
    .find((p) => patchProbe("--forward", p));
  if (bak) {
    copyFileSync(bak, FIX);
    check(`live file patched/legacy — pristine fixture taken from backup ${bak}`, true);
  } else {
    console.log("FAIL  | live pi-acp matches neither patched nor pristine form and no usable backup exists; adapter drifted beyond driver assumptions");
    process.exit(1);
  }
}
check("pristine fixture lacks the command bridge", !readFileSync(FIX, "utf8").includes("session.bridgedCommands"));
check("pristine fixture filters extension commands", readFileSync(FIX, "utf8").includes("includeExtensionCommands: false"));

// ---- 1. First apply --------------------------------------------------------
let r = applyOnce(FIX);
check("run 1 exit 0 on pristine copy", r.status === 0);
check("run 1 reports success", (r.stdout ?? "").includes("patched successfully"));
const patchedSrc0 = readFileSync(FIX, "utf8");
check("run 1 installs the command bridge exactly once", patchedSrc0.split("session.bridgedCommands").length - 1 >= 4 && patchedSrc0.split("Generic command bridge").length - 1 === 1);
check("run 1 advertises extension commands at both registry call sites", (patchedSrc0.match(/includeExtensionCommands: true/g) ?? []).length === 2 && !patchedSrc0.includes("includeExtensionCommands: false\n"));
check("run 1 adds no per-command ACP builtin (seat stays extension-registered)", !patchedSrc0.includes('if (cmd === "seat")'));
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

// ---- 3a. Behavioral surface: registry advertisement -------------------------
const patchedSrc = readFileSync(FIX, "utf8");
const F_START = "function describeFallback(c) {";
const F_END = "  return { commands: out, raw: commandsRaw };\n}";
const fStart = patchedSrc.indexOf(F_START);
const fEnd = patchedSrc.indexOf(F_END);
check("registry mapping extractable from patched fixture", fStart !== -1 && fEnd > fStart);

if (fStart !== -1 && fEnd > fStart) {
  const src = patchedSrc.slice(fStart, fEnd + F_END.length);
  const toAvailable = new Function(`${src}; return toAvailableCommandsFromPiGetCommands;`)();
  const registry = {
    commands: [
      { name: "seat", description: "Switch the active seat", source: "extension" },
      { name: "memory", description: "Toggle project memory injection", source: "extension" },
      { name: "undo", description: "Revert file changes", source: "extension" },
      { name: "handoff", description: "Prompt template", source: "prompt" },
      { name: "skill:pr-review", description: "Review skill", source: "skill" }
    ]
  };
  const names = toAvailable(registry, { enableSkillCommands: true, includeExtensionCommands: true }).commands.map((c) => c.name);
  check("/seat, /memory, /undo (extension) advertised in available_commands", ["seat", "memory", "undo"].every((n) => names.includes(n)));
  check("prompt templates and skills still advertised alongside", names.includes("handoff") && names.includes("skill:pr-review"));
}

// ---- 3b. Behavioral surface: dispatch round-trip ---------------------------
const B_START = "      // Generic command bridge (rig patch):";
const B_END = "          return { stopReason: \"end_turn\" };\n        }\n      }";
const bStart = patchedSrc.indexOf(B_START);
const bEnd = patchedSrc.indexOf(B_END);
check("command bridge extractable from patched fixture", bStart !== -1 && bEnd > bStart);

if (bStart !== -1 && bEnd > bStart) {
  const src = patchedSrc.slice(bStart, bEnd + B_END.length);
  const fn = new Function(
    "session", "cmd", "message", "images",
    `return (async function () { ${src}\n return null; }).call(this);`
  );
  const mkSession = (registryData, { failGetCommands = false, fileCommands = [] } = {}) => {
    const calls = { getCommands: 0, prompt: [] };
    const session = {
      fileCommands,
      proc: {
        getCommands: async () => {
          calls.getCommands++;
          if (failGetCommands) throw new Error("get_commands unavailable");
          return registryData;
        },
        prompt: async (message, images) => { calls.prompt.push({ message, images }); }
      }
    };
    return { session, calls };
  };
  const registry = {
    commands: [
      { name: "seat", source: "extension" },
      { name: "memory", source: "extension" },
      { name: "skill:pr-review", source: "skill" },
      { name: "handoff", source: "prompt" }
    ]
  };

  let env = mkSession(registry);
  let res = await fn(env.session, "seat", "/seat list", []);
  check("/seat list dispatched to pi command handler verbatim", env.calls.prompt.length === 1 && env.calls.prompt[0].message === "/seat list");
  check("/seat dispatch resolves end_turn without an agent turn", res?.stopReason === "end_turn");
  check("registry fetched once and cached across dispatches", env.calls.getCommands === 1);
  res = await fn(env.session, "memory", "/memory on", []);
  check("/memory on dispatched round-trip on cached registry", env.calls.prompt.length === 2 && env.calls.prompt[1].message === "/memory on" && res?.stopReason === "end_turn");
  check("registry not refetched on second dispatch", env.calls.getCommands === 1);

  env = mkSession(registry);
  res = await fn(env.session, "skill:pr-review", "/skill:pr-review", []);
  check("skill commands NOT bridged (real agent turn; left to normal prompt path)", env.calls.prompt.length === 0 && res === null);
  res = await fn(env.session, "handoff", "/handoff worker", []);
  check("prompt-template commands NOT bridged (expanded by expandSlashCommand)", env.calls.prompt.length === 0 && res === null);
  res = await fn(env.session, "nonexistent", "/nonexistent hi", []);
  check("unknown slash commands NOT bridged (fall through unchanged)", env.calls.prompt.length === 0 && res === null);

  env = mkSession(registry, { fileCommands: [{ name: "seat" }] });
  res = await fn(env.session, "seat", "/seat list", []);
  check("file command shadowing an extension command is left to expandSlashCommand", env.calls.prompt.length === 0 && res === null);

  env = mkSession(null, { failGetCommands: true });
  res = await fn(env.session, "seat", "/seat list", []);
  check("getCommands failure fails open (no bridge, no throw)", env.calls.prompt.length === 0 && res === null);
}

// ---- 4. Migration from the retired /seat patch ------------------------------
const LEGDIR = join(WORK, "legacy");
mkdirSync(LEGDIR, { recursive: true });
writeFileSync(join(LEGDIR, "package.json"), JSON.stringify({ type: "module" }));
const LEG = join(LEGDIR, "index.js");
// Synthesize the legacy state: pristine base + the retired patch's marker.
copyFileSync(FIX, join(LEGDIR, "index.js.bak.1")); // backup holding the pristine base — but FIX is patched; rebuild pristine below
const PRISTINE = join(WORK, "pristine.js");
{
  copyFileSync(FIX, PRISTINE);
  const rr = spawnSync("patch", ["--reverse", "--batch", "--fuzz=0", "-u", PRISTINE, "-i", PATCH], { encoding: "utf8" });
  check("pristine base rebuilt for migration fixture", rr.status === 0);
}
copyFileSync(PRISTINE, join(LEGDIR, "index.js.bak.1"));
writeFileSync(LEG, readFileSync(PRISTINE, "utf8").replace(
  "    const result = await session.prompt(message, images);",
  '      if (cmd === "seat") { /* retired per-command handler */ }\n    const result = await session.prompt(message, images);'
));
r = applyOnce(LEG);
check("legacy /seat-patched target migrates: exit 0", r.status === 0);
check("migration reports restore from backup", (r.stdout ?? "").includes("restoring pristine adapter from"));
check("migrated target equals the normally patched file", sha(LEG) === sha(FIX));
check("migration preserves the legacy file as .legacy-seat.<ts>", readdirSync(LEGDIR).some((f) => /^index\.js\.legacy-seat\.\d+$/.test(f)));

const LEG2 = join(WORK, "legacy-nobak.js");
writeFileSync(LEG2, readFileSync(LEG, "utf8")); // any dir without a usable backup
const NOBAKDIR = join(WORK, "nobak");
mkdirSync(NOBAKDIR, { recursive: true });
writeFileSync(join(NOBAKDIR, "package.json"), JSON.stringify({ type: "module" }));
const LEG3 = join(NOBAKDIR, "index.js");
writeFileSync(LEG3, readFileSync(PRISTINE, "utf8").replace(
  "    const result = await session.prompt(message, images);",
  '      if (cmd === "seat") { /* retired per-command handler */ }\n    const result = await session.prompt(message, images);'
));
const beforeLeg3 = sha(LEG3);
r = applyOnce(LEG3);
check("legacy /seat-patched target with no usable backup fails closed (exit 1)", r.status === 1);
check("no-backup migration explains the remedy", (r.stderr ?? "").includes("Reinstall pi-acp"));
check("no-backup migration leaves target unmodified", sha(LEG3) === beforeLeg3);

// ---- 5. Fail-closed on drifted target --------------------------------------
const DRIFT = join(WORK, "drifted.js");
copyFileSync(PRISTINE, DRIFT);
// Corrupt a context line inside the first hunk so neither forward nor reverse applies.
writeFileSync(DRIFT, readFileSync(DRIFT, "utf8").replace(
  "          const pi = await session.proc.getCommands();",
  "          const pi = await session.proc.listCommands();"
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
