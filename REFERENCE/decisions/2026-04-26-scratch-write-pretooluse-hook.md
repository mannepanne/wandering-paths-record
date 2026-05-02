# ADR: SCRATCH Write approval via PreToolUse hook (not allow-list entry)

**Date:** 2026-04-26
**Status:** Active

---

## Decision

Auto-approve `Write` tool calls into `<project>/SCRATCH/` via a `PreToolUse` hook (`approve-scratch-write.sh`), not via a `Write(/SCRATCH/*)` allow-list entry in `settings.json`.

## Context

The PR review skills write intermediate results to `SCRATCH/` before posting them to GitHub (e.g., `SCRATCH/review-pr-42-standard.md`). These writes should be auto-approved — they are always safe, always intentional, and prompting on every Write would interrupt the review flow.

The obvious solution is a `Write(/SCRATCH/*)` allow-list entry in `settings.json`. This was attempted first.

## The upstream defect

The `Write(path-pattern)` allow-list matcher does not silence permission prompts in fresh Claude Code sessions. This was observed across five separate sightings:

1. **Sighting 1 (2026-04-14):** `Write(/SCRATCH/*)` entry present; fresh session; prompt appeared on first Write to `SCRATCH/review-pr-12-light.md`.
2. **Sighting 2 (2026-04-15):** `Write(SCRATCH/**)` added alongside the slash-prefixed form; prompt still appeared in new session.
3. **Sighting 3 (2026-04-15):** Both `Write(/SCRATCH/*)` and `Write(SCRATCH/**)` present; session resumed from prior context; Write was silenced. Subsequent fresh session: prompt reappeared.
4. **Sighting 4 (2026-04-22):** Isolated test — created new project, added only `Write(/tmp/test-scratch/*)`, opened fresh Claude Code session, attempted Write to `/tmp/test-scratch/foo.md`: prompt appeared.
5. **Sighting 5 (2026-04-23):** Same isolated test with a relative path form `Write(SCRATCH/*)`: prompt appeared.

Pattern: the defect is specific to `Write` entries and to fresh sessions. `Bash(...)` and `Read(...)` entries honour the matcher consistently. The defect appears to be in how Claude Code normalises paths on the Write permission gating layer at session start — the exact mechanism is not documented and was not investigated further (the hook workaround is sufficient).

**`Read` entries are unaffected.** `Read(/SCRATCH/*)` and `Read(SCRATCH/**)` entries remain in `settings.json` and work correctly. Only `Write` is broken.

## Alternatives considered

- **`Write(/SCRATCH/*)` allow-list entry:** The obvious path; does not work reliably (see defect above).
- **No auto-approval; require manual approval on each Write:** Unacceptable UX — the review flow writes 1–3 files per review and the prompt interrupts the automated sequence.
- **Write to `/tmp/` instead of `SCRATCH/`:** Avoids the per-project path; still triggers Write prompts (`/tmp/` is not in any allow-list and adding `Write(/tmp/*)` would be a much larger security surface).
- **Chosen: `PreToolUse` hook:** Hooks run before the permission gating layer and their `permissionDecision: "allow"` output is honoured consistently, including in fresh sessions. This is the authoritative path for auto-approving specific Write patterns.

## Reasoning

The `PreToolUse` hook mechanism is the correct layer for this approval:

1. **Hooks are evaluated before the permission gate.** A `permissionDecision: "allow"` response from a hook bypasses the permission prompt entirely, regardless of session state.
2. **Hooks are path-aware.** `approve-scratch-write.sh` checks that the path is strictly inside `$CLAUDE_PROJECT_DIR/SCRATCH/` (not just a path containing "SCRATCH"), rejects `..` traversal, and requires at least one path segment after `SCRATCH/`.
3. **The hook is conservative by design.** It only emits `allow` — it cannot block or deny. The worst case if the hook has a bug is that SCRATCH writes still require manual approval (the same state as without the hook).

## Trade-offs accepted

- **Process spawn overhead:** Every `Write` tool call spawns the hook process (a bash script + python3). On a typical review flow (2–3 Writes), this overhead is negligible (~50–100ms total). If Write volume grows significantly, this could become noticeable.
- **Compensating for an upstream defect:** The hook exists to work around a Claude Code bug, not to express a deliberate design choice. If the upstream defect is fixed, the hook can be removed and the allow-list entry reinstated — but the `Read` entries should remain (they work correctly).
- **Symlink transparency:** The path check is textual, not `realpath`-based. A symlink inside `SCRATCH/` that points outside the project will be approved. This is out of scope for the current threat model (single trusted contributor).

## Implications

- `Read(/SCRATCH/*)` and `Read(SCRATCH/**)` entries in `settings.json` remain (they work).
- `Write(/SCRATCH/*)` entries in `settings.json` are kept as documentation (with a `_comment_scratch_writes` field explaining why the hook, not the entry, is the active mechanism), but they are not the operative approval path.
- If the upstream defect is fixed in a future Claude Code version, re-test: add only the allow-list entry, remove the hook registration, and verify Write to `SCRATCH/` is silenced in a fresh session. If confirmed fixed, remove the hook entirely.
- The hook is registered via `hooks.PreToolUse` in `settings.json` with a `Write` matcher (no `if` filter — the hook itself checks the path and exits 0 for non-SCRATCH Writes).

---

## References

- Hook implementation: `.claude/hooks/approve-scratch-write.sh`
- Related ADRs: [2026-04-26 — Allowlist pinning principle](./2026-04-26-allowlist-pinning-principle.md)
- Related ADRs: [2026-04-25 — PR review threat model](./2026-04-25-pr-review-threat-model.md)
