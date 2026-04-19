# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules of Engagement

Claude collaboration and ways of working instructions: @.claude/CLAUDE.md

When asked to remember anything, always add project memory in this CLAUDE.md (in the project root), not @.claude/CLAUDE.md, leave @.claude/CLAUDE.md as it is.

## Project Overview

**Wandering Paths - Curated Restaurant Hitlist** is a production restaurant curation app for tracking must-visit and visited restaurants worldwide. Built with Vite + React + TypeScript + shadcn/ui.

**Live at:** https://restaurants.hultberg.org

## Quick Reference

## Development Commands

```bash
npm run dev           # Start frontend dev server (port 8080)
npm run api           # Start local API server (port 3001) - needed for AI extraction
npm run build         # Build for production
npm run lint          # Run linter
npx wrangler deploy   # Deploy to CloudFlare Workers
```

## Deployment

Model versions are centralized in `src/config/claude.ts`. When Anthropic deprecates models, update there first. See `REFERENCE/claude_model_updates.md` for instructions.
- **Platform**: CloudFlare Workers (NOT Pages)
- **Custom Domain**: restaurants.hultberg.org
- **CI/CD**: GitHub Actions auto-deploys on push to `main`

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Cloudflare D1 (SQLite) + Cloudflare Workers
- **Auth**: Cloudflare Access + Google OAuth (JWT verified server-side in Worker)
- **AI**: Claude Sonnet 4.5 for restaurant extraction and review summarization
- **Maps**: Mapbox GL JS with clustering
- **Geo**: Google Maps Geocoding and Places APIs

### Key Features
- **AI Extraction**: Add restaurants by URL - Claude extracts all details
- **Multi-Location Support**: Restaurant chains with individual addresses (e.g., Dishoom with 8 locations)
- **Smart Search**: Three-tier search (text, proximity, city fallback)
- **GPS "Near Me"**: Find restaurants within walking distance
- **Personal Appreciation**: Behavioral rating scale (skip/fine/recommend/must-visit)
- **Public Reviews**: Google Places integration for ratings and AI-summarized reviews

### Data Model

```typescript
interface Restaurant {
  id: string;
  name: string;
  address: string;                    // Human-readable summary
  status: 'to-visit' | 'visited';
  personal_appreciation?: 'unknown' | 'avoid' | 'fine' | 'good' | 'great';
  public_rating?: number;
  cuisine?: string;
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  must_try_dishes?: string[];
  locations?: RestaurantAddress[];    // Multi-location support
}

interface RestaurantAddress {
  location_name: string;              // e.g., "Shoreditch", "Canary Wharf"
  full_address: string;
  latitude?: number;
  longitude?: number;
}
```

### Design System
- **Colors**: Earth tones (warm-stone, burnt-orange, deep-burgundy, olive-green, charcoal)
- **Typography**: Space Grotesk (headings), JetBrains Mono (code)
- **Style**: Brutalist aesthetic with strong visual hierarchy

## Key Files

### Application
- `src/App.tsx` - Main app with routing
- `src/pages/Index.tsx` - Main restaurant list/map interface
- `src/pages/About.tsx` - About page explaining appreciation system
- `src/pages/RestaurantDetails.tsx` - Individual restaurant view

### Components
- `src/components/PlaceCard.tsx` - Restaurant cards with multi-location display
- `src/components/AdminPanel.tsx` - AI extraction and restaurant management
- `src/components/FilterBar.tsx` - Search and filtering
- `src/components/InteractiveMap.tsx` - Mapbox map with clustering

### Services
- `src/services/restaurants.ts` - Restaurant CRUD via Worker API
- `src/services/claudeExtractor.ts` - AI restaurant extraction
- `src/services/reviewEnrichmentService.ts` - Google Reviews + Claude summarization
- `src/services/smartGeoSearch.ts` - Three-tier geo search

### Infrastructure
- `server.cjs` - Local dev API server
- `src/worker.js` - CloudFlare Workers production API
- `src/config/claude.ts` - Centralized Claude model config
- `wrangler.toml` - CloudFlare Workers config

## Important Notes

### Claude Model Updates

**Current Model**: `claude-sonnet-4-20250514` (Sonnet 4.5)

### Static assets and SPA routing
Cloudflare Workers Static Assets handles everything end-to-end: `dist/client/` is served directly, and `not_found_handling = "single-page-application"` in `wrangler.toml` returns `index.html` for unmatched non-API paths. `run_worker_first` keeps `/api/*` and `/auth/login` on the Worker. No hand-rolled HTML fallback in the Worker, no asset-reference sync script.

### Admin authentication
- Cloudflare Access + Google OAuth; login via `/auth/login`, logout via `/cdn-cgi/access/logout`
- Worker verifies `CF_Authorization` cookie (underscore — not hyphen) on every protected endpoint
- JWT verification: RS256 signature via JWKS, audience check, expiry check, email check
- Authorized email configured as `AUTHORIZED_ADMIN_EMAIL` in wrangler.toml
- Admin controls (edit/delete/rate) hidden from unauthenticated users

## Documentation

### Implementation Reference (REFERENCE/)

**Essential guides** — read when working on specific systems:

- `REFERENCE/DEVELOPMENT.md` - Full development workflow (setup, commands, deployment)
- `REFERENCE/environment-setup.md` - Secrets and API key configuration
- `REFERENCE/d1-setup.md` - D1 database schema and Worker API endpoints
- `REFERENCE/auth-setup.md` - Cloudflare Access + Google OAuth setup and flow
- `REFERENCE/ai-extraction-guide.md` - How Claude extraction works
- `REFERENCE/geo-services-guide.md` - Maps, geocoding, location search
- `REFERENCE/claude_model_updates.md` - Updating Claude API model versions
- `REFERENCE/troubleshooting.md` - Common issues and solutions
- `REFERENCE/technical-debt.md` - Known limitations and future work
- `REFERENCE/testing-strategy.md` - Testing approach
- `REFERENCE/web-analytics.md` - Analytics setup (planned)
- `REFERENCE/ARCHIVE/supabase-setup.md` - Legacy Supabase setup (archived — migrated to D1)

- **Architecture decisions?** → [decisions/](./REFERENCE/decisions/) - ADRs explaining why things are this way

### Technical Specifications (SPECIFICATIONS/)

**Planning docs** — active work and project history:

- `SPECIFICATIONS/technical_specifications.md` - Overall architecture
- `SPECIFICATIONS/PROJECT_HISTORY.md` - Project evolution
- `SPECIFICATIONS/ARCHIVE/` - Completed specifications
