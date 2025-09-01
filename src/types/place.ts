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
  opening_hours?: any; // JSON data for hours
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string; // Human-readable summary
  latitude?: number; // Deprecated - use addresses table
  longitude?: number; // Deprecated - use addresses table
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
  locations?: RestaurantAddress[]; // From the view query
}

// For backward compatibility during transition
export type Place = Restaurant;