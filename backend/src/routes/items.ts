import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { Category, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { decodeCursor, encodeCursor } from '../lib/cursor.js';
import { SUB_CATEGORIES } from '../lib/sub-categories.js';
import {
  ItemListResponseSchema,
  ItemSchema,
  ErrorResponseSchema,
} from '../lib/schemas.js';

const ListQuery = z.object({
  category: z.enum(Category).describe('Tab category — required'),
  subCategory: z.string().min(1).optional().describe('Sub-category filter (must be valid for the chosen category)'),
  q: z.string().min(1).optional().describe('Case-insensitive substring match on title and description'),
  cursor: z.string().min(1).optional().describe('Opaque cursor returned by a previous list response'),
  limit: z.coerce.number().int().min(1).max(100).default(20).describe('Page size (default 20, max 100)'),
});

const DetailParams = z.object({
  id: z.string().min(1),
});

export async function itemRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/items', {
    schema: {
      tags: ['items'],
      summary: 'List items with cursor pagination, filters, and search',
      description:
        'Returns `{ items, nextCursor }`. Sets `Cache-Control: public, max-age=30, s-maxage=60` on 200 responses. Every response carries an `x-request-id` header for log correlation.',
      querystring: ListQuery,
      response: {
        200: ItemListResponseSchema,
        400: ErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { category, subCategory, q, cursor, limit } = request.query;

    if (subCategory && !SUB_CATEGORIES[category].includes(subCategory)) {
      return reply.status(400).send({
        error: 'invalid_sub_category',
        message: `subCategory '${subCategory}' is not valid for category '${category}'`,
      });
    }

    const where: Prisma.ItemWhereInput = { category };
    if (subCategory) where.subCategory = subCategory;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        return reply.status(400).send({ error: 'invalid_cursor' });
      }
      const cursorClause: Prisma.ItemWhereInput = {
        OR: [
          { createdAt: { lt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { lt: decoded.id } },
        ],
      };
      where.AND = where.AND
        ? [...(Array.isArray(where.AND) ? where.AND : [where.AND]), cursorClause]
        : [cursorClause];
    }

    const rows = await prisma.item.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

    // List results are dynamic but tolerate a short TTL — same query from many
    // clients in the same minute can be served from CDN/edge cache.
    reply.header('Cache-Control', 'public, max-age=30, s-maxage=60');

    return {
      items: items.map((it) => ({
        ...it,
        createdAt: it.createdAt.toISOString(),
        deadline: it.deadline ? it.deadline.toISOString() : null,
      })),
      nextCursor,
    };
  });

  r.get('/items/:id', {
    schema: {
      tags: ['items'],
      summary: 'Get a single item by id',
      description:
        'Returns the full item or 404. Sets `Cache-Control: public, max-age=60, s-maxage=300` on 200 responses. Every response carries an `x-request-id` header for log correlation.',
      params: DetailParams,
      response: {
        200: ItemSchema,
        404: ErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return reply.status(404).send({ error: 'not_found' });
    }
    // Detail records are stable per-id; cache longer.
    reply.header('Cache-Control', 'public, max-age=60, s-maxage=300');
    return {
      ...item,
      createdAt: item.createdAt.toISOString(),
      deadline: item.deadline ? item.deadline.toISOString() : null,
    };
  });
}
