# Technical Specifications: Curated Restaurant Hitlist

## Overview

The Curated Restaurant Hitlist is a sophisticated restaurant curation and discovery application designed to help users build their personal collection of exceptional dining experiences worldwide. The system uses AI-powered extraction, multi-location restaurant support, interactive maps, and comprehensive search capabilities.

## Architecture

### Tech Stack

**Frontend:**
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom earth-tone brutalist design system
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Maps**: Mapbox GL JS with clustering and mobile optimization

**Backend & AI:**
- **Database**: Supabase with multi-location restaurant architecture
- **AI Engine**: Anthropic Claude Sonnet 4.5 API for content analysis (centralized config in `src/config/claude.ts`)
- **Production API**: Cloudflare Workers runtime with integrated API routes
- **Development API**: Express.js development server with CORS support
- **Content Fetching**: Multi-proxy web scraping with automatic fallbacks
- **Caching**: URL-based localStorage caching with 24-hour expiration

**⚠️ Claude Model Management:** Model versions are centralized in `src/config/claude.ts` (TypeScript) and as constants in `server.cjs`/`src/worker.js` (Node.js) to handle Anthropic's periodic model deprecations. See `SPECIFICATIONS/claude_model_updates.md` for maintenance instructions.

**Development & Deployment:**
- **Build System**: Vite with hot module replacement
- **Type Checking**: TypeScript strict mode
- **Code Quality**: ESLint + Prettier
- **Production**: Cloudflare Workers with custom domain (restaurants.hultberg.org)
- **Development**: Local hot reload with dual-server setup

### Data Architecture

The application uses a sophisticated multi-location restaurant architecture:

#### Database Schema

**`restaurants`**** Table** - Main restaurant brands
```sql
- id (uuid, primary key)
- name (text) - Restaurant brand name
- address (text) - Human-readable address summary
- website (text)
- public_rating (numeric) - Public rating 1-5
- personal_rating (numeric) - Personal rating when visited
- status (text) - 'must-visit' | 'visited'
- description (text) - Personal notes
- visit_count (integer)
- cuisine (text)
- must_try_dishes (text[]) - Array of dish names
- price_range (text) - '$' | '$$' | '$$$' | '$$$$'
- atmosphere (text)
- dietary_options (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**`restaurant_addresses`**** Table** - Individual locations
```sql
- id (uuid, primary key)
- restaurant_id (uuid, foreign key)
- location_name (text) - e.g., "Canary Wharf", "Shoreditch"
- full_address (text)
- country (text)
- city (text)
- latitude (numeric) - Geocoded coordinates
- longitude (numeric) - Geocoded coordinates
- phone (text)
- created_at (timestamptz)
- updated_at (timestamptz)
```

**`restaurant_visits`**** Table** - Visit history tracking (Phase 3 complete: Full create functionality)
```sql
- id (uuid, primary key)
- restaurant_id (uuid, foreign key)
- user_id (uuid, foreign key to auth.users)
- visit_date (date) - When the restaurant was visited
- rating (personal_appreciation enum) - 'avoid' | 'fine' | 'good' | 'great'
- experience_notes (text) - Optional notes about dishes, experience (max 2000 chars)
- company_notes (text) - Optional notes about who you dined with (max 500 chars)
- is_migrated_placeholder (boolean) - True for historical pre-2026 data
- created_at (timestamptz)
- updated_at (timestamptz)
```

**Row Level Security:** Visit data protected by RLS policies - users can only view/edit their own visits.

**Security Features (Phase 3):**
- XSS prevention: Strict HTML character rejection (`<`, `>`, `&`)
- Rating validation: Runtime checks prevent 'unknown' and invalid values
- Timezone-safe date validation: String comparison prevents edge cases
- Duplicate prevention: Unique constraint on (user_id, restaurant_id, visit_date)

**Cached Rating System:** The `restaurants.personal_appreciation` field is automatically updated by database trigger when visits are added/edited/deleted. This caching strategy prevents N+1 query problems and keeps restaurant list queries fast.

**`restaurants_with_locations`**** View** - Efficient joined queries
Provides flattened data for map display and location-based filtering.

#### TypeScript Interfaces

```typescript
interface Restaurant {
  id: string;
  name: string;
  address: string; // Human-readable summary
  website?: string;
  public_rating?: number;
  personal_rating?: number;
  status: 'must-visit' | 'visited';
  description?: string;
  visit_count?: number;
  cuisine?: string;
  must_try_dishes?: string[];
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string;
  locations?: RestaurantAddress[]; // Joined from query
  // Legacy fields for backward compatibility
  latitude?: number; 
  longitude?: number;
}

interface RestaurantAddress {
  id: string;
  restaurant_id: string;
  location_name: string;
  full_address: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  created_at: string;
  updated_at: string;
}
```

## Key Features & Components

### 1. AI-Powered Restaurant Extraction

**Components:** `AdminPanel.tsx`, `claudeExtractor.ts`, `worker.js`, `server.cjs`

**Capabilities:**
- Claude 3.5 Sonnet API integration for intelligent content analysis
- Multi-location restaurant detection and extraction
- International format support (UK, French, US)
- Smart business type detection (restaurants vs. other venues)
- Automatic geocoding integration during extraction
- URL-based caching with 24-hour expiration
- Real-time progress tracking with detailed status updates

**Technical Implementation:**
- Multi-proxy content fetching with fallbacks
- Content size optimization to prevent token limits
- Rate limit detection and user-friendly error messaging
- Structured JSON response parsing and validation

### 2. Multi-Location Restaurant Management

**Components:** `PlaceCard.tsx`, `restaurants.ts`, `InteractiveMap.tsx`

**Capabilities:**
- Restaurant brand approach (one card per brand, multiple locations)
- Individual location display in cards (e.g., "5 locations: Shoreditch, Canary Wharf...")
- Dynamic location editing (add/remove/edit addresses)
- Location-specific data (phone numbers, addresses, coordinates)

**Search Enhancement:**
- Multi-location text search across restaurant brands AND individual locations
- Example: "Canary Wharf" finds Dishoom (matched via location name)
- Search fields: restaurant name, cuisine, location names, location addresses

### 3. Advanced Search & Filtering

**Components:** `FilterBar.tsx`, `restaurants.ts`

**Text Search:**
- Client-side filtering across joined location data
- Restaurant-level: name, address summary, cuisine
- Location-level: location names, full addresses
- Maintains restaurant brand display (one card per brand)

**GPS "Near Me" Search:**
- Browser geolocation API integration
- 20-minute walking distance radius (~1.6km)
- Haversine distance calculation
- Mobile-optimized with enhanced timeout handling
- Toggle functionality with visual feedback

**Filtering Options:**
- Cuisine type (database-driven options)
- Visit status (must-visit/visited)
- Real-time updates with React Query integration

### 4. Interactive Mapbox Integration

**Components:** `InteractiveMap.tsx`

**Features:**
- Mapbox GL JS with clustering and popups
- Custom marker colors by restaurant status:
  - Visited: Indigo (#6366f1)
  - Must Visit: Amber (#f59e0b)
- Restaurant count display in legend (updates with filters)
- Mobile-optimized touch controls
- Seamless integration with all filtering options
- Location-specific popup content with phone numbers

**Technical Details:**
- GeoJSON-based clustering with zoom-level count badges
- Individual restaurant location markers (not just restaurant brands)
- Cluster expansion on click with smooth animations
- London Bridge fallback coordinates (51.5074, -0.0877)

### 5. Authentication & Admin Controls

**Components:** `AuthContext.tsx`, `LoginForm.tsx`

**Features:**
- Magic link email authentication via Supabase
- Admin email authorization (magnus.hultberg@gmail.com)
- Admin button visibility control:
  - Edit/status buttons hidden from unauthenticated users
  - Clean public interface for general visitors
- Session management with auth state persistence

## Development Setup

### Prerequisites

- Node.js (latest LTS recommended)
- npm
- Supabase account and project
- Claude API key (Anthropic)
- Mapbox account and access token

### Environment Configuration

Create a `.env` file in the project root:

```bash
# AI Integration
VITE_CLAUDE_API_KEY=your_claude_api_key_here

# Database
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Maps
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### Installation & Development

```bash
# Install dependencies
npm i

# Start frontend development server
npm run dev

# In separate terminal - start local API server for restaurant extraction
node server.cjs

# Build for production
npm run build

# Run linter
npm run lint

# Deploy to CloudFlare Workers (production only)
npx wrangler deploy
```

### Project Structure

```
├── server.cjs                    # Local API server for restaurant extraction
├── src/
│   ├── worker.js                 # Cloudflare Workers API (production)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── AdminPanel.tsx        # AI extraction interface with editable forms
│   │   ├── PlaceCard.tsx         # Restaurant cards with multi-location display
│   │   ├── FilterBar.tsx         # Multi-criteria filtering interface
│   │   ├── InteractiveMap.tsx    # Mapbox integration with clustering
│   │   └── LoginForm.tsx         # Magic link authentication
│   ├── contexts/
│   │   └── AuthContext.tsx       # Supabase authentication context
│   ├── pages/
│   │   ├── Index.tsx             # Main application interface
│   │   └── NotFound.tsx          # 404 page
│   ├── services/
│   │   ├── claudeExtractor.ts    # AI extraction with caching
│   │   └── restaurants.ts        # Supabase CRUD operations
│   ├── types/
│   │   └── place.ts             # TypeScript interfaces
│   └── lib/
│       └── supabase.ts          # Supabase client configuration
├── wrangler.toml                 # Cloudflare Workers configuration
└── SPECIFICATIONS/               # Technical documentation
```

## Design System

### Color Palette (Earth-Tone Brutalist)
- **Warm Stone**: `#f5f1eb` (backgrounds)
- **Burnt Orange**: `#dc2626` (accents, clusters)
- **Deep Burgundy**: `#7c2d12` (headers)
- **Olive Green**: `#365314` (primary actions, "Near Me" active)
- **Charcoal**: `#1c1917` (text)

### Typography
- **Headings**: Space Grotesk (font-geo)
- **Code/Data**: JetBrains Mono
- **UI Components**: Bold, high-contrast design with strong visual hierarchy

### Custom Components
- **Brutalist Buttons**: Sharp edges, bold colors, strong shadows
- **Status Badges**: Color-coded for visit status, price range, cuisine
- **Cards**: High-contrast borders with earth-tone backgrounds

## Production Deployment

### Cloudflare Workers Architecture

**Deployment URLs:**
- **Primary**: https://restaurants.hultberg.org
- **Backup**: https://wandering-paths-record.herrings.workers.dev

**Configuration:**
- Unified full-stack deployment (React frontend + API backend)
- Global edge network with sub-100ms response times
- Secure environment variable management via Cloudflare secrets
- Custom domain with automatic SSL certificate management

**Environment Variables (Production):**
```toml
# wrangler.toml
[vars]
SUPABASE_URL = "https://drtjfbvudzacixvqkzav.supabase.co"
AUTHORIZED_ADMIN_EMAIL = "magnus.hultberg@gmail.com"

[observability]
enabled = true
```

**Secrets (via Wrangler CLI):**
- `CLAUDE_API_KEY` - Anthropic Claude API key
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `MAPBOX_ACCESS_TOKEN` - Mapbox GL JS access token

### Database Configuration

**Supabase Setup:**
1. Create Supabase project
2. Run SQL migrations for `restaurants` and `restaurant_addresses` tables
3. Create `restaurants_with_locations` view
4. Configure Row Level Security (RLS) policies
5. Set up authentication with magic link provider

**Required Database Policies:**
- Public read access for restaurant data
- Authenticated write access for admin operations
- Email-based admin authorization for sensitive operations

## Key Implementation Details

### Multi-Location Search Algorithm

```typescript
// Enhanced search across restaurant brands and individual locations
const searchTerm = filters.searchText.trim().toLowerCase();

results = results.filter(restaurant => {
  // Search restaurant-level fields
  const restaurantMatch = 
    restaurant.name.toLowerCase().includes(searchTerm) ||
    restaurant.address?.toLowerCase().includes(searchTerm) ||
    restaurant.cuisine?.toLowerCase().includes(searchTerm);
  
  // Search location-level fields
  const locationMatch = restaurant.locations?.some(location => 
    location.location_name?.toLowerCase().includes(searchTerm) ||
    location.full_address?.toLowerCase().includes(searchTerm)
  );
  
  return restaurantMatch || locationMatch;
});
```

### Mapbox Clustering Configuration

```typescript
// GeoJSON data preparation for all individual locations
const allLocationMarkers = [];
restaurants.forEach(restaurant => {
  if (restaurant.locations?.length > 0) {
    restaurant.locations.forEach(location => {
      if (location.latitude && location.longitude) {
        allLocationMarkers.push({ restaurant, location });
      }
    });
  }
});

// Mapbox clustering setup
map.addSource('restaurants', {
  type: 'geojson',
  data: geojsonData,
  cluster: true,
  clusterMaxZoom: 14,
  clusterRadius: 50
});
```

### AI Extraction Workflow

**Note:** The Claude model version is managed via centralized configuration to handle Anthropic's deprecation cycles.

```javascript
// Import centralized config (TypeScript files)
import { CLAUDE_MODEL_VERSION, CLAUDE_MAX_TOKENS } from '@/config/claude';

// Or use constants (Node.js files: server.cjs, worker.js)
const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-20250514';

// Claude API integration with structured prompts
const prompt = `Analyze this restaurant website content and extract structured data:
- Restaurant name and cuisine type
- Multi-location detection with individual addresses
- Must-try dishes from menus
- Price range and atmosphere
- Contact information per location

Return JSON with validation...`;

const response = await claude.messages.create({
  model: CLAUDE_MODEL_VERSION, // Uses centralized config
  messages: [{ role: "user", content: prompt }],
  max_tokens: 4000
});
```

**Why Centralized Config?** In January 2025, Anthropic deprecated multiple model versions without warning, breaking our extraction features. Centralizing the model version in one place prevents having to update 4+ files when models change. See `claude_model_updates.md` for details.

## Performance Optimizations

### Caching Strategy
- **URL-based extraction cache**: 24-hour localStorage caching
- **React Query cache**: 5-minute stale time, 10-minute cache time
- **Mapbox tile cache**: Browser-managed with CDN optimization

### Mobile Optimizations
- **GPS Geolocation**: Enhanced timeout handling for mobile networks
- **Touch Controls**: Optimized cluster clicking and popup interactions
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Progressive Loading**: Loading states for all async operations

## Testing & Quality Assurance

### Key Testing Areas
- **AI Extraction**: URL parsing across different restaurant website formats
- **Multi-Location Search**: Location name and address matching
- **GPS Functionality**: Cross-browser geolocation testing
- **Map Integration**: Clustering, filtering, and popup functionality
- **Authentication**: Magic link flow and admin authorization
- **Mobile Experience**: Touch interactions and responsive design

### Error Handling
- **Graceful Degradation**: App functions without AI/Maps when APIs unavailable
- **User-Friendly Messages**: Clear error states with actionable guidance
- **Retry Mechanisms**: Automatic retries for transient failures
- **Fallback Systems**: Multiple content fetching proxies, coordinate fallbacks

This technical specification provides comprehensive guidance for developers to understand, set up, and extend the Curated Restaurant Hitlist application.