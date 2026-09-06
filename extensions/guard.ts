/**
 * factory-guard — Gate Integrity write boundary (Harness v1.3 §5.10.1).
 *
 * The protected list lives IN CODE at bin/guard-list.mjs (imported — one
 * source for this extension and the CI twin bin/guard.mjs). A data-file
 * list could be edited by the thing it constrains.
 *
 * Behavior: on tool_call for write/edit/bash-with-redirect, resolve the
 * target path(s) repo-root-relative and test the protected list; any match
 * blocks with a message naming the law (§5.10.1). FAIL CLOSED: a write
 * whose target cannot be determined is denied — undeterminable = denied.
 *
 * API: verified against pi-coding-agent 0.84.3 (pi/extensions/API-VERIFIED-0.84.3.md,
 * divergence D1 — blocking is a RETURN VALUE, not a throw). No UI escalation
 * path: the protected list is law, not a preference — §5.4 rig-change is the
 * only way through.
 */

import {
  isToolCallEventType,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
// @ts-ignore — plain-JS sibling, the single source of the protected list
import { checkPath } from "../bin/guard-list.mjs";

function logEvent(entry: Record<string, unknown>): void {
  try {
    const dir = join(homedir(), ".pi", "agent", "logs");
    mkdirSync(dir, { recursive: true });
    appendFileSync(join(dir, "guard.jsonl"), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
  } catch {
    // Logging failure must never crash the guard; the block still stands.
  }
}

/** Normalize a tool path argument to repo-root-relative forward slashes. */
function toRel(cwd: string, p: string): string {
  const abs = isAbsolute(p) ? p : resolve(cwd, p);
  return relative(cwd, abs).replaceAll("\\", "/");
}

function blockReason(what: string, label: string): string {
  return (
    `BLOCKED by factory guard (Gate Integrity §5.10.1): ${what} → ${label}. ` +
    `The protected list lives in the guard's source code (bin/guard-list.mjs); ` +
    `changing it is a §5.4-ratified rig-change — nothing else may modify it.`
  );
}

const FAIL_CLOSED =
  "BLOCKED by factory guard (Gate Integrity §5.10.1): write target could not be determined — a guard that cannot determine the diff fails closed. Undeterminable = denied.";

/**
 * Extract file-write targets from a bash command: `>`/`>>` redirects and
 * `tee` targets. Returns { targets } on success; { undeterminable: true }
 * when a write operator's target cannot be resolved to a literal path
 * (variable indirection, process substitution, missing operand).
 * fd-duplications (2>&1) are not file writes and are ignored.
 */
export function bashWriteTargets(command: string): { targets: string[] } | { undeterminable: true } {
  const targets: string[] = [];
  // tee targets
  for (const m of command.matchAll(/\btee\s+(?:-[a-zA-Z]+\s+)*([^\s;|&]+)?/g)) {
    const t = m[1];
    if (!t || t.startsWith("$") || t.startsWith("-")) return { undeterminable: true };
    targets.push(t);
  }
  // redirect targets (strip fd-dup forms first so 2>&1 doesn't confuse the match)
  const stripped = command.replace(/\d?>&\d/g, "");
  for (const m of stripped.matchAll(/(?:^|[^>])\d?(>>?)\s*([^\s;|&]+)?/g)) {
    if (!m[1]) continue;
    const t = m[2];
    if (!t) return { undeterminable: true }; // redirect with no visible operand
    if (t.startsWith("$") || t.startsWith("`") || t.startsWith("(")) return { undeterminable: true };
    targets.push(t);
  }
  return { targets };
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx: ExtensionContext) => {
    try {
      if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
        const p = event.input?.path;
        if (typeof p !== "string" || p.length === 0) {
          logEvent({ event: "block_fail_closed", tool: event.name, cwd: ctx.cwd });
          return { block: true as const, reason: FAIL_CLOSED, terminate: false };
        }
        const rel = toRel(ctx.cwd, p);
        const hit = checkPath(rel);
        if (hit.protected) {
          const reason = blockReason(rel, hit.label ?? "");
          logEvent({ event: "block", tool: event.name, path: rel, cwd: ctx.cwd });
          pi.appendEntry("guard", { action: "block", path: rel });
          return { block: true as const, reason, terminate: false };
        }
        return;
      }

      if (isToolCallEventType("bash", event)) {
        const command = event.input?.command;
        if (typeof command !== "string") {
          return { block: true as const, reason: FAIL_CLOSED, terminate: false };
        }
        const res = bashWriteTargets(command);
        if ("undeterminable" in res) {
          logEvent({ event: "block_fail_closed", tool: "bash", command, cwd: ctx.cwd });
          return { block: true as const, reason: FAIL_CLOSED, terminate: false };
        }
        for (const t of res.targets) {
          const rel = toRel(ctx.cwd, t);
          const hit = checkPath(rel);
          if (hit.protected) {
            const reason = blockReason(rel, hit.label ?? "");
            logEvent({ event: "block", tool: "bash", path: rel, command, cwd: ctx.cwd });
            pi.appendEntry("guard", { action: "block", path: rel, channel: "bash" });
            return { block: true as const, reason, terminate: false };
          }
        }
        return;
      }
    } catch (err) {
      // Fail-closed by construction: any error inside guard evaluation blocks.
      logEvent({ event: "guard_error", error: String(err), cwd: ctx.cwd });
      return { block: true as const, reason: `Guard evaluation error — failing closed (§5.10.1).`, terminate: false };
    }
  });
}
