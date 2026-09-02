#!/usr/bin/env bash
set -euo pipefail

# Apply the /seat command patch to the pi-acp adapter used by Zed.
# Zed's ACP registry installs pi-acp to this path; the patch may be reverted
# when pi-acp auto-updates, so re-run this script after an update.

PI_ACP="${HOME}/.local/share/zed/external_agents/registry/npx/pi-acp/node_modules/pi-acp/dist/index.js"
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

# Back up the current version before patching.
cp "$PI_ACP" "$PI_ACP.bak.$(date +%s)" 2>/dev/null || true

patch -u "$PI_ACP" -i "$PATCH"
node --check "$PI_ACP"
echo "pi-acp patched successfully. Restart any active Zed agent chats for /seat to appear."
