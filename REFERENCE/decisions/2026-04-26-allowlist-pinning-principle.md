# ADR: Allowlist pinning principle — subcommand vs binary level

**Date:** 2026-04-26
**Status:** Active

---

## Decision

Pin allowlist entries to the subcommand level when the binary can evaluate or execute arbitrary code; allow at the binary level when the binary is a pure data transformer that cannot.

## Context

Claude Code's `settings.json` allowlist controls which `Bash(...)` invocations are auto-approved without a permission prompt. Entries can be written at different granularities:

- **Binary level:** `Bash(python3:*)` — allows any python3 invocation.
- **Subcommand level:** `Bash(python3 -m json.tool:*)` — allows only `python3 -m json.tool ...`.
- **Exact invocation:** `Bash(python3 -m json.tool --sort-keys /tmp/foo.json)` — allows only that exact command.

The question is: at what level should each tool be pinned?

## Alternatives considered

- **Always pin to binary level:** Simplest to write; worst security posture. `Bash(python3:*)` allows `python3 -c "import os; os.system('rm -rf /')"`.
- **Always pin to exact invocation:** Maximum restriction; impractical. Every new flag or filename requires a new allowlist entry.
- **Chosen: Pin to subcommand level for code-executing binaries; allow at binary level for pure data transformers:** Balances security and usability. The line is clear and consistent.

## Reasoning

The key distinction is whether the binary can evaluate arbitrary code passed as an argument:

**Binaries that can evaluate code — pin to subcommand:**
- `python3` — `python3 -c "..."` executes arbitrary Python.
- `node` — `node -e "..."` executes arbitrary JavaScript.
- `bash` / `sh` — `bash -c "..."` executes arbitrary shell.
- `ruby`, `perl`, `deno` — all have `-e` or similar eval flags.

Pinning these to the subcommand (`python3 -m json.tool:*`, `python3 -m pytest:*`) means that even if a prompt-injection attack causes Claude to try `python3 -c "malicious code"`, the allowlist blocks it and triggers a prompt.

**Binaries that are pure data transformers — allow at binary level:**
- `jq` — parses and transforms JSON; cannot execute system calls.
- `grep` — searches text; cannot execute system calls.
- `sed`, `awk` — transform text; the attack surface is much smaller (no exec flags).
- `wc`, `sort`, `uniq`, `head`, `tail` — pure data operations.

These cannot evaluate code even with adversarial arguments, so allowing `Bash(jq:*)` is safe.

**Special case — git:**
`git` is not a code-executing binary in the Python/node sense, but it has hooks (pre-commit, post-checkout, etc.) that execute arbitrary scripts. In practice, git hooks are only triggered by the project's own hook files (which we trust), so `git` falls closer to the "safe at binary level" category — but the allowlist is written at the subcommand level anyway (`Bash(git log:*)`, `Bash(git diff:*)`, etc.) because some git operations are destructive (`git reset --hard`, `git push --force`) and the safety harness hook handles those. Pinning to subcommand keeps the two layers consistent.

## Worked examples

| Binary | Allowlist level | Entry | Rationale |
|---|---|---|---|
| `python3` | Subcommand | `Bash(python3 -m json.tool:*)` | Can eval code via `-c`; only allow the specific module use |
| `python3` | Subcommand | `Bash(python3 -m pytest:*)` | Same binary, different subcommand |
| `node` | Subcommand | `Bash(node_modules/.bin/vitest:*)` | Can eval via `-e`; only allow the installed script |
| `jq` | Binary | `Bash(jq:*)` | Pure data transformer; no exec surface |
| `grep` | Binary | `Bash(grep:*)` | Pure text search; no exec surface |
| `git` | Subcommand | `Bash(git log:*)`, `Bash(git diff:*)` | Destructive subcommands handled separately by safety harness |

## Trade-offs accepted

- More entries in `settings.json` (one per subcommand use case rather than one per binary).
- New python3 use cases (e.g., adding a new `-m module` invocation) require a new allowlist entry.
- The line between "can eval code" and "cannot" requires judgment; edge cases exist (e.g., `awk` with system calls, `curl` with `--next`).

## Implications

- Before adding a new allowlist entry, check whether the binary can eval code. If yes, pin to subcommand.
- Review this ADR when adding new toolchain binaries to the project (new language runtimes, new CLI tools).
- This principle applies to the `settings.json` allowlist; the safety harness hook is a separate, complementary layer that operates on the command string itself.

---

## References

- Related ADRs: [2026-04-25 — PR review threat model](./2026-04-25-pr-review-threat-model.md)
- Related ADRs: [2026-04-26 — SCRATCH Write PreToolUse hook](./2026-04-26-scratch-write-pretooluse-hook.md)
