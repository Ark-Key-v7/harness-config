/**
 * factory-bash-guard — deterministic fail-closed bash interception.
 *
 * Canon: Harness Handbook v1.2 §2.3 (baseline extension #1, DANGER class),
 * §3.2 (bash channel enumerated, never trusted), §5.4 (Meta-Harness Restriction).
 * API: verified against pi-coding-agent 0.84.3 (see pi/extensions/API-VERIFIED-0.84.3.md,
 * divergence D1 — blocking is a RETURN VALUE, not a throw).
 *
 * Semantics:
 * - DANGER class: blocked unconditionally. No allowlist, no escalation path,
 *   no runtime override. Every block is logged. Changing a DANGER rule is a
 *   §5.4-governed human PR to this file — nothing else may modify it.
 * - ESCALATE class (PATTERN/COMMAND/PREFIX rules): interactive sessions may
 *   confirm via ctx.ui.confirm; non-UI modes (print/json/rpc-without-ui)
 *   fail CLOSED — a rule that cannot ask must block.
 * - Fail-closed by construction: any error inside guard evaluation returns
 *   block:true. A guard that cannot evaluate never lets the command through.
 * - user_bash (`!` / `!!` operator commands): DANGER applies to the operator
 *   too — DANGER protects the host, not just the agent.
 */

import {
  isToolCallEventType,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// DANGER CLASS — no-override, enumerated. §5.4 PR required to modify.
// ---------------------------------------------------------------------------

interface DangerRule {
  id: string;
  label: string;
  test: (segment: string) => boolean;
}

/** Split a command line into independently-evaluable segments. */
function segments(command: string): string[] {
  return command
    .split(/&&|\|\||;|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const FORK_BOMB = /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/;
const SPAWN_LOOP = /\bwhile\s+true\b[^;|&]*\bdo\b[^;|&]*&/;
const PIPE_TO_SHELL =
  /\b(curl|wget|fetch)\b[^|;&]*\|\s*(sudo\s+)?(env\s+\S+\s+)?(bash|sh|zsh|dash|ash|ksh|python[0-9.]*|perl|ruby|node)\b/;
const DD_TO_DEVICE =
  /\bdd\b[^;|&]*\bof=("|')?\/dev\/(sd[a-z]|nvme\d|hd[a-z]|vd[a-z]|xvd[a-z]|mmcblk\d|loop\d|dm-\d|disk\d)/;
const DISK_OPS =
  /(^|\s)(sudo\s+)?(mkfs(\.[a-z0-9]+)?|mkswap|fdisk|sfdisk|parted|wipefs|sgdisk|gdisk|cfdisk|cryptsetup\s+luksFormat)\b/;
const SHRED_DEVICE = /\bshred\b[^;|&]*\/dev\//;
const PROTECTED_BRANCHES = /\b(main|master|develop|development|production|prod|staging|release\/\S*)\b/;

function isRootDelete(seg: string): boolean {
  if (!/(^|\s)(sudo\s+)?rm\b/.test(seg)) return false;
  const flags = (seg.match(/(?<=\s)-{1,2}[a-zA-Z-]+/g) ?? []).join("");
  const recursive = /[rR]/.test(flags) || flags.includes("recursive");
  const force = /f/.test(flags) || flags.includes("force");
  if (!(recursive && force)) return false;
  // Targets the filesystem root, home root, or glob-equivalents.
  return /(^|\s)(\/|\/\*|~|~\/|\$HOME|\$\{HOME\})(\s|$)/.test(seg);
}

function isProtectedForcePush(seg: string): boolean {
  if (!/\bgit\s+(-C\s+\S+\s+)?push\b/.test(seg)) return false;
  if (!/(\s--force\b|\s--force-with-lease\b|\s-f\b)/.test(seg)) return false;
  return PROTECTED_BRANCHES.test(seg);
}

const DANGER_RULES: readonly DangerRule[] = [
  { id: "root-filesystem-deletion", label: "recursive root/filesystem deletion (rm -rf / and rooted variants)", test: isRootDelete },
  { id: "fork-bomb", label: "fork bomb / resource-exhaustion construct", test: (s) => FORK_BOMB.test(s) || SPAWN_LOOP.test(s) },
  { id: "pipe-to-shell", label: "pipe-to-shell remote execution (curl|bash, wget|sh and equivalents)", test: (s) => PIPE_TO_SHELL.test(s) },
  { id: "raw-device-write", label: "raw device write (dd to block device)", test: (s) => DD_TO_DEVICE.test(s) },
  { id: "disk-operation", label: "disk operation (mkfs/fdisk/parted class)", test: (s) => DISK_OPS.test(s) || SHRED_DEVICE.test(s) },
  { id: "protected-force-push", label: "force-push to a protected branch", test: isProtectedForcePush },
  // Rig law L12: npm audit is a report, never authorization to move a pin.
  // (Build incident: `npm audit fix --force` downgraded LanceDB 0.37.1 → 0.30.0.)
  { id: "pin-destruction", label: "npm audit fix --force (forbidden by rig supply-chain law L12)", test: (s) => /\bnpm\s+audit\s+fix\b[^;|&]*--force\b/.test(s) },
];

// ---------------------------------------------------------------------------
// ESCALATE CLASS — PATTERN/COMMAND/PREFIX rules. May ask; blocks when it
// cannot ask. §5.4 PR required to modify.
// ---------------------------------------------------------------------------

interface EscalateRule {
  id: string;
  label: string;
  test: (segment: string) => boolean;
}

function isRecursiveForcedRm(seg: string): boolean {
  if (!/(^|\s)(sudo\s+)?rm\b/.test(seg)) return false;
  const flags = (seg.match(/(?<=\s)-{1,2}[a-zA-Z-]+/g) ?? []).join("");
  const recursive = /[rR]/.test(flags) || flags.includes("recursive");
  const force = /f/.test(flags) || flags.includes("force");
  return recursive && force;
}

const ESCALATE_RULES: readonly EscalateRule[] = [
  { id: "recursive-delete", label: "recursive forced deletion (rm -rf on a non-root target)", test: isRecursiveForcedRm },
  { id: "force-push", label: "force-push (branch could not be classified as protected — judgment required)", test: (s) => /\bgit\s+(-C\s+\S+\s+)?push\b/.test(s) && /(\s--force\b|\s--force-with-lease\b|\s-f\b)/.test(s) },
  { id: "hard-reset", label: "git reset --hard (discards working-tree state)", test: (s) => /\bgit\s+reset\s+--hard\b/.test(s) },
  { id: "clean-force", label: "git clean -f (deletes untracked files)", test: (s) => /\bgit\s+clean\b[^;|&]*-[a-zA-Z]*f/.test(s) },
  { id: "sudo", label: "sudo elevation", test: (s) => /(^|\s)sudo\b/.test(s) },
  { id: "recursive-permission-change", label: "recursive chmod/chown", test: (s) => /\b(chmod|chown)\b[^;|&]*\s-R\b/.test(s) },
  { id: "package-publish", label: "package publish (npm/brew release action)", test: (s) => /\b(npm|pnpm|yarn)\s+publish\b/.test(s) },
  { id: "env-write", label: "write to a .env file (credential surface)", test: (s) => /(>|>>|tee)\s+[^;|&]*\.env\b/.test(s) },
  { id: "kill-9-all", label: "kill -9 -1 (kill every process in the session)", test: (s) => /\bkill\b[^;|&]*-9\s+-1\b/.test(s) },
];

// ---------------------------------------------------------------------------
// Evaluation + logging
// ---------------------------------------------------------------------------

interface Verdict {
  class: "allow" | "escalate" | "danger";
  ruleId?: string;
  ruleLabel?: string;
  segment?: string;
}

function evaluate(command: string): Verdict {
  for (const seg of segments(command)) {
    for (const rule of DANGER_RULES) {
      if (rule.test(seg)) {
        return { class: "danger", ruleId: rule.id, ruleLabel: rule.label, segment: seg };
      }
    }
    for (const rule of ESCALATE_RULES) {
      if (rule.test(seg)) {
        return { class: "escalate", ruleId: rule.id, ruleLabel: rule.label, segment: seg };
      }
    }
  }
  return { class: "allow" };
}

function logDir(): string {
  return join(homedir(), ".pi", "agent", "logs");
}

function logEvent(entry: Record<string, unknown>): void {
  try {
    mkdirSync(logDir(), { recursive: true });
    appendFileSync(
      join(logDir(), "bash-guard.jsonl"),
      JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n",
    );
  } catch {
    // Logging failure must never crash the guard; the block still stands.
  }
}

function dangerReason(v: Verdict): string {
  return (
    `BLOCKED by factory bash guard — DANGER class (${v.ruleId}): ${v.ruleLabel}. ` +
    `No override exists. Segment: \`${v.segment}\`. ` +
    `Changing this rule requires a human-ratified PR to harness-config (canon §5.4).`
  );
}

export default function (pi: ExtensionAPI) {
  // --- Agent bash tool interception ---------------------------------------
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;
    const command = event.input.command;

    let verdict: Verdict;
    try {
      verdict = evaluate(command);
    } catch (err) {
      // D1 resolution: fail CLOSED on guard-internal error.
      logEvent({ event: "guard_error", error: String(err), command });
      return { block: true as const, reason: "Bash guard evaluation error — failing closed (canon §3.2).", terminate: false };
    }

    if (verdict.class === "allow") return;

    if (verdict.class === "danger") {
      const reason = dangerReason(verdict);
      logEvent({ event: "block", class: "danger", rule: verdict.ruleId, segment: verdict.segment, command, cwd: ctx.cwd });
      pi.appendEntry("bash-guard", { action: "block", rule: verdict.ruleId, segment: verdict.segment });
      return { block: true as const, reason, terminate: false };
    }

    // escalate class
    if (ctx.hasUI) {
      const approved = await ctx.ui.confirm(
        `Bash guard — escalation (${verdict.ruleId})`,
        `${verdict.ruleLabel}\n\nSegment: ${verdict.segment}\n\nAllow this command?`,
      );
      logEvent({ event: approved ? "escalate_allowed" : "escalate_denied", rule: verdict.ruleId, segment: verdict.segment, command, cwd: ctx.cwd });
      if (!approved) {
        return { block: true as const, reason: `Denied by operator (bash guard, rule ${verdict.ruleId}).` };
      }
      return; // operator approved
    }

    // Non-UI mode: a rule that cannot ask must block.
    logEvent({ event: "escalate_blocked_no_ui", rule: verdict.ruleId, segment: verdict.segment, command, cwd: ctx.cwd });
    return {
      block: true as const,
      reason: `BLOCKED by factory bash guard — rule ${verdict.ruleId} (${verdict.ruleLabel}) requires interactive confirmation; non-UI mode fails closed.`,
    };
  });

  // --- Operator ! / !! interception: DANGER protects the host -------------
  pi.on("user_bash", (event, ctx) => {
    let verdict: Verdict;
    try {
      verdict = evaluate(event.command);
    } catch (err) {
      logEvent({ event: "guard_error", error: String(err), command: event.command });
      return {
        result: { output: "Bash guard evaluation error — failing closed (canon §3.2).", exitCode: 1, cancelled: false, truncated: false },
      };
    }
    if (verdict.class !== "danger") return; // operator's own escalate choices are theirs
    const reason = dangerReason(verdict);
    logEvent({ event: "block", class: "danger", channel: "user_bash", rule: verdict.ruleId, segment: verdict.segment, command: event.command, cwd: ctx.cwd });
    return {
      result: { output: reason, exitCode: 1, cancelled: false, truncated: false },
    };
  });
}
