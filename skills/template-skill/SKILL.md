---
name: template-skill
description: Author or import rig skills. Use when authoring any new procedural loop for the rig, evolving an existing skill, or importing a foreign SKILL.md (conformance pass). Covers both skill classes, the folder anatomy, and the import protocol.
metadata:
  author: Agentic SWE Factory
  version: 2.0.0
  class: procedural
  trigger_phrases: ["author a new skill", "create a skill", "new skill", "import this skill", "port this skill", "skill template", "update the skill format"]
disable-model-invocation: true
---

### SKILL: template-skill (wireframe — Sovereign Skill Protocol)

#### 0. [v2] The Two Classes (choose BEFORE writing)

Every rig skill is exactly one class:

**Procedural** — a workflow the agent EXECUTES: steps, drivers, exit codes,
human gates. Skeleton = sections 1–4 below (unchanged from v1). Examples:
rig-change, project-onboard, spec-intake, slice-plan, pr-review, tool-intake.

**Discipline** — a law-in-prose the agent INTERNALIZES mid-task: it is read
while doing other work, not executed as a task. Skeleton = section 4B below.
Examples: test-driven-development, systematic-debugging,
verification-before-completion, brainstorming.

If a draft cannot be classified, it is two skills. Split it.
Discipline skills never invent law: where their content overlaps canon or
manifold text, they cite by pointer (L5).

#### 1. Trigger Context & Topological Binding
Invoke this skill protocol based on the YAML frontmatter above. Before
executing the loop, progressively load and obey the physical laws of the
repository:
- Read `/.tmd/rules.md` (the Anti-Slop Protocol is absolute).
- Read `/.tmd/gravity.md` to ensure your actions respect architectural boundaries.
- Read any further manifold files the procedure touches — manifold reads are
  EXPLICIT, never assumed.

[v2 addition:] Procedural skills keep this section as-is. Discipline skills
replace it with **Overview** (one paragraph: the technique and why it
matters, including its canon binding by pointer).

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

#### 4A. [v2] Required section in BOTH classes: When NOT to Use
Immediately after the class skeleton's opening section, every skill states
explicit exclusions — symptoms, task types, or conditions where the skill
must NOT activate. Over-triggering is a routing defect; this section is the
brake. lint-skills fails on its absence.

#### 4B. [v2] Discipline-class skeleton (replaces sections 1–4 for that class)
1. **Overview** — one paragraph: the technique, why it matters, canon
   binding by pointer.
2. **When to Use / When NOT to Use** — both lists required.
3. **The Iron Law** — the single non-negotiable, in its own code block.
4. **The Technique** — the complete method: phases/steps/tables, worked
   examples where they carry weight.
5. **Rationalization Counters** — a table naming the exact excuses the
   agent will reach for ("just this once", "it's a small change") and
   pre-rebutting each.
6. **Local Negative Constraints** — same law as section 4.

#### 4C. [v2] Folder anatomy
skills/<name>/
├── SKILL.md        # required — the only required file
├── scripts/        # optional — executable helpers (pinned, --ignore-scripts)
├── references/     # optional — progressive-disclosure docs, loaded on demand
└── assets/         # optional — static resources
Omit empty folders — an empty folder is noise (lint fails on it).

#### 5. [v2] IMPORT MODE — conforming a foreign SKILL.md
Protocol, in order, no shortcuts:
1. READ the foreign skill end to end — every file in its folder
   (SKILL.md, scripts, references). No porting from summaries. Foreign
   skills are ported by TRANSFORMATION: copy the source file, then apply an
   enumerated edit list (frontmatter replacement + named substitutions).
   Never re-author from memory or summary — transformation, not
   paraphrase, is what makes truncation structurally impossible.
2. CLASSIFY it (procedural | discipline) per section 0.
3. STRIP harness-coupling: foreign tool/hook/CLI references are replaced
   with rig surfaces or removed; record each substitution in the commit
   message.
4. CONFORM frontmatter (E.6 contract below) including metadata.class and
   trigger_phrases.
5. ADD "When NOT to Use" and any missing class-required sections.
6. L5 CHECK: restated canon/manifold law → pointer. CONTRADICTED canon →
   stop, surface the conflict; canon wins unless the operator ratifies a
   canon amendment.
7. L12 CHECK: scripts pinned; no curl|sh; no unvetted network calls.
8. VALIDATE: node bin/lint-skills.mjs; skills driver green; regenerate
   projections.
9. Land via rig-change (drivers → §5.4 → commit). One skill or one
   coherent batch per commit.

---
Frontmatter contract (E.6, Pi-mapped): name kebab-case matching the folder;
description trigger-precise (≤1024 chars); metadata.trigger_phrases; Pi
invocation mapping — `invocation: user` (canon) = `disable-model-invocation:
true` (Pi). Delete `disable-model-invocation` only for skills the model may
route to itself. No XML angle brackets anywhere in frontmatter or metadata.
[v2 addition:] metadata.class (procedural | discipline) is required from
format v2.0.0; lint-skills fails on its absence.
