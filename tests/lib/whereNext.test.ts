// ABOUT: Unit tests for Where Next? rail-selection logic
// ABOUT: Covers ordering, caps, to-visit filtering, the acclaimed floor, and surprise reroll

import { describe, it, expect } from 'vitest';
import type { Restaurant } from '@/types/place';
import {
  toVisit,
  freshlyAdded,
  agingList,
  acclaimedUnvisited,
  surpriseCandidates,
  nextSurprise,
  restaurantMarkers,
  hasCoordinates,
  resolveFocus,
  ACCLAIMED_FLOOR,
} from '@/lib/whereNext';
import type { RestaurantAddress } from '@/types/place';

function makeRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: 'id',
    name: 'Test',
    address: '',
    status: 'to-visit',
    personal_appreciation: 'unknown',
    created_at: '2025-01-01',
    updated_at: '',
    ...overrides,
  };
}

/** n to-visit places with ascending created_at and ids p0..p(n-1). */
function makePlaces(n: number, overrides: (i: number) => Partial<Restaurant> = () => ({})): Restaurant[] {
  return Array.from({ length: n }, (_, i) =>
    makeRestaurant({
      id: `p${i}`,
      created_at: `2025-01-${String(i + 1).padStart(2, '0')}`,
      ...overrides(i),
    }),
  );
}

describe('toVisit', () => {
  it('keeps only non-visited places', () => {
    const places = [
      makeRestaurant({ id: 'a', status: 'to-visit' }),
      makeRestaurant({ id: 'b', status: 'visited' }),
    ];
    expect(toVisit(places).map((p) => p.id)).toEqual(['a']);
  });

  it('returns [] for empty input', () => {
    expect(toVisit([])).toEqual([]);
  });
});

describe('freshlyAdded', () => {
  it('returns newest-first, capped at 6', () => {
    const result = freshlyAdded(makePlaces(10));
    expect(result).toHaveLength(6);
    expect(result[0].id).toBe('p9'); // newest
    expect(result[5].id).toBe('p4');
  });

  it('excludes visited places', () => {
    const places = [
      makeRestaurant({ id: 'v', status: 'visited', created_at: '2025-12-31' }),
      makeRestaurant({ id: 't', status: 'to-visit', created_at: '2025-01-01' }),
    ];
    expect(freshlyAdded(places).map((p) => p.id)).toEqual(['t']);
  });

  it('breaks created_at ties by id', () => {
    const places = [
      makeRestaurant({ id: 'zzz', created_at: '2025-06-01' }),
      makeRestaurant({ id: 'aaa', created_at: '2025-06-01' }),
    ];
    expect(freshlyAdded(places).map((p) => p.id)).toEqual(['aaa', 'zzz']);
  });

  it('returns [] for empty input', () => {
    expect(freshlyAdded([])).toEqual([]);
  });
});

describe('agingList', () => {
  it('returns oldest-first, capped at 3', () => {
    const result = agingList(makePlaces(10));
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('p0'); // oldest
    expect(result[2].id).toBe('p2');
  });

  it('shows fewer than the cap when the pool is small', () => {
    expect(agingList(makePlaces(2))).toHaveLength(2);
  });
});

describe('acclaimedUnvisited', () => {
  it('keeps only places at or above the floor, best first', () => {
    const places = [
      makeRestaurant({ id: 'hi', public_rating: 4.8 }),
      makeRestaurant({ id: 'mid', public_rating: 4.5 }),
      makeRestaurant({ id: 'floor', public_rating: ACCLAIMED_FLOOR }),
      makeRestaurant({ id: 'low', public_rating: 3.4 }),
    ];
    expect(acclaimedUnvisited(places).map((p) => p.id)).toEqual(['hi', 'mid', 'floor']);
  });

  it('excludes places with no rating or a zero rating', () => {
    const places = [
      makeRestaurant({ id: 'a', public_rating: 4.9 }),
      makeRestaurant({ id: 'b', public_rating: 4.7 }),
      makeRestaurant({ id: 'none' }),
      makeRestaurant({ id: 'zero', public_rating: 0 }),
      makeRestaurant({ id: 'c', public_rating: 4.5 }),
    ];
    expect(acclaimedUnvisited(places).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('hides the rail (returns []) when fewer than 3 clear the floor', () => {
    const places = [
      makeRestaurant({ id: 'a', public_rating: 4.9 }),
      makeRestaurant({ id: 'b', public_rating: 4.7 }),
    ];
    expect(acclaimedUnvisited(places)).toEqual([]);
  });

  it('excludes visited places from the count', () => {
    const places = [
      makeRestaurant({ id: 'a', public_rating: 4.9 }),
      makeRestaurant({ id: 'b', public_rating: 4.7 }),
      makeRestaurant({ id: 'v', public_rating: 4.9, status: 'visited' }),
    ];
    expect(acclaimedUnvisited(places)).toEqual([]);
  });

  it('caps at 6', () => {
    const places = makePlaces(8, () => ({ public_rating: 4.8 }));
    expect(acclaimedUnvisited(places)).toHaveLength(6);
  });
});

describe('nextSurprise', () => {
  const candidates = makePlaces(3); // p0, p1, p2

  it('returns null when there are no candidates', () => {
    expect(nextSurprise([], null, 0)).toBeNull();
  });

  it('picks deterministically by index on first draw', () => {
    expect(nextSurprise(candidates, null, 1)!.id).toBe('p1');
    expect(nextSurprise(candidates, null, 4)!.id).toBe('p1'); // wraps
  });

  it('always changes on reroll when more than one candidate exists', () => {
    const current = candidates[0]; // p0
    for (let i = 0; i < 10; i++) {
      expect(nextSurprise(candidates, current.id, i)!.id).not.toBe('p0');
    }
  });

  it('returns the same place on reroll when only one candidate exists', () => {
    const one = makePlaces(1);
    expect(nextSurprise(one, 'p0', 3)!.id).toBe('p0');
  });

  it('handles negative indices without throwing', () => {
    expect(nextSurprise(candidates, null, -1)!.id).toBe('p2');
  });
});

describe('surpriseCandidates', () => {
  it('is the to-visit pool', () => {
    const places = [
      makeRestaurant({ id: 'a', status: 'to-visit' }),
      makeRestaurant({ id: 'b', status: 'visited' }),
    ];
    expect(surpriseCandidates(places).map((p) => p.id)).toEqual(['a']);
  });
});

function makeLocation(overrides: Partial<RestaurantAddress>): RestaurantAddress {
  return {
    id: 'loc',
    restaurant_id: 'r',
    location_name: '',
    full_address: '',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('restaurantMarkers', () => {
  it('returns one self-labelled marker per located branch', () => {
    const r = makeRestaurant({
      name: 'Dishoom',
      locations: [
        makeLocation({ id: 'l1', location_name: 'Shoreditch', latitude: 51.5, longitude: -0.1 }),
        makeLocation({ id: 'l2', location_name: 'Covent Garden', latitude: 51.51, longitude: -0.12 }),
      ],
    });
    expect(restaurantMarkers(r)).toEqual([
      { latitude: 51.5, longitude: -0.1, label: 'Dishoom — Shoreditch' },
      { latitude: 51.51, longitude: -0.12, label: 'Dishoom — Covent Garden' },
    ]);
  });

  it('skips branches missing coordinates', () => {
    const r = makeRestaurant({
      name: 'Dishoom',
      locations: [
        makeLocation({ id: 'l1', location_name: 'Shoreditch', latitude: 51.5, longitude: -0.1 }),
        makeLocation({ id: 'l2', location_name: 'Nowhere' }),
      ],
    });
    expect(restaurantMarkers(r)).toHaveLength(1);
  });

  it('falls back to restaurant-level coordinates when there are no locations', () => {
    const r = makeRestaurant({ name: 'Solo', latitude: 40, longitude: -70 });
    expect(restaurantMarkers(r)).toEqual([{ latitude: 40, longitude: -70, label: 'Solo' }]);
  });

  it('returns [] when nothing has coordinates', () => {
    expect(restaurantMarkers(makeRestaurant({ name: 'Ghost' }))).toEqual([]);
    expect(restaurantMarkers(makeRestaurant({ locations: [makeLocation({})] }))).toEqual([]);
  });
});

describe('hasCoordinates', () => {
  it('is true only when a marker resolves', () => {
    expect(hasCoordinates(makeRestaurant({ latitude: 1, longitude: 2 }))).toBe(true);
    expect(hasCoordinates(makeRestaurant({}))).toBe(false);
  });
});

describe('resolveFocus', () => {
  const places = makePlaces(3); // p0, p1, p2
  const surprise = places[1];

  it('tracks the surprise pick when no id is pinned', () => {
    expect(resolveFocus(null, surprise, places)?.id).toBe('p1');
  });

  it('pins the chosen place regardless of the surprise', () => {
    expect(resolveFocus('p2', surprise, places)?.id).toBe('p2');
  });

  it('returns null when the pinned id no longer resolves', () => {
    expect(resolveFocus('gone', surprise, places)).toBeNull();
  });

  it('returns null when tracking surprise but there is none', () => {
    expect(resolveFocus(null, null, places)).toBeNull();
  });
});
