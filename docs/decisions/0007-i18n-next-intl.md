# ADR-0007 — i18n: next-intl with zh-TW default

**Date**: 2026-05-02
**Status**: Proposed

## Context

<!-- Filled during M3. Capture: UI is zh-TW; we want strings in dictionaries
     so a future en bundle is mechanical, not a refactor. next-intl integrates
     cleanly with App Router (server + client message access). Alternative
     considered: react-i18next or a tiny `t(key)` shim. -->

## Decision

<!-- next-intl, zh-TW default, en stub. -->

## Consequences

<!-- Strings live in `messages/zh-TW.json`. Server and client components
     both have access to translations. Slight setup cost for App Router
     (locale segment + middleware). -->

## Revisit

<!-- If next-intl setup eats >60 min on a same-day build, fall back to a
     shim (see RISKS R10) and supersede this ADR. -->
