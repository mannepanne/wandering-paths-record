import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Star, Globe, ArrowLeft, Phone, Clock } from "lucide-react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { restaurantService } from "@/services/restaurants";
import { Restaurant, RestaurantAddress } from "@/types/place";

const RestaurantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch restaurant with all location details
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantService.getRestaurantByIdWithLocations(id!),
    enabled: !!id,
  });

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

  // Generate location summary (same logic as PlaceCard)
  const getLocationSummary = (restaurant: Restaurant) => {
    if (!restaurant.locations || restaurant.locations.length === 0) {
      return restaurant.address;
    }

    if (restaurant.locations.length === 1) {
      return restaurant.locations[0].full_address || restaurant.address;
    }

    // Multiple locations - create summary like "Multiple locations in London, Manchester, Liverpool & Edinburgh"
    const cities = Array.from(new Set(
      restaurant.locations
        .map(loc => loc.city || '')
        .filter(city => city.trim() !== '')
    ));

    if (cities.length === 0) return restaurant.address;

    if (cities.length <= 3) {
      return `Multiple locations in ${cities.join(', ')}`;
    } else {
      const displayed = cities.slice(0, 2);
      const remaining = cities.length - 2;
      return `Multiple locations in ${displayed.join(', ')} & ${remaining} other cities`;
    }
  };

  // Prepare map data - convert restaurant to array for InteractiveMap
  const mapRestaurants = useMemo(() => {
    if (!restaurant) return [];
    return [restaurant];
  }, [restaurant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b-2 border-border bg-card p-4">
          <div className="container mx-auto flex items-center max-w-6xl">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="border-2 border-border">
            <CardContent className="py-12 text-center">
              <div className="text-lg font-geo font-medium text-foreground mb-2">
                Loading restaurant details...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b-2 border-border bg-card p-4">
          <div className="container mx-auto flex items-center max-w-6xl">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to List
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="border-2 border-border border-red-200">
            <CardContent className="py-12 text-center">
              <div className="text-lg font-geo font-medium text-red-600 mb-2">
                Restaurant not found
              </div>
              <p className="text-muted-foreground">The restaurant you're looking for doesn't exist.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <nav className="border-b-2 border-border bg-card p-4">
        <div className="container mx-auto flex items-center max-w-6xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="border-2 border-border bg-card">
          <CardHeader className="pb-4">
            {/* Restaurant Header - Full Width */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <CardTitle className="text-2xl font-geo font-semibold text-foreground">
                  {restaurant.name}
                </CardTitle>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {restaurant.cuisine && (
                      <Badge className="bg-burnt-orange text-white font-mono text-sm">
                        {restaurant.cuisine}
                      </Badge>
                    )}
                    {restaurant.price_range && (
                      <Badge className={`${getPriceColor(restaurant.price_range)} font-mono text-sm`}>
                        {restaurant.price_range}
                      </Badge>
                    )}
                    <Badge variant={restaurant.status === 'visited' ? 'default' : 'secondary'} className="font-mono text-sm">
                      {restaurant.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{getLocationSummary(restaurant)}</span>
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
              </div>
              <div className="flex flex-col items-end gap-2 ml-6">
                {restaurant.public_rating && (
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(restaurant.public_rating))}
                    <span className="text-sm font-mono text-muted-foreground ml-1">
                      {restaurant.public_rating}/5
                    </span>
                  </div>
                )}
                {restaurant.personal_rating && restaurant.status === 'visited' && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-mono text-muted-foreground">Me:</span>
                    {renderStars(restaurant.personal_rating)}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Three Column Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Column 1: Dietary + Must Try */}
              <div className="space-y-6">
                {restaurant.dietary_options && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Dietary</h3>
                    <p className="text-muted-foreground leading-relaxed">{restaurant.dietary_options}</p>
                  </div>
                )}
                
                {restaurant.must_try_dishes && restaurant.must_try_dishes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Must Try</h3>
                    <div className="space-y-1">
                      {restaurant.must_try_dishes.map((dish, index) => (
                        <p key={index} className="text-muted-foreground">• {dish}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Atmosphere */}
              <div>
                {restaurant.atmosphere && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Atmosphere</h3>
                    <p className="text-muted-foreground leading-relaxed">{restaurant.atmosphere}</p>
                  </div>
                )}
              </div>

              {/* Column 3: Description */}
              <div>
                {restaurant.description && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Description</h3>
                    <p className="text-muted-foreground leading-relaxed">{restaurant.description}</p>
                  </div>
                )}
                
                {restaurant.visit_count && restaurant.visit_count > 1 && (
                  <div className="flex items-center gap-2 text-muted-foreground pt-4">
                    <Clock className="w-4 h-4" />
                    <span>Visited {restaurant.visit_count} times</span>
                  </div>
                )}
              </div>
            </div>

            {/* Locations List */}
            {restaurant.locations && restaurant.locations.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground font-geo text-xl mb-4">
                  {restaurant.locations.length === 1 ? 'Location' : 'Locations'} 
                  {restaurant.locations.length > 1 && ` (${restaurant.locations.length})`}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurant.locations.map((location: RestaurantAddress) => (
                    <Card key={location.id} className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <h4 className="font-medium text-foreground">{location.location_name}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-muted-foreground">{location.full_address}</p>
                          </div>
                          {location.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <p className="text-muted-foreground">{location.phone}</p>
                            </div>
                          )}
                          {location.city && location.country && (
                            <p className="text-xs text-muted-foreground">
                              {location.city}, {location.country}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Full Width Map */}
            <div>
              <h3 className="font-semibold text-foreground font-geo text-xl mb-4">Location on Map</h3>
              <div className="h-96">
                <InteractiveMap 
                  restaurants={mapRestaurants}
                  userLocation={null}
                  isNearMeActive={false}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantDetails;