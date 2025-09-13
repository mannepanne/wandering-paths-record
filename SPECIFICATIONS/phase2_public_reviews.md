# Phase 2: Public Reviews & Ratings Enrichment System

## Overview

This phase implements an automated review enrichment system that fetches Google Maps reviews and ratings for restaurants, processes them through Claude AI for summarization, and saves the enriched data to enhance restaurant profiles with public opinion insights.

## 🎯 Objectives

- **Fetch Public Data**: Retrieve Google Maps reviews and ratings using MCP Google Maps server
- **AI Summarization**: Process reviews through Claude to generate concise summaries and extract dish mentions
- **Database Enhancement**: Store ratings, review summaries, and popular dishes in restaurant records
- **Admin Interface**: Provide batch processing controls similar to the existing geocoding system
- **Cost Management**: Implement efficient caching and batch processing to minimize API costs

---

## 📋 Technical Requirements

### Prerequisites
- Google Cloud Platform account with Maps API enabled
- Google Places API access (for reviews and ratings)
- MCP Google Maps server installation
- Claude API integration (existing)

### Key Components
1. **MCP Google Maps Server**: External review data fetching
2. **Claude API Integration**: Review summarization and dish extraction
3. **Database Schema Updates**: New fields for review data
4. **Admin Panel Enhancement**: Batch processing interface
5. **Background Processing**: Efficient batch operations with progress tracking

---

## 🗄️ Database Schema Changes

### Required SQL Updates

```sql
-- Add new fields to restaurants table for public review data
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS public_rating_count INTEGER,
ADD COLUMN IF NOT EXISTS public_review_summary TEXT,
ADD COLUMN IF NOT EXISTS public_review_summary_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS public_review_latest_created_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_public_rating_count ON restaurants(public_rating_count);
CREATE INDEX IF NOT EXISTS idx_restaurants_review_summary_updated ON restaurants(public_review_summary_updated_at);

-- Add comments for documentation
COMMENT ON COLUMN restaurants.public_rating_count IS 'Number of Google Maps reviews (e.g. 78 reviews)';
COMMENT ON COLUMN restaurants.public_review_summary IS 'AI-generated summary of Google Maps reviews';
COMMENT ON COLUMN restaurants.public_review_summary_updated_at IS 'When the review summary was last generated';
COMMENT ON COLUMN restaurants.public_review_latest_created_at IS 'Date of the most recent Google Maps review';
```

### Database Field Usage
- **`public_rating`** (existing): Google Maps rating value (e.g., 4.7)
- **`public_rating_count`** (new): Number of reviews (e.g., 78)
- **`public_review_summary`** (new): AI-generated review summary paragraph
- **`public_review_summary_updated_at`** (new): When summary was generated
- **`public_review_latest_created_at`** (new): Date of most recent review
- **`must_try_dishes`** (existing): Enhanced with AI-extracted popular dishes

---

## ⚙️ Configuration Requirements

### 1. Google Cloud Platform Setup

**Required Steps:**
1. **Create Google Cloud Project** (or use existing)
2. **Enable APIs**:
   - Google Places API (New)
   - Google Maps JavaScript API (existing - for Mapbox integration)
3. **Generate API Key**:
   - Create new API key or use existing
   - Restrict to Google Places API
   - Add domain restrictions for security
4. **Set Usage Quotas** (cost management):
   - Places API: Recommended limit 1000 requests/day initially
   - Reviews fetching: Monitor costs closely

### 2. MCP Google Maps Server Installation

```bash
# Install MCP Google Maps server globally
npm install -g @cablate/mcp-google-map

# Alternative: Install as project dependency
npm install @cablate/mcp-google-map --save
```

### 3. Environment Variables

**Add to `.env` file:**
```bash
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
MCP_GOOGLE_MAPS_PORT=3002  # Port for MCP server (avoid conflicts)
```

**Add to Cloudflare Workers secrets (production):**
```bash
# Add Google Maps API key to Workers secrets
wrangler secret put GOOGLE_MAPS_API_KEY
```

### 4. MCP Server Configuration

**Create `mcp-config.json`:**
```json
{
  "google_maps": {
    "api_key": "${GOOGLE_MAPS_API_KEY}",
    "port": 3002,
    "rate_limit": {
      "requests_per_minute": 60,
      "requests_per_day": 1000
    },
    "cache": {
      "enabled": true,
      "ttl_hours": 24
    }
  }
}
```

---

## 📐 Implementation Architecture

### Data Flow
1. **Admin Trigger** → Batch review enrichment initiated
2. **Restaurant Query** → Fetch restaurants needing review data
3. **Google Maps Search** → Use MCP server to find restaurant and fetch reviews
4. **Review Processing** → Send reviews to Claude API for summarization
5. **Data Extraction** → Extract rating, count, summary, and dish mentions
6. **Database Update** → Save enriched data to restaurant record
7. **Progress Tracking** → Update admin panel with completion status

### Component Integration

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin Panel   │    │  Review Service  │    │ MCP Maps Server │
│                 │───▶│                  │───▶│                 │
│ Batch Controls  │    │ Restaurant Query │    │ Google Places   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Claude API     │    │   Google Maps   │
                       │                  │    │                 │
                       │ Review Summary   │    │ Reviews & Ratings│
                       └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Supabase      │
                       │                  │
                       │ Restaurant Data  │
                       └──────────────────┘
```

---

## 🔧 Implementation Steps

### Step 1: Database Schema Setup
- [ ] **SQL Migration**: Run database schema updates on Supabase
- [ ] **Test Fields**: Verify new columns are created correctly
- [ ] **Update TypeScript**: Add new fields to `Restaurant` interface in `types/place.ts`

### Step 2: MCP Google Maps Integration
- [ ] **Install MCP Server**: Add as project dependency
- [ ] **API Key Setup**: Configure Google Maps API key in environment
- [ ] **Test Connection**: Verify MCP server can fetch restaurant data
- [ ] **Search Logic**: Implement restaurant matching (name + address + coordinates)

### Step 3: Review Data Service
- [ ] **Create Service**: New `reviewEnrichmentService.ts` in `src/services/`
- [ ] **Restaurant Search**: Match restaurants to Google Places entries
- [ ] **Review Fetching**: Retrieve up to 15 most recent reviews
- [ ] **Data Processing**: Extract rating, count, review text, and dates

### Step 4: Claude Integration for Review Summarization
- [ ] **Summary Prompt**: Design Claude prompt for review analysis
- [ ] **Dish Extraction**: Identify most mentioned dishes (max 3)
- [ ] **Sentiment Analysis**: Generate balanced summary of positive/negative opinions
- [ ] **API Integration**: Use existing Claude service with new endpoints

### Step 5: Admin Panel Enhancement
- [ ] **UI Components**: Add review enrichment section to Admin Panel
- [ ] **Batch Controls**: Progress tracking, force regenerate toggle
- [ ] **Statistics Display**: Show enrichment status (X of Y restaurants processed)
- [ ] **Error Handling**: Display failed enrichments with retry options

### Step 6: Database Integration
- [ ] **Save Operations**: Update restaurant records with review data
- [ ] **Must-Try Dishes**: Append AI-extracted dishes to existing `must_try_dishes`
- [ ] **Timestamp Tracking**: Record when summaries were generated and latest review dates
- [ ] **Deduplication**: Avoid duplicate dishes in must_try_dishes array

### Step 7: Cost Management & Performance
- [ ] **Rate Limiting**: Implement delays between API calls
- [ ] **Caching Strategy**: 24-hour cache for Google Places data
- [ ] **Batch Size**: Process restaurants in small batches (5-10 at a time)
- [ ] **Progress Persistence**: Save progress to resume interrupted operations

### Step 8: Error Handling & Resilience
- [ ] **API Failures**: Graceful handling of Google Maps API errors
- [ ] **Restaurant Matching**: Handle cases where restaurant isn't found in Google Places
- [ ] **Review Processing**: Continue batch if individual restaurant fails
- [ ] **Data Validation**: Ensure review data is valid before saving

---

## 🎨 User Interface Design

### Admin Panel Enhancement

**New Section: "Public Review Enrichment"**
```
┌─────────────────────────────────────────────┐
│ Public Review Enrichment                    │
├─────────────────────────────────────────────┤
│                                             │
│ Status: 12 of 25 restaurants enriched      │
│ Last Updated: 2 days ago                    │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ [Start Review Enrichment]               │ │
│ │ ☐ Force regenerate all summaries       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Recent Results:                             │
│ • Dishoom: ✅ 4.7 stars (1,245 reviews)   │
│ • Peckham Cellars: ✅ 4.5 stars (89 reviews) │
│ • Franco Manca: ❌ Not found in Google Maps│
│                                             │
└─────────────────────────────────────────────┘
```

### Progress Tracking
- **Real-time Updates**: Progress bar during batch processing
- **Individual Status**: Show success/failure for each restaurant
- **Error Details**: Expandable error messages for failed enrichments
- **Statistics**: Total reviews processed, API calls made, etc.

---

## 💰 Cost Management Strategy

### Google Places API Pricing (2024 estimates)
- **Place Details**: ~$0.017 per request
- **15 reviews per restaurant**: Minimal additional cost
- **100 restaurants**: ~$1.70 per full enrichment run

### Cost Optimization Techniques
1. **Smart Caching**: 24-hour cache prevents duplicate API calls
2. **Incremental Updates**: Only enrich restaurants without recent review data
3. **Batch Size Limits**: Process 5-10 restaurants per batch to control costs
4. **Manual Triggers**: Admin-initiated rather than automatic enrichment
5. **API Quotas**: Set daily/monthly limits in Google Cloud Console

### Claude API Cost Impact
- **Review summarization**: ~200-500 tokens per restaurant
- **100 restaurants**: ~$0.10-0.25 per batch (Claude 3.5 Sonnet pricing)

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] **Review Service**: Test Google Places integration
- [ ] **Claude Integration**: Test review summarization
- [ ] **Data Processing**: Test rating/dish extraction
- [ ] **Database Operations**: Test field updates

### Integration Tests
- [ ] **End-to-End Flow**: Complete enrichment process
- [ ] **Error Scenarios**: API failures, missing restaurants
- [ ] **Batch Processing**: Multiple restaurants with progress tracking
- [ ] **Admin Interface**: UI controls and progress display

### Manual Testing
- [ ] **Google Places Matching**: Verify restaurant identification accuracy
- [ ] **Review Quality**: Check Claude summary quality and dish extraction
- [ ] **UI Experience**: Admin panel usability and error handling
- [ ] **Performance**: Processing time for batches of different sizes

---

## 🚀 Deployment Considerations

### Development Environment
1. **MCP Server Setup**: Run locally during development
2. **API Key Management**: Use development Google Cloud project
3. **Database Testing**: Test schema changes on development database
4. **Cost Monitoring**: Track API usage during development

### Production Deployment
1. **MCP Server Hosting**: Deploy alongside main application or as separate service
2. **Environment Secrets**: Move API key to Cloudflare Workers secrets
3. **Database Migration**: Apply schema changes to production database
4. **Monitoring**: Set up alerts for API usage and costs
5. **Rollback Plan**: Prepare to disable feature if costs exceed budget

---

## 📈 Future Enhancements

### Phase 2.1: Advanced Features
- **Review Sentiment Analysis**: More detailed positive/negative breakdowns
- **Trending Dishes**: Track dish popularity over time
- **Review Freshness**: Auto-refresh reviews for popular restaurants
- **Multi-Source Reviews**: Integrate Yelp, TripAdvisor, etc.

### Phase 2.2: User Experience
- **Public Display**: Show review summaries on restaurant detail pages
- **Review Comparison**: Compare public vs personal ratings
- **Popular Dishes Highlighting**: Emphasize AI-extracted dishes in UI
- **Review Date Indicators**: Show how fresh the review data is

---

## 📊 Success Metrics

### Technical Metrics
- **Enrichment Coverage**: % of restaurants with review data
- **Processing Success Rate**: % of successful Google Places matches
- **API Cost Efficiency**: Cost per restaurant enriched
- **Processing Speed**: Time to enrich batch of restaurants

### User Value Metrics
- **Data Quality**: Accuracy of extracted dishes and summaries
- **Review Freshness**: Average age of most recent reviews
- **Admin Adoption**: Frequency of review enrichment usage
- **Error Recovery**: Success rate of retry operations

---

## ⚠️ Risk Assessment

### Technical Risks
- **Google Places API Changes**: Potential breaking changes or pricing updates
- **Restaurant Matching Accuracy**: Difficulty matching restaurants to Google Places
- **Rate Limiting**: Google API quotas or MCP server limitations
- **Claude API Costs**: Higher than expected costs for review processing

### Mitigation Strategies
- **API Monitoring**: Track usage and costs closely
- **Fallback Mechanisms**: Continue processing if individual restaurants fail
- **Cost Controls**: Implement hard limits and alerts
- **Manual Override**: Admin ability to skip problematic restaurants

---

## 🎯 Implementation Priority

### High Priority (Phase 2.0)
1. **Core Infrastructure**: Database schema, MCP integration
2. **Basic Admin Interface**: Batch processing controls
3. **Review Enrichment**: Google Places data fetching and Claude summarization
4. **Cost Management**: Rate limiting and usage monitoring

### Medium Priority (Phase 2.1)
1. **UI Polish**: Enhanced admin interface with detailed progress
2. **Error Handling**: Comprehensive retry and recovery mechanisms
3. **Performance Optimization**: Faster batch processing
4. **Public Display**: Show review data on restaurant pages

### Low Priority (Phase 2.2)
1. **Advanced Analytics**: Review trends and insights
2. **Multi-Source Integration**: Additional review platforms
3. **Automated Scheduling**: Periodic review updates
4. **A/B Testing**: Review summary variations

---

This Phase 2 plan provides a comprehensive roadmap for implementing public review enrichment while maintaining the cost-effectiveness and reliability of your existing system. The approach follows proven patterns from your geocoding system and integrates seamlessly with your current architecture.