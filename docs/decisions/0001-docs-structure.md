# ADR-0001 — Documentation lives in `docs/`, agent rules in `AGENTS.md`

**Date**: 2026-05-02
**Status**: Accepted

## Context

Need a single place both Claude Code and Codex CLI can read for project-wide rules, plus a place to track requirements / progress / risks without spamming the repo root.

## Decision

- Project docs live in `docs/` (REQUIREMENTS, PROGRESS, decisions/, RISKS, TESTING, AI_JOURNAL, REVIEWS, LEARNING_NOTES).
- `AGENTS.md` at the repo root is the **single source of truth** for AI agent behavior (Codex CLI reads this natively).
- `CLAUDE.md` at the repo root is a one-line redirect to `AGENTS.md` so Claude Code converges on the same rules.
- `docs/decisions/` is a **folder** (not a single file), with one ADR per file. The brief explicitly names this path.

## Consequences

Either tool can be pointed at the project and will pick up identical rules. If we later need Claude-specific overrides, add them to `CLAUDE.md` *after* the redirect. The folder layout matches the assignment's expected `/docs/decisions/` location.
