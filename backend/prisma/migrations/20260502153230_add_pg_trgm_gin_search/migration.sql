-- M2 hardening: replace useless btree indexes (don't help ILIKE '%q%')
-- with pg_trgm GIN indexes that the planner CAN use for substring search.

-- DropIndex
DROP INDEX "Item_description_idx";

-- DropIndex
DROP INDEX "Item_title_idx";

-- Enable trigram matching extension. Idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index with gin_trgm_ops makes ILIKE '%q%' index-backed.
-- Postgres planner will use this for `title ILIKE '%foo%'` and similar.
CREATE INDEX "Item_title_trgm_idx" ON "Item" USING GIN (title gin_trgm_ops);
CREATE INDEX "Item_description_trgm_idx" ON "Item" USING GIN (description gin_trgm_ops);
