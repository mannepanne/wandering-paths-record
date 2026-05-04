# SCRATCH write hook — operations guide

The `approve-scratch-write.sh` PreToolUse hook auto-approves `Write` tool calls into `<project>/SCRATCH/`. This is a workaround for an upstream Claude Code defect where `Write(/SCRATCH/*)` allow-list entries are not honoured in fresh sessions.

**For the decision record and the 5 sightings that established the defect:** see [`REFERENCE/decisions/2026-04-26-scratch-write-pretooluse-hook.md`](./decisions/2026-04-26-scratch-write-pretooluse-hook.md).

---

## How it works

The hook is registered in `.claude/settings.json` under `hooks.PreToolUse` with a `Write` matcher. On every `Write` tool call, Claude Code spawns the hook before the permission gating layer. The hook:

1. Reads the `file_path` argument from the tool input JSON via `parse-tool-input.sh`.
2. Rejects the call (exits 0 without emitting `allow`) if `CLAUDE_PROJECT_DIR` is not set, if the path contains `..`, or if the path does not begin with `$CLAUDE_PROJECT_DIR/SCRATCH/`.
3. Emits `{"hookSpecificOutput": {"permissionDecision": "allow", "reason": "..."}}` for paths that pass.

Emitting `allow` bypasses the permission prompt entirely. Exits without emitting anything for all other `Write` calls — they proceed through normal gating.

---

## Verifying the hook is working

Run the test suite:

```bash
.claude/hooks/tests/approve-scratch-write/run-tests.sh
```

Expected: `Tests: 7/7 passing` (6 fixture-based cases plus the executability guard).

To manually confirm in a session: open a fresh Claude Code session and write any file to `SCRATCH/`. The write should complete without a permission prompt.

---

## Extending — adding paths or rules

The hook is intentionally conservative: only `SCRATCH/` is auto-approved. If you need to auto-approve writes to a different directory:

1. Either extend the hook to check additional paths (update the guard in `approve-scratch-write.sh` and add corresponding test fixtures).
2. Or create a second hook file, register it under `hooks.PreToolUse` in `settings.json`, and add its test suite.

Do not broaden the existing hook to cover arbitrary paths — the path specificity is the point.

---

## Removing the hook

If the upstream Claude Code defect is fixed (i.e. `Write(/SCRATCH/*)` allow-list entries are reliably honoured in fresh sessions), the hook can be removed:

1. Verify the fix by adding only `"Write(/SCRATCH/*)"` to the `allow` array in `settings.json`, removing the hook registration from `hooks.PreToolUse`, and confirming writes to `SCRATCH/` are silenced without prompts in a fresh session.
2. If confirmed: remove the hook registration from `settings.json`, delete `.claude/hooks/approve-scratch-write.sh`, and delete `.claude/hooks/tests/approve-scratch-write/`.
3. Do not remove the `Read(/SCRATCH/*)` entries — they work correctly and were never part of the hook workaround; only `Write` was broken.
4. Update the ADR at `REFERENCE/decisions/2026-04-26-scratch-write-pretooluse-hook.md` to mark Status as Superseded and document the Claude Code version where the fix landed.

---

## Related files

- Hook: `.claude/hooks/approve-scratch-write.sh`
- Shared library: `.claude/hooks/lib/parse-tool-input.sh`
- Test suite: `.claude/hooks/tests/approve-scratch-write/run-tests.sh`
- Settings registration: `.claude/settings.json` → `hooks.PreToolUse`
- Decision record: `REFERENCE/decisions/2026-04-26-scratch-write-pretooluse-hook.md`
