-- Migration: Add source tracking fields to restaurants table
-- Run this script in your Supabase SQL editor

-- Add source and source_url fields to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN restaurants.source IS 'Brief text note about how this restaurant was discovered (e.g., "Friend recommendation", "Instagram", "Food blog")';
COMMENT ON COLUMN restaurants.source_url IS 'Optional URL where the restaurant was discovered or mentioned';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
AND column_name IN ('source', 'source_url');