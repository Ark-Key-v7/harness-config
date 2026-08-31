#!/usr/bin/env node
/**
 * validation/canon-register/register.test.mjs — WP11 driver for the two
 * durable docs and their wiring.
 *
 * Guarantees:
 *  - docs/CAPABILITY_REGISTER.md + docs/CANON_MAP.md exist and stay coherent
 *    with the repo (every bin tool and every skill appears in the register's
 *    integrated half; every deferred section carries Canon + Activation
 *    trigger + Integration path).
 *  - docs/activation-triggers.json parses; every trigger id and anchor
 *    appears in the register (the two never drift apart).
 *  - The five canon texts are indexed in CANON_MAP.md.
 *  - Skill wiring: pr-review requires the preflight trail; project-onboard
 *    relays activation notices; OPERATOR_GUIDE lists the life events.
 *
 * Run from the repo root: node validation/canon-register/register.test.mjs
 * Exit 0 = all checks pass.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`PASS | ${name}`); }
  else { fail++; console.error(`FAIL | ${name}${detail ? " — " + detail : ""}`); }
};

const registerPath = join(REPO, "docs", "CAPABILITY_REGISTER.md");
const mapPath = join(REPO, "docs", "CANON_MAP.md");
ok("CAPABILITY_REGISTER.md exists", existsSync(registerPath));
ok("CANON_MAP.md exists", existsSync(mapPath));
if (!existsSync(registerPath) || !existsSync(mapPath)) {
  console.error("fatal: register docs missing"); process.exit(1);
}
const register = readFileSync(registerPath, "utf8");
const cmap = readFileSync(mapPath, "utf8");

// --- Integrated half covers every bin tool and every skill -----------------------
const binTools = readdirSync(join(REPO, "bin")).filter((f) => f.endsWith(".mjs"));
for (const t of binTools) ok(`register covers bin/${t}`, register.includes(`bin/${t}`) || register.includes(t));
const skills = readdirSync(join(REPO, "skills"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
for (const s of skills) ok(`register covers skill ${s}`, register.includes(s));

// --- Deferred half: every §D section is complete -----------------------------------
const sections = register.match(/### §D\.\d+ [^\n]+/g) ?? [];
ok("register has §D.1–§D.13", sections.length === 13, `found ${sections.length}`);
const deferredBody = register.split("## Deferred register")[1] ?? "";
const dBlocks = deferredBody.split(/(?=### §D\.\d+)/).filter((b) => b.startsWith("###"));
for (const b of dBlocks) {
  const id = b.match(/### (§D\.\d+)/)?.[1];
  ok(`${id} cites canon`, /- \*\*Canon:\*\*/.test(b));
  ok(`${id} has an activation trigger`, /- \*\*Activation trigger:\*\*/.test(b));
  ok(`${id} has an integration path`, /- \*\*Integration path:\*\*/.test(b));
}

// --- activation-triggers.json coherence ---------------------------------------------
const trigPath = join(REPO, "docs", "activation-triggers.json");
ok("activation-triggers.json exists", existsSync(trigPath));
let trig = null;
try { trig = JSON.parse(readFileSync(trigPath, "utf8")); ok("activation-triggers.json parses", true); }
catch (e) { ok("activation-triggers.json parses", false, e.message); }
if (trig) {
  ok("at least T1–T4 defined", (trig.triggers ?? []).length >= 4);
  for (const t of trig.triggers ?? []) {
    ok(`trigger ${t.id} anchored in register`, register.includes(t.register_anchor), t.register_anchor);
    ok(`trigger ${t.id} has notice + checks`, Boolean(t.notice) && Array.isArray(t.checks) && t.checks.length > 0);
  }
}

// --- Canon map indexes the five canon texts ------------------------------------------
const canonTexts = [
  "Constraint-Driven Lifecycle",
  "CI/CD Integration Engine",
  "Principal Review Rubric",
  "DevSecOps",
  "Production Workflows",
];
for (const c of canonTexts) ok(`canon map indexes: ${c}`, cmap.includes(c));
ok("canon map states the no-chunking ruling", /never (chunked|copied)/.test(cmap) || cmap.includes("not a copy"));
ok("canon map uses the status vocabulary", ["LIVE", "PARTIAL", "DEFERRED", "SOP"].every((s) => cmap.includes(s)));

// --- Skill / guide wiring --------------------------------------------------------------
const prReview = readFileSync(join(REPO, "skills", "pr-review", "SKILL.md"), "utf8");
ok("pr-review requires the preflight trail", prReview.includes("preflight.mjs"));
ok("pr-review states the lane map (one process)", prReview.includes("Review Lanes"));
ok("pr-review blocks rubric on dirty trail", /automatic FAIL/.test(prReview));
const onboard = readFileSync(join(REPO, "skills", "project-onboard", "SKILL.md"), "utf8");
ok("project-onboard relays activation notices", onboard.includes("ACTIVATION NOTICE"));
ok("project-onboard forbids autonomous deferred installs", /NEVER integrate a deferred tool/.test(onboard));
const guide = readFileSync(join(REPO, "docs", "OPERATOR_GUIDE.md"), "utf8");
ok("OPERATOR_GUIDE lists life events", guide.includes("Life events"));
ok("OPERATOR_GUIDE documents preflight", guide.includes("preflight.mjs"));
const status = readFileSync(join(REPO, "docs", "FACTORY_STATUS.md"), "utf8");
ok("FACTORY_STATUS records WP11", status.includes("WP11"));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
