#!/usr/bin/env node
/**
 * check-zcode-plane.mjs — WP-F Phase 4 (Package A Z.13-D2): verifies the
 * agentic-swe-factory plane is installed and enabled on this machine's ZCode client.
 * Run it from doctor context or standalone. Exit 0 = plane present;
 * exit 1 = absent/degraded (a governed repo on this machine is unguarded
 * on the ADE seat — V2).
 *
 * Checks: plugin projection exists + fresh; discovery symlink
 * (~/.agents/skills) live; ZCode client config dir present.
 * NOTE [UNVERIFIED]: whether the plugin is *enabled* in the client is not
 * machine-readable until the in-client pass documents the config location.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
let bad = 0;
function req(label, cond) { console.log(`${cond ? "OK  " : "MISS"} | ${label}`); if (!cond) bad++; }

req("plugin projection exists (projections/zcode-plugin/)", existsSync(join(ROOT, "projections", "zcode-plugin", ".zcode-plugin", "plugin.json")));
req("discovery symlink live (~/.agents/skills → deployed skills)", existsSync(join(homedir(), ".agents", "skills", "debug", "SKILL.md")));
req("ZCode client present (~/.zcode)", existsSync(join(homedir(), ".zcode")));
try { JSON.parse(readFileSync(join(homedir(), ".zcode", "cli", "config.json"), "utf8")); req("client config parses (~/.zcode/cli/config.json)", true); } catch { console.log("NOTE | no ~/.zcode/cli/config.json yet (nothing user-configured; expected before the 2c install — enablement becomes checkable after it)"); }
// Marketplace wrapper (PORTABILITY 2d): the client discovers the plugin
// through a local-directory marketplace at ~/factory-rig/sources/zcode-marketplace.
// Missing wrapper = plugin auto-update is down (cache keeps last content; the
// discovery-symlink fallback still governs) — WARN, not DEGRADED, recoverable
// by re-running the 2d recipe and re-registering in the client.
{
  const mk = join(homedir(), "factory-rig", "sources", "zcode-marketplace");
  let wrapperOk = false;
  try {
    const m = JSON.parse(readFileSync(join(mk, ".zcode-plugin", "marketplace.json"), "utf8"));
    wrapperOk = m.name === "factory-rig-local" && existsSync(join(mk, "agentic-swe-factory", ".zcode-plugin", "plugin.json"));
  } catch {}
  if (wrapperOk) req("marketplace wrapper live (sources/zcode-marketplace → deployed projection)", true);
  else console.log(`WARN | marketplace wrapper missing/stale at ${mk} — plugin auto-update is down; rebuild per docs/PORTABILITY.md step 2d, then re-register the marketplace in the client`);
}
// Seat-subagent drift check (§D.35 R3/2e): the client loads subagents from the
// Windows profile; those copies must match the deployed projection.
{
  const srcDir = join(ROOT, "projections", "zcode-plugin", "agents");
  const dstDir = `/mnt/c/Users/${process.env.WSL_USER ?? process.env.USER ?? ""}/.zcode/agents`;
  if (!existsSync(`/mnt/c/Users/${process.env.WSL_USER ?? process.env.USER ?? ""}`)) {
    console.log("NOTE | no Windows profile on this machine — seat-sync check skipped");
  } else {
    const drifted = ["scout", "planner", "worker", "reviewer"].filter((s) => {
      try { return readFileSync(join(srcDir, `${s}.md`), "utf8") !== readFileSync(join(dstDir, `${s}.md`), "utf8"); } catch { return true; }
    });
    if (drifted.length) console.log(`WARN | seat subagents drifted/stale in ${dstDir}: ${drifted.join(", ")} — run: node ~/.pi/agent/bin/sync-zcode-seats.mjs (then start a fresh session)`);
    else req("seat subagents in sync with deployed projection (Windows profile)", true);
  }
}
if (bad > 0) { console.error(`\nagentic-swe-factory plane DEGRADED (${bad} missing): governed repos are unguarded on the ADE seat (V2). Install per docs/PORTABILITY.md step 2c.`); process.exit(1); }
console.log("\nagentic-swe-factory plane OK.");
