import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { healthRoutes } from './routes/health.js';
import { itemRoutes } from './routes/items.js';
import { subCategoryRoutes } from './routes/sub-categories.js';
import { loadEnv } from './lib/env.js';

// Hard cap on incoming X-Request-Id length. Without this a client can send
// arbitrarily long ids that end up in every log line for the request.
const REQUEST_ID_MAX_LEN = 128;
const REQUEST_ID_RE = /^[A-Za-z0-9_.\-:]{1,128}$/;

export interface BuildServerOptions {
  logger?: boolean | { level?: string };
  /** Disable rate limiting (e.g. inside route tests). */
  disableRateLimit?: boolean;
}

export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  // Read env on each build so tests that mutate process.env between
  // `buildServer()` calls (after `_resetEnvCacheForTesting()`) get the
  // fresh values. The cache inside `loadEnv` still amortizes within a
  // single process boot.
  const env = loadEnv();

  const app = Fastify({
    logger: opts.logger ?? { level: env.LOG_LEVEL },
    // SECURITY: trust forwarded headers ONLY when explicitly opted in via
    // TRUST_PROXY. Default `false` means `req.ip` reflects the socket peer,
    // which a direct client cannot spoof. In production behind Railway /
    // Vercel / Cloudflare set `TRUST_PROXY` to either an integer hop count
    // or a CIDR list matching the upstream LB. See docs/SCALING.md.
    trustProxy: env.TRUST_PROXY,
    // Generate a stable id per request. Reuse incoming X-Request-Id ONLY if
    // it matches a sane shape — otherwise mint a fresh UUID. Prevents log
    // poisoning via arbitrary client-supplied strings.
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && REQUEST_ID_RE.test(incoming)) {
        return incoming;
      }
      return crypto.randomUUID();
    },
  }).withTypeProvider<ZodTypeProvider>();

  // Wire zod into Fastify's validator + serializer pipeline so route schemas
  // can be plain zod schemas. fastify-type-provider-zod hands jsonSchemaTransform
  // to @fastify/swagger so the OpenAPI spec is generated from the same source.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Surface request id on every response for log/error correlation.
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  await app.register(cors, { origin: env.CORS_ORIGIN });

  // gzip + brotli for JSON-with-Chinese payloads — typically 3-5x reduction.
  // Threshold avoids the overhead on tiny responses (e.g. /health).
  await app.register(compress, {
    global: true,
    threshold: 1024,
    encodings: ['br', 'gzip'],
  });

  // Per-IP rate limit. With TRUST_PROXY off (default), `req.ip` is the socket
  // peer and unspoofable; with TRUST_PROXY on, the deployer is responsible
  // for ensuring only their LB sits in front. See docs/SCALING.md.
  if (!opts.disableRateLimit) {
    await app.register(rateLimit, {
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      // Don't rate-limit the docs surface — reviewers will hit it interactively.
      allowList: (request) => request.url.startsWith('/docs') || request.url === '/health',
    });
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Jopay Donation API',
        description:
          'Backend for the JKOPAY charity-donation listing assignment. Items endpoints support cursor pagination, category and sub-category filters, and case-insensitive search. Every response carries `x-request-id` for log correlation; read endpoints set `Cache-Control` (see route descriptions).',
        version: '0.1.0',
      },
      servers: [{ url: env.PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}` }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  await app.register(healthRoutes);
  await app.register(itemRoutes);
  await app.register(subCategoryRoutes);

  return app;
}

export { REQUEST_ID_MAX_LEN, REQUEST_ID_RE };
