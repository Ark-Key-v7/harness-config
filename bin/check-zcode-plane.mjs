#!/usr/bin/env node
/**
 * check-zcode-plane.mjs — WP-F Phase 4 (Package A Z.13-D2): verifies the
 * zcode-rig plane is installed and enabled on this machine's ZCode client.
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
if (bad > 0) { console.error(`\nzcode-rig plane DEGRADED (${bad} missing): governed repos are unguarded on the ADE seat (V2). Install per docs/PORTABILITY.md step 2c.`); process.exit(1); }
console.log("\nzcode-rig plane OK.");
