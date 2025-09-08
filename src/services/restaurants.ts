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
      .from('restaurants')
      .select(`
        *,
        locations:restaurant_addresses(*)
      `)
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
    
    // Fetch restaurants with ALL their locations using proper joins
    console.log("📊 Fetching restaurants with all locations");
    
    let query = supabase
      .from('restaurants')
      .select(`
        *,
        locations:restaurant_addresses(*)
      `);

    if (filters.cuisine && filters.cuisine !== 'all') {
      query = query.eq('cuisine', filters.cuisine);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // NOTE: Text search will be applied after fetching data since we need to search across joined location data

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching filtered restaurants:', error);
      throw error;
    }

    console.log(`📋 Database query returned ${data?.length || 0} restaurants`);
    
    let results = data || [];
    
    // Apply text search across restaurant and location data
    if (filters.searchText && filters.searchText.trim()) {
      const searchTerm = filters.searchText.trim().toLowerCase();
      console.log("🔍 Applying text search for:", searchTerm);
      
      results = results.filter(restaurant => {
        // Search in restaurant-level fields
        const restaurantMatch = 
          restaurant.name.toLowerCase().includes(searchTerm) ||
          restaurant.address?.toLowerCase().includes(searchTerm) ||
          restaurant.cuisine?.toLowerCase().includes(searchTerm);
        
        // Search in location-level fields
        const locationMatch = restaurant.locations?.some(location => 
          location.location_name?.toLowerCase().includes(searchTerm) ||
          location.full_address?.toLowerCase().includes(searchTerm)
        );
        
        const isMatch = restaurantMatch || locationMatch;
        
        if (isMatch) {
          console.log(`✅ "${restaurant.name}" matches search "${searchTerm}"`);
          if (locationMatch && !restaurantMatch) {
            // Find which location(s) matched
            const matchingLocations = restaurant.locations?.filter(location => 
              location.location_name?.toLowerCase().includes(searchTerm) ||
              location.full_address?.toLowerCase().includes(searchTerm)
            ).map(loc => loc.location_name);
            console.log(`  📍 Matched via location(s): ${matchingLocations?.join(', ')}`);
          }
        }
        
        return isMatch;
      });
      
      console.log(`🔍 Text search filtered results to ${results.length} restaurants`);
    }
    
    // Log debug info about locations
    results.forEach(restaurant => {
      console.log(`🏪 Restaurant "${restaurant.name}": ${restaurant.locations?.length || 0} locations`);
    });

    // Apply location-based filtering if specified (GPS-based "Near Me" search)
    if (filters.location && results.length > 0) {
      console.log("🗺️ Applying GPS-based location filtering");
      console.log("📍 User location:", filters.location);
      
      const maxWalkingMinutes = filters.location.maxWalkingMinutes || 20;
      const maxDistanceKm = (maxWalkingMinutes / 60) * 5; // 5km/h walking speed
      
      console.log(`🚶 Filtering for restaurants within ${maxWalkingMinutes} minutes walking (${maxDistanceKm.toFixed(1)}km)`);
      
      results = results.filter(restaurant => {
        // Check if restaurant has any locations with coordinates
        if (!restaurant.locations || restaurant.locations.length === 0) {
          console.log(`⚠️ Restaurant "${restaurant.name}" has no locations, excluding from Near Me results`);
          return false;
        }
        
        // Check each location to see if any are within range
        let closestDistance = Infinity;
        let hasValidLocation = false;
        
        for (const location of restaurant.locations) {
          if (location.latitude && location.longitude) {
            hasValidLocation = true;
            const distance = calculateHaversineDistance(
              filters.location!.lat,
              filters.location!.lng,
              location.latitude,
              location.longitude
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
            }
            
            console.log(`📏 "${restaurant.name}" (${location.location_name}): ${distance.toFixed(2)}km away`);
          }
        }
        
        if (!hasValidLocation) {
          console.log(`⚠️ Restaurant "${restaurant.name}" has locations but no coordinates, excluding from Near Me results`);
          return false;
        }
        
        const withinRange = closestDistance <= maxDistanceKm;
        console.log(`🎯 "${restaurant.name}": closest location ${closestDistance.toFixed(2)}km away - ${withinRange ? 'INCLUDED' : 'EXCLUDED'}`);
        
        return withinRange;
      });
      
      // Sort by distance (closest first)
      results.sort((a, b) => {
        // Find closest location for restaurant A
        let closestDistanceA = Infinity;
        a.locations?.forEach(location => {
          if (location.latitude && location.longitude) {
            const distance = calculateHaversineDistance(
              filters.location!.lat,
              filters.location!.lng,
              location.latitude,
              location.longitude
            );
            if (distance < closestDistanceA) {
              closestDistanceA = distance;
            }
          }
        });
        
        // Find closest location for restaurant B
        let closestDistanceB = Infinity;
        b.locations?.forEach(location => {
          if (location.latitude && location.longitude) {
            const distance = calculateHaversineDistance(
              filters.location!.lat,
              filters.location!.lng,
              location.latitude,
              location.longitude
            );
            if (distance < closestDistanceB) {
              closestDistanceB = distance;
            }
          }
        });
        
        return closestDistanceA - closestDistanceB;
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

  // Get single restaurant by ID with all locations
  async getRestaurantByIdWithLocations(id: string): Promise<Restaurant> {
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        locations:restaurant_addresses(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching restaurant with locations by ID:', error);
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

  // Create a new restaurant with addresses and automatic geocoding
  async createRestaurantWithGeocoding(
    restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'locations'>,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[],
    onProgress?: (progress: string) => void
  ): Promise<Restaurant> {
    onProgress?.('Saving restaurant data...');
    
    // First, create the restaurant
    const createdRestaurant = await this.createRestaurant(restaurant, addresses);
    
    // If addresses were provided, geocode them
    if (addresses && addresses.length > 0) {
      onProgress?.('Adding location coordinates...');
      
      // Get the created addresses from the database
      const { data: createdAddresses, error } = await supabase
        .from('restaurant_addresses')
        .select('*')
        .eq('restaurant_id', createdRestaurant.id);
        
      if (error) {
        console.error('Error fetching created addresses for geocoding:', error);
        // Don't throw - restaurant creation was successful
        return createdRestaurant;
      }
      
      // Geocode each address that doesn't already have coordinates
      for (const address of createdAddresses || []) {
        if (!address.latitude || !address.longitude) {
          try {
            onProgress?.(`Geocoding ${address.location_name || 'location'}...`);
            
            // Import locationService dynamically to avoid circular imports
            const { locationService } = await import('./locationService');
            
            // Try to geocode the full address
            let coords = await locationService.geocodeLocation(address.full_address);
            
            // If that fails, try just the city if available
            if (!coords && address.city) {
              coords = await locationService.geocodeLocation(address.city);
            }
            
            if (coords) {
              // Update the address with coordinates
              const { error: updateError } = await supabase
                .from('restaurant_addresses')
                .update({
                  latitude: coords.lat,
                  longitude: coords.lng,
                  updated_at: new Date().toISOString()
                })
                .eq('id', address.id);
                
              if (updateError) {
                console.error('Error updating address coordinates:', updateError);
              } else {
                console.log(`Successfully geocoded: ${address.full_address} -> ${coords.lat}, ${coords.lng}`);
              }
            } else {
              console.warn(`Could not geocode address: ${address.full_address}`);
            }
            
            // Small delay to be respectful to the geocoding service
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (geocodeError) {
            console.error('Error during geocoding:', geocodeError);
            // Continue with other addresses even if one fails
          }
        }
      }
    }
    
    onProgress?.('Restaurant saved with coordinates!');
    return createdRestaurant;
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
  },

  // Update a restaurant with addresses and automatic geocoding
  async updateRestaurantWithAddressesAndGeocoding(
    restaurant: Restaurant, 
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[],
    onProgress?: (progress: string) => void
  ): Promise<Restaurant> {
    onProgress?.('Updating restaurant data...');
    
    // First, update using the existing function
    const updatedRestaurant = await this.updateRestaurantWithAddresses(restaurant, addresses);
    
    // If addresses were provided, geocode any that don't have coordinates
    if (addresses && addresses.length > 0) {
      onProgress?.('Adding location coordinates...');
      
      // Get the newly created addresses from the database
      const { data: newAddresses, error } = await supabase
        .from('restaurant_addresses')
        .select('*')
        .eq('restaurant_id', restaurant.id);
        
      if (error) {
        console.error('Error fetching addresses for geocoding:', error);
        // Don't throw - restaurant update was successful
        return updatedRestaurant;
      }
      
      // Geocode each address that doesn't already have coordinates
      for (const address of newAddresses || []) {
        if (!address.latitude || !address.longitude) {
          try {
            onProgress?.(`Geocoding ${address.location_name || 'location'}...`);
            
            // Import locationService dynamically to avoid circular imports
            const { locationService } = await import('./locationService');
            
            // Try to geocode the full address
            let coords = await locationService.geocodeLocation(address.full_address);
            
            // If that fails, try just the city if available
            if (!coords && address.city) {
              coords = await locationService.geocodeLocation(address.city);
            }
            
            if (coords) {
              // Update the address with coordinates
              const { error: updateError } = await supabase
                .from('restaurant_addresses')
                .update({
                  latitude: coords.lat,
                  longitude: coords.lng,
                  updated_at: new Date().toISOString()
                })
                .eq('id', address.id);
                
              if (updateError) {
                console.error('Error updating address coordinates:', updateError);
              } else {
                console.log(`Successfully geocoded: ${address.full_address} -> ${coords.lat}, ${coords.lng}`);
              }
            } else {
              console.warn(`Could not geocode address: ${address.full_address}`);
            }
            
            // Small delay to be respectful to the geocoding service
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (geocodeError) {
            console.error('Error during geocoding:', geocodeError);
            // Continue with other addresses even if one fails
          }
        }
      }
    }
    
    onProgress?.('Restaurant updated with coordinates!');
    return updatedRestaurant;
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