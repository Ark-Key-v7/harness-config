#!/usr/bin/env node
/**
 * validation/refinery-lane/activations.test.mjs — WP11 driver for bin/check-activations.mjs.
 *
 * Run from the repo root: node validation/refinery-lane/activations.test.mjs
 * Exit 0 = all checks pass.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(REPO, "bin", "check-activations.mjs");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS | ${name}`); }
  else { fail++; console.error(`FAIL | ${name}${detail ? " — " + detail : ""}`); }
};
const run = (target, extra = []) => {
  const r = spawnSync(process.execPath, [TOOL, "--target", target, ...extra], { encoding: "utf8" });
  return { code: r.status, out: String(r.stdout ?? ""), err: String(r.stderr ?? "") };
};

const T = mkdtempSync(join(tmpdir(), "activations-"));
const mk = (name, files) => {
  const dir = join(T, name);
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
  mkdirSync(dir, { recursive: true });
  return dir;
};

// 1. Harness repo → T1 quiet (not_harness suppresses), T4 always fires
{
  const dir = mk("harness", {
    "package-pins.json": "{}",
    "docs/GOVERNANCE_PLANE_SPEC.md": "# spec\n",
    "package.json": "{}",
  });
  const r = run(dir);
  ok("harness target exits 0", r.code === 0, r.err);
  ok("T1 suppressed on the harness itself", !r.out.includes("T1-refinery-stage1-ci"), r.out);
  ok("T4 fires everywhere (Lavish deferred notice)", r.out.includes("T4-lavish-phase2-review"), r.out);
}

// 2. First product repo → T1 + T4
{
  const dir = mk("product", { "package.json": "{}" });
  const r = run(dir);
  ok("T1 fires on first product repo", r.out.includes("T1-refinery-stage1-ci"), r.out);
  ok("T1 notice points at register §D.1", r.out.includes("§D.1"), r.out);
}

// 3. Convex backend → T3
{
  const dir = mk("convexapp", { "package.json": "{}", "convex/schema.ts": "// schema\n" });
  const r = run(dir);
  ok("T3 fires when convex/ present", r.out.includes("T3-convex-backend"), r.out);
  ok("T3 notice carries the Convex Mandate", /schema\.ts/.test(r.out), r.out);
}

// 4. Brownfield flag → T2
{
  const dir = mk("legacy", { "package.json": "{}" });
  const r = run(dir, ["--brownfield"]);
  ok("T2 fires on --brownfield", r.out.includes("T2-brownfield-archaeology"), r.out);
  ok("T2 notice names GitNexus decision", r.out.includes("GitNexus"), r.out);
}

// 5. No triggers beyond always → quiet except T4; exit always 0
{
  const dir = mk("plain", { "README.md": "x\n" });
  const r = run(dir);
  ok("plain dir exits 0", r.code === 0);
  ok("plain dir: T1 quiet without package.json", !r.out.includes("T1-"), r.out);
}

// 6. Every notice carries its register anchor
{
  const dir = mk("anchors", { "package.json": "{}", "convex/index.ts": "x\n" });
  const r = run(dir, ["--brownfield"]);
  const notices = r.out.split("\n").filter((l) => l.startsWith("ACTIVATION NOTICE"));
  ok("all fired notices carry §D anchors", notices.length >= 3 && notices.every((l) => /§D\.\d+/.test(l)), r.out);
}

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
