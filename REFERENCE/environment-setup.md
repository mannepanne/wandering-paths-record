# Environment & Secrets Setup

Configuration guide for local development environment and Cloudflare Workers deployment secrets.

---

## Local Development Environment

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://drtjfbvudzacixvqkzav.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Claude API (for AI extraction)
VITE_CLAUDE_API_KEY=your_anthropic_api_key_here

# Google Maps (for geocoding and place lookups)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Mapbox (for interactive maps)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### Where to Get API Keys

**Supabase:**
- Project URL is already configured in `wrangler.toml`
- Get anon key from: Supabase Dashboard → Settings → API
- Project: `drtjfbvudzacixvqkzav`

**Claude API (Anthropic):**
- Get from: https://console.anthropic.com/settings/keys
- Used for AI restaurant extraction
- Current model: `claude-sonnet-4-20250514` (configured in `src/config/claude.ts`)

**Google Maps API:**
- Get from: https://console.cloud.google.com/google/maps-apis/credentials
- Required APIs: Geocoding API, Places API
- Used for: address geocoding, place lookups, public ratings/reviews

**Mapbox:**
- Get from: https://account.mapbox.com/access-tokens/
- Used for: interactive map display with clustering

### Local Development Servers

```bash
# Frontend dev server (port 8080)
npm run dev

# Local API server for AI extraction (port 3001)
npm run api
```

**Note:** The local API server (`server.cjs`) is needed for AI extraction during development. In production, extraction runs in Cloudflare Worker (`src/worker.js`).

---

## Cloudflare Workers Secrets

### Required Production Secrets

Set via `wrangler secret put <SECRET_NAME>`:

```bash
# Supabase
wrangler secret put SUPABASE_ANON_KEY

# Claude API
wrangler secret put CLAUDE_API_KEY

# Google Maps
wrangler secret put GOOGLE_MAPS_API_KEY
```

### Non-Secret Environment Variables

Already configured in `wrangler.toml`:
- `SUPABASE_URL` - Public Supabase project URL
- `AUTHORIZED_ADMIN_EMAIL` - Admin user email for authentication

### Viewing Secrets

```bash
# List all secrets
wrangler secret list

# Secrets are encrypted and cannot be viewed after creation
# To update: wrangler secret put <SECRET_NAME>
# To delete: wrangler secret delete <SECRET_NAME>
```

---

## Supabase Setup

### Database Configuration

**Project:** `drtjfbvudzacixvqkzav.supabase.co`

**Tables:**
- `restaurants` - Main restaurant data with faceted categories
- Authentication handled by Supabase Auth (magic link)

**Row-Level Security (RLS):**
- Public read access for all restaurants
- Admin write access restricted to `magnus.hultberg@gmail.com`

### Authentication

**Method:** Magic link authentication via Supabase Auth

**Admin User:**
- Email: `magnus.hultberg@gmail.com`
- Authorized via `AUTHORIZED_ADMIN_EMAIL` in `wrangler.toml`

**Magic Link Flow:**
1. User enters email on admin panel
2. Supabase sends magic link email
3. User clicks link, gets redirected back
4. Session established via Supabase client

---

## Google Maps & Places API

### APIs Required

Enable these APIs in Google Cloud Console:
- **Geocoding API** - Convert addresses to lat/lng coordinates
- **Places API** - Lookup place details, ratings, reviews

### Usage in Application

**Geocoding:**
- Used in `src/services/locationService.ts`
- Converts restaurant addresses to coordinates for map display
- Endpoint: `https://maps.googleapis.com/maps/api/geocode/json`

**Place Lookups:**
- Used in `src/worker.js` for review enrichment
- Fetches public ratings and reviews
- Endpoints:
  - Text search: `/maps/api/place/textsearch/json`
  - Place details: `/maps/api/place/details/json`

### Quotas and Costs

- Geocoding API: Free tier covers typical usage
- Places API: Monitor usage in Google Cloud Console
- Consider enabling billing alerts

---

## Mapbox Setup

### Account Configuration

**Access Token:** Required for map display

**Usage:**
- Interactive map component (`src/components/InteractiveMap.tsx`)
- Mapbox GL JS library
- Clustering for multiple restaurant markers

### Map Style

Current style: `mapbox://styles/mapbox/streets-v12`

Can be customized via Mapbox Studio for brand-specific styling.

---

## Troubleshooting

### "API key not configured" errors

**Local development:**
- Verify `.env` file exists in project root
- Check variable names match exactly (case-sensitive)
- Restart dev servers after adding new variables

**Production (Cloudflare):**
- Verify secrets are set: `wrangler secret list`
- Re-run `wrangler secret put <SECRET_NAME>` if missing
- Redeploy after updating secrets

### CORS errors during local development

- Ensure local API server is running (`npm run api`)
- Check that `server.cjs` has `cors()` middleware enabled
- Verify frontend is making requests to `http://localhost:3001`

### Supabase connection issues

- Verify `SUPABASE_URL` in `wrangler.toml` is correct
- Check `SUPABASE_ANON_KEY` is valid (not expired)
- Test connection in Supabase Dashboard → API → Auto-generated docs

---

## Security Best Practices

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Rotate API keys periodically** - Especially after team changes
3. **Use separate keys for dev/prod** - If budget allows
4. **Monitor API usage** - Set up billing alerts in Google Cloud, Anthropic, Mapbox
5. **Restrict API keys** - Use HTTP referrer restrictions (Google Maps), domain restrictions (Mapbox)

---

**Related Documentation:**
- See `REFERENCE/troubleshooting.md` for common setup issues
- See `REFERENCE/DEVELOPMENT.md` for full development workflow
