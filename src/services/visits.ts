// ABOUT: Service functions for restaurant visit logging
// ABOUT: Handles CRUD operations via Worker API endpoints (D1 database)

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

// ============================================================================
// API helper
// ============================================================================

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    // Surface structured error messages from the Worker where possible
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || text);
    } catch {
      throw new Error(`API error ${res.status}: ${text}`);
    }
  }
  return res.json();
}

export const visitService = {
  /**
   * Get all visits for a specific restaurant, ordered by visit date (newest first)
   */
  async getVisitsByRestaurant(restaurantId: string): Promise<RestaurantVisit[]> {
    return apiFetch(`/api/visits/${restaurantId}`);
  },

  /**
   * Get all visits for a restaurant (for dedicated visits page)
   */
  async getAllVisits(restaurantId: string): Promise<RestaurantVisit[]> {
    return apiFetch(`/api/visits/${restaurantId}`);
  },

  /**
   * Get latest N visits for a restaurant
   */
  async getLatestVisits(restaurantId: string, limit: number = 5): Promise<RestaurantVisit[]> {
    const visits: RestaurantVisit[] = await apiFetch(`/api/visits/${restaurantId}`);
    return visits.slice(0, limit);
  },

  /**
   * Get visit count for a restaurant
   */
  async getVisitCount(restaurantId: string): Promise<number> {
    const visits: RestaurantVisit[] = await apiFetch(`/api/visits/${restaurantId}`);
    return visits.filter(v => !v.is_migrated_placeholder).length;
  },

  /**
   * Get a single visit by ID (fetches all visits for the restaurant and finds the match)
   */
  async getVisitById(visitId: string): Promise<RestaurantVisit | null> {
    // Not directly supported by the API — this method is rarely called externally.
    // Components that need a single visit should use getVisitsByRestaurant instead.
    console.warn('getVisitById is not directly supported; use getVisitsByRestaurant');
    return null;
  },

  /**
   * Add a new visit to a restaurant
   * @throws Error if validation fails or request fails
   */
  async addVisit(input: CreateVisitInput): Promise<RestaurantVisit> {
    const validatedInput = validateVisitInput(input);

    try {
      return await apiFetch('/api/admin/visits', {
        method: 'POST',
        body: JSON.stringify(validatedInput),
      });
    } catch (err: any) {
      // Translate generic unique-constraint message to user-friendly one
      if (err.message?.includes('UNIQUE') || err.message?.includes('23505')) {
        throw new Error(
          `You already logged a visit to this restaurant on ${validatedInput.visit_date}. ` +
          'You can edit the existing visit or choose a different date.'
        );
      }
      throw err;
    }
  },

  /**
   * Update an existing visit
   * The Worker handles is_migrated_placeholder logic when the date changes.
   * @throws Error if validation fails or request fails
   */
  async updateVisit(visitId: string, input: UpdateVisitInput): Promise<RestaurantVisit> {
    const validatedInput = validateUpdateInput(input);

    try {
      return await apiFetch(`/api/admin/visits/${visitId}`, {
        method: 'PUT',
        body: JSON.stringify(validatedInput),
      });
    } catch (err: any) {
      if (err.message?.includes('UNIQUE') || err.message?.includes('23505')) {
        throw new Error(
          `You already have a visit logged for this restaurant on ${validatedInput.visit_date}. ` +
          'Please choose a different date.'
        );
      }
      throw err;
    }
  },

  /**
   * Delete a visit
   * @throws Error if request fails
   */
  async deleteVisit(visitId: string): Promise<void> {
    try {
      await apiFetch(`/api/admin/visits/${visitId}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err.message?.includes('404') || err.message?.includes('Not found')) {
        throw new Error('Visit not found or you do not have permission to delete it');
      }
      throw new Error('Failed to delete visit. Please try again.');
    }
  },
};

// Export types for use in components
export type { CreateVisitInput, UpdateVisitInput };
