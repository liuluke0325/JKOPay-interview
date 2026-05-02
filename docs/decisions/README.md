# Decision Log (lightweight ADRs)

One entry per non-obvious decision, one file per ADR. Keep each entry short — three sections: **Context**, **Decision**, **Consequences**. If we revisit later, add a **Revisit** note rather than rewriting history.

Numbering is monotonic across the folder. Don't reuse numbers even after rejecting a decision. New ADRs go in `NNNN-short-title.md` (zero-padded to 4 digits).

## Index

| #   | Title                                                                     | Status        |
| --- | ------------------------------------------------------------------------- | ------------- |
| 0001 | [Documentation lives in `docs/`, agent rules in `AGENTS.md`](0001-docs-structure.md) | Accepted (process) |
| 0002 | [Cross-agent review workflow via `docs/REVIEWS.md`](0002-cross-agent-review.md)      | Accepted (process) |
| 0003 | [Frontend: Next.js over plain React](0003-frontend-nextjs.md)             | Accepted      |
| 0004 | [ORM: Prisma over TypeORM](0004-orm-prisma.md)                            | Accepted      |
| 0005 | [Database: Postgres via docker-compose over SQLite](0005-db-postgres-docker.md) | Accepted |
| 0006 | [Cursor-based pagination over offset](0006-pagination-cursor.md)          | Accepted      |
| 0007 | [i18n: next-intl with zh-TW default](0007-i18n-next-intl.md)              | Proposed      |
| 0008 | [List virtualization with react-window](0008-virtualization-react-window.md) | Proposed   |
| 0009 | [Tab + scroll restore on search cancel](0009-tab-scroll-restore.md)       | Proposed      |
| 0010 | [`pg_trgm` GIN for Chinese substring search](0010-pg-trgm-cjk-search.md)  | Accepted      |
| 0011 | [`TRUST_PROXY` defaults off; production opts in](0011-trust-proxy-default-off.md) | Accepted |
| 0012 | [HTTP `Cache-Control` + CDN over Redis hot-read tier](0012-http-cache-vs-redis.md) | Accepted |
| 0013 | [zod + `fastify-type-provider-zod` single source of truth](0013-zod-single-source-of-truth.md) | Accepted |

> Process ADRs (0001/0002) document how we collaborate, not what we build. The assignment's "≥3 technical decisions" requirement is satisfied many times over by 0003 onward.

## Template

```md
# ADR-NNNN — short title

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Superseded by ADR-XXXX | Rejected

## Context

What problem are we solving? Why now?

## Decision

What did we choose?

## Consequences

What does this make easier / harder?

## Revisit

(optional) Conditions under which we'd reopen this.
```
