# ADR-0009 — Tab + scroll restore on search cancel

**Date**: 2026-05-02
**Status**: Proposed

## Context

<!-- Filled during M5. The user explicitly asked for tab + scroll position
     to survive a default-view → /search → 取消 round-trip. Pure router
     back() doesn't preserve scroll inside a virtualized list, and
     sessionStorage alone doesn't survive a hard refresh. -->

## Decision

<!-- Hybrid:
     - `?tab=` lives in the URL of `/` so it survives refresh and deep links.
     - `scrollY` for the active tab lives in `sessionStorage` keyed by tab.
     - On mount of `/`, read both, apply tab from URL, then scroll to stored Y. -->

## Consequences

<!-- Refresh on `/` keeps the tab; refresh on `/search` clears scroll
     restoration intentionally (a refresh is a fresh search). Coordinating
     with react-window requires waiting one frame after items mount before
     calling scrollTo. -->
