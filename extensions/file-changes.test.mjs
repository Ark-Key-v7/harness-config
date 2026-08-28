/**
 * file-changes.test.mjs — deterministic regression driver for extensions/file-changes.ts
 *
 * Simulates the harness: tool_call snapshots, real filesystem mutation,
 * tool_result logging, then /undo restoration. Exit 0 = all pass.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = join(HERE, "..", "..", "sources", "harness-config", "extensions", "file-changes.ts");

// Shim the pi package import (type guards only).
const shimDir = join(HERE, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", type: "module", main: "index.mjs", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"),
  "export function isToolCallEventType(name, event) { return event.toolName === name; }\n" +
  "export function isEditToolResult(e) { return e.toolName === 'edit'; }\n");

const localCopy = join(HERE, ".file-changes-under-test.ts");
copyFileSync(EXTENSION_PATH, localCopy);
const mod = await import(pathToFileURL(localCopy).href);

// Workdir for the simulated session.
const WORK = join(HERE, ".fc-work");
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

// Isolate the log: point HOME at a scratch dir so we don't touch the real one.
const FAKE_HOME = join(HERE, ".fc-home");
rmSync(FAKE_HOME, { recursive: true, force: true });
mkdirSync(FAKE_HOME, { recursive: true });
process.env.HOME = FAKE_HOME;
// homedir() is captured at import time in some Node versions; the extension
// calls homedir() per write, and Node reads process.env.HOME lazily — verified
// on Node 24. If this ever breaks, the log assertions below will fail loudly.

const handlers = {};
const commands = {};
const appended = [];
const notifications = [];
const pi = {
  on: (e, h) => { handlers[e] = h; },
  appendEntry: (t, d) => appended.push({ t, d }),
  registerCommand: (name, opts) => { commands[name] = opts; },
};
await mod.default(pi);

const ctx = {
  cwd: WORK,
  hasUI: false,
  mode: "print",
  ui: { notify: (msg) => notifications.push(msg), confirm: async () => true },
};

let failures = 0, checks = 0;
function check(cond, label, extra = "") {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label} ${extra}`); }
}

const LOG = join(FAKE_HOME, ".pi", "agent", "logs", "file-changes.jsonl");
function logEntries() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// --- Scenario 1: write creates a new file -----------------------------------
await handlers["tool_call"]({ type: "tool_call", toolCallId: "w1", toolName: "write", input: { path: "notes.txt", content: "line1\nline2\n" } }, ctx);
writeFileSync(join(WORK, "notes.txt"), "line1\nline2\n"); // the tool executes
await handlers["tool_result"]({ type: "tool_result", toolCallId: "w1", toolName: "write", input: { path: "notes.txt" }, content: [], isError: false, details: undefined }, ctx);

let entries = logEntries().filter((e) => e.event === "change");
check(entries.length === 1, "write logged as change", `got ${entries.length}`);
check(entries[0]?.existedBefore === false, "write: existedBefore=false (new file)");
check(entries[0]?.linesAfter === 3, "write: linesAfter=3", `got ${entries[0]?.linesAfter}`);

// --- Scenario 2: edit modifies it -------------------------------------------
await handlers["tool_call"]({ type: "tool_call", toolCallId: "e1", toolName: "edit", input: { path: "notes.txt", edits: [{ oldText: "line2", newText: "line2 edited\nline3" }] } }, ctx);
writeFileSync(join(WORK, "notes.txt"), "line1\nline2 edited\nline3\n"); // the tool executes
await handlers["tool_result"]({ type: "tool_result", toolCallId: "e1", toolName: "edit", input: { path: "notes.txt" }, content: [], isError: false, details: { diff: "...", patch: "@@ -1,2 +1,3 @@\n line1\n-line2\n+line2 edited\n+line3" } }, ctx);

entries = logEntries().filter((e) => e.event === "change");
check(entries.length === 2, "edit logged as second change", `got ${entries.length}`);
check(entries[1]?.existedBefore === true, "edit: existedBefore=true");
check(entries[1]?.linesBefore === 3 && entries[1]?.linesAfter === 4, "edit: lines 3→4", `got ${entries[1]?.linesBefore}→${entries[1]?.linesAfter}`);
check(typeof entries[1]?.patch === "string" && entries[1].patch.includes("-line2"), "edit: unified patch captured");

// --- Scenario 3: undo the edit (index 2) ------------------------------------
await commands["undo"].handler("2", ctx);
check(readFileSync(join(WORK, "notes.txt"), "utf8") === "line1\nline2\n", "undo 2: edit reverted, file back to post-write state");

// --- Scenario 4: undo the write (latest = index 1) ---------------------------
await commands["undo"].handler("latest", ctx);
check(!existsSync(join(WORK, "notes.txt")), "undo latest: file created by write was deleted");

const undos = logEntries().filter((e) => e.event === "undo");
check(undos.length === 2, "two undo events logged", `got ${undos.length}`);

// --- Scenario 5: errored tool result logs failure, no change entry ----------
await handlers["tool_call"]({ type: "tool_call", toolCallId: "w2", toolName: "write", input: { path: "never.txt", content: "x" } }, ctx);
await handlers["tool_result"]({ type: "tool_result", toolCallId: "w2", toolName: "write", input: { path: "never.txt" }, content: [], isError: true, details: undefined }, ctx);
check(logEntries().some((e) => e.event === "change_failed" && e.path === "never.txt"), "errored write logged as change_failed");
check(logEntries().filter((e) => e.event === "change").length === 2, "no change entry for errored write");

// --- Scenario 6: session entries appended ------------------------------------
check(appended.filter((a) => a.t === "file-change").length === 2, "appendEntry called per change", `got ${appended.length}`);

console.log("—".repeat(60));
if (failures === 0) { console.log(`ALL PASS — 0 failures across ${checks} checks`); process.exit(0); }
console.log(`${failures} FAILURE(S) across ${checks} checks`);
process.exit(1);
