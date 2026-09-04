#!/usr/bin/env bash
set -euo pipefail

# Apply the generic command-bridge patch to the pi-acp adapter used by Zed.
# The bridge (a) advertises pi's full command registry (extension commands
# included) as ACP available_commands and (b) dispatches unrecognized
# /command args input to pi's own command handler, exactly as the TUI does.
# It supersedes the retired per-command pi-acp-seat-command.patch.
#
# Zed's ACP registry installs pi-acp to the default path below; the patch may
# be reverted when pi-acp auto-updates, so re-run this script after an update.
#
# Idempotent: re-runs detect the already-applied state and skip cleanly
# (exit 0, no prompts, no .rej litter, no duplicate backups).
#
# Migration: a target still carrying the retired /seat patch is restored from
# the newest backup that accepts this patch, then patched. If no usable
# backup exists the script fails closed — reinstall pi-acp (or let Zed's ACP
# registry refresh it) and re-run.
#
# PI_ACP_TARGET overrides the target path (used by the smoke driver); the
# default is the live Zed ACP registry install.

PI_ACP="${PI_ACP_TARGET:-${HOME}/.local/share/zed/external_agents/registry/npx/pi-acp/node_modules/pi-acp/dist/index.js}"
PATCH="$(cd "$(dirname "$0")" && pwd)/pi-acp-command-bridge.patch"
SEAT_MARKER='if (cmd === "seat") {'

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
  echo "pi-acp command-bridge patch already applied — nothing to do."
  exit 0
elif grep -qF "$SEAT_MARKER" "$PI_ACP"; then
  # Legacy state: the retired per-command /seat patch is still applied. It
  # blocks this patch, so restore the pristine adapter from the newest backup
  # that accepts the command-bridge patch, then apply.
  restored=""
  for bak in $(ls -1t "$PI_ACP".bak* 2>/dev/null || true); do
    if patch --forward --batch --fuzz=0 --dry-run -u "$bak" -i "$PATCH" >/dev/null 2>&1; then
      restored="$bak"
      break
    fi
  done
  if [[ -z "$restored" ]]; then
    echo "ERROR: $PI_ACP carries the retired /seat patch, but no backup accepts the command-bridge patch." >&2
    echo "Reinstall pi-acp (or let Zed's ACP registry refresh it) and re-run this script." >&2
    exit 1
  fi
  echo "Retired /seat patch detected — restoring pristine adapter from $restored"
  cp "$PI_ACP" "$PI_ACP.legacy-seat.$(date +%s)"
  cp "$restored" "$PI_ACP"
  patch --forward --batch --fuzz=0 -u "$PI_ACP" -i "$PATCH"
else
  echo "ERROR: patch neither applies forward nor reverse on $PI_ACP" >&2
  echo "The adapter source likely drifted (pi-acp auto-update?). Inspect and refresh patches/pi-acp-command-bridge.patch." >&2
  exit 1
fi

node --check "$PI_ACP"
echo "pi-acp patched successfully. Restart any active Zed agent chats for the full command registry to appear."
