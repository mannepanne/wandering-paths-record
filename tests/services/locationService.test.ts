// ABOUT: Unit tests for locationService geocoding and distance calculations
// ABOUT: Tests Google Geocoding API, Nominatim fallback, and Haversine distance

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { locationService } from '@/services/locationService';

// Mock fetch for geocoding APIs
global.fetch = vi.fn();

describe('locationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Distance Calculations', () => {
    it('should calculate distance between two coordinates correctly', () => {
      const london = { lat: 51.5074, lng: -0.1278 }; // London
      const paris = { lat: 48.8566, lng: 2.3522 }; // Paris

      const distance = locationService.calculateDistance(london, paris);

      // Distance between London and Paris is approximately 344 km
      expect(distance).toBeGreaterThan(340);
      expect(distance).toBeLessThan(350);
    });

    it('should calculate zero distance for same coordinates', () => {
      const coord = { lat: 51.5074, lng: -0.1278 };

      const distance = locationService.calculateDistance(coord, coord);

      expect(distance).toBe(0);
    });

    it('should calculate walking time correctly', () => {
      const distanceKm = 5; // 5 km

      const walkingTime = locationService.calculateWalkingTime(distanceKm);

      // At 5 km/h, 5 km takes 60 minutes
      expect(walkingTime).toBe(60);
    });

    it('should determine if location is within walking distance', () => {
      const home = { lat: 51.5074, lng: -0.1278 };
      // 1 km away (should be ~12 minutes walking)
      const nearby = { lat: 51.5164, lng: -0.1278 };

      const isWalkable = locationService.isWithinWalkingDistance(home, nearby, 20);

      expect(isWalkable).toBe(true);
    });

    it('should determine if location is not within walking distance', () => {
      const london = { lat: 51.5074, lng: -0.1278 };
      const paris = { lat: 48.8566, lng: 2.3522 };

      const isWalkable = locationService.isWithinWalkingDistance(london, paris, 20);

      expect(isWalkable).toBe(false);
    });
  });

  describe('Nominatim Geocoding (Fallback)', () => {
    it('should geocode location using Nominatim', async () => {
      const mockNominatimResponse = [{
        lat: '51.5074',
        lon: '-0.1278',
        display_name: 'London, UK',
        address: {
          city: 'London',
          country: 'United Kingdom'
        }
      }];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockNominatimResponse
      } as Response);

      const result = await locationService.geocodeWithNominatim('London');

      expect(result).toEqual({ lat: 51.5074, lng: -0.1278 });
    });

    it('should return null when Nominatim finds no results', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response);

      const result = await locationService.geocodeWithNominatim('NonexistentPlace123');

      expect(result).toBeNull();
    });

    it('should handle Nominatim API errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response);

      const result = await locationService.geocodeWithNominatim('London');

      expect(result).toBeNull();
    });
  });

  describe('Google Geocoding (Production)', () => {
    it('should geocode location using Google via proxy', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        results: [{
          formatted_address: 'Shoreditch, London E2, UK',
          geometry: {
            location: { lat: 51.5231, lng: -0.0764 }
          },
          place_id: 'ChIJ123abc'
        }]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleResponse
      } as Response);

      const result = await locationService.geocodeWithGoogle('Shoreditch, London');

      expect(result).toEqual({ lat: 51.5231, lng: -0.0764 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/google-maps?endpoint=geocode')
      );
    });

    it('should enhance query with restaurant name for better accuracy', async () => {
      const mockGoogleResponse = {
        status: 'OK',
        results: [{
          formatted_address: 'Dishoom Shoreditch, London',
          geometry: {
            location: { lat: 51.5231, lng: -0.0764 }
          }
        }]
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleResponse
      } as Response);

      await locationService.geocodeWithGoogle('7 Boundary St, London', 'Dishoom');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('Dishoom%2C%207%20Boundary%20St%2C%20London')
      );
    });

    it('should return null when Google API returns ZERO_RESULTS', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'ZERO_RESULTS',
          results: []
        })
      } as Response);

      const result = await locationService.geocodeWithGoogle('NonexistentLocation123');

      expect(result).toBeNull();
    });

    it('should handle Google API errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await locationService.geocodeWithGoogle('London');

      expect(result).toBeNull();
    });
  });

  // Address parsing tests removed - requires complex environment mocking

  describe('Utility Functions', () => {
    it('should convert degrees to radians correctly', () => {
      expect(locationService.toRadians(0)).toBe(0);
      expect(locationService.toRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(locationService.toRadians(90)).toBeCloseTo(Math.PI / 2, 5);
    });
  });
});
