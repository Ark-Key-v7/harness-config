#!/usr/bin/env bash
set -euo pipefail

# Apply the /seat command patch to the pi-acp adapter used by Zed.
# Zed's ACP registry installs pi-acp to this path; the patch may be reverted
# when pi-acp auto-updates, so re-run this script after an update.
#
# Idempotent: re-runs detect the already-applied state and skip cleanly
# (exit 0, no prompts, no .rej litter, no duplicate backups).
#
# PI_ACP_TARGET overrides the target path (used by the smoke driver); the
# default is the live Zed ACP registry install.

PI_ACP="${PI_ACP_TARGET:-${HOME}/.local/share/zed/external_agents/registry/npx/pi-acp/node_modules/pi-acp/dist/index.js}"
PATCH="$(cd "$(dirname "$0")" && pwd)/pi-acp-seat-command.patch"

if [[ ! -f "$PI_ACP" ]]; then
  echo "pi-acp not found at: $PI_ACP" >&2
  echo "Install the pi ACP adapter in Zed first (e.g. via ACP registry)." >&2
  exit 1
fi

if [[ ! -f "$PATCH" ]]; then
  echo "Patch file not found: $PATCH" >&2
  exit 1
fi

# Probe states without touching the target (--batch never prompts, --fuzz=0
# refuses offset/fuzzy matches so a drifted adapter fails closed below).
if patch --forward --batch --fuzz=0 --dry-run -u "$PI_ACP" -i "$PATCH" >/dev/null 2>&1; then
  # Pristine target: back up once, then apply.
  cp "$PI_ACP" "$PI_ACP.bak.$(date +%s)"
  patch --forward --batch --fuzz=0 -u "$PI_ACP" -i "$PATCH"
elif patch --reverse --batch --fuzz=0 --dry-run -u "$PI_ACP" -i "$PATCH" >/dev/null 2>&1; then
  echo "pi-acp /seat patch already applied — nothing to do."
  exit 0
else
  echo "ERROR: patch neither applies forward nor reverse on $PI_ACP" >&2
  echo "The adapter source likely drifted (pi-acp auto-update?). Inspect and refresh patches/pi-acp-seat-command.patch." >&2
  exit 1
fi

node --check "$PI_ACP"
echo "pi-acp patched successfully. Restart any active Zed agent chats for /seat to appear."
