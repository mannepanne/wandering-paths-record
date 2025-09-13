# Phase 2: Public Review Enrichment Setup Guide

This guide will help you set up Phase 2 features for Google Maps review enrichment in your production environment.

## 🗄️ 1. Database Migration (REQUIRED)

### Apply Schema Changes to Supabase

1. **Login to your Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Copy and paste the contents of `migrations/001_add_public_review_fields.sql`
   - Execute the script
   - Verify the new columns were added to the `restaurants` table

3. **Verify Migration Success**
   - Check that these new columns exist:
     - `public_rating_count` (INTEGER)
     - `public_review_summary` (TEXT)
     - `public_review_summary_updated_at` (TIMESTAMPTZ)
     - `public_review_latest_created_at` (TIMESTAMPTZ)

## 🔑 2. Google Maps API Setup (REQUIRED)

### Create Google Cloud Project and API Key

1. **Google Cloud Console Setup**
   ```
   1. Go to console.cloud.google.com
   2. Create a new project or select existing
   3. Enable the following APIs:
      - Google Places API
      - Google Maps JavaScript API (if not already enabled)
   ```

2. **Create API Key**
   ```
   1. Go to APIs & Credentials → Credentials
   2. Click "Create Credentials" → "API Key"
   3. Restrict the key to the Google Places API for security
   4. Add domain restrictions (optional but recommended)
   ```

3. **Set Usage Quotas (Cost Control)**
   ```
   1. Go to APIs & Services → Quotas
   2. Find "Places API - Place Details"
   3. Set daily limit: 1000 requests/day (recommended starting point)
   4. Monitor usage closely in first few weeks
   ```

## 🔧 3. Environment Configuration

### Development Environment

Add to your `.env` file:
```bash
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
MCP_GOOGLE_MAPS_PORT=3002
```

### Production Environment (Cloudflare Workers)

Add to your Cloudflare Workers secrets:
```bash
wrangler secret put GOOGLE_MAPS_API_KEY
# Enter your Google Maps API key when prompted
```

## 🧪 4. Testing the Setup

### Verify Database Schema
```sql
-- Run this in Supabase SQL Editor to verify columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'restaurants'
  AND column_name IN (
    'public_rating_count',
    'public_review_summary',
    'public_review_summary_updated_at',
    'public_review_latest_created_at'
  );
```

### Test API Key
Visit this URL in your browser (replace YOUR_API_KEY):
```
https://maps.googleapis.com/maps/api/place/textsearch/json?query=Dishoom+London+restaurant&key=YOUR_API_KEY
```

You should see JSON response with restaurant results.

## 📊 5. Admin Panel Status

Once setup is complete, the Admin Panel will show:
- ✅ **Phase 2 Review Enrichment** section becomes active
- Real statistics instead of "--" placeholders
- Functional "Start Review Enrichment" button
- Progress tracking for batch operations

## 💰 6. Cost Management

### Expected Costs
- **Google Places API**: ~$0.017 per restaurant lookup
- **100 restaurants**: ~$1.70 per full enrichment run
- **Claude API**: ~$0.10-0.25 per batch for review summarization

### Cost Controls
- Daily API quotas set in Google Cloud Console
- Manual triggering prevents runaway costs
- 24-hour caching prevents duplicate API calls
- Batch processing with delays respects rate limits

## 🚀 7. Deployment Process

### Deploy to Production
```bash
# 1. Commit all changes
git add .
git commit -m "Add Phase 2 review enrichment infrastructure"

# 2. Deploy to Cloudflare Workers
npx wrangler deploy
```

### Verify Production Deployment
1. Check that environment variables are set in Cloudflare
2. Visit your production admin panel
3. Verify the Review Enrichment section appears
4. Test with a small batch of restaurants first

## 🔍 8. Troubleshooting

### Common Issues

**"Setup Required" message persists:**
- Verify database migration was applied successfully
- Check that GOOGLE_MAPS_API_KEY environment variable is set
- Confirm Google Places API is enabled in Google Cloud

**API Key errors:**
- Ensure the API key has Google Places API enabled
- Check that domain restrictions (if set) include your domain
- Verify daily quotas haven't been exceeded

**Database errors:**
- Run the verification SQL query to ensure columns exist
- Check Supabase logs for any constraint violations
- Verify the migration script ran without errors

## 📈 9. Next Steps

After successful setup:
1. Start with a small test batch (5-10 restaurants)
2. Monitor API usage and costs in Google Cloud Console
3. Review AI-generated summaries for quality
4. Adjust batch sizes based on performance
5. Consider scheduling periodic updates for popular restaurants

## 🛠️ 10. Development Notes

The Phase 2 implementation includes:
- ✅ Database schema updates
- ✅ TypeScript interfaces updated
- ✅ Review enrichment service created
- ✅ Admin panel UI prepared
- ✅ Google Maps API integration
- ✅ Claude AI review summarization
- ✅ Cost management and rate limiting
- ✅ Error handling and progress tracking

**Status**: Ready for production deployment after setup completion.