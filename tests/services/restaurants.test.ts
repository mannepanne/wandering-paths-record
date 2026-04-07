// ABOUT: Unit tests for restaurant service
// ABOUT: Tests API fetch behaviour via stubbed global fetch

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { restaurantService } from '@/services/restaurants';
import type { Restaurant } from '@/types/place';

const mockRestaurant: Partial<Restaurant> = {
  id: 'test-id',
  name: 'Test Restaurant',
  status: 'to-visit',
  locations: [],
};

function mockFetchOk(data: unknown = mockRestaurant) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

function mockFetchError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    text: () => Promise.resolve(message),
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetchOk());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('restaurantService', () => {
  describe('getAllRestaurantsSimple', () => {
    it('should fetch all restaurants from /api/restaurants', async () => {
      const mockList = [mockRestaurant, { ...mockRestaurant, id: '2', name: 'Test 2' }];
      vi.stubGlobal('fetch', mockFetchOk(mockList));

      const result = await restaurantService.getAllRestaurantsSimple();

      expect(fetch).toHaveBeenCalledWith(
        '/api/restaurants',
        expect.objectContaining({ credentials: 'include' })
      );
      expect(result).toEqual(mockList);
    });

    it('should return empty array when no restaurants exist', async () => {
      vi.stubGlobal('fetch', mockFetchOk([]));

      const result = await restaurantService.getAllRestaurantsSimple();

      expect(result).toEqual([]);
    });

    it('should throw when the API returns an error', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Database connection failed'));

      await expect(restaurantService.getAllRestaurantsSimple()).rejects.toThrow(
        'API error 500'
      );
    });
  });

  describe('getRestaurantById', () => {
    it('should fetch single restaurant from /api/restaurants/:id', async () => {
      vi.stubGlobal('fetch', mockFetchOk(mockRestaurant));

      const result = await restaurantService.getRestaurantById('test-id');

      expect(fetch).toHaveBeenCalledWith(
        '/api/restaurants/test-id',
        expect.objectContaining({ credentials: 'include' })
      );
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw when restaurant not found', async () => {
      vi.stubGlobal('fetch', mockFetchError(404, 'Not found'));

      await expect(restaurantService.getRestaurantById('non-existent-id')).rejects.toThrow(
        'API error 404'
      );
    });
  });

  describe('updateRestaurant', () => {
    it('should PUT to /api/admin/restaurants/:id and return updated data', async () => {
      const updates = { name: 'Updated Name', status: 'visited' as const };
      const updated = { ...mockRestaurant, ...updates };
      vi.stubGlobal('fetch', mockFetchOk(updated));

      const result = await restaurantService.updateRestaurant('test-id', updates);

      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/restaurants/test-id',
        expect.objectContaining({
          method: 'PUT',
          credentials: 'include',
          body: JSON.stringify(updates),
        })
      );
      expect(result).toEqual(updated);
    });
  });

  describe('deleteRestaurant', () => {
    it('should DELETE /api/admin/restaurants/:id (Worker cascades addresses and visits)', async () => {
      vi.stubGlobal('fetch', mockFetchOk({}));

      await restaurantService.deleteRestaurant('test-id');

      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/restaurants/test-id',
        expect.objectContaining({ method: 'DELETE', credentials: 'include' })
      );
    });

    it('should throw when deletion fails', async () => {
      vi.stubGlobal('fetch', mockFetchError(500, 'Internal server error'));

      await expect(restaurantService.deleteRestaurant('test-id')).rejects.toThrow(
        'API error 500'
      );
    });
  });

  describe('getDistinctCuisines', () => {
    it('should fetch meta and return cuisines array', async () => {
      vi.stubGlobal('fetch', mockFetchOk({ cuisines: ['Italian', 'Japanese'], styles: [], venues: [] }));

      const result = await restaurantService.getDistinctCuisines();

      expect(fetch).toHaveBeenCalledWith(
        '/api/restaurants/meta',
        expect.objectContaining({ credentials: 'include' })
      );
      expect(result).toEqual(['Italian', 'Japanese']);
    });
  });

  describe('getFilteredRestaurants', () => {
    it('should pass status filter as query param', async () => {
      vi.stubGlobal('fetch', mockFetchOk([]));

      await restaurantService.getFilteredRestaurants({ status: 'visited' });

      expect(fetch).toHaveBeenCalledWith(
        '/api/restaurants?status=visited',
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('should apply client-side text search after fetching', async () => {
      const list: Partial<Restaurant>[] = [
        { id: '1', name: 'Sushi Bar', status: 'to-visit', locations: [] },
        { id: '2', name: 'Pizza Place', status: 'to-visit', locations: [] },
      ];
      vi.stubGlobal('fetch', mockFetchOk(list));

      const result = await restaurantService.getFilteredRestaurants({ searchText: 'sushi' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sushi Bar');
    });

    it('should fetch all restaurants when no filters are provided', async () => {
      vi.stubGlobal('fetch', mockFetchOk([]));

      await restaurantService.getFilteredRestaurants({});

      expect(fetch).toHaveBeenCalledWith(
        '/api/restaurants',
        expect.objectContaining({ credentials: 'include' })
      );
    });
  });
});
