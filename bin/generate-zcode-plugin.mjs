#!/usr/bin/env node
/**
 * generate-zcode-plugin.mjs — WP-F Phase 4: emits projections/zcode-plugin/,
 * the source of truth for the `zcode-rig` ZCode plugin (spec §6, Package A
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
 *   projections/zcode-plugin/commands/rig-seat.md       — writes seat state (operator-invoked)
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

// --- skills/ (verbatim; the plugin loader namespaces them zcode-rig:) ------
cpSync(SKILLS_SRC, join(OUT, "skills"), { recursive: true });

// --- agents/ (profiles → subagent definitions) ------------------------------
const ROLE_DESC = {
  scout: "Read-only reconnaissance: maps territory before law is written or code is touched. Returns compact maps, never edits.",
  planner: "Spec-chain and contract authoring seat: drafts plans and task contracts for operator approval.",
  worker: "Execution seat: builds inside contract scope under bound disciplines (TDD, verification, security, observability).",
  reviewer: "Review seat: /check review mode — trail-first, evidenced verdicts, Ten Marks; reads, never edits.",
};
mkdirSync(join(OUT, "agents"));
for (const f of ["scout.md", "planner.md", "worker.md", "reviewer.md"]) {
  const body = readFileSync(join(PROFILES_SRC, f), "utf8");
  const role = f.replace(".md", "");
  const front = `---\nname: ${role}\ndescription: "${ROLE_DESC[role]}"\n# model: pin per WP-F D-5 after in-client V5 verification (UNVERIFIED — do not cite as law yet)\n---\n\n`;
  writeFileSync(join(OUT, "agents", f), front + body);
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
writeFileSync(join(OUT, "commands", "rig-seat.md"), `---
name: rig:seat
description: Switch the active seat profile (scout | planner | worker | reviewer | off) — operator-invoked by construction
---

Write the seat selection to \`~/.pi/agent/seat-state.json\` as
\`{ "seat": "<role>" }\` (create or update), then confirm. Seats are law:
never self-switch; the operator runs this command.
`);

// --- hooks/ (static fail-closed assets copied verbatim + wiring) ---------------
mkdirSync(join(OUT, "hooks"));
for (const f of readdirSync(HOOKS_SRC)) cpSync(join(HOOKS_SRC, f), join(OUT, "hooks", f));
// SCHEMA NOTE [UNVERIFIED, 1.2a V-adjacent]: Claude-compatible PreToolUse shape
// per Package A Z.2 docs (exit 2 deny); the in-client pass must confirm field
// names before law cites this file.
writeFileSync(join(OUT, "hooks", "hooks.json"), JSON.stringify({
  _comment: "[HARNESS-ENFORCE] zcode-rig guard plane — plugin scope is the ONLY hook scope executing beyond user-level (Package A V2). Fail-closed scripts; canonical law in the authoring repo.",
  hooks: {
    PreToolUse: [
      { matcher: "Bash", hooks: [{ type: "command", command: "node ${ZCODE_RIG_ROOT}/hooks/bash-guard.mjs" }] },
      { matcher: "Write|Edit", hooks: [{ type: "command", command: "node ${ZCODE_RIG_ROOT}/hooks/scope-check.mjs" }] },
    ],
  },
}, null, 2) + "\n");

// --- manifest + README -----------------------------------------------------------
mkdirSync(join(OUT, ".zcode-plugin"));
writeFileSync(join(OUT, ".zcode-plugin", "plugin.json"), JSON.stringify({
  name: "zcode-rig",
  version: "0.1.0",
  description: "Factory rig invocation + enforcement plane for ZCode: the workflow skills, seat agents, and fail-closed guard hooks (WP-F; generated — never hand-edit).",
  source_head: HEAD,
}, null, 2) + "\n");
writeFileSync(join(OUT, "README.md"), `# zcode-rig (generated — WP-F Phase 4)

Source of truth: \`harness-config\` (this tree is a projection; \`node bin/generate-zcode-plugin.mjs\` regenerates byte-identically). Version tracks the rig release.

- \`skills/\` — the rig skill corpus (namespaced \`zcode-rig:\` by the plugin loader).
- \`agents/\` — seat profiles as subagent definitions; pin models after V5 verification.
- \`commands/\` — \`/rig:preflight\`, \`/rig:seat\` (operator-invoked).
- \`hooks/\` — [HARNESS-ENFORCE] fail-closed guards: bash DANGER class + contract write-scope. Canonical law: the authoring repo's extensions + bins.

Install (PORTABILITY step 2c): local marketplace path or git URL; one-time, client-level. Onboarding never copies this plugin — project law only.

Generated from source_head ${HEAD.slice(0, 12)}.
`);

console.log(`zcode-plugin emitted: ${OUT} (source_head ${HEAD.slice(0, 12)})`);
