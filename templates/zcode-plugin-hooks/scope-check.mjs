#!/usr/bin/env node
/**
 * zcode-rig sandbox-guard hook (Write|Edit matcher). Enforces the active
 * task contract's write scope from <cwd>/.pi/scope.json — the same file
 * bin/contract-scope.mjs emits for the Pi seat (harness-neutral format,
 * Z.13.1.1). Fail-closed: crash => exit 2. Absent scope => ungoverned
 * context => allow (exit 0). Payload: stdin JSON with tool_input.file_path
 * (or argv[2]). Exit 0 = allow, 2 = deny.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

try {
  let raw = "";
  try { raw = readFileSync(0, "utf8"); } catch { /* no stdin */ }
  let filePath = "";
  try {
    const j = JSON.parse(raw);
    filePath = String(j?.tool_input?.file_path ?? j?.tool_input?.path ?? "");
  } catch { filePath = raw.trim(); }
  if (!filePath && process.argv[2]) filePath = process.argv[2];

  const cwd = process.env.ZCODE_RIG_CWD ?? process.cwd();
  const scopePath = resolve(cwd, ".pi", "scope.json");
  if (!existsSync(scopePath)) process.exit(0); // ungoverned context — nothing to enforce

  const scope = JSON.parse(readFileSync(scopePath, "utf8"));
  const write = Array.isArray(scope.write) ? scope.write : [];
  if (write.length === 0) {
    console.error("[zcode-rig:scope-check] DENY: scope present but write list empty");
    process.exit(2);
  }
  const target = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
  const rel = relative(cwd, target);
  if (rel.startsWith("..")) {
    console.error(`[zcode-rig:scope-check] DENY: ${filePath} outside project root`);
    process.exit(2);
  }
  const ok = write.some((w) => {
    const wp = String(w).replace(/\/$/, "");
    return rel === wp || rel.startsWith(wp + "/");
  });
  if (!ok) {
    console.error(`[zcode-rig:scope-check] DENY: ${rel} not in contract write scope (${write.join(", ")}) — resolve the scope, never force`);
    process.exit(2);
  }
  process.exit(0);
} catch (e) {
  console.error(`[zcode-rig:scope-check] DENY (fail-closed): ${e?.message ?? e}`);
  process.exit(2);
}
