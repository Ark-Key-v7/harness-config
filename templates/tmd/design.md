---
manifold_version: "TEMPLATE_VALUE_REQUIRED — semver; bump on any law change, e.g. 1.0.0"
last_verified: "TEMPLATE_VALUE_REQUIRED — SHA of the commit that last modified this file. NEVER a date."
precedence: 5
---

# DESIGN.MD — THE VISUAL PROTOCOL

Precedence rank 5 of 5. Subordinate to all other manifold files. A visual rule
that conflicts with safety, structure, temporal, or vocabulary law loses
automatically. Prevents the agent from hallucinating UI patterns, colors,
typography, or unauthorized component libraries. Binds to the Stack Manifest's
ui_primitive_library and styling_system slots (gravity.md §C.1).

**Inert-state law (fixed):** for projects with no UI surface
(project_type: service | library), this file declares itself INERT rather than
being deleted: state "INERT — no presentation layer" here and keep the file;
the precedence chain and headers remain intact.

## ZONE A — THE LAW (fixed, invariant — never edit per project)

### A.1 Constitutional layer (TMD Specification v2.1, §0)

**The Precedence Law (§0.1).** rules.md (1) > gravity.md (2) > promises.md (3)
> glossary.md (4) > design.md (5). Higher precedence wins automatically; no
agent interpretation. This file is the lowest rank: nothing yields to it.

**The Conflict Halt (§0.2).** On any cross-file contradiction: HALT the Task
Contract; ESCALATE via MANIFOLD_CONFLICT event naming both files, both
clauses, and the triggering contract; RESUME only after a human-authored PR
merges and last_verified headers advance — re-read from the new HEAD.

**The Manifest Header (§0.3).** manifold_version (semver), last_verified
(commit SHA), precedence (rank). No valid header = invalid law; halt per §0.2.

**Monorepo Inheritance (§0.4).** One manifold per repository, at root; total
inheritance. Package-local manifold files and duplicated root law forbidden.

**The Instruction-File Boundary (§0.5).** One root AGENTS.md, ≤50 lines, zero
constraint text. Harness markdown lives exclusively in /.agents/.

**The Enforcement Registry (§0.6).** Every law names its wall (instrument
class; concrete tools bound in gravity.md's gates). Ungateable law is marked
enforcement: manual-review — never silently unenforced.

**Design-platform boundary (rig law).** External design platforms are
design-time PRODUCERS, never canon owners. Their exports are source material;
this file is the system of record. On conflict, this file wins.

### A.2 Framework & styling law (fixed)

- **Components:** all components MUST use the primitives declared in the Stack Manifest (ui_primitive_library) and inventoried in Zone C §C.2. Composing raw elements outside the primitive inventory is forbidden.
- **Styling:** the declared styling_system utility classes exclusively.
- **Icons:** one declared icon set only (Zone C §C.1).

### A.3 Color token law (fixed)

Colors are referenced exclusively through semantic tokens. Raw hex, rgb(),
hsl(), and palette literals are forbidden outside this file's token
definitions. Theme variants (dark/light) are resolved by the theme, never by
conditional classes in components. The default token set (Zone C §C.1):

| Token | Role |
|---|---|
| `background` / `foreground` | Base surface / base text |
| `card` | Raised surface |
| `primary` | Primary action |
| `secondary` | Secondary action |
| `muted` | De-emphasized |
| `destructive` | Destructive action |
| `border` / `ring` | Structure / focus |

### A.4 Type scale law (fixed)

Use the scale; arbitrary font sizes are forbidden. Default scale (Zone C may
re-declare the project's scale, replacing — not extending — this default):

| Class | Use |
|---|---|
| `text-sm` | Secondary/meta text |
| `text-base` | Body |
| `text-lg` | Emphasized body / card titles |
| `text-xl` | Section headings |
| `text-2xl` | Page headings |
| `font-medium` | Default emphasis weight |
| `font-semibold` | Headings only |

### A.5 Composition law (fixed)

- Pages compose declared regions inside the layout law (Zone C §C.3); ad-hoc page-level markup soup is forbidden.
- Every destructive action uses a confirmation dialog — never a bare destructive-styled button.
- Loading states use skeleton primitives, not spinners. Empty states render a defined empty-state block, never blank space.

### A.6 Interaction-state law (fixed)

Every interactive element defines, via the primitive's built-in variants:
`hover`, `focus-visible` (ring token, keyboard navigable), `disabled`,
`loading`. Custom focus/hover overrides are forbidden; keyboard reachability
of every action is mandatory.

### A.7 Spacing, radius & breakpoint law (fixed)

- Spacing: multiples of the 4pt system; container padding declared per breakpoint. Arbitrary values are forbidden.
- Radius: one default radius token; one raised-surface radius token.
- Breakpoints: mobile-first; shifts only at the declared breakpoints. Desktop-first design and custom breakpoints are forbidden.

### A.8 Forbidden list (extended, fixed)

- Inline styles, custom CSS files, `<style>` blocks.
- Raw color values and palette literals outside §A.3.
- Arbitrary utility values outside §A.7.
- Any component or icon library other than the declared ones.
- Conditional theme-variant classes inside components — the theme owns variants.
- New primitives without a design.md PR adding them to Zone C §C.2.

### A.9 Enforcement (instrument classes)

- §A.2, §A.8: linter gate at Stage 1; component rules for forbidden imports and attributes.
- §A.3–§A.5, §A.7: token lint rules + Stage-3 visual verification (deterministic screenshots against the ephemeral preview; AI visual navigation reserved for volatile generated DOM).
- §A.6: Stage-3 keyboard-traversal and state-coverage checks; human-gate review for composition violations.

## ZONE B — THE STRUCTURE (fixed skeleton)

Canonical section order: Zone A law (fixed) → Zone C slots in this order:
§C.1 Tokens & declared libraries (icon set; semantic color token values;
radius tokens; type scale IF replacing the default) → §C.2 Component
primitive inventory → §C.3 Layout law (declared regions per breakpoint).
A correct token entry is a named value bound to a role. A correct primitive
entry lists variants and composition rules. A screenshot is illustration,
never law — law is named values and states.

## ZONE C — FILLABLE SLOTS (project-specific)

### §C.1 Tokens & declared libraries
<!-- TEMPLATE_VALUE_REQUIRED.
     Micro-example of completed entries:
     - icon_library: "lucide-svelte"
     - tokens:
         color.background: "oklch(0.13 0.01 260)"
         color.foreground: "oklch(0.95 0.005 260)"
         radius.default: "0.5rem"
         radius.raised: "0.75rem"
     - type_scale: default (Zone A.4) — delete this line if re-declaring.
-->
TEMPLATE_VALUE_REQUIRED

### §C.2 Component primitive inventory
<!-- TEMPLATE_VALUE_REQUIRED — declare the permitted primitives from the
     manifest's UI library.
     Micro-example:
     primitives: [Button, Card, Input, Select, Dialog, Table, Tabs, Badge,
                  Alert, Tooltip, Form, Skeleton, Separator]
     composition:
       - "Button: variants primary|ghost|danger; icon+label; icon-only forbidden outside toolbars"
-->
TEMPLATE_VALUE_REQUIRED

### §C.3 Layout law
<!-- TEMPLATE_VALUE_REQUIRED — the declared page regions and per-breakpoint
     container padding.
     Micro-example:
     regions: [app-shell.header, app-shell.sidebar, content, sheet]
     container_padding: { base: "1rem", md: "1.5rem", lg: "2rem" }
-->
TEMPLATE_VALUE_REQUIRED

---

**Manifold Amendment Protocol.** Every change to any manifold file follows
GitOps law: PR only, never direct edits on main; the empirical reason
documented in the PR body; manifold_version bumped; last_verified advanced on
merge; the retrieval index over .tmd/ refreshed by the merge hook. A manifold
PR that fails to advance the headers is invalid and is rejected by CI.
