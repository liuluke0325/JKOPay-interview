# ADR-0002 — Cross-agent review workflow via `docs/REVIEWS.md`

**Date**: 2026-05-02
**Status**: Accepted

## Context

We use Claude Code and Codex CLI on the same project. They have different blind spots; using each to review the other's meaningful work is cheap insurance against hallucinations and subtle Hard Rule violations.

## Decision

- After an agent finishes a *meaningful* task (milestone, high-risk subsystem change, API/schema change, new ADR, edits to `AGENTS.md` / `REQUIREMENTS.md`), the **other** agent reviews before we proceed.
- Handoff happens through `docs/REVIEWS.md`: implementer writes a `Review request` block, reviewer appends a `Review` block, implementer appends a `Resolution` block if changes were requested.
- The reviewer does **not** rewrite substantive code — feedback only. Trivial mechanical fixes (typo, missing import) are fine to apply directly.
- Self-review is disallowed; if only one agent is available, leave the request `awaiting-review` for the next session.
- `accepted-with-followups` requires explicit human sign-off plus a linked follow-up in `docs/PROGRESS.md`; agents may not select it unilaterally.
- The human decides milestone progression — an `approved` review unblocks the next step, not the next milestone.

## Consequences

Slight slowdown per meaningful task in exchange for a second pair of eyes on the highest-risk paths and a paper trail.
