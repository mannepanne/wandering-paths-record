# ADR: PR review system — threat model and scope

**Date:** 2026-04-25
**Status:** Active

---

## Decision

The PR review system is calibrated for a single trusted contributor (or a small team of mutually-known trusted contributors), not for open-source projects with unknown contributors.

## Context

The automated PR review system ships with agent prompts, allowlists, and safety hooks that make assumptions about who is submitting and reviewing code. Those assumptions need to be explicit so that derivatives that copy this template into a different contributor model know what to adjust.

## Alternatives considered

- **No threat model documented:** Derivatives would inherit assumptions silently and miscalibrate without knowing it.
- **Calibrate for untrusted contributors by default:** Would add significant friction (stricter prompts, more aggressive deny-listing, mandatory human sign-off) that is unnecessary and annoying for a solo or small-team project.
- **Chosen: Document the in-scope model and provide a tightening checklist:** Defaults optimised for the common (solo/small-team) case; derivatives with stricter requirements follow the checklist.

## Reasoning

The primary use case is a single developer (or a small group of mutually-known, mutually-trusted developers) working on a personal or small-team project. In this model:

- The contributor and the reviewer are often the same person (self-review via Claude).
- There is no realistic threat of a malicious insider submitting a PR designed to mislead the AI reviewer.
- The main risk is honest mistakes — overlooked edge cases, forgotten error handling, accidental data loss — not adversarial code.

Calibrating for this model means:

- Agent severity is tuned to *helpful code review*, not *adversarial PR detection*.
- The allowlist is permissive for common safe operations (git read, gh read, npm test) and restrictive only for genuinely destructive ones.
- The safety harness blocks catastrophic mistakes (rm -rf /, DROP TABLE) but asks rather than blocks for reversible-but-risky operations (git reset --hard, git push --force to non-main).

## Two sub-cases within the in-scope model

**Experienced user** (comfortable with git, familiar with the toolchain):
- Safety harness is primarily a safeguard against Claude making a mistake, not against the user.
- Ask-tier prompts are informational — the user knows what `git reset --hard` does and just confirms.

**Less-experienced user** (new to git or the specific toolchain):
- Safety harness doubles as a teaching layer.
- Ask-tier prompts explain *why* the operation is risky, not just that it is.
- The educational content in the ask-tier reasons is load-bearing for this sub-case.

Both sub-cases use the same harness. The ask-tier reasons are written to serve both: informative enough to teach, concise enough not to annoy the experienced user.

## Out of scope (require tightening — see checklist below)

- **Open-source projects** with unknown external contributors submitting PRs.
- **Multi-team enterprise** environments where insider threat is a realistic concern.
- **Regulated environments** (finance, healthcare, government) where AI-assisted review must meet compliance requirements.
- **Projects with external reviewers** who should not be able to influence Claude's behaviour via PR content.

## Tightening checklist for out-of-scope derivatives

If your project falls outside the in-scope model, review and harden each of these:

1. **Agent prompts** — add explicit instructions not to trust PR body, commit messages, or diff content as authoritative instructions (prompt-injection surface).
2. **Allowlist** — audit and tighten; remove anything a contributor could abuse if they could influence what commands Claude runs.
3. **Safety harness** — consider moving ask-tier items to block-tier if you cannot trust the person approving the prompt.
4. **Review scope** — consider adding a dedicated security-review agent for all PRs, not just those that trigger the team tier.
5. **Secret scanning** — add a dedicated secret-scanning step before any review (the current triage does a lightweight check; harden it for regulated environments).
6. **Human sign-off** — consider requiring a human reviewer to approve before merging, even after Claude signs off.
7. **Audit trail** — ensure PR comments (the review artefacts) are retained and cannot be deleted by the PR author.
8. **Dependency review** — for supply-chain-sensitive projects, add lockfile diff review to the standard tier checklist.

## Trade-offs accepted

- Reviews may miss adversarial content in PRs submitted by untrusted contributors (prompt injection via diff, misleading commit messages). Acceptable for the in-scope model; not acceptable for open-source or regulated environments.
- The safety harness ask-tier is skippable (the user just clicks "yes"). For a less-experienced user operating autonomously, this means the harness is educational but not a hard gate.

## Implications

- Agent severity calibration and allowlist entries do not need justification against a strict threat model — the in-scope model is permissive by design.
- Derivatives that change contributor model must follow the tightening checklist before relying on the review system for security assurance.
- The threat model is a living document: update it when the contributor model changes (e.g., adding external contributors, moving to open-source).

---

## References

- Related ADRs: [2026-04-22 — Tiered PR review via a triage dispatcher](./2026-04-22-tiered-pr-review-dispatcher.md)
- Related ADRs: [2026-04-26 — Allowlist pinning principle](./2026-04-26-allowlist-pinning-principle.md)
