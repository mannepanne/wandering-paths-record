import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaceCard } from "@/components/PlaceCard";
import { FilterBar } from "@/components/FilterBar";
import { MapView } from "@/components/MapView";
import { AdminPanel } from "@/components/AdminPanel";
import { MapPin, Plus, Shield, Compass } from "lucide-react";
import heroImage from "@/assets/hero-places.jpg";

// Mock data for demonstration
const mockPlaces = [
  {
    id: "1",
    name: "Noma",
    type: "restaurant",
    address: "Refshalevej 96, 1432 Copenhagen, Denmark",
    website: "https://noma.dk",
    rating: 5,
    status: "must-visit" as const,
    cuisine: "Nordic",
    mustTryDishes: ["Fermented vegetables", "Sea buckthorn", "Pine oil"]
  },
  {
    id: "2", 
    name: "Tate Modern",
    type: "gallery",
    address: "Bankside, London SE1 9TG, UK",
    website: "https://tate.org.uk",
    rating: 4,
    status: "visited" as const,
    personalRating: 5,
    description: "Incredible contemporary art collection. The turbine hall installation was breathtaking.",
    visitCount: 2
  },
  {
    id: "3",
    name: "Shakespeare and Company",
    type: "bookshop", 
    address: "37 Rue de la Bûcherie, 75005 Paris, France",
    website: "https://shakespeareandcompany.com",
    rating: 4,
    status: "visited" as const,
    personalRating: 4,
    description: "Charming English bookstore with a rich literary history. Perfect for browsing."
  }
];

const Index = () => {
  const [currentView, setCurrentView] = useState<'public' | 'admin'>('public');
  const [isMapView, setIsMapView] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredPlaces = mockPlaces.filter(place => {
    const typeMatch = selectedType === 'all' || place.type === selectedType;
    const statusMatch = selectedStatus === 'all' || place.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b-2 border-border bg-card p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button variant="ghost" onClick={() => setCurrentView('public')}>
              ← Back to Public View
            </Button>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <AdminPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative h-96 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="text-center space-y-6 px-4 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-geo font-bold text-white leading-tight">
            Discover Places Worth Visiting
          </h1>
          <p className="text-lg text-white/90 leading-relaxed">
            Curate and explore remarkable locations from restaurants to galleries, 
            libraries to hidden gems around the world.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button variant="hero" size="lg" className="gap-2">
              <Compass className="w-5 h-5" />
              Explore Places
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2 bg-white/10 text-white border-white hover:bg-white hover:text-charcoal"
              onClick={() => setCurrentView('admin')}
            >
              <Shield className="w-5 h-5" />
              Admin Access
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-burnt-orange/30 rotate-45 blur-sm"></div>
        <div className="absolute bottom-1/4 right-1/4 w-20 h-20 bg-deep-burgundy/30 rounded-full blur-sm"></div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Filter Bar */}
          <FilterBar
            selectedType={selectedType}
            selectedStatus={selectedStatus}
            onTypeChange={setSelectedType}
            onStatusChange={setSelectedStatus}
            placeCount={filteredPlaces.length}
          />

          {/* Map Toggle */}
          <MapView 
            isMapView={isMapView}
            onViewToggle={() => setIsMapView(!isMapView)}
          />

          {/* Places List */}
          {!isMapView && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-geo font-semibold text-foreground">
                  Places Collection
                </h2>
                <Button variant="brutalist" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Place
                </Button>
              </div>

              {filteredPlaces.length === 0 ? (
                <Card className="border-2 border-border">
                  <CardContent className="py-12 text-center">
                    <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-geo font-medium text-foreground mb-2">
                      No places found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your filters or add some new places to your collection.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPlaces.map((place) => (
                    <PlaceCard 
                      key={place.id} 
                      place={place}
                      onStatusChange={(id, status) => {
                        console.log(`Changing status of ${id} to ${status}`);
                      }}
                      onEdit={(id) => {
                        console.log(`Editing place ${id}`);
                      }}
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
            Built with Lovable • Powered by Supabase
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
