import createClient from 'openapi-fetch';
import type { paths } from './api-types';

// Single typed fetch client. Path/query/response shapes come from
// `api-types.ts`, which is regenerated from the backend's `/docs/json`
// via `make types`. As long as that target ran after the last BE schema
// change, every call site is type-checked end-to-end.
//
// `NEXT_PUBLIC_API_BASE_URL` lets us point at a hosted backend in
// production (Railway URL) without code change. Falls back to the local
// BE dev port for `make dev-all`.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export const api = createClient<paths>({
  baseUrl: API_BASE_URL,
});

// Re-export the most-used response shapes so consumers don't have to
// dive into the generated types tree. Add more here as routes get used.
export type Item =
  paths['/items']['get']['responses']['200']['content']['application/json']['items'][number];

export type ItemListResponse =
  paths['/items']['get']['responses']['200']['content']['application/json'];

export type SubCategory =
  paths['/sub-categories']['get']['responses']['200']['content']['application/json'][number];

// Single-item shape from `GET /items/:id`. Identical to a row in
// `ItemListResponse.items` plus `createdAt` etc., but expressed against
// the detail endpoint so a future schema drift on the detail-only fields
// would surface here.
export type ItemDetail =
  paths['/items/{id}']['get']['responses']['200']['content']['application/json'];

// Category enum is used directly by Tab + SubCategoryDropdown components.
export type Category = NonNullable<
  paths['/items']['get']['parameters']['query']
>['category'];
