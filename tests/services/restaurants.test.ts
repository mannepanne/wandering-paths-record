// ABOUT: Unit tests for restaurant service
// ABOUT: Demonstrates mocking Supabase and testing async service methods

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restaurantService } from '@/services/restaurants';
import type { Restaurant } from '@/types/place';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        })),
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        })),
        not: vi.fn(() => ({
          not: vi.fn(() => ({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null
            }))
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null
        }))
      }))
    }))
  }
}));

describe('restaurantService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllRestaurantsSimple', () => {
    it('should fetch all restaurants ordered by created_at descending', async () => {
      const mockRestaurants: Partial<Restaurant>[] = [
        { id: '1', name: 'Test Restaurant 1', status: 'to-visit' },
        { id: '2', name: 'Test Restaurant 2', status: 'visited' }
      ];

      // Mock successful response
      const { supabase } = await import('@/lib/supabase');
      const selectMock = vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockRestaurants,
          error: null
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      const result = await restaurantService.getAllRestaurantsSimple();

      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(result).toEqual(mockRestaurants);
    });

    it('should throw error when database query fails', async () => {
      const mockError = new Error('Database connection failed');

      const { supabase } = await import('@/lib/supabase');
      const selectMock = vi.fn(() => ({
        order: vi.fn(() => ({
          data: null,
          error: mockError
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      await expect(restaurantService.getAllRestaurantsSimple()).rejects.toThrow('Database connection failed');
    });

    it('should return empty array when no restaurants exist', async () => {
      const { supabase } = await import('@/lib/supabase');
      const selectMock = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      }));

      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      const result = await restaurantService.getAllRestaurantsSimple();

      expect(result).toEqual([]);
    });
  });

  describe('getRestaurantById', () => {
    it('should fetch single restaurant by ID', async () => {
      const mockRestaurant: Partial<Restaurant> = {
        id: 'test-id',
        name: 'Test Restaurant',
        status: 'to-visit'
      };

      const { supabase } = await import('@/lib/supabase');
      const singleMock = vi.fn(() => ({
        data: mockRestaurant,
        error: null
      }));
      const eqMock = vi.fn(() => ({ single: singleMock }));
      const selectMock = vi.fn(() => ({ eq: eqMock }));

      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      const result = await restaurantService.getRestaurantById('test-id');

      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('id', 'test-id');
      expect(result).toEqual(mockRestaurant);
    });

    it('should throw error when restaurant not found', async () => {
      const mockError = new Error('Restaurant not found');

      const { supabase } = await import('@/lib/supabase');
      const singleMock = vi.fn(() => ({
        data: null,
        error: mockError
      }));
      const eqMock = vi.fn(() => ({ single: singleMock }));
      const selectMock = vi.fn(() => ({ eq: eqMock }));

      (supabase.from as any).mockReturnValue({
        select: selectMock
      });

      await expect(restaurantService.getRestaurantById('non-existent-id')).rejects.toThrow('Restaurant not found');
    });
  });

  describe('updateRestaurant', () => {
    it('should update restaurant and return updated data', async () => {
      const restaurantId = 'test-id';
      const updates = { name: 'Updated Name', status: 'visited' as const };
      const mockUpdatedRestaurant: Partial<Restaurant> = {
        id: restaurantId,
        name: 'Updated Name',
        status: 'visited'
      };

      const { supabase } = await import('@/lib/supabase');
      const singleMock = vi.fn(() => ({
        data: mockUpdatedRestaurant,
        error: null
      }));
      const selectMock = vi.fn(() => ({ single: singleMock }));
      const eqMock = vi.fn(() => ({ select: selectMock }));
      const updateMock = vi.fn(() => ({ eq: eqMock }));

      (supabase.from as any).mockReturnValue({
        update: updateMock
      });

      const result = await restaurantService.updateRestaurant(restaurantId, updates);

      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updates,
          updated_at: expect.any(String)
        })
      );
      expect(eqMock).toHaveBeenCalledWith('id', restaurantId);
      expect(result).toEqual(mockUpdatedRestaurant);
    });
  });

  describe('deleteRestaurant', () => {
    it('should delete restaurant addresses first, then restaurant', async () => {
      const restaurantId = 'test-id';

      const { supabase } = await import('@/lib/supabase');
      const addressDeleteEqMock = vi.fn(() => ({ error: null }));
      const restaurantDeleteEqMock = vi.fn(() => ({ error: null }));

      let callCount = 0;
      (supabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (table === 'restaurant_addresses') {
          return {
            delete: vi.fn(() => ({ eq: addressDeleteEqMock }))
          };
        }
        if (table === 'restaurants') {
          return {
            delete: vi.fn(() => ({ eq: restaurantDeleteEqMock }))
          };
        }
      });

      await restaurantService.deleteRestaurant(restaurantId);

      expect(supabase.from).toHaveBeenCalledWith('restaurant_addresses');
      expect(addressDeleteEqMock).toHaveBeenCalledWith('restaurant_id', restaurantId);
      expect(supabase.from).toHaveBeenCalledWith('restaurants');
      expect(restaurantDeleteEqMock).toHaveBeenCalledWith('id', restaurantId);
    });

    it('should throw error if address deletion fails', async () => {
      const restaurantId = 'test-id';
      const mockError = new Error('Failed to delete addresses');

      const { supabase } = await import('@/lib/supabase');
      const addressDeleteEqMock = vi.fn(() => ({ error: mockError }));

      (supabase.from as any).mockReturnValue({
        delete: vi.fn(() => ({ eq: addressDeleteEqMock }))
      });

      await expect(restaurantService.deleteRestaurant(restaurantId)).rejects.toThrow('Failed to delete addresses');
    });
  });
});
