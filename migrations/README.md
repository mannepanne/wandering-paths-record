# Database Migrations

This directory contains SQL migration files for the Wandering Paths restaurant database.

## Migration Files

### Visit Logging Feature (Phase 1)
- **003_create_restaurant_visits_table.sql** - Creates restaurant_visits table with RLS, indexes, and triggers
- **004_migrate_existing_ratings.sql** - Migrates existing ratings to visit records with placeholder dates
- **005_rollback_visit_logging.sql** - Rollback script for migrations 003 and 004

## Running Migrations

### Apply Migrations
```bash
# Run migrations in order through Supabase dashboard
# SQL Editor > New Query > paste migration contents > Run
```

### Verify Migrations
Each migration file includes commented-out verification queries. Uncomment and run them to verify:
- Table structure
- Indexes
- RLS policies
- Triggers
- Data migration results

### Rollback Strategy

**Before rollback:**
1. Backup database if you have visit data to preserve
2. Verify `restaurants.personal_appreciation` values are correct
3. Understand that ALL visit history will be lost

**To rollback:**
```bash
# Run 005_rollback_visit_logging.sql through Supabase dashboard
# This will:
# - Drop restaurant_visits table and all data
# - Remove trigger and trigger function
# - Keep restaurants.personal_appreciation values intact
```

**After rollback:**
- Run verification queries in 005_rollback_visit_logging.sql
- Verify restaurant ratings are unchanged
- No visit history will remain

## Migration Safety Features

### Idempotency
- Migration 003: Uses `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` for ENUM type
- Migration 004: Uses `NOT EXISTS` check to prevent duplicate visit records
- Both can be run multiple times safely

### Data Integrity
- Foreign key constraints with CASCADE delete
- Check constraints for data validation
- Unique constraints prevent duplicate visits per day
- RLS policies ensure user data isolation

### Performance
- Indexes on common query patterns
- Trigger maintains cached rating field (prevents N+1 queries)

## Testing Locally

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Docker running (for local Supabase)

### Local Testing Steps
```bash
# Start local Supabase (if not running)
supabase start

# Apply migration 003
supabase db execute -f migrations/003_create_restaurant_visits_table.sql

# Verify table structure
# Run verification queries from 003_create_restaurant_visits_table.sql

# Apply migration 004
supabase db execute -f migrations/004_migrate_existing_ratings.sql

# Verify data migration
# Run verification queries from 004_migrate_existing_ratings.sql

# Test rollback
supabase db execute -f migrations/005_rollback_visit_logging.sql

# Verify rollback
# Run verification queries from 005_rollback_visit_logging.sql
```

### Manual Testing in Supabase Dashboard
1. Go to SQL Editor in Supabase dashboard
2. Create new query
3. Paste migration file contents
4. Click "Run"
5. Check results in Table Editor
6. Run verification queries to confirm

## Migration Notes

### Migration 004: Existing Ratings
- Uses placeholder date: `2025-01-01`
- Sets `is_migrated_placeholder = TRUE` for all migrated records
- Uses first user from `auth.users` as owner
- Only migrates restaurants with valid ratings (avoid/fine/good/great)
- Fails with error if no users exist in auth.users

### Database Trigger
- Automatically updates `restaurants.personal_appreciation` when visits change
- Uses latest visit (by visit_date DESC, created_at DESC)
- Runs on INSERT, UPDATE, DELETE operations
- Critical for performance (avoids JOINs in restaurant list queries)
