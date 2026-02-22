# Geo Services Guide

Documentation for geocoding, maps, and location-based features.

**Key Files:**
- `src/services/locationService.ts` - Geocoding and distance calculations
- `src/services/smartGeoSearch.ts` - Three-tier geo search
- `src/components/InteractiveMap.tsx` - Mapbox map display
- `src/worker.js` - Google Maps API proxy (production)

---

## Overview

The app uses multiple geo services for different purposes:

| Service | Purpose | When Used |
| --- | --- | --- |
| **Google Geocoding API** | Convert addresses to lat/lng | Adding restaurants, "Near Me" search |
| **Google Places API** | Lookup place details, reviews | Review enrichment (future) |
| **Mapbox GL JS** | Interactive map display | Main restaurant map view |
| **Nominatim** | Free geocoding fallback | Development when Google quota exhausted |

---

## Google Geocoding API

### Purpose

Convert restaurant addresses to precise latitude/longitude coordinates for map display.

### Usage in App

**1. Restaurant Location Geocoding (`locationService.ts`)**

When adding a restaurant:
```typescript
const coords = await locationService.geocodeLocation(address, restaurantName);
// Returns: { lat: 51.5074, lng: -0.1278 }
```

**Query Enhancement:**
- Query: `"Shoreditch, London"`
- Enhanced: `"Dishoom, Shoreditch, London"`
- Why: Including restaurant name improves accuracy

**2. "Near Me" Search**

User searches for address/neighborhood:
```typescript
const userCoords = await locationService.geocodeLocation("Camden, London");
// Find restaurants within 1.5km
const nearby = restaurants.filter(r =>
  haversineDistance(userCoords, r.coordinates) <= 1.5
);
```

### Production vs Development

**Production (`restaurants.hultberg.org`):**
```
Frontend → /api/google-maps?endpoint=geocode → Worker Proxy → Google API
```

- Proxied through Cloudflare Worker
- API key stored in Worker secrets
- No client-side API key exposure

**Development (`localhost:8080`):**
```
Frontend → Direct Google API (if VITE_GOOGLE_MAPS_API_KEY set)
         ↓ (fallback)
         → Nominatim free API
```

- Uses `VITE_GOOGLE_MAPS_API_KEY` from `.env`
- Falls back to Nominatim if Google fails/quota exceeded
- Nominatim has usage limits (1 req/sec), but sufficient for dev

### API Endpoints

**Geocode Address:**
```
GET https://maps.googleapis.com/maps/api/geocode/json?address={query}&key={API_KEY}
```

**Response:**
```json
{
  "status": "OK",
  "results": [
    {
      "formatted_address": "7 Boundary St, Shoreditch, London E2 7JE, UK",
      "geometry": {
        "location": {
          "lat": 51.5226,
          "lng": -0.0780
        }
      },
      "place_id": "ChIJ..."
    }
  ]
}
```

### Quotas and Costs

**Free Tier:** $200/month credit = ~40,000 geocoding requests

**Pricing:** $5 per 1,000 requests after free tier

**Typical Usage:**
- Adding restaurant: 1-8 requests (1 per location)
- "Near Me" search: 1 request per user search
- Estimated monthly: ~200-500 requests (well within free tier)

**Quota Management:**
- Monitor in Google Cloud Console → APIs → Geocoding API → Quotas
- Set billing alerts at $50, $100, $150
- Consider rate limiting if abuse detected

---

## Google Places API

### Purpose

**Current:** Not yet used
**Planned:** Fetch public ratings and reviews for restaurant enrichment

### Future Implementation

**1. Place Search** (find restaurant by name/address)
```
GET /place/textsearch/json?query={restaurant_name}&key={API_KEY}
```

**2. Place Details** (get reviews/ratings by place_id)
```
GET /place/details/json?place_id={place_id}&fields=rating,reviews&key={API_KEY}
```

**3. Reviews Summarization**
- Fetch reviews via Places API
- Summarize with Claude
- Store summary + rating in database

**See:** `src/worker.js:767-825` for placeholder implementation

**Status:** Commented out - awaiting product decision on review integration

---

## Mapbox GL JS

### Purpose

Interactive map visualization with clustering for multiple restaurants.

### Implementation

**Library:** `mapbox-gl` (React wrapper: `react-map-gl`)

**Component:** `src/components/InteractiveMap.tsx`

**Map Style:** `mapbox://styles/mapbox/streets-v12`

### Features

**1. Restaurant Markers**
- Each restaurant location gets a marker
- Colored by status: to-visit (orange) vs visited (green)
- Click marker → show restaurant details

**2. Marker Clustering**
- Multiple nearby restaurants cluster automatically
- Cluster shows count badge
- Zoom in → cluster expands to individual markers
- Uses `supercluster` algorithm

**3. User Location**
- "Near Me" button requests geolocation
- Blue marker shows user position
- Map centers on user location

**4. Popup Details**
- Click marker → popup with restaurant name, address, cuisine
- "View Details" button → navigate to restaurant page

### Configuration

**Access Token:** `VITE_MAPBOX_ACCESS_TOKEN` in `.env`

**Map Bounds:**
- Default center: London (51.5074, -0.1278)
- Default zoom: 12
- Min zoom: 2 (world view)
- Max zoom: 18 (street level)

**Clustering:**
- Cluster radius: 50 pixels
- Min zoom for clustering: 0
- Max zoom for clustering: 14 (stops clustering at street level)

### Customization

**Custom Map Style:**
- Create in Mapbox Studio: https://studio.mapbox.com/
- Use brand colors (warm-stone, burnt-orange, etc.)
- Update style URL in `InteractiveMap.tsx`

**Custom Marker Icons:**
- Replace default pins with custom SVG/PNG
- Different icons for cuisine types
- Status-based styling (to-visit vs visited)

### Performance

**Optimization:**
- Only render visible markers (Mapbox does this automatically)
- Clustering reduces marker count at high zoom
- Lazy load map component (consider `React.lazy()`)

**Bundle Size:**
- `mapbox-gl`: ~250KB minified
- Consider code splitting for admin-only features

---

## Smart Geo Search

### Three-Tier Search Strategy

**File:** `src/services/smartGeoSearch.ts`

**Tiers:**

**1. Text Match (Tier 1)**
- Search restaurant name, address, cuisine
- Fast, no geocoding required
- Returns exact matches

**2. Proximity Search (Tier 2)**
- User provides location → geocode to coordinates
- Find restaurants within radius (default 1.5km)
- Sort by distance (closest first)

**3. City Fallback (Tier 3)**
- If proximity search finds < 3 results
- Extract city from search query
- Show all restaurants in that city
- Example: "Camden" → shows all London restaurants

### Haversine Distance Calculation

**Formula:** Calculates distance between two lat/lng points on Earth's surface

```typescript
function haversineDistance(coords1, coords2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(coords1.lat)) * Math.cos(toRad(coords2.lat)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}
```

**Accuracy:** ±0.5% (sufficient for restaurant search)

**Performance:** Fast, no API calls

---

## Nominatim (Free Fallback)

### Purpose

Free geocoding API for development when Google quota exhausted.

### Usage

**Endpoint:**
```
GET https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1
```

**Response:**
```json
[
  {
    "lat": "51.5074",
    "lon": "-0.1278",  // Note: 'lon' not 'lng'
    "display_name": "London, Greater London, England, UK",
    "address": {
      "city": "London",
      "country": "United Kingdom"
    }
  }
]
```

### Limitations

**Rate Limit:** 1 request per second
- Must include `User-Agent` header
- Respect usage policy: https://operations.osmfoundation.org/policies/nominatim/

**Accuracy:** Generally good, but:
- Less accurate for specific addresses than Google
- Better for city/neighborhood searches
- May struggle with new developments

**Best Practices:**
- Use as development fallback only
- Production should use Google Geocoding
- Cache results to minimize requests

---

## Troubleshooting

### Geocoding fails silently

**Symptoms:**
- Restaurants added without lat/lng
- Don't appear on map

**Causes:**
- Google API key missing/invalid
- API quota exceeded
- Address too vague ("London" vs "123 High St, London E1 6AN")

**Solutions:**
```bash
# Check API key is set
echo $VITE_GOOGLE_MAPS_API_KEY  # Local dev
wrangler secret list  # Production

# Check Google Cloud Console
# → APIs → Geocoding API → Quotas
# → Verify requests not hitting limits

# Test geocoding manually
curl "https://maps.googleapis.com/maps/api/geocode/json?address=London&key=YOUR_KEY"
```

### Map not displaying

**Symptoms:**
- Blank map area
- Console error: "Unauthorized" or "Invalid access token"

**Causes:**
- Mapbox token missing/invalid
- Token doesn't have correct scopes

**Solutions:**
```bash
# Check token is set
cat .env | grep MAPBOX

# Verify token at https://account.mapbox.com/access-tokens/
# Token should have these scopes:
# - styles:read
# - fonts:read
# - datasets:read
```

### "Near Me" not working

**Symptoms:**
- No results when searching by location
- "Near Me" button does nothing

**Causes:**
- Geolocation permission denied
- Geocoding service down
- No restaurants within search radius

**Debug:**
```javascript
// Test geolocation
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos.coords),
  err => console.error('Geolocation error:', err)
);

// Test geocoding
const coords = await locationService.geocodeLocation("Camden, London");
console.log('Geocoded:', coords);
```

### Distance calculations seem wrong

**Symptoms:**
- Restaurants sorted incorrectly by distance
- Unexpected restaurants in "Near Me" results

**Causes:**
- Haversine formula assumes spherical Earth (it's actually oblate spheroid)
- Margin of error: ±0.5%
- Restaurants without lat/lng excluded from distance calc

**Solutions:**
- Expected behavior - errors are small enough for restaurant search
- For high-precision routing, would need Google Distance Matrix API
- Ensure all restaurants have geocoded coordinates

---

## Future Enhancements

### Google Places Integration

**Goal:** Enrich restaurants with public reviews and ratings

**Implementation Plan:**
1. Search for restaurant by name + address via Places Text Search
2. Get `place_id` from search result
3. Fetch details (rating, reviews) via Place Details API
4. Summarize reviews with Claude
5. Store `public_rating` and `review_summary` in database

**Cost:** Places API is more expensive than Geocoding
- Text Search: $32 per 1,000 requests
- Place Details (with reviews): $17 per 1,000 requests
- Consider batching updates (weekly cron job vs real-time)

### Enhanced Map Features

- **Route to restaurant:** Google Maps directions integration
- **Street view preview:** Embed street view for restaurant exterior
- **Cluster styling:** Color clusters by predominant cuisine
- **Heat map:** Show restaurant density by area

### Advanced Search

- **Isochrone search:** Restaurants reachable within X minutes (walk/transit)
- **Bounding box search:** "Show all restaurants in this map area"
- **Saved locations:** User's home/work for quick "near home" search

---

**Related Documentation:**
- `REFERENCE/environment-setup.md` - API key configuration
- `REFERENCE/troubleshooting.md` - Common map/geocoding issues
- `src/services/locationService.ts` - Geocoding implementation
- `src/components/InteractiveMap.tsx` - Map component
