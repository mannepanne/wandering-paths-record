# Restaurant Data Extraction System - Current Implementation

## Overview

This document describes the currently implemented restaurant data extraction system for Wandering Paths. The system provides intelligent, AI-powered restaurant data extraction from website URLs using Claude 3.5 Sonnet API integration.

**Current Status**: ✅ **Fully Implemented and Operational**

The system successfully extracts comprehensive restaurant information from URLs and populates editable forms in the admin panel, with robust error handling and multi-location support.

## System Architecture

### Current Implementation Stack
- **Frontend**: React + TypeScript admin panel with dynamic form management
- **API Server**: Express.js local development server (`server.cjs`)
- **AI Engine**: Anthropic Claude 3.5 Sonnet API for content analysis
- **Content Fetching**: Multiple proxy services with fallback strategies
- **Caching**: URL-based localStorage caching (24-hour expiration)
- **Database**: Supabase with multi-location restaurant architecture

### Multi-Location Database Architecture

```typescript
// Primary restaurant table
interface Restaurant {
  id: string;
  name: string;
  address: string; // Human-readable summary (e.g., "Multiple locations in London & Edinburgh")
  website?: string;
  public_rating?: number;
  personal_rating?: number;
  status: 'must-visit' | 'visited';
  description?: string;
  cuisine?: string;
  must_try_dishes?: string[];
  price_range?: '$' | '$$' | '$$$' | '$$$$';
  atmosphere?: string;
  dietary_options?: string;
  chef_name?: string;
  // ... timestamps and metadata
}

// Detailed location data for individual addresses
interface RestaurantAddress {
  id: string;
  restaurant_id: string;
  location_name: string; // Area/neighborhood (e.g., "Shoreditch", "King's Cross")
  full_address: string;  // Complete address with postcode
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  opening_hours?: any; // JSON data for structured hours
  // ... timestamps
}
```

## Current Extraction Workflow

### Phase 1: Content Fetching & Analysis
```javascript
// 1. Multi-proxy content fetching with fallbacks
const fetchPageWithProxy = async (url) => {
  const proxies = [
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  ];
  // Iterate through proxies until successful
};

// 2. Meaningful content extraction with international support
const extractMeaningfulContent = (html) => {
  // Remove scripts/styles
  // Extract titles, meta descriptions, headings, paragraphs
  // Extract schema.org structured data
  // Extract addresses (UK, French, US postal codes)
  // Extract phone numbers and opening hours
  // Extract location keywords (major international cities)
};
```

### Phase 2: AI-Powered Business Analysis

```javascript
// Business Type Detection (Claude API)
const businessPrompt = `
BUSINESS TYPE DEFINITIONS:
- restaurant: Serves food/drinks for dine-in (includes restaurants, bistros, cafes, wine bars, pubs, brasseries, eateries, food halls, etc.)
- hotel: Accommodation with possible restaurant component
- retail: Sells products/goods
- gallery: Art gallery or museum
- bookshop: Bookstore or library
- service: Professional services, consulting, etc.
- other: Doesn't fit clear categories

IMPORTANT: 
- Wine bars, bistros, cafes, pubs, brasseries, and similar establishments that serve food should be classified as "restaurant"
- If you find a hotel or venue with a restaurant component, classify as "restaurant" only if the restaurant is the primary business focus
`;
```

### Phase 3: Restaurant Data Extraction

```javascript
// Comprehensive restaurant analysis prompt
const restaurantPrompt = `
EXTRACT THE FOLLOWING and return as JSON:
{
  "name": "Official restaurant name",
  "addressSummary": "Human-readable location summary",
  "phone": "Main phone number if found", 
  "chefName": "Head chef name if mentioned",
  "cuisine": "Standardized cuisine type",
  "description": "2-3 sentence summary of the restaurant's concept and appeal",
  "dietaryOptions": "1-2 sentences about cooking style, ingredients, dietary accommodations",
  "priceRange": "$|$$|$$$|$$$$",
  "atmosphere": "1-2 sentences about ambiance and dining experience", 
  "mustTryDishes": ["dish1", "dish2", "dish3"],
  "publicRating": null,
  "locations": [
    {
      "locationName": "Area/neighborhood name",
      "fullAddress": "Complete address with postcode if available",
      "phone": "Location-specific phone if different from main",
      "openingHours": "Location hours if found"
    }
  ]
}
`;
```

## Current Features

### ✅ Implemented Features

**Content Extraction:**
- Multi-proxy web scraping with automatic fallbacks
- Intelligent content parsing (titles, meta tags, schema markup)
- International address recognition (UK, French, US postal codes)
- Phone number and opening hours extraction
- Location-specific pattern recognition

**AI Analysis:**
- Business type detection with expanded definitions
- Comprehensive restaurant data extraction
- Multi-location support with individual address details
- Cuisine standardization and price range detection
- Must-try dishes identification from content

**Multi-Location Support:**
- Detects and extracts multiple restaurant locations
- Individual address, phone, and hours per location
- Smart fallback for complex multi-location sites
- Human-readable address summaries for UI display

**Error Handling:**
- Claude API rate limit detection and user-friendly messages
- Structured error responses with retry suggestions
- Content size limiting to avoid token acceleration limits
- Graceful handling of non-restaurant websites

**Caching System:**
- URL-based extraction caching (24-hour expiration)
- Cache statistics and management in admin panel
- Prevents duplicate API calls during development
- Manual cache clearing functionality

**Admin Integration:**
- Dynamic form population from extraction results
- Editable location management (add/remove/edit addresses)
- Real-time extraction progress indicators
- Always-editable form fields for user validation

### Current Extraction Results Examples

**Single Location Restaurant (Peckham Cellars):**
```json
{
  "name": "Peckham Cellars",
  "addressSummary": "Peckham, London",
  "cuisine": "Wine Bar",
  "locations": [{
    "locationName": "Peckham",
    "fullAddress": "125 Queens Road, London SE15 2ND",
    "phone": "020 4551 9444",
    "openingHours": "Wed-Sat 5:30-11:00PM"
  }]
}
```

**Multi-Location Restaurant (Dishoom):**
```json
{
  "name": "Dishoom",
  "addressSummary": "Multiple locations in London & Glasgow", 
  "cuisine": "Indian",
  "locations": [
    {
      "locationName": "Kensington",
      "fullAddress": "4 Derry Street, London",
      "phone": "020 7420 9325",
      "openingHours": "Mon-Fri 8:00-23:00, Sat-Sun 9:00-23:00"
    },
    {
      "locationName": "Glasgow",
      "fullAddress": "6–11 Nelson Mandela Place, Glasgow",
      "phone": "0141 611 4411",
      "openingHours": "Mon-Thu 8:00-23:00"
    }
  ]
}
```

**Complex Multi-Location Fallback (Hawksmoor):**
```json
{
  "name": "Hawksmoor",
  "addressSummary": "Multiple locations in London, Manchester, Liverpool & Edinburgh",
  "cuisine": "British",
  "priceRange": "$$$$",
  "locations": [{
    "locationName": "Multiple locations",
    "fullAddress": "See the website",
    "phone": null,
    "openingHours": null
  }]
}
```

## Technical Implementation Details

### Server Architecture (`server.cjs`)
```javascript
// Express server with CORS support
const app = express();
app.use(cors());
app.use(express.json());

// Main extraction endpoint
app.post('/api/extract-restaurant', async (req, res) => {
  // 1. Content fetching with proxy fallbacks
  // 2. Meaningful content extraction (limited to 8000 chars)
  // 3. Business type detection via Claude API
  // 4. Restaurant data extraction via Claude API
  // 5. Multi-location fallback logic
  // 6. Structured response with error handling
});
```

### Claude API Integration
```javascript
async function callClaudeApi(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  // Returns structured error object instead of throwing
  if (!response.ok) {
    return {
      isError: true,
      status: response.status,
      statusText: response.statusText,
      errorText: await response.text()
    };
  }
  
  const result = await response.json();
  return result.content[0].text;
}
```

### Frontend Integration (`AdminPanel.tsx`)
```typescript
// Dynamic location management
const handleLocationChange = (index: number, field: string, value: string) => {
  const updatedLocations = [...formData.locations];
  updatedLocations[index] = { ...updatedLocations[index], [field]: value };
  setFormData(prev => ({ ...prev, locations: updatedLocations }));
};

// Add/remove locations dynamically
const addLocation = () => {
  setFormData(prev => ({
    ...prev,
    locations: [...prev.locations, {
      locationName: '',
      fullAddress: '',
      phone: '',
      openingHours: ''
    }]
  }));
};
```

## Error Handling & User Experience

### Rate Limit Management
```javascript
// Structured rate limit error responses
if (businessResponse.isError && businessResponse.status === 429) {
  return res.status(429).json({
    success: false,
    error: 'Claude API rate limit reached. Please wait 2-3 minutes before trying again.',
    isRateLimited: true,
    retryAfter: 180 // 3 minutes
  });
}
```

### Multi-Location Fallback Logic
```javascript
// Intelligent fallback for complex multi-location restaurants
if (hasMultipleLocationIndicators && hasPoorLocationData) {
  restaurantData.locations = [{
    locationName: 'Multiple locations',
    fullAddress: 'See the website',
    phone: null,
    openingHours: null
  }];
}
```

### User Experience Features
- **Progress Indicators**: Step-by-step extraction progress
- **Always Editable**: All extracted data pre-populates editable form fields
- **Cache Management**: Admin panel shows cache statistics and clear functionality
- **Error Recovery**: Clear error messages with retry options
- **Manual Override**: Easy editing/correction of all extracted data

## Performance & Cost Optimization

### Current Performance Metrics
- **Extraction Time**: 30-60 seconds for comprehensive analysis
- **Content Limit**: 8,000 characters (~2,000 tokens) to avoid acceleration limits
- **Success Rate**: High accuracy for restaurant websites with schema markup
- **Cache Hit Rate**: 24-hour caching significantly reduces duplicate API calls

### Cost Management
- **Personal Usage**: Claude API account for personal use only
- **Smart Caching**: URL-based caching prevents duplicate extractions
- **Content Optimization**: Intelligent content truncation preserves quality while minimizing tokens
- **Rate Limit Handling**: Graceful degradation with user-friendly error messages

## Known Limitations & Workarounds

### Complex Multi-Location Sites
**Issue**: Some restaurant groups (like Hawksmoor) don't include specific addresses on homepages.
**Current Solution**: Intelligent fallback that sets address to "See the website" with clear user guidance.
**Future Enhancement**: Could implement sub-page crawling to find individual location pages.

### JavaScript-Heavy Websites
**Issue**: Some modern restaurant websites load content dynamically.
**Current Solution**: Multiple proxy services help capture more content than basic fetching.
**Alternative**: Users can manually enter data when extraction fails.

### Business Type Edge Cases
**Issue**: Wine bars, bistros, and similar establishments were initially misclassified.
**Solution**: ✅ **Fixed** - Expanded business type definitions to be more inclusive.

### Claude API Acceleration Limits
**Issue**: New accounts have gradual usage ramp-up limits.
**Solution**: ✅ **Fixed** - Content size limiting and intelligent error handling.

## Future Enhancement Opportunities

### Phase 2 Enhancements (Potential)
1. **Sub-page Crawling**: Follow location links for detailed multi-location data
2. **Social Media Integration**: Instagram/Facebook business page analysis
3. **Menu PDF Analysis**: Extract pricing and dishes from downloadable menus
4. **Review Synthesis**: Google/Yelp review summarization via Claude API

### Advanced Features (Future)
1. **Machine Learning**: Learn from user corrections to improve accuracy
2. **Real-Time Updates**: Monitor restaurant websites for changes
3. **Competitive Analysis**: Compare similar restaurants in area
4. **Multi-Language Support**: Handle non-English restaurant websites

## Success Metrics

### Current Performance
- **✅ Data Quality**: Rich, accurate extraction for properly structured restaurant websites
- **✅ User Experience**: Smooth workflow from URL input to populated, editable form
- **✅ Multi-Location Support**: Handles both single and multi-location restaurants elegantly
- **✅ Error Handling**: Clear, actionable error messages for failed extractions
- **✅ Cache Effectiveness**: Significant reduction in duplicate API calls
- **✅ International Support**: Handles UK, French, and US restaurant formats

### User Workflow Quality
- **✅ Review Process**: All extracted data presented in editable form fields
- **✅ Manual Override**: Easy editing/correction of all extracted information
- **✅ Progress Transparency**: Clear extraction steps with loading indicators
- **✅ Recovery Options**: Simple retry mechanism for failed extractions

## Conclusion

The current extraction system represents a fully functional, production-ready implementation that successfully transforms restaurant website URLs into comprehensive, editable restaurant data. 

**Key Achievements:**
- Claude API integration with intelligent business type detection
- Multi-location restaurant support with individual address management
- Robust error handling including rate limit management
- International format support for major markets
- Seamless admin panel integration with dynamic form management
- Effective caching system reducing API costs and improving performance

The system successfully handles the most common restaurant website types while providing graceful fallbacks for complex cases, making it a reliable tool for building a curated restaurant collection.