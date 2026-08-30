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
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "contract-fix-"));
mkdirSync(join(FIX, "tools"), { recursive: true });
for (const t of ["lint-contract.mjs", "contract-scope.mjs"]) copyFileSync(join(REPO, "tools", t), join(FIX, "tools", t));
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
  try {
    const out = execFileSync(process.execPath, [join(FIX, "tools", script), ...args], { cwd: FIX, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
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

// 6. contract-scope resolves to scope.json
const SCOPE = join(FIX, "proj", ".pi", "scope.json");
const scopeRun = run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", GRAVITY, "--out", SCOPE]);
check("contract-scope resolves", scopeRun.code === 0 && existsSync(SCOPE));
const scope = JSON.parse(readFileSync(SCOPE, "utf8"));
check("scope carries contract id + registry scopes",
  scope.contract === "task-auth-session-crud" &&
  scope.write.includes("src/lib/domain/auth/**") &&
  scope.read.includes("src/lib/domain/shared/**"));

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
