/**
 * factory-sandbox-guard — sub-graph write/read scope enforcement (WP2).
 *
 * Canon: Harness Handbook v1.2 §3.2 (Sub-Graph Sandbox), §3.10 (stale-read
 * guard), §5.4 (Meta-Harness Restriction), L9 (fail-closed).
 * API: verified against pi-coding-agent 0.84.3 (pi/extensions/API-VERIFIED-0.84.3.md,
 * divergence D1 — blocking is a RETURN VALUE, not a throw).
 *
 * Scope source: <cwd>/.pi/scope.json — the RESOLVED scope document. Later
 * work packages (WP7 contract schema, WP10 onboarding) generate it from the
 * active Task Contract's `sub_graph` resolved against gravity.md's Sub-Graph
 * Registry. This guard never parses the Registry or the contract itself — it
 * enforces the resolved artifact. Format:
 *
 *   {
 *     "contract": "task-001",              // informational, echoed in logs
 *     "write": ["src/feature-a/**"],        // globs relative to project root
 *     "read":  ["src/feature-a/**", "src/shared/**", "package.json"]
 *   }
 *
 * Semantics (with an active scope file):
 * - write/edit/bash mutations: target must match `write`. Everything else DENY.
 * - read/grep/find/ls: target must match `read` ∪ `write`. Everything else
 *   DENY, including the discovery attempt.
 * - Implicit denies regardless of scope: the scope file itself, `.tmd/**`
 *   (governance writes route through §5.4, never through an agent), and any
 *   path escaping the project root.
 * - Bash channel is enumerated, never trusted: redirection (>, >>, tee),
 *   in-place editors (sed -i, perl -pi), dd of=, git checkout/restore/apply,
 *   patch, package-manager mutations. A mutation whose write set cannot be
 *   statically resolved FAILS CLOSED.
 * - No scope file → guard inert (no active contract = ordinary interactive
 *   session). A MALFORMED scope file → fail closed: a contract that cannot
 *   be read is a contract that cannot be satisfied.
 *
 * Stale-read guard (§3.10, independent of scope): every read tool_result
 * records the file's mtime. A write/edit to a file whose mtime has moved
 * since the agent last read it is blocked with a re-read instruction. Our own
 * writes re-baseline; mutating bash commands clear all baselines (the agent
 * must re-read after out-of-band change).
 *
 * Fail-closed by construction: any guard-internal error returns block:true.
 */

import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, normalize as pnormalize, relative, resolve, sep } from "node:path";

// ---------------------------------------------------------------------------
// Logging (rig-level telemetry, never committed law)
// ---------------------------------------------------------------------------

function logDir(): string {
  return join(homedir(), ".pi", "agent", "logs");
}

function logEvent(entry: Record<string, unknown>): void {
  try {
    mkdirSync(logDir(), { recursive: true });
    appendFileSync(
      join(logDir(), "sandbox-guard.jsonl"),
      JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n",
    );
  } catch {
    // Logging failure must never crash the guard; the block still stands.
  }
}

// ---------------------------------------------------------------------------
// Scope loading and glob matching
// ---------------------------------------------------------------------------

interface Scope {
  contract?: string;
  write: string[];
  read: string[];
}

type ScopeLoad =
  | { status: "none" }
  | { status: "ok"; scope: Scope }
  | { status: "error"; error: string };

function scopeFilePath(cwd: string): string {
  return join(cwd, ".pi", "scope.json");
}

function loadScope(cwd: string): ScopeLoad {
  const p = scopeFilePath(cwd);
  if (!existsSync(p)) return { status: "none" };
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<Scope>;
    if (!Array.isArray(raw.write) || !Array.isArray(raw.read)) {
      return { status: "error", error: "scope.json must contain string arrays 'write' and 'read'" };
    }
    return { status: "ok", scope: { contract: raw.contract, write: raw.write, read: raw.read } };
  } catch (err) {
    return { status: "error", error: String(err) };
  }
}

/** Normalize a path to forward slashes for glob comparison. */
function slashed(p: string): string {
  return p.split(sep).join("/").replace(/\\/g, "/");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match a root-relative, forward-slashed path against a scope glob. */
function matchGlob(rel: string, pattern: string): boolean {
  const pat = slashed(pattern).replace(/^\.\//, "").replace(/\/+$/, "");
  if (pat === rel) return true;
  if (pat.endsWith("/**")) {
    const base = pat.slice(0, -3);
    return rel === base || rel.startsWith(base + "/");
  }
  if (!pat.includes("*")) return false;
  const rx = new RegExp(
    "^" +
      pat
        .split("**")
        .map((part) => part.split("*").map(escapeRegex).join("[^/]*"))
        .join(".*") +
      "$",
  );
  return rx.test(rel);
}

type PathVerdict =
  | { verdict: "in"; rel: string }
  | { verdict: "out"; rel: string }
  | { verdict: "escape"; rel: string };

/** Resolve a tool path argument against a pattern set, relative to project root. */
function resolveAgainst(cwd: string, p: string | undefined, patterns: string[]): PathVerdict {
  const target = p === undefined || p === "" ? "." : p;
  const abs = isAbsolute(target) ? pnormalize(target) : resolve(cwd, target);
  const relRaw = relative(cwd, abs);
  const rel = slashed(relRaw === "" ? "." : relRaw);
  if (relRaw.startsWith("..") || isAbsolute(relRaw)) {
    return { verdict: "escape", rel };
  }
  for (const pat of patterns) {
    if (matchGlob(rel, pat)) return { verdict: "in", rel };
  }
  return { verdict: "out", rel };
}

/** Implicit denies — law surfaces no task contract may open. */
function isImplicitDeny(rel: string): boolean {
  return rel === ".pi/scope.json" || rel === ".tmd" || rel.startsWith(".tmd/");
}

// ---------------------------------------------------------------------------
// Bash channel — enumerated mutation classes (never trusted)
// ---------------------------------------------------------------------------

interface BashFinding {
  class: string;
  target?: string; // unresolved/dynamic when undefined
}

const REDIRECT = /(?:^|\s)\d?>>?\s*("[^"]+"|'[^']+'|[^\s;|&]+)/g;
const TEE = /\btee\s+((?:-[a-zA-Z]+\s+)*)((?:"[^"]+"|'[^']+'|[^\s;|&]+)+)/g;
const SED_I = /\bsed\s+((?:-\S+\s+)*-\w*i\w*(?:\s+-\S+)*)\s+(.+)/;
const PERL_PI = /\bperl\s+[^\s;|&]*-p\w*i\w*\s+(.+)/;
const DD_OF = /\bdd\b[^;|&]*\bof=("[^"]+"|'[^']+'|[^\s;|&]+)/;
const GIT_MUTATE = /\bgit\s+(?:-C\s+\S+\s+)?(checkout|restore)\b[^;|&]*/;
const GIT_APPLY = /\bgit\s+(?:-C\s+\S+\s+)?apply\b/;
const PATCH_CMD = /(^|\s)patch\s/;
const PKG_MUTATE = /\b(npm|pnpm|yarn|bun)\s+(install|i|add|remove|uninstall|update|rm)\b/;

function isDynamic(token: string): boolean {
  return /\$\(|\$\{|`|\$[A-Za-z_]/.test(token);
}

function unquote(token: string): string {
  return token.replace(/^["']|["']$/g, "");
}

/** Trailing non-flag tokens after a one-script-arg editor (sed -i / perl -pi). */
function trailingFileArgs(argsBlob: string): string[] {
  const tokens = argsBlob.split(/\s+/).filter((t) => t.length > 0);
  const files: string[] = [];
  let scriptSeen = false;
  for (const t of tokens) {
    if (!scriptSeen) {
      scriptSeen = true; // the script arg itself
      continue;
    }
    if (t.startsWith("-")) continue;
    files.push(unquote(t));
  }
  return files;
}

/** Extract every write target we can resolve statically from one segment. */
function analyzeBashSegment(seg: string): BashFinding[] {
  const findings: BashFinding[] = [];

  for (const m of seg.matchAll(REDIRECT)) {
    const target = unquote(m[1]);
    findings.push(isDynamic(target) ? { class: "redirect" } : { class: "redirect", target });
  }
  for (const m of seg.matchAll(TEE)) {
    const target = unquote(m[2]);
    findings.push(isDynamic(target) ? { class: "tee" } : { class: "tee", target });
  }
  const sedM = seg.match(SED_I);
  if (sedM) {
    const files = trailingFileArgs(sedM[2]);
    if (files.length === 0) findings.push({ class: "sed-i" });
    for (const f of files) findings.push(isDynamic(f) ? { class: "sed-i" } : { class: "sed-i", target: f });
  }
  const perlM = seg.match(PERL_PI);
  if (perlM) {
    const files = trailingFileArgs(perlM[1]);
    if (files.length === 0) findings.push({ class: "perl-pi" });
    for (const f of files) findings.push(isDynamic(f) ? { class: "perl-pi" } : { class: "perl-pi", target: f });
  }
  const ddM = seg.match(DD_OF);
  if (ddM) {
    const target = unquote(ddM[1]);
    findings.push(isDynamic(target) ? { class: "dd" } : { class: "dd", target });
  }
  const gitM = seg.match(GIT_MUTATE);
  if (gitM) {
    const after = seg.slice(seg.indexOf(gitM[1]) + gitM[1].length);
    const paths = after
      .replace(/--\s*/, " ")
      .split(/\s+/)
      .filter((t) => t.length > 0 && !t.startsWith("-"))
      .map(unquote);
    if (paths.length === 0) findings.push({ class: "git-mutate" });
    for (const p of paths) findings.push(isDynamic(p) ? { class: "git-mutate" } : { class: "git-mutate", target: p });
  }
  if (GIT_APPLY.test(seg)) findings.push({ class: "git-apply" }); // patch declares its own paths — unresolvable
  if (PATCH_CMD.test(seg)) findings.push({ class: "patch" }); // same
  if (PKG_MUTATE.test(seg)) {
    // Dependency mutation writes the manifest (and lockfile); node_modules is
    // gitignored build output and stays outside scope arithmetic.
    findings.push({ class: "package-manager", target: "package.json" });
  }
  return findings;
}

function bashSegments(command: string): string[] {
  return command
    .split(/&&|\|\||;|\n|\|/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Stale-read baselines (§3.10)
// ---------------------------------------------------------------------------

/** absPath -> mtimeMs at last agent read (or our own write). */
const readBaseline = new Map<string, number>();

function mtimeOf(abs: string): number | null {
  try {
    return statSync(abs).mtimeMs;
  } catch {
    return null;
  }
}

function absOf(cwd: string, p: string): string {
  return isAbsolute(p) ? pnormalize(p) : resolve(cwd, p);
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

function blockReason(text: string): { block: true; reason: string; terminate: false } {
  return { block: true as const, reason: text, terminate: false as const };
}

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", (event, ctx) => {
    try {
      const load = loadScope(ctx.cwd);

      // --- Stale-read guard runs even without an active contract ----------
      const isWrite = isToolCallEventType("write", event);
      const isEdit = !isWrite && isToolCallEventType("edit", event);
      if (isWrite || isEdit) {
        const abs = absOf(ctx.cwd, event.input.path);
        const seen = readBaseline.get(abs);
        const now = mtimeOf(abs);
        if (seen !== undefined && now !== null && now !== seen) {
          logEvent({ event: "stale_read_block", path: event.input.path, cwd: ctx.cwd });
          pi.appendEntry("sandbox-guard", { action: "stale-read", path: event.input.path });
          return blockReason(
            `BLOCKED by sandbox guard — stale read (§3.10): \`${event.input.path}\` changed on disk since you last read it. ` +
              `Re-read the file, recompute your edit against the current content, then write.`,
          );
        }
      }

      if (load.status === "none") return; // no active contract — inert
      if (load.status === "error") {
        // A contract that cannot be read cannot be satisfied: fail closed.
        logEvent({ event: "scope_error_block", error: load.error, cwd: ctx.cwd });
        return blockReason(
          `BLOCKED by sandbox guard — .pi/scope.json is present but unreadable (${load.error}). ` +
            `Fail-closed (L9): fix or remove the scope file; do not work around it.`,
        );
      }
      const scope = load.scope;

      // --- Write tools -----------------------------------------------------
      if (isWrite || isEdit) {
        const v = resolveAgainst(ctx.cwd, event.input.path, scope.write);
        if (v.verdict === "in" && !isImplicitDeny(v.rel)) return;
        const reason =
          v.verdict === "escape"
            ? `path escapes the project root`
            : isImplicitDeny(v.rel)
              ? `\`${v.rel}\` is a governance surface (.tmd/ or the scope file) — changed only via §5.4 human PR, never by an agent`
              : `\`${v.rel}\` is outside the declared write scope of contract ${scope.contract ?? "(unnamed)"}`;
        logEvent({ event: "block", channel: event.name, kind: "write", path: v.rel, contract: scope.contract, cwd: ctx.cwd });
        pi.appendEntry("sandbox-guard", { action: "block", kind: "write", path: v.rel });
        return blockReason(
          `BLOCKED by sandbox guard — out-of-scope write: ${reason}. ` +
            `Write scope: ${JSON.stringify(scope.write)}. To widen scope, escalate per the contract's escalation path.`,
        );
      }

      // --- Read tools -------------------------------------------------------
      const isRead = isToolCallEventType("read", event);
      const isGrep = !isRead && isToolCallEventType("grep", event);
      const isFind = !isRead && !isGrep && isToolCallEventType("find", event);
      const isLs = !isRead && !isGrep && !isFind && isToolCallEventType("ls", event);
      if (isRead || isGrep || isFind || isLs) {
        const readSet = [...scope.read, ...scope.write];
        const v = resolveAgainst(ctx.cwd, event.input.path, readSet);
        if (v.verdict === "in") return;
        logEvent({ event: "block", channel: event.name, kind: "read", path: v.rel, contract: scope.contract, cwd: ctx.cwd });
        pi.appendEntry("sandbox-guard", { action: "block", kind: "read", path: v.rel });
        return blockReason(
          `BLOCKED by sandbox guard — out-of-scope read (discovery counts): \`${v.rel}\` is outside the contract's ` +
            `read closure ${JSON.stringify(readSet)}. If you need it, escalate per the contract's escalation path.`,
        );
      }

      // --- Bash channel ------------------------------------------------------
      if (isToolCallEventType("bash", event)) {
        const findings = bashSegments(event.input.command).flatMap(analyzeBashSegment);
        if (findings.length === 0) return; // no enumerated mutation class present
        for (const f of findings) {
          if (f.target === undefined) {
            logEvent({ event: "block", channel: "bash", kind: "unresolvable", class: f.class, command: event.input.command, cwd: ctx.cwd });
            pi.appendEntry("sandbox-guard", { action: "block", kind: "unresolvable", class: f.class });
            return blockReason(
              `BLOCKED by sandbox guard — unresolvable ${f.class} mutation (fails closed, §3.2): its write set cannot be ` +
                `determined statically. Rewrite the command with explicit literal paths inside the declared scope, ` +
                `or use the write/edit tools.`,
            );
          }
          const v = resolveAgainst(ctx.cwd, f.target, scope.write);
          if (v.verdict === "in" && !isImplicitDeny(v.rel)) continue;
          logEvent({ event: "block", channel: "bash", kind: "write", class: f.class, path: v.rel, command: event.input.command, cwd: ctx.cwd });
          pi.appendEntry("sandbox-guard", { action: "block", kind: "bash-write", class: f.class, path: v.rel });
          return blockReason(
            `BLOCKED by sandbox guard — bash ${f.class} targets \`${v.rel}\`, outside the contract's write scope ` +
              `${JSON.stringify(scope.write)}. Escalate per the contract's escalation path.`,
          );
        }
        return;
      }

      return;
    } catch (err) {
      // Fail closed on guard-internal error (L9, D1 resolution).
      logEvent({ event: "guard_error", error: String(err), cwd: ctx.cwd });
      return blockReason("BLOCKED by sandbox guard — internal evaluation error; failing closed (L9).");
    }
  });

  // --- Baseline maintenance -------------------------------------------------
  pi.on("tool_result", (event, ctx) => {
    try {
      if (event.isError) return;
      if (event.toolName === "read") {
        const abs = absOf(ctx.cwd, (event.input as { path: string }).path);
        const m = mtimeOf(abs);
        if (m !== null) readBaseline.set(abs, m);
        return;
      }
      if (event.toolName === "write" || event.toolName === "edit") {
        // Our own write re-baselines the file we just produced.
        const abs = absOf(ctx.cwd, (event.input as { path: string }).path);
        const m = mtimeOf(abs);
        if (m !== null) readBaseline.set(abs, m);
        return;
      }
      if (event.toolName === "bash") {
        // A mutating bash command invalidates every baseline — the agent must
        // re-read before writing anything it held state on.
        const findings = bashSegments((event.input as { command: string }).command).flatMap(analyzeBashSegment);
        if (findings.length > 0) readBaseline.clear();
      }
    } catch {
      // Baseline maintenance is advisory; never throw from here.
    }
  });

  pi.on("session_shutdown", () => {
    readBaseline.clear();
  });
}
