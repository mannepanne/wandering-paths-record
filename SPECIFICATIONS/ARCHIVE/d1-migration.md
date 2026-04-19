# Database migration: Supabase → Cloudflare D1

**Status:** Planning — open decisions gate implementation start  
**Motivation:** Supabase free tier has one database slot. Freeing this project's slot for a different project where Supabase is a better fit (relational complexity, auth requirements). D1 is a natural fit here given the project is already on Cloudflare Workers.

---

## What we're migrating

Three tables, one custom type, one trigger, and a fully managed auth system.

**Database:**
- `restaurants` — main records with JSON arrays (specialty, must_try_dishes)
- `restaurant_addresses` — multi-location support, FK to restaurants
- `restaurant_visits` — visit history, FK to restaurants and auth.users

**Supabase-specific features in active use:**
- Magic link email authentication
- JWT session management with auto-refresh
- `auth.users` table (referenced as FK in restaurant_visits)
- `auth.uid()` function in SQL trigger
- Row-Level Security (RLS) policies

**Supabase features we are NOT using (no migration needed):**
- Real-time subscriptions
- Storage buckets
- Edge functions

---

## Why D1 is suitable here

- Project is already on Cloudflare Workers — D1 binds natively via `env.DB`, no HTTP round-trip
- Single-user personal app: no complex multi-tenancy or RLS requirements
- Dataset is small (hundreds of restaurants, not millions of rows)
- SQLite is battle-tested for read-heavy workloads
- Free tier is generous and separate from Supabase quotas
- Eliminates one external service dependency

---

## Authentication: decision

**Decision: Cloudflare Access with Google as identity provider.**

Supabase provides a complete auth system. D1 is a database only — auth is our responsibility. Cloudflare Access solves this cleanly with zero auth code to write.

### Current Supabase flow (being replaced)

1. Magnus enters email → Supabase sends magic link email
2. Link click → Supabase issues JWT, stores in localStorage
3. All writes gated by RLS + application-level email check
4. Visit records tied to `auth.users.id`

### New flow: Cloudflare Access + Google OAuth

1. Magnus visits the site and clicks the admin panel
2. Cloudflare Access intercepts → redirects to Cloudflare-hosted login page
3. Page shows "Sign in with Google" button
4. Google OAuth handles authentication — Magnus selects his Gmail account
5. Access verifies the email is `magnus.hultberg@gmail.com` (policy-enforced)
6. Access issues a `CF-Authorization` JWT cookie — valid for the session
7. Subsequent requests carry the cookie; Worker verifies it on write operations
8. Public read traffic to the site is unaffected — only write API endpoints are protected

**Why this is the right choice:**
- Zero auth code to write or maintain — Cloudflare and Google handle everything
- No email infrastructure (magic links, deliverability headaches) — Google OAuth is the login
- Familiar UX for Magnus: "Sign in with Google" is something everyone knows
- Works at the network/edge layer — unauthenticated write attempts never reach the Worker
- Free tier covers personal use indefinitely
- Magnus already trusts Google with this email account

**What changes in the app:**
- `src/contexts/AuthContext.tsx` — rewrite to check for `CF-Authorization` cookie instead of Supabase session
- `src/components/AdminPanel.tsx` — remove embedded login form; admin panel either shows (cookie present) or redirects to Access login
- `src/worker.js` — add middleware to verify `CF-Authorization` JWT on write endpoints

**Local development:**
- Cloudflare Access bypasses can be set up for `localhost` during development, or the Worker can check for a `DEV_BYPASS` env flag in local mode only
- Wrangler supports this pattern; worth confirming during Phase 2

### Options considered and rejected

**Magic link via Cloudflare Access (email OTP):** Access also supports email OTP natively (Cloudflare sends the link). Rejected in favour of Google OAuth — no email infrastructure needed, and Google login is simpler and more reliable.

**Custom JWT in Worker:** We issue and verify our own JWTs, send magic links via a transactional email service (Resend, Mailgun, etc.). Rejected — unnecessary complexity for a single-user personal project, introduces email deliverability as a new dependency, more surface area for security mistakes.

**Cloudflare Workers KV session tokens:** Random token stored in KV, sent by email. Simpler than custom JWT but still requires email infrastructure. Rejected for same reasons.

---

## Schema translation: PostgreSQL → SQLite

D1 is SQLite. Several PostgreSQL-specific features need translating.

### Type mapping

| PostgreSQL | D1 / SQLite | Notes |
|---|---|---|
| `UUID` | `TEXT` | Generate in application code (`crypto.randomUUID()`) |
| `TEXT[]` (arrays) | `TEXT` (JSON) | Store as `'["dish1","dish2"]'`, parse in application |
| `TIMESTAMPTZ` | `TEXT` (ISO-8601) | e.g. `2025-04-06T12:00:00Z` |
| `personal_appreciation ENUM` | `TEXT CHECK(...)` | CHECK constraint enforces valid values |
| `NUMERIC` | `REAL` | For latitude, longitude, ratings |
| `BOOLEAN` | `INTEGER` | 0/1 — SQLite has no boolean type |
| `DATE` | `TEXT` | ISO-8601 date string `YYYY-MM-DD` |

### Array columns (specialty, must_try_dishes)

Currently stored as PostgreSQL arrays, queried with array operators. In D1 these become JSON strings. Impact:

- **Read:** application parses JSON on fetch — minimal change
- **Write:** application serialises to JSON on save — minimal change
- **Filter by array contents:** currently not done in SQL (filtered in application) — no impact

### The trigger

Current PostgreSQL trigger `trigger_update_cached_rating` keeps `restaurants.personal_appreciation` in sync with the most recent visit's rating. It uses `auth.uid()`.

In D1, triggers cannot reference auth context. Two options:
1. **Rewrite trigger in SQLite syntax** without `auth.uid()` (safe for single-user — all visits belong to Magnus)
2. **Drop the trigger, handle sync in application code** — update `restaurants.personal_appreciation` explicitly when adding/updating a visit

Option 2 is simpler and more transparent for a single-user app. Recommended.

### `restaurant_visits.user_id` FK

Currently a FK to `auth.users.id`. After migrating away from Supabase Auth, there is no `auth.users` table.

**Proposed approach:** Drop the FK constraint. Since this is a single-user app, all visits belong to Magnus by definition. The `user_id` column becomes optional context or can be removed entirely. If we go with Cloudflare Access, we could store the Access JWT subject claim here for auditability, but it's not load-bearing.

### D1 schema (draft)

```sql
-- Restore foreign key enforcement (off by default in SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE restaurants (
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
  specialty TEXT,           -- JSON array string
  must_try_dishes TEXT,     -- JSON array string
  price_range TEXT
    CHECK(price_range IN (NULL, '$', '$$', '$$$', '$$$$')),
  atmosphere TEXT,
  dietary_options TEXT,
  source TEXT,
  source_url TEXT,
  latitude REAL,            -- legacy, prefer restaurant_addresses
  longitude REAL,           -- legacy, prefer restaurant_addresses
  public_rating REAL,
  public_rating_count INTEGER,
  public_review_summary TEXT,
  public_review_summary_updated_at TEXT,
  public_review_latest_created_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE restaurant_addresses (
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

CREATE TABLE restaurant_visits (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL
    REFERENCES restaurants(id) ON DELETE CASCADE,
  visit_date TEXT NOT NULL,   -- YYYY-MM-DD
  rating TEXT DEFAULT 'unknown'
    CHECK(rating IN ('unknown', 'avoid', 'fine', 'good', 'great')),
  experience_notes TEXT,
  company_notes TEXT,
  is_migrated_placeholder INTEGER DEFAULT 0,  -- boolean: 0/1
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(restaurant_id, visit_date)
);

-- Indexes
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_appreciation ON restaurants(personal_appreciation);
CREATE INDEX idx_restaurants_rating_count ON restaurants(public_rating_count);
CREATE INDEX idx_addresses_restaurant_id ON restaurant_addresses(restaurant_id);
CREATE INDEX idx_visits_restaurant_id ON restaurant_visits(restaurant_id);
CREATE INDEX idx_visits_date ON restaurant_visits(visit_date DESC);
CREATE INDEX idx_visits_restaurant_date ON restaurant_visits(restaurant_id, visit_date DESC);
```

---

## Service layer rewrite

The Supabase JS SDK is replaced with direct D1 queries via the Worker binding. All query logic moves from client-side service files to the Worker.

**Files requiring significant changes:**

| File | Change |
|---|---|
| `src/lib/supabase.ts` | Delete — replaced by D1 Worker binding |
| `src/services/restaurants.ts` | Rewrite queries as REST calls to Worker endpoints |
| `src/services/visits.ts` | Rewrite queries as REST calls to Worker endpoints |
| `src/services/geocodingUtility.ts` | Minor — remove Supabase client, keep geocoding logic |
| `src/contexts/AuthContext.tsx` | Rewrite for new auth provider |
| `src/worker.js` | Add D1 binding, add data API endpoints, add auth middleware |
| `wrangler.toml` | Add D1 database binding, remove Supabase env vars |

**New pattern (Worker side):**
```javascript
// Example: fetch all restaurants
const { results } = await env.DB.prepare(
  `SELECT r.*, json_group_array(json_object(
     'id', a.id, 'location_name', a.location_name, 'full_address', a.full_address,
     'city', a.city, 'country', a.country, 'latitude', a.latitude, 'longitude', a.longitude
   )) as locations
   FROM restaurants r
   LEFT JOIN restaurant_addresses a ON a.restaurant_id = r.id
   GROUP BY r.id
   ORDER BY r.created_at DESC`
).all();
```

**New pattern (client side):**
```typescript
// Replaces Supabase SDK call — hits our Worker endpoint instead
const response = await fetch('/api/restaurants');
const restaurants = await response.json();
```

---

## Security model after migration

Without RLS, security is enforced in the Worker:

1. **Public reads:** All `GET /api/restaurants*` endpoints — no auth required
2. **Writes:** `POST`, `PUT`, `DELETE` endpoints — Worker checks auth before executing
3. **Auth check (if Cloudflare Access):** Verify `CF-Authorization` JWT on write requests
4. **Auth check (if custom JWT):** Verify token in `Authorization: Bearer` header

This is a simpler model for a single-user app and is entirely reasonable. The risk surface is the Worker code rather than database policies.

---

## Data migration approach

1. **Export from Supabase:** Use Supabase dashboard CSV export or `pg_dump` for each table
2. **Transform:** Script to convert PostgreSQL types to SQLite equivalents:
   - UUID strings remain as-is (already text)
   - `{item1,item2}` PostgreSQL array syntax → `["item1","item2"]` JSON
   - Timestamps: strip timezone info or keep as ISO-8601 strings
   - Boolean integers: `true` → `1`, `false` → `0`
3. **Import to D1:** Use `wrangler d1 execute` with generated INSERT statements, or D1's import API
4. **Verify:** Row counts match, spot-check a handful of records

This can be done with a one-off Node.js migration script. No need for anything fancy.

---

## Phased implementation plan

### Phase 1 — Schema and data migration (no code changes)
- Create D1 database via Wrangler
- Run schema creation SQL
- Export data from Supabase, run transform script, import to D1
- Verify data integrity
- **Deliverable:** D1 database populated and verified, app still running on Supabase

### Phase 2 — Auth decision and implementation
- Evaluate Cloudflare Access (set up, test UX, confirm Worker integration)
- Implement chosen auth solution
- Verify admin operations work end-to-end against the *existing* Supabase DB (auth change only)
- **Deliverable:** Auth works independently of database provider

### Phase 3 — Worker API layer
- Add D1 binding to `wrangler.toml`
- Add data API endpoints to `worker.js` (`/api/restaurants`, `/api/visits`, etc.)
- Add auth middleware to write endpoints
- **Deliverable:** Worker serves all data from D1, tested in local dev

### Phase 4 — Client service layer
- Replace Supabase SDK calls in service files with fetch calls to Worker endpoints
- Remove `@supabase/supabase-js` dependency
- Remove Supabase environment variables
- **Deliverable:** App fully functional against D1, Supabase no longer referenced

### Phase 5 — Production cutover
- Deploy Worker with D1 binding
- Smoke test production
- Disconnect Supabase project
- **Deliverable:** Supabase project freed, migration complete

---

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare Access UX is unsuitable | Medium | High | Evaluate in Phase 2 before committing; Option B is fallback |
| Data transformation errors (array format) | Medium | Medium | Verify row counts and spot-check after import |
| SQLite query differences break complex queries | Low | Medium | Test all filter/search paths in local D1 before cutover |
| D1 local dev (`wrangler dev`) behaves differently from production | Low | Low | Run full manual test against production D1 before cutover |
| Data loss during migration | Low | High | Keep Supabase project live until Phase 5 is confirmed working |

---

## Open questions (to resolve before implementation)

- [x] **Auth choice:** Cloudflare Access + Google OAuth — decided.
- [ ] **`user_id` column:** Keep in `restaurant_visits` for future-proofing (store Access JWT subject claim), or drop entirely? Leaning toward drop — adds no value for a single-user app.
- [ ] **Local dev auth:** Confirm Cloudflare Access bypass pattern for `wrangler dev` works as expected. Test during Phase 2.
- [ ] **`PRAGMA foreign_keys`:** D1 requires this per-connection. Does the Wrangler D1 binding handle this, or does the Worker need to set it explicitly? Check D1 docs during Phase 3.

---

## Related documentation

- [REFERENCE/supabase-setup.md](../REFERENCE/supabase-setup.md) — current schema and RLS policies
- [REFERENCE/environment-setup.md](../REFERENCE/environment-setup.md) — secrets and API keys to update
- [REFERENCE/decisions/](../REFERENCE/decisions/) — ADRs (create one for auth choice once decided)
- [src/worker.js](../src/worker.js) — current Worker (Phase 3 target)
- [src/services/restaurants.ts](../src/services/restaurants.ts) — primary service file (Phase 4 target)
