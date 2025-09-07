// ABOUT: Utility for batch geocoding restaurant addresses to add missing coordinates
// ABOUT: Used to populate lat/lng for existing restaurants in the database

import { supabase } from '@/lib/supabase';
import { locationService } from './locationService';
import { RestaurantAddress } from '@/types/place';

export interface GeocodingProgress {
  total: number;
  processed: number;
  success: number;
  errors: string[];
  isComplete: boolean;
}

export const geocodingUtility = {
  // Get all restaurant addresses that need geocoding (missing coordinates)
  async getAddressesNeedingGeocoding(forceAll: boolean = false): Promise<RestaurantAddress[]> {
    const query = supabase
      .from('restaurant_addresses')
      .select('*')
      .order('created_at', { ascending: true });

    // If forceAll is true, get ALL addresses, otherwise only get those missing coordinates
    if (!forceAll) {
      query.or('latitude.is.null,longitude.is.null');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching addresses for geocoding:', error);
      throw error;
    }

    return data || [];
  },

  // Geocode a single address and update the database
  async geocodeAddress(address: RestaurantAddress): Promise<boolean> {
    try {
      console.log(`🔍 GEOCODING DEBUG - Restaurant ID: ${address.restaurant_id}, Address ID: ${address.id}`);
      console.log(`🔍 Full Address: "${address.full_address}"`);
      console.log(`🔍 City: "${address.city}"`);
      console.log(`🔍 Country: "${address.country}"`);
      
      // Try to geocode the full address
      let coords = await locationService.geocodeLocation(address.full_address);
      
      // If that fails, try progressive fallback strategies
      if (!coords) {
        console.log('🔍 Full address failed, trying fallback strategies...');
        
        // Strategy 1: Try extracting UK postcode + city
        const postcodeMatch = address.full_address.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
        if (postcodeMatch && address.city) {
          const postcodeQuery = `${postcodeMatch[0]}, ${address.city}`;
          console.log(`🔍 Trying postcode + city: "${postcodeQuery}"`);
          coords = await locationService.geocodeLocation(postcodeQuery);
        }
        
        // Strategy 2: Try just the postcode
        if (!coords && postcodeMatch) {
          console.log(`🔍 Trying just postcode: "${postcodeMatch[0]}"`);
          coords = await locationService.geocodeLocation(postcodeMatch[0]);
        }
        
        // Strategy 3: Try street address without building name (remove first part before comma)
        if (!coords) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length > 1) {
            const streetQuery = addressParts.slice(1).join(', '); // Skip the first part (building name)
            console.log(`🔍 Trying street address without building: "${streetQuery}"`);
            coords = await locationService.geocodeLocation(streetQuery);
          }
        }
        
        // Strategy 4: Try just the street and city
        if (!coords) {
          const addressParts = address.full_address.split(',').map(p => p.trim());
          if (addressParts.length >= 2 && address.city) {
            const streetAndCity = `${addressParts[1]}, ${address.city}`;
            console.log(`🔍 Trying street + city: "${streetAndCity}"`);
            coords = await locationService.geocodeLocation(streetAndCity);
          }
        }
        
        // Strategy 5: Last resort - just the city (original fallback)
        if (!coords && address.city) {
          console.log(`🔍 Last resort - trying just city: "${address.city}"`);
          coords = await locationService.geocodeLocation(address.city);
        }
      }

      if (coords) {
        // Update the database with coordinates
        const { error } = await supabase
          .from('restaurant_addresses')
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', address.id);

        if (error) {
          console.error('Error updating address coordinates:', error);
          return false;
        }

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

    // If no addresses need geocoding
    if (addressesToGeocode.length === 0) {
      progress.isComplete = true;
      onProgress?.(progress);
      return progress;
    }

    console.log(`Starting ${forceAll ? 'FULL REGENERATION' : 'batch geocoding'} for ${addressesToGeocode.length} addresses...`);

    // Process addresses one by one with a small delay to be respectful to the geocoding service
    for (const address of addressesToGeocode) {
      try {
        const success = await this.geocodeAddress(address);
        
        progress.processed++;
        if (success) {
          progress.success++;
        } else {
          progress.errors.push(`Failed to geocode: ${address.full_address}`);
        }

        // Call progress callback
        onProgress?.(progress);

        // Small delay to be respectful to the free geocoding service
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

      } catch (error) {
        progress.processed++;
        progress.errors.push(`Error processing ${address.full_address}: ${error}`);
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
    // Get total addresses
    const { count: total, error: totalError } = await supabase
      .from('restaurant_addresses')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw totalError;
    }

    // Get addresses with coordinates
    const { count: geocoded, error: geocodedError } = await supabase
      .from('restaurant_addresses')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (geocodedError) {
      throw geocodedError;
    }

    const totalCount = total || 0;
    const geocodedCount = geocoded || 0;
    const needsGeocoding = totalCount - geocodedCount;
    const percentage = totalCount > 0 ? Math.round((geocodedCount / totalCount) * 100) : 0;

    return {
      total: totalCount,
      geocoded: geocodedCount,
      needsGeocoding,
      percentage
    };
  }
};