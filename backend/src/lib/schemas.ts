import { z } from 'zod';
import { Category } from '@prisma/client';

// Wire-format Item: dates are ISO strings (Prisma's Date instances JSON-serialize
// to ISO automatically). Using string here rather than z.date() so the OpenAPI
// spec accurately describes what clients see.
export const ItemSchema = z.object({
  id: z.string(),
  category: z.enum(Category),
  subCategory: z.string(),
  title: z.string(),
  description: z.string(),
  logoUrl: z.string(),
  createdAt: z.iso.datetime(),
  amountRaised: z.number().int().nullable(),
  amountGoal: z.number().int().nullable(),
  deadline: z.iso.datetime().nullable(),
  price: z.number().int().nullable(),
  stock: z.number().int().nullable(),
});
export type Item = z.infer<typeof ItemSchema>;

export const ItemListResponseSchema = z.object({
  items: z.array(ItemSchema),
  nextCursor: z.string().nullable(),
});

export const SubCategoryResponseSchema = z.array(
  z.object({ value: z.string(), label: z.string() }),
);

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.unknown().optional(),
});
