#!/usr/bin/env node
/**
 * memory-verify.mjs — WP-MEM §3.2: the human verify path.
 *
 * Draft memory entries (.agents/memory/drafts/*.md) become memory only
 * through operator approval (M2: verified flips true ONLY here). This tool
 * lists drafts, and on approval moves verified entries into the wiki tree
 * (.agents/memory/) with `verified: true` stamped. It commits nothing —
 * the operator commits (GitOps law).
 *
 * Usage:
 *   node bin/memory-verify.mjs --list [--root DIR]
 *   node bin/memory-verify.mjs --approve <id>|all [--root DIR]
 *     --list            show drafts + verified counts
 *     --approve <id>    verify one draft (moves it out of drafts/)
 *     --approve all     batch verify (end-of-session review)
 *     --root            project root (default: cwd)
 *
 * Exit 0 = ok. Exit 1 = bad usage or missing dirs.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const get = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : null; };
const ROOT = get("root") ?? process.cwd();
const DRAFTS = join(ROOT, ".agents", "memory", "drafts");
const STORE = join(ROOT, ".agents", "memory");

if (!argv.includes("--list") && !argv.includes("--approve")) {
  console.error("usage: node bin/memory-verify.mjs --list | --approve <id>|all [--root DIR]");
  process.exit(1);
}
if (!existsSync(DRAFTS)) {
  console.error(`no drafts dir at ${DRAFTS} — nothing to verify`);
  process.exit(argv.includes("--list") ? 0 : 1);
}

const drafts = readdirSync(DRAFTS).filter((f) => f.endsWith(".md"));
const verified = existsSync(STORE)
  ? readdirSync(STORE).filter((f) => f.endsWith(".md")).length
  : 0;

if (argv.includes("--list")) {
  console.log(`drafts: ${drafts.length}, verified entries: ${verified}`);
  for (const f of drafts) {
    const t = readFileSync(join(DRAFTS, f), "utf8");
    const id = t.match(/^id:\s*(\S+)/m)?.[1] ?? f;
    const from = t.match(/^derived_from:\s*"?([^"\n]+)"?/m)?.[1] ?? "(no provenance — M2 violation, will be deleted at compaction)";
    const tags = t.match(/^tags:\s*\[([^\]]*)\]/m)?.[1]?.trim() ?? "";
    console.log(`  ${id}  derived_from: ${from}${tags ? `  tags: [${tags}]` : ""}`);
  }
  process.exit(0);
}

const target = get("approve");
if (!target) { console.error("--approve needs an id or 'all'"); process.exit(1); }
const ids = target === "all"
  ? drafts.map((f) => readFileSync(join(DRAFTS, f), "utf8").match(/^id:\s*(\S+)/m)?.[1] ?? f.replace(/\.md$/, ""))
  : [target];

mkdirSync(STORE, { recursive: true });
let moved = 0;
for (const id of ids) {
  const file = drafts.find((f) => f === `${id}.md`) ?? drafts.find((f) => readFileSync(join(DRAFTS, f), "utf8").includes(`id: ${id}`));
  if (!file) { console.error(`no draft with id "${id}"`); continue; }
  let text = readFileSync(join(DRAFTS, file), "utf8");
  if (!/derived_from:/.test(text)) { console.error(`SKIP ${id}: no derived_from — an entry without provenance is deleted at compaction, never verified (M2)`); continue; }
  text = text.replace(/^verified:\s*false/m, "verified: true");
  const date = new Date().toISOString().slice(0, 10);
  text = text.replace(/^last_reconciled:.*$/m, `last_reconciled: "${date}"`);
  writeFileSync(join(DRAFTS, file), text);
  renameSync(join(DRAFTS, file), join(STORE, file));
  moved++;
  console.log(`verified: ${id} → .agents/memory/${file}`);
}
console.log(`${moved} entr${moved === 1 ? "y" : "ies"} verified. Commit when ready — this tool never commits (GitOps law).`);
