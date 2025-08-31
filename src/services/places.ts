import { supabase } from '@/lib/supabase';
import { Restaurant } from '@/types/place';

export const placesService = {
  // Get all restaurants
  async getAllPlaces(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching places:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants by cuisine
  async getPlacesByType(type: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching places by type:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants by status
  async getPlacesByStatus(status: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching places by status:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants with filters
  async getFilteredPlaces(filters: {
    cuisine?: string;
    status?: string;
  }): Promise<Restaurant[]> {
    let query = supabase
      .from('places')
      .select('*');

    if (filters.cuisine && filters.cuisine !== 'all') {
      query = query.eq('cuisine', filters.cuisine);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching filtered places:', error);
      throw error;
    }

    return data || [];
  },

  // Create a new restaurant
  async createPlace(restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('places')
      .insert([place])
      .select()
      .single();

    if (error) {
      console.error('Error creating place:', error);
      throw error;
    }

    return data;
  },

  // Update a restaurant
  async updatePlace(id: string, updates: Partial<Restaurant>): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('places')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating place:', error);
      throw error;
    }

    return data;
  },

  // Delete a place
  async deletePlace(id: string): Promise<void> {
    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting place:', error);
      throw error;
    }
  },

  // Update restaurant status
  async updatePlaceStatus(id: string, status: 'must-visit' | 'visited'): Promise<Restaurant> {
    const updates: Partial<Restaurant> = { status };
    
    // If changing to visited and it's the first visit, set visit_count to 1
    if (status === 'visited') {
      updates.visit_count = 1;
    }

    return this.updatePlace(id, updates);
  }
};