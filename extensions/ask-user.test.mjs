/**
 * ask-user.test.mjs — deterministic regression driver for extensions/ask-user.ts
 * Exit 0 = all pass.
 */

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = join(HERE, "..", "..", "sources", "harness-config", "extensions", "ask-user.ts");

// Shim pi package + typebox (minimal Type subset used by the schema).
const shimDir = join(HERE, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", type: "module", main: "index.mjs", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), "export {};\n");

const typeboxDir = join(HERE, "node_modules", "typebox");
mkdirSync(typeboxDir, { recursive: true });
writeFileSync(join(typeboxDir, "package.json"), JSON.stringify({ name: "typebox", type: "module", main: "index.mjs", exports: "./index.mjs" }));
writeFileSync(join(typeboxDir, "index.mjs"),
  "export const Type = { Object: (o) => ({ o }), String: (o) => ({ s: o }), Array: (o, oo) => ({ a: o, oo }), Optional: (x) => x, Boolean: (o) => ({ b: o }) };\n");

const localCopy = join(HERE, ".ask-user-under-test.ts");
copyFileSync(EXTENSION_PATH, localCopy);
const mod = await import(pathToFileURL(localCopy).href);

const tools = {};
const pi = { on: () => {}, appendEntry: () => {}, registerTool: (def) => { tools[def.name] = def; } };
await mod.default(pi);

let failures = 0, checks = 0;
function check(cond, label, extra = "") {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label} ${extra}`); }
}

check(typeof tools["ask_user"] === "object", "ask_user tool registered");
check(typeof tools["ask_user"]?.description === "string" && tools["ask_user"].description.includes("Precondition"), "description states preconditions");

const exec = tools["ask_user"].execute;

// 1. Options path → select returns a typed choice
{
  const ctx = { hasUI: true, ui: { select: async (q, opts) => (check(q === "Pick a color" && opts.length === 3, "select received question + 3 options"), "blue"), input: async () => "unused" } };
  const r = await exec("t1", { question: "Pick a color", options: ["red", "green", "blue"] }, undefined, undefined, ctx);
  check(r.content[0].text === "OPERATOR ANSWER: blue", "options path returns operator answer", JSON.stringify(r.content));
  check(r.details?.answered === true, "details.answered=true");
}

// 2. Free-text path (no options) → input
{
  const ctx = { hasUI: true, ui: { select: async () => "unused", input: async (q) => "the answer is 42" } };
  const r = await exec("t2", { question: "What is the answer?" }, undefined, undefined, ctx);
  check(r.content[0].text === "OPERATOR ANSWER: the answer is 42", "free-text path returns answer");
}

// 3. allowFreeText with options → "(other)" branch falls through to input
{
  const ctx = { hasUI: true, ui: { select: async (_q, opts) => (check(opts[opts.length - 1] === "(other — type a custom answer)", "other option appended"), "(other — type a custom answer)"), input: async () => "custom answer" } };
  const r = await exec("t3", { question: "Q", options: ["a", "b"], allowFreeText: true }, undefined, undefined, ctx);
  check(r.content[0].text === "OPERATOR ANSWER: custom answer", "allowFreeText custom answer returned");
}

// 4. Dismissed dialog → unanswered guidance
{
  const ctx = { hasUI: true, ui: { select: async () => undefined, input: async () => undefined } };
  const r = await exec("t4", { question: "Q", options: ["a", "b"] }, undefined, undefined, ctx);
  check(r.content[0].text.includes("DISMISSED"), "dismissed dialog returns unanswered guidance");
}

// 5. Non-UI mode → prose guidance, not a block
{
  const ctx = { hasUI: false, ui: {} };
  const r = await exec("t5", { question: "Q" }, undefined, undefined, ctx);
  check(r.content[0].text.includes("INTERACTIVE UI UNAVAILABLE"), "non-UI degrades to prose guidance");
  check(r.details?.reason === "no_ui", "non-UI details.reason=no_ui");
}

// 6. UI throws → graceful error content
{
  const ctx = { hasUI: true, ui: { select: async () => { throw new Error("boom"); }, input: async () => { throw new Error("boom"); } } };
  const r = await exec("t6", { question: "Q" }, undefined, undefined, ctx);
  check(r.content[0].text.includes("ask_user failed"), "UI error returns graceful content");
}

console.log("—".repeat(60));
if (failures === 0) { console.log(`ALL PASS — 0 failures across ${checks} checks`); process.exit(0); }
console.log(`${failures} FAILURE(S) across ${checks} checks`);
process.exit(1);
