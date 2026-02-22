# Supabase Setup Guide

Complete documentation for Supabase database, authentication, and configuration.

**Project ID:** `drtjfbvudzacixvqkzav`
**Project URL:** `https://drtjfbvudzacixvqkzav.supabase.co`
**Dashboard:** https://supabase.com/dashboard/project/drtjfbvudzacixvqkzav

**Key Files:**
- `src/services/restaurants.ts` - Database operations (CRUD)
- `src/lib/supabase.ts` - Supabase client initialization
- `migrations/` - SQL migration scripts

---

## Database Schema

### restaurants table

**Core restaurant information with faceted category system**

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | uuid | ✅ | Primary key (auto-generated) |
| `name` | text | ✅ | Restaurant name |
| `address` | text | ✅ | Human-readable location summary |
| `website` | text | | Official website URL |
| `status` | enum | ✅ | 'to-visit' or 'visited' |
| `personal_appreciation` | enum | ✅ | 'unknown', 'avoid', 'fine', 'good', 'great' |
| `description` | text | | 2-3 sentence summary |
| `visit_count` | integer | | Number of visits |
| `cuisine` | text | | **Legacy** - kept for backwards compatibility |
| `cuisine_primary` | text | | Primary cuisine category |
| `cuisine_secondary` | text | | Secondary cuisine (fusion only) |
| `style` | text | | Restaurant style (Traditional/Modern/etc.) |
| `venue` | text | | Venue type (Restaurant/Cafe/Pub/etc.) |
| `specialty` | text[] | | Specialty tags (BBQ, Seafood, etc.) |
| `must_try_dishes` | text[] | | Signature dishes |
| `price_range` | text | | $/$$/$$$/$$$$ |
| `atmosphere` | text | | Ambiance description |
| `dietary_options` | text | | Cooking style, dietary accommodations |
| `source` | text | | How restaurant was discovered |
| `source_url` | text | | URL where mentioned |
| `latitude` | numeric | | **Legacy** - use restaurant_addresses |
| `longitude` | numeric | | **Legacy** - use restaurant_addresses |
| `public_rating` | numeric | | Google Places rating (1.0-5.0) |
| `public_rating_count` | integer | | Number of Google reviews |
| `public_review_summary` | text | | AI-summarized reviews |
| `public_review_summary_updated_at` | timestamptz | | When summary was generated |
| `public_review_latest_created_at` | timestamptz | | Date of most recent review |
| `created_at` | timestamptz | ✅ | Record creation timestamp |
| `updated_at` | timestamptz | ✅ | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `status` (for filtering to-visit/visited)
- Index on `personal_appreciation` (for filtering by rating)
- Index on `public_rating_count` (for sorting by review count)
- Index on `public_review_summary_updated_at` (for finding stale summaries)

### restaurant_addresses table

**Multi-location support for restaurant chains**

| Column | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | uuid | ✅ | Primary key |
| `restaurant_id` | uuid | ✅ | Foreign key to restaurants.id |
| `location_name` | text | ✅ | Neighborhood/area (e.g., "Shoreditch") |
| `full_address` | text | ✅ | Complete street address with postcode |
| `city` | text | | City name (e.g., "London") |
| `country` | text | | Country name (e.g., "United Kingdom") |
| `latitude` | numeric | | Geocoded latitude |
| `longitude` | numeric | | Geocoded longitude |
| `phone` | text | | Location-specific phone |
| `created_at` | timestamptz | ✅ | Record creation timestamp |
| `updated_at` | timestamptz | ✅ | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Foreign key on `restaurant_id` (cascade delete)
- Index on `restaurant_id` (for efficient joins)

**Constraints:**
- `restaurant_id` references `restaurants(id)` ON DELETE CASCADE

---

## Category Facets System

### Cuisine Primary

Standardized cuisine categories (single selection):

```
British, Nordic, French, Italian, Spanish, Portuguese, Greek, Balkan, European,
Japanese, Chinese, Korean, Thai, Vietnamese, Malaysian,
Indian, Middle Eastern, African, Caribbean,
Mexican, South American, American, Australian, Filipino,
Martian (for the truly unclassifiable)
```

### Cuisine Secondary

Optional fusion pairing (uses same values as Primary):
- **Use only for true fusion** (e.g., Japanese-Peruvian)
- Leave null for single-cuisine restaurants

### Style

Restaurant approach/formality:
- `Traditional` - Classic cooking methods
- `Modern` - Contemporary techniques
- `Fusion` - Deliberately blending cuisines
- `Casual` - Relaxed, everyday
- `Fine Dining` - Formal, upscale
- `Street Food` - Quick-service

### Venue

Primary establishment type:
- `Restaurant` - Full-service dining
- `Cafe` - Coffee-focused with food
- `Pub` - British pub
- `Bar` - Drinks-focused with food
- `Bakery` - Bakery with seating

### Specialty

Multiple specialty tags (array):
```
BBQ, Seafood, Steakhouse, Ramen, Pizza, Sushi, Tapas,
Tasting Menu, Brunch, Breakfast
```

---

## TypeScript Types

**File:** `src/types/place.ts`

```typescript
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  website?: string;
  status: 'to-visit' | 'visited';
  personal_appreciation: 'unknown' | 'avoid' | 'fine' | 'good' | 'great';
  cuisine_primary?: CuisinePrimary;
  cuisine_secondary?: CuisineSecondary;
  style?: RestaurantStyle;
  venue?: RestaurantVenue;
  specialty?: RestaurantSpecialty[];
  locations?: RestaurantAddress[];
  // ... other fields
}

export interface RestaurantAddress {
  id: string;
  restaurant_id: string;
  location_name: string;
  full_address: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}
```

---

## Row-Level Security (RLS)

### Public Read Access

**Policy:** `Enable read access for all users`

```sql
CREATE POLICY "Enable read access for all users"
ON restaurants FOR SELECT
TO public
USING (true);
```

**Effect:** Anyone can view restaurant data (no authentication required)

### Admin Write Access

**Authenticated Users Only:**

```sql
CREATE POLICY "Enable write for authenticated users only"
ON restaurants FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

**Additional Check:** Admin email verification in application layer

**File:** `src/components/AdminPanel.tsx`

```typescript
const { data: { user } } = await supabase.auth.getUser();
const authorizedEmail = import.meta.env.VITE_AUTHORIZED_ADMIN_EMAIL || 'magnus.hultberg@gmail.com';
const isAuthorized = user?.email === authorizedEmail;
```

**Why Two Layers?**
- RLS blocks unauthenticated users at database level
- Email check ensures only `magnus.hultberg@gmail.com` sees admin UI
- Defense in depth

---

## Authentication

### Magic Link Auth

**How it works:**

1. User enters email in admin panel
2. Supabase sends magic link email
3. User clicks link → redirected to app with token
4. Session established via Supabase Auth

**Implementation:**

```typescript
// Send magic link
const { error } = await supabase.auth.signInWithOtp({
  email: 'magnus.hultberg@gmail.com',
  options: {
    emailRedirectTo: window.location.origin
  }
});

// Check session
const { data: { user } } = await supabase.auth.getUser();
```

**Session Duration:** 1 hour (configurable in Supabase dashboard)

**Refresh Tokens:** Handled automatically by Supabase client

### Authorized Admin

**Email:** `magnus.hultberg@gmail.com`

**Where Configured:**
- `wrangler.toml`: `AUTHORIZED_ADMIN_EMAIL` (non-secret, safe to commit)
- `.env`: `VITE_AUTHORIZED_ADMIN_EMAIL` (local dev)

**To Add More Admins:**
1. Update `AUTHORIZED_ADMIN_EMAIL` in `wrangler.toml`
2. Support comma-separated list:
   ```javascript
   const authorizedEmails = env.AUTHORIZED_ADMIN_EMAIL.split(',');
   const isAuthorized = authorizedEmails.includes(user?.email);
   ```
3. Redeploy

---

## CRUD Operations

**File:** `src/services/restaurants.ts`

### Fetch All Restaurants

```typescript
const { data, error } = await supabase
  .from('restaurants')
  .select(`
    *,
    locations:restaurant_addresses(*)
  `)
  .order('name', { ascending: true });
```

**Joins:** Fetches restaurant with all associated addresses

### Add Restaurant

```typescript
// 1. Insert restaurant
const { data: restaurant, error } = await supabase
  .from('restaurants')
  .insert([{ name, address, cuisine_primary, ... }])
  .select()
  .single();

// 2. Insert locations
const { error: locError } = await supabase
  .from('restaurant_addresses')
  .insert(locations.map(loc => ({
    restaurant_id: restaurant.id,
    ...loc
  })));
```

### Update Restaurant

```typescript
const { error } = await supabase
  .from('restaurants')
  .update({ name, cuisine_primary, ... })
  .eq('id', restaurantId);
```

### Delete Restaurant

```typescript
const { error } = await supabase
  .from('restaurants')
  .delete()
  .eq('id', restaurantId);

// Locations cascade delete automatically
```

---

## Migrations

**Location:** `migrations/` folder

**Migration Pattern:**

```sql
-- migrations/003_add_new_field.sql

-- Add column
ALTER TABLE restaurants
ADD COLUMN new_field TEXT;

-- Create index if needed
CREATE INDEX idx_restaurants_new_field
ON restaurants(new_field);
```

**Running Migrations:**

Via Supabase Dashboard:
1. SQL Editor → New query
2. Paste migration SQL
3. Run

Via CLI (if `supabase` CLI installed):
```bash
supabase db push
```

### Existing Migrations

**001_add_public_review_fields.sql**
- Added public review enrichment columns
- Indexes for review data

**002_remove_category_check_constraints.sql**
- Removed strict enum constraints
- Allows flexibility in category values

**phase4_1_personal_appreciation_and_status_rename.sql**
- Migrated rating system to appreciation levels
- Added `personal_appreciation` column

**scripts/migrate_cuisine_to_facets.sql**
- Migrated legacy `cuisine` to new faceted system
- Populated `cuisine_primary`, `style`, `venue`

---

## Database Backup

**Automatic Backups:** Supabase provides daily backups (retained 7 days on free tier)

**Manual Backup:**

1. Via Supabase Dashboard:
   - Settings → Database → Backups
   - Create backup snapshot

2. Via SQL Export:
   ```bash
   # Connect via connection string (from Supabase Dashboard)
   psql 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'

   # Export data
   \copy restaurants TO 'restaurants.csv' CSV HEADER
   \copy restaurant_addresses TO 'addresses.csv' CSV HEADER
   ```

**Restore Process:**
- Use Supabase Dashboard → Restore from backup
- Or import CSV via SQL Editor

---

## Performance Optimization

### Query Optimization

**Use Indexes:**
- Always filter on indexed columns
- Current indexes: `id`, `status`, `personal_appreciation`, `public_rating_count`

**Avoid N+1 Queries:**
```typescript
// ❌ Bad: Fetches restaurants, then locations separately
const restaurants = await supabase.from('restaurants').select('*');
for (const r of restaurants) {
  const locations = await supabase.from('restaurant_addresses').eq('restaurant_id', r.id);
}

// ✅ Good: Single query with join
const { data } = await supabase
  .from('restaurants')
  .select('*, locations:restaurant_addresses(*)');
```

### Connection Pooling

**Handled automatically by Supabase:**
- Connection pooling enabled by default
- No manual configuration needed

**Monitor:**
- Supabase Dashboard → Database → Connection Pooling
- Check active connections and pool size

---

## Troubleshooting

### RLS blocking authenticated writes

**Symptom:** Cannot insert/update despite being logged in

**Debug:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Email:', user?.email);
console.log('Authorized:', user?.email === 'magnus.hultberg@gmail.com');
```

**Solutions:**
- Verify RLS policies in Dashboard → Authentication → Policies
- Check user is actually authenticated (not just logged in locally)
- Verify email matches `AUTHORIZED_ADMIN_EMAIL`

### Slow queries

**Symptom:** Restaurant list takes >2 seconds to load

**Debug:**
```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM restaurants
JOIN restaurant_addresses ON restaurants.id = restaurant_addresses.restaurant_id;
```

**Solutions:**
- Add indexes on frequently filtered columns
- Limit result set (pagination)
- Cache results in frontend (React Query, SWR)

### Foreign key violations

**Symptom:** Cannot delete restaurant with existing addresses

**Cause:** Cascade delete not configured

**Fix:**
```sql
ALTER TABLE restaurant_addresses
DROP CONSTRAINT IF EXISTS restaurant_addresses_restaurant_id_fkey;

ALTER TABLE restaurant_addresses
ADD CONSTRAINT restaurant_addresses_restaurant_id_fkey
FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
ON DELETE CASCADE;
```

---

## Future Enhancements

### Database Features

**Full-Text Search:**
```sql
-- Add tsvector column for search
ALTER TABLE restaurants
ADD COLUMN search_vector tsvector;

-- Populate with name + description
UPDATE restaurants
SET search_vector = to_tsvector('english', name || ' ' || COALESCE(description, ''));

-- Create GIN index
CREATE INDEX idx_restaurants_search
ON restaurants USING GIN(search_vector);

-- Search query
SELECT * FROM restaurants
WHERE search_vector @@ to_tsquery('english', 'italian & pizza');
```

**Geospatial Queries:**
```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column
ALTER TABLE restaurant_addresses
ADD COLUMN location geography(POINT, 4326);

-- Update from lat/lng
UPDATE restaurant_addresses
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Query within radius (meters)
SELECT r.*, a.*
FROM restaurants r
JOIN restaurant_addresses a ON r.id = a.restaurant_id
WHERE ST_DWithin(
  a.location,
  ST_SetSRID(ST_MakePoint(-0.0780, 51.5226), 4326)::geography,
  1500  -- 1.5km radius
);
```

---

**Related Documentation:**
- `REFERENCE/environment-setup.md` - Supabase API keys
- `src/services/restaurants.ts` - CRUD implementation
- `src/types/place.ts` - TypeScript types
- `migrations/` - SQL migration history
