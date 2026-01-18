-- Migration Script: Cuisine to Facets
-- This script maps existing cuisine values to the new faceted category system
-- Run in Supabase SQL Editor
-- Created: January 2026

-- ============================================
-- STEP 1: Direct mappings (no inference needed)
-- ============================================

-- Modern European -> European, Modern
UPDATE restaurants SET cuisine_primary = 'European', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern European' AND cuisine_primary IS NULL;

-- British variants
UPDATE restaurants SET cuisine_primary = 'British', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'British' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'British', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern British' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'British', style = 'Traditional', venue = 'Cafe'
WHERE cuisine = 'British Seaside Cafe' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'British', style = 'Traditional', venue = 'Restaurant', specialty = ARRAY['Steakhouse']
WHERE cuisine = 'British Steakhouse' AND cuisine_primary IS NULL;

-- Japanese variants
UPDATE restaurants SET cuisine_primary = 'Japanese', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Japanese' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Japanese', cuisine_secondary = 'Italian', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Italian-Japanese Fusion' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Japanese', style = 'Modern', venue = 'Cafe'
WHERE cuisine = 'Modern Cafe & Japanese' AND cuisine_primary IS NULL;

-- Italian variants
UPDATE restaurants SET cuisine_primary = 'Italian', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Italian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Italian', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern Italian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Italian', cuisine_secondary = 'American', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Italian-American' AND cuisine_primary IS NULL;

-- Thai variants
UPDATE restaurants SET cuisine_primary = 'Thai', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Thai' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Thai', style = 'Casual', venue = 'Pub'
WHERE cuisine = 'Pub / Thai' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Thai', cuisine_secondary = 'Malaysian', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Thai-Malay' AND cuisine_primary IS NULL;

-- Chinese variants
UPDATE restaurants SET cuisine_primary = 'Chinese', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine IN ('Chinese', 'Chinese (Xinjiang)') AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Chinese', style = 'Modern', venue = 'Restaurant'
WHERE cuisine IN ('Contemporary Chinese', 'Modern Chinese') AND cuisine_primary IS NULL;

-- Portuguese variants
UPDATE restaurants SET cuisine_primary = 'Portuguese', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Portuguese' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Portuguese', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern Portuguese' AND cuisine_primary IS NULL;

-- French variants
UPDATE restaurants SET cuisine_primary = 'French', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'French' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'French', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern French' AND cuisine_primary IS NULL;

-- Spanish variants
UPDATE restaurants SET cuisine_primary = 'Spanish', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Spanish' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Spanish', style = 'Traditional', venue = 'Restaurant', specialty = ARRAY['Tapas']
WHERE cuisine = 'Tapas' AND cuisine_primary IS NULL;

-- Korean variants
UPDATE restaurants SET cuisine_primary = 'Korean', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Korean' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Korean', cuisine_secondary = 'Japanese', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Korean & Japanese' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Korean', cuisine_secondary = 'European', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Korean-European Fusion' AND cuisine_primary IS NULL;

-- Indian variants
UPDATE restaurants SET cuisine_primary = 'Indian', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine IN ('Indian', 'Pakistan') AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Indian', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern Indian' AND cuisine_primary IS NULL;

-- Nordic/Scandinavian variants
UPDATE restaurants SET cuisine_primary = 'Nordic', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Scandinavian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Nordic', style = 'Modern', venue = 'Restaurant'
WHERE cuisine IN ('Modern Nordic', 'Modern Faroese') AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Nordic', style = 'Modern', venue = 'Restaurant', specialty = ARRAY['Seafood']
WHERE cuisine = 'Modern Scandinavian Seafood' AND cuisine_primary IS NULL;

-- American variants
UPDATE restaurants SET cuisine_primary = 'American', style = 'Traditional', venue = 'Restaurant', specialty = ARRAY['BBQ']
WHERE cuisine = 'American BBQ' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'American', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'American Southern' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'American', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern American' AND cuisine_primary IS NULL;

-- Australian variants
UPDATE restaurants SET cuisine_primary = 'Australian', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Australian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Australian', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Modern Australian' AND cuisine_primary IS NULL;

-- Other European
UPDATE restaurants SET cuisine_primary = 'European', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Austrian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Greek', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Greek' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Balkan', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Balkan/Eastern Mediterranean' AND cuisine_primary IS NULL;

-- Other Asian
UPDATE restaurants SET cuisine_primary = 'Vietnamese', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Vietnamese' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Malaysian', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Malaysian' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Filipino', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine IN ('Filipino', 'Taiwanese') AND cuisine_primary IS NULL;

-- Middle Eastern
UPDATE restaurants SET cuisine_primary = 'Middle Eastern', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine IN ('Middle Eastern', 'Kurdish') AND cuisine_primary IS NULL;

-- African & Caribbean
UPDATE restaurants SET cuisine_primary = 'African', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'African' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Caribbean', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Caribbean' AND cuisine_primary IS NULL;

-- Americas (non-US)
UPDATE restaurants SET cuisine_primary = 'Mexican', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Mexican' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'South American', style = 'Traditional', venue = 'Restaurant'
WHERE cuisine = 'Chilean/South American' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'Mexican', cuisine_secondary = 'European', style = 'Fusion', venue = 'Restaurant'
WHERE cuisine = 'Polish & Mexican' AND cuisine_primary IS NULL;

-- ============================================
-- STEP 2: Venue-only mappings (need cuisine inference)
-- These will be set to European as fallback, review manually
-- ============================================

UPDATE restaurants SET cuisine_primary = 'European', style = 'Casual', venue = 'Cafe'
WHERE cuisine = 'Cafe' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'European', style = 'Casual', venue = 'Bakery'
WHERE cuisine = 'Bakery/Cafe' AND cuisine_primary IS NULL;

UPDATE restaurants SET cuisine_primary = 'European', style = 'Casual', venue = 'Bar'
WHERE cuisine = 'Bar only' AND cuisine_primary IS NULL;

-- ============================================
-- STEP 3: Special cases requiring manual review
-- ============================================

-- Martian? - Set to European as placeholder, needs manual review
UPDATE restaurants SET cuisine_primary = 'European', style = 'Modern', venue = 'Restaurant'
WHERE cuisine = 'Martian?' AND cuisine_primary IS NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check for any unmigrated restaurants
-- SELECT id, name, cuisine, cuisine_primary FROM restaurants WHERE cuisine_primary IS NULL AND cuisine IS NOT NULL;

-- Count by new cuisine_primary
-- SELECT cuisine_primary, COUNT(*) as count FROM restaurants WHERE cuisine_primary IS NOT NULL GROUP BY cuisine_primary ORDER BY count DESC;

-- Count by style
-- SELECT style, COUNT(*) as count FROM restaurants WHERE style IS NOT NULL GROUP BY style ORDER BY count DESC;

-- Count by venue
-- SELECT venue, COUNT(*) as count FROM restaurants WHERE venue IS NOT NULL GROUP BY venue ORDER BY count DESC;

-- Show fusion restaurants (have secondary cuisine)
-- SELECT name, cuisine, cuisine_primary, cuisine_secondary, style FROM restaurants WHERE cuisine_secondary IS NOT NULL;

-- Show restaurants with specialties
-- SELECT name, cuisine, cuisine_primary, specialty FROM restaurants WHERE specialty IS NOT NULL AND array_length(specialty, 1) > 0;
