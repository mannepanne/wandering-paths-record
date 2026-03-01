// ABOUT: Service functions for restaurant visit logging
// ABOUT: Handles CRUD operations for restaurant_visits table

import { supabase } from '@/lib/supabase';
import { RestaurantVisit, PersonalAppreciation } from '@/types/place';

/**
 * Input data for creating a new visit
 */
interface CreateVisitInput {
  restaurant_id: string;
  visit_date: string; // ISO date string (YYYY-MM-DD)
  rating: PersonalAppreciation;
  experience_notes?: string;
  company_notes?: string;
}

/**
 * Validates and sanitizes visit input data
 * @param input - Raw visit input data
 * @returns Sanitized input data
 * @throws Error if validation fails
 */
const validateVisitInput = (input: CreateVisitInput): CreateVisitInput => {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visit_date)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Validate date range (not in future, not before 1900)
  const visitDate = new Date(input.visit_date);
  const minDate = new Date('1900-01-01');
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Allow today's date

  if (isNaN(visitDate.getTime())) {
    throw new Error('Invalid date');
  }

  if (visitDate < minDate || visitDate > today) {
    throw new Error('Visit date must be between 1900-01-01 and today');
  }

  // Sanitize text fields: strip HTML tags, trim whitespace
  const stripHtml = (text?: string): string | undefined => {
    if (!text) return undefined;
    return text.replace(/<[^>]*>/g, '').trim() || undefined;
  };

  const sanitizedExperienceNotes = stripHtml(input.experience_notes);
  const sanitizedCompanyNotes = stripHtml(input.company_notes);

  // Validate length constraints
  if (sanitizedExperienceNotes && sanitizedExperienceNotes.length > 2000) {
    throw new Error('Experience notes must be 2000 characters or less');
  }

  if (sanitizedCompanyNotes && sanitizedCompanyNotes.length > 500) {
    throw new Error('Company notes must be 500 characters or less');
  }

  return {
    restaurant_id: input.restaurant_id,
    visit_date: input.visit_date,
    rating: input.rating,
    experience_notes: sanitizedExperienceNotes,
    company_notes: sanitizedCompanyNotes,
  };
};

export const visitService = {
  /**
   * Get all visits for a specific restaurant, ordered by visit date (newest first)
   * @param restaurantId - The restaurant ID to fetch visits for
   * @returns Array of visits for the restaurant
   */
  async getVisitsByRestaurant(restaurantId: string): Promise<RestaurantVisit[]> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching visits:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get latest N visits for a restaurant (for pagination/preview)
   * @param restaurantId - The restaurant ID to fetch visits for
   * @param limit - Maximum number of visits to return (default: 5)
   * @returns Array of latest visits
   */
  async getLatestVisits(restaurantId: string, limit: number = 5): Promise<RestaurantVisit[]> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching latest visits:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get visit count for a restaurant
   * @param restaurantId - The restaurant ID
   * @returns Number of visits for the restaurant
   */
  async getVisitCount(restaurantId: string): Promise<number> {
    const { count, error } = await supabase
      .from('restaurant_visits')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('Error fetching visit count:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Get a single visit by ID
   * @param visitId - The visit ID
   * @returns The visit record
   */
  async getVisitById(visitId: string): Promise<RestaurantVisit | null> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (error) {
      console.error('Error fetching visit:', error);
      throw error;
    }

    return data;
  },

  /**
   * Add a new visit to a restaurant
   * @param input - Visit data to create
   * @returns The created visit record
   * @throws Error if validation fails or database operation fails
   */
  async addVisit(input: CreateVisitInput): Promise<RestaurantVisit> {
    // Validate and sanitize input
    const validatedInput = validateVisitInput(input);

    // Get current user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to add visits');
    }

    // Insert visit record
    const { data, error } = await supabase
      .from('restaurant_visits')
      .insert({
        restaurant_id: validatedInput.restaurant_id,
        user_id: user.id,
        visit_date: validatedInput.visit_date,
        rating: validatedInput.rating,
        experience_notes: validatedInput.experience_notes,
        company_notes: validatedInput.company_notes,
        is_migrated_placeholder: false, // New visits are not migrated data
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding visit:', error);

      // Check for duplicate visit on same date
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('You already logged a visit to this restaurant on this date');
      }

      throw error;
    }

    return data;
  },
};

// Export the CreateVisitInput type for use in components
export type { CreateVisitInput };
