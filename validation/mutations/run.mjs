#!/usr/bin/env node
/**
 * mutations/run.mjs — the mutation lane (Harness v1.3 §5.10.4).
 *
 * The gate itself is tested with deliberate defects spanning EVERY rung:
 * manifold lint, contract lint, spec orphan, scope denial, holdout leak,
 * guard violation. Each fixture applies a defect to a scratch project and
 * asserts the matching gate CATCHES it. A defect that passes any gate fails
 * the lane. A mutation set concentrated on one rung is invalid — the
 * manifest must name ≥1 fixture per rung, and the runner executes all six.
 *
 * Usage: node validation/mutations/run.mjs
 * Exit 0 = every defect caught, full ladder proven. Exit 1 = a gate leaked.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const RIG = join(HERE, "..", "..");

const manifest = JSON.parse(readFileSync(join(HERE, "manifest.json"), "utf8"));
const RUNGS = ["lint-tmd", "lint-contract", "lint-spec", "scope-denial", "holdout-leak", "guard"];

let failures = 0;
const fail = (m) => { failures++; console.error(`LANE FAIL | ${m}`); };
const caught = (rung, detail) => console.log(`CAUGHT | ${rung} — ${detail}`);

function gate(script, args, cwd) {
  const r = spawnSync(process.execPath, [join(RIG, "bin", script), ...args], { cwd, encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}
function git(cwd, args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if ((r.status ?? 1) !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
}
const SHA = "b".repeat(40);

// --- Rung fixtures: each returns true when the gate CATCHES the defect ---------------

async function mutationLintTmd() {
  const P = mkdtempSync(join(tmpdir(), "mut-tmd-"));
  mkdirSync(join(P, ".tmd"), { recursive: true });
  const prec = { "rules.md": 2, "gravity.md": 1, "promises.md": 3, "glossary.md": 4, "design.md": 5 }; // defect: rules/gravity swapped
  for (const [name, p] of Object.entries(prec)) {
    writeFileSync(join(P, ".tmd", name), `---\nmanifold_version: 1.0.0\nlast_verified: ${SHA}\nprecedence: ${p}\n---\n# ${name}\n## ZONE A\n## ZONE B\n## ZONE C\n\n## Enforcement\nx\n`);
  }
  const r = gate("lint-tmd.mjs", [join(P, ".tmd"), "--strict"]);
  return { ok: r.code === 1 && r.out.includes("precedence"), detail: "swapped precedence rejected" };
}

async function mutationLintContract() {
  const P = mkdtempSync(join(tmpdir(), "mut-contract-"));
  const C = join(P, "task-x.md");
  writeFileSync(C, `# Task Contract: x
manifest:
  contract_id: task-x
  manifold_version: 1.0.0
  sub_graph: auth
  read_closure: [shared]
  regime: subscription
  model_class: executor
  sizing_budget_tokens: 100000
inherit:
  rules: ["NO_UPSTREAM_LEAKS"]
  gravity: ["g"]
  promises: ["p"]
  glossary: ["G"]
must_haves:
  truths:
    - scenario: "s"
      given: ["g"]
      when: ["w"]
      then: ["t"]
  artifacts:
    - "x exists"
holdout: .agents/tasks/task-x.holdout.md
validation_commands: ["true"]
iteration_budget: 1
timeout_seconds: 60
exit_protocol: emits A2A Completion Payload (E.3)
`);
  const r = gate("lint-contract.mjs", [C], P);
  return { ok: r.code === 1 && r.out.includes("trace"), detail: "trace-less contract rejected" };
}

async function mutationLintSpec() {
  const P = mkdtempSync(join(tmpdir(), "mut-spec-"));
  mkdirSync(join(P, "specs", "prd"), { recursive: true });
  writeFileSync(join(P, "specs", "prd", "ghost.md"), `# PRD — ghost
derived_from: specs/intent/nonexistent.md
last_reconciled: 2026-09-01
`);
  const r = gate("lint-spec.mjs", [join(P, "specs"), "--strict"]);
  return { ok: r.code === 1 && r.out.includes("orphan"), detail: "orphan PRD rejected" };
}

async function mutationScopeDenial() {
  const P = mkdtempSync(join(tmpdir(), "mut-scope-"));
  mkdirSync(join(P, "node_modules", "@earendil-works", "pi-coding-agent"), { recursive: true });
  writeFileSync(join(P, "node_modules", "@earendil-works", "pi-coding-agent", "package.json"),
    JSON.stringify({ name: "@earendil-works/pi-coding-agent", version: "0.0.0-shim", type: "module", exports: "./index.mjs" }));
  writeFileSync(join(P, "node_modules", "@earendil-works", "pi-coding-agent", "index.mjs"),
    `export function isToolCallEventType(name, event) { return event?.name === name; }\n`);
  mkdirSync(join(P, "extensions"), { recursive: true });
  copyFileSync(join(RIG, "extensions", "sandbox-guard.ts"), join(P, "extensions", "sandbox-guard.ts"));
  mkdirSync(join(P, ".pi"), { recursive: true });
  writeFileSync(join(P, ".pi", "scope.json"), JSON.stringify({
    contract: "task-x",
    write: ["src/lib/domain/auth/**"],
    read: ["src/lib/domain/auth/**"],
  }));
  const { default: factory } = await import(join(P, "extensions", "sandbox-guard.ts"));
  const handlers = {};
  factory({ on: (ev, fn) => { handlers[ev] = fn; }, registerCommand() {}, appendEntry() {} });
  const ctx = { cwd: P, hasUI: false, ui: { notify() {}, async confirm() { return false; } } };
  const r = await handlers.tool_call(
    { name: "write", input: { path: "src/lib/domain/ui/widget.ts", content: "x" }, toolCallId: "m1" }, ctx);
  return { ok: Boolean(r && r.block === true), detail: "out-of-scope write blocked by sandbox guard" };
}

async function mutationHoldoutLeak() {
  const P = mkdtempSync(join(tmpdir(), "mut-leak-"));
  mkdirSync(join(P, ".agents", "tasks"), { recursive: true });
  mkdirSync(join(P, "src"), { recursive: true });
  writeFileSync(join(P, ".agents", "tasks", "task-x.holdout.md"), `holdout_for: task-x
scenarios:
  - scenario: "s"
    given: ["g"]
    when: ["w"]
    then: ["the request is rejected with an authentication failure"]
verification: raw
`);
  writeFileSync(join(P, "src", "README.md"), "# fixture\n");
  git(P, ["init", "-q"]);
  git(P, ["add", "."]);
  git(P, ["-c", "user.email=fixture@rig", "-c", "user.name=fixture", "commit", "-qm", "baseline"]);
  writeFileSync(join(P, "src", "worker-output.md"),
    "Note: the request is rejected with an authentication failure, as required.\n");
  const r = gate("tripwire.mjs", ["--target", P]);
  return { ok: r.code === 1 && r.out.includes("HOLDOUT LEAK"), detail: "leaked then-clause detected by tripwire" };
}

async function mutationGuard() {
  const r = spawnSync(process.execPath, [join(RIG, "bin", "guard.mjs"), "--paths", "-"],
    { encoding: "utf8", input: "src/lib/x.ts\n.tmd/rules.md\n" });
  const out = String(r.stdout ?? "") + String(r.stderr ?? "");
  return { ok: (r.status ?? 1) === 2 && out.includes(".tmd/rules.md"), detail: "protected-path diff rejected by CI twin" };
}

const FIXTURES = {
  "lint-tmd": mutationLintTmd,
  "lint-contract": mutationLintContract,
  "lint-spec": mutationLintSpec,
  "scope-denial": mutationScopeDenial,
  "holdout-leak": mutationHoldoutLeak,
  "guard": mutationGuard,
};

// --- Lane law: coverage first, then sensitivity --------------------------------------
const manifestRungs = new Set((manifest.rungs ?? []).map((r) => r.rung));
for (const rung of RUNGS) {
  if (!manifestRungs.has(rung)) fail(`manifest missing rung "${rung}" — a mutation set concentrated on one rung is itself invalid (§5.10.4)`);
}
if (failures > 0) {
  console.error(`\nMUTATION LANE INVALID — coverage incomplete`);
  process.exit(1);
}

console.log(`MUTATION LANE — ${RUNGS.length} rungs, manifest coverage complete`);
for (const rung of RUNGS) {
  const m = (manifest.rungs ?? []).find((r) => r.rung === rung);
  try {
    const res = await FIXTURES[rung]();
    if (res.ok) caught(rung, `${res.detail} (defect: ${m.defect})`);
    else fail(`${rung}: defect PASSED the gate — ${m.defect}`);
  } catch (e) {
    fail(`${rung}: fixture error — ${e.message}`);
  }
}

console.log("—".repeat(70));
if (failures > 0) {
  console.error(`MUTATION LANE RED — ${failures} gate(s) leaked or errored`);
  process.exit(1);
}
console.log(`MUTATION LANE GREEN — every rung caught its defect; the ladder is proven`);
process.exit(0);
