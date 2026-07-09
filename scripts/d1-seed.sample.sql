-- Sample seed data for local development — entirely fictional.
-- No real restaurants, addresses, ratings, or visit history. Safe to commit.
-- Gives every "Where next?" rail something to show: several highly-rated
-- to-visit places (Acclaimed), a spread of created_at dates (Freshly added /
-- Been waiting), and a couple of visited places.
--
-- Applied by `npm run db:seed:local` after scripts/d1-schema.sql.

PRAGMA foreign_keys = OFF;

-- Restaurants -----------------------------------------------------------------
INSERT INTO restaurants
  (id, name, address, website, status, personal_appreciation, description,
   visit_count, cuisine_primary, style, venue, price_range,
   public_rating, public_rating_count, created_at)
VALUES
  ('seed-r01', 'Aurora Bistro', 'Testbury', 'https://example.com/aurora',
   'to-visit', 'unknown', 'A sample bistro used for local development.',
   0, 'French', 'Fine Dining', 'Restaurant', '$$$', 4.8, 210, '2026-06-20'),
  ('seed-r02', 'The Copper Kettle', 'Testbury', 'https://example.com/copper',
   'to-visit', 'unknown', 'Sample all-day cafe for local development.',
   0, 'British', 'Casual', 'Cafe', '$$', 4.6, 154, '2026-06-10'),
  ('seed-r03', 'Nonna''s Table', 'Mockford', 'https://example.com/nonna',
   'to-visit', 'unknown', 'Sample trattoria for local development.',
   0, 'Italian', 'Traditional', 'Restaurant', '$$', 4.5, 320, '2026-05-15'),
  ('seed-r04', 'Blue Heron Grill', 'Mockford', 'https://example.com/heron',
   'to-visit', 'unknown', 'Sample seafood grill for local development.',
   0, 'Seafood', 'Casual', 'Restaurant', '$$$', 4.4, 98, '2026-04-02'),
  ('seed-r05', 'Saffron Room', 'Exampleton', 'https://example.com/saffron',
   'to-visit', 'unknown', 'Sample curry house for local development.',
   0, 'Indian', 'Traditional', 'Restaurant', '$$', 4.3, 176, '2026-03-01'),
  ('seed-r06', 'Corner Noodle Bar', 'Exampleton', 'https://example.com/noodle',
   'to-visit', 'unknown', 'Sample noodle bar for local development.',
   0, 'Asian', 'Casual', 'Hole-in-the-wall', '$', 4.1, 64, '2026-01-10'),
  ('seed-r07', 'Harbor Fry', 'Testbury', 'https://example.com/harbor',
   'to-visit', 'unknown', 'Sample chippy for local development.',
   0, 'British', 'Casual', 'Food cart', '$', 3.9, 41, '2025-11-05'),
  ('seed-r08', 'The Green Fork', 'Mockford', 'https://example.com/greenfork',
   'to-visit', 'unknown', 'Sample vegetarian spot for local development.',
   0, 'Vegetarian', 'Casual', 'Restaurant', '$$', NULL, NULL, '2025-08-20'),
  ('seed-r09', 'Old Mill Tavern', 'Exampleton', 'https://example.com/oldmill',
   'visited', 'good', 'Sample gastropub for local development.',
   1, 'British', 'Traditional', 'Restaurant', '$$', 4.7, 512, '2025-09-12'),
  ('seed-r10', 'Sunset Taqueria', 'Testbury', 'https://example.com/sunset',
   'visited', 'great', 'Sample taqueria for local development.',
   2, 'Mexican', 'Casual', 'Restaurant', '$', 4.2, 233, '2025-10-01');

-- Addresses (one location each) -----------------------------------------------
INSERT INTO restaurant_addresses
  (id, restaurant_id, location_name, full_address, city, country, latitude, longitude)
VALUES
  ('seed-a01', 'seed-r01', 'Testbury',   '1 Sample Street, Testbury',    'Testbury',   'UK', 51.5155, -0.1410),
  ('seed-a02', 'seed-r02', 'Testbury',   '2 Sample Street, Testbury',    'Testbury',   'UK', 51.5142, -0.1385),
  ('seed-a03', 'seed-r03', 'Mockford',   '3 Example Lane, Mockford',     'Mockford',   'UK', 51.5201, -0.1290),
  ('seed-a04', 'seed-r04', 'Mockford',   '4 Example Lane, Mockford',     'Mockford',   'UK', 51.5188, -0.1305),
  ('seed-a05', 'seed-r05', 'Exampleton', '5 Placeholder Road, Exampleton', 'Exampleton', 'UK', 51.5099, -0.1337),
  ('seed-a06', 'seed-r06', 'Exampleton', '6 Placeholder Road, Exampleton', 'Exampleton', 'UK', 51.5110, -0.1350),
  ('seed-a07', 'seed-r07', 'Testbury',   '7 Sample Street, Testbury',    'Testbury',   'UK', 51.5133, -0.1401),
  ('seed-a08', 'seed-r08', 'Mockford',   '8 Example Lane, Mockford',     'Mockford',   'UK', 51.5215, -0.1276),
  ('seed-a09', 'seed-r09', 'Exampleton', '9 Placeholder Road, Exampleton', 'Exampleton', 'UK', 51.5087, -0.1322),
  ('seed-a10', 'seed-r10', 'Testbury',   '10 Sample Street, Testbury',   'Testbury',   'UK', 51.5121, -0.1418);

-- Visits (for the two visited places) -----------------------------------------
INSERT INTO restaurant_visits
  (id, restaurant_id, visit_date, rating, experience_notes)
VALUES
  ('seed-v01', 'seed-r09', '2026-02-14', 'good',  'Sample visit note.'),
  ('seed-v02', 'seed-r10', '2026-03-22', 'great', 'Sample visit note.');
