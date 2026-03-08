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
 * Input data for updating an existing visit
 * Note: restaurant_id is intentionally excluded - visits cannot be reassigned to different restaurants
 */
interface UpdateVisitInput {
  visit_date: string; // ISO date string (YYYY-MM-DD)
  rating: PersonalAppreciation;
  experience_notes?: string;
  company_notes?: string;
}

// ============================================================================
// Shared Validation Helpers
// ============================================================================

/**
 * Strips HTML-like characters and trims whitespace from text
 * @param text - Input text to sanitize
 * @returns Sanitized text or undefined if empty
 * @throws Error if HTML-like characters are found
 */
const stripHtml = (text?: string): string | undefined => {
  if (!text) return undefined;

  const trimmed = text.trim();
  if (!trimmed) return undefined;

  // Reject any HTML-like characters to prevent XSS attacks
  // This prevents: <script>, encoded HTML entities (&lt;), event handlers, etc.
  if (/<|>|&/.test(trimmed)) {
    throw new Error('HTML and special characters are not allowed in notes');
  }

  return trimmed;
};

/**
 * Validates that rating is a valid appreciation level (not 'unknown')
 * @param rating - Rating to validate
 * @throws Error if rating is invalid
 */
const validateRating = (rating: PersonalAppreciation): void => {
  const validRatings: PersonalAppreciation[] = ['avoid', 'fine', 'good', 'great'];
  if (!validRatings.includes(rating)) {
    throw new Error('Rating must be a valid appreciation level (avoid, fine, good, or great)');
  }
};

/**
 * Validates date format and range
 * @param visitDate - Date string to validate (YYYY-MM-DD)
 * @throws Error if date format is invalid or out of range
 */
const validateDate = (visitDate: string): void => {
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Validate date range (not in future, not before 1900)
  // Use string comparison to avoid timezone issues with YYYY-MM-DD format
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  const minDateStr = '1900-01-01';

  if (visitDate < minDateStr || visitDate > todayStr) {
    throw new Error('Visit date must be between 1900-01-01 and today');
  }
};

/**
 * Sanitizes and validates notes fields
 * @param experienceNotes - Optional experience notes
 * @param companyNotes - Optional company notes
 * @returns Object with sanitized notes
 * @throws Error if length constraints are violated
 */
const sanitizeAndValidateNotes = (
  experienceNotes?: string,
  companyNotes?: string
): { experience_notes?: string; company_notes?: string } => {
  const sanitizedExperienceNotes = stripHtml(experienceNotes);
  const sanitizedCompanyNotes = stripHtml(companyNotes);

  // Validate length constraints
  if (sanitizedExperienceNotes && sanitizedExperienceNotes.length > 2000) {
    throw new Error('Experience notes must be 2000 characters or less');
  }

  if (sanitizedCompanyNotes && sanitizedCompanyNotes.length > 500) {
    throw new Error('Company notes must be 500 characters or less');
  }

  return {
    experience_notes: sanitizedExperienceNotes,
    company_notes: sanitizedCompanyNotes,
  };
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates and sanitizes visit input data
 * @param input - Raw visit input data
 * @returns Sanitized input data
 * @throws Error if validation fails
 */
const validateVisitInput = (input: CreateVisitInput): CreateVisitInput => {
  // Validate restaurant_id
  if (!input.restaurant_id || input.restaurant_id.trim() === '') {
    throw new Error('Restaurant ID is required');
  }

  validateRating(input.rating);
  validateDate(input.visit_date);
  const sanitizedNotes = sanitizeAndValidateNotes(input.experience_notes, input.company_notes);

  return {
    restaurant_id: input.restaurant_id,
    visit_date: input.visit_date,
    rating: input.rating,
    ...sanitizedNotes,
  };
};

/**
 * Validates and sanitizes visit update input data
 * @param input - Raw visit update input data
 * @returns Sanitized input data
 * @throws Error if validation fails
 */
const validateUpdateInput = (input: UpdateVisitInput): UpdateVisitInput => {
  validateRating(input.rating);
  validateDate(input.visit_date);
  const sanitizedNotes = sanitizeAndValidateNotes(input.experience_notes, input.company_notes);

  return {
    visit_date: input.visit_date,
    rating: input.rating,
    ...sanitizedNotes,
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
   * Get all visits for a restaurant (for dedicated visits page)
   * @param restaurantId - The restaurant ID to fetch visits for
   * @returns Array of all visits, sorted by date (newest first)
   */
  async getAllVisits(restaurantId: string): Promise<RestaurantVisit[]> {
    const { data, error } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all visits:', error);
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
        throw new Error(
          `You already logged a visit to this restaurant on ${validatedInput.visit_date}. ` +
          'You can edit the existing visit or choose a different date.'
        );
      }

      throw error;
    }

    return data;
  },

  /**
   * Update an existing visit
   * @param visitId - The visit ID to update
   * @param input - Updated visit data
   * @returns The updated visit record
   * @throws Error if validation fails or database operation fails
   */
  async updateVisit(visitId: string, input: UpdateVisitInput): Promise<RestaurantVisit> {
    // Validate and sanitize input
    const validatedInput = validateUpdateInput(input);

    // Get current user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to update visits');
    }

    // Get the existing visit to check if date is being changed
    const { data: existingVisit, error: fetchError } = await supabase
      .from('restaurant_visits')
      .select('*')
      .eq('id', visitId)
      .single();

    if (fetchError) {
      console.error('Error fetching visit for update:', fetchError);
      throw new Error('Visit not found');
    }

    // Migrated placeholder logic:
    // - Visits migrated from the old system have is_migrated_placeholder = true
    // - These visits have a default date (2024-01-01) since the old system didn't track dates
    // - When user edits the date on a migrated visit, we clear the flag to indicate it's now a real date
    // - This allows us to distinguish between "placeholder date" and "user-confirmed date"
    const isEditingMigratedDate = existingVisit.is_migrated_placeholder &&
                                   existingVisit.visit_date !== validatedInput.visit_date;

    // Update visit record
    const { data, error } = await supabase
      .from('restaurant_visits')
      .update({
        visit_date: validatedInput.visit_date,
        rating: validatedInput.rating,
        experience_notes: validatedInput.experience_notes,
        company_notes: validatedInput.company_notes,
        // Clear migrated flag if user is editing the date (making it a real date now)
        is_migrated_placeholder: isEditingMigratedDate ? false : existingVisit.is_migrated_placeholder,
      })
      .eq('id', visitId)
      .select()
      .single();

    if (error) {
      console.error('Error updating visit:', error);

      // Check for duplicate visit on same date
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(
          `You already have a visit logged for this restaurant on ${validatedInput.visit_date}. ` +
          'Please choose a different date.'
        );
      }

      throw error;
    }

    return data;
  },

  /**
   * Delete a visit
   * @param visitId - The visit ID to delete
   * @throws Error if database operation fails or visit not found
   */
  async deleteVisit(visitId: string): Promise<void> {
    // Get current user from Supabase auth
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be authenticated to delete visits');
    }

    // First check if visit exists and belongs to current user
    const { data: existingVisit, error: fetchError } = await supabase
      .from('restaurant_visits')
      .select('id, user_id')
      .eq('id', visitId)
      .single();

    if (fetchError || !existingVisit) {
      throw new Error('Visit not found or you do not have permission to delete it');
    }

    if (existingVisit.user_id !== user.id) {
      throw new Error('You do not have permission to delete this visit');
    }

    // Delete the visit (RLS policy provides additional security layer)
    const { error } = await supabase
      .from('restaurant_visits')
      .delete()
      .eq('id', visitId);

    if (error) {
      console.error('Error deleting visit:', error);
      throw new Error('Failed to delete visit. Please try again.');
    }
  },
};

// Export types for use in components
export type { CreateVisitInput, UpdateVisitInput };
