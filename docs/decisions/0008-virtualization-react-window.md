# ADR-0008 — List virtualization with react-window

**Date**: 2026-05-02
**Status**: Proposed

## Context

<!-- Filled during M4. Capture: assumption that lists may grow to thousands
     of items (per the user "assume the scaling"); rendering all DOM nodes
     causes mobile jank. react-window is small, well-maintained, and works
     with fixed-height rows (which we enforce via Tailwind line-clamp). -->

## Decision

<!-- react-window, FixedSizeList, fixed card height. -->

## Consequences

<!-- Smooth scroll on long lists. Cost: card height must be fixed
     (tradeoff vs variable-height with react-virtuoso); scroll restoration
     needs to coordinate with the virtualizer's internal scroll state. -->
