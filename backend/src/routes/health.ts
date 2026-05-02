import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
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
