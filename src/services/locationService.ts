// ABOUT: Location service for geocoding and distance calculations
// ABOUT: Handles address/location search and proximity filtering for restaurants

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodingResult {
  lat: string;
  lon: string; // Nominatim uses 'lon' not 'lng'
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
  };
}

export const locationService = {
  // Geocode a location search query to coordinates
  async geocodeLocation(query: string): Promise<Coordinates | null> {
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const results: GeocodingResult[] = await response.json();
      
      console.log(`🌍 GEOCODING API RESPONSE for "${query}":`, results.length, 'results');
      if (results.length > 0) {
        console.log(`🌍 First result:`, results[0]);
        console.log(`🌍 Display name: "${results[0].display_name}"`);
        console.log(`🌍 Coordinates: ${results[0].lat}, ${results[0].lon}`);
      }
      
      if (results.length === 0) {
        console.log('No geocoding results found for:', query);
        return null;
      }
      
      const result = results[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  // Calculate distance between two coordinates using Haversine formula
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  },

  // Convert degrees to radians
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Calculate walking time based on distance (assuming 5 km/h walking speed)
  calculateWalkingTime(distanceKm: number): number {
    const walkingSpeedKmh = 5; // Average walking speed
    return (distanceKm / walkingSpeedKmh) * 60; // Return minutes
  },

  // Check if a location is within walking distance (20 minutes = ~1.67 km)
  isWithinWalkingDistance(coord1: Coordinates, coord2: Coordinates, maxMinutes: number = 20): boolean {
    const distance = this.calculateDistance(coord1, coord2);
    const walkingTime = this.calculateWalkingTime(distance);
    return walkingTime <= maxMinutes;
  },

  // Get approximate coordinates from an address string (for restaurants without exact coordinates)
  async getCoordinatesFromAddress(address: string): Promise<Coordinates | null> {
    // For UK addresses, try to extract postcode or city for better geocoding
    const postcodeMatch = address.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
    const searchQuery = postcodeMatch ? postcodeMatch[0] : address;
    
    return this.geocodeLocation(searchQuery);
  }
};