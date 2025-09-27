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
  // Geocode a location search query to coordinates using Google Geocoding API
  async geocodeLocation(query: string, restaurantName?: string): Promise<Coordinates | null> {
    try {
      // Determine which API to use based on environment
      const isProduction = window.location.hostname === 'restaurants.hultberg.org' ||
                          window.location.hostname.includes('workers.dev');

      if (isProduction) {
        // Use Google Geocoding API via CloudFlare Worker proxy
        return await this.geocodeWithGoogle(query, restaurantName);
      } else {
        // Development: Try Google via localhost API first, fallback to Nominatim
        try {
          const googleResult = await this.geocodeWithGoogleDev(query, restaurantName);
          if (googleResult) {
            return googleResult;
          }
        } catch (error) {
          console.warn('Google geocoding failed in development, falling back to Nominatim:', error);
        }
        return await this.geocodeWithNominatim(query);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  // Google Geocoding API via CloudFlare Worker proxy (production)
  async geocodeWithGoogle(query: string, restaurantName?: string): Promise<Coordinates | null> {
    try {
      // Construct enhanced query with restaurant name for better accuracy
      let enhancedQuery = query;
      if (restaurantName) {
        // Format: "Restaurant Name, Address" for best results
        enhancedQuery = `${restaurantName}, ${query}`;
        console.log(`🌍 ENHANCED GOOGLE GEOCODING QUERY: "${enhancedQuery}"`);
      } else {
        console.log(`🌍 GOOGLE GEOCODING QUERY: "${enhancedQuery}"`);
      }

      const response = await fetch(`/api/google-maps?endpoint=geocode&query=${encodeURIComponent(enhancedQuery)}`);

      if (!response.ok) {
        throw new Error(`Google Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log('No Google geocoding results found for:', enhancedQuery);
        return null;
      }

      const result = data.results[0];
      const location = result.geometry.location;

      console.log(`🌍 GOOGLE GEOCODING SUCCESS for "${enhancedQuery}":`, {
        formatted_address: result.formatted_address,
        coordinates: `${location.lat}, ${location.lng}`,
        place_id: result.place_id
      });

      return {
        lat: location.lat,
        lng: location.lng
      };
    } catch (error) {
      console.error('Google geocoding error:', error);
      return null;
    }
  },

  // Google Geocoding API for development (direct API call with API key)
  async geocodeWithGoogleDev(query: string, restaurantName?: string): Promise<Coordinates | null> {
    try {
      // Check if Google Maps API key is available in development
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not available in development environment');
        return null;
      }

      // Construct enhanced query with restaurant name for better accuracy
      let enhancedQuery = query;
      if (restaurantName) {
        enhancedQuery = `${restaurantName}, ${query}`;
        console.log(`🌍 ENHANCED GOOGLE GEOCODING QUERY (DEV): "${enhancedQuery}"`);
      } else {
        console.log(`🌍 GOOGLE GEOCODING QUERY (DEV): "${enhancedQuery}"`);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(enhancedQuery)}&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Google Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log('No Google geocoding results found for:', enhancedQuery);
        return null;
      }

      const result = data.results[0];
      const location = result.geometry.location;

      console.log(`🌍 GOOGLE GEOCODING SUCCESS (DEV) for "${enhancedQuery}":`, {
        formatted_address: result.formatted_address,
        coordinates: `${location.lat}, ${location.lng}`,
        place_id: result.place_id
      });

      return {
        lat: location.lat,
        lng: location.lng
      };
    } catch (error) {
      console.error('Google geocoding error (dev):', error);
      return null;
    }
  },

  // Nominatim geocoding (fallback/development)
  async geocodeWithNominatim(query: string): Promise<Coordinates | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error('Nominatim geocoding request failed');
      }

      const results: GeocodingResult[] = await response.json();

      console.log(`🌍 NOMINATIM GEOCODING RESPONSE for "${query}":`, results.length, 'results');
      if (results.length > 0) {
        console.log(`🌍 First result:`, results[0]);
        console.log(`🌍 Display name: "${results[0].display_name}"`);
        console.log(`🌍 Coordinates: ${results[0].lat}, ${results[0].lon}`);
      }

      if (results.length === 0) {
        console.log('No Nominatim geocoding results found for:', query);
        return null;
      }

      const result = results[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      };
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
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
  async getCoordinatesFromAddress(address: string, restaurantName?: string): Promise<Coordinates | null> {
    // For UK addresses, try to extract postcode or city for better geocoding
    const postcodeMatch = address.match(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i);
    const searchQuery = postcodeMatch ? postcodeMatch[0] : address;

    return this.geocodeLocation(searchQuery, restaurantName);
  }
};