// ABOUT: Component to display visit history for a restaurant
// ABOUT: Shows latest 2 visits with link to full history page

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, User, Edit2, Trash2 } from 'lucide-react';
import { RestaurantVisit } from '@/types/place';
import { APPRECIATION_LEVELS } from '@/types/place';
import { visitService } from '@/services/visits';

interface VisitHistoryProps {
  restaurantId: string;
  onEdit?: (visit: RestaurantVisit) => void;
  onDelete?: (visit: RestaurantVisit) => void;
}

export const VisitHistory = ({ restaurantId, onEdit, onDelete }: VisitHistoryProps) => {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<RestaurantVisit[]>([]);
  const [totalVisitCount, setTotalVisitCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadVisits = async () => {
      try {
        setLoading(true);
        setError(null);
        // Load latest 2 visits for preview
        const data = await visitService.getLatestVisits(restaurantId, 2);
        setVisits(data);

        // Get total visit count
        const count = await visitService.getVisitCount(restaurantId);
        setTotalVisitCount(count);
      } catch (err) {
        console.error('Error loading visits:', err);
        setError('Failed to load visit history');
      } finally {
        setLoading(false);
      }
    };

    loadVisits();
  }, [restaurantId]);

  const formatVisitDate = (visit: RestaurantVisit): string => {
    if (visit.is_migrated_placeholder) {
      return 'Before 2026';
    }
    // Format date as "Jan 15, 2026"
    const date = new Date(visit.visit_date);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Toggle note expansion
  const toggleNoteExpansion = (visitId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  // Check if note should be truncated (more than 1 line ~60 chars)
  const shouldTruncateNote = (note: string) => {
    return note.length > 60;
  };

  const truncateNote = (note: string) => {
    if (note.length <= 60) return note;
    return note.substring(0, 60) + '...';
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Visit History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading visits...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Visit History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Visit History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No visits logged yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Visits (
          {totalVisitCount === 1 ? (
            '1 visit'
          ) : totalVisitCount <= 2 ? (
            `${totalVisitCount} visits`
          ) : (
            <>
              {totalVisitCount} visits,{' '}
              <button
                onClick={() => navigate(`/restaurant/${restaurantId}/visits`)}
                className="text-burnt-orange hover:text-burnt-orange/80 font-normal transition-colors"
              >
                view all
              </button>
            </>
          )}
          )
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {visits.map((visit) => {
          const appreciationLevel = APPRECIATION_LEVELS[visit.rating];
          const isExpanded = expandedNotes.has(visit.id);
          const noteTruncated = visit.experience_notes && shouldTruncateNote(visit.experience_notes);

          return (
            <div
              key={visit.id}
              className="pb-3 last:pb-0"
            >
              {/* Visit Date, Rating Badge, and Actions */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {formatVisitDate(visit)}
                  </span>
                </div>

                {/* Rating Badge and Edit/Delete Actions */}
                <div className="flex items-center gap-2">
                  <Badge
                    className={`${appreciationLevel.badgeStyle} border text-xs`}
                    variant="outline"
                  >
                    <span className="mr-1">{appreciationLevel.icon}</span>
                    {appreciationLevel.label}
                  </Badge>

                  {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(visit)}
                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span className="sr-only">Edit visit</span>
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(visit)}
                          className="h-7 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="sr-only">Delete visit</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Notes - Truncated with click to expand */}
              {visit.experience_notes && (
                <div className="mb-1">
                  <p
                    className="text-sm text-foreground whitespace-pre-wrap cursor-pointer hover:text-foreground/80"
                    onClick={() => noteTruncated && toggleNoteExpansion(visit.id)}
                  >
                    {isExpanded || !noteTruncated
                      ? visit.experience_notes
                      : truncateNote(visit.experience_notes)}
                  </p>
                </div>
              )}

              {/* Company Notes */}
              {visit.company_notes && (
                <div className="flex items-start gap-2">
                  <User className="w-3 h-3 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {visit.company_notes}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
