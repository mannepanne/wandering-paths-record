# Technical Debt Tracker

Tracks known limitations, shortcuts, and deferred improvements in the codebase.
Items here are accepted risks or pragmatic choices made during development, not bugs.

---

## Active Items

### TD-001: Legacy cuisine column still in database
- **Location:** `restaurants` table schema, TypeScript types, PlaceCard.tsx, RestaurantDetails.tsx
- **Issue:** The old `cuisine` column remains for backwards compatibility after migration to faceted category system (cuisine_primary, style, venue). Fallback logic exists in multiple components.
- **Why accepted:** Need to validate new facet system works well before removing legacy data
- **Risk:** Low - fallback logic handles both systems gracefully
- **Future fix:** Once confident in new system, remove:
  - `cuisine` column from database
  - `cuisine` field from TypeScript types
  - Fallback logic in components
- **Introduced:** Category system migration (January 2025)

### TD-002: Missing database constraints for category facets
- **Location:** D1 `restaurants` table
- **Issue:** No check constraints for `cuisine_primary`, `style`, `venue` to enforce valid values (TypeScript types have enums, but database doesn't enforce)
- **Why accepted:** Focus on feature delivery; TypeScript provides type safety at application layer
- **Risk:** Medium - could allow invalid data if bypassing TypeScript layer
- **Future fix:** Add database check constraints matching TypeScript enum values
- **Introduced:** Category system implementation

### TD-003: Vite 431 dev server error on refresh
- **Location:** Local development environment
- **Issue:** Dev server occasionally returns HTTP 431 "Request Header Fields Too Large" when refreshing pages (especially `/restaurant/:id` routes). Known Vite issue caused by accumulated cookies/headers.
- **Why accepted:** Not a production issue; workaround is simple (clear cookies or restart)
- **Risk:** Low - only affects local dev experience
- **Future fix:** Monitor Vite issue tracker; may resolve in future Vite version
- **Introduced:** Development setup
- **Workaround:** Clear localhost cookies, hard refresh (Cmd+Shift+R), or restart dev server

### TD-004: Specialty array field not implemented in UI
- **Location:** Database schema has `specialty[]` array field
- **Issue:** Field exists but not yet exposed in UI for filtering or display
- **Why accepted:** Focus on core category system first (cuisine/style/venue)
- **Risk:** Low - field is optional and doesn't break existing functionality
- **Future fix:** Add specialty filter UI and populate data via AI extraction
- **Introduced:** Category system planning

### TD-007: Duplicate detection has known blind spots
- **Location:** `src/utils/duplicateDetection.ts`, `src/components/AdminPanel.tsx` (extraction handler)
- **Issue:** Three minor limitations in the add-flow dedup guard:
  1. **Cold-load race** — if the `['places', 'all-for-dedup']` query has not resolved when extraction completes, `allRestaurants` is `[]` and matches are silently missed. Fail-open was chosen over blocking (extraction normally takes seconds; hanging the UI would be worse).
  2. **Edit-after-extraction** — duplicate check runs once on extraction. Manually renaming the restaurant in the preview form does not re-flag a newly-matching existing entry.
  3. **Address-only city heuristics** — `RestaurantAddress.city` is the authoritative signal. When absent, we fall back to the penultimate comma-token of `full_address` and the first token of the address summary. UK-style postcode+city clumps (`"London SE15 4SE"`) and non-standard comma orderings can produce false negatives.
- **Why accepted:** Override button (`Add as new location anyway`) provides the escape hatch; false negatives result in the status-quo behaviour (dupe created), which is recoverable.
- **Risk:** Low - dedup is a soft guard, not a constraint; Google Place ID matching (when introduced) will be the authoritative dedupe signal.
- **Future fix:** Switch to `google_place_id` equality as the primary match criterion once the Google Places integration is wired into the extraction path.
- **Introduced:** PR #16

---

## Future Enhancement Ideas

*(Non-debt items - features we might want to add later)*

### Filtering & Discovery
- Add specialty filter (BBQ, Seafood, Ramen, etc.) once specialty data is populated (see TD-004)
- Consider "surprise me" random restaurant picker
- Saved filter presets (e.g., "Date night" = Fine Dining + $$+)

### Data Quality
- Bulk re-run AI extraction to populate facets for existing restaurants
- Review "must try dishes" data quality before re-enabling in UI (currently hidden)

### UI/UX
- Consider adding cuisine icons or flags for visual recognition
- Mobile: evaluate if "More Filters" pattern is discoverable enough

### Performance
- Code splitting for admin panel (only loaded when authenticated)
- Consider lazy loading for map component

---

## Resolved Items

### TD-005: Long experience notes can break visit list layout [RESOLVED 2026-03-08]
- **Resolution:** Implemented click-to-expand truncation at 120 characters (~2 lines) in both `VisitHistory.tsx` and `RestaurantVisits.tsx`
- **Changes:** Notes truncate with "..." suffix, clicking expands inline to show full text
- **Result:** Visit cards maintain consistent height, long notes no longer break layout

### TD-006: No pagination for visit lists [RESOLVED 2026-03-08]
- **Resolution:** Created dedicated `/restaurant/:id/visits` sub-page with full visit timeline
- **Changes:**
  - `VisitHistory.tsx` now shows only latest 2 visits (reduced from 5)
  - Added "View all X visits →" button when >2 visits exist
  - New `RestaurantVisits.tsx` page shows full history with restaurant context
  - Room for future enhancements (photos, stats, timeline visualizations)
- **Result:** Restaurant detail page stays scannable, full history accessible when needed

---

## Notes

- Items are prefixed TD-NNN for easy reference in code comments and PR reviews.
- When adding new debt, include: location, issue description, why it was accepted, risk level, and proposed future fix.
- Review this list at the start of each new phase to see if any items should be addressed.
- Future enhancement ideas go in the separate section - keep debt tracking focused on actual shortcuts/compromises.
