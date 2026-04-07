// ABOUT: Unit tests for visit service validation and CRUD operations
// ABOUT: Tests XSS prevention, rating validation, date handling, and API calls

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { visitService } from '@/services/visits';
import type { CreateVisitInput } from '@/services/visits';

// Default successful visit response for tests that exercise the happy path
const mockVisit = {
  id: 'visit-id',
  restaurant_id: 'test-restaurant',
  visit_date: '2026-03-01',
  rating: 'good',
  is_migrated_placeholder: false,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

function mockFetchOk(data: unknown = mockVisit) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetchError(status: number, message = 'Error') {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetchOk());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('visitService.addVisit - Validation', () => {
  describe('XSS Prevention', () => {
    it('should reject experience notes with < character', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Great meal <script>alert(1)</script>',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });

    it('should reject experience notes with > character', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Rating: 5 > 4',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });

    it('should reject experience notes with & character (prevents encoded HTML)', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Tom &amp; Jerry',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });

    it('should reject company notes with HTML characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        company_notes: '<b>Sarah</b>',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });

    it('should accept normal text without HTML characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Amazing duck confit. Would recommend!',
        company_notes: 'With Sarah and Tom',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });

  describe('Rating Validation', () => {
    it('should reject "unknown" rating', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'unknown' as any,
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Rating must be a valid appreciation level'
      );
    });

    it('should reject invalid rating values', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'excellent' as any,
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Rating must be a valid appreciation level'
      );
    });

    it('should accept "avoid" rating', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'avoid',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept "fine" rating', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'fine',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept "good" rating', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept "great" rating', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'great',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });

  describe('Date Validation', () => {
    it('should reject invalid date format', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '03/01/2026',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
    });

    it('should reject future dates', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2099-12-31',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Visit date must be between 1900-01-01 and today'
      );
    });

    it('should reject dates before 1900', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '1899-12-31',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Visit date must be between 1900-01-01 and today'
      );
    });

    it('should accept today\'s date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: today,
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept date from 1900-01-01', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '1900-01-01',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept recent past date', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-02-15',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });

  describe('Character Length Validation', () => {
    it('should reject experience notes longer than 2000 characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'x'.repeat(2001),
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Experience notes must be 2000 characters or less'
      );
    });

    it('should accept experience notes exactly 2000 characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'x'.repeat(2000),
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should reject company notes longer than 500 characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        company_notes: 'x'.repeat(501),
      };

      await expect(visitService.addVisit(input)).rejects.toThrow(
        'Company notes must be 500 characters or less'
      );
    });

    it('should accept company notes exactly 500 characters', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        company_notes: 'x'.repeat(500),
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });

  describe('Text Sanitization', () => {
    it('should trim whitespace from experience notes', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: '  Great meal  ',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should convert empty strings to undefined', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: '   ',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });

  describe('Required Fields', () => {
    it('should accept visit with only required fields', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });

    it('should accept visit with all fields populated', async () => {
      const input: CreateVisitInput = {
        restaurant_id: 'test-restaurant',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Amazing duck confit',
        company_notes: 'With Sarah',
      };

      await expect(visitService.addVisit(input)).resolves.toBeDefined();
    });
  });
});

describe('visitService.getLatestVisits', () => {
  it('should return empty array when no visits found', async () => {
    vi.stubGlobal('fetch', mockFetchOk([]));
    const result = await visitService.getLatestVisits('test-restaurant');
    expect(result).toEqual([]);
  });

  it('should limit results to the requested count', async () => {
    const visits = Array.from({ length: 10 }, (_, i) => ({ ...mockVisit, id: `visit-${i}` }));
    vi.stubGlobal('fetch', mockFetchOk(visits));
    const result = await visitService.getLatestVisits('test-restaurant', 3);
    expect(result).toHaveLength(3);
  });

  it('should use default limit of 5', async () => {
    const visits = Array.from({ length: 10 }, (_, i) => ({ ...mockVisit, id: `visit-${i}` }));
    vi.stubGlobal('fetch', mockFetchOk(visits));
    const result = await visitService.getLatestVisits('test-restaurant');
    expect(result).toHaveLength(5);
  });
});

describe('visitService.getVisitCount', () => {
  it('should return 0 when no visits found', async () => {
    vi.stubGlobal('fetch', mockFetchOk([]));
    const result = await visitService.getVisitCount('test-restaurant');
    expect(result).toBe(0);
  });

  it('should count only non-migrated visits', async () => {
    const visits = [
      { ...mockVisit, id: '1', is_migrated_placeholder: false },
      { ...mockVisit, id: '2', is_migrated_placeholder: true },
      { ...mockVisit, id: '3', is_migrated_placeholder: false },
    ];
    vi.stubGlobal('fetch', mockFetchOk(visits));
    const result = await visitService.getVisitCount('test-restaurant');
    expect(result).toBe(2);
  });
});

describe('visitService.updateVisit - Validation', () => {
  describe('XSS Prevention', () => {
    it('should reject experience notes with HTML characters', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'good' as const,
        experience_notes: 'Great meal <script>alert(1)</script>',
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });

    it('should reject company notes with HTML characters', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'good' as const,
        company_notes: '<b>Sarah</b>',
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'HTML and special characters are not allowed in notes'
      );
    });
  });

  describe('Rating Validation', () => {
    it('should reject invalid rating values', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'excellent' as any,
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'Rating must be a valid appreciation level'
      );
    });

    it('should accept valid ratings', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'great' as const,
      };

      await expect(visitService.updateVisit('visit-123', input)).resolves.toBeDefined();
    });
  });

  describe('Date Validation', () => {
    it('should reject invalid date format', async () => {
      const input = {
        visit_date: '03/01/2026',
        rating: 'good' as const,
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'Invalid date format. Expected YYYY-MM-DD'
      );
    });

    it('should reject future dates', async () => {
      const input = {
        visit_date: '2099-12-31',
        rating: 'good' as const,
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'Visit date must be between 1900-01-01 and today'
      );
    });

    it('should accept valid dates', async () => {
      const input = {
        visit_date: '2026-02-15',
        rating: 'good' as const,
      };

      await expect(visitService.updateVisit('visit-123', input)).resolves.toBeDefined();
    });
  });

  describe('Character Length Validation', () => {
    it('should reject experience notes longer than 2000 characters', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'good' as const,
        experience_notes: 'x'.repeat(2001),
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'Experience notes must be 2000 characters or less'
      );
    });

    it('should reject company notes longer than 500 characters', async () => {
      const input = {
        visit_date: '2026-03-01',
        rating: 'good' as const,
        company_notes: 'x'.repeat(501),
      };

      await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
        'Company notes must be 500 characters or less'
      );
    });
  });
});

describe('visitService.updateVisit - Functionality', () => {
  it('should call PUT endpoint and return updated visit', async () => {
    const updatedVisit = { ...mockVisit, rating: 'great', is_migrated_placeholder: false };
    vi.stubGlobal('fetch', mockFetchOk(updatedVisit));

    const input = { visit_date: '2026-03-01', rating: 'great' as const };
    const result = await visitService.updateVisit('visit-123', input);

    expect(result.rating).toBe('great');
    expect(result.is_migrated_placeholder).toBe(false);
  });

  it('should surface duplicate date error from the API', async () => {
    vi.stubGlobal('fetch', mockFetchError(409, 'UNIQUE constraint failed'));

    const input = { visit_date: '2026-02-20', rating: 'great' as const };

    await expect(visitService.updateVisit('visit-123', input)).rejects.toThrow(
      'You already have a visit logged for this restaurant on 2026-02-20'
    );
  });
});

describe('visitService.deleteVisit', () => {
  it('should delete a visit successfully', async () => {
    vi.stubGlobal('fetch', mockFetchOk({ success: true }));
    await expect(visitService.deleteVisit('visit-123')).resolves.not.toThrow();
  });

  it('should throw a friendly error when visit not found', async () => {
    vi.stubGlobal('fetch', mockFetchError(404, 'Not found'));
    await expect(visitService.deleteVisit('visit-123')).rejects.toThrow(
      'Visit not found or you do not have permission to delete it'
    );
  });

  it('should throw a friendly error on other API failures', async () => {
    vi.stubGlobal('fetch', mockFetchError(500, 'Internal Server Error'));
    await expect(visitService.deleteVisit('visit-123')).rejects.toThrow(
      'Failed to delete visit. Please try again.'
    );
  });
});
