#!/usr/bin/env node
/**
 * zcode-rig seat-injection hook (UserPromptSubmit; C.5). Carries the active
 * seat profile into every prompt so the seat is enforced, not just recorded
 * (/rig:seat writes the state; this hook injects it).
 *
 * Posture: INFORMS, never guards — any failure emits a WARN context line and
 * exits 0 (exit 2 here would block the prompt; that is not this hook's law).
 * Source of truth: ~/.pi/agent/seat-state.json (ZCODE_RIG_STATE_FILE
 * overrides for drivers); profile text = the plugin's rendered agent for the
 * seat (ZCODE_PLUGIN_ROOT/agents/<seat>.md, frontmatter stripped).
 * Context Budget Law: injection ceiling 16384 bytes (roster law); oversized
 * payloads truncate loudly, never silently.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CEILING = 16384;
const SEATS = new Set(["scout", "planner", "worker", "reviewer"]);

try {
  const stateFile = process.env.ZCODE_RIG_STATE_FILE ?? join(process.env.HOME ?? "", ".pi", "agent", "seat-state.json");
  if (!existsSync(stateFile) || process.env.ZCODE_RIG_SEAT === "off") process.exit(0);
  const state = JSON.parse(readFileSync(stateFile, "utf8"));
  const seat = String(state.seat ?? "off");
  if (seat === "off") process.exit(0);
  if (!SEATS.has(seat)) {
    console.log(`[zcode-rig:seat] WARN: unknown seat "${seat}" in ${stateFile} — no profile injected; run /rig-seat with a valid seat`);
    process.exit(0);
  }
  const profilePath = join(process.env.ZCODE_PLUGIN_ROOT ?? ".", "agents", `${seat}.md`);
  if (!existsSync(profilePath)) {
    console.log(`[zcode-rig:seat] WARN: profile missing for seat "${seat}" (${profilePath}) — plane incomplete; reinstall the plugin`);
    process.exit(0);
  }
  const body = readFileSync(profilePath, "utf8").replace(/^---\n[\s\S]*?---\n/, "");
  const payload = `[zcode-rig:seat] Active seat: ${seat} — profile law follows (operator-set via /rig-seat; human-only law):\n\n${body}`;
  if (payload.length > CEILING) {
    console.log(payload.slice(0, CEILING));
    console.log(`\n[zcode-rig:seat] WARN: profile exceeded the ${CEILING}-byte ceiling and was truncated — shrink the profile (Context Budget Law §1.4)`);
  } else {
    console.log(payload);
  }
  process.exit(0);
} catch (e) {
  console.log(`[zcode-rig:seat] WARN: seat-state unreadable (${e?.message ?? e}) — no profile injected this prompt`);
  process.exit(0);
}
