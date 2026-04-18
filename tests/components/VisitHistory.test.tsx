// ABOUT: Component tests for VisitHistory
// ABOUT: Covers loading/error/empty states, visit rendering, note expansion,
// ABOUT: edit/delete callbacks, and the "view all" link threshold

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { VisitHistory } from '@/components/VisitHistory';
import { visitService } from '@/services/visits';
import type { RestaurantVisit } from '@/types/place';

vi.mock('@/services/visits', () => ({
  visitService: {
    getLatestVisits: vi.fn(),
    getVisitCount: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

const makeVisit = (overrides: Partial<RestaurantVisit> = {}): RestaurantVisit => ({
  id: 'visit-1',
  restaurant_id: 'r1',
  user_id: 'u1',
  visit_date: '2026-04-18',
  rating: 'good',
  experience_notes: 'Great meal',
  company_notes: 'With friends',
  is_migrated_placeholder: false,
  created_at: '2026-04-18T12:00:00Z',
  updated_at: '2026-04-18T12:00:00Z',
  ...overrides,
});

describe('VisitHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(visitService.getLatestVisits).mockImplementation(() => new Promise(() => {}));
    vi.mocked(visitService.getVisitCount).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    expect(screen.getByText('Loading visits...')).toBeInTheDocument();
  });

  it('renders error state when service throws', async () => {
    vi.mocked(visitService.getLatestVisits).mockRejectedValue(new Error('boom'));
    vi.mocked(visitService.getVisitCount).mockResolvedValue(0);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    await waitFor(() => {
      expect(screen.getByText('Failed to load visit history')).toBeInTheDocument();
    });
  });

  it('renders empty state when no visits exist', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(0);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    await waitFor(() => {
      expect(screen.getByText('No visits logged yet.')).toBeInTheDocument();
    });
  });

  it('renders visit with date, badge label, and notes', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([makeVisit()]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    renderWithRouter(<VisitHistory restaurantId="r1" />);

    await waitFor(() => {
      expect(screen.getByText('Apr 18, 2026')).toBeInTheDocument();
    });
    expect(screen.getByText('Recommend')).toBeInTheDocument();
    expect(screen.getByText('Great meal')).toBeInTheDocument();
    expect(screen.getByText('With friends')).toBeInTheDocument();
  });

  it('renders "Before 2026" label for migrated placeholder visits', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([
      makeVisit({ is_migrated_placeholder: true }),
    ]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    await waitFor(() => {
      expect(screen.getByText('Before 2026')).toBeInTheDocument();
    });
  });

  it('shows total count without view-all link when count ≤ 2', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([makeVisit()]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(2);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    await waitFor(() => {
      expect(screen.getByText(/2 visits/)).toBeInTheDocument();
    });
    expect(screen.queryByText('view all')).not.toBeInTheDocument();
  });

  it('shows view-all link when visit count exceeds preview size', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([makeVisit()]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(5);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    const link = await screen.findByText('view all');

    fireEvent.click(link);
    expect(mockNavigate).toHaveBeenCalledWith('/restaurant/r1/visits');
  });

  it('truncates long notes and expands on click', async () => {
    const longNote = 'x'.repeat(100);
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([
      makeVisit({ experience_notes: longNote }),
    ]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    const truncated = await screen.findByText(`${'x'.repeat(60)}...`);

    fireEvent.click(truncated);
    await waitFor(() => {
      expect(screen.getByText(longNote)).toBeInTheDocument();
    });
  });

  it('calls onEdit with the visit when edit button is clicked', async () => {
    const visit = makeVisit();
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([visit]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    const onEdit = vi.fn();
    renderWithRouter(<VisitHistory restaurantId="r1" onEdit={onEdit} />);

    const btn = await screen.findByRole('button', { name: /edit visit/i });
    fireEvent.click(btn);
    expect(onEdit).toHaveBeenCalledWith(visit);
  });

  it('calls onDelete with the visit when delete button is clicked', async () => {
    const visit = makeVisit();
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([visit]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    const onDelete = vi.fn();
    renderWithRouter(<VisitHistory restaurantId="r1" onDelete={onDelete} />);

    const btn = await screen.findByRole('button', { name: /delete visit/i });
    fireEvent.click(btn);
    expect(onDelete).toHaveBeenCalledWith(visit);
  });

  it('hides edit/delete controls when no callbacks are provided', async () => {
    vi.mocked(visitService.getLatestVisits).mockResolvedValue([makeVisit()]);
    vi.mocked(visitService.getVisitCount).mockResolvedValue(1);

    renderWithRouter(<VisitHistory restaurantId="r1" />);
    await screen.findByText('Apr 18, 2026');

    expect(screen.queryByRole('button', { name: /edit visit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete visit/i })).not.toBeInTheDocument();
  });
});
