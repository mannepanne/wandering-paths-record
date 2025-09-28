import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Star, Globe, ArrowLeft, Phone, Clock, Heart, Plus, Shield } from "lucide-react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { restaurantService } from "@/services/restaurants";
import { Restaurant, RestaurantAddress, APPRECIATION_LEVELS, PersonalAppreciation, RestaurantStatus } from "@/types/place";
import { useAuth } from "@/contexts/AuthContext";
import { AppreciationPicker } from "@/components/AppreciationPicker";

const RestaurantDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [showAppreciationPicker, setShowAppreciationPicker] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RestaurantStatus | null>(null);

  // Fetch restaurant with all location details
  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ["restaurant", id],
    queryFn: () => restaurantService.getRestaurantByIdWithLocations(id!),
    enabled: !!id,
  });

  // Mutations for status and appreciation updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, appreciation }: { id: string; status: RestaurantStatus; appreciation?: PersonalAppreciation; }) => {
      if (appreciation) {
        return restaurantService.updateRestaurantStatusWithAppreciation(id, status, appreciation);
      } else {
        return restaurantService.updateRestaurantStatus(id, status);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    }
  });

  const updateAppreciationMutation = useMutation({
    mutationFn: ({ id, appreciation }: { id: string; appreciation: PersonalAppreciation }) =>
      restaurantService.updateRestaurantAppreciation(id, appreciation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
    }
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

  // Get appreciation badge info (same logic as PlaceCard)
  const appreciationLevel = restaurant ? APPRECIATION_LEVELS[restaurant.personal_appreciation || 'unknown'] : APPRECIATION_LEVELS.unknown;
  const shouldShowAppreciationBadge = restaurant?.personal_appreciation && restaurant.personal_appreciation !== 'unknown';

  // Get tooltip text for appreciation badges (same as PlaceCard)
  const getTooltipText = (appreciation: string | undefined) => {
    if (!appreciation || appreciation === 'unknown') {
      return "The appreciation wavefront won't collapse until I visit...";
    }
    return APPRECIATION_LEVELS[appreciation as PersonalAppreciation]?.description || '';
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

  // Generate header location display - shows location_name and city, avoiding duplication
  const getHeaderLocationDisplay = (restaurant: Restaurant) => {
    if (!restaurant.locations || restaurant.locations.length === 0) {
      return restaurant.address;
    }

    if (restaurant.locations.length === 1) {
      const location = restaurant.locations[0];
      const locationName = location.location_name?.trim() || '';
      const city = location.city?.trim() || '';

      // If location_name and city are the same, only show city
      if (locationName && city && locationName.toLowerCase() === city.toLowerCase()) {
        return city;
      }

      // If both exist and are different, show both
      if (locationName && city) {
        return `${locationName}, ${city}`;
      }

      // If only one exists, show it
      return locationName || city || restaurant.address;
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

  // Smart status toggle behavior (same as PlaceCard)
  const handleStatusToggle = () => {
    if (!restaurant) return;

    const newStatus: RestaurantStatus = restaurant.status === 'visited' ? 'to-visit' : 'visited';

    // Smart behavior: When marking as visited, show appreciation picker
    if (newStatus === 'visited') {
      setPendingStatus(newStatus);
      setShowAppreciationPicker(true);
    } else {
      // When toggling back to to-visit, reset appreciation to unknown
      updateStatusMutation.mutate({
        id: restaurant.id,
        status: newStatus,
        personal_appreciation: 'unknown'
      });
    }
  };

  // Handle appreciation selection from modal
  const handleAppreciationSelect = (appreciation: PersonalAppreciation) => {
    if (!restaurant) return;

    setShowAppreciationPicker(false);
    if (pendingStatus) {
      // Status change with appreciation (marking as visited)
      updateStatusMutation.mutate({ id: restaurant.id, status: pendingStatus, appreciation });
    } else {
      // Quick rating of already visited restaurant
      updateAppreciationMutation.mutate({ id: restaurant.id, appreciation });
    }
    setPendingStatus(null);
  };

  // Handle skipping appreciation
  const handleAppreciationSkip = () => {
    if (!restaurant) return;

    setShowAppreciationPicker(false);
    if (pendingStatus) {
      updateStatusMutation.mutate({ id: restaurant.id, status: pendingStatus }); // No appreciation provided
    }
    setPendingStatus(null);
  };

  // Handle quick rate button
  const handleQuickRate = () => {
    setShowAppreciationPicker(true);
  };

  // Handle appreciation picker close
  const handleAppreciationClose = () => {
    setShowAppreciationPicker(false);
    setPendingStatus(null);
  };

  // Generate Google Maps URL for a specific location
  const getGoogleMapsUrl = (restaurant: Restaurant, location?: RestaurantAddress, isHeaderLink: boolean = false) => {
    const restaurantName = restaurant.name || '';

    // For header link on multi-location restaurants, search just the brand name + "restaurant"
    if (isHeaderLink && restaurant.locations && restaurant.locations.length > 1) {
      const query = `${restaurantName} restaurant`.trim();
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }

    if (location) {
      // Specific location - use full address, restaurant name, and country
      const fullAddress = location.full_address || '';
      const country = location.country || '';
      const query = `${restaurantName} ${fullAddress} ${country}`.trim();
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    } else {
      // Fallback to restaurant address if no specific location
      const query = `${restaurantName} ${restaurant.address}`.trim();
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    }
  };

  // Prepare map data - convert restaurant to array for InteractiveMap
  const mapRestaurants = useMemo(() => {
    if (!restaurant) return [];
    return [restaurant];
  }, [restaurant]);

  // Component for rendering expandable must try dishes
  const MustTryDishes = ({ dishes }: { dishes: string[] }) => {
    const maxVisible = 1;
    const hasMore = dishes.length > maxVisible;
    const visibleDishes = showAllDishes ? dishes : dishes.slice(0, maxVisible);
    const hiddenCount = dishes.length - maxVisible;

    // Function to capitalize first letter of each word
    const capitalizeWords = (str: string) => {
      return str.replace(/\b\w/g, (char) => char.toUpperCase());
    };

    return (
      <div className="space-y-1">
        {visibleDishes.map((dish, index) => (
          <p key={index} className="text-muted-foreground">• {capitalizeWords(dish)}</p>
        ))}
        {hasMore && !showAllDishes && (
          <button
            onClick={() => setShowAllDishes(true)}
            className="text-burnt-orange hover:text-burnt-orange/80 text-sm transition-colors"
          >
            ...and {hiddenCount} more, tap to expand
          </button>
        )}
        {showAllDishes && hasMore && (
          <button
            onClick={() => setShowAllDishes(false)}
            className="text-burnt-orange hover:text-burnt-orange/80 text-sm transition-colors"
          >
            Show less
          </button>
        )}
      </div>
    );
  };

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
        <div className="container mx-auto flex items-center justify-between max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>

          {/* Admin buttons - only show if user is logged in */}
          {user && restaurant && (
            <div className="flex gap-2">
              {/* Mark as Visited/To Visit */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleStatusToggle}
                className="text-xs"
              >
                Mark as {restaurant.status === 'visited' ? 'To Visit' : 'Visited'}
              </Button>

              {/* Rate button (for visited restaurants) */}
              {restaurant.status === 'visited' && (
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

              {/* Edit button */}
              <Button
                variant="brutalist"
                size="sm"
                onClick={() => {
                  navigate('/?edit=' + restaurant.id);
                }}
                className="text-xs"
              >
                Edit
              </Button>

              {/* Admin panel button */}
              <Button
                variant="brutalist"
                size="sm"
                onClick={() => {
                  navigate('/?admin=true');
                }}
                className="text-xs"
              >
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Button>
            </div>
          )}
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <a
                        href={getGoogleMapsUrl(restaurant, restaurant.locations?.[0], true)}
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
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Dynamic Layout Based on Location Count */}
            {restaurant.locations && restaurant.locations.length === 1 ? (
              /* Single Location Layout: Description full-width top, then 3 columns with Location + Dietary/Must Try + Atmosphere */
              <div className="space-y-8">
                {/* Description and Source - Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Description - conditional width based on source presence */}
                  {restaurant.description && (
                    <div className={restaurant.source ? "lg:col-span-2" : "lg:col-span-3"}>
                      <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">{restaurant.description}</p>
                    </div>
                  )}

                  {/* Source - 1 column on desktop */}
                  {restaurant.source && (
                    <div className="lg:col-span-1">
                      <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Source</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {restaurant.source}
                        {restaurant.source_url && (
                          <>
                            {' '}
                            <a
                              href={restaurant.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-burnt-orange hover:text-burnt-orange/80 hover:underline transition-colors"
                            >
                              (more...)
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Smart Review Summary - Full Width */}
                {restaurant.public_review_summary && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Smart Review Summary</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">{restaurant.public_review_summary}</p>
                    {/* Personal and Public Ratings row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 text-sm mb-4">
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
                              <p>{getTooltipText(restaurant?.personal_appreciation)}</p>
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
                              <p>{getTooltipText(restaurant?.personal_appreciation)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {restaurant.public_rating && (
                        <div
                          className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => window.open(getGoogleMapsUrl(restaurant, restaurant.locations?.[0]), '_blank')}
                        >
                          <span className="font-mono">Public:</span>
                          <Star className="w-4 h-4 fill-burnt-orange text-burnt-orange" />
                          <span className="font-mono">
                            {restaurant.public_rating}/5
                            {restaurant.public_rating_count && (
                              <span className="ml-1">based on {restaurant.public_rating_count} ratings</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Three Column Layout: Location + Dietary/Must Try + Atmosphere */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Column 1: Location Address */}
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Location</h3>
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">{restaurant.locations[0].location_name}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <a
                            href={getGoogleMapsUrl(restaurant, restaurant.locations[0])}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {restaurant.locations[0].full_address}
                          </a>
                        </div>
                        {restaurant.locations[0].phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <p className="text-muted-foreground">{restaurant.locations[0].phone}</p>
                          </div>
                        )}
                        {restaurant.locations[0].city && restaurant.locations[0].country && (
                          <p className="text-xs text-muted-foreground">
                            {restaurant.locations[0].city}, {restaurant.locations[0].country}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Dietary + Must Try */}
                  <div className="space-y-6">
                    {restaurant.dietary_options && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Dietary</h3>
                        <p className="text-muted-foreground leading-relaxed">{restaurant.dietary_options}</p>
                      </div>
                    )}

                    {/* Temporarily hidden - data quality needs improvement
                    {restaurant.must_try_dishes && restaurant.must_try_dishes.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Must Try</h3>
                        <MustTryDishes dishes={restaurant.must_try_dishes} />
                      </div>
                    )}
                    */}
                  </div>

                  {/* Column 3: Atmosphere */}
                  <div>
                    {restaurant.atmosphere && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Atmosphere</h3>
                        <p className="text-muted-foreground leading-relaxed">{restaurant.atmosphere}</p>
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
              </div>
            ) : (
              /* Multi-Location Layout: Smart Review Summary full-width, then three columns with Description + Atmosphere + Dietary/Must Try */
              <div className="space-y-8">
                {/* Smart Review Summary - Full Width */}
                {restaurant.public_review_summary && (
                  <div>
                    <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Smart Review Summary</h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">{restaurant.public_review_summary}</p>
                    {/* Personal and Public Ratings row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2 text-sm mb-4">
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
                              <p>{getTooltipText(restaurant?.personal_appreciation)}</p>
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
                              <p>{getTooltipText(restaurant?.personal_appreciation)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {restaurant.public_rating && (
                        <div
                          className="flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => window.open(getGoogleMapsUrl(restaurant, restaurant.locations?.[0]), '_blank')}
                        >
                          <span className="font-mono">Public:</span>
                          <Star className="w-4 h-4 fill-burnt-orange text-burnt-orange" />
                          <span className="font-mono">
                            {restaurant.public_rating}/5
                            {restaurant.public_rating_count && (
                              <span className="ml-1">based on {restaurant.public_rating_count} ratings</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description and Source - Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Description - conditional width based on source presence */}
                  {restaurant.description && (
                    <div className={restaurant.source ? "lg:col-span-2" : "lg:col-span-3"}>
                      <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">{restaurant.description}</p>
                    </div>
                  )}

                  {/* Source - 1 column on desktop */}
                  {restaurant.source && (
                    <div className="lg:col-span-1">
                      <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Source</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {restaurant.source}
                        {restaurant.source_url && (
                          <>
                            {' '}
                            <a
                              href={restaurant.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-burnt-orange hover:text-burnt-orange/80 hover:underline transition-colors"
                            >
                              (more...)
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Three Column Layout: Atmosphere + Dietary + Must Try */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Column 1: Atmosphere */}
                  <div>
                    {restaurant.atmosphere && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Atmosphere</h3>
                        <p className="text-muted-foreground leading-relaxed">{restaurant.atmosphere}</p>
                      </div>
                    )}

                    {restaurant.visit_count && restaurant.visit_count > 1 && (
                      <div className="flex items-center gap-2 text-muted-foreground pt-4">
                        <Clock className="w-4 h-4" />
                        <span>Visited {restaurant.visit_count} times</span>
                      </div>
                    )}
                  </div>

                  {/* Column 2: Dietary */}
                  <div>
                    {restaurant.dietary_options && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Dietary</h3>
                        <p className="text-muted-foreground leading-relaxed">{restaurant.dietary_options}</p>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Must Try - Temporarily hidden */}
                  <div>
                    {/* Temporarily hidden - data quality needs improvement
                    {restaurant.must_try_dishes && restaurant.must_try_dishes.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-foreground font-geo text-lg mb-2">Must Try</h3>
                        <MustTryDishes dishes={restaurant.must_try_dishes} />
                      </div>
                    )}
                    */}
                  </div>
                </div>
              </div>
            )}

            {/* Locations List - Only show for multi-location restaurants */}
            {restaurant.locations && restaurant.locations.length > 1 && (
              <div>
                <h3 className="font-semibold text-foreground font-geo text-xl mb-4">
                  Locations ({restaurant.locations.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {restaurant.locations.map((location: RestaurantAddress) => (
                    <Card key={location.id} className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <h4 className="font-medium text-foreground">{location.location_name}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <a
                              href={getGoogleMapsUrl(restaurant, location)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {location.full_address}
                            </a>
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
              <InteractiveMap
                restaurants={mapRestaurants}
                userLocation={null}
                isNearMeActive={false}
                height="h-64"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AppreciationPicker Modal */}
      <AppreciationPicker
        isOpen={showAppreciationPicker}
        onClose={handleAppreciationClose}
        onSelect={handleAppreciationSelect}
        onSkip={handleAppreciationSkip}
        restaurantName={restaurant?.name || 'Restaurant'}
        title={pendingStatus === 'visited' ? "How was your experience?" : "How would you rate this restaurant?"}
      />
    </div>
  );
};

export default RestaurantDetails;