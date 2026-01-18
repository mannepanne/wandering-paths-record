import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Search, X, SlidersHorizontal } from "lucide-react";
import { CuisinePrimary, RestaurantStyle, RestaurantVenue } from "@/types/place";

interface FilterBarProps {
  // New facet props
  selectedCuisinePrimary: string;
  selectedStyle: string;
  selectedVenue: string;
  onCuisinePrimaryChange: (cuisine: string) => void;
  onStyleChange: (style: string) => void;
  onVenueChange: (venue: string) => void;
  availableCuisinesPrimary?: CuisinePrimary[];
  availableStyles?: RestaurantStyle[];
  availableVenues?: RestaurantVenue[];

  // Common props
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  restaurantCount: number;
  onLocationSearch?: (location: string) => void;
  onNearMe?: () => void;
  searchLocation?: string;
  isNearMeActive?: boolean;
  isLoadingLocation?: boolean;
}


const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "to-visit", label: "To Visit" },
  { value: "visited", label: "Visited" },
];

export const FilterBar = ({
  selectedCuisinePrimary,
  selectedStyle,
  selectedVenue,
  onCuisinePrimaryChange,
  onStyleChange,
  onVenueChange,
  availableCuisinesPrimary = [],
  availableStyles = [],
  availableVenues = [],
  selectedStatus,
  onStatusChange,
  restaurantCount,
  onLocationSearch,
  onNearMe,
  searchLocation,
  isNearMeActive = false,
  isLoadingLocation: externalIsLoadingLocation = false
}: FilterBarProps) => {
  const [locationInput, setLocationInput] = useState(searchLocation || "");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Use external loading state when provided, fallback to internal state
  const isLoadingLocation = externalIsLoadingLocation;

  // Create dynamic options based on available values from database
  const cuisineOptions = [
    { value: "all", label: "All Cuisines" },
    ...availableCuisinesPrimary.map(cuisine => ({
      value: cuisine,
      label: cuisine
    }))
  ];

  const styleOptions = [
    { value: "all", label: "All Styles" },
    ...availableStyles.map(style => ({
      value: style,
      label: style
    }))
  ];

  const venueOptions = [
    { value: "all", label: "All Venues" },
    ...availableVenues.map(venue => ({
      value: venue,
      label: venue
    }))
  ];

  const handleLocationSearch = () => {
    if (locationInput.trim() && onLocationSearch) {
      onLocationSearch(locationInput.trim());
    }
  };

  const handleNearMe = () => {
    if (!onNearMe) return;

    // Just call the parent handler - all geolocation logic is handled in Index.tsx
    onNearMe();
  };

  const clearLocationSearch = () => {
    setLocationInput("");
    if (onLocationSearch) {
      onLocationSearch("");
    }
  };

  // Check if any non-default filters are active (for badge indicator)
  const hasActiveFilters = selectedStyle !== "all" || selectedVenue !== "all";

  return (
    <div className="bg-card border-2 border-border p-4 rounded-sm card-shadow">
      {/* Desktop Layout - Filters only (search is in header) */}
      <div className="hidden md:flex flex-wrap gap-3 items-center justify-between">
        {/* Facet Filters - grouped left */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Cuisine Primary */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Cuisine:</span>
            <Select value={selectedCuisinePrimary} onValueChange={onCuisinePrimaryChange}>
              <SelectTrigger className="w-36 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cuisineOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Style */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Style:</span>
            <Select value={selectedStyle} onValueChange={onStyleChange}>
              <SelectTrigger className="w-32 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {styleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Venue:</span>
            <Select value={selectedVenue} onValueChange={onVenueChange}>
              <SelectTrigger className="w-32 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {venueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-28 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Near Me Button - aligned right, same width as Map View button */}
        <Button
          variant="brutalist"
          size="sm"
          onClick={handleNearMe}
          disabled={isLoadingLocation}
          className={`gap-2 w-[106px] justify-center text-white ${
            isNearMeActive
              ? 'bg-olive-green hover:bg-olive-green/90'
              : 'bg-burnt-orange hover:bg-burnt-orange/90'
          }`}
        >
          <Navigation className="w-4 h-4" />
          {isLoadingLocation
            ? 'Locating...'
            : isNearMeActive
              ? 'Show All'
              : 'Near Me'}
        </Button>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden space-y-3">
        {/* Row 1: Near Me Button - Full Width */}
        <Button
          variant="brutalist"
          onClick={handleNearMe}
          disabled={isLoadingLocation}
          className={`w-full gap-2 text-white ${
            isNearMeActive
              ? 'bg-olive-green hover:bg-olive-green/90'
              : 'bg-burnt-orange hover:bg-burnt-orange/90'
          }`}
        >
          <Navigation className="w-4 h-4" />
          {isLoadingLocation
            ? 'Locating...'
            : isNearMeActive
              ? 'Show All Restaurants'
              : 'Find Restaurants Near Me'}
        </Button>

        {/* Row 2: Location Search */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="relative flex-1 min-w-0">
            <Input
              placeholder="Name, city, neighbourhood..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
              className="border-charcoal pr-8"
            />
            {locationInput && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLocationSearch}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLocationSearch}
            disabled={!locationInput.trim()}
            className="gap-1 px-3"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Row 3: Cuisine Filter */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Cuisine:</span>
          <Select value={selectedCuisinePrimary} onValueChange={onCuisinePrimaryChange}>
            <SelectTrigger className="w-[70%] border-charcoal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cuisineOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 4: More Filters Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="w-full gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showMoreFilters ? 'Hide Filters' : 'More Filters'}
          {hasActiveFilters && !showMoreFilters && (
            <span className="ml-1 w-2 h-2 bg-burnt-orange rounded-full" />
          )}
        </Button>

        {/* Row 5+: Additional Filters (collapsible) */}
        {showMoreFilters && (
          <div className="space-y-3 pt-2 border-t border-border">
            {/* Style Filter */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Style:</span>
              <Select value={selectedStyle} onValueChange={onStyleChange}>
                <SelectTrigger className="w-[70%] border-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue Filter */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Venue:</span>
              <Select value={selectedVenue} onValueChange={onVenueChange}>
                <SelectTrigger className="w-[70%] border-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {venueOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Status:</span>
              <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="w-[70%] border-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
