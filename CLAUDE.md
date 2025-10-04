# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules of Engagement

Claude collaboration and ways of working instructions: @.claude/CLAUDE.md

When asked to remember anything, always add project memory in this CLAUDE.md (in the project root), not @.claude/CLAUDE.md, leave @.claude/CLAUDE.md as it is.

## Project Overview

This is "Wandering Paths - Curated Restaurant Hitlist" - a sophisticated restaurant curation and discovery application built with the Vite + React + shadcn/ui + TypeScript stack. The app provides AI-powered restaurant extraction, multi-location support, interactive maps, and comprehensive search capabilities for building your personal collection of exceptional dining experiences.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development (with dev mode)
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview

# Install dependencies
npm i

# Deploy to CloudFlare Workers (NOT Pages)
npx wrangler deploy
```

## Deployment

This project uses **CloudFlare Workers** (NOT CloudFlare Pages).

- **Workers URL**: `wandering-paths-record.herrings.workers.dev`
- **Custom Domain**: `restaurants.hultberg.org`
- **Deploy Command**: `npx wrangler deploy`

The project is configured as a Workers project with static assets, not a Pages project.

## Architecture Overview

### Core Application Structure
- **Main App**: Single-page React application with routing (`App.tsx`)
- **Pages**: Primary views (`Index.tsx` for main interface, `NotFound.tsx` for 404s)
- **Components**: Modular UI components with consistent patterns

### Key Components
- **PlaceCard**: Displays individual restaurant information with multi-location display, rating systems, status badges, and admin-controlled action buttons
- **AdminPanel**: AI-powered restaurant extraction from URLs with editable forms and multi-location management
- **FilterBar**: Multi-criteria filtering with text search, cuisine, status, and GPS-based "Near Me" functionality
- **InteractiveMap**: Full Mapbox integration with clustering, popups, filtering, and restaurant count display
- **MapView**: Toggle component for seamless list/map view switching

### Data Model
The application uses a multi-location restaurant architecture:

```typescript
interface Restaurant {
  id: string;
  name: string;
  address: string; // Human-readable summary
  website?: string;
  public_rating?: number; // Public rating 1-5
  personal_rating?: number; // Personal rating when visited
  status: 'must-visit' | 'visited';
  description?: string; // Personal notes
  visit_count?: number;
  cuisine?: string;
  must_try_dishes?: string[];
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string;
  locations?: RestaurantAddress[]; // Multiple locations per restaurant
}

interface RestaurantAddress {
  id: string;
  restaurant_id: string;
  location_name: string; // e.g., "Canary Wharf", "Shoreditch"
  full_address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
}
```

### Design System
- **Color Palette**: Earth tones with warm-stone, burnt-orange, deep-burgundy, olive-green, and charcoal
- **Typography**: Space Grotesk for headings (font-geo), JetBrains Mono for monospace text
- **Component Library**: shadcn/ui with custom brutalist and hero button variants
- **Styling**: Tailwind CSS with custom design tokens

### State Management
- React Query (TanStack Query) for server state management
- Context-based authentication state (AuthContext)
- Local component state for UI interactions

### Current Production Features
- ✅ **Full CRUD Operations**: Complete restaurant management (create, read, update, delete)
- ✅ **AI-Powered Extraction**: Claude 3.5 Sonnet integration for URL-based restaurant extraction
- ✅ **Multi-Location Support**: Restaurant chains with individual location management
- ✅ **Advanced Search**: Multi-location text search and GPS-based "Near Me" functionality
- ✅ **Interactive Maps**: Mapbox integration with clustering and filtering
- ✅ **Authentication**: Magic link system with admin-controlled interface
- ✅ **Mobile Optimization**: Responsive design with mobile geolocation support
- ✅ **Production Deployment**: Live on Cloudflare Workers with custom domain

### Recent Enhancements
- ✅ **Multi-Location Display**: Restaurant cards show all locations for chains
- ✅ **Enhanced Search**: Find restaurants by location names (e.g., "Canary Wharf" finds Dishoom)
- ✅ **Map Counter**: Restaurant count display in map legend
- ✅ **Admin Controls**: Hidden from unauthenticated users for clean public interface
- ✅ **Production Logging**: Cloudflare Workers observability enabled

## Key Files to Understand

**Core Application:**
- `src/pages/Index.tsx` - Main interface with header "Curated Restaurant Hitlist" and view management
- `src/components/PlaceCard.tsx` - Restaurant cards with multi-location display and admin controls
- `src/components/AdminPanel.tsx` - AI-powered extraction interface with editable forms
- `src/components/FilterBar.tsx` - Multi-criteria filtering with text search and GPS
- `src/components/InteractiveMap.tsx` - Mapbox integration with clustering and popups
- `src/App.tsx` - Main app with routing and authentication provider

**Authentication & Data:**
- `src/contexts/AuthContext.tsx` - Authentication context with magic link integration
- `src/services/restaurants.ts` - Complete CRUD service for multi-location restaurant operations
- `src/lib/supabase.ts` - Supabase client configuration
- `src/types/place.ts` - TypeScript interfaces for Restaurant and RestaurantAddress

**AI Extraction System:**
- `src/services/claudeExtractor.ts` - Claude API integration with caching
- `src/services/intelligentExtractor.ts` - Smart URL content analysis
- `server.cjs` - Local development API server for extraction
- `src/worker.js` - Cloudflare Workers API for production extraction

**Production Infrastructure:**
- `wrangler.toml` - Cloudflare Workers configuration with custom domain
- `tailwind.config.ts` - Custom earth-tone design system
- `SPECIFICATIONS/` - Complete technical documentation

## Development Notes

- **Production-Ready**: Full application deployed to restaurants.hultberg.org with Cloudflare Workers
- **Multi-Location Architecture**: Restaurant brands can have multiple individual locations
- **AI Integration**: Claude 3.5 Sonnet powers intelligent restaurant extraction from URLs
- **Interactive Maps**: Mapbox GL JS provides clustering, filtering, and mobile-optimized experience
- **Search Enhancement**: Multi-location search finds restaurants by any location name or address
- **Admin Security**: Edit and status buttons hidden from unauthenticated users
- **Design System**: Earth-toned brutalist aesthetic with strong visual hierarchy
- **Mobile Optimized**: GPS location services work across mobile browsers with enhanced error handling
- **Logging Enabled**: Cloudflare Workers observability configured for production monitoring
