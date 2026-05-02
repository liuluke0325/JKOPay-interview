# ADR-0012 — HTTP `Cache-Control` + CDN over Redis hot-read tier (for now)

**Date**: 2026-05-03
**Status**: Accepted

## Context

The user pushed for production-scale framing on M2: "assume thousands
concurrent / 10k+ items, what would actually break first." Three caching
strategies were on the table:

1. **No caching.** Every request hits Fastify → Prisma → Postgres. Fine
   at 10s of concurrent users; saturates the DB long before reaching
   "thousands."
2. **HTTP `Cache-Control` headers + CDN/edge cache fronting.** Same query
   from many clients in the same TTL window served by CDN; origin sees
   one request per TTL. Standard, RFC 9111.
3. **Redis hot-read cache tier in the BE process.** Cache the response
   bodies of expensive endpoints in Redis, keyed by query params. Hit
   Redis before Prisma.

The decision is "which of these (or both) for which endpoints, given
our actual access pattern."

Our access pattern:

| Endpoint | Cardinality of distinct queries | Output stability |
|---|---|---|
| `/sub-categories?category=X` | 3 (one per Category) | Static — only changes on deploy |
| `/items?category=&subCategory=&q=&cursor=&limit=` | High — combinatorial | Dynamic — new items can appear |
| `/items/:id` | One per item | Stable per id; rare update |
| `/health` | One | Live (must not be cached) |

## Decision

**HTTP `Cache-Control` per route, CDN fronting handles the rest. No Redis tier.**

| Route | Header | Reason |
|---|---|---|
| `/sub-categories` | `public, max-age=300, s-maxage=3600` | Output is derived from a static TS constant; changes only on deploy. Aggressive CDN cache; bust on deploy via either CDN purge or URL versioning. |
| `/items` (list) | `public, max-age=30, s-maxage=60` | Dynamic but tolerates short staleness. Same query from many clients in the same minute hits CDN. |
| `/items/:id` | `public, max-age=60, s-maxage=300` | Stable per id; longer TTL safe. |
| `/health` | (no Cache-Control) | Probes must be live. |
| `/docs`, `/docs/json` | (no Cache-Control) | Reviewer-facing; want fresh. |

Redis tier deferred — see `docs/SCALING.md` "Hot-read caching tier (Redis)"
for the full rationale and what would trigger reversal.

## Consequences

**Easier:**
- Zero new infrastructure. No Redis to provision, secure, monitor, or
  invalidate.
- CDN handles repeat traffic at the edge — for `/sub-categories` (the most
  duplicate-query-prone endpoint), origin sees ~1 request per region per
  TTL, regardless of client count.
- Browser cache picks up the same headers — repeat tab opens are free.
- Compatible with any CDN that supports standard cache headers (Cloudflare,
  Vercel Edge, Fastly, CloudFront).

**Harder:**
- **Cache invalidation is deployment-coupled.** When `SUB_CATEGORIES`
  changes, old data persists at the CDN edge for up to `s-maxage` (1
  hour). Three mitigation patterns:
  1. **CDN purge on deploy** — Vercel/Cloudflare API hooks. Operational
     coupling but standard.
  2. **URL versioning** — `/sub-categories?v=<deploy-sha>` makes each
     deploy a new cache key. Self-busting. Recommended path; FE generates
     the URL with the build SHA.
  3. **Cache tags / surrogate keys** — Cloudflare Cache Tags, Fastly
     Surrogate Keys. Selective purge by tag. Most flexible; needs the
     FE to send `Cache-Tag` headers and the deploy script to invoke
     the tag-purge API.

  We're starting with #1 (deploy hook). Documented in `docs/SCALING.md`.
- **`/items` list with `q`/`cursor` has near-unique query strings**, so
  the CDN cache hit rate on that route is much lower than `/sub-categories`.
  That's fine — the short TTL still helps the "same first-page query"
  case (initial page load, no scroll, no search).
- **Per-user content** can't be cached this way (would leak between users).
  We have no per-user content; if that changes, swap to `private` Cache-Control
  + Redis or in-memory cache keyed by user.

## When this ADR should be revisited (Redis becomes worth it)

Per `docs/SCALING.md`, Redis becomes worth adding when **at least one** of:

1. Multi-replica BE deployment + per-IP rate limit needs shared state
   (otherwise `N replicas × max` requests/window slip through).
2. Auth-required endpoints land — CDN can't cache per-user.
3. CDN cache-bypass rate climbs (e.g. high `q` cardinality on a search
   endpoint that we'd rather not seq-scan repeatedly).
4. We need sub-second TTL with high hit rate that CDN's edge propagation
   delay can't deliver.

None of these are true today. The deferral is documented, not forgotten.
