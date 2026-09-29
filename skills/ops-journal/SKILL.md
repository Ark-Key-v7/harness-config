---
name: ops-journal
allowed-tools: Bash, Read, Grep, Glob, Write
description: "Run /ops-journal for remote infrastructure work (VPS, DNS, server config, deployments onto hosts you operate): every command journaled with purpose, risk, and rollback; pre-work snapshot; one command at a time; validate-before-cut-over; emergency-access ladder; recovery protocol. Replaces ad-hoc SSH poking with an evidence trail."
metadata:
  author: "Agentic SWE Factory (CF46 intake: mechanisms from ClaudeFast v4.6 infra-ops-clean, re-voiced; vendor bodies excluded; source license unverified — near-zero verbatim text)"
  class: procedural
  trigger_phrases: ["ops journal", "server work", "vps", "ssh into", "server config", "infra change", "dns change", "deploy to the server", "emergency access", "locked out"]
  version: 1.0.0
  provenance:
    source: "CF46 intake 2026-09-29 (ClaudeFast v4.6 infra-ops-clean: CUSTOM-CLAUDE.md ops system, vps-security-operations.md, vps-security-setup.md)"
    method: "import-mode re-voice — generic operational discipline adopted; vendor click-paths and stack recipes excluded; two source security smells NOT inherited (S3 FullAccess policy, publicly exposed Postgres) and flagged in FACTORY_STATUS"
    edits:
      - "E1: journal discipline — documentation levels scale with blast radius; Risk + Rollback mandatory on mutative ops"
      - "E2: pre-work snapshot + session-recovery protocol (state before, resume from journal)"
      - "E3: cut-over safety law — validate config before restart, keep the old path open, rollback known before the change"
      - "E4: emergency-access ladder (provider console first) + recurring ops cadence"
    additions:
      - "When NOT to Use section (format requirement)"
      - "Procedural form mapping (ACT → OBSERVE → EXIT)"
---

## What this skill does

**Your role:** the operator's hands on remote infrastructure, with an evidence trail that survives the session. Remote hosts have no git history for the changes you make over SSH — the journal IS the history. Every command is documented at a depth proportional to its blast radius, every state change is verified, and every session leaves the next one (or the recovery path) able to reconstruct what happened.

Infrastructure work fails differently from code work: there is no test suite for a server, the rollback window can close silently, and the wrong one-liner can lock you out. The discipline here exists because that failure mode is real.

## Asks vs acts

**Acts** on read-only investigation (health checks, log reads, inventory). **Asks before** every mutative command on a production host — the operator approves the change, this skill executes and journals it. Destructive operations (deleting data, firewall changes, daemon restarts on remote-access paths) need explicit approval even mid-task. **Never** pushes past a failed validation to "finish the step".

## Artifact ownership

Owns the ops journal: `docs/ops/<host>-journal.md` in the repo that owns the host (create the directory if needed), newest entries first, one entry per command or step group. Secrets never enter the journal (paths and placeholder names only — secrets-and-hardening law applies double here, and Betterleaks reads this file like any other). Does not write application code or `.tmd/` law.

## When NOT to Use

- Application code changes — `/develop` and the pipeline own those; this skill is for the host beneath them.
- A managed platform whose own pipeline deploys and journals (GitOps-routed deploys per the rig's CD law) — journaling there duplicates the platform's record; use it only when touching host-level state the platform doesn't track.
- Local machine configuration — that is machine-floor work with its own pins and runbooks (PORTABILITY).

## Execution

### Step 0: Pre-work snapshot (ACT begins)

Before the first change, capture the state you are about to modify — verbatim, into the journal:
- Relevant versions (OS, runtime, the service being touched).
- What is currently running (`systemctl`-class status for the affected services).
- The exact current content of any config file you will change (copy it into the journal).
- Disk/memory headroom if the change affects either.

If the session is interrupted after this, the snapshot plus the journal is the recovery point. No snapshot, no changes.

### Step 1: Journal discipline — the level scales with blast radius

| Level | When | Entry contains |
|---|---|---|
| **Minimal** | read-only investigation | command → result |
| **Standard** | low-risk mutation | command → output → result |
| **Detailed** | anything touching access, networking, data, or a shared service | command → output → result + **Purpose** / **Risk** (Low/Med/High) / **Rollback** (the exact reverse, stated before execution) / **Verification** (how you'll know it held) / **Notes** |

A command with no stated rollback does not run at Detailed level. If you cannot name the reverse, that is the signal to snapshot harder or stop.

### Step 2: Execution discipline

- **One command at a time.** Capture its output before the next. Never batch mutative commands into a chain — when a chain fails halfway, you are on an undocumented half-state.
- Verify each step against its journal entry before moving on.
- Destructive power (`rm -rf`, `DROP`, force operations) — operator approval per instance, per the security discipline's destructive-action law.

### Step 3: Cut-over safety (the law that prevents lockouts)

Any change that can sever your own access (SSH config, firewall, daemon restart) follows the same shape:
1. **Validate before applying** — the config-check equivalent (`sshd -t` class) runs first; a config that fails validation never reaches the restart.
2. **Keep the old path open** — existing session stays connected while the new one is tested; backup copies of configs land in the journal before the change.
3. **Test from a fresh connection** before closing the old one.
4. Rollback is already written in the journal entry (Step 1) — a cut-over without a written reverse does not start.

### Step 4: Emergency-access ladder

Know it before you need it, journal which rung saved you:
1. **Provider console** — works without SSH; always the first rung.
2. **Recovery procedures** — unban-self from rate limiting, restore the last-known config from the journal's snapshots.
3. **Snapshot restore** — the nuclear option; last, and operator-approved.

### Step 5: Post-work verification and close-out

- Changes applied correctly (re-checked, not remembered).
- Affected services running; logs clean of new errors.
- Journal complete: every entry closed with its result; every Detailed entry's Verification performed.
- Follow-ups (rotation dates, monitoring to watch) recorded in the journal, not memory.

### Recurring cadence (per host, journal it too)

Weekly: disk/memory headroom, failed services, auth-log scan. Monthly: update posture, and **test backup restoration — with a fresh snapshot taken first**. A backup that has never been restored is a hypothesis.

### Recovery protocol (interrupted session)

Reconnecting to a half-finished change: (1) read the journal for the last completed entry; (2) verify the host actually matches that state — servers drift from documentation, and the discrepancy is itself journaled; (3) continue from the last verified step; (4) never resume from memory when the journal and the host disagree — reconcile first.

## Procedural form (ACT → OBSERVE → EXIT)

- **ACT** — snapshot, journal, execute one command at a time, cut over safely.
- **OBSERVE** — every entry closed with output and result; Detailed entries carry Risk/Rollback/Verification; post-work checks green; discrepancies documented.
- **EXIT** — journal complete and committed where the host's repo lives; follow-ups recorded; report to the operator: what changed, what was verified, what is being watched. A session that changed a host without closing its journal entries is not done.

## Rig bindings

- **Secrets**: paths and placeholder names only in the journal — `security-and-hardening` secrets law applies to ops artifacts with double weight.
- **Destructive actions**: operator approval per instance (the discipline's destructive-action law); this skill never self-approves.
- **Verification-before-completion**: "applied" means the post-work verification ran, not that the command exited 0.
- **Vendor neutrality**: this skill carries the discipline, not stack recipes — provider-specific click-paths live in project law (Zone C) or the future domain plugin (FACTORY_STATUS, CF46), never here.
