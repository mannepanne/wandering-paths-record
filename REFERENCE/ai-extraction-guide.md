# AI Restaurant Extraction Guide

Complete documentation for the Claude-powered restaurant data extraction system.

**Key Files:**
- `src/services/claudeExtractor.ts` - Main extraction logic
- `server.cjs` - Local dev API server
- `src/worker.js` - Production Cloudflare Worker extraction
- `src/config/claude.ts` - Model configuration

---

## Overview

The extraction system uses Claude Sonnet 4.5 to automatically extract restaurant details from URLs. It's a multi-phase process:

1. **Content Crawling** - Fetch main page and relevant subpages
2. **Business Type Detection** - Verify it's actually a restaurant
3. **Restaurant Extraction** - Extract name, location, cuisine, etc.
4. **Review Enhancement** - Enrich with public reviews (future)

---

## Architecture

### Local Development (server.cjs)

```
Admin Panel → localhost:3001/api/extract-restaurant → Claude API → Restaurant Data
```

- Runs on Express server (port 3001)
- Uses proxies to fetch website content
- Calls Claude API directly
- Returns JSON response

### Production (worker.js)

```
Admin Panel → restaurants.hultberg.org/api/extract-restaurant → Claude API → Restaurant Data
```

- Runs in Cloudflare Workers runtime
- Same extraction logic as local dev
- Uses Cloudflare Workers KV for potential caching

---

## Current Model Configuration

**Model:** `claude-sonnet-4-20250514` (Sonnet 4.5)

**Version Configuration:** `src/config/claude.ts`

```typescript
export const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-20250514';
export const CLAUDE_API_VERSION = '2023-06-01';
export const CLAUDE_MAX_TOKENS = {
  EXTRACTION: 4000,
  REVIEW_SUMMARY: 1500
};
```

**When to update:**
- Anthropic deprecates current model
- New model offers better performance/accuracy
- See `SPECIFICATIONS/claude_model_updates.md` for update process

---

## Extraction Flow

### Phase 1: Content Crawling

**Goal:** Fetch meaningful HTML from the target URL

**Process:**
1. Fetch main page via proxy services
2. Parse HTML to find relevant subpages:
   - Menu pages (`/menu`, `/food`, `/chef`)
   - Contact pages (`/contact`, `/location`, `/find-us`)
   - About pages (`/about`, `/story`)
3. Fetch up to 3 additional pages
4. Combine all content for analysis

**Proxies used:**
- `https://api.codetabs.com/v1/proxy`
- `https://api.allorigins.win/get`

**Why proxies?**
- Avoid CORS restrictions
- Handle JavaScript-heavy sites (partially)
- No backend infrastructure needed

**Limitations:**
- Single-page apps may not render fully
- Some sites block proxies
- JavaScript-rendered content may be incomplete

**Fallback:** If proxies fail, extraction uses whatever content is available (may be incomplete).

---

### Phase 2: Business Type Detection

**Goal:** Verify the URL is actually a restaurant (not a hotel, retail shop, etc.)

**Trusted Review Sites (bypass this phase):**
- theinfatuation.com
- timeout.com
- opentable.com
- yelp.com
- squaremeal.co.uk
- guide.michelin.com
- tripadvisor.com

**For all other URLs:**

**Prompt:** See `server.cjs:344-378` and `claudeExtractor.ts:215-249`

**Valid business types:**
- `restaurant` - Primary food service establishment
- `cafe` - Coffee shop with food service
- `bakery` - Bakery with seating/dining
- `bar` - Drinks-focused with food
- `pub` - British pub serving meals

**Invalid types (rejected):**
- `hotel` - Accommodation (even if has restaurant)
- `retail` - Shops selling products
- `gallery` - Art galleries/museums
- `bookshop` - Bookstores
- `service` - Professional services
- `other` - Unclassifiable

**Response format:**
```json
{
  "businessType": "restaurant",
  "confidence": "high",
  "reasoning": "Website describes a fine dining restaurant with tasting menus"
}
```

**Why this phase?**
- Prevents adding non-restaurants to database
- Saves API costs on irrelevant extractions
- Improves user experience (clear error messages)

---

### Phase 3: Restaurant Data Extraction

**Goal:** Extract structured restaurant information

**Prompt:** See `server.cjs:419-471` and `claudeExtractor.ts:258-342`

**Extracted Fields:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | ✅ | Official restaurant name |
| `addressSummary` | string | ✅ | Human-readable location |
| `cuisine` | string | | Legacy field (kept for compatibility) |
| `cuisinePrimary` | enum | ✅ | Primary cuisine category |
| `cuisineSecondary` | enum | | Secondary for fusion only |
| `style` | enum | ✅ | Traditional/Modern/Fusion/etc. |
| `venue` | enum | ✅ | Restaurant/Cafe/Pub/Bar/Bakery |
| `description` | string | | 2-3 sentence summary |
| `dietaryOptions` | string | | Cooking style, ingredients |
| `priceRange` | enum | | $/$$/$$$/$$$$ |
| `atmosphere` | string | | Ambiance description |
| `bookingRequired` | boolean | | Reservations needed? |
| `mustTryDishes` | string[] | | Signature dishes |
| `locations` | array | ✅ | All restaurant locations |
| `phone` | string | | Main phone number |
| `chefName` | string | | Head chef if notable |

**Cuisine Categories (cuisinePrimary/cuisineSecondary):**
```
British, Nordic, French, Italian, Spanish, Portuguese, Greek, Balkan, European,
Japanese, Chinese, Korean, Thai, Vietnamese, Malaysian,
Indian, Middle Eastern, African, Caribbean,
Mexican, South American, American, Australian, Filipino,
Martian (only if truly unclassifiable)
```

**Style Options:**
- `Traditional` - Classic cooking methods
- `Modern` - Contemporary techniques
- `Fusion` - Deliberately blending cuisines
- `Casual` - Relaxed, everyday
- `Fine Dining` - Formal, upscale
- `Street Food` - Quick-service

**Venue Options:**
- `Restaurant` - Full-service dining
- `Cafe` - Coffee-focused
- `Pub` - British pub
- `Bar` - Drinks-focused
- `Bakery` - Bakery with dining

**Location Objects:**
```typescript
{
  locationName: "Shoreditch",  // Neighborhood
  fullAddress: "123 High St, London E1 6AN",  // Complete address
  city: "London",  // MANDATORY
  country: "United Kingdom",  // MANDATORY
  phone: "+44 20 1234 5678"  // Optional
}
```

**Multi-Location Support:**
- Chain restaurants return multiple location objects
- Each location gets full address details
- City and country are NEVER null

**Post-Processing:**

After Claude extraction, `inferCityFromLocation()` fills missing city fields:
- Recognizes 40+ London neighborhoods (Shoreditch, Camden, etc.)
- Infers "London" from recognized areas
- Defaults to "London" if unknown UK address
- Ensures country defaults to "United Kingdom"

---

### Phase 4: Review Enhancement (Future)

**Status:** Not yet implemented

**Planned:** Integrate Google Places API for public ratings and reviews

**See:** `REFERENCE/geo-services-guide.md` for future implementation

---

## Prompt Engineering

### Key Prompt Strategies

**1. Explicit JSON Format**
```
Return JSON in this format:
{
  "name": "...",
  "cuisine": "..."
}
```

**Why:** Claude sometimes wraps JSON in explanation text. Explicit format reduces this.

**2. Allowed Value Lists**

Rather than "extract cuisine", we provide:
```
cuisinePrimary (REQUIRED - pick ONE from):
  British, French, Italian, Japanese, Chinese, ...
```

**Why:** Standardizes outputs, prevents made-up categories like "Neo-British Gastropub Fusion".

**3. Critical Field Emphasis**

```
CRITICAL: city and country are MANDATORY fields - never leave them null or empty
```

**Why:** Claude may omit optional fields. Emphasis ensures required data.

**4. Examples in Definitions**

```
addressSummary: "Brief address summary (e.g., 'Shoreditch, London' or 'Multiple locations in London & Edinburgh')"
```

**Why:** Shows Claude the desired output format.

**5. Edge Case Handling**

```
IMPORTANT: If you find a hotel with a restaurant component, classify as "restaurant" only if the restaurant is the primary business focus.
```

**Why:** Handles ambiguous cases explicitly.

---

## Error Handling

### Rate Limits

**Anthropic API Limits:** Varies by plan

**Detection:**
```javascript
if (response.status === 429 || errorText.includes('rate_limit_error')) {
  return {
    error: 'Claude API rate limit reached. Please wait 2-3 minutes.',
    isRateLimited: true,
    retryAfter: 180
  };
}
```

**User Experience:**
- Clear error message
- Suggests retry timing
- Frontend can show countdown timer

### Proxy Failures

**Fallback Chain:**
1. Try `api.codetabs.com`
2. If fails, try `api.allorigins.win`
3. If both fail, return null content

**Impact:** Extraction may fail or return incomplete data

**Mitigation:** Ask user to try:
- Different URL (review site vs. restaurant site)
- Manual entry as fallback

### JSON Parsing Errors

**Issue:** Claude sometimes returns `Here is the data: {"name": "..."} - done`

**Solution:** `extractJSONFromResponse()` function
```javascript
function extractJSONFromResponse(response) {
  try {
    return JSON.parse(response);  // Try clean parse first
  } catch (e) {
    // Extract JSON between braces
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
  }
}
```

### Missing Required Fields

**City/Country Fallback:**
```javascript
const processedLocations = data.locations?.map(location => ({
  ...location,
  city: location.city || inferCityFromLocation(location) || 'London',
  country: location.country || 'United Kingdom'
}));
```

**Why:** Ensures database integrity (city/country should never be null)

---

## Development Cache

**Purpose:** Avoid repeated API calls during development

**Location:** `localStorage` (browser-side)

**Key:** `wandering-paths-extraction-cache`

**Duration:** 24 hours

**Usage:**
```javascript
// Check cache first
const cached = ExtractionCache.get(url);
if (cached) return cached;

// Extract and cache
const data = await extract(url);
ExtractionCache.set(url, data);
```

**Clear cache:**
```javascript
ExtractionCache.clear();
```

**Get stats:**
```javascript
const stats = ExtractionCache.getStats();
// { totalEntries: 5, oldestEntry: Date, newestEntry: Date }
```

**Production:** Cache is NOT used (each extraction is fresh)

---

## Troubleshooting

### "This appears to be a [type], not a restaurant"

**Cause:** Business type detection classified it as non-restaurant

**Solutions:**
1. Try a review site URL instead (Timeout, Infatuation, etc.)
2. Verify it actually is a restaurant (not just a retail bakery, hotel lobby, etc.)
3. Use manual entry

### Incomplete extraction (missing address, phone, etc.)

**Causes:**
- Website structure not crawler-friendly
- Content behind JavaScript/authentication
- Proxies failed to fetch

**Solutions:**
1. Try again (AI responses vary)
2. Use review site URL
3. Fill missing fields manually after extraction
4. Check browser console for proxy errors

### Rate limit errors

**Cause:** Too many extractions in short time

**Solutions:**
- Wait 2-3 minutes
- Check Anthropic console for current usage
- Consider API plan upgrade if frequent

### Wrong cuisine/style/venue classification

**Cause:** AI interpretation of website content

**Solutions:**
- Edit after extraction (all fields editable)
- Provide feedback for future prompt improvements
- Consider if website description is unclear

---

## Cost Optimization

### Token Usage

**Business Type Detection:** ~2,500 tokens (8KB content)
**Restaurant Extraction:** ~4,500 tokens (15KB content)
**Total per extraction:** ~7,000 tokens average

**Anthropic Pricing (as of 2025):**
- Sonnet 4.5: $3 per million input tokens
- Cost per extraction: ~$0.021 (2.1 cents)

### Reducing Costs

**1. Content Truncation**
```javascript
const limitedContent = allContent.slice(0, 8000); // ~2K tokens
```

**2. Caching (development only)**
- Avoids repeated API calls for same URL
- Clears after 24 hours

**3. Trusted Review Sites**
- Skip business type detection phase
- Saves ~2,500 tokens per extraction

**4. Manual Entry Option**
- When extraction isn't cost-effective
- Complex multi-location chains
- Sites that require authentication

---

## Future Enhancements

### Planned Improvements

**1. Review Integration**
- Fetch Google Places reviews
- Summarize with Claude
- Add public rating and review summary

**2. Image Extraction**
- Extract restaurant images from website
- Download and store in repo
- Reduce manual image upload work

**3. Smarter Crawling**
- Detect JavaScript frameworks (React, Vue)
- Use headless browser for dynamic content
- Improve menu/contact page detection

**4. Extraction Confidence Scoring**
- Better confidence calculation
- Surface low-confidence fields for manual review
- Suggest when manual entry is better choice

**5. Batch Extraction**
- Extract multiple restaurants from list pages
- Useful for "best restaurants in [city]" articles
- Bulk import workflow

---

## API Reference

### POST /api/extract-restaurant

**Request:**
```json
{
  "url": "https://example.com/restaurant"
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "name": "Example Restaurant",
    "addressSummary": "Shoreditch, London",
    "cuisinePrimary": "Italian",
    "style": "Modern",
    "venue": "Restaurant",
    "priceRange": "$$",
    "locations": [
      {
        "locationName": "Shoreditch",
        "fullAddress": "123 High St, London E1 6AN",
        "city": "London",
        "country": "United Kingdom"
      }
    ]
    // ... other fields
  },
  "confidence": "high"
}
```

**Not a Restaurant Response:**
```json
{
  "success": false,
  "isNotRestaurant": true,
  "detectedType": "hotel",
  "message": "This appears to be a hotel website, not a restaurant."
}
```

**Rate Limit Response:**
```json
{
  "success": false,
  "error": "Claude API rate limit reached. Please wait 2-3 minutes.",
  "isRateLimited": true,
  "retryAfter": 180
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Extraction failed: [error details]"
}
```

---

**Related Documentation:**
- `src/config/claude.ts` - Model configuration
- `SPECIFICATIONS/claude_model_updates.md` - How to update models
- `SPECIFICATIONS/extraction_system_requirements.md` - Original spec
- `REFERENCE/troubleshooting.md` - Common extraction issues
