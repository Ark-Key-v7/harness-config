/**
 * factory-memory-toggle — human-toggled project memory injection.
 *
 * Canon: Harness Handbook v1.2 §2.3 (baseline extension #4) and §5.2:
 * a /memory command flips project memory.md injection on or off; when on, a
 * usage block is injected teaching the agent to read and update the file
 * proactively. Session memory is the lightweight interactive-session
 * complement to STATE.md — project-scoped, human-toggled.
 *
 * Rules honored:
 * - Two-subdirectory rule (§3.9): memory.md is TELEMETRY (what the agent
 *   learned), never law. It lives at .pi/memory.md and is git-ignored —
 *   never committed, never treated as constraint text.
 * - Meta-Harness (§5.4): only the human toggles. No tool is registered that
 *   would let the model flip the switch.
 * - Pull model (§2.4): memory content is read fresh from disk at each
 *   before_agent_start — no frozen copies.
 * - Context Budget Law (§1.4): injected content is hard-capped
 *   (MAX_MEMORY_BYTES); an oversized memory file is truncated with a marker,
 *   never silently flooding the window.
 *
 * API: verified against pi-coding-agent 0.84.3 (API-VERIFIED-0.84.3.md).
 * Toggle state is rig-level state: ~/.pi/agent/memory-state.json, keyed by
 * absolute project path.
 */

import { type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MAX_MEMORY_BYTES = 8192; // ~2K tokens ceiling on injected memory

function stateFile(): string {
  return join(homedir(), ".pi", "agent", "memory-state.json");
}

function loadState(): Record<string, boolean> {
  try {
    return JSON.parse(readFileSync(stateFile(), "utf8")) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveState(state: Record<string, boolean>): void {
  try {
    mkdirSync(join(homedir(), ".pi", "agent"), { recursive: true });
    writeFileSync(stateFile(), JSON.stringify(state, null, 2));
  } catch {
    // State loss degrades the toggle to default-off; never crash.
  }
}

function isEnabled(cwd: string): boolean {
  return loadState()[cwd] === true;
}

function setEnabled(cwd: string, on: boolean): void {
  const state = loadState();
  if (on) state[cwd] = true;
  else delete state[cwd];
  saveState(state);
}

function memoryFile(cwd: string): string {
  return join(cwd, ".pi", "memory.md");
}

const USAGE_BLOCK = `## Project memory (enabled)

A project-scoped memory file exists at .pi/memory.md. It is YOUR working memory across sessions for this project:
- UPDATE it when you learn durable facts: build/test commands, environment quirks, operator preferences, decisions made and why.
- Keep it short and factual — it is injected into every turn. Prune stale entries when you update it.
- It is memory, not law: constraints and rules belong to the manifold (.tmd/), never here.
- Do not store secrets or credentials in it.`;

export default function (pi: ExtensionAPI) {
  // Pull model: inject fresh memory + usage block at each agent start.
  pi.on("before_agent_start", (event, ctx) => {
    if (!isEnabled(ctx.cwd)) return;

    let content = "";
    const file = memoryFile(ctx.cwd);
    try {
      if (existsSync(file)) {
        content = readFileSync(file, "utf8");
        if (Buffer.byteLength(content) > MAX_MEMORY_BYTES) {
          const buf = Buffer.from(content);
          content = buf.subarray(0, MAX_MEMORY_BYTES).toString("utf8") + "\n\n[memory truncated — exceeded 8KB injection cap; prune .pi/memory.md]";
        }
      }
    } catch {
      content = ""; // unreadable memory degrades to usage-block-only
    }

    // Judge emptiness by the body — the stock header alone is not memory.
    const body = content.replace(/^# Project memory\s*/m, "").trim();
    const block = body.length > 0
      ? `${USAGE_BLOCK}\n\n### Current memory contents\n\n${body}`
      : `${USAGE_BLOCK}\n\n(The memory file is empty or does not exist yet. Create it when you learn the first durable fact.)`;

    return { systemPrompt: `${event.systemPrompt}\n\n${block}` };
  });

  // /memory [on|off] — human-operated switch.
  pi.registerCommand("memory", {
    description: "Toggle project memory injection: /memory on | /memory off | /memory (status)",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      const cwd = ctx.cwd;
      const file = memoryFile(cwd);

      if (arg === "on") {
        try {
          mkdirSync(join(cwd, ".pi"), { recursive: true });
          if (!existsSync(file)) writeFileSync(file, "# Project memory\n\n");
          // Memory is telemetry, not law — keep it out of git (L10).
          const gitignore = join(cwd, ".pi", ".gitignore");
          if (!existsSync(gitignore)) writeFileSync(gitignore, "memory.md\n");
        } catch (err) {
          ctx.ui.notify(`memory: failed to initialize .pi/memory.md — ${String(err)}`, "error");
          return;
        }
        setEnabled(cwd, true);
        ctx.ui.notify("Project memory ON — .pi/memory.md will be injected at each turn (8KB cap).", "info");
        return;
      }

      if (arg === "off") {
        setEnabled(cwd, false);
        ctx.ui.notify("Project memory OFF — the file is kept on disk but no longer injected.", "info");
        return;
      }

      if (arg === "") {
        const on = isEnabled(cwd);
        const exists = existsSync(file);
        const size = exists ? Buffer.byteLength(readFileSync(file, "utf8")) : 0;
        ctx.ui.notify(
          `Project memory is ${on ? "ON" : "OFF"} for ${cwd}\nFile: ${file} (${exists ? `${size} bytes` : "not created"})`,
          "info",
        );
        return;
      }

      ctx.ui.notify(`Usage: /memory on | /memory off | /memory (got "${args}")`, "warning");
    },
  });
}
