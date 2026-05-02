import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Category } from '@prisma/client';
import { z } from 'zod';
import { SUB_CATEGORIES } from '../lib/sub-categories.js';
import {
  SubCategoryResponseSchema,
  ErrorResponseSchema,
} from '../lib/schemas.js';

const Query = z.object({
  category: z.enum(Category).describe('Category whose sub-categories to list'),
});

export async function subCategoryRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/sub-categories', {
    schema: {
      tags: ['items'],
      summary: 'List sub-categories for a given category (drives the 全部 dropdown)',
      description:
        'Sub-categories are derived from a static TS constant — they don\'t change between deploys. Sets aggressive `Cache-Control: public, max-age=300, s-maxage=3600`. Every response carries an `x-request-id` header for log correlation.',
      querystring: Query,
      response: {
        200: SubCategoryResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    // Sub-categories are derived from a static TS constant — they don't
    // change between deploys. Cache aggressively at the client and any
    // intermediate CDN/proxy.
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=3600');
    const values = SUB_CATEGORIES[request.query.category];
    return values.map((value) => ({ value, label: value }));
  });
}
