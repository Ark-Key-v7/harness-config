---
name: tool-intake
description: Execute the standard tool intake procedure (spec §7) when a deferred-tools register trigger fires or the operator wants to adopt a new tool or external skill. Use when adding any tool, MCP server, or third-party skill to the rig.
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["install a tool", "adopt this skill", "a register trigger fired", "add an MCP server", "tool intake"]
---

### SKILL: tool-intake — the governed door for new capability

Canon: GOVERNANCE_PLANE_SPEC.md §6 (deferred-tools register — a tool enters
the active rig only through the register → intake → manifest entry; nothing
lives in memory alone) and §7 (intake procedure). L12 supply-chain policy:
exact pins, --ignore-scripts, no curl|sh, never `npm audit fix --force`
(bash-guard DANGER-enforced).

#### 1. Trigger Context & Topological Binding
Read `docs/GOVERNANCE_PLANE_SPEC.md` §6 register. Confirm the tool's trigger
has fired. If the tool is NOT in the register: STOP — adding a register entry
is a §5.4 human PR decision; present the case and wait.

#### 2. Required Tooling
read, write, bash (npm/git/node), ls. Sandbox-guard scope must permit
tools/ and validation/ writes for this session (rig repo session = no scope
file, guard inert).

#### 3. The Procedural Loop (Act → Observe → Exit)

##### Step 1: ACT (classify)
- Class: binary/CLI, MCP server, library, or pattern. Tier: factory vs project. Record both.

##### Step 2: ACT (discover → pin)
- Discover the latest official version at install time; convert to an exact pin + integrity hash.
- Install with `--ignore-scripts`. NEVER curl|sh. NEVER `npm audit fix --force`.

##### Step 3: ACT (isolate and smoke-test)
- Build a fixture under `~/factory-rig/validation/<tool>-smoke/` with a deterministic driver (exit 0 pass / exit 1 fail). Adversarial or unverified installs run only inside disposable containers, never on the host.

##### Step 4: OBSERVE (validate)
- Driver exit 0 → proceed. Exit 1 → STOP, report failures verbatim, never commit.

##### Step 5: ACT (external skills only: alignment pass)
- For third-party SKILL.md files: purge anything violating Spine/canon (persona injection, instruction-file-boundary violations, non-deterministic validation). Map to the E.6 contract (template-skill wireframe). Document the adaptation in the skill folder.

##### Step 6: ACT (manifest entry)
- Update the register row (status, pin, date) in GOVERNANCE_PLANE_SPEC.md via the rig-change skill — register edits are rig changes.

##### Step 7: EXIT PROTOCOL
- Hand off to the rig-change skill for commit/push/sync (§5.4 confirmation included there). Report: class, pin, smoke-test result, register row. Then stop.

#### 4. Local Negative Constraints
- NEVER install a tool whose register trigger has not fired.
- NEVER install unpinned or with lifecycle scripts enabled.
- NEVER adopt an external skill without the alignment pass.
- NEVER commit without the §5.4 human confirmation (delegated to rig-change).
