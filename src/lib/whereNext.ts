// ABOUT: Pure rail-selection logic for the Where Next? inspiration page.
// ABOUT: Deterministic selectors over the restaurant list — no fetching, no side effects.

import { Restaurant } from "@/types/place";

/** Minimum public rating for a place to count as "acclaimed". */
export const ACCLAIMED_FLOOR = 4.3;
/** Hide the Acclaimed rail unless at least this many places clear the floor. */
export const ACCLAIMED_MIN = 3;

const FRESH_LIMIT = 6;
const AGING_LIMIT = 3;
const ACCLAIMED_LIMIT = 6;

/** Places still to visit — the candidate pool for every rail. */
export function toVisit(places: Restaurant[]): Restaurant[] {
  return places.filter((p) => p.status !== "visited");
}

/** Stable tie-break by id so equal sort keys order deterministically. */
function byId(a: Restaurant, b: Restaurant): number {
  return a.id.localeCompare(b.id);
}

/** Most recently added to-visit places (newest first). */
export function freshlyAdded(places: Restaurant[], limit = FRESH_LIMIT): Restaurant[] {
  return toVisit(places)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || byId(a, b))
    .slice(0, limit);
}

/** Longest-waiting to-visit places (oldest first). */
export function agingList(places: Restaurant[], limit = AGING_LIMIT): Restaurant[] {
  return toVisit(places)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || byId(a, b))
    .slice(0, limit);
}

/**
 * Highly-rated to-visit places, best first. Only places with a public_rating at
 * or above ACCLAIMED_FLOOR qualify. Returns an empty list (rail hidden) when
 * fewer than ACCLAIMED_MIN clear the floor, so the "acclaimed" label stays honest.
 */
export function acclaimedUnvisited(places: Restaurant[], limit = ACCLAIMED_LIMIT): Restaurant[] {
  const qualifying = toVisit(places)
    .filter((p) => typeof p.public_rating === "number" && p.public_rating >= ACCLAIMED_FLOOR)
    .sort((a, b) => (b.public_rating! - a.public_rating!) || byId(a, b));
  return qualifying.length >= ACCLAIMED_MIN ? qualifying.slice(0, limit) : [];
}

/** The pool "Surprise me" draws from. */
export function surpriseCandidates(places: Restaurant[]): Restaurant[] {
  return toVisit(places);
}

/** A single map marker: a coordinate plus the label to show in its callout. */
export interface WhereNextMarker {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Resolve the map markers for a restaurant, mirroring InteractiveMap's fallback:
 * every location with coordinates when present, otherwise the legacy
 * restaurant-level coordinate. Multi-location markers self-label with their
 * branch name so each callout is unambiguous. Returns [] when nothing has coordinates.
 */
export function restaurantMarkers(restaurant: Restaurant): WhereNextMarker[] {
  if (restaurant.locations && restaurant.locations.length > 0) {
    return restaurant.locations
      .filter((loc) => typeof loc.latitude === "number" && typeof loc.longitude === "number")
      .map((loc) => ({
        latitude: loc.latitude!,
        longitude: loc.longitude!,
        label: loc.location_name ? `${restaurant.name} — ${loc.location_name}` : restaurant.name,
      }));
  }
  if (typeof restaurant.latitude === "number" && typeof restaurant.longitude === "number") {
    return [{ latitude: restaurant.latitude, longitude: restaurant.longitude, label: restaurant.name }];
  }
  return [];
}

/** True when a restaurant has at least one mappable coordinate. */
export function hasCoordinates(restaurant: Restaurant): boolean {
  return restaurantMarkers(restaurant).length > 0;
}

/**
 * Resolve which restaurant the focus map should show. A null `focusedId` tracks
 * the current surprise pick (so rerolling moves the map); any id pins that place
 * (so rerolling leaves the map put). Returns null when the id no longer resolves.
 */
export function resolveFocus(
  focusedId: string | null,
  surprise: Restaurant | null,
  places: Restaurant[],
): Restaurant | null {
  if (focusedId === null) return surprise;
  return places.find((p) => p.id === focusedId) ?? null;
}

/**
 * Pick a surprise place. Excludes `currentId` (the place already shown) so a reroll
 * always changes the pick when more than one candidate exists. With a single
 * candidate the same place is returned. `index` selects deterministically (inject a
 * random integer at the call site; inject a fixed value in tests).
 */
export function nextSurprise(
  candidates: Restaurant[],
  currentId: string | null,
  index: number,
): Restaurant | null {
  if (candidates.length === 0) return null;
  const pool = currentId ? candidates.filter((c) => c.id !== currentId) : candidates;
  if (pool.length === 0) return candidates[0];
  return pool[((index % pool.length) + pool.length) % pool.length];
}
