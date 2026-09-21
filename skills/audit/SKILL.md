---
name: audit
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, Agent, AskUserQuestion
description: "Run /audit on a greenfield project, an existing codebase with missing docs, or one area (/audit src/auth) to bootstrap the project's AI context, the AGENTS.md files every later skill reads. Writes tool agnostic AGENTS.md plus thin CLAUDE.md pointers, adding only what is missing; never overwrites curated content."
metadata:
  author: "Agentic SWE Factory (ported: jsmastery-pro/skills, MIT)"
  class: procedural
  trigger_phrases: ["audit", "audit this repo", "bootstrap project context", "write AGENTS.md", "document this codebase", "gap fill the docs", "audit src folder"]
  version: 1.0.0
  provenance:
    source: jsmastery-pro/skills (skills/audit @ 43b69e44c9ca905fe3a3418ccdf4102255e20d40)
    method: "byte-copy + enumerated edits; acceptance = source diff"
    edits:
      - "E1 (SKILL.md): Rig bindings section — descriptions-only law (AGENTS.md never holds law; .tmd/ is law; governed root AGENTS.md is a router, gap-fill only)"
      - "E1b (SKILL.md, WORKFLOW_SETUP signal): governed projects' specs/ chain + .tmd/ presence read as the same signal"
      - "E2 (modes/greenfield.md): governed-machine governance-scaffold offer (bin/onboard-project.mjs via project-onboard), never silent"
      - "E4 (modes/tool-skills.md): installs route through tool-intake on a governed machine; curated MCP staged via tool-intake + rig-change"
      - "E5 (agent-prompt.md): root template ## Specs line records the project's real spec directory (specs/ on governed projects)"
    additions:
      - "E.6 frontmatter metadata block (author, class, trigger_phrases, version, provenance)"
      - "When NOT to Use section (format v2.0.0 requirement)"
      - "Rig bindings section (WP-F §4.2)"
      - "Procedural form mapping (ACT → OBSERVE → EXIT; same recorded addition as WP-D-6 browser-testing)"
---

## Output style (plain words, no dashes, no hyphens)

<!-- OUTPUT-STYLE:START -->
Write everything this skill produces, files and messages alike, in plain simple language. Talk to the reader as `you`, warm and direct like a colleague, and present every step as a recommendation they may run or skip, never an order. Keep technical terms that carry real meaning; explain each in plain words. Never use a dash or a hyphen as punctuation: no em dash, no en dash, and no hyphenated compounds. Write `read only`, not `read-only`. Say it in simple words, or reword the sentence. Code, file paths, command flags, and values other skills match on keep their hyphens. Use short sentences, commas, or parentheses. Clear beats clever.
<!-- OUTPUT-STYLE:END -->

## What this skill does

The context bootstrapper: writes the `AGENTS.md` files every later skill and AI tool reads.

- Greenfield (no code yet): ask for coding standards, seed root `AGENTS.md` from the answers plus the build approach (name and one line principle) from the scope header if `/scope` set one. Runs after the project is scaffolded with its chosen stack (`/scope` → `/architect` decides the stack → scaffold → `/audit`); earlier is premature.
- Brownfield, undocumented (code, no `AGENTS.md`): scan the whole project, write root `AGENTS.md` and nested `<area>/AGENTS.md` files, judging what is global (root) vs area specific (nested).
- Brownfield, partially documented: check existing root and nested docs against the whole codebase; add only what is missing (new global facts, nested docs for undocumented areas); never clobber curated content.

Does not create specs (/architect owns those), maintain files after changes (/sync owns that), or write the feature scope (/scope owns `docs/scope/`).

## Context file convention (AGENTS.md is canonical)

Durable context lives in the tool agnostic `AGENTS.md` (root and nested); every agent (Codex, Cursor, Claude Code, and others) reads it. `CLAUDE.md` is only a one line pointer whose entire body imports the sibling `AGENTS.md` via Claude Code's `@` import (exact pointer body in `agent-prompt.md`); content is never duplicated across the two.

- Write knowledge into `AGENTS.md`. Create it when missing. Never overwrite an existing `AGENTS.md` (it may be user or tool authored); gap fill conservatively, with permission.
- Migrate legacy content: a `CLAUDE.md` with content but no `AGENTS.md` → ask permission, move its content into a new `AGENTS.md`, replace `CLAUDE.md` with the pointer. Never silently discard curated content.
- Root stays short and global; nested `AGENTS.md` only for meaningful areas with real conventions (same root/nested rules as previously applied to `CLAUDE.md`).

## Scope

An area path argument (e.g. `auth`, `src/payments`) triggers Phase 3. With no argument, the `Pre-flight` signals below route to Phase 0 (ambiguous: ask new vs existing), Phase 1 (greenfield: ask standards, seed root), Phase 2 (established, no root AGENTS.md: whole-repo scan), or Phase 4 (root AGENTS.md exists: gap-fill). A legacy `CLAUDE.md` with content but no `AGENTS.md` is migrated, then treated as Phase 4.

## Acts vs asks

Phase 1 asks coding standards questions via MCQ before creating root AGENTS.md. Phase 2 acts immediately, no questions; it writes root and the nested docs it judges warranted. Phases 3 and 4 act to explore but ask permission before modifying an existing root AGENTS.md or migrating a legacy CLAUDE.md; Phase 4 reports nested doc creation for undocumented areas first, then applies on confirmation.

## Artifact ownership

The `AGENTS.md` files hold the content: create root if missing (Phase 1, 2) and `<area>/AGENTS.md` if missing and warranted, by judgment (Phase 2, 3, 4); when one exists, gap-fill or propose additions with permission; never overwrite. The `CLAUDE.md` files are pointers only (root and area), created if missing; a legacy one with content is migrated into `AGENTS.md` with permission. When creating a nested `AGENTS.md`, add exactly one pointer line to root `AGENTS.md` under `## Context files`: `- [<area>/AGENTS.md](<area>/AGENTS.md) (<one-line description>)`. Never one per subfolder, only where distinct conventions exist.

## Portability (any OS, any agent)

- Commands: `git` is the only required CLI, same on every OS. Other shell snippets (file counts, `find`, `[ -f ]`) are POSIX reference, not literal scripts; use your agent's cross platform file tools (search/glob, read, write) to list, count, and check existence.
- Bundled files live in this skill's folder: `agent-prompt.md`, the phase mode files (`modes/*.md`), and the pattern presets (`patterns/*.md`). Resolve the folder to an absolute path. Read the matching phase mode file when routing, then `agent-prompt.md` plus the SELECTED pattern preset at write time. Its ALL_CAPS placeholders (PHASE, AREA, ADDITIONAL_STANDARDS, MONOREPO_OR_NO, INSTALLED_SKILLS, DECLINED_TOOLS, and so on) are the inputs you gathered in pre-flight and the question rounds; apply each as you read.
- No interactive question support? Ask any multiple choice question as plain text with the same options.

## Execution

The main thread does the writing in every phase; it never hands `AGENTS.md` writing to a subagent. The only subagent is a read only `scout` (cheapest model, Claude Code: `haiku`, never the session model), spawned only for a large scan; it returns a compact map the main thread writes from. A small scaffold or single area needs no scout; read it directly. Right before writing, read `agent-prompt.md` (persona, per phase instructions, templates) plus, in Phase 1, the selected pattern preset; then write following it. Read `agent-prompt.md` only at write time, not during `pre-flight`.

### `Pre-flight` (main thread does this before anything else)

Gather several signals (a file count alone misleads: a scaffold inflates it, an unfamiliar language zeroes it):

1. Context files: root AGENTS.md present → `ROOT_EXISTS`; a CLAUDE.md with content only → `ROOT_LEGACY`; neither → `ROOT_MISSING`.
2. Source count across common ecosystems (extensions like `.ts/.tsx/.js/.jsx/.py/.go/.rs/.java/.rb/.swift/.kt/.php/.cs/.dart/.ex/.exs/.scala/.c/.cpp/.h/.lua/.clj`), excluding vendored/generated dirs (`node_modules`, `.git`, `dist`, `build`) and config files (`*.config.*`).
3. Established signals: `git log --oneline` for commit history depth; a real manifest (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `composer.json`, `*.csproj`, `pubspec.yaml`, `mix.exs`, `Gemfile`).
4. Monorepo signal: workspace markers (`pnpm-workspace.yaml`, `turbo.json`, a `"workspaces"` field in `package.json`) or any `apps/*/package.json` / `packages/*/package.json` near the root.
5. **Workflow setup signal (`WORKFLOW_SETUP`)**: root AGENTS.md is MISSING while the workflow has already decided the stack, i.e. a `docs/specs/` architecture spec exists (a `## Proposed stack` section), and/or `docs/scope/` has a "Stack and architecture" (or similar foundational scaffold) feature. This is the intended greenfield order (`/scope` → `/architect` decides the stack → `/develop` scaffolds it → `/audit`): freshly scaffolded, still needs coding standards captured. When it fires, the manifest and scaffold source that now exist are the scaffold, not a existing codebase. On a governed rig project the spec chain lives under `specs/` (`specs/prd/` compile tables, `.tmd/` manifold present); read that as the same signal.

Pick the phase. The order of checks matters: the workflow setup signal outranks the raw code count, because a fresh scaffold has a manifest and source files yet is still greenfield.

| Condition | Phase |
|---|---|
| Area path given as argument | Phase 3 |
| `ROOT_EXISTS` (or `ROOT_LEGACY` after migration) | Phase 4 |
| `ROOT_MISSING` and `WORKFLOW_SETUP` (stack spec and/or scope stack feature) | **Phase 1**, even though a manifest and scaffold source now exist. Ask the coding standards; seed root from the spec's stack. Never treat a just scaffolded workflow project as brownfield. |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, no source files AND no manifest | Phase 1 |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, has code (source ≥ 10 or a manifest), ≥ 2 commits and clearly real feature code (not just scaffold) | Phase 2, any language |
| `ROOT_MISSING`, no `WORKFLOW_SETUP`, has code but it looks like untouched scaffold, or ≤ 1 commit, or you can't tell greenfield from brownfield | Phase 0, ask |

Why this order: a fresh scaffold has a manifest and starter files but is still greenfield, so a raw code count alone would misread it as brownfield and skip the standards questions; the workflow setup signal catches that and routes to greenfield. Truly brownfield (Phase 2) means real feature code, real history, and no workflow setup in progress. Anything ambiguous falls to Phase 0; never default a maybe greenfield project to brownfield.

Monorepo (`MONOREPO=yes`): root plus a light stub per workspace, deepen on demand. Each workspace (`apps/*`, `packages/*`) is a first class area; its primary doc lives at the workspace root (`packages/api/AGENTS.md`), never buried deeper. A whole-repo run does not deep scan every workspace; write the repo root `AGENTS.md` (monorepo wide tooling, shared conventions) plus a light stub per workspace from its manifest, no code scan, with root pointers. The full conventions/gotchas/key files scan happens when the engineer runs `/audit packages/api` (Phase 3) or first builds there. A spot inside a workspace that warrants its own doc (`packages/ui/src/mdx/`) gets one in addition to the workspace root doc, linked from it. A doc already buried in a workspace with no workspace root doc: ask: "`packages/ui` has a context file at `src/mdx/` but none at its root. Move it up to `packages/ui/AGENTS.md`, or keep it as a nested doc under a new `packages/ui/AGENTS.md`?" On move: relocate it to the workspace root. On keep nested: create the workspace root `AGENTS.md` AND keep the deep one, linked from root. Migrate legacy `CLAUDE.md` content per the convention above. Apply `MONOREPO=yes` plus the workspace list as you write.

Legacy migration (any phase): on `ROOT_LEGACY`, before proceeding ask permission: "I found a `CLAUDE.md` with project context but no `AGENTS.md`. I'll move its content into a new `AGENTS.md` (so all tools read it) and replace `CLAUDE.md` with a pointer. Proceed?" On yes: copy the content verbatim into `AGENTS.md`, then replace `CLAUDE.md` with the pointer; `AGENTS.md` now exists, so continue as Phase 4 (gap-fill). On no: leave both untouched and continue without migrating. Same for any nested `<area>/CLAUDE.md`.

### Route to the selected phase

Phase 0 (ambiguous) is handled inline below. For Phases 1 to 4, read only the matching mode file, then follow it:

- Phase 1 (greenfield setup) → `modes/greenfield.md`
- Phase 2 (whole-repo scan) → `modes/whole-repo.md`
- Phase 3 (area scan) → `modes/area.md`
- Phase 4 (gap-fill) → `modes/gapfill.md`

Do not read the other mode files. The greenfield and whole-repo modes additionally read `modes/tool-skills.md` for the Agent Skills / MCP sweep (skip it for area and gap-fill runs).

### Phase 0: Classify (only when `pre-flight` is ambiguous)

Don't guess. Ask once via your agent's interactive option picker (`AskUserQuestion` on Claude Code), or plain text with the same options. Mark one option `(recommended)` by whichever signal is stronger (a scaffold like tree with a manifest but little history leans New; real feature code and deep history leans Existing), and the picker adds a free text custom slot last:
- question: "I can't tell if this is a new project or an existing codebase (<state why: e.g. 'a manifest exists but I see no source in a language I recognise', or 'files look like untouched scaffolding'>). Which is it?"
- header: "Project state"
- options: 1. `New project`, "I'll ask for your coding standards and seed the context." → Phase 1 (read the manifest/scaffold for the stack; still ask standards). 2. `Existing codebase`, "I'll scan what's here and document it." → Phase 2.

### After all phases

If no `AGENTS.md` was written when it should have been (the file is missing/empty), report the failure and do it again; don't relay success it didn't produce. Otherwise relay the report: what was discovered (2 to 4 bullets), what was written (file paths), what was proposed or skipped (if existing files were found).

## Pattern presets

See `patterns/` for the four coding style presets used in Phase 1 (greenfield mode).

## Writing guide

See `agent-prompt.md` (the main thread reads it at write time; its per phase instructions and `AGENTS.md` templates).

## When NOT to Use

- A governed rig project whose `.tmd/` manifold and router AGENTS.md already exist and are current → nothing to audit; run `/audit` only when the repo changed shape (new area, new stack element) or drift is suspected, then it is Phase 4 (gap-fill).
- Maintaining context after a change merged → `/sync` owns post-merge reconciliation; audit bootstraps and gap-fills, it does not maintain.
- Writing or updating specs, scope, or plans → `/architect` and `/scope` own those; audit records pointers, never content for them.
- Re-onboarding governance (`.tmd/`, profiles, schemas) → `project-onboard` owns the scaffold; audit may offer it (greenfield rig note) but never runs it silently.

## Rig bindings (WP-F §4.2)

- **Descriptions only (E1).** Law lives exclusively in `.tmd/` (rules, gravity, promises, glossary, design). Every `AGENTS.md` this skill writes is description and pointers: stack, commands, conventions as observed, links into the manifold. Never create or edit a `.tmd/` file, never restate a manifold rule as an AGENTS.md rule; if code and law disagree, that is a `CONTRADICTIONS` finding for the engineer, not an edit.
- **Governed root AGENTS.md is a router.** On an onboarded project the root AGENTS.md was placed by onboarding as a pointer file. Audit treats it as existing (Phase 4, gap-fill): propose additions with permission, never restructure it, never replace it with a generated description file.
- **Installs and MCP go through the intake door (E4).** See `modes/tool-skills.md` Step 3: tool-intake on a governed machine; raw `npx skills add` only without the rig.
- **Governance scaffolding is offered, never run silently (E2).** See `modes/greenfield.md` rig note.
- **Specs pointer records reality (E5).** Governed projects keep the spec chain under `specs/`; the root template's `## Specs` section records wherever the project actually keeps them.

## Procedural form (ACT → OBSERVE → EXIT)

The phase flow above maps onto the rig's procedural loop as:

- **ACT** — run `Pre-flight` (signals, phase routing), ask the phase's questions (Phase 1 panels; Phase 0 classify; permission asks in Phases 3–4), then write: read the routed mode file, `agent-prompt.md` (+ selected pattern preset in Phase 1), and write the `AGENTS.md`/`CLAUDE.md` files per the templates.
- **OBSERVE** — verify the artifacts exist and are correct (file written, root ≤60 lines, pointers added, no law files touched); handle `ROOT_GAPS` / `PROPOSED_ADDITIONS` / `CONTRADICTIONS` findings; if a required file is missing or empty, the phase failed — report the failure and redo it, never relay success that did not happen.
- **EXIT** — relay the report block (discoveries, paths written, proposed or skipped), name the next step (usually `/develop tooling` or `/develop <first feature>`), and hand off. This skill never commits.
