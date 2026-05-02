# ADR-0010 — `pg_trgm` GIN for Chinese substring search

**Date**: 2026-05-03
**Status**: Accepted

## Context

Search is `q` against `title` + `description`, case-insensitive substring
match (REQUIREMENTS §5.B). Implemented via Prisma `contains` with `mode:
'insensitive'`, which compiles to Postgres `ILIKE '%q%'`. The index strategy
matters at production scale (Hard Rule 11).

Three search-index strategies were on the table:

1. **Plain btree on `title`/`description`.** What we shipped initially in
   M2 (RR-002). Btree indexes are useless for leading-`%` substring search:
   the planner cannot use them and falls back to seq-scan. Codex flagged
   this in RR-002 and we left it as a known issue with R3 in RISKS.md.
2. **`pg_trgm` GIN index** with `gin_trgm_ops`. Trigram-based — the index
   stores 3-character windows of every text column row. `ILIKE '%foo%'`
   becomes index-backed when the search term ≥ 3 chars (the planner can
   extract trigrams from the search term and intersect them).
3. **Postgres FTS** (`tsvector` + `to_tsquery`). Word-level full-text
   search. Massively more efficient than substring at scale, but English-
   tokenizer-default chunks Chinese into single ideographs, which means
   `to_tsquery('動物')` matches `動` and `物` independently — wrong. Real
   Chinese FTS needs `pg_jieba` / `zhparser` extensions, which don't ship
   with stock Postgres and require a custom Docker image or hosted-DB
   support (Neon doesn't offer them).

## Decision

**`pg_trgm` GIN indexes on both `title` and `description`** (migration
`20260502153230_add_pg_trgm_gin_search`). Old btree indexes dropped — they
weren't earning their keep for substring search.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "Item_title_trgm_idx" ON "Item" USING GIN (title gin_trgm_ops);
CREATE INDEX "Item_description_trgm_idx" ON "Item" USING GIN (description gin_trgm_ops);
```

## Consequences

**Easier:**
- `ILIKE '%q%'` on 10k+ items goes from full seq-scan to index lookup at
  scale. Demo dataset (90 rows) is too small for the planner to bother
  switching from seq-scan, but the index is dormant and ready (verified
  via `SET enable_seqscan=OFF; EXPLAIN`).
- Available in stock Postgres (16-alpine in docker, default in Neon). No
  custom image, no extension to ship outside Postgres core.
- Works for any UTF-8 string — Chinese, English, mixed.

**Harder:**
- **Trigram threshold.** The planner can only use the index when the
  search term is ≥ 3 characters. For 1- or 2-character Chinese queries
  (e.g. user types `流` or `流浪`) the planner falls back to seq-scan.
  Acceptable for the demo (most realistic queries are 3+ chars: `流浪
  動物`, `愛心義賣`); not acceptable if the product needs single-character
  prefix matching at scale.
- **Index size.** GIN trigram indexes are larger than btree — roughly
  3-5× the column size. For our use case the column sizes are small
  (titles + descriptions, max ~200 chars each) so this is fine.
- **Schema DSL gap.** Prisma's `schema.prisma` can't express
  `gin_trgm_ops`. The migration is hand-written SQL; the Prisma schema
  comment points at the migration so future migration generation
  doesn't try to drop the indexes.

## Revisit

If the product's search experience expands to require:

- **Word-level matching with relevance ranking** (e.g. `"動物 救援"` returns
  `動物保護` higher than `動物醫療` based on term overlap),
- **Single-character or two-character query support at scale**,
- **Cross-field weighted search** (title hits beat description hits),

then move to FTS with a Chinese tokenizer. Concretely:

1. Switch the deployed DB to a Postgres image with `pg_jieba` (Crunchy
   Bridge supports custom extensions; Neon does not as of writing —
   would require platform change).
2. Add a generated `tsvector` column on `Item` that's `setweight()`-ed
   per source field.
3. Migrate the search query from `ILIKE` to `@@ to_tsquery(...)`.

Tracked in `docs/SCALING.md` under "Postgres FTS as alternative to
`pg_trgm`".
