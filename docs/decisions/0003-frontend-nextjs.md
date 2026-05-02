# ADR-0003 — Frontend: Next.js (App Router) over plain React

**Date**: 2026-05-02
**Status**: Accepted

## Context

The brief allows React or Next.js. The frontend has three real screens (default
list, dedicated `/search` route, `/items/[id]` detail) plus the mandatory live
demo URL. Two questions to resolve:

1. **Routing.** Three distinct URLs, and search-cancel needs to *restore* the
   prior tab + scroll. Whichever framework owns routing must support
   URL-as-state cleanly.
2. **Demo deployment.** The brief calls out "demo URL is mandatory" in red.
   Whatever we pick has to deploy without ceremony.

Considered:

- **Plain React + Vite.** Smallest surface, fastest dev feedback loop. But
  routing needs `react-router-dom` plus our own URL-state plumbing, and a
  static-host deploy doesn't get SSR/edge for free.
- **Next.js App Router.** File-system routing with native URL params, server
  components by default (less client JS in the bundle), trivial Vercel
  deploy, edge runtime free. Slightly steeper boot — server vs client
  component boundary, RSC mental model.
- **Next.js Pages Router.** Older API, simpler mental model, but actively
  on its way out for new projects.

## Decision

**Next.js (App Router) + TypeScript + Tailwind**, deployed to Vercel.

## Consequences

**Easier:**
- File-system routing covers `/`, `/search`, `/items/[id]` with no extra dep.
- `?tab=` URL state via `useSearchParams` / `next/navigation`.
- Vercel deploy is `git push` away — covers the mandatory demo URL with the
  least operational risk.
- Server components reduce client bundle for the static parts of the layout
  (red header, tab labels).

**Harder:**
- Server-vs-client component boundary requires care; data-fetching hooks
  (TanStack Query, debounce, abort) must live in `'use client'` files.
- Slightly more cognitive overhead for the reviewer on first read.
- next-intl + App Router requires the locale-segment middleware setup or an
  explicit no-prefix configuration (we'll go no-prefix; ADR-0007).

## Revisit

If the FE ever needs to be deployed somewhere other than Vercel (e.g. a
static-only host), the SSR / edge features collapse to nothing and the
plain-React-plus-router argument gets stronger. Not on the horizon.
