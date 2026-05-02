import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const HealthResponse = z.object({
  ok: z.boolean(),
  dbConnected: z.boolean(),
});

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/health', {
    schema: {
      tags: ['health'],
      summary: 'Liveness + DB connectivity probe',
      description:
        'Validates connectivity by counting items via Prisma (Hard Rule 3 — no raw SQL). Excluded from rate limiting. Probes intentionally do not set `Cache-Control` so dependents always see fresh state.',
      response: { 200: HealthResponse },
    },
  }, async () => {
    let dbConnected = false;
    try {
      // Hard Rule 3: ORM-only DB access. count() validates both connectivity
      // and that the migrated schema exists; no raw SQL templating.
      await prisma.item.count();
      dbConnected = true;
    } catch {
      dbConnected = false;
    }
    return { ok: true, dbConnected };
  });
}
