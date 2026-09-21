---
name: memory
description: "Governs agent memory: what may be remembered, how entries are provenanced and verified, how memory is recalled as evidence. Use when writing, verifying, retrieving, or citing memory entries. Discipline class — binds to all seats."
metadata:
  author: Agentic SWE Factory
  trigger_phrases: ["remember this", "what do we know about", "recall", "memory entry", "cite memory"]
  class: discipline
  version: 1.0.0
  provenance: "rig-native (WP-MEM)"
---

# Memory — recall, never law

## When NOT to Use

- The content is law (constraints, boundaries, budgets) — it lives in `.tmd/`, not memory; route it through the manifold PR path.
- The fact is public library knowledge (framework docs, API references) — Context7 is its only entry path; memory never restates it.
- The content is a contract payload (must_haves, validation_commands) — excluded from memory by jurisdiction (canon ruling 6).

## The two laws

- **M1 — Recall, never law.** Memory entries are evidence, not constraints.
  A memory-sourced rule candidate is drafted as a spec/PRD or manifold PR and
  ratified by a human (the §3.5 promotion ladder); it never takes effect from
  memory directly. The manifold contradicts memory → the manifold wins,
  automatically.
- **M2 — Provenance or it didn't happen.** Every entry carries derived_from,
  verified, last_reconciled. Unverified entries are labeled and rank below
  verified ones. An entry without provenance is deleted at compaction time.

## Writing memory

Session compaction (pi-observational-memory, STAGED on the machine floor)
produces DRAFT entries in `.agents/memory/drafts/`. Drafts become memory only
through human verify (`bin/memory-verify.mjs`). Never hand-write "verified"
entries. Never write secrets, law text, contract payloads, or public-library
docs into memory (Betterleaks blocks the first; the rest are jurisdiction
violations).

## Recalling memory

QMD over the memory roots (`.agents/memory/` project, `~/.pi/agent/memory/`
global). Cite the entry's provenance line when memory is used as evidence in
a task report or review. An uncited "I remember" is a hallucination candidate
(same rule as scout findings).

## Promoting memory

When a memory keeps proving load-bearing, propose it: recurring gotcha →
glossary/CONSTRAINTS entry via PRD; recurring decision → ADR
(documentation-and-adrs); candidate constraint → the §3.5 ladder. Promotion
is the only way memory becomes law, and it is always human-ratified.
