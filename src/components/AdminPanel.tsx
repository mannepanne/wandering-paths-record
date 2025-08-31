import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, Shield, Database, LogOut, User, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { PlacePreview } from "@/components/PlacePreview";
import { RestaurantExtractionResult, ExtractedRestaurantData } from "@/services/restaurantExtractor";
import { restaurantExtractor } from "@/services/restaurantExtractor";
import { placesService } from "@/services/places";

interface AdminPanelProps {
  onBack?: () => void;
}

export const AdminPanel = ({ onBack }: AdminPanelProps) => {
  const [newPlaceUrl, setNewPlaceUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<RestaurantExtractionResult | null>(null);
  const { user, loading, signOut } = useAuth();
  const AUTHORIZED_EMAIL = import.meta.env.VITE_AUTHORIZED_ADMIN_EMAIL;
  
  const queryClient = useQueryClient();
  
  // Mutation for saving new restaurant
  const createPlaceMutation = useMutation({
    mutationFn: (restaurantData: ExtractedRestaurantData) => {
      const newRestaurant = {
        name: restaurantData.name,
        address: restaurantData.address!,
        website: restaurantData.website,
        public_rating: restaurantData.public_rating,
        status: 'must-visit' as const,
        description: restaurantData.description,
        cuisine: restaurantData.cuisine,
        must_try_dishes: restaurantData.must_try_dishes,
        price_range: restaurantData.price_range,
        atmosphere: restaurantData.atmosphere,
        dietary_options: restaurantData.dietary_options,
        booking_required: restaurantData.booking_required
      };
      return placesService.createPlace(newRestaurant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      setExtractionResult(null);
      setNewPlaceUrl("");
    },
    onError: (error) => {
      console.error('Error creating restaurant:', error);
    }
  });
  
  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg font-geo font-medium text-foreground">
          Loading...
        </div>
      </div>
    );
  }
  
  // Show login form if not authenticated
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <LoginForm onBack={onBack} />
      </div>
    );
  }
  
  // Additional check: verify the authenticated user is authorized
  if (user.email?.toLowerCase() !== AUTHORIZED_EMAIL?.toLowerCase()) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-red-200">
          <CardContent className="py-12 text-center">
            <div className="text-lg font-geo font-medium text-red-600 mb-2">
              Access Denied
            </div>
            <p className="text-muted-foreground mb-4">
              You are not authorized to access the admin panel.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
              {onBack && (
                <Button variant="ghost" onClick={onBack}>
                  Back to Public View
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExtractMetadata = async () => {
    if (!newPlaceUrl.trim()) return;
    
    setIsExtracting(true);
    try {
      // Use the restaurant extractor for specialized restaurant detection
      const result = await restaurantExtractor.extractFromUrl(newPlaceUrl.trim());
      setExtractionResult(result);
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionResult({
        success: false,
        error: 'Failed to extract restaurant information from URL',
        confidence: 'low'
      });
    } finally {
      setIsExtracting(false);
    }
  };
  
  const handleSaveRestaurant = (restaurantData: ExtractedRestaurantData) => {
    createPlaceMutation.mutate(restaurantData);
  };
  
  const handleCancelPreview = () => {
    setExtractionResult(null);
    setNewPlaceUrl("");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      if (onBack) onBack();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-geo font-bold text-foreground">Admin Panel</h1>
          <Badge variant="secondary" className="font-mono">Protected Area</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="font-mono">{user.email}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Show extraction result or URL input */}
      {extractionResult ? (
        <PlacePreview 
          extractionResult={extractionResult}
          onSave={handleSaveRestaurant}
          onCancel={handleCancelPreview}
          isSaving={createPlaceMutation.isPending}
        />
      ) : (
        <Card className="border-2 border-accent">
          <CardHeader className="bg-gradient-earth">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5" />
              Add New Restaurant
            </CardTitle>
            <CardDescription>
              Enter a restaurant website URL to automatically extract information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="https://noma.dk"
                  value={newPlaceUrl}
                  onChange={(e) => setNewPlaceUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtractMetadata()}
                  className="border-charcoal"
                />
              </div>
              <Button
                variant="brutalist"
                onClick={handleExtractMetadata}
                disabled={!newPlaceUrl.trim() || isExtracting}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                {isExtracting ? "Extracting..." : "Extract Info"}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>The restaurant extraction process:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Analyzes restaurant website and menu pages</li>
                <li>Identifies restaurant name from repeated mentions</li>
                <li>Extracts address from contact information</li>
                <li>Detects cuisine type and signature dishes</li>
                <li>Determines price range and atmosphere</li>
                <li>Identifies dietary options and booking requirements</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backend Setup Notice */}
      <Card className="border-2 border-deep-burgundy bg-gradient-earth">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Database className="w-5 h-5" />
            Backend Integration Required
          </CardTitle>
          <CardDescription>
            Connect to Supabase to enable full functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              To unlock the complete admin experience including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Magic link authentication</li>
              <li>Database storage for places</li>
              <li>Automated metadata extraction</li>
              <li>Real-time updates</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              You'll need to connect this project to Supabase using Lovable's native integration.
            </p>
          </div>
          <Button variant="hero" className="gap-2">
            <Shield className="w-4 h-4" />
            Setup Supabase Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};