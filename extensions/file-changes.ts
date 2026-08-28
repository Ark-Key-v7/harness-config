/**
 * factory-file-changes — structured file-change log with undo.
 *
 * Canon: Harness Handbook v1.2 §2.3 (baseline extension #2): write/edit tool
 * calls produce structured deltas (paths, line counts, diffs) so the operator
 * can inspect and revert a single bad change without git archaeology. Doubles
 * as the §5.7 audit substrate and the §3.10 layer-3 rollback mechanism
 * (change state — "one edit in an otherwise passing run was bad").
 *
 * API: verified against pi-coding-agent 0.84.3 (API-VERIFIED-0.84.3.md).
 *   write input: { path, content }  ·  edit input: { path, edits: [{oldText,newText}] }
 *   edit result details: { diff, patch, firstChangedLine? } — patch is the
 *   standard unified diff, captured verbatim.
 *
 * Design:
 * - tool_call (write/edit): snapshot pre-state (content or "did not exist").
 * - tool_result (write/edit, non-error): read post-state, compute line deltas,
 *   store before/after backups, append a JSONL record + session entry.
 * - /undo command: `/undo` lists recent changes; `/undo <N>` (or `latest`)
 *   restores change N's pre-state — rewrites the file, or deletes it if the
 *   change created it. Interactive sessions confirm first; non-UI mode
 *   requires an explicit index (fail-closed, no blind reverts).
 *
 * Storage (rig-level state, not committed law):
 *   ~/.pi/agent/logs/file-changes.jsonl          — the structured log
 *   ~/.pi/agent/logs/file-changes/<id>.before    — pre-state backup
 *   ~/.pi/agent/logs/file-changes/<id>.after     — post-state backup
 */

import {
  isToolCallEventType,
  isEditToolResult,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function logDir(): string {
  return join(homedir(), ".pi", "agent", "logs");
}
function backupDir(): string {
  return join(logDir(), "file-changes");
}
function logFile(): string {
  return join(logDir(), "file-changes.jsonl");
}

function appendLog(entry: Record<string, unknown>): void {
  try {
    mkdirSync(backupDir(), { recursive: true });
    appendFileSync(logFile(), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // Logging failure must never crash the harness.
  }
}

interface LogEntry {
  ts: string;
  id: string;
  event: string;
  tool?: string;
  path?: string;
  existedBefore?: boolean;
  linesBefore?: number;
  linesAfter?: number;
  bytesBefore?: number;
  bytesAfter?: number;
  patch?: string;
  [k: string]: unknown;
}

function readLog(): LogEntry[] {
  try {
    return readFileSync(logFile(), "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l) as LogEntry);
  } catch {
    return [];
  }
}

function countLines(content: string): number {
  return content.length === 0 ? 0 : content.split("\n").length;
}

// ---------------------------------------------------------------------------
// Pending pre-state snapshots (toolCallId -> snapshot)
// ---------------------------------------------------------------------------

interface PendingChange {
  tool: "write" | "edit";
  absPath: string;
  relPath: string;
  existedBefore: boolean;
  before: string | null;
  startedAt: string;
}

const pending = new Map<string, PendingChange>();

function resolvePath(cwd: string, p: string): string {
  return isAbsolute(p) ? p : resolve(cwd, p);
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", (event, ctx) => {
    const isWrite = isToolCallEventType("write", event);
    const isEdit = !isWrite && isToolCallEventType("edit", event);
    if (!isWrite && !isEdit) return;

    try {
      const absPath = resolvePath(ctx.cwd, event.input.path);
      const existed = existsSync(absPath);
      pending.set(event.toolCallId, {
        tool: isWrite ? "write" : "edit",
        absPath,
        relPath: event.input.path,
        existedBefore: existed,
        before: existed ? readFileSync(absPath, "utf8") : null,
        startedAt: new Date().toISOString(),
      });
    } catch (err) {
      // Observation-only extension: a snapshot failure degrades the log,
      // never blocks the tool. Record the gap so the ledger stays honest.
      appendLog({ event: "snapshot_error", error: String(err), toolCallId: event.toolCallId });
    }
  });

  pi.on("tool_result", (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") return;
    const snap = pending.get(event.toolCallId);
    pending.delete(event.toolCallId);
    if (!snap) return;

    if (event.isError) {
      appendLog({ event: "change_failed", tool: snap.tool, path: snap.relPath });
      return;
    }

    try {
      const after = existsSync(snap.absPath) ? readFileSync(snap.absPath, "utf8") : null;
      const id = `${Date.now()}-${event.toolCallId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

      mkdirSync(backupDir(), { recursive: true });
      if (snap.before !== null) writeFileSync(join(backupDir(), `${id}.before`), snap.before);
      if (after !== null) writeFileSync(join(backupDir(), `${id}.after`), after);

      const patch = isEditToolResult(event) ? event.details?.patch : undefined;

      appendLog({
        event: "change",
        id,
        tool: snap.tool,
        path: snap.relPath,
        absPath: snap.absPath,
        existedBefore: snap.existedBefore,
        linesBefore: snap.before === null ? 0 : countLines(snap.before),
        linesAfter: after === null ? 0 : countLines(after),
        bytesBefore: snap.before === null ? 0 : Buffer.byteLength(snap.before),
        bytesAfter: after === null ? 0 : Buffer.byteLength(after),
        patch,
      });
      pi.appendEntry("file-change", { id, tool: snap.tool, path: snap.relPath });
    } catch (err) {
      appendLog({ event: "log_error", error: String(err), toolCallId: event.toolCallId, path: snap.relPath });
    }
  });

  pi.on("session_shutdown", () => {
    pending.clear();
  });

  // --- /undo ---------------------------------------------------------------
  pi.registerCommand("undo", {
    description: "List recent file changes (/undo) or revert one (/undo <N|latest>) — factory file-changes log",
    handler: async (args, ctx) => {
      // Revertible set = changes minus already-undone ones (undo events
      // accumulate in the same log; "latest" must mean latest REVERTIBLE).
      const all = readLog();
      const undoneIds = new Set(
        all.filter((e) => e.event === "undo").map((e) => e.undoneId as string),
      );
      const entries = all.filter((e) => e.event === "change" && !undoneIds.has(e.id));
      if (entries.length === 0) {
        ctx.ui.notify("file-changes: no revertible changes.", "info");
        return;
      }

      const trimmed = args.trim();
      if (trimmed === "") {
        const recent = entries.slice(-10);
        const lines = recent.map(
          (e, i) =>
            `${entries.length - recent.length + i + 1}. [${e.tool}] ${e.path}  (${e.linesBefore}→${e.linesAfter} lines)  ${e.ts}`,
        );
        ctx.ui.notify(`Recent changes (oldest→newest):\n${lines.join("\n")}\n\nRevert with /undo <N> or /undo latest`, "info");
        return;
      }

      // Non-UI sessions must name a target explicitly — no blind reverts.
      const target =
        trimmed === "latest" ? entries.length : Number.parseInt(trimmed, 10);
      if (!Number.isInteger(target) || target < 1 || target > entries.length) {
        ctx.ui.notify(`file-changes: invalid index "${trimmed}" (1..${entries.length} or "latest").`, "error");
        return;
      }
      const entry = entries[target - 1];
      const beforeFile = join(backupDir(), `${entry.id}.before`);

      if (ctx.hasUI) {
        const ok = await ctx.ui.confirm(
          "file-changes: revert",
          `Restore pre-state of change ${target}?\n\n[${entry.tool}] ${entry.path}\n${entry.existedBefore ? "File content will be restored from backup." : "The file did not exist before this change and will be DELETED."}`,
        );
        if (!ok) {
          ctx.ui.notify("Revert cancelled.", "info");
          return;
        }
      }

      try {
        const absPath = (entry.absPath as string) ?? resolve(ctx.cwd, entry.path as string);
        if (entry.existedBefore) {
          const content = readFileSync(beforeFile, "utf8");
          writeFileSync(absPath, content);
        } else {
          if (existsSync(absPath)) unlinkSync(absPath);
        }
        appendLog({ event: "undo", undoneId: entry.id, path: entry.path, restored: entry.existedBefore ? "content" : "deleted" });
        ctx.ui.notify(`Reverted change ${target}: ${entry.path}`, "info");
      } catch (err) {
        appendLog({ event: "undo_error", undoneId: entry.id, error: String(err) });
        ctx.ui.notify(`Undo failed for change ${target}: ${String(err)}`, "error");
      }
    },
  });
}
