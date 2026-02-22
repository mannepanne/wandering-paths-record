# Web Analytics

**Status:** ✅ Implemented - Cloudflare Web Analytics active

**Related:** See `REFERENCE/technical-debt.md` → TD-005 (now resolved)

---

## Cloudflare Web Analytics

**Implementation:** Production (restaurants.hultberg.org)
**Token:** `f71c3c28b82c4c6991ec3d41b7f1496f`

### Features

- **Privacy-first, cookie-free** analytics
- No invasive tracking or consent banners needed
- Pageviews, referrers, visitor data without cookies
- Fully GDPR compliant by design
- Integrated with Cloudflare dashboard
- Lightweight (~5KB beacon)

### Current Implementation

**Script Location:** `index.html` in `<head>` section

```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "f71c3c28b82c4c6991ec3d41b7f1496f"}'></script>
<!-- End Cloudflare Web Analytics -->
```

**Loaded on:** All pages (single-page app, script loaded once)

### Dashboard Access

**Location:** Cloudflare Dashboard → Analytics & Logs → Web Analytics
**Site:** restaurants.hultberg.org

**Login:** https://dash.cloudflare.com/

### Available Metrics

- **Visitors:** Unique visitors over time
- **Page Views:** Most viewed pages/routes
- **Referrers:** Traffic sources (direct, social, search, etc.)
- **Countries:** Geographic distribution of visitors
- **Browsers:** Browser usage statistics
- **Operating Systems:** OS distribution
- **Device Types:** Desktop vs mobile vs tablet
- **Core Web Vitals:** Performance metrics (LCP, FID, CLS)

---

## Why Cloudflare Only?

**Decision:** Skip Google Analytics 4 entirely, use only Cloudflare Web Analytics

**Rationale:**
1. **Privacy**: No cookies, no consent banners, fully GDPR compliant
2. **Performance**: Lightweight (~5KB vs GA4's ~20-30KB)
3. **Stack Alignment**: Already using Cloudflare Workers for hosting
4. **Simplicity**: One analytics platform, one dashboard
5. **Sufficient Data**: Provides all needed insights for this use case

**What We Get:**
- Visitor counts and trends
- Popular pages/routes
- Traffic sources (where visitors come from)
- Geographic distribution
- Performance metrics

**What We Skip:**
- Detailed user journey tracking (don't need)
- Custom event funnels (overkill for this project)
- Session recordings (privacy concern)
- Complex conversion tracking (not e-commerce)

---

## Monitoring Analytics

### Initial Setup Verification

After deployment, verify analytics are working:

1. **Visit the site:** https://restaurants.hultberg.org
2. **Check Network tab:** Look for `beacon.min.js` loaded successfully
3. **Wait 24-48 hours:** Cloudflare analytics have a delay
4. **Check dashboard:** Cloudflare → Analytics & Logs → Web Analytics

### Regular Checks

**Suggested frequency:** Monthly review

**What to monitor:**
- **Traffic trends:** Growing, stable, or declining?
- **Popular pages:** Which restaurant details pages get most views?
- **Referrers:** Where are visitors discovering the site?
- **Geographic data:** Where are visitors located?
- **Performance:** Are Core Web Vitals healthy?

### Key Questions Analytics Will Answer

1. **How many people use the site?** (Unique visitors)
2. **What are they looking at?** (Page views by route)
3. **Where do they come from?** (Referrers - social, direct, search)
4. **Where are they located?** (Geographic distribution)
5. **How fast is the site?** (Core Web Vitals)

---

## Privacy & Compliance

### GDPR Compliance

✅ **Fully compliant** - Cloudflare Web Analytics is designed for privacy:
- No cookies set
- No personal data collected
- No consent banner required
- No tracking across sites
- Aggregated data only

### What Data Is Collected?

**Collected (anonymously):**
- Page URL visited
- Referrer URL
- Browser type and version
- Operating system
- Device type (desktop/mobile/tablet)
- Country (based on IP, but IP not stored)

**NOT collected:**
- Individual user identification
- IP addresses (used for geolocation, then discarded)
- Personal information
- Cross-site tracking
- User-specific behavior

### Privacy Policy

**Current status:** No privacy policy yet (should add)

**Recommended addition:**

> **Analytics**
>
> This site uses Cloudflare Web Analytics to understand visitor traffic. This is a privacy-first analytics service that:
> - Does not use cookies
> - Does not collect personal data
> - Does not track you across websites
> - Only collects anonymous, aggregated data
>
> Learn more: [Cloudflare Web Analytics Privacy](https://www.cloudflare.com/web-analytics/)

**Where to add:** Footer link or About page

---

## Performance Impact

### Measurement

**Script size:** ~5KB (minified, compressed)
**Load time:** < 50ms (loaded with `defer`)
**Impact:** Negligible (loaded after page interactive)

### Optimization

**Already optimized:**
- Script loaded with `defer` attribute (non-blocking)
- Cloudflare CDN delivers script from edge (fast)
- Minimal JavaScript execution

**No further optimization needed.**

---

## Troubleshooting

### Analytics not showing data

**Symptom:** Dashboard shows zero visitors despite site traffic

**Causes & solutions:**
1. **24-48 hour delay:** Analytics data isn't real-time, wait a day
2. **Script blocked:** Check browser console for errors
3. **Ad blocker:** Some ad blockers block analytics scripts
4. **Incorrect token:** Verify token matches dashboard

**Verification steps:**
```bash
# Check script loads
curl -I https://static.cloudflareinsights.com/beacon.min.js
# Should return 200 OK

# Check token in HTML
curl https://restaurants.hultberg.org | grep "data-cf-beacon"
# Should show: {"token": "f71c3c28b82c4c6991ec3d41b7f1496f"}
```

### Script not loading in development

**Expected behavior:** Script loads in both dev and production

**If blocked locally:**
- Some browser extensions block analytics scripts
- Disable extensions or whitelist localhost
- Check browser DevTools → Network tab for blocked requests

### Performance concerns

**Symptom:** Worried about script impacting performance

**Reality check:**
- Cloudflare beacon is ~5KB (very lightweight)
- Loads with `defer` (doesn't block page rendering)
- Cloudflare CDN ensures fast delivery
- Negligible impact on Lighthouse score

**Verify:** Run Lighthouse audit before/after implementation

---

## Future Enhancements (Optional)

### Custom Event Tracking

**Not currently implemented** (and probably not needed)

If you ever want to track specific user actions, Cloudflare Web Analytics doesn't support custom events. For that, you'd need:
- Google Analytics 4 (adds privacy concerns)
- Plausible Analytics (paid, privacy-friendly)
- Simple Analytics (paid, privacy-friendly)

**Recommendation:** Current setup is sufficient for this project's needs.

### Enhanced Privacy Policy

**Current:** No privacy policy page

**Future:** Consider adding a `/privacy` page explaining:
- What data is collected
- How it's used
- User rights under GDPR
- Link to Cloudflare's privacy practices

**Not urgent** given the minimal data collection.

---

## Implementation Checklist

- [x] Get Cloudflare Web Analytics token
- [x] Add script to `index.html`
- [x] Deploy to production
- [ ] Verify data collection (24-48hrs after deploy)
- [ ] Set calendar reminder for monthly analytics review
- [ ] Consider adding privacy policy page (optional)

---

**Related Documentation:**
- `REFERENCE/technical-debt.md` → TD-005 (analytics implementation)
- Cloudflare Dashboard: https://dash.cloudflare.com/
- Cloudflare Web Analytics docs: https://developers.cloudflare.com/analytics/web-analytics/
