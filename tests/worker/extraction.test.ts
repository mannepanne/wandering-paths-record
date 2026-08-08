// ABOUT: Regression tests for the Worker extraction fetch + business-type logic
// ABOUT: Covers the direct-fetch-first fallback chain and the soft-warning decision

import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error — worker.js is plain JS with no type declarations
import { fetchPageContent, classifyHttpStatus, fetchErrorResponse, businessTypeWarningFor } from '@/worker';

const TARGET = 'https://example-restaurant.com';
const GOOD_HTML = '<html><body>' + 'x'.repeat(600) + '</body></html>'; // > 500 chars

// Build a fake Response with just the bits fetchPageContent reads.
function res({ ok = true, status = 200, text = '', json = undefined }: {
  ok?: boolean; status?: number; text?: string; json?: unknown;
}) {
  return {
    ok,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(json),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('fetchPageContent — direct server-side fetch', () => {
  it('returns the page content on the happy path with a single direct fetch', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(res({ text: GOOD_HTML })));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchPageContent(TARGET);

    expect(result).toEqual({ content: GOOD_HTML });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(TARGET);
  });

  it('reports "blocked" when the direct fetch returns thin content (bot-challenge page)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ text: 'tiny' }))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'blocked' });
  });

  it('reports "blocked" when the direct fetch returns 403 (access refused)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ ok: false, status: 403, text: '' }))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'blocked' });
  });

  it('reports "not-found" when the direct fetch returns 404 (a wrong URL, not bot protection)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ ok: false, status: 404, text: '' }))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'not-found' });
  });

  it('reports "unreachable" when the site returns a 5xx (broken/overloaded origin)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ ok: false, status: 503, text: '' }))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'unreachable' });
  });

  it('reports "unreachable" when the direct fetch throws (timeout/network)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('timed out'))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'unreachable' });
  });
});

describe('classifyHttpStatus — status → failure reason', () => {
  it('treats 404 and 410 as not-found (a wrong URL, never "bot protection")', () => {
    expect(classifyHttpStatus(404)).toBe('not-found');
    expect(classifyHttpStatus(410)).toBe('not-found');
  });

  it('treats 401 and 403 as blocked (access refused)', () => {
    expect(classifyHttpStatus(401)).toBe('blocked');
    expect(classifyHttpStatus(403)).toBe('blocked');
  });

  it('treats 5xx and 429 as unreachable (broken/overloaded, retry)', () => {
    expect(classifyHttpStatus(500)).toBe('unreachable');
    expect(classifyHttpStatus(503)).toBe('unreachable');
    expect(classifyHttpStatus(429)).toBe('unreachable');
  });
});

describe('fetchErrorResponse — reason → HTTP status + user message', () => {
  it('blocked → 422 and names bot protection + manual entry', () => {
    const r = fetchErrorResponse('blocked');
    expect(r.status).toBe(422);
    expect(r.message.toLowerCase()).toContain('bot protection');
    expect(r.message.toLowerCase()).toContain('manual entry');
  });

  it('not-found → 404 and points at the URL, NOT bot protection', () => {
    const r = fetchErrorResponse('not-found');
    expect(r.status).toBe(404);
    expect(r.message.toLowerCase()).toContain('url');
    expect(r.message.toLowerCase()).not.toContain('bot protection');
  });

  it('unreachable → 502 and suggests the site may be down', () => {
    const r = fetchErrorResponse('unreachable');
    expect(r.status).toBe(502);
    expect(r.message.toLowerCase()).toContain('down');
  });

  it('defaults an unknown reason to the unreachable response', () => {
    expect(fetchErrorResponse('something-else').status).toBe(502);
  });
});

describe('businessTypeWarningFor — soft-warning decision', () => {
  it('returns null for every food business type (no warning, no block)', () => {
    for (const t of ['restaurant', 'cafe', 'bakery', 'bar', 'pub']) {
      expect(businessTypeWarningFor(t)).toBeNull();
    }
  });

  it('returns an advisory naming the detected type for non-food venues', () => {
    for (const t of ['hotel', 'retail', 'gallery', 'other']) {
      const warning = businessTypeWarningFor(t);
      expect(warning).not.toBeNull();
      expect(warning.detectedType).toBe(t);
      expect(warning.message).toContain(t);
      expect(warning.message.toLowerCase()).toContain('double-check');
    }
  });
});
