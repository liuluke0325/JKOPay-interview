import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor } from './cursor.js';

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a cursor', () => {
    const c = { createdAt: new Date('2026-05-02T14:20:42.629Z'), id: 'cmoofiqdj000arc98tmmqaiff' };
    const decoded = decodeCursor(encodeCursor(c));
    expect(decoded).not.toBeNull();
    expect(decoded!.id).toBe(c.id);
    expect(decoded!.createdAt.toISOString()).toBe(c.createdAt.toISOString());
  });

  it('produces a base64url string with no padding or url-unsafe chars', () => {
    const encoded = encodeCursor({ createdAt: new Date(), id: 'abc' });
    // base64url alphabet: A-Z, a-z, 0-9, -, _ ; never +, /, or =
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns null on garbage input', () => {
    expect(decodeCursor('!!!not base64!!!')).toBeNull();
  });

  it('returns null on valid base64 of non-JSON', () => {
    const notJson = Buffer.from('hello world', 'utf8').toString('base64url');
    expect(decodeCursor(notJson)).toBeNull();
  });

  it('returns null on JSON missing required fields', () => {
    const missingId = Buffer.from(JSON.stringify({ c: '2026-05-02T00:00:00.000Z' }), 'utf8').toString('base64url');
    expect(decodeCursor(missingId)).toBeNull();

    const missingCreatedAt = Buffer.from(JSON.stringify({ i: 'abc' }), 'utf8').toString('base64url');
    expect(decodeCursor(missingCreatedAt)).toBeNull();
  });

  it('returns null when createdAt is not a parseable date', () => {
    const badDate = Buffer.from(JSON.stringify({ c: 'not-a-date', i: 'abc' }), 'utf8').toString('base64url');
    expect(decodeCursor(badDate)).toBeNull();
  });

  it('returns null when fields are wrong types', () => {
    const wrongTypes = Buffer.from(JSON.stringify({ c: 123, i: 456 }), 'utf8').toString('base64url');
    expect(decodeCursor(wrongTypes)).toBeNull();
  });

  it('decodes ties at millisecond resolution correctly', () => {
    // The seed inserts many rows in tight succession; ties at ms resolution
    // are common. Ensure the cursor preserves both fields exactly.
    const t = new Date('2026-05-02T14:20:42.629Z');
    const c1 = { createdAt: t, id: 'aaa' };
    const c2 = { createdAt: t, id: 'aab' };
    const d1 = decodeCursor(encodeCursor(c1));
    const d2 = decodeCursor(encodeCursor(c2));
    expect(d1!.createdAt.getTime()).toBe(d2!.createdAt.getTime());
    expect(d1!.id).not.toBe(d2!.id);
  });
});
