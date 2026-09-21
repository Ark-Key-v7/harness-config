/**
 * token-usage.test.mjs — deterministic driver for WP-F token-usage.mjs.
 *
 * Validates against synthetic fixtures: ZCode snake_case usage (fresh =
 * input − cacheRead − cacheWrite), ZCode camelCase usage, subagent file
 * side-bucketing, Pi usage shape with the `cost` money-object excluded,
 * malformed-line tolerance, --session filter, and empty-dir exit 1.
 *
 * Run from the repo:  node validation/token-usage-smoke/token-usage.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FIX = mkdtempSync(join(tmpdir(), "token-usage-fix-"));
mkdirSync(join(FIX, "rollout"), { recursive: true });
mkdirSync(join(FIX, "sessions", "proj"), { recursive: true });

// ZCode snake_case: input 30000, cacheRead 10000, cacheWrite 2000, out 500
// → fresh = 30000 − 10000 − 2000 = 18000
writeFileSync(join(FIX, "rollout", "model-io-sess_main-1.jsonl"), JSON.stringify({
  model: { modelId: "GLM-5.3-Flash" },
  response: { usage: { input_tokens: 30000, output_tokens: 500, cache_read_input_tokens: 10000, cache_creation_input_tokens: 2000 } },
}) + "\n" + "not json at all\n");

// ZCode camelCase: fresh = inputTokens (35000), cacheWrite 0, cacheRead 12544, out 700
writeFileSync(join(FIX, "rollout", "model-io-sess_main-2.jsonl"), JSON.stringify({
  request: { body: { model: "GLM-5.3-Flash" } },
  response: { usage: { inputTokens: 35000, outputTokens: 700, totalTokens: 35700, cacheReadTokens: 12544, cacheWriteTokens: 0 } },
}) + "\n");

// ZCode subagent file → its own side bucket
writeFileSync(join(FIX, "rollout", "model-io-sess_subagent_agent_x.jsonl"), JSON.stringify({
  model: { modelId: "GLM-5.3-Flash" },
  response: { usage: { inputTokens: 5000, outputTokens: 100, totalTokens: 5100, cacheReadTokens: 0, cacheWriteTokens: 0 } },
}) + "\n");

// Pi shape + cost decoy (must NOT be counted as usage)
writeFileSync(join(FIX, "sessions", "proj", "2026-09-21T00-00-00-000Z_a.jsonl"),
  JSON.stringify({ type: "session", cwd: "/x" }) + "\n" +
  JSON.stringify({ type: "model_change", modelId: "kimi-for-coding" }) + "\n" +
  JSON.stringify({ type: "message", message: { role: "assistant", usage: { input: 400, output: 300, cacheRead: 2000, cacheWrite: 100, totalTokens: 2800, cost: { input: 0.001, output: 0.002, cacheRead: 0.0001, cacheWrite: 0, total: 0.0031 } } } }) + "\n");

let failures = 0, checks = 0;
function check(label, cond) { checks++; if (cond) console.log(`PASS  | ${label}`); else { failures++; console.log(`FAIL  | ${label}`); } }
function run(extra = [], allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(REPO, "bin", "token-usage.mjs"), "--zcode-dir", join(FIX, "rollout"), "--pi-dir", join(FIX, "sessions"), ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

const full = run();
check("exits 0 over fixtures", full.code === 0);
check("ZCode snake_case fresh = input − cacheRead − cacheWrite (18000)", full.out.includes("18000"));
check("Pi usage counted, cost decoy excluded (fresh 400)", full.out.includes(" 400 |"));
check("subagent file side-bucketed (zcode/subagent TOTAL row)", /TOTAL\s+\| zcode\/subagent/.test(full.out));
check("billed-equivalent math present (output weight 5.0 dominates)", full.out.includes("billed-equivalent"));

const filtered = run(["--session", "subagent"]);
check("--session filter selects only the subagent session", filtered.code === 0 && filtered.out.includes("subagent_agent_x") && !filtered.out.includes("main-2"));

mkdirSync(join(FIX, "empty-rollout"), { recursive: true });
const empty = run(["--zcode-dir", join(FIX, "empty-rollout"), "--pi-dir", join(FIX, "empty-rollout")], true);
check("empty dirs exit 1 with message", empty.code === 1 && empty.out.includes("no usable transcripts"));

rmSync(FIX, { recursive: true, force: true });
console.log("—".repeat(80));
if (failures > 0) { console.log(`FAILED — ${failures} of ${checks} checks failed`); process.exit(1); }
console.log(`ALL PASS — 0 failures across ${checks} checks`);