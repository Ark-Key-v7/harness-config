/**
 * sandbox-guard.test.mjs — deterministic driver for factory-sandbox-guard (WP2).
 *
 * Canon §3.2/§3.10 validation: scope enforcement across write/edit/read/grep/
 * find/ls, the enumerated bash mutation classes, fail-closed unresolvables,
 * malformed-scope fail-closed, and the stale-read guard.
 *
 * Run from the repo:  node validation/sandbox-guard-smoke/sandbox-guard.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed (see output).
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, copyFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));

// --- Shim the pi-coding-agent package (type imports are erased at runtime;
//     the only runtime import is isToolCallEventType) -------------------------
const shimDir = join(HERE, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(
  join(shimDir, "package.json"),
  JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }),
);
writeFileSync(
  join(shimDir, "index.mjs"),
  `export function isToolCallEventType(name, event) { return event?.name === name; }\n`,
);

// Isolate rig-level logs: HOME -> temp, before importing the extension.
const FAKE_HOME = mkdtempSync(join(tmpdir(), "sg-home-"));
process.env.HOME = FAKE_HOME;

// Copy the extension next to this driver so the relative import resolves to
// the shim's node_modules.
const EXT_SRC = join(HERE, "..", "..", "extensions", "sandbox-guard.ts");
const EXT_LOCAL = join(HERE, ".sandbox-guard-under-test.ts");
copyFileSync(EXT_SRC, EXT_LOCAL);
const { default: factory } = await import(EXT_LOCAL);

// --- Mock pi + ctx -----------------------------------------------------------
const handlers = {};
const entries = [];
const pi = {
  on: (ev, fn) => { handlers[ev] = fn; },
  registerCommand: (n, c) => { handlers[`cmd:${n}`] = c; },
  appendEntry: (type, data) => entries.push({ type, data }),
};
factory(pi);

// --- Fixture repo: two-node scope --------------------------------------------
// write: src/a/**        read: src/a/**, src/shared/**, package.json
const REPO = mkdtempSync(join(tmpdir(), "sg-repo-"));
mkdirSync(join(REPO, "src", "a"), { recursive: true });
mkdirSync(join(REPO, "src", "b"), { recursive: true });
mkdirSync(join(REPO, "src", "shared"), { recursive: true });
mkdirSync(join(REPO, ".tmd"), { recursive: true });
mkdirSync(join(REPO, ".pi"), { recursive: true });
writeFileSync(join(REPO, "src", "a", "keep.ts"), "export const a = 1;\n");
writeFileSync(join(REPO, "src", "b", "secret.ts"), "export const b = 2;\n");
writeFileSync(join(REPO, "src", "shared", "util.ts"), "export const u = 3;\n");
writeFileSync(join(REPO, "package.json"), "{}\n");
writeFileSync(join(REPO, ".tmd", "gravity.md"), "# gravity\n");
writeFileSync(
  join(REPO, ".pi", "scope.json"),
  JSON.stringify({ contract: "fixture-001", write: ["src/a/**"], read: ["src/a/**", "src/shared/**", "package.json"] }),
);

const ctx = {
  cwd: REPO,
  hasUI: false,
  ui: { notify() {}, async confirm() { return false; }, async select() { return 0; }, async input() { return ""; } },
};

let idc = 0;
function callEvent(name, input) {
  return { name, input, toolCallId: `tc-${++idc}` };
}
function resultEvent(toolName, input, isError = false) {
  return { toolName, input, toolCallId: `tr-${++idc}`, isError };
}

// --- Check harness -------------------------------------------------------------
let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
const blocked = (r) => r && r.block === true;
const allowed = (r) => r === undefined || r.block !== true;

// --- Scope-active enforcement ---------------------------------------------------
check("write in scope allowed", allowed(handlers.tool_call(callEvent("write", { path: "src/a/new.ts", content: "x" }), ctx)));
check("write out of scope blocked", blocked(handlers.tool_call(callEvent("write", { path: "src/b/evil.ts", content: "x" }), ctx)));
check("edit out of scope blocked", blocked(handlers.tool_call(callEvent("edit", { path: "src/b/secret.ts", edits: [{ oldText: "2", newText: "3" }] }), ctx)));
check("path escape (../) blocked", blocked(handlers.tool_call(callEvent("write", { path: "../outside.ts", content: "x" }), ctx)));
check("scope file itself blocked", blocked(handlers.tool_call(callEvent("write", { path: ".pi/scope.json", content: "{}" }), ctx)));
check(".tmd/ writes blocked (governance surface)", blocked(handlers.tool_call(callEvent("write", { path: ".tmd/gravity.md", content: "x" }), ctx)));
check("read in read-closure allowed", allowed(handlers.tool_call(callEvent("read", { path: "src/shared/util.ts" }), ctx)));
check("read of write-scope path allowed", allowed(handlers.tool_call(callEvent("read", { path: "src/a/keep.ts" }), ctx)));
check("read out of closure blocked (discovery counts)", blocked(handlers.tool_call(callEvent("read", { path: "src/b/secret.ts" }), ctx)));
check("grep out of closure blocked", blocked(handlers.tool_call(callEvent("grep", { pattern: "secret", path: "src/b" }), ctx)));
check("grep in closure allowed", allowed(handlers.tool_call(callEvent("grep", { pattern: "util", path: "src/shared" }), ctx)));
check("find out of closure blocked", blocked(handlers.tool_call(callEvent("find", { pattern: "*.ts", path: "src/b" }), ctx)));
check("ls out of closure blocked", blocked(handlers.tool_call(callEvent("ls", { path: "src/b" }), ctx)));
check("ls of project root blocked (no scope entry)", blocked(handlers.tool_call(callEvent("ls", {}), ctx)));

// --- Bash channel -----------------------------------------------------------------
check("bash: no mutation classes allowed", allowed(handlers.tool_call(callEvent("bash", { command: "npm test -- --watch=false" }), ctx)));
check("bash: redirect in scope allowed", allowed(handlers.tool_call(callEvent("bash", { command: "echo hi > src/a/log.txt" }), ctx)));
check("bash: redirect out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "echo hi > src/b/log.txt" }), ctx)));
check("bash: append redirect out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "echo hi >> ../escape.txt" }), ctx)));
check("bash: tee out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "echo x | tee src/b/t.txt" }), ctx)));
check("bash: sed -i in scope allowed", allowed(handlers.tool_call(callEvent("bash", { command: "sed -i 's/a/b/' src/a/keep.ts" }), ctx)));
check("bash: sed -i out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "sed -i 's/2/3/' src/b/secret.ts" }), ctx)));
check("bash: dd of= out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "dd if=/dev/zero of=src/b/img bs=1k count=1" }), ctx)));
check("bash: git checkout -- out of scope blocked", blocked(handlers.tool_call(callEvent("bash", { command: "git checkout -- src/b/secret.ts" }), ctx)));
check("bash: git restore in scope allowed", allowed(handlers.tool_call(callEvent("bash", { command: "git restore src/a/keep.ts" }), ctx)));
check("bash: git apply fails closed (unresolvable)", blocked(handlers.tool_call(callEvent("bash", { command: "git apply fix.patch" }), ctx)));
check("bash: patch fails closed (unresolvable)", blocked(handlers.tool_call(callEvent("bash", { command: "patch -p1 < fix.patch" }), ctx)));
check("bash: dynamic redirect target fails closed", blocked(handlers.tool_call(callEvent("bash", { command: "echo x > $OUT_FILE" }), ctx)));
check("bash: npm install blocked (package.json not in write scope)", blocked(handlers.tool_call(callEvent("bash", { command: "npm install lodash" }), ctx)));
check("bash: multi-segment with out-of-scope tail blocked", blocked(handlers.tool_call(callEvent("bash", { command: "echo ok > src/a/fine.txt && echo nope > src/b/nope.txt" }), ctx)));

// --- Stale-read guard ---------------------------------------------------------------
const STALE = join(REPO, "src", "a", "keep.ts");
// baseline the read
handlers.tool_result(resultEvent("read", { path: "src/a/keep.ts" }), ctx);
// out-of-band change bumps mtime
writeFileSync(STALE, "export const a = 999;\n");
const future = new Date(Date.now() + 5000);
utimesSync(STALE, future, future);
check("stale-read: write blocked after out-of-band change", blocked(handlers.tool_call(callEvent("write", { path: "src/a/keep.ts", content: "x" }), ctx)));
// agent re-reads -> baseline refreshed -> write allowed
handlers.tool_result(resultEvent("read", { path: "src/a/keep.ts" }), ctx);
check("stale-read: write allowed after re-read", allowed(handlers.tool_call(callEvent("write", { path: "src/a/keep.ts", content: "x" }), ctx)));
// our own write re-baselines
handlers.tool_result(resultEvent("write", { path: "src/a/keep.ts" }), ctx);
check("stale-read: second consecutive write allowed (self re-baseline)", allowed(handlers.tool_call(callEvent("write", { path: "src/a/keep.ts", content: "y" }), ctx)));

// --- Inert without scope -------------------------------------------------------------
const REPO2 = mkdtempSync(join(tmpdir(), "sg-repo2-"));
const ctx2 = { ...ctx, cwd: REPO2 };
check("no scope file -> guard inert (write allowed)", allowed(handlers.tool_call(callEvent("write", { path: "anything/deep.ts", content: "x" }), ctx2)));
check("no scope file -> guard inert (bash redirect allowed)", allowed(handlers.tool_call(callEvent("bash", { command: "echo hi > any.txt" }), ctx2)));

// --- Malformed scope fails closed ------------------------------------------------------
writeFileSync(join(REPO2, ".pi-scope-probe", ""), "");
mkdirSync(join(REPO2, ".pi"), { recursive: true });
writeFileSync(join(REPO2, ".pi", "scope.json"), "{ not json");
check("malformed scope.json fails closed on write", blocked(handlers.tool_call(callEvent("write", { path: "x.ts", content: "x" }), ctx2)));
check("malformed scope.json fails closed on read", blocked(handlers.tool_call(callEvent("read", { path: "x.ts" }), ctx2)));

// --- Logging -----------------------------------------------------------------------------
const logFile = join(FAKE_HOME, ".pi", "agent", "logs", "sandbox-guard.jsonl");
check("blocks are logged to sandbox-guard.jsonl", existsSync(logFile) && readFileSync(logFile, "utf8").includes('"event":"block"'));

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
