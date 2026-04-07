# Development guide

Day-to-day development workflow for the Wandering Paths restaurant curation app.

**Live at:** [restaurants.hultberg.org](https://restaurants.hultberg.org)

---

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript (strict) + shadcn/ui + Tailwind CSS
- **State management:** TanStack Query v5
- **Database:** Cloudflare D1 (SQLite), server-side only, bound to Worker as `env.DB`
- **Authentication:** Cloudflare Access + Google OAuth, JWT verified in Worker
- **AI:** Claude Sonnet 4.5 (`src/config/claude.ts` for centralised version config)
- **Maps:** Mapbox GL JS v3.14 with clustering
- **Geo:** Google Maps Geocoding + Places APIs
- **Deployment:** Cloudflare Workers with static asset serving

---

## Development commands

```bash
npm run dev           # Frontend dev server on port 8080
npm run api           # Local API server on port 3001 (needed for AI extraction in dev)
npm run build         # Production build (auto-syncs Worker asset references)
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
npx wrangler dev      # Run Worker locally with local D1 (alternative to npm run api)
npx wrangler deploy   # Deploy to Cloudflare Workers
npx wrangler tail     # Stream live Worker logs
```

---

## Local development setup

### 1. Install dependencies

```bash
git clone <repository-url>
cd wandering-paths-record
npm install
```

### 2. Environment variables

Create `.env` in the project root:

```bash
# AI extraction (local dev server only)
VITE_CLAUDE_API_KEY=your_anthropic_api_key

# Google Maps (geocoding + places)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Mapbox (map display)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

**No Supabase variables.** The database is D1, which is server-side only — no client config needed.

**Note:** `VITE_` prefix is required for Vite to expose variables to the browser bundle. The API keys are used by the local dev server (`server.cjs`) and Worker, not directly by the React app.

### 3. Start development

```bash
# Terminal 1 — React dev server
npm run dev

# Terminal 2 — Local API server (AI extraction, Google Maps proxy)
npm run api
```

- Frontend: http://localhost:8080
- API: http://localhost:3001
- Health check: http://localhost:3001/health

### 4. Admin access in local dev

The admin panel requires a valid Cloudflare Access JWT. In local development, the Worker's `isAuthenticated()` check still runs. Options:

- Use `npx wrangler dev` instead of `npm run api` for a full local Worker environment (including auth)
- Or temporarily bypass auth for local testing (not committed to main)

---

## Environment variables reference

### Local `.env` (development only)

| Variable | Required | Used for |
|----------|----------|---------|
| `VITE_CLAUDE_API_KEY` | Yes | AI extraction via local API server |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Geocoding and place lookups |
| `VITE_MAPBOX_ACCESS_TOKEN` | Yes | Map display |

### Cloudflare Worker secrets (production)

Set via `wrangler secret put <NAME>`:

| Secret | Description |
|--------|-------------|
| `CLAUDE_API_KEY` | Anthropic API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token |

### Cloudflare Worker vars (in `wrangler.toml`)

Non-sensitive config committed to the repo:

| Variable | Description |
|----------|-------------|
| `CF_ACCESS_AUD` | Cloudflare Access application audience tag |
| `CF_TEAM_DOMAIN` | Cloudflare Zero Trust team domain URL |
| `AUTHORIZED_ADMIN_EMAIL` | Admin email checked in JWT verification |

### D1 binding (in `wrangler.toml`)

```toml
[[d1_databases]]
binding = "DB"
database_name = "wandering-paths"
database_id = "f928b168-fb21-4420-bff8-2f9320d3f22e"
```

D1 is available in the Worker as `env.DB`. No connection strings, no client SDK.

---

## Deployment

### Automated (recommended)

GitHub Actions deploys automatically on push to `main`. Required GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Manual

```bash
npm run build         # Builds frontend + auto-syncs Worker asset references
npx wrangler deploy
```

**Asset reference sync:** `npm run build` runs `scripts/update-worker-assets.js` which updates the Worker's embedded HTML with correct asset filenames. This prevents MIME type errors. Always use `npm run build`, not `vite build` directly.

### Production URLs

- Primary: https://restaurants.hultberg.org
- Workers.dev: https://wandering-paths-record.herrings.workers.dev

---

## Claude model configuration

Model versions are centralised in `src/config/claude.ts` (TypeScript) and as constants at the top of `server.cjs` and `src/worker.js` (Node.js files). When Anthropic deprecates a model, update these and redeploy. See `REFERENCE/claude_model_updates.md` for step-by-step instructions.

**Current model:** `claude-sonnet-4-20250514` (Sonnet 4.5)

---

## Monitoring

```bash
# Live Worker logs
npx wrangler tail

# Check D1 database
npx wrangler d1 execute wandering-paths --command="SELECT count(*) FROM restaurants"

# Check secrets
wrangler secret list
```

---

**Related documentation:**
- `REFERENCE/d1-setup.md` — Database schema and API endpoints
- `REFERENCE/auth-setup.md` — Cloudflare Access JWT auth
- `REFERENCE/environment-setup.md` — Full secrets and config reference
- `REFERENCE/troubleshooting.md` — Common issues
- `REFERENCE/claude_model_updates.md` — Updating Claude model versions
