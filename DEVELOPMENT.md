# Local Development Setup

## Claude AI Restaurant Extraction System

This guide covers setting up the enhanced restaurant extraction system locally before deploying to Netlify.

## Prerequisites

- Node.js 16+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- Anthropic Claude API key
- Supabase project (optional, for full functionality)

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables in `.env`:**
   ```env
   # Required for Claude AI extraction
   VITE_CLAUDE_API_KEY=your_anthropic_api_key_here
   
   # Supabase (if using database functionality)
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Admin authentication
   VITE_AUTHORIZED_ADMIN_EMAIL=your_admin_email@example.com
   ```

3. **Get your Claude API key:**
   - Sign up at [console.anthropic.com](https://console.anthropic.com)
   - Create a new API key in the dashboard
   - Add it to your `.env` file as `VITE_CLAUDE_API_KEY`

## Installation & Running

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open the application:**
   - Navigate to `http://localhost:5173`
   - Access admin panel with the email configured in your `.env`

## How the Claude Integration Works

### Local Development Architecture

```
Frontend (React + Vite)
    ↓
src/hooks/useRestaurantExtraction.ts
    ↓  
src/api/extract-restaurant.ts (local handler)
    ↓
src/services/claudeExtractor.ts
    ↓
Claude API (Anthropic)
```

### Key Components

- **`claudeExtractor.ts`**: Core Claude API integration with business detection
- **`extract-restaurant.ts`**: API handler that works locally and on Netlify
- **`useRestaurantExtraction.ts`**: React hook for UI state management
- **`AdminPanel.tsx`**: Enhanced UI with progress tracking and form integration

### Features Available Locally

✅ **Intelligent Business Detection**: Claude identifies if URL is a restaurant
✅ **Advanced Content Analysis**: Multi-page crawling and smart extraction
✅ **Progress Indicators**: Real-time feedback during 30-60 second extraction
✅ **Smart Caching**: Prevents duplicate API calls for same URL (24h cache)
✅ **Error Handling**: Clear messages for failures and non-restaurant sites
✅ **Form Integration**: Always-editable form for review and corrections

## Testing the Extraction System

1. **Navigate to Admin Panel**: Sign in with your configured email
2. **Try Restaurant URLs**: 
   - `https://noma.dk` (fine dining)
   - `https://dishoom.com` (chain restaurant)
   - `https://hawksmoor.com` (steakhouse)
3. **Test Non-Restaurant URLs**:
   - `https://tate.org.uk` (art gallery)
   - `https://apple.com` (tech company)
4. **Monitor Performance**: Check browser console for extraction logs

## Troubleshooting

### Common Issues

**❌ "Claude API key not configured"**
- Ensure `VITE_CLAUDE_API_KEY` is set in `.env`
- Restart dev server after adding environment variables

**❌ "Extraction failed"**  
- Check browser console for specific error messages
- Verify API key is valid and has credits
- Check network connectivity

**❌ "CORS errors"**
- This is expected in local development
- Content fetching uses proxy services to bypass CORS

### Debug Mode

Enable detailed extraction logging:
```javascript
// In browser console
localStorage.setItem('debug-extraction', 'true');
```

## Deployment Preparation

The code is structured for easy deployment to Netlify:

1. **File Structure Ready for Netlify Functions:**
   - `src/api/extract-restaurant.ts` exports `handler` for Netlify
   - Environment variables follow Netlify naming conventions

2. **When Ready to Deploy:**
   - Move `src/api/extract-restaurant.ts` to `netlify/functions/`
   - Update environment variables (remove `VITE_` prefix for server-side vars)
   - Configure Netlify build settings

3. **Environment Variable Changes for Production:**
   ```env
   # Production (Netlify)
   CLAUDE_API_KEY=your_key  # No VITE_ prefix
   
   # Still needed with VITE_ prefix for frontend
   VITE_AUTHORIZED_ADMIN_EMAIL=your@email.com
   ```

## Cost Monitoring

The extraction system is optimized for personal use:

- **Caching**: 24-hour URL-based cache prevents duplicate extractions
- **Content Optimization**: Smart truncation keeps within token limits
- **Efficient Prompts**: Structured prompts minimize API usage

Expected cost per extraction: **$0.01-0.05** depending on content size.

## Next Steps

1. **Test Extraction Quality**: Try various restaurant websites
2. **Refine Prompts**: Adjust Claude prompts in `claudeExtractor.ts` based on results  
3. **Add Google Maps**: Enhance with business data validation
4. **Deploy to Netlify**: When ready for production use

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify all environment variables are configured
3. Test with simple restaurant websites first
4. Review extraction logs for debugging information