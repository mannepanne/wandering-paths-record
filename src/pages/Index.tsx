import { useState } from "react";
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
import { MapPin, Plus, Shield, Compass, Settings } from "lucide-react";
import { placesService, restaurantService } from "@/services/restaurants";
import { Place } from "@/types/place";

const Index = () => {
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

  const queryClient = useQueryClient();

  // Fetch places from Supabase
  const {
    data: places = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["places", selectedType, selectedStatus, searchText, searchLocationCoords?.lat, searchLocationCoords?.lng],
    queryFn: () =>
      placesService.getFilteredPlaces({
        cuisine: selectedType,
        status: selectedStatus,
        searchText: searchText || undefined, // NEW: Text search parameter
        location: searchLocationCoords || undefined,
      }),
  });

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
    }) => placesService.updatePlaceStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
  });

  const handleLocationSearch = async (location: string) => {
    console.log("🔍 Starting text search for:", location);
    setSearchLocation(location);
    
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          
          console.log("🗺️ GPS location obtained:", coords);
          
          // Clear text search when doing GPS-based search
          setSearchText("");
          setUserLocation(coords);
          setSearchLocationCoords(coords);
          setSearchLocation("Near me (20 min walk)");
          
          console.log("🚶 Near Me search activated - finding restaurants within 20 minutes walking distance");
        },
        (error) => {
          console.error("❌ Error getting GPS location:", error);
          alert("Unable to get your location. Please ensure location access is enabled.");
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleStatusChange = (id: string, status: "must-visit" | "visited") => {
    updatePlaceStatusMutation.mutate({ id, status });
  };

  const handleEdit = (id: string) => {
    const restaurant = places.find(place => place.id === id);
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
            onCuisineChange={setSelectedType}
            onStatusChange={setSelectedStatus}
            restaurantCount={places.length}
            onLocationSearch={handleLocationSearch}
            onNearMe={handleNearMe}
            searchLocation={searchLocation}
            availableCuisines={availableCuisines}
            isNearMeActive={!!searchLocationCoords}
          />

          {/* Map View */}
          {isMapView && (
            <Card className="border-2 border-border">
              <CardContent className="p-0">
                <div className="h-96 bg-gradient-earth rounded-sm flex items-center justify-center relative overflow-hidden">
                  <div className="text-center space-y-3">
                    <MapPin className="w-12 h-12 text-olive-green mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-geo font-medium text-foreground">
                        Map Integration Ready
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Connect to Supabase to enable interactive map features
                        with your saved places.
                      </p>
                    </div>
                    <Button variant="brutalist" className="gap-2">
                      <Settings className="w-4 h-4" />
                      Setup Map
                    </Button>
                  </div>
                  {/* Decorative geometric shapes */}
                  <div className="absolute top-4 left-4 w-16 h-16 bg-burnt-orange/20 rotate-45"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 bg-deep-burgundy/20 rounded-full"></div>
                  <div className="absolute top-1/2 left-1/4 w-8 h-8 bg-olive-green/30 rotate-45"></div>
                </div>
              </CardContent>
            </Card>
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
              ) : places.length === 0 ? (
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {places.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={{
                        ...place,
                        rating: place.public_rating,
                        personalRating: place.personal_rating,
                        visitCount: place.visit_count,
                        mustTryDishes: place.must_try_dishes,
                      }}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card mt-16">
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground font-mono">
            Places to visit • Sights to see
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
