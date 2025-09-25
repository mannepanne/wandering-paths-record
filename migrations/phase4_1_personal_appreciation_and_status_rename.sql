-- Phase 4.1: Personal Appreciation System & Status Terminology Migration
-- Run this script in your Supabase SQL Editor
-- Date: 2025-01-22

BEGIN;

-- 1. Add personal_appreciation column with behavioral rating scale
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS personal_appreciation TEXT
CHECK (personal_appreciation IN ('unknown', 'avoid', 'fine', 'good', 'great'))
DEFAULT 'unknown';

-- 2. Update status constraint to reflect new terminology (BEFORE updating data)
ALTER TABLE restaurants
DROP CONSTRAINT IF EXISTS places_status_check;

ALTER TABLE restaurants
ADD CONSTRAINT restaurants_status_check
CHECK (status IN ('to-visit', 'visited'));

-- 3. Update status terminology from "must-visit" to "to-visit" (AFTER removing constraint)
UPDATE restaurants
SET status = 'to-visit'
WHERE status = 'must-visit';

-- 4. Add helpful comments for documentation
COMMENT ON COLUMN restaurants.personal_appreciation IS 'Behavioral appreciation scale: unknown (not visited), avoid (warn others), fine (okay but won''t return), good (would recommend), great (must visit again)';
COMMENT ON COLUMN restaurants.status IS 'Visit planning status: to-visit (on discovery list), visited (been there)';

-- 5. Create index for efficient filtering by appreciation level
CREATE INDEX IF NOT EXISTS idx_restaurants_personal_appreciation
ON restaurants(personal_appreciation);

-- 6. Verify migration success
DO $$
DECLARE
    appreciation_count INTEGER;
    status_constraint_exists BOOLEAN;
BEGIN
    -- Check if personal_appreciation column exists and has correct constraint
    SELECT COUNT(*) INTO appreciation_count
    FROM information_schema.columns
    WHERE table_name = 'restaurants'
    AND column_name = 'personal_appreciation';

    -- Check if status constraint was updated
    SELECT EXISTS(
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'restaurants'
        AND ccu.column_name = 'status'
        AND cc.check_clause LIKE '%to-visit%'
    ) INTO status_constraint_exists;

    -- Report migration status
    RAISE NOTICE '=== Phase 4.1 Migration Results ===';
    RAISE NOTICE 'personal_appreciation column: %',
        CASE WHEN appreciation_count > 0 THEN '✅ Added successfully' ELSE '❌ Not found' END;
    RAISE NOTICE 'Status constraint updated: %',
        CASE WHEN status_constraint_exists THEN '✅ Updated to to-visit/visited' ELSE '❌ Still using old values' END;

    IF appreciation_count = 0 OR NOT status_constraint_exists THEN
        RAISE EXCEPTION 'Migration failed - please check for errors above';
    END IF;

    RAISE NOTICE '🎉 Phase 4.1 database migration completed successfully!';
END $$;

COMMIT;

-- 7. Verification query (run separately to confirm results)
/*
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
AND column_name IN ('personal_appreciation', 'status')
ORDER BY column_name;

-- Check that status values were updated
SELECT status, COUNT(*) as count
FROM restaurants
GROUP BY status
ORDER BY status;

-- Verify all restaurants have default appreciation value
SELECT personal_appreciation, COUNT(*) as count
FROM restaurants
GROUP BY personal_appreciation
ORDER BY personal_appreciation;
*/