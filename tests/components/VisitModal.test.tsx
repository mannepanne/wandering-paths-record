// ABOUT: Component tests for VisitModal
// ABOUT: Tests form rendering, validation, submission, and state management

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VisitModal } from '@/components/VisitModal';
import { visitService } from '@/services/visits';

// Mock the visit service
vi.mock('@/services/visits', () => ({
  visitService: {
    addVisit: vi.fn(),
  },
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('VisitModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    restaurantId: 'test-restaurant',
    restaurantName: 'Test Restaurant',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when open', () => {
      render(<VisitModal {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Add Visit' })).toBeInTheDocument();
      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<VisitModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Add Visit')).not.toBeInTheDocument();
    });

    it('should show "Edit Visit" title in edit mode', () => {
      const visitToEdit = {
        id: 'visit-1',
        restaurant_id: 'test-restaurant',
        user_id: 'user-1',
        visit_date: '2026-02-15',
        rating: 'good' as const,
        experience_notes: 'Great meal',
        company_notes: 'With friends',
        is_migrated_placeholder: false,
        created_at: '2026-02-15T12:00:00Z',
        updated_at: '2026-02-15T12:00:00Z',
      };

      render(<VisitModal {...defaultProps} visitToEdit={visitToEdit} />);
      expect(screen.getByText('Edit Visit')).toBeInTheDocument();
    });

    it('should render all rating options', () => {
      render(<VisitModal {...defaultProps} />);

      expect(screen.getByText('Skip this')).toBeInTheDocument();
      expect(screen.getByText("It's fine")).toBeInTheDocument();
      expect(screen.getByText('Recommend')).toBeInTheDocument();
      expect(screen.getByText('Must visit!')).toBeInTheDocument();
    });

    it('should render date input with today as default', () => {
      render(<VisitModal {...defaultProps} />);

      const dateInput = screen.getByLabelText(/visit date/i) as HTMLInputElement;
      expect(dateInput).toBeInTheDocument();
      expect(dateInput.type).toBe('date');

      // Should default to today
      const today = new Date().toISOString().split('T')[0];
      expect(dateInput.value).toBe(today);
    });

    it('should render experience notes textarea', () => {
      render(<VisitModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What did you have/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea.getAttribute('maxLength')).toBe('2000');
    });

    it('should render company notes input', () => {
      render(<VisitModal {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Sarah and Tom/i);
      expect(input).toBeInTheDocument();
      expect(input.getAttribute('maxLength')).toBe('500');
    });

    it('should show character count for experience notes', () => {
      render(<VisitModal {...defaultProps} />);

      expect(screen.getByText('0 / 2000')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without rating', async () => {
      render(<VisitModal {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /Add Visit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a rating')).toBeInTheDocument();
      });
    });

    it('should show error when submitting without date', async () => {
      render(<VisitModal {...defaultProps} />);

      // Select rating
      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      // Clear date by setting empty value
      const dateInput = screen.getByLabelText(/visit date/i) as HTMLInputElement;
      // Remove the required attribute to allow form submission for testing
      dateInput.removeAttribute('required');
      fireEvent.change(dateInput, { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /Add Visit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a visit date')).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update character count when typing in experience notes', () => {
      render(<VisitModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What did you have/i);
      fireEvent.change(textarea, { target: { value: 'Amazing food!' } });

      expect(screen.getByText('13 / 2000')).toBeInTheDocument();
    });

    it('should truncate pasted text exceeding maxLength', () => {
      render(<VisitModal {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/What did you have/i) as HTMLTextAreaElement;
      const longText = 'x'.repeat(3000);

      fireEvent.change(textarea, { target: { value: longText } });

      expect(textarea.value.length).toBe(2000);
      expect(screen.getByText('2000 / 2000')).toBeInTheDocument();
    });

    it('should highlight selected rating', () => {
      render(<VisitModal {...defaultProps} />);

      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      // Check for visual selection (class changes)
      const buttonElement = goodButton.closest('button');
      expect(buttonElement?.className).toContain('ring-2');
    });
  });

  describe('Form Submission', () => {
    it('should call addVisit with correct data', async () => {
      const mockAddVisit = vi.mocked(visitService.addVisit);
      mockAddVisit.mockResolvedValueOnce({
        id: 'new-visit',
        restaurant_id: 'test-restaurant',
        user_id: 'user-1',
        visit_date: '2026-03-01',
        rating: 'good',
        experience_notes: 'Great meal',
        company_notes: 'With Sarah',
        is_migrated_placeholder: false,
        created_at: '2026-03-01T12:00:00Z',
        updated_at: '2026-03-01T12:00:00Z',
      });

      render(<VisitModal {...defaultProps} />);

      // Fill form
      const dateInput = screen.getByLabelText(/visit date/i);
      fireEvent.change(dateInput, { target: { value: '2026-03-01' } });

      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      const experienceTextarea = screen.getByPlaceholderText(/What did you have/i);
      fireEvent.change(experienceTextarea, { target: { value: 'Great meal' } });

      const companyInput = screen.getByPlaceholderText(/Sarah and Tom/i);
      fireEvent.change(companyInput, { target: { value: 'With Sarah' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Visit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAddVisit).toHaveBeenCalledWith({
          restaurant_id: 'test-restaurant',
          visit_date: '2026-03-01',
          rating: 'good',
          experience_notes: 'Great meal',
          company_notes: 'With Sarah',
        });
      });
    });

    it('should call onSuccess after successful submission', async () => {
      const mockAddVisit = vi.mocked(visitService.addVisit);
      mockAddVisit.mockResolvedValueOnce({} as any);

      render(<VisitModal {...defaultProps} />);

      // Select rating
      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Visit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should show error message on submission failure', async () => {
      const mockAddVisit = vi.mocked(visitService.addVisit);
      mockAddVisit.mockRejectedValueOnce(new Error('Network error'));

      render(<VisitModal {...defaultProps} />);

      // Select rating
      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Visit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button while submitting', async () => {
      const mockAddVisit = vi.mocked(visitService.addVisit);
      mockAddVisit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<VisitModal {...defaultProps} />);

      // Select rating
      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Visit/i }) as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(true);
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });
  });

  describe('Form Reset', () => {
    it('should reset form state when modal closes', async () => {
      const { rerender } = render(<VisitModal {...defaultProps} />);

      // Fill form
      const goodButton = screen.getByText('Recommend');
      fireEvent.click(goodButton);

      const experienceTextarea = screen.getByPlaceholderText(/What did you have/i);
      fireEvent.change(experienceTextarea, { target: { value: 'Test notes' } });

      // Close modal
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Reopen modal
      rerender(<VisitModal {...defaultProps} isOpen={false} />);
      rerender(<VisitModal {...defaultProps} isOpen={true} />);

      // Check form is reset
      const textarea = screen.getByPlaceholderText(/What did you have/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
      expect(screen.getByText('0 / 2000')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('should pre-fill form with visit data in edit mode', () => {
      const visitToEdit = {
        id: 'visit-1',
        restaurant_id: 'test-restaurant',
        user_id: 'user-1',
        visit_date: '2026-02-15',
        rating: 'good' as const,
        experience_notes: 'Great meal',
        company_notes: 'With friends',
        is_migrated_placeholder: false,
        created_at: '2026-02-15T12:00:00Z',
        updated_at: '2026-02-15T12:00:00Z',
      };

      render(<VisitModal {...defaultProps} visitToEdit={visitToEdit} />);

      const dateInput = screen.getByLabelText(/visit date/i) as HTMLInputElement;
      expect(dateInput.value).toBe('2026-02-15');

      const experienceTextarea = screen.getByPlaceholderText(/What did you have/i) as HTMLTextAreaElement;
      expect(experienceTextarea.value).toBe('Great meal');

      const companyInput = screen.getByPlaceholderText(/Sarah and Tom/i) as HTMLInputElement;
      expect(companyInput.value).toBe('With friends');
    });

    it('should show "Update Visit" button in edit mode', () => {
      const visitToEdit = {
        id: 'visit-1',
        restaurant_id: 'test-restaurant',
        user_id: 'user-1',
        visit_date: '2026-02-15',
        rating: 'good' as const,
        is_migrated_placeholder: false,
        created_at: '2026-02-15T12:00:00Z',
        updated_at: '2026-02-15T12:00:00Z',
      };

      render(<VisitModal {...defaultProps} visitToEdit={visitToEdit} />);

      expect(screen.getByText('Update Visit')).toBeInTheDocument();
      expect(screen.queryByText('Add Visit')).not.toBeInTheDocument();
    });
  });
});
