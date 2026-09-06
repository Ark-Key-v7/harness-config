/**
 * onboard.test.mjs — deterministic driver for WP10 (TMD onboarding).
 *
 * Spec acceptance: "the workflow executed end-to-end on a fixture repo
 * produces a valid, stamped manifold that WP2's guard can enforce and WP3's
 * generator can project."
 *
 * Validates: scaffolding placement (incl. dotfiles), projection verbatim
 * copy, placed layer passes its own lints, fail-closed re-run, and the
 * onboarded fixture resolving a contract → scope → WP2 guard end-to-end.
 *
 * Run from the repo:  node validation/onboard-smoke/onboard.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const FIX = mkdtempSync(join(tmpdir(), "onboard-fix-"));
const PROJ = join(FIX, "fixture-product");
mkdirSync(PROJ, { recursive: true });

// Shim for the WP2 guard import
const shimDir = join(FIX, "node_modules", "@earendil-works", "pi-coding-agent");
mkdirSync(shimDir, { recursive: true });
writeFileSync(join(shimDir, "package.json"), JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }));
writeFileSync(join(shimDir, "index.mjs"), `export function isToolCallEventType(name, event) { return event?.name === name; }\n`);
const EXT_LOCAL = join(FIX, ".sandbox-guard-under-test.ts");
copyFileSync(join(REPO, "extensions", "sandbox-guard.ts"), EXT_LOCAL);
process.env.HOME = mkdtempSync(join(tmpdir(), "onboard-home-"));

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function run(script, args, allowFail = false) {
  try {
    const out = execFileSync(process.execPath, [join(REPO, "bin", script), ...args], { cwd: PROJ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (err) {
    if (allowFail) return { code: err.status ?? 1, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
    throw err;
  }
}

// 1. Onboarding runs clean on a fresh fixture
const onboard = run("onboard-project.mjs", ["--target", PROJ]);
check("onboarding exits 0 on fresh repo", onboard.code === 0);

// 2. All layers placed — including the dotfiles (WP8 lesson)
const expected = [
  "AGENTS.md",
  ".tmd/rules.md", ".tmd/gravity.md", ".tmd/promises.md", ".tmd/glossary.md", ".tmd/design.md",
  ".pi/settings.json", ".pi/.mcp.json", ".pi/.gitignore", ".pi/README.md", ".pi/append-system.md",
  ".agents/profiles/scout.md", ".agents/profiles/planner.md", ".agents/profiles/worker.md", ".agents/profiles/reviewer.md",
  ".agents/skills/rig-change/SKILL.md", ".agents/skills/pr-review/SKILL.md", ".agents/skills/tool-intake/SKILL.md", ".agents/skills/template-skill/SKILL.md",
  ".agents/schemas/state.schema.yaml",
];
const missing = expected.filter((f) => !existsSync(join(PROJ, f)));
check(`all ${expected.length} layer files placed (dotfiles included)`, missing.length === 0);
if (missing.length > 0) console.log(`    missing: ${missing.join(", ")}`);
check(".agents/tasks/ created (contract home)", existsSync(join(PROJ, ".agents", "tasks")));
// WP-A: Phase-0 chain scaffold (TCE v2.1 §2.A)
for (const d of ["specs/intent", "specs/prd", "specs/plans"]) {
  check(`specs scaffold: ${d}/ exists`, existsSync(join(PROJ, d)));
}

// 3. Projection copied verbatim with its source_head marker (L5 — referenced, not regenerated)
const proj = readFileSync(join(PROJ, ".pi", "append-system.md"), "utf8");
const rigProj = readFileSync(join(REPO, "projections", "pi", "append-system.md"), "utf8");
check("append-system.md is byte-identical to the committed projection", proj === rigProj);
check("projection carries a source_head marker", /<!-- source_head: [0-9a-f]{7,40} -->/.test(proj));

// 4. The placed layer passes its own lints (onboard already runs them; re-verify independently)
check("placed .tmd passes lint-tmd (template mode) + AGENTS.md ≤50 lines",
  run("lint-tmd.mjs", [join(PROJ, ".tmd"), "--agents", join(PROJ, "AGENTS.md")]).code === 0);
check("placed .mcp.json passes lint-mcp (empty is valid)", run("lint-mcp.mjs", [join(PROJ, ".pi", ".mcp.json")]).code === 0);

// 5. Re-run refuses to overwrite (fail-closed — protects human-filled Zone C)
const rerun = run("onboard-project.mjs", ["--target", PROJ], true);
check("re-run refuses to overwrite (fail-closed)", rerun.code === 1 && rerun.out.includes("refusing to overwrite"));

// 6. End-to-end on the onboarded fixture: human fills Registry → contract → scope → guard
//    (Phases 2+4 simulated: Zone C filled, then the mechanical chain enforced.)
const gravity = readFileSync(join(PROJ, ".tmd", "gravity.md"), "utf8");
check("gravity template carries the Registry slot to fill", gravity.includes("subgraphs"));

// Simulate the human filling the Registry (fixture: one auth sub-graph) —
// the fill REPLACES the Zone C TEMPLATE_VALUE_REQUIRED slot that follows the
// subgraphs teaching comment; it does not append a parallel block.
const REGISTRY_FILL = `\`\`\`yaml
subgraphs:
  - name: auth
    paths: [src/lib/domain/auth/**]
    owning_role: worker
    write_scope: [src/lib/domain/auth/**, tests/auth/**]
    read_scope: [src/lib/domain/auth/**, tests/auth/**, src/lib/domain/shared/**]
    dependency_edges: [shared]
\`\`\``;
const filledGravity = gravity.replace(
  /(<!--[\s\S]*?subgraphs[\s\S]*?-->)\s*\nTEMPLATE_VALUE_REQUIRED/,
  `$1\n${REGISTRY_FILL}`,
);
check("driver located the Registry Zone C slot", filledGravity !== gravity);
writeFileSync(join(PROJ, ".tmd", "gravity.md"), filledGravity);
// WP-A: the plan slice this contract traces back to (TCE v2.1 §2.A chain)
writeFileSync(join(PROJ, "specs", "plans", "auth.md"), `# PLAN — auth
derived_from: specs/prd/auth.md
last_reconciled: 2026-09-01

## Slices
### S1: session
- crosses layers: domain
- touches: src/lib/domain/auth
- produces: session endpoints
- contract: task-auth
`);
const CONTRACT = join(PROJ, ".agents", "tasks", "task-auth.md");
writeFileSync(CONTRACT, `# Task Contract: auth session
\`\`\`yaml
manifest:
  contract_id: task-auth-session
  manifold_version: 1.0.0
  sub_graph: auth
  read_closure: [shared]
  regime: subscription
  model_class: executor
  sizing_budget_tokens: 100000
  trace: specs/plans/auth.md#S1
inherit:
  rules: ["NO_UPSTREAM_LEAKS"]
  gravity: ["auth may not import from web-ui"]
  promises: ["external fetch timeout 5000ms"]
  glossary: ["Subscriber"]
must_haves:
  truths:
    - scenario: "Expired tokens are rejected"
      given: ["a session token past its expiry"]
      when: ["the middleware processes the request"]
      then: ["the request is rejected"]
  artifacts:
    - "src/lib/domain/auth/session.ts exists and passes tsc --noEmit"
holdout: .agents/tasks/task-auth-session.holdout.md
validation_commands: ["npm test -- auth"]
iteration_budget: 5
timeout_seconds: 1800
exit_protocol: emits A2A Completion Payload (E.3)
\`\`\`
`);
check("filled contract valid against the onboarded manifold's Registry",
  run("lint-contract.mjs", [CONTRACT, "--gravity", join(PROJ, ".tmd", "gravity.md")]).code === 0);

const scope = run("contract-scope.mjs", ["--contract", CONTRACT, "--gravity", join(PROJ, ".tmd", "gravity.md"), "--out", join(PROJ, ".pi", "scope.json")]);
check("contract-scope resolves inside the onboarded project", scope.code === 0 && existsSync(join(PROJ, ".pi", "scope.json")));
const scopeJson = JSON.parse(readFileSync(join(PROJ, ".pi", "scope.json"), "utf8"));
check("holdout read-deny emitted with no active seat (E.7 fail-closed)",
  Array.isArray(scopeJson.read_deny) && scopeJson.read_deny.includes(".agents/tasks/task-auth-session.holdout.md"));

// 7. WP2 guard enforces the resolved scope in the fixture (spec acceptance)
const { default: factory } = await import(EXT_LOCAL);
const handlers = {};
factory({ on: (ev, fn) => { handlers[ev] = fn; }, registerCommand() {}, appendEntry() {} });
mkdirSync(join(PROJ, "src", "lib", "domain", "auth"), { recursive: true });
const ctx = { cwd: PROJ, hasUI: false, ui: { notify() {}, async confirm() { return false; } } };
let idc = 0;
const ev = (name, input) => ({ name, input, toolCallId: `tc-${++idc}` });
const inScope = handlers.tool_call(ev("write", { path: "src/lib/domain/auth/session.ts", content: "x" }), ctx);
const outScope = handlers.tool_call(ev("write", { path: "src/lib/domain/ui/widget.ts", content: "x" }), ctx);
check("WP2 guard: in-scope write allowed in onboarded fixture", inScope === undefined || inScope.block !== true);
check("WP2 guard: out-of-scope write BLOCKED in onboarded fixture", outScope && outScope.block === true);

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
