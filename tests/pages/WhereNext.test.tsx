// ABOUT: Component tests for the Where Next? inspiration page
// ABOUT: Covers the loading/error/empty gate and that rails render once loaded

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Restaurant } from '@/types/place';
import WhereNext from '@/pages/WhereNext';
import { restaurantService } from '@/services/restaurants';

vi.mock('@/services/restaurants', () => ({
  restaurantService: {
    getAllRestaurantsWithLocations: vi.fn(),
  },
}));

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('WhereNext page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state and does NOT flash the empty state on cold load', () => {
    // A never-resolving promise keeps the query pending.
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockReturnValue(
      new Promise(() => {}),
    );
    render(<WhereNext />, { wrapper: createWrapper() });

    expect(screen.getByText('Finding ideas...')).toBeInTheDocument();
    expect(screen.queryByText("You've been everywhere!")).not.toBeInTheDocument();
  });

  it('renders rails once to-visit places load', async () => {
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockResolvedValue([
      makeRestaurant({ id: 'a', name: 'Alpha', created_at: '2025-06-01' }),
      makeRestaurant({ id: 'b', name: 'Bravo', created_at: '2025-05-01' }),
    ]);
    render(<WhereNext />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText('Freshly added')).toBeInTheDocument());
    expect(screen.getByText('Been waiting a while')).toBeInTheDocument();
    expect(screen.getByText('Surprise me')).toBeInTheDocument();
    // Names appear (at least once — a place may sit in several rails).
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
  });

  it('hides the Acclaimed rail when fewer than 3 places clear the rating floor', async () => {
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockResolvedValue([
      makeRestaurant({ id: 'a', public_rating: 4.9 }),
      makeRestaurant({ id: 'b', public_rating: 4.8 }),
    ]);
    render(<WhereNext />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText('Freshly added')).toBeInTheDocument());
    expect(screen.queryByText('Acclaimed & unvisited')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no to-visit places', async () => {
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockResolvedValue([
      makeRestaurant({ id: 'v', status: 'visited' }),
    ]);
    render(<WhereNext />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText("You've been everywhere!")).toBeInTheDocument());
    expect(screen.queryByText('Freshly added')).not.toBeInTheDocument();
  });

  it('rerolls the surprise pick without crashing', async () => {
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockResolvedValue([
      makeRestaurant({ id: 'a', name: 'Alpha', created_at: '2025-06-01' }),
      makeRestaurant({ id: 'b', name: 'Bravo', created_at: '2025-05-01' }),
      makeRestaurant({ id: 'c', name: 'Charlie', created_at: '2025-04-01' }),
    ]);
    render(<WhereNext />, { wrapper: createWrapper() });

    await waitFor(() => expect(screen.getByText('Surprise me')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /reroll/i }));
    // Still shows the Surprise me rail with a pick after rerolling.
    expect(screen.getByText('Surprise me')).toBeInTheDocument();
  });

  it('shows the error state when the fetch fails', async () => {
    vi.mocked(restaurantService.getAllRestaurantsWithLocations).mockRejectedValue(
      new Error('network down'),
    );
    render(<WhereNext />, { wrapper: createWrapper() });

    await waitFor(() =>
      expect(screen.getByText("Couldn't load your places")).toBeInTheDocument(),
    );
    expect(screen.getByText('network down')).toBeInTheDocument();
  });
});
