# Visit Logging System - Implementation Plan

**Status:** Phase 2 Complete - Read-only display live
**Date:** February 2026 - March 2026
**Feature:** Track multiple restaurant visits with ratings, dates, and notes

---

## Implementation Progress

**Phase 1: Database Foundation** ✅ COMPLETE (PR #2, merged 2026-03-01)
- Database schema, migrations, RLS policies
- Data migration of existing ratings
- Cached rating trigger system

**Phase 2: Visit History Display** ✅ COMPLETE (PR #3, merged 2026-03-01)
- Read-only service layer (`visits.ts`)
- Visit history component
- Layout updates with auth-conditional display

**Phase 3: Add Visit Modal** 🔄 NEXT
- Write operations (add visits)
- Modal form for logging visits
- Input validation and sanitization

**Phase 4: Edit/Delete Visits** ⏳ UPCOMING
- Edit existing visits
- Delete visits with confirmation
- Fix placeholder dates

**Phase 5: Verification & Documentation** ⏳ UPCOMING
- End-to-end testing
- Performance verification
- Security verification

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

**Logged Out Layout:**
```
Row 1: Description (2 cols) | Source (1 col)
       [If no Source: Description takes full 3 cols]
Row 2: Smart Review Summary (full 3 cols)
Row 3: Location | Dietary | Atmosphere
```

**Logged In Layout:**
```
Row 1: Description (1 col) | Source (1 col) | Visit History (1 col, spans 2 rows)
       [If no Source: Description takes 2 cols]
Row 2: Smart Review Summary (2 cols)     | Visit History (continues)
Row 3: Location | Dietary | Atmosphere
```

**Visit History Section (Right Column, Logged In Only):**
- Displays latest 5 visits chronologically (newest first)
- Each entry shows: date (or "Before 2026" for migrated data), rating badge, experience notes, company notes
- Height spans Description + Smart Review rows for better space usage
- Edit icon/link present but non-functional until Phase 4 (edit functionality)
- Component completely hidden when logged out (not just empty)

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

**Note on `user_id` field:** While currently single-user, keeping `user_id` enables future multi-user support with minimal refactoring cost. The marginal overhead (one UUID column) is negligible compared to the complexity of retrofitting multi-tenancy later.

**New table: `restaurant_visits`**
```sql
-- Create ENUM type for rating (reuse if exists, or create new)
DO $$ BEGIN
  CREATE TYPE personal_appreciation AS ENUM ('avoid', 'fine', 'good', 'great');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE restaurant_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  rating personal_appreciation NOT NULL,
  experience_notes TEXT,
  company_notes TEXT,
  is_migrated_placeholder BOOLEAN DEFAULT FALSE, -- True for migrated historical data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id),

  -- Input validation constraints
  CONSTRAINT experience_notes_length CHECK (char_length(experience_notes) <= 2000),
  CONSTRAINT company_notes_length CHECK (char_length(company_notes) <= 500),
  CONSTRAINT visit_date_reasonable CHECK (visit_date >= '1900-01-01' AND visit_date <= CURRENT_DATE),

  -- Prevent duplicate visits on same day
  CONSTRAINT unique_visit_per_day UNIQUE (user_id, restaurant_id, visit_date)
);

-- Indexes for performance
CREATE INDEX idx_visits_restaurant ON restaurant_visits(restaurant_id);
CREATE INDEX idx_visits_user ON restaurant_visits(user_id);
CREATE INDEX idx_visits_date ON restaurant_visits(visit_date DESC);

-- Composite index for common queries (get visits for restaurant by user, ordered by date)
CREATE INDEX idx_visits_restaurant_user_date ON restaurant_visits(restaurant_id, user_id, visit_date DESC);

-- Trigger to auto-update restaurants.personal_appreciation (cached rating for performance)
CREATE OR REPLACE FUNCTION update_restaurant_cached_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the restaurant's cached personal_appreciation to latest visit rating
  UPDATE restaurants
  SET personal_appreciation = (
    SELECT rating
    FROM restaurant_visits
    WHERE restaurant_id = COALESCE(NEW.restaurant_id, OLD.restaurant_id)
      AND user_id = COALESCE(NEW.user_id, OLD.user_id)
    ORDER BY visit_date DESC, created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.restaurant_id, OLD.restaurant_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cached_rating
  AFTER INSERT OR UPDATE OR DELETE ON restaurant_visits
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_cached_rating();
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

**Existing `personal_appreciation` field:**
1. Keep field on `restaurants` table as **cached rating** (performance optimization)
2. Create migration script that:
  - For each restaurant with `personal_appreciation` set (not null, not 'unknown')
  - Create a `restaurant_visits` entry:
    - `visit_date` = 2025-01-01 (placeholder date for historical data)
    - `rating` = value from `personal_appreciation`
    - `experience_notes` = null
    - `company_notes` = null
    - `is_migrated_placeholder` = TRUE (marks as historical/migrated data)
    - `user_id` = Admin user UUID (hardcoded: get from `auth.users` table)

**Going forward:**
- `personal_appreciation` remains as **cached field** (not computed on every read)
- Database trigger auto-updates `personal_appreciation` when visits change (see schema above)
- No performance penalty: restaurant list queries stay fast (no JOIN needed)
- Trigger keeps cached value always in sync with latest visit

**Display logic for placeholder data:**
- If `is_migrated_placeholder = TRUE`, show "Before 2026" instead of actual date
- If `is_migrated_placeholder = FALSE`, show formatted date normally
- This avoids magic date collision (e.g., if user actually visited on 2025-01-01)

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

**Updated `restaurantService.ts`:**
- `getRestaurantByIdWithLocations()` now joins with `restaurant_visits`
- Returns `personal_appreciation` from cached field (no computation needed - trigger keeps it updated)
- Returns visits array if user is authenticated
- **No performance impact**: Cached rating means no N+1 query problem

### Component Architecture

**New components:**
1. `VisitHistorySection.tsx` - Right column display of visit history
2. `VisitModal.tsx` - Modal form for adding/editing visits (handles both modes)
3. `VisitCard.tsx` - Individual visit entry display with edit button

**Updated components:**
1. `RestaurantDetails.tsx` - Layout changes, integrate new sections
2. `AppreciationPicker.tsx` - Reuse in modal (may need small adjustments)

**Visit Date Display Logic:**
- Component should check `is_migrated_placeholder` boolean field
- If `is_migrated_placeholder === true`, display "Before 2026" instead of formatted date
- If `is_migrated_placeholder === false`, display formatted date (e.g., "15 Feb 2026")
- Avoids magic date collision (user could have actually visited on 2025-01-01)

**Visit Count Limit (Scalability):**
- Display latest 5 visits by default
- If more than 5 visits exist, show "Show all X visits" expand button
- Prevents UI dominance when users have 50+ visits to one restaurant

---

## Security Considerations

### Input Validation

**Field-level constraints (enforced in database):**
- `experience_notes`: Max 2000 characters (prevents DoS via multi-MB strings)
- `company_notes`: Max 500 characters
- `visit_date`: Must be between 1900-01-01 and today (prevents future dates, unreasonable past dates)
- `rating`: ENUM type (only valid values accepted)

**Application-level validation (service layer):**
```typescript
// visitService.ts validation helpers
const validateVisitInput = (input: {
  visit_date: string;
  rating: PersonalAppreciation;
  experience_notes?: string;
  company_notes?: string;
}) => {
  // Sanitize: strip HTML tags (plaintext only)
  const sanitizedNotes = input.experience_notes?.replace(/<[^>]*>/g, '').trim();
  const sanitizedCompany = input.company_notes?.replace(/<[^>]*>/g, '').trim();

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.visit_date)) {
    throw new Error('Invalid date format');
  }

  // Validate date range
  const visitDate = new Date(input.visit_date);
  const minDate = new Date('1900-01-01');
  const today = new Date();
  if (visitDate < minDate || visitDate > today) {
    throw new Error('Visit date must be between 1900-01-01 and today');
  }

  return {
    ...input,
    experience_notes: sanitizedNotes,
    company_notes: sanitizedCompany
  };
};
```

### CSRF Protection

**Verification (Phase 2):**
- Supabase Auth uses JWT tokens in Authorization header (not cookies)
- No CSRF risk for API calls using Authorization header
- Document findings after verification in Phase 2

**Fallback plan (if needed):**
- If CSRF risk identified, implement token in Cloudflare Workers
- Use Workers KV to store CSRF tokens per session
- Validate token on all state-changing operations (POST/PUT/DELETE)

### Rate Limiting

**Strategy: Cloudflare Workers KV-based rate limiting**

```typescript
// Prevent abuse: limit visit creation/updates per user
// Implementation in src/worker.js

const RATE_LIMIT = {
  MAX_VISITS_PER_MINUTE: 10,
  MAX_UPDATES_PER_MINUTE: 20,
  WINDOW_MS: 60000 // 1 minute
};

async function checkRateLimit(userId: string, operation: string): Promise<boolean> {
  const key = `rate_limit:${operation}:${userId}`;
  const count = await env.RATE_LIMIT_KV.get(key);

  const limit = operation === 'create_visit'
    ? RATE_LIMIT.MAX_VISITS_PER_MINUTE
    : RATE_LIMIT.MAX_UPDATES_PER_MINUTE;

  if (count && parseInt(count) >= limit) {
    return false; // Rate limit exceeded
  }

  // Increment counter
  const newCount = count ? parseInt(count) + 1 : 1;
  await env.RATE_LIMIT_KV.put(key, newCount.toString(), {
    expirationTtl: 60 // 1 minute TTL
  });

  return true;
}
```

**Additional database-level protection:**
- Unique constraint on `(user_id, restaurant_id, visit_date)` prevents duplicate visits
- Prevents accidental multi-clicks or buggy client loops

### XSS Prevention

**Mitigation layers:**
1. **Input sanitization**: Strip HTML tags from notes (see validation above)
2. **React default escaping**: React automatically escapes text content
3. **No `dangerouslySetInnerHTML`**: Never render user input as HTML

**Future enhancement (out of scope for V1):**
- Add Content Security Policy (CSP) headers in Cloudflare Workers
- Restrict inline scripts, only allow scripts from trusted domains

### Data Privacy

**Current implementation (GDPR-aligned):**
- Visit history private by default (only visible when logged in)
- RLS policies ensure users can only access their own data
- Personal appreciation badges public (user consent implied by rating system)

**Future considerations:**
- Export functionality (let users download their visit data)
- Data retention policy (auto-delete visits older than X years?)

---

## Edge Cases & Delete Behavior

### Deleting Visits

**Scenario: Delete only visit for a restaurant**
- Trigger sets `personal_appreciation = NULL` (no visits = no rating)
- Restaurant card shows "Schrödinger's cat" badge (unknown state)
- Behavior: Correct, user removed their rating

**Scenario: Delete latest visit (but other visits exist)**
- Trigger recomputes `personal_appreciation` from second-latest visit
- Rating badge updates to reflect new "current opinion"
- Behavior: Correct, latest experience determines current rating

**Scenario: Delete middle visit (not latest)**
- No change to `personal_appreciation` (latest visit unchanged)
- Visit history updates to remove deleted entry
- Behavior: Correct, current rating unaffected

### Duplicate Visit Prevention

**Database constraint:** `UNIQUE (user_id, restaurant_id, visit_date)`
- Prevents logging same restaurant twice on same day
- Error message: "You already logged a visit to this restaurant on this date"
- User must either edit existing visit or choose different date

**Edge case: Multiple visits in one day**
- Realistically, users won't visit same restaurant twice in one day
- If needed, they can add details to existing visit's experience notes
- Or use different dates (e.g., lunch vs dinner on consecutive days)

---

## Implementation Phases (PRs)

### Phase 1: Database Foundation ✅ COMPLETE
**Branch:** `feature/visit-logging-database`
**PR:** #2 - Merged to main on 2026-03-01
**Goal:** Set up database schema, migration, RLS policies

**Completed Tasks:**
1. ✅ Created migration `001_create_restaurant_visits_table.sql`
   - Created `personal_appreciation` ENUM type
   - Created `restaurant_visits` table with all fields
   - Added performance indexes
   - Created trigger for cached rating updates
2. ✅ Created migration `002_create_rls_policies.sql`
   - Enabled RLS on `restaurant_visits`
   - Created policies for SELECT, INSERT, UPDATE, DELETE
   - Policies enforce user can only access their own visits
3. ✅ Created migration `003_enable_rls.sql`
   - Enabled RLS enforcement
4. ✅ Created migration `004_migrate_existing_ratings.sql`
   - Migrated all existing `personal_appreciation` values to visits
   - Used placeholder date 2025-01-01 with `is_migrated_placeholder = TRUE`
   - Idempotent migration (can run multiple times safely)
   - Successfully migrated all rated restaurants

**Testing:**
- ✅ Manual: Ran migrations, verified table structure
- ✅ RLS: Verified policies prevent unauthorized access
- ✅ Integration: Confirmed existing restaurants unchanged
- ✅ No UI changes in this PR

**Result:**
- Database foundation complete and production-ready
- All existing ratings preserved as historical visits
- No breaking changes to existing functionality

---

### Phase 2: Visit History Display (Read-Only UI) ✅ COMPLETE
**Branch:** `feature/visit-history-ui`
**PR:** #3 - Merged to main on 2026-03-01
**Goal:** Show visit history in restaurant details (logged in users only)

**Completed Tasks:**
1. ✅ Created `src/services/visits.ts` with read-only operations:
   - `getLatestVisits(restaurantId, limit)` - Fetch latest N visits
   - `getVisitsByRestaurant(restaurantId)` - Fetch all visits for restaurant
   - `getVisitCount(restaurantId)` - Count visits
   - `getVisitById(visitId)` - Fetch single visit
   - All methods use Supabase RLS for security
   - Ordered by visit_date DESC, created_at DESC
2. ✅ Created `src/components/VisitHistory.tsx` component:
   - Displays latest 5 visits chronologically (newest first)
   - Shows visit date with placeholder handling:
     - `is_migrated_placeholder === true` → displays "Before 2026"
     - `is_migrated_placeholder === false` → displays formatted date (e.g., "Jan 15, 2026")
   - Shows rating badge with appreciation level styling
   - Shows experience notes and company notes (if present)
   - Loading state, error state, empty state
   - Only renders when user authenticated
3. ✅ Updated `src/pages/RestaurantDetails.tsx` layout:
   - **Logged in:** Description (1 col) | Source (1 col) | Visit History (1 col, row-span-2)
     - If no Source: Description expands to 2 columns
     - Row 2: Smart Review (2 cols) | Visit History continues
   - **Logged out:** Description (2 cols) | Source (1 col), Smart Review (full 3 cols)
     - If no Source: Description expands to full 3 columns
   - Visit History widget completely hidden when logged out (not just empty)
   - Smart Review gets 2 columns when logged in (prevents rating/stars compression)
   - Source paired with Description for better text amount matching
4. ✅ Added TypeScript types to `src/types/place.ts`:
   - `RestaurantVisit` interface matching database schema

**Testing:**
- ✅ Manual testing: logged in vs logged out states
- ✅ Verified placeholder visit dates show "Before 2026"
- ✅ Verified layout adjusts correctly with/without Source field
- ✅ Tested responsive behavior on different screen sizes
- ✅ Confirmed Visit History hidden when logged out

**Result:**
- Visit history now visible to logged-in users
- Shows migrated historical data with placeholder dates
- Layout optimized for space usage and readability
- No impact on logged-out user experience
- Ready for Phase 3: write operations (add/edit/delete visits)

---

### Phase 3: Add Visit Modal (Write) - NEXT
**Branch:** `feature/add-visit-modal`
**Goal:** Enable users to log new visits via modal form

**Tasks:**
1. Create `visitService.ts` write operations:
   - `addVisit()` with input validation and sanitization
   - Input validation helpers (strip HTML, validate dates, check lengths)
   - Add rate limiting middleware (Cloudflare Workers KV) if needed
2. Create `VisitModal.tsx` component (designed to handle both add/edit, but only add implemented this phase)
   - Date picker (defaults to today)
   - Rating picker (reuse `AppreciationPicker` or create variant)
   - Experience notes textarea
   - Company notes text field
   - Form validation
   - Submit handler using `visitService.addVisit()`
   - Accept optional `visitToEdit` prop (for Phase 4, unused in Phase 3)
3. Update `RestaurantDetails.tsx`:
   - "Rate" button opens `VisitModal` (add mode)
   - "Mark as Visited" opens modal (add mode)
   - Handle successful submission (refresh data)
   - Show success/error toasts
4. Update visit history to show new entry immediately

**Testing:**
- Unit tests for `visitService.addVisit()` with validation
- Component tests for `VisitModal.tsx`
- Test form validation
- Test date picker behavior
- Test integration with service layer
- Test input sanitization (HTML stripping)
- E2E test: Add visit flow

**Acceptance Criteria:**
- Modal opens from "Rate" button
- Modal opens from "Mark as Visited" button
- Form validates required fields
- Visit saves to database
- UI updates to show new visit
- Toast notifications work
- Input sanitization prevents XSS
- Modal designed for future edit mode (but edit not wired up yet)

---

### Phase 4: Edit/Delete Visits
**Branch:** `feature/edit-delete-visits`
**Goal:** Allow users to edit or delete existing visits

**Tasks:**
1. Add `visitService.ts` edit/delete operations:
   - `updateVisit()` with validation
   - `deleteVisit()`
2. Add edit button to `VisitHistory.tsx` component
   - On click, opens `VisitModal` with `visitToEdit` prop populated
   - Modal pre-fills form with existing visit data
3. Update `VisitModal.tsx`:
   - Detect edit mode (when `visitToEdit` prop is present)
   - Use `visitService.updateVisit()` instead of `addVisit()` when editing
   - Update modal title: "Add Visit" vs "Edit Visit"
   - When user edits date on migrated visit, set `is_migrated_placeholder = FALSE`
4. Add delete button to visit entries
   - Shows confirmation dialog before deleting
   - Calls `visitService.deleteVisit()`
5. Handle optimistic updates for better UX
6. Database trigger auto-updates cached rating after edit/delete (no manual refresh needed)

**Key user flow:** Users can fix placeholder "Before 2026" dates by:
1. Click edit on migrated visit
2. Change date to actual date they remember
3. `is_migrated_placeholder` automatically set to FALSE
4. Date now displays as formatted date instead of "Before 2026"

**Testing:**
- Test edit flow (including placeholder date fixes)
- Test `is_migrated_placeholder` cleared when date edited
- Test delete flow with confirmation
- Test delete edge cases (only visit, latest visit, middle visit)
- Test error handling
- Test trigger updates cached rating correctly

**Acceptance Criteria:**
- ✅ Edit button opens modal pre-populated with visit data
- ✅ Can edit visit date, rating, experience notes, company notes
- ✅ Editing date on migrated visit clears `is_migrated_placeholder` flag
- ✅ Can delete visit with confirmation dialog
- ✅ UI updates correctly after edit/delete
- ✅ Cached rating auto-updates via trigger (verified in UI)
- ✅ Delete edge cases handled correctly (see "Edge Cases" section)
- ✅ Users can replace "Before 2026" with actual dates

---

### Phase 5: Verification & Documentation
**Branch:** `feature/visit-logging-finalization`
**Goal:** Verify cached rating system works correctly, finalize documentation

**Note:** Database trigger for cached rating already implemented in Phase 1, this phase verifies it works end-to-end.

**Tasks:**
1. End-to-end verification tests:
  - Create visit → cached rating updates
  - Edit visit → cached rating updates
  - Delete visit → cached rating recomputes from next-latest
  - Delete only visit → cached rating becomes NULL
2. Performance verification:
  - Measure restaurant list load time (should be unchanged from before)
  - Verify no N+1 queries (use Supabase query logs)
  - Document actual performance metrics
3. Update API documentation:
  - Document that `personal_appreciation` is cached field (not computed)
  - Explain trigger mechanism
  - Add notes for future refactoring (can't remove field, it's part of architecture)
4. Security verification:
  - Verify CSRF protection (Supabase JWT in header)
  - Test rate limiting works as expected
  - Test input validation prevents XSS/DoS

**Testing:**
- Integration tests for full visit lifecycle
- Test edge cases: no visits, single visit, multiple visits
- Test delete edge cases (only visit, latest, middle)
- Test that public badges show correct cached rating
- Performance testing: Restaurant list with 100+ restaurants should load <500ms

**Acceptance Criteria:**
- ✅ Rating always reflects latest visit (trigger verified working)
- ✅ Performance is excellent (cached field = no N+1 queries)
- ✅ Public view shows correct badges
- ✅ All edge cases handled correctly
- ✅ Documentation updated
- ✅ Security measures verified working

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

**Phase 1 (Database) - COMPLETE:**
- Rollback migration files if needed
- Restore from backup if data corruption

**Phase 2 (Display) - COMPLETE:**
- Deploy previous UI version
- No data loss, read-only operations

**Phase 3 (Add Visits):**
- Disable write endpoints
- Keep read operations working
- Data remains in database (can be cleaned up later if needed)

**Phase 4 (Edit/Delete):**
- Disable edit/delete endpoints
- Add operations continue working
- Data remains in database

**Phase 5 (Verification):**
- Document-only phase, no rollback needed

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
