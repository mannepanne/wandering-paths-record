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

**🎨 Curated Discovery Experience**
- **Smart Filtering**: Filter by cuisine type, visit status, and location
- **Text Search**: Search restaurants by name, city, country, or neighborhood
- **GPS "Near Me" Search**: Find restaurants within 20-minute walking distance with toggle functionality
- **Interactive Map**: Mapbox-powered map with clustering, popups, and real-time filtering
- **List/Map Toggle**: Seamless switching between list and map views with consistent filtering
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
- **Local API Server**: Express.js development server with CORS support
- **Content Fetching**: Multi-proxy web scraping with automatic fallbacks
- **Caching**: URL-based localStorage caching with 24-hour expiration

**Development Tools:**
- **Build System**: Vite with hot module replacement
- **Type Checking**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier
- **Deployment Ready**: Netlify-compatible build output

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

For full functionality, you'll need:

1. **Claude API Key**: Add `VITE_CLAUDE_API_KEY` to your `.env` file (for restaurant extraction)
2. **Supabase Configuration**: Add Supabase URL and anon key to `.env`
3. **Mapbox Access Token**: Add `VITE_MAPBOX_ACCESS_TOKEN` to `.env` (for interactive maps)
4. **Local API Server**: Run `node server.cjs` alongside the frontend development server

```bash
# .env file
VITE_CLAUDE_API_KEY=your_claude_api_key_here
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### Project Structure

```
├── server.cjs                    # Local API server for restaurant extraction
├── src/
│   ├── api/
│   │   └── extract-restaurant.ts # Claude API integration client-side
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

### ✅ Fully Implemented & Operational

**🚀 AI-Powered Restaurant Extraction System**
- Claude 3.5 Sonnet API integration with intelligent content analysis
- Multi-location restaurant support with individual address management
- International format support (UK, French, US postal codes and addresses)
- Smart business type detection (restaurants vs. wine bars, hotels, retail, etc.)
- Robust error handling including rate limit management and user-friendly messages
- URL-based caching system with 24-hour expiration and manual cache management

**💾 Complete Database Architecture**
- Supabase integration with multi-table restaurant architecture
- `restaurants` table for main restaurant data with human-readable address summaries
- `restaurant_addresses` table for detailed individual location data with geocoded coordinates
- `restaurants_with_locations` view for efficient joined queries with coordinate data
- Complete TypeScript interfaces and CRUD service layer
- Clean architecture with coordinates properly managed in address table

**🎨 Production-Ready Frontend**
- React + TypeScript application with brutalist earth-tone design system
- Dynamic admin panel with editable form population from extraction results
- Real-time extraction progress tracking with detailed status updates
- Responsive restaurant cards with status badges and comprehensive filtering
- Complete text search across restaurant names and locations
- GPS-based "Near Me" search with 20-minute walking radius and toggle functionality
- Interactive Mapbox-powered map with clustering, popups, and mobile optimization
- Seamless list/map view switching with consistent filtering across both modes
- Complete authentication system ready for protected routes

**🔧 Development Infrastructure**
- Local Express.js API server for development with CORS support
- Multi-proxy content fetching with automatic fallbacks
- Comprehensive error handling and structured API responses
- Cache management UI with statistics and manual clearing
- Environment configuration for Claude API and Supabase integration

### 🎯 Ready for Enhancement

**Optional Future Features (Not Required for Core Functionality):**
- Restaurant editing interface (data is fully editable via admin panel)
- Personal rating and notes interface for visited restaurants
- Social sharing and export capabilities
- Advanced map features (heat maps, route planning, custom map styles)
- Mobile app development using same React components

The application is **production-ready** for personal restaurant curation with intelligent URL-based data extraction and comprehensive restaurant management.

## Contributing

This is a personal curation tool, but the codebase demonstrates modern React patterns with TypeScript, component-based architecture, and design system implementation.
