#!/usr/bin/env node
/**
 * preflight.mjs — WP11 Refinery Stage 0: the local pre-flight lane.
 *
 * Canon: CI/CD Integration Engine §2.4 Stage 0 (local pre-flight is a
 * deterministic boundary BEFORE commit) + §6.3 Tri-Layer Security
 * ("Before a commit is created, the local agent must execute the Semgrep
 * MCP and Betterleaks"). This tool is that lane for any product repo.
 *
 * Lanes, in order:
 *   1. Contract lane — staged .agents/tasks/*.md must pass lint-contract
 *      (against .tmd/gravity.md when present). An invalid contract never
 *      enters a commit.
 *   2. SAST lane — Semgrep over the staged files with the rig base ruleset
 *      (templates/semgrep/base.yml: the injection floor) plus the project's
 *      own .semgrep.yml when committed (config-as-code). ERROR blocks,
 *      WARNING warns. Semgrep is a MANDATED floor: absent binary = BLOCK
 *      (fail-closed), with the searched paths printed.
 *   3. Secrets lane — Betterleaks when installed. NOT YET ADOPTED in the rig
 *      (CAPABILITY_REGISTER §D.6): absence is a prominent WARNING, not a
 *      block, until the intake WP lands. Known canon gap — tracked, not hidden.
 *   4. Manifold-surface notice — staged diffs under .tmd/, .agents/profiles/,
 *      .agents/skills/ are manifold-surface changes (canon Stage 4: they
 *      never auto-merge). Informational line only.
 *
 * Usage:
 *   node bin/preflight.mjs [--staged|--all] [--target DIR] [--semgrep PATH]
 * Exit 0 = pass (warnings allowed). Exit 1 = blocked (findings/lint).
 * Exit 2 = mandated tooling missing or misconfigured.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const RIG = join(HERE, "..");
const FLOOR = process.env.RIG_FLOOR ?? join(homedir(), "factory-rig");

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
const TARGET = resolve(arg("--target") ?? process.cwd());
const MODE = process.argv.includes("--all") ? "--all" : "--staged";
const SEMGREP_FLAG = arg("--semgrep");

let blocked = 0;
let warned = 0;
const block = (m) => { blocked++; console.error(`BLOCK | ${m}`); };
const warn = (m) => { warned++; console.warn(`WARN  | ${m}`); };
const info = (m) => console.log(`INFO  | ${m}`);
const toolfail = (m) => { console.error(`PREFLIGHT REFUSED: ${m}`); process.exit(2); };

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: TARGET, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts });
  return { code: r.status ?? 1, out: String(r.stdout ?? ""), err: String(r.stderr ?? ""), error: r.error };
}

// --- File set -------------------------------------------------------------------
if (!existsSync(join(TARGET, ".git"))) toolfail(`target is not a git worktree: ${TARGET} — the Refinery lane requires the SCM hub (canon §2.1)`);
const gitList = MODE === "--all"
  ? run("git", ["ls-files"])
  : run("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
if (gitList.code !== 0) toolfail(`git file enumeration failed:\n${gitList.err}`);
const files = gitList.out.split("\n").map((s) => s.trim()).filter(Boolean)
  .filter((f) => existsSync(join(TARGET, f)));
info(`mode ${MODE} — ${files.length} file(s) in scope`);

if (files.length === 0) {
  console.log("PREFLIGHT PASS (nothing staged)");
  process.exit(0);
}

// --- Lane 1: contracts ------------------------------------------------------------
const contracts = files.filter((f) => /^\.agents\/tasks\/.*\.md$/.test(f));
const gravity = join(TARGET, ".tmd", "gravity.md");
for (const c of contracts) {
  const args = [join(RIG, "bin", "lint-contract.mjs"), join(TARGET, c)];
  if (existsSync(gravity)) args.push("--gravity", gravity);
  const r = run(process.execPath, args);
  if (r.code !== 0) block(`contract lane: ${c} fails lint-contract\n${r.out}${r.err}`.trim());
  else info(`contract lane: ${c} VALID`);
}

// --- Lane 2: Semgrep SAST ---------------------------------------------------------
function usable(bin) {
  if (existsSync(bin)) return true;
  const v = spawnSync(bin, ["--version"], { encoding: "utf8" });
  return !v.error && v.status === 0;
}
function resolveSemgrep() {
  if (SEMGREP_FLAG) {
    if (!usable(SEMGREP_FLAG)) toolfail(`--semgrep is not executable/resolvable: ${SEMGREP_FLAG}`);
    return SEMGREP_FLAG;
  }
  if (process.env.RIG_SEMGREP) {
    if (!usable(process.env.RIG_SEMGREP)) toolfail(`RIG_SEMGREP is not executable/resolvable: ${process.env.RIG_SEMGREP}`);
    return process.env.RIG_SEMGREP;
  }
  const candidates = [
    join(FLOOR, "tools", "semgrep", "bin", "semgrep"),
    join(FLOOR, "tools", "semgrep", "semgrep"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  const onPath = run("semgrep", ["--version"]);
  if (!onPath.error && onPath.code === 0) return "semgrep";
  toolfail(
    "Semgrep binary not found — the Stage-0 SAST floor is mandated (canon §6.3) and a missing gate blocks, never skips.\n" +
    "Searched:\n  " + candidates.join("\n  ") + "\n  PATH (semgrep --version)\n" +
    "Fix: install per package-pins.json / CAPABILITY_REGISTER, or pass --semgrep <path> or set RIG_SEMGREP."
  );
}
const semgrep = resolveSemgrep();
const baseRules = join(RIG, "templates", "semgrep", "base.yml");
if (!existsSync(baseRules)) toolfail(`rig base ruleset missing: templates/semgrep/base.yml — is the rig clone current?`);

const codeFiles = files.filter((f) => /\.(m?[jt]sx?|py|go|java|rb)$/.test(f));
if (codeFiles.length === 0) {
  info("SAST lane: no code files in scope — skipped");
} else {
  const sgArgs = ["scan", "--json", "--quiet", "--config", baseRules];
  const projRules = join(TARGET, ".semgrep.yml");
  if (existsSync(projRules)) { sgArgs.push("--config", projRules); info("SAST lane: project .semgrep.yml stacked on rig base"); }
  sgArgs.push("--", ...codeFiles.map((f) => (isAbsolute(f) ? f : join(TARGET, f))));
  const r = run(semgrep, sgArgs);
  if (r.error || (r.code !== 0 && r.code !== 1)) {
    toolfail(`semgrep execution error (exit ${r.code}):\n${r.err || r.out}`);
  }
  let parsed;
  try { parsed = JSON.parse(r.out); }
  catch { toolfail(`semgrep did not return JSON — refusing to guess:\n${r.out.slice(0, 500)}\n${r.err.slice(0, 500)}`); }
  const results = parsed.results ?? [];
  for (const f of results) {
    const sev = f.extra?.severity ?? "WARNING";
    const loc = `${f.path}:${f.start?.line ?? "?"}`;
    const msg = `${loc} [${f.check_id}] ${(f.extra?.message ?? "").split("\n")[0]}`;
    if (sev === "ERROR") block(msg); else warn(msg);
  }
  const errors = results.filter((f) => (f.extra?.severity ?? "") === "ERROR").length;
  info(`SAST lane: ${results.length} finding(s), ${errors} blocking`);
}

// --- Lane 3: secrets (Betterleaks — dialect-probed) --------------------------------
// Betterleaks/gitleaks CLI dialects differ across versions (git | detect |
// scan verbs). Probe --help and use the first supported verb; an
// unrecognized dialect is a WARN (lane inactive + register pointer), never
// a silent skip and never a guessed invocation.
const blCandidates = [join(FLOOR, "tools", "betterleaks", "betterleaks"), join(FLOOR, "tools", "betterleaks", "bin", "betterleaks")];
const betterleaks = blCandidates.find((c) => existsSync(c)) ??
  (run("betterleaks", ["--version"]).code === 0 ? "betterleaks" : null);
if (!betterleaks) {
  warn("secrets lane: Betterleaks not installed — canon §6.3 mandates it; adoption tracked at CAPABILITY_REGISTER §D.6.");
} else {
  const help = run(betterleaks, ["--help"]);
  const helpText = `${help.out}\n${help.err}`;
  const verb = ["git", "detect", "scan"].find((v) => new RegExp(`\\b${v}\\b`).test(helpText));
  if (!verb) {
    warn(`secrets lane: betterleaks CLI dialect unrecognized (no git/detect/scan verb in --help) — lane inactive; see CAPABILITY_REGISTER §D.6`);
  } else {
    const r = run(betterleaks, [verb, "--staged"]);
    const combined = `${r.out}${r.err}`;
    if (r.code !== 0 && /unknown command|unknown flag/i.test(combined)) {
      warn(`secrets lane: betterleaks rejected '${verb} --staged' — dialect drift; lane inactive this run, see CAPABILITY_REGISTER §D.6`);
    } else if (r.code !== 0) {
      block(`secrets lane: betterleaks findings\n${combined}`.trim());
    } else {
      info(`secrets lane: betterleaks clean (verb: ${verb} --staged)`);
    }
  }
}

// --- Lane 4: manifold-surface notice ------------------------------------------------
const manifoldSurface = files.filter((f) => /^\.tmd\/|^\.agents\/(profiles|skills)\//.test(f));
if (manifoldSurface.length > 0) {
  info(`manifold-surface diff staged (${manifoldSurface.length} file(s)) — canon Stage 4: these never auto-merge; human ratification trail required`);
}

// --- Verdict ------------------------------------------------------------------------
if (blocked > 0) {
  console.error(`PREFLIGHT BLOCKED: ${blocked} blocking item(s), ${warned} warning(s)`);
  process.exit(1);
}
console.log(`PREFLIGHT PASS: 0 blocking, ${warned} warning(s)`);
process.exit(0);
