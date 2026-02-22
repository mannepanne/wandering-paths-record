// ABOUT: Unit tests for ReviewEnrichmentService
// ABOUT: Tests Google Places search, review fetching, and Claude AI summarization

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewEnrichmentService } from '@/services/reviewEnrichmentService';
import type { Restaurant } from '@/types/place';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('ReviewEnrichmentService', () => {
  let service: ReviewEnrichmentService;
  const mockClaudeKey = 'test-claude-key';
  const mockGoogleKey = 'test-google-key';

  const mockRestaurant: Restaurant = {
    id: 'test-1',
    name: 'Test Restaurant',
    address: 'Shoreditch, London',
    status: 'to-visit',
    locations: [{
      id: 'loc-1',
      restaurant_id: 'test-1',
      location_name: 'Shoreditch',
      full_address: '7 Boundary St, London',
      city: 'London',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReviewEnrichmentService(mockClaudeKey, mockGoogleKey);
  });

  describe('Google Places Search', () => {
    it('should find restaurant and fetch details successfully', async () => {
      // Mock: Search returns place
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{
            place_id: 'ChIJ123',
            name: 'Test Restaurant',
            formatted_address: 'Shoreditch, London'
          }]
        })
      } as Response);

      // Mock: Details returns rating and reviews
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            place_id: 'ChIJ123',
            name: 'Test Restaurant',
            rating: 4.5,
            user_ratings_total: 150,
            reviews: [{
              author_name: 'John Doe',
              rating: 5,
              text: 'Excellent food!',
              time: Date.now() / 1000,
              relative_time_description: '2 weeks ago'
            }]
          }
        })
      } as Response);

      // Mock: Claude API for summary
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              summary: 'Great restaurant with excellent food',
              popularDishes: ['Pasta', 'Pizza'],
              sentiment: 'positive',
              confidence: 'medium'
            })
          }]
        })
      } as Response);

      const result = await service.enrichRestaurant(mockRestaurant);

      expect(result.success).toBe(true);
      expect(result.data?.rating).toBe(4.5);
      expect(result.data?.ratingCount).toBe(150);
      expect(result.data?.reviewSummary).toContain('Great restaurant');
      expect(result.data?.extractedDishes).toEqual(['Pasta', 'Pizza']);
    });

    it('should handle restaurant not found in Google Places', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [] // No results
        })
      } as Response);

      const result = await service.enrichRestaurant(mockRestaurant);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Restaurant not found in Google Places');
    });

    it('should handle restaurant with rating but no detailed reviews', async () => {
      // Mock: Search succeeds
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ place_id: 'ChIJ123', name: 'Test Restaurant' }]
        })
      } as Response);

      // Mock: Details returns rating but no reviews array
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            place_id: 'ChIJ123',
            name: 'Test Restaurant',
            rating: 4.2,
            user_ratings_total: 50,
            reviews: [] // Empty reviews
          }
        })
      } as Response);

      const result = await service.enrichRestaurant(mockRestaurant);

      expect(result.success).toBe(true);
      expect(result.data?.rating).toBe(4.2);
      expect(result.data?.ratingCount).toBe(50);
      expect(result.data?.reviewSummary).toContain('4.2/5 rating');
      expect(result.data?.extractedDishes).toEqual([]);
    });
  });

  describe('Search Query Building', () => {
    it('should build search query with restaurant name and location', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] })
        } as Response);

      await service.enrichRestaurant(mockRestaurant);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('Test%20Restaurant%20London%20Shoreditch%20restaurant')
      );
    });

    it('should build search query with fallback to address if no locations', async () => {
      const restaurantWithoutLocations = {
        ...mockRestaurant,
        locations: undefined,
        address: 'Central London'
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      } as Response);

      await service.enrichRestaurant(restaurantWithoutLocations);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('Test%20Restaurant%20Central%20London%20restaurant')
      );
    });
  });

  describe('AI Review Summarization', () => {
    it('should extract JSON from Claude response with extra text', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ place_id: 'ChIJ123', name: 'Test' }] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              place_id: 'ChIJ123',
              rating: 4.5,
              user_ratings_total: 100,
              reviews: [{ author_name: 'Test', rating: 5, text: 'Amazing!', time: Date.now() / 1000, relative_time_description: 'now' }]
            }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{
              text: 'Here is the summary: {"summary":"Great place","popularDishes":["Burger"],"sentiment":"positive","confidence":"high"} Hope this helps!'
            }]
          })
        } as Response);

      const result = await service.enrichRestaurant(mockRestaurant);

      expect(result.success).toBe(true);
      expect(result.data?.reviewSummary).toBe('Great place');
      expect(result.data?.extractedDishes).toEqual(['Burger']);
    });
  });

  describe('Latest Review Date Calculation', () => {
    it('should calculate latest review date from multiple reviews', async () => {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ place_id: 'ChIJ123', name: 'Test' }] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: {
              place_id: 'ChIJ123',
              rating: 4.0,
              user_ratings_total: 3,
              reviews: [
                { author_name: 'A', rating: 5, text: 'Great', time: twoWeeksAgo / 1000, relative_time_description: '2 weeks ago' },
                { author_name: 'B', rating: 4, text: 'Good', time: oneWeekAgo / 1000, relative_time_description: '1 week ago' },
                { author_name: 'C', rating: 3, text: 'OK', time: now / 1000, relative_time_description: 'just now' }
              ]
            }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{
              text: JSON.stringify({ summary: 'Mixed reviews', popularDishes: [], sentiment: 'mixed', confidence: 'medium' })
            }]
          })
        } as Response);

      const result = await service.enrichRestaurant(mockRestaurant);

      expect(result.success).toBe(true);
      // Latest review should be the most recent one (now)
      const latestDate = new Date(result.data!.latestReviewDate!);
      expect(latestDate.getTime()).toBeGreaterThan(oneWeekAgo);
    });
  });

  describe('Progress Callbacks', () => {
    it('should invoke progress callback at each step', async () => {
      const progressCallback = vi.fn();

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ place_id: 'ChIJ123', name: 'Test' }] })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            result: { place_id: 'ChIJ123', rating: 4.0, user_ratings_total: 50, reviews: [] }
          })
        } as Response);

      await service.enrichRestaurant(mockRestaurant, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ step: expect.stringContaining('Searching Google Maps') })
      );
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({ step: expect.stringContaining('Found on Google Maps') })
      );
    });
  });

  describe('Static Utility Methods', () => {
    it('should identify restaurants needing enrichment', () => {
      const needsEnrichment: Restaurant = {
        ...mockRestaurant,
        public_review_summary: undefined
      };

      const alreadyEnriched: Restaurant = {
        ...mockRestaurant,
        public_review_summary: 'Great place',
        public_rating_count: 100,
        public_review_summary_updated_at: new Date().toISOString()
      };

      const oldEnrichment: Restaurant = {
        ...mockRestaurant,
        public_review_summary: 'Old summary',
        public_rating_count: 50,
        public_review_summary_updated_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() // 40 days ago
      };

      const results = ReviewEnrichmentService.getNeedsEnrichment([
        needsEnrichment,
        alreadyEnriched,
        oldEnrichment
      ]);

      expect(results).toHaveLength(2);
      expect(results).toContain(needsEnrichment);
      expect(results).toContain(oldEnrichment);
      expect(results).not.toContain(alreadyEnriched);
    });
  });
});
