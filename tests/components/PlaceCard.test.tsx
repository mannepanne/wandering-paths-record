// ABOUT: Component tests for PlaceCard
// ABOUT: Verifies navigation to the detail page carries the origin path as router state

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Restaurant } from '@/types/place';
import { PlaceCard } from '@/components/PlaceCard';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'r1',
    name: 'Test Restaurant',
    address: 'Somewhere',
    status: 'to-visit',
    personal_appreciation: 'unknown',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

const renderAt = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <TooltipProvider>
        <PlaceCard place={makeRestaurant()} />
      </TooltipProvider>
    </MemoryRouter>,
  );

// Detects a bare "0" rendered as a direct text node — the failure mode of a
// falsy `0 && <JSX>` guard, where React prints the number instead of hiding it.
const hasBareZeroTextNode = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('*')).some((el) =>
    Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() === '0',
    ),
  );

const renderCard = (place: Restaurant) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <PlaceCard place={place} />
      </TooltipProvider>
    </MemoryRouter>,
  );

describe('PlaceCard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('navigates to the detail page carrying the origin path as state', () => {
    renderAt('/where-next');
    fireEvent.click(screen.getByText('Test Restaurant'));
    expect(mockNavigate).toHaveBeenCalledWith('/restaurant/r1', { state: { from: '/where-next' } });
  });

  it('records the list page as origin when clicked from the list', () => {
    renderAt('/');
    fireEvent.click(screen.getByText('Test Restaurant'));
    expect(mockNavigate).toHaveBeenCalledWith('/restaurant/r1', { state: { from: '/' } });
  });
});

describe('PlaceCard falsy-zero guards', () => {
  it('does not render a stray "0" when numeric fields are 0', () => {
    const { container } = renderCard(
      makeRestaurant({
        status: 'visited',
        visit_count: 0,
        public_rating: 0,
        personal_rating: 0,
      }),
    );
    expect(hasBareZeroTextNode(container)).toBe(false);
  });

  it('still renders the visit count when visited more than once', () => {
    renderCard(makeRestaurant({ status: 'visited', visit_count: 3 }));
    expect(screen.getByText('Visited 3 times')).toBeInTheDocument();
  });
});
