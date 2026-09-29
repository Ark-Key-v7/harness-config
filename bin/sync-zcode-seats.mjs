#!/usr/bin/env node
/**
 * sync-zcode-seats.mjs — keep the Windows-profile seat subagents in step with
 * the deployed clone (§D.35 R3/2e). The client loads subagents from
 * C:\Users\<user>\.zcode\agents\ (Windows-side profile); the plugin's agents/
 * dir does not load as subagents in this build — so those copies are the LIVE
 * seat definitions and must never be stale snapshots.
 *
 * Law: seats are generated artifacts (rendered by generate-zcode-plugin.mjs
 * from templates/agents/profiles). This script is the ONLY sanctioned copier;
 * never hand-edit the Windows-side files — change the profiles, regenerate,
 * pull, run this. User-created subagents in the same folder are left alone.
 *
 * Usage: node ~/.pi/agent/bin/sync-zcode-seats.mjs
 * Env overrides (drivers): ZCODE_RIG_SEAT_SRC / ZCODE_RIG_SEAT_DST.
 * Exit 0 = synced (or reported); exit 1 = source missing.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SEATS = ["scout", "planner", "worker", "reviewer"];
const SRC = process.env.ZCODE_RIG_SEAT_SRC ?? join(process.env.HOME ?? "", ".pi", "agent", "projections", "zcode-plugin", "agents");
const WINUSER = process.env.WSL_USER ?? process.env.USER ?? "";
const DST = process.env.ZCODE_RIG_SEAT_DST ?? `/mnt/c/Users/${WINUSER}/.zcode/agents`;

if (!existsSync(SRC)) {
  console.error(`sync-zcode-seats: source missing (${SRC}) — is the deployed clone pulled?`);
  process.exit(1);
}
if (!existsSync(DST)) {
  if (!existsSync(`/mnt/c/Users/${WINUSER}`)) {
    console.log(`sync-zcode-seats: no Windows profile for user "${WINUSER}" (/mnt/c/Users/${WINUSER}) — nothing to sync on this machine; exit clean.`);
    process.exit(0);
  }
  mkdirSync(DST, { recursive: true });
}

for (const seat of SEATS) {
  const src = join(SRC, `${seat}.md`);
  if (!existsSync(src)) { console.error(`sync-zcode-seats: seat missing in source: ${seat}.md`); process.exit(1); }
  cpSync(src, join(DST, `${seat}.md`));
  const same = readFileSync(src, "utf8") === readFileSync(join(DST, `${seat}.md`), "utf8");
  if (!same) { console.error(`sync-zcode-seats: ${seat}.md copy failed verification`); process.exit(1); }
  console.log(`sync-zcode-seats: ${seat}.md synced (byte-verified)`);
}
const extra = readdirSync(DST).filter((f) => f.endsWith(".md") && !SEATS.some((s) => f === `${s}.md`));
console.log(`sync-zcode-seats: done. ${extra.length ? `${extra.length} user-created subagent file(s) left untouched: ${extra.join(", ")}` : "no user-created subagent files present."}`);
