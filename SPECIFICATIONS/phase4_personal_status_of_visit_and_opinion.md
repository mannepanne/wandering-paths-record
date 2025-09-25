# Phase 4: Personal Visit Tracking & Opinion System

## Overview
Implement a personal visit tracking system using a phased approach that starts with core functionality and progressively adds advanced features. The system allows Magnus to track restaurant visits and opinions using a unique behavioral-based appreciation scale.

## Core Concept
Rather than traditional star ratings, use a behavioral appreciation scale that reflects real-world recommendation and revisit intentions:

1. **Unknown** - Not visited yet (Schrödinger's restaurant)
2. **Avoid** - So bad I would warn people against it
3. **Fine** - Perfectly fine but won't return or recommend
4. **Good** - Would recommend to friends but won't seek out again
5. **Great** - Will definitely return, people are missing out

## Design Philosophy
- **Preserve existing UX** - Don't break current workflows
- **Mobile-first** - Optimize for post-meal logging scenarios
- **Progressive enhancement** - Start simple, add complexity based on usage
- **Avoid data redundancy** - Calculate derived values on-demand when possible

## Database Schema Evolution

### Phase 4.1: Core Foundation
```sql
-- Add appreciation column only (avoid data redundancy initially)
ALTER TABLE restaurants ADD COLUMN personal_appreciation TEXT CHECK (personal_appreciation IN ('unknown', 'avoid', 'fine', 'good', 'great')) DEFAULT 'unknown';

-- Update status terminology from "must-visit" to "to-visit"
UPDATE restaurants SET status = 'to-visit' WHERE status = 'must-visit';
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS restaurants_status_check;
ALTER TABLE restaurants ADD CONSTRAINT restaurants_status_check CHECK (status IN ('to-visit', 'visited'));
```

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

### Phase 4.1: Enhanced Status Management
**Restaurant Cards:**
- **Keep existing status toggle** button for quick to-visit ↔ visited changes
- **Add new "Quick Rate"** button next to status toggle (admin only)
- Add appreciation badge display:
  - Unknown: No badge (default state)
  - Avoid: Red "⚠ Skip"
  - Fine: Gray "○ Fine"
  - Good: Blue "✓ Good"
  - Great: Green "★ Great"

**Smart Status Toggle Behavior:**
- **To-visit → Visited**: Show appreciation picker modal immediately
- **Visited → To-visit**: Simple toggle (rare case, no interruption)

**Quick Rate Modal:**
- Overlay with 5 large buttons for appreciation levels
- Each button shows icon + description ("Would recommend to friends")
- "Skip" option to set status without appreciation
- Mobile-optimized for post-meal rating

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

### Phase 4.1: Core Data Model
```typescript
interface Restaurant {
  // ... existing fields
  status: 'to-visit' | 'visited'; // renamed from must-visit
  personal_appreciation: 'unknown' | 'avoid' | 'fine' | 'good' | 'great';
  // NO derived fields initially - calculate visit stats on-demand
}

// Phase 4.2: Visit tracking (if needed)
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

### Phase 4.1: Core API Endpoints
```typescript
// Update appreciation level (primary use case)
PATCH /api/restaurants/:id/appreciation
Body: { appreciation: string }

// Enhanced status toggle (now includes appreciation prompt)
PATCH /api/restaurants/:id/status
Body: { status: string, appreciation?: string }
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

### Phase 4.1: Core Foundation (MVP)
**Goal**: Get immediate value with minimal complexity
1. **Database Migration**: Add `personal_appreciation` column + rename status values
2. **Update TypeScript**: Extend Restaurant interface
3. **Enhanced Status Toggle**: Smart behavior with appreciation prompt
4. **Quick Rate Button**: Standalone appreciation selector
5. **Appreciation Badges**: Visual feedback on cards
6. **Basic API**: PATCH endpoints for appreciation and enhanced status

**Success Criteria**: Can quickly rate restaurants after visiting, see ratings on cards

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