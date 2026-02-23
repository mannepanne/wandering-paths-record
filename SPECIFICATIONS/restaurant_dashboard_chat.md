# Restaurant Discovery Dashboard - Product Discovery

**Status:** Discovery phase - validating problem space
**Date:** February 2026

**Note:** Visit History/Logging feature moved to separate document: `visit_logging.md`

---

## The Opportunity

**Planning Dashboard** → "What should I visit next?"
- Recent additions (that you've forgotten about)
- Recent visits (to avoid or revisit)
- Context-aware discovery
- Smart recommendations based on behavior

---

## Current Behavior Patterns

**Current reality:**
- You add restaurants at a decent rate (maybe 2-5/week?)
- You visit restaurants regularly (maybe 1-3/week?)
- List is growing faster than you can visit
- You're losing track of what you've added recently

**The pain you're experiencing:**
- **Discovery friction:** "I want to go out tonight, what did I add recently that I forgot about?"
- **Pattern blindness:** "I don't know which restaurants I keep going back to vs tried once"
- **Context mismatch:** "I'm in this neighborhood, but I can't easily see what's nearby that I haven't tried"

---

## Critical Questions (Answer These First)

**1. How do you currently decide where to eat?**
- Spontaneous ("I'm hungry now, what's nearby?")
- Planned ("I'll book for Saturday somewhere special")
- Exploratory ("I'm in this neighborhood, what's here?")

**2. What information would help you decide?**
- Recency of addition (recently added you might have forgotten)
- Recency of visit (avoid going back too soon)
- Distance from current location
- Time since you visited similar cuisine
- Special occasions (date night vs casual meal)

**3. Discovery scenarios - which matters most?**
- "Show me restaurants I added recently but haven't visited"
- "Show me places I haven't been to in 6+ months"
- "Show me highly-rated places I haven't tried yet"
- "Show me restaurants by neighborhood"

---

## Hypothesis: Is This Actually a Problem?

**Challenge the premise:** Can current filters solve 80% of this?

**Existing capabilities:**
- ✅ Filter by status (to-visit vs visited)
- ✅ Filter by cuisine, style, venue
- ✅ Sort by... (what are current sort options?)
- ✅ Search by location/name
- ✅ "Near Me" geolocation filtering

**What's missing:**
- ❌ Sort by "recently added"
- ❌ Sort by "recently visited"
- ❌ Visual indicators of recency
- ❌ "Forgotten gems" (added long ago, never visited)
- ❌ Visit frequency insights

**Quick win hypothesis:**
Maybe the dashboard is over-engineering. Perhaps just adding:
1. "Recently Added" sort option
2. "Recently Visited" sort option
3. Date badges on restaurant cards ("Added 2 weeks ago" / "Last visited 3 months ago")

Would solve 80% of the problem with 20% of the effort?

---

## Potential Dashboard Concepts (Not Designed Yet)

**Concept A: "Smart Sections" Homepage**
```
┌─ Home Dashboard ──────────────────┐
│ New Additions (Last 30 Days)      │
│ [3 restaurant cards]               │
│                                    │
│ Revisit Soon (Haven't been lately)│
│ [3 restaurant cards]               │
│                                    │
│ Near You (Within 2km)              │
│ [3 restaurant cards]               │
└────────────────────────────────────┘
```

**Concept B: "Enhanced Filtering"**
- Add date range filters
- Add "last visited" date display on cards
- Add "days since added" badge
- Improve sort options

**Concept C: "Daily Recommendation"**
- One restaurant per day algorithm
- Based on: time since added, cuisine variety, location, ratings
- Simple, focused, removes decision paralysis

---

## Open Questions for Magnus

**Before designing anything, answer:**

1. **How often are you actually paralyzed by "what should I visit next?"**
   - Daily? Weekly? Monthly?
   - Is this a real pain point or hypothetical?

2. **When you DO feel this friction, what specifically are you trying to figure out?**
   - "What did I add recently?"
   - "What's nearby that I haven't tried?"
   - "What's special enough for [occasion]?"

3. **Would better sorting/filtering on the existing list view solve this?**
   - Or do you need a separate "dashboard" view?

4. **What's your gut feeling: Quick wins (better sorting) or New dashboard page?**

---

## Next Steps

**Option 1: Validate Problem First**
- Add simple analytics to see which filters you use most
- Track your actual usage patterns for 2 weeks
- See if problem persists with better sort options

**Option 2: Quick Wins First**
- Add "Recently Added" sort
- Add "Recently Visited" sort
- Add date badges to cards
- See if this solves the problem before building dashboard

**Option 3: Build Dashboard MVP**
- Skip validation, go straight to building
- Risk: Solving a problem that doesn't exist

**Recommendation:** Option 2 (Quick Wins First)
- Low effort, high value
- Can build dashboard later if needed
- Follows Elon's process: validate the problem before solving it

---

## Success Metrics (If We Build This)

**User value:**
- Reduces decision time ("what should I visit next?")
- Helps rediscover forgotten additions
- Balances cuisine variety automatically

**Technical quality:**
- No performance degradation
- Clean, maintainable code
- Follows existing patterns

**Usage metrics:**
- How often is dashboard viewed?
- Do visit rates increase?
- Are recently-added restaurants visited more often?

---

## Related Features

**Synergies with Visit Logging:**
- Once we have visit dates, we can show "last visited" dates
- Visit frequency enables "time to revisit" recommendations
- Visit history enables pattern recognition ("You visit Italian most often")

**Future possibilities:**
- Recommendation engine based on your taste
- Collaborative filtering ("People who liked X also liked Y")
- Smart notifications ("It's been 6 months since you tried French food")
