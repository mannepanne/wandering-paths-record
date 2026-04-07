// ABOUT: Utility for batch geocoding restaurant addresses to add missing coordinates
// ABOUT: Used to populate lat/lng for existing restaurants in the database

import { locationService } from './locationService';
import { Restaurant, RestaurantAddress } from '@/types/place';

export interface GeocodingProgress {
  total: number;
  processed: number;
  success: number;
  errors: string[];
  isComplete: boolean;
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

// Flatten all addresses from restaurants, attaching restaurant_name
function flattenAddresses(restaurants: Restaurant[]): (RestaurantAddress & { restaurant_name?: string })[] {
  return restaurants.flatMap(r =>
    (r.locations || []).map(addr => ({ ...addr, restaurant_name: r.name }))
  );
}

export const geocodingUtility = {
  // Get all restaurant addresses that need geocoding (missing coordinates) with restaurant names
  async getAddressesNeedingGeocoding(forceAll: boolean = false): Promise<(RestaurantAddress & { restaurant_name?: string })[]> {
    const restaurants: Restaurant[] = await apiFetch('/api/restaurants');
    const all = flattenAddresses(restaurants);
    if (forceAll) return all;
    return all.filter(a => !a.latitude || !a.longitude);
  },

  // Geocode a single address and update the database
  async geocodeAddress(address: RestaurantAddress, restaurantName?: string): Promise<boolean> {
    try {
      console.log(`🔍 GEOCODING DEBUG - Restaurant ID: ${address.restaurant_id}, Address ID: ${address.id}`);
      console.log(`🔍 Restaurant Name: "${restaurantName || 'Unknown'}"`);
      console.log(`🔍 Full Address: "${address.full_address}"`);
      console.log(`🔍 City: "${address.city}"`);
      console.log(`🔍 Country: "${address.country}"`);

      // Try to geocode the full address with restaurant name for enhanced accuracy
      let coords = await locationService.geocodeLocation(address.full_address, restaurantName);

      // If that fails, try progressive fallback strategies
      if (!coords) {
        console.log('🔍 Full address failed, trying fallback strategies...');

        // Strategy 1: Try restaurant name + postcode + city
        const postcodeMatch = address.full_address.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
        if (!coords && postcodeMatch && address.city && restaurantName) {
          const postcodeQuery = `${postcodeMatch[0]}, ${address.city}`;
          console.log(`🔍 Trying restaurant name + postcode + city: "${restaurantName}, ${postcodeQuery}"`);
          coords = await locationService.geocodeLocation(postcodeQuery, restaurantName);
        }

        // Strategy 2: Try extracting UK postcode + city (without restaurant name)
        if (!coords && postcodeMatch && address.city) {
          const postcodeQuery = `${postcodeMatch[0]}, ${address.city}`;
          console.log(`🔍 Trying postcode + city: "${postcodeQuery}"`);
          coords = await locationService.geocodeLocation(postcodeQuery);
        }

        // Strategy 3: Try just the postcode with restaurant name
        if (!coords && postcodeMatch && restaurantName) {
          console.log(`🔍 Trying restaurant name + postcode: "${restaurantName}, ${postcodeMatch[0]}"`);
          coords = await locationService.geocodeLocation(postcodeMatch[0], restaurantName);
        }

        // Strategy 4: Try just the postcode
        if (!coords && postcodeMatch) {
          console.log(`🔍 Trying just postcode: "${postcodeMatch[0]}"`);
          coords = await locationService.geocodeLocation(postcodeMatch[0]);
        }

        // Strategy 5: Try street address without building name + restaurant name
        if (!coords && restaurantName) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length > 1) {
            const streetQuery = addressParts.slice(1).join(', ');
            console.log(`🔍 Trying restaurant name + street without building: "${restaurantName}, ${streetQuery}"`);
            coords = await locationService.geocodeLocation(streetQuery, restaurantName);
          }
        }

        // Strategy 6: Try street address without building name
        if (!coords) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length > 1) {
            const streetQuery = addressParts.slice(1).join(', ');
            console.log(`🔍 Trying street address without building: "${streetQuery}"`);
            coords = await locationService.geocodeLocation(streetQuery);
          }
        }

        // Strategy 7: Try restaurant name + street + city
        if (!coords && restaurantName) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length >= 2 && address.city) {
            const streetAndCity = `${addressParts[1]}, ${address.city}`;
            console.log(`🔍 Trying restaurant name + street + city: "${restaurantName}, ${streetAndCity}"`);
            coords = await locationService.geocodeLocation(streetAndCity, restaurantName);
          }
        }

        // Strategy 8: Try just the street and city
        if (!coords) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length >= 2 && address.city) {
            const streetAndCity = `${addressParts[1]}, ${address.city}`;
            console.log(`🔍 Trying street + city: "${streetAndCity}"`);
            coords = await locationService.geocodeLocation(streetAndCity);
          }
        }

        // Strategy 9: Try restaurant name + city
        if (!coords && restaurantName && address.city) {
          console.log(`🔍 Trying restaurant name + city: "${restaurantName}, ${address.city}"`);
          coords = await locationService.geocodeLocation(address.city, restaurantName);
        }

        // Strategy 10: Last resort - just the city
        if (!coords && address.city) {
          console.log(`🔍 Last resort - trying just city: "${address.city}"`);
          coords = await locationService.geocodeLocation(address.city);
        }
      }

      if (coords) {
        await apiFetch(`/api/admin/addresses/${address.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...address, latitude: coords.lat, longitude: coords.lng }),
        });
        console.log(`Successfully geocoded: ${address.full_address} -> ${coords.lat}, ${coords.lng}`);
        return true;
      } else {
        console.warn(`Could not geocode address: ${address.full_address}`);
        return false;
      }
    } catch (error) {
      console.error(`Error geocoding address ${address.id}:`, error);
      return false;
    }
  },

  // Batch geocode all addresses that need coordinates
  async batchGeocodeAddresses(
    onProgress?: (progress: GeocodingProgress) => void,
    forceAll: boolean = false
  ): Promise<GeocodingProgress> {
    const addressesToGeocode = await this.getAddressesNeedingGeocoding(forceAll);

    const progress: GeocodingProgress = {
      total: addressesToGeocode.length,
      processed: 0,
      success: 0,
      errors: [],
      isComplete: false
    };

    if (addressesToGeocode.length === 0) {
      progress.isComplete = true;
      onProgress?.(progress);
      return progress;
    }

    console.log(`Starting ${forceAll ? 'FULL REGENERATION' : 'batch geocoding'} for ${addressesToGeocode.length} addresses...`);

    for (const address of addressesToGeocode) {
      try {
        const success = await this.geocodeAddress(address, address.restaurant_name);
        progress.processed++;
        if (success) {
          progress.success++;
        } else {
          progress.errors.push(`Failed to geocode: ${address.restaurant_name || 'Unknown'} - ${address.full_address}`);
        }
        onProgress?.(progress);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        progress.processed++;
        progress.errors.push(`Error processing ${address.restaurant_name || 'Unknown'} - ${address.full_address}: ${error}`);
        onProgress?.(progress);
      }
    }

    progress.isComplete = true;
    console.log(`Batch geocoding complete. Success: ${progress.success}/${progress.total}`);
    return progress;
  },

  // Get statistics about current geocoding status
  async getGeocodingStats(): Promise<{
    total: number;
    geocoded: number;
    needsGeocoding: number;
    percentage: number;
  }> {
    const restaurants: Restaurant[] = await apiFetch('/api/restaurants');
    const all = flattenAddresses(restaurants);
    const total = all.length;
    const geocoded = all.filter(a => a.latitude && a.longitude).length;
    const needsGeocoding = total - geocoded;
    const percentage = total > 0 ? Math.round((geocoded / total) * 100) : 0;
    return { total, geocoded, needsGeocoding, percentage };
  }
};
