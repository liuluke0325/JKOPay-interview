# Cross-Agent Review Log

Append-only log of cross-agent reviews. The full workflow rules live in
[`../AGENTS.md`](../AGENTS.md) under "Cross-agent review workflow" — read
those before posting here. New entries get the next monotonic `RR-NNN` id.

## Entry template

```md
### YYYY-MM-DD — RR-NNN — short title — implementer: <agent name>

**Scope.** What was done and why.
**Files touched.**
- `path/to/file.ext:LL-LL` — what changed
- ...
**Commit / branch.** hash or branch name (if applicable)
**Self-checks done.** Tests run, manual checks, doc updates.
**Risks to focus on.** Where you most want a second pair of eyes — call out
specific Hard Rules (`AGENTS.md`) or RISKS items the change brushes against.
**Status.** `awaiting-review`

**Reviewer: <agent name> — YYYY-MM-DD**

- **Blockers** (must fix): …
- **Suggestions** (worth doing): …
- **Nits** (optional polish): …
- **Verdict.** `approved` | `changes-requested`

**Resolution — YYYY-MM-DD** (only if changes were requested)

- What was changed in response.
- Reviewer reconfirmation: `approved` | `accepted-with-followups`
  (requires human sign-off + linked follow-up in `docs/PROGRESS.md`).
```

---

## Log

<!-- Append new entries below, newest at the bottom. The first real entry
     will typically be the first post-bootstrap milestone (M1 or
     equivalent). -->
