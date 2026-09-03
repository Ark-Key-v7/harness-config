/**
 * seat-switch.test.mjs — deterministic driver for WP8 seat-switch extension.
 *
 * Validates: /seat command lifecycle (status → set → inject → reject → off),
 * read-only inspection (/seat list, /seat show), fail-closed behavior on
 * unknown seats and missing profiles, pull-model freshness, and the
 * injection cap.
 *
 * Run from the repo:  node validation/seat-switch-smoke/seat-switch.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "seat-fix-"));
const HOME = mkdtempSync(join(tmpdir(), "seat-home-"));
process.env.HOME = HOME;

// Fake rig profiles dir (stands in for ~/.pi/agent/templates/agents/profiles)
const PROFILES = join(FIX, "profiles");
mkdirSync(PROFILES, { recursive: true });
writeFileSync(join(PROFILES, "scout.md"), "# PROFILE: Scout (read-only exploration seat)\nwrite: none\n");
writeFileSync(join(PROFILES, "planner.md"), "# PROFILE: Planner (spec-authoring seat)\nwrite: specs-only\n");
writeFileSync(join(PROFILES, "worker.md"), "# PROFILE: Worker (execution seat)\nwrite: sub-graph\n");
// reviewer.md deliberately MISSING — tests the missing-profile path
process.env.RIG_PROFILES_DIR = PROFILES;

// Shim for the extension import
const shimDir = join(FIX, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), `export function isToolCallEventType(name, event) { return event?.name === name; }\n`);
const EXT_LOCAL = join(FIX, ".seat-switch-under-test.ts");
copyFileSync(join(REPO, "extensions", "seat-switch.ts"), EXT_LOCAL);

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

const { default: factory } = await import(EXT_LOCAL);
const handlers = {};
const commands = {};
factory({ on: (ev, fn) => { handlers[ev] = fn; }, registerCommand: (n, spec) => { commands[n] = spec; }, appendEntry() {} });

const CWD = join(FIX, "proj");
mkdirSync(CWD, { recursive: true });
const notices = [];
const ctx = { cwd: CWD, hasUI: false, ui: { notify: (m, level) => notices.push({ m, level }), async confirm() { return false; } } };

const start = (systemPrompt = "BASE") => handlers.before_agent_start({ systemPrompt }, ctx);

// 1. No seat set → no injection
check("no seat → before_agent_start returns undefined (no injection)", start() === undefined);

// 2. /seat with no args → status, no crash
await commands.seat.handler("", ctx);
check("bare /seat reports no active seat", notices.at(-1).m.includes("No active seat"));

// 3. /seat scout → state saved
await commands.seat.handler("scout", ctx);
check("/seat scout confirms", notices.at(-1).m.includes("Seat set: scout"));
const st = JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"));
check("state persisted keyed by cwd", st[CWD] === "scout");

// 4. Injection carries the profile verbatim with seat header
const injected = start();
check("injection wraps systemPrompt", typeof injected?.systemPrompt === "string" && injected.systemPrompt.startsWith("BASE"));
check("injection contains seat + profile verbatim", injected.systemPrompt.includes("Active seat: scout") && injected.systemPrompt.includes("# PROFILE: Scout"));

// 5. Pull model: edit profile → next turn sees fresh content
writeFileSync(join(PROFILES, "scout.md"), "# PROFILE: Scout (read-only exploration seat)\nwrite: none\nrevision: v2\n");
check("pull model: edited profile injected fresh", start().systemPrompt.includes("revision: v2"));

// 6. Unknown seat rejected, state unchanged
await commands.seat.handler("captain", ctx);
check("unknown seat rejected with warning", notices.at(-1).level === "warning" && notices.at(-1).m.includes("Unknown seat"));
check("unknown seat leaves state unchanged", JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"))[CWD] === "scout");

// 7. Missing profile file → error, state unchanged
await commands.seat.handler("reviewer", ctx);
check("missing profile fails closed (error, state unchanged)",
  notices.at(-1).level === "error" && JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"))[CWD] === "scout");

// 8. Switch seats → worker
await commands.seat.handler("worker", ctx);
check("switch to worker injects worker profile", start().systemPrompt.includes("# PROFILE: Worker"));

// 9. /seat status shows active seat
await commands.seat.handler("", ctx);
check("status shows active seat + profile size", notices.at(-1).m.includes("Active seat: worker"));

// 10. /seat list — summaries pulled live from profile headings, active marked
await commands.seat.handler("list", ctx);
const listed = notices.at(-1);
check("/seat list marks the active seat", listed.m.includes("● worker"));
check("/seat list leaves inactive seats unmarked", listed.m.includes("○ scout"));
check("/seat list pulls purposes from profile headings", listed.m.includes("execution seat") && listed.m.includes("read-only exploration seat"));
check("/seat list flags missing profiles", listed.m.includes("MISSING"));
check("/seat list is read-only (state unchanged)", JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"))[CWD] === "worker");

// 11. /seat show <seat> — full profile on display, read-only
await commands.seat.handler("show scout", ctx);
check("/seat show scout returns profile content", notices.at(-1).m.includes("# PROFILE: Scout") && notices.at(-1).m.includes("write: none"));
check("/seat show does not switch seats", JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"))[CWD] === "worker");
await commands.seat.handler("show reviewer", ctx);
check("/seat show with missing profile fails closed (error)", notices.at(-1).level === "error");
await commands.seat.handler("show", ctx);
check("/seat show without target warns with usage", notices.at(-1).level === "warning" && notices.at(-1).m.includes("Usage"));

// 12. /seat off → cleared, no injection
await commands.seat.handler("off", ctx);
check("/seat off clears state", JSON.parse(readFileSync(join(HOME, ".pi", "agent", "seat-state.json"), "utf8"))[CWD] === undefined);
check("/seat off stops injection", start() === undefined);
await commands.seat.handler("list", ctx);
check("/seat list with no active seat marks none", !/^●/m.test(notices.at(-1).m));

// 13. Cap: oversized profile truncated with marker
writeFileSync(join(PROFILES, "planner.md"), "# Planner\n" + "x".repeat(20000));
await commands.seat.handler("planner", ctx);
const big = start().systemPrompt;
check("oversized profile truncated with marker", big.includes("[profile truncated") && big.length < 20000);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
