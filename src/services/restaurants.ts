import { supabase } from '@/lib/supabase';
import { Restaurant, RestaurantAddress } from '@/types/place';

// Haversine formula to calculate distance between two points on Earth
function calculateHaversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

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

  // Get restaurants with filters (including text search and location-based filtering)
  async getFilteredRestaurants(filters: {
    cuisine?: string;
    status?: string;
    searchText?: string; // NEW: Text search across name, city, country, neighborhood
    location?: {
      lat: number;
      lng: number;
      maxWalkingMinutes?: number;
    };
  }): Promise<Restaurant[]> {
    console.log("🍽️ getFilteredRestaurants called with filters:", filters);
    
    // For text search, we need to use the view to search address fields
    // For simple filtering without text search, we can use the basic restaurants table
    const needsAddressSearch = filters.searchText && filters.searchText.trim();
    const tableName = (filters.location || needsAddressSearch) ? 'restaurants_with_locations' : 'restaurants';
    console.log("📊 Using table/view:", tableName);
    
    let query = supabase
      .from(tableName)
      .select('*');

    if (filters.cuisine && filters.cuisine !== 'all') {
      query = query.eq('cuisine', filters.cuisine);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Add text search if provided
    if (filters.searchText && filters.searchText.trim()) {
      const searchTerm = filters.searchText.trim();
      console.log("🔍 Applying text search for:", searchTerm);
      
      // Search across restaurant name and address summary (always available)
      // When using restaurants_with_locations view, we can also search location fields
      if (tableName === 'restaurants_with_locations') {
        // Search in multiple fields: restaurant name, address summary, and location data
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      } else {
        // Basic search in restaurant table only
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching filtered restaurants:', error);
      throw error;
    }

    console.log(`📋 Database query returned ${data?.length || 0} restaurants`);
    let results = data || [];

    // Apply location-based filtering if specified (GPS-based "Near Me" search)
    if (filters.location && results.length > 0) {
      console.log("🗺️ Applying GPS-based location filtering");
      console.log("📍 User location:", filters.location);
      
      const maxWalkingMinutes = filters.location.maxWalkingMinutes || 20;
      const maxDistanceKm = (maxWalkingMinutes / 60) * 5; // 5km/h walking speed
      
      console.log(`🚶 Filtering for restaurants within ${maxWalkingMinutes} minutes walking (${maxDistanceKm.toFixed(1)}km)`);
      
      results = results.filter(restaurant => {
        // Check if restaurant has coordinates (from restaurant_addresses via view)
        if (!restaurant.latitude || !restaurant.longitude) {
          console.log(`⚠️ Restaurant "${restaurant.name}" has no coordinates, excluding from Near Me results`);
          return false;
        }
        
        const distance = calculateHaversineDistance(
          filters.location!.lat,
          filters.location!.lng,
          restaurant.latitude,
          restaurant.longitude
        );
        
        const withinRange = distance <= maxDistanceKm;
        console.log(`📏 "${restaurant.name}": ${distance.toFixed(2)}km away - ${withinRange ? 'INCLUDED' : 'EXCLUDED'}`);
        
        return withinRange;
      });
      
      // Sort by distance (closest first)
      results.sort((a, b) => {
        const distanceA = calculateHaversineDistance(
          filters.location!.lat,
          filters.location!.lng,
          a.latitude!,
          a.longitude!
        );
        const distanceB = calculateHaversineDistance(
          filters.location!.lat,
          filters.location!.lng,
          b.latitude!,
          b.longitude!
        );
        return distanceA - distanceB;
      });
      
      console.log(`🎯 Found ${results.length} restaurants within ${maxWalkingMinutes} minutes walking distance`);
    }

    console.log(`📤 Returning ${results.length} restaurants`);
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