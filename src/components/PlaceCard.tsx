import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Star, Globe, Clock } from "lucide-react";

interface Place {
  id: string;
  name: string;
  type: string;
  address: string;
  website?: string;
  rating?: number;
  status: 'must-visit' | 'visited';
  personalRating?: number;
  description?: string;
  visitCount?: number;
  cuisine?: string;
  mustTryDishes?: string[];
}

interface PlaceCardProps {
  place: Place;
  onStatusChange?: (id: string, status: 'must-visit' | 'visited') => void;
  onEdit?: (id: string) => void;
}

export const PlaceCard = ({ place, onStatusChange, onEdit }: PlaceCardProps) => {
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'restaurant': return 'bg-burnt-orange text-white';
      case 'gallery': return 'bg-deep-burgundy text-white';
      case 'library': return 'bg-olive-green text-white';
      case 'bookshop': return 'bg-charcoal text-white';
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

  return (
    <Card className="group hover:card-shadow transition-all duration-200 border-2 border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-lg font-geo font-semibold text-foreground">
              {place.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge className={`${getTypeColor(place.type)} font-mono text-xs`}>
                {place.type}
              </Badge>
              <Badge variant={place.status === 'visited' ? 'default' : 'secondary'} className="font-mono text-xs">
                {place.status}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {place.rating && (
              <div className="flex items-center gap-1">
                {renderStars(place.rating)}
                <span className="text-xs font-mono text-muted-foreground ml-1">
                  {place.rating}/5
                </span>
              </div>
            )}
            {place.personalRating && place.status === 'visited' && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono text-muted-foreground">Me:</span>
                {renderStars(place.personalRating)}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground leading-relaxed">{place.address}</p>
        </div>

        {place.cuisine && (
          <div className="text-sm">
            <span className="font-medium text-foreground">Cuisine: </span>
            <span className="text-muted-foreground">{place.cuisine}</span>
          </div>
        )}

        {place.mustTryDishes && place.mustTryDishes.length > 0 && (
          <div className="text-sm">
            <span className="font-medium text-foreground">Must try: </span>
            <span className="text-muted-foreground">{place.mustTryDishes.join(', ')}</span>
          </div>
        )}

        {place.description && place.status === 'visited' && (
          <div className="text-sm">
            <span className="font-medium text-foreground">My experience: </span>
            <p className="text-muted-foreground mt-1 leading-relaxed">{place.description}</p>
          </div>
        )}

        {place.visitCount && place.visitCount > 1 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Visited {place.visitCount} times</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {place.website && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.open(place.website, '_blank')}
                className="text-xs"
              >
                <Globe className="w-3 h-3" />
                Website
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onStatusChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(place.id, place.status === 'visited' ? 'must-visit' : 'visited')}
                className="text-xs"
              >
                Mark as {place.status === 'visited' ? 'Must Visit' : 'Visited'}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="brutalist"
                size="sm"
                onClick={() => onEdit(place.id)}
                className="text-xs"
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};