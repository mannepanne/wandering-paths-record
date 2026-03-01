// ABOUT: Component to display visit history for a restaurant
// ABOUT: Shows list of visits with dates, ratings, and notes (read-only)

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { RestaurantVisit } from '@/types/place';
import { APPRECIATION_LEVELS } from '@/types/place';
import { visitService } from '@/services/visits';

interface VisitHistoryProps {
  restaurantId: string;
}

export const VisitHistory = ({ restaurantId }: VisitHistoryProps) => {
  const [visits, setVisits] = useState<RestaurantVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVisits();
  }, [restaurantId]);

  const loadVisits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await visitService.getLatestVisits(restaurantId, 5);
      setVisits(data);
    } catch (err) {
      console.error('Error loading visits:', err);
      setError('Failed to load visit history');
    } finally {
      setLoading(false);
    }
  };

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
          Visit History
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({visits.length} {visits.length === 1 ? 'visit' : 'visits'})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {visits.map((visit) => {
          const appreciationLevel = APPRECIATION_LEVELS[visit.rating];
          return (
            <div
              key={visit.id}
              className="pb-4 border-b last:border-b-0 last:pb-0"
            >
              {/* Visit Date */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatVisitDate(visit)}
                </span>
              </div>

              {/* Rating Badge */}
              <div className="mb-2">
                <Badge
                  className={`${appreciationLevel.badgeStyle} border`}
                  variant="outline"
                >
                  <span className="mr-1">{appreciationLevel.icon}</span>
                  {appreciationLevel.label}
                </Badge>
              </div>

              {/* Experience Notes */}
              {visit.experience_notes && (
                <div className="mb-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {visit.experience_notes}
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
