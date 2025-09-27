import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, MapPin, Navigation, Search, X } from "lucide-react";

interface FilterBarProps {
  selectedCuisine: string;
  selectedStatus: string;
  onCuisineChange: (cuisine: string) => void;
  onStatusChange: (status: string) => void;
  restaurantCount: number;
  onLocationSearch?: (location: string) => void;
  onNearMe?: () => void;
  searchLocation?: string;
  availableCuisines?: string[];
  isNearMeActive?: boolean;
  isLoadingLocation?: boolean;
}


const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "to-visit", label: "To Visit" },
  { value: "visited", label: "Visited" },
];

export const FilterBar = ({ 
  selectedCuisine, 
  selectedStatus, 
  onCuisineChange, 
  onStatusChange, 
  restaurantCount,
  onLocationSearch,
  onNearMe,
  searchLocation,
  availableCuisines = [],
  isNearMeActive = false,
  isLoadingLocation: externalIsLoadingLocation = false
}: FilterBarProps) => {
  const [locationInput, setLocationInput] = useState(searchLocation || "");
  
  // Use external loading state when provided, fallback to internal state
  const isLoadingLocation = externalIsLoadingLocation;

  // Create dynamic cuisine options based on available cuisines from database
  const cuisineTypes = [
    { value: "all", label: "All Cuisines" },
    ...availableCuisines.map(cuisine => ({
      value: cuisine,
      label: cuisine
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
  return (
    <div className="bg-card border-2 border-border p-4 rounded-sm card-shadow">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-wrap gap-3 items-center justify-between">
        {/* Location Search */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-lg">
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
            className="gap-1"
          >
            <Search className="w-3 h-3" />
            Search
          </Button>
          <Button
            variant="brutalist"
            size="sm"
            onClick={handleNearMe}
            disabled={isLoadingLocation}
            className={`gap-1 text-white ${
              isNearMeActive
                ? 'bg-olive-green hover:bg-olive-green/90'
                : 'bg-burnt-orange hover:bg-burnt-orange/90'
            }`}
          >
            <Navigation className="w-3 h-3" />
            {isLoadingLocation
              ? 'Locating...'
              : isNearMeActive
                ? 'Show All'
                : 'Near Me'}
          </Button>
        </div>

        {/* Cuisine and Status Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Cuisine:</span>
            <Select value={selectedCuisine} onValueChange={onCuisineChange}>
              <SelectTrigger className="w-40 border-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cuisineTypes.map((cuisine) => (
                  <SelectItem key={cuisine.value} value={cuisine.value}>
                    {cuisine.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="w-32 border-charcoal">
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
          <Select value={selectedCuisine} onValueChange={onCuisineChange}>
            <SelectTrigger className="w-[70%] border-charcoal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cuisineTypes.map((cuisine) => (
                <SelectItem key={cuisine.value} value={cuisine.value}>
                  {cuisine.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 4: Status Filter */}
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
    </div>
  );
};