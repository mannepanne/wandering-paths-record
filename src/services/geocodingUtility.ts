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
  async getAddressesNeedingGeocoding(): Promise<RestaurantAddress[]> {
    const { data, error } = await supabase
      .from('restaurant_addresses')
      .select('*')
      .or('latitude.is.null,longitude.is.null')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching addresses needing geocoding:', error);
      throw error;
    }

    return data || [];
  },

  // Geocode a single address and update the database
  async geocodeAddress(address: RestaurantAddress): Promise<boolean> {
    try {
      // Try to geocode the full address
      let coords = await locationService.geocodeLocation(address.full_address);
      
      // If that fails, try just the city/postcode if available
      if (!coords && (address.city || address.full_address)) {
        const fallbackQuery = address.city || address.full_address.split(',').pop()?.trim() || '';
        coords = await locationService.geocodeLocation(fallbackQuery);
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
    onProgress?: (progress: GeocodingProgress) => void
  ): Promise<GeocodingProgress> {
    const addressesToGeocode = await this.getAddressesNeedingGeocoding();
    
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

    console.log(`Starting batch geocoding for ${addressesToGeocode.length} addresses...`);

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