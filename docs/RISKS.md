# Risk Register

Concrete, actionable risks — not generic platitudes. Update mitigations as we
learn. Sort roughly by impact × likelihood.

| #   | Risk                                                                          | L      | I      | Mitigation                                                                                                |
| --- | ----------------------------------------------------------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------- |
| R1  | Same-day build — over-engineering bonus items eats required features          | M      | H      | Cut from M-late milestones first; ship M1–M5 before M6+; never cut M8 (demo).                              |
| R2  | Infinite-scroll dedup / race on rapid scroll + concurrent search              | M      | M      | Cursor-based pagination + abort in-flight on new search; e2e test for the race.                            |
| R3  | Search latency on mock data without indexes                                   | L      | M      | Compound index `(category, subCategory, createdAt)` + `title`/`description` index; load-test with 1k–10k seed rows. |
| R4  | Demo deployment slips → no live URL at submission                              | M      | Fatal  | Deploy a "hello world" of FE+BE during M3 *before* features are complete; iterate from there.              |
| R5  | Backend hosting cost / cold-start surprises (Railway free tier)                | L      | M      | Document Render fallback in ADR-0005-adjacent notes; budget for 1 redeploy if Railway misbehaves.          |
| R6  | Prisma schema drift between local Postgres and Neon                            | L      | M      | Single `schema.prisma` source of truth; run `prisma migrate deploy` against both before demo cutoff.       |
| R7  | Search-result race: rapid keystrokes paint stale data over fresh               | M      | M      | AbortController on each request + 300ms debounce; e2e test types fast, asserts final query wins.           |
| R8  | Tab-switch loses scroll position / refetches unnecessarily                     | L      | L      | Cache per-tab cursor + items in client state; flush only on search query change.                           |
| R9  | `react-window` doesn't play well with variable-height cards (1- vs 2-line desc)| M      | M      | Force a fixed card height via Tailwind `h-[N]` + `line-clamp-2`; visual-regression test on desktop & mobile.|
| R10 | `next-intl` SSR setup eats half the build budget                               | M      | M      | Time-box i18n setup to 60 min; if blocked, fall back to a tiny `t(key)` shim reading from a JSON dict — same call-site, simpler internals; record the choice in ADR-0007. |
| R11 | Restore-on-cancel breaks on browser refresh (sessionStorage cleared)           | L      | L      | Persist `tab` to URL (`?tab=`) so a refresh round-trips correctly; only `scrollY` lives in sessionStorage. |
| R12 | Real-logo URLs hotlinked from external sites break or get blocked              | M      | L      | Vendor 5–10 logos into `public/logos/` for the seed; remaining items use a generated SVG placeholder.       |

## Resolved / monitoring

<!-- Move risks here when mitigated. Keep a one-line note explaining how
     they were retired (test name, ADR number, etc.) so we can re-open if
     the underlying assumption changes. -->
