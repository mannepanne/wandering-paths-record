// ABOUT: Unit tests for duplicate restaurant detection
// ABOUT: Covers URL normalisation and name+city matching

import { describe, it, expect } from 'vitest';
import { normaliseUrl, findDuplicateCandidates } from '@/utils/duplicateDetection';
import type { Restaurant } from '@/types/place';

function makeRestaurant(overrides: Partial<Restaurant>): Restaurant {
  return {
    id: 'id',
    name: 'Test',
    address: '',
    status: 'to-visit',
    personal_appreciation: 'unknown',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('normaliseUrl', () => {
  it('strips protocol, www, trailing slash, and lowercases', () => {
    expect(normaliseUrl('https://www.Baracafe.com/')).toBe('baracafe.com');
    expect(normaliseUrl('http://baracafe.com')).toBe('baracafe.com');
    expect(normaliseUrl('https://www.baracafe.com')).toBe('baracafe.com');
    expect(normaliseUrl('  https://baracafe.com/  ')).toBe('baracafe.com');
  });

  it('drops query strings and fragments', () => {
    expect(normaliseUrl('https://site.com/page?ref=x')).toBe('site.com/page');
    expect(normaliseUrl('https://site.com/page#section')).toBe('site.com/page');
  });

  it('returns empty string for missing values', () => {
    expect(normaliseUrl()).toBe('');
    expect(normaliseUrl(undefined)).toBe('');
    expect(normaliseUrl(null)).toBe('');
    expect(normaliseUrl('')).toBe('');
  });
});

describe('findDuplicateCandidates', () => {
  const bara = makeRestaurant({
    id: 'bara-1',
    name: 'Bara Cafe',
    address: 'Peckham, London',
    website: 'https://www.baracafe.com/',
  });

  it('matches when website differs only in protocol/www/trailing slash', () => {
    const matches = findDuplicateCandidates(
      { name: 'Bara Cafe', website: 'http://baracafe.com' },
      [bara],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('bara-1');
  });

  it('matches candidate source_url against existing website', () => {
    const matches = findDuplicateCandidates(
      { name: 'Whatever', sourceUrl: 'https://www.baracafe.com/menu' },
      [bara],
    );
    // Path differs so URL match should NOT fire; name differs so no match
    expect(matches).toHaveLength(0);
  });

  it('matches existing source_url when candidate website matches', () => {
    const mention = makeRestaurant({
      id: 'mention-1',
      name: 'Some Cafe',
      source_url: 'https://www.eater.com/london-picks',
    });
    const matches = findDuplicateCandidates(
      { name: 'Other', website: 'https://eater.com/london-picks' },
      [mention],
    );
    expect(matches).toHaveLength(1);
  });

  it('matches on name + shared city case-insensitive', () => {
    const matches = findDuplicateCandidates(
      { name: 'bara cafe', addressSummary: 'London' },
      [bara],
    );
    expect(matches).toHaveLength(1);
  });

  it('does not match same name in different city', () => {
    const matches = findDuplicateCandidates(
      { name: 'Bara Cafe', addressSummary: 'Paris, France' },
      [bara],
    );
    expect(matches).toHaveLength(0);
  });

  it('treats name-only match as soft match when no city info exists', () => {
    const nameOnly = makeRestaurant({ id: 'n1', name: 'Foo', address: '' });
    const matches = findDuplicateCandidates({ name: 'foo' }, [nameOnly]);
    expect(matches).toHaveLength(1);
  });

  it('returns empty list when nothing matches', () => {
    const matches = findDuplicateCandidates(
      { name: 'Totally New', website: 'https://new.example.com' },
      [bara],
    );
    expect(matches).toHaveLength(0);
  });

  it('uses candidate locations city for matching', () => {
    const matches = findDuplicateCandidates(
      {
        name: 'Bara Cafe',
        locations: [{ city: 'London', full_address: '', location_name: '' }],
      },
      [bara],
    );
    expect(matches).toHaveLength(1);
  });

  it('uses existing locations city when address summary is minimal', () => {
    const withLoc = makeRestaurant({
      id: 'x',
      name: 'Bara Cafe',
      address: '',
      locations: [{
        id: 'a', restaurant_id: 'x', location_name: 'Peckham',
        full_address: '44 Choumert Rd, London', city: 'London',
        created_at: '', updated_at: '',
      }],
    });
    const matches = findDuplicateCandidates(
      { name: 'Bara Cafe', addressSummary: 'London' },
      [withLoc],
    );
    expect(matches).toHaveLength(1);
  });

  it('returns multiple matches when several existing rows collide', () => {
    const a = makeRestaurant({ id: 'a', name: 'X', website: 'https://x.com' });
    const b = makeRestaurant({ id: 'b', name: 'X', website: 'https://x.com' });
    const matches = findDuplicateCandidates(
      { name: 'X', website: 'https://x.com' },
      [a, b],
    );
    expect(matches.map(r => r.id).sort()).toEqual(['a', 'b']);
  });
});
