/**
 * state-hook.test.mjs — deterministic driver for WP9 (STATE.md convention +
 * Worktrunk post-create hook contract).
 *
 * Validates: schema → genesis → lint round-trip; E.2 strict-schema rejection
 * (missing keys, unknown keys, bad enums, dual-vocabulary discipline); the
 * wt.toml contract (order, on_failure=abort only, irreducible visibility
 * assertion, append-only evolution).
 *
 * Run from the repo:  node validation/state-hook-smoke/state-hook.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "statehook-fix-"));
for (const t of ["lint-state.mjs", "lint-wt-hook.mjs", "state-genesis.mjs"]) {
  copyFileSync(join(REPO, "bin", t), join(FIX, t));
}
const SCHEMA = join(REPO, "templates", "agents", "schemas", "state.schema.yaml");
const WT = join(REPO, "templates", "wt.toml");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(script, args, allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(FIX, script), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

// --- Genesis → lint round-trip --------------------------------------------------
const STATE = join(FIX, "STATE.md");
const gen = run("state-genesis.mjs", [
  "--schema", SCHEMA, "--contract", "task-auth.md", "--contract-id", "task-auth-session-crud",
  "--worktree", "/home/kamff/projects/app-wt-1", "--branch", "feat/auth", "--out", STATE,
]);
check("genesis succeeds and self-lints", gen.code === 0);
const gtext = readFileSync(STATE, "utf8");
check("genesis fills identity (session, run, contract, worktree, branch)",
  !/^session_id: null/m.test(gtext) && !/^run_id: null/m.test(gtext) &&
  /^contract_id: task-auth-session-crud/m.test(gtext) && /^branch: feat\/auth/m.test(gtext));
check("genesis leaves resolution keys unfilled (law, not pre-filled)",
  /^next_action: null/m.test(gtext) && /^resolved_invariants: \[\]/m.test(gtext));
check("genesis output VALID against E.2", run("lint-state.mjs", [STATE]).code === 0);

// --- Strict schema discipline -------------------------------------------------------
const tamper = (name, fn) => {
  const f = join(FIX, name);
  writeFileSync(f, fn(gtext));
  return f;
};

const missing = run("lint-state.mjs", [tamper("t1.md", (t) => t.replace(/^next_action:.*$/m, ""))], true);
check("missing canon key (next_action) rejected", missing.code === 1 && missing.out.includes("next_action"));

const unknown = run("lint-state.mjs", [tamper("t2.md", (t) => t + "\nmood: optimistic\n")], true);
check("unknown key rejected (strict schema)", unknown.code === 1 && unknown.out.includes("unknown key"));

const badStatus = run("lint-state.mjs", [tamper("t3.md", (t) => t.replace("status: in_progress", "status: vibing"))], true);
check("bad status enum rejected", badStatus.code === 1 && badStatus.out.includes("status"));

const remap = run("lint-state.mjs", [tamper("t4.md", (t) => t.replace("failure_class: null", "failure_class: permission"))], true);
check("remapped vocabulary rejected (permission is an error_class, not a failure_class)", remap.code === 1 && remap.out.includes("failure_class"));

const okError = run("lint-state.mjs", [tamper("t5.md", (t) => t.replace("error_class: null", "error_class: file_not_found"))]);
check("legitimate error_class accepted (dual vocabulary kept separate)", okError.code === 0);

// --- v1.3 failure vocabulary (§4.7 escalation, E.7/§5.10 holdout leak) ---------------
const okNeedsHuman = run("lint-state.mjs", [tamper("t7.md", (t) => t.replace("failure_class: null", "failure_class: needs_human"))]);
check("failure_class: needs_human accepted (v1.3 §4.7 escalation verdict)", okNeedsHuman.code === 0);

const okHoldoutLeak = run("lint-state.mjs", [tamper("t8.md", (t) => t.replace("failure_class: null", "failure_class: holdout_leak"))]);
check("failure_class: holdout_leak accepted (v1.3 E.7/§5.10 tripwire verdict)", okHoldoutLeak.code === 0);

const silentFail = run("lint-state.mjs", [tamper("t6.md", (t) => t.replace("status: in_progress", "status: failed"))], true);
check("status=failed with both vocabularies null rejected", silentFail.code === 1 && silentFail.out.includes("whichever vocabulary applies"));

// --- wt.toml hook contract -------------------------------------------------------------
check("canon wt.toml template VALID", run("lint-wt-hook.mjs", [WT]).code === 0);

const wtText = readFileSync(WT, "utf8");
const wtMut = (name, fn) => {
  const f = join(FIX, name);
  writeFileSync(f, fn(wtText));
  return f;
};

const warn = run("lint-wt-hook.mjs", [wtMut("w1.toml", (t) => t.replace('on_failure = "abort"', 'on_failure = "warn"'))], true);
check("on_failure=warn rejected (no warn-and-continue mode)", warn.code === 1 && warn.out.includes("abort"));

const noAssert = run("lint-wt-hook.mjs", [wtMut("w2.toml", (t) => t.replace(/\[\[hooks\.post_create\.assert\]\][\s\S]*$/, ""))], true);
check("missing pre-flight assertion rejected", noAssert.code === 1);

// Order violation: move assert before mount
const reordered = (() => {
  const m = wtText.match(/(\[\[hooks\.post_create\.mount\]\][\s\S]*?)(\[\[hooks\.post_create\.assert\]\][\s\S]*)$/);
  return wtText.replace(m[0], m[2] + "\n" + m[1]);
})();
writeFileSync(join(FIX, "w3.toml"), reordered);
const order = run("lint-wt-hook.mjs", [join(FIX, "w3.toml")], true);
check("assert-before-mount order violation rejected", order.code === 1 && order.out.includes("order"));

// Append-only: base has an extra assertion, new one drops it
const baseExtra = wtText + `\n[[hooks.post_create.assert]]\nname = "gateway_reachable"\nexec = "true"\non_failure = "abort"\n`;
writeFileSync(join(FIX, "base.toml"), baseExtra);
const dropped = run("lint-wt-hook.mjs", [WT, "--base", join(FIX, "base.toml")], true);
check("removing a base assertion rejected (append-only)", dropped.code === 1 && dropped.out.includes("append-only"));
const kept = run("lint-wt-hook.mjs", [join(FIX, "base.toml"), "--base", WT]);
check("adding an assertion accepted (append-only growth)", kept.code === 0);

// Genesis fail-closed: missing inputs
const noArgs = run("state-genesis.mjs", ["--schema", SCHEMA], true);
check("genesis with missing inputs fails closed", noArgs.code === 1);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
