/**
 * guard.test.mjs — deterministic driver for WP-C gate-integrity guard.
 *
 * Canon: Harness v1.3 §5.10.1 — the protected list lives in code; a guard
 * that cannot determine the diff fails closed (undeterminable = denied).
 *
 * Fixtures: .tmd write (blocked), holdout write (blocked), floor/autonomy
 * writes (blocked), normal src write (allowed), undeterminable bash
 * redirect (blocked), determinable protected bash redirect (blocked),
 * benign bash (allowed). Plus the CI twin bin/guard.mjs: violation exit 2,
 * fail-closed exit 1, clean exit 0.
 *
 * Run from the repo:  node validation/guard-smoke/guard.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "guard-fix-"));
// Extension under test: keep the ../bin/guard-list.mjs relative import intact
mkdirSync(join(FIX, "extensions"), { recursive: true });
mkdirSync(join(FIX, "bin"), { recursive: true });
copyFileSync(join(REPO, "extensions", "guard.ts"), join(FIX, "extensions", "guard.ts"));
copyFileSync(join(REPO, "bin", "guard-list.mjs"), join(FIX, "bin", "guard-list.mjs"));
copyFileSync(join(REPO, "bin", "guard.mjs"), join(FIX, "bin", "guard.mjs"));

// Shim for the pi-coding-agent import
const shimDir = join(FIX, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), `export function isToolCallEventType(name, event) { return event?.name === name; }\n`);

process.env.HOME = mkdtempSync(join(tmpdir(), "guard-home-"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}

const { default: factory } = await import(join(FIX, "extensions", "guard.ts"));
const handlers = {};
factory({ on: (ev, fn) => { handlers[ev] = fn; }, registerCommand() {}, appendEntry() {} });
const PROJ = join(FIX, "proj");
mkdirSync(join(PROJ, "src"), { recursive: true });
const ctx = { cwd: PROJ, hasUI: false, ui: { notify() {}, async confirm() { return false; } } };
let idc = 0;
const ev = (name, input) => ({ name, input, toolCallId: `tc-${++idc}` });
const call = (name, input) => handlers.tool_call(ev(name, input), ctx);

// --- write/edit boundary --------------------------------------------------------------
{
  const r = await call("write", { path: ".tmd/rules.md", content: "x" });
  check(".tmd/ write BLOCKED (manifold is governed-flow only)", r && r.block === true && /5\.10\.1/.test(r.reason));
}
{
  const r = await call("write", { path: ".agents/tasks/task-auth.holdout.md", content: "x" });
  check("holdout write BLOCKED (builder-blind acceptance)", r && r.block === true && /holdout/.test(r.reason));
}
{
  const r = await call("edit", { path: ".agents/floor.json", edits: [] });
  check(".agents/floor.json write BLOCKED (the ratchet)", r && r.block === true);
}
{
  const r = await call("write", { path: ".agents/autonomy.json", content: "{}" });
  check(".agents/autonomy.json write BLOCKED (the dial)", r && r.block === true);
}
{
  const r = await call("write", { path: ".env.production", content: "SECRET=1" });
  check(".env write BLOCKED (secrets pattern)", r && r.block === true);
}
{
  const r = await call("write", { path: "src/lib/domain/auth/session.ts", content: "x" });
  check("normal src write allowed", r === undefined || r.block !== true);
}

// --- bash-with-redirect boundary ---------------------------------------------------------
{
  const r = await call("bash", { command: "echo hacked > .tmd/rules.md" });
  check("bash redirect into .tmd/ BLOCKED", r && r.block === true);
}
{
  const r = await call("bash", { command: "echo payload >> .agents/tasks/t.holdout.md" });
  check("bash append into a holdout BLOCKED", r && r.block === true);
}
{
  const r = await call("bash", { command: "echo x > $TARGET" });
  check("undeterminable redirect target BLOCKED (fail-closed)", r && r.block === true && /fails closed/.test(r.reason));
}
{
  const r = await call("bash", { command: "npm test 2>&1 | tail -5" });
  check("benign bash (fd-dup, pipe) allowed", r === undefined || r.block !== true);
}

// --- CI twin: bin/guard.mjs -----------------------------------------------------------------
function guardCli(args, stdin = null) {
  const r = spawnSync(process.execPath, [join(FIX, "bin", "guard.mjs"), ...args], { encoding: "utf8", input: stdin ?? undefined });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}
{
  const r = guardCli(["--paths", "-"], "src/lib/x.ts\n.tmd/rules.md\n");
  check("CI twin: protected path in diff → exit 2 naming the law", r.code === 2 && /5\.10\.1/.test(r.out) && r.out.includes(".tmd/rules.md"));
}
{
  const r = guardCli(["--paths", "-"], "src/lib/x.ts\nsrc/lib/y.ts\n");
  check("CI twin: clean diff → exit 0", r.code === 0 && r.out.includes("GUARD CLEAN"));
}
{
  const r = guardCli(["--paths", "-"], "");
  check("CI twin: undeterminable diff → exit 1 (fail-closed)", r.code === 1 && /fail-closed|undeterminable/i.test(r.out));
}
{
  const r = guardCli(["--target", join(FIX, "not-a-repo")]);
  check("CI twin: git failure → exit 1 (fail-closed)", r.code === 1);
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
