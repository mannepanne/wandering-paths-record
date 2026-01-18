// Category system facet types
export type CuisinePrimary =
  | 'British' | 'Nordic' | 'French' | 'Italian' | 'Spanish' | 'Portuguese' | 'Greek' | 'Balkan' | 'European'
  | 'Japanese' | 'Chinese' | 'Korean' | 'Thai' | 'Vietnamese' | 'Malaysian'
  | 'Indian' | 'Middle Eastern' | 'African' | 'Caribbean'
  | 'Mexican' | 'South American' | 'American' | 'Australian' | 'Filipino'
  | 'Martian'; // For the truly unclassifiable

export type CuisineSecondary = CuisinePrimary; // Same values, used for fusion

export type RestaurantStyle = 'Traditional' | 'Modern' | 'Fusion' | 'Casual' | 'Fine Dining' | 'Street Food';

export type RestaurantVenue = 'Restaurant' | 'Cafe' | 'Pub' | 'Bar' | 'Bakery';

export type RestaurantSpecialty =
  | 'BBQ' | 'Seafood' | 'Steakhouse' | 'Ramen' | 'Pizza' | 'Sushi' | 'Tapas' | 'Tasting Menu' | 'Brunch' | 'Breakfast';

// Category facet value lists for UI dropdowns
export const CUISINE_OPTIONS: CuisinePrimary[] = [
  'British', 'Nordic', 'French', 'Italian', 'Spanish', 'Portuguese', 'Greek', 'Balkan', 'European',
  'Japanese', 'Chinese', 'Korean', 'Thai', 'Vietnamese', 'Malaysian',
  'Indian', 'Middle Eastern', 'African', 'Caribbean',
  'Mexican', 'South American', 'American', 'Australian', 'Filipino',
  'Martian' // For the truly unclassifiable
];

export const STYLE_OPTIONS: RestaurantStyle[] = [
  'Traditional', 'Modern', 'Fusion', 'Casual', 'Fine Dining', 'Street Food'
];

export const VENUE_OPTIONS: RestaurantVenue[] = [
  'Restaurant', 'Cafe', 'Pub', 'Bar', 'Bakery'
];

export const SPECIALTY_OPTIONS: RestaurantSpecialty[] = [
  'BBQ', 'Seafood', 'Steakhouse', 'Ramen', 'Pizza', 'Sushi', 'Tapas', 'Tasting Menu', 'Brunch', 'Breakfast'
];

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
  status: 'to-visit' | 'visited';
  personal_appreciation: 'unknown' | 'avoid' | 'fine' | 'good' | 'great';
  description?: string;
  visit_count?: number;
  cuisine?: string; // Legacy field - kept during migration
  // New category facets
  cuisine_primary?: CuisinePrimary;
  cuisine_secondary?: CuisineSecondary; // For fusion restaurants
  style?: RestaurantStyle;
  venue?: RestaurantVenue;
  specialty?: RestaurantSpecialty[];
  must_try_dishes?: string[];
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string;
  source?: string; // Brief note about how the restaurant was discovered
  source_url?: string; // Optional URL where restaurant was found/mentioned
  created_at: string;
  updated_at: string;
  locations?: RestaurantAddress[]; // From joined restaurant_addresses query
  // NOTE: Coordinates are available via the restaurant_addresses table/locations array
  // restaurants_with_locations view now shows individual locations, not restaurant aggregations
  latitude?: number; // Legacy field, use locations array for proper multi-location support
  longitude?: number; // Legacy field, use locations array for proper multi-location support
  // Phase 2: Public review enrichment fields
  public_rating_count?: number; // Number of Google Maps reviews
  public_review_summary?: string; // AI-generated summary of reviews
  public_review_summary_updated_at?: string; // When summary was last generated
  public_review_latest_created_at?: string; // Date of most recent review
}

// Phase 4: Personal appreciation system types
export type PersonalAppreciation = 'unknown' | 'avoid' | 'fine' | 'good' | 'great';
export type RestaurantStatus = 'to-visit' | 'visited';

export interface AppreciationLevel {
  value: PersonalAppreciation;
  label: string;
  description: string;
  icon: string;
  badgeStyle: string;
}

// Appreciation level definitions for UI
export const APPRECIATION_LEVELS: Record<PersonalAppreciation, AppreciationLevel> = {
  unknown: {
    value: 'unknown',
    label: 'Not visited',
    description: 'Haven\'t been here yet',
    icon: '?',
    badgeStyle: 'hidden' // No badge for unknown
  },
  avoid: {
    value: 'avoid',
    label: 'Skip this',
    description: 'I went here so you didn\'t have to',
    icon: '⚠',
    badgeStyle: 'bg-red-100 text-red-800 border-red-200'
  },
  fine: {
    value: 'fine',
    label: 'It\'s fine',
    description: 'Perfectly fine but won\'t return or recommend',
    icon: '○',
    badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200'
  },
  good: {
    value: 'good',
    label: 'Recommend',
    description: 'Would recommend to friends but won\'t seek out again',
    icon: '✓',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  great: {
    value: 'great',
    label: 'Must visit!',
    description: 'Will definitely return, people are missing out',
    icon: '★',
    badgeStyle: 'bg-green-100 text-green-800 border-green-200'
  }
};

// For backward compatibility during transition
export type Place = Restaurant;