/**
 * guard-list.mjs — THE protected list (Harness v1.3 §5.10.1).
 *
 * Canon: "The set of paths a worker may not write — .tmd/ (outside governed
 * rig-change), *.holdout.md, .agents/floor.json, .agents/autonomy.json, rig
 * source paths, secrets patterns — is an enumerable constant IN THE GUARD'S
 * SOURCE CODE. A data-file protected list can be edited by the thing it
 * constrains."
 *
 * This file is the single source: the harness extension (extensions/guard.ts)
 * and the CI twin (bin/guard.mjs) both import it — code and CI never drift.
 * Extend ONLY via rig-change (§5.4-ratified PR).
 */

/** @type {RegExp[]} verbatim — extend only via rig-change */
export const PROTECTED = [
  /^\.tmd\//,                       // manifold — changes only via governed flow
  /\.holdout\.md$/,                 // builder-blind acceptance
  /^\.agents\/floor\.json$/,        // the ratchet
  /^\.agents\/autonomy\.json$/,     // the dial
  /(^|\/)\.env/, /id_rsa|\.pem$/,   // secrets patterns
];

/** Human-readable law labels, keyed by the pattern's source text. */
export const PROTECTED_LABELS = new Map([
  ["^\\.tmd\\/", ".tmd/ manifold — governed flow only (§5.10.1)"],
  ["\\.holdout\\.md$", "holdout files — builder-blind acceptance (E.7)"],
  ["^\\.agents\\/floor\\.json$", ".agents/floor.json — the ratchet lowers only by operator ratification (§5.10.2)"],
  ["^\\.agents\\/autonomy\\.json$", ".agents/autonomy.json — the dial is doctor-gated (§5.6)"],
  ["(^|\\/)\\.env", "secrets surface (.env)"],
  ["id_rsa|\\.pem$", "secrets surface (key material)"],
]);

/**
 * Test a repo-root-relative, forward-slashed path against the list.
 * Returns { protected: true, label } or { protected: false }.
 */
export function checkPath(relPath) {
  for (const re of PROTECTED) {
    if (re.test(relPath)) {
      return { protected: true, label: PROTECTED_LABELS.get(re.source) ?? re.source };
    }
  }
  return { protected: false };
}
