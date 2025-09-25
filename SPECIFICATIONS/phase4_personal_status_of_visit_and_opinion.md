# Phase 4: Personal Visit Tracking & Opinion System

## Overview
✅ **PHASE 4.1 COMPLETED**: Personal visit tracking system with behavioral appreciation scale implemented and deployed to production.

The system allows Magnus to track restaurant visits and opinions using a unique behavioral-based appreciation scale with smart status management and interactive tooltips.

## Core Concept
Rather than traditional star ratings, use a behavioral appreciation scale that reflects real-world recommendation and revisit intentions:

1. **Schrödingers cat** - Not visited yet (Unknown, Schrödinger's restaurant)
2. **Skip** - I went here so you didn't have to (Avoid)
3. **Fine** - Perfectly fine but won't return or recommend (Neutral)
4. **Recommend** - Would recommend to friends but won't seek out again (Good)
5. **Must visit!** - Will definitely return, people are missing out (Great)

## Design Philosophy
- **Preserve existing UX** - Don't break current workflows
- **Mobile-first** - Optimize for post-meal logging scenarios
- **Progressive enhancement** - Start simple, add complexity based on usage
- **Avoid data redundancy** - Calculate derived values on-demand when possible

## Database Schema Evolution

### Phase 4.1: Core Foundation ✅ COMPLETED
```sql
-- ✅ DEPLOYED: Add appreciation column with behavioral scale
ALTER TABLE restaurants ADD COLUMN personal_appreciation TEXT CHECK (personal_appreciation IN ('unknown', 'avoid', 'fine', 'good', 'great')) DEFAULT 'unknown';

-- ✅ DEPLOYED: Update status terminology from "must-visit" to "to-visit"
UPDATE restaurants SET status = 'to-visit' WHERE status = 'must-visit';
DROP CONSTRAINT places_status_check; -- Fixed constraint naming issue
ALTER TABLE restaurants ADD CONSTRAINT places_status_check CHECK (status IN ('to-visit', 'visited'));
```

**Implementation Notes:**
- Database migration completed with constraint naming fix (`places_status_check` not `restaurants_status_check`)
- All existing restaurants migrated to new status terminology
- Personal appreciation system fully functional with 5-level behavioral scale

### Phase 4.2: Visit History (Optional Enhancement)
```sql
-- Only add if detailed visit tracking proves valuable
CREATE TABLE restaurant_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'brunch', 'lunch', 'dinner', 'visit')) NOT NULL DEFAULT 'visit',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_restaurant_visits_restaurant_id ON restaurant_visits(restaurant_id);
CREATE INDEX idx_restaurant_visits_date ON restaurant_visits(visit_date DESC);
```

### Data Strategy
- **No derived fields initially** (`total_visits`, `last_visit_date`) - calculate on-demand
- **Add caching later** if performance requires it
- **Avoid triggers** - handle consistency in application layer

## UI/UX Evolution

### Phase 4.1: Enhanced Status Management ✅ COMPLETED
**Restaurant Cards:**
- ✅ **Status toggle preserved**: Quick to-visit ↔ visited changes maintained
- ✅ **Rate button implemented**: Standalone appreciation selector (admin only)
- ✅ **Appreciation badges deployed**:
  - Unknown: Grey "Schrödingers cat..." (default state, unknown)
  - Skip: Red "⚠ I went here so you didn't have to"
  - Fine: Gray "○ Perfectly fine, but won't return or recommend"
  - Good: Blue "✓ Recommend, would recommend to friends but won't seek out again"
  - Great: Green "★ Must visit! Will definitely return, people are missing out"

**Smart Status Toggle Behavior:**
- ✅ **To-visit → Visited**: Prompts for appreciation level automatically
- ✅ **Visited → To-visit**: Simple toggle (preserved existing workflow)

**Interactive Enhancement:**
- ✅ **Hover tooltips**: Appreciation badges show descriptive text on hover
- ✅ **UI consistency**: Matching experience across PlaceCard and RestaurantDetails pages
- ✅ **Admin button integration**: Full admin controls on RestaurantDetails page
- ✅ **Mobile optimization**: Touch-friendly interface for post-meal rating

### Phase 4.2: Detailed Visit Logging (Optional)
**Add "Log Visit" Button:**
- Only appears after basic appreciation system proves useful
- Opens dedicated visit logging page for detailed tracking

**Visit Logging Page (`/restaurant/:id/visit`):**
- Create detailed visit records with dates, meal types, notes
- View visit history
- Edit/delete individual visits
- Calculate visit statistics

### Phase 4.3: About Page & Polish
**About Page (`/about`):**
- Explanation of curation concept and appreciation system
- Project background and methodology
- Style guide for the rating system

**Header Enhancement:**
- Add "(about)" link next to main title

## Technical Implementation

### Phase 4.1: Core Data Model ✅ IMPLEMENTED
```typescript
// ✅ DEPLOYED: Restaurant interface with personal appreciation
interface Restaurant {
  // ... existing fields
  status: 'to-visit' | 'visited'; // ✅ renamed from must-visit
  personal_appreciation: 'unknown' | 'avoid' | 'fine' | 'good' | 'great'; // ✅ implemented
  // NO derived fields initially - calculate visit stats on-demand
}

// ✅ IMPLEMENTED: Appreciation level configuration with visual styling
interface AppreciationLevel {
  value: string;
  label: string;
  description: string;
  icon: string;
  badgeStyle: string;
  tooltipText: string;
}

// Phase 4.2: Visit tracking (future enhancement)
interface RestaurantVisit {
  id: string;
  restaurant_id: string;
  visit_date: string;
  meal_type: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'visit';
  notes?: string;
  created_at: string;
  updated_at: string;
}
```

### Phase 4.1: Core API Endpoints ✅ IMPLEMENTED
```typescript
// ✅ DEPLOYED: Update appreciation level (primary use case)
// Implemented via Supabase client-side mutations in restaurant service
updateRestaurant(id: string, updates: Partial<Restaurant>)

// ✅ DEPLOYED: Enhanced status toggle with appreciation prompt
// Smart UI behavior implemented in PlaceCard and RestaurantDetails components
// Automatic appreciation prompt when status changes to 'visited'

// ✅ DEPLOYED: Full CRUD operations with appreciation support
// All existing restaurant service endpoints enhanced to handle personal_appreciation field
```

### Phase 4.2: Visit Tracking APIs (Optional)
```typescript
// Only add if detailed visit tracking proves valuable
POST /api/restaurants/:id/visits
GET /api/restaurants/:id/visits
PUT /api/visits/:visitId
DELETE /api/visits/:visitId
```

### Implementation Priorities
1. **Phase 4.1 Focus**: Status rename + appreciation system + smart toggle UX
2. **Defer complexity**: Visit history table, derived fields, triggers
3. **Mobile optimization**: Quick rating modal works perfectly on phones
4. **Performance**: Calculate visit stats in queries, cache only if needed

## Design Considerations

### 1. Appreciation Labels
Consider these more intuitive labels for the UI:
- **Unknown**: "Not visited"
- **Avoid**: "Skip this"
- **Fine**: "It's fine"
- **Good**: "Recommend"
- **Great**: "Must visit!"

### 2. Status Field Strategy
**Recommendation**: Keep the existing `status` field separate from `personal_appreciation`
- `status`: Binary visited/to-visit state (renamed from "must-visit" to "to-visit")
- `personal_appreciation`: Nuanced opinion scale
- **Benefits**:
  - Backward compatibility
  - Clear separation of concerns
  - Easier filtering and querying
  - Maintains existing filter functionality

### 3. Visit History Features
- Default to today's date for new visits
- Allow editing past visits (in case of delayed logging)
- Show visit frequency analytics (e.g., "3 visits in the last year")
- Consider seasonal visit patterns

### 4. Mobile Optimization
- Ensure visit logging page works well on mobile
- Quick-add visit functionality for spontaneous logging
- Touch-friendly appreciation level selection

## Revised Implementation Phases

### Phase 4.1: Core Foundation ✅ COMPLETED
**Goal**: Get immediate value with minimal complexity ✅ ACHIEVED
1. ✅ **Database Migration**: Added `personal_appreciation` column + renamed status values
2. ✅ **Updated TypeScript**: Extended Restaurant interface with appreciation types
3. ✅ **Enhanced Status Toggle**: Smart behavior with automatic appreciation prompt
4. ✅ **Rate Button**: Standalone appreciation selector with full UI integration
5. ✅ **Appreciation Badges**: Visual feedback with hover tooltips on all cards
6. ✅ **Service Integration**: Full Supabase integration with appreciation field support
7. ✅ **UI Consistency**: Matching experience across PlaceCard and RestaurantDetails
8. ✅ **Admin Controls**: Complete admin functionality on restaurant detail pages
9. ✅ **Mobile Optimization**: Touch-friendly interface for all appreciation interactions

**Success Criteria**: ✅ Can quickly rate restaurants after visiting, see ratings on cards with descriptive tooltips

**Additional Completions Beyond Original Scope:**
- Interactive hover tooltips with detailed appreciation descriptions
- Google Maps integration for location and rating links
- Claude API reliability improvements with retry logic and rate limiting
- Complete admin button integration on RestaurantDetails pages
- Edit button functionality fix with URL parameter handling
- Restaurant creation form fixes after status migration

### Phase 4.2: Detailed Visit Tracking (Optional)
**Goal**: Rich visit history for power users
**Trigger**: Only implement if Phase 4.1 proves valuable and you want more detail
1. **Visit History Table**: Create `restaurant_visits` schema
2. **Visit Logging Page**: Detailed visit entry with dates, meal types, notes
3. **Visit Statistics**: Calculate and display visit counts, frequency
4. **Extended APIs**: Full CRUD for individual visits

### Phase 4.3: About Page & Polish
**Goal**: Explain the system and polish the experience
1. **About Page**: Explain curation concept and rating philosophy
2. **Header Enhancement**: Add "(about)" link
3. **Mobile Optimization**: Ensure perfect mobile experience
4. **Performance**: Add caching if needed
5. **Analytics**: Track usage patterns to inform future development

## Future Enhancements (Post-Phase 4)
- Visit analytics dashboard
- Export visit data
- Photo uploads for visits
- Favorite dish tracking per visit
- Social sharing of great finds
- Annual restaurant summary reports

## Success Metrics

### Phase 4.1 Success Metrics
- **Immediate adoption**: Easy to rate restaurants after dining
- **Visual clarity**: Can instantly see personal opinions on restaurant cards
- **Preserved workflow**: Status toggle still works for quick planning changes
- **Mobile usability**: Rating modal works perfectly on phone after meals
- **Low friction**: No more than 2 taps to rate a restaurant

### Long-term Success Metrics
- **Decision support**: Ratings help inform future dining choices
- **Pattern recognition**: Can identify favorite restaurants and dining trends
- **System adoption**: Feature becomes integral to restaurant evaluation process
- **Data quality**: Appreciation levels accurately reflect actual recommendation behavior

## Key Advantages of This Approach

1. **Immediate Value**: Phase 4.1 delivers core functionality without complexity
2. **Risk Mitigation**: Can validate concept before building visit history system
3. **UX Preservation**: Keeps existing workflows while adding new capabilities
4. **Mobile-First**: Optimized for the most common use case (post-meal rating)
5. **Progressive Enhancement**: Each phase builds naturally on the previous
6. **Data Integrity**: Avoids redundancy issues by calculating stats on-demand
