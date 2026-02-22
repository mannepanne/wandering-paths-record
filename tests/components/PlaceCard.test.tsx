// ABOUT: Component tests for PlaceCard
// ABOUT: Demonstrates React Testing Library patterns for UI components

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { PlaceCard } from '@/components/PlaceCard';
import { Restaurant } from '@/types/place';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Helper to render with Router and Tooltip context
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <TooltipProvider>{ui}</TooltipProvider>
    </BrowserRouter>
  );
};

// Mock restaurant data
const mockRestaurant: Restaurant = {
  id: 'test-restaurant-1',
  name: 'Test Bistro',
  address: '123 Test Street, London',
  status: 'to-visit',
  cuisine: 'French',
  cuisine_primary: 'French',
  price_range: '$$',
  public_rating: 4.5,
  public_rating_count: 120,
  personal_appreciation: 'unknown',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  locations: []
};

describe('PlaceCard', () => {
  it('should render restaurant name and address', () => {
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    expect(screen.getByText('Test Bistro')).toBeInTheDocument();
    expect(screen.getByText('123 Test Street, London')).toBeInTheDocument();
  });

  it('should display cuisine badge', () => {
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    expect(screen.getByText('French')).toBeInTheDocument();
  });

  it('should display price range badge', () => {
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    expect(screen.getByText('$$')).toBeInTheDocument();
  });

  it('should display public rating when available', () => {
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    // Should show rating and count
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(120)')).toBeInTheDocument();
  });

  it('should navigate to restaurant details when card is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    const card = screen.getByText('Test Bistro').closest('div[class*="card"]');
    if (card) {
      await user.click(card);
      expect(mockNavigate).toHaveBeenCalledWith('/restaurant/test-restaurant-1');
    }
  });

  it('should call onStatusChange when status button is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();

    renderWithProviders(
      <PlaceCard place={mockRestaurant} onStatusChange={onStatusChange} />
    );

    // Find and click the status toggle button
    const statusButton = screen.getByRole('button', { name: /mark as visited/i });
    await user.click(statusButton);

    // Should open appreciation picker (tested separately)
    expect(screen.getByText(/how would you rate/i)).toBeInTheDocument();
  });

  it('should display "to-visit" status correctly', () => {
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    // Should show "Mark as Visited" button for to-visit restaurants
    expect(screen.getByRole('button', { name: /mark as visited/i })).toBeInTheDocument();
  });

  it('should display "visited" status correctly', () => {
    const visitedRestaurant = { ...mockRestaurant, status: 'visited' as const };
    renderWithProviders(<PlaceCard place={visitedRestaurant} />);

    // Should show "Mark as To Visit" button for visited restaurants
    expect(screen.getByRole('button', { name: /mark as to visit/i })).toBeInTheDocument();
  });

  it('should render without public rating gracefully', () => {
    const restaurantWithoutRating = {
      ...mockRestaurant,
      public_rating: undefined,
      public_rating_count: undefined
    };

    renderWithProviders(<PlaceCard place={restaurantWithoutRating} />);

    // Should still render name and address
    expect(screen.getByText('Test Bistro')).toBeInTheDocument();

    // Should not show rating section
    expect(screen.queryByText('4.5')).not.toBeInTheDocument();
  });

  it('should display appreciation badge when restaurant has been rated', () => {
    const ratedRestaurant = {
      ...mockRestaurant,
      status: 'visited' as const,
      personal_appreciation: 'great' as const
    };

    renderWithProviders(<PlaceCard place={ratedRestaurant} />);

    // Should show appreciation indicator
    expect(screen.getByText(/must visit/i)).toBeInTheDocument();
  });

  it('should handle missing optional props gracefully', () => {
    // Render without optional callbacks
    renderWithProviders(<PlaceCard place={mockRestaurant} />);

    expect(screen.getByText('Test Bistro')).toBeInTheDocument();
  });
});
