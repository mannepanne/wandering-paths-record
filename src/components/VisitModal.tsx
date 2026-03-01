// ABOUT: Modal component for adding (and future editing) restaurant visits
// ABOUT: Handles date selection, rating, and notes for visit logging

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PersonalAppreciation, APPRECIATION_LEVELS, RestaurantVisit } from '@/types/place';
import { visitService, CreateVisitInput } from '@/services/visits';

interface VisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  restaurantId: string;
  restaurantName: string;
  visitToEdit?: RestaurantVisit; // For Phase 4 - edit functionality
}

export const VisitModal = ({
  isOpen,
  onClose,
  onSuccess,
  restaurantId,
  restaurantName,
  visitToEdit,
}: VisitModalProps) => {
  const isEditMode = !!visitToEdit;

  // Form state
  const [visitDate, setVisitDate] = useState<string>('');
  const [rating, setRating] = useState<PersonalAppreciation | null>(null);
  const [experienceNotes, setExperienceNotes] = useState<string>('');
  const [companyNotes, setCompanyNotes] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with today's date (or edit data in Phase 4)
  useEffect(() => {
    if (isOpen) {
      if (visitToEdit) {
        // Phase 4: Pre-fill with existing visit data
        setVisitDate(visitToEdit.visit_date);
        setRating(visitToEdit.rating);
        setExperienceNotes(visitToEdit.experience_notes || '');
        setCompanyNotes(visitToEdit.company_notes || '');
      } else {
        // Default to today's date for new visits
        const today = new Date().toISOString().split('T')[0];
        setVisitDate(today);
        setRating(null);
        setExperienceNotes('');
        setCompanyNotes('');
      }
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, visitToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!visitDate) {
      setError('Please select a visit date');
      return;
    }

    if (!rating) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const visitData: CreateVisitInput = {
        restaurant_id: restaurantId,
        visit_date: visitDate,
        rating: rating,
        experience_notes: experienceNotes.trim() || undefined,
        company_notes: companyNotes.trim() || undefined,
      };

      if (isEditMode) {
        // Phase 4: Update existing visit
        // await visitService.updateVisit(visitToEdit.id, visitData);
        console.log('Edit mode - Phase 4 implementation');
      } else {
        // Phase 3: Create new visit
        await visitService.addVisit(visitData);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to save visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-geo">
            {isEditMode ? 'Edit Visit' : 'Add Visit'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            <strong>{restaurantName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Visit Date */}
          <div className="space-y-2">
            <Label htmlFor="visit-date" className="text-sm font-medium">
              Visit Date *
            </Label>
            <Input
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Can't be in future
              required
              className="w-full"
            />
          </div>

          {/* Rating Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Rating *</Label>
            <div className="space-y-2">
              {(Object.values(APPRECIATION_LEVELS).filter(level => level.value !== 'unknown')).map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setRating(level.value)}
                  className={`
                    w-full p-3 rounded-lg border-2 text-left transition-all duration-200
                    ${rating === level.value
                      ? 'border-primary bg-primary/5 ring-2 ring-primary ring-offset-2'
                      : 'border-border bg-background hover:border-primary/50'
                    }
                    hover:scale-[1.01] active:scale-[0.99]
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5 flex-shrink-0">
                      {level.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {level.label}
                      </div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {level.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Experience Notes */}
          <div className="space-y-2">
            <Label htmlFor="experience-notes" className="text-sm font-medium">
              Experience Notes
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Textarea
              id="experience-notes"
              placeholder="What did you have? How was it? Any memorable details?"
              value={experienceNotes}
              onChange={(e) => setExperienceNotes(e.target.value)}
              maxLength={2000}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {experienceNotes.length} / 2000
            </p>
          </div>

          {/* Company Notes */}
          <div className="space-y-2">
            <Label htmlFor="company-notes" className="text-sm font-medium">
              Who were you with?
              <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              id="company-notes"
              type="text"
              placeholder="e.g., Sarah and Tom"
              value={companyNotes}
              onChange={(e) => setCompanyNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brutalist"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Visit' : 'Add Visit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
