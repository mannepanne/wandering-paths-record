import { supabase } from '@/lib/supabase';
import { Restaurant, RestaurantAddress } from '@/types/place';

export const restaurantService = {
  // Get all restaurants with their locations
  async getAllRestaurants(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants_with_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }

    return data || [];
  },

  // Get all restaurants (simple query without locations)
  async getAllRestaurantsSimple(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants by cuisine
  async getRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('cuisine', cuisine)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants by cuisine:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants by status
  async getRestaurantsByStatus(status: string): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurants by status:', error);
      throw error;
    }

    return data || [];
  },

  // Get restaurants with filters (including location-based filtering)
  async getFilteredRestaurants(filters: {
    cuisine?: string;
    status?: string;
    location?: {
      lat: number;
      lng: number;
      maxWalkingMinutes?: number;
    };
  }): Promise<Restaurant[]> {
    // If location filtering is needed, use the view with addresses
    const tableName = filters.location ? 'restaurants_with_locations' : 'restaurants';
    
    let query = supabase
      .from(tableName)
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
      console.error('Error fetching filtered restaurants:', error);
      throw error;
    }

    let results = data || [];

    // Apply location-based filtering if specified
    if (filters.location && results.length > 0) {
      const { locationService } = await import('./locationService');
      const maxWalkingMinutes = filters.location.maxWalkingMinutes || 20;
      
      results = results.filter(restaurant => {
        // Check if any location of this restaurant is within walking distance
        if (restaurant.locations && restaurant.locations.length > 0) {
          return restaurant.locations.some((address: any) => {
            if (address.latitude && address.longitude) {
              return locationService.isWithinWalkingDistance(
                { lat: filters.location!.lat, lng: filters.location!.lng },
                { lat: address.latitude, lng: address.longitude },
                maxWalkingMinutes
              );
            }
            return false;
          });
        }
        
        // Fallback: try to geocode the restaurant's main address if no coordinates
        // Note: This would be slow, so we should prioritize having coordinates in the database
        return false;
      });
    }

    return results;
  },

  // Get single restaurant by ID
  async getRestaurantById(id: string): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching restaurant by ID:', error);
      throw error;
    }

    return data;
  },

  // Get distinct cuisines that exist in the database
  async getDistinctCuisines(): Promise<string[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('cuisine')
      .not('cuisine', 'is', null)
      .not('cuisine', 'eq', '');

    if (error) {
      console.error('Error fetching distinct cuisines:', error);
      throw error;
    }

    // Extract unique cuisines, filter out nulls/empty, and sort
    const uniqueCuisines = [...new Set(data.map(row => row.cuisine).filter(Boolean))];
    return uniqueCuisines.sort();
  },

  // Create a new restaurant with addresses
  async createRestaurant(
    restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'locations'>,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[]
  ): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('restaurants')
      .insert([restaurant])
      .select()
      .single();

    if (error) {
      console.error('Error creating restaurant:', error);
      throw error;
    }

    // If addresses provided, create them too
    if (addresses && addresses.length > 0) {
      const addressRecords = addresses.map(addr => ({
        ...addr,
        restaurant_id: data.id
      }));
      
      const { error: addressError } = await supabase
        .from('restaurant_addresses')
        .insert(addressRecords);
        
      if (addressError) {
        console.error('Error creating restaurant addresses:', addressError);
        // Don't throw here - restaurant was created successfully
      }
    }

    return data;
  },

  // Update a restaurant
  async updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('restaurants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }

    return data;
  },

  // Delete a restaurant and all related addresses
  async deleteRestaurant(id: string): Promise<void> {
    // First, delete all associated addresses
    const { error: addressError } = await supabase
      .from('restaurant_addresses')
      .delete()
      .eq('restaurant_id', id);

    if (addressError) {
      console.error('Error deleting restaurant addresses:', addressError);
      throw addressError;
    }

    // Then delete the main restaurant record
    const { error: restaurantError } = await supabase
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (restaurantError) {
      console.error('Error deleting restaurant:', restaurantError);
      throw restaurantError;
    }
  },

  // Update restaurant status
  async updateRestaurantStatus(id: string, status: 'must-visit' | 'visited'): Promise<Restaurant> {
    const updates: Partial<Restaurant> = { status };
    
    // If changing to visited and it's the first visit, set visit_count to 1
    if (status === 'visited') {
      updates.visit_count = 1;
    }

    return this.updateRestaurant(id, updates);
  },

  // Restaurant addresses management
  async getRestaurantAddresses(restaurantId: string): Promise<RestaurantAddress[]> {
    const { data, error } = await supabase
      .from('restaurant_addresses')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching restaurant addresses:', error);
      throw error;
    }

    return data || [];
  },

  async addRestaurantAddress(
    restaurantId: string, 
    address: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>
  ): Promise<RestaurantAddress> {
    const { data, error } = await supabase
      .from('restaurant_addresses')
      .insert([{ ...address, restaurant_id: restaurantId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding restaurant address:', error);
      throw error;
    }

    return data;
  },

  async updateRestaurantAddress(
    addressId: string, 
    updates: Partial<RestaurantAddress>
  ): Promise<RestaurantAddress> {
    const { data, error } = await supabase
      .from('restaurant_addresses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .select()
      .single();

    if (error) {
      console.error('Error updating restaurant address:', error);
      throw error;
    }

    return data;
  },

  async deleteRestaurantAddress(addressId: string): Promise<void> {
    const { error } = await supabase
      .from('restaurant_addresses')
      .delete()
      .eq('id', addressId);

    if (error) {
      console.error('Error deleting restaurant address:', error);
      throw error;
    }
  },

  // Update restaurant with addresses (for editing functionality)
  async updateRestaurantWithAddresses(
    restaurant: Restaurant, 
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[]
  ): Promise<Restaurant> {
    // Update the main restaurant record
    const { data: updatedRestaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .update({ 
        ...restaurant, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', restaurant.id)
      .select()
      .single();

    if (restaurantError) {
      console.error('Error updating restaurant:', restaurantError);
      throw restaurantError;
    }

    // If addresses are provided, replace all existing addresses
    if (addresses) {
      // Delete all existing addresses for this restaurant
      const { error: deleteError } = await supabase
        .from('restaurant_addresses')
        .delete()
        .eq('restaurant_id', restaurant.id);

      if (deleteError) {
        console.error('Error deleting existing addresses:', deleteError);
        throw deleteError;
      }

      // Insert new addresses if any are provided
      if (addresses.length > 0) {
        const addressInserts = addresses.map(addr => ({
          ...addr,
          restaurant_id: restaurant.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('restaurant_addresses')
          .insert(addressInserts);

        if (insertError) {
          console.error('Error inserting new addresses:', insertError);
          throw insertError;
        }
      }
    }

    // Return the updated restaurant with addresses
    return this.getRestaurantById(restaurant.id);
  }
};

// Legacy alias for backward compatibility during transition
export const placesService = {
  getAllPlaces: () => restaurantService.getAllRestaurantsSimple(),
  getPlacesByType: (type: string) => restaurantService.getRestaurantsByCuisine(type),
  getPlacesByStatus: (status: string) => restaurantService.getRestaurantsByStatus(status),
  getFilteredPlaces: (filters: any) => restaurantService.getFilteredRestaurants(filters),
  createPlace: (restaurant: any) => restaurantService.createRestaurant(restaurant),
  updatePlace: (id: string, updates: any) => restaurantService.updateRestaurant(id, updates),
  deletePlace: (id: string) => restaurantService.deleteRestaurant(id),
  updatePlaceStatus: (id: string, status: any) => restaurantService.updateRestaurantStatus(id, status)
};