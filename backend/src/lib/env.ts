// Centralized env parsing with fail-fast validation. Anything that reads
// process.env outside this module risks NaN/undefined surfacing later as
// a runtime mystery; route everything through here.

import { isIP } from 'node:net';
import { z } from 'zod';

// Fastify (via `proxy-addr`) accepts these named ranges in addition to
// IPs and CIDRs. Validating up-front turns deep stack traces from the
// proxy parser into a structured "invalid environment" error.
const NAMED_PROXY_RANGES = new Set(['loopback', 'linklocal', 'uniquelocal']);

function isValidProxyEntry(entry: string): boolean {
  if (NAMED_PROXY_RANGES.has(entry)) return true;
  // CIDR form? Split off the prefix length and validate both parts.
  const slash = entry.indexOf('/');
  if (slash >= 0) {
    const ip = entry.slice(0, slash);
    const prefix = Number(entry.slice(slash + 1));
    const family = isIP(ip);
    if (family === 0) return false;
    if (!Number.isInteger(prefix) || prefix < 0) return false;
    if (family === 4 && prefix > 32) return false;
    if (family === 6 && prefix > 128) return false;
    return true;
  }
  return isIP(entry) !== 0;
}

const TrustProxySchema = z
  .string()
  .optional()
  .transform((raw, ctx): boolean | number | string[] => {
    if (!raw) return false; // safe default: don't trust forwarded headers
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    const n = Number(raw);
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) return n;
    // Comma-separated CIDR / IP / named-range list
    const entries = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'TRUST_PROXY is empty after splitting on commas' });
      return z.NEVER;
    }
    const invalid = entries.filter((e) => !isValidProxyEntry(e));
    if (invalid.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `TRUST_PROXY entries are not valid IP / CIDR / named-range: ${invalid.join(', ')}. Accepted: 'loopback' | 'linklocal' | 'uniquelocal' | IPv4 | IPv6 | CIDR (e.g. 10.0.0.0/8).`,
      });
      return z.NEVER;
    }
    return entries;
  });

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PUBLIC_BASE_URL: z.string().optional(),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  // Accept the @fastify/rate-limit string form ("1 minute", "10s") OR a number of ms.
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
  TRUST_PROXY: TrustProxySchema,
  LOG_LEVEL: z.string().default('info'),
  NODE_ENV: z.string().default('development'),
});

let cached: z.infer<typeof EnvSchema> | null = null;

export function loadEnv(): z.infer<typeof EnvSchema> {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Fail loud and explicit before Fastify has a chance to start.
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

// Reset cache for tests that mutate process.env between cases.
export function _resetEnvCacheForTesting(): void {
  cached = null;
}
