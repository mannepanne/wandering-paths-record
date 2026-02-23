# Visit Logging System - Implementation Plan

**Status:** Planning phase - ready for implementation
**Date:** February 2026
**Feature:** Track multiple restaurant visits with ratings, dates, and notes

---

## Executive Summary

Enable users to log multiple visits to restaurants over time, capturing:
- Visit date
- Rating (using existing appreciation scale)
- Experience notes (dishes, thoughts, observations)
- Company notes (who you dined with)

**Key Constraints:**
- Private by default (only visible when logged in)
- Public view unchanged (layout identical to current design)
- Personal appreciation badges remain public (build trust)
- Visit history/notes remain private

---

## Product Decisions

### 1. Rating System Evolution
**Decision:** `personal_appreciation` becomes computed from latest visit

- Current: Single rating stored on `restaurants.personal_appreciation`
- Future: Rating computed from most recent entry in `restaurant_visits`
- Migration: Existing ratings become first visit, dated 2025-01-01 (placeholder)

**Rationale:** Your latest experience IS your current opinion. Simpler mental model, less decision fatigue.

**Placeholder Date Handling:**
- Migrated visits use 2025-01-01 as placeholder date
- Display logic: If visit date is 2025-01-01, show "Before 2026" instead of actual date
- User can edit these visits to add real dates for visits they remember

### 2. Data Capture
**What we log per visit:**
- Visit date (required)
- Rating from appreciation scale (required)
- Experience notes (optional) - "Had the duck confit, incredible. Too loud though."
- Company notes (optional) - "With Sarah and Tom"

### 3. UI Layout Changes (Logged In Only)

**Current Single-Location Layout:**
```
Description (2 cols) | Source (1 col)
Smart Review Summary (full width)
Location | Dietary | Atmosphere
```

**New Single-Location Layout:**
```
Description (2 cols if Source exists, 3 cols if not)
Source (full width below Description, if exists)
Smart Review Summary (2 cols) | Visit History (1 col)
Location | Dietary | Atmosphere
```

**Visit History Section (Right Column):**
- Sits alongside Smart Review Summary
- Shows chronological list of visits (newest first)
- Each entry shows: date (or "Before 2026" for migrated data), rating badge, experience note, company note
- Each entry has edit icon/link (opens same modal pre-populated with that visit's data)
- Only visible when logged in

### 4. Adding & Editing Visits
**Interaction:** Modal form (same for both add and edit)

**Form fields:**
- Date picker (defaults to today for new, pre-filled for edit)
- Rating picker (existing appreciation scale UI)
- Experience notes (textarea, optional)
- Company notes (text field, optional)

**Triggers:**
- "Mark as Visited" button → Opens modal (add mode)
- "Rate" button → Opens modal (add mode)
- Edit icon on visit card → Opens modal pre-populated with that visit's data (edit mode)

**Edit use case:** Users can fix the placeholder "Before 2026" dates by editing migrated visits with actual dates they remember

### 5. Public vs Private
**Public (everyone):**
- Personal appreciation badge (computed from latest visit)
- All other restaurant data unchanged

**Private (logged in only):**
- Visit History section
- Individual visit notes
- Visit dates and company information

**Not logged in:** Layout identical to current design (no Visit History section rendered)

---

## Technical Architecture

### Database Schema

**New table: \****`restaurant_visits`**
```sql
CREATE TABLE restaurant_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  rating text NOT NULL, -- 'avoid' | 'fine' | 'good' | 'great'
  experience_notes TEXT,
  company_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT valid_rating CHECK (rating IN ('avoid', 'fine', 'good', 'great'))
);

-- Indexes for performance
CREATE INDEX idx_visits_restaurant ON restaurant_visits(restaurant_id);
CREATE INDEX idx_visits_user ON restaurant_visits(user_id);
CREATE INDEX idx_visits_date ON restaurant_visits(visit_date DESC);

-- Composite index for common queries
CREATE INDEX idx_visits_restaurant_user_date ON restaurant_visits(restaurant_id, user_id, visit_date DESC);
```

**Row Level Security (RLS):**
```sql
-- Enable RLS
ALTER TABLE restaurant_visits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own visits
CREATE POLICY "Users can view own visits"
  ON restaurant_visits FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own visits
CREATE POLICY "Users can insert own visits"
  ON restaurant_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own visits
CREATE POLICY "Users can update own visits"
  ON restaurant_visits FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own visits
CREATE POLICY "Users can delete own visits"
  ON restaurant_visits FOR DELETE
  USING (auth.uid() = user_id);
```

### Data Migration Strategy

**Existing \****`personal_appreciation`**\*\* field:**
1. Keep field on `restaurants` table (for backward compatibility during migration)
2. Create migration script that:
  - For each restaurant with `personal_appreciation` set (not null, not 'unknown')
  - Create a `restaurant_visits` entry:
    - `visit_date` = 2025-01-01 (fixed historical date)
    - `rating` = value from `personal_appreciation`
    - `experience_notes` = null
    - `company_notes` = null
    - `user_id` = authorized user (from env or config)

**Going forward:**
- `personal_appreciation` becomes computed from latest visit
- API returns computed value by joining with `restaurant_visits` table
- Eventually can mark `personal_appreciation` as deprecated/computed column

### Service Layer API

**New service: \****`visitService.ts`**
```typescript
interface RestaurantVisit {
  id: string;
  restaurant_id: string;
  user_id: string;
  visit_date: string; // ISO date
  rating: PersonalAppreciation;
  experience_notes?: string;
  company_notes?: string;
  created_at: string;
  updated_at: string;
}

interface VisitService {
  // Get all visits for a restaurant (for current user)
  getVisitsForRestaurant(restaurantId: string): Promise<RestaurantVisit[]>;

  // Add a new visit
  addVisit(visit: {
    restaurant_id: string;
    visit_date: string;
    rating: PersonalAppreciation;
    experience_notes?: string;
    company_notes?: string;
  }): Promise<RestaurantVisit>;

  // Update an existing visit
  updateVisit(visitId: string, updates: Partial<RestaurantVisit>): Promise<RestaurantVisit>;

  // Delete a visit
  deleteVisit(visitId: string): Promise<void>;

  // Get latest rating for a restaurant (computed personal_appreciation)
  getLatestRating(restaurantId: string): Promise<PersonalAppreciation | null>;
}
```

**Updated \****`restaurantService.ts`**\*\*:**
- `getRestaurantByIdWithLocations()` now joins with `restaurant_visits`
- Computes `personal_appreciation` from latest visit
- Returns visits array if user is authenticated

### Component Architecture

**New components:**
1. `VisitHistorySection.tsx` - Right column display of visit history
2. `VisitModal.tsx` - Modal form for adding/editing visits (handles both modes)
3. `VisitCard.tsx` - Individual visit entry display with edit button

**Updated components:**
1. `RestaurantDetails.tsx` - Layout changes, integrate new sections
2. `AppreciationPicker.tsx` - Reuse in modal (may need small adjustments)

**Visit Date Display Logic:**
- Component should check if `visit_date === '2025-01-01'`
- If true, display "Before 2026" instead of formatted date
- If false, display formatted date (e.g., "15 Feb 2026")

---

## Implementation Phases (PRs)

### Phase 1: Database Foundation
**Branch:** `feature/visit-logging-database`
**Goal:** Set up database schema, migration, RLS policies

**Tasks:**
1. Create Supabase migration file for `restaurant_visits` table
2. Add indexes for query performance
3. Set up RLS policies
4. Create data migration script for existing `personal_appreciation` values
5. Test migration in local Supabase instance
6. Document rollback strategy

**Testing:**
- Manual: Run migration, verify table exists, check RLS policies
- Integration: Test that existing restaurants work unchanged
- No UI changes in this PR

**Acceptance Criteria:**
- ✅ Migration runs successfully
- ✅ RLS policies prevent unauthorized access
- ✅ Existing ratings migrated to visits with 2025-01-01 date
- ✅ No breaking changes to existing API

---

### Phase 2: Service Layer & API
**Branch:** `feature/visit-logging-service`
**Goal:** Create service layer for CRUD operations on visits

**Tasks:**
1. Create `src/services/visitService.ts`
2. Implement `getVisitsForRestaurant()`
3. Implement `addVisit()`
4. Implement `updateVisit()`
5. Implement `deleteVisit()`
6. Implement `getLatestRating()`
7. Update `restaurantService.getRestaurantByIdWithLocations()` to:
  - Join with `restaurant_visits`
  - Compute `personal_appreciation` from latest visit
  - Return visits array when authenticated

**Testing:**
- Unit tests for `visitService.ts` (following existing test patterns)
- Mock Supabase client responses
- Test all CRUD operations
- Test computed rating logic
- Test authentication context

**Acceptance Criteria:**
- ✅ All service methods work with mocked data
- ✅ Tests pass (8+ tests covering CRUD + computed rating)
- ✅ No UI changes in this PR
- ✅ API is ready for UI consumption

---

### Phase 3: Visit History Display (Read-Only)
**Branch:** `feature/visit-history-display`
**Goal:** Show visit history in restaurant details (logged in users only)

**Tasks:**
1. Create `VisitCard.tsx` component
  - Display visit date with "Before 2026" logic for placeholder dates
  - Display rating badge, experience notes, company notes
  - Include edit icon/button (non-functional in this phase, styled only)
  - Styled to match design system
2. Create `VisitHistorySection.tsx` component
  - Fetch visits using `visitService`
  - Render list of `VisitCard` components
  - Show empty state if no visits
  - Only render when user is authenticated
3. Update `RestaurantDetails.tsx` layout:
  - Add Visit History to right column (1/3 width)
  - Move Source below Description (if present)
  - Adjust grid to accommodate new section
  - Ensure layout unchanged when not logged in

**Testing:**
- Component tests for `VisitCard.tsx` (including date display logic)
- Component tests for `VisitHistorySection.tsx`
- Test "Before 2026" displays for 2025-01-01 dates
- Visual testing: logged in vs logged out
- Responsive testing: mobile, tablet, desktop

**Acceptance Criteria:**
- ✅ Visit history displays correctly for logged-in users
- ✅ Layout matches design spec
- ✅ Not visible when logged out
- ✅ Empty state handled gracefully
- ✅ Placeholder dates show "Before 2026" instead of "1 Jan 2025"
- ✅ Edit button visible but non-functional (Phase 5 will wire it up)

---

### Phase 4: Add Visit Modal (Write)
**Branch:** `feature/add-visit-modal`
**Goal:** Enable users to log new visits via modal form

**Tasks:**
1. Create `VisitModal.tsx` component (designed to handle both add/edit, but only add implemented this phase)
  - Date picker (defaults to today)
  - Rating picker (reuse `AppreciationPicker` or create variant)
  - Experience notes textarea
  - Company notes text field
  - Form validation
  - Submit handler using `visitService.addVisit()`
  - Accept optional `visitToEdit` prop (for Phase 5, unused in Phase 4)
2. Update `RestaurantDetails.tsx`:
  - "Rate" button opens `VisitModal` (add mode)
  - "Mark as Visited" opens modal (add mode)
  - Handle successful submission (refresh data)
  - Show success/error toasts
3. Update visit history to show new entry immediately

**Testing:**
- Component tests for `VisitModal.tsx`
- Test form validation
- Test date picker behavior
- Test integration with service layer
- E2E test: Add visit flow

**Acceptance Criteria:**
- ✅ Modal opens from "Rate" button
- ✅ Modal opens from "Mark as Visited" button
- ✅ Form validates required fields
- ✅ Visit saves to database
- ✅ UI updates to show new visit
- ✅ Toast notifications work
- ✅ Modal designed for future edit mode (but edit not wired up yet)

---

### Phase 5: Edit/Delete Visits
**Branch:** `feature/edit-delete-visits`
**Goal:** Allow users to edit or delete existing visits

**Tasks:**
1. Wire up edit button in `VisitCard.tsx` (already present from Phase 3)
  - On click, opens `VisitModal` with `visitToEdit` prop populated
  - Modal pre-fills form with existing visit data
2. Update `VisitModal.tsx`:
  - Detect edit mode (when `visitToEdit` prop is present)
  - Use `visitService.updateVisit()` instead of `addVisit()` when editing
  - Update modal title: "Add Visit" vs "Edit Visit"
3. Add delete button to `VisitCard.tsx`
  - Shows confirmation dialog before deleting
  - Calls `visitService.deleteVisit()`
4. Handle optimistic updates for better UX
5. Refresh computed rating after edit/delete

**Key user flow:** Users can now fix placeholder "Before 2026" dates by clicking edit and entering actual dates they remember

**Testing:**
- Test edit flow (including placeholder date fixes)
- Test delete flow with confirmation
- Test error handling
- Test computed rating updates correctly

**Acceptance Criteria:**
- ✅ Edit button opens modal pre-populated with visit data
- ✅ Can edit visit date, rating, experience notes, company notes
- ✅ Can delete visit with confirmation dialog
- ✅ UI updates correctly after edit/delete
- ✅ Latest rating recomputes after edit/delete
- ✅ Users can replace "Before 2026" with actual dates

---

### Phase 6: Computed Rating & Cleanup
**Branch:** `feature/computed-rating-finalization`
**Goal:** Finalize computed rating logic, deprecate old field

**Tasks:**
1. Ensure `personal_appreciation` always reflects latest visit
2. Add database constraint or trigger (optional)
3. Update API documentation
4. Add migration notes for future removal of `personal_appreciation` column
5. Performance optimization: Add caching if needed

**Testing:**
- Integration tests for computed rating
- Test edge cases: no visits, single visit, multiple visits
- Test that public badges show correct computed rating
- Load testing: Check performance with many visits

**Acceptance Criteria:**
- ✅ Rating always reflects latest visit
- ✅ Performance is acceptable (no N+1 queries)
- ✅ Public view shows correct badges
- ✅ Documentation updated

---

## Testing Strategy Alignment

Following established testing patterns from `REFERENCE/testing-strategy.md`:

### Service Layer Tests
**Coverage targets:**
- `visitService.ts`: 60%+ statement coverage
- CRUD operations: All paths tested
- Authentication: Mock `auth.uid()` scenarios
- Error handling: Database failures, network errors

**Test file:** `tests/services/visitService.test.ts`

### Component Tests
**High-value components:**
- `VisitHistorySection.tsx`: Rendering, empty states, loading
- `AddVisitModal.tsx`: Form validation, submission
- `VisitCard.tsx`: Display logic, edit/delete buttons

**Avoid:**
- Complex authentication context mocking (learned from FilterBar experience)
- Deep integration tests that require full app context

### Integration Tests
**Key flows:**
1. Add visit → View in history → Latest rating updates
2. Edit visit → Latest rating recomputes
3. Delete visit → Previous visit becomes latest

**Coverage validation:**
- Run `npm run test:coverage` after each phase
- Ensure no regression in overall coverage %

---

## Rollback Strategy

Each phase is independently deployable and can be rolled back:

**Phase 1 (Database):**
- Rollback migration file
- Restore from backup if data corruption

**Phase 2 (Service):**
- Deploy previous version
- No database changes to rollback

**Phase 3 (Display):**
- Hide feature flag
- Or deploy previous UI version
- No data loss

**Phase 4-6 (Write operations):**
- Disable write endpoints
- Keep read operations working
- Data remains in database (can be cleaned up later if needed)

---

## Open Questions / Future Enhancements

**Not in scope for V1:**
1. Visit analytics (frequency, favorite restaurants)
2. Visit trends over time
3. Export visit history
4. Share visit log with friends
5. Import from other services

**Technical debt to address later:**
1. Eventually remove `personal_appreciation` column from `restaurants` table
2. Add visit count caching (currently computed)
3. Consider pagination for restaurants with many visits

---

## Success Metrics

**User value:**
- Can log multiple visits to same restaurant
- Can capture notes and memories
- Can see rating evolution over time

**Technical quality:**
- All tests passing
- No performance degradation
- Clean, maintainable code
- Follows existing patterns

**Deployment:**
- 6 PRs, each independently reviewed with `/review-pr` skill
- Each PR deployable without breaking production
- Incremental rollout with low risk
