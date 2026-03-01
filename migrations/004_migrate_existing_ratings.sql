-- Migration: Migrate existing personal_appreciation ratings to restaurant_visits
-- Creates initial visit records for all rated restaurants with placeholder dates
-- Created: 2026-03-01
-- Part of: Visit Logging Feature - Phase 1 (Database Foundation)

-- ============================================================================
-- Data Migration Script
-- ============================================================================
-- This script migrates existing ratings from restaurants.personal_appreciation
-- to the new restaurant_visits table as historical "first visit" records.
--
-- Safety features:
-- - Idempotent: Can be run multiple times without creating duplicates
-- - Uses placeholder date (2025-01-01) with is_migrated_placeholder flag
-- - Only migrates restaurants with valid ratings (not NULL, not 'unknown')
-- - Uses admin user from auth.users table
-- ============================================================================

DO $$
DECLARE
  admin_user_id UUID;
  migrated_count INTEGER := 0;
  placeholder_date DATE := '2025-01-01';
BEGIN
  -- Get the admin user ID (assumes there's only one user in auth.users)
  -- For multi-user systems, this would need to be more sophisticated
  SELECT id INTO admin_user_id
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1;

  -- Verify we found a user
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found in auth.users table. Cannot migrate ratings.';
  END IF;

  RAISE NOTICE 'Using admin user ID: %', admin_user_id;

  -- Migrate existing ratings to restaurant_visits
  -- Only create visit if one doesn't already exist (idempotent)
  INSERT INTO restaurant_visits (
    restaurant_id,
    user_id,
    visit_date,
    rating,
    experience_notes,
    company_notes,
    is_migrated_placeholder,
    created_at,
    updated_at
  )
  SELECT
    r.id AS restaurant_id,
    admin_user_id AS user_id,
    placeholder_date AS visit_date,
    r.personal_appreciation::personal_appreciation AS rating,  -- Cast text to ENUM type
    NULL AS experience_notes,
    NULL AS company_notes,
    TRUE AS is_migrated_placeholder,
    -- NOTE: Using restaurant.updated_at as best approximation of when rating was set
    -- This may not reflect actual rating timestamp if restaurant was edited after rating
    r.updated_at AS created_at,
    r.updated_at AS updated_at
  FROM restaurants r
  WHERE
    -- Only migrate restaurants with valid ratings
    r.personal_appreciation IS NOT NULL
    AND r.personal_appreciation IN ('avoid', 'fine', 'good', 'great')
    -- Don't create duplicate visits (idempotent check)
    AND NOT EXISTS (
      SELECT 1
      FROM restaurant_visits rv
      WHERE rv.restaurant_id = r.id
        AND rv.user_id = admin_user_id
        AND rv.visit_date = placeholder_date
    );

  -- Get count of migrated records
  GET DIAGNOSTICS migrated_count = ROW_COUNT;

  RAISE NOTICE 'Migration complete. Created % visit records from existing ratings.', migrated_count;

  -- The trigger update_restaurant_cached_rating will automatically update
  -- restaurants.personal_appreciation with the newly created visit's rating
  -- (though it should be the same value as before)

END $$;

-- ============================================================================
-- Verification queries (commented out - uncomment to verify migration)
-- ============================================================================

-- Check how many restaurants have ratings
-- SELECT
--   COUNT(*) FILTER (WHERE personal_appreciation IS NOT NULL) AS restaurants_with_ratings,
--   COUNT(*) FILTER (WHERE personal_appreciation IS NULL) AS restaurants_without_ratings,
--   COUNT(*) AS total_restaurants
-- FROM restaurants;

-- Check how many visits were created
-- SELECT COUNT(*) AS migrated_visits
-- FROM restaurant_visits
-- WHERE is_migrated_placeholder = TRUE;

-- Verify migrated visits match existing ratings
-- SELECT
--   r.id,
--   r.name,
--   r.personal_appreciation AS current_rating,
--   rv.rating AS migrated_rating,
--   rv.visit_date,
--   rv.is_migrated_placeholder
-- FROM restaurants r
-- LEFT JOIN restaurant_visits rv ON r.id = rv.restaurant_id
-- WHERE r.personal_appreciation IS NOT NULL
-- ORDER BY r.name
-- LIMIT 20;

-- Check for any discrepancies (should be empty)
-- SELECT
--   r.id,
--   r.name,
--   r.personal_appreciation AS current_rating,
--   rv.rating AS visit_rating
-- FROM restaurants r
-- INNER JOIN restaurant_visits rv ON r.id = rv.restaurant_id
-- WHERE rv.is_migrated_placeholder = TRUE
--   AND r.personal_appreciation != rv.rating;
