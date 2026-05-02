# ADR-0006 — Cursor-based pagination over offset

**Date**: 2026-05-02
**Status**: Proposed

## Context

<!-- Filled during M2. Capture: why cursor wins for infinite scroll
     (no jitter when items are inserted/deleted; O(1) lookup with a
     well-chosen cursor key); offset's failure modes for this UI. -->

## Decision

<!-- Cursor-based. Cursor = base64-encoded `(createdAt, id)` tuple. -->

## Consequences

<!-- Stable infinite scroll under writes. Slightly more complex
     server logic; can't jump to "page 47". -->
