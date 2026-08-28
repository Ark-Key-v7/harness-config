/**
 * memory-toggle.test.mjs — deterministic regression driver for extensions/memory-toggle.ts
 * Exit 0 = all pass.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = join(HERE, "..", "..", "extensions", "memory-toggle.ts");

// Shim pi package (types only).
const shimDir = join(HERE, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", type: "module", main: "index.mjs", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), "export {};\n");

// Isolate HOME so toggle state never touches the real rig.
const FAKE_HOME = join(HERE, ".mt-home");
rmSync(FAKE_HOME, { recursive: true, force: true });
mkdirSync(FAKE_HOME, { recursive: true });
process.env.HOME = FAKE_HOME;

// Fake project dir.
const PROJ = join(HERE, ".mt-project");
rmSync(PROJ, { recursive: true, force: true });
mkdirSync(PROJ, { recursive: true });

const localCopy = join(HERE, ".memory-toggle-under-test.ts");
copyFileSync(EXTENSION_PATH, localCopy);
const mod = await import(pathToFileURL(localCopy).href);

const handlers = {};
const commands = {};
const pi = { on: (e, h) => { handlers[e] = h; }, appendEntry: () => {}, registerCommand: (n, o) => { commands[n] = o; } };
await mod.default(pi);

const notifications = [];
const ctx = {
  cwd: PROJ,
  hasUI: false,
  mode: "print",
  ui: { notify: (m) => notifications.push(m), confirm: async () => true, select: async () => undefined, input: async () => undefined },
};

let failures = 0, checks = 0;
function check(cond, label, extra = "") {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label} ${extra}`); }
}

const baseEvent = { type: "before_agent_start", prompt: "hi", systemPrompt: "BASE_PROMPT", systemPromptOptions: {} };

// 1. Default: disabled → no injection
{
  const r = await handlers["before_agent_start"](baseEvent, ctx);
  check(r === undefined, "default state injects nothing");
}

// 2. /memory on → creates file + gitignore, enables state
await commands["memory"].handler("on", ctx);
check(existsSync(join(PROJ, ".pi", "memory.md")), "on: memory.md created");
check(existsSync(join(PROJ, ".pi", ".gitignore")), "on: .pi/.gitignore created (telemetry not law)");
check(notifications.some((m) => m.includes("ON")), "on: operator notified");

// 3. Enabled + empty memory → usage block without contents section
{
  const r = await handlers["before_agent_start"](baseEvent, ctx);
  check(typeof r?.systemPrompt === "string" && r.systemPrompt.startsWith("BASE_PROMPT"), "injection appends to existing prompt");
  check(r.systemPrompt.includes("Project memory (enabled)"), "usage block injected");
  check(r.systemPrompt.includes("empty or does not exist"), "empty-memory note present");
}

// 4. Write memory content → injected fresh next turn
writeFileSync(join(PROJ, ".pi", "memory.md"), "# Project memory\n\n- build: npm run build\n- test: npm test\n");
{
  const r = await handlers["before_agent_start"](baseEvent, ctx);
  check(r.systemPrompt.includes("build: npm run build"), "memory content injected fresh");
  check(r.systemPrompt.includes("### Current memory contents"), "contents section present");
}

// 5. Oversized memory → truncated with marker
writeFileSync(join(PROJ, ".pi", "memory.md"), "x".repeat(20000));
{
  const r = await handlers["before_agent_start"](baseEvent, ctx);
  check(r.systemPrompt.includes("memory truncated"), "oversized memory truncated with marker");
  check(Buffer.byteLength(r.systemPrompt) < 20000 + 3000, "injection bounded", `got ${Buffer.byteLength(r.systemPrompt)}`);
}

// 6. /memory (status) → reports ON
notifications.length = 0;
await commands["memory"].handler("", ctx);
check(notifications.some((m) => m.includes("is ON")), "status reports ON");

// 7. /memory off → no injection, file preserved
await commands["memory"].handler("off", ctx);
check(existsSync(join(PROJ, ".pi", "memory.md")), "off: file preserved on disk");
{
  const r = await handlers["before_agent_start"](baseEvent, ctx);
  check(r === undefined, "off: no injection");
}

// 8. Persistence: state survives a "restart" (re-read from disk)
{
  await commands["memory"].handler("on", ctx);
  const stateOn = JSON.parse(readFileSync(join(FAKE_HOME, ".pi", "agent", "memory-state.json"), "utf8"));
  check(stateOn[PROJ] === true, "toggle state persisted to rig-level file keyed by project path");
}

// 9. No model-flippable switch exists
check(typeof handlers["tool_call"] === "undefined" && Object.keys(commands).join(",") === "memory", "only /memory command; no tool lets the model toggle (§5.4)");

// 10. Bad arg → usage warning
notifications.length = 0;
await commands["memory"].handler("banana", ctx);
check(notifications.some((m) => m.includes("Usage:")), "bad arg shows usage");

console.log("—".repeat(60));
if (failures === 0) { console.log(`ALL PASS — 0 failures across ${checks} checks`); process.exit(0); }
console.log(`${failures} FAILURE(S) across ${checks} checks`);
process.exit(1);
