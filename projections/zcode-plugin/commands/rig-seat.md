---
name: rig:seat
description: Switch the active seat profile (scout | planner | worker | reviewer | off) — operator-invoked by construction
---

Write the seat selection to `~/.pi/agent/seat-state.json` as
`{ "seat": "<role>" }` (create or update), then confirm. Seats are law:
never self-switch; the operator runs this command.
