#!/usr/bin/env node
/**
 * validation/refinery-lane/preflight.test.mjs — WP11 driver for bin/preflight.mjs.
 *
 * Fixture git repos in a temp dir; a stub `semgrep` binary (node shebang,
 * chmod 755) drives gate semantics; the REAL semgrep (when resolvable)
 * validates templates/semgrep/base.yml against an evil fixture file.
 *
 * Run from the repo root: node validation/refinery-lane/preflight.test.mjs
 * Exit 0 = all checks pass.
 */
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(REPO, "bin", "preflight.mjs");

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS | ${name}`); }
  else { fail++; console.error(`FAIL | ${name}${detail ? " — " + detail : ""}`); }
};
const skipped = (name, why) => { skip++; console.log(`SKIP | ${name} — ${why}`); };

const T = mkdtempSync(join(tmpdir(), "preflight-"));
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function makeRepo(name) {
  const dir = join(T, name);
  mkdirSync(dir, { recursive: true });
  git(dir, ["init", "-q"]);
  git(dir, ["config", "user.email", "driver@rig"]);
  git(dir, ["config", "user.name", "driver"]);
  return dir;
}
function runPreflight(target, extra = []) {
  const r = spawnSync(process.execPath, [TOOL, "--target", target, ...extra], { encoding: "utf8" });
  return { code: r.status, out: String(r.stdout ?? ""), err: String(r.stderr ?? "") };
}

// --- Stub semgrep (returns canned JSON) ------------------------------------------
const stubBin = join(T, "stubbin");
mkdirSync(stubBin);
const STUB = join(stubBin, "semgrep");
const stubJs = join(T, "stub-semgrep.js");
writeFileSync(stubJs, `const mode = process.env.STUB_MODE ?? "clean";
const findings = mode === "clean" ? [] : [{
  check_id: "js-eval-usage", path: "evil.ts",
  extra: { severity: "ERROR", message: "eval() forbidden" },
  start: { line: 3 }
}];
console.log(JSON.stringify({ results: findings, errors: [] }));`);
writeFileSync(STUB, `#!/bin/sh\nexec "${process.execPath}" "${stubJs}" "$@"\n`);
chmodSync(STUB, 0o755);

// 1. Clean staged file + stub clean → exit 0
{
  const dir = makeRepo("clean");
  writeFileSync(join(dir, "ok.ts"), "export const ok = 1;\n");
  git(dir, ["add", "ok.ts"]);
  const r = runPreflight(dir, ["--semgrep", STUB]);
  ok("clean pass exits 0", r.code === 0, `got ${r.code}: ${r.err}`);
  ok("clean pass prints PREFLIGHT PASS", r.out.includes("PREFLIGHT PASS"));
}

// 2. Stub finding → exit 1 with check_id
{
  const dir = makeRepo("evil-stub");
  writeFileSync(join(dir, "evil.ts"), "eval('x');\n");
  git(dir, ["add", "evil.ts"]);
  const r = runPreflight(dir, ["--semgrep", STUB], );
  const r2 = spawnSync(process.execPath, [TOOL, "--target", dir, "--semgrep", STUB], { encoding: "utf8", env: { ...process.env, STUB_MODE: "finding" } });
  ok("finding blocks with exit 1", r2.status === 1, `got ${r2.status}`);
  ok("finding names check_id", String(r2.stderr).includes("js-eval-usage"), String(r2.stderr));
  ok("finding prints BLOCKED verdict", String(r2.stderr).includes("PREFLIGHT BLOCKED"));
}

// 3. Missing mandated tool → exit 2 with searched paths
{
  const dir = makeRepo("missing");
  writeFileSync(join(dir, "a.ts"), "export const a = 1;\n");
  git(dir, ["add", "a.ts"]);
  const r = runPreflight(dir, ["--semgrep", join(T, "no-such-semgrep")]);
  ok("missing tool refuses with exit 2", r.code === 2, `got ${r.code}`);
  ok("refusal names the missing path", r.err.includes("no-such-semgrep"), r.err);
}

// 4. Nothing staged → pass early
{
  const dir = makeRepo("empty");
  git(dir, ["commit", "-q", "--allow-empty", "-m", "init"]);
  const r = runPreflight(dir, ["--semgrep", STUB]);
  ok("nothing staged exits 0", r.code === 0);
  ok("nothing staged says so", r.out.includes("nothing staged"));
}

// 5. Contract lane: staged contract containing template slots → blocked
{
  const dir = makeRepo("contract");
  mkdirSync(join(dir, ".agents", "tasks"), { recursive: true });
  writeFileSync(join(dir, ".agents", "tasks", "task-x.md"), "# task\nmanifest:\n  contract_id: TEMPLATE_VALUE_REQUIRED\n");
  git(dir, ["add", "."]);
  const r = runPreflight(dir, ["--semgrep", STUB]);
  ok("invalid contract blocks", r.code === 1, `got ${r.code}: ${r.err}`);
  ok("block cites the contract lane", r.err.includes("contract lane"), r.err);
}

// 6. Manifold-surface notice
{
  const dir = makeRepo("manifold");
  mkdirSync(join(dir, ".tmd"), { recursive: true });
  writeFileSync(join(dir, ".tmd", "rules.md"), "# rules\n");
  git(dir, ["add", "."]);
  const r = runPreflight(dir, ["--semgrep", STUB]);
  ok("manifold-surface diff noticed", r.out.includes("manifold-surface diff"), r.out + r.err);
}

// 7. Real semgrep: validate the rig base ruleset catches the injection floor
{
  const candidates = [
    process.env.RIG_SEMGREP,
    join(process.env.HOME ?? "", "factory-rig", "tools", "semgrep", "bin", "semgrep"),
    "semgrep",
  ].filter(Boolean);
  let real = null;
  for (const c of candidates) {
    const v = spawnSync(c, ["--version"], { encoding: "utf8" });
    if (!v.error && v.status === 0) { real = c; break; }
  }
  if (!real) {
    skipped("real-semgrep ruleset validation", "no semgrep resolvable on this machine (stub covered gate semantics)");
  } else {
    const rules = join(REPO, "templates", "semgrep", "base.yml");
    const val = spawnSync(real, ["scan", "--validate", "--config", rules], { encoding: "utf8" });
    ok("base.yml passes semgrep --validate", val.status === 0, String(val.stderr).slice(0, 400));
    const dir = makeRepo("real-evil");
    writeFileSync(join(dir, "evil.ts"), [
      'import { exec } from "node:child_process";',
      "const userInput = process.argv[2];",
      "eval(userInput);",
      "exec(`ls ${userInput}`);",
      "const q = db.query(`SELECT * FROM t WHERE id = ${userInput}`);",
      "",
    ].join("\n"));
    const scan = spawnSync(real, ["scan", "--json", "--quiet", "--config", rules, "--", join(dir, "evil.ts")], { encoding: "utf8" });
    let ids = [];
    try { ids = (JSON.parse(scan.stdout).results ?? []).map((r) => r.check_id); } catch {}
    ok("real semgrep flags eval", ids.some((i) => i.includes("js-eval-usage")), ids.join(","));
    ok("real semgrep flags shell interpolation", ids.some((i) => i.includes("js-shell-exec-interpolation")), ids.join(","));
    ok("real semgrep flags query interpolation", ids.some((i) => i.includes("js-dynamic-query-interpolation")), ids.join(","));
    // end-to-end: preflight with the real binary blocks the evil file
    git(dir, ["add", "evil.ts"]);
    const r = runPreflight(dir, ["--semgrep", real]);
    ok("end-to-end real preflight blocks evil.ts", r.code === 1, `got ${r.code}`);
  }
}

// 8. Betterleaks dialect handling: stub speaks "git" (not "scan") → lane runs
{
  const blJs = join(T, "stub-betterleaks.js");
  writeFileSync(blJs, `const args = process.argv.slice(2);
if (args[0] === "--help") { console.log("Commands:\\n  git   scan a git repo\\n  dir   scan a directory"); process.exit(0); }
if (args[0] === "--version") { console.log("stub-betterleaks 0.0.0"); process.exit(0); }
if (args[0] === "scan") { console.error('Error: unknown command "scan" for "betterleaks"'); process.exit(1); }
if (args[0] === "git") {
  if (process.env.STUB_BL_MODE === "leak") { console.log("Finding: generic-api-key in evil.ts:3"); process.exit(1); }
  process.exit(0);
}
process.exit(1);`);
  const BL = join(stubBin, "betterleaks");
  writeFileSync(BL, `#!/bin/sh\nexec "${process.execPath}" "${blJs}" "$@"\n`);
  chmodSync(BL, 0o755);
  const env = { ...process.env, PATH: `${stubBin}:${process.env.PATH}`, RIG_FLOOR: join(T, "no-floor") };

  const dir = makeRepo("bl-clean");
  writeFileSync(join(dir, "ok.ts"), "export const ok = 1;\n");
  git(dir, ["add", "ok.ts"]);
  const r = spawnSync(process.execPath, [TOOL, "--target", dir, "--semgrep", STUB], { encoding: "utf8", env });
  ok("betterleaks dialect-probed lane runs (git verb), clean pass", r.status === 0 && String(r.stdout).includes("verb: git"), `${r.status}: ${r.stdout}${r.stderr}`);

  const dir2 = makeRepo("bl-leak");
  writeFileSync(join(dir2, "evil.ts"), "const key = 'AKIA...';\n");
  git(dir2, ["add", "evil.ts"]);
  const r2 = spawnSync(process.execPath, [TOOL, "--target", dir2, "--semgrep", STUB], { encoding: "utf8", env: { ...env, STUB_BL_MODE: "leak" } });
  ok("betterleaks findings block", r2.status === 1 && String(r2.stderr).includes("secrets lane"), `${r2.status}: ${r2.stderr}`);
}

console.log(`\n${pass} PASS, ${fail} FAIL, ${skip} SKIP`);
process.exit(fail > 0 ? 1 : 0);
