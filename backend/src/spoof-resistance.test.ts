import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { _resetEnvCacheForTesting } from './lib/env.js';
import { buildServer } from './app.js';

// Locks in the spoof-resistance regression Codex caught in RR-003. Rate
// limit is ENABLED in this suite (no `disableRateLimit`); we drive
// `RATE_LIMIT_MAX` and `TRUST_PROXY` via env to exercise both the safe
// default and the explicitly-trusted-proxy mode.
//
// Each top-level `describe` boots its own server instance so env changes
// take effect cleanly. We don't share state between blocks.

async function bootWithEnv(overrides: Record<string, string | undefined>): Promise<FastifyInstance> {
  const prevValues: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(overrides)) {
    prevValues[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetEnvCacheForTesting();
  // Restore env after build; the server captures the parsed values.
  const app = await buildServer({ logger: false });
  for (const [k, v] of Object.entries(prevValues)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetEnvCacheForTesting();
  await app.ready();
  return app;
}

describe('spoof-resistance: TRUST_PROXY=false (default)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootWithEnv({
      TRUST_PROXY: undefined,
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_WINDOW: '1 minute',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('three different X-Forwarded-For values share one bucket (3rd request 429)', async () => {
    const statuses: number[] = [];
    for (const xff of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) {
      const res = await app.inject({
        method: 'GET',
        url: '/sub-categories?category=ORG',
        headers: { 'x-forwarded-for': xff },
        remoteAddress: '127.0.0.1',
      });
      statuses.push(res.statusCode);
    }
    expect(statuses).toEqual([200, 200, 429]);
  });
});

// IMPORTANT: this block deliberately demonstrates a known-insecure
// configuration. We assert that with `TRUST_PROXY=true` AND no upstream
// proxy actually stripping forwarded headers, a client can spoof its
// "IP" and get its own rate-limit bucket. This is the historical bug
// RR-003 fixed by making `TRUST_PROXY` default to `false`. Keeping the
// test locks in the regression: if anyone changes the default back, the
// **other** suite ('TRUST_PROXY=false (default)') will start failing.
// We are NOT recommending production use this config — see docs/SCALING.md
// for the deployment matrix and the topology-aware values to set.
describe('spoof-resistance: TRUST_PROXY=true (the historical bug — DO NOT use in production)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootWithEnv({
      TRUST_PROXY: 'true',
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_WINDOW: '1 minute',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('three different X-Forwarded-For values get three buckets (all 200) — demonstrates the bypass we fixed', async () => {
    const statuses: number[] = [];
    for (const xff of ['4.4.4.4', '5.5.5.5', '6.6.6.6']) {
      const res = await app.inject({
        method: 'GET',
        url: '/sub-categories?category=ORG',
        headers: { 'x-forwarded-for': xff },
      });
      statuses.push(res.statusCode);
    }
    expect(statuses).toEqual([200, 200, 200]);
  });
});

describe('rate-limit allowList', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await bootWithEnv({
      TRUST_PROXY: undefined,
      RATE_LIMIT_MAX: '2',
      RATE_LIMIT_WINDOW: '1 minute',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not rate-limit /health even when burst exceeds the limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/health' });
      statuses.push(res.statusCode);
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('does not rate-limit /docs/json (Swagger UI is reviewer-facing)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/docs/json' });
      statuses.push(res.statusCode);
    }
    expect(statuses.every((s) => s === 200)).toBe(true);
  });
});
