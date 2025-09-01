import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Plus, Shield, Database, LogOut, User, Search, AlertTriangle, CheckCircle, Loader2, Trash2, BarChart3, MapPin, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginForm } from "@/components/LoginForm";
import { PlacePreview } from "@/components/PlacePreview";
import { useRestaurantExtraction } from "@/hooks/useRestaurantExtraction";
import { ExtractedRestaurantData, ExtractionCache } from "@/services/claudeExtractor";
import { restaurantService } from "@/services/restaurants";
import { Restaurant } from "@/types/place";

interface AdminPanelProps {
  onBack?: () => void;
  editingRestaurant?: Restaurant | null;
}

export const AdminPanel = ({ onBack, editingRestaurant }: AdminPanelProps) => {
  const [newPlaceUrl, setNewPlaceUrl] = useState("");
  const [formData, setFormData] = useState<Partial<ExtractedRestaurantData> | null>(null);
  const { user, loading, signOut } = useAuth();
  const AUTHORIZED_EMAIL = import.meta.env.VITE_AUTHORIZED_ADMIN_EMAIL;
  
  // Use our new extraction hook
  const extraction = useRestaurantExtraction();
  const queryClient = useQueryClient();
  
  // Cache management
  const [cacheStats, setCacheStats] = useState(ExtractionCache.getStats());
  
  // Update cache stats when extraction completes
  useEffect(() => {
    if (formData && !extraction.isExtracting) {
      setCacheStats(ExtractionCache.getStats());
    }
  }, [formData, extraction.isExtracting]);

  // Query to fetch restaurant addresses when editing
  const { data: restaurantAddresses } = useQuery({
    queryKey: ['restaurant-addresses', editingRestaurant?.id],
    queryFn: () => restaurantService.getRestaurantAddresses(editingRestaurant!.id),
    enabled: !!editingRestaurant,
  });

  // Populate form when editing a restaurant
  useEffect(() => {
    if (editingRestaurant && restaurantAddresses) {
      setFormData({
        name: editingRestaurant.name,
        addressSummary: editingRestaurant.address,
        website: editingRestaurant.website,
        publicRating: editingRestaurant.public_rating,
        description: editingRestaurant.description,
        cuisine: editingRestaurant.cuisine,
        mustTryDishes: editingRestaurant.must_try_dishes,
        priceRange: editingRestaurant.price_range,
        atmosphere: editingRestaurant.atmosphere,
        dietaryOptions: editingRestaurant.dietary_options,
        locations: restaurantAddresses.length > 0 
          ? restaurantAddresses.map(addr => ({
              locationName: addr.location_name || '',
              fullAddress: addr.full_address,
              phone: addr.phone || '',
              openingHours: typeof addr.opening_hours === 'object' && addr.opening_hours?.hours 
                ? addr.opening_hours.hours 
                : addr.opening_hours || ''
            }))
          : [{
              locationName: '',
              fullAddress: editingRestaurant.address,
              phone: '',
              openingHours: ''
            }]
      });
      setNewPlaceUrl(editingRestaurant.website || '');
    } else if (editingRestaurant && !restaurantAddresses) {
      // If we have a restaurant but addresses haven't loaded yet, wait
      return;
    }
  }, [editingRestaurant, restaurantAddresses]);
  
  // Mutation for saving new restaurant
  const createRestaurantMutation = useMutation({
    mutationFn: (restaurantData: Partial<ExtractedRestaurantData>) => {
      const newRestaurant = {
        name: restaurantData.name || 'Unknown Restaurant',
        address: restaurantData.addressSummary || '',
        website: restaurantData.website || newPlaceUrl,
        public_rating: restaurantData.publicRating,
        status: 'must-visit' as const,
        description: restaurantData.description,
        cuisine: restaurantData.cuisine,
        must_try_dishes: restaurantData.mustTryDishes,
        price_range: restaurantData.priceRange,
        atmosphere: restaurantData.atmosphere,
        dietary_options: restaurantData.dietaryOptions
      };
      
      // Convert locations to address format for the service
      const addresses = restaurantData.locations?.map(loc => ({
        location_name: loc.locationName,
        full_address: loc.fullAddress,
        phone: loc.phone,
        opening_hours: loc.openingHours ? { hours: loc.openingHours } : undefined
      }));
      
      return restaurantService.createRestaurant(newRestaurant, addresses);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      setFormData(null);
      setNewPlaceUrl("");
      extraction.reset();
    },
    onError: (error) => {
      console.error('Error creating restaurant:', error);
    }
  });

  // Mutation for updating existing restaurant
  const updateRestaurantMutation = useMutation({
    mutationFn: (restaurantData: Partial<ExtractedRestaurantData>) => {
      if (!editingRestaurant) throw new Error("No restaurant to update");
      
      const updatedRestaurant = {
        id: editingRestaurant.id,
        name: restaurantData.name || editingRestaurant.name,
        address: restaurantData.addressSummary || editingRestaurant.address,
        website: restaurantData.website || editingRestaurant.website,
        public_rating: restaurantData.publicRating,
        personal_rating: editingRestaurant.personal_rating, // Keep existing personal rating
        status: editingRestaurant.status, // Keep existing status
        description: restaurantData.description,
        cuisine: restaurantData.cuisine,
        must_try_dishes: restaurantData.mustTryDishes,
        price_range: restaurantData.priceRange,
        atmosphere: restaurantData.atmosphere,
        dietary_options: restaurantData.dietaryOptions,
        chef_name: restaurantData.chefName
      };
      
      // Convert locations to address format for the service
      const addresses = restaurantData.locations?.map(loc => ({
        location_name: loc.locationName,
        full_address: loc.fullAddress,
        phone: loc.phone,
        opening_hours: loc.openingHours ? { hours: loc.openingHours } : undefined
      }));
      
      return restaurantService.updateRestaurantWithAddresses(updatedRestaurant, addresses);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      setFormData(null);
      setNewPlaceUrl("");
      extraction.reset();
      if (onBack) onBack();
    },
    onError: (error) => {
      console.error('Error updating restaurant:', error);
    }
  });

  // Mutation for deleting a restaurant
  const deleteRestaurantMutation = useMutation({
    mutationFn: (restaurantId: string) => {
      return restaurantService.deleteRestaurant(restaurantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      setFormData(null);
      setNewPlaceUrl("");
      extraction.reset();
      if (onBack) onBack();
    },
    onError: (error) => {
      console.error('Error deleting restaurant:', error);
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
    
    const extractedData = await extraction.extractFromUrl(newPlaceUrl.trim());
    if (extractedData) {
      setFormData(extractedData);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      if (editingRestaurant) {
        updateRestaurantMutation.mutate(formData);
      } else {
        createRestaurantMutation.mutate(formData);
      }
    }
  };

  const handleFormChange = (field: keyof ExtractedRestaurantData, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : { [field]: value });
  };

  const handleClearForm = () => {
    setFormData(null);
    setNewPlaceUrl("");
    extraction.reset();
  };

  const handleDeleteRestaurant = () => {
    if (!editingRestaurant) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete "${editingRestaurant.name}"? This action cannot be undone.`
    );
    
    if (confirmed) {
      deleteRestaurantMutation.mutate(editingRestaurant.id);
    }
  };

  const handleClearCache = () => {
    ExtractionCache.clear();
    setCacheStats(ExtractionCache.getStats());
    // Also clear any current form to avoid confusion
    handleClearForm();
  };

  const handleLocationChange = (index: number, field: string, value: string) => {
    if (!formData?.locations) return;
    
    const updatedLocations = [...formData.locations];
    updatedLocations[index] = { ...updatedLocations[index], [field]: value };
    
    setFormData(prev => prev ? { ...prev, locations: updatedLocations } : null);
  };

  const handleAddLocation = () => {
    const newLocation = {
      locationName: '',
      fullAddress: '',
      phone: '',
      openingHours: ''
    };
    
    setFormData(prev => prev ? { 
      ...prev, 
      locations: [...(prev.locations || []), newLocation] 
    } : null);
  };

  const handleRemoveLocation = (index: number) => {
    if (!formData?.locations) return;
    
    const updatedLocations = formData.locations.filter((_, i) => i !== index);
    setFormData(prev => prev ? { ...prev, locations: updatedLocations } : null);
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

      {/* URL Input Section */}
      <Card className="border-2 border-accent">
        <CardHeader className="bg-gradient-earth">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Plus className="w-5 h-5" />
            {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
          </CardTitle>
          <CardDescription>
            {editingRestaurant 
              ? 'Update the restaurant details below or extract fresh data from a URL'
              : 'Enter a restaurant website URL to automatically extract information using Claude AI'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="https://restaurant-website.com"
                value={newPlaceUrl}
                onChange={(e) => setNewPlaceUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !extraction.isExtracting && handleExtractMetadata()}
                disabled={extraction.isExtracting}
                className="border-charcoal"
              />
            </div>
            <Button
              variant="brutalist"
              onClick={handleExtractMetadata}
              disabled={!newPlaceUrl.trim() || extraction.isExtracting}
              className="gap-2"
            >
              {extraction.isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Extract Info
                </>
              )}
            </Button>
          </div>
          
          {/* Progress Indicator */}
          {extraction.isExtracting && (
            <div className="flex items-center gap-3 p-3 bg-olive-green/10 rounded-md">
              <div className="animate-spin w-4 h-4 border-2 border-olive-green border-t-transparent rounded-full" />
              <span className="text-sm text-olive-green font-medium">
                {extraction.progress}
              </span>
            </div>
          )}
          
          {/* Success Message */}
          {extraction.progress && !extraction.isExtracting && (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {extraction.progress}
              </span>
            </div>
          )}
          
          {/* Error/Non-restaurant Message */}
          {extraction.error && (
            <Alert className={extraction.isNotRestaurant ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"}>
              <AlertTriangle className={`h-4 w-4 ${extraction.isNotRestaurant ? "text-orange-600" : "text-red-600"}`} />
              <AlertDescription className={extraction.isNotRestaurant ? "text-orange-600" : "text-red-600"}>
                {extraction.error}
                {extraction.isNotRestaurant && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        extraction.clearError();
                        setFormData({
                          name: '',
                          website: newPlaceUrl,
                          addressSummary: '',
                          cuisine: '',
                          locations: []
                        });
                      }}
                      className="text-orange-600 border-orange-300"
                    >
                      Use Manual Entry Instead
                    </Button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
        </CardContent>
      </Card>

      {/* Restaurant Form - Show after extraction or for manual entry */}
      {formData && (
        <Card className="border-2 border-charcoal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Database className="w-5 h-5" />
              Restaurant Details
            </CardTitle>
            <CardDescription>
              Review and edit the extracted information before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Restaurant Name *</label>
                  <Input
                    value={formData.name || ''}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Restaurant name"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Cuisine Type</label>
                  <Input
                    value={formData.cuisine || ''}
                    onChange={(e) => handleFormChange('cuisine', e.target.value)}
                    placeholder="Italian, French, Modern British..."
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <Input
                    value={formData.addressSummary || ''}
                    onChange={(e) => handleFormChange('addressSummary', e.target.value)}
                    placeholder="Full address with postcode"
                    className="mt-1"
                  />
                </div>
                
                {/* Dynamic Locations Section */}
                {formData.locations && formData.locations.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Individual Locations</label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddLocation}
                          className="gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Add Location
                        </Button>
                      </div>
                      
                      {formData.locations.map((location, index) => (
                        <div key={index} className="border border-muted-foreground/20 rounded-lg p-4 space-y-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-accent" />
                              <span className="font-medium text-sm">Location {index + 1}</span>
                            </div>
                            {formData.locations!.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveLocation(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Location Name</label>
                              <Input
                                value={location.locationName || ''}
                                onChange={(e) => handleLocationChange(index, 'locationName', e.target.value)}
                                placeholder="e.g., Shoreditch, King's Cross"
                                className="mt-1"
                                size="sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">Phone</label>
                              <Input
                                value={location.phone || ''}
                                onChange={(e) => handleLocationChange(index, 'phone', e.target.value)}
                                placeholder="Location phone"
                                className="mt-1"
                                size="sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-muted-foreground">Full Address</label>
                              <Input
                                value={location.fullAddress || ''}
                                onChange={(e) => handleLocationChange(index, 'fullAddress', e.target.value)}
                                placeholder="Complete address with postcode"
                                className="mt-1"
                                size="sm"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-xs font-medium text-muted-foreground">Opening Hours</label>
                              <Input
                                value={location.openingHours || ''}
                                onChange={(e) => handleLocationChange(index, 'openingHours', e.target.value)}
                                placeholder="e.g., Mon-Fri 8:00-23:00, Sat-Sun 9:00-23:00"
                                className="mt-1"
                                size="sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-foreground">Website</label>
                  <Input
                    value={formData.website || newPlaceUrl}
                    onChange={(e) => handleFormChange('website', e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Price Range</label>
                  <Select
                    value={formData.priceRange || ''}
                    onValueChange={(value) => handleFormChange('priceRange', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$">$ - Budget friendly</SelectItem>
                      <SelectItem value="$$">$$ - Mid-range</SelectItem>
                      <SelectItem value="$$$">$$$ - Upscale</SelectItem>
                      <SelectItem value="$$$$">$$$$ - Fine dining</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    placeholder="Brief description of the restaurant..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Atmosphere</label>
                  <Input
                    value={formData.atmosphere || ''}
                    onChange={(e) => handleFormChange('atmosphere', e.target.value)}
                    placeholder="Casual, formal, romantic, family-friendly..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Dietary Options</label>
                  <Input
                    value={formData.dietaryOptions || ''}
                    onChange={(e) => handleFormChange('dietaryOptions', e.target.value)}
                    placeholder="Vegetarian options, gluten-free..."
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Must-Try Dishes</label>
                  <Input
                    value={formData.mustTryDishes?.join(', ') || ''}
                    onChange={(e) => handleFormChange('mustTryDishes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Signature dish, tasting menu, chef special..."
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple dishes with commas</p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="brutalist"
                  disabled={(createRestaurantMutation.isPending || updateRestaurantMutation.isPending) || !formData.name}
                  className="gap-2"
                >
                  {(createRestaurantMutation.isPending || updateRestaurantMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingRestaurant ? 'Updating...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {editingRestaurant ? 'Update Restaurant' : 'Save Restaurant'}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearForm}
                  disabled={createRestaurantMutation.isPending || updateRestaurantMutation.isPending}
                >
                  Clear Form
                </Button>
                {editingRestaurant && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteRestaurant}
                    disabled={deleteRestaurantMutation.isPending || updateRestaurantMutation.isPending}
                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {deleteRestaurantMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Restaurant
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Cache Management Section */}
      <Card className="border-2 border-olive-green">
        <CardHeader className="bg-gradient-to-r from-olive-green/10 to-olive-green/5">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BarChart3 className="w-5 h-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Manage extraction cache for development and testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-foreground">{cacheStats.totalEntries}</div>
              <div className="text-sm text-muted-foreground">Cached Extractions</div>
            </div>
            {cacheStats.oldestEntry && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-foreground">Oldest Entry</div>
                <div className="text-xs text-muted-foreground">
                  {cacheStats.oldestEntry.toLocaleDateString()}
                </div>
              </div>
            )}
            {cacheStats.newestEntry && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-foreground">Newest Entry</div>
                <div className="text-xs text-muted-foreground">
                  {cacheStats.newestEntry.toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClearCache}
              disabled={cacheStats.totalEntries === 0}
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Cache
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setCacheStats(ExtractionCache.getStats())}
              className="gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Refresh Stats
            </Button>
          </div>
          
          {cacheStats.totalEntries === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 <strong>No cached extractions.</strong> The next URL extraction will be fresh from the Claude API and take 15-20 seconds.
            </div>
          )}
          
          {cacheStats.totalEntries > 0 && (
            <div className="text-sm text-muted-foreground bg-olive-green/10 p-3 rounded-lg">
              ⚡ <strong>Cache active.</strong> Repeated extractions of the same URLs will be instant. Clear cache to force fresh extractions.
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};