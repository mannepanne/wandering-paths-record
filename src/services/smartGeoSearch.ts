// ABOUT: Smart geographical search service implementing three-tier search strategy
// ABOUT: 1) Local text search, 2) Geocoding + radius search, 3) City fallback search

import { Restaurant } from '@/types/place';
import { restaurantService } from './restaurants';

// Core interfaces for the smart search system
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface SearchResult {
  restaurants: Restaurant[];
  strategy: 'local' | 'proximity' | 'city';
  searchLocation?: {
    name: string;
    coordinates: Coordinates;
    city?: string;
    formattedAddress?: string;
  };
  message?: string;
  searchTime?: number;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  addressComponents: AddressComponent[];
  city?: string;
  confidence: 'high' | 'medium' | 'low';
  placeId?: string;
}

export interface AddressComponent {
  longName: string;
  shortName: string;
  types: string[];
}

// Geocoding service for location resolution
class GeocodingService {
  private async callGoogleGeocodingAPI(query: string, userLocation?: Coordinates): Promise<unknown> {
    // Build geocoding URL with bias towards user location if available
    let geocodingUrl = `/api/google-maps?endpoint=geocode&query=${encodeURIComponent(query)}`;

    if (userLocation) {
      // Add location bias to get more relevant results
      geocodingUrl += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`; // 50km bias radius
    }

    console.log(`🗺️ Geocoding query: "${query}"${userLocation ? ' with location bias' : ''}`);

    const response = await fetch(geocodingUrl);
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`Geocoding API error: ${data.error}`);
    }

    return data;
  }

  async geocode(query: string, userLocation?: Coordinates): Promise<GeocodingResult | null> {
    try {
      const data = await this.callGoogleGeocodingAPI(query, userLocation);

      if (!data.results || data.results.length === 0 || data.status !== 'OK') {
        console.log(`❌ No geocoding results for: "${query}" (status: ${data.status})`);
        return null;
      }

      const result = data.results[0]; // Take the first (most relevant) result
      const geometry = result.geometry;
      const addressComponents = result.address_components || [];

      // Extract city from address components
      const city = this.extractCityFromComponents(addressComponents);

      // Determine confidence based on result type and partial_match flag
      const confidence = this.determineConfidence(result);

      console.log(`✅ Geocoded "${query}" to ${geometry.location.lat}, ${geometry.location.lng} (${result.formatted_address})`);

      return {
        coordinates: {
          lat: geometry.location.lat,
          lng: geometry.location.lng
        },
        formattedAddress: result.formatted_address,
        addressComponents,
        city,
        confidence,
        placeId: result.place_id
      };
    } catch (error) {
      console.error(`❌ Geocoding failed for "${query}":`, error);
      return null;
    }
  }

  private extractCityFromComponents(components: Array<{ long_name: string; types: string[] }>): string | undefined {
    // Look for locality, administrative_area_level_1, or postal_town
    const cityTypes = ['locality', 'postal_town', 'administrative_area_level_1'];

    for (const type of cityTypes) {
      const component = components.find(comp => comp.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }

    return undefined;
  }

  private determineConfidence(result: { types: string[]; partial_match?: boolean }): 'high' | 'medium' | 'low' {
    // High confidence: exact matches, specific places
    if (result.types.includes('establishment') || result.types.includes('point_of_interest')) {
      return 'high';
    }

    // Medium confidence: addresses, neighborhoods
    if (result.types.includes('street_address') || result.types.includes('sublocality')) {
      return 'medium';
    }

    // Lower confidence: partial matches, broad areas
    if (result.partial_match || result.types.includes('administrative_area_level_1')) {
      return 'low';
    }

    return 'medium'; // Default
  }

}

// City matching service for fallback searches
class CityMatcher {
  // Cache of restaurant cities for performance
  private restaurantCitiesCache: string[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getRestaurantCities(): Promise<string[]> {
    const now = Date.now();

    // Use cached cities if available and fresh
    if (this.restaurantCitiesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.restaurantCitiesCache;
    }

    try {
      // Get all restaurants with their locations
      const restaurants = await restaurantService.getAllRestaurantsWithLocations();

      // Extract unique cities from all restaurant locations
      const cities = new Set<string>();

      restaurants.forEach(restaurant => {
        // Add cities from locations array if available
        if (restaurant.locations && restaurant.locations.length > 0) {
          restaurant.locations.forEach(location => {
            if (location.city && location.city.trim()) {
              cities.add(location.city.trim());
            }
          });
        }

        // Fallback to parsing address for older data
        if (cities.size === 0 && restaurant.address) {
          const inferredCity = this.inferCityFromAddress(restaurant.address);
          if (inferredCity) {
            cities.add(inferredCity);
          }
        }
      });

      this.restaurantCitiesCache = Array.from(cities).sort();
      this.cacheTimestamp = now;

      console.log(`🏙️ Cached ${this.restaurantCitiesCache.length} unique restaurant cities`);
      return this.restaurantCitiesCache;

    } catch (error) {
      console.error('Failed to get restaurant cities:', error);
      return [];
    }
  }

  async fuzzyMatchCity(searchCity: string, threshold: number = 0.7): Promise<string[]> {
    const cities = await this.getRestaurantCities();
    const normalizedSearch = searchCity.toLowerCase().trim();

    const matches: Array<{ city: string; score: number }> = [];

    for (const city of cities) {
      const normalizedCity = city.toLowerCase();

      // Exact match gets highest score
      if (normalizedCity === normalizedSearch) {
        matches.push({ city, score: 1.0 });
        continue;
      }

      // Contains match
      if (normalizedCity.includes(normalizedSearch) || normalizedSearch.includes(normalizedCity)) {
        const score = Math.max(normalizedSearch.length, normalizedCity.length) /
                      Math.min(normalizedSearch.length + normalizedCity.length, normalizedCity.length + normalizedSearch.length);
        matches.push({ city, score });
        continue;
      }

      // Levenshtein distance for close matches
      const distance = this.levenshteinDistance(normalizedSearch, normalizedCity);
      const maxLength = Math.max(normalizedSearch.length, normalizedCity.length);
      const score = 1 - (distance / maxLength);

      if (score >= threshold) {
        matches.push({ city, score });
      }
    }

    // Sort by score (highest first) and return city names
    return matches
      .sort((a, b) => b.score - a.score)
      .map(match => match.city);
  }

  async findRestaurantsByCity(cityName: string): Promise<Restaurant[]> {
    try {
      // Get fuzzy matches for the city name
      const matchedCities = await this.fuzzyMatchCity(cityName, 0.6); // Lower threshold for broader matching

      if (matchedCities.length === 0) {
        console.log(`🏙️ No city matches found for: "${cityName}"`);
        return [];
      }

      console.log(`🏙️ Found ${matchedCities.length} city matches for "${cityName}": ${matchedCities.slice(0, 3).join(', ')}`);

      // Get all restaurants and filter by matched cities
      const restaurants = await restaurantService.getAllRestaurantsWithLocations();

      const matchingRestaurants = restaurants.filter(restaurant => {
        // Check if any of the restaurant's locations match our city list
        if (restaurant.locations && restaurant.locations.length > 0) {
          return restaurant.locations.some(location =>
            location.city && matchedCities.some(matchedCity =>
              location.city.toLowerCase().includes(matchedCity.toLowerCase()) ||
              matchedCity.toLowerCase().includes(location.city.toLowerCase())
            )
          );
        }

        // Fallback to address parsing for older data
        const inferredCity = this.inferCityFromAddress(restaurant.address || '');
        if (inferredCity) {
          return matchedCities.some(matchedCity =>
            inferredCity.toLowerCase().includes(matchedCity.toLowerCase()) ||
            matchedCity.toLowerCase().includes(inferredCity.toLowerCase())
          );
        }

        return false;
      });

      console.log(`🏙️ Found ${matchingRestaurants.length} restaurants in matched cities`);
      return matchingRestaurants;

    } catch (error) {
      console.error('Error finding restaurants by city:', error);
      return [];
    }
  }

  private inferCityFromAddress(address: string): string | null {
    if (!address) return null;

    // Simple city inference from address patterns
    const addressLower = address.toLowerCase();

    // UK cities and areas
    const ukCities = ['london', 'manchester', 'liverpool', 'edinburgh', 'glasgow', 'birmingham', 'bristol', 'leeds', 'cardiff'];
    for (const city of ukCities) {
      if (addressLower.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    // International cities
    const internationalCities = ['paris', 'barcelona', 'madrid', 'rome', 'berlin', 'amsterdam', 'brussels'];
    for (const city of internationalCities) {
      if (addressLower.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }

    return null;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[len2][len1];
  }
}

// Main Smart Geo Search service implementing three-tier strategy
export class SmartGeoSearchService {
  private geocodingService: GeocodingService;
  private cityMatcher: CityMatcher;

  constructor() {
    this.geocodingService = new GeocodingService();
    this.cityMatcher = new CityMatcher();
  }

  async search(query: string, userLocation?: Coordinates): Promise<SearchResult> {
    const startTime = Date.now();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return {
        restaurants: [],
        strategy: 'local',
        message: 'Please enter a search term',
        searchTime: Date.now() - startTime
      };
    }

    console.log(`🔍 Starting smart search for: "${trimmedQuery}"`);

    try {
      // TIER 1: Local text search (fast, no API calls)
      const localResults = await this.localTextSearch(trimmedQuery);
      if (localResults.length > 0) {
        console.log(`✅ Local search found ${localResults.length} results`);
        return {
          restaurants: localResults,
          strategy: 'local',
          message: `Found ${localResults.length} restaurant${localResults.length !== 1 ? 's' : ''} matching "${trimmedQuery}"`,
          searchTime: Date.now() - startTime
        };
      }

      console.log(`⚠️ Local search found 0 results, trying geocoding...`);

      // TIER 2: Geocoding + radius search (smart, uses API)
      const geocodingResult = await this.geocodingService.geocode(trimmedQuery, userLocation);

      if (geocodingResult) {
        const radiusResults = await this.radiusSearch(geocodingResult.coordinates);

        if (radiusResults.length > 0) {
          console.log(`✅ Proximity search found ${radiusResults.length} results near ${geocodingResult.formattedAddress}`);
          return {
            restaurants: radiusResults,
            strategy: 'proximity',
            searchLocation: {
              name: trimmedQuery,
              coordinates: geocodingResult.coordinates,
              city: geocodingResult.city,
              formattedAddress: geocodingResult.formattedAddress
            },
            message: `Found ${radiusResults.length} restaurant${radiusResults.length !== 1 ? 's' : ''} within walking distance of ${this.getLocationDisplayName(geocodingResult)}`,
            searchTime: Date.now() - startTime
          };
        }

        console.log(`⚠️ Proximity search found 0 results, trying city fallback...`);

        // TIER 3: City fallback search (broad, last resort)
        if (geocodingResult.city) {
          const cityResults = await this.cityMatcher.findRestaurantsByCity(geocodingResult.city);

          if (cityResults.length > 0) {
            console.log(`✅ City fallback found ${cityResults.length} results in ${geocodingResult.city}`);
            return {
              restaurants: cityResults,
              strategy: 'city',
              searchLocation: {
                name: trimmedQuery,
                coordinates: geocodingResult.coordinates,
                city: geocodingResult.city,
                formattedAddress: geocodingResult.formattedAddress
              },
              message: `No restaurants near ${this.getLocationDisplayName(geocodingResult)}. Showing all restaurants in ${geocodingResult.city}.`,
              searchTime: Date.now() - startTime
            };
          }
        }
      }

      // No results found at any tier
      console.log(`❌ Smart search found no results for: "${trimmedQuery}"`);
      return {
        restaurants: [],
        strategy: 'local',
        message: `No restaurants found for "${trimmedQuery}". Try searching for a neighborhood, landmark, or restaurant name.`,
        searchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Smart search failed:', error);

      // Fallback to local search on error
      const fallbackResults = await this.localTextSearch(trimmedQuery);
      return {
        restaurants: fallbackResults,
        strategy: 'local',
        message: fallbackResults.length > 0
          ? `Found ${fallbackResults.length} restaurant${fallbackResults.length !== 1 ? 's' : ''} matching "${trimmedQuery}"`
          : `Search temporarily unavailable. Found ${fallbackResults.length} local results for "${trimmedQuery}".`,
        searchTime: Date.now() - startTime
      };
    }
  }

  private async localTextSearch(query: string): Promise<Restaurant[]> {
    // Use existing restaurant filtering with text search
    return await restaurantService.getFilteredRestaurants({
      searchText: query
    });
  }

  private async radiusSearch(coordinates: Coordinates, maxWalkingMinutes: number = 20): Promise<Restaurant[]> {
    // Reuse existing location-based filtering from "Near Me" functionality
    return await restaurantService.getFilteredRestaurants({
      location: {
        ...coordinates,
        maxWalkingMinutes
      }
    });
  }

  private getLocationDisplayName(geocodingResult: GeocodingResult): string {
    // Create a friendly display name for the location
    if (geocodingResult.city && geocodingResult.formattedAddress.toLowerCase().includes(geocodingResult.city.toLowerCase())) {
      // If city is in formatted address, just use the main location part
      const parts = geocodingResult.formattedAddress.split(',');
      return parts[0] || geocodingResult.formattedAddress;
    }

    return geocodingResult.formattedAddress.split(',')[0] || geocodingResult.formattedAddress;
  }
}

// Export singleton instance
export const smartGeoSearch = new SmartGeoSearchService();