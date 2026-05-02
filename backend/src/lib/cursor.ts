// Opaque cursor for stable infinite-scroll pagination.
//
// Encodes (createdAt, id) so we can OR-clause "items strictly after this point"
// even when many rows share the same createdAt (which our seed produces because
// `createdAt` defaults to `now()` and inserts run within milliseconds).
//
// The pair gives a total order; id breaks the tie. Sort is descending on both
// — newest first, lexicographically-larger id first when timestamps tie.

export type Cursor = { createdAt: Date; id: string };

export function encodeCursor(c: Cursor): string {
  const payload = JSON.stringify({ c: c.createdAt.toISOString(), i: c.id });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): Cursor | null {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { c?: unknown; i?: unknown };
    if (typeof parsed.c !== 'string' || typeof parsed.i !== 'string') return null;
    const createdAt = new Date(parsed.c);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.i };
  } catch {
    return null;
  }
}
