# Where Next? — Inspiration Page (Rails 1–4 MVP)

## Phase overview

**Phase name:** Where Next? — Inspiration Page (MVP)
**Estimated timeframe:** ~1 day
**Dependencies:** No backend/schema change. Frontend-only, but note: as a separate route the
page **re-fetches** the restaurant list via its own query (it does NOT share Index's in-memory
`allPlaces`) — so it needs its own loading/error handling. The re-fetch is trivial (~174 rows).

**Brief description:**
174 restaurants are in the database, most unvisited. Existing search already answers "I'm
going to area X — what's nearby?" (use case 1). There is **no** tool for "inspire me — surface
a place worth going to next" (use case 2). This phase adds a `/where-next` page that presents a
stack of small, named, transparent "rails", each a legible heuristic over the restaurant list.
Every suggestion's reason is visible in its rail title — no opaque scoring, no ML.

**Shipped layout note:** the rails render as **"Surprise me" on its own hero row on top, then
Freshly added / Acclaimed & unvisited / Been waiting a while as three side-by-side columns**
(vertical card stacks; collapses to one column on mobile). This replaced the originally-planned
horizontal-scroll rows — vertical columns suit the tall `PlaceCard` far better, so no compact
card variant was needed. Empty columns are dropped and the grid reflows.

---

## Scope and deliverables

### In scope
- [ ] New route `/where-next` rendering a `<WhereNext />` page.
- [ ] "Where next?" navigation button in the header, left of the existing Map/List toggle.
- [ ] A "back to list" link on the page.
- [ ] Four rails, all filtered to **to-visit restaurants only** (`status !== 'visited'`).
  All sorts use a **stable secondary key (`id`)** so ties are deterministic (16+ rows share a
  `created_at`; ratings tie too).
  1. **Freshly added** — sort by `created_at` DESC (then `id`), top 6. "Recently added."
     (Weakest lens — mirrors the default list order; kept as one glanceable view. A recency
     window, e.g. "added this month", is a possible later refinement.)
  2. **Aging on the list** — sort by `created_at` ASC (then `id`), top 3. "Been waiting a while."
  3. **Acclaimed & unvisited** — `public_rating` present AND **`>= 4.3`** (honesty floor),
     sort DESC (then `id`), top 6. Excludes null/0 ratings. **If fewer than 3 clear the floor,
     hide the rail** rather than mislabel mediocre places as acclaimed.
  4. **Surprise me** — one random to-visit pick + a "reroll" button. Reroll **samples from the
     pool excluding the current pick**, so with >1 candidate it always changes; with exactly 1
     candidate it returns the same place. Where cheap, also de-dupe against places already shown
     in other rails.
- [ ] Pure, unit-tested rail-selection module (`src/lib/whereNext.ts`).
- [ ] Page owns its data fetch → **3-way loading / error / empty gate** (reuse Index's pattern).
- [ ] Rail cards render **read-only** (no edit/status/appreciation handlers passed to PlaceCard).
- [ ] Tests for all new logic (TDD, in `tests/**`) + a component-render test.

### Out of scope
- Use case 1 (nearby unvisited) — future tweak to existing search.
- Any backend / API / D1 schema change.
- Rating-weighted "Surprise me" (uniform random is enough for MVP).
- Phase 2 rails: "More like ones you loved" (content match), "Unexplored" (cuisine/area
  breadth), "Knock out a cluster" (geo grouping). Deferred until MVP proves useful.

### Acceptance criteria
- [ ] `/where-next` loads and renders the rails from the live restaurant list.
- [ ] Every rail shows only to-visit places; correct ordering and caps per rail; ties stable.
- [ ] "Acclaimed" only shows places with `public_rating >= 4.3`; the rail is hidden if <3 qualify.
- [ ] "Surprise me" shows one place; reroll always changes it when >1 candidate exists.
- [ ] Loading, error, empty, and under-cap states each render correctly (empty state must NOT
      flash on cold load — gate it on `!isLoading && !error`).
- [ ] Rail cards show no admin controls.
- [ ] Header button navigates to the page; back link returns to the list.
- [ ] Tests live under `tests/**` (so vitest collects them), pass, 95%+ coverage on new logic,
      `npx tsc --noEmit` clean.

---

## Technical approach

### Architecture decisions

**Separate route vs. third view mode in Index**
- Choice: Separate route `/where-next` with its own `<WhereNext />` page.
- Rationale: `Index.tsx` is already large and heavily stateful. A separate route keeps it
  untouched (just a nav button), gives the page a clean URL, and matches the "this is a
  different mode" mental model. Re-fetching the list is trivial (174 rows, one query).
- Alternatives considered: Extend the `isMapView` boolean toggle to a tri-state inside Index —
  rejected to avoid growing Index's complexity.

**Rail logic as a pure module**
- Choice: `src/lib/whereNext.ts` exports pure functions
  `freshlyAdded(places)`, `agingList(places)`, `acclaimedUnvisited(places)`,
  `surprisePick(places, index)`.
- Rationale: Deterministic and trivially unit-testable; keeps the page component thin and
  presentational. `surprisePick` takes an injected index/seed so it is deterministic under test.
- Alternatives considered: Inline `useMemo` logic in the component — rejected as harder to
  test to the 95% bar.

**No backend work**
- Choice: Compute rails client-side from the restaurant list the page fetches on mount.
- Rationale: The full list is small; adding endpoints would be over-engineering (YAGNI).

### Key files and components

**New files to create:**
```
src/
  ├── pages/
  │   └── WhereNext.tsx
  ├── components/
  │   └── WhereNextRail.tsx        (rail row wrapper; reuses PlaceCard, read-only)
  └── lib/
      └── whereNext.ts             (pure selectors)
tests/
  ├── lib/whereNext.test.ts        (MUST live under tests/ — vitest include is tests/**)
  └── pages/WhereNext.test.tsx
```
Presentation reuses `PlaceCard` in **read-only mode** (no edit/status/appreciation handlers).
PlaceCard is a tall vertical card. The shipped layout stacks cards **vertically within each
column**, which fits the full card well — no compact variant was needed. (Component tests must
wrap `TooltipProvider`, as PlaceCard uses a radix Tooltip.)

**Files to modify:**
```
- src/App.tsx        - add <Route path="/where-next" ... />
- <header component>  - add "Where next?" button left of Map/List toggle
```

### Database schema changes
None. `created_at` (ISO TEXT, `datetime('now')` default — lexicographically sortable) and
`public_rating` already exist.

---

## Testing strategy

### Unit tests (`tests/lib/whereNext.test.ts`)
- Each selector: correct ordering, cap enforcement, to-visit-only filtering, stable tie-break.
- `acclaimedUnvisited`: excludes null/0/`<4.3` ratings; sorts DESC; returns nothing when <3 qualify.
- `surprisePick` / reroll: excluding-current-pick sampling always changes with >1 candidate;
  returns same with 1 candidate; handles empty input.
- Empty input → empty results (no throw).

### Component test (`tests/pages/WhereNext.test.tsx`)
- Renders rails given a mock list; renders the empty state ONLY when loaded + no to-visit places
  (not during loading); renders the error branch. Wrap in `TooltipProvider`.

### Coverage targets
- Lines/Functions/Statements 95%+, Branches 90%+ on new code.
- **Achieved:** `whereNext.ts` (the logic) 100% across the board. `WhereNext.tsx` is 100%
  lines/statements/functions but ~77% branches — the uncovered branches are defensive
  null-guards (`surprise?.id ?? null`, the single-column grid fallback, `surprise ? [surprise] : []`)
  that the earlier `candidates.length > 0` gate makes unreachable. Accepted rather than tested
  against impossible states.

### Manual testing checklist
- [ ] Header button opens `/where-next`; back link returns.
- [ ] Each rail shows correct places, order, and count against real data.
- [ ] Reroll changes the surprise pick.
- [ ] Responsive: three columns side by side on desktop, collapsing to one on mobile.
- [ ] Keyboard accessible (button, reroll, rail navigation).

---

## Pre-commit checklist
- [ ] `npm test` passing
- [ ] `npx tsc --noEmit` clean
- [ ] Coverage meets targets
- [ ] Manual verification complete
- [ ] Docs updated: root `CLAUDE.md` key-files list; a short REFERENCE note if warranted
- [ ] No `console.log` / debug code
- [ ] No secrets

---

## PR workflow
- **Branch:** `feature/where-next`
- **PR title:** "Add Where Next? inspiration page (rails 1–4)"
- **Review:** `/review-pr` (pure frontend, no auth/data-layer/CI touch → expect light/standard tier).

---

## Edge cases and considerations

### Known risks
- **Cold-load empty-state flash (correctness, not polish):** the page re-fetches, so on first
  render the list is `[]`, the to-visit filter is empty, and the "you've been everywhere" state
  would wrongly flash. **Empty state MUST be gated on `!isLoading && !error`.** Distinct
  loading and error branches required (reuse Index's 3-way gate).
- **Acclaimed honesty:** without the `>= 4.3` floor, ~91% of to-visit places qualify and the
  rail mislabels mediocre places as "acclaimed." Floor enforced; rail hidden if <3 qualify.
- **Rail overlap:** a place may appear in multiple rails (e.g. Freshly added AND Acclaimed).
  **Accepted** — rails answer different questions. Surprise me de-dupes against shown places
  where cheap. Revisit only if it feels repetitive.
- **Thin rails:** fewer to-visit places than a cap → show what exists.
- **No to-visit places:** friendly empty state ("You've been everywhere — add more!").
- **Reroll with one candidate:** returns the same place (acceptable).

### Performance
- All computation over ~174 in-memory rows; negligible. Memoise selectors with `useMemo`.

### Accessibility
- Nav button and reroll are real buttons; rails keyboard-navigable; ARIA labels on rail regions.

### Future optimisation opportunities
- Phase 2 rails (similarity / unexplored / geo-cluster).
- Rating-weighted surprise pick.
- Use-case-1 "near me right now" rail once the search tweak lands.

---

## Technical debt introduced
None anticipated. If the compact-card decision defers a `PlaceCard` variant, track as a
`technical-debt` GitHub issue rather than fixing inline.

---

## Related documentation
- [Root CLAUDE.md](../CLAUDE.md)
- [testing-strategy.md](../REFERENCE/testing-strategy.md)
