# Implementation Plan: Restaurant Record

This document outlines the step-by-step implementation plan to transform the current mockup into a fully functional restaurant curation application.

## Current State

- ✅ React app with brutalist design and earth-tone palette
- ✅ Restaurant cards displaying mock data with cuisine and pricing
- ✅ Filter/search UI components (cuisine, status, location search)
- ✅ Admin panel UI mockup
- ✅ Map view placeholder
- ✅ Responsive design and clean layout

## Implementation Phases

### Phase 1: Database Foundation
**Goal**: Set up Supabase backend with proper data schema

#### 1.1 Supabase Project Setup
- [x] Create new Supabase project
- [x] Configure environment variables in project
- [x] Install Supabase client library
- [x] Set up connection and basic configuration

#### 1.2 Database Schema Design
- [x] Create `places` table with restaurant-focused fields:
  - `id` (UUID, primary key)
  - `name` (text, required)
  - `address` (text, required)
  - `latitude` (numeric, nullable)
  - `longitude` (numeric, nullable)
  - `website` (text, nullable)
  - `public_rating` (numeric 1-5, nullable)
  - `personal_rating` (numeric 1-5, nullable)
  - `status` (enum: must-visit, visited)
  - `description` (text, nullable) - personal notes
  - `visit_count` (integer, default 1)
  - `cuisine` (text, nullable)
  - `must_try_dishes` (text array, nullable)
  - `price_range` (text, nullable) - $, $$, $$$, $$$$
  - `atmosphere` (text, nullable)
  - `dietary_options` (text array, nullable)
  - `booking_required` (boolean, nullable)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

#### 1.3 Database Policies & RLS
- [ ] Enable Row Level Security (RLS)
- [ ] Create policies for authenticated access only
- [ ] Set up database indexes for performance

### Phase 2: Authentication
**Goal**: Implement simple magic link authentication for admin access

#### 2.1 Supabase Auth Setup
- [ ] Configure Supabase authentication
- [ ] Set up magic link email provider
- [ ] Configure redirect URLs

#### 2.2 Frontend Auth Integration
- [ ] Create auth context/hooks
- [ ] Add login form to admin panel
- [ ] Implement logout functionality
- [ ] Add auth state management
- [ ] Protect admin routes

#### 2.3 Auth UI Components
- [ ] Create login/logout components
- [ ] Add loading states for auth operations
- [ ] Handle auth errors gracefully
- [ ] Update admin panel access control

### Phase 3: Core CRUD Operations
**Goal**: Enable adding, editing, and managing places

#### 3.1 Data Layer Setup
- [ ] Create Supabase service functions
- [ ] Implement CRUD operations (Create, Read, Update, Delete)
- [ ] Add error handling and validation
- [ ] Set up React Query integration

#### 3.2 Add Restaurant Functionality
- [x] Create restaurant creation form with URL extraction
- [x] Implement intelligent restaurant metadata extraction
- [x] Add form validation for restaurant data
- [x] Store new restaurants in database
- [x] Update UI after successful creation

#### 3.3 Edit Restaurant Functionality
- [ ] Create restaurant editing modal/form
- [ ] Pre-populate form with existing restaurant data
- [ ] Implement update operations
- [ ] Handle status changes (must-visit ↔ visited)
- [ ] Add personal rating and notes for visited restaurants

#### 3.4 Delete Restaurant Functionality
- [ ] Add delete confirmation dialog
- [ ] Implement soft delete or hard delete
- [ ] Update UI after deletion

### Phase 4: Enhanced Search & Filtering
**Goal**: Make location-based search and filtering functional

#### 4.1 Geographic Data Integration
- [ ] Add geocoding service (Google Maps API or similar)
- [ ] Implement address-to-coordinates conversion
- [ ] Store coordinates for existing mock data
- [ ] Add coordinates to place creation flow

#### 4.2 Location Search Implementation
- [ ] Implement location search functionality
- [ ] Add distance calculation between points
- [ ] Create "Near Me" geolocation feature
- [ ] Add search radius configuration

#### 4.3 Advanced Filtering
- [x] Implement database-level filtering by cuisine
- [ ] Add sorting options (distance, rating, date added, price range)
- [ ] Optimize queries for performance
- [ ] Add search result relevance scoring

### Phase 5: Advanced Restaurant Extraction
**Goal**: Enhance automatic restaurant information extraction

#### 5.1 Web Content Analysis
- [x] Research web scraping libraries/services
- [x] Implement intelligent restaurant metadata extraction
- [x] Handle common restaurant website structures
- [x] Extract: name, address, rating, description

#### 5.2 Restaurant-Specific Data Enhancement
- [x] Identify restaurant websites with contextual analysis
- [x] Extract cuisine type intelligently
- [x] Extract menu items/signature dishes
- [x] Detect price range and atmosphere
- [x] Identify dietary options and booking requirements

#### 5.3 Error Handling & Fallbacks
- [ ] Handle failed scraping gracefully
- [ ] Provide manual override options
- [ ] Cache scraped data appropriately
- [ ] Add retry mechanisms

### Phase 6: Map Integration
**Goal**: Replace map placeholder with functional interactive map

#### 6.1 Map Service Selection
- [ ] Choose map provider (Google Maps, Mapbox, etc.)
- [ ] Set up API keys and billing
- [ ] Install map component library

#### 6.2 Map Implementation
- [ ] Replace map placeholder with actual map
- [ ] Display restaurants as markers on map
- [ ] Implement marker clustering for dense areas
- [ ] Add info windows/popups for restaurant details

#### 6.3 Map Interactions
- [ ] Enable map-based filtering (visible area)
- [ ] Add "search this area" functionality
- [ ] Implement marker click interactions
- [ ] Add current location indicator

### Phase 7: Performance & Polish
**Goal**: Optimize performance and user experience

#### 7.1 Performance Optimization
- [ ] Implement pagination or infinite scroll
- [ ] Add loading states throughout the app
- [ ] Optimize database queries
- [ ] Add caching strategies

#### 7.2 Error Handling
- [ ] Add comprehensive error boundaries
- [ ] Implement retry mechanisms
- [ ] Add user-friendly error messages
- [ ] Handle offline scenarios

#### 7.3 User Experience Polish
- [ ] Add smooth transitions and animations
- [ ] Improve mobile experience
- [ ] Add keyboard shortcuts
- [ ] Implement undo functionality

## Technical Considerations

### Environment Variables Needed
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key (optional)
```

### Dependencies to Add
- `@supabase/supabase-js` - Database and auth
- `@tanstack/react-query` - Already installed, needs configuration
- Map library (Google Maps React, Mapbox GL JS, etc.)
- Geocoding service integration
- Web scraping service (consider serverless function)

### Deployment Considerations
- Environment variable configuration
- Supabase project setup
- Domain configuration for magic links
- API rate limiting and costs

## Success Metrics

After completion, the app should:
1. Allow secure admin access via magic link
2. Store and retrieve restaurants from Supabase database
3. Enable adding restaurants via URL with automatic metadata extraction
4. Support location-based search and filtering by cuisine
5. Display restaurants on an interactive map
6. Handle all CRUD operations smoothly
7. Work responsively across devices

## Estimated Timeline

- **Phase 1**: 1-2 days (Database setup)
- **Phase 2**: 1-2 days (Authentication)
- **Phase 3**: 2-3 days (Core CRUD)
- **Phase 4**: 2-3 days (Search & filtering)
- **Phase 5**: 2-3 days (URL extraction)
- **Phase 6**: 1-2 days (Map integration)
- **Phase 7**: 1-2 days (Polish)

**Total estimated time**: 10-17 days of development work

This plan prioritizes getting a working MVP quickly (Phases 1-3) before adding advanced features.
