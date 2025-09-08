# Wandering Paths - Curated Restaurant Hitlist

**Build your curated restaurant hitlist** - A sophisticated app to remember remarkable restaurants and track must-visit destinations for future culinary adventures around the world.

**Visit the live app:** **https://restaurants.hultberg.org**

## Why This Project Exists

When visiting new or even familiar cities, it's easy to lose track of amazing restaurants you've discovered or heard about. This app solves that problem by creating your personal curated collection of exceptional dining experiences, making it easy to look them up when planning an outing.

**Perfect for:**
- **Food Enthusiasts** who want to remember great restaurants they've visited
- **Travel Planners** building lists of must-visit restaurants before trips
- **City Explorers** tracking neighborhood gems and restaurant chains across locations
- **Culinary Adventurers** organizing dining experiences by cuisine, price, and atmosphere

## Key Features

**🎯 Smart Restaurant Discovery**
- **AI-Powered Extraction**: Simply add a restaurant URL and get comprehensive details automatically extracted
- **Multi-Location Search**: Find restaurants by location names (e.g., search "Canary Wharf" to find Dishoom)
- **GPS "Near Me"**: Discover restaurants within walking distance wherever you are
- **Interactive Maps**: Explore restaurants geographically with clustering and filtering

**📋 Intelligent Organization**
- **Multi-Location Support**: Track restaurant chains with all their individual locations
- **Smart Filtering**: Filter by cuisine, visit status, price range, and location
- **Status Tracking**: Mark restaurants as "must-visit" or "visited"
- **Personal Notes**: Add ratings, descriptions, and must-try dishes

**🌍 Travel-Friendly**
- **International Support**: Works with restaurants worldwide
- **Mobile Optimized**: Perfect for remembering restaurants while on-the-go and planning visits
- **Offline Ready**: Core functionality works without constant internet connection

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
**Backend:** Supabase (database) + Cloudflare Workers (API)
**AI:** Anthropic Claude 3.5 Sonnet for content extraction
**Maps:** Mapbox GL JS with clustering and mobile optimization
**Hosting:** Cloudflare Workers with global edge distribution

## Quick Start

```bash
# Install dependencies
npm i

# Start development servers (run both commands in separate terminals)
npm run dev          # Frontend development server
node server.cjs      # Local API server for restaurant extraction

# Build for production
npm run build

# Deploy to production (CloudFlare Workers)
npx wrangler deploy
```

## Environment Setup

Create a `.env` file:

```bash
# Required for local development
VITE_CLAUDE_API_KEY=your_claude_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

## Documentation

- **[Technical Specifications](SPECIFICATIONS/technical_specifications.md)** - Comprehensive developer guide
- **[Implementation Plan](SPECIFICATIONS/implementation_plan.md)** - Detailed development progress
- **[CLAUDE.md](CLAUDE.md)** - Project context and collaboration guidelines

## Architecture Highlights

- **Multi-Location Restaurant Data**: Restaurant brands (e.g., Dishoom) with individual locations (Shoreditch, Canary Wharf, Glasgow)
- **AI-Powered Extraction**: Automatically extract restaurant details from any website URL
- **Intelligent Search**: Find restaurants by brand name, cuisine, location names, or addresses
- **Production-Ready**: Live on Cloudflare Workers with professional hosting infrastructure

## Scope

This is a personal curation tool, but the codebase demonstrates modern React patterns with TypeScript, AI integration, and production deployment practices.

**Live Production App:** https://restaurants.hultberg.org
