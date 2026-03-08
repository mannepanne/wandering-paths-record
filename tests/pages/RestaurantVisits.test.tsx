// ABOUT: Component tests for RestaurantVisits page
// ABOUT: Tests full visit history display, note expansion, edit/delete, and navigation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import RestaurantVisits from '@/pages/RestaurantVisits';
import { visitService } from '@/services/visits';
import { restaurantService } from '@/services/restaurants';

// Mock services
vi.mock('@/services/visits', () => ({
  visitService: {
    getAllVisits: vi.fn(),
    deleteVisit: vi.fn(),
  },
}));

vi.mock('@/services/restaurants', () => ({
  restaurantService: {
    getRestaurantByIdWithLocations: vi.fn(),
  },
}));

// Mock auth context - show user as authenticated
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock router params and navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-restaurant-id' }),
    useNavigate: () => mockNavigate,
  };
});

// Mock VisitModal to simplify testing
vi.mock('@/components/VisitModal', () => ({
  VisitModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="visit-modal">Visit Modal</div> : null,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const mockRestaurant = {
  id: 'test-restaurant-id',
  name: 'Test Restaurant',
  address: 'Test Address',
  description: 'A wonderful test restaurant',
  status: 'visited' as const,
  cuisine_primary: 'Italian',
  style: 'Modern',
  venue: 'Restaurant',
  price_range: '$$',
  website: 'https://example.com',
  locations: [{
    id: 'loc-1',
    restaurant_id: 'test-restaurant-id',
    location_name: 'Downtown',
    full_address: '123 Test St, Test City',
    city: 'Test City',
    country: 'Test Country',
    latitude: 51.5,
    longitude: -0.1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockVisits = [
  {
    id: 'visit-1',
    restaurant_id: 'test-restaurant-id',
    user_id: 'test-user-id',
    visit_date: '2026-03-01',
    rating: 'great' as const,
    experience_notes: 'Amazing food',
    company_notes: 'With family',
    is_migrated_placeholder: false,
    created_at: '2026-03-01T12:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
  },
  {
    id: 'visit-2',
    restaurant_id: 'test-restaurant-id',
    user_id: 'test-user-id',
    visit_date: '2020-02-29',
    rating: 'good' as const,
    experience_notes: 'Good meal',
    is_migrated_placeholder: false,
    created_at: '2020-02-29T12:00:00Z',
    updated_at: '2020-02-29T12:00:00Z',
  },
];

describe('RestaurantVisits Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockToast.mockClear();

    // Default mocks - successful responses
    vi.mocked(restaurantService.getRestaurantByIdWithLocations).mockResolvedValue(mockRestaurant);
    vi.mocked(visitService.getAllVisits).mockResolvedValue(mockVisits);
  });

  describe('Basic Rendering', () => {
    it('should render restaurant header after loading', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      // Should show loading initially
      expect(screen.getByText(/Loading visit history/i)).toBeInTheDocument();

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Verify location is displayed
      expect(screen.getByText('Downtown, Test City')).toBeInTheDocument();
    });

    it('should render all visits', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Amazing food')).toBeInTheDocument();
        expect(screen.getByText('Good meal')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should call service methods with correct ID', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(restaurantService.getRestaurantByIdWithLocations).toHaveBeenCalledWith('test-restaurant-id');
        expect(visitService.getAllVisits).toHaveBeenCalledWith('test-restaurant-id');
      });
    });
  });

  describe('Visit Statistics', () => {
    it('should display visit count and date range', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const statsText = screen.getByText(/2 visits.*First:.*Latest:/);
        expect(statsText).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should handle no visits gracefully', async () => {
      vi.mocked(visitService.getAllVisits).mockResolvedValue([]);

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No visits logged yet.')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Note Truncation', () => {
    it('should truncate long notes', async () => {
      const longNote = 'A'.repeat(150);
      const visitsWithLongNote = [{
        ...mockVisits[0],
        experience_notes: longNote,
      }];
      vi.mocked(visitService.getAllVisits).mockResolvedValue(visitsWithLongNote);

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const truncated = 'A'.repeat(120) + '...';
        expect(screen.getByText(truncated)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should expand note when clicked', async () => {
      const longNote = 'A'.repeat(150);
      const visitsWithLongNote = [{
        ...mockVisits[0],
        experience_notes: longNote,
      }];
      vi.mocked(visitService.getAllVisits).mockResolvedValue(visitsWithLongNote);

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      const truncated = 'A'.repeat(120) + '...';

      await waitFor(() => {
        expect(screen.getByText(truncated)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Click to expand
      const noteElement = screen.getByText(truncated);
      fireEvent.click(noteElement);

      // Should show full note
      await waitFor(() => {
        expect(screen.getByText(longNote)).toBeInTheDocument();
      });
    });
  });

  describe('Edit and Delete Actions', () => {
    it('should show edit and delete buttons', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit visit/i });
        const deleteButtons = screen.getAllByRole('button', { name: /delete visit/i });
        expect(editButtons.length).toBeGreaterThan(0);
        expect(deleteButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should open visit modal when edit clicked', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit visit/i });
        fireEvent.click(editButtons[0]);
      }, { timeout: 3000 });

      expect(screen.getByTestId('visit-modal')).toBeInTheDocument();
    });

    it('should show delete confirmation dialog', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete visit/i });
        fireEvent.click(deleteButtons[0]);
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText('Delete Visit')).toBeInTheDocument();
      });
    });

    it('should call deleteVisit when confirmed', async () => {
      vi.mocked(visitService.deleteVisit).mockResolvedValue();

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete visit/i });
        fireEvent.click(deleteButtons[0]);
      }, { timeout: 3000 });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(visitService.deleteVisit).toHaveBeenCalledWith('visit-1');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate back to restaurant details', async () => {
      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back to test restaurant/i });
        fireEvent.click(backButton);
      }, { timeout: 3000 });

      expect(mockNavigate).toHaveBeenCalledWith('/restaurant/test-restaurant-id');
    });

    it('should open website in new tab', async () => {
      const mockWindowOpen = vi.fn();
      const originalOpen = window.open;
      window.open = mockWindowOpen;

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const websiteButton = screen.getByRole('button', { name: /website/i });
        fireEvent.click(websiteButton);
      }, { timeout: 3000 });

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com', '_blank');

      window.open = originalOpen;
    });
  });

  describe('Error Handling', () => {
    it('should navigate home if restaurant not found', async () => {
      vi.mocked(restaurantService.getRestaurantByIdWithLocations).mockRejectedValue(
        new Error('Not found')
      );

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show toast on delete error', async () => {
      vi.mocked(visitService.deleteVisit).mockRejectedValue(
        new Error('Delete failed')
      );

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete visit/i });
        fireEvent.click(deleteButtons[0]);
      }, { timeout: 3000 });

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /^Delete$/i });
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        );
      });
    });
  });

  describe('Special Cases', () => {
    it('should handle migrated placeholder visits', async () => {
      const migratedVisit = {
        ...mockVisits[0],
        is_migrated_placeholder: true,
      };
      vi.mocked(visitService.getAllVisits).mockResolvedValue([migratedVisit]);

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Before 2026')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should not show website button when no website', async () => {
      const restaurantWithoutWebsite = {
        ...mockRestaurant,
        website: undefined,
      };
      vi.mocked(restaurantService.getRestaurantByIdWithLocations).mockResolvedValue(
        restaurantWithoutWebsite
      );

      render(<RestaurantVisits />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.queryByRole('button', { name: /website/i })).not.toBeInTheDocument();
    });
  });
});
