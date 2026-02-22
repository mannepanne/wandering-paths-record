# Troubleshooting Guide

Common issues and solutions for local development and deployment.

---

## Local Development Issues

### Port already in use

**Symptom:** Error starting dev server: `EADDRINUSE` or port conflict

**Solution:**
```bash
# Kill existing processes on port 8080 (frontend)
lsof -ti:8080 | xargs kill -9

# Kill existing processes on port 3001 (API server)
lsof -ti:3001 | xargs kill -9

# Or specify a different port
npm run dev -- --port 8081
```

### Vite 431 error on refresh

**Symptom:** HTTP 431 "Request Header Fields Too Large" when refreshing pages (especially `/restaurant/:id` routes)

**Cause:** Known Vite dev server issue caused by accumulated cookies/headers

**Solution:**
```bash
# Option 1: Clear localhost cookies in browser
# Chrome: DevTools → Application → Storage → Clear site data

# Option 2: Hard refresh
# Mac: Cmd+Shift+R
# Windows/Linux: Ctrl+Shift+R

# Option 3: Restart dev server
pkill -f vite && npm run dev
```

**Note:** This is NOT a production issue - only affects local development

**Related:** See `REFERENCE/technical-debt.md` → TD-003

### TypeScript errors

**Symptom:** Type errors in editor or build failures

**Solution:**
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# Clear TypeScript cache
rm -rf node_modules/.vite
```

### Dependency issues

**Symptom:** Strange errors after pulling changes or switching branches

**Solution:**
```bash
# Nuclear option: full reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Environment variables not working

**Symptom:** API calls fail with "API key not configured"

**Solution:**
```bash
# 1. Verify .env file exists in project root
ls -la .env

# 2. Check variable names (case-sensitive, must start with VITE_)
cat .env

# 3. Restart dev servers after adding new variables
pkill -f vite && pkill -f node && npm run dev

# 4. Verify variables are loaded
# In browser console:
console.log(import.meta.env.VITE_SUPABASE_URL)
```

### Local API server (server.cjs) not working

**Symptom:** AI extraction fails in local dev

**Solution:**
```bash
# Verify API server is running
lsof -i :3001

# Start if not running
npm run api

# Check for errors in terminal output
# Verify VITE_CLAUDE_API_KEY is set in .env
```

### CORS errors during development

**Symptom:** Network requests blocked by CORS policy

**Cause:** Frontend (port 8080) making requests to API server (port 3001)

**Solution:**
- Ensure `server.cjs` has `cors()` middleware enabled (already configured)
- Verify requests are going to `http://localhost:3001`
- Check browser console for actual endpoint being called

---

## Deployment Issues

### Authentication errors

**Symptom:** `wrangler deploy` fails with auth error

**Solution:**
```bash
# Re-authenticate with Cloudflare
wrangler login

# Verify you're logged in
wrangler whoami
```

### Build failures

**Symptom:** Deployment fails during build step

**Solution:**
```bash
# 1. Check TypeScript compilation locally
npx tsc --noEmit

# 2. Verify all dependencies in package.json
npm install

# 3. Check wrangler.toml configuration
cat wrangler.toml

# 4. Test production build locally
npm run build
```

### Missing secrets in production

**Symptom:** Production site works but features fail (extraction, geocoding, etc.)

**Cause:** Required secrets not set in Cloudflare

**Solution:**
```bash
# List current secrets
wrangler secret list

# Add missing secrets
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put CLAUDE_API_KEY
wrangler secret put GOOGLE_MAPS_API_KEY

# Redeploy after adding secrets
npx wrangler deploy
```

**See:** `REFERENCE/environment-setup.md` for complete list of required secrets

### Images not loading after upload

**Symptom:** Newly uploaded restaurant images return 404 or don't display

**Cause:** Images are proxied from GitHub, may take a few minutes to propagate

**Solution:**
- Wait 2-5 minutes for GitHub CDN propagation
- Verify image was committed to repo: Check GitHub at `public/images/restaurants/`
- Check proxy route in `src/worker.js` - should match GitHub repo path
- Verify `GITHUB_REPO` constant matches actual repo

**Debug:**
```javascript
// In src/worker.js, check:
const GITHUB_REPO = 'magnushultberg/wandering-paths-record';
// Should match: https://github.com/YOUR_USERNAME/YOUR_REPO
```

### Custom domain not working

**Symptom:** Site works on `*.workers.dev` but not on `restaurants.hultberg.org`

**Cause:** DNS routing or Workers route configuration issue

**Solution:**
```bash
# 1. Verify routes in wrangler.toml
cat wrangler.toml | grep -A 3 routes

# 2. Check Cloudflare dashboard
# Websites → hultberg.org → Workers Routes
# Should show: restaurants.hultberg.org/* → wandering-paths-record

# 3. Redeploy to force route binding
npx wrangler deploy

# 4. DNS propagation can take 24-48 hours
# Check DNS: dig restaurants.hultberg.org
```

---

## Database Issues

### Supabase connection errors

**Symptom:** Cannot fetch restaurants, auth fails

**Solution:**
```bash
# 1. Verify Supabase project is active
# Login to: https://supabase.com/dashboard/project/drtjfbvudzacixvqkzav

# 2. Check API keys
# Dashboard → Settings → API → Copy anon key
# Update in .env (local) and Cloudflare secrets (production)

# 3. Test connection
# Dashboard → API Docs → Auto-generated → Test in browser
```

### Row-Level Security (RLS) blocking writes

**Symptom:** Can read restaurants but cannot create/update/delete

**Cause:** RLS policies restrict write access to authorized admin

**Solution:**
- Verify logged-in user email matches `AUTHORIZED_ADMIN_EMAIL` in `wrangler.toml`
- Check RLS policies in Supabase Dashboard → Authentication → Policies
- For testing, can temporarily disable RLS (not recommended for production)

---

## AI Extraction Issues

### Claude API rate limit errors

**Symptom:** "Rate limit reached" error during restaurant extraction

**Cause:** Anthropic API rate limits (varies by plan)

**Solution:**
- Wait 2-3 minutes before retrying
- Reduce extraction frequency
- Consider upgrading Anthropic API plan for higher limits
- Check current usage: https://console.anthropic.com/settings/usage

### Extraction returns incomplete data

**Symptom:** Restaurant extracted but missing fields (address, phone, etc.)

**Cause:** Website structure not well-suited for extraction, or content behind JavaScript

**Solution:**
- Try extraction again (AI responses can vary)
- Check if website requires JavaScript rendering (proxies may not handle)
- Use manual entry for problematic restaurants
- For review sites (Timeout, Infatuation), extraction works better than direct restaurant sites

### Business type detection failing

**Symptom:** Restaurant rejected as "not a restaurant"

**Cause:** AI incorrectly classified the business type

**Solution:**
- Use trusted review site URLs instead (theinfatuation.com, timeout.com, etc.)
- These sites bypass business type detection
- Manually enter restaurant details as fallback

---

## Map and Geocoding Issues

### Map not displaying

**Symptom:** Blank map area or console errors

**Cause:** Missing Mapbox access token or invalid token

**Solution:**
```bash
# 1. Check token in .env
cat .env | grep MAPBOX

# 2. Verify token is valid
# Visit: https://account.mapbox.com/access-tokens/

# 3. Check browser console for Mapbox errors
# Common: "Unauthorized" = invalid token

# 4. Restart dev server after adding token
```

### Restaurant locations not geocoding

**Symptom:** Restaurants added but don't show on map (lat/lng missing)

**Cause:** Google Maps Geocoding API error or quota exceeded

**Solution:**
- Check Google Cloud Console → APIs → Geocoding API → Quotas
- Verify `GOOGLE_MAPS_API_KEY` is set correctly
- Check browser console for geocoding errors
- Manually add lat/lng coordinates if geocoding unavailable

---

## GitHub Actions / CI/CD Issues

### Deployment workflow failing

**Symptom:** GitHub Actions build/deploy fails

**Cause:** Missing secrets in GitHub repository

**Solution:**
- Go to: Repository → Settings → Secrets and variables → Actions
- Add required secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- Check workflow logs for specific error

**See:** `SPECIFICATIONS/GITHUB-ACTIONS-SETUP.md` for complete setup

### Asset reference sync failing

**Symptom:** Production site has MIME type errors for CSS/JS

**Cause:** Worker asset references not synced after build

**Solution:**
- Build script runs `scripts/update-worker-assets.js` automatically
- If manual sync needed:
```bash
npm run build
# Check dist/client for generated assets
# Verify src/worker.js has correct references
```

---

## Browser-Specific Issues

### Safari private mode issues

**Symptom:** Features not working in Safari private browsing

**Cause:** Safari blocks some localStorage/cookies in private mode

**Solution:**
- Use normal browsing mode for full functionality
- Supabase auth relies on localStorage for session management

### Mobile viewport issues

**Symptom:** Layout breaks on mobile devices

**Solution:**
- Check responsive design in browser DevTools (mobile view)
- Verify Tailwind breakpoints in affected components
- Test on actual device (simulator can differ)

---

## Quick Diagnostic Commands

```bash
# Check all processes
lsof -i :8080  # Vite dev server
lsof -i :3001  # API server

# Check environment
cat .env
echo $NODE_ENV

# Verify build output
ls -la dist/
ls -la dist/client/

# Check git status
git status
git log -1

# TypeScript check
npx tsc --noEmit

# Lint check
npm run lint
```

---

## Getting Further Help

If issues persist after trying these solutions:

1. **Check recent changes:** `git diff` - did something change recently?
2. **Search GitHub issues:** https://github.com/magnushultberg/wandering-paths-record/issues
3. **Check service status:**
   - Cloudflare: https://www.cloudflarestatus.com/
   - Supabase: https://status.supabase.com/
   - Anthropic: https://status.anthropic.com/
4. **Create detailed bug report:** Include error messages, browser console output, steps to reproduce

---

**Related Documentation:**
- `REFERENCE/environment-setup.md` - Configuration and secrets
- `REFERENCE/DEVELOPMENT.md` - Development workflow
- `REFERENCE/technical-debt.md` - Known limitations
