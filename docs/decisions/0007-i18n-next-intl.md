# ADR-0007 — i18n: `next-intl` with zh-TW default, no URL prefix

**Date**: 2026-05-03
**Status**: Accepted

## Context

REQUIREMENTS §5.E mandates that "all visible UI strings flow through
`next-intl` dictionaries (zh-TW default)" and that "an English dictionary
stub exists." Hard Rule 9 (`AGENTS.md`) bans hard-coded zh-TW literals in
JSX — every visible string has to be keyed.

Three i18n questions to settle for the M3 frontend skeleton:

1. **Library.** `next-intl` is the App Router-native option as of 2026 with
   first-class server-component message loading. Alternatives considered:
   - `react-i18next` — works in any React app, but server-component access
     requires extra plumbing (no native `getTranslations` on the server).
   - Custom `t(key)` shim reading a JSON dict — minimal but throws away
     the formatter / pluralization / nested-key story we'll likely want
     by M5.
2. **URL routing strategy.** next-intl supports two shapes:
   - **Locale-segment** routes (`/zh-TW/...`, `/en/...`) with middleware
     redirects. Standard but adds URL noise.
   - **Single-locale, no prefix** — only `/`, `/search`, `/items/[id]`
     exist. Locale is set internally; switching locales requires either
     a language switcher in UI (not in scope) or running multiple
     deployments.
3. **Default locale.** Brief is in zh-TW; English is a stub for showcase.

## Decision

**`next-intl` v4.x, single-locale (no URL prefix), default `zh-TW`.**

- `frontend/src/i18n/request.ts` exports `getRequestConfig` returning
  `{ locale: 'zh-TW', messages: <imported zh-TW.json> }`.
- `frontend/next.config.ts` wraps with `createNextIntlPlugin('./src/i18n/request.ts')`.
- `frontend/src/messages/zh-TW.json` — production dictionary.
- `frontend/src/messages/en.json` — stub bundle (same keys, English text)
  so the keying machinery is exercised but no `/en/...` route exists.
- Server components use `getTranslations()` from `next-intl/server`.
- Client components use `useTranslations()` from `next-intl` after being
  wrapped by `<NextIntlClientProvider locale messages>` once in the root
  layout.

## Consequences

**Easier:**
- App Router server components get translations natively without "use
  client" boundaries.
- URL stays clean (`/`, `/search`, `/items/[id]`) — no `/zh-TW` prefix
  noise.
- Adding a real `en` locale later is a routing change (introduce
  `[locale]` segment + middleware), not a rewrite — all the keying is
  already in place.

**Harder:**
- Locale switcher requires either real URL prefix (which we'd have to
  retrofit) OR a Next.js cookie-based override (next-intl supports both).
  Out of scope for the brief; flagged for future work.
- Build-time messages import means changing a translation requires
  rebuild. Acceptable for static dictionaries; if we ever need
  user-editable translations, the messages source moves to a server
  fetch.
- Slightly more cognitive overhead than a `t(key)` shim — `getTranslations`
  is async, must be `await`-ed on the server. Worth the cost.

## Revisit

If the product gets a real locale switcher (en + zh-TW + others), shift to:

1. Locale-segment routes (`[locale]` parameter).
2. Middleware that redirects `/` → user's preferred locale based on
   `Accept-Language` header.
3. Swap stub `en.json` for a real translation pass.

The existing `getRequestConfig` is the file that grows; the current keying
machinery transfers as-is.
