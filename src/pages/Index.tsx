import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceCard } from "@/components/PlaceCard";
import { FilterBar } from "@/components/FilterBar";
import { MapView } from "@/components/MapView";
import { AdminPanel } from "@/components/AdminPanel";
import { InteractiveMap } from "@/components/InteractiveMap";
import { MapPin, Plus, Shield, Compass, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { placesService, restaurantService } from "@/services/restaurants";
import { Place } from "@/types/place";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<"public" | "admin">("public");
  const [isMapView, setIsMapView] = useState(false);
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchText, setSearchText] = useState(""); // NEW: Text search state
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [searchLocationCoords, setSearchLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<Place | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const queryClient = useQueryClient();

  // Fetch places from Supabase
  const {
    data: allPlaces = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["places", selectedType, selectedStatus, searchText, searchLocationCoords?.lat, searchLocationCoords?.lng],
    queryFn: () =>
      restaurantService.getFilteredRestaurants({
        cuisine: selectedType,
        status: selectedStatus,
        searchText: searchText || undefined, // NEW: Text search parameter
        location: searchLocationCoords || undefined,
      }),
  });

  // Sort places alphabetically and implement pagination
  const { paginatedPlaces, totalPages, totalItems } = useMemo(() => {
    // Sort places alphabetically by name
    const sortedPlaces = [...allPlaces].sort((a, b) => 
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    
    const totalItems = sortedPlaces.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Calculate start and end indices for current page
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedPlaces = sortedPlaces.slice(startIndex, endIndex);
    
    return {
      paginatedPlaces,
      totalPages,
      totalItems
    };
  }, [allPlaces, currentPage]);

  // Reset to page 1 when filters change
  const resetPagination = () => {
    setCurrentPage(1);
  };

  // Fetch available cuisines for the filter dropdown
  const {
    data: availableCuisines = [],
  } = useQuery({
    queryKey: ["cuisines"],
    queryFn: () => restaurantService.getDistinctCuisines(),
  });

  // Mutation for updating place status
  const updatePlaceStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "must-visit" | "visited";
    }) => restaurantService.updateRestaurantStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });

  const handleLocationSearch = async (location: string) => {
    console.log("🔍 Starting text search for:", location);
    setSearchLocation(location);
    resetPagination(); // Reset to page 1 when searching
    
    if (!location.trim()) {
      // Clear both text and location-based search
      console.log("🧹 Clearing all search filters");
      setSearchText("");
      setSearchLocationCoords(null);
      setUserLocation(null);
      return;
    }
    
    // Simple text search - no geocoding needed
    console.log("📝 Setting text search filter:", location);
    setSearchText(location);
    console.log("🎯 Text search applied, React Query should refetch now");
  };

  const handleNearMe = () => {
    resetPagination(); // Reset to page 1 when using Near Me
    
    // If already showing near me results, reset to show all
    if (searchLocationCoords) {
      console.log("🧹 Resetting Near Me filter - showing all restaurants");
      setSearchLocationCoords(null);
      setUserLocation(null);
      setSearchLocation("");
      setSearchText("");
      return;
    }
    
    // Otherwise, start Near Me search
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    // Show loading state
    setIsGettingLocation(true);
    setSearchLocation("Finding your location...");
    console.log("📍 Starting geolocation request...");

    // Enhanced options for mobile compatibility
    const options = {
      enableHighAccuracy: false, // Use network location for faster results on mobile
      timeout: 15000, // 15 seconds timeout (mobile can be slow)
      maximumAge: 300000 // Accept cached location up to 5 minutes old
    };

    // Wrap geolocation in a promise with manual timeout for mobile Chrome issues
    const getLocationWithTimeout = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;
        let hasResolved = false;

        // Manual timeout handler for mobile Chrome issues
        timeoutId = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            console.error("⏰ Manual timeout: Geolocation request took too long on mobile");
            reject(new Error("Location request timed out. This is common on mobile networks."));
          }
        }, 20000); // 20 seconds manual timeout

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutId);
              resolve(position);
            }
          },
          (error) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutId);
              reject(error);
            }
          },
          options
        );
      });
    };

    getLocationWithTimeout().then(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        
        console.log("🗺️ GPS location obtained:", coords);
        console.log("📊 Location accuracy:", position.coords.accuracy, "meters");
        
        // Clear text search when doing GPS-based search
        setSearchText("");
        setUserLocation(coords);
        setSearchLocationCoords(coords);
        setSearchLocation("Near me (20 min walk)");
        setIsGettingLocation(false);
        
        console.log("🚶 Near Me search activated - finding restaurants within 20 minutes walking distance");
      }
    ).catch(
      (error) => {
        console.error("❌ Error getting GPS location:", error);
        
        // Reset loading state
        setSearchLocation("");
        setIsGettingLocation(false);
        
        // Provide detailed error messages based on error type
        let errorMessage = "Unable to get your location. ";
        
        // Handle both GeolocationPositionError and regular Error objects
        if (error instanceof GeolocationPositionError) {
          console.error("❌ Geolocation error code:", error.code);
          console.error("❌ Geolocation error message:", error.message);
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += "Location access was denied. Please enable location access in your browser settings and try again.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += "Location information is unavailable. Please check your internet connection and try again.";
              break;
            case error.TIMEOUT:
              errorMessage += "Location request timed out. This can happen on mobile networks. Please try again or check your connection.";
              break;
            default:
              errorMessage += "Please ensure location access is enabled and try again.";
              break;
          }
        } else {
          // Handle manual timeout or other errors
          console.error("❌ Error message:", error.message);
          errorMessage += error.message;
        }
        
        // Add mobile-specific guidance
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
          errorMessage += "\n\nOn mobile: Make sure you're using HTTPS and have given permission when prompted.";
        }
        
        alert(errorMessage);
      }
    );
  };

  const handleStatusChange = (id: string, status: "must-visit" | "visited") => {
    updatePlaceStatusMutation.mutate({ id, status });
  };

  const handleEdit = (id: string) => {
    const restaurant = allPlaces.find(place => place.id === id);
    if (restaurant) {
      setEditingRestaurant(restaurant);
      setCurrentView("admin");
    }
  };

  if (currentView === "admin") {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b-2 border-border bg-card p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button 
              variant="ghost" 
              onClick={() => {
                setCurrentView("public");
                setEditingRestaurant(null);
              }}
            >
              ← Back to Public View
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <AdminPanel 
            onBack={() => {
              setCurrentView("public");
              setEditingRestaurant(null);
            }}
            editingRestaurant={editingRestaurant}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <nav className="border-b-2 border-border bg-card p-4">
        <div className="container mx-auto flex justify-between items-center max-w-6xl">
          <h1 className="text-xl font-geo font-bold text-foreground">
            Curated Restaurant Hit List
          </h1>
          <div className="flex gap-2">
            <Button
              variant="brutalist"
              size="sm"
              className="gap-2 bg-olive-green hover:bg-olive-green/90 text-white"
              onClick={() => setIsMapView(!isMapView)}
            >
              <MapPin className="w-4 h-4" />
              {isMapView ? "List View" : "Map View"}
            </Button>
            <Button
              variant="brutalist"
              size="sm"
              className="gap-2"
              onClick={() => setCurrentView("admin")}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-4">
          {/* Filter Bar */}
          <FilterBar
            selectedCuisine={selectedType}
            selectedStatus={selectedStatus}
            onCuisineChange={(cuisine) => {
              setSelectedType(cuisine);
              resetPagination(); // Reset to page 1 when changing cuisine filter
            }}
            onStatusChange={(status) => {
              setSelectedStatus(status);
              resetPagination(); // Reset to page 1 when changing status filter
            }}
            restaurantCount={totalItems}
            onLocationSearch={handleLocationSearch}
            onNearMe={handleNearMe}
            searchLocation={searchLocation}
            availableCuisines={availableCuisines}
            isNearMeActive={!!searchLocationCoords}
            isLoadingLocation={isGettingLocation}
          />

          {/* Map View */}
          {isMapView && (
            <InteractiveMap 
              restaurants={allPlaces} // Use all places for map view
              userLocation={userLocation}
              isNearMeActive={!!searchLocationCoords}
            />
          )}

          {/* Places List */}
          {!isMapView && (
            <div className="space-y-4">
              {isLoading ? (
                <Card className="border-2 border-border">
                  <CardContent className="py-12 text-center">
                    <div className="text-lg font-geo font-medium text-foreground mb-2">
                      Loading places...
                    </div>
                  </CardContent>
                </Card>
              ) : error ? (
                <Card className="border-2 border-border border-red-200">
                  <CardContent className="py-12 text-center">
                    <div className="text-lg font-geo font-medium text-red-600 mb-2">
                      Error loading places
                    </div>
                    <p className="text-muted-foreground">{error.message}</p>
                  </CardContent>
                </Card>
              ) : totalItems === 0 ? (
                <Card className="border-2 border-border">
                  <CardContent className="py-12 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-geo font-medium text-foreground mb-2">
                      No places found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or add some new places to your
                      collection.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedPlaces.map((place) => (
                      <PlaceCard
                        key={place.id}
                        place={{
                          ...place,
                          rating: place.public_rating,
                          personalRating: place.personal_rating,
                          visitCount: place.visit_count,
                          mustTryDishes: place.must_try_dishes,
                        }}
                        onStatusChange={user ? handleStatusChange : undefined}
                        onEdit={user ? handleEdit : undefined}
                      />
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-mono">
                          Page {currentPage} of {totalPages}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({totalItems} total restaurants)
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            So many restaurants, so much delicious food, so little time...
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
