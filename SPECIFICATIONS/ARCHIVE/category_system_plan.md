# Category System Implementation Plan

This document outlines the plan to replace the current flat `cuisine` field with a multi-faceted category system for better restaurant discovery and filtering.

## Problem Statement

The current `cuisine` field has grown to 56 distinct values mixing:
- Actual cuisines (Japanese, Italian)
- Modifiers (Modern European, Modern British)
- Fusion combinations (Korean-European Fusion, Italian-Japanese Fusion)
- Venue types (Cafe, Bar only, Pub / Thai)
- Regional variants (Chinese Xinjiang, American Southern)

This makes filtering unwieldy and inconsistent.

## Solution: Faceted Category System

Replace single `cuisine` string with structured facets:

### Facet Definitions

#### 1. Cuisine (Primary food tradition)

| Value | Description |
| --- | --- |
| British | Traditional and modern British cuisine |
| Nordic | Scandinavian, Faroese, Nordic cuisine |
| French | French cuisine |
| Italian | Italian cuisine |
| Spanish | Spanish cuisine including tapas |
| Portuguese | Portuguese cuisine |
| Greek | Greek cuisine |
| Balkan | Albanian, Bosnian, Bulgarian, Croatian, Hungarian, Moldovan, Montenegrin, North Macedonian, Romanian, Serbian, Slovenian |
| European | Pan-European, Austrian, unspecified European |
| Japanese | Japanese cuisine |
| Chinese | Chinese cuisine (all regional variants) |
| Korean | Korean cuisine |
| Thai | Thai cuisine |
| Vietnamese | Vietnamese cuisine |
| Malaysian | Malaysian cuisine |
| Indian | Indian and Pakistani cuisine |
| Middle Eastern | Middle Eastern, Kurdish, Turkish |
| African | African cuisine |
| Caribbean | Caribbean cuisine |
| Mexican | Mexican and Central American |
| South American | Chilean, Peruvian, Brazilian, etc. |
| American | American, Southern, BBQ |
| Australian | Australian cuisine |
| Filipino | Filipino, Taiwanese, other SE Asian |

#### 2. Secondary Cuisine (For fusion - optional)

Same values as Cuisine. Used when a restaurant blends two traditions.
- Example: Primary `Japanese`, Secondary `Italian` for Italian-Japanese Fusion

#### 3. Style

| Value | Description |
| --- | --- |
| Traditional | Classic preparation and presentation |
| Modern | Contemporary interpretation of cuisine |
| Fusion | Explicitly blending multiple traditions |
| Casual | Relaxed, everyday dining |
| Fine Dining | Elevated, formal experience |
| Street Food | Informal, often counter service |

#### 4. Venue

| Value | Description |
| --- | --- |
| Restaurant | Standard restaurant (default) |
| Cafe | Coffee shop or casual eatery |
| Pub | Traditional pub with food |
| Bar | Bar with food options |
| Bakery | Bakery with seating |

#### 5. Specialty (Optional)

| Value | Description |
| --- | --- |
| BBQ | Barbecue focused |
| Seafood | Seafood specialist |
| Steakhouse | Steak focused |
| Ramen | Ramen specialist |
| Pizza | Pizza focused |
| Sushi | Sushi specialist |
| Tapas | Small plates / sharing |
| Tasting Menu | Multi-course set menus |
| Brunch | Known for brunch service |
| Breakfast | Breakfast specialist |

---

## Database Schema Changes

### New Columns on `restaurants` table

```sql
-- New facet columns
ALTER TABLE restaurants ADD COLUMN cuisine_primary TEXT;
ALTER TABLE restaurants ADD COLUMN cuisine_secondary TEXT;  -- nullable, for fusion
ALTER TABLE restaurants ADD COLUMN style TEXT;
ALTER TABLE restaurants ADD COLUMN venue TEXT DEFAULT 'Restaurant';
ALTER TABLE restaurants ADD COLUMN specialty TEXT[];  -- array, optional

-- Keep old cuisine column during migration
-- ALTER TABLE restaurants DROP COLUMN cuisine;  -- Later, after migration verified
```

### Constraints

```sql
-- Enum-like constraints (or use actual enums)
ALTER TABLE restaurants ADD CONSTRAINT check_cuisine_primary
  CHECK (cuisine_primary IN ('British', 'Nordic', 'French', 'Italian', 'Spanish',
    'Portuguese', 'Greek', 'Balkan', 'European', 'Japanese', 'Chinese', 'Korean', 'Thai',
    'Vietnamese', 'Malaysian', 'Indian', 'Middle Eastern', 'African', 'Caribbean',
    'Mexican', 'South American', 'American', 'Australian', 'Filipino'));

ALTER TABLE restaurants ADD CONSTRAINT check_style
  CHECK (style IN ('Traditional', 'Modern', 'Fusion', 'Casual', 'Fine Dining', 'Street Food'));

ALTER TABLE restaurants ADD CONSTRAINT check_venue
  CHECK (venue IN ('Restaurant', 'Cafe', 'Pub', 'Bar', 'Bakery'));
```

---

## Implementation Phases

### Phase 1: Database & Types (Branch: `feature/category-system`)

**Tasks:**
1. Create new git branch `feature/category-system`
2. Add new columns to Supabase database
3. Update TypeScript types in `src/types/place.ts`
4. Update restaurant service in `src/services/restaurants.ts`

**Deliverables:**
- Database schema updated
- Types updated
- No UI changes yet - old `cuisine` field still works

### Phase 2: Data Migration

**Tasks:**
1. Create migration script to map existing `cuisine` values to new facets
2. Use AI analysis of existing restaurant data (atmosphere, description, review summary) to infer Style
3. Run migration on all existing restaurants
4. Verify migration accuracy

**Migration Mapping Logic:**

```typescript
// Example mapping rules
const migrationRules = {
  'Modern European': { cuisine_primary: 'European', style: 'Modern' },
  'Modern British': { cuisine_primary: 'British', style: 'Modern' },
  'British': { cuisine_primary: 'British', style: 'Traditional' },
  'Italian-Japanese Fusion': { cuisine_primary: 'Japanese', cuisine_secondary: 'Italian', style: 'Fusion' },
  'Pub / Thai': { cuisine_primary: 'Thai', venue: 'Pub' },
  'Cafe': { venue: 'Cafe' },  // cuisine_primary inferred from other data
  'American BBQ': { cuisine_primary: 'American', specialty: ['BBQ'] },
  // ... etc
};
```

**Deliverables:**
- All existing restaurants have new facet values populated
- Old `cuisine` field preserved for verification

### Phase 3: UI - Filter Bar Update

**Tasks:**
1. Update FilterBar component with multi-facet dropdowns
2. Create responsive design (collapse to "More filters" on mobile)
3. Show counts per facet value
4. Update filtering logic in restaurant service

**UI Design:**
```
Desktop:  [Cuisine ▼] [Style ▼] [Venue ▼] [Specialty ▼]
Mobile:   [Cuisine ▼] [Filters ▼]  (Filters expands to show rest)
```

**Deliverables:**
- New filter UI working
- Filtering works with new facets

### Phase 4: UI - Admin Panel & Cards Update

**Tasks:**
1. Update AdminPanel form to use facet dropdowns instead of free text
2. Update PlaceCard display to show primary cuisine + style badge
3. Update PlacePreview (edit mode) with facet selectors
4. Update InteractiveMap popups

**Deliverables:**
- Consistent facet display across app
- Admin can set facets when creating/editing

### Phase 5: AI Extraction Enhancement

**Tasks:**
1. Update Claude extraction prompt to suggest facet values
2. Map extracted data to facet dropdowns in AdminPanel
3. Allow admin to override AI suggestions
4. Use restaurant description/atmosphere/reviews to improve Style inference

**Updated Extraction Response:**
```typescript
interface ExtractedRestaurantData {
  // ... existing fields ...
  suggestedFacets: {
    cuisine_primary: string;
    cuisine_secondary?: string;
    style: string;
    venue: string;
    specialty?: string[];
    confidence: 'high' | 'medium' | 'low';
  };
}
```

**Deliverables:**
- AI suggests facets during extraction
- Admin sees suggestions pre-filled in form

### Phase 6: Cleanup

**Tasks:**
1. Remove old `cuisine` column from database
2. Remove legacy code paths
3. Update documentation
4. Update CLAUDE.md with new data model

**Deliverables:**
- Clean codebase with no legacy cuisine references
- Documentation updated

---

## Migration Mapping Reference

Complete mapping from current cuisine values to new facets:

| Current Value | cuisine_primary | cuisine_secondary | style | venue | specialty |
| --- | --- | --- | --- | --- | --- |
| Modern European | European | - | Modern | Restaurant | - |
| British | British | - | Traditional | Restaurant | - |
| Modern British | British | - | Modern | Restaurant | - |
| Japanese | Japanese | - | Traditional | Restaurant | - |
| Italian | Italian | - | Traditional | Restaurant | - |
| Thai | Thai | - | Traditional | Restaurant | - |
| Chinese | Chinese | - | Traditional | Restaurant | - |
| Portuguese | Portuguese | - | Traditional | Restaurant | - |
| French | French | - | Traditional | Restaurant | - |
| Spanish | Spanish | - | Traditional | Restaurant | - |
| Caribbean | Caribbean | - | Traditional | Restaurant | - |
| Malaysian | Malaysian | - | Traditional | Restaurant | - |
| Vietnamese | Vietnamese | - | Traditional | Restaurant | - |
| American BBQ | American | - | Traditional | Restaurant | BBQ |
| Austrian | European | - | Traditional | Restaurant | - |
| Indian | Indian | - | Traditional | Restaurant | - |
| Italian-American | Italian | American | Fusion | Restaurant | - |
| Korean | Korean | - | Traditional | Restaurant | - |
| Mexican | Mexican | - | Traditional | Restaurant | - |
| Middle Eastern | Middle Eastern | - | Traditional | Restaurant | - |
| Modern Italian | Italian | - | Modern | Restaurant | - |
| Modern Nordic | Nordic | - | Modern | Restaurant | - |
| Modern Portuguese | Portuguese | - | Modern | Restaurant | - |
| African | African | - | Traditional | Restaurant | - |
| American Southern | American | - | Traditional | Restaurant | - |
| Australian | Australian | - | Traditional | Restaurant | - |
| Bakery/Cafe | *infer* | - | Casual | Bakery | - |
| Balkan/Eastern Mediterranean | Balkan | - | Traditional | Restaurant | - |
| Bar only | *infer* | - | Casual | Bar | - |
| British Seaside Cafe | British | - | Traditional | Cafe | - |
| British Steakhouse | British | - | Traditional | Restaurant | Steakhouse |
| Cafe | *infer* | - | Casual | Cafe | - |
| Chilean/South American | South American | - | Traditional | Restaurant | - |
| Chinese (Xinjiang) | Chinese | - | Traditional | Restaurant | - |
| Contemporary Chinese | Chinese | - | Modern | Restaurant | - |
| Filipino | Filipino | - | Traditional | Restaurant | - |
| Greek | Greek | - | Traditional | Restaurant | - |
| Italian-Japanese Fusion | Japanese | Italian | Fusion | Restaurant | - |
| Korean & Japanese | Korean | Japanese | Fusion | Restaurant | - |
| Korean-European Fusion | Korean | European | Fusion | Restaurant | - |
| Kurdish | Middle Eastern | - | Traditional | Restaurant | - |
| Martian? | *review* | - | *review* | Restaurant | - |
| Modern American | American | - | Modern | Restaurant | - |
| Modern Australian | Australian | - | Modern | Restaurant | - |
| Modern Cafe & Japanese | Japanese | - | Modern | Cafe | - |
| Modern Chinese | Chinese | - | Modern | Restaurant | - |
| Modern Faroese | Nordic | - | Modern | Restaurant | - |
| Modern French | French | - | Modern | Restaurant | - |
| Modern Indian | Indian | - | Modern | Restaurant | - |
| Modern Scandinavian Seafood | Nordic | - | Modern | Restaurant | Seafood |
| Pakistan | Indian | - | Traditional | Restaurant | - |
| Polish & Mexican | Mexican | European | Fusion | Restaurant | - |
| Pub / Thai | Thai | - | Casual | Pub | - |
| Scandinavian | Nordic | - | Traditional | Restaurant | - |
| Taiwanese | Filipino | - | Traditional | Restaurant | - |
| Tapas | Spanish | - | Traditional | Restaurant | Tapas |
| Thai-Malay | Thai | Malaysian | Fusion | Restaurant | - |

*Notes:*
- `*infer*` = Will use AI to analyse description/atmosphere to determine primary cuisine
- `*review*` = Manual review needed (Martian?)

---

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| Migration breaks filtering | Keep old `cuisine` field during migration, test thoroughly |
| Facet values too restrictive | Allow "Other" option, review periodically |
| UI becomes cluttered | Progressive disclosure - show Cuisine first, rest in "More" |
| AI suggestions inaccurate | Always show as suggestions, admin confirms |

---

## Success Criteria

1. ✅ All restaurants have valid facet values
2. ✅ Filtering by any facet works correctly
3. ✅ Fusion restaurants findable under both cuisines
4. ✅ UI is simpler to use than current 56-item dropdown
5. ✅ AI extraction suggests reasonable facet values
6. ✅ No data loss during migration

---

## Timeline Estimate

- **Phase 1**: Database & Types - 1 session
- **Phase 2**: Data Migration - 1-2 sessions
- **Phase 3**: Filter Bar UI - 1 session
- **Phase 4**: Admin & Cards UI - 1 session
- **Phase 5**: AI Extraction - 1 session
- **Phase 6**: Cleanup - 0.5 session

**Total: \~5-7 working sessions**

---

*Created: January 2026*
*Status: Planning*
