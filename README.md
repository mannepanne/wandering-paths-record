# Wandering Paths - Curated Restaurant Hitlist

A sophisticated restaurant curation and discovery application for building your personal collection of exceptional dining experiences around the world.

**Build your curated restaurant hitlist** - Remember remarkable restaurants you've discovered and track must-visit destinations for future culinary adventures.

## Overview

Wandering Paths helps you organize and remember exceptional restaurants through intelligent curation tools. Track must-visit dining destinations, record culinary experiences, and build your own curated collection of remarkable restaurants with AI-powered extraction from restaurant websites.

### ✨ Key Features

**🎯 Intelligent Restaurant Extraction**
- **URL-to-Data Magic**: Paste any restaurant website URL and get comprehensive details automatically extracted
- **Multi-Location Support**: Handles restaurant chains with individual location details
- **AI-Powered Analysis**: Claude 3.5 Sonnet analyzes websites for cuisine, atmosphere, pricing, and must-try dishes
- **Smart Business Detection**: Automatically identifies restaurants vs. other business types
- **International Support**: Works with UK, French, and US restaurant formats
- **Integrated Geocoding**: Automatic coordinate extraction during restaurant creation - no manual geocoding needed

**📋 Comprehensive Restaurant Data**
- **Rich Details**: Cuisine types, chef names, price ranges, atmosphere descriptions, dietary options
- **Location Management**: Multiple addresses per restaurant with individual phone numbers and hours
- **Must-Try Dishes**: AI-extracted signature dishes and specialties from menus and content
- **Personal Tracking**: Mark as "must-visit" or "visited" with personal ratings and notes

**🔧 Smart Admin Panel**
- **Always Editable**: All extracted data populates editable forms for review and correction
- **Dynamic Location Management**: Add, remove, and edit multiple restaurant locations
- **Cache Management**: Smart caching prevents duplicate extractions with manual cache clearing
- **Progress Tracking**: Real-time extraction progress with detailed status updates
- **Coordinate Preservation**: Editing restaurants preserves existing geocoded coordinates
- **Integrated Geocoding**: Automatic coordinate extraction with progress feedback during saves

**🎨 Curated Discovery Experience**
- **Smart Filtering**: Filter by cuisine type, visit status, and location
- **Multi-Location Search**: Search across restaurant brands and individual locations (e.g., "Canary Wharf" finds Dishoom)
- **Enhanced Text Search**: Search restaurants by name, cuisine, location names, or addresses
- **GPS "Near Me" Search**: Find restaurants within 20-minute walking distance with toggle functionality
- **Mobile-Optimized GPS**: Enhanced geolocation for mobile Chrome Android and other mobile browsers
- **Interactive Map**: Mapbox-powered map with clustering, popups, and real-time filtering
- **Restaurant Count Display**: Map legend shows count of restaurants matching current filters
- **Multi-Location Cards**: List view displays all locations for restaurant chains (e.g., "5 locations: Shoreditch, Canary Wharf...")
- **List/Map Toggle**: Seamless switching between list and map views with consistent filtering
- **Clean Public Interface**: Admin controls hidden from unauthenticated visitors
- **Beautiful Design**: Earth-toned brutalist design with strong visual hierarchy
- **Status Badges**: Visual indicators for visit status, price range, and cuisine type
- **Responsive Layout**: Works seamlessly on desktop and mobile devices

## Tech Stack

**Frontend Architecture:**
- **Framework**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui + Radix UI primitives  
- **Styling**: Tailwind CSS with custom earth-tone brutalist design system
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6

**Backend & AI Integration:**
- **Database**: Supabase with multi-location restaurant architecture
- **AI Engine**: Anthropic Claude 3.5 Sonnet API for content analysis
- **Maps**: Mapbox GL JS with clustering, popups, and mobile optimization
- **Production API**: Cloudflare Workers runtime with integrated API routes
- **Development API**: Express.js development server with CORS support
- **Content Fetching**: Multi-proxy web scraping with automatic fallbacks
- **Caching**: URL-based localStorage caching with 24-hour expiration

**Development Tools:**
- **Build System**: Vite with hot module replacement
- **Type Checking**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier
- **Production Deployment**: Cloudflare Workers with custom domain
- **Development Environment**: Local development with hot reload

## Development

### Prerequisites

- Node.js (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm

### Getting Started

```bash
# Install dependencies
npm i

# Start the frontend development server
npm run dev

# In a separate terminal, start the local API server for restaurant extraction
node server.cjs

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Environment Setup

#### Local Development
For local development, you'll need:

1. **Claude API Key**: Add `VITE_CLAUDE_API_KEY` to your `.env` file (for restaurant extraction)
2. **Supabase Configuration**: Add Supabase URL and anon key to `.env`
3. **Mapbox Access Token**: Add `VITE_MAPBOX_ACCESS_TOKEN` to `.env` (for interactive maps)
4. **Local API Server**: Run `node server.cjs` alongside the frontend development server

```bash
# .env file for local development
VITE_CLAUDE_API_KEY=your_claude_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

#### Production Deployment
The app is live in production at:
- **Primary**: https://restaurants.hultberg.org
- **Backup**: https://wandering-paths-record.herrings.workers.dev

Production uses Cloudflare Workers with secure environment variable management.

### Project Structure

```
├── server.cjs                    # Local API server for restaurant extraction
├── src/
│   ├── worker.js                 # Cloudflare Workers API (production)
│   ├── api/
│   │   └── extract-restaurant.ts # Universal API client (dev + production)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── AdminPanel.tsx        # Admin interface with extraction & dynamic forms
│   │   ├── PlaceCard.tsx         # Restaurant display with status management
│   │   ├── FilterBar.tsx         # Multi-criteria filtering interface
│   │   ├── InteractiveMap.tsx    # Mapbox-powered map with clustering and popups
│   │   └── MapView.tsx           # Map view toggle (legacy component)
│   ├── contexts/
│   │   └── AuthContext.tsx       # Supabase authentication context
│   ├── hooks/
│   │   └── useRestaurantExtraction.ts # URL extraction workflow hook
│   ├── pages/
│   │   ├── Index.tsx             # Main application with header "Curated Restaurant Hitlist"
│   │   └── NotFound.tsx          # 404 page
│   ├── services/
│   │   ├── claudeExtractor.ts    # Extraction cache management
│   │   └── restaurants.ts        # Supabase CRUD operations
│   ├── types/
│   │   └── place.ts             # TypeScript interfaces for Restaurant & RestaurantAddress
│   └── lib/                     # Utilities & Supabase client
├── wrangler.toml                 # Cloudflare Workers configuration
├── SPECIFICATIONS/
│   └── extraction_system_requirements.md # Comprehensive system documentation
└── CLAUDE.md                    # Project context and collaboration guidelines
```

## Design System

The app uses an earth-toned "brutalist" design aesthetic:

- **Colors**: Warm stone, burnt orange, deep burgundy, olive green, charcoal
- **Typography**: Space Grotesk for headings, JetBrains Mono for code/data
- **Components**: Bold, high-contrast UI with strong visual hierarchy

## Current Status

## 🌐 Live Production Deployment

**Visit the live app:** **https://restaurants.hultberg.org**

The restaurant curation system is fully deployed on Cloudflare Workers with global edge distribution, providing sub-100ms loading times worldwide.

### ✅ Production Features

**🚀 AI-Powered Restaurant Extraction System**
- Claude 3.5 Sonnet API integration running in Cloudflare Workers runtime
- Multi-location restaurant support with individual address management
- International format support (UK, French, US postal codes and addresses)
- Smart business type detection (restaurants vs. wine bars, hotels, retail, etc.)
- Robust error handling including rate limit management and user-friendly messages
- URL-based caching system with 24-hour expiration and manual cache management
- Integrated automatic geocoding during restaurant extraction - coordinates added seamlessly

**💾 Complete Database Architecture**
- Supabase integration with multi-table restaurant architecture
- `restaurants` table for main restaurant data with human-readable address summaries
- `restaurant_addresses` table for detailed individual location data with geocoded coordinates
- `restaurants_with_locations` view for efficient joined queries with coordinate data
- Complete TypeScript interfaces and CRUD service layer
- Production-ready Row Level Security (RLS) policies

**🎨 Production-Ready Frontend**
- React + TypeScript application with brutalist earth-tone design system
- Dynamic admin panel with editable form population from extraction results
- Real-time extraction progress tracking with detailed status updates
- Responsive restaurant cards with status badges and comprehensive filtering
- Multi-location search across restaurant brands and individual locations
- Enhanced text search finding restaurants by location names (e.g., "Canary Wharf" finds Dishoom)
- GPS-based "Near Me" search with 20-minute walking radius and toggle functionality
- Mobile-optimized geolocation with enhanced timeout handling and error messages
- Interactive Mapbox-powered map with clustering, popups, and mobile optimization
- Restaurant count display in map legend updating with filters
- Multi-location display in restaurant cards showing all locations for chains
- Seamless list/map view switching with consistent filtering across both modes
- Clean public interface with admin controls hidden from unauthenticated users
- Complete authentication system with secure credential management
- Automatic coordinate preservation during restaurant editing

**🌍 Professional Infrastructure**
- Cloudflare Workers deployment with custom domain (restaurants.hultberg.org)
- Global CDN with edge computing for optimal performance
- Secure environment variable management via Cloudflare secrets
- Automatic SSL certificate management and renewal
- Professional hosting with 99.9% uptime and automatic scaling

### 🎯 Optional Future Enhancements

**Potential Additional Features:**
- Personal rating and notes interface for visited restaurants
- Social sharing and export capabilities
- Advanced map features (heat maps, route planning, custom map styles)
- Mobile app development using same React components
- Advanced analytics and reporting features

The application is **live in production** and fully operational for restaurant curation with intelligent URL-based data extraction, comprehensive restaurant management, and professional hosting infrastructure.

## Contributing

This is a personal curation tool, but the codebase demonstrates modern React patterns with TypeScript, component-based architecture, and design system implementation.
