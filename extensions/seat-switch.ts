/**
 * factory-seat-switch — human-operated seat (role profile) switching.
 *
 * Canon: Harness Handbook v1.2 roster model (Appendix E.5 profiles, WP5).
 * One Pi session serves four seats — scout, planner, worker, reviewer —
 * and the OPERATOR picks the active seat with /seat <role>. The active
 * profile is injected at each agent start, fresh from disk (pull model,
 * §2.4 — no frozen copies).
 *
 * Rules honored:
 * - Meta-Harness (§5.4): only the human switches seats. No tool is
 *   registered that would let the model switch itself.
 * - Profiles are the single source (L5): the extension injects the
 *   committed profile file verbatim; it never restates role law inline.
 * - Profiles resolve from the deployed rig clone:
 *   ~/.pi/agent/templates/agents/profiles/<seat>.md
 *   (override for drivers: RIG_PROFILES_DIR).
 * - Unknown seats fail closed: state is unchanged, nothing is injected.
 * - Context Budget Law (§1.4): injected profile is hard-capped
 *   (MAX_PROFILE_BYTES); oversized profiles are truncated with a marker.
 *
 * Seat state is rig-level state: ~/.pi/agent/seat-state.json, keyed by
 * absolute project path.
 *
 * API: verified against pi-coding-agent 0.84.3 (API-VERIFIED-0.84.3.md).
 */

import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The four seats bound by WP5 roster law (lint-profiles.mjs ROSTER_LAW). */
const SEATS = ["scout", "planner", "worker", "reviewer"] as const;
type Seat = (typeof SEATS)[number];

const MAX_PROFILE_BYTES = 16384; // ~4K tokens ceiling on injected profile

function profilesDir(): string {
  return process.env.RIG_PROFILES_DIR ?? join(homedir(), ".pi", "agent", "templates", "agents", "profiles");
}

function stateFile(): string {
  return join(homedir(), ".pi", "agent", "seat-state.json");
}

function loadState(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(stateFile(), "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveState(state: Record<string, string>): void {
  try {
    mkdirSync(join(homedir(), ".pi", "agent"), { recursive: true });
    writeFileSync(stateFile(), JSON.stringify(state, null, 2));
  } catch {
    // State loss degrades to no-seat; never crash.
  }
}

function activeSeat(cwd: string): Seat | null {
  const s = loadState()[cwd];
  return (SEATS as readonly string[]).includes(s) ? (s as Seat) : null;
}

function setSeat(cwd: string, seat: Seat | null): void {
  const state = loadState();
  if (seat) state[cwd] = seat;
  else delete state[cwd];
  saveState(state);
}

function profileFile(seat: Seat): string {
  return join(profilesDir(), `${seat}.md`);
}

export default function (pi: ExtensionAPI) {
  // Pull model: inject the active seat's profile fresh at each agent start.
  pi.on("before_agent_start", (event, ctx) => {
    const seat = activeSeat(ctx.cwd);
    if (!seat) return;

    let content = "";
    try {
      const file = profileFile(seat);
      if (existsSync(file)) {
        content = readFileSync(file, "utf8");
        if (Buffer.byteLength(content) > MAX_PROFILE_BYTES) {
          const buf = Buffer.from(content);
          content = buf.subarray(0, MAX_PROFILE_BYTES).toString("utf8") + "\n\n[profile truncated — exceeded 16KB injection cap]";
        }
      }
    } catch {
      content = "";
    }

    const block = content.length > 0
      ? `## Active seat: ${seat}\n\nYou are operating in the **${seat}** seat. Your binding profile follows verbatim — its actuation boundary and scope are law for this session:\n\n${content}`
      : `## Active seat: ${seat}\n\n(Profile file not found at ${profileFile(seat)} — the rig clone may be stale. Run the pull step, or /seat off to clear.)`;

    return { systemPrompt: `${event.systemPrompt}\n\n${block}` };
  });

  // /seat <role> | /seat off | /seat — human-operated switch.
  pi.registerCommand("seat", {
    description: "Switch the active seat: /seat scout|planner|worker|reviewer | /seat off | /seat (status)",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      const cwd = ctx.cwd;

      if (arg === "off") {
        setSeat(cwd, null);
        ctx.ui.notify("Seat cleared — session runs unseated (default orchestrator posture).", "info");
        return;
      }

      if (arg === "") {
        const seat = activeSeat(cwd);
        if (!seat) {
          ctx.ui.notify(`No active seat for ${cwd}. Set one: /seat ${SEATS.join("|")}`, "info");
          return;
        }
        const file = profileFile(seat);
        const size = existsSync(file) ? Buffer.byteLength(readFileSync(file, "utf8")) : 0;
        ctx.ui.notify(
          `Active seat: ${seat}\nProfile: ${file} (${size > 0 ? `${size} bytes` : "MISSING — pull the rig clone"})`,
          "info",
        );
        return;
      }

      if (!(SEATS as readonly string[]).includes(arg)) {
        ctx.ui.notify(`Unknown seat "${arg}". Seats are: ${SEATS.join(", ")} (or /seat off). State unchanged.`, "warning");
        return;
      }

      const seat = arg as Seat;
      if (!existsSync(profileFile(seat))) {
        ctx.ui.notify(
          `Profile for seat "${seat}" not found at ${profileFile(seat)} — state unchanged. Pull the rig clone (git -C ~/.pi/agent pull --ff-only).`,
          "error",
        );
        return;
      }

      setSeat(cwd, seat);
      ctx.ui.notify(`Seat set: ${seat} — profile injected at each turn, fresh from disk.`, "info");
    },
  });
}
