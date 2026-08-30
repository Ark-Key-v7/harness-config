---
name: template-skill
description: Wireframe for authoring a factory skill. Copy this folder, rename kebab-case, fill the slots. Use when authoring any new procedural loop for the rig.
metadata:
  author: Agentic SWE Factory
  version: 1.0.0
  trigger_phrases: ["author a new skill", "create a skill"]
disable-model-invocation: true
---

### SKILL: template-skill (wireframe — Sovereign Skill Protocol)

#### 1. Trigger Context & Topological Binding
Invoke this skill protocol based on the YAML frontmatter above. Before
executing the loop, progressively load and obey the physical laws of the
repository:
- Read `/.tmd/rules.md` (the Anti-Slop Protocol is absolute).
- Read `/.tmd/gravity.md` to ensure your actions respect architectural boundaries.
- Read any further manifold files the procedure touches — manifold reads are
  EXPLICIT, never assumed.

#### 2. Required Tooling
List the exact tools this skill needs active (e.g., read, grep, bash). A seat
whose actuation boundary lacks one of these tools MUST NOT invoke this skill.

#### 3. The Procedural Loop (Act → Observe → Exit)
Execute this exact sequential algorithm. Do not skip steps or hallucinate
intermediate actions.

##### Step 1: ACT ([action name])
- Execute: [exact command or tool call].

##### Step 2: OBSERVE ([expected output])
- If [condition A]: proceed to the fallback action.
- If [condition B]: proceed to Step 3.

##### Step 3: ACT ([resolution action])
- [Final execution step.]

##### Step 4: EXIT PROTOCOL
- [How the loop mathematically terminates, e.g., "when the validator exits 0,
  report status and stop." Deterministic validation lives in scripts/
  executables — exit 0 = success, exit 1 = must_haves unsatisfied. The agent
  is forbidden from marking complete on prose judgment alone.]

#### 4. Local Negative Constraints (Anti-Patterns)
While executing this specific skill, you are mathematically forbidden from:
- [Constraint 1]
- [Constraint 2]

---
Frontmatter contract (E.6, Pi-mapped): name kebab-case matching the folder;
description trigger-precise (≤1024 chars); metadata.trigger_phrases; Pi
invocation mapping — `invocation: user` (canon) = `disable-model-invocation:
true` (Pi). Delete `disable-model-invocation` only for skills the model may
route to itself. No XML angle brackets anywhere in frontmatter or metadata.
