# ADR-0005 — Database: Postgres via docker-compose locally, Neon for managed

**Date**: 2026-05-02
**Status**: Proposed

## Context

<!-- Filled during M1. Capture: why Postgres over SQLite (more "real",
     case-insensitive search via ILIKE/citext, indexes that matter at scale);
     why docker-compose for local (zero-install for reviewer); Neon for the
     managed demo DB (free tier, serverless, plays well with Railway/Vercel). -->

## Decision

<!-- Local: Postgres via docker-compose. Demo: Neon. -->

## Consequences

<!-- One Prisma schema, two environments. Reviewer needs Docker installed
     to run locally. Migration commands must run against both. -->
