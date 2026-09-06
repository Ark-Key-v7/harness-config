/**
 * tripwire.test.mjs — deterministic driver for WP-C holdout-leak tripwire.
 *
 * Canon: Harness v1.3 E.7 / §5.10 — holdout-shaped content in worker-authored
 * artifacts is an escalation. Provenance law: a file tracked in git before
 * the run is not evidence; untracked or worker-modified files are.
 *
 * Fixtures: clean run (exit 0), leak in a worker-modified file (exit 1 +
 * STATE.md failure_class: holdout_leak), no leak in a pre-run tracked file
 * (exit 0 — not evidence), non-git target (fail-closed exit 1).
 *
 * Run from the repo:  node validation/tripwire-smoke/tripwire.test.mjs
 * Exit 0 = ALL PASS. Exit 1 = at least one check failed.
 */

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const TOOL = join(REPO, "bin", "tripwire.mjs");

let failures = 0;
let checks = 0;
function check(label, cond) {
  checks++;
  if (cond) console.log(`PASS  | ${label}`);
  else { failures++; console.log(`FAIL  | ${label}`); }
}
function tripwire(target) {
  const r = spawnSync(process.execPath, [TOOL, "--target", target], { encoding: "utf8" });
  return { code: r.status ?? 1, out: String(r.stdout ?? "") + String(r.stderr ?? "") };
}
function git(cwd, args) {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if ((r.status ?? 1) !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
}

const HOLDOUT = `holdout_for: task-auth-s1
scenarios:
  - scenario: "Expired tokens are rejected"
    given: ["a session token past its expiry"]
    when: ["the middleware processes the request"]
    then: ["the request is rejected with an authentication failure"]
verification: raw
`;

function makeProject(withState = false) {
  const P = mkdtempSync(join(tmpdir(), "tripwire-"));
  mkdirSync(join(P, ".agents", "tasks"), { recursive: true });
  mkdirSync(join(P, "src"), { recursive: true });
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.holdout.md"), HOLDOUT);
  writeFileSync(join(P, "src", "README.md"), "# fixture\n");
  git(P, ["init", "-q"]);
  git(P, ["add", "."]);
  git(P, ["-c", "user.email=fixture@rig", "-c", "user.name=fixture", "commit", "-qm", "baseline"]);
  if (withState) {
    writeFileSync(join(P, "STATE.md"), "status: failed\nfailure_class: null\nerror_class: null\n");
  }
  return P;
}

// 1. Clean project → exit 0
{
  const P = makeProject();
  const r = tripwire(P);
  check("clean project exits 0", r.code === 0 && r.out.includes("TRIPWIRE CLEAN"));
}

// 2. Worker-modified file echoing the holdout then-clause → LEAK + STATE.md verdict
{
  const P = makeProject(true);
  writeFileSync(join(P, "src", "worker-notes.md"),
    "# notes\nThe middleware ensures the request is rejected with an authentication failure when expired.\n");
  const r = tripwire(P);
  check("worker-authored leak detected (exit 1)", r.code === 1 && r.out.includes("HOLDOUT LEAK DETECTED"));
  const st = readFileSync(join(P, "STATE.md"), "utf8");
  check("STATE.md records failure_class: holdout_leak", /^failure_class: holdout_leak/m.test(st));
}

// 3. Same content in a PRE-RUN tracked, unmodified file → NOT evidence
{
  const P = mkdtempSync(join(tmpdir(), "tripwire-"));
  mkdirSync(join(P, ".agents", "tasks"), { recursive: true });
  mkdirSync(join(P, "docs"), { recursive: true });
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.holdout.md"), HOLDOUT);
  writeFileSync(join(P, "docs", "spec.md"),
    "# spec\nThe request is rejected with an authentication failure for expired tokens.\n");
  git(P, ["init", "-q"]);
  git(P, ["add", "."]);
  git(P, ["-c", "user.email=fixture@rig", "-c", "user.name=fixture", "commit", "-qm", "baseline"]);
  const r = tripwire(P);
  check("pre-run tracked file is not evidence (exit 0)", r.code === 0);
}

// 4. Non-git target → fail-closed exit 1 (provenance unverifiable)
{
  const P = mkdtempSync(join(tmpdir(), "tripwire-nogit-"));
  mkdirSync(join(P, ".agents", "tasks"), { recursive: true });
  writeFileSync(join(P, ".agents", "tasks", "task-auth-s1.holdout.md"), HOLDOUT);
  const r = tripwire(P);
  check("non-git target fails closed (exit 1)", r.code === 1 && r.out.includes("FAIL-CLOSED"));
}

console.log("—".repeat(80));
if (failures > 0) {
  console.log(`FAILED — ${failures} of ${checks} checks failed`);
  process.exit(1);
}
console.log(`ALL PASS — 0 failures across ${checks} checks`);
