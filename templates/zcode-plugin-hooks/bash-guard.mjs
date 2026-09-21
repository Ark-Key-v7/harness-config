#!/usr/bin/env node
/**
 * zcode-rig bash-guard hook (WP-F Phase 4; Z.13-D1 adapter over the shared
 * rule source). Canonical DANGER law: extensions/bash-guard.ts (§5.4 PR to
 * change). Fail-closed: ANY internal error => exit 2 (deny).
 * Reads the tool-call payload from stdin (JSON with tool_input.command),
 * falls back to argv. Exit 0 = allow, 2 = deny.
 */
import { readFileSync } from "node:fs";

const DANGER = [
  { name: "spawn-loop", test: (c) => /\bwhile\s+true\b[\s\S]*?\bdo\b/.test(c) && /&\s*$/.test(c.trim()) },
  { name: "shred-device", test: (c) => /\bshred\b[^;|&]*\/dev\//.test(c) },
  { name: "dd-to-device", test: (c) => /\bdd\b[^;|&]*of=\/dev\/(sd|nvme|hd|mmcblk)/.test(c) },
  { name: "mkfs", test: (c) => /\bmkfs(\.\w+)?\b/.test(c) },
  { name: "pipe-to-shell", test: (c) => /(curl|wget)[^;|&]*\|[^;|&]*(ba)?sh\b/.test(c) },
  {
    name: "recursive-rm-root",
    test: (c) => {
      const m = c.match(/\brm\b[^;|&]*/g) ?? [];
      return m.some((seg) => {
        const flags = (seg.match(/(?<=\s)-{1,2}[a-zA-Z-]+/g) ?? []).join("");
        const recursive = /[rR]/.test(flags) || flags.includes("recursive");
        const targetsRoot = /(^|\s)(\/|~|\/\*|\$HOME)(\s*$|\s|--)/.test(seg) || /--no-preserve-root/.test(seg);
        return recursive && targetsRoot;
      });
    },
  },
  { name: "chmod-777-recursive-root", test: (c) => /chmod[^;|&]*-R[^;|&]*777[^;|&]*(\/|~)\s*$/.test(c) },
];

try {
  let raw = "";
  try { raw = readFileSync(0, "utf8"); } catch { /* no stdin — argv fallback */ }
  let command = "";
  let parseFailed = false;
  try {
    const j = JSON.parse(raw);
    command = String(j?.tool_input?.command ?? j?.command ?? "");
  } catch { parseFailed = raw.trim().length > 0; command = raw; }
  if (parseFailed) {
    // A non-empty payload we cannot parse is a schema mismatch or corruption:
    // deny loudly (the harness schema is [UNVERIFIED] until the in-client pass;
    // a loud deny reports it, a silent allow hides it).
    console.error("[zcode-rig:bash-guard] DENY (fail-closed): unparseable payload — hook schema mismatch; report via rig-change");
    process.exit(2);
  }
  if (!command && process.argv[2]) command = process.argv.slice(2).join(" ");
  for (const rule of DANGER) {
    let hit = false;
    try { hit = rule.test(command); } catch { hit = true; /* rule error => deny */ }
    if (hit) {
      console.error(`[zcode-rig:bash-guard] DENY (DANGER ${rule.name}) — §5.4 PR to change; canonical: extensions/bash-guard.ts`);
      process.exit(2);
    }
  }
  process.exit(0);
} catch (e) {
  console.error(`[zcode-rig:bash-guard] DENY (fail-closed): ${e?.message ?? e}`);
  process.exit(2);
}
