// ABOUT: Regression tests for the Worker extraction fetch + business-type logic
// ABOUT: Covers the direct-fetch-first fallback chain and the soft-warning decision

import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error — worker.js is plain JS with no type declarations
import { fetchPageContent, businessTypeWarningFor } from '@/worker';

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

  it('reports "blocked" when the direct fetch returns a non-2xx status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ ok: false, status: 403, text: '' }))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'blocked' });
  });

  it('reports "unreachable" when the direct fetch throws (timeout/network)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('timed out'))));

    expect(await fetchPageContent(TARGET)).toEqual({ error: 'unreachable' });
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
