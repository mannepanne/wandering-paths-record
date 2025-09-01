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
}


const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "must-visit", label: "Must Visit" },
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
  availableCuisines = []
}: FilterBarProps) => {
  const [locationInput, setLocationInput] = useState(searchLocation || "");
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

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

  const handleNearMe = async () => {
    if (!onNearMe) return;
    
    setIsLoadingLocation(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            onNearMe();
            setIsLoadingLocation(false);
          },
          (error) => {
            console.error('Location access denied:', error);
            setIsLoadingLocation(false);
          }
        );
      } else {
        console.error('Geolocation not supported');
        setIsLoadingLocation(false);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setIsLoadingLocation(false);
    }
  };

  const clearLocationSearch = () => {
    setLocationInput("");
    if (onLocationSearch) {
      onLocationSearch("");
    }
  };
  return (
    <div className="bg-card border-2 border-border p-4 rounded-sm card-shadow">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Location Search */}
        <div className="flex items-center gap-2 min-w-0 flex-1 max-w-lg">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Near:</span>
          <div className="relative flex-1 min-w-0">
            <Input
              placeholder="City, address..."
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
            className="gap-1 bg-burnt-orange hover:bg-burnt-orange/90 text-white"
          >
            <Navigation className="w-3 h-3" />
            {isLoadingLocation ? 'Locating...' : 'Near Me'}
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
    </div>
  );
};