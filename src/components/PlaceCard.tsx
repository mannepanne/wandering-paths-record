import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Star, Globe, Clock, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Restaurant, PersonalAppreciation, RestaurantStatus, APPRECIATION_LEVELS } from "@/types/place";
import { AppreciationPicker } from "@/components/AppreciationPicker";

interface PlaceCardProps {
  place: Restaurant;
  onStatusChange?: (id: string, status: RestaurantStatus, appreciation?: PersonalAppreciation) => void;
  onAppreciationChange?: (id: string, appreciation: PersonalAppreciation) => void;
  onEdit?: (id: string) => void;
}

export const PlaceCard = ({ place, onStatusChange, onAppreciationChange, onEdit }: PlaceCardProps) => {
  const navigate = useNavigate();
  const [showAppreciationPicker, setShowAppreciationPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RestaurantStatus | null>(null);

  const handleCardClick = () => {
    navigate(`/restaurant/${place.id}`);
  };
  const getPriceColor = (priceRange?: string) => {
    switch (priceRange) {
      case '$': return 'bg-olive-green text-white';
      case '$$': return 'bg-burnt-orange text-white';
      case '$$$': return 'bg-deep-burgundy text-white';
      case '$$$$': return 'bg-charcoal text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < rating ? 'fill-burnt-orange text-burnt-orange' : 'text-muted'
        }`}
      />
    ));
  };

  // Phase 4.1: Smart status toggle behavior
  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus: RestaurantStatus = place.status === 'visited' ? 'to-visit' : 'visited';

    // Smart behavior: When marking as visited, show appreciation picker
    if (newStatus === 'visited' && onStatusChange) {
      setPendingStatus(newStatus);
      setShowAppreciationPicker(true);
    } else {
      // Simple toggle for to-visit (rare case)
      onStatusChange?.(place.id, newStatus);
    }
  };

  // Handle appreciation selection from modal
  const handleAppreciationSelect = (appreciation: PersonalAppreciation) => {
    setShowAppreciationPicker(false);
    if (pendingStatus && onStatusChange) {
      // Status change with appreciation (marking as visited)
      onStatusChange(place.id, pendingStatus, appreciation);
    } else if (onAppreciationChange) {
      // Quick rating of already visited restaurant
      onAppreciationChange(place.id, appreciation);
    }
    setPendingStatus(null);
  };

  // Handle skipping appreciation
  const handleAppreciationSkip = () => {
    setShowAppreciationPicker(false);
    if (pendingStatus && onStatusChange) {
      onStatusChange(place.id, pendingStatus); // No appreciation provided
    }
    setPendingStatus(null);
  };

  // Handle quick rate button
  const handleQuickRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAppreciationPicker(true);
  };

  // Handle appreciation picker close
  const handleAppreciationClose = () => {
    setShowAppreciationPicker(false);
    setPendingStatus(null);
  };

  // Get appreciation badge info
  const appreciationLevel = APPRECIATION_LEVELS[place.personal_appreciation || 'unknown'];
  const shouldShowAppreciationBadge = place.personal_appreciation && place.personal_appreciation !== 'unknown';

  // Get tooltip text for appreciation badges
  const getTooltipText = (appreciation: string | undefined) => {
    if (!appreciation || appreciation === 'unknown') {
      return "The appreciation wavefront won't collapse until I visit...";
    }
    return APPRECIATION_LEVELS[appreciation as PersonalAppreciation]?.description || '';
  };

  return (
    <Card className="group hover:card-shadow transition-all duration-200 border-2 border-border bg-card">
      {/* Clickable content area */}
      <div onClick={handleCardClick} className="cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-lg font-geo font-semibold text-foreground">
                {place.name}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {place.cuisine && (
                  <Badge className="bg-burnt-orange text-white font-mono text-xs">
                    {place.cuisine}
                  </Badge>
                )}
                {place.price_range && (
                  <Badge className={`${getPriceColor(place.price_range)} font-mono text-xs`}>
                    {place.price_range}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {place.personal_rating && place.status === 'visited' && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-muted-foreground">Me:</span>
                  {renderStars(place.personal_rating)}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Address and Website row */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="flex items-start gap-2 flex-1 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`;
                window.open(mapsUrl, '_blank');
              }}
            >
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">{place.address}</p>
            </div>
            {place.website && (
              <div
                className="flex items-start gap-2 shrink-0 ml-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(place.website, '_blank');
                }}
              >
                <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">Website</span>
              </div>
            )}
          </div>

          {/* Visit count */}
          {place.visit_count && place.visit_count > 1 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Visited {place.visit_count} times</span>
            </div>
          )}

          {/* Truncated description */}
          {place.description && (
            <div className="text-sm">
              <span className="font-medium text-foreground">Description: </span>
              <p className="text-muted-foreground leading-relaxed line-clamp-2">
                {(() => {
                  const maxLength = 120; // Approximate character limit for 2 lines
                  if (place.description.length <= maxLength) {
                    return place.description;
                  }
                  
                  // Find the last complete word within the limit
                  const truncated = place.description.substring(0, maxLength);
                  const lastSpaceIndex = truncated.lastIndexOf(' ');
                  
                  if (lastSpaceIndex === -1) {
                    // No space found, just truncate at maxLength
                    return truncated + '...';
                  }
                  
                  return truncated.substring(0, lastSpaceIndex) + '...';
                })()}
              </p>
            </div>
          )}
          {/* Personal and Public Ratings row */}
          {(shouldShowAppreciationBadge || !shouldShowAppreciationBadge || place.public_rating) && (
            <div className="flex items-center justify-between text-sm">
              {shouldShowAppreciationBadge ? (
                <div className="flex items-center gap-2">
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Badge className={`${appreciationLevel.badgeStyle} font-mono text-xs border cursor-help`}>
                        <span className="mr-1">{appreciationLevel.icon}</span>
                        {appreciationLevel.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{getTooltipText(place.personal_appreciation)}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-muted-foreground text-xs">(says me)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-mono text-xs border cursor-help">
                        <span className="mr-1">?</span>
                        Schrödinger's cat...
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{getTooltipText(place.personal_appreciation)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              {place.public_rating && (
                <div
                  className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`;
                    window.open(mapsUrl, '_blank');
                  }}
                >
                  <span className="text-xs font-mono">Public:</span>
                  <Star className="w-3 h-3 fill-burnt-orange text-burnt-orange" />
                  <span className="text-xs font-mono">
                    {place.public_rating}/5
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </div>

      {/* Action buttons row */}
      {(onStatusChange || onEdit) && (
        <CardContent className="pt-0">

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            {onStatusChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStatusToggle}
                className="text-xs"
              >
                Mark as {place.status === 'visited' ? 'To Visit' : 'Visited'}
              </Button>
            )}
            {/* Phase 4.1: Quick Rate Button */}
            {(onStatusChange || onAppreciationChange) && place.status === 'visited' && (
              <Button
                variant="brutalist"
                size="sm"
                onClick={handleQuickRate}
                className="text-xs"
                title="Rate your experience"
              >
                <Heart className="w-3 h-3 mr-1" />
                Rate
              </Button>
            )}
            {onEdit && (
              <Button
                variant="brutalist"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(place.id);
                }}
                className="text-xs"
              >
                Edit
              </Button>
            )}
          </div>
        </CardContent>
      )}

      {/* Phase 4.1: Appreciation Picker Modal */}
      <AppreciationPicker
        isOpen={showAppreciationPicker}
        onClose={handleAppreciationClose}
        onSelect={handleAppreciationSelect}
        onSkip={handleAppreciationSkip}
        restaurantName={place.name}
        title={pendingStatus === 'visited' ? "How was your experience?" : "How would you rate this restaurant?"}
      />
    </Card>
  );
};