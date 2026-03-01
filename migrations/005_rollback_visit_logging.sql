-- Rollback: Remove restaurant_visits table and related objects
-- This script safely rolls back migrations 003 and 004
-- Created: 2026-03-01
-- Part of: Visit Logging Feature - Phase 1 Rollback

-- ============================================================================
-- IMPORTANT: Rollback Strategy
-- ============================================================================
-- This rollback is DESTRUCTIVE and will:
-- 1. Drop all visit records (including migrated data)
-- 2. Remove the restaurant_visits table
-- 3. Remove the trigger and trigger function
-- 4. Keep the personal_appreciation ENUM type (safe to leave, may be used by restaurants table)
-- 5. Keep restaurants.personal_appreciation values unchanged
--
-- BEFORE RUNNING:
-- - Backup the database if you have visit data you want to preserve
-- - Verify restaurants.personal_appreciation values are correct
-- - Understand that all visit history will be lost
-- ============================================================================

-- ============================================================================
-- 1. Drop trigger (must happen before dropping function)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_cached_rating ON restaurant_visits;

-- ============================================================================
-- 2. Drop trigger function
-- ============================================================================
DROP FUNCTION IF EXISTS update_restaurant_cached_rating();

-- ============================================================================
-- 3. Drop table (CASCADE removes foreign key constraints)
-- ============================================================================
-- Note: This is the destructive step - all visit data will be lost
DROP TABLE IF EXISTS restaurant_visits CASCADE;

-- ============================================================================
-- 4. Optional: Drop ENUM type if not used by restaurants table
-- ============================================================================
-- COMMENTED OUT: The personal_appreciation ENUM is still used by restaurants.personal_appreciation
-- Only uncomment if you're also removing the field from restaurants table
-- DROP TYPE IF EXISTS personal_appreciation;

-- ============================================================================
-- Verification queries (commented out - uncomment to verify rollback)
-- ============================================================================

-- Verify table is gone
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables
--   WHERE table_name = 'restaurant_visits'
-- ) AS table_exists;

-- Verify trigger is gone
-- SELECT COUNT(*) AS trigger_count
-- FROM information_schema.triggers
-- WHERE event_object_table = 'restaurant_visits';

-- Verify function is gone
-- SELECT COUNT(*) AS function_count
-- FROM pg_proc
-- WHERE proname = 'update_restaurant_cached_rating';

-- Verify restaurants.personal_appreciation values are intact
-- SELECT
--   COUNT(*) FILTER (WHERE personal_appreciation IS NOT NULL) AS restaurants_with_ratings,
--   COUNT(*) FILTER (WHERE personal_appreciation IS NULL) AS restaurants_without_ratings,
--   COUNT(*) AS total_restaurants
-- FROM restaurants;
