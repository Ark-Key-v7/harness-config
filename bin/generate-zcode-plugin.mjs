#!/usr/bin/env node
/**
 * generate-zcode-plugin.mjs — WP-F Phase 4: emits projections/zcode-plugin/,
 * the source of truth for the `agentic-swe-factory` ZCode plugin (spec §6, Package A
 * Z.13 design ∪ WP-F payload).
 *
 * Generated, NEVER hand-edited (L5: authoring copy canonical). Same
 * determinism law as generate-projections.mjs: same inputs + --source-head
 * => byte-identical output; no timestamps.
 *
 * Emits:
 *   projections/zcode-plugin/.zcode-plugin/plugin.json   — manifest
 *   projections/zcode-plugin/agents/<role>.md           — profiles → subagent defs
 *   projections/zcode-plugin/skills/**                  — verbatim copy of skills/
 *   projections/zcode-plugin/commands/rig-preflight.md  — calls preflight --staged
 *   projections/zcode-plugin/hooks/hooks.json           — [HARNESS-ENFORCE] wiring
 *   projections/zcode-plugin/hooks/*.mjs                — fail-closed guards (copied
 *                                                          verbatim from templates/zcode-plugin-hooks/)
 *   projections/zcode-plugin/README.md
 *
 * Usage: node bin/generate-zcode-plugin.mjs [--out DIR] [--source-head SHA]
 * Exit 0 = emitted. Exit 1 = malformed inputs.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const args = process.argv.slice(2);
const argValue = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const OUT = argValue("--out") ?? join(ROOT, "projections", "zcode-plugin");

function sourceHead() {
  try {
    return execSync("git log -1 --format=%H -- skills templates/agents/profiles templates/zcode-plugin-hooks bin/generate-zcode-plugin.mjs", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch { return "unknown"; }
}
const HEAD = argValue("--source-head") ?? sourceHead();

const SKILLS_SRC = join(ROOT, "skills");
const PROFILES_SRC = join(ROOT, "templates", "agents", "profiles");
const HOOKS_SRC = join(ROOT, "templates", "zcode-plugin-hooks");
for (const dir of [SKILLS_SRC, PROFILES_SRC, HOOKS_SRC]) {
  if (!existsSync(dir)) { console.error(`missing input: ${dir}`); process.exit(1); }
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// --- skills/ (verbatim; the plugin loader namespaces them agentic-swe-factory:) ------
cpSync(SKILLS_SRC, join(OUT, "skills"), { recursive: true });

// --- agents/ (profiles → subagent definitions) ------------------------------
const ROLE_DESC = {
  scout: "Read-only reconnaissance: maps territory before law is written or code is touched. Returns compact maps, never edits.",
  planner: "Spec-chain and contract authoring seat: drafts plans and task contracts for operator approval.",
  worker: "Execution seat: builds inside contract scope under bound disciplines (TDD, verification, security, observability).",
  reviewer: "Review seat: /check review mode — trail-first, evidenced verdicts, Ten Marks; reads, never edits.",
};
mkdirSync(join(OUT, "agents"));

// C.1: render the profile's skill_bindings YAML as seat law in the agent prompt
function renderSkillSet(profileText) {
  const sb = profileText.match(/skill_bindings:\n\s+invocation:\s*\[([^\]]*)\]\s*(?:#.*)?\n\s+disciplines:\s*\[([^\]]*)\]\s*(?:#.*)?\n/);
  if (!sb) throw new Error("profile lacks a well-formed skill_bindings block (lint-profiles gates this)");
  const clean = (s) => s.split(",").map((x) => x.trim().split(/\s+#/)[0].trim()).filter(Boolean);
  const inv = clean(sb[1]), dis = clean(sb[2]);
  let out = "\n## Skill set (law for this seat)\n\n";
  if (inv.length) out += `Invocation plane (invoked by name or trigger phrase): ${inv.map((s) => `\`${s}\``).join(", ")}.\n\n`;
  out += `Disciplines (bound to this seat — fire per their own trigger law, never hand-invoked): ${dis.map((s) => `\`${s}\``).join(", ")}.\n\n`;
  out += "Skills outside this set are out of seat: do not invoke them from this seat; route through the operator or the correct seat.\n";
  return out;
}

for (const f of ["scout.md", "planner.md", "worker.md", "reviewer.md"]) {
  let body = readFileSync(join(PROFILES_SRC, f), "utf8");
  // ZCode seat has no rig-root context: rewrite rig-relative law references
  // to the absolute deployed-clone path (§D.35 R3 finding — seats could not
  // resolve `templates/agents/profiles/roster-laws.md`)
  body = body.replaceAll("templates/agents/profiles/roster-laws.md", "~/.pi/agent/templates/agents/profiles/roster-laws.md");
  const role = f.replace(".md", "");
  const front = `---\nname: ${role}\ndescription: "${ROLE_DESC[role]}"\n# model: pin per WP-F D-5 after in-client V5 verification (UNVERIFIED — do not cite as law yet)\n---\n\n`;
  writeFileSync(join(OUT, "agents", f), front + body + renderSkillSet(body));
}

// --- commands/ -----------------------------------------------------------------
mkdirSync(join(OUT, "commands"));
writeFileSync(join(OUT, "commands", "rig-preflight.md"), `---
name: rig:preflight
description: Refinery Stage 0 — Semgrep injection floor + contract lint over staged changes (BLOCKED means resolve, never force)
---

\`node ~/.pi/agent/bin/preflight.mjs --staged\`

Relay the output verbatim. BLOCKED is a stop, not a suggestion.
`);
// --- hooks/ (static fail-closed assets copied verbatim + wiring) ---------------
mkdirSync(join(OUT, "hooks"));
for (const f of readdirSync(HOOKS_SRC)) cpSync(join(HOOKS_SRC, f), join(OUT, "hooks", f));
// SCHEMA NOTE [UNVERIFIED, 1.2a V-adjacent]: Claude-compatible PreToolUse shape
// per Package A Z.2 docs (exit 2 deny); the in-client pass must confirm field
// names before law cites this file.
writeFileSync(join(OUT, "hooks", "hooks.json"), JSON.stringify({
  _comment: "[HARNESS-ENFORCE] agentic-swe-factory guard plane — plugin scope is the ONLY hook scope executing beyond user-level (Package A V2). Fail-closed scripts; canonical law in the authoring repo.",
  hooks: {
    PreToolUse: [
      { matcher: "Bash", hooks: [{ type: "command", command: "node ${ZCODE_PLUGIN_ROOT}/hooks/bash-guard.mjs" }] },
      { matcher: "Write|Edit", hooks: [{ type: "command", command: "node ${ZCODE_PLUGIN_ROOT}/hooks/scope-check.mjs" }] },
    ],
  },
}, null, 2) + "\n");

// --- manifest + README -----------------------------------------------------------
mkdirSync(join(OUT, ".zcode-plugin"));
writeFileSync(join(OUT, ".zcode-plugin", "plugin.json"), JSON.stringify({
  name: "agentic-swe-factory",
  version: "0.4.0",
  description: "The Software Factory on ZCode — a governed SDLC you run as skills, seats, and gates: onboard a project, scope it into specs and contracts, build under law, prove it works, review on a fresh model, ship through the gate. 33 skills, four seats, one operating map.",
  source_head: HEAD,
}, null, 2) + "\n");
writeFileSync(join(OUT, "README.md"), `# agentic-swe-factory — the Software Factory on ZCode

This plugin is the factory as you install it on this host: the skills you
invoke, the seats that execute them, and the fail-closed hooks that keep
every session inside the law. The full story — every stage, seat, and gate —
lives in the source repo's **docs/SDLC_FACTORY_OPERATING_MAP.md**.

- \`skills/\` — the rig skill corpus (namespaced \`agentic-swe-factory:\` by the plugin loader): nine workflow skills you invoke by name, specialists that gate specific moments, and seat disciplines that fire automatically.
- \`agents/\` — the four seats (scout, planner, worker, reviewer) as subagent definitions; the seat decides which law is in force.
- \`commands/\` — \`/rig-preflight\` (Refinery Stage-0 gate, operator- or ship-gate-invoked). Seats have no command: they are the native subagents in \`agents/\`.
- \`hooks/\` — [HARNESS-ENFORCE] fail-closed guards: bash DANGER class + contract write-scope. Canonical law: the authoring repo's extensions + bins.

Install (PORTABILITY step 2c): local marketplace path or git URL; one-time, client-level. The factory updates this plugin on every rig pull — never edit it here; it regenerates byte-identically from \`harness-config\` (\`node bin/generate-zcode-plugin.mjs\`). Onboarding never copies this plugin — projects get law only.

Generated from source_head ${HEAD.slice(0, 12)}.
`);

console.log(`zcode-plugin emitted: ${OUT} (source_head ${HEAD.slice(0, 12)})`);
