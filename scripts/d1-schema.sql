-- D1 schema for Wandering Paths
-- SQLite equivalent of the Supabase/PostgreSQL schema

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'to-visit'
    CHECK(status IN ('to-visit', 'visited')),
  personal_appreciation TEXT DEFAULT 'unknown'
    CHECK(personal_appreciation IN ('unknown', 'avoid', 'fine', 'good', 'great')),
  description TEXT,
  visit_count INTEGER DEFAULT 0,
  cuisine TEXT,
  cuisine_primary TEXT,
  cuisine_secondary TEXT,
  style TEXT,
  venue TEXT,
  specialty TEXT,
  must_try_dishes TEXT,
  price_range TEXT,
  atmosphere TEXT,
  dietary_options TEXT,
  source TEXT,
  source_url TEXT,
  latitude REAL,
  longitude REAL,
  public_rating REAL,
  public_rating_count INTEGER,
  public_review_summary TEXT,
  public_review_summary_updated_at TEXT,
  public_review_latest_created_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS restaurant_addresses (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL
    REFERENCES restaurants(id) ON DELETE CASCADE,
  location_name TEXT,
  full_address TEXT,
  city TEXT,
  country TEXT,
  latitude REAL,
  longitude REAL,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS restaurant_visits (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL
    REFERENCES restaurants(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,
  rating TEXT DEFAULT 'unknown'
    CHECK(rating IN ('unknown', 'avoid', 'fine', 'good', 'great')),
  experience_notes TEXT,
  company_notes TEXT,
  is_migrated_placeholder INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(restaurant_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_appreciation ON restaurants(personal_appreciation);
CREATE INDEX IF NOT EXISTS idx_restaurants_rating_count ON restaurants(public_rating_count);
CREATE INDEX IF NOT EXISTS idx_addresses_restaurant_id ON restaurant_addresses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_visits_restaurant_id ON restaurant_visits(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON restaurant_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_restaurant_date ON restaurant_visits(restaurant_id, visit_date);
