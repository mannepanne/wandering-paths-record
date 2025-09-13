-- Phase 2: Add public review fields to restaurants table
-- Run this migration in your Supabase SQL Editor

-- Add new fields to restaurants table for public review data
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS public_rating_count INTEGER,
ADD COLUMN IF NOT EXISTS public_review_summary TEXT,
ADD COLUMN IF NOT EXISTS public_review_summary_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS public_review_latest_created_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_public_rating_count ON restaurants(public_rating_count);
CREATE INDEX IF NOT EXISTS idx_restaurants_review_summary_updated ON restaurants(public_review_summary_updated_at);

-- Add comments for documentation
COMMENT ON COLUMN restaurants.public_rating_count IS 'Number of Google Maps reviews (e.g. 78 reviews)';
COMMENT ON COLUMN restaurants.public_review_summary IS 'AI-generated summary of Google Maps reviews';
COMMENT ON COLUMN restaurants.public_review_summary_updated_at IS 'When the review summary was last generated';
COMMENT ON COLUMN restaurants.public_review_latest_created_at IS 'Date of the most recent Google Maps review';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN (
    'public_rating_count',
    'public_review_summary',
    'public_review_summary_updated_at',
    'public_review_latest_created_at'
  );