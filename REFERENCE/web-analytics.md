# Web Analytics

**Status:** Not yet implemented - planned for future phase

**Related:** See `REFERENCE/technical-debt.md` → TD-005

---

The site is planned to use **two analytics solutions** for traffic monitoring, matching the setup from hultberg.org.

---

## Google Analytics 4 (GA4)

**Measurement ID:** To be configured

### Features
- Tracks pageviews, user journeys, and referral sources
- Standard web analytics (users, sessions, bounce rate)
- Custom event tracking for restaurant interactions

### Implementation Plan

**Snippet to add to all pages:**
```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**Implementation Locations:**
- `index.html` - Main entry point for static page load
- Worker-rendered pages (if any server-side HTML)

**Custom Events to Track:**
- Restaurant card clicks
- Map marker interactions
- Filter usage (cuisine, price, status)
- AI extraction attempts
- Admin login events

---

## Cloudflare Web Analytics

**Token:** To be configured

### Features
- **Privacy-first, cookie-free** alternative to GA4
- No invasive tracking or consent banners needed
- Pageviews, referrers, visitor data without cookies
- Integrated with Cloudflare dashboard

### Implementation Plan

**Snippet to add to all pages:**
```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
```

**Implementation Locations:**
- `index.html` - Main entry point
- Worker-rendered pages (if any)

**Dashboard Access:**
- Cloudflare Dashboard → Analytics & Logs → Web Analytics
- Project: restaurants.hultberg.org

---

## Implementation Strategy

### Phase 1: Setup Both Analytics

1. **Get GA4 Measurement ID:**
   - Create property at https://analytics.google.com/
   - Get measurement ID (format: G-XXXXXXXXXX)

2. **Get Cloudflare Web Analytics Token:**
   - Cloudflare Dashboard → Analytics & Logs → Web Analytics
   - Add site: restaurants.hultberg.org
   - Copy beacon token

3. **Add Scripts to index.html:**
   - Insert both snippets in `<head>` section
   - Test on localhost (check Network tab for beacons)

4. **Deploy and Verify:**
   - Deploy to production
   - Verify both analytics are receiving data (usually 24-48hr delay)

### Phase 2: Evaluate and Consolidate (3-6 months later)

- Review both platforms for insights quality
- Compare data accuracy and usefulness
- **Consider consolidating to Cloudflare only** to reduce script overhead
- Decision criteria:
  - Which provides better insights for this use case?
  - Is GA4's extra detail worth the privacy/performance trade-off?
  - Does Cloudflare analytics cover our needs?

---

## Custom Event Tracking (Optional - Future Enhancement)

### GA4 Custom Events

Track specific user interactions:

```javascript
// Restaurant card click
gtag('event', 'restaurant_view', {
  restaurant_name: 'Dishoom',
  cuisine: 'Indian',
  status: 'to-visit'
});

// Filter applied
gtag('event', 'filter_applied', {
  filter_type: 'cuisine',
  filter_value: 'Italian'
});

// AI extraction started
gtag('event', 'ai_extraction', {
  source: 'url_input',
  success: true
});

// Map interaction
gtag('event', 'map_marker_click', {
  restaurant_name: 'Dishoom',
  location: 'Shoreditch'
});
```

### Implementation Locations

- `src/components/PlaceCard.tsx` - Card click events
- `src/components/FilterBar.tsx` - Filter change events
- `src/components/AdminPanel.tsx` - AI extraction events
- `src/components/InteractiveMap.tsx` - Map interaction events

---

## Privacy Considerations

### GDPR Compliance

**Google Analytics 4:**
- May require cookie consent banner (depending on interpretation)
- Consider IP anonymization:
  ```javascript
  gtag('config', 'G-XXXXXXXXXX', {
    'anonymize_ip': true
  });
  ```

**Cloudflare Web Analytics:**
- No cookies, no consent banner needed
- Fully GDPR compliant by design
- No personal data collected

### Privacy Policy

Update privacy policy to disclose analytics usage:
- Which services are used
- What data is collected
- How users can opt out
- Data retention policies

---

## Analytics Dashboards

### GA4 Useful Reports

- **Realtime:** Live visitor tracking
- **Acquisition:** How users find the site (referrals, direct, search)
- **Engagement:** Pageviews, time on site, popular restaurants
- **Custom reports:** Build restaurant-specific insights

### Cloudflare Web Analytics Useful Metrics

- **Visitors:** Unique visitors over time
- **Page Views:** Most viewed pages
- **Referrers:** Traffic sources
- **Countries:** Geographic distribution

---

## Performance Impact

### Script Load Times

- **GA4:** ~20-30KB, loads asynchronously
- **Cloudflare:** ~5-10KB, lightweight beacon

### Recommendations

- Load both scripts `async` or `defer`
- Consider loading only on production (exclude localhost)
- Monitor Lighthouse performance score after adding

```javascript
// Conditional loading (production only)
if (import.meta.env.PROD) {
  // Load analytics scripts
}
```

---

## Implementation Checklist

- [ ] Create GA4 property and get Measurement ID
- [ ] Get Cloudflare Web Analytics token
- [ ] Add both scripts to `index.html`
- [ ] Test locally (check Network tab)
- [ ] Deploy to production
- [ ] Verify data collection (24-48hrs)
- [ ] Add custom event tracking (optional)
- [ ] Update privacy policy
- [ ] Set calendar reminder for 3-6 month evaluation

---

**Next Steps:**
1. Decide if/when to implement analytics
2. Follow setup guide above when ready
3. Evaluate after 3-6 months and consider consolidation

**Related Documentation:**
- `REFERENCE/technical-debt.md` → TD-005 (tracks analytics as future work)
