# Task Quality Rules (harvested)

## From agent-skills/planning-and-task-breakdown

### Task sizing

| Size | Files | Scope | Example |
|------|-------|-------|---------|
| **XS** | 1 | Single function or config change | Add a validation rule |
| **S** | 1-2 | One component or endpoint | Add a new API endpoint |
| **M** | 3-5 | One feature slice | User registration flow |
| **L** | 5-8 | Multi-component feature | Search with filtering and pagination |
| **XL** | 8+ | **Too large — break it down further** | — |

**When to break a task down further:**
- It would take more than one focused session (roughly 2+ hours of agent work)
- You cannot describe the acceptance criteria in 3 or fewer bullet points
- It touches two or more independent subsystems (e.g., auth and billing)
- You find yourself writing "and" in the task title (a sign it is two tasks)

### Never overwrite an incomplete plan

Before writing a plan file, check whether one already exists and still contains unchecked tasks. Same work being replanned → update in place. Different work → **stop and ask.** Unchecked tasks may be mid-build in another session. Do not delete, overwrite, or rename on your own; present the conflict and let the operator decide.

## From superpowers/writing-plans

### No Placeholders — these are plan failures, never write them

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

### Interfaces block (per task)

- Consumes: what this task uses from earlier tasks — exact signatures
- Produces: what later tasks rely on — exact function names, parameter and return types

## From superpowers/executing-plans

### Execution posture

Stop executing immediately when: hitting a blocker (missing dependency, test fails, instruction unclear), the plan has critical gaps, an instruction is not understood, or verification fails repeatedly. Ask for clarification rather than guessing. Never force through blockers.
