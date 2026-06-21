// ABOUT: Regression tests for the Worker extraction fetch + business-type logic
// ABOUT: Covers the direct-fetch-first fallback chain and the soft-warning decision

import { describe, it, expect, vi, afterEach } from 'vitest';
// @ts-expect-error — worker.js is plain JS with no type declarations
import { fetchPageWithProxy, businessTypeWarningFor } from '@/worker';

const TARGET = 'https://example-restaurant.com';
const GOOD_HTML = '<html><body>' + 'x'.repeat(600) + '</body></html>'; // > 500 chars

// Build a fake Response with just the bits fetchPageWithProxy reads.
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

const isCodetabs = (u: string) => u.includes('codetabs');
const isAllorigins = (u: string) => u.includes('allorigins');
const isProxy = (u: string) => isCodetabs(u) || isAllorigins(u);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('fetchPageWithProxy — direct-fetch-first fallback chain', () => {
  it('returns direct-fetch content and never touches a proxy on the happy path', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(isProxy(url) ? res({ text: 'PROXY' }) : res({ text: GOOD_HTML }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const content = await fetchPageWithProxy(TARGET);

    expect(content).toBe(GOOD_HTML);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(TARGET); // direct, not a proxy
  });

  it('falls back to a proxy when the direct fetch returns thin content', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(isProxy(url) ? res({ text: 'PROXY_CONTENT' }) : res({ text: 'tiny' }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const content = await fetchPageWithProxy(TARGET);

    expect(content).toBe('PROXY_CONTENT');
    expect(fetchMock.mock.calls.some(c => isProxy(c[0] as string))).toBe(true);
  });

  it('falls back to a proxy when the direct fetch returns a non-2xx status', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(isProxy(url) ? res({ text: 'PROXY_CONTENT' }) : res({ ok: false, status: 403, text: '' }))
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchPageWithProxy(TARGET)).toBe('PROXY_CONTENT');
  });

  it('falls back to a proxy when the direct fetch throws (timeout/network)', async () => {
    const fetchMock = vi.fn((url: string) =>
      isProxy(url) ? Promise.resolve(res({ text: 'PROXY_CONTENT' })) : Promise.reject(new Error('timed out'))
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchPageWithProxy(TARGET)).toBe('PROXY_CONTENT');
  });

  it('parses allorigins JSON shape and uses it when codetabs fails', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (isAllorigins(url)) return Promise.resolve(res({ json: { contents: 'ALLORIGINS_HTML' } }));
      if (isCodetabs(url)) return Promise.resolve(res({ ok: false, status: 400, text: '' }));
      return Promise.reject(new Error('direct blocked')); // direct fetch fails
    });
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchPageWithProxy(TARGET)).toBe('ALLORIGINS_HTML');
  });

  it('returns null when direct fetch and all proxies fail', async () => {
    const fetchMock = vi.fn((url: string) =>
      isProxy(url) ? Promise.resolve(res({ ok: false, status: 500, text: '' })) : Promise.reject(new Error('blocked'))
    );
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchPageWithProxy(TARGET)).toBeNull();
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
