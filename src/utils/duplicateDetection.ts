// ABOUT: Detect possible duplicate restaurants before insert
// ABOUT: Matches on normalised URL (website/source_url) or name + shared city

import type { Restaurant, RestaurantAddress } from '@/types/place';

export interface DuplicateCandidate {
  name?: string;
  website?: string;
  sourceUrl?: string;
  addressSummary?: string;
  locations?: Pick<RestaurantAddress, 'city' | 'full_address' | 'location_name'>[];
}

export function normaliseUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split(/[?#]/)[0];
}

function normaliseText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function restaurantUrls(r: Pick<Restaurant, 'website' | 'source_url'>): string[] {
  return [normaliseUrl(r.website), normaliseUrl(r.source_url)].filter(Boolean);
}

function candidateUrls(c: DuplicateCandidate): string[] {
  return [normaliseUrl(c.website), normaliseUrl(c.sourceUrl)].filter(Boolean);
}

function citiesOfRestaurant(r: Restaurant): Set<string> {
  const cities = new Set<string>();
  const pushFrom = (text?: string | null) => {
    const norm = normaliseText(text);
    if (norm) cities.add(norm);
  };
  r.locations?.forEach(loc => {
    pushFrom(loc.city);
    // Fall back to last token of full_address for rows with no city column
    if (!loc.city && loc.full_address) {
      const parts = loc.full_address.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length) pushFrom(parts[parts.length - 1]);
    }
  });
  // address summary is often "City, Country" or just "City"
  if (r.address) {
    r.address.split(',').map(s => s.trim()).filter(Boolean).forEach(pushFrom);
  }
  return cities;
}

function citiesOfCandidate(c: DuplicateCandidate): Set<string> {
  const cities = new Set<string>();
  const pushFrom = (text?: string | null) => {
    const norm = normaliseText(text);
    if (norm) cities.add(norm);
  };
  c.locations?.forEach(loc => {
    pushFrom(loc.city);
    if (!loc.city && loc.full_address) {
      const parts = loc.full_address.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length) pushFrom(parts[parts.length - 1]);
    }
  });
  if (c.addressSummary) {
    c.addressSummary.split(',').map(s => s.trim()).filter(Boolean).forEach(pushFrom);
  }
  return cities;
}

export function findDuplicateCandidates(
  candidate: DuplicateCandidate,
  existing: Restaurant[]
): Restaurant[] {
  const candUrls = candidateUrls(candidate);
  const candName = normaliseText(candidate.name);
  const candCities = citiesOfCandidate(candidate);

  const matches: Restaurant[] = [];
  for (const r of existing) {
    const urls = restaurantUrls(r);
    const urlMatch = candUrls.length > 0 && urls.some(u => candUrls.includes(u));
    if (urlMatch) {
      matches.push(r);
      continue;
    }

    if (candName && normaliseText(r.name) === candName) {
      const rCities = citiesOfRestaurant(r);
      if (candCities.size === 0 || rCities.size === 0) {
        // No city info either side — treat name-only hit as a soft match
        matches.push(r);
        continue;
      }
      for (const c of candCities) {
        if (rCities.has(c)) {
          matches.push(r);
          break;
        }
      }
    }
  }
  return matches;
}
