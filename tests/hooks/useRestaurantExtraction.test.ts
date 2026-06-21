// ABOUT: Unit tests for the restaurant extraction hook
// ABOUT: Focuses on the non-blocking business-type warning surfaced on success

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRestaurantExtraction } from '@/hooks/useRestaurantExtraction';
import { extractRestaurantLocal } from '@/api/extract-restaurant';
import type { RestaurantExtractionResult } from '@/services/claudeExtractor';

vi.mock('@/api/extract-restaurant', () => ({
  extractRestaurantLocal: vi.fn(),
}));

const mockData = {
  name: 'Test Venue',
  addressSummary: 'Shoreditch, London',
  website: 'https://example.com',
  locations: [],
};

function mockResult(overrides: Partial<RestaurantExtractionResult>): RestaurantExtractionResult {
  return { success: true, data: mockData, confidence: 'high', ...overrides };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useRestaurantExtraction', () => {
  it('surfaces a warning message when the API flags a non-food venue', async () => {
    vi.mocked(extractRestaurantLocal).mockResolvedValue(
      mockResult({
        warning: { detectedType: 'retail', message: 'This looks like a retail venue — double-check.' },
      })
    );

    const { result } = renderHook(() => useRestaurantExtraction());

    let returned;
    await act(async () => {
      returned = await result.current.extractFromUrl('https://example.com');
    });

    expect(returned).toEqual(mockData);
    expect(result.current.warning).toBe('This looks like a retail venue — double-check.');
    // Warning is advisory only — extraction still succeeded with data
    expect(result.current.error).toBeUndefined();
    expect(result.current.result).toEqual(mockData);
  });

  it('leaves warning undefined on a clean restaurant extraction', async () => {
    vi.mocked(extractRestaurantLocal).mockResolvedValue(mockResult({ warning: null }));

    const { result } = renderHook(() => useRestaurantExtraction());

    await act(async () => {
      await result.current.extractFromUrl('https://example.com');
    });

    expect(result.current.result).toEqual(mockData);
    expect(result.current.warning).toBeUndefined();
  });

  it('clears any prior warning when a new extraction starts', async () => {
    vi.mocked(extractRestaurantLocal).mockResolvedValue(
      mockResult({ warning: { detectedType: 'bar', message: 'Looks like a bar.' } })
    );

    const { result } = renderHook(() => useRestaurantExtraction());

    await act(async () => {
      await result.current.extractFromUrl('https://example.com');
    });
    expect(result.current.warning).toBe('Looks like a bar.');

    // Second run returns no warning — the stale warning must not linger
    vi.mocked(extractRestaurantLocal).mockResolvedValue(mockResult({ warning: null }));
    await act(async () => {
      await result.current.extractFromUrl('https://example.com');
    });
    expect(result.current.warning).toBeUndefined();
  });
});
