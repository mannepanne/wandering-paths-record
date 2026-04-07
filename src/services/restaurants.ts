// ABOUT: Service functions for restaurant data management
// ABOUT: All data operations via Worker API endpoints (D1 database)

import { Restaurant, RestaurantAddress, CuisinePrimary, RestaurantStyle, RestaurantVenue } from '@/types/place';

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

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const restaurantService = {
  // Get all restaurants with their locations
  async getAllRestaurants(): Promise<Restaurant[]> {
    return apiFetch('/api/restaurants');
  },

  // Get all restaurants (simple query without locations — same endpoint, locations always included)
  async getAllRestaurantsSimple(): Promise<Restaurant[]> {
    return apiFetch('/api/restaurants');
  },

  // Get restaurants by cuisine (legacy field)
  async getRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
    return apiFetch(`/api/restaurants?cuisine_primary=${encodeURIComponent(cuisine)}`);
  },

  // Get all restaurants with their locations (for city matching and analysis)
  async getAllRestaurantsWithLocations(): Promise<Restaurant[]> {
    return apiFetch('/api/restaurants');
  },

  // Get restaurants by status
  async getRestaurantsByStatus(status: string): Promise<Restaurant[]> {
    return apiFetch(`/api/restaurants?status=${encodeURIComponent(status)}`);
  },

  // Get filtered restaurants with optional facets, text search, and geo filtering
  async getFilteredRestaurants(filters: {
    cuisine?: string; // Legacy - kept for backwards compatibility
    cuisine_primary?: string; // New facet
    style?: string; // New facet
    venue?: string; // New facet
    status?: string;
    searchText?: string; // Text search across name, city, country, neighborhood
    location?: {
      lat: number;
      lng: number;
      maxWalkingMinutes?: number;
    };
  }): Promise<Restaurant[]> {
    console.log("🍽️ getFilteredRestaurants called with filters:", filters);

    // Build query params for server-side filtering
    const params = new URLSearchParams();
    if (filters.cuisine_primary && filters.cuisine_primary !== 'all') {
      params.set('cuisine_primary', filters.cuisine_primary);
    }
    if (filters.style && filters.style !== 'all') {
      params.set('style', filters.style);
    }
    if (filters.venue && filters.venue !== 'all') {
      params.set('venue', filters.venue);
    }
    if (filters.cuisine && filters.cuisine !== 'all' && !filters.cuisine_primary) {
      params.set('cuisine_primary', filters.cuisine);
    }
    if (filters.status && filters.status !== 'all') {
      params.set('status', filters.status);
    }

    const query = params.toString();
    console.log("📊 Fetching restaurants with all locations");
    let results: Restaurant[] = await apiFetch(`/api/restaurants${query ? `?${query}` : ''}`);

    console.log(`📋 Database query returned ${results.length} restaurants`);

    // Apply text search across restaurant and location data (client-side)
    if (filters.searchText && filters.searchText.trim()) {
      const searchTerm = filters.searchText.trim().toLowerCase();
      console.log("🔍 Applying text search for:", searchTerm);

      results = results.filter(restaurant => {
        const restaurantMatch =
          restaurant.name.toLowerCase().includes(searchTerm) ||
          restaurant.address?.toLowerCase().includes(searchTerm) ||
          restaurant.cuisine?.toLowerCase().includes(searchTerm);

        const locationMatch = restaurant.locations?.some(location =>
          location.location_name?.toLowerCase().includes(searchTerm) ||
          location.full_address?.toLowerCase().includes(searchTerm)
        );

        const isMatch = restaurantMatch || locationMatch;

        if (isMatch) {
          console.log(`✅ "${restaurant.name}" matches search "${searchTerm}"`);
          if (locationMatch && !restaurantMatch) {
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
        if (!restaurant.locations || restaurant.locations.length === 0) {
          console.log(`⚠️ Restaurant "${restaurant.name}" has no locations, excluding from Near Me results`);
          return false;
        }

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
            if (distance < closestDistance) closestDistance = distance;
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
        const closest = (r: Restaurant) => {
          let min = Infinity;
          r.locations?.forEach(loc => {
            if (loc.latitude && loc.longitude) {
              const d = calculateHaversineDistance(filters.location!.lat, filters.location!.lng, loc.latitude, loc.longitude);
              if (d < min) min = d;
            }
          });
          return min;
        };
        return closest(a) - closest(b);
      });

      console.log(`🎯 Found ${results.length} restaurants within ${maxWalkingMinutes} minutes walking distance`);
    }

    console.log(`📤 Returning ${results.length} restaurants`);
    return results;
  },

  // Get single restaurant by ID
  async getRestaurantById(id: string): Promise<Restaurant> {
    return apiFetch(`/api/restaurants/${id}`);
  },

  // Get single restaurant by ID with all locations (same endpoint — locations always included)
  async getRestaurantByIdWithLocations(id: string): Promise<Restaurant> {
    return apiFetch(`/api/restaurants/${id}`);
  },

  // Get distinct cuisines (legacy field)
  async getDistinctCuisines(): Promise<string[]> {
    const meta = await apiFetch('/api/restaurants/meta');
    return meta.cuisines as string[];
  },

  // Get distinct primary cuisines
  async getDistinctCuisinesPrimary(): Promise<CuisinePrimary[]> {
    const meta = await apiFetch('/api/restaurants/meta');
    return meta.cuisines as CuisinePrimary[];
  },

  // Get distinct styles
  async getDistinctStyles(): Promise<RestaurantStyle[]> {
    const meta = await apiFetch('/api/restaurants/meta');
    return meta.styles as RestaurantStyle[];
  },

  // Get distinct venues
  async getDistinctVenues(): Promise<RestaurantVenue[]> {
    const meta = await apiFetch('/api/restaurants/meta');
    return meta.venues as RestaurantVenue[];
  },

  // Create a new restaurant with optional addresses
  async createRestaurant(
    restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'locations'>,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[]
  ): Promise<Restaurant> {
    return apiFetch('/api/admin/restaurants', {
      method: 'POST',
      body: JSON.stringify({ ...restaurant, locations: addresses }),
    });
  },

  // Create a new restaurant with addresses and automatic geocoding
  async createRestaurantWithGeocoding(
    restaurant: Omit<Restaurant, 'id' | 'created_at' | 'updated_at' | 'locations'>,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[],
    onProgress?: (progress: string) => void
  ): Promise<Restaurant> {
    onProgress?.('Saving restaurant data...');

    const created = await this.createRestaurant(restaurant, addresses);

    if (created.locations?.length) {
      onProgress?.('Adding location coordinates...');

      for (const address of created.locations) {
        if (!address.latitude || !address.longitude) {
          try {
            onProgress?.(`Geocoding ${address.location_name || 'location'}...`);
            const { locationService } = await import('./locationService');
            let coords = await locationService.geocodeLocation(address.full_address);
            if (!coords && address.city) coords = await locationService.geocodeLocation(address.city);

            if (coords) {
              await apiFetch(`/api/admin/addresses/${address.id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...address, latitude: coords.lat, longitude: coords.lng }),
              });
              console.log(`Successfully geocoded: ${address.full_address} -> ${coords.lat}, ${coords.lng}`);
            } else {
              console.warn(`Could not geocode address: ${address.full_address}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (geocodeError) {
            console.error('Error during geocoding:', geocodeError);
          }
        }
      }
    }

    onProgress?.('Restaurant saved with coordinates!');
    return this.getRestaurantById(created.id);
  },

  // Update a restaurant
  async updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant> {
    return apiFetch(`/api/admin/restaurants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete a restaurant (Worker cascades to addresses and visits)
  async deleteRestaurant(id: string): Promise<void> {
    await apiFetch(`/api/admin/restaurants/${id}`, { method: 'DELETE' });
  },

  // Update restaurant status
  async updateRestaurantStatus(id: string, status: 'to-visit' | 'visited'): Promise<Restaurant> {
    const updates: Partial<Restaurant> = { status };
    if (status === 'visited') updates.visit_count = 1;
    return this.updateRestaurant(id, updates);
  },

  // Update personal appreciation level
  async updateRestaurantAppreciation(id: string, appreciation: 'unknown' | 'avoid' | 'fine' | 'good' | 'great'): Promise<Restaurant> {
    return this.updateRestaurant(id, { personal_appreciation: appreciation });
  },

  // Enhanced status update with optional appreciation
  async updateRestaurantStatusWithAppreciation(
    id: string,
    status: 'to-visit' | 'visited',
    appreciation?: 'unknown' | 'avoid' | 'fine' | 'good' | 'great'
  ): Promise<Restaurant> {
    const updates: Partial<Restaurant> = { status };
    if (status === 'visited') updates.visit_count = 1;
    if (appreciation) updates.personal_appreciation = appreciation;
    return this.updateRestaurant(id, updates);
  },

  // Restaurant addresses management
  async getRestaurantAddresses(restaurantId: string): Promise<RestaurantAddress[]> {
    const restaurant = await this.getRestaurantById(restaurantId);
    return restaurant.locations || [];
  },

  async addRestaurantAddress(
    restaurantId: string,
    address: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>
  ): Promise<RestaurantAddress> {
    return apiFetch(`/api/admin/restaurants/${restaurantId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(address),
    });
  },

  async updateRestaurantAddress(
    addressId: string,
    updates: Partial<RestaurantAddress>
  ): Promise<RestaurantAddress> {
    return apiFetch(`/api/admin/addresses/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteRestaurantAddress(addressId: string): Promise<void> {
    await apiFetch(`/api/admin/addresses/${addressId}`, { method: 'DELETE' });
  },

  // Update restaurant with addresses (replaces all existing addresses atomically)
  // When addresses is provided the Worker deletes + re-inserts them in a single db.batch()
  // so a network failure can never leave the restaurant without addresses.
  async updateRestaurantWithAddresses(
    restaurant: Restaurant,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[]
  ): Promise<Restaurant> {
    const body = addresses !== undefined
      ? { ...restaurant, locations: addresses }
      : { ...restaurant };
    return apiFetch(`/api/admin/restaurants/${restaurant.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  // Update a restaurant with addresses and automatic geocoding
  async updateRestaurantWithAddressesAndGeocoding(
    restaurant: Restaurant,
    addresses?: Omit<RestaurantAddress, 'id' | 'restaurant_id' | 'created_at' | 'updated_at'>[],
    onProgress?: (progress: string) => void
  ): Promise<Restaurant> {
    onProgress?.('Updating restaurant data...');
    const updated = await this.updateRestaurantWithAddresses(restaurant, addresses);

    if (addresses && addresses.length > 0) {
      onProgress?.('Adding location coordinates...');
      const current = await this.getRestaurantById(restaurant.id);

      for (const address of current.locations || []) {
        if (!address.latitude || !address.longitude) {
          try {
            onProgress?.(`Geocoding ${address.location_name || 'location'}...`);
            const { locationService } = await import('./locationService');
            let coords = await locationService.geocodeLocation(address.full_address);
            if (!coords && address.city) coords = await locationService.geocodeLocation(address.city);

            if (coords) {
              await apiFetch(`/api/admin/addresses/${address.id}`, {
                method: 'PUT',
                body: JSON.stringify({ ...address, latitude: coords.lat, longitude: coords.lng }),
              });
              console.log(`Successfully geocoded: ${address.full_address} -> ${coords.lat}, ${coords.lng}`);
            } else {
              console.warn(`Could not geocode address: ${address.full_address}`);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (geocodeError) {
            console.error('Error during geocoding:', geocodeError);
          }
        }
      }
    }

    onProgress?.('Restaurant updated with coordinates!');
    return updated;
  },

  // Review enrichment: update public review data, merging must_try_dishes with existing
  async updateRestaurantReviewData(
    restaurantId: string,
    reviewData: {
      public_rating?: number;
      public_rating_count?: number;
      public_review_summary?: string;
      public_review_summary_updated_at?: string;
      public_review_latest_created_at?: string;
      must_try_dishes?: string[];
    }
  ): Promise<Restaurant> {
    let updatedDishes = reviewData.must_try_dishes;

    if (reviewData.must_try_dishes) {
      const current = await this.getRestaurantById(restaurantId);
      const existingDishes = current.must_try_dishes || [];
      const newDishes = reviewData.must_try_dishes;

      if (existingDishes.length >= 5) {
        console.log(`⚠️ Restaurant already has ${existingDishes.length} must-try dishes, skipping new additions`);
        updatedDishes = existingDishes;
      } else {
        const uniqueNewDishes = newDishes.filter(newDish =>
          !existingDishes.some(existingDish =>
            existingDish.toLowerCase().trim() === newDish.toLowerCase().trim()
          )
        );
        const combinedDishes = [...existingDishes, ...uniqueNewDishes];
        updatedDishes = combinedDishes.slice(0, 5);
        if (combinedDishes.length > 5) {
          console.log(`📝 Capped must-try dishes at 5 (had ${combinedDishes.length} total)`);
        }
      }
    }

    return this.updateRestaurant(restaurantId, { ...reviewData, must_try_dishes: updatedDishes });
  },

  // Get restaurants that need review enrichment
  async getRestaurantsNeedingReviews(): Promise<Restaurant[]> {
    const all: Restaurant[] = await apiFetch('/api/restaurants');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return all.filter(r =>
      !r.public_review_summary ||
      !r.public_rating_count ||
      (r.public_review_summary_updated_at && r.public_review_summary_updated_at < thirtyDaysAgo)
    );
  },

  // Get review enrichment statistics
  async getReviewEnrichmentStats(): Promise<{
    total: number;
    enriched: number;
    needsUpdate: number;
    lastUpdated?: string;
  }> {
    const all: Restaurant[] = await apiFetch('/api/restaurants');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const total = all.length;
    const enriched = all.filter(r => r.public_review_summary).length;
    const needsUpdate = all.filter(r =>
      !r.public_review_summary ||
      (r.public_review_summary_updated_at && new Date(r.public_review_summary_updated_at) < thirtyDaysAgo)
    ).length;
    const lastUpdated = all
      .map(r => r.public_review_summary_updated_at)
      .filter(Boolean)
      .sort()
      .pop();

    return { total, enriched, needsUpdate, lastUpdated };
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
  updatePlaceStatus: (id: string, status: any) => restaurantService.updateRestaurantStatus(id, status),
  updatePlaceAppreciation: (id: string, appreciation: any) => restaurantService.updateRestaurantAppreciation(id, appreciation),
  updatePlaceStatusWithAppreciation: (id: string, status: any, appreciation?: any) => restaurantService.updateRestaurantStatusWithAppreciation(id, status, appreciation)
};
