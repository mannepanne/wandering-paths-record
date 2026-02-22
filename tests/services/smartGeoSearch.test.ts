// ABOUT: Unit tests for SmartGeoSearchService three-tier search system
// ABOUT: Tests local text search, geocoding + radius search, and city fallback

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartGeoSearchService } from '@/services/smartGeoSearch';
import type { Restaurant } from '@/types/place';

// Mock restaurant service
vi.mock('@/services/restaurants', () => ({
  restaurantService: {
    getFilteredRestaurants: vi.fn(),
    getAllRestaurantsWithLocations: vi.fn()
  }
}));

// Mock global fetch for geocoding
global.fetch = vi.fn();

describe('SmartGeoSearchService', () => {
  let service: SmartGeoSearchService;
  const mockRestaurants: Partial<Restaurant>[] = [
    {
      id: '1',
      name: 'Dishoom Shoreditch',
      address: '7 Boundary Street, Shoreditch, London',
      status: 'to-visit',
      locations: [{
        id: 'loc-1',
        restaurant_id: '1',
        location_name: 'Shoreditch',
        full_address: '7 Boundary Street, Shoreditch, London E2 7JE',
        city: 'London',
        latitude: 51.5231,
        longitude: -0.0764,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    },
    {
      id: '2',
      name: 'Hoppers Soho',
      address: '49 Frith Street, Soho, London',
      status: 'visited',
      locations: [{
        id: 'loc-2',
        restaurant_id: '2',
        location_name: 'Soho',
        full_address: '49 Frith Street, Soho, London W1D 4SG',
        city: 'London',
        latitude: 51.5136,
        longitude: -0.1323,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SmartGeoSearchService();
  });

  describe('Tier 1: Local Text Search', () => {
    it('should return local results when restaurant name matches', async () => {
      const { restaurantService } = await import('@/services/restaurants');
      vi.mocked(restaurantService.getFilteredRestaurants).mockResolvedValue([mockRestaurants[0]] as Restaurant[]);

      const result = await service.search('Dishoom');

      expect(result.strategy).toBe('local');
      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].name).toBe('Dishoom Shoreditch');
      expect(result.message).toContain('Found 1 restaurant');
    });

    it('should return multiple local results when multiple restaurants match', async () => {
      const { restaurantService } = await import('@/services/restaurants');
      vi.mocked(restaurantService.getFilteredRestaurants).mockResolvedValue(mockRestaurants as Restaurant[]);

      const result = await service.search('London');

      expect(result.strategy).toBe('local');
      expect(result.restaurants).toHaveLength(2);
      expect(result.message).toContain('Found 2 restaurants');
    });

    it('should handle empty search query', async () => {
      const result = await service.search('   ');

      expect(result.strategy).toBe('local');
      expect(result.restaurants).toHaveLength(0);
      expect(result.message).toBe('Please enter a search term');
    });
  });

  describe('Tier 2: Geocoding + Radius Search', () => {
    it('should fall back to geocoding when local search returns no results', async () => {
      const { restaurantService } = await import('@/services/restaurants');

      // Mock: No local results
      vi.mocked(restaurantService.getFilteredRestaurants)
        .mockResolvedValueOnce([]) // Local search
        .mockResolvedValueOnce([mockRestaurants[0]] as Restaurant[]); // Radius search

      // Mock: Successful geocoding
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{
            formatted_address: 'Shoreditch, London E2, UK',
            geometry: {
              location: { lat: 51.5231, lng: -0.0764 }
            },
            address_components: [
              { long_name: 'Shoreditch', types: ['sublocality'] },
              { long_name: 'London', types: ['locality'] }
            ],
            place_id: 'ChIJ123',
            types: ['sublocality']
          }]
        })
      } as Response);

      const result = await service.search('Shoreditch');

      expect(result.strategy).toBe('proximity');
      expect(result.restaurants).toHaveLength(1);
      expect(result.searchLocation).toBeDefined();
      expect(result.searchLocation?.city).toBe('London');
      expect(result.message).toContain('within walking distance');
    });

    it('should use user location bias when provided', async () => {
      const { restaurantService } = await import('@/services/restaurants');
      const userLocation = { lat: 51.5074, lng: -0.1278 };

      vi.mocked(restaurantService.getFilteredRestaurants)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockRestaurants[1]] as Restaurant[]);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{
            formatted_address: 'Soho, London W1, UK',
            geometry: {
              location: { lat: 51.5136, lng: -0.1323 }
            },
            address_components: [
              { long_name: 'Soho', types: ['sublocality'] },
              { long_name: 'London', types: ['locality'] }
            ],
            types: ['sublocality']
          }]
        })
      } as Response);

      const result = await service.search('coffee shop', userLocation);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`location=${userLocation.lat},${userLocation.lng}`)
      );
      expect(result.strategy).toBe('proximity');
    });

    it('should handle geocoding API failures gracefully', async () => {
      const { restaurantService } = await import('@/services/restaurants');

      vi.mocked(restaurantService.getFilteredRestaurants).mockResolvedValue([]);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'API Error'
      } as Response);

      const result = await service.search('NonexistentPlace');

      expect(result.strategy).toBe('local');
      expect(result.restaurants).toHaveLength(0);
      expect(result.message).toContain('No restaurants found');
    });
  });

  describe('Tier 3: City Fallback Search', () => {
    it('should fall back to city search when radius search returns no results', async () => {
      const { restaurantService } = await import('@/services/restaurants');

      // Mock: No local results, no radius results, but city results available
      vi.mocked(restaurantService.getFilteredRestaurants)
        .mockResolvedValueOnce([]) // Local search
        .mockResolvedValueOnce([]); // Radius search

      vi.mocked(restaurantService.getAllRestaurantsWithLocations)
        .mockResolvedValue(mockRestaurants as Restaurant[]);

      // Mock: Geocoding returns coordinates with city
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{
            formatted_address: 'Canary Wharf, London E14, UK',
            geometry: {
              location: { lat: 51.5054, lng: -0.0196 }
            },
            address_components: [
              { long_name: 'Canary Wharf', types: ['sublocality'] },
              { long_name: 'London', types: ['locality'] }
            ],
            types: ['sublocality']
          }]
        })
      } as Response);

      const result = await service.search('Canary Wharf');

      expect(result.strategy).toBe('city');
      expect(result.restaurants).toHaveLength(2); // All London restaurants
      expect(result.searchLocation?.city).toBe('London');
      expect(result.message).toContain('Showing all restaurants in London');
    });
  });

  describe('Error Handling', () => {

    it('should handle malformed geocoding responses', async () => {
      const { restaurantService } = await import('@/services/restaurants');

      vi.mocked(restaurantService.getFilteredRestaurants).mockResolvedValue([]);
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: []
        })
      } as Response);

      const result = await service.search('UnknownLocation');

      expect(result.strategy).toBe('local');
      expect(result.restaurants).toHaveLength(0);
    });
  });
});
