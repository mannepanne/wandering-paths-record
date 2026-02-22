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
- **Location:** Supabase `restaurants` table
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

*(Move items here when addressed, with resolution notes)*

---

## Notes

- Items are prefixed TD-NNN for easy reference in code comments and PR reviews.
- When adding new debt, include: location, issue description, why it was accepted, risk level, and proposed future fix.
- Review this list at the start of each new phase to see if any items should be addressed.
- Future enhancement ideas go in the separate section - keep debt tracking focused on actual shortcuts/compromises.
