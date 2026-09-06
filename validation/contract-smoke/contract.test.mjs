/**
 * contract.test.mjs — deterministic driver for WP7 (Task Contract template).
 *
 * Validates: lint-contract rejects the unfilled template and malformed
 * contracts, accepts a filled E.1 contract, cross-checks the Sub-Graph
 * Registry; contract-scope resolves a contract to a .pi/scope.json; and the
 * resolved scope drives the WP2 sandbox guard end-to-end (spec acceptance:
 * "a filled example contract validates against E.1 and drives a WP2 guard
 * test end-to-end").
 *
 * Run from the repo:  node validation/contract-smoke/contract.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "contract-fix-"));
mkdirSync(join(FIX, "bin"), { recursive: true });
for (const t of ["lint-contract.mjs", "contract-scope.mjs"]) copyFileSync(join(REPO, "bin", t), join(FIX, "bin", t));
const TEMPLATE = join(REPO, "templates", "task-contract.md");

// Shim for the WP2 guard import
const shimDir = join(FIX, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), `export function isToolCallEventType(name, event) { return event?.name === name; }\n`);
const EXT_LOCAL = join(FIX, ".sandbox-guard-under-test.ts");
copyFileSync(join(REPO, "extensions", "sandbox-guard.ts"), EXT_LOCAL);

process.env.HOME = mkdtempSync(join(tmpdir(), "contract-home-"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(script, args, allowFail = false) {
  // spawnSync: WARN lines (e.g. holdout-not-authored-yet) live on stderr —
  // capture both streams on success and failure alike.
  const r = spawnSync(process.execPath, [join(FIX, "bin", script), ...args], { cwd: FIX, encoding: "utf8" });
  const res = { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
  if (res.code !== 0 && !allowFail) throw new Error(`${script} failed unexpectedly:\n${res.out}`);
  return res;
}

// --- Fixture gravity with a Registry -----------------------------------------
const GRAVITY = join(FIX, "gravity.md");
writeFileSync(GRAVITY, `# gravity fixture
\`\`\`yaml
subgraphs:
  - name: auth
    paths: [src/lib/domain/auth/**]
    owning_role: worker
    write_scope: [src/lib/domain/auth/**, tests/auth/**]
    read_scope: [src/lib/domain/auth/**, tests/auth/**, src/lib/domain/shared/**]
    dependency_edges: [shared]
\`\`\`
`);

// --- Fixture Phase-0 chain (TCE v2.1 §2.A): plan + slice the contract traces to
mkdirSync(join(FIX, "specs", "plans"), { recursive: true });
writeFileSync(join(FIX, "specs", "plans", "auth.md"), `# PLAN — auth
derived_from: specs/prd/auth.md
last_reconciled: 2026-09-01

## Slices
### S1: session crud
- crosses layers: domain
- touches: src/lib/domain/auth
- produces: session CRUD endpoints
- contract: task-auth-session-crud
`);
mkdirSync(join(FIX, ".agents", "tasks"), { recursive: true });
writeFileSync(join(FIX, ".agents", "tasks", "task-auth-session-crud.holdout.md"), `holdout_for: task-auth-session-crud\nscenarios: []\nverification: raw\n`);

// --- A filled contract (the template's micro-example, completed) -------------
const CONTRACT = join(FIX, "task-auth-session-crud.md");
writeFileSync(CONTRACT, `# Task Contract: auth session CRUD
\`\`\`yaml
manifest:
  contract_id: task-auth-session-crud
  manifold_version: 1.0.0
  sub_graph: auth
  read_closure: [shared]
  regime: subscription
  model_class: executor
  sizing_budget_tokens: 100000
  trace: specs/plans/auth.md#S1
inherit:
  rules: ["NO_UPSTREAM_LEAKS", "NO_HAPPY_PATH_ASSUMPTIONS"]
  gravity: ["auth may not import from web-ui"]
  promises: ["external fetch timeout 5000ms"]
  glossary: ["Subscriber", "TaskContract"]
must_haves:
  truths:
    - scenario: "Expired tokens are rejected"
      given: ["a session token past its expiry"]
      when: ["the authentication middleware processes the request"]
      then: ["the request is rejected with an authentication failure"]
  artifacts:
    - "src/lib/domain/auth/session.ts exists and passes tsc --noEmit"
holdout: .agents/tasks/task-auth-session-crud.holdout.md
validation_commands: ["npm test -- auth", "npm run typecheck"]
iteration_budget: 5
timeout_seconds: 1800
exit_protocol: emits A2A Completion Payload (E.3)
\`\`\`
`);

// 1. Template itself must be REJECTED (unfilled placeholders)
const tplRun = run("lint-contract.mjs", [TEMPLATE], true);
check("unfilled template rejected", tplRun.code === 1 && tplRun.out.includes("TEMPLATE_VALUE_REQUIRED"));

// 2. Filled contract validates against E.1 (+ Registry cross-check)
check("filled contract VALID against E.1 + Registry", run("lint-contract.mjs", [CONTRACT, "--gravity", GRAVITY]).code === 0);

// 3. Missing manifest key caught
writeFileSync(join(FIX, "bad1.md"), readFileSync(CONTRACT, "utf8").replace(/^\s*model_class:.*$/m, ""));
const bad1 = run("lint-contract.mjs", [join(FIX, "bad1.md")], true);
check("missing model_class caught", bad1.code === 1 && bad1.out.includes("model_class"));

// 4. Bad regime caught
writeFileSync(join(FIX, "bad2.md"), readFileSync(CONTRACT, "utf8").replace("regime: subscription", "regime: vibes"));
const bad2 = run("lint-contract.mjs", [join(FIX, "bad2.md")], true);
check("invalid regime caught", bad2.code === 1 && bad2.out.includes("regime"));

// 5. Unregistered sub_graph caught
writeFileSync(join(FIX, "bad3.md"), readFileSync(CONTRACT, "utf8").replace("sub_graph: auth", "sub_graph: phantom"));
const bad3 = run("lint-contract.mjs", [join(FIX, "bad3.md"), "--gravity", GRAVITY], true);
check("unregistered sub_graph caught (must not spawn)", bad3.code === 1 && bad3.out.includes("not registered"));

// 5b. Phase-0 chain law (TCE v2.1 §2.A): missing trace caught
writeFileSync(join(FIX, "bad4.md"), readFileSync(CONTRACT, "utf8").replace(/^\s*trace:.*$/m, ""));
const bad4 = run("lint-contract.mjs", [join(FIX, "bad4.md")], true);
check("missing trace caught", bad4.code === 1 && bad4.out.includes("trace"));

// 5c. Unresolvable trace caught (slice heading absent from the plan)
writeFileSync(join(FIX, "bad5.md"), readFileSync(CONTRACT, "utf8").replace("trace: specs/plans/auth.md#S1", "trace: specs/plans/auth.md#S9"));
const bad5 = run("lint-contract.mjs", [join(FIX, "bad5.md")], true);
check("unresolvable trace caught", bad5.code === 1 && /### S9/.test(bad5.out));

// 5d. Missing holdout file is WARN-pass, never a failure (E.7: authored at review time)
writeFileSync(join(FIX, "warn1.md"), readFileSync(CONTRACT, "utf8")
  .replace(/contract_id: task-auth-session-crud/, "contract_id: task-auth-noholdout")
  .replace(/holdout: \S+/, "holdout: .agents/tasks/task-auth-noholdout.holdout.md"));
const warn1 = run("lint-contract.mjs", [join(FIX, "warn1.md"), "--gravity", GRAVITY], true);
check("missing holdout file warns but passes", warn1.code === 0 && warn1.out.includes("WARN") && warn1.out.includes("holdout"));

// 6. contract-scope resolves to scope.json
const SCOPE = join(FIX, "proj", ".pi", "scope.json");
const scopeRun = run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", GRAVITY, "--out", SCOPE]);
check("contract-scope resolves", scopeRun.code === 0 && existsSync(SCOPE));
const scope = JSON.parse(readFileSync(SCOPE, "utf8"));
check("scope carries contract id + registry scopes",
  scope.contract === "task-auth-session-crud" &&
  scope.write.includes("src/lib/domain/auth/**") &&
  scope.read.includes("src/lib/domain/shared/**"));

// 6b. Holdout read-deny (E.7): seat-aware, fail-closed
//     Project root for seat keying = parent of the --out .pi/ dir (FIX/proj).
const SEAT_STATE = join(process.env.HOME, ".pi", "agent", "seat-state.json");
mkdirSync(dirname(SEAT_STATE), { recursive: true });
const PROJKEY = join(FIX, "proj");

writeFileSync(SEAT_STATE, JSON.stringify({ [PROJKEY]: "worker" }));
run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", GRAVITY, "--out", SCOPE]);
const scopeWorker = JSON.parse(readFileSync(SCOPE, "utf8"));
check("worker seat → holdout read_deny present",
  Array.isArray(scopeWorker.read_deny) && scopeWorker.read_deny.includes(".agents/tasks/task-auth-session-crud.holdout.md"));

writeFileSync(SEAT_STATE, JSON.stringify({ [PROJKEY]: "reviewer" }));
run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", GRAVITY, "--out", SCOPE]);
const scopeReviewer = JSON.parse(readFileSync(SCOPE, "utf8"));
check("reviewer seat → no read_deny (verification runs raw)", !("read_deny" in scopeReviewer));

writeFileSync(SEAT_STATE, JSON.stringify({}));
run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", GRAVITY, "--out", SCOPE]);
const scopeNone = JSON.parse(readFileSync(SCOPE, "utf8"));
check("no seat → read_deny present (fail-closed)",
  Array.isArray(scopeNone.read_deny) && scopeNone.read_deny.length === 1);

// 7. END-TO-END: resolved scope drives the WP2 guard
const { default: factory } = await import(EXT_LOCAL);
const handlers = {};
factory({ on: (ev, fn) => { handlers[ev] = fn; }, registerCommand() {}, appendEntry() {} });
mkdirSync(join(FIX, "proj", "src", "lib", "domain", "auth"), { recursive: true });
const ctx = { cwd: join(FIX, "proj"), hasUI: false, ui: { notify() {}, async confirm() { return false; } } };
let idc = 0;
const ev = (name, input) => ({ name, input, toolCallId: `tc-${++idc}` });
const inScope = handlers.tool_call(ev("write", { path: "src/lib/domain/auth/session.ts", content: "x" }), ctx);
const outScope = handlers.tool_call(ev("write", { path: "src/lib/domain/ui/widget.ts", content: "x" }), ctx);
check("WP2 end-to-end: in-scope write allowed under resolved contract", inScope === undefined || inScope.block !== true);
check("WP2 end-to-end: out-of-scope write BLOCKED under resolved contract", outScope && outScope.block === true);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
