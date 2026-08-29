---
manifold_version: "TEMPLATE_VALUE_REQUIRED — semver; bump on any law change, e.g. 1.0.0"
last_verified: "TEMPLATE_VALUE_REQUIRED — SHA of the commit that last modified this file. NEVER a date."
precedence: 2
---

# GRAVITY.MD — THE FORCE CONTRACT

Precedence rank 2 of 5. Subordinate to rules.md; superior to promises.md,
glossary.md, design.md. Defines the physical architecture: the Stack Manifest,
dependency acyclicity, module boundaries, state ownership, and the Sub-Graph
Registry that sandboxing, profile bindings, and mechanical enforcement anchor to.

## ZONE A — THE LAW (fixed, invariant — never edit per project)

### A.1 Constitutional layer (TMD Specification v2.1, §0)

**The Precedence Law (§0.1).** The manifold is a total order, not a committee:
rules.md (1) > gravity.md (2) > promises.md (3) > glossary.md (4) > design.md (5).
Higher precedence wins automatically; no agent interpretation.

**The Conflict Halt (§0.2).** On any cross-file contradiction: HALT the Task
Contract; ESCALATE via MANIFOLD_CONFLICT event naming both files, both
clauses, and the triggering contract; RESUME only after a human-authored PR
merges and last_verified headers advance — re-read from the new HEAD, never
from cached context.

**The Manifest Header (§0.3).** manifold_version (semver), last_verified
(commit SHA), precedence (rank). No valid header = invalid law; halt per §0.2.

**Monorepo Inheritance (§0.4).** One manifold per repository, at root; total
inheritance. Package-local manifold files and duplicated root law are
forbidden — duplication is drift; drift is slop.

**The Instruction-File Boundary (§0.5).** One root AGENTS.md, ≤50 lines, zero
constraint text. Harness markdown lives exclusively in /.agents/.

**The Enforcement Registry (§0.6).** Every law names its wall. Gates are named
by instrument class; this file's Stack Manifest (Zone C) binds those classes
to concrete tools. Ungateable law is marked enforcement: manual-review and
routes to the human gate — never silently unenforced.

### A.2 Stack Manifest law (fixed)

The Stack Manifest (Zone C, §C.1) is the SINGLE declaration point for this
project's stack. Every other manifold file references these slots; no other
file may name a vendor as law. Rotating the stack (Svelte ↔ Astro, Convex ↔
Supabase ↔ Neon, Tailwind ↔ any utility system) is a manifest edit via
manifold PR, never a manifold rewrite.

### A.3 Topological boundary law (fixed)

Prose persuades humans; the fenced import_rules pattern (Zone C, §C.2) feeds
the wall. Both are law; they must agree.

- **Domain layer:** Pure language logic ONLY. FORBIDDEN: framework imports, persistence clients, transport objects.
- **Interface layer:** Presentation components ONLY. FORBIDDEN: direct persistence calls. Must route through the infrastructure layer's public operations.
- **Infrastructure layer:** Backend operations ONLY. FORBIDDEN: presentation concerns, DOM/window objects, client storage.

The dependency relation MUST be acyclic: no layer or sub-graph may
transitively depend on itself.

### A.4 State ownership law (fixed)

- **Persistent Truth:** the persistence slot of the Stack Manifest (exclusively).
- **Ephemeral UI State:** the framework-native store mechanism only.
- **Forbidden State:** reactivity derived from URL query parameters (unless explicitly declared in the route's load contract); client Web Storage as a source of truth.

### A.5 Sub-Graph Registry law (fixed)

The Registry (Zone C, §C.3) is the legislative anchor for Topological Context
Isolation. Every Task Contract declares exactly one sub-graph as its
write_scope; its read_scope is the sub-graph plus the declared dependency
closure. The pretool-hook (WP2 sandbox guard) denies every file operation
outside these scopes — fail-closed, configured from this file: the Registry
is the hook's single source of truth.

Rules:
1. A Task Contract with no registered sub-graph is invalid and must not spawn.
2. Read/write scopes not listed here do not exist. Unknown paths resolve to DENY.
3. Cross-sub-graph edits are forbidden; shared-module changes require their own contract against the owning sub-graph — never piggybacked on a feature contract.

### A.6 Enforcement (instrument classes; concrete bindings in Zone C §C.1 gates)

- Import rules: ast-audit + linter import patterns (generated from §C.2 YAML) at Stage 0 and Stage 1; type-checker resolves any residual cross-boundary type reference.
- Sub-Graph Registry: pretool-hook enforcing §C.3 scopes (fail-closed).
- State ownership: linter rules banning client-storage access outside declared scopes; human-gate review for reactivity violations.

## ZONE B — THE STRUCTURE (fixed skeleton)

Canonical section order: Zone A law (fixed) → Zone C slots in this order:
§C.1 Stack Manifest (stack, layers, gates) → §C.2 import_rules YAML →
§C.3 Sub-Graph Registry YAML. A correct Stack Manifest fills EVERY slot or
marks it `none`; a layer without paths is invalid. A correct import_rules
block names concrete module patterns, not intentions. A correct Registry
entry has: name, paths, owning_role, write_scope, read_scope (= write_scope +
dependency closure), dependency_edges. The gates block binds every
instrument class named in Zone A.6 (and the other files' enforcement maps) to
a concrete, pinned tool.

## ZONE C — FILLABLE SLOTS (project-specific)

### §C.1 Stack Manifest
<!-- TEMPLATE_VALUE_REQUIRED — the only place vendors are named as law.
     Micro-example of a completed manifest (SvelteKit + Convex OSS + Bun):
```yaml
stack:
  project_type: application
  language: TypeScript
  runtime: Bun
  frontend_framework: SvelteKit
  ui_primitive_library: shadcn-svelte
  styling_system: Tailwind CSS
  backend_framework: none
  persistence: Convex OSS (self-hosted)
  desktop_shell: none
  build_tool: Vite
layers:
  domain:         { paths: [src/lib/domain/**] }
  interface:      { paths: [src/routes/**] }
  infrastructure: { paths: [convex/**] }
gates:
  type-checker: tsc --noEmit
  test-runner: bun test
  ast-audit: fallow audit
  linter: Semgrep + Biome
  secret-scanner: betterleaks
```
     Slot schema:
       stack: project_type <application|website|library|desktop|service>,
         language, runtime, frontend_framework, ui_primitive_library,
         styling_system, backend_framework, persistence, desktop_shell,
         build_tool  (use `none` where a slot does not apply)
       layers: domain/interface/infrastructure, each with paths: [...]
       gates: type-checker, test-runner, ast-audit, linter, secret-scanner
-->
TEMPLATE_VALUE_REQUIRED

### §C.2 import_rules
<!-- TEMPLATE_VALUE_REQUIRED — machine-readable form of Zone A.3.
     Micro-example (same project):
```yaml
import_rules:
  - layer: src/lib/domain/**
    deny: ["svelte", "svelte/*", "convex", "convex/*", "$app/*", "node:http", "node:https"]
  - layer: src/routes/**
    deny: ["convex/server"]
    require_via: "convex mutations/queries only"
  - layer: convex/**
    deny: ["svelte", "svelte/*", "$app/*", "jsdom", "window", "localStorage"]
```
-->
TEMPLATE_VALUE_REQUIRED

### §C.3 Sub-Graph Registry
<!-- TEMPLATE_VALUE_REQUIRED — one entry per isolatable scope.
     Schema per entry:
```yaml
subgraphs:
  - name: <subgraph-name>
    paths: [<glob, glob>]
    owning_role: <profile-name>
    write_scope: [<glob, glob>]
    read_scope: [<write_scope + declared dependency closure>]
    dependency_edges: [<other sub-graph names>]
```
     Micro-example:
```yaml
subgraphs:
  - name: auth
    paths: [convex/auth/**, src/lib/domain/auth/**]
    owning_role: backend-worker
    write_scope: [convex/auth/**, src/lib/domain/auth/**, tests/auth/**]
    read_scope: [convex/auth/**, src/lib/domain/auth/**, tests/auth/**, src/lib/domain/shared/**]
    dependency_edges: [shared]
```
-->
TEMPLATE_VALUE_REQUIRED

---

**Manifold Amendment Protocol.** Every change to any manifold file follows
GitOps law: PR only, never direct edits on main; the empirical reason
documented in the PR body; manifold_version bumped; last_verified advanced on
merge; the retrieval index over .tmd/ refreshed by the merge hook. A manifold
PR that fails to advance the headers is invalid and is rejected by CI.
