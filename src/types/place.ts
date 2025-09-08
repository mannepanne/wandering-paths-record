export interface RestaurantAddress {
  id: string;
  restaurant_id: string;
  location_name: string;
  full_address: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string; // Human-readable summary
  website?: string;
  public_rating?: number;
  personal_rating?: number;
  status: 'must-visit' | 'visited';
  description?: string;
  visit_count?: number;
  cuisine?: string;
  must_try_dishes?: string[];
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string;
  created_at: string;
  updated_at: string;
  locations?: RestaurantAddress[]; // From joined restaurant_addresses query
  // NOTE: Coordinates are available via the restaurant_addresses table/locations array
  // restaurants_with_locations view now shows individual locations, not restaurant aggregations
  latitude?: number; // Legacy field, use locations array for proper multi-location support
  longitude?: number; // Legacy field, use locations array for proper multi-location support
}

// For backward compatibility during transition
export type Place = Restaurant;