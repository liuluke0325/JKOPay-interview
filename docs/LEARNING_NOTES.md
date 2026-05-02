# Learning Notes — interview-jopay

Topical notes on concepts learned during this project. **Organized by topic,
not chronologically** — easier to flip back to. Each section should link to
the code path it explains so you can jump back to the source.

This file complements `AI_JOURNAL.md`:

- `AI_JOURNAL.md` = the *exchange* (what you asked, what the AI said, what
  changed). Chronological. Useful as a paper trail and for the AI
  collaboration grading dimension.
- `LEARNING_NOTES.md` = the *understanding* (the concept itself, written
  down once you grok it). Topical. Useful for revisiting a tricky idea
  without re-reading 30 chat turns.

## When to add to this file

- You just understood something non-obvious that took >1 session to figure out.
- You hit a subtle bug whose root cause is a concept you didn't have before.
- You picked an approach where the *why* would be hard to reconstruct from
  the code alone (an invariant, an algebraic argument, a trade-off).
- You explained something to the AI and want a written reference for next
  time.

What NOT to put here:

- Anything already documented in the source / official docs (link to them
  instead).
- Architectural decisions — those go in `decisions/` as ADRs.
- Risk mitigations — those go in `RISKS.md`.
- Step-by-step how-tos — those go in the README.

## Section template

```md
## N. <topic title>

<2-4 paragraphs. Lead with the takeaway in plain English; only then drill
into the mechanism. Add code references with `path/to/file.ext:line` so
future-you can jump back.>

**Code:** `backend/foo/src/bar.rs:42`, `frontend/components/Baz.tsx:88`
**See also:** `decisions/NNNN-*.md`, `RISKS.md` R-NNN.
```

---

## Table of contents

<!-- Update as sections are added. -->

1. <!-- first concept -->

---

<!-- Append new sections below, numbered, in roughly the order you learned
     them. Reorder later if a more logical grouping emerges. -->
