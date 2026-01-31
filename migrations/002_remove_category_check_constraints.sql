-- Migration: Remove CHECK constraints on category fields to allow dynamic values
-- This allows users to add custom cuisines, styles, and venues not in predefined lists
-- Created: 2026-01-31

-- Drop check constraint on cuisine_primary (allows custom cuisines like "Burmese")
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS check_cuisine_primary;

-- Drop check constraint on cuisine_secondary if it exists
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS check_cuisine_secondary;

-- Drop check constraint on style if it exists
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS check_style;

-- Drop check constraint on venue if it exists
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS check_venue;

-- Verification: Check remaining constraints on restaurants table
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'restaurants'::regclass
-- ORDER BY conname;
