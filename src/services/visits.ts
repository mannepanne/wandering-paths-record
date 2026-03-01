// ABOUT: Service functions for restaurant visit logging
// ABOUT: Handles CRUD operations for restaurant_visits table

import { supabase } from '@/lib/supabase';
import { RestaurantVisit } from '@/types/place';

export const visitService = {
  /**
   * Get all visits for a specific restaurant, ordered by visit date (newest first)
   * @param restaurantId - The restaurant ID to fetch visits for
   * @returns Array of visits for the restaurant
   */
  async getVisitsByRestaurant(restaurantId: string): Promise<RestaurantVisit[]> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visits:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get latest N visits for a restaurant (for pagination/preview)
   * @param restaurantId - The restaurant ID to fetch visits for
   * @param limit - Maximum number of visits to return (default: 5)
   * @returns Array of latest visits
   */
  async getLatestVisits(restaurantId: string, limit: number = 5): Promise<RestaurantVisit[]> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching latest visits:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get visit count for a restaurant
   * @param restaurantId - The restaurant ID
   * @returns Number of visits for the restaurant
   */
  async getVisitCount(restaurantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('restaurant_visits')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('Error fetching visit count:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Get a single visit by ID
   * @param visitId - The visit ID
   * @returns The visit record
   */
  async getVisitById(visitId: string): Promise<RestaurantVisit | null> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (error) {
      console.error('Error fetching visit:', error);
      throw error;
    }

    return data;
  },
};
