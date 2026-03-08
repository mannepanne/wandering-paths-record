// ABOUT: Dedicated page for viewing all visits to a specific restaurant
// ABOUT: Shows restaurant header, description, and full visit timeline with stats

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Globe, Calendar, User, Edit2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { restaurantService } from "@/services/restaurants";
import { visitService } from "@/services/visits";
import { Restaurant, RestaurantVisit, APPRECIATION_LEVELS } from "@/types/place";
import { useAuth } from "@/contexts/AuthContext";
import { VisitModal } from "@/components/VisitModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const RestaurantVisits = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [visits, setVisits] = useState<RestaurantVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitToEdit, setVisitToEdit] = useState<RestaurantVisit | undefined>(undefined);
  const [visitToDelete, setVisitToDelete] = useState<RestaurantVisit | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Fetch restaurant details
  const { data: restaurant, isLoading: isLoadingRestaurant } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantService.getRestaurantByIdWithLocations(id!),
    enabled: !!id,
  });

  // Load all visits
  useEffect(() => {
    const loadVisits = async () => {
      if (!id) return;

      try {
        setLoadingVisits(true);
        const data = await visitService.getAllVisits(id);
        setVisits(data);
      } catch (err) {
        console.error('Error loading visits:', err);
        toast({
          title: "Error",
          description: "Failed to load visit history",
          variant: "destructive",
        });
      } finally {
        setLoadingVisits(false);
      }
    };

    loadVisits();
  }, [id, toast]);

  const getPriceColor = (priceRange?: string) => {
    switch (priceRange) {
      case '$': return 'bg-olive-green text-white';
      case '$$': return 'bg-burnt-orange text-white';
      case '$$$': return 'bg-deep-burgundy text-white';
      case '$$$$': return 'bg-charcoal text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getGoogleMapsUrl = (restaurant: Restaurant) => {
    const restaurantName = restaurant.name || '';
    const location = restaurant.locations?.[0];

    if (location) {
      const fullAddress = location.full_address || '';
      const country = location.country || '';
      const query = `${restaurantName} ${fullAddress} ${country}`.trim();
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    } else {
      const query = `${restaurantName} ${restaurant.address}`.trim();
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
  };

  const getHeaderLocationDisplay = (restaurant: Restaurant) => {
    if (!restaurant.locations || restaurant.locations.length === 0) {
      return restaurant.address;
    }

    const location = restaurant.locations[0];
    const locationName = location.location_name?.trim() || '';
    const city = location.city?.trim() || '';

    if (locationName && city && locationName.toLowerCase() === city.toLowerCase()) {
      return city;
    }

    if (locationName && city) {
      return `${locationName}, ${city}`;
    }

    return locationName || city || restaurant.address;
  };

  const formatVisitDate = (visit: RestaurantVisit): string => {
    if (visit.is_migrated_placeholder) {
      return 'Before 2026';
    }
    const date = new Date(visit.visit_date);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate visit stats
  const getVisitStats = () => {
    if (visits.length === 0) return null;

    const sortedVisits = [...visits].sort((a, b) =>
      new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
    );

    const firstVisit = sortedVisits[0];
    const latestVisit = sortedVisits[sortedVisits.length - 1];

    return {
      total: visits.length,
      first: formatVisitDate(firstVisit),
      latest: formatVisitDate(latestVisit),
    };
  };

  const stats = getVisitStats();

  // Handle edit visit
  const handleEditVisit = (visit: RestaurantVisit) => {
    setVisitToEdit(visit);
    setShowVisitModal(true);
  };

  // Handle delete visit
  const handleDeleteVisit = (visit: RestaurantVisit) => {
    setVisitToDelete(visit);
  };

  // Confirm delete visit
  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;

    try {
      await visitService.deleteVisit(visitToDelete.id);

      // Refresh visits list
      const updatedVisits = await visitService.getAllVisits(id!);
      setVisits(updatedVisits);

      // Invalidate restaurant queries
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });

      toast({
        title: "Visit deleted",
        description: "Visit has been removed from your history.",
      });
    } catch (err) {
      console.error('Error deleting visit:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete visit",
        variant: "destructive",
      });
    } finally {
      setVisitToDelete(null);
    }
  };

  // Handle visit modal close
  const handleVisitModalClose = () => {
    setShowVisitModal(false);
    setVisitToEdit(undefined);
  };

  // Handle successful visit save
  const handleVisitSuccess = async () => {
    // Refresh visits list
    const updatedVisits = await visitService.getAllVisits(id!);
    setVisits(updatedVisits);

    // Invalidate restaurant queries
    queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
    queryClient.invalidateQueries({ queryKey: ["restaurants"] });

    toast({
      title: visitToEdit ? "Visit updated!" : "Visit logged!",
      description: visitToEdit ? "Your visit has been updated." : "Your visit has been saved successfully.",
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

  // Check if note should be truncated (more than 2 lines ~120 chars)
  const shouldTruncateNote = (note: string) => {
    return note.length > 120;
  };

  const truncateNote = (note: string) => {
    if (note.length <= 120) return note;
    return note.substring(0, 120) + '...';
  };

  if (isLoadingRestaurant || loadingVisits) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b-2 border-border bg-card p-4">
          <div className="container mx-auto flex items-center max-w-6xl">
            <Button
              variant="ghost"
              onClick={() => navigate(`/restaurant/${id}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="border-2 border-border">
            <CardContent className="py-12 text-center">
              <div className="text-lg font-geo font-medium text-foreground mb-2">
                Loading visit history...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <nav className="border-b-2 border-border bg-card p-4">
        <div className="container mx-auto flex items-center max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate(`/restaurant/${id}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {restaurant.name}
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="border-2 border-border bg-card">
          <CardHeader className="pb-4">
            {/* Row 1: Restaurant Name + Location/Website */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <CardTitle className="text-2xl font-geo font-semibold text-foreground">
                {restaurant.name}
              </CardTitle>
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <a
                    href={getGoogleMapsUrl(restaurant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {getHeaderLocationDisplay(restaurant)}
                  </a>
                </div>
                {restaurant.website && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(restaurant.website, '_blank')}
                    className="gap-2 text-sm"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </Button>
                )}
              </div>
            </div>

            {/* Row 2: Badges */}
            <div className="flex items-center gap-3 flex-wrap">
              {(restaurant.cuisine_primary || restaurant.cuisine) && (
                <Badge className="bg-burnt-orange text-white font-mono text-sm">
                  {restaurant.cuisine_primary || restaurant.cuisine}
                  {restaurant.cuisine_secondary && ` / ${restaurant.cuisine_secondary}`}
                </Badge>
              )}
              {restaurant.style && (
                <Badge className="bg-olive-green text-white font-mono text-sm">
                  {restaurant.style}
                </Badge>
              )}
              {restaurant.venue && (
                <Badge className="bg-charcoal text-white font-mono text-sm">
                  {restaurant.venue}
                </Badge>
              )}
              {restaurant.price_range && (
                <Badge className={`${getPriceColor(restaurant.price_range)} font-mono text-sm`}>
                  {restaurant.price_range}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Description */}
            {restaurant.description && (
              <div>
                <p className="text-muted-foreground leading-relaxed">{restaurant.description}</p>
              </div>
            )}

            {/* Visit Stats and Timeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground font-geo text-xl">
                  Visit History
                </h3>
                {stats && (
                  <div className="text-sm text-muted-foreground">
                    {stats.total} {stats.total === 1 ? 'visit' : 'visits'} • First: {stats.first} • Latest: {stats.latest}
                  </div>
                )}
              </div>

              {visits.length === 0 ? (
                <p className="text-muted-foreground">No visits logged yet.</p>
              ) : (
                <div className="space-y-6">
                  {visits.map((visit) => {
                    const appreciationLevel = APPRECIATION_LEVELS[visit.rating];
                    const isExpanded = expandedNotes.has(visit.id);
                    const noteTruncated = visit.experience_notes && shouldTruncateNote(visit.experience_notes);

                    return (
                      <div
                        key={visit.id}
                        className="pb-6 border-b last:border-b-0 last:pb-0"
                      >
                        {/* Visit Date and Actions */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-base font-medium">
                              {formatVisitDate(visit)}
                            </span>
                          </div>

                          {/* Edit/Delete Actions - only show if user is logged in */}
                          {user && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVisit(visit)}
                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span className="sr-only">Edit visit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteVisit(visit)}
                                className="h-8 px-2 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span className="sr-only">Delete visit</span>
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Rating Badge */}
                        <div className="mb-3">
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
                          <div className="mb-3">
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit Modal - Add/Edit Visits */}
      {restaurant && (
        <VisitModal
          isOpen={showVisitModal}
          onClose={handleVisitModalClose}
          onSuccess={handleVisitSuccess}
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          visitToEdit={visitToEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!visitToDelete} onOpenChange={(open) => !open && setVisitToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this visit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVisit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantVisits;
