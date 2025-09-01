# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Rules of Engagement

Claude collaboration and ways of working instructions: @.claude/CLAUDE.md

## Project Overview

This is "Wandering Paths" - a restaurant curation and diary application built with the Vite + React + shadcn/ui + TypeScript stack. The app allows users to remember, track, and manage interesting restaurants.

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
```

## Architecture Overview

### Core Application Structure
- **Main App**: Single-page React application with routing (`App.tsx`)
- **Pages**: Primary views (`Index.tsx` for main interface, `NotFound.tsx` for 404s)
- **Components**: Modular UI components with consistent patterns

### Key Components
- **PlaceCard**: Displays individual restaurant information with rating systems, status badges, and action buttons
- **AdminPanel**: Protected area for adding new restaurants via URL extraction
- **FilterBar**: Allows filtering restaurants by type and status
- **MapView**: Toggle between list and map views (map functionality not yet implemented)

### Data Model
Restaurants are represented with the following structure:
```typescript
interface Place {
  id: string;
  name: string;
  type: string; // restaurant, gallery, bookshop, library, etc.
  address: string;
  website?: string;
  rating?: number; // Public rating 1-5
  status: 'must-visit' | 'visited';
  personalRating?: number; // Personal rating when visited
  description?: string; // Personal notes when visited
  visitCount?: number;
  cuisine?: string; // For restaurants
  mustTryDishes?: string[]; // For restaurants
}
```

### Design System
- **Color Palette**: Earth tones with warm-stone, burnt-orange, deep-burgundy, olive-green, and charcoal
- **Typography**: Space Grotesk for headings (font-geo), JetBrains Mono for monospace text
- **Component Library**: shadcn/ui with custom brutalist and hero button variants
- **Styling**: Tailwind CSS with custom design tokens

### State Management
- Currently uses local component state
- React Query (TanStack Query) is configured but not yet utilized
- Mock data is used for demonstration purposes

### Implemented Features
- ✅ Supabase integration for data persistence (complete setup and CRUD service)
- ✅ Magic link authentication with email-based authorization
- ✅ Automated restaurant metadata extraction from URLs (intelligent content analysis)
- ✅ Authentication context and protected routes
- ✅ Complete backend service layer (placesService)

### Features In Progress
- 🚧 Connecting UI components to live Supabase data
- 🚧 React Query integration for data management

### Planned Features (Not Yet Implemented)
- Real map integration for MapView
- Restaurant editing and deletion UI
- Location-based search and filtering

## Key Files to Understand

**Core Application:**
- `src/pages/Index.tsx` - Main application interface and layout
- `src/components/PlaceCard.tsx` - Core place display component with rating and interaction logic
- `src/components/AdminPanel.tsx` - Admin interface for adding places
- `src/App.tsx` - Main app with routing and authentication provider

**Authentication & Data:**
- `src/contexts/AuthContext.tsx` - Authentication context with magic link integration
- `src/components/LoginForm.tsx` - Magic link login form with email authorization
- `src/services/places.ts` - Complete CRUD service for restaurant operations
- `src/lib/supabase.ts` - Supabase client configuration

**Metadata Extraction:**
- `src/services/intelligentExtractor.ts` - Smart URL content analysis
- `src/services/smartMetadata.ts` - Restaurant-specific metadata extraction
- `src/types/place.ts` - TypeScript interfaces for restaurant data

**Design System:**
- `tailwind.config.ts` - Custom color palette and design tokens
- `package.json` - Dependencies and scripts

## Development Notes

- The app uses a "brutalist" design aesthetic with bold colors and typography
- Status badges and type-specific color coding provide visual hierarchy
- Personal ratings are only shown for visited places
- The admin panel is currently in demo mode - full functionality requires Supabase setup
- All UI components follow the shadcn/ui patterns with custom styling
