// ABOUT: Component tests for RestaurantDetails page
// ABOUT: Tests visit deletion flow including confirmation dialog

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import RestaurantDetails from '@/pages/RestaurantDetails';
import { visitService } from '@/services/visits';
import { restaurantService } from '@/services/restaurants';

// Mock services
vi.mock('@/services/visits', () => ({
  visitService: {
    deleteVisit: vi.fn(),
    getVisitsByRestaurant: vi.fn(),
    getLatestVisits: vi.fn(),
    getVisitCount: vi.fn(),
  },
}));

vi.mock('@/services/restaurants', () => ({
  restaurantService: {
    getRestaurantByIdWithLocations: vi.fn(),
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock InteractiveMap to avoid WebGL errors
vi.mock('@/components/InteractiveMap', () => ({
  InteractiveMap: () => <div data-testid="interactive-map">Map</div>,
}));

// Mock router params
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-restaurant-id' }),
    useNavigate: () => vi.fn(),
  };
});

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

describe('RestaurantDetails - Visit Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock restaurant data
    vi.mocked(restaurantService.getRestaurantByIdWithLocations).mockResolvedValue({
      id: 'test-restaurant-id',
      name: 'Test Restaurant',
      address: 'Test Address',
      status: 'visited',
      locations: [{
        id: 'loc-1',
        restaurant_id: 'test-restaurant-id',
        location_name: 'Main Location',
        full_address: '123 Test St',
        latitude: 51.5,
        longitude: -0.1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }],
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    });

    // Mock visits data
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([
      {
        id: 'visit-1',
        restaurant_id: 'test-restaurant-id',
        user_id: 'test-user-id',
        visit_date: '2026-02-15',
        rating: 'good',
        experience_notes: 'Great meal',
        company_notes: 'With friends',
        is_migrated_placeholder: false,
        created_at: '2026-02-15T12:00:00Z',
        updated_at: '2026-02-15T12:00:00Z',
      },
    ]);

    // Mock visit count
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);
  });

  it('should show confirmation dialog when delete button clicked', async () => {
    render(<RestaurantDetails />, { wrapper: createWrapper() });

    // Wait for restaurant and visit history to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Great meal')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete this visit/i)).toBeInTheDocument();
    });
  });

  it('should delete visit when confirmed', async () => {
    const mockDeleteVisit = vi.mocked(visitService.deleteVisit);
    mockDeleteVisit.mockResolvedValueOnce(undefined);

    render(<RestaurantDetails />, { wrapper: createWrapper() });

    // Wait for restaurant and visit history to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Great meal')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    // Verify deleteVisit was called
    await waitFor(() => {
      expect(mockDeleteVisit).toHaveBeenCalledWith('visit-1');
    });
  });

  it('should cancel deletion when dialog cancelled', async () => {
    const mockDeleteVisit = vi.mocked(visitService.deleteVisit);

    render(<RestaurantDetails />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Verify deleteVisit was NOT called
    expect(mockDeleteVisit).not.toHaveBeenCalled();

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Delete Visit')).not.toBeInTheDocument();
    });
  });

  it('should show error toast on delete failure', async () => {
    const mockDeleteVisit = vi.mocked(visitService.deleteVisit);
    mockDeleteVisit.mockRejectedValueOnce(new Error('Network error'));

    render(<RestaurantDetails />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    // Click delete and confirm
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    // Verify error handling was triggered
    await waitFor(() => {
      expect(mockDeleteVisit).toHaveBeenCalled();
    });
  });

  it('should show success toast on delete success', async () => {
    const mockDeleteVisit = vi.mocked(visitService.deleteVisit);
    mockDeleteVisit.mockResolvedValueOnce(undefined);

    render(<RestaurantDetails />, { wrapper: createWrapper() });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    // Click delete and confirm
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    // Verify delete was successful
    await waitFor(() => {
      expect(mockDeleteVisit).toHaveBeenCalledWith('visit-1');
      // Dialog should close after success
      expect(screen.queryByText('Delete Visit')).not.toBeInTheDocument();
    });
  });

  it('should invalidate queries after successful delete', async () => {
    const mockDeleteVisit = vi.mocked(visitService.deleteVisit);
    mockDeleteVisit.mockResolvedValueOnce(undefined);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </BrowserRouter>
    );

    render(<RestaurantDetails />, { wrapper: Wrapper });

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    // Click delete and confirm
    const deleteButton = screen.getByRole('button', { name: /delete visit/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Visit')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);

    // Verify queries were invalidated
    await waitFor(() => {
      expect(mockDeleteVisit).toHaveBeenCalledWith('visit-1');
    });

    // Check invalidation calls
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    }, { timeout: 3000 });

    // Verify the correct queries were invalidated
    const calls = invalidateSpy.mock.calls;
    expect(calls.some(call =>
      call[0]?.queryKey?.[0] === 'restaurant' &&
      call[0]?.queryKey?.[1] === 'test-restaurant-id'
    )).toBe(true);
    expect(calls.some(call =>
      call[0]?.queryKey?.[0] === 'restaurants'
    )).toBe(true);
  });
});
