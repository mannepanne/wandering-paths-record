-- Migration: Create restaurant_visits table for visit logging system
-- Enables tracking multiple visits per restaurant with dates, ratings, and notes
-- Created: 2026-03-01
-- Part of: Visit Logging Feature - Phase 1 (Database Foundation)

-- ============================================================================
-- 1. Create ENUM type for rating (reuse if exists)
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE personal_appreciation AS ENUM ('avoid', 'fine', 'good', 'great');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Create restaurant_visits table
-- ============================================================================
CREATE TABLE restaurant_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  rating personal_appreciation NOT NULL,
  experience_notes TEXT,
  company_notes TEXT,
  is_migrated_placeholder BOOLEAN DEFAULT FALSE, -- True for migrated historical data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign key constraints
  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Input validation constraints
  CONSTRAINT experience_notes_length CHECK (char_length(experience_notes) <= 2000),
  CONSTRAINT company_notes_length CHECK (char_length(company_notes) <= 500),
  CONSTRAINT visit_date_reasonable CHECK (visit_date >= '1900-01-01' AND visit_date <= CURRENT_DATE),

  -- Prevent duplicate visits on same day
  CONSTRAINT unique_visit_per_day UNIQUE (user_id, restaurant_id, visit_date)
);

-- ============================================================================
-- 3. Create indexes for query performance
-- ============================================================================

-- Single-column indexes
CREATE INDEX idx_visits_restaurant ON restaurant_visits(restaurant_id);
CREATE INDEX idx_visits_user ON restaurant_visits(user_id);
CREATE INDEX idx_visits_date ON restaurant_visits(visit_date DESC);

-- Composite index for common query pattern (get visits for restaurant by user, ordered by date)
CREATE INDEX idx_visits_restaurant_user_date ON restaurant_visits(restaurant_id, user_id, visit_date DESC);

-- ============================================================================
-- 4. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own visits
CREATE POLICY "Users can view own visits"
  ON restaurant_visits FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own visits
CREATE POLICY "Users can insert own visits"
  ON restaurant_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own visits
CREATE POLICY "Users can update own visits"
  ON restaurant_visits FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own visits
CREATE POLICY "Users can delete own visits"
  ON restaurant_visits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Create trigger function to auto-update cached rating
-- ============================================================================
-- This trigger keeps restaurants.personal_appreciation in sync with latest visit
-- Prevents N+1 query problem by maintaining cached rating field

CREATE OR REPLACE FUNCTION update_restaurant_cached_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the restaurant's cached personal_appreciation to latest visit rating
  UPDATE restaurants
  SET personal_appreciation = (
    SELECT rating
    FROM restaurant_visits
    WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
    ORDER BY visit_date DESC, created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to restaurant_visits table
CREATE TRIGGER trigger_update_cached_rating
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_cached_rating();

-- ============================================================================
-- Verification queries (commented out - uncomment to verify migration)
-- ============================================================================

-- Verify table exists with correct structure
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'restaurant_visits'
-- ORDER BY ordinal_position;

-- Verify indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'restaurant_visits'
-- ORDER BY indexname;

-- Verify RLS policies
-- SELECT policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'restaurant_visits';

-- Verify trigger exists
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'restaurant_visits';

-- Verify constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'restaurant_visits'::regclass
-- ORDER BY conname;
