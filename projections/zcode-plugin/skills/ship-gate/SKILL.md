---
name: ship-gate
description: "Drives a change through the Refinery: Stage 0 local preflight, PR discipline, deterministic-trail-first review, Stage 4 human gate, merge, post-merge verification, rollback. Use when a change is ready to leave the worktree — opening a PR, merging, or releasing. Procedural class."
metadata:
  class: procedural
  version: 1.0.0
  author: Agentic SWE Factory
  trigger_phrases: ["ship it", "open a PR", "merge this", "release", "ready to ship"]
  provenance: "rig-native (WP-D-6); harvests ci-cd-and-automation + shipping-and-launch, agent-skills @ 48cb1168 — verbatim blocks in §4 with provenance"
---

# Ship Gate — the Refinery as agent procedure

The Refinery (CI/CD Integration Engine, handbook §2.3–§2.8) is the pipeline.
This skill is the agent's procedure through it. Machinery not yet landed
(register §D.1: Stage 1–4 CI, merge queue, CD routing) is marked DEFERRED —
the step states what runs today and what activates; you never simulate a
deferred gate and call it passed.

**Gate law:** no gate can be skipped. If a gate fails, fix the cause — never
disable the check, never force the merge. A gate you bypassed "just this once"
is the incident record you'll write next week.

## ACT

### Step 0 — Pre-ship: Stage 0 local preflight (LIVE)

Run before any push:

```bash
node ~/.pi/agent/bin/preflight.mjs --staged
```

Stage 0 today: Semgrep injection floor + Betterleaks secrets lane + contract
lint. BLOCKED means resolve, never force. A Betterleaks WARN (dialect gap,
register §D.6) is surfaced to the operator, not silently skipped.
Per the refreshed stack, DeepSource analyzers (or the Semgrep fallback where
DeepSource is not yet implemented), open-code-review, and Betterleaks hold the
local gate; when §D.1 lands, preflight runs inside the execution sandbox
(§D.2) — the commands change, this step's law does not.

### Step 1 — Open the PR: deterministic trail first

The PR description leads with the deterministic evidence, AI narrative second:

1. Contract link (`.agents/tasks/task-<slug>.md`) and trace: chain
   (intent → prd → plan → contract).
2. Gate output: preflight result, test/lint/typecheck output (local today;
   Stage 1 CI gates when §D.1 activates).
3. Diff summary against the declared sub-graph.
4. Risk self-assessment (Low/Medium/High) — calibrates, never replaces, the
   Stage-2 adversarial rating.

A PR whose description is narrative-only is returned to the author seat.

### Step 2 — CI failure feedback loop (LIVE for local gates; full loop with §D.1)

When any gate fails — local or CI:

1. Copy the failure output verbatim.
2. Fix the cause; verify locally before pushing again.
3. A second failure of the same gate on the same cause is not a retry — it is
   a systematic-debugging session (stop-the-line).
4. Never "fix" a gate by weakening it. Gate changes are rig law (§5.4).

### Step 3 — Review and the human gate (Stage 4 law, partial today)

- The reviewer seat runs pr-review; Stage-2 machinery (PR-Agent,
  open-code-review, DeepSource) joins when §D.1 activates.
- The human gate is the scarcest resource in the factory. Every surviving PR
  carries a **24-hour review clock** from gate entry. A PR waiting past the
  SLA is rebased onto current main and revalidated — reviewer attention never
  lands on a stale branch (rebase-and-revalidate repeats until review or
  conflict).
- **Auto-merge (dial-gated, §5.6/§D.19):** only a PR rated Low risk, all
  deterministic gates green, and zero manifold-surface diffs (no changes to
  `.tmd/`, `.agents/profiles/`, `.agents/skills/`) may auto-merge after the SLA
  expires unclaimed — and only on a project whose autonomy dial permits.
  Medium/High never auto-merge; manifold-surface diffs never auto-merge;
  security-lane patches never auto-merge at any rating.
- Rig changes (anything under the harness-config clone) take the rig-change
  skill, not this one: human confirmation is a separate, unskippable step.

### Step 4 — Merge and hand off (CD law)

The agent's responsibility ends at merge. Deployment is GitOps routing
(§2.8): the SCM hub triggers the infrastructure. Agents are forbidden from
writing deployment scripts (FTP, SSH, custom CD actions).

Immediately after merge, verify the deploy:

```
1. Check health endpoint returns 200
2. Check error monitoring dashboard (no new error types)
3. Check latency dashboard (no regression)
4. Test the critical user flow manually
5. Verify logs are flowing and readable
6. Confirm rollback mechanism works (dry run if possible)
```

### Step 5 — Release posture (when the project has users)

Ship behind flags; advance on evidence:

- **Flag lifecycle:** DEPLOY with flag OFF → ENABLE for team/beta → GRADUAL
  ROLLOUT (5% → 25% → 50% → 100%) → MONITOR at each stage → CLEAN UP (remove
  flag and dead code after full rollout; flags that live forever become
  technical debt — set a cleanup date when you create them).
- **Rollout decision thresholds** (advance / hold / roll back):

| Metric | Advance (green) | Hold and investigate (yellow) | Roll back (red) |
|--------|-----------------|-------------------------------|-----------------|
| Error rate | Within 10% of baseline | 10-100% above baseline | >2x baseline |
| P95 latency | Within 20% of baseline | 20-50% above baseline | >50% above baseline |
| Client JS errors | No new error types | New errors at <0.1% of sessions | New errors at >0.1% of sessions |
| Business metrics | Neutral or positive | Decline <5% (may be noise) | Decline >5% |

- **Error-budget release gate:**

```
Budget remaining > 20%  →  Ship normally; monitor closely
Budget remaining 0–20%  →  Slow rollouts only; no high-risk changes
Budget exhausted        →  Freeze feature work; focus entirely on reliability
Budget resets           →  Resume normal pace; bake in the fix that recovered it
```

- Every deployment carries a written rollback plan BEFORE it happens:

```markdown
## Rollback Plan for [Feature/Release]

### Trigger Conditions
- Error rate > 2x baseline
- P95 latency > [X]ms
- User reports of [specific issue]

### Rollback Steps
1. Disable feature flag (if applicable)
   OR
1. Deploy previous version: `git revert <commit> && git push`
2. Verify rollback: health check, error monitoring
3. Communicate: notify team of rollback

### Database Considerations
- Migration [X] has a rollback: `npx prisma migrate rollback`
- Data inserted by new feature: [preserved / cleaned up]

### Time to Rollback
- Feature flag: < 1 minute
- Redeploy previous version: < 5 minutes
- Database rollback: < 15 minutes
```

## OBSERVE

A change is shipped when: merged through a green deterministic trail, human
gate cleared (or dial-permitted auto-merge logged), deploy verified healthy,
rollback plan on file. A launch carrying risk also has: flag state known,
thresholds agreed, monitoring watched for the first hour.

## EXIT

Exit when Step 4's six checks are green (and Step 5 artifacts exist where the
project has users). A red rollout threshold is not an exit — it is the
rollback plan executing, then an incident record.

**When NOT to Use:** rig changes (harness-config clone) take the rig-change
skill, not this one; a single-line trivial fix below the contract size floor
ships without this machinery.

## Harvest provenance

The flagged-lifecycle rules, rollout thresholds table, error-budget block,
rollback-plan template, post-launch verification list, and CI-failure loop are
verbatim from `shipping-and-launch` and `ci-cd-and-automation`
(agent-skills @ 48cb1168). The no-gate-skipping law is both sources agreeing.
Environment/secrets rule from ci-cd-and-automation, retained: CI never holds
production secrets; separate secrets per environment.
