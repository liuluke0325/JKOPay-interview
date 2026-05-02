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

1. [Defensive Docker host-port mapping for multi-project dev machines](#1-defensive-docker-host-port-mapping-for-multi-project-dev-machines)
2. [Why typecheck and build can both pass and the build can still be wrong](#2-why-typecheck-and-build-can-both-pass-and-the-build-can-still-be-wrong)

---

## 1. Defensive Docker host-port mapping for multi-project dev machines

If a service has a famous default port (Postgres 5432, Redis 6379, MySQL 3306, MongoDB 27017), other projects on the same dev machine probably also use it. `docker compose up` will fail with `Bind for 0.0.0.0:PORT failed: port is already allocated` and the next person hits the same wall.

**Lesson:** for any compose file that targets a famous-default port, **shift the host side by one** and document why inline. The container side keeps the canonical port (so internal connection strings, docs, and Prisma's expectations all stay normal); only the host-side mapping changes. Cost: one line of YAML and one line in `.env.example`. Benefit: the next reviewer on a multi-project laptop runs `make setup` once and it just works.

```yaml
ports:
  # Host 5433 → container 5432. Host port shifted because another local
  # Postgres (e.g. another project's docker) commonly squats on 5432.
  - "5433:5432"
```

**Code:** [docker-compose.yml](../docker-compose.yml), [.env.example](../.env.example)
**See also:** AI_JOURNAL.md M1 entry (where this came up); RR-001 in REVIEWS.md (Codex agreed and recommended keeping the shift).

---

## 2. Why typecheck and build can both pass and the build can still be wrong

`tsc --noEmit` (typecheck) and `tsc` (build) can disagree even when both succeed individually:

- **Different include scopes.** This project has two configs: `tsconfig.json` for build (rootDir: `src/`, include: `src/**/*`) and `tsconfig.check.json` for typecheck (rootDir: `.`, include: `src/**/*` + `prisma/**/*.ts`). The seed script (`prisma/seed.ts`) is checked but never built. If you only run `npm run typecheck`, you can ship a build that fails for files only the build config sees — and vice versa.
- **Emit-time vs check-time errors.** Some errors only surface during emit: declaration generation, module resolution that needs to find a file path, target/lib mismatches that affect output but not type analysis.

**Lesson:** before posting a Review request, run **both** `npm run typecheck` and `npm run build`. They are not redundant. Codex caught this gap in RR-001 by running the build during reconfirmation.

**Code:** [backend/tsconfig.json](../backend/tsconfig.json), [backend/tsconfig.check.json](../backend/tsconfig.check.json), [backend/package.json](../backend/package.json)
**See also:** REVIEWS.md RR-001 reconfirmation block; AGENTS.md "Working agreements" → "Pre-review self-checks must include build".

<!-- Append new sections below, numbered, in roughly the order you learned
     them. Reorder later if a more logical grouping emerges. -->
