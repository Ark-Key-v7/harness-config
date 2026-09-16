# A2A Completion Payload — validation rules beyond the schema (canon Appendix §4, verbatim)

- trace_id MUST be non-null when regime=gateway.
- failure_class MUST be non-null when status=FAIL.
- commit_hash MUST exist in the ledger's known-commit set for the worktree.
  (Ledger-deferred: register §D.15. Until the ledger exists this rule is
  enforcement: manual-review — the reviewer seat verifies the hash against
  the worktree HEAD.)

Rig note (WP-C2): the rig's dual failure vocabulary (state.schema.yaml
reconciliation, Appendix E) adds `needs_human` and `holdout_leak` to
failure_class in STATE.md. The A2A payload schema above is canon-verbatim and
does NOT carry them: the payload is the cross-factory radio; the extended
vocabulary is rig-internal state. Mapping on emit: needs_human/holdout_leak
map to status=FAIL with failure_class=null and the detail carried in
STATE.md. If canon revises the enum, this file is replaced wholesale, never
patched piecemeal.
