# Tech Debt and Future Ideas

A living document for tracking technical debt, cleanup tasks, and potential future enhancements.

## Tech Debt

### Category System Migration (Phase 6 pending)
- **Legacy ****`cuisine`**** column**: Still exists in database for backwards compatibility
- **Cleanup task**: Once confident the new facet system works well, remove:
  - `cuisine` column from `restaurants` table
  - `cuisine` field from TypeScript types
  - Fallback logic in PlaceCard and RestaurantDetails that checks for legacy `cuisine`
- **Status**: Testing new facets, will clean up after validation

### Database
- Consider adding check constraints for `cuisine_primary`, `style`, `venue` to match TypeScript types
- Review if `specialty[]` array field is being used (added but not yet implemented in UI)

## Future Ideas

### Filtering & Discovery
- Add specialty filter (BBQ, Seafood, Ramen, etc.) once specialty data is populated
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
*Last updated: January 2025*
