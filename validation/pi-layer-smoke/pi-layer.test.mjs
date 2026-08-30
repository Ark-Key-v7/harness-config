/**
 * pi-layer.test.mjs — deterministic driver for WP8 project .pi/ template +
 * MCP curation gate.
 *
 * Validates WP8 acceptance: "a fresh project initialized from templates/
 * boots Pi with the committed .pi/ layer and no manual configuration;
 * .mcp.json contains only curated, pinned servers (empty is valid)."
 *
 * Run from the repo:  node validation/pi-layer-smoke/pi-layer.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "pilayer-fix-"));
copyFileSync(join(REPO, "tools", "lint-mcp.mjs"), join(FIX, "lint-mcp.mjs"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function lint(file, extra = [], allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, "lint-mcp.mjs"), file, ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

// --- Fresh-project boot (WP8 acceptance) -------------------------------------
const PROJ = join(FIX, "fresh-project");
mkdirSync(PROJ, { recursive: true });
cpSync(join(REPO, "templates", "pi"), join(PROJ, ".pi"), { recursive: true });

// 1. The layer copied wholesale — all four files present
const layerFiles = ["settings.json", ".mcp.json", ".gitignore", "README.md"];
check("fresh .pi/ layer carries all four files", layerFiles.every((f) => existsSync(join(PROJ, ".pi", f))));

// 2. settings.json parses and carries NO _-prefixed meta keys (WP8 strips them)
const settings = JSON.parse(readFileSync(join(PROJ, ".pi", "settings.json"), "utf8"));
check("settings.json parses, meta keys stripped", Object.keys(settings).every((k) => !k.startsWith("_")));

// 3. Committed .mcp.json is valid by curation law (empty is valid)
check("template .mcp.json passes lint (empty is valid)", lint(join(PROJ, ".pi", ".mcp.json")).code === 0);

// 4. .gitignore covers the resolved artifacts
const gi = readFileSync(join(PROJ, ".pi", ".gitignore"), "utf8");
check(".gitignore covers scope.json + memory.md", gi.includes("scope.json") && gi.includes("memory.md"));

// 5. package-pins.json records pi-mcp-adapter exact pin
const pins = JSON.parse(readFileSync(join(REPO, "package-pins.json"), "utf8"));
check("package-pins.json pins pi-mcp-adapter exactly", /^\d+\.\d+\.\d+$/.test(pins.pins["pi-mcp-adapter"].version));

// --- lint-mcp curation rulings ------------------------------------------------
const mcpCase = (name, doc) => {
  const f = join(FIX, `${name}.json`);
  writeFileSync(f, JSON.stringify(doc, null, 2));
  return f;
};

// 6. Unpinned (bare) package rejected
const bare = lint(mcpCase("bare", { mcpServers: { serena: { command: "npx", args: ["-y", "serena-mcp"] } } }), [], true);
check("bare package rejected (not exact-pinned)", bare.code === 1 && bare.out.includes("not exact-pinned"));

// 7. "latest" tag rejected
const latest = lint(mcpCase("latest", { mcpServers: { x: { command: "npx", args: ["-y", "pkg@latest"] } } }), [], true);
check("@latest rejected", latest.code === 1 && latest.out.includes("not exact-pinned"));

// 8. Exact-pinned scoped package accepted
check("scoped exact pin accepted", lint(mcpCase("pinned", { mcpServers: { ctx7: { command: "npx", args: ["-y", "@upstash/context7-mcp@2.1.0"] } } })).code === 0);

// 9. HTTP transport rejected by default
const http = lint(mcpCase("http", { mcpServers: { remote: { url: "https://mcp.example.com/sse" } } }), [], true);
check("HTTP transport rejected (stdio default)", http.code === 1 && http.out.includes("HTTP transport"));

// 10. HTTP allowed only with flag AND named consumer
const httpNamed = mcpCase("http2", { mcpServers: { remote: { url: "https://mcp.example.com/sse", consumer: "ci-refinery" } } });
check("HTTP with consumer but no flag still rejected", lint(httpNamed, [], true).code === 1);
check("HTTP with flag + consumer accepted", lint(httpNamed, ["--allow-http"]).code === 0);

// 11. Deprecated capabilities rejected
const dep = lint(mcpCase("dep", { mcpServers: { old: { command: "npx", args: ["-y", "pkg@1.0.0"], sampling: {} } } }), [], true);
check("deprecated capability (sampling) rejected", dep.code === 1 && dep.out.includes("deprecated capability"));

// 12. Unparseable JSON fails closed
const badJson = join(FIX, "bad.json");
writeFileSync(badJson, "{ not json");
check("unparseable .mcp.json fails closed", lint(badJson, [], true).code === 1);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
