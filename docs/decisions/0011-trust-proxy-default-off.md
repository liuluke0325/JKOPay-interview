# ADR-0011 — `TRUST_PROXY` defaults off; production opts in explicitly

**Date**: 2026-05-03
**Status**: Accepted

## Context

The rate limiter (Hard Rule 11; ADR-0012-adjacent) buckets requests by
`req.ip`. Fastify's `req.ip` value depends on the `trustProxy` server
option:

- `trustProxy: false` (Fastify default) — `req.ip` is the socket peer.
- `trustProxy: true` — `req.ip` is the leftmost value of `X-Forwarded-For`.
- `trustProxy: <number>` — `req.ip` is `X-F-F[-N-1]`, trusting N upstream hops.
- `trustProxy: string[]` — only trust forwarded headers from listed CIDRs/IPs.

The first cut of M2 hardening (RR-003) shipped `trustProxy: true` to surface
"real client IP" when running behind a load balancer. **Codex caught a
real bypass:** with `trustProxy: true` and **no upstream proxy actually
stripping forwarded headers**, any direct client can send a different
`X-Forwarded-For: <random>` per request and get its own rate-limit bucket.
The DoS protection becomes security theater.

This is an unusually consequential default because:

1. The wrong setting is silent — there's no error or log to alert anyone.
2. The right setting depends on **deployment topology**, which the code
   author doesn't know at compile time.
3. The "convenient" default (`true`) is the unsafe one. The "safe" default
   (`false`) requires production deployers to opt in.

## Decision

**`TRUST_PROXY` is env-driven and defaults to `false`.** `req.ip` reflects
the socket peer in dev and any deployment that doesn't explicitly set the
env. Production deployers behind a known proxy topology must set
`TRUST_PROXY` to a value matching that topology.

Implementation: [`backend/src/lib/env.ts`](../../backend/src/lib/env.ts)
`TrustProxySchema` parses the env var into Fastify's accepted shape:

| `TRUST_PROXY` env value | Parsed shape | When to use |
|---|---|---|
| unset / empty | `false` | Local dev; no upstream proxy |
| `true` | `true` | Last resort — only if no path lets a client bypass the LB |
| `false` | `false` | Explicit "default" |
| Integer `1`, `2`, … | hop count `N` | Trust exactly N upstream hops |
| `10.0.0.0/8,127.0.0.1` | CIDR/IP list | Only trust forwarded headers from these sources |
| `loopback`, `linklocal`, `uniquelocal` | named ranges | What `proxy-addr` accepts |

Bad input (e.g. `not-a-cidr`) fails fast at boot with a structured
"Invalid environment configuration" error before Fastify starts —
not a deep `proxy-addr` parser stack later.

Deployment matrix lives in [`docs/SCALING.md`](../SCALING.md) under
"Rate limiting".

## Consequences

**Easier:**
- Local dev and any "I just deployed it" scenario is spoof-resistant by
  default. Dev who forgets to set `TRUST_PROXY` doesn't accidentally
  ship a wide-open rate limiter.
- The configuration is explicit and auditable: any deployment with
  `TRUST_PROXY` set in its dashboard documents its trust assumption.
- Locked in by tests
  ([`backend/src/spoof-resistance.test.ts`](../../backend/src/spoof-resistance.test.ts)).
  One suite asserts the safe default rejects spoof; another suite
  *deliberately* demonstrates the historical bypass with `TRUST_PROXY=true`
  — if anyone changes the default back to `true`, the safe-default suite
  starts failing.

**Harder:**
- Deployers must remember to set `TRUST_PROXY` correctly. Wrong setting
  = silent failure (rate limit doesn't catch the right entity). Mitigated
  by the deployment matrix in `docs/SCALING.md`.
- One more env var in the operator's mental model; documented in
  `.env.example`.

## Revisit

If we ever add stronger client identity (auth-required APIs, tenant ids)
the rate-limit `keyGenerator` should switch to that identity, not `req.ip`,
which sidesteps the trust-proxy question entirely. Tracked in `docs/SCALING.md`
under "Per-route + auth-tier limits".
